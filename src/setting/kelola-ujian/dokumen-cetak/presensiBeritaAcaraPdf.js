// setting/kelola-ujian/presensiBeritaAcaraPdf.js
// Generator PDF untuk 2 dokumen fisik yang dicetak & diisi/ditandatangani
// MANUAL di kertas -- BUKAN form digital:
// 1. Daftar Hadir  -- tabel peserta + kolom tanda tangan kosong. SELALU 1
//    HALAMAN per ruangan: font & tinggi baris tabel otomatis mengecil
//    sesuai jumlah peserta (mirip pola di daftarPesertaPdfExport.js),
//    bukan ukuran tetap yang bisa meluber ke halaman ke-2.
// 2. Berita Acara  -- form isian (jumlah hadir, catatan kejadian, TTD
//    pengawas). Mapel/tanggal/sesi/ruang & jumlah peserta terdaftar
//    otomatis terisi, sisanya (termasuk NAMA PENGAWAS) sengaja
//    dikosongkan -- penugasan pengawas di "Jadwal & Pengawas" kadang
//    nggak sesuai kenyataan di lapangan, jadi lebih aman ditulis tangan
//    langsung saat ujian berlangsung daripada auto-fill yang belum tentu benar.
//
// Satu ruangan = satu halaman, konsisten dengan pola di
// daftarPesertaPdfExport.js & kartuUjianPdf.js.

import autoTable from "jspdf-autotable";
import {
  createPdfDocument,
  addLetterhead,
  tableTheme,
  savePdf,
  guardHasData,
  PDF_COLORS,
  PDF_FONT_FAMILY,
} from "../../../utils/pdfExportKit";

// Sama seperti file lain di sub-fitur ini -- sengaja diduplikasi, bukan
// di-import, biar tiap file bebas berkembang sendiri-sendiri.
const JUDUL_UJIAN = {
  PSAS: "PENILAIAN SUMATIF AKHIR SEMESTER GANJIL",
  PSAT: "PENILAIAN SUMATIF AKHIR TAHUN",
  PSAJ: "PENILAIAN SUMATIF AKHIR JENJANG",
};

// Selalu 2 slot tanda tangan pengawas -- praktik umum sekolah (pengawas
// utama + pendamping). Namanya SENGAJA dikosongkan (lihat catatan di
// atas), jadi jumlah ini nggak bergantung ke data ujian_pengawas sama
// sekali -- tinggal dicoret manual di kertas kalau 1 ruangan cuma butuh 1.
const JUMLAH_SLOT_PENGAWAS = 2;

const labelRuang = (nomor) => `RUANG ${String(nomor).padStart(2, "0")}`;

/** "2026-09-15" -> "Selasa, 15-09-2026". Duplikat dari helper yang sama di JadwalPengawasTab.js. */
function formatHariTanggal(tanggal) {
  if (!tanggal) return "-";
  const [tahun, bulan, hari] = tanggal.split("-").map(Number);
  const tgl = new Date(tahun, bulan - 1, hari);
  const namaHari = tgl.toLocaleDateString("id-ID", { weekday: "long" });
  const tanggalFormat = `${String(hari).padStart(2, "0")}-${String(bulan).padStart(2, "0")}-${tahun}`;
  return `${namaHari}, ${tanggalFormat}`;
}

function formatWaktuJadwal(jadwal) {
  return jadwal.waktu_mulai && jadwal.waktu_selesai
    ? `${jadwal.waktu_mulai} - ${jadwal.waktu_selesai}`
    : "-";
}

/**
 * Gambar blok tanda tangan pengawas -- JUMLAH_SLOT_PENGAWAS kolom,
 * semua namanya dikosongkan (garis titik-titik), apapun data pengawas
 * yang sebenarnya tercatat di sistem.
 * @returns {number} tinggi blok yang dipakai (mm), buat caller yang perlu tau
 */
