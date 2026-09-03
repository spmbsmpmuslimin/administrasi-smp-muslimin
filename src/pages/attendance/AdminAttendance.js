// AdminAttendance.js
// 🎯 Monitoring Presensi Siswa — Admin
// Admin/TU memantau kehadiran siswa berbasis Presensi Harian (walikelas):
// ringkasan presensi per kelas + detail per siswa + export (Excel bulanan / PDF per siswa).
//
// ✅ FIX (revisi ini): filter sebelumnya `subject.ilike('%PRESENSI HARIAN%')` TIDAK PERNAH
// match data asli. Komponen input presensi (Attendance.js, baris insert) menyimpan
// `subject` untuk presensi harian sebagai literal "Harian" (exact), bukan "PRESENSI HARIAN".
// Akibatnya dashboard ini sebelumnya selalu menampilkan "Belum Presensi" walau data ada.
// Filter sekarang pakai `.eq("subject", "Harian")` — konsisten dengan AttendanceModals.js,
// AttendancePDF.js, dan AttendanceExcel.js yang semuanya memakai value yang sama.
// ✅ FIX #1b: semua query presensi harian di file ini sekarang juga filter
// `.eq("type", "harian")`, menyamakan dengan AttendancePDF.js & AttendanceExcel.js
// (sebelumnya cuma filter subject, jadi berpotensi beda hasil kalau ada data
// presensi harian dengan kolom `type` yang bukan "harian").
//
// ✅ FIX #2: kolom `status` di database tersimpan sebagai "Alpha" (lihat Attendance.js,
// confirm-overwrite modal: `d.status === "Alpha"`), bukan "Alpa". Counter sebelumnya
// langsung match ke key "Alpa" sehingga record "Alpha" diam-diam tidak terhitung.
// Sekarang dinormalisasi lewat `normalizeStatusKey()`, sama seperti pola di AttendancePDF.js.
//
// Sesuai konvensi proyek ini, komponen TIDAK memakai embedded select Supabase
// (mis. `.select("*, students(full_name)")`) karena pernah menyebabkan error PGRST200.
// Semua relasi digabung manual di JS.

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  Calendar,
  RefreshCw,
  CheckCircle2,
  Stethoscope,
  FileText,
  XCircle,
  Hourglass,
  FileSpreadsheet,
  FileDown,
  X,
  Loader2,
  ClipboardList,
  School,
} from "lucide-react";
import ExcelJS from "exceljs";
import { supabase } from "../../supabaseClient";
import {
  getActiveAcademicYear,
  getAllSemestersInYear,
  getSemesterById,
} from "../../services/academicYearService";
import { exportStudentAttendancePDF } from "./AttendancePDF";

