import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  SettingsIcon,
  User,
  School,
  Calendar,
  Building2,
  Database,
  Home,
  ChevronRight,
  AlertCircle,
  Menu,
  X,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import ProfileTab from "./ProfileTab";
import SchoolManagementTab from "./SchoolManagementTab";
import AcademicYearTab from "./AcademicYearTab";
import SchoolSettingsTab from "./SchoolSettingsTab";
import SystemTab from "./SystemTab";
import MaintenanceModeTab from "./MaintenanceModeTab";

const Setting = ({ user, onShowToast }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Get tab from URL query parameter, default to 'profile'
  const tabFromURL = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromURL || "profile");

  const [loading, setLoading] = useState(false);
  const [schoolConfig, setSchoolConfig] = useState(null);

  // ✅ Mobile menu state
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // ✅ Handle URL parameter changes & smooth scroll
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
  }, [searchParams]); // 🔥 FIX: Depend on searchParams, bukan tabFromURL

  useEffect(() => {
    if (user) {
      loadSchoolConfig();
    }
  }, [user]);

  // ✅ Close mobile menu when tab changes
  useEffect(() => {
    setShowMobileMenu(false);
  }, [activeTab]);

  // ✅ Load school config dari Supabase
  const loadSchoolConfig = async () => {
    try {
      setLoading(true);
      const { data: settings, error } = await supabase
        .from("school_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["school_name", "school_level"]); // 🔧 Hapus "grades"

      if (error) throw error;

      const config = {};
      settings?.forEach((item) => {
        config[item.setting_key] = item.setting_value;
      });

      // 🔧 Generate grades otomatis berdasarkan school_level
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

  // ✅ Function to change tab dan persist ke URL
  const changeTab = (tabId) => {
    setActiveTab(tabId);
    // Update URL tanpa page reload
    window.history.replaceState(null, "", `/setting?tab=${tabId}`);
  };

  // ✅ Tabs - hanya admin yang bisa akses Maintenance Mode
  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    ...(user?.role === "admin"
      ? [
          { id: "school", label: "Manajemen Sekolah", icon: School },
          { id: "academic", label: "Tahun Ajaran", icon: Calendar },
          { id: "settings", label: "Pengaturan Sekolah", icon: Building2 },
          { id: "system", label: "System", icon: Database },
          { id: "maintenance", label: "Maintenance", icon: AlertCircle },
        ]
      : []),
  ];

  // ✅ Get current tab label for breadcrumb
  const getCurrentTabLabel = () => {
    const currentTab = tabs.find((tab) => tab.id === activeTab);
    return currentTab ? currentTab.label : "Profile";
  };

  // ✅ Render Active Tab
  const renderActiveTab = () => {
    const commonProps = {
      userId: user?.id,
      user,
      loading,
      setLoading,
      showToast: onShowToast,
      schoolConfig,
      refreshSchoolConfig: loadSchoolConfig,
    };

    switch (activeTab) {
      case "profile":
        return <ProfileTab {...commonProps} />;
      case "school":
        return <SchoolManagementTab {...commonProps} />;
      case "academic":
        return <AcademicYearTab {...commonProps} />;
      case "settings":
        return <SchoolSettingsTab {...commonProps} />;
      case "maintenance":
        return <MaintenanceModeTab {...commonProps} />;
      case "system":
        return <SystemTab {...commonProps} />;
      default:
        return <ProfileTab {...commonProps} />;
    }
  };

  // ✅ Loading state
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 to-white dark:from-gray-900 dark:to-gray-800 p-3 sm:p-4 lg:p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* ✅ BREADCRUMB - Responsive dengan Dark Mode */}
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
          {activeTab !== "profile" && (
            <>
              <ChevronRight
                size={16}
                className="text-gray-400 dark:text-gray-500 flex-shrink-0 sm:w-4 sm:h-4"
              />
              <span className="text-blue-600 dark:text-blue-400 font-semibold whitespace-nowrap truncate">
                {getCurrentTabLabel()}
              </span>
            </>
          )}
        </div>

        {/* ✅ Header - Responsive dengan Dark Mode */}
        <div className="flex items-center justify-between mb-5 sm:mb-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2.5 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 text-white rounded-xl shadow-md">
              <SettingsIcon className="w-6 h-6 sm:w-7 sm:h-7" />
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

          {/* ✅ Mobile Menu Toggle - Only on mobile */}
          {tabs.length > 1 && (
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden p-3.5 rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-700 dark:hover:to-gray-600 transition-all active:scale-95 shadow-sm"
              aria-label={showMobileMenu ? "Tutup menu" : "Buka menu"}>
              {showMobileMenu ? (
                <X size={24} className="text-gray-700 dark:text-gray-300" />
              ) : (
                <Menu size={24} className="text-gray-700 dark:text-gray-300" />
              )}
            </button>
          )}
        </div>

        {/* ✅ Desktop Tab Navigation - Hidden on mobile dengan Dark Mode */}
        <div className="hidden lg:flex overflow-x-auto border-b border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex min-w-max space-x-1">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  className={`flex items-center gap-3 whitespace-nowrap py-4 px-5 font-medium text-sm transition-all duration-200 min-h-[44px] relative ${
                    isActive
                      ? "text-blue-600 dark:text-blue-400 bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20 border-b-2 border-blue-600 dark:border-blue-500 scale-105 shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }`}
                  onClick={() => changeTab(tab.id)}>
                  <IconComponent
                    size={18}
                    className={`${
                      isActive
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-400 dark:text-gray-500"
                    }`}
                  />
                  {tab.label}
                  {isActive && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-1 bg-blue-600 dark:bg-blue-500 rounded-t-lg"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ✅ Mobile/Tablet Tab Navigation - Dropdown style dengan Dark Mode */}
        {showMobileMenu && (
          <div className="lg:hidden mb-5 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in slide-in-from-top duration-300 z-50 relative">
            <div className="p-3">
              <div className="flex items-center justify-between mb-3 px-2">
                <h3 className="font-bold text-gray-800 dark:text-gray-200 text-lg">
                  Menu Pengaturan
                </h3>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                  <X size={20} className="text-gray-600 dark:text-gray-400" />
                </button>
              </div>
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl font-medium text-base transition-all min-h-[52px] my-1 ${
                      isActive
                        ? "text-blue-600 dark:text-blue-400 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-2 border-blue-500 dark:border-blue-600 shadow-sm"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent"
                    }`}
                    onClick={() => changeTab(tab.id)}>
                    <div
                      className={`p-2 rounded-lg ${
                        isActive
                          ? "bg-blue-100 dark:bg-blue-900/50"
                          : "bg-gray-100 dark:bg-gray-700"
                      }`}>
                      <IconComponent
                        size={20}
                        className={
                          isActive
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-gray-500 dark:text-gray-400"
                        }
                      />
                    </div>
                    <span className="flex-1 text-left font-semibold">
                      {tab.label}
                    </span>
                    {isActive && (
                      <div className="w-2.5 h-2.5 bg-blue-600 dark:bg-blue-500 rounded-full animate-pulse"></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ✅ Tablet Horizontal Scroll Tabs - Only on tablet dengan Dark Mode */}
        <div className="lg:hidden block mb-5 overflow-x-auto scrollbar-hide">
          <div className="flex min-w-max space-x-3 pb-3 px-1">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  className={`flex items-center gap-3 whitespace-nowrap py-3.5 px-4.5 rounded-xl font-medium text-sm transition-all min-h-[44px] flex-shrink-0 shadow-sm ${
                    isActive
                      ? "text-blue-600 dark:text-blue-400 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-2 border-blue-600 dark:border-blue-500"
                      : "text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  }`}
                  onClick={() => changeTab(tab.id)}>
                  <IconComponent
                    size={18}
                    className={
                      isActive
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-500 dark:text-gray-400"
                    }
                  />
                  <span className="hidden sm:inline font-semibold">
                    {tab.label}
                  </span>
                  <span className="sm:hidden font-semibold">
                    {tab.label.split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ✅ Tab Content - Responsive padding dengan Dark Mode */}
        <div
          id={`${activeTab}-tab-content`}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/30 transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700">
          {renderActiveTab()}
        </div>
      </div>

      {/* ✅ Overlay for mobile menu */}
      {showMobileMenu && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-40 backdrop-blur-sm transition-all"
          onClick={() => setShowMobileMenu(false)}></div>
      )}
    </div>
  );
};

export default Setting;
