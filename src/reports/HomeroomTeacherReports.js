import React, { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../supabaseClient";
import {
  FileText,
  GraduationCap,
  Calendar,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  BookOpen,
  Users,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ==================== CONSTANTS ====================

const COLOR_CLASSES = {
  indigo: {
    bg: "bg-indigo-100",
    text: "text-indigo-600",
    border: "border-indigo-200",
    hover: "hover:bg-indigo-200",
  },
  green: {
    bg: "bg-green-100",
    text: "text-green-600",
    border: "border-green-200",
    hover: "hover:bg-green-200",
  },
  blue: {
    bg: "bg-blue-100",
    text: "text-blue-600",
    border: "border-blue-200",
    hover: "hover:bg-blue-200",
  },
  yellow: {
    bg: "bg-yellow-100",
    text: "text-yellow-600",
    border: "border-yellow-200",
    hover: "hover:bg-yellow-200",
  },
  orange: {
    bg: "bg-orange-100",
    text: "text-orange-600",
    border: "border-orange-200",
    hover: "hover:bg-orange-200",
  },
  purple: {
    bg: "bg-purple-100",
    text: "text-purple-600",
    border: "border-purple-200",
    hover: "hover:bg-purple-200",
  },
  red: {
    bg: "bg-red-100",
    text: "text-red-600",
    border: "border-red-200",
    hover: "hover:bg-red-200",
  },
  teal: {
    bg: "bg-teal-100",
    text: "text-teal-600",
    border: "border-teal-200",
    hover: "hover:bg-teal-200",
  },
};

// ✅ FIX: Jangan pakai new Date().toISOString() polos buat tanggal — itu convert
// ke UTC, jadi pas dini hari WIB tanggalnya masih kebaca "kemarin" (bikin
// query "hari ini" nyari data di tanggal yang salah). Pakai helper ini biar
// konsisten dikunci ke WIB (UTC+7) di seluruh file. (Dipertahankan dari
// TeacherReports.js untuk trend chart di bawah.)
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

const getWIBDateString = (date = new Date()) => {
  const wibDate = new Date(date.getTime() + WIB_OFFSET_MS);
  return wibDate.toISOString().split("T")[0];
};

// ✅ NEW: Tentuin rentang tanggal semester aktif pakai konvensi standar
// (Semester 1: Juli–Desember, Semester 2: Januari–Juni), berdasarkan
// tanggal WIB hari ini. Dipakai buat batasi pilihan bulan trend chart.
const getCurrentSemesterRange = () => {
  const wibNow = new Date(Date.now() + WIB_OFFSET_MS);
  const year = wibNow.getUTCFullYear();
  const month = wibNow.getUTCMonth(); // 0 = Januari ... 11 = Desember

  let start, end, semester;
  if (month >= 6) {
    // Juli (index 6) - Desember (index 11) -> Semester 1
    semester = 1;
    start = new Date(Date.UTC(year, 6, 1)); // 1 Juli
    end = new Date(Date.UTC(year, 11, 31)); // 31 Desember
  } else {
    // Januari (index 0) - Juni (index 5) -> Semester 2
    semester = 2;
    start = new Date(Date.UTC(year, 0, 1)); // 1 Januari
    end = new Date(Date.UTC(year, 5, 30)); // 30 Juni
  }

  return {
    semester,
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
};

// ✅ NEW: Opsi dropdown bulan untuk trend chart, dibatasi ke semester aktif
// (dari bulan tertua semester s.d. bulan berjalan, urut terbaru dulu)
const getTrendMonthOptions = () => {
  const { startDate, endDate } = getCurrentSemesterRange();
  const todayStr = getWIBDateString();
  const effectiveEnd = endDate > todayStr ? todayStr : endDate;

  const [startYear, startMonth] = startDate.split("-").map(Number);
  const [endYear, endMonth] = effectiveEnd.split("-").map(Number);

  const options = [];
  let y = endYear;
  let m = endMonth; // 1-indexed, mulai dari bulan terbaru
  while (y > startYear || (y === startYear && m >= startMonth)) {
    const d = new Date(Date.UTC(y, m - 1, 1));
    const value = `${y}-${String(m).padStart(2, "0")}`;
    const label = d.toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
    options.push({ value, label });
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
  }
  return options;
};

// ==================== EXTRACTED COMPONENTS ====================

// 1. ReportStatCard (Formerly StatCard)
const ReportStatCard = ({ icon: Icon, label, value, color = "indigo", alert = false }) => {
  const colors = COLOR_CLASSES[color] || COLOR_CLASSES.indigo;

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border ${
        alert ? "border-red-300" : "border-slate-200"
      } p-4 hover:shadow-md transition-shadow`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${colors.text}`} />
        </div>
        <div className="flex-1">
          <p className="text-sm text-slate-600">{label}</p>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
        {alert && <AlertTriangle className="w-5 h-5 text-red-500" />}
      </div>
    </div>
  );
};

// 1b. AttendanceTrendChart — diadaptasi dari TeacherReports.js (chart tren
// kehadiran harian pakai recharts), dipakai di tab Wali Kelas & Guru Mapel
const AttendanceTrendChart = ({
  data,
  selectedMonth,
  onMonthChange,
  monthOptions,
  emptyLabel = "Belum ada data presensi untuk bulan ini.",
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 md:p-6 mb-6 md:mb-8">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-slate-800">Tren Kehadiran Harian</h3>
        <select
          value={selectedMonth}
          onChange={(e) => onMonthChange(e.target.value)}
          className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {monthOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              interval={Math.ceil(data.length / 10) - 1}
            />
            <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => [`${v}%`, "Kehadiran"]} />
            <Line type="monotone" dataKey="rate" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-sm text-slate-500">{emptyLabel}</p>
      )}
    </div>
  );
};

