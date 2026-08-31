// setting/kelola-raport/RaportNilaiTab.js
// Dipanggil dari Setting.js sebagai isi card menu "Nilai Raport"
// (id: "kelola-raport") di halaman Pengaturan, lewat renderActiveTab().
// Entry point fitur Nilai Raport — cuma nge-render sub-nav internal
// (Import / Manajemen / Rekap) dan switch komponen anaknya, ga ada
// logic data sendiri.
//
// Beda scope sama RaportConfig.js (menu "Konfigurasi E-Raport") --
// RaportConfig itu setup template/format raport, sedangkan fitur ini
// isi datanya: import nilai dari PDF e-Raport Pemerintah, kelola per
// siswa, dan rekap lintas semester.
//
// Anak-anaknya:
// - ImportRaportForm.js       -> pilih tahun ajaran/semester/kelas + upload PDF
// - ManajemenRaportTable.js   -> list raport tersimpan + filter + publish
// - RekapMultiSemester.js     -> matrix nilai siswa x semester + export excel
// - RekapKelulusan.js         -> rekap nilai semester 1-6 kelas 9 (roster saat ini, bukan class_name historis) + edit nilai langsung buat proses kelulusan

import React, { useState } from "react";
import { Upload, ListChecks, BarChart3, GraduationCap } from "lucide-react";
import ImportRaportForm from "./ImportRaportForm";
import ManajemenRaportTable from "./ManajemenRaportTable";
import RekapMultiSemester from "./RekapMultiSemester";
import RekapKelulusan from "./RekapKelulusan";

// Sub-nav internal untuk fitur Nilai Raport (Import / Manajemen / Rekap).
// Beda dari nav utama di Setting.js (card grid + URL param) -- di sini cukup
// state lokal karena ketiga sub-tab ini satu alur kerja yang saling terkait,
// ga perlu di-deep-link lewat URL kayak tab-tab utama.
const SUB_TABS = [
  { id: "import", label: "Import Raport", icon: Upload },
  { id: "manajemen", label: "Manajemen Nilai", icon: ListChecks },
  { id: "rekap", label: "Rekap Multi Semester", icon: BarChart3 },
  { id: "kelulusan", label: "Rekap Kelulusan", icon: GraduationCap },
];

const RaportNilaiTab = (props) => {
  const [activeSubTab, setActiveSubTab] = useState("import");

  const renderSubTab = () => {
    switch (activeSubTab) {
      case "import":
        return (
          <ImportRaportForm
            {...props}
            onImportSelesai={() => setActiveSubTab("manajemen")}
          />
        );
      case "manajemen":
        return <ManajemenRaportTable {...props} />;
      case "rekap":
        return <RekapMultiSemester {...props} />;
      case "kelulusan":
        return <RekapKelulusan {...props} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col">
      {/* Sub-nav */}
      <div className="flex gap-1 p-3 sm:p-4 border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent"
              }`}>
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">{renderSubTab()}</div>
    </div>
  );
};

export default RaportNilaiTab;
