import React from "react";

const AttendanceFilters = ({
  subjects,
  selectedSubject,
  setSelectedSubject,
  classes,
  selectedClass,
  setSelectedClass,
  date,
  setDate,
  loading,
  teacherId,
  isHomeroomDaily,
  setStudents,
  setStudentsLoaded,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 p-4 xs:p-5 sm:p-6 rounded-xl shadow-sm dark:shadow-slate-800/50 mb-4 sm:mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 xs:gap-5 sm:gap-6">
        {/* Mata Pelajaran Filter */}
        <div className="space-y-2 xs:space-y-3">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Mata Pelajaran
          </label>
          <select
            value={selectedSubject}
            onChange={(e) => {
              setSelectedSubject(e.target.value);
              setSelectedClass("");
              setStudents([]);
              setStudentsLoaded(false);
            }}
            disabled={loading || !teacherId}
            className="w-full p-3 xs:p-3.5 sm:p-4 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-blue-500 dark:focus:border-blue-600 transition-all duration-200 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 disabled:bg-slate-50 dark:disabled:bg-slate-800/50 disabled:text-slate-500 dark:disabled:text-slate-400 touch-manipulation min-h-[44px] appearance-none"
            aria-label="Pilih Mata Pelajaran">
            <option
              value=""
              className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
              Pilih Mata Pelajaran
            </option>
            {subjects.map((subject, index) => (
              <option
                key={index}
                value={subject}
                className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                {subject}
              </option>
            ))}
          </select>
        </div>

        {/* Kelas Filter */}
        <div className="space-y-2 xs:space-y-3">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Kelas
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            disabled={!selectedSubject || loading || isHomeroomDaily()}
            className="w-full p-3 xs:p-3.5 sm:p-4 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-blue-500 dark:focus:border-blue-600 transition-all duration-200 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 disabled:bg-slate-50 dark:disabled:bg-slate-800/50 disabled:text-slate-500 dark:disabled:text-slate-400 touch-manipulation min-h-[44px] appearance-none"
            aria-label="Pilih Kelas"
            aria-disabled={!selectedSubject || loading || isHomeroomDaily()}>
            <option
              value=""
              className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
              Pilih Kelas
            </option>
            {classes.map((cls) => (
              <option
                key={cls.id}
                value={cls.id}
                className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                {cls.displayName}
              </option>
            ))}
          </select>
          {isHomeroomDaily() && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 xs:mt-2 flex items-center gap-1">
              <span className="text-sm">ℹ️</span>
              Kelas otomatis dipilih untuk presensi harian
            </p>
          )}
        </div>

        {/* Tanggal Filter */}
        <div className="space-y-2 xs:space-y-3">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Tanggal
          </label>
          <div className="relative">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={loading}
              min="2024-01-01"
              max="2026-12-31"
              className="w-full p-3 xs:p-3.5 sm:p-4 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-blue-500 dark:focus:border-blue-600 transition-all duration-200 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 disabled:bg-slate-50 dark:disabled:bg-slate-800/50 disabled:text-slate-500 dark:disabled:text-slate-400 touch-manipulation min-h-[44px] appearance-none [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:dark:invert"
              aria-label="Pilih Tanggal"
            />
            {/* Calendar Icon untuk visual hint di mobile */}
            <span className="absolute right-3 xs:right-4 top-1/2 transform -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none text-lg">
              📅
            </span>
          </div>
          <p className="text-xs xs:text-sm text-slate-500 dark:text-slate-400 mt-1 xs:mt-2">
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AttendanceFilters;
