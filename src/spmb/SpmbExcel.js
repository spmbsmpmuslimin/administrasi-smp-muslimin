import ExcelJS from "exceljs";
import {
  EXCEL_COLORS,
  addLetterhead,
  styleTableHeaderRow,
  styleTableDataRow,
  downloadWorkbook,
  autoFitColumns,
  setupPrintOptions,
  guardHasData,
} from "../utils/excelExportKit";

/**
 * 🎓 SPMB Excel Export Utilities
 * Utility functions untuk export data SPMB ke Excel
 */

/**
 * Helper: Format tanggal ke DD-MM-YYYY
 */
const formatDateToDDMMYYYY = (dateString) => {
  if (!dateString || dateString === "-") return "-";

  try {
    if (dateString.includes("-")) {
      const [year, month, day] = dateString.split("-");
      return `${day.padStart(2, "0")}-${month.padStart(2, "0")}-${year}`;
    }
    return dateString;
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
};

/**
 * Helper: Get current academic year
 */
const getCurrentAcademicYear = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  if (currentMonth >= 7) {
    return `${currentYear + 1}/${currentYear + 2}`;
  } else {
    return `${currentYear}/${currentYear + 1}`;
  }
};

// 🔥 Kategori skor diagnostik -- HARUS SAMA PERSIS sama:
//   1. KATEGORI_OPTIONS di src/spmb/DiagnostikModal.js
//   2. CHECK constraint kolom kategori_baca_latin & kategori_mengaji di
//      tabel siswa_baru (lihat migration SQL-nya)
// Kalau salah satu diubah, tiga-tiganya harus diubah bareng.
const DIAGNOSTIK_KATEGORI_OPTIONS = ["Lancar", "Cukup Lancar", "Kurang Lancar", "Belum Bisa"];

/**
 * 📊 Export ALL Students (Single Sheet)
 * Export semua data siswa baru ke Excel dengan format lengkap
 */