function gambarTandaTanganPengawas(doc, y) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const kolomWidth = (pageWidth - margin * 2) / JUMLAH_SLOT_PENGAWAS;

  doc.setFont(PDF_FONT_FAMILY, "normal");
  doc.setFontSize(9);
  for (let i = 0; i < JUMLAH_SLOT_PENGAWAS; i++) {
    const cx = margin + kolomWidth * i + kolomWidth / 2;
    doc.text(`Pengawas Ruang ${i + 1}`, cx, y, { align: "center" });
    doc.setDrawColor(...PDF_COLORS.border);
    doc.setLineWidth(0.2);
    doc.line(cx - 30, y + 13, cx + 30, y + 13);
    doc.text("(.....................)", cx, y + 18, { align: "center" });
  }
  return 18;
}

// ============================================================
// DAFTAR HADIR -- tabel peserta + kolom tanda tangan kosong,
// DIJAMIN 1 HALAMAN per ruangan
// ============================================================

const MARGIN_TABEL = 15; // sama dengan margin default tableTheme()
const BATAS_BAWAH_HALAMAN = 12;
const TINGGI_FOOTER_TTD = 26; // ruang dicadangkan buat blok tanda tangan pengawas

/** Estimasi tinggi 1 baris tabel (mm) dari fontSize (pt) & cellPadding (mm). */
function estimasiTinggiBaris(fontSize, cellPadding) {
  return fontSize * 0.3528 * 1.15 + cellPadding * 2;
}

/**
 * Hitung fontSize & cellPadding tabel biar peserta + header tabel + blok
 * tanda tangan pengawas PASTI muat dalam 1 halaman, berapa pun jumlah
 * peserta di ruangan itu (ruangan isi 40 tetap 1 halaman, bukan 2).
 * TERUJI muat pas untuk kapasitas standar (40 siswa PSAS/PSAT, 20 PSAJ).
 * Kalau kapasitas ruangan dinaikkan manual jauh di atas itu (>~42),
 * font/padding sudah mentok di batas minimum yang masih kebaca -- pada
 * titik itu autoTable akan lanjut ke halaman berikutnya sebagai fallback
 * aman (bukan teks kepotong), sama seperti pola di daftarPesertaPdfExport.js.
 */
function hitungUkuranTabelDaftarHadir(doc, y, jumlahBaris) {
  const tinggiHalaman = doc.internal.pageSize.getHeight();
  const sisaTinggi = tinggiHalaman - BATAS_BAWAH_HALAMAN - TINGGI_FOOTER_TTD - y;
  const totalBaris = jumlahBaris + 1; // +1 baris header tabel

  const FONT_DEFAULT = 9;
  const PADDING_DEFAULT = 2.2;
  const tinggiDefault = estimasiTinggiBaris(FONT_DEFAULT, PADDING_DEFAULT) * totalBaris;

  if (tinggiDefault <= sisaTinggi) {
    return { fontSize: FONT_DEFAULT, cellPadding: PADDING_DEFAULT };
  }

  const skala = sisaTinggi / tinggiDefault;
  return {
    fontSize: Math.max(5.5, FONT_DEFAULT * skala),
    cellPadding: Math.max(0.6, PADDING_DEFAULT * skala),
  };
}

/**
 * @param {Object} params
 * @param {Array} params.daftarRuanganData - [{ nomor_ruangan, daftarPeserta: [{no_peserta,nama,nis,kelas}] }]
 * @param {Object} params.jadwal - { tanggal, sesi_ke, waktu_mulai, waktu_selesai, mata_pelajaran }
 * @param {string} params.jenisUjian - "PSAS" | "PSAT" | "PSAJ"
 * @param {string} params.tahunAjaran
 * @param {Function} [params.showToast]
 */
