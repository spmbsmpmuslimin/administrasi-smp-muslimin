// File: src/services/academicYearService.js
import { supabase } from "../supabaseClient";

export const getActiveAcademicYear = async () => {
  try {
    const { data, error } = await supabase
      .from("academic_years")
      .select("*")
      .eq("is_active", true);

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
      const sorted = data.sort(
        (a, b) => new Date(b.start_date) - new Date(a.start_date)
      );
      const correctActive = sorted[0];

      const otherIds = sorted.slice(1).map((s) => s.id);
      if (otherIds.length > 0) {
        await supabase
          .from("academic_years")
          .update({ is_active: false })
          .in("id", otherIds);
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

    const semesterName =
      semester.semester === 1 ? "Semester 1 (Ganjil)" : "Semester 2 (Genap)";
    return `${semesterName} - ${semester.year}`;
  } catch (error) {
    console.error("Exception in getSemesterDisplayName:", error);
    return "Semester Tidak Diketahui";
  }
};

export const filterBySemester = (query, selectedSemesterId, options = {}) => {
  const { strict = true, throwOnMissing = false } = options;

  if (!selectedSemesterId) {
    if (throwOnMissing) throw new Error("Semester ID is required");
    if (strict)
      return query.eq(
        "academic_year_id",
        "00000000-0000-0000-0000-000000000000"
      );
    return query;
  }

  return query.eq("academic_year_id", selectedSemesterId);
};

export const filterByYear = (query, academicYear) => {
  if (!academicYear) return query;
  return query.eq("academic_year", academicYear);
};

export const filterBySemesterNumber = async (
  query,
  semesterNumber,
  year = null
) => {
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

  if (
    strict &&
    !specificSemesterId &&
    !allowMultiSemester &&
    !academicInfo.activeSemesterId
  ) {
    return query.eq("academic_year_id", "00000000-0000-0000-0000-000000000000");
  }

  return query;
};

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

export const transitionToNewAcademicYear = async (
  newYear,
  startingSemester = 1
) => {
  try {
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
        suggestion: "Silakan buat tahun ajaran baru terlebih dahulu",
      };
    }

    const newSemesterId = existingSemesters[0].id;
    const result = await setActiveAcademicYear(newSemesterId);

    if (result.success) {
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

export const validateAcademicYearData = async () => {
  const issues = [];
  const warnings = [];
  let isHealthy = true;

  try {
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
        recommendation: "Run setActiveAcademicYear() to fix",
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
            message: `Date overlap detected between semesters`,
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
    const { data: activeSemesters } = await supabase
      .from("academic_years")
      .select("*")
      .eq("is_active", true)
      .order("start_date", { ascending: false });

    if (activeSemesters && activeSemesters.length > 1) {
      const keepActive = activeSemesters[0];
      const deactivateIds = activeSemesters.slice(1).map((s) => s.id);

      await supabase
        .from("academic_years")
        .update({ is_active: false })
        .in("id", deactivateIds);

      fixes.push({
        type: "FIXED_MULTIPLE_ACTIVE",
        message: `Deactivated ${deactivateIds.length} duplicate active semesters`,
        kept: `${keepActive.year} - Semester ${keepActive.semester}`,
      });
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

export const logAcademicInfo = async () => {
  const info = await getActiveAcademicInfo();
  console.log("📅 ACADEMIC YEAR INFO:");
  console.log("Active Year:", info.year);
  console.log("Active Semester:", info.activeSemester);
  console.log("Active Semester ID:", info.activeSemesterId);
  console.log("Available Semesters:", info.availableSemesters);
  return info;
};

export const systemHealthCheck = async () => {
  console.log("🏥 SYSTEM HEALTH CHECK");

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
    });
  }

  if (validation.warnings.length > 0) {
    console.log("\n⚠️  Warnings:");
    validation.warnings.forEach((warning) => {
      console.log(`   - ${warning.type}: ${warning.message}`);
    });
  }

  if (!validation.isHealthy) {
    console.log("\n🔧 Attempting auto-fix...");
    const fixResult = await autoFixDataIntegrity();

    if (fixResult.success) {
      console.log(`✅ Auto-fix applied ${fixResult.fixesApplied} fixes`);
    }
  }

  console.log("🏥 HEALTH CHECK COMPLETE");
  return validation;
};

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
        displayName: `${formatSemesterDisplay(activeInfo.activeSemester)} - ${
          activeInfo.year
        }`,
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
      displayName: `${formatSemesterDisplay(activeInfo.activeSemester)} - ${
        activeInfo.year
      }`,
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
      displayName: `${formatSemesterDisplay(
        fallbackSemester
      )} - ${fallbackYear} (Fallback)`,
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
        message: `Semester belum dimulai (mulai ${startDate.toLocaleDateString()})`,
        code: "SEMESTER_NOT_STARTED",
      };
    }

    if (today > endDate) {
      return {
        valid: false,
        message: `Semester sudah berakhir (selesai ${endDate.toLocaleDateString()})`,
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

export default {
  getActiveAcademicYear,
  getAllSemestersInYear,
  getAllSemestersInActiveYear,
  getSemesterById,
  getSemesterDisplayName,
  filterBySemester,
  filterByYear,
  filterBySemesterNumber,
  filterByActiveYear,
  applyAcademicFilters,
  getActiveSemesterId,
  getActiveSemester,
  getActiveYearString,
  getActiveAcademicInfo,
  setActiveAcademicYear,
  transitionToNewAcademicYear,
  getAllAcademicYears,
  validateAcademicYearData,
  autoFixDataIntegrity,
  formatSemesterDisplay,
  formatAcademicYearDisplay,
  getCurrentAcademicYearFallback,
  getCurrentSemesterFallback,
  logAcademicInfo,
  systemHealthCheck,
  getSmartSemesterSelection,
  validateSemesterForInput,
};
