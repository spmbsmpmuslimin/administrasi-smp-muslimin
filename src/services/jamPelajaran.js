// utils/jamPelajaran.js
// Batch 2 -- versi baru. JAM_SCHEDULE hardcode DIHAPUS dari sini (sumber
// data sekarang period_schedules via jamPelajaranService.js). File ini
// cuma nyisain 2 fungsi MURNI (terima JAM_SCHEDULE sebagai parameter,
// bukan baca konstanta global) sesuai section 3 dokumentasi -- supaya
// bisa dipakai baik dari JamPelajaranProvider maupun ditest terpisah
// tanpa perlu mocking context/Supabase.
//
// CATATAN: kalau utils/jamPelajaran.js versi LAMA di project ini punya
// signature beda (mis. getAvailablePeriods(day) baca JAM_SCHEDULE
// global, atau urutan parameter findPeriod beda), kabarin -- lebih aman
// upload file lama itu dulu biar gue samain persis, daripada
// konsumennya (KelolaJadwalPelajaran.js dkk) kudu ikut diubah manggilnya.

// Jam pelajaran mana aja di hari ini yang BISA diisi mapel/guru,
// diurutkan dari jam ke-1 s/d terakhir. JAM_SCHEDULE di sini diasumsikan
// SUDAH cuma berisi period pelajaran (istirahat dipisah di
// jamPelajaranService.js sebelum sampai ke fungsi ini) -- jadi gak perlu
// filter session_type di sini lagi.
export function getAvailablePeriods(JAM_SCHEDULE, day) {
  const periods = JAM_SCHEDULE[day] || {};
  return Object.keys(periods)
    .filter((p) => !!periods[p]?.start) // skip period yang emang gak ada di hari ini (mis. Jumat jam ke-8/9)
    .sort((a, b) => Number(a) - Number(b));
}

// Cari nomor period berdasarkan (day, start_time, end_time) mentah dari
// class_schedules/teacher_schedules. start/end dipotong ke "HH:MM" biar
// cocok sama format JAM_SCHEDULE (Supabase balikin "HH:MM:SS").
// Balikin null kalau gak ketemu kombinasi (day, start, end) yang cocok.
export function findPeriod(JAM_SCHEDULE, day, start_time, end_time) {
  const periods = JAM_SCHEDULE[day];
  if (!periods || !start_time || !end_time) return null;

  const s = start_time.slice(0, 5);
  const e = end_time.slice(0, 5);

  const found = Object.entries(periods).find(([, range]) => range.start === s && range.end === e);
  return found ? found[0] : null;
}
