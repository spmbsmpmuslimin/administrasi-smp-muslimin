// src/services/semesterService.js - REFACTORED FOR SMP
// ✅ Integrated with academicYearService
// ✅ Semester-safe queries with academic_year_id filtering
// ✅ No more hardcoded month logic

import { supabase } from "../supabaseClient";
import {
  filterBySemester,
  getSemesterById,
  getActiveAcademicInfo,
  getSemesterDisplayName,
  validateSemesterForInput,
} from "./academicYearService";

/**
 * ✅ REFACTORED: GET SEMESTER DATA (Summary View) - SMP VERSION
 * For: Semester tab - aggregated data tanpa detail harian
 *
 * @param {string} semesterId - UUID semester dari academic_years table
 * @param {string} classId - UUID kelas
 * @param {string} subject - Nama mata pelajaran
 * @param {string} type - Type attendance (default: "mapel")
 * @returns {Promise<Array>} Student attendance summary
 */
export const getSemesterData = async (
  semesterId,
  classId,
  subject,
  type = "mapel"
) => {
  try {
    console.log("=== FETCH SEMESTER DATA (SMP - REFACTORED) ===");

    // ✅ Validate semester exists
    const semester = await getSemesterById(semesterId);

    if (!semester) {
      console.error("❌ Semester not found:", semesterId);
      return [];
    }

    const semesterName = await getSemesterDisplayName(semesterId);
    console.log("📅 Fetching data for:", semesterName);
    console.log({
      semesterId,
      classId,
      subject,
      type,
    });

    // ✅ Build query dengan semester filter
    let query = supabase
      .from("attendances")
      .select(
        `
        *,
        students!inner(id, full_name, nis)
      `
      )
      .eq("class_id", classId)
      .eq("subject", subject)
      .eq("type", type)
      .order("date", { ascending: true });

    // ✅ CRITICAL: Apply semester filter
    query = filterBySemester(query, semesterId, { strict: true });

    // ✅ FETCH ALL DATA dengan PAGINATION
    console.log("🔍 Fetching with pagination...");

    let allRecords = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const rangedQuery = query.range(
        page * pageSize,
        (page + 1) * pageSize - 1
      );

      const { data, error } = await rangedQuery;

      if (error) {
        console.error("❌ Query error on page", page + 1, ":", error);
        throw error;
      }

      if (data && data.length > 0) {
        allRecords = [...allRecords, ...data];
        console.log(
          `📄 Page ${page + 1}: ${data.length} records (Total: ${
            allRecords.length
          })`
        );

        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }

    console.log("✅ Total attendance records fetched:", allRecords.length);

    if (allRecords.length === 0) {
      console.log("ℹ️ No attendance data found for this semester");
      return [];
    }

    // ✅ Calculate unique dates (hari efektif)
    // No more manual month filtering - database already filtered by academic_year_id
    const uniqueDates = [...new Set(allRecords.map((r) => r.date))].sort();
    const totalHariEfektif = uniqueDates.length;

    console.log("🎯 HARI EFEKTIF:", totalHariEfektif);
    console.log(
      "📅 Date range:",
      uniqueDates[0],
      "to",
      uniqueDates[uniqueDates.length - 1]
    );

    // ✅ Get unique students
    const uniqueStudents = {};
    allRecords.forEach((r) => {
      if (!uniqueStudents[r.student_id]) {
        uniqueStudents[r.student_id] = {
          student_id: r.student_id,
          full_name: r.students?.full_name || "Unknown",
          nis: r.students?.nis || "-",
        };
      }
    });

    // ✅ Aggregate per siswa
    const studentMap = {};
    Object.values(uniqueStudents).forEach((student) => {
      studentMap[student.student_id] = {
        student_id: student.student_id,
        full_name: student.full_name,
        nis: student.nis,
        hadir: 0,
        sakit: 0,
        izin: 0,
        alpa: 0,
      };
    });

    // ✅ Count attendance by status
    allRecords.forEach((r) => {
      if (studentMap[r.student_id]) {
        const status = r.status?.toLowerCase();
        if (status === "hadir") studentMap[r.student_id].hadir++;
        else if (status === "sakit") studentMap[r.student_id].sakit++;
        else if (status === "izin") studentMap[r.student_id].izin++;
        else if (status === "alpa" || status === "alpha")
          studentMap[r.student_id].alpa++;
      }
    });

    // ✅ Return dengan percentage
    return Object.values(studentMap).map((st) => {
      const totalRecords = st.hadir + st.sakit + st.izin + st.alpa;
      const percentage =
        totalHariEfektif > 0
          ? Math.round((st.hadir / totalHariEfektif) * 100)
          : 0;

      return {
        ...st,
        total: totalHariEfektif,
        totalRecords: totalRecords,
        percentage,
      };
    });
  } catch (error) {
    console.error("❌ Error getSemesterData:", error);
    return [];
  }
};

