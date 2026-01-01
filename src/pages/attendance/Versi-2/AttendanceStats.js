import React from "react";

const AttendanceStats = ({ attendanceStatus, students }) => {
  const getAttendanceStats = () => {
    const stats = { Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0 };
    Object.values(attendanceStatus).forEach((status) => {
      if (stats[status] !== undefined) stats[status]++;
    });
    return stats;
  };

  const getTotalStudents = () => {
    return students?.length || 0;
  };

  const calculatePercentage = (count) => {
    const total = getTotalStudents();
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  const stats = getAttendanceStats();
  const percentages = {
    Hadir: calculatePercentage(stats.Hadir),
    Sakit: calculatePercentage(stats.Sakit),
    Izin: calculatePercentage(stats.Izin),
    Alpa: calculatePercentage(stats.Alpa),
  };

  // ✅ UPDATE: Blue theme untuk light mode dengan dark mode support
  const statCards = [
    {
      label: "Hadir",
      value: stats.Hadir,
      percentage: percentages.Hadir,
      icon: "✓",
      gradient: "from-emerald-500 to-green-600",
      darkGradient: "from-emerald-600 to-emerald-700",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
      textColor: "text-emerald-700 dark:text-emerald-400",
      progressColor: "bg-emerald-500 dark:bg-emerald-600",
      borderColor: "border-emerald-100 dark:border-emerald-800/50",
    },
    {
      label: "Sakit",
      value: stats.Sakit,
      percentage: percentages.Sakit,
      icon: "🏥",
      gradient: "from-amber-500 to-amber-600",
      darkGradient: "from-amber-600 to-amber-700",
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
      textColor: "text-amber-700 dark:text-amber-400",
      progressColor: "bg-amber-500 dark:bg-amber-600",
      borderColor: "border-amber-100 dark:border-amber-800/50",
    },
    {
      label: "Izin",
      value: stats.Izin,
      percentage: percentages.Izin,
      icon: "📝",
      gradient: "from-blue-500 to-blue-600",
      darkGradient: "from-blue-600 to-blue-700",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      textColor: "text-blue-700 dark:text-blue-400",
      progressColor: "bg-blue-500 dark:bg-blue-600",
      borderColor: "border-blue-100 dark:border-blue-800/50",
    },
    {
      label: "Alpha",
      value: stats.Alpa,
      percentage: percentages.Alpa,
      icon: "✗",
      gradient: "from-rose-500 to-rose-600",
      darkGradient: "from-rose-600 to-rose-700",
      bgColor: "bg-rose-50 dark:bg-rose-900/20",
      textColor: "text-rose-700 dark:text-rose-400",
      progressColor: "bg-rose-500 dark:bg-rose-600",
      borderColor: "border-rose-100 dark:border-rose-800/50",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
      {statCards.map((card, index) => (
        <div
          key={index}
          className={`group relative overflow-hidden backdrop-blur-sm rounded-lg shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 border
            ${card.borderColor}
            bg-white/80 dark:bg-slate-900/80
            hover:shadow-lg dark:hover:shadow-slate-900/50
            min-h-[90px] sm:min-h-[100px]`}
        >
          {/* Gradient Background on Hover */}
          <div
            className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 dark:group-hover:opacity-10 transition-opacity duration-300
              ${card.gradient} dark:${card.darkGradient}`}
          ></div>

          <div className="relative p-3 sm:p-4">
            {/* Header: Icon & Value - Horizontal Layout */}
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-white text-sm shadow-sm
                    bg-gradient-to-br ${card.gradient} dark:${card.darkGradient}`}
                >
                  <span className="text-base sm:text-lg">{card.icon}</span>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-200 leading-none">
                    {card.value}
                  </div>
                  <div className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">
                    {card.label}
                  </div>
                </div>
              </div>
              <span
                className={`text-xs sm:text-sm font-bold px-2 py-1 rounded-md
                  ${card.textColor} ${card.bgColor}`}
              >
                {card.percentage}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out
                  ${card.progressColor}`}
                style={{ width: `${card.percentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AttendanceStats;
