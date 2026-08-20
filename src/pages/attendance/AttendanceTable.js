import React from "react";

const AttendanceTable = ({
  filteredStudents,
  classes,
  selectedClass,
  searchTerm,
  attendanceStatus,
  attendanceNotes,
  loading,
  handleStatusChange,
  handleNotesChange,
  currentPage = 1,
  totalStudents = 0,
  onNextPage,
  onPrevPage,
  isReadOnlyMode = false,
}) => {
  const getInitials = (name) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getGenderColor = (gender) => {
    if (gender === "L") {
      return "bg-gradient-to-br from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700";
    } else if (gender === "P") {
      return "bg-gradient-to-br from-pink-400 to-rose-500 dark:from-pink-500 dark:to-rose-600";
    }
    return "bg-gradient-to-br from-cyan-400 to-blue-500 dark:from-cyan-500 dark:to-blue-600";
  };

  // ✅ UPDATE: Urutan status sesuai permintaan: Hadir - Sakit - Izin - Alpa
  const statusOrder = ["Hadir", "Sakit", "Izin", "Alpa"];

  // ✅ UPDATE: Warna status yang konsisten
  const getStatusColor = (status, isActive) => {
    if (!isActive)
      return "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600";

    switch (status) {
      case "Hadir":
        return "bg-green-500 hover:bg-green-600 text-white shadow-sm";
      case "Sakit":
        return "bg-amber-500 hover:bg-amber-600 text-white shadow-sm";
      case "Izin":
        return "bg-blue-500 hover:bg-blue-600 text-white shadow-sm";
      case "Alpa":
        return "bg-rose-500 hover:bg-rose-600 text-white shadow-sm";
      default:
        return "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600";
    }
  };

  // ✅ UPDATE: Icon untuk setiap status
  const getStatusIcon = (status) => {
    switch (status) {
      case "Hadir":
        return "✓";
      case "Sakit":
        return "🏥";
      case "Izin":
        return "📝";
      case "Alpa":
        return "✗";
      default:
        return "";
    }
  };

  return (
    <div className="glass-effect rounded-2xl shadow-lg dark:shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/80 backdrop-blur-sm">
      {/* Table Header dengan Gradient */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <span className="text-xl sm:text-2xl">👥</span>
            <span className="truncate">
              Daftar Siswa {classes.find((c) => c.id === selectedClass)?.displayName || ""}
            </span>
          </h3>
          <span className="bg-white/20 dark:bg-white/10 backdrop-blur-sm px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-white text-xs sm:text-sm font-semibold whitespace-nowrap">
            Total: {filteredStudents.length} Siswa
          </span>
        </div>
      </div>

      {/* Tablet & Desktop View */}
      <div className="hidden sm:block overflow-x-auto">
        {filteredStudents.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <p className="text-slate-500 dark:text-slate-400">Tidak ada siswa yang ditemukan</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b-2 border-slate-200 dark:border-slate-600">
              <tr>
                <th className="px-4 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  No
                </th>
                <th className="px-4 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  NIS
                </th>
                <th className="px-4 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Nama Siswa
                </th>
                <th className="px-4 py-3 sm:px-6 sm:py-4 text-center text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Status Kehadiran
                </th>
                <th className="px-4 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Keterangan
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800/60 divide-y divide-slate-100 dark:divide-slate-700/50">
              {filteredStudents.map((student, index) => (
                <tr
                  key={student.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors duration-150"
                >
                  <td className="px-4 py-3 sm:px-6 sm:py-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3 sm:px-6 sm:py-4 text-sm text-slate-600 dark:text-slate-400 font-mono">
                    {student.nis}
                  </td>
                  <td className="px-4 py-3 sm:px-6 sm:py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md ${getGenderColor(
                          student.gender
                        )}`}
                      >
                        {getInitials(student.full_name)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {student.full_name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {student.gender === "L" ? "Laki-laki" : "Perempuan"} •{" "}
                          {classes.find((c) => c.id === selectedClass)?.displayName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 sm:px-6 sm:py-4">
                    <div className="flex justify-center gap-1.5 sm:gap-2">
                      {/* ✅ UPDATE: Urutan Hadir - Sakit - Izin - Alpa */}
                      {statusOrder.map((status) => (
                        <button
                          key={status}
                          onClick={() => handleStatusChange(student.id, status)}
                          disabled={loading || isReadOnlyMode}
                          className={`
                            min-h-[44px] min-w-[44px] px-3 py-2.5 sm:px-3 sm:py-1.5 rounded-lg text-xs font-medium transition-all duration-200
                            flex items-center justify-center flex-1 max-w-[80px]
                            ${getStatusColor(status, attendanceStatus[student.id] === status)}
                            ${
                              loading || isReadOnlyMode
                                ? "opacity-60 cursor-not-allowed"
                                : "cursor-pointer"
                            }
                          `}
                          aria-label={`Status ${status} untuk ${student.full_name}`}
                        >
                          {attendanceStatus[student.id] === status && getStatusIcon(status)}
                          <span className="ml-1">{status}</span>
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 sm:px-6 sm:py-4">
                    <input
                      type="text"
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 
                        focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 
                        transition text-sm bg-white dark:bg-slate-700/50 text-slate-900 dark:text-slate-100
                        placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      placeholder="Tambah keterangan..."
                      value={attendanceNotes[student.id] || ""}
                      onChange={(e) => handleNotesChange(student.id, e.target.value)}
                      disabled={loading || isReadOnlyMode}
                      aria-label={`Keterangan untuk ${student.full_name}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile View */}
      <div className="block sm:hidden">
        {filteredStudents.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-slate-500 dark:text-slate-400">Tidak ada siswa yang ditemukan</p>
          </div>
        ) : (
          filteredStudents.map((student, index) => (
            <div
              key={student.id}
              className="border-b border-slate-100 dark:border-slate-700/50 p-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors duration-150"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-base shadow-md ${getGenderColor(
                      student.gender
                    )}`}
                  >
                    {getInitials(student.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1 truncate">
                      {index + 1}. {student.full_name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      NIS: {student.nis}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {student.gender === "L" ? "Laki-laki" : "Perempuan"} •{" "}
                      {classes.find((c) => c.id === selectedClass)?.displayName}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Status Kehadiran */}
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-3 block">
                    Status Kehadiran
                  </label>
                  {/* ✅ UPDATE: Urutan Hadir - Sakit - Izin - Alpa untuk mobile */}
                  <div className="grid grid-cols-2 gap-2">
                    {statusOrder.map((status) => (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(student.id, status)}
                        disabled={loading || isReadOnlyMode}
                        className={`
                          min-h-[52px] px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200
                          flex items-center justify-center gap-1.5
                          ${getStatusColor(status, attendanceStatus[student.id] === status)}
                          ${
                            loading || isReadOnlyMode
                              ? "opacity-60 cursor-not-allowed"
                              : "cursor-pointer"
                          }
                        `}
                        aria-label={`Status ${status} untuk ${student.full_name}`}
                      >
                        <span className="text-base">{getStatusIcon(status)}</span>
                        <span>{status}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Keterangan Input */}
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                    Keterangan
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-3 rounded-lg border border-slate-200 dark:border-slate-600 
                      focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 
                      transition text-sm bg-white dark:bg-slate-700/50 text-slate-900 dark:text-slate-100
                      placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    placeholder="Tambah keterangan..."
                    value={attendanceNotes[student.id] || ""}
                    onChange={(e) => handleNotesChange(student.id, e.target.value)}
                    disabled={loading || isReadOnlyMode}
                    aria-label={`Keterangan untuk ${student.full_name}`}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Table Footer - Pagination */}
      {filteredStudents.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-700/30 px-4 py-3 sm:px-6 sm:py-4 border-t-2 border-slate-200 dark:border-slate-600">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
            <span className="text-slate-600 dark:text-slate-400 text-center sm:text-left">
              Menampilkan{" "}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {filteredStudents.length}
              </span>{" "}
              siswa
            </span>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={onPrevPage}
                disabled={currentPage <= 1 || loading || isReadOnlyMode}
                className="flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 
                  border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 
                  font-medium hover:bg-slate-50 dark:hover:bg-slate-600 transition-all duration-200 
                  disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                ← Prev
              </button>
              <button
                onClick={onNextPage}
                disabled={loading || isReadOnlyMode || filteredStudents.length < 30}
                className="flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 
                  border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 
                  font-medium hover:bg-slate-50 dark:hover:bg-slate-600 transition-all duration-200 
                  disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceTable;
