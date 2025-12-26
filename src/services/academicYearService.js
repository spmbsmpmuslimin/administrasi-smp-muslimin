// File: src/services/academicYearService.js
// Centralized Academic Year & Semester Management

import { supabase } from "../supabaseClient";

/**
 * 🎯 SINGLE SOURCE OF TRUTH untuk semester & tahun ajaran aktif
 * Semua komponen HARUS pakai service ini
 */

/**
 * Mendapatkan tahun ajaran aktif dari database
 * @returns {Promise<Object|null>} { id, year, semester, is_active }
 */
export const getActiveAcademicYear = async () => {
  try {
    const { data, error } = await supabase
      .from("academic_years")
      .select("id, year, semester, is_active, start_date, end_date")
      .eq("is_active", true)
      .order("start_date", { ascending: false }); // Ambil yang paling baru dulu

    if (error) {
      console.error("❌ Error fetching active academic year:", error);
      return null;
    }

    // ⚠️ SAFETY CHECK: Kalau ada lebih dari 1 active
    if (data && data.length > 1) {
      console.warn(
        "⚠️ WARNING: Multiple active academic years found! Using the most recent one.",
        data
      );
      console.warn(
        "🔧 Please ensure only ONE semester is active at a time in the database."
      );
    }

    // Ambil yang pertama (paling baru)
    const activeYear = data && data.length > 0 ? data[0] : null;

    if (activeYear) {
      console.log("✅ Active academic year:", activeYear);
    } else {
      console.warn("⚠️ No active academic year found in database");
    }

    return activeYear;
  } catch (error) {
    console.error("❌ Exception in getActiveAcademicYear:", error);
    return null;
  }
};

/**
 * Mendapatkan semester aktif saat ini (1 atau 2)
 * @returns {Promise<number>} 1 atau 2
 */
export const getActiveSemester = async () => {
  const activeYear = await getActiveAcademicYear();

  if (activeYear && activeYear.semester) {
    return activeYear.semester;
  }

  // Fallback: hitung dari bulan saat ini
  console.warn("⚠️ No active semester in DB, using fallback calculation");
  return getCurrentSemesterFallback();
};

/**
 * Mendapatkan tahun ajaran aktif (format: "2025/2026")
 * @returns {Promise<string>} Format: "2025/2026"
 */
export const getActiveYearString = async () => {
  const activeYear = await getActiveAcademicYear();

  if (activeYear && activeYear.year) {
    return activeYear.year;
  }

  // Fallback: hitung dari bulan saat ini
  console.warn("⚠️ No active year in DB, using fallback calculation");
  return getCurrentAcademicYearFallback();
};

/**
 * Mendapatkan ID tahun ajaran aktif (UUID)
 * @returns {Promise<string|null>} UUID atau null
 */
export const getActiveAcademicYearId = async () => {
  const activeYear = await getActiveAcademicYear();
  return activeYear?.id || null;
};

/**
 * Mendapatkan info lengkap tahun ajaran aktif
 * @returns {Promise<Object>} { year, semester, yearId, displayText }
 */
export const getActiveAcademicInfo = async () => {
  const activeYear = await getActiveAcademicYear();

  if (activeYear) {
    return {
      year: activeYear.year,
      semester: activeYear.semester,
      yearId: activeYear.id,
      displayText: `${activeYear.year} - Semester ${activeYear.semester}`,
      semesterText: formatSemesterDisplay(activeYear.semester),
      isActive: activeYear.is_active,
      startDate: activeYear.start_date,
      endDate: activeYear.end_date,
    };
  }

  // Fallback
  const fallbackYear = getCurrentAcademicYearFallback();
  const fallbackSemester = getCurrentSemesterFallback();

  return {
    year: fallbackYear,
    semester: fallbackSemester,
    yearId: null,
    displayText: `${fallbackYear} - Semester ${fallbackSemester} (Fallback)`,
    semesterText: formatSemesterDisplay(fallbackSemester),
    isActive: false,
    startDate: null,
    endDate: null,
  };
};

/**
 * 🔧 ADMIN ONLY: Set academic year aktif (auto-disable yang lain)
 * @param {string} academicYearId - UUID of academic year to activate
 * @returns {Promise<Object>} { success, message, data }
 */
export const setActiveAcademicYear = async (academicYearId) => {
  try {
    // 1. Disable semua academic years
    const { error: disableError } = await supabase
      .from("academic_years")
      .update({ is_active: false })
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Update all

    if (disableError) {
      console.error("❌ Error disabling academic years:", disableError);
      return {
        success: false,
        message: "Gagal menonaktifkan tahun ajaran lama",
        data: null,
      };
    }

    // 2. Enable yang dipilih
    const { data, error: enableError } = await supabase
      .from("academic_years")
      .update({ is_active: true })
      .eq("id", academicYearId)
      .select()
      .single();

    if (enableError) {
      console.error("❌ Error enabling academic year:", enableError);
      return {
        success: false,
        message: "Gagal mengaktifkan tahun ajaran baru",
        data: null,
      };
    }

    console.log("✅ Academic year activated:", data);
    return {
      success: true,
      message: `Berhasil mengaktifkan ${data.year} Semester ${data.semester}`,
      data: data,
    };
  } catch (error) {
    console.error("❌ Exception in setActiveAcademicYear:", error);
    return {
      success: false,
      message: "Terjadi kesalahan sistem",
      data: null,
    };
  }
};

