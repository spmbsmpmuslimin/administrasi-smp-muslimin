import React, { useState } from "react";
import MonitorDashboard from "./MonitorDashboard";
import DatabaseCleanupMonitor from "./DatabaseCleanupMonitor";
import PerformanceMonitor from "./PerformanceMonitor";
import CodeAudit from "./CodeAudit";
import ProjectStructure from "./ProjectStructure";
import DatabaseStructure from "./DatabaseStructure";
import {
  Activity,
  Database,
  Gauge,
  FileCode2,
  FolderTree,
  Table2,
  ChevronRight,
  ArrowRight,
  LayoutGrid,
} from "lucide-react";

// Palet pastel per kartu menu, sama persis pendekatannya kayak di
// Setting.js -- ditulis lengkap per-kelas (bukan digabung pake template
// string kayak `bg-${color}-50`) supaya Tailwind bisa nge-scan class-nya
// pas build.
const CARD_COLOR_STYLES = {
  sky: {
    bg: "bg-sky-50/80 dark:bg-sky-950/20",
    border: "border-sky-100 dark:border-sky-900/40",
    hoverBorder: "hover:border-sky-300 dark:hover:border-sky-700",
    iconBg: "bg-sky-100 dark:bg-sky-900/40 group-hover:bg-sky-200 dark:group-hover:bg-sky-800/50",
    iconColor: "text-sky-600 dark:text-sky-400",
    titleHover: "group-hover:text-sky-700 dark:group-hover:text-sky-300",
    header: "from-sky-400 to-sky-500 dark:from-sky-600 dark:to-sky-700",
  },
  teal: {
    bg: "bg-teal-50/80 dark:bg-teal-950/20",
    border: "border-teal-100 dark:border-teal-900/40",
    hoverBorder: "hover:border-teal-300 dark:hover:border-teal-700",
    iconBg:
      "bg-teal-100 dark:bg-teal-900/40 group-hover:bg-teal-200 dark:group-hover:bg-teal-800/50",
    iconColor: "text-teal-600 dark:text-teal-400",
    titleHover: "group-hover:text-teal-700 dark:group-hover:text-teal-300",
    header: "from-teal-400 to-teal-500 dark:from-teal-600 dark:to-teal-700",
  },
  violet: {
    bg: "bg-violet-50/80 dark:bg-violet-950/20",
    border: "border-violet-100 dark:border-violet-900/40",
    hoverBorder: "hover:border-violet-300 dark:hover:border-violet-700",
    iconBg:
      "bg-violet-100 dark:bg-violet-900/40 group-hover:bg-violet-200 dark:group-hover:bg-violet-800/50",
    iconColor: "text-violet-600 dark:text-violet-400",
    titleHover: "group-hover:text-violet-700 dark:group-hover:text-violet-300",
    header: "from-violet-400 to-violet-500 dark:from-violet-600 dark:to-violet-700",
  },
  amber: {
    bg: "bg-amber-50/80 dark:bg-amber-950/20",
    border: "border-amber-100 dark:border-amber-900/40",
    hoverBorder: "hover:border-amber-300 dark:hover:border-amber-700",
    iconBg:
      "bg-amber-100 dark:bg-amber-900/40 group-hover:bg-amber-200 dark:group-hover:bg-amber-800/50",
    iconColor: "text-amber-600 dark:text-amber-400",
    titleHover: "group-hover:text-amber-700 dark:group-hover:text-amber-300",
    header: "from-amber-400 to-amber-500 dark:from-amber-600 dark:to-amber-700",
  },
  emerald: {
    bg: "bg-emerald-50/80 dark:bg-emerald-950/20",
    border: "border-emerald-100 dark:border-emerald-900/40",
    hoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-700",
    iconBg:
      "bg-emerald-100 dark:bg-emerald-900/40 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-800/50",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    titleHover: "group-hover:text-emerald-700 dark:group-hover:text-emerald-300",
    header: "from-emerald-400 to-emerald-500 dark:from-emerald-600 dark:to-emerald-700",
  },
  indigo: {
    bg: "bg-indigo-50/80 dark:bg-indigo-950/20",
    border: "border-indigo-100 dark:border-indigo-900/40",
    hoverBorder: "hover:border-indigo-300 dark:hover:border-indigo-700",
    iconBg:
      "bg-indigo-100 dark:bg-indigo-900/40 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800/50",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    titleHover: "group-hover:text-indigo-700 dark:group-hover:text-indigo-300",
    header: "from-indigo-400 to-indigo-500 dark:from-indigo-600 dark:to-indigo-700",
  },
};

