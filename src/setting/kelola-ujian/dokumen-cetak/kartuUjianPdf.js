// setting/kelola-ujian/kartuUjianPdf.js
// Generator PDF Kartu Peserta Ujian -- 8 kartu per halaman A4 (2 kolom x
// 4 baris). Layout per kartu: header (nama sekolah + jenis ujian + tahun
// ajaran) di atas, identitas peserta di bawahnya (lebar penuh) dengan
// badge nomor ruangan di pojok kanan-atas, lalu blok tanda tangan kepala
// sekolah di pojok kanan-bawah kartu.
//
// CATATAN (kartu 2 sisi): kalau `daftarJadwal` diisi, generateKartuPesertaPdf()
// nambahin halaman JADWAL UJIAN + kolom Paraf Pengawas di belakang tiap
// kartu, acuan dari kartu ujian kertas lama sekolah ini -- 1 kartu = 1 sisi
// depan (identitas) + 1 sisi belakang (jadwal, buat pengawas paraf tiap
// sesi selesai). Halaman belakang disusun PERSIS SAMA (grid & urutan
// peserta) kayak halaman depan, jadi kalau dicetak duplex/gandeng-cetak
// posisinya nyambung. Kalau daftarJadwal kosong/nggak dikasih, kartu tetap
// kecetak 1 sisi kayak sebelumnya (fitur ini backward-compatible).

import {
  createPdfDocument,
  SCHOOL_NAME,
  PDF_COLORS,
  PDF_FONT_FAMILY,
  savePdf,
} from "../../../utils/pdfExportKit";
import { mataPelajaranUntukJenjang } from "../jadwal-pengawas/jadwalPengawasSupabase";

const JUDUL_UJIAN = {
  PSAS: "PENILAIAN SUMATIF AKHIR SEMESTER GANJIL",
  PSAT: "PENILAIAN SUMATIF AKHIR TAHUN",
  PSAJ: "PENILAIAN SUMATIF AKHIR JENJANG",
};

/** "9B" -> "9". Dipakai buat nentuin mata pelajaran mana yang berlaku
 * buat peserta ini di tiap sesi (lihat mataPelajaranUntukJenjang()). */
function jenjangDariKelas(kelas) {
  return String(kelas || "").match(/^\d+/)?.[0] || null;
}

/** 2 -> "02", 18 -> "18". Dipakai di badge nomor ruangan -- SELALU 2
 * digit (bukan cuma buat rentang 01-18, tapi angka berapa pun) supaya
 * lebar badge konsisten kalau nanti jumlah ruangan beda-beda per ujian. */
function formatNomorRuangan(n) {
  return String(n ?? "-").padStart(2, "0");
}

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

  // ---- Identitas peserta -- SEMUA baris pakai labelWidth yang SAMA
  // (22, cukup buat label terpanjang "Jenis Kelamin") biar titik dua
  // ("No. Peserta :", "Nama :", dst) rata & sejajar dari atas ke bawah.
  // Dulu 2 baris pertama dipersempit + labelWidth beda (15 vs 22) buat
  // ngindarin badge ruangan yang ada di pojok kanan-atas -- sekarang
  // badge udah dipindah ke bawah (lihat komentar di bawah), jadi semua
  // baris bisa lebar PENUH & pakai label option yang sama (revisi Sep
  // 2026). Kelas ditampilin PERSIS kayak tersimpan di database (mis.
  // "9B"), SENGAJA gak dikonversi ke angka Romawi ala kartu kertas lama.
  doc.setFontSize(7);
  const labelOptsIdentitas = {
    x: innerLeft,
    labelWidth: 22,
    maxWidth: innerRight - innerLeft,
    lineHeight: 3.2,
  };
  const barisIdentitas = [
    ["No. Peserta", peserta.no_peserta],
    ["Nama", peserta.nama],
    ["Kelas", peserta.kelas],
    ["NIS", peserta.nis],
    ["NISN", peserta.nisn],
    ["Jenis Kelamin", peserta.jenisKelamin],
  ];
  cy += 1.5;
  barisIdentitas.forEach(([label, value]) => {
    cy = tulisLabelValue(doc, { ...labelOptsIdentitas, y: cy }, label, value) + 1.2;
  });

  // ---- Baris bawah kartu: badge nomor ruangan (kiri) & tanda tangan
  // kepala sekolah (kanan), SEJAJAR satu baris (revisi Sep 2026 -- badge
  // sebelumnya di pojok kanan-atas identitas, sekarang dipindah ke sini
  // biar sejajar sama blok kepala sekolah). Angka offset tanda tangan
  // (36mm dari innerRight, 13mm dari batas bawah) hasil ubahan manual --
  // kalau kartu lain butuh geser lagi, ini yang diubah.
  const sigX = innerRight - 36;
  const ry0 = y + height - padding - 13;

  const badgeWidth = width * 0.24;
  const badgeHeight = 13; // SEBELUMNYA 15 -- dikecilin dikit biar box gak ngelewatin batas bawah kartu pas disejajarin
  const badgeGapKiri = 5; // jarak dari innerLeft -- jangan mepet ke tepi kiri
  const badgeX = innerLeft + badgeGapKiri;
  const badgeY = ry0 - 1; // atas box ~sejajar baris pertama teks ttd ("Cililin, ..."), bawah box ~sejajar baris nama kepsek
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.35);
  doc.rect(badgeX, badgeY, badgeWidth, badgeHeight);
  doc.setFont(PDF_FONT_FAMILY, "normal");
  doc.setFontSize(5.5);
  doc.text("RUANG", badgeX + badgeWidth / 2, badgeY + 4, { align: "center" });
  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.setFontSize(16);
  doc.text(formatNomorRuangan(nomorRuangan), badgeX + badgeWidth / 2, badgeY + badgeHeight - 3, {
    align: "center",
  });

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
 * @param {Array} opts.daftarPeserta - dari ambilPesertaRuangan(): [{no_peserta, nama, nis, nisn, kelas, jenisKelamin}]
 * @param {string} opts.jenisUjian - "PSAS" | "PSAT" | "PSAJ"
 * @param {string} opts.tahunAjaran - format "2026/2027"
 * @param {number} opts.nomorRuangan
 * @param {{nama: string, tempat: string}} opts.kepsek - dari ambilMetadataKepsek()
 */
