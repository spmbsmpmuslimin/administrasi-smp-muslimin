// setting/Setting.js
// Halaman utama Pengaturan, diakses lewat route /setting. Nge-render grid
// card menu (dashboard view) atau isi satu tab (detail view) berdasarkan
// query param ?tab=. Tiap tab dapet commonProps yang sama (user, loading,
// showToast, schoolConfig, darkMode, dll) lewat renderActiveTab().
//
// Baru ditambahin: card "kelola-raport" (Nilai Raport) -> render
// RaportNilaiTab.js. Beda dari card "raport" (Konfigurasi E-Raport, isinya
// RaportConfig.js) -- yang itu setup template/format, ini kelola datanya
// (import PDF nilai raport, manajemen per siswa, rekap multi semester).

import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Settings,
  User,
  School,
  Calendar,
  Database,
  Home,
  ChevronRight,
  AlertCircle,
  ArrowRight,
  MessageSquare,
  UserPlus,
  UserCheck,
  ShieldCheck,
  FileBarChart,
  FileSpreadsheet,
  Wrench,
  CalendarClock,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import ProfileTab from "./ProfileTab";
import SchoolCombinedTab from "./school-management/SchoolCombinedTab";
import AcademicYearTab from "./academic/AcademicYearTab";
import SystemTab from "./SystemTab";
import MaintenanceModeTab from "./MaintenanceModeTab";
import RaportConfig from "../e-raport/RaportConfig";
import RaportNilaiTab from "./kelola-raport/RaportNilaiTab";
import UserManagementTab from "./UserManagementTab";
import FeedbackCombinedTab from "./feedback/FeedbackCombinedTab";
import ActiveUsersTab from "./ActiveUsersTab";
import PortalSiswaTab from "./portal-siswa/PortalSiswaTab";
import JadwalGuruTab from "./JadwalGuruTab";

// Palet pastel per kartu menu. Ditulis lengkap per-kelas (bukan digabung
// pake template string kayak `bg-${color}-50`) supaya Tailwind bisa nge-scan
// class-nya pas build -- kalau dinamis, class-nya bisa ke-purge dan ilang.
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
  fuchsia: {
    bg: "bg-fuchsia-50/80 dark:bg-fuchsia-950/20",
    border: "border-fuchsia-100 dark:border-fuchsia-900/40",
    hoverBorder: "hover:border-fuchsia-300 dark:hover:border-fuchsia-700",
    iconBg:
      "bg-fuchsia-100 dark:bg-fuchsia-900/40 group-hover:bg-fuchsia-200 dark:group-hover:bg-fuchsia-800/50",
    iconColor: "text-fuchsia-600 dark:text-fuchsia-400",
    titleHover: "group-hover:text-fuchsia-700 dark:group-hover:text-fuchsia-300",
    header: "from-fuchsia-400 to-fuchsia-500 dark:from-fuchsia-600 dark:to-fuchsia-700",
  },
  orange: {
    bg: "bg-orange-50/80 dark:bg-orange-950/20",
    border: "border-orange-100 dark:border-orange-900/40",
    hoverBorder: "hover:border-orange-300 dark:hover:border-orange-700",
    iconBg:
      "bg-orange-100 dark:bg-orange-900/40 group-hover:bg-orange-200 dark:group-hover:bg-orange-800/50",
    iconColor: "text-orange-600 dark:text-orange-400",
    titleHover: "group-hover:text-orange-700 dark:group-hover:text-orange-300",
    header: "from-orange-400 to-orange-500 dark:from-orange-600 dark:to-orange-700",
  },
  slate: {
    bg: "bg-slate-50/80 dark:bg-slate-800/40",
    border: "border-slate-200 dark:border-slate-700/60",
    hoverBorder: "hover:border-slate-400 dark:hover:border-slate-600",
    iconBg:
      "bg-slate-100 dark:bg-slate-700/50 group-hover:bg-slate-200 dark:group-hover:bg-slate-700/70",
    iconColor: "text-slate-600 dark:text-slate-300",
    titleHover: "group-hover:text-slate-700 dark:group-hover:text-slate-200",
    header: "from-slate-400 to-slate-500 dark:from-slate-600 dark:to-slate-700",
  },
  cyan: {
    bg: "bg-cyan-50/80 dark:bg-cyan-950/20",
    border: "border-cyan-100 dark:border-cyan-900/40",
    hoverBorder: "hover:border-cyan-300 dark:hover:border-cyan-700",
    iconBg:
      "bg-cyan-100 dark:bg-cyan-900/40 group-hover:bg-cyan-200 dark:group-hover:bg-cyan-800/50",
    iconColor: "text-cyan-600 dark:text-cyan-400",
    titleHover: "group-hover:text-cyan-700 dark:group-hover:text-cyan-300",
    header: "from-cyan-400 to-cyan-500 dark:from-cyan-600 dark:to-cyan-700",
  },
  rose: {
    bg: "bg-rose-50/80 dark:bg-rose-950/20",
    border: "border-rose-100 dark:border-rose-900/40",
    hoverBorder: "hover:border-rose-300 dark:hover:border-rose-700",
    iconBg:
      "bg-rose-100 dark:bg-rose-900/40 group-hover:bg-rose-200 dark:group-hover:bg-rose-800/50",
    iconColor: "text-rose-600 dark:text-rose-400",
    titleHover: "group-hover:text-rose-700 dark:group-hover:text-rose-300",
    header: "from-rose-400 to-rose-500 dark:from-rose-600 dark:to-rose-700",
  },
  red: {
    bg: "bg-red-50/80 dark:bg-red-950/20",
    border: "border-red-100 dark:border-red-900/40",
    hoverBorder: "hover:border-red-300 dark:hover:border-red-700",
    iconBg: "bg-red-100 dark:bg-red-900/40 group-hover:bg-red-200 dark:group-hover:bg-red-800/50",
    iconColor: "text-red-600 dark:text-red-400",
    titleHover: "group-hover:text-red-700 dark:group-hover:text-red-300",
    header: "from-red-400 to-red-500 dark:from-red-600 dark:to-red-700",
  },
};

