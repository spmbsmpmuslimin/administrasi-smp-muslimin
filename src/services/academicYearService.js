// File: src/services/academicYearService.js
// 🎯 COMPLETE FINAL VERSION: Production-Ready Academic Year Management
// ✅ Full Multi-Semester Support + Data Integrity + Year Transition + Year Creation

import { supabase } from "../supabaseClient";

// ========================================
// 🔌 CORE: Active Year Management
// ========================================

export const getActiveAcademicYear = async () => {
  try {
    const { data, error } = await supabase.from("academic_years").select("*").eq("is_active", true);

    if (error) {
      console.error("Error fetching active academic year:", error);
      return null;
    }

    if (!data || data.length === 0) {
      console.warn("No active academic year found");
      return null;
    }

    if (data.length > 1) {
      console.error("Multiple active semesters detected!");
      const sorted = data.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
      const correctActive = sorted[0];

      const otherIds = sorted.slice(1).map((s) => s.id);
      if (otherIds.length > 0) {
        await supabase.from("academic_years").update({ is_active: false }).in("id", otherIds);
      }

      data[0] = correctActive;
    }

    const activeData = data[0];
    const allSemesters = await getAllSemestersInYear(activeData.year);

    return {
      year: activeData.year,
      activeSemesterId: activeData.id,
      activeSemester: activeData.semester,
      semesters: allSemesters,
    };
  } catch (error) {
    console.error("Exception in getActiveAcademicYear:", error);
    return null;
  }
};

