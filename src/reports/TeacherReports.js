import React, { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { FileText, AlertTriangle, GraduationCap, CheckCircle, TrendingUp } from "lucide-react";
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

// ✅ FIX: Tailwind color classes mapping with dark mode support
const COLOR_CLASSES = {
  indigo: {
    bg: "bg-indigo-100 dark:bg-indigo-900/30",
    text: "text-indigo-600 dark:text-indigo-400",
  },
  green: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-600 dark:text-green-400",
  },
  blue: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-600 dark:text-blue-400",
  },
  purple: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-600 dark:text-purple-400",
  },
  cyan: {
    bg: "bg-cyan-100 dark:bg-cyan-900/30",
    text: "text-cyan-600 dark:text-cyan-400",
  },
  emerald: {
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  yellow: {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-600 dark:text-yellow-400",
  },
  orange: {
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-600 dark:text-orange-400",
  },
  teal: {
    bg: "bg-teal-100 dark:bg-teal-900/30",
    text: "text-teal-600 dark:text-teal-400",
  },
};

// ==================== COMPONENTS ====================

// ✅ FIXED: StatCard with proper color classes and dark mode
const StatCard = ({ icon: Icon, label, value, color = "indigo", alert = false }) => {
  const colors = COLOR_CLASSES[color] || COLOR_CLASSES.indigo;

  return (
    <div
      className={`
        bg-white dark:bg-slate-800 
        rounded-lg shadow-sm dark:shadow-none
        border ${
          alert ? "border-red-300 dark:border-red-700" : "border-slate-200 dark:border-slate-700"
        } 
        p-4 hover:shadow-md dark:hover:shadow-slate-900/50 transition-shadow
        min-h-[110px] flex flex-col justify-center
      `}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center flex-shrink-0`}
        >
          <Icon className={`w-6 h-6 ${colors.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{label}</p>
          <p className="text-2xl md:text-xl lg:text-2xl font-bold text-slate-800 dark:text-white truncate">
            {value}
          </p>
        </div>
        {alert && (
          <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0" />
        )}
      </div>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

const TeacherReports = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // ✅ Disederhanakan: fokus ke kehadiran siswa untuk kelas+mapel yang
  // dipilih, samain gaya dengan laporan Wali Kelas (HomeroomTeacherReports.js).
  const [teacherMapelStats, setTeacherMapelStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    attendanceRate: 0,
    alerts: 0,
  });
  const [teacherAlertStudents, setTeacherAlertStudents] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Trend chart kehadiran harian
  const [dailyAttendance, setDailyAttendance] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Selector kelas + mapel (sesuai teacher_assignments), dipilih pertama kali
  // otomatis begitu data assignment kepanggil.
  const [selectedClassSubject, setSelectedClassSubject] = useState(null);

  const teacherId = user?.teacher_id;
  const userUUID = user?.id;

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
    // ✅ urutkan numeric-aware biar selector tersusun 7A, 7B, ... 7F, 8A, ...
    opts.sort(
      (a, b) =>
        a.class_id.localeCompare(b.class_id, "id", { numeric: true }) ||
        a.subject.localeCompare(b.subject, "id")
    );
    return opts;
  }, [teacherAssignments]);

  const trendMonthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
      options.push({ value, label });
    }
    return options;
  }, []);

  const fetchTeacherAssignments = useCallback(async () => {
    if (!teacherId) return;
    try {
      const { data, error } = await supabase
        .from("teacher_assignments")
        .select("class_id, subject, academic_year, semester")
        .eq("teacher_id", teacherId)
        .order("subject");

      if (error) throw error;

      setTeacherAssignments(data || []);

      if (data && data.length > 0) {
        const seen = new Set();
        const opts = [];
        data.forEach((a) => {
          const key = `${a.class_id}||${a.subject}`;
          if (!seen.has(key)) {
            seen.add(key);
            opts.push({ class_id: a.class_id, subject: a.subject });
          }
        });
        opts.sort(
          (a, b) =>
            a.class_id.localeCompare(b.class_id, "id", { numeric: true }) ||
            a.subject.localeCompare(b.subject, "id")
        );
        setSelectedClassSubject((prev) => prev || opts[0] || null);
      }
    } catch (err) {
      console.error("Error fetching teacher assignments:", err);
      setError("Gagal memuat penugasan kelas");
      throw err;
    }
  }, [teacherId]);

  // ✅ Stats kehadiran untuk kelas+mapel yang dipilih
  const fetchTeacherMapelStats = useCallback(async (classId, subject) => {
    if (!classId || !subject) {
      setTeacherMapelStats({
        totalStudents: 0,
        presentToday: 0,
        attendanceRate: 0,
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

      const todayStr = new Date().toISOString().split("T")[0];

      const { data: todayAtt, error: todayError } = await supabase
        .from("attendances")
        .select("status")
        .eq("class_id", classId)
        .eq("subject", subject)
        .eq("date", todayStr);

      if (todayError) throw todayError;
      const presentToday = todayAtt?.filter((a) => a.status?.toLowerCase() === "hadir").length || 0;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDate30 = thirtyDaysAgo.toISOString().split("T")[0];

      const { data: recentAtt, error: recentError } = await supabase
        .from("attendances")
        .select("student_id, status, date")
        .eq("class_id", classId)
        .eq("subject", subject)
        .gte("date", startDate30);

      if (recentError) throw recentError;

      const recentTotal = recentAtt?.length || 0;
      const recentHadir = recentAtt?.filter((a) => a.status?.toLowerCase() === "hadir").length || 0;
      const attendanceRate = recentTotal > 0 ? Math.round((recentHadir / recentTotal) * 100) : 0;

      const alertList = [];
      if (students && recentAtt) {
        students.forEach((student) => {
          const studentAtt = recentAtt.filter((a) => a.student_id === student.id);
          const totalDays = studentAtt.length;
          const presentDays = studentAtt.filter((a) => a.status?.toLowerCase() === "hadir").length;
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
      alertList.sort((a, b) => a.rate - b.rate);

      setTeacherMapelStats({
        totalStudents,
        presentToday,
        attendanceRate,
        alerts: alertList.length,
      });
      setTeacherAlertStudents(alertList);
    } catch (err) {
      console.error("Error fetching teacher mapel stats:", err);
      setTeacherMapelStats({
        totalStudents: 0,
        presentToday: 0,
        attendanceRate: 0,
        alerts: 0,
      });
      setTeacherAlertStudents([]);
    }
  }, []);

  // ✅ Trend kehadiran harian buat grafik
  const fetchTeacherDailyAttendanceTrend = useCallback(async (classId, subject, month) => {
    if (!classId || !subject || !month) {
      setDailyAttendance([]);
      return;
    }
    try {
      const [year, monthNum] = month.split("-").map(Number);
      const startDate = `${month}-01`;
      const lastDay = new Date(year, monthNum, 0).getDate();
      const endDate = `${month}-${String(lastDay).padStart(2, "0")}`;

      const { data, error } = await supabase
        .from("attendances")
        .select("date, status")
        .eq("class_id", classId)
        .eq("subject", subject)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date");

      if (error) throw error;

      const grouped = {};
      (data || []).forEach((row) => {
        if (!grouped[row.date]) {
          grouped[row.date] = { date: row.date, total: 0, hadir: 0 };
        }
        grouped[row.date].total += 1;
        if (row.status?.toLowerCase() === "hadir") {
          grouped[row.date].hadir += 1;
        }
      });

      const chartData = Object.values(grouped)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((d) => ({
          date: d.date.slice(8, 10),
          rate: d.total > 0 ? Math.round((d.hadir / d.total) * 100) : 0,
        }));

      setDailyAttendance(chartData);
    } catch (err) {
      console.error("Error fetching daily attendance trend:", err);
      setDailyAttendance([]);
    }
  }, []);

  // ✅ FIX: Race condition dengan Promise.all
  useEffect(() => {
    const loadAllData = async () => {
      if (!teacherId || !userUUID) {
        console.error("Teacher ID atau User ID tidak tersedia:", user);
        setError("Data teacher tidak lengkap");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        await fetchTeacherAssignments();
      } catch (err) {
        console.error("Error loading initial data:", err);
        setError("Gagal memuat data awal. Silakan refresh halaman.");
      } finally {
        setLoading(false);
        setDataLoaded(true);
      }
    };

    loadAllData();
  }, [teacherId, userUUID, fetchTeacherAssignments]);

  useEffect(() => {
    if (selectedClassSubject) {
      fetchTeacherMapelStats(selectedClassSubject.class_id, selectedClassSubject.subject);
    }
  }, [selectedClassSubject, fetchTeacherMapelStats]);

  useEffect(() => {
    if (selectedClassSubject) {
      fetchTeacherDailyAttendanceTrend(
        selectedClassSubject.class_id,
        selectedClassSubject.subject,
        selectedMonth
      );
    }
  }, [selectedClassSubject, selectedMonth, fetchTeacherDailyAttendanceTrend]);

  // ✅ FIX: Loading state dengan dark mode
  if (loading && !dataLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto mb-4"></div>
              <p className="text-slate-600 dark:text-slate-400">Memuat data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-6 transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        {/* Header - Tanpa Dark Mode Toggle */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div
                className="
                w-10 h-10 md:w-12 md:h-12 
                bg-indigo-100 dark:bg-indigo-900/50 
                rounded-lg flex items-center justify-center flex-shrink-0
              "
              >
                <FileText className="w-5 h-5 md:w-6 md:h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="min-w-0">
                <h1
                  className="
                  text-xl md:text-2xl lg:text-3xl 
                  font-bold text-slate-800 dark:text-white 
                  leading-tight
                "
                >
                  Laporan - Guru Mata Pelajaran
                </h1>
                <p
                  className="
                  text-xs md:text-sm 
                  text-slate-500 dark:text-slate-400 mt-1
                  truncate
                "
                >
                  {user.full_name} - Guru Mata Pelajaran
                </p>
              </div>
            </div>
          </div>

          <p
            className="
            text-sm md:text-base 
            text-slate-600 dark:text-slate-400
            leading-relaxed
          "
          >
            Pantau kehadiran siswa di kelas & mata pelajaran yang Anda ajar
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div
            className="
            bg-green-100 dark:bg-green-900/30 
            border border-green-400 dark:border-green-700 
            text-green-700 dark:text-green-400 
            px-4 py-3 rounded-lg mb-6 
            flex items-center justify-between
          "
          >
            <span className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm">{success}</span>
            </span>
            <button
              onClick={() => setSuccess(null)}
              className="
                text-green-800 dark:text-green-300 
                hover:text-green-900 dark:hover:text-green-200 
                font-bold text-lg
                min-h-[32px] min-w-[32px] flex items-center justify-center
              "
            >
              ×
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            className="
            bg-red-100 dark:bg-red-900/30 
            border border-red-400 dark:border-red-700 
            text-red-700 dark:text-red-400 
            px-4 py-3 rounded-lg mb-6
          "
          >
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </span>
              <button
                onClick={() => setError(null)}
                className="
                  text-red-800 dark:text-red-300 
                  hover:text-red-900 dark:hover:text-red-200 
                  font-bold text-lg
                  ml-2 flex-shrink-0
                  min-h-[32px] min-w-[32px] flex items-center justify-center
                "
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* ✅ FIX: Empty state for no assignments */}
        {teacherAssignments.length === 0 && (
          <div
            className="
            bg-yellow-50 dark:bg-yellow-900/20 
            border-2 border-yellow-200 dark:border-yellow-700 
            rounded-lg p-4 md:p-6 mb-6 md:mb-8
          "
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="
                w-5 h-5 md:w-6 md:h-6 
                text-yellow-600 dark:text-yellow-400 
                mt-0.5 flex-shrink-0
              "
              />
              <div className="flex-1 min-w-0">
                <h3
                  className="
                  font-semibold 
                  text-yellow-900 dark:text-yellow-300 
                  mb-2 text-sm md:text-base
                "
                >
                  Belum Ada Penugasan Kelas
                </h3>
                <p
                  className="
                  text-xs md:text-sm 
                  text-yellow-800 dark:text-yellow-400
                "
                >
                  Anda belum memiliki penugasan mata pelajaran. Silakan hubungi admin untuk setup
                  penugasan kelas dan mata pelajaran.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Selector Kelas & Mata Pelajaran (sesuai teacher_assignments) */}
        {classSubjectOptions.length > 0 && (
          <div
            className="
            bg-white dark:bg-slate-800 
            rounded-lg shadow-sm dark:shadow-none
            border border-slate-200 dark:border-slate-700 p-4 mb-6
          "
          >
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Kelas & Mata Pelajaran
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
              className="
                w-full px-3 py-2.5
                border border-slate-300 dark:border-slate-600
                rounded-lg 
                bg-white dark:bg-slate-700
                text-slate-800 dark:text-white
                focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400
                focus:border-indigo-500 dark:focus:border-indigo-400
                text-sm
              "
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
        )}

        {/* Stats Grid - fokus kehadiran, samain gaya dengan laporan Wali Kelas */}
        <div
          className="
          grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 
          gap-3 md:gap-4 lg:gap-6 
          mb-6 md:mb-8
        "
        >
          <StatCard
            icon={GraduationCap}
            label="Siswa di Kelas"
            value={teacherMapelStats.totalStudents || 0}
            color="green"
          />
          <StatCard
            icon={CheckCircle}
            label="Hadir Hari Ini"
            value={teacherMapelStats.presentToday || 0}
            color="blue"
          />
          <StatCard
            icon={TrendingUp}
            label="Tingkat Kehadiran"
            value={`${teacherMapelStats.attendanceRate || 0}%`}
            color="emerald"
          />
          <StatCard
            icon={AlertTriangle}
            label="Perlu Perhatian"
            value={teacherMapelStats.alerts || 0}
            color="orange"
            alert={teacherMapelStats.alerts > 0}
          />
        </div>

        {/* Trend Kehadiran Harian */}
        {selectedClassSubject && (
          <div
            className="
            bg-white dark:bg-slate-800 
            rounded-lg shadow-sm dark:shadow-none
            border border-slate-200 dark:border-slate-700 
            p-4 md:p-6 mb-6 md:mb-8
          "
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h3 className="font-semibold text-slate-800 dark:text-white text-sm md:text-base">
                Tren Kehadiran Harian - Kelas {selectedClassSubject.class_id} (
                {selectedClassSubject.subject})
              </h3>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="
                  px-3 py-2 text-sm
                  border border-slate-300 dark:border-slate-600
                  rounded-lg 
                  bg-white dark:bg-slate-700
                  text-slate-800 dark:text-white
                "
              >
                {trendMonthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {dailyAttendance.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={dailyAttendance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis domain={[0, 100]} fontSize={12} />
                  <Tooltip formatter={(value) => [`${value}%`, "Kehadiran"]} />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#4f46e5"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
                Belum ada data presensi untuk bulan ini.
              </p>
            )}
          </div>
        )}

        {/* Alert Students - kehadiran di bawah 75% */}
        {teacherAlertStudents.length > 0 && (
          <div
            className="
            bg-orange-50 dark:bg-orange-900/20 
            border-2 border-orange-200 dark:border-orange-700 
            rounded-lg p-4 md:p-6 mb-6 md:mb-8
          "
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="
                w-5 h-5 md:w-6 md:h-6 
                text-orange-600 dark:text-orange-400 
                mt-0.5 flex-shrink-0
              "
              />
              <div className="flex-1 min-w-0">
                <h3
                  className="
                  font-semibold 
                  text-orange-900 dark:text-orange-300 
                  mb-2 text-sm md:text-base
                "
                >
                  🎯 Siswa Perlu Perhatian Khusus
                </h3>
                <p
                  className="
                  text-xs md:text-sm 
                  text-orange-800 dark:text-orange-400 mb-3
                "
                >
                  Siswa dengan tingkat kehadiran di bawah 75% dalam 30 hari terakhir, untuk kelas &
                  mapel ini
                </p>
                <div className="space-y-2">
                  {teacherAlertStudents.map((student, idx) => (
                    <div
                      key={idx}
                      className="
                        bg-white dark:bg-slate-800 
                        p-3 rounded-lg 
                        border border-orange-200 dark:border-orange-700
                      "
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p
                            className="
                            text-sm font-medium 
                            text-slate-800 dark:text-white 
                            truncate
                          "
                          >
                            {student.name} ({student.nis})
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            Kehadiran: {student.present} dari {student.total} hari
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span
                            className={`
                              text-lg font-bold 
                              ${
                                student.rate < 60
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-orange-600 dark:text-orange-400"
                              }
                            `}
                          >
                            {student.rate}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tips */}
        <div
          className="
          bg-indigo-50 dark:bg-indigo-900/30 
          border border-indigo-200 dark:border-indigo-700 
          rounded-lg p-4 md:p-5 mb-6
        "
        >
          <div className="flex gap-3">
            <div
              className="
              text-indigo-600 dark:text-indigo-400 
              text-xl flex-shrink-0 mt-0.5
            "
            >
              💡
            </div>
            <div>
              <h4
                className="
                font-medium text-indigo-900 dark:text-indigo-300 
                mb-2 text-sm md:text-base
              "
              >
                Tips:
              </h4>
              <p className="text-xs md:text-sm text-indigo-700 dark:text-indigo-400">
                Pilih kelas & mata pelajaran di atas untuk memantau tren dan tingkat kehadiran
                siswa. Siswa dengan kehadiran di bawah 75% dalam 30 hari terakhir akan otomatis
                muncul di daftar "Perlu Perhatian Khusus".
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherReports;