/**
 * Format tanggal "YYYY-MM-DD" jadi "Senin, 11-05-2026" (nama hari PANJANG)
 * -- niru format di kartu kertas lama. Kartu Pengawas pakai
 * formatHariDanTanggal() di bawah (nama hari & tanggal dipisah 2 baris
 * di sel gabungan).
 */
function formatHariTanggalPanjang(tanggal) {
  if (!tanggal) return "-";
  const [tahun, bulan, hari] = tanggal.split("-").map(Number);
  const tgl = new Date(tahun, bulan - 1, hari);
  const namaHari = tgl.toLocaleDateString("id-ID", { weekday: "long" });
  return `${namaHari}, ${String(hari).padStart(2, "0")}-${String(bulan).padStart(2, "0")}-${tahun}`;
}

/**
 * Sisi BELAKANG kartu peserta -- tabel jadwal ujian + kolom Paraf Pengawas
 * kosong (diisi tangan tiap sesi selesai), niru persis kartu kertas lama
 * sekolah ini. Beda dari sisi depan: gak ada identitas peserta diulang di
 * sini (kartu kertas lama juga gak ngulang), cuma judul + tabel.
 *
 * Mapel per sesi diambil PER PESERTA (lewat mataPelajaranUntukJenjang(),
 * dari jenjang KELAS PESERTA INI -- bukan jenjang ruangan) -- soalnya versi
 * Silang Jenjang bisa nyampur beberapa jenjang dalam 1 ruangan, jadi mapel
 * yang bener buat kelas 8 & kelas 9 di ruangan yang sama bisa BEDA
 * meskipun jamnya bareng. Kalau ditentuin dari ruangan (ambil jenjang
 * asal-asalan dari 1 siswa aja), peserta jenjang lain bisa kecetak mapel
 * yang salah.
 */
