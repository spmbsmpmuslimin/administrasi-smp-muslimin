// setting/kelola-ujian/PesertaPengawasTab.js
// Kartu 2 dari Manajemen Ujian: "Peserta & Pengawas".
//
// Kartu ini cuma WADAH (container), isinya diambil dari komponen yang udah
// ada, dikunci ke bagian yang nyambung sama judul kartu:
//   PESERTA  -> PembagianRuanganTab (mode="peserta")
//     1. "Export Daftar Peserta"
//   PENGAWAS -> JadwalPengawasTab (tabPaksa=...)
//     2. "Daftar Pengawas"
//     3. "Jadwal Ngawas"
//     4. "Rekap"
//
// Penyusunan ruangan-nya (Komposisi + quota + Preview Per Ruangan + tombol
// Simpan) ada di kartu "Jadwal & Pembagian Ruangan" (JadwalRuanganTab.js).
//
// PENTING -- beda sama sebelum dipisah: dulu Export baca `hasilLive` (hasil
// di layar, termasuk quota yang belum disimpan) karena satu komponen sama
// tabel quota-nya. Sekarang beda kartu = beda state, jadi di sini datanya
// ditarik dari DB (cariUjian -> ambilPembagianTersimpan di dalam
// PembagianRuanganTab). Artinya: habis ngubah quota, WAJIB "Simpan ke
// Database" dulu di kartu sebelah, baru hasilnya ikut keexport dari sini.

import React, { useState } from "react";
import {
  ChevronLeft,
  FileSpreadsheet,
  ClipboardList,
  Users,
  Table2,
} from "lucide-react";
import JadwalPengawasTab from "./jadwal-pengawas/JadwalPengawasTab";
import PembagianRuanganTab from "./pembagian-ruangan/PembagianRuanganTab";

const JENIS_UJIAN_LABEL = {
  PSAS: "PSAS - Penilaian Sumatif Akhir Semester",
  PSAT: "PSAT - Penilaian Sumatif Akhir Tahun",
  PSAJ: "PSAJ - Penilaian Sumatif Akhir Jenjang",
};

// id "export" nyambung ke TAB_LIST di PembagianRuanganTab.js,
// id "daftar"/"pengawas"/"rekap" nyambung ke tab internal JadwalPengawasTab.js
// -- dikirim apa adanya lewat prop tabPaksa, jadi jangan diganti sepihak.
const TAB_LIST = [
  { id: "export", label: "Export Daftar Peserta", icon: FileSpreadsheet, sumber: "peserta" },
  { id: "daftar", label: "Daftar Pengawas", icon: ClipboardList, sumber: "pengawas" },
  { id: "pengawas", label: "Jadwal Ngawas", icon: Users, sumber: "pengawas" },
  { id: "rekap", label: "Rekap", icon: Table2, sumber: "pengawas" },
];

const PesertaPengawasTab = ({ jenisUjian, showToast, onBack }) => {
  const [tabAktif, setTabAktif] = useState("export");

  const sumberAktif = TAB_LIST.find((t) => t.id === tabAktif)?.sumber || "peserta";

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

      {/* 4 tab -- flex-wrap supaya turun ke baris berikutnya di layar HP,
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

      {sumberAktif === "peserta" ? (
        <PembagianRuanganTab
          jenisUjian={jenisUjian}
          showToast={showToast}
          mode="peserta"
          viewPaksa="pembagian"
          tabPaksa={tabAktif}
        />
      ) : (
        <JadwalPengawasTab jenisUjian={jenisUjian} showToast={showToast} tabPaksa={tabAktif} />
      )}
    </div>
  );
};

export default PesertaPengawasTab;
