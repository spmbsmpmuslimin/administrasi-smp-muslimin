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
      // ⚠️ Kondisi ini gak seharusnya kejadian - berarti ada 2+ baris
      // academic_years ke-mark is_active=true bersamaan (biasanya kejadian
      // pas ada masalah di tengah proses transisi tahun ajaran). Auto-fix
      // di bawah ini bakal nulis ke DB buat beresin, dan sengaja dibikin
      // console.error yang mencolok (bukan console.warn biasa) biar
      // ketauan kalau ini kejadian - jangan didiemin walau app tetep jalan.
      console.error(
        "🚨 [academicYearService] DATA INTEGRITY ISSUE: ditemukan",
        data.length,
        "tahun ajaran ke-mark aktif bersamaan:",
        data.map((d) => `${d.year} sem ${d.semester} (id: ${d.id})`),
        "- auto-fix akan mengaktifkan yang paling baru & menonaktifkan sisanya."
      );

      const sorted = data.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
      const correctActive = sorted[0];

      const otherIds = sorted.slice(1).map((s) => s.id);
      if (otherIds.length > 0) {
        const { error: fixError } = await supabase
          .from("academic_years")
          .update({ is_active: false })
          .in("id", otherIds);

        if (fixError) {
          console.error(
            "🚨 [academicYearService] Auto-fix GAGAL menonaktifkan duplikat:",
            fixError
          );
        } else {
          console.error(
            "✅ [academicYearService] Auto-fix selesai. Aktif sekarang:",
            `${correctActive.year} semester ${correctActive.semester}`
          );
        }
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

  // ⚠️ Ini artinya TIDAK ADA tahun ajaran yang ke-mark aktif di DB sama
  // sekali (bukan cuma dobel-aktif kayak kasus di atas). Tahun & semester
  // di bawah ini cuma TEBAKAN dari tanggal hari ini, BUKAN data asli.
  // File yang manggil getActiveAcademicInfo() harus ngecek `isActive`
  // sebelum percaya nilai ini - kalau `isActive: false`, jangan dipakai
  // buat nyimpen data, cukup buat tampilan warning ke admin.
  console.error(
    "🚨 [academicYearService] TIDAK ADA tahun ajaran aktif di database!",
    `Menebak "${fallbackYear} semester ${fallbackSemester}" dari tanggal hari ini.`,
    "Admin perlu segera aktifkan salah satu tahun ajaran di menu Setting > Akademik."
  );

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

    // Cek apakah tahun sudah ada - dicek PER SEMESTER, bukan per tahun.
    // Sebelumnya kalau nemu SATU baris aja dengan tahun yang sama, langsung
    // nolak total ("YEAR_ALREADY_EXISTS") walau semester yang laen belum
    // ada. Ini bikin masalah kalau state-nya kepotong di tengah (misal
    // semester 1 kebuat tapi semester 2 gagal & rollback-nya sendiri gagal
    // karena koneksi putus) - jadi gak bisa dilanjutin, harus hapus manual
    // dulu baru bisa coba lagi. Sekarang: kalau kedua semester udah ada,
    // baru ditolak. Kalau cuma sebagian, lanjutin bikin yang belum ada aja.
    const { data: existing } = await supabase.from("academic_years").select("*").eq("year", year);

    const existingSem1 = existing?.find((s) => s.semester === 1) || null;
    const existingSem2 = existing?.find((s) => s.semester === 2) || null;

    if (existingSem1 && existingSem2) {
      console.warn(`⚠️ Year ${year} already exists (both semesters)`);
      return {
        success: false,
        message: `Tahun ajaran ${year} sudah ada di database`,
        error: "YEAR_ALREADY_EXISTS",
        data: existing,
      };
    }

    if (existingSem1 || existingSem2) {
      console.warn(
        `⚠️ Year ${year} sudah ada sebagian (semester ${existingSem1 ? 1 : 2} aja) - melanjutkan bikin semester yang belum ada.`
      );
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

    console.log("📅 Menyiapkan Semester 1...");

    // Insert Semester 1 (skip kalau udah ada dari percobaan sebelumnya)
    let sem1 = existingSem1;
    if (!sem1) {
      const { data: newSem1, error: err1 } = await supabase
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
      sem1 = newSem1;
    } else {
      console.log("   Semester 1 sudah ada, dipakai yang ini.");
    }

    console.log("📅 Menyiapkan Semester 2...");

    // Insert Semester 2 (skip kalau udah ada dari percobaan sebelumnya)
    let sem2 = existingSem2;
    if (!sem2) {
      const { data: newSem2, error: err2 } = await supabase
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
        // Rollback HANYA kalau semester 1 baru aja dibuat di panggilan ini
        // (bukan yang udah ada dari sebelumnya - jangan hapus data lama
        // orang lain gara-gara semester 2 gagal dibuat)
        if (!existingSem1) {
          await supabase.from("academic_years").delete().eq("id", sem1.id);
        }
        throw err2;
      }
      sem2 = newSem2;
    } else {
      console.log("   Semester 2 sudah ada, dipakai yang ini.");
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
// 🛡️ PREFLIGHT CHECK (Cek Kesinambungan)
// ========================================
// Daftar semua tabel yang punya kolom academic_year_id (FK ke academic_years).
// textColumn diisi kalau tabel itu JUGA punya kolom teks "academic_year" yang
// perlu disinkronkan manual (legacy column) - kalau null berarti tabel itu
// cuma pakai academic_year_id doang, gak ada kolom teks yang bisa mismatch.
const TABLES_WITH_ACADEMIC_YEAR_ID = [
  { table: "attendance_eraport", label: "Absensi E-Rapor", textColumn: null },
  { table: "attendances", label: "Absensi Harian", textColumn: null },
  { table: "catatan_eraport", label: "Catatan E-Rapor", textColumn: null },
  { table: "classes", label: "Kelas", textColumn: "academic_year" },
  { table: "ekstrakurikuler_eraport", label: "Ekstrakurikuler E-Rapor", textColumn: null },
  { table: "grades", label: "Nilai", textColumn: "academic_year" },
  { table: "grades_katrol", label: "Nilai Katrol", textColumn: "academic_year" },
  { table: "grades_katrol_settings", label: "Setting Nilai Katrol", textColumn: "academic_year" },
  { table: "jurnal_harian", label: "Jurnal Harian", textColumn: null },
  { table: "konseling", label: "Konseling", textColumn: "academic_year" },
  { table: "nilai_eraport", label: "Nilai E-Rapor", textColumn: null },
  { table: "raport_config", label: "Konfigurasi Rapor", textColumn: null },
  { table: "raport_metadata", label: "Metadata Rapor", textColumn: null },
  {
    table: "student_development_notes",
    label: "Catatan Perkembangan Siswa",
    textColumn: "academic_year",
  },
  { table: "students", label: "Data Siswa", textColumn: "academic_year" },
  { table: "teacher_assignments", label: "Penugasan Guru", textColumn: "academic_year" },
  { table: "teacher_schedules", label: "Jadwal Guru", textColumn: null },
  { table: "tujuan_pembelajaran", label: "Tujuan Pembelajaran", textColumn: null },
];

export const runPreflightCheck = async () => {
  try {
    const activeInfo = await getActiveAcademicInfo();
    const academicYearsValidation = await validateAcademicYearData();

    // Peta id -> year string, buat cek orphan & mismatch
    const { data: allYears, error: yearsError } = await supabase
      .from("academic_years")
      .select("id, year");

    if (yearsError) throw yearsError;

    const yearMap = new Map((allYears || []).map((y) => [y.id, y.year]));
    const validIds = new Set(yearMap.keys());

    const tableChecks = [];

    for (const t of TABLES_WITH_ACADEMIC_YEAR_ID) {
      try {
        const columns = t.textColumn
          ? `id, academic_year_id, ${t.textColumn}`
          : "id, academic_year_id";
        const { data, error } = await supabase.from(t.table).select(columns);

        if (error) throw error;

        const rows = data || [];
        let orphanCount = 0;
        let mismatchCount = 0;
        let activeYearRowCount = 0;
        const orphanSample = [];
        const mismatchSample = [];

        for (const row of rows) {
          const yid = row.academic_year_id;

          if (yid && activeInfo.activeSemesterId && yid === activeInfo.activeSemesterId) {
            activeYearRowCount++;
          }

          // academic_year_id kosong (null) gak dihitung orphan - biasanya
          // data lama sebelum kolom ini ada, bukan data nyasar.
          if (!yid) continue;

          if (!validIds.has(yid)) {
            orphanCount++;
            if (orphanSample.length < 5) orphanSample.push(row.id);
            continue;
          }

          if (t.textColumn) {
            const expectedYear = yearMap.get(yid);
            const actualYear = row[t.textColumn];
            if (actualYear && expectedYear && actualYear !== expectedYear) {
              mismatchCount++;
              if (mismatchSample.length < 5) mismatchSample.push(row.id);
            }
          }
        }

        tableChecks.push({
          table: t.table,
          label: t.label,
          orphanCount,
          mismatchCount,
          orphanSample,
          mismatchSample,
          activeYearRowCount,
        });
      } catch (err) {
        tableChecks.push({
          table: t.table,
          label: t.label,
          error: err.message,
        });
      }
    }

    const criticalCount = tableChecks.filter((c) => !c.error && c.orphanCount > 0).length;
    const warningCount = tableChecks.filter(
      (c) => !c.error && c.orphanCount === 0 && c.mismatchCount > 0
    ).length;
    const infoCount = tableChecks.filter(
      (c) => !c.error && c.orphanCount === 0 && c.mismatchCount === 0
    ).length;
    const errorTablesCount = tableChecks.filter((c) => c.error).length;

    const academicYearsTable = {
      isHealthy: academicYearsValidation.isHealthy,
      issues: academicYearsValidation.issues || [],
      warnings: academicYearsValidation.warnings || [],
    };

    const isHealthy =
      academicYearsTable.isHealthy &&
      errorTablesCount === 0 &&
      tableChecks.every((c) => !c.error && c.orphanCount === 0 && c.mismatchCount === 0);

    return {
      isHealthy,
      activeInfo,
      academicYearsTable,
      summary: {
        tablesChecked: tableChecks.length,
        criticalCount,
        warningCount,
        infoCount,
      },
      tableChecks,
    };
  } catch (error) {
    console.error("Error in runPreflightCheck:", error);
    return {
      isHealthy: false,
      error: error.message,
      tableChecks: [],
      summary: {},
    };
  }
};

// ========================================
// 🚦 TRANSITION READINESS CHECK
// ========================================
// Beda sama runPreflightCheck (yang cuma cek sinkronisasi academic_year_id).
// Ini cek KESIAPAN DATA sebelum executeYearTransition() di YearTransition.js
// dijalankan - ngikutin persis logika di sana (kenaikan kelas, siswa baru
// dari SPMB, kelulusan) biar ketauan apa yang bakal salah/gagal/kelewat
// SEBELUM tombol "Mulai Tahun Ajaran Baru" ditekan.
const summarizeReadinessItems = (items) => ({
  critical: items.filter((i) => i.status === "critical").length,
  warning: items.filter((i) => i.status === "warning").length,
  ok: items.filter((i) => i.status === "ok").length,
  info: items.filter((i) => i.status === "info").length,
});

export const runTransitionReadinessCheck = async (schoolConfig = {}) => {
  const grades = schoolConfig.grades || ["7", "8", "9"];
  const classesPerGrade = schoolConfig.classesPerGrade || ["A", "B", "C", "D", "E", "F"];

  const items = [];

  try {
    const activeInfo = await getActiveAcademicInfo();

    if (!activeInfo.isActive) {
      items.push({
        id: "active_semester",
        label: "Semester aktif",
        status: "critical",
        message:
          "Gak ada tahun ajaran/semester yang ke-mark aktif di database. Aktifkan dulu sebelum lanjut transisi.",
      });

      return {
        currentYear: activeInfo.year,
        newYear: null,
        activeInfo,
        items,
        summary: summarizeReadinessItems(items),
      };
    }

    const currentYear = activeInfo.year;
    const [startYear] = currentYear.split("/");
    const newYear = `${parseInt(startYear) + 1}/${parseInt(startYear) + 2}`;

    items.push({
      id: "active_semester",
      label: "Semester aktif",
      status: "ok",
      message: `${currentYear} - Semester ${activeInfo.activeSemester} aktif.`,
    });

    // 1. spmb_settings.target_academic_year harus cocok sama tahun baru,
    // kalau enggak, siswa baru TIDAK akan kedeteksi sama sekali di preview.
    const { data: spmbSettings, error: spmbError } = await supabase
      .from("spmb_settings")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();

    let targetYear = newYear;

    if (spmbError) {
      items.push({
        id: "spmb_target",
        label: "Target tahun ajaran SPMB",
        status: "critical",
        message: `Gagal cek spmb_settings: ${spmbError.message}`,
      });
    } else if (!spmbSettings) {
      items.push({
        id: "spmb_target",
        label: "Target tahun ajaran SPMB",
        status: "critical",
        message:
          "Gak ada baris spmb_settings yang aktif. Siswa baru TIDAK akan terdeteksi saat transisi.",
      });
    } else if (spmbSettings.target_academic_year !== newYear) {
      targetYear = spmbSettings.target_academic_year || newYear;
      items.push({
        id: "spmb_target",
        label: "Target tahun ajaran SPMB",
        status: "critical",
        message: `spmb_settings.target_academic_year = "${spmbSettings.target_academic_year}", harusnya "${newYear}". Betulin dulu, kalau enggak siswa baru gak bakal kedeteksi.`,
      });
    } else {
      items.push({
        id: "spmb_target",
        label: "Target tahun ajaran SPMB",
        status: "ok",
        message: `Target sudah benar: ${newYear}.`,
      });
    }

    // 2. Siswa baru dari SPMB yang siap ditransfer
    const { data: siswaBaruAll, error: siswaBaruError } = await supabase
      .from("siswa_baru")
      .select("id, nama_lengkap, nisn, kelas")
      .eq("academic_year", targetYear)
      .eq("is_transferred", false);

    let siapMasuk = [];

    if (siswaBaruError) {
      items.push({
        id: "siswa_baru_kelas",
        label: "Kelas siswa baru",
        status: "critical",
        message: `Gagal cek siswa_baru: ${siswaBaruError.message}`,
      });
    } else {
      const belumKelas = (siswaBaruAll || []).filter((s) => !s.kelas);
      siapMasuk = (siswaBaruAll || []).filter((s) => !!s.kelas);

      items.push({
        id: "siswa_baru_kelas",
        label: "Kelas siswa baru",
        status: belumKelas.length > 0 ? "critical" : "ok",
        message:
          belumKelas.length > 0
            ? `${belumKelas.length} siswa baru belum punya kelas - bakal KELEWAT pas transisi (gak ke-assign kemana pun).`
            : `${siapMasuk.length} siswa baru semua sudah punya kelas.`,
        details: belumKelas.slice(0, 10).map((s) => s.nama_lengkap),
      });

      // 3. Konflik NIS/NISN siswa baru vs siswa aktif
      const { data: existingStudents, error: existingError } = await supabase
        .from("students")
        .select("nis")
        .eq("is_active", true);

      if (existingError) {
        items.push({
          id: "nis_conflict",
          label: "Konflik NIS siswa baru",
          status: "critical",
          message: `Gagal cek NIS siswa aktif: ${existingError.message}`,
        });
      } else {
        const existingNIS = new Set((existingStudents || []).map((s) => s.nis).filter(Boolean));
        const conflicts = siapMasuk.filter((s) => s.nisn && existingNIS.has(s.nisn));

        items.push({
          id: "nis_conflict",
          label: "Konflik NIS siswa baru",
          status: conflicts.length > 0 ? "critical" : "ok",
          message:
            conflicts.length > 0
              ? `${conflicts.length} siswa baru punya NIS yang udah kepake siswa aktif - bakal DILEWATIN otomatis, betulin manual dulu di SPMB.`
              : "Gak ada konflik NIS.",
          details: conflicts.slice(0, 10).map((s) => `${s.nama_lengkap} (NIS: ${s.nisn})`),
        });
      }
    }

    // 4. Format class_id siswa aktif - kalau gak sesuai pola grade+huruf
    // (mis. "7A"), logika naik kelas (classId.replace(/[0-9]/g,"")) bisa
    // salah ngelompokin ke kelas baru.
    const validClassPattern = new RegExp(`^(${grades.join("|")})(${classesPerGrade.join("|")})$`);
    const { data: activeStudents, error: activeStudentsError } = await supabase
      .from("students")
      .select("id, full_name, class_id")
      .eq("is_active", true);

    if (activeStudentsError) {
      items.push({
        id: "class_format",
        label: "Format kelas siswa aktif",
        status: "critical",
        message: `Gagal cek students: ${activeStudentsError.message}`,
      });
    } else {
      const invalidFormat = (activeStudents || []).filter(
        (s) => !s.class_id || !validClassPattern.test(s.class_id)
      );

      items.push({
        id: "class_format",
        label: "Format kelas siswa aktif",
        status: invalidFormat.length > 0 ? "warning" : "ok",
        message:
          invalidFormat.length > 0
            ? `${invalidFormat.length} siswa aktif punya class_id yang formatnya gak sesuai pola (contoh: 7A, 8B) - bisa salah kelompok pas naik kelas.`
            : "Semua siswa aktif punya format class_id yang sesuai.",
        details: invalidFormat
          .slice(0, 10)
          .map((s) => `${s.full_name} (${s.class_id || "kosong"})`),
      });
    }

    // 5. Kelas tahun baru jangan sampe udah ada duluan (bakal gagal
    // duplicate key kalau createNewClasses() dijalanin ulang)
    const expectedNewClasses = [];
    grades.forEach((g) => classesPerGrade.forEach((l) => expectedNewClasses.push(`${g}${l}`)));

    const { data: existingNewClasses, error: newClassesError } = await supabase
      .from("classes")
      .select("id")
      .eq("academic_year", newYear);

    if (newClassesError) {
      items.push({
        id: "duplicate_classes",
        label: "Kelas tahun baru",
        status: "warning",
        message: `Gagal cek classes: ${newClassesError.message}`,
      });
    } else {
      const existingIds = new Set((existingNewClasses || []).map((c) => c.id));
      const alreadyExists = expectedNewClasses.filter((id) => existingIds.has(id));

      items.push({
        id: "duplicate_classes",
        label: "Kelas tahun baru",
        status: alreadyExists.length > 0 ? "critical" : "ok",
        message:
          alreadyExists.length > 0
            ? `${alreadyExists.length} dari ${expectedNewClasses.length} kelas buat ${newYear} udah ada di database - transisi bakal GAGAL (duplicate key) kalau dijalanin sekarang.`
            : `Belum ada kelas ${newYear} yang dibuat, aman.`,
        details: alreadyExists,
      });
    }

    // 6. Semester 1 tahun baru (info doang, kode udah handle exist-or-create)
    const { data: newSemester, error: newSemesterError } = await supabase
      .from("academic_years")
      .select("id, is_active")
      .eq("year", newYear)
      .eq("semester", 1)
      .maybeSingle();

    if (newSemesterError) {
      items.push({
        id: "new_semester",
        label: "Semester 1 tahun baru",
        status: "warning",
        message: `Gagal cek academic_years: ${newSemesterError.message}`,
      });
    } else {
      items.push({
        id: "new_semester",
        label: "Semester 1 tahun baru",
        status: "ok",
        message: newSemester
          ? `Semester 1 ${newYear} sudah ada (${newSemester.is_active ? "aktif" : "belum aktif"}) - sistem bakal pakai yang ini.`
          : `Semester 1 ${newYear} belum ada - sistem bakal bikin otomatis pas transisi.`,
      });
    }

    // 7. Kelengkapan nilai semester berjalan (advisory - gak blocking,
    // transisi tetep jalan biar gimana pun, tapi baiknya dicek dulu)
    const { data: assignments, error: assignmentsError } = await supabase
      .from("teacher_assignments")
      .select("class_id, subject")
      .eq("academic_year", currentYear)
      .eq("semester", activeInfo.activeSemester);

    if (assignmentsError) {
      items.push({
        id: "grades_completeness",
        label: "Kelengkapan nilai",
        status: "warning",
        message: `Gagal cek teacher_assignments: ${assignmentsError.message}`,
      });
    } else if (!assignments || assignments.length === 0) {
      items.push({
        id: "grades_completeness",
        label: "Kelengkapan nilai",
        status: "warning",
        message:
          "Gak ada data teacher_assignments buat semester ini, gak bisa cek kelengkapan nilai.",
      });
    } else {
      const { data: gradeRows, error: gradesError } = await supabase
        .from("grades")
        .select("student_id, class_id, subject")
        .eq("academic_year", currentYear)
        .eq("semester", activeInfo.activeSemester);

      const { data: studentsForCheck, error: studentsForCheckError } = await supabase
        .from("students")
        .select("id, class_id")
        .eq("is_active", true);

      if (gradesError || studentsForCheckError) {
        items.push({
          id: "grades_completeness",
          label: "Kelengkapan nilai",
          status: "warning",
          message: `Gagal cek grades/students: ${(gradesError || studentsForCheckError).message}`,
        });
      } else {
        const gradedSet = new Set(
          (gradeRows || []).map((g) => `${g.class_id}|${g.subject}|${g.student_id}`)
        );

        const studentsByClass = {};
        (studentsForCheck || []).forEach((s) => {
          if (!studentsByClass[s.class_id]) studentsByClass[s.class_id] = [];
          studentsByClass[s.class_id].push(s.id);
        });

        let missingCount = 0;
        const missingSample = [];

        assignments.forEach(({ class_id, subject }) => {
          const studentIds = studentsByClass[class_id] || [];
          studentIds.forEach((sid) => {
            if (!gradedSet.has(`${class_id}|${subject}|${sid}`)) {
              missingCount++;
              if (missingSample.length < 5) missingSample.push(`Kelas ${class_id} - ${subject}`);
            }
          });
        });

        items.push({
          id: "grades_completeness",
          label: "Kelengkapan nilai",
          status: missingCount > 0 ? "warning" : "ok",
          message:
            missingCount > 0
              ? `${missingCount} kombinasi siswa-mapel belum punya nilai di semester ${activeInfo.activeSemester} - gak blocking, tapi sebaiknya dibereskan sebelum tutup semester.`
              : "Semua siswa udah punya nilai buat semua mapel yang diajarkan di kelasnya.",
          details: missingSample,
        });
      }
    }

    // 8. Assignment guru bakal direset (dihapus) pas transisi - info doang
    const { count: assignmentCount, error: countError } = await supabase
      .from("teacher_assignments")
      .select("id", { count: "exact", head: true })
      .eq("academic_year", currentYear);

    items.push({
      id: "teacher_assignments_reset",
      label: "Assignment guru",
      status: "info",
      message: countError
        ? `Gagal cek jumlah teacher_assignments: ${countError.message}`
        : `${assignmentCount || 0} assignment guru buat ${currentYear} bakal DIHAPUS otomatis pas transisi. Pastiin data ini udah gak dibutuhkan (backup/export dulu kalau perlu).`,
    });

    return {
      currentYear,
      newYear,
      activeInfo,
      items,
      summary: summarizeReadinessItems(items),
    };
  } catch (error) {
    console.error("Error in runTransitionReadinessCheck:", error);
    return {
      currentYear: null,
      newYear: null,
      items: [{ id: "fatal_error", label: "Error", status: "critical", message: error.message }],
      summary: { critical: 1, warning: 0, ok: 0, info: 0 },
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
  runPreflightCheck,
  runTransitionReadinessCheck,

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
