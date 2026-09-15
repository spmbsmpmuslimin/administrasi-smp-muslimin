// setting/kelola-ujian/laporanRekapAkhirPdf.js
// Generator "Laporan Lengkap (PDF)" untuk sub-fitur Laporan Rekap Akhir --
// menggabungkan seluruh rekap (peserta, kehadiran, pengawas, anggaran,
// catatan naratif) jadi satu dokumen siap cetak, mengikuti sistematika
// umum Laporan Pelaksanaan Ujian Sekolah (Sampul, Kata Pengantar, Daftar
// Isi, Bab I Pendahuluan, Bab II Pelaksanaan, Bab III Pembiayaan, Bab IV
// Evaluasi & Kendala, Bab V Penutup).
//
// VERSI AWAL -- lampiran (SK panitia, daftar hadir, berita acara, dst)
// SENGAJA tidak digabung ke sini, karena masing-masing sudah punya
// generator PDF sendiri di sub-fitur terkait (Kartu Ujian, Presensi &
// Berita Acara, dst) dan format kertasnya beda-beda. Daftar Isi juga
// belum ada nomor halaman otomatis -- placeholder dulu, nyusul kalau
// perlu pagination yang presisi.
//
// `pilihan` (dari LaporanRekapAkhirTab.js) menentukan section mana yang
// isinya data asli vs placeholder "tidak disertakan" -- BAB-nya tetap
// selalu ada semua, cuma kontennya yang berubah, biar penomoran bab tetap
// konsisten.

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
} from "../../utils/pdfExportKit";

// Sama seperti file lain di sub-fitur ini -- sengaja diduplikasi, bukan
// di-import (lihat catatan di presensiBeritaAcaraPdf.js).
const JUDUL_UJIAN = {
  PSAS: "PENILAIAN SUMATIF AKHIR SEMESTER",
  PSAT: "PENILAIAN SUMATIF AKHIR TAHUN",
  PSAJ: "PENILAIAN SUMATIF AKHIR JENJANG",
};

const TIDAK_DISERTAKAN = "-- (tidak disertakan dalam laporan ini) --";

function formatRupiah(angka) {
  return "Rp " + (Number(angka) || 0).toLocaleString("id-ID");
}

