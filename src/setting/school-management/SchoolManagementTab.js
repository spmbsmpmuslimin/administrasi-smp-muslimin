// SchoolManagementTab.js - REFACTORED VERSION
import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { getActiveAcademicYear } from "../../services/academicYearService";
import {
  Plus,
  Users,
  UserCheck,
  BookOpen,
  Edit3,
  Trash2,
  ArrowRight,
  Search,
  X, // ✅ TAMBAH INI
  History,
} from "lucide-react";

import { StudentModal, DeleteConfirmModal } from "./StudentModals";
import { useStudentManagement } from "./StudentManagement";
import RiwayatMutasiTab from "./RiwayatMutasiTab";

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

  const [searchParams] = useSearchParams();

  // Tab switcher: Guru & Staf | Data Siswa | Riwayat Mutasi
  const [activeSchoolTab, setActiveSchoolTab] = useState("guru");

  // Deep-link dari Data Siswa (tombol "Lihat Riwayat") ->
  // ?tab=school&schooltab=mutasi&student=<id> -- otomatis pindah ke tab
  // Riwayat Mutasi. Query param "student"-nya sendiri dibaca langsung
  // oleh RiwayatMutasiTab, di sini cuma perlu mindahin tab-nya.
  useEffect(() => {
    const schoolTabParam = searchParams.get("schooltab");
    if (schoolTabParam === "mutasi") {
      setActiveSchoolTab("mutasi");
    }
  }, [searchParams]);

  // State untuk data sekolah
  const [teachers, setTeachers] = useState([]);
  const [teachersLoaded, setTeachersLoaded] = useState(false);
  const [students, setStudents] = useState([]);
  const [studentsByClass, setStudentsByClass] = useState({});
  // Count siswa per kelas (ringan - cuma angka, buat kartu distribusi &
  // stats, TANPA perlu download semua baris siswa)
  const [classCounts, setClassCounts] = useState({}); // { classId: count }
  const [classCountsLoading, setClassCountsLoading] = useState(false);
  const [activeAcademicYear, setActiveAcademicYear] = useState(null);
  const [oldYearStudents, setOldYearStudents] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showOldYearWarning, setShowOldYearWarning] = useState(false);
  const [schoolStats, setSchoolStats] = useState({
    total_students: 0,
    total_teachers: 0,
    active_siswa_baru: 0,
    siswa_baru_year: null,
  });
  // Filter siswa: jenjang WAJIB dipilih dulu, baru kelas muncul & data di-fetch
  const [studentFilters, setStudentFilters] = useState({
    jenjang: "",
    kelas: "",
    search: "",
  });
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [availableClasses, setAvailableClasses] = useState([]);

  // Fetch active academic year (via service - udah nanganin kasus 2 tahun
  // ajaran ke-mark aktif bersamaan, auto-fix ke yang paling baru. Bentuk
  // return tetap {id, year} biar StudentManagement.js
  // yang makan data ini gak perlu diubah)
  const fetchActiveAcademicYear = useCallback(async () => {
    try {
      const activeYear = await getActiveAcademicYear();
      if (!activeYear) return null;
      return { id: activeYear.activeSemesterId, year: activeYear.year };
    } catch (err) {
      console.error("Error in fetchActiveAcademicYear:", err);
      return null;
    }
  }, []);

  // Load available classes
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

  // ===== LOAD META (RINGAN) — jalan sekali di awal, TANPA nyentuh 662 baris siswa =====
  // Isinya: tahun ajaran aktif, daftar kelas, count total siswa (bukan baris),
  // count siswa tahun ajaran lama, siswa baru. Semua pakai count/head:true
  // atau tabel kecil, jadi cepat walau siswa 662.
  const loadMeta = useCallback(async () => {
    try {
      setLoading(true);

      const activeYear = await fetchActiveAcademicYear();

      if (!activeYear) {
        showToast("Tidak ada tahun ajaran aktif!", "error");
        setLoading(false);
        setIsInitialLoad(false);
        return;
      }

      setActiveAcademicYear(activeYear);
      await loadAvailableClasses(activeYear.year);

      // Total siswa aktif — HANYA COUNT, gak download baris
      const { count: totalStudents, error: totalError } = await supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .eq("academic_year", activeYear.year);

      if (totalError) throw totalError;

      // Siswa dari tahun ajaran lama — juga cuma count
      if (activeYear.id) {
        const { count: oldCount, error: oldCountError } = await supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true)
          .neq("academic_year_id", activeYear.id);

        if (!oldCountError && oldCount > 0) {
          setOldYearStudents(oldCount);
          setShowOldYearWarning(true);
        } else {
          setOldYearStudents(0);
          setShowOldYearWarning(false);
        }
      }

      // Siswa baru tahun depan
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

      setSchoolStats((prev) => ({
        ...prev,
        total_students: totalStudents || 0,
        active_siswa_baru: siswaBaru?.length || 0,
        siswa_baru_year: nextYear,
      }));
    } catch (error) {
      console.error("Error loading meta:", error);
      showToast("Error loading data sekolah: " + error.message, "error");
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [fetchActiveAcademicYear, loadAvailableClasses, setLoading, showToast]);

  // ===== LOAD GURU & STAF — dipanggil pas tab "Guru & Staf" dibuka (~30 baris, ringan) =====
  const loadTeachers = useCallback(async () => {
    try {
      setLoading(true);
      const { data: teachersData, error: teachersError } = await supabase
        .from("users")
        .select("id, username, full_name, role, homeroom_class_id, is_active, teacher_id")
        .in("role", ["teacher", "guru_bk"])
        .order("teacher_id", { ascending: true, nullsFirst: false })
        .order("full_name", { ascending: true });

      if (teachersError) throw teachersError;

      setTeachers(teachersData || []);
      setSchoolStats((prev) => ({
        ...prev,
        total_teachers: (teachersData || []).filter((t) => t.is_active).length,
      }));
      setTeachersLoaded(true);
    } catch (error) {
      console.error("Error loading teachers:", error);
      showToast("Error loading data guru: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  }, [setLoading, showToast]);

  // ===== LOAD CLASS COUNTS — count siswa per kelas (buat kartu Distribusi & dropdown Kelas) =====
  // Query per kelas pakai count/head:true, jadi TIDAK ada data baris siswa
  // yang ke-download, cuma angka. Dipanggil sekali pas tab "Data Siswa" dibuka.
  const loadClassCounts = useCallback(async () => {
    if (!availableClasses.length) return;
    try {
      setClassCountsLoading(true);
      const results = await Promise.all(
        availableClasses.map(async (cls) => {
          const { count } = await supabase
            .from("students")
            .select("id", { count: "exact", head: true })
            .eq("is_active", true)
            .eq("class_id", cls.id);
          return [cls.id, count || 0];
        })
      );
      setClassCounts(Object.fromEntries(results));
    } catch (error) {
      console.error("Error loading class counts:", error);
    } finally {
      setClassCountsLoading(false);
    }
  }, [availableClasses]);

  // ===== LOAD SISWA PER KELAS — inti dari fix ini. =====
  // Fetch HANYA siswa dari kelas yang dipilih (~30-40 baris), bukan semua 662.
  // classId "" (kosong tapi jenjang terisi) = load semua kelas dalam jenjang itu (~220 baris).
  const loadStudentsForClass = useCallback(
    async (jenjang, classId) => {
      if (!jenjang) {
        setStudents([]);
        setStudentsByClass({});
        return;
      }
      try {
        setStudentsLoading(true);
        setLoading(true);

        let query = supabase
          .from("students")
          .select(
            "id, nis, full_name, gender, class_id, is_active, academic_year, academic_year_id"
          )
          .eq("is_active", true);

        if (classId) {
          // 1 kelas spesifik dipilih -> paling ringan
          query = query.eq("class_id", classId);
        } else {
          // Cuma jenjang dipilih -> semua kelas di jenjang itu
          const classIdsInJenjang = availableClasses
            .filter((c) => String(c.grade) === String(jenjang))
            .map((c) => c.id);
          if (classIdsInJenjang.length === 0) {
            setStudents([]);
            setStudentsByClass({});
            setStudentsLoading(false);
            setLoading(false);
            return;
          }
          query = query.in("class_id", classIdsInJenjang);
        }

        const { data: studentsData, error: studentsError } = await query.order("full_name");
        if (studentsError) throw studentsError;

        const studentsWithClass = (studentsData || []).map((student) => {
          const studentClass = availableClasses.find((c) => c.id === student.class_id);
          return {
            ...student,
            classes: studentClass ? { name: studentClass.id, grade: studentClass.grade } : null,
          };
        });

        const grouped = {};
        studentsWithClass.forEach((student) => {
          const className = student.classes?.name || "Belum Ada Kelas";
          if (!grouped[className]) grouped[className] = [];
          grouped[className].push(student);
        });

        setStudents(studentsWithClass);
        setStudentsByClass(grouped);
      } catch (error) {
        console.error("Error loading students:", error);
        showToast("Error loading data siswa: " + error.message, "error");
      } finally {
        setStudentsLoading(false);
        setLoading(false);
      }
    },
    [availableClasses, setLoading, showToast]
  );

  // Dipanggil dari StudentManagement.js setelah tambah/edit/hapus,
  // supaya list ke-refresh mengikuti filter yang lagi aktif (bukan reload semua 662)
  const loadSchoolData = useCallback(async () => {
    await loadClassCounts();
    await loadStudentsForClass(studentFilters.jenjang, studentFilters.kelas);
  }, [loadClassCounts, loadStudentsForClass, studentFilters.jenjang, studentFilters.kelas]);

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
    activeAcademicYear,
    availableClasses,
    setLoading,
    showToast,
    loadSchoolData,
    currentUserId: user?.id,
  });

  // Load meta (ringan) sekali di awal — TIDAK fetch siswa
  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  // Lazy-load Guru & Staf pas tab-nya dibuka (sekali aja, cache selanjutnya)
  useEffect(() => {
    if (activeSchoolTab === "guru" && !teachersLoaded) {
      loadTeachers();
    }
  }, [activeSchoolTab, teachersLoaded, loadTeachers]);

  // Lazy-load class counts pas tab Data Siswa dibuka (buat kartu distribusi & dropdown)
  useEffect(() => {
    if (activeSchoolTab === "siswa" && availableClasses.length > 0) {
      loadClassCounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSchoolTab, availableClasses.length]);

  // Fetch siswa HANYA saat jenjang/kelas berubah (bukan sekaligus semua 662)
  useEffect(() => {
    if (activeSchoolTab === "siswa") {
      loadStudentsForClass(studentFilters.jenjang, studentFilters.kelas);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSchoolTab, studentFilters.jenjang, studentFilters.kelas]);

  // Filter students — sekarang cuma filter SEARCH di JS (kelas & jenjang udah
  // difilter dari server, jadi scope-nya kecil, bukan 662 baris lagi)
  const filteredStudents = useCallback(() => {
    return students.filter((student) => {
      const matchesSearch =
        !studentFilters.search ||
        student.full_name.toLowerCase().includes(studentFilters.search.toLowerCase()) ||
        student.nis.toLowerCase().includes(studentFilters.search.toLowerCase());
      return matchesSearch;
    });
  }, [students, studentFilters.search]);

  // Dropdown Kelas: hanya kelas dalam jenjang yang sedang dipilih
  const classesInSelectedJenjang = availableClasses.filter(
    (c) => String(c.grade) === String(studentFilters.jenjang)
  );

  // Warning saat tidak ada tahun ajaran aktif
  useEffect(() => {
    if (!loading && !isInitialLoad && !activeAcademicYear) {
      showToast(
        "⚠️ PERHATIAN: Tidak ada tahun ajaran aktif! Silakan ke Settings → Academic Year untuk mengatur tahun ajaran.",
        "warning"
      );
    }
  }, [activeAcademicYear, loading, isInitialLoad, showToast]);

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
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
      </div>

      {/* Academic Year Banner */}
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
            {availableClasses.length}
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

      {/* TAB SWITCHER */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveSchoolTab("guru")}
          className={`flex items-center gap-2 px-4 sm:px-5 py-3 text-sm sm:text-base font-semibold border-b-2 transition-colors ${
            activeSchoolTab === "guru"
              ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          <UserCheck size={18} />
          <span>Guru & Staf</span>
        </button>
        <button
          onClick={() => setActiveSchoolTab("siswa")}
          className={`flex items-center gap-2 px-4 sm:px-5 py-3 text-sm sm:text-base font-semibold border-b-2 transition-colors ${
            activeSchoolTab === "siswa"
              ? "border-green-600 text-green-600 dark:text-green-400 dark:border-green-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          <Users size={18} />
          <span>Data Siswa</span>
        </button>
        <button
          onClick={() => setActiveSchoolTab("mutasi")}
          className={`flex items-center gap-2 px-4 sm:px-5 py-3 text-sm sm:text-base font-semibold border-b-2 transition-colors ${
            activeSchoolTab === "mutasi"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          <History size={18} />
          <span>Riwayat Mutasi</span>
        </button>
      </div>

      {/* RIWAYAT MUTASI (masuk/keluar/lulus) */}
      {activeSchoolTab === "mutasi" && <RiwayatMutasiTab />}

      {/* READ-ONLY: DAFTAR GURU SECTION */}
      {activeSchoolTab === "guru" && (
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
      )}

      {/* MANAGEMENT SISWA SECTION */}
      {activeSchoolTab === "siswa" && (
        <div className="mb-6 sm:mb-8">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white mb-4">
            Management Siswa
          </h3>

          {/* FILTER SISWA — Jenjang wajib dipilih dulu, baru Kelas & data ke-fetch */}
          <div className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-gray-700 mb-4 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
              <div className="w-full md:w-40">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Jenjang
                </label>
                <select
                  value={studentFilters.jenjang}
                  onChange={(e) =>
                    setStudentFilters({
                      jenjang: e.target.value,
                      kelas: "",
                      search: "",
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-3 focus:ring-green-500/50 focus:border-green-500 dark:focus:ring-green-400/50 transition-all bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white"
                >
                  <option value="">Pilih Jenjang</option>
                  {SMP_CONFIG.grades.map((g) => (
                    <option key={g} value={g}>
                      Kelas {g}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full md:w-48">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Rombel
                </label>
                <select
                  value={studentFilters.kelas}
                  disabled={!studentFilters.jenjang}
                  onChange={(e) =>
                    setStudentFilters((prev) => ({
                      ...prev,
                      kelas: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-3 focus:ring-green-500/50 focus:border-green-500 dark:focus:ring-green-400/50 transition-all bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {studentFilters.jenjang
                      ? `Semua Kelas ${studentFilters.jenjang}`
                      : "Pilih jenjang dulu"}
                  </option>
                  {classesInSelectedJenjang.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      Kelas {cls.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 w-full">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Cari Siswa
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={studentFilters.search}
                    disabled={!studentFilters.jenjang}
                    onChange={(e) =>
                      setStudentFilters((prev) => ({
                        ...prev,
                        search: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 pl-11 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-3 focus:ring-green-500/50 focus:border-green-500 dark:focus:ring-green-400/50 transition-all bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder={
                      studentFilters.jenjang
                        ? "Cari berdasarkan nama atau NIS..."
                        : "Pilih jenjang dulu untuk mencari"
                    }
                  />
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* TOMBOL TAMBAH SISWA — Import & Export udah ada di halaman Data Siswa (Students.js), gak dobel di sini */}
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
              </div>
            </div>

            {!activeAcademicYear && (
              <p className="text-red-600 dark:text-red-400 text-xs mt-2 font-medium text-center">
                ⚠️ Aktifkan tahun ajaran terlebih dahulu
              </p>
            )}

            {/* Pesan filter aktif */}
            {studentFilters.jenjang && (
              <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                  {studentsLoading
                    ? "Memuat data siswa..."
                    : `Menampilkan ${filteredStudents().length} siswa dari Kelas ${studentFilters.jenjang}${
                        studentFilters.kelas
                          ? studentFilters.kelas.replace(studentFilters.jenjang, "")
                          : " (semua rombel)"
                      }`}
                  {studentFilters.search && ` — pencarian "${studentFilters.search}"`}
                </p>
              </div>
            )}
          </div>

          {/* EMPTY STATE: belum pilih jenjang -> jangan render tabel/fetch apa-apa */}
          {!studentFilters.jenjang && (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-center">
              <Users className="text-gray-300 dark:text-gray-600 mb-3" size={40} />
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                Pilih Jenjang dulu untuk menampilkan data siswa
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                Biar gak load 662 siswa sekaligus 🙂
              </p>
            </div>
          )}

          {/* TABEL SISWA */}
          {studentFilters.jenjang && (
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
          )}
        </div>
      )}

      {/* DISTRIBUSI KELAS — pakai classCounts (query count ringan), BUKAN
          studentsByClass, jadi tetap nunjukin semua 18 kelas walau tabel di
          atas cuma nampilin 1 kelas hasil filter. Klik kartu = auto-filter. */}
      {activeSchoolTab === "siswa" && (
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white mb-4">
            Distribusi Siswa per Kelas
            {classCountsLoading && (
              <span className="ml-2 text-sm font-normal text-gray-400">(memuat...)</span>
            )}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
            {availableClasses.map((cls) => (
              <button
                key={cls.id}
                onClick={() =>
                  setStudentFilters({
                    jenjang: String(cls.grade),
                    kelas: cls.id,
                    search: "",
                  })
                }
                className={`text-left border rounded-xl p-3 sm:p-4 bg-white dark:bg-gray-800 transition-all duration-200 hover:shadow-md ${
                  studentFilters.kelas === cls.id
                    ? "border-green-500 dark:border-green-400 ring-2 ring-green-500/30"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <h4 className="font-bold text-gray-800 dark:text-white text-sm">Kelas {cls.id}</h4>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {classCounts[cls.id] ?? "-"}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">siswa</span>
              </button>
            ))}
          </div>
        </div>
      )}

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
              is_pindahan: false,
              sekolah_asal: "",
              tanggal_masuk: new Date().toISOString().slice(0, 10),
            });
          }}
        />
      )}

      {deleteConfirm.show && (
        <DeleteConfirmModal
          confirm={deleteConfirm}
          loading={loading}
          onConfirm={(mutationForm) => {
            handleDeleteStudent(deleteConfirm.data.id, {
              ...mutationForm,
              class_id: deleteConfirm.data?.class_id || null,
              created_by: user?.id || null,
            });
          }}
          onCancel={() => setDeleteConfirm({ show: false, type: "", data: null })}
        />
      )}
    </div>
  );
};

export default SchoolManagementTab;
