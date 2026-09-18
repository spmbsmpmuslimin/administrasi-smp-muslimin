// setting/kelola-ujian/kartuUjianSupabase.js
// Layer data untuk sub-fitur "Kartu Ujian" (2 template: Peserta & Pengawas).
//
// Data mengalir dari 2 sub-fitur lain yang sudah jalan:
// - Kartu Peserta  <- Pembagian Ruangan (Tabel peserta_ujian)
// - Kartu Pengawas <- Jadwal & Pembagian Ruangan (tabel jadwal_ujian + pengawas_ujian,
//   lewat jadwalPengawasSupabase.js -- SENGAJA reuse fungsi yang sama biar
//   nggak ada 2 cara beda buat ambil data yang identik)

import {
  ambilJadwalSesi,
  ambilPengawasUntukJadwal,
  ambilDaftarGuru,
} from "../jadwal-pengawas/jadwalPengawasSupabase";

/**
 * Ambil peserta 1 ruangan tertentu lengkap dengan data siswa (nama, NIS),
 * diurutkan berdasarkan no_peserta -- urutan ini yang dipakai buat susunan
 * kartu di halaman PDF.
 * @returns {Promise<Array>} [{ no_peserta, nama, nis, nisn, kelas, jenisKelamin }]
 */
async function ambilPesertaRuangan(supabase, ujianId, nomorRuangan) {
  const { data, error } = await supabase
    .from("peserta_ujian")
    // nisn & gender diambil dari `students` (sumber resmi terbaru -- BUKAN
    // dari student_profile_details.nisn yang legacy, lihat catatan di
    // DataSiswaIndukConfig.js).
    .select("no_peserta, asal_kelas, students(full_name, nis, nisn, gender)")
    .eq("ujian_id", ujianId)
    .eq("nomor_ruangan", nomorRuangan)
    .order("no_peserta", { ascending: true });

  if (error) throw error;

  return (data || []).map((row) => ({
    no_peserta: row.no_peserta,
    nama: row.students?.full_name || "-",
    nis: row.students?.nis || "-",
    nisn: row.students?.nisn || "-",
    kelas: row.asal_kelas || "-",
    // gender di tabel students isinya "L"/"P" (bukan kata penuh) --
    // konversi di sini biar pemanggil (kartuUjianPdf.js) tinggal pakai
    // langsung, samain pola sama jenis_kelamin di StudentList.js.
    jenisKelamin:
      row.students?.gender === "L" ? "Laki-laki" : row.students?.gender === "P" ? "Perempuan" : "-",
  }));
}

/**
 * Ambil semua sesi ujian + siapa aja pengawasnya, lalu dikelompokkan PER
 * GURU (bukan per sesi) -- karena Kartu Pengawas isinya 1 guru = 1 kartu,
 * berisi rekap semua sesi & ruangan yang dia pegang selama ujian ini.
 *
 * DIFILTER ke Daftar Pengawas resmi (users.kode_pengawas terisi, lewat
 * ambilDaftarGuru() -- sumber yang sama dipakai DaftarPengawasTab.js &
 * JadwalPengawasTab.js). Ini SENGAJA, bukan sekadar filter role: kalau
 * suatu saat ada baris nyasar di `ujian_pengawas` (guru_id ke-assign
 * padahal bukan/belum ditambahin ke Daftar Pengawas -- misklik pas isi
 * jadwal, dsb), orang itu otomatis di-skip di sini dan gak ikut kecetak
 * di Kartu Pengawas, tanpa perlu bersih-bersih manual ke database dulu.
 *
 * `mapel` (mata pelajaran YANG DIAJAR guru itu sendiri, buat identitas di
 * kartu -- BEDA sama `mata_pelajaran` di tiap sesi yang artinya mapel yang
 * lagi diujiin) diambil dari Master Kode Guru (`teacher_codes`), difilter
 * ke `tahunAjaran` yang sama kayak ujiannya. Kalau guru itu gak ada/belum
 * kedaftar di Master Kode Guru tahun ajaran ini, fallback "-".
 * @param {string} tahunAjaran - label tahun ajaran ("2026/2027"), dipakai
 *   buat filter teacher_codes.academic_year -- BUKAN id tahun ajaran.
 * @returns {Promise<Array>} [{ guru_id, nama, mapel, sesi: [{tanggal, sesi_ke, waktu_mulai, waktu_selesai, mata_pelajaran, nomor_ruangan}] }]
 */
