import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../supabaseClient";
import ChangePasswordSection from "./ChangePasswordSection";
import {
  User,
  Mail,
  Shield,
  BookOpen,
  School,
  Calendar,
  History,
  ChevronDown,
  ChevronUp,
  Award,
  Clock,
  Users,
  AlertCircle,
  Phone,
} from "lucide-react";

// ✅ AFTER
import { getActiveAcademicInfo, formatSemesterDisplay } from "../services/academicYearService";

const ProfileTab = ({ userId, user, showToast, loading, setLoading }) => {
  const [profileData, setProfileData] = useState(null);
  const [activeAcademicInfo, setActiveAcademicInfo] = useState(null); // ✅ GANTI: dari activeAcademicYear
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const isInitialLoad = useRef(true);

  // ✅ LOGIC: Fetch Active Academic Info (using service)
  const fetchActiveAcademicInfo = useCallback(async () => {
    try {
      const info = await getActiveAcademicInfo();
      setActiveAcademicInfo(info);
      console.log("✅ Active Academic Info loaded:", JSON.stringify(info, null, 2));
      return info;
    } catch (err) {
      console.error("❌ Error in fetchActiveAcademicInfo:", err);
      return null;
    }
  }, []);

  // LOGIC: Load User Profile (Simplified - hanya untuk current user)
  const loadUserProfile = useCallback(async () => {
    try {
      console.log("Loading profile for user:", userId);
      setLoading(true);

      if (!userId) {
        console.error("User ID is missing");
        showToast("ID pengguna tidak ditemukan", "error");
        setLoading(false);
        return;
      }

      const academicInfo = await fetchActiveAcademicInfo(); // ✅ GANTI: dari fetchActiveAcademicYear

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select(
          "id, username, full_name, role, teacher_id, homeroom_class_id, is_active, created_at, no_hp"
        )
        .eq("id", userId)
        .maybeSingle();

      if (userError) {
        console.error("Error loading user profile:", userError);
        const errorMsg =
          userError.code === "PGRST116"
            ? "Pengguna tidak ditemukan"
            : `Gagal memuat profil: ${userError.message}`;
        showToast(errorMsg, "error");
        setLoading(false);
        return;
      }

      if (!userData) {
        showToast("Data pengguna tidak ditemukan", "error");
        setLoading(false);
        return;
      }

      console.log("User profile loaded:", userData);
      setProfileData(userData);

      if (userData.homeroom_class_id) {
        const { data: classData, error: classError } = await supabase
          .from("classes")
          .select("id, grade, academic_year, is_active")
          .eq("id", userData.homeroom_class_id)
          .maybeSingle();

        if (classError) {
          console.error("Error loading homeroom class:", classError);
        } else if (classData) {
          console.log("Homeroom class loaded:", classData);
          setProfileData((prev) => ({
            ...prev,
            homeroom_class: classData,
          }));
        }
      }

      // ✅ GANTI: tambah parameter semester
      if (userData.teacher_id && academicInfo?.year) {
        await loadTeachingAssignments(
          userData.teacher_id,
          academicInfo.year,
          academicInfo.semester,
          false
        );
      }

      setLoading(false);
    } catch (err) {
      console.error("Error loading profile:", err);
      showToast("Terjadi kesalahan saat memuat profil", "error");
      setLoading(false);
    }
  }, [fetchActiveAcademicInfo, setLoading, showToast, userId]); // ✅ GANTI: dependency

  // ✅ LOGIC: Load Teaching Assignments (MODIFIED - tambah parameter semester)
  const loadTeachingAssignments = useCallback(
    async (teacherId, activeYear, activeSemester, includeHistory = false) => {
      try {
        if (includeHistory) {
          setLoadingHistory(true);
        }

        // ✅ DEBUG LOG
        console.log("=== DEBUG loadTeachingAssignments ===");
        console.log("teacherId:", teacherId, "| type:", typeof teacherId);
        console.log("activeYear:", activeYear, "| type:", typeof activeYear);
        console.log("activeSemester:", activeSemester, "| type:", typeof activeSemester);
        console.log("activeYear length:", activeYear?.length);
        console.log("includeHistory:", includeHistory);
        console.log("=====================================");

        console.log("🔍 Loading assignments for:", {
          teacherId,
          activeYear,
          activeSemester, // ✅ TAMBAH INI!
          includeHistory,
        });

        if (includeHistory) {
          const { data: allAssignments, error: assignError } = await supabase
            .from("teacher_assignments")
            .select(
              `
            id, 
            subject, 
            class_id,
            academic_year, 
            semester,
            classes:class_id (
              id,
              grade,
              academic_year,
              is_active
            )
          `
            )
            .eq("teacher_id", teacherId)
            .order("academic_year", { ascending: false })
            .order("semester", { ascending: false });

          console.log("📊 All assignments:", allAssignments);
          console.log("❌ Error:", assignError);

          if (assignError) {
            console.error("Error loading teaching assignments:", assignError);
            setLoadingHistory(false);
            return;
          }

          if (allAssignments) {
            const filteredAssignments = allAssignments.filter((a) => {
              if (a.academic_year === activeYear) {
                return a.classes !== null;
              }
              return true;
            });

            console.log("✅ Filtered assignments (with history):", filteredAssignments);

            setProfileData((prev) => ({
              ...prev,
              teaching_assignments: filteredAssignments,
            }));
          }
        } else {
          const { data: currentAssignments, error: assignError } = await supabase
            .from("teacher_assignments")
            .select(
              `
                id, 
                subject, 
                class_id,
                academic_year, 
                semester,
                classes:class_id (
                  id,
                  grade,
                  academic_year,
                  is_active
                )
              `
            )
            .eq("teacher_id", teacherId)
            .eq("academic_year", activeYear)
            .order("semester", { ascending: false });

          // ✅ DEBUG LOG
          console.log("=== QUERY RESULT ===");
          console.log("currentAssignments:", currentAssignments);
          console.log("currentAssignments length:", currentAssignments?.length);
          console.log("assignError:", assignError);
          if (currentAssignments && currentAssignments.length > 0) {
            console.log("First assignment full:", JSON.stringify(currentAssignments[0], null, 2));
            console.log("First assignment.classes:", currentAssignments[0].classes);
            console.log("First assignment.class_id:", currentAssignments[0].class_id);
            console.log("First assignment.academic_year:", currentAssignments[0].academic_year);
            console.log("First assignment.semester:", currentAssignments[0].semester);
          }
          console.log("====================");

          console.log("📊 Current assignments:", currentAssignments);
          console.log("❌ Error:", assignError);

          if (assignError) {
            console.error("Error loading teaching assignments:", assignError);
            return;
          }

          if (currentAssignments) {
            const filteredAssignments = currentAssignments.filter((a) => a.classes !== null);

            console.log("✅ Filtered current assignments:", filteredAssignments);

            setProfileData((prev) => ({
              ...prev,
              teaching_assignments: filteredAssignments,
            }));
          }
        }

        setLoadingHistory(false);
      } catch (err) {
        console.error("Error loading teaching assignments:", err);
        setLoadingHistory(false);
      }
    },
    []
  );

  // LOGIC: Effects for initial load
  useEffect(() => {
    if (userId && isInitialLoad.current) {
      isInitialLoad.current = false;
      loadUserProfile();
    }
  }, [userId, loadUserProfile]);

  // ✅ LOGIC: Effects for loading assignments (MODIFIED)
  useEffect(() => {
    if (
      !isInitialLoad.current &&
      profileData?.teacher_id &&
      activeAcademicInfo?.year &&
      activeAcademicInfo?.semester // ✅ TAMBAH CHECK INI!
    ) {
      loadTeachingAssignments(
        profileData.teacher_id,
        activeAcademicInfo.year,
        activeAcademicInfo.semester, // ✅ PASS SEMESTER!
        showHistory
      );
    }
  }, [
    showHistory,
    profileData?.teacher_id,
    activeAcademicInfo?.year, // ✅ GANTI
    activeAcademicInfo?.semester, // ✅ TAMBAH!
    loadTeachingAssignments,
  ]);

  const getClassName = (assignment) => {
    if (assignment.classes?.id) {
      return `Kelas ${assignment.classes.id}`;
    }
    if (assignment.classes?.grade) {
      return `Kelas ${assignment.classes.grade}`;
    }
    return `Kelas ${assignment.class_id}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-900 min-h-[400px] rounded-2xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 dark:border-gray-700 border-t-blue-600 dark:border-t-blue-500 mx-auto"></div>
          <p className="mt-6 text-gray-700 dark:text-gray-300 font-medium text-sm md:text-base">
            Memuat profil...
          </p>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-3 sm:p-4 md:p-6">
        <div className="max-w-xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 sm:p-6 md:p-8 text-center border border-red-200 dark:border-red-800">
          <AlertCircle className="w-12 h-12 sm:w-14 sm:h-14 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            Data Profil Hilang
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm sm:text-base">
            Terjadi kesalahan saat memuat data profil. Silakan coba *logout* lalu *login* kembali.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 sm:px-5 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg transition-colors text-sm sm:text-base font-medium min-h-[44px] w-full sm:w-auto"
          >
            Refresh Halaman
          </button>
        </div>
      </div>
    );
  }

  const { teaching_assignments: assignments = [] } = profileData;

  const currentAssignments = assignments.filter(
    (a) =>
      a.academic_year === activeAcademicInfo?.year &&
      a.semester === activeAcademicInfo?.activeSemester // ✅ BENAR! pake .activeSemester
  );

  // Calculate stats for current year
  const totalSubjects = currentAssignments.length || 0;
  const uniqueSubjects = [...new Set(currentAssignments?.map((a) => a.subject))].length;
  const totalClasses = [...new Set(currentAssignments?.map((a) => a.class_id))].length;

  // Group history by year and semester
  const groupedAssignments = assignments.reduce((acc, assignment) => {
    const year = assignment.academic_year;
    const semester = assignment.semester;
    if (!acc[year]) {
      acc[year] = {
        year,
        semesters: {},
      };
    }
    if (!acc[year].semesters[semester]) {
      acc[year].semesters[semester] = [];
    }
    acc[year].semesters[semester].push(assignment);
    return acc;
  }, {});

  const historyYears = Object.values(groupedAssignments).sort((a, b) =>
    b.year > a.year ? 1 : b.year < a.year ? -1 : 0
  );

  // =======================================================================
  // ========================== RENDER START ===============================
  // =======================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Main Profile Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-5 md:p-8 border border-blue-100 dark:border-gray-700">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Left Side - Profile Picture & Main Info */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 flex-1 min-w-0">
              {/* Avatar Placeholder */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-blue-100 dark:bg-gray-600 rounded-full flex items-center justify-center text-blue-700 dark:text-gray-300 font-bold text-2xl sm:text-3xl md:text-4xl flex-shrink-0 border-4 border-white dark:border-gray-700 shadow-lg">
                {profileData.full_name[0]}
              </div>
              {/* Main Info */}
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                  {profileData.full_name}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-2 text-sm sm:text-base md:text-lg">
                  @{profileData.username}
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 mb-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium ${
                      profileData.role === "admin"
                        ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                        : profileData.role === "guru_bk"
                        ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                        : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    }`}
                  >
                    <Shield size={12} className="sm:w-3 sm:h-3" />
                    {profileData.role === "admin"
                      ? "Administrator"
                      : profileData.role === "guru_bk"
                      ? "Guru BK"
                      : "Guru Mata Pelajaran"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    <span
                      className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
                        profileData.is_active
                          ? "bg-green-500 dark:bg-green-400"
                          : "bg-gray-400 dark:bg-gray-500"
                      }`}
                    ></span>
                    {profileData.is_active ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400 justify-center sm:justify-start">
                  {profileData.teacher_id && (
                    <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-gray-700 px-3 py-1.5 rounded-lg">
                      <User size={12} className="text-blue-600 dark:text-blue-400" />
                      <span className="font-mono font-medium">{profileData.teacher_id}</span>
                    </div>
                  )}
                  {profileData.no_hp && (
                    <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-gray-700 px-3 py-1.5 rounded-lg">
                      <Phone size={12} className="text-blue-600 dark:text-blue-400" />
                      <span>{profileData.no_hp}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Right Side - Academic Info */}
            <div className="flex flex-col gap-3 flex-shrink-0 mt-4 md:mt-0 w-full sm:w-auto">
              {/* ✅ GANTI: displayText dari activeAcademicInfo */}
              {activeAcademicInfo?.displayText && (
                <div className="bg-blue-50 dark:bg-gray-700/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-200 dark:border-gray-600">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                    <Calendar size={14} className="text-blue-600 dark:text-blue-400" />
                    <span className="font-medium">Tahun Ajaran:</span>
                    <span className="font-bold text-blue-700 dark:text-blue-300">
                      {activeAcademicInfo.displayText}
                    </span>
                  </div>
                </div>
              )}
              {profileData.homeroom_class && (
                <div className="bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-300 dark:border-blue-800">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-blue-800 dark:text-blue-300">
                    <School size={14} className="text-blue-700 dark:text-blue-400" />
                    <span className="font-medium">Wali Kelas:</span>
                    <span className="font-bold text-blue-900 dark:text-blue-200">
                      {profileData.homeroom_class.id}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* End Header Section */}

          {/* Role Description */}
          <div className="mt-6 border-t pt-6 border-blue-100 dark:border-gray-700">
            <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
              <Shield size={18} className="text-purple-600 dark:text-purple-400" />
              Role:{" "}
              <span
                className={`text-lg sm:text-xl md:text-2xl font-bold ${
                  profileData.role === "admin"
                    ? "text-purple-700 dark:text-purple-300"
                    : profileData.role === "guru_bk"
                    ? "text-orange-700 dark:text-orange-300"
                    : "text-blue-700 dark:text-blue-300"
                }`}
              >
                {profileData.role === "admin"
                  ? "Administrator"
                  : profileData.role === "guru_bk"
                  ? "Guru BK"
                  : "Guru Mata Pelajaran"}
              </span>
            </h3>
            <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 mb-4">
              {profileData.role === "admin"
                ? "Memiliki Hak Penuh Untuk Mengelola Semua Data Dan Pengguna Dalam Sistem."
                : profileData.role === "guru_bk"
                ? "Bertanggung Jawab Atas Bimbingan Dan Konseling Siswa, Serta Manajemen Data Siswa."
                : "Bertanggung Jawab Atas Pengajaran Mata Pelajaran, Penilaian, Dan Presensi Siswa Di Kelas Yang Ditugaskan."}
            </p>
            {/* Admin Privilege Details */}
            {profileData.role === "admin" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-left">
                <div className="bg-blue-50 dark:bg-gray-700/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-200 dark:border-gray-600">
                  <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2 text-sm sm:text-base">
                    Hak Akses:
                  </h4>
                  <ul className="text-xs sm:text-sm text-gray-700 dark:text-gray-400 space-y-1.5">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      Kelola semua user & role
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      Akses data lengkap sistem
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      Konfigurasi akademik
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      Monitoring aktivitas
                    </li>
                  </ul>
                </div>
                <div className="bg-blue-50 dark:bg-gray-700/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-200 dark:border-gray-600">
                  <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2 text-sm sm:text-base">
                    Fitur Khusus:
                  </h4>
                  <ul className="text-xs sm:text-sm text-gray-700 dark:text-gray-400 space-y-1.5">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      Lihat profil semua user
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      Edit & hapus user
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      Generate laporan
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      Backup & restore data
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content Grid (Assignments, Password, etc) */}
        <div className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Column 1: Password */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-5 md:p-6 border border-blue-100 dark:border-gray-700">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4 flex items-center gap-2">
                <Mail size={18} className="text-red-500" />
                Ubah Password
              </h3>
              <ChangePasswordSection user={user} />
            </div>
          </div>

          {/* Column 2/3: Teaching Assignments */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-5 md:p-6 border border-blue-100 dark:border-gray-700">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BookOpen size={18} className="text-orange-600" />
                  Penugasan Mengajar
                </span>
                {profileData.teacher_id && (
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    disabled={loadingHistory}
                    className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors disabled:opacity-50 min-h-[44px] px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                  >
                    {loadingHistory ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-blue-600"></div>
                    ) : showHistory ? (
                      <ChevronUp size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    )}
                    <span className="hidden sm:inline">
                      {showHistory ? "Sembunyikan Riwayat" : "Tampilkan Riwayat"}
                    </span>
                    <span className="sm:hidden">{showHistory ? "Tutup" : "Riwayat"}</span>
                  </button>
                )}
              </h3>

              {/* Stats Bar - Current Year */}
              {!showHistory && (
                <>
                  {/* ✅ GANTI: displayText dari activeAcademicInfo */}
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4 border-b pb-3 border-blue-100 dark:border-gray-700">
                    Statistik Penugasan Tahun Ajaran Aktif (
                    {activeAcademicInfo?.displayText || "N/A"})
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                    {/* Stat Card: Total Mengajar */}
                    <div className="bg-gradient-to-br from-blue-50 to-white dark:from-gray-700/30 dark:to-gray-800/30 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-200 dark:border-gray-600 shadow-md">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2">
                        <div className="bg-gradient-to-r from-orange-100 to-orange-200 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-1.5 sm:p-2">
                          <BookOpen size={14} className="text-orange-600" />
                        </div>
                        <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                          {totalSubjects}
                        </p>
                      </div>
                      <p className="text-xs text-gray-700 dark:text-gray-400 font-medium">
                        Total Sesi
                      </p>
                    </div>
                    {/* Stat Card: Mata Pelajaran */}
                    <div className="bg-gradient-to-br from-blue-50 to-white dark:from-gray-700/30 dark:to-gray-800/30 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-200 dark:border-gray-600 shadow-md">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2">
                        <div className="bg-gradient-to-r from-purple-100 to-purple-200 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-1.5 sm:p-2">
                          <Award size={14} className="text-purple-600" />
                        </div>
                        <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                          {uniqueSubjects}
                        </p>
                      </div>
                      <p className="text-xs text-gray-700 dark:text-gray-400 font-medium">
                        Mata Pelajaran
                      </p>
                    </div>
                    {/* Stat Card: Kelas Berbeda */}
                    <div className="bg-gradient-to-br from-blue-50 to-white dark:from-gray-700/30 dark:to-gray-800/30 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-200 dark:border-gray-600 shadow-md">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2">
                        <div className="bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-1.5 sm:p-2">
                          <Users size={14} className="text-blue-600" />
                        </div>
                        <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                          {totalClasses}
                        </p>
                      </div>
                      <p className="text-xs text-gray-700 dark:text-gray-400 font-medium">
                        Kelas Diajar
                      </p>
                    </div>
                    {/* Stat Card: Homeroom Class */}
                    <div className="bg-gradient-to-br from-blue-50 to-white dark:from-gray-700/30 dark:to-gray-800/30 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-200 dark:border-gray-600 shadow-md">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2">
                        <div className="bg-gradient-to-r from-green-100 to-green-200 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-1.5 sm:p-2">
                          <History size={14} className="text-green-600" />
                        </div>
                        <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                          {profileData.homeroom_class?.id || "-"}
                        </p>
                      </div>
                      <p className="text-xs text-gray-700 dark:text-gray-400 font-medium">
                        Wali Kelas
                      </p>
                    </div>
                  </div>

                  {/* Current Assignments List */}
                  {currentAssignments.length > 0 ? (
                    <div className="space-y-3 sm:space-y-4">
                      {currentAssignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="bg-gradient-to-r from-blue-50 to-white dark:from-gray-700/30 dark:to-gray-800/30 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-200 dark:border-gray-600 hover:shadow-lg transition-all hover:-translate-y-0.5"
                        >
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100">
                                {assignment.subject}
                              </p>
                              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-400 mt-1 flex items-center gap-1.5">
                                <School size={12} />
                                <span>{getClassName(assignment)}</span>
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-1.5 sm:gap-2 text-xs font-medium mt-2 sm:mt-0">
                              <span className="bg-gradient-to-r from-blue-100 to-blue-200 dark:from-gray-600 dark:to-gray-700 border border-blue-300 dark:border-gray-500 text-gray-800 dark:text-gray-300 px-2 py-1.5 rounded-lg font-medium">
                                Semester {assignment.semester}
                              </span>
                              <span className="bg-gradient-to-r from-blue-200 to-blue-300 dark:from-gray-600 dark:to-gray-700 text-gray-800 dark:text-gray-300 px-2 py-1.5 rounded-lg font-medium flex items-center gap-1">
                                <Clock size={10} />
                                {assignment.academic_year}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gradient-to-br from-blue-50 to-white dark:from-gray-700/30 dark:to-gray-800/30 rounded-xl p-6 sm:p-8 md:p-12 shadow-sm border border-blue-200 dark:border-gray-600 text-center">
                      <div className="bg-gradient-to-r from-blue-100 to-blue-200 dark:from-gray-600 dark:to-gray-700 rounded-full p-4 sm:p-6 w-fit mx-auto mb-4">
                        <BookOpen size={32} className="text-blue-400 dark:text-gray-500" />
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                        Belum Ada Tugas Mengajar
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-400">
                        Anda belum memiliki mata pelajaran untuk tahun ajaran ini.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* History Assignments List */}
              {showHistory && (
                <div className="mt-4 sm:mt-6 border-t pt-3 sm:pt-4 border-blue-100 dark:border-gray-700">
                  <p className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 sm:mb-4">
                    Riwayat Penugasan Mengajar
                  </p>
                  <div className="space-y-4 sm:space-y-6">
                    {historyYears.map((yearGroup) => (
                      <div key={yearGroup.year}>
                        <h4 className="text-sm sm:text-base font-bold text-gray-800 dark:text-gray-200 mb-2 sm:mb-3 border-l-4 border-orange-400 pl-2 sm:pl-3">
                          Tahun Ajaran {yearGroup.year}
                        </h4>
                        <div className="space-y-3 sm:space-y-4 ml-2">
                          {Object.entries(yearGroup.semesters).map(([semester, assignments]) => (
                            <div key={semester} className="space-y-1.5 sm:space-y-2">
                              <p className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-400 flex items-center gap-1.5">
                                <Calendar size={12} className="text-blue-600 dark:text-blue-400" />
                                Semester {semester}
                              </p>
                              <div className="space-y-2 sm:space-y-3 pl-3 sm:pl-4 border-l border-blue-200 dark:border-gray-600">
                                {assignments.map((assignment) => (
                                  <div
                                    key={assignment.id}
                                    className="bg-gradient-to-r from-blue-50 to-white dark:from-gray-700/30 dark:to-gray-800/30 rounded-lg p-2.5 sm:p-3 border border-blue-200 dark:border-gray-600 hover:bg-blue-100 dark:hover:bg-gray-700/50 transition-all"
                                  >
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-2">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100">
                                          {assignment.subject}
                                        </p>
                                        <p className="text-xs text-gray-700 dark:text-gray-400 mt-0.5">
                                          {getClassName(assignment)}
                                        </p>
                                      </div>
                                      <span className="bg-gradient-to-r from-blue-200 to-blue-300 dark:from-gray-600 dark:to-gray-700 text-gray-800 dark:text-gray-300 px-2 py-0.5 sm:py-1 rounded-lg font-medium text-xs">
                                        {assignment.academic_year}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileTab;
