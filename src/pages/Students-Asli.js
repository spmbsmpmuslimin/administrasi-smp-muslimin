// pages/DataSiswa.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../supabaseClient";
import { DataExcel } from "./DataExcel";
import { Edit2, Trash2, X, Save } from "lucide-react";

export const Students = () => {
  const [siswaData, setSiswaData] = useState([]);
  const [allSiswaData, setAllSiswaData] = useState([]);
  const [kelasOptions, setKelasOptions] = useState([]);
  const [allKelasOptions, setAllKelasOptions] = useState([]);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJenjang, setSelectedJenjang] = useState("");
  const [selectedKelas, setSelectedKelas] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const [availableJenjang, setAvailableJenjang] = useState([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // ✅ NEW: States untuk Edit/Delete
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editForm, setEditForm] = useState({
    nis: "",
    full_name: "",
    gender: "L",
    class_id: "",
  });
  const [actionLoading, setActionLoading] = useState(false);

  // ✅ NEW: Get current user
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("userSession"));
    setCurrentUser(userData);
    console.log("📌 Current User:", userData);
  }, []);

  // ✅ FIX: Check if user is homeroom teacher AND viewing their own class
  const isHomeroomTeacher = useMemo(() => {
    return (
      currentUser?.role === "teacher" &&
      currentUser?.homeroom_class_id &&
      selectedKelas === currentUser?.homeroom_class_id
    );
  }, [currentUser, selectedKelas]);

  // ✅ Alias biar konsisten
  const homeroomTeacherMemo = isHomeroomTeacher;

  useEffect(() => {
    console.log("🔍 isHomeroomTeacher:", isHomeroomTeacher);
    console.log("📋 Selected Kelas:", selectedKelas);
    console.log("🏠 Homeroom Class:", currentUser?.homeroom_class_id);
  }, [isHomeroomTeacher, selectedKelas, currentUser]);

  // ✅ DARK MODE SYNC
  useEffect(() => {
    const checkDarkMode = () => {
      const htmlHasDark = document.documentElement.classList.contains("dark");
      const savedTheme = localStorage.getItem("theme");
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;

      const shouldBeDark =
        htmlHasDark || savedTheme === "dark" || (!savedTheme && prefersDark);

      setIsDarkMode(shouldBeDark);
      if (shouldBeDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    fetchStudents();
    fetchKelasOptions();
    fetchTeacherAssignments();
  }, []);

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from("students")
        .select("*")
        .eq("is_active", true)
        .order("full_name", { ascending: true })
        .order("class_id", { ascending: true });

      const { data, error } = await query;
      if (error) throw error;
      setAllSiswaData(data || []);
    } catch (error) {
      console.error("Error fetching siswa data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchKelasOptions = async () => {
    try {
      const { data, error } = await supabase
        .from("classes")
        .select("id")
        .order("id", { ascending: true });

      if (error) throw error;
      setAllKelasOptions(data.map((item) => item.id) || []);
    } catch (error) {
      console.error("Error fetching kelas options:", error);
    }
  };

  const fetchTeacherAssignments = async () => {
    try {
      console.log("🚀 START fetchTeacherAssignments");

      const currentUser = JSON.parse(localStorage.getItem("userSession"));
      console.log("🔍 localStorage.userSession:", currentUser);

      if (!currentUser) {
        console.error("❌ User not found in localStorage.userSession");
        setTeacherClasses([]);
        return;
      }

      console.log("✅ Current User:", currentUser);
      console.log("👤 User ID:", currentUser.id);
      console.log("🎯 Teacher ID:", currentUser.teacher_id);
      console.log("👩‍🏫 Role:", currentUser.role);

      if (currentUser.role === "admin") {
        console.log("👑 Admin user - will see all data");
        setTeacherClasses([]);
        return;
      }

      if (!currentUser.teacher_id) {
        console.log("⚠️ User is not a teacher (no teacher_id)");
        setTeacherClasses([]);
        return;
      }

      console.log(
        "🔍 Fetching assignments for teacher_id:",
        currentUser.teacher_id
      );
      const { data: assignments, error: assignError } = await supabase
        .from("teacher_assignments")
        .select("class_id")
        .eq("teacher_id", currentUser.teacher_id);

      if (assignError) {
        console.error("❌ Error fetching assignments:", assignError);
        setTeacherClasses([]);
        return;
      }

      console.log("📊 Assignments Data:", assignments);

      const classIds = [...new Set(assignments.map((a) => a.class_id))]
        .filter(Boolean)
        .sort();

      console.log("✅ UNIQUE Teacher Classes:", classIds);
      console.log("📈 Total Unique Classes:", classIds.length);

      setTeacherClasses(classIds);
    } catch (error) {
      console.error("💥 CATCH Error in fetchTeacherAssignments:", error);
      setTeacherClasses([]);
    }
  };

  useEffect(() => {
    if (teacherClasses.length > 0) {
      const filteredSiswa = allSiswaData.filter((siswa) =>
        teacherClasses.includes(siswa.class_id)
      );
      setSiswaData(filteredSiswa);

      const filteredKelas = allKelasOptions.filter((kelas) =>
        teacherClasses.includes(kelas)
      );
      setKelasOptions(filteredKelas);

      const jenjangSet = new Set(
        filteredKelas
          .map((kelas) => kelas?.charAt(0))
          .filter((j) => ["7", "8", "9"].includes(j))
      );
      const jenjangArray = Array.from(jenjangSet).sort();
      setAvailableJenjang(jenjangArray);

      console.log("🎯 Teacher Classes:", teacherClasses);
      console.log("📚 Filtered Kelas:", filteredKelas);
      console.log("📊 Available Jenjang:", jenjangArray);
    } else {
      setSiswaData(allSiswaData);
      setKelasOptions(allKelasOptions);

      const jenjangSet = new Set(
        allKelasOptions
          .map((kelas) => kelas?.charAt(0))
          .filter((j) => ["7", "8", "9"].includes(j))
      );
      setAvailableJenjang(Array.from(jenjangSet).sort());
    }
  }, [teacherClasses, allSiswaData, allKelasOptions]);

  // ✅ NEW: Handle Edit Student
  const handleEditClick = (siswa) => {
    setSelectedStudent(siswa);
    setEditForm({
      nis: siswa.nis,
      full_name: siswa.full_name,
      gender: siswa.gender,
      class_id: siswa.class_id,
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const { error } = await supabase
        .from("students")
        .update({
          nis: editForm.nis,
          full_name: editForm.full_name,
          gender: editForm.gender,
          class_id: editForm.class_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedStudent.id);

      if (error) throw error;

      alert("✅ Data siswa berhasil diupdate!");
      setShowEditModal(false);
      fetchStudents();
    } catch (error) {
      console.error("Error updating student:", error);
      alert("❌ Gagal mengupdate data siswa: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ✅ NEW: Handle Delete Student
  const handleDeleteClick = (siswa) => {
    setSelectedStudent(siswa);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    setActionLoading(true);

    try {
      // ✅ SOFT DELETE: Update is_active to false instead of deleting
      const { error } = await supabase
        .from("students")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedStudent.id);

      if (error) throw error;

      alert("✅ Data siswa berhasil dinonaktifkan!");
      setShowDeleteModal(false);
      fetchStudents();
    } catch (error) {
      console.error("Error deactivating student:", error);
      alert("❌ Gagal menonaktifkan data siswa: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportAll = async () => {
    setExportLoading(true);
    try {
      await DataExcel.exportAllStudents(siswaData);
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setExportLoading(false);
      setShowExportModal(false);
    }
  };

  const handleExportByJenjang = async (jenjang) => {
    setExportLoading(true);
    try {
      await DataExcel.exportByJenjang(siswaData, jenjang);
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setExportLoading(false);
      setShowExportModal(false);
    }
  };

  const handleExportByKelas = async (kelas) => {
    setExportLoading(true);
    try {
      await DataExcel.exportByKelas(siswaData, kelas);
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setExportLoading(false);
      setShowExportModal(false);
    }
  };

  const handleExportByFilter = async () => {
    setExportLoading(true);
    try {
      await DataExcel.exportByFilter(
        filteredData,
        selectedKelas,
        selectedJenjang,
        selectedGender
      );
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setExportLoading(false);
      setShowExportModal(false);
    }
  };

  const filteredKelasOptions = selectedJenjang
    ? kelasOptions.filter((kelas) => kelas.startsWith(selectedJenjang))
    : kelasOptions;

  const filteredData = siswaData.filter((siswa) => {
    const matchesSearch =
      siswa.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      siswa.nis?.toString().includes(searchTerm);
    const matchesJenjang = selectedJenjang
      ? siswa.class_id?.startsWith(selectedJenjang)
      : true;
    const matchesKelas = selectedKelas
      ? siswa.class_id === selectedKelas
      : true;
    const matchesGender = selectedGender
      ? siswa.gender === selectedGender
      : true;

    return matchesSearch && matchesJenjang && matchesKelas && matchesGender;
  });

  const handleJenjangChange = (e) => {
    setSelectedJenjang(e.target.value);
    setSelectedKelas("");
  };

  // ✅ NEW: Edit Modal Component
  const EditModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 p-5 rounded-t-2xl flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Edit2 size={24} className="text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Edit Data Siswa</h2>
              <p className="text-blue-100 text-sm">
                Kelas {selectedStudent?.class_id}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowEditModal(false)}
            disabled={actionLoading}
            className="p-2 hover:bg-blue-700 dark:hover:bg-blue-600 rounded-lg transition-colors">
            <X size={20} className="text-white" />
          </button>
        </div>

        <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              NIS *
            </label>
            <input
              type="text"
              value={editForm.nis}
              onChange={(e) =>
                setEditForm({ ...editForm, nis: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Nama Lengkap *
            </label>
            <input
              type="text"
              value={editForm.full_name}
              onChange={(e) =>
                setEditForm({ ...editForm, full_name: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Jenis Kelamin *
            </label>
            <select
              value={editForm.gender}
              onChange={(e) =>
                setEditForm({ ...editForm, gender: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Kelas *
            </label>
            <select
              value={editForm.class_id}
              onChange={(e) =>
                setEditForm({ ...editForm, class_id: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required>
              <option value="">Pilih Kelas</option>
              {allKelasOptions.map((kelas) => (
                <option key={kelas} value={kelas}>
                  {kelas}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={actionLoading}
              className="flex-1 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {actionLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              disabled={actionLoading}
              className="px-5 py-3 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-400 dark:hover:bg-gray-700 font-semibold transition-all shadow-md disabled:opacity-50">
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // ✅ NEW: Delete Modal Component
  const DeleteModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="bg-gradient-to-r from-red-600 to-red-700 dark:from-red-700 dark:to-red-800 p-5 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Trash2 size={24} className="text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Konfirmasi Hapus</h2>
              <p className="text-red-100 text-sm">Data akan dihapus permanen</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-gray-700 dark:text-gray-300 mb-2">
            Apakah Anda yakin ingin menghapus siswa:
          </p>
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800 mb-6">
            <p className="font-bold text-red-800 dark:text-red-300 text-lg">
              {selectedStudent?.full_name}
            </p>
            <p className="text-sm text-red-600 dark:text-red-400">
              NIS: {selectedStudent?.nis} | Kelas: {selectedStudent?.class_id}
            </p>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400 mb-6 font-medium">
            ⚠️ Tindakan ini tidak dapat dibatalkan!
          </p>

          <div className="flex gap-3">
            <button
              onClick={handleDeleteConfirm}
              disabled={actionLoading}
              className="flex-1 px-5 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {actionLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Menghapus...</span>
                </>
              ) : (
                <>
                  <Trash2 size={18} />
                  <span>Ya, Hapus</span>
                </>
              )}
            </button>
            <button
              onClick={() => setShowDeleteModal(false)}
              disabled={actionLoading}
              className="px-5 py-3 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-400 dark:hover:bg-gray-700 font-semibold transition-all shadow-md disabled:opacity-50">
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const ExportModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-3 sm:p-4 md:p-6 touch-manipulation">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-3 sm:mx-4 transition-colors duration-200">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-gray-700 dark:to-gray-800 p-4 sm:p-5 md:p-6 rounded-t-xl">
          <h2 className="text-lg sm:text-xl font-bold text-white text-center">
            📊 Export Data Siswa
          </h2>
          <p className="text-blue-100 dark:text-gray-300 text-center text-xs sm:text-sm mt-1">
            Pilih jenis export yang diinginkan
          </p>
        </div>

        <div className="p-4 sm:p-5 md:p-6 space-y-3 sm:space-y-4">
          <button
            onClick={handleExportAll}
            disabled={exportLoading || siswaData.length === 0}
            className={`w-full p-3 sm:p-4 rounded-lg border-2 transition-all flex items-center justify-between touch-manipulation min-h-[60px] sm:min-h-[70px] ${
              exportLoading || siswaData.length === 0
                ? "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                : "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:border-blue-300 dark:hover:border-blue-600"
            }`}>
            <div className="text-left">
              <div className="font-semibold text-sm sm:text-base">
                Export Semua Data
              </div>
              <div className="text-xs sm:text-sm opacity-75">
                {siswaData.length} siswa (kelas saya)
              </div>
            </div>
            <div className="text-xl sm:text-2xl">📋</div>
          </button>

          <button
            onClick={handleExportByFilter}
            disabled={exportLoading || filteredData.length === 0}
            className={`w-full p-3 sm:p-4 rounded-lg border-2 transition-all flex items-center justify-between touch-manipulation min-h-[60px] sm:min-h-[70px] ${
              exportLoading || filteredData.length === 0
                ? "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                : "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50 hover:border-green-300 dark:hover:border-green-600"
            }`}>
            <div className="text-left">
              <div className="font-semibold text-sm sm:text-base">
                Export Hasil Filter
              </div>
              <div className="text-xs sm:text-sm opacity-75">
                {filteredData.length} siswa
                {(selectedJenjang || selectedKelas || selectedGender) &&
                  ` • ${selectedJenjang ? `Kelas ${selectedJenjang}` : ""} ${
                    selectedKelas ? selectedKelas : ""
                  } ${
                    selectedGender
                      ? `• ${
                          selectedGender === "L" ? "Laki-laki" : "Perempuan"
                        }`
                      : ""
                  }`}
              </div>
            </div>
            <div className="text-xl sm:text-2xl">🎯</div>
          </button>

          {availableJenjang.length > 0 && (
            <div className="space-y-2">
              <div className="font-semibold text-gray-700 dark:text-gray-300 text-xs sm:text-sm">
                Export Per Jenjang:
              </div>
              <div className="grid grid-cols-3 gap-2">
                {availableJenjang.map((jenjang) => {
                  const count = siswaData.filter((s) =>
                    s.class_id?.startsWith(jenjang)
                  ).length;
                  return (
                    <button
                      key={jenjang}
                      onClick={() => handleExportByJenjang(jenjang)}
                      disabled={exportLoading || count === 0}
                      className={`p-3 rounded-lg border transition-all touch-manipulation ${
                        exportLoading || count === 0
                          ? "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                          : "bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/50 hover:border-orange-300 dark:hover:border-orange-600"
                      }`}>
                      <div className="font-semibold text-sm">
                        Kelas {jenjang}
                      </div>
                      <div className="text-xs opacity-75">{count} siswa</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="font-semibold text-gray-700 dark:text-gray-300 text-xs sm:text-sm">
              Export Per Kelas:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-32 sm:max-h-40 overflow-y-auto">
              {kelasOptions.map((kelas) => {
                const count = siswaData.filter(
                  (s) => s.class_id === kelas
                ).length;
                return (
                  <button
                    key={kelas}
                    onClick={() => handleExportByKelas(kelas)}
                    disabled={exportLoading || count === 0}
                    className={`p-3 rounded-lg border transition-all text-left touch-manipulation ${
                      exportLoading || count === 0
                        ? "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                        : "bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 hover:border-purple-300 dark:hover:border-purple-600"
                    }`}>
                    <div className="font-semibold text-sm">{kelas}</div>
                    <div className="text-xs opacity-75">{count} siswa</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 p-3 sm:p-4 flex justify-end">
          <button
            onClick={() => setShowExportModal(false)}
            disabled={exportLoading}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium disabled:opacity-50 text-sm sm:text-base touch-manipulation">
            {exportLoading ? "Mengexport..." : "Tutup"}
          </button>
        </div>

        {exportLoading && (
          <div className="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-80 dark:bg-opacity-80 flex items-center justify-center rounded-xl">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 dark:border-blue-400 mb-2"></div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Sedang mengexport data...
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen p-3 sm:p-4 md:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 dark:text-white">
            Data Siswa
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            Memuat data siswa...
          </p>
        </div>
        <div className="flex justify-center items-center h-48 sm:h-64">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {showExportModal && <ExportModal />}
      {showEditModal && <EditModal />}
      {showDeleteModal && <DeleteModal />}

      <div className="mb-4 sm:mb-6">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 dark:text-white">
          Data Siswa
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-300">
          Manajemen Data Siswa SMP Muslimin Cililin
        </p>
      </div>

      {/* ✅ INFO BANNER: Wali Kelas Mode */}
      {homeroomTeacherMemo && (
        <div className="mb-4 sm:mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600 dark:bg-green-700 rounded-lg flex items-center justify-center flex-shrink-0">
              <Edit2 className="text-white" size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-green-800 dark:text-green-300">
                🏠 Mode Wali Kelas Aktif
              </p>
              <p className="text-xs text-green-700 dark:text-green-400">
                Anda dapat menambah, mengedit dan menonaktifkan data siswa di
                kelas {currentUser?.homeroom_class_id}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ✅ STATS CARD - CONDITIONAL UNTUK WALI KELAS VS ADMIN */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
        {homeroomTeacherMemo ? (
          // STATS UNTUK WALI KELAS (HANYA KELAS MEREKA)
          <>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/30 p-3 sm:p-4 rounded-lg border border-blue-200 dark:border-blue-700 shadow-sm">
              <div className="text-blue-600 dark:text-blue-400 text-xs font-semibold mb-1">
                Kelas Anda
              </div>
              <div className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-300">
                {currentUser?.homeroom_class_id}
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/30 p-3 sm:p-4 rounded-lg border border-purple-200 dark:border-purple-700 shadow-sm">
              <div className="text-purple-600 dark:text-purple-400 text-xs font-semibold mb-1">
                Total Siswa
              </div>
              <div className="text-xl sm:text-2xl font-bold text-purple-700 dark:text-purple-300">
                {
                  siswaData.filter(
                    (s) => s.class_id === currentUser?.homeroom_class_id
                  ).length
                }
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/30 p-3 sm:p-4 rounded-lg border border-green-200 dark:border-green-700 shadow-sm">
              <div className="text-green-600 dark:text-green-400 text-xs font-semibold mb-1">
                Laki-laki
              </div>
              <div className="text-xl sm:text-2xl font-bold text-green-700 dark:text-green-300">
                {
                  siswaData.filter(
                    (s) =>
                      s.class_id === currentUser?.homeroom_class_id &&
                      s.gender === "L"
                  ).length
                }
              </div>
            </div>

            <div className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/30 p-3 sm:p-4 rounded-lg border border-pink-200 dark:border-pink-700 shadow-sm">
              <div className="text-pink-600 dark:text-pink-400 text-xs font-semibold mb-1">
                Perempuan
              </div>
              <div className="text-xl sm:text-2xl font-bold text-pink-700 dark:text-pink-300">
                {
                  siswaData.filter(
                    (s) =>
                      s.class_id === currentUser?.homeroom_class_id &&
                      s.gender === "P"
                  ).length
                }
              </div>
            </div>
          </>
        ) : (
          // STATS UNTUK ADMIN/GURU BIASA (SEMUA DATA)
          <>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/30 p-3 sm:p-4 rounded-lg border border-blue-200 dark:border-blue-700 shadow-sm">
              <div className="text-blue-600 dark:text-blue-400 text-xs font-semibold mb-1">
                Total Kelas
              </div>
              <div className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-300">
                {kelasOptions.length}
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/30 p-3 sm:p-4 rounded-lg border border-purple-200 dark:border-purple-700 shadow-sm">
              <div className="text-purple-600 dark:text-purple-400 text-xs font-semibold mb-1">
                Total Siswa
              </div>
              <div className="text-xl sm:text-2xl font-bold text-purple-700 dark:text-purple-300">
                {siswaData.length}
              </div>
            </div>

            {availableJenjang.includes("7") && (
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/30 p-3 sm:p-4 rounded-lg border border-green-200 dark:border-green-700 shadow-sm">
                <div className="text-green-600 dark:text-green-400 text-xs font-semibold mb-1">
                  Kelas 7
                </div>
                <div className="text-xl sm:text-2xl font-bold text-green-700 dark:text-green-300">
                  {siswaData.filter((s) => s.class_id?.startsWith("7")).length}
                </div>
              </div>
            )}

            {availableJenjang.includes("8") && (
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/30 p-3 sm:p-4 rounded-lg border border-yellow-200 dark:border-yellow-700 shadow-sm">
                <div className="text-yellow-600 dark:text-yellow-400 text-xs font-semibold mb-1">
                  Kelas 8
                </div>
                <div className="text-xl sm:text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                  {siswaData.filter((s) => s.class_id?.startsWith("8")).length}
                </div>
              </div>
            )}

            {availableJenjang.includes("9") && (
              <div className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/30 p-3 sm:p-4 rounded-lg border border-pink-200 dark:border-pink-700 shadow-sm">
                <div className="text-pink-600 dark:text-pink-400 text-xs font-semibold mb-1">
                  Kelas 9
                </div>
                <div className="text-xl sm:text-2xl font-bold text-pink-700 dark:text-pink-300">
                  {siswaData.filter((s) => s.class_id?.startsWith("9")).length}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 md:p-6 rounded-xl shadow-sm mb-4 sm:mb-6 transition-colors duration-200">
        <div className="flex flex-col md:flex-row gap-2 sm:gap-3 md:gap-4 items-center">
          <div className="flex-1 md:flex-[2] w-full">
            <input
              type="text"
              placeholder="Cari siswa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-xs sm:text-sm md:text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white touch-manipulation"
            />
          </div>

          <div className="flex-1 w-full">
            <select
              value={selectedJenjang}
              onChange={handleJenjangChange}
              disabled={availableJenjang.length === 0}
              className={`w-full p-2 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-xs sm:text-sm md:text-base touch-manipulation ${
                availableJenjang.length === 0
                  ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-70 text-gray-500 dark:text-gray-400"
                  : "bg-white dark:bg-gray-700 cursor-pointer text-gray-900 dark:text-white"
              }`}>
              <option value="">Semua Jenjang</option>
              {availableJenjang.map((jenjang) => (
                <option key={jenjang} value={jenjang}>
                  Kelas {jenjang}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 w-full">
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              disabled={!selectedJenjang}
              className={`w-full p-2 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-xs sm:text-sm md:text-base touch-manipulation ${
                !selectedJenjang
                  ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-70 text-gray-500 dark:text-gray-400"
                  : "bg-white dark:bg-gray-700 cursor-pointer text-gray-900 dark:text-white"
              }`}>
              <option value="">Semua Kelas</option>
              {filteredKelasOptions.map((kelas) => (
                <option key={kelas} value={kelas}>
                  {kelas}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 w-full">
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="w-full p-2 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 cursor-pointer transition text-xs sm:text-sm md:text-base text-gray-900 dark:text-white touch-manipulation">
              <option value="">Semua Jenis Kelamin</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>

          <div className="flex-1 w-full">
            <button
              onClick={() => setShowExportModal(true)}
              disabled={siswaData.length === 0}
              className={`w-full p-2 sm:p-3 rounded-lg font-semibold transition flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm md:text-base touch-manipulation min-h-[44px] sm:min-h-[48px] ${
                siswaData.length === 0
                  ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  : "bg-green-600 dark:bg-green-700 text-white hover:bg-green-700 dark:hover:bg-green-600 shadow-md hover:shadow-lg"
              }`}>
              <span className="text-sm sm:text-base">📊</span>
              <span>Export Excel</span>
            </button>
          </div>
        </div>
      </div>

      {(selectedJenjang || selectedKelas || searchTerm || selectedGender) && (
        <div className="mb-4 sm:mb-6 p-2 sm:p-3 md:p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-100 dark:border-blue-700 text-xs sm:text-sm md:text-base inline-block">
          Menampilkan{" "}
          <strong className="text-blue-700 dark:text-blue-300">
            {filteredData.length} Siswa
          </strong>
          {searchTerm && ` dengan kata kunci "${searchTerm}"`}
          {selectedKelas && ` Di Kelas ${selectedKelas}`}
          {selectedGender &&
            ` ${selectedGender === "L" ? "Laki-laki" : "Perempuan"}`}
        </div>
      )}

      {/* ✅ MOBILE VIEW - With Actions for Homeroom Teacher */}
      <div className="md:hidden space-y-2 sm:space-y-3">
        {filteredData.length > 0 ? (
          filteredData.map((siswa, index) => (
            <div
              key={siswa.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-3 sm:p-4 border border-gray-100 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-gray-900 transition-all duration-300 touch-manipulation">
              <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-700 pb-2 sm:pb-3 mb-2 sm:mb-3">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    No. {index + 1} | Kelas:{" "}
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {siswa.class_id}
                    </span>
                  </p>
                  <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">
                    {siswa.full_name}
                  </p>
                </div>
                <div className="flex-shrink-0 ml-2">
                  <span
                    className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
                      siswa.is_active
                        ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    }`}>
                    {siswa.is_active ? "Aktif" : "Non-Aktif"}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    NIS:
                  </span>
                  <span className="font-mono text-gray-900 dark:text-gray-200">
                    {siswa.nis}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    Jenis Kelamin:
                  </span>
                  <span className="text-gray-900 dark:text-gray-200">
                    {siswa.gender === "L" ? "Laki-laki" : "Perempuan"}
                  </span>
                </div>
              </div>

              {/* ✅ ACTIONS for Homeroom Teacher (Mobile) */}
              {isHomeroomTeacher && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                  <button
                    onClick={() => handleEditClick(siswa)}
                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 shadow-sm">
                    <Edit2 size={14} />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteClick(siswa)}
                    className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 shadow-sm">
                    <Trash2 size={14} />
                    <span>Hapus</span>
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="p-8 sm:p-12 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <svg
              className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400 dark:text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              Tidak ada data siswa
            </p>
            <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {searchTerm || selectedJenjang || selectedKelas || selectedGender
                ? "Siswa tidak ditemukan sesuai filter."
                : "Belum ada data siswa di sistem."}
            </p>
          </div>
        )}
      </div>

      {/* ✅ DESKTOP VIEW - With Actions for Homeroom Teacher */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700 transition-colors duration-200">
        <div className="overflow-x-auto">
          {filteredData.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-gray-700 dark:to-gray-800 text-white">
                <tr>
                  <th className="px-3 sm:px-4 md:px-6 py-3 text-left w-1/12 text-xs md:text-sm uppercase tracking-wider text-center">
                    No.
                  </th>
                  <th className="px-3 sm:px-4 md:px-6 py-3 text-left w-2/12 text-xs md:text-sm uppercase tracking-wider">
                    NIS
                  </th>
                  <th className="px-3 sm:px-4 md:px-6 py-3 text-left w-3/12 text-xs md:text-sm uppercase tracking-wider">
                    Nama
                  </th>
                  <th className="px-3 sm:px-4 md:px-6 py-3 text-left w-1/12 text-xs md:text-sm uppercase tracking-wider">
                    Kelas
                  </th>
                  <th className="px-3 sm:px-4 md:px-6 py-3 text-left w-2/12 text-xs md:text-sm uppercase tracking-wider">
                    Jenis Kelamin
                  </th>
                  <th className="px-3 sm:px-4 md:px-6 py-3 text-left w-1/12 text-xs md:text-sm uppercase tracking-wider text-center">
                    Status
                  </th>
                  {/* ✅ CONDITIONAL: Show Aksi column only for homeroom teacher */}
                  {isHomeroomTeacher && (
                    <th className="px-3 sm:px-4 md:px-6 py-3 text-left w-2/12 text-xs md:text-sm uppercase tracking-wider text-center">
                      Aksi
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredData.map((siswa, index) => (
                  <tr
                    key={siswa.id}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-3 sm:px-4 md:px-6 py-3 text-center text-xs md:text-sm text-gray-700 dark:text-gray-300">
                      {index + 1}
                    </td>
                    <td className="px-3 sm:px-4 md:px-6 py-3 font-mono text-xs md:text-sm text-gray-900 dark:text-white">
                      {siswa.nis}
                    </td>
                    <td className="px-3 sm:px-4 md:px-6 py-3 font-medium text-xs md:text-sm text-gray-900 dark:text-white">
                      {siswa.full_name}
                    </td>
                    <td className="px-3 sm:px-4 md:px-6 py-3 font-semibold text-xs md:text-sm text-gray-900 dark:text-white">
                      {siswa.class_id}
                    </td>
                    <td className="px-3 sm:px-4 md:px-6 py-3 text-xs md:text-sm text-gray-700 dark:text-gray-300">
                      {siswa.gender === "L" ? "Laki-laki" : "Perempuan"}
                    </td>
                    <td className="px-3 sm:px-4 md:px-6 py-3 text-center">
                      <span
                        className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
                          siswa.is_active
                            ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                        }`}>
                        {siswa.is_active ? "Aktif" : "Non-Aktif"}
                      </span>
                    </td>
                    {/* ✅ CONDITIONAL: Show actions only for homeroom teacher */}
                    {isHomeroomTeacher && (
                      <td className="px-3 sm:px-4 md:px-6 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditClick(siswa)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            title="Edit Siswa">
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(siswa)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Hapus Siswa">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                Tidak ada data siswa
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {searchTerm ||
                selectedJenjang ||
                selectedKelas ||
                selectedGender
                  ? "Siswa tidak ditemukan sesuai filter."
                  : "Belum ada data siswa di sistem."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Students;
