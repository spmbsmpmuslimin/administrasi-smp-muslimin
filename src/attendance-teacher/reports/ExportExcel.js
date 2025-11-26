// src/attendance-teacher/reports/ExportExcel.js
import React, { useState } from "react";
import { X, Download, FileSpreadsheet } from "lucide-react";
import ExcelJS from "exceljs";

const ExportExcel = ({
  attendances,
  teachers,
  month,
  year,
  monthName,
  onClose,
}) => {
  const [exporting, setExporting] = useState(false);

  const getDaysInMonth = () => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getAttendanceForDay = (teacherId, day) => {
    const dateStr = new Date(year, month, day).toISOString().split("T")[0];
    return attendances.find(
      (att) => att.teacher_id === teacherId && att.attendance_date === dateStr
    );
  };

  const getStatusLabel = (status) => {
    // FIXED: Pake huruf besar (Hadir, Izin, Sakit, Alpa) sesuai database
    const labels = {
      Hadir: "H",
      Izin: "I",
      Sakit: "S",
      Alpa: "A",
    };
    return labels[status] || "-";
  };

  const calculateTeacherStats = (teacherId) => {
    const teacherAttendances = attendances.filter(
      (att) => att.teacher_id === teacherId
    );
    // FIXED: Pake huruf besar (Hadir, Izin, Sakit, Alpa)
    const hadir = teacherAttendances.filter((a) => a.status === "Hadir").length;
    const total = teacherAttendances.length;
    const percentage = total > 0 ? ((hadir / total) * 100).toFixed(1) : 0;

    return {
      hadir: hadir,
      izin: teacherAttendances.filter((a) => a.status === "Izin").length,
      sakit: teacherAttendances.filter((a) => a.status === "Sakit").length,
      alpa: teacherAttendances.filter((a) => a.status === "Alpa").length,
      total: total,
      percentage: percentage,
    };
  };

  const handleExport = async () => {
    setExporting(true);

    // ========================================
    // 🔍 DEBUG LOGGING - CEK DI CONSOLE (F12)
    // ========================================
    console.log("========================================");
    console.log("🔍 DEBUG EXPORT EXCEL");
    console.log("========================================");
    console.log("📅 Month:", month, "Year:", year, "MonthName:", monthName);
    console.log("👥 Total Teachers:", teachers.length);
    console.log("📋 Total Attendances:", attendances.length);
    console.log("");
    console.log("🔹 Sample Teacher (first):", teachers[0]);
    console.log("🔹 Sample Attendance (first):", attendances[0]);
    console.log("");

    // Check specific date
    const targetDate = "2025-11-26";
    const attendancesOnDate = attendances.filter(
      (a) => a.attendance_date === targetDate
    );
    console.log(`📆 Attendances on ${targetDate}:`, attendancesOnDate.length);
    attendancesOnDate.forEach((att) => {
      console.log(`  - Teacher: ${att.teacher_id}, Status: ${att.status}`);
    });
    console.log("");

    // Check ELAN JAELANI specifically
    const elanTeacher = teachers.find((t) => t.full_name?.includes("ELAN"));
    if (elanTeacher) {
      console.log("🎯 ELAN JAELANI Found:");
      console.log("  - Full Name:", elanTeacher.full_name);
      console.log("  - Teacher ID:", elanTeacher.teacher_id);
      console.log("  - User ID:", elanTeacher.id);

      const elanAttendances = attendances.filter(
        (a) =>
          a.teacher_id === elanTeacher.teacher_id ||
          a.teacher_id === elanTeacher.id
      );
      console.log("  - Total Attendances:", elanAttendances.length);
      console.log("  - Attendances:", elanAttendances);
    } else {
      console.log("❌ ELAN JAELANI NOT FOUND in teachers array");
    }
    console.log("========================================");

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(`Presensi ${monthName} ${year}`);

      const daysInMonth = getDaysInMonth();
      const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

      // Calculate total columns dynamically
      // No (1) + Nama (1) + Days (30) + H (1) + I (1) + S (1) + A (1) + Total (1) + % (1) = 38 columns for 30 days
      const totalColumns = 2 + daysInMonth + 6; // 2 (No+Nama) + days + 6 (stats)

      // Helper function to get Excel column letter (A, B, C, ... Z, AA, AB, ...)
      const getColumnLetter = (colNumber) => {
        let letter = "";
        while (colNumber > 0) {
          const remainder = (colNumber - 1) % 26;
          letter = String.fromCharCode(65 + remainder) + letter;
          colNumber = Math.floor((colNumber - 1) / 26);
        }
        return letter;
      };

      const lastColumnLetter = getColumnLetter(totalColumns);

      console.log("📊 Excel Info:");
      console.log("  Days in month:", daysInMonth);
      console.log("  Total columns:", totalColumns);
      console.log("  Last column letter:", lastColumnLetter);

      // Header Info - Nama Sekolah
      worksheet.mergeCells(`A1:${lastColumnLetter}1`);
      worksheet.getCell("A1").value = "SMP MUSLIMIN CILILIN";
      worksheet.getCell("A1").font = { bold: true, size: 16 };
      worksheet.getCell("A1").alignment = {
        horizontal: "center",
        vertical: "middle",
      };

      // Header Info - Judul Daftar Hadir
      worksheet.mergeCells(`A2:${lastColumnLetter}2`);
      worksheet.getCell("A2").value = "DAFTAR HADIR GURU/STAFF";
      worksheet.getCell("A2").font = { bold: true, size: 14 };
      worksheet.getCell("A2").alignment = {
        horizontal: "center",
        vertical: "middle",
      };

      // Header Info - Bulan
      worksheet.mergeCells(`A3:${lastColumnLetter}3`);
      worksheet.getCell(
        "A3"
      ).value = `BULAN : ${monthName.toUpperCase()} ${year}`;
      worksheet.getCell("A3").font = { bold: true, size: 12 };
      worksheet.getCell("A3").alignment = {
        horizontal: "center",
        vertical: "middle",
      };

      // Kosong 2 baris
      worksheet.addRow([]);
      worksheet.addRow([]);

      // Table Header
      const headerRow = worksheet.addRow([
        "No",
        "Nama Guru",
        ...days,
        "H",
        "I",
        "S",
        "A",
        "Total",
        "%",
      ]);

      // Style header
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4472C4" },
        };
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      // Data Rows
      teachers.forEach((teacher, index) => {
        // DEBUG: Log setiap teacher yang diproses
        console.log(
          `Processing Teacher ${index + 1}: ${teacher.full_name} (ID: ${
            teacher.teacher_id || teacher.id
          })`
        );

        const stats = calculateTeacherStats(teacher.teacher_id || teacher.id); // Try both fields
        console.log(`  Stats:`, stats);

        const rowData = [
          index + 1,
          teacher.full_name,
          ...days.map((day) => {
            const attendance = getAttendanceForDay(
              teacher.teacher_id || teacher.id,
              day
            ); // Try both fields
            const label = attendance ? getStatusLabel(attendance.status) : "-";

            // DEBUG: Log attendance for day 26
            if (day === 26 && attendance) {
              console.log(`  ✅ Day 26 - Attendance found:`, attendance);
            }

            return label;
          }),
          stats.hadir,
          stats.izin,
          stats.sakit,
          stats.alpa,
          stats.total,
          `${stats.percentage}%`,
        ];

        const row = worksheet.addRow(rowData);

        // Style data rows
        row.eachCell((cell, colNumber) => {
          cell.alignment = {
            horizontal: colNumber <= 2 ? "left" : "center",
            vertical: "middle",
          };
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };

          // Color coding untuk status
          if (colNumber > 2 && colNumber <= 2 + daysInMonth) {
            const value = cell.value;
            if (value === "H") {
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FF92D050" },
              };
              cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
            } else if (value === "I") {
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FF5B9BD5" },
              };
              cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
            } else if (value === "S") {
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFFFC000" },
              };
              cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
            } else if (value === "A") {
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFFF0000" },
              };
              cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
            }
          }

          // Bold stats columns (H, I, S, A, Total, %)
          if (colNumber > 2 + daysInMonth) {
            cell.font = { bold: true };
          }
        });
      });

      // Column widths
      worksheet.getColumn(1).width = 5; // No
      worksheet.getColumn(2).width = 30; // Nama Guru

      // Days columns
      for (let i = 3; i <= 2 + daysInMonth; i++) {
        worksheet.getColumn(i).width = 4;
      }

      // Stats columns
      worksheet.getColumn(3 + daysInMonth).width = 5; // H
      worksheet.getColumn(4 + daysInMonth).width = 5; // I
      worksheet.getColumn(5 + daysInMonth).width = 5; // S
      worksheet.getColumn(6 + daysInMonth).width = 5; // A
      worksheet.getColumn(7 + daysInMonth).width = 7; // Total
      worksheet.getColumn(8 + daysInMonth).width = 8; // %

      // Add legend
      const legendStartRow = worksheet.rowCount + 2;
      worksheet.addRow([]);
      worksheet.addRow(["Keterangan:"]);
      worksheet.getCell(`A${legendStartRow + 1}`).font = { bold: true };

      const legends = [
        ["H", "Hadir"],
        ["I", "Izin"],
        ["S", "Sakit"],
        ["A", "Alpha"],
        ["-", "Belum Absen"],
      ];

      legends.forEach(([code, label]) => {
        const row = worksheet.addRow([code, label]);
        row.getCell(1).alignment = { horizontal: "center" };
        row.getCell(1).font = { bold: true };
      });

      // Generate file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Presensi_Guru_${monthName}_${year}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

      // Close modal after success
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Gagal mengekspor data ke Excel");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="text-green-600" size={24} />
            <h3 className="text-xl font-bold text-gray-800">Export ke Excel</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800 mb-2">
            <strong>File yang akan diexport:</strong>
          </p>
          <p className="text-sm text-blue-700">
            📄 Presensi_Guru_{monthName}_{year}.xlsx
          </p>
          <p className="text-xs text-blue-600 mt-2">
            Data: {teachers.length} guru, {attendances.length} presensi
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-all">
            Batal
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2">
            {exporting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Exporting...
              </>
            ) : (
              <>
                <Download size={20} />
                Export Excel
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportExcel;
