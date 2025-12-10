import React, { useState, useEffect, useCallback } from "react";
import {
  generateClassDistribution,
  checkClassBalance,
  getClassStats,
  saveToHistory,
  handleUndo,
  handleRedo,
  getTahunAjaran,
  formatTahunAjaran,
} from "./ClassDistribution";
import {
  saveClassAssignments,
  transferToStudents,
  resetClassAssignments,
  updateClassAssignment,
  handleMoveStudentSaved,
  handleExportClassDivision,
  handleExportSavedClasses,
  handleDragStart,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleRemoveStudent,
  handleAddStudent,
  getAllStudentsInDistribution,
  handleSwapStudents,
} from "./ClassOperations";
import { exportClassDivision } from "./SpmbExcel";

const ClassDivision = ({
  allStudents,
  showToast,
  isLoading: parentLoading,
  onRefreshData,
  supabase,
  getCurrentAcademicYear,
}) => {
  const [unassignedStudents, setUnassignedStudents] = useState([]);
  const [classDistribution, setClassDistribution] = useState({});
  const [numClasses, setNumClasses] = useState(6);
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeClassView, setActiveClassView] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [draggedStudent, setDraggedStudent] = useState(null);
  const [dragOverClass, setDragOverClass] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGender, setFilterGender] = useState("all");
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapStudent1, setSwapStudent1] = useState(null);
  const [swapStudent2, setSwapStudent2] = useState(null);
  const [unbalancedClasses, setUnbalancedClasses] = useState([]);

  const [savedClassDistribution, setSavedClassDistribution] = useState({});
  const [showSavedClasses, setShowSavedClasses] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Load siswa yang belum dibagi kelas
  useEffect(() => {
    const unassigned = allStudents.filter(
      (s) => !s.is_transferred && !s.kelas && s.status === "diterima"
    );
    setUnassignedStudents(unassigned);
  }, [allStudents]);

  useEffect(() => {
    if (Object.keys(classDistribution).length > 0) {
      const unbalanced = checkClassBalance(classDistribution);
      setUnbalancedClasses(unbalanced);
    }
  }, [classDistribution]);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      if (onRefreshData) {
        await onRefreshData();
      }
      showToast("✅ Data berhasil di-refresh", "success");
    } catch (error) {
      console.error("Error refreshing data:", error);
      showToast("❌ Gagal refresh data", "error");
    } finally {
      setIsLoading(false);
    }
  }, [onRefreshData, showToast]);

  const handleGenerateDistribution = useCallback(() => {
    generateClassDistribution(
      unassignedStudents,
      numClasses,
      setIsLoading,
      setClassDistribution,
      setShowPreview,
      setShowSavedClasses,
      setEditMode,
      setHistory,
      setHistoryIndex,
      showToast
    );
  }, [unassignedStudents, numClasses, showToast]);

  const loadSavedClassDistribution = useCallback(() => {
    const distribution = {};

    allStudents
      .filter((s) => s.kelas && !s.is_transferred && s.status === "diterima")
      .forEach((student) => {
        const className = student.kelas;
        if (!distribution[className]) {
          distribution[className] = [];
        }
        distribution[className].push(student);
      });

    // 🔥 SORT KELAS: 7A, 7B, 7C, dst
    const sortedDistribution = {};
    Object.keys(distribution)
      .sort()
      .forEach((className) => {
        sortedDistribution[className] = distribution[className];
      });

    setSavedClassDistribution(sortedDistribution);
    setShowSavedClasses(true);
    setShowPreview(false);
    setEditMode(true);

    showToast("📚 Memuat kelas yang sudah tersimpan", "info");
  }, [allStudents, showToast]);

  const getFilteredStudents = (students) => {
    return students.filter((student) => {
      const matchSearch =
        student.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.asal_sekolah || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      const matchGender =
        filterGender === "all" || student.jenis_kelamin === filterGender;
      return matchSearch && matchGender;
    });
  };

  const studentsWithClass = allStudents.filter(
    (s) => s.kelas && !s.is_transferred
  );
  const currentDistribution = showSavedClasses
    ? savedClassDistribution
    : classDistribution;
  const isEditModeActive = showSavedClasses ? true : editMode;

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-4 lg:px-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-4 sm:p-6 text-white">
        <h2 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">
          📚 Pembagian Kelas Otomatis
        </h2>
        <p className="text-purple-100 text-sm sm:text-base">
          Distribusi Siswa Baru Ke Kelas 7A - 7F Secara Seimbang
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 border-l-4 border-blue-500">
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            Belum Dibagi Kelas
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
            {unassignedStudents.length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            siswa menunggu pembagian
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 border-l-4 border-green-500">
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            Sudah Dibagi Kelas
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
            {studentsWithClass.length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            siswa siap ditransfer
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 border-l-4 border-purple-500">
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            Sudah Transfer
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">
            {allStudents.filter((s) => s.is_transferred).length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            siswa aktif di sistem
          </div>
        </div>
      </div>

      {/* Control Panel */}
      {!showPreview && !showSavedClasses && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 dark:text-gray-100">
            ⚙️ Pengaturan Pembagian
          </h3>

          <div className="space-y-4 sm:space-y-6">
            {/* Row 1: Jumlah Kelas dan Generate */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Jumlah Kelas
                </label>
                <select
                  value={numClasses}
                  onChange={(e) => setNumClasses(Number(e.target.value))}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm sm:text-base min-h-[44px]"
                  disabled={isLoading}>
                  {[4, 5, 6, 7, 8].map((num) => (
                    <option key={num} value={num}>
                      {num} Kelas (7A - 7{String.fromCharCode(64 + num)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col justify-end">
                <button
                  onClick={handleGenerateDistribution}
                  disabled={isLoading || unassignedStudents.length === 0}
                  className="w-full px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2 min-h-[44px] text-sm sm:text-base">
                  🎲 Generate Otomatis
                </button>
              </div>
            </div>

            {/* Row 2: Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={loadSavedClassDistribution}
                disabled={isLoading || studentsWithClass.length === 0}
                className="px-3 sm:px-4 py-2 sm:py-3 bg-orange-600 dark:bg-orange-700 text-white rounded-lg hover:bg-orange-700 dark:hover:bg-orange-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm min-h-[44px]">
                ✏️ Edit Kelas Tersimpan ({studentsWithClass.length})
              </button>

              <button
                onClick={() =>
                  handleExportSavedClasses(
                    allStudents,
                    setIsExporting,
                    showToast
                  )
                }
                disabled={isExporting || studentsWithClass.length === 0}
                className="px-3 sm:px-4 py-2 sm:py-3 bg-purple-600 dark:bg-purple-700 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm min-h-[44px]">
                <i className="fas fa-file-excel"></i>
                {isExporting ? "Exporting..." : `Export Kelas`}
              </button>

              <button
                onClick={() =>
                  resetClassAssignments(
                    allStudents,
                    supabase,
                    setIsLoading,
                    showToast,
                    onRefreshData
                  )
                }
                disabled={isLoading || studentsWithClass.length === 0}
                className="px-3 sm:px-4 py-2 sm:py-3 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm min-h-[44px]">
                🔄 Reset Pembagian
              </button>

              <button
                onClick={() => setShowTransferModal(true)}
                disabled={isLoading || studentsWithClass.length === 0}
                className="px-3 sm:px-4 py-2 sm:py-3 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm min-h-[44px]">
                🚀 Transfer ke Students
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar Edit Mode */}
      {(showPreview || showSavedClasses) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {showPreview && (
                <button
                  onClick={() => setEditMode(!editMode)}
                  className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm min-h-[36px] sm:min-h-[40px] ${
                    editMode
                      ? "bg-orange-600 dark:bg-orange-700 text-white hover:bg-orange-700 dark:hover:bg-orange-600"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  }`}>
                  {editMode ? "🔓 Mode Edit: ON" : "🔒 Mode Edit: OFF"}
                </button>
              )}

              {showSavedClasses && (
                <span className="px-3 sm:px-4 py-2 bg-orange-600 dark:bg-orange-700 text-white rounded-lg font-medium text-xs sm:text-sm min-h-[36px] sm:min-h-[40px] flex items-center">
                  ✏️ Edit Kelas Tersimpan
                </span>
              )}

              {isEditModeActive && (
                <div className="flex gap-1 sm:gap-2">
                  {showPreview && (
                    <>
                      <button
                        onClick={() =>
                          handleUndo(
                            historyIndex,
                            history,
                            setHistoryIndex,
                            setClassDistribution,
                            showToast
                          )
                        }
                        disabled={historyIndex <= 0}
                        className="px-2 sm:px-3 py-1 sm:py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm min-h-[36px] sm:min-h-[40px] flex items-center"
                        title="Undo (Ctrl+Z)">
                        ↩️ Undo
                      </button>

                      <button
                        onClick={() =>
                          handleRedo(
                            historyIndex,
                            history,
                            setHistoryIndex,
                            setClassDistribution,
                            showToast
                          )
                        }
                        disabled={historyIndex >= history.length - 1}
                        className="px-2 sm:px-3 py-1 sm:py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm min-h-[36px] sm:min-h-[40px] flex items-center"
                        title="Redo (Ctrl+Y)">
                        ↪️ Redo
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => setShowSwapModal(true)}
                    className="px-2 sm:px-3 py-1 sm:py-2 bg-indigo-600 dark:bg-indigo-700 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 text-xs sm:text-sm min-h-[36px] sm:min-h-[40px] flex items-center">
                    🔄 Swap Siswa
                  </button>
                </div>
              )}
            </div>

            {unbalancedClasses.length > 0 && showPreview && (
              <div className="flex items-center gap-1 sm:gap-2 bg-yellow-50 dark:bg-yellow-900/30 px-2 sm:px-3 py-1 sm:py-2 rounded-lg border border-yellow-200 dark:border-yellow-800 mt-2 sm:mt-0">
                <span className="text-yellow-600 dark:text-yellow-400">⚠️</span>
                <span className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-300">
                  {unbalancedClasses.length} kelas tidak seimbang
                </span>
              </div>
            )}

            {showSavedClasses && (
              <div className="flex items-center gap-1 sm:gap-2 bg-green-50 dark:bg-green-900/30 px-2 sm:px-3 py-1 sm:py-2 rounded-lg border border-green-200 dark:border-green-800 mt-2 sm:mt-0">
                <span className="text-green-600 dark:text-green-400">💾</span>
                <span className="text-xs sm:text-sm text-green-800 dark:text-green-300">
                  Perubahan langsung tersimpan ke database
                </span>
              </div>
            )}
          </div>

          {isEditModeActive && (
            <div className="mt-2 sm:mt-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-2 sm:p-3">
              <p className="text-xs sm:text-sm text-orange-800 dark:text-orange-300">
                <strong>Mode Edit Aktif:</strong> Drag & drop siswa antar kelas,
                klik "Edit" untuk tambah/hapus siswa, atau gunakan "Swap" untuk
                tukar siswa.
                {showSavedClasses &&
                  " Perubahan langsung tersimpan ke database."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Preview Hasil Pembagian */}
      {(showPreview || showSavedClasses) &&
        Object.keys(currentDistribution).length > 0 && (
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-4 gap-2 sm:gap-0">
                <h3 className="text-base sm:text-lg font-semibold dark:text-gray-100">
                  {showSavedClasses
                    ? "✏️ Edit Kelas Tersimpan"
                    : "👁️ Preview Pembagian Kelas"}
                </h3>
                <div className="flex gap-2 flex-wrap">
                  {showPreview && (
                    <>
                      <button
                        onClick={() =>
                          handleExportClassDivision(
                            classDistribution,
                            setIsExporting,
                            showToast
                          )
                        }
                        disabled={isExporting || isLoading}
                        className="px-3 sm:px-4 py-1 sm:py-2 bg-purple-600 dark:bg-purple-700 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 font-medium text-xs sm:text-sm flex items-center gap-1 sm:gap-2 min-h-[36px] sm:min-h-[40px]">
                        <i className="fas fa-file-excel text-xs sm:text-sm"></i>
                        {isExporting ? "Exporting..." : "Export Excel"}
                      </button>

                      <button
                        onClick={() =>
                          saveClassAssignments(
                            classDistribution,
                            supabase,
                            setIsLoading,
                            showToast,
                            onRefreshData,
                            setShowPreview,
                            setClassDistribution,
                            setEditMode,
                            setHistory,
                            setHistoryIndex,
                            getCurrentAcademicYear()
                          )
                        }
                        disabled={isLoading}
                        className="px-3 sm:px-4 py-1 sm:py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 font-medium text-xs sm:text-sm min-h-[36px] sm:min-h-[40px]">
                        💾 Simpan Pembagian
                      </button>
                    </>
                  )}

                  {showSavedClasses && (
                    <button
                      onClick={() =>
                        handleExportSavedClasses(
                          allStudents,
                          setIsExporting,
                          showToast
                        )
                      }
                      disabled={isExporting}
                      className="px-3 sm:px-4 py-1 sm:py-2 bg-purple-600 dark:bg-purple-700 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 font-medium text-xs sm:text-sm flex items-center gap-1 sm:gap-2 min-h-[36px] sm:min-h-[40px]">
                      <i className="fas fa-file-excel text-xs sm:text-sm"></i>
                      {isExporting ? "Exporting..." : "Export Excel"}
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          showSavedClasses
                            ? "Tutup edit kelas tersimpan?"
                            : "Batalkan pembagian? Semua perubahan akan hilang."
                        )
                      ) {
                        setShowPreview(false);
                        setShowSavedClasses(false);
                        setClassDistribution({});
                        setEditMode(false);
                        setHistory([]);
                        setHistoryIndex(-1);
                      }
                    }}
                    disabled={isLoading}
                    className="px-3 sm:px-4 py-1 sm:py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 font-medium text-xs sm:text-sm min-h-[36px] sm:min-h-[40px]">
                    {showSavedClasses ? "← Kembali" : "❌ Batal"}
                  </button>
                </div>
              </div>

              {/* Grid Kelas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {Object.entries(currentDistribution).map(
                  ([className, students]) => {
                    const stats = getClassStats(students);
                    const isUnbalanced =
                      showPreview &&
                      unbalancedClasses.some(
                        (uc) => uc.className === className
                      );
                    const isDragOver = dragOverClass === className;

                    return (
                      <div
                        key={className}
                        className={`border-2 rounded-lg p-3 sm:p-4 transition-all ${
                          isUnbalanced
                            ? "border-yellow-400 dark:border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
                            : isDragOver
                            ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 scale-105"
                            : "border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500"
                        } ${isEditModeActive ? "cursor-pointer" : ""}`}
                        onDragOver={
                          isEditModeActive
                            ? (e) =>
                                handleDragOver(e, className, setDragOverClass)
                            : undefined
                        }
                        onDragLeave={
                          isEditModeActive
                            ? () => handleDragLeave(setDragOverClass)
                            : undefined
                        }
                        onDrop={
                          isEditModeActive
                            ? (e) =>
                                handleDrop(
                                  e,
                                  className,
                                  draggedStudent,
                                  currentDistribution,
                                  showSavedClasses
                                    ? setSavedClassDistribution
                                    : setClassDistribution,
                                  showSavedClasses,
                                  saveToHistory,
                                  setDraggedStudent,
                                  setDragOverClass,
                                  showToast,
                                  setHistory,
                                  setHistoryIndex,
                                  historyIndex
                                )
                            : undefined
                        }>
                        <div className="text-center mb-2 sm:mb-3">
                          <div className="flex items-center justify-center gap-1 sm:gap-2">
                            <h4 className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {className}
                            </h4>
                            {isUnbalanced && (
                              <span className="text-yellow-500 dark:text-yellow-400 text-lg sm:text-xl">
                                ⚠️
                              </span>
                            )}
                          </div>
                          <div className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">
                            {stats.total}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                            siswa
                          </div>
                        </div>

                        <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">
                              👦 Laki-laki:
                            </span>
                            <span className="font-semibold dark:text-gray-300">
                              {stats.males}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">
                              👧 Perempuan:
                            </span>
                            <span className="font-semibold dark:text-gray-300">
                              {stats.females}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">
                              🏫 Asal SD:
                            </span>
                            <span className="font-semibold dark:text-gray-300">
                              {stats.schoolCount}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-1 sm:gap-2 mt-2 sm:mt-3">
                          <button
                            onClick={() => {
                              setActiveClassView(className);
                              if (showSavedClasses) {
                                setEditingClass(className);
                              }
                            }}
                            className="flex-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium py-1 px-2 border border-blue-300 dark:border-blue-700 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors min-h-[36px]">
                            Lihat Detail →
                          </button>
                          {isEditModeActive && showPreview && (
                            <button
                              onClick={() => {
                                setEditingClass(className);
                                setShowEditModal(true);
                              }}
                              className="flex-1 text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium py-1 px-2 border border-orange-300 dark:border-orange-700 rounded hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-colors min-h-[36px]">
                              ✏️ Edit
                            </button>
                          )}
                          {showSavedClasses && (
                            <button
                              onClick={() => {
                                setActiveClassView(className);
                                setEditingClass(className);
                              }}
                              className="flex-1 text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium py-1 px-2 border border-orange-300 dark:border-orange-700 rounded hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-colors min-h-[36px]">
                              ✏️ Edit Siswa
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        )}

      {/* Modal Edit Kelas (untuk preview baru) */}
      {showEditModal && editingClass && classDistribution[editingClass] && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden mx-2 sm:mx-4">
            <div className="bg-orange-600 dark:bg-orange-700 text-white p-3 sm:p-4 flex justify-between items-center">
              <h3 className="text-lg sm:text-xl font-bold">
                ✏️ Edit Kelas {editingClass}
              </h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingClass(null);
                  setSearchTerm("");
                  setFilterGender("all");
                }}
                className="text-white hover:bg-orange-700 dark:hover:bg-orange-600 rounded-full w-8 h-8 flex items-center justify-center">
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {/* Current Students */}
              <div className="mb-4 sm:mb-6">
                <h4 className="font-semibold mb-2 sm:mb-3 flex items-center gap-1 sm:gap-2 dark:text-gray-100">
                  <span>👥 Siswa di Kelas {editingClass}</span>
                  <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-2 py-1 rounded text-xs sm:text-sm">
                    {classDistribution[editingClass].length} siswa
                  </span>
                </h4>
                <div className="max-h-40 sm:max-h-48 overflow-y-auto border dark:border-gray-700 rounded-lg">
                  {classDistribution[editingClass].length === 0 ? (
                    <div className="p-3 sm:p-4 text-center text-gray-500 dark:text-gray-400">
                      Kelas kosong
                    </div>
                  ) : (
                    <div className="divide-y dark:divide-gray-700">
                      {classDistribution[editingClass].map((student) => (
                        <div
                          key={student.id}
                          className="p-2 sm:p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex justify-between items-center"
                          draggable={editMode}
                          onDragStart={(e) =>
                            handleDragStart(
                              e,
                              student,
                              editingClass,
                              setDraggedStudent
                            )
                          }>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm sm:text-base dark:text-gray-100 truncate">
                              {student.nama_lengkap}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {student.asal_sekolah}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                student.jenis_kelamin === "L"
                                  ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                                  : "bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300"
                              }`}>
                              {student.jenis_kelamin}
                            </span>
                            <button
                              onClick={() =>
                                handleRemoveStudent(
                                  student.id,
                                  editingClass,
                                  classDistribution,
                                  setClassDistribution,
                                  showSavedClasses,
                                  saveToHistory,
                                  showToast,
                                  historyIndex,
                                  setHistory,
                                  setHistoryIndex
                                )
                              }
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-2 py-1 text-xs"
                              title="Keluarkan dari kelas">
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Available Students */}
              <div>
                <h4 className="font-semibold mb-2 sm:mb-3 dark:text-gray-100">
                  ➕ Tambah Siswa
                </h4>

                {/* Search & Filter */}
                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Cari nama atau asal sekolah..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm"
                  />
                  <select
                    value={filterGender}
                    onChange={(e) => setFilterGender(e.target.value)}
                    className="px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm">
                    <option value="all">Semua</option>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>

                <div className="max-h-48 sm:max-h-64 overflow-y-auto border dark:border-gray-700 rounded-lg">
                  {(() => {
                    const availableStudents =
                      getFilteredStudents(unassignedStudents);

                    if (availableStudents.length === 0) {
                      return (
                        <div className="p-3 sm:p-4 text-center text-gray-500 dark:text-gray-400">
                          Tidak ada siswa tersedia
                        </div>
                      );
                    }

                    return (
                      <div className="divide-y dark:divide-gray-700">
                        {availableStudents.map((student) => (
                          <div
                            key={student.id}
                            className="p-2 sm:p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex justify-between items-center">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm sm:text-base dark:text-gray-100 truncate">
                                {student.nama_lengkap}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {student.asal_sekolah}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2">
                              <span
                                className={`px-2 py-1 rounded text-xs font-semibold ${
                                  student.jenis_kelamin === "L"
                                    ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                                    : "bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300"
                                }`}>
                                {student.jenis_kelamin}
                              </span>
                              <button
                                onClick={() =>
                                  handleAddStudent(
                                    student,
                                    editingClass,
                                    classDistribution,
                                    setClassDistribution,
                                    showSavedClasses,
                                    saveToHistory,
                                    showToast,
                                    historyIndex,
                                    setHistory,
                                    setHistoryIndex
                                  )
                                }
                                className="bg-green-600 dark:bg-green-700 text-white px-2 sm:px-3 py-1 rounded text-xs hover:bg-green-700 dark:hover:bg-green-600 transition-colors min-h-[32px] flex items-center">
                                + Tambah
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Kelas Tersimpan */}
      {showSavedClasses &&
        activeClassView &&
        savedClassDistribution[activeClassView] && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden mx-2 sm:mx-4">
              <div className="bg-orange-600 dark:bg-orange-700 text-white p-3 sm:p-4 flex justify-between items-center">
                <h3 className="text-lg sm:text-xl font-bold">
                  ✏️ Edit Kelas {activeClassView} (Tersimpan)
                </h3>
                <button
                  onClick={() => setActiveClassView(null)}
                  className="text-white hover:bg-orange-700 dark:hover:bg-orange-600 rounded-full w-8 h-8 flex items-center justify-center">
                  ✕
                </button>
              </div>

              <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                <div className="mb-4 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-300">
                    <strong>Info:</strong> Perubahan akan langsung tersimpan ke
                    database. Drag & drop siswa ke kelas lain untuk memindahkan.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                      <tr>
                        <th className="p-2 text-left">No</th>
                        <th className="p-2 text-left">NIS</th>
                        <th className="p-2 text-left">Nama</th>
                        <th className="p-2 text-center">L/P</th>
                        <th className="p-2 text-left">Asal Sekolah</th>
                        {isEditModeActive && (
                          <th className="p-2 text-center">Aksi</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {savedClassDistribution[activeClassView]
                        .sort((a, b) => {
                          if (a.nis && b.nis) {
                            return a.nis.localeCompare(b.nis);
                          }
                          return a.nama_lengkap.localeCompare(b.nama_lengkap);
                        })
                        .map((student, idx) => (
                          <tr
                            key={student.id}
                            className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                            draggable={true}
                            onDragStart={(e) =>
                              handleDragStart(
                                e,
                                student,
                                activeClassView,
                                setDraggedStudent
                              )
                            }>
                            <td className="p-2">{idx + 1}</td>
                            <td className="p-2 font-mono text-xs sm:text-sm text-blue-600 dark:text-blue-400">
                              {student.nis || "-"}
                            </td>
                            <td className="p-2 font-medium dark:text-gray-100 truncate max-w-[120px] sm:max-w-none">
                              {student.nama_lengkap}
                            </td>
                            <td className="p-2 text-center">
                              <span
                                className={`px-2 py-1 rounded text-xs font-semibold ${
                                  student.jenis_kelamin === "L"
                                    ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                                    : "bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300"
                                }`}>
                                {student.jenis_kelamin}
                              </span>
                            </td>
                            <td className="p-2 text-gray-600 dark:text-gray-400 truncate max-w-[100px] sm:max-w-none">
                              {student.asal_sekolah}
                            </td>
                            <td className="p-2 text-center">
                              <select
                                onChange={(e) => {
                                  if (
                                    e.target.value &&
                                    e.target.value !== activeClassView
                                  ) {
                                    handleMoveStudentSaved(
                                      student.id,
                                      activeClassView,
                                      e.target.value,
                                      savedClassDistribution,
                                      allStudents,
                                      updateClassAssignment,
                                      setSavedClassDistribution,
                                      showToast,
                                      setIsLoading,
                                      supabase,
                                      onRefreshData
                                    );
                                    e.target.value = "";
                                  }
                                }}
                                className="text-xs border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-2 py-1 w-full">
                                <option value="">Pindah ke...</option>
                                {Object.keys(savedClassDistribution)
                                  .filter((cls) => cls !== activeClassView)
                                  .map((cls) => (
                                    <option key={cls} value={cls}>
                                      {cls}
                                    </option>
                                  ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Drop zones untuk kelas lain */}
                <div className="mt-4 sm:mt-6">
                  <h4 className="font-semibold mb-2 sm:mb-3 dark:text-gray-100">
                    Drag & Drop ke Kelas Lain:
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.keys(savedClassDistribution)
                      .filter((cls) => cls !== activeClassView)
                      .map((className) => (
                        <div
                          key={className}
                          className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-2 sm:p-3 text-center hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
                          onDragOver={(e) =>
                            handleDragOver(e, className, setDragOverClass)
                          }
                          onDragLeave={() => handleDragLeave(setDragOverClass)}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (draggedStudent) {
                              handleMoveStudentSaved(
                                draggedStudent.student.id,
                                draggedStudent.fromClass,
                                className,
                                savedClassDistribution,
                                allStudents,
                                updateClassAssignment,
                                setSavedClassDistribution,
                                showToast,
                                setIsLoading,
                                supabase,
                                onRefreshData
                              );
                              setDraggedStudent(null);
                              setDragOverClass(null);
                            }
                          }}>
                          <div className="font-bold text-blue-600 dark:text-blue-400 text-sm sm:text-base">
                            {className}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {savedClassDistribution[className].length} siswa
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Modal Detail Kelas (untuk view saja) */}
      {activeClassView &&
        currentDistribution[activeClassView] &&
        !showSavedClasses && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden mx-2 sm:mx-4">
              <div className="bg-blue-600 dark:bg-blue-700 text-white p-3 sm:p-4 flex justify-between items-center">
                <h3 className="text-lg sm:text-xl font-bold">
                  Detail Kelas {activeClassView}
                </h3>
                <button
                  onClick={() => setActiveClassView(null)}
                  className="text-white hover:bg-blue-700 dark:hover:bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center">
                  ✕
                </button>
              </div>

              <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                <div className="mb-4 grid grid-cols-3 gap-3 text-center">
                  {(() => {
                    const stats = getClassStats(
                      currentDistribution[activeClassView]
                    );
                    return (
                      <>
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2 sm:p-3">
                          <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {stats.total}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            Total Siswa
                          </div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 rounded p-2 sm:p-3">
                          <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                            {stats.males}:{stats.females}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            L : P
                          </div>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded p-2 sm:p-3">
                          <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {stats.schoolCount}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            Asal SD
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                      <tr>
                        <th className="p-2 text-left">No</th>
                        <th className="p-2 text-left">NIS</th>
                        <th className="p-2 text-left">Nama</th>
                        <th className="p-2 text-center">L/P</th>
                        <th className="p-2 text-left">Asal Sekolah</th>
                        {isEditModeActive && (
                          <th className="p-2 text-center">Aksi</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {currentDistribution[activeClassView]
                        .sort((a, b) => {
                          if (a.nis && b.nis) {
                            return a.nis.localeCompare(b.nis);
                          }
                          return a.nama_lengkap.localeCompare(b.nama_lengkap);
                        })
                        .map((student, idx) => (
                          <tr
                            key={student.id}
                            className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                            draggable={isEditModeActive}
                            onDragStart={
                              isEditModeActive
                                ? (e) =>
                                    handleDragStart(
                                      e,
                                      student,
                                      activeClassView,
                                      setDraggedStudent
                                    )
                                : undefined
                            }>
                            <td className="p-2">{idx + 1}</td>
                            <td className="p-2 font-mono text-xs sm:text-sm text-blue-600 dark:text-blue-400">
                              {student.nis || "-"}
                            </td>
                            <td className="p-2 font-medium dark:text-gray-100 truncate max-w-[120px] sm:max-w-none">
                              {student.nama_lengkap}
                            </td>
                            <td className="p-2 text-center">
                              <span
                                className={`px-2 py-1 rounded text-xs font-semibold ${
                                  student.jenis_kelamin === "L"
                                    ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                                    : "bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300"
                                }`}>
                                {student.jenis_kelamin}
                              </span>
                            </td>
                            <td className="p-2 text-gray-600 dark:text-gray-400 truncate max-w-[100px] sm:max-w-none">
                              {student.asal_sekolah}
                            </td>
                            {isEditModeActive && (
                              <td className="p-2 text-center">
                                <button
                                  onClick={() =>
                                    handleRemoveStudent(
                                      student.id,
                                      activeClassView,
                                      currentDistribution,
                                      showSavedClasses
                                        ? setSavedClassDistribution
                                        : setClassDistribution,
                                      showSavedClasses,
                                      saveToHistory,
                                      showToast,
                                      historyIndex,
                                      setHistory,
                                      setHistoryIndex
                                    )
                                  }
                                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-xs px-2 py-1"
                                  title="Keluarkan dari kelas">
                                  🗑️
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Modal Swap Siswa */}
      {showSwapModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden mx-2 sm:mx-4">
            <div className="bg-indigo-600 dark:bg-indigo-700 text-white p-3 sm:p-4 flex justify-between items-center">
              <h3 className="text-lg sm:text-xl font-bold">
                🔄 Tukar Posisi 2 Siswa
              </h3>
              <button
                onClick={() => {
                  setShowSwapModal(false);
                  setSwapStudent1(null);
                  setSwapStudent2(null);
                }}
                className="text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 rounded-full w-8 h-8 flex items-center justify-center">
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4">
                {/* Siswa 1 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Siswa 1 {swapStudent1 && `(${swapStudent1.className})`}
                  </label>
                  <select
                    value={swapStudent1 ? swapStudent1.student.uniqueId : ""}
                    onChange={(e) => {
                      if (!e.target.value) {
                        setSwapStudent1(null);
                        return;
                      }

                      const selectedStudent = getAllStudentsInDistribution(
                        currentDistribution,
                        showSavedClasses
                      );

                      if (selectedStudent) {
                        setSwapStudent1({
                          student: selectedStudent,
                          className: selectedStudent.className,
                        });
                      } else {
                        setSwapStudent1(null);
                        console.error("Student not found:", e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm sm:text-base min-h-[44px]">
                    <option value="">Pilih siswa...</option>
                    {getAllStudentsInDistribution(
                      currentDistribution,
                      showSavedClasses
                    ).map((item) => (
                      <option
                        key={item.uniqueId}
                        value={item.uniqueId}
                        disabled={
                          swapStudent2 && swapStudent2.student?.id === item.id
                        }>
                        {item.className} - {item.nama_lengkap}
                      </option>
                    ))}
                  </select>
                  {swapStudent1 && swapStudent1.student && (
                    <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded border dark:border-gray-600">
                      <div className="font-medium dark:text-gray-100">
                        {swapStudent1.student.nama_lengkap}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {swapStudent1.student.asal_sekolah}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {swapStudent1.student.jenis_kelamin === "L"
                          ? "👦 Laki-laki"
                          : "👧 Perempuan"}
                      </div>
                    </div>
                  )}
                </div>

                {/* Siswa 2 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Siswa 2 {swapStudent2 && `(${swapStudent2.className})`}
                  </label>
                  <select
                    value={swapStudent2 ? swapStudent2.student.uniqueId : ""}
                    onChange={(e) => {
                      if (!e.target.value) {
                        setSwapStudent2(null);
                        return;
                      }

                      const selectedStudent = getAllStudentsInDistribution(
                        currentDistribution,
                        showSavedClasses
                      );

                      if (selectedStudent) {
                        setSwapStudent2({
                          student: selectedStudent,
                          className: selectedStudent.className,
                        });
                      } else {
                        setSwapStudent2(null);
                        console.error("Student not found:", e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm sm:text-base min-h-[44px]">
                    <option value="">Pilih siswa...</option>
                    {getAllStudentsInDistribution(
                      currentDistribution,
                      showSavedClasses
                    ).map((item) => (
                      <option
                        key={item.uniqueId}
                        value={item.uniqueId}
                        disabled={
                          swapStudent1 && swapStudent1.student?.id === item.id
                        }>
                        {item.className} - {item.nama_lengkap}
                      </option>
                    ))}
                  </select>
                  {swapStudent2 && swapStudent2.student && (
                    <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded border dark:border-gray-600">
                      <div className="font-medium dark:text-gray-100">
                        {swapStudent2.student.nama_lengkap}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {swapStudent2.student.asal_sekolah}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {swapStudent2.student.jenis_kelamin === "L"
                          ? "👦 Laki-laki"
                          : "👧 Perempuan"}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {swapStudent1 &&
                swapStudent1.student &&
                swapStudent2 &&
                swapStudent2.student && (
                  <div className="mb-4 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="text-center text-xs sm:text-sm text-blue-800 dark:text-blue-300">
                      <strong>{swapStudent1.student.nama_lengkap}</strong> (
                      {swapStudent1.className})<span className="mx-2">⟷</span>
                      <strong>{swapStudent2.student.nama_lengkap}</strong> (
                      {swapStudent2.className})
                    </div>
                  </div>
                )}

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() =>
                    handleSwapStudents(
                      swapStudent1,
                      swapStudent2,
                      currentDistribution,
                      showSavedClasses
                        ? setSavedClassDistribution
                        : setClassDistribution,
                      showSavedClasses,
                      saveToHistory,
                      showToast,
                      setShowSwapModal,
                      setSwapStudent1,
                      setSwapStudent2,
                      setHistory,
                      setHistoryIndex,
                      historyIndex
                    )
                  }
                  disabled={
                    !swapStudent1 ||
                    !swapStudent2 ||
                    !swapStudent1.student ||
                    !swapStudent2.student
                  }
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-indigo-600 dark:bg-indigo-700 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed font-medium text-sm sm:text-base min-h-[44px]">
                  🔄 Tukar Sekarang
                </button>
                <button
                  onClick={() => {
                    setShowSwapModal(false);
                    setSwapStudent1(null);
                    setSwapStudent2(null);
                  }}
                  className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 font-medium text-sm sm:text-base min-h-[44px]">
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🚨 MODAL MERAH TRANSFER */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-lg shadow-2xl max-w-md w-full p-4 sm:p-6 text-white border-4 border-red-900 mx-2 sm:mx-4">
            <div className="text-center mb-3 sm:mb-4">
              <div className="text-4xl sm:text-6xl mb-2">🚨</div>
              <h3 className="text-xl sm:text-2xl font-black">
                PERINGATAN KRITIS!
              </h3>
            </div>

            <div className="bg-white bg-opacity-20 rounded p-3 sm:p-4 mb-4">
              <p className="font-bold text-base sm:text-lg mb-2">
                Transfer {studentsWithClass.length} Siswa ke Students?
              </p>
              <div className="text-xs sm:text-sm space-y-1 text-red-100">
                <p>⚠️ Proses TIDAK BISA DI-UNDO!</p>
                <p>⚠️ Data menjadi PERMANEN di sistem!</p>
                <p>⚠️ Pastikan pembagian kelas BENAR!</p>
              </div>
            </div>

            <p className="text-center font-semibold mb-4 text-sm sm:text-base">
              APAKAH ANDA{" "}
              <span className="text-yellow-300 font-black">YAKIN</span> INGIN
              MELANJUTKAN INI ?
            </p>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => setShowTransferModal(false)}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-bold text-sm sm:text-base min-h-[44px]">
                ❌ BATAL
              </button>
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  transferToStudents(
                    allStudents,
                    supabase,
                    setIsLoading,
                    showToast,
                    getCurrentAcademicYear,
                    onRefreshData
                  );
                }}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-yellow-500 hover:bg-yellow-600 text-gray-900 rounded-lg font-black text-sm sm:text-base min-h-[44px]">
                ✅ YA, YAKIN!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {(isLoading || isExporting) && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-xl">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
            <p className="mt-3 sm:mt-4 text-gray-600 dark:text-gray-300 font-medium text-sm sm:text-base">
              {isExporting ? "Exporting Excel..." : "Memproses..."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassDivision;
