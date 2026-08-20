import React, { useState, useMemo } from "react";
import {
  X,
  Download,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Search,
  AlertCircle,
  Shield,
  Users,
  Calendar,
  BarChart3,
  Settings,
  Filter,
} from "lucide-react";

// ==================== ADMIN REPORT MODAL ====================
// 💡 Modal khusus untuk preview laporan Admin
// ✅ FIXED: Masalah Alpa kosong
// ✅ ADDED: Full Dark Mode & Mobile Responsive

const AdminReportModal = ({
  isOpen,
  onClose,
  reportData = {},
  reportType,
  onDownload,
  loading = false,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const itemsPerPage = 50;

  // ✅ Destructure report data safely dengan fallback yang lebih robust
  const {
    preview = [],
    fullData = [],
    headers = [],
    summary = [],
    reportTitle = "LAPORAN ADMINISTRATOR",
    total = 0,
  } = reportData;

  // ✅ DEBUG: Log data untuk troubleshooting
  React.useEffect(() => {
    if (isOpen && reportType === "admin-attendance") {
      console.log("🔍 ATTENDANCE DATA DEBUG:");
      console.log("Full Data Sample:", fullData.slice(0, 2));
      console.log("Headers:", headers);

      // Debug khusus untuk kolom Alpa
      if (fullData.length > 0) {
        const firstRow = fullData[0];
        console.log("📊 First Row Data:", firstRow);
        console.log("🔍 Mencari kolom Alpa/Absen:");
        Object.keys(firstRow).forEach((key) => {
          if (key.toLowerCase().includes("alp") || key.toLowerCase().includes("abs")) {
            console.log(`📍 Key "${key}":`, firstRow[key]);
          }
        });
      }
    }
  }, [isOpen, reportData, headers, preview, fullData, reportType]);

  // ✅ Use preview if fullData is empty (backward compatibility)
  const dataToUse = fullData.length > 0 ? fullData : preview;

  // ✅ FIXED: Header key mapping dengan priority untuk attendance
  const headerKeyMap = {
    // ===== ATTENDANCE PRIORITY MAPPING =====
    Alpa: ["alpa", "alpha", "absen", "absent", "missing", "bolos"],
    Hadir: ["hadir", "present", "attended", "masuk", "h"],
    Sakit: ["sakit", "sick", "ill", "s"],
    Izin: ["izin", "permission", "excused", "i", "permit"],
    Total: ["total", "count", "total_attendance", "jumlah"],
    Persentase: ["percentage", "persentase", "percent", "rate"],

    // ===== USERS TABLE MAPPING =====
    "Kode Guru": ["teacher_id", "kode_guru", "teacher_code", "code"],
    Username: ["username"],
    "Nama Lengkap": ["full_name", "nama_lengkap", "name"],
    "Nama Siswa": ["full_name", "student_name", "nama_siswa", "nama_lengkap", "name"],
    Role: ["role", "user_role"],
    "Wali Kelas": ["homeroom_class_id", "wali_kelas", "class_teacher", "class_id"],
    Status: ["is_active", "status", "active"],
    "Tanggal Bergabung": ["created_at", "tanggal_bergabung", "join_date", "registration_date"],

    // ===== STUDENTS DATA =====
    No: ["no", "index", "number"],
    NIS: ["nis", "student_nis", "nisn"],
    NISN: ["nisn", "nis"],
    Kelas: ["class_id", "kelas", "class", "homeroom_class_id"],

    // ===== ACADEMIC DATA =====
    "Tahun Ajaran": ["academic_year", "tahun_ajaran", "year"],
    Semester: ["semester"],
    "Mata Pelajaran": ["subject", "mata_pelajaran", "pelajaran"],
    "Nilai Akhir": ["nilai_akhir", "final_score", "score", "nilai", "grade_score"],
    Guru: ["teacher_name", "guru", "full_name", "nama_guru", "username"],

    // ===== SYSTEM =====
    Email: ["email"],
    Telepon: ["no_hp", "phone", "telepon"],
    "Jenis Kelamin": ["gender", "jenis_kelamin"],
  };

  // ✅ IMPROVED: Function khusus untuk handle Alpa dan attendance data
  const getCellValue = (row, header) => {
    if (!row || !header) return "-";

    // SPECIAL HANDLING FOR ATTENDANCE DATA
    if (header === "Alpa") {
      // Priority search untuk kolom Alpa
      const alpaKeys = ["alpa", "alpha", "absen", "absent", "missing", "bolos"];

      for (const key of alpaKeys) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== "" && row[key] !== "-") {
          console.log(`✅ Found Alpa data in key "${key}":`, row[key]);
          return row[key];
        }
      }

      // Fallback: calculate from other attendance data jika available
      if (row.hadir !== undefined && row.total !== undefined) {
        const hadir = parseInt(row.hadir) || 0;
        const sakit = parseInt(row.sakit) || 0;
        const izin = parseInt(row.izin) || 0;
        const total = parseInt(row.total) || 0;

        const calculatedAlpa = total - hadir - sakit - izin;
        if (calculatedAlpa >= 0) {
          console.log(
            `🧮 Calculated Alpa: ${calculatedAlpa} (Total: ${total} - Hadir: ${hadir} - Sakit: ${sakit} - Izin: ${izin})`
          );
          return calculatedAlpa;
        }
      }

      console.log("❌ No Alpa data found in row:", row);
      return "0"; // Default ke 0 jika tidak ada data
    }

    // Handle other attendance columns
    if (header === "Hadir" || header === "Sakit" || header === "Izin" || header === "Total") {
      const possibleKeys = headerKeyMap[header];
      if (possibleKeys) {
        for (const key of possibleKeys) {
          if (row[key] !== undefined && row[key] !== null && row[key] !== "" && row[key] !== "-") {
            return row[key];
          }
        }
      }
    }

    // SPECIAL HANDLING FOR OTHER FIELDS
    if (header === "Kode Guru") {
      if (row.teacher_id !== undefined && row.teacher_id !== null && row.teacher_id !== "") {
        return row.teacher_id;
      }
      return "-";
    }

    if (header === "Wali Kelas") {
      if (
        row.homeroom_class_id !== undefined &&
        row.homeroom_class_id !== null &&
        row.homeroom_class_id !== ""
      ) {
        return row.homeroom_class_id;
      }
      return "-";
    }

    if (header === "Status") {
      if (row.is_active !== undefined && row.is_active !== null) {
        return row.is_active ? "Aktif" : "Tidak Aktif";
      }
      if (row.status !== undefined && row.status !== null && row.status !== "") {
        return row.status;
      }
      return "-";
    }

    if (header === "Tanggal Bergabung") {
      if (row.created_at !== undefined && row.created_at !== null && row.created_at !== "") {
        return row.created_at;
      }
      return "-";
    }

    // DEFAULT MAPPING untuk header lainnya
    const possibleKeys = headerKeyMap[header];
    if (possibleKeys) {
      for (const key of possibleKeys) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== "" && row[key] !== "-") {
          return row[key];
        }
      }
    }

    // Fallback: coba akses langsung
    if (
      row[header] !== undefined &&
      row[header] !== null &&
      row[header] !== "" &&
      row[header] !== "-"
    ) {
      return row[header];
    }

    return "-";
  };

  // ✅ Get report icon based on type
  const getReportIcon = () => {
    switch (reportType) {
      case "admin-users":
        return Users;
      case "admin-classes":
        return Settings;
      case "admin-stats":
        return BarChart3;
      case "admin-attendance":
        return Calendar;
      case "admin-students":
        return Users;
      case "admin-teachers":
        return Users;
      case "admin-counseling":
        return Shield;
      case "admin-grades":
        return BarChart3;
      default:
        return Shield;
    }
  };

  const ReportIcon = getReportIcon();

  // ✅ Get report color theme
  const getThemeColor = () => {
    switch (reportType) {
      case "admin-users":
        return "blue";
      case "admin-classes":
        return "indigo";
      case "admin-stats":
        return "purple";
      case "admin-attendance":
        return "green";
      case "admin-students":
        return "blue";
      case "admin-teachers":
        return "indigo";
      case "admin-counseling":
        return "purple";
      case "admin-grades":
        return "green";
      default:
        return "slate";
    }
  };

  const themeColor = getThemeColor();

  // ✅ Color classes mapping with dark mode
  const colorClasses = {
    blue: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      border: "border-blue-200 dark:border-blue-800",
      text: "text-blue-600 dark:text-blue-400",
      button: "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600",
    },
    indigo: {
      bg: "bg-indigo-50 dark:bg-indigo-900/20",
      border: "border-indigo-200 dark:border-indigo-800",
      text: "text-indigo-600 dark:text-indigo-400",
      button: "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600",
    },
    purple: {
      bg: "bg-purple-50 dark:bg-purple-900/20",
      border: "border-purple-200 dark:border-purple-800",
      text: "text-purple-600 dark:text-purple-400",
      button: "bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600",
    },
    green: {
      bg: "bg-green-50 dark:bg-green-900/20",
      border: "border-green-200 dark:border-green-800",
      text: "text-green-600 dark:text-green-400",
      button: "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600",
    },
    slate: {
      bg: "bg-slate-50 dark:bg-slate-900/20",
      border: "border-slate-200 dark:border-slate-800",
      text: "text-slate-600 dark:text-slate-400",
      button: "bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600",
    },
  };

  const colors = colorClasses[themeColor];

  // ✅ FIXED: Extract unique classes and statuses for filtering
  const uniqueClasses = useMemo(() => {
    const classes = new Set();
    dataToUse.forEach((row) => {
      const classValue = getCellValue(row, "Kelas");
      if (classValue && classValue !== "-") classes.add(classValue);
    });
    return Array.from(classes).sort();
  }, [dataToUse]);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set();
    dataToUse.forEach((row) => {
      const statusValue = getCellValue(row, "Status");
      if (statusValue && statusValue !== "-") statuses.add(statusValue);
    });
    return Array.from(statuses).sort();
  }, [dataToUse]);

  // ✅ FIXED: Filter data based on search and filters
  const filteredData = useMemo(() => {
    let filtered = dataToUse;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((row) =>
        Object.values(row).some((value) => String(value).toLowerCase().includes(query))
      );
    }

    // Class filter
    if (filterClass) {
      filtered = filtered.filter((row) => {
        const classValue = getCellValue(row, "Kelas");
        return String(classValue) === filterClass;
      });
    }

    // Status filter
    if (filterStatus) {
      filtered = filtered.filter((row) => {
        const statusValue = getCellValue(row, "Status");
        return statusValue === filterStatus;
      });
    }

    return filtered;
  }, [dataToUse, searchQuery, filterClass, filterStatus]);

  // ✅ Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  // ✅ Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterClass, filterStatus]);

  // ✅ FIXED: Render cell dengan handling khusus untuk Alpa
  const renderCell = (header, value, row = {}) => {
    // Gunakan getCellValue yang sudah difix
    const cellValue = getCellValue(row, header);

    // Special styling untuk Alpa
    if (header === "Alpa" && cellValue !== "-" && cellValue !== "0") {
      return (
        <span className="font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded">
          {cellValue}
        </span>
      );
    }

    // Attendance numbers styling
    if ((header === "Hadir" || header === "Sakit" || header === "Izin") && cellValue !== "-") {
      const bgColor =
        header === "Hadir"
          ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400"
          : header === "Sakit"
          ? "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
          : "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400";
      return <span className={`font-medium ${bgColor} px-2 py-1 rounded`}>{cellValue}</span>;
    }

    // Status colors
    if (header === "Status") {
      const isActive =
        cellValue === "Aktif" ||
        cellValue === "Active" ||
        cellValue === true ||
        cellValue === 1 ||
        cellValue === "aktif";
      return (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            isActive
              ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
              : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
          }`}
        >
          {isActive ? "Aktif" : "Tidak Aktif"}
        </span>
      );
    }

    // Role colors
    if (header === "Role") {
      const roleColors = {
        admin: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300",
        teacher: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
        bk: "bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300",
        homeroom: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
        siswa: "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300",
        student: "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300",
        "guru bk": "bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300",
        guru: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
      };
      const colorClass =
        roleColors[String(cellValue).toLowerCase()] ||
        "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300";
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
          {cellValue}
        </span>
      );
    }

    // Date formatting
    if ((header.includes("Tanggal") || header === "Tanggal Bergabung") && cellValue !== "-") {
      try {
        const date = new Date(cellValue);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString("id-ID");
        }
      } catch (e) {
        // Biarkan value asli jika parsing gagal
      }
    }

    // Percentage with color coding
    if (header === "Persentase" && typeof cellValue === "string" && cellValue.includes("%")) {
      const pct = parseFloat(cellValue);
      let colorClass = "text-gray-600 dark:text-gray-400";
      if (pct >= 90) colorClass = "text-green-600 dark:text-green-400 font-bold";
      else if (pct >= 75) colorClass = "text-yellow-600 dark:text-yellow-400 font-bold";
      else colorClass = "text-red-600 dark:text-red-400 font-bold";

      return <span className={colorClass}>{cellValue}</span>;
    }

    // Highlight class columns
    if ((header === "Kelas" || header === "Wali Kelas") && cellValue !== "-") {
      return (
        <span className="font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">
          {cellValue}
        </span>
      );
    }

    // Handle empty values
    if (cellValue === "-" || cellValue === "" || cellValue === null || cellValue === undefined) {
      // Untuk Alpa, tampilkan 0 jika kosong
      if (header === "Alpa") {
        return <span className="text-slate-400 dark:text-slate-500">0</span>;
      }
      return <span className="text-slate-400 dark:text-slate-500">-</span>;
    }

    return String(cellValue);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-2 sm:p-3 md:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg sm:rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] md:max-h-[95vh] flex flex-col">
        {/* ===== HEADER ===== */}
        <div className={`${colors.bg} border-b-2 ${colors.border} p-4 sm:p-6`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 ${colors.bg} border-2 ${colors.border} rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0`}
              >
                <ReportIcon className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 ${colors.text}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-200 leading-tight">
                  {reportTitle}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Preview Data Administrator • {filteredData.length} dari{" "}
                  {total || dataToUse.length} record
                  {dataToUse.length === 0 && " ⚠️ Data kosong - cek struktur data"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1 -m-1"
              aria-label="Tutup modal"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* ===== SUMMARY CARDS ===== */}
        {summary && summary.length > 0 && (
          <div className="px-4 sm:px-6 py-2 sm:py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
            <div className="flex flex-nowrap gap-2 sm:gap-3 md:gap-4 pb-2">
              {summary.map((stat, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-2 sm:p-3 min-w-[110px] sm:min-w-[120px] flex-shrink-0"
                >
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1 truncate">
                    {stat.label}
                  </p>
                  <p className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 truncate">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== SEARCH & FILTER BAR ===== */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
            <div className="flex-1 relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Cari nama, NIS, email, atau data lainnya..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-sm sm:text-base"
              />
            </div>

            {/* Class Filter */}
            {uniqueClasses.length > 0 && (
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="px-3 py-2.5 sm:py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-sm sm:text-base min-w-[140px] sm:min-w-[150px]"
                aria-label="Filter kelas"
              >
                <option value="">Semua Kelas</option>
                {uniqueClasses.map((kelas) => (
                  <option key={kelas} value={kelas}>
                    {String(kelas).startsWith("Kelas") ? kelas : `Kelas ${kelas}`}
                  </option>
                ))}
              </select>
            )}

            {/* Status Filter */}
            {uniqueStatuses.length > 0 && (
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2.5 sm:py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-sm sm:text-base min-w-[140px] sm:min-w-[150px]"
                aria-label="Filter status"
              >
                <option value="">Semua Status</option>
                {uniqueStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            )}

            {(searchQuery || filterClass || filterStatus) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterClass("");
                  setFilterStatus("");
                }}
                className="px-3 sm:px-4 py-2.5 sm:py-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300 font-medium whitespace-nowrap"
              >
                Reset Filter
              </button>
            )}
          </div>

          {/* Active Filters Info */}
          {(filterClass || filterStatus) && (
            <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-2">
              <Filter className="w-3 h-3 sm:w-4 sm:h-4 text-slate-500 dark:text-slate-400" />
              <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Filter aktif:
              </span>
              {filterClass && (
                <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-full font-medium whitespace-nowrap">
                  Kelas {filterClass}
                </span>
              )}
              {filterStatus && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full font-medium whitespace-nowrap">
                  {filterStatus}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ===== TABLE CONTENT ===== */}
        <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
          {currentData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-full">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-300 dark:border-slate-700">
                    <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700 whitespace-nowrap">
                      No
                    </th>
                    {headers.map((header, idx) => (
                      <th
                        key={idx}
                        className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700 whitespace-nowrap min-w-[80px]"
                      >
                        {/* ✅ FIX: Replace "Absen" with "Alpa" in header display */}
                        {header === "Absen" ? "Alpa" : header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                  {currentData.map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 font-medium whitespace-nowrap">
                        {startIndex + rowIdx + 1}
                      </td>
                      {headers.map((header, colIdx) => (
                        <td
                          key={colIdx}
                          className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap"
                        >
                          {renderCell(header, row[header], row)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12">
              <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 dark:text-slate-600 mb-3 sm:mb-4" />
              <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg font-medium text-center">
                {dataToUse.length === 0 ? "Data laporan kosong" : "Tidak ada data yang sesuai"}
              </p>
              <p className="text-slate-400 dark:text-slate-500 text-xs sm:text-sm mt-1 sm:mt-2 text-center">
                {dataToUse.length === 0
                  ? "Periksa struktur data atau koneksi API"
                  : "Coba ubah filter atau kata kunci pencarian"}
              </p>
              {dataToUse.length === 0 && (
                <button
                  onClick={() =>
                    console.log("Debug Data:", {
                      reportData,
                      headers,
                      dataToUse,
                    })
                  }
                  className="mt-3 sm:mt-4 px-3 sm:px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs sm:text-sm"
                >
                  📋 Debug Data di Console
                </button>
              )}
            </div>
          )}
        </div>

        {/* ===== PAGINATION ===== */}
        {totalPages > 1 && (
          <div className="px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
              <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Menampilkan {startIndex + 1} - {Math.min(endIndex, filteredData.length)} dari{" "}
                {filteredData.length} data
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2 sm:px-3 py-1.5 sm:py-2 border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors min-h-[36px] sm:min-h-[40px]"
                  aria-label="Halaman sebelumnya"
                >
                  <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
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
                        className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors min-h-[36px] sm:min-h-[40px] min-w-[36px] sm:min-w-[40px] ${
                          currentPage === pageNum
                            ? `${colors.button} text-white`
                            : "border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                        }`}
                        aria-label={`Halaman ${pageNum}`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 sm:px-3 py-1.5 sm:py-2 border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors min-h-[36px] sm:min-h-[40px]"
                  aria-label="Halaman berikutnya"
                >
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== FOOTER ACTIONS ===== */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 dark:bg-slate-800/50 border-t-2 border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              <span className="font-medium">💡 Tips:</span> Gunakan filter untuk analisis data yang
              lebih spesifik
              {dataToUse.length === 0 && (
                <span className="text-red-500 dark:text-red-400 ml-1 sm:ml-2">
                  ⚠️ Data kosong - periksa console untuk debug
                </span>
              )}
            </div>
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={onClose}
                className="flex-1 sm:flex-none px-3 sm:px-4 md:px-5 py-2.5 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm sm:text-base min-h-[44px]"
              >
                Tutup
              </button>
              <button
                onClick={() => onDownload(reportType, "xlsx")}
                disabled={loading || dataToUse.length === 0}
                className={`flex-1 sm:flex-none ${colors.button} text-white px-3 sm:px-4 md:px-5 py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base min-h-[44px]`}
              >
                <FileSpreadsheet className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                {loading ? "Exporting..." : "Export ke Excel"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReportModal;
