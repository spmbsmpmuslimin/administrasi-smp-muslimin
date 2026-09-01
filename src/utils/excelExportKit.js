// src/utils/excelExportKit.js
// Kit standar buat semua export Excel (pakai ExcelJS) di app ini --
// letterhead, warna, border, dan proses download yang seragam. Sebelum ini,
// tiap file export (SpmbExcel.js, GradesExcel.js, TeacherScheduleExcel.js,
// dst) punya warna/font/letterhead sendiri-sendiri, jadi hasil export beda
// tampilan tergantung file mana yang bikin.
//
// Cara pakai (contoh):
//   import {
//     SCHOOL_NAME, EXCEL_COLORS, addLetterhead,
//     styleTableHeaderRow, styleTableDataRow, downloadWorkbook,
//   } from "../utils/excelExportKit";
//
// Kalau mau ganti warna resmi sekolah, TINGGAL GANTI di EXCEL_COLORS.primary
// di file ini -- otomatis nyambung ke semua export yang pakai kit ini.

export const SCHOOL_NAME = "SMP MUSLIMIN CILILIN";

// Palet warna resmi. primary = biru tua, dipilih karena udah kepake duluan
// buat judul laporan di ReportExcel.js (kemungkinan besar ini warna brand).
export const EXCEL_COLORS = {
  primary: "FF1E3A8A", // biru tua -- header tabel utama & judul laporan
  primaryLight: "FFEFF6FF", // biru sangat muda -- background box info/summary
  headerText: "FFFFFFFF", // putih -- teks di atas warna primary
  border: "FFCBD5E1", // abu-abu -- garis tabel standar
  zebra: "FFF8FAFC", // abu-abu sangat muda -- selang-seling baris data
  textMuted: "FF64748B", // abu-abu -- teks sekunder (tanggal cetak, filter)
  accentPurple: "FF7C3AED", // warna alternatif kalau 1 file punya beberapa sheet/section yang perlu dibedain dari header utama
  danger: "FFDC2626",
  success: "FF16A34A",
  warning: "FFD97706",
};

export const EXCEL_FONT_FAMILY = "Calibri";

const thinBorder = { style: "thin", color: { argb: EXCEL_COLORS.border } };
export const STANDARD_CELL_BORDER = {
  top: thinBorder,
  left: thinBorder,
  bottom: thinBorder,
  right: thinBorder,
};

/**
 * Tulis blok letterhead standar (nama sekolah + judul laporan + metadata
 * opsional) mulai dari startRow. Return nomor baris kosong berikutnya,
 * biar caller tinggal lanjut nulis tabel dari situ.
 *
 * @param {ExcelJS.Worksheet} worksheet
 * @param {Object} opts
 * @param {string} opts.title       - judul laporan, misal "DATA CALON SISWA BARU"
 * @param {number} opts.mergeCols   - jumlah kolom tabel (buat merge cell judul biar center penuh)
 * @param {string[]} [opts.metaLines] - baris info tambahan (tahun ajaran, total data, dst), 1 string = 1 baris
 * @param {number} [opts.startRow=1]
 * @returns {number} baris kosong berikutnya, siap dipakai buat header tabel
 */
export function addLetterhead(
  worksheet,
  { title, mergeCols, metaLines = [], startRow = 1 },
) {
  let row = startRow;
  const lastCol = String.fromCharCode(
    64 + Math.min(Math.max(mergeCols, 1), 26),
  );

  const schoolCell = worksheet.getCell(`A${row}`);
  worksheet.mergeCells(`A${row}:${lastCol}${row}`);
  schoolCell.value = SCHOOL_NAME;
  schoolCell.font = {
    name: EXCEL_FONT_FAMILY,
    bold: true,
    size: 16,
    // Sengaja hitam (bukan EXCEL_COLORS.primary) -- laporan ini kebanyakan
    // dicetak hitam-putih, jadi warna di judul nggak ngaruh dan malah bisa
    // nge-print abu-abu/pudar di printer non-warna.
  };
  schoolCell.alignment = { horizontal: "center", vertical: "middle" };
  row++;

  if (title) {
    const titleCell = worksheet.getCell(`A${row}`);
    worksheet.mergeCells(`A${row}:${lastCol}${row}`);
    titleCell.value = title;
    titleCell.font = { name: EXCEL_FONT_FAMILY, bold: true, size: 13 };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    row++;
  }

  row++; // baris kosong pemisah

  metaLines.forEach((line) => {
    const cell = worksheet.getCell(`A${row}`);
    cell.value = line;
    cell.font = {
      name: EXCEL_FONT_FAMILY,
      size: 10,
      italic: true,
      color: { argb: EXCEL_COLORS.textMuted },
    };
    row++;
  });

  row++; // baris kosong sebelum tabel
  return row;
}

/**
 * Style-in baris header tabel pakai warna standar. Panggil SETELAH
 * headerRow.values di-set.
 * @param {ExcelJS.Row} headerRow
 * @param {Object} [opts]
 * @param {string} [opts.fillColor] - default biru primary, bisa dioverride (misal EXCEL_COLORS.accentPurple)
 */
export function styleTableHeaderRow(
  headerRow,
  { fillColor = EXCEL_COLORS.primary } = {},
) {
  headerRow.eachCell((cell) => {
    cell.font = {
      name: EXCEL_FONT_FAMILY,
      bold: true,
      color: { argb: EXCEL_COLORS.headerText },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: fillColor },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = STANDARD_CELL_BORDER;
  });
  headerRow.height = 22;
}

