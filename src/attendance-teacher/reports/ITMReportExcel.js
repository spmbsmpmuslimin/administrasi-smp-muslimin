import ExcelJS from "exceljs";
import {
  SCHOOL_NAME,
  EXCEL_COLORS,
  EXCEL_FONT_FAMILY,
  STANDARD_CELL_BORDER,
  addLetterhead,
  setupPrintOptions,
  downloadWorkbook,
} from "../../utils/excelExportKit";
import { getActiveAcademicYear } from "../../services/academicYearService";

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];
const FULL_DAY_NAMES = ["Senin", "Selasa", "Rabu", "Kamis", "Jum'at"];

// Header grup KLS+Hari (2 kolom per hari kerja) -- warna abu netral ini
// khusus buat tabel form kayak gini, beda dari header biru primary yang
// dipake laporan matrix (MonthlyView dkk), jadi sengaja gak ditarik dari
// EXCEL_COLORS.
const FORM_HEADER_FILL = "FFD9D9D9";

/**
 * Export ITM Report to Excel - Single Sheet untuk Print
 * @param {Object} reportData - Data laporan dari ITMReport component
 */
export const exportITMReportToExcel = async (reportData) => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = SCHOOL_NAME;
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Laporan ITM");

    // FIX: sebelumnya baris "TAHUN AJARAN" di-hardcode "2025/2026" gak
    // peduli laporan yang lagi dibuka tahun ajaran berapa. Sekarang ambil
    // dari tahun ajaran yang lagi aktif (sama sumbernya kayak dropdown
    // "Tahun" di ITMReport.js), biar selalu sinkron.
    let academicYearLabel = "-";
    try {
      const activeInfo = await getActiveAcademicYear();
      if (activeInfo?.year) academicYearLabel = activeInfo.year;
    } catch (err) {
      console.error("Gagal ambil tahun ajaran aktif buat header export ITM:", err);
    }

    const TOTAL_COLUMNS = 11; // A (JAM) + 5 hari x 2 kolom (KLS, Hari) = 11

    let currentRow = addLetterhead(worksheet, {
      title: "JUMLAH JAM TATAP MUKA GURU",
      mergeCols: TOTAL_COLUMNS,
      metaLines: [
        `Tahun Ajaran : ${academicYearLabel}`,
        `Nama Guru : ${reportData.teacher.full_name}`,
        `Bulan : ${reportData.month} ${reportData.year}`,
      ],
    });

    // Hitung total jam per hari
    const calculateJamPerHari = (weekSchedule, dayName) => {
      let total = 0;
      weekSchedule.forEach((jam) => {
        const dayData = jam.days[dayName];
        if (dayData && dayData.kelas && dayData.kelas !== "" && dayData.kelas !== "UPACARA") {
          total++;
        }
      });
      return total;
    };

    // ============ LOOP SETIAP MINGGU ============
    reportData.weeks.forEach((week, weekIdx) => {
      // Label Minggu
      const mingguLabel = worksheet.getCell(`A${currentRow}`);
      mingguLabel.value = `Minggu ${week.weekNumber}`;
      mingguLabel.font = { name: EXCEL_FONT_FAMILY, size: 10, bold: true };
      worksheet.getRow(currentRow).height = 18;
      currentRow++;

      worksheet.getRow(currentRow).height = 5;
      currentRow++;

      // ============ TABLE HEADER ============
      const headerRow = worksheet.getRow(currentRow);
      headerRow.height = 22;

      const jamHeader = worksheet.getCell(currentRow, 1);
      jamHeader.value = "JAM";
      jamHeader.font = { name: EXCEL_FONT_FAMILY, size: 10, bold: true };
      jamHeader.alignment = { vertical: "middle", horizontal: "center" };
      jamHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FORM_HEADER_FILL } };
      jamHeader.border = STANDARD_CELL_BORDER;

      let colIndex = 2;
      DAYS.forEach((day, idx) => {
        const klsCell = worksheet.getCell(currentRow, colIndex);
        klsCell.value = "KLS";
        klsCell.font = { name: EXCEL_FONT_FAMILY, size: 10, bold: true };
        klsCell.alignment = { vertical: "middle", horizontal: "center" };
        klsCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FORM_HEADER_FILL } };
        klsCell.border = STANDARD_CELL_BORDER;

        const dayCell = worksheet.getCell(currentRow, colIndex + 1);
        dayCell.value = FULL_DAY_NAMES[idx];
        dayCell.font = { name: EXCEL_FONT_FAMILY, size: 10, bold: true };
        dayCell.alignment = { vertical: "middle", horizontal: "center" };
        dayCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FORM_HEADER_FILL } };
        dayCell.border = STANDARD_CELL_BORDER;

        colIndex += 2;
      });

      currentRow++;

      // ============ TABLE BODY ============
      week.schedule.forEach((jamRow) => {
        worksheet.getRow(currentRow).height = 18;

        const jamCell = worksheet.getCell(currentRow, 1);
        jamCell.value = jamRow.jamKe;
        jamCell.font = { name: EXCEL_FONT_FAMILY, size: 9, bold: true };
        jamCell.alignment = { vertical: "middle", horizontal: "center" };
        jamCell.border = STANDARD_CELL_BORDER;

        let colIdx = 2;
        DAYS.forEach((day) => {
          const dayData = jamRow.days[day];
          const isUpacara = dayData?.kelas === "UPACARA";

          const klsCell = worksheet.getCell(currentRow, colIdx);
          klsCell.value = dayData?.kelas || "-";
          klsCell.font = { name: EXCEL_FONT_FAMILY, size: 9 };
          klsCell.alignment = { vertical: "middle", horizontal: "center" };
          klsCell.border = STANDARD_CELL_BORDER;

          const attendCell = worksheet.getCell(currentRow, colIdx + 1);
          if (isUpacara) {
            attendCell.value = "";
          } else if (dayData?.hadir) {
            attendCell.value = "✓";
            attendCell.font = {
              name: EXCEL_FONT_FAMILY,
              size: 12,
              bold: true,
              color: { argb: EXCEL_COLORS.success },
            };
          } else if (dayData?.status && dayData.status !== "Hadir") {
            // Tampilkan status: Sakit, Izin, Alpa
            attendCell.value = dayData.status;
            attendCell.font = {
              name: EXCEL_FONT_FAMILY,
              size: 9,
              bold: true,
              color: { argb: EXCEL_COLORS.danger },
            };
          } else if (dayData?.kelas && dayData.kelas !== "") {
            attendCell.value = "☐";
            attendCell.font = { name: EXCEL_FONT_FAMILY, size: 10 };
          } else {
            attendCell.value = "-";
            attendCell.font = {
              name: EXCEL_FONT_FAMILY,
              size: 9,
              color: { argb: EXCEL_COLORS.textMuted },
            };
          }
          attendCell.alignment = { vertical: "middle", horizontal: "center" };
          attendCell.border = STANDARD_CELL_BORDER;

          colIdx += 2;
        });

        currentRow++;
      });

      // ============ ROW JUMLAH ============
      worksheet.getRow(currentRow).height = 20;

      const totalMinggu = DAYS.reduce(
        (total, day) => total + calculateJamPerHari(week.schedule, day),
        0
      );

      const jumlahCell = worksheet.getCell(currentRow, 1);
      jumlahCell.value = `JUMLAH : ${totalMinggu}`;
      jumlahCell.font = { name: EXCEL_FONT_FAMILY, size: 9, bold: true };
      jumlahCell.alignment = { vertical: "middle", horizontal: "center" };
      jumlahCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: EXCEL_COLORS.zebra },
      };
      jumlahCell.border = STANDARD_CELL_BORDER;

      let colIdx = 2;
      DAYS.forEach((day) => {
        const jamPerHari = calculateJamPerHari(week.schedule, day);

        const jumlahDayCell = worksheet.getCell(currentRow, colIdx);
        jumlahDayCell.value = jamPerHari;
        jumlahDayCell.font = { name: EXCEL_FONT_FAMILY, size: 9, bold: true };
        jumlahDayCell.alignment = { vertical: "middle", horizontal: "center" };
        jumlahDayCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: EXCEL_COLORS.zebra },
        };
        jumlahDayCell.border = STANDARD_CELL_BORDER;

        const emptyCell = worksheet.getCell(currentRow, colIdx + 1);
        emptyCell.value = "";
        emptyCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: EXCEL_COLORS.zebra },
        };
        emptyCell.border = STANDARD_CELL_BORDER;

        colIdx += 2;
      });

      currentRow++;

      // Spacing antar minggu
      if (weekIdx < reportData.weeks.length - 1) {
        worksheet.getRow(currentRow).height = 10;
        currentRow++;
      }
    });

    // ============ TOTAL KESELURUHAN ============
    worksheet.getRow(currentRow).height = 12;
    currentRow++;

    const calculateOverallTotal = () => {
      let total = 0;
      reportData.weeks.forEach((week) => {
        DAYS.forEach((day) => {
          total += calculateJamPerHari(week.schedule, day);
        });
      });
      return total;
    };

    const calculateTotalHadir = () => {
      let total = 0;
      reportData.weeks.forEach((week) => {
        week.schedule.forEach((jam) => {
          DAYS.forEach((day) => {
            const dayData = jam.days[day];
            if (
              dayData &&
              dayData.hadir &&
              dayData.kelas &&
              dayData.kelas !== "" &&
              dayData.kelas !== "UPACARA"
            ) {
              total++;
            }
          });
        });
      });
      return total;
    };

    const totalTerjadwal = calculateOverallTotal();
    const totalHadir = calculateTotalHadir();
    const totalTidakHadir = totalTerjadwal - totalHadir;
    const persenHadir = totalTerjadwal > 0 ? ((totalHadir / totalTerjadwal) * 100).toFixed(1) : 0;
    const persenTidakHadir =
      totalTerjadwal > 0 ? ((totalTidakHadir / totalTerjadwal) * 100).toFixed(1) : 0;

    worksheet.mergeCells(`A${currentRow}:K${currentRow}`);
    const totalHeader = worksheet.getCell(`A${currentRow}`);
    totalHeader.value = "TOTAL KESELURUHAN";
    totalHeader.font = { name: EXCEL_FONT_FAMILY, size: 12, bold: true };
    totalHeader.alignment = { vertical: "middle", horizontal: "center" };
    totalHeader.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: EXCEL_COLORS.primaryLight },
    };
    totalHeader.border = STANDARD_CELL_BORDER;
    worksheet.getRow(currentRow).height = 22;
    currentRow++;

    const summaryData = [
      ["Jam Terjadwal:", `${totalTerjadwal} Jam`],
      ["Jam Hadir:", `${totalHadir} Jam (${persenHadir}%)`],
      ["Jam Tidak Hadir:", `${totalTidakHadir} Jam (${persenTidakHadir}%)`],
    ];

    summaryData.forEach((row) => {
      worksheet.getCell(currentRow, 1).value = row[0];
      worksheet.getCell(currentRow, 1).font = { name: EXCEL_FONT_FAMILY, size: 10, bold: true };

      worksheet.mergeCells(`B${currentRow}:K${currentRow}`);
      worksheet.getCell(currentRow, 2).value = row[1];
      worksheet.getCell(currentRow, 2).font = { name: EXCEL_FONT_FAMILY, size: 10 };

      worksheet.getRow(currentRow).height = 18;
      currentRow++;
    });

    // ============ COLUMN WIDTHS ============
    // Manual (bukan autoFitColumns) -- tabel ini butuh kolom sempit &
    // seragam (KLS/Hari) biar tetep muat dicetak 1 halaman lebar A4.
    worksheet.getColumn(1).width = 12; // JAM
    for (let i = 2; i <= 11; i++) {
      worksheet.getColumn(i).width = 8; // KLS & Hari
    }

    setupPrintOptions(worksheet, { orientation: "portrait" });
    worksheet.pageSetup.paperSize = 9; // A4 -- setupPrintOptions belum nge-cover opsi ini

    const safeName = reportData.teacher.full_name.replace(/\s+/g, "_");
    await downloadWorkbook(
      workbook,
      `Laporan_ITM_${safeName}_${reportData.month}_${reportData.year}.xlsx`
    );

    return true;
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    throw error;
  }
};
