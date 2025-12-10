import React, { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../supabaseClient";
import {
  FileText,
  GraduationCap,
  Calendar,
  BarChart3,
  Download,
  Eye,
  TrendingUp,
  CheckCircle,
  Filter,
  X,
  AlertTriangle,
  FileSpreadsheet,
  BookOpen,
  Users,
} from "lucide-react";
import { exportToExcel } from "./ReportExcel";
import HomeroomReportModal from "./modals/HomeroomReportModal";
import TeacherReportModal from "./modals/TeacherReportModal";

// ✅ IMPORT HELPERS (with new month helpers)
import {
  fetchStudentsData,
  fetchAttendanceDailyData,
  fetchAttendanceRecapData,
  fetchGradesData,
  buildFilterDescription,
  REPORT_HEADERS,
  getMonthOptions,
  getYearOptions,
  getMonthDateRange,
} from "./ReportHelpers";

// ==================== CONSTANTS ====================

const COLOR_CLASSES = {
  indigo: {
    bg: "bg-indigo-100 dark:bg-indigo-900/30",
    text: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-200 dark:border-indigo-800",
    hover: "hover:bg-indigo-200 dark:hover:bg-indigo-800/50",
  },
  green: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-600 dark:text-green-400",
    border: "border-green-200 dark:border-green-800",
    hover: "hover:bg-green-200 dark:hover:bg-green-800/50",
  },
  blue: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
    hover: "hover:bg-blue-200 dark:hover:bg-blue-800/50",
  },
  yellow: {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-600 dark:text-yellow-400",
    border: "border-yellow-200 dark:border-yellow-800",
    hover: "hover:bg-yellow-200 dark:hover:bg-yellow-800/50",
  },
  orange: {
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-orange-200 dark:border-orange-800",
    hover: "hover:bg-orange-200 dark:hover:bg-orange-800/50",
  },
  purple: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-800",
    hover: "hover:bg-purple-200 dark:hover:bg-purple-800/50",
  },
  red: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
    hover: "hover:bg-red-200 dark:hover:bg-red-800/50",
  },
  teal: {
    bg: "bg-teal-100 dark:bg-teal-900/30",
    text: "text-teal-600 dark:text-teal-400",
    border: "border-teal-200 dark:border-teal-800",
    hover: "hover:bg-teal-200 dark:hover:bg-teal-800/50",
  },
};

// ✅ NEW: Get current month/year as default
const getCurrentMonth = () =>
  String(new Date().getMonth() + 1).padStart(2, "0");
const getCurrentYear = () => String(new Date().getFullYear());

// ==================== EXTRACTED COMPONENTS ====================

// 1. ReportStatCard (Formerly StatCard)
const ReportStatCard = ({
  icon: Icon,
  label,
  value,
  color = "indigo",
  alert = false,
}) => {
  const colors = COLOR_CLASSES[color] || COLOR_CLASSES.indigo;

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 border ${
        alert
          ? "border-red-300 dark:border-red-700"
          : "border-slate-200 dark:border-gray-700"
      } p-4 hover:shadow-md dark:hover:shadow-gray-900/70 transition-shadow`}>
      <div className="flex items-center gap-3">
        <div
          className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${colors.text}`} />
        </div>
        <div className="flex-1">
          <p className="text-sm text-slate-600 dark:text-gray-300">{label}</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-white">
            {value}
          </p>
        </div>
        {alert && (
          <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />
        )}
      </div>
    </div>
  );
};

// 2. DashboardStats
const DashboardStats = ({ activeTab, homeroomStats, teacherStats }) => {
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
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        <ReportStatCard
          icon={BookOpen}
          label="Kelas Diampu"
          value={teacherStats.totalClasses || 0}
          color="blue"
        />
        <ReportStatCard
          icon={FileText}
          label="Mata Pelajaran"
          value={teacherStats.totalSubjects || 0}
          color="indigo"
        />
        <ReportStatCard
          icon={BarChart3}
          label="Total Nilai"
          value={teacherStats.totalGrades || 0}
          color="purple"
        />
        <ReportStatCard
          icon={Calendar}
          label="Total Presensi"
          value={teacherStats.totalAttendances || 0}
          color="teal"
        />
      </div>
    );
  }
};

