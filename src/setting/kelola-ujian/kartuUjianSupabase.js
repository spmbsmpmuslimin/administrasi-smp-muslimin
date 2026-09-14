// setting/kelola-ujian/kartuUjianSupabase.js
// Layer data untuk sub-fitur "Kartu Ujian" (2 template: Peserta & Pengawas).
//
// Data mengalir dari 2 sub-fitur lain yang sudah jalan:
// - Kartu Peserta  <- Pembagian Ruangan (tabel peserta_ujian)
// - Kartu Pengawas <- Jadwal & Pengawas (tabel jadwal_ujian + pengawas_ujian,
//   lewat jadwalPengawasSupabase.js -- SENGAJA reuse fungsi yang sama biar
//   nggak ada 2 cara beda buat ambil data yang identik)

import { ambilJadwalSesi, ambilPengawasUntukJadwal } from "./jadwalPengawasSupabase";

/**
 * Ambil peserta 1 ruangan tertentu lengkap dengan data siswa (nama, NIS),
 * diurutkan berdasarkan no_peserta -- urutan ini yang dipakai buat susunan
 * kartu di halaman PDF.
 * @returns {Promise<Array>} [{ no_peserta, nama, nis, kelas }]
 */
async function ambilPesertaRuangan(supabase, ujianId, nomorRuangan) {
  const { data, error } = await supabase
    .from("peserta_ujian")
    .select("no_peserta, asal_kelas, students(full_name, nis)")
    .eq("ujian_id", ujianId)
    .eq("nomor_ruangan", nomorRuangan)
    .order("no_peserta", { ascending: true });

  if (error) throw error;

  return (data || []).map((row) => ({
    no_peserta: row.no_peserta,
    nama: row.students?.full_name || "-",
    nis: row.students?.nis || "-",
    kelas: row.asal_kelas || "-",
  }));
}

/**
 * Ambil semua sesi ujian + siapa aja pengawasnya, lalu dikelompokkan PER
 * GURU (bukan per sesi) -- karena Kartu Pengawas isinya 1 guru = 1 kartu,
 * berisi rekap semua sesi & ruangan yang dia pegang selama ujian ini.
 * @returns {Promise<Array>} [{ guru_id, nama, sesi: [{tanggal, sesi_ke, waktu_mulai, waktu_selesai, mata_pelajaran, nomor_ruangan}] }]
 */
async function ambilJadwalPengawasPerGuru(supabase, ujianId) {
  const daftarJadwal = await ambilJadwalSesi(supabase, ujianId);
  const perGuru = {};

  for (const jadwal of daftarJadwal) {
    const pengawasSesi = await ambilPengawasUntukJadwal(supabase, jadwal.id);
    pengawasSesi.forEach((p) => {
      if (!perGuru[p.guru_id]) {
        perGuru[p.guru_id] = { guru_id: p.guru_id, nama: p.nama, sesi: [] };
      }
      perGuru[p.guru_id].sesi.push({
        tanggal: jadwal.tanggal,
        sesi_ke: jadwal.sesi_ke,
        waktu_mulai: jadwal.waktu_mulai,
        waktu_selesai: jadwal.waktu_selesai,
        mata_pelajaran: jadwal.mata_pelajaran,
        nomor_ruangan: p.nomor_ruangan,
      });
    });
  }

  const hasil = Object.values(perGuru).map((g) => ({
    ...g,
    sesi: [...g.sesi].sort((a, b) =>
      a.tanggal === b.tanggal ? a.sesi_ke - b.sesi_ke : a.tanggal.localeCompare(b.tanggal)
    ),
  }));
  hasil.sort((a, b) => (a.nama || "").localeCompare(b.nama || ""));
  return hasil;
}

/**
 * Ambil nama kepala sekolah untuk dicantumkan di kolom tanda tangan kartu.
 * SENGAJA pakai ulang tabel raport_metadata yang sudah ada (dikelola di
 * e-raport/RaportConfig.js) -- 1 sumber data untuk semua dokumen cetak
 * resmi, biar kalau nama kepsek di-update di situ, kartu ujian ikut
 * kebawa otomatis tanpa perlu input dobel.
 */
async function ambilMetadataKepsek(supabase, academicYearId, semester) {
  const { data, error } = await supabase
    .from("raport_metadata")
    .select("nama_kepala_sekolah, tempat")
    .eq("academic_year_id", academicYearId)
    .eq("semester", semester)
    .maybeSingle();

  if (error) throw error;

  return {
    nama: data?.nama_kepala_sekolah || "-",
    tempat: data?.tempat || "Cililin",
  };
}

export { ambilPesertaRuangan, ambilJadwalPengawasPerGuru, ambilMetadataKepsek };
