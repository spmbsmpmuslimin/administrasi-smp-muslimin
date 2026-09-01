// [file name]: config/ruangBelajarAccess.js
// Whitelist sementara buat uji coba akses "Kelola Ruang Belajar" ke non-admin.
// Saat ini di-hardcode by user id. Kalau nanti mau expand ke lebih banyak
// walikelas dan males edit code tiap kali, bisa dipindah ke kolom DB
// (misal `can_manage_ruang_belajar` boolean di tabel users) — tinggal ganti
// isi 2 function di bawah ini, semua pemanggil (App.js, Sidebar, BottomNav)
// otomatis ikut tanpa perlu diubah.

export const RUANG_BELAJAR_ALLOWED_USER_IDS = [
  "1ebde390-aa49-41c1-bd3c-665f1662e80a", // Elan Jaelani - Wali Kelas 7B
];

// Dipakai buat proteksi route (ProtectedRoute di App.js).
// Admin tetap boleh akses langsung via URL, cuma ga muncul di menu (lihat di bawah).
export function canAccessRuangBelajarRoute(userRole, userId) {
  return (
    userRole === "admin" || RUANG_BELAJAR_ALLOWED_USER_IDS.includes(userId)
  );
}

// Dipakai buat nampilin/nyembunyiin menu (Sidebar & BottomNav).
// Sengaja TIDAK include admin, karena admin mau di-hide dari menu ini.
export function shouldShowRuangBelajarMenu(userId) {
  return RUANG_BELAJAR_ALLOWED_USER_IDS.includes(userId);
}
