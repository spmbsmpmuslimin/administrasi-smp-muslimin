// setting/kelola-ujian/daftarPesertaExcelExport.js
// Export "Daftar Peserta Ujian" per ruangan ke Excel -- buat ditempel di
// pintu ruangan & pegangan pengawas pas ujian.
//
// Sumber datanya hasilLive dari PembagianRuanganTab (hasil terapkanQuotaManual),
// JADI ini ngikutin quota yang lagi keliatan di layar -- bukan query ulang ke
// peserta_ujian. Konsekuensinya: kalau admin baru ngubah quota dan BELUM klik
// "Simpan ke Database", yang keexport adalah versi layar (yang belum tersimpan).
// Ini disengaja, biar admin bisa preview-cetak dulu sebelum commit ke DB.
//
// Semua styling (letterhead, warna header, border, zebra, print setup) numpang
// ke utils/excelExportKit -- jangan bikin warna/font sendiri di file ini.

import ExcelJS from "exceljs";
import {
  addLetterhead,
  styleTableHeaderRow,
  styleTableDataRow,
  autoFitColumns,
  setupPrintOptions,
  downloadWorkbook,
  guardHasData,
} from "../../utils/excelExportKit";
import { bangunPetaNoPeserta } from "./noPeserta";

// Judul resmi yang dicetak di letterhead. Sengaja dipisah dari
// JENIS_UJIAN_LABEL di PembagianRuanganTab.js -- yang di sana format layar
// ("PSAS - Penilaian ... (kelas 7-9)"), yang di sini format dokumen cetak
// (huruf besar semua, tanpa kode singkatan & tanpa keterangan jenjang).
const JUDUL_UJIAN = {
  PSAS: "PENILAIAN SUMATIF AKHIR SEMESTER GANJIL",
  PSAT: "PENILAIAN SUMATIF AKHIR TAHUN",
  PSAJ: "PENILAIAN SUMATIF AKHIR JENJANG",
};

// "RUANG 01", "RUANG 12" -- dua digit biar rapi pas diurutin/ditempel
const labelRuang = (nomor) => `RUANG ${String(nomor).padStart(2, "0")}`;

/**
 * Export daftar peserta ujian ke Excel. Satu ruangan = satu sheet, jadi
 * "export semua ruangan" tetap jadi 1 file (gampang dikirim/diprint sekali
 * jalan), sementara tiap sheet tetap punya letterhead & judul ruangannya
 * sendiri.
 *
 * @param {Object} params
 * @param {Array} params.semuaRuangan - SELURUH ruangan hasil pembagian,
 *   [{ nomor_ruangan, siswa: [{ id, nama, nis, no_kursi, asal_kelas }] }].
 *   Harus lengkap walaupun yang dicetak cuma 1 ruangan -- nomor peserta
 *   ("26-27-001") urut lintas ruangan, jadi kalau cuma dikirim sebagian,
 *   nomornya bakal salah mulai dari 001 lagi.
 * @param {number|null} [params.nomorRuangan] - ruangan mana yang dicetak.
 *   null/undefined = semua ruangan (1 sheet per ruangan).
 * @param {string} params.jenisUjian - "PSAS" | "PSAT" | "PSAJ"
 * @param {string} params.tahunAjaran - label tahun ajaran, mis. "2026/2027"
 * @param {Function} [params.showToast] - signature (message, type)
 */
export async function exportDaftarPesertaUjian({
  semuaRuangan,
  nomorRuangan = null,
  jenisUjian,
  tahunAjaran,
  showToast,
}) {
  // Peta nomor peserta DIHITUNG DULU dari seluruh ruangan, sebelum difilter
  // -- ini yang bikin Ruang 02 mulai dari 041 dan bukan 001 waktu dicetak
  // sendirian.
  const petaNoPeserta = bangunPetaNoPeserta(semuaRuangan || [], tahunAjaran);

  const ruangan =
    nomorRuangan == null
      ? semuaRuangan || []
      : (semuaRuangan || []).filter((r) => r.nomor_ruangan === Number(nomorRuangan));
  // Ruangan yang kosong (quota-nya di-nol-in admin) dibuang dulu -- kalau
  // ikut keexport hasilnya sheet cuma isi header doang, bikin bingung.
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
  const workbook = new ExcelJS.Workbook();

  for (const r of ruanganTerisi) {
    const namaRuang = labelRuang(r.nomor_ruangan);
    const worksheet = workbook.addWorksheet(namaRuang);

    // mergeCols = 4 (No, Nama Peserta, No. Peserta, NIS) -- judul di-center
    // penuh selebar tabel.
    const headerRowIndex = addLetterhead(worksheet, {
      title: `DAFTAR PESERTA ${judul}`,
      mergeCols: 4,
      // Tahun ajaran & nomor ruang masuk KOP (center, bold), bukan metaLines --
      // dua info ini identitas dokumen, bukan catatan tambahan.
      subtitleLines: [...(tahunAjaran ? [`TAHUN AJARAN ${tahunAjaran}`] : []), namaRuang],
    });

    // Lebar awal; nanti disesuaikan lagi sama autoFitColumns() di bawah.
    worksheet.columns = [
      { width: 5 }, // No
      { width: 32 }, // Nama Peserta
      { width: 14 }, // No. Peserta
      { width: 16 }, // NIS
    ];

    const headerRow = worksheet.getRow(headerRowIndex);
    headerRow.values = ["No", "Nama Peserta", "No. Peserta", "NIS"];
    styleTableHeaderRow(headerRow);

    // Diurutkan pakai no_kursi (= no_peserta yang disimpan ke DB), BUKAN
    // nama -- biar urutan di daftar ini sama persis sama urutan tempat
    // duduk & urutan kartu peserta yang dicetak dari sub-fitur Kartu Ujian.
    const siswaTerurut = [...r.siswa].sort((a, b) => (a.no_kursi || 0) - (b.no_kursi || 0));

    siswaTerurut.forEach((s, idx) => {
      const row = worksheet.getRow(headerRowIndex + 1 + idx);
      row.values = [idx + 1, s.nama || "-", petaNoPeserta.get(String(s.id)) || "-", s.nis || "-"];
      // centerCols: No (1), No. Peserta (3), NIS (4). Nama biarin rata kiri.
      // textCols: No. Peserta (3) & NIS (4) dipaksa text -- NIS sering punya
      // nol di depan yang bakal ilang kalau kebaca sebagai number.
      styleTableDataRow(row, idx, [1, 3, 4], [3, 4]);
    });

    setupPrintOptions(worksheet, {
      orientation: "portrait",
      freezeHeaderRow: headerRowIndex,
    });
    autoFitColumns(worksheet, { startRow: headerRowIndex });
  }

  // Nama file: kalau cuma 1 ruangan, sebut ruangannya biar gampang dicari
  // di folder Download; kalau banyak, tandain "Semua-Ruangan".
  const suffix =
    ruanganTerisi.length === 1
      ? `Ruang-${String(ruanganTerisi[0].nomor_ruangan).padStart(2, "0")}`
      : "Semua-Ruangan";
  const tahunFile = (tahunAjaran || "").replace(/\//g, "-");

  await downloadWorkbook(
    workbook,
    `Daftar-Peserta-${jenisUjian}${tahunFile ? `-${tahunFile}` : ""}-${suffix}.xlsx`
  );

  showToast?.(
    `Berhasil export ${ruanganTerisi.length} ruangan (${ruanganTerisi.reduce(
      (n, r) => n + r.siswa.length,
      0
    )} peserta)`,
    "success"
  );
}
