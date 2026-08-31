import * as XLSX from "xlsx";
import { supabase } from "../supabaseClient";
import { getActiveAcademicInfo } from "../services/academicYearService";

/**
 * 📥 DOWNLOAD TEMPLATE SEDERHANA (1 SHEET AJA)
 */
export const downloadTemplate = async (showToast) => {
  try {
    const activeAcademicInfo = await getActiveAcademicInfo();

    const wb = XLSX.utils.book_new();

    // TEMPLATE - Sesuai struktur database
    const templateData = [
      // Header (nama kolom database)
      ["teacher_id", "class_id", "subject", "academic_year", "semester"],

      // Contoh data (pakai data aktif)
      ["G-01", "7A", "MATEMATIKA", activeAcademicInfo.year, activeAcademicInfo.activeSemester],
      [
        "G-02",
        "7B",
        "BAHASA INDONESIA",
        activeAcademicInfo.year,
        activeAcademicInfo.activeSemester,
      ],

      // Info (opsional, bisa dihapus)
      ["", "", "", "", ""],
      ["PETUNJUK:", "", "", "", ""],
      [`Tahun Ajaran Aktif: ${activeAcademicInfo.year}`, "", "", "", ""],
      [`Semester Aktif: ${activeAcademicInfo.activeSemester}`, "", "", "", ""],
      ["Hapus baris contoh & petunjuk sebelum import", "", "", "", ""],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);

    // Set lebar kolom
    ws["!cols"] = [
      { wch: 12 }, // teacher_id
      { wch: 10 }, // class_id
      { wch: 30 }, // subject
      { wch: 12 }, // academic_year
      { wch: 10 }, // semester
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Template Penugasan");

    // Download
    const timestamp = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `Template_Penugasan_${timestamp}.xlsx`);

    showToast?.("Template berhasil didownload", "success");
    return true;
  } catch (error) {
    console.error("Error download template:", error);
    showToast?.("Gagal download template: " + error.message, "error");
    return false;
  }
};

/**
 * 📤 EXPORT DATA (FORMAT SAMA PERSIS KAYAK TEMPLATE)
 */
export const exportAssignments = async (assignments, showToast) => {
  try {
    if (!assignments || assignments.length === 0) {
      showToast?.("Tidak ada data untuk diexport", "error");
      return false;
    }

    const activeAcademicInfo = await getActiveAcademicInfo();

    const wb = XLSX.utils.book_new();

    // Data export - PERSIS SAMA kayak template
    const exportData = [
      // Header (sama persis kayak template)
      ["teacher_id", "class_id", "subject", "academic_year", "semester"],

      // Data dari database
      ...assignments.map((a) => [a.teacher_id, a.class_id, a.subject, a.academic_year, a.semester]),

      // Info di bawah (opsional)
      ["", "", "", "", ""],
      [`Exported: ${new Date().toLocaleString("id-ID")}`, "", "", "", ""],
      [`Total: ${assignments.length} data`, "", "", "", ""],
      [`Tahun Ajaran Aktif: ${activeAcademicInfo.year}`, "", "", "", ""],
      [`Semester Aktif: ${activeAcademicInfo.activeSemester}`, "", "", "", ""],
    ];

    const ws = XLSX.utils.aoa_to_sheet(exportData);

    ws["!cols"] = [{ wch: 12 }, { wch: 10 }, { wch: 30 }, { wch: 12 }, { wch: 10 }];

    XLSX.utils.book_append_sheet(wb, ws, "Data Penugasan");

    const timestamp = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `Export_Penugasan_${timestamp}.xlsx`);

    showToast?.(`Berhasil export ${assignments.length} data`, "success");
    return true;
  } catch (error) {
    console.error("Error export:", error);
    showToast?.("Gagal export: " + error.message, "error");
    return false;
  }
};

/**
 * 📋 VALIDASI DATA IMPORT
 */
