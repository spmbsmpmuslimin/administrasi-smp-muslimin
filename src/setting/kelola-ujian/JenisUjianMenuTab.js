// setting/kelola-ujian/JenisUjianMenuTab.js
// Level 2 dari Manajemen Ujian: grid sub-fitur untuk SATU jenis ujian yang
// sudah dipilih di KelolaUjianTab (PSAS/PSAT/PSAJ). Grid & sub-fitur ini
// sama persis untuk ketiga jenis -- jenisUjian cuma diteruskan ke bawah
// supaya query/filter siswa & kapasitas default otomatis sesuai (lihat
// KONFIGURASI_JENIS_UJIAN di pembagianRuanganSupabase.js).
//
// Skema kartu (lihat dokumentasi "dokumentasi-kelola-ujian.md"):
// 1. Jadwal, Peserta & Pembagian Ruangan (aktif, sebelumnya bernama "Jadwal
//    & Pembagian Ruangan" -- diganti karena Export Daftar Peserta udah
//    pindah ke kartu ini) -- 5 tab: Jadwal Sesi, Komposisi Ruangan,
//    Pembagian Ruangan (quota + simpan), Preview Per Ruangan, dan Export
//    Daftar Peserta. Wadahnya JadwalRuanganTab.js, isinya di-embed dari
//    JadwalPengawasTab.js & PembagianRuanganTab.js.
// 2. Daftar & Jadwal Pengawas (aktif, sebelumnya bernama "Peserta &
//    Pengawas" -- diganti karena Export Daftar Peserta udah pindah ke
//    kartu 1) -- 3 tab: Daftar Pengawas, Jadwal Ngawas, Rekap. Wadahnya
//    PesertaPengawasTab.js.
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
// 7. Petunjuk & Penggunaan Aplikasi (aktif) -- panduan statis langkah demi
//    langkah tiap sub-fitur, lihat PetunjukPenggunaanTab.js.
// 8. Laporan Rekap Akhir (aktif) -- kumpulan rekap dari sub-fitur lain
//    (peserta, pengawas, anggaran) + input manual kehadiran & catatan
//    evaluasi, bahan Laporan Pelaksanaan Ujian. Lihat LaporanRekapAkhirTab.js
//    & laporanRekapAkhirSupabase.js.
// 9. Export Semua (PDF) (aktif) -- tombol di kanan atas grid ini (bukan
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
  BookOpen,
  Construction,
  FileDown,
} from "lucide-react";
import JadwalRuanganTab from "./JadwalRuanganTab";
import PesertaPengawasTab from "./PesertaPengawasTab";
import KartuUjianTab from "./dokumen-cetak/KartuUjianTab";
import PresensiBeritaAcaraTab from "./dokumen-cetak/PresensiBeritaAcaraTab";
import AnggaranBiayaTab from "./dokumen-cetak/AnggaranBiayaTab";
import PetunjukPenggunaanTab from "./petunjuk-penggunaan/PetunjukPenggunaanTab";
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
    id: "jadwal-pengawas",
    title: "Jadwal, Peserta & Pembagian Ruangan",
    description:
      "Atur jadwal sesi ujian per mapel, bandingkan komposisi ruangan, susun & simpan pembagian siswa ke tiap ruangan, cek previewnya, lalu export daftar pesertanya",
    icon: CalendarClock,
    status: "done",
    clickable: true,
  },
  {
    id: "pembagian-ruangan",
    title: "Daftar & Jadwal Pengawas",
    description: "Kelola daftar pengawas, jadwal ngawas per hari, dan rekapnya",
    icon: DoorOpen,
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
    id: "petunjuk-penggunaan",
    title: "Petunjuk & Penggunaan Aplikasi",
    description: "Panduan langkah demi langkah cara memakai tiap sub-fitur Manajemen Ujian",
    icon: BookOpen,
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
  planned: {
    badge: "bg-gray-100 text-gray-500 dark:bg-gray-700/50 dark:text-gray-400",
    label: "Segera hadir",
  },
};

const JenisUjianMenuTab = ({ jenisUjian, showToast, onBack }) => {
  const [activeSubFitur, setActiveSubFitur] = useState(null);

  if (activeSubFitur === "pembagian-ruangan") {
    return (
      <PesertaPengawasTab
        jenisUjian={jenisUjian}
        showToast={showToast}
        onBack={() => setActiveSubFitur(null)}
      />
    );
  }

  if (activeSubFitur === "jadwal-pengawas") {
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

  if (activeSubFitur === "petunjuk-penggunaan") {
    return <PetunjukPenggunaanTab showToast={showToast} onBack={() => setActiveSubFitur(null)} />;
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

      <div className="flex items-start gap-3 p-4 mb-6 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl">
        <Construction className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">
            Modul dalam pengembangan
          </p>
          <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-0.5">
            Sub-fitur akan diaktifkan satu per satu. Jadwal, Peserta & Pembagian Ruangan, Daftar &
            Jadwal Pengawas, Kartu Ujian, Presensi & Berita Acara, Anggaran & Biaya, Petunjuk &
            Penggunaan Aplikasi, Program Kerja Pelaksanaan, dan Laporan Rekap Akhir sudah bisa
            dipakai.
          </p>
        </div>
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
