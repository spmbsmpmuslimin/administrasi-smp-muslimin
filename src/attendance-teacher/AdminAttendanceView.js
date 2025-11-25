// src/attendance-teacher/AdminAttendanceView.js
import React, { useState } from "react";
import { Users, FileText, RefreshCw } from "lucide-react";
import DailySummary from "./reports/DailySummary";
import MonthlyView from "./reports/MonthlyView";

const AdminAttendanceView = ({ currentUser }) => {
  const [activeView, setActiveView] = useState("today");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
              <Users className="text-blue-600" size={32} />
              Manajemen Presensi Guru
            </h1>
            <p className="text-gray-600 mt-1">
              Monitoring dan laporan presensi seluruh guru
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Login sebagai:</p>
            <p className="text-lg font-semibold text-gray-800">
              {currentUser.full_name}
            </p>
            <span className="inline-block text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
              Administrator
            </span>
          </div>
        </div>
      </div>

      {/* View Tabs + Refresh */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveView("today")}
            className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              activeView === "today"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}>
            <Users size={20} />
            <span className="hidden sm:inline">Presensi Hari Ini</span>
            <span className="sm:hidden">Hari Ini</span>
          </button>
          <button
            onClick={() => setActiveView("monthly")}
            className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              activeView === "monthly"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}>
            <FileText size={20} />
            <span className="hidden sm:inline">Laporan Bulanan</span>
            <span className="sm:hidden">Bulanan</span>
          </button>
        </div>

        <button
          onClick={handleRefresh}
          className="px-4 py-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-lg transition-all flex items-center gap-2 shadow-sm">
          <RefreshCw size={20} />
          <span className="hidden sm:inline">Refresh Data</span>
        </button>
      </div>

      {/* Content */}
      <div>
        {activeView === "today" ? (
          <>
            {/* Daily Summary Stats */}
            <DailySummary refreshTrigger={refreshTrigger} />

            {/* Info Card */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="text-blue-600" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">
                    Statistik Presensi Hari Ini
                  </h3>
                  <p className="text-sm text-gray-600">
                    Data presensi seluruh guru pada hari ini. Untuk melihat
                    detail per guru, silakan pilih tab "Laporan Bulanan".
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Monthly Report */
          <MonthlyView currentUser={currentUser} />
        )}
      </div>
    </div>
  );
};

export default AdminAttendanceView;