function gambarHalamanJadwalKartu(
  doc,
  { x, y, width, height },
  { peserta, jenisUjian, tahunAjaran, daftarJadwal }
) {
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.2);
  doc.rect(x, y, width, height);

  const padding = 3;
  let cy = y + padding + 3;
  const centerX = x + width / 2;
  const innerLeft = x + padding;
  const innerRight = x + width - padding;
  const innerWidth = innerRight - innerLeft;

  // ---- Header ----
  doc.setTextColor(0, 0, 0);
  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.setFontSize(7);
  doc.text(`JADWAL ${JUDUL_UJIAN[jenisUjian] || jenisUjian}`, centerX, cy, {
    align: "center",
    maxWidth: innerWidth,
  });
  cy += 3.2;
  doc.setFont(PDF_FONT_FAMILY, "normal");
  doc.setFontSize(6.5);
  doc.text(`TAHUN AJARAN ${tahunAjaran}`, centerX, cy, { align: "center" });
  cy += 2.5;

  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.15);
  doc.line(innerLeft, cy, innerRight, cy);
  cy += 3;

  const jenjang = jenjangDariKelas(peserta.kelas);
  const sesiList = (daftarJadwal || [])
    .slice()
    .sort((a, b) =>
      a.tanggal === b.tanggal ? a.sesi_ke - b.sesi_ke : a.tanggal.localeCompare(b.tanggal)
    );

  if (sesiList.length === 0) {
    doc.setFont(PDF_FONT_FAMILY, "normal");
    doc.setFontSize(6.5);
    doc.text("Jadwal ujian belum diisi.", centerX, cy + 4, { align: "center" });
    return;
  }

  // ---- Kolom tabel. Lebar Mapel = sisa dari 4 kolom lain -- kalau ada
  // mapel yang namanya panjang ("Ilmu Pengetahuan Sosial") bisa wrap ke 2
  // baris, makanya tinggi baris dihitung DINAMIS (bukan tetap) di bawah.
  const kolom = { hari: 24, jamKe: 8, waktu: 16, paraf: 12 };
  kolom.mapel = innerWidth - kolom.hari - kolom.jamKe - kolom.waktu - kolom.paraf;
  const colX = {
    hari: innerLeft,
    jamKe: innerLeft + kolom.hari,
    waktu: innerLeft + kolom.hari + kolom.jamKe,
    mapel: innerLeft + kolom.hari + kolom.jamKe + kolom.waktu,
    paraf: innerLeft + kolom.hari + kolom.jamKe + kolom.waktu + kolom.mapel,
  };

  const tinggiHeaderTabel = 5;
  const sisaTinggi = y + height - padding - cy - tinggiHeaderTabel;
  // Tinggi baris fleksibel kayak di gambarSatuKartuPengawas(): dibagi rata
  // ke semua sesi, dibatasi minimum 3.6mm (masih kebaca di font 5.3pt).
  const tinggiBaris = Math.max(3.6, sisaTinggi / sesiList.length);
  const fontSizeIsi = tinggiBaris < 4.2 ? 5 : 5.5;

  // ---- Header tabel ----
  doc.setFillColor(...PDF_COLORS.border);
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.15);
  doc.rect(innerLeft, cy, innerWidth, tinggiHeaderTabel, "S");
  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.setFontSize(5.3);
  doc.setTextColor(0, 0, 0);
  const cyLabelHeader = cy + tinggiHeaderTabel - 1.5;
  doc.text("Hari", colX.hari + 1, cyLabelHeader);
  doc.text("Jam", colX.jamKe + kolom.jamKe / 2, cyLabelHeader, { align: "center" });
  doc.text("Waktu", colX.waktu + 1, cyLabelHeader);
  doc.text("Mapel", colX.mapel + 1, cyLabelHeader);
  doc.text("Paraf", colX.paraf + kolom.paraf / 2, cyLabelHeader, { align: "center" });
  [colX.jamKe, colX.waktu, colX.mapel, colX.paraf].forEach((garisX) => {
    doc.line(garisX, cy, garisX, cy + tinggiHeaderTabel);
  });
  cy += tinggiHeaderTabel;

  // ---- Baris data. "Hari" cuma dicetak di baris PERTAMA tiap tanggal
  // ganti (niru sel gabungan di kartu kertas lama), baris sesi ke-2 dst di
  // hari yang sama dikosongin -- tanpa itu garis border udah cukup bikin
  // keliatan itu masih 1 hari yang sama.
  let tanggalSebelumnya = null;
  doc.setFont(PDF_FONT_FAMILY, "normal");
  doc.setFontSize(fontSizeIsi);
  sesiList.forEach((sesi) => {
    doc.setDrawColor(...PDF_COLORS.border);
    doc.setLineWidth(0.12);
    doc.rect(innerLeft, cy, innerWidth, tinggiBaris, "S");
    [colX.jamKe, colX.waktu, colX.mapel, colX.paraf].forEach((garisX) => {
      doc.line(garisX, cy, garisX, cy + tinggiBaris);
    });

    const cyIsi = cy + tinggiBaris / 2 + 1.3;
    if (sesi.tanggal !== tanggalSebelumnya) {
      const labelHari = doc.splitTextToSize(formatHariTanggalPanjang(sesi.tanggal), kolom.hari - 2);
      doc.text(labelHari[0] || "-", colX.hari + 1, cyIsi);
      tanggalSebelumnya = sesi.tanggal;
    }
    doc.text(String(sesi.sesi_ke ?? "-"), colX.jamKe + kolom.jamKe / 2, cyIsi, {
      align: "center",
    });
    const waktu =
      sesi.waktu_mulai && sesi.waktu_selesai ? `${sesi.waktu_mulai}-${sesi.waktu_selesai}` : "-";
    doc.text(waktu, colX.waktu + 1, cyIsi, { maxWidth: kolom.waktu - 1 });
    const mapel = mataPelajaranUntukJenjang(sesi, jenjang) || "-";
    const barisMapel = doc.splitTextToSize(mapel, kolom.mapel - 2);
    doc.text(barisMapel[0] || "-", colX.mapel + 1, cyIsi);
    // Kolom Paraf SENGAJA dibiarin kosong -- diisi tangan sama pengawas.

    cy += tinggiBaris;
  });
}

/**
 * Generate PDF kartu peserta. Dua mode pemanggilan (revisi Sep 2026):
 * 1. PER RUANGAN (lama) -- daftarPeserta semuanya dari 1 ruangan yang sama,
 *    nomor ruangan dikasih lewat `nomorRuangan` (satu nilai buat semua kartu).
 * 2. PER KELAS (baru) -- buat mudahin distribusi kartu ke siswa (siswa lebih
 *    familiar cari kartu berdasarkan kelasnya sendiri daripada nomor ruangan
 *    ujian yang campur-campur jenjang). daftarPeserta 1 kelas tapi bisa
 *    kesebar di BEBERAPA ruangan (kalau ujiannya silang kelas) -- di mode ini
 *    tiap objek peserta WAJIB punya `peserta.nomorRuangan` sendiri (badge di
 *    kartu bakal nampilin ruangan masing-masing anak, bukan satu nomor buat
 *    semua). `nomorRuangan` global boleh dikosongin di mode ini.
 */
