// setting/kelola-ujian/anggaranBiayaSupabase.js
// Data layer untuk sub-fitur "Anggaran & Biaya" -- catat rencana anggaran
// & realisasi biaya per pos (mis. ATK, konsumsi, honor pengawas, dst)
// untuk 1 ujian (kombinasi jenisUjian + tahun ajaran, sama seperti
// sub-fitur lain -- lihat getOrCreateUjian di pembagianRuanganSupabase.js).
//
// Tabel: anggaran_ujian
//   id            uuid, PK
//   ujian_id      uuid, FK -> ujian.id
//   kategori      text   ("ATK", "Konsumsi", "Honor Pengawas", dst -- bebas diisi admin)
//   uraian        text   (rincian pos, mis. "Fotokopi soal 5 mapel")
//   anggaran      numeric (rencana biaya, rupiah)
//   realisasi     numeric (biaya aktual terpakai, rupiah, default 0)
//   keterangan    text, nullable
//   created_at    timestamptz, default now()

/**
 * Ambil semua pos anggaran untuk 1 ujian, urut dari yang paling lama
 * dibuat (FIFO) supaya urutan input konsisten tiap kali dibuka.
 */
async function ambilAnggaran(supabase, ujianId) {
  const { data, error } = await supabase
    .from("anggaran_ujian")
    .select("*")
    .eq("ujian_id", ujianId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Tambah 1 pos anggaran baru.
 */
async function tambahAnggaran(supabase, ujianId, pos) {
  const { data, error } = await supabase
    .from("anggaran_ujian")
    .insert({
      ujian_id: ujianId,
      kategori: pos.kategori,
      uraian: pos.uraian,
      anggaran: pos.anggaran || 0,
      realisasi: pos.realisasi || 0,
      keterangan: pos.keterangan || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update pos anggaran yang sudah ada (dipakai juga buat update cepat
 * kolom realisasi doang, misal pas admin isi "biaya aktual" setelah
 * belanja -- cukup kirim { realisasi: ... } di `perubahan`).
 */
async function updateAnggaran(supabase, posId, perubahan) {
  const { data, error } = await supabase
    .from("anggaran_ujian")
    .update(perubahan)
    .eq("id", posId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Hapus 1 pos anggaran.
 */
async function hapusAnggaran(supabase, posId) {
  const { error } = await supabase.from("anggaran_ujian").delete().eq("id", posId);
  if (error) throw error;
}

/**
 * Hitung ringkasan total anggaran vs realisasi vs sisa dari daftar pos
 * yang sudah diambil (murni fungsi hitung, tidak query DB lagi) --
 * dipakai buat kartu ringkasan di atas tabel.
 */
function hitungRingkasanAnggaran(daftarPos) {
  const totalAnggaran = daftarPos.reduce((sum, p) => sum + (Number(p.anggaran) || 0), 0);
  const totalRealisasi = daftarPos.reduce((sum, p) => sum + (Number(p.realisasi) || 0), 0);
  return {
    totalAnggaran,
    totalRealisasi,
    sisa: totalAnggaran - totalRealisasi,
  };
}

export { ambilAnggaran, tambahAnggaran, updateAnggaran, hapusAnggaran, hitungRingkasanAnggaran };
