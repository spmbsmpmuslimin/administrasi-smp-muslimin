// BulkImportModals.js
import React, { useState } from "react";
import {
  Upload,
  Download,
  FileText,
  AlertCircle,
  X,
  CheckSquare,
} from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { supabase } from "../../supabaseClient"; // INI 100% BENAR

// Import Modal Component
export const ImportModal = ({
  modal,
  setModal,
  importScope,
  setImportScope,
  importPreview,
  setImportPreview,
  importErrors,
  setImportErrors,
  importProgress,
  setImportProgress,
  activeAcademicYear,
  availableClasses,
  onExecuteImport,
  loading,
  showToast,
  onParseCSV,
}) => {
  // ... (code untuk semua modal states: upload, preview, error, processing, success)
  // Karena panjang, saya akan tulis struktur utama saja

  if (!modal.show) return null;

  switch (modal.mode) {
    case "upload":
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          {/* Upload Modal UI */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-5 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <Upload size={24} />
                <div>
                  <h2 className="text-xl font-bold">Import Siswa dari CSV</h2>
                  <p className="text-purple-100 text-sm">
                    Upload file CSV untuk import data siswa
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Scope Selection */}
              {/* File Upload */}
              {/* Download Template */}
              {/* Format Info */}
            </div>
          </div>
        </div>
      );

    case "preview":
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          {/* Preview Modal UI */}
        </div>
      );

    case "error":
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          {/* Error Modal UI */}
        </div>
      );

    case "processing":
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          {/* Processing Modal UI */}
        </div>
      );

    case "success":
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          {/* Success Modal UI */}
        </div>
      );

    default:
      return null;
  }
};

// Parse CSV file menggunakan Papaparse
export const parseCSVFile = (file) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: (results) => {
        resolve(results.data);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};

// Generate NIS baru untuk siswa kelas 7
export const generateNISForGrade7 = async (activeYear, supabase) => {
  const [startYear, endYear] = activeYear.year.split("/");
  const prefix = `${startYear.slice(-2)}.${endYear.slice(-2)}.07.`;

  // Get last NIS dengan pattern ini
  const { data, error } = await supabase
    .from("students")
    .select("nis")
    .like("nis", `${prefix}%`)
    .order("nis", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error getting last NIS:", error);
    return `${prefix}001`;
  }

  let nextNumber = 1;

  if (data && data.length > 0) {
    const lastNIS = data[0].nis;
    const lastNumber = parseInt(lastNIS.split(".")[3]);
    nextNumber = lastNumber + 1;

    if (nextNumber > 999) {
      throw new Error("Nomor urut NIS sudah mencapai maksimal (999)");
    }
  }

  return `${prefix}${String(nextNumber).padStart(3, "0")}`;
};

// Validasi format dan pattern NIS
export const validateNISPattern = (nis, grade, activeYear) => {
  // ... (validation logic)
  return { valid: true };
};

// Validasi data import dari CSV
export const validateImportData = async (
  rows,
  validClassIds,
  activeYear,
  scope,
  supabase
) => {
  // ... (validation logic)
  return { validRows: [], invalidRows: [], errors: [] };
};

// Execute bulk import ke database
export const executeImport = async (
  validatedData,
  activeAcademicYear,
  supabase,
  setProgress,
  showToast
) => {
  // ... (import logic)
};

// Download template CSV
export const downloadCSVTemplate = (importScope, activeAcademicYear) => {
  // ... (template generation logic)
};

// 🆕 EXPORT EXCEL FUNCTION
export const exportStudentsToExcel = (students, scope, activeAcademicYear) => {
  try {
    // Filter students berdasarkan scope
    let filteredData = [...students];

    if (scope.type === "class" && scope.value) {
      filteredData = filteredData.filter(
        (student) => student.class_id === scope.value
      );
    } else if (scope.type === "grade7") {
      filteredData = filteredData.filter(
        (student) => student.classes?.grade === 7
      );
    } else if (scope.type === "grade8") {
      filteredData = filteredData.filter(
        (student) => student.classes?.grade === 8
      );
    } else if (scope.type === "grade9") {
      filteredData = filteredData.filter(
        (student) => student.classes?.grade === 9
      );
    }

    if (filteredData.length === 0) {
      throw new Error("Tidak ada data siswa untuk diexport");
    }

    // Format data untuk Excel
    const excelData = filteredData.map((student) => {
      // Format untuk Grade 7 (tanpa NIS)
      if (scope.type === "grade7") {
        return {
          "Nama Lengkap": student.full_name,
          "Jenis Kelamin": student.gender === "L" ? "Laki-laki" : "Perempuan",
          Kelas: student.class_id,
        };
      }

      // Format untuk Grade 8/9/All (dengan NIS)
      return {
        NIS: student.nis,
        "Nama Lengkap": student.full_name,
        "Jenis Kelamin": student.gender === "L" ? "Laki-laki" : "Perempuan",
        Kelas: student.class_id,
        "Tahun Ajaran": student.academic_year || activeAcademicYear?.year,
      };
    });

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const colWidths = [];
    if (scope.type === "grade7") {
      colWidths.push({ wch: 30 }, { wch: 15 }, { wch: 10 });
    } else {
      colWidths.push(
        { wch: 15 },
        { wch: 30 },
        { wch: 15 },
        { wch: 10 },
        { wch: 15 }
      );
    }
    worksheet["!cols"] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

    // Generate filename
    const date = new Date().toISOString().split("T")[0];
    let filename = `export_students_${scope.type}`;
    if (scope.type === "class" && scope.value) {
      filename += `_${scope.value}`;
    }
    filename += `_${date}.xlsx`;

    // Save file
    XLSX.writeFile(workbook, filename);

    return {
      success: true,
      filename,
      count: filteredData.length,
    };
  } catch (error) {
    console.error("Export Excel error:", error);
    throw error;
  }
};
