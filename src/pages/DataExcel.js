// src/pages/DataExcel.js
import ExcelJS from "exceljs";
import {
  SCHOOL_NAME,
  EXCEL_COLORS,
  EXCEL_FONT_FAMILY,
  STANDARD_CELL_BORDER,
  addLetterhead,
  styleTableHeaderRow,
  styleTableDataRow,
  downloadWorkbook,
  setupPrintOptions,
  guardHasData,
} from "../utils/excelExportKit";

export class DataExcel {
  // Helper untuk mendapatkan tahun ajaran aktif
  static getTahunAjaranAktif() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    if (month >= 7) {
      return `${year}/${year + 1}`;
    } else {
      return `${year - 1}/${year}`;
    }
  }

  // Setup page A4 portrait + print options standar (pakai kit), lalu tempel
  // properti tambahan yang belum disediakan kit (paperSize A4, center
  // horizontal khusus buat sheet tertentu).
  static _setupPage(worksheet, { horizontalCentered = false, freezeHeaderRow = 6 } = {}) {
    setupPrintOptions(worksheet, { orientation: "portrait", freezeHeaderRow });
    worksheet.pageSetup.paperSize = 9; // A4
    if (horizontalCentered) worksheet.pageSetup.horizontalCentered = true;
  }

  // Tulis letterhead + table header standar, return baris pertama yang
  // siap dipakai buat data (baris setelah table header).
  static _writeLetterhead(worksheet, { title, mergeCols, headers }) {
    const tableHeaderRowNumber = addLetterhead(worksheet, {
      title,
      mergeCols,
      metaLines: [`TAHUN AJARAN ${this.getTahunAjaranAktif()}`],
    });

    const tableHeaderRow = worksheet.getRow(tableHeaderRowNumber);
    tableHeaderRow.height = 22;
    headers.forEach((header, index) => {
      tableHeaderRow.getCell(index + 1).value = header;
    });
    styleTableHeaderRow(tableHeaderRow);

    return tableHeaderRowNumber + 1; // baris pertama buat data
  }

  // ==================== FUNGSI EXPORT KELAS ====================

  static async exportClasses(classesData) {
    if (!guardHasData(classesData)) return;

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Data Kelas");

      this._setupPage(worksheet, { horizontalCentered: true });

      // ✅ COLUMN WIDTHS UNTUK PORTRAIT
      worksheet.columns = [
        { width: 6 }, // No.
        { width: 12 }, // Kelas
        { width: 15 }, // Tahun Ajaran
        { width: 25 }, // Wali Kelas
        { width: 12 }, // Jumlah Siswa
        { width: 12 }, // Laki-laki
        { width: 12 }, // Perempuan
      ];

      const headers = [
        "No.",
        "Kelas",
        "Tahun Ajaran",
        "Wali Kelas",
        "Jumlah Siswa",
        "Laki-laki",
        "Perempuan",
      ];
      const firstDataRow = this._writeLetterhead(worksheet, {
        title: "DATA KELAS",
        mergeCols: headers.length,
        headers,
      });

      // DATA KELAS
      classesData.forEach((kelas, index) => {
        const dataRow = worksheet.getRow(firstDataRow + index);
        dataRow.height = 18;

        const cells = [
          index + 1,
          kelas.Kelas || "-",
          kelas["Tahun Ajaran"] || "-",
          kelas["Wali Kelas"] || "Belum ditentukan",
          kelas["Jumlah Siswa"] || 0,
          kelas["Laki-laki"] || 0,
          kelas["Perempuan"] || 0,
        ];
        cells.forEach((value, cellIndex) => {
          dataRow.getCell(cellIndex + 1).value = value;
        });

        // ✅ KELAS: Center semua kolom
        styleTableDataRow(dataRow, index, [1, 2, 3, 4, 5, 6, 7]);
      });

      // ✅ BARIS TOTAL SISWA - paling bawah
      const totalSiswa = classesData.reduce((sum, k) => sum + (Number(k["Jumlah Siswa"]) || 0), 0);
      const totalLaki = classesData.reduce((sum, k) => sum + (Number(k["Laki-laki"]) || 0), 0);
      const totalPerempuan = classesData.reduce((sum, k) => sum + (Number(k["Perempuan"]) || 0), 0);

      const totalRowNumber = firstDataRow + classesData.length;
      const totalRow = worksheet.getRow(totalRowNumber);
      totalRow.height = 20;
      worksheet.mergeCells(`A${totalRowNumber}:D${totalRowNumber}`);
      totalRow.getCell(1).value = "TOTAL SISWA";
      totalRow.getCell(5).value = totalSiswa;
      totalRow.getCell(6).value = totalLaki;
      totalRow.getCell(7).value = totalPerempuan;

      totalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.font = { name: EXCEL_FONT_FAMILY, bold: true, size: 10 };
        cell.border = STANDARD_CELL_BORDER;
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: EXCEL_COLORS.primaryLight },
        };
        cell.alignment = {
          vertical: "middle",
          horizontal: colNumber === 1 ? "left" : "center",
        };
      });

      await downloadWorkbook(
        workbook,
        `Data_Kelas_${SCHOOL_NAME.replace(/\s+/g, "_")}_${this.getTahunAjaranAktif()}.xlsx`
      );
    } catch (error) {
      console.error("Error exporting Kelas Excel:", error);
      throw new Error("Gagal mengexport data kelas ke Excel");
    }
  }

  // ==================== FUNGSI EXPORT SISWA ====================

  // Helper generik buat semua varian export siswa (semua/jenjang/kelas/filter)
  // -- struktur tabelnya sama persis, cuma judul, data, dan nama file yang beda.
  static _studentsHeaders() {
    return ["No.", "NIS", "Nama", "Kelas", "Jenis Kelamin", "Status"];
  }

  static _writeStudentsSheet(worksheet, { title, studentsData }) {
    this._setupPage(worksheet);

    // ✅ COLUMN WIDTHS UNTUK PORTRAIT
    worksheet.columns = [
      { width: 6 }, // No.
      { width: 18 }, // NIS
      { width: 55 }, // Nama
      { width: 10 }, // Kelas
      { width: 20 }, // Jenis Kelamin
      { width: 10 }, // Status
    ];

    const headers = this._studentsHeaders();
    const firstDataRow = this._writeLetterhead(worksheet, {
      title,
      mergeCols: headers.length,
      headers,
    });

    studentsData.forEach((student, index) => {
      const dataRow = worksheet.getRow(firstDataRow + index);
      dataRow.height = 18;

      const cells = [
        index + 1,
        student.nis || "-",
        student.full_name || "-",
        student.class_id || "-",
        student.gender === "L" ? "Laki-laki" : "Perempuan",
        student.is_active ? "Aktif" : "Non-Aktif",
      ];
      cells.forEach((value, cellIndex) => {
        dataRow.getCell(cellIndex + 1).value = value;
      });

      // ✅ SISWA: Center semua kecuali Nama (kolom 3); NIS dipaksa text
      // biar angka nol di depan nggak hilang.
      styleTableDataRow(dataRow, index, [1, 2, 4, 5, 6], [2]);
    });
  }

  static async exportAllStudents(studentsData) {
    if (!guardHasData(studentsData)) return;

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Data Siswa");

      this._writeStudentsSheet(worksheet, { title: "DATA SISWA", studentsData });

      await downloadWorkbook(
        workbook,
        `Data_Siswa_${SCHOOL_NAME.replace(/\s+/g, "_")}_${this.getTahunAjaranAktif()}.xlsx`
      );
    } catch (error) {
      console.error("Error exporting Excel:", error);
      throw new Error("Gagal mengexport data ke Excel");
    }
  }

  static async exportByJenjang(studentsData, jenjang) {
    const filteredData = studentsData.filter((student) => student.class_id?.startsWith(jenjang));
    if (!guardHasData(filteredData)) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Kelas ${jenjang}`);

    this._writeStudentsSheet(worksheet, {
      title: `DATA SISWA KELAS ${jenjang}`,
      studentsData: filteredData,
    });

    await downloadWorkbook(
      workbook,
      `Data_Siswa_Kelas_${jenjang}_${SCHOOL_NAME.replace(/\s+/g, "_")}_${this.getTahunAjaranAktif()}.xlsx`
    );
  }

  static async exportByKelas(studentsData, kelas) {
    const filteredData = studentsData.filter((student) => student.class_id === kelas);
    if (!guardHasData(filteredData)) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(kelas);

    this._writeStudentsSheet(worksheet, {
      title: `DATA SISWA KELAS ${kelas}`,
      studentsData: filteredData,
    });

    await downloadWorkbook(
      workbook,
      `Data_Siswa_${kelas}_${SCHOOL_NAME.replace(/\s+/g, "_")}_${this.getTahunAjaranAktif()}.xlsx`
    );
  }

  static async exportByFilter(filteredData, selectedKelas, selectedJenjang, selectedGender) {
    if (!guardHasData(filteredData)) return;

    let title = "DATA SISWA";
    if (selectedKelas) {
      title = `DATA SISWA KELAS ${selectedKelas}`;
    } else if (selectedJenjang) {
      title = `DATA SISWA KELAS ${selectedJenjang}`;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Data Siswa");

    this._writeStudentsSheet(worksheet, { title, studentsData: filteredData });

    await downloadWorkbook(
      workbook,
      `Data_Siswa_Filter_${SCHOOL_NAME.replace(/\s+/g, "_")}_${this.getTahunAjaranAktif()}.xlsx`
    );
  }

  // ==================== FUNGSI EXPORT GURU ====================

  static async exportTeachers(teachersData) {
    if (!guardHasData(teachersData)) return;

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Data Guru");

      this._setupPage(worksheet);

      // ✅ COLUMN WIDTHS UNTUK PORTRAIT
      worksheet.columns = [
        { width: 6 }, // No.
        { width: 13 }, // Kode Guru
        { width: 32 }, // Nama Guru
        { width: 35 }, // Tugas/Mapel
        { width: 13 }, // Wali Kelas
        { width: 10 }, // Status
      ];

      const headers = ["No.", "Kode Guru", "Nama Guru", "Tugas/Mapel", "Wali Kelas", "Status"];
      const firstDataRow = this._writeLetterhead(worksheet, {
        title: "DATA GURU",
        mergeCols: headers.length,
        headers,
      });

      teachersData.forEach((guru, index) => {
        const dataRow = worksheet.getRow(firstDataRow + index);
        dataRow.height = 18;

        const cells = [
          index + 1,
          guru.teacher_id || "-",
          guru.full_name || "-",
          guru.mapel?.join(", ") || "Belum ada tugas",
          guru.walikelas !== "-" ? `KELAS ${guru.walikelas}` : "-",
          guru.is_active ? "Aktif" : "Nonaktif",
        ];
        cells.forEach((value, cellIndex) => {
          dataRow.getCell(cellIndex + 1).value = value;
        });

        // ✅ GURU: Center No.(1), Kode Guru(2), Wali Kelas(5), Status(6).
        // Nama Guru(3) & Tugas/Mapel(4) tetap left. Kode Guru dipaksa text.
        styleTableDataRow(dataRow, index, [1, 2, 5, 6], [2]);
      });

      await downloadWorkbook(
        workbook,
        `Data_Guru_${SCHOOL_NAME.replace(/\s+/g, "_")}_${this.getTahunAjaranAktif()}.xlsx`
      );
    } catch (error) {
      console.error("Error exporting Guru Excel:", error);
      throw new Error("Gagal mengexport data guru ke Excel");
    }
  }
}
