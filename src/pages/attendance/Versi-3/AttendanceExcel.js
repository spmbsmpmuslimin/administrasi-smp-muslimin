//[file name]: AttendanceExcel.js
import ExcelJS from "exceljs";
import { supabase } from "../../supabaseClient";
import { filterBySemester } from "../../services/academicYearService";

/**
 * ============================================================
 * CORE EXPORT FUNCTION - UNTUK DIPANGGIL DARI AttendanceMain.js
 * ============================================================
 */

/**
 * Export attendance data to Excel
 * @returns {Promise<{success: boolean, message: string}>} Success status
 */
export const exportAttendanceToExcel = async (params = {}) => {
  try {
    const {
      students,
      selectedClass,
      selectedSubject,
      date,
      attendanceStatus,
      attendanceNotes,
      onShowToast,
      yearMonth,
      teacherName = null,
      homeroomClass = null,
      semesterId = null,
      academicYear = null,
      semester = null,
    } = params;

    // Validation
    if (!students || students.length === 0) {
      if (onShowToast) onShowToast("Tidak ada data siswa untuk diexport!", "error");
      return { success: false, message: "Tidak ada data siswa" };
    }

    if (!semesterId) {
      console.error("❌ exportAttendanceToExcel: semesterId kosong!");
      if (onShowToast) onShowToast("Semester belum dipilih untuk export!", "error");
      return { success: false, message: "Semester tidak dipilih" };
    }

    console.log("✅ exportAttendanceToExcel dengan semester ID:", semesterId);

    // Get teacher name from database if not provided
    let fetchedTeacherName = teacherName;
    if (!fetchedTeacherName) {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (currentUser) {
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("full_name")
            .eq("id", currentUser.id)
            .single();

          if (!userError && userData) {
            fetchedTeacherName = userData.full_name;
          }
        }
      } catch (error) {
        console.warn("Could not fetch teacher name:", error);
      }
    }

    // Calculate start and end date for the month
    const [year, month] = yearMonth.split("-");
    const startDate = `${year}-${month}-01`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endDate = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;

    // Determine subject filter
    let subjectFilter;
    const subjectUpper = selectedSubject.toUpperCase();

    if (subjectUpper.includes("PRESENSI HARIAN") || subjectUpper.includes("HARIAN")) {
      subjectFilter = "Harian";
    } else {
      subjectFilter = selectedSubject.split("-")[0].trim();
    }

    // Determine attendance mode and type filter
    const isHomeroomDaily = subjectFilter === "Harian";
    const typeFilter = isHomeroomDaily ? "harian" : "mapel";
    const classFilter = isHomeroomDaily ? homeroomClass : selectedClass;

    console.log("📁 Export Query:", {
      classFilter,
      subjectFilter,
      typeFilter,
      startDate,
      endDate,
      semesterId,
      isHomeroomDaily,
    });

    // Query attendance records with semester filter
    let query = supabase
      .from("attendances")
      .select("student_id, date, status, notes")
      .eq("subject", subjectFilter)
      .eq("class_id", classFilter)
      .eq("type", typeFilter)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });

    query = filterBySemester(query, semesterId);

    const { data: attendanceRecords, error } = await query;

    console.log("📊 Records found:", attendanceRecords?.length || 0);

    if (error) {
      console.error("❌ Query error:", error);
      if (onShowToast) onShowToast("Error mengambil data presensi: " + error.message, "error");
      return { success: false, message: error.message };
    }

    if (!attendanceRecords || attendanceRecords.length === 0) {
      if (onShowToast)
        onShowToast("Tidak ada data kehadiran untuk diekspor di bulan ini!", "error");
      return { success: false, message: "Tidak ada data kehadiran" };
    }

    // Get unique dates and sort them
    const uniqueDates = [...new Set(attendanceRecords?.map((record) => record.date) || [])]
      .sort()
      .map((dateStr) => {
        const [year, month, day] = dateStr.split("-");
        return {
          original: dateStr,
          display: `${day}-${month}`,
        };
      });

    // Helper function untuk normalize status
    const normalizeStatus = (status) => {
      if (!status) return null;
      const normalized = status.toString().toLowerCase().trim();
      if (normalized === "alpha") return "alpa";
      return normalized;
    };

    // Create student attendance matrix
    const studentMatrix = {};

    students.forEach((student) => {
      studentMatrix[student.id] = {
        nis: student.nis,
        name: student.full_name,
        dates: {},
        summary: { Hadir: 0, Izin: 0, Sakit: 0, Alpha: 0 },
      };
    });

    // Fill matrix with attendance data
    attendanceRecords?.forEach((record) => {
      if (studentMatrix[record.student_id]) {
        const dateKey = record.date;
        const normalizedStatus = normalizeStatus(record.status);

        let statusCode = "H";
        if (normalizedStatus === "sakit") statusCode = "S";
        else if (normalizedStatus === "izin") statusCode = "I";
        else if (normalizedStatus === "alpa") statusCode = "A";

        studentMatrix[record.student_id].dates[dateKey] = statusCode;

        const status =
          normalizedStatus === "alpa"
            ? "Alpha"
            : normalizedStatus === "hadir"
            ? "Hadir"
            : normalizedStatus === "sakit"
            ? "Sakit"
            : normalizedStatus === "izin"
            ? "Izin"
            : null;

        if (status && studentMatrix[record.student_id].summary[status] !== undefined) {
          studentMatrix[record.student_id].summary[status]++;
        }
      }
    });

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Rekap Presensi");

    // Calculate total columns
    const baseCols = 2; // No, Nama Siswa
    const dateCols = uniqueDates.length;
    const summaryCols = 6; // Hadir, Izin, Sakit, Alpha, Total, Persentase
    const totalCols = baseCols + dateCols + summaryCols;

    // Format month name for display
    const monthNames = [
      "JANUARI",
      "FEBRUARI",
      "MARET",
      "APRIL",
      "MEI",
      "JUNI",
      "JULI",
      "AGUSTUS",
      "SEPTEMBER",
      "OKTOBER",
      "NOVEMBER",
      "DESEMBER",
    ];
    const monthName = monthNames[parseInt(month) - 1];
    const periodText = `${monthName} ${year}`;

    // Tambah info tahun ajaran & semester di header
    let academicInfo = "";
    if (academicYear && semester) {
      academicInfo = ` | ${academicYear} - Semester ${semester}`;
    }

    // Header rows
    const headerData = [
      ["SMP MUSLIMIN CILILIN"],
      [
        isHomeroomDaily
          ? `REKAP PRESENSI HARIAN KELAS ${classFilter}`
          : `REKAP PRESENSI KELAS ${classFilter}`,
      ],
      [
        isHomeroomDaily
          ? `BULAN : ${periodText}${academicInfo}`
          : `MATA PELAJARAN: ${selectedSubject} - ${periodText}${academicInfo}`,
      ],
      [], // Empty row
      // Table headers
      [
        "No.",
        "Nama Siswa",
        ...uniqueDates.map((d) => d.display),
        "Hadir",
        "Izin",
        "Sakit",
        "Alpha",
        "Total",
        "Persentase",
      ],
    ];

    // Add student data
    const studentData = students.map((student, index) => {
      const studentInfo = studentMatrix[student.id];
      const summary = studentInfo.summary;
      const total = summary.Hadir + summary.Izin + summary.Sakit + summary.Alpha;
      const percentage = total > 0 ? Math.round((summary.Hadir / total) * 100) : 100;

      return [
        index + 1,
        student.full_name,
        ...uniqueDates.map((d) => studentInfo.dates[d.original] || ""),
        summary.Hadir,
        summary.Izin,
        summary.Sakit,
        summary.Alpha,
        total,
        `${percentage}%`,
      ];
    });

    // Combine all data
    const allData = [...headerData, ...studentData];

    // Add data to worksheet
    allData.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        worksheet.getCell(rowIndex + 1, colIndex + 1).value = cell;
      });
    });

    // Style header rows (1-3)
    for (let row = 1; row <= 3; row++) {
      const headerRow = worksheet.getRow(row);
      worksheet.mergeCells(row, 1, row, totalCols);
      const cell = headerRow.getCell(1);
      cell.font = {
        name: "Arial",
        size: row === 1 ? 14 : 12,
        bold: true,
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      headerRow.height = 22;
    }

    // Style table headers (row 5)
    const tableHeaderRow = worksheet.getRow(5);
    for (let col = 1; col <= totalCols; col++) {
      const cell = tableHeaderRow.getCell(col);
      cell.font = { name: "Arial", size: 10, bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE8F4FD" },
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    }
    tableHeaderRow.height = 20;

    // Style data rows
    const dataStartRow = 6;
    for (let i = 0; i < students.length; i++) {
      const currentRow = dataStartRow + i;
      const rowObj = worksheet.getRow(currentRow);

      for (let col = 1; col <= totalCols; col++) {
        const cell = rowObj.getCell(col);
        cell.font = { name: "Arial", size: 9 };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };

        // Alignment
        if (col === 1) {
          // No
          cell.alignment = { horizontal: "center", vertical: "middle" };
        } else if (col === 2) {
          // Name
          cell.alignment = { horizontal: "left", vertical: "middle" };
        } else if (col >= 3 && col <= 2 + dateCols) {
          // Date columns
          cell.alignment = { horizontal: "center", vertical: "middle" };
          // Color coding for attendance
          const value = cell.value;
          if (value === "H") {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFD4F1D4" },
            };
          } else if (value === "S") {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFFF4CD" },
            };
          } else if (value === "I") {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFCDE4FF" },
            };
          } else if (value === "A") {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFFD4D4" },
            };
          }
        } else {
          // Summary columns
          cell.alignment = { horizontal: "center", vertical: "middle" };
        }
      }
      rowObj.height = 18;
    }

    // Set column widths
    worksheet.getColumn(1).width = 5; // No
    worksheet.getColumn(2).width = 40; // Name

    // Date columns
    for (let i = 0; i < dateCols; i++) {
      worksheet.getColumn(3 + i).width = 6;
    }

    // Summary columns
    const summaryStartCol = 3 + dateCols;
    for (let i = 0; i < summaryCols; i++) {
      worksheet.getColumn(summaryStartCol + i).width = i === 5 ? 12 : 8; // Persentase wider
    }

    // Footer with teacher name
    const footerStartRow = dataStartRow + students.length + 2;

    // Cek apakah user adalah wali kelas
    const isHomeroom = homeroomClass && homeroomClass === classFilter;

    // Tentukan role title
    let roleTitle;
    if (isHomeroomDaily) {
      roleTitle = "Wali Kelas";
    } else if (isHomeroom) {
      roleTitle = "Wali Kelas & Guru Mata Pelajaran";
    } else {
      roleTitle = "Guru Mata Pelajaran";
    }

    // Position signature at the right side
    const signatureCol = Math.max(6, totalCols - 3);

    // "Mengetahui" text
    worksheet.getCell(footerStartRow, signatureCol).value = "Mengetahui";
    worksheet.getCell(footerStartRow, signatureCol).font = {
      name: "Arial",
      size: 10,
    };
    worksheet.getCell(footerStartRow, signatureCol).alignment = {
      horizontal: "center",
    };

    // Role title
    worksheet.getCell(footerStartRow + 1, signatureCol).value = roleTitle;
    worksheet.getCell(footerStartRow + 1, signatureCol).font = {
      name: "Arial",
      size: 10,
    };
    worksheet.getCell(footerStartRow + 1, signatureCol).alignment = {
      horizontal: "center",
    };

    // Empty rows for signature space (3 rows)
    const nameRow = footerStartRow + 5;

    // Teacher name
    const displayName = fetchedTeacherName || "(____________________)";
    worksheet.getCell(nameRow, signatureCol).value = displayName;
    worksheet.getCell(nameRow, signatureCol).font = {
      name: "Arial",
      size: 10,
      bold: true,
      underline: true,
    };
    worksheet.getCell(nameRow, signatureCol).alignment = {
      horizontal: "center",
    };

    // Update file name dengan info semester
    const semesterInfo = semester ? `_Sem${semester}` : "";
    const fileName = `Rekap_Presensi_${classFilter}_${selectedSubject.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    )}_${periodText.replace(/\s/g, "_")}${semesterInfo}.xlsx`;

    // Generate and download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    if (onShowToast) onShowToast("File Excel berhasil diunduh!", "success");
    return { success: true, message: "File Excel berhasil diunduh!" };
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    if (onShowToast) onShowToast("Gagal mengunduh file Excel: " + error.message, "error");
    return { success: false, message: error.message };
  }
};

