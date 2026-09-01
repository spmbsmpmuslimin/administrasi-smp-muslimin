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

/**
 * 📊 Export ALL Students (Single Sheet)
 * Export semua data siswa baru ke Excel dengan format lengkap
 */
export const exportAllStudents = async (
  allStudents,
  totalStudents,
  showToast,
) => {
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
    const totalPerempuan = allStudents.filter(
      (s) => s.jenis_kelamin === "P",
    ).length;
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
      const totalPerempuan = students.filter(
        (s) => s.jenis_kelamin === "P",
      ).length;

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
        "success",
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
