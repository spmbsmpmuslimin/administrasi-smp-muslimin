import React, { useMemo } from "react";

const Statistics = ({
  students,
  totalStudents,
  maleStudents,
  femaleStudents,
  getCurrentAcademicYear,
}) => {
  // Get top schools stats untuk bar chart (top 8)
  const getSchoolStats = useMemo(() => {
    if (!students || students.length === 0) return [];

    const schoolCounts = {};
    students.forEach((student) => {
      const school = (student.asal_sekolah || "Tidak Diketahui").trim();
      schoolCounts[school] = (schoolCounts[school] || 0) + 1;
    });

    return Object.entries(schoolCounts)
      .map(([school, count]) => ({ school, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [students]);

  // Get ALL schools dengan breakdown gender (untuk tabel)
  const getSchoolRankings = useMemo(() => {
    if (!students || students.length === 0) return [];

    const schoolData = {};

    students.forEach((student) => {
      const school = (student.asal_sekolah || "Tidak Diketahui").trim();
      const gender = student.jenis_kelamin;

      if (!schoolData[school]) {
        schoolData[school] = {
          school,
          total: 0,
          male: 0,
          female: 0,
        };
      }

      schoolData[school].total += 1;
      if (gender === "L") schoolData[school].male += 1;
      if (gender === "P") schoolData[school].female += 1;
    });

    return Object.values(schoolData).sort((a, b) => b.total - a.total);
  }, [students]);

  const malePercentage = totalStudents > 0 ? (maleStudents / totalStudents) * 100 : 0;
  const femalePercentage = totalStudents > 0 ? (femaleStudents / totalStudents) * 100 : 0;

  const maxSchoolCount =
    getSchoolStats.length > 0 ? Math.max(...getSchoolStats.map((s) => s.count)) : 0;

  return (
    <div className="bg-gray-50 dark:bg-slate-900 min-h-screen p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">
            Dashboard Statistik
          </h1>
          <p className="text-gray-600 dark:text-slate-400 text-sm sm:text-base">
            SMP Muslimin Cililin - Tahun Ajaran {getCurrentAcademicYear()}
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 sm:p-6 shadow-sm border border-purple-100 dark:border-purple-800">
            <div className="text-xs sm:text-sm text-purple-600 dark:text-purple-400 font-semibold mb-2">
              Total Pendaftar
            </div>
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-purple-700 dark:text-purple-300">
              {totalStudents}
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-4 sm:p-6 shadow-sm border border-blue-100 dark:border-blue-800">
            <div className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-semibold mb-2">
              Siswa Laki-laki
            </div>
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-700 dark:text-blue-300">
              {maleStudents}
            </div>
            <div className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-medium mt-1">
              {malePercentage.toFixed(1)}%
            </div>
          </div>
          <div className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 rounded-xl p-4 sm:p-6 shadow-sm border border-rose-100 dark:border-rose-800">
            <div className="text-xs sm:text-sm text-rose-600 dark:text-rose-400 font-semibold mb-2">
              Siswa Perempuan
            </div>
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-rose-700 dark:text-rose-300">
              {femaleStudents}
            </div>
            <div className="text-xs sm:text-sm text-rose-600 dark:text-rose-400 font-medium mt-1">
              {femalePercentage.toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8">
          {/* Pie Chart - Gender Distribution */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 md:p-8 shadow-sm">
            <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4 sm:mb-6 md:mb-8">
              Distribusi Gender
            </h2>

            <div className="flex items-center justify-center mb-4 sm:mb-6 md:mb-8">
              <svg
                width="200"
                height="200"
                viewBox="0 0 280 280"
                className="transform -rotate-90 w-full max-w-[180px] sm:max-w-[200px] md:max-w-[240px]"
              >
                {/* Background circle */}
                <circle
                  cx="140"
                  cy="140"
                  r="100"
                  fill="none"
                  stroke="#f3f4f6"
                  className="dark:stroke-slate-700"
                  strokeWidth="40"
                />
                {/* Male segment */}
                <circle
                  cx="140"
                  cy="140"
                  r="100"
                  fill="none"
                  stroke="#3b82f6"
                  className="dark:stroke-blue-500"
                  strokeWidth="40"
                  strokeDasharray={`${(malePercentage / 100) * 628} 628`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
                {/* Female segment */}
                <circle
                  cx="140"
                  cy="140"
                  r="100"
                  fill="none"
                  stroke="#f43f5e"
                  className="dark:stroke-rose-500"
                  strokeWidth="40"
                  strokeDasharray={`${(femalePercentage / 100) * 628} 628`}
                  strokeDashoffset={`-${(malePercentage / 100) * 628}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
                {/* Center text */}
                <text
                  x="140"
                  y="140"
                  textAnchor="middle"
                  dy="0.3em"
                  className="text-2xl sm:text-3xl md:text-4xl font-bold fill-gray-900 dark:fill-slate-100 transform rotate-90"
                  style={{ transformOrigin: "140px 140px" }}
                >
                  {totalStudents}
                </text>
              </svg>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-blue-600 dark:bg-blue-500"></div>
                <div className="flex-1">
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">
                    Laki-laki
                  </div>
                  <div className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-slate-100">
                    {maleStudents} ({malePercentage.toFixed(1)}%)
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-rose-600 dark:bg-rose-500"></div>
                <div className="flex-1">
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">
                    Perempuan
                  </div>
                  <div className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-slate-100">
                    {femaleStudents} ({femalePercentage.toFixed(1)}%)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bar Chart - Top Schools */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 md:p-8 shadow-sm">
            <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4 sm:mb-6 md:mb-8">
              Asal Sekolah (Top 8)
            </h2>

            <div className="space-y-3 sm:space-y-4">
              {getSchoolStats.length === 0 ? (
                <div className="text-center py-8 sm:py-12 text-gray-400 dark:text-slate-500">
                  Belum ada data
                </div>
              ) : (
                getSchoolStats.map((stat, index) => {
                  const barWidth = maxSchoolCount > 0 ? (stat.count / maxSchoolCount) * 100 : 0;
                  return (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-1 sm:mb-2">
                        <div
                          className="text-xs sm:text-sm text-gray-700 dark:text-slate-300 truncate flex-1 mr-3"
                          title={stat.school}
                        >
                          {stat.school}
                        </div>
                        <div className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-slate-100 tabular-nums">
                          {stat.count}
                        </div>
                      </div>
                      <div className="h-5 sm:h-6 md:h-7 lg:h-8 bg-gray-100 dark:bg-slate-700 rounded-lg overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 rounded-lg transition-all duration-1000 flex items-center px-2 sm:px-3"
                          style={{ width: `${barWidth}%` }}
                        >
                          {barWidth > 15 && (
                            <span className="text-xs font-medium text-white">
                              {((stat.count / totalStudents) * 100).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* School Rankings Table - NEW */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 sm:p-4 md:p-6 lg:p-8 shadow-sm">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-slate-100 mb-3 sm:mb-4 md:mb-6">
            Pendaftar Berdasarkan Asal Sekolah
          </h2>

          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 dark:border-slate-700">
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-3 md:px-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-900/50">
                      No
                    </th>
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-3 md:px-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-900/50">
                      Asal Sekolah
                    </th>
                    <th className="text-center py-2 sm:py-3 px-2 sm:px-3 md:px-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-900/50">
                      Total
                    </th>
                    <th className="text-center py-2 sm:py-3 px-2 sm:px-3 md:px-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-900/50">
                      <span className="hidden sm:inline">Laki-laki</span>
                      <span className="sm:hidden">L</span>
                    </th>
                    <th className="text-center py-2 sm:py-3 px-2 sm:px-3 md:px-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-900/50">
                      <span className="hidden sm:inline">Perempuan</span>
                      <span className="sm:hidden">P</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {!students || students.length === 0 ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="text-center py-8 sm:py-12 text-gray-400 dark:text-slate-500"
                      >
                        Belum ada pendaftar
                      </td>
                    </tr>
                  ) : (
                    getSchoolRankings.map((school, index) => (
                      <tr
                        key={index}
                        className="border-b border-gray-100 dark:border-slate-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-xs sm:text-sm text-gray-600 dark:text-slate-400 font-medium">
                          {index + 1}
                        </td>
                        <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-xs sm:text-sm font-medium text-gray-900 dark:text-slate-200">
                          <div className="max-w-[120px] sm:max-w-xs truncate" title={school.school}>
                            {school.school}
                          </div>
                        </td>
                        <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-center">
                          <span className="inline-flex items-center justify-center px-1.5 sm:px-2 md:px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs sm:text-sm font-bold rounded-lg min-w-[2rem]">
                            {school.total}
                          </span>
                        </td>
                        <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-center">
                          <span className="inline-flex items-center justify-center px-1.5 sm:px-2 md:px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs sm:text-sm font-semibold rounded-lg min-w-[2rem]">
                            {school.male}
                          </span>
                        </td>
                        <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 text-center">
                          <span className="inline-flex items-center justify-center px-1.5 sm:px-2 md:px-3 py-1 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 text-xs sm:text-sm font-semibold rounded-lg min-w-[2rem]">
                            {school.female}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Footer */}
          {getSchoolRankings.length > 0 && (
            <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200 dark:border-slate-700">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-slate-400">
                <div>
                  Total{" "}
                  <span className="font-semibold text-gray-900 dark:text-slate-200">
                    {getSchoolRankings.length}
                  </span>{" "}
                  sekolah asal
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 rounded bg-blue-600 dark:bg-blue-500"></div>
                    <span>
                      <span className="font-semibold text-gray-900 dark:text-slate-200">
                        {maleStudents}
                      </span>{" "}
                      Laki-laki
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 rounded bg-rose-600 dark:bg-rose-500"></div>
                    <span>
                      <span className="font-semibold text-gray-900 dark:text-slate-200">
                        {femaleStudents}
                      </span>{" "}
                      Perempuan
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Statistics;
