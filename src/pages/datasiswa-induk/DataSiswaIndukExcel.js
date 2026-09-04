// DataSiswaIndukExcel.js
// Export Excel kelengkapan data siswa (DataSiswaInduk.js).
// Pasangan dari DataSiswaIndukPDF.js -- data yang diterima SAMA PERSIS
// (hasil merge students + student_profile_details yang udah dilakuin di
// DataSiswaInduk.js), tinggal dirender ke format beda.
//
// Kenapa layoutnya beda dari PDF:
// - PDF: 1 halaman per siswa (Field/Isian vertikal) -- enak buat dicetak &
//   diarsipkan per anak.
// - Excel: 1 BARIS per siswa, field jadi KOLOM -- ini bentuk yang lebih
//   berguna di Excel (bisa di-sort, di-filter per kolom, dicocokin ke data
//   lain), bukan sekadar versi digital dari PDF.
//
// Daftar kolom (DATA_SISWA_ROWS, DATA_ORANGTUA_ROWS, STATUS_LABEL) SENGAJA
// disamain isinya persis kayak di DataSiswaIndukPDF.js, biar kolom yang
// muncul di Excel & PDF konsisten. Kalau nambah/ubah field di salah satu
// file, field yang sama harus diupdate juga di file satunya.
//
// CATATAN: kolom "NISN" sengaja DIKELUARIN dari DATA_SISWA_ROWS dan
// dipindah jadi kolom tetap (FIXED_COLS) persis setelah "NIS", biar posisi
// NIS & NISN berdampingan di Excel. Kalau nyamain lagi ke PDF, inget PDF
// masih nyimpen "nisn" di DATA_SISWA_ROWS versi dia sendiri -- gapapa beda,
// karena PDF layoutnya vertikal (bukan kolom) jadi urutan taruhnya nggak
// masalah.
import ExcelJS from "exceljs";
import {
  addLetterhead,
  styleTableHeaderRow,
  styleTableDataRow,
  downloadWorkbook,
  setupPrintOptions,
  guardHasData,
  EXCEL_COLORS,
  EXCEL_FONT_FAMILY,
} from "../../utils/excelExportKit";

const STATUS_LABEL = {
  lengkap: "Lengkap",
  sebagian: "Sebagian",
  belum: "Belum Isi",
};

// Field "nisn" TIDAK ada di sini lagi -- udah dipindah ke FIXED_COLS
// (posisi setelah NIS). Row ini tetap dipake buat getRowValue("nisn").
const DATA_SISWA_ROWS = [
  { key: "jenis_kelamin", label: "Jenis Kelamin" },
  { key: "ttl", label: "Tempat, Tanggal Lahir", combine: "ttl" },
  { key: "nik", label: "NIK Siswa" },
  { key: "no_kk", label: "No. Kartu Keluarga (KK)" },
  { key: "no_akta_lahir", label: "No. Akta Lahir" },
  { key: "agama", label: "Agama" },
  { key: "anak_ke", label: "Anak ke-" },
  { key: "sekolah_asal", label: "Sekolah Asal" },
  { key: "no_peserta_ujian", label: "No. Peserta Ujian" },
  { key: "no_ijazah", label: "No. Ijazah" },
  { key: "no_kip", label: "No. KIP" },
  { key: "no_daftar", label: "No. Pendaftaran" },
  { key: "alamat", label: "Alamat Lengkap" },
  // `dusun` SENGAJA gak dimasukin lagi -- konsisten sama DataSiswaInduk.js,
  // StudentProfile.js & useStudentProfile.js (kolomnya dibiarin ada di DB
  // buat data lama, tapi udah gak dimunculin di UI/export manapun).
  { key: "kode_pos", label: "Kode Pos" },
  { key: "no_hp", label: "No. HP Siswa" },
  { key: "keterangan", label: "Keterangan" },
];

// Sama persis DATA_ORANGTUA_ROWS di DataSiswaIndukPDF.js.
// Catatan: field "nama_ortu" di data sumber SENGAJA nggak ditampilin di
// sini krn udah kecover sama "nama_ayah" & "nama_ibu" (redundan).
const DATA_ORANGTUA_ROWS = [
  { key: "nama_ayah", label: "Nama Lengkap Ayah" },
  { key: "nik_ayah", label: "NIK Ayah" },
  { key: "tempat_tgl_lahir_ayah", label: "Tempat, Tanggal Lahir Ayah" },
  { key: "pekerjaan_ayah", label: "Pekerjaan Ayah" },
  { key: "pendidikan_ayah", label: "Pendidikan Terakhir Ayah" },
  { key: "nama_ibu", label: "Nama Lengkap Ibu" },
  { key: "nik_ibu", label: "NIK Ibu" },
  { key: "tempat_tgl_lahir_ibu", label: "Tempat, Tanggal Lahir Ibu" },
  { key: "pekerjaan_ibu", label: "Pekerjaan Ibu" },
  { key: "pendidikan_ibu", label: "Pendidikan Terakhir Ibu" },
  { key: "no_hp_ortu", label: "No. HP Orang Tua/Wali" },
];

