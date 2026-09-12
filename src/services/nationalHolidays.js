// src/services/nationalHolidays.js
// ========================================
// 🗓️ SUMBER TUNGGAL DATA LIBUR NASIONAL
// ========================================
// Sumber: Keputusan Bersama (SKB) 3 Menteri
// Last update: Desember 2024
// ⚠️ Data tahun yang masih ditandai "(prediksi)" WAJIB diupdate
//    setelah SKB resmi tahun tsb terbit.
// ⚠️ Ini SATU-SATUNYA tempat daftar libur nasional disimpan.
//    Jangan copy-paste object ini ke file lain — import dari sini.
//
// File ini TIDAK tau soal tahun ajaran aktif. Untuk ambil libur yang
// relevan sama tahun ajaran yang lagi jalan, pakai getActiveYearHolidays()
// di src/services/holidayService.js.

export const NATIONAL_HOLIDAYS = {
  // ===== 2025 =====
  "2025-01-01": "Tahun Baru Masehi",
  "2025-01-25": "Tahun Baru Imlek 2576",
  "2025-03-02": "Isra Miraj Nabi Muhammad SAW",
  "2025-03-12": "Hari Raya Nyepi (Tahun Baru Saka 1947)",
  "2025-03-31": "Idul Fitri 1446 H",
  "2025-04-01": "Idul Fitri 1446 H",
  "2025-04-18": "Wafat Yesus Kristus (Jumat Agung)",
  "2025-05-01": "Hari Buruh Internasional",
  "2025-05-29": "Kenaikan Yesus Kristus",
  "2025-06-07": "Idul Adha 1446 H",
  "2025-06-28": "Tahun Baru Islam 1447 H",
  "2025-08-17": "Hari Kemerdekaan RI",
  "2025-09-05": "Maulid Nabi Muhammad SAW",
  "2025-12-25": "Hari Raya Natal",

  // ===== 2026 =====
  "2026-01-01": "Tahun Baru Masehi",
  "2026-01-16": "Isra Mi'raj Nabi Muhammad SAW",
  "2026-02-17": "Tahun Baru Imlek 2577",
  "2026-03-19": "Hari Suci Nyepi (Tahun Baru Saka 1948)",
  "2026-03-21": "Idul Fitri 1447 H",
  "2026-03-22": "Idul Fitri 1447 H",
  "2026-04-03": "Wafat Yesus Kristus (Jumat Agung)",
  "2026-04-05": "Hari Paskah",
  "2026-05-01": "Hari Buruh Internasional",
  "2026-05-14": "Kenaikan Yesus Kristus",
  "2026-05-27": "Idul Adha 1447 H",
  "2026-05-31": "Hari Raya Waisak 2570 BE",
  "2026-06-01": "Hari Lahir Pancasila",
  "2026-06-16": "Tahun Baru Islam 1448 H",
  "2026-08-17": "Hari Kemerdekaan RI",
  "2026-08-25": "Maulid Nabi Muhammad SAW",
  "2026-12-25": "Hari Raya Natal",

  // ===== 2027 (PREDIKSI) =====
  // ⚠️ UPDATE setelah SKB 2027 resmi keluar!
  "2027-01-01": "Tahun Baru Masehi",
  "2027-01-05": "Isra Mi'raj Nabi Muhammad SAW (prediksi)",
  "2027-02-06": "Tahun Baru Imlek 2578 (prediksi)",
  "2027-03-09": "Hari Suci Nyepi (Tahun Baru Saka 1949)",
  "2027-03-10": "Idul Fitri 1448 H (prediksi)",
  "2027-03-11": "Idul Fitri 1448 H (prediksi)",
  "2027-03-26": "Wafat Yesus Kristus (Jumat Agung)",
  "2027-03-28": "Hari Paskah",
  "2027-05-01": "Hari Buruh Internasional",
  "2027-05-06": "Kenaikan Yesus Kristus",
  "2027-05-16": "Idul Adha 1448 H (prediksi)",
  "2027-05-20": "Hari Raya Waisak 2571 BE",
  "2027-06-01": "Hari Lahir Pancasila",
  "2027-06-06": "Tahun Baru Islam 1449 H (prediksi)",
  "2027-08-14": "Maulid Nabi Muhammad SAW (prediksi)",
  "2027-08-17": "Hari Kemerdekaan RI",
  "2027-12-25": "Hari Raya Natal",
};

// Cek apakah satu tanggal (format "YYYY-MM-DD") libur nasional.
// Return nama liburnya (string) kalau iya, atau null kalau bukan.
export const isNationalHoliday = (dateStr) => {
  return NATIONAL_HOLIDAYS[dateStr] || null;
};

// Ambil semua libur nasional yang jatuh di antara startDate & endDate
// (inclusive). startDate/endDate boleh string "YYYY-MM-DD" atau Date object.
export const getHolidaysInRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  return Object.entries(NATIONAL_HOLIDAYS).reduce((acc, [dateStr, name]) => {
    const d = new Date(dateStr + "T00:00:00");
    if (d >= start && d <= end) {
      acc[dateStr] = name;
    }
    return acc;
  }, {});
};
