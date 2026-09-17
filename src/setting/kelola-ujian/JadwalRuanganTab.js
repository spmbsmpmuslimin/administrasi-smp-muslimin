// setting/kelola-ujian/JadwalRuanganTab.js
// Kartu 1 dari Manajemen Ujian: "Jadwal, Peserta & Pembagian Ruangan"
// (nama baru, sebelumnya "Jadwal & Pembagian Ruangan" -- diganti karena
// Export Daftar Peserta pindah ke sini, lihat tab 5 di bawah).
//
// Kartu ini cuma WADAH (container) -- isinya nggak ditulis ulang di sini,
// tapi diambil dari 2 komponen yang udah ada, masing-masing dikunci ke
// bagian yang relevan sama judul kartu:
//   1. "Jadwal Sesi"           -> JadwalPengawasTab (tabPaksa="jadwal")
//   2. "Komposisi Ruangan"     -> PembagianRuanganTab (mode="ruangan", view "komposisi")
//   3. "Pembagian Ruangan"     -> PembagianRuanganTab (mode="ruangan", tab "edit")
//   4. "Preview Per Ruangan"   -> PembagianRuanganTab (mode="ruangan", tab "preview")
//   5. "Denah Duduk"           -> PembagianRuanganTab (mode="ruangan", tab "denah")
//   6. "Export Daftar Peserta" -> PembagianRuanganTab (mode="ruangan", tab "export")
//
// Tab 6 (Export) PINDAH dari kartu "Daftar & Jadwal Pengawas" (sebelumnya
// "Peserta & Pengawas") ke sini, sengaja diletakkan PALING TERAKHIR, setelah
// Preview & Denah Duduk -- alurnya jadi: susun -> lihat preview per ruangan
// -> lihat denah duduk -> langsung export/cetak, tanpa pindah kartu. Karena
// masih 1 instance PembagianRuanganTab yang sama (mode="ruangan"), Export
// ini WYSIWYG: isinya ngikutin quota yang lagi tampil di layar, TERMASUK
// yang belum diklik "Simpan ke Database" -- beda dari behavior lama di
// kartu sebelah yang cuma baca data tersimpan.
//
// Tab 5 (Denah Duduk) MURNI tampilan (baca hasilLive yang sama kayak
// Preview & Export, cuma disusun jadi grid kursi, bukan tabel) -- lihat
// komentar di PembagianRuanganTab.js buat detail implementasinya.
//
// Sisa tab yang dulu ada di sini (Daftar Pengawas, Jadwal Ngawas, Rekap)
// tetap di kartu "Daftar & Jadwal Pengawas" (PesertaPengawasTab.js).
//
// CATATAN: pindah dari tab "Jadwal Sesi" ke tab ruangan (atau sebaliknya)
// bikin komponen yang ditinggal ke-unmount, jadi quota yang BELUM disimpan
// bakal hilang. Pindah antar 5 tab ruangan (Komposisi <-> Pembagian <->
// Preview <-> Denah Duduk <-> Export) aman, karena kelimanya komponen yang
// sama -- cuma ganti prop.

import React, { useState } from "react";
import {
  ChevronLeft,
  CalendarClock,
  LayoutGrid,
  DoorOpen,
  Eye,
  Armchair,
  FileSpreadsheet,
} from "lucide-react";
import JadwalPengawasTab from "./jadwal-pengawas/JadwalPengawasTab";
import PembagianRuanganTab from "./pembagian-ruangan/PembagianRuanganTab";

const JENIS_UJIAN_LABEL = {
  PSAS: "PSAS - Penilaian Sumatif Akhir Semester",
  PSAT: "PSAT - Penilaian Sumatif Akhir Tahun",
  PSAJ: "PSAJ - Penilaian Sumatif Akhir Jenjang",
};

const TAB_LIST = [
  { id: "jadwal", label: "Jadwal Sesi", icon: CalendarClock },
  { id: "komposisi", label: "Komposisi Ruangan", icon: LayoutGrid },
  { id: "pembagian", label: "Pembagian Ruangan", icon: DoorOpen },
  { id: "preview", label: "Preview Per Ruangan", icon: Eye },
  { id: "denah", label: "Denah Duduk", icon: Armchair },
  { id: "export", label: "Export Daftar Peserta", icon: FileSpreadsheet },
];

const JadwalRuanganTab = ({ jenisUjian, showToast, onBack }) => {
  const [tabAktif, setTabAktif] = useState("jadwal");

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

      {/* flex-wrap supaya 6 tab ini nggak kepotong di layar HP sempit */}
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

      {tabAktif === "jadwal" ? (
        <JadwalPengawasTab jenisUjian={jenisUjian} showToast={showToast} tabPaksa="jadwal" />
      ) : (
        <PembagianRuanganTab
          jenisUjian={jenisUjian}
          showToast={showToast}
          mode="ruangan"
          viewPaksa={tabAktif === "komposisi" ? "komposisi" : "pembagian"}
          tabPaksa={
            tabAktif === "preview"
              ? "preview"
              : tabAktif === "denah"
                ? "denah"
                : tabAktif === "export"
                  ? "export"
                  : "edit"
          }
        />
      )}
    </div>
  );
};

export default JadwalRuanganTab;