/**
 * 📋 Get semua academic years (untuk dropdown/list)
 * @param {Object} options - { includeInactive: boolean }
 * @returns {Promise<Array>} List of academic years
 */
export const getAllAcademicYears = async (options = {}) => {
  const { includeInactive = true } = options;

  try {
    let query = supabase
      .from("academic_years")
      .select("id, year, semester, is_active, start_date, end_date")
      .order("year", { ascending: false })
      .order("semester", { ascending: false });

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Error fetching academic years:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("❌ Exception in getAllAcademicYears:", error);
    return [];
  }
};

/**
 * FALLBACK: Hitung tahun ajaran berdasarkan bulan saat ini
 * Digunakan jika database tidak memiliki tahun ajaran aktif
 * @returns {string} Format: "2025/2026"
 */
export const getCurrentAcademicYearFallback = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11

  // Juli (6) - Desember (11) = Tahun ajaran baru dimulai
  // Januari (0) - Juni (5) = Tahun ajaran sebelumnya masih berjalan
  if (currentMonth >= 6) {
    return `${currentYear}/${currentYear + 1}`;
  } else {
    return `${currentYear - 1}/${currentYear}`;
  }
};

/**
 * FALLBACK: Hitung semester berdasarkan bulan saat ini
 * @returns {number} 1 atau 2
 */
export const getCurrentSemesterFallback = () => {
  const currentMonth = new Date().getMonth() + 1; // 1-12

  // Juli (7) - Desember (12) = Semester 1
  // Januari (1) - Juni (6) = Semester 2
  return currentMonth >= 7 ? 1 : 2;
};

/**
 * Cek apakah tabel memiliki kolom semester
 * @param {string} tableName - Nama tabel
 * @returns {Promise<boolean>}
 */
export const tableHasSemesterColumn = async (tableName) => {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select("semester")
      .limit(1);

    if (error) {
      // Jika error dan error tentang kolom tidak ada
      if (
        error.message.includes("column") &&
        error.message.includes("does not exist")
      ) {
        return false;
      }
      console.error(`Error checking ${tableName}:`, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Exception checking ${tableName}:`, error);
    return false;
  }
};

/**
 * Build query dengan filter akademik yang tepat
 * @param {Object} query - Supabase query object
 * @param {Object} options - { filterSemester, filterYear, filterYearId }
 * @returns {Object} Modified query
 */
export const applyAcademicFilters = async (query, options = {}) => {
  const {
    filterSemester = true,
    filterYear = true,
    filterYearId = false,
  } = options;

  const academicInfo = await getActiveAcademicInfo();

  // Filter by year ID (paling akurat)
  if (filterYearId && academicInfo.yearId) {
    query = query.eq("academic_year_id", academicInfo.yearId);
    return query; // Kalau pakai ID, gak perlu filter lain
  }

  // Filter by year string
  if (filterYear && academicInfo.year) {
    query = query.eq("academic_year", academicInfo.year);
  }

  // Filter by semester
  if (filterSemester && academicInfo.semester) {
    query = query.eq("semester", academicInfo.semester);
  }

  return query;
};

/**
 * Helper: Format display semester
 * @param {number} semester - 1 atau 2
 * @returns {string} "Semester 1 (Ganjil)" atau "Semester 2 (Genap)"
 */
export const formatSemesterDisplay = (semester) => {
  return semester === 1 ? "Semester 1 (Ganjil)" : "Semester 2 (Genap)";
};

/**
 * Helper: Cek apakah tanggal berada di semester tertentu
 * @param {Date|string} date - Tanggal yang akan dicek
 * @param {number} semester - 1 atau 2
 * @returns {boolean}
 */
export const isDateInSemester = (date, semester) => {
  const checkDate = new Date(date);
  const month = checkDate.getMonth() + 1; // 1-12

  if (semester === 1) {
    // Juli - Desember
    return month >= 7 && month <= 12;
  } else {
    // Januari - Juni
    return month >= 1 && month <= 6;
  }
};

/**
 * Helper: Debug log info semester aktif
 */
export const logAcademicInfo = async () => {
  const info = await getActiveAcademicInfo();
  console.log("📅 ===== ACTIVE ACADEMIC INFO =====");
  console.log("Year:", info.year);
  console.log("Semester:", info.semester, `(${info.semesterText})`);
  console.log("Year ID:", info.yearId);
  console.log("Display:", info.displayText);
  console.log("Is Active:", info.isActive);
  console.log("Start Date:", info.startDate);
  console.log("End Date:", info.endDate);
  console.log("=====================================");
  return info;
};

// Export default object dengan semua functions
export default {
  getActiveAcademicYear,
  getActiveSemester,
  getActiveYearString,
  getActiveAcademicYearId,
  getActiveAcademicInfo,
  setActiveAcademicYear,
  getAllAcademicYears,
  getCurrentAcademicYearFallback,
  getCurrentSemesterFallback,
  tableHasSemesterColumn,
  applyAcademicFilters,
  formatSemesterDisplay,
  isDateInSemester,
  logAcademicInfo,
};
