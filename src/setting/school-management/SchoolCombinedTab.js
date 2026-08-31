// school-management/SchoolCombinedTab.js
// Gabungan card "Manajemen Sekolah" (data siswa & guru, SchoolManagementTab),
// "Manajemen Pengaturan Sekolah" (identitas & konfigurasi umum,
// SchoolSettingsTab), dan "Manajemen Penugasan Guru" (TeacherAssignmentTab)
// jadi 1 card di dashboard Pengaturan, dipecah pake sub-tab internal di sini
// biar ga bikin banyak card terpisah yang isinya masih 1 domain (sekolah &
// guru). Semua komponen anak dipakai apa adanya (tanpa diubah logic-nya),
// cuma dibungkus switcher tab.
//
// ⚠️ Catatan role: card ini sendiri available buat admin & guru_bk (lihat
// Setting.js), tapi tab "Penugasan Guru" SENGAJA cuma dimunculin buat admin
// -- nyamain access control yang sebelumnya berlaku pas ini masih card
// terpisah ("assignment", available: admin doang).

import React, { useState, useMemo } from "react";
import { Users, Building2, UserCog } from "lucide-react";
import SchoolManagementTab from "./SchoolManagementTab";
import SchoolSettingsTab from "./SchoolSettingsTab";
import TeacherAssignmentTab from "./TeacherAssignmentTab";

const ALL_SUB_TABS = [
  {
    id: "data",
    label: "Data Sekolah",
    shortLabel: "Data",
    icon: Users,
    component: SchoolManagementTab,
  },
  {
    id: "pengaturan",
    label: "Pengaturan Sekolah",
    shortLabel: "Pengaturan",
    icon: Building2,
    component: SchoolSettingsTab,
  },
  {
    id: "penugasan",
    label: "Penugasan Guru",
    shortLabel: "Penugasan",
    icon: UserCog,
    component: TeacherAssignmentTab,
    adminOnly: true,
  },
];

const SchoolCombinedTab = (props) => {
  const isAdmin = props?.user?.role === "admin";

  const subTabs = useMemo(() => ALL_SUB_TABS.filter((tab) => !tab.adminOnly || isAdmin), [isAdmin]);

  const [activeSubTab, setActiveSubTab] = useState(subTabs[0].id);

  const ActiveComponent =
    subTabs.find((tab) => tab.id === activeSubTab)?.component || subTabs[0].component;

  return (
    <div>
      {/* Sub Tab Switcher */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 sm:px-6 pt-4">
        <div className="flex gap-2 overflow-x-auto pb-3">
          {subTabs.map((tab) => {
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

export default SchoolCombinedTab;
