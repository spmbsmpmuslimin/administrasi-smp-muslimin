// setting/kelola-ujian/KelolaUjianTab.js
// Halaman "Manajemen Ujian" -- level PALING ATAS. Ada 2 jalur dari sini:
// 1. Pilih jenis ujian (PSAS / PSAT / PSAJ) -> masuk ke grid sub-fitur
//    (Jadwal & Pembagian Ruangan, Kartu Ujian, dst) lewat JenisUjianMenuTab.
//    Sub-fitur & logic-nya SAMA persis untuk ketiga jenis -- yang beda
//    cuma peserta (jenjang) & kapasitas default, makanya jenisUjian cukup
//    diteruskan sebagai prop, bukan dibikin komponen terpisah per jenis.
// 2. Kartu "Panitia Ujian" (terpisah dari grid jenis ujian di atas) --
//    dulu ini sub-fitur di dalam JenisUjianMenuTab per jenis ujian, TAPI
//    dipindah ke sini (terpusat, top-level) karena penentuan panitia mau
//    diurus di satu tempat aja, gak per-jenis-ujian lagi. PanitiaUjianTab
//    sekarang punya pemilihan jenis ujian sendiri di dalam dirinya
//    (lihat PanitiaUjianTab.js), jadi cukup di-render langsung di sini
//    tanpa lewat JenisUjianMenuTab.

import React, { useState } from "react";
import { CalendarDays, GraduationCap, UserCog } from "lucide-react";
import JenisUjianMenuTab from "./JenisUjianMenuTab";
import PanitiaUjianTab from "./PanitiaUjianTab";

// Info tampilan tiap jenis ujian. Aturan jenjang & semester "beneran"
// (yang dipakai buat query/filter) tetap satu sumber di
// pembagianRuanganSupabase.js -> KONFIGURASI_JENIS_UJIAN. Di sini cuma
// buat label & deskripsi kartu.
const JENIS_UJIAN_LIST = [
  {
    value: "PSAS",
    nama: "PSAS",
    kepanjangan: "Penilaian Sumatif Akhir Semester",
    semester: "Semester 1 (Ganjil)",
    peserta: "Kelas 7, 8, dan 9",
  },
  {
    value: "PSAT",
    nama: "PSAT",
    kepanjangan: "Penilaian Sumatif Akhir Tahun",
    semester: "Semester 2 (Genap)",
    peserta: "Kelas 7 dan 8",
  },
  {
    value: "PSAJ",
    nama: "PSAJ",
    kepanjangan: "Penilaian Sumatif Akhir Jenjang",
    semester: "Semester 2 (Genap)",
    peserta: "Kelas 9",
  },
];

const KelolaUjianTab = ({ user, schoolConfig, showToast }) => {
  const [activeJenis, setActiveJenis] = useState(null);
  const [showPanitia, setShowPanitia] = useState(false);

  // Jalur khusus: Panitia Ujian (top-level, lintas jenis ujian)
  if (showPanitia) {
    return <PanitiaUjianTab showToast={showToast} onBack={() => setShowPanitia(false)} />;
  }

  // Level 2: udah pilih jenis ujian -> tampilin grid sub-fitur
  if (activeJenis) {
    return (
      <JenisUjianMenuTab
        jenisUjian={activeJenis}
        showToast={showToast}
        onBack={() => setActiveJenis(null)}
      />
    );
  }

  // Level 1: pilih jenis ujian, atau langsung ke Panitia Ujian
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
          Manajemen Ujian
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Pilih jenis ujian untuk mengelola pembagian ruangan, kartu ujian, jadwal pengawas, dan
          laporan.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        {JENIS_UJIAN_LIST.map((jenis) => (
          <button
            key={jenis.value}
            onClick={() => setActiveJenis(jenis.value)}
            className="text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all active:scale-95"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                {jenis.nama}
              </span>
            </div>
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              {jenis.kepanjangan}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 mb-1">
              <CalendarDays className="w-3.5 h-3.5" />
              {jenis.semester}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
              <GraduationCap className="w-3.5 h-3.5" />
              Peserta: {jenis.peserta}
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={() => setShowPanitia(true)}
        className="w-full text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all active:scale-95 flex items-center gap-3"
      >
        <div className="p-2.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 shrink-0">
          <UserCog className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Panitia Ujian</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Tentukan guru yang jadi panitia -- untuk PSAS, PSAT, maupun PSAJ, terpusat di satu
            tempat. Otomatis nentuin siapa yang bisa akses Portal Ujian.
          </p>
        </div>
      </button>
    </div>
  );
};

export default KelolaUjianTab;
