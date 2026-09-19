// setting/kelola-ujian/KelolaUjianTab.js
// Halaman "Manajemen Ujian" -- level PALING ATAS. Ada 3 jalur dari sini:
// 1. Pilih jenis ujian (PSAS / PSAT / PSAJ) -> masuk ke grid sub-fitur
//    (Jadwal & Pembagian Ruangan, Kartu Ujian, dst) lewat JenisUjianMenuTab.
//    Sub-fitur & logic-nya SAMA persis untuk ketiga jenis -- yang beda
//    cuma peserta (jenjang) & kapasitas default, makanya jenisUjian cukup
//    diteruskan sebagai prop, bukan dibikin komponen terpisah per jenis.
// 2. Kartu "Panitia Ujian" -- dulu ini sub-fitur di dalam JenisUjianMenuTab
//    per jenis ujian, TAPI dipindah ke sini (terpusat, top-level) karena
//    penentuan panitia mau diurus di satu tempat aja, gak per-jenis-ujian
//    lagi. PanitiaUjianTab sekarang punya pemilihan jenis ujian sendiri di
//    dalam dirinya (lihat PanitiaUjianTab.js), jadi cukup di-render
//    langsung di sini tanpa lewat JenisUjianMenuTab.
// 3. Kartu "Petunjuk & Penggunaan Aplikasi" -- sama alasannya kayak
//    Panitia Ujian: dulu jadi salah satu dari 8 sub-fitur di dalam grid
//    JenisUjianMenuTab (per jenis ujian), padahal isinya panduan UMUM
//    yang gak spesifik ke PSAS/PSAT/PSAJ -- panitia mestinya baca ini
//    DULU sebelum mulai kerja di salah satu jenis ujian. Makanya
//    dipindah ke sini, sejajar sama Panitia Ujian, PetunjukPenggunaanTab
//    gak butuh prop jenisUjian sama sekali jadi aman dipindah apa adanya.
//
// Layout level 1: baris pertama 2 kartu (Panitia Ujian & Petunjuk
// Penggunaan) dibikin seimbang bentuknya sama kartu jenis ujian di
// bawahnya (icon di atas, judul, deskripsi) -- BUKAN lagi kartu
// horizontal lebar penuh kayak sebelumnya. Baris kedua 3 kartu jenis
// ujian, didahului label ajakan "Silahkan Pilih Jenis Ujian".

import React, { useState } from "react";
import { CalendarDays, GraduationCap, UserCog, BookOpen } from "lucide-react";
import JenisUjianMenuTab from "./JenisUjianMenuTab";
import PanitiaUjianTab from "./PanitiaUjianTab";
import PetunjukPenggunaanTab from "./petunjuk-penggunaan/PetunjukPenggunaanTab";

// Info tampilan tiap jenis ujian. Aturan jenjang & semester "beneran"
// (yang dipakai buat query/filter) tetap satu sumber di
// pembagianRuanganSupabase.js -> KONFIGURASI_JENIS_UJIAN. Di sini cuma
// buat label & deskripsi kartu -- termasuk `warna` (pastel per jenis,
// biar PSAS/PSAT/PSAJ gampang dibedain sekilas): PSAS biru, PSAT hijau,
// PSAJ ungu.
const JENIS_UJIAN_LIST = [
  {
    value: "PSAS",
    nama: "PSAS",
    kepanjangan: "Penilaian Sumatif Akhir Semester",
    semester: "Semester 1 (Ganjil)",
    peserta: "Kelas 7, 8, dan 9",
    warna: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      border: "border-blue-200 dark:border-blue-800",
      hoverBorder: "hover:border-blue-400 dark:hover:border-blue-600",
      text: "text-blue-700 dark:text-blue-400",
      subtext: "text-blue-600/80 dark:text-blue-400/80",
    },
  },
  {
    value: "PSAT",
    nama: "PSAT",
    kepanjangan: "Penilaian Sumatif Akhir Tahun",
    semester: "Semester 2 (Genap)",
    peserta: "Kelas 7 dan 8",
    warna: {
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      border: "border-emerald-200 dark:border-emerald-800",
      hoverBorder: "hover:border-emerald-400 dark:hover:border-emerald-600",
      text: "text-emerald-700 dark:text-emerald-400",
      subtext: "text-emerald-600/80 dark:text-emerald-400/80",
    },
  },
  {
    value: "PSAJ",
    nama: "PSAJ",
    kepanjangan: "Penilaian Sumatif Akhir Jenjang",
    semester: "Semester 2 (Genap)",
    peserta: "Kelas 9",
    warna: {
      bg: "bg-purple-50 dark:bg-purple-900/20",
      border: "border-purple-200 dark:border-purple-800",
      hoverBorder: "hover:border-purple-400 dark:hover:border-purple-600",
      text: "text-purple-700 dark:text-purple-400",
      subtext: "text-purple-600/80 dark:text-purple-400/80",
    },
  },
];

