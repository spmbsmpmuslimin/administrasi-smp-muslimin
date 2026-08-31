// utils/jamPelajaran.js
// SATU-SATUNYA sumber kebenaran untuk jam pelajaran (JAM_SCHEDULE) yang
// dipakai di seluruh aplikasi: KelolaJadwalPelajaran.js (wali kelas),
// AdminJadwalMassal.js (admin, import massal dari kode wakasek), dan
// StudentJadwal.js (baca dari class_schedules yang udah punya start_time/
// end_time sendiri, jadi gak butuh util ini langsung).
//
// Kalau jam sekolah berubah tahun ajaran depan, cukup update di SINI saja.

export const JAM_SCHEDULE = {
  Senin: {
    1: { start: "06:30", end: "07:50" }, // upacara, biasanya gak ada kode mapel
    2: { start: "07:50", end: "08:30" },
    3: { start: "08:30", end: "09:10" },
    4: { start: "09:10", end: "09:50" },
    5: { start: "10:30", end: "11:05" },
    6: { start: "11:05", end: "11:40" },
    7: { start: "11:40", end: "12:15" },
    8: { start: "13:00", end: "13:35" },
    9: { start: "13:35", end: "14:10" },
  },
  Selasa: {
    1: { start: "07:00", end: "07:40" },
    2: { start: "07:40", end: "08:20" },
    3: { start: "08:20", end: "09:00" },
    4: { start: "09:00", end: "09:40" },
    5: { start: "10:30", end: "11:05" },
    6: { start: "11:05", end: "11:40" },
    7: { start: "11:40", end: "12:15" },
    8: { start: "13:00", end: "13:35" },
    9: { start: "13:35", end: "14:10" },
  },
  Rabu: {
    1: { start: "07:00", end: "07:40" },
    2: { start: "07:40", end: "08:20" },
    3: { start: "08:20", end: "09:00" },
    4: { start: "09:00", end: "09:40" },
    5: { start: "10:30", end: "11:05" },
    6: { start: "11:05", end: "11:40" },
    7: { start: "11:40", end: "12:15" },
    8: { start: "13:00", end: "13:35" },
    9: { start: "13:35", end: "14:10" },
  },
  Kamis: {
    1: { start: "07:00", end: "07:40" },
    2: { start: "07:40", end: "08:20" },
    3: { start: "08:20", end: "09:00" },
    4: { start: "09:00", end: "09:40" },
    5: { start: "10:30", end: "11:05" },
    6: { start: "11:05", end: "11:40" },
    7: { start: "11:40", end: "12:15" },
    8: { start: "13:00", end: "13:35" },
    9: { start: "13:35", end: "14:10" },
  },
  Jumat: {
    1: { start: "06:30", end: "07:05" },
    2: { start: "07:05", end: "07:40" },
    3: { start: "07:40", end: "08:10" },
    4: { start: "08:10", end: "08:40" },
    5: { start: "08:40", end: "09:10" },
    6: { start: "09:40", end: "10:10" },
    7: { start: "10:10", end: "10:40" },
    8: { start: "", end: "" },
    9: { start: "", end: "" },
  },
};

export const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];
export const ALL_PERIODS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function getAvailablePeriods(day) {
  const daySchedule = JAM_SCHEDULE[day] || {};
  return ALL_PERIODS.filter((p) => daySchedule[p]?.start);
}

// Cari periode ke berapa dari start_time/end_time yang tersimpan di DB
// (format "HH:MM:SS"), dicocokin ke JAM_SCHEDULE (format "HH:MM").
export function findPeriod(day, startTime, endTime) {
  const daySchedule = JAM_SCHEDULE[day];
  if (!daySchedule || !startTime || !endTime) return null;
  const s = startTime.slice(0, 5);
  const e = endTime.slice(0, 5);
  const found = Object.entries(daySchedule).find(
    ([, range]) => range.start === s && range.end === e
  );
  return found ? found[0] : null;
}
