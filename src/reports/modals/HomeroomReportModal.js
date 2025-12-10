import React, { useState, useMemo } from "react";
import {
  X,
  Download,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Search,
  AlertCircle,
  Users,
  Calendar,
  BarChart3,
  TrendingUp,
  Filter,
} from "lucide-react";

// ==================== HOMEROOM REPORT MODAL ====================
// 🏫 Modal khusus untuk preview laporan Wali Kelas
// Supports: Data Siswa, Presensi Harian, Rekap Kehadiran, Nilai Akademik

const HomeroomReportModal = ({
  isOpen,
  onClose,
  reportData = {},
  reportType,
  onDownload,
  loading = false,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const itemsPerPage = 50;

  // ✅ Destructure report data safely
  const {
    preview = [],
    fullData = [],
    headers = [],
    summary = [],
    reportTitle = "LAPORAN WALI KELAS",
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
      console.log("🏫 Homeroom Modal Opened");
      console.log("📦 Received reportData:", reportData);
      console.log("📊 dataToUse length:", dataToUse.length);
      console.log("📋 Original headers:", headers);
      console.log("📋 Effective headers:", effectiveHeaders);
      if (dataToUse.length > 0) {
        console.log("🔑 First row keys:", Object.keys(dataToUse[0]));
        console.log("📄 First row data:", dataToUse[0]);
      }
      console.log("🎯 reportType:", reportType);
    }
  }, [isOpen, reportData, dataToUse, headers, effectiveHeaders, reportType]);

  // ✅ Get report icon based on type
  const getReportIcon = () => {
    switch (reportType) {
      case "students":
        return Users;
      case "attendance":
      case "attendance-recap":
        return Calendar;
      case "grades":
        return BarChart3;
      default:
        return FileSpreadsheet;
    }
  };

  const ReportIcon = getReportIcon();

  // ✅ Get report color theme
  const getThemeColor = () => {
    switch (reportType) {
      case "students":
        return "green";
      case "attendance":
        return "yellow";
      case "attendance-recap":
        return "orange";
      case "grades":
        return "purple";
      default:
        return "indigo";
    }
  };

  const themeColor = getThemeColor();

  // ✅ Color classes mapping with dark mode support
  const colorClasses = {
    green: {
      bg: "bg-green-50 dark:bg-green-900/20",
      border: "border-green-200 dark:border-green-800",
      text: "text-green-600 dark:text-green-400",
      button:
        "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600",
    },
    yellow: {
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      border: "border-yellow-200 dark:border-yellow-800",
      text: "text-yellow-600 dark:text-yellow-400",
      button:
        "bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-600",
    },
    orange: {
      bg: "bg-orange-50 dark:bg-orange-900/20",
      border: "border-orange-200 dark:border-orange-800",
      text: "text-orange-600 dark:text-orange-400",
      button:
        "bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-600",
    },
    purple: {
      bg: "bg-purple-50 dark:bg-purple-900/20",
      border: "border-purple-200 dark:border-purple-800",
      text: "text-purple-600 dark:text-purple-400",
      button:
        "bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600",
    },
    indigo: {
      bg: "bg-indigo-50 dark:bg-indigo-900/20",
      border: "border-indigo-200 dark:border-indigo-800",
      text: "text-indigo-600 dark:text-indigo-400",
      button:
        "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600",
    },
  };

  const colors = colorClasses[themeColor];

  // ✅ Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return dataToUse;

    const query = searchQuery.toLowerCase();
    return dataToUse.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(query)
      )
    );
  }, [dataToUse, searchQuery]);

  // ✅ Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  // ✅ Reset page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // ✅ Render cell with conditional formatting (dark mode support)
  const renderCell = (header, value) => {
    // Attendance status colors with dark mode
    if (header === "Status Kehadiran" || header === "status") {
      const statusColors = {
        Hadir:
          "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300",
        Sakit:
          "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300",
        Izin: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300",
        Alpa: "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300",
        "Tidak Hadir":
          "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300",
      };
      const colorClass =
        statusColors[value] ||
        "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300";
      return (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
          {value}
        </span>
      );
    }

    // Percentage with color coding (dark mode)
    if (
      (header === "Persentase" || header === "Tingkat Kehadiran") &&
      typeof value === "string" &&
      value.includes("%")
    ) {
      const pct = parseFloat(value);
      let colorClass = "text-gray-600 dark:text-gray-400";
      if (pct >= 90)
        colorClass = "text-green-600 dark:text-green-400 font-bold";
      else if (pct >= 75)
        colorClass = "text-yellow-600 dark:text-yellow-400 font-bold";
      else colorClass = "text-red-600 dark:text-red-400 font-bold";

      return <span className={colorClass}>{value}</span>;
    }

    // Grades with color coding (dark mode)
    if (
      (header === "Nilai" ||
        header === "Nilai Akhir" ||
        header === "Rata-rata Nilai" ||
        header === "score" ||
        header === "final_score") &&
      typeof value === "number"
    ) {
      let colorClass = "text-gray-600 dark:text-gray-400";
      if (value >= 85)
        colorClass = "text-green-600 dark:text-green-400 font-bold";
      else if (value >= 70)
        colorClass = "text-yellow-600 dark:text-yellow-400 font-bold";
      else colorClass = "text-red-600 dark:text-red-400 font-bold";

      return <span className={colorClass}>{value}</span>;
    }

    // Gender formatting
    if (header === "Jenis Kelamin" || header === "gender") {
      return value === "L" || value === "Laki-laki" ? "Laki-laki" : "Perempuan";
    }

    return value !== undefined && value !== null ? value : "-";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-2 sm:p-4 transition-colors">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl dark:shadow-gray-900/50 w-full max-w-7xl max-h-[90vh] flex flex-col transition-colors">
        {/* ===== HEADER ===== */}
        <div className={`${colors.bg} border-b-2 ${colors.border} p-4 sm:p-6`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4">
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 ${colors.bg} border-2 ${colors.border} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <ReportIcon
                  className={`w-6 h-6 sm:w-7 sm:h-7 ${colors.text}`}
                />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white truncate">
                  {reportTitle}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-gray-300 mt-1 truncate">
                  Preview Data Wali Kelas • {filteredData.length} dari {total}{" "}
                  record
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 transition-colors flex-shrink-0 p-1"
              aria-label="Close">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* ===== SUMMARY CARDS dengan Warna Pastel (dark mode support) ===== */}
        {summary && summary.length > 0 && (
          <div className="px-4 sm:px-6 py-3 bg-slate-50 dark:bg-gray-700 border-b border-slate-200 dark:border-gray-600">
            <div className="grid grid-cols-2 sm:flex sm:gap-2 sm:justify-between">
              {summary.map((stat, idx) => {
                // Soft pastel colors with dark mode
                const pastelColors = [
                  "bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800",
                  "bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-800",
                  "bg-purple-50 border-purple-100 dark:bg-purple-900/20 dark:border-purple-800",
                  "bg-pink-50 border-pink-100 dark:bg-pink-900/20 dark:border-pink-800",
                  "bg-yellow-50 border-yellow-100 dark:bg-yellow-900/20 dark:border-yellow-800",
                  "bg-indigo-50 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800",
                ];
                const colorClass = pastelColors[idx % pastelColors.length];

                return (
                  <div
                    key={idx}
                    className={`${colorClass} rounded-lg border p-2 sm:p-2.5 text-center overflow-hidden min-w-0 ${
                      idx % 2 === 0 ? "mr-1" : "ml-1"
                    } mb-2 sm:mb-0 sm:mr-0 sm:ml-0 sm:flex-1`}>
                    <p className="text-xs text-slate-600 dark:text-gray-400 mb-1 truncate">
                      {stat.label}
                    </p>
                    <p className="text-base sm:text-lg font-bold text-slate-800 dark:text-white truncate">
                      {stat.value}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== SEARCH BAR ===== */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Cari dalam data..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 text-sm border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-slate-800 dark:text-white transition-colors"
              />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="px-3 py-2 sm:px-4 sm:py-2 text-sm text-slate-600 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200 font-medium min-h-[44px] touch-manipulation">
                Reset
              </button>
            )}
          </div>
        </div>

        {/* ===== TABLE CONTENT ===== */}
        <div className="flex-1 overflow-auto p-2 sm:p-4 md:p-6">
          {currentData.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-gray-700">
              <table className="w-full border-collapse min-w-[640px]">
                <thead>
                  <tr className="bg-slate-100 dark:bg-gray-700 border-b-2 border-slate-300 dark:border-gray-600">
                    <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider border-r border-slate-200 dark:border-gray-600">
                      No
                    </th>
                    {effectiveHeaders.map((header, idx) => (
                      <th
                        key={idx}
                        className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider border-r border-slate-200 dark:border-gray-600 truncate">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-slate-200 dark:divide-gray-700">
                  {currentData.map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      className="hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-3 py-2 sm:px-4 sm:py-3 text-sm text-slate-600 dark:text-gray-400 border-r border-slate-200 dark:border-gray-600 font-medium">
                        {startIndex + rowIdx + 1}
                      </td>
                      {effectiveHeaders.map((header, colIdx) => {
                        // ✅ Get original key from data
                        const originalKeys = Object.keys(row);
                        let value = row[header]; // Try exact match first

                        // If header is generated (Title Case), find matching snake_case key
                        if (value === undefined || value === null) {
                          const snakeCase = header
                            .toLowerCase()
                            .replace(/\s+/g, "_");
                          value = row[snakeCase];
                        }

                        // Try direct key match from original data
                        if (value === undefined || value === null) {
                          const matchingKey = originalKeys.find(
                            (k) =>
                              k.toLowerCase() === header.toLowerCase() ||
                              k.toLowerCase().replace(/_/g, " ") ===
                                header.toLowerCase()
                          );
                          if (matchingKey) {
                            value = row[matchingKey];
                          }
                        }

                        if (value === undefined || value === null) {
                          // Try common alternatives - EXPANDED MAPPING
                          const keyMap = {
                            NIS: ["nis", "student_nis"],
                            "Nama Lengkap": [
                              "full_name",
                              "name",
                              "student_name",
                            ],
                            "Nama Siswa": ["full_name", "name", "student_name"],
                            "Jenis Kelamin": ["gender"],
                            Kelas: ["class_id", "class"],
                            "Tahun Ajaran": ["academic_year"],
                            Tingkat: ["grade"],
                            Status: ["status", "is_active"],
                            Tanggal: ["date"],
                            "Status Kehadiran": ["status"],
                            "Mata Pelajaran": ["subject", "subject_name"],
                            Nilai: ["score", "final_score"],
                            "Nilai Akhir": ["final_score", "score"],
                            Semester: ["semester"],
                            Guru: ["teacher", "teacher_name"],
                            Hadir: ["hadir", "present"],
                            Sakit: ["sakit", "sick"],
                            Izin: ["izin", "permission"],
                            Alpa: ["alpa", "absent", "tidak_hadir"],
                            Absen: ["tidak_hadir", "absent"],
                            Total: ["total", "total_days"],
                            Persentase: [
                              "persentase",
                              "percentage",
                              "tingkat_kehadiran",
                            ],
                            "Tingkat Kehadiran": [
                              "tingkat_kehadiran",
                              "persentase",
                              "percentage",
                            ],
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
                            className="px-3 py-2 sm:px-4 sm:py-3 text-sm text-slate-700 dark:text-gray-300 border-r border-slate-200 dark:border-gray-600 truncate max-w-[200px]">
                            {renderCell(header, value)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12">
              <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 dark:text-gray-600 mb-4" />
              <p className="text-slate-500 dark:text-gray-400 text-base sm:text-lg font-medium">
                Tidak ada data yang sesuai
              </p>
              <p className="text-slate-400 dark:text-gray-500 text-sm mt-2 text-center px-4">
                Coba ubah kata kunci pencarian atau periksa filter
              </p>
            </div>
          )}
        </div>

        {/* ===== FOOTER ACTIONS + PAGINATION ===== */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 dark:bg-gray-700 border-t-2 border-slate-200 dark:border-gray-600">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            {/* Pagination Info + Controls */}
            <div className="w-full sm:w-auto">
              {totalPages > 1 ? (
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                  <div className="text-xs sm:text-sm text-slate-600 dark:text-gray-400 whitespace-nowrap mb-2 sm:mb-0">
                    Menampilkan {startIndex + 1} -{" "}
                    {Math.min(endIndex, filteredData.length)} dari{" "}
                    {filteredData.length} data
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-gray-600 transition-colors min-h-[44px] touch-manipulation"
                      aria-label="Previous page">
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
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
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] touch-manipulation ${
                                currentPage === pageNum
                                  ? `${colors.button} text-white`
                                  : "border border-slate-300 dark:border-gray-600 hover:bg-slate-100 dark:hover:bg-gray-600"
                              }`}>
                              {pageNum}
                            </button>
                          );
                        }
                      )}
                    </div>

                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-gray-600 transition-colors min-h-[44px] touch-manipulation"
                      aria-label="Next page">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs sm:text-sm text-slate-600 dark:text-gray-400 text-center sm:text-left">
                  Menampilkan {filteredData.length} data
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 border-2 border-slate-300 dark:border-gray-600 text-slate-700 dark:text-gray-300 rounded-lg font-medium hover:bg-slate-100 dark:hover:bg-gray-600 transition-colors min-h-[44px] touch-manipulation text-sm sm:text-base">
                Tutup
              </button>
              <button
                onClick={() => onDownload(reportType, "xlsx")}
                disabled={loading}
                className={`flex-1 sm:flex-none ${colors.button} text-white px-4 py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 min-h-[44px] touch-manipulation text-sm sm:text-base`}>
                <FileSpreadsheet className="w-4 h-4" />
                {loading ? "Exporting..." : "Export Excel"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeroomReportModal;
