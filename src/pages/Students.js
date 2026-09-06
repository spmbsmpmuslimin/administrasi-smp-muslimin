// pages/DataSiswa.js
// Dirender lewat menuConfig.js DI DALAM Layout.js -- sidebar, header, dan
// background halaman udah disediain Layout.js. Komponen ini pakai
// PageContainer & Card standar dari components/ui, bukan bikin
// min-h-screen/background sendiri.
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { getActiveAcademicYear } from "../services/academicYearService";
import { DataExcel } from "./DataExcel";
import {
  resolveCompletion,
  COMPLETION_STATUS_META,
  REQUIRED_FIELDS,
} from "../utils/studentProfileCompletion";
import {
  Users,
  GraduationCap,
  User,
  UserCheck,
  Eye,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  XCircle,
  History,
  FileSpreadsheet,
  Search,
  Target,
} from "lucide-react";
import PageContainer from "../components/ui/PageContainer";
import Card from "../components/ui/Card";
import { PageTitle, SectionTitle, Text, Muted, Subtitle } from "../components/ui/Typography";

// State kosong dipakai bareng oleh versi mobile (card) & versi tablet/desktop (table)
const EmptyState = ({ darkMode, showEmptyPrompt }) => (
  <div className="py-10 sm:py-12 text-center">
    <Users className={`mx-auto mb-2 ${darkMode ? "text-gray-500" : "text-gray-400"}`} size={40} />
    <SectionTitle darkMode={darkMode} className="mb-1">
      {showEmptyPrompt ? "Belum ada data siswa" : "Siswa tidak ditemukan"}
    </SectionTitle>
    <Muted darkMode={darkMode}>
      {showEmptyPrompt
        ? "Belum ada data siswa aktif yang tersimpan di sistem."
        : "Coba ubah kata kunci pencarian atau filter yang dipakai."}
    </Muted>
  </div>
);

