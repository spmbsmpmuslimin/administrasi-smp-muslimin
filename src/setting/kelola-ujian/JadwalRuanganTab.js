// setting/kelola-ujian/JadwalRuanganTab.js
// Kartu 1 dari Manajemen Ujian: urusan PESERTA & PEMBAGIAN RUANGAN.
//
// PERUBAHAN: tab "Jadwal Sesi" (Jadwal Ujian) SUDAH PINDAH ke kartu
// "Daftar & Jadwal Pengawas" (PesertaPengawasTab.js) sebagai tab "Jadwal
// Ujian". Datanya tetap 1 (tabel ujian_jadwal), cuma tempat ngeditnya yang
// pindah. Karena judul kartu ini sekarang nggak bahas jadwal lagi, label
// kartunya (di daftar kartu Manajemen Ujian) sebaiknya ikut diganti, mis.
// jadi "Peserta & Pembagian Ruangan".
//
// Kartu ini cuma WADAH (container) -- isinya nggak ditulis ulang di sini,
// tapi diambil dari komponen PembagianRuanganTab, dikunci ke bagian yang
// relevan sama judul kartu:
//   1. "Komposisi Ruangan"     -> PembagianRuanganTab (mode="ruangan", view "komposisi")
//   2. "Pembagian Ruangan"     -> PembagianRuanganTab (mode="ruangan", tab "edit")
//   3. "Preview Per Ruangan"   -> PembagianRuanganTab (mode="ruangan", tab "preview")
//   4. "Denah Duduk"           -> PembagianRuanganTab (mode="ruangan", tab "denah")
//   5. "Export Daftar Peserta" -> PembagianRuanganTab (mode="ruangan", tab "export")
//
// Tab Export PINDAH dari kartu "Daftar & Jadwal Pengawas" (sebelumnya
// "Peserta & Pengawas") ke sini, sengaja diletakkan PALING TERAKHIR, setelah
// Preview & Denah Duduk -- alurnya jadi: susun -> lihat preview per ruangan
// -> lihat denah duduk -> langsung export/cetak, tanpa pindah kartu. Karena
// masih 1 instance PembagianRuanganTab yang sama (mode="ruangan"), Export
// ini WYSIWYG: isinya ngikutin quota yang lagi tampil di layar, TERMASUK
// yang belum diklik "Simpan ke Database" -- beda dari behavior lama di
// kartu sebelah yang cuma baca data tersimpan.
//
// Tab Denah Duduk MURNI tampilan (baca hasilLive yang sama kayak
// Preview & Export, cuma disusun jadi grid kursi, bukan tabel) -- lihat
// komentar di PembagianRuanganTab.js buat detail implementasinya.
//
// Sisa tab pengawas (Jadwal Ujian, Daftar Pengawas, Kelola Jadwal Pengawas,
// Rekap, Jadwal Pengawas) ada di kartu "Daftar & Jadwal Pengawas"
// (PesertaPengawasTab.js).
//
// CATATAN: pindah antar 5 tab ini (Komposisi <-> Pembagian <-> Preview <->
// Denah Duduk <-> Export) aman, karena kelimanya komponen yang sama -- cuma
// ganti prop, jadi quota yang BELUM disimpan tidak hilang. (Dulu ada risiko
// hilang waktu pindah ke tab "Jadwal Sesi", tapi tab itu sudah tidak di sini.)

import React, { useState } from "react";
import { ChevronLeft, LayoutGrid, DoorOpen, Eye, Armchair, FileSpreadsheet } from "lucide-react";
import PembagianRuanganTab from "./pembagian-ruangan/PembagianRuanganTab";

const JENIS_UJIAN_LABEL = {
  PSAS: "PSAS - Penilaian Sumatif Akhir Semester",
  PSAT: "PSAT - Penilaian Sumatif Akhir Tahun",
  PSAJ: "PSAJ - Penilaian Sumatif Akhir Jenjang",
};

const TAB_LIST = [
  { id: "komposisi", label: "Komposisi Ruangan", icon: LayoutGrid },
  { id: "pembagian", label: "Pembagian Ruangan", icon: DoorOpen },
  { id: "preview", label: "Preview Per Ruangan", icon: Eye },
  { id: "denah", label: "Denah Duduk", icon: Armchair },
  { id: "export", label: "Export Daftar Peserta", icon: FileSpreadsheet },
];

const JadwalRuanganTab = ({ jenisUjian, showToast, onBack }) => {
  const [tabAktif, setTabAktif] = useState("komposisi");

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

      {/* flex-wrap supaya 5 tab ini nggak kepotong di layar HP sempit */}
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
    </div>
  );
};

export default JadwalRuanganTab;
