//[file name]: App.js
import React, { useState, useCallback, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import Login from "./components/Login";
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";

// Import pages
import Teachers from "./pages/Teachers";
import Classes from "./pages/Classes";
import Students from "./pages/Students";
import AttendanceMain from "./pages/attendance/AttendanceMain";
import AttendanceManagement from "./pages/attendance/AttendanceManagement";
import GradeMain from "./pages/grades/GradeMain";
import TeacherSchedule from "./pages/TeacherSchedule";
import CatatanSiswa from "./pages/CatatanSiswa";
import Setting from "./setting/Setting";

// Import modules
import Konseling from "./konseling/Konseling";
import Reports from "./reports/Reports";
import SPMB from "./spmb/SPMB";
import MonitorSistem from "./system/MonitorSistem";

// Import components
import AdminPanel from "./setting/AdminPanel";
import MaintenancePage from "./setting/MaintenancePage";

// Import Presensi Guru
import TeacherAttendance from "./attendance-teacher/TeacherAttendance";

// Import E-RAPORT modules - DIUPDATE SESUAI DOKUMENTASI
import DashboardAdmin from "./e-raport/DashboardAdmin";
import DashboardTeacher from "./e-raport/DashboardTeacher";
import DashboardHomeroomTeacher from "./e-raport/DashboardHomeroomTeacher";
import InputTP from "./e-raport/InputTP";
import InputNilai from "./e-raport/InputNilai";
import InputKehadiran from "./e-raport/InputKehadiran";
import InputCatatan from "./e-raport/InputCatatan";
import InputKokurikuler from "./e-raport/InputKokurikuler"; // 🆕 TAMBAH INI
import InputEkstrakurikuler from "./e-raport/InputEkstrakurikuler"; // 🆕 TAMBAH INI
import CekStatusNilai from "./e-raport/CekStatusNilai";
import CekNilai from "./e-raport/CekNilai";
import RaportPage from "./e-raport/RaportPage";

// ========== HELPER FUNCTIONS FOR ROLE CHECK ==========

/**
 * Check if user is Wali Kelas
 * Wali Kelas = teacher dengan homeroom_class_id tidak null
 */
const isWaliKelas = (user) => {
  return (
    user?.role === "teacher" &&
    user?.homeroom_class_id !== null &&
    user?.homeroom_class_id !== undefined &&
    user?.homeroom_class_id !== ""
  );
};

/**
 * Check if user can access Wali Kelas routes
 * Admin atau Wali Kelas bisa akses
 */
const canAccessWaliKelasRoute = (user) => {
  return user?.role === "admin" || isWaliKelas(user);
};

// 🔥 PROTECTED ROUTE COMPONENT - WITH MAINTENANCE MODE
const ProtectedRoute = ({
  children,
  user,
  loading,
  darkMode,
  allowedRoles = [],
  requireWaliKelas = false, // ← Untuk route khusus wali kelas
  onShowToast,
}) => {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [whitelistUsers, setWhitelistUsers] = useState([]);
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [userFullData, setUserFullData] = useState(null); // ← Untuk simpan data lengkap user

  // 🔥 Fetch user data with homeroom_class_id
  useEffect(() => {
    const fetchUserData = async () => {
      console.log("🔍 Starting fetchUserData for:", user?.id);

      if (!user?.id) {
        console.log("❌ No user ID found");
        setUserRole(null);
        setUserFullData(null);
        setRoleLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("users")
          .select("role, homeroom_class_id")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("❌ Supabase error:", error);
          setUserRole("teacher");
          setUserFullData({ role: "teacher", homeroom_class_id: null });
          setRoleLoading(false);
          return;
        }

        if (!data) {
          console.warn("⚠️ User not found in DB, using default data");
          setUserRole("teacher");
          setUserFullData({ role: "teacher", homeroom_class_id: null });
          setRoleLoading(false);
          return;
        }

        console.log("✅ User data fetched:", {
          role: data.role,
          homeroom_class_id: data.homeroom_class_id,
          isWaliKelas: data.role === "teacher" && data.homeroom_class_id,
        });

        setUserRole(data.role);
        setUserFullData(data);
        setRoleLoading(false);
      } catch (error) {
        console.error("❌ Unexpected error:", error);
        setUserRole("teacher");
        setUserFullData({ role: "teacher", homeroom_class_id: null });
        setRoleLoading(false);
      }
    };

    fetchUserData();
  }, [user?.id]);

  // 🔥 Check maintenance mode
  useEffect(() => {
    const checkMaintenance = async () => {
      console.log("🔍 Checking maintenance mode...");

      try {
        const { data, error } = await supabase
          .from("school_settings")
          .select("setting_key, setting_value")
          .in("setting_key", ["maintenance_mode", "maintenance_message", "maintenance_whitelist"]);

        if (error) {
          console.error("❌ Error checking maintenance:", error);
          setMaintenanceLoading(false);
          return;
        }

        const settings = {};
        data?.forEach((item) => {
          settings[item.setting_key] = item.setting_value;
        });

        const isMaintenance =
          settings.maintenance_mode === "true" || settings.maintenance_mode === true;

        setMaintenanceMode(isMaintenance);
        setMaintenanceMessage(
          settings.maintenance_message ||
            "Aplikasi sedang dalam maintenance. Kami akan kembali segera!"
        );

        if (settings.maintenance_whitelist) {
          try {
            const parsed = JSON.parse(settings.maintenance_whitelist);
            setWhitelistUsers(Array.isArray(parsed) ? parsed : []);
          } catch (e) {
            setWhitelistUsers([]);
          }
        }

        console.log("✅ Maintenance check complete:", {
          mode: isMaintenance,
          whitelistCount: settings.maintenance_whitelist
            ? JSON.parse(settings.maintenance_whitelist || "[]").length
            : 0,
        });
      } catch (error) {
        console.error("❌ Error in maintenance check:", error);
      } finally {
        setMaintenanceLoading(false);
      }
    };

    checkMaintenance();

    // Realtime subscription
    const subscription = supabase
      .channel("maintenance-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "school_settings",
          filter: "setting_key=in.(maintenance_mode,maintenance_message,maintenance_whitelist)",
        },
        () => {
          console.log("🔔 Maintenance setting changed");
          checkMaintenance();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ✅ Loading state check
  const isLoading = loading || maintenanceLoading || roleLoading;

  console.log("🎯 Loading check:", {
    loading,
    maintenanceLoading,
    roleLoading,
    isLoading,
    hasUser: !!user,
    userRole,
    homeroom_class_id: userFullData?.homeroom_class_id,
  });

  if (isLoading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center transition-colors duration-300 p-4 ${
          darkMode
            ? "bg-gradient-to-br from-gray-900 to-gray-800"
            : "bg-gradient-to-br from-blue-50 to-indigo-100"
        }`}
      >
        <div className="text-center">
          <div
            className={`animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-4 mx-auto mb-3 sm:mb-4 transition-colors ${
              darkMode ? "border-blue-400" : "border-blue-600"
            }`}
          ></div>
          <p
            className={`text-sm sm:text-base font-medium transition-colors ${
              darkMode ? "text-gray-300" : "text-gray-600"
            }`}
          >
            Checking session...
          </p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    console.log("🚫 No user, redirecting to login");
    return <Navigate to="/" />;
  }

  // 🔥 MAINTENANCE MODE CHECK
  const isWhitelisted = whitelistUsers.some((u) => u.id === user?.id);

  console.log("🔐 Maintenance Check:", {
    maintenanceMode,
    userId: user?.id,
    username: user?.username,
    userRole,
    isWhitelisted,
    shouldBlock: maintenanceMode && userRole !== "admin" && !isWhitelisted,
  });

  if (maintenanceMode && userRole !== "admin" && !isWhitelisted) {
    console.log(`🔴 User ${user?.username} BLOCKED by maintenance`);
    return <MaintenancePage message={maintenanceMessage} />;
  }

  if (maintenanceMode && (userRole === "admin" || isWhitelisted)) {
    console.log(`✅ User ${user?.username} BYPASSED maintenance (${userRole})`);
  }

  // Role-based access check
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    console.log(`🔴 User ${user.username} tidak memiliki akses ke halaman ini`);
    return (
      <div
        className={`min-h-screen flex items-center justify-center transition-colors duration-300 p-4 ${
          darkMode
            ? "bg-gradient-to-br from-gray-900 to-gray-800"
            : "bg-gradient-to-br from-blue-50 to-indigo-100"
        }`}
      >
        <div className="text-center max-w-md mx-auto">
          <div
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 transition-colors ${
              darkMode ? "bg-red-900/30" : "bg-red-100"
            }`}
          >
            <svg
              className={`w-7 h-7 sm:w-8 sm:h-8 ${darkMode ? "text-red-400" : "text-red-600"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-9a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <h2
            className={`text-lg sm:text-xl font-bold mb-2 transition-colors ${
              darkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Akses Ditolak
          </h2>
          <p
            className={`text-sm sm:text-base mb-4 sm:mb-6 transition-colors ${
              darkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Anda tidak memiliki izin untuk mengakses halaman ini.
          </p>
          <button
            onClick={() => (window.location.href = "/dashboard")}
            className={`w-full sm:w-auto px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-all duration-200 touch-manipulation active:scale-95 ${
              darkMode
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ✅ Wali Kelas Check
  if (requireWaliKelas && !canAccessWaliKelasRoute(userFullData)) {
    console.log(`🔴 User ${user.username} bukan Wali Kelas, blocked`);

    const userStatus = userFullData?.homeroom_class_id
      ? `Homeroom Class: ${userFullData.homeroom_class_id}`
      : "Not a homeroom teacher";

    console.log("📊 User status:", {
      role: userFullData?.role,
      homeroom_class_id: userFullData?.homeroom_class_id,
      userStatus,
    });

    return (
      <div
        className={`min-h-screen flex items-center justify-center transition-colors duration-300 p-4 ${
          darkMode
            ? "bg-gradient-to-br from-gray-900 to-gray-800"
            : "bg-gradient-to-br from-blue-50 to-indigo-100"
        }`}
      >
        <div className="text-center max-w-md mx-auto">
          <div
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 transition-colors ${
              darkMode ? "bg-yellow-900/30" : "bg-yellow-100"
            }`}
          >
            <svg
              className={`w-7 h-7 sm:w-8 sm:h-8 ${
                darkMode ? "text-yellow-400" : "text-yellow-600"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <h2
            className={`text-lg sm:text-xl font-bold mb-2 transition-colors ${
              darkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Akses Khusus Wali Kelas
          </h2>
          <p
            className={`text-sm sm:text-base mb-4 sm:mb-6 transition-colors ${
              darkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Halaman ini hanya dapat diakses oleh Wali Kelas atau Admin.
            {userFullData?.role === "teacher" && userFullData?.homeroom_class_id === null && (
              <span className="block mt-2 text-xs italic">(Status Anda: Guru Mapel)</span>
            )}
          </p>
          <button
            onClick={() => (window.location.href = "/era-dashboard-teacher")}
            className={`w-full sm:w-auto px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-all duration-200 touch-manipulation active:scale-95 ${
              darkMode
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            Kembali ke Dashboard Guru
          </button>
        </div>
      </div>
    );
  }

  console.log("✅ All checks passed, rendering children");
  return children;
};

function App() {
  // ========== STATE ==========
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("info");
  const [showToast, setShowToast] = useState(false);

  // 🌙 DARK MODE STATE
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved === "true";
  });

  // 🌙 DARK MODE EFFECT - Instant update
  useEffect(() => {
    localStorage.setItem("darkMode", darkMode);

    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // 🌙 TOGGLE DARK MODE HANDLER - Instant toggle
  const handleToggleDarkMode = useCallback(() => {
    setDarkMode((prev) => !prev);
  }, []);

  // ========== 1. CHECK SESSION DARI localStorage ==========
  useEffect(() => {
    const checkSession = () => {
      try {
        const storedUser = localStorage.getItem("user");

        if (!storedUser) {
          setLoading(false);
          return;
        }

        const userData = JSON.parse(storedUser);

        if (userData.expiryTime) {
          const currentTime = Date.now();
          if (currentTime > userData.expiryTime) {
            console.log("⏰ Session expired");
            localStorage.removeItem("user");
            localStorage.removeItem("rememberMe");
            setUser(null);
            handleShowToast("Sesi Anda telah berakhir. Silakan login kembali.", "warning");
            setLoading(false);
            return;
          }
        }

        setUser(userData);
      } catch (err) {
        console.error("❌ Error parsing stored user:", err);
        localStorage.removeItem("user");
        localStorage.removeItem("rememberMe");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  // ========== 2. AUTO HIDE TOAST ==========
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
        setToastMessage("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // ========== 3. KEYBOARD SHORTCUT: Ctrl + Shift + M (ADMIN PANEL) ==========
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === "M") {
        e.preventDefault();
        window.location.href = "/secret-admin-panel-2024";
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  // ========== 4. HANDLERS ==========
  const handleLogin = useCallback((userData, rememberMe = false) => {
    const loginTime = Date.now();
    const expiryTime = rememberMe
      ? loginTime + 30 * 24 * 60 * 60 * 1000
      : loginTime + 24 * 60 * 60 * 1000;

    const sessionData = {
      ...userData,
      loginTime: loginTime,
      expiryTime: expiryTime,
    };

    setUser(sessionData);
    localStorage.setItem("user", JSON.stringify(sessionData));

    if (rememberMe) {
      localStorage.setItem("rememberMe", "true");
      console.log("✅ Remember Me enabled - session valid for 30 days");
    } else {
      localStorage.setItem("rememberMe", "false");
      console.log("✅ Session valid for 24 hours");
    }
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("rememberMe");
    if (user?.id) {
      sessionStorage.removeItem(`welcomeShown_${user.id}`);
    }
    handleShowToast("Logout berhasil! 👋", "info");
  }, [user]);

  const handleShowToast = useCallback((message, type = "info") => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  }, []);

  // ✅ Toast styling dengan dark mode dan responsive
  const getToastStyle = () => {
    const baseStyle =
      "fixed top-3 right-3 sm:top-4 sm:right-4 text-white px-4 py-2.5 sm:px-6 sm:py-3 rounded-lg shadow-lg z-50 transition-all duration-300 transform max-w-[calc(100vw-1.5rem)] sm:max-w-md";

    const darkModeClass = darkMode ? "ring-2 ring-white/20" : "";

    switch (toastType) {
      case "success":
        return `${baseStyle} ${darkMode ? "bg-green-600" : "bg-green-500"} ${darkModeClass}`;
      case "error":
        return `${baseStyle} ${darkMode ? "bg-red-600" : "bg-red-500"} ${darkModeClass}`;
      case "warning":
        return `${baseStyle} ${darkMode ? "bg-yellow-600" : "bg-yellow-500"} ${darkModeClass}`;
      default:
        return `${baseStyle} ${darkMode ? "bg-blue-600" : "bg-blue-500"} ${darkModeClass}`;
    }
  };

  // ========== 5. LAYOUT WRAPPER (WITH DARK MODE) ==========
  const LayoutWrapper = useCallback(
    ({ children }) => (
      <Layout
        user={user}
        onLogout={handleLogout}
        darkMode={darkMode}
        onToggleDarkMode={handleToggleDarkMode}
      >
        {children}
      </Layout>
    ),
    [user, handleLogout, darkMode, handleToggleDarkMode]
  );

  // ========== 6. RENDER ADMIN PANEL ==========
  const currentPath = window.location.pathname;
  if (currentPath === "/secret-admin-panel-2024") {
    return (
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route path="/secret-admin-panel-2024" element={<AdminPanel darkMode={darkMode} />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // ========== 7. RENDER MAIN APP ==========
  if (loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center transition-colors duration-300 p-4 ${
          darkMode
            ? "bg-gradient-to-br from-gray-900 to-gray-800"
            : "bg-gradient-to-br from-blue-50 to-indigo-100"
        }`}
      >
        <div className="text-center">
          <div
            className={`animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-4 mx-auto mb-3 sm:mb-4 transition-colors ${
              darkMode ? "border-blue-400" : "border-blue-600"
            }`}
          ></div>
          <p
            className={`text-sm sm:text-base font-medium transition-colors ${
              darkMode ? "text-gray-300" : "text-gray-600"
            }`}
          >
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      {/* ✅ Toast Notification dengan Dark Mode & Responsive */}
      {showToast && (
        <div className={getToastStyle()}>
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg flex-shrink-0">
              {toastType === "success" && "✅"}
              {toastType === "error" && "❌"}
              {toastType === "warning" && "⚠️"}
              {toastType === "info" && "ℹ️"}
            </span>
            <span className="font-medium text-sm sm:text-base break-words">{toastMessage}</span>
          </div>
        </div>
      )}

      <Routes>
        {/* ========== PUBLIC ROUTES ========== */}
        <Route
          path="/"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login
                onLogin={handleLogin}
                onShowToast={handleShowToast}
                darkMode={darkMode}
                onToggleDarkMode={handleToggleDarkMode}
              />
            )
          }
        />

        {/* ========== PROTECTED ROUTES ========== */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute
              user={user}
              loading={loading}
              darkMode={darkMode}
              onShowToast={handleShowToast}
            >
              <LayoutWrapper>
                <Dashboard user={user} onShowToast={handleShowToast} darkMode={darkMode} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/teachers"
          element={
            <ProtectedRoute
              user={user}
              loading={loading}
              darkMode={darkMode}
              onShowToast={handleShowToast}
            >
              <LayoutWrapper>
                <Teachers user={user} onShowToast={handleShowToast} darkMode={darkMode} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/classes"
          element={
            <ProtectedRoute
              user={user}
              loading={loading}
              darkMode={darkMode}
              onShowToast={handleShowToast}
            >
              <LayoutWrapper>
                <Classes user={user} onShowToast={handleShowToast} darkMode={darkMode} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/students"
          element={
            <ProtectedRoute
              user={user}
              loading={loading}
              darkMode={darkMode}
              onShowToast={handleShowToast}
            >
              <LayoutWrapper>
                <Students user={user} onShowToast={handleShowToast} darkMode={darkMode} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/attendance"
          element={
            <ProtectedRoute
              user={user}
              loading={loading}
              darkMode={darkMode}
              onShowToast={handleShowToast}
            >
              <LayoutWrapper>
                <AttendanceMain user={user} onShowToast={handleShowToast} darkMode={darkMode} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/attendance-teacher"
          element={
            <ProtectedRoute
              user={user}
              loading={loading}
              darkMode={darkMode}
              onShowToast={handleShowToast}
              allowedRoles={["teacher", "guru_bk", "admin"]}
            >
              <LayoutWrapper>
                <TeacherAttendance user={user} onShowToast={handleShowToast} darkMode={darkMode} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        {/* ========== NILAI SISWA (TAB INPUT NILAI & NILAI KATROL) ========== */}
        <Route
          path="/nilai-siswa"
          element={
            <ProtectedRoute
              user={user}
              loading={loading}
              darkMode={darkMode}
              onShowToast={handleShowToast}
            >
              <LayoutWrapper>
                <GradeMain user={user} onShowToast={handleShowToast} darkMode={darkMode} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/attendance-management"
          element={
            <ProtectedRoute
              user={user}
              loading={loading}
              darkMode={darkMode}
              onShowToast={handleShowToast}
              allowedRoles={["admin"]}
            >
              <LayoutWrapper>
                <AttendanceManagement
                  user={user}
                  onShowToast={handleShowToast}
                  darkMode={darkMode}
                />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/jadwal-saya"
          element={
            <ProtectedRoute
              user={user}
              loading={loading}
              darkMode={darkMode}
              onShowToast={handleShowToast}
            >
              <LayoutWrapper>
                <TeacherSchedule user={user} onShowToast={handleShowToast} darkMode={darkMode} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/catatan-siswa"
          element={
            <ProtectedRoute
              user={user}
              loading={loading}
              darkMode={darkMode}
              onShowToast={handleShowToast}
            >
              <LayoutWrapper>
                <CatatanSiswa user={user} onShowToast={handleShowToast} darkMode={darkMode} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/konseling"
          element={
            <ProtectedRoute
              user={user}
              loading={loading}
              darkMode={darkMode}
              onShowToast={handleShowToast}
            >
              <LayoutWrapper>
                <Konseling user={user} onShowToast={handleShowToast} darkMode={darkMode} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute
              user={user}
              loading={loading}
              darkMode={darkMode}
              onShowToast={handleShowToast}
            >
              <LayoutWrapper>
                <Reports user={user} onShowToast={handleShowToast} darkMode={darkMode} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/spmb"
          element={
            <ProtectedRoute
              user={user}
              loading={loading}
              darkMode={darkMode}
              onShowToast={handleShowToast}
            >
              <LayoutWrapper>
                <SPMB user={user} onShowToast={handleShowToast} darkMode={darkMode} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute
              user={user}
              loading={loading}
              darkMode={darkMode}
              onShowToast={handleShowToast}
            >
              <LayoutWrapper>
                <Setting user={user} onShowToast={handleShowToast} darkMode={darkMode} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/monitor-sistem"
          element={
            <ProtectedRoute
              user={user}
              loading={loading}
              darkMode={darkMode}
              onShowToast={handleShowToast}
            >
              <LayoutWrapper>
                <MonitorSistem user={user} onShowToast={handleShowToast} darkMode={darkMode} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        {/* ========== E-RAPORT ROUTES - DIUPDATE SESUAI DOKUMENTASI ========== */}

        {/* Dashboard Admin */}
        <Route
          path="/era-dashboard-admin"
          element={
            <ProtectedRoute
              user={user}
              loading={loading}
              darkMode={darkMode}
              onShowToast={handleShowToast}
              allowedRoles={["admin"]}
            >
              <LayoutWrapper>
                <DashboardAdmin user={user} onShowToast={handleShowToast} darkMode={darkMode} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        {/* Dashboard Guru Mapel */}
        <Route
          path="/era-dashboard-teacher"
          element={
            <ProtectedRoute
              user={user}
              loading={loading}
              darkMode={darkMode}
              onShowToast={handleShowToast}
              allowedRoles={["teacher"]}
            >
              <LayoutWrapper>
                <DashboardTeacher user={user} onShowToast={handleShowToast} darkMode={darkMode} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        {/* Dashboard Wali Kelas */}
        <Route
          path="/era-dashboard-homeroom"
          element={
            <ProtectedRoute
              user={user}
              loading={loading}
              darkMode={darkMode}
              onShowToast={handleShowToast}
              allowedRoles={["teacher"]}
              requireWaliKelas={true}
            >
              <LayoutWrapper>
                <DashboardHomeroomTeacher
                  user={user}
                  onShowToast={handleShowToast}
                  darkMode={darkMode}
                />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        {/* Input TP - SEMUA GURU */}
        <Route
          path="/era-input-tp"
          element={
            <ProtectedRoute
              user={user}
              loading={loading}
              darkMode={darkMode}
              onShowToast={handleShowToast}
              allowedRoles={["admin", "teacher"]}
            >
              <LayoutWrapper>
                <InputTP user={user} onShowToast={handleShowToast} darkMode={darkMode} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        {/* Input Nilai - SEMUA GURU */}
        <Route
          path="/era-input-nilai"
          element={
            <ProtectedRoute
              user={user}
              loading={loading}
              darkMode={darkMode}
              onShowToast={handleShowToast}
              allowedRoles={["admin", "teacher"]}
            >
              <LayoutWrapper>
                <InputNilai user={user} onShowToast={handleShowToast} darkMode={darkMode} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        {/* 🆕 Cek Nilai - SEMUA GURU (Menu baru) */}
        <Route
          path="/era-cek-nilai"
          element={
            <ProtectedRoute
              user={user}
              loading={loading}
              darkMode={darkMode}
              onShowToast={handleShowToast}
              allowedRoles={["admin", "teacher"]}
            >
              <LayoutWrapper>
                <CekNilai user={user} onShowToast={handleShowToast} darkMode={darkMode} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        {/* Input Kehadiran - WALI KELAS ONLY */}
        <Route
          path="/era-input-kehadiran"
          element={
            <ProtectedRoute
              user={user}
              loading={loading}
              darkMode={darkMode}
              onShowToast={handleShowToast}
              allowedRoles={["teacher"]}
              requireWaliKelas={true}
            >
              <LayoutWrapper>
                <InputKehadiran user={user} onShowToast={handleShowToast} darkMode={darkMode} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        {/* Input Catatan - WALI KELAS ONLY */}
        <Route
          path="/era-input-catatan"
          element={
            <ProtectedRoute
              user={user}
              loading={loading}
              darkMode={darkMode}
              onShowToast={handleShowToast}
              allowedRoles={["admin", "teacher"]}
              requireWaliKelas={true}
            >
              <LayoutWrapper>
                <InputCatatan user={user} onShowToast={handleShowToast} darkMode={darkMode} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        {/* Input Kokurikuler - ADMIN & WALI KELAS ONLY */}
        <Route
          path="/era-input-kokurikuler"
          element={
            <ProtectedRoute
              user={user}
              loading={loading}
              darkMode={darkMode}
              onShowToast={handleShowToast}
              allowedRoles={["admin", "teacher"]}
              requireWaliKelas={true}
            >
              <LayoutWrapper>
                <InputKokurikuler user={user} onShowToast={handleShowToast} darkMode={darkMode} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        {/* Input Ekstrakurikuler - ADMIN & WALI KELAS ONLY */}
        <Route
          path="/era-input-ekstrakurikuler"
          element={
            <ProtectedRoute
              user={user}
              loading={loading}
              darkMode={darkMode}
              onShowToast={handleShowToast}
              allowedRoles={["admin", "teacher"]}
              requireWaliKelas={true}
            >
              <LayoutWrapper>
                <InputEkstrakurikuler
                  user={user}
                  onShowToast={handleShowToast}
                  darkMode={darkMode}
                />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        {/* 🔄 Cek Status Nilai (dulu Cek Kelengkapan) - WALI KELAS ONLY */}
        <Route
          path="/era-cek-kelengkapan"
          element={
            <ProtectedRoute
              user={user}
              loading={loading}
              darkMode={darkMode}
              onShowToast={handleShowToast}
              allowedRoles={["teacher"]}
              requireWaliKelas={true}
            >
              <LayoutWrapper>
                <CekStatusNilai user={user} onShowToast={handleShowToast} darkMode={darkMode} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        {/* Cetak Raport - WALI KELAS ONLY - GUNAKAN RaportPage */}
        <Route
          path="/era-cetak-raport"
          element={
            <ProtectedRoute
              user={user}
              loading={loading}
              darkMode={darkMode}
              onShowToast={handleShowToast}
              allowedRoles={["teacher"]}
              requireWaliKelas={true}
            >
              <LayoutWrapper>
                <RaportPage user={user} onShowToast={handleShowToast} darkMode={darkMode} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        {/* ========== CATCH-ALL ROUTE ========== */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
