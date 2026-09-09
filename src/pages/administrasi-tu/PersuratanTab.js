// [file name]: pages/administrasi-tu/PersuratanTab.js
// Sub-tab internal buat card "Persuratan" di dalam Administrasi TU (lihat
// AdministrasiTU.js -- dibuka pas ?tab=persuratan). Pola & struktur file
// ini SENGAJA disamain persis kayak school-management/SchoolCombinedTab.js
// (array ALL_SUB_TABS + switcher sticky di atas + render komponen aktif),
// biar konsisten sama cara sub-tab-di-dalam-card yang udah ada.
//
// ⚠️ TAHAP AWAL (skeleton dulu): ke-3 sub-tab di bawah masih nunjuk ke
// ComingSoonPanel (belum ada form/tabel data beneran) -- nunggu skema
// tabel DB-nya (nomor_surat, tanggal, jenis_surat, asal_tujuan, perihal,
// status, keterangan, dokumen -- lihat dokumentasi rencana modul TU) fix
// dulu sebelum digambar. Ganti `component` per sub-tab di ALL_SUB_TABS
// kalau komponen aslinya udah jadi -- gak perlu ubah apa-apa lagi di
// bagian switcher/render-nya.
//
// Belum ada pembatasan role di level sub-tab (beda kayak SchoolCombinedTab
// yang punya `adminOnly` buat tab "Penugasan Guru") -- ketiga sub-tab di
// sini available buat siapa aja yang bisa masuk ke halaman Administrasi TU
// (Admin & TU, lihat menuConfig.js). Tambahin flag kayak `adminOnly` di
// sini kalau nanti ternyata butuh dibedain (misal Disposisi cuma Admin).

import React, { useState } from "react";
import { Inbox, Send, Share2 } from "lucide-react";
import ComingSoonPanel from "./ComingSoonPanel";

// Placeholder sementara -- tinggal diganti komponen asli per sub-tab
// (SuratMasukTab, SuratKeluarTab, DisposisiTab) kalau udah jadi.
const SuratMasukPlaceholder = () => (
  <ComingSoonPanel
    title="Surat Masuk"
    description="Pencatatan & arsip surat masuk masih dalam pengembangan."
  />
);
const SuratKeluarPlaceholder = () => (
  <ComingSoonPanel
    title="Surat Keluar"
    description="Pencatatan & arsip surat keluar masih dalam pengembangan."
  />
);
const DisposisiPlaceholder = () => (
  <ComingSoonPanel title="Disposisi" description="Alur disposisi surat masih dalam pengembangan." />
);

const ALL_SUB_TABS = [
  {
    id: "surat-masuk",
    label: "Surat Masuk",
    shortLabel: "Masuk",
    icon: Inbox,
    component: SuratMasukPlaceholder,
  },
  {
    id: "surat-keluar",
    label: "Surat Keluar",
    shortLabel: "Keluar",
    icon: Send,
    component: SuratKeluarPlaceholder,
  },
  {
    id: "disposisi",
    label: "Disposisi",
    shortLabel: "Disposisi",
    icon: Share2,
    component: DisposisiPlaceholder,
  },
];

const PersuratanTab = (props) => {
  const [activeSubTab, setActiveSubTab] = useState(ALL_SUB_TABS[0].id);

  const ActiveComponent =
    ALL_SUB_TABS.find((tab) => tab.id === activeSubTab)?.component || ALL_SUB_TABS[0].component;

  return (
    <div>
      {/* Sub Tab Switcher */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 sm:px-6 pt-4">
        <div className="flex gap-2 overflow-x-auto pb-3">
          {ALL_SUB_TABS.map((tab) => {
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

export default PersuratanTab;
