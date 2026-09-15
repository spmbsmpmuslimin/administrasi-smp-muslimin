// setting/kelola-ujian/kartuUjianPdf.js
// Generator PDF Kartu Peserta Ujian -- 8 kartu per halaman A4 (2 kolom x
// 4 baris). Layout per kartu: header (nama sekolah + jenis ujian + tahun
// ajaran) di atas, identitas peserta di bawahnya (lebar penuh), lalu blok
// tanda tangan kepala sekolah di pojok kanan-bawah kartu.

import {
  createPdfDocument,
  SCHOOL_NAME,
  PDF_COLORS,
  PDF_FONT_FAMILY,
  savePdf,
} from "../../utils/pdfExportKit";

const JUDUL_UJIAN = {
  PSAS: "PENILAIAN SUMATIF AKHIR SEMESTER GANJIL",
  PSAT: "PENILAIAN SUMATIF AKHIR TAHUN",
  PSAJ: "PENILAIAN SUMATIF AKHIR JENJANG",
};

const KARTU_PER_HALAMAN = 8;
const KOLOM = 2;
const BARIS = 4;
const MARGIN = 10; // mm, jarak dari tepi kertas
const GUTTER = 4; // mm, jarak antar kartu

/**
 * Tulis 1 baris "label : value", dengan value yang bisa wrap ke beberapa
 * baris kalau kepanjangan (misal nama siswa 3-4 kata) TANPA nabrak baris
 * field berikutnya -- pakai splitTextToSize biar tinggi yang dipakai
 * dihitung sesuai jumlah baris hasil wrap yang SEBENARNYA, bukan diasumsikan
 * selalu 1 baris.
 * @returns {number} posisi y setelah baris ini (buat field berikutnya)
 */
function tulisLabelValue(doc, { x, y, labelWidth, maxWidth, lineHeight }, label, value) {
  doc.setFont(PDF_FONT_FAMILY, "normal");
  doc.text(label, x, y);
  doc.text(":", x + labelWidth, y);

  doc.setFont(PDF_FONT_FAMILY, "bold");
  const valueX = x + labelWidth + 2.5;
  const lines = doc.splitTextToSize(String(value ?? "-"), maxWidth - labelWidth - 2.5);
  lines.forEach((line, i) => doc.text(line, valueX, y + i * lineHeight));

  return y + lines.length * lineHeight;
}

/**
 * Gambar 1 kartu peserta di posisi (x, y) -- pojok kiri-atas kartu.
 */
function gambarSatuKartu(
  doc,
  { x, y, width, height },
  { peserta, jenisUjian, tahunAjaran, nomorRuangan, kepsek, tanggalCetak }
) {
  // Border kartu (garis potong)
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.2);
  doc.rect(x, y, width, height);

  const padding = 3;
  let cy = y + padding + 3;
  const centerX = x + width / 2;
  const innerLeft = x + padding;
  const innerRight = x + width - padding;

  // ---- Header ----
  doc.setTextColor(0, 0, 0);
  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.setFontSize(8.5);
  doc.text(SCHOOL_NAME, centerX, cy, { align: "center" });
  cy += 3.8;

  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.setFontSize(6.5);
  const judul = JUDUL_UJIAN[jenisUjian] || jenisUjian;
  doc.text(judul, centerX, cy, { align: "center", maxWidth: width - padding * 2 });
  cy += 3.4;

  doc.setFont(PDF_FONT_FAMILY, "normal");
  doc.setFontSize(6.5);
  doc.text(`TAHUN AJARAN ${tahunAjaran}`, centerX, cy, { align: "center" });
  cy += 2.5;

  // Garis pemisah header vs badan
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.15);
  doc.line(innerLeft, cy, innerRight, cy);
  cy += 4;

  // ---- Identitas peserta -- lebar PENUH kartu, bukan cuma separuh, biar
  // nama panjang (2-3 kata) nggak gampang harus wrap ke baris baru.
  doc.setFontSize(7);
  const labelOpts = {
    x: innerLeft,
    labelWidth: 15,
    maxWidth: innerRight - innerLeft,
    lineHeight: 3.2,
  };
  const baris = [
    ["No. Peserta", peserta.no_peserta],
    ["Ruangan", nomorRuangan],
    ["Nama", peserta.nama],
    ["Kelas", peserta.kelas],
    ["NIS", peserta.nis],
  ];
  cy += 1.5;
  baris.forEach(([label, value]) => {
    cy = tulisLabelValue(doc, { ...labelOpts, y: cy }, label, value) + 1.2;
  });

  // ---- Tanda tangan kepala sekolah -- kolom kanan kartu, teks rata KIRI
  // mulai dari sigX (bukan rata kanan nempel innerRight, supaya nggak
  // mepet ke tepi kanan). Angka offset (36mm dari innerRight, 13mm dari
  // batas bawah) hasil ubahan manual -- kalau kartu lain butuh geser
  // lagi, ini yang diubah.
  const sigX = innerRight - 36;
  const ry0 = y + height - padding - 13;
  doc.setFont(PDF_FONT_FAMILY, "normal");
  doc.setFontSize(6.3);
  doc.text(`${kepsek.tempat}, ${tanggalCetak}`, sigX, ry0);
  doc.text("Kepala Sekolah", sigX, ry0 + 3.2);

  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.setFontSize(6.5);
  doc.text(kepsek.nama, sigX, ry0 + 3.2 + 8);
  doc.setFont(PDF_FONT_FAMILY, "normal");
}