function generateKartuPesertaPdf({
  daftarPeserta,
  jenisUjian,
  tahunAjaran,
  nomorRuangan,
  kepsek,
  daftarJadwal = [],
}) {
  if (!daftarPeserta || daftarPeserta.length === 0) {
    throw new Error("Tidak ada peserta buat dicetak");
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

  // Posisi kartu ke-idx di grid -- dipakai BARENG buat sisi depan & sisi
  // belakang, biar keduanya persis nyambung kalau dicetak duplex.
  const posisiKartu = (idx) => {
    const posisiDiHalaman = idx % KARTU_PER_HALAMAN;
    const kolom = posisiDiHalaman % KOLOM;
    const baris = Math.floor(posisiDiHalaman / KOLOM);
    return {
      posisiDiHalaman,
      x: MARGIN + kolom * (cardWidth + GUTTER),
      y: MARGIN + baris * (cardHeight + GUTTER),
    };
  };

  // ---- Sisi depan: identitas + badge ruangan (semua peserta). Nomor
  // ruangan diambil PER PESERTA (peserta.nomorRuangan) kalau ada -- perlu
  // buat mode cetak per kelas di mana 1 kelas bisa kesebar ke beberapa
  // ruangan -- fallback ke `nomorRuangan` global buat mode cetak per
  // ruangan (lama, semua peserta 1 ruangan yang sama).
  daftarPeserta.forEach((peserta, idx) => {
    const { posisiDiHalaman, x, y } = posisiKartu(idx);
    if (idx > 0 && posisiDiHalaman === 0) doc.addPage();

    gambarSatuKartu(
      doc,
      { x, y, width: cardWidth, height: cardHeight },
      {
        peserta,
        jenisUjian,
        tahunAjaran,
        nomorRuangan: peserta.nomorRuangan ?? nomorRuangan,
        kepsek,
        tanggalCetak,
      }
    );
  });

  // ---- Sisi belakang: jadwal ujian + kolom Paraf Pengawas -- CUMA kalau
  // jadwalnya udah diisi (tab "Jadwal Sesi"). idx===0 di sini SELALU
  // addPage (beda dari sisi depan) karena nyambung dari halaman depan
  // terakhir, bukan mulai dari halaman kosong.
  if (daftarJadwal && daftarJadwal.length > 0) {
    daftarPeserta.forEach((peserta, idx) => {
      const { posisiDiHalaman, x, y } = posisiKartu(idx);
      if (posisiDiHalaman === 0) doc.addPage();

      gambarHalamanJadwalKartu(
        doc,
        { x, y, width: cardWidth, height: cardHeight },
        { peserta, jenisUjian, tahunAjaran, daftarJadwal }
      );
    });
  }

  // ---- Nama file: deteksi otomatis mode cetak dari isi daftarPeserta.
  // Kalau semua kartu ujung-ujungnya pakai nomor ruangan yang sama (mode
  // per ruangan, atau kebetulan 1 kelas cuma di 1 ruangan), nama file
  // tetep "Ruangan-X" kayak sebelumnya. Kalau beda-beda (mode per kelas,
  // 1 kelas kesebar ke beberapa ruangan), nama file pakai "Kelas-X".
  const ruanganTiapPeserta = daftarPeserta.map((p) => p.nomorRuangan ?? nomorRuangan);
  const semuaRuanganSama = ruanganTiapPeserta.every((r) => r === ruanganTiapPeserta[0]);

  let namaFile;
  if (semuaRuanganSama) {
    namaFile = `Kartu-Ujian-${jenisUjian}-Ruangan-${ruanganTiapPeserta[0]}.pdf`;
  } else {
    const kelasUnik = [...new Set(daftarPeserta.map((p) => p.kelas))];
    const labelKelas = kelasUnik.length === 1 ? kelasUnik[0] : "Gabungan";
    namaFile = `Kartu-Ujian-${jenisUjian}-Kelas-${labelKelas}.pdf`;
  }
  savePdf(doc, namaFile);
}

// ============================================================
// KARTU PENGAWAS -- format ID CARD/NAME TAG buat digantung pakai
// lanyard (BUKAN lagi kartu A4 lebar isi tabel jadwal lengkap).
// Ukuran 9 x 13 cm portrait, 4 kartu per halaman A4 (grid 2x2,
// dikasih garis potong di tiap kartu). 2 sisi:
// - Sisi depan: identitas guru (badge jabatan, nama, mapel) yang
//   otomatis di-center secara vertikal. REVISI Sep 2026 (2): blok tanda
//   tangan kepala sekolah DIHAPUS dari sisi depan.
// - Sisi belakang: tabel rekap jadwal mengawas. REVISI Sep 2026 (2): sel
//   "Hari / Tanggal" digabung (merge) tiap hari, jadi sesi ke-2 di hari
//   yang sama gak makan baris/tempat sendiri. Garis footer di sisi
//   belakang dihapus (garis footer cuma ada di sisi depan).
// ============================================================

const LANYARD_LEBAR = 90; // mm (9 cm)
const LANYARD_TINGGI = 130; // mm (13 cm)
const LANYARD_KOLOM = 2;
const LANYARD_BARIS = 2;
const LANYARD_PER_HALAMAN = LANYARD_KOLOM * LANYARD_BARIS;
const LANYARD_GUTTER = 5; // mm, jarak antar kartu buat garis gunting

const PT_KE_MM = 0.3528; // 1 pt = 0.3528 mm

/**
 * Hitung posisi baseline (y) supaya teks berukuran `fontSize` pt kelihatan
 * pas di TENGAH secara vertikal terhadap `pusatY` (mm). jsPDF nulis teks
 * dari baseline (bukan dari tengah), jadi tanpa ini teks selalu keliatan
 * agak ke atas dari tengah sel.
 */
function baselineTengah(pusatY, fontSize) {
  return pusatY + fontSize * PT_KE_MM * 0.35;
}

/**
 * Garis pemisah ganda (1 tebal + 1 tipis) -- dipakai di bawah header &
 * di footer kartu pengawas biar sisi depan & belakang punya "bingkai"
 * yang konsisten.
 * @param {boolean} tebalDiAtas - true: tebal di atas tipis (header),
 *   false: tipis di atas tebal (footer, jadi simetris).
 * @returns {number} y paling bawah dari garis ganda ini
 */
function gambarGarisGanda(doc, xKiri, xKanan, y, tebalDiAtas = true) {
  const jarak = 1.1;
  const yTebal = tebalDiAtas ? y : y + jarak;
  const yTipis = tebalDiAtas ? y + jarak : y;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(xKiri, yTebal, xKanan, yTebal);
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.15);
  doc.line(xKiri, yTipis, xKanan, yTipis);
  return y + jarak;
}

