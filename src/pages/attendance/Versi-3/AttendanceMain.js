// AttendanceMain.js - REVISI FIXED
import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import Attendance from "./Attendance";
import AttendanceFilters from "./AttendanceFilters";
import AttendanceTable from "./AttendanceTable";
import AttendanceStats from "./AttendanceStats";
import { exportAttendanceToExcel } from "./AttendanceExcel";
import AttendanceModals from "./AttendanceModals";

const AttendanceMain = () => {
  const [activeTab, setActiveTab] = useState("input");
  const [currentDate, setCurrentDate] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [attendanceData, setAttendanceData] = useState([]);
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split("T")[0],
    class: "",
    status: "",
    search: "",
  });
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
  });

  // Update waktu real-time
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentDate(
        now.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      );
      setCurrentTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch data awal
  useEffect(() => {
    fetchAttendanceStats();
    fetchAttendanceData();
  }, [filters.date]);

  // Fetch statistik presensi
  const fetchAttendanceStats = async () => {
    try {
      const today = filters.date || new Date().toISOString().split("T")[0];

      // Total siswa aktif
      const { count: totalStudents, error: countError } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      if (countError) throw countError;

      // Presensi hari ini berdasarkan filter tanggal
      const { data: todayAttendance, error: attendanceError } = await supabase
        .from("attendance")
        .select("status, time_in")
        .eq("date", today);

      if (attendanceError) throw attendanceError;

      const presentToday = todayAttendance?.filter((a) => a.status === "present").length || 0;
      const absentToday = todayAttendance?.filter((a) => a.status === "absent").length || 0;

      // Hitung yang terlambat
      const lateToday =
        todayAttendance?.filter((a) => {
          if (a.time_in && a.status === "present") {
            const timeIn = new Date(`2000-01-01T${a.time_in}`);
            const lateThreshold = new Date(`2000-01-01T07:30:00`);
            return timeIn > lateThreshold;
          }
          return false;
        }).length || 0;

      setStats({
        totalStudents: totalStudents || 0,
        presentToday,
        absentToday,
        lateToday,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      setStats({
        totalStudents: 0,
        presentToday: 0,
        absentToday: 0,
        lateToday: 0,
      });
    }
  };

  // Fetch data presensi dengan filter
  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      let query = supabase.from("attendance").select(`
          *,
          students(name, nis, class)
        `);

      // Apply filters
      if (filters.date) {
        query = query.eq("date", filters.date);
      }

      if (filters.class) {
        query = query.eq("students.class", filters.class);
      }

      if (filters.status) {
        query = query.eq("status", filters.status);
      }

      if (filters.search) {
        query = query.or(
          `students.name.ilike.%${filters.search}%,students.nis.ilike.%${filters.search}%`
        );
      }

      // Sort by waktu input terbaru
      query = query.order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      setAttendanceData(data || []);
    } catch (error) {
      console.error("Error fetching attendance data:", error);
      // Fallback ke array kosong jika error
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  // Refresh data setelah operasi CRUD
  const refreshData = () => {
    fetchAttendanceStats();
    fetchAttendanceData();
  };

  // Reset semua filter
  const resetFilters = () => {
    const today = new Date().toISOString().split("T")[0];
    setFilters({
      date: today,
      class: "",
      status: "",
      search: "",
    });
  };

  const navigationItems = [
    {
      id: "input",
      icon: "📝",
      title: "Input Presensi",
      subtitle: "Kelola Kehadiran Harian",
      badge: "Input",
      color: "blue",
      gradient: "from-blue-500 to-blue-600",
    },
    {
      id: "preview",
      icon: "📊",
      title: "Data Presensi",
      subtitle: "Lihat & Kelola Data",
      badge: "Data",
      color: "green",
      gradient: "from-green-500 to-green-600",
    },
    {
      id: "export",
      icon: "📤",
      title: "Export Data",
      subtitle: "Download Laporan",
      badge: "Export",
      color: "purple",
      gradient: "from-purple-500 to-purple-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:px-8">
        {/* Header Section */}
        <div className="rounded-xl sm:rounded-2xl shadow-lg mb-4 sm:mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <span className="text-xl sm:text-2xl">📋</span>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Sistem Presensi Siswa</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                  {currentDate} • {currentTime}
                </p>
              </div>
            </div>

            {/* Statistik Ringkas */}
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <div className="px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-300">Total Siswa</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  {stats.totalStudents}
                </p>
              </div>
              <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-300">Hadir</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {stats.presentToday}
                </p>
              </div>
              <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-300">Tidak Hadir</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">
                  {stats.absentToday}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation - Responsive */}
        <div className="mb-4 sm:mb-6">
          {/* Mobile View: Ikon sejajar */}
          <div className="block sm:hidden">
            <div className="flex justify-between items-center bg-white dark:bg-gray-800 rounded-xl p-2 border border-gray-200 dark:border-gray-700 shadow-sm">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 min-h-[60px] w-full max-w-[80px] ${
                    activeTab === item.id
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  <div className="text-2xl mb-1">{item.icon}</div>
                  <div
                    className={`text-xs font-medium ${
                      activeTab === item.id
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {item.badge}
                  </div>
                  {activeTab === item.id && (
                    <div className="mt-1 w-6 h-1 rounded-full bg-blue-500"></div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop View: Card kecil */}
          <div className="hidden sm:block">
            <div className="grid grid-cols-3 gap-3">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative overflow-hidden rounded-xl border transition-all duration-300 min-h-[100px] flex items-center justify-center ${
                    activeTab === item.id
                      ? `border-${item.color}-500 shadow-md bg-white dark:bg-gray-800 scale-[1.01]`
                      : `border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-sm`
                  }`}
                >
                  <div className="p-4 w-full">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-lg bg-${item.color}-50 dark:bg-gray-700`}>
                        <span className="text-xl">{item.icon}</span>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${item.gradient}`}
                      >
                        {item.badge}
                      </span>
                    </div>

                    <h3 className="font-semibold text-sm mb-1 text-gray-900 dark:text-white text-left truncate">
                      {item.title}
                    </h3>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-300 text-left truncate">
                      {item.subtitle}
                    </p>

                    {activeTab === item.id && (
                      <div
                        className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${item.gradient}`}
                      />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Area - Berdasarkan Tab Aktif */}
        <div className="animate-fadeIn">
          {/* Tab 1: Input Presensi */}
          {activeTab === "input" && (
            <div className="space-y-6">
              {/* Statistik Hari Ini */}
              <div className="rounded-xl shadow-lg overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                <AttendanceStats
                  totalStudents={stats.totalStudents}
                  presentToday={stats.presentToday}
                  absentToday={stats.absentToday}
                  lateToday={stats.lateToday}
                  date={filters.date}
                  onRefresh={refreshData}
                  showRefreshButton={true}
                />
              </div>

              {/* Komponen Input Presensi Utama */}
              <div className="rounded-xl shadow-lg overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="p-4 sm:p-6">
                  <Attendance onAttendanceSubmit={refreshData} currentDate={filters.date} />
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Data & Preview Presensi */}
          {activeTab === "preview" && (
            <div className="space-y-6">
              {/* Filter Data */}
              <div className="rounded-xl shadow-lg overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="p-4 sm:p-6">
                  <AttendanceFilters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onApplyFilters={fetchAttendanceData}
                    onResetFilters={resetFilters}
                  />
                </div>
              </div>

              {/* Statistik Berdasarkan Filter */}
              <div className="rounded-xl shadow-lg overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                <AttendanceStats
                  totalStudents={stats.totalStudents}
                  presentToday={stats.presentToday}
                  absentToday={stats.absentToday}
                  lateToday={stats.lateToday}
                  date={filters.date}
                  filteredData={attendanceData}
                  showFilteredStats={true}
                />
              </div>

              {/* Tabel Data Presensi */}
              <div className="rounded-xl shadow-lg overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="p-4 sm:p-6">
                  {loading ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                  ) : (
                    <AttendanceTable
                      data={attendanceData}
                      onEdit={refreshData}
                      onDelete={refreshData}
                      isLoading={loading}
                    />
                  )}
                </div>
              </div>

              {/* Modal untuk Edit/Detail */}
              <AttendanceModals data={attendanceData} onDataUpdate={refreshData} />
            </div>
          )}

          {/* Tab 3: Export Data */}
          {activeTab === "export" && (
            <div className="space-y-6">
              {/* Statistik untuk Export */}
              <div className="rounded-xl shadow-lg overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                <AttendanceStats
                  totalStudents={stats.totalStudents}
                  presentToday={stats.presentToday}
                  absentToday={stats.absentToday}
                  lateToday={stats.lateToday}
                  date={filters.date}
                  showExportInfo={true}
                  dataCount={attendanceData.length}
                />
              </div>

              {/* Area Export */}
              <div className="rounded-xl shadow-lg overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="p-4 sm:p-6">
                  <div className="text-center py-6 sm:py-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 sm:w-20 sm:h-20 rounded-full mb-4 sm:mb-6 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30">
                      <span className="text-xl sm:text-3xl">📊</span>
                    </div>

                    <h3 className="text-base sm:text-xl md:text-2xl font-bold mb-2 sm:mb-3 text-gray-900 dark:text-white">
                      Export Data Presensi
                    </h3>

                    <p className="mb-4 sm:mb-6 max-w-md mx-auto text-xs sm:text-sm text-gray-600 dark:text-gray-300 px-2">
                      Download laporan presensi lengkap dengan semua data yang telah difilter.
                    </p>

                    <div className="mb-6 p-4 bg-blue-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Data yang akan diexport:
                      </p>
                      <ul className="text-xs text-gray-600 dark:text-gray-400 text-left max-w-xs mx-auto">
                        <li className="flex items-center gap-2 mb-1">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          <span>{attendanceData.length} records presensi</span>
                        </li>
                        <li className="flex items-center gap-2 mb-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          <span>Periode: {filters.date || "Hari ini"}</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                          <span>Format: Excel (.xlsx)</span>
                        </li>
                      </ul>
                    </div>

                    <button
                      onClick={() => exportAttendanceToExcel(attendanceData, filters)}
                      className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl text-sm sm:text-base min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={attendanceData.length === 0}
                    >
                      <span className="text-lg sm:text-xl">📥</span>
                      <span>
                        {attendanceData.length === 0
                          ? "Tidak Ada Data untuk Diexport"
                          : `Download Excel (${attendanceData.length} Data)`}
                      </span>
                    </button>

                    {attendanceData.length === 0 && (
                      <p className="mt-3 text-xs text-red-500 dark:text-red-400">
                        Gunakan filter pada tab "Data Presensi" untuk memilih data yang akan
                        diexport
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats Footer */}
        <div className="mt-4 sm:mt-6">
          <div className="rounded-xl p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
            <div className="text-center text-xs text-gray-600 dark:text-gray-400 flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-3">
              <span>Sistem Presensi v1.0</span>
              <span className="hidden sm:inline">•</span>
              <span>Terakhir diperbarui: {currentTime}</span>
              <span className="hidden sm:inline">•</span>
              <span>Tab Aktif: {navigationItems.find((item) => item.id === activeTab)?.title}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Animation */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default AttendanceMain;
