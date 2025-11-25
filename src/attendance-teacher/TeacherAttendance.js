// src/attendance-teacher/TeacherAttendance.js
import React, { useState, useEffect } from "react";
import { Calendar, Users, Clock, FileText } from "lucide-react";
import AttendanceTabs from "./AttendanceTabs";
import TodayAttendance from "./TodayAttendance";
import DailySummary from "./reports/DailySummary";
import MonthlyView from "./reports/MonthlyView";
import { supabase } from "../supabaseClient";

const TeacherAttendance = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeView, setActiveView] = useState("today"); // today, monthly
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current user from localStorage
    const user = JSON.parse(
      localStorage.getItem("user") || sessionStorage.getItem("user")
    );
    setCurrentUser(user);
    setLoading(false);
  }, []);

  const handleAttendanceSuccess = () => {
    // Trigger refresh untuk TodayAttendance dan DailySummary
    setRefreshTrigger((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600 text-lg">Sesi login tidak ditemukan</p>
          <p className="text-gray-600 mt-2">Silakan login kembali</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Clock className="text-blue-600" size={32} />
            Presensi Guru
          </h1>
          <div className="text-right">
            <p className="text-sm text-gray-500">Login sebagai:</p>
            <p className="text-lg font-semibold text-gray-800">
              {currentUser.full_name}
            </p>
            <p className="text-xs text-gray-500 capitalize">
              {currentUser.role}
            </p>
          </div>
        </div>
        <p className="text-gray-600">
          Sistem presensi guru menggunakan QR Code atau input manual
        </p>
      </div>

      {/* View Switcher */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setActiveView("today")}
          className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
            activeView === "today"
              ? "bg-blue-600 text-white shadow-lg"
              : "bg-white text-gray-600 hover:bg-gray-50"
          }`}>
          <Users size={20} />
          Presensi Hari Ini
        </button>
        <button
          onClick={() => setActiveView("monthly")}
          className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
            activeView === "monthly"
              ? "bg-blue-600 text-white shadow-lg"
              : "bg-white text-gray-600 hover:bg-gray-50"
          }`}>
          <FileText size={20} />
          Laporan Bulanan
        </button>
      </div>

      {/* Content berdasarkan view */}
      {activeView === "today" ? (
        <>
          {/* Daily Summary Stats */}
          <DailySummary refreshTrigger={refreshTrigger} />

          {/* Main Content: Tabs + Today List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Left: Attendance Tabs (QR Scanner / Manual) */}
            <div>
              <AttendanceTabs
                currentUser={currentUser}
                onSuccess={handleAttendanceSuccess}
              />
            </div>

            {/* Right: Today's Attendance List */}
            <div>
              <TodayAttendance refreshTrigger={refreshTrigger} />
            </div>
          </div>
        </>
      ) : (
        /* Monthly View */
        <MonthlyView currentUser={currentUser} />
      )}
    </div>
  );
};

export default TeacherAttendance;
