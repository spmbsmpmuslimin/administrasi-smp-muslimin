// src/components/settings/academic/AcademicYearTab.js
// ✅ REFACTORED: Multi-semester support dengan semester selector
import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Calendar, RefreshCw } from "lucide-react";

// ✅ Import NEW academic year service
import {
  getActiveAcademicInfo,
  getAllSemestersInActiveYear,
  getSemesterDisplayName,
  filterBySemester,
} from "../../services/academicYearService";

// Import child components
import SemesterManagement from "./SemesterManagement";
import YearTransition from "./YearTransition";
import CopyAssignmentsModal from "./CopyAssignmentsModal";

const AcademicYearTab = ({ user, loading, setLoading, showToast, schoolConfig }) => {
  // ✅ NEW: Semester selection states
  const [availableSemesters, setAvailableSemesters] = useState([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState(null);
  const [selectedSemesterName, setSelectedSemesterName] = useState("");

  // Shared states
  const [academicInfo, setAcademicInfo] = useState(null);
  const [schoolStats, setSchoolStats] = useState({
    academic_year: "",
    total_students: 0,
  });
  const [studentsByClass, setStudentsByClass] = useState({});
  const [showCopyModal, setShowCopyModal] = useState(false);

  // Config dari schoolConfig
  const config = {
    schoolName: schoolConfig?.schoolName || "SMP Muslimin Cililin",
    schoolLevel: schoolConfig?.schoolLevel || "SMP",
    grades: ["7", "8", "9"],
    classesPerGrade: schoolConfig?.classesPerGrade || ["A", "B", "C", "D", "E", "F"],
  };

  // ✅ Load academic info dan available semesters
  useEffect(() => {
    loadAcademicInfo();
  }, []);

  // ✅ Load school data pas selectedSemester berubah
  useEffect(() => {
    if (selectedSemesterId) {
      loadSchoolData();
    }
  }, [selectedSemesterId]);

  // ✅ Load academic info from service
  const loadAcademicInfo = async () => {
    try {
      setLoading(true);

      // Get active academic info
      const info = await getActiveAcademicInfo();
      setAcademicInfo(info);

      // Get ALL semesters in active year
      const semesters = await getAllSemestersInActiveYear();
      setAvailableSemesters(semesters);

      // Set default selected semester to active semester
      if (info.activeSemesterId) {
        setSelectedSemesterId(info.activeSemesterId);
        const displayName = await getSemesterDisplayName(info.activeSemesterId);
        setSelectedSemesterName(displayName);
      }

      setSchoolStats((prev) => ({
        ...prev,
        academic_year: info.year || "Tahun Ajaran Belum Ditentukan",
      }));

      console.log("✅ Academic info loaded:", {
        year: info.year,
        activeSemester: info.activeSemester,
        availableSemesters: semesters.length,
      });
    } catch (error) {
      console.error("❌ Error loading academic info:", error);
      showToast("Gagal memuat informasi tahun ajaran: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // ✅ REFACTORED: Load data sekolah dengan semester filter
  const loadSchoolData = async () => {
    try {
      setLoading(true);

      if (!selectedSemesterId) {
        console.warn("⚠️ No semester selected, skipping data load");
        return;
      }

      console.log("📊 Loading school data for semester:", selectedSemesterId);

      // ✅ Build query untuk data siswa aktif
      let query = supabase
        .from("students")
        .select(
          `
          id, 
          nis, 
          full_name, 
          gender, 
          class_id, 
          is_active,
          academic_year_id,
          classes:class_id (
            id,
            grade,
            academic_year_id
          )
        `
        )
        .eq("is_active", true)
        .order("full_name");

      // ✅ CRITICAL: Apply semester filter
      query = filterBySemester(query, selectedSemesterId, { strict: true });

      const { data: studentsData, error: studentsError } = await query;

      if (studentsError) throw studentsError;

      console.log(`✅ Loaded ${studentsData?.length || 0} students for this semester`);

      // Organize students by class
      const studentsByClass = {};

      studentsData?.forEach((student) => {
        const classId = student.class_id;
        const grade = student.classes?.grade;

        if (classId && grade !== null && grade !== undefined) {
          if (!studentsByClass[classId]) {
            studentsByClass[classId] = {
              grade: grade,
              students: [],
            };
          }
          studentsByClass[classId].students.push(student);
        }
      });

      setStudentsByClass(studentsByClass);
      setSchoolStats((prev) => ({
        ...prev,
        total_students: studentsData?.length || 0,
      }));
    } catch (error) {
      console.error("❌ Error loading school data:", error);
      showToast("Gagal memuat data sekolah: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handler untuk ganti semester
  const handleSemesterChange = async (semesterId) => {
    try {
      setSelectedSemesterId(semesterId);
      const displayName = await getSemesterDisplayName(semesterId);
      setSelectedSemesterName(displayName);

      console.log("🔄 Semester changed to:", displayName);
    } catch (error) {
      console.error("❌ Error changing semester:", error);
      showToast("Gagal mengubah semester", "error");
    }
  };

  // ✅ Callback saat semester management update
  const handleSemesterUpdate = async () => {
    await loadAcademicInfo();
    // Data akan auto-reload karena selectedSemesterId berubah (via useEffect)
  };

  // Fungsi untuk menghitung siswa per grade
  const getStudentsByGrade = () => {
    const byGrade = { 7: 0, 8: 0, 9: 0 };

    Object.entries(studentsByClass).forEach(([classId, classData]) => {
      const grade = String(classData.grade);
      if (grade === "7" || grade === "8" || grade === "9") {
        byGrade[grade] += classData.students.length;
      }
    });

    return byGrade;
  };

  const studentsByGrade = getStudentsByGrade();

  // Loading state untuk academic info
  if (loading && !academicInfo) {
    return (
      <div className="p-6 dark:bg-gray-900 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Memuat informasi tahun ajaran...</p>
        </div>
      </div>
    );
  }

  // ✅ Determine if current selected semester is active
  const isActiveSemester = selectedSemesterId === academicInfo?.activeSemesterId;

  return (
    <div className="p-3 sm:p-4 md:p-6 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-4 sm:mb-6 md:mb-8">
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-2 sm:mb-3">
          <div className="p-1.5 sm:p-2 md:p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <Calendar className="text-blue-600 dark:text-blue-400" size={20} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">
              Manajemen Tahun Ajaran
              {academicInfo?.displayText && (
                <span className="block text-sm font-normal text-gray-600 dark:text-gray-400 mt-1">
                  {academicInfo.displayText}
                </span>
              )}
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              {config.schoolName} - {config.schoolLevel}
            </p>
          </div>

          {/* ✅ Refresh Button */}
          <button
            onClick={loadAcademicInfo}
            disabled={loading}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw
              className={`text-gray-600 dark:text-gray-400 ${loading ? "animate-spin" : ""}`}
              size={20}
            />
          </button>
        </div>
      </div>

      {/* ✅ NEW: Semester Selector */}
      {availableSemesters.length > 1 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-fit">
              Pilih Semester untuk Melihat Data:
            </label>
            <select
              value={selectedSemesterId || ""}
              onChange={(e) => handleSemesterChange(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {availableSemesters.map((semester) => (
                <option key={semester.id} value={semester.id}>
                  Semester {semester.semester} ({semester.semester === 1 ? "Ganjil" : "Genap"})
                  {semester.is_active ? " ★ Aktif" : ""}
                </option>
              ))}
            </select>

            {/* Status Badge */}
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                isActiveSemester
                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                  : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
              }`}
            >
              {isActiveSemester ? "📍 Semester Aktif" : "👁️ Mode Lihat"}
            </span>
          </div>

          {/* Info Text */}
          {!isActiveSemester && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
              ℹ️ Anda sedang melihat data semester yang tidak aktif. Data ini hanya untuk referensi.
            </p>
          )}
        </div>
      )}

      {/* Current Academic Year Card */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 p-4 sm:p-5 md:p-6 rounded-xl mb-6 sm:mb-8 border border-blue-200 dark:border-blue-700 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="text-blue-600 dark:text-blue-400" size={18} />
              <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                Tahun Ajaran Aktif
              </h3>
            </div>
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-900 dark:text-blue-200 mb-2">
              {schoolStats.academic_year}
            </p>

            {/* ✅ Show selected semester info */}
            <div className="space-y-1">
              <p className="text-blue-700 dark:text-blue-400 text-sm">
                <span className="font-semibold">{schoolStats.total_students}</span> siswa aktif
                dalam <span className="font-semibold">{Object.keys(studentsByClass).length}</span>{" "}
                kelas
              </p>
              {selectedSemesterName && (
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                  📅 {selectedSemesterName}
                </p>
              )}
            </div>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 sm:p-5 border border-blue-200 dark:border-blue-600 w-full sm:w-auto">
            <div className="text-center">
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">
                Total Kelas
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
                {Object.keys(studentsByClass).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Semester Management Component */}
      <SemesterManagement
        schoolConfig={schoolConfig}
        loading={loading}
        setLoading={setLoading}
        showToast={showToast}
        onSemesterChange={handleSemesterUpdate}
        onOpenCopyModal={() => setShowCopyModal(true)}
        academicInfo={academicInfo}
        selectedSemesterId={selectedSemesterId}
        availableSemesters={availableSemesters}
      />

      {/* Students by Grade Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {["7", "8", "9"].map((grade) => {
          const totalStudents = studentsByGrade[grade] || 0;

          return (
            <div
              key={grade}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-gray-800 dark:text-gray-100">Kelas {grade}</h4>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {totalStudents}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {totalStudents === 0 ? "Belum ada siswa" : `${totalStudents} siswa aktif`}
              </p>
            </div>
          );
        })}
      </div>

      {/* ✅ Year Transition Component */}
      <YearTransition
        schoolStats={schoolStats}
        schoolConfig={schoolConfig}
        studentsByClass={studentsByClass}
        loading={loading}
        setLoading={setLoading}
        showToast={showToast}
        user={user}
        onTransitionComplete={handleSemesterUpdate}
        academicInfo={academicInfo}
        selectedSemesterId={selectedSemesterId}
      />

      {/* ✅ Copy Assignments Modal */}
      <CopyAssignmentsModal
        show={showCopyModal}
        onClose={() => setShowCopyModal(false)}
        loading={loading}
        setLoading={setLoading}
        showToast={showToast}
        academicInfo={academicInfo}
        availableSemesters={availableSemesters}
        selectedSemesterId={selectedSemesterId}
      />
    </div>
  );
};

export default AcademicYearTab;