function MonitorSistem({ user, onShowToast }) {
  // "activeCard": null artinya lagi di grid view (dashboard menu), kalau
  // udah diisi id salah satu card berarti lagi di detail view.
  const [activeCard, setActiveCard] = useState(null);

  const cards = [
    {
      id: "dashboard",
      title: "System Health",
      description: "Ringkasan kesehatan sistem dan status komponen utama",
      icon: Activity,
      color: "sky",
      component: MonitorDashboard,
    },
    {
      id: "performance",
      title: "Performance",
      description: "Pantau performa aplikasi, response time, dan resource",
      icon: Gauge,
      color: "teal",
      component: PerformanceMonitor,
    },
    {
      id: "cleanup",
      title: "Database Cleanup",
      description: "Kelola dan bersihkan data lama di database",
      icon: Database,
      color: "violet",
      component: DatabaseCleanupMonitor,
    },
    {
      id: "audit",
      title: "Code Audit",
      description: "Audit kualitas dan konsistensi kode project",
      icon: FileCode2,
      color: "amber",
      component: CodeAudit,
    },
    {
      id: "structure",
      title: "Struktur Project",
      description: "Lihat struktur folder dan file dalam project",
      icon: FolderTree,
      color: "emerald",
      component: ProjectStructure,
    },
    {
      id: "dbStructure",
      title: "Struktur Database",
      description: "Lihat struktur tabel dan relasi database",
      icon: Table2,
      color: "indigo",
      component: DatabaseStructure,
    },
  ];

  const currentCard = cards.find((card) => card.id === activeCard);
  const ActiveComponent = currentCard?.component;

  const changeCard = (id) => {
    setActiveCard(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ===== Detail View =====
  if (activeCard && ActiveComponent) {
    const IconComponent = currentCard.icon;
    const colorStyle = CARD_COLOR_STYLES[currentCard.color] || CARD_COLOR_STYLES.sky;

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-3 sm:p-4 md:p-6 transition-colors duration-200">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4 sm:mb-5 overflow-x-auto">
            <button
              onClick={() => changeCard(null)}
              className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-all whitespace-nowrap flex-shrink-0 p-2 sm:p-2.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 active:scale-95"
            >
              <LayoutGrid size={16} className="sm:w-4 sm:h-4" />
              <span className="hidden xs:inline font-medium">Monitor Sistem</span>
            </button>
            <ChevronRight
              size={16}
              className="text-gray-400 dark:text-gray-500 flex-shrink-0 sm:w-4 sm:h-4"
            />
            <span className="text-blue-600 dark:text-blue-400 font-semibold whitespace-nowrap truncate">
              {currentCard.title}
            </span>
          </div>

          {/* Header with back button */}
          <div className="flex items-center justify-between mb-5 sm:mb-6 gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div
                className={`p-2.5 bg-gradient-to-br ${colorStyle.header} text-white rounded-xl shadow-md flex-shrink-0`}
              >
                <IconComponent className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 dark:text-gray-100 truncate">
                  {currentCard.title}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {currentCard.description}
                </p>
              </div>
            </div>

            <button
              onClick={() => changeCard(null)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-all active:scale-95 text-gray-700 dark:text-gray-300 font-medium flex-shrink-0"
            >
              <ChevronRight size={18} className="rotate-180" />
              <span>Kembali</span>
            </button>
          </div>

          {/* Card Content */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/30 transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700">
            <ActiveComponent user={user} onShowToast={onShowToast} />
          </div>
        </div>
      </div>
    );
  }

  // ===== Grid View (Dashboard) =====
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-3 sm:p-4 md:p-6 transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white rounded-xl shadow-md">
              <LayoutGrid className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 dark:text-gray-100">
                Monitor Sistem
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                Pemeriksaan kesehatan sistem dan integritas data
              </p>
            </div>
          </div>
        </div>

        {/* Cards Grid: 2 kolom di HP, 3 kolom di tablet, 4 kolom di desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {cards.map((card) => {
            const IconComponent = card.icon;
            const colorStyle = CARD_COLOR_STYLES[card.color] || CARD_COLOR_STYLES.sky;

            return (
              <button
                key={card.id}
                onClick={() => changeCard(card.id)}
                className={`group relative rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-lg dark:shadow-gray-900/30 border transition-all duration-300 text-left hover:-translate-y-0.5 active:scale-95 min-h-[140px] flex flex-col ${colorStyle.bg} ${colorStyle.border} ${colorStyle.hoverBorder}`}
              >
                {/* Icon Container */}
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2.5 rounded-lg transition-colors ${colorStyle.iconBg}`}>
                    <IconComponent className={`w-5 h-5 ${colorStyle.iconColor}`} />
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Content */}
                <div className="flex-grow">
                  <h3
                    className={`text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-100 mb-1 transition-colors ${colorStyle.titleHover}`}
                  >
                    {card.title}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-tight">
                    {card.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default MonitorSistem;
