// src/components/settings/academic/SemesterManagement.js
// ✅ REFACTORED: Uses new academicYearService functions
import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import {
  Clock,
  PlayCircle,
  PauseCircle,
  Plus,
  RefreshCw,
  CheckCircle,
  Trash2,
  AlertTriangle,
} from "lucide-react";

// ✅ Import NEW academic year service
import {
  getActiveAcademicInfo,
  getAllSemestersInActiveYear,
  setActiveAcademicYear,
  createNewAcademicYear,
  filterBySemester,
} from "../../services/academicYearService";

const SemesterManagement = ({
  schoolConfig,
  loading,
  setLoading,
  showToast,
  onSemesterChange,
  onOpenCopyModal,
  academicInfo,
  selectedSemesterId,
  availableSemesters,
}) => {
  // State untuk management semester
  const [semesters, setSemesters] = useState([]);
  const [activeSemester, setActiveSemester] = useState(null);
  const [showAddSemester, setShowAddSemester] = useState(false);
  const [newSemester, setNewSemester] = useState({
    year: "",
    semester: 1,
    start_date: "",
    end_date: "",
  });
  const [isSwitching, setIsSwitching] = useState(false);

  // ✅ Load data saat component mount atau availableSemesters berubah
  useEffect(() => {
    if (availableSemesters && availableSemesters.length > 0) {
      setSemesters(availableSemesters);
    } else {
      loadSemesters();
    }
  }, [availableSemesters]);

  // ✅ Update active semester dari academicInfo
  useEffect(() => {
    if (academicInfo) {
      setActiveSemester(academicInfo);
    }
  }, [academicInfo]);

  // ✅ Fungsi untuk load semua semester (fallback)
  const loadSemesters = async () => {
    try {
      const allSemesters = await getAllSemestersInActiveYear();
      setSemesters(allSemesters);
    } catch (error) {
      console.error("❌ Error loading semesters:", error);
      showToast("Gagal memuat data semester: " + error.message, "error");
    }
  };

  // ✅ REFACTORED: Smart Semester Switch dengan NEW service
  const executeSmartSemesterSwitch = async () => {
    if (!academicInfo) {
      showToast("❌ Tidak ada informasi semester aktif!", "error");
      return;
    }

    const currentSemester = academicInfo.activeSemester;
    const targetSemester = currentSemester === 1 ? 2 : 1;
    const currentYear = academicInfo.year;

    // STEP 1: Confirmation
    const confirm1 = window.confirm(
      `🔄 KONFIRMASI PERPINDAHAN SEMESTER\n\n` +
        `Dari: ${currentYear} - Semester ${currentSemester} (${
          currentSemester === 1 ? "Ganjil" : "Genap"
        })\n` +
        `Ke: ${currentYear} - Semester ${targetSemester} (${
          targetSemester === 1 ? "Ganjil" : "Genap"
        })\n\n` +
        `Proses otomatis:\n` +
        `✅ Check/create semester target\n` +
        `✅ Copy teacher assignments\n` +
        `✅ Aktifkan semester baru\n\n` +
        `Lanjutkan?`
    );

    if (!confirm1) return;

    const confirm2 = prompt(`Ketik "PINDAH SEMESTER" untuk konfirmasi:`);

    if (confirm2 !== "PINDAH SEMESTER") {
      showToast("Perpindahan semester dibatalkan", "info");
      return;
    }

    try {
      setIsSwitching(true);
      setLoading(true);

      // STEP 2: Check if target semester exists
      showToast("🔍 Mengecek semester target...", "info");

      const targetSemesterData = semesters.find(
        (s) => s.year === currentYear && s.semester === targetSemester
      );

      let targetSemesterId;

      if (!targetSemesterData) {
        // STEP 3: Create semester if not exists
        showToast("📝 Semester target belum ada, membuat...", "info");

        // Calculate dates based on current semester
        const yearNum = parseInt(currentYear.split("/")[0]);
        let startDate, endDate;

        if (targetSemester === 1) {
          // Semester 1: Juli - Desember
          startDate = `${yearNum}-07-01`;
          endDate = `${yearNum}-12-31`;
        } else {
          // Semester 2: Januari - Juni
          startDate = `${yearNum + 1}-01-01`;
          endDate = `${yearNum + 1}-06-30`;
        }

        const { data: newSem, error: createError } = await supabase
          .from("academic_years")
          .insert({
            year: currentYear,
            semester: targetSemester,
            start_date: startDate,
            end_date: endDate,
            is_active: false,
          })
          .select()
          .single();

        if (createError) throw createError;

        targetSemesterId = newSem.id;
        showToast("✅ Semester target berhasil dibuat!", "success");
      } else {
        targetSemesterId = targetSemesterData.id;
        showToast("✅ Semester target sudah ada", "info");
      }

      // STEP 4: Copy teacher assignments
      showToast("📋 Copying teacher assignments...", "info");

      // ✅ Get assignments dari semester CURRENT (yang aktif sekarang)
      let assignmentsQuery = supabase.from("teacher_assignments").select("*");

      // ✅ Filter by CURRENT active semester
      assignmentsQuery = filterBySemester(assignmentsQuery, academicInfo.activeSemesterId, {
        strict: true,
      });

      const { data: assignments, error: fetchError } = await assignmentsQuery;

      if (fetchError) throw fetchError;

      if (assignments && assignments.length > 0) {
        showToast(`📊 Ditemukan ${assignments.length} assignments untuk di-copy`, "info");

        // Delete existing assignments in target semester (if any)
        await supabase
          .from("teacher_assignments")
          .delete()
          .eq("academic_year_id", targetSemesterId);

        // ✅ Copy dengan academic_year_id yang BENAR
        const newAssignments = assignments.map((a) => ({
          teacher_id: a.teacher_id,
          subject: a.subject,
          class_id: a.class_id,
          academic_year: currentYear, // ← TAMBAHIN
          semester: targetSemester, // ← TAMBAHIN
          academic_year_id: targetSemesterId, // sudah benar
        }));

        const { error: insertError } = await supabase
          .from("teacher_assignments")
          .insert(newAssignments);

        if (insertError) throw insertError;

        showToast(`✅ ${assignments.length} assignments berhasil di-copy!`, "success");
      } else {
        showToast("ℹ️ Tidak ada assignments untuk di-copy", "info");
      }

      // STEP 5: Switch active semester using NEW service
      showToast("🔄 Mengaktifkan semester baru...", "info");

      const result = await setActiveAcademicYear(targetSemesterId);

      if (!result.success) {
        throw new Error(result.message);
      }

      // STEP 6: Success!
      showToast(
        `✅ Berhasil pindah ke Semester ${targetSemester}!\n\n` +
          `📅 ${currentYear} - Semester ${targetSemester === 1 ? "Ganjil" : "Genap"}\n` +
          `📋 ${assignments?.length || 0} assignments di-copy`,
        "success"
      );

      // Reload data
      await loadSemesters();
      if (onSemesterChange) onSemesterChange();
    } catch (error) {
      console.error("❌ Error:", error);

      let errorMessage = "❌ Gagal pindah semester: ";

      if (error.message.includes("duplicate key")) {
        errorMessage += "Data sudah ada (duplikat)";
      } else if (error.message.includes("foreign key")) {
        errorMessage += "Ada data terkait yang mencegah operasi";
      } else {
        errorMessage += error.message;
      }

      showToast(errorMessage, "error");
    } finally {
      setIsSwitching(false);
      setLoading(false);
    }
  };

  // ✅ REFACTORED: Add semester dengan validation
  const handleAddSemester = async () => {
    if (!newSemester.year || !newSemester.start_date || !newSemester.end_date) {
      showToast("Semua field harus diisi!", "error");
      return;
    }

    // Validate year format
    if (!/^\d{4}\/\d{4}$/.test(newSemester.year)) {
      showToast("Format tahun salah! Gunakan format: 2025/2026", "error");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("academic_years")
        .insert([
          {
            year: newSemester.year,
            semester: parseInt(newSemester.semester),
            start_date: newSemester.start_date,
            end_date: newSemester.end_date,
            is_active: false,
          },
        ])
        .select();

      if (error) throw error;

      showToast("✅ Semester berhasil ditambahkan!", "success");
      setShowAddSemester(false);
      setNewSemester({
        year: "",
        semester: 1,
        start_date: "",
        end_date: "",
      });

      // Reload data
      await loadSemesters();
      if (onSemesterChange) onSemesterChange();
    } catch (error) {
      console.error("❌ Error adding semester:", error);

      if (error.message.includes("duplicate")) {
        showToast("Semester ini sudah ada!", "error");
      } else {
        showToast("Gagal menambahkan semester: " + error.message, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ REFACTORED: Activate semester using NEW service
  const handleActivateSemester = async (semesterId) => {
    const semester = semesters.find((s) => s.id === semesterId);

    if (!semester) {
      showToast("Semester tidak ditemukan!", "error");
      return;
    }

    const confirmed = window.confirm(
      `Aktifkan semester ini?\n\n` +
        `${semester.year} - Semester ${semester.semester} (${
          semester.semester === 1 ? "Ganjil" : "Genap"
        })\n\n` +
        `Semester yang sedang aktif akan dinonaktifkan.`
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      // ✅ Use NEW service function
      const result = await setActiveAcademicYear(semesterId);

      if (!result.success) {
        throw new Error(result.message);
      }

      showToast("✅ Semester berhasil diaktifkan!", "success");

      // Reload data
      await loadSemesters();
      if (onSemesterChange) onSemesterChange();
    } catch (error) {
      console.error("❌ Error activating semester:", error);
      showToast("Gagal mengaktifkan semester: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Delete semester dengan validation
  const handleDeleteSemester = async (semesterId, isActive) => {
    if (isActive) {
      showToast("❌ Tidak bisa menghapus semester yang sedang aktif!", "error");
      return;
    }

    const semester = semesters.find((s) => s.id === semesterId);

    const confirm1 = window.confirm(
      `⚠️ PERINGATAN: HAPUS SEMESTER\n\n` +
        `${semester?.year} - Semester ${semester?.semester}\n\n` +
        `Tindakan ini TIDAK DAPAT DIBATALKAN!\n\n` +
        `Data terkait semester ini akan terpengaruh.\n\n` +
        `Lanjutkan?`
    );

    if (!confirm1) return;

    const confirm2 = prompt(`Untuk konfirmasi, ketik "DELETE" (huruf besar):`);

    if (confirm2 !== "DELETE") {
      showToast("Penghapusan semester dibatalkan", "info");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.from("academic_years").delete().eq("id", semesterId);

      if (error) throw error;

      showToast("✅ Semester berhasil dihapus!", "success");

      // Reload data
      await loadSemesters();
      if (onSemesterChange) onSemesterChange();
    } catch (error) {
      console.error("❌ Error deleting semester:", error);

      let errorMessage = "❌ Gagal menghapus semester: ";

      if (error.message.includes("foreign key")) {
        errorMessage += "Semester terkait dengan data lain (assignments, students, etc.)";
      } else {
        errorMessage += error.message;
      }

      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ========== SMART SEMESTER SWITCH SECTION ========== */}
      {academicInfo && (
        <div className="mb-8">
          {/* Process Info Header */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 border-2 border-blue-200 dark:border-blue-800 shadow-lg mb-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
              <RefreshCw className="text-blue-600 dark:text-blue-400" size={24} />
              🎯 Smart Semester Switch
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Pindah semester dengan otomatis! Sistem akan handle semua proses untuk kamu.
            </p>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
                💡 Proses Otomatis:
              </p>
              <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-500" />
                  <span>Check & create semester jika belum ada</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-500" />
                  <span>Copy semua teacher assignments</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-500" />
                  <span>Aktifkan semester baru</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-500" />
                  <span>Non-aktifkan semester lama</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Semester Cards with Center Button */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            {/* Semester Ganjil Card */}
            <div
              className={`p-6 rounded-xl border-2 transition-all ${
                academicInfo.activeSemester === 1
                  ? "bg-green-50 dark:bg-green-900/20 border-green-500 shadow-lg"
                  : "bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600"
              }`}
            >
              <div className="text-center">
                <div className="text-4xl mb-2">📚</div>
                <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
                  Semester Ganjil
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{academicInfo.year}</p>
                {academicInfo.activeSemester === 1 && (
                  <span className="inline-block px-3 py-1 bg-green-500 text-white text-sm rounded-full font-semibold">
                    ✓ Aktif
                  </span>
                )}
                {academicInfo.activeSemester !== 1 && (
                  <span className="inline-block px-3 py-1 bg-gray-400 text-white text-sm rounded-full">
                    Tidak Aktif
                  </span>
                )}
              </div>
            </div>

            {/* Center Switch Button */}
            <div className="flex items-center justify-center">
              <button
                onClick={executeSmartSemesterSwitch}
                disabled={loading || isSwitching}
                className="relative px-8 py-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-700 dark:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white rounded-xl disabled:opacity-50 font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-xl flex flex-col items-center justify-center gap-3 min-w-[200px]"
              >
                {isSwitching ? (
                  <>
                    <RefreshCw className="animate-spin" size={28} />
                    <span className="text-sm">Memproses...</span>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      {academicInfo.activeSemester === 1 ? (
                        <span className="text-2xl">→</span>
                      ) : (
                        <span className="text-2xl">←</span>
                      )}
                    </div>
                    <span className="text-base">🚀 PINDAH</span>
                    <span className="text-sm font-normal">
                      ke Semester {academicInfo.activeSemester === 1 ? "Genap" : "Ganjil"}
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Semester Genap Card */}
            <div
              className={`p-6 rounded-xl border-2 transition-all ${
                academicInfo.activeSemester === 2
                  ? "bg-green-50 dark:bg-green-900/20 border-green-500 shadow-lg"
                  : "bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600"
              }`}
            >
              <div className="text-center">
                <div className="text-4xl mb-2">📖</div>
                <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
                  Semester Genap
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{academicInfo.year}</p>
                {academicInfo.activeSemester === 2 && (
                  <span className="inline-block px-3 py-1 bg-green-500 text-white text-sm rounded-full font-semibold">
                    ✓ Aktif
                  </span>
                )}
                {academicInfo.activeSemester !== 2 && (
                  <span className="inline-block px-3 py-1 bg-gray-400 text-white text-sm rounded-full">
                    Tidak Aktif
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Panduan Penggunaan (Collapsible) */}
      <details className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <summary className="cursor-pointer font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-2">
          <span>💡 Panduan Penggunaan Manajemen Semester</span>
        </summary>

        <div className="mt-4 space-y-4 text-sm text-blue-700 dark:text-blue-400">
          <div>
            <h4 className="font-semibold mb-2">🔄 Perpindahan Semester (Rekomendasi)</h4>
            <p>
              Gunakan fitur "PINDAH ke Semester X" untuk perpindahan semester dalam tahun ajaran
              yang sama. Fitur ini otomatis dan aman.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">📋 Copy Assignments (Manual)</h4>
            <p>
              Gunakan jika ingin copy assignments antar tahun ajaran atau dalam kondisi khusus.
              Pilih source dan target dengan hati-hati.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">📅 Transisi Tahun Ajaran</h4>
            <p>
              Gunakan di akhir tahun ajaran untuk naik kelas otomatis. Pastikan data siswa baru
              sudah di-input di SPMB.
            </p>
          </div>
        </div>
      </details>

      {/* Semester Management Card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-5 md:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="text-blue-600 dark:text-blue-400" size={18} />
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">
                Manajemen Semester
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Kelola semester dalam tahun ajaran aktif
            </p>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            {/* Tombol Copy Assignments */}
            <button
              onClick={onOpenCopyModal}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white rounded-lg transition duration-200 w-full sm:w-auto min-h-[44px] font-medium"
            >
              <RefreshCw size={16} />
              <span>Copy Assignments</span>
            </button>

            {/* Tombol Tambah Semester */}
            <button
              onClick={() => setShowAddSemester(!showAddSemester)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg transition duration-200 w-full sm:w-auto min-h-[44px] font-medium"
            >
              <Plus size={16} />
              <span>Tambah Semester</span>
            </button>
          </div>
        </div>

        {/* Active Semester Highlight */}
        {academicInfo && (
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg mb-5 border border-blue-200 dark:border-blue-600">
            <div className="flex items-center gap-3">
              <PlayCircle className="text-blue-600 dark:text-blue-400" size={20} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                  Semester Aktif Sekarang
                </p>
                <p className="text-lg font-bold text-blue-900 dark:text-blue-200">
                  {academicInfo.year} - Semester{" "}
                  {academicInfo.activeSemester === 1 ? "Ganjil" : "Genap"} (
                  {academicInfo.activeSemester})
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Add Semester Form */}
        {showAddSemester && (
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg mb-5 border border-gray-200 dark:border-gray-600">
            <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">
              Tambah Semester Baru
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tahun Ajaran
                </label>
                <input
                  type="text"
                  placeholder="2025/2026"
                  value={newSemester.year}
                  onChange={(e) => setNewSemester({ ...newSemester, year: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Semester
                </label>
                <select
                  value={newSemester.semester}
                  onChange={(e) =>
                    setNewSemester({
                      ...newSemester,
                      semester: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value={1}>Semester 1 (Ganjil)</option>
                  <option value={2}>Semester 2 (Genap)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tanggal Mulai
                </label>
                <input
                  type="date"
                  value={newSemester.start_date}
                  onChange={(e) =>
                    setNewSemester({
                      ...newSemester,
                      start_date: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tanggal Selesai
                </label>
                <input
                  type="date"
                  value={newSemester.end_date}
                  onChange={(e) =>
                    setNewSemester({
                      ...newSemester,
                      end_date: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleAddSemester}
                disabled={loading}
                className="px-5 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 font-medium transition min-h-[44px]"
              >
                Simpan Semester
              </button>
              <button
                onClick={() => {
                  setShowAddSemester(false);
                  setNewSemester({
                    year: "",
                    semester: 1,
                    start_date: "",
                    end_date: "",
                  });
                }}
                className="px-5 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition min-h-[44px]"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Semester List */}
        <div className="space-y-3">
          {semesters.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Clock size={64} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Belum Ada Semester
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Untuk memulai, tambahkan semester pertama dengan klik tombol "Tambah Semester" di
                atas.
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg max-w-md mx-auto">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  💡 <strong>Tip:</strong> Biasanya semester 1 (Ganjil) dimulai Juli-Desember,
                  semester 2 (Genap) Januari-Juni.
                </p>
              </div>
            </div>
          ) : (
            semesters.map((semester) => (
              <div
                key={semester.id}
                className={`p-4 rounded-lg border-2 transition ${
                  semester.is_active
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    {semester.is_active ? (
                      <PlayCircle className="text-blue-600 dark:text-blue-400" size={20} />
                    ) : (
                      <PauseCircle className="text-gray-400 dark:text-gray-500" size={20} />
                    )}
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="font-semibold text-gray-800 dark:text-gray-100">
                          {semester.year} - Semester {semester.semester === 1 ? "Ganjil" : "Genap"}{" "}
                          ({semester.semester})
                        </span>
                        {semester.is_active && (
                          <span className="px-3 py-1 bg-blue-600 dark:bg-blue-700 text-white text-xs rounded-full font-medium">
                            AKTIF
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {new Date(semester.start_date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        -{" "}
                        {new Date(semester.end_date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto">
                    {!semester.is_active && (
                      <button
                        onClick={() => handleActivateSemester(semester.id)}
                        disabled={loading}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white text-sm rounded-lg disabled:opacity-50 transition min-h-[44px] font-medium flex-1 sm:flex-none"
                      >
                        Aktifkan
                      </button>
                    )}
                    {!semester.is_active && (
                      <button
                        onClick={() => handleDeleteSemester(semester.id, semester.is_active)}
                        disabled={loading}
                        className="px-4 py-2.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-800/40 text-red-600 dark:text-red-400 text-sm rounded-lg disabled:opacity-50 transition min-h-[44px] font-medium flex-1 sm:flex-none"
                      >
                        <Trash2 size={16} className="inline mr-1" />
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SemesterManagement;
