import React, { useState } from "react";
import { AlertCircle, Ban } from "lucide-react";
import MaintenanceModeTab from "./MaintenanceModeTab";
import BlockUserTab from "./BlockUserTab";

const TABS = [
  { key: "maintenance", label: "Mode Maintenance", icon: AlertCircle },
  { key: "block", label: "Blokir User", icon: Ban },
];

const MaintenanceTab = ({ showToast }) => {
  const [activeTab, setActiveTab] = useState("maintenance");

  return (
    <div className="w-full">
      {/* Tab Switcher */}
      <div className="flex border-b border-blue-200 dark:border-gray-700 px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 gap-1 sm:gap-2 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-t-lg text-xs sm:text-sm font-medium whitespace-nowrap transition border-b-2 -mb-px ${
                isActive
                  ? "border-blue-600 dark:border-purple-500 text-blue-700 dark:text-purple-300 bg-blue-50 dark:bg-purple-900/10"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-gray-200 hover:bg-blue-50/50 dark:hover:bg-gray-800/50"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "maintenance" && <MaintenanceModeTab showToast={showToast} />}
        {activeTab === "block" && <BlockUserTab showToast={showToast} />}
      </div>
    </div>
  );
};

export default MaintenanceTab;
