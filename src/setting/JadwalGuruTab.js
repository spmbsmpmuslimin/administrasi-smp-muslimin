// setting/JadwalGuruTab.js
// Gabungan 2 fitur admin jadwal jadi 1 halaman di menu Setting:
// - "Import Jadwal Massal" (AdminJadwalMassal.js): olah PDF jadwal WKS.
//   Kurikulum -> class_schedules, publish sekaligus ke semua kelas.
// - "Master Kode Guru" (AdminKodeGuru.js): kamus kode -> Nama Guru +
//   Mapel yang dipakai AdminJadwalMassal buat nge-decode.
//
// Ini cuma wrapper navigasi (sub-tab). Logic & data-fetching tetap ada
// masing-masing di file aslinya, gak diubah.
import React, { useState } from "react";
import { UploadCloud, BookUser } from "lucide-react";
import AdminJadwalMassal from "./AdminJadwalMassal";
import AdminKodeGuru from "./AdminKodeGuru";

const SUB_TABS = [
  { id: "import", label: "Import Jadwal Massal", icon: UploadCloud },
  { id: "kode-guru", label: "Master Kode Guru", icon: BookUser },
];

export default function JadwalGuruTab() {
  const [subTab, setSubTab] = useState("import");

  return (
    <div className="w-full">
      <div className="flex items-center gap-1 px-3 sm:px-4 pt-3 border-b border-gray-100 overflow-x-auto">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors ${
                active
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-theme-secondary hover:text-theme-secondary"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {subTab === "import" && <AdminJadwalMassal />}
      {subTab === "kode-guru" && <AdminKodeGuru />}
    </div>
  );
}
