// Sesuaikan path import supabase client ini dengan yang dipakai
// file service lain di project (contoh: jadwalPengawasSupabase.js)
import { supabase } from "../supabaseClient";

/**
 * getJenisUjianAktif
 * -------------------
 * Ambil daftar jenis ujian (PSAS/PSAT/PSAJ) yang sedang guru ini
 * panitiai DAN ujiannya sedang berlangsung (status aktif di kedua sisi).
 * Sumber: view v_panitia_ujian_aktif (join ujian_kepanitiaan + ujian).
 *
 * @param {string} guruId - users.id
 * @returns {Promise<{ jenis: string, ujianId: string }[]>}
 */
export async function getJenisUjianAktif(guruId) {
  if (!guruId) return [];

  const { data, error } = await supabase
    .from("v_panitia_ujian_aktif")
    .select("jenis, ujian_id")
    .eq("guru_id", guruId);

  if (error) {
    console.error("getJenisUjianAktif error:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    jenis: row.jenis,
    ujianId: row.ujian_id,
  }));
}

/**
 * isPanitiaAktif
 * ---------------
 * Cek cepat: apakah guru ini punya minimal 1 tugas panitia aktif
 * sekarang? Dipakai routing gate untuk memutuskan portal-ujian/
 * vs setting/kelola-ujian/ (atau tidak menampilkan menu sama sekali).
 *
 * @param {string} guruId
 * @returns {Promise<boolean>}
 */
export async function isPanitiaAktif(guruId) {
  const jenisUjianAktif = await getJenisUjianAktif(guruId);
  return jenisUjianAktif.length > 0;
}
