// students/StudentSidebar.js
// ========================================================================
// Sidebar khusus portal siswa, HANYA tampil di desktop (lg:flex, hidden di
// HP karena mobile udah pake StudentBottomNav.js). Selalu fixed & expanded
// (gak ada collapse toggle kayak Sidebar.js admin) karena menu siswa cuma
// 5 item flat, gak butuh grouping.
//
// Pattern sama kayak StudentBottomNav.js: item nav pake <button onClick
// onPageChange(...)> (state-based routing), BUKAN <a href="...">.
//
// UPDATE (redesign): sebelumnya sidebar ini solid biru gelap (blue-600 ->
// blue-800) dan kerasa "numpang" karena beda sendiri dari sisa app yang
// udah pindah ke tema pastel (header gradasi sky/blue/indigo, tombol
// Profile violet/purple, tiap item StudentBottomNav punya warna sendiri).
// Sekarang di-redesign: background terang (bukan gelap), tiap item nav
// punya identitas warna sendiri yang SAMA PERSIS kayak StudentBottomNav.js
// (biar konsisten antara mobile & desktop), dan brand header pake gradasi
// pastel senada header utama. Item "Belajar" ditambahin di sini nyusul
// yang udah lebih dulu aktif lagi di bottom nav.
//
// UPDATE (sebelumnya): tombol Logout dipindah ke StudentLayout.js
// (dropdown Profile di header, sebelah jam live) biar aksesnya konsisten
// di semua halaman & semua ukuran layar, gak cuma di sidebar desktop.
// Panel bawah sidebar ini jadi shortcut ke halaman Info aja.
// ========================================================================
import { Home, Calendar, ClipboardCheck, BookOpen, User, ChevronRight } from "lucide-react";

function getInitials(name) {
  const words = (name || "").trim().split(" ").filter(Boolean);
  if (words.length === 0) return "S";
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// Warna per-item disamain persis kayak StudentBottomNav.js biar identitas
// tiap menu konsisten antara mobile & desktop.
const NAV_ITEMS = [
  {
    id: "student-dashboard",
    label: "Beranda",
    icon: Home,
    activeBg: "bg-blue-50 dark:bg-blue-950/30",
    activeText: "text-blue-700 dark:text-blue-400",
    activeBar: "bg-blue-500",
    inactiveText: "text-gray-500 dark:text-gray-400",
    hoverText: "group-hover:text-blue-600 dark:group-hover:text-blue-400",
  },
  {
    id: "student-jadwal",
    label: "Jadwal",
    icon: Calendar,
    activeBg: "bg-purple-50 dark:bg-purple-950/30",
    activeText: "text-purple-700 dark:text-purple-400",
    activeBar: "bg-purple-500",
    inactiveText: "text-gray-500 dark:text-gray-400",
    hoverText: "group-hover:text-purple-600 dark:group-hover:text-purple-400",
  },
  {
    id: "student-presensi",
    label: "Presensi",
    icon: ClipboardCheck,
    activeBg: "bg-green-50 dark:bg-green-950/30",
    activeText: "text-green-700 dark:text-green-400",
    activeBar: "bg-green-500",
    inactiveText: "text-gray-500 dark:text-gray-400",
    hoverText: "group-hover:text-green-600 dark:group-hover:text-green-400",
  },
  {
    id: "student-belajar",
    label: "Belajar",
    icon: BookOpen,
    activeBg: "bg-teal-50 dark:bg-teal-950/30",
    activeText: "text-teal-700 dark:text-teal-400",
    activeBar: "bg-teal-500",
    inactiveText: "text-gray-500 dark:text-gray-400",
    hoverText: "group-hover:text-teal-600 dark:group-hover:text-teal-400",
  },
  {
    id: "student-lainnya",
    label: "Info",
    icon: User,
    activeBg: "bg-orange-50 dark:bg-orange-950/30",
    activeText: "text-orange-700 dark:text-orange-400",
    activeBar: "bg-orange-500",
    inactiveText: "text-gray-500 dark:text-gray-400",
    hoverText: "group-hover:text-orange-600 dark:group-hover:text-orange-400",
  },
];

export default function StudentSidebar({ currentPage, onPageChange, currentUser }) {
  const initials = getInitials(currentUser?.full_name);

  return (
    <aside
      className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 z-40
        bg-white dark:bg-gray-900
        shadow-[4px_0_24px_rgba(30,64,175,0.06)] dark:shadow-black/40
        border-r border-gray-100 dark:border-gray-800"
    >
      {/* Header / brand — gradasi pastel senada header utama (StudentLayout.js) */}
      <div
        className="h-16 px-4 flex items-center gap-3 shrink-0 border-b border-blue-100/70 dark:border-gray-800
          bg-gradient-to-r from-sky-100 via-blue-100 to-indigo-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900"
      >
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm ring-2 ring-white/60 dark:ring-gray-800">
          <User size={18} className="text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-blue-900 dark:text-gray-100 font-bold text-sm tracking-wide leading-tight">
            Portal Siswa
          </h1>
          <p className="text-blue-600/80 dark:text-gray-400 text-xs font-medium truncate">
            Kelas {currentUser?.class_id || "-"}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onPageChange(item.id)}
              className={`group relative w-full flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? `${item.activeBg} ${item.activeText} shadow-sm`
                  : `${item.inactiveText} hover:bg-gray-50 dark:hover:bg-gray-800/60`
              }`}
            >
              {isActive && (
                <span
                  className={`absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-full ${item.activeBar}`}
                />
              )}
              <Icon
                size={20}
                strokeWidth={isActive ? 2.6 : 2.1}
                className={`flex-shrink-0 transition-transform duration-200 ${
                  isActive ? "scale-110" : `group-hover:scale-110 ${item.hoverText}`
                }`}
              />
              <span
                className={`text-sm flex-1 text-left transition-colors duration-200 ${
                  isActive ? "font-bold" : `font-medium ${item.hoverText}`
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* User info -> shortcut ke halaman Info */}
      <div className="border-t border-gray-100 dark:border-gray-800 p-3 shrink-0">
        <button
          type="button"
          onClick={() => onPageChange("student-lainnya")}
          className="w-full bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800
            rounded-xl p-3 border border-violet-100 dark:border-gray-700
            hover:from-violet-100 hover:via-purple-100 hover:to-indigo-100 dark:hover:bg-gray-800/80
            transition-all duration-200 flex items-center gap-3 text-left shadow-sm"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm ring-2 ring-white dark:ring-gray-900">
            <span className="text-white font-bold text-xs">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {currentUser?.full_name || "Siswa"}
            </p>
            <p className="text-xs text-violet-600/80 dark:text-gray-400 truncate">
              @{currentUser?.username || "-"}
            </p>
          </div>
          <ChevronRight size={16} className="text-violet-400 dark:text-gray-500 shrink-0" />
        </button>
      </div>
    </aside>
  );
}
