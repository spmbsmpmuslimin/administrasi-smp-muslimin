// src/pages/GradesExcel.js - Utility Functions for Excel Import/Export
import ExcelJS from "exceljs";
import { supabase } from "../../supabaseClient";

// ✅ IMPORT ACADEMIC YEAR SERVICE
import {
  getActiveAcademicInfo,
  getActiveSemester,
  getActiveYearString,
  getActiveAcademicYearId,
  applyAcademicFilters,
  formatSemesterDisplay,
} from "../../services/academicYearService";

// Calculate NA
const calculateNA = (nh1, nh2, nh3, psts, psas) => {
  const nhValues = [nh1, nh2, nh3].filter((n) => n > 0);
  const nhAvg = nhValues.length > 0 ? nhValues.reduce((a, b) => a + b, 0) / nhValues.length : 0;
  const na = nhAvg * 0.4 + parseFloat(psts || 0) * 0.3 + parseFloat(psas || 0) * 0.3;
  return na.toFixed(2);
};

// ✅ REVISI: Export to Excel dengan data semester dari Grades.js
export const exportToExcel = async (params) => {
  const {
    students,
    grades,
    selectedSubject,
    selectedClass,
    className,
    teacherId,
    selectedSemesterInfo, // ✅ DITERIMA DARI GRADES.JS
    isSubjectTeacher = true,
  } = params;

  try {
    // ✅ GUNAKAN DATA DARI selectedSemesterInfo
    if (!selectedSemesterInfo) {
      throw new Error("Informasi semester tidak ditemukan");
    }

    const academicYear = selectedSemesterInfo.year;
    const semester = selectedSemesterInfo.semester;
    const semesterText = formatSemesterDisplay(semester);
    const displayText = `${academicYear} - ${semesterText}`;

    // Fetch teacher full name
    let teacherFullName = "";
    if (teacherId) {
      const { data: teacherUser, error: teacherError } = await supabase
        .from("users")
        .select("full_name")
        .eq("teacher_id", teacherId)
        .single();

      if (teacherUser) {
        teacherFullName = teacherUser.full_name;
      } else if (teacherError) {
        console.error("Error fetching teacher name for export:", teacherError);
      }
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Nilai Siswa");

    // HEADER: Nama Sekolah
    worksheet.mergeCells("A1:I1");
    const schoolCell = worksheet.getCell("A1");
    schoolCell.value = "SMP MUSLIMIN CILILIN";
    schoolCell.font = { size: 14, bold: true };
    schoolCell.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getRow(1).height = 25;

    // Judul Daftar Nilai
    worksheet.mergeCells("A2:I2");
    const titleCell = worksheet.getCell("A2");
    titleCell.value = `DAFTAR NILAI MATA PELAJARAN ${selectedSubject.toUpperCase()} - ${className}`;
    titleCell.font = { size: 12, bold: true };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getRow(2).height = 20;

    // Tahun Ajaran & Semester
    worksheet.mergeCells("A3:I3");
    const academicCell = worksheet.getCell("A3");
    academicCell.value = displayText;
    academicCell.font = { size: 11, bold: true };
    academicCell.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getRow(3).height = 20;

    // Info semester lengkap
    worksheet.mergeCells("A4:I4");
    const detailCell = worksheet.getCell("A4");
    detailCell.value = `Tahun Ajaran: ${academicYear} | ${semesterText}`;
    detailCell.font = { size: 10, italic: true };
    detailCell.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getRow(4).height = 15;

    // Tanggal ekspor
    worksheet.mergeCells("A5:I5");
    const dateCell = worksheet.getCell("A5");
    const now = new Date();
    dateCell.value = `Diekspor: ${now.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`;
    dateCell.font = { size: 9 };
    dateCell.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getRow(5).height = 15;

    // SPACING
    worksheet.getRow(6).height = 20;

    // Headers Tabel
    const headers = ["No", "NIS", "Nama Siswa", "NH1", "NH2", "NH3", "PSTS", "PSAS", "NA"];
    const headerRow = worksheet.getRow(7);

    // STYLING PER CELL
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: "FFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "10B981" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    headerRow.height = 25;

    // Column widths
    worksheet.columns = [
      { width: 6 },
      { width: 15 },
      { width: 38 },
      { width: 8 },
      { width: 8 },
      { width: 8 },
      { width: 8 },
      { width: 8 },
      { width: 8 },
    ];

    // Add students data
    students.forEach((student, index) => {
      const studentGrades = grades[student.id] || {};
      const na = studentGrades.na || "0.00";

      const row = worksheet.addRow([
        index + 1,
        student.nis,
        student.full_name,
        studentGrades.NH1?.score || "",
        studentGrades.NH2?.score || "",
        studentGrades.NH3?.score || "",
        studentGrades.PSTS?.score || "",
        studentGrades.PSAS?.score || "",
        na,
      ]);

      // Style rows
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };

        if (colNumber <= 3) {
          cell.alignment = { horizontal: "left", vertical: "middle" };
        } else {
          cell.alignment = { horizontal: "center", vertical: "middle" };
        }

        // Color coding for NA
        if (colNumber === 9) {
          const naValue = parseFloat(na);
          if (naValue < 70) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FEE2E2" },
            };
            cell.font = { bold: true, color: { argb: "DC2626" } };
          } else if (naValue < 85) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FEF3C7" },
            };
            cell.font = { bold: true, color: { argb: "D97706" } };
          } else {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "D1FAE5" },
            };
            cell.font = { bold: true, color: { argb: "059669" } };
          }
        }
      });
    });

    // FOOTER SECTION
    const lastTableRow = 7 + students.length;

    // 2 BARIS KOSONG
    worksheet.getRow(lastTableRow + 1).height = 20;
    worksheet.getRow(lastTableRow + 2).height = 20;

    // FOOTER - di kolom F
    const footerRow1 = worksheet.getRow(lastTableRow + 3);
    const footerCell1 = footerRow1.getCell(6);
    footerCell1.value = "Mengetahui,";
    footerCell1.font = { bold: true };

    const footerRow2 = worksheet.getRow(lastTableRow + 4);
    const footerCell2 = footerRow2.getCell(6);

    if (isSubjectTeacher) {
      footerCell2.value = "Guru Mata Pelajaran";
    } else {
      footerCell2.value = "Wali Kelas";
    }
    footerCell2.font = { bold: true };

    // BARIS KOSONG UNTUK TANDA TANGAN
    worksheet.getRow(lastTableRow + 5).height = 20;

    // NAMA GURU/WALI KELAS
    const footerRow3 = worksheet.getRow(lastTableRow + 6);
    const footerCell3 = footerRow3.getCell(6);
    footerCell3.value = `(${teacherFullName})`;
    footerCell3.font = { bold: true };

    // ✅ REVISI: Filename dengan format semester
    const safeSubject = selectedSubject.replace(/[^a-zA-Z0-9]/g, "_");
    const safeClass = selectedClass.replace(/[^a-zA-Z0-9]/g, "_");
    const safeYear = academicYear.replace(/\//g, "-");

    const fileName = `Nilai_${safeSubject}_${safeClass}_${safeYear}_S${semester}_${now.getFullYear()}${(
      now.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}.xlsx`;

    // Generate & download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);

    return {
      success: true,
      message: `Data nilai berhasil diekspor untuk ${displayText}!`,
      fileName: fileName,
    };
  } catch (error) {
    console.error("❌ Error in exportToExcel:", error);
    return {
      success: false,
      message: "Gagal mengekspor data: " + error.message,
    };
  }
};

