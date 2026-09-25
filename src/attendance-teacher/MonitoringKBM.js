// src/attendance-teacher/MonitoringKBM.js
//
// Monitoring visual KBM per kelas, jam ke-1 s/d terakhir (JAM_SCHEDULE
// hari itu), berdasarkan PRESENSI HARIAN guru (teacher_attendance).
// Ditampilkan per JENJANG (blok Kelas 7 / 8 / 9, masing-masing bisa
// dilipat). Jam yang SEDANG berlangsung (hari ini, sesuai jam sekarang)
// ditandai khusus (mapel + guru + badge kedip "Sedang Berlangsung"),
// jam yang udah lewat ditandai "Selesai".
//
// ⚠️ CATATAN PENTING SOAL AKURASI (baca sebelum ubah-ubah logic ini):
// teacher_attendance itu SATU record per guru per HARI (Hadir/Izin/
// Sakit/Alpa), BUKAN per jam pelajaran/per kelas. Jadi status di tiap
// sel grid ini adalah PROXY: "guru yang njadwal di jam segini, hari
// ini presensinya gimana" -- bukan bukti dia beneran ada di kelas itu
// pas jam itu. "Sedang Berlangsung"/"Selesai" cuma bandingin JAM
// SEKARANG vs jadwal (period_schedules) -- BUKAN presensi per-jam yang
// beneran real-time juga. Kalau nanti mau itu, perlu tabel baru (mis.
// class_period_attendance) + alur input baru (guru piket/walikelas tap
// tiap pergantian jam) -- di luar scope komponen ini.
//
// Sumber data:
// - classes            : daftar kelas aktif (id, grade)
// - teacher_schedules   : jadwal guru per hari (teacher_id UUID, class_id,
//                         start_time, end_time) -- dipakai buat status
//                         kehadiran (join ke teacher_attendance).
// - class_schedules     : jadwal per kelas (class_id, day, start_time,
//                         end_time, subject, teacher_name text) -- dipakai
//                         CUMA buat nama MAPEL, karena teacher_schedules
//                         gak nyimpen subject.
// - teacher_attendance  : presensi harian (teacher_id KODE mis. "G-01",
//                         attendance_date, status)
// - users               : jembatan teacher_schedules.teacher_id (UUID)
//                         <-> teacher_attendance.teacher_id (kode guru)
//                         + full_name buat ditampilin
//
// Period (jam ke) dihitung dari (day, start_time, end_time) lewat
// periodsInRange() di bawah -- versi lokal yang HANDLE jadwal gabungan
// (mis. jam ke-1 & ke-2 disatuin jadi 1 baris "07:00-08:20"), beda dari
// findPeriod() bawaan useJamPelajaran() yang cuma match EXACT 1 period.

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  CalendarDays,
  RefreshCw,
  Info,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  UserRound,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { useJamPelajaran } from "../services/JamPelajaranProvider";

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const STATUS_STYLE = {
  Hadir: "bg-green-500 dark:bg-green-600 text-white",
  Izin: "bg-blue-500 dark:bg-blue-600 text-white",
  Sakit: "bg-yellow-500 dark:bg-yellow-600 text-white",
  Alpa: "bg-red-500 dark:bg-red-600 text-white",
  "Belum Presensi":
    "bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-700",
  Kosong: "bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600",
};

const STATUS_DOT = {
  Hadir: "bg-green-500",
  Izin: "bg-blue-500",
  Sakit: "bg-yellow-500",
  Alpa: "bg-red-500",
  "Belum Presensi": "bg-orange-400",
};

// Aksen warna per jenjang -- CUMA buat header blok/garis pembatas,
// sengaja beda dari palet status (hijau/biru/kuning/merah) di atas
// biar gak ketuker artinya.
const GRADE_ACCENT = {
  7: {
    bar: "bg-teal-500",
    badge: "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300",
    ring: "border-teal-200 dark:border-teal-800",
  },
  8: {
    bar: "bg-violet-500",
    badge: "bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300",
    ring: "border-violet-200 dark:border-violet-800",
  },
  9: {
    bar: "bg-rose-500",
    badge: "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300",
    ring: "border-rose-200 dark:border-rose-800",
  },
};
const DEFAULT_ACCENT = {
  bar: "bg-gray-400",
  badge: "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300",
  ring: "border-gray-200 dark:border-gray-700",
};

