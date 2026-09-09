// src/pages/administrasi-tu/sppExcelExport.js
// Export "Rekap Tunggakan Kelas" (PER KELAS) sebagai Excel -- buat dikasih
// ke walikelas biar diterusin ke ortu. Excel dipilih (bukan PDF) karena
// walikelas biasanya mau sortir/filter sendiri.
//
// 1 file = 1 kelas yang lagi difilter di tab Tunggakan (SppTab.js ->
// TunggakanPanel). Baris cuma siswa yang punya tunggakan -- filter "yang
// lunas semua otomatis gak masuk" udah dilakuin di TunggakanPanel SEBELUM
// `rows` dikirim ke sini, jadi fungsi ini tinggal nampilin apa adanya.
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

/**
 * @param {Object} params
 * @param {string} params.classId - dipakai di judul & nama file, mis. "9C"
 * @param {Array} params.rows - hasil TunggakanPanel.fetchTunggakan:
 *   [{ nis, full_name, unresolved, belumBulan: [{month, year, ta}], totalTunggakan }]
 * @param {Function} [params.showToast] - signature (message, type)
 */
export async function exportRekapTunggakanKelas({ classId, rows, showToast }) {
  if (!guardHasData(rows, { showToast, message: "Tidak ada tunggakan untuk diexport." })) {
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Rekap Tunggakan");

  const totalTunggakanKelas = rows.reduce((sum, r) => sum + (r.totalTunggakan || 0), 0);

  const headerRowIndex = addLetterhead(worksheet, {
    title: `REKAP TUNGGAKAN SPP - KELAS ${classId}`,
    mergeCols: 6,
    metaLines: [
      `Dicetak: ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}`,
      `Jumlah siswa menunggak: ${rows.length}`,
      `Total tunggakan kelas: Rp${totalTunggakanKelas.toLocaleString("id-ID")}`,
    ],
  });

  // Lebar awal -- nanti disesuaikan lagi otomatis sama autoFitColumns()
  // di bawah berdasarkan panjang konten yang sebenernya keisi.
  worksheet.columns = [
    { width: 5 },
    { width: 16 },
    { width: 26 },
    { width: 45 },
    { width: 12 },
    { width: 18 },
  ];

  const headerRow = worksheet.getRow(headerRowIndex);
  headerRow.values = ["No", "NIS", "Nama", "Bulan Belum Bayar", "Jumlah Bulan", "Total Tunggakan"];
  styleTableHeaderRow(headerRow);

  rows.forEach((r, idx) => {
    const rowIndex = headerRowIndex + 1 + idx;
    const row = worksheet.getRow(rowIndex);
    const bulanLabel = r.unresolved
      ? "NIS tidak sesuai pola, cek manual"
      : r.belumBulan
          .map((p) => `${MONTH_NAMES[p.month - 1].slice(0, 3)}'${String(p.year).slice(2)}`)
          .join(", ");

    row.values = [
      idx + 1,
      r.nis,
      r.full_name,
      bulanLabel,
      r.unresolved ? "-" : r.belumBulan.length,
      r.totalTunggakan,
    ];
    row.getCell(6).numFmt = '"Rp"#,##0';
    // kolom 1 (No) & 5 (Jumlah Bulan) center; kolom 2 (NIS) dipaksa text
    // biar angka nol di depan gak ilang.
    styleTableDataRow(row, idx, [1, 5], [2]);
  });

  setupPrintOptions(worksheet, { orientation: "landscape", freezeHeaderRow: headerRowIndex });
  autoFitColumns(worksheet);

  await downloadWorkbook(workbook, `Rekap-Tunggakan-${classId}.xlsx`);
}
