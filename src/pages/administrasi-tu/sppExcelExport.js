// src/pages/administrasi-tu/sppExcelExport.js
// Export "Rekap Pembayaran" sebagai Excel -- buat dikasih ke walikelas
// biar diterusin ke ortu. Excel dipilih (bukan PDF) karena walikelas
// biasanya mau sortir/filter sendiri.
//
// REVISI: nyesuain sama struktur data baru dari RekapPanel (SppTab.js).
// Row SEKARANG pake bentuk:
//   { id, nis, full_name, class_id, unresolved, belumMasuk,
//     months: [{ month, year, isDue, status }, ... 12 bulan buat TA yg
//       lagi dibuka], status: "paid"|"partial"|"unpaid"|"unresolved"|"n/a",
//     totalTunggakan (Rp, cuma bulan yg isDue), totalEstimasiTA (Rp, 12
//     bulan penuh) }
// BUKAN lagi { belumBulan: [...], totalTunggakan } kayak versi paling
// awal -- kalau ada revisi struktur lagi di RekapPanel, cek ulang field
// yang dibaca di sini.
//
// `rows` dikirim APA ADANYA sesuai yang lagi kefilter/ketampil di layar
// TU (statusFilter Semua/Lunas/Belum Lunas) -- fungsi ini gak nge-filter
// ulang, cuma nampilin.
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
import { MONTH_NAMES } from "./keuanganShared";

const STATUS_LABEL = {
  paid: "Lunas",
  partial: "Sebagian",
  unpaid: "Belum Bayar",
  unresolved: "-",
  "n/a": "-",
};

/**
 * @param {Object} params
 * @param {string} params.classId - "" kalau lagi mode "Semua kelas" (dalam
 *   1 jenjang); kalau ada isinya dipake di judul & nama file, mis. "9C"
 * @param {Array} params.rows - hasil RekapPanel (allRows/rows yang lagi
 *   kefilter di layar), lihat komentar struktur di atas
 * @param {Function} [params.showToast] - signature (message, type)
 */
