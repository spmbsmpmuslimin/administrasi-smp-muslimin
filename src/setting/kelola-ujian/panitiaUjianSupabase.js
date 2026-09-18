// setting/kelola-ujian/panitiaUjianSupabase.js
// ========================================================================
// Helper Supabase untuk sub-fitur "Panitia Ujian" -- satu-satunya tempat
// di aplikasi ini yang BENERAN nulis ke tabel ujian_kepanitiaan (sebelum
// ini, tabel itu cuma dibaca lewat view v_panitia_ujian_aktif pas login,
// lihat portal-ujian/portalUjianSupabase.js -- gak ada UI buat isinya).
//
// Skema ujian_kepanitiaan (project Supabase enzohhulskcwniosqtnt):
//   id uuid pk, ujian_id uuid fk->ujian(id) cascade,
//   guru_id uuid fk->users(id) cascade,
//   status text check in ('aktif','nonaktif') default 'aktif',
//   created_at, updated_at
//   UNIQUE(ujian_id, guru_id)
//
// Guru yang di-nonaktifin TETAP disimpan barisnya (status='nonaktif'),
// BUKAN dihapus -- biar ada jejak histori siapa aja yang pernah jadi
// panitia, dan biar toggle balik gampang (tinggal upsert status lagi).
// ========================================================================

/**
 * Ambil semua guru yang ELIGIBLE jadi panitia ujian -- role teacher,
 * guru_bk, atau petugas_perpus (samain persis sama allowedRoles route
 * /portal-ujian di config/menuConfig.js), yang masih aktif.
 *
 * @param {object} supabase
 * @returns {Promise<{id:string, full_name:string, username:string, role:string}[]>}
 */
export async function ambilGuruEligiblePanitia(supabase) {
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, username, role")
    .in("role", ["teacher", "guru_bk", "petugas_perpus"])
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Ambil daftar panitia (semua status, aktif & nonaktif) untuk 1 ujian
 * tertentu -- dipakai buat nandain checkbox mana yang udah aktif di UI.
 *
 * @param {object} supabase
 * @param {string} ujianId
 * @returns {Promise<{guru_id:string, status:string}[]>}
 */
export async function ambilPanitiaUjian(supabase, ujianId) {
  if (!ujianId) return [];

  const { data, error } = await supabase
    .from("ujian_kepanitiaan")
    .select("guru_id, status")
    .eq("ujian_id", ujianId);

  if (error) throw error;
  return data ?? [];
}

/**
 * Set status panitia 1 guru untuk 1 ujian (upsert -- kalau baris
 * ujian_id+guru_id belum ada, dibikin baru; kalau udah ada, status-nya
 * ditimpa). Ini yang dipanggil pas admin klik/toggle checkbox di UI.
 *
 * @param {object} supabase
 * @param {string} ujianId
 * @param {string} guruId
 * @param {boolean} aktif - true = jadikan panitia aktif, false = nonaktifkan
 */
export async function setPanitiaUjian(supabase, ujianId, guruId, aktif) {
  const { error } = await supabase.from("ujian_kepanitiaan").upsert(
    {
      ujian_id: ujianId,
      guru_id: guruId,
      status: aktif ? "aktif" : "nonaktif",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "ujian_id,guru_id" }
  );

  if (error) throw error;
}
