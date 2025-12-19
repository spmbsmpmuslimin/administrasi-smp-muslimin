import React, { useState, useEffect } from "react";
import { Calendar } from "lucide-react";

const CustomDatePicker = ({
  value,
  onChange,
  maxDate,
  disabled = false,
  label,
  showInfo = false,
  infoText = "",
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(value);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Fungsi untuk mendapatkan tanggal Indonesia (WIB - UTC+7)
  const getIndonesiaDate = () => {
    const now = new Date();
    const indonesiaTime = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
    );
    return indonesiaTime;
  };

  useEffect(() => {
    setTempDate(value);
  }, [value]);

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

    const days = [
      "Minggu",
      "Senin",
      "Selasa",
      "Rabu",
      "Kamis",
      "Jumat",
      "Sabtu",
    ];
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
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const formatted = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;

    // Validasi maxDate jika ada
    if (maxDate) {
      const selectedDate = new Date(year, month, day);
      const maxDateObj = new Date(maxDate);
      if (selectedDate > maxDateObj) {
        return; // Tidak bisa pilih tanggal lebih dari maxDate
      }
    }

    setTempDate(formatted);
  };

  const handleSetDate = () => {
    onChange(tempDate);
    setShowDatePicker(false);
  };

  const handleCancel = () => {
    setTempDate(value);
    setShowDatePicker(false);
  };

  const handleClear = () => {
    setTempDate("");
    onChange("");
    setShowDatePicker(false);
  };

  const handleToday = () => {
    const now = getIndonesiaDate();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(now.getDate()).padStart(2, "0")}`;
    setTempDate(today);
    onChange(today);
    setShowDatePicker(false);
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayString = `${year}-${String(month + 1).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;
      const today = getIndonesiaDate();
      const todayString = `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const isToday = dayString === todayString;
      const isSelected = tempDate === dayString;

      // Check if day is disabled (after maxDate)
      let isDisabled = false;
      if (maxDate) {
        const dayDate = new Date(year, month, day);
        const maxDateObj = new Date(maxDate);
        isDisabled = dayDate > maxDateObj;
      }

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => !isDisabled && handleDayClick(day)}
          disabled={isDisabled}
          className={`
            h-8 w-8 rounded-full flex items-center justify-center text-sm
            transition-all duration-200 active:scale-95 touch-manipulation
            ${
              isDisabled
                ? "text-slate-300 dark:text-slate-700 cursor-not-allowed"
                : isSelected
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
    <div>
      {label && (
        <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
          <Calendar size={18} className="text-blue-600 dark:text-blue-400" />
          {label}
        </label>
      )}

      <div className="relative">
        <input type="hidden" name="date" value={value} />

        <div
          onClick={() => !disabled && setShowDatePicker(true)}
          className={`
            w-full px-4 py-3 sm:py-4 pr-12 border-2 border-gray-300 dark:border-gray-600 
            rounded-xl transition-all bg-white dark:bg-gray-800 
            text-gray-900 dark:text-white font-medium text-base
            ${
              disabled
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer hover:border-gray-400 dark:hover:border-gray-500"
            }
            flex items-center
          `}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !disabled) {
              setShowDatePicker(true);
            }
          }}>
          <span className="flex-1">
            {value ? formatDate(value) : "Pilih tanggal..."}
          </span>
          <Calendar
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
            size={20}
          />
        </div>
      </div>

      {showInfo && infoText && (
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          {infoText}
        </p>
      )}

      {/* CUSTOM DATE PICKER MODAL */}
      {showDatePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                  Pilih Tanggal
                </h3>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                  aria-label="Tutup">
                  ✕
                </button>
              </div>

              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
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
                  type="button"
                  onClick={handleNextMonth}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                  aria-label="Bulan selanjutnya">
                  →
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="p-4">
              <div className="grid grid-cols-7 gap-1 mb-4">
                {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map(
                  (day, idx) => (
                    <div
                      key={idx}
                      className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 py-1">
                      {day}
                    </div>
                  )
                )}
                {renderCalendar()}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={handleToday}
                className="w-full mb-3 px-4 py-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg font-medium hover:bg-blue-200 dark:hover:bg-blue-800/50 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2">
                <span className="text-base">📅</span>
                <span>Hari Ini</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex-1 px-3 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 transition-all duration-200 flex items-center justify-center gap-1">
                  <span className="text-sm">🗑️</span>
                  <span className="text-xs sm:text-sm">Hapus</span>
                </button>

                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 px-3 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 transition-all duration-200 flex items-center justify-center gap-1">
                  <span className="text-sm">↩️</span>
                  <span className="text-xs sm:text-sm">Batal</span>
                </button>

                <button
                  type="button"
                  onClick={handleSetDate}
                  className="flex-1 px-3 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium active:scale-95 transition-all duration-200 flex items-center justify-center gap-1">
                  <span className="text-sm">✓</span>
                  <span className="text-xs sm:text-sm">Pilih</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDatePicker;
