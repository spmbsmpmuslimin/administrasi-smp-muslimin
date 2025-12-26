import React, { useState, useEffect } from "react";
import {
  Zap,
  BarChart3,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Users,
  UserPlus,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  School,
  Hash,
  TrendingUp,
  PieChart,
} from "lucide-react";

import {
  getActiveAcademicInfo,
  getActiveYearString,
  applyAcademicFilters,
} from "../../services/academicYearService"; // ✅ Path benar

// ========================================
// 🔧 PROCESSING LOGIC - REUSABLE FUNCTION
// ========================================

/**
 * Process simulation data dari preview
 * @param {Object} preview - Data dari yearTransition.preview
 * @param {Object} schoolStats - Stats sekolah saat ini
 * @param {Object} config - Konfigurasi sekolah (grades, classes, dll)
 * @param {Object} academicInfo - Info tahun ajaran aktif dari service
 * @returns {Object} Simulation data lengkap
 */
export const processSimulation = (
  preview,
  schoolStats,
  config,
  academicInfo = null
) => {
  if (!preview) return null;

  const SCHOOL_CONFIG = {
    capacityRange: {
      minimum: 20,
      comfortable: 30,
      optimal: 35,
      high: 40,
      maximum: 45,
    },
  };

  try {
    // ✅ 2. GUNAKAN ACADEMIC INFO DINAMIS JIKA TERSEDIA
    const currentAcademicYear = academicInfo?.year || preview.currentYear;
    const nextAcademicYear = getNextAcademicYear(currentAcademicYear);

    // 1️⃣ ANALISA SISWA BARU (DARI PREVIEW!)
    const newStudentDistribution = preview.newStudentDistribution || {};
    const newStudents = preview.newStudents || [];

    // Hitung total per kelas 7
    const grade7Classes = Object.keys(newStudentDistribution);
    const grade7Total = Object.values(newStudentDistribution).reduce(
      (sum, arr) => sum + arr.length,
      0
    );

    // 2️⃣ ANALISA PROMOTIONS (SISWA NAIK KELAS)
    const promotions = preview.promotions || {};

    // Group by grade
    const grade8Classes = {};
    const grade9Classes = {};

    Object.entries(promotions).forEach(([classId, students]) => {
      const grade = classId.charAt(0);

      if (grade === "8") {
        grade8Classes[classId] = students.length;
      } else if (grade === "9") {
        grade9Classes[classId] = students.length;
      }
    });

    // Hitung total
    const grade8Total = Object.values(grade8Classes).reduce((a, b) => a + b, 0);
    const grade9Total = Object.values(grade9Classes).reduce((a, b) => a + b, 0);

    const grade8ClassCount = Object.keys(grade8Classes).length;
    const grade9ClassCount = Object.keys(grade9Classes).length;

    // 3️⃣ BUAT DISTRIBUSI FINAL
    const finalClassDistribution = [];
    const warnings = [];
    const insights = [];

    // ---- KELAS 7 (SISWA BARU) ----
    Object.entries(newStudentDistribution).forEach(([classId, students]) => {
      const studentCount = students.length;

      finalClassDistribution.push({
        class: classId,
        grade: "7",
        totalStudents: studentCount,
        newStudents: studentCount,
        existingStudents: 0,
        status:
          studentCount === 0
            ? "empty"
            : studentCount < SCHOOL_CONFIG.capacityRange.minimum
            ? "low"
            : studentCount > SCHOOL_CONFIG.capacityRange.maximum
            ? "high"
            : studentCount > SCHOOL_CONFIG.capacityRange.high
            ? "full"
            : "optimal",
      });

      // Warnings
      if (studentCount === 0) {
        warnings.push({
          type: "empty_class",
          message: `⚠️ ${classId} akan KOSONG (0 siswa)`,
          severity: "high",
        });
      } else if (studentCount < SCHOOL_CONFIG.capacityRange.minimum) {
        insights.push({
          type: "low_capacity",
          message: `ℹ️ ${classId}: ${studentCount} siswa (kurang dari minimal ${SCHOOL_CONFIG.capacityRange.minimum})`,
          severity: "low",
        });
      } else if (studentCount > SCHOOL_CONFIG.capacityRange.maximum) {
        warnings.push({
          type: "high_capacity",
          message: `⚠️ ${classId}: ${studentCount} siswa (melebihi kapasitas ${SCHOOL_CONFIG.capacityRange.maximum})`,
          severity: "medium",
        });
      }
    });

    // ---- KELAS 8 (DARI PROMOTIONS) ----
    Object.entries(grade8Classes).forEach(([classId, studentCount]) => {
      finalClassDistribution.push({
        class: classId,
        grade: "8",
        totalStudents: studentCount,
        newStudents: 0,
        existingStudents: studentCount,
        status:
          studentCount === 0
            ? "empty"
            : studentCount > SCHOOL_CONFIG.capacityRange.maximum
            ? "high"
            : studentCount > SCHOOL_CONFIG.capacityRange.high
            ? "full"
            : "optimal",
      });

      if (studentCount > SCHOOL_CONFIG.capacityRange.maximum) {
        warnings.push({
          type: "over_capacity",
          message: `📈 ${classId}: ${studentCount} siswa (padat)`,
          severity: "medium",
        });
      }
    });

    // ---- KELAS 9 (DARI PROMOTIONS) ----
    Object.entries(grade9Classes).forEach(([classId, studentCount]) => {
      finalClassDistribution.push({
        class: classId,
        grade: "9",
        totalStudents: studentCount,
        newStudents: 0,
        existingStudents: studentCount,
        status:
          studentCount === 0
            ? "empty"
            : studentCount > SCHOOL_CONFIG.capacityRange.maximum
            ? "high"
            : studentCount > SCHOOL_CONFIG.capacityRange.high
            ? "full"
            : "optimal",
      });
    });

    // 4️⃣ HITUNG STATISTIK
    const totalPromoted = grade8Total + grade9Total;
    const totalNewStudents = grade7Total;
    const totalGraduated = preview.graduating?.length || 0;
    const totalActiveAfter = totalPromoted + totalNewStudents;

    // Rata-rata per kelas
    const avgGrade7 =
      grade7Classes.length > 0
        ? Math.round(grade7Total / grade7Classes.length)
        : 0;
    const avgGrade8 =
      grade8ClassCount > 0 ? Math.round(grade8Total / grade8ClassCount) : 0;
    const avgGrade9 =
      grade9ClassCount > 0 ? Math.round(grade9Total / grade9ClassCount) : 0;

    // 5️⃣ REKOMENDASI
    const recommendations = [];

    recommendations.push(`🏫 **Struktur Kelas untuk ${nextAcademicYear}:**`);
    recommendations.push(
      `• Kelas 7: ${grade7Classes.length} paralel (${grade7Total} siswa, rata² ${avgGrade7}/kelas)`
    );
    recommendations.push(
      `• Kelas 8: ${grade8ClassCount} paralel (${grade8Total} siswa, rata² ${avgGrade8}/kelas)`
    );
    recommendations.push(
      `• Kelas 9: ${grade9ClassCount} paralel (${grade9Total} siswa, rata² ${avgGrade9}/kelas)`
    );
    recommendations.push(
      `• **Total:** ${
        grade7Classes.length + grade8ClassCount + grade9ClassCount
      } kelas aktif`
    );

    // Analisis kapasitas
    if (avgGrade8 > SCHOOL_CONFIG.capacityRange.high) {
      recommendations.push(
        `📊 **Catatan:** Kelas 8 rata² ${avgGrade8} Siswa/Kelas (Cukup Padat)`
      );
    }

    if (grade7Total < 100) {
      recommendations.push(
        `💡 **Saran:** Jumlah Siswa Baru (${grade7Total}) Dibawah Ekspektasi Normal`
      );
    }

    // 6️⃣ HASIL SIMULASI
    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalPromoted,
        totalNewStudents,
        totalGraduated,
        totalActiveBefore: schoolStats?.total_students || 0,
        totalActiveAfter,
        netChange: totalActiveAfter - (schoolStats?.total_students || 0),
      },
      classStructure: {
        grade7: {
          classes: grade7Classes.length,
          students: grade7Total,
          avgPerClass: avgGrade7,
          status:
            avgGrade7 < SCHOOL_CONFIG.capacityRange.minimum
              ? "low"
              : avgGrade7 > SCHOOL_CONFIG.capacityRange.maximum
              ? "high"
              : "optimal",
        },
        grade8: {
          classes: grade8ClassCount,
          students: grade8Total,
          avgPerClass: avgGrade8,
          status:
            avgGrade8 > SCHOOL_CONFIG.capacityRange.maximum
              ? "high"
              : avgGrade8 > SCHOOL_CONFIG.capacityRange.high
              ? "full"
              : "optimal",
        },
        grade9: {
          classes: grade9ClassCount,
          students: grade9Total,
          avgPerClass: avgGrade9,
          status:
            avgGrade9 > SCHOOL_CONFIG.capacityRange.maximum
              ? "high"
              : avgGrade9 > SCHOOL_CONFIG.capacityRange.high
              ? "full"
              : "optimal",
        },
      },
      classDistribution: finalClassDistribution.sort((a, b) => {
        if (a.grade !== b.grade) return a.grade.localeCompare(b.grade);
        return a.class.localeCompare(b.class);
      }),
      warnings,
      insights,
      recommendations,
      isValid: warnings.filter((w) => w.severity === "high").length === 0,
      academicYearChange: {
        from: currentAcademicYear,
        to: nextAcademicYear,
      },
    };
  } catch (error) {
    console.error("Error processing simulation:", error);
    return null;
  }
};

