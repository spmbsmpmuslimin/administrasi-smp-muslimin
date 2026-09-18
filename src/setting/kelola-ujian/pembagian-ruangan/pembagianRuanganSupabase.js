import {
  bagiRuanganPerJenjang,
  VERSI_SKEMA_LIST,
  normalisasiVersiSkema,
} from "./bagiRuanganPerJenjang";
import { getAllAcademicYears } from "../../../services/academicYearService";
import { bangunPetaNoPeserta } from "./noPeserta";

/**
 * Gerbang validasi versi skema buat SEMUA fungsi di file ini yang nulis
 * atau make versi_skema. Sengaja nge-throw, bukan diem-diem mundur ke
 * versi tertentu: gak ada default di sistem ini, versi itu keputusan
 * admin (lihat catatan "SENGAJA GAK ADA VERSI_DEFAULT" di
 * bagiRuanganPerJenjang.js). Kalau sampai fungsi-fungsi ini kepanggil
 * tanpa versi, itu bug di pemanggilnya -- mendingan kelihatan sekarang
 * daripada nyangkut jadi data ruangan yang skemanya gak pernah dipilih
 * siapa pun.
 *
 * @returns {string} kode versi yang udah dinormalisasi (siap ditulis ke DB)
 */
function pastikanVersiDipilih(versiSkema) {
  const versi = normalisasiVersiSkema(versiSkema);
  if (!versi) {
    throw new Error(
      `Versi skema pembagian belum dipilih. Pilihan: ${VERSI_SKEMA_LIST.map((o) => o.value).join(", ")}.`
    );
  }
  return versi;
}

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
 * (class_id formatnya udah "7A", "8B", dst — sama seperti key yang dipakai
 * bagiRuanganPerJenjang)
 *
 * @param {object} supabase - instance supabase client
 * @param {string} academicYearId - academic_year_id yang aktif (uuid)
 * @param {string[]|null} allowedGrades - jenjang yang boleh ikut, misal ["7","8"].
 *   Kalau null, semua jenjang diambil (dipakai buat PSAS).
 * @returns {Promise<object>} dataSiswaPerKelas siap dipakai bagiRuanganPerJenjang()
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
 *
 * @param {"rotasi"|"rantai"|"silang"} versiSkema - versi algoritma yang
 *   dipilih admin (lihat VERSI_SKEMA_LIST di bagiRuanganPerJenjang.js).
 *   WAJIB diisi -- gak ada default, admin yang mesti milih.
 *   CUMA dipakai pas BIKIN record baru -- kalau record `jenis` +
 *   `academicYearId` ini udah ada, versi_skema-nya TETAP yang lama
 *   (gak ke-update diam-diam walau admin ganti pilihan versi di UI).
 *   Ganti versi buat ujian yang udah pernah diproses itu mestinya
 *   keputusan eksplisit lewat "Proses Ulang", bukan efek samping dari
 *   fungsi ini dipanggil ulang.
 */
async function getOrCreateUjian(supabase, jenis, academicYearId, kapasitas = 40, versiSkema) {
  const versi = pastikanVersiDipilih(versiSkema);

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
    .insert({
      jenis,
      academic_year_id: academicYearId,
      kapasitas_ruangan: kapasitas,
      versi_skema: versi,
    })
    .select()
    .single();

  if (errInsert) throw errInsert;
  return created;
}

/**
 * Proses lengkap: ambil data siswa (difilter jenjang sesuai jenis ujian)
 * -> bagi ruangan PER JENJANG lewat bagiRuanganPerJenjang() (gantiin
 * bagiRuangan() lama yang nyampur semua jenjang dalam 1 ruangan) ->
 * return preview (belum disimpan ke DB).
 *
 * @param {object} supabase - instance supabase client
 * @param {string} academicYearId - academic_year_id yang dipakai untuk filter siswa
 * @param {string} jenisUjian - "PSAS" | "PSAT" | "PSAJ", nentuin jenjang mana yang ikut
 * @param {number} kapasitas - kapasitas per ruangan (default 40). CATATAN: sejak
 *   pindah ke bagiRuanganPerJenjang(), kapasitas ini murni informasi/acuan
 *   (buat disimpan di record ujian & peringatan di UI) -- BUKAN lagi
 *   penentu jumlah ruang. Jumlah ruang sekarang = jumlah kelas asal per
 *   jenjang. Lihat komentar di bagiRuanganPerJenjang.js.
 * @param {"rotasi"|"rantai"|"silang"} versiSkema - kode versi algoritma
 *   (lihat VERSI_SKEMA_LIST di bagiRuanganPerJenjang.js untuk daftar &
 *   label terkini -- SENGAJA gak diduplikasi/ditulis ulang di sini biar
 *   gak ada 2 sumber yang bisa saling kontradiksi kalau penomoran versi
 *   digeser lagi ke depannya). WAJIB diisi, TIDAK ADA default -- lihat
 *   "SENGAJA GAK ADA VERSI_DEFAULT" di bagiRuanganPerJenjang.js. Nilai
 *   legacy "v1"/"v2" dipetakan otomatis ke "rotasi"/"rantai".
 * @returns {Promise<Array>} hasil pembagian ruangan (untuk ditampilkan / preview di UI dulu sebelum disimpan)
 */
