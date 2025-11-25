// src/attendance-teacher/TeacherAttendance.js
import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

// Teacher Components
import AttendanceTabs from "./AttendanceTabs";
import MyAttendanceStatus from "./MyAttendanceStatus";
import MyMonthlyHistory from "./MyMonthlyHistory";

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

      {/* View Tabs */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setActiveView("presensi")}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            activeView === "presensi"
              ? "bg-blue-600 text-white shadow-lg"
              : "bg-white text-gray-600 hover:bg-gray-50"
          }`}>
          Presensi
        </button>
        <button
          onClick={() => setActiveView("history")}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            activeView === "history"
              ? "bg-blue-600 text-white shadow-lg"
              : "bg-white text-gray-600 hover:bg-gray-50"
          }`}>
          Riwayat Saya
        </button>
      </div>

      {/* Content */}
      {activeView === "presensi" ? (
        <div className="space-y-6">
          {/* Status Presensi Anda */}
          <MyAttendanceStatus
            currentUser={currentUser}
            refreshTrigger={refreshTrigger}
          />

          {/* Attendance Tabs (QR Scanner / Manual Input) */}
          <div className="max-w-2xl mx-auto">
            <AttendanceTabs
              currentUser={currentUser}
              onSuccess={handleAttendanceSuccess}
            />
          </div>
        </div>
      ) : (
        /* Monthly History */
        <MyMonthlyHistory currentUser={currentUser} />
      )}
    </div>
  );
};

export default TeacherAttendance;
