import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import useStudentProfile from "./useStudentProfile";
import { DAY_NAMES, getDayName, getStatusMeta, isOngoing } from "./StudentHelpers";
import { ANNOUNCEMENTS_TABLE } from "../constants";
import {
  Clock,
  CheckCircle,
  Bell,
  Users as UsersIcon,
  FileText,
  Stethoscope,
  XCircle,
} from "lucide-react";

// ========================================================================
// KONFIGURASI SCHEMA — SESUAIKAN DENGAN NAMA TABEL/KOLOM ASLI LO
// ========================================================================
// - tabel "attendances" (bukan "attendance"): kolom `class_id` (buat query absen 1 kelas sekaligus)
// - Piket: sumber datanya "duty_schedules" (bukan lagi "piket_schedule"
//   yang lama) - satu baris per kelas+tahun ajaran+semester, kolom
//   `layout` jsonb { "Senin": [student_id, ...], ... }. student_id di
//   sini FK ke students.id, BUKAN users.id - jadi cek "isMe" pake
//   student.studentRecordId. Samain kayak StudentPiket.js.
// - Header + navigasi sekarang dihandle StudentLayout.js (bukan lagi di
//   file ini) — komponen ini fokus ke konten aja.
// ========================================================================

// Ambang batas buat badge "Kehadiran Bagus" — 90% itu standar umum yang
// dipake sekolah buat kategori kehadiran baik (biasanya juga jadi syarat
// minimal terkait kenaikan kelas). Gampang diubah di sini kalau kebijakan
// sekolah beda.
const ATTENDANCE_GOOD_THRESHOLD = 90;

// Definisi 4 stat card kehadiran bulan ini. Kalau nilai status di database
// beda dari "Hadir"/"Izin"/"Sakit"/"Alpa" (case-sensitive, samain kayak
// yang dipake guru pas input presensi), sesuaikan key di sini.
const ATTENDANCE_STATS = [
  {
    key: "hadir",
    status: "Hadir",
    label: "Hadir",
    icon: CheckCircle,
    cardBgClass: "bg-emerald-50 dark:bg-emerald-950/30",
    cardBorderClass: "border-emerald-100",
    iconBgClass: "bg-emerald-100 dark:bg-emerald-900/30",
    iconColorClass: "text-emerald-600",
    valueColorClass: "text-emerald-700",
  },
  {
    key: "izin",
    status: "Izin",
    label: "Izin",
    icon: FileText,
    cardBgClass: "bg-amber-50 dark:bg-amber-950/30",
    cardBorderClass: "border-amber-100",
    iconBgClass: "bg-amber-100 dark:bg-amber-900/30",
    iconColorClass: "text-amber-600",
    valueColorClass: "text-amber-700",
  },
  {
    key: "sakit",
    status: "Sakit",
    label: "Sakit",
    icon: Stethoscope,
    cardBgClass: "bg-sky-50 dark:bg-sky-950/30",
    cardBorderClass: "border-sky-100",
    iconBgClass: "bg-sky-100 dark:bg-sky-900/30",
    iconColorClass: "text-sky-600",
    valueColorClass: "text-sky-700",
  },
  {
    key: "alpa",
    status: "Alpa",
    label: "Alpa",
    icon: XCircle,
    cardBgClass: "bg-rose-50 dark:bg-rose-950/30",
    cardBorderClass: "border-rose-100",
    iconBgClass: "bg-rose-100 dark:bg-rose-900/30",
    iconColorClass: "text-rose-600",
    valueColorClass: "text-rose-700",
  },
];

const getGreetingWord = () => {
  const h = new Date().getHours();
  if (h < 10) return "Selamat Pagi";
  if (h < 15) return "Selamat Siang";
  if (h < 18) return "Selamat Sore";
  return "Selamat Malam";
};

