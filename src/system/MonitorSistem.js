import React, { useState } from "react";
import MonitorDashboard from "./MonitorDashboard";
import DatabaseCleanupMonitor from "./DatabaseCleanupMonitor";
import PerformanceMonitor from "./PerformanceMonitor";
import { Activity, Database, Gauge, Menu, X } from "lucide-react";

function MonitorSistem({ user, onShowToast }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const tabs = [
    {
      id: "dashboard",
      label: "System Health",
      icon: Activity,
      component: MonitorDashboard,
    },
    {
      id: "performance",
      label: "Performance",
      icon: Gauge,
      component: PerformanceMonitor,
    },
    {
      id: "cleanup",
      label: "Database Cleanup",
      icon: Database,
      component: DatabaseCleanupMonitor,
    },
  ];

  const ActiveComponent = tabs.find((tab) => tab.id === activeTab)?.component;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-3 sm:p-4 md:p-6 transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        {/* Header dengan responsif */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 leading-tight">
                Monitor Sistem
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">
                Pemeriksaan kesehatan sistem dan integritas data
              </p>
            </div>

            {/* Mobile Menu Toggle - hanya di mobile */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={showMobileMenu ? "Tutup menu" : "Buka menu"}>
              {showMobileMenu ? (
                <X size={24} className="text-gray-600 dark:text-gray-300" />
              ) : (
                <Menu size={24} className="text-gray-600 dark:text-gray-300" />
              )}
            </button>
          </div>
        </div>

        {/* Desktop Tab Navigation - Hidden on mobile */}
        <div className="hidden lg:flex mb-4 sm:mb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex min-w-max space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 font-medium text-sm
                    border-b-2 transition-all duration-200 min-h-[48px]
                    ${
                      isActive
                        ? "border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30"
                        : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }
                  `}>
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile Tab Navigation - Dropdown style */}
        {showMobileMenu && (
          <div className="lg:hidden mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden animate-in slide-in-from-top duration-200">
            <div className="p-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setShowMobileMenu(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 p-3 rounded-lg font-medium text-sm transition-all
                      ${
                        isActive
                          ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }
                      min-h-[48px]
                    `}>
                    <Icon
                      size={18}
                      className={
                        isActive
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-gray-500 dark:text-gray-400"
                      }
                    />
                    <span className="flex-1 text-left">{tab.label}</span>
                    {isActive && (
                      <div className="w-2 h-2 bg-blue-600 dark:bg-blue-500 rounded-full animate-pulse"></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tablet Horizontal Scroll Tabs - Only on tablet */}
        <div className="lg:hidden block mb-4 overflow-x-auto scrollbar-hide">
          <div className="flex min-w-max space-x-2 pb-2 px-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 whitespace-nowrap py-3 px-4 rounded-lg font-medium text-xs sm:text-sm transition-all
                    ${
                      isActive
                        ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-600 dark:border-blue-500 shadow-sm"
                        : "text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }
                    min-h-[44px] flex-shrink-0
                  `}>
                  <Icon size={16} className={isActive ? "animate-pulse" : ""} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content - Responsive dengan dark mode */}
        <div className="transition-all duration-300">
          {activeTab === "dashboard" && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/30 overflow-hidden">
              <MonitorDashboard user={user} onShowToast={onShowToast} />
            </div>
          )}
          {activeTab === "performance" && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/30 overflow-hidden">
              <PerformanceMonitor user={user} onShowToast={onShowToast} />
            </div>
          )}
          {activeTab === "cleanup" && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/30 overflow-hidden">
              <DatabaseCleanupMonitor user={user} onShowToast={onShowToast} />
            </div>
          )}
        </div>

        {/* Overlay for mobile menu */}
        {showMobileMenu && (
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-40"
            onClick={() => setShowMobileMenu(false)}></div>
        )}
      </div>
    </div>
  );
}

export default MonitorSistem;
