// [file name]: setting/teacher-profiles/ProfileTab.js
// Halaman "Manajemen Profile Guru", diakses lewat tab "profile" di
// setting/Setting.js. Entry point ini pegang semua data-fetching (users,
// teacher_profiles, homeroom class, teaching assignments) lalu nurunin ke
// 4 section: ProfileHeader, PersonalInfoSection, TeachingAssignmentsSection,
// SecuritySection.
import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../supabaseClient";
import { getActiveAcademicInfo } from "../../services/academicYearService";
import { AlertCircle } from "lucide-react";
import PageContainer from "../../components/ui/PageContainer";
import ProfileHeader from "./ProfileHeader";
import PersonalInfoSection from "./PersonalInfoSection";
import TeachingAssignmentsSection from "./TeachingAssignmentsSection";
import SecuritySection from "./SecuritySection";
import AdminTeacherDataTab from "./AdminTeacherDataTab";

const ProfileTab = ({
  userId,
  user,
  showToast,
  loading,
  setLoading,
  darkMode,
  onToggleDarkMode,
}) => {
  const [profileData, setProfileData] = useState(null);
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [activeAcademicInfo, setActiveAcademicInfo] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  // Gate render "Data Profil Hilang" -- baru dianggap valid kalau fetch
  // pertama udah bener-bener selesai (bukan cuma ngandelin `loading` dari
  // parent, yang state awalnya bisa aja udah `false` duluan sebelum
  // useEffect sempet jalan -- itu penyebab error screen sempet nyempil
  // sekilas pas awal buka tab).
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const isInitialLoad = useRef(true);

  const fetchActiveAcademicInfo = useCallback(async () => {
    try {
      const info = await getActiveAcademicInfo();
      setActiveAcademicInfo(info);
      return info;
    } catch (err) {
      console.error("Error in fetchActiveAcademicInfo:", err);
      return null;
    }
  }, []);

  // Fetch data teacher_profiles (Informasi Pribadi) by teacher_id. Terpisah
  // dari tabel users -- lihat catatan skema di teacher_profiles.sql. Row
  // wajar belum ada (guru baru, TU belum sempat input) -- maybeSingle()
  // return null tanpa error, ditangani sebagai profil kosong (semua field
  // tampil "-" di PersonalInfoSection).
  const fetchTeacherProfile = useCallback(async (teacherId) => {
    if (!teacherId) return null;
    try {
      const { data, error } = await supabase
        .from("teacher_profiles")
        .select(
          "nuptk, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, pendidikan_terakhir, foto_url"
        )
        .eq("teacher_id", teacherId)
        .maybeSingle();

      if (error) {
        console.error("Error loading teacher profile:", error);
        return null;
      }

      setTeacherProfile(data);
      return data;
    } catch (err) {
      console.error("Error in fetchTeacherProfile:", err);
      return null;
    }
  }, []);

  const loadTeachingAssignments = useCallback(
    async (teacherId, activeYear, activeSemester, includeHistory = false) => {
      try {
        if (includeHistory) {
          setLoadingHistory(true);
        }

        const selectQuery = `
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
        `;

        if (includeHistory) {
          const { data: allAssignments, error: assignError } = await supabase
            .from("teacher_assignments")
            .select(selectQuery)
            .eq("teacher_id", teacherId)
            .order("academic_year", { ascending: false })
            .order("semester", { ascending: false });

          if (assignError) {
            console.error("Error loading teaching assignments:", assignError);
            setLoadingHistory(false);
            return;
          }

          if (allAssignments) {
            // Buat tahun ajaran aktif, cuma yang classes-nya masih valid
            // (kelas belum dihapus). Buat tahun ajaran lampau, tetep
            // tampilin walau classes null (riwayat historis).
            const filteredAssignments = allAssignments.filter((a) =>
              a.academic_year === activeYear ? a.classes !== null : true
            );
            setProfileData((prev) => ({ ...prev, teaching_assignments: filteredAssignments }));
          }
        } else {
          const { data: currentData, error: assignError } = await supabase
            .from("teacher_assignments")
            .select(selectQuery)
            .eq("teacher_id", teacherId)
            .eq("academic_year", activeYear)
            .order("semester", { ascending: false });

          if (assignError) {
            console.error("Error loading teaching assignments:", assignError);
            return;
          }

          if (currentData) {
            const filteredAssignments = currentData.filter((a) => a.classes !== null);
            setProfileData((prev) => ({ ...prev, teaching_assignments: filteredAssignments }));
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

  const loadUserProfile = useCallback(async () => {
    setLoading(true);
    try {
      if (!userId) {
        showToast("ID pengguna tidak ditemukan", "error");
        return;
      }

      const academicInfo = await fetchActiveAcademicInfo();

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select(
          "id, username, full_name, role, teacher_id, homeroom_class_id, is_active, created_at, no_hp"
        )
        .eq("id", userId)
        .maybeSingle();

      if (userError) {
        const errorMsg =
          userError.code === "PGRST116"
            ? "Pengguna tidak ditemukan"
            : `Gagal memuat profil: ${userError.message}`;
        showToast(errorMsg, "error");
        return;
      }

      if (!userData) {
        showToast("Data pengguna tidak ditemukan", "error");
        return;
      }

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
          setProfileData((prev) => ({ ...prev, homeroom_class: classData }));
        }
      }

      if (userData.teacher_id) {
        await fetchTeacherProfile(userData.teacher_id);

        if (academicInfo?.year) {
          await loadTeachingAssignments(
            userData.teacher_id,
            academicInfo.year,
            academicInfo.activeSemester,
            false
          );
        }
      }
    } catch (err) {
      console.error("Error loading profile:", err);
      showToast("Terjadi kesalahan saat memuat profil", "error");
    } finally {
      setLoading(false);
      setHasFetchedOnce(true);
    }
  }, [
    fetchActiveAcademicInfo,
    fetchTeacherProfile,
    loadTeachingAssignments,
    setLoading,
    showToast,
    userId,
  ]);

  // Initial load
  useEffect(() => {
    if (userId && isInitialLoad.current) {
      isInitialLoad.current = false;
      loadUserProfile();
    }
  }, [userId, loadUserProfile]);

  // Reload assignments saat toggle riwayat
  useEffect(() => {
    if (
      !isInitialLoad.current &&
      profileData?.teacher_id &&
      activeAcademicInfo?.year &&
      activeAcademicInfo?.activeSemester
    ) {
      loadTeachingAssignments(
        profileData.teacher_id,
        activeAcademicInfo.year,
        activeAcademicInfo.activeSemester,
        showHistory
      );
    }
  }, [
    showHistory,
    profileData?.teacher_id,
    activeAcademicInfo?.year,
    activeAcademicInfo?.activeSemester,
    loadTeachingAssignments,
  ]);

  if (loading || !hasFetchedOnce) {
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
      a.semester === activeAcademicInfo?.activeSemester
  );

  // Group riwayat by tahun ajaran & semester
  const groupedAssignments = assignments.reduce((acc, assignment) => {
    const { academic_year: year, semester } = assignment;
    if (!acc[year]) acc[year] = { year, semesters: {} };
    if (!acc[year].semesters[semester]) acc[year].semesters[semester] = [];
    acc[year].semesters[semester].push(assignment);
    return acc;
  }, {});

  const historyYears = Object.values(groupedAssignments).sort((a, b) =>
    b.year > a.year ? 1 : b.year < a.year ? -1 : 0
  );

  // foto_url disisipkan ke profileData biar ProfileHeader tinggal baca 1
  // object aja (gak perlu tau soal keberadaan teacher_profiles terpisah)
  const headerData = { ...profileData, foto_url: teacherProfile?.foto_url };

  // Mapel unik yang diampu tahun ajaran aktif -- dipake ProfileHeader buat
  // baris "Guru <mapel>" (gantiin label generik "Guru Mata Pelajaran")
  const teachingSubjects = [...new Set(currentAssignments.map((a) => a.subject))];

  // Tab "Isi Data Guru" cuma buat admin -- guru biasa langsung liat
  // Informasi tanpa tab bar sama sekali (gak ada yang perlu dipilih).
  const isAdminViewer = user?.role === "admin";

  return (
    <PageContainer darkMode={darkMode}>
      <ProfileHeader
        profileData={headerData}
        activeAcademicInfo={activeAcademicInfo}
        teachingSubjects={teachingSubjects}
        darkMode={darkMode}
      />

      {isAdminViewer && (
        <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 border-b border-blue-100 dark:border-gray-700 overflow-x-auto">
          <button
            onClick={() => setActiveTab("info")}
            className={`px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "info"
                ? "border-blue-600 text-blue-700 dark:text-blue-300 dark:border-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            Informasi
          </button>
          <button
            onClick={() => setActiveTab("edit")}
            className={`px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "edit"
                ? "border-blue-600 text-blue-700 dark:text-blue-300 dark:border-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            Isi Data Guru
          </button>
        </div>
      )}

      {isAdminViewer && activeTab === "edit" ? (
        <AdminTeacherDataTab darkMode={darkMode} showToast={showToast} />
      ) : (
        <>
          <PersonalInfoSection
            teacherProfile={teacherProfile}
            noHp={profileData.no_hp}
            darkMode={darkMode}
          />

          {/* Mobile: Penugasan Mengajar tampil duluan, Ubah Password paling
              akhir (order-2). Desktop (lg): balik ke layout asli, Ubah
              Password di kolom kiri, Penugasan di kolom kanan. */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="order-2 lg:order-1 lg:col-span-1">
              <SecuritySection user={user} darkMode={darkMode} />
            </div>
            <div className="order-1 lg:order-2 lg:col-span-2">
              <TeachingAssignmentsSection
                profileData={profileData}
                activeAcademicInfo={activeAcademicInfo}
                currentAssignments={currentAssignments}
                historyYears={historyYears}
                showHistory={showHistory}
                onToggleHistory={() => setShowHistory((prev) => !prev)}
                loadingHistory={loadingHistory}
                darkMode={darkMode}
              />
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
};

export default ProfileTab;