// ✅ 3. HELPER FUNCTION UNTUK MENDAPATKAN TAHUN AJARAN BERIKUTNYA
const getNextAcademicYear = (currentYear) => {
  if (!currentYear || !currentYear.includes("/")) {
    // Fallback ke kalkulasi manual jika format tidak valid
    const currentYearNum = new Date().getFullYear();
    return `${currentYearNum}/${currentYearNum + 1}`;
  }

  const [startYear, endYear] = currentYear.split("/").map(Number);
  return `${startYear + 1}/${endYear + 1}`;
};

// ========================================
// 🎨 PRESENTATION COMPONENT - REUSABLE UI
// ========================================

/**
 * SimulationResults - Component untuk display hasil simulasi
 * @param {Object} data - Hasil dari processSimulation()
 * @param {boolean} showRecommendations - Show/hide recommendations
 * @param {function} onClose - Callback untuk close
 * @param {Object} academicInfo - Info tahun ajaran aktif
 */
export const SimulationResults = ({
  data,
  showRecommendations = true,
  onClose,
  academicInfo = null,
}) => {
  const [showDetails, setShowDetails] = useState({});

  if (!data) return null;

  const {
    summary,
    classStructure = {},
    classDistribution,
    warnings,
    insights,
    recommendations,
    isValid,
  } = data;

  return (
    <div className="mt-4 sm:mt-6 bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-700 rounded-xl p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <BarChart3 className="text-blue-600 dark:text-blue-400" size={20} />
          </div>
          <div>
            <h3 className="text-sm sm:text-lg font-semibold text-gray-800 dark:text-gray-200">
              🧮 Hasil Analisis Simulasi
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {new Date(data.timestamp).toLocaleString("id-ID")}
              {/* ✅ 4. TAMBAHKAN INFO TAHUN AJARAN JIKA ADA */}
              {academicInfo && (
                <span className="ml-2 text-blue-600 dark:text-blue-400">
                  • {academicInfo.displayText}
                </span>
              )}
            </p>
          </div>
        </div>

        <div
          className={`px-3 py-1.5 rounded-full text-xs font-medium min-h-[32px] flex items-center ${
            isValid
              ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
              : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
          }`}>
          {isValid ? "✅ VALID" : "⚠️ PERHATIAN"}
        </div>
      </div>

      {/* STATISTIK UTAMA */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 p-3 sm:p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp
              size={14}
              className="text-blue-600 dark:text-blue-400"
            />
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
              Naik Kelas
            </p>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-blue-800 dark:text-blue-200">
            {summary.totalPromoted}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            Siswa 7→8, 8→9
          </p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-900/10 p-3 sm:p-4 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus
              size={14}
              className="text-emerald-600 dark:text-emerald-400"
            />
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
              Siswa Baru
            </p>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-emerald-800 dark:text-emerald-200">
            {summary.totalNewStudents}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
            Masuk kelas 7
          </p>
        </div>

        <div className="bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-900/20 dark:to-violet-900/10 p-3 sm:p-4 rounded-lg border border-violet-200 dark:border-violet-800">
          <div className="flex items-center gap-2 mb-2">
            <School
              size={14}
              className="text-violet-600 dark:text-violet-400"
            />
            <p className="text-xs font-medium text-violet-700 dark:text-violet-300">
              Siswa Lulus
            </p>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-violet-800 dark:text-violet-200">
            {summary.totalGraduated}
          </p>
          <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">
            Kelas 9
          </p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/10 p-3 sm:p-4 rounded-lg border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} className="text-amber-600 dark:text-amber-400" />
            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
              Total Aktif
            </p>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-amber-800 dark:text-amber-200">
            {summary.totalActiveAfter}
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            {summary.netChange > 0 ? "+" : ""}
            {summary.netChange} dari sebelumnya
          </p>
        </div>
      </div>

      {/* STRUKTUR KELAS */}
      <div className="mb-6">
        <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2 text-sm sm:text-base">
          <School className="text-blue-600 dark:text-blue-400" size={16} />
          Struktur Kelas untuk {data.academicYearChange.to}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {["grade7", "grade8", "grade9"].map((gradeKey) => {
            const grade = gradeKey.replace("grade", "");
            const gradeData = classStructure[gradeKey] || {};

            if (Object.keys(gradeData).length === 0) {
              return null;
            }

            const statusColors = {
              low: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
              optimal:
                "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300",
              full: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
              high: "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300",
            };

            return (
              <div
                key={grade}
                className="bg-white dark:bg-gray-700/30 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    Kelas {grade}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      statusColors[gradeData.status] ||
                      "bg-gray-100 dark:bg-gray-600"
                    }`}>
                    {gradeData.classes} Paralel
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Total Siswa
                    </span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {gradeData.students}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Rata² per Kelas
                    </span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {gradeData.avgPerClass} siswa
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Status
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        gradeData.status === "high"
                          ? "text-orange-600 dark:text-orange-400"
                          : gradeData.status === "low"
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}>
                      {gradeData.status === "high"
                        ? "Padat"
                        : gradeData.status === "low"
                        ? "Sedikit"
                        : gradeData.status === "full"
                        ? "Penuh"
                        : "Optimal"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DISTRIBUSI DETAIL */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <PieChart
              className="text-violet-600 dark:text-violet-400"
              size={16}
            />
            Distribusi Per Kelas
          </h4>
          <button
            onClick={() =>
              setShowDetails((prev) => ({ ...prev, classes: !prev.classes }))
            }
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 min-h-[44px] px-2">
            {showDetails.classes ? "Sembunyikan" : "Tampilkan"} Detail
            {showDetails.classes ? (
              <ChevronUp size={14} />
            ) : (
              <ChevronDown size={14} />
            )}
          </button>
        </div>

        {showDetails.classes ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {classDistribution.map((cls) => {
              const statusColors = {
                empty:
                  "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
                low: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
                optimal:
                  "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
                full: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
                high: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
              };

              const statusText = {
                empty: "Kosong",
                low: "Sedikit",
                optimal: "Optimal",
                full: "Penuh",
                high: "Padat",
              };

              return (
                <div
                  key={cls.class}
                  className={`p-3 rounded-lg border ${
                    statusColors[cls.status] || "bg-gray-50 dark:bg-gray-700/30"
                  }`}>
                  <div className="text-center">
                    <p className="font-bold text-gray-800 dark:text-gray-200">
                      {cls.class}
                    </p>
                    <p className="text-xl sm:text-2xl font-bold mt-1 text-gray-900 dark:text-gray-100">
                      {cls.totalStudents}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {cls.existingStudents} Ada + {cls.newStudents} Baru
                    </p>
                    <div
                      className={`mt-2 text-xs px-2 py-1 rounded-full ${
                        cls.status === "high"
                          ? "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300"
                          : cls.status === "low"
                          ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                          : cls.status === "empty"
                          ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                          : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300"
                      }`}>
                      {statusText[cls.status]}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              {classDistribution.length} Kelas Terdeteksi. Klik "Tampilkan
              Detail" Untuk Melihat Distribusi Lengkap.
            </p>
          </div>
        )}
      </div>

      {/* INSIGHTS & REKOMENDASI */}
      {showRecommendations && recommendations && recommendations.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-3 flex items-center gap-2">
            <Hash className="text-blue-600 dark:text-blue-400" size={16} />
            Rekomendasi Sistem
          </h4>
          <div className="space-y-2">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full mt-1.5 flex-shrink-0"></div>
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  {rec}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WARNING & INSIGHTS */}
      {(warnings.length > 0 || insights.length > 0) && (
        <div className="mb-6">
          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
            <AlertTriangle
              className="text-amber-600 dark:text-amber-500"
              size={16}
            />
            Analisis Sistem
          </h4>
          <div className="space-y-3">
            {/* WARNINGS */}
            {warnings.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="font-medium text-red-800 dark:text-red-300 mb-2">
                  ⚠️ Perhatian Khusus
                </p>
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                  {warnings.map((warning, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-0.5 flex-shrink-0">•</span>
                      <span>{warning.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* INSIGHTS */}
            {insights.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="font-medium text-amber-800 dark:text-amber-300 mb-2">
                  💡 Insight
                </p>
                <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                  {insights.map((insight, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-0.5 flex-shrink-0">•</span>
                      <span>{insight.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STATUS VALIDASI */}
      <div
        className={`p-4 rounded-lg ${
          isValid
            ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"
            : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
        }`}>
        <div className="flex items-start sm:items-center gap-3">
          {isValid ? (
            <CheckCircle
              className="text-emerald-600 dark:text-emerald-400 flex-shrink-0"
              size={20}
            />
          ) : (
            <AlertTriangle
              className="text-red-600 dark:text-red-400 flex-shrink-0"
              size={20}
            />
          )}
          <div>
            <p
              className={`font-semibold ${
                isValid
                  ? "text-emerald-800 dark:text-emerald-300"
                  : "text-red-800 dark:text-red-300"
              }`}>
              {isValid
                ? "✅ SIMULASI VALID - Sistem Siap Untuk Transisi"
                : "⚠️ PERHATIAN - Ada Masalah Yang Perlu Ditinjau Sebelum Execute"}
            </p>
            <p
              className={`text-sm mt-1 ${
                isValid
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-red-700 dark:text-red-400"
              }`}>
              {isValid
                ? "Semua Analisis Menunjukkan Sistem Dapat Melanjutkan Transisi Tahun Ajaran."
                : "Tinjau Rekomendasi Dan Analisis Di Atas Sebelum Melanjutkan."}
            </p>
          </div>
        </div>
      </div>

      {/* TOMBOL CLOSE (optional) */}
      {onClose && (
        <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 font-medium transition-colors text-sm min-h-[44px] flex-1">
            Tutup
          </button>
        </div>
      )}
    </div>
  );
};

// ========================================
// 🎯 MAIN SIMULATOR COMPONENT
// ========================================

/**
 * Simulator - Main component dengan 2 modes
 * @param {string} mode - "preview" (auto-show) atau "analysis" (manual trigger)
 * @param {Object} preview - Data preview dari yearTransition
 * @param {Object} schoolStats - Stats sekolah
 * @param {Object} config - Konfigurasi sekolah
 * @param {boolean} loading - Loading state
 * @param {function} onSimulate - Callback setelah simulasi
 */
const Simulator = ({
  mode = "analysis",
  preview,
  schoolStats,
  config,
  loading,
  onSimulate,
}) => {
  // ✅ 5. TAMBAHKAN STATE UNTUK ACADEMIC INFO
  const [academicInfo, setAcademicInfo] = useState(null);
  const [academicLoading, setAcademicLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);

  // ✅ 6. LOAD ACADEMIC INFO SAAT COMPONENT MOUNT
  useEffect(() => {
    const loadAcademicInfo = async () => {
      try {
        setAcademicLoading(true);
        const info = await getActiveAcademicInfo();
        setAcademicInfo(info);
      } catch (error) {
        console.error("Error loading academic info:", error);
      } finally {
        setAcademicLoading(false);
      }
    };

    loadAcademicInfo();
  }, []);

  // Mode "preview" = auto-process & display
  if (mode === "preview" && preview) {
    const result = processSimulation(
      preview,
      schoolStats,
      config,
      academicInfo
    );
    return (
      <SimulationResults
        data={result}
        showRecommendations={false}
        onClose={null}
        academicInfo={academicInfo}
      />
    );
  }

  // ✅ 7. UPDATE HANDLE SIMULATE DENGAN ACADEMIC INFO
  const handleSimulate = async () => {
    if (!preview) {
      alert("Generate preview transisi terlebih dahulu!");
      return;
    }

    setIsSimulating(true);

    try {
      const result = processSimulation(
        preview,
        schoolStats,
        config,
        academicInfo
      );
      setSimulationResult(result);

      if (onSimulate) {
        onSimulate(result);
      }
    } catch (error) {
      console.error("Error in simulation:", error);
      alert("Error saat simulasi: " + error.message);
    } finally {
      setIsSimulating(false);
    }
  };

  // ✅ 8. HANDLE LOADING STATE UNTUK ACADEMIC INFO
  if (academicLoading) {
    return (
      <div className="border-2 border-blue-300 dark:border-blue-700 border-dashed rounded-lg p-8 text-center">
        <RefreshCw
          className="animate-spin mx-auto text-blue-500 dark:text-blue-400"
          size={28}
        />
        <p className="mt-3 font-medium text-blue-700 dark:text-blue-300">
          Memuat informasi tahun ajaran...
        </p>
      </div>
    );
  }

  // Jika belum ada preview
  if (!preview) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-start sm:items-center gap-3">
          <AlertTriangle
            className="text-amber-600 dark:text-amber-500 flex-shrink-0"
            size={20}
          />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-300">
              Belum ada preview transisi
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Klik "Preview Naik Kelas" terlebih dahulu
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      {/* TOMBOL SIMULASI */}
      {!simulationResult && (
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 border-2 border-blue-300 dark:border-blue-700 rounded-xl p-4 sm:p-5 mb-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                <Zap className="text-blue-600 dark:text-blue-300" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-200 text-lg">
                  🧮 SIMULATOR TRANSIKSI DINAMIS
                </h3>
                <p className="text-blue-700 dark:text-blue-300 text-sm">
                  Analisis kebutuhan kelas dan distribusi siswa secara otomatis
                  {/* ✅ 9. TAMBAHKAN INFO TAHUN AJARAN DI DESCRIPTION */}
                  {academicInfo && (
                    <span className="block mt-1 text-xs font-medium">
                      Tahun Ajaran: {academicInfo.year} •{" "}
                      {academicInfo.semesterText}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={handleSimulate}
              disabled={isSimulating || loading || !academicInfo}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-800 dark:hover:to-blue-900 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors shadow-md min-h-[44px] w-full sm:w-auto">
              {isSimulating ? (
                <>
                  <RefreshCw className="animate-spin" size={16} />
                  Menganalisa...
                </>
              ) : (
                <>
                  <BarChart3 size={16} />
                  <span className="hidden sm:inline">🧠 Jalankan Analisis</span>
                  <span className="sm:hidden">Analisis</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-blue-800 dark:text-blue-300">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
              <span>Analisis kapasitas kelas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
              <span>Deteksi masalah distribusi</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
              <span>Rekomendasi sistem</span>
            </div>
          </div>
        </div>
      )}

      {/* STATUS PREVIEW */}
      <div className="bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <Calendar className="text-gray-600 dark:text-gray-400" size={16} />
          <div>
            <p className="font-medium text-gray-800 dark:text-gray-200">
              Preview Transisi
            </p>
            {/* ✅ 10. UPDATE DISPLAY TAHUN AJARAN MENJADI DINAMIS */}
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {academicInfo ? academicInfo.year : preview.currentYear} →{" "}
              {getNextAcademicYear(academicInfo?.year || preview.currentYear)}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-700/50 p-3 rounded border border-gray-300 dark:border-gray-600">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Siswa Baru (Kelas 7)
            </p>
            <p className="font-bold text-gray-800 dark:text-gray-200">
              {preview.newStudents?.length || 0}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-700/50 p-3 rounded border border-gray-300 dark:border-gray-600">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Naik Kelas
            </p>
            <p className="font-bold text-gray-800 dark:text-gray-200">
              {Object.keys(preview.promotions || {}).length > 0
                ? Object.values(preview.promotions || {}).reduce(
                    (total, arr) => total + arr.length,
                    0
                  )
                : 0}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-700/50 p-3 rounded border border-gray-300 dark:border-gray-600">
            <p className="text-xs text-gray-500 dark:text-gray-400">Lulus</p>
            <p className="font-bold text-gray-800 dark:text-gray-200">
              {preview.graduating?.length || 0}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-700/50 p-3 rounded border border-gray-300 dark:border-gray-600">
            <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
            <p className="font-medium text-emerald-600 dark:text-emerald-400">
              Preview Siap
              {/* ✅ 11. TAMBAHKAN INFO SEMESTER JIKA ADA */}
              {academicInfo && (
                <span className="block text-xs text-gray-500">
                  Semester {academicInfo.semester}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* HASIL SIMULASI */}
      {simulationResult && (
        <SimulationResults
          data={simulationResult}
          showRecommendations={true}
          onClose={() => setSimulationResult(null)}
          academicInfo={academicInfo}
        />
      )}

      {/* LOADING STATE */}
      {(isSimulating || loading) && !simulationResult && (
        <div className="border-2 border-blue-300 dark:border-blue-700 border-dashed rounded-lg p-8 text-center">
          <RefreshCw
            className="animate-spin mx-auto text-blue-500 dark:text-blue-400"
            size={28}
          />
          <p className="mt-3 font-medium text-blue-700 dark:text-blue-300">
            Menganalisis data transisi...
          </p>
          <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
            Menghitung distribusi, kapasitas, dan rekomendasi sistem
            {academicInfo && (
              <span className="block mt-1">
                Tahun Ajaran: {academicInfo.year}
              </span>
            )}
          </p>
        </div>
      )}

      {/* EMPTY STATE - No preview */}
      {!preview && !academicLoading && (
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/30 dark:to-gray-900/20 border-2 border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
          <BarChart3
            className="mx-auto text-gray-400 dark:text-gray-600"
            size={40}
          />
          <h3 className="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-300">
            Simulator Siap
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Hasil analisis akan muncul di sini setelah menjalankan simulasi.
          </p>
          <button
            disabled={true}
            className="mt-4 px-5 py-2.5 bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 rounded-lg font-medium cursor-not-allowed min-h-[44px]">
            Butuh Preview Transisi
          </button>
        </div>
      )}
    </div>
  );
};

export default Simulator;