// yyyy-mm-dd di timezone Asia/Jakarta (biar konsisten sama pola dipakai
// di ManualCheckIn.js / TeacherAttendance.js)
function todayJakarta() {
  const j = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  const y = j.getFullYear();
  const m = String(j.getMonth() + 1).padStart(2, "0");
  const d = String(j.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// "HH:MM" jam sekarang di Asia/Jakarta
function nowHHMMJakarta() {
  return new Date().toLocaleTimeString("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function addDays(dateStr, delta) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// Versi lokal dari findPeriod() yang HANDLE jadwal gabungan: balikin
// SEMUA nomor period yang range-nya "masuk" ke dalam (start_time,
// end_time) baris jadwal -- bukan cuma yang persis exact match 1 period
// kayak findPeriod() bawaan useJamPelajaran(). Buat jadwal single-period
// biasa, hasilnya sama persis (cuma 1 nomor).
function periodsInRange(JAM_SCHEDULE, day, startTime, endTime) {
  const periods = JAM_SCHEDULE[day];
  if (!periods || !startTime || !endTime) return [];
  const s = startTime.slice(0, 5);
  const e = endTime.slice(0, 5);
  return Object.entries(periods)
    .filter(([, range]) => range?.start && range.start >= s && range.end <= e)
    .map(([num]) => num)
    .sort((a, b) => Number(a) - Number(b));
}

const MonitoringKBM = () => {
  const { JAM_SCHEDULE, getAvailablePeriods, loading: jamLoading } = useJamPelajaran();

  const [selectedDate, setSelectedDate] = useState(todayJakarta());
  const [classes, setClasses] = useState([]);
  const [cellMap, setCellMap] = useState({}); // { [classId]: { [period]: { name, status } } }
  const [subjectMap, setSubjectMap] = useState({}); // { [classId]: { [period]: subjectName } }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [collapsedGrades, setCollapsedGrades] = useState({}); // { [grade]: true } = dilipat
  const [clockTick, setClockTick] = useState(0); // dipicu tiap 30dtk, biar live/selesai kebaca ulang

  // ==== Cari Jadwal Guru ====
  const [teacherOptions, setTeacherOptions] = useState([]); // [{uuid, code, name}]
  const [teacherScheduleMap, setTeacherScheduleMap] = useState({}); // { [teacherUuid]: { [period]: { class_id } } }
  const [teacherStatusByUuid, setTeacherStatusByUuid] = useState({}); // { [teacherUuid]: status hari itu }
  const [teacherQuery, setTeacherQuery] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState(null); // {uuid, code, name}

  const dayName = useMemo(() => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    return DAY_NAMES[new Date(y, m - 1, d).getDay()];
  }, [selectedDate]);

  const periods = getAvailablePeriods(dayName); // jam ke-1..N buat hari ini
  const isToday = selectedDate === todayJakarta();

  // Jam sekarang, di-recompute tiap render -- dipicu ulang tiap 30dtk
  // lewat clockTick (lihat useEffect setInterval di bawah).
  const nowHHMM = isToday ? nowHHMMJakarta() : null;

  // Nomor period yang SEDANG berlangsung sekarang (kalau lagi liat hari ini)
  const currentPeriod = useMemo(() => {
    if (!isToday || !nowHHMM || !JAM_SCHEDULE[dayName]) return null;
    const found = periods.find((p) => {
      const range = JAM_SCHEDULE[dayName][p];
      return range?.start && nowHHMM >= range.start && nowHHMM < range.end;
    });
    return found || null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isToday, nowHHMM, JAM_SCHEDULE, dayName, periods, clockTick]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Hari Minggu/Sabtu: gak ada jadwal, gak usah query.
      if (!JAM_SCHEDULE[dayName]) {
        setClasses([]);
        setCellMap({});
        setSubjectMap({});
        setTeacherOptions([]);
        setTeacherScheduleMap({});
        setTeacherStatusByUuid({});
        return;
      }

      const [classesRes, schedulesRes, classSchedulesRes, attendanceRes, usersRes] =
        await Promise.all([
          supabase
            .from("classes")
            .select("id, grade")
            .eq("is_active", true)
            .order("grade")
            .order("id"),
          supabase
            .from("teacher_schedules")
            .select("teacher_id, class_id, start_time, end_time")
            .eq("day", dayName),
          supabase
            .from("class_schedules")
            .select("class_id, start_time, end_time, subject")
            .eq("day", dayName),
          supabase
            .from("teacher_attendance")
            .select("teacher_id, status")
            .eq("attendance_date", selectedDate),
          supabase
            .from("users")
            .select("id, teacher_id, full_name")
            .in("role", ["teacher", "guru_bk", "homeroom_teacher"])
            .eq("is_active", true),
        ]);

      if (classesRes.error) throw classesRes.error;
      if (schedulesRes.error) throw schedulesRes.error;
      if (classSchedulesRes.error) throw classSchedulesRes.error;
      if (attendanceRes.error) throw attendanceRes.error;
      if (usersRes.error) throw usersRes.error;

      setClasses(classesRes.data || []);

      // UUID (teacher_schedules.teacher_id) -> { code, name }
      const userByUuid = {};
      (usersRes.data || []).forEach((u) => {
        userByUuid[u.id] = { code: u.teacher_id, name: u.full_name };
      });

      // kode guru (mis. "G-01") -> status hari ini
      const statusByCode = {};
      (attendanceRes.data || []).forEach((a) => {
        statusByCode[a.teacher_id] = a.status;
      });

      // Susun grid presensi: { [class_id]: { [period]: { name, status } } }
      // -- 1 baris jadwal bisa kena LEBIH DARI 1 period kalau jam-nya
      // digabung (mis. jam ke-1 & ke-2 jadi satu blok pelajaran).
      const map = {};
      (schedulesRes.data || []).forEach((s) => {
        const matchedPeriods = periodsInRange(JAM_SCHEDULE, dayName, s.start_time, s.end_time);
        if (matchedPeriods.length === 0) return;

        const teacher = userByUuid[s.teacher_id];
        const name = teacher?.name || "?";
        const status = teacher ? statusByCode[teacher.code] || "Belum Presensi" : "Belum Presensi";

        matchedPeriods.forEach((period) => {
          if (!map[s.class_id]) map[s.class_id] = {};
          map[s.class_id][period] = { name, status };
        });
      });
      setCellMap(map);

      // Susun peta mapel: { [class_id]: { [period]: subjectName } }
      const subjMap = {};
      (classSchedulesRes.data || []).forEach((s) => {
        const matchedPeriods = periodsInRange(JAM_SCHEDULE, dayName, s.start_time, s.end_time);
        matchedPeriods.forEach((period) => {
          if (!subjMap[s.class_id]) subjMap[s.class_id] = {};
          subjMap[s.class_id][period] = s.subject;
        });
      });
      setSubjectMap(subjMap);

      // Susun opsi guru buat pencarian (dropdown/ketik nama), + status
      // presensi harian per guru, + jadwal ngajar per guru per period --
      // dipakai fitur "Cari Jadwal Guru" di bawah.
      const options = (usersRes.data || [])
        .map((u) => ({ uuid: u.id, code: u.teacher_id, name: u.full_name }))
        .sort((a, b) => (a.name || "").localeCompare(b.name || "", "id"));
      setTeacherOptions(options);

      const statusByUuid = {};
      (usersRes.data || []).forEach((u) => {
        statusByUuid[u.id] = statusByCode[u.teacher_id] || "Belum Presensi";
      });
      setTeacherStatusByUuid(statusByUuid);

      const teacherSched = {};
      (schedulesRes.data || []).forEach((s) => {
        const matchedPeriods = periodsInRange(JAM_SCHEDULE, dayName, s.start_time, s.end_time);
        matchedPeriods.forEach((period) => {
          if (!teacherSched[s.teacher_id]) teacherSched[s.teacher_id] = {};
          teacherSched[s.teacher_id][period] = { class_id: s.class_id };
        });
      });
      setTeacherScheduleMap(teacherSched);

      setLastRefresh(new Date());
    } catch (err) {
      setError("Gagal memuat data monitoring: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [dayName, selectedDate, JAM_SCHEDULE]);

  useEffect(() => {
    if (!jamLoading) fetchData();
  }, [jamLoading, fetchData]);

  // Detak tiap 30dtk cuma buat re-render (biar "sedang berlangsung" /
  // "selesai" ke-update sendiri tanpa user perlu refresh manual).
  useEffect(() => {
    const id = setInterval(() => setClockTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  // Kelompokkan kelas per jenjang: { "7": [...], "8": [...], "9": [...] }
  const gradeBlocks = useMemo(() => {
    const groups = {};
    classes.forEach((c) => {
      const g = String(c.grade);
      if (!groups[g]) groups[g] = [];
      groups[g].push(c);
    });
    return Object.keys(groups)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((g) => ({ grade: g, list: groups[g] }));
  }, [classes]);

  // Ringkasan status per blok jenjang, buat badge di header (sekilas
  // tau tanpa perlu buka blok/scroll ke kanan)
  const summaryFor = useCallback(
    (classList) => {
      const counts = { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0, "Belum Presensi": 0 };
      classList.forEach((c) => {
        const row = cellMap[c.id];
        if (!row) return;
        Object.values(row).forEach((cell) => {
          counts[cell.status] = (counts[cell.status] || 0) + 1;
        });
      });
      return counts;
    },
    [cellMap]
  );

  const toggleGrade = (grade) => setCollapsedGrades((prev) => ({ ...prev, [grade]: !prev[grade] }));

  // Status waktu 1 period, relatif ke jam sekarang -- cuma berlaku kalau
  // lagi liat hari ini. null = gak usah dikasih label (hari lain, atau
  // jam yang belum mulai).
  const periodTimeState = useCallback(
    (period) => {
      if (!isToday) return null;
      if (period === currentPeriod) return "live";
      const range = JAM_SCHEDULE[dayName]?.[period];
      if (range?.end && nowHHMM && range.end <= nowHHMM) return "done";
      return null; // belum mulai
    },
    [isToday, currentPeriod, JAM_SCHEDULE, dayName, nowHHMM]
  );

  // Saran nama guru buat autocomplete pencarian (maks 8, cuma muncul
  // kalau lagi ngetik & belum ada yang dipilih).
  const filteredTeacherOptions = useMemo(() => {
    const q = teacherQuery.trim().toLowerCase();
    if (!q) return [];
    return teacherOptions.filter((t) => (t.name || "").toLowerCase().includes(q)).slice(0, 8);
  }, [teacherQuery, teacherOptions]);

  // Jadwal guru yang lagi dipilih, dikelompokkan jam yang BERURUTAN &
  // sama kelas+mapel-nya jadi 1 baris (mis. "Jam 1-2 • Kelas 7B •
  // Bahasa Inggris") biar gak dobel-dobel per jam.
  const selectedTeacherSchedule = useMemo(() => {
    if (!selectedTeacher) return [];
    const raw = teacherScheduleMap[selectedTeacher.uuid] || {};
    const rows = periods
      .map((p) => {
        const entry = raw[p];
        if (!entry) return null;
        const subject = subjectMap[entry.class_id]?.[p] || null;
        return { period: Number(p), classId: entry.class_id, subject };
      })
      .filter(Boolean)
      .sort((a, b) => a.period - b.period);

    const grouped = [];
    rows.forEach((r) => {
      const last = grouped[grouped.length - 1];
      if (
        last &&
        last.classId === r.classId &&
        last.subject === r.subject &&
        r.period === last.endPeriod + 1
      ) {
        last.endPeriod = r.period;
      } else {
        grouped.push({
          startPeriod: r.period,
          endPeriod: r.period,
          classId: r.classId,
          subject: r.subject,
        });
      }
    });
    return grouped;
  }, [selectedTeacher, teacherScheduleMap, subjectMap, periods]);

  const isWeekend = !JAM_SCHEDULE[dayName];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-10">
        <div className="px-4 sm:px-6 py-4 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <CalendarDays className="text-blue-600 dark:text-blue-400" size={28} />
                Monitoring KBM Per Kelas
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Status kehadiran guru per kelas, jam ke-1 s/d terakhir
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedDate((d) => addDays(d, -1))}
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                aria-label="Hari sebelumnya"
              >
                <ChevronLeft size={18} />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-sm"
              />
              <button
                onClick={() => setSelectedDate((d) => addDays(d, 1))}
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                aria-label="Hari berikutnya"
              >
                <ChevronRight size={18} />
              </button>
              <button
                onClick={fetchData}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white text-sm font-medium disabled:opacity-60"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {dayName}, {selectedDate}
            {isToday && nowHHMM && ` • Sekarang jam ${nowHHMM}`}
            {lastRefresh && ` • Data diperbarui ${lastRefresh.toLocaleTimeString("id-ID")}`}
          </p>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 max-w-7xl mx-auto">
        {/* Disclaimer akurasi */}
        <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4 text-sm text-amber-800 dark:text-amber-300">
          <Info size={18} className="flex-shrink-0 mt-0.5" />
          <p>
            Status di bawah berdasarkan <strong>presensi harian</strong> guru (sekali check-in),
            bukan presensi per jam per kelas. "Sedang Berlangsung" / "Selesai" cuma ngebandingin jam
            sekarang sama jadwal -- guru yang sudah presensi "Hadir" pagi tetap tercatat Hadir di
            semua jamnya walau kenyataannya ada jam yang kosong.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Cari Jadwal Guru */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 mb-5">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-2">
            <Search size={16} />
            Cari Jadwal Guru
          </label>
          <div className="relative">
            <input
              type="text"
              value={selectedTeacher ? selectedTeacher.name : teacherQuery}
              onChange={(e) => {
                setSelectedTeacher(null);
                setTeacherQuery(e.target.value);
              }}
              placeholder="Ketik Nama Guru, Misalnya............ Agus Sopandi"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-sm"
            />
            {selectedTeacher && (
              <button
                onClick={() => {
                  setSelectedTeacher(null);
                  setTeacherQuery("");
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Hapus pilihan guru"
              >
                <X size={16} />
              </button>
            )}
            {!selectedTeacher && filteredTeacherOptions.length > 0 && (
              <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                {filteredTeacherOptions.map((t) => (
                  <button
                    key={t.uuid}
                    onClick={() => {
                      setSelectedTeacher(t);
                      setTeacherQuery("");
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedTeacher && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <UserRound size={16} className="text-gray-400 flex-shrink-0" />
                  <span className="font-semibold text-gray-800 dark:text-white truncate">
                    {selectedTeacher.name}
                  </span>
                </div>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    STATUS_STYLE[teacherStatusByUuid[selectedTeacher.uuid]] ||
                    STATUS_STYLE["Belum Presensi"]
                  }`}
                >
                  {teacherStatusByUuid[selectedTeacher.uuid] || "Belum Presensi"}
                </span>
              </div>

              {isWeekend ? (
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Tidak ada jadwal KBM di hari {dayName}.
                </p>
              ) : selectedTeacherSchedule.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Tidak ada jadwal mengajar di hari {dayName}.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {selectedTeacherSchedule.map((g, i) => (
                    <li
                      key={i}
                      className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm bg-gray-50 dark:bg-gray-700/40 rounded-lg px-3 py-2"
                    >
                      <span className="font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
                        Jam{" "}
                        {g.startPeriod === g.endPeriod
                          ? g.startPeriod
                          : `${g.startPeriod}-${g.endPeriod}`}
                      </span>
                      <span className="text-gray-300 dark:text-gray-600">•</span>
                      <span className="font-semibold text-gray-800 dark:text-white">
                        Kelas {g.classId}
                      </span>
                      {g.subject && (
                        <>
                          <span className="text-gray-300 dark:text-gray-600">•</span>
                          <span className="text-gray-600 dark:text-gray-300">{g.subject}</span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {isWeekend ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            Tidak ada jadwal KBM di hari {dayName}.
          </div>
        ) : loading ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">Memuat data…</div>
        ) : (
          <>
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 mb-5 text-xs">
              {Object.entries(STATUS_STYLE)
                .filter(([k]) => k !== "Kosong")
                .map(([label, cls]) => (
                  <span key={label} className={`px-2 py-1 rounded font-medium ${cls}`}>
                    {label}
                  </span>
                ))}
              <span className="flex items-center gap-1.5 px-2 py-1 rounded font-medium bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-700">
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                Sedang Berlangsung
              </span>
              <span className="px-2 py-1 rounded font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                ✓ Selesai
              </span>
            </div>

            {gradeBlocks.length === 0 ? (
              <div className="text-center py-16 text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                Tidak ada kelas aktif.
              </div>
            ) : (
              <div className="space-y-5">
                {gradeBlocks.map(({ grade, list }) => {
                  const accent = GRADE_ACCENT[grade] || DEFAULT_ACCENT;
                  const collapsed = !!collapsedGrades[grade];
                  const summary = summaryFor(list);

                  return (
                    <div
                      key={grade}
                      className={`bg-white dark:bg-gray-800 rounded-xl border ${accent.ring} shadow-sm overflow-hidden`}
                    >
                      {/* Header blok jenjang */}
                      <button
                        onClick={() => toggleGrade(grade)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-1.5 h-8 rounded-full ${accent.bar}`} />
                          <div className="text-left min-w-0">
                            <div className="font-bold text-gray-800 dark:text-white text-base flex items-center gap-2">
                              Kelas {grade}
                              <span
                                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${accent.badge}`}
                              >
                                {list.length} kelas
                              </span>
                            </div>
                            {/* Ringkasan status -- sekilas tanpa perlu buka blok */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                              {Object.entries(summary)
                                .filter(([, n]) => n > 0)
                                .map(([status, n]) => (
                                  <span key={status} className="flex items-center gap-1">
                                    <span
                                      className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`}
                                    />
                                    {status}: {n}
                                  </span>
                                ))}
                            </div>
                          </div>
                        </div>
                        {collapsed ? (
                          <ChevronDown size={20} className="text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronUp size={20} className="text-gray-400 flex-shrink-0" />
                        )}
                      </button>

                      {/* Tabel kelas x jam, per jenjang */}
                      {!collapsed && (
                        <div className="overflow-x-auto border-t border-gray-100 dark:border-gray-700">
                          <table className="min-w-full text-sm border-collapse">
                            <thead>
                              <tr>
                                <th className="sticky left-0 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 font-semibold px-3 py-2 text-left border-b border-r border-gray-200 dark:border-gray-700">
                                  Kelas
                                </th>
                                {periods.map((p) => {
                                  const live = p === currentPeriod;
                                  const range = JAM_SCHEDULE[dayName]?.[p];
                                  const timeLabel =
                                    range?.start && range?.end
                                      ? `${range.start.replace(":", ".")}-${range.end.replace(":", ".")}`
                                      : null;
                                  return (
                                    <th
                                      key={p}
                                      className={`font-semibold px-3 py-2 text-center border-b whitespace-nowrap ${
                                        live
                                          ? "text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-900/30 border-sky-200 dark:border-sky-800"
                                          : "text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700"
                                      }`}
                                    >
                                      <div className="flex items-center justify-center gap-1">
                                        {live && (
                                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse inline-block" />
                                        )}
                                        Jam {p}
                                      </div>
                                      {timeLabel && (
                                        <div
                                          className={`text-[10px] font-normal mt-0.5 ${
                                            live
                                              ? "text-sky-600 dark:text-sky-400"
                                              : "text-gray-400 dark:text-gray-500"
                                          }`}
                                        >
                                          {timeLabel}
                                        </div>
                                      )}
                                    </th>
                                  );
                                })}
                              </tr>
                            </thead>
                            <tbody>
                              {list.map((c) => (
                                <tr
                                  key={c.id}
                                  className="hover:bg-gray-50 dark:hover:bg-gray-700/40"
                                >
                                  <td className="sticky left-0 bg-white dark:bg-gray-800 font-medium text-gray-800 dark:text-white px-3 py-2 border-b border-r border-gray-200 dark:border-gray-700 whitespace-nowrap">
                                    {c.id}
                                  </td>
                                  {periods.map((p) => {
                                    const cell = cellMap[c.id]?.[p];
                                    const subject = subjectMap[c.id]?.[p];
                                    const timeState = periodTimeState(p);

                                    if (!cell) {
                                      return (
                                        <td
                                          key={p}
                                          className="px-1.5 py-1.5 border-b border-gray-100 dark:border-gray-700/60 text-center align-middle"
                                        >
                                          <div
                                            className={`rounded-md px-2 py-1 ${STATUS_STYLE.Kosong}`}
                                          >
                                            —
                                          </div>
                                        </td>
                                      );
                                    }

                                    const statusCls =
                                      STATUS_STYLE[cell.status] || STATUS_STYLE["Belum Presensi"];

                                    // Jam yang SEDANG berlangsung -- kartu diperluas:
                                    // mapel + nama guru + badge kedip "Berlangsung".
                                    if (timeState === "live") {
                                      return (
                                        <td
                                          key={p}
                                          className="px-1.5 py-1.5 border-b border-gray-100 dark:border-gray-700/60 text-center align-middle"
                                        >
                                          <div
                                            className={`rounded-md px-2 py-1.5 min-w-[92px] ring-2 ring-sky-400 dark:ring-sky-500 shadow-sm ${statusCls}`}
                                            title={`${subject || "Mapel"} — ${cell.name} — ${cell.status}`}
                                          >
                                            {subject && (
                                              <div className="text-[10px] font-bold leading-tight truncate">
                                                {subject}
                                              </div>
                                            )}
                                            <div className="text-[10px] leading-tight truncate opacity-90">
                                              {cell.name}
                                            </div>
                                            <div className="flex items-center justify-center gap-1 mt-0.5">
                                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                              <span className="text-[9px] font-semibold animate-pulse">
                                                Berlangsung
                                              </span>
                                            </div>
                                          </div>
                                        </td>
                                      );
                                    }

                                    // Jam yang udah lewat hari ini -- tetep tampilin status
                                    // presensi, cuma dikasih tag kecil "Selesai".
                                    if (timeState === "done") {
                                      return (
                                        <td
                                          key={p}
                                          className="px-1.5 py-1.5 border-b border-gray-100 dark:border-gray-700/60 text-center align-middle"
                                        >
                                          <div
                                            className={`rounded-md px-2 py-1 ${statusCls}`}
                                            title={`${cell.name} — ${cell.status} — Selesai`}
                                          >
                                            <div className="font-bold text-[11px] leading-tight">
                                              {cell.status}
                                            </div>
                                            <div className="text-[10px] leading-tight truncate max-w-[72px] mx-auto opacity-90">
                                              {cell.name}
                                            </div>
                                            <div className="text-[8px] leading-tight opacity-75 mt-0.5">
                                              ✓ Selesai
                                            </div>
                                          </div>
                                        </td>
                                      );
                                    }

                                    // Default -- jam yang belum mulai, atau lagi liat tanggal
                                    // selain hari ini: tampilan ringkas biasa.
                                    return (
                                      <td
                                        key={p}
                                        className="px-1.5 py-1.5 border-b border-gray-100 dark:border-gray-700/60 text-center align-middle"
                                      >
                                        <div
                                          className={`rounded-md px-2 py-1 ${statusCls}`}
                                          title={`${cell.name} — ${cell.status}`}
                                        >
                                          <div className="font-bold text-[11px] leading-tight">
                                            {cell.status}
                                          </div>
                                          <div className="text-[10px] leading-tight truncate max-w-[72px] mx-auto opacity-90">
                                            {cell.name}
                                          </div>
                                        </div>
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MonitoringKBM;