export const exportAllStudents = async (allStudents, totalStudents, showToast) => {
  if (
    !guardHasData(allStudents, {
      showToast,
      message: "Tidak ada data untuk di-export",
    })
  ) {
    return false;
  }

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Data Calon Siswa");

    // Set column widths
    worksheet.columns = [
      { width: 5 }, // No
      { width: 30 }, // Nama
      { width: 15 }, // JK
      { width: 25 }, // Tempat Lahir
      { width: 15 }, // Tanggal Lahir
      { width: 25 }, // Asal SD
      { width: 15 }, // NISN
      { width: 25 }, // Nama Ayah
      { width: 20 }, // Pekerjaan Ayah
      { width: 20 }, // Pendidikan Ayah
      { width: 25 }, // Nama Ibu
      { width: 20 }, // Pekerjaan Ibu
      { width: 20 }, // Pendidikan Ibu
      { width: 18 }, // No HP
      { width: 100 }, // Alamat
    ];

    // Get statistics
    const totalLaki = allStudents.filter((s) => s.jenis_kelamin === "L").length;
    const totalPerempuan = allStudents.filter((s) => s.jenis_kelamin === "P").length;
    const academicYear = getCurrentAcademicYear();
    const currentDate = new Date().toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Letterhead standar (nama sekolah + judul + metadata) via kit
    const nextRow = addLetterhead(worksheet, {
      title: `DATA CALON SISWA BARU SMP TAHUN AJARAN ${academicYear}`,
      mergeCols: 15,
      metaLines: [
        `Tanggal Export: ${currentDate}`,
        `Total Data Siswa Baru: ${totalStudents} siswa`,
        `Siswa Laki-laki: ${totalLaki} siswa`,
        `Siswa Perempuan: ${totalPerempuan} siswa`,
      ],
    });

    // Header tabel
    const headers = [
      "No.",
      "Nama Lengkap",
      "Jenis Kelamin",
      "Tempat Lahir",
      "Tanggal Lahir",
      "Asal SD",
      "NISN",
      "Nama Ayah",
      "Pekerjaan Ayah",
      "Pendidikan Ayah",
      "Nama Ibu",
      "Pekerjaan Ibu",
      "Pendidikan Ibu",
      "No. HP Orang Tua",
      "Alamat Lengkap",
    ];

    const headerRow = worksheet.getRow(nextRow);
    headerRow.values = headers;
    styleTableHeaderRow(headerRow);

    // Print setup: landscape (kolomnya banyak & lebar) + freeze biar header
    // tabel tetap kelihatan pas discroll / dicetak berhalaman-halaman
    setupPrintOptions(worksheet, {
      orientation: "landscape",
      freezeHeaderRow: nextRow,
    });

    // Data rows
    allStudents.forEach((student, index) => {
      const row = worksheet.getRow(nextRow + 1 + index);

      row.values = [
        index + 1,
        student.nama_lengkap || "-",
        student.jenis_kelamin || "-",
        student.tempat_lahir || "-",
        formatDateToDDMMYYYY(student.tanggal_lahir),
        student.asal_sekolah || "-",
        student.nisn && student.nisn !== "-" ? student.nisn : "-",
        student.nama_ayah || "-",
        student.pekerjaan_ayah || "-",
        student.pendidikan_ayah || "-",
        student.nama_ibu || "-",
        student.pekerjaan_ibu || "-",
        student.pendidikan_ibu || "-",
        student.no_hp || "-",
        student.alamat || "-",
      ];

      styleTableDataRow(row, index, [1, 3], [7]); // No & JK di-center-in; NISN dipaksa text
    });

    // Download
    const fileName = `Data_Siswa_SMP_Muslimin_Cililin_${academicYear.replace("/", "-")}_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    await downloadWorkbook(workbook, fileName);

    if (showToast) {
      showToast(`Data berhasil di-export: ${fileName}`, "success");
    }

    return true;
  } catch (error) {
    console.error("Error exporting all students:", error);
    if (showToast) {
      showToast("Gagal export data. Silakan coba lagi.", "error");
    }
    return false;
  }
};

/**
 * 🎓 Export Class Division (Multi-Sheet)
 * Export pembagian kelas dengan NIS TERISI
 * Format: No | NIS | Nama | Kelas | Jenis Kelamin
 */
export const exportClassDivision = async (classDistribution, showToast) => {
  if (
    !guardHasData(Object.keys(classDistribution || {}), {
      showToast,
      message: "Tidak ada data pembagian kelas untuk di-export",
    })
  ) {
    return false;
  }

  try {
    const workbook = new ExcelJS.Workbook();
    const academicYear = getCurrentAcademicYear();
    const currentDate = new Date().toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Urutkan kelas berdasarkan nama (7A, 7B, 7C, dst)
    const sortedClasses = Object.keys(classDistribution).sort();

    // Buat sheet untuk setiap kelas
    sortedClasses.forEach((className) => {
      const students = classDistribution[className];
      const worksheet = workbook.addWorksheet(`Kelas ${className}`);

      // Set column widths
      worksheet.columns = [
        { width: 5 }, // No
        { width: 18 }, // NIS 🔥 TERISI
        { width: 35 }, // Nama
        { width: 12 }, // Kelas
        { width: 15 }, // Jenis Kelamin
      ];

      // Calculate statistics
      const totalLaki = students.filter((s) => s.jenis_kelamin === "L").length;
      const totalPerempuan = students.filter((s) => s.jenis_kelamin === "P").length;

      // Letterhead standar via kit
      const nextRow = addLetterhead(worksheet, {
        title: `DAFTAR SISWA KELAS ${className} - TAHUN AJARAN ${academicYear}`,
        mergeCols: 5,
        metaLines: [
          `Tanggal Export: ${currentDate}`,
          `Total Siswa: ${students.length} siswa`,
          `Laki-laki: ${totalLaki} siswa`,
          `Perempuan: ${totalPerempuan} siswa`,
        ],
      });

      // Header tabel -- pakai accentPurple biar beda dari sheet data utama,
      // sesuai konvensi warna di excelExportKit
      const headers = ["No.", "NIS", "Nama Lengkap", "Kelas", "Jenis Kelamin"];
      const headerRow = worksheet.getRow(nextRow);
      headerRow.values = headers;
      styleTableHeaderRow(headerRow, { fillColor: EXCEL_COLORS.accentPurple });

      // Print setup: portrait cukup (cuma 5 kolom), freeze header tabel
      setupPrintOptions(worksheet, {
        orientation: "portrait",
        freezeHeaderRow: nextRow,
      });

      // Data rows - Sort berdasarkan NIS dulu, kalau sama baru nama
      const sortedStudents = [...students].sort((a, b) => {
        const nisA = a.nis || "";
        const nisB = b.nis || "";

        if (nisA !== nisB) {
          return nisA.localeCompare(nisB, undefined, { numeric: true });
        }

        return (a.nama_lengkap || "").localeCompare(b.nama_lengkap || "");
      });

      sortedStudents.forEach((student, index) => {
        const row = worksheet.getRow(nextRow + 1 + index);
        row.values = [
          index + 1,
          student.nis || "-", // 🔥 NIS TERISI DARI DATA SISWA
          student.nama_lengkap || "-",
          className,
          student.jenis_kelamin || "-",
        ];

        styleTableDataRow(row, index, [1, 2, 4, 5], [2]); // NIS (kolom 2) dipaksa text
      });

      // Tambahkan baris kosong untuk tanda tangan
      const signatureLabelRowNum = nextRow + sortedStudents.length + 3;
      worksheet.mergeCells(`D${signatureLabelRowNum}:E${signatureLabelRowNum}`);
      const signCell = worksheet.getCell(`D${signatureLabelRowNum}`);
      signCell.value = "Wali Kelas";
      signCell.alignment = { horizontal: "center", vertical: "middle" };
      signCell.font = { bold: true, size: 11 };

      const signatureNameRowNum = nextRow + sortedStudents.length + 8;
      worksheet.mergeCells(`D${signatureNameRowNum}:E${signatureNameRowNum}`);
      const signNameCell = worksheet.getCell(`D${signatureNameRowNum}`);
      signNameCell.value = "(............................)";
      signNameCell.alignment = { horizontal: "center", vertical: "middle" };
      signNameCell.font = { size: 11 };
    });

    // Download
    const fileName = `Pembagian_Kelas_7_TA_${academicYear.replace("/", "-")}_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    await downloadWorkbook(workbook, fileName);

    if (showToast) {
      showToast(
        `✅ Berhasil export ${sortedClasses.length} kelas dengan NIS: ${fileName}`,
        "success"
      );
    }

    return true;
  } catch (error) {
    console.error("Error exporting class division:", error);
    if (showToast) {
      showToast("❌ Gagal export pembagian kelas. Silakan coba lagi.", "error");
    }
    return false;
  }
};

