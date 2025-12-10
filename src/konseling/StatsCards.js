import React from "react";
import { Users, Clock, CheckCircle, AlertTriangle } from "lucide-react";

const StatsCards = ({ stats }) => {
  const cards = [
    {
      title: "Total Konseling",
      value: stats.total,
      icon: Users,
      color: "blue",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      iconColor: "text-blue-600 dark:text-blue-400",
      borderColor: "border-blue-200 dark:border-blue-700/50",
      subText: stats.darurat > 0 ? `🚨 ${stats.darurat} Kasus Darurat` : null,
      subTextColor: "text-gray-600 dark:text-gray-400",
    },
    {
      title: "Dalam Proses",
      value: stats.dalam_proses,
      icon: Clock,
      color: "yellow",
      bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
      iconColor: "text-yellow-600 dark:text-yellow-400",
      borderColor: "border-yellow-200 dark:border-yellow-700/50",
      subText:
        stats.perlu_followup > 0
          ? `📅 ${stats.perlu_followup} Perlu Follow-up`
          : null,
      subTextColor: "text-gray-600 dark:text-gray-400",
    },
    {
      title: "Selesai",
      value: stats.selesai,
      icon: CheckCircle,
      color: "green",
      bgColor: "bg-green-50 dark:bg-green-900/20",
      iconColor: "text-green-600 dark:text-green-400",
      borderColor: "border-green-200 dark:border-green-700/50",
      subText: null,
      subTextColor: "text-gray-600 dark:text-gray-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className={`${card.bgColor} border-2 ${card.borderColor} rounded-xl p-4 sm:p-5 transition-all hover:shadow-lg dark:hover:shadow-blue-900/10 active:scale-[0.98] active:shadow-none`}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 sm:mb-2">
                  {card.title}
                </p>
                <p
                  className={`text-2xl sm:text-3xl md:text-4xl font-bold ${card.iconColor} mb-2`}>
                  {card.value}
                </p>
                {card.subText && (
                  <p
                    className={`text-xs font-medium ${card.subTextColor} mt-2 sm:mt-3`}>
                    {card.subText}
                  </p>
                )}
              </div>
              <div
                className={`${card.iconColor} opacity-20 dark:opacity-30 ml-3`}>
                <Icon size={40} strokeWidth={1.5} className="hidden xs:block" />
                <Icon size={32} strokeWidth={1.5} className="xs:hidden" />
              </div>
            </div>

            {/* Mobile Touch Enhancement */}
            <div className="xs:hidden mt-3 pt-3 border-t border-gray-200 dark:border-gray-700/50">
              <div className="text-xs text-gray-500 dark:text-gray-500">
                Ketuk untuk detail
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsCards;
