import React, { useState, useEffect } from "react";

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
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(date);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Initialize temp date
  useEffect(() => {
    setTempDate(date);
  }, [date]);

  // Custom calendar functions
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handlePrevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const handleDayClick = (day) => {
    const selected = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    const formatted = selected.toISOString().split("T")[0];
    setTempDate(formatted);
  };

  const handleSetDate = () => {
    setDate(tempDate);
    setShowCustomDatePicker(false);
  };

  const handleCancel = () => {
    setTempDate(date);
    setShowCustomDatePicker(false);
  };

  const handleClear = () => {
    setTempDate("");
    setDate("");
    setShowCustomDatePicker(false);
  };

  const handleToday = () => {
    const today = new Date().toISOString().split("T")[0];
    setTempDate(today);
    setDate(today);
    setShowCustomDatePicker(false);
  };

  // Render custom calendar
  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const days = [];
    const dayNames = ["M", "S", "S", "R", "K", "J", "S"];

    // Empty cells for first week
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8"></div>);
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      const dayString = dayDate.toISOString().split("T")[0];
      const isToday = dayDate.toDateString() === new Date().toDateString();
      const isSelected = tempDate === dayString;

      days.push(
        <button
          key={day}
          onClick={() => handleDayClick(day)}
          className={`
            h-8 w-8 rounded-full flex items-center justify-center text-sm
            transition-all duration-200 active:scale-95 touch-manipulation
            ${
              isSelected
                ? "bg-blue-500 text-white font-semibold"
                : isToday
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            }
          `}
          aria-label={`Pilih tanggal ${day} ${currentMonth.toLocaleDateString(
            "id-ID",
            { month: "long" }
          )} ${year}`}>
          {day}
        </button>
      );
    }

    return days;
  };

  return (
    <>
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

          {/* Tanggal Filter dengan CUSTOM DATE PICKER */}
          <div className="space-y-2 xs:space-y-3">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Tanggal
            </label>
            <div className="relative">
              {/* Hidden native input untuk form submission */}
              <input type="hidden" name="date" value={date} />

              {/* Custom date display */}
              <div
                onClick={() => !loading && setShowCustomDatePicker(true)}
                className={`
                  w-full p-3 xs:p-3.5 sm:p-4 text-sm border border-slate-300 
                  dark:border-slate-700 rounded-lg transition-all duration-200 
                  bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 
                  ${
                    loading
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer hover:border-blue-500 dark:hover:border-blue-400"
                  }
                  min-h-[44px] flex items-center
                `}
                aria-label="Pilih Tanggal"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) {
                    setShowCustomDatePicker(true);
                  }
                }}>
                <span className="flex-1">
                  {date ? formatDate(date) : "Pilih tanggal..."}
                </span>
                <span className="text-slate-600 dark:text-slate-300 text-lg ml-2">
                  📅
                </span>
              </div>
            </div>
            <p className="text-xs xs:text-sm text-slate-500 dark:text-slate-400 mt-1 xs:mt-2">
              {date
                ? formatDate(date)
                : new Date().toLocaleDateString("id-ID", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
            </p>
          </div>
        </div>
      </div>

      {/* CUSTOM DATE PICKER MODAL - RESPONSIVE */}
      {showCustomDatePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                  Pilih Tanggal
                </h3>
                <button
                  onClick={handleCancel}
                  className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                  aria-label="Tutup">
                  ✕
                </button>
              </div>

              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={handlePrevMonth}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                  aria-label="Bulan sebelumnya">
                  ←
                </button>
                <div className="text-center">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {currentMonth.toLocaleDateString("id-ID", {
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                  {tempDate && (
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Terpilih: {formatDate(tempDate)}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleNextMonth}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                  aria-label="Bulan berikutnya">
                  →
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="p-4">
              <div className="grid grid-cols-7 gap-1 mb-4">
                {["M", "S", "S", "R", "K", "J", "S"].map((day, idx) => (
                  <div
                    key={idx}
                    className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 py-1">
                    {day}
                  </div>
                ))}
                {renderCalendar()}
              </div>
            </div>

            {/* Action Buttons - RESPONSIVE LAYOUT */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              {/* Hari Ini Button - Full width di atas */}
              <button
                onClick={handleToday}
                className="w-full mb-3 px-4 py-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg font-medium hover:bg-blue-200 dark:hover:bg-blue-800/50 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2">
                <span className="text-base">📅</span>
                <span>Pilih Hari Ini</span>
              </button>

              {/* Hapus | Batal | Set - SEMUA DALAM 1 BARIS */}
              <div className="flex gap-2">
                {/* Hapus Button */}
                <button
                  onClick={handleClear}
                  className="flex-1 px-3 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 transition-all duration-200 flex items-center justify-center gap-1">
                  <span className="text-sm">🗑️</span>
                  <span className="text-xs sm:text-sm">Hapus</span>
                </button>

                {/* Batal Button */}
                <button
                  onClick={handleCancel}
                  className="flex-1 px-3 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 transition-all duration-200 flex items-center justify-center gap-1">
                  <span className="text-sm">↩️</span>
                  <span className="text-xs sm:text-sm">Batal</span>
                </button>

                {/* Set Button */}
                <button
                  onClick={handleSetDate}
                  className="flex-1 px-3 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium active:scale-95 transition-all duration-200 flex items-center justify-center gap-1">
                  <span className="text-sm">✓</span>
                  <span className="text-xs sm:text-sm">Set</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AttendanceFilters;