/**
 * 📋 Export Template Skor Diagnostik
 * Bikin file Excel isian buat input skor diagnostik (akademik, baca latin,
 * mengaji) secara massal -- alternatif dari isi satu-satu lewat
 * DiagnostikModal.js. Dipasangkan sama importDiagnostikScores() di bawah:
 * export -> TU isi manual di Excel -> import balik.
 *
 * Baris data DI-PREFILL sama skor yang sudah ada (kalau ada), jadi bisa
 * juga dipakai buat koreksi massal, bukan cuma input pertama kali.
 *
 * PENTING: kolom "No. Pendaftaran" JANGAN diubah TU pas isi manual --
 * dipakai sebagai kunci matching pas file-nya di-import balik lewat
 * importDiagnostikScores().
 *
 * @param {Array} allStudents - data siswa dari tabel siswa_baru
 * @param {Function} [showToast]
 * @returns {Promise<boolean>}
 */
export const exportDiagnostikTemplate = async (allStudents, showToast) => {
  if (
    !guardHasData(allStudents, {
      showToast,
      message: "Tidak ada data siswa untuk dibuatkan template",
    })
  ) {
    return false;
  }

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Template Skor Diagnostik");

    worksheet.columns = [
      { width: 22 }, // No. Pendaftaran
      { width: 30 }, // Nama Lengkap
      { width: 18 }, // Skor Akademik
      { width: 20 }, // Kategori Baca Latin
      { width: 26 }, // Kategori Mengaji
    ];

    const currentDate = new Date().toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Letterhead standar via kit, dikasih catatan penting soal cara isi
    const nextRow = addLetterhead(worksheet, {
      title: "TEMPLATE INPUT SKOR TEST DIAGNOSTIK",
      mergeCols: 5,
      metaLines: [
        `Tanggal Export: ${currentDate}`,
        `Total Siswa: ${allStudents.length} siswa`,
        `PENTING: Jangan ubah kolom "No. Pendaftaran" -- dipakai buat mencocokkan data pas di-import balik.`,
        `Kategori diisi lewat dropdown: ${DIAGNOSTIK_KATEGORI_OPTIONS.join(" / ")}`,
      ],
    });

    // Header tabel -- pakai accentPurple biar konsisten sama warna tombol
    // "Skor Diagnostik" di DiagnostikModal.js / StudentList.js
    const headers = [
      "No. Pendaftaran",
      "Nama Lengkap",
      "Skor Akademik (0-100)",
      "Kategori Baca Latin",
      "Kategori Mengaji",
    ];
    const headerRow = worksheet.getRow(nextRow);
    headerRow.values = headers;
    styleTableHeaderRow(headerRow, { fillColor: EXCEL_COLORS.accentPurple });

    // Portrait cukup (cuma 5 kolom), freeze header tabel
    setupPrintOptions(worksheet, {
      orientation: "portrait",
      freezeHeaderRow: nextRow,
    });

    // Urutkan berdasarkan nama biar gampang dicari TU pas isi manual
    const sortedStudents = [...allStudents].sort((a, b) =>
      (a.nama_lengkap || "").localeCompare(b.nama_lengkap || "")
    );

    const firstDataRow = nextRow + 1;
    const lastDataRow = nextRow + sortedStudents.length;

    sortedStudents.forEach((student, index) => {
      const row = worksheet.getRow(firstDataRow + index);
      row.values = [
        student.no_pendaftaran || "-",
        student.nama_lengkap || "-",
        student.skor_akademik ?? "", // prefill kalau udah pernah diisi
        student.kategori_baca_latin || "",
        student.kategori_mengaji || "",
      ];

      styleTableDataRow(row, index, [3], [1]); // Skor di-center; No. Pendaftaran dipaksa text
    });

    // Dropdown (data validation) di kolom kategori, biar TU nggak salah
    // ketik kategori yang gak sesuai CHECK constraint di database.
    const kategoriFormula = `"${DIAGNOSTIK_KATEGORI_OPTIONS.join(",")}"`;
    for (let r = firstDataRow; r <= lastDataRow; r++) {
      ["D", "E"].forEach((col) => {
        worksheet.getCell(`${col}${r}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [kategoriFormula],
          showErrorMessage: true,
          errorTitle: "Kategori tidak valid",
          error: `Pilih salah satu: ${DIAGNOSTIK_KATEGORI_OPTIONS.join(", ")}`,
        };
      });
    }

    const fileName = `Template_Skor_Diagnostik_${new Date().toISOString().split("T")[0]}.xlsx`;
    await downloadWorkbook(workbook, fileName);

    if (showToast) {
      showToast(`Template berhasil di-export: ${fileName}`, "success");
    }

    return true;
  } catch (error) {
    console.error("Error exporting diagnostik template:", error);
    if (showToast) {
      showToast("Gagal export template. Silakan coba lagi.", "error");
    }
    return false;
  }
};

/**
 * 📥 Import Skor Diagnostik dari Excel
 * Parse file hasil isian template exportDiagnostikTemplate(), cocokkan
 * tiap baris ke siswa yang ada (matching by no_pendaftaran), dan validasi
 * nilainya (skor 0-100, kategori sesuai whitelist).
 *
 * TIDAK langsung nulis ke database -- fungsi ini cuma parse + validasi +
 * hasilkan preview. Caller (komponen UI, misal modal import) yang nentuin
 * kapan commit-nya: loop `rows` yang `errors.length === 0`, terus panggil
 * handler yang sama kayak `onSave` di DiagnostikModal.js /
 * `onSaveDiagnostik` di StudentList.js untuk tiap `matchedStudentId`.
 *
 * @param {File} file - file .xlsx hasil upload user (dari <input type="file">)
 * @param {Array} allStudents - data siswa saat ini, dipakai buat matching & validasi
 * @returns {Promise<{
 *   success: boolean,
 *   rows: Array<{
 *     rowNumber: number|null,
 *     no_pendaftaran: string,
 *     nama_lengkap: string,
 *     matchedStudentId: string|number|null,
 *     skor_akademik: number|null,
 *     kategori_baca_latin: string|null,
 *     kategori_mengaji: string|null,
 *     errors: string[],
 *   }>,
 *   validCount: number,
 *   errorCount: number,
 * }>}
 */
export const importDiagnostikScores = async (file, allStudents) => {
  const result = { success: false, rows: [], validCount: 0, errorCount: 0 };

  if (!file) {
    result.rows.push({ rowNumber: null, errors: ["File tidak ditemukan"] });
    result.errorCount = 1;
    return result;
  }

  try {
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      result.rows.push({
        rowNumber: null,
        errors: ["Sheet Excel kosong / tidak terbaca"],
      });
      result.errorCount = 1;
      return result;
    }

    // Cari baris header tabel ("No. Pendaftaran") -- posisinya bisa geser
    // tergantung berapa baris letterhead di atasnya.
    let headerRowNumber = null;
    worksheet.eachRow((row, rowNumber) => {
      if (headerRowNumber) return;
      const firstCell = (row.getCell(1).value || "").toString().trim().toLowerCase();
      if (firstCell === "no. pendaftaran") {
        headerRowNumber = rowNumber;
      }
    });

    if (!headerRowNumber) {
      result.rows.push({
        rowNumber: null,
        errors: [
          'Header "No. Pendaftaran" tidak ditemukan. Pastikan file ini hasil dari Export Template, bukan diketik ulang dari nol.',
        ],
      });
      result.errorCount = 1;
      return result;
    }

    // Index siswa by no_pendaftaran, buat matching cepat (O(1) per baris)
    const studentByNoPendaftaran = new Map(
      (allStudents || []).map((s) => [String(s.no_pendaftaran || "").trim(), s])
    );

    const lastRow = worksheet.lastRow ? worksheet.lastRow.number : headerRowNumber;

    for (let r = headerRowNumber + 1; r <= lastRow; r++) {
      const row = worksheet.getRow(r);

      const noPendaftaranRaw = row.getCell(1).value;
      const noPendaftaran = noPendaftaranRaw ? String(noPendaftaranRaw).trim() : "";

      const namaRaw = row.getCell(2).value;
      // Skip baris kosong total (misal sisa baris kosong di bawah tabel)
      if (!noPendaftaran && !namaRaw) continue;

      const namaLengkap = namaRaw ? String(namaRaw).trim() : "";
      const skorRaw = row.getCell(3).value;
      const kategoriLatinRaw = row.getCell(4).value;
      const kategoriMengajiRaw = row.getCell(5).value;

      const kategoriBacaLatin = kategoriLatinRaw ? String(kategoriLatinRaw).trim() : "";
      const kategoriMengaji = kategoriMengajiRaw ? String(kategoriMengajiRaw).trim() : "";

      const errors = [];

      const matchedStudent = studentByNoPendaftaran.get(noPendaftaran);
      if (!noPendaftaran) {
        errors.push("No. Pendaftaran kosong");
      } else if (!matchedStudent) {
        errors.push(`No. Pendaftaran "${noPendaftaran}" tidak ditemukan di data siswa`);
      }

      let skorAkademik = null;
      if (skorRaw !== null && skorRaw !== undefined && skorRaw !== "") {
        const num = typeof skorRaw === "number" ? skorRaw : parseFloat(skorRaw);
        if (isNaN(num) || num < 0 || num > 100) {
          errors.push("Skor Akademik harus angka 0-100");
        } else {
          skorAkademik = num;
        }
      }

      if (kategoriBacaLatin && !DIAGNOSTIK_KATEGORI_OPTIONS.includes(kategoriBacaLatin)) {
        errors.push(`Kategori Baca Latin "${kategoriBacaLatin}" tidak valid`);
      }
      if (kategoriMengaji && !DIAGNOSTIK_KATEGORI_OPTIONS.includes(kategoriMengaji)) {
        errors.push(`Kategori Mengaji "${kategoriMengaji}" tidak valid`);
      }

      result.rows.push({
        rowNumber: r,
        no_pendaftaran: noPendaftaran,
        nama_lengkap: namaLengkap,
        matchedStudentId: matchedStudent ? matchedStudent.id : null,
        skor_akademik: skorAkademik,
        kategori_baca_latin: kategoriBacaLatin || null,
        kategori_mengaji: kategoriMengaji || null,
        errors,
      });

      if (errors.length > 0) {
        result.errorCount += 1;
      } else {
        result.validCount += 1;
      }
    }

    result.success = result.rows.length > 0;
    return result;
  } catch (error) {
    console.error("Error importing diagnostik scores:", error);
    result.rows.push({
      rowNumber: null,
      errors: [`Gagal membaca file: ${error.message}`],
    });
    result.errorCount += 1;
    return result;
  }
};