/**
 * Sisi DEPAN kartu pengawas -- header sekolah, lalu blok identitas
 * (badge "PENGAWAS UJIAN", nama guru, mapel) yang ditaruh di TENGAH ruang
 * kosong antara header & footer. Tinggi blok dihitung dari isi yang
 * SEBENARNYA (nama 1 baris vs 2 baris, mapel 1 vs 2 baris), dan font nama
 * otomatis mengecil kalau namanya panjang (maks 2 baris), jadi posisinya
 * selalu seimbang, gak ada lagi area kosong yang timpang.
 *
 * REVISI Sep 2026 (2): blok tanda tangan kepala sekolah dihapus (param
 * `kepsek` & `tanggalCetak` ikut dibuang dari fungsi ini).
 */
function gambarSatuKartuPengawas(doc, { x, y, width, height }, { guru, jenisUjian, tahunAjaran }) {
  // Border kartu (garis potong)
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.2);
  doc.rect(x, y, width, height);

  const padding = 6;
  const innerLeft = x + padding;
  const innerRight = x + width - padding;
  const innerWidth = innerRight - innerLeft;
  const centerX = x + width / 2;

  // ---- Header sekolah -- polos (hitam di atas putih), gaya & ukuran
  // font disamain sama kartu peserta (gambarSatuKartu) ----
  doc.setTextColor(0, 0, 0);
  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.setFontSize(8.5);
  let cy = y + padding + 3;
  doc.text(SCHOOL_NAME, centerX, cy, { align: "center", maxWidth: innerWidth });
  cy += 3.8;

  doc.setFontSize(6.5);
  doc.text(JUDUL_UJIAN[jenisUjian] || jenisUjian, centerX, cy, {
    align: "center",
    maxWidth: innerWidth,
  });
  cy += 3.4;

  doc.setFont(PDF_FONT_FAMILY, "normal");
  doc.text(`Tahun Ajaran ${tahunAjaran}`, centerX, cy, { align: "center" });
  cy += 3.5;

  const headerBawah = gambarGarisGanda(doc, innerLeft, innerRight, cy);

  // ---- Footer: garis ganda versi terbalik (simetris sama header) ----
  const footerAtas = y + height - padding - 1.1;
  gambarGarisGanda(doc, innerLeft, innerRight, footerAtas, false);

  // ============================================================
  // BLOK IDENTITAS -- ukur dulu semua elemen, baru di-center.
  // ============================================================

  // Badge jabatan (kotak rounded, lebarnya ngikutin teks)
  const teksJabatan = "PENGAWAS UJIAN";
  const fsJabatan = 10;
  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.setFontSize(fsJabatan);
  const lebarBadge = doc.getTextWidth(teksJabatan) + 14;
  const tinggiBadge = 8.5;

  // Nama guru: pakai font terbesar yang masih muat maksimal 2 baris.
  const kandidatFontNama = [12, 11, 10, 9, 8];
  let fsNama = kandidatFontNama[kandidatFontNama.length - 1];
  let barisNama = [];
  doc.setFont(PDF_FONT_FAMILY, "bold");
  for (const fs of kandidatFontNama) {
    doc.setFontSize(fs);
    const hasil = doc.splitTextToSize(String(guru.nama || "-"), innerWidth);
    if (hasil.length <= 2 || fs === kandidatFontNama[kandidatFontNama.length - 1]) {
      fsNama = fs;
      barisNama = hasil;
      break;
    }
  }
  const tinggiBarisNama = fsNama * PT_KE_MM * 1.25;
  const tinggiNama = barisNama.length * tinggiBarisNama;

  // Mapel (guru 2 mapel udah dipisah " & " dari kartuUjianSupabase.js)
  const fsMapel = 8.5;
  doc.setFont(PDF_FONT_FAMILY, "normal");
  doc.setFontSize(fsMapel);
  const barisMapel = doc.splitTextToSize(String(guru.mapel || "-"), innerWidth);
  const tinggiBarisMapel = fsMapel * PT_KE_MM * 1.4;
  const tinggiMapel = barisMapel.length * tinggiBarisMapel;

  const jarakBadgeKeNama = 10;
  const jarakNamaKeGaris = 5;
  const jarakGarisKeMapel = 4;
  const tinggiBlok =
    tinggiBadge +
    jarakBadgeKeNama +
    tinggiNama +
    jarakNamaKeGaris +
    jarakGarisKeMapel +
    tinggiMapel;

  // Center vertikal, digeser sedikit ke atas (45% bukan 50%) -- secara
  // visual konten yang pas-tengah matematis selalu keliatan agak turun.
  const sisaRuang = footerAtas - headerBawah - tinggiBlok;
  let by = headerBawah + Math.max(4, sisaRuang * 0.45);

  // ---- Badge "PENGAWAS UJIAN" ----
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.roundedRect(centerX - lebarBadge / 2, by, lebarBadge, tinggiBadge, 1.2, 1.2, "S");
  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.setFontSize(fsJabatan);
  doc.setTextColor(0, 0, 0);
  doc.text(teksJabatan, centerX, baselineTengah(by + tinggiBadge / 2, fsJabatan), {
    align: "center",
  });
  by += tinggiBadge + jarakBadgeKeNama;

  // ---- Nama guru (fokus utama kartu) ----
  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.setFontSize(fsNama);
  barisNama.forEach((baris, i) => {
    const pusatBaris = by + i * tinggiBarisNama + tinggiBarisNama / 2;
    doc.text(baris, centerX, baselineTengah(pusatBaris, fsNama), { align: "center" });
  });
  by += tinggiNama + jarakNamaKeGaris;

  // ---- Garis pendek pemisah nama vs mapel ----
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(centerX - 7, by, centerX + 7, by);
  by += jarakGarisKeMapel;

  // ---- Mapel (subordinat ke nama: lebih kecil & abu-abu gelap) ----
  doc.setFont(PDF_FONT_FAMILY, "normal");
  doc.setFontSize(fsMapel);
  doc.setTextColor(90, 90, 90);
  barisMapel.forEach((baris, i) => {
    const pusatBaris = by + i * tinggiBarisMapel + tinggiBarisMapel / 2;
    doc.text(baris, centerX, baselineTengah(pusatBaris, fsMapel), { align: "center" });
  });
  doc.setTextColor(0, 0, 0);
}