// Urutan bulan mengikuti tahun ajaran: Juli (awal Semester Ganjil) s/d Juni (akhir Semester Genap)
const ACADEMIC_MONTH_ORDER = [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6];

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const getTodayWIB = () => {
  const now = new Date();
  const wib = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  const yyyy = wib.getFullYear();
  const mm = String(wib.getMonth() + 1).padStart(2, "0");
  const dd = String(wib.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const formatDateIndo = (dateString) => {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return `${DAY_NAMES[d.getDay()]}, ${day} ${MONTH_NAMES[month - 1]} ${year}`;
};

// ✅ Normalisasi status mentah dari DB ("Hadir"/"hadir"/"Alpha"/"alpa"/dst) menjadi
// key kanonik yang dipakai counter & UI: "Hadir" | "Sakit" | "Izin" | "Alpa".
const normalizeStatusKey = (status) => {
  if (!status) return null;
  const s = status.toString().trim().toLowerCase();
  if (s === "hadir") return "Hadir";
  if (s === "sakit") return "Sakit";
  if (s === "izin") return "Izin";
  if (s === "alpa" || s === "alpha") return "Alpa";
  return null;
};

const AdminAttendance = ({ user, onShowToast, darkMode }) => {
  // ===== FILTER STATE =====
  const [selectedDate, setSelectedDate] = useState(getTodayWIB());
  const [selectedYear, setSelectedYear] = useState("");
  const [semesters, setSemesters] = useState([]); // rows academic_years untuk tahun terpilih
  const [selectedSemesterId, setSelectedSemesterId] = useState("");
  const [selectedJenjang, setSelectedJenjang] = useState(""); // "" | 7 | 8 | 9
  const [selectedClassId, setSelectedClassId] = useState(""); // "" = semua kelas
  const [selectedStatusFilter, setSelectedStatusFilter] = useState(""); // "" | selesai | sebagian | belum

  // ===== TAB STATE =====
  const [activeTab, setActiveTab] = useState("monitor"); // "monitor" | "export"

  // ===== EXPORT TAB STATE (terpisah dari filter Monitor, biar gak saling ganggu) =====
  const [exportMode, setExportMode] = useState("bulanan"); // "bulanan" | "semester"
  const [exportClasses, setExportClasses] = useState([]); // daftar semua kelas aktif
  const [exportClassId, setExportClassId] = useState(""); // "" = semua kelas
  const [exportMonthNumber, setExportMonthNumber] = useState(Number(getTodayWIB().split("-")[1])); // 1-12
  const [exportYearsList, setExportYearsList] = useState([]);
  const [exportYear, setExportYear] = useState("");
  const [exportSemesters, setExportSemesters] = useState([]);
  const [exportSemesterId, setExportSemesterId] = useState("");
  const [exportingExcelSemester, setExportingExcelSemester] = useState(false);

  // ===== DATA STATE =====
  const [classes, setClasses] = useState([]); // [{id, grade}]
  const [classSummaries, setClassSummaries] = useState([]); // hasil olahan per kelas
  const [loadingSummary, setLoadingSummary] = useState(true);

  // ===== DETAIL MODAL STATE =====
  const [detailModal, setDetailModal] = useState({
    open: false,
    classId: null,
    className: "",
  });
  const [detailStudents, setDetailStudents] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // ===== EXPORT STATE =====
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdfId, setExportingPdfId] = useState(null);
  // Export PDF per siswa — berdiri sendiri, terpisah dari modal monitoring harian.
  // Periode (bulanan/semester) ikut toggle `exportMode` yang sama dengan Export Excel di atas.
  const [pdfClassId, setPdfClassId] = useState("");
  const [pdfClassStudents, setPdfClassStudents] = useState([]);
  const [loadingPdfStudents, setLoadingPdfStudents] = useState(false);
  const [pdfSelectedStudentId, setPdfSelectedStudentId] = useState("");

  const showToast = useCallback(
    (message, type = "info") => {
      if (onShowToast) onShowToast(message, type);
    },
    [onShowToast]
  );

  // ===== Tentukan tahun ajaran & semester berdasarkan TANGGAL yang dipilih =====
  // (bukan cuma ambil semester aktif — supaya export tetap akurat walau
  //  tanggal yang dipilih ada di semester/tahun ajaran sebelumnya)
  useEffect(() => {
    if (!selectedDate) return;

    const resolvePeriodForDate = async () => {
      try {
        const { data, error } = await supabase
          .from("academic_years")
          .select("id, year, semester")
          .lte("start_date", selectedDate)
          .gte("end_date", selectedDate)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setSelectedYear(data.year);
          setSelectedSemesterId(data.id);
        } else {
          // Tanggal di luar semua periode yang tercatat → fallback ke tahun ajaran aktif
          const active = await getActiveAcademicYear();
          if (active) {
            setSelectedYear(active.year);
            setSelectedSemesterId(active.activeSemesterId);
          }
        }
      } catch (error) {
        console.error("❌ Gagal menentukan tahun ajaran untuk tanggal ini:", error);
      }
    };

    resolvePeriodForDate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // ===== EXPORT TAB: muat daftar kelas (independen dari filter Jenjang di Monitor) =====
  useEffect(() => {
    const loadExportClasses = async () => {
      try {
        const { data, error } = await supabase
          .from("classes")
          .select("id, grade")
          .eq("is_active", true)
          .order("id");
        if (error) throw error;
        setExportClasses(data || []);
      } catch (error) {
        console.error("❌ Gagal memuat daftar kelas untuk export:", error);
      }
    };
    loadExportClasses();
  }, []);

  // ===== EXPORT TAB: muat daftar tahun ajaran + default ke yang aktif =====
  useEffect(() => {
    const initExportPeriod = async () => {
      try {
        const { data, error } = await supabase
          .from("academic_years")
          .select("year")
          .order("year", { ascending: false });
        if (error) throw error;

        const uniqueYears = [...new Set((data || []).map((y) => y.year))];
        setExportYearsList(uniqueYears);

        const active = await getActiveAcademicYear();
        if (active) {
          setExportYear(active.year);
          setExportSemesterId(active.activeSemesterId);
        } else if (uniqueYears.length > 0) {
          setExportYear(uniqueYears[0]);
        }
      } catch (error) {
        console.error("❌ Gagal memuat daftar tahun ajaran untuk export:", error);
      }
    };
    initExportPeriod();
  }, []);

  // ===== EXPORT TAB: saat tahun ajaran export berubah, muat daftar semester =====
  useEffect(() => {
    if (!exportYear) return;

    const loadExportSemesters = async () => {
      try {
        const data = await getAllSemestersInYear(exportYear);
        setExportSemesters(data);

        const stillValid = data.find((s) => s.id === exportSemesterId);
        if (!stillValid && data.length > 0) {
          const activeInYear = data.find((s) => s.is_active) || data[0];
          setExportSemesterId(activeInYear.id);
        }
      } catch (error) {
        console.error("❌ Gagal memuat semester untuk export:", error);
      }
    };
    loadExportSemesters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportYear]);

  // ===== Saat tahun ajaran berubah: muat daftar semester =====
  useEffect(() => {
    if (!selectedYear) return;

    const loadSemesters = async () => {
      try {
        const data = await getAllSemestersInYear(selectedYear);
        setSemesters(data);

        const stillValid = data.find((s) => s.id === selectedSemesterId);
        if (!stillValid && data.length > 0) {
          const activeInYear = data.find((s) => s.is_active) || data[0];
          setSelectedSemesterId(activeInYear.id);
        }
      } catch (error) {
        console.error("❌ Gagal memuat semester:", error);
      }
    };

    loadSemesters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  // ===== EXPORT TAB: muat daftar siswa saat kelas untuk export PDF dipilih =====
  useEffect(() => {
    setPdfSelectedStudentId("");
    if (!pdfClassId) {
      setPdfClassStudents([]);
      return;
    }

    const loadPdfClassStudents = async () => {
      setLoadingPdfStudents(true);
      try {
        const { data, error } = await supabase
          .from("students")
          .select("id, full_name, nis")
          .eq("class_id", pdfClassId)
          .eq("is_active", true)
          .order("full_name");
        if (error) throw error;
        setPdfClassStudents(data || []);
      } catch (error) {
        console.error("❌ Gagal memuat siswa untuk export PDF:", error);
        showToast("Gagal memuat daftar siswa", "error");
      } finally {
        setLoadingPdfStudents(false);
      }
    };
    loadPdfClassStudents();
  }, [pdfClassId, showToast]);

  // ===== Muat daftar kelas (tergantung jenjang) =====
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        let query = supabase.from("classes").select("id, grade").eq("is_active", true).order("id");

        if (selectedJenjang) {
          query = query.eq("grade", Number(selectedJenjang));
        }

        const { data, error } = await query;
        if (error) throw error;

        setClasses(data || []);

        if (selectedClassId && !(data || []).some((c) => c.id === selectedClassId)) {
          setSelectedClassId("");
        }
      } catch (error) {
        console.error("❌ Gagal memuat kelas:", error);
        showToast("Gagal memuat data kelas", "error");
      }
    };

    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJenjang]);

  // ===== Fetch ringkasan presensi + monitoring per kelas =====
  const fetchAttendanceSummary = useCallback(async () => {
    if (!selectedDate || classes.length === 0) {
      setClassSummaries([]);
      setLoadingSummary(false);
      return;
    }

    setLoadingSummary(true);
    try {
      const relevantClasses = selectedClassId
        ? classes.filter((c) => c.id === selectedClassId)
        : classes;
      const classIds = relevantClasses.map((c) => c.id);

      if (classIds.length === 0) {
        setClassSummaries([]);
        setLoadingSummary(false);
        return;
      }

      // Total siswa aktif per kelas
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, class_id")
        .in("class_id", classIds)
        .eq("is_active", true);

      if (studentsError) throw studentsError;

      const totalPerClass = {};
      (studentsData || []).forEach((s) => {
        totalPerClass[s.class_id] = (totalPerClass[s.class_id] || 0) + 1;
      });

      // Presensi harian pada tanggal terpilih
      // ✅ FIX: exact match "Harian", bukan ilike "%PRESENSI HARIAN%" (lihat catatan atas file)
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendances")
        .select("id, student_id, class_id, status, subject, notes, created_at")
        .eq("date", selectedDate)
        .in("class_id", classIds)
        .eq("subject", "Harian")
        .eq("type", "harian");

      if (attendanceError) throw attendanceError;

      const statsPerClass = {};
      (attendanceData || []).forEach((a) => {
        if (!statsPerClass[a.class_id]) {
          statsPerClass[a.class_id] = { Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0 };
        }
        // ✅ FIX: normalisasi status ("Alpha" -> "Alpa", dst) sebelum dihitung
        const key = normalizeStatusKey(a.status);
        if (key) statsPerClass[a.class_id][key]++;
      });

      const summaries = relevantClasses.map((kelas) => {
        const total = totalPerClass[kelas.id] || 0;
        const stats = statsPerClass[kelas.id] || {
          Hadir: 0,
          Sakit: 0,
          Izin: 0,
          Alpa: 0,
        };
        const tercatat = stats.Hadir + stats.Sakit + stats.Izin + stats.Alpa;
        const belum = Math.max(total - tercatat, 0);

        let status = "belum";
        if (total > 0 && tercatat >= total) status = "selesai";
        else if (tercatat > 0) status = "sebagian";

        return {
          classId: kelas.id,
          grade: kelas.grade,
          total,
          hadir: stats.Hadir,
          sakit: stats.Sakit,
          izin: stats.Izin,
          alpa: stats.Alpa,
          belum,
          status,
        };
      });

      summaries.sort((a, b) => a.grade - b.grade || a.classId.localeCompare(b.classId));
      setClassSummaries(summaries);
    } catch (error) {
      console.error("❌ Gagal memuat ringkasan presensi:", error);
      showToast("Gagal memuat ringkasan presensi", "error");
    } finally {
      setLoadingSummary(false);
    }
  }, [selectedDate, classes, selectedClassId, showToast]);

  useEffect(() => {
    fetchAttendanceSummary();
  }, [fetchAttendanceSummary]);

  // ===== Detail presensi per kelas =====
  const openDetail = async (kelas) => {
    setDetailModal({
      open: true,
      classId: kelas.classId,
      className: kelas.classId,
    });
    setDetailLoading(true);
    try {
      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("id, full_name, nis")
        .eq("class_id", kelas.classId)
        .eq("is_active", true)
        .order("full_name");
      if (studentsError) throw studentsError;

      // ✅ FIX: exact match "Harian" (sama seperti fetchAttendanceSummary)
      const { data: attendance, error: attendanceError } = await supabase
        .from("attendances")
        .select("student_id, status, notes, created_at")
        .eq("date", selectedDate)
        .eq("class_id", kelas.classId)
        .eq("subject", "Harian")
        .eq("type", "harian");
      if (attendanceError) throw attendanceError;

      const attendanceByStudent = {};
      (attendance || []).forEach((a) => {
        attendanceByStudent[a.student_id] = a;
      });

      const merged = (students || []).map((s) => {
        const record = attendanceByStudent[s.id];
        return {
          id: s.id,
          nis: s.nis,
          name: s.full_name,
          // ✅ FIX: tampilkan label yang sudah dinormalisasi ("Alpha" -> "Alpa")
          status: record ? normalizeStatusKey(record.status) || record.status : "Belum Presensi",
          waktu: record?.created_at
            ? new Date(record.created_at).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "-",
          keterangan: record?.notes || "-",
        };
      });

      setDetailStudents(merged);
    } catch (error) {
      console.error("❌ Gagal memuat detail presensi:", error);
      showToast("Gagal memuat detail presensi", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailModal({ open: false, classId: null, className: "" });
    setDetailStudents([]);
  };

  // Siswa yang tidak hadir apapun alasannya = status Sakit / Izin / Alpa
  // (bukan "Hadir" dan bukan "Belum Presensi").
  const ABSENT_STATUSES = ["Sakit", "Izin", "Alpa"];
  const absentStudentsInModal = useMemo(
    () => detailStudents.filter((s) => ABSENT_STATUSES.includes(s.status)),
    [detailStudents]
  );

  // ===== Ringkasan global (dihitung dari classSummaries yang sudah difilter status) =====
  const filteredSummaries = useMemo(() => {
    if (!selectedStatusFilter) return classSummaries;
    return classSummaries.filter((c) => c.status === selectedStatusFilter);
  }, [classSummaries, selectedStatusFilter]);

  const overallSummary = useMemo(() => {
    return classSummaries.reduce(
      (acc, c) => ({
        total: acc.total + c.total,
        hadir: acc.hadir + c.hadir,
        sakit: acc.sakit + c.sakit,
        izin: acc.izin + c.izin,
        alpa: acc.alpa + c.alpa,
        belum: acc.belum + c.belum,
      }),
      { total: 0, hadir: 0, sakit: 0, izin: 0, alpa: 0, belum: 0 }
    );
  }, [classSummaries]);

  const summaryCards = [
    {
      label: "Total Siswa",
      value: overallSummary.total,
      icon: Users,
      color: "slate",
    },
    {
      label: "Hadir",
      value: overallSummary.hadir,
      icon: CheckCircle2,
      color: "emerald",
    },
    {
      label: "Sakit",
      value: overallSummary.sakit,
      icon: Stethoscope,
      color: "amber",
    },
    {
      label: "Izin",
      value: overallSummary.izin,
      icon: FileText,
      color: "blue",
    },
    { label: "Alpa", value: overallSummary.alpa, icon: XCircle, color: "rose" },
    {
      label: "Belum Dipresensi",
      value: overallSummary.belum,
      icon: Hourglass,
      color: "orange",
    },
  ];

  const colorClasses = {
    slate:
      "bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-700/50",
    emerald:
      "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50",
    amber:
      "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800/50",
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800/50",
    rose: "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-800/50",
    orange:
      "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-800/50",
  };

  const statusBadge = (status) => {
    if (status === "selesai") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md text-[10px] sm:text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 whitespace-nowrap">
          <CheckCircle2 size={12} className="hidden sm:inline" /> Selesai
        </span>
      );
    }
    if (status === "sebagian") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md text-[10px] sm:text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 whitespace-nowrap">
          <Hourglass size={12} className="hidden sm:inline" /> Sebagian
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md text-[10px] sm:text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 whitespace-nowrap">
        <XCircle size={12} className="hidden sm:inline" /> Belum
      </span>
    );
  };

  // ===== EXPORT: Excel rekap bulanan (semua kelas / kelas terpilih) =====
  const handleExportExcelBulanan = async () => {
    const relevantClasses = exportClassId
      ? exportClasses.filter((c) => c.id === exportClassId)
      : exportClasses;
    const classIds = relevantClasses.map((c) => c.id);

    if (classIds.length === 0) {
      showToast("Tidak ada kelas untuk diexport", "error");
      return;
    }

    setExportingExcel(true);
    try {
      if (!exportYear) {
        showToast("Pilih tahun ajaran terlebih dahulu", "error");
        setExportingExcel(false);
        return;
      }
      // Tahun kalender: Juli-Desember pakai tahun awal, Januari-Juni pakai tahun akhir
      const [startYearStr, endYearStr] = exportYear.split("/");
      const year = exportMonthNumber >= 7 ? Number(startYearStr) : Number(endYearStr);
      const month = exportMonthNumber;
      const monthStr = String(month).padStart(2, "0");
      const yearStr = String(year);
      const lastDay = new Date(year, month, 0).getDate();
      const startDate = `${yearStr}-${monthStr}-01`;
      const endDate = `${yearStr}-${monthStr}-${String(lastDay).padStart(2, "0")}`;

      const { data: studentsData, error: studentsErr } = await supabase
        .from("students")
        .select("id, full_name, nis, class_id")
        .in("class_id", classIds)
        .eq("is_active", true)
        .order("full_name");
      if (studentsErr) throw studentsErr;

      // ✅ FIX: pagination — sama seperti di handleExportExcelSemester, buat jaga-jaga
      // kalau "Semua Kelas" dipilih (bisa lewat 1000 baris walau cuma 1 bulan).
      let attendanceData = [];
      {
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;
        while (hasMore) {
          const { data, error } = await supabase
            .from("attendances")
            .select("student_id, class_id, status, date")
            .in("class_id", classIds)
            .eq("subject", "Harian")
            .eq("type", "harian")
            .gte("date", startDate)
            .lte("date", endDate)
            .order("date", { ascending: true })
            .range(page * pageSize, (page + 1) * pageSize - 1);
          if (error) throw error;
          if (data && data.length > 0) {
            attendanceData = attendanceData.concat(data);
            hasMore = data.length === pageSize;
            page++;
          } else {
            hasMore = false;
          }
        }
      }

      if (!studentsData || studentsData.length === 0) {
        showToast("Tidak ada data siswa untuk diexport", "error");
        return;
      }

      const grouped = {};
      studentsData.forEach((s) => {
        if (!grouped[s.class_id]) grouped[s.class_id] = [];
        grouped[s.class_id].push(s);
      });

      // Label semester (untuk baris info di header) — ditentukan dari bulan yang dipilih
      const semesterNumberForMonth = exportMonthNumber >= 7 ? 1 : 2;
      const academicInfo = exportYear
        ? ` | ${exportYear} - Semester ${semesterNumberForMonth}`
        : "";

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Sistem Presensi";
      workbook.created = new Date();
      const monthLabel = MONTH_NAMES[month - 1];
      const periodText = `${monthLabel.toUpperCase()} ${year}`;

      Object.keys(grouped)
        .sort()
        .forEach((classId) => {
          const classStudents = grouped[classId];
          const classAttendance = (attendanceData || []).filter((a) => a.class_id === classId);

          // Tanggal unik yang benar-benar ada presensinya, di kelas ini
          const uniqueDates = [...new Set(classAttendance.map((a) => a.date))].sort().map((d) => {
            const [, mm, dd] = d.split("-");
            return { original: d, display: `${dd}-${mm}` };
          });

          // Matrix per siswa: kode H/S/I/A per tanggal + ringkasan
          const matrix = {};
          classStudents.forEach((s) => {
            matrix[s.id] = {
              dates: {},
              summary: { Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0 },
            };
          });
          classAttendance.forEach((a) => {
            const m = matrix[a.student_id];
            if (!m) return;
            const key = normalizeStatusKey(a.status);
            if (!key) return;
            const code = key === "Hadir" ? "H" : key === "Sakit" ? "S" : key === "Izin" ? "I" : "A";
            m.dates[a.date] = code;
            m.summary[key]++;
          });

          const baseCols = 2; // No, Nama
          const dateCols = uniqueDates.length;
          const summaryCols = 6; // Hadir, Sakit, Izin, Alpa, Total, %
          const totalCols = baseCols + dateCols + summaryCols;

          const sheet = workbook.addWorksheet(classId.substring(0, 31));

          // ===== Header block =====
          sheet.mergeCells(1, 1, 1, totalCols);
          sheet.getCell(1, 1).value = "SMP MUSLIMIN CILILIN";
          sheet.getCell(1, 1).font = { name: "Arial", size: 14, bold: true };
          sheet.getCell(1, 1).alignment = {
            horizontal: "center",
            vertical: "middle",
          };
          sheet.getRow(1).height = 22;

          sheet.mergeCells(2, 1, 2, totalCols);
          sheet.getCell(2, 1).value = `REKAP PRESENSI HARIAN KELAS ${classId}`;
          sheet.getCell(2, 1).font = { name: "Arial", size: 12, bold: true };
          sheet.getCell(2, 1).alignment = {
            horizontal: "center",
            vertical: "middle",
          };
          sheet.getRow(2).height = 22;

          sheet.mergeCells(3, 1, 3, totalCols);
          sheet.getCell(3, 1).value = `BULAN : ${periodText}${academicInfo}`;
          sheet.getCell(3, 1).font = { name: "Arial", size: 12, bold: true };
          sheet.getCell(3, 1).alignment = {
            horizontal: "center",
            vertical: "middle",
          };
          sheet.getRow(3).height = 22;

          // ===== Table header (row 5) =====
          const headerLabels = [
            "No",
            "Nama Siswa",
            ...uniqueDates.map((d) => d.display),
            "Hadir",
            "Izin",
            "Sakit",
            "Alpha",
            "Total",
            "Persentase",
          ];
          headerLabels.forEach((label, idx) => {
            const cell = sheet.getCell(5, idx + 1);
            cell.value = label;
            cell.font = { name: "Arial", size: 10, bold: true };
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFE8F4FD" },
            };
            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
          });
          sheet.getRow(5).height = 20;

          // ===== Data rows =====
          const dataStartRow = 6;
          classStudents.forEach((s, idx) => {
            const m = matrix[s.id];
            const { Hadir, Sakit, Izin, Alpa } = m.summary;
            const total = Hadir + Sakit + Izin + Alpa;
            const pct = total > 0 ? Math.round((Hadir / total) * 100) : 100;

            const rowValues = [
              idx + 1,
              s.full_name,
              ...uniqueDates.map((d) => m.dates[d.original] || ""),
              Hadir,
              Izin,
              Sakit,
              Alpa,
              total,
              `${pct}%`,
            ];

            const rowNum = dataStartRow + idx;
            rowValues.forEach((value, colIdx) => {
              const cell = sheet.getCell(rowNum, colIdx + 1);
              cell.value = value;
              cell.font = { name: "Arial", size: 9 };
              cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" },
              };

              if (colIdx === 0) {
                cell.alignment = { horizontal: "center", vertical: "middle" };
              } else if (colIdx === 1) {
                cell.alignment = { horizontal: "left", vertical: "middle" };
              } else if (colIdx >= 2 && colIdx < 2 + dateCols) {
                cell.alignment = { horizontal: "center", vertical: "middle" };
                if (value === "H") {
                  cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FFD4F1D4" },
                  };
                } else if (value === "S") {
                  cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FFFFF4CD" },
                  };
                } else if (value === "I") {
                  cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FFCDE4FF" },
                  };
                } else if (value === "A") {
                  cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FFFFD4D4" },
                  };
                }
              } else {
                cell.alignment = { horizontal: "center", vertical: "middle" };
              }
            });
            sheet.getRow(rowNum).height = 18;
          });

          // ===== Column widths =====
          sheet.getColumn(1).width = 5;
          sheet.getColumn(2).width = 30;
          for (let i = 0; i < dateCols; i++) {
            sheet.getColumn(3 + i).width = 6;
          }
          const summaryStartCol = 3 + dateCols;
          for (let i = 0; i < summaryCols; i++) {
            sheet.getColumn(summaryStartCol + i).width = i === 5 ? 12 : 8;
          }
        });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Rekap_Presensi_${exportClassId || "SemuaKelas"}_${monthLabel}_${year}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);

      showToast("Rekap presensi bulanan berhasil diexport", "success");
    } catch (error) {
      console.error("❌ Gagal export Excel:", error);
      showToast("Gagal mengexport rekap Excel", "error");
    } finally {
      setExportingExcel(false);
    }
  };

  // ===== EXPORT: Excel rekap semester (semua kelas / kelas terpilih) =====
  const handleExportExcelSemester = async () => {
    if (!exportSemesterId) {
      showToast("Pilih tahun ajaran & semester terlebih dahulu", "error");
      return;
    }

    const relevantClasses = exportClassId
      ? exportClasses.filter((c) => c.id === exportClassId)
      : exportClasses;
    const classIds = relevantClasses.map((c) => c.id);

    if (classIds.length === 0) {
      showToast("Tidak ada kelas untuk diexport", "error");
      return;
    }

    setExportingExcelSemester(true);
    try {
      const semRow = await getSemesterById(exportSemesterId);
      if (!semRow) throw new Error("Semester tidak ditemukan");

      const { start_date: startDate, end_date: endDate } = semRow;
      const semesterLabel = semRow.semester === 1 ? "Ganjil" : "Genap";

      const { data: studentsData, error: studentsErr } = await supabase
        .from("students")
        .select("id, full_name, nis, class_id")
        .in("class_id", classIds)
        .eq("is_active", true)
        .order("full_name");
      if (studentsErr) throw studentsErr;

      // ✅ FIX: fetch dengan pagination — query tanpa .range() diam-diam
      // kepotong di 1000 baris (default limit Supabase/PostgREST). 1 kelas
      // isi 36 siswa × ~32 hari aja udah > 1000 baris, jadi WAJIB paginate.
      // Pola sama persis dengan exportSemesterRecapFromComponent di AttendanceExcel.js.
      let attendanceData = [];
      {
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;
        while (hasMore) {
          const { data, error } = await supabase
            .from("attendances")
            .select("student_id, class_id, status, date")
            .in("class_id", classIds)
            .eq("subject", "Harian")
            .eq("type", "harian")
            .gte("date", startDate)
            .lte("date", endDate)
            .order("date", { ascending: true })
            .range(page * pageSize, (page + 1) * pageSize - 1);
          if (error) throw error;
          if (data && data.length > 0) {
            attendanceData = attendanceData.concat(data);
            hasMore = data.length === pageSize;
            page++;
          } else {
            hasMore = false;
          }
        }
      }

      const byStudent = {};
      (attendanceData || []).forEach((a) => {
        const key = normalizeStatusKey(a.status);
        if (!key) return;
        if (!byStudent[a.student_id])
          byStudent[a.student_id] = { Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0 };
        byStudent[a.student_id][key]++;
      });

      if (!studentsData || studentsData.length === 0) {
        showToast("Tidak ada data siswa untuk diexport", "error");
        return;
      }

      const grouped = {};
      studentsData.forEach((s) => {
        if (!grouped[s.class_id]) grouped[s.class_id] = [];
        grouped[s.class_id].push(s);
      });

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Sistem Presensi";
      workbook.created = new Date();
      const semesterPeriodText =
        semRow.semester === 1 ? "Ganjil (Juli-Desember)" : "Genap (Januari-Juni)";

      const getCategory = (pct) => {
        if (pct >= 90) return "Sangat Baik";
        if (pct >= 80) return "Baik";
        if (pct >= 70) return "Cukup";
        return "Kurang";
      };
      const categoryFill = {
        "Sangat Baik": "FFC6EFCE",
        Baik: "FFFFF2CC",
        Cukup: "FFFCE4D6",
        Kurang: "FFFFC7CE",
      };

      Object.keys(grouped)
        .sort()
        .forEach((classId) => {
          const classStudents = grouped[classId];
          const classAttendance = (attendanceData || []).filter((a) => a.class_id === classId);
          // ✅ FIX: "Total" per siswa harus sama = jumlah hari presensi yang
          // benar-benar diinput untuk kelas ini (bukan sekadar jumlah status
          // yang tercatat per siswa — kalau ada 1 hari siswa tsb kelewat
          // diinput, totalnya jadi lebih kecil dari teman sekelasnya).
          const effectiveDaysCount = new Set(classAttendance.map((a) => a.date)).size;
          const sheet = workbook.addWorksheet(`Sem ${semesterLabel} ${classId}`.substring(0, 31));
          const totalCols = 10;

          sheet.mergeCells(1, 1, 1, totalCols);
          sheet.getCell(1, 1).value = "SMP MUSLIMIN CILILIN";
          sheet.getCell(1, 1).font = { name: "Arial", size: 14, bold: true };
          sheet.getCell(1, 1).alignment = {
            horizontal: "center",
            vertical: "middle",
          };
          sheet.getRow(1).height = 25;

          sheet.mergeCells(2, 1, 2, totalCols);
          sheet.getCell(2, 1).value = `REKAP PRESENSI - KELAS ${classId} | ${semRow.year}`;
          sheet.getCell(2, 1).font = { name: "Arial", size: 12, bold: true };
          sheet.getCell(2, 1).alignment = {
            horizontal: "center",
            vertical: "middle",
          };
          sheet.getRow(2).height = 20;

          sheet.mergeCells(3, 1, 3, totalCols);
          sheet.getCell(3, 1).value =
            `PRESENSI HARIAN | SEMESTER ${semesterPeriodText.toUpperCase()}`;
          sheet.getCell(3, 1).font = { name: "Arial", size: 11 };
          sheet.getCell(3, 1).alignment = {
            horizontal: "center",
            vertical: "middle",
          };
          sheet.getRow(3).height = 20;
          sheet.getRow(4).height = 15;

          const headerLabels = [
            "NO",
            "NIS",
            "NAMA SISWA",
            "HADIR",
            "SAKIT",
            "IZIN",
            "ALPA",
            "TOTAL",
            "%",
            "KATEGORI",
          ];
          headerLabels.forEach((label, idx) => {
            const cell = sheet.getCell(5, idx + 1);
            cell.value = label;
            cell.font = {
              name: "Arial",
              size: 11,
              bold: true,
              color: { argb: "FFFFFFFF" },
            };
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF4472C4" },
            };
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
          });
          sheet.getRow(5).height = 25;

          classStudents.forEach((s, idx) => {
            const stats = byStudent[s.id] || {
              Hadir: 0,
              Sakit: 0,
              Izin: 0,
              Alpa: 0,
            };
            const total = effectiveDaysCount;
            const pct = total > 0 ? Math.round((stats.Hadir / total) * 100) : 0;
            const category = getCategory(pct);

            const rowNum = 6 + idx;
            const rowValues = [
              idx + 1,
              s.nis || "-",
              s.full_name,
              stats.Hadir,
              stats.Sakit,
              stats.Izin,
              stats.Alpa,
              total,
              pct,
              category,
            ];

            rowValues.forEach((value, colIdx) => {
              const cell = sheet.getCell(rowNum, colIdx + 1);
              cell.value = value;
              cell.font = { name: "Arial", size: 10 };
              cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" },
              };
              cell.alignment =
                colIdx === 0 || colIdx >= 3
                  ? { horizontal: "center", vertical: "middle" }
                  : { horizontal: "left", vertical: "middle" };

              if (colIdx === 9) {
                cell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: categoryFill[category] },
                };
              }
            });
            sheet.getRow(rowNum).height = 20;
          });

          sheet.getColumn(1).width = 5;
          sheet.getColumn(2).width = 15;
          sheet.getColumn(3).width = 35;
          sheet.getColumn(4).width = 10;
          sheet.getColumn(5).width = 10;
          sheet.getColumn(6).width = 10;
          sheet.getColumn(7).width = 10;
          sheet.getColumn(8).width = 10;
          sheet.getColumn(9).width = 8;
          sheet.getColumn(10).width = 15;
        });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Rekap_Presensi_${exportClassId || "SemuaKelas"}_Semester${semesterLabel}_${semRow.year.replace("/", "-")}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);

      showToast("Rekap presensi semester berhasil diexport", "success");
    } catch (error) {
      console.error("❌ Gagal export Excel semester:", error);
      showToast("Gagal mengexport rekap semester", "error");
    } finally {
      setExportingExcelSemester(false);
    }
  };

  // ===== EXPORT: PDF presensi per siswa (berdiri sendiri, tab Export) =====
  const handleExportPdfStudent = async () => {
    const student = pdfClassStudents.find((s) => s.id === pdfSelectedStudentId);
    if (!student) {
      showToast("Pilih siswa terlebih dahulu", "error");
      return;
    }
    if (!exportMode) return;

    setExportingPdfId(student.id);
    try {
      const semesterObj =
        exportMode === "bulanan" ? null : exportSemesters.find((s) => s.id === exportSemesterId);
      const semesterNumber = semesterObj?.semester;

      let pdfParams = {
        student: { id: student.id, nis: student.nis, full_name: student.full_name },
        attendanceType: "harian",
        homeroomClass: pdfClassId,
        academicYear: exportYear,
        academicYearId: exportSemesterId,
        semester: semesterNumber,
        // ✅ Export dari monitoring admin gak perlu blok tanda tangan wali kelas/guru mapel
        includeSignature: false,
      };

      if (exportMode === "bulanan") {
        // Tahun kalender: Juli-Desember pakai tahun awal, Januari-Juni pakai tahun akhir
        const [startYearStr, endYearStr] = (exportYear || "").split("/");
        const calendarYear = exportMonthNumber >= 7 ? Number(startYearStr) : Number(endYearStr);
        pdfParams = {
          ...pdfParams,
          mode: "bulanan",
          month: exportMonthNumber,
          year: calendarYear,
        };
      } else {
        // Mode "semester": tahun kalender ditentukan dari string "2025/2026"
        // — semester ganjil pakai tahun awal, semester genap pakai tahun akhir.
        const [startYear, endYear] = (exportYear || "").split("/").map(Number);
        const calendarYear = semesterNumber === 1 ? startYear : endYear;
        pdfParams = {
          ...pdfParams,
          mode: "semester",
          year: calendarYear,
        };
      }

      const result = await exportStudentAttendancePDF(pdfParams);

      if (!result.success) {
        showToast(result.message || "Gagal export PDF", "error");
      } else {
        showToast("PDF presensi siswa berhasil diunduh", "success");
      }
    } catch (error) {
      console.error("❌ Gagal export PDF siswa:", error);
      showToast("Gagal mengexport PDF", "error");
    } finally {
      setExportingPdfId(null);
    }
  };

  const inputClass =
    "w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-10">
        <div className="px-4 sm:px-6 py-4 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <ClipboardList className="text-blue-600 dark:text-blue-400" size={28} />
                Monitoring Presensi Siswa
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {formatDateIndo(selectedDate)}
              </p>
            </div>
            {user && (
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="w-8 h-8 bg-blue-600 dark:bg-blue-700 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {user.full_name?.charAt(0) || "A"}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">
                    {user.full_name}
                  </p>
                  <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded font-medium">
                    {user.role === "guru_bk" ? "🧑‍⚕️ Guru BK/BP" : "Administrator"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto">
        {/* Tab Switcher */}
        <div className="flex gap-2 mb-4 sm:mb-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-1.5">
          <button
            onClick={() => setActiveTab("monitor")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
              activeTab === "monitor"
                ? "bg-blue-600 text-white"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <ClipboardList size={16} /> Monitor Presensi
          </button>
          <button
            onClick={() => setActiveTab("export")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
              activeTab === "export"
                ? "bg-blue-600 text-white"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <FileSpreadsheet size={16} /> Export Presensi
          </button>
        </div>

        {activeTab === "monitor" && (
          <>
            {/* Filter Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
              {selectedYear && (
                <div className="mb-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Tahun Ajaran{" "}
                  <span className="text-slate-700 dark:text-slate-200">{selectedYear}</span>
                  {" · "}
                  {semesters.find((s) => s.id === selectedSemesterId)?.semester === 1
                    ? "Semester Ganjil"
                    : "Semester Genap"}
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    className={inputClass}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Jenjang
                  </label>
                  <select
                    className={inputClass}
                    value={selectedJenjang}
                    onChange={(e) => setSelectedJenjang(e.target.value)}
                  >
                    <option value="">Semua Jenjang</option>
                    <option value="7">Kelas 7</option>
                    <option value="8">Kelas 8</option>
                    <option value="9">Kelas 9</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Kelas
                  </label>
                  <select
                    className={inputClass}
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                  >
                    <option value="">Semua Kelas</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Status
                  </label>
                  <select
                    className={inputClass}
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  >
                    <option value="">Semua Status</option>
                    <option value="selesai">Selesai</option>
                    <option value="sebagian">Sebagian</option>
                    <option value="belum">Belum Presensi</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Ringkasan Presensi */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-4 sm:mb-6">
              {summaryCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    className={`rounded-lg border p-3 sm:p-4 shadow-sm ${colorClasses[card.color]}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Icon size={18} />
                      <span className="text-xl sm:text-2xl font-bold">{card.value}</span>
                    </div>
                    <div className="text-xs sm:text-sm font-medium">{card.label}</div>
                  </div>
                );
              })}
            </div>

            {/* Monitoring per Kelas */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-4 sm:mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-900/40 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-3">
                <h3 className="text-sm sm:text-lg font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <School size={18} className="shrink-0" />
                  <span>Monitoring per Kelas</span>
                </h3>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={fetchAttendanceSummary}
                    className="px-3 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-800/40 dark:hover:bg-blue-800/60 text-blue-700 dark:text-blue-300 rounded-lg font-medium flex items-center gap-2 text-sm min-h-[38px]"
                  >
                    <RefreshCw size={15} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {loadingSummary ? (
                <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  Memuat data...
                </div>
              ) : filteredSummaries.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  Tidak ada data kelas untuk filter ini.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs uppercase">
                      <tr>
                        <th className="px-1.5 py-2 sm:px-4 text-left">Kelas</th>
                        <th className="px-1 py-2 sm:px-3 text-center">Siswa</th>
                        <th className="px-1 py-2 sm:px-3 text-center">Hadir</th>
                        <th className="px-1 py-2 sm:px-3 text-center">Sakit</th>
                        <th className="px-1 py-2 sm:px-3 text-center">Izin</th>
                        <th className="px-1 py-2 sm:px-3 text-center">Alpa</th>
                        <th className="px-1 py-2 sm:px-3 text-center">Status</th>
                        <th className="px-1 py-2 sm:px-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {filteredSummaries.map((k) => (
                        <tr
                          key={k.classId}
                          className="hover:bg-slate-50 dark:hover:bg-slate-700/30"
                        >
                          <td className="px-1.5 py-2 sm:px-4 font-semibold text-slate-800 dark:text-slate-200">
                            {k.classId}
                          </td>
                          <td className="px-1 py-2 sm:px-3 text-center font-semibold text-slate-800 dark:text-slate-200">
                            {k.total}
                          </td>
                          <td className="px-1 py-2 sm:px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                            {k.hadir}
                          </td>
                          <td className="px-1 py-2 sm:px-3 text-center font-bold text-amber-600 dark:text-amber-400">
                            {k.sakit}
                          </td>
                          <td className="px-1 py-2 sm:px-3 text-center font-bold text-blue-600 dark:text-blue-400">
                            {k.izin}
                          </td>
                          <td className="px-1 py-2 sm:px-3 text-center font-bold text-rose-600 dark:text-rose-400">
                            {k.alpa}
                          </td>
                          <td className="px-1 py-2 sm:px-3 text-center">{statusBadge(k.status)}</td>
                          <td className="px-1 py-2 sm:px-3 text-center">
                            <button
                              onClick={() => openDetail(k)}
                              className="px-1.5 py-1 sm:px-2 rounded-md text-[10px] sm:text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                            >
                              Detail
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "export" && (
          <>
            {/* Export Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
              {/* Mode toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setExportMode("bulanan")}
                  className={`flex-1 px-3 py-2 rounded-lg font-semibold text-sm transition-colors ${
                    exportMode === "bulanan"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  Bulanan
                </button>
                <button
                  onClick={() => setExportMode("semester")}
                  className={`flex-1 px-3 py-2 rounded-lg font-semibold text-sm transition-colors ${
                    exportMode === "semester"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  Semester
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Kelas
                  </label>
                  <select
                    className={inputClass}
                    value={exportClassId}
                    onChange={(e) => setExportClassId(e.target.value)}
                  >
                    <option value="">Semua Kelas</option>
                    {exportClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Tahun Ajaran
                  </label>
                  <select
                    className={inputClass}
                    value={exportYear}
                    onChange={(e) => setExportYear(e.target.value)}
                  >
                    {exportYearsList.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                {exportMode === "bulanan" ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Bulan
                    </label>
                    <select
                      className={inputClass}
                      value={exportMonthNumber}
                      onChange={(e) => setExportMonthNumber(Number(e.target.value))}
                    >
                      {ACADEMIC_MONTH_ORDER.map((m) => (
                        <option key={m} value={m}>
                          {MONTH_NAMES[m - 1]}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Semester
                    </label>
                    <select
                      className={inputClass}
                      value={exportSemesterId}
                      onChange={(e) => setExportSemesterId(e.target.value)}
                    >
                      {exportSemesters.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.semester === 1 ? "Ganjil" : "Genap"}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  onClick={
                    exportMode === "bulanan" ? handleExportExcelBulanan : handleExportExcelSemester
                  }
                  disabled={exportMode === "bulanan" ? exportingExcel : exportingExcelSemester}
                  className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 text-sm disabled:opacity-60"
                >
                  {(exportMode === "bulanan" ? exportingExcel : exportingExcelSemester) ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <FileSpreadsheet size={16} />
                  )}
                  <span>Export Excel</span>
                </button>
              </div>
            </div>

            {/* Export PDF per Siswa — terpisah dari modal monitoring harian */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-3 sm:p-4">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
                Export PDF Presensi per Siswa
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Periode mengikuti pilihan Bulanan/Semester, Tahun Ajaran, dan Bulan/Semester di
                atas.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Kelas
                  </label>
                  <select
                    className={inputClass}
                    value={pdfClassId}
                    onChange={(e) => setPdfClassId(e.target.value)}
                  >
                    <option value="">Pilih kelas</option>
                    {exportClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Siswa
                  </label>
                  <select
                    className={inputClass}
                    value={pdfSelectedStudentId}
                    disabled={!pdfClassId || loadingPdfStudents}
                    onChange={(e) => setPdfSelectedStudentId(e.target.value)}
                  >
                    <option value="">
                      {loadingPdfStudents
                        ? "Memuat..."
                        : pdfClassStudents.length === 0
                          ? "Pilih kelas dulu"
                          : "Pilih siswa"}
                    </option>
                    {pdfClassStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleExportPdfStudent}
                  disabled={!pdfSelectedStudentId || !!exportingPdfId}
                  className="w-full px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 text-sm disabled:opacity-60"
                >
                  {exportingPdfId ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <FileDown size={16} />
                  )}
                  <span>Export PDF</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Detail Modal */}
        {detailModal.open && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 px-4 py-3 sm:px-6 sm:py-4 rounded-t-2xl flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-white">
                    Siswa Tidak Hadir — {detailModal.className}
                  </h2>
                  <p className="text-xs text-white/80">{formatDateIndo(selectedDate)}</p>
                </div>
                <button onClick={closeDetail} className="text-white/80 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto p-4 sm:p-6">
                {!detailLoading && detailStudents.length > 0 && (
                  <div className="mb-4 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    {detailStudents.length - absentStudentsInModal.length} dari{" "}
                    {detailStudents.length} siswa hadir.{" "}
                    {absentStudentsInModal.length > 0 && (
                      <span className="font-semibold text-rose-600 dark:text-rose-400">
                        {absentStudentsInModal.length} siswa tidak hadir.
                      </span>
                    )}
                  </div>
                )}
                {detailLoading ? (
                  <div className="text-center text-sm text-slate-500 dark:text-slate-400 py-6">
                    Memuat...
                  </div>
                ) : detailStudents.length === 0 ? (
                  <div className="text-center text-sm text-slate-500 dark:text-slate-400 py-6">
                    Tidak ada siswa aktif di kelas ini.
                  </div>
                ) : absentStudentsInModal.length === 0 ? (
                  <div className="text-center text-sm text-slate-500 dark:text-slate-400 py-6">
                    🎉 Semua siswa hadir hari ini.
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-slate-500 dark:text-slate-400 text-xs uppercase border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2 text-left">Nama</th>
                        <th className="py-2 text-center">Status</th>
                        <th className="py-2 text-center">Waktu</th>
                        <th className="py-2 text-left">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {absentStudentsInModal.map((s) => (
                        <tr key={s.id}>
                          <td className="py-2 text-slate-800 dark:text-slate-200">{s.name}</td>
                          <td className="py-2 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                                s.status === "Alpa"
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                                  : s.status === "Sakit"
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                    : "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
                              }`}
                            >
                              {s.status}
                            </span>
                          </td>
                          <td className="py-2 text-center text-slate-600 dark:text-slate-300">
                            {s.waktu}
                          </td>
                          <td className="py-2 text-slate-600 dark:text-slate-300">
                            {s.keterangan}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAttendance;
