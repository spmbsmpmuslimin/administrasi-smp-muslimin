// utils/studentDevices.js
//
// Fungsi buat nyatet & ngambil daftar device yang pernah dipake siswa
// buat login, disimpen di tabel Supabase `student_devices`
// (lihat student_devices.sql buat bikin tabelnya).
//
// PENTING (baca sebelum pakai tombol Hapus di UI):
// Tombol "Hapus" cuma ngapus BARIS RIWAYAT device ini dari database.
// Ini BUKAN "paksa logout jarak jauh" — karena sistem login siswa di
// app ini gak pake token sesi per-device yang bisa di-revoke dari
// server (session cuma disimpen di localStorage/cookie browser siswa
// sendiri, lihat studentSession.js). Kalau device itu masih login, dia
// akan tetap login sampai dia logout sendiri atau clear data browser.
// Yang dihapus di sini murni catatan riwayatnya doang.

import { supabase } from "../supabaseClient";
import { detectDeviceInfo, getOrCreateDeviceId } from "./deviceInfo";

/**
 * Dipanggil sekali setiap kali siswa berhasil login. Nyatet/update
 * baris device ini di tabel student_devices (upsert berdasarkan
 * student_id + device_id, jadi device yang sama gak akan dobel-dobel,
 * cuma di-update waktu login-nya / last_login_at).
 *
 * Sengaja didesain buat gak pernah nge-throw ke pemanggilnya — kalau
 * gagal, cuma di-log ke console, biar gagal nyatet device gak sampe
 * ngeblok proses login siswa yang lagi jalan.
 */
export async function recordDeviceLogin(studentId) {
  try {
    const deviceId = getOrCreateDeviceId();
    const { brand, model, platform, browser } = await detectDeviceInfo();

    const { error } = await supabase.from("student_devices").upsert(
      {
        student_id: studentId,
        device_id: deviceId,
        brand,
        model,
        platform,
        browser,
        last_login_at: new Date().toISOString(),
      },
      { onConflict: "student_id,device_id" }
    );

    if (error) {
      console.error("[studentDevices] Gagal nyatet device login:", error);
    }
  } catch (err) {
    console.error("[studentDevices] recordDeviceLogin error:", err);
  }
}

/** Ambil semua device yang pernah dipake siswa ini, terbaru duluan. */
export async function getStudentDevices(studentId) {
  const { data, error } = await supabase
    .from("student_devices")
    .select("*")
    .eq("student_id", studentId)
    .order("last_login_at", { ascending: false });

  if (error) {
    console.error("[studentDevices] Gagal ambil daftar device:", error);
    return [];
  }

  return data || [];
}

/**
 * ✅ BARU: Ambil SEMUA device dari SEMUA siswa (buat halaman monitoring
 * admin di Setting -> Active Users -> tab "Perangkat Siswa"), terbaru
 * duluan, digabung sama data siswa pemiliknya (nama/nis/kelas) biar
 * admin gampang identifikasi ini device punya siswa siapa.
 *
 * Setiap item hasil punya bentuk: { ...kolom student_devices, student }
 * dimana `student` adalah { id, full_name, nis, class_id, academic_year }
 * dari tabel `students` (kolom ini dikonfirmasi dari StudentLogin.js,
 * relasi student_devices.student_id -> students.id), atau null kalau
 * siswanya gak ketemu / udah kehapus.
 */
export async function getAllStudentDevices() {
  try {
    const { data: devices, error } = await supabase
      .from("student_devices")
      .select("*")
      .order("last_login_at", { ascending: false, nullsFirst: false });

    if (error) throw error;
    if (!devices || devices.length === 0) return [];

    const studentIds = [...new Set(devices.map((d) => d.student_id))];

    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("id, full_name, nis, class_id, academic_year")
      .in("id", studentIds);

    if (studentsError) {
      // Gak throw -- tetep balikin data device meski data siswa gagal
      // diambil, biar admin tetep bisa liat & hapus riwayat device.
      console.error("[studentDevices] Gagal ambil data siswa buat digabung:", studentsError);
    }

    const studentMap = {};
    (students || []).forEach((s) => {
      studentMap[s.id] = s;
    });

    return devices.map((d) => ({
      ...d,
      student: studentMap[d.student_id] || null,
    }));
  } catch (err) {
    console.error("[studentDevices] getAllStudentDevices error:", err);
    return [];
  }
}

/** Hapus satu baris riwayat device (lihat catatan penting di atas file ini). */
export async function deleteStudentDevice(rowId) {
  const { error } = await supabase.from("student_devices").delete().eq("id", rowId);

  if (error) {
    console.error("[studentDevices] Gagal hapus device:", error);
    return false;
  }
  return true;
}

export { getOrCreateDeviceId };
