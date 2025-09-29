import ExcelJS from 'exceljs';

/**
 * Export attendance data to Excel with professional formatting
 * @param {Object} params - Export parameters
 * @param {number} params.kelas - Class number (1-6)
 * @param {string} params.bulan - Month (1-12)
 * @param {string} params.tahun - Year (e.g., "2025")
 * @param {Array} params.studentsData - Array of student objects
 * @param {Array} params.attendanceRecords - Array of attendance records from database
 * @param {string} params.namaSekolah - School name
 * @param {Object} params.userData - User data object containing full_name
 * @param {Object} params.supabase - Supabase client instance
 */
export const exportAttendanceToExcel = async ({
  kelas,
  bulan,
  tahun,
  studentsData,
  attendanceRecords,
  namaSekolah = "SD NEGERI 1 PASIRPOGOR",
  userData,
  supabase
}) => {
  try {
    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Rekap Kelas ${kelas}`);

    // Get month name in Indonesian
    const monthNames = [
      '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthName = monthNames[parseInt(bulan)];

    // Get unique attendance dates and sort them
    const uniqueDates = [...new Set(attendanceRecords.map(record => record.tanggal))]
      .sort()
      .map(date => {
        const [year, month, day] = date.split('-');
        return `${day}-${month}`;
      });

    // Create student attendance matrix
    const studentMatrix = {};
    
    studentsData.forEach(student => {
      studentMatrix[student.nisn] = {
        name: student.nama_siswa,
        dates: {},
        summary: { hadir: 0, sakit: 0, izin: 0, alpa: 0 }
      };
    });

    // Fill matrix with attendance data
    attendanceRecords.forEach(record => {
      if (studentMatrix[record.nisn]) {
        const dateKey = record.tanggal.split('-').slice(1).reverse().join('-'); // Convert to DD-MM format
        
        let statusCode = 'H';
        if (record.status === 'Sakit') statusCode = 'S';
        else if (record.status === 'Izin') statusCode = 'I';
        else if (record.status === 'Alpa' || record.status === 'Alfa') statusCode = 'A';
        
        studentMatrix[record.nisn].dates[dateKey] = statusCode;
        
        // Update summary
        if (record.status === 'Hadir') studentMatrix[record.nisn].summary.hadir++;
        else if (record.status === 'Sakit') studentMatrix[record.nisn].summary.sakit++;
        else if (record.status === 'Izin') studentMatrix[record.nisn].summary.izin++;
        else if (record.status === 'Alpa' || record.status === 'Alfa') studentMatrix[record.nisn].summary.alpa++;
      }
    });

    // Calculate total columns needed
    const baseCols = 2; // No, Nama Siswa
    const dateCols = uniqueDates.length;
    const summaryCols = 6; // Hadir, Izin, Sakit, Alfa, Total, Persentase
    const totalCols = baseCols + dateCols + summaryCols;

    // Row 1: School name (merged)
    worksheet.mergeCells(1, 1, 1, totalCols);
    const schoolCell = worksheet.getCell(1, 1);
    schoolCell.value = namaSekolah;
    schoolCell.font = { name: 'Arial', size: 14, bold: true };
    schoolCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 25;

    // Row 2: Title (merged)
    worksheet.mergeCells(2, 1, 2, totalCols);
    const titleCell = worksheet.getCell(2, 1);
    titleCell.value = `REKAP BULANAN DAFTAR HADIR SISWA KELAS ${kelas}`;
    titleCell.font = { name: 'Arial', size: 12, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 20;

    // Row 3: Month and year (merged)
    worksheet.mergeCells(3, 1, 3, totalCols);
    const monthCell = worksheet.getCell(3, 1);
    monthCell.value = `BULAN : ${monthName} ${tahun}`;
    monthCell.font = { name: 'Arial', size: 11, bold: true };
    monthCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(3).height = 20;

    // Row 4-5: Empty rows
    worksheet.getRow(4).height = 15;
    worksheet.getRow(5).height = 15;

    // Row 6: Headers
    const headerRow = 6;
    let colIndex = 1;

    // Basic headers
    worksheet.getCell(headerRow, colIndex++).value = 'No.';
    worksheet.getCell(headerRow, colIndex++).value = 'Nama Siswa';

    // Date headers
    const dateStartCol = colIndex;
    uniqueDates.forEach(date => {
      worksheet.getCell(headerRow, colIndex++).value = date;
    });

    // Summary headers
    worksheet.getCell(headerRow, colIndex++).value = 'Hadir';
    worksheet.getCell(headerRow, colIndex++).value = 'Izin';
    worksheet.getCell(headerRow, colIndex++).value = 'Sakit';
    worksheet.getCell(headerRow, colIndex++).value = 'Alfa';
    worksheet.getCell(headerRow, colIndex++).value = 'Total';
    worksheet.getCell(headerRow, colIndex++).value = 'Persentase';

    // Style header row with soft blue color
    const headerRowObj = worksheet.getRow(headerRow);
    headerRowObj.height = 25;
    for (let col = 1; col <= totalCols; col++) {
      const cell = worksheet.getCell(headerRow, col);
      cell.font = { name: 'Arial', size: 10, bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8F4FD' } // Soft blue color (light blue)
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }

    // Data rows
    let rowIndex = headerRow + 1;
    studentsData.forEach((student, index) => {
      const studentData = studentMatrix[student.nisn];
      let colIndex = 1;

      // Basic data
      worksheet.getCell(rowIndex, colIndex++).value = index + 1;
      worksheet.getCell(rowIndex, colIndex++).value = studentData.name;

      // Date attendance data
      uniqueDates.forEach(date => {
        const status = studentData.dates[date] || '';
        worksheet.getCell(rowIndex, colIndex++).value = status;
      });

      // Summary data
      const summary = studentData.summary;
      worksheet.getCell(rowIndex, colIndex++).value = summary.hadir;
      worksheet.getCell(rowIndex, colIndex++).value = summary.izin;
      worksheet.getCell(rowIndex, colIndex++).value = summary.sakit;
      worksheet.getCell(rowIndex, colIndex++).value = summary.alpa;
      
      const total = summary.hadir + summary.izin + summary.sakit + summary.alpa;
      worksheet.getCell(rowIndex, colIndex++).value = total;
      
      const percentage = total > 0 ? Math.round((summary.hadir / total) * 100) : 100;
      worksheet.getCell(rowIndex, colIndex++).value = `${percentage}%`;

      // Style data row
      const rowObj = worksheet.getRow(rowIndex);
      rowObj.height = 20;
      for (let col = 1; col <= totalCols; col++) {
        const cell = worksheet.getCell(rowIndex, col);
        cell.font = { name: 'Arial', size: 9 };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };

        // Alignment based on column type
        if (col === 1) { // No
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (col === 2) { // Name
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        } else if (col >= dateStartCol && col < dateStartCol + dateCols) { // Date columns
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          // Color coding for attendance status
          if (cell.value === 'H') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4F1D4' } };
          } else if (cell.value === 'S') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF4CD' } };
          } else if (cell.value === 'I') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCDE4FF' } };
          } else if (cell.value === 'A') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD4D4' } };
          }
        } else { // Summary columns
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      }

      rowIndex++;
    });

    // Empty rows after table
    rowIndex += 3;

    // Footer with teacher signature - positioned at the right side
    const signatureCol = totalCols - 3; // Position signature area
    
    worksheet.getCell(rowIndex, signatureCol).value = 'Mengetahui';
    worksheet.getCell(rowIndex, signatureCol).font = { name: 'Arial', size: 10 };
    worksheet.getCell(rowIndex, signatureCol).alignment = { horizontal: 'center' };

    worksheet.getCell(rowIndex + 1, signatureCol).value = `Walikelas Kelas ${kelas}`;
    worksheet.getCell(rowIndex + 1, signatureCol).font = { name: 'Arial', size: 10 };
    worksheet.getCell(rowIndex + 1, signatureCol).alignment = { horizontal: 'center' };

    // Empty rows for signature space
    rowIndex += 4;

    // Teacher full name
    const teacherName = userData?.full_name || 'Nama Guru';
    worksheet.getCell(rowIndex, signatureCol).value = teacherName;
    worksheet.getCell(rowIndex, signatureCol).font = { name: 'Arial', size: 10, bold: true };
    worksheet.getCell(rowIndex, signatureCol).alignment = { horizontal: 'center' };

    // Set column widths
    worksheet.getColumn(1).width = 5;  // No
    worksheet.getColumn(2).width = 35; // Name
    
    // Date columns
    for (let i = 0; i < dateCols; i++) {
      worksheet.getColumn(dateStartCol + i).width = 6;
    }
    
    // Summary columns
    const summaryStartCol = dateStartCol + dateCols;
    worksheet.getColumn(summaryStartCol).width = 8;     // Hadir
    worksheet.getColumn(summaryStartCol + 1).width = 8; // Izin
    worksheet.getColumn(summaryStartCol + 2).width = 8; // Sakit
    worksheet.getColumn(summaryStartCol + 3).width = 8; // Alfa
    worksheet.getColumn(summaryStartCol + 4).width = 8; // Total
    worksheet.getColumn(summaryStartCol + 5).width = 12; // Persentase

    // Generate buffer and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rekap_Presensi_Kelas_${kelas}_${monthName}_${tahun}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return { success: true, message: 'File Excel berhasil di-download!' };

  } catch (error) {
    console.error('Error creating Excel file:', error);
    return { success: false, message: `Error: ${error.message}` };
  }
};

/**
 * Integration function to be called from Attendance.js
 * @param {Object} supabase - Supabase client
 * @param {number} activeClass - Current active class
 * @param {string} month - Selected month (1-12)
 * @param {string} year - Selected year
 * @param {Object} studentsData - Students data object
 * @param {Object} userData - User data containing full_name
 */
export const exportAttendanceFromComponent = async (supabase, activeClass, month, year, studentsData, userData) => {
  try {
    // Get students for the active class
    const students = studentsData[activeClass] || [];
    
    if (students.length === 0) {
      return { success: false, message: 'Tidak ada data siswa untuk kelas ini' };
    }

    // Query attendance records for the specified month and year
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = `${year}-${month.padStart(2, '0')}-${lastDayOfMonth.toString().padStart(2, '0')}`;

    const { data: attendanceRecords, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('kelas', activeClass)
      .gte('tanggal', startDate)
      .lte('tanggal', endDate)
      .order('tanggal', { ascending: true });

    if (error) {
      throw error;
    }

    if (!attendanceRecords || attendanceRecords.length === 0) {
      return { success: false, message: 'Tidak ada data kehadiran untuk periode yang dipilih' };
    }

    // Export to Excel
    const result = await exportAttendanceToExcel({
      kelas: activeClass,
      bulan: month,
      tahun: year,
      studentsData: students,
      attendanceRecords: attendanceRecords,
      userData: userData,
      supabase: supabase
    });

    return result;

  } catch (error) {
    console.error('Error in exportAttendanceFromComponent:', error);
    return { success: false, message: `Error: ${error.message}` };
  }
};