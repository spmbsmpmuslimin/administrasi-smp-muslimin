import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Settings,
  User,
  Users,
  School,
  Calendar,
  Building2,
  Database,
  Home,
  ChevronRight,
  AlertCircle,
  FileText,
  ArrowRight,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import ProfileTab from "./ProfileTab";
import SchoolManagementTab from "./SchoolManagementTab";
import AcademicYearTab from "./academic/AcademicYearTab";
import SchoolSettingsTab from "./SchoolSettingsTab";
import SystemTab from "./SystemTab";
import MaintenanceModeTab from "./MaintenanceModeTab";
import RaportConfig from "../e-raport/RaportConfig";
import TeacherAssignmentTab from "./TeacherAssignmentTab";
import UserManagementTab from "./UserManagementTab";

const Setting = ({ user, onShowToast }) => {
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
      } else if (
        schoolLevel === "SMA" ||
        schoolLevel === "SMK" ||
        schoolLevel === "MA"
      ) {
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

  // Menu cards configuration
  const menuCards = [
    {
      id: "profile",
      title: "Profile",
      description: "Kelola informasi profil pribadi Anda",
      icon: User,
      available: true,
    },
    {
      id: "user-management",
      title: "Manajemen User",
      description: "Kelola akun pengguna dan hak akses",
      icon: Users,
      available: user?.role === "admin",
    },
    {
      id: "school",
      title: "Manajemen Sekolah",
      description: "Kelola data siswa dan kelas",
      icon: School,
      available: user?.role === "admin" || user?.role === "guru_bk",
    },
    {
      id: "academic",
      title: "Manajemen Tahun Ajaran",
      description: "Atur periode dan tahun ajaran",
      icon: Calendar,
      available: user?.role === "admin",
    },
    {
      id: "assignment",
      title: "Manajemen Penugasan Guru",
      description: "Kelola penugasan guru dan mata pelajaran",
      icon: Users,
      available: user?.role === "admin",
    },
    {
      id: "settings",
      title: "Manajemen Pengaturan Sekolah",
      description: "Konfigurasi umum sistem sekolah",
      icon: Building2,
      available: user?.role === "admin",
    },
    {
      id: "raport",
      title: "Konfigurasi E-Raport",
      description: "Setup template dan format raport",
      icon: FileText,
      available: user?.role === "admin",
    },
    {
      id: "system",
      title: "Manajemen System",
      description: "Pengaturan sistem dan database",
      icon: Database,
      available: user?.role === "admin",
    },
    {
      id: "maintenance",
      title: "Maintenance",
      description: "Mode pemeliharaan dan backup",
      icon: AlertCircle,
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
      // ✅ CRITICAL: Handler untuk navigasi antar tab
      onNavigateToUserManagement: () => changeTab("user-management"),
    };

    switch (activeTab) {
      case "profile":
        return <ProfileTab {...commonProps} />;
      case "user-management":
        return <UserManagementTab {...commonProps} />;
      case "school":
        return <SchoolManagementTab {...commonProps} />;
      case "academic":
        return <AcademicYearTab {...commonProps} />;
      case "settings":
        return <SchoolSettingsTab {...commonProps} />;
      case "raport":
        return <RaportConfig {...commonProps} />;
      case "maintenance":
        return <MaintenanceModeTab {...commonProps} />;
      case "system":
        return <SystemTab {...commonProps} />;
      case "assignment":
        return <TeacherAssignmentTab {...commonProps} />;
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
          <p className="mt-4 text-gray-600 dark:text-gray-300 font-medium">
            Memuat pengaturan...
          </p>
        </div>
      </div>
    );
  }

  // Detail View - Show when specific tab is selected
  if (activeTab && activeTab !== "dashboard") {
    const currentCard = getCurrentCard();
    const IconComponent = currentCard?.icon || Settings;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/50 to-white dark:from-gray-900 dark:to-gray-800 p-3 sm:p-4 lg:p-6 transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4 sm:mb-5 overflow-x-auto">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-all whitespace-nowrap flex-shrink-0 p-2 sm:p-2.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 active:scale-95">
              <Home size={16} className="sm:w-4 sm:h-4" />
              <span className="hidden xs:inline font-medium">Dashboard</span>
            </button>
            <ChevronRight
              size={16}
              className="text-gray-400 dark:text-gray-500 flex-shrink-0 sm:w-4 sm:h-4"
            />
            <button
              onClick={() => changeTab("dashboard")}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-all whitespace-nowrap font-medium">
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
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white rounded-xl shadow-md">
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
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-all active:scale-95 text-gray-700 dark:text-gray-300 font-medium">
              <ChevronRight size={18} className="rotate-180" />
              <span className="hidden sm:inline">Kembali</span>
            </button>
          </div>

          {/* Tab Content */}
          <div
            id={`${activeTab}-tab-content`}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/30 transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700">
            {renderActiveTab()}
          </div>
        </div>
      </div>
    );
  }

  // Dashboard View - Card Grid
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 to-white dark:from-gray-900 dark:to-gray-800 p-3 sm:p-4 lg:p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4 sm:mb-5 overflow-x-auto">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-all whitespace-nowrap flex-shrink-0 p-2 sm:p-2.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 active:scale-95">
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

        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white rounded-xl shadow-md">
              <Settings className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 dark:text-gray-100">
                Pengaturan Sistem
              </h1>
              {schoolConfig && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {schoolConfig.schoolName} - {schoolConfig.schoolLevel}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {availableCards.map((card) => {
            const IconComponent = card.icon;

            return (
              <button
                key={card.id}
                onClick={() => changeTab(card.id)}
                className="group relative bg-white dark:bg-gray-800 rounded-xl p-5 sm:p-6 shadow-sm hover:shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 text-left hover:-translate-y-1 active:scale-95">
                {/* Icon Container */}
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                    <IconComponent className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Content */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {card.description}
                  </p>
                </div>

                {/* Hover Effect Border */}
                <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-blue-500/20 dark:group-hover:border-blue-500/30 transition-all pointer-events-none"></div>
              </button>
            );
          })}
        </div>

        {/* Info Footer */}
        {user?.role === "admin" && (
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <p className="text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
              <AlertCircle size={16} />
              <span>Anda memiliki akses penuh sebagai Administrator</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Setting;
