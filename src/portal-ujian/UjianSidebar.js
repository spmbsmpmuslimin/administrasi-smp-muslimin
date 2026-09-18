// portal-ujian/UjianSidebar.js
// ========================================================================
// Sidebar khusus Portal Panitia Ujian. Pola sama persis kayak
// StudentSidebar.js (portal siswa): fixed di desktop (lg:flex, hidden di
// HP), item nav pakai <button onClick onPageChange(...)> (state-based
// routing), bukan <a href>. Menu cuma 3 item flat (Dashboard, Jenis
// Ujian, Laporan) jadi gak butuh grouping/collapse.
// ========================================================================
import { LayoutDashboard, FileText, ClipboardList, ChevronRight } from "lucide-react";

function getInitials(name) {
  const words = (name || "").trim().split(" ").filter(Boolean);
  if (words.length === 0) return "P";
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

const NAV_ITEMS = [
  {
    id: "ujian-dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    activeBg: "bg-amber-50 dark:bg-amber-950/30",
    activeText: "text-amber-700 dark:text-amber-400",
    activeBar: "bg-amber-500",
    inactiveText: "text-gray-500 dark:text-gray-400",
    hoverText: "group-hover:text-amber-600 dark:group-hover:text-amber-400",
  },
  {
    id: "ujian-jenis",
    label: "Jenis Ujian",
    icon: FileText,
    activeBg: "bg-indigo-50 dark:bg-indigo-950/30",
    activeText: "text-indigo-700 dark:text-indigo-400",
    activeBar: "bg-indigo-500",
    inactiveText: "text-gray-500 dark:text-gray-400",
    hoverText: "group-hover:text-indigo-600 dark:group-hover:text-indigo-400",
  },
  {
    id: "ujian-laporan",
    label: "Laporan",
    icon: ClipboardList,
    activeBg: "bg-emerald-50 dark:bg-emerald-950/30",
    activeText: "text-emerald-700 dark:text-emerald-400",
    activeBar: "bg-emerald-500",
    inactiveText: "text-gray-500 dark:text-gray-400",
    hoverText: "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
  },
];

export default function UjianSidebar({ currentPage, onPageChange, currentUser }) {
  const initials = getInitials(currentUser?.full_name);

  return (
    <aside
      className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 z-40
        bg-white dark:bg-gray-900
        shadow-[4px_0_24px_rgba(120,53,15,0.06)] dark:shadow-black/40
        border-r border-gray-100 dark:border-gray-800"
    >
      {/* Header / brand */}
      <div
        className="h-16 px-4 flex items-center gap-3 shrink-0 border-b border-amber-100/70 dark:border-gray-800
          bg-gradient-to-r from-amber-100 via-orange-100 to-amber-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900"
      >
        <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm ring-2 ring-white/60 dark:ring-gray-800">
          <ClipboardList size={18} className="text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-amber-900 dark:text-gray-100 font-bold text-sm tracking-wide leading-tight">
            Portal Panitia Ujian
          </h1>
          <p className="text-amber-700/80 dark:text-gray-400 text-xs font-medium truncate">
            {currentUser?.full_name || "Panitia"}
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

      {/* User info -> balik ke aplikasi utama */}
      <div className="border-t border-gray-100 dark:border-gray-800 p-3 shrink-0">
        <div
          className="w-full bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800
            rounded-xl p-3 border border-amber-100 dark:border-gray-700
            flex items-center gap-3 shadow-sm"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm ring-2 ring-white dark:ring-gray-900">
            <span className="text-white font-bold text-xs">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {currentUser?.full_name || "Panitia Ujian"}
            </p>
            <p className="text-xs text-amber-700/80 dark:text-gray-400 truncate">
              @{currentUser?.username || "-"}
            </p>
          </div>
          <ChevronRight size={16} className="text-amber-400 dark:text-gray-500 shrink-0" />
        </div>
      </div>
    </aside>
  );
}
