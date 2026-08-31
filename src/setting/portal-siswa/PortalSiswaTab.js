// portal-siswa/PortalSiswaTab.js
// Wrapper card "Portal Siswa" -- gabungin semua tab yang berhubungan sama
// pengelolaan portal siswa dari sisi admin (pola sama kayak
// school-management/SchoolCombinedTab.js). Baru ada 1 sub-tab yang jalan
// sekarang (Akun & Password), sub-tab lain di bawah ini sengaja di-comment
// dulu -- tinggal uncomment + isi file-nya begitu modulnya jadi:
//
//   - SaranSiswaTab.js          -> inbox baca masukan dari StudentSaran.js
//   - PengumumanTab.js          -> CRUD isi StudentPengumuman.js
//   - PerangkatTerhubungTab.js  -> monitoring/force-logout device siswa
//
// Kalau baru ada 1 sub-tab, switcher-nya otomatis disembunyiin (percuma ada
// tab-pill kalau cuma 1 pilihan) -- begitu sub-tab lain ditambah ke SUB_TABS,
// switcher otomatis muncul lagi tanpa perlu ubah logic apa-apa.

import React, { useState } from "react";
import { KeyRound } from "lucide-react";
import AkunSiswaTab from "./AkunSiswaTab";
// import SaranSiswaTab from "./SaranSiswaTab";
// import PengumumanTab from "./PengumumanTab";
// import PerangkatTerhubungTab from "./PerangkatTerhubungTab";
// import { MessageSquare, Megaphone, Smartphone } from "lucide-react";

const SUB_TABS = [
  {
    id: "akun",
    label: "Akun & Password",
    shortLabel: "Akun",
    icon: KeyRound,
    component: AkunSiswaTab,
  },
  // {
  //   id: "saran",
  //   label: "Saran Siswa",
  //   shortLabel: "Saran",
  //   icon: MessageSquare,
  //   component: SaranSiswaTab,
  // },
  // {
  //   id: "pengumuman",
  //   label: "Pengumuman",
  //   shortLabel: "Info",
  //   icon: Megaphone,
  //   component: PengumumanTab,
  // },
  // {
  //   id: "perangkat",
  //   label: "Perangkat Terhubung",
  //   shortLabel: "Device",
  //   icon: Smartphone,
  //   component: PerangkatTerhubungTab,
  // },
];

const PortalSiswaTab = (props) => {
  const [activeSubTab, setActiveSubTab] = useState(SUB_TABS[0].id);

  const ActiveComponent =
    SUB_TABS.find((tab) => tab.id === activeSubTab)?.component || SUB_TABS[0].component;

  return (
    <div>
      {/* Sub Tab Switcher -- disembunyiin kalau sub-tab-nya cuma 1 */}
      {SUB_TABS.length > 1 && (
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
      )}

      {/* Sub Tab Content */}
      <ActiveComponent {...props} />
    </div>
  );
};

export default PortalSiswaTab;
