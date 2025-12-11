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
import Attendance from "./pages/attendance/Attendance";
import AttendanceManagement from "./pages/attendance/AttendanceManagement";
import Grades from "./pages/Grades";
import TeacherSchedule from "./pages/TeacherSchedule";
import CatatanSiswa from "./pages/CatatanSiswa";
import Setting from "./setting/Setting";

// Import modules
import Konseling from "./konseling/Konseling";
import Reports from "./reports/Reports";
import SPMB from "./spmb/SPMB";
import MonitorSistem from "./system/MonitorSistem";

// Import components
import MaintenancePage from "./setting/MaintenancePage";
import AdminPanel from "./setting/AdminPanel";

// Import Presensi Guru
import TeacherAttendance from "./attendance-teacher/TeacherAttendance";

function App() {
  // ========== STATE ==========
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("info");
  const [showToast, setShowToast] = useState(false);

  // 🌙 DARK MODE STATE
  const [darkMode, setDarkMode] = useState(() => {
    // Load dari localStorage atau default false
    const saved = localStorage.getItem("darkMode");
    return saved === "true";
  });

  // ========== MAINTENANCE MODE STATE ==========
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);
  const [whitelistUsers, setWhitelistUsers] = useState([]);

  // 🌙 DARK MODE EFFECT - Optimized dengan requestAnimationFrame
  useEffect(() => {
    // Delay state update untuk smooth transition
    requestAnimationFrame(() => {
      localStorage.setItem("darkMode", darkMode);

      if (darkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    });
  }, [darkMode]);

  // 🌙 TOGGLE DARK MODE HANDLER - Optimized dengan debounce
  const [isTogglingDarkMode, setIsTogglingDarkMode] = useState(false);

  const handleToggleDarkMode = useCallback(() => {
    // Prevent spam toggle
    if (isTogglingDarkMode) return;

    setIsTogglingDarkMode(true);

    // Toggle dengan slight delay untuk smooth transition
    requestAnimationFrame(() => {
      setDarkMode((prev) => !prev);

      // Reset toggle lock after transition
      setTimeout(() => {
        setIsTogglingDarkMode(false);
      }, 300);
    });
  }, [isTogglingDarkMode]);

  // ========== 1. CHECK MAINTENANCE STATUS ==========
  useEffect(() => {
    checkMaintenanceStatus();

    const subscription = supabase
      .channel("maintenance-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "school_settings",
          filter:
            "setting_key=in.(maintenance_mode,maintenance_message,maintenance_whitelist)",
        },
        (payload) => {
          console.log("📡 Maintenance settings changed:", payload);
          loadMaintenanceSettings();
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, []);

  const checkMaintenanceStatus = async () => {
    try {
      await loadMaintenanceSettings();
    } catch (error) {
      console.error("❌ Error checking maintenance:", error);
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const loadMaintenanceSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("school_settings")
        .select("setting_key, setting_value")
        .in("setting_key", [
          "maintenance_mode",
          "maintenance_message",
          "maintenance_whitelist",
        ]);

      if (error) throw error;

      const settings = {};
      data?.forEach((item) => {
        settings[item.setting_key] = item.setting_value;
      });

      const isMaintenance =
        settings.maintenance_mode === "true" ||
        settings.maintenance_mode === true;

      setIsMaintenanceMode(isMaintenance);
      setMaintenanceMessage(
        settings.maintenance_message ||
          "Aplikasi sedang dalam maintenance. Kami akan kembali segera!"
      );

      if (settings.maintenance_whitelist) {
        try {
          const parsed = JSON.parse(settings.maintenance_whitelist);
          setWhitelistUsers(Array.isArray(parsed) ? parsed : []);
          console.log("✅ Whitelist loaded:", parsed);
        } catch (e) {
          console.error("❌ Error parsing whitelist:", e);
          setWhitelistUsers([]);
        }
      } else {
        setWhitelistUsers([]);
      }
    } catch (error) {
      console.error("❌ Error loading maintenance settings:", error);
    }
  };

  // ========== 2. CHECK SESSION DARI localStorage ==========
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
            handleShowToast(
              "Sesi Anda telah berakhir. Silakan login kembali.",
              "warning"
            );
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

  // ========== 3. AUTO HIDE TOAST ==========
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
        setToastMessage("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // ========== 4. KEYBOARD SHORTCUT: Ctrl + Shift + M (ADMIN PANEL) ==========
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

  // ========== 5. HANDLERS ==========
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

    handleShowToast(`Selamat datang, ${userData.full_name}! 👋`, "success");
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("rememberMe");
    handleShowToast("Logout berhasil! 👋", "info");
  }, []);

  const handleShowToast = useCallback((message, type = "info") => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  }, []);

  // ✅ FIXED: Toast styling dengan dark mode dan responsive
  const getToastStyle = () => {
    const baseStyle =
      "fixed top-3 right-3 sm:top-4 sm:right-4 text-white px-4 py-2.5 sm:px-6 sm:py-3 rounded-lg shadow-lg z-50 transition-all duration-300 transform max-w-[calc(100vw-1.5rem)] sm:max-w-md";

    const darkModeClass = darkMode ? "ring-2 ring-white/20" : "";

    switch (toastType) {
      case "success":
        return `${baseStyle} ${
          darkMode ? "bg-green-600" : "bg-green-500"
        } ${darkModeClass}`;
      case "error":
        return `${baseStyle} ${
          darkMode ? "bg-red-600" : "bg-red-500"
        } ${darkModeClass}`;
      case "warning":
        return `${baseStyle} ${
          darkMode ? "bg-yellow-600" : "bg-yellow-500"
        } ${darkModeClass}`;
      default:
        return `${baseStyle} ${
          darkMode ? "bg-blue-600" : "bg-blue-500"
        } ${darkModeClass}`;
    }
  };

  const isUserWhitelisted = useCallback(
    (userId) => {
      return whitelistUsers.some((u) => u.id === userId);
    },
    [whitelistUsers]
  );

  // ========== 6. PROTECTED ROUTE COMPONENT ==========
  const ProtectedRoute = useCallback(
    ({ children, allowedRoles = [] }) => {
      if (loading || maintenanceLoading) {
        return (
          <div
            className={`min-h-screen flex items-center justify-center transition-colors duration-300 p-4 ${
              darkMode
                ? "bg-gradient-to-br from-gray-900 to-gray-800"
                : "bg-gradient-to-br from-blue-50 to-indigo-100"
            }`}>
            <div className="text-center">
              <div
                className={`animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-4 mx-auto mb-3 sm:mb-4 transition-colors ${
                  darkMode ? "border-blue-400" : "border-blue-600"
                }`}></div>
              <p
                className={`text-sm sm:text-base font-medium transition-colors ${
                  darkMode ? "text-gray-300" : "text-gray-600"
                }`}>
                Checking session...
              </p>
            </div>
          </div>
        );
      }

      if (!user) {
        return <Navigate to="/" />;
      }

      // Role-based access check
      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        console.log(
          `🔴 User ${user.username} tidak memiliki akses ke halaman ini`
        );
        return (
          <div
            className={`min-h-screen flex items-center justify-center transition-colors duration-300 p-4 ${
              darkMode
                ? "bg-gradient-to-br from-gray-900 to-gray-800"
                : "bg-gradient-to-br from-blue-50 to-indigo-100"
            }`}>
            <div className="text-center max-w-md mx-auto">
              <div
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 transition-colors ${
                  darkMode ? "bg-red-900/30" : "bg-red-100"
                }`}>
                <svg
                  className={`w-7 h-7 sm:w-8 sm:h-8 ${
                    darkMode ? "text-red-400" : "text-red-600"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
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
                }`}>
                Akses Ditolak
              </h2>
              <p
                className={`text-sm sm:text-base mb-4 sm:mb-6 transition-colors ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}>
                Anda tidak memiliki izin untuk mengakses halaman ini.
              </p>
              <button
                onClick={() => (window.location.href = "/dashboard")}
                className={`w-full sm:w-auto px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-all duration-200 touch-manipulation active:scale-95 ${
                  darkMode
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}>
                Kembali ke Dashboard
              </button>
            </div>
          </div>
        );
      }

      // Maintenance check with whitelist
      const canAccess =
        !isMaintenanceMode ||
        user.role === "admin" ||
        isUserWhitelisted(user.id);

      if (!canAccess) {
        console.log(`🔴 User ${user.username} blocked by maintenance mode`);
        return (
          <MaintenancePage message={maintenanceMessage} darkMode={darkMode} />
        );
      }

      if (isMaintenanceMode && canAccess) {
        if (user.role === "admin") {
          console.log(`✅ Admin ${user.username} bypassed maintenance`);
        } else if (isUserWhitelisted(user.id)) {
          console.log(
            `✅ Whitelisted user ${user.username} bypassed maintenance`
          );
        }
      }

      return children;
    },
    [
      user,
      loading,
      maintenanceLoading,
      isMaintenanceMode,
      maintenanceMessage,
      isUserWhitelisted,
      darkMode,
    ]
  );

  // ========== 7. LAYOUT WRAPPER (WITH DARK MODE) ==========
  const LayoutWrapper = useCallback(
    ({ children }) => (
      <Layout
        user={user}
        onLogout={handleLogout}
        darkMode={darkMode}
        onToggleDarkMode={handleToggleDarkMode}>
        {children}
      </Layout>
    ),
    [user, handleLogout, darkMode, handleToggleDarkMode]
  );

  // ========== 8. RENDER ADMIN PANEL ==========
  const currentPath = window.location.pathname;
  if (currentPath === "/secret-admin-panel-2024") {
    return (
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}>
        <Routes>
          <Route
            path="/secret-admin-panel-2024"
            element={<AdminPanel darkMode={darkMode} />}
          />
        </Routes>
      </BrowserRouter>
    );
  }

  // ========== 9. RENDER MAIN APP ==========
  if (loading || maintenanceLoading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center transition-colors duration-300 p-4 ${
          darkMode
            ? "bg-gradient-to-br from-gray-900 to-gray-800"
            : "bg-gradient-to-br from-blue-50 to-indigo-100"
        }`}>
        <div className="text-center">
          <div
            className={`animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-4 mx-auto mb-3 sm:mb-4 transition-colors ${
              darkMode ? "border-blue-400" : "border-blue-600"
            }`}></div>
          <p
            className={`text-sm sm:text-base font-medium transition-colors ${
              darkMode ? "text-gray-300" : "text-gray-600"
            }`}>
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
      }}>
      {/* ✅ FIXED: Toast Notification dengan Dark Mode & Responsive */}
      {showToast && !isMaintenanceMode && (
        <div className={getToastStyle()}>
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg flex-shrink-0">
              {toastType === "success" && "✅"}
              {toastType === "error" && "❌"}
              {toastType === "warning" && "⚠️"}
              {toastType === "info" && "ℹ️"}
            </span>
            <span className="font-medium text-sm sm:text-base break-words">
              {toastMessage}
            </span>
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
            <ProtectedRoute>
              <LayoutWrapper>
                <Dashboard
                  user={user}
                  onShowToast={handleShowToast}
                  darkMode={darkMode}
                />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/teachers"
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <Teachers
                  user={user}
                  onShowToast={handleShowToast}
                  darkMode={darkMode}
                />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/classes"
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <Classes
                  user={user}
                  onShowToast={handleShowToast}
                  darkMode={darkMode}
                />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/students"
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <Students
                  user={user}
                  onShowToast={handleShowToast}
                  darkMode={darkMode}
                />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/attendance"
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <Attendance
                  user={user}
                  onShowToast={handleShowToast}
                  darkMode={darkMode}
                />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/attendance-teacher"
          element={
            <ProtectedRoute allowedRoles={["teacher", "guru_bk", "admin"]}>
              <LayoutWrapper>
                <TeacherAttendance
                  user={user}
                  onShowToast={handleShowToast}
                  darkMode={darkMode}
                />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/attendance-management"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
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
          path="/grades"
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <Grades
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
            <ProtectedRoute>
              <LayoutWrapper>
                <TeacherSchedule
                  user={user}
                  onShowToast={handleShowToast}
                  darkMode={darkMode}
                />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/catatan-siswa"
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <CatatanSiswa
                  user={user}
                  onShowToast={handleShowToast}
                  darkMode={darkMode}
                />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/konseling"
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <Konseling
                  user={user}
                  onShowToast={handleShowToast}
                  darkMode={darkMode}
                />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <Reports
                  user={user}
                  onShowToast={handleShowToast}
                  darkMode={darkMode}
                />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/spmb"
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <SPMB
                  user={user}
                  onShowToast={handleShowToast}
                  darkMode={darkMode}
                />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <Setting
                  user={user}
                  onShowToast={handleShowToast}
                  darkMode={darkMode}
                />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/monitor-sistem"
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <MonitorSistem
                  user={user}
                  onShowToast={handleShowToast}
                  darkMode={darkMode}
                />
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
