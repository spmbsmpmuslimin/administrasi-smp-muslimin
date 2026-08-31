// feedback/FeedbackCombinedTab.js
// Gabungan card "Feedback Guru" (masukan/bug/saran dari guru,
// FeedbackGuruTab) dan "Feedback Siswa" (saran dari StudentSaran.js,
// FeedbackSiswaTab) jadi 1 card "Feedback Guru & Siswa" di dashboard
// Pengaturan -- pola sama kayak SchoolCombinedTab.js. Kedua komponen anak
// dipakai apa adanya, cuma dibungkus switcher tab.

import React, { useState } from "react";
import { GraduationCap, MessageCircle } from "lucide-react";
import FeedbackGuruTab from "./FeedbackGuruTab";
import FeedbackSiswaTab from "./FeedbackSiswaTab";

const SUB_TABS = [
  {
    id: "guru",
    label: "Feedback Guru",
    shortLabel: "Guru",
    icon: GraduationCap,
    component: FeedbackGuruTab,
  },
  {
    id: "siswa",
    label: "Feedback Siswa",
    shortLabel: "Siswa",
    icon: MessageCircle,
    component: FeedbackSiswaTab,
  },
];

const FeedbackCombinedTab = (props) => {
  const [activeSubTab, setActiveSubTab] = useState(SUB_TABS[0].id);

  const ActiveComponent =
    SUB_TABS.find((tab) => tab.id === activeSubTab)?.component || SUB_TABS[0].component;

  return (
    <div>
      {/* Sub Tab Switcher */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 sm:px-6 pt-4">
        <div className="flex gap-2 overflow-x-auto pb-3">
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 touch-manipulation active:scale-[0.98] ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md"
                    : "bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                <Icon size={16} />
                <span className="hidden xs:inline">{tab.label}</span>
                <span className="xs:hidden">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub Tab Content */}
      <ActiveComponent {...props} />
    </div>
  );
};

export default FeedbackCombinedTab;
