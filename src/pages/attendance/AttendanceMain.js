// AttendanceMain.js (FIXED EXPORT VERSION - CORRECTED YEAR & SEMESTER LOGIC)
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

  // ✅ MODAL EXPORT STATES
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState("bulanan");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedSemester, setSelectedSemester] = useState(1);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(null);

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

  // ✅ HANDLE EXPORT CLICK - OPEN MODAL
  const handleExportClick = () => {
    setShowExportModal(true);
  };

  // ✅ FETCH STUDENTS DATA
  const fetchStudentsData = async (classId) => {
    try {
      console.log("🔍 Fetching students for class:", classId);

      const { data, error } = await supabase
        .from("students")
        .select("id, nis, full_name")
        .eq("class_id", classId)
        .eq("is_active", true) // ✅ Only fetch active students
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

  // ✅ HANDLE DOWNLOAD EXPORT
  const handleDownloadExport = async () => {
    console.log("🚀 handleDownloadExport called!");
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

      if (!fullUserData.homeroom_class_id) {
        console.log("❌ No homeroom class found");
        showToast("Anda belum memiliki kelas homeroom", "error");
        return;
      }

      console.log("📋 Step 3: Fetching students data...");
      const students = await fetchStudentsData(fullUserData.homeroom_class_id);

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
          fullUserData.homeroom_class_id,
          "PRESENSI HARIAN",
          new Date(),
          {},
          {},
          showToast,
          yearMonth,
          fullUserData.full_name,
          fullUserData.homeroom_class_id,
          selectedYear.id,
          selectedYear.year,
          selectedYear.semester
        );

        console.log("✅ Step 7: Monthly export completed");

        if (result && result.success) {
          const monthName = months.find((m) => m.value === selectedMonth)?.label;
          showToast(`✅ Data ${monthName} ${year} berhasil diexport!`, "success");
          setShowExportModal(false);
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
          fullUserData.homeroom_class_id,
          selectedSemester,
          yearForSemester,
          students,
          "Harian",
          "harian",
          fullUserData,
          fullUserData.homeroom_class_id,
          showToast,
          selectedYear.year,
          selectedYear.id
        );

        console.log("✅ Step 7: Semester export completed");

        if (result && result.success) {
          const semesterText = selectedSemester === 1 ? "Ganjil" : "Genap";
          showToast(
            `✅ Data Semester ${semesterText} ${selectedYear.year} berhasil diexport!`,
            "success"
          );
          setShowExportModal(false);
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
                  onClick={() => {
                    if (item.id === "export") {
                      handleExportClick();
                    } else {
                      setActiveTab(item.id);
                    }
                  }}
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
            </div>
          </div>
        </div>
      </div>

      {/* ✅ MODAL EXPORT */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div
            className={`max-w-lg w-full rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto ${
              darkMode ? "bg-gray-800" : "bg-white"
            }`}
          >
            {/* Header */}
            <div
              className={`px-4 sm:px-6 py-3 sm:py-4 border-b sticky top-0 z-10 ${
                darkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3
                  className={`text-lg sm:text-xl font-bold ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  📤 Export Presensi
                </h3>
                <button
                  onClick={() => setShowExportModal(false)}
                  disabled={isExporting}
                  className={`p-2 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${
                    darkMode
                      ? "hover:bg-gray-700 active:bg-gray-600 text-gray-400"
                      : "hover:bg-gray-100 active:bg-gray-200 text-gray-500"
                  }`}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
              {/* Tipe Export */}
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Tipe Export
                </label>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <button
                    onClick={() => setExportType("bulanan")}
                    className={`px-3 sm:px-4 py-3 sm:py-3 rounded-lg font-medium transition-all border-2 min-h-[44px] ${
                      exportType === "bulanan"
                        ? darkMode
                          ? "bg-blue-600 border-blue-500 text-white"
                          : "bg-blue-500 border-blue-400 text-white"
                        : darkMode
                        ? "bg-gray-700 border-gray-600 text-gray-300 hover:border-blue-600 active:bg-gray-600"
                        : "bg-white border-gray-300 text-gray-700 hover:border-blue-400 active:bg-gray-50"
                    }`}
                  >
                    <span className="text-sm sm:text-base">📅 Bulanan</span>
                  </button>
                  <button
                    onClick={() => setExportType("semester")}
                    className={`px-3 sm:px-4 py-3 sm:py-3 rounded-lg font-medium transition-all border-2 min-h-[44px] ${
                      exportType === "semester"
                        ? darkMode
                          ? "bg-blue-600 border-blue-500 text-white"
                          : "bg-blue-500 border-blue-400 text-white"
                        : darkMode
                        ? "bg-gray-700 border-gray-600 text-gray-300 hover:border-blue-600 active:bg-gray-600"
                        : "bg-white border-gray-300 text-gray-700 hover:border-blue-400 active:bg-gray-50"
                    }`}
                  >
                    <span className="text-sm sm:text-base">📚 Semester</span>
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
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <button
                      onClick={() => setSelectedSemester(1)}
                      className={`px-3 sm:px-4 py-3 rounded-lg font-medium transition-all border-2 min-h-[64px] sm:min-h-[72px] ${
                        selectedSemester === 1
                          ? darkMode
                            ? "bg-green-600 border-green-500 text-white"
                            : "bg-green-500 border-green-400 text-white"
                          : darkMode
                          ? "bg-gray-700 border-gray-600 text-gray-300 hover:border-green-600 active:bg-gray-600"
                          : "bg-white border-gray-300 text-gray-700 hover:border-green-400 active:bg-gray-50"
                      }`}
                    >
                      <div className="text-xs sm:text-sm font-semibold">Semester Ganjil</div>
                      <div className="text-[10px] sm:text-xs opacity-75 mt-1">(Juli - Des)</div>
                    </button>
                    <button
                      onClick={() => setSelectedSemester(2)}
                      className={`px-3 sm:px-4 py-3 rounded-lg font-medium transition-all border-2 min-h-[64px] sm:min-h-[72px] ${
                        selectedSemester === 2
                          ? darkMode
                            ? "bg-green-600 border-green-500 text-white"
                            : "bg-green-500 border-green-400 text-white"
                          : darkMode
                          ? "bg-gray-700 border-gray-600 text-gray-300 hover:border-green-600 active:bg-gray-600"
                          : "bg-white border-gray-300 text-gray-700 hover:border-green-400 active:bg-gray-50"
                      }`}
                    >
                      <div className="text-xs sm:text-sm font-semibold">Semester Genap</div>
                      <div className="text-[10px] sm:text-xs opacity-75 mt-1">(Jan - Jun)</div>
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
                  Pilih Tahun Ajaran
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
            </div>

            {/* Footer */}
            <div
              className={`px-4 sm:px-6 py-3 sm:py-4 border-t sticky bottom-0 ${
                darkMode ? "border-gray-700 bg-gray-900/30" : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => setShowExportModal(false)}
                  disabled={isExporting}
                  className={`flex-1 px-3 sm:px-4 py-3 rounded-lg font-medium transition-all disabled:opacity-50 min-h-[44px] ${
                    darkMode
                      ? "bg-gray-700 hover:bg-gray-600 active:bg-gray-600 text-white"
                      : "bg-gray-200 hover:bg-gray-300 active:bg-gray-300 text-gray-700"
                  }`}
                >
                  <span className="text-sm sm:text-base">Batal</span>
                </button>
                <button
                  onClick={handleDownloadExport}
                  disabled={isExporting || !selectedAcademicYear}
                  className={`flex-1 px-3 sm:px-4 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] ${
                    darkMode
                      ? "bg-blue-600 hover:bg-blue-700 active:bg-blue-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 active:bg-blue-700 text-white"
                  }`}
                >
                  {isExporting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
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
                      <span className="text-sm sm:text-base">Mengexport...</span>
                    </span>
                  ) : (
                    <span className="text-sm sm:text-base">📥 Download Excel</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceMain;
