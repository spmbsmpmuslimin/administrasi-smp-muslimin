// src/components/settings/academic/AcademicYearTab.js
import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Calendar } from "lucide-react";

// Import academic year service
import {
  getActiveAcademicInfo,
  applyAcademicFilters,
} from "../../services/academicYearService";

// Import child components
import SemesterManagement from "./SemesterManagement";
import YearTransition from "./YearTransition";
import CopyAssignmentsModal from "./CopyAssignmentsModal";

const AcademicYearTab = ({
  user,
  loading,
  setLoading,
  showToast,
  schoolConfig,
}) => {
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
    classesPerGrade: schoolConfig?.classesPerGrade || [
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
    ],
  };

  // Load academic info dan school data
  useEffect(() => {
    loadAcademicInfo();
  }, []);

  // Load academic info from service
  const loadAcademicInfo = async () => {
    try {
      const info = await getActiveAcademicInfo();
      setAcademicInfo(info);
      setSchoolStats((prev) => ({
        ...prev,
        academic_year: info.year || "Tahun Ajaran Belum Ditentukan",
      }));

      // Load school data setelah mendapatkan academic info
      await loadSchoolData(info);
    } catch (error) {
      console.error("Error loading academic info:", error);
      showToast(
        "Gagal memuat informasi tahun ajaran: " + error.message,
        "error"
      );
    }
  };

  // Fungsi utama untuk load data sekolah
  const loadSchoolData = async (academicInfo = null) => {
    try {
      setLoading(true);

      // Gunakan academicInfo yang sudah di-load atau load ulang
      const activeInfo = academicInfo || (await getActiveAcademicInfo());
      if (!academicInfo) {
        setAcademicInfo(activeInfo);
      }

      // Build query untuk data siswa aktif dengan academic filter
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
          academic_year,
          classes:class_id (
            id,
            grade,
            academic_year
          )
        `
        )
        .eq("is_active", true)
        .order("full_name");

      // Apply academic filters
      query = await applyAcademicFilters(query, {
        filterYear: true,
        filterSemester: false, // Tidak perlu filter semester untuk students
        filterYearId: false,
      });

      const { data: studentsData, error: studentsError } = await query;

      if (studentsError) throw studentsError;

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
      setSchoolStats({
        academic_year: activeInfo.year || "Tahun Ajaran Belum Ditentukan",
        total_students: studentsData?.length || 0,
      });
    } catch (error) {
      console.error("Error loading school data:", error);
      showToast("Gagal memuat data sekolah: " + error.message, "error");
    } finally {
      setLoading(false);
    }
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
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Memuat informasi tahun ajaran...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-4 sm:mb-6 md:mb-8">
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-2 sm:mb-3">
          <div className="p-1.5 sm:p-2 md:p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <Calendar className="text-blue-600 dark:text-blue-400" size={20} />
          </div>
          <div>
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
        </div>
      </div>

      {/* Current Academic Year Card */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 p-4 sm:p-5 md:p-6 rounded-xl mb-6 sm:mb-8 border border-blue-200 dark:border-blue-700 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Calendar
                className="text-blue-600 dark:text-blue-400"
                size={18}
              />
              <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                Tahun Ajaran Aktif
              </h3>
            </div>
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-900 dark:text-blue-200 mb-2">
              {schoolStats.academic_year}
            </p>
            <p className="text-blue-700 dark:text-blue-400 text-sm">
              <span className="font-semibold">
                {schoolStats.total_students}
              </span>{" "}
              siswa aktif dalam{" "}
              <span className="font-semibold">
                {Object.keys(studentsByClass).length}
              </span>{" "}
              kelas
            </p>
            {academicInfo?.semesterText && (
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                {academicInfo.semesterText}
              </p>
            )}
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

      {/* Semester Management Component */}
      <SemesterManagement
        schoolConfig={schoolConfig}
        loading={loading}
        setLoading={setLoading}
        showToast={showToast}
        onSemesterChange={loadSchoolData}
        onOpenCopyModal={() => setShowCopyModal(true)}
        academicInfo={academicInfo} // Pass academicInfo ke child component
      />

      {/* Students by Grade Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {["7", "8", "9"].map((grade) => {
          const totalStudents = studentsByGrade[grade] || 0;

          return (
            <div
              key={grade}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-gray-800 dark:text-gray-100">
                  Kelas {grade}
                </h4>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {totalStudents}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {totalStudents === 0
                  ? "Belum ada siswa"
                  : `${totalStudents} siswa aktif`}
              </p>
            </div>
          );
        })}
      </div>

      {/* Year Transition Component */}
      <YearTransition
        schoolStats={schoolStats}
        schoolConfig={schoolConfig}
        studentsByClass={studentsByClass}
        loading={loading}
        setLoading={setLoading}
        showToast={showToast}
        user={user}
        onTransitionComplete={loadSchoolData}
        academicInfo={academicInfo} // Pass academicInfo ke child component
      />

      {/* Copy Assignments Modal */}
      <CopyAssignmentsModal
        show={showCopyModal}
        onClose={() => setShowCopyModal(false)}
        loading={loading}
        setLoading={setLoading}
        showToast={showToast}
        academicInfo={academicInfo} // Pass academicInfo ke child component
      />
    </div>
  );
};

export default AcademicYearTab;
