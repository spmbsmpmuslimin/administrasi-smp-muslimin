import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../../supabaseClient";

// ==============================================
// UTILITY FUNCTIONS (DARI AttendanceRecapModal.js)
// ==============================================

// Helper untuk normalize status
const normalizeStatus = (status) => {
  if (!status) return null;
  const normalized = status.toString().toLowerCase().trim();
  if (normalized === "alpha") return "alpa";
  return normalized;
};

// Helper untuk format tanggal
const formatDateHeader = (dateStr) => {
  try {
    const date = new Date(dateStr + "T00:00:00");
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return `${day}/${month}`;
  } catch {
    return dateStr;
  }
};

// Helper untuk status badge
const getStatusBadge = (status) => {
  if (!status) return <span className="text-gray-400">-</span>;

  const normalized = normalizeStatus(status);

  const statusMap = {
    hadir: { text: "H", color: "bg-green-500 text-white" },
    sakit: { text: "S", color: "bg-yellow-500 text-white" },
    izin: { text: "I", color: "bg-blue-500 text-white" },
    alpa: { text: "A", color: "bg-red-500 text-white" },
  };

  const statusInfo = statusMap[normalized] || {
    text: "-",
    color: "bg-gray-200 text-gray-500",
  };

  return (
    <span
      className={`inline-block px-2 py-1 rounded text-xs font-bold ${statusInfo.color}`}>
      {statusInfo.text}
    </span>
  );
};