const KelolaUjianTab = ({ user, schoolConfig, showToast }) => {
  const [activeJenis, setActiveJenis] = useState(null);
  const [showPanitia, setShowPanitia] = useState(false);
  const [showPetunjuk, setShowPetunjuk] = useState(false);

  // Jalur khusus: Panitia Ujian (top-level, lintas jenis ujian)
  if (showPanitia) {
    return <PanitiaUjianTab showToast={showToast} onBack={() => setShowPanitia(false)} />;
  }

  // Jalur khusus: Petunjuk & Penggunaan Aplikasi (top-level, gak butuh
  // jenisUjian karena isinya panduan umum semua sub-fitur)
  if (showPetunjuk) {
    return <PetunjukPenggunaanTab showToast={showToast} onBack={() => setShowPetunjuk(false)} />;
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

      {/* Baris 1: Panitia Ujian & Petunjuk Penggunaan -- 2 kartu seimbang,
          gaya sama persis kayak kartu jenis ujian di baris 2 (icon di atas,
          judul, deskripsi) biar tingginya nyambung/rata. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => setShowPanitia(true)}
          className="text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all active:scale-95"
        >
          <div className="p-2.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 w-fit mb-2">
            <UserCog className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Panitia Ujian</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Tentukan guru yang jadi panitia -- untuk PSAS, PSAT, maupun PSAJ, terpusat di satu
            tempat. Otomatis nentuin siapa yang bisa akses Portal Ujian.
          </p>
        </button>

        <button
          onClick={() => setShowPetunjuk(true)}
          className="text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all active:scale-95"
        >
          <div className="p-2.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 w-fit mb-2">
            <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            Petunjuk & Penggunaan Aplikasi
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Panduan langkah demi langkah cara memakai tiap sub-fitur Manajemen Ujian -- baca ini
            dulu sebelum mulai.
          </p>
        </button>
      </div>

      <p className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 text-center mb-4">
        Silahkan Pilih Jenis Ujian
      </p>

      {/* Baris 2: 3 kartu jenis ujian -- tiap jenis dikasih warna pastel
          beda (lihat `warna` di JENIS_UJIAN_LIST) biar gampang dibedain
          sekilas: PSAS biru, PSAT hijau, PSAJ ungu. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {JENIS_UJIAN_LIST.map((jenis) => (
          <button
            key={jenis.value}
            onClick={() => setActiveJenis(jenis.value)}
            className={`text-left p-4 rounded-xl border ${jenis.warna.bg} ${jenis.warna.border} ${jenis.warna.hoverBorder} hover:shadow-md transition-all active:scale-95`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-lg font-bold ${jenis.warna.text}`}>{jenis.nama}</span>
            </div>
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              {jenis.kepanjangan}
            </p>
            <div className={`flex items-center gap-1.5 text-[11px] ${jenis.warna.subtext} mb-1`}>
              <CalendarDays className="w-3.5 h-3.5" />
              {jenis.semester}
            </div>
            <div className={`flex items-center gap-1.5 text-[11px] ${jenis.warna.subtext}`}>
              <GraduationCap className="w-3.5 h-3.5" />
              Peserta: {jenis.peserta}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default KelolaUjianTab;