export function generateDaftarHadirPdf({
  daftarRuanganData,
  jadwal,
  jenisUjian,
  tahunAjaran,
  showToast,
}) {
  if (
    !guardHasData(daftarRuanganData, {
      showToast,
      message: "Belum ada ruangan/peserta untuk dicetak.",
    })
  ) {
    return;
  }

  const judul = JUDUL_UJIAN[jenisUjian] || jenisUjian;
  const doc = createPdfDocument({ orientation: "portrait" });
  const waktu = formatWaktuJadwal(jadwal);

  daftarRuanganData.forEach((r, index) => {
    if (index > 0) doc.addPage();

    // Header dipadetin jadi 2 baris subtitle aja (bukan 4) -- setiap mm
    // yang dihemat di sini nambah ruang buat baris tabel, penting biar
    // ruangan berkapasitas penuh tetap muat 1 halaman.
    const y = addLetterhead(doc, {
      title: `DAFTAR HADIR ${judul}`,
      subtitleLines: [
        `${jadwal.mata_pelajaran || "-"}  |  Sesi ${jadwal.sesi_ke}  |  ${waktu}`,
        `${formatHariTanggal(jadwal.tanggal)}  |  TA ${tahunAjaran || "-"}  |  ${labelRuang(
          r.nomor_ruangan
        )}`,
      ],
      withDivider: false,
    });

    const { fontSize, cellPadding } = hitungUkuranTabelDaftarHadir(doc, y, r.daftarPeserta.length);

    autoTable(doc, {
      ...tableTheme(y, { fontSize, styles: { cellPadding } }),
      head: [["No", "No. Peserta", "Nama Peserta", "Asal Kelas", "Tanda Tangan"]],
      body: r.daftarPeserta.map((p, idx) => [idx + 1, p.no_peserta || "-", p.nama, p.kelas, ""]),
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 26, halign: "center" },
        2: { cellWidth: "auto" },
        3: { cellWidth: 24, halign: "center" },
        4: { cellWidth: 40 },
      },
    });

    // Blok tanda tangan pengawas -- posisinya sudah dijamin muat karena
    // TINGGI_FOOTER_TTD sudah dicadangkan sejak hitung ukuran tabel di atas.
    gambarTandaTanganPengawas(doc, doc.lastAutoTable.finalY + 8);
  });

  const namaFile =
    `Daftar-Hadir-${jenisUjian}-${jadwal.mata_pelajaran || "Ujian"}-Sesi${jadwal.sesi_ke}.pdf`.replace(
      /\s+/g,
      "-"
    );
  savePdf(doc, namaFile);
  showToast?.(`Daftar hadir ${daftarRuanganData.length} ruangan berhasil dicetak`, "success");
}

// ============================================================
// BERITA ACARA -- form isian, sebagian auto-fill sebagian kosong
// ============================================================

/**
 * Tulis 1 baris "Label : nilai" pada form, dipakai buat baris info yang
 * SUDAH otomatis terisi (mapel, tanggal, ruang, jumlah peserta terdaftar).
 */
function tulisBarisInfo(doc, x, y, labelWidth, label, value) {
  doc.setFont(PDF_FONT_FAMILY, "normal");
  doc.text(label, x, y);
  doc.text(":", x + labelWidth, y);
  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.text(String(value ?? "-"), x + labelWidth + 3, y);
}

/**
 * Tulis 1 baris "Label : ______________" -- garis kosong buat DITULIS
 * TANGAN manual (jumlah hadir, jumlah tidak hadir).
 */
function tulisBarisKosong(doc, x, y, labelWidth, garisWidth, label, satuan = "") {
  doc.setFont(PDF_FONT_FAMILY, "normal");
  doc.text(label, x, y);
  doc.text(":", x + labelWidth, y);
  const garisX = x + labelWidth + 3;
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.2);
  doc.line(garisX, y + 0.5, garisX + garisWidth, y + 0.5);
  if (satuan) doc.text(satuan, garisX + garisWidth + 2, y);
}

/**
 * @param {Object} params
 * @param {Array} params.daftarRuanganData - [{ nomor_ruangan, daftarPeserta }]
 * @param {Object} params.jadwal
 * @param {string} params.jenisUjian
 * @param {string} params.tahunAjaran
 * @param {Function} [params.showToast]
 */