// 2. DashboardStats
const DashboardStats = ({ activeTab, homeroomStats, teacherMapelStats }) => {
  if (activeTab === "homeroom") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        <ReportStatCard
          icon={GraduationCap}
          label="Siswa di Kelas"
          value={homeroomStats.totalStudents || 0}
          color="green"
        />
        <ReportStatCard
          icon={CheckCircle}
          label="Hadir Hari Ini"
          value={homeroomStats.presentToday || 0}
          color="blue"
        />
        <ReportStatCard
          icon={TrendingUp}
          label="Tingkat Kehadiran"
          value={`${homeroomStats.attendanceRate || 0}%`}
          color="purple"
        />
        <ReportStatCard
          icon={AlertTriangle}
          label="Perlu Perhatian"
          value={homeroomStats.alerts || 0}
          color="red"
          alert={homeroomStats.alerts > 0}
        />
      </div>
    );
  } else {
    // ✅ Disederhanakan: fokus ke kehadiran siswa untuk kelas+mapel yang
    // dipilih, samain gaya kartu dengan tab Wali Kelas di atas.
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        <ReportStatCard
          icon={GraduationCap}
          label="Siswa di Kelas"
          value={teacherMapelStats.totalStudents || 0}
          color="green"
        />
        <ReportStatCard
          icon={Calendar}
          label="Kehadiran Bulan Ini"
          value={`${teacherMapelStats.monthlyAttendanceRate || 0}%`}
          color="blue"
        />
        <ReportStatCard
          icon={TrendingUp}
          label="Kehadiran Semester Ini"
          value={`${teacherMapelStats.semesterAttendanceRate || 0}%`}
          color="purple"
        />
        <ReportStatCard
          icon={AlertTriangle}
          label="Perlu Perhatian"
          value={teacherMapelStats.alerts || 0}
          color="red"
          alert={teacherMapelStats.alerts > 0}
        />
      </div>
    );
  }
};

