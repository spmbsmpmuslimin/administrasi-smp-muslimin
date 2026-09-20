// setting/kelola-ujian/dokumen-cetak/ProgramKerjaPelaksanaanTab.js
// Wrapper kartu "Program Kerja Pelaksanaan" -- gabungan 2 sub-fitur yang
// SEBELUMNYA masing-masing kartu terpisah di grid (JenisUjianMenuTab.js),
// sekarang jadi 2 TAB di dalam 1 kartu biar gak nambah kartu & bikin
// bingung panitia (keduanya sama-sama dokumen "persiapan/pra-ujian"):
//   - "Program Kerja"           -> ProgramKerjaTab.js
//     (dasar hukum, susunan panitia, jadwal, tata tertib + PDF sendiri)
//   - "Presensi & Berita Acara" -> PresensiBeritaAcaraTab.js
//     (cetak PDF form kosong Daftar Hadir & Berita Acara per sesi/ruangan)
//
// KEDUA KOMPONEN DIPAKAI APA ADANYA, TIDAK DIUBAH SAMA SEKALI -- wrapper
// ini cuma nambahin tab switcher tipis di atasnya. Tombol "Kembali" di
// masing-masing tab tetap diteruskan ke onBack ASLI (balik ke grid utama
// JenisUjianMenuTab.js), BUKAN balik ke tab switcher -- biar konsisten
// sama pola "1 tombol back = keluar dari kartu" di seluruh Manajemen Ujian.
// Konsekuensinya: pindah dari Tab A ke grid lalu buka lagi ke Tab B itu
// 2 klik (bukan langsung nyambung antar-tab lewat back), tapi ini sengaja
// demi konsistensi pola back di semua kartu lain.

import React, { useState } from "react";
import { FileSignature, ClipboardList } from "lucide-react";
import ProgramKerjaTab from "./ProgramKerjaTab";
import PresensiBeritaAcaraTab from "./PresensiBeritaAcaraTab";

const TABS = [
  { id: "program-kerja", label: "Program Kerja", icon: FileSignature },
  {
    id: "presensi-berita-acara",
    label: "Presensi & Berita Acara",
    icon: ClipboardList,
  },
];

const ProgramKerjaPelaksanaanTab = ({ jenisUjian, showToast, onBack }) => {
  const [activeTab, setActiveTab] = useState("program-kerja");

  return (
    <div>
      {/* Tab switcher -- BUKAN tombol back, cuma ganti konten di bawahnya.
          Tombol back yang sebenarnya ada di dalam masing-masing komponen
          anak (ProgramKerjaTab.js / PresensiBeritaAcaraTab.js). */}
      <div className="px-4 sm:px-6 pt-4 flex gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {TABS.map((t) => {
          const IconComponent = t.icon;
          const aktif = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                aktif
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}>
              <IconComponent className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === "program-kerja" && (
        <ProgramKerjaTab
          jenisUjian={jenisUjian}
          showToast={showToast}
          onBack={onBack}
        />
      )}
      {activeTab === "presensi-berita-acara" && (
        <PresensiBeritaAcaraTab
          jenisUjian={jenisUjian}
          showToast={showToast}
          onBack={onBack}
        />
      )}
    </div>
  );
};

export default ProgramKerjaPelaksanaanTab;
