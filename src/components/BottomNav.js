import { useState, useRef, useEffect } from "react";
import {
  Home,
  ClipboardCheck,
  UserCheck,
  BookOpenText,
  Settings,
  Activity,
  LogOut,
  MessageCircle,
  FileBarChart,
  MapPinned,
  User,
  Sun,
  Moon,
} from "lucide-react";

// ✅ NEW: Bottom navbar khusus mobile (lg:hidden) untuk app ini.
// Beda dari BottomNav.js versi app "Administrasi Bahasa Inggris":
//  - Manggil onNavigate(page) yang diteruskan dari Layout.js (handleNavigate),
//    BUKAN onPageChange, karena app ini pakai react-router (routes object).
//  - Page id disesuaikan sama routes di Layout.js: "attendance-teacher"
//    (bukan "teacherattendance"), "jurnal-harian" (bukan "teachingjournal").
//  - Dukung darkMode karena app ini punya toggle dark mode di header.
//  - ✅ ROLE-AWARE: menu beda buat guru vs admin (userRole dari Layout.js).
//    Guru: Home, P. Siswa, P. Guru, Jurnal, Akun
//    Admin: Home, P. Guru, Pengaturan, Monitor, Akun
//    Guru BK: Home, Konseling, Home Visit, Laporan, Akun
//  - ✅ NEW: Tombol "Keluar" diganti "Akun" — isinya dropdown yang sama
//    persis kayak Profile Dropdown di Layout.js (Profile, Pengaturan khusus
//    admin, toggle Mode Gelap, Logout). Karena posisinya di bottom navbar,
//    dropdown-nya muncul ke ATAS (bottom-full) bukan ke bawah.
export default function BottomNav({
  currentPage,
  onNavigate,
  onLogout,
  darkMode,
  userRole,
  user,
  onToggleDarkMode,
  onProfileClick,
}) {
  const isAdmin = userRole === "admin";
  const [accountOpen, setAccountOpen] = useState(false);
  const accountDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        accountDropdownRef.current &&
        !accountDropdownRef.current.contains(event.target)
      ) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const roleLabel =
    userRole === "admin"
      ? "Administrator"
      : userRole === "guru_bk"
        ? "Guru BK/BP"
        : userRole === "teacher" && user?.homeroom_class_id
          ? `Wali Kelas ${user.homeroom_class_id}`
          : userRole === "teacher"
            ? "Guru Mata Pelajaran"
            : "User";

  const teacherItems = [
    {
      id: "dashboard",
      label: "Home",
      icon: Home,
      bg: darkMode ? "bg-indigo-900/50" : "bg-indigo-100",
      iconColor: darkMode ? "text-indigo-300" : "text-indigo-600",
      activeBg: "bg-indigo-500",
    },
    {
      id: "attendance",
      label: "Presensi Siswa",
      icon: ClipboardCheck,
      bg: darkMode ? "bg-emerald-900/50" : "bg-emerald-100",
      iconColor: darkMode ? "text-emerald-300" : "text-emerald-600",
      activeBg: "bg-emerald-500",
    },
    {
      id: "attendance-teacher",
      label: "Presensi Guru",
      icon: UserCheck,
      bg: darkMode ? "bg-blue-900/50" : "bg-blue-100",
      iconColor: darkMode ? "text-blue-300" : "text-blue-600",
      activeBg: "bg-blue-500",
    },
    {
      id: "jurnal-harian",
      label: "Jurnal",
      icon: BookOpenText,
      bg: darkMode ? "bg-rose-900/50" : "bg-rose-100",
      iconColor: darkMode ? "text-rose-300" : "text-rose-600",
      activeBg: "bg-rose-500",
    },
  ];

  const adminItems = [
    {
      id: "dashboard",
      label: "Home",
      icon: Home,
      bg: darkMode ? "bg-indigo-900/50" : "bg-indigo-100",
      iconColor: darkMode ? "text-indigo-300" : "text-indigo-600",
      activeBg: "bg-indigo-500",
    },
    {
      id: "settings",
      label: "Pengaturan",
      icon: Settings,
      bg: darkMode ? "bg-amber-900/50" : "bg-amber-100",
      iconColor: darkMode ? "text-amber-300" : "text-amber-600",
      activeBg: "bg-amber-500",
    },
    {
      id: "monitor-sistem",
      label: "Monitor",
      icon: Activity,
      bg: darkMode ? "bg-violet-900/50" : "bg-violet-100",
      iconColor: darkMode ? "text-violet-300" : "text-violet-600",
      activeBg: "bg-violet-500",
    },
  ];

  const guruBkItems = [
    {
      id: "dashboard",
      label: "Home",
      icon: Home,
      bg: darkMode ? "bg-indigo-900/50" : "bg-indigo-100",
      iconColor: darkMode ? "text-indigo-300" : "text-indigo-600",
      activeBg: "bg-indigo-500",
    },
    {
      id: "konseling",
      label: "Konseling",
      icon: MessageCircle,
      bg: darkMode ? "bg-cyan-900/50" : "bg-cyan-100",
      iconColor: darkMode ? "text-cyan-300" : "text-cyan-600",
      activeBg: "bg-cyan-500",
    },
    {
      id: "home-visit",
      label: "Home Visit",
      icon: MapPinned,
      bg: darkMode ? "bg-emerald-900/50" : "bg-emerald-100",
      iconColor: darkMode ? "text-emerald-300" : "text-emerald-600",
      activeBg: "bg-emerald-500",
    },
    {
      id: "reports",
      label: "Laporan",
      icon: FileBarChart,
      bg: darkMode ? "bg-blue-900/50" : "bg-blue-100",
      iconColor: darkMode ? "text-blue-300" : "text-blue-600",
      activeBg: "bg-blue-500",
    },
  ];

  const navItems = isAdmin
    ? adminItems
    : userRole === "guru_bk"
      ? guruBkItems
      : teacherItems;

  return (
    <nav
      className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t shadow-[0_-4px_20px_rgba(0,0,0,0.08)] transition-colors ${
        darkMode ? "bg-gray-800 border-theme" : "bg-theme-bg border-theme"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex items-center justify-around px-1.5 pt-2 pb-2.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="flex flex-col items-center justify-center flex-1 min-w-0 py-0.5 gap-1">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm transition-all ${
                  isActive
                    ? `${item.activeBg} text-white shadow-md scale-105`
                    : `${item.bg} ${item.iconColor}`
                }`}>
                <Icon size={20} strokeWidth={2.2} />
              </div>
              <span
                className={`text-[11px] font-bold truncate max-w-full ${
                  darkMode ? "text-gray-200" : "text-slate-700"
                }`}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Akun - dropdown persis kayak Profile Dropdown di Layout.js */}
        <div className="relative flex-1 min-w-0" ref={accountDropdownRef}>
          <button
            onClick={() => setAccountOpen((prev) => !prev)}
            className="flex flex-col items-center justify-center w-full py-0.5 gap-1">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm transition-all ${
                accountOpen
                  ? "bg-slate-600 text-white shadow-md scale-105"
                  : darkMode
                    ? "bg-slate-700/50 text-slate-300"
                    : "bg-slate-100 text-slate-600"
              }`}>
              <User size={20} strokeWidth={2.2} />
            </div>
            <span
              className={`text-[11px] font-bold truncate max-w-full ${
                darkMode ? "text-gray-200" : "text-slate-700"
              }`}>
              Akun
            </span>
          </button>

          {accountOpen && (
            <>
              {/* Overlay gelap tipis di belakang dropdown biar modal keliatan jelas terpisah dari halaman */}
              <div
                className="fixed inset-0 z-40 bg-black/40"
                onClick={() => setAccountOpen(false)}
              />
              <div
                className={`absolute right-0 bottom-full mb-2 w-64 rounded-xl shadow-2xl border-2 z-50 transition-colors ${
                  darkMode
                    ? "bg-slate-800 border-blue-800/60"
                    : "bg-blue-50 border-blue-200"
                }`}>
                <div
                  className={`px-4 py-3 border-b rounded-t-xl transition-colors ${
                    darkMode
                      ? "border-blue-800/60 bg-gradient-to-r from-slate-700 to-slate-800"
                      : "border-blue-200 bg-gradient-to-r from-blue-100 to-blue-50"
                  }`}>
                  <p
                    className={`font-bold text-sm truncate transition-colors ${
                      darkMode ? "text-white" : "text-slate-900"
                    }`}>
                    {user?.full_name || user?.username || "User"}
                  </p>
                  <p
                    className={`text-xs capitalize font-semibold transition-colors ${
                      darkMode ? "text-blue-300" : "text-blue-700"
                    }`}>
                    {roleLabel}
                  </p>
                  {user?.teacher_id && (
                    <p
                      className={`text-xs font-semibold transition-colors ${
                        darkMode ? "text-gray-300" : "text-slate-600"
                      }`}>
                      ID: {user.teacher_id}
                    </p>
                  )}
                </div>

                <div className="py-2">
                  <button
                    onClick={() => {
                      onProfileClick?.();
                      setAccountOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors duration-150 touch-manipulation ${
                      darkMode
                        ? "text-gray-100 hover:bg-slate-700 hover:text-blue-300"
                        : "text-slate-700 hover:bg-blue-100 hover:text-blue-700"
                    }`}>
                    <User size={16} className="flex-shrink-0" />
                    <span>Profile</span>
                  </button>

                  <button
                    onClick={onToggleDarkMode}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-sm font-semibold transition-colors duration-150 touch-manipulation ${
                      darkMode
                        ? "text-gray-100 hover:bg-slate-700 hover:text-blue-300"
                        : "text-slate-700 hover:bg-blue-100 hover:text-blue-700"
                    }`}>
                    <span className="flex items-center gap-3">
                      {darkMode ? (
                        <Moon
                          size={16}
                          className="flex-shrink-0"
                          fill="currentColor"
                        />
                      ) : (
                        <Sun size={16} className="flex-shrink-0" />
                      )}
                      <span>Mode Gelap</span>
                    </span>
                    <span
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-300 ${
                        darkMode ? "bg-blue-600" : "bg-gray-300"
                      }`}>
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${
                          darkMode ? "translate-x-4" : "translate-x-1"
                        }`}
                      />
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setAccountOpen(false);
                      onLogout();
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors duration-150 touch-manipulation ${
                      darkMode
                        ? "text-red-400 hover:bg-red-900/30"
                        : "text-red-600 hover:bg-red-100 hover:text-red-700"
                    }`}>
                    <LogOut size={16} className="flex-shrink-0" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
