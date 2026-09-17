// setting/kelola-ujian/PesertaPengawasTab.js
// Kartu 2 dari Manajemen Ujian: "Daftar & Jadwal Pengawas" (nama baru,
// sebelumnya "Peserta & Pengawas" -- diganti karena isinya sekarang murni
// Pengawas, gak ada urusan Peserta lagi di kartu ini).
//
// Kartu ini cuma WADAH (container) buat JadwalPengawasTab, dikunci ke 3
// tab PENGAWAS lewat prop tabPaksa:
//   1. "Daftar Pengawas"
//   2. "Jadwal Ngawas"
//   3. "Rekap"
//
// "Export Daftar Peserta" yang dulu ada di sini SUDAH PINDAH ke kartu
// "Jadwal, Peserta & Pembagian Ruangan" (JadwalRuanganTab.js), ditaruh sebagai tab
// terakhir setelah "Preview Per Ruangan" -- biar 1 alur sama penyusunan
// ruangannya (susun -> preview -> export), tanpa pindah kartu.

import React, { useState } from "react";
import { ChevronLeft, ClipboardList, Users, Table2 } from "lucide-react";
import JadwalPengawasTab from "./jadwal-pengawas/JadwalPengawasTab";

const JENIS_UJIAN_LABEL = {
  PSAS: "PSAS - Penilaian Sumatif Akhir Semester",
  PSAT: "PSAT - Penilaian Sumatif Akhir Tahun",
  PSAJ: "PSAJ - Penilaian Sumatif Akhir Jenjang",
};

// id di sini nyambung ke tab internal JadwalPengawasTab.js -- dikirim apa
// adanya lewat prop tabPaksa, jadi jangan diganti sepihak.
const TAB_LIST = [
  { id: "daftar", label: "Daftar Pengawas", icon: ClipboardList },
  { id: "pengawas", label: "Jadwal Ngawas", icon: Users },
  { id: "rekap", label: "Rekap", icon: Table2 },
];

const PesertaPengawasTab = ({ jenisUjian, showToast, onBack }) => {
  const [tabAktif, setTabAktif] = useState("daftar");

  return (
    <div className="p-4 sm:p-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4"
      >
        <ChevronLeft size={16} /> Kembali ke Sub-fitur
      </button>

      <div className="mb-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">Jenis Ujian</p>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {JENIS_UJIAN_LABEL[jenisUjian] || jenisUjian}
        </p>
      </div>

      {/* 3 tab -- flex-wrap supaya turun ke baris berikutnya di layar HP,
      bukan kepotong. */}
      <div className="flex flex-wrap gap-1 mb-5 border-b border-gray-200 dark:border-gray-700">
        {TAB_LIST.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setTabAktif(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tabAktif === tab.id
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <Icon size={15} /> {tab.label}
            </button>
          );
        })}
      </div>

      <JadwalPengawasTab jenisUjian={jenisUjian} showToast={showToast} tabPaksa={tabAktif} />
    </div>
  );
};

export default PesertaPengawasTab;
