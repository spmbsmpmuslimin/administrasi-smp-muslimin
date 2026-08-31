// src/constants.js
// ========================================================================
// Tempat nyimpen nama tabel/kolom Supabase yang dipake di LEBIH DARI 1
// file. Tujuannya: kalau nanti nama tabel di database berubah lagi
// (kayak kasus `pengumuman` -> `student_announcements` kemarin), cukup
// ubah di SATU tempat ini, gak perlu grep-replace manual di banyak file.
//
// Cara pake:
//   import { ANNOUNCEMENTS_TABLE } from "../constants";
//   supabase.from(ANNOUNCEMENTS_TABLE).select(...)
//
// Tambahin export baru di sini tiap kali ada nama tabel/kolom yang
// dipake di 2+ file — gak perlu buat semua tabel, cuma yang emang shared.
// ========================================================================

// Tabel pengumuman — dipake di StudentPengumuman.js (baca, sisi siswa)
// dan PengumumanWaliKelas.js (kelola, sisi wali kelas).
//
// CATATAN: PengumumanWaliKelas.js masih HARDCODE string "pengumuman_siswa"
// langsung di 4 query-nya (bukan pake konstanta ini) -- makanya nilai
// di sini WAJIB persis "pengumuman_siswa" biar dua-duanya nyambung ke
// tabel yang sama. Kalau nanti mau rename tabel lagi, inget update juga
// hardcoded string di PengumumanWaliKelas.js, bukan cuma di sini.
export const ANNOUNCEMENTS_TABLE = "pengumuman_siswa";