export const validateImportData = async (jsonData, showToast) => {
  try {
    const errors = [];
    const warnings = [];
    const validData = [];

    const activeAcademicInfo = await getActiveAcademicInfo();

    // Fetch data referensi
    const [teachersRes, classesRes] = await Promise.all([
      supabase
        .from("users")
        .select("teacher_id")
        .not("teacher_id", "is", null)
        .eq("is_active", true),
      supabase.from("classes").select("id").eq("is_active", true),
    ]);

    const validTeacherIds = new Set(teachersRes.data?.map((t) => t.teacher_id) || []);
    const validClassIds = new Set(classesRes.data?.map((c) => c.id) || []);

    // Fetch academic_years untuk mapping
    const { data: yearData } = await supabase.from("academic_years").select("id, year, semester");

    const yearMap = new Map();
    yearData?.forEach((y) => {
      const key = `${y.year}-${y.semester}`;
      yearMap.set(key, y.id);
    });

    // Validasi setiap row
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNum = i + 2;
      const rowErrors = [];

      // Skip empty rows
      if (!row.teacher_id && !row.class_id && !row.subject) continue;

      // Skip rows dengan "PETUNJUK" atau info
      if (
        String(row.teacher_id || "").includes("PETUNJUK") ||
        String(row.teacher_id || "").includes("Tahun Ajaran") ||
        String(row.teacher_id || "").includes("Semester Aktif") ||
        String(row.teacher_id || "").includes("Hapus")
      ) {
        continue;
      }

      // Validasi teacher_id
      if (!row.teacher_id) {
        rowErrors.push("teacher_id kosong");
      } else if (!validTeacherIds.has(row.teacher_id)) {
        rowErrors.push(`teacher_id "${row.teacher_id}" tidak ada di database`);
      }

      // Validasi class_id
      if (!row.class_id) {
        rowErrors.push("class_id kosong");
      } else if (!validClassIds.has(row.class_id)) {
        rowErrors.push(`class_id "${row.class_id}" tidak ada di database`);
      }

      // Validasi subject
      if (!row.subject) {
        rowErrors.push("subject kosong");
      }

      // Validasi academic_year
      if (!row.academic_year) {
        rowErrors.push("academic_year kosong");
      }

      // Validasi semester
      if (!row.semester) {
        rowErrors.push("semester kosong");
      } else if (!["1", "2", 1, 2].includes(row.semester)) {
        rowErrors.push("semester harus 1 atau 2");
      }

      // Cari academic_year_id
      const yearKey = `${row.academic_year}-${row.semester}`;
      const academicYearId = yearMap.get(yearKey);

      if (!academicYearId) {
        rowErrors.push(`Tahun ${row.academic_year} Semester ${row.semester} tidak ada di database`);
      }

      // Warning jika beda semester aktif
      if (row.semester != activeAcademicInfo.activeSemester) {
        warnings.push(
          `Baris ${rowNum}: Semester ${row.semester} berbeda dengan semester aktif (${activeAcademicInfo.activeSemester})`
        );
      }

      // Simpan hasil
      if (rowErrors.length > 0) {
        errors.push({ row: rowNum, data: row, errors: rowErrors });
      } else {
        validData.push({
          teacher_id: row.teacher_id,
          class_id: row.class_id,
          subject: String(row.subject).toUpperCase(),
          academic_year: row.academic_year,
          academic_year_id: academicYearId,
          semester: String(row.semester),
        });
      }
    }

    // Check duplikat dalam file
    const seen = new Set();
    validData.forEach((item, idx) => {
      const key = `${item.teacher_id}-${item.class_id}-${item.subject}-${item.academic_year_id}`;
      if (seen.has(key)) {
        warnings.push(`Baris ${idx + 2}: Data duplikat dalam file`);
      }
      seen.add(key);
    });

    // Check duplikat dengan database
    if (validData.length > 0) {
      const { data: existingData } = await supabase
        .from("teacher_assignments")
        .select("teacher_id, class_id, subject, academic_year_id");

      const existingSet = new Set(
        existingData?.map(
          (item) => `${item.teacher_id}-${item.class_id}-${item.subject}-${item.academic_year_id}`
        ) || []
      );

      validData.forEach((item, idx) => {
        const key = `${item.teacher_id}-${item.class_id}-${item.subject}-${item.academic_year_id}`;
        if (existingSet.has(key)) {
          warnings.push(`Baris ${idx + 2}: Data sudah ada di database (akan di-skip)`);
        }
      });
    }

    return {
      success: errors.length === 0,
      validData,
      errors,
      warnings,
      summary: {
        total: jsonData.length,
        valid: validData.length,
        invalid: errors.length,
        warnings: warnings.length,
      },
    };
  } catch (error) {
    console.error("Error validasi:", error);
    showToast?.("Gagal validasi: " + error.message, "error");
    return {
      success: false,
      validData: [],
      errors: [{ row: 0, errors: [error.message] }],
      warnings: [],
      summary: { total: 0, valid: 0, invalid: 0, warnings: 0 },
    };
  }
};

/**
 * 📤 IMPORT KE DATABASE
 */
export const importAssignments = async (validData, mode = "skip", showToast) => {
  try {
    if (!validData || validData.length === 0) {
      showToast?.("Tidak ada data valid untuk diimport", "error");
      return { success: false, inserted: 0, skipped: 0 };
    }

    let inserted = 0;
    let skipped = 0;

    // Check existing
    const { data: existingData } = await supabase
      .from("teacher_assignments")
      .select("id, teacher_id, class_id, subject, academic_year_id");

    const existingMap = new Map();
    existingData?.forEach((item) => {
      const key = `${item.teacher_id}-${item.class_id}-${item.subject}-${item.academic_year_id}`;
      existingMap.set(key, item.id);
    });

    // Insert yang belum ada
    for (const item of validData) {
      const key = `${item.teacher_id}-${item.class_id}-${item.subject}-${item.academic_year_id}`;

      if (existingMap.has(key)) {
        skipped++;
      } else {
        const { error } = await supabase.from("teacher_assignments").insert([item]);
        if (error) throw error;
        inserted++;
      }
    }

    showToast?.(`Import selesai: ${inserted} baru, ${skipped} di-skip`, "success");
    return { success: true, inserted, skipped };
  } catch (error) {
    console.error("Error import:", error);
    showToast?.("Gagal import: " + error.message, "error");
    return { success: false, inserted: 0, skipped: 0, error: error.message };
  }
};

/**
 * 📖 BACA FILE EXCEL
 */
export const readExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" });
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

/**
 * 📊 GENERATE ERROR REPORT
 */
export const generateErrorReport = (validationResult) => {
  try {
    if (!validationResult.errors || validationResult.errors.length === 0) {
      return false;
    }

    const wb = XLSX.utils.book_new();

    const errorData = [
      ["Baris", "teacher_id", "class_id", "subject", "Error"],
      ...validationResult.errors.map((err) => [
        err.row,
        err.data?.teacher_id || "-",
        err.data?.class_id || "-",
        err.data?.subject || "-",
        err.errors.join("; "),
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(errorData);
    ws["!cols"] = [{ wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 30 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, ws, "Errors");

    const timestamp = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `Import_Errors_${timestamp}.xlsx`);

    return true;
  } catch (error) {
    console.error("Error generate report:", error);
    return false;
  }
};