async function ambilJadwalPengawasPerGuru(supabase, ujianId, tahunAjaran) {
  const [daftarJadwal, daftarPengawasResmi] = await Promise.all([
    ambilJadwalSesi(supabase, ujianId),
    ambilDaftarGuru(supabase),
  ]);
  const idPengawasResmi = new Set(daftarPengawasResmi.map((g) => g.id));
  // Map guru_id (users.id, dipakai di ujian_pengawas) -> teacher_id
  // (kode "G-001", dipakai di teacher_codes) -- 2 sistem ID beda yang
  // perlu dijembatanin manual di sini.
  const teacherIdByGuruId = {};
  daftarPengawasResmi.forEach((g) => {
    teacherIdByGuruId[g.id] = g.teacher_id;
  });

  const perGuru = {};

  for (const jadwal of daftarJadwal) {
    const pengawasSesi = await ambilPengawasUntukJadwal(supabase, jadwal.id);
    pengawasSesi
      .filter((p) => idPengawasResmi.has(p.guru_id))
      .forEach((p) => {
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

  // Query terpisah ke teacher_codes (Master Kode Guru) -- gak bisa
  // di-nested-select dari ujian_pengawas karena relasinya lewat
  // teacher_id (kode), bukan guru_id (uuid) langsung. Guard array kosong,
  // sama kayak pola di ambilPesertaRuangan().
  const daftarTeacherId = Object.keys(perGuru)
    .map((guruId) => teacherIdByGuruId[guruId])
    .filter(Boolean);

  const mapelByTeacherId = {};
  if (tahunAjaran && daftarTeacherId.length > 0) {
    const { data: kodeGuruRows, error: errorKodeGuru } = await supabase
      .from("teacher_codes")
      .select("teacher_id, subject")
      .eq("academic_year", tahunAjaran)
      .in("teacher_id", daftarTeacherId);
    if (errorKodeGuru) throw errorKodeGuru;
    (kodeGuruRows || []).forEach((row) => {
      // Kalau 1 guru punya >1 baris kode buat mapel beda (jarang tapi
      // mungkin), gabung jadi 1 string dipisah "/" -- lebih informatif
      // ketimbang cuma nampilin salah satu & nyembunyiin yang lain.
      mapelByTeacherId[row.teacher_id] = mapelByTeacherId[row.teacher_id]
        ? `${mapelByTeacherId[row.teacher_id]}/${row.subject}`
        : row.subject;
    });
  }

  const hasil = Object.values(perGuru).map((g) => ({
    ...g,
    mapel: mapelByTeacherId[teacherIdByGuruId[g.guru_id]] || "-",
    sesi: [...g.sesi].sort((a, b) =>
      a.tanggal === b.tanggal ? a.sesi_ke - b.sesi_ke : a.tanggal.localeCompare(b.tanggal)
    ),
  }));
  hasil.sort((a, b) => (a.nama || "").localeCompare(b.nama || ""));
  return hasil;
}

/**
 * Ambil nama kepala sekolah untuk dicantumkan di kolom tanda tangan kartu.
 *
 * SEBELUMNYA baca dari raport_metadata (nama_kepala_sekolah) -- tapi tabel
 * itu TERNYATA KOSONG (0 baris) di database ini, makanya nama kepsek
 * selalu blank di kartu. Sekarang baca dari school_settings (key-value),
 * key "principal_name" -- sumber yang sama dipakai fitur Setting > Profil
 * Sekolah, dan sudah keisi.
 *
 * `tempat` belum ada key setting-nya sendiri (nggak ada "school_city" atau
 * semacamnya) -- di-hardcode "Cililin", samain sama nama sekolah (SMP
 * MUSLIMIN CILILIN). Kalau nanti ada key resmi buat ini, tinggal ganti
 * baris return-nya.
 * @returns {Promise<{nama: string, tempat: string}>}
 */
async function ambilMetadataKepsek(supabase) {
  const { data, error } = await supabase
    .from("school_settings")
    .select("setting_value")
    .eq("setting_key", "principal_name")
    .maybeSingle();

  if (error) throw error;

  return {
    nama: data?.setting_value || "-",
    tempat: "Cililin",
  };
}

/**
 * Ambil daftar kelas yang ikut ujian ini + jumlah siswanya -- buat dropdown
 * pilihan di mode cetak "Per Kelas" (setara ambilRuanganUjian() di
 * jadwalPengawasSupabase.js, tapi dikelompokkan per asal_kelas bukan per
 * nomor_ruangan). Diurutkan pakai numeric collation ("7A" < "7B" < ... <
 * "9F") biar tampil rapi, bukan urutan string biasa yang bisa "10A" <
 * "9A".
 * @returns {Promise<Array>} [{ kelas, jumlah_siswa }]
 */
async function ambilDaftarKelasUjian(supabase, ujianId) {
  const { data, error } = await supabase
    .from("peserta_ujian")
    .select("asal_kelas")
    .eq("ujian_id", ujianId);

  if (error) throw error;

  const hitung = {};
  (data || []).forEach((row) => {
    const kelas = row.asal_kelas || "-";
    hitung[kelas] = (hitung[kelas] || 0) + 1;
  });

  return Object.entries(hitung)
    .map(([kelas, jumlah_siswa]) => ({ kelas, jumlah_siswa }))
    .sort((a, b) => a.kelas.localeCompare(b.kelas, undefined, { numeric: true }));
}

/**
 * Ambil semua peserta 1 kelas tertentu (bisa kesebar di beberapa ruangan
 * kalau ujiannya silang kelas) -- buat mode cetak "Per Kelas" di
 * KartuUjianTab.js, biar guru/TU gampang cari kartu berdasarkan kelas anak
 * didiknya tanpa perlu tau dulu anak itu masuk ruangan berapa. Beda dari
 * ambilPesertaRuangan() di atas: filter-nya asal_kelas (bukan
 * nomor_ruangan), dan tiap baris hasilnya bawa `nomorRuangan` MASING-MASING
 * (dikonsumsi generateKartuPesertaPdf() di kartuUjianPdf.js buat nentuin
 * badge ruangan per kartu, karena beda anak di kelas yang sama bisa beda
 * ruangan). Diurutkan per ruangan dulu baru no_peserta, biar kartu yang
 * seruangan ngumpul jadi satu blok pas dicetak -- lebih mudah pas
 * distribusi & pas ngecek dibanding acak.
 * @returns {Promise<Array>} [{ no_peserta, nama, nis, nisn, kelas, jenisKelamin, nomorRuangan }]
 */
async function ambilPesertaKelas(supabase, ujianId, kelas) {
  const { data, error } = await supabase
    .from("peserta_ujian")
    .select("no_peserta, asal_kelas, nomor_ruangan, students(full_name, nis, nisn, gender)")
    .eq("ujian_id", ujianId)
    .eq("asal_kelas", kelas)
    .order("nomor_ruangan", { ascending: true })
    .order("no_peserta", { ascending: true });

  if (error) throw error;

  return (data || []).map((row) => ({
    no_peserta: row.no_peserta,
    nama: row.students?.full_name || "-",
    nis: row.students?.nis || "-",
    nisn: row.students?.nisn || "-",
    kelas: row.asal_kelas || "-",
    jenisKelamin:
      row.students?.gender === "L" ? "Laki-laki" : row.students?.gender === "P" ? "Perempuan" : "-",
    nomorRuangan: row.nomor_ruangan,
  }));
}

export {
  ambilPesertaRuangan,
  ambilDaftarKelasUjian,
  ambilPesertaKelas,
  ambilJadwalPengawasPerGuru,
  ambilMetadataKepsek,
};