export function generateBeritaAcaraPdf({
  daftarRuanganData,
  jadwal,
  jenisUjian,
  tahunAjaran,
  showToast,
}) {
  if (
    !guardHasData(daftarRuanganData, {
      showToast,
      message: "Belum ada ruangan untuk dicetak.",
    })
  ) {
    return;
  }

  const judul = JUDUL_UJIAN[jenisUjian] || jenisUjian;
  const doc = createPdfDocument({ orientation: "portrait" });
  const margin = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const tanggalCetak = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  daftarRuanganData.forEach((r, index) => {
    if (index > 0) doc.addPage();

    let y = addLetterhead(doc, {
      title: "BERITA ACARA PELAKSANAAN UJIAN",
      subtitleLines: [judul, tahunAjaran ? `TAHUN AJARAN ${tahunAjaran}` : null].filter(Boolean),
    });

    y += 3;
    const labelWidth = 42;
    doc.setFontSize(10);

    // ---- Info sesi (otomatis terisi) ----
    tulisBarisInfo(doc, margin, y, labelWidth, "Mata Pelajaran", jadwal.mata_pelajaran || "-");
    y += 6;
    tulisBarisInfo(doc, margin, y, labelWidth, "Hari / Tanggal", formatHariTanggal(jadwal.tanggal));
    y += 6;
    tulisBarisInfo(
      doc,
      margin,
      y,
      labelWidth,
      "Sesi / Waktu",
      `Sesi ${jadwal.sesi_ke} (${formatWaktuJadwal(jadwal)})`
    );
    y += 6;
    tulisBarisInfo(doc, margin, y, labelWidth, "Ruang", labelRuang(r.nomor_ruangan));
    y += 6;
    tulisBarisInfo(
      doc,
      margin,
      y,
      labelWidth,
      "Jumlah Peserta Terdaftar",
      `${r.daftarPeserta.length} orang`
    );
    y += 10;

    // ---- Garis pemisah ----
    doc.setDrawColor(...PDF_COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // ---- Jumlah hadir/tidak hadir (KOSONG, ditulis tangan) ----
    const garisWidth = 25;
    tulisBarisKosong(doc, margin, y, labelWidth, garisWidth, "Jumlah Peserta Hadir", "orang");
    y += 8;
    tulisBarisKosong(doc, margin, y, labelWidth, garisWidth, "Jumlah Peserta Tidak Hadir", "orang");
    y += 12;

    // ---- Catatan kejadian (beberapa baris garis kosong) ----
    doc.setFont(PDF_FONT_FAMILY, "bold");
    doc.text("Catatan Kejadian Selama Ujian Berlangsung:", margin, y);
    y += 6;
    doc.setFont(PDF_FONT_FAMILY, "normal");
    const jumlahBarisCatatan = 5;
    for (let i = 0; i < jumlahBarisCatatan; i++) {
      doc.setDrawColor(...PDF_COLORS.border);
      doc.setLineWidth(0.2);
      doc.line(margin, y, pageWidth - margin, y);
      y += 7;
    }
    y += 5;

    // ---- Penutup + tanda tangan (nama pengawas dikosongkan, lihat catatan atas file) ----
    doc.setFont(PDF_FONT_FAMILY, "normal");
    doc.setFontSize(9.5);
    doc.text("Demikian berita acara ini dibuat dengan sebenar-benarnya.", margin, y);
    y += 12;

    doc.text(`Cililin, ${tanggalCetak}`, pageWidth - margin, y, { align: "right" });
    y += 8;

    gambarTandaTanganPengawas(doc, y);
  });

  const namaFile =
    `Berita-Acara-${jenisUjian}-${jadwal.mata_pelajaran || "Ujian"}-Sesi${jadwal.sesi_ke}.pdf`.replace(
      /\s+/g,
      "-"
    );
  savePdf(doc, namaFile);
  showToast?.(`Berita acara ${daftarRuanganData.length} ruangan berhasil dicetak`, "success");
}