async function prosesPembagianRuangan(
  supabase,
  academicYearId,
  jenisUjian,
  kapasitas = 40,
  versiSkema
) {
  pastikanVersiDipilih(versiSkema);

  const allowedGrades = KONFIGURASI_JENIS_UJIAN[jenisUjian]?.grades || null;
  const dataSiswaPerKelas = await ambilSiswaPerKelas(supabase, academicYearId, allowedGrades);
  const hasilRuangan = bagiRuanganPerJenjang(dataSiswaPerKelas, versiSkema);
  return hasilRuangan; // { nomor_ruangan, jenjang, siswa: [{ id, nama, nis, asal_kelas, no_kursi }] }[]
}

/**
 * Simpan hasil pembagian ruangan (setelah admin konfirmasi di preview) ke tabel peserta_ujian.
 * Idempotent: kalau ujian ini sudah pernah diproses sebelumnya, data lama
 * dihapus dulu baru diganti yang baru -- supaya "Proses Ulang" aman
 * dipakai kalau ada siswa baru/pindah kelas.
 *
 * no_peserta yang ditulis ke DB formatnya "26-27-001" (kode tahun ajaran +
 * nomor urut GLOBAL lintas ruangan, lihat noPeserta.js) -- BUKAN lagi angka
 * lokal per-ruangan. Ini yang dibaca langsung sama Kartu Ujian
 * (kartuUjianSupabase.js) buat nyetak "No. Peserta", jadi begitu disimpan
 * di sini, Kartu Ujian otomatis ikut benar tanpa perlu diubah.
 *
 * CATATAN: field `jenjang` yang ada di tiap elemen hasilRuangan (dari
 * bagiRuanganPerJenjang) SENGAJA gak disimpan di sini -- peserta_ujian
 * gak punya kolom jenjang, dan nilainya toh selalu bisa di-derive lagi
 * dari asal_kelas tiap siswa. Lihat ambilPembagianTersimpan() di bawah,
 * yang nge-derive balik field ini pas data dibaca ulang dari DB.
 *
 * @param {string} tahunAjaran - label tahun ajaran, mis. "2026/2027" -- dipakai
 *   buat bikin prefix kode. WAJIB dikirim; kalau kosong, no_peserta jadi
 *   angka urut polos tanpa prefix (fallback, jangan sengaja diandalkan).
 */
async function simpanPembagianRuangan(supabase, ujianId, hasilRuangan, tahunAjaran) {
  const { error: errDelete } = await supabase
    .from("peserta_ujian")
    .delete()
    .eq("ujian_id", ujianId);
  if (errDelete) throw errDelete;

  // Dihitung dari SELURUH hasilRuangan yang dikirim (bukan per-ruangan) --
  // itu yang bikin no_peserta ruangan ke-2 lanjut dari ruangan ke-1, bukan
  // balik ke 001.
  const petaNoPeserta = bangunPetaNoPeserta(hasilRuangan, tahunAjaran);

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
 * select("*") otomatis ikut narik kolom `versi_skema` -- gak perlu
 * perubahan apa-apa di sini buat itu.
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
 * seperti output bagiRuanganPerJenjang() -- [{ nomor_ruangan, jenjang,
 * siswa: [{ id, nama, nis, asal_kelas, no_kursi }] }] -- biar bisa
 * langsung dipakai ngisi ulang state UI (hasilAsli) tanpa perlu generate
 * ulang dari tabel students. Ini yang bikin data tersimpan tetap muncul
 * lagi walau admin pindah tab terus balik lagi -- termasuk buat UI yang
 * nge-group tampilan per jenjang (field `jenjang` di-derive dari
 * asal_kelas siswa pertama di tiap ruang, karena peserta_ujian sendiri
 * gak nyimpen kolom jenjang terpisah).
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
    .map(([nomor, siswa]) => ({
      nomor_ruangan: Number(nomor),
      // derive dari asal_kelas siswa pertama di ruang ini (format "7A" -> "7")
      jenjang: siswa[0]?.asal_kelas?.match(/^\d+/)?.[0] || null,
      siswa,
    }))
    .sort((a, b) => a.nomor_ruangan - b.nomor_ruangan);
}

