// setting/kelola-ujian/JenisUjianMenuTab.js
// Level 2 dari Manajemen Ujian: grid sub-fitur untuk SATU jenis ujian yang
// sudah dipilih di KelolaUjianTab (PSAS/PSAT/PSAJ). Grid & sub-fitur ini
// sama persis untuk ketiga jenis -- jenisUjian cuma diteruskan ke bawah
// supaya query/filter siswa & kapasitas default otomatis sesuai (lihat
// KONFIGURASI_JENIS_UJIAN di pembagianRuanganSupabase.js).
//
// CATATAN -- "Panitia Ujian" SUDAH DIPINDAH keluar dari grid ini, jadi
// kartu top-level tersendiri di KelolaUjianTab.js (sejajar sama kartu
// PSAS/PSAT/PSAJ), karena sekarang penentuan panitia mau diurus terpusat
// di satu tempat buat semua jenis ujian, bukan per-jenis-ujian lagi.
// Komponennya (PanitiaUjianTab.js) sekarang punya pemilihan jenis ujian
// sendiri di dalam dirinya. JANGAN tambahin lagi sub-fitur ini di sini.
//
// CATATAN -- "Petunjuk & Penggunaan Aplikasi" JUGA SUDAH DIPINDAH keluar
// dari grid ini (alasan sama kayak Panitia Ujian: isinya panduan umum,
// gak spesifik ke 1 jenis ujian), sekarang jadi kartu top-level sendiri
// di KelolaUjianTab.js. PetunjukPenggunaanTab.js gak butuh prop
// jenisUjian jadi cukup di-render apa adanya di sana. JANGAN tambahin
// lagi sub-fitur ini di sini.
//
// Skema Kartu (lihat dokumentasi "dokumentasi-kelola-ujian.md"):
// 1. Peserta & Pembagian Ruangan (aktif, sebelumnya "Jadwal, Peserta &
//    Pembagian Ruangan" -- kata "Jadwal" dibuang karena tab Jadwal Sesi
//    sudah PINDAH ke kartu 2) -- 5 tab: Komposisi Ruangan, Pembagian
//    Ruangan (quota + simpan), Preview Per Ruangan, Denah Duduk, dan Export
//    Daftar Peserta. Wadahnya JadwalRuanganTab.js, isinya di-embed dari
//    PembagianRuanganTab.js. (id kartu tetap "jadwal-ruangan" biar
//    referensi lain gak putus.)
// 2. Jadwal Ujian & Pengawas (aktif, sebelumnya "Daftar & Jadwal Pengawas")
//    -- 5 tab: Jadwal Ujian (sesi: tanggal, jam, mapel), Daftar Pengawas,
//    Kelola Jadwal Pengawas, Rekap, dan Jadwal Pengawas (lihat/cetak +
//    export Excel & PDF). Wadahnya PesertaPengawasTab.js. (id kartu tetap
//    "daftar-pengawas".)
// 3. Kartu Ujian (aktif)
// 4. Presensi & Berita Acara (aktif) -- bagian "Laporan" (rekap akhir)
//    BELUM dibangun, cuma Daftar Hadir + Berita Acara (keduanya PDF form
//    kosong buat dicetak & diisi manual, lihat PresensiBeritaAcaraTab.js).
// 5. Kepanitiaan & Regulasi -> sekarang "Program Kerja Pelaksanaan" (aktif) --
//    dokumen rencana pelaksanaan (dasar hukum, susunan panitia, jadwal per
//    sesi, pembagian ruang & pengawas reuse dari sub-fitur lain, tata
//    tertib) untuk bahan pemeriksaan pengawas. Lihat ProgramKerjaTab.js &
//    programKerjaPdf.js.
// 6. Anggaran & Biaya (aktif) -- catat rencana anggaran & realisasi biaya
//    per pos (ATK, konsumsi, honor pengawas, dst), lihat AnggaranBiayaTab.js.
// 7. Laporan Rekap Akhir (aktif) -- kumpulan rekap dari sub-fitur lain
//    (peserta, pengawas, anggaran) + input manual kehadiran & catatan
//    evaluasi, bahan Laporan Pelaksanaan Ujian. Lihat LaporanRekapAkhirTab.js
//    & laporanRekapAkhirSupabase.js.
// 8. Export Semua (PDF) (aktif) -- tombol di kanan atas grid ini (bukan
//    kartu sub-fitur, karena bukan area kerja tersendiri). Checklist semua
//    dokumen PDF dari sub-fitur 1-4 & 8, query ulang dari DB (bukan reuse
//    state tab lain). Lihat ExportSemuaTab.js & exportSemuaKelolaUjian.js.

import React, { useState } from "react";
import {
  ChevronLeft,
  DoorOpen,
  FileText,
  IdCard,
  CalendarClock,
  FileBarChart2,
  ClipboardCheck,
  Wallet,
  FileDown,
} from "lucide-react";
import JadwalRuanganTab from "./JadwalRuanganTab";
import PesertaPengawasTab from "./PesertaPengawasTab";
import KartuUjianTab from "./dokumen-cetak/KartuUjianTab";
import PresensiBeritaAcaraTab from "./dokumen-cetak/PresensiBeritaAcaraTab";
import AnggaranBiayaTab from "./dokumen-cetak/AnggaranBiayaTab";
import LaporanRekapAkhirTab from "./dokumen-cetak/LaporanRekapAkhirTab";
import ProgramKerjaTab from "./dokumen-cetak/ProgramKerjaTab";
import ExportSemuaTab from "./ExportSemuaTab";

