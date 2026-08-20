import React, { useState, useEffect, useMemo } from "react";
import { AlertTriangle, User, School, Home, Moon, Sun } from "lucide-react";
import AdminDashboard from "./AdminDashboard";
import HomeroomTeacherDashboard from "./HomeroomTeacherDashboard";
import TeacherDashboard from "./TeacherDashboard";
import GuruBKDashboard from "./GuruBKDashboard";

const Dashboard = ({ user }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    // Load dark mode preference from localStorage
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });

  // Apply dark mode to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  // Memoize user data untuk prevent unnecessary re-renders
  const memoizedUser = useMemo(() => {
    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      teacher_id: user.teacher_id,
      homeroom_class_id: user.homeroom_class_id,
      email: user.email,
      is_active: user.is_active,
    };
  }, [user?.id, user?.username, user?.role, user?.teacher_id, user?.homeroom_class_id]);

  // Optimized loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Debug info - only in development
  useEffect(() => {
    if (memoizedUser && process.env.NODE_ENV === "development") {
      console.log("🚀 Dashboard initialized:", memoizedUser);
    }
  }, [memoizedUser]);

  // ✅ FIX: Role mapping yang sesuai dengan database SMP Muslimin Cililin
  const DashboardComponent = useMemo(() => {
    if (!memoizedUser) return null;

    const userRole = memoizedUser.role?.toLowerCase();

    // ✅ ROLE MAPPING SESUAI DATABASE

    // 1. ADMIN
    if (userRole === "admin") {
      return <AdminDashboard user={memoizedUser} darkMode={darkMode} />;
    }

    // 2. GURU BK/BP - ✅ BARU DITAMBAHKAN
    if (userRole === "guru_bk") {
      return <GuruBKDashboard user={memoizedUser} darkMode={darkMode} />;
    }

    // 3. GURU WALI KELAS - Teacher dengan homeroom_class_id
    if (userRole === "teacher" && memoizedUser.homeroom_class_id) {
      return <HomeroomTeacherDashboard user={memoizedUser} darkMode={darkMode} />;
    }

    // 4. GURU BIASA - Teacher tanpa homeroom_class_id
    if (userRole === "teacher") {
      return <TeacherDashboard user={memoizedUser} darkMode={darkMode} />;
    }

    // Unknown role
    return <UnknownRoleView user={memoizedUser} darkMode={darkMode} setDarkMode={setDarkMode} />;
  }, [memoizedUser, darkMode]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 dark:border-blue-400 mb-3"></div>
          <p className="text-sm sm:text-base text-blue-600 dark:text-blue-400 font-medium">
            Menyiapkan Dashboard...
          </p>
        </div>
      </div>
    );
  }

  // No user
  if (!memoizedUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertTriangle className="text-red-500 dark:text-red-400 mx-auto mb-4" size={40} />
          <h2 className="text-lg sm:text-xl font-bold text-red-700 dark:text-red-400 mb-2">
            Akses Ditolak
          </h2>
          <p className="text-sm sm:text-base text-red-600 dark:text-red-300">
            Silakan login terlebih dahulu
          </p>
        </div>
      </div>
    );
  }

  return DashboardComponent;
};

// Component untuk unknown role
const UnknownRoleView = ({ user, darkMode, setDarkMode }) => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 p-3 sm:p-4 md:p-6">
    <div className="max-w-2xl mx-auto">
      {/* Theme Toggle - Fixed Position */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="bg-white dark:bg-gray-800 p-2.5 sm:p-3 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:scale-110 transition-all duration-200"
          aria-label="Toggle dark mode"
        >
          {darkMode ? (
            <Sun size={20} className="text-yellow-500" />
          ) : (
            <Moon size={20} className="text-gray-700" />
          )}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-red-100 dark:border-red-900/30 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-b border-red-100 dark:border-red-800/30 p-4 sm:p-6 text-center">
          <AlertTriangle
            size={40}
            className="text-red-500 dark:text-red-400 mx-auto mb-3 sm:mb-4"
          />
          <h3 className="text-lg sm:text-xl font-bold text-red-700 dark:text-red-400 mb-2">
            Role Tidak Dikenali
          </h3>
          <p className="text-sm sm:text-base text-red-600 dark:text-red-300">
            Role "{user?.role}" tidak memiliki dashboard yang sesuai
          </p>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {/* User Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 sm:p-4 border border-blue-100 dark:border-blue-800/30">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <User size={18} className="text-blue-600 dark:text-blue-400 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-base font-medium text-blue-800 dark:text-blue-300">
                  User Info
                </span>
              </div>
              <div className="space-y-1 text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                <p className="break-words">
                  <span className="font-medium">Username:</span> {user?.username}
                </p>
                <p className="break-words">
                  <span className="font-medium">Nama:</span> {user?.full_name}
                </p>
                <p className="break-words">
                  <span className="font-medium">ID:</span> {user?.id}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 sm:p-4 border border-gray-100 dark:border-gray-600">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <School size={18} className="text-gray-600 dark:text-gray-400 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-base font-medium text-gray-800 dark:text-gray-200">
                  Role Info
                </span>
              </div>
              <div className="space-y-1 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                <p className="break-words">
                  <span className="font-medium">Role:</span> {user?.role}
                </p>
                <p className="break-words">
                  <span className="font-medium">Teacher ID:</span> {user?.teacher_id || "-"}
                </p>
                <p className="break-words">
                  <span className="font-medium">Status:</span>{" "}
                  {user?.is_active ? "Aktif" : "Non-aktif"}
                </p>
              </div>
            </div>
          </div>

          {/* Class Info jika ada */}
          {user?.homeroom_class_id && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 sm:p-4 border border-emerald-100 dark:border-emerald-800/30 mb-4 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <Home size={18} className="text-emerald-600 dark:text-emerald-400 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-base font-medium text-emerald-800 dark:text-emerald-300">
                  Class Assignment
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 break-words">
                <span className="font-medium">Homeroom Class ID:</span> {user.homeroom_class_id}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors text-sm sm:text-base touch-manipulation active:scale-95"
            >
              Refresh Dashboard
            </button>

            <button
              onClick={() => {
                localStorage.removeItem("user");
                window.location.href = "/login";
              }}
              className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium py-3 px-4 rounded-lg transition-colors text-sm sm:text-base touch-manipulation active:scale-95"
            >
              Logout
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-4 sm:mt-6 text-center">
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Hubungi administrator sistem untuk menyesuaikan role dashboard
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Role yang didukung: admin, teacher, guru_bk
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default Dashboard;