/**
 * Format tanggal "YYYY-MM-DD" jadi { hari: "Selasa", tanggal: "15-09-2026" }
 * -- dipisah 2 bagian karena di kartu pengawas keduanya ditulis 2 baris
 * di dalam 1 sel gabungan (nama hari di atas, tanggal di bawah).
 */
function formatHariDanTanggal(tanggal) {
  if (!tanggal) return { hari: "-", tanggal: "" };
  const [tahun, bulan, hari] = tanggal.split("-").map(Number);
  const tgl = new Date(tahun, bulan - 1, hari);
  return {
    hari: tgl.toLocaleDateString("id-ID", { weekday: "long" }),
    tanggal: `${String(hari).padStart(2, "0")}-${String(bulan).padStart(2, "0")}-${tahun}`,
  };
}

/**
 * Sisi BELAKANG kartu pengawas -- tabel rekap semua sesi & ruangan yang
 * dipegang guru ini selama ujian.
 *
 * REVISI Sep 2026 (2):
 * - Sel "Hari / Tanggal" DIGABUNG (rowspan) untuk semua sesi di tanggal
 *   yang sama -- isinya nama hari (tebal) + tanggal di bawahnya, di tengah
 *   sel gabungan. Sebelumnya tiap sesi punya sel sendiri yang dikosongin,
 *   jadi keliatan kayak tabel bolong.
 * - Lebar kolom dirapiin (Ruang dulu cuma ~8mm, sekarang 16mm) & semua
 *   isi sel di-center.
 * - Tinggi baris DINAMIS: dibagi rata ke sisa ruang, tapi dibatasi
 *   min 7mm / maks 11mm biar gak kegedean kalau sesinya sedikit.
 * - Kolom Paraf tetap tidak ada (gak perlu tanda tangan per sesi).
 */
