// src/components/settings/academic/CopyAssignmentsModal.js
import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Copy, Info } from "lucide-react";

const CopyAssignmentsModal = ({
  show,
  onClose,
  semesters = [],
  loading,
  setLoading,
  showToast,
}) => {
  // Local state untuk config copy
  const [copyConfig, setCopyConfig] = useState({
    sourceYear: "",
    sourceSemester: 1,
    targetYear: "",
    targetSemester: 2,
  });

  const [assignmentPreview, setAssignmentPreview] = useState(null);

  // Effect untuk load preview ketika source berubah
  useEffect(() => {
    if (copyConfig.sourceYear && copyConfig.sourceSemester) {
      loadAssignmentPreview(copyConfig.sourceYear, copyConfig.sourceSemester);
    } else {
      setAssignmentPreview(null);
    }
  }, [copyConfig.sourceYear, copyConfig.sourceSemester]);

  // Fungsi untuk load preview assignment
  const loadAssignmentPreview = async (sourceYear, sourceSemester) => {
    try {
      const { data, error, count } = await supabase
        .from("teacher_assignments")
        .select("*", { count: "exact", head: true })
        .eq("academic_year", sourceYear)
        .eq("semester", sourceSemester);

      if (error) throw error;
      setAssignmentPreview({ count: count || 0 });
    } catch (error) {
      console.error("Error loading assignment preview:", error);
      setAssignmentPreview({ count: 0 });
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
        `📚 Source: ${sourceYear} Semester ${sourceSemester}\n` +
        `📝 Target: ${targetYear} Semester ${targetSemester}\n\n` +
        `📊 ${assignmentPreview?.count || 0} assignments akan di-copy\n\n` +
        `Data assignment yang sudah ada di target akan DITIMPA!\n\n` +
        `Lanjutkan?`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      showToast("🔄 Mengambil data assignment source...", "info");

      // 1. Ambil data dari source
      const { data: sourceData, error: sourceError } = await supabase
        .from("teacher_assignments")
        .select("*")
        .eq("academic_year", sourceYear)
        .eq("semester", sourceSemester);

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

      // 2. Hapus data lama di target (jika ada)
      showToast("🗑️ Menghapus data lama di target semester...", "info");
      const { error: deleteError } = await supabase
        .from("teacher_assignments")
        .delete()
        .eq("academic_year", targetYear)
        .eq("semester", targetSemester);

      if (deleteError) throw deleteError;

      // 3. Copy data ke target
      showToast("📝 Menyalin assignment ke target semester...", "info");
      const newAssignments = sourceData.map((assignment) => ({
        teacher_id: assignment.teacher_id,
        subject: assignment.subject,
        class_id: assignment.class_id,
        academic_year: targetYear,
        semester: targetSemester,
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

      // Success message
      showToast(
        `✅ Berhasil copy ${totalInserted} teacher assignments!\n\n` +
          `Dari: ${sourceYear} Semester ${sourceSemester}\n` +
          `Ke: ${targetYear} Semester ${targetSemester}`,
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
      } else {
        errorMessage += error.message;
      }

      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  // Get unique years dari semesters
  const getUniqueYears = () => {
    return [...new Set(semesters.map((s) => s.year))].sort();
  };

  // Jika modal tidak ditampilkan, return null
  if (!show) return null;

  const validationErrors = validateCopyConfig();
  const hasErrors = validationErrors.length > 0;

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
                  value={copyConfig.sourceSemester}
                  onChange={(e) =>
                    setCopyConfig({
                      ...copyConfig,
                      sourceSemester: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                  <option value={1}>Semester 1 (Ganjil)</option>
                  <option value={2}>Semester 2 (Genap)</option>
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
                Data assignment yang sudah ada di target akan{" "}
                <strong>DITIMPA</strong> dan tidak dapat dikembalikan!
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
