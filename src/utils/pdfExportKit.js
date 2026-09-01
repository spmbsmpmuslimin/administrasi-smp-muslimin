// src/utils/pdfExportKit.js
// Kit standar buat semua export PDF berbasis jsPDF + jspdf-autotable di
// app ini -- letterhead, warna, style tabel, dan helper page-break yang
// seragam. Sebelum ini, tiap file (AttendancePDF.js, CetakRaport.js,
// JurnalHarian.js, dst) nulis header & style tabel sendiri-sendiri, jadi
// warna header tabel ada 3 variasi biru berbeda + 1 abu-abu, dan ukuran
// judul beda-beda tiap file.
//
// Cara pakai (contoh):
//   import {
//     PDF_COLORS, createPdfDocument, addLetterhead,
//     tableTheme, addSectionLabel, checkPageBreak, savePdf,
//   } from "../utils/pdfExportKit";
//   import autoTable from "jspdf-autotable";
//
// Khusus buat DenahDuduk.js & Organigram.js (html2canvas -- nge-screenshot
// elemen visual/spasial jadi gambar): kit ini TETAP bisa dipakai buat
// bagian letterhead-nya aja (addLetterhead), badan dokumennya tetap pakai
// html2canvas karena kontennya emang visual, bukan tabel data.
//
// Kalau mau ganti warna resmi sekolah, TINGGAL GANTI di PDF_COLORS.primary
// di file ini -- otomatis nyambung ke semua export PDF yang pakai kit ini.
// Ini juga UDAH DISAMAIN sama biru resmi di excelExportKit.js (EXCEL_COLORS.
// primary = "FF1E3A8A"), biar hasil Excel dan PDF sama-sama pakai 1 warna
// brand yang sama.

import jsPDF from "jspdf";
import { guardHasData } from "./excelExportKit";

export const SCHOOL_NAME = "SMP MUSLIMIN CILILIN";
export const SCHOOL_CITY = "Cililin";

// Palet warna resmi dalam format RGB array [r,g,b] -- format yang dipakai
// jsPDF/autoTable (beda dari ARGB hex di excelExportKit.js buat ExcelJS).
// primary di sini SAMA persis sama EXCEL_COLORS.primary (#1E3A8A) biar
// laporan Excel & PDF konsisten pakai 1 warna brand.
export const PDF_COLORS = {
  primary: [30, 58, 138], // biru tua -- header tabel utama & garis pemisah
  headerText: [255, 255, 255], // putih -- teks di atas warna primary
  border: [203, 213, 225], // abu-abu -- garis tabel standar
  zebra: [248, 250, 252], // abu-abu sangat muda -- selang-seling baris data
  textMuted: [100, 100, 100], // abu-abu -- teks sekunder (tanggal cetak, filter)
  accentPurple: [124, 58, 237], // warna alternatif -- section/sheet yang perlu dibedain dari header utama
  danger: [220, 38, 38],
  success: [22, 163, 74],
  warning: [217, 119, 6],
};

// Semua file yang dicek kemarin udah konsisten pakai ini -- dipertahankan,
// bukan diubah. Font bawaan jsPDF, jadi selalu tersedia tanpa perlu embed.
export const PDF_FONT_FAMILY = "helvetica";

/**
 * Bikin instance jsPDF baru dengan setting standar: unit "mm" (paling
 * gampang buat itung margin cetak dalam cm/mm) dan ukuran A4. Beberapa
 * file lama pakai unit "pt" -- itu bikin angka margin/posisi antar file
 * nggak nyambung kalau dibandingin. Basis baru semua "mm".
 *
 * @param {Object} [opts]
 * @param {"portrait"|"landscape"} [opts.orientation="portrait"]
 * @returns {jsPDF}
 */
export function createPdfDocument({ orientation = "portrait" } = {}) {
  return new jsPDF({ unit: "mm", format: "a4", orientation });
}

/**
 * Tulis blok letterhead standar (nama sekolah + judul laporan + metadata
 * opsional), rata tengah di bagian atas halaman. Return posisi Y
 * berikutnya, biar caller tinggal lanjut nulis section/tabel dari situ.
 *
 * @param {jsPDF} doc
 * @param {Object} opts
 * @param {string} opts.title        - judul laporan, misal "LAPORAN PRESENSI SISWA KELAS 7A"
 * @param {string} [opts.subtitle]   - baris tambahan di bawah judul (mis. "SEMESTER : GANJIL 2026/2027"), rata tengah juga
 * @param {string[]} [opts.metaLines] - baris info kiri (bukan center), 1 string = 1 baris. Buat info sekunder kayak tanggal export.
 * @param {number} [opts.startY=18]
 * @param {boolean} [opts.withDivider=true] - garis horizontal pemisah di bawah letterhead
 * @returns {number} posisi Y kosong berikutnya, siap dipakai buat section/tabel
 */
