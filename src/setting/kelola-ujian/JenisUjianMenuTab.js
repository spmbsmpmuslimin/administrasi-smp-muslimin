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
// 1. Jadwal Ujian (aktif, BARU Sep 2026) -- kelola tanggal/jam/mapel tiap
//    sesi (tabel ujian_jadwal). SENGAJA independen dari Pembagian Ruangan &
//    Pengawas -- bikin record `ujian` draft sendiri lewat
//    getOrCreateUjianDraft() begitu Tahun Ajaran dipilih, karena di real
//    dunia jadwal ujian biasanya udah given dari sekolah/dinas duluan.
//    Wadahnya JadwalUjianTab.js. (id kartu "jadwal-ujian".)
// 2. Peserta & Pembagian Ruangan (aktif) -- 5 tab: Komposisi Ruangan,
//    Pembagian Ruangan (quota + simpan), Preview Per Ruangan, Denah Duduk,
//    dan Export Daftar Peserta. Wadahnya JadwalRuanganTab.js, isinya
//    di-embed dari PembagianRuanganTab.js. (id kartu tetap "jadwal-ruangan"
//    biar referensi lain gak putus.)
// 3. Daftar & Jadwal Pengawas (aktif, sebelumnya "Jadwal Ujian & Pengawas"
//    -- balik ke nama ini karena tab "Jadwal Ujian" udah pindah jadi kartu
//    1 sendiri) -- 4 tab: Daftar Pengawas, Kelola Jadwal Pengawas, Rekap,
//    dan Jadwal Pengawas (lihat/cetak + export Excel & PDF). Wadahnya
//    PesertaPengawasTab.js. (id kartu tetap "daftar-pengawas".) Beda sama
//    kartu 1, kartu ini TETAP butuh Pembagian Ruangan udah diproses &
//    disimpan (bukan cuma draft) sebelum bisa assign pengawas.
// 4. Kartu Ujian (aktif)
// 5. Program Kerja Pelaksanaan (aktif) -- SEBELUMNYA 2 kartu terpisah
//    ("Presensi & Berita Acara" + "Kepanitiaan & Regulasi"/"Program Kerja
//    Pelaksanaan"), digabung jadi 1 kartu ber-2 tab lewat wrapper
//    ProgramKerjaPelaksanaanTab.js karena keduanya sama-sama dokumen
//    pra-ujian dan bikin grid kepenuhan/bingung kalau dipisah:
//      - Tab "Program Kerja" -> ProgramKerjaTab.js (dasar hukum, susunan
//        panitia, jadwal per sesi, pembagian ruang & pengawas reuse dari
//        sub-fitur lain, tata tertib, + PDF sendiri via programKerjaPdf.js)
//        -- bahan pemeriksaan pengawas.
//      - Tab "Presensi & Berita Acara" -> PresensiBeritaAcaraTab.js
//        (cetak PDF form KOSONG Daftar Hadir & Berita Acara per
//        sesi/ruangan, diisi & TTD manual di kertas).
//    Kedua komponen anak DIPAKAI APA ADANYA (gak diubah), wrapper cuma
//    nambahin tab switcher. id kartu tetap "kepanitiaan" biar referensi
//    lain (mis. ExportSemuaTab checklist) gak putus.
// 6. Rekap & Evaluasi (aktif) -- judul kartu SENGAJA gak pakai kata
//    "Laporan" (dulu "Laporan Rekap Akhir") biar panitia gak ketuker sama
//    sub-fitur 8 "Laporan Lengkap" -- yang satu tempat ISI data, yang
//    satu lagi tempat CETAK PDF-nya. Isinya: kumpulan rekap dari sub-fitur
//    lain (peserta, pengawas) + input manual kehadiran & catatan
//    evaluasi, bahan Laporan Pelaksanaan Ujian. TIDAK PUNYA export PDF
//    sendiri lagi (lihat sub-fitur 8) -- murni tempat input/preview data.
//    id internal & nama file tetap "laporan-rekap-akhir" / LaporanRekapAkhirTab.js
//    (cuma `title` yang ditampilkan ke user yang berubah, biar minim
//    rename di banyak tempat).
//    CATATAN (revisi): item "Rekap Anggaran & Realisasi Biaya" sudah
//    dihapus dari sini -- sub-fitur "Anggaran & Biaya" dicabut total dari
//    aplikasi (dikelola manual/terpisah di luar aplikasi).
// 7. Export Semua (PDF) (aktif) -- tombol di kanan atas grid ini (bukan
//    kartu sub-fitur, karena bukan area kerja tersendiri). Checklist semua
//    dokumen PDF dari sub-fitur 1-5 & 6, query ulang dari DB (bukan reuse
//    state tab lain). Lihat ExportSemuaTab.js & exportSemuaKelolaUjian.js.
// 8. Laporan Lengkap (aktif) -- kompilasi 1 PDF resmi utuh: Sampul, Kata
//    Pengantar, Daftar Isi, Pendahuluan, lalu rekap yang REUSE data dari
//    sub-fitur 6 (Rekap & Evaluasi), dan Penutup dengan tanda tangan
//    Kepsek (dari school_settings). Ini PENGGANTI export PDF yang dulu
//    ada di sub-fitur 6 -- folder terpisah karena banyak bagian baru
//    (Cover, Kata Pengantar, dst) yang gak ada urusannya sama input data.
//    Lihat laporan-lengkap/LaporanLengkapTab.js, laporanLengkapSupabase.js,
//    & laporanLengkapPdf.js.