function gambarHalamanJadwalPengawas(
  doc,
  { x, y, width, height },
  { guru, jenisUjian, tahunAjaran }
) {
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.2);
  doc.rect(x, y, width, height);

  const padding = 6;
  const innerLeft = x + padding;
  const innerRight = x + width - padding;
  const innerWidth = innerRight - innerLeft;
  const centerX = x + width / 2;

  // ---- Header -- gaya disamain sama sisi depan. Nama guru tetap
  // ditulis lagi di sini (kartu udah kepisah dari sisi depan pas dicetak
  // duplex, jadi nama perlu ada biar gak ketuker) ----
  doc.setTextColor(0, 0, 0);
  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.setFontSize(8.5);
  let cy = y + padding + 3;
  doc.text("JADWAL MENGAWAS", centerX, cy, { align: "center", maxWidth: innerWidth });
  cy += 3.8;

  doc.setFont(PDF_FONT_FAMILY, "normal");
  doc.setFontSize(6);
  doc.text(`${JUDUL_UJIAN[jenisUjian] || jenisUjian} \u2014 T.A. ${tahunAjaran}`, centerX, cy, {
    align: "center",
    maxWidth: innerWidth,
  });
  cy += 4.2;

  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.setFontSize(7.5);
  const barisNamaGuru = doc.splitTextToSize(String(guru.nama || "-"), innerWidth);
  const lhNamaGuru = 3.4;
  barisNamaGuru.forEach((baris, i) => {
    doc.text(baris, centerX, cy + i * lhNamaGuru, { align: "center" });
  });
  cy += (barisNamaGuru.length - 1) * lhNamaGuru + 3.2;

  const headerBawah = gambarGarisGanda(doc, innerLeft, innerRight, cy);

  // (Sisi belakang SENGAJA tanpa garis footer -- dihapus revisi Sep 2026,
  // garis footer cuma ada di sisi depan.)

  const sesiList = guru.sesi || []; // udah keurut dari ambilJadwalPengawasPerGuru()

  if (sesiList.length === 0) {
    doc.setFont(PDF_FONT_FAMILY, "normal");
    doc.setFontSize(7);
    doc.text("Belum ada jadwal mengawas.", centerX, headerBawah + 10, { align: "center" });
    return;
  }

  // ---- Kelompokkan sesi per tanggal (berurutan) -- 1 kelompok = 1 sel
  // "Hari / Tanggal" gabungan ----
  const kelompokHari = [];
  sesiList.forEach((sesi) => {
    const terakhir = kelompokHari[kelompokHari.length - 1];
    if (terakhir && terakhir.tanggal === sesi.tanggal) terakhir.sesi.push(sesi);
    else kelompokHari.push({ tanggal: sesi.tanggal, sesi: [sesi] });
  });

  // ---- Kolom tabel: Hari / Tanggal, Sesi, Waktu, Ruang ----
  const kolom = { hari: 28, sesi: 12, waktu: 22 };
  kolom.ruang = innerWidth - kolom.hari - kolom.sesi - kolom.waktu;
  const colX = {
    hari: innerLeft,
    sesi: innerLeft + kolom.hari,
    waktu: innerLeft + kolom.hari + kolom.sesi,
    ruang: innerLeft + kolom.hari + kolom.sesi + kolom.waktu,
  };

  // ---- Ukuran baris dinamis ----
  const tinggiHeaderTabel = 7;
  const footerReserved = padding; // sisa ruang bawah kartu (garis footer udah dihapus)
  const tabelAtas = headerBawah + 5;
  const sisaTinggi = y + height - footerReserved - tabelAtas - tinggiHeaderTabel;
  const tinggiBaris = Math.min(11, Math.max(7, sisaTinggi / sesiList.length));
  const fontSizeIsi = tinggiBaris >= 9 ? 7.5 : 7;

  // ---- Header tabel (latar abu-abu muda, teks di tengah) ----
  cy = tabelAtas;
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.15);
  doc.setFillColor(235, 235, 235);
  doc.rect(innerLeft, cy, innerWidth, tinggiHeaderTabel, "FD");
  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.setFontSize(6.3);
  doc.setTextColor(0, 0, 0);
  const yLabelHeader = baselineTengah(cy + tinggiHeaderTabel / 2, 6.3);
  doc.text("Hari / Tanggal", colX.hari + kolom.hari / 2, yLabelHeader, { align: "center" });
  doc.text("Sesi", colX.sesi + kolom.sesi / 2, yLabelHeader, { align: "center" });
  doc.text("Waktu", colX.waktu + kolom.waktu / 2, yLabelHeader, { align: "center" });
  doc.text("Ruang", colX.ruang + kolom.ruang / 2, yLabelHeader, { align: "center" });
  [colX.sesi, colX.waktu, colX.ruang].forEach((garisX) => {
    doc.line(garisX, cy, garisX, cy + tinggiHeaderTabel);
  });
  cy += tinggiHeaderTabel;
  const isiTabelAtas = cy;

  // ---- Baris data, per kelompok hari ----
  kelompokHari.forEach((kelompok) => {
    const tinggiKelompok = kelompok.sesi.length * tinggiBaris;

    // Sel Hari / Tanggal GABUNGAN: 1 kotak setinggi semua sesi hari itu,
    // isi (hari + tanggal) di tengah-tengahnya.
    doc.setDrawColor(...PDF_COLORS.border);
    doc.setLineWidth(0.15);
    doc.rect(colX.hari, cy, kolom.hari, tinggiKelompok, "S");

    const { hari, tanggal } = formatHariDanTanggal(kelompok.tanggal);
    const pusatKelompok = cy + tinggiKelompok / 2;
    const jarakDuaBaris = 3.4;
    const fsTanggal = fontSizeIsi - 0.7;
    doc.setFont(PDF_FONT_FAMILY, "bold");
    doc.setFontSize(fontSizeIsi);
    doc.text(
      hari,
      colX.hari + kolom.hari / 2,
      baselineTengah(pusatKelompok - jarakDuaBaris / 2, fontSizeIsi),
      { align: "center" }
    );
    doc.setFont(PDF_FONT_FAMILY, "normal");
    doc.setFontSize(fsTanggal);
    doc.text(
      tanggal,
      colX.hari + kolom.hari / 2,
      baselineTengah(pusatKelompok + jarakDuaBaris / 2, fsTanggal),
      { align: "center" }
    );

    // Kolom Sesi / Waktu / Ruang -- 1 baris per sesi
    kelompok.sesi.forEach((sesi, i) => {
      const barisY = cy + i * tinggiBaris;
      const yTeks = baselineTengah(barisY + tinggiBaris / 2, fontSizeIsi);

      doc.setDrawColor(...PDF_COLORS.border);
      doc.setLineWidth(0.15);
      doc.rect(colX.sesi, barisY, innerWidth - kolom.hari, tinggiBaris, "S");
      [colX.waktu, colX.ruang].forEach((garisX) => {
        doc.line(garisX, barisY, garisX, barisY + tinggiBaris);
      });

      doc.setFont(PDF_FONT_FAMILY, "normal");
      doc.setFontSize(fontSizeIsi);
      doc.text(String(sesi.sesi_ke ?? "-"), colX.sesi + kolom.sesi / 2, yTeks, {
        align: "center",
      });
      const waktu =
        sesi.waktu_mulai && sesi.waktu_selesai ? `${sesi.waktu_mulai}-${sesi.waktu_selesai}` : "-";
      doc.text(waktu, colX.waktu + kolom.waktu / 2, yTeks, { align: "center" });

      doc.setFont(PDF_FONT_FAMILY, "bold");
      doc.text(formatNomorRuangan(sesi.nomor_ruangan), colX.ruang + kolom.ruang / 2, yTeks, {
        align: "center",
      });
    });

    cy += tinggiKelompok;
  });

  // ---- Bingkai luar tabel dipertebal dikit biar tegas ----
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);
  doc.rect(innerLeft, tabelAtas, innerWidth, cy - tabelAtas, "S");
  // garis bawah header tabel
  doc.setLineWidth(0.35);
  doc.line(innerLeft, isiTabelAtas, innerRight, isiTabelAtas);
  doc.setFont(PDF_FONT_FAMILY, "normal");
  doc.setTextColor(0, 0, 0);
}

