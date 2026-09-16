// setting/kelola-ujian/presensiBeritaAcaraSupabase.js
// Layer data untuk sub-fitur "Presensi, Berita Acara & Laporan".
//
// PENTING: ini BUKAN presensi digital (bukan checklist hadir/tidak yang
// disimpan ke database). Keluarannya PDF form KOSONG (Daftar Hadir &
// Berita Acara) yang dicetak, lalu peserta/pengawas tanda tangan MANUAL
// di kertas -- sama seperti kebiasaan cek kehadiran ujian di sekolah.
//
// Makanya sub-fitur ini TIDAK butuh tabel baru di database. Semua data
// yang perlu (peserta per ruangan, jadwal sesi, siapa pengawasnya) udah
// ada dari sub-fitur "Jadwal & Pembagian Ruangan" dan "Peserta &
// Pengawas" -- di sini cuma reuse & sedikit reshape biar gampang dipakai
// generator PDF-nya.

import { ambilPengawasUntukJadwal } from "../jadwal-pengawas/jadwalPengawasSupabase";

/**
 * Ambil daftar pengawas untuk 1 sesi jadwal, dikelompokkan per ruangan --
 * dipakai buat PRE-FILL nama pengawas di form Berita Acara (admin nggak
 * perlu ngetik ulang manual; pengawas tinggal cetak & tanda tangan).
 * Ruangan yang belum ada pengawasnya (belum diatur di "Jadwal &
 * Pengawas") nggak akan punya entry di sini -- caller yang nge-handle
 * fallback-nya (baris kosong buat ditulis tangan).
 *
 * @param {object} supabase
 * @param {string} jadwalId
 * @returns {Promise<Object>} { [nomor_ruangan]: [{ guru_id, nama }] }
 */
async function ambilPengawasPerRuangan(supabase, jadwalId) {
  const semua = await ambilPengawasUntukJadwal(supabase, jadwalId);
  const perRuangan = {};
  semua.forEach((p) => {
    if (!perRuangan[p.nomor_ruangan]) perRuangan[p.nomor_ruangan] = [];
    perRuangan[p.nomor_ruangan].push({ guru_id: p.guru_id, nama: p.nama });
  });
  return perRuangan;
}

export { ambilPengawasPerRuangan };
