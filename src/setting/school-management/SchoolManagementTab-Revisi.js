// SchoolManagementTab.js - REFACTORED VERSION DENGAN ACADEMIC YEAR SERVICE
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import {
  Plus,
  Users,
  UserCheck,
  BookOpen,
  Edit3,
  Trash2,
  ArrowRight,
  Search,
  Download,
  Upload,
  X,
} from "lucide-react";

// ✅ 1. IMPORT ACADEMIC YEAR SERVICE SESUAI DOKUMENTASI
import { getActiveAcademicInfo, applyAcademicFilters } from "../../services/academicYearService";

import { StudentModal, DeleteConfirmModal } from "./StudentModals";
import { ImportModal, exportStudentsToExcel } from "./BulkImportModals";
import { useStudentManagement } from "./StudentManagement";

// SMP Config - DI LUAR COMPONENT BIAR GA DUPLIKAT
const SMP_CONFIG = {
  schoolName: "SMP Muslimin Cililin",
  schoolLevel: "SMP",
  grades: ["7", "8", "9"],
};

const SchoolManagementTab = ({
  user,
  loading,
  setLoading,
  showToast,
  onNavigateToUserManagement,
  onNavigateToYearTransition,
}) => {
  console.log("🔄 SchoolManagementTab RE-RENDER");

  // State untuk data sekolah
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentsByClass, setStudentsByClass] = useState({});

  // ✅ 2. UPDATE STATE DENGAN ACADEMIC INFO LENGKAP
  const [academicInfo, setAcademicInfo] = useState(null);
  const [academicLoading, setAcademicLoading] = useState(true);

  const [oldYearStudents, setOldYearStudents] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showOldYearWarning, setShowOldYearWarning] = useState(false);
  const [schoolStats, setSchoolStats] = useState({
    total_students: 0,
    total_teachers: 0,
    active_siswa_baru: 0,
    siswa_baru_year: null,
  });
  const [studentFilters, setStudentFilters] = useState({
    kelas: "",
    search: "",
  });
  const [availableClasses, setAvailableClasses] = useState([]);

  // State untuk import/export
  const [importModal, setImportModal] = useState({
    show: false,
    mode: "upload",
    data: null,
  });
  const [importScope, setImportScope] = useState({
    type: "all",
    value: null,
  });
  const [importPreview, setImportPreview] = useState({
    rows: [],
    validRows: [],
    invalidRows: [],
    totalCount: 0,
    validCount: 0,
    invalidCount: 0,
  });
  const [importErrors, setImportErrors] = useState([]);
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
    percentage: 0,
    status: "idle",
  });

  // ✅ 3. LOAD ACADEMIC INFO DENGAN SERVICE (REPLACE MANUAL FETCH)
  const fetchAcademicInfo = useCallback(async () => {
    try {
      setAcademicLoading(true);
      const info = await getActiveAcademicInfo();

      if (!info) {
        console.warn("⚠️ No active academic year found");
        setAcademicInfo(null);
        return null;
      }

      setAcademicInfo(info);
      return info;
    } catch (error) {
      console.error("Error fetching academic info:", error);
      showToast("Error loading academic year: " + error.message, "error");
      setAcademicInfo(null);
      return null;
    } finally {
      setAcademicLoading(false);
    }
  }, [showToast]);

  // Load available classes
  const loadAvailableClasses = useCallback(
    async (academicYear) => {
      try {
        if (!academicYear) {
          console.warn("No academic year provided for loading classes");
          setAvailableClasses([]);
          return;
        }

        // ✅ 4. GUNAKAN APPLYACADEMICFILTERS UNTUK QUERY
        let query = supabase
          .from("classes")
          .select("id, grade, academic_year")
          .order("grade")
          .order("id");

        // Apply academic filters (filter by year saja, classes gak ada semester)
        query = await applyAcademicFilters(query, {
          filterYear: true,
          filterSemester: false, // Classes table doesn't have semester column
        });

        const { data: classesData, error } = await query;

        if (error) throw error;
        setAvailableClasses(classesData || []);
      } catch (error) {
        console.error("Error loading classes:", error);
        showToast("Error loading classes: " + error.message, "error");
      }
    },
    [showToast]
  );

  // ✅ 5. UPDATE LOAD SCHOOL DATA DENGAN ACADEMIC INFO
  const loadSchoolData = useCallback(async () => {
    try {
      setLoading(true);

      // Load academic info menggunakan service
      const academicInfo = await fetchAcademicInfo();

      if (!academicInfo) {
        showToast("Tidak ada tahun ajaran aktif!", "error");
        setLoading(false);
        return;
      }

      await loadAvailableClasses(academicInfo.year);

      // Load teachers
      const { data: teachersData, error: teachersError } = await supabase
        .from("users")
        .select("id, username, full_name, role, homeroom_class_id, is_active, teacher_id")
        .in("role", ["teacher", "guru_bk"])
        .order("teacher_id", { ascending: true, nullsFirst: false })
        .order("full_name", { ascending: true });

      if (teachersError) throw teachersError;

      // ✅ 6. LOAD STUDENTS DENGAN APPLYACADEMICFILTERS
      let studentsQuery = supabase
        .from("students")
        .select("id, nis, full_name, gender, class_id, is_active, academic_year, academic_year_id")
        .eq("is_active", true)
        .order("full_name");

      // Apply academic filters untuk students
      studentsQuery = await applyAcademicFilters(studentsQuery, {
        filterYear: true,
        filterYearId: true,
      });

      const { data: studentsData, error: studentsError } = await studentsQuery;

      if (studentsError) throw studentsError;

      // ✅ 7. LOAD CLASSES DENGAN APPLYACADEMICFILTERS
      let classesQuery = supabase
        .from("classes")
        .select("id, grade, academic_year")
        .order("grade")
        .order("id");

      // Apply academic filters untuk classes
      classesQuery = await applyAcademicFilters(classesQuery, {
        filterYear: true,
        filterSemester: false, // Classes table doesn't have semester
      });

      const { data: classesData, error: classesError } = await classesQuery;

      if (classesError) throw classesError;

      // ✅ 8. CEK SISWA TAHUN AJARAN LAMA DENGAN YEAR ID
      if (academicInfo.yearId) {
        const { count: oldCount, error: oldCountError } = await supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true)
          .neq("academic_year_id", academicInfo.yearId);

        if (!oldCountError && oldCount > 0) {
          setOldYearStudents(oldCount);
          setShowOldYearWarning(true);
        } else {
          setOldYearStudents(0);
          setShowOldYearWarning(false);
        }
      }

      // Process students with class info
      const studentsWithClass = (studentsData || []).map((student) => {
        const studentClass = classesData.find((c) => c.id === student.class_id);
        return {
          ...student,
          classes: studentClass ? { name: studentClass.id, grade: studentClass.grade } : null,
        };
      });

      // ✅ 9. KALKULASI NEXT YEAR (HARUS TETAP KARENA UNTUK SISWA BARU)
      const calculateNextYear = (currentYear) => {
        if (!currentYear || !currentYear.includes("/")) return null;
        const [start, end] = currentYear.split("/").map(Number);
        return `${start + 1}/${end + 1}`;
      };

      const nextYear = calculateNextYear(academicInfo.year);

      // Load siswa baru untuk tahun ajaran berikutnya
      const { data: siswaBaru } = await supabase
        .from("siswa_baru")
        .select("id, nama_lengkap, academic_year, status")
        .eq("status", "diterima")
        .eq("academic_year", nextYear);

      // Group students by class
      const studentsByClass = {};
      studentsWithClass.forEach((student) => {
        const className = student.classes?.name || "Belum Ada Kelas";
        if (!studentsByClass[className]) {
          studentsByClass[className] = [];
        }
        studentsByClass[className].push(student);
      });

      // Update states
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
      setIsInitialLoad(false);
    }
  }, [fetchAcademicInfo, loadAvailableClasses, setLoading, showToast]);

  // Use custom hook untuk student management
  const {
    studentModal,
    setStudentModal,
    deleteConfirm,
    setDeleteConfirm,
    studentForm,
    setStudentForm,
    openStudentModal,
    handleAddStudent,
    handleEditStudent,
    handleDeleteStudent,
    updateStudentClass,
  } = useStudentManagement({
    academicInfo, // ✅ 10. PASS ACADEMIC INFO (ganti activeAcademicYear)
    availableClasses,
    setLoading,
    showToast,
    loadSchoolData,
  });

  // Load data on mount
  useEffect(() => {
    loadSchoolData();
  }, [loadSchoolData]);

  // Filter students
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

  // Handler untuk execute import
  const handleExecuteImport = async (validatedData) => {
    try {
      const { executeImport } = await import("./BulkImportModals");
      const result = await executeImport(
        validatedData,
        academicInfo, // ✅ 11. PASS ACADEMIC INFO
        setImportProgress,
        showToast
      );

      if (result.failedRows.length === 0) {
        setImportModal({ show: true, mode: "success", data: result });
      } else {
        setImportErrors(result.failedRows);
        setImportModal({ show: true, mode: "error", data: result.failedRows });
      }

      await loadSchoolData();
    } catch (error) {
      showToast("Error saat import: " + error.message, "error");
    }
  };

  // Handler untuk export Excel
  const handleExportExcel = () => {
    try {
      const result = exportStudentsToExcel(
        filteredStudents(),
        importScope,
        academicInfo // ✅ 12. PASS ACADEMIC INFO
      );
      showToast(`✅ Berhasil export ${result.count} siswa ke Excel`, "success");
    } catch (error) {
      showToast(`Error export Excel: ${error.message}`, "error");
    }
  };

  // Helper functions
  const uniqueClassNames = [...new Set(availableClasses.map((c) => c.id))].sort();

  // ✅ 13. UPDATE WARNING UNTUK ACADEMIC INFO
  useEffect(() => {
    if (!loading && !isInitialLoad && !academicInfo && !academicLoading) {
      showToast(
        "⚠️ PERHATIAN: Tidak ada tahun ajaran aktif! Silakan ke Settings → Academic Year untuk mengatur tahun ajaran.",
        "warning"
      );
    }
  }, [academicInfo, loading, isInitialLoad, academicLoading, showToast]);

  // ✅ 14. UPDATE LOADING STATE DENGAN ACADEMIC LOADING
  if ((loading || academicLoading) && !academicInfo) {
    return (
      <div className="flex items-center justify-center p-8 sm:p-12 bg-gradient-to-br from-blue-50/50 to-white dark:from-gray-900 dark:to-gray-800 min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400 text-sm sm:text-base font-medium">
            Memuat tahun ajaran dan data sekolah...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 transition-colors duration-200 bg-gradient-to-br from-blue-50/50 to-white dark:from-gray-900 dark:to-gray-800 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
            Manajemen Sekolah
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
            {SMP_CONFIG.schoolName} - {SMP_CONFIG.schoolLevel}
            {/* ✅ 15. UPDATE DISPLAY DENGAN SEMESTER INFO */}
            {academicInfo && (
              <span className="ml-2 text-blue-600 dark:text-blue-400 font-semibold">
                (
                {academicInfo.displayText ||
                  `${academicInfo.year} - Semester ${academicInfo.semester}`}
                )
              </span>
            )}
          </p>
        </div>
      </div>

      {/* ✅ 16. UPDATE ACADEMIC YEAR BANNER */}
      {academicInfo ? (
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
                  {academicInfo.year}
                </p>
                {academicInfo.semester && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Semester {academicInfo.semester} • {academicInfo.semesterText}
                  </p>
                )}
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
                <BookOpen className="text-white" size={20} />
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

      {/* WARNING SISWA TAHUN LAMA */}
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

      {/* STATS CARDS */}
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
          {academicInfo && (
            <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
              Tahun {academicInfo.year}
            </p>
          )}
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

      {/* READ-ONLY: DAFTAR GURU SECTION */}
      <div className="mb-6 sm:mb-8">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 sm:p-5 rounded-xl mb-4 border border-blue-200 dark:border-blue-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <UserCheck className="text-blue-600 dark:text-blue-400" size={24} />
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                  Daftar Guru
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

        {/* READ-ONLY: TABEL GURU */}
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

      {/* MANAGEMENT SISWA SECTION */}
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

            {/* TOMBOL TAMBAH SISWA & IMPORT CSV & EXPORT */}
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

              <button
                onClick={handleExportExcel}
                disabled={!activeAcademicYear || loading || filteredStudents().length === 0}
                className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-3 rounded-xl text-sm sm:text-base font-semibold transition-all min-h-[44px] shadow-md ${
                  !activeAcademicYear || loading || filteredStudents().length === 0
                    ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed opacity-60"
                    : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white hover:shadow-lg active:scale-[0.98]"
                }`}
              >
                <Download size={16} />
                <span>Export Excel</span>
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

      {/* BULK IMPORT MODAL */}
      <ImportModal
        modal={importModal}
        setModal={setImportModal}
        importScope={importScope}
        setImportScope={setImportScope}
        importPreview={importPreview}
        setImportPreview={setImportPreview}
        importErrors={importErrors}
        setImportErrors={setImportErrors}
        importProgress={importProgress}
        setImportProgress={setImportProgress}
        activeAcademicYear={activeAcademicYear}
        availableClasses={availableClasses}
        onExecuteImport={handleExecuteImport}
        loading={loading}
        showToast={showToast}
      />
    </div>
  );
};

export default SchoolManagementTab;
