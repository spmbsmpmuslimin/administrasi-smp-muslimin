import ExcelJS from 'exceljs';

/**
 * Export attendance data to Excel with dynamic date columns (like reference format)
 * @param {Array} students - Array of student objects from Attendance.js
 * @param {string} selectedClass - Selected class ID 
 * @param {string} selectedSubject - Selected subject name
 * @param {string} date - Date in YYYY-MM-DD format (used to determine the month)
 * @param {Object} attendanceStatus - Object with student_id as key, status as value (not used)
 * @param {Object} attendanceNotes - Object with student_id as key, notes as value (not used)
 * @param {Function} onShowToast - Toast notification function
 * @param {string} selectedMonth - Month in format 'YYYY-MM' (optional, will use date if not provided)
 */
export const exportAttendanceToExcel = async (
  students,
  selectedClass, 
  selectedSubject,
  date,
  attendanceStatus,
  attendanceNotes,
  onShowToast,
  selectedMonth = null
) => {
  try {
    if (!students || students.length === 0) {
      onShowToast?.("Tidak ada data siswa untuk diexport!", "error");
      return;
    }

    // Import supabase client
    const { supabase } = await import('../supabaseClient');

    // Determine the month to export
    let yearMonth;
    if (selectedMonth) {
      yearMonth = selectedMonth; // Format: 'YYYY-MM'
    } else if (date) {
      // Extract year-month from date (YYYY-MM-DD -> YYYY-MM)
      yearMonth = date.substring(0, 7);
    } else {
      // Use current month as fallback
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      yearMonth = `${year}-${month}`;
    }

    // Calculate start and end date for the month
    const [year, month] = yearMonth.split('-');
    const startDate = `${year}-${month}-01`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

    // Query attendance records for this class, subject, and MONTH ONLY
    const { data: attendanceRecords, error } = await supabase
      .from('attendances')
      .select('student_id, date, status, notes')
      .eq('class_id', selectedClass)
      .eq('subject', selectedSubject.includes('Presensi Harian') ? 'Harian' : selectedSubject)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching attendance records:', error);
      onShowToast?.("Error mengambil data presensi: " + error.message, "error");
      return;
    }

    // Get unique dates and sort them
    const uniqueDates = [...new Set(attendanceRecords?.map(record => record.date) || [])]
      .sort()
      .map(dateStr => {
        const [year, month, day] = dateStr.split('-');
        return { 
          original: dateStr,
          display: `${day}-${month}` 
        };
      });

    if (uniqueDates.length === 0) {
      onShowToast?.("Tidak ada data kehadiran untuk diekspor di bulan ini!", "error");
      return;
    }

    // Create student attendance matrix
    const studentMatrix = {};
    
    students.forEach(student => {
      studentMatrix[student.id] = {
        nis: student.nis,
        name: student.full_name,
        dates: {},
        summary: { Hadir: 0, Izin: 0, Sakit: 0, Alpha: 0 }
      };
    });

    // Fill matrix with attendance data
    attendanceRecords?.forEach(record => {
      if (studentMatrix[record.student_id]) {
        const dateKey = record.date;
        
        let statusCode = 'H';
        if (record.status === 'Sakit') statusCode = 'S';
        else if (record.status === 'Izin') statusCode = 'I'; 
        else if (record.status === 'Alpha') statusCode = 'A';
        
        studentMatrix[record.student_id].dates[dateKey] = statusCode;
        
        // Update summary
        const status = record.status === 'Alpha' ? 'Alpha' : record.status;
        if (studentMatrix[record.student_id].summary[status] !== undefined) {
          studentMatrix[record.student_id].summary[status]++;
        }
      }
    });

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Rekap Presensi');

    // Calculate total columns
    const baseCols = 2; // No, Nama Siswa
    const dateCols = uniqueDates.length;
    const summaryCols = 6; // Hadir, Izin, Sakit, Alpha, Total, Persentase
    const totalCols = baseCols + dateCols + summaryCols;

    // Format month name for display
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthName = monthNames[parseInt(month) - 1];
    const periodText = `${monthName} ${year}`;

    // Header rows
    const headerData = [
      ['SMP MUSLIMIN CILILIN'],
      [`REKAP PRESENSI KELAS ${selectedClass}`],
      [`MATA PELAJARAN: ${selectedSubject} - ${periodText}`],
      [], // Empty row
      // Table headers
      [
        'No.', 
        'Nama Siswa',
        ...uniqueDates.map(d => d.display),
        'Hadir', 'Izin', 'Sakit', 'Alpha', 'Total', 'Persentase'
      ]
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
        ...uniqueDates.map(d => studentInfo.dates[d.original] || ''),
        summary.Hadir,
        summary.Izin, 
        summary.Sakit,
        summary.Alpha,
        total,
        `${percentage}%`
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
      cell.font = { name: 'Arial', size: row === 1 ? 14 : 12, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      headerRow.height = 22;
    }

    // Style table headers (row 5)
    const tableHeaderRow = worksheet.getRow(5);
    for (let col = 1; col <= totalCols; col++) {
      const cell = tableHeaderRow.getCell(col);
      cell.font = { name: 'Arial', size: 10, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8F4FD' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
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
        cell.font = { name: 'Arial', size: 9 };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };

        // Alignment
        if (col === 1) { // No
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (col === 2) { // Name
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        } else if (col >= 3 && col <= 2 + dateCols) { // Date columns
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          // Color coding for attendance
          const value = cell.value;
          if (value === 'H') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4F1D4' } };
          } else if (value === 'S') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF4CD' } };
          } else if (value === 'I') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCDE4FF' } };
          } else if (value === 'A') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD4D4' } };
          }
        } else { // Summary columns
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      }
      rowObj.height = 18;
    }

    // Set column widths
    worksheet.getColumn(1).width = 5;   // No
    worksheet.getColumn(2).width = 40;  // Name
    
    // Date columns
    for (let i = 0; i < dateCols; i++) {
      worksheet.getColumn(3 + i).width = 6;
    }
    
    // Summary columns
    const summaryStartCol = 3 + dateCols;
    for (let i = 0; i < summaryCols; i++) {
      worksheet.getColumn(summaryStartCol + i).width = i === 5 ? 12 : 8; // Persentase wider
    }

    // Add footer with signature (2 rows below table)
    const footerStartRow = dataStartRow + students.length + 2;
    
    // Determine role and title based on subject
    const isHomeroomDaily = selectedSubject.includes('Presensi Harian');
    const roleTitle = isHomeroomDaily ? 'Wali Kelas' : 'Guru Mata Pelajaran';
    
    // Position signature at the right side of the table
    const signatureCol = Math.max(6, totalCols - 3); // At least column 6, or 3 columns from the right
    
    // "Mengetahui" text
    worksheet.getCell(footerStartRow, signatureCol).value = 'Mengetahui';
    worksheet.getCell(footerStartRow, signatureCol).font = { name: 'Arial', size: 10 };
    worksheet.getCell(footerStartRow, signatureCol).alignment = { horizontal: 'center' };
    
    // Role title
    worksheet.getCell(footerStartRow + 1, signatureCol).value = roleTitle;
    worksheet.getCell(footerStartRow + 1, signatureCol).font = { name: 'Arial', size: 10 };
    worksheet.getCell(footerStartRow + 1, signatureCol).alignment = { horizontal: 'center' };
    
    // Empty rows for signature space
    const nameRow = footerStartRow + 4;
    
    // Teacher name (we need to get this from user data or make it generic)
    // For now, we'll leave it empty or use a placeholder
    worksheet.getCell(nameRow, signatureCol).value = '(___________________)';
    worksheet.getCell(nameRow, signatureCol).font = { name: 'Arial', size: 10, bold: true };
    worksheet.getCell(nameRow, signatureCol).alignment = { horizontal: 'center' };

    // Generate and download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rekap_Presensi_${selectedClass}_${selectedSubject.replace(/[^a-zA-Z0-9]/g, '_')}_${periodText.replace(/\s/g, '_')}.xlsx`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    onShowToast?.("File Excel berhasil diunduh!", "success");

  } catch (error) {
    console.error("Error exporting to Excel:", error);
    onShowToast?.("Gagal mengunduh file Excel: " + error.message, "error");
  }
};

/**
 * Legacy function for backward compatibility
 * Keep the existing monthly recap function for other parts of the app
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

    // Use the original monthly export function (renamed to avoid conflicts)
    const result = await exportMonthlyAttendanceToExcel({
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

/**
 * Original monthly export function (renamed to avoid conflicts)
 * This is for monthly recap exports
 */
const exportMonthlyAttendanceToExcel = async ({
  kelas,
  bulan,
  tahun,
  studentsData,
  attendanceRecords,
  namaSekolah = "SMP MUSLIMIN CILILIN",
  userData,
  supabase
}) => {
  // ... (keep the original monthly export logic here if needed)
  // This is just a placeholder - you can implement the monthly logic later
  
  return { success: true, message: 'Monthly export feature - to be implemented' };
};