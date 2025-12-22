import * as XLSX from "xlsx";
import { supabase } from "../supabaseClient";

/**
 * 📥 DOWNLOAD TEMPLATE KOSONG
 * Generate Excel template dengan helper sheets
 */
export const downloadTemplate = async (showToast) => {
  try {
    // Fetch data untuk helper sheets
    const [teachersRes, classesRes, yearsRes, subjectsRes] = await Promise.all([
      supabase
        .from("users")
        .select("teacher_id, full_name, role")
        .not("teacher_id", "is", null)
        .eq("is_active", true)
        .order("teacher_id"),
      supabase
        .from("classes")
        .select("id, grade")
        .eq("is_active", true)
        .order("grade"),
      supabase
        .from("academic_years")
        .select("year, is_active")
        .order("year", { ascending: false }),
      supabase.from("teacher_assignments").select("subject").order("subject"),
    ]);

    // Extract unique subjects
    const uniqueSubjects = [
      ...new Set(subjectsRes.data?.map((item) => item.subject).filter(Boolean)),
    ].sort();

    // Create workbook
    const wb = XLSX.utils.book_new();

    // ===== SHEET 1: TEMPLATE PENUGASAN =====
    const templateData = [
      ["teacher_id", "class_id", "subject", "academic_year", "semester"],
      ["G-01", "7A", "MATEMATIKA", "2025/2026", "1"],
      ["G-02", "7B", "BAHASA INDONESIA", "2025/2026", "1"],
      ["CONTOH", "CONTOH", "CONTOH - HAPUS BARIS INI", "CONTOH", "CONTOH"],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(templateData);

    // Set column widths
    ws1["!cols"] = [
      { wch: 12 }, // teacher_id
      { wch: 10 }, // class_id
      { wch: 25 }, // subject
      { wch: 15 }, // academic_year
      { wch: 10 }, // semester
    ];

    XLSX.utils.book_append_sheet(wb, ws1, "TEMPLATE");

    // ===== SHEET 2: DAFTAR GURU =====
    const teachersData = [
      ["teacher_id", "full_name", "role"],
      ...(teachersRes.data || []).map((t) => [
        t.teacher_id,
        t.full_name,
        t.role,
      ]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(teachersData);
    ws2["!cols"] = [{ wch: 12 }, { wch: 30 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws2, "DAFTAR GURU");

    // ===== SHEET 3: DAFTAR KELAS =====
    const classesData = [
      ["class_id", "grade"],
      ...(classesRes.data || []).map((c) => [c.id, c.grade]),
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(classesData);
    ws3["!cols"] = [{ wch: 12 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws3, "DAFTAR KELAS");

    // ===== SHEET 4: TAHUN AJARAN =====
    const yearsData = [
      ["academic_year", "is_active"],
      ...(yearsRes.data || []).map((y) => [
        y.year,
        y.is_active ? "Aktif" : "Tidak Aktif",
      ]),
    ];
    const ws4 = XLSX.utils.aoa_to_sheet(yearsData);
    ws4["!cols"] = [{ wch: 15 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws4, "TAHUN AJARAN");

    // ===== SHEET 5: DAFTAR MATA PELAJARAN =====
    const subjectsData = [["subject"], ...uniqueSubjects.map((s) => [s])];
    const ws5 = XLSX.utils.aoa_to_sheet(subjectsData);
    ws5["!cols"] = [{ wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws5, "MATA PELAJARAN");

    // ===== SHEET 6: INSTRUKSI =====
    const instructionsData = [
      ["PANDUAN PENGISIAN TEMPLATE PENUGASAN GURU"],
      [""],
      ["KOLOM WAJIB DIISI:"],
      [
        "1. teacher_id",
        "Kode guru (contoh: G-01, G-02) - Lihat di sheet DAFTAR GURU",
      ],
      [
        "2. class_id",
        "ID kelas (contoh: 7A, 8B) - Lihat di sheet DAFTAR KELAS",
      ],
      [
        "3. subject",
        "Mata pelajaran (HURUF KAPITAL) - Lihat di sheet MATA PELAJARAN",
      ],
      [
        "4. academic_year",
        "Tahun ajaran (contoh: 2025/2026) - Lihat di sheet TAHUN AJARAN",
      ],
      ["5. semester", "1 atau 2"],
      [""],
      ["TIPS:"],
      ["• Gunakan Copy-Paste dari sheet helper untuk menghindari typo"],
      ["• Mata pelajaran harus ditulis HURUF KAPITAL"],
      ["• Semester hanya boleh diisi angka 1 atau 2"],
      ["• Hapus baris contoh sebelum import"],
      ["• Pastikan tidak ada baris kosong di tengah data"],
      [""],
      ["VALIDASI OTOMATIS:"],
      ["✓ teacher_id harus ada di database"],
      ["✓ class_id harus ada di database"],
      ["✓ academic_year harus valid"],
      ["✓ Tidak boleh ada penugasan duplikat"],
      [""],
      ["CARA IMPORT:"],
      ["1. Isi template di sheet TEMPLATE"],
      ["2. Klik tombol Import di aplikasi"],
      ["3. Upload file Excel ini"],
      ["4. Sistem akan validasi otomatis"],
      ["5. Preview data sebelum disimpan"],
      ["6. Klik Simpan jika data sudah benar"],
    ];
    const ws6 = XLSX.utils.aoa_to_sheet(instructionsData);
    ws6["!cols"] = [{ wch: 50 }, { wch: 70 }];
    XLSX.utils.book_append_sheet(wb, ws6, "INSTRUKSI");

    // Download file
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `Template_Penugasan_Guru_${timestamp}.xlsx`;
    XLSX.writeFile(wb, filename);

    showToast?.(
      "Template berhasil didownload! Cek folder Downloads.",
      "success"
    );
    return true;
  } catch (error) {
    console.error("Error downloading template:", error);
    showToast?.("Gagal download template: " + error.message, "error");
    return false;
  }
};

/**
 * 📤 EXPORT DATA PENUGASAN
 * Export existing assignments ke Excel
 */
export const exportAssignments = async (assignments, filters, showToast) => {
  try {
    if (!assignments || assignments.length === 0) {
      showToast?.("Tidak ada data untuk diexport", "error");
      return false;
    }

    // Prepare data untuk export
    const exportData = [
      [
        "teacher_id",
        "teacher_name",
        "class_id",
        "subject",
        "academic_year",
        "semester",
        "created_at",
      ],
      ...assignments.map((a) => [
        a.teacher_id,
        a.users?.full_name || "-",
        a.class_id,
        a.subject,
        a.academic_year,
        a.semester,
        a.created_at ? new Date(a.created_at).toLocaleDateString("id-ID") : "-",
      ]),
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(exportData);

    // Set column widths
    ws["!cols"] = [
      { wch: 12 }, // teacher_id
      { wch: 25 }, // teacher_name
      { wch: 10 }, // class_id
      { wch: 25 }, // subject
      { wch: 15 }, // academic_year
      { wch: 10 }, // semester
      { wch: 15 }, // created_at
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Penugasan Guru");

    // Add filter info sheet
    const filterInfo = [
      ["INFORMASI EXPORT"],
      ["Tanggal Export", new Date().toLocaleString("id-ID")],
      ["Total Data", assignments.length],
      [""],
      ["FILTER YANG DIGUNAKAN:"],
      ["Tahun Ajaran", filters?.academicYear || "Semua"],
      ["Semester", filters?.semester || "Semua"],
      ["Kelas", filters?.class || "Semua"],
      ["Guru", filters?.teacher || "Semua"],
      ["Mata Pelajaran", filters?.subject || "Semua"],
    ];
    const wsInfo = XLSX.utils.aoa_to_sheet(filterInfo);
    wsInfo["!cols"] = [{ wch: 20 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsInfo, "Info Export");

    // Download file
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `Export_Penugasan_Guru_${timestamp}.xlsx`;
    XLSX.writeFile(wb, filename);

    showToast?.(
      `Berhasil export ${assignments.length} data penugasan`,
      "success"
    );
    return true;
  } catch (error) {
    console.error("Error exporting data:", error);
    showToast?.("Gagal export data: " + error.message, "error");
    return false;
  }
};

/**
 * 📋 VALIDATE IMPORT DATA
 * Validasi data Excel sebelum import
 */
export const validateImportData = async (jsonData, showToast) => {
  try {
    const errors = [];
    const warnings = [];
    const validData = [];

    // Fetch reference data dari database
    const [teachersRes, classesRes, yearsRes] = await Promise.all([
      supabase.from("users").select("teacher_id").not("teacher_id", "is", null),
      supabase.from("classes").select("id").eq("is_active", true),
      supabase.from("academic_years").select("id, year"),
    ]);

    const validTeacherIds = new Set(
      teachersRes.data?.map((t) => t.teacher_id) || []
    );
    const validClassIds = new Set(classesRes.data?.map((c) => c.id) || []);
    const yearMap = {};
    yearsRes.data?.forEach((y) => {
      yearMap[y.year] = y.id;
    });

    // Validasi setiap row
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNum = i + 2; // Excel row number (header = 1)
      const rowErrors = [];

      // Skip empty rows
      if (
        !row.teacher_id &&
        !row.class_id &&
        !row.subject &&
        !row.academic_year
      ) {
        continue;
      }

      // Skip contoh rows
      if (
        row.teacher_id?.includes("CONTOH") ||
        row.subject?.includes("CONTOH")
      ) {
        continue;
      }

      // Validasi teacher_id
      if (!row.teacher_id) {
        rowErrors.push("teacher_id kosong");
      } else if (!validTeacherIds.has(row.teacher_id)) {
        rowErrors.push(
          `teacher_id "${row.teacher_id}" tidak ditemukan di database`
        );
      }

      // Validasi class_id
      if (!row.class_id) {
        rowErrors.push("class_id kosong");
      } else if (!validClassIds.has(row.class_id)) {
        rowErrors.push(
          `class_id "${row.class_id}" tidak ditemukan di database`
        );
      }

      // Validasi subject
      if (!row.subject) {
        rowErrors.push("subject kosong");
      } else if (row.subject !== row.subject.toUpperCase()) {
        warnings.push(`Baris ${rowNum}: Subject akan diubah ke HURUF KAPITAL`);
        row.subject = row.subject.toUpperCase();
      }

      // Validasi academic_year
      if (!row.academic_year) {
        rowErrors.push("academic_year kosong");
      } else if (!yearMap[row.academic_year]) {
        rowErrors.push(
          `academic_year "${row.academic_year}" tidak ditemukan di database`
        );
      }

      // Validasi semester
      if (!row.semester) {
        rowErrors.push("semester kosong");
      } else if (!["1", "2", 1, 2].includes(row.semester)) {
        rowErrors.push("semester harus 1 atau 2");
      }

      // Jika ada error di row ini
      if (rowErrors.length > 0) {
        errors.push({
          row: rowNum,
          data: row,
          errors: rowErrors,
        });
      } else {
        // Data valid, tambahkan academic_year_id
        validData.push({
          teacher_id: row.teacher_id,
          class_id: row.class_id,
          subject: row.subject.toUpperCase(),
          academic_year: row.academic_year,
          academic_year_id: yearMap[row.academic_year],
          semester: String(row.semester),
        });
      }
    }

    // Check duplicates dalam file Excel
    const seen = new Set();
    const duplicates = [];
    validData.forEach((item, idx) => {
      const key = `${item.teacher_id}-${item.class_id}-${item.subject}-${item.academic_year_id}-${item.semester}`;
      if (seen.has(key)) {
        duplicates.push({
          row: idx + 2,
          data: item,
        });
      }
      seen.add(key);
    });

    if (duplicates.length > 0) {
      duplicates.forEach((dup) => {
        errors.push({
          row: dup.row,
          data: dup.data,
          errors: ["Data duplikat dalam file Excel"],
        });
      });
    }

    // Check duplicates dengan database
    if (validData.length > 0) {
      const { data: existingData } = await supabase
        .from("teacher_assignments")
        .select("teacher_id, class_id, subject, academic_year_id, semester");

      const existingSet = new Set(
        existingData?.map(
          (item) =>
            `${item.teacher_id}-${item.class_id}-${item.subject}-${item.academic_year_id}-${item.semester}`
        ) || []
      );

      validData.forEach((item, idx) => {
        const key = `${item.teacher_id}-${item.class_id}-${item.subject}-${item.academic_year_id}-${item.semester}`;
        if (existingSet.has(key)) {
          warnings.push(
            `Baris ${idx + 2}: Data sudah ada di database (akan di-skip)`
          );
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
    console.error("Error validating data:", error);
    showToast?.("Gagal validasi data: " + error.message, "error");
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
 * 📤 IMPORT DATA KE DATABASE
 * Import validated data ke Supabase
 */
export const importAssignments = async (
  validData,
  mode = "skip",
  showToast
) => {
  try {
    if (!validData || validData.length === 0) {
      showToast?.("Tidak ada data valid untuk diimport", "error");
      return { success: false, inserted: 0, skipped: 0, updated: 0 };
    }

    let inserted = 0;
    let skipped = 0;
    let updated = 0;

    // Check existing data
    const { data: existingData } = await supabase
      .from("teacher_assignments")
      .select("id, teacher_id, class_id, subject, academic_year_id, semester");

    const existingMap = new Map();
    existingData?.forEach((item) => {
      const key = `${item.teacher_id}-${item.class_id}-${item.subject}-${item.academic_year_id}-${item.semester}`;
      existingMap.set(key, item.id);
    });

    for (const item of validData) {
      const key = `${item.teacher_id}-${item.class_id}-${item.subject}-${item.academic_year_id}-${item.semester}`;
      const existingId = existingMap.get(key);

      if (existingId) {
        if (mode === "skip") {
          skipped++;
          continue;
        } else if (mode === "update") {
          // Update existing record
          const { error } = await supabase
            .from("teacher_assignments")
            .update({
              teacher_id: item.teacher_id,
              class_id: item.class_id,
              subject: item.subject,
              academic_year: item.academic_year,
              academic_year_id: item.academic_year_id,
              semester: item.semester,
            })
            .eq("id", existingId);

          if (error) throw error;
          updated++;
        }
      } else {
        // Insert new record
        const { error } = await supabase.from("teacher_assignments").insert([
          {
            teacher_id: item.teacher_id,
            class_id: item.class_id,
            subject: item.subject,
            academic_year: item.academic_year,
            academic_year_id: item.academic_year_id,
            semester: item.semester,
            created_at: new Date().toISOString(),
          },
        ]);

        if (error) throw error;
        inserted++;
      }
    }

    const message = `Import selesai: ${inserted} baru, ${updated} diupdate, ${skipped} di-skip`;
    showToast?.(message, "success");

    return {
      success: true,
      inserted,
      updated,
      skipped,
      total: inserted + updated + skipped,
    };
  } catch (error) {
    console.error("Error importing data:", error);
    showToast?.("Gagal import data: " + error.message, "error");
    return {
      success: false,
      inserted: 0,
      updated: 0,
      skipped: 0,
      error: error.message,
    };
  }
};

/**
 * 📁 READ EXCEL FILE
 * Baca file Excel yang diupload user
 */
export const readExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        // Baca sheet pertama (TEMPLATE)
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          raw: false, // Convert semua ke string
          defval: "", // Default value untuk cell kosong
        });

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
 * Generate Excel file berisi error details
 */
export const generateErrorReport = (validationResult) => {
  try {
    if (!validationResult.errors || validationResult.errors.length === 0) {
      return false;
    }

    const wb = XLSX.utils.book_new();

    // Error details
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
    ws["!cols"] = [
      { wch: 8 },
      { wch: 12 },
      { wch: 10 },
      { wch: 25 },
      { wch: 50 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Errors");

    // Download
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `Import_Errors_${timestamp}.xlsx`;
    XLSX.writeFile(wb, filename);

    return true;
  } catch (error) {
    console.error("Error generating error report:", error);
    return false;
  }
};
