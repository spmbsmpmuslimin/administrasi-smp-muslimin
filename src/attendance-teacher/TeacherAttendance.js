// src/attendance-teacher/TeacherAttendance.js
import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

// Teacher Components
import AttendanceTabs from "./AttendanceTabs";
import MyAttendanceStatus from "./MyAttendanceStatus";
import MyMonthlyHistory from "./MyMonthlyHistory";
import TodaySchedule from "./TodaySchedule"; // ← TAMBAHAN: Import komponen jadwal

// Admin Component
import AdminAttendanceView from "./AdminAttendanceView";

const TeacherAttendance = ({ user }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeView, setActiveView] = useState("presensi");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use user from props (from App.js) or fallback to localStorage
    const userData =
      user ||
      JSON.parse(
        localStorage.getItem("user") || sessionStorage.getItem("user")
      );
    setCurrentUser(userData);
    setLoading(false);
  }, [user]);

  const handleAttendanceSuccess = () => {
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

  // ✅ ROLE-BASED RENDERING
  const isAdmin = currentUser.role === "admin";

  // ========== ADMIN VIEW ==========
  if (isAdmin) {
    return <AdminAttendanceView currentUser={currentUser} />;
  }

  // ========== TEACHER VIEW ==========
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
      {/* Header - Mobile Optimized */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="px-3 sm:px-6 py-3 sm:py-4 max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-3">
            {/* Logo & Title */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-blue-100 p-1.5 sm:p-2 rounded-lg">
                <Clock className="text-blue-600" size={20} />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-800">
                  Presensi Guru
                </h1>
                <p className="text-xs sm:text-sm text-gray-500">
                  Sistem presensi guru menggunakan QR Code atau input manual
                </p>
              </div>
            </div>

            {/* User Info - Responsive */}
            <div className="flex items-center gap-2 bg-gray-50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-200">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {currentUser.full_name.charAt(0)}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-gray-800">
                  {currentUser.full_name}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {currentUser.role === "guru_bk" ? "Guru BK" : "Guru"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-3 sm:px-6 py-4 sm:py-6 max-w-7xl mx-auto">
        {/* View Tabs */}
        <div className="mb-4 sm:mb-6 flex gap-2">
          <button
            onClick={() => setActiveView("presensi")}
            className={`
              flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold 
              transition-all text-sm sm:text-base
              ${
                activeView === "presensi"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
              }
            `}>
            Presensi
          </button>
          <button
            onClick={() => setActiveView("history")}
            className={`
              flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold 
              transition-all text-sm sm:text-base
              ${
                activeView === "history"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
              }
            `}>
            Riwayat Saya
          </button>
        </div>

        {/* Content */}
        {activeView === "presensi" ? (
          <div className="space-y-4 sm:space-y-6">
            {/* 1️⃣ Status Presensi Anda - TETAP DI ATAS! */}
            <MyAttendanceStatus
              currentUser={currentUser}
              refreshTrigger={refreshTrigger}
            />

            {/* 2️⃣ Attendance Tabs (QR Scanner / Manual Input) - NAIK KE ATAS! */}
            <AttendanceTabs
              currentUser={currentUser}
              onSuccess={handleAttendanceSuccess}
            />

            {/* 3️⃣ Jadwal Mengajar Hari Ini - TURUN KE BAWAH! */}
            <TodaySchedule
              currentUser={currentUser}
              refreshTrigger={refreshTrigger}
            />
          </div>
        ) : (
          /* Monthly History */
          <MyMonthlyHistory currentUser={currentUser} />
        )}
      </div>
    </div>
  );
};

export default TeacherAttendance;