/**
 * Buka kunci versi_skema buat kombinasi jenis+tahun ajaran yang udah
 * pernah diproses/disimpan -- ini implementasi dari "aksi eksplisit" yang
 * disebut di komentar getOrCreateUjian() di atas (dulu belum ada tombolnya,
 * makanya satu-satunya jalan buat ganti versi cuma manual lewat SQL).
 * Dipanggil dari tombol "Proses Ulang dengan Versi Lain" di UI, SETELAH
 * admin konfirmasi + pilih versi baru lewat modal peringatan -- jangan
 * dipanggil langsung dari efek samping klik radio/tombol biasa.
 *
 * Hapus peserta_ujian + SEMUA penugasan pengawas (ujian_pengawas) buat
 * ujian ini, lalu UPDATE versi_skema di tempat -- BUKAN hapus baris
 * `ujian`-nya. ujian_jadwal, anggaran_ujian, laporan_rekap_ujian, dan
 * rekap_kehadiran_ujian semua ON DELETE CASCADE ke ujian.id, jadi kalau
 * baris ujian ikut kehapus, jadwal/anggaran/laporan yang udah diisi admin
 * buat ujian itu ikut lenyap -- padahal niatnya cuma reset pembagian
 * ruangan (+ pengawas yang nempel di nomor ruangan lama) doang, bukan
 * reset seluruh ujian. Makanya ujian_jadwal (tanggal/sesi/mata pelajaran)
 * SENGAJA tidak ikut dihapus di sini.
 *
 * FIX (Sep 2026): sebelumnya ujian_pengawas TIDAK ikut dihapus di sini --
 * cuma diperingatkan lewat modal UI supaya admin "cek ulang manual".
 * Masalahnya, `nomor_ruangan` yang jadi kunci penugasan pengawas gak
 * dijamin berarti sama antar versi skema (jumlah & komposisi ruang bisa
 * beda total antara rotasi/rantai/silang -- lihat dokumentasi Pembagian
 * Ruangan), jadi penugasan lama yang ditinggal begitu saja jadi nempel ke
 * ruang yang isinya sudah berubah tanpa ada yang sadar sampai hari-H.
 * Sekarang dihapus otomatis bareng peserta_ujian, supaya admin PASTI mulai
 * dari kosong dan wajib assign ulang pengawas lewat "Jadwal Ngawas" /
 * "Terapkan Rotasi" setelah ganti versi -- lebih aman daripada mengandalkan
 * kedisiplinan cek manual.
 *
 * @param {string} versiSkemaBaru - kode versi baru (lihat VERSI_SKEMA_LIST
 *   di bagiRuanganPerJenjang.js), DINORMALISASI dulu sebelum ditulis biar
 *   konsisten sama getOrCreateUjian().
 * @returns {Promise<{ada: boolean, jumlahPengawasTerhapus: number}>}
 *   ada=false kalau memang belum ada apa-apa buat kombinasi ini (no-op,
 *   gak ada yang diubah -- bisa kejadian kalau 2 admin klik bareng di
 *   waktu yang hampir sama). jumlahPengawasTerhapus dikembalikan supaya
 *   UI bisa nunjukin secara eksplisit berapa penugasan pengawas yang ikut
 *   kehapus (bukan cuma "data ruangan"), biar admin sadar itu juga hilang.
 */
async function resetUntukProsesUlang(supabase, jenis, academicYearId, versiSkemaBaru) {
  const { data: ujian, error: errSelect } = await supabase
    .from("ujian")
    .select("id")
    .eq("jenis", jenis)
    .eq("academic_year_id", academicYearId)
    .maybeSingle();

  if (errSelect) throw errSelect;
  if (!ujian) return { ada: false, jumlahPengawasTerhapus: 0 };

  // ujian_pengawas nyambung ke ujian lewat ujian_jadwal.id (jadwal_id),
  // bukan langsung ke ujian_id -- ambil dulu semua jadwal_id ujian ini.
  const { data: daftarJadwal, error: errJadwal } = await supabase
    .from("ujian_jadwal")
    .select("id")
    .eq("ujian_id", ujian.id);
  if (errJadwal) throw errJadwal;

  let jumlahPengawasTerhapus = 0;
  const jadwalIds = (daftarJadwal || []).map((j) => j.id);
  if (jadwalIds.length > 0) {
    const { data: pengawasTerhapus, error: errDeletePengawas } = await supabase
      .from("ujian_pengawas")
      .delete()
      .in("jadwal_id", jadwalIds)
      .select("id");
    if (errDeletePengawas) throw errDeletePengawas;
    jumlahPengawasTerhapus = pengawasTerhapus?.length || 0;
  }

  const { error: errDeletePeserta } = await supabase
    .from("peserta_ujian")
    .delete()
    .eq("ujian_id", ujian.id);
  if (errDeletePeserta) throw errDeletePeserta;

  const { error: errUpdateVersi } = await supabase
    .from("ujian")
    .update({ versi_skema: pastikanVersiDipilih(versiSkemaBaru) })
    .eq("id", ujian.id);
  if (errUpdateVersi) throw errUpdateVersi;

  return { ada: true, jumlahPengawasTerhapus };
}

export {
  ambilSiswaPerKelas,
  ambilDaftarTahunAjaran,
  getOrCreateUjian,
  cariUjian,
  prosesPembagianRuangan,
  simpanPembagianRuangan,
  ambilPembagianTersimpan,
  resetUntukProsesUlang,
  KONFIGURASI_JENIS_UJIAN,
};
