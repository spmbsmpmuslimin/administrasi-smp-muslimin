// StudentProfileExcel.js
// Export Excel kelengkapan data siswa (KelengkapanDataSiswa.js).
// Pasangan dari StudentProfilePDF.js -- data yang diterima SAMA PERSIS
// (hasil merge students + student_profile_details yang udah dilakuin di
// KelengkapanDataSiswa.js), tinggal dirender ke format beda.
//
// Kenapa layoutnya beda dari PDF:
// - PDF: 1 halaman per siswa (Field/Isian vertikal) -- enak buat dicetak &
//   diarsipkan per anak.
// - Excel: 1 BARIS per siswa, field jadi KOLOM -- ini bentuk yang lebih
//   berguna di Excel (bisa di-sort, di-filter per kolom, dicocokin ke data
//   lain), bukan sekadar versi digital dari PDF.
//
// Daftar kolom (DATA_SISWA_ROWS, DATA_ORANGTUA_ROWS, STATUS_LABEL) SENGAJA
// disamain isinya persis kayak di StudentProfilePDF.js, biar kolom yang
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
  autoFitColumns,
  setupPrintOptions,
  guardHasData,
  EXCEL_COLORS,
  EXCEL_FONT_FAMILY,
} from "../utils/excelExportKit";

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
  { key: "dusun", label: "Dusun" },
  { key: "kode_pos", label: "Kode Pos" },
  { key: "no_hp", label: "No. HP Siswa" },
  { key: "keterangan", label: "Keterangan" },
];

// Sama persis DATA_ORANGTUA_ROWS di StudentProfilePDF.js.
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
// { display, isEmpty } -- sama pola kayak getRowValue() di StudentProfilePDF.js.
function getRowValue(detail, row) {
  if (row.combine === "ttl") {
    const display = formatTempatTanggalLahir(detail);
    return { display, isEmpty: !display };
  }
  const raw = detail ? detail[row.key] : null;
  const isEmpty = !raw || String(raw).trim() === "";
  return { display: isEmpty ? null : raw, isEmpty };
}

// Kolom tetap: No, Nama, NIS, NISN, Kelas, Status. NISN sengaja ditaruh
// persis setelah NIS (lihat catatan di atas). Field DATA_SISWA_ROWS &
// DATA_ORANGTUA_ROWS nyusul setelahnya (lihat buildHeaderLabels).
const FIXED_COLS = ["No", "Nama", "NIS", "NISN", "Kelas", "Status Kelengkapan"];

function buildHeaderLabels() {
  return [
    ...FIXED_COLS,
    ...DATA_SISWA_ROWS.map((r) => r.label),
    ...DATA_ORANGTUA_ROWS.map((r) => r.label),
    "Terakhir Diperbarui",
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
// urut, kode, status). Dipasang SETELAH autoFitColumns supaya nggak
// ketimpa lebar dari teks judul letterhead yang di-merge lintas semua
// kolom (autoFitColumns kadang ngukur teks judul itu ke kolom pertama,
// makanya kolom "No" jadi lebar banget kalau dibiarin apa adanya).
const MANUAL_COLUMN_WIDTHS = {
  1: 6, // No
  3: 14, // NIS
  4: 14, // NISN
  5: 10, // Kelas
  6: 16, // Status Kelengkapan
};

function applyManualColumnWidths(worksheet) {
  Object.entries(MANUAL_COLUMN_WIDTHS).forEach(([colNumber, width]) => {
    const column = worksheet.getColumn(Number(colNumber));
    if (column) column.width = width;
  });
}

/**
 * Export Excel kelengkapan data untuk sekumpulan siswa, 1 baris per siswa,
 * field jadi kolom (beda dari PDF yang 1 halaman per siswa).
 * @param {Array<{id:string,full_name:string,nis:string,class_id:string,status:string,detail:Object|null}>} students
 * @param {{academicYear?:string, showToast?:Function}} [options] - academicYear format "2026/2027"
 * @returns {Promise<{success:boolean,message?:string}>}
 */
export async function exportStudentProfileExcel(students, options = {}) {
  const { academicYear, showToast } = options;

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

    // Lebar kolom sementara (bakal ditimpa autoFitColumns di akhir) --
    // wajib diisi duluan biar worksheet.columns punya entry yang bisa
    // di-iterate pas autoFitColumns jalan.
    worksheet.columns = headerLabels.map(() => ({ width: 16 }));

    let rowNum = addLetterhead(worksheet, {
      title: "DATA KELENGKAPAN DATA SISWA",
      mergeCols: totalCols,
      metaLines: [
        ...(academicYear ? [`TAHUN AJARAN ${academicYear}`] : []),
        `Total: ${students.length} siswa`,
      ],
    });

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
        STATUS_LABEL[statusKey] || "Belum Isi",
        ...siswaValues.map((v) => v.display || "Belum diisi"),
        ...ortuValues.map((v) => v.display || "Belum diisi"),
        updatedLabel || "-",
      ];

      const dataRow = worksheet.getRow(rowNum);
      dataRow.values = rowValues;
      // Kolom "No" (1) & "Status Kelengkapan" (6) di-center, sisanya rata kiri.
      styleTableDataRow(dataRow, idx, [1, 6], textColNumbers);

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

    autoFitColumns(worksheet, { minWidth: 8, maxWidth: 40 });
    applyManualColumnWidths(worksheet);
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