export async function exportRekapTunggakanKelas({ classId, rows, showToast }) {
  if (!guardHasData(rows, { showToast, message: "Tidak ada data untuk diexport." })) {
    return;
  }

  // Row punya lebih dari 1 class_id yang beda -> lagi mode "Semua kelas",
  // butuh kolom Kelas di Excel biar walikelas/TU tau siswa itu dari mana
  // (sama kayak logic showKelasColumn di tabel on-screen RekapPanel).
  const distinctClassIds = [...new Set(rows.map((r) => r.class_id).filter(Boolean))].sort();
  const showKelasColumn = distinctClassIds.length > 1;

  const kelasLabel = classId || (distinctClassIds.length > 0 ? distinctClassIds.join(", ") : "-");

  const resolvedRows = rows.map((r) => {
    if (r.unresolved) {
      return {
        ...r,
        bulanLabel: "NIS tidak sesuai pola, cek manual",
        jumlahBulan: "-",
        total: 0,
        statusLabel: STATUS_LABEL.unresolved,
      };
    }
    if (r.belumMasuk) {
      return {
        ...r,
        bulanLabel: "Belum jadi siswa pas TA ini",
        jumlahBulan: "-",
        total: 0,
        statusLabel: STATUS_LABEL["n/a"],
      };
    }
    // Bulan yang dianggep "belum bayar" DI SINI cuma yang beneran udah
    // isDue -- konsisten sama gimana totalTunggakan (angka yang dipake
    // buat nagih) dihitung di RekapPanel. Bulan yang belom isDue (bayar
    // di muka blm ada / emang belom kejalan) sengaja gak masuk daftar
    // ini biar gak kebaca kayak "nunggak" padahal belom waktunya.
    const belumBayar = (r.months || []).filter((p) => p.isDue && p.status !== "paid");
    const bulanLabel =
      belumBayar.length > 0
        ? belumBayar
            .map((p) => `${MONTH_NAMES[p.month - 1].slice(0, 3)}'${String(p.year).slice(2)}`)
            .join(", ")
        : "-";
    return {
      ...r,
      bulanLabel,
      jumlahBulan: belumBayar.length,
      total: r.totalTunggakan || 0,
      statusLabel: STATUS_LABEL[r.status] || "-",
    };
  });

  const jumlahMenunggak = resolvedRows.filter((r) => (r.total || 0) > 0).length;
  const totalTunggakanKelas = resolvedRows.reduce((sum, r) => sum + (r.total || 0), 0);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Rekap Pembayaran");

  const headerRowIndex = addLetterhead(worksheet, {
    title: `REKAP PEMBAYARAN SPP - KELAS ${kelasLabel}`,
    mergeCols: showKelasColumn ? 7 : 6,
    metaLines: [
      `Dicetak: ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}`,
      `Jumlah siswa ditampilkan: ${resolvedRows.length}`,
      `Jumlah siswa menunggak: ${jumlahMenunggak}`,
      `Total tunggakan: Rp${totalTunggakanKelas.toLocaleString("id-ID")}`,
    ],
  });

  // Lebar awal -- nanti disesuaikan lagi otomatis sama autoFitColumns()
  // di bawah berdasarkan panjang konten yang sebenernya keisi.
  const baseColumns = [
    { width: 5 }, // No
    { width: 16 }, // NIS
    { width: 26 }, // Nama
    { width: 45 }, // Bulan Belum Bayar
    { width: 12 }, // Jumlah Bulan
    { width: 18 }, // Total Tunggakan
    { width: 14 }, // Status
  ];
  worksheet.columns = showKelasColumn
    ? [baseColumns[0], baseColumns[1], baseColumns[2], { width: 10 }, ...baseColumns.slice(3)]
    : baseColumns;

  const headerLabels = showKelasColumn
    ? [
        "No",
        "NIS",
        "Nama",
        "Kelas",
        "Bulan Belum Bayar",
        "Jumlah Bulan",
        "Total Tunggakan",
        "Status",
      ]
    : ["No", "NIS", "Nama", "Bulan Belum Bayar", "Jumlah Bulan", "Total Tunggakan", "Status"];

  const headerRow = worksheet.getRow(headerRowIndex);
  headerRow.values = headerLabels;
  styleTableHeaderRow(headerRow);

  resolvedRows.forEach((r, idx) => {
    const rowIndex = headerRowIndex + 1 + idx;
    const row = worksheet.getRow(rowIndex);

    const values = showKelasColumn
      ? [
          idx + 1,
          r.nis,
          r.full_name,
          r.class_id || "-",
          r.bulanLabel,
          r.jumlahBulan,
          r.total,
          r.statusLabel,
        ]
      : [idx + 1, r.nis, r.full_name, r.bulanLabel, r.jumlahBulan, r.total, r.statusLabel];
    row.values = values;

    // Kolom "Total Tunggakan" & posisi kolom center (No, Jumlah Bulan)
    // geser 1 ke kanan kalau kolom Kelas lagi ditampilin.
    const totalColIdx = showKelasColumn ? 7 : 6;
    const centerCols = showKelasColumn ? [1, 6] : [1, 5];
    const textCols = showKelasColumn ? [2] : [2]; // NIS dipaksa text biar nol di depan gak ilang

    row.getCell(totalColIdx).numFmt = '"Rp"#,##0';
    styleTableDataRow(row, idx, centerCols, textCols);
  });

  setupPrintOptions(worksheet, { orientation: "landscape", freezeHeaderRow: headerRowIndex });
  autoFitColumns(worksheet);

  const filenameSuffix =
    classId || (distinctClassIds.length > 0 ? distinctClassIds.join("-") : "Semua");
  await downloadWorkbook(workbook, `Rekap-Pembayaran-${filenameSuffix}.xlsx`);
}