export const getAllSemestersInYear = async (year) => {
  try {
    const { data, error } = await supabase
      .from("academic_years")
      .select("*")
      .eq("year", year)
      .order("semester", { ascending: true });

    if (error) {
      console.error("Error fetching semesters:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Exception in getAllSemestersInYear:", error);
    return [];
  }
};

export const getAllSemestersInActiveYear = async () => {
  try {
    const activeYear = await getActiveAcademicYear();
    if (!activeYear) return [];
    return activeYear.semesters;
  } catch (error) {
    console.error("Exception in getAllSemestersInActiveYear:", error);
    return [];
  }
};

export const getSemesterById = async (semesterId) => {
  try {
    const { data, error } = await supabase
      .from("academic_years")
      .select("*")
      .eq("id", semesterId)
      .single();

    if (error) {
      console.error("Error fetching semester:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Exception in getSemesterById:", error);
    return null;
  }
};

export const getSemesterDisplayName = async (semesterId) => {
  try {
    const semester = await getSemesterById(semesterId);
    if (!semester) return "Semester Tidak Diketahui";

    const semesterName = semester.semester === 1 ? "Semester 1 (Ganjil)" : "Semester 2 (Genap)";
    return `${semesterName} - ${semester.year}`;
  } catch (error) {
    console.error("Exception in getSemesterDisplayName:", error);
    return "Semester Tidak Diketahui";
  }
};

// ========================================
// 🎯 FILTERING: Smart Query Builder
// ========================================

export const filterBySemester = (query, selectedSemesterId, options = {}) => {
  const { strict = true, throwOnMissing = false } = options;

  // ✅ VALIDASI: Kalau gak ada semester ID
  if (!selectedSemesterId) {
    if (throwOnMissing) {
      throw new Error("Semester ID is required");
    }

    // ❌ JANGAN filter ke ID dummy yang gak ada!
    // ✅ Log warning aja dan return query tanpa filter
    console.warn("⚠️ filterBySemester: selectedSemesterId is empty, returning unfiltered query");

    // Kalau strict, kembalikan query kosong (tidak akan return data)
    if (strict) {
      // Return query yang pasti gak ada datanya
      return query.eq("academic_year_id", "00000000-0000-0000-0000-000000000000");
    }

    // Kalau tidak strict, kembalikan query tanpa filter semester
    return query;
  }

  // ✅ Filter normal by semester ID
  return query.eq("academic_year_id", selectedSemesterId);
};

export const filterByYear = (query, academicYear) => {
  if (!academicYear) return query;
  return query.eq("academic_year", academicYear);
};

export const filterBySemesterNumber = async (query, semesterNumber, year = null) => {
  if (!semesterNumber) return query;

  const academicYear = year || (await getActiveYearString());
  if (!academicYear) return query;

  return query.eq("academic_year", academicYear).eq("semester", semesterNumber);
};

export const filterByActiveYear = async (query) => {
  const activeYear = await getActiveAcademicYear();
  if (!activeYear) return query;

  const semesterIds = activeYear.semesters.map((s) => s.id);
  return query.in("academic_year_id", semesterIds);
};

// ========================================
// 📊 HELPER FUNCTIONS
// ========================================

export const getActiveSemesterId = async () => {
  const activeYear = await getActiveAcademicYear();
  return activeYear?.activeSemesterId || null;
};

export const getActiveSemester = async () => {
  const activeYear = await getActiveAcademicYear();
  return activeYear?.activeSemester || null;
};

export const getActiveYearString = async () => {
  const activeYear = await getActiveAcademicYear();
  return activeYear?.year || null;
};

export const getActiveAcademicInfo = async () => {
  const activeYear = await getActiveAcademicYear();

  if (activeYear) {
    return {
      year: activeYear.year,
      activeSemester: activeYear.activeSemester,
      activeSemesterId: activeYear.activeSemesterId,
      availableSemesters: activeYear.semesters,
      displayText: `${activeYear.year}`,
      fullDisplayText: `${activeYear.year} - Semester ${activeYear.activeSemester} (Aktif)`,
      isActive: true,
    };
  }

  const fallbackYear = getCurrentAcademicYearFallback();
  const fallbackSemester = getCurrentSemesterFallback();

  return {
    year: fallbackYear,
    activeSemester: fallbackSemester,
    activeSemesterId: null,
    availableSemesters: [],
    displayText: `${fallbackYear} (Fallback)`,
    fullDisplayText: `${fallbackYear} - Semester ${fallbackSemester} (Fallback)`,
    isActive: false,
  };
};

// ========================================
// 📄 LEGACY COMPATIBILITY
// ========================================

export const applyAcademicFilters = async (query, options = {}) => {
  const {
    filterSemester = true,
    filterYear = true,
    filterYearId = true,
    useLegacyColumns = false,
    allowMultiSemester = false,
    specificSemesterId = null,
    specificSemesterNumber = null,
    strict = true,
  } = options;

  const academicInfo = await getActiveAcademicInfo();

  if (specificSemesterId) {
    return query.eq("academic_year_id", specificSemesterId);
  }

  if (specificSemesterNumber && filterSemester) {
    if (filterYear && academicInfo.year) {
      query = query.eq("academic_year", academicInfo.year);
    }
    return query.eq("semester", specificSemesterNumber);
  }

  if (allowMultiSemester) {
    if (filterYearId && academicInfo.availableSemesters.length > 0) {
      const semesterIds = academicInfo.availableSemesters.map((s) => s.id);
      return query.in("academic_year_id", semesterIds);
    } else if (filterYear && academicInfo.year) {
      return query.eq("academic_year", academicInfo.year);
    }
  }

  if (filterYearId && academicInfo.activeSemesterId) {
    return query.eq("academic_year_id", academicInfo.activeSemesterId);
  }

  if (useLegacyColumns || (!filterYearId && (filterYear || filterSemester))) {
    if (filterYear && academicInfo.year) {
      query = query.eq("academic_year", academicInfo.year);
    }
    if (filterSemester && academicInfo.activeSemester) {
      query = query.eq("semester", academicInfo.activeSemester);
    }
  }

  if (strict && !specificSemesterId && !allowMultiSemester && !academicInfo.activeSemesterId) {
    return query.eq("academic_year_id", "00000000-0000-0000-0000-000000000000");
  }

  return query;
};

// ========================================
// 🔧 ADMIN FUNCTIONS
// ========================================

export const setActiveAcademicYear = async (semesterId) => {
  try {
    const targetSemester = await getSemesterById(semesterId);
    if (!targetSemester) {
      return {
        success: false,
        message: "Semester tidak ditemukan",
        error: "SEMESTER_NOT_FOUND",
      };
    }

    const currentActive = await getActiveAcademicYear();

    const { error: disableError } = await supabase
      .from("academic_years")
      .update({ is_active: false })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (disableError) throw disableError;

    const { data, error: enableError } = await supabase
      .from("academic_years")
      .update({ is_active: true })
      .eq("id", semesterId)
      .select()
      .single();

    if (enableError) throw enableError;

    console.log("✅ Active semester changed:");
    console.log(`   From: ${currentActive?.year} - Semester ${currentActive?.activeSemester}`);
    console.log(`   To:   ${data.year} - Semester ${data.semester}`);

    return {
      success: true,
      message: `Semester ${data.semester} tahun ${data.year} berhasil diaktifkan`,
      data,
      previousActive: currentActive,
    };
  } catch (error) {
    console.error("Error setting active semester:", error);
    return {
      success: false,
      message: "Gagal mengubah semester aktif",
      error,
    };
  }
};

export const transitionToNewAcademicYear = async (newYear, startingSemester = 1) => {
  try {
    console.log(`📅 Starting transition to ${newYear} Semester ${startingSemester}`);

    const currentActive = await getActiveAcademicYear();
    if (!currentActive) {
      return {
        success: false,
        message: "Tidak ada tahun ajaran aktif saat ini",
        error: "NO_ACTIVE_YEAR",
      };
    }

    const { data: existingSemesters } = await supabase
      .from("academic_years")
      .select("*")
      .eq("year", newYear)
      .eq("semester", startingSemester);

    if (!existingSemesters || existingSemesters.length === 0) {
      return {
        success: false,
        message: `Tahun ajaran ${newYear} Semester ${startingSemester} belum dibuat`,
        error: "NEW_YEAR_NOT_FOUND",
        suggestion: "Gunakan createNewAcademicYear() atau smartTransitionToNewYear()",
      };
    }

    const newSemesterId = existingSemesters[0].id;
    const result = await setActiveAcademicYear(newSemesterId);

    if (result.success) {
      console.log("✅ Year transition completed successfully");
      console.log(`   Old: ${currentActive.year}`);
      console.log(`   New: ${newYear}`);

      return {
        success: true,
        message: `Berhasil transisi ke tahun ajaran ${newYear} Semester ${startingSemester}`,
        data: {
          previousYear: currentActive.year,
          newYear: newYear,
          newSemester: startingSemester,
          newSemesterId: newSemesterId,
        },
        archiveRecommendation: `Disarankan untuk mengarsipkan data tahun ${currentActive.year}`,
      };
    }

    return result;
  } catch (error) {
    console.error("Error in year transition:", error);
    return {
      success: false,
      message: "Gagal melakukan transisi tahun ajaran",
      error,
    };
  }
};

export const createNewAcademicYear = async (year, dates = {}) => {
  try {
    console.log(`📝 Creating new academic year: ${year}`);

    // Validasi format tahun
    if (!/^\d{4}\/\d{4}$/.test(year)) {
      return {
        success: false,
        message: "Format tahun salah. Gunakan format: 2026/2027",
        error: "INVALID_FORMAT",
      };
    }

    // Validasi tahun harus berurutan
    const [year1, year2] = year.split("/").map(Number);
    if (year2 !== year1 + 1) {
      return {
        success: false,
        message: "Tahun harus berurutan (contoh: 2026/2027)",
        error: "INVALID_YEAR_SEQUENCE",
      };
    }

    // Cek apakah tahun sudah ada
    const { data: existing } = await supabase.from("academic_years").select("*").eq("year", year);

    if (existing && existing.length > 0) {
      console.warn(`⚠️ Year ${year} already exists`);
      return {
        success: false,
        message: `Tahun ajaran ${year} sudah ada di database`,
        error: "YEAR_ALREADY_EXISTS",
        data: existing,
      };
    }

    // Default dates kalau gak dikasih
    const yearNum = parseInt(year.split("/")[0]);
    const defaultDates = {
      sem1Start: dates.sem1Start || `${yearNum}-07-01`,
      sem1End: dates.sem1End || `${yearNum}-12-31`,
      sem2Start: dates.sem2Start || `${yearNum + 1}-01-01`,
      sem2End: dates.sem2End || `${yearNum + 1}-06-30`,
    };

    // Validasi tanggal
    const validateDate = (dateStr) => {
      const date = new Date(dateStr);
      return date instanceof Date && !isNaN(date);
    };

    if (
      !validateDate(defaultDates.sem1Start) ||
      !validateDate(defaultDates.sem1End) ||
      !validateDate(defaultDates.sem2Start) ||
      !validateDate(defaultDates.sem2End)
    ) {
      return {
        success: false,
        message: "Format tanggal tidak valid",
        error: "INVALID_DATE_FORMAT",
      };
    }

    // Validasi urutan tanggal
    if (new Date(defaultDates.sem1Start) >= new Date(defaultDates.sem1End)) {
      return {
        success: false,
        message: "Tanggal mulai semester 1 harus lebih awal dari tanggal selesai",
        error: "INVALID_DATE_ORDER",
      };
    }

    if (new Date(defaultDates.sem2Start) >= new Date(defaultDates.sem2End)) {
      return {
        success: false,
        message: "Tanggal mulai semester 2 harus lebih awal dari tanggal selesai",
        error: "INVALID_DATE_ORDER",
      };
    }

    if (new Date(defaultDates.sem1End) >= new Date(defaultDates.sem2Start)) {
      return {
        success: false,
        message: "Semester 1 harus selesai sebelum semester 2 dimulai",
        error: "INVALID_DATE_ORDER",
      };
    }

    console.log("📅 Inserting Semester 1...");

    // Insert Semester 1
    const { data: sem1, error: err1 } = await supabase
      .from("academic_years")
      .insert({
        year: year,
        semester: 1,
        start_date: defaultDates.sem1Start,
        end_date: defaultDates.sem1End,
        is_active: false,
      })
      .select()
      .single();

    if (err1) {
      console.error("❌ Error creating semester 1:", err1);
      throw err1;
    }

    console.log("📅 Inserting Semester 2...");

    // Insert Semester 2
    const { data: sem2, error: err2 } = await supabase
      .from("academic_years")
      .insert({
        year: year,
        semester: 2,
        start_date: defaultDates.sem2Start,
        end_date: defaultDates.sem2End,
        is_active: false,
      })
      .select()
      .single();

    if (err2) {
      console.error("❌ Error creating semester 2:", err2);
      // Rollback: hapus semester 1 yang udah ke-insert
      await supabase.from("academic_years").delete().eq("id", sem1.id);
      throw err2;
    }

    console.log(`✅ Created new academic year: ${year}`);
    console.log(`   Semester 1: ${defaultDates.sem1Start} to ${defaultDates.sem1End}`);
    console.log(`   Semester 2: ${defaultDates.sem2Start} to ${defaultDates.sem2End}`);

    return {
      success: true,
      message: `Tahun ajaran ${year} berhasil dibuat (2 semester)`,
      data: {
        year: year,
        semester1: sem1,
        semester2: sem2,
      },
    };
  } catch (error) {
    console.error("❌ Error creating academic year:", error);
    return {
      success: false,
      message: "Gagal membuat tahun ajaran baru",
      error,
    };
  }
};

export const smartTransitionToNewYear = async (newYear, startingSemester = 1, dates = {}) => {
  try {
    console.log(`🚀 Smart transition to ${newYear} Semester ${startingSemester}`);

    // Cek apakah tahun baru udah ada
    const { data: existing } = await supabase
      .from("academic_years")
      .select("*")
      .eq("year", newYear)
      .eq("semester", startingSemester);

    // Kalau belum ada, bikin dulu
    if (!existing || existing.length === 0) {
      console.log(`📝 Year ${newYear} doesn't exist yet, creating...`);

      const createResult = await createNewAcademicYear(newYear, dates);

      if (!createResult.success) {
        return createResult;
      }

      console.log("✅ New year created successfully, proceeding with transition...");
    } else {
      console.log(`✅ Year ${newYear} already exists, proceeding with transition...`);
    }

    // Lakukan transisi
    return await transitionToNewAcademicYear(newYear, startingSemester);
  } catch (error) {
    console.error("❌ Error in smart transition:", error);
    return {
      success: false,
      message: "Gagal melakukan transisi pintar",
      error,
    };
  }
};

export const getAllAcademicYears = async () => {
  try {
    const { data, error } = await supabase
      .from("academic_years")
      .select("*")
      .order("year", { ascending: false })
      .order("semester", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching all academic years:", error);
    return [];
  }
};

export const deleteAcademicYear = async (year) => {
  try {
    console.log(`🗑️ Attempting to delete academic year: ${year}`);

    // Cek apakah tahun ini aktif
    const activeYear = await getActiveAcademicYear();
    if (activeYear && activeYear.year === year) {
      return {
        success: false,
        message: "Tidak bisa menghapus tahun ajaran yang sedang aktif",
        error: "CANNOT_DELETE_ACTIVE",
      };
    }

    // Hapus semua semester di tahun ini
    const { error } = await supabase.from("academic_years").delete().eq("year", year);

    if (error) throw error;

    console.log(`✅ Deleted academic year: ${year}`);

    return {
      success: true,
      message: `Tahun ajaran ${year} berhasil dihapus`,
    };
  } catch (error) {
    console.error("❌ Error deleting academic year:", error);
    return {
      success: false,
      message: "Gagal menghapus tahun ajaran",
      error,
    };
  }
};

// ========================================
// 🛡️ DATA INTEGRITY & VALIDATION
// ========================================

export const validateAcademicYearData = async () => {
  const issues = [];
  const warnings = [];
  let isHealthy = true;

  try {
    console.log("🔍 Starting academic year data validation...");

    const { data: activeSemesters } = await supabase
      .from("academic_years")
      .select("*")
      .eq("is_active", true);

    if (activeSemesters && activeSemesters.length > 1) {
      isHealthy = false;
      issues.push({
        type: "MULTIPLE_ACTIVE",
        severity: "CRITICAL",
        message: `Found ${activeSemesters.length} active semesters (should be only 1)`,
        data: activeSemesters.map((s) => `${s.year} - Semester ${s.semester}`),
        recommendation: "Run autoFixDataIntegrity() to fix automatically",
      });
    }

    if (activeSemesters && activeSemesters.length === 0) {
      isHealthy = false;
      issues.push({
        type: "NO_ACTIVE",
        severity: "CRITICAL",
        message: "No active semester found",
        recommendation: "Set an active semester using setActiveAcademicYear()",
      });
    }

    const { data: allSemesters } = await supabase
      .from("academic_years")
      .select("*")
      .order("start_date", { ascending: true });

    if (allSemesters && allSemesters.length > 1) {
      for (let i = 0; i < allSemesters.length - 1; i++) {
        const current = allSemesters[i];
        const next = allSemesters[i + 1];

        if (new Date(current.end_date) > new Date(next.start_date)) {
          warnings.push({
            type: "DATE_OVERLAP",
            severity: "WARNING",
            message: `Date overlap between ${current.year} Sem ${current.semester} and ${next.year} Sem ${next.semester}`,
            data: {
              semester1: `${current.year} - Semester ${current.semester}`,
              semester2: `${next.year} - Semester ${next.semester}`,
              overlap: `${current.end_date} overlaps ${next.start_date}`,
            },
          });
        }
      }
    }

    const yearGroups = {};
    allSemesters?.forEach((s) => {
      if (!yearGroups[s.year]) yearGroups[s.year] = [];
      yearGroups[s.year].push(s.semester);
    });

    Object.entries(yearGroups).forEach(([year, semesters]) => {
      if (semesters.length === 1) {
        warnings.push({
          type: "INCOMPLETE_YEAR",
          severity: "WARNING",
          message: `Year ${year} only has semester ${semesters[0]}`,
          recommendation: "Consider adding the missing semester",
        });
      }
    });

    const report = {
      isHealthy,
      timestamp: new Date().toISOString(),
      summary: {
        totalSemesters: allSemesters?.length || 0,
        activeSemesters: activeSemesters?.length || 0,
        issuesFound: issues.length,
        warningsFound: warnings.length,
      },
      issues,
      warnings,
    };

    if (isHealthy && warnings.length === 0) {
      console.log("✅ Academic year data is healthy!");
    } else {
      console.warn("⚠️ Validation completed with issues:");
      console.warn(`   Critical Issues: ${issues.length}`);
      console.warn(`   Warnings: ${warnings.length}`);
    }

    return report;
  } catch (error) {
    console.error("Error during validation:", error);
    return {
      isHealthy: false,
      error: error.message,
      summary: { error: "Validation failed" },
    };
  }
};

export const autoFixDataIntegrity = async () => {
  const fixes = [];

  try {
    console.log("🔧 Starting auto-fix...");

    const { data: activeSemesters } = await supabase
      .from("academic_years")
      .select("*")
      .eq("is_active", true)
      .order("start_date", { ascending: false });

    if (activeSemesters && activeSemesters.length > 1) {
      const keepActive = activeSemesters[0];
      const deactivateIds = activeSemesters.slice(1).map((s) => s.id);

      await supabase.from("academic_years").update({ is_active: false }).in("id", deactivateIds);

      fixes.push({
        type: "FIXED_MULTIPLE_ACTIVE",
        message: `Deactivated ${deactivateIds.length} duplicate active semesters`,
        kept: `${keepActive.year} - Semester ${keepActive.semester}`,
      });

      console.log(`✅ Fixed: Kept ${keepActive.year} Semester ${keepActive.semester} as active`);
    }

    if (fixes.length === 0) {
      console.log("✅ No fixes needed - data is already healthy");
    }

    return {
      success: true,
      fixesApplied: fixes.length,
      fixes,
    };
  } catch (error) {
    console.error("Error during auto-fix:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// ========================================
// 🎨 FORMATTING & UTILITIES
// ========================================

export const formatSemesterDisplay = (semester) => {
  return semester === 1 ? "Semester 1 (Ganjil)" : "Semester 2 (Genap)";
};

export const formatAcademicYearDisplay = (year, semester) => {
  return `${year} - ${formatSemesterDisplay(semester)}`;
};

export const getCurrentAcademicYearFallback = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return month >= 6 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
};

export const getCurrentSemesterFallback = () => {
  const month = new Date().getMonth() + 1;
  return month >= 7 ? 1 : 2;
};

export const generateAcademicYearString = (startYear) => {
  const year = parseInt(startYear);
  if (isNaN(year) || year < 2000 || year > 2100) {
    return null;
  }
  return `${year}/${year + 1}`;
};

export const parseAcademicYearString = (yearString) => {
  const match = yearString.match(/^(\d{4})\/(\d{4})$/);
  if (!match) return null;

  const startYear = parseInt(match[1]);
  const endYear = parseInt(match[2]);

  if (endYear !== startYear + 1) return null;

  return { startYear, endYear };
};

// ========================================
// 📋 DEBUGGING & LOGGING
// ========================================

export const logAcademicInfo = async () => {
  const info = await getActiveAcademicInfo();
  console.log("📅 ===== ACADEMIC YEAR INFO =====");
  console.log("Active Year:", info.year);
  console.log("Active Semester:", info.activeSemester);
  console.log("Active Semester ID:", info.activeSemesterId);
  console.log("Available Semesters:", info.availableSemesters);
  console.log("Display:", info.displayText);
  console.log("====================================");
  return info;
};

export const systemHealthCheck = async () => {
  console.log("🏥 ===== SYSTEM HEALTH CHECK =====");

  await logAcademicInfo();

  console.log("\n🔍 Running data validation...");
  const validation = await validateAcademicYearData();

  console.log("\n📊 Validation Results:");
  console.log("   Healthy:", validation.isHealthy ? "✅ YES" : "❌ NO");
  console.log("   Issues:", validation.summary.issuesFound);
  console.log("   Warnings:", validation.summary.warningsFound);

  if (validation.issues.length > 0) {
    console.log("\n🚨 Critical Issues:");
    validation.issues.forEach((issue) => {
      console.log(`   - ${issue.type}: ${issue.message}`);
      if (issue.recommendation) {
        console.log(`     💡 ${issue.recommendation}`);
      }
    });
  }

  if (validation.warnings.length > 0) {
    console.log("\n⚠️ Warnings:");
    validation.warnings.forEach((warning) => {
      console.log(`   - ${warning.type}: ${warning.message}`);
      if (warning.recommendation) {
        console.log(`     💡 ${warning.recommendation}`);
      }
    });
  }

  if (!validation.isHealthy) {
    console.log("\n🔧 Attempting auto-fix...");
    const fixResult = await autoFixDataIntegrity();

    if (fixResult.success && fixResult.fixesApplied > 0) {
      console.log(`✅ Auto-fix applied ${fixResult.fixesApplied} fixes`);
      fixResult.fixes.forEach((fix) => {
        console.log(`   - ${fix.type}: ${fix.message}`);
      });
    } else if (fixResult.success) {
      console.log("✅ No fixes needed");
    } else {
      console.log("❌ Auto-fix failed");
    }
  }

  console.log("\n🏥 ===== HEALTH CHECK COMPLETE =====\n");
  return validation;
};

// ========================================
// 🎯 SMART SELECTION & VALIDATION
// ========================================

export const getSmartSemesterSelection = async (options = {}) => {
  const {
    userSelectedSemesterId = null,
    forceActiveSemester = false,
    allowViewOnly = true,
    context = "view",
  } = options;

  try {
    const activeInfo = await getActiveAcademicInfo();

    if (userSelectedSemesterId && allowViewOnly) {
      const selectedSemester = await getSemesterById(userSelectedSemesterId);

      if (selectedSemester) {
        const isInActiveYear = activeInfo.availableSemesters.some(
          (s) => s.id === userSelectedSemesterId
        );

        return {
          semesterId: userSelectedSemesterId,
          semester: selectedSemester.semester,
          year: selectedSemester.year,
          displayName: `${formatSemesterDisplay(selectedSemester.semester)} - ${
            selectedSemester.year
          }`,
          isActive: selectedSemester.is_active,
          isInActiveYear,
          mode: "user-selected",
          canInput: context === "input" ? selectedSemester.is_active : false,
          canView: true,
        };
      }
    }

    if (forceActiveSemester || context === "input") {
      if (!activeInfo.activeSemesterId) {
        throw new Error("Tidak ada semester aktif untuk input data");
      }

      return {
        semesterId: activeInfo.activeSemesterId,
        semester: activeInfo.activeSemester,
        year: activeInfo.year,
        displayName: `${formatSemesterDisplay(activeInfo.activeSemester)} - ${activeInfo.year}`,
        isActive: true,
        isInActiveYear: true,
        mode: "active-only",
        canInput: true,
        canView: true,
      };
    }

    return {
      semesterId: activeInfo.activeSemesterId,
      semester: activeInfo.activeSemester,
      year: activeInfo.year,
      displayName: `${formatSemesterDisplay(activeInfo.activeSemester)} - ${activeInfo.year}`,
      isActive: true,
      isInActiveYear: true,
      mode: "default-active",
      canInput: context === "input",
      canView: true,
    };
  } catch (error) {
    console.error("Error in smart semester selection:", error);

    const fallbackYear = getCurrentAcademicYearFallback();
    const fallbackSemester = getCurrentSemesterFallback();

    return {
      semesterId: null,
      semester: fallbackSemester,
      year: fallbackYear,
      displayName: `${formatSemesterDisplay(fallbackSemester)} - ${fallbackYear} (Fallback)`,
      isActive: false,
      isInActiveYear: false,
      mode: "fallback",
      canInput: false,
      canView: true,
    };
  }
};

export const validateSemesterForInput = async (semesterId) => {
  try {
    const semester = await getSemesterById(semesterId);

    if (!semester) {
      return {
        valid: false,
        message: "Semester tidak ditemukan",
        code: "SEMESTER_NOT_FOUND",
      };
    }

    if (!semester.is_active) {
      return {
        valid: false,
        message: `Semester ${semester.semester} tahun ${semester.year} tidak aktif`,
        code: "SEMESTER_NOT_ACTIVE",
        suggestion: "Ganti ke semester aktif untuk input data baru",
      };
    }

    const today = new Date();
    const startDate = new Date(semester.start_date);
    const endDate = new Date(semester.end_date);

    if (today < startDate) {
      return {
        valid: false,
        message: `Semester belum dimulai (mulai ${startDate.toLocaleDateString("id-ID")})`,
        code: "SEMESTER_NOT_STARTED",
      };
    }

    if (today > endDate) {
      return {
        valid: false,
        message: `Semester sudah berakhir (selesai ${endDate.toLocaleDateString("id-ID")})`,
        code: "SEMESTER_ENDED",
      };
    }

    return {
      valid: true,
      message: "Semester valid untuk input data",
      semester,
    };
  } catch (error) {
    console.error("Error validating semester for input:", error);
    return {
      valid: false,
      message: "Gagal validasi semester",
      code: "VALIDATION_ERROR",
      error,
    };
  }
};

export const canInputToSemester = async (semesterId) => {
  const validation = await validateSemesterForInput(semesterId);
  return validation.valid;
};

export const getSemesterStatus = async (semesterId) => {
  try {
    const semester = await getSemesterById(semesterId);
    if (!semester) return "not_found";

    const today = new Date();
    const startDate = new Date(semester.start_date);
    const endDate = new Date(semester.end_date);

    if (today < startDate) return "upcoming";
    if (today > endDate) return "ended";
    if (semester.is_active) return "active";

    return "inactive";
  } catch (error) {
    console.error("Error getting semester status:", error);
    return "error";
  }
};

// ========================================
// 📦 DEFAULT EXPORT
// ========================================

export default {
  // Core functions
  getActiveAcademicYear,
  getAllSemestersInYear,
  getAllSemestersInActiveYear,
  getSemesterById,
  getSemesterDisplayName,

  // Filtering
  filterBySemester,
  filterByYear,
  filterBySemesterNumber,
  filterByActiveYear,
  applyAcademicFilters,

  // Helpers
  getActiveSemesterId,
  getActiveSemester,
  getActiveYearString,
  getActiveAcademicInfo,

  // Admin functions
  setActiveAcademicYear,
  transitionToNewAcademicYear,
  createNewAcademicYear,
  smartTransitionToNewYear,
  getAllAcademicYears,
  deleteAcademicYear,

  // Data integrity
  validateAcademicYearData,
  autoFixDataIntegrity,

  // Formatting
  formatSemesterDisplay,
  formatAcademicYearDisplay,
  generateAcademicYearString,
  parseAcademicYearString,

  // Fallbacks
  getCurrentAcademicYearFallback,
  getCurrentSemesterFallback,

  // Smart selection & validation
  getSmartSemesterSelection,
  validateSemesterForInput,
  canInputToSemester,
  getSemesterStatus,

  // Debug & logging
  logAcademicInfo,
  systemHealthCheck,
};