/**
 * Generate & langsung download PDF kartu ujian untuk 1 ruangan.
 *
 * @param {Object} opts
 * @param {Array} opts.daftarPeserta - dari ambilPesertaRuangan(): [{no_peserta, nama, nis, kelas}]
 * @param {string} opts.jenisUjian - "PSAS" | "PSAT" | "PSAJ"
 * @param {string} opts.tahunAjaran - format "2026/2027"
 * @param {number} opts.nomorRuangan
 * @param {{nama: string, tempat: string}} opts.kepsek - dari ambilMetadataKepsek()
 */
function generateKartuPesertaPdf({ daftarPeserta, jenisUjian, tahunAjaran, nomorRuangan, kepsek }) {
  if (!daftarPeserta || daftarPeserta.length === 0) {
    throw new Error("Tidak ada peserta untuk ruangan ini");
  }

  const doc = createPdfDocument({ orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const cardWidth = (pageWidth - MARGIN * 2 - GUTTER * (KOLOM - 1)) / KOLOM;
  const cardHeight = (pageHeight - MARGIN * 2 - GUTTER * (BARIS - 1)) / BARIS;

  const tanggalCetak = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  daftarPeserta.forEach((peserta, idx) => {
    const posisiDiHalaman = idx % KARTU_PER_HALAMAN;
    if (idx > 0 && posisiDiHalaman === 0) doc.addPage();

    const kolom = posisiDiHalaman % KOLOM;
    const baris = Math.floor(posisiDiHalaman / KOLOM);
    const x = MARGIN + kolom * (cardWidth + GUTTER);
    const y = MARGIN + baris * (cardHeight + GUTTER);

    gambarSatuKartu(
      doc,
      { x, y, width: cardWidth, height: cardHeight },
      { peserta, jenisUjian, tahunAjaran, nomorRuangan, kepsek, tanggalCetak }
    );
  });

  const namaFile = `Kartu-Ujian-${jenisUjian}-Ruangan-${nomorRuangan}.pdf`;
  savePdf(doc, namaFile);
}

// ============================================================
// KARTU PENGAWAS -- 1 kartu = 1 guru, isi rekap semua sesi &
// ruangan yang dia pegang. 2 kartu per halaman (atas-bawah),
// tinggi baris tabel fleksibel biar tetap muat berapa pun jumlah
// sesinya.
// ============================================================

const PENGAWAS_PER_HALAMAN = 2;

function gambarSatuKartuPengawas(
  doc,
  { x, y, width, height },
  { guru, jenisUjian, tahunAjaran, kepsek, tanggalCetak }
) {
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.2);
  doc.rect(x, y, width, height);

  const padding = 5;
  const innerLeft = x + padding;
  const innerRight = x + width - padding;
  const innerWidth = innerRight - innerLeft;
  const centerX = x + width / 2;
  let cy = y + padding + 3.5;

  // ---- Header ----
  doc.setTextColor(0, 0, 0);
  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.setFontSize(10);
  doc.text(SCHOOL_NAME, centerX, cy, { align: "center" });
  cy += 4.2;

  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.setFontSize(7.5);
  const judul = JUDUL_UJIAN[jenisUjian] || jenisUjian;
  doc.text(judul, centerX, cy, { align: "center", maxWidth: innerWidth });
  cy += 3.8;

  doc.setFont(PDF_FONT_FAMILY, "normal");
  doc.setFontSize(7.5);
  doc.text(`TAHUN AJARAN ${tahunAjaran}`, centerX, cy, { align: "center" });
  cy += 4.5;

  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.setFontSize(9);
  doc.text("KARTU PENGAWAS UJIAN", centerX, cy, { align: "center" });
  cy += 5.5;

  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.setFontSize(8.5);
  doc.text(`Nama: ${guru.nama}`, innerLeft, cy);
  cy += 4;

  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.15);
  doc.line(innerLeft, cy, innerRight, cy);
  cy += 4;

  // ---- Tabel jadwal ngawas ----
  const kolom = [
    { label: "Hari/Tanggal", w: 0.3 },
    { label: "Jam Ke", w: 0.12 },
    { label: "Waktu", w: 0.18 },
    { label: "Mata Pelajaran", w: 0.26 },
    { label: "Ruang", w: 0.14 },
  ];
  let colX = innerLeft;
  const colPos = kolom.map((k) => {
    const pos = { ...k, x: colX };
    colX += innerWidth * k.w;
    return pos;
  });

  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.setFontSize(6.5);
  colPos.forEach((k) => doc.text(k.label, k.x, cy));
  cy += 1.2;
  doc.setLineWidth(0.15);
  doc.line(innerLeft, cy, innerRight, cy);
  cy += 3;

  // Tinggi baris fleksibel: area tersisa di kartu dibagi rata ke semua
  // baris, dibatasi min 4mm (biar tetap kebaca) dan max 7mm (biar nggak
  // kelewat renggang kalau gurunya cuma ngawas 1-2 sesi).
  const sisaTinggi = y + height - padding - cy;
  const jumlahBaris = guru.sesi.length || 1;
  const tinggiBaris = Math.min(7, Math.max(4, sisaTinggi / jumlahBaris));

  doc.setFont(PDF_FONT_FAMILY, "normal");
  doc.setFontSize(6.5);
  guru.sesi.forEach((s) => {
    const waktu = s.waktu_mulai && s.waktu_selesai ? `${s.waktu_mulai}-${s.waktu_selesai}` : "-";
    doc.text(formatHariTanggalSingkat(s.tanggal), colPos[0].x, cy, {
      maxWidth: innerWidth * kolom[0].w - 1,
    });
    doc.text(String(s.sesi_ke), colPos[1].x, cy);
    doc.text(waktu, colPos[2].x, cy, { maxWidth: innerWidth * kolom[2].w - 1 });
    doc.text(s.mata_pelajaran || "-", colPos[3].x, cy, { maxWidth: innerWidth * kolom[3].w - 1 });
    doc.text(`Ruang ${s.nomor_ruangan}`, colPos[4].x, cy, {
      maxWidth: innerWidth * kolom[4].w - 1,
    });
    cy += tinggiBaris;
  });

  // ---- Tanda tangan kepala sekolah (kolom kanan kartu, rata kiri -- lihat
  // alasan & angka offset di gambarSatuKartu()) ----
  const sigX = innerRight - 36;
  const ry0 = y + height - padding - 13;
  doc.setFont(PDF_FONT_FAMILY, "normal");
  doc.setFontSize(6.5);
  doc.text(`${kepsek.tempat}, ${tanggalCetak}`, sigX, ry0);
  doc.text("Kepala Sekolah", sigX, ry0 + 3.2);
  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.text(kepsek.nama, sigX, ry0 + 3.2 + 8);
}

