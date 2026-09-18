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
  { id: "ujian-dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "ujian-jenis", label: "Jenis Ujian", icon: FileText },
  { id: "ujian-laporan", label: "Laporan", icon: ClipboardList },
];

export default function UjianSidebar({ currentPage, onPageChange, currentUser }) {
  const initials = getInitials(currentUser?.full_name);

  return (
    <aside
      className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 z-40
        bg-white dark:bg-gray-900
        shadow-sm dark:shadow-black/40
        border-r border-gray-100 dark:border-gray-800"
    >
      {/* Header / brand */}
      <div className="h-16 px-4 flex items-center gap-3 shrink-0 border-b border-gray-100 dark:border-gray-800">
        <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center shrink-0">
          <ClipboardList size={18} className="text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-gray-900 dark:text-gray-100 font-bold text-sm leading-tight">
            Portal Panitia Ujian
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs font-medium truncate">
            {currentUser?.full_name || "Panitia"}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
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
                  ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60"
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-full bg-amber-500" />
              )}
              <Icon
                size={20}
                strokeWidth={isActive ? 2.6 : 2.1}
                className={`flex-shrink-0 transition-transform duration-200 ${
                  isActive
                    ? "scale-110"
                    : "group-hover:scale-110 group-hover:text-amber-600 dark:group-hover:text-amber-400"
                }`}
              />
              <span
                className={`text-sm flex-1 text-left transition-colors duration-200 ${
                  isActive
                    ? "font-bold"
                    : "font-medium group-hover:text-amber-600 dark:group-hover:text-amber-400"
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
        <div className="w-full bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 border border-gray-100 dark:border-gray-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {currentUser?.full_name || "Panitia Ujian"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              @{currentUser?.username || "-"}
            </p>
          </div>
          <ChevronRight size={16} className="text-gray-400 dark:text-gray-500 shrink-0" />
        </div>
      </div>
    </aside>
  );
}
