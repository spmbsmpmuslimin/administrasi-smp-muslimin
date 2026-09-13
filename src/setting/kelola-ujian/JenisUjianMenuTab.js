// setting/kelola-ujian/JenisUjianMenuTab.js
// Level 2 dari Manajemen Ujian: grid sub-fitur untuk SATU jenis ujian yang
// sudah dipilih di KelolaUjianTab (PSAS/PSAT/PSAJ). Grid & sub-fitur ini
// sama persis untuk ketiga jenis -- jenisUjian cuma diteruskan ke bawah
// (PembagianRuanganTab, dst) supaya query/filter siswa & kapasitas default
// otomatis sesuai (lihat KONFIGURASI_JENIS_UJIAN di pembagianRuanganSupabase.js).
//
// 🔧 STATUS: DUMMY / PLACEHOLDER (Sep 2026)
// Sub-fitur di bawah akan dibangun bertahap, dimulai dari Pembagian
// Ruangan (algoritma sudah ada di ./bagiRuangan.js + ./pembagianRuanganSupabase.js).

import React, { useState } from "react";
import { ChevronLeft, DoorOpen, IdCard, Users, FileBarChart2, Construction } from "lucide-react";
import PembagianRuanganTab from "./PembagianRuanganTab";

const JENIS_UJIAN_LABEL = {
  PSAS: "PSAS - Penilaian Sumatif Akhir Semester",
  PSAT: "PSAT - Penilaian Sumatif Akhir Tahun",
  PSAJ: "PSAJ - Penilaian Sumatif Akhir Jenjang",
};

// Daftar sub-fitur modul ujian. Tiap item nanti diganti jadi komponen
// beneran satu-satu -- urutan sesuai prioritas pengerjaan.
const SUB_FITUR = [
  {
    id: "pembagian-ruangan",
    title: "Pembagian Ruangan",
    description: "Bagi siswa ke ruangan ujian otomatis berdasarkan kelas & huruf",
    icon: DoorOpen,
    status: "next", // next | planned
    clickable: true,
  },
  {
    id: "kartu-ujian",
    title: "Kartu Ujian",
    description: "Cetak kartu peserta ujian per siswa (PDF massal)",
    icon: IdCard,
    status: "planned",
    clickable: false,
  },
  {
    id: "jadwal-pengawas",
    title: "Jadwal Pengawas",
    description: "Atur jadwal guru pengawas per ruangan & sesi",
    icon: Users,
    status: "planned",
    clickable: false,
  },
  {
    id: "laporan",
    title: "Laporan Pelaksanaan",
    description: "Bundel laporan lengkap: jadwal, ruangan, daftar hadir, berita acara",
    icon: FileBarChart2,
    status: "planned",
    clickable: false,
  },
];

const STATUS_STYLE = {
  next: {
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    label: "Sedang dikerjakan",
  },
  planned: {
    badge: "bg-gray-100 text-gray-500 dark:bg-gray-700/50 dark:text-gray-400",
    label: "Segera hadir",
  },
};

const JenisUjianMenuTab = ({ jenisUjian, showToast, onBack }) => {
  const [activeSubFitur, setActiveSubFitur] = useState(null);

  if (activeSubFitur === "pembagian-ruangan") {
    return (
      <PembagianRuanganTab
        jenisUjian={jenisUjian}
        showToast={showToast}
        onBack={() => setActiveSubFitur(null)}
      />
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4"
      >
        <ChevronLeft size={16} /> Ganti Jenis Ujian
      </button>

      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
          {JENIS_UJIAN_LABEL[jenisUjian] || jenisUjian}
        </h2>
      </div>

      {/* Banner status dummy */}
      <div className="flex items-start gap-3 p-4 mb-6 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl">
        <Construction className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">
            Modul dalam pengembangan
          </p>
          <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-0.5">
            Sub-fitur akan diaktifkan satu per satu. Pembagian Ruangan sudah bisa dipakai.
          </p>
        </div>
      </div>

      {/* Grid sub-fitur */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SUB_FITUR.map((fitur) => {
          const IconComponent = fitur.icon;
          const statusStyle = STATUS_STYLE[fitur.status];
          const CardTag = fitur.clickable ? "button" : "div";

          return (
            <CardTag
              key={fitur.id}
              onClick={fitur.clickable ? () => setActiveSubFitur(fitur.id) : undefined}
              className={`text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all ${
                fitur.clickable
                  ? "hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 cursor-pointer active:scale-95"
                  : "opacity-90"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
                  <IconComponent className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <span
                  className={`text-[11px] font-medium px-2 py-1 rounded-full ${statusStyle.badge}`}
                >
                  {statusStyle.label}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {fitur.title}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{fitur.description}</p>
            </CardTag>
          );
        })}
      </div>
    </div>
  );
};

export default JenisUjianMenuTab;
