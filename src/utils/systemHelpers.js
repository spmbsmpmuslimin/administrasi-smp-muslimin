// File: src/utils/systemHelpers.js
// Utility functions untuk manage semester aktif dan tahun ajaran

/**
 * Mendapatkan tahun ajaran saat ini berdasarkan bulan
 * @returns {string} Format: "2025/2026"
 */
export const getCurrentAcademicYear = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11

  // Juli (6) - Desember (11) = Tahun Ajaran berikutnya
  // Januari (0) - Juni (5) = Tahun Ajaran sekarang
  if (currentMonth >= 6) {
    return `${currentYear}/${currentYear + 1}`;
  } else {
    return `${currentYear - 1}/${currentYear}`;
  }
};

/**
 * Mendapatkan semester aktif berdasarkan bulan saat ini
 * @returns {number} 1 atau 2
 */
export const getCurrentSemester = () => {
  const currentMonth = new Date().getMonth() + 1; // 1-12

  // Juli (7) - Desember (12) = Semester 1
  // Januari (1) - Juni (6) = Semester 2
  return currentMonth >= 7 ? 1 : 2;
};

/**
 * Mendapatkan info lengkap semester aktif
 * @returns {object} { semester: number, academicYear: string, displayText: string }
 */
export const getActiveSemesterInfo = () => {
  const semester = getCurrentSemester();
  const academicYear = getCurrentAcademicYear();

  return {
    semester,
    academicYear,
    displayText: `Semester ${semester} - ${academicYear}`,
    startMonth: semester === 1 ? 7 : 1,
    endMonth: semester === 1 ? 12 : 6,
  };
};

/**
 * Cek apakah tanggal berada di semester tertentu
 * @param {Date|string} date - Tanggal yang akan dicek
 * @param {number} semester - Semester yang ingin dicek (1 atau 2)
 * @returns {boolean}
 */
export const isDateInSemester = (date, semester) => {
  const checkDate = new Date(date);
  const month = checkDate.getMonth() + 1; // 1-12

  if (semester === 1) {
    return month >= 7 && month <= 12;
  } else {
    return month >= 1 && month <= 6;
  }
};

/**
 * Mendapatkan range tanggal untuk semester tertentu
 * @param {number} semester - 1 atau 2
 * @param {string} academicYear - Format "2025/2026"
 * @returns {object} { startDate: string, endDate: string }
 */
export const getSemesterDateRange = (semester, academicYear) => {
  const [startYear, endYear] = academicYear.split("/").map(Number);

  if (semester === 1) {
    return {
      startDate: `${startYear}-07-01`,
      endDate: `${startYear}-12-31`,
    };
  } else {
    return {
      startDate: `${endYear}-01-01`,
      endDate: `${endYear}-06-30`,
    };
  }
};

/**
 * Format display semester
 * @param {number} semester - 1 atau 2
 * @returns {string}
 */
export const formatSemesterDisplay = (semester) => {
  return semester === 1 ? "Semester Ganjil" : "Semester Genap";
};

/**
 * Debug helper - log info semester aktif
 */
export const logActiveSemesterInfo = () => {
  const info = getActiveSemesterInfo();
  console.log("📅 ACTIVE SEMESTER INFO:", {
    semester: info.semester,
    semesterName: formatSemesterDisplay(info.semester),
    academicYear: info.academicYear,
    currentMonth: new Date().getMonth() + 1,
    displayText: info.displayText,
  });
  return info;
};

// Export all functions
export default {
  getCurrentAcademicYear,
  getCurrentSemester,
  getActiveSemesterInfo,
  isDateInSemester,
  getSemesterDateRange,
  formatSemesterDisplay,
  logActiveSemesterInfo,
};
