import React from "react";

const AttendanceStats = ({ attendanceStatus, students }) => {
  const getAttendanceStats = () => {
    const stats = { Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0 };
    Object.values(attendanceStatus).forEach((status) => {
      if (stats[status] !== undefined) stats[status]++;
    });
    return stats;
  };

  const stats = getAttendanceStats();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
      {/* Hadir Card */}
      <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-sm dark:shadow-gray-900/50 border-l-4 border-green-500">
        <div className="flex items-center">
          <div className="text-green-600 dark:text-green-400 text-lg sm:text-xl mr-2 sm:mr-3">
            ✓
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">
              {stats.Hadir}
            </div>
            <div className="text-xs sm:text-sm text-slate-600 dark:text-gray-300">
              Hadir
            </div>
          </div>
        </div>
      </div>

      {/* Sakit Card */}
      <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-sm dark:shadow-gray-900/50 border-l-4 border-yellow-500">
        <div className="flex items-center">
          <div className="text-yellow-600 dark:text-yellow-400 text-lg sm:text-xl mr-2 sm:mr-3">
            🏥
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">
              {stats.Sakit}
            </div>
            <div className="text-xs sm:text-sm text-slate-600 dark:text-gray-300">
              Sakit
            </div>
          </div>
        </div>
      </div>

      {/* Izin Card */}
      <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-sm dark:shadow-gray-900/50 border-l-4 border-blue-500">
        <div className="flex items-center">
          <div className="text-blue-600 dark:text-blue-400 text-lg sm:text-xl mr-2 sm:mr-3">
            📋
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">
              {stats.Izin}
            </div>
            <div className="text-xs sm:text-sm text-slate-600 dark:text-gray-300">
              Izin
            </div>
          </div>
        </div>
      </div>

      {/* Alpa Card */}
      <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-sm dark:shadow-gray-900/50 border-l-4 border-red-500">
        <div className="flex items-center">
          <div className="text-red-600 dark:text-red-400 text-lg sm:text-xl mr-2 sm:mr-3">
            ✖
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">
              {stats.Alpa}
            </div>
            <div className="text-xs sm:text-sm text-slate-600 dark:text-gray-300">
              Alpa
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceStats;
