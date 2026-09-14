// setting/kelola-ujian/jadwalPengawasSupabase.js
// Service layer untuk sub-fitur "Jadwal & Pengawas" di Manajemen Ujian.
// Tabel yang dipakai: `ujian_jadwal` (sesi ujian per mapel) dan
// `ujian_pengawas` (penugasan guru pengawas per ruangan per sesi).
// Lihat SQL di dokumentasi untuk skema kedua tabel ini.

/**
 * Ambil daftar ruangan yang tersedia untuk 1 ujian, dari hasil Pembagian
 * Ruangan yang sudah tersimpan di tabel `peserta_ujian`. Kalau Pembagian
 * Ruangan belum diproses untuk ujian ini, hasilnya array kosong.
 */
async function ambilRuanganUjian(supabase, ujianId) {
  const { data, error } = await supabase
    .from("peserta_ujian")
    .select("nomor_ruangan")
    .eq("ujian_id", ujianId);

  if (error) throw error;

  const hitung = {};
  (data || []).forEach((row) => {
    hitung[row.nomor_ruangan] = (hitung[row.nomor_ruangan] || 0) + 1;
  });

  return Object.entries(hitung)
    .map(([nomor_ruangan, jumlah_siswa]) => ({
      nomor_ruangan: Number(nomor_ruangan),
      jumlah_siswa,
    }))
    .sort((a, b) => a.nomor_ruangan - b.nomor_ruangan);
}

/**
 * Ambil daftar guru (semua users yang berstatus guru, ditandai lewat
 * teacher_id terisi -- pola yang sama dengan AdminTeacherDataTab.js).
 */
async function ambilDaftarGuru(supabase) {
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name")
    .not("teacher_id", "is", null)
    .order("full_name", { ascending: true });

  if (error) throw error;
  return data || [];
}

/** Ambil semua sesi jadwal untuk 1 ujian. */
async function ambilJadwalSesi(supabase, ujianId) {
  const { data, error } = await supabase
    .from("ujian_jadwal")
    .select("id, ujian_id, tanggal, sesi_ke, waktu_mulai, waktu_selesai, mata_pelajaran")
    .eq("ujian_id", ujianId)
    .order("tanggal", { ascending: true })
    .order("sesi_ke", { ascending: true });

  if (error) throw error;
  return data || [];
}

/** Simpan 1 sesi jadwal (insert kalau id belum ada, update kalau sudah). */
async function simpanJadwalSesi(supabase, jadwal) {
  if (jadwal.id) {
    const { error } = await supabase
      .from("ujian_jadwal")
      .update({
        tanggal: jadwal.tanggal,
        sesi_ke: jadwal.sesi_ke,
        waktu_mulai: jadwal.waktu_mulai,
        waktu_selesai: jadwal.waktu_selesai,
        mata_pelajaran: jadwal.mata_pelajaran,
      })
      .eq("id", jadwal.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("ujian_jadwal").insert({
    ujian_id: jadwal.ujian_id,
    tanggal: jadwal.tanggal,
    sesi_ke: jadwal.sesi_ke,
    waktu_mulai: jadwal.waktu_mulai,
    waktu_selesai: jadwal.waktu_selesai,
    mata_pelajaran: jadwal.mata_pelajaran,
  });
  if (error) throw error;
}

/**
 * Hapus 1 sesi jadwal. Baris pengawas terkait ikut terhapus otomatis lewat
 * `on delete cascade` di kolom jadwal_id tabel ujian_pengawas.
 */
async function hapusJadwalSesi(supabase, jadwalId) {
  const { error } = await supabase.from("ujian_jadwal").delete().eq("id", jadwalId);
  if (error) throw error;
}

/** Ambil semua penugasan pengawas untuk 1 sesi jadwal, lengkap nama guru. */
async function ambilPengawasUntukJadwal(supabase, jadwalId) {
  const { data, error } = await supabase
    .from("ujian_pengawas")
    .select("id, jadwal_id, nomor_ruangan, guru_id, users:guru_id (full_name)")
    .eq("jadwal_id", jadwalId);

  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    jadwal_id: row.jadwal_id,
    nomor_ruangan: row.nomor_ruangan,
    guru_id: row.guru_id,
    nama: row.users?.full_name || "-",
  }));
}

/** Tambah 1 penugasan pengawas (1 guru untuk 1 ruangan di 1 sesi). */
async function tambahPengawas(supabase, jadwalId, nomorRuangan, guruId) {
  const { data, error } = await supabase
    .from("ujian_pengawas")
    .insert({ jadwal_id: jadwalId, nomor_ruangan: nomorRuangan, guru_id: guruId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Hapus 1 penugasan pengawas. */
async function hapusPengawas(supabase, pengawasId) {
  const { error } = await supabase.from("ujian_pengawas").delete().eq("id", pengawasId);
  if (error) throw error;
}

export {
  ambilRuanganUjian,
  ambilDaftarGuru,
  ambilJadwalSesi,
  simpanJadwalSesi,
  hapusJadwalSesi,
  ambilPengawasUntukJadwal,
  tambahPengawas,
  hapusPengawas,
};
