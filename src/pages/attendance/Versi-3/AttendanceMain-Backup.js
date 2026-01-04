// AttendanceMain.js (FIXED VERSION - WITH ATTENDANCE TYPE SELECTION)
import React, { useState, useEffect } from "react";
import Attendance from "./Attendance";
import AttendanceModals from "./AttendanceModals";
import { exportAttendanceToExcel, exportSemesterRecapFromComponent } from "./AttendanceExcel";
import { supabase } from "../../supabaseClient";

const AttendanceMain = ({ user, onShowToast, darkMode }) => {
  const [activeTab, setActiveTab] = useState("input");
  const [isExporting, setIsExporting] = useState(false);
  const [fullUserData, setFullUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ EXPORT STATES
  const [attendanceType, setAttendanceType] = useState(null); // ✅ Will be set based on homeroom_class_id
  const [exportType, setExportType] = useState("bulanan");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedSemester, setSelectedSemester] = useState(1);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(null);

  // ✅ NEW: States for Mapel Selection
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");

  // ✅ FETCH FULL USER DATA
  useEffect(() => {
    const fetchFullUserData = async () => {
      if (!user?.id) {
        console.error("❌ No user ID found");
        setLoading(false);
        return;
      }

      try {
        console.log("🔍 Fetching full user data for user ID:", user.id);

        const { data, error } = await supabase
          .from("users")
          .select("id, username, full_name, role, teacher_id, homeroom_class_id")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("❌ Error fetching user data:", error);
          setFullUserData(user);
          setLoading(false);
          return;
        }

        if (!data) {
          console.warn("⚠️ User not found in database");
          setFullUserData(user);
          setLoading(false);
          return;
        }

        console.log("✅ Full user data loaded:", {
          username: data.username,
          role: data.role,
          teacher_id: data.teacher_id,
          homeroom_class_id: data.homeroom_class_id,
        });

        setFullUserData(data);

        // ✅ Set default attendanceType based on homeroom_class_id
        if (!data.homeroom_class_id) {
          // Guru mapel saja, set default ke "mapel"
          setAttendanceType("mapel");
          console.log("🔧 User is subject teacher only, defaulting to 'mapel'");
        } else {
          // Guru walikelas + mapel, set default ke "harian"
          setAttendanceType("harian");
          console.log("🔧 User is homeroom teacher, defaulting to 'harian'");
        }
      } catch (error) {
        console.error("❌ Unexpected error:", error);
        setFullUserData(user);
      } finally {
        setLoading(false);
      }
    };

    fetchFullUserData();
  }, [user]);

  // ✅ FETCH ACADEMIC YEARS
  useEffect(() => {
    const fetchAcademicYears = async () => {
      try {
        console.log("🔍 Fetching academic years...");

        const { data, error } = await supabase
          .from("academic_years")
          .select("*")
          .order("year", { ascending: true })
          .order("semester", { ascending: true });

        if (error) {
          console.error("❌ Supabase error:", error);
          throw error;
        }

        console.log("✅ Academic years fetched:", data);

        setAcademicYears(data || []);
        if (data && data.length > 0) {
          const activeYear = data.find((y) => y.is_active) || data[0];
          console.log("📌 Selected academic year:", activeYear);
          setSelectedAcademicYear(activeYear.id);
        } else {
          console.warn("⚠️ No academic years found");
        }
      } catch (error) {
        console.error("❌ Error fetching academic years:", error);
        showToast("Gagal memuat tahun ajaran", "error");
      }
    };

    fetchAcademicYears();
  }, []);

  // ✅ NEW: FETCH SUBJECTS WHEN EXPORT TAB OPENED (FOR MAPEL)
  useEffect(() => {
    if (activeTab === "export" && attendanceType === "mapel" && fullUserData?.teacher_id) {
      fetchSubjects();
    }
  }, [activeTab, attendanceType, fullUserData]);

  // ✅ NEW: FETCH CLASSES WHEN SUBJECT SELECTED
  useEffect(() => {
    if (selectedSubject && selectedAcademicYear) {
      fetchClasses();
    } else {
      setClasses([]);
      setSelectedClass("");
    }
  }, [selectedSubject, selectedAcademicYear]);

  // ✅ NEW: FETCH SUBJECTS FUNCTION
  const fetchSubjects = async () => {
    try {
      console.log("🔍 Fetching subjects for teacher:", fullUserData.teacher_id);

      const { data, error } = await supabase
        .from("teacher_assignments")
        .select("subject")
        .eq("teacher_id", fullUserData.teacher_id);

      if (error) throw error;

      // Get unique subjects
      const uniqueSubjects = [...new Set(data.map((item) => item.subject))];
      console.log("✅ Subjects fetched:", uniqueSubjects);

      setSubjects(uniqueSubjects);

      // Auto-select first subject if only one
      if (uniqueSubjects.length === 1) {
        setSelectedSubject(uniqueSubjects[0]);
      }
    } catch (error) {
      console.error("❌ Error fetching subjects:", error);
      showToast("Gagal memuat data mata pelajaran", "error");
    }
  };

  // ✅ NEW: FETCH CLASSES FUNCTION
  const fetchClasses = async () => {
    try {
      console.log("🔍 Fetching classes for subject:", selectedSubject);

      const { data, error } = await supabase
        .from("teacher_assignments")
        .select(
          `
          class_id,
          classes:class_id (
            id,
            grade
          )
        `
        )
        .eq("teacher_id", fullUserData.teacher_id)
        .eq("subject", selectedSubject)
        .eq("academic_year_id", selectedAcademicYear);

      if (error) throw error;

      const classesData = data
        .map((item) => item.classes)
        .filter(Boolean)
        .sort((a, b) => {
          // Sort by grade first, then by id (class name)
          if (a.grade !== b.grade) {
            return a.grade - b.grade;
          }
          return a.id.localeCompare(b.id);
        });

      console.log("✅ Classes fetched:", classesData);
      setClasses(classesData);

      // Auto-select first class if only one
      if (classesData.length === 1) {
        setSelectedClass(classesData[0].id);
      }
    } catch (error) {
      console.error("❌ Error fetching classes:", error);
      showToast("Gagal memuat data kelas", "error");
    }
  };

  const navigationItems = [
    {
      id: "input",
      icon: "📝",
      title: "Input Presensi",
      subtitle: "Input Kehadiran Siswa",
      badge: "Input",
    },
    {
      id: "preview",
      icon: "📊",
      title: "Preview Presensi",
      subtitle: "Lihat dan Kelola Data",
      badge: "Preview",
    },
    {
      id: "export",
      icon: "📤",
      title: "Export Presensi",
      subtitle: "Download Laporan Excel",
      badge: "Export",
    },
  ];

  const months = [
    { value: 1, label: "Januari" },
    { value: 2, label: "Februari" },
    { value: 3, label: "Maret" },
    { value: 4, label: "April" },
    { value: 5, label: "Mei" },
    { value: 6, label: "Juni" },
    { value: 7, label: "Juli" },
    { value: 8, label: "Agustus" },
    { value: 9, label: "September" },
    { value: 10, label: "Oktober" },
    { value: 11, label: "November" },
    { value: 12, label: "Desember" },
  ];

  // ✅ FETCH STUDENTS DATA
  const fetchStudentsData = async (classId) => {
    try {
      console.log("🔍 Fetching students for class:", classId);

      const { data, error } = await supabase
        .from("students")
        .select("id, nis, full_name")
        .eq("class_id", classId)
        .eq("is_active", true)
        .order("full_name", { ascending: true });

      if (error) {
        console.error("❌ Error fetching students:", error);
        throw error;
      }

      console.log("✅ Students fetched:", data?.length || 0);
      return data || [];
    } catch (error) {
      console.error("❌ Error in fetchStudentsData:", error);
      throw error;
    }
  };

  // ✅ HELPER: Determine correct year based on month
  const determineYearForMonth = (academicYearString, month, semester) => {
    const [firstYear, secondYear] = academicYearString.split("/").map(Number);

    console.log("📅 Determining year for:", {
      academicYearString,
      month,
      semester,
      firstYear,
      secondYear,
    });

    if (semester === 1) {
      if (month >= 7 && month <= 12) {
        console.log("✅ Month in Semester 1 range, using firstYear:", firstYear);
        return firstYear;
      }
    } else if (semester === 2) {
      if (month >= 1 && month <= 6) {
        console.log("✅ Month in Semester 2 range, using secondYear:", secondYear);
        return secondYear;
      }
    }

    const year = month >= 7 ? firstYear : secondYear;
    console.log("⚠️ Using fallback year:", year);
    return year;
  };

  // ✅ HANDLE DOWNLOAD EXPORT - UPDATED WITH ATTENDANCE TYPE
  const handleDownloadExport = async () => {
    console.log("🚀 handleDownloadExport called!");
    console.log("📋 Attendance type:", attendanceType);
    console.log("📋 Export type:", exportType);
    setIsExporting(true);

    try {
      console.log("📋 Step 1: Getting selected year");
      const selectedYear = academicYears.find((y) => y.id === selectedAcademicYear);

      if (!selectedYear) {
        console.log("❌ selectedYear not found");
        showToast("Tahun ajaran tidak ditemukan", "error");
        return;
      }

      console.log("✅ Step 2: Selected year found:", selectedYear);

      // ✅ VALIDATION: Check based on attendance type
      if (attendanceType === "harian") {
        if (!fullUserData.homeroom_class_id) {
          console.log("❌ No homeroom class found");
          showToast("Anda belum memiliki kelas homeroom", "error");
          return;
        }
      } else if (attendanceType === "mapel") {
        if (!selectedSubject || !selectedClass) {
          console.log("❌ Subject or class not selected");
          showToast("Pilih mata pelajaran dan kelas terlebih dahulu", "error");
          return;
        }
      }

      // ✅ Determine which class to use
      const classId = attendanceType === "harian" ? fullUserData.homeroom_class_id : selectedClass;
      const subjectName = attendanceType === "harian" ? "PRESENSI HARIAN" : selectedSubject;

      console.log("📋 Step 3: Fetching students data for class:", classId);
      const students = await fetchStudentsData(classId);

      if (!students || students.length === 0) {
        console.log("❌ No students found");
        showToast("Tidak ada siswa di kelas ini", "error");
        return;
      }

      console.log("✅ Step 4: Students data fetched:", students.length, "students");

      // ✅ EXPORT BULANAN
      if (exportType === "bulanan") {
        console.log("📅 Processing MONTHLY export...");

        const year = determineYearForMonth(selectedYear.year, selectedMonth, selectedYear.semester);
        const yearMonth = `${year}-${String(selectedMonth).padStart(2, "0")}`;

        console.log("📅 Step 5: Year-Month generated:", yearMonth);
        console.log("📤 Step 6: Calling exportAttendanceToExcel");

        const result = await exportAttendanceToExcel(
          students,
          classId,
          subjectName,
          new Date(),
          {},
          {},
          showToast,
          yearMonth,
          fullUserData.full_name,
          classId,
          selectedYear.id,
          selectedYear.year,
          selectedYear.semester
        );

        console.log("✅ Step 7: Monthly export completed");

        if (result && result.success) {
          const monthName = months.find((m) => m.value === selectedMonth)?.label;
          const typeLabel =
            attendanceType === "harian" ? "Presensi Harian" : `Mapel ${selectedSubject}`;
          showToast(`✅ Data ${typeLabel} - ${monthName} ${year} berhasil diexport!`, "success");
        } else {
          showToast(`❌ Export gagal: ${result?.message || "Unknown error"}`, "error");
        }
      }
      // ✅ EXPORT SEMESTER
      else if (exportType === "semester") {
        console.log("📚 Processing SEMESTER export...");

        const [firstYear, secondYear] = selectedYear.year.split("/").map(Number);
        const yearForSemester = selectedSemester === 1 ? firstYear : secondYear;

        console.log("📅 Step 5: Semester export year:", yearForSemester);
        console.log("📤 Step 6: Calling exportSemesterRecapFromComponent");

        const result = await exportSemesterRecapFromComponent(
          classId,
          selectedSemester,
          yearForSemester,
          students,
          attendanceType === "harian" ? "Harian" : selectedSubject,
          attendanceType,
          fullUserData,
          classId,
          showToast,
          selectedYear.year,
          selectedYear.id
        );

        console.log("✅ Step 7: Semester export completed");

        if (result && result.success) {
          const semesterText = selectedSemester === 1 ? "Ganjil" : "Genap";
          const typeLabel =
            attendanceType === "harian" ? "Presensi Harian" : `Mapel ${selectedSubject}`;
          showToast(
            `✅ Data ${typeLabel} - Semester ${semesterText} ${selectedYear.year} berhasil diexport!`,
            "success"
          );
        } else {
          showToast(`❌ Export gagal: ${result?.message || "Unknown error"}`, "error");
        }
      }
    } catch (error) {
      console.error("❌ Export error:", error);
      showToast("❌ Export gagal! " + error.message, "error");
    } finally {
      setIsExporting(false);
    }
  };

  const showToast = (message, type = "info") => {
    if (onShowToast) {
      onShowToast(message, type);
    } else {
      alert(`${type.toUpperCase()}: ${message}`);
    }
  };

  // ✅ LOADING STATE
  if (loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
          darkMode
            ? "bg-gradient-to-br from-gray-900 to-gray-800"
            : "bg-gradient-to-br from-blue-50 to-indigo-100"
        }`}
      >
        <div className="text-center">
          <div
            className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 ${
              darkMode ? "border-blue-400" : "border-blue-600"
            }`}
          ></div>
          <p className={`text-base font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
            Memuat data user...
          </p>
        </div>
      </div>
    );
  }

  // ✅ NO USER CHECK
  if (!fullUserData) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
          darkMode
            ? "bg-gradient-to-br from-gray-900 to-gray-800"
            : "bg-gradient-to-br from-blue-50 to-indigo-100"
        }`}
      >
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className={`text-2xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
            Data User Tidak Ditemukan
          </h2>
          <p className={`text-base ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            Silakan login kembali atau hubungi administrator
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        darkMode
          ? "bg-gradient-to-br from-gray-900 to-gray-800"
          : "bg-gradient-to-br from-blue-50 to-indigo-100"
      }`}
    >
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 sm:mb-8 text-center px-2">
            <h1
              className={`text-2xl sm:text-2xl font-bold mb-2 ${
                darkMode ? "text-white" : "text-gray-900"
              }`}
            >
              📋 Sistem Presensi Siswa
            </h1>
            <p className={`text-sm sm:text-base ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              Kelola Presensi Siswa Dengan Mudah Dan Efisien
            </p>
          </div>

          <div className="mb-4 sm:mb-6 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex gap-2 sm:gap-3">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative px-4 sm:px-6 py-3 sm:py-4 rounded-xl transition-all duration-300 flex-1 min-h-[60px] ${
                    activeTab === item.id
                      ? darkMode
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50"
                        : "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                      : darkMode
                      ? "bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 active:bg-gray-700"
                      : "bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                  }`}
                >
                  {/* Mobile: Icon + Badge */}
                  <div className="flex sm:hidden flex-col items-center justify-center gap-1">
                    <span className="text-2xl">{item.icon}</span>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                        activeTab === item.id
                          ? darkMode
                            ? "bg-blue-700"
                            : "bg-blue-700"
                          : darkMode
                          ? "bg-gray-700"
                          : "bg-gray-100"
                      }`}
                    >
                      {item.badge}
                    </span>
                  </div>

                  {/* Tablet/Desktop: Icon + Text */}
                  <div className="hidden sm:flex items-center gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div className="text-left">
                      <div className="font-semibold text-sm">{item.title}</div>
                      <div
                        className={`text-xs ${
                          activeTab === item.id
                            ? "text-blue-100"
                            : darkMode
                            ? "text-gray-500"
                            : "text-gray-500"
                        }`}
                      >
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  {activeTab === item.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-b-xl"></div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div
            className={`rounded-xl border shadow-lg p-3 sm:p-4 md:p-6 min-h-[400px] sm:min-h-[500px] ${
              darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
            }`}
          >
            <div className="animate-fadeIn">
              {activeTab === "input" && (
                <Attendance user={fullUserData} onShowToast={showToast} darkMode={darkMode} />
              )}

              {activeTab === "preview" && (
                <AttendanceModals user={fullUserData} onShowToast={showToast} darkMode={darkMode} />
              )}

              {activeTab === "export" && (
                <div className="space-y-4 sm:space-y-5">
                  {/* Header */}
                  <div className="text-center pb-4 border-b border-gray-200 dark:border-gray-700">
                    <h2
                      className={`text-xl sm:text-2xl font-bold mb-2 ${
                        darkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      📤 Export Data Presensi
                    </h2>
                    <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                      Pilih jenis dan periode data yang ingin diexport
                    </p>
                  </div>

                  {/* Form Export */}
                  <div className="space-y-4">
                    {/* ✅ PILIH JENIS PRESENSI */}
                    <div>
                      <label
                        className={`block text-sm font-medium mb-2 ${
                          darkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        1. Pilih Jenis Presensi
                      </label>
                      <div
                        className={`grid ${
                          fullUserData.homeroom_class_id ? "grid-cols-2" : "grid-cols-1"
                        } gap-3`}
                      >
                        {/* ✅ ONLY SHOW HARIAN IF USER IS HOMEROOM TEACHER */}
                        {fullUserData.homeroom_class_id && (
                          <button
                            onClick={() => {
                              setAttendanceType("harian");
                              setSelectedSubject("");
                              setSelectedClass("");
                            }}
                            className={`px-3 py-3 rounded-lg font-medium transition-all border-2 ${
                              attendanceType === "harian"
                                ? darkMode
                                  ? "bg-purple-600 border-purple-500 text-white shadow-lg"
                                  : "bg-purple-500 border-purple-400 text-white shadow-lg"
                                : darkMode
                                ? "bg-gray-700 border-gray-600 text-gray-300 hover:border-purple-600 active:bg-gray-600"
                                : "bg-white border-gray-300 text-gray-700 hover:border-purple-400 active:bg-gray-50"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🏫</span>
                              <div className="text-left">
                                <div className="text-sm font-semibold">
                                  Presensi Harian {fullUserData.homeroom_class_id}
                                </div>
                                <div className="text-xs opacity-75">(Walikelas)</div>
                              </div>
                            </div>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setAttendanceType("mapel");
                            if (fullUserData?.teacher_id && subjects.length === 0) {
                              fetchSubjects();
                            }
                          }}
                          className={`px-3 py-3 rounded-lg font-medium transition-all border-2 ${
                            attendanceType === "mapel"
                              ? darkMode
                                ? "bg-purple-600 border-purple-500 text-white shadow-lg"
                                : "bg-purple-500 border-purple-400 text-white shadow-lg"
                              : darkMode
                              ? "bg-gray-700 border-gray-600 text-gray-300 hover:border-purple-600 active:bg-gray-600"
                              : "bg-white border-gray-300 text-gray-700 hover:border-purple-400 active:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">📚</span>
                            <div className="text-left">
                              <div className="text-sm font-semibold">Presensi Mapel</div>
                              <div className="text-xs opacity-75">(Guru Mapel)</div>
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* ✅ CONDITIONAL FIELDS FOR MAPEL */}
                    {attendanceType === "mapel" && (
                      <>
                        {/* Pilih Mata Pelajaran */}
                        <div>
                          <label
                            className={`block text-sm font-medium mb-2 ${
                              darkMode ? "text-gray-300" : "text-gray-700"
                            }`}
                          >
                            Pilih Mata Pelajaran
                          </label>
                          {subjects.length === 0 ? (
                            <div
                              className={`w-full px-4 py-3 rounded-lg border-2 text-center ${
                                darkMode
                                  ? "bg-gray-700 border-gray-600 text-gray-400"
                                  : "bg-gray-100 border-gray-300 text-gray-500"
                              }`}
                            >
                              Tidak ada mata pelajaran tersedia
                            </div>
                          ) : (
                            <select
                              value={selectedSubject}
                              onChange={(e) => setSelectedSubject(e.target.value)}
                              className={`w-full px-4 py-3 rounded-lg border-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                                darkMode
                                  ? "bg-gray-700 border-gray-600 text-white"
                                  : "bg-white border-gray-300 text-gray-900"
                              }`}
                            >
                              <option value="">-- Pilih Mata Pelajaran --</option>
                              {subjects.map((subject) => (
                                <option key={subject} value={subject}>
                                  {subject}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* Pilih Kelas */}
                        {selectedSubject && (
                          <div>
                            <label
                              className={`block text-sm font-medium mb-2 ${
                                darkMode ? "text-gray-300" : "text-gray-700"
                              }`}
                            >
                              Pilih Kelas
                            </label>
                            {classes.length === 0 ? (
                              <div
                                className={`w-full px-4 py-3 rounded-lg border-2 text-center ${
                                  darkMode
                                    ? "bg-gray-700 border-gray-600 text-gray-400"
                                    : "bg-gray-100 border-gray-300 text-gray-500"
                                }`}
                              >
                                Tidak ada kelas tersedia
                              </div>
                            ) : (
                              <select
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                                className={`w-full px-4 py-3 rounded-lg border-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                                  darkMode
                                    ? "bg-gray-700 border-gray-600 text-white"
                                    : "bg-white border-gray-300 text-gray-900"
                                }`}
                              >
                                <option value="">-- Pilih Kelas --</option>
                                {classes.map((cls) => (
                                  <option key={cls.id} value={cls.id}>
                                    Kelas {cls.id}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {/* Tipe Export (Bulanan/Semester) */}
                    <div>
                      <label
                        className={`block text-sm font-medium mb-2 ${
                          darkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        2. Pilih Periode Export
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setExportType("bulanan")}
                          className={`px-3 py-2.5 rounded-lg font-medium transition-all border-2 ${
                            exportType === "bulanan"
                              ? darkMode
                                ? "bg-blue-600 border-blue-500 text-white shadow-lg"
                                : "bg-blue-500 border-blue-400 text-white shadow-lg"
                              : darkMode
                              ? "bg-gray-700 border-gray-600 text-gray-300 hover:border-blue-600 active:bg-gray-600"
                              : "bg-white border-gray-300 text-gray-700 hover:border-blue-400 active:bg-gray-50"
                          }`}
                        >
                          <span className="text-base">📅 Bulanan</span>
                        </button>
                        <button
                          onClick={() => setExportType("semester")}
                          className={`px-3 py-2.5 rounded-lg font-medium transition-all border-2 ${
                            exportType === "semester"
                              ? darkMode
                                ? "bg-blue-600 border-blue-500 text-white shadow-lg"
                                : "bg-blue-500 border-blue-400 text-white shadow-lg"
                              : darkMode
                              ? "bg-gray-700 border-gray-600 text-gray-300 hover:border-blue-600 active:bg-gray-600"
                              : "bg-white border-gray-300 text-gray-700 hover:border-blue-400 active:bg-gray-50"
                          }`}
                        >
                          <span className="text-sm">📚 Semester</span>
                        </button>
                      </div>
                    </div>

                    {/* BULANAN - Pilih Bulan */}
                    {exportType === "bulanan" && (
                      <div>
                        <label
                          className={`block text-sm font-medium mb-2 ${
                            darkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          Pilih Bulan
                        </label>
                        <select
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                          className={`w-full px-4 py-3 rounded-lg border-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                            darkMode
                              ? "bg-gray-700 border-gray-600 text-white"
                              : "bg-white border-gray-300 text-gray-900"
                          }`}
                        >
                          {months.map((month) => (
                            <option key={month.value} value={month.value}>
                              {month.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* SEMESTER - Pilih Semester */}
                    {exportType === "semester" && (
                      <div>
                        <label
                          className={`block text-sm font-medium mb-2 ${
                            darkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          Pilih Semester
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setSelectedSemester(1)}
                            className={`px-3 py-3 rounded-lg font-medium transition-all border-2 ${
                              selectedSemester === 1
                                ? darkMode
                                  ? "bg-green-600 border-green-500 text-white shadow-lg"
                                  : "bg-green-500 border-green-400 text-white shadow-lg"
                                : darkMode
                                ? "bg-gray-700 border-gray-600 text-gray-300 hover:border-green-600 active:bg-gray-600"
                                : "bg-white border-gray-300 text-gray-700 hover:border-green-400 active:bg-gray-50"
                            }`}
                          >
                            <div className="text-sm font-semibold">Semester Ganjil</div>
                            <div className="text-xs opacity-75 mt-0.5">(Juli - Des)</div>
                          </button>
                          <button
                            onClick={() => setSelectedSemester(2)}
                            className={`px-3 py-3 rounded-lg font-medium transition-all border-2 ${
                              selectedSemester === 2
                                ? darkMode
                                  ? "bg-green-600 border-green-500 text-white shadow-lg"
                                  : "bg-green-500 border-green-400 text-white shadow-lg"
                                : darkMode
                                ? "bg-gray-700 border-gray-600 text-gray-300 hover:border-green-600 active:bg-gray-600"
                                : "bg-white border-gray-300 text-gray-700 hover:border-green-400 active:bg-gray-50"
                            }`}
                          >
                            <div className="text-sm font-semibold">Semester Genap</div>
                            <div className="text-xs opacity-75 mt-0.5">(Jan - Jun)</div>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Pilih Tahun Ajaran */}
                    <div>
                      <label
                        className={`block text-sm font-medium mb-2 ${
                          darkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        3. Pilih Tahun Ajaran
                      </label>
                      {academicYears.length === 0 ? (
                        <div
                          className={`w-full px-4 py-3 rounded-lg border-2 text-center ${
                            darkMode
                              ? "bg-gray-700 border-gray-600 text-gray-400"
                              : "bg-gray-100 border-gray-300 text-gray-500"
                          }`}
                        >
                          Tidak ada tahun ajaran tersedia
                        </div>
                      ) : (
                        <select
                          value={selectedAcademicYear || ""}
                          onChange={(e) => setSelectedAcademicYear(e.target.value)}
                          className={`w-full px-4 py-3 rounded-lg border-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                            darkMode
                              ? "bg-gray-700 border-gray-600 text-white"
                              : "bg-white border-gray-300 text-gray-900"
                          }`}
                        >
                          {academicYears.map((year) => (
                            <option key={year.id} value={year.id}>
                              {year.year} - Semester {year.semester === 1 ? "Ganjil" : "Genap"}
                              {year.is_active && " ⭐"}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Download Button */}
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={handleDownloadExport}
                        disabled={
                          isExporting ||
                          !selectedAcademicYear ||
                          (attendanceType === "mapel" && (!selectedSubject || !selectedClass))
                        }
                        className={`w-full px-4 py-4 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          darkMode
                            ? "bg-blue-600 hover:bg-blue-700 active:bg-blue-700 text-white"
                            : "bg-blue-600 hover:bg-blue-700 active:bg-blue-700 text-white"
                        }`}
                      >
                        {isExporting ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="none"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                            Mengexport...
                          </span>
                        ) : (
                          "📥 Download Excel"
                        )}
                      </button>
                    </div>
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

export default AttendanceMain;
