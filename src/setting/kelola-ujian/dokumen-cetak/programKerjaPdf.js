// setting/kelola-ujian/dokumen-cetak/programKerjaPdf.js
// Generator "Program Kerja Pelaksanaan" (PDF) untuk sub-fitur Kelola Ujian --
// dokumen yang disusun SEBELUM ujian berlangsung, untuk keperluan pemeriksaan
// pengawas/kepala sekolah. Beda dengan laporanRekapAkhirPdf.js (yang disusun
// SETELAH ujian selesai, berisi data aktual) -- dokumen ini berisi RENCANA
// pelaksanaan: dasar hukum, susunan panitia, jadwal, pembagian ruang, daftar
// pengawas, dan tata tertib.
//
// Sistematika: Sampul, Kata Pengantar, Daftar Isi, Bab I Pendahuluan (Dasar
// Hukum, Maksud & Tujuan, Sasaran/Peserta), Bab II Organisasi Pelaksana
// (Susunan Panitia), Bab III Pelaksanaan (Jadwal, Pembagian Ruang, Daftar
// Pengawas), Bab IV Tata Tertib (Peserta & Pengawas), Bab V Penutup.
//
// Sama seperti laporanRekapAkhirPdf.js -- konstanta JUDUL_UJIAN & helper
// (tulisParagraf, babBaru) SENGAJA diduplikasi di sini, bukan di-import,
// biar tiap generator PDF independen dan gampang diubah sendiri-sendiri.
//
// TATA_TERTIB_PESERTA & TATA_TERTIB_PENGAWAS dibuat fixed (sama untuk
// PSAS/PSAT/PSAJ) sesuai arahan -- kalau nanti perlu beda per jenis ujian
// atau bisa diedit dari UI, tinggal ganti jadi parameter di `opsi`.
//
// Dasar hukum default mengacu ke peraturan yang umum dipakai sekolah di
// Indonesia untuk dokumen sejenis ini (UU Sisdiknas, PP SNP, Permendikbudristek
// Standar Penilaian) + SK Kepsek yang nomornya diisi manual tiap tahun ajaran.
// Kalau sekolah punya SK/edaran dinas spesifik, tambahkan lewat opsi.dasarHukumTambahan.

import autoTable from "jspdf-autotable";
import {
  createPdfDocument,
  addLetterhead,
  addSectionLabel,
  tableTheme,
  checkPageBreak,
  savePdf,
  PDF_COLORS,
  PDF_FONT_FAMILY,
  SCHOOL_NAME,
  SCHOOL_CITY,
} from "../../../utils/pdfExportKit";

const JUDUL_UJIAN = {
  PSAS: "PENILAIAN SUMATIF AKHIR SEMESTER",
  PSAT: "PENILAIAN SUMATIF AKHIR TAHUN",
  PSAJ: "PENILAIAN SUMATIF AKHIR JENJANG",
};

const DASAR_HUKUM_DEFAULT = [
  "Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;",
  "Peraturan Pemerintah Nomor 57 Tahun 2021 jo. Peraturan Pemerintah Nomor 4 " +
    "Tahun 2022 tentang Standar Nasional Pendidikan;",
  "Peraturan Menteri Pendidikan, Kebudayaan, Riset, dan Teknologi Nomor 21 " +
    "Tahun 2022 tentang Standar Penilaian Pendidikan;",
  "Kalender Pendidikan Tahun Pelajaran yang berlaku;",
  "Surat Keputusan Kepala Sekolah tentang Pembentukan Panitia Pelaksana.",
];

const TATA_TERTIB_PESERTA = [
  "Peserta hadir di ruang ujian 15 menit sebelum ujian dimulai.",
  "Peserta wajib membawa kartu peserta ujian.",
  "Peserta yang terlambat lebih dari 15 menit tidak diperkenankan mengikuti " +
    "ujian pada sesi tersebut, kecuali dengan alasan yang dapat dipertanggungjawabkan.",
  "Peserta dilarang membawa dan/atau menggunakan alat komunikasi serta " +
    "catatan dalam bentuk apa pun selama ujian berlangsung, kecuali alat " +
    "yang diizinkan sesuai jenis ujian.",
  "Peserta mengerjakan soal secara mandiri dan menjaga ketertiban selama " + "ujian berlangsung.",
  "Peserta yang telah selesai mengerjakan sebelum waktu berakhir dapat " +
    "meninggalkan ruangan setelah izin dari pengawas.",
];

