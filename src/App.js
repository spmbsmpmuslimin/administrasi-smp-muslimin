import React, { useState, useCallback, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";

// Import pages dari folder pages
import Teachers from "./pages/Teachers";
import Classes from "./pages/Classes";
import Students from "./pages/Students";
import Attendance from "./pages/Attendance";
import Grades from "./pages/Grades";
import TeacherSchedule from "./pages/TeacherSchedule";
import CatatanSiswa from "./pages/CatatanSiswa";
import Setting from "./setting/setting";

// Import dari folder khusus
import Konseling from "./konseling/Konseling";
import Reports from "./reports/Reports";
import SPMB from "./spmb/SPMB";
import MonitorSistem from "./system/MonitorSistem";

function App() {
  const [user, setUser] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("info");
  const [showToast, setShowToast] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ FIXED: CHECK localStorage dengan EXPIRY CHECK
  useEffect(() => {
    const checkSession = () => {
      try {
        const storedUser = localStorage.getItem("user");

        if (!storedUser) {
          console.log("No stored user found");
          setLoading(false);
          return;
        }

        const userData = JSON.parse(storedUser);

        // ✅ CEK EXPIRY TIME
        if (userData.expiryTime) {
          const currentTime = Date.now();

          if (currentTime > userData.expiryTime) {
            // Session expired
            console.log("Session expired, clearing storage");
            localStorage.removeItem("user");
            localStorage.removeItem("rememberMe");
            setUser(null);
            setToastMessage("Sesi Anda telah berakhir. Silakan login kembali.");
            setToastType("warning");
            setShowToast(true);
            setLoading(false);
            return;
          }
        }

        // Session valid, restore user
        setUser(userData);
        console.log("User restored from localStorage:", userData.username);
      } catch (err) {
        console.error("Error parsing stored user:", err);
        localStorage.removeItem("user");
        localStorage.removeItem("rememberMe");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  // Auto hide toast setelah 3 detik
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
        setToastMessage("");
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // ✅ FIXED: Handler Login dengan EXPIRY TIME
  const handleLogin = useCallback((userData, rememberMe = false) => {
    // Generate expiry time
    const loginTime = Date.now();
    const expiryTime = rememberMe
      ? loginTime + 30 * 24 * 60 * 60 * 1000 // 30 hari jika remember me
      : loginTime + 24 * 60 * 60 * 1000; // 24 jam jika tidak

    // Add expiry info to userData
    const sessionData = {
      ...userData,
      loginTime: loginTime,
      expiryTime: expiryTime,
    };

    setUser(sessionData);

    // Simpan ke localStorage dengan expiry
    localStorage.setItem("user", JSON.stringify(sessionData));

    // Set rememberMe flag
    if (rememberMe) {
      localStorage.setItem("rememberMe", "true");
      console.log("Remember Me enabled - session valid for 30 days");
    } else {
      localStorage.setItem("rememberMe", "false");
      console.log("Session valid for 24 hours");
    }

    setToastMessage(`Selamat datang, ${userData.full_name}! 👋`);
    setToastType("success");
    setShowToast(true);
    console.log("User logged in:", userData.username);
  }, []);

  // Handler Logout
  const handleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("rememberMe");
    setToastMessage("Logout berhasil! 👋");
    setToastType("info");
    setShowToast(true);
    console.log("User logged out and storage cleared");
  }, []);

  const handleShowToast = useCallback((message, type = "info") => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    console.log(`Toast (${type}):`, message);
  }, []);

  // Toast styles berdasarkan type
  const getToastStyle = () => {
    const baseStyle =
      "fixed top-4 right-4 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 transform";

    switch (toastType) {
      case "success":
        return `${baseStyle} bg-green-500`;
      case "error":
        return `${baseStyle} bg-red-500`;
      case "warning":
        return `${baseStyle} bg-yellow-500`;
      default:
        return `${baseStyle} bg-blue-500`;
    }
  };

  // Protected Route
  const ProtectedRoute = useCallback(
    ({ children }) => {
      if (loading) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Checking session...</p>
            </div>
          </div>
        );
      }

      if (!user) {
        return <Navigate to="/" />;
      }
      return children;
    },
    [user, loading]
  );

  // Layout Wrapper
  const LayoutWrapper = useCallback(
    ({ children }) => (
      <Layout user={user} onLogout={handleLogout}>
        {children}
      </Layout>
    ),
    [user, handleLogout]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
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
      {/* Toast notification */}
      {showToast && (
        <div className={getToastStyle()}>
          <div className="flex items-center gap-2">
            {toastType === "success" && <span className="text-lg">✅</span>}
            {toastType === "error" && <span className="text-lg">❌</span>}
            {toastType === "warning" && <span className="text-lg">⚠️</span>}
            {toastType === "info" && <span className="text-lg">ℹ️</span>}
            <span className="font-medium">{toastMessage}</span>
          </div>
        </div>
      )}

      <Routes>
        {/* Public Route - Login */}
        <Route
          path="/"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login onLogin={handleLogin} onShowToast={handleShowToast} />
            )
          }
        />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <Dashboard user={user} onShowToast={handleShowToast} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/teachers"
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <Teachers user={user} onShowToast={handleShowToast} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/classes"
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <Classes user={user} onShowToast={handleShowToast} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/students"
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <Students user={user} onShowToast={handleShowToast} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/attendance"
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <Attendance user={user} onShowToast={handleShowToast} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/grades"
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <Grades user={user} onShowToast={handleShowToast} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/jadwal-saya"
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <TeacherSchedule user={user} onShowToast={handleShowToast} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/catatan-siswa"
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <CatatanSiswa user={user} onShowToast={handleShowToast} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/konseling"
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <Konseling user={user} onShowToast={handleShowToast} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <Reports user={user} onShowToast={handleShowToast} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/spmb"
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <SPMB user={user} onShowToast={handleShowToast} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <Setting user={user} onShowToast={handleShowToast} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/monitor-sistem"
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <MonitorSistem user={user} onShowToast={handleShowToast} />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
