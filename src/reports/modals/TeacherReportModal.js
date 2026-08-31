import React, { useState, useMemo, useEffect } from "react";
import {
  X,
  Download,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Search,
  AlertCircle,
  BookOpen,
  Calendar,
  BarChart3,
  TrendingUp,
  Filter,
  Smartphone,
  Tablet,
  Monitor,
} from "lucide-react";

// ==================== TEACHER REPORT MODAL ====================
// 👨‍🏫 Modal khusus untuk preview laporan Guru Mapel
// Supports: Nilai Mata Pelajaran, Presensi Mapel, Rekapitulasi Per Kelas

const TeacherReportModal = ({
  isOpen,
  onClose,
  reportData = {},
  reportType,
  onDownload,
  loading = false,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // Set items per page berdasarkan device
  const itemsPerPage = useMemo(() => {
    if (isMobile) return 10;
    if (isTablet) return 20;
    return 50;
  }, [isMobile, isTablet]);

  // Detect device size
  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640);
      setIsTablet(width >= 640 && width < 1024);
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  // ✅ Destructure report data safely
  const {
    preview = [],
    fullData = [],
    headers = [],
    summary = [],
    reportTitle = "LAPORAN GURU MATA PELAJARAN",
    total = 0,
  } = reportData;

  // ✅ Use preview if fullData is empty (backward compatibility)
  const dataToUse = fullData.length > 0 ? fullData : preview;

  // ✅ Auto-generate headers if empty or missing
  const effectiveHeaders = useMemo(() => {
    if (headers && headers.length > 0) {
      return headers;
    }

    // Auto-generate from first data row
    if (dataToUse.length > 0) {
      const firstRow = dataToUse[0];
      return Object.keys(firstRow).map((key) => {
        // Convert snake_case to Title Case
        return key
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      });
    }

    return [];
  }, [headers, dataToUse]);

  // ✅ DEBUG: Log received data
  React.useEffect(() => {
    if (isOpen) {
      console.log("👨‍🏫 Teacher Modal Opened");
      console.log("📦 Received reportData:", reportData);
      console.log("📊 dataToUse length:", dataToUse.length);
      console.log("📋 Original headers:", headers);
      console.log("📋 Effective headers:", effectiveHeaders);
      if (dataToUse.length > 0) {
        console.log("🔑 First row keys:", Object.keys(dataToUse[0]));
        console.log("📄 First row data:", dataToUse[0]);
      }
      console.log("🎯 reportType:", reportType);
      console.log("📱 Device:", isMobile ? "Mobile" : isTablet ? "Tablet" : "Desktop");
    }
  }, [isOpen, reportData, dataToUse, headers, effectiveHeaders, reportType, isMobile, isTablet]);

  // ✅ Get report icon based on type
  const getReportIcon = () => {
    switch (reportType) {
      case "teacher-grades":
      case "grades":
        return BarChart3;
      case "teacher-attendance":
      case "attendance":
        return Calendar;
      case "teacher-recap":
      case "class-performance":
        return BookOpen;
      default:
        return FileSpreadsheet;
    }
  };

  const ReportIcon = getReportIcon();

  // ✅ Get report color theme
  const getThemeColor = () => {
    switch (reportType) {
      case "teacher-grades":
      case "grades":
        return "blue";
      case "teacher-attendance":
      case "attendance":
        return "indigo";
      case "teacher-recap":
      case "class-performance":
        return "teal";
      default:
        return "purple";
    }
  };

  const themeColor = getThemeColor();

  // ✅ Color classes mapping dengan dark mode
  const colorClasses = {
    blue: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      border: "border-blue-200 dark:border-blue-700",
      text: "text-blue-600 dark:text-blue-400",
      button: "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600",
      light: "bg-blue-100 dark:bg-blue-900/30",
    },
    indigo: {
      bg: "bg-indigo-50 dark:bg-indigo-900/20",
      border: "border-indigo-200 dark:border-indigo-700",
      text: "text-indigo-600 dark:text-indigo-400",
      button: "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600",
      light: "bg-indigo-100 dark:bg-indigo-900/30",
    },
    teal: {
      bg: "bg-teal-50 dark:bg-teal-900/20",
      border: "border-teal-200 dark:border-teal-700",
      text: "text-teal-600 dark:text-teal-400",
      button: "bg-teal-600 hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-600",
      light: "bg-teal-100 dark:bg-teal-900/30",
    },
    purple: {
      bg: "bg-purple-50 dark:bg-purple-900/20",
      border: "border-purple-200 dark:border-purple-700",
      text: "text-purple-600 dark:text-purple-400",
      button: "bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600",
      light: "bg-purple-100 dark:bg-purple-900/30",
    },
  };

  const colors = colorClasses[themeColor];

  // ✅ Extract unique subjects and classes for filtering
  const uniqueSubjects = useMemo(() => {
    const subjects = new Set();
    dataToUse.forEach((row) => {
      if (row["Mata Pelajaran"]) subjects.add(row["Mata Pelajaran"]);
      if (row.subject) subjects.add(row.subject);
    });
    return Array.from(subjects).sort();
  }, [dataToUse]);

  const uniqueClasses = useMemo(() => {
    const classes = new Set();
    dataToUse.forEach((row) => {
      if (row.Kelas) classes.add(row.Kelas);
      if (row.class_id) classes.add(row.class_id);
    });
    return Array.from(classes).sort();
  }, [dataToUse]);

  // ✅ Filter data based on search and filters
  const filteredData = useMemo(() => {
    let filtered = dataToUse;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((row) =>
        Object.values(row).some((value) => String(value).toLowerCase().includes(query))
      );
    }

    // Subject filter
    if (filterSubject) {
      filtered = filtered.filter(
        (row) => row["Mata Pelajaran"] === filterSubject || row.subject === filterSubject
      );
    }

    // Class filter
    if (filterClass) {
      filtered = filtered.filter(
        (row) => row.Kelas === filterClass || row.class_id === filterClass
      );
    }

    return filtered;
  }, [dataToUse, searchQuery, filterSubject, filterClass]);

  // ✅ Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  // ✅ Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterSubject, filterClass, itemsPerPage]);

  // ✅ Render cell with conditional formatting
  const renderCell = (header, value) => {
    // Attendance status colors with dark mode
    if (header === "Status" || header === "Status Kehadiran" || header === "status") {
      const statusColors = {
        Hadir: "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300",
        Sakit: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300",
        Izin: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300",
        Alpa: "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300",
        "Tidak Hadir": "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300",
      };
      const colorClass =
        statusColors[value] || "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300";
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>{value}</span>
      );
    }

    // Percentage with color coding
    if (
      (header === "Tingkat Kehadiran" || header === "Persentase") &&
      typeof value === "string" &&
      value.includes("%")
    ) {
      const pct = parseFloat(value);
      let colorClass = "text-gray-600 dark:text-gray-400";
      if (pct >= 90) colorClass = "text-green-600 dark:text-green-400 font-bold";
      else if (pct >= 75) colorClass = "text-yellow-600 dark:text-yellow-400 font-bold";
      else colorClass = "text-red-600 dark:text-red-400 font-bold";

      return <span className={colorClass}>{value}</span>;
    }

    // Grades with color coding
    if (
      (header === "Nilai" ||
        header === "Nilai Akhir" ||
        header === "Rata-rata Nilai" ||
        header === "Rata-rata" ||
        header === "average" ||
        header === "score") &&
      typeof value === "number"
    ) {
      let colorClass = "text-gray-600 dark:text-gray-400";
      if (value >= 85) colorClass = "text-green-600 dark:text-green-400 font-bold";
      else if (value >= 70) colorClass = "text-yellow-600 dark:text-yellow-400 font-bold";
      else colorClass = "text-red-600 dark:text-red-400 font-bold";

      return <span className={colorClass}>{value}</span>;
    }

    // Highlight subject and class columns
    if (header === "Mata Pelajaran" || header === "subject") {
      return (
        <span className="font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded text-xs md:text-sm">
          {value}
        </span>
      );
    }

    if (header === "Kelas" || header === "class_id") {
      return (
        <span className="font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded text-xs md:text-sm">
          {value}
        </span>
      );
    }

    return value !== undefined && value !== null ? value : "-";
  };

  // ✅ Calculate filtered summary dengan warna pastel
  const filteredSummary = useMemo(() => {
    if ((reportType === "teacher-grades" || reportType === "grades") && filteredData.length > 0) {
      const grades = filteredData
        .map((row) => row["Nilai Akhir"] || row.final_score || row.score)
        .filter((g) => typeof g === "number");

      if (grades.length > 0) {
        const avg = (grades.reduce((sum, g) => sum + g, 0) / grades.length).toFixed(2);
        const max = Math.max(...grades);
        const min = Math.min(...grades);

        return [
          { label: "Total Data", value: filteredData.length },
          { label: "Rata-rata", value: avg },
          { label: "Tertinggi", value: max },
          { label: "Terendah", value: min },
        ];
      }
    }

    if (
      (reportType === "teacher-attendance" || reportType === "attendance") &&
      filteredData.length > 0
    ) {
      const hadir = filteredData.filter(
        (row) => row.Status === "Hadir" || row.status === "hadir"
      ).length;
      const total = filteredData.length;
      const pct = total > 0 ? ((hadir / total) * 100).toFixed(1) : 0;

      return [
        { label: "Total Presensi", value: total },
        { label: "Hadir", value: hadir },
        { label: "Tidak Hadir", value: total - hadir },
        { label: "Persentase Hadir", value: `${pct}%` },
      ];
    }

    return summary;
  }, [reportType, filteredData, summary]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-2 sm:p-4 md:p-6">
      <div
        className="
        bg-white dark:bg-slate-900 
        rounded-xl sm:rounded-2xl 
        shadow-2xl dark:shadow-black/50
        w-full max-w-full sm:max-w-6xl lg:max-w-7xl 
        max-h-[95vh] sm:max-h-[90vh]
        flex flex-col
        border border-slate-200 dark:border-slate-700
      "
      >
        {/* ===== HEADER ===== */}
        <div className={`${colors.bg} border-b-2 ${colors.border} p-4 sm:p-6`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div
                className={`
                  w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 
                  ${colors.bg} border-2 ${colors.border} 
                  rounded-lg sm:rounded-xl 
                  flex items-center justify-center flex-shrink-0
                `}
              >
                <ReportIcon className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 ${colors.text}`} />
              </div>
              <div className="min-w-0">
                <h2
                  className="
                  text-lg sm:text-xl md:text-2xl 
                  font-bold text-slate-800 dark:text-white
                  leading-tight line-clamp-2
                "
                >
                  {reportTitle}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    Preview Data • {filteredData.length} dari {total} record
                  </p>
                  <span
                    className="
                    hidden sm:inline-flex items-center gap-1 
                    px-2 py-1 rounded-full 
                    bg-slate-200 dark:bg-slate-700 
                    text-xs text-slate-600 dark:text-slate-400
                  "
                  >
                    {isMobile ? (
                      <>
                        <Smartphone className="w-3 h-3" /> Mobile
                      </>
                    ) : isTablet ? (
                      <>
                        <Tablet className="w-3 h-3" /> Tablet
                      </>
                    ) : (
                      <>
                        <Monitor className="w-3 h-3" /> Desktop
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="
                text-slate-400 dark:text-slate-500 
                hover:text-slate-600 dark:hover:text-slate-300 
                transition-colors
                p-1.5 sm:p-2 rounded-full 
                hover:bg-slate-100 dark:hover:bg-slate-800
                min-h-[44px] min-w-[44px] flex items-center justify-center
              "
              aria-label="Tutup modal"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* ===== SUMMARY CARDS dengan Warna Pastel ===== */}
        {filteredSummary && filteredSummary.length > 0 && (
          <div
            className="
            px-4 sm:px-6 py-3 
            bg-slate-50 dark:bg-slate-800/50 
            border-b border-slate-200 dark:border-slate-700
          "
          >
            <div className="grid grid-cols-2 sm:flex sm:gap-2">
              {filteredSummary.map((stat, idx) => {
                // Soft pastel colors with dark mode
                const pastelColors = [
                  "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-700",
                  "bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-700",
                  "bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-700",
                  "bg-pink-50 dark:bg-pink-900/20 border-pink-100 dark:border-pink-700",
                  "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-700",
                  "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-700",
                ];
                const colorClass = pastelColors[idx % pastelColors.length];

                return (
                  <div
                    key={idx}
                    className={`${colorClass} rounded-lg border p-2 sm:p-2.5 text-center min-w-0`}
                  >
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1 truncate">
                      {stat.label}
                    </p>
                    <p className="text-sm sm:text-base md:text-lg font-bold text-slate-800 dark:text-white truncate">
                      {stat.value}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== SEARCH & FILTER BAR ===== */}
        <div
          className="
          px-4 sm:px-6 py-3 sm:py-4 
          bg-white dark:bg-slate-900 
          border-b border-slate-200 dark:border-slate-700
        "
        >
          <div className="flex flex-col gap-3">
            {/* Search Input */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Cari siswa, NIS, atau data lainnya..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="
                  w-full pl-10 sm:pl-11 pr-4 
                  py-2.5 sm:py-3 md:py-2
                  border border-slate-300 dark:border-slate-600
                  rounded-lg 
                  bg-white dark:bg-slate-800
                  text-slate-800 dark:text-white
                  placeholder:text-slate-500 dark:placeholder:text-slate-400
                  focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400
                  focus:border-indigo-500 dark:focus:border-indigo-400
                  text-sm
                "
              />
            </div>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Subject Filter */}
              {uniqueSubjects.length > 0 && (
                <div className="flex-1 min-w-0">
                  <select
                    value={filterSubject}
                    onChange={(e) => setFilterSubject(e.target.value)}
                    className="
                      w-full px-3 py-2.5 sm:py-2
                      border border-slate-300 dark:border-slate-600
                      rounded-lg 
                      bg-white dark:bg-slate-800
                      text-slate-800 dark:text-white
                      focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400
                      focus:border-indigo-500 dark:focus:border-indigo-400
                      text-sm
                    "
                  >
                    <option value="">Semua Mapel</option>
                    {uniqueSubjects.map((subject) => (
                      <option key={subject} value={subject}>
                        {isMobile
                          ? subject.slice(0, 15) + (subject.length > 15 ? "..." : "")
                          : subject}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Class Filter */}
              {uniqueClasses.length > 0 && (
                <div className="flex-1 min-w-0">
                  <select
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                    className="
                      w-full px-3 py-2.5 sm:py-2
                      border border-slate-300 dark:border-slate-600
                      rounded-lg 
                      bg-white dark:bg-slate-800
                      text-slate-800 dark:text-white
                      focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400
                      focus:border-indigo-500 dark:focus:border-indigo-400
                      text-sm
                    "
                  >
                    <option value="">Semua Kelas</option>
                    {uniqueClasses.map((kelas) => (
                      <option key={kelas} value={kelas}>
                        Kelas {kelas}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Reset Button */}
              {(searchQuery || filterSubject || filterClass) && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setFilterSubject("");
                    setFilterClass("");
                  }}
                  className="
                    px-4 py-2.5 sm:py-2
                    text-sm text-slate-600 dark:text-slate-400 
                    hover:text-slate-800 dark:hover:text-slate-300 
                    font-medium whitespace-nowrap
                    border border-slate-300 dark:border-slate-600
                    rounded-lg
                    hover:bg-slate-50 dark:hover:bg-slate-800
                    transition-colors
                  "
                >
                  Reset Filter
                </button>
              )}
            </div>

            {/* Active Filters Info */}
            {(filterSubject || filterClass) && (
              <div className="flex items-center gap-2 mt-1">
                <Filter className="w-3 h-3 sm:w-4 sm:h-4 text-slate-500 dark:text-slate-400" />
                <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  Filter aktif:
                </span>
                {filterSubject && (
                  <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-full font-medium">
                    {filterSubject}
                  </span>
                )}
                {filterClass && (
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full font-medium">
                    Kelas {filterClass}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ===== TABLE CONTENT ===== */}
        <div className="flex-1 overflow-auto p-2 sm:p-3 md:p-4 lg:p-6">
          {currentData.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="w-full border-collapse min-w-max">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-300 dark:border-slate-700">
                    <th
                      className="
                      px-3 py-2 sm:px-4 sm:py-3 
                      text-left text-xs font-bold 
                      text-slate-700 dark:text-slate-300 
                      uppercase tracking-wider 
                      border-r border-slate-200 dark:border-slate-700
                      whitespace-nowrap
                      sticky left-0 bg-inherit z-10
                    "
                    >
                      No
                    </th>
                    {effectiveHeaders.map((header, idx) => (
                      <th
                        key={idx}
                        className="
                          px-3 py-2 sm:px-4 sm:py-3 
                          text-left text-xs font-bold 
                          text-slate-700 dark:text-slate-300 
                          uppercase tracking-wider 
                          border-r border-slate-200 dark:border-slate-700
                          whitespace-nowrap
                          min-w-[120px]
                        "
                      >
                        <div className="truncate">
                          {isMobile && header.length > 15
                            ? header.slice(0, 12) + "..."
                            : isTablet && header.length > 20
                            ? header.slice(0, 17) + "..."
                            : header}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                  {currentData.map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      className="
                        hover:bg-slate-50 dark:hover:bg-slate-800/50 
                        transition-colors
                      "
                    >
                      <td
                        className="
                        px-3 py-2 sm:px-4 sm:py-3 
                        text-sm text-slate-600 dark:text-slate-400 
                        border-r border-slate-200 dark:border-slate-700
                        font-medium
                        sticky left-0 bg-inherit z-10
                        whitespace-nowrap
                      "
                      >
                        {startIndex + rowIdx + 1}
                      </td>
                      {effectiveHeaders.map((header, colIdx) => {
                        // ✅ Get original key from data
                        const originalKeys = Object.keys(row);
                        let value = row[header]; // Try exact match first

                        // If header is generated (Title Case), find matching snake_case key
                        if (value === undefined || value === null) {
                          const snakeCase = header.toLowerCase().replace(/\s+/g, "_");
                          value = row[snakeCase];
                        }

                        // Try direct key match from original data
                        if (value === undefined || value === null) {
                          const matchingKey = originalKeys.find(
                            (k) =>
                              k.toLowerCase() === header.toLowerCase() ||
                              k.toLowerCase().replace(/_/g, " ") === header.toLowerCase()
                          );
                          if (matchingKey) {
                            value = row[matchingKey];
                          }
                        }

                        if (value === undefined || value === null) {
                          // Try common alternatives - EXPANDED MAPPING
                          const keyMap = {
                            NIS: ["nis", "student_nis"],
                            "Nama Lengkap": ["full_name", "name", "student_name"],
                            "Nama Siswa": ["full_name", "name", "student_name"],
                            "Jenis Kelamin": ["gender"],
                            Kelas: ["class_id", "class"],
                            "Tahun Ajaran": ["academic_year"],
                            Tingkat: ["grade"],
                            Status: ["status", "is_active"],
                            Tanggal: ["date"],
                            "Status Kehadiran": ["status"],
                            "Mata Pelajaran": ["subject", "mata_pelajaran"],
                            Nilai: ["score", "final_score"],
                            "Nilai Akhir": ["final_score", "score"],
                            Semester: ["semester"],
                            Guru: ["teacher", "teacher_name"],
                            "Rata-rata Nilai": ["avg_grade", "average"],
                            "Rata-rata": ["average", "avg_grade"],
                            "Total Nilai": ["total_grades"],
                            "Total Presensi": ["total_attendance"],
                            "Tingkat Kehadiran": ["attendance_rate", "persentase", "percentage"],
                            "Jumlah Siswa": ["total_students"],
                            Tertinggi: ["highest"],
                            Terendah: ["lowest"],
                            "Di Bawah KKM": ["below_kkm"],
                            Hadir: ["hadir", "present"],
                            Sakit: ["sakit", "sick"],
                            Izin: ["izin", "permission"],
                            Alpa: ["alpa", "absent", "tidak_hadir"],
                            Absen: ["tidak_hadir", "absent"],
                            Total: ["total", "total_days"],
                            Persentase: ["persentase", "percentage", "attendance_rate"],
                          };

                          const alternatives = keyMap[header] || [];
                          for (const alt of alternatives) {
                            if (row[alt] !== undefined && row[alt] !== null) {
                              value = row[alt];
                              break;
                            }
                          }
                        }

                        // Default to "-" if still not found
                        if (value === undefined || value === null) {
                          value = "-";
                        }

                        return (
                          <td
                            key={colIdx}
                            className="
                              px-3 py-2 sm:px-4 sm:py-3 
                              text-sm text-slate-700 dark:text-slate-300 
                              border-r border-slate-200 dark:border-slate-700
                              max-w-[200px] lg:max-w-xs
                            "
                          >
                            <div className="truncate">{renderCell(header, value)}</div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              className="
              flex flex-col items-center justify-center 
              py-8 sm:py-12 
              text-center
            "
            >
              <AlertCircle
                className="
                w-10 h-10 sm:w-12 sm:h-12 
                text-slate-300 dark:text-slate-700 
                mb-3 sm:mb-4
              "
              />
              <p
                className="
                text-slate-500 dark:text-slate-400 
                text-base sm:text-lg font-medium
              "
              >
                Tidak ada data yang sesuai
              </p>
              <p
                className="
                text-slate-400 dark:text-slate-500 
                text-sm mt-1 sm:mt-2
              "
              >
                Coba ubah filter atau kata kunci pencarian
              </p>
            </div>
          )}
        </div>

        {/* ===== FOOTER ACTIONS + PAGINATION ===== */}
        <div
          className="
          px-4 sm:px-6 py-3 
          bg-slate-50 dark:bg-slate-800/50 
          border-t-2 border-slate-200 dark:border-slate-700
        "
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Pagination Info + Controls */}
            {totalPages > 1 ? (
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
                <div
                  className="
                  text-xs sm:text-sm 
                  text-slate-600 dark:text-slate-400 
                  whitespace-nowrap
                "
                >
                  Menampilkan {startIndex + 1} - {Math.min(endIndex, filteredData.length)} dari{" "}
                  {filteredData.length} data
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="
                      p-2 sm:px-3 sm:py-2 
                      border border-slate-300 dark:border-slate-600 
                      rounded-lg 
                      disabled:opacity-50 disabled:cursor-not-allowed 
                      hover:bg-slate-100 dark:hover:bg-slate-700 
                      transition-colors
                      min-h-[44px] min-w-[44px] flex items-center justify-center
                    "
                    aria-label="Halaman sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-4 sm:h-4" />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(isMobile ? 3 : 5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5 || isMobile) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`
                            px-3 py-2 rounded-lg 
                            text-xs sm:text-sm font-medium 
                            transition-colors
                            min-h-[44px] min-w-[44px] flex items-center justify-center
                            ${
                              currentPage === pageNum
                                ? `${colors.button} text-white`
                                : "border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                            }
                          `}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="
                      p-2 sm:px-3 sm:py-2 
                      border border-slate-300 dark:border-slate-600 
                      rounded-lg 
                      disabled:opacity-50 disabled:cursor-not-allowed 
                      hover:bg-slate-100 dark:hover:bg-slate-700 
                      transition-colors
                      min-h-[44px] min-w-[44px] flex items-center justify-center
                    "
                    aria-label="Halaman berikutnya"
                  >
                    <ChevronRight className="w-4 h-4 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Menampilkan {filteredData.length} data
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={onClose}
                className="
                  flex-1 sm:flex-none
                  px-4 py-2.5 sm:py-2
                  border-2 border-slate-300 dark:border-slate-600 
                  text-slate-700 dark:text-slate-300 
                  rounded-lg font-medium 
                  hover:bg-slate-100 dark:hover:bg-slate-800 
                  transition-colors
                  text-sm
                  min-h-[44px]
                "
              >
                Tutup
              </button>
              <button
                onClick={() => onDownload(reportType, "xlsx")}
                disabled={loading}
                className={`
                  flex-1 sm:flex-none
                  ${colors.button} text-white 
                  px-4 py-2.5 sm:py-2
                  rounded-lg font-medium 
                  disabled:opacity-50 disabled:cursor-not-allowed 
                  transition-colors 
                  flex items-center justify-center gap-2
                  text-sm
                  min-h-[44px]
                `}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-1.5"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Export ke Excel</span>
                    <span className="inline sm:hidden">Export</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherReportModal;
