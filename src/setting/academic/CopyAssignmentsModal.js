// src/components/settings/academic/CopyAssignmentsModal.js
import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Copy, Info } from "lucide-react";

// Import academic year service
import {
  getActiveAcademicInfo,
  getActiveYearString,
  getActiveSemester,
  applyAcademicFilters,
} from "../../services/academicYearService";

const CopyAssignmentsModal = ({
  show,
  onClose,
  semesters = [],
  loading,
  setLoading,
  showToast,
  academicInfo, // ← Diterima dari parent component
}) => {
  // Local state untuk config copy
  const [copyConfig, setCopyConfig] = useState({
    sourceYear: "",
    sourceSemester: 1,
    targetYear: "",
    targetSemester: 2,
  });

  const [assignmentPreview, setAssignmentPreview] = useState(null);
  const [localAcademicInfo, setLocalAcademicInfo] = useState(academicInfo);
  const [availableYears, setAvailableYears] = useState([]);

  // Load academic info dan available years saat modal dibuka
  useEffect(() => {
    if (show) {
      loadAcademicInfo();
      loadAvailableYears();
    }
  }, [show]);

  // Effect untuk load preview ketika source berubah
  useEffect(() => {
    if (copyConfig.sourceYear && copyConfig.sourceSemester) {
      loadAssignmentPreview(copyConfig.sourceYear, copyConfig.sourceSemester);
    } else {
      setAssignmentPreview(null);
    }
  }, [copyConfig.sourceYear, copyConfig.sourceSemester]);

  // Fungsi untuk load academic info
  const loadAcademicInfo = async () => {
    try {
      if (academicInfo) {
        setLocalAcademicInfo(academicInfo);
        // Set default source ke tahun aktif
        if (academicInfo.year && !copyConfig.sourceYear) {
          setCopyConfig((prev) => ({
            ...prev,
            sourceYear: academicInfo.year,
            sourceSemester: academicInfo.semester || 1,
          }));
        }
      } else {
        const info = await getActiveAcademicInfo();
        setLocalAcademicInfo(info);
        // Set default source ke tahun aktif
        if (info.year && !copyConfig.sourceYear) {
          setCopyConfig((prev) => ({
            ...prev,
            sourceYear: info.year,
            sourceSemester: info.semester || 1,
          }));
        }
      }
    } catch (error) {
      console.error("Error loading academic info:", error);
      showToast(
        "Gagal memuat informasi tahun ajaran: " + error.message,
        "error"
      );
    }
  };

  // Fungsi untuk load available years dari database
  const loadAvailableYears = async () => {
    try {
      const { data, error } = await supabase
        .from("academic_years")
        .select("year, semester")
        .order("year", { ascending: false })
        .order("semester", { ascending: false });

      if (error) throw error;

      // Ekstrak tahun unik
      const uniqueYears = [
        ...new Set(data?.map((item) => item.year) || []),
      ].sort();
      setAvailableYears(uniqueYears);

      // Jika data ada tapi tidak ada di state, update
      if (data && data.length > 0 && (!semesters || semesters.length === 0)) {
        // Update copyConfig dengan tahun pertama jika belum ada source
        if (!copyConfig.sourceYear && uniqueYears.length > 0) {
          setCopyConfig((prev) => ({
            ...prev,
            sourceYear: uniqueYears[0],
          }));
        }
      }
    } catch (error) {
      console.error("Error loading available years:", error);
      setAvailableYears([]);
    }
  };

  // Fungsi untuk load preview assignment dengan academic_year_id
  const loadAssignmentPreview = async (sourceYear, sourceSemester) => {
    try {
      // Cari academic_year_id untuk source
      const { data: sourceAcademicYear, error: yearError } = await supabase
        .from("academic_years")
        .select("id")
        .eq("year", sourceYear)
        .eq("semester", sourceSemester)
        .single();

      if (yearError && yearError.code !== "PGRST116") throw yearError;

      let query = supabase
        .from("teacher_assignments")
        .select("*", { count: "exact", head: true });

      // Jika ada academic_year_id, filter menggunakan itu (lebih akurat)
      if (sourceAcademicYear?.id) {
        query = query.eq("academic_year_id", sourceAcademicYear.id);
      } else {
        // Fallback ke filter year dan semester
        query = query
          .eq("academic_year", sourceYear)
          .eq("semester", sourceSemester);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      setAssignmentPreview({
        count: count || 0,
        hasAcademicYearId: !!sourceAcademicYear?.id,
      });
    } catch (error) {
      console.error("Error loading assignment preview:", error);
      setAssignmentPreview({ count: 0, hasAcademicYearId: false });
    }
  };

  // Fungsi untuk mendapatkan academic_year_id dari year dan semester
  const getAcademicYearId = async (year, semester) => {
    try {
      const { data, error } = await supabase
        .from("academic_years")
        .select("id")
        .eq("year", year)
        .eq("semester", semester)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data?.id || null;
    } catch (error) {
      console.error(
        `Error getting academic year id for ${year} semester ${semester}:`,
        error
      );
      return null;
    }
  };

  // Validasi config sebelum copy
  const validateCopyConfig = () => {
    const errors = [];

    // Check if source selected
    if (!copyConfig.sourceYear || !copyConfig.sourceSemester) {
      errors.push("❌ Pilih source semester terlebih dahulu");
    }

    // Check if target selected
    if (!copyConfig.targetYear || !copyConfig.targetSemester) {
      errors.push("❌ Pilih target semester terlebih dahulu");
    }

    // Check if source = target
    if (
      copyConfig.sourceYear === copyConfig.targetYear &&
      copyConfig.sourceSemester === copyConfig.targetSemester
    ) {
      errors.push("❌ Source dan target tidak boleh sama");
    }

    // Check if source has data
    if (assignmentPreview && assignmentPreview.count === 0) {
      errors.push("⚠️ Source semester tidak memiliki data assignment");
    }

    // Check jika target semester ada di database
    if (copyConfig.targetYear && copyConfig.targetSemester) {
      const targetExists = availableYears.includes(copyConfig.targetYear);
      if (!targetExists) {
        errors.push(
          `⚠️ Tahun ajaran ${copyConfig.targetYear} belum ada di database`
        );
      }
    }

    return errors;
  };

  // Fungsi utama untuk copy assignments
  const handleCopyAssignments = async () => {
    const { sourceYear, sourceSemester, targetYear, targetSemester } =
      copyConfig;

    const validationErrors = validateCopyConfig();
    if (validationErrors.length > 0) {
      showToast(validationErrors[0], "error");
      return;
    }

    // Konfirmasi user
    const confirmed = window.confirm(
      `Copy semua teacher assignments dari:\n\n` +
        `📚 Source: ${sourceYear} Semester ${
          sourceSemester === 1 ? "Ganjil" : "Genap"
        } (${sourceSemester})\n` +
        `📝 Target: ${targetYear} Semester ${
          targetSemester === 1 ? "Ganjil" : "Genap"
        } (${targetSemester})\n\n` +
        `📊 ${assignmentPreview?.count || 0} assignments akan di-copy\n\n` +
        `Data assignment yang sudah ada di target akan DITIMPA!\n\n` +
        `Lanjutkan?`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      showToast("🔄 Mengambil data assignment source...", "info");

      // 1. Cari academic_year_id untuk source dan target
      const sourceAcademicYearId = await getAcademicYearId(
        sourceYear,
        sourceSemester
      );
      const targetAcademicYearId = await getAcademicYearId(
        targetYear,
        targetSemester
      );

      if (!targetAcademicYearId) {
        showToast(
          `❌ Semester ${targetSemester} tahun ${targetYear} belum ada di database!`,
          "error"
        );
        setLoading(false);
        return;
      }

      // 2. Ambil data dari source dengan filter yang tepat
      let sourceQuery = supabase.from("teacher_assignments").select("*");

      if (sourceAcademicYearId) {
        sourceQuery = sourceQuery.eq("academic_year_id", sourceAcademicYearId);
      } else {
        sourceQuery = sourceQuery
          .eq("academic_year", sourceYear)
          .eq("semester", sourceSemester);
      }

      const { data: sourceData, error: sourceError } = await sourceQuery;

      if (sourceError) throw sourceError;

      if (!sourceData || sourceData.length === 0) {
        showToast("❌ Tidak ada data assignment di source semester!", "error");
        setLoading(false);
        return;
      }

      showToast(
        `📊 Ditemukan ${sourceData.length} assignment untuk di-copy`,
        "info"
      );

      // 3. Hapus data lama di target (jika ada)
      showToast("🗑️ Menghapus data lama di target semester...", "info");
      const { error: deleteError } = await supabase
        .from("teacher_assignments")
        .delete()
        .eq("academic_year_id", targetAcademicYearId);

      if (deleteError) throw deleteError;

      // 4. Copy data ke target dengan academic_year_id yang benar
      showToast("📝 Menyalin assignment ke target semester...", "info");
      const newAssignments = sourceData.map((assignment) => ({
        teacher_id: assignment.teacher_id,
        subject: assignment.subject,
        class_id: assignment.class_id,
        academic_year: targetYear,
        semester: targetSemester,
        academic_year_id: targetAcademicYearId, // ← Gunakan target academic_year_id
      }));

      // Insert dalam batch (50 per batch untuk menghindari timeout)
      const BATCH_SIZE = 50;
      let totalInserted = 0;

      for (let i = 0; i < newAssignments.length; i += BATCH_SIZE) {
        const batch = newAssignments.slice(i, i + BATCH_SIZE);

        const { error: insertError } = await supabase
          .from("teacher_assignments")
          .insert(batch);

        if (insertError) throw insertError;

        totalInserted += batch.length;
        showToast(
          `✅ Progress: ${totalInserted}/${newAssignments.length} assignment`,
          "info"
        );
      }

      // Success message dengan info semester
      const semesterText = (sem) => (sem === 1 ? "Ganjil" : "Genap");
      showToast(
        `✅ Berhasil copy ${totalInserted} teacher assignments!\n\n` +
          `Dari: ${sourceYear} Semester ${semesterText(
            sourceSemester
          )} (${sourceSemester})\n` +
          `Ke: ${targetYear} Semester ${semesterText(
            targetSemester
          )} (${targetSemester})\n` +
          `📅 Menggunakan academic_year_id: ${targetAcademicYearId?.substring(
            0,
            8
          )}...`,
        "success"
      );

      // Tutup modal
      onClose();
    } catch (error) {
      console.error("Error copying assignments:", error);

      let errorMessage = "❌ Gagal copy assignments: ";

      if (error.message.includes("duplicate key")) {
        errorMessage += "Data sudah ada (duplikat)";
      } else if (error.message.includes("foreign key")) {
        errorMessage += "Data terkait dengan data lain";
      } else if (error.code === "PGRST116") {
        errorMessage += "Tahun ajaran/semester tidak ditemukan di database";
      } else {
        errorMessage += error.message;
      }

      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  // Get unique years dari availableYears (jika ada) atau dari semesters prop
  const getUniqueYears = () => {
    if (availableYears.length > 0) {
      return availableYears;
    }

    if (semesters && semesters.length > 0) {
      return [...new Set(semesters.map((s) => s.year))].sort();
    }

    // Fallback: coba ambil dari localAcademicInfo
    if (localAcademicInfo?.year) {
      return [localAcademicInfo.year];
    }

    return [];
  };

  // Jika modal tidak ditampilkan, return null
  if (!show) return null;

  const validationErrors = validateCopyConfig();
  const hasErrors = validationErrors.length > 0;

  // Info tahun ajaran aktif
  const activeYearInfo = localAcademicInfo
    ? `${localAcademicInfo.year} - Semester ${localAcademicInfo.semester} (${
        localAcademicInfo.semester === 1 ? "Ganjil" : "Genap"
      })`
    : "Memuat...";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Copy className="text-green-600 dark:text-green-400" size={24} />
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                Copy Teacher Assignments
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Salin data assignment dari satu semester ke semester lain
              </p>
            </div>
          </div>

          {/* Info tahun ajaran aktif */}
          {localAcademicInfo && (
            <div className="mt-2 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1 rounded inline-block">
              Tahun Ajaran Aktif: {activeYearInfo}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Source Section */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3">
              📚 Source (Dari)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tahun Ajaran
                </label>
                <select
                  value={copyConfig.sourceYear}
                  onChange={(e) =>
                    setCopyConfig({
                      ...copyConfig,
                      sourceYear: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                  <option value="">Pilih Tahun</option>
                  {getUniqueYears().map((year) => (
                    <option key={year} value={year}>
                      {year} {year === localAcademicInfo?.year ? "(Aktif)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Semester
                </label>
                <select
                  value={copyConfig.sourceSemester}
                  onChange={(e) =>
                    setCopyConfig({
                      ...copyConfig,
                      sourceSemester: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                  <option value={1}>
                    Semester 1 (Ganjil){" "}
                    {copyConfig.sourceYear === localAcademicInfo?.year &&
                    localAcademicInfo.semester === 1
                      ? "(Aktif)"
                      : ""}
                  </option>
                  <option value={2}>
                    Semester 2 (Genap){" "}
                    {copyConfig.sourceYear === localAcademicInfo?.year &&
                    localAcademicInfo.semester === 2
                      ? "(Aktif)"
                      : ""}
                  </option>
                </select>
              </div>
            </div>

            {/* Preview Count */}
            {assignmentPreview && (
              <div className="mt-3 p-2 bg-white dark:bg-gray-800 rounded border border-blue-100 dark:border-blue-800">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  📊 Preview:{" "}
                  <span className="font-bold">{assignmentPreview.count}</span>{" "}
                  assignments akan di-copy
                  {assignmentPreview.hasAcademicYearId && (
                    <span className="block text-xs text-green-600 dark:text-green-400 mt-1">
                      ✓ Menggunakan academic_year_id untuk filter
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Arrow */}
          <div className="text-center">
            <div className="inline-block px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <span className="text-2xl">⬇️</span>
            </div>
          </div>

          {/* Target Section */}
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
            <p className="text-sm font-semibold text-green-800 dark:text-green-300 mb-3">
              📝 Target (Ke)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tahun Ajaran
                </label>
                <select
                  value={copyConfig.targetYear}
                  onChange={(e) =>
                    setCopyConfig({
                      ...copyConfig,
                      targetYear: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                  <option value="">Pilih Tahun</option>
                  {getUniqueYears().map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Semester
                </label>
                <select
                  value={copyConfig.targetSemester}
                  onChange={(e) =>
                    setCopyConfig({
                      ...copyConfig,
                      targetSemester: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                  <option value={1}>Semester 1 (Ganjil)</option>
                  <option value={2}>Semester 2 (Genap)</option>
                </select>
              </div>
            </div>

            {/* Warning jika target belum ada di database */}
            {copyConfig.targetYear &&
              !availableYears.includes(copyConfig.targetYear) && (
                <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-700">
                  <p className="text-xs text-yellow-700 dark:text-yellow-400">
                    ⚠️ Tahun {copyConfig.targetYear} belum ada di database.
                    Harus membuat semester terlebih dahulu di Manajemen
                    Semester.
                  </p>
                </div>
              )}
          </div>

          {/* Validation Errors */}
          {hasErrors && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
              {validationErrors.map((error, idx) => (
                <p
                  key={idx}
                  className="text-xs text-red-600 dark:text-red-400 mb-1 last:mb-0">
                  {error}
                </p>
              ))}
            </div>
          )}

          {/* Warning */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
            <p className="text-xs text-yellow-800 dark:text-yellow-300 flex items-start gap-2">
              <span className="text-base">⚠️</span>
              <span>
                <strong>PERINGATAN:</strong> Data assignment yang sudah ada di
                target akan <strong>DITIMPA</strong> dan tidak dapat
                dikembalikan!
              </span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium disabled:opacity-50 transition min-h-[44px]">
            Batal
          </button>
          <button
            onClick={handleCopyAssignments}
            disabled={loading || hasErrors}
            className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white rounded-lg font-medium disabled:opacity-50 transition min-h-[44px]">
            {loading ? "Menyalin..." : "Copy Sekarang"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CopyAssignmentsModal;
