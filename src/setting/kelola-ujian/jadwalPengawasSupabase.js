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

/**
 * Kelompokkan daftar jadwal (dari ambilJadwalSesi) per tanggal, tiap
 * grup diurutkan berdasarkan sesi_ke ascending. Dipakai buat fitur
 * "Rotasi Otomatis" -- 1 hari bisa punya beberapa sesi (jam ke 1, 2, dst)
 * yang perlu digeser berurutan.
 * @returns {Array<{ tanggal: string, sesi: Array }>} diurutkan berdasarkan tanggal
 */
function kelompokkanJadwalPerHari(daftarJadwal) {
  const perHari = {};
  daftarJadwal.forEach((j) => {
    if (!perHari[j.tanggal]) perHari[j.tanggal] = [];
    perHari[j.tanggal].push(j);
  });
  return Object.entries(perHari)
    .map(([tanggal, sesi]) => ({
      tanggal,
      sesi: [...sesi].sort((a, b) => a.sesi_ke - b.sesi_ke),
    }))
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
}

/**
 * Terapkan rotasi otomatis pengawas untuk SEMUA sesi dalam 1 hari.
 *
 * Pola (sesuai kebiasaan sekolah): admin cuma nentuin siapa pengawas di
 * tiap ruangan untuk SESI PERTAMA hari itu (base assignment). Sesi-sesi
 * berikutnya di hari yang sama otomatis "digeser": guru yang tadinya di
 * Ruang N pindah ke Ruang N+1, dan Ruang terakhir muter balik ke Ruang 1
 * (wrap-around). Geseran selalu +1 ruangan tiap pindah sesi, berlaku
 * konsisten walau hari itu ada lebih dari 2 sesi.
 *
 * Idempotent: pengawas yang sudah ada untuk sesi-sesi hari ini dihapus
 * dulu sebelum diisi ulang, supaya "Terapkan Rotasi" aman dipanggil
 * berkali-kali (misal admin mau ganti susunan) tanpa bikin data dobel.
 *
 * @param {object} supabase
 * @param {Array} sesiHariIni - daftar jadwal 1 hari, HARUS sudah terurut
 *   berdasarkan sesi_ke ascending (pakai kelompokkanJadwalPerHari)
 * @param {number[]} urutanRuangan - nomor ruangan terurut, misal [1,2,...,18]
 * @param {string[]} guruIdSesiPertama - guru_id per ruangan UNTUK SESI
 *   PERTAMA, urutannya sejajar dengan urutanRuangan (index 0 = ruangan
 *   pertama). Panjangnya harus sama dengan urutanRuangan.
 * @returns {Promise<number>} jumlah baris pengawas yang tersimpan (jumlah ruangan x jumlah sesi)
 */
async function terapkanRotasiPengawasHarian(
  supabase,
  sesiHariIni,
  urutanRuangan,
  guruIdSesiPertama
) {
  const jumlahRuangan = urutanRuangan.length;
  if (guruIdSesiPertama.length !== jumlahRuangan) {
    throw new Error(
      `Jumlah guru (${guruIdSesiPertama.length}) harus sama dengan jumlah ruangan (${jumlahRuangan})`
    );
  }
  if (sesiHariIni.length === 0) {
    throw new Error("Tidak ada sesi untuk hari ini");
  }

  const jadwalIds = sesiHariIni.map((j) => j.id);
  const { error: errDelete } = await supabase
    .from("ujian_pengawas")
    .delete()
    .in("jadwal_id", jadwalIds);
  if (errDelete) throw errDelete;

  const rows = [];
  sesiHariIni.forEach((jadwal, sesiIdx) => {
    for (let i = 0; i < jumlahRuangan; i++) {
      // Geser +1 ruangan tiap sesi berikutnya (wrap-around ke awal).
      // Ruangan ke-i pada sesi ke-`sesiIdx` diisi guru yang jadi base
      // assignment di ruangan ke-(i - sesiIdx), dihitung mundur & wrap.
      const guruId = guruIdSesiPertama[(i - sesiIdx + jumlahRuangan) % jumlahRuangan];
      rows.push({
        jadwal_id: jadwal.id,
        nomor_ruangan: urutanRuangan[i],
        guru_id: guruId,
      });
    }
  });

  const { error: errInsert } = await supabase.from("ujian_pengawas").insert(rows);
  if (errInsert) throw errInsert;
  return rows.length;
}

/**
 * Simpan banyak sesi jadwal sekaligus (bulk insert) -- dipakai fitur
 * "Generate Rentang Tanggal" supaya admin gak perlu isi form satu-satu
 * per sesi. Semua baris dianggap baru (insert), bukan update.
 * @param {object} supabase
 * @param {string} ujianId
 * @param {Array<{tanggal:string, sesi_ke:number, waktu_mulai:string, waktu_selesai:string, mata_pelajaran:string}>} daftarSesi
 * @returns {Promise<number>} jumlah baris yang berhasil disimpan
 */
async function simpanJadwalSesiBulk(supabase, ujianId, daftarSesi) {
  if (!daftarSesi || daftarSesi.length === 0) return 0;

  const rows = daftarSesi.map((s) => ({
    ujian_id: ujianId,
    tanggal: s.tanggal,
    sesi_ke: s.sesi_ke,
    waktu_mulai: s.waktu_mulai || null,
    waktu_selesai: s.waktu_selesai || null,
    mata_pelajaran: s.mata_pelajaran.trim(),
  }));

  const { error } = await supabase.from("ujian_jadwal").insert(rows);
  if (error) throw error;
  return rows.length;
}

export {
  ambilRuanganUjian,
  ambilDaftarGuru,
  ambilJadwalSesi,
  simpanJadwalSesi,
  simpanJadwalSesiBulk,
  hapusJadwalSesi,
  ambilPengawasUntukJadwal,
  tambahPengawas,
  hapusPengawas,
  kelompokkanJadwalPerHari,
  terapkanRotasiPengawasHarian,
};
