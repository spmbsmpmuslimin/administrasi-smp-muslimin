// setting/kelola-ujian/laporan-lengkap/laporanLengkapPdf.js
// Generator PDF utama untuk sub-fitur "Laporan Lengkap" -- kompilasi 1
// dokumen resmi: Sampul, Kata Pengantar, Daftar Isi, BAB I Pendahuluan,
// BAB II Pelaksanaan (Peserta, Kehadiran, Pengawas), BAB III Penutup.
//
// SUMBER: file ini adalah HASIL PORTING dari
// ../dokumen-cetak/laporanRekapAkhirPdf.js (yang sekarang OBSOLETE dan
// boleh dihapus dari repo setelah file ini terpasang & dites) -- bukan
// ditulis dari nol, karena struktur bab & helper-nya udah teruji jalan.
// Perubahan dari versi lama:
//   1. Signature "Kepala Sekolah" di halaman Penutup sekarang nyantumin
//      NAMA ASLI dari profilSekolah.namaKepalaSekolah (dulu cuma garis
//      kosong buat ditulis tangan).
//   2. Cover & letterhead pakai profilSekolah.namaSekolah (dari tabel
//      school_settings, live), fallback ke konstanta SCHOOL_NAME kalau
//      profil belum lengkap -- BUKAN lagi hardcode SCHOOL_NAME doang.
//   3. Konsep checkbox `pilihan` (section mana yg mau disertakan) DIHAPUS
//      -- kesepakatannya simpel aja, semua section SELALU tampil, yang
//      kosong ditandai "Belum diisi" (istilah disamain sama status di
//      LaporanLengkapTab.js), bukan "-- (tidak disertakan) --".
//   4. (revisi) BAB "Pembiayaan" & "Evaluasi & Kendala", serta sub-bagian
//      "Keterangan Nilai" di BAB Pelaksanaan, SUDAH DIHAPUS -- form
//      input-nya (Anggaran & Biaya / Keterangan Nilai / Evaluasi & Kendala
//      / Kesimpulan & Saran) dicabut dari aplikasi karena dianggap gak
//      kepake. Sisa 3 bab: Pendahuluan, Pelaksanaan, Penutup.
//
// Lampiran (Kartu Ujian, Daftar Hadir kertas, Jadwal Pengawas, dst)
// SENGAJA TIDAK digabung ke sini -- tetap dokumen terpisah dari
// sub-fitur masing-masing. Daftar Isi juga belum ada nomor halaman
// otomatis (simpel dulu sesuai kesepakatan), cuma daftar section.

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
  SCHOOL_NAME as SCHOOL_NAME_FALLBACK,
  SCHOOL_CITY,
} from "../../../utils/pdfExportKit";

const JUDUL_UJIAN = {
  PSAS: "PENILAIAN SUMATIF AKHIR SEMESTER",
  PSAT: "PENILAIAN SUMATIF AKHIR TAHUN",
  PSAJ: "PENILAIAN SUMATIF AKHIR JENJANG",
};

const BELUM_DIISI = "Belum diisi.";

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
 * @param {string} opsi.jenisUjian     - "PSAS" | "PSAT" | "PSAJ"
 * @param {string} opsi.tahunAjaran    - label tahun ajaran, mis. "2026/2027"
 * @param {Object} opsi.profilSekolah  - hasil ambilProfilSekolah() (nama, alamat, namaKepalaSekolah, dst)
 * @param {Object} opsi.rekapPeserta   - hasil ambilRekapPeserta()
 * @param {Array}  opsi.kehadiran      - hasil ambilKehadiran()
 * @param {Object} opsi.rekapPengawas  - hasil ambilRekapPengawas()
 */
