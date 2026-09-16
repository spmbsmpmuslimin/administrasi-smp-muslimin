import { bagiRuangan } from "./bagiRuangan";
import { getAllAcademicYears } from "../../../services/academicYearService";
import { bangunPetaNoPeserta } from "./noPeserta";

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
 * Ambil daftar tahun ajaran, lewat academicYearService (bukan query
 * langsung ke academic_years) biar konsisten & ikut sinkron kalau logic
 * academic_years berubah di masa depan. select("*") sebelumnya udah
 * dipenuhi oleh getAllAcademicYears() (return semua kolom juga).
 * Urutan berubah dari `created_at DESC` jadi `year DESC, semester ASC`
 * (default academicYearService) -- lebih masuk akal buat dropdown tahun
 * ajaran, tapi tandain di sini kalau-kalau ada yang gantungin urutan lama.
 */
async function ambilDaftarTahunAjaran() {
  return getAllAcademicYears();
}

/**
 * Ambil semua siswa aktif untuk 1 tahun ajaran, dikelompokkan per class_id
 * (class_id formatnya udah "7A", "8B", dst — sama seperti key yang dipakai bagiRuangan)
 *
 * ⚠️ PENTING (Sept 2026): filter di sini SENGAJA pakai kolom `academic_year`
 * (teks, mis. "2026/2027") di tabel students, BUKAN `academic_year_id`.
 * `academicYearId` yang diterima function ini adalah ID baris SEMESTER
 * TERTENTU (mis. baris "2026/2027 Semester 2" khusus buat PSAT/PSAJ),
 * sedangkan `students.academic_year_id` cuma nunjuk ke SATU semester yang
 * lagi aktif sekarang (ikut disinkron tiap toggle semester, lihat
 * setActiveAcademicYear() di academicYearService.js). Kalau match langsung
 * ke academicYearId, PSAT baru ketemu siswanya pas semester aktif KEBETULAN
 * lagi semester 2 — nggak bisa dipreview dari semester 1 padahal siswa kelas
 * 7/8-nya sama aja. Semester itu atribut jenis ujian, bukan kriteria siswa —
 * makanya di sini kita samain dulu academicYearId -> label tahun ajarannya,
 * baru filter siswa pakai label itu.
 *
 * @param {object} supabase - instance supabase client
 * @param {string} academicYearId - id baris academic_years (semester tertentu)
 *   yang dipilih admin di dropdown; dipakai buat nentuin TAHUN AJARANNYA, bukan
 *   buat match langsung ke academic_year_id siswa.
 * @param {string[]|null} allowedGrades - jenjang yang boleh ikut, misal ["7","8"].
 *   Kalau null, semua jenjang diambil (dipakai buat PSAS).
 * @returns {Promise<object>} dataSiswaPerKelas siap dipakai bagiRuangan()
 */