/**
 * Wrapper for showing monthly export modal - UNTUK BACKWARD COMPATIBILITY
 */
export const showMonthlyExportModal = async (params = {}) => {
  try {
    const {
      students,
      selectedClass,
      selectedSubject,
      date,
      attendanceStatus,
      attendanceNotes,
      onShowToast,
      teacherName = null,
      homeroomClass = null,
      academicYear = null,
      semester = null,
      semesterId = null,
    } = params;

    // For backward compatibility, assume yearMonth is provided
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
    const yearMonth = `${currentYear}-${currentMonth}`;

    // Call the main export function
    const result = await exportAttendanceToExcel({
      students,
      selectedClass,
      selectedSubject,
      date,
      attendanceStatus,
      attendanceNotes,
      onShowToast,
      yearMonth,
      teacherName,
      homeroomClass,
      semesterId,
      academicYear,
      semester,
    });

    return result;
  } catch (error) {
    console.error("Error in showMonthlyExportModal:", error);
    throw error;
  }
};

/**
 * ============================================================
 * SEMESTER EXPORT FUNCTIONS
 * ============================================================
 */

/**
 * Export semester recap to Excel
 * @returns {Promise<{success: boolean, message: string}>} Success status
 */
export const exportSemesterRecapFromComponent = async (params = {}) => {
  try {
    const {
      classId,
      semester,
      year,
      studentsData,
      subject,
      type = "mapel",
      currentUser = null,
      homeroomClass = null,
      onShowToast = null,
      academicYear = null,
      semesterId = null,
    } = params;

    const students = studentsData || [];

    if (students.length === 0) {
      if (onShowToast) onShowToast("Tidak ada data siswa untuk kelas ini", "error");
      return {
        success: false,
        message: "Tidak ada data siswa untuk kelas ini",
      };
    }

    // Validasi: Harus ada semesterId
    if (!semesterId) {
      console.error("❌ exportSemesterRecapFromComponent: semesterId kosong!");
      if (onShowToast) onShowToast("Semester belum dipilih untuk export!", "error");
      return {
        success: false,
        message: "Semester tidak dipilih",
      };
    }

    console.log("✅ exportSemesterRecapFromComponent dengan semester ID:", semesterId);

    // Convert semester
    const semesterType = semester === 1 ? "Ganjil" : "Genap";
    const academicYearForQuery =
      academicYear || (semester === 1 ? `${year}/${year + 1}` : `${year - 1}/${year}`);

    const months = semester === 1 ? [7, 8, 9, 10, 11, 12] : [1, 2, 3, 4, 5, 6];

    console.log({
      classId,
      academicYear: academicYearForQuery,
      semesterType,
      subject,
      type,
      months,
      semesterId,
    });

    // Date range
    const [startYear, endYear] = academicYearForQuery.split("/").map(Number);
    let startDate, endDate;

    if (semesterType === "Ganjil") {
      startDate = `${startYear}-07-01`;
      endDate = `${startYear}-12-31`;
    } else {
      startDate = `${endYear}-01-01`;
      endDate = `${endYear}-06-30`;
    }

    console.log("📅 Date range:", { startDate, endDate });

    // Fetch with pagination and semester filter
    console.log("🔍 Fetching with pagination and semester filter...");

    let allRecords = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from("attendances")
        .select("student_id, status, date")
        .eq("class_id", classId)
        .eq("subject", subject)
        .eq("type", type)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      query = filterBySemester(query, semesterId);

      const { data, error } = await query;

      if (error) {
        console.error("❌ Query error:", error);
        throw error;
      }

      if (data && data.length > 0) {
        allRecords = [...allRecords, ...data];
        console.log(`📄 Page ${page + 1}: ${data.length} records (Total: ${allRecords.length})`);

        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }

    console.log("✅ Total records fetched:", allRecords.length);

    if (allRecords.length === 0) {
      if (onShowToast) onShowToast("Tidak ada data kehadiran untuk semester yang dipilih", "error");
      return {
        success: false,
        message: "Tidak ada data kehadiran untuk semester yang dipilih",
      };
    }

    // Filter by month
    const filteredData = allRecords.filter((r) => {
      const parts = r.date.split("-");
      const month = parseInt(parts[1], 10);
      return months.includes(month);
    });

    console.log("Data setelah filter:", filteredData.length);

    if (filteredData.length === 0) {
      if (onShowToast) onShowToast("Tidak ada data kehadiran untuk semester yang dipilih", "error");
      return {
        success: false,
        message: "Tidak ada data kehadiran untuk semester yang dipilih",
      };
    }

    // Get teacher name
    let namaGuru = "";
    if (currentUser && currentUser.full_name) {
      namaGuru = currentUser.full_name;
    } else if (currentUser && currentUser.username) {
      namaGuru = currentUser.username;
    }

    // Create workbook
    const workbook = new ExcelJS.Workbook();

    // Update worksheet name dengan info semester
    const semesterText = semester === 1 ? "Ganjil" : "Genap";
    const academicInfo = academicYear ? `${academicYear} - ` : "";
    const worksheetName = `Sem ${semesterText} Kelas ${classId}`;
    const worksheet = workbook.addWorksheet(worksheetName);

    const semesterPeriodText = semester === 1 ? "Ganjil (Juli-Desember)" : "Genap (Januari-Juni)";

    // Calculate hari efektif
    const uniqueDates = [...new Set(filteredData.map((r) => r.date))];
    const totalHariEfektif = uniqueDates.length;

    // Helper function untuk normalize status
    const normalizeStatus = (status) => {
      if (!status) return null;
      const normalized = status.toString().toLowerCase().trim();
      if (normalized === "alpha") return "alpa";
      return normalized;
    };

    // Process student data
    const studentMatrix = {};

    students.forEach((student) => {
      studentMatrix[student.id] = {
        nis: student.nis,
        name: student.full_name,
        summary: { hadir: 0, sakit: 0, izin: 0, alpa: 0 },
      };
    });

    filteredData.forEach((record) => {
      if (studentMatrix[record.student_id]) {
        const summary = studentMatrix[record.student_id].summary;
        const normalizedStatus = normalizeStatus(record.status);

        if (normalizedStatus === "hadir") {
          summary.hadir++;
        } else if (normalizedStatus === "sakit") {
          summary.sakit++;
        } else if (normalizedStatus === "izin") {
          summary.izin++;
        } else if (normalizedStatus === "alpa") {
          summary.alpa++;
        }
      }
    });

    // Get category helper
    const getCategory = (percentage) => {
      if (percentage >= 90) return "Sangat Baik";
      if (percentage >= 80) return "Baik";
      if (percentage >= 70) return "Cukup";
      return "Kurang";
    };

    const totalCols = 10;

    // School name header
    worksheet.mergeCells(1, 1, 1, totalCols);
    const schoolCell = worksheet.getCell(1, 1);
    schoolCell.value = "SMP MUSLIMIN CILILIN".toUpperCase();
    schoolCell.font = { name: "Arial", size: 14, bold: true };
    schoolCell.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getRow(1).height = 25;

    // Title row - tambah info tahun ajaran
    worksheet.mergeCells(2, 1, 2, totalCols);
    const titleCell = worksheet.getCell(2, 1);
    const yearInfo = academicYear ? ` | ${academicYear}` : "";
    titleCell.value = `REKAP PRESENSI - KELAS ${classId.toUpperCase()}${yearInfo}`;
    titleCell.font = { name: "Arial", size: 12, bold: true };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getRow(2).height = 20;

    // Subtitle row
    worksheet.mergeCells(3, 1, 3, totalCols);
    const subtitleCell = worksheet.getCell(3, 1);
    const subjectInfo = subject.toUpperCase();
    subtitleCell.value = `${subjectInfo} | SEMESTER ${semesterPeriodText.toUpperCase()} ${year}`;
    subtitleCell.font = { name: "Arial", size: 11 };
    subtitleCell.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getRow(3).height = 20;

    worksheet.getRow(4).height = 15;

    // Header row
    const headerRow = 5;
    const headers = [
      "NO",
      "NIS",
      "NAMA SISWA",
      "HADIR",
      "SAKIT",
      "IZIN",
      "ALPA",
      "TOTAL",
      "%",
      "KATEGORI",
    ];

    headers.forEach((header, index) => {
      const cell = worksheet.getCell(headerRow, index + 1);
      cell.value = header;
      cell.font = {
        name: "Arial",
        size: 11,
        bold: true,
        color: { argb: "FFFFFFFF" },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
    worksheet.getRow(headerRow).height = 25;

    // Data rows
    let rowIndex = headerRow + 1;
    students.forEach((student, index) => {
      const studentData = studentMatrix[student.id];
      const summary = studentData.summary;

      const percentage =
        totalHariEfektif > 0 ? Math.round((summary.hadir / totalHariEfektif) * 100) : 0;
      const category = getCategory(percentage);

      const rowData = [
        index + 1,
        studentData.nis,
        studentData.name,
        summary.hadir,
        summary.sakit,
        summary.izin,
        summary.alpa,
        totalHariEfektif,
        percentage,
        category,
      ];

      rowData.forEach((value, colIndex) => {
        const cell = worksheet.getCell(rowIndex, colIndex + 1);
        cell.value = value;
        cell.font = { name: "Arial", size: 10 };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };

        if (colIndex === 0 || colIndex >= 3) {
          cell.alignment = { horizontal: "center", vertical: "middle" };
        } else {
          cell.alignment = { horizontal: "left", vertical: "middle" };
        }

        // Category coloring
        if (colIndex === 9) {
          if (category === "Sangat Baik") {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFC6EFCE" },
            };
          } else if (category === "Baik") {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFFF2CC" },
            };
          } else if (category === "Cukup") {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFCE4D6" },
            };
          } else {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFFC7CE" },
            };
          }
        }
      });

      worksheet.getRow(rowIndex).height = 20;
      rowIndex++;
    });

    // Footer
    rowIndex += 2;

    // Determine role
    const isHomeroomDaily = subject === "Harian";
    const isHomeroom = homeroomClass && homeroomClass === classId;

    let roleTitle;
    if (isHomeroomDaily) {
      roleTitle = "Wali Kelas";
    } else if (isHomeroom) {
      roleTitle = "Wali Kelas & Guru Mata Pelajaran";
    } else {
      roleTitle = "Guru Mata Pelajaran";
    }

    worksheet.getCell(rowIndex, 8).value = "Mengetahui";
    worksheet.getCell(rowIndex, 8).font = { name: "Arial", size: 11 };
    worksheet.getCell(rowIndex, 8).alignment = { horizontal: "left" };

    worksheet.getCell(rowIndex + 1, 8).value = roleTitle;
    worksheet.getCell(rowIndex + 1, 8).font = { name: "Arial", size: 11 };
    worksheet.getCell(rowIndex + 1, 8).alignment = { horizontal: "left" };

    worksheet.getRow(rowIndex + 2).height = 30;

    if (namaGuru) {
      worksheet.getCell(rowIndex + 3, 8).value = namaGuru;
      worksheet.getCell(rowIndex + 3, 8).font = {
        name: "Arial",
        size: 11,
        bold: true,
        underline: true,
      };
      worksheet.getCell(rowIndex + 3, 8).alignment = { horizontal: "left" };
    }

    // Column widths
    worksheet.getColumn(1).width = 5;
    worksheet.getColumn(2).width = 15;
    worksheet.getColumn(3).width = 35;
    worksheet.getColumn(4).width = 10;
    worksheet.getColumn(5).width = 10;
    worksheet.getColumn(6).width = 10;
    worksheet.getColumn(7).width = 10;
    worksheet.getColumn(8).width = 10;
    worksheet.getColumn(9).width = 8;
    worksheet.getColumn(10).width = 15;

    // Update file name dengan info semester dan tahun ajaran
    const yearInfoForFile = academicYear
      ? academicYear.replace("/", "-")
      : `${year}-${semester === 1 ? year + 1 : year - 1}`;
    const fileName = `Rekap_Presensi_Semester_${semesterText}_Kelas_${classId}_${yearInfoForFile}.xlsx`;

    // Generate file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    if (onShowToast) onShowToast("File Excel semester berhasil di-download!", "success");
    return {
      success: true,
      message: "File Excel semester berhasil di-download!",
    };
  } catch (error) {
    console.error("Error creating semester Excel file:", error);
    if (onShowToast) onShowToast("Gagal mengunduh file semester: " + error.message, "error");
    return { success: false, message: `Error: ${error.message}` };
  }
};

