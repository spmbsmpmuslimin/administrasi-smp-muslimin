// services/jamPelajaranService.js
// Batch 2 dari migrasi Jam Pelajaran (JAM_SCHEDULE hardcode -> DB).
// Fetch dari tabel `period_schedules` (lihat migration_add_period_schedules_v2.sql)
// untuk 1 academic_year_id, lalu bentuk ulang jadi 2 shape:
//
//   - JAM_SCHEDULE: HANYA baris session_type = 'pelajaran'. Shape PERSIS
//     sama kayak JAM_SCHEDULE hardcode lama di utils/jamPelajaran.js --
//     { Senin: { "1": { start, end, label }, "2": {...}, ... }, ... }.
//     Istirahat SENGAJA gak ikut masuk sini. Ini penting karena
//     JAM_SCHEDULE dipakai getAvailablePeriods()/ALL_PERIODS buat
//     nge-generate Template Excel & dropdown assign guru (lihat
//     useJadwalMassalLogic.js baris ~530) -- kalau istirahat ikut,
//     admin bakal disuruh isi kode guru buat slot istirahat.
//
//   - BREAK_SCHEDULE: baris session_type = 'istirahat' aja, shape sama
//     -- { Senin: { "I1": {...}, "I2": {...} }, ... }. Belum dipake
//     konsumen manapun sekarang (KelolaJadwalPelajaran.js,
//     useJadwalMassalLogic.js, AdminJadwalMassal.js semua cuma butuh
//     JAM_SCHEDULE). Disiapin buat UI masa depan yang mau nampilin
//     jeda istirahat di grid (mis. halaman "Kelola Jam Pelajaran").
import { supabase } from "../supabaseClient";
import { getActiveSemesterId } from "./academicYearService";

export async function fetchJamPelajaran(academicYearId) {
  if (!academicYearId) {
    return { JAM_SCHEDULE: {}, BREAK_SCHEDULE: {} };
  }

  const { data, error } = await supabase
    .from("period_schedules")
    .select("day, period, start_time, end_time, label, session_type")
    .eq("academic_year_id", academicYearId)
    .order("start_time", { ascending: true });

  if (error) throw error;

  const JAM_SCHEDULE = {};
  const BREAK_SCHEDULE = {};

  (data || []).forEach((row) => {
    // Supabase balikin time sebagai "HH:MM:SS" -- dipotong jadi "HH:MM"
    // biar identik sama format JAM_SCHEDULE hardcode lama (dipakai buat
    // label jam & buat isi kolom Excel template).
    const entry = {
      start: row.start_time ? row.start_time.slice(0, 5) : "",
      end: row.end_time ? row.end_time.slice(0, 5) : "",
      label: row.label || null,
    };

    const target = row.session_type === "istirahat" ? BREAK_SCHEDULE : JAM_SCHEDULE;
    if (!target[row.day]) target[row.day] = {};
    target[row.day][row.period] = entry;
  });

  return { JAM_SCHEDULE, BREAK_SCHEDULE };
}

// Resolve academic_year_id yang lagi aktif. Dipakai JamPelajaranProvider
// kalau gak dikasih academicYearId eksplisit lewat prop, biar provider
// bisa langsung dipasang tanpa perlu tau gimana academicYearService.js
// nyimpen/nentuin active year di tempat lain -- provider cuma tau
// "jamPelajaranService bisa resolve active year id", bukan detail
// implementasinya. Makanya function ini dipertahankan sebagai wrapper
// di sini (bukan JamPelajaranProvider import academicYearService
// langsung), tapi implementasinya sendiri didelegasikan ke
// academicYearService.getActiveSemesterId() biar gak duplikat query
// `is_active` + gak ketinggalan kalau logic auto-fix/fallback-nya
// (lihat getActiveAcademicYear()) berubah di masa depan.
export async function fetchActiveAcademicYearId() {
  return getActiveSemesterId();
}