async function ambilSiswaPerKelas(supabase, academicYearId, allowedGrades = null) {
  // Samain academicYearId (ID semester spesifik) -> label tahun ajaran (teks).
  const { data: tahunAjaran, error: errTahun } = await supabase
    .from("academic_years")
    .select("year")
    .eq("id", academicYearId)
    .single();

  if (errTahun) throw errTahun;

  const { data: siswa, error } = await supabase
    .from("students")
    .select("id, full_name, nis, nisn, class_id, gender")
    .eq("academic_year", tahunAjaran.year) // <- diganti dari academic_year_id
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
 * @param {string} academicYearId - id baris academic_years (semester tertentu, mis.
 *   "2026/2027 Semester 2" buat PSAT) yang dipilih admin di dropdown. Cuma
 *   dipakai buat nentuin TAHUN AJARANNYA (lihat catatan di ambilSiswaPerKelas)
 *   dan buat scope record `ujian` -- bukan buat match langsung ke
 *   academic_year_id siswa.
 * @param {string} jenisUjian - "PSAS" | "PSAT" | "PSAJ", nentuin jenjang mana yang ikut
 * @param {number} kapasitas - kapasitas ideal per ruangan (default 40) -- CUMA
 *   dipakai sebagai metadata (kapasitas_ruangan) & ambang warning di UI,
 *   TIDAK dipakai buat nentuin jumlah ruangan (lihat bagiRuangan.js -- jumlah
 *   ruangan sekarang murni dari jumlah rombel per angkatan).
 * @returns {Promise<Array>} hasil pembagian ruangan (untuk ditampilkan / preview di UI dulu sebelum disimpan)
 */
async function prosesPembagianRuangan(supabase, academicYearId, jenisUjian, kapasitas = 40) {
  const allowedGrades = KONFIGURASI_JENIS_UJIAN[jenisUjian]?.grades || null;
  const dataSiswaPerKelas = await ambilSiswaPerKelas(supabase, academicYearId, allowedGrades);
  const hasilRuangan = bagiRuangan(dataSiswaPerKelas);
  return hasilRuangan; // { nomor_ruangan, siswa: [{ id, nama, nis, asal_kelas, no_kursi }] }[]
}

/**
 * Simpan hasil pembagian ruangan (setelah admin konfirmasi di preview) ke tabel peserta_ujian.
 * Idempotent: kalau ujian ini sudah pernah diproses sebelumnya, data lama
 * dihapus dulu baru diganti yang baru -- supaya "Proses Ulang" aman
 * dipakai kalau ada siswa baru/pindah kelas.
 *
 * no_peserta yang ditulis ke DB formatnya "2627-07-001" (tahun masuk dari
 * NIS siswa + kode angkatan + nomor urut RESET per angkatan, lihat
 * noPeserta.js) -- BUKAN lagi angka lokal per-ruangan. Ini yang dibaca
 * langsung sama Kartu Ujian (kartuUjianSupabase.js) buat nyetak
 * "No. Peserta", jadi begitu disimpan di sini, Kartu Ujian otomatis ikut
 * benar tanpa perlu diubah.
 *
 * Prefix tahun & kode angkatan diambil per-siswa (dari NIS & asal_kelas
 * masing-masing), jadi fungsi ini gak lagi butuh parameter tahunAjaran.
 */
async function simpanPembagianRuangan(supabase, ujianId, hasilRuangan) {
  const { error: errDelete } = await supabase
    .from("peserta_ujian")
    .delete()
    .eq("ujian_id", ujianId);
  if (errDelete) throw errDelete;

  // Dihitung dari SELURUH hasilRuangan yang dikirim (bukan per-ruangan) --
  // itu yang bikin nomor urut per angkatan jalan terus lintas ruangan
  // (bukan balik ke 001 tiap ganti ruangan).
  const petaNoPeserta = bangunPetaNoPeserta(hasilRuangan);

  const rows = [];
  for (const ruangan of hasilRuangan) {
    for (const s of ruangan.siswa) {
      rows.push({
        ujian_id: ujianId,
        siswa_id: s.id,
        nomor_ruangan: ruangan.nomor_ruangan,
        no_peserta: petaNoPeserta.get(String(s.id)) || String(s.no_kursi).padStart(3, "0"),
        asal_kelas: s.asal_kelas,
      });
    }
  }

  const { error: errInsert } = await supabase.from("peserta_ujian").insert(rows);
  if (errInsert) throw errInsert;
  return rows.length; // jumlah baris tersimpan
}

/**
 * Cari record `ujian` untuk kombinasi jenis + tahun ajaran, TANPA bikin
 * baru kalau belum ada (beda dari getOrCreateUjian di atas). Dipakai
 * buat cek "udah pernah diproses/disimpan belum" pas tab dibuka /
 * tahun ajaran diganti -- kalau dipakai getOrCreateUjian malah bikin
 * record ujian kosong cuma buat sekedar ngecek doang.
 *
 * @returns {Promise<object|null>} record ujian, atau null kalau belum ada
 */
async function cariUjian(supabase, jenis, academicYearId) {
  const { data, error } = await supabase
    .from("ujian")
    .select("*")
    .eq("jenis", jenis)
    .eq("academic_year_id", academicYearId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Ambil hasil pembagian ruangan yang SUDAH TERSIMPAN di peserta_ujian
 * buat 1 ujian tertentu, dibentuk ulang ke format yang SAMA PERSIS
 * seperti output bagiRuangan() -- [{ nomor_ruangan, siswa: [{ id, nama,
 * nis, asal_kelas, no_kursi }] }] -- biar bisa langsung dipakai ngisi
 * ulang state UI (hasilAsli) tanpa perlu generate ulang dari tabel
 * students. Ini yang bikin data tersimpan tetap muncul lagi walau
 * admin pindah tab terus balik lagi.
 *
 * CATATAN soal no_kursi di sini: nilainya diisi dari kolom no_peserta di DB
 * apa adanya, yang sejak migrasi format-no-peserta ISINYA STRING KODE
 * ("26-27-041"), bukan angka urut lokal lagi. Nggak masalah -- field ini di
 * hilir cuma dipakai buat nyortir & langsung DITIMPA ULANG jadi angka
 * urut lokal begitu lewat terapkanQuotaManual() (lihat bagiRuangan.js), jadi
 * nggak ada kode lain yang bergantung ke nilai aslinya.
 *
 * @returns {Promise<Array>} array kosong kalau belum ada apa-apa tersimpan
 */
async function ambilPembagianTersimpan(supabase, ujianId) {
  const { data, error } = await supabase
    .from("peserta_ujian")
    .select("nomor_ruangan, no_peserta, asal_kelas, siswa_id, students(id, full_name, nis)")
    .eq("ujian_id", ujianId)
    .order("nomor_ruangan", { ascending: true })
    .order("no_peserta", { ascending: true });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Kelompokkan flat rows dari DB balik jadi per-ruangan
  const perRuangan = {};
  for (const row of data) {
    if (!perRuangan[row.nomor_ruangan]) perRuangan[row.nomor_ruangan] = [];
    perRuangan[row.nomor_ruangan].push({
      id: row.siswa_id,
      nama: row.students?.full_name || "(siswa tidak ditemukan)",
      nis: row.students?.nis,
      asal_kelas: row.asal_kelas,
      no_kursi: row.no_peserta,
    });
  }

  return Object.entries(perRuangan)
    .map(([nomor, siswa]) => ({ nomor_ruangan: Number(nomor), siswa }))
    .sort((a, b) => a.nomor_ruangan - b.nomor_ruangan);
}

export {
  ambilSiswaPerKelas,
  ambilDaftarTahunAjaran,
  getOrCreateUjian,
  cariUjian,
  prosesPembagianRuangan,
  simpanPembagianRuangan,
  ambilPembagianTersimpan,
  KONFIGURASI_JENIS_UJIAN,
};
