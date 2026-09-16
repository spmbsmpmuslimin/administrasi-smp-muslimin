// setting/kelola-ujian/daftarPesertaPdfExport.js
// Export "Daftar Peserta Ujian" per ruangan ke PDF -- versi PDF dari
// daftarPesertaExcelExport.js, buat kebutuhan yang emang minta format PDF
// (dikirim/diarsipkan sebagai PDF, bukan ditempel fisik kayak versi Excel).
//
// Sumber data & aturan nomor peserta SAMA PERSIS dengan versi Excel:
// - Sumbernya hasilLive dari PembagianRuanganTab (hasil terapkanQuotaManual)
//   -- ngikutin quota yang lagi keliatan di layar, BUKAN query ulang ke
//   peserta_ujian. Kalau admin baru ubah quota & belum klik "Simpan ke
//   Database", yang keexport tetap versi layar (disengaja, biar admin bisa
//   preview-cetak dulu sebelum commit ke DB).
// - Nomor peserta dihitung dari bangunPetaNoPeserta() atas SELURUH ruangan
//   (bukan cuma yang difilter/dicetak), jadi nomornya tetap urut lintas
//   ruangan walau yang dicetak cuma 1 ruangan -- lihat noPeserta.js.
// - Satu ruangan DIJAMIN jadi satu halaman: fontSize & cellPadding tabel
//   dihitung otomatis dari jumlah siswa di ruangan itu (lihat
//   hitungUkuranTabelMuatSatuHalaman di bawah), bukan ukuran tetap --
//   jadi nggak perlu atur ulang tata letak manual tiap kapasitas ruangan
//   beda-beda (dan nggak ada ruangan yang "nyambung" ke halaman berikutnya).
//
// Semua styling (letterhead, warna, tema tabel, save) numpang ke
// utils/pdfExportKit -- jangan bikin warna/font sendiri di file ini.

import autoTable from "jspdf-autotable";
import {
  createPdfDocument,
  addLetterhead,
  tableTheme,
  savePdf,
  guardHasData,
} from "../../../utils/pdfExportKit";
import { bangunPetaNoPeserta } from "./noPeserta";

// Sama persis dengan JUDUL_UJIAN di daftarPesertaExcelExport.js -- sengaja
// didup-likasi (bukan di-import) karena dua file ini boleh berkembang
// beda-beda ke depannya (mis. kalau nanti PDF butuh judul yang lebih ringkas).
const JUDUL_UJIAN = {
  PSAS: "PENILAIAN SUMATIF AKHIR SEMESTER GANJIL",
  PSAT: "PENILAIAN SUMATIF AKHIR TAHUN",
  PSAJ: "PENILAIAN SUMATIF AKHIR JENJANG",
};

// "RUANG 01", "RUANG 12" -- sama seperti versi Excel.
const labelRuang = (nomor) => `RUANG ${String(nomor).padStart(2, "0")}`;

// Margin bawah halaman (mm) -- disamakan dengan margin tabel default di
// tableTheme() (left/right: 15).
const BATAS_BAWAH_HALAMAN = 15;

// Estimasi tinggi 1 baris tabel (mm) dari fontSize (pt) & cellPadding (mm).
// Angka 0.3528 = konversi pt -> mm, 1.15 = faktor line-height jspdf-autotable.
function estimasiTinggiBaris(fontSize, cellPadding) {
  return fontSize * 0.3528 * 1.15 + cellPadding * 2;
}

/**
 * Hitung fontSize & cellPadding tabel biar SEMUA baris (+ 1 baris header)
 * pasti muat di sisa halaman (dari `y` sampai batas bawah) -- berapa pun
 * jumlah siswa di ruangan itu. Ini yang bikin "1 ruangan = 1 halaman"
 * otomatis, jadi nggak perlu atur tata letak manual tiap kapasitas
 * ruangan beda-beda.
 *
 * Mulai dari ukuran normal (fontSize 9, cellPadding 2 -- sama dengan
 * default di tableTheme()), diskalakan turun proporsional kalau ternyata
 * nggak cukup. Dikunci minimal fontSize 6 & cellPadding 0.6 biar tetap
 * kebaca kalau kapasitas ruangannya ekstrem besar -- di titik itu, kalau
 * masih meluber juga, autoTable tetap akan lanjut ke halaman berikutnya
 * sebagai fallback aman (bukan teks kepotong/ilang).
 *
 * @param {jsPDF} doc
 * @param {number} y - posisi Y setelah letterhead (awal tabel)
 * @param {number} jumlahBaris - jumlah siswa di ruangan ini
 */
function hitungUkuranTabelMuatSatuHalaman(doc, y, jumlahBaris) {
  const tinggiHalaman = doc.internal.pageSize.getHeight();
  const sisaTinggi = tinggiHalaman - BATAS_BAWAH_HALAMAN - y;
  const totalBaris = jumlahBaris + 1; // +1 baris header

  const FONT_DEFAULT = 9;
  const PADDING_DEFAULT = 2;
  const tinggiDefault = estimasiTinggiBaris(FONT_DEFAULT, PADDING_DEFAULT) * totalBaris;

  if (tinggiDefault <= sisaTinggi) {
    return { fontSize: FONT_DEFAULT, cellPadding: PADDING_DEFAULT };
  }

  const skala = sisaTinggi / tinggiDefault;
  return {
    fontSize: Math.max(6, FONT_DEFAULT * skala),
    cellPadding: Math.max(0.6, PADDING_DEFAULT * skala),
  };
}