/**
 * Style-in 1 baris data: font + border standar + zebra striping (baris
 * genap dikasih background abu-abu muda).
 * @param {ExcelJS.Row} dataRow
 * @param {number} rowIndex - index data (0-based), dipakai buat nentuin zebra
 * @param {number[]} [centerCols] - nomor kolom (1-based) yang mau di-center-in; sisanya rata kiri
 * @param {number[]} [textCols] - nomor kolom (1-based) yang HARUS diperlakukan
 *   sebagai text, bukan number. Wajib buat kolom kayak NIS/NISN/kode guru --
 *   kalau dibiarin jadi number, angka nol di depan (mis. "007123") bisa
 *   hilang atau kolom keformat aneh pas dibuka di Excel.
 */
export function styleTableDataRow(
  dataRow,
  rowIndex,
  centerCols = [],
  textCols = [],
) {
  dataRow.eachCell((cell, colNumber) => {
    cell.font = { name: EXCEL_FONT_FAMILY, size: 10 };
    cell.border = STANDARD_CELL_BORDER;
    cell.alignment = {
      vertical: "middle",
      horizontal: centerCols.includes(colNumber) ? "center" : "left",
    };
    if (rowIndex % 2 === 0) {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: EXCEL_COLORS.zebra },
      };
    }
    if (textCols.includes(colNumber)) {
      cell.numFmt = "@";
    }
  });
}

/**
 * Generate buffer dari workbook, trigger download ke browser, lalu revoke
 * object URL-nya. Gantiin boilerplate writeBuffer -> Blob ->
 * createObjectURL -> klik anchor -> revoke yang sebelumnya diketik ulang
 * hampir sama persis di banyak file.
 * @param {ExcelJS.Workbook} workbook
 * @param {string} filename - termasuk ekstensi .xlsx
 */
export async function downloadWorkbook(workbook, filename) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Auto-fit lebar kolom berdasarkan konten terpanjang di tiap kolom (header
 * + semua baris data). Panggil PALING TERAKHIR, setelah semua baris (header
 * & data) selesai ditulis -- kalau dipanggil sebelum itu, hasilnya nggak
 * akurat karena kolom masih kosong.
 *
 * Kalau file lo udah nentuin lebar kolom manual (worksheet.columns = [...])
 * dan itu sengaja/pas, nggak perlu pakai ini -- opsional, bukan wajib.
 *
 * @param {ExcelJS.Worksheet} worksheet
 * @param {Object} [opts]
 * @param {number} [opts.minWidth=6]
 * @param {number} [opts.maxWidth=60] - dibatasin biar kolom isian panjang
 *   (alamat, catatan, dll) nggak bikin sheet jadi kelebaran pas di-print
 * @param {number} [opts.padding=2]
 */
export function autoFitColumns(
  worksheet,
  { minWidth = 6, maxWidth = 60, padding = 2 } = {},
) {
  worksheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: false }, (cell) => {
      const length = cell.value ? cell.value.toString().length : 0;
      if (length > maxLength) maxLength = length;
    });
    column.width = Math.max(minWidth, Math.min(maxWidth, maxLength + padding));
  });
}

/**
 * Setup print-friendly standar: orientasi, fit-to-page, margin wajar, dan
 * (opsional) freeze baris header tabel biar nggak ilang pas di-scroll atau
 * pas cetak banyak halaman. Karena kebanyakan laporan ini ujungnya DICETAK,
 * ini dipisah dari style visual supaya konsisten di semua file export.
 *
 * @param {ExcelJS.Worksheet} worksheet
 * @param {Object} [opts]
 * @param {"portrait"|"landscape"} [opts.orientation="portrait"]
 * @param {number} [opts.freezeHeaderRow] - nomor baris header tabel (bukan
 *   letterhead) yang mau di-freeze, kalau ada. Baris di atasnya (letterhead,
 *   dst) akan ikut freeze juga karena posisinya di atas.
 */
export function setupPrintOptions(
  worksheet,
  { orientation = "portrait", freezeHeaderRow } = {},
) {
  worksheet.pageSetup = {
    orientation,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0, // 0 = biarin tinggi nyambung banyak halaman, jangan dipaksa muat 1 halaman
    margins: {
      left: 0.5,
      right: 0.5,
      top: 0.6,
      bottom: 0.6,
      header: 0.3,
      footer: 0.3,
    },
  };

  if (freezeHeaderRow) {
    worksheet.views = [{ state: "frozen", ySplit: freezeHeaderRow }];
  }
}

/**
 * Cek apakah data yang mau diexport kosong. Kalau kosong, tampilin pesan
 * (lewat showToast kalau ada, fallback ke window.alert) dan return false --
 * caller tinggal `if (!guardHasData(data, { showToast })) return;`.
 * Gantiin pattern manual `if (!data || data.length === 0) { alert(...); }`
 * yang formatnya beda-beda tiap file (ada yang alert, ada yang toast).
 *
 * @param {Array} data
 * @param {Object} [opts]
 * @param {Function} [opts.showToast] - signature (message, type) kayak yang udah dipakai di banyak file
 * @param {string} [opts.message="Tidak ada data untuk diexport!"]
 * @returns {boolean} true kalau data ada isinya (aman lanjut export)
 */
export function guardHasData(
  data,
  { showToast, message = "Tidak ada data untuk diexport!" } = {},
) {
  if (data && data.length > 0) return true;

  if (showToast) {
    showToast(message, "error");
  } else if (typeof window !== "undefined") {
    window.alert(message);
  }
  return false;
}