/**
 * Generate & langsung download PDF kartu pengawas -- 1 PDF berisi name
 * tag/ID card SEMUA guru yang kebagian jadwal ngawas di ujian ini,
 * ukuran 9x13 cm (lanyard), grid 2x2 = 4 kartu per halaman A4, dikasih
 * garis potong di tiap kartu.
 *
 * @param {Object} opts
 * @param {Array} opts.daftarGuruJadwal - dari ambilJadwalPengawasPerGuru(): [{guru_id, nama, mapel, sesi:[...]}]
 * @param {string} opts.jenisUjian
 * @param {string} opts.tahunAjaran
 *
 * (`kepsek` gak dipakai lagi sejak blok tanda tangan di sisi depan
 * dihapus -- kalau pemanggil masih ngirim `kepsek`, aman, diabaikan.)
 */
function generateKartuPengawasPdf({ daftarGuruJadwal, jenisUjian, tahunAjaran }) {
  if (!daftarGuruJadwal || daftarGuruJadwal.length === 0) {
    throw new Error("Belum ada guru yang punya jadwal mengawas");
  }

  const doc = createPdfDocument({ orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Grid kartu di-center ke halaman A4, bukan nempel ke MARGIN tetap --
  // karena ukuran kartu sekarang fixed (9x13cm), sisa ruang di halaman
  // dibagi rata jadi margin kiri-kanan/atas-bawah.
  const totalLebarGrid = LANYARD_KOLOM * LANYARD_LEBAR + (LANYARD_KOLOM - 1) * LANYARD_GUTTER;
  const totalTinggiGrid = LANYARD_BARIS * LANYARD_TINGGI + (LANYARD_BARIS - 1) * LANYARD_GUTTER;
  const marginX = (pageWidth - totalLebarGrid) / 2;
  const marginY = (pageHeight - totalTinggiGrid) / 2;

  // Posisi kartu ke-idx di grid -- dipakai BARENG buat sisi depan & sisi
  // belakang (pola sama kayak posisiKartu() di generateKartuPesertaPdf()),
  // biar kalau dicetak duplex, sisi belakang guru yang sama nyambung
  // persis di baliknya sisi depan.
  const posisiKartu = (idx) => {
    const posisiDiHalaman = idx % LANYARD_PER_HALAMAN;
    const kolom = posisiDiHalaman % LANYARD_KOLOM;
    const baris = Math.floor(posisiDiHalaman / LANYARD_KOLOM);
    return {
      posisiDiHalaman,
      x: marginX + kolom * (LANYARD_LEBAR + LANYARD_GUTTER),
      y: marginY + baris * (LANYARD_TINGGI + LANYARD_GUTTER),
    };
  };

  // ---- Sisi depan: identitas ringkas tiap guru ----
  daftarGuruJadwal.forEach((guru, idx) => {
    const { posisiDiHalaman, x, y } = posisiKartu(idx);
    if (idx > 0 && posisiDiHalaman === 0) doc.addPage();

    gambarSatuKartuPengawas(
      doc,
      { x, y, width: LANYARD_LEBAR, height: LANYARD_TINGGI },
      { guru, jenisUjian, tahunAjaran }
    );
  });

  // ---- Sisi belakang: rekap jadwal mengawas -- SELALU dicetak (beda dari
  // kartu peserta yang skip kalau daftarJadwal kosong) karena tiap guru
  // yang masuk daftarGuruJadwal PASTI udah punya minimal 1 sesi (lihat
  // ambilJadwalPengawasPerGuru()). idx===0 di sini SELALU addPage
  // (nyambung dari halaman sisi depan terakhir, bukan mulai halaman baru
  // dari kosong).
  daftarGuruJadwal.forEach((guru, idx) => {
    const { posisiDiHalaman, x, y } = posisiKartu(idx);
    if (posisiDiHalaman === 0) doc.addPage();

    gambarHalamanJadwalPengawas(
      doc,
      { x, y, width: LANYARD_LEBAR, height: LANYARD_TINGGI },
      { guru, jenisUjian, tahunAjaran }
    );
  });

  const namaFile = `Kartu-Pengawas-${jenisUjian}.pdf`;
  savePdf(doc, namaFile);
}

export { generateKartuPesertaPdf, generateKartuPengawasPdf };