// ✅ REVISI: Import from Excel dengan data semester dari Grades.js
export const importFromExcel = async (file, params) => {
  const {
    students,
    teacherId,
    selectedSubject,
    selectedClass,
    selectedSemesterInfo, // ✅ DITERIMA DARI GRADES.JS
  } = params;

  try {
    // ✅ GUNAKAN DATA DARI selectedSemesterInfo
    if (!selectedSemesterInfo) {
      throw new Error("Informasi semester tidak ditemukan");
    }

    const academicYear = selectedSemesterInfo.year;
    const semester = selectedSemesterInfo.semester;
    const academicYearId = selectedSemesterInfo.id; // ✅ ID semester

    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new Error("Sheet tidak ditemukan dalam file Excel");
    }

    // Get teacher UUID
    const { data: teacherUser, error: teacherError } = await supabase
      .from("users")
      .select("id")
      .eq("teacher_id", teacherId)
      .single();

    if (teacherError) throw teacherError;

    // Create NIS to student ID map
    const nisToIdMap = {};
    students.forEach((student) => {
      nisToIdMap[student.nis] = student.id;
    });

    const gradesToInsert = [];
    let processedCount = 0;
    let skippedCount = 0;
    const errors = [];
    const warnings = [];

    // Validasi header file Excel
    const expectedHeaders = ["No", "NIS", "Nama Siswa", "NH1", "NH2", "NH3", "PSTS", "PSAS", "NA"];
    const actualHeaders = [];

    // Ambil header dari row 7
    const headerRow = worksheet.getRow(7);
    for (let i = 1; i <= 9; i++) {
      actualHeaders.push(headerRow.getCell(i).value?.toString() || "");
    }

    // Bandingkan headers
    let headersMatch = true;
    for (let i = 0; i < expectedHeaders.length; i++) {
      if (actualHeaders[i] !== expectedHeaders[i]) {
        headersMatch = false;
        warnings.push(
          `Kolom ${i + 1} diharapkan "${expectedHeaders[i]}" tetapi ditemukan "${actualHeaders[i]}"`
        );
      }
    }

    if (!headersMatch) {
      warnings.unshift(
        "Format file Excel tidak sesuai template standar. Import mungkin mengalami masalah."
      );
    }

    // ✅ VALIDASI: Cek apakah file untuk semester yang benar
    const semesterInFile = worksheet.getCell("A3")?.value?.toString() || "";
    const semesterText = formatSemesterDisplay(semester);
    const expectedDisplay = `${academicYear} - ${semesterText}`;

    if (semesterInFile.includes(academicYear) && semesterInFile.includes(semesterText)) {
      console.log("✅ File Excel sesuai dengan periode akademik");
    } else {
      warnings.push(
        `Perhatian: File Excel mungkin untuk periode akademik lain. Sedang mengimport untuk ${expectedDisplay}`
      );
    }

    // Process rows (start from row 8, skip headers)
    const startRow = 8;
    let lastRow = worksheet.rowCount;

    // Cari row terakhir yang berisi data
    for (let i = worksheet.rowCount; i >= startRow; i--) {
      const nis = worksheet.getRow(i).getCell(2).value?.toString().trim();
      if (nis) {
        lastRow = i;
        break;
      }
    }

    for (let i = startRow; i <= lastRow; i++) {
      const row = worksheet.getRow(i);

      // Skip empty rows
      const nis = row.getCell(2).value?.toString().trim();
      if (!nis) continue;

      const studentId = nisToIdMap[nis];
      if (!studentId) {
        skippedCount++;
        errors.push(`Baris ${i}: NIS ${nis} tidak ditemukan di kelas ${selectedClass}`);
        continue;
      }

      // Get grades
      const nh1 = parseFloat(row.getCell(4).value) || 0;
      const nh2 = parseFloat(row.getCell(5).value) || 0;
      const nh3 = parseFloat(row.getCell(6).value) || 0;
      const psts = parseFloat(row.getCell(7).value) || 0;
      const psas = parseFloat(row.getCell(8).value) || 0;

      // Validasi scores
      const scores = { NH1: nh1, NH2: nh2, NH3: nh3, PSTS: psts, PSAS: psas };
      let hasValidScore = false;
      let studentErrors = [];

      for (const [type, score] of Object.entries(scores)) {
        if (score > 0) {
          if (score < 0 || score > 100) {
            studentErrors.push(`${type}: ${score} (harus 0-100)`);
            continue;
          }

          hasValidScore = true;
          gradesToInsert.push({
            student_id: studentId,
            teacher_id: teacherUser.id,
            class_id: selectedClass,
            subject: selectedSubject,
            assignment_type: type,
            score: score,
            semester: semester,
            academic_year: academicYear,
            academic_year_id: academicYearId, // ✅ PAKAI ID SEMESTER
          });
        }
      }

      if (hasValidScore) {
        processedCount++;
      } else if (studentErrors.length > 0) {
        errors.push(`Baris ${i}: NIS ${nis} - ${studentErrors.join(", ")}`);
      }
    }

    if (gradesToInsert.length === 0) {
      throw new Error(
        "Tidak ada data nilai yang valid untuk diimport. Pastikan format Excel sesuai dan nilai antara 0-100."
      );
    }

    // ✅ DELETE DATA LAMA DENGAN FILTER YANG BENAR
    let deleteQuery = supabase
      .from("grades")
      .delete()
      .eq("teacher_id", teacherUser.id)
      .eq("subject", selectedSubject)
      .eq("class_id", selectedClass)
      .eq("semester", semester)
      .eq("academic_year_id", academicYearId); // ✅ FILTER BY SEMESTER ID

    await deleteQuery;

    // Insert new grades in batches
    const BATCH_SIZE = 10;
    let successCount = 0;
    let insertedRows = [];

    for (let i = 0; i < gradesToInsert.length; i += BATCH_SIZE) {
      const batch = gradesToInsert.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase.from("grades").insert(batch).select();

      if (error) {
        throw new Error(`Gagal menyimpan batch: ${error.message}`);
      }

      if (data) {
        insertedRows.push(...data);
      }
      successCount += batch.length;
    }

    // ✅ Hitung statistik NA setelah import
    let totalNA = 0;
    let countNA = 0;
    let minNA = 100;
    let maxNA = 0;

    // Group nilai per siswa untuk hitung NA
    const studentScores = {};
    insertedRows.forEach((row) => {
      if (!studentScores[row.student_id]) {
        studentScores[row.student_id] = {
          NH1: 0,
          NH2: 0,
          NH3: 0,
          PSTS: 0,
          PSAS: 0,
        };
      }
      studentScores[row.student_id][row.assignment_type] = row.score;
    });

    // Hitung NA untuk setiap siswa
    Object.values(studentScores).forEach((scores) => {
      const na = calculateNA(scores.NH1, scores.NH2, scores.NH3, scores.PSTS, scores.PSAS);
      const naValue = parseFloat(na);
      totalNA += naValue;
      countNA++;
      minNA = Math.min(minNA, naValue);
      maxNA = Math.max(maxNA, naValue);
    });

    const avgNA = countNA > 0 ? (totalNA / countNA).toFixed(2) : 0;

    let message = `✅ Berhasil mengimport ${successCount} nilai dari ${processedCount} siswa untuk ${academicYear} Semester ${semester}!`;

    if (countNA > 0) {
      message += ` Rata-rata NA: ${avgNA} (Min: ${minNA.toFixed(2)}, Max: ${maxNA.toFixed(2)})`;
    }

    if (skippedCount > 0) {
      message += `\n⚠️ ${skippedCount} siswa dilewati`;
    }

    if (warnings.length > 0) {
      message += `\n📝 ${warnings.length} peringatan`;
    }

    return {
      success: true,
      message,
      errors,
      warnings,
      stats: {
        totalInserted: successCount,
        studentsProcessed: processedCount,
        studentsSkipped: skippedCount,
        averageNA: avgNA,
        minNA: minNA.toFixed(2),
        maxNA: maxNA.toFixed(2),
        academicPeriod: `${academicYear} Semester ${semester}`,
      },
    };
  } catch (error) {
    console.error("❌ Error in importFromExcel:", error);
    return {
      success: false,
      message: "Gagal mengimport data: " + error.message,
    };
  }
};