/**
 * ✅ REFACTORED: GET MONTHLY DETAIL DATA (Daily Status View) - SMP VERSION
 * For: Monthly tab - dengan detail harian per tanggal
 *
 * @param {number} month - Bulan (1-12)
 * @param {number} year - Tahun
 * @param {string} semesterId - UUID semester (untuk validasi data integrity)
 * @param {string} classId - UUID kelas
 * @param {string} subject - Nama mata pelajaran
 * @param {string} type - Type attendance (default: "mapel")
 * @returns {Promise<Array>} Student attendance detail with daily status
 */
export const getMonthlyDetailData = async (
  month,
  year,
  semesterId,
  classId,
  subject,
  type = "mapel"
) => {
  try {
    console.log("=== FETCH MONTHLY DETAIL DATA (SMP - REFACTORED) ===");

    // ✅ Validate semester exists
    const semester = await getSemesterById(semesterId);

    if (!semester) {
      console.error("❌ Semester not found:", semesterId);
      return [];
    }

    const semesterName = await getSemesterDisplayName(semesterId);
    console.log("📅 Fetching data for:", semesterName);
    console.log({
      month,
      year,
      semesterId,
      classId,
      subject,
      type,
    });

    // ✅ Calculate date range
    const lastDay = new Date(year, month, 0).getDate();
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(
      lastDay
    ).padStart(2, "0")}`;

    console.log("📅 Date range:", { startDate, endDate });

    // ✅ Build query dengan semester filter
    let query = supabase
      .from("attendances")
      .select(
        `
        *,
        students!inner(id, full_name, nis)
      `
      )
      .eq("class_id", classId)
      .eq("subject", subject)
      .eq("type", type)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });

    // ✅ CRITICAL: Apply semester filter
    query = filterBySemester(query, semesterId, { strict: true });

    // ✅ FETCH DATA dengan PAGINATION
    let allRecords = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const rangedQuery = query.range(
        page * pageSize,
        (page + 1) * pageSize - 1
      );

      const { data, error } = await rangedQuery;

      if (error) {
        console.error("❌ Query error:", error);
        throw error;
      }

      if (data && data.length > 0) {
        allRecords = [...allRecords, ...data];
        console.log(`📄 Page ${page + 1}: ${data.length} records`);

        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }

    console.log("✅ Total records:", allRecords.length);

    if (allRecords.length === 0) {
      console.log("ℹ️ No attendance data found for this month");
      return [];
    }

    // ✅ Calculate unique dates
    const uniqueDates = [...new Set(allRecords.map((r) => r.date))].sort();
    const totalHariEfektif = uniqueDates.length;

    console.log("🎯 HARI EFEKTIF:", totalHariEfektif);

    // ✅ Get unique students
    const uniqueStudents = {};
    allRecords.forEach((r) => {
      if (!uniqueStudents[r.student_id]) {
        uniqueStudents[r.student_id] = {
          student_id: r.student_id,
          full_name: r.students?.full_name || "Unknown",
          nis: r.students?.nis || "-",
        };
      }
    });

    // ✅ Build student map dengan dailyStatus
    const studentMap = {};
    Object.values(uniqueStudents).forEach((student) => {
      studentMap[student.student_id] = {
        student_id: student.student_id,
        full_name: student.full_name,
        nis: student.nis,
        hadir: 0,
        sakit: 0,
        izin: 0,
        alpa: 0,
        dailyStatus: {},
      };
    });

    // ✅ Process records
    allRecords.forEach((r) => {
      if (studentMap[r.student_id]) {
        const status = r.status?.toLowerCase();

        // Store daily status
        studentMap[r.student_id].dailyStatus[r.date] = status;

        // Count totals
        if (status === "hadir") studentMap[r.student_id].hadir++;
        else if (status === "sakit") studentMap[r.student_id].sakit++;
        else if (status === "izin") studentMap[r.student_id].izin++;
        else if (status === "alpa" || status === "alpha")
          studentMap[r.student_id].alpa++;
      }
    });

    // ✅ Return dengan percentage dan dailyStatus
    return Object.values(studentMap).map((st) => {
      const total = st.hadir + st.sakit + st.izin + st.alpa;
      const percentage =
        totalHariEfektif > 0
          ? Math.round((st.hadir / totalHariEfektif) * 100)
          : 0;

      return {
        student_id: st.student_id,
        name: st.full_name,
        nis: st.nis,
        hadir: st.hadir,
        sakit: st.sakit,
        izin: st.izin,
        alpa: st.alpa,
        total,
        percentage,
        dailyStatus: st.dailyStatus,
      };
    });
  } catch (error) {
    console.error("❌ Error getMonthlyDetailData:", error);
    return [];
  }
};

/**
 * ✅ NEW: Get semester summary statistics
 * Useful for dashboard/overview
 *
 * @param {string} semesterId - UUID semester
 * @param {string} classId - UUID kelas
 * @param {string} subject - Nama mata pelajaran
 * @param {string} type - Type attendance
 * @returns {Promise<Object>} Summary statistics
 */
export const getSemesterStatistics = async (
  semesterId,
  classId,
  subject,
  type = "mapel"
) => {
  try {
    console.log("=== FETCH SEMESTER STATISTICS ===");

    const data = await getSemesterData(semesterId, classId, subject, type);

    if (data.length === 0) {
      return {
        totalStudents: 0,
        totalHariEfektif: 0,
        averageAttendance: 0,
        totalHadir: 0,
        totalSakit: 0,
        totalIzin: 0,
        totalAlpa: 0,
      };
    }

    const totalStudents = data.length;
    const totalHariEfektif = data[0]?.total || 0;

    const totals = data.reduce(
      (acc, student) => {
        acc.hadir += student.hadir;
        acc.sakit += student.sakit;
        acc.izin += student.izin;
        acc.alpa += student.alpa;
        acc.percentageSum += student.percentage;
        return acc;
      },
      { hadir: 0, sakit: 0, izin: 0, alpa: 0, percentageSum: 0 }
    );

    const averageAttendance =
      totalStudents > 0 ? Math.round(totals.percentageSum / totalStudents) : 0;

    return {
      totalStudents,
      totalHariEfektif,
      averageAttendance,
      totalHadir: totals.hadir,
      totalSakit: totals.sakit,
      totalIzin: totals.izin,
      totalAlpa: totals.alpa,
    };
  } catch (error) {
    console.error("❌ Error getSemesterStatistics:", error);
    return null;
  }
};

/**
 * ✅ NEW: Validate if data can be accessed for semester
 * Checks if semester exists and is in active year
 *
 * @param {string} semesterId - UUID semester
 * @returns {Promise<Object>} Validation result
 */
export const validateSemesterAccess = async (semesterId) => {
  try {
    const semester = await getSemesterById(semesterId);

    if (!semester) {
      return {
        valid: false,
        message: "Semester tidak ditemukan",
        code: "SEMESTER_NOT_FOUND",
      };
    }

    const activeInfo = await getActiveAcademicInfo();

    if (!activeInfo.isActive) {
      return {
        valid: false,
        message: "Tidak ada tahun ajaran aktif",
        code: "NO_ACTIVE_YEAR",
      };
    }

    // Check if semester is in active year
    const isInActiveYear = activeInfo.availableSemesters.some(
      (s) => s.id === semesterId
    );

    if (!isInActiveYear) {
      return {
        valid: false,
        message: `Semester ${semester.semester} tahun ${semester.year} bukan bagian dari tahun ajaran aktif`,
        code: "SEMESTER_NOT_IN_ACTIVE_YEAR",
        suggestion: `Tahun ajaran aktif: ${activeInfo.year}`,
      };
    }

    return {
      valid: true,
      message: "Semester valid untuk akses data",
      semester,
    };
  } catch (error) {
    console.error("❌ Error validating semester access:", error);
    return {
      valid: false,
      message: "Gagal validasi akses semester",
      code: "VALIDATION_ERROR",
      error,
    };
  }
};

/**
 * ✅ NEW: Save attendance record dengan validation
 * Pastikan data masuk ke semester yang benar
 *
 * @param {Object} attendanceData - Data attendance yang akan disimpan
 * @param {string} semesterId - UUID semester target
 * @returns {Promise<Object>} Save result
 */
export const saveAttendance = async (attendanceData, semesterId) => {
  try {
    console.log("=== SAVE ATTENDANCE ===");

    // ✅ Validate semester for input
    const validation = await validateSemesterForInput(semesterId);

    if (!validation.valid) {
      return {
        success: false,
        message: validation.message,
        code: validation.code,
      };
    }

    // ✅ Add academic_year_id to data
    const dataWithSemester = {
      ...attendanceData,
      academic_year_id: semesterId,
    };

    console.log("💾 Saving attendance with semester:", semesterId);

    const { data, error } = await supabase
      .from("attendances")
      .insert(dataWithSemester)
      .select()
      .single();

    if (error) {
      console.error("❌ Error saving attendance:", error);
      throw error;
    }

    console.log("✅ Attendance saved successfully");

    return {
      success: true,
      message: "Data presensi berhasil disimpan",
      data,
    };
  } catch (error) {
    console.error("❌ Error in saveAttendance:", error);
    return {
      success: false,
      message: "Gagal menyimpan data presensi",
      error,
    };
  }
};

/**
 * ✅ NEW: Bulk save attendance dengan validation
 *
 * @param {Array} attendanceRecords - Array of attendance data
 * @param {string} semesterId - UUID semester target
 * @returns {Promise<Object>} Save result
 */
export const bulkSaveAttendance = async (attendanceRecords, semesterId) => {
  try {
    console.log("=== BULK SAVE ATTENDANCE ===");
    console.log(`📦 Saving ${attendanceRecords.length} records`);

    // ✅ Validate semester for input
    const validation = await validateSemesterForInput(semesterId);

    if (!validation.valid) {
      return {
        success: false,
        message: validation.message,
        code: validation.code,
      };
    }

    // ✅ Add academic_year_id to all records
    const dataWithSemester = attendanceRecords.map((record) => ({
      ...record,
      academic_year_id: semesterId,
    }));

    console.log("💾 Bulk saving with semester:", semesterId);

    const { data, error } = await supabase
      .from("attendances")
      .insert(dataWithSemester)
      .select();

    if (error) {
      console.error("❌ Error bulk saving:", error);
      throw error;
    }

    console.log(`✅ Successfully saved ${data.length} records`);

    return {
      success: true,
      message: `Berhasil menyimpan ${data.length} data presensi`,
      data,
      count: data.length,
    };
  } catch (error) {
    console.error("❌ Error in bulkSaveAttendance:", error);
    return {
      success: false,
      message: "Gagal menyimpan data presensi",
      error,
    };
  }
};

/**
 * ✅ DEPRECATED: Old helper functions - use academicYearService instead
 * Kept for backward compatibility, will be removed in future version
 */

/**
 * @deprecated Use getActiveYearString() from academicYearService instead
 */
export const getAcademicYear = async (month, year) => {
  console.warn(
    "⚠️ DEPRECATED: getAcademicYear() - Use getActiveYearString() from academicYearService"
  );

  const { getActiveYearString } = await import("./academicYearService");
  return await getActiveYearString();
};

/**
 * @deprecated Use getActiveSemester() from academicYearService instead
 */
export const getSemesterType = async (month) => {
  console.warn(
    "⚠️ DEPRECATED: getSemesterType() - Use getActiveSemester() from academicYearService"
  );

  const { getActiveSemester } = await import("./academicYearService");
  return await getActiveSemester();
};

// ========================================
// 📦 EXPORTS
// ========================================

export default {
  // Main functions (refactored)
  getSemesterData,
  getMonthlyDetailData,
  getSemesterStatistics,

  // Validation
  validateSemesterAccess,

  // Save operations
  saveAttendance,
  bulkSaveAttendance,

  // Deprecated (for backward compatibility)
  getAcademicYear,
  getSemesterType,
};
