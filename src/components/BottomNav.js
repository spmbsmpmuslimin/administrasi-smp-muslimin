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
} from "lucide-react";

// ✅ NEW: Bottom navbar khusus mobile (lg:hidden) untuk app ini.
// Beda dari BottomNav.js versi app "Administrasi Bahasa Inggris":
//  - Manggil onNavigate(page) yang diteruskan dari Layout.js (handleNavigate),
//    BUKAN onPageChange, karena app ini pakai react-router (routes object).
//  - Page id disesuaikan sama routes di Layout.js: "attendance-teacher"
//    (bukan "teacherattendance"), "jurnal-harian" (bukan "teachingjournal").
//  - Dukung darkMode karena app ini punya toggle dark mode di header.
//  - ✅ ROLE-AWARE: menu beda buat guru vs admin (userRole dari Layout.js).
//    Guru: Home, P. Siswa, P. Guru, Jurnal, Keluar
//    Admin: Home, P. Guru, Pengaturan, Monitor, Keluar
//    Guru BK: Home, Konseling, P. Siswa, Laporan, Keluar
export default function BottomNav({ currentPage, onNavigate, onLogout, darkMode, userRole }) {
  const isAdmin = userRole === "admin";

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
      label: "P. Siswa",
      icon: ClipboardCheck,
      bg: darkMode ? "bg-emerald-900/50" : "bg-emerald-100",
      iconColor: darkMode ? "text-emerald-300" : "text-emerald-600",
      activeBg: "bg-emerald-500",
    },
    {
      id: "attendance-teacher",
      label: "P. Guru",
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
      id: "attendance-teacher",
      label: "P. Guru",
      icon: UserCheck,
      bg: darkMode ? "bg-blue-900/50" : "bg-blue-100",
      iconColor: darkMode ? "text-blue-300" : "text-blue-600",
      activeBg: "bg-blue-500",
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
      id: "attendance",
      label: "P. Siswa",
      icon: ClipboardCheck,
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

  const navItems = isAdmin ? adminItems : userRole === "guru_bk" ? guruBkItems : teacherItems;

  return (
    <nav
      className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t shadow-[0_-4px_20px_rgba(0,0,0,0.08)] transition-colors ${
        darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around px-1.5 pt-2 pb-2.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="flex flex-col items-center justify-center flex-1 min-w-0 py-0.5 gap-1"
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm transition-all ${
                  isActive
                    ? `${item.activeBg} text-white shadow-md scale-105`
                    : `${item.bg} ${item.iconColor}`
                }`}
              >
                <Icon size={20} strokeWidth={2.2} />
              </div>
              <span
                className={`text-[11px] font-bold truncate max-w-full ${
                  darkMode ? "text-gray-200" : "text-slate-700"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Logout - warna pastel merah biar tetap keliatan beda kategori */}
        <button
          onClick={onLogout}
          className="flex flex-col items-center justify-center flex-1 min-w-0 py-0.5 gap-1"
        >
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm ${
              darkMode ? "bg-red-900/50 text-red-300" : "bg-red-100 text-red-600"
            }`}
          >
            <LogOut size={20} strokeWidth={2.2} />
          </div>
          <span
            className={`text-[11px] font-bold truncate max-w-full ${darkMode ? "text-gray-200" : "text-slate-700"}`}
          >
            Keluar
          </span>
        </button>
      </div>
    </nav>
  );
}
