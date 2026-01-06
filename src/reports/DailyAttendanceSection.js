// DailyAttendanceSection.js - Monitoring Presensi Harian untuk Admin
import React, { useState, useEffect } from "react";
import {
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const DailyAttendanceSection = ({ supabase, onShowToast, darkMode }) => {
  // ========== STATE MANAGEMENT ==========
  const [activeTab, setActiveTab] = useState("guru");
  const [teacherAttendance, setTeacherAttendance] = useState([]);
  const [studentAttendance, setStudentAttendance] = useState([]);
  const [teacherSummary, setTeacherSummary] = useState(null);
  const [studentSummary, setStudentSummary] = useState(null);
  const [selectedClass, setSelectedClass] = useState("");
  const [classList, setClassList] = useState([]);
  const [expandedClasses, setExpandedClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // ========== HELPER FUNCTIONS ==========

  const getTodayDate = () => {
    const now = new Date();
    const wibOffset = 7 * 60;
    const localOffset = now.getTimezoneOffset();
    const wibTime = new Date(now.getTime() + (wibOffset + localOffset) * 60000);
    return wibTime.toISOString().split("T")[0];
  };

  const formatTime = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const calculateTeacherSummary = (data) => {
    const total = data.length;
    if (total === 0) {
      return { total: 0, hadir: 0, izin: 0, sakit: 0, alpa: 0 };
    }

    const hadir = data.filter((d) => d.status?.toLowerCase() === "hadir").length;
    const izin = data.filter((d) => d.status?.toLowerCase() === "izin").length;
    const sakit = data.filter((d) => d.status?.toLowerCase() === "sakit").length;
    const alpa = data.filter((d) => d.status?.toLowerCase() === "alpa").length;

    return {
      total,
      hadir: { count: hadir, percentage: ((hadir / total) * 100).toFixed(1) },
      izin: { count: izin, percentage: ((izin / total) * 100).toFixed(1) },
      sakit: { count: sakit, percentage: ((sakit / total) * 100).toFixed(1) },
      alpa: { count: alpa, percentage: ((alpa / total) * 100).toFixed(1) },
    };
  };

  const calculateStudentSummaryByClass = (data) => {
    const byClass = {};
    let totalAll = { hadir: 0, izin: 0, sakit: 0, alpa: 0, total: 0 };

    data.forEach((record) => {
      const classId = record.students?.class_id;
      if (!classId) return;

      if (!byClass[classId]) {
        byClass[classId] = {
          total: 0,
          hadir: 0,
          izin: 0,
          sakit: 0,
          alpa: 0,
          students: [],
        };
      }

      byClass[classId].total++;
      byClass[classId].students.push({
        nis: record.students?.nis,
        name: record.students?.full_name,
        status: record.status,
        time: record.created_at,
        notes: record.notes,
      });

      const status = record.status?.toLowerCase();
      if (status === "hadir") {
        byClass[classId].hadir++;
        totalAll.hadir++;
      } else if (status === "izin") {
        byClass[classId].izin++;
        totalAll.izin++;
      } else if (status === "sakit") {
        byClass[classId].sakit++;
        totalAll.sakit++;
      } else if (status === "alpa") {
        byClass[classId].alpa++;
        totalAll.alpa++;
      }

      totalAll.total++;
    });

    return { byClass, totalAll };
  };

  // ========== DATA FETCHING ==========

  const fetchTeacherAttendanceToday = async () => {
    try {
      const today = getTodayDate();

      const { data, error } = await supabase
        .from("teacher_attendances")
        .select(
          `
          *,
          users:teacher_id (
            full_name
          )
        `
        )
        .eq("attendance_date", today)
        .order("clock_in", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Error fetching teacher attendance:", err);
      return [];
    }
  };

  const fetchStudentAttendanceToday = async (classFilter = null) => {
    try {
      const today = getTodayDate();

      let query = supabase
        .from("attendances")
        .select(
          `
          *,
          students!inner (
            nis,
            full_name,
            class_id
          )
        `
        )
        .eq("date", today)
        .eq("subject", "Harian");

      if (classFilter) {
        query = query.eq("students.class_id", classFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Error fetching student attendance:", err);
      return [];
    }
  };

  const fetchClassList = async () => {
    try {
      const { data, error } = await supabase
        .from("classes")
        .select("id")
        .order("id", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Error fetching class list:", err);
      return [];
    }
  };

  const fetchDailyAttendance = async () => {
    setLoading(true);
    try {
      const [teacherData, studentData, classes] = await Promise.all([
        fetchTeacherAttendanceToday(),
        fetchStudentAttendanceToday(selectedClass || null),
        classList.length === 0 ? fetchClassList() : Promise.resolve(classList),
      ]);

      setTeacherAttendance(teacherData);
      setTeacherSummary(calculateTeacherSummary(teacherData));

      setStudentAttendance(studentData);
      const studentCalc = calculateStudentSummaryByClass(studentData);
      setStudentSummary(studentCalc);

      if (classList.length === 0) {
        setClassList(classes);
      }

      setLastRefresh(new Date());

      console.log("✅ Daily attendance loaded:", {
        teachers: teacherData.length,
        students: studentData.length,
      });
    } catch (err) {
      console.error("❌ Error fetching daily attendance:", err);
      if (onShowToast) {
        onShowToast("Gagal memuat data presensi harian", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  // ========== EFFECTS ==========

  useEffect(() => {
    fetchDailyAttendance();

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchDailyAttendance, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedClass]);

  // ========== EVENT HANDLERS ==========

  const handleToggleClass = (classId) => {
    setExpandedClasses((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  const handleRefresh = () => {
    fetchDailyAttendance();
    if (onShowToast) {
      onShowToast("Data diperbarui", "success");
    }
  };

  // ========== FILTER & PAGINATION ==========

  const getFilteredTeachers = () => {
    let filtered = teacherAttendance;

    if (searchTerm) {
      filtered = filtered.filter((t) =>
        t.users?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter((t) => t.status?.toLowerCase() === statusFilter.toLowerCase());
    }

    return filtered;
  };

  const getPaginatedTeachers = () => {
    const filtered = getFilteredTeachers();
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filtered.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(getFilteredTeachers().length / ITEMS_PER_PAGE);

  // ========== RENDER HELPERS ==========

  const getStatusBadge = (status) => {
    const statusLower = status?.toLowerCase() || "";
    const configs = {
      hadir: {
        bg: "bg-green-100 dark:bg-green-900/30",
        text: "text-green-700 dark:text-green-300",
        label: "Hadir",
      },
      izin: {
        bg: "bg-blue-100 dark:bg-blue-900/30",
        text: "text-blue-700 dark:text-blue-300",
        label: "Izin",
      },
      sakit: {
        bg: "bg-yellow-100 dark:bg-yellow-900/30",
        text: "text-yellow-700 dark:text-yellow-300",
        label: "Sakit",
      },
      alpa: {
        bg: "bg-red-100 dark:bg-red-900/30",
        text: "text-red-700 dark:text-red-300",
        label: "Alpa",
      },
    };

    const config = configs[statusLower] || configs.alpa;

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getClassBorderColor = (attendance) => {
    const percentage = (attendance.hadir / attendance.total) * 100;
    if (percentage >= 95) return "border-green-500 dark:border-green-600";
    if (percentage >= 85) return "border-yellow-500 dark:border-yellow-600";
    return "border-red-500 dark:border-red-600";
  };

  // ========== COMPONENTS ==========

  const SummaryCard = ({ icon: Icon, label, count, percentage, color }) => (
    <div className={`${color.bg} border-2 ${color.border} rounded-xl p-4 sm:p-5`}>
      <div className="flex items-center gap-3 mb-2">
        <Icon className={`w-6 h-6 ${color.text}`} />
        <span className={`text-sm font-medium ${color.text}`}>{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl sm:text-3xl font-bold ${color.text}`}>{count}</span>
        <span className={`text-sm ${color.text} opacity-75`}>({percentage}%)</span>
      </div>
    </div>
  );

  // ========== MAIN RENDER ==========

  return (
    <div className={`mb-8 ${darkMode ? "dark" : ""}`}>
      {/* Header */}
      <div
        className={`${
          darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-slate-200"
        } rounded-xl border shadow-sm p-4 sm:p-6 mb-4`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className={`w-6 h-6 ${darkMode ? "text-blue-400" : "text-blue-600"}`} />
              <h2
                className={`text-xl sm:text-2xl font-bold ${
                  darkMode ? "text-white" : "text-slate-900"
                }`}
              >
                📊 Monitoring Presensi Hari Ini
              </h2>
            </div>
            <p className={`text-sm ${darkMode ? "text-gray-400" : "text-slate-600"}`}>
              {formatDate(getTodayDate())}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {lastRefresh && (
              <div
                className={`text-xs ${
                  darkMode ? "text-gray-400" : "text-slate-500"
                } flex items-center gap-2`}
              >
                <Clock className="w-3 h-3" />
                Update: {formatTime(lastRefresh)}
                <span className="animate-pulse">●</span>
              </div>
            )}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className={`p-2 rounded-lg transition-all ${
                darkMode
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-blue-50 hover:bg-blue-100 text-blue-600"
              } disabled:opacity-50`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b ${darkMode ? 'border-gray-700' : 'border-slate-200'}">
          <button
            onClick={() => setActiveTab("guru")}
            className={`px-4 py-2 font-medium transition-all ${
              activeTab === "guru"
                ? darkMode
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-blue-600 border-b-2 border-blue-600"
                : darkMode
                ? "text-gray-400 hover:text-gray-300"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            👨‍🏫 Presensi Guru
          </button>
          <button
            onClick={() => setActiveTab("siswa")}
            className={`px-4 py-2 font-medium transition-all ${
              activeTab === "siswa"
                ? darkMode
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-blue-600 border-b-2 border-blue-600"
                : darkMode
                ? "text-gray-400 hover:text-gray-300"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            👨‍🎓 Presensi Siswa
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "guru" ? (
        <GuruTab
          attendance={getPaginatedTeachers()}
          summary={teacherSummary}
          loading={loading}
          darkMode={darkMode}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalPages={totalPages}
          getStatusBadge={getStatusBadge}
          formatTime={formatTime}
        />
      ) : (
        <SiswaTab
          attendance={studentAttendance}
          summary={studentSummary}
          loading={loading}
          darkMode={darkMode}
          selectedClass={selectedClass}
          setSelectedClass={setSelectedClass}
          classList={classList}
          expandedClasses={expandedClasses}
          handleToggleClass={handleToggleClass}
          getStatusBadge={getStatusBadge}
          getClassBorderColor={getClassBorderColor}
          formatTime={formatTime}
        />
      )}
    </div>
  );
};

// ========== GURU TAB COMPONENT ==========

const GuruTab = ({
  attendance,
  summary,
  loading,
  darkMode,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  currentPage,
  setCurrentPage,
  totalPages,
  getStatusBadge,
  formatTime,
}) => {
  if (loading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-500" />
        <p className={darkMode ? "text-gray-400" : "text-slate-600"}>Memuat data...</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-12">
        <Users
          className={`w-12 h-12 mx-auto mb-3 opacity-50 ${
            darkMode ? "text-gray-600" : "text-slate-400"
          }`}
        />
        <p className={darkMode ? "text-gray-400" : "text-slate-600"}>
          Belum ada data presensi guru hari ini
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <SummaryCard
          icon={CheckCircle}
          label="Hadir"
          count={summary.hadir.count}
          percentage={summary.hadir.percentage}
          color={{
            bg: "bg-green-50 dark:bg-green-900/20",
            border: "border-green-200 dark:border-green-800",
            text: "text-green-700 dark:text-green-300",
          }}
        />
        <SummaryCard
          icon={Users}
          label="Izin"
          count={summary.izin.count}
          percentage={summary.izin.percentage}
          color={{
            bg: "bg-blue-50 dark:bg-blue-900/20",
            border: "border-blue-200 dark:border-blue-800",
            text: "text-blue-700 dark:text-blue-300",
          }}
        />
        <SummaryCard
          icon={AlertTriangle}
          label="Sakit"
          count={summary.sakit.count}
          percentage={summary.sakit.percentage}
          color={{
            bg: "bg-yellow-50 dark:bg-yellow-900/20",
            border: "border-yellow-200 dark:border-yellow-800",
            text: "text-yellow-700 dark:text-yellow-300",
          }}
        />
        <SummaryCard
          icon={XCircle}
          label="Alpa"
          count={summary.alpa.count}
          percentage={summary.alpa.percentage}
          color={{
            bg: "bg-red-50 dark:bg-red-900/20",
            border: "border-red-200 dark:border-red-800",
            text: "text-red-700 dark:text-red-300",
          }}
        />
      </div>

      {/* Filters & Search */}
      <div
        className={`${
          darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-slate-200"
        } rounded-xl border p-4 flex flex-col sm:flex-row gap-3`}
      >
        <div className="relative flex-1">
          <Search
            className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
              darkMode ? "text-gray-400" : "text-slate-400"
            }`}
          />
          <input
            type="text"
            placeholder="Cari nama guru..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
              darkMode
                ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                : "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
            } focus:ring-2 focus:ring-blue-500`}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`px-4 py-2 rounded-lg border ${
            darkMode
              ? "bg-gray-700 border-gray-600 text-white"
              : "bg-white border-slate-300 text-slate-900"
          } focus:ring-2 focus:ring-blue-500`}
        >
          <option value="">Semua Status</option>
          <option value="hadir">Hadir</option>
          <option value="izin">Izin</option>
          <option value="sakit">Sakit</option>
          <option value="alpa">Alpa</option>
        </select>
      </div>

      {/* Table */}
      <div
        className={`${
          darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-slate-200"
        } rounded-xl border overflow-hidden`}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={darkMode ? "bg-gray-900/50" : "bg-slate-50"}>
              <tr>
                <th
                  className={`px-4 py-3 text-left text-xs font-medium ${
                    darkMode ? "text-gray-400" : "text-slate-600"
                  } uppercase tracking-wider`}
                >
                  Nama Guru
                </th>
                <th
                  className={`px-4 py-3 text-left text-xs font-medium ${
                    darkMode ? "text-gray-400" : "text-slate-600"
                  } uppercase tracking-wider`}
                >
                  Jam Masuk
                </th>
                <th
                  className={`px-4 py-3 text-left text-xs font-medium ${
                    darkMode ? "text-gray-400" : "text-slate-600"
                  } uppercase tracking-wider`}
                >
                  Status
                </th>
                <th
                  className={`px-4 py-3 text-left text-xs font-medium ${
                    darkMode ? "text-gray-400" : "text-slate-600"
                  } uppercase tracking-wider`}
                >
                  Keterangan
                </th>
                <th
                  className={`px-4 py-3 text-center text-xs font-medium ${
                    darkMode ? "text-gray-400" : "text-slate-600"
                  } uppercase tracking-wider`}
                >
                  ⚠️
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? "divide-gray-700" : "divide-slate-200"}`}>
              {attendance.map((record, index) => (
                <tr
                  key={record.id || index}
                  className={`${
                    record.is_suspicious
                      ? "bg-yellow-50 dark:bg-yellow-900/10"
                      : darkMode
                      ? "hover:bg-gray-700/50"
                      : "hover:bg-slate-50"
                  } transition-colors`}
                >
                  <td className={`px-4 py-3 ${darkMode ? "text-white" : "text-slate-900"}`}>
                    {record.users?.full_name || "-"}
                  </td>
                  <td className={`px-4 py-3 ${darkMode ? "text-gray-300" : "text-slate-600"}`}>
                    {formatTime(record.clock_in)}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(record.status)}</td>
                  <td
                    className={`px-4 py-3 text-sm ${darkMode ? "text-gray-400" : "text-slate-600"}`}
                  >
                    {record.notes || "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {record.is_suspicious && (
                      <div className="group relative inline-block">
                        <AlertTriangle className="w-4 h-4 text-yellow-600 cursor-help" />
                        <div className="hidden group-hover:block absolute z-10 right-0 top-6 w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg">
                          GPS tidak akurat / Check-in manual
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            className={`px-4 py-3 border-t ${
              darkMode ? "border-gray-700 bg-gray-900/50" : "border-slate-200 bg-slate-50"
            } flex items-center justify-between`}
          >
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded ${
                darkMode
                  ? "bg-gray-700 text-white disabled:opacity-50"
                  : "bg-white text-slate-900 disabled:opacity-50 border border-slate-300"
              }`}
            >
              ← Prev
            </button>
            <span className={darkMode ? "text-gray-400" : "text-slate-600"}>
              Hal {currentPage} dari {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded ${
                darkMode
                  ? "bg-gray-700 text-white disabled:opacity-50"
                  : "bg-white text-slate-900 disabled:opacity-50 border border-slate-300"
              }`}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ========== SISWA TAB COMPONENT ==========

const SiswaTab = ({
  attendance,
  summary,
  loading,
  darkMode,
  selectedClass,
  setSelectedClass,
  classList,
  expandedClasses,
  handleToggleClass,
  getStatusBadge,
  getClassBorderColor,
  formatTime,
}) => {
  if (loading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-500" />
        <p className={darkMode ? "text-gray-400" : "text-slate-600"}>Memuat data...</p>
      </div>
    );
  }

  if (!summary || !summary.totalAll) {
    return (
      <div className="text-center py-12">
        <Users
          className={`w-12 h-12 mx-auto mb-3 opacity-50 ${
            darkMode ? "text-gray-600" : "text-slate-400"
          }`}
        />
        <p className={darkMode ? "text-gray-400" : "text-slate-600"}>
          Belum ada data presensi siswa hari ini
        </p>
      </div>
    );
  }

  const { totalAll, byClass } = summary;
  const totalPercentage =
    totalAll.total > 0 ? ((totalAll.hadir / totalAll.total) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-4">
      {/* Summary Cards Total */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <SummaryCard
          icon={CheckCircle}
          label="Hadir"
          count={totalAll.hadir}
          percentage={totalPercentage}
          color={{
            bg: "bg-green-50 dark:bg-green-900/20",
            border: "border-green-200 dark:border-green-800",
            text: "text-green-700 dark:text-green-300",
          }}
        />
        <SummaryCard
          icon={Users}
          label="Izin"
          count={totalAll.izin}
          percentage={((totalAll.izin / totalAll.total) * 100).toFixed(1)}
          color={{
            bg: "bg-blue-50 dark:bg-blue-900/20",
            border: "border-blue-200 dark:border-blue-800",
            text: "text-blue-700 dark:text-blue-300",
          }}
        />
        <SummaryCard
          icon={AlertTriangle}
          label="Sakit"
          count={totalAll.sakit}
          percentage={((totalAll.sakit / totalAll.total) * 100).toFixed(1)}
          color={{
            bg: "bg-yellow-50 dark:bg-yellow-900/20",
            border: "border-yellow-200 dark:border-yellow-800",
            text: "text-yellow-700 dark:text-yellow-300",
          }}
        />
        <SummaryCard
          icon={XCircle}
          label="Alpa"
          count={totalAll.alpa}
          percentage={((totalAll.alpa / totalAll.total) * 100).toFixed(1)}
          color={{
            bg: "bg-red-50 dark:bg-red-900/20",
            border: "border-red-200 dark:border-red-800",
            text: "text-red-700 dark:text-red-300",
          }}
        />
      </div>

      {/* Filter */}
      <div
        className={`${
          darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-slate-200"
        } rounded-xl border p-4`}
      >
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className={`w-full sm:w-auto px-4 py-2 rounded-lg border ${
            darkMode
              ? "bg-gray-700 border-gray-600 text-white"
              : "bg-white border-slate-300 text-slate-900"
          } focus:ring-2 focus:ring-blue-500`}
        >
          <option value="">Semua Kelas</option>
          {classList.map((cls) => (
            <option key={cls.id} value={cls.id}>
              Kelas {cls.id}
            </option>
          ))}
        </select>
      </div>

      {/* Class Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.keys(byClass).map((classId) => {
          const classData = byClass[classId];
          const percentage = ((classData.hadir / classData.total) * 100).toFixed(0);
          const isExpanded = expandedClasses.includes(classId);

          return (
            <div
              key={classId}
              className={`${
                darkMode ? "bg-gray-800" : "bg-white"
              } rounded-xl border-2 ${getClassBorderColor(classData)} p-4`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-lg font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>
                  🏫 Kelas {classId}
                </h3>
                <span className={`text-sm ${darkMode ? "text-gray-400" : "text-slate-600"}`}>
                  {classData.total} siswa
                </span>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-sm">
                  <span className={darkMode ? "text-gray-400" : "text-slate-600"}>✓ Hadir:</span>
                  <span className={`font-medium ${darkMode ? "text-green-400" : "text-green-600"}`}>
                    {classData.hadir} ({percentage}%)
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={darkMode ? "text-gray-400" : "text-slate-600"}>ℹ️ Izin:</span>
                  <span className={darkMode ? "text-white" : "text-slate-900"}>
                    {classData.izin}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={darkMode ? "text-gray-400" : "text-slate-600"}>⚠️ Sakit:</span>
                  <span className={darkMode ? "text-white" : "text-slate-900"}>
                    {classData.sakit}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={darkMode ? "text-gray-400" : "text-slate-600"}>✗ Alpa:</span>
                  <span className={darkMode ? "text-white" : "text-slate-900"}>
                    {classData.alpa}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleToggleClass(classId)}
                className={`w-full py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  darkMode
                    ? "bg-gray-700 hover:bg-gray-600 text-white"
                    : "bg-blue-50 hover:bg-blue-100 text-blue-600"
                }`}
              >
                {isExpanded ? (
                  <>
                    Tutup Detail <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Lihat Detail <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Expanded Detail */}
              {isExpanded && (
                <div
                  className={`mt-4 pt-4 border-t ${
                    darkMode ? "border-gray-700" : "border-slate-200"
                  }`}
                >
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {classData.students.map((student, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded-lg ${
                          darkMode ? "bg-gray-900/50" : "bg-slate-50"
                        } flex items-center justify-between`}
                      >
                        <div className="flex-1">
                          <p
                            className={`text-sm font-medium ${
                              darkMode ? "text-white" : "text-slate-900"
                            }`}
                          >
                            {student.name}
                          </p>
                          <p className={`text-xs ${darkMode ? "text-gray-400" : "text-slate-500"}`}>
                            NIS: {student.nis}
                          </p>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(student.status)}
                          <p
                            className={`text-xs mt-1 ${
                              darkMode ? "text-gray-400" : "text-slate-500"
                            }`}
                          >
                            {formatTime(student.time)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SummaryCard = ({ icon: Icon, label, count, percentage, color }) => (
  <div className={`${color.bg} border-2 ${color.border} rounded-xl p-4 sm:p-5`}>
    <div className="flex items-center gap-3 mb-2">
      <Icon className={`w-6 h-6 ${color.text}`} />
      <span className={`text-sm font-medium ${color.text}`}>{label}</span>
    </div>
    <div className="flex items-baseline gap-2">
      <span className={`text-2xl sm:text-3xl font-bold ${color.text}`}>{count}</span>
      <span className={`text-sm ${color.text} opacity-75`}>({percentage}%)</span>
    </div>
  </div>
);

export default DailyAttendanceSection;
