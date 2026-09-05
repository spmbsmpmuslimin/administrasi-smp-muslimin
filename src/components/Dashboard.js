// [file name]: components/Dashboard.js
// Dirender lewat menuConfig.js (path "/dashboard") DI DALAM Layout.js --
// sidebar, header, dan background halaman udah disediain Layout.js. Jadi
// komponen ini gak perlu bikin "min-h-screen" / background gradient sendiri,
// cukup pakai PageContainer & Card standar dari components/ui.
import React, { useState, useEffect, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { AlertTriangle, User, School, Home } from "lucide-react";
import AdminDashboard from "./AdminDashboard";
import HomeroomTeacherDashboard from "./HomeroomTeacherDashboard";
import TeacherDashboard from "./TeacherDashboard";
import GuruBKDashboard from "./GuruBKDashboard";
import PageContainer from "./ui/PageContainer";
import Card from "./ui/Card";
import { PageTitle, SectionTitle, Text, Muted, Subtitle } from "./ui/Typography";

// ⭐ FIX PENTING: `darkMode` sekarang WAJIB diterima sebagai PROP dari atas
// (App.js -> menuConfig.js `defaultProps(ctx)` -> komponen ini), BUKAN state
// lokal yang baca localStorage sendiri kayak sebelumnya.
//
// Sebelumnya ada DUA sumber kebenaran buat dark mode:
//   1) App.js/Layout.js -- dipakai toggle "Mode Gelap" di header
//   2) Dashboard.js ini -- localStorage sendiri, gak dengerin toggle di atas
// Dua-duanya bisa gak sinkron (misal user toggle dark mode di header, tapi
// Dashboard.js gak ikut berubah kalau gak remount). Sekarang cuma ada SATU
// sumber: App.js. Kalau ada page lain yang masih pola lama kayak ini
// (bikin state darkMode sendiri / baca localStorage sendiri), sebaiknya
// dibenerin juga pakai pola yang sama.
const Dashboard = ({ user, darkMode }) => {
  const [isLoading, setIsLoading] = useState(true);

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

  // Kasih jeda dikit biar gak "flash" pas pindah dashboard per-role
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // Debug info - only in development
  useEffect(() => {
    if (memoizedUser && process.env.NODE_ENV === "development") {
      console.log("🚀 Dashboard initialized:", memoizedUser);
    }
  }, [memoizedUser]);

  // ✅ Role mapping sesuai database SMP Muslimin Cililin
  const DashboardComponent = useMemo(() => {
    if (!memoizedUser) return null;

    const userRole = memoizedUser.role?.toLowerCase();

    // 1. ADMIN
    if (userRole === "admin") {
      return <AdminDashboard user={memoizedUser} darkMode={darkMode} />;
    }

    // 1b. TU (TATA USAHA) -- role di database sengaja tetap "tu" (bukan
    // "admin") biar staf TU tetap kehitung di "Data Guru & Staff", tapi
    // dari sisi akses dashboard & sidebar diperlakukan PERSIS kayak Admin.
    if (userRole === "tu") {
      return <AdminDashboard user={memoizedUser} darkMode={darkMode} />;
    }

    // 2. GURU BK/BP
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

    // 5. PETUGAS PERPUSTAKAAN -- belum ada dashboard khusus, langsung
    // arahkan ke halaman utama modul Perpustakaan (Katalog Buku).
    if (userRole === "petugas_perpus") {
      return <Navigate to="/katalog-buku" replace />;
    }

    // Unknown role
    return <UnknownRoleView user={memoizedUser} darkMode={darkMode} />;
  }, [memoizedUser, darkMode]);

  // Loading state -- ikut pola spinner "isNavigating" yang udah ada di
  // Layout.js, biar loading di mana pun di app kelihatan sama.
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32 sm:h-48">
        <div className="text-center">
          <div
            className={`inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 mb-2 ${
              darkMode ? "border-blue-400" : "border-blue-600"
            }`}
          />
          <Subtitle darkMode={darkMode}>Menyiapkan Dashboard...</Subtitle>
        </div>
      </div>
    );
  }

  // No user -- pola visual disamain kayak blok "Akses Ditolak" di Layout.js
  // (icon bulat + judul + deskripsi), biar semua pesan error di app konsisten.
  if (!memoizedUser) {
    return (
      <PageContainer darkMode={darkMode}>
        <Card
          darkMode={darkMode}
          className="flex flex-col items-center text-center h-64 justify-center"
        >
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${
              darkMode ? "bg-red-900/30" : "bg-red-100"
            }`}
          >
            <AlertTriangle className={darkMode ? "text-red-400" : "text-red-600"} size={32} />
          </div>
          <PageTitle darkMode={darkMode} className="mb-2">
            Akses Ditolak
          </PageTitle>
          <Text darkMode={darkMode}>Silakan login terlebih dahulu</Text>
        </Card>
      </PageContainer>
    );
  }

  return DashboardComponent;
};

// Component untuk unknown role
const UnknownRoleView = ({ user, darkMode }) => (
  <PageContainer darkMode={darkMode}>
    <Card darkMode={darkMode} noPadding className="overflow-hidden">
      {/* Header */}
      <div
        className={`border-b p-4 sm:p-6 text-center transition-colors ${
          darkMode
            ? "bg-gradient-to-r from-red-900/20 to-orange-900/20 border-red-800/30"
            : "bg-gradient-to-r from-red-50 to-orange-50 border-red-100"
        }`}
      >
        <AlertTriangle
          size={40}
          className={`mx-auto mb-3 ${darkMode ? "text-red-400" : "text-red-500"}`}
        />
        <PageTitle darkMode={darkMode} className="mb-2">
          Role Tidak Dikenali
        </PageTitle>
        <Text darkMode={darkMode}>Role "{user?.role}" tidak memiliki dashboard yang sesuai</Text>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        {/* User Info & Role Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div
            className={`rounded-lg p-3 sm:p-4 border transition-colors ${
              darkMode ? "bg-blue-900/20 border-blue-800/30" : "bg-blue-50 border-blue-100"
            }`}
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <User size={18} className={darkMode ? "text-blue-400" : "text-blue-600"} />
              <span
                className={`text-sm sm:text-base font-medium ${
                  darkMode ? "text-blue-300" : "text-blue-800"
                }`}
              >
                User Info
              </span>
            </div>
            <div
              className={`space-y-1 text-xs sm:text-sm ${
                darkMode ? "text-blue-300" : "text-blue-700"
              }`}
            >
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

          <div
            className={`rounded-lg p-3 sm:p-4 border transition-colors ${
              darkMode ? "bg-gray-700/50 border-gray-600" : "bg-gray-50 border-gray-100"
            }`}
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <School size={18} className={darkMode ? "text-gray-400" : "text-gray-600"} />
              <span
                className={`text-sm sm:text-base font-medium ${
                  darkMode ? "text-gray-200" : "text-gray-800"
                }`}
              >
                Role Info
              </span>
            </div>
            <div
              className={`space-y-1 text-xs sm:text-sm ${
                darkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
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
          <div
            className={`rounded-lg p-3 sm:p-4 border mb-4 sm:mb-6 transition-colors ${
              darkMode
                ? "bg-emerald-900/20 border-emerald-800/30"
                : "bg-emerald-50 border-emerald-100"
            }`}
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <Home size={18} className={darkMode ? "text-emerald-400" : "text-emerald-600"} />
              <span
                className={`text-sm sm:text-base font-medium ${
                  darkMode ? "text-emerald-300" : "text-emerald-800"
                }`}
              >
                Class Assignment
              </span>
            </div>
            <p
              className={`text-xs sm:text-sm break-words ${
                darkMode ? "text-emerald-300" : "text-emerald-700"
              }`}
            >
              <span className="font-medium">Homeroom Class ID:</span> {user.homeroom_class_id}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={() => window.location.reload()}
            className={`flex-1 font-medium py-3 px-4 rounded-lg transition-colors text-sm sm:text-base touch-manipulation active:scale-95 text-white ${
              darkMode ? "bg-blue-500 hover:bg-blue-600" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            Refresh Dashboard
          </button>

          <button
            onClick={() => {
              localStorage.removeItem("user");
              window.location.href = "/login";
            }}
            className={`flex-1 font-medium py-3 px-4 rounded-lg transition-colors text-sm sm:text-base touch-manipulation active:scale-95 ${
              darkMode
                ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            Logout
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-4 sm:mt-6 text-center space-y-1">
          <Muted darkMode={darkMode}>
            Hubungi administrator sistem untuk menyesuaikan role dashboard
          </Muted>
          <Muted darkMode={darkMode} className="block">
            Role yang didukung: admin, tu, teacher, guru_bk, petugas_perpus
          </Muted>
        </div>
      </div>
    </Card>
  </PageContainer>
);

export default Dashboard;
