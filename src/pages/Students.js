// pages/DataSiswa.js
import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabaseClient";
import { getActiveAcademicYear } from "../services/academicYearService";
import { DataExcel } from "./DataExcel";
import {
  Edit2,
  Trash2,
  X,
  Save,
  Users,
  GraduationCap,
  User,
  UserCheck,
} from "lucide-react";

export const Students = ({ user: userFromProps, onShowToast, darkMode }) => {
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
  const PAGE_SIZE = 30;
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);
  const [availableJenjang, setAvailableJenjang] = useState([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
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

  const [currentUser, setCurrentUser] = useState(null);

  // Fetch user data dari database untuk dapetin teacher_id dan homeroom_class_id
  useEffect(() => {
    const fetchUserDetails = async () => {
      console.log("👤 User from props:", userFromProps);

      if (!userFromProps?.id) {
        console.log("❌ No user from props");
        setCurrentUser(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, role, teacher_id, homeroom_class_id")
          .eq("id", userFromProps.id)
          .single();

        if (error) {
          console.error("❌ Error fetching user details:", error);
          setCurrentUser(userFromProps);
          return;
        }

        console.log("✅ User details fetched:", data);
        setCurrentUser(data);
      } catch (error) {
        console.error("❌ Error in fetchUserDetails:", error);
        setCurrentUser(userFromProps);
      }
    };

    fetchUserDetails();
  }, [userFromProps]);

  const canEditDelete = useMemo(() => {
    console.log("🔧 canEditDelete calculation - currentUser:", currentUser);

    if (!currentUser) {
      console.log("❌ No currentUser");
      return false;
    }

    // Admin bisa edit/hapus semua
    if (currentUser?.role === "admin") {
      console.log("✅ User is admin");
      return true;
    }

    // Wali kelas hanya bisa edit/hapus siswa di kelasnya
    if (currentUser?.role === "teacher" && currentUser?.homeroom_class_id) {
      const canEdit = selectedKelas === currentUser?.homeroom_class_id;
      console.log("👨‍🏫 Teacher can edit:", canEdit);
      return canEdit;
    }

    console.log("❌ User cannot edit/delete");
    return false;
  }, [currentUser, selectedKelas]);

  const canEditDeleteMemo = canEditDelete;

  useEffect(() => {
    console.log("🔐 canEditDelete:", canEditDelete);
    console.log("👤 User Role:", currentUser?.role);
    console.log("📋 Selected Kelas:", selectedKelas);
    console.log("🏠 Homeroom Class:", currentUser?.homeroom_class_id);
  }, [canEditDelete, selectedKelas, currentUser]);

  // Fetch students dan kelas options saat component mount
  useEffect(() => {
    fetchStudents();
    fetchKelasOptions();
  }, []);

  // Fetch teacher assignments setelah currentUser ready
  useEffect(() => {
    if (currentUser) {
      console.log("✅ Current user loaded, fetching teacher assignments...");
      fetchTeacherAssignments();
    }
  }, [currentUser]);

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
      console.log("👤 Current User from state:", currentUser);

      if (!currentUser) {
        console.log("🔴 No current user found in state");
        setTeacherClasses([]);
        return;
      }

      if (currentUser.role === "admin") {
        console.log("👑 User is admin - showing all classes");
        setTeacherClasses([]);
        return;
      }

      if (!currentUser.teacher_id) {
        console.log("🔴 No teacher_id found for user:", currentUser);
        setTeacherClasses([]);
        return;
      }

      console.log(
        "👨‍🏫 Fetching assignments for teacher_id:",
        currentUser.teacher_id,
      );

      // Step 1: Ambil academic year yang aktif (via service - udah nanganin
      // kasus 2 tahun ajaran ke-mark aktif bersamaan, auto-fix ke yang paling
      // baru, jadi gak perlu Try 1/Try 2 manual lagi di sini)
      const activeYear = await getActiveAcademicYear();

      if (!activeYear) {
        console.log("⚠️ No active academic year found");
        console.log(
          "💡 Tip: Make sure there's a record with is_active = true in academic_years table",
        );
        setTeacherClasses([]);
        return;
      }

      console.log("📅 Active academic year:", activeYear);

      // Step 2: Ambil assignments berdasarkan teacher_id dan academic_year_id yang aktif
      const { data: assignments, error: assignError } = await supabase
        .from("teacher_assignments")
        .select("*")
        .eq("teacher_id", currentUser.teacher_id)
        .eq("academic_year_id", activeYear.activeSemesterId);

      if (assignError) {
        console.error("❌ Error fetching assignments:", assignError);
        setTeacherClasses([]);
        return;
      }

      console.log("📋 Raw assignments data (ALL COLUMNS):", assignments);

      if (!assignments || assignments.length === 0) {
        console.log(
          "⚠️ No assignments found for teacher_id:",
          currentUser.teacher_id,
          "in academic_year_id:",
          activeYear.activeSemesterId,
        );
        setTeacherClasses([]);
        return;
      }

      const classIds = [...new Set(assignments.map((a) => a.class_id))]
        .filter(Boolean)
        .sort();

      console.log("✅ Unique class IDs extracted:", classIds);

      setTeacherClasses(classIds);
    } catch (error) {
      console.error("💥 CATCH Error in fetchTeacherAssignments:", error);
      setTeacherClasses([]);
    }
  };

  useEffect(() => {
    console.log("🔄 useEffect triggered");
    console.log("📊 teacherClasses:", teacherClasses);
    console.log("📚 allSiswaData length:", allSiswaData.length);
    console.log("🎓 allKelasOptions:", allKelasOptions);

    if (teacherClasses.length > 0) {
      const filteredSiswa = allSiswaData.filter((siswa) =>
        teacherClasses.includes(siswa.class_id),
      );
      setSiswaData(filteredSiswa);

      console.log("✅ Filtered Siswa length:", filteredSiswa.length);

      const filteredKelas = allKelasOptions.filter((kelas) =>
        teacherClasses.includes(kelas),
      );
      setKelasOptions(filteredKelas);

      console.log("🎯 Filtered Kelas:", filteredKelas);

      const jenjangSet = new Set(
        filteredKelas
          .map((kelas) => kelas?.charAt(0))
          .filter((j) => ["7", "8", "9"].includes(j)),
      );
      const jenjangArray = Array.from(jenjangSet).sort();

      console.log("📚 Available Jenjang:", jenjangArray);

      setAvailableJenjang(jenjangArray);
    } else {
      console.log(
        "⚪ No teacher classes - showing all data (Admin atau teacherClasses empty)",
      );
      setSiswaData(allSiswaData);
      setKelasOptions(allKelasOptions);

      const jenjangSet = new Set(
        allKelasOptions
          .map((kelas) => kelas?.charAt(0))
          .filter((j) => ["7", "8", "9"].includes(j)),
      );
      setAvailableJenjang(Array.from(jenjangSet).sort());
    }
  }, [teacherClasses, allSiswaData, allKelasOptions]);

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

  const handleDeleteClick = (siswa) => {
    setSelectedStudent(siswa);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    setActionLoading(true);

    try {
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
        selectedGender,
      );
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setExportLoading(false);
      setShowExportModal(false);
    }
  };

  const filteredKelasOptions = useMemo(() => {
    return selectedJenjang
      ? kelasOptions.filter((kelas) => kelas.startsWith(selectedJenjang))
      : kelasOptions;
  }, [selectedJenjang, kelasOptions]);

  // ✅ UPDATED: Kalau belum ada pencarian/filter sama sekali, tampilkan SEMUA siswa
  // (nanti dipotong ke 30 pertama lewat visibleData + tombol "Muat Lebih Banyak").
  // Kalau ada pencarian dan/atau filter Jenjang/Kelas/Gender, itu dipakai buat mempersempit hasil.
  const hasSearch = searchTerm.trim().length > 0;
  const isDefaultView =
    !hasSearch && !selectedJenjang && !selectedKelas && !selectedGender;

  const filteredData = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return siswaData.filter((siswa) => {
      const matchesSearch = hasSearch
        ? siswa.full_name?.toLowerCase().includes(keyword) ||
          siswa.nis?.toString().toLowerCase().includes(keyword)
        : true;
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
  }, [
    siswaData,
    searchTerm,
    selectedJenjang,
    selectedKelas,
    selectedGender,
    hasSearch,
  ]);

  // Amber prompt cuma dipakai kalau memang belum ada data sama sekali yang berhasil di-fetch
  const showEmptyPrompt = !isLoading && siswaData.length === 0;

  // Reset batas tampilan ke 30 lagi tiap kali pencarian/filter berubah
  useEffect(() => {
    setDisplayLimit(PAGE_SIZE);
  }, [searchTerm, selectedJenjang, selectedKelas, selectedGender]);

  // Data yang benar-benar dirender ke layar (dibatasi PAGE_SIZE per halaman)
  const visibleData = useMemo(
    () => filteredData.slice(0, displayLimit),
    [filteredData, displayLimit],
  );
  const hasMore = filteredData.length > visibleData.length;

  const handleJenjangChange = (e) => {
    setSelectedJenjang(e.target.value);
    setSelectedKelas("");
  };

  const EditModal = React.memo(() => (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-700">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 px-6 py-5 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Edit2 size={24} className="text-white" />
              <div>
                <h2 className="text-xl font-bold text-white">
                  Edit Data Siswa
                </h2>
                <p className="text-blue-100 dark:text-blue-200 text-sm">
                  Kelas {selectedStudent?.class_id}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowEditModal(false)}
              disabled={actionLoading}
              className="p-2 hover:bg-blue-700/50 rounded-lg transition-colors">
              <X size={20} className="text-white" />
            </button>
          </div>
        </div>

        <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              NIS *
            </label>
            <input
              type="text"
              value={editForm.nis}
              onChange={(e) =>
                setEditForm({ ...editForm, nis: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nama Lengkap *
            </label>
            <input
              type="text"
              value={editForm.full_name}
              onChange={(e) =>
                setEditForm({ ...editForm, full_name: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Jenis Kelamin *
            </label>
            <select
              value={editForm.gender}
              onChange={(e) =>
                setEditForm({ ...editForm, gender: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition"
              required>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Kelas *
            </label>
            <select
              value={editForm.class_id}
              onChange={(e) =>
                setEditForm({ ...editForm, class_id: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition"
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
              className="flex-1 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold transition-all shadow hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
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
              className="px-5 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-semibold transition-all shadow disabled:opacity-50">
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  ));

  const DeleteModal = React.memo(() => (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-700">
        <div className="bg-gradient-to-r from-red-600 to-red-700 dark:from-red-800 dark:to-red-900 px-6 py-5 rounded-t-xl">
          <div className="flex items-center gap-3">
            <Trash2 size={24} className="text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">
                Konfirmasi Nonaktifkan
              </h2>
              <p className="text-red-100 dark:text-red-200 text-sm">
                Data akan dinonaktifkan
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Apakah Anda yakin ingin menonaktifkan siswa ini?
          </p>
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800 mb-6">
            <p className="font-bold text-red-800 dark:text-red-300 text-lg">
              {selectedStudent?.full_name}
            </p>
            <div className="flex flex-wrap gap-2 mt-2 text-sm">
              <span className="text-red-600 dark:text-red-400">
                NIS: {selectedStudent?.nis}
              </span>
              <span className="text-red-600 dark:text-red-400">
                Kelas: {selectedStudent?.class_id}
              </span>
            </div>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400 mb-6 font-medium">
            ⚠️ Siswa akan dinonaktifkan dan tidak muncul dalam daftar aktif.
          </p>

          <div className="flex gap-3">
            <button
              onClick={handleDeleteConfirm}
              disabled={actionLoading}
              className="flex-1 px-5 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg font-semibold transition-all shadow hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {actionLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Menghapus...</span>
                </>
              ) : (
                <>
                  <Trash2 size={18} />
                  <span>Ya, Nonaktifkan</span>
                </>
              )}
            </button>
            <button
              onClick={() => setShowDeleteModal(false)}
              disabled={actionLoading}
              className="px-5 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-semibold transition-all shadow disabled:opacity-50">
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  ));

  const ExportModal = React.memo(() => (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-700">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 px-6 py-5 rounded-t-xl">
          <h2 className="text-xl font-bold text-white text-center">
            📊 Export Data Siswa
          </h2>
          <p className="text-blue-100 dark:text-blue-200 text-center text-sm mt-1">
            Pilih jenis export yang diinginkan
          </p>
        </div>

        <div className="p-6 space-y-4">
          <button
            onClick={handleExportAll}
            disabled={exportLoading || siswaData.length === 0}
            className={`w-full p-4 rounded-lg border-2 transition-all flex items-center justify-between min-h-[70px] ${
              exportLoading || siswaData.length === 0
                ? "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                : "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:border-blue-300 dark:hover:border-blue-600"
            }`}>
            <div className="text-left">
              <div className="font-semibold">Export Semua Data</div>
              <div className="text-sm opacity-75">
                {siswaData.length} siswa (kelas saya)
              </div>
            </div>
            <div className="text-2xl">📋</div>
          </button>

          <button
            onClick={handleExportByFilter}
            disabled={exportLoading || filteredData.length === 0}
            className={`w-full p-4 rounded-lg border-2 transition-all flex items-center justify-between min-h-[70px] ${
              exportLoading || filteredData.length === 0
                ? "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                : "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:border-blue-300 dark:hover:border-blue-600"
            }`}>
            <div className="text-left">
              <div className="font-semibold">Export Hasil Filter</div>
              <div className="text-sm opacity-75">
                {filteredData.length} siswa
                {(selectedJenjang || selectedKelas || selectedGender) &&
                  ` • ${selectedJenjang ? `Kelas ${selectedJenjang}` : ""} ${
                    selectedKelas ? selectedKelas : ""
                  } ${
                    selectedGender
                      ? `• ${selectedGender === "L" ? "Laki-laki" : "Perempuan"}`
                      : ""
                  }`}
              </div>
            </div>
            <div className="text-2xl">🎯</div>
          </button>

          {availableJenjang.length > 0 && (
            <div className="space-y-3">
              <div className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                Export Per Jenjang:
              </div>
              <div className="grid grid-cols-3 gap-2">
                {availableJenjang.map((jenjang) => {
                  const count = siswaData.filter((s) =>
                    s.class_id?.startsWith(jenjang),
                  ).length;
                  return (
                    <button
                      key={jenjang}
                      onClick={() => handleExportByJenjang(jenjang)}
                      disabled={exportLoading || count === 0}
                      className={`p-3 rounded-lg border transition-all ${
                        exportLoading || count === 0
                          ? "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                          : "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:border-blue-300 dark:hover:border-blue-600"
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

          <div className="space-y-3">
            <div className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
              Export Per Kelas:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
              {kelasOptions.map((kelas) => {
                const count = siswaData.filter(
                  (s) => s.class_id === kelas,
                ).length;
                return (
                  <button
                    key={kelas}
                    onClick={() => handleExportByKelas(kelas)}
                    disabled={exportLoading || count === 0}
                    className={`p-3 rounded-lg border transition-all text-left ${
                      exportLoading || count === 0
                        ? "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                        : "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:border-blue-300 dark:hover:border-blue-600"
                    }`}>
                    <div className="font-semibold text-sm">{kelas}</div>
                    <div className="text-xs opacity-75">{count} siswa</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex justify-end">
          <button
            onClick={() => setShowExportModal(false)}
            disabled={exportLoading}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium disabled:opacity-50">
            {exportLoading ? "Mengexport..." : "Tutup"}
          </button>
        </div>
      </div>
    </div>
  ));

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 sm:p-6 md:p-8 bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white transition-colors duration-300">
            Data Siswa
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors duration-300">
            Memuat data siswa...
          </p>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400 transition-colors duration-300"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      {showExportModal && <ExportModal />}
      {showEditModal && <EditModal />}
      {showDeleteModal && <DeleteModal />}

      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-white transition-colors duration-300">
              Data Siswa
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors duration-300">
              Manajemen Data Siswa SMP Muslimin Cililin
            </p>
          </div>
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl transition-colors duration-300">
            <Users
              className="text-blue-600 dark:text-blue-400 transition-colors duration-300"
              size={28}
            />
          </div>
        </div>
      </div>

      {canEditDeleteMemo && currentUser?.role === "teacher" && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200 dark:border-blue-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 dark:bg-blue-700 rounded-lg flex items-center justify-center flex-shrink-0">
              <Edit2 className="text-white" size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-blue-800 dark:text-blue-300">
                🏠 Mode Wali Kelas Aktif
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400">
                Anda dapat menambah, mengedit dan menonaktifkan data siswa di
                kelas {currentUser?.homeroom_class_id}
              </p>
            </div>
          </div>
        </div>
      )}

      {canEditDeleteMemo && currentUser?.role === "admin" && (
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl border border-purple-200 dark:border-purple-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 dark:bg-purple-700 rounded-lg flex items-center justify-center flex-shrink-0">
              <Edit2 className="text-white" size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-purple-800 dark:text-purple-300">
                👑 Mode Admin Aktif
              </p>
              <p className="text-xs text-purple-700 dark:text-purple-400">
                Anda dapat mengedit dan menonaktifkan data siswa di semua kelas
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats card — kasus 4 card (Wali Kelas) tetap grid 2x2 (2 kolom).
          Kasus lain (Admin/Guru BK, 2–5 card sesuai jumlah jenjang yang diampu) tetap 1 baris penuh. */}
      <div
        className="grid gap-2 sm:gap-4 mb-6 sm:mb-8"
        style={{
          gridTemplateColumns:
            canEditDeleteMemo && currentUser?.role === "teacher"
              ? "repeat(2, minmax(0, 1fr))"
              : `repeat(${
                  2 +
                  ["7", "8", "9"].filter((j) => availableJenjang.includes(j))
                    .length
                }, minmax(0, 1fr))`,
        }}>
        {canEditDeleteMemo && currentUser?.role === "teacher" ? (
          <>
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-2 sm:p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 shadow-sm min-w-0">
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-3 sm:mb-2 text-center sm:text-left">
                <div className="p-1.5 sm:p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                  <GraduationCap
                    className="text-indigo-600 dark:text-indigo-300"
                    size={16}
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] sm:text-xs font-semibold text-indigo-800/70 dark:text-indigo-300/70 truncate">
                    Kelas Anda
                  </div>
                  <div className="text-sm sm:text-lg font-bold text-indigo-700 dark:text-indigo-300 truncate">
                    {currentUser?.homeroom_class_id}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 sm:p-4 rounded-xl border border-emerald-100 dark:border-emerald-800 shadow-sm min-w-0">
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-3 sm:mb-2 text-center sm:text-left">
                <div className="p-1.5 sm:p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                  <Users
                    className="text-emerald-600 dark:text-emerald-300"
                    size={16}
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] sm:text-xs font-semibold text-emerald-800/70 dark:text-emerald-300/70 truncate">
                    Total Siswa
                  </div>
                  <div className="text-sm sm:text-lg font-bold text-emerald-700 dark:text-emerald-300 truncate">
                    {
                      siswaData.filter(
                        (s) => s.class_id === currentUser?.homeroom_class_id,
                      ).length
                    }
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-2 sm:p-4 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm min-w-0">
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-3 sm:mb-2 text-center sm:text-left">
                <div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                  <User
                    className="text-blue-600 dark:text-blue-300"
                    size={16}
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] sm:text-xs font-semibold text-blue-800/70 dark:text-blue-300/70 truncate">
                    Laki-laki
                  </div>
                  <div className="text-sm sm:text-lg font-bold text-blue-700 dark:text-blue-300 truncate">
                    {
                      siswaData.filter(
                        (s) =>
                          s.class_id === currentUser?.homeroom_class_id &&
                          s.gender === "L",
                      ).length
                    }
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-rose-50 dark:bg-rose-900/20 p-2 sm:p-4 rounded-xl border border-rose-100 dark:border-rose-800 shadow-sm min-w-0">
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-3 sm:mb-2 text-center sm:text-left">
                <div className="p-1.5 sm:p-2 bg-rose-100 dark:bg-rose-900/40 rounded-lg">
                  <UserCheck
                    className="text-rose-600 dark:text-rose-300"
                    size={16}
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] sm:text-xs font-semibold text-rose-800/70 dark:text-rose-300/70 truncate">
                    Perempuan
                  </div>
                  <div className="text-sm sm:text-lg font-bold text-rose-700 dark:text-rose-300 truncate">
                    {
                      siswaData.filter(
                        (s) =>
                          s.class_id === currentUser?.homeroom_class_id &&
                          s.gender === "P",
                      ).length
                    }
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-2 sm:p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 shadow-sm min-w-0 text-center sm:text-left">
              <div className="text-[10px] sm:text-xs font-semibold text-indigo-800/70 dark:text-indigo-300/70 mb-0.5 sm:mb-1 truncate">
                Total Kelas
              </div>
              <div className="text-sm sm:text-xl font-bold text-indigo-700 dark:text-indigo-300 truncate">
                {kelasOptions.length}
              </div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 sm:p-4 rounded-xl border border-emerald-100 dark:border-emerald-800 shadow-sm min-w-0 text-center sm:text-left">
              <div className="text-[10px] sm:text-xs font-semibold text-emerald-800/70 dark:text-emerald-300/70 mb-0.5 sm:mb-1 truncate">
                Total Siswa
              </div>
              <div className="text-sm sm:text-xl font-bold text-emerald-700 dark:text-emerald-300 truncate">
                {siswaData.length}
              </div>
            </div>

            {availableJenjang.includes("7") && (
              <div className="bg-amber-50 dark:bg-amber-900/20 p-2 sm:p-4 rounded-xl border border-amber-100 dark:border-amber-800 shadow-sm min-w-0 text-center sm:text-left">
                <div className="text-[10px] sm:text-xs font-semibold text-amber-800/70 dark:text-amber-300/70 mb-0.5 sm:mb-1 truncate">
                  Kelas 7
                </div>
                <div className="text-sm sm:text-xl font-bold text-amber-700 dark:text-amber-300 truncate">
                  {siswaData.filter((s) => s.class_id?.startsWith("7")).length}
                </div>
              </div>
            )}

            {availableJenjang.includes("8") && (
              <div className="bg-violet-50 dark:bg-violet-900/20 p-2 sm:p-4 rounded-xl border border-violet-100 dark:border-violet-800 shadow-sm min-w-0 text-center sm:text-left">
                <div className="text-[10px] sm:text-xs font-semibold text-violet-800/70 dark:text-violet-300/70 mb-0.5 sm:mb-1 truncate">
                  Kelas 8
                </div>
                <div className="text-sm sm:text-xl font-bold text-violet-700 dark:text-violet-300 truncate">
                  {siswaData.filter((s) => s.class_id?.startsWith("8")).length}
                </div>
              </div>
            )}

            {availableJenjang.includes("9") && (
              <div className="bg-cyan-50 dark:bg-cyan-900/20 p-2 sm:p-4 rounded-xl border border-cyan-100 dark:border-cyan-800 shadow-sm min-w-0 text-center sm:text-left">
                <div className="text-[10px] sm:text-xs font-semibold text-cyan-800/70 dark:text-cyan-300/70 mb-0.5 sm:mb-1 truncate">
                  Kelas 9
                </div>
                <div className="text-sm sm:text-xl font-bold text-cyan-700 dark:text-cyan-300 truncate">
                  {siswaData.filter((s) => s.class_id?.startsWith("9")).length}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl border border-blue-100 dark:border-gray-700 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari siswa berdasarkan nama atau NIS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <div className="absolute right-3 top-3 text-gray-400">🔍</div>
            </div>
          </div>

          <div>
            <select
              value={selectedJenjang}
              onChange={handleJenjangChange}
              disabled={availableJenjang.length === 0}
              className={`w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                availableJenjang.length === 0
                  ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-70"
                  : "bg-white dark:bg-gray-700 cursor-pointer"
              } text-gray-900 dark:text-white`}>
              <option value="">Semua Jenjang</option>
              {availableJenjang.map((jenjang) => (
                <option key={jenjang} value={jenjang}>
                  Kelas {jenjang}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              disabled={!selectedJenjang}
              className={`w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                !selectedJenjang
                  ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-70"
                  : "bg-white dark:bg-gray-700 cursor-pointer"
              } text-gray-900 dark:text-white`}>
              <option value="">Semua Kelas</option>
              {filteredKelasOptions.map((kelas) => (
                <option key={kelas} value={kelas}>
                  {kelas}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="">Semua Gender</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>

          <div>
            <button
              onClick={() => setShowExportModal(true)}
              disabled={siswaData.length === 0}
              className={`w-full p-3 rounded-lg font-semibold flex items-center justify-center gap-2 ${
                siswaData.length === 0
                  ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg"
              }`}>
              <span>📊</span>
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {showEmptyPrompt ? (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 text-sm inline-flex items-center gap-2">
          <span>👆</span>
          <span className="text-amber-800 dark:text-amber-300 font-medium">
            Belum ada data siswa aktif yang bisa ditampilkan.
          </span>
        </div>
      ) : (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-100 dark:border-blue-700 text-sm inline-block">
          Menampilkan{" "}
          <strong className="text-blue-700 dark:text-blue-300">
            {hasMore
              ? `${visibleData.length} dari ${filteredData.length}`
              : filteredData.length}{" "}
            Siswa
          </strong>
          {isDefaultView && " (semua kelas, belum difilter)"}
          {searchTerm && ` dengan kata kunci "${searchTerm}"`}
          {selectedKelas && ` Di Kelas ${selectedKelas}`}
          {selectedGender &&
            ` ${selectedGender === "L" ? "Laki-laki" : "Perempuan"}`}
        </div>
      )}

      <div className="md:hidden space-y-3">
        {visibleData.length > 0 ? (
          visibleData.map((siswa, index) => (
            <div
              key={siswa.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-700 pb-3 mb-3">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    No. {index + 1} | Kelas:{" "}
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {siswa.class_id}
                    </span>
                  </p>
                  <p className="text-base font-bold text-gray-900 dark:text-white truncate">
                    {siswa.full_name}
                  </p>
                </div>
                <div className="flex-shrink-0 ml-2">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                      siswa.is_active
                        ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    }`}>
                    {siswa.is_active ? "Aktif" : "Non-Aktif"}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-sm">
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

              {canEditDelete && (
                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                  <button
                    onClick={() => handleEditClick(siswa)}
                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-1">
                    <Edit2 size={16} />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteClick(siswa)}
                    className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-1">
                    <Trash2 size={16} />
                    <span>Hapus</span>
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              {showEmptyPrompt
                ? "Belum ada data siswa"
                : "Siswa tidak ditemukan"}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {showEmptyPrompt
                ? "Belum ada data siswa aktif yang tersimpan di sistem."
                : "Coba ubah kata kunci pencarian atau filter yang dipakai."}
            </p>
          </div>
        )}

        {hasMore && (
          <button
            onClick={() => setDisplayLimit(filteredData.length)}
            className="w-full py-3 rounded-xl border border-dashed border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold text-sm bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20">
            Muat Semua ({filteredData.length - visibleData.length} sisanya)
          </button>
        )}
      </div>

      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          {visibleData.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 text-white">
                <tr>
                  <th className="px-6 py-4 text-left w-1/12 text-sm uppercase tracking-wider text-center">
                    No.
                  </th>
                  <th className="px-6 py-4 text-left w-2/12 text-sm uppercase tracking-wider">
                    NIS
                  </th>
                  <th className="px-6 py-4 text-left w-3/12 text-sm uppercase tracking-wider">
                    Nama
                  </th>
                  <th className="px-6 py-4 text-left w-1/12 text-sm uppercase tracking-wider">
                    Kelas
                  </th>
                  <th className="px-6 py-4 text-left w-2/12 text-sm uppercase tracking-wider">
                    Jenis Kelamin
                  </th>
                  <th className="px-6 py-4 text-left w-1/12 text-sm uppercase tracking-wider text-center">
                    Status
                  </th>
                  {canEditDelete && (
                    <th className="px-6 py-4 text-left w-2/12 text-sm uppercase tracking-wider text-center">
                      Aksi
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {visibleData.map((siswa, index) => (
                  <tr
                    key={siswa.id}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 text-center text-gray-700 dark:text-gray-300">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-900 dark:text-white">
                      {siswa.nis}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {siswa.full_name}
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                      {siswa.class_id}
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                      {siswa.gender === "L" ? "Laki-laki" : "Perempuan"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          siswa.is_active
                            ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                        }`}>
                        {siswa.is_active ? "Aktif" : "Non-Aktif"}
                      </span>
                    </td>
                    {canEditDelete && (
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditClick(siswa)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            title="Edit Siswa">
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(siswa)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Hapus Siswa">
                            <Trash2 size={18} />
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
                stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                {showEmptyPrompt
                  ? "Belum ada data siswa"
                  : "Siswa tidak ditemukan"}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {showEmptyPrompt
                  ? "Belum ada data siswa aktif yang tersimpan di sistem."
                  : "Coba ubah kata kunci pencarian atau filter yang dipakai."}
              </p>
            </div>
          )}

          {hasMore && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setDisplayLimit(filteredData.length)}
                className="w-full py-3 rounded-lg border border-dashed border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold text-sm bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                Muat Semua ({filteredData.length - visibleData.length} sisanya)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Students;