// ========================================
// Fungsi ADMIN buat halaman "Kelola Jam Pelajaran" (CRUD period_schedules).
// Beda dari fetchJamPelajaran() di atas: fungsi-fungsi ini kerja dengan
// baris MENTAH (termasuk istirahat, gak dipisah ke 2 shape), soalnya
// halaman admin perlu edit dua-duanya sekaligus dalam 1 grid per hari.
// ========================================

// Ambil semua baris period_schedules 1 academic_year_id apa adanya (raw),
// diurutkan per hari lalu per start_time -- dipakai buat ngisi grid
// editor. Beda sama fetchJamPelajaran() yang udah di-transform jadi
// shape { day: { period: {...} } } dan misahin istirahat.
export async function fetchRawPeriodSchedules(academicYearId) {
  if (!academicYearId) return [];

  const { data, error } = await supabase
    .from("period_schedules")
    .select("id, day, period, start_time, end_time, session_type, label")
    .eq("academic_year_id", academicYearId)
    .order("day", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) throw error;

  // Potong "HH:MM:SS" -> "HH:MM" biar pas dipasangin ke <input type="time">.
  return (data || []).map((row) => ({
    ...row,
    start_time: row.start_time ? row.start_time.slice(0, 5) : "",
    end_time: row.end_time ? row.end_time.slice(0, 5) : "",
    label: row.label || "",
  }));
}

// Simpan seluruh grid 1 academic_year_id sekaligus. Strategi: hapus semua
// baris lama punya academic_year_id ini, lalu insert ulang baris yang
// dikirim -- lebih simpel & aman daripada diffing per baris (gak ada FK
// dari tabel lain ke period_schedules.id, jadi aman di-generate ulang).
// `rows` isinya [{ day, period, start_time, end_time, session_type, label }]
// -- validasi (end>start, no overlap, dst) dilakukan di komponen SEBELUM
// manggil fungsi ini.
export async function savePeriodSchedules(academicYearId, rows) {
  if (!academicYearId) throw new Error("academicYearId wajib diisi");

  const { error: delError } = await supabase
    .from("period_schedules")
    .delete()
    .eq("academic_year_id", academicYearId);

  if (delError) throw delError;

  if (rows.length === 0) return { inserted: 0 };

  const payload = rows.map((r) => ({
    academic_year_id: academicYearId,
    day: r.day,
    period: r.period,
    start_time: r.start_time || null,
    end_time: r.end_time || null,
    session_type: r.session_type,
    label: r.label || null,
  }));

  const { error: insError } = await supabase.from("period_schedules").insert(payload);
  if (insError) throw insError;

  return { inserted: payload.length };
}

// Salin seluruh period_schedules dari 1 academic_year_id (semester) ke
// academic_year_id lain. `overwrite: true` (default) hapus dulu baris
// yang udah ada di target sebelum nyalin -- dipakai tombol "Salin dari
// Semester Lain" di halaman Kelola Jam Pelajaran.
export async function copyPeriodSchedules(sourceYearId, targetYearId, { overwrite = true } = {}) {
  if (!sourceYearId || !targetYearId) throw new Error("sourceYearId & targetYearId wajib diisi");
  if (sourceYearId === targetYearId) throw new Error("Semester sumber & tujuan gak boleh sama");

  const sourceRows = await fetchRawPeriodSchedules(sourceYearId);
  if (sourceRows.length === 0) {
    return { copied: 0, message: "Semester sumber belum punya data jam pelajaran." };
  }

  if (overwrite) {
    const { error: delError } = await supabase
      .from("period_schedules")
      .delete()
      .eq("academic_year_id", targetYearId);
    if (delError) throw delError;
  }

  const payload = sourceRows.map((r) => ({
    academic_year_id: targetYearId,
    day: r.day,
    period: r.period,
    start_time: r.start_time || null,
    end_time: r.end_time || null,
    session_type: r.session_type,
    label: r.label || null,
  }));

  const { error: insError } = await supabase.from("period_schedules").insert(payload);
  if (insError) throw insError;

  return { copied: payload.length };
}
