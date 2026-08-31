// portal-siswa/StudentBottomNav.js
// ========================================================================
// Bottom navbar khusus portal siswa. PENTING: item nav pake <button onClick
// onPageChange(...)> (state-based, sama kayak BottomNav.js punya admin),
// BUKAN <a href="..."> — soalnya app ini routingnya berbasis currentPage
// state di App.js, bukan react-router. Pake <a href> bakal full page
// reload ke URL yang gak ada, ujungnya blank/404.
// ========================================================================
import { Home, Calendar, ClipboardCheck, BookOpen, User } from "lucide-react";

export default function StudentBottomNav({ currentPage, onPageChange }) {
  const items = [
    {
      id: "student-dashboard",
      label: "Home",
      icon: Home,
      activeText: "text-blue-800",
      activeBg: "bg-blue-50 dark:bg-blue-950/30",
      inactiveText: "text-blue-500",
    },
    {
      id: "student-jadwal",
      label: "Jadwal",
      icon: Calendar,
      activeText: "text-purple-800",
      activeBg: "bg-purple-50 dark:bg-purple-950/30",
      inactiveText: "text-purple-500",
    },
    {
      id: "student-presensi",
      label: "Presensi",
      icon: ClipboardCheck,
      activeText: "text-green-800",
      activeBg: "bg-green-50 dark:bg-green-950/30",
      inactiveText: "text-green-500",
    },
    {
      id: "student-belajar",
      label: "Belajar",
      icon: BookOpen,
      activeText: "text-teal-800",
      activeBg: "bg-teal-50 dark:bg-teal-950/30",
      inactiveText: "text-teal-500",
    },
    {
      id: "student-lainnya",
      label: "Info",
      icon: User,
      activeText: "text-orange-800",
      activeBg: "bg-orange-50 dark:bg-orange-950/30",
      inactiveText: "text-orange-500",
    },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-theme-bg border-t border-theme shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch justify-around px-1.5 pt-2 pb-2.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          const textColor = isActive ? item.activeText : item.inactiveText;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onPageChange(item.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 min-w-0 rounded-xl transition-colors ${
                isActive ? item.activeBg : ""
              }`}
            >
              <Icon size={23} strokeWidth={isActive ? 2.6 : 2.3} className={textColor} />
              <span
                className={`text-[11px] truncate max-w-full ${
                  isActive ? "font-bold" : "font-semibold"
                } ${textColor}`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
