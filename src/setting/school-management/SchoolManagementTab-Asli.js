// SchoolManagementTab.js - REVISI LENGKAP ✅ FOKUS AKADEMIK & SISWA dengan Year Transition Integration dan BULK IMPORT
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import {
  Plus,
  Users,
  UserCheck,
  BookOpen,
  Edit3,
  Trash2,
  CheckSquare,
  X,
  Search,
  Eye,
  EyeOff,
  ArrowRight,
  Upload,
  Download,
  FileText,
  AlertCircle,
} from "lucide-react";
import Papa from "papaparse"; // untuk parsing CSV

// ✅ FUNGSI MODAL SISWA (FIX DELAY)
const StudentModal = ({
  modal,
  setModal,
  form,
  setForm,
  loading,
  availableClasses,
  onSubmit,
  onCancel,
}) => {
  const firstInputRef = React.useRef(null);

  React.useEffect(() => {
    if (modal.show && firstInputRef.current) {
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 100);
    }
  }, [modal.show]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4 transition-colors duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto transition-colors duration-200 border border-gray-200 dark:border-gray-700">
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white p-5 sm:p-6 rounded-t-2xl flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Users size={20} className="sm:size-24" />
            <div>
              <h2 className="text-lg sm:text-xl font-bold">
                {modal.mode === "add" ? "Tambah Siswa" : "Edit Siswa"}
              </h2>
              <p className="text-green-100 text-xs sm:text-sm">SMP Muslimin Cililin</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 sm:p-2 hover:bg-green-700 rounded-lg transition-colors"
            aria-label="Tutup modal"
          >
            <X size={18} className="sm:size-20" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {/* ✅ NIS INPUT - FIX DELAY */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              NIS *
            </label>
            <input
              ref={firstInputRef}
              type="text"
              value={form.nis}
              onChange={(e) => setForm((prev) => ({ ...prev, nis: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-3 focus:ring-green-500/50 focus:border-green-500 dark:focus:ring-green-400/50 focus:outline-none transition-all bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white"
              placeholder="Masukkan NIS siswa"
              required
            />
          </div>

          {/* ✅ NAMA INPUT - FIX DELAY */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Nama Siswa *
            </label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-3 focus:ring-green-500/50 focus:border-green-500 dark:focus:ring-green-400/50 focus:outline-none transition-all bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white"
              placeholder="Masukkan nama lengkap siswa"
              required
            />
          </div>

          {/* ✅ GENDER SELECT - FIX DELAY */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Jenis Kelamin *
            </label>
            <select
              value={form.gender}
              onChange={(e) => setForm((prev) => ({ ...prev, gender: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-3 focus:ring-green-500/50 focus:border-green-500 dark:focus:ring-green-400/50 focus:outline-none transition-all bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white"
              required
            >
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>

          {/* ✅ KELAS SELECT - FIX DELAY */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Kelas *
            </label>
            <select
              value={form.class_id}
              onChange={(e) => setForm((prev) => ({ ...prev, class_id: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-3 focus:ring-green-500/50 focus:border-green-500 dark:focus:ring-green-400/50 focus:outline-none transition-all bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white"
              required
            >
              <option value="">Pilih Kelas</option>
              {availableClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  Kelas {cls.id}
                </option>
              ))}
            </select>
          </div>

          {/* ✅ ACTIVE CHECKBOX - FIX DELAY */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
              className="rounded border-gray-300 dark:border-gray-600 text-green-600 dark:text-green-400 focus:ring-green-500 dark:focus:ring-green-400 transition-colors size-5"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Siswa Aktif
            </span>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onSubmit}
              disabled={loading || !form.nis || !form.full_name || !form.class_id}
              className="flex-1 px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 dark:from-green-700 dark:hover:from-green-800 dark:hover:to-emerald-800 text-white rounded-xl disabled:opacity-50 font-semibold transition-all active:scale-[0.98] min-h-[44px] shadow-md hover:shadow-lg"
            >
              {loading ? "Menyimpan..." : modal.mode === "add" ? "Tambah Siswa" : "Update Siswa"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-5 py-3 bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:from-gray-400 hover:to-gray-500 dark:hover:from-gray-700 dark:hover:to-gray-800 disabled:opacity-50 transition-all active:scale-[0.98] min-h-[44px] shadow-md font-semibold"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DeleteConfirmModal = ({ confirm, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4 transition-colors duration-200">
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md transition-colors duration-200 border border-gray-200 dark:border-gray-700">
      <div className="bg-gradient-to-r from-red-100 to-red-50 dark:from-red-900/20 dark:to-red-900/10 border-b border-red-200 dark:border-red-800 p-5 sm:p-6 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <X className="text-red-600 dark:text-red-400" size={24} />
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-red-800 dark:text-red-300">
              Konfirmasi Hapus
            </h2>
            <p className="text-red-600 dark:text-red-400 text-xs sm:text-sm">
              Data siswa akan dihapus permanen
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Apakah Anda yakin ingin menghapus siswa{" "}
          <strong className="text-red-600 dark:text-red-400">{confirm.data?.full_name}</strong>?
        </p>
        <p className="text-sm text-red-600 dark:text-red-400 mb-6 font-medium">
          ⚠️ Tindakan ini tidak dapat dibatalkan!
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-5 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 dark:from-red-700 dark:hover:from-red-800 dark:hover:to-red-900 text-white rounded-xl disabled:opacity-50 font-semibold transition-all active:scale-[0.98] min-h-[44px] shadow-md hover:shadow-lg"
          >
            {loading ? "Menghapus..." : "Ya, Hapus"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-5 py-3 bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:from-gray-400 hover:to-gray-500 dark:hover:from-gray-700 dark:hover:to-gray-800 disabled:opacity-50 transition-all active:scale-[0.98] min-h-[44px] shadow-md font-semibold"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  </div>
);

// ✅ MAIN COMPONENT - FOKUS AKADEMIK & SISWA dengan Year Transition Integration dan BULK IMPORT
const SchoolManagementTab = ({
  user,
  loading,
  setLoading,
  showToast,
  onNavigateToUserManagement,
  onNavigateToYearTransition,
}) => {
  console.log("🔄 SchoolManagementTab RE-RENDER");

  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentsByClass, setStudentsByClass] = useState({});
  const [activeAcademicYear, setActiveAcademicYear] = useState(null); // Object: { id, year }
  const [oldYearStudents, setOldYearStudents] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showOldYearWarning, setShowOldYearWarning] = useState(false);

  const [schoolStats, setSchoolStats] = useState({
    total_students: 0,
    total_teachers: 0,
    active_siswa_baru: 0,
    siswa_baru_year: null,
  });

  const SMP_CONFIG = {
    schoolName: "SMP Muslimin Cililin",
    schoolLevel: "SMP",
    grades: ["7", "8", "9"],
  };

  const [studentFilters, setStudentFilters] = useState({
    kelas: "",
    search: "",
  });

  const [studentModal, setStudentModal] = useState({
    show: false,
    mode: "add",
    data: null,
  });

  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    type: "",
    data: null,
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [studentForm, setStudentForm] = useState({
    nis: "",
    full_name: "",
    gender: "L",
    class_id: "",
    is_active: true,
  });

  const [availableClasses, setAvailableClasses] = useState([]);

  // ✅ NEW: Bulk Import States
  const [importModal, setImportModal] = useState({
    show: false,
    mode: "upload", // 'upload' | 'preview' | 'error' | 'processing' | 'success'
    data: null,
  });

  const [importScope, setImportScope] = useState({
    type: "all", // 'grade7' | 'grade8' | 'grade9' | 'class' | 'all'
    value: null,
  });

  const [importMode, setImportMode] = useState("smart"); // 'smart' | 'insert' | 'update'

  const [importPreview, setImportPreview] = useState({
    rows: [],
    validRows: [],
    invalidRows: [],
    totalCount: 0,
    validCount: 0,
    invalidCount: 0,
    duplicateCount: 0,
  });

  const [importErrors, setImportErrors] = useState([]);

  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
    percentage: 0,
    status: "idle", // 'idle' | 'processing' | 'complete' | 'error'
  });

  // ✅ Warning saat tidak ada tahun ajaran aktif (FIXED)
  useEffect(() => {
    // Hanya show toast SETELAH initial load selesai
    if (!loading && !isInitialLoad && !activeAcademicYear) {
      showToast(
        "⚠️ PERHATIAN: Tidak ada tahun ajaran aktif! Silakan ke Settings → Academic Year untuk mengatur tahun ajaran.",
        "warning"
      );
    }
  }, [activeAcademicYear, loading, isInitialLoad, showToast]);

  // ✅ MODIFIED: fetchActiveAcademicYear - return object dengan id dan year
  const fetchActiveAcademicYear = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("academic_years")
        .select("id, year, is_active")
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Error fetching active academic year:", error);
        return null;
      }

      // ✅ Return object dengan id dan year
      return data ? { id: data.id, year: data.year } : null;
    } catch (err) {
      console.error("Error in fetchActiveAcademicYear:", err);
      return null;
    }
  }, []);

  const loadAvailableClasses = useCallback(
    async (academicYear) => {
      try {
        const { data: classesData, error } = await supabase
          .from("classes")
          .select("id, grade, academic_year")
          .eq("academic_year", academicYear)
          .order("grade")
          .order("id");

        if (error) throw error;
        setAvailableClasses(classesData || []);
      } catch (error) {
        console.error("Error loading classes:", error);
        showToast("Error loading classes: " + error.message, "error");
      }
    },
    [showToast]
  );

  // ✅ MODIFIED: loadSchoolData dengan academic_year_id (UUID)
  const loadSchoolData = useCallback(async () => {
    try {
      setLoading(true);

      // ✅ GET FULL academic year data (id + year)
      const activeYear = await fetchActiveAcademicYear();

      if (!activeYear) {
        showToast("Tidak ada tahun ajaran aktif!", "error");
        setLoading(false);
        return;
      }

      // ✅ Set as object
      setActiveAcademicYear(activeYear);
      await loadAvailableClasses(activeYear.year);

      // ✅ READ-ONLY: Load teachers hanya untuk display
      const { data: teachersData, error: teachersError } = await supabase
        .from("users")
        .select("id, username, full_name, role, homeroom_class_id, is_active, teacher_id")
        .in("role", ["teacher", "guru_bk"])
        .order("teacher_id", { ascending: true, nullsFirst: false })
        .order("full_name", { ascending: true });

      if (teachersError) throw teachersError;

      // ✅ Load students dengan filter academic_year (TEXT)
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, nis, full_name, gender, class_id, is_active, academic_year, academic_year_id")
        .eq("is_active", true)
        .eq("academic_year", activeYear.year) // ⬅️ GANTI INI AJA
        .order("full_name");

      if (studentsError) throw studentsError;

      const { data: classesData, error: classesError } = await supabase
        .from("classes")
        .select("id, grade, academic_year")
        .eq("academic_year", activeYear.year)
        .order("grade")
        .order("id");

      if (classesError) throw classesError;

      // ✅ Load siswa dari tahun ajaran lama
      if (activeYear.id) {
        const { count: oldCount, error: oldCountError } = await supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true)
          .neq("academic_year_id", activeYear.id); // ✅ Filter by UUID

        if (!oldCountError && oldCount > 0) {
          setOldYearStudents(oldCount);
          setShowOldYearWarning(true);
        } else {
          setOldYearStudents(0);
          setShowOldYearWarning(false);
        }
      }

      // ✅ SISWA: Map dengan kelas
      const studentsWithClass = (studentsData || []).map((student) => {
        const studentClass = classesData.find((c) => c.id === student.class_id);
        return {
          ...student,
          classes: studentClass ? { name: studentClass.id, grade: studentClass.grade } : null,
        };
      });

      const nextYear = activeYear.year
        ? `${parseInt(activeYear.year.split("/")[0]) + 1}/${
            parseInt(activeYear.year.split("/")[1]) + 1
          }`
        : null;

      const { data: siswaBaru } = await supabase
        .from("siswa_baru")
        .select("id, nama_lengkap, academic_year, status")
        .eq("status", "diterima")
        .eq("academic_year", nextYear);

      const studentsByClass = {};
      studentsWithClass.forEach((student) => {
        const className = student.classes?.name || "Belum Ada Kelas";
        if (!studentsByClass[className]) {
          studentsByClass[className] = [];
        }
        studentsByClass[className].push(student);
      });

      setTeachers(teachersData || []);
      setStudents(studentsWithClass);
      setStudentsByClass(studentsByClass);
      setSchoolStats({
        total_students: studentsWithClass.length,
        total_teachers: (teachersData || []).filter((t) => t.is_active).length,
        active_siswa_baru: siswaBaru?.length || 0,
        siswa_baru_year: nextYear,
      });
    } catch (error) {
      console.error("Error loading school data:", error);
      showToast("Error loading school data: " + error.message, "error");
    } finally {
      setLoading(false);
      setIsInitialLoad(false); // ✅ Set false setelah load pertama selesai
    }
  }, [fetchActiveAcademicYear, loadAvailableClasses, setLoading, showToast]);

  useEffect(() => {
    loadSchoolData();
  }, [loadSchoolData]);

  const filteredStudents = useCallback(() => {
    return students.filter((student) => {
      const matchesKelas = !studentFilters.kelas || student.classes?.name === studentFilters.kelas;
      const matchesSearch =
        !studentFilters.search ||
        student.full_name.toLowerCase().includes(studentFilters.search.toLowerCase()) ||
        student.nis.toLowerCase().includes(studentFilters.search.toLowerCase());
      return matchesKelas && matchesSearch;
    });
  }, [students, studentFilters.kelas, studentFilters.search]);

  const updateStudentClass = useCallback(
    async (studentId, newClassId) => {
      try {
        setLoading(true);
        const { error } = await supabase
          .from("students")
          .update({ class_id: newClassId || null })
          .eq("id", studentId);

        if (error) throw error;
        showToast("Kelas siswa berhasil diupdate!", "success");
        await loadSchoolData();
      } catch (error) {
        console.error("Error updating student class:", error);
        showToast("Error mengupdate kelas siswa", "error");
      } finally {
        setLoading(false);
      }
    },
    [setLoading, showToast, loadSchoolData]
  );

  const openStudentModal = useCallback((mode = "add", studentData = null) => {
    if (mode === "edit" && studentData) {
      setStudentForm({
        nis: studentData.nis,
        full_name: studentData.full_name,
        gender: studentData.gender,
        class_id: studentData.class_id || "",
        is_active: studentData.is_active,
      });
    } else {
      setStudentForm({
        nis: "",
        full_name: "",
        gender: "L",
        class_id: "",
        is_active: true,
      });
    }

    setStudentModal({ show: true, mode, data: studentData });
  }, []);

  // ✅ MODIFIED: handleAddStudent dengan BOTH fields
  const handleAddStudent = useCallback(async () => {
    try {
      setLoading(true);

      // ✅ VALIDASI TAMBAHAN
      if (!activeAcademicYear) {
        showToast(
          "Tahun ajaran aktif tidak ditemukan! Silakan aktifkan tahun ajaran terlebih dahulu.",
          "error"
        );
        return;
      }

      if (!studentForm.nis.trim()) {
        showToast("NIS tidak boleh kosong!", "error");
        return;
      }

      if (!studentForm.full_name.trim()) {
        showToast("Nama siswa tidak boleh kosong!", "error");
        return;
      }

      if (!studentForm.class_id) {
        showToast("Silakan pilih kelas untuk siswa!", "error");
        return;
      }

      // ✅ INSERT dengan BOTH fields
      const { error } = await supabase.from("students").insert([
        {
          nis: studentForm.nis.trim(),
          full_name: studentForm.full_name.trim(),
          gender: studentForm.gender,
          class_id: studentForm.class_id,
          is_active: studentForm.is_active,
          academic_year: activeAcademicYear.year, // ✅ Text
          academic_year_id: activeAcademicYear.id, // ✅ UUID
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      showToast("Siswa berhasil ditambahkan!", "success");
      setStudentModal({ show: false, mode: "add", data: null });
      setStudentForm({
        nis: "",
        full_name: "",
        gender: "L",
        class_id: "",
        is_active: true,
      });
      await loadSchoolData();
    } catch (error) {
      console.error("Error adding student:", error);
      showToast("Error menambah siswa: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  }, [studentForm, activeAcademicYear, setLoading, showToast, loadSchoolData]);

  const handleEditStudent = useCallback(async () => {
    try {
      setLoading(true);

      // ✅ VALIDASI SAMA UNTUK EDIT
      if (!studentForm.nis.trim()) {
        showToast("NIS tidak boleh kosong!", "error");
        return;
      }

      if (!studentForm.full_name.trim()) {
        showToast("Nama siswa tidak boleh kosong!", "error");
        return;
      }

      if (!studentForm.class_id) {
        showToast("Silakan pilih kelas untuk siswa!", "error");
        return;
      }

      const { error } = await supabase
        .from("students")
        .update({
          nis: studentForm.nis,
          full_name: studentForm.full_name,
          gender: studentForm.gender,
          class_id: studentForm.class_id || null,
          is_active: studentForm.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", studentModal.data.id);

      if (error) throw error;

      showToast("Siswa berhasil diupdate!", "success");
      setStudentModal({ show: false, mode: "add", data: null });
      setStudentForm({
        nis: "",
        full_name: "",
        gender: "L",
        class_id: "",
        is_active: true,
      });
      await loadSchoolData();
    } catch (error) {
      console.error("Error updating student:", error);
      showToast("Error mengupdate siswa: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  }, [studentForm, studentModal.data, setLoading, showToast, loadSchoolData]);

  const handleDeleteStudent = useCallback(
    async (studentId) => {
      try {
        setLoading(true);
        const { error } = await supabase.from("students").delete().eq("id", studentId);

        if (error) throw error;

        showToast("Siswa berhasil dihapus!", "success");
        setDeleteConfirm({ show: false, type: "", data: null });
        await loadSchoolData();
      } catch (error) {
        console.error("Error deleting student:", error);
        showToast("Error menghapus siswa: " + error.message, "error");
      } finally {
        setLoading(false);
      }
    },
    [setLoading, showToast, loadSchoolData]
  );

  // ✅ NEW: Bulk Import Functions

  /**
   * Parse CSV file menggunakan Papaparse
   */
  const parseCSVFile = (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().toLowerCase(),
        complete: (results) => {
          resolve(results.data);
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  };

  /**
   * Generate NIS baru untuk siswa kelas 7
   */
  const generateNISForGrade7 = async (activeYear) => {
    const [startYear, endYear] = activeYear.year.split("/");
    const prefix = `${startYear.slice(-2)}.${endYear.slice(-2)}.07.`;

    // Get last NIS dengan pattern ini
    const { data, error } = await supabase
      .from("students")
      .select("nis")
      .like("nis", `${prefix}%`)
      .order("nis", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error getting last NIS:", error);
      return `${prefix}001`;
    }

    let nextNumber = 1;

    if (data && data.length > 0) {
      const lastNIS = data[0].nis;
      const lastNumber = parseInt(lastNIS.split(".")[3]);
      nextNumber = lastNumber + 1;

      if (nextNumber > 999) {
        throw new Error("Nomor urut NIS sudah mencapai maksimal (999)");
      }
    }

    return `${prefix}${String(nextNumber).padStart(3, "0")}`;
  };

  /**
   * Validasi format dan pattern NIS
   */
  const validateNISPattern = (nis, grade, activeYear) => {
    // Check format dasar
    const regex = /^\d{2}\.\d{2}\.\d{2}\.\d{3}$/;
    if (!regex.test(nis)) {
      return {
        valid: false,
        error: "Format NIS salah (harus XX.XX.XX.XXX)",
      };
    }

    const [yearStart, yearEnd, gradeNIS, number] = nis.split(".");
    const [activeStart, activeEnd] = activeYear.year.split("/");

    let expectedYearPrefix;

    if (grade === 7) {
      // Kelas 7: NIS dari tahun aktif
      expectedYearPrefix = `${activeStart.slice(-2)}.${activeEnd.slice(-2)}`;
    } else if (grade === 8) {
      // Kelas 8: NIS dari tahun lalu
      const prevStart = String(parseInt(activeStart) - 1).slice(-2);
      const prevEnd = String(parseInt(activeEnd) - 1).slice(-2);
      expectedYearPrefix = `${prevStart}.${prevEnd}`;
    } else if (grade === 9) {
      // Kelas 9: NIS dari 2 tahun lalu
      const prevStart = String(parseInt(activeStart) - 2).slice(-2);
      const prevEnd = String(parseInt(activeEnd) - 2).slice(-2);
      expectedYearPrefix = `${prevStart}.${prevEnd}`;
    }

    const actualYearPrefix = `${yearStart}.${yearEnd}`;

    if (actualYearPrefix !== expectedYearPrefix) {
      return {
        valid: false,
        error: `NIS tahun ajaran (${actualYearPrefix}) tidak sesuai dengan grade ${grade} (harus ${expectedYearPrefix})`,
      };
    }

    // Grade di NIS harus selalu 07 (karena semua masuk dari kelas 7)
    if (gradeNIS !== "07") {
      return {
        valid: false,
        error: `Grade di NIS harus 07 (karena semua siswa masuk dari kelas 7)`,
      };
    }

    return { valid: true };
  };

  /**
   * Validasi data import dari CSV
   */
  const validateImportData = async (rows, validClassIds, activeYear, scope) => {
    const validRows = [];
    const invalidRows = [];
    const errors = [];
    const seenNIS = new Set();

    // Get existing NIS dari database
    const { data: existingStudents } = await supabase.from("students").select("nis");

    const existingNIS = new Set(existingStudents?.map((s) => s.nis) || []);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 karena row 1 = header, index start 0
      const rowErrors = [];

      // Trim semua values
      const nis = row.nis?.trim() || "";
      const full_name = row.full_name?.trim() || "";
      const gender = row.gender?.trim().toUpperCase() || "";
      const class_id = row.class_id?.trim() || "";

      // Validasi Full Name
      if (!full_name) {
        rowErrors.push("Nama tidak boleh kosong");
      } else if (full_name.length < 3) {
        rowErrors.push("Nama minimal 3 karakter");
      }

      // Validasi Gender
      if (!["L", "P"].includes(gender)) {
        rowErrors.push("Jenis kelamin harus L atau P");
      }

      // Validasi Class ID
      if (!class_id) {
        rowErrors.push("Kelas tidak boleh kosong");
      } else if (!validClassIds.has(class_id)) {
        rowErrors.push(`Kelas ${class_id} tidak tersedia di tahun ajaran ${activeYear.year}`);
      }

      // Get grade dari class_id
      const grade = class_id ? parseInt(class_id.charAt(0)) : null;

      // Validasi NIS berdasarkan grade
      if (grade === 7) {
        // Kelas 7: NIS optional (akan di-generate)
        if (nis) {
          // Jika ada NIS, validasi format
          const nisValidation = validateNISPattern(nis, grade, activeYear);
          if (!nisValidation.valid) {
            rowErrors.push(nisValidation.error);
          }

          // Check duplikat dalam file
          if (seenNIS.has(nis)) {
            rowErrors.push(`NIS ${nis} duplikat dalam file`);
          }

          // Check duplikat dengan database
          if (existingNIS.has(nis)) {
            rowErrors.push(`NIS ${nis} sudah ada di database`);
          }

          seenNIS.add(nis);
        }
      } else if (grade === 8 || grade === 9) {
        // Kelas 8/9: NIS WAJIB ada
        if (!nis) {
          rowErrors.push(`Siswa kelas ${grade} harus memiliki NIS`);
        } else {
          // Validasi format NIS
          const nisValidation = validateNISPattern(nis, grade, activeYear);
          if (!nisValidation.valid) {
            rowErrors.push(nisValidation.error);
          }

          // Check NIS harus exist di database
          if (!existingNIS.has(nis)) {
            rowErrors.push(`NIS ${nis} tidak ditemukan di database`);
          }

          // Check duplikat dalam file
          if (seenNIS.has(nis)) {
            rowErrors.push(`NIS ${nis} duplikat dalam file`);
          }

          seenNIS.add(nis);
        }
      }

      // Check scope filter
      if (scope.type === "class" && class_id !== scope.value) {
        rowErrors.push(`Kelas ${class_id} tidak sesuai dengan scope import (${scope.value})`);
      } else if (scope.type === "grade7" && grade !== 7) {
        rowErrors.push(`Baris ini bukan kelas 7 (scope: kelas 7 only)`);
      } else if (scope.type === "grade8" && grade !== 8) {
        rowErrors.push(`Baris ini bukan kelas 8 (scope: kelas 8 only)`);
      } else if (scope.type === "grade9" && grade !== 9) {
        rowErrors.push(`Baris ini bukan kelas 9 (scope: kelas 9 only)`);
      }

      if (rowErrors.length > 0) {
        invalidRows.push(row);
        errors.push({
          row: rowNum,
          data: { nis, full_name, gender, class_id },
          errors: rowErrors,
        });
      } else {
        validRows.push({
          nis: nis || null,
          full_name,
          gender,
          class_id,
          grade,
          needsNISGeneration: grade === 7 && !nis,
          isUpdate: grade !== 7 && nis && existingNIS.has(nis),
        });
      }
    }

    return { validRows, invalidRows, errors };
  };

  /**
   * Handler untuk upload dan parse CSV
   */
  const handleCSVImport = async (file) => {
    try {
      setLoading(true);
      setImportModal({ show: true, mode: "processing", data: null });

      // Validasi file
      if (!file) {
        showToast("Silakan pilih file CSV", "error");
        return;
      }

      const fileExt = file.name.split(".").pop().toLowerCase();
      if (!["csv", "xlsx", "xls"].includes(fileExt)) {
        showToast("Format file harus CSV atau Excel", "error");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        // 10MB
        showToast("Ukuran file maksimal 10MB", "error");
        return;
      }

      // Parse CSV
      const parsedData = await parseCSVFile(file);

      if (!parsedData || parsedData.length === 0) {
        showToast("File CSV kosong", "error");
        setImportModal({ show: false, mode: "upload", data: null });
        return;
      }

      // Check required columns
      const firstRow = parsedData[0];
      const hasFullName = "full_name" in firstRow || "nama_lengkap" in firstRow;
      const hasGender = "gender" in firstRow || "jenis_kelamin" in firstRow;
      const hasClassId = "class_id" in firstRow || "kelas" in firstRow;

      if (!hasFullName || !hasGender || !hasClassId) {
        showToast("Format CSV tidak sesuai. Harus ada kolom: full_name, gender, class_id", "error");
        setImportModal({ show: false, mode: "upload", data: null });
        return;
      }

      // Normalize column names
      const normalizedData = parsedData.map((row) => ({
        nis: row.nis || "",
        full_name: row.full_name || row.nama_lengkap || "",
        gender: row.gender || row.jenis_kelamin || "",
        class_id: row.class_id || row.kelas || "",
      }));

      // Get available classes
      const { data: classesData } = await supabase
        .from("classes")
        .select("id")
        .eq("academic_year", activeAcademicYear.year);

      const validClassIds = new Set(classesData?.map((c) => c.id) || []);

      // Validate data
      const { validRows, invalidRows, errors } = await validateImportData(
        normalizedData,
        validClassIds,
        activeAcademicYear,
        importScope
      );

      // Set preview data
      setImportPreview({
        rows: normalizedData,
        validRows,
        invalidRows,
        totalCount: normalizedData.length,
        validCount: validRows.length,
        invalidCount: invalidRows.length,
      });

      setImportErrors(errors);

      if (errors.length > 0) {
        setImportModal({ show: true, mode: "error", data: errors });
      } else {
        setImportModal({ show: true, mode: "preview", data: validRows });
      }
    } catch (error) {
      console.error("Error parsing CSV:", error);
      showToast("Error membaca file CSV: " + error.message, "error");
      setImportModal({ show: false, mode: "upload", data: null });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Execute bulk import ke database
   */
  const executeImport = async (validatedData) => {
    try {
      setLoading(true);
      setImportModal({ show: true, mode: "processing", data: null });
      setImportProgress({
        current: 0,
        total: validatedData.length,
        percentage: 0,
        status: "processing",
      });

      let successCount = 0;
      let errorCount = 0;
      let updateCount = 0;
      let insertCount = 0;
      const failedRows = [];

      // Process each row
      for (let i = 0; i < validatedData.length; i++) {
        const row = validatedData[i];

        try {
          let finalNIS = row.nis;

          // Generate NIS jika perlu
          if (row.needsNISGeneration) {
            finalNIS = await generateNISForGrade7(activeAcademicYear);
          }

          const studentData = {
            nis: finalNIS,
            full_name: row.full_name,
            gender: row.gender,
            class_id: row.class_id,
            academic_year: activeAcademicYear.year,
            academic_year_id: activeAcademicYear.id,
            is_active: true,
            updated_at: new Date().toISOString(),
          };

          if (row.isUpdate) {
            // UPDATE existing student
            const { error } = await supabase
              .from("students")
              .update({
                full_name: studentData.full_name,
                gender: studentData.gender,
                class_id: studentData.class_id,
                updated_at: studentData.updated_at,
              })
              .eq("nis", finalNIS);

            if (error) throw error;
            updateCount++;
          } else {
            // INSERT new student
            studentData.created_at = new Date().toISOString();

            const { error } = await supabase.from("students").insert([studentData]);

            if (error) throw error;
            insertCount++;
          }

          successCount++;
        } catch (error) {
          console.error(`Error processing row ${i + 1}:`, error);
          errorCount++;
          failedRows.push({
            row: i + 2,
            data: row,
            error: error.message,
          });
        }

        // Update progress
        setImportProgress({
          current: i + 1,
          total: validatedData.length,
          percentage: Math.round(((i + 1) / validatedData.length) * 100),
          status: "processing",
        });
      }

      // Show result
      const messages = [];
      if (insertCount > 0) messages.push(`✅ Insert: ${insertCount}`);
      if (updateCount > 0) messages.push(`🔄 Update: ${updateCount}`);
      if (errorCount > 0) messages.push(`❌ Gagal: ${errorCount}`);

      showToast(messages.join(" | "), successCount > 0 ? "success" : "error");

      if (failedRows.length > 0) {
        console.error("Failed rows:", failedRows);
        setImportErrors(failedRows);
        setImportModal({ show: true, mode: "error", data: failedRows });
      } else {
        setImportProgress({
          current: 0,
          total: 0,
          percentage: 0,
          status: "complete",
        });
        setImportModal({
          show: true,
          mode: "success",
          data: { insertCount, updateCount },
        });
      }

      // Reload data
      await loadSchoolData();
    } catch (error) {
      console.error("Execute import error:", error);
      showToast("Error saat import: " + error.message, "error");
      setImportProgress({
        current: 0,
        total: 0,
        percentage: 0,
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Download template CSV sesuai scope
   */
  const downloadCSVTemplate = () => {
    let template;
    let filename;

    if (importScope.type === "grade7") {
      // Template untuk kelas 7 (tanpa NIS)
      template = [
        ["full_name", "gender", "class_id"],
        ["CONTOH SISWA 1", "L", "7A"],
        ["CONTOH SISWA 2", "P", "7B"],
      ];
      filename = "template_import_kelas7.csv";
    } else if (importScope.type === "grade8") {
      // Template untuk kelas 8 (dengan NIS)
      const [start, end] = activeAcademicYear.year.split("/");
      const prevStart = String(parseInt(start) - 1).slice(-2);
      const prevEnd = String(parseInt(end) - 1).slice(-2);

      template = [
        ["nis", "full_name", "gender", "class_id"],
        [`${prevStart}.${prevEnd}.07.001`, "CONTOH SISWA 1", "L", "8A"],
        [`${prevStart}.${prevEnd}.07.002`, "CONTOH SISWA 2", "P", "8B"],
      ];
      filename = "template_import_kelas8.csv";
    } else if (importScope.type === "grade9") {
      // Template untuk kelas 9 (dengan NIS)
      const [start, end] = activeAcademicYear.year.split("/");
      const prevStart = String(parseInt(start) - 2).slice(-2);
      const prevEnd = String(parseInt(end) - 2).slice(-2);

      template = [
        ["nis", "full_name", "gender", "class_id"],
        [`${prevStart}.${prevEnd}.07.001`, "CONTOH SISWA 1", "L", "9A"],
        [`${prevStart}.${prevEnd}.07.002`, "CONTOH SISWA 2", "P", "9B"],
      ];
      filename = "template_import_kelas9.csv";
    } else {
      // Template all (flexible)
      template = [
        ["nis", "full_name", "gender", "class_id"],
        ["", "SISWA BARU KELAS 7", "L", "7A"],
        ["24.25.07.001", "SISWA EXISTING KELAS 8", "P", "8A"],
        ["23.24.07.001", "SISWA EXISTING KELAS 9", "L", "9A"],
      ];
      filename = "template_import_all.csv";
    }

    const csv = Papa.unparse(template);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);

    showToast("Template CSV berhasil didownload", "success");
  };

  const uniqueClassNames = [...new Set(availableClasses.map((c) => c.id))].sort();

  if (loading && !activeAcademicYear) {
    return (
      <div className="flex items-center justify-center p-8 sm:p-12 bg-gradient-to-br from-blue-50/50 to-white dark:from-gray-900 dark:to-gray-800 min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400 text-sm sm:text-base font-medium">
            Memuat data sekolah...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 transition-colors duration-200 bg-gradient-to-br from-blue-50/50 to-white dark:from-gray-900 dark:to-gray-800 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
              Manajemen Sekolah
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
              {SMP_CONFIG.schoolName} - {SMP_CONFIG.schoolLevel}
              {activeAcademicYear && (
                <span className="ml-2 text-blue-600 dark:text-blue-400 font-semibold">
                  ({activeAcademicYear.year})
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm"
            aria-label="Toggle menu mobile"
          >
            <Plus
              size={20}
              className={`transform transition-transform ${
                mobileMenuOpen ? "rotate-45" : ""
              } text-gray-700 dark:text-gray-300`}
            />
          </button>
        </div>
      </div>

      {/* ✅ INFO BANNER TAHUN AJARAN */}
      {activeAcademicYear ? (
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center">
                <BookOpen className="text-white" size={20} />
              </div>
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                  📅 Tahun Ajaran Aktif
                </p>
                <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                  {activeAcademicYear.year}
                </p>
              </div>
            </div>
            {onNavigateToYearTransition && (
              <button
                onClick={onNavigateToYearTransition}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md"
              >
                <ArrowRight size={16} />
                <span>Kelola Tahun Ajaran</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-4 rounded-xl border border-red-200 dark:border-red-800 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 dark:bg-red-500 rounded-lg flex items-center justify-center">
                <X className="text-white" size={20} />
              </div>
              <div>
                <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                  ⚠️ Tidak Ada Tahun Ajaran Aktif
                </p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  Silakan aktifkan tahun ajaran di Settings untuk mengelola data siswa
                </p>
              </div>
            </div>
            {onNavigateToYearTransition && (
              <button
                onClick={onNavigateToYearTransition}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md"
              >
                <ArrowRight size={16} />
                <span>Atur Tahun Ajaran</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ✅ WARNING SISWA TAHUN LAMA */}
      {showOldYearWarning && oldYearStudents > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-4 rounded-xl border border-yellow-300 dark:border-yellow-700 mb-6 animate-pulse">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500 dark:bg-yellow-600 rounded-lg flex items-center justify-center">
                <Users className="text-white" size={20} />
              </div>
              <div>
                <p className="text-sm text-yellow-800 dark:text-yellow-300 font-bold">
                  ⚠️ PERHATIAN: Ada Siswa dari Tahun Ajaran Lama!
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                  <strong>{oldYearStudents} siswa</strong> masih menggunakan tahun ajaran lama dan
                  perlu di-update
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {onNavigateToYearTransition && (
                <button
                  onClick={onNavigateToYearTransition}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-800 text-white rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md"
                >
                  <ArrowRight size={16} />
                  <span>Proses Perpindahan</span>
                </button>
              )}
              <button
                onClick={() => setShowOldYearWarning(false)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition-all"
              >
                <X size={16} />
                <span>Tutup</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATS CARDS dengan dark mode */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10 p-4 sm:p-5 rounded-xl border border-blue-200 dark:border-blue-800 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <Users className="text-blue-600 dark:text-blue-400" size={20} />
            <span className="text-blue-900 dark:text-blue-300 font-semibold text-sm">
              Total Siswa
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
            {schoolStats.total_students}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-900/10 p-4 sm:p-5 rounded-xl border border-green-200 dark:border-green-800 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <UserCheck className="text-green-600 dark:text-green-400" size={20} />
            <span className="text-green-900 dark:text-green-300 font-semibold text-sm">
              Total Guru
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
            {schoolStats.total_teachers}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-900/10 p-4 sm:p-5 rounded-xl border border-purple-200 dark:border-purple-800 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="text-purple-600 dark:text-purple-400" size={20} />
            <span className="text-purple-900 dark:text-purple-300 font-semibold text-sm">
              Kelas
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">
            {Object.keys(studentsByClass).length}
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-900/10 p-4 sm:p-5 rounded-xl border border-orange-200 dark:border-orange-800 transition-all duration-200 hover:shadow-md relative group cursor-help">
          <div className="flex items-center gap-2 mb-3">
            <Plus className="text-orange-600 dark:text-orange-400" size={20} />
            <span className="text-orange-900 dark:text-orange-300 font-semibold text-sm">
              Siswa Baru
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">
            {schoolStats.active_siswa_baru}
          </p>

          {schoolStats.siswa_baru_year && schoolStats.active_siswa_baru > 0 && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 hidden group-hover:block z-50">
              <div className="bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-lg px-4 py-3 shadow-2xl whitespace-nowrap">
                <div className="font-bold text-center text-sm">
                  {schoolStats.active_siswa_baru} siswa diterima
                </div>
                <div className="text-blue-50 text-xs text-center mt-1">
                  Untuk Tahun Ajaran {schoolStats.siswa_baru_year}
                </div>
              </div>
              <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-emerald-600 mx-auto"></div>
            </div>
          )}
        </div>
      </div>

      {/* ✅ READ-ONLY: DAFTAR GURU SECTION */}
      <div className="mb-6 sm:mb-8">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 sm:p-5 rounded-xl mb-4 border border-blue-200 dark:border-blue-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <UserCheck className="text-blue-600 dark:text-blue-400" size={24} />
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                  Daftar Guru & Staff
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Untuk mengelola data guru, silakan ke halaman User Management
                </p>
              </div>
            </div>
            {onNavigateToUserManagement && (
              <button
                onClick={onNavigateToUserManagement}
                className="flex items-center justify-center gap-2 px-4 sm:px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-700 dark:hover:from-blue-800 dark:hover:to-blue-900 text-white rounded-xl text-sm sm:text-base font-semibold transition-all active:scale-[0.98] min-h-[44px] shadow-md hover:shadow-lg whitespace-nowrap"
              >
                <Users size={16} />
                <span>Kelola User & Guru</span>
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>

        {/* ✅ READ-ONLY: TABEL GURU */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <table className="w-full min-w-[600px]">
            <thead className="bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-gray-800 dark:to-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Nama Guru
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                  ID Guru
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Wali Kelas
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {teachers.length > 0 ? (
                teachers.map((teacher) => (
                  <tr
                    key={teacher.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      !teacher.is_active ? "opacity-60" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {teacher.full_name}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-blue-600 dark:text-blue-400">
                      {teacher.teacher_id || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-lg capitalize font-medium">
                        {teacher.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {teacher.homeroom_class_id ? (
                        <span className="inline-block px-3 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-lg font-medium">
                          Kelas {teacher.homeroom_class_id}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                          teacher.is_active
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            teacher.is_active
                              ? "bg-green-500 dark:bg-green-400"
                              : "bg-gray-400 dark:bg-gray-500"
                          }`}
                        ></span>
                        {teacher.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="5"
                    className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-base"
                  >
                    Tidak ada data guru
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✅ MANAGEMENT SISWA SECTION */}
      <div className="mb-6 sm:mb-8">
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white mb-4">
          Management Siswa
        </h3>

        {/* FILTER SISWA */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-gray-700 mb-4 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Cari Siswa
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={studentFilters.search}
                  onChange={(e) =>
                    setStudentFilters((prev) => ({
                      ...prev,
                      search: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 pl-11 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-3 focus:ring-green-500/50 focus:border-green-500 dark:focus:ring-green-400/50 transition-all bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white"
                  placeholder="Cari berdasarkan nama atau NIS..."
                />
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>

            <div className="w-full md:w-48">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Filter Kelas
              </label>
              <select
                value={studentFilters.kelas}
                onChange={(e) =>
                  setStudentFilters((prev) => ({
                    ...prev,
                    kelas: e.target.value,
                  }))
                }
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-3 focus:ring-green-500/50 focus:border-green-500 dark:focus:ring-green-400/50 transition-all bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white"
              >
                <option value="">Semua Kelas</option>
                {uniqueClassNames.map((className) => (
                  <option key={className} value={className}>
                    Kelas {className}
                  </option>
                ))}
              </select>
            </div>

            {/* ✅ TOMBOL TAMBAH SISWA & IMPORT CSV */}
            <div className="flex gap-3 w-full md:w-auto">
              <button
                onClick={() => openStudentModal("add")}
                disabled={!activeAcademicYear || loading}
                className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-3 rounded-xl text-sm sm:text-base font-semibold transition-all min-h-[44px] shadow-md ${
                  !activeAcademicYear || loading
                    ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed opacity-60"
                    : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 dark:from-green-700 dark:hover:from-green-800 dark:hover:to-emerald-800 text-white hover:shadow-lg active:scale-[0.98]"
                }`}
              >
                <Plus size={16} />
                <span>Tambah Siswa</span>
              </button>

              {/* ✅ BUTTON IMPORT BARU */}
              <button
                onClick={() => setImportModal({ show: true, mode: "upload", data: null })}
                disabled={!activeAcademicYear || loading}
                className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-3 rounded-xl text-sm sm:text-base font-semibold transition-all min-h-[44px] shadow-md ${
                  !activeAcademicYear || loading
                    ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed opacity-60"
                    : "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white hover:shadow-lg active:scale-[0.98]"
                }`}
              >
                <Upload size={16} />
                <span>Import CSV</span>
              </button>
            </div>
          </div>

          {!activeAcademicYear && (
            <p className="text-red-600 dark:text-red-400 text-xs mt-2 font-medium text-center">
              ⚠️ Aktifkan tahun ajaran terlebih dahulu
            </p>
          )}

          {/* Pesan filter aktif */}
          {(studentFilters.kelas || studentFilters.search) && (
            <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                Menampilkan {filteredStudents().length} siswa
                {studentFilters.kelas && ` dari Kelas ${studentFilters.kelas}`}
                {studentFilters.search && ` dengan pencarian "${studentFilters.search}"`}
              </p>
            </div>
          )}
        </div>

        {/* TABEL SISWA */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <table className="w-full min-w-[600px]">
            <thead className="bg-gradient-to-r from-green-50 to-green-100/50 dark:from-gray-800 dark:to-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                  NIS
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Nama Siswa
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Jenis Kelamin
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Kelas
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {filteredStudents().length > 0 ? (
                filteredStudents().map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {student.nis}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                      {student.full_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {student.gender === "L" ? "Laki-laki" : "Perempuan"}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={student.class_id || ""}
                        onChange={(e) => updateStudentClass(student.id, e.target.value || null)}
                        disabled={loading}
                        className="text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 disabled:opacity-50 bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white transition-colors"
                      >
                        <option value="">Pilih Kelas</option>
                        {availableClasses.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            Kelas {cls.id}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-3 py-1 text-sm rounded-lg font-medium ${
                          student.is_active
                            ? "bg-gradient-to-r from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 text-green-800 dark:text-green-300"
                            : "bg-gradient-to-r from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 text-red-800 dark:text-red-300"
                        }`}
                      >
                        {student.is_active ? "Aktif" : "Tidak Aktif"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openStudentModal("edit", student)}
                          disabled={loading}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg disabled:opacity-50 transition-colors"
                          title="Edit Siswa"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteConfirm({
                              show: true,
                              type: "student",
                              data: student,
                            })
                          }
                          disabled={loading}
                          className="p-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50 transition-colors"
                          title="Hapus Siswa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-base"
                  >
                    {students.length === 0
                      ? "Tidak ada data siswa"
                      : "Tidak ditemukan siswa yang sesuai dengan filter"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DISTRIBUSI KELAS */}
      <div>
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white mb-4">
          Distribusi Siswa per Kelas
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {Object.entries(studentsByClass)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([className, students]) => (
              <div
                key={className}
                className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-5 bg-white dark:bg-gray-800 transition-all duration-200 hover:shadow-md"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-gray-800 dark:text-white text-base">
                    Kelas {className}
                  </h4>
                  <span className="text-sm bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-lg font-semibold">
                    {students.length} siswa
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 max-h-20 overflow-y-auto pr-2">
                  {students
                    .slice(0, 5)
                    .map((s) => s.full_name)
                    .join(", ")}
                  {students.length > 5 && ` +${students.length - 5} lainnya`}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* MODALS - HANYA UNTUK SISWA */}
      {studentModal.show && (
        <StudentModal
          modal={studentModal}
          setModal={setStudentModal}
          form={studentForm}
          setForm={setStudentForm}
          loading={loading}
          availableClasses={availableClasses}
          onSubmit={studentModal.mode === "add" ? handleAddStudent : handleEditStudent}
          onCancel={() => {
            setStudentModal({ show: false, mode: "add", data: null });
            setStudentForm({
              nis: "",
              full_name: "",
              gender: "L",
              class_id: "",
              is_active: true,
            });
          }}
        />
      )}

      {deleteConfirm.show && (
        <DeleteConfirmModal
          confirm={deleteConfirm}
          loading={loading}
          onConfirm={() => {
            handleDeleteStudent(deleteConfirm.data.id);
          }}
          onCancel={() => setDeleteConfirm({ show: false, type: "", data: null })}
        />
      )}

      {/* ✅ BULK IMPORT MODALS */}

      {/* Import Modal - Upload Step */}
      {importModal.show && importModal.mode === "upload" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-5 rounded-t-2xl flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Upload size={24} />
                <div>
                  <h2 className="text-xl font-bold">Import Siswa dari CSV</h2>
                  <p className="text-purple-100 text-sm">Upload file CSV untuk import data siswa</p>
                </div>
              </div>
              <button
                onClick={() => setImportModal({ show: false, mode: "upload", data: null })}
                className="p-2 hover:bg-purple-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Scope Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  📌 Pilih Scope Import
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer">
                    <input
                      type="radio"
                      name="importScope"
                      checked={importScope.type === "grade7"}
                      onChange={() => setImportScope({ type: "grade7", value: null })}
                      className="w-4 h-4 text-purple-600"
                    />
                    <div>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        Kelas 7 (Siswa Baru)
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Auto-generate NIS, template tanpa kolom NIS
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer">
                    <input
                      type="radio"
                      name="importScope"
                      checked={importScope.type === "grade8"}
                      onChange={() => setImportScope({ type: "grade8", value: null })}
                      className="w-4 h-4 text-purple-600"
                    />
                    <div>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        Kelas 8 (Update Data)
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        NIS wajib ada, template dengan kolom NIS
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer">
                    <input
                      type="radio"
                      name="importScope"
                      checked={importScope.type === "grade9"}
                      onChange={() => setImportScope({ type: "grade9", value: null })}
                      className="w-4 h-4 text-purple-600"
                    />
                    <div>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        Kelas 9 (Update Data)
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        NIS wajib ada, template dengan kolom NIS
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer">
                    <input
                      type="radio"
                      name="importScope"
                      checked={importScope.type === "all"}
                      onChange={() => setImportScope({ type: "all", value: null })}
                      className="w-4 h-4 text-purple-600"
                    />
                    <div>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        Semua Kelas (Smart Mode)
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Auto-detect per row, NIS optional
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  📁 Upload File CSV
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-purple-500 dark:hover:border-purple-400 transition-colors">
                  <Upload size={48} className="mx-auto mb-4 text-gray-400" />
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => {
                      if (e.target.files[0]) {
                        handleCSVImport(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                    id="csv-upload-input"
                  />
                  <label
                    htmlFor="csv-upload-input"
                    className="cursor-pointer text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium text-lg"
                  >
                    Pilih file CSV atau Excel
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    atau drag & drop file di sini
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Maksimal ukuran file: 10MB
                  </p>
                </div>
              </div>

              {/* Download Template */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <FileText className="text-blue-600 dark:text-blue-400 mt-1" size={20} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
                      💡 Belum punya template CSV?
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-400 mb-3">
                      Download template sesuai scope yang dipilih di atas
                    </p>
                    <button
                      onClick={downloadCSVTemplate}
                      disabled={!importScope.type}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download size={16} />
                      Download Template
                    </button>
                  </div>
                </div>
              </div>

              {/* Format Info */}
              <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  📋 Format CSV:
                </p>
                {importScope.type === "grade7" ? (
                  <code className="text-xs text-gray-700 dark:text-gray-300 block mb-2">
                    full_name,gender,class_id
                  </code>
                ) : (
                  <code className="text-xs text-gray-700 dark:text-gray-300 block mb-2">
                    nis,full_name,gender,class_id
                  </code>
                )}
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Gender: L (Laki-laki) atau P (Perempuan)</li>
                  <li>• Class ID: Sesuai kelas yang tersedia (7A, 7B, 8A, dll)</li>
                  {importScope.type !== "grade7" && (
                    <li>• NIS: Format XX.XX.07.XXX (wajib ada untuk kelas 8/9)</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal - Preview Step */}
      {importModal.show && importModal.mode === "preview" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white p-5 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <CheckSquare size={24} />
                <div>
                  <h2 className="text-xl font-bold">Preview Import</h2>
                  <p className="text-green-100 text-sm">
                    {importPreview.validCount} siswa siap diimport
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Total Data</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                    {importPreview.totalCount}
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-700 dark:text-green-300 font-medium">Valid</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                    {importPreview.validCount}
                  </p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium">Error</p>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">
                    {importPreview.invalidCount}
                  </p>
                </div>
              </div>

              {/* Academic Year Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  📅 Akan diimport ke tahun ajaran: <strong>{activeAcademicYear?.year}</strong>
                </p>
              </div>

              {/* Preview Table */}
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                        No
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                        NIS
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                        Nama
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                        Gender
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                        Kelas
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                        Mode
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {importPreview.validRows.slice(0, 50).map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{idx + 1}</td>
                        <td className="px-4 py-3 font-mono text-blue-600 dark:text-blue-400">
                          {row.nis || <span className="text-gray-400 italic">Auto-generate</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-200">
                          {row.full_name}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{row.gender}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-medium">
                            {row.class_id}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {row.isUpdate ? (
                            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded text-xs font-medium">
                              Update
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs font-medium">
                              Insert
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importPreview.validRows.length > 50 && (
                  <div className="p-4 text-center bg-gray-50 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      ... dan {importPreview.validRows.length - 50} siswa lainnya
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => executeImport(importPreview.validRows)}
                  disabled={loading || importPreview.validCount === 0}
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all active:scale-[0.98] min-h-[44px] shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ✅ Import {importPreview.validCount} Siswa
                </button>
                <button
                  onClick={() => setImportModal({ show: false, mode: "upload", data: null })}
                  disabled={loading}
                  className="px-5 py-3 bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:from-gray-400 hover:to-gray-500 dark:hover:from-gray-700 dark:hover:to-gray-800 font-semibold transition-all active:scale-[0.98] min-h-[44px] shadow-md disabled:opacity-50"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal - Error Step */}
      {importModal.show && importModal.mode === "error" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-red-600 to-red-700 text-white p-5 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <AlertCircle size={24} />
                <div>
                  <h2 className="text-xl font-bold">Error Validasi</h2>
                  <p className="text-red-100 text-sm">{importErrors.length} baris bermasalah</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Error List */}
              <div className="max-h-96 overflow-y-auto space-y-3">
                {importErrors.map((err, idx) => (
                  <div
                    key={idx}
                    className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-red-600 dark:bg-red-700 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {err.row}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
                          Baris {err.row}
                        </p>
                        {err.data && (
                          <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-mono bg-white dark:bg-gray-700 p-2 rounded">
                            {JSON.stringify(err.data, null, 2)}
                          </div>
                        )}
                        <ul className="text-sm text-red-700 dark:text-red-400 space-y-1">
                          {err.errors?.map((e, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-red-500 mt-0.5">•</span>
                              <span>{e}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  💡 <strong>Perbaiki error di atas</strong>, lalu upload ulang file CSV yang sudah
                  diperbaiki.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setImportModal({ show: true, mode: "upload", data: null })}
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all active:scale-[0.98] min-h-[44px] shadow-md hover:shadow-lg"
                >
                  ⬅️ Kembali ke Upload
                </button>
                <button
                  onClick={() => setImportModal({ show: false, mode: "upload", data: null })}
                  className="px-5 py-3 bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:from-gray-400 hover:to-gray-500 dark:hover:from-gray-700 dark:hover:to-gray-800 font-semibold transition-all active:scale-[0.98] min-h-[44px] shadow-md"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal - Processing Step */}
      {importModal.show && importModal.mode === "processing" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700">
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 dark:border-purple-400 mx-auto mb-4"></div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                Memproses Import...
              </h3>
              {importProgress.total > 0 && (
                <>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {importProgress.current} / {importProgress.total} siswa
                  </p>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-600 to-purple-700 h-full transition-all duration-300"
                      style={{ width: `${importProgress.percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {importProgress.percentage}%
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import Modal - Success Step */}
      {importModal.show && importModal.mode === "success" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 rounded-t-2xl text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckSquare size={32} />
              </div>
              <h2 className="text-2xl font-bold">Import Berhasil!</h2>
            </div>

            <div className="p-8 text-center">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl">
                  <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                    Siswa Baru
                  </p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                    {importModal.data?.insertCount || 0}
                  </p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">
                    Data Diupdate
                  </p>
                  <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                    {importModal.data?.updateCount || 0}
                  </p>
                </div>
              </div>

              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Total{" "}
                <strong>
                  {(importModal.data?.insertCount || 0) + (importModal.data?.updateCount || 0)}
                </strong>{" "}
                siswa berhasil diproses.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setImportModal({ show: false, mode: "upload", data: null });
                    loadSchoolData();
                  }}
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all active:scale-[0.98] min-h-[44px] shadow-md hover:shadow-lg"
                >
                  ✅ Tutup
                </button>
                <button
                  onClick={() => setImportModal({ show: true, mode: "upload", data: null })}
                  className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all active:scale-[0.98] min-h-[44px] shadow-md hover:shadow-lg"
                >
                  Import Lagi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolManagementTab;
