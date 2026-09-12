import { bagiRuangan } from "./bagiRuangan";

/**
 * Konfigurasi per jenis ujian: jenjang (grade) mana yang ikut, dan
 * semester berapa tahun ajarannya. Dipakai di sisi UI (filter dropdown
 * tahun ajaran) dan di sisi query siswa (filter jenjang).
 * - PSAS: Penilaian Sumatif Akhir Semester (ganjil) -> kelas 7,8,9
 * - PSAT: Penilaian Sumatif Akhir Tahun (genap)     -> kelas 7,8
 * - PSAJ: Penilaian Sumatif Akhir Jenjang (genap)   -> kelas 9 saja
 */
const KONFIGURASI_JENIS_UJIAN = {
  PSAS: { semester: "1", grades: ["7", "8", "9"], defaultKapasitas: 40 },
  PSAT: { semester: "2", grades: ["7", "8"], defaultKapasitas: 40 },
  PSAJ: { semester: "2", grades: ["9"], defaultKapasitas: 20 },
};

/**
 * Ambil daftar tahun ajaran dari tabel academic_years.
 * Sengaja select("*") karena kita belum pasti nama kolom label-nya
 * (bisa "year", "tahun_ajaran", "name", dll) -- jadi ambil semua kolom,
 * baru di sisi komponen UI kita cari kolom mana yang enak ditampilkan.
 */
async function ambilDaftarTahunAjaran(supabase) {
  const { data, error } = await supabase
    .from("academic_years")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Ambil semua siswa aktif untuk 1 tahun ajaran, dikelompokkan per class_id
 * (class_id formatnya udah "7A", "8B", dst — sama seperti key yang dipakai bagiRuangan)
 *
 * @param {object} supabase - instance supabase client
 * @param {string} academicYearId - academic_year_id yang aktif (uuid)
 * @param {string[]|null} allowedGrades - jenjang yang boleh ikut, misal ["7","8"].
 *   Kalau null, semua jenjang diambil (dipakai buat PSAS).
 * @returns {Promise<object>} dataSiswaPerKelas siap dipakai bagiRuangan()
 */
async function ambilSiswaPerKelas(supabase, academicYearId, allowedGrades = null) {
  const { data: siswa, error } = await supabase
    .from("students")
    .select("id, full_name, nis, nisn, class_id, gender")
    .eq("academic_year_id", academicYearId)
    .eq("is_active", true)
    .order("full_name", { ascending: true }); // urutan dalam 1 kelas: alfabetis nama

  if (error) throw error;

  // Kelompokkan berdasarkan class_id, misal { "7A": [...], "8B": [...] }
  // Sekalian filter jenjang kalau allowedGrades dikasih (buat PSAT/PSAJ
  // yang cuma sebagian jenjang yang ikut).
  const dataSiswaPerKelas = {};
  for (const s of siswa) {
    if (allowedGrades) {
      const grade = s.class_id.match(/^\d+/)?.[0];
      if (!allowedGrades.includes(grade)) continue;
    }
    if (!dataSiswaPerKelas[s.class_id]) dataSiswaPerKelas[s.class_id] = [];
    dataSiswaPerKelas[s.class_id].push({
      id: s.id,
      nama: s.full_name,
      nis: s.nis,
      nisn: s.nisn,
      gender: s.gender,
    });
  }
  return dataSiswaPerKelas;
}

/**
 * Cari record `ujian` untuk kombinasi jenis + tahun ajaran tertentu.
 * Kalau belum ada, bikin baru (status "draft"). Ini bikin proses
 * "Proses Pembagian" bisa dipanggil berkali-kali tanpa bikin duplikat
 * record ujian.
 */
async function getOrCreateUjian(supabase, jenis, academicYearId, kapasitas = 40) {
  const { data: existing, error: errSelect } = await supabase
    .from("ujian")
    .select("*")
    .eq("jenis", jenis)
    .eq("academic_year_id", academicYearId)
    .maybeSingle();

  if (errSelect) throw errSelect;
  if (existing) return existing;

  const { data: created, error: errInsert } = await supabase
    .from("ujian")
    .insert({ jenis, academic_year_id: academicYearId, kapasitas_ruangan: kapasitas })
    .select()
    .single();

  if (errInsert) throw errInsert;
  return created;
}

/**
 * Proses lengkap: ambil data siswa (difilter jenjang sesuai jenis ujian)
 * -> bagi ruangan -> return preview (belum disimpan ke DB)
 *
 * @param {object} supabase - instance supabase client
 * @param {string} academicYearId - academic_year_id yang dipakai untuk filter siswa
 * @param {string} jenisUjian - "PSAS" | "PSAT" | "PSAJ", nentuin jenjang mana yang ikut
 * @param {number} kapasitas - kapasitas per ruangan (default 40)
 * @returns {Promise<Array>} hasil pembagian ruangan (untuk ditampilkan / preview di UI dulu sebelum disimpan)
 */
async function prosesPembagianRuangan(supabase, academicYearId, jenisUjian, kapasitas = 40) {
  const allowedGrades = KONFIGURASI_JENIS_UJIAN[jenisUjian]?.grades || null;
  const dataSiswaPerKelas = await ambilSiswaPerKelas(supabase, academicYearId, allowedGrades);
  const hasilRuangan = bagiRuangan(dataSiswaPerKelas, kapasitas);
  return hasilRuangan; // { nomor_ruangan, siswa: [{ id, nama, nis, asal_kelas, no_kursi }] }[]
}

/**
 * Simpan hasil pembagian ruangan (setelah admin konfirmasi di preview) ke tabel peserta_ujian.
 * Idempotent: kalau ujian ini sudah pernah diproses sebelumnya, data lama
 * dihapus dulu baru diganti yang baru -- supaya "Proses Ulang" aman
 * dipakai kalau ada siswa baru/pindah kelas.
 */
async function simpanPembagianRuangan(supabase, ujianId, hasilRuangan) {
  const { error: errDelete } = await supabase
    .from("peserta_ujian")
    .delete()
    .eq("ujian_id", ujianId);
  if (errDelete) throw errDelete;

  const rows = [];
  for (const ruangan of hasilRuangan) {
    for (const s of ruangan.siswa) {
      rows.push({
        ujian_id: ujianId,
        siswa_id: s.id,
        nomor_ruangan: ruangan.nomor_ruangan,
        no_peserta: s.no_kursi,
        asal_kelas: s.asal_kelas,
      });
    }
  }

  const { error: errInsert } = await supabase.from("peserta_ujian").insert(rows);
  if (errInsert) throw errInsert;
  return rows.length; // jumlah baris tersimpan
}

export {
  ambilSiswaPerKelas,
  ambilDaftarTahunAjaran,
  getOrCreateUjian,
  prosesPembagianRuangan,
  simpanPembagianRuangan,
  KONFIGURASI_JENIS_UJIAN,
};
