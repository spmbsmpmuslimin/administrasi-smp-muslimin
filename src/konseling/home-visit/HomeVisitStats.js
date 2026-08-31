//[file name]: HomeVisitStats.js
import React from "react";
import { Users, CalendarClock, CheckCircle2, AlertTriangle } from "lucide-react";

const HomeVisitStats = ({ stats, darkMode = false }) => {
  const items = [
    {
      label: "Total Home Visit",
      value: stats.total,
      icon: Users,
      cardBg: darkMode ? "bg-blue-900/20 border-blue-800/40" : "bg-blue-50 border-blue-100",
      iconBg: darkMode ? "bg-blue-800/40" : "bg-blue-100",
      iconColor: darkMode ? "text-blue-300" : "text-blue-600",
      labelColor: darkMode ? "text-blue-300/80" : "text-blue-700/80",
      valueColor: darkMode ? "text-blue-100" : "text-blue-900",
    },
    {
      label: "Terjadwal",
      value: stats.terjadwal,
      icon: CalendarClock,
      cardBg: darkMode ? "bg-violet-900/20 border-violet-800/40" : "bg-violet-50 border-violet-100",
      iconBg: darkMode ? "bg-violet-800/40" : "bg-violet-100",
      iconColor: darkMode ? "text-violet-300" : "text-violet-600",
      labelColor: darkMode ? "text-violet-300/80" : "text-violet-700/80",
      valueColor: darkMode ? "text-violet-100" : "text-violet-900",
    },
    {
      label: "Selesai",
      value: stats.selesai,
      icon: CheckCircle2,
      cardBg: darkMode
        ? "bg-emerald-900/20 border-emerald-800/40"
        : "bg-emerald-50 border-emerald-100",
      iconBg: darkMode ? "bg-emerald-800/40" : "bg-emerald-100",
      iconColor: darkMode ? "text-emerald-300" : "text-emerald-600",
      labelColor: darkMode ? "text-emerald-300/80" : "text-emerald-700/80",
      valueColor: darkMode ? "text-emerald-100" : "text-emerald-900",
    },
    {
      label: "Perlu Tindak Lanjut",
      value: stats.perluTindakLanjut,
      icon: AlertTriangle,
      cardBg: darkMode ? "bg-orange-900/20 border-orange-800/40" : "bg-orange-50 border-orange-100",
      iconBg: darkMode ? "bg-orange-800/40" : "bg-orange-100",
      iconColor: darkMode ? "text-orange-300" : "text-orange-600",
      labelColor: darkMode ? "text-orange-300/80" : "text-orange-700/80",
      valueColor: darkMode ? "text-orange-100" : "text-orange-900",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {items.map(
        ({ label, value, icon: Icon, cardBg, iconBg, iconColor, labelColor, valueColor }) => (
          <div key={label} className={`rounded-xl border p-4 transition-colors ${cardBg}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${iconBg}`}
              >
                <Icon size={15} className={iconColor} />
              </span>
              <span className={`text-xs font-medium ${labelColor}`}>{label}</span>
            </div>
            <p className={`text-xl sm:text-2xl font-bold ${valueColor}`}>{value}</p>
          </div>
        )
      )}
    </div>
  );
};

export default HomeVisitStats;