// 5. StudentAlertsAndAssignments
const StudentAlertsAndAssignments = ({
  activeTab,
  alertStudents,
  teacherAssignments,
  teacherAlertStudents,
}) => {
  if (activeTab === "homeroom" && alertStudents.length > 0) {
    return (
      <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 md:p-6 mb-6 md:mb-8">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-orange-600 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-orange-900 mb-2 text-sm md:text-base">
              Siswa Perlu Perhatian Khusus
            </h3>
            <p className="text-sm text-orange-800 mb-3">
              Siswa dengan tingkat kehadiran di bawah 75% dalam 30 hari terakhir
            </p>
            <div className="space-y-2">
              {alertStudents.map((student, idx) => (
                <div key={idx} className="bg-white p-3 rounded-lg border border-orange-200">
                  <p className="text-sm font-medium text-slate-800">
                    {student.name} ({student.nis})
                  </p>
                  <p className="text-xs text-slate-600">
                    Kehadiran: {student.rate}% ({student.present} dari {student.total} hari)
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Disederhanakan: tab Guru Mapel sekarang fokus ke kehadiran siswa di
  // kelas+mapel yang dipilih, samain gaya dengan alert tab Wali Kelas di atas
  // (bukan lagi grid ringkasan semua kelas yang diampu).
  if (activeTab === "teacher" && teacherAssignments.length > 0 && teacherAlertStudents.length > 0) {
    return (
      <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 md:p-6 mb-6 md:mb-8">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-orange-600 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-orange-900 mb-2 text-sm md:text-base">
              Siswa Perlu Perhatian Khusus
            </h3>
            <p className="text-sm text-orange-800 mb-3">
              Siswa dengan tingkat kehadiran di bawah 75% dalam 30 hari terakhir, untuk kelas &
              mapel ini
            </p>
            <div className="space-y-2">
              {teacherAlertStudents.map((student, idx) => (
                <div key={idx} className="bg-white p-3 rounded-lg border border-orange-200">
                  <p className="text-sm font-medium text-slate-800">
                    {student.name} ({student.nis})
                  </p>
                  <p className="text-xs text-slate-600">
                    Kehadiran: {student.rate}% ({student.present} dari {student.total} hari)
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === "teacher" && teacherAssignments.length === 0) {
    return (
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 md:p-6 mb-6 md:mb-8">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-yellow-600 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-yellow-900 mb-2 text-sm md:text-base">
              Belum Ada Penugasan Kelas
            </h3>
            <p className="text-sm text-yellow-800">
              Anda belum memiliki penugasan mata pelajaran. Silakan hubungi admin untuk setup
              penugasan kelas dan mata pelajaran.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// ==================== MAIN COMPONENT ====================

const HomeroomTeacherReports = ({ user }) => {
  const [activeTab, setActiveTab] = useState("homeroom");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    attendanceRate: 0,
    alerts: 0,
    className: user?.homeroom_class_id || "",
  });

  const [teacherStats, setTeacherStats] = useState({
    totalClasses: 0,
    totalSubjects: 0,
    totalGrades: 0,
    totalAttendances: 0,
  });

  // ✅ NEW: Stats kehadiran guru mapel, fokus ke kelas+mapel yang dipilih di
  // dropdown (biar tab Guru Mapel sesederhana & sefokus tab Wali Kelas)
  const [teacherMapelStats, setTeacherMapelStats] = useState({
    totalStudents: 0,
    monthlyAttendanceRate: 0,
    semesterAttendanceRate: 0,
    alerts: 0,
  });
  const [teacherAlertStudents, setTeacherAlertStudents] = useState([]);

  const [alertStudents, setAlertStudents] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // ---------- Trend Chart: Wali Kelas ----------
  const [dailyAttendance, setDailyAttendance] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const wibNow = new Date(Date.now() + WIB_OFFSET_MS);
    return `${wibNow.getUTCFullYear()}-${String(wibNow.getUTCMonth() + 1).padStart(2, "0")}`;
  });

  // ---------- Trend Chart: Guru Mapel ----------
  const [selectedClassSubject, setSelectedClassSubject] = useState(null); // { class_id, subject }
  const [teacherDailyAttendance, setTeacherDailyAttendance] = useState([]);
  const [selectedTeacherMonth, setSelectedTeacherMonth] = useState(() => {
    const wibNow = new Date(Date.now() + WIB_OFFSET_MS);
    return `${wibNow.getUTCFullYear()}-${String(wibNow.getUTCMonth() + 1).padStart(2, "0")}`;
  });

  // Opsi dropdown bulan (semester aktif), dipakai bareng chart wali kelas & guru mapel
  const trendMonthOptions = useMemo(() => getTrendMonthOptions(), []);

  // Kombinasi unik kelas+mapel yang diampu, buat dropdown selector trend chart
  const classSubjectOptions = useMemo(() => {
    const seen = new Set();
    const opts = [];
    teacherAssignments.forEach((a) => {
      const key = `${a.class_id}||${a.subject}`;
      if (!seen.has(key)) {
        seen.add(key);
        opts.push({ class_id: a.class_id, subject: a.subject });
      }
    });
    // ✅ FIX: urutkan berdasarkan class_id (angka tingkat dulu, lalu huruf
    // rombel) baru mapel, biar dropdown selalu tersusun rapi (7A, 7B, ... 7F,
    // 8A, ...) alih-alih ikut urutan mentah dari data assignment. (Sama
    // seperti fix di TeacherReports.js)
    opts.sort(
      (a, b) =>
        a.class_id.localeCompare(b.class_id, "id", { numeric: true }) ||
        a.subject.localeCompare(b.subject, "id")
    );
    return opts;
  }, [teacherAssignments]);

  useEffect(() => {
    const loadAllData = async () => {
      if (!user?.homeroom_class_id) {
        // Allow teacher role to proceed even if not homeroom, only throw specific error if activeTab is homeroom
        if (activeTab === "homeroom") {
          setError("Data user tidak lengkap. Pastikan Anda sudah ditugaskan sebagai wali kelas.");
        }
      }

      try {
        setLoading(true);
        setError(null);

        // Use Promise.allSettled for robust initial loading
        const results = await Promise.allSettled([fetchStats(), fetchTeacherAssignments()]);

        const failures = results.filter((r) => r.status === "rejected");
        if (failures.length > 0) {
          console.error("Some data failed to load:", failures);
          // Set a generic warning if some initial data fails
        }

        setDataLoaded(true);
      } catch (err) {
        console.error("Error loading initial data:", err);
        setError("Gagal memuat data awal. Silakan refresh halaman.");
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [user, activeTab]); // Include activeTab to potentially re-fetch if tabs change, though core data is the same

  const fetchTeacherAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from("teacher_assignments")
        .select("*, classes!inner(id)")
        .eq("teacher_id", user.teacher_id);

      if (error) throw error;

      setTeacherAssignments(data || []);

      if (data && data.length > 0) {
        try {
          // Fetch teacher stats using RPC
          const { data: stats, error: statsError } = await supabase.rpc("get_teacher_stats", {
            p_teacher_uuid: user.id,
          });

          if (statsError) throw statsError;

          setTeacherStats({
            totalClasses: stats?.total_classes || 0,
            totalSubjects: stats?.total_subjects || 0,
            totalGrades: stats?.total_grades || 0,
            totalAttendances: stats?.total_attendances || 0,
          });
        } catch (statsErr) {
          console.error("Error fetching teacher stats:", statsErr);
          setTeacherStats({
            totalClasses: 0,
            totalSubjects: 0,
            totalGrades: 0,
            totalAttendances: 0,
          });
        }
      } else {
        setTeacherStats({
          totalClasses: 0,
          totalSubjects: 0,
          totalGrades: 0,
          totalAttendances: 0,
        });
      }
    } catch (err) {
      console.error("Error fetching teacher assignments:", err);
      setTeacherAssignments([]);
      setTeacherStats({
        totalClasses: 0,
        totalSubjects: 0,
        totalGrades: 0,
        totalAttendances: 0,
      });
      throw err;
    }
  };

  // ✅ Use useCallback for optimization
  const fetchStats = useCallback(async () => {
    if (!user?.homeroom_class_id) return; // Only fetch if homeroom is set
    try {
      const { data, error } = await supabase.rpc("get_homeroom_stats", {
        p_class_id: user.homeroom_class_id,
        p_days_back: 30,
      });

      if (error) throw error;

      const totalStudents = data?.total_students || 0;
      const presentToday = data?.present_today || 0;

      setStats({
        totalStudents,
        presentToday,
        attendanceRate: totalStudents > 0 ? Math.round((presentToday / totalStudents) * 100) : 0,
        alerts: data?.alert_students?.length || 0,
        className: user.homeroom_class_id,
      });

      setAlertStudents(data?.alert_students || []);
    } catch (err) {
      console.error("Error fetching stats:", err);
      setStats({
        totalStudents: 0,
        presentToday: 0,
        attendanceRate: 0,
        alerts: 0,
        className: user.homeroom_class_id,
      });
      setAlertStudents([]);
      throw err;
    }
  }, [user?.homeroom_class_id]);

  // ✅ Trend Chart: Wali Kelas — tren kehadiran harian buat bulan yang dipilih
  // (diadaptasi dari TeacherReports.js, disesuaikan ke tabel "attendances")
  const fetchDailyAttendanceTrend = useCallback(
    async (monthKey) => {
      if (!user?.homeroom_class_id) {
        setDailyAttendance([]);
        return;
      }
      try {
        const [yearStr, monthStr] = monthKey.split("-");
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10) - 1; // 0-indexed

        const monthStart = new Date(Date.UTC(year, month, 1)).toISOString().split("T")[0];
        const monthEnd = new Date(Date.UTC(year, month + 1, 0)).toISOString().split("T")[0];
        const todayStr = getWIBDateString();
        // Kalau bulan yang dipilih adalah bulan berjalan, jangan query melewati hari ini
        const effectiveEnd = monthEnd > todayStr ? todayStr : monthEnd;

        const { data, error } = await supabase
          .from("attendances")
          .select("date, status")
          .eq("class_id", user.homeroom_class_id)
          .eq("type", "harian")
          .gte("date", monthStart)
          .lte("date", effectiveEnd)
          .order("date", { ascending: true });

        if (error) throw error;

        // Kelompokkan per tanggal (satu titik data = satu hari sekolah)
        const dayBuckets = {};
        (data || []).forEach((row) => {
          if (!dayBuckets[row.date]) dayBuckets[row.date] = { total: 0, hadir: 0 };
          dayBuckets[row.date].total += 1;
          if (row.status?.toLowerCase() === "hadir") dayBuckets[row.date].hadir += 1;
        });

        const sortedDays = Object.keys(dayBuckets).sort();
        const trend = sortedDays.map((dateKey) => {
          const bucket = dayBuckets[dateKey];
          const rate = bucket.total > 0 ? Math.round((bucket.hadir / bucket.total) * 100) : 0;
          const label = new Date(dateKey + "T00:00:00").toLocaleDateString("id-ID", {
            day: "numeric",
            month: "numeric",
          });
          return { label, rate };
        });

        setDailyAttendance(trend);
      } catch (err) {
        console.error("Error fetching daily attendance trend:", err);
        setDailyAttendance([]);
      }
    },
    [user?.homeroom_class_id]
  );

  useEffect(() => {
    if (user?.homeroom_class_id) {
      fetchDailyAttendanceTrend(selectedMonth);
    }
  }, [user?.homeroom_class_id, selectedMonth, fetchDailyAttendanceTrend]);

  // ✅ Set default kelas+mapel terpilih begitu assignment kebaca, buat trend chart guru mapel
  useEffect(() => {
    if (classSubjectOptions.length > 0 && !selectedClassSubject) {
      setSelectedClassSubject(classSubjectOptions[0]);
    }
  }, [classSubjectOptions, selectedClassSubject]);

  // ✅ Trend Chart: Guru Mapel — tren kehadiran harian buat kelas+mapel & bulan yang dipilih
  const fetchTeacherDailyAttendanceTrend = useCallback(
    async (classId, subject, monthKey) => {
      if (!classId || !subject) {
        setTeacherDailyAttendance([]);
        return;
      }
      try {
        const [yearStr, monthStr] = monthKey.split("-");
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10) - 1;

        const monthStart = new Date(Date.UTC(year, month, 1)).toISOString().split("T")[0];
        const monthEnd = new Date(Date.UTC(year, month + 1, 0)).toISOString().split("T")[0];
        const todayStr = getWIBDateString();
        const effectiveEnd = monthEnd > todayStr ? todayStr : monthEnd;

        const { data, error } = await supabase
          .from("attendances")
          .select("date, status")
          .eq("class_id", classId)
          .eq("type", "mapel")
          .eq("subject", subject)
          .eq("teacher_id", user.id)
          .gte("date", monthStart)
          .lte("date", effectiveEnd)
          .order("date", { ascending: true });

        if (error) throw error;

        const dayBuckets = {};
        (data || []).forEach((row) => {
          if (!dayBuckets[row.date]) dayBuckets[row.date] = { total: 0, hadir: 0 };
          dayBuckets[row.date].total += 1;
          if (row.status?.toLowerCase() === "hadir") dayBuckets[row.date].hadir += 1;
        });

        const sortedDays = Object.keys(dayBuckets).sort();
        const trend = sortedDays.map((dateKey) => {
          const bucket = dayBuckets[dateKey];
          const rate = bucket.total > 0 ? Math.round((bucket.hadir / bucket.total) * 100) : 0;
          const label = new Date(dateKey + "T00:00:00").toLocaleDateString("id-ID", {
            day: "numeric",
            month: "numeric",
          });
          return { label, rate };
        });

        setTeacherDailyAttendance(trend);
      } catch (err) {
        console.error("Error fetching teacher daily attendance trend:", err);
        setTeacherDailyAttendance([]);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    if (selectedClassSubject) {
      fetchTeacherDailyAttendanceTrend(
        selectedClassSubject.class_id,
        selectedClassSubject.subject,
        selectedTeacherMonth
      );
    }
  }, [selectedClassSubject, selectedTeacherMonth, fetchTeacherDailyAttendanceTrend]);

  // ✅ NEW: Stats kehadiran — Guru Mapel, buat kelas+mapel yang dipilih.
  // Diadaptasi dari fetchTeacherMapelStats di TeacherReports.js, disesuaikan
  // ke skema tabel "attendances" (class_id/subject/teacher_id) yang dipakai
  // di aplikasi ini.
  const fetchTeacherMapelStats = useCallback(
    async (classId, subject) => {
      if (!classId || !subject) {
        setTeacherMapelStats({
          totalStudents: 0,
          monthlyAttendanceRate: 0,
          semesterAttendanceRate: 0,
          alerts: 0,
        });
        setTeacherAlertStudents([]);
        return;
      }
      try {
        const { data: students, error: studentsError } = await supabase
          .from("students")
          .select("id, nis, full_name")
          .eq("class_id", classId)
          .eq("is_active", true);

        if (studentsError) throw studentsError;
        const totalStudents = students?.length || 0;

        const wibNow = new Date(Date.now() + WIB_OFFSET_MS);
        const monthStart = new Date(Date.UTC(wibNow.getUTCFullYear(), wibNow.getUTCMonth(), 1))
          .toISOString()
          .split("T")[0];
        const todayStr = getWIBDateString();

        const { data: monthlyAtt, error: monthlyError } = await supabase
          .from("attendances")
          .select("status")
          .eq("class_id", classId)
          .eq("type", "mapel")
          .eq("subject", subject)
          .eq("teacher_id", user.id)
          .gte("date", monthStart)
          .lte("date", todayStr);

        if (monthlyError) throw monthlyError;
        const monthlyTotal = monthlyAtt?.length || 0;
        const monthlyHadir =
          monthlyAtt?.filter((a) => a.status?.toLowerCase() === "hadir").length || 0;
        const monthlyAttendanceRate =
          monthlyTotal > 0 ? Math.round((monthlyHadir / monthlyTotal) * 100) : 0;

        const { startDate: semesterStart } = getCurrentSemesterRange();

        const { data: semesterAtt, error: semesterError } = await supabase
          .from("attendances")
          .select("status")
          .eq("class_id", classId)
          .eq("type", "mapel")
          .eq("subject", subject)
          .eq("teacher_id", user.id)
          .gte("date", semesterStart)
          .lte("date", todayStr);

        if (semesterError) throw semesterError;
        const semesterTotal = semesterAtt?.length || 0;
        const semesterHadir =
          semesterAtt?.filter((a) => a.status?.toLowerCase() === "hadir").length || 0;
        const semesterAttendanceRate =
          semesterTotal > 0 ? Math.round((semesterHadir / semesterTotal) * 100) : 0;

        const thirtyDaysAgo = new Date(wibNow);
        thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
        const startDate30 = thirtyDaysAgo.toISOString().split("T")[0];

        const { data: recentAtt, error: recentError } = await supabase
          .from("attendances")
          .select("student_id, status, date")
          .eq("class_id", classId)
          .eq("type", "mapel")
          .eq("subject", subject)
          .eq("teacher_id", user.id)
          .gte("date", startDate30);

        if (recentError) throw recentError;

        const alertList = [];
        if (students && recentAtt) {
          students.forEach((student) => {
            const studentAtt = recentAtt.filter((a) => a.student_id === student.id);
            const totalDays = studentAtt.length;
            const presentDays = studentAtt.filter(
              (a) => a.status?.toLowerCase() === "hadir"
            ).length;
            const rate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

            if (totalDays > 0 && rate < 75) {
              alertList.push({
                name: student.full_name,
                nis: student.nis,
                total: totalDays,
                present: presentDays,
                rate,
              });
            }
          });
        }

        setTeacherMapelStats({
          totalStudents,
          monthlyAttendanceRate,
          semesterAttendanceRate,
          alerts: alertList.length,
        });
        setTeacherAlertStudents(alertList);
      } catch (err) {
        console.error("Error fetching teacher mapel stats:", err);
        setTeacherMapelStats({
          totalStudents: 0,
          monthlyAttendanceRate: 0,
          semesterAttendanceRate: 0,
          alerts: 0,
        });
        setTeacherAlertStudents([]);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    if (selectedClassSubject) {
      fetchTeacherMapelStats(selectedClassSubject.class_id, selectedClassSubject.subject);
    }
  }, [selectedClassSubject, fetchTeacherMapelStats]);

  if (loading && !dataLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Memuat data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state for Homeroom tab if not assigned
  if (!user?.homeroom_class_id && activeTab === "homeroom") {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 md:p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 mb-2 text-sm md:text-base">
                  Belum Ditugaskan Sebagai Wali Kelas
                </h3>
                <p className="text-sm text-yellow-800">
                  Anda belum memiliki penugasan sebagai wali kelas. Silakan hubungi admin untuk
                  setup penugasan kelas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== MAIN RENDER ====================
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 transition-colors">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-8 h-8 text-indigo-600 flex-shrink-0" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
                Laporan - Wali Kelas & Guru Mapel
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {user?.full_name || "User"} - Wali Kelas {user?.homeroom_class_id || "-"}
              </p>
            </div>
          </div>
          <p className="text-slate-600 text-sm md:text-base">
            Kelola laporan sebagai wali kelas dan guru mata pelajaran
          </p>
        </div>

        {/* Success/Error Alerts */}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              {success}
            </span>
            <button
              onClick={() => setSuccess(null)}
              className="text-green-800 hover:text-green-900 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                {error}
              </span>
              <button
                onClick={() => setError(null)}
                className="text-red-800 hover:text-red-900 font-bold"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab("homeroom")}
              className={`flex-1 px-4 md:px-6 py-3 md:py-4 font-semibold text-xs md:text-sm transition-colors flex items-center justify-center gap-2 min-h-[52px] touch-manipulation ${
                activeTab === "homeroom"
                  ? "bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="hidden sm:inline">Laporan Wali Kelas</span>
              <span className="sm:hidden">Wali Kelas</span>
              <span className="ml-2 bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full text-xs">
                Kelas {user?.homeroom_class_id || "-"}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("teacher")}
              className={`flex-1 px-4 md:px-6 py-3 md:py-4 font-semibold text-xs md:text-sm transition-colors flex items-center justify-center gap-2 min-h-[52px] touch-manipulation ${
                activeTab === "teacher"
                  ? "bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <BookOpen className="w-5 h-5" />
              <span className="hidden sm:inline">Laporan Guru Mapel</span>
              <span className="sm:hidden">Guru Mapel</span>
              <span className="ml-2 bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full text-xs">
                {teacherStats.totalClasses || 0} Kelas
              </span>
            </button>
          </div>
        </div>

        {/* 1. Stats Dashboard (Extracted) */}
        <DashboardStats
          activeTab={activeTab}
          homeroomStats={stats}
          teacherMapelStats={teacherMapelStats}
        />

        {/* 1b. Trend Chart (diadaptasi dari TeacherReports.js) */}
        {activeTab === "homeroom" ? (
          <AttendanceTrendChart
            data={dailyAttendance}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            monthOptions={trendMonthOptions}
          />
        ) : (
          classSubjectOptions.length > 0 && (
            <>
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Kelas & Mata Pelajaran (untuk tren kehadiran)
                </label>
                <select
                  value={
                    selectedClassSubject
                      ? `${selectedClassSubject.class_id}||${selectedClassSubject.subject}`
                      : ""
                  }
                  onChange={(e) => {
                    const [class_id, subject] = e.target.value.split("||");
                    setSelectedClassSubject({ class_id, subject });
                  }}
                  className="w-full md:w-96 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {classSubjectOptions.map((opt) => (
                    <option
                      key={`${opt.class_id}||${opt.subject}`}
                      value={`${opt.class_id}||${opt.subject}`}
                    >
                      Kelas {opt.class_id} - {opt.subject}
                    </option>
                  ))}
                </select>
              </div>
              <AttendanceTrendChart
                data={teacherDailyAttendance}
                selectedMonth={selectedTeacherMonth}
                onMonthChange={setSelectedTeacherMonth}
                monthOptions={trendMonthOptions}
              />
            </>
          )
        )}

        {/* Filter Panel dihapus — filter bulan/tahun/tahun ajaran/semester
            sebelumnya cuma dipakai buat sistem export/preview laporan yang
            sudah dihapus, jadi sudah nggak relevan lagi di halaman ini. */}

        {/* 3. Reports Grid — dihapus untuk tab Guru Mapel biar lebih sederhana
            & fokus ke kehadiran siswa, sama seperti tab Wali Kelas. */}

        {/* 4. Alert Students & Assignments Panel (Extracted) */}
        <StudentAlertsAndAssignments
          activeTab={activeTab}
          alertStudents={alertStudents}
          teacherAssignments={teacherAssignments}
          teacherAlertStudents={teacherAlertStudents}
        />

        {/* Info Section dihapus — isinya (Format File Excel, Preview
            Tersedia) khusus buat sistem export/preview laporan lama yang
            sudah tidak ada di halaman ini, jadi sudah tidak relevan lagi. */}

        {/* Tips */}
        <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex gap-3">
            <div className="text-indigo-600 text-xl">💡</div>
            <div>
              <h4 className="font-medium text-indigo-900 mb-1 text-sm md:text-base">Tips:</h4>
              <p className="text-sm text-indigo-700">
                {activeTab === "homeroom"
                  ? "Export laporan presensi dan nilai secara berkala untuk monitoring performa siswa. Nilai Akademik menampilkan NILAI AKHIR (NA) yang dihitung dari: NH×40% + PSTS×30% + PSAS×30%."
                  : 'Pilih kelas & mata pelajaran di atas untuk memantau tren dan tingkat kehadiran siswa. Siswa dengan kehadiran di bawah 75% dalam 30 hari terakhir akan otomatis muncul di daftar "Perlu Perhatian Khusus".'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal preview laporan guru mapel dihapus bareng ReportCardsGrid —
          tab Guru Mapel sekarang cuma fokus ke kehadiran, nggak ada lagi
          preview/export laporan di halaman ini. */}
    </div>
  );
};

export default HomeroomTeacherReports;