/**
 * Wrapper for showing semester export modal - UNTUK BACKWARD COMPATIBILITY
 */
export const showSemesterExportModal = async (params = {}) => {
  try {
    const {
      classId,
      studentsData,
      subject,
      type = "mapel",
      currentUser = null,
      homeroomClass = null,
      onShowToast = null,
      semester = null,
      academicYear = null,
      semesterId = null,
    } = params;

    // For backward compatibility, assume current year and semester
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const defaultSemester = currentMonth >= 7 ? 2 : 1;

    // Call the main export function
    const result = await exportSemesterRecapFromComponent({
      classId,
      semester: semester || defaultSemester,
      year: currentYear,
      studentsData,
      subject,
      type,
      currentUser,
      homeroomClass,
      onShowToast,
      academicYear,
      semesterId,
    });

    return result;
  } catch (error) {
    console.error("Error in showSemesterExportModal:", error);
    throw error;
  }
};

/**
 * Legacy function untuk backward compatibility (deprecated)
 */
export const exportAttendanceFromComponent = async (
  supabase,
  activeClass,
  month,
  year,
  studentsData,
  userData
) => {
  console.warn("exportAttendanceFromComponent is deprecated. Use exportAttendanceToExcel instead.");
  return { success: false, message: "Deprecated function" };
};