// 3. FilterPanel (Kept structure as user provided, good for responsiveness)
const FilterPanel = ({
  filters,
  onFilterChange,
  onReset,
  academicYears = [],
}) => {
  const monthOptions = getMonthOptions();
  const yearOptions = getYearOptions();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700 p-4 md:p-6 mb-6">
      <div className="flex items-center gap-2 mb-3 md:mb-4">
        <Filter className="w-5 h-5 text-slate-600 dark:text-gray-300" />
        <h3 className="font-semibold text-slate-800 dark:text-white text-sm md:text-base">
          Filter Laporan
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {/* Month Dropdown */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-1.5">
            Bulan
          </label>
          <select
            value={filters.month || getCurrentMonth()}
            onChange={(e) => onFilterChange("month", e.target.value)}
            className="w-full px-3 py-2 md:py-2.5 text-sm border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-slate-800 dark:text-white transition-colors">
            {monthOptions.map((month) => (
              <option
                key={month.value}
                value={month.value}
                className="bg-white dark:bg-gray-700">
                {month.label}
              </option>
            ))}
          </select>
        </div>

        {/* Year Dropdown */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-1.5">
            Tahun
          </label>
          <select
            value={filters.year || getCurrentYear()}
            onChange={(e) => onFilterChange("year", e.target.value)}
            className="w-full px-3 py-2 md:py-2.5 text-sm border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-slate-800 dark:text-white transition-colors">
            {yearOptions.map((year) => (
              <option
                key={year}
                value={year}
                className="bg-white dark:bg-gray-700">
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Academic Year */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-1.5">
            Tahun Ajaran
          </label>
          <select
            value={filters.academic_year || ""}
            onChange={(e) => onFilterChange("academic_year", e.target.value)}
            className="w-full px-3 py-2 md:py-2.5 text-sm border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-slate-800 dark:text-white transition-colors">
            <option value="" className="bg-white dark:bg-gray-700">
              Semua
            </option>
            {academicYears.map((year) => (
              <option
                key={year}
                value={year}
                className="bg-white dark:bg-gray-700">
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Semester */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-1.5">
            Semester
          </label>
          <select
            value={filters.semester || ""}
            onChange={(e) => onFilterChange("semester", e.target.value)}
            className="w-full px-3 py-2 md:py-2.5 text-sm border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-slate-800 dark:text-white transition-colors">
            <option value="" className="bg-white dark:bg-gray-700">
              Semua
            </option>
            <option value="1" className="bg-white dark:bg-gray-700">
              Semester 1
            </option>
            <option value="2" className="bg-white dark:bg-gray-700">
              Semester 2
            </option>
          </select>
        </div>

        {/* Reset Button */}
        <div className="col-span-2 sm:col-span-3 lg:col-span-2 flex items-end">
          <button
            onClick={onReset}
            className="w-full px-4 py-2.5 bg-slate-200 dark:bg-gray-700 hover:bg-slate-300 dark:hover:bg-gray-600 text-slate-700 dark:text-gray-300 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors min-h-[44px] touch-manipulation">
            <X className="w-4 h-4" />
            Reset Filter
          </button>
        </div>
      </div>
    </div>
  );
};

// 4. ReportCardsGrid
const ReportCardsGrid = ({
  activeTab,
  currentReports,
  loading,
  downloadingReportId,
  previewReport,
  downloadReport,
}) => {
  if (!currentReports || currentReports.length === 0) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-lg p-4 md:p-6 mb-6 md:mb-8">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2 text-sm md:text-base">
              Tidak Ada Laporan Tersedia
            </h3>
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              {activeTab === "homeroom"
                ? "Data kelas belum tersedia. Pastikan Anda sudah ditugaskan sebagai wali kelas dan terdapat data siswa di kelas Anda."
                : "Tidak ada penugasan mata pelajaran. Silakan hubungi admin untuk setup penugasan."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-1 ${
        activeTab === "homeroom"
          ? "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          : "sm:grid-cols-2 md:grid-cols-3"
      } gap-3 md:gap-4 mb-6 md:mb-8`}>
      {currentReports.map((report) => {
        const Icon = report.icon;
        const isDownloading = downloadingReportId === report.id;
        const colors = COLOR_CLASSES[report.color] || COLOR_CLASSES.indigo;

        return (
          <div
            key={report.id}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 ${colors.border} p-4 hover:shadow-md dark:hover:shadow-gray-900/70 transition-all duration-200`}>
            <div className="flex items-start justify-between mb-3">
              <div
                className={`w-11 h-11 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${colors.text}`} />
              </div>
            </div>

            <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-1.5 leading-tight line-clamp-2">
              {report.title}
            </h3>

            <p className="text-xs text-slate-600 dark:text-gray-400 mb-2 leading-tight line-clamp-2">
              {report.description}
            </p>

            <p className="text-xs text-slate-500 dark:text-gray-500 mb-3 font-medium">
              {report.stats}
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => previewReport(report.id)}
                disabled={loading || downloadingReportId}
                className="w-full bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 disabled:bg-gray-300 dark:disabled:bg-gray-800 text-slate-700 dark:text-gray-300 px-2.5 py-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors min-h-[44px] touch-manipulation">
                <Eye className="w-3.5 h-3.5" />
                {loading ? "Memuat..." : "Preview"}
              </button>

              <button
                onClick={() => downloadReport(report.id, "xlsx")}
                disabled={
                  loading ||
                  isDownloading ||
                  (downloadingReportId && !isDownloading)
                }
                className="w-full bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-600 disabled:bg-gray-400 dark:disabled:bg-gray-800 text-white px-2.5 py-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors min-h-[44px] touch-manipulation">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                {isDownloading ? "Exporting..." : "Export Excel"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// 5. StudentAlertsAndAssignments
const StudentAlertsAndAssignments = ({
  activeTab,
  alertStudents,
  teacherAssignments,
}) => {
  if (activeTab === "homeroom" && alertStudents.length > 0) {
    return (
      <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-lg p-4 md:p-6 mb-6 md:mb-8">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-orange-900 dark:text-orange-300 mb-2 text-sm md:text-base">
              Siswa Perlu Perhatian Khusus
            </h3>
            <p className="text-sm text-orange-800 dark:text-orange-300 mb-3">
              Siswa dengan tingkat kehadiran di bawah 75% dalam 30 hari terakhir
            </p>
            <div className="space-y-2">
              {alertStudents.map((student, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-orange-200 dark:border-orange-700">
                  <p className="text-sm font-medium text-slate-800 dark:text-white">
                    {student.name} ({student.nis})
                  </p>
                  <p className="text-xs text-slate-600 dark:text-gray-400">
                    Kehadiran: {student.rate}% ({student.present} dari{" "}
                    {student.total} hari)
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === "teacher" && teacherAssignments.length > 0) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4 md:p-6 mb-6 md:mb-8">
        <div className="flex items-start gap-3">
          <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2 text-sm md:text-base">
              Kelas & Mata Pelajaran yang Diampu
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
              {teacherAssignments.map((assignment, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-blue-200 dark:border-blue-700">
                  <p className="text-sm font-medium text-slate-800 dark:text-white">
                    Kelas {assignment.class_id}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-gray-400">
                    {assignment.subject}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-gray-500">
                    {assignment.academic_year} • Semester {assignment.semester}
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
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-lg p-4 md:p-6 mb-6 md:mb-8">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2 text-sm md:text-base">
              Belum Ada Penugasan Kelas
            </h3>
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              Anda belum memiliki penugasan mata pelajaran. Silakan hubungi
              admin untuk setup penugasan kelas dan mata pelajaran.
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
  const [downloadingReportId, setDownloadingReportId] = useState(null);
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

  // ✅ FIXED: Initialize with month/year instead of date range
  const [filters, setFilters] = useState({
    class_id: user?.homeroom_class_id,
    month: getCurrentMonth(),
    year: getCurrentYear(),
  });

  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    data: null,
    type: null,
  });
  const [alertStudents, setAlertStudents] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    const loadAllData = async () => {
      if (!user?.homeroom_class_id) {
        // Allow teacher role to proceed even if not homeroom, only throw specific error if activeTab is homeroom
        if (activeTab === "homeroom") {
          setError(
            "Data user tidak lengkap. Pastikan Anda sudah ditugaskan sebagai wali kelas."
          );
        }
      }

      try {
        setLoading(true);
        setError(null);

        // Use Promise.allSettled for robust initial loading
        const results = await Promise.allSettled([
          fetchAcademicYears(),
          fetchStats(),
          fetchTeacherAssignments(),
        ]);

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
          const { data: stats, error: statsError } = await supabase.rpc(
            "get_teacher_stats",
            { p_teacher_uuid: user.id }
          );

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
  const fetchAcademicYears = useCallback(async () => {
    if (!user?.homeroom_class_id) return; // Only fetch if homeroom is set
    try {
      const { data, error } = await supabase
        .from("students")
        .select("academic_year")
        .eq("class_id", user.homeroom_class_id)
        .order("academic_year", { ascending: false });

      if (error) throw error;

      const uniqueYears = [
        ...new Set(data.map((item) => item.academic_year)),
      ].filter(Boolean);
      setAcademicYears(uniqueYears);
    } catch (err) {
      console.error("Error fetching academic years:", err);
      setAcademicYears([]);
      throw err;
    }
  }, [user?.homeroom_class_id]);

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
        attendanceRate:
          totalStudents > 0
            ? Math.round((presentToday / totalStudents) * 100)
            : 0,
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

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // ✅ FIXED: Reset filters with month/year
  const resetFilters = () => {
    if (activeTab === "homeroom") {
      setFilters({
        class_id: user.homeroom_class_id,
        month: getCurrentMonth(),
        year: getCurrentYear(),
      });
    } else {
      setFilters({
        month: getCurrentMonth(),
        year: getCurrentYear(),
      });
    }
    setError(null);
    setSuccess(null);
  };

  // ✅ Use useCallback for optimization, core logic of the file
  const fetchReportData = useCallback(
    async (reportType) => {
      try {
        let reportTitle = "";
        let result = null;

        // 🔥 TAB HOMEROOM REPORTS
        if (activeTab === "homeroom") {
          const homeroomFilters = {
            ...filters,
            class_id: user.homeroom_class_id,
          };

          switch (reportType) {
            case "students":
              reportTitle = "DATA SISWA WALI KELAS";
              result = await fetchStudentsData(homeroomFilters, false);
              break;

            case "attendance":
              reportTitle = "PRESENSI HARIAN WALI KELAS";
              result = await fetchAttendanceDailyData(homeroomFilters);
              break;

            case "attendance-recap":
              reportTitle = "REKAPITULASI KEHADIRAN WALI KELAS";
              result = await fetchAttendanceRecapData(
                homeroomFilters,
                "Harian"
              );
              break;

            case "grades":
              reportTitle = "DATA NILAI AKADEMIK WALI KELAS";
              // ✅ FIXED: isHomeroom = true to get final grades only
              result = await fetchGradesData(homeroomFilters, null, true);

              // ✅ SORT BY SUBJECT → STUDENT NAME
              if (result && result.fullData && Array.isArray(result.fullData)) {
                console.log("📄 Sorting grades (homeroom)...");
                result.fullData.sort((a, b) => {
                  const subjectCompare = (a.subject || "").localeCompare(
                    b.subject || ""
                  );
                  if (subjectCompare !== 0) return subjectCompare;
                  return (a.full_name || "").localeCompare(b.full_name || "");
                });
                result.preview = result.fullData.slice(0, 100);
                console.log(
                  "✅ Sorted! Total records:",
                  result.fullData.length
                );
              }
              break;

            default:
              throw new Error("Tipe laporan tidak valid");
          }
        }
        // 🔥 TAB TEACHER MAPEL REPORTS
        else if (activeTab === "teacher") {
          if (!teacherAssignments || teacherAssignments.length === 0) {
            throw new Error(
              "Tidak ada penugasan kelas ditemukan. Hubungi admin untuk setup penugasan."
            );
          }

          const classIds = teacherAssignments.map((a) => a.class_id);
          const teacherSubjects = teacherAssignments
            .map((a) => a.subject)
            .filter(Boolean);

          switch (reportType) {
            case "teacher-grades":
              reportTitle = "NILAI MATA PELAJARAN YANG DIAMPU";

              const gradeFilters = {
                ...filters,
                class_ids: classIds,
              };

              // Fetch grades data for all assigned classes/subjects
              result = await fetchGradesData(gradeFilters, user.id, true);
              result.headers = REPORT_HEADERS.gradesFinalOnly;

              // ✅ SORT BY SUBJECT → STUDENT NAME
              if (result && result.fullData && Array.isArray(result.fullData)) {
                console.log("📄 Sorting grades (teacher)...");
                result.fullData.sort((a, b) => {
                  const subjectCompare = (a.subject || "").localeCompare(
                    b.subject || ""
                  );
                  if (subjectCompare !== 0) return subjectCompare;
                  return (a.full_name || "").localeCompare(b.full_name || "");
                });
                result.preview = result.fullData.slice(0, 100);
                console.log(
                  "✅ Sorted! Total records:",
                  result.fullData.length
                );
              }
              break;

            case "teacher-attendance":
              reportTitle = "PRESENSI MATA PELAJARAN";

              if (teacherSubjects.length === 0) {
                return {
                  headers: [
                    "Tanggal",
                    "NIS",
                    "Nama Siswa",
                    "Kelas",
                    "Mata Pelajaran",
                    "Status",
                  ],
                  preview: [],
                  total: 0,
                  fullData: [],
                  summary: [
                    {
                      label: "Info",
                      value: "Tidak ada mata pelajaran yang diampu",
                    },
                  ],
                  reportTitle,
                };
              }

              // ✅ Use month/year from filters
              const { startDate, endDate } = getMonthDateRange(
                filters.month,
                filters.year
              );

              let query = supabase
                .from("attendances")
                .select(
                  "date, subject, status, class_id, students!inner(nis, full_name)"
                )
                .eq("type", "mapel")
                .eq("teacher_id", user.id)
                .in("class_id", classIds)
                .in("subject", teacherSubjects)
                .gte("date", startDate)
                .lte("date", endDate)
                .order("date", { ascending: false });

              const { data: teacherAtt, error: taError } = await query;
              if (taError) throw taError;

              const formattedTA = teacherAtt.map((row) => ({
                date: new Date(row.date).toLocaleDateString("id-ID"),
                nis: row.students?.nis || "-",
                full_name: row.students?.full_name || "-",
                class_id: row.class_id || "-",
                subject: row.subject || "-",
                status:
                  {
                    hadir: "Hadir",
                    tidak_hadir: "Tidak Hadir",
                    alpa: "Alpa",
                    sakit: "Sakit",
                    izin: "Izin",
                  }[row.status?.toLowerCase()] || row.status,
              }));

              const taTotal = teacherAtt.length;
              const taHadir = teacherAtt.filter(
                (d) => d.status?.toLowerCase() === "hadir"
              ).length;
              const taPercent =
                taTotal > 0 ? Math.round((taHadir / taTotal) * 100) : 0;

              result = {
                headers: [
                  "Tanggal",
                  "NIS",
                  "Nama Siswa",
                  "Kelas",
                  "Mata Pelajaran",
                  "Status",
                ],
                preview: formattedTA.slice(0, 100), // Limit preview to 100 records
                total: formattedTA.length,
                fullData: formattedTA,
                summary: [
                  { label: "Total Records", value: taTotal },
                  { label: "Persentase Kehadiran", value: `${taPercent}%` },
                  {
                    label: "Tidak Hadir",
                    value: teacherAtt.filter(
                      (d) => d.status?.toLowerCase() !== "hadir"
                    ).length,
                  },
                ],
              };
              break;

            case "teacher-recap":
              reportTitle = "REKAPITULASI KELAS YANG DIAMPU";

              const { data: recapData, error: recapError } = await supabase.rpc(
                "get_teacher_recap",
                { p_teacher_uuid: user.id }
              );

              if (recapError) throw recapError;

              result = {
                headers: [
                  "Kelas",
                  "Mata Pelajaran",
                  "Tahun Ajaran",
                  "Semester",
                  "Total Nilai",
                  "Rata-rata Nilai",
                  "Total Presensi",
                  "Tingkat Kehadiran",
                ],
                preview: recapData,
                total: recapData.length,
                fullData: recapData,
                summary: [
                  { label: "Total Kelas", value: recapData.length },
                  {
                    label: "Total Mata Pelajaran",
                    value: [...new Set(recapData.map((r) => r.subject))].length,
                  },
                ],
              };
              break;

            default:
              throw new Error("Tipe laporan tidak valid");
          }
        }

        return {
          ...result,
          reportTitle,
        };
      } catch (err) {
        console.error("Error in fetchReportData:", err);
        throw err;
      }
    },
    [activeTab, user?.homeroom_class_id, user.id, filters, teacherAssignments]
  );

  // ✅ Use useCallback for optimization
  const previewReport = useCallback(
    async (reportType) => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchReportData(reportType);
        setPreviewModal({ isOpen: true, data, type: reportType });
        setSuccess("✅ Preview berhasil dimuat");
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        setError(`Gagal preview laporan: ${err.message}`);
        console.error("Preview error:", err);
      } finally {
        setLoading(false);
      }
    },
    [fetchReportData]
  );

  // ✅ Use useCallback for optimization
  const downloadReport = useCallback(
    async (reportType, format) => {
      setDownloadingReportId(reportType);
      setError(null);

      try {
        let data;

        // Use cached data from preview modal if available and matches reportType
        if (
          previewModal.isOpen &&
          previewModal.type === reportType &&
          previewModal.data?.fullData
        ) {
          data = previewModal.data;
        } else {
          data = await fetchReportData(reportType);
        }

        // ✅ SORTING BEFORE EXPORT (Refactored to be cleaner)
        if (data.fullData && Array.isArray(data.fullData)) {
          const sortData = (data, comparator) => {
            console.log(`📄 Sorting ${reportType} data before export...`);
            data.sort(comparator);
            console.log(`✅ ${reportType} data sorted!`);
          };

          if (reportType === "grades" || reportType === "teacher-grades") {
            sortData(data.fullData, (a, b) => {
              const subjectCompare = (a.subject || "").localeCompare(
                b.subject || ""
              );
              if (subjectCompare !== 0) return subjectCompare;
              return (a.full_name || "").localeCompare(b.full_name || "");
            });
          } else if (
            reportType === "attendance" ||
            reportType === "teacher-attendance"
          ) {
            sortData(data.fullData, (a, b) => {
              const parseDate = (dateStr) => {
                if (!dateStr) return new Date(0);
                const parts = dateStr.split("/");
                if (parts.length === 3) {
                  return new Date(parts[2], parts[1] - 1, parts[0]);
                }
                return new Date(dateStr);
              };

              const dateA = parseDate(a.date);
              const dateB = parseDate(b.date);
              return dateB - dateA; // Newest first
            });
          } else if (reportType === "attendance-recap") {
            sortData(data.fullData, (a, b) =>
              (a.name || "").localeCompare(b.name || "")
            );
          } else if (reportType === "students") {
            sortData(data.fullData, (a, b) =>
              (a.nis || "").localeCompare(b.nis || "")
            );
          }
        }

        const filterDescription = buildFilterDescription(filters);

        const metadata = {
          title: data.reportTitle || "LAPORAN",
          academicYear: filters.academic_year,
          semester: filters.semester ? `Semester ${filters.semester}` : null,
          filters: filterDescription,
          summary: data.summary,
        };

        await exportToExcel(data.fullData, data.headers, metadata, {
          role: activeTab === "homeroom" ? "homeroom" : "teacher",
          reportType: reportType,
        });

        setSuccess("✅ Laporan berhasil diexport!");
        setTimeout(() => setSuccess(null), 3000);
        setPreviewModal({ isOpen: false, data: null, type: null });
      } catch (err) {
        setError(`Gagal export laporan: ${err.message}`);
        console.error("Download error:", err);
      } finally {
        setDownloadingReportId(null);
      }
    },
    [activeTab, filters, fetchReportData, previewModal]
  );

  const homeroomReports = useMemo(
    () => [
      {
        id: "students",
        icon: GraduationCap,
        title: `Data Siswa`,
        description: "Export data siswa kelas Anda",
        stats: `${stats.totalStudents || 0} siswa`,
        color: "green",
      },
      {
        id: "attendance",
        icon: Calendar,
        title: "Presensi Harian",
        description: "Data kehadiran per hari",
        stats: `Kelas ${user?.homeroom_class_id || "-"}`,
        color: "yellow",
      },
      {
        id: "attendance-recap",
        icon: CheckCircle,
        title: "Rekap Kehadiran",
        description: "Ringkasan total kehadiran",
        stats: "Per siswa",
        color: "orange",
      },
      {
        id: "grades",
        icon: BarChart3,
        title: "Nilai Akademik",
        description: "Nilai akhir semua mata pelajaran",
        stats: `Kelas ${user?.homeroom_class_id || "-"}`,
        color: "purple",
      },
    ],
    [stats.totalStudents, user?.homeroom_class_id, stats]
  );

  const teacherReports = useMemo(
    () => [
      {
        id: "teacher-grades",
        icon: BarChart3,
        title: "Nilai Mata Pelajaran",
        description: "Data nilai siswa di semua kelas yang Anda ajar",
        stats: `${teacherStats.totalGrades || 0} nilai tercatat`,
        color: "blue",
      },
      {
        id: "teacher-attendance",
        icon: Calendar,
        title: "Presensi Mata Pelajaran",
        description: "Data kehadiran siswa di mata pelajaran Anda",
        stats: `${teacherStats.totalAttendances || 0} presensi tercatat`,
        color: "indigo",
      },
      {
        id: "teacher-recap",
        icon: BookOpen,
        title: "Rekapitulasi Per Kelas",
        description: "Ringkasan performa per kelas yang Anda ajar",
        stats: `${teacherStats.totalClasses || 0} kelas diampu`,
        color: "teal",
      },
    ],
    [teacherStats]
  );

  const currentReports = useMemo(
    () => (activeTab === "homeroom" ? homeroomReports : teacherReports),
    [activeTab, homeroomReports, teacherReports]
  );

  if (loading && !dataLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto mb-4"></div>
              <p className="text-slate-600 dark:text-gray-300">
                Memuat data...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state for Homeroom tab if not assigned
  if (!user?.homeroom_class_id && activeTab === "homeroom") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-lg p-4 md:p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2 text-sm md:text-base">
                  Belum Ditugaskan Sebagai Wali Kelas
                </h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  Anda belum memiliki penugasan sebagai wali kelas. Silakan
                  hubungi admin untuk setup penugasan kelas.
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
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 p-4 md:p-6 transition-colors">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-8 h-8 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">
                Laporan - Wali Kelas & Guru Mapel
              </h1>
              <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                {user?.full_name || "User"} - Wali Kelas{" "}
                {user?.homeroom_class_id || "-"}
              </p>
            </div>
          </div>
          <p className="text-slate-600 dark:text-gray-300 text-sm md:text-base">
            Kelola laporan sebagai wali kelas dan guru mata pelajaran
          </p>
        </div>

        {/* Success/Error Alerts */}
        {success && (
          <div className="bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              {success}
            </span>
            <button
              onClick={() => setSuccess(null)}
              className="text-green-800 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100 font-bold">
              ×
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                {error}
              </span>
              <button
                onClick={() => setError(null)}
                className="text-red-800 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 font-bold">
                ×
              </button>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700 mb-6">
          <div className="flex border-b border-slate-200 dark:border-gray-700">
            <button
              onClick={() => {
                setActiveTab("homeroom");
                resetFilters();
              }}
              className={`flex-1 px-4 md:px-6 py-3 md:py-4 font-semibold text-xs md:text-sm transition-colors flex items-center justify-center gap-2 min-h-[52px] touch-manipulation ${
                activeTab === "homeroom"
                  ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400"
                  : "text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-700"
              }`}>
              <Users className="w-5 h-5" />
              <span className="hidden sm:inline">Laporan Wali Kelas</span>
              <span className="sm:hidden">Wali Kelas</span>
              <span className="ml-2 bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs">
                Kelas {user?.homeroom_class_id || "-"}
              </span>
            </button>
            <button
              onClick={() => {
                setActiveTab("teacher");
                resetFilters();
              }}
              className={`flex-1 px-4 md:px-6 py-3 md:py-4 font-semibold text-xs md:text-sm transition-colors flex items-center justify-center gap-2 min-h-[52px] touch-manipulation ${
                activeTab === "teacher"
                  ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400"
                  : "text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-700"
              }`}>
              <BookOpen className="w-5 h-5" />
              <span className="hidden sm:inline">Laporan Guru Mapel</span>
              <span className="sm:hidden">Guru Mapel</span>
              <span className="ml-2 bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs">
                {teacherStats.totalClasses || 0} Kelas
              </span>
            </button>
          </div>
        </div>

        {/* 1. Stats Dashboard (Extracted) */}
        <DashboardStats
          activeTab={activeTab}
          homeroomStats={stats}
          teacherStats={teacherStats}
        />

        {/* 2. Filter Panel */}
        <FilterPanel
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={resetFilters}
          academicYears={academicYears}
        />

        {/* 3. Reports Grid (Extracted) */}
        <ReportCardsGrid
          activeTab={activeTab}
          currentReports={currentReports}
          loading={loading}
          downloadingReportId={downloadingReportId}
          previewReport={previewReport}
          downloadReport={downloadReport}
        />

        {/* 4. Alert Students & Assignments Panel (Extracted) */}
        <StudentAlertsAndAssignments
          activeTab={activeTab}
          alertStudents={alertStudents}
          teacherAssignments={teacherAssignments}
        />

        {/* Info Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700 p-4 md:p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
            📋 Informasi Laporan
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div>
              <h4 className="font-medium text-slate-700 dark:text-gray-300 mb-2 flex items-center gap-2 text-sm md:text-base">
                <FileSpreadsheet className="w-4 h-4" />
                Format File
              </h4>
              <p className="text-sm text-slate-600 dark:text-gray-400">
                Laporan tersedia dalam format Excel dengan layout yang rapi dan
                profesional.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-slate-700 dark:text-gray-300 mb-2 flex items-center gap-2 text-sm md:text-base">
                <Users className="w-4 h-4" />
                Cakupan Data
              </h4>
              <p className="text-sm text-slate-600 dark:text-gray-400">
                {activeTab === "homeroom"
                  ? `Laporan wali kelas mencakup data kelas ${
                      user?.homeroom_class_id || "-"
                    }.`
                  : `Laporan guru mapel mencakup semua kelas yang Anda ajar.`}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-slate-700 dark:text-gray-300 mb-2 flex items-center gap-2 text-sm md:text-base">
                <Eye className="w-4 h-4" />
                Preview Tersedia
              </h4>
              <p className="text-sm text-slate-600 dark:text-gray-400">
                Klik "Preview" untuk melihat semua data sebelum export.
              </p>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
          <div className="flex gap-3">
            <div className="text-indigo-600 dark:text-indigo-400 text-xl">
              💡
            </div>
            <div>
              <h4 className="font-medium text-indigo-900 dark:text-indigo-300 mb-1 text-sm md:text-base">
                Tips:
              </h4>
              <p className="text-sm text-indigo-700 dark:text-indigo-300">
                {activeTab === "homeroom"
                  ? "Export laporan presensi dan nilai secara berkala untuk monitoring performa siswa. Nilai Akademik menampilkan NILAI AKHIR (NA) yang dihitung dari: NH×40% + PSTS×30% + PSAS×30%."
                  : "Gunakan laporan guru mapel untuk analisis performa siswa per mata pelajaran. Bandingkan hasil antar kelas untuk evaluasi metode pengajaran."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Conditional Modal Rendering based on activeTab */}
      {activeTab === "homeroom" ? (
        <HomeroomReportModal
          isOpen={previewModal.isOpen}
          onClose={() =>
            setPreviewModal({ isOpen: false, data: null, type: null })
          }
          reportData={previewModal.data || {}}
          reportType={previewModal.type}
          onDownload={downloadReport}
          loading={downloadingReportId !== null}
        />
      ) : (
        <TeacherReportModal
          isOpen={previewModal.isOpen}
          onClose={() =>
            setPreviewModal({ isOpen: false, data: null, type: null })
          }
          reportData={previewModal.data || {}}
          reportType={previewModal.type}
          onDownload={downloadReport}
          loading={downloadingReportId !== null}
        />
      )}
    </div>
  );
};

export default HomeroomTeacherReports;
