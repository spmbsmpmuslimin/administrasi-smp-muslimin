// src/attendance-teacher/TeacherAttendance.js
import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

// Teacher Components
import AttendanceTabs from "./AttendanceTabs";
import MyAttendanceStatus from "./MyAttendanceStatus";

// Admin Component
import AdminAttendanceView from "./AdminAttendanceView";

const TeacherAttendance = ({ user }) => {
  const [currentUser, setCurrentUser] = useState(null);
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

  // ========== TEACHER VIEW (MOBILE-FIRST DESIGN) ==========
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
      {/* Header - Mobile Optimized */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="px-4 py-3 sm:px-6 sm:py-4">
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
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">
                  Input Presensi dan Absensi Guru
                </p>
              </div>
            </div>

            {/* User Info - Always Visible */}
            <div className="flex items-center gap-2 bg-gray-50 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-gray-200">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm flex-shrink-0">
                {currentUser.full_name.charAt(0)}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-gray-800 truncate max-w-[120px]">
                  {currentUser.full_name}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {currentUser.role === "guru_bk" ? "Guru BK" : "Guru"}
                </p>
              </div>
            </div>
          </div>

          {/* Mobile: Show User Name Below */}
          <div className="mt-2 sm:hidden">
            <p className="text-sm font-medium text-gray-700">
              {currentUser.full_name}
            </p>
            <p className="text-xs text-gray-500 capitalize">
              {currentUser.role === "guru_bk" ? "Guru BK" : "Guru"}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content - Mobile First */}
      <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">
        {/* Mobile: Stack Layout */}
        {/* Desktop: Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 md:gap-6">
          {/* Status Card - Full Width on Mobile, Sidebar on Desktop */}
          <div className="lg:col-span-4">
            <MyAttendanceStatus
              currentUser={currentUser}
              refreshTrigger={refreshTrigger}
            />
          </div>

          {/* Attendance Tabs - Main Content */}
          <div className="lg:col-span-8">
            <AttendanceTabs
              currentUser={currentUser}
              onSuccess={handleAttendanceSuccess}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherAttendance;