export default function StudentDashboard({ onPageChange }) {
  const { student, loading: profileLoading, error: profileError } = useStudentProfile();

  const [todayStatus, setTodayStatus] = useState(null);
  const [attendanceRate, setAttendanceRate] = useState(null); // persen hadir bulan ini, null kalau belum ada data
  const [attendanceCounts, setAttendanceCounts] = useState({
    hadir: 0,
    izin: 0,
    sakit: 0,
    alpa: 0,
  }); // breakdown jumlah per status bulan ini, buat stat card
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [piketToday, setPiketToday] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState(null);

  useEffect(() => {
    // Tunggu profil siswa siap dulu (dari useStudentProfile) sebelum ambil
    // data lain yang butuh homeroom_class_id / student.id
    if (!student) return;

    const loadData = async () => {
      setDataLoading(true);
      setDataError(null);

      try {
        const today = new Date();
        // Pake tanggal lokal (WIB), bukan today.toISOString() yang convert
        // ke UTC dulu — kalau dipake toISOString, jam 00:00-06:59 WIB bakal
        // ke-hitung tanggal kemarin (UTC+7).
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
          2,
          "0"
        )}-${String(today.getDate()).padStart(2, "0")}`;
        const todayName = getDayName(today);

        // Awal bulan berjalan, buat scope hitung persentase kehadiran
        // ("bulan ini" biar relevan sama kondisi terkini, bukan history
        // dari awal tahun ajaran yang query-nya lebih berat).
        const firstOfMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
          2,
          "0"
        )}-01`;

        const [
          { data: myAtt, error: myAttErr },
          { data: schedData, error: schedErr },
          { data: piketData, error: piketErr },
          { data: annData, error: annErr },
          { data: monthAttData, error: monthAttErr },
        ] = await Promise.all([
          // Presensi hari ini — status sendiri (khusus row "harian" /
          // bukan row "mapel" dari absensi Bahasa Inggris yang gak dipake
          // buat dashboard ini)
          // Catatan: attendance.student_id itu FK ke students.id, BUKAN
          // users.id — jadi pake student.studentRecordId, bukan student.id.
          supabase
            .from("attendances")
            .select("status")
            .eq("student_id", student.studentRecordId)
            .eq("date", todayStr)
            .eq("type", "harian")
            .maybeSingle(),

          // Jadwal hari ini doang (jadwal mingguan lengkap ada di menu Jadwal)
          // Catatan: tabel "jadwal" gak eksis, diganti "class_schedules"
          // (tabel baru, input manual, khusus jadwal per kelas — beda
          // dari "teacher_schedules" yang per-guru)
          supabase
            .from("class_schedules")
            .select("id, day, subject, start_time, end_time, teacher_name")
            .eq("class_id", student.homeroom_class_id)
            .eq("day", todayName)
            .order("start_time", { ascending: true }),

          // Piket hari ini
          // MIGRASI (Agustus 2026): dulu langsung SELECT dari "piket_schedule"
          // (siswa_id FK ke users.id). Sekarang sumber datanya "duty_schedules"
          // (satu baris per kelas+tahun ajaran+semester, layout jsonb
          // { "Senin": [student_id, ...], ... }, siswa_id di sini adalah
          // students.id) - samain persis kayak StudentPiket.js. Query-nya
          // 3 tahap (academic_years -> duty_schedules -> students), jadi
          // dibungkus IIFE async biar tetep jalan paralel di Promise.all.
          (async () => {
            try {
              const { data: activeYear, error: yearErr } = await supabase
                .from("academic_years")
                .select("year, semester")
                .eq("is_active", true)
                .single();
              if (yearErr) return { data: null, error: yearErr };

              const yearStr = activeYear.year;
              const semesterStr = Number(activeYear.semester) === 1 ? "ganjil" : "genap";

              const { data: chart, error: chartErr } = await supabase
                .from("duty_schedules")
                .select("layout")
                .eq("class_id", student.homeroom_class_id)
                .eq("academic_year", yearStr)
                .eq("semester", semesterStr)
                .maybeSingle();
              if (chartErr) return { data: null, error: chartErr };

              const todayIds = (chart?.layout?.[todayName] || []).filter(Boolean);
              if (todayIds.length === 0) return { data: [], error: null };

              const { data: studentRows, error: studentErr } = await supabase
                .from("students")
                .select("id, full_name")
                .in("id", todayIds);
              if (studentErr) return { data: null, error: studentErr };

              const namesById = Object.fromEntries(
                (studentRows || []).map((s) => [s.id, s.full_name])
              );
              const rows = todayIds.map((id) => ({
                siswa_id: id,
                full_name: namesById[id] || null,
              }));
              return { data: rows, error: null };
            } catch (err) {
              return { data: null, error: err };
            }
          })(),

          // Pengumuman terbaru (3 aja di dashboard, selebihnya di menu Lainnya)
          supabase
            .from(ANNOUNCEMENTS_TABLE)
            .select("id, title, content, created_at")
            .or(`target_class.eq.${student.homeroom_class_id},target_class.is.null`)
            .order("created_at", { ascending: false })
            .limit(3),

          // History presensi bulan ini (khusus row "harian", sama kayak
          // query todayStatus) — dipake buat itung persentase kehadiran.
          // Nilai status "Hadir" (H besar) — samain kayak Attendance.js.
          supabase
            .from("attendances")
            .select("status")
            .eq("student_id", student.studentRecordId)
            .eq("type", "harian")
            .gte("date", firstOfMonthStr)
            .lte("date", todayStr),
        ]);

        // Kumpulin semua error query (kalau ada) biar keliatan di UI,
        // bukan diem-diem nampilin data kosong kayak sebelumnya.
        const errors = [
          myAttErr && "presensi kamu",
          schedErr && "jadwal",
          piketErr && "piket",
          annErr && "pengumuman",
          monthAttErr && "riwayat kehadiran",
        ].filter(Boolean);

        if (errors.length > 0) {
          console.error("Dashboard query errors:", {
            myAttErr,
            schedErr,
            piketErr,
            annErr,
            monthAttErr,
          });
          setDataError(`Gagal memuat data: ${errors.join(", ")}.`);
        }

        setTodayStatus(myAtt?.status || null);
        setTodaySchedule(schedData || []);
        setPiketToday(piketData || []);
        setAnnouncements(annData || []);

        // CATATAN: nilai kolom `status` yang berarti "hadir" itu string
        // "Hadir" (H besar) — samain persis kayak yang dipake di
        // Attendance.js pas guru input presensi.
        if (monthAttData && monthAttData.length > 0) {
          const counts = { hadir: 0, izin: 0, sakit: 0, alpa: 0 };
          monthAttData.forEach((r) => {
            const found = ATTENDANCE_STATS.find((s) => s.status === r.status);
            if (found) counts[found.key] += 1;
          });
          setAttendanceCounts(counts);
          setAttendanceRate(Math.round((counts.hadir / monthAttData.length) * 100));
        } else {
          setAttendanceCounts({ hadir: 0, izin: 0, sakit: 0, alpa: 0 });
          setAttendanceRate(null);
        }
      } catch (err) {
        console.error("Error loading student dashboard:", err);
        setDataError("Gagal memuat data. Coba refresh halaman.");
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, [student]);

  // ========== RENDER ==========
  const loading = profileLoading || (student && dataLoading);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-theme-secondary text-sm">Memuat Dashboard...</p>
        </div>
      </div>
    );
  }

  if (profileError === "NO_SESSION") {
    return (
      <div className="flex items-center justify-center py-20 px-4">
        <div className="text-center max-w-sm">
          <p className="text-theme-secondary font-semibold mb-2">Sesi belum ditemukan</p>
          <p className="text-theme-secondary text-sm mb-6">
            Sesi login siswa gak ketemu atau udah gak valid. Klik tombol di bawah buat login ulang.
            (Ini gak otomatis reload — biar gak keloop.)
          </p>
          <button
            onClick={() => {
              window.location.href = "/";
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition"
          >
            Kembali ke Login
          </button>
        </div>
      </div>
    );
  }

  const statusMeta = getStatusMeta(todayStatus);
  const StatusIcon = statusMeta.icon;

  // Susun nama piket + tandain mana yang siswa yang lagi login (buat notice)
  // CATATAN: siswa_id di sini datang dari duty_schedules -> students.id,
  // jadi dibandingin ke student.studentRecordId (BUKAN student.id, yang
  // itu auth id dari users - beda konsep, sama kayak query attendances).
  const piketNames = piketToday
    .map((p) => ({
      siswaId: p.siswa_id,
      name: p.full_name,
      isMe: p.siswa_id === student?.studentRecordId,
    }))
    .filter((p) => p.name);
  const isSayaPiket = piketNames.some((p) => p.isMe);

  // Split 2 kolom: kolom 1 duluan diisi (4 orang), sisanya kolom 2 (3 orang,
  // atau 4-4 kalau totalnya 8 kayak hari Jumat) — otomatis ngikutin jumlah,
  // gak di-hardcode per hari.
  const piketHalf = Math.ceil(piketNames.length / 2);
  const piketCol1 = piketNames.slice(0, piketHalf);
  const piketCol2 = piketNames.slice(piketHalf);

  // Gabungin jam pelajaran yang beruntun & mapelnya sama jadi 1 blok
  // (misal jam ke-1 & ke-2 sama-sama Bahasa Inggris → jadi "2JP (1-2)").
  // Nomor jam pelajaran (period) diambil dari urutan array aja (index+1),
  // karena todaySchedule udah di-sort ascending by start_time dari query.
  const scheduleBlocks = [];
  todaySchedule.forEach((item, idx) => {
    const period = idx + 1;
    const prev = scheduleBlocks[scheduleBlocks.length - 1];
    const nyambung =
      prev &&
      prev.subject === item.subject &&
      prev.teacher_name === item.teacher_name &&
      prev.end_time === item.start_time;

    if (nyambung) {
      prev.end_time = item.end_time;
      prev.endPeriod = period;
      prev.jp += 1;
    } else {
      scheduleBlocks.push({
        id: item.id,
        subject: item.subject,
        teacher_name: item.teacher_name,
        start_time: item.start_time,
        end_time: item.end_time,
        startPeriod: period,
        endPeriod: period,
        jp: 1,
      });
    }
  });

  const timeToMinutes = (t) => {
    if (!t) return null;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const nowMinutes = (() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  })();

  return (
    <div className="space-y-4 lg:space-y-5">
      {" "}
      {dataError && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          ⚠️ {dataError}
        </div>
      )}
      {/* ====== GREETING ====== */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 border border-blue-100/70 dark:border-blue-900/40 shadow-sm p-5 lg:p-6">
        {/* Aksen bulat dekoratif, samar, di pojok — cuma vibe, gak ganggu konten */}
        <div className="pointer-events-none absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/40 blur-2xl"></div>
        <div className="pointer-events-none absolute -bottom-10 -left-6 w-24 h-24 rounded-full bg-purple-200/30 blur-2xl"></div>

        <div className="relative flex items-center gap-3.5">
          <div className="w-12 h-12 lg:w-14 lg:h-14 shrink-0 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 shadow-md shadow-blue-900/10 flex items-center justify-center">
            <span className="text-white font-bold text-lg lg:text-xl">
              {(student?.full_name?.[0] || "S").toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-indigo-500 uppercase tracking-wide">
              {getGreetingWord()}
            </p>
            <h2 className="text-base lg:text-xl font-bold text-theme truncate">
              {student?.full_name || "Siswa"} 👋
            </h2>
          </div>
        </div>
      </section>
      {/* ====== STATISTIK KEHADIRAN BULAN INI ====== */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <Clock size={14} className="text-indigo-500" />
          </div>
          <h2 className="text-base font-bold text-theme">Kehadiran Bulan Ini</h2>
        </div>

        {attendanceRate !== null && attendanceRate >= ATTENDANCE_GOOD_THRESHOLD && (
          <div className="flex items-center justify-center gap-2 bg-emerald-500/90 text-white text-sm font-semibold px-3.5 py-2 rounded-xl w-fit mx-auto mb-3">
            <span className="text-base leading-none">🌟</span>
            <span>Kehadiran Kamu Bulan Ini Bagus Sekali ({attendanceRate}%)</span>
          </div>
        )}
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {ATTENDANCE_STATS.map(
            ({
              key,
              label,
              icon: Icon,
              cardBgClass,
              cardBorderClass,
              iconBgClass,
              iconColorClass,
              valueColorClass,
            }) => (
              <div
                key={key}
                className={`rounded-2xl border p-2.5 sm:p-4 shadow-sm transition-shadow lg:hover:shadow-md flex flex-col items-center text-center ${cardBgClass} ${cardBorderClass}`}
              >
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 ${iconBgClass} rounded-xl flex items-center justify-center mb-1.5 sm:mb-2.5`}
                >
                  <Icon size={16} className={`sm:hidden ${iconColorClass}`} />
                  <Icon size={18} className={`hidden sm:block ${iconColorClass}`} />
                </div>
                <p className={`text-lg sm:text-2xl font-bold leading-tight ${valueColorClass}`}>
                  {attendanceCounts[key]}
                </p>
                <p className="text-sm sm:text-base text-theme-secondary mt-0.5">{label}</p>
              </div>
            )
          )}
        </div>
      </section>
      {/* ====== PRESENSI HARI INI ====== */}
      <section>
        <div className="bg-theme-bg rounded-3xl border border-gray-100 p-4 shadow-sm flex items-center justify-between transition-shadow lg:hover:shadow-md">
          <p className="text-sm font-semibold text-theme-secondary">Presensi Saya :</p>
          <div
            className={`flex items-center gap-1.5 text-base font-bold px-3 py-1.5 rounded-xl border ${statusMeta.color}`}
          >
            <StatusIcon size={18} />
            {statusMeta.label}
          </div>
        </div>
      </section>
      {/* ====== PIKET HARI INI ====== */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 shrink-0 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <UsersIcon size={14} className="text-orange-500" />
          </div>
          <h2 className="text-base font-bold text-theme">Piket Hari Ini</h2>
        </div>

        {piketNames.length === 0 ? (
          <div className="bg-theme-bg rounded-2xl border border-gray-100 p-6 text-center text-theme-secondary text-sm shadow-sm">
            🧹 Tidak Ada Jadwal Piket Hari Ini.
          </div>
        ) : (
          <div
            className={`rounded-2xl border p-4 shadow-sm transition-shadow lg:hover:shadow-md ${
              isSayaPiket
                ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200"
                : "bg-theme-bg border-gray-100"
            }`}
          >
            {/* Notice khusus kalau siswa yang login kebagian piket hari ini */}
            {isSayaPiket && (
              <div className="flex items-center gap-2 bg-blue-200 text-blue-800 text-sm font-semibold px-3 py-2.5 rounded-xl mb-3 border border-blue-200">
                <span className="text-base leading-none">🧹</span>
                <span>Kamu Kebagian Jadwal Piket Hari Ini, Jangan Lupa !</span>
              </div>
            )}

            {isSayaPiket ? (
              // Kalau kebagian piket: tampilin daftar 1 kelompok (2 kolom)
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                <div className="space-y-1.5">
                  {piketCol1.map((p) => (
                    <div
                      key={p.siswaId}
                      className={`text-sm sm:text-base px-2.5 py-1.5 rounded-lg truncate ${
                        p.isMe
                          ? "bg-blue-200 text-blue-800 font-semibold"
                          : "bg-theme-surface text-theme-secondary"
                      }`}
                    >
                      {p.isMe ? "👉 " : ""}
                      {p.name}
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  {piketCol2.map((p) => (
                    <div
                      key={p.siswaId}
                      className={`text-sm sm:text-base px-2.5 py-1.5 rounded-lg truncate ${
                        p.isMe
                          ? "bg-blue-200 text-blue-800 font-semibold"
                          : "bg-theme-surface text-theme-secondary"
                      }`}
                    >
                      {p.isMe ? "👉 " : ""}
                      {p.name}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Kalau bukan giliran dia: gak usah nampilin nama kelompok
              // lain, cukup notice simpel biar clean.
              <p className="text-sm text-theme-secondary text-center py-1">
                Tidak ada jadwal piket buat Anda hari ini
              </p>
            )}
          </div>
        )}
      </section>
      {/* ====== JADWAL HARI INI ====== */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-bold text-theme flex items-center gap-2">
            <div className="w-7 h-7 shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Clock size={14} className="text-blue-500" />
            </div>
            Jadwal Hari Ini
          </h2>
          <button
            onClick={() => onPageChange && onPageChange("student-jadwal")}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 active:scale-95 transition-transform"
          >
            Lihat Semua
          </button>
        </div>
        {scheduleBlocks.length === 0 ? (
          <div className="bg-theme-bg rounded-2xl border border-gray-100 p-6 text-center text-theme-secondary text-sm shadow-sm">
            🎉 Tidak Ada Jadwal Hari Ini.
          </div>
        ) : (
          <div className="space-y-2">
            {scheduleBlocks.map((block) => {
              const ongoing = isOngoing(block.start_time, block.end_time);
              const endMinutes = timeToMinutes(block.end_time);
              const statusLabel = ongoing
                ? "Berlangsung"
                : nowMinutes > endMinutes
                  ? "Selesai"
                  : "Akan Datang";
              const jpLabel =
                block.jp > 1
                  ? `${block.jp}JP (${block.startPeriod}-${block.endPeriod})`
                  : `${block.jp}JP (${block.startPeriod})`;

              return (
                <div
                  key={block.id}
                  className={`rounded-2xl border p-4 shadow-sm transition active:scale-[0.98] lg:hover:shadow-md lg:active:scale-100 ${
                    ongoing
                      ? "bg-blue-50 dark:bg-blue-950/30 border-blue-300"
                      : "bg-theme-bg border-gray-100"
                  }`}
                >
                  <span className="text-sm font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-full">
                    {jpLabel}
                  </span>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm font-medium text-theme">
                      {block.start_time?.slice(0, 5)} – {block.end_time?.slice(0, 5)}
                    </p>
                    <p
                      className={`text-sm font-semibold ${
                        ongoing
                          ? "text-blue-600"
                          : statusLabel === "Selesai"
                            ? "text-theme-secondary"
                            : "text-emerald-600"
                      }`}
                    >
                      {statusLabel}
                    </p>
                  </div>
                  <p className="font-bold text-theme uppercase mt-1">{block.subject}</p>
                  {block.teacher_name && (
                    <p className="text-sm text-theme-secondary mt-0.5">🧑‍🏫 {block.teacher_name}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
      {/* ====== PENGUMUMAN ====== */}
      {announcements.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-theme flex items-center gap-2">
              <div className="w-7 h-7 shrink-0 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Bell size={14} className="text-yellow-500" />
              </div>
              Pengumuman
            </h2>
            <button
              onClick={() => onPageChange && onPageChange("student-lainnya", "pengumuman")}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 active:scale-95 transition-transform"
            >
              Lihat Semua
            </button>
          </div>
          <div className="space-y-2">
            {announcements.map((item) => (
              <div
                key={item.id}
                className="bg-theme-bg rounded-2xl border border-gray-100 p-4 shadow-sm transition-shadow lg:hover:shadow-md"
              >
                <p className="font-semibold text-theme text-sm">{item.title}</p>
                <p className="text-sm text-gray-900 dark:text-gray-100 mt-1 text-justify">
                  {item.content}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
