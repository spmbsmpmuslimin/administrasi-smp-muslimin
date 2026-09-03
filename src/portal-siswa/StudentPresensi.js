// students/StudentPresensi.js
// Riwayat presensi siswa (read-only, punya sendiri doang — bukan buat absen).
import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "../supabaseClient";
import useStudentProfile from "./useStudentProfile";
import { formatDateShort, getStatusMeta } from "./StudentHelpers";
// Reuse langsung generator PDF yang dipake sisi guru, biar hasil export
// "persis" sama formatnya se-aplikasi (bukan duplikat logic jsPDF di sini).
import { exportStudentAttendancePDF } from "../pages/attendance/AttendancePDF";
import { Download, AlertTriangle, FileText, Sparkles, ThumbsUp, ChevronDown } from "lucide-react";

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

// Urutan bulan tahun ajaran: mulai Juli, berakhir Juni tahun berikutnya.
const ACADEMIC_MONTH_ORDER = [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6];

// Tingkatan notif motivasi kehadiran — dicek dari atas ke bawah (min
// tertinggi duluan), tier pertama yang lolos (rate >= min) yang dipake.
// 3 tier aja biar gampang di-scan sekilas (gak sekedar "aman vs bahaya",
// rentang tengah tetep diapresiasi + didorong naik lagi).
const ATTENDANCE_TIERS = [
  {
    min: 90,
    icon: Sparkles,
    className: "bg-green-50 dark:bg-green-950/30 border-green-200 text-green-700",
    message: (r) => (
      <>
        Kehadiran Kamu <strong>{r}%</strong> — Bagus Sekali ! Terus Jaga Konsistensinya 🌟
      </>
    ),
  },
  {
    min: 70,
    icon: ThumbsUp,
    className: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 text-blue-700",
    message: (r) => (
      <>
        Kehadiran Kamu <strong>{r}%</strong> — Sudah Cukup Baik ! Ayo Ditingkatkan Lagi Biar Makin
        Mantap 👍
      </>
    ),
  },
  {
    min: 0,
    icon: AlertTriangle,
    className: "bg-red-50 dark:bg-red-950/30 border-red-200 text-red-700",
    message: (r) => (
      <>
        Kehadiran Kamu Saat Ini <strong>{r}%</strong>, Masih Di Bawah Batas Minimal 70%. Kalau Terus
        Di Bawah 70%, Ini Bisa Berdampak Ke Masalah Akademik Ke Depannya. Yuk Lebih Rajin Masuk
        Kelas Mulai Sekarang Ya !
      </>
    ),
  },
];

// Tahun ajaran berjalan dihitung otomatis dari tanggal hari ini.
// Juli-Desember -> startYear = tahun berjalan.
// Januari-Juni  -> startYear = tahun berjalan - 1 (masih tahun ajaran lama).
function getCurrentAcademicYear() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const startYear = m >= 7 ? y : y - 1;
  return {
    startYear,
    endYear: startYear + 1,
    label: `${startYear}/${startYear + 1}`,
  };
}

// Daftar 12 bulan dalam satu tahun ajaran, lengkap sama tahun kalender &
// semester masing-masing (buat dipake di dropdown "Bulanan").
function getAcademicMonthOptions(startYear) {
  return ACADEMIC_MONTH_ORDER.map((m) => {
    const year = m >= 7 ? startYear : startYear + 1;
    const semester = m >= 7 ? 1 : 2;
    return { month: m, year, semester, label: `${MONTH_NAMES[m - 1]} ${year}` };
  });
}

