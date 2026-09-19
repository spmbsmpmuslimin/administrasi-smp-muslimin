// src/e-raport/eraportLabels.js
// Satu-satunya tempat nama/judul jenis laporan E-Raport internal.
//
// Konteks (Sep 2026): E-Raport internal sekarang KHUSUS laporan TENGAH
// SEMESTER. Rapor akhir semester (ganjil & genap) sudah pakai aplikasi
// e-rapor resmi dari dinas, jadi modul ini gak lagi ngeluarin rapor akhir.
// Isi laporan & alur input (manual) sama persis kayak sebelumnya, yang
// beda cuma penamaan/waktu penerbitannya. Pemilihan semester (Ganjil/Genap)
// TETAP ada -- tiap semester punya 1 laporan tengah semester.
//
// Kalau nanti butuh ganti wording (misal jadi "PTS"), cukup ubah di sini.

export const REPORT_NAME = "Rapor Tengah Semester";
export const REPORT_TITLE = "LAPORAN HASIL BELAJAR TENGAH SEMESTER";
export const REPORT_FILE_PREFIX = "RAPOR_TENGAH_SEMESTER";