const Setting = ({ user, onShowToast, darkMode, onToggleDarkMode }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Get tab from URL query parameter
  const tabFromURL = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromURL || "dashboard");
  const [loading, setLoading] = useState(false);
  const [schoolConfig, setSchoolConfig] = useState(null);

  // Handle URL parameter changes & smooth scroll
  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);

      // Smooth scroll to tab content with delay
      setTimeout(() => {
        const element = document.getElementById(`${urlTab}-tab-content`);
        if (element) {
          element.scrollIntoView({
            behavior: "smooth",
            block: "start",
            inline: "nearest",
          });
        }
      }, 150);
    }
  }, [searchParams, activeTab]);

  useEffect(() => {
    if (user) {
      loadSchoolConfig();
    }
  }, [user]);

  // Load school config dari Supabase
  const loadSchoolConfig = async () => {
    try {
      setLoading(true);
      const { data: settings, error } = await supabase
        .from("school_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["school_name", "school_level"]);

      if (error) throw error;

      const config = {};
      settings?.forEach((item) => {
        config[item.setting_key] = item.setting_value;
      });

      // Generate grades otomatis berdasarkan school_level
      const schoolLevel = config.school_level || "SMP";
      let grades = ["7", "8", "9"]; // Default SMP

      if (schoolLevel === "SMP" || schoolLevel === "MTs") {
        grades = ["7", "8", "9"];
      } else if (schoolLevel === "SMA" || schoolLevel === "SMK" || schoolLevel === "MA") {
        grades = ["10", "11", "12"];
      } else if (schoolLevel === "SD" || schoolLevel === "MI") {
        grades = ["1", "2", "3", "4", "5", "6"];
      }

      setSchoolConfig({
        schoolName: config.school_name || "SMP Muslimin Cililin",
        schoolLevel: schoolLevel,
        grades: grades,
      });
    } catch (error) {
      console.error("Error loading school config:", error);
      if (onShowToast) {
        onShowToast("Gagal memuat konfigurasi sekolah", "error");
      }
      setSchoolConfig({
        schoolName: "SMP Muslimin Cililin",
        schoolLevel: "SMP",
        grades: ["7", "8", "9"],
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to change tab dan persist ke URL
  const changeTab = (tabId) => {
    setActiveTab(tabId);
    // Update URL tanpa page reload
    window.history.replaceState(null, "", `/setting?tab=${tabId}`);
  };

  // Menu cards configuration - URUTAN BARU: Profile, Active Users, Feedback Guru di baris 1
  const menuCards = [
    // BARIS 1: Profile - Active Users - Feedback Guru
    {
      id: "profile",
      title: "Profile",
      description: "Kelola informasi profil pribadi Anda",
      icon: User,
      color: "sky",
      available: true,
    },
    {
      id: "active-users",
      title: "Active Users",
      description: "Pantau aktivitas login dan engagement guru",
      icon: UserCheck,
      color: "teal",
      available: user?.role === "admin",
    },
    {
      id: "feedback-guru",
      title: "Feedback Guru & Siswa",
      description: "Kelola masukan, saran, dan laporan bug dari guru & siswa",
      icon: MessageSquare,
      color: "violet",
      available: user?.role === "admin",
    },
    // BARIS 2: Manajemen Tahun Ajaran - Manajemen Sekolah - Penugasan Guru
    {
      id: "academic",
      title: "Manajemen Tahun Ajaran",
      description: "Atur periode dan tahun ajaran",
      icon: Calendar,
      color: "amber",
      available: user?.role === "admin",
    },
    {
      id: "school",
      title: "Manajemen Sekolah",
      description: "Kelola data siswa, kelas, penugasan guru, dan pengaturan umum sekolah",
      icon: School,
      color: "emerald",
      available: user?.role === "admin" || user?.role === "guru_bk",
    },
    {
      id: "jadwal-guru",
      title: "Kelola Jadwal Pelajaran",
      description: "Import jadwal massal & master kode guru",
      icon: CalendarClock,
      color: "amber",
      available: user?.role === "admin",
    },
    // BARIS 3: User Management - Settings - System
    {
      id: "user-management",
      title: "Manajemen User",
      description: "Kelola akun pengguna dan hak akses",
      icon: ShieldCheck,
      color: "fuchsia",
      available: user?.role === "admin",
    },
    {
      id: "system",
      title: "Manajemen System",
      description: "Pengaturan sistem dan database",
      icon: Database,
      color: "slate",
      available: user?.role === "admin",
    },
    // BARIS 4: Raport - Maintenance
    {
      id: "raport",
      title: "Konfigurasi E-Raport",
      description: "Setup template dan format raport",
      icon: FileBarChart,
      color: "cyan",
      available: user?.role === "admin",
    },
    {
      id: "kelola-raport",
      title: "Kelola Nilai Raport",
      description: "Import nilai raport dari PDF & kelola raport digital siswa",
      icon: FileSpreadsheet,
      color: "teal",
      available: user?.role === "admin",
    },
    {
      id: "portal-siswa",
      title: "Portal Siswa",
      description: "Kelola akun, password, dan akses login portal siswa",
      icon: UserPlus,
      color: "rose",
      available: user?.role === "admin",
    },
    {
      id: "maintenance",
      title: "Maintenance",
      description: "Mode pemeliharaan dan backup",
      icon: Wrench,
      color: "red",
      available: user?.role === "admin",
    },
  ];

  const availableCards = menuCards.filter((card) => card.available);

  const getCurrentCard = () => {
    return availableCards.find((card) => card.id === activeTab);
  };

  // ✅ Render Active Tab dengan Navigation Handler
  const renderActiveTab = () => {
    const commonProps = {
      userId: user?.id,
      user,
      loading,
      setLoading,
      showToast: onShowToast,
      schoolConfig,
      refreshSchoolConfig: loadSchoolConfig,
      darkMode,
      onToggleDarkMode,
      // ✅ CRITICAL: Handler untuk navigasi antar tab
      onNavigateToUserManagement: () => changeTab("user-management"),
    };

    switch (activeTab) {
      case "profile":
        return <ProfileTab {...commonProps} />;
      case "user-management":
        return <UserManagementTab {...commonProps} />;
      case "portal-siswa":
        return <PortalSiswaTab {...commonProps} />;
      case "school":
        return <SchoolCombinedTab {...commonProps} />;
      case "academic":
        return <AcademicYearTab {...commonProps} />;
      case "raport":
        return <RaportConfig {...commonProps} />;
      case "kelola-raport":
        return <RaportNilaiTab {...commonProps} />;
      case "maintenance":
        return <MaintenanceModeTab {...commonProps} />;
      case "system":
        return <SystemTab {...commonProps} />;
      case "jadwal-guru":
        return <JadwalGuruTab {...commonProps} />;
      case "feedback-guru":
        return <FeedbackCombinedTab {...commonProps} />;
      case "active-users":
        return <ActiveUsersTab {...commonProps} />;
      default:
        return null;
    }
  };

  // Loading state
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300 font-medium">Memuat pengaturan...</p>
        </div>
      </div>
    );
  }

  // Detail View - Show when specific tab is selected
  if (activeTab && activeTab !== "dashboard") {
    const currentCard = getCurrentCard();
    const IconComponent = currentCard?.icon || Settings;
    const colorStyle = CARD_COLOR_STYLES[currentCard?.color] || CARD_COLOR_STYLES.sky;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="px-4 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4 sm:mb-5 overflow-x-auto">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-all whitespace-nowrap flex-shrink-0 p-2 sm:p-2.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 active:scale-95"
            >
              <Home size={16} className="sm:w-4 sm:h-4" />
              <span className="hidden xs:inline font-medium">Dashboard</span>
            </button>
            <ChevronRight
              size={16}
              className="text-gray-400 dark:text-gray-500 flex-shrink-0 sm:w-4 sm:h-4"
            />
            <button
              onClick={() => changeTab("dashboard")}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-all whitespace-nowrap font-medium"
            >
              Pengaturan
            </button>
            <ChevronRight
              size={16}
              className="text-gray-400 dark:text-gray-500 flex-shrink-0 sm:w-4 sm:h-4"
            />
            <span className="text-blue-600 dark:text-blue-400 font-semibold whitespace-nowrap truncate">
              {currentCard?.title}
            </span>
          </div>

          {/* Header with back button */}
          <div className="flex items-center justify-between mb-5 sm:mb-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div
                className={`p-2.5 bg-gradient-to-br ${colorStyle.header} text-white rounded-xl shadow-md`}
              >
                <IconComponent className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 dark:text-gray-100">
                  {currentCard?.title}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {currentCard?.description}
                </p>
              </div>
            </div>

            {/* Back Button - Di sebelah kanan */}
            <button
              onClick={() => changeTab("dashboard")}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-all active:scale-95 text-gray-700 dark:text-gray-300 font-medium"
            >
              <ChevronRight size={18} className="rotate-180" />
              <span className="hidden sm:inline">Kembali</span>
            </button>
          </div>

          {/* Tab Content */}
          <div
            id={`${activeTab}-tab-content`}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/30 transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700"
          >
            {renderActiveTab()}
          </div>
        </div>
      </div>
    );
  }

  // Dashboard View - Card Grid dengan layout lebih compact
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4 sm:mb-5 overflow-x-auto">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-all whitespace-nowrap flex-shrink-0 p-2 sm:p-2.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 active:scale-95"
          >
            <Home size={16} className="sm:w-4 sm:h-4" />
            <span className="hidden xs:inline font-medium">Dashboard</span>
          </button>
          <ChevronRight
            size={16}
            className="text-gray-400 dark:text-gray-500 flex-shrink-0 sm:w-4 sm:h-4"
          />
          <span className="text-blue-600 dark:text-blue-400 font-semibold whitespace-nowrap">
            Pengaturan
          </span>
        </div>

        {/* Header yang lebih compact */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white rounded-xl shadow-md">
              <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 dark:text-gray-100">
                Pengaturan Sistem
              </h1>
              {schoolConfig && (
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  {schoolConfig.schoolName} - {schoolConfig.schoolLevel}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Cards Grid: 2 kolom di HP, 3 kolom di tablet, 4 kolom di desktop */}
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {availableCards.map((card) => {
              const IconComponent = card.icon;
              const colorStyle = CARD_COLOR_STYLES[card.color] || CARD_COLOR_STYLES.sky;

              return (
                <button
                  key={card.id}
                  onClick={() => changeTab(card.id)}
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

        {/* Info Footer yang lebih compact */}
        {user?.role === "admin" && (
          <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
              <AlertCircle size={14} />
              <span>Anda memiliki akses penuh sebagai Administrator</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Setting;
