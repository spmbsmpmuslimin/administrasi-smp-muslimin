// AttendanceModalExport.js
import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const AttendanceModalExport = ({
  showModal,
  onClose,
  attendanceMode,
  selectedClass,
  selectedSubject,
  homeroomClass,
  students,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState("preview");
  const [rekapData, setRekapData] = useState([]);
  const [rekapLoading, setRekapLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [attendanceDates, setAttendanceDates] = useState([]);

  // Filter states
  const [selectedMonth, setSelectedMonth] = useState(
    () => new Date().getMonth() + 1
  );
  const [selectedYear, setSelectedYear] = useState(() =>
    new Date().getFullYear()
  );
  const [periodType, setPeriodType] = useState("month"); // month, semester, custom
  const [semester, setSemester] = useState("ganjil");
  const [dateRange, setDateRange] = useState([null, null]);

  // Generate year options
  const yearOptions = [];
  const maxYear = 2030;
  for (let year = 2025; year <= maxYear; year++) {
    yearOptions.push(year);
  }
  const currentYear = new Date().getFullYear();
  if (currentYear > 2030 && !yearOptions.includes(currentYear)) {
    yearOptions.push(currentYear);
  }
  yearOptions.sort((a, b) => a - b);

  // Month options
  const monthOptions = [
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

  // Semester options
  const semesterOptions = [
    { value: "ganjil", label: "Ganjil" },
    { value: "genap", label: "Genap" },
  ];

  // Normalize status function
  const normalizeStatus = (status) => {
    if (!status) return null;
    const normalized = status.toString().toLowerCase().trim();
    if (normalized === "alpha") return "alpa";
    return normalized;
  };

  // Get date range based on period type
  const getDateRangeFromPeriod = () => {
    switch (periodType) {
      case "month":
        const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
        return {
          startDate: `${selectedYear}-${String(selectedMonth).padStart(
            2,
            "0"
          )}-01`,
          endDate: `${selectedYear}-${String(selectedMonth).padStart(
            2,
            "0"
          )}-${String(lastDay).padStart(2, "0")}`,
        };

      case "semester":
        const semesterStartMonth = semester === "ganjil" ? 7 : 1; // Juli for ganjil, Jan for genap
        const semesterEndMonth = semester === "ganjil" ? 12 : 6; // Dec for ganjil, Jun for genap
        const semesterYear =
          semester === "ganjil" ? selectedYear : selectedYear;
        return {
          startDate: `${semesterYear}-${String(semesterStartMonth).padStart(
            2,
            "0"
          )}-01`,
          endDate: `${semesterYear}-${String(semesterEndMonth).padStart(
            2,
            "0"
          )}-${String(
            new Date(semesterYear, semesterEndMonth, 0).getDate()
          ).padStart(2, "0")}`,
        };

      case "custom":
        if (!dateRange[0] || !dateRange[1]) return null;
        return {
          startDate: dateRange[0].toISOString().split("T")[0],
          endDate: dateRange[1].toISOString().split("T")[0],
        };

      default:
        return null;
    }
  };

  // Fetch rekap data
  const fetchRekapData = async () => {
    if (
      (attendanceMode === "subject" && (!selectedClass || !selectedSubject)) ||
      (attendanceMode === "daily" && !homeroomClass)
    ) {
      onShowToast?.("Pilih kelas dan mata pelajaran terlebih dahulu!", "error");
      return;
    }

    if (!students || students.length === 0) {
      onShowToast?.("Data siswa tidak tersedia!", "error");
      return;
    }

    const dateRange = getDateRangeFromPeriod();
    if (!dateRange) {
      onShowToast?.("Pilih periode yang valid!", "error");
      return;
    }

    setRekapLoading(true);
    try {
      const subjectFilter =
        attendanceMode === "subject" ? selectedSubject : "Harian";
      const classFilter =
        attendanceMode === "subject" ? selectedClass : homeroomClass;
      const typeFilter = attendanceMode === "subject" ? "mapel" : "harian";

      console.log("🔍 Fetching rekap data:", {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        subjectFilter,
        classFilter,
        typeFilter,
      });

      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendances")
        .select("student_id, status, date")
        .eq("subject", subjectFilter)
        .eq("class_id", classFilter)
        .eq("type", typeFilter)
        .gte("date", dateRange.startDate)
        .lte("date", dateRange.endDate);

      if (attendanceError) throw attendanceError;

      // Get unique dates
      const uniqueDates = [
        ...new Set(attendanceData?.map((r) => r.date) || []),
      ].sort();
      setAttendanceDates(uniqueDates);

      // Process data
      const studentSummary = {};
      students.forEach((student, index) => {
        studentSummary[student.id] = {
          no: index + 1,
          studentId: student.id,
          name: student.full_name,
          nis: student.nis,
          dailyStatus: {},
          hadir: 0,
          sakit: 0,
          izin: 0,
          alpa: 0,
          total: 0,
          percentage: "0%",
        };
      });

      // Count attendance
      attendanceData?.forEach((record) => {
        if (studentSummary[record.student_id]) {
          const status = normalizeStatus(record.status);
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
            ? `${Math.round((student.hadir / student.total) * 100)}%`
            : "0%";
      });

      const finalData = Object.values(studentSummary);
      setRekapData(finalData);

      onShowToast?.(
        `✅ Data rekap berhasil dimuat untuk ${finalData.length} siswa`,
        "success"
      );
    } catch (error) {
      console.error("❌ Error fetching rekap data:", error);
      onShowToast?.("❌ Gagal memuat data rekap: " + error.message, "error");
      setRekapData([]);
    } finally {
      setRekapLoading(false);
    }
  };

  // Export to Excel function
  const exportToExcel = async () => {
    if (!rekapData.length) {
      onShowToast?.("Tidak ada data untuk diexport!", "error");
      return;
    }

    setExportLoading(true);
    try {
      const workbook = new ExcelJS.Workbook();

      // Sheet 1: Summary
      const summarySheet = workbook.addWorksheet("Summary");

      // Header Summary
      summarySheet.mergeCells("A1:F1");
      summarySheet.getCell("A1").value = "REKAP ABSENSI - SUMMARY";
      summarySheet.getCell("A1").font = { size: 16, bold: true };
      summarySheet.getCell("A1").alignment = { horizontal: "center" };

      // Period info
      summarySheet.getCell("A3").value = "Periode";
      summarySheet.getCell("B3").value = getPeriodLabel();
      summarySheet.getCell("A3").font = { bold: true };

      // Summary data
      const summaryHeaders = ["Kategori", "Jumlah"];
      const summaryData = [
        ["Total Siswa", rekapData.length],
        ["Total Hari", attendanceDates.length],
        ["Hadir", rekapData.reduce((sum, student) => sum + student.hadir, 0)],
        ["Sakit", rekapData.reduce((sum, student) => sum + student.sakit, 0)],
        ["Izin", rekapData.reduce((sum, student) => sum + student.izin, 0)],
        ["Alpa", rekapData.reduce((sum, student) => sum + student.alpa, 0)],
      ];

      summarySheet.addRow([]);
      summarySheet.addRow(summaryHeaders);
      summaryData.forEach((row) => summarySheet.addRow(row));

      // Style summary sheet
      summarySheet.getColumn(1).width = 20;
      summarySheet.getColumn(2).width = 15;

      // Sheet 2: Detail
      const detailSheet = workbook.addWorksheet("Detail Absensi");

      // Header Detail
      detailSheet.mergeCells("A1:K1");
      detailSheet.getCell("A1").value = `REKAP PRESENSI KELAS ${
        attendanceMode === "subject" ? selectedClass : homeroomClass
      }`;
      detailSheet.getCell("A1").font = { size: 14, bold: true };
      detailSheet.getCell("A1").alignment = { horizontal: "center" };

      detailSheet.mergeCells("A2:K2");
      detailSheet.getCell("A2").value = `${
        attendanceMode === "subject" ? selectedSubject : "PRESENSI HARIAN"
      } - ${getPeriodLabel()}`;
      detailSheet.getCell("A2").font = { size: 12, bold: true };
      detailSheet.getCell("A2").alignment = { horizontal: "center" };

      // Table headers
      const detailHeaders = [
        "No",
        "NIS",
        "Nama Siswa",
        ...attendanceDates.map((date) => {
          const d = new Date(date + "T00:00:00");
          return `${d.getDate()}/${d.getMonth() + 1}`;
        }),
        "Hadir",
        "Izin",
        "Sakit",
        "Alpa",
        "Total",
        "Persentase",
      ];

      detailSheet.addRow(detailHeaders);

      // Data rows
      rekapData.forEach((student) => {
        const row = [
          student.no,
          student.nis || "-",
          student.name,
          ...attendanceDates.map((date) => {
            const status = student.dailyStatus[date];
            if (!status) return "";
            return status.charAt(0).toUpperCase(); // H, S, I, A
          }),
          student.hadir,
          student.izin,
          student.sakit,
          student.alpa,
          student.total,
          student.percentage,
        ];
        detailSheet.addRow(row);
      });

      // Style detail sheet
      detailSheet.getColumn(1).width = 5; // No
      detailSheet.getColumn(2).width = 10; // NIS
      detailSheet.getColumn(3).width = 30; // Nama

      // Date columns
      for (let i = 0; i < attendanceDates.length; i++) {
        detailSheet.getColumn(4 + i).width = 6;
      }

      // Summary columns
      for (let i = 0; i < 7; i++) {
        detailSheet.getColumn(4 + attendanceDates.length + i).width = 8;
      }

      // Generate and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const filename = `Rekap_Absensi_${
        attendanceMode === "subject" ? selectedClass : homeroomClass
      }_${getPeriodLabel()}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      saveAs(blob, filename);

      onShowToast?.("✅ File Excel berhasil diunduh!", "success");
    } catch (error) {
      console.error("❌ Export error:", error);
      onShowToast?.("❌ Gagal export Excel: " + error.message, "error");
    } finally {
      setExportLoading(false);
    }
  };

  // Helper functions
  const getPeriodLabel = () => {
    switch (periodType) {
      case "month":
        return `${
          monthOptions.find((m) => m.value === selectedMonth)?.label
        } ${selectedYear}`;
      case "semester":
        return `Semester ${semester} ${selectedYear}`;
      case "custom":
        return dateRange[0] && dateRange[1]
          ? `${dateRange[0].toLocaleDateString()} - ${dateRange[1].toLocaleDateString()}`
          : "Custom Range";
      default:
        return "Unknown Period";
    }
  };

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

  const formatDateHeader = (dateStr) => {
    const date = new Date(dateStr + "T00:00:00");
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return `${day}/${month}`;
  };

  // Load data when modal opens or filters change
  useEffect(() => {
    if (showModal) {
      fetchRekapData();
    }
  }, [showModal, periodType, selectedMonth, selectedYear, semester]);

  if (!showModal) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={onClose}>
      <div
        className="bg-white rounded-lg sm:rounded-xl w-full max-w-7xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-400 to-blue-500 text-white p-3 sm:p-4 flex justify-between items-center flex-shrink-0 gap-3">
          <h2 className="text-sm sm:text-lg font-bold">
            📊 Rekap & Export Presensi
          </h2>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              className="text-white text-lg sm:text-xl hover:bg-white/20 p-1 rounded-lg transition"
              onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 flex-shrink-0">
          <div className="flex">
            <button
              className={`px-4 py-3 font-medium text-sm transition ${
                activeTab === "preview"
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("preview")}>
              📊 Lihat Rekap
            </button>
            <button
              className={`px-4 py-3 font-medium text-sm transition ${
                activeTab === "export"
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("export")}>
              📤 Export Excel
            </button>
          </div>
        </div>

        {/* Filter Section */}
        <div className="p-3 sm:p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Period Type */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Jenis Periode
              </label>
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value)}
                className="p-2 border border-gray-300 rounded text-sm">
                <option value="month">Bulanan</option>
                <option value="semester">Semester</option>
                <option value="custom">Rentang Kustom</option>
              </select>
            </div>

            {/* Month Selection */}
            {periodType === "month" && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Bulan
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="p-2 border border-gray-300 rounded text-sm">
                    {monthOptions.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Tahun
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="p-2 border border-gray-300 rounded text-sm">
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Semester Selection */}
            {periodType === "semester" && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Semester
                  </label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="p-2 border border-gray-300 rounded text-sm">
                    {semesterOptions.map((sem) => (
                      <option key={sem.value} value={sem.value}>
                        {sem.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Tahun
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="p-2 border border-gray-300 rounded text-sm">
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Custom Date Range */}
            {periodType === "custom" && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Rentang Tanggal
                </label>
                <input
                  type="date"
                  value={dateRange[0]?.toISOString().split("T")[0] || ""}
                  onChange={(e) =>
                    setDateRange([new Date(e.target.value), dateRange[1]])
                  }
                  className="p-2 border border-gray-300 rounded text-sm"
                />
                <span className="mx-2">s/d</span>
                <input
                  type="date"
                  value={dateRange[1]?.toISOString().split("T")[0] || ""}
                  onChange={(e) =>
                    setDateRange([dateRange[0], new Date(e.target.value)])
                  }
                  className="p-2 border border-gray-300 rounded text-sm"
                />
              </div>
            )}

            <button
              onClick={fetchRekapData}
              disabled={rekapLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50">
              {rekapLoading ? "Memuat..." : "Terapkan"}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden p-3 sm:p-4">
          {activeTab === "preview" ? (
            /* PREVIEW TAB */
            <div className="h-full flex flex-col">
              {/* Header Info */}
              <div className="mb-4 text-center border border-gray-200 rounded-lg p-3 bg-white">
                <h3 className="text-sm sm:text-base font-bold text-gray-800">
                  SMP MUSLIMIN CILILIN - REKAP PRESENSI KELAS{" "}
                  {attendanceMode === "subject" ? selectedClass : homeroomClass}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  {attendanceMode === "subject" && selectedSubject && (
                    <>{selectedSubject.toUpperCase()}</>
                  )}
                  {attendanceMode === "daily" && <>PRESENSI HARIAN</>}
                  {" | "}
                  {getPeriodLabel()}
                </p>
              </div>

              {/* Data Table */}
              {rekapLoading ? (
                <div className="flex items-center justify-center p-8 text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
                  Memuat data...
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm flex-1 flex flex-col">
                  {attendanceDates.length > 0 && (
                    <div className="bg-blue-50 p-2 text-center text-xs text-blue-700 sm:hidden border-b border-blue-200">
                      👉 Geser tabel ke kanan untuk melihat tanggal lainnya
                    </div>
                  )}

                  <div className="overflow-auto flex-1">
                    <table className="w-full text-xs sm:text-sm border-collapse">
                      <thead className="bg-gray-100 sticky top-0 z-20">
                        <tr className="border-b-2 border-gray-400">
                          <th className="p-2 text-center font-bold text-gray-800 border-r-2 border-gray-300 sticky left-0 bg-gray-100 z-30 min-w-[40px]">
                            No.
                          </th>
                          <th className="p-2 text-left font-bold text-gray-800 border-r-2 border-gray-300 sticky left-[40px] bg-gray-100 z-30 min-w-[140px] sm:min-w-[200px]">
                            Nama Siswa
                          </th>

                          {attendanceDates.map((date, index) => (
                            <th
                              key={date}
                              className={`p-2 text-center font-bold text-gray-800 min-w-[45px] whitespace-nowrap ${
                                index < attendanceDates.length - 1
                                  ? "border-r border-gray-300"
                                  : "border-r-2 border-gray-400"
                              }`}>
                              {formatDateHeader(date)}
                            </th>
                          ))}

                          <th className="p-2 text-center font-bold text-green-700 border-r border-gray-300 min-w-[40px] bg-green-50">
                            Hadir
                          </th>
                          <th className="p-2 text-center font-bold text-blue-700 border-r border-gray-300 min-w-[40px] bg-blue-50">
                            Izin
                          </th>
                          <th className="p-2 text-center font-bold text-yellow-700 border-r border-gray-300 min-w-[40px] bg-yellow-50">
                            Sakit
                          </th>
                          <th className="p-2 text-center font-bold text-red-700 border-r-2 border-gray-400 min-w-[40px] bg-red-50">
                            Alpa
                          </th>
                          <th className="p-2 text-center font-bold text-gray-800 border-r border-gray-300 min-w-[45px]">
                            Total
                          </th>
                          <th className="p-2 text-center font-bold text-gray-800 min-w-[50px] sm:min-w-[70px]">
                            Persentase
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rekapData.length > 0 ? (
                          rekapData.map((student) => (
                            <tr
                              key={student.studentId}
                              className="border-b border-gray-200 hover:bg-blue-50 transition">
                              <td className="p-2 text-center border-r-2 border-gray-300 sticky left-0 bg-white z-10 font-medium">
                                {student.no}
                              </td>
                              <td className="p-2 font-medium text-gray-800 border-r-2 border-gray-300 sticky left-[40px] bg-white z-10">
                                {student.name}
                              </td>

                              {attendanceDates.map((date, index) => (
                                <td
                                  key={date}
                                  className={`p-2 text-center ${
                                    index < attendanceDates.length - 1
                                      ? "border-r border-gray-200"
                                      : "border-r-2 border-gray-400"
                                  }`}>
                                  {getStatusBadge(student.dailyStatus[date])}
                                </td>
                              ))}

                              <td className="p-2 text-center text-green-700 font-bold border-r border-gray-200 bg-green-50/50">
                                {student.hadir}
                              </td>
                              <td className="p-2 text-center text-blue-700 font-bold border-r border-gray-200 bg-blue-50/50">
                                {student.izin}
                              </td>
                              <td className="p-2 text-center text-yellow-700 font-bold border-r border-gray-200 bg-yellow-50/50">
                                {student.sakit}
                              </td>
                              <td className="p-2 text-center text-red-700 font-bold border-r-2 border-gray-400 bg-red-50/50">
                                {student.alpa}
                              </td>
                              <td className="p-2 text-center font-bold text-gray-800 border-r border-gray-200">
                                {student.total}
                              </td>
                              <td className="p-2 text-center font-bold text-gray-800">
                                {student.percentage}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={attendanceDates.length + 8}
                              className="p-8 text-center text-gray-500">
                              <div className="text-3xl sm:text-4xl mb-3">
                                📅
                              </div>
                              <h4 className="font-semibold mb-2 text-sm sm:text-base">
                                Belum Ada Data
                              </h4>
                              <p className="text-xs sm:text-sm">
                                Belum ada data presensi untuk periode ini
                              </p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* EXPORT TAB */
            <div className="h-full flex flex-col items-center justify-center p-8">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>

                <h3 className="text-lg font-bold text-gray-800 mb-2">
                  Export Data ke Excel
                </h3>
                <p className="text-gray-600 mb-6">
                  Data akan diexport dalam format Excel dengan 2 sheet: Summary
                  dan Detail Absensi
                </p>

                {rekapData.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-700">
                      <strong>{rekapData.length} siswa</strong> siap diexport
                      untuk periode <strong>{getPeriodLabel()}</strong>
                    </p>
                  </div>
                )}

                <button
                  onClick={exportToExcel}
                  disabled={exportLoading || rekapData.length === 0}
                  className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium flex items-center gap-2 mx-auto">
                  {exportLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Mengexport...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span>Download Excel</span>
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-500 mt-4">
                  File akan berisi data lengkap dengan format yang rapi dan siap
                  dicetak
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-3 sm:p-4 border-t border-gray-200 flex justify-end flex-shrink-0">
          <button
            className="w-full sm:w-auto px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm sm:text-base font-medium"
            onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttendanceModalExport;