// Field khusus buat NISN, dipisah dari DATA_SISWA_ROWS karena posisinya
// sekarang di FIXED_COLS (setelah NIS), bukan di antara kolom siswa lain.
const NISN_ROW = { key: "nisn", label: "NISN" };

// Kolom-kolom ini HARUS dipaksa jadi text (numFmt "@") lewat styleTableDataRow,
// bukan dibiarin jadi number -- kalau nggak, angka nol di depan (mis. NIS
// "007123", kode pos "05261") bisa hilang atau ke-format aneh di Excel.
const TEXT_FIELD_KEYS = new Set([
  "nik",
  "no_kk",
  "no_akta_lahir",
  "no_peserta_ujian",
  "no_ijazah",
  "no_kip",
  "no_daftar",
  "kode_pos",
  "no_hp",
  "nik_ayah",
  "nik_ibu",
  "no_hp_ortu",
]);

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function formatTanggalSingkat(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTanggalUpdate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTempatTanggalLahir(detail) {
  const tempat = detail?.tempat_lahir;
  const tanggal = formatTanggalSingkat(detail?.tanggal_lahir);
  if (!tempat && !tanggal) return null;
  if (tempat && tanggal) return `${tempat}, ${tanggal}`;
  return tempat || tanggal;
}

// Ambil nilai 1 field detail (support field gabungan "ttl"), balikin
// { display, isEmpty } -- sama pola kayak getRowValue() di DataSiswaIndukPDF.js.
function getRowValue(detail, row) {
  if (row.combine === "ttl") {
    const display = formatTempatTanggalLahir(detail);
    return { display, isEmpty: !display };
  }
  const raw = detail ? detail[row.key] : null;
  const isEmpty = !raw || String(raw).trim() === "";
  return { display: isEmpty ? null : raw, isEmpty };
}

// Kolom tetap: No, Nama, NIS, NISN, Kelas. NISN sengaja ditaruh persis
// setelah NIS (lihat catatan di atas). Field DATA_SISWA_ROWS &
// DATA_ORANGTUA_ROWS nyusul setelahnya (lihat buildHeaderLabels).
// ⚠️ "Status Kelengkapan" SENGAJA dikeluarin dari sini -- dipindah ke
// paling akhir (setelah "Terakhir Diperbarui"), difungsikan lebih kayak
// keterangan penutup per baris daripada kolom identitas di depan.
const FIXED_COLS = ["No", "Nama", "NIS", "NISN", "Kelas"];

function buildHeaderLabels() {
  return [
    ...FIXED_COLS,
    ...DATA_SISWA_ROWS.map((r) => r.label),
    ...DATA_ORANGTUA_ROWS.map((r) => r.label),
    "Terakhir Diperbarui",
    "Status Kelengkapan",
  ];
}

// Nomor kolom (1-based) yang harus dipaksa text, dihitung dari posisi field
// di DATA_SISWA_ROWS / DATA_ORANGTUA_ROWS + offset FIXED_COLS. Kolom "NIS"
// (posisi ke-3) & "NISN" (posisi ke-4) di FIXED_COLS selalu ikut dipaksa
// text juga.
function buildTextColumnNumbers() {
  const offset = FIXED_COLS.length; // kolom setelah FIXED_COLS mulai dari offset+1
  const siswaCols = DATA_SISWA_ROWS.reduce((acc, r, i) => {
    if (TEXT_FIELD_KEYS.has(r.key)) acc.push(offset + 1 + i);
    return acc;
  }, []);
  const ortuOffset = offset + DATA_SISWA_ROWS.length;
  const ortuCols = DATA_ORANGTUA_ROWS.reduce((acc, r, i) => {
    if (TEXT_FIELD_KEYS.has(r.key)) acc.push(ortuOffset + 1 + i);
    return acc;
  }, []);
  return [3 /* NIS */, 4 /* NISN */, ...siswaCols, ...ortuCols];
}

// Lebar kolom manual per kolom pendek yang isinya selalu singkat (angka
// urut, kode, status). Dipasang SETELAH computeColumnWidths supaya nggak
// ketimpa -- kolom2 ini maunya konsisten sempit walaupun ada isi yang
// kebetulan panjang (mis. "Belum diisi" di kolom NISN).
const MANUAL_COLUMN_WIDTHS = {
  1: 6, // No
  3: 14, // NIS
  4: 14, // NISN
  5: 10, // Kelas
};

// Kolom teks bebas yang isinya emang cenderung panjang (alamat) butuh cap
// lebih lega dari kolom lain -- kalau dipaksa ikut maxWidth umum (40),
// alamat kepotong padahal kolom lain (jenis kelamin, agama, dst) udah pas.
const COLUMN_MAX_WIDTH_OVERRIDES = {
  "Alamat Lengkap": 70,
};

// Hitung lebar tiap kolom PERSIS dari panjang teks header & isi baris data
// yang beneran ditulis ke worksheet -- bukan pake autoFitColumns dari
// excelExportKit.js (itu yang bikin banyak kolom kelewat lebar, salah
// satunya karena suka ikut ngukur teks judul letterhead yang di-merge
// lintas semua kolom). rowsDisplayValues = array of array, urutannya harus
// SAMA persis kayak headerLabels (index kolom ke index kolom).
function computeColumnWidths(
  headerLabels,
  rowsDisplayValues,
  { minWidth = 8, maxWidth = 40, padding = 2 } = {}
) {
  return headerLabels.map((label, colIdx) => {
    let maxLen = String(label ?? "").length;
    rowsDisplayValues.forEach((row) => {
      const cellText = row[colIdx];
      const len = cellText == null ? 0 : String(cellText).length;
      if (len > maxLen) maxLen = len;
    });
    const colMaxWidth = COLUMN_MAX_WIDTH_OVERRIDES[label] ?? maxWidth;
    return Math.min(colMaxWidth, Math.max(minWidth, maxLen + padding));
  });
}

function applyColumnWidths(worksheet, widths) {
  widths.forEach((width, idx) => {
    const column = worksheet.getColumn(idx + 1);
    if (column) column.width = width;
  });
}

// "Status Kelengkapan" sekarang di kolom TERAKHIR (posisinya dinamis,
// ngikutin jumlah field DATA_SISWA_ROWS + DATA_ORANGTUA_ROWS), jadi lebar
// manualnya dihitung di sini, bukan di-hardcode ke MANUAL_COLUMN_WIDTHS
// kayak kolom tetap lainnya.
function applyManualColumnWidths(worksheet, totalCols) {
  Object.entries(MANUAL_COLUMN_WIDTHS).forEach(([colNumber, width]) => {
    const column = worksheet.getColumn(Number(colNumber));
    if (column) column.width = width;
  });
  const statusColumn = worksheet.getColumn(totalCols);
  if (statusColumn) statusColumn.width = 16;
}

/**
 * Export Excel kelengkapan data untuk sekumpulan siswa, 1 baris per siswa,
 * field jadi kolom (beda dari PDF yang 1 halaman per siswa).
 * @param {Array<{id:string,full_name:string,nis:string,class_id:string,status:string,detail:Object|null}>} students
 * @param {{academicYear?:string, className?:string, showToast?:Function}} [options] - academicYear format "2026/2027" (dari tabel academic_years, kolom "year"); className format "7B" (dari tabel classes, kolom "id" -- id classes emang udah berformat grade+section, mis. "7A")
 * @returns {Promise<{success:boolean,message?:string}>}
 */
export async function exportStudentProfileExcel(students, options = {}) {
  const { academicYear, className, showToast } = options;

  if (
    !guardHasData(students, {
      showToast,
      message: "Tidak ada siswa yang dipilih",
    })
  ) {
    return { success: false, message: "Tidak ada siswa yang dipilih" };
  }

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Kelengkapan Data Siswa");

    const headerLabels = buildHeaderLabels();
    const totalCols = headerLabels.length;
    const textColNumbers = buildTextColumnNumbers();

    // Lebar kolom sementara (bakal ditimpa computeColumnWidths di akhir,
    // setelah semua baris data ditulis) -- wajib diisi duluan biar
    // worksheet.columns punya entry yang bisa di-iterate ExcelJS.
    worksheet.columns = headerLabels.map(() => ({ width: 16 }));

    let rowNum = addLetterhead(worksheet, {
      // Judul ikut nampilin kelas kalau className dikirim (mis. dari
      // classes.id "7B") -- "KELENGKAPAN DATA SISWA KELAS 7B". Kalau
      // className gak dikirim (mis. export gabungan lintas kelas), fallback
      // ke judul umum kayak sebelumnya.
      title: className
        ? `KELENGKAPAN DATA SISWA KELAS ${className}`
        : "DATA KELENGKAPAN DATA SISWA",
      mergeCols: totalCols,
      metaLines: [
        ...(academicYear ? [`TAHUN AJARAN ${academicYear}`] : []),
        `Total: ${students.length} siswa`,
      ],
    });

    // addLetterhead (di excelExportKit.js) ngerender nama sekolah, judul, &
    // meta lines rata TENGAH secara default. Request-nya rata KIRI, tapi
    // karena file excelExportKit.js gak ada di sini buat diubah source-nya,
    // dipaksa rata kiri lewat override sesudah addLetterhead jalan --
    // row 1 s/d (rowNum-1) itu baris-baris letterhead (sebelum baris header
    // tabel). Kalau nanti excelExportKit.js dapet parameter align bawaan,
    // override manual ini bisa dicabut.
    for (let r = 1; r < rowNum; r++) {
      const letterheadRow = worksheet.getRow(r);
      letterheadRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = { ...(cell.alignment || {}), horizontal: "left" };
      });
    }

    // --- Baris header tabel ---
    const headerRow = worksheet.getRow(rowNum);
    headerRow.values = headerLabels;
    styleTableHeaderRow(headerRow);
    const headerRowNumber = rowNum;
    rowNum++;

    // --- Baris data, 1 baris per siswa ---
    const siswaOffset = FIXED_COLS.length; // kolom field siswa mulai dari sini + 1
    const ortuOffset = siswaOffset + DATA_SISWA_ROWS.length;
    const NISN_COL = 4; // posisi kolom NISN di FIXED_COLS (setelah NIS)
    // Nampung rowValues tiap siswa (teks persis yang ditulis ke cell) buat
    // dipakai ngitung lebar kolom di computeColumnWidths setelah loop ini.
    const allRowsDisplayValues = [];

    students.forEach((student, idx) => {
      const detail = student.detail || null;
      const statusKey = student.status || "belum";
      const nisnValue = getRowValue(detail, NISN_ROW);
      const siswaValues = DATA_SISWA_ROWS.map((r) => getRowValue(detail, r));
      const ortuValues = DATA_ORANGTUA_ROWS.map((r) => getRowValue(detail, r));
      const updatedLabel = formatTanggalUpdate(detail?.updated_at);

      const rowValues = [
        idx + 1,
        student.full_name || "-",
        student.nis || "-",
        nisnValue.display || "Belum diisi",
        student.class_id || "-",
        ...siswaValues.map((v) => v.display || "Belum diisi"),
        ...ortuValues.map((v) => v.display || "Belum diisi"),
        updatedLabel || "-",
        STATUS_LABEL[statusKey] || "Belum Isi",
      ];

      const dataRow = worksheet.getRow(rowNum);
      dataRow.values = rowValues;
      allRowsDisplayValues.push(rowValues);
      // Kolom "No" (1) & "Status Kelengkapan" (kolom terakhir, posisinya
      // sekarang dinamis mengikuti totalCols karena udah dipindah ke
      // paling belakang) di-center, sisanya rata kiri.
      styleTableDataRow(dataRow, idx, [1, totalCols], textColNumbers);

      // Field yang masih kosong ditandain merah-italic, sama kayak di PDF
      // (didParseCell -> PDF_COLORS.danger), biar konsisten visualnya.
      if (nisnValue.isEmpty) {
        dataRow.getCell(NISN_COL).font = {
          name: EXCEL_FONT_FAMILY,
          size: 10,
          italic: true,
          color: { argb: EXCEL_COLORS.danger },
        };
      }
      siswaValues.forEach((v, i) => {
        if (!v.isEmpty) return;
        dataRow.getCell(siswaOffset + 1 + i).font = {
          name: EXCEL_FONT_FAMILY,
          size: 10,
          italic: true,
          color: { argb: EXCEL_COLORS.danger },
        };
      });
      ortuValues.forEach((v, i) => {
        if (!v.isEmpty) return;
        dataRow.getCell(ortuOffset + 1 + i).font = {
          name: EXCEL_FONT_FAMILY,
          size: 10,
          italic: true,
          color: { argb: EXCEL_COLORS.danger },
        };
      });

      rowNum++;
    });

    const columnWidths = computeColumnWidths(headerLabels, allRowsDisplayValues, {
      minWidth: 8,
      maxWidth: 40,
      padding: 2,
    });
    applyColumnWidths(worksheet, columnWidths);
    applyManualColumnWidths(worksheet, totalCols);
    setupPrintOptions(worksheet, {
      orientation: "landscape",
      freezeHeaderRow: headerRowNumber,
    });

    const fileName =
      students.length === 1
        ? `Kelengkapan_Data_${students[0].full_name.replace(/\s+/g, "_")}.xlsx`
        : `Kelengkapan_Data_Siswa_${students.length}_Siswa.xlsx`;

    await downloadWorkbook(workbook, fileName);

    return { success: true };
  } catch (error) {
    console.error("❌ Error exportStudentProfileExcel:", error);
    return { success: false, message: error.message };
  }
}

export default exportStudentProfileExcel;