/**
 * Format tanggal "YYYY-MM-DD" jadi ringkas "Sen, 15-09-2026" (dipakai di
 * kartu pengawas biar kolom "Hari/Tanggal" nggak makan tempat -- beda
 * dengan format panjang "Senin, 15-09-2026" yang dipakai di tabel jadwal
 * pada JadwalPengawasTab.js).
 */
function formatHariTanggalSingkat(tanggal) {
  if (!tanggal) return "-";
  const [tahun, bulan, hari] = tanggal.split("-").map(Number);
  const tgl = new Date(tahun, bulan - 1, hari);
  const namaHari = tgl.toLocaleDateString("id-ID", { weekday: "short" });
  return `${namaHari}, ${String(hari).padStart(2, "0")}-${String(bulan).padStart(2, "0")}-${tahun}`;
}

/**
 * Generate & langsung download PDF kartu pengawas -- 1 PDF berisi kartu
 * SEMUA guru yang kebagian jadwal ngawas di ujian ini, 2 kartu per
 * halaman (atas-bawah).
 *
 * @param {Object} opts
 * @param {Array} opts.daftarGuruJadwal - dari ambilJadwalPengawasPerGuru(): [{guru_id, nama, sesi:[...]}]
 * @param {string} opts.jenisUjian
 * @param {string} opts.tahunAjaran
 * @param {{nama: string, tempat: string}} opts.kepsek
 */
function generateKartuPengawasPdf({ daftarGuruJadwal, jenisUjian, tahunAjaran, kepsek }) {
  if (!daftarGuruJadwal || daftarGuruJadwal.length === 0) {
    throw new Error("Belum ada guru yang punya jadwal mengawas");
  }

  const doc = createPdfDocument({ orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const cardWidth = pageWidth - MARGIN * 2;
  const cardHeight = (pageHeight - MARGIN * 2 - GUTTER) / PENGAWAS_PER_HALAMAN;

  const tanggalCetak = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  daftarGuruJadwal.forEach((guru, idx) => {
    const posisiDiHalaman = idx % PENGAWAS_PER_HALAMAN;
    if (idx > 0 && posisiDiHalaman === 0) doc.addPage();

    const x = MARGIN;
    const y = MARGIN + posisiDiHalaman * (cardHeight + GUTTER);

    gambarSatuKartuPengawas(
      doc,
      { x, y, width: cardWidth, height: cardHeight },
      { guru, jenisUjian, tahunAjaran, kepsek, tanggalCetak }
    );
  });

  const namaFile = `Kartu-Pengawas-${jenisUjian}.pdf`;
  savePdf(doc, namaFile);
}

export { generateKartuPesertaPdf, generateKartuPengawasPdf };