/**
 * Export daftar peserta ujian ke PDF. Satu ruangan = satu halaman (analog
 * "satu sheet" di versi Excel) -- jadi "export semua ruangan" tetap jadi
 * 1 file PDF multi-halaman, gampang dikirim/diprint sekali jalan.
 *
 * @param {Object} params
 * @param {Array} params.semuaRuangan - SELURUH ruangan hasil pembagian,
 *   [{ nomor_ruangan, siswa: [{ id, nama, nis, no_kursi, asal_kelas }] }].
 *   Harus lengkap walaupun yang dicetak cuma 1 ruangan -- nomor peserta
 *   urut lintas ruangan, jadi kalau cuma dikirim sebagian, nomornya bakal
 *   salah mulai dari 001 lagi.
 * @param {number|null} [params.nomorRuangan] - ruangan mana yang dicetak.
 *   null/undefined = semua ruangan (1 halaman per ruangan).
 * @param {string} params.jenisUjian - "PSAS" | "PSAT" | "PSAJ"
 * @param {string} params.tahunAjaran - label tahun ajaran, mis. "2026/2027"
 * @param {Function} [params.showToast] - signature (message, type)
 */
export async function exportDaftarPesertaUjianPdf({
  semuaRuangan,
  nomorRuangan = null,
  jenisUjian,
  tahunAjaran,
  showToast,
}) {
  // Peta nomor peserta DIHITUNG DULU dari seluruh ruangan, sebelum
  // difilter -- sama alasannya kayak di daftarPesertaExcelExport.js.
  const petaNoPeserta = bangunPetaNoPeserta(semuaRuangan || []);

  const ruangan =
    nomorRuangan == null
      ? semuaRuangan || []
      : (semuaRuangan || []).filter((r) => r.nomor_ruangan === Number(nomorRuangan));
  // Ruangan kosong (quota di-nol-in admin) dibuang dulu, sama seperti versi Excel.
  const ruanganTerisi = (ruangan || []).filter((r) => (r.siswa || []).length > 0);

  if (
    !guardHasData(ruanganTerisi, {
      showToast,
      message: "Belum ada peserta untuk diexport.",
    })
  ) {
    return;
  }

  const judul = JUDUL_UJIAN[jenisUjian] || jenisUjian;
  const doc = createPdfDocument({ orientation: "portrait" });

  ruanganTerisi.forEach((r, index) => {
    // Ruangan pertama pakai halaman yang udah otomatis ada dari
    // createPdfDocument(); ruangan berikutnya baru nambah halaman baru.
    if (index > 0) doc.addPage();

    const namaRuang = labelRuang(r.nomor_ruangan);
    // Dua baris terpisah (bukan digabung jadi 1 baris pakai separator) --
    // subtitleLines di addLetterhead nge-render tiap baris dengan font &
    // size yang sama, jadi "RUANG 01" nggak keliatan lebih besar dari
    // "TAHUN AJARAN ...".
    const subtitleLines = [tahunAjaran ? `TAHUN AJARAN ${tahunAjaran}` : null, namaRuang].filter(
      Boolean
    );

    const y = addLetterhead(doc, {
      title: `DAFTAR PESERTA ${judul}`,
      subtitleLines,
      // Garis pemisah dimatiin khusus di sini -- makan ~7mm ruang vertikal
      // yang sebenarnya lebih berguna buat nampung baris tabel (biar 40
      // siswa/ruangan tetap muat 1 halaman).
      withDivider: false,
    });

    // Diurutkan pakai no_kursi (= no_peserta yang disimpan ke DB), BUKAN
    // nama -- sama persis dengan urutan di versi Excel & di tab Preview
    // Per Ruangan, biar 3 tempat itu konsisten.
    const siswaTerurut = [...r.siswa].sort((a, b) => (a.no_kursi || 0) - (b.no_kursi || 0));

    // fontSize & cellPadding dihitung otomatis dari jumlah siswa di
    // ruangan ini -- ruangan yang isinya sedikit tetap pakai ukuran
    // normal, ruangan yang penuh/kapasitas gede otomatis mengecil supaya
    // tetap 1 halaman (bukan meluber ke halaman ke-2).
    const { fontSize, cellPadding } = hitungUkuranTabelMuatSatuHalaman(doc, y, siswaTerurut.length);

    autoTable(doc, {
      ...tableTheme(y, { fontSize, styles: { cellPadding } }),
      head: [["No", "Nama Peserta", "No. Peserta", "NIS"]],
      body: siswaTerurut.map((s, idx) => [
        idx + 1,
        s.nama || "-",
        petaNoPeserta.get(String(s.id)) || "-",
        s.nis || "-",
      ]),
      // Lebar kolom manual -- No & No.Peserta/NIS sempit+center, Nama
      // Peserta ambil sisa lebar halaman.
      columnStyles: {
        0: { cellWidth: 12, halign: "center" },
        1: { cellWidth: "auto" },
        2: { cellWidth: 32, halign: "center" },
        3: { cellWidth: 32, halign: "center" },
      },
    });
  });

  // Konvensi nama file disamakan dengan versi Excel, cuma ekstensinya beda.
  const suffix =
    ruanganTerisi.length === 1
      ? `Ruang-${String(ruanganTerisi[0].nomor_ruangan).padStart(2, "0")}`
      : "Semua-Ruangan";
  const tahunFile = (tahunAjaran || "").replace(/\//g, "-");

  savePdf(doc, `Daftar-Peserta-${jenisUjian}${tahunFile ? `-${tahunFile}` : ""}-${suffix}.pdf`);

  showToast?.(
    `Berhasil export ${ruanganTerisi.length} ruangan (${ruanganTerisi.reduce(
      (n, r) => n + r.siswa.length,
      0
    )} peserta) ke PDF`,
    "success"
  );
}
