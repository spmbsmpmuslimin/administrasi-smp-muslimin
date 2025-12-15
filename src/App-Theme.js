import React, {
  useState,
  useCallback,
  useEffect,
  createContext,
  useMemo,
} from "react";
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
import GradesKatrol from "./pages/GradesKatrol";
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

// ========== 🎨 THEME SYSTEM IMPORTS ==========
import { THEMES, DEFAULT_THEME, STORAGE_KEY } from "./config/themeConfig";

// ========== 🎨 THEME CONTEXT ==========
export const ThemeContext = createContext({
  currentTheme: DEFAULT_THEME,
  setTheme: () => {},
  themes: THEMES,
  darkMode: false,
  toggleDarkMode: () => {},
});

// 🔥 PROTECTED ROUTE COMPONENT - WITH MAINTENANCE MODE
const ProtectedRoute = ({
  children,
  user,
  loading,
  darkMode,
  allowedRoles = [],
  onShowToast,
}) => {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [whitelistUsers, setWhitelistUsers] = useState([]);
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  // 🔥 Fetch user role dari database
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user?.id) {
        setUserRole(null);
        setMaintenanceLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        setUserRole(data?.role);
        console.log("👤 User role fetched:", data?.role);
      } catch (error) {
        console.error("Error fetching user role:", error);
        setUserRole(null);
      }
    };

    fetchUserRole();
  }, [user?.id]);

  // 🔥 Check maintenance mode
  useEffect(() => {
    const checkMaintenance = async () => {
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

        console.log("🔧 Maintenance check:", {
          mode: isMaintenance,
          whitelistCount: settings.maintenance_whitelist
            ? JSON.parse(settings.maintenance_whitelist || "[]").length
            : 0,
        });
      } catch (error) {
        console.error("Error checking maintenance mode:", error);
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
          filter:
            "setting_key=in.(maintenance_mode,maintenance_message,maintenance_whitelist)",
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

  // Loading state
  if (loading || maintenanceLoading || (user && userRole === null)) {
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

  // Not logged in
  if (!user) {
    return <Navigate to="/" />;
  }

  // 🔥 MAINTENANCE MODE CHECK
  const isWhitelisted = whitelistUsers.some((u) => u.id === user?.id);

  console.log("🔒 Maintenance Check:", {
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

  return children;
};

function App() {
  // ========== STATE ==========
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("info");
  const [showToast, setShowToast] = useState(false);

  // 🌙 DARK MODE STATE (EXISTING - KEEP AS IS)
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved === "true";
  });

  // ========== 🎨 NEW: THEME STATE (Color Theme) ==========
  const [currentTheme, setCurrentTheme] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    // If dark mode is on, default to 'dark', else 'blue' (your existing theme)
    if (!saved) {
      return darkMode ? "dark" : "blue";
    }
    return saved && THEMES[saved] ? saved : "blue"; // Default to blue to match your existing
  });

  // ========== 🎨 NEW: APPLY THEME CSS VARIABLES ==========
  useEffect(() => {
    const theme = THEMES[currentTheme];
    if (!theme) return;

    const root = document.documentElement;

    // Apply each color variable
    Object.entries(theme.colors).forEach(([key, value]) => {
      const cssVar = key.replace(/([A-Z])/g, "-$1").toLowerCase();
      root.style.setProperty(`--color-${cssVar}`, value);
    });

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, currentTheme);

    console.log("🎨 Theme applied:", theme.name);
  }, [currentTheme]);

  // 🌙 DARK MODE EFFECT - Instant update (EXISTING - KEEP AS IS)
  useEffect(() => {
    localStorage.setItem("darkMode", darkMode);

    if (darkMode) {
      document.documentElement.classList.add("dark");
      // Auto switch to dark theme if not already
      if (currentTheme !== "dark") {
        setCurrentTheme("dark");
      }
    } else {
      document.documentElement.classList.remove("dark");
      // Auto switch to blue theme if not already (keep your existing blue)
      if (currentTheme === "dark") {
        setCurrentTheme("blue");
      }
    }
  }, [darkMode, currentTheme]);

  // 🌙 TOGGLE DARK MODE HANDLER - Instant toggle (EXISTING - KEEP AS IS)
  const handleToggleDarkMode = useCallback(() => {
    setDarkMode((prev) => !prev);
  }, []);

  // ========== 🎨 NEW: SET THEME FUNCTION ==========
  const handleSetTheme = useCallback(
    (themeKey) => {
      if (!THEMES[themeKey]) {
        console.warn(`Theme "${themeKey}" not found`);
        return;
      }

      console.log("🎨 Switching theme to:", themeKey);
      setCurrentTheme(themeKey);

      // Sync dark mode state with theme
      if (themeKey === "dark" && !darkMode) {
        setDarkMode(true);
        localStorage.setItem("darkMode", "true");
      } else if (themeKey !== "dark" && darkMode) {
        setDarkMode(false);
        localStorage.setItem("darkMode", "false");
      }
    },
    [darkMode]
  );

  // ========== 1. CHECK SESSION DARI localStorage (EXISTING - KEEP AS IS) ==========
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

  // ========== 2. AUTO HIDE TOAST (EXISTING - KEEP AS IS) ==========
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
        setToastMessage("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // ========== 3. KEYBOARD SHORTCUT: Ctrl + Shift + M (ADMIN PANEL) (EXISTING - KEEP AS IS) ==========
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

  // ========== 4. HANDLERS (EXISTING - KEEP AS IS) ==========
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
    // Clear welcome toast flag
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

  // ✅ FIXED: Toast styling dengan dark mode dan responsive (EXISTING - KEEP AS IS)
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

  // ========== 🎨 NEW: THEME CONTEXT VALUE ==========
  const themeContextValue = useMemo(
    () => ({
      currentTheme,
      setTheme: handleSetTheme,
      themes: THEMES,
      darkMode,
      toggleDarkMode: handleToggleDarkMode,
    }),
    [currentTheme, handleSetTheme, darkMode, handleToggleDarkMode]
  );

  // ========== 5. LAYOUT WRAPPER (WITH DARK MODE) (EXISTING - KEEP AS IS) ==========
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

  // ========== 6. RENDER ADMIN PANEL (EXISTING - KEEP AS IS) ==========
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

  // ========== 7. RENDER MAIN APP (EXISTING - KEEP AS IS) ==========
  if (loading) {
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
    <ThemeContext.Provider value={themeContextValue}>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}>
        {/* ✅ FIXED: Toast Notification dengan Dark Mode & Responsive (EXISTING - KEEP AS IS) */}
        {showToast && (
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
          {/* ========== PUBLIC ROUTES (EXISTING - KEEP AS IS) ========== */}
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

          {/* ========== PROTECTED ROUTES (EXISTING - KEEP AS IS) ========== */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute
                user={user}
                loading={loading}
                darkMode={darkMode}
                onShowToast={handleShowToast}>
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
              <ProtectedRoute
                user={user}
                loading={loading}
                darkMode={darkMode}
                onShowToast={handleShowToast}>
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
              <ProtectedRoute
                user={user}
                loading={loading}
                darkMode={darkMode}
                onShowToast={handleShowToast}>
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
              <ProtectedRoute
                user={user}
                loading={loading}
                darkMode={darkMode}
                onShowToast={handleShowToast}>
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
              <ProtectedRoute
                user={user}
                loading={loading}
                darkMode={darkMode}
                onShowToast={handleShowToast}>
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
            path="/grades-katrol"
            element={
              <ProtectedRoute
                user={user}
                loading={loading}
                darkMode={darkMode}
                onShowToast={handleShowToast}>
                <LayoutWrapper>
                  <GradesKatrol
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
              <ProtectedRoute
                user={user}
                loading={loading}
                darkMode={darkMode}
                onShowToast={handleShowToast}
                allowedRoles={["teacher", "guru_bk", "admin"]}>
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
              <ProtectedRoute
                user={user}
                loading={loading}
                darkMode={darkMode}
                onShowToast={handleShowToast}
                allowedRoles={["admin"]}>
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
              <ProtectedRoute
                user={user}
                loading={loading}
                darkMode={darkMode}
                onShowToast={handleShowToast}>
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
              <ProtectedRoute
                user={user}
                loading={loading}
                darkMode={darkMode}
                onShowToast={handleShowToast}>
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
              <ProtectedRoute
                user={user}
                loading={loading}
                darkMode={darkMode}
                onShowToast={handleShowToast}>
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
              <ProtectedRoute
                user={user}
                loading={loading}
                darkMode={darkMode}
                onShowToast={handleShowToast}>
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
              <ProtectedRoute
                user={user}
                loading={loading}
                darkMode={darkMode}
                onShowToast={handleShowToast}>
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
              <ProtectedRoute
                user={user}
                loading={loading}
                darkMode={darkMode}
                onShowToast={handleShowToast}>
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
              <ProtectedRoute
                user={user}
                loading={loading}
                darkMode={darkMode}
                onShowToast={handleShowToast}>
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
              <ProtectedRoute
                user={user}
                loading={loading}
                darkMode={darkMode}
                onShowToast={handleShowToast}>
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
    </ThemeContext.Provider>
  );
}

export default App;