import React, { useState } from "react";
import {
  ChevronLeft,
  DoorOpen,
  FileText,
  IdCard,
  CalendarClock,
  ClipboardList,
  ClipboardCheck,
  FileDown,
  FileStack,
} from "lucide-react";
import JadwalUjianTab from "./JadwalUjianTab";
import JadwalRuanganTab from "./JadwalRuanganTab";
import PesertaPengawasTab from "./PesertaPengawasTab";
import KartuUjianTab from "./dokumen-cetak/KartuUjianTab";
import LaporanRekapAkhirTab from "./dokumen-cetak/LaporanRekapAkhirTab";
import ProgramKerjaPelaksanaanTab from "./dokumen-cetak/ProgramKerjaPelaksanaanTab";
import LaporanLengkapTab from "./laporan-lengkap/LaporanLengkapTab";
import ExportSemuaTab from "./ExportSemuaTab";

const JENIS_UJIAN_LABEL = {
  PSAS: "PSAS - Penilaian Sumatif Akhir Semester",
  PSAT: "PSAT - Penilaian Sumatif Akhir Tahun",
  PSAJ: "PSAJ - Penilaian Sumatif Akhir Jenjang",
};

const SUB_FITUR = [
  {
    id: "jadwal-ujian",
    title: "Jadwal Ujian",
    description:
      "Kelola tanggal, jam, dan mata pelajaran tiap sesi -- bisa diisi duluan, gak perlu nunggu ruangan/pengawas diproses",
    icon: CalendarClock,
    status: "done",
    clickable: true,
  },
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
    title: "Daftar & Jadwal Pengawas",
    description:
      "Daftarkan guru pengawas, assign ke tiap ruangan per hari, lihat rekapnya, lalu cetak/export jadwal pengawas (Excel & PDF)",
    icon: ClipboardList,
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
    id: "kepanitiaan",
    title: "Program Kerja Pelaksanaan",
    description:
      "Disusun SEBELUM ujian -- 2 tab: Program Kerja (dasar hukum, panitia, jadwal, tata tertib) & Presensi/Berita Acara (cetak form kosong)",
    icon: FileText,
    status: "done",
    clickable: true,
  },
  {
    id: "laporan-rekap-akhir",
    title: "Rekap & Evaluasi",
    description:
      "Diisi SETELAH ujian: rekap peserta, kehadiran, & pengawas -- PDF resminya di 'Laporan Lengkap'",
    icon: ClipboardCheck,
    status: "done",
    clickable: true,
  },
  {
    id: "laporan-lengkap",
    title: "Laporan Lengkap",
    description:
      "Compile jadi 1 PDF resmi: Sampul, Kata Pengantar, Daftar Isi, Pendahuluan, rekap dari Laporan Rekap Akhir, & Penutup ber-TTD Kepsek",
    icon: FileStack,
    status: "done",
    clickable: true,
  },
];

const STATUS_STYLE = {
  done: {
    badge:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    label: "Aktif",
  },
};

const JenisUjianMenuTab = ({ jenisUjian, showToast, onBack }) => {
  const [activeSubFitur, setActiveSubFitur] = useState(null);

  if (activeSubFitur === "jadwal-ujian") {
    return (
      <JadwalUjianTab
        jenisUjian={jenisUjian}
        showToast={showToast}
        onBack={() => setActiveSubFitur(null)}
      />
    );
  }

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

  if (activeSubFitur === "kepanitiaan") {
    return (
      <ProgramKerjaPelaksanaanTab
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

  if (activeSubFitur === "laporan-lengkap") {
    return (
      <LaporanLengkapTab
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
        className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4">
        <ChevronLeft size={16} /> Ganti Jenis Ujian
      </button>

      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
          {JENIS_UJIAN_LABEL[jenisUjian] || jenisUjian}
        </h2>
        <button
          onClick={() => setActiveSubFitur("export-semua")}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-all active:scale-95">
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
              onClick={
                fitur.clickable ? () => setActiveSubFitur(fitur.id) : undefined
              }
              className={`text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all ${
                fitur.clickable
                  ? "hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 cursor-pointer active:scale-95"
                  : "opacity-90"
              }`}>
              <div className="flex items-start justify-between mb-2">
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
                  <IconComponent className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <span
                  className={`text-[11px] font-medium px-2 py-1 rounded-full ${statusStyle.badge}`}>
                  {statusStyle.label}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {fitur.title}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {fitur.description}
              </p>
            </CardTag>
          );
        })}
      </div>
    </div>
  );
};

export default JenisUjianMenuTab;
