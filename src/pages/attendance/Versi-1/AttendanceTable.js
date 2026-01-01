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
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm dark:shadow-slate-800/50 overflow-hidden">
      {/* Table Header */}
      <div className="p-4 xs:p-5 sm:p-6 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-200">
          Daftar Siswa - {classes.find((c) => c.id === selectedClass)?.displayName}
          {searchTerm && (
            <span className="text-sm text-slate-600 dark:text-slate-400 ml-2">
              ({filteredStudents.length} siswa)
            </span>
          )}
        </h3>
      </div>

      {/* Mobile View - Default untuk Mobile First */}
      <div className="block sm:hidden">
        {filteredStudents.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-500 dark:text-slate-400">Tidak ada siswa yang ditemukan</p>
          </div>
        ) : (
          filteredStudents.map((student, index) => (
            <div
              key={student.id}
              className="border-b border-slate-100 dark:border-slate-800 p-4 xs:p-5"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 dark:text-slate-100 mb-1 truncate">
                    {index + 1}. {student.full_name}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    NIS: {student.nis}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Status Kehadiran */}
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-3 block">
                    Status Kehadiran
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      className={`px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 touch-manipulation min-h-[44px] flex items-center justify-center ${
                        attendanceStatus[student.id] === "Hadir"
                          ? "bg-green-500 hover:bg-green-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 active:bg-slate-200 dark:active:bg-slate-700"
                      }`}
                      onClick={() => handleStatusChange(student.id, "Hadir")}
                      disabled={loading}
                      aria-label="Hadir"
                    >
                      <span className="text-base mr-2">✓</span>
                      <span>Hadir</span>
                    </button>
                    <button
                      className={`px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 touch-manipulation min-h-[44px] flex items-center justify-center ${
                        attendanceStatus[student.id] === "Sakit"
                          ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 active:bg-slate-200 dark:active:bg-slate-700"
                      }`}
                      onClick={() => handleStatusChange(student.id, "Sakit")}
                      disabled={loading}
                      aria-label="Sakit"
                    >
                      <span className="text-base mr-2">🏥</span>
                      <span>Sakit</span>
                    </button>
                    <button
                      className={`px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 touch-manipulation min-h-[44px] flex items-center justify-center ${
                        attendanceStatus[student.id] === "Izin"
                          ? "bg-blue-500 hover:bg-blue-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 active:bg-slate-200 dark:active:bg-slate-700"
                      }`}
                      onClick={() => handleStatusChange(student.id, "Izin")}
                      disabled={loading}
                      aria-label="Izin"
                    >
                      <span className="text-base mr-2">📋</span>
                      <span>Izin</span>
                    </button>
                    <button
                      className={`px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 touch-manipulation min-h-[44px] flex items-center justify-center ${
                        attendanceStatus[student.id] === "Alpa"
                          ? "bg-red-500 hover:bg-red-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 active:bg-slate-200 dark:active:bg-slate-700"
                      }`}
                      onClick={() => handleStatusChange(student.id, "Alpa")}
                      disabled={loading}
                      aria-label="Alpa"
                    >
                      <span className="text-base mr-2">✖</span>
                      <span>Alpa</span>
                    </button>
                  </div>
                </div>

                {/* Keterangan Input */}
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-3 block">
                    Keterangan
                  </label>
                  <input
                    type="text"
                    className="w-full p-3.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-600 dark:focus:border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 transition-all duration-200 touch-manipulation min-h-[44px]"
                    placeholder="Tambahkan keterangan jika diperlukan..."
                    value={attendanceNotes[student.id] || ""}
                    onChange={(e) => handleNotesChange(student.id, e.target.value)}
                    disabled={loading}
                    aria-label={`Keterangan untuk ${student.full_name}`}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Tablet & Desktop View */}
      <div className="hidden sm:block overflow-x-auto">
        {filteredStudents.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-500 dark:text-slate-400">Tidak ada siswa yang ditemukan</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap w-16">
                  No
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap min-w-[100px]">
                  NIS
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[180px] lg:min-w-[220px]">
                  Nama Siswa
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[280px] lg:min-w-[320px]">
                  Status Kehadiran
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[220px] lg:min-w-[260px]">
                  Keterangan
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student, index) => (
                <tr
                  key={student.id}
                  className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-4 py-3.5 text-sm text-slate-900 dark:text-slate-100">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {student.nis}
                  </td>
                  <td className="px-4 py-3.5 text-sm font-medium text-slate-900 dark:text-slate-100">
                    <span className="line-clamp-1">{student.full_name}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 min-h-[40px] min-w-[70px] flex items-center justify-center gap-1.5 ${
                          attendanceStatus[student.id] === "Hadir"
                            ? "bg-green-500 hover:bg-green-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                        onClick={() => handleStatusChange(student.id, "Hadir")}
                        disabled={loading}
                        aria-label="Hadir"
                      >
                        <span className="text-base">✓</span>
                        <span>Hadir</span>
                      </button>
                      <button
                        className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 min-h-[40px] min-w-[70px] flex items-center justify-center gap-1.5 ${
                          attendanceStatus[student.id] === "Sakit"
                            ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                        onClick={() => handleStatusChange(student.id, "Sakit")}
                        disabled={loading}
                        aria-label="Sakit"
                      >
                        <span className="text-base">🏥</span>
                        <span>Sakit</span>
                      </button>
                      <button
                        className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 min-h-[40px] min-w-[70px] flex items-center justify-center gap-1.5 ${
                          attendanceStatus[student.id] === "Izin"
                            ? "bg-blue-500 hover:bg-blue-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                        onClick={() => handleStatusChange(student.id, "Izin")}
                        disabled={loading}
                        aria-label="Izin"
                      >
                        <span className="text-base">📋</span>
                        <span>Izin</span>
                      </button>
                      <button
                        className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 min-h-[40px] min-w-[70px] flex items-center justify-center gap-1.5 ${
                          attendanceStatus[student.id] === "Alpa"
                            ? "bg-red-500 hover:bg-red-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                        onClick={() => handleStatusChange(student.id, "Alpa")}
                        disabled={loading}
                        aria-label="Alpa"
                      >
                        <span className="text-base">✖</span>
                        <span>Alpa</span>
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <input
                      type="text"
                      className="w-full p-3 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-600 dark:focus:border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 transition-all duration-200 min-h-[44px]"
                      placeholder="Tambahkan keterangan..."
                      value={attendanceNotes[student.id] || ""}
                      onChange={(e) => handleNotesChange(student.id, e.target.value)}
                      disabled={loading}
                      aria-label={`Keterangan untuk ${student.full_name}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AttendanceTable;
