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
 * -- niru format di kartu kertas lama. Beda sama formatHariTanggalSingkat()
 * di bawah (punya Kartu Pengawas) yang makai nama hari singkat "Sen" --
 * kartu ini punya lebih banyak ruang jadi nama hari lengkap masih muat.
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
// dikasih garis potong + lingkaran penanda lubang lanyard di atas).
// Rekap jadwal tetap ditampilkan tapi diringkas jadi list 2-baris
// per sesi (bukan tabel 5 kolom) biar muat di kartu sempit.
// ============================================================

const LANYARD_LEBAR = 90; // mm (9 cm)
const LANYARD_TINGGI = 130; // mm (13 cm)
const LANYARD_KOLOM = 2;
const LANYARD_BARIS = 2;
const LANYARD_PER_HALAMAN = LANYARD_KOLOM * LANYARD_BARIS;
const LANYARD_GUTTER = 5; // mm, jarak antar kartu buat garis gunting

function gambarSatuKartuPengawas(
  doc,
  { x, y, width, height },
  { guru, jenisUjian, tahunAjaran, kepsek, tanggalCetak }
) {
  // Border kartu (garis potong)
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.2);
  doc.rect(x, y, width, height);

  const padding = 6;
  const innerLeft = x + padding;
  const innerRight = x + width - padding;
  const innerWidth = innerRight - innerLeft;
  const centerX = x + width / 2;

  let cy = y + padding + 3;

  // ---- Header sekolah -- gaya & ukuran font disamain persis sama kartu
  // peserta (gambarSatuKartu) biar 2 dokumen ini kelihatan 1 keluarga/set,
  // bukan 2 desain lepas-lepas ----
  doc.setTextColor(0, 0, 0);
  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.setFontSize(8.5);
  doc.text(SCHOOL_NAME, centerX, cy, { align: "center", maxWidth: innerWidth });
  cy += 3.8;

  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.setFontSize(6.5);
  const judul = JUDUL_UJIAN[jenisUjian] || jenisUjian;
  doc.text(judul, centerX, cy, { align: "center", maxWidth: innerWidth });
  cy += 3.4;

  doc.setFont(PDF_FONT_FAMILY, "normal");
  doc.setFontSize(6.5);
  doc.text(`Tahun Ajaran ${tahunAjaran}`, centerX, cy, { align: "center" });
  cy += 4;

  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.15);
  doc.line(innerLeft, cy, innerRight, cy);
  cy += 6;

  // ---- Judul jabatan "PENGAWAS UJIAN" -- section title, bukan pasangan
  // label:value, jadi bukan dari tulisLabelValue. Ukuran gede (sama kayak
  // ukuran Nama guru sebelumnya) biar langsung kebaca dari jarak jauh ini
  // kartu pengawas siapa, bukan peserta ----
  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.setFontSize(12);
  doc.text("PENGAWAS UJIAN", centerX, cy, { align: "center" });
  cy += 7;

  // ---- Identitas: Nama & Mapel, format label:value rata kiri (pola sama
  // kayak identitas di kartu peserta) -- lebih gampang discan cepet
  // dibanding nama di-center gede kayak versi sebelumnya ----
  const labelOpts = {
    x: innerLeft,
    labelWidth: 16,
    maxWidth: innerWidth,
    lineHeight: 4.2,
  };
  doc.setFontSize(8);
  cy = tulisLabelValue(doc, { ...labelOpts, y: cy }, "Nama", guru.nama) + 1.8;
  cy = tulisLabelValue(doc, { ...labelOpts, y: cy }, "Mapel", guru.mapel) + 3;

  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.15);
  doc.line(innerLeft, cy, innerRight, cy);
  cy += 4;

  // ---- Ringkasan jadwal ngawas -- list, bukan tabel (kartu terlalu
  // sempit buat 5 kolom kayak versi A4 lama) ----
  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.setFontSize(7);
  doc.text("JADWAL MENGAWAS", innerLeft, cy);
  cy += 4;

  // Grup sesi per tanggal -- kalau 1 hari ada >1 sesi (kayak Sesi 1 pagi +
  // Sesi 2 siang), baris "Hari, Tanggal" cuma ditulis SEKALI di atas,
  // sesi-sesi di hari itu jadi sub-baris di bawahnya. SEBELUMNYA tanggal
  // ditulis ulang di tiap sesi -- mubazir & bikin daftar kepanjangan kalau
  // guru itu ngawas banyak sesi di hari yang sama.
  const grupTanggal = [];
  guru.sesi.forEach((s) => {
    const grupTerakhir = grupTanggal[grupTanggal.length - 1];
    if (grupTerakhir && grupTerakhir.tanggal === s.tanggal) {
      grupTerakhir.daftarSesi.push(s);
    } else {
      grupTanggal.push({ tanggal: s.tanggal, daftarSesi: [s] });
    }
  });

  // Tinggi baris fleksibel: sisa area dibagi rata ke SEMUA baris (baris
  // tanggal + baris sesi -- BUKAN cuma jumlah sesi lagi, karena sekarang
  // 1 sesi = 1 baris, bukan 2), dibatasi min 3.4mm dan max 5mm, dengan
  // ruang footer tanda tangan (~24mm) tetap disisakan di bawah.
  const footerReserved = 24;
  const sisaTinggi = y + height - padding - footerReserved - cy;
  const totalBaris = grupTanggal.length + guru.sesi.length || 1;
  const tinggiBaris = Math.min(5, Math.max(3.4, sisaTinggi / totalBaris));

  grupTanggal.forEach((grup) => {
    doc.setFont(PDF_FONT_FAMILY, "bold");
    doc.setFontSize(6.5);
    doc.text(formatHariTanggalSingkat(grup.tanggal), innerLeft, cy, { maxWidth: innerWidth });
    cy += tinggiBaris;

    grup.daftarSesi.forEach((s) => {
      const waktu = s.waktu_mulai && s.waktu_selesai ? `${s.waktu_mulai}-${s.waktu_selesai}` : "-";
      doc.setFont(PDF_FONT_FAMILY, "normal");
      doc.setFontSize(6.5);
      // Indent dikit (+3) biar keliatan ini sub-baris dari tanggal di
      // atasnya, bukan baris sejajar.
      doc.text(`Sesi ${s.sesi_ke}  ${waktu}  \u2014  Ruang ${s.nomor_ruangan}`, innerLeft + 3, cy, {
        maxWidth: innerWidth - 3,
      });
      cy += tinggiBaris;
    });
  });

  // ---- Tanda tangan kepala sekolah -- dipusatkan (kartu terlalu sempit
  // buat rata kiri kayak versi A4 lama) ----
  const ry0 = y + height - padding - 13;
  doc.setFont(PDF_FONT_FAMILY, "normal");
  doc.setFontSize(6.3);
  doc.text(`${kepsek.tempat}, ${tanggalCetak}`, centerX, ry0, { align: "center" });
  doc.text("Kepala Sekolah", centerX, ry0 + 3.2, { align: "center" });
  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.setFontSize(6.5);
  doc.text(kepsek.nama, centerX, ry0 + 3.2 + 8, { align: "center" });
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
 * Generate & langsung download PDF kartu pengawas -- 1 PDF berisi name
 * tag/ID card SEMUA guru yang kebagian jadwal ngawas di ujian ini,
 * ukuran 9x13 cm (lanyard), grid 2x2 = 4 kartu per halaman A4, dikasih
 * garis potong + penanda lubang lanyard di tiap kartu.
 *
 * @param {Object} opts
 * @param {Array} opts.daftarGuruJadwal - dari ambilJadwalPengawasPerGuru(): [{guru_id, nama, mapel, sesi:[...]}]
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

  // Grid kartu di-center ke halaman A4, bukan nempel ke MARGIN tetap --
  // karena ukuran kartu sekarang fixed (9x13cm), sisa ruang di halaman
  // dibagi rata jadi margin kiri-kanan/atas-bawah.
  const totalLebarGrid = LANYARD_KOLOM * LANYARD_LEBAR + (LANYARD_KOLOM - 1) * LANYARD_GUTTER;
  const totalTinggiGrid = LANYARD_BARIS * LANYARD_TINGGI + (LANYARD_BARIS - 1) * LANYARD_GUTTER;
  const marginX = (pageWidth - totalLebarGrid) / 2;
  const marginY = (pageHeight - totalTinggiGrid) / 2;

  const tanggalCetak = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  daftarGuruJadwal.forEach((guru, idx) => {
    const posisiDiHalaman = idx % LANYARD_PER_HALAMAN;
    if (idx > 0 && posisiDiHalaman === 0) doc.addPage();

    const kolom = posisiDiHalaman % LANYARD_KOLOM;
    const baris = Math.floor(posisiDiHalaman / LANYARD_KOLOM);
    const x = marginX + kolom * (LANYARD_LEBAR + LANYARD_GUTTER);
    const y = marginY + baris * (LANYARD_TINGGI + LANYARD_GUTTER);

    gambarSatuKartuPengawas(
      doc,
      { x, y, width: LANYARD_LEBAR, height: LANYARD_TINGGI },
      { guru, jenisUjian, tahunAjaran, kepsek, tanggalCetak }
    );
  });

  const namaFile = `Kartu-Pengawas-${jenisUjian}.pdf`;
  savePdf(doc, namaFile);
}

export { generateKartuPesertaPdf, generateKartuPengawasPdf };
