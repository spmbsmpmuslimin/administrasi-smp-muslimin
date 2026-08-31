// utils/userDevices.js
//
// Fungsi buat nyatet & ngambil daftar device yang pernah dipake user
// (guru/staff/admin, dari tabel `users`) buat login, disimpen di tabel
// Supabase `user_devices` (perlu dibikin dulu, struktur sama kayak
// `student_devices` tapi kolomnya `user_id` bukan `student_id` --
// lihat user_devices.sql).
//
// CATATAN: ini file KHUSUS buat user aplikasi sekolah (guru/staff/admin
// yang login lewat tabel `users`). Kalau butuh tracking device siswa
// (tabel `students`), itu udah ada duluan di utils/studentDevices.js --
// jangan digabung, karena dua sistem login ini terpisah.
//
// PENTING (baca sebelum pakai tombol Hapus di UI):
// Tombol "Hapus" cuma ngapus BARIS RIWAYAT device ini dari database.
// Ini BUKAN "paksa logout jarak jauh" -- device yang masih login akan
// tetap login sampai dia logout sendiri atau clear data browser,
// kecuali sistem login user emang pake token sesi per-device yang bisa
// di-revoke dari server (cek dulu implementasi auth user sebelum janji
// fitur "paksa logout" ke siapapun).

import { supabase } from "../supabaseClient";
import { detectDeviceInfo, getOrCreateDeviceId } from "./deviceInfo";

/**
 * Dipanggil sekali setiap kali user (guru/staff/admin) berhasil login.
 * Nyatet/update baris device ini di tabel user_devices (upsert
 * berdasarkan user_id + device_id, jadi device yang sama gak akan
 * dobel-dobel, cuma di-update waktu login-nya / last_login_at).
 *
 * PENTING: fungsi ini baru kepake kalau dipanggil dari flow login
 * user (misal di halaman/handler Login.js atau AuthContext, abis
 * berhasil autentikasi). Belum otomatis ke-trigger di mana pun --
 * perlu di-wire manual di kode login yang udah ada.
 *
 * Sengaja didesain buat gak pernah nge-throw ke pemanggilnya -- kalau
 * gagal, cuma di-log ke console, biar gagal nyatet device gak sampe
 * ngeblok proses login yang lagi jalan.
 */
export async function recordDeviceLogin(userId) {
  try {
    const deviceId = getOrCreateDeviceId();
    const { brand, model, platform, browser } = await detectDeviceInfo();

    const { error } = await supabase.from("user_devices").upsert(
      {
        user_id: userId,
        device_id: deviceId,
        brand,
        model,
        platform,
        browser,
        last_login_at: new Date().toISOString(),
      },
      { onConflict: "user_id,device_id" }
    );

    if (error) {
      console.error("[userDevices] Gagal nyatet device login:", error);
    }
  } catch (err) {
    console.error("[userDevices] recordDeviceLogin error:", err);
  }
}

/** Ambil semua device yang pernah dipake satu user, terbaru duluan. */
export async function getUserDevices(userId) {
  const { data, error } = await supabase
    .from("user_devices")
    .select("*")
    .eq("user_id", userId)
    .order("last_login_at", { ascending: false });

  if (error) {
    console.error("[userDevices] Gagal ambil daftar device:", error);
    return [];
  }

  return data || [];
}

/**
 * Ambil SEMUA device dari SEMUA user (guru/staff) -- buat halaman
 * monitoring admin di Setting -> Active Users -> tab "Perangkat
 * Terhubung". Terbaru duluan, sekalian digabung sama data user
 * pemiliknya (nama/role/wali kelas) biar admin gampang identifikasi
 * device ini punya siapa.
 *
 * Setiap item hasil punya bentuk: { ...kolom user_devices, user }
 * dimana `user` adalah baris utuh dari tabel `users` (atau null kalau
 * user-nya gak ketemu / udah kehapus).
 */
export async function getAllUserDevices() {
  try {
    const { data: devices, error } = await supabase
      .from("user_devices")
      .select("*")
      .order("last_login_at", { ascending: false, nullsFirst: false });

    if (error) throw error;
    if (!devices || devices.length === 0) return [];

    const userIds = [...new Set(devices.map((d) => d.user_id))];

    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("*")
      .in("id", userIds);

    if (usersError) {
      // Gak throw -- tetep balikin data device meski data user gagal
      // diambil, biar admin tetep bisa liat & hapus riwayat device.
      console.error("[userDevices] Gagal ambil data user buat digabung:", usersError);
    }

    const userMap = {};
    (users || []).forEach((u) => {
      userMap[u.id] = u;
    });

    return devices.map((d) => ({
      ...d,
      user: userMap[d.user_id] || null,
    }));
  } catch (err) {
    console.error("[userDevices] getAllUserDevices error:", err);
    return [];
  }
}

/** Hapus satu baris riwayat device (lihat catatan penting di atas file ini). */
export async function deleteUserDevice(rowId) {
  const { error } = await supabase.from("user_devices").delete().eq("id", rowId);

  if (error) {
    console.error("[userDevices] Gagal hapus device:", error);
    return false;
  }
  return true;
}

export { getOrCreateDeviceId };