const TATA_TERTIB_PENGAWAS = [
  "Pengawas hadir di ruang ujian 15 menit sebelum ujian dimulai untuk " +
    "memeriksa kesiapan ruangan.",
  "Pengawas memeriksa kartu peserta dan mencocokkan dengan daftar hadir.",
  "Pengawas membacakan tata tertib peserta sebelum ujian dimulai.",
  "Pengawas mengisi dan menandatangani berita acara pelaksanaan ujian.",
  "Pengawas tidak diperkenankan memberi petunjuk jawaban dalam bentuk apa pun.",
  "Pengawas mencatat dan melaporkan kejadian khusus (kecurangan, peserta " +
    "sakit, dll.) kepada panitia.",
];

/** Tulis 1 paragraf dengan word-wrap otomatis + page-break. Return y baru. */
function tulisParagraf(
  doc,
  text,
  y,
  { x = 15, maxWidth = 180, lineHeight = 5.2, fontSize = 10 } = {}
) {
  doc.setFont(PDF_FONT_FAMILY, "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(0, 0, 0);
  const lines = doc.splitTextToSize(text, maxWidth);
  lines.forEach((line) => {
    y = checkPageBreak(doc, y);
    doc.text(line, x, y);
    y += lineHeight;
  });
  return y;
}

/** Tulis daftar bernomor/bullet dengan word-wrap otomatis. Return y baru. */
function tulisDaftar(doc, items, y, { x = 15, indent = 5, maxWidth = 175, bernomor = false } = {}) {
  items.forEach((butir, i) => {
    y = checkPageBreak(doc, y);
    doc.setFont(PDF_FONT_FAMILY, "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(bernomor ? `${i + 1}.` : "-", x, y);
    y = tulisParagraf(doc, butir, y, { x: x + indent, maxWidth });
  });
  return y;
}

function babBaru(doc, nomor, judul) {
  doc.addPage();
  let y = 20;
  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.setFontSize(12);
  doc.setTextColor(...PDF_COLORS.primary);
  doc.text(`BAB ${nomor}`, 15, y);
  y += 6;
  doc.text(judul, 15, y);
  doc.setTextColor(0, 0, 0);
  y += 4;
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.5);
  doc.line(15, y, doc.internal.pageSize.getWidth() - 15, y);
  y += 8;
  return y;
}

/**
 * Generate & download "Program Kerja Pelaksanaan" (PDF).
 *
 * @param {Object} opsi
 * @param {string} opsi.jenisUjian
 * @param {string} opsi.tahunAjaran        - mis. "2026/2027"
 * @param {string} [opsi.nomorSkPanitia]   - mis. "421/012-SMP/2026"
 * @param {string} [opsi.tanggalSkPanitia] - mis. "10 Oktober 2026"
 * @param {Array}  [opsi.dasarHukumTambahan] - baris dasar hukum tambahan (opsional)
 * @param {Array}  opsi.susunanPanitia     - [{ jabatan, nama }] input manual dari UI
 * @param {Array}  [opsi.jadwal]           - hasil ambilJadwalUjian() -> [{tanggal, sesi, mapel, waktu}]
 * @param {Array}  [opsi.pembagianRuang]   - [{nomor_ruangan, jumlah_siswa, kelas}]
 * @param {Array}  [opsi.daftarPengawas]   - [{nama, ruangan, sesi}]
 * @param {string} [opsi.kepalaSekolah]    - nama kepala sekolah untuk tanda tangan
 * @param {Function} [opsi.showToast]
 */
function generateProgramKerjaPdf(opsi) {
  const {
    jenisUjian,
    tahunAjaran,
    nomorSkPanitia,
    tanggalSkPanitia,
    dasarHukumTambahan = [],
    susunanPanitia = [],
    jadwal = [],
    pembagianRuang = [],
    daftarPengawas = [],
    kepalaSekolah,
  } = opsi;

  const judul = JUDUL_UJIAN[jenisUjian] || jenisUjian;
  const doc = createPdfDocument({ orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const tanggalCetak = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ---------- HALAMAN 1: SAMPUL ----------
  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text("PROGRAM KERJA PELAKSANAAN", pageWidth / 2, 70, { align: "center" });
  doc.setFontSize(17);
  doc.text(judul, pageWidth / 2, 82, { align: "center" });
  doc.setFont(PDF_FONT_FAMILY, "normal");
  doc.setFontSize(11);
  doc.text(`TAHUN PELAJARAN ${tahunAjaran || "-"}`, pageWidth / 2, 92, { align: "center" });

  doc.setDrawColor(...PDF_COLORS.primary);
  doc.setLineWidth(0.8);
  doc.line(pageWidth / 2 - 30, 98, pageWidth / 2 + 30, 98);

  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.setFontSize(14);
  doc.text(SCHOOL_NAME, pageWidth / 2, pageHeight - 45, { align: "center" });
  doc.setFont(PDF_FONT_FAMILY, "normal");
  doc.setFontSize(10);
  doc.text(SCHOOL_CITY, pageWidth / 2, pageHeight - 39, { align: "center" });

  // ---------- HALAMAN 2: KATA PENGANTAR ----------
  doc.addPage();
  let y = addLetterhead(doc, { title: "KATA PENGANTAR" });
  y += 2;
  y = tulisParagraf(
    doc,
    `Program Kerja ini disusun sebagai pedoman pelaksanaan ${judul} Tahun Pelajaran ` +
      `${tahunAjaran || "-"} di ${SCHOOL_NAME}, agar kegiatan dapat berjalan tertib, lancar, ` +
      `dan sesuai dengan ketentuan yang berlaku.`,
    y
  );
  y += 4;
  y = tulisParagraf(
    doc,
    `Program Kerja ini memuat dasar hukum, maksud dan tujuan, susunan panitia, jadwal ` +
      `pelaksanaan, pembagian ruang, daftar pengawas, serta tata tertib peserta dan pengawas, ` +
      `sebagai acuan bagi seluruh pihak yang terlibat dan bahan pemeriksaan pengawas.`,
    y
  );
  y += 12;
  y = checkPageBreak(doc, y);
  doc.setFont(PDF_FONT_FAMILY, "normal");
  doc.setFontSize(10);
  doc.text(`${SCHOOL_CITY}, ${tanggalCetak}`, pageWidth - 60, y);
  y += 5;
  doc.text("Panitia Pelaksana", pageWidth - 60, y);

  // ---------- HALAMAN 3: DAFTAR ISI ----------
  doc.addPage();
  y = addLetterhead(doc, { title: "DAFTAR ISI" });
  y += 2;
  const daftarIsi = [
    "Kata Pengantar",
    "Daftar Isi",
    "BAB I    Pendahuluan",
    "BAB II   Organisasi Pelaksana",
    "BAB III  Pelaksanaan",
    "BAB IV   Tata Tertib",
    "BAB V    Penutup",
  ];
  doc.setFont(PDF_FONT_FAMILY, "normal");
  doc.setFontSize(10);
  daftarIsi.forEach((baris) => {
    y = checkPageBreak(doc, y);
    doc.text(baris, 15, y);
    y += 6.5;
  });
  y += 2;
  doc.setFont(PDF_FONT_FAMILY, "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_COLORS.textMuted);
  doc.text("Nomor halaman menyesuaikan hasil cetak.", 15, y);
  doc.setTextColor(0, 0, 0);

  // ---------- BAB I: PENDAHULUAN ----------
  y = babBaru(doc, "I", "PENDAHULUAN");

  y = addSectionLabel(doc, "A. Dasar Hukum", y);
  y += 6;
  const dasarHukum = [...DASAR_HUKUM_DEFAULT, ...dasarHukumTambahan];
  const dasarHukumFinal = nomorSkPanitia
    ? dasarHukum.map((baris) =>
        baris.startsWith("Surat Keputusan Kepala Sekolah")
          ? `Surat Keputusan Kepala Sekolah Nomor ${nomorSkPanitia}` +
            (tanggalSkPanitia ? ` tanggal ${tanggalSkPanitia}` : "") +
            " tentang Pembentukan Panitia Pelaksana;"
          : baris
      )
    : dasarHukum;
  y = tulisDaftar(doc, dasarHukumFinal, y, { bernomor: true });
  y += 4;

  y = checkPageBreak(doc, y);
  y = addSectionLabel(doc, "B. Maksud dan Tujuan", y);
  y += 6;
  y = tulisDaftar(
    doc,
    [
      `Mengukur pencapaian kompetensi peserta didik pada mata pelajaran yang diujikan dalam ${judul}.`,
      "Menjadi pedoman kerja bagi panitia, guru, dan pengawas selama pelaksanaan ujian.",
      "Menjamin pelaksanaan ujian berjalan tertib, adil, dan sesuai jadwal yang ditetapkan.",
    ],
    y
  );
  y += 4;

  y = checkPageBreak(doc, y);
  y = addSectionLabel(doc, "C. Sasaran", y);
  y += 6;
  y = tulisParagraf(
    doc,
    `Sasaran pelaksanaan ${judul} adalah seluruh peserta didik ${SCHOOL_NAME} yang memenuhi ` +
      `syarat mengikuti ujian sesuai dengan mekanisme pembelajaran Tahun Pelajaran ${tahunAjaran || "-"}.`,
    y
  );

  // ---------- BAB II: ORGANISASI PELAKSANA ----------
  y = babBaru(doc, "II", "ORGANISASI PELAKSANA");
  y = addSectionLabel(doc, "A. Susunan Panitia", y);
  y += 6;
  if (susunanPanitia.length > 0) {
    autoTable(doc, {
      ...tableTheme(y),
      head: [["No.", "Jabatan dalam Panitia", "Nama"]],
      body: susunanPanitia.map((p, i) => [`${i + 1}`, p.jabatan, p.nama]),
    });
    y = doc.lastAutoTable.finalY + 8;
  } else {
    y = tulisParagraf(doc, "Susunan panitia belum diisi.", y);
    y += 4;
  }

  // ---------- BAB III: PELAKSANAAN ----------
  y = babBaru(doc, "III", "PELAKSANAAN");

  y = addSectionLabel(doc, "A. Jadwal Pelaksanaan", y);
  y += 6;
  if (jadwal.length > 0) {
    autoTable(doc, {
      ...tableTheme(y),
      head: [["Tanggal", "Sesi", "Waktu", "Mata Pelajaran"]],
      body: jadwal.map((j) => [j.tanggal || "-", j.sesi || "-", j.waktu || "-", j.mapel || "-"]),
    });
    y = doc.lastAutoTable.finalY + 8;
  } else {
    y = tulisParagraf(doc, "Jadwal pelaksanaan belum diisi.", y);
    y += 4;
  }

  y = checkPageBreak(doc, y);
  y = addSectionLabel(doc, "B. Pembagian Ruang", y);
  y += 6;
  if (pembagianRuang.length > 0) {
    autoTable(doc, {
      ...tableTheme(y),
      head: [["No. Ruangan", "Kelas", "Jumlah Siswa"]],
      body: pembagianRuang.map((r) => [
        `Ruang ${r.nomor_ruangan}`,
        r.kelas || "-",
        `${r.jumlah_siswa}`,
      ]),
    });
    y = doc.lastAutoTable.finalY + 8;
  } else {
    y = tulisParagraf(doc, "Pembagian ruang belum diisi.", y);
    y += 4;
  }

  y = checkPageBreak(doc, y);
  y = addSectionLabel(doc, "C. Daftar Pengawas", y);
  y += 6;
  if (daftarPengawas.length > 0) {
    autoTable(doc, {
      ...tableTheme(y),
      head: [["Nama Guru", "Ruangan", "Sesi"]],
      body: daftarPengawas.map((p) => [p.nama, p.ruangan || "-", p.sesi || "-"]),
    });
    y = doc.lastAutoTable.finalY + 8;
  } else {
    y = tulisParagraf(doc, "Daftar pengawas belum diisi.", y);
    y += 4;
  }

  // ---------- BAB IV: TATA TERTIB ----------
  y = babBaru(doc, "IV", "TATA TERTIB");
  y = addSectionLabel(doc, "A. Tata Tertib Peserta", y);
  y += 6;
  y = tulisDaftar(doc, TATA_TERTIB_PESERTA, y, { bernomor: true });
  y += 6;

  y = checkPageBreak(doc, y);
  y = addSectionLabel(doc, "B. Tata Tertib Pengawas", y);
  y += 6;
  y = tulisDaftar(doc, TATA_TERTIB_PENGAWAS, y, { bernomor: true });

  // ---------- BAB V: PENUTUP ----------
  y = babBaru(doc, "V", "PENUTUP");
  y = tulisParagraf(
    doc,
    `Demikian Program Kerja Pelaksanaan ${judul} Tahun Pelajaran ${tahunAjaran || "-"} ini ` +
      `disusun untuk dilaksanakan dan menjadi acuan bagi seluruh pihak yang terlibat.`,
    y
  );
  y += 16;
  y = checkPageBreak(doc, y);
  doc.setFont(PDF_FONT_FAMILY, "normal");
  doc.setFontSize(10);
  doc.text(`${SCHOOL_CITY}, ${tanggalCetak}`, pageWidth - 70, y);
  y += 20;
  doc.text("Mengetahui,", 25, y);
  doc.text("Ketua Panitia,", pageWidth - 70, y);
  y += 20;
  doc.text("Kepala Sekolah", 25, y);
  doc.line(25, y + 1, 75, y + 1);
  doc.line(pageWidth - 70, y + 1, pageWidth - 20, y + 1);
  if (kepalaSekolah) {
    y += 20;
    doc.setFont(PDF_FONT_FAMILY, "bold");
    doc.text(kepalaSekolah, 25, y);
  }

  savePdf(doc, `Program-Kerja-${jenisUjian}-${(tahunAjaran || "").replace(/\//g, "-")}.pdf`);
}

export { generateProgramKerjaPdf };
