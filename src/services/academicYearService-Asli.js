// File: src/services/academicYearService.js
// Centralized Academic Year & Semester Management
// ✅ UPDATED: Support akses multi semester dalam 1 tahun ajaran

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
      .order("start_date", { ascending: false });

    if (error) {
      console.error("❌ Error fetching active academic year:", error);
      return null;
    }

    if (data && data.length > 1) {
      console.warn(
        "⚠️ WARNING: Multiple active academic years found! Using the most recent one.",
        data
      );
      console.warn(
        "🔧 Please ensure only ONE semester is active at a time in the database."
      );
    }

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
 * ✅ NEW: Mendapatkan SEMUA semester dalam tahun ajaran yang aktif
 * Biar user bisa akses semester 1 & 2 dalam tahun yang sama
 * @returns {Promise<Array>} Array of semesters in active year
 */
export const getAllSemestersInActiveYear = async () => {
  try {
    const activeYear = await getActiveAcademicYear();

    if (!activeYear) {
      console.warn("⚠️ No active year, cannot get semesters");
      return [];
    }

    // Ambil SEMUA semester dengan tahun yang sama
    const { data, error } = await supabase
      .from("academic_years")
      .select("id, year, semester, is_active, start_date, end_date")
      .eq("year", activeYear.year)
      .order("semester", { ascending: true });

    if (error) {
      console.error("❌ Error fetching semesters:", error);
      return [];
    }

    console.log(
      `✅ Found ${data.length} semesters in year ${activeYear.year}`,
      data
    );
    return data || [];
  } catch (error) {
    console.error("❌ Exception in getAllSemestersInActiveYear:", error);
    return [];
  }
};

/**
 * ✅ NEW: Get semester by ID (untuk filter data)
 * @param {string} semesterId - UUID semester
 * @returns {Promise<Object|null>}
 */
export const getSemesterById = async (semesterId) => {
  try {
    const { data, error } = await supabase
      .from("academic_years")
      .select("*")
      .eq("id", semesterId)
      .single();

    if (error) {
      console.error("❌ Error fetching semester by ID:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("❌ Exception in getSemesterById:", error);
    return null;
  }
};

/**
 * ✅ NEW: Build filter untuk query berdasarkan semester yang dipilih
 * @param {Object} query - Supabase query
 * @param {string} selectedSemesterId - UUID semester yang dipilih user
 * @returns {Object} Modified query
 */
export const filterBySemester = (query, selectedSemesterId) => {
  if (!selectedSemesterId) {
    console.warn("⚠️ No semester ID provided for filter");
    return query;
  }

  // Filter by academic_year_id (paling akurat)
  return query.eq("academic_year_id", selectedSemesterId);
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
    const { error: disableError } = await supabase
      .from("academic_years")
      .update({ is_active: false })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (disableError) {
      console.error("❌ Error disabling academic years:", disableError);
      return {
        success: false,
        message: "Gagal menonaktifkan tahun ajaran lama",
        data: null,
      };
    }

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

export const getCurrentAcademicYearFallback = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  if (currentMonth >= 6) {
    return `${currentYear}/${currentYear + 1}`;
  } else {
    return `${currentYear - 1}/${currentYear}`;
  }
};

export const getCurrentSemesterFallback = () => {
  const currentMonth = new Date().getMonth() + 1;
  return currentMonth >= 7 ? 1 : 2;
};

export const tableHasSemesterColumn = async (tableName) => {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select("semester")
      .limit(1);

    if (error) {
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

export const applyAcademicFilters = async (query, options = {}) => {
  const {
    filterSemester = true,
    filterYear = true,
    filterYearId = false,
  } = options;
  const academicInfo = await getActiveAcademicInfo();

  if (filterYearId && academicInfo.yearId) {
    query = query.eq("academic_year_id", academicInfo.yearId);
    return query;
  }

  if (filterYear && academicInfo.year) {
    query = query.eq("academic_year", academicInfo.year);
  }

  if (filterSemester && academicInfo.semester) {
    query = query.eq("semester", academicInfo.semester);
  }

  return query;
};

export const formatSemesterDisplay = (semester) => {
  return semester === 1 ? "Semester 1 (Ganjil)" : "Semester 2 (Genap)";
};

export const isDateInSemester = (date, semester) => {
  const checkDate = new Date(date);
  const month = checkDate.getMonth() + 1;

  if (semester === 1) {
    return month >= 7 && month <= 12;
  } else {
    return month >= 1 && month <= 6;
  }
};

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

export default {
  getActiveAcademicYear,
  getAllSemestersInActiveYear, // ✅ NEW
  getSemesterById, // ✅ NEW
  filterBySemester, // ✅ NEW
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
