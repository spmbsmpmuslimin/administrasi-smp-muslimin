// AttendanceMain.js (With Export Modal)
import React, { useState } from "react";
import Attendance from "./Attendance";
import AttendanceModals from "./AttendanceModals";
import { exportAttendanceToExcel } from "./AttendanceExcel";

const AttendanceMain = () => {
  const [activeTab, setActiveTab] = useState("input");
  const [isExporting, setIsExporting] = useState(false);

  const navigationItems = [
    {
      id: "input",
      icon: "📝",
      title: "Input Presensi",
      subtitle: "Input Data Kehadiran Siswa",
      badge: "Input",
    },
    {
      id: "preview",
      icon: "📊",
      title: "Data Presensi",
      subtitle: "Lihat dan Kelola Data",
      badge: "Data",
    },
    {
      id: "export",
      icon: "📤",
      title: "Export Data",
      subtitle: "Download Laporan Excel",
      badge: "Export",
    },
  ];

  // Handle export dengan pilihan periode
  const handleExport = async (period) => {
    setIsExporting(true);

    try {
      await exportAttendanceToExcel(period);
      alert(`✅ Data ${period} berhasil diexport!`);
    } catch (error) {
      console.error("Export error:", error);
      alert("❌ Export gagal! Silakan coba lagi.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                Sistem Presensi Siswa
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">Kelola Kehadiran Siswa</p>
            </div>

            {/* Date Info */}
            <div className="flex gap-2">
              <div className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
                <span className="text-gray-500 dark:text-gray-400">📅</span>
                <span className="ml-2 font-medium">
                  {new Date().toLocaleDateString("id-ID", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation - Mobile */}
        <div className="block sm:hidden mb-6">
          <div className="flex justify-between bg-white dark:bg-gray-800 rounded-xl p-2 border border-gray-200 dark:border-gray-700 shadow-sm">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-lg w-full max-w-[90px] transition-all ${
                  activeTab === item.id
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                }`}
              >
                <div className="text-2xl mb-1">{item.icon}</div>
                <div className="text-xs font-medium">{item.badge}</div>
                {activeTab === item.id && (
                  <div className="mt-1 w-6 h-1 rounded-full bg-blue-500 animate-pulse"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation - Desktop */}
        <div className="hidden sm:block mb-6">
          <div className="grid grid-cols-3 gap-4">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`group relative p-5 rounded-xl border transition-all duration-300 ${
                  activeTab === item.id
                    ? "border-blue-500 bg-white dark:bg-gray-800 shadow-lg scale-[1.02]"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md"
                }`}
              >
                {activeTab === item.id && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-t-xl"></div>
                )}

                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-xl transition-all ${
                      activeTab === item.id
                        ? "bg-blue-100 dark:bg-blue-900/30 scale-110"
                        : "bg-gray-100 dark:bg-gray-700 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20"
                    }`}
                  >
                    <span className="text-2xl">{item.icon}</span>
                  </div>

                  <div className="text-left flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.subtitle}</p>
                  </div>
                </div>

                {activeTab === item.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-b-xl"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg p-4 sm:p-6 min-h-[500px]">
          <div className="animate-fadeIn">
            {activeTab === "input" && <Attendance />}

            {activeTab === "preview" && <AttendanceModals />}

            {activeTab === "export" && (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 mb-6 shadow-lg">
                  <span className="text-4xl">📥</span>
                </div>

                <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
                  Export Data Presensi
                </h3>
                <p className="mb-8 text-gray-600 dark:text-gray-300 max-w-md mx-auto">
                  Pilih periode untuk download laporan presensi dalam format Excel
                </p>

                {/* Export Options Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-8">
                  <button
                    onClick={() => handleExport("bulanan")}
                    disabled={isExporting}
                    className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 rounded-xl border-2 border-blue-200 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    <div className="text-4xl mb-3">📊</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      Export Bulanan
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Download data kehadiran per bulan
                    </div>
                  </button>

                  <button
                    onClick={() => handleExport("semester")}
                    disabled={isExporting}
                    className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 rounded-xl border-2 border-green-200 dark:border-green-700 hover:border-green-400 dark:hover:border-green-500 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    <div className="text-4xl mb-3">📅</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      Export Semester
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Download data kehadiran per semester
                    </div>
                  </button>
                </div>

                {/* Loading State */}
                {isExporting && (
                  <div className="flex items-center justify-center gap-3 text-blue-600 dark:text-blue-400 mb-4">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span className="font-medium">Exporting...</span>
                  </div>
                )}

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  File akan otomatis tersimpan di folder Downloads
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>SMP Muslimin Cililin - Sistem Presensi Siswa</p>
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
          animation: fadeIn 0.4s ease-out;
        }
      `}</style>
    </div>
  );
};

export default AttendanceMain;
