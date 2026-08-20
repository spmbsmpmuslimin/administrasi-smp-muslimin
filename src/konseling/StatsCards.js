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
      subText: stats.perlu_followup > 0 ? `📅 ${stats.perlu_followup} Perlu Follow-up` : null,
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

  // ✅ NEW: nilai max untuk skala bar breakdown
  const maxKategori = stats.byKategori?.[0]?.count || 1;
  const maxBidang = stats.byBidang?.[0]?.count || 1;

  return (
    <div className="mb-4 sm:mb-6">
      {/* Card ringkasan utama - ✅ UPDATED: selalu 3 kolom, versi compact di mobile */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className={`${card.bgColor} border-2 ${card.borderColor} rounded-xl p-2.5 sm:p-5 transition-all hover:shadow-lg dark:hover:shadow-blue-900/10 active:scale-[0.98] active:shadow-none`}
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] leading-tight sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 sm:mb-2 truncate">
                    {card.title}
                  </p>
                  <p
                    className={`text-lg sm:text-3xl md:text-4xl font-bold ${card.iconColor} mb-0 sm:mb-2`}
                  >
                    {card.value}
                  </p>
                  {/* Subtext: disembunyikan di mobile, muncul dari sm ke atas */}
                  {card.subText && (
                    <p
                      className={`hidden sm:block text-xs font-medium ${card.subTextColor} mt-2 sm:mt-3`}
                    >
                      {card.subText}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <Icon
                    size={20}
                    strokeWidth={2}
                    className={`sm:hidden ${card.iconColor} opacity-70`}
                  />
                  <Icon
                    size={40}
                    strokeWidth={1.5}
                    className={`hidden sm:block ${card.iconColor} opacity-20 dark:opacity-30`}
                  />
                </div>
              </div>

              {/* Mobile Touch Enhancement: disembunyikan di layout compact 3-kolom mobile */}
              <div className="hidden sm:block xs:hidden mt-3 pt-3 border-t border-gray-200 dark:border-gray-700/50">
                <div className="text-xs text-gray-500 dark:text-gray-500">Ketuk untuk detail</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ✅ NEW: Breakdown Kategori Masalah & Bidang Bimbingan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-5">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Kasus per Kategori Masalah
          </p>
          {stats.byKategori?.length > 0 ? (
            <div className="space-y-2">
              {stats.byKategori.slice(0, 6).map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <span>{item.label}</span>
                    <span className="font-semibold">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${(item.count / maxKategori) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500">Belum ada data</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-5">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Kasus per Bidang Bimbingan
          </p>
          {stats.byBidang?.length > 0 ? (
            <div className="space-y-2">
              {stats.byBidang.slice(0, 6).map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <span>{item.label}</span>
                    <span className="font-semibold">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all"
                      style={{ width: `${(item.count / maxBidang) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500">Belum ada data</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsCards;
