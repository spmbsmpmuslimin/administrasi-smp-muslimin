//[file name]: AttendanceFilters.js
import React, { useState, useEffect } from "react";
import { getSemesterDisplayName } from "../../services/academicYearService";

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
  activeAcademicInfo,
  selectedSemesterId,
  availableSemesters,
  onSemesterChange,
  // ✅ TAMBAH PROPS BARU INI
  isReadOnlyMode,
}) => {
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(date);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [semesterDisplayNames, setSemesterDisplayNames] = useState({});

  // Fungsi untuk mendapatkan tanggal Indonesia (WIB - UTC+7)
  const getIndonesiaDate = () => {
    const now = new Date();
    const indonesiaTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
    return indonesiaTime;
  };

  // Initialize temp date
  useEffect(() => {
    setTempDate(date);
  }, [date]);

  // ✅ LOAD SIMPLIFIED SEMESTER NAMES
  useEffect(() => {
    const loadSemesterDisplayNames = async () => {
      if (!availableSemesters || availableSemesters.length === 0) return;

      const names = {};
      for (const semester of availableSemesters) {
        names[semester.id] = semester.semester === 1 ? "Semester Ganjil" : "Semester Genap";
      }
      setSemesterDisplayNames(names);
    };

    loadSemesterDisplayNames();
  }, [availableSemesters]);

  // ✅ FUNCTION BARU: VALIDASI TANGGAL DI DATE PICKER
  // âœ… HELPER FUNCTIONS UNTUK DATE HANDLING
  const getTodayWIB = () => {
    const now = new Date();
    const wibOffset = 7 * 60; // WIB = UTC+7 dalam menit
    const localOffset = now.getTimezoneOffset();
    const wibTime = new Date(now.getTime() + (wibOffset + localOffset) * 60000);

    // Set ke midnight (00:00:00)
    wibTime.setHours(0, 0, 0, 0);

    return wibTime;
  };

  const parseDate = (dateString) => {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  };

  // âœ… FUNCTION VALIDASI TANGGAL - DIPERBAIKI
  const validateSelectedDate = (selectedDate) => {
    if (!selectedDate || !selectedSemesterId) return true;

    const selectedSemester = availableSemesters?.find((s) => s.id === selectedSemesterId);

    if (!selectedSemester) return true;

    // âœ… Parse dengan benar menggunakan helper functions
    const inputDate = parseDate(selectedDate);
    const today = getTodayWIB();

    const startDate = parseDate(selectedSemester.start_date);
    const endDate = parseDate(selectedSemester.end_date);

    // Cek: tanggal tidak boleh masa depan
    if (inputDate > today) {
      return false;
    }

    // Cek: tanggal harus dalam range semester
    if (inputDate < startDate || inputDate > endDate) {
      return false;
    }

    return true;
  };

  // Custom calendar functions
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-").map(Number);

    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const months = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];

    const d = new Date(year, month - 1, day);
    const dayIndex = d.getDay();

    return `${days[dayIndex]}, ${day} ${months[month - 1]} ${year}`;
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDayClick = (day) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const formatted = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}`;

    // ✅ VALIDASI SEBELUM SET
    if (!validateSelectedDate(formatted)) {
      // Tanggal tidak valid, tidak diset
      return;
    }

    setTempDate(formatted);
  };

  const handleSetDate = () => {
    // ✅ VALIDASI FINAL SEBELUM APPLY
    if (!validateSelectedDate(tempDate)) {
      // Biarkan error handling di Attendance.js
      setDate(tempDate);
      setShowCustomDatePicker(false);
      return;
    }

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
    const now = getIndonesiaDate();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;

    // ✅ VALIDASI TANGGAL HARI INI
    if (!validateSelectedDate(today)) {
      setTempDate(today);
      setDate(today);
      setShowCustomDatePicker(false);
      return;
    }

    setTempDate(today);
    setDate(today);
    setShowCustomDatePicker(false);
  };

  // ✅ HANDLE SEMESTER CHANGE
  const handleSemesterChange = (e) => {
    const semesterId = e.target.value;
    if (semesterId && onSemesterChange) {
      onSemesterChange(semesterId);
    }
  };

  // ✅ GET CURRENT SEMESTER DISPLAY - SIMPLIFIED
  const getCurrentSemesterDisplay = () => {
    if (!selectedSemesterId) return "Pilih Semester";

    if (semesterDisplayNames[selectedSemesterId]) {
      return semesterDisplayNames[selectedSemesterId];
    }

    const semester = availableSemesters?.find((s) => s.id === selectedSemesterId);
    if (semester) {
      return semester.semester === 1 ? "Semester Ganjil" : "Semester Genap";
    }

    return "Semester";
  };

  // ✅ RENDER CALENDAR DENGAN VALIDASI
  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const days = [];

    // Empty cells for first week
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8"></div>);
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dayString = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(
        2,
        "0"
      )}`;

      const today = getIndonesiaDate();
      const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(today.getDate()).padStart(2, "0")}`;
      const isToday = dayString === todayString;
      const isSelected = tempDate === dayString;

      // ✅ CEK VALIDASI TANGGAL
      const isValid = validateSelectedDate(dayString);

      days.push(
        <button
          key={day}
          onClick={() => handleDayClick(day)}
          disabled={!isValid || isReadOnlyMode}
          className={`
            h-8 w-8 rounded-full flex items-center justify-center text-sm
            transition-all duration-200 active:scale-95 touch-manipulation
            ${
              !isValid
                ? "opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-500"
                : isSelected
                ? "bg-blue-500 text-white font-semibold"
                : isToday
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            }
            ${isReadOnlyMode ? "opacity-60 cursor-not-allowed" : ""}
          `}
          aria-label={`Pilih tanggal ${day} ${currentMonth.toLocaleDateString("id-ID", {
            month: "long",
          })} ${year} ${!isValid ? "(tidak valid)" : ""}`}
          title={!isValid ? "Tanggal tidak valid untuk semester ini" : ""}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-900 p-4 xs:p-5 sm:p-6 rounded-xl shadow-sm dark:shadow-slate-800/50 mb-4 sm:mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 xs:gap-5 sm:gap-6">
          {/* ✅ SEMESTER FILTER - DENGAN READ-ONLY INDICATOR */}
          <div className="space-y-2 xs:space-y-3">
            <div className="flex items-center gap-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Semester
              </label>
              {isReadOnlyMode && (
                <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                  (View Only)
                </span>
              )}
            </div>
            <select
              value={selectedSemesterId || ""}
              onChange={handleSemesterChange}
              disabled={loading || !availableSemesters || availableSemesters.length === 0}
              className={`
                w-full p-3 xs:p-3.5 sm:p-4 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-blue-500 dark:focus:border-blue-600 transition-all duration-200 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 disabled:bg-slate-50 dark:disabled:bg-slate-800/50 disabled:text-slate-500 dark:disabled:text-slate-400 touch-manipulation min-h-[44px] appearance-none
                ${
                  isReadOnlyMode
                    ? "border-yellow-300 dark:border-yellow-700"
                    : "border-slate-300 dark:border-slate-700"
                }
              `}
              aria-label="Pilih Semester"
            >
              <option
                value=""
                className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                {availableSemesters?.length > 0 ? "Pilih Semester" : "Loading..."}
              </option>
              {availableSemesters?.map((semester) => (
                <option
                  key={semester.id}
                  value={semester.id}
                  className={`
                    ${
                      semester.is_active
                        ? "font-semibold text-blue-600 dark:text-blue-400"
                        : "text-slate-600 dark:text-slate-400"
                    }
                  `}
                >
                  {semester.semester === 1 ? "Semester Ganjil" : "Semester Genap"}
                  {semester.is_active && " (Aktif)"}
                </option>
              ))}
            </select>
          </div>

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
              disabled={loading || !teacherId || !selectedSemesterId || isReadOnlyMode}
              className={`
                w-full p-3 xs:p-3.5 sm:p-4 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-blue-500 dark:focus:border-blue-600 transition-all duration-200 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 disabled:bg-slate-50 dark:disabled:bg-slate-800/50 disabled:text-slate-500 dark:disabled:text-slate-400 touch-manipulation min-h-[44px] appearance-none
                ${
                  isReadOnlyMode
                    ? "border-yellow-300 dark:border-yellow-700"
                    : "border-slate-300 dark:border-slate-700"
                }
              `}
              aria-label="Pilih Mata Pelajaran"
            >
              <option
                value=""
                className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                {isReadOnlyMode
                  ? "View Mode"
                  : selectedSemesterId
                  ? "Pilih Mata Pelajaran"
                  : "Pilih semester dulu"}
              </option>
              {subjects.map((subject, index) => (
                <option
                  key={index}
                  value={subject}
                  className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
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
              disabled={
                !selectedSubject ||
                loading ||
                isHomeroomDaily() ||
                !selectedSemesterId ||
                isReadOnlyMode
              }
              className={`
                w-full p-3 xs:p-3.5 sm:p-4 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-blue-500 dark:focus:border-blue-600 transition-all duration-200 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 disabled:bg-slate-50 dark:disabled:bg-slate-800/50 disabled:text-slate-500 dark:disabled:text-slate-400 touch-manipulation min-h-[44px] appearance-none
                ${
                  isReadOnlyMode
                    ? "border-yellow-300 dark:border-yellow-700"
                    : "border-slate-300 dark:border-slate-700"
                }
              `}
              aria-label="Pilih Kelas"
              aria-disabled={
                !selectedSubject ||
                loading ||
                isHomeroomDaily() ||
                !selectedSemesterId ||
                isReadOnlyMode
              }
            >
              <option
                value=""
                className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                {isReadOnlyMode
                  ? "View Mode"
                  : selectedSubject
                  ? "Pilih Kelas"
                  : "Pilih mapel dulu"}
              </option>
              {classes.map((cls) => (
                <option
                  key={cls.id}
                  value={cls.id}
                  className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  {cls.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Tanggal Filter dengan CUSTOM DATE PICKER */}
          <div className="space-y-2 xs:space-y-3">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Tanggal
            </label>
            <div className="relative">
              <input type="hidden" name="date" value={date} />

              <div
                onClick={() => !loading && !isReadOnlyMode && setShowCustomDatePicker(true)}
                className={`
                  w-full p-3 xs:p-3.5 sm:p-4 text-sm border rounded-lg transition-all duration-200 
                  bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 
                  ${
                    loading || isReadOnlyMode
                      ? "opacity-60 cursor-not-allowed"
                      : "cursor-pointer hover:border-blue-500 dark:hover:border-blue-400"
                  }
                  ${
                    isReadOnlyMode
                      ? "border-yellow-300 dark:border-yellow-700"
                      : "border-slate-300 dark:border-slate-700"
                  }
                  min-h-[44px] flex items-center
                `}
                aria-label="Pilih Tanggal"
                role="button"
                tabIndex={loading || isReadOnlyMode ? -1 : 0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading && !isReadOnlyMode) {
                    setShowCustomDatePicker(true);
                  }
                }}
              >
                <span className="flex-1">{date ? formatDate(date) : "Pilih tanggal..."}</span>
                <span className="text-slate-600 dark:text-slate-300 text-lg ml-2">📅</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CUSTOM DATE PICKER MODAL */}
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
                  aria-label="Tutup"
                >
                  ✕
                </button>
              </div>

              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={handlePrevMonth}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                  aria-label="Bulan sebelumnya"
                >
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
                  aria-label="Bulan selanjutnya"
                >
                  →
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="p-4">
              <div className="grid grid-cols-7 gap-1 mb-4">
                {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((day, idx) => (
                  <div
                    key={idx}
                    className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 py-1"
                  >
                    {day}
                  </div>
                ))}
                {renderCalendar()}
              </div>

              {/* ✅ INFORMASI VALIDASI */}
              {selectedSemesterId && (
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-3 p-2 bg-slate-50 dark:bg-slate-900/50 rounded">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5">ℹ️</span>
                    <div>
                      Tanggal yang tidak valid untuk semester ini dinonaktifkan.
                      {isReadOnlyMode && " Mode View Only aktif."}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={handleToday}
                disabled={isReadOnlyMode}
                className={`w-full mb-3 px-4 py-3 rounded-lg font-medium active:scale-95 transition-all duration-200 flex items-center justify-center gap-2
                  ${
                    isReadOnlyMode
                      ? "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                      : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800/50"
                  }
                `}
              >
                <span className="text-base">📅</span>
                <span>Hari Ini</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={handleClear}
                  className="flex-1 px-3 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 transition-all duration-200 flex items-center justify-center gap-1"
                >
                  <span className="text-sm">🗑️</span>
                  <span className="text-xs sm:text-sm">Hapus</span>
                </button>

                <button
                  onClick={handleCancel}
                  className="flex-1 px-3 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 transition-all duration-200 flex items-center justify-center gap-1"
                >
                  <span className="text-sm">↩️</span>
                  <span className="text-xs sm:text-sm">Batal</span>
                </button>

                <button
                  onClick={handleSetDate}
                  className="flex-1 px-3 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium active:scale-95 transition-all duration-200 flex items-center justify-center gap-1"
                >
                  <span className="text-sm">✓</span>
                  <span className="text-xs sm:text-sm">Pilih</span>
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