// ✅ Fungsi untuk validate Excel template
export const validateExcelTemplate = async (file, semesterInfo = null) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      return {
        isValid: false,
        message: "Sheet tidak ditemukan dalam file Excel",
      };
    }

    // Cek header
    const expectedHeaders = ["No", "NIS", "Nama Siswa", "NH1", "NH2", "NH3", "PSTS", "PSAS", "NA"];
    const headerRow = worksheet.getRow(7);
    const actualHeaders = [];

    for (let i = 1; i <= 9; i++) {
      actualHeaders.push(headerRow.getCell(i).value?.toString() || "");
    }

    let isValid = true;
    const validationErrors = [];

    for (let i = 0; i < expectedHeaders.length; i++) {
      if (actualHeaders[i] !== expectedHeaders[i]) {
        isValid = false;
        validationErrors.push(
          `Kolom ${i + 1}: Diharapkan "${expectedHeaders[i]}" tetapi ditemukan "${
            actualHeaders[i]
          }"`
        );
      }
    }

    // Validasi periode akademik jika ada semesterInfo
    if (semesterInfo) {
      const semesterText = formatSemesterDisplay(semesterInfo.semester);
      const expectedDisplay = `${semesterInfo.year} - ${semesterText}`;
      const fileAcademicInfo = worksheet.getCell("A3")?.value?.toString() || "";

      if (fileAcademicInfo && !fileAcademicInfo.includes(semesterInfo.year)) {
        validationErrors.push(
          `File mungkin untuk tahun ajaran lain. Sistem aktif: ${expectedDisplay}`
        );
      }
    }

    return {
      isValid,
      message: isValid ? "Template Excel valid" : "Template Excel tidak valid",
      errors: validationErrors,
    };
  } catch (error) {
    return {
      isValid: false,
      message: "Gagal memvalidasi file: " + error.message,
    };
  }
};