export default function StudentPresensi() {
  const { student, loading: profileLoading, error: profileError } = useStudentProfile();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  // --- State panel export PDF ---
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [exportMode, setExportMode] = useState("bulanan"); // "bulanan" | "semester"

  // Riwayat Presensi langsung kebuka pas tab ini dibuka (nampilin 15
  // riwayat terbaru langsung) — tombol di bawah cuma buat nutup/expand.
  const [showHistory, setShowHistory] = useState(true);
  // Filter Riwayat: liat presensi per Bulan (dropdown) atau per Semester
  // (Ganjil/Genap). Defaultnya diisi belakangan pas defaultMonthIdx &
  // defaultSemester udah kehitung (lihat bawah).
  const [historyFilterMode, setHistoryFilterMode] = useState("bulan"); // "bulan" | "semester"

  const academicYear = useMemo(() => getCurrentAcademicYear(), []);
  const monthOptions = useMemo(
    () => getAcademicMonthOptions(academicYear.startYear),
    [academicYear]
  );

  // Default dropdown bulan: bulan berjalan kalau ada di tahun ajaran ini,
  // kalau nggak (harusnya selalu ada) fallback ke index 0.
  const defaultMonthIdx = useMemo(() => {
    const now = new Date();
    const idx = monthOptions.findIndex(
      (o) => o.month === now.getMonth() + 1 && o.year === now.getFullYear()
    );
    return idx >= 0 ? idx : 0;
  }, [monthOptions]);

  // Default semester: Ganjil kalau bulan berjalan Jul-Des, Genap kalau Jan-Jun.
  const defaultSemester = useMemo(() => {
    return new Date().getMonth() + 1 >= 7 ? 1 : 2;
  }, []);

  const [selectedMonthIdx, setSelectedMonthIdx] = useState(defaultMonthIdx);
  const [selectedSemester, setSelectedSemester] = useState(defaultSemester);

  // State filter buat section Riwayat (independen dari pilihan Export PDF
  // di atas, biar browsing riwayat gak ikut ubah pilihan export & sebaliknya)
  const [historyMonthIdx, setHistoryMonthIdx] = useState(defaultMonthIdx);
  const [historySemester, setHistorySemester] = useState(defaultSemester);

  // Riwayat yang ditampilin, difilter sesuai mode (Bulan/Semester) yang
  // dipilih. Parsing tanggal manual (bukan `new Date(h.date)`) buat hindarin
  // pergeseran hari gara-gara timezone UTC vs lokal.
  const filteredHistory = useMemo(() => {
    if (historyFilterMode === "bulan") {
      const opt = monthOptions[historyMonthIdx];
      if (!opt) return [];
      return history.filter((h) => {
        const [y, m] = (h.date || "").split("-").map(Number);
        return m === opt.month && y === opt.year;
      });
    }
    // mode "semester": kumpulin semua kombinasi bulan+tahun yang termasuk
    // semester terpilih, terus filter history yang match salah satunya.
    const monthsInSemester = monthOptions.filter((o) => o.semester === historySemester);
    return history.filter((h) => {
      const [y, m] = (h.date || "").split("-").map(Number);
      return monthsInSemester.some((o) => o.month === m && o.year === y);
    });
  }, [history, historyFilterMode, historyMonthIdx, historySemester, monthOptions]);

  // Ringkasan cepat per status
  const summary = useMemo(
    () =>
      history.reduce(
        (acc, h) => {
          const s = (h.status || "").toLowerCase();
          if (acc[s] !== undefined) acc[s] += 1;
          return acc;
        },
        { hadir: 0, sakit: 0, izin: 0, alpa: 0 }
      ),
    [history]
  );

  // Persentase kehadiran: cuma status "hadir" yang dihitung hadir,
  // selain itu (sakit/izin/alpa) dianggap tidak hadir.
  const attendanceRate = useMemo(() => {
    const total = summary.hadir + summary.sakit + summary.izin + summary.alpa;
    return total > 0 ? (summary.hadir / total) * 100 : null;
  }, [summary]);

  const attendanceTier = useMemo(
    () => (attendanceRate !== null ? ATTENDANCE_TIERS.find((t) => attendanceRate >= t.min) : null),
    [attendanceRate]
  );

  // Popup warning: muncul otomatis maksimal SEKALI PER HARI (bukan tiap
  // kali halaman ini dibuka/refresh) kalau kehadiran di bawah 70% — biar
  // gak berasa nge-gas kalau siswa buka halaman ini berkali-kali sehari.
  // Ditandain lewat localStorage, key-nya per siswa + per tanggal lokal.
  const [showLowAttendanceAlert, setShowLowAttendanceAlert] = useState(false);
  const alertShownRef = useRef(false);
  useEffect(() => {
    if (attendanceRate === null || attendanceRate >= 70 || alertShownRef.current) {
      return;
    }
    alertShownRef.current = true;

    // Pake tanggal lokal (WIB), konsisten sama pola todayStr di
    // StudentDashboard.js — biar "hari ini" gak ke-geser gara-gara UTC.
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(now.getDate()).padStart(2, "0")}`;
    const storageKey = `low_attendance_alert_${student?.id || "guest"}_${todayStr}`;

    try {
      if (!localStorage.getItem(storageKey)) {
        setShowLowAttendanceAlert(true);
        localStorage.setItem(storageKey, "1");
      }
    } catch (err) {
      // Kalau localStorage gak bisa diakses (mode private/incognito
      // strict dsb), fallback aman: tetep tampilin popup-nya sekali
      // daripada diem-diem gagal total.
      console.warn("[StudentPresensi] localStorage gak bisa diakses:", err);
      setShowLowAttendanceAlert(true);
    }
  }, [attendanceRate, student]);

  useEffect(() => {
    if (!student) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Filter type="harian" biar cuma ambil presensi harian, bukan
        // ikut kecampur row "mapel" (absensi Bahasa Inggris per kelas
        // yang juga tersimpan di tabel attendance yang sama).
        // Catatan: attendance.student_id itu FK ke students.id, BUKAN
        // users.id — jadi pake student.studentRecordId, bukan student.id.
        // Scope ke tahun ajaran berjalan (Juli startYear - Juni endYear),
        // bukan pake .limit(N) sembarangan — soalnya summary/attendanceRate/
        // popup kehadiran rendah semua dihitung dari `history` ini, jadi
        // harus data 1 tahun ajaran penuh biar akurat, gak kepotong.
        const rangeStart = `${academicYear.startYear}-07-01`;
        const rangeEnd = `${academicYear.endYear}-06-30`;
        const { data, error: err } = await supabase
          .from("attendances")
          .select("id, date, status")
          .eq("student_id", student.studentRecordId)
          .eq("type", "harian")
          .gte("date", rangeStart)
          .lte("date", rangeEnd)
          .order("date", { ascending: false });

        if (err) throw err;
        setHistory(data || []);
      } catch (err) {
        console.error("[StudentPresensi] Gagal ambil riwayat presensi:", err);
        setError("Gagal memuat riwayat presensi. Coba refresh halaman.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [student, academicYear]);

  if (profileLoading || (student && loading)) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (profileError === "NO_SESSION") {
    return (
      <div className="text-center py-20 text-sm text-theme-secondary">
        Sesi Tidka Ketemu. Silakan Login Ulang.
      </div>
    );
  }

  const handleExportPDF = async () => {
    if (!student) return;
    setExporting(true);
    setError(null);
    try {
      // Cari nama wali kelas: tabel "classes" gak punya kolom nama/wali
      // kelas sama sekali (cuma id, grade, academic_year, is_active).
      // Wali kelas itu row di tabel "users" dengan role="teacher" dan
      // homeroom_class_id = kelas siswa ini (student.homeroom_class_id).
      // Kalau query gagal atau gak ketemu, fallback ke "-" aja dan PDF
      // tetep kebuat (ga nge-block export).
      let teacherName = "-";
      try {
        const { data: teacherData } = await supabase
          .from("users")
          .select("full_name")
          .eq("homeroom_class_id", student.homeroom_class_id)
          .eq("role", "teacher")
          .maybeSingle();
        if (teacherData?.full_name) {
          teacherName = teacherData.full_name;
        }
      } catch (teacherErr) {
        console.warn("[StudentPresensi] Gagal ambil nama wali kelas, pakai fallback:", teacherErr);
      }

      // student_id di tabel attendance FK ke students.id, bukan users.id —
      // jadi payload ke exportStudentAttendancePDF pake studentRecordId.
      const studentPayload = {
        id: student.studentRecordId,
        nis: student.nis,
        full_name: student.full_name,
      };

      const basePayload = {
        student: studentPayload,
        attendanceType: "harian",
        homeroomClass: student.kelas,
        academicYear: academicYear.label,
        teacherName,
      };

      let result;
      if (exportMode === "bulanan") {
        const opt = monthOptions[selectedMonthIdx];
        result = await exportStudentAttendancePDF({
          ...basePayload,
          mode: "bulanan",
          month: opt.month,
          year: opt.year,
          semester: opt.semester,
        });
      } else {
        const semYear = selectedSemester === 1 ? academicYear.startYear : academicYear.endYear;
        result = await exportStudentAttendancePDF({
          ...basePayload,
          mode: "semester",
          year: semYear,
          semester: selectedSemester,
        });
      }

      if (!result?.success) {
        setError(result?.message || "Gagal membuat PDF.");
      } else {
        setShowExportPanel(false);
      }
    } catch (err) {
      console.error("[StudentPresensi] Gagal export PDF:", err);
      setError("Gagal membuat PDF. Coba lagi ya.");
    } finally {
      setExporting(false);
    }
  };

  const summaryCards = [
    {
      key: "hadir",
      label: "Hadir",
      value: summary.hadir,
      color: getStatusMeta("hadir").color,
    },
    {
      key: "sakit",
      label: "Sakit",
      value: summary.sakit,
      color: getStatusMeta("sakit").color,
    },
    {
      key: "izin",
      label: "Izin",
      value: summary.izin,
      color: getStatusMeta("izin").color,
    },
    {
      key: "alpa",
      label: "Alpa",
      value: summary.alpa,
      color: getStatusMeta("alpa").color,
    },
  ];

  return (
    <>
      <h1 className="text-lg font-bold text-theme">Presensi Saya</h1>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          ⚠️ {error}
        </div>
      )}

      {attendanceTier && (
        <div
          className={`flex items-start gap-2 border px-4 py-3 rounded-xl text-sm ${attendanceTier.className}`}
        >
          <attendanceTier.icon size={18} className="flex-shrink-0 mt-0.5" />
          <span className="text-justify flex-1">
            {attendanceTier.message(attendanceRate.toFixed(1))}
          </span>
        </div>
      )}

      {/* Ringkasan */}
      <div className="space-y-2">
        <div className="grid grid-cols-4 gap-2">
          {summaryCards.map(({ key, label, value, color }) => (
            <div key={key} className={`rounded-xl border p-3 text-center ${color}`}>
              <p className="text-lg font-bold leading-none">{value}</p>
              <p className="text-[11px] font-medium mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div
            className={`rounded-xl border p-3 text-center ${
              attendanceTier
                ? attendanceTier.className
                : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 text-blue-700"
            }`}
          >
            <p className="text-lg font-bold leading-none">
              {attendanceRate !== null ? `${attendanceRate.toFixed(0)}%` : "-"}
            </p>
            <p className="text-[11px] font-medium mt-1">Kehadiran</p>
          </div>

          <button
            onClick={() => setShowExportPanel((v) => !v)}
            disabled={history.length === 0}
            className="rounded-xl border p-3 text-center bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 text-indigo-700 flex flex-col items-center justify-center gap-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} />
            <p className="text-[11px] font-semibold mt-0.5">Export PDF</p>
          </button>
        </div>
      </div>

      {/* Panel pilihan export PDF */}
      {showExportPanel && (
        <div className="bg-theme-bg rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-base font-bold text-theme">
            <FileText size={17} />
            Export Laporan Presensi
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setExportMode("bulanan")}
              className={`flex-1 text-sm font-semibold py-2.5 rounded-full border ${
                exportMode === "bulanan"
                  ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 text-blue-700"
                  : "bg-theme-surface border-theme text-theme-secondary"
              }`}
            >
              Bulanan
            </button>
            <button
              onClick={() => setExportMode("semester")}
              className={`flex-1 text-sm font-semibold py-2.5 rounded-full border ${
                exportMode === "semester"
                  ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 text-blue-700"
                  : "bg-theme-surface border-theme text-theme-secondary"
              }`}
            >
              Semester
            </button>
          </div>

          {exportMode === "bulanan" ? (
            <select
              value={selectedMonthIdx}
              onChange={(e) => setSelectedMonthIdx(Number(e.target.value))}
              className="w-full text-base text-theme font-medium border border-theme rounded-xl px-3 py-2.5 bg-theme-bg"
            >
              {monthOptions.map((opt, idx) => (
                <option key={idx} value={idx}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedSemester(1)}
                className={`flex-1 text-sm font-semibold py-2.5 rounded-full border ${
                  selectedSemester === 1
                    ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 text-blue-700"
                    : "bg-theme-surface border-theme text-theme-secondary"
                }`}
              >
                Ganjil ({academicYear.startYear})
              </button>
              <button
                onClick={() => setSelectedSemester(2)}
                className={`flex-1 text-sm font-semibold py-2.5 rounded-full border ${
                  selectedSemester === 2
                    ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 text-blue-700"
                    : "bg-theme-surface border-theme text-theme-secondary"
                }`}
              >
                Genap ({academicYear.endYear})
              </button>
            </div>
          )}

          <p className="text-sm text-theme-secondary font-medium text-center">
            Tahun Ajaran {academicYear.label}
          </p>

          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold px-3 py-3 rounded-full bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={15} />
            {exporting ? "Membuat PDF..." : "Export PDF"}
          </button>
        </div>
      )}

      {/* Riwayat */}
      <div>
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="w-full flex items-center justify-between text-base font-bold text-theme mb-2"
        >
          Riwayat Presensi
          <ChevronDown
            size={18}
            className={`text-gray-400 transition-transform ${showHistory ? "rotate-180" : ""}`}
          />
        </button>
        {showHistory && (
          <>
            {history.length === 0 ? (
              <div className="bg-theme-bg rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-sm shadow-sm">
                Belum Ada Data Presensi.
              </div>
            ) : (
              <div className="space-y-2">
                {/* Toggle mode filter: Bulan / Semester */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setHistoryFilterMode("bulan")}
                    className={`flex-1 text-sm font-semibold py-2.5 rounded-full border ${
                      historyFilterMode === "bulan"
                        ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 text-blue-700"
                        : "bg-theme-surface border-theme text-theme-secondary"
                    }`}
                  >
                    Bulan
                  </button>
                  <button
                    onClick={() => setHistoryFilterMode("semester")}
                    className={`flex-1 text-sm font-semibold py-2.5 rounded-full border ${
                      historyFilterMode === "semester"
                        ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 text-blue-700"
                        : "bg-theme-surface border-theme text-theme-secondary"
                    }`}
                  >
                    Semester
                  </button>
                </div>

                {historyFilterMode === "bulan" ? (
                  <select
                    value={historyMonthIdx}
                    onChange={(e) => setHistoryMonthIdx(Number(e.target.value))}
                    className="w-full text-base text-theme font-medium border border-theme rounded-xl px-3 py-2.5 bg-theme-bg"
                  >
                    {monthOptions.map((opt, idx) => (
                      <option key={idx} value={idx}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setHistorySemester(1)}
                      className={`flex-1 text-sm font-semibold py-2.5 rounded-full border ${
                        historySemester === 1
                          ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 text-blue-700"
                          : "bg-theme-surface border-theme text-theme-secondary"
                      }`}
                    >
                      Ganjil ({academicYear.startYear})
                    </button>
                    <button
                      onClick={() => setHistorySemester(2)}
                      className={`flex-1 text-sm font-semibold py-2.5 rounded-full border ${
                        historySemester === 2
                          ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 text-blue-700"
                          : "bg-theme-surface border-theme text-theme-secondary"
                      }`}
                    >
                      Genap ({academicYear.endYear})
                    </button>
                  </div>
                )}

                {/* List hasil filter */}
                {filteredHistory.length === 0 ? (
                  <div className="bg-theme-bg rounded-2xl border border-gray-100 p-6 text-center text-gray-400 text-sm shadow-sm">
                    Belum Ada Presensi Di Periode Ini.
                  </div>
                ) : (
                  filteredHistory.map((h) => {
                    const meta = getStatusMeta(h.status);
                    const Icon = meta.icon;
                    return (
                      <div
                        key={h.id}
                        className="bg-theme-bg rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center justify-between"
                      >
                        <span className="text-sm text-theme-secondary">
                          {formatDateShort(h.date)}
                        </span>
                        <span
                          className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${meta.color}`}
                        >
                          <Icon size={13} />
                          {meta.label}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ====== POPUP WARNING KEHADIRAN RENDAH ====== */}
      {showLowAttendanceAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-theme-bg rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
            <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={26} className="text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-theme mb-2">Yuk, Tingkatkan Kehadiranmu!</h3>
            <p className="text-sm text-theme-secondary leading-relaxed">
              Kehadiran Kamu Masih{" "}
              <strong className="text-red-600">{attendanceRate.toFixed(1)}%</strong> — Dibawah Batas
              Minimal 70%. Yuk Lebih Rajin Masuk Kelas Ya !
            </p>
            <button
              onClick={() => setShowLowAttendanceAlert(false)}
              className="w-full mt-5 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm transition-colors"
            >
              Mengerti, Aku Akan Lebih Rajin
            </button>
          </div>
        </div>
      )}
    </>
  );
}