function generateLaporanLengkapPdf(opsi) {
  const {
    jenisUjian,
    tahunAjaran,
    profilSekolah,
    rekapPeserta,
    kehadiran,
    rekapPengawas,
  } = opsi;

  const namaSekolah = profilSekolah?.namaSekolah || SCHOOL_NAME_FALLBACK;
  const namaKepsek = profilSekolah?.namaKepalaSekolah;

  const judul = JUDUL_UJIAN[jenisUjian] || jenisUjian;
  const doc = createPdfDocument({ orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const tanggalCetak = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ---------- HALAMAN 1: SAMPUL / COVER ----------
  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text("LAPORAN PELAKSANAAN", pageWidth / 2, 70, { align: "center" });
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
  doc.text(namaSekolah, pageWidth / 2, pageHeight - 45, { align: "center" });
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
      `Tahun Pelajaran ${tahunAjaran || "-"} di ${namaSekolah}. Laporan memuat rekap peserta, ` +
      `kehadiran, dan pengawas selama kegiatan berlangsung.`,
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
    "BAB III  Penutup",
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
      `${namaSekolah} untuk mengukur pencapaian kompetensi peserta didik. Kegiatan ini ` +
      `dilaksanakan sesuai jadwal, tata tertib, dan pembagian ruangan yang telah ditetapkan panitia.`,
    y
  );
  y += 8;
  y = checkPageBreak(doc, y);
  y = addSectionLabel(doc, "B. Maksud dan Tujuan", y);
  y += 6;
  [
    "Mengukur ketercapaian kompetensi peserta didik pada mata pelajaran yang diujikan.",
    "Menjadi bahan evaluasi pelaksanaan ujian untuk perbaikan periode berikutnya.",
    "Menjadi bahan pertanggungjawaban panitia kepada pihak sekolah.",
  ].forEach((butir) => {
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
    "Laporan ini disusun dalam 3 bab: Pendahuluan, Pelaksanaan, dan Penutup, sebagaimana " +
      "tercantum pada Daftar Isi.",
    y
  );

  // ---------- BAB II: PELAKSANAAN ----------
  y = babBaru(doc, "II", "PELAKSANAAN");

  // A. Peserta & Ruangan
  y = addSectionLabel(doc, "A. Peserta & Ruangan", y);
  y += 6;
  if (rekapPeserta && rekapPeserta.perRuangan?.length > 0) {
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
    y = tulisParagraf(doc, BELUM_DIISI, y);
    y += 4;
  }

  // B. Kehadiran
  y = checkPageBreak(doc, y);
  y = addSectionLabel(doc, "B. Kehadiran", y);
  y += 6;
  if (kehadiran && kehadiran.length > 0) {
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
    y = tulisParagraf(doc, BELUM_DIISI, y);
    y += 4;
  }

  // C. Pengawas
  y = checkPageBreak(doc, y);
  y = addSectionLabel(doc, "C. Pengawas", y);
  y += 6;
  if (rekapPengawas && rekapPengawas.daftarPengawas?.length > 0) {
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
    y = tulisParagraf(doc, BELUM_DIISI, y);
    y += 4;
  }

  // ---------- BAB III: PENUTUP ----------
  y = babBaru(doc, "III", "PENUTUP");
  y = tulisParagraf(
    doc,
    "Pelaksanaan kegiatan berjalan sesuai rencana. Saran untuk pelaksanaan berikutnya akan disampaikan menyusul.",
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
  y += 24; // sedikit lebih tinggi dari versi lama biar muat nama Kepsek di atas garis
  // Nama Kepsek dicetak beneran (dari school_settings) kalau ada -- versi
  // lama cuma garis kosong buat ditulis tangan. Kalau profil belum diisi
  // (namaKepsek undefined/"-"), fallback ke perilaku lama: garis kosong.
  if (namaKepsek && namaKepsek !== "-") {
    doc.setFont(PDF_FONT_FAMILY, "bold");
    doc.text(namaKepsek, 25, y);
    doc.setFont(PDF_FONT_FAMILY, "normal");
  }
  doc.line(25, y + 1, 75, y + 1);
  doc.line(pageWidth - 70, y + 1, pageWidth - 20, y + 1);
  y += 5;
  doc.setFontSize(9);
  doc.text("Kepala Sekolah", 25, y);

  savePdf(doc, `Laporan-Lengkap-${jenisUjian}-${(tahunAjaran || "").replace(/\//g, "-")}.pdf`);
}

export { generateLaporanLengkapPdf };