// Helper untuk kategori kehadiran
const getAttendanceCategory = (percentage) => {
  if (percentage >= 90)
    return {
      text: "Sangat Baik",
      color:
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    };
  if (percentage >= 80)
    return {
      text: "Baik",
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    };
  if (percentage >= 70)
    return {
      text: "Cukup",
      color:
        "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    };
  return {
    text: "Kurang",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  };
};

// ==============================================
// RECAP MODAL COMPONENT (DARI AttendanceRecapModal.js)
// ==============================================

const RecapModal = ({
  showModal,
  onClose,
  attendanceMode,
  selectedClass,
  selectedSubject,
  homeroomClass,
  students,
  onShowToast,
}) => {
  // View mode state
  const [viewMode, setViewMode] = useState("monthly");

  // Monthly state
  const [selectedMonth, setSelectedMonth] = useState(
    () => new Date().getMonth() + 1
  );
  const [selectedYear, setSelectedYear] = useState(() =>
    new Date().getFullYear()
  );

  // Semester state
  const [selectedSemester, setSelectedSemester] = useState(() =>
    new Date().getMonth() >= 6 ? "ganjil" : "genap"
  );
  const [semesterYear, setSemesterYear] = useState(() =>
    new Date().getFullYear()
  );

  const [rekapData, setRekapData] = useState([]);
  const [rekapLoading, setRekapLoading] = useState(false);
  const [attendanceDates, setAttendanceDates] = useState([]);

  // Year & month options
  const yearOptions = [2025, 2026, 2027, 2028, 2029, 2030];
  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const monthOptions = monthNames.map((name, index) => ({
    value: index + 1,
    label: name,
  }));

  // Reset saat modal dibuka
  useEffect(() => {
    if (showModal) {
      const now = new Date();
      setSelectedMonth(now.getMonth() + 1);
      setSelectedYear(now.getFullYear());
      setSemesterYear(now.getFullYear());
      setSelectedSemester(now.getMonth() >= 6 ? "ganjil" : "genap");
      setViewMode("monthly");
    }
  }, [showModal]);

  // Auto-fetch saat viewMode berubah
  useEffect(() => {
    if (!showModal) return;

    const fetchDataForCurrentView = async () => {
      if (viewMode === "monthly") {
        await handleMonthlyChange(selectedMonth, selectedYear);
      } else if (viewMode === "semester") {
        await handleSemesterChange(selectedSemester, semesterYear);
      }
    };

    fetchDataForCurrentView();
  }, [viewMode, showModal]);

  // Handle monthly change
  const handleMonthlyChange = async (month, year) => {
    if (month !== selectedMonth || year !== selectedYear) {
      setSelectedMonth(month);
      setSelectedYear(year);
    }
    await fetchMonthlyData(month, year);
  };

  // Handle semester change
  const handleSemesterChange = async (semester, year) => {
    if (semester !== selectedSemester || year !== semesterYear) {
      setSelectedSemester(semester);
      setSemesterYear(year);
    }
    await fetchSemesterData(semester, year);
  };

  // Fetch monthly data
  const fetchMonthlyData = async (month, year) => {
    if (
      (attendanceMode === "subject" && (!selectedClass || !selectedSubject)) ||
      (attendanceMode === "daily" && !homeroomClass)
    ) {
      if (onShowToast) {
        onShowToast("Pilih kelas dan mata pelajaran terlebih dahulu!", "error");
      }
      return;
    }

    if (!students || students.length === 0) {
      if (onShowToast) {
        onShowToast("Data siswa tidak tersedia!", "error");
      }
      return;
    }

    setRekapLoading(true);
    try {
      const lastDay = new Date(year, month, 0).getDate();
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDate = `${year}-${String(month).padStart(2, "0")}-${String(
        lastDay
      ).padStart(2, "0")}`;

      const subjectFilter =
        attendanceMode === "subject" ? selectedSubject : "Harian";
      const classFilter =
        attendanceMode === "subject" ? selectedClass : homeroomClass;
      const typeFilter = attendanceMode === "subject" ? "mapel" : "harian";

      console.log("📅 Fetching monthly data:", {
        startDate,
        endDate,
        subjectFilter,
        classFilter,
        typeFilter,
      });

      const { data: attendanceData, error } = await supabase
        .from("attendances")
        .select("student_id, status, date")
        .eq("subject", subjectFilter)
        .eq("class_id", classFilter)
        .eq("type", typeFilter)
        .gte("date", startDate)
        .lte("date", endDate);

      if (error) throw error;

      console.log("✅ Records fetched:", attendanceData?.length || 0);

      // Get unique dates
      const uniqueDates = [
        ...new Set(attendanceData.map((r) => r.date)),
      ].sort();
      setAttendanceDates(uniqueDates);

      // Process data - FIX: SELALU initialize dailyStatus sebagai object kosong
      const studentSummary = {};
      students.forEach((student, index) => {
        studentSummary[student.id] = {
          no: index + 1,
          studentId: student.id,
          name: student.full_name,
          nis: student.nis,
          dailyStatus: {}, // SELALU di-initialize sebagai object kosong
          hadir: 0,
          sakit: 0,
          izin: 0,
          alpa: 0,
          total: 0,
          percentage: 0,
        };
      });

      // Count attendance
      attendanceData.forEach((record) => {
        if (studentSummary[record.student_id]) {
          const status = normalizeStatus(record.status);

          // dailyStatus sudah selalu di-initialize di atas, jadi tidak perlu check lagi
          studentSummary[record.student_id].dailyStatus[record.date] = status;

          if (status === "hadir") studentSummary[record.student_id].hadir++;
          else if (status === "sakit")
            studentSummary[record.student_id].sakit++;
          else if (status === "izin") studentSummary[record.student_id].izin++;
          else if (status === "alpa") studentSummary[record.student_id].alpa++;
        }
      });

      // Calculate totals
      Object.keys(studentSummary).forEach((studentId) => {
        const student = studentSummary[studentId];
        student.total =
          student.hadir + student.sakit + student.izin + student.alpa;
        student.percentage =
          student.total > 0
            ? Math.round((student.hadir / student.total) * 100)
            : 0;
      });

      setRekapData(Object.values(studentSummary));

      if (onShowToast) {
        onShowToast(`✅ Data rekap berhasil dimuat`, "success");
      }
    } catch (error) {
      console.error("❌ Error:", error);
      if (onShowToast) {
        onShowToast("Gagal memuat data rekap: " + error.message, "error");
      }
      setRekapData([]);
    } finally {
      setRekapLoading(false);
    }
  };

  // Fetch semester data
  const fetchSemesterData = async (semester, year) => {
    if (
      (attendanceMode === "subject" && (!selectedClass || !selectedSubject)) ||
      (attendanceMode === "daily" && !homeroomClass)
    ) {
      if (onShowToast) {
        onShowToast("Pilih kelas dan mata pelajaran terlebih dahulu!", "error");
      }
      return;
    }

    if (!students || students.length === 0) {
      if (onShowToast) {
        onShowToast("Data siswa tidak tersedia!", "error");
      }
      return;
    }

    setRekapLoading(true);
    try {
      const semesterType = semester === "ganjil" ? "Ganjil" : "Genap";
      const academicYear =
        semesterType === "Ganjil"
          ? `${year}/${year + 1}`
          : `${year - 1}/${year}`;

      const months =
        semester === "ganjil" ? [7, 8, 9, 10, 11, 12] : [1, 2, 3, 4, 5, 6];
      const [startYear, endYear] = academicYear.split("/").map(Number);

      let startDate, endDate;
      if (semesterType === "Ganjil") {
        startDate = `${startYear}-07-01`;
        endDate = `${startYear}-12-31`;
      } else {
        startDate = `${endYear}-01-01`;
        endDate = `${endYear}-06-30`;
      }

      const subjectFilter =
        attendanceMode === "subject" ? selectedSubject : "Harian";
      const classFilter =
        attendanceMode === "subject" ? selectedClass : homeroomClass;
      const typeFilter = attendanceMode === "subject" ? "mapel" : "harian";

      console.log("📊 Fetching semester data:", {
        semester: semesterType,
        academicYear,
        startDate,
        endDate,
        subjectFilter,
        classFilter,
      });

      // PAGINATION
      let allRecords = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("attendances")
          .select("student_id, status, date")
          .eq("subject", subjectFilter)
          .eq("class_id", classFilter)
          .eq("type", typeFilter)
          .gte("date", startDate)
          .lte("date", endDate)
          .order("date", { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allRecords = [...allRecords, ...data];
          console.log(`📄 Page ${page + 1}: ${data.length} records`);

          if (data.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      console.log("✅ Total records:", allRecords.length);

      // Filter by month
      const filteredData = allRecords.filter((r) => {
        const parts = r.date.split("-");
        const month = parseInt(parts[1], 10);
        return months.includes(month);
      });

      console.log("Data setelah filter:", filteredData.length);

      // Calculate hari efektif
      const uniqueDates = [...new Set(filteredData.map((r) => r.date))];
      const totalHariEfektif = uniqueDates.length;
      console.log("🎯 HARI EFEKTIF:", totalHariEfektif);

      // Process data
      const studentSummary = {};
      students.forEach((student, index) => {
        studentSummary[student.id] = {
          no: index + 1,
          studentId: student.id,
          name: student.full_name,
          nis: student.nis,
          hadir: 0,
          sakit: 0,
          izin: 0,
          alpa: 0,
          total: totalHariEfektif,
          percentage: 0,
        };
      });

      // Count attendance
      filteredData.forEach((record) => {
        if (studentSummary[record.student_id]) {
          const status = normalizeStatus(record.status);

          if (status === "hadir") studentSummary[record.student_id].hadir++;
          else if (status === "sakit")
            studentSummary[record.student_id].sakit++;
          else if (status === "izin") studentSummary[record.student_id].izin++;
          else if (status === "alpa") studentSummary[record.student_id].alpa++;
        }
      });

      // Calculate percentage
      Object.keys(studentSummary).forEach((studentId) => {
        const student = studentSummary[studentId];
        student.percentage =
          totalHariEfektif > 0
            ? Math.round((student.hadir / totalHariEfektif) * 100)
            : 0;
      });

      setRekapData(Object.values(studentSummary));

      if (onShowToast) {
        onShowToast(`✅ Data semester berhasil dimuat`, "success");
      }
    } catch (error) {
      console.error("❌ Error:", error);
      if (onShowToast) {
        onShowToast("Gagal memuat data semester: " + error.message, "error");
      }
      setRekapData([]);
    } finally {
      setRekapLoading(false);
    }
  };

  // Dynamic subtitle
  const getDynamicSubtitle = () => {
    const classId =
      attendanceMode === "subject" ? selectedClass : homeroomClass;
    const subjectName =
      attendanceMode === "subject" ? selectedSubject : "PRESENSI HARIAN";

    if (viewMode === "monthly") {
      const monthName = monthNames[selectedMonth - 1];
      return `${subjectName} | ${monthName} ${selectedYear}`;
    } else {
      const semesterName =
        selectedSemester === "ganjil"
          ? "Ganjil (Juli-Desember)"
          : "Genap (Januari-Juni)";
      return `${subjectName} | Semester ${semesterName} ${semesterYear}`;
    }
  };

  if (!showModal) return null;

  // Check dark mode
  const darkMode = document.documentElement.classList.contains("dark");

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black/70 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={onClose}>
      <div
        className={`${
          darkMode ? "bg-slate-900 text-white" : "bg-white"
        } rounded-xl w-full max-w-7xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl`}
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 sm:p-4 flex justify-between items-center flex-shrink-0 gap-3">
          <h2 className="text-sm sm:text-lg font-bold">📊 Rekap Presensi</h2>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Tab Switcher */}
            <div className="flex bg-white/20 rounded-lg p-1 gap-1">
              <button
                onClick={() => setViewMode("monthly")}
                className={`px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition ${
                  viewMode === "monthly"
                    ? "bg-white text-blue-600 shadow"
                    : "text-white hover:bg-white/10"
                }`}>
                📅 Bulanan
              </button>
              <button
                onClick={() => setViewMode("semester")}
                className={`px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition ${
                  viewMode === "semester"
                    ? "bg-white text-blue-600 shadow"
                    : "text-white hover:bg-white/10"
                }`}>
                📊 Semester
              </button>
            </div>

            {/* Period Selector */}
            <div
              className={`flex items-center gap-1 sm:gap-2 ${
                darkMode ? "bg-slate-800" : "bg-white"
              } rounded-lg p-1 shadow-sm`}>
              {viewMode === "monthly" ? (
                <>
                  <select
                    value={selectedMonth}
                    onChange={(e) =>
                      handleMonthlyChange(
                        parseInt(e.target.value),
                        selectedYear
                      )
                    }
                    className={`bg-transparent ${
                      darkMode ? "text-slate-200" : "text-gray-700"
                    } text-sm font-medium focus:outline-none cursor-pointer py-1 px-2 border-r ${
                      darkMode ? "border-slate-700" : "border-gray-200"
                    } min-w-[80px]`}
                    disabled={rekapLoading}>
                    {monthOptions.map((month) => (
                      <option
                        key={month.value}
                        value={month.value}
                        className={
                          darkMode
                            ? "bg-slate-800 text-white"
                            : "bg-white text-gray-900"
                        }>
                        {month.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) =>
                      handleMonthlyChange(
                        selectedMonth,
                        parseInt(e.target.value)
                      )
                    }
                    className={`bg-transparent ${
                      darkMode ? "text-slate-200" : "text-gray-700"
                    } text-sm font-medium focus:outline-none cursor-pointer py-1 px-2 min-w-[70px]`}
                    disabled={rekapLoading}>
                    {yearOptions.map((year) => (
                      <option
                        key={year}
                        value={year}
                        className={
                          darkMode
                            ? "bg-slate-800 text-white"
                            : "bg-white text-gray-900"
                        }>
                        {year}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <select
                    value={selectedSemester}
                    onChange={(e) =>
                      handleSemesterChange(e.target.value, semesterYear)
                    }
                    className={`bg-transparent ${
                      darkMode ? "text-slate-200" : "text-gray-700"
                    } text-sm font-medium focus:outline-none cursor-pointer py-1 px-2 border-r ${
                      darkMode ? "border-slate-700" : "border-gray-200"
                    } min-w-[80px]`}
                    disabled={rekapLoading}>
                    <option
                      value="ganjil"
                      className={
                        darkMode
                          ? "bg-slate-800 text-white"
                          : "bg-white text-gray-900"
                      }>
                      Ganjil
                    </option>
                    <option
                      value="genap"
                      className={
                        darkMode
                          ? "bg-slate-800 text-white"
                          : "bg-white text-gray-900"
                      }>
                      Genap
                    </option>
                  </select>
                  <select
                    value={semesterYear}
                    onChange={(e) =>
                      handleSemesterChange(
                        selectedSemester,
                        parseInt(e.target.value)
                      )
                    }
                    className={`bg-transparent ${
                      darkMode ? "text-slate-200" : "text-gray-700"
                    } text-sm font-medium focus:outline-none cursor-pointer py-1 px-2 min-w-[70px]`}
                    disabled={rekapLoading}>
                    {yearOptions.map((year) => (
                      <option
                        key={year}
                        value={year}
                        className={
                          darkMode
                            ? "bg-slate-800 text-white"
                            : "bg-white text-gray-900"
                        }>
                        {year}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>

            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center">
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-3 sm:p-4 flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div
            className={`mb-2 text-center border rounded-lg p-2 flex-shrink-0 sticky top-0 z-30 shadow-sm ${
              darkMode
                ? "border-slate-700 bg-slate-800"
                : "border-gray-200 bg-white"
            }`}>
            <h3
              className={`text-sm sm:text-base font-bold ${
                darkMode ? "text-slate-200" : "text-gray-800"
              }`}>
              SMP MUSLIMIN CILILIN - KELAS{" "}
              {attendanceMode === "subject" ? selectedClass : homeroomClass}
            </h3>
            <p
              className={`text-xs sm:text-sm ${
                darkMode ? "text-slate-400" : "text-gray-600"
              }`}>
              {getDynamicSubtitle()}
            </p>
          </div>

          {/* Loading */}
          {rekapLoading ? (
            <div className="flex items-center justify-center p-8 flex-1">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
              <span className={darkMode ? "text-slate-300" : "text-gray-600"}>
                Memuat data...
              </span>
            </div>
          ) : (
            <div
              className={`border rounded-lg overflow-hidden shadow-sm flex-1 flex flex-col ${
                darkMode
                  ? "border-slate-700 bg-slate-800"
                  : "border-gray-200 bg-white"
              }`}>
              {viewMode === "monthly" ? (
                /* MONTHLY VIEW */
                <>
                  {attendanceDates.length > 0 && (
                    <div
                      className={`p-2 text-center text-xs sm:hidden border-b ${
                        darkMode
                          ? "bg-blue-900/30 text-blue-300 border-blue-800"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}>
                      👉 Geser untuk melihat semua hari
                    </div>
                  )}

                  <div className="overflow-auto flex-1">
                    <table className="w-full text-xs sm:text-sm border-collapse">
                      <thead
                        className={`${
                          darkMode ? "bg-slate-700" : "bg-gray-100"
                        } sticky top-0 z-20`}>
                        <tr
                          className={`border-b-2 ${
                            darkMode ? "border-slate-600" : "border-gray-400"
                          }`}>
                          <th
                            className={`p-2 text-center font-bold ${
                              darkMode
                                ? "text-slate-200 border-slate-600"
                                : "text-gray-800 border-gray-300"
                            } border-r-2 ${
                              darkMode ? "bg-slate-700" : "bg-gray-100"
                            } sticky left-0 z-30 min-w-[40px]`}>
                            No.
                          </th>
                          <th
                            className={`p-2 text-left font-bold ${
                              darkMode
                                ? "text-slate-200 border-slate-600"
                                : "text-gray-800 border-gray-300"
                            } border-r-2 ${
                              darkMode ? "bg-slate-700" : "bg-gray-100"
                            } sticky left-[40px] z-30 min-w-[140px]`}>
                            Nama Siswa
                          </th>

                          {attendanceDates.map((date, index) => (
                            <th
                              key={date}
                              className={`p-2 text-center font-bold ${
                                darkMode ? "text-slate-200" : "text-gray-800"
                              } min-w-[45px] ${
                                index < attendanceDates.length - 1
                                  ? darkMode
                                    ? "border-slate-600"
                                    : "border-gray-300"
                                  : darkMode
                                  ? "border-slate-600"
                                  : "border-gray-400"
                              } ${
                                darkMode
                                  ? "border-r border-slate-600"
                                  : "border-r border-gray-300"
                              }`}>
                              {formatDateHeader(date)}
                            </th>
                          ))}

                          <th
                            className={`p-2 text-center font-bold ${
                              darkMode
                                ? "text-green-300 border-slate-600"
                                : "text-green-700 border-gray-300"
                            } min-w-[40px] ${
                              darkMode ? "bg-green-900/30" : "bg-green-50"
                            } border-r`}>
                            Hadir
                          </th>
                          <th
                            className={`p-2 text-center font-bold ${
                              darkMode
                                ? "text-blue-300 border-slate-600"
                                : "text-blue-700 border-gray-300"
                            } min-w-[40px] ${
                              darkMode ? "bg-blue-900/30" : "bg-blue-50"
                            } border-r`}>
                            Izin
                          </th>
                          <th
                            className={`p-2 text-center font-bold ${
                              darkMode
                                ? "text-yellow-300 border-slate-600"
                                : "text-yellow-700 border-gray-300"
                            } min-w-[40px] ${
                              darkMode ? "bg-yellow-900/30" : "bg-yellow-50"
                            } border-r`}>
                            Sakit
                          </th>
                          <th
                            className={`p-2 text-center font-bold ${
                              darkMode
                                ? "text-red-300 border-slate-600"
                                : "text-red-700 border-gray-300"
                            } min-w-[40px] ${
                              darkMode ? "bg-red-900/30" : "bg-red-50"
                            } border-r-2 ${
                              darkMode ? "border-slate-600" : "border-gray-400"
                            }`}>
                            Alpa
                          </th>
                          <th
                            className={`p-2 text-center font-bold ${
                              darkMode
                                ? "text-slate-200 border-slate-600"
                                : "text-gray-800 border-gray-300"
                            } min-w-[45px] border-r`}>
                            Total
                          </th>
                          <th
                            className={`p-2 text-center font-bold ${
                              darkMode ? "text-slate-200" : "text-gray-800"
                            } min-w-[50px]`}>
                            %
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rekapData.length > 0 ? (
                          rekapData.map((student) => (
                            <tr
                              key={student.studentId}
                              className={`border-b ${
                                darkMode
                                  ? "border-slate-700 hover:bg-slate-700"
                                  : "border-gray-200 hover:bg-blue-50"
                              } transition`}>
                              <td
                                className={`p-2 text-center border-r-2 ${
                                  darkMode
                                    ? "border-slate-700 bg-slate-800"
                                    : "border-gray-300 bg-white"
                                } sticky left-0 z-10`}>
                                {student.no}
                              </td>
                              <td
                                className={`p-2 font-medium border-r-2 ${
                                  darkMode
                                    ? "border-slate-700 bg-slate-800 text-slate-200"
                                    : "border-gray-300 bg-white text-gray-800"
                                } sticky left-[40px] z-10`}>
                                {student.name}
                              </td>

                              {attendanceDates.map((date, index) => (
                                <td
                                  key={date}
                                  className={`p-2 text-center ${
                                    index < attendanceDates.length - 1
                                      ? darkMode
                                        ? "border-r border-slate-700"
                                        : "border-r border-gray-200"
                                      : darkMode
                                      ? "border-r-2 border-slate-600"
                                      : "border-r-2 border-gray-400"
                                  }`}>
                                  {/* FIX: Gunakan optional chaining untuk safety */}
                                  {getStatusBadge(student.dailyStatus?.[date])}
                                </td>
                              ))}

                              <td
                                className={`p-2 text-center font-bold border-r ${
                                  darkMode
                                    ? "text-green-300 border-slate-700 bg-green-900/20"
                                    : "text-green-700 border-gray-200 bg-green-50/50"
                                }`}>
                                {student.hadir}
                              </td>
                              <td
                                className={`p-2 text-center font-bold border-r ${
                                  darkMode
                                    ? "text-blue-300 border-slate-700 bg-blue-900/20"
                                    : "text-blue-700 border-gray-200 bg-blue-50/50"
                                }`}>
                                {student.izin}
                              </td>
                              <td
                                className={`p-2 text-center font-bold border-r ${
                                  darkMode
                                    ? "text-yellow-300 border-slate-700 bg-yellow-900/20"
                                    : "text-yellow-700 border-gray-200 bg-yellow-50/50"
                                }`}>
                                {student.sakit}
                              </td>
                              <td
                                className={`p-2 text-center font-bold border-r-2 ${
                                  darkMode
                                    ? "text-red-300 border-slate-600 bg-red-900/20"
                                    : "text-red-700 border-gray-400 bg-red-50/50"
                                }`}>
                                {student.alpa}
                              </td>
                              <td
                                className={`p-2 text-center font-bold border-r ${
                                  darkMode
                                    ? "text-slate-200 border-slate-700"
                                    : "text-gray-800 border-gray-200"
                                }`}>
                                {student.total}
                              </td>
                              <td
                                className={`p-2 text-center font-bold ${
                                  darkMode ? "text-slate-200" : "text-gray-800"
                                }`}>
                                {student.percentage}%
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={attendanceDates.length + 8}
                              className="p-8 text-center text-gray-500">
                              <div className="text-3xl mb-3">📅</div>
                              <h4 className="font-semibold mb-2">
                                Belum Ada Data
                              </h4>
                              <p className="text-sm">
                                Belum ada data presensi untuk bulan ini
                              </p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                /* SEMESTER VIEW */
                <div className="overflow-auto flex-1">
                  <table className="w-full text-xs sm:text-sm border-collapse">
                    <thead
                      className={`${
                        darkMode ? "bg-slate-700" : "bg-gray-100"
                      } sticky top-0 z-20`}>
                      <tr
                        className={`border-b-2 ${
                          darkMode ? "border-slate-600" : "border-gray-400"
                        }`}>
                        <th
                          className={`p-2 text-center font-bold ${
                            darkMode ? "text-slate-200" : "text-gray-800"
                          } border-r ${
                            darkMode ? "border-slate-600" : "border-gray-300"
                          } min-w-[40px]`}>
                          No
                        </th>
                        <th
                          className={`p-2 text-center font-bold ${
                            darkMode ? "text-slate-200" : "text-gray-800"
                          } border-r ${
                            darkMode ? "border-slate-600" : "border-gray-300"
                          } min-w-[120px]`}>
                          NIS
                        </th>
                        <th
                          className={`p-2 text-left font-bold ${
                            darkMode ? "text-slate-200" : "text-gray-800"
                          } border-r ${
                            darkMode ? "border-slate-600" : "border-gray-300"
                          } min-w-[180px]`}>
                          Nama Siswa
                        </th>
                        <th
                          className={`p-2 text-center font-bold ${
                            darkMode ? "text-green-300" : "text-green-700"
                          } border-r ${
                            darkMode ? "border-slate-600" : "border-gray-300"
                          } min-w-[60px] ${
                            darkMode ? "bg-green-900/30" : "bg-green-50"
                          }`}>
                          Hadir
                        </th>
                        <th
                          className={`p-2 text-center font-bold ${
                            darkMode ? "text-yellow-300" : "text-yellow-700"
                          } border-r ${
                            darkMode ? "border-slate-600" : "border-gray-300"
                          } min-w-[60px] ${
                            darkMode ? "bg-yellow-900/30" : "bg-yellow-50"
                          }`}>
                          Sakit
                        </th>
                        <th
                          className={`p-2 text-center font-bold ${
                            darkMode ? "text-blue-300" : "text-blue-700"
                          } border-r ${
                            darkMode ? "border-slate-600" : "border-gray-300"
                          } min-w-[60px] ${
                            darkMode ? "bg-blue-900/30" : "bg-blue-50"
                          }`}>
                          Izin
                        </th>
                        <th
                          className={`p-2 text-center font-bold ${
                            darkMode ? "text-red-300" : "text-red-700"
                          } border-r ${
                            darkMode ? "border-slate-600" : "border-gray-300"
                          } min-w-[60px] ${
                            darkMode ? "bg-red-900/30" : "bg-red-50"
                          }`}>
                          Alpa
                        </th>
                        <th
                          className={`p-2 text-center font-bold ${
                            darkMode ? "text-slate-200" : "text-gray-800"
                          } border-r ${
                            darkMode ? "border-slate-600" : "border-gray-300"
                          } min-w-[60px]`}>
                          Total
                        </th>
                        <th
                          className={`p-2 text-center font-bold ${
                            darkMode ? "text-slate-200" : "text-gray-800"
                          } border-r ${
                            darkMode ? "border-slate-600" : "border-gray-300"
                          } min-w-[70px]`}>
                          %
                        </th>
                        <th
                          className={`p-2 text-center font-bold ${
                            darkMode ? "text-slate-200" : "text-gray-800"
                          } min-w-[100px]`}>
                          Kategori
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rekapData.length > 0 ? (
                        rekapData.map((student) => {
                          const category = getAttendanceCategory(
                            student.percentage
                          );
                          return (
                            <tr
                              key={student.studentId}
                              className={`border-b ${
                                darkMode
                                  ? "border-slate-700 hover:bg-slate-700"
                                  : "border-gray-200 hover:bg-blue-50"
                              } transition`}>
                              <td
                                className={`p-2 text-center border-r ${
                                  darkMode
                                    ? "border-slate-700 text-slate-200"
                                    : "border-gray-200 text-gray-800"
                                } font-medium`}>
                                {student.no}
                              </td>
                              <td
                                className={`p-2 text-center border-r ${
                                  darkMode
                                    ? "border-slate-700 text-slate-200"
                                    : "border-gray-200 text-gray-800"
                                } font-mono text-xs`}>
                                {student.nis}
                              </td>
                              <td
                                className={`p-2 border-r ${
                                  darkMode
                                    ? "border-slate-700 text-slate-200"
                                    : "border-gray-200 text-gray-800"
                                } font-medium`}>
                                {student.name}
                              </td>
                              <td
                                className={`p-2 text-center font-bold border-r ${
                                  darkMode
                                    ? "text-green-300 border-slate-700 bg-green-900/20"
                                    : "text-green-700 border-gray-200 bg-green-50/30"
                                }`}>
                                {student.hadir}
                              </td>
                              <td
                                className={`p-2 text-center font-bold border-r ${
                                  darkMode
                                    ? "text-yellow-300 border-slate-700 bg-yellow-900/20"
                                    : "text-yellow-700 border-gray-200 bg-yellow-50/30"
                                }`}>
                                {student.sakit}
                              </td>
                              <td
                                className={`p-2 text-center font-bold border-r ${
                                  darkMode
                                    ? "text-blue-300 border-slate-700 bg-blue-900/20"
                                    : "text-blue-700 border-gray-200 bg-blue-50/30"
                                }`}>
                                {student.izin}
                              </td>
                              <td
                                className={`p-2 text-center font-bold border-r ${
                                  darkMode
                                    ? "text-red-300 border-slate-700 bg-red-900/20"
                                    : "text-red-700 border-gray-200 bg-red-50/30"
                                }`}>
                                {student.alpa}
                              </td>
                              <td
                                className={`p-2 text-center font-bold border-r ${
                                  darkMode
                                    ? "text-slate-200 border-slate-700"
                                    : "text-gray-800 border-gray-200"
                                }`}>
                                {student.total}
                              </td>
                              <td
                                className={`p-2 text-center font-bold border-r ${
                                  darkMode
                                    ? "border-slate-700"
                                    : "border-gray-200"
                                }`}>
                                <span
                                  className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-semibold ${
                                    student.percentage >= 90
                                      ? darkMode
                                        ? "bg-green-900/30 text-green-300"
                                        : "bg-green-100 text-green-700"
                                      : student.percentage >= 80
                                      ? darkMode
                                        ? "bg-blue-900/30 text-blue-300"
                                        : "bg-blue-100 text-blue-700"
                                      : student.percentage >= 70
                                      ? darkMode
                                        ? "bg-yellow-900/30 text-yellow-300"
                                        : "bg-yellow-100 text-yellow-700"
                                      : darkMode
                                      ? "bg-red-900/30 text-red-300"
                                      : "bg-red-100 text-red-700"
                                  }`}>
                                  {student.percentage}%
                                </span>
                              </td>
                              <td className="p-2 text-center">
                                <span
                                  className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold ${category.color}`}>
                                  {category.text}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={10}
                            className={`p-8 text-center ${
                              darkMode ? "text-slate-400" : "text-gray-500"
                            }`}>
                            <div className="text-3xl mb-3">📊</div>
                            <h4 className="font-semibold mb-2">
                              Belum Ada Data
                            </h4>
                            <p className="text-sm">
                              Belum ada data presensi untuk semester ini
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`p-3 sm:p-4 border-t flex justify-between items-center flex-shrink-0 ${
            darkMode
              ? "bg-slate-800 border-slate-700"
              : "bg-gray-50 border-gray-200"
          }`}>
          <div
            className={`text-sm ${
              darkMode ? "text-slate-400" : "text-gray-600"
            }`}>
            {rekapData.length > 0 && (
              <span>
                Total {rekapData.length} siswa
                {viewMode === "monthly" &&
                  ` • ${attendanceDates.length} hari aktif`}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm sm:text-base font-medium">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

// ==============================================
// CONFIRM OVERWRITE MODAL (DARI AttendanceModals.js)
// ==============================================

const ConfirmOverwriteModal = ({
  showConfirmModal,
  setShowConfirmModal,
  selectedSubject,
  date,
  existingAttendanceData,
  pendingAttendanceData,
  loading,
  handleOverwriteConfirmation,
  handleCancelOverwrite,
}) => {
  if (!showConfirmModal) return null;

  const darkMode = document.documentElement.classList.contains("dark");

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/70 flex items-center justify-center z-50 p-3 xs:p-4 sm:p-6">
      <div
        className={`${
          darkMode ? "bg-slate-900 text-white" : "bg-white"
        } rounded-xl xs:rounded-2xl shadow-lg dark:shadow-slate-800/50 w-full max-w-md max-h-[90vh] overflow-y-auto`}>
        <div
          className={`p-4 xs:p-5 sm:p-6 border-b ${
            darkMode
              ? "border-slate-700 bg-slate-900"
              : "border-slate-200 bg-white"
          } sticky top-0`}>
          <div className="flex items-center gap-3">
            <div className="text-2xl">⚠️</div>
            <div>
              <h3
                className={`text-lg xs:text-xl font-semibold ${
                  darkMode ? "text-slate-200" : "text-slate-800"
                } leading-tight`}>
                Data Presensi Sudah Ada
              </h3>
            </div>
          </div>
        </div>

        <div className="p-4 xs:p-5 sm:p-6">
          <p
            className={`text-sm xs:text-base ${
              darkMode ? "text-slate-300" : "text-slate-700"
            } mb-4 leading-relaxed`}>
            Presensi untuk{" "}
            <strong className={darkMode ? "text-slate-100" : "text-slate-900"}>
              {selectedSubject}
            </strong>{" "}
            pada tanggal{" "}
            <strong className={darkMode ? "text-slate-100" : "text-slate-900"}>
              {date}
            </strong>{" "}
            sudah tersimpan sebelumnya.
          </p>

          <div
            className={`rounded-lg p-3 xs:p-4 mb-4 xs:mb-5 ${
              darkMode
                ? "bg-yellow-900/30 border-yellow-800"
                : "bg-yellow-50 border-yellow-200"
            } border`}>
            <p
              className={`text-sm ${
                darkMode ? "text-yellow-300" : "text-yellow-800"
              }`}>
              <strong className="font-semibold">Data yang sudah ada:</strong>{" "}
              {existingAttendanceData?.length} siswa
            </p>
          </div>

          <p
            className={`text-sm xs:text-base ${
              darkMode ? "text-slate-400" : "text-slate-600"
            } mb-6 leading-relaxed`}>
            Apakah Anda ingin{" "}
            <strong className={darkMode ? "text-slate-100" : "text-slate-900"}>
              menimpa data lama
            </strong>{" "}
            dengan data yang baru?
          </p>

          <div className="flex flex-col xs:flex-row gap-3">
            <button
              onClick={handleCancelOverwrite}
              disabled={loading}
              className={`w-full xs:flex-1 px-4 xs:px-5 py-3.5 rounded-lg border font-medium text-sm xs:text-base transition-all duration-200 touch-manipulation min-h-[44px] disabled:opacity-50 ${
                darkMode
                  ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 active:scale-95"
                  : "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200 active:scale-95"
              }`}
              aria-label="Batal timpa data">
              Batal
            </button>
            <button
              onClick={handleOverwriteConfirmation}
              disabled={loading}
              className={`w-full xs:flex-1 px-4 xs:px-5 py-3.5 rounded-lg border font-medium text-sm xs:text-base transition-all duration-200 touch-manipulation min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed ${
                darkMode
                  ? "bg-red-600 border-red-700 text-white hover:bg-red-700 active:scale-95"
                  : "bg-red-500 border-red-600 text-white hover:bg-red-600 active:scale-95"
              }`}
              aria-label="Ya, timpa data yang sudah ada">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Menimpa...</span>
                </span>
              ) : (
                "Ya, Timpa Data"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==============================================
// MAIN ATTENDANCE MODALS COMPONENT
// ==============================================

const AttendanceModals = ({
  // Modal visibility states
  showRekapModal,
  setShowRekapModal,
  showConfirmModal,
  setShowConfirmModal,

  // Data props
  selectedClass,
  selectedSubject,
  homeroomClass,
  students,
  onShowToast,
  isHomeroomDaily,
  existingAttendanceData,
  pendingAttendanceData,
  loading,
  date,

  // Handler functions
  handleOverwriteConfirmation,
  handleCancelOverwrite,
}) => {
  return (
    <>
      {/* Rekap Modal */}
      <RecapModal
        showModal={showRekapModal}
        onClose={() => setShowRekapModal(false)}
        attendanceMode={isHomeroomDaily() ? "daily" : "subject"}
        selectedClass={selectedClass}
        selectedSubject={selectedSubject}
        homeroomClass={homeroomClass}
        students={students}
        onShowToast={onShowToast}
      />

      {/* Confirm Overwrite Modal */}
      <ConfirmOverwriteModal
        showConfirmModal={showConfirmModal}
        setShowConfirmModal={setShowConfirmModal}
        selectedSubject={selectedSubject}
        date={date}
        existingAttendanceData={existingAttendanceData}
        pendingAttendanceData={pendingAttendanceData}
        loading={loading}
        handleOverwriteConfirmation={handleOverwriteConfirmation}
        handleCancelOverwrite={handleCancelOverwrite}
      />
    </>
  );
};

export default AttendanceModals;
