// src/services/holidayService.js
// ========================================
// 🎯 LIBUR NASIONAL — OTOMATIS SESUAI TAHUN AJARAN AKTIF
// ========================================
// Tahun ajaran aktif (misal "2026/2027") mencakup rentang tanggal
// Juli 2026 - Juni 2027 (dari kolom start_date/end_date semester 1 & 2
// di tabel academic_years). Fungsi di sini narik NATIONAL_HOLIDAYS
// (src/services/nationalHolidays.js) lalu nyaring cuma yang jatuh di
// rentang itu — jadi kalau tahun ajaran ganti, hasilnya otomatis
// ikut ganti tanpa perlu edit kode di file mana pun.

import { getActiveAcademicYear } from "./academicYearService";
import { NATIONAL_HOLIDAYS, getHolidaysInRange } from "./nationalHolidays";

// Ambil object { "YYYY-MM-DD": "Nama Libur" } yang relevan buat tahun ajaran aktif.
// Kalau gagal ambil tahun ajaran aktif (misal belum ada yang di-set aktif),
// fallback ke SEMUA data libur (NATIONAL_HOLIDAYS) biar tetap aman dipakai.
export const getActiveYearHolidays = async () => {
  try {
    const activeYear = await getActiveAcademicYear();

    if (!activeYear || !activeYear.semesters || activeYear.semesters.length === 0) {
      console.warn(
        "⚠️ [holidayService] Tidak ada tahun ajaran aktif — fallback ke semua data libur"
      );
      return NATIONAL_HOLIDAYS;
    }

    const startDates = activeYear.semesters.map((s) => s.start_date).filter(Boolean);
    const endDates = activeYear.semesters.map((s) => s.end_date).filter(Boolean);

    if (startDates.length === 0 || endDates.length === 0) {
      console.warn(
        "⚠️ [holidayService] Semester aktif tidak punya start_date/end_date — fallback ke semua data libur"
      );
      return NATIONAL_HOLIDAYS;
    }

    const rangeStart = startDates.sort()[0];
    const rangeEnd = endDates.sort().slice(-1)[0];

    return getHolidaysInRange(rangeStart, rangeEnd);
  } catch (error) {
    console.error("Exception in getActiveYearHolidays:", error);
    return NATIONAL_HOLIDAYS;
  }
};

// Shortcut: cek satu tanggal terhadap libur tahun ajaran aktif aja.
// Return nama liburnya (string) atau null.
export const isHolidayInActiveYear = async (dateStr) => {
  const holidays = await getActiveYearHolidays();
  return holidays[dateStr] || null;
};