// ✅ Fungsi untuk generate template Excel
export const generateExcelTemplate = async (params) => {
  const {
    students,
    selectedSubject,
    selectedClass,
    className,
    selectedSemesterInfo, // ✅ DITERIMA DARI GRADES.JS
  } = params;

  try {
    // ✅ GUNAKAN DATA DARI selectedSemesterInfo
    if (!selectedSemesterInfo) {
      throw new Error("Informasi semester tidak ditemukan");
    }

    const academicYear = selectedSemesterInfo.year;
    const semester = selectedSemesterInfo.semester;
    const semesterText = formatSemesterDisplay(semester);
    const displayText = `${academicYear} - ${semesterText}`;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Template Nilai");

    // Header Template
    worksheet.mergeCells("A1:I1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = "TEMPLATE IMPORT NILAI - SMP MUSLIMIN CILILIN";
    titleCell.font = { size: 14, bold: true, color: { argb: "FFFFFF" } };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "2563EB" },
    };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getRow(1).height = 25;

    // Info Mata Pelajaran dan Kelas
    worksheet.mergeCells("A2:I2");
    const subjectCell = worksheet.getCell("A2");
    subjectCell.value = `Mata Pelajaran: ${selectedSubject} | Kelas: ${className}`;
    subjectCell.font = { size: 11, bold: true };
    subjectCell.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getRow(2).height = 20;

    // Info Periode Akademik
    worksheet.mergeCells("A3:I3");
    const periodCell = worksheet.getCell("A3");
    periodCell.value = `Periode: ${displayText}`;
    periodCell.font = { size: 10, italic: true };
    periodCell.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getRow(3).height = 15;

    // Instruksi
    worksheet.mergeCells("A4:I4");
    const instructionCell = worksheet.getCell("A4");
    instructionCell.value =
      "⚠️ JANGAN UBAH STRUKTUR TABEL. Isi nilai NH1, NH2, NH3, PSTS, PSAS (0-100). Kolom NA akan otomatis terhitung.";
    instructionCell.font = { size: 9, color: { argb: "DC2626" } };
    instructionCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FEF3C7" },
    };
    instructionCell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    worksheet.getRow(4).height = 30;

    // Spacing
    worksheet.getRow(5).height = 10;
    worksheet.getRow(6).height = 20;

    // Headers
    const headers = ["No", "NIS", "Nama Siswa", "NH1", "NH2", "NH3", "PSTS", "PSAS", "NA"];
    const headerRow = worksheet.getRow(7);

    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: "FFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "10B981" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };

      // Format khusus untuk kolom nilai
      if (index >= 3 && index <= 7) {
        cell.note = "Isi dengan nilai 0-100";
      } else if (index === 8) {
        cell.note = "Otomatis terhitung";
      }
    });

    headerRow.height = 25;

    // Column widths
    worksheet.columns = [
      { width: 6 },
      { width: 15 },
      { width: 38 },
      { width: 8 },
      { width: 8 },
      { width: 8 },
      { width: 8 },
      { width: 8 },
      { width: 8 },
    ];

    // Add student data with formulas for NA
    students.forEach((student, index) => {
      const row = worksheet.addRow([
        index + 1,
        student.nis,
        student.full_name,
        "", // NH1
        "", // NH2
        "", // NH3
        "", // PSTS
        "", // PSAS
        "", // NA akan diisi formula
      ]);

      // Add formula for NA calculation
      const naCell = row.getCell(9);
      const nh1Ref = `D${row.number}`;
      const nh2Ref = `E${row.number}`;
      const nh3Ref = `F${row.number}`;
      const pstsRef = `G${row.number}`;
      const psasRef = `H${row.number}`;

      naCell.value = {
        formula: `=IF(AND(${nh1Ref}<>"",${nh2Ref}<>"",${nh3Ref}<>"",${pstsRef}<>"",${psasRef}<>""),ROUND((${nh1Ref}+${nh2Ref}+${nh3Ref})/3*0.4+${pstsRef}*0.3+${psasRef}*0.3,2),"")`,
      };
      naCell.font = { bold: true };

      // Style untuk kolom nilai
      for (let i = 4; i <= 8; i++) {
        const cell = row.getCell(i);
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
    });

    // Format borders
    for (let i = 7; i <= 7 + students.length; i++) {
      const row = worksheet.getRow(i);
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    }

    // Footer
    const lastRow = 7 + students.length;
    worksheet.getRow(lastRow + 1).height = 20;

    worksheet.mergeCells(`A${lastRow + 2}:I${lastRow + 2}`);
    const footerCell = worksheet.getCell(`A${lastRow + 2}`);
    footerCell.value = "Simpan file ini, isi nilai, lalu upload kembali untuk import.";
    footerCell.font = { size: 9, italic: true };
    footerCell.alignment = { horizontal: "center", vertical: "middle" };

    // Generate filename
    const safeSubject = selectedSubject.replace(/[^a-zA-Z0-9]/g, "_");
    const safeClass = selectedClass.replace(/[^a-zA-Z0-9]/g, "_");
    const safeYear = academicYear.replace(/\//g, "-");
    const fileName = `Template_Nilai_${safeSubject}_${safeClass}_${safeYear}_S${semester}.xlsx`;

    // Generate & download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);

    return {
      success: true,
      message: `Template berhasil digenerate untuk ${displayText}`,
      fileName: fileName,
    };
  } catch (error) {
    console.error("❌ Error generating template:", error);
    return {
      success: false,
      message: "Gagal membuat template: " + error.message,
    };
  }
};
