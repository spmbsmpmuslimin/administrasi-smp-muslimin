// setting/kelola-ujian/petunjukPenggunaanPdf.js
// Generator PDF "Petunjuk & Penggunaan Aplikasi" -- isinya ditulis ulang
// dari PANDUAN di petunjukPenggunaanData.js (SUMBER TUNGGAL, sama persis
// dengan yang ditampilkan di PetunjukPenggunaanTab.js). Sengaja TIDAK
// pakai autoTable/tableTheme kayak generator lain -- isinya paragraf
// bernomor, bukan tabel, jadi ditulis manual pakai doc.splitTextToSize
// dengan pagination sendiri (pindah halaman otomatis kalau kepanjangan).

import { createPdfDocument, addLetterhead, savePdf, PDF_FONT_FAMILY } from "../../utils/pdfExportKit";
import { PANDUAN } from "./petunjukPenggunaanData";

const MARGIN = 15;
const WARNA_JUDUL_BAGIAN = [67, 56, 202]; // indigo tua
const WARNA_TEKS = [55, 65, 81]; // gray-700
const WARNA_CATATAN = [180, 83, 9]; // amber-700

function tinggiHalaman(doc) {
  return doc.internal.pageSize.getHeight();
}

function lebarHalaman(doc) {
  return doc.internal.pageSize.getWidth();
}

/** Pindah ke halaman baru kalau sisa ruang di halaman sekarang nggak cukup. */
function pastikanRuang(doc, y, tinggiDibutuhkan) {
  if (y + tinggiDibutuhkan > tinggiHalaman(doc) - MARGIN) {
    doc.addPage();
    return MARGIN + 8;
  }
  return y;
}

/**
 * Tulis paragraf yang otomatis wrap sesuai maxWidth, return tinggi (mm)
 * yang terpakai supaya caller bisa lanjutin y setelahnya.
 */
function tulisParagraf(doc, x, y, maxWidth, teks, { fontSize = 9, bold = false, color = WARNA_TEKS } = {}) {
  doc.setFont(PDF_FONT_FAMILY, bold ? "bold" : "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(...color);
  const baris = doc.splitTextToSize(teks, maxWidth);
  const tinggiBaris = fontSize * 0.3528 * 1.35;
  baris.forEach((line, i) => doc.text(line, x, y + i * tinggiBaris));
  return baris.length * tinggiBaris;
}

/**
 * @param {Object} [params]
 * @param {Function} [params.showToast]
 */
export function generatePetunjukPenggunaanPdf({ showToast } = {}) {
  const doc = createPdfDocument({ orientation: "portrait" });
  const margin = MARGIN;
  const lebarKonten = lebarHalaman(doc) - margin * 2;

  let y = addLetterhead(doc, {
    title: "PETUNJUK & PENGGUNAAN APLIKASI",
    subtitleLines: ["Manajemen Ujian -- PSAS / PSAT / PSAJ"],
    withDivider: true,
  });
  y += 4;

  PANDUAN.forEach((bagian, indexBagian) => {
    y = pastikanRuang(doc, y, 14);

    doc.setFont(PDF_FONT_FAMILY, "bold");
    doc.setFontSize(12);
    doc.setTextColor(...WARNA_JUDUL_BAGIAN);
    doc.text(`${indexBagian + 1}. ${bagian.title}`, margin, y);
    y += 6;

    if (bagian.belumTersedia) {
      const tinggi = tulisParagraf(
        doc,
        margin + 4,
        y,
        lebarKonten - 4,
        `Catatan: ${bagian.catatan}`,
        { fontSize: 9, color: WARNA_CATATAN }
      );
      y += tinggi + 7;
      return;
    }

    bagian.langkah.forEach((step, idx) => {
      // Estimasi tinggi dulu SEBELUM nulis, biar bisa cek ruang halaman.
      doc.setFont(PDF_FONT_FAMILY, "normal");
      doc.setFontSize(9);
      const barisDeskripsi = doc.splitTextToSize(step.deskripsi, lebarKonten - 8);
      const tinggiDeskripsi = barisDeskripsi.length * (9 * 0.3528 * 1.35);
      const tinggiDibutuhkan = 5 + tinggiDeskripsi + 3;
      y = pastikanRuang(doc, y, tinggiDibutuhkan);

      doc.setFont(PDF_FONT_FAMILY, "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...WARNA_TEKS);
      doc.text(`${idx + 1}. ${step.judul}`, margin + 4, y);
      y += 4.6;

      const tinggiDeskripsiAktual = tulisParagraf(
        doc,
        margin + 8,
        y,
        lebarKonten - 8,
        step.deskripsi,
        { fontSize: 9, color: WARNA_TEKS }
      );
      y += tinggiDeskripsiAktual + 3;
    });

    if (bagian.catatan) {
      y = pastikanRuang(doc, y, 10);
      const tinggi = tulisParagraf(
        doc,
        margin + 4,
        y,
        lebarKonten - 4,
        `Catatan: ${bagian.catatan}`,
        { fontSize: 8.5, color: WARNA_CATATAN }
      );
      y += tinggi + 4;
    }

    y += 4; // jarak antar bagian
  });

  savePdf(doc, "Petunjuk-Penggunaan-Aplikasi-Manajemen-Ujian.pdf");
  showToast?.("Petunjuk & Penggunaan Aplikasi berhasil diunduh", "success");
}
