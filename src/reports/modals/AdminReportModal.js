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
// Supports: All Reports, Multi-Filter, Advanced Search

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

  // ✅ Destructure report data safely
  const {
    preview = [],
    fullData = [],
    headers = [],
    summary = [],
    reportTitle = "LAPORAN ADMINISTRATOR",
    total = 0,
  } = reportData;

  // ✅ Use preview if fullData is empty (backward compatibility)
  const dataToUse = fullData.length > 0 ? fullData : preview;

  // ✅ Header key mapping
  const headerKeyMap = {
    NIS: ["nis", "student_nis"],
    "Nama Siswa": ["name", "student_name", "full_name"],
    "Nama Lengkap": ["full_name", "name"],
    "Nama Guru": ["teacher_name", "name"],
    "Nama User": ["username", "name"],
    Kelas: ["class_id", "class"],
    Tingkat: "grade",
    "Jenis Kelamin": "gender",
    Gender: "gender",
    "Tahun Ajaran": "academic_year",
    Status: ["is_active", "status"],
    "Wali Kelas": "homeroom_teacher",
    Role: ["role", "user_role"],
    Email: "email",
    Telepon: ["phone", "phone_number"],
    "Tanggal Daftar": ["created_at", "registration_date"],
    "Total Siswa": "total_students",
    "Total Guru": "total_teachers",
    "Rata-rata": ["average", "avg"],
    Persentase: ["percentage", "persentase"],
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
      default:
        return "slate";
    }
  };

  const themeColor = getThemeColor();

  // ✅ Color classes mapping
  const colorClasses = {
    blue: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-600",
      button: "bg-blue-600 hover:bg-blue-700",
    },
    indigo: {
      bg: "bg-indigo-50",
      border: "border-indigo-200",
      text: "text-indigo-600",
      button: "bg-indigo-600 hover:bg-indigo-700",
    },
    purple: {
      bg: "bg-purple-50",
      border: "border-purple-200",
      text: "text-purple-600",
      button: "bg-purple-600 hover:bg-purple-700",
    },
    green: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-600",
      button: "bg-green-600 hover:bg-green-700",
    },
    slate: {
      bg: "bg-slate-50",
      border: "border-slate-200",
      text: "text-slate-600",
      button: "bg-slate-600 hover:bg-slate-700",
    },
  };

  const colors = colorClasses[themeColor];

  // ✅ FIXED: Extract unique classes and statuses for filtering
  const uniqueClasses = useMemo(() => {
    const classes = new Set();
    dataToUse.forEach((row) => {  // ✅ Changed from fullData to dataToUse
      if (row.Kelas) classes.add(row.Kelas);
      if (row.class_id) classes.add(row.class_id);
    });
    return Array.from(classes).sort();
  }, [dataToUse]);  // ✅ Changed from fullData to dataToUse

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set();
    dataToUse.forEach((row) => {  // ✅ Changed from fullData to dataToUse
      if (row.Status) statuses.add(row.Status);
      if (row.status) statuses.add(row.status);
      if (row.is_active !== undefined) {
        statuses.add(row.is_active ? "Aktif" : "Tidak Aktif");
      }
    });
    return Array.from(statuses).sort();
  }, [dataToUse]);  // ✅ Changed from fullData to dataToUse

  // ✅ FIXED: Filter data based on search and filters
  const filteredData = useMemo(() => {
    let filtered = dataToUse;  // ✅ Changed from fullData to dataToUse

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(query)
        )
      );
    }

    // Class filter
    if (filterClass) {
      filtered = filtered.filter(
        (row) => row.Kelas === filterClass || row.class_id === filterClass
      );
    }

    // Status filter
    if (filterStatus) {
      filtered = filtered.filter((row) => {
        if (row.Status === filterStatus || row.status === filterStatus)
          return true;
        if (
          filterStatus === "Aktif" &&
          (row.is_active === true || row.is_active === 1)
        )
          return true;
        if (
          filterStatus === "Tidak Aktif" &&
          (row.is_active === false || row.is_active === 0)
        )
          return true;
        return false;
      });
    }

    return filtered;
  }, [dataToUse, searchQuery, filterClass, filterStatus]);  // ✅ Changed from fullData to dataToUse

  // ✅ Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  // ✅ Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterClass, filterStatus]);

  // ✅ Render cell with conditional formatting
  const renderCell = (header, value) => {
    // Status colors
    if (header === "Status" || header === "is_active") {
      const isActive =
        value === "Aktif" ||
        value === "Active" ||
        value === true ||
        value === 1;
      return (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            isActive
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}>
          {isActive ? "Aktif" : "Tidak Aktif"}
        </span>
      );
    }

    // Role colors
    if (header === "Role" || header === "user_role") {
      const roleColors = {
        admin: "bg-purple-100 text-purple-800",
        teacher: "bg-blue-100 text-blue-800",
        bk: "bg-teal-100 text-teal-800",
        homeroom: "bg-green-100 text-green-800",
      };
      const colorClass =
        roleColors[String(value).toLowerCase()] ||
        "bg-gray-100 text-gray-800";
      return (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
          {value}
        </span>
      );
    }

    // Percentage with color coding
    if (
      (header === "Persentase" || header === "percentage") &&
      typeof value === "string" &&
      value.includes("%")
    ) {
      const pct = parseFloat(value);
      let colorClass = "text-gray-600";
      if (pct >= 90) colorClass = "text-green-600 font-bold";
      else if (pct >= 75) colorClass = "text-yellow-600 font-bold";
      else colorClass = "text-red-600 font-bold";

      return <span className={colorClass}>{value}</span>;
    }

    // Numbers with color coding
    if (typeof value === "number" && header.includes("Rata")) {
      let colorClass = "text-gray-600";
      if (value >= 85) colorClass = "text-green-600 font-bold";
      else if (value >= 70) colorClass = "text-yellow-600 font-bold";
      else colorClass = "text-red-600 font-bold";

      return <span className={colorClass}>{value}</span>;
    }

    // Highlight class columns
    if (header === "Kelas" || header === "class_id") {
      return (
        <span className="font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
          {value}
        </span>
      );
    }

    return value !== undefined && value !== null ? value : "-";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* ===== HEADER ===== */}
        <div className={`${colors.bg} border-b-2 ${colors.border} p-6`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 ${colors.bg} border-2 ${colors.border} rounded-xl flex items-center justify-center`}>
                <ReportIcon className={`w-7 h-7 ${colors.text}`} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  {reportTitle}
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Preview Data Administrator • {filteredData.length} dari {total || dataToUse.length}{" "}
                  record
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* ===== SUMMARY CARDS ===== */}
        {summary && summary.length > 0 && (
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {summary.map((stat, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-lg border border-slate-200 p-3">
                  <p className="text-xs text-slate-600 mb-1">{stat.label}</p>
                  <p className="text-lg font-bold text-slate-800">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== SEARCH & FILTER BAR ===== */}
        <div className="px-6 py-4 bg-white border-b border-slate-200">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
            <div className="flex-1 relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama, NIS, email, atau data lainnya..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Class Filter */}
            {uniqueClasses.length > 0 && (
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-w-[150px]">
                <option value="">Semua Kelas</option>
                {uniqueClasses.map((kelas) => (
                  <option key={kelas} value={kelas}>
                    Kelas {kelas}
                  </option>
                ))}
              </select>
            )}

            {/* Status Filter */}
            {uniqueStatuses.length > 0 && (
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-w-[150px]">
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
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium whitespace-nowrap">
                Reset Filter
              </button>
            )}
          </div>

          {/* Active Filters Info */}
          {(filterClass || filterStatus) && (
            <div className="flex items-center gap-2 mt-3">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-600">Filter aktif:</span>
              {filterClass && (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">
                  Kelas {filterClass}
                </span>
              )}
              {filterStatus && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                  {filterStatus}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ===== TABLE CONTENT ===== */}
        <div className="flex-1 overflow-auto p-6">
          {currentData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-300">
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200">
                      No
                    </th>
                    {headers.map((header, idx) => (
                      <th
                        key={idx}
                        className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {currentData.map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-600 border-r border-slate-200 font-medium">
                        {startIndex + rowIdx + 1}
                      </td>
                      {headers.map((header, colIdx) => (
                        <td
                          key={colIdx}
                          className="px-4 py-3 text-sm text-slate-700 border-r border-slate-200">
                          {renderCell(header, row[header])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-slate-500 text-lg font-medium">
                Tidak ada data yang sesuai
              </p>
              <p className="text-slate-400 text-sm mt-2">
                Coba ubah filter atau kata kunci pencarian
              </p>
            </div>
          )}
        </div>

        {/* ===== PAGINATION ===== */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Menampilkan {startIndex + 1} -{" "}
                {Math.min(endIndex, filteredData.length)} dari{" "}
                {filteredData.length} data
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
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
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? `${colors.button} text-white`
                            : "border border-slate-300 hover:bg-slate-100"
                        }`}>
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== FOOTER ACTIONS ===== */}
        <div className="px-6 py-4 bg-slate-50 border-t-2 border-slate-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              <span className="font-medium">💡 Tips:</span> Gunakan filter untuk
              analisis data yang lebih spesifik
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 border-2 border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-100 transition-colors">
                Tutup
              </button>
              <button
                onClick={() => onDownload(reportType, "xlsx")}
                disabled={loading}
                className={`${colors.button} text-white px-5 py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2`}>
                <FileSpreadsheet className="w-4 h-4" />
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