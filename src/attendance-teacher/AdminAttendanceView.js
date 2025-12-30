// src/attendance-teacher/AdminAttendanceView.js
import React, { useState } from "react";
import { Users, FileText, RefreshCw, Settings, Calendar, Clock } from "lucide-react";
import DailySummary from "./reports/DailySummary";
import MonthlyView from "./reports/MonthlyView";
import ITMReport from "./reports/ITMReport";
import AttendanceTabs from "./AttendanceTabs";

const AdminAttendanceView = ({ currentUser }) => {
  const [activeView, setActiveView] = useState("today");
  const [reportType, setReportType] = useState("monthly"); // 'monthly' atau 'itm'
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleAttendanceSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-10">
        <div className="px-4 sm:px-6 py-4 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Users className="text-blue-600 dark:text-blue-400" size={28} />
                Manajemen Presensi Guru
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Monitoring Dan Laporan Presensi Seluruh Guru
              </p>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="w-8 h-8 bg-blue-600 dark:bg-blue-700 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {currentUser.full_name.charAt(0)}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-gray-800 dark:text-white">
                  {currentUser.full_name}
                </p>
                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded font-medium">
                  Administrator
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto">
        {/* View Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveView("today")}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px] sm:min-h-[48px] ${
              activeView === "today"
                ? "bg-blue-600 dark:bg-blue-700 text-white shadow-lg"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
            }`}
          >
            <Users size={18} />
            <span>Hari Ini</span>
          </button>

          <button
            onClick={() => setActiveView("manage")}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px] sm:min-h-[48px] ${
              activeView === "manage"
                ? "bg-blue-600 dark:bg-blue-700 text-white shadow-lg"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
            }`}
          >
            <Settings size={18} />
            <span>Kelola</span>
          </button>

          <button
            onClick={() => setActiveView("monthly")}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px] sm:min-h-[48px] ${
              activeView === "monthly"
                ? "bg-blue-600 dark:bg-blue-700 text-white shadow-lg"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
            }`}
          >
            <FileText size={18} />
            <span>Laporan</span>
          </button>
        </div>

        {/* Content */}
        <div>
          {activeView === "today" ? (
            <>
              {/* Daily Summary Stats */}
              <DailySummary refreshTrigger={refreshTrigger} />

              {/* Info Card */}
              <div className="mt-6 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="text-blue-600 dark:text-blue-400" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-white mb-1">
                      Statistik Presensi Hari Ini
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Data Presensi Seluruh Guru Pada Hari Ini. Untuk Melihat Detail per Guru,
                      Silakan Pilih Tab "Laporan".
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : activeView === "monthly" ? (
            /* Reports Section */
            <div>
              {/* Reports Header */}
              <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                      Laporan Presensi
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      Pilih Jenis Laporan Yang Ingin Dilihat
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleRefresh}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium flex items-center gap-2 min-h-[40px]"
                    >
                      <RefreshCw size={16} />
                      <span className="text-sm sm:text-base">Refresh Data</span>
                    </button>
                  </div>
                </div>

                {/* Report Type Selector */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <button
                    onClick={() => setReportType("monthly")}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-3 sm:gap-4 min-h-[80px] sm:min-h-[100px] ${
                      reportType === "monthly"
                        ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30 shadow-sm"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        reportType === "monthly"
                          ? "bg-blue-100 dark:bg-blue-800"
                          : "bg-gray-100 dark:bg-gray-700"
                      }`}
                    >
                      <Calendar
                        className={
                          reportType === "monthly"
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-gray-500 dark:text-gray-400"
                        }
                        size={20}
                      />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 dark:text-white text-sm sm:text-base">
                        Laporan Bulanan
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Rekap Presensi Semua Guru Per Bulan Dengan Persentase Kehadiran
                      </p>
                    </div>
                    {reportType === "monthly" && (
                      <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full flex-shrink-0"></div>
                    )}
                  </button>

                  <button
                    onClick={() => setReportType("itm")}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-3 sm:gap-4 min-h-[80px] sm:min-h-[100px] ${
                      reportType === "itm"
                        ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30 shadow-sm"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        reportType === "itm"
                          ? "bg-blue-100 dark:bg-blue-800"
                          : "bg-gray-100 dark:bg-gray-700"
                      }`}
                    >
                      <Clock
                        className={
                          reportType === "itm"
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-gray-500 dark:text-gray-400"
                        }
                        size={20}
                      />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 dark:text-white text-sm sm:text-base">
                        Laporan Tatap Muka
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Rekap Jam Tatap Muka Per Guru, Detail Kehadiran Per Minggu
                      </p>
                    </div>
                    {reportType === "itm" && (
                      <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full flex-shrink-0"></div>
                    )}
                  </button>
                </div>

                {/* Report Type Description */}
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {reportType === "monthly"
                      ? "📊 Menampilkan rekap presensi bulanan semua guru dengan filter berdasarkan bulan dan tahun."
                      : "⏰ Menampilkan Detail Jam Tatap Muka Per Guru, Termasuk Kehadiran Per Jam Pelajaran Sesuai Jadwal Mengajar."}
                  </p>
                </div>
              </div>

              {/* Report Content */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {reportType === "monthly" ? (
                  <MonthlyView currentUser={currentUser} />
                ) : (
                  <ITMReport />
                )}
              </div>
            </div>
          ) : (
            /* Manage Tab - NEW! */
            <div className="space-y-4 sm:space-y-6">
              {/* Info Banner */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Settings className="text-blue-600 dark:text-blue-400" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-white mb-1 text-sm sm:text-base">
                      Kelola Presensi Guru
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Generate QR Code Untuk Presensi Hari Ini, Atau Input Presensi Guru Secara
                      Manual.
                    </p>
                  </div>
                </div>
              </div>

              {/* Attendance Tabs (Scan QR / Manual / Generate QR) */}
              <AttendanceTabs currentUser={currentUser} onSuccess={handleAttendanceSuccess} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminAttendanceView;