const JENIS_UJIAN_LABEL = {
  PSAS: "PSAS - Penilaian Sumatif Akhir Semester",
  PSAT: "PSAT - Penilaian Sumatif Akhir Tahun",
  PSAJ: "PSAJ - Penilaian Sumatif Akhir Jenjang",
};

const SUB_FITUR = [
  {
    id: "jadwal-ruangan",
    title: "Peserta & Pembagian Ruangan",
    description:
      "Bandingkan komposisi ruangan, susun & simpan pembagian siswa ke tiap ruangan, cek preview & denah duduk, lalu export daftar pesertanya",
    icon: DoorOpen,
    status: "done",
    clickable: true,
  },
  {
    id: "daftar-pengawas",
    title: "Jadwal Ujian & Pengawas",
    description:
      "Atur jadwal sesi ujian per mapel, kelola daftar & jadwal pengawas per ruangan, lihat rekapnya, lalu cetak/export jadwal pengawas (Excel & PDF)",
    icon: CalendarClock,
    status: "done",
    clickable: true,
  },
  {
    id: "kartu-ujian",
    title: "Kartu Ujian",
    description: "Cetak kartu peserta & kartu pengawas ujian (PDF massal)",
    icon: IdCard,
    status: "done",
    clickable: true,
  },
  {
    id: "laporan",
    title: "Presensi & Berita Acara",
    description: "Cetak PDF Daftar Hadir & Berita Acara per sesi/ruangan (diisi & TTD manual)",
    icon: FileBarChart2,
    status: "done",
    clickable: true,
  },
  {
    id: "kepanitiaan",
    title: "Program Kerja Pelaksanaan",
    description: "Dasar hukum, susunan panitia, jadwal, tata tertib -- bahan pemeriksaan pengawas",
    icon: FileText,
    status: "done",
    clickable: true,
  },
  {
    id: "anggaran-biaya",
    title: "Anggaran & Biaya",
    description: "Catat rencana anggaran & realisasi biaya per pos (ATK, konsumsi, honor, dll)",
    icon: Wallet,
    status: "done",
    clickable: true,
  },
  {
    id: "laporan-rekap-akhir",
    title: "Laporan Rekap Akhir",
    description:
      "Rekap peserta, kehadiran, pengawas, anggaran, & catatan evaluasi -- bahan Laporan Pelaksanaan Ujian",
    icon: ClipboardCheck,
    status: "done",
    clickable: true,
  },
];

const STATUS_STYLE = {
  done: {
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    label: "Aktif",
  },
};

const JenisUjianMenuTab = ({ jenisUjian, showToast, onBack }) => {
  const [activeSubFitur, setActiveSubFitur] = useState(null);

  if (activeSubFitur === "daftar-pengawas") {
    return (
      <PesertaPengawasTab
        jenisUjian={jenisUjian}
        showToast={showToast}
        onBack={() => setActiveSubFitur(null)}
      />
    );
  }

  if (activeSubFitur === "jadwal-ruangan") {
    return (
      <JadwalRuanganTab
        jenisUjian={jenisUjian}
        showToast={showToast}
        onBack={() => setActiveSubFitur(null)}
      />
    );
  }

  if (activeSubFitur === "kartu-ujian") {
    return (
      <KartuUjianTab
        jenisUjian={jenisUjian}
        showToast={showToast}
        onBack={() => setActiveSubFitur(null)}
      />
    );
  }

  if (activeSubFitur === "laporan") {
    return (
      <PresensiBeritaAcaraTab
        jenisUjian={jenisUjian}
        showToast={showToast}
        onBack={() => setActiveSubFitur(null)}
      />
    );
  }

  if (activeSubFitur === "anggaran-biaya") {
    return (
      <AnggaranBiayaTab
        jenisUjian={jenisUjian}
        showToast={showToast}
        onBack={() => setActiveSubFitur(null)}
      />
    );
  }

  if (activeSubFitur === "kepanitiaan") {
    return (
      <ProgramKerjaTab
        jenisUjian={jenisUjian}
        showToast={showToast}
        onBack={() => setActiveSubFitur(null)}
      />
    );
  }

  if (activeSubFitur === "laporan-rekap-akhir") {
    return (
      <LaporanRekapAkhirTab
        jenisUjian={jenisUjian}
        showToast={showToast}
        onBack={() => setActiveSubFitur(null)}
      />
    );
  }

  if (activeSubFitur === "export-semua") {
    return (
      <ExportSemuaTab
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

      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
          {JENIS_UJIAN_LABEL[jenisUjian] || jenisUjian}
        </h2>
        <button
          onClick={() => setActiveSubFitur("export-semua")}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-all active:scale-95"
        >
          <FileDown className="w-3.5 h-3.5" />
          Export Semua (PDF)
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