export function addLetterhead(
  doc,
  { title, subtitle, metaLines = [], startY = 18, withDivider = true } = {},
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = startY;

  doc.setTextColor(0, 0, 0); // sengaja hitam -- laporan ini kebanyakan
  // dicetak hitam-putih, jadi warna di judul nggak ngaruh dan malah bisa
  // nge-print abu-abu/pudar di printer non-warna.
  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.setFontSize(14);
  doc.text(SCHOOL_NAME, pageWidth / 2, y, { align: "center" });
  y += 6;

  if (title) {
    doc.setFontSize(12);
    doc.text(title, pageWidth / 2, y, { align: "center" });
    y += 6;
  }

  if (subtitle) {
    doc.setFont(PDF_FONT_FAMILY, "normal");
    doc.setFontSize(10.5);
    doc.text(subtitle, pageWidth / 2, y, { align: "center" });
    y += 6;
  }

  if (withDivider) {
    y += 1;
    doc.setDrawColor(...PDF_COLORS.border);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  }

  if (metaLines.length > 0) {
    doc.setFont(PDF_FONT_FAMILY, "normal");
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.textMuted);
    metaLines.forEach((line) => {
      doc.text(line, margin, y);
      y += 4.5;
    });
    doc.setTextColor(0, 0, 0);
    y += 2;
  }

  return y;
}

/**
 * Tulis label section (mis. "INFORMASI SISWA", "RINGKASAN KEHADIRAN")
 * pakai style standar: bold, size 10, hitam. Gantiin pattern
 * `doc.setFont(...); doc.setFontSize(10); doc.text(...)` yang diulang
 * berkali-kali di banyak file buat tiap section header.
 *
 * @param {jsPDF} doc
 * @param {string} text
 * @param {number} y
 * @param {number} [x=15]
 * @returns {number} y (tidak berubah -- caller yang nentuin spacing setelahnya)
 */
export function addSectionLabel(doc, text, y, x = 15) {
  doc.setTextColor(0, 0, 0);
  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.setFontSize(10);
  doc.text(text, x, y);
  return y;
}

/**
 * Opsi standar buat dilempar ke autoTable() (dari jspdf-autotable) --
 * warna header, font, border, zebra striping seragam. Caller tinggal
 * spread ini terus nambahin `head` dan `body`-nya sendiri.
 *
 * @param {number} startY
 * @param {Object} [opts]
 * @param {number[]} [opts.fillColor] - default PDF_COLORS.primary, bisa dioverride (misal PDF_COLORS.accentPurple)
 * @param {number} [opts.fontSize=9]
 * @param {Object} [opts.margin] - default { left: 15, right: 15 }
 * @param {Object} [opts.styles] - override tambahan buat cell body (mis. { halign: "center", cellPadding: 3 }),
 *   di-merge SETELAH default font/fontSize/border jadi bisa nimpa kalau perlu
 * @returns {Object} opsi siap di-spread ke autoTable(doc, { ...tableTheme(y), head, body })
 */
export function tableTheme(
  startY,
  {
    fillColor = PDF_COLORS.primary,
    fontSize = 9,
    margin = { left: 15, right: 15 },
    styles = {},
  } = {},
) {
  return {
    startY,
    margin,
    theme: "grid",
    styles: {
      font: PDF_FONT_FAMILY,
      fontSize,
      cellPadding: 2,
      lineColor: PDF_COLORS.border,
      lineWidth: 0.1,
      textColor: [0, 0, 0],
      ...styles,
    },
    headStyles: {
      fillColor,
      textColor: PDF_COLORS.headerText,
      fontStyle: "bold",
      halign: "center",
    },
    alternateRowStyles: {
      fillColor: PDF_COLORS.zebra,
    },
  };
}

/**
 * Cek apakah posisi Y saat ini udah kelewat batas aman halaman -- kalau
 * iya, tambah halaman baru dan reset Y. Gantiin pattern
 * `if (y > 250) { doc.addPage(); y = 20; }` yang diulang di banyak
 * tempat dalam 1 file (biasanya sebelum section/tabel besar).
 *
 * @param {jsPDF} doc
 * @param {number} y
 * @param {Object} [opts]
 * @param {number} [opts.threshold=250] - batas Y (mm) sebelum dianggap "mepet footer"
 * @param {number} [opts.resetY=20] - Y baru di halaman berikutnya kalau kepicu
 * @returns {number} y (baru kalau ganti halaman, tetap kalau nggak)
 */
export function checkPageBreak(doc, y, { threshold = 250, resetY = 20 } = {}) {
  if (y > threshold) {
    doc.addPage();
    return resetY;
  }
  return y;
}

/**
 * Simpan/download PDF-nya. Tipis banget, tapi dipisah biar penamaannya
 * konsisten sama downloadWorkbook() di excelExportKit.js.
 * @param {jsPDF} doc
 * @param {string} filename - termasuk ekstensi .pdf
 */
export function savePdf(doc, filename) {
  doc.save(filename);
}

// Dipakai lagi dari excelExportKit.js -- guard "data kosong" ini generik,
// nggak spesifik ke Excel, jadi 1 sumber aja buat kedua kit.
export { guardHasData };