/** Tulis 1 paragraf dengan word-wrap otomatis + page-break. Return y baru. */
function tulisParagraf(doc, text, y, { x = 15, maxWidth = 180, lineHeight = 5.2, fontSize = 10 } = {}) {
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
 * Generate & download "Laporan Lengkap (PDF)".
 *
 * @param {Object} opsi
 * @param {string} opsi.jenisUjian
 * @param {string} opsi.tahunAjaran   - label tahun ajaran, mis. "2026/2027"
 * @param {Object} opsi.rekapPeserta  - hasil ambilRekapPeserta()
 * @param {Array}  opsi.kehadiran     - hasil ambilKehadiran()
 * @param {Object} opsi.rekapPengawas - hasil ambilRekapPengawas()
 * @param {Object} opsi.rekapAnggaran - hasil ambilRekapAnggaran()
 * @param {Object} opsi.catatan       - { keterangan_nilai, evaluasi_kendala, kesimpulan_saran }
 * @param {Object} opsi.pilihan       - { peserta, kehadiran, pengawas, anggaran, nilai, evaluasi, kesimpulan }: boolean per section
 * @param {Function} [opsi.showToast]
 */
function generateLaporanRekapAkhirPdf(opsi) {
  const {
    jenisUjian,
    tahunAjaran,
    rekapPeserta,
    kehadiran,
    rekapPengawas,
    rekapAnggaran,
    catatan,
    pilihan,
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
  doc.text("LAPORAN PELAKSANAAN", pageWidth / 2, 70, { align: "center" });
  doc.setFontSize(17);
  doc.text(judul, pageWidth / 2, 82, { align: "center" });
  doc.setFont(PDF_FONT_FAMILY, "normal");
  doc.setFontSize(11);
  doc.text(
    `TAHUN PELAJARAN ${tahunAjaran || "-"}`,
    pageWidth / 2,
    92,
    { align: "center" }
  );

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
    `Laporan ini disusun sebagai bentuk pertanggungjawaban panitia atas pelaksanaan ${judul} ` +
      `Tahun Pelajaran ${tahunAjaran || "-"} di ${SCHOOL_NAME}. Laporan memuat rekap peserta, ` +
      `kehadiran, pengawas, anggaran & realisasi biaya, serta evaluasi selama kegiatan berlangsung.`,
    y
  );
  y += 4;
  y = tulisParagraf(
    doc,
    `Panitia mengucapkan terima kasih kepada seluruh pihak yang telah mendukung kelancaran ` +
      `pelaksanaan kegiatan ini. Kami menyadari laporan ini masih jauh dari sempurna, sehingga ` +
      `masukan untuk perbaikan pelaksanaan kegiatan serupa di masa mendatang sangat kami harapkan.`,
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
    "BAB II   Pelaksanaan",
    "BAB III  Pembiayaan",
    "BAB IV   Evaluasi & Kendala",
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
  y = addSectionLabel(doc, "A. Latar Belakang", y);
  y += 6;
  y = tulisParagraf(
    doc,
    `${judul} merupakan salah satu bentuk penilaian sumatif yang diselenggarakan oleh ` +
      `${SCHOOL_NAME} untuk mengukur pencapaian kompetensi peserta didik. Kegiatan ini ` +
      `dilaksanakan sesuai jadwal, tata tertib, dan pembagian ruangan yang telah ditetapkan panitia.`,
    y
  );
  y += 8;
  y = checkPageBreak(doc, y);
  y = addSectionLabel(doc, "B. Maksud dan Tujuan", y);
  y += 6;
  ["Mengukur ketercapaian kompetensi peserta didik pada mata pelajaran yang diujikan.",
   "Menjadi bahan evaluasi pelaksanaan ujian untuk perbaikan periode berikutnya.",
   "Menjadi bahan pertanggungjawaban panitia kepada pihak sekolah."].forEach((butir) => {
    y = checkPageBreak(doc, y);
    doc.setFont(PDF_FONT_FAMILY, "normal");
    doc.setFontSize(10);
    doc.text("-", 15, y);
    y = tulisParagraf(doc, butir, y, { x: 20, maxWidth: 175 });
  });
  y += 4;
  y = checkPageBreak(doc, y);
  y = addSectionLabel(doc, "C. Sistematika Laporan", y);
  y += 6;
  y = tulisParagraf(
    doc,
    "Laporan ini disusun dalam 5 bab: Pendahuluan, Pelaksanaan, Pembiayaan, Evaluasi & " +
      "Kendala, dan Penutup, sebagaimana tercantum pada Daftar Isi.",
    y
  );

  // ---------- BAB II: PELAKSANAAN ----------
  y = babBaru(doc, "II", "PELAKSANAAN");

  // A. Peserta & Pembagian Ruangan
  y = addSectionLabel(doc, "A. Peserta & Pembagian Ruangan", y);
  y += 6;
  if (pilihan.peserta && rekapPeserta && rekapPeserta.perRuangan.length > 0) {
    y = tulisParagraf(
      doc,
      `Jumlah peserta seluruhnya ${rekapPeserta.totalPeserta} siswa, terbagi ke dalam ` +
        `${rekapPeserta.jumlahRuangan} ruangan.`,
      y
    );
    y += 3;
    autoTable(doc, {
      ...tableTheme(y),
      head: [["No. Ruangan", "Jumlah Siswa"]],
      body: rekapPeserta.perRuangan.map((r) => [`Ruang ${r.nomor_ruangan}`, `${r.jumlah_siswa}`]),
      foot: [["Total", `${rekapPeserta.totalPeserta}`]],
      footStyles: { fillColor: PDF_COLORS.zebra, textColor: [0, 0, 0], fontStyle: "bold" },
    });
    y = doc.lastAutoTable.finalY + 8;
  } else {
    y = tulisParagraf(doc, pilihan.peserta ? "Belum ada data pembagian ruangan." : TIDAK_DISERTAKAN, y);
    y += 4;
  }

  // B. Kehadiran
  y = checkPageBreak(doc, y);
  y = addSectionLabel(doc, "B. Kehadiran", y);
  y += 6;
  if (pilihan.kehadiran && kehadiran.length > 0) {
    const totalHadir = kehadiran.reduce((s, k) => s + (k.jumlah_hadir || 0), 0);
    const totalTidakHadir = kehadiran.reduce((s, k) => s + (k.jumlah_tidak_hadir || 0), 0);
    autoTable(doc, {
      ...tableTheme(y),
      head: [["No. Ruangan", "Hadir", "Tidak Hadir", "Keterangan"]],
      body: kehadiran.map((k) => [
        `Ruang ${k.nomor_ruangan}`,
        `${k.jumlah_hadir}`,
        `${k.jumlah_tidak_hadir}`,
        k.keterangan || "-",
      ]),
      foot: [["Total", `${totalHadir}`, `${totalTidakHadir}`, ""]],
      footStyles: { fillColor: PDF_COLORS.zebra, textColor: [0, 0, 0], fontStyle: "bold" },
    });
    y = doc.lastAutoTable.finalY + 8;
  } else {
    y = tulisParagraf(doc, pilihan.kehadiran ? "Rekap kehadiran belum diisi." : TIDAK_DISERTAKAN, y);
    y += 4;
  }

  // C. Pengawas
  y = checkPageBreak(doc, y);
  y = addSectionLabel(doc, "C. Pengawas", y);
  y += 6;
  if (pilihan.pengawas && rekapPengawas && rekapPengawas.daftarPengawas.length > 0) {
    y = tulisParagraf(
      doc,
      `Sebanyak ${rekapPengawas.jumlahPengawas} guru bertugas sebagai pengawas selama ` +
        `${rekapPengawas.jumlahSesi} sesi ujian.`,
      y
    );
    y += 3;
    autoTable(doc, {
      ...tableTheme(y),
      head: [["Nama Guru", "Jumlah Sesi Jaga"]],
      body: rekapPengawas.daftarPengawas.map((p) => [p.nama, `${p.jumlahSesiJaga}`]),
    });
    y = doc.lastAutoTable.finalY + 8;
  } else {
    y = tulisParagraf(doc, pilihan.pengawas ? "Belum ada data pengawas." : TIDAK_DISERTAKAN, y);
    y += 4;
  }

  // D. Keterangan Nilai
  y = checkPageBreak(doc, y);
  y = addSectionLabel(doc, "D. Keterangan Nilai", y);
  y += 6;
  y = tulisParagraf(
    doc,
    pilihan.nilai
      ? catatan.keterangan_nilai?.trim() || "Belum ada keterangan."
      : TIDAK_DISERTAKAN,
    y
  );

  // ---------- BAB III: PEMBIAYAAN ----------
  y = babBaru(doc, "III", "PEMBIAYAAN");
  if (pilihan.anggaran && rekapAnggaran && rekapAnggaran.perKategori.length > 0) {
    autoTable(doc, {
      ...tableTheme(y),
      head: [["Kategori", "Anggaran", "Realisasi"]],
      body: rekapAnggaran.perKategori.map((k) => [
        k.kategori,
        formatRupiah(k.anggaran),
        formatRupiah(k.realisasi),
      ]),
      foot: [[
        "Total",
        formatRupiah(rekapAnggaran.totalAnggaran),
        formatRupiah(rekapAnggaran.totalRealisasi),
      ]],
      footStyles: { fillColor: PDF_COLORS.zebra, textColor: [0, 0, 0], fontStyle: "bold" },
    });
    y = doc.lastAutoTable.finalY + 6;
    y = tulisParagraf(doc, `Sisa anggaran: ${formatRupiah(rekapAnggaran.sisa)}.`, y);
  } else {
    y = tulisParagraf(doc, pilihan.anggaran ? "Belum ada data anggaran." : TIDAK_DISERTAKAN, y);
  }

  // ---------- BAB IV: EVALUASI & KENDALA ----------
  y = babBaru(doc, "IV", "EVALUASI & KENDALA");
  y = tulisParagraf(
    doc,
    pilihan.evaluasi
      ? catatan.evaluasi_kendala?.trim() || "Tidak ada kendala yang dicatat."
      : TIDAK_DISERTAKAN,
    y
  );

  // ---------- BAB V: PENUTUP ----------
  y = babBaru(doc, "V", "PENUTUP");
  y = tulisParagraf(
    doc,
    pilihan.kesimpulan
      ? catatan.kesimpulan_saran?.trim() ||
          "Pelaksanaan kegiatan berjalan sesuai rencana. Saran untuk pelaksanaan berikutnya akan disampaikan menyusul."
      : TIDAK_DISERTAKAN,
    y
  );
  y += 4;
  y = tulisParagraf(
    doc,
    "Demikian laporan ini disusun agar dapat digunakan sebagaimana mestinya.",
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

  savePdf(doc, `Laporan-Rekap-Akhir-${jenisUjian}-${(tahunAjaran || "").replace(/\//g, "-")}.pdf`);
}

export { generateLaporanRekapAkhirPdf };