export const Students = ({ user: userFromProps, onShowToast, darkMode }) => {
  // Ikon per status kelengkapan (label & warna badge ambil dari
  // COMPLETION_STATUS_META di util bersama, biar konsisten sama
  // DataSiswaInduk.js).
  const COMPLETION_STATUS_ICON = {
    lengkap: CheckCircle2,
    sebagian: AlertCircle,
    belum: XCircle,
  };

  const [siswaData, setSiswaData] = useState([]);
  const [allSiswaData, setAllSiswaData] = useState([]);
  const [kelasOptions, setKelasOptions] = useState([]);
  const [allKelasOptions, setAllKelasOptions] = useState([]);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJenjang, setSelectedJenjang] = useState("");
  const [selectedKelas, setSelectedKelas] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const PAGE_SIZE = 50;
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);
  const [availableJenjang, setAvailableJenjang] = useState([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const [currentUser, setCurrentUser] = useState(null);

  // Fetch user data dari database untuk dapetin teacher_id dan homeroom_class_id
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!userFromProps?.id) {
        setCurrentUser(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, role, teacher_id, homeroom_class_id")
          .eq("id", userFromProps.id)
          .single();

        if (error) {
          console.error("Error fetching user details:", error);
          setCurrentUser(userFromProps);
          return;
        }

        setCurrentUser(data);
      } catch (error) {
        console.error("Error in fetchUserDetails:", error);
        setCurrentUser(userFromProps);
      }
    };

    fetchUserDetails();
  }, [userFromProps]);

  const canEditDelete = useMemo(() => {
    // Data siswa terpusat di Admin/TU — wali kelas hanya bisa lihat (read-only),
    // gak lagi punya hak edit/hapus manual di halaman ini.
    if (!currentUser) return false;
    return currentUser?.role === "admin";
  }, [currentUser]);

  const canEditDeleteMemo = canEditDelete;

  // Dipakai khusus buat tampilan info/statistik kelas wali kelas (bukan permission edit).
  const isHomeroomTeacher = useMemo(
    () => currentUser?.role === "teacher" && !!currentUser?.homeroom_class_id,
    [currentUser]
  );

  // ===== Deep-link dua arah ke/dari halaman "Data Siswa Induk" =====
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const appliedDeepLinkRef = useRef(false);

  // Kalau dibuka lewat link balik dari Data Siswa Induk (?search=<nis>),
  // otomatis isi kotak pencarian biar siswa yang dimaksud langsung ketemu
  // tanpa TU harus ngetik ulang. Cuma sekali jalan per kunjungan halaman.
  useEffect(() => {
    if (appliedDeepLinkRef.current) return;
    const searchFromUrl = searchParams.get("search");
    if (searchFromUrl) {
      setSearchTerm(searchFromUrl);
      appliedDeepLinkRef.current = true;
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleOpenDataInduk = (siswa) => {
    navigate(`/data-induk-siswa?student=${siswa.id}`);
  };

  // CRUD siswa (edit, tandai keluar/pindah) sekarang dipusatkan di
  // Settings -> Manajemen Sekolah -> Data Sekolah -> Data Siswa. Halaman
  // ini murni read-only buat semua role, tombol ini cuma nganterin ke
  // riwayat mutasi siswa yang bersangkutan (tab "Riwayat Mutasi").
  const handleOpenRiwayat = (siswa) => {
    navigate(`/settings?tab=school&schooltab=mutasi&student=${siswa.id}`);
  };

  // Fetch students dan kelas options saat component mount
  useEffect(() => {
    fetchStudents();
    fetchKelasOptions();
  }, []);

  // Fetch teacher assignments setelah currentUser ready
  useEffect(() => {
    if (currentUser) {
      fetchTeacherAssignments();
    }
  }, [currentUser]);

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from("students")
        .select("*")
        .eq("is_active", true)
        .order("full_name", { ascending: true })
        .order("class_id", { ascending: true });

      const { data, error } = await query;
      if (error) throw error;

      // Narik data student_profile_details buat dihitung status
      // kelengkapannya (badge kolom "Kelengkapan"). Cuma select
      // student_id + REQUIRED_FIELDS -- gak perlu semua kolom karena di
      // sini cuma butuh status-nya, bukan detail lengkapnya (detail
      // lengkap tetep di halaman Data Siswa Induk).
      const { data: details, error: detailErr } = await supabase
        .from("student_profile_details")
        .select(["student_id", ...REQUIRED_FIELDS].join(","));
      if (detailErr) throw detailErr;

      const detailMap = {};
      (details || []).forEach((d) => {
        detailMap[d.student_id] = d;
      });

      const merged = (data || []).map((s) => {
        const { status } = resolveCompletion(s.gender, detailMap[s.id] || null);
        return { ...s, completionStatus: status };
      });

      setAllSiswaData(merged);
    } catch (error) {
      console.error("Error fetching siswa data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchKelasOptions = async () => {
    try {
      const { data, error } = await supabase
        .from("classes")
        .select("id")
        .order("id", { ascending: true });

      if (error) throw error;
      setAllKelasOptions(data.map((item) => item.id) || []);
    } catch (error) {
      console.error("Error fetching kelas options:", error);
    }
  };

  const fetchTeacherAssignments = async () => {
    try {
      if (!currentUser) {
        setTeacherClasses([]);
        return;
      }

      if (currentUser.role === "admin") {
        setTeacherClasses([]);
        return;
      }

      if (!currentUser.teacher_id) {
        setTeacherClasses([]);
        return;
      }

      // Step 1: Ambil academic year yang aktif (via service - udah nanganin
      // kasus 2 tahun ajaran ke-mark aktif bersamaan, auto-fix ke yang paling
      // baru, jadi gak perlu Try 1/Try 2 manual lagi di sini)
      const activeYear = await getActiveAcademicYear();

      if (!activeYear) {
        setTeacherClasses([]);
        return;
      }

      // Step 2: Ambil assignments berdasarkan teacher_id dan academic_year_id yang aktif
      const { data: assignments, error: assignError } = await supabase
        .from("teacher_assignments")
        .select("*")
        .eq("teacher_id", currentUser.teacher_id)
        .eq("academic_year_id", activeYear.activeSemesterId);

      if (assignError) {
        console.error("Error fetching assignments:", assignError);
        setTeacherClasses([]);
        return;
      }

      if (!assignments || assignments.length === 0) {
        setTeacherClasses([]);
        return;
      }

      const classIds = [...new Set(assignments.map((a) => a.class_id))].filter(Boolean).sort();

      setTeacherClasses(classIds);
    } catch (error) {
      console.error("CATCH Error in fetchTeacherAssignments:", error);
      setTeacherClasses([]);
    }
  };

  useEffect(() => {
    if (teacherClasses.length > 0) {
      const filteredSiswa = allSiswaData.filter((siswa) => teacherClasses.includes(siswa.class_id));
      setSiswaData(filteredSiswa);

      const filteredKelas = allKelasOptions.filter((kelas) => teacherClasses.includes(kelas));
      setKelasOptions(filteredKelas);

      const jenjangSet = new Set(
        filteredKelas.map((kelas) => kelas?.charAt(0)).filter((j) => ["7", "8", "9"].includes(j))
      );
      setAvailableJenjang(Array.from(jenjangSet).sort());
    } else {
      // Admin atau teacherClasses kosong -- tampilkan semua data
      setSiswaData(allSiswaData);
      setKelasOptions(allKelasOptions);

      const jenjangSet = new Set(
        allKelasOptions.map((kelas) => kelas?.charAt(0)).filter((j) => ["7", "8", "9"].includes(j))
      );
      setAvailableJenjang(Array.from(jenjangSet).sort());
    }
  }, [teacherClasses, allSiswaData, allKelasOptions]);

  const handleExportAll = async () => {
    setExportLoading(true);
    try {
      await DataExcel.exportAllStudents(siswaData);
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setExportLoading(false);
      setShowExportModal(false);
    }
  };

  const handleExportByJenjang = async (jenjang) => {
    setExportLoading(true);
    try {
      await DataExcel.exportByJenjang(siswaData, jenjang);
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setExportLoading(false);
      setShowExportModal(false);
    }
  };

  const handleExportByKelas = async (kelas) => {
    setExportLoading(true);
    try {
      await DataExcel.exportByKelas(siswaData, kelas);
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setExportLoading(false);
      setShowExportModal(false);
    }
  };

  const handleExportByFilter = async () => {
    setExportLoading(true);
    try {
      await DataExcel.exportByFilter(filteredData, selectedKelas, selectedJenjang, selectedGender);
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setExportLoading(false);
      setShowExportModal(false);
    }
  };

  const filteredKelasOptions = useMemo(() => {
    return selectedJenjang
      ? kelasOptions.filter((kelas) => kelas.startsWith(selectedJenjang))
      : kelasOptions;
  }, [selectedJenjang, kelasOptions]);

  // Kalau belum ada pencarian/filter sama sekali, tampilkan SEMUA siswa
  // (nanti dipotong ke PAGE_SIZE pertama lewat visibleData + tombol "Muat Lebih Banyak").
  // Kalau ada pencarian dan/atau filter Jenjang/Kelas/Gender, itu dipakai buat mempersempit hasil.
  const hasSearch = searchTerm.trim().length > 0;
  const isDefaultView = !hasSearch && !selectedJenjang && !selectedKelas && !selectedGender;

  const filteredData = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return siswaData.filter((siswa) => {
      const matchesSearch = hasSearch
        ? siswa.full_name?.toLowerCase().includes(keyword) ||
          siswa.nis?.toString().toLowerCase().includes(keyword)
        : true;
      const matchesJenjang = selectedJenjang ? siswa.class_id?.startsWith(selectedJenjang) : true;
      const matchesKelas = selectedKelas ? siswa.class_id === selectedKelas : true;
      const matchesGender = selectedGender ? siswa.gender === selectedGender : true;

      return matchesSearch && matchesJenjang && matchesKelas && matchesGender;
    });
  }, [siswaData, searchTerm, selectedJenjang, selectedKelas, selectedGender, hasSearch]);

  // Amber prompt cuma dipakai kalau memang belum ada data sama sekali yang berhasil di-fetch
  const showEmptyPrompt = !isLoading && siswaData.length === 0;

  // Reset batas tampilan ke PAGE_SIZE lagi tiap kali pencarian/filter berubah
  useEffect(() => {
    setDisplayLimit(PAGE_SIZE);
  }, [searchTerm, selectedJenjang, selectedKelas, selectedGender]);

  // Data yang benar-benar dirender ke layar (dibatasi PAGE_SIZE per halaman)
  const visibleData = useMemo(
    () => filteredData.slice(0, displayLimit),
    [filteredData, displayLimit]
  );
  const hasMore = filteredData.length > visibleData.length;

  const handleJenjangChange = (e) => {
    setSelectedJenjang(e.target.value);
    setSelectedKelas("");
  };

  // ------------------------------------------------------------------
  // Modal Export -- pakai darkMode prop yang sama kayak sisa halaman
  // ------------------------------------------------------------------
  const ExportModal = React.memo(() => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className={`rounded-xl shadow-xl w-full max-w-md border ${
          darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        }`}
      >
        <div
          className={`px-6 py-5 rounded-t-xl bg-gradient-to-r ${
            darkMode ? "from-blue-800 to-blue-900" : "from-blue-600 to-blue-700"
          }`}
        >
          <h2 className="text-xl font-bold text-white text-center flex items-center justify-center gap-2">
            <FileSpreadsheet size={20} /> Export Data Siswa
          </h2>
          <p className={`text-center text-sm mt-1 ${darkMode ? "text-blue-200" : "text-blue-100"}`}>
            Pilih jenis export yang diinginkan
          </p>
        </div>

        <div className="p-6 space-y-4">
          <button
            onClick={handleExportAll}
            disabled={exportLoading || siswaData.length === 0}
            className={`w-full p-4 rounded-lg border-2 transition-all flex items-center justify-between min-h-[70px] ${
              exportLoading || siswaData.length === 0
                ? darkMode
                  ? "bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed"
                  : "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
                : darkMode
                  ? "bg-blue-900/30 border-blue-700 text-blue-300 hover:bg-blue-900/50 hover:border-blue-600"
                  : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300"
            }`}
          >
            <div className="text-left">
              <div className="font-semibold">Export Semua Data</div>
              <div className="text-sm opacity-75">{siswaData.length} siswa (kelas saya)</div>
            </div>
            <FileSpreadsheet size={24} />
          </button>

          <button
            onClick={handleExportByFilter}
            disabled={exportLoading || filteredData.length === 0}
            className={`w-full p-4 rounded-lg border-2 transition-all flex items-center justify-between min-h-[70px] ${
              exportLoading || filteredData.length === 0
                ? darkMode
                  ? "bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed"
                  : "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
                : darkMode
                  ? "bg-blue-900/30 border-blue-700 text-blue-300 hover:bg-blue-900/50 hover:border-blue-600"
                  : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300"
            }`}
          >
            <div className="text-left">
              <div className="font-semibold">Export Hasil Filter</div>
              <div className="text-sm opacity-75">
                {filteredData.length} siswa
                {(selectedJenjang || selectedKelas || selectedGender) &&
                  ` • ${selectedJenjang ? `Kelas ${selectedJenjang}` : ""} ${
                    selectedKelas ? selectedKelas : ""
                  } ${
                    selectedGender ? `• ${selectedGender === "L" ? "Laki-laki" : "Perempuan"}` : ""
                  }`}
              </div>
            </div>
            <Target size={24} />
          </button>

          {availableJenjang.length > 0 && (
            <div className="space-y-3">
              <Text darkMode={darkMode} className="font-semibold">
                Export Per Jenjang:
              </Text>
              <div className="grid grid-cols-3 gap-2">
                {availableJenjang.map((jenjang) => {
                  const count = siswaData.filter((s) => s.class_id?.startsWith(jenjang)).length;
                  return (
                    <button
                      key={jenjang}
                      onClick={() => handleExportByJenjang(jenjang)}
                      disabled={exportLoading || count === 0}
                      className={`p-3 rounded-lg border transition-all ${
                        exportLoading || count === 0
                          ? darkMode
                            ? "bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed"
                            : "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
                          : darkMode
                            ? "bg-blue-900/30 border-blue-700 text-blue-300 hover:bg-blue-900/50 hover:border-blue-600"
                            : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300"
                      }`}
                    >
                      <div className="font-semibold text-sm">Kelas {jenjang}</div>
                      <div className="text-xs opacity-75">{count} siswa</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Text darkMode={darkMode} className="font-semibold">
              Export Per Kelas:
            </Text>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
              {kelasOptions.map((kelas) => {
                const count = siswaData.filter((s) => s.class_id === kelas).length;
                return (
                  <button
                    key={kelas}
                    onClick={() => handleExportByKelas(kelas)}
                    disabled={exportLoading || count === 0}
                    className={`p-3 rounded-lg border transition-all text-left ${
                      exportLoading || count === 0
                        ? darkMode
                          ? "bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed"
                          : "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
                        : darkMode
                          ? "bg-blue-900/30 border-blue-700 text-blue-300 hover:bg-blue-900/50 hover:border-blue-600"
                          : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300"
                    }`}
                  >
                    <div className="font-semibold text-sm">{kelas}</div>
                    <div className="text-xs opacity-75">{count} siswa</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div
          className={`border-t p-4 flex justify-end ${darkMode ? "border-gray-700" : "border-gray-200"}`}
        >
          <button
            onClick={() => setShowExportModal(false)}
            disabled={exportLoading}
            className={`px-4 py-2 font-medium disabled:opacity-50 min-h-[44px] ${
              darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-800"
            }`}
          >
            {exportLoading ? "Mengexport..." : "Tutup"}
          </button>
        </div>
      </div>
    </div>
  ));

  if (isLoading) {
    return (
      <PageContainer darkMode={darkMode}>
        <div>
          <PageTitle darkMode={darkMode}>Data Siswa</PageTitle>
          <Subtitle darkMode={darkMode}>Memuat data siswa...</Subtitle>
        </div>
        <div className="flex justify-center items-center h-48 sm:h-64">
          <div
            className={`animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 ${
              darkMode ? "border-blue-400" : "border-blue-600"
            }`}
          />
        </div>
      </PageContainer>
    );
  }

  // Config warna stat card -- dipisah dari JSX biar 8 warna (indigo/emerald/
  // blue/rose buat wali kelas, indigo/emerald/amber/violet/cyan buat admin)
  // gak perlu nulis ternary darkMode berulang di tiap card.
  const statColor = (name) => {
    const map = {
      indigo: {
        bg: "bg-indigo-50",
        bgDark: "bg-indigo-900/20",
        border: "border-indigo-100",
        borderDark: "border-indigo-800",
        iconBg: "bg-indigo-100",
        iconBgDark: "bg-indigo-900/40",
        icon: "text-indigo-600",
        iconDark: "text-indigo-300",
        label: "text-indigo-800/70",
        labelDark: "text-indigo-300/70",
        value: "text-indigo-700",
        valueDark: "text-indigo-300",
      },
      emerald: {
        bg: "bg-emerald-50",
        bgDark: "bg-emerald-900/20",
        border: "border-emerald-100",
        borderDark: "border-emerald-800",
        iconBg: "bg-emerald-100",
        iconBgDark: "bg-emerald-900/40",
        icon: "text-emerald-600",
        iconDark: "text-emerald-300",
        label: "text-emerald-800/70",
        labelDark: "text-emerald-300/70",
        value: "text-emerald-700",
        valueDark: "text-emerald-300",
      },
      blue: {
        bg: "bg-blue-50",
        bgDark: "bg-blue-900/20",
        border: "border-blue-100",
        borderDark: "border-blue-800",
        iconBg: "bg-blue-100",
        iconBgDark: "bg-blue-900/40",
        icon: "text-blue-600",
        iconDark: "text-blue-300",
        label: "text-blue-800/70",
        labelDark: "text-blue-300/70",
        value: "text-blue-700",
        valueDark: "text-blue-300",
      },
      rose: {
        bg: "bg-rose-50",
        bgDark: "bg-rose-900/20",
        border: "border-rose-100",
        borderDark: "border-rose-800",
        iconBg: "bg-rose-100",
        iconBgDark: "bg-rose-900/40",
        icon: "text-rose-600",
        iconDark: "text-rose-300",
        label: "text-rose-800/70",
        labelDark: "text-rose-300/70",
        value: "text-rose-700",
        valueDark: "text-rose-300",
      },
      amber: {
        bg: "bg-amber-50",
        bgDark: "bg-amber-900/20",
        border: "border-amber-100",
        borderDark: "border-amber-800",
        label: "text-amber-800/70",
        labelDark: "text-amber-300/70",
        value: "text-amber-700",
        valueDark: "text-amber-300",
      },
      violet: {
        bg: "bg-violet-50",
        bgDark: "bg-violet-900/20",
        border: "border-violet-100",
        borderDark: "border-violet-800",
        label: "text-violet-800/70",
        labelDark: "text-violet-300/70",
        value: "text-violet-700",
        valueDark: "text-violet-300",
      },
      cyan: {
        bg: "bg-cyan-50",
        bgDark: "bg-cyan-900/20",
        border: "border-cyan-100",
        borderDark: "border-cyan-800",
        label: "text-cyan-800/70",
        labelDark: "text-cyan-300/70",
        value: "text-cyan-700",
        valueDark: "text-cyan-300",
      },
    };
    return map[name];
  };

  return (
    <PageContainer darkMode={darkMode}>
      {showExportModal && <ExportModal />}

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <PageTitle darkMode={darkMode}>Data Siswa</PageTitle>
          <Subtitle darkMode={darkMode}>Manajemen Data Siswa SMP Muslimin Cililin</Subtitle>
        </div>
        <div className={`p-3 rounded-xl ${darkMode ? "bg-blue-900/30" : "bg-blue-100"}`}>
          <Users className={darkMode ? "text-blue-400" : "text-blue-600"} size={28} />
        </div>
      </div>

      {/* Banner mode Wali Kelas (read-only) */}
      {isHomeroomTeacher && (
        <div
          className={`p-4 rounded-xl border bg-gradient-to-r ${
            darkMode
              ? "from-blue-900/20 to-blue-800/20 border-blue-700"
              : "from-blue-50 to-blue-100 border-blue-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                darkMode ? "bg-blue-700" : "bg-blue-600"
              }`}
            >
              <Eye className="text-white" size={20} />
            </div>
            <div>
              <p className={`text-sm font-bold ${darkMode ? "text-blue-300" : "text-blue-800"}`}>
                Mode Wali Kelas (Lihat Saja)
              </p>
              <p className={`text-xs ${darkMode ? "text-blue-400" : "text-blue-700"}`}>
                Anda dapat memantau data siswa di kelas {currentUser?.homeroom_class_id}. Untuk
                perubahan data siswa, silakan hubungi Admin/TU.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Banner mode Admin */}
      {canEditDeleteMemo && currentUser?.role === "admin" && (
        <div
          className={`p-4 rounded-xl border bg-gradient-to-r ${
            darkMode
              ? "from-purple-900/20 to-purple-800/20 border-purple-700"
              : "from-purple-50 to-purple-100 border-purple-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                darkMode ? "bg-purple-700" : "bg-purple-600"
              }`}
            >
              <Eye className="text-white" size={20} />
            </div>
            <div>
              <p
                className={`text-sm font-bold ${darkMode ? "text-purple-300" : "text-purple-800"}`}
              >
                Mode Admin Aktif
              </p>
              <p className={`text-xs ${darkMode ? "text-purple-400" : "text-purple-700"}`}>
                Halaman ini khusus lihat data & rekap kelengkapan. Buat tambah/edit/tandai
                keluar-pindah siswa, buka Settings → Manajemen Sekolah → Data Sekolah.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats card — kasus 4 card (Wali Kelas) tetap grid 2x2 (2 kolom).
          Kasus lain (Admin/Guru BK, 2–5 card sesuai jumlah jenjang yang diampu) tetap 1 baris penuh. */}
      <div
        className="grid gap-2 sm:gap-4"
        style={{
          gridTemplateColumns: isHomeroomTeacher
            ? "repeat(2, minmax(0, 1fr))"
            : `repeat(${
                2 + ["7", "8", "9"].filter((j) => availableJenjang.includes(j)).length
              }, minmax(0, 1fr))`,
        }}
      >
        {isHomeroomTeacher ? (
          <>
            {[
              {
                color: "indigo",
                Icon: GraduationCap,
                label: "Kelas Anda",
                value: currentUser?.homeroom_class_id,
              },
              {
                color: "emerald",
                Icon: Users,
                label: "Total Siswa",
                value: siswaData.filter((s) => s.class_id === currentUser?.homeroom_class_id)
                  .length,
              },
              {
                color: "blue",
                Icon: User,
                label: "Laki-laki",
                value: siswaData.filter(
                  (s) => s.class_id === currentUser?.homeroom_class_id && s.gender === "L"
                ).length,
              },
              {
                color: "rose",
                Icon: UserCheck,
                label: "Perempuan",
                value: siswaData.filter(
                  (s) => s.class_id === currentUser?.homeroom_class_id && s.gender === "P"
                ).length,
              },
            ].map(({ color, Icon, label, value }) => {
              const c = statColor(color);
              return (
                <div
                  key={label}
                  className={`p-2 sm:p-4 rounded-xl border shadow-sm min-w-0 ${
                    darkMode ? `${c.bgDark} ${c.borderDark}` : `${c.bg} ${c.border}`
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 sm:mb-2 text-center sm:text-left">
                    <div
                      className={`p-1.5 sm:p-2 rounded-lg ${darkMode ? c.iconBgDark : c.iconBg}`}
                    >
                      <Icon className={darkMode ? c.iconDark : c.icon} size={16} />
                    </div>
                    <div className="min-w-0">
                      <div
                        className={`text-[10px] sm:text-xs font-semibold truncate ${darkMode ? c.labelDark : c.label}`}
                      >
                        {label}
                      </div>
                      <div
                        className={`text-sm sm:text-lg font-bold truncate ${darkMode ? c.valueDark : c.value}`}
                      >
                        {value}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <>
            {[
              { color: "indigo", label: "Total Kelas", value: kelasOptions.length, show: true },
              { color: "emerald", label: "Total Siswa", value: siswaData.length, show: true },
              {
                color: "amber",
                label: "Kelas 7",
                value: siswaData.filter((s) => s.class_id?.startsWith("7")).length,
                show: availableJenjang.includes("7"),
              },
              {
                color: "violet",
                label: "Kelas 8",
                value: siswaData.filter((s) => s.class_id?.startsWith("8")).length,
                show: availableJenjang.includes("8"),
              },
              {
                color: "cyan",
                label: "Kelas 9",
                value: siswaData.filter((s) => s.class_id?.startsWith("9")).length,
                show: availableJenjang.includes("9"),
              },
            ]
              .filter((s) => s.show)
              .map(({ color, label, value }) => {
                const c = statColor(color);
                return (
                  <div
                    key={label}
                    className={`p-2 sm:p-4 rounded-xl border shadow-sm min-w-0 text-center sm:text-left ${
                      darkMode ? `${c.bgDark} ${c.borderDark}` : `${c.bg} ${c.border}`
                    }`}
                  >
                    <div
                      className={`text-[10px] sm:text-xs font-semibold mb-0.5 sm:mb-1 truncate ${darkMode ? c.labelDark : c.label}`}
                    >
                      {label}
                    </div>
                    <div
                      className={`text-sm sm:text-xl font-bold truncate ${darkMode ? c.valueDark : c.value}`}
                    >
                      {value}
                    </div>
                  </div>
                );
              })}
          </>
        )}
      </div>

      {/* Filter bar */}
      <Card darkMode={darkMode}>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari siswa berdasarkan nama atau NIS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full p-3 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  darkMode
                    ? "border-gray-600 bg-gray-700 text-white"
                    : "border-gray-300 bg-white text-gray-900"
                }`}
              />
              <Search
                className={`absolute right-3 top-3.5 ${darkMode ? "text-gray-500" : "text-gray-400"}`}
                size={16}
              />
            </div>
          </div>

          <select
            value={selectedJenjang}
            onChange={handleJenjangChange}
            disabled={availableJenjang.length === 0}
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              darkMode
                ? `border-gray-600 text-white ${availableJenjang.length === 0 ? "bg-gray-800 cursor-not-allowed opacity-70" : "bg-gray-700 cursor-pointer"}`
                : `border-gray-300 text-gray-900 ${availableJenjang.length === 0 ? "bg-gray-100 cursor-not-allowed opacity-70" : "bg-white cursor-pointer"}`
            }`}
          >
            <option value="">Semua Jenjang</option>
            {availableJenjang.map((jenjang) => (
              <option key={jenjang} value={jenjang}>
                Kelas {jenjang}
              </option>
            ))}
          </select>

          <select
            value={selectedKelas}
            onChange={(e) => setSelectedKelas(e.target.value)}
            disabled={!selectedJenjang}
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              darkMode
                ? `border-gray-600 text-white ${!selectedJenjang ? "bg-gray-800 cursor-not-allowed opacity-70" : "bg-gray-700 cursor-pointer"}`
                : `border-gray-300 text-gray-900 ${!selectedJenjang ? "bg-gray-100 cursor-not-allowed opacity-70" : "bg-white cursor-pointer"}`
            }`}
          >
            <option value="">Semua Kelas</option>
            {filteredKelasOptions.map((kelas) => (
              <option key={kelas} value={kelas}>
                {kelas}
              </option>
            ))}
          </select>

          <select
            value={selectedGender}
            onChange={(e) => setSelectedGender(e.target.value)}
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              darkMode
                ? "border-gray-600 bg-gray-700 text-white"
                : "border-gray-300 bg-white text-gray-900"
            }`}
          >
            <option value="">Semua Gender</option>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>

          <button
            onClick={() => setShowExportModal(true)}
            disabled={siswaData.length === 0}
            className={`w-full p-3 rounded-lg font-semibold flex items-center justify-center gap-2 min-h-[44px] touch-manipulation ${
              siswaData.length === 0
                ? darkMode
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg"
            }`}
          >
            <FileSpreadsheet size={16} />
            <span>Export</span>
          </button>
        </div>
      </Card>

      {/* Info jumlah data */}
      {showEmptyPrompt ? (
        <div
          className={`p-3 rounded-lg border text-sm inline-flex items-center gap-2 ${
            darkMode ? "bg-amber-900/20 border-amber-800" : "bg-amber-50 border-amber-200"
          }`}
        >
          <span className={`font-medium ${darkMode ? "text-amber-300" : "text-amber-800"}`}>
            Belum ada data siswa aktif yang bisa ditampilkan.
          </span>
        </div>
      ) : (
        <div
          className={`p-3 rounded-lg border text-sm inline-block ${
            darkMode ? "bg-blue-900/30 border-blue-700" : "bg-blue-50 border-blue-100"
          }`}
        >
          <Text darkMode={darkMode} className="inline">
            Menampilkan{" "}
            <strong className={darkMode ? "text-blue-300" : "text-blue-700"}>
              {hasMore ? `${visibleData.length} dari ${filteredData.length}` : filteredData.length}{" "}
              Siswa
            </strong>
            {isDefaultView && " (semua kelas, belum difilter)"}
            {searchTerm && ` dengan kata kunci "${searchTerm}"`}
            {selectedKelas && ` Di Kelas ${selectedKelas}`}
            {selectedGender && ` ${selectedGender === "L" ? "Laki-laki" : "Perempuan"}`}
          </Text>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* Mobile (di bawah sm): daftar Card, satu siswa = satu Card
          ✅ FIX: disamain filosofinya sama card HP di Data Siswa Induk --
          gak perlu nampilin semua kolom (No., NISN, Jenis Kelamin) di
          list, cukup yang penting buat sekilas scan: Kelas, Nama, NIS,
          Status. Info lain (NISN, Jenis Kelamin) tetap bisa dicek lewat
          "Lihat Data Siswa Induk". Badge Kelengkapan + 2 tombol aksi yang
          sebelumnya masing-masing full-width (bikin card jadi panjang)
          sekarang digabung jadi 1 baris ringkas (icon button sejajar). */}
      <div className="sm:hidden space-y-3">
        {visibleData.length > 0 ? (
          visibleData.map((siswa) => (
            <Card key={siswa.id} darkMode={darkMode}>
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <Muted darkMode={darkMode} className="block mb-0.5 text-[11px]">
                    Kelas{" "}
                    <span className={`font-bold ${darkMode ? "text-blue-400" : "text-blue-600"}`}>
                      {siswa.class_id}
                    </span>
                  </Muted>
                  <p
                    className={`text-base font-bold truncate ${darkMode ? "text-white" : "text-gray-900"}`}
                  >
                    {siswa.full_name}
                  </p>
                  <p className={`text-xs mt-0.5 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    NIS: <span className="font-mono">{siswa.nis}</span>
                  </p>
                </div>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                    siswa.is_active
                      ? darkMode
                        ? "bg-green-900/30 text-green-300"
                        : "bg-green-100 text-green-800"
                      : darkMode
                        ? "bg-gray-700 text-gray-400"
                        : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {siswa.is_active ? "Aktif" : "Non-Aktif"}
                </span>
              </div>

              {canEditDelete && (
                <div
                  className={`mt-3 pt-3 border-t flex items-center justify-between gap-2 ${
                    darkMode ? "border-gray-700" : "border-gray-100"
                  }`}
                >
                  {(() => {
                    const meta =
                      COMPLETION_STATUS_META[siswa.completionStatus] ||
                      COMPLETION_STATUS_META.belum;
                    const Icon = COMPLETION_STATUS_ICON[siswa.completionStatus] || XCircle;
                    return (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.badge}`}
                      >
                        <Icon size={12} />
                        {meta.label}
                      </span>
                    );
                  })()}

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleOpenDataInduk(siswa)}
                      title="Lihat Data Siswa Induk"
                      className={`p-2.5 rounded-lg transition-colors touch-manipulation ${
                        darkMode
                          ? "bg-indigo-900/20 hover:bg-indigo-900/40 text-indigo-300"
                          : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700"
                      }`}
                    >
                      <ClipboardList size={16} />
                    </button>
                    <button
                      onClick={() => handleOpenRiwayat(siswa)}
                      title="Lihat Riwayat Mutasi"
                      className={`p-2.5 rounded-lg transition-colors touch-manipulation ${
                        darkMode
                          ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      }`}
                    >
                      <History size={16} />
                    </button>
                  </div>
                </div>
              )}
            </Card>
          ))
        ) : (
          <Card darkMode={darkMode}>
            <EmptyState darkMode={darkMode} showEmptyPrompt={showEmptyPrompt} />
          </Card>
        )}

        {hasMore && (
          <button
            onClick={() => setDisplayLimit(filteredData.length)}
            className={`w-full py-3 rounded-xl border border-dashed font-semibold text-sm min-h-[44px] touch-manipulation ${
              darkMode
                ? "border-blue-700 text-blue-300 bg-blue-900/10 hover:bg-blue-900/20"
                : "border-blue-300 text-blue-700 bg-blue-50/50 hover:bg-blue-50"
            }`}
          >
            Muat Semua ({filteredData.length - visibleData.length} sisanya)
          </button>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* Tablet & desktop (sm ke atas): tabel penuh di dalam Card */}
      {/* ---------------------------------------------------- */}
      <Card darkMode={darkMode} noPadding className="hidden sm:block overflow-hidden">
        <div className="overflow-x-auto">
          {visibleData.length > 0 ? (
            <table className="w-full">
              <thead
                className={`text-white bg-gradient-to-r ${darkMode ? "from-blue-800 to-blue-900" : "from-blue-600 to-blue-700"}`}
              >
                <tr>
                  <th className="px-4 py-3 text-center w-1/12 text-xs font-semibold uppercase tracking-wider">
                    No.
                  </th>
                  <th className="px-4 py-3 text-left w-2/12 text-xs font-semibold uppercase tracking-wider">
                    NIS
                  </th>
                  <th className="px-4 py-3 text-left w-2/12 text-xs font-semibold uppercase tracking-wider">
                    NISN
                  </th>
                  <th className="px-4 py-3 text-left w-3/12 text-xs font-semibold uppercase tracking-wider">
                    Nama
                  </th>
                  <th className="px-4 py-3 text-left w-1/12 text-xs font-semibold uppercase tracking-wider">
                    Kelas
                  </th>
                  <th className="px-4 py-3 text-left w-2/12 text-xs font-semibold uppercase tracking-wider">
                    Jenis Kelamin
                  </th>
                  <th className="px-4 py-3 text-center w-1/12 text-xs font-semibold uppercase tracking-wider">
                    Status
                  </th>
                  {canEditDelete && (
                    <>
                      <th className="px-4 py-3 text-center w-1/12 text-xs font-semibold uppercase tracking-wider">
                        Kelengkapan
                      </th>
                      <th className="px-4 py-3 text-center w-1/12 text-xs font-semibold uppercase tracking-wider">
                        Data Induk
                      </th>
                      <th className="px-4 py-3 text-center w-1/12 text-xs font-semibold uppercase tracking-wider">
                        Riwayat
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? "divide-gray-700" : "divide-gray-200"}`}>
                {visibleData.map((siswa, index) => (
                  <tr
                    key={siswa.id}
                    className={`transition-colors ${darkMode ? "hover:bg-gray-700/50" : "hover:bg-gray-50"}`}
                  >
                    <td
                      className={`px-4 py-3 text-center text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                    >
                      {index + 1}
                    </td>
                    <td
                      className={`px-4 py-3 font-mono text-sm ${darkMode ? "text-white" : "text-gray-900"}`}
                    >
                      {siswa.nis}
                    </td>
                    <td
                      className={`px-4 py-3 font-mono text-sm ${darkMode ? "text-white" : "text-gray-900"}`}
                    >
                      {siswa.nisn || (
                        <span
                          className={`italic font-sans ${darkMode ? "text-gray-500" : "text-gray-400"}`}
                        >
                          Belum ada
                        </span>
                      )}
                    </td>
                    <td
                      className={`px-4 py-3 font-medium text-sm ${darkMode ? "text-white" : "text-gray-900"}`}
                    >
                      {siswa.full_name}
                    </td>
                    <td
                      className={`px-4 py-3 font-semibold text-sm ${darkMode ? "text-white" : "text-gray-900"}`}
                    >
                      {siswa.class_id}
                    </td>
                    <td
                      className={`px-4 py-3 text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                    >
                      {siswa.gender === "L" ? "Laki-laki" : "Perempuan"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          siswa.is_active
                            ? darkMode
                              ? "bg-green-900/30 text-green-300"
                              : "bg-green-100 text-green-800"
                            : darkMode
                              ? "bg-gray-700 text-gray-400"
                              : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {siswa.is_active ? "Aktif" : "Non-Aktif"}
                      </span>
                    </td>
                    {canEditDelete && (
                      <>
                        <td className="px-4 py-3 text-center">
                          {(() => {
                            const meta =
                              COMPLETION_STATUS_META[siswa.completionStatus] ||
                              COMPLETION_STATUS_META.belum;
                            const Icon = COMPLETION_STATUS_ICON[siswa.completionStatus] || XCircle;
                            return (
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.badge}`}
                              >
                                <Icon size={12} />
                                {meta.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleOpenDataInduk(siswa)}
                            className={`p-2 rounded-lg transition-colors ${
                              darkMode
                                ? "text-indigo-400 hover:bg-indigo-900/30"
                                : "text-indigo-600 hover:bg-indigo-50"
                            }`}
                            title="Lihat Data Siswa Induk"
                          >
                            <ClipboardList size={18} />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleOpenRiwayat(siswa)}
                            className={`p-2 rounded-lg transition-colors ${
                              darkMode
                                ? "text-gray-300 hover:bg-gray-700"
                                : "text-gray-600 hover:bg-gray-100"
                            }`}
                            title="Lihat Riwayat Mutasi"
                          >
                            <History size={18} />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState darkMode={darkMode} showEmptyPrompt={showEmptyPrompt} />
          )}

          {hasMore && (
            <div className={`p-4 border-t ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
              <button
                onClick={() => setDisplayLimit(filteredData.length)}
                className={`w-full py-3 rounded-lg border border-dashed font-semibold text-sm ${
                  darkMode
                    ? "border-blue-700 text-blue-300 bg-blue-900/10 hover:bg-blue-900/20"
                    : "border-blue-300 text-blue-700 bg-blue-50/50 hover:bg-blue-50"
                }`}
              >
                Muat Semua ({filteredData.length - visibleData.length} sisanya)
              </button>
            </div>
          )}
        </div>
      </Card>
    </PageContainer>
  );
};

export default Students;
