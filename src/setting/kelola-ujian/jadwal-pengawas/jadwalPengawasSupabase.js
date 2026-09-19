// setting/kelola-ujian/jadwalPengawasSupabase.js
// Service layer untuk sub-fitur "Jadwal & Pembagian Ruangan" di Manajemen Ujian.
// Tabel yang dipakai: `ujian_jadwal` (sesi ujian per mapel) dan
// `ujian_pengawas` (penugasan guru pengawas per ruangan per sesi).
// Lihat SQL di dokumentasi untuk skema kedua tabel ini.

/**
 * Ambil daftar ruangan yang tersedia untuk 1 ujian, dari hasil Pembagian
 * Ruangan yang sudah tersimpan di tabel `peserta_ujian`. Kalau Pembagian
 * Ruangan belum diproses untuk ujian ini, hasilnya array kosong.
 *
 * FIX (Sep 2026): sebelumnya di sini diasumsikan "ruangan TIDAK dicampur
 * lintas jenjang" dan jenjang ruangan diambil dari baris PERTAMA yang
 * ketemu saja. Asumsi itu cuma benar untuk versi skema "rotasi" (V1).
 * Untuk "rantai" (V2, grup 7+8 dst digabung) dan "silang" (V3, SELALU
 * campur semua jenjang) satu ruangan bisa berisi 2-3 jenjang sekaligus --
 * ambil-baris-pertama bikin jenjang ruangan salah / gak lengkap, dan itu
 * dipakai buat nentuin mata pelajaran (lihat mataPelajaranUntukRuangan()
 * di bawah), jadi ruangan campuran bisa nampilin mapel yang salah buat
 * sebagian siswanya. Sekarang SEMUA jenjang yang muncul di 1
 * nomor_ruangan dikumpulin (bukan cuma yang pertama).
 */
async function ambilRuanganUjian(supabase, ujianId) {
  const { data, error } = await supabase
    .from("peserta_ujian")
    .select("nomor_ruangan, asal_kelas")
    .eq("ujian_id", ujianId);

  if (error) throw error;

  const hitung = {};
  const jenjangSetPerRuangan = {};
  (data || []).forEach((row) => {
    hitung[row.nomor_ruangan] = (hitung[row.nomor_ruangan] || 0) + 1;
    if (!jenjangSetPerRuangan[row.nomor_ruangan]) {
      jenjangSetPerRuangan[row.nomor_ruangan] = new Set();
    }
    const jenjang = row.asal_kelas?.match(/^\d+/)?.[0];
    if (jenjang) jenjangSetPerRuangan[row.nomor_ruangan].add(jenjang);
  });

  return Object.entries(hitung)
    .map(([nomor_ruangan, jumlah_siswa]) => {
      const jenjangSet = [...(jenjangSetPerRuangan[nomor_ruangan] || [])].sort(
        (a, b) => Number(a) - Number(b)
      );
      return {
        nomor_ruangan: Number(nomor_ruangan),
        jumlah_siswa,
        // jenjangSet: daftar LENGKAP semua jenjang di ruang ini (bisa >1
        // elemen untuk ruang campuran V2/V3) -- WAJIB dipakai (bareng
        // mataPelajaranUntukRuangan()) di mana pun logic butuh tau mapel
        // yang berlaku per jenjang di ruangan itu.
        jenjangSet,
        // jenjang: label tampilan gabungan ("7+8"), dipertahankan buat
        // tempat yang cuma butuh nampilin teks, BUKAN buat nentuin mapel.
        jenjang: jenjangSet.join("+") || null,
      };
    })
    .sort((a, b) => a.nomor_ruangan - b.nomor_ruangan);
}

/**
 * Tentuin mata pelajaran yang berlaku buat 1 jenjang tertentu di 1 sesi
 * jadwal. `mata_pelajaran` adalah nilai default (selalu berlaku buat
 * kelas 7, dan buat kelas 8/9 juga KECUALI ada override-nya sendiri di
 * kolom mata_pelajaran_kelas8/mata_pelajaran_kelas9).
 */
function mataPelajaranUntukJenjang(jadwal, jenjang) {
  if (jenjang === "8" && jadwal.mata_pelajaran_kelas8) return jadwal.mata_pelajaran_kelas8;
  if (jenjang === "9" && jadwal.mata_pelajaran_kelas9) return jadwal.mata_pelajaran_kelas9;
  return jadwal.mata_pelajaran;
}

/**
 * Sama seperti mataPelajaranUntukJenjang(), tapi untuk 1 RUANGAN yang bisa
 * berisi LEBIH DARI 1 jenjang sekaligus (ruang hasil versi skema "rantai"
 * atau "silang" -- lihat jenjangSet di ambilRuanganUjian()). Dipakai di
 * tab "Rekap" buat nampilin mapel yang beneran berlaku di ruang itu,
 * bukan cuma nebak dari 1 jenjang.
 *
 * Hasilnya dikelompokkan per teks mapel unik -- kalau semua jenjang di
 * ruang itu kebetulan mapelnya sama (gak ada override kelas8/9 yang
 * kena), hasilnya cuma 1 baris seperti biasa. Kalau beda, tiap baris
 * nunjukin jenjang mana yang pakai mapel itu, jadi pengawas di ruang
 * campuran itu tau dia ngawasin lebih dari 1 mapel sekaligus.
 *
 * @param {object} jadwal - baris ujian_jadwal (mata_pelajaran + override kelas8/kelas9)
 * @param {string[]} jenjangSet - daftar jenjang yang ADA di ruangan itu, mis. ["7","8"]
 * @returns {Array<{jenjang: string[], mapel: string}>}
 */
function mataPelajaranUntukRuangan(jadwal, jenjangSet) {
  if (!jenjangSet || jenjangSet.length === 0) {
    return [{ jenjang: [], mapel: jadwal.mata_pelajaran }];
  }
  const jenjangPerMapel = {};
  jenjangSet.forEach((j) => {
    const mapel = mataPelajaranUntukJenjang(jadwal, j);
    if (!jenjangPerMapel[mapel]) jenjangPerMapel[mapel] = [];
    jenjangPerMapel[mapel].push(j);
  });
  return Object.entries(jenjangPerMapel).map(([mapel, jenjang]) => ({ jenjang, mapel }));
}

/**
 * Saranin kode_pengawas dari teacher_id, misal "G-01" -> "01". Dipakai
 * buat pre-fill input kode waktu admin nambah guru baru ke Daftar
 * Pengawas -- tetap bisa diedit manual sebelum disimpan, ini cuma saran
 * awal biar admin gak perlu ngetik dari nol.
 */
function sarankanKodeDariTeacherId(teacherId) {
  if (!teacherId) return "";
  const bagian = String(teacherId).split("-");
  return bagian[bagian.length - 1] || "";
}

/**
 * Ambil daftar guru yang SUDAH jadi pengawas (kode_pengawas terisi) --
 * dipakai di dropdown "Ganti guru" & checklist "Generate Pengawas" di
 * tab "Jadwal Ngawas". Gak semua guru ngawas, jadi yang belum ditambah
 * ke Daftar Pengawas (kode_pengawas masih null) sengaja tidak muncul di
 * sini -- tambahin dulu lewat tab "Daftar Pengawas".
 */
async function ambilDaftarGuru(supabase) {
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, teacher_id, kode_pengawas")
    .not("teacher_id", "is", null)
    .not("kode_pengawas", "is", null)
    .order("teacher_id", { ascending: true });

  if (error) throw error;
  return data || [];
}

/** Ambil semua sesi jadwal untuk 1 ujian. */
async function ambilJadwalSesi(supabase, ujianId) {
  const { data, error } = await supabase
    .from("ujian_jadwal")
    .select(
      "id, ujian_id, tanggal, sesi_ke, waktu_mulai, waktu_selesai, mata_pelajaran, mata_pelajaran_kelas8, mata_pelajaran_kelas9"
    )
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
        mata_pelajaran_kelas8: jadwal.mata_pelajaran_kelas8 || null,
        mata_pelajaran_kelas9: jadwal.mata_pelajaran_kelas9 || null,
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
    mata_pelajaran_kelas8: jadwal.mata_pelajaran_kelas8 || null,
    mata_pelajaran_kelas9: jadwal.mata_pelajaran_kelas9 || null,
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
    mata_pelajaran_kelas8: s.mata_pelajaran_kelas8?.trim() || null,
    mata_pelajaran_kelas9: s.mata_pelajaran_kelas9?.trim() || null,
  }));

  const { error } = await supabase.from("ujian_jadwal").insert(rows);
  if (error) throw error;
  return rows.length;
}

/**
 * Ambil daftar guru yang SUDAH jadi pengawas (kode_pengawas terisi) buat
 * ditampilkan & diedit di tabel "Daftar Pengawas". Guru yang belum
 * ditambahkan (kode_pengawas masih null) TIDAK muncul di sini -- mereka
 * ada di ambilCalonPengawas, ditambahin lewat tambahPengawasKode.
 * Urutan berdasarkan teacher_id (mis. "G-01", "G-16").
 */
async function ambilDaftarPengawasKode(supabase) {
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, teacher_id, kode_pengawas")
    .not("teacher_id", "is", null)
    .not("kode_pengawas", "is", null)
    .order("teacher_id", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Ambil daftar guru yang BELUM jadi pengawas (kode_pengawas masih null)
 * -- dipakai buat dropdown "Tambah Pengawas" di tabel "Daftar Pengawas",
 * soalnya gak semua guru kebagian tugas ngawas ujian.
 */
async function ambilCalonPengawas(supabase) {
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, teacher_id")
    .not("teacher_id", "is", null)
    .is("kode_pengawas", null)
    .order("teacher_id", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Tambahkan 1 guru ke Daftar Pengawas dengan ngisi kode_pengawas-nya.
 * Ini yang bikin guru itu muncul di ambilDaftarGuru / ambilDaftarPengawasKode
 * dan hilang dari ambilCalonPengawas.
 */
async function tambahPengawasKode(supabase, guruId, kode) {
  const kodeBersih = kode?.trim();
  if (!kodeBersih) throw new Error("Kode pengawas wajib diisi");

  const { error } = await supabase
    .from("users")
    .update({ kode_pengawas: kodeBersih })
    .eq("id", guruId);
  if (error) throw error;
}

/**
 * Hapus 1 guru dari Daftar Pengawas -- cukup ngosongin kode_pengawas
 * jadi null (BUKAN hapus baris user), soalnya kode_pengawas juga yang
 * jadi penanda "guru ini kebagian tugas ngawas atau enggak". Guru yang
 * dihapus dari sini otomatis balik muncul di ambilCalonPengawas.
 */
async function hapusPengawasKode(supabase, guruId) {
  const { error } = await supabase.from("users").update({ kode_pengawas: null }).eq("id", guruId);
  if (error) throw error;
}

/**
 * Simpan perubahan kode_pengawas. `perubahan` cuma berisi baris yang
 * BENERAN diedit admin (lihat handleSimpan di DaftarPengawasTab.js) --
 * bukan seluruh daftar guru, biar gak ada update sia-sia ke baris yang
 * gak diapa-apain. String kosong disimpen sebagai null (biar konsisten
 * sama guru yang emang belum pernah diisi kodenya).
 *
 * @param {object} supabase
 * @param {Array<{id: string, kode_pengawas: string}>} perubahan
 * @returns {Promise<number>} jumlah baris yang berhasil diupdate
 */
async function simpanKodePengawas(supabase, perubahan) {
  if (!perubahan || perubahan.length === 0) return 0;

  for (const item of perubahan) {
    const { error } = await supabase
      .from("users")
      .update({ kode_pengawas: item.kode_pengawas?.trim() || null })
      .eq("id", item.id);
    if (error) throw error;
  }
  return perubahan.length;
}

/**
 * Hitung berapa penugasan pengawas (baris ujian_pengawas, di UJIAN MANA PUN)
 * yang masih memakai guru-guru ini. Dipakai buat memperingatkan admin
 * SEBELUM guru dihapus dari Daftar Pengawas / Daftar Pengawas direset:
 * kode_pengawas jadi kosong tapi baris ujian_pengawas-nya tetap ada, jadi
 * guru itu masih tampil di jadwal tapi diam-diam TIDAK dapat Kartu Pengawas
 * (lihat cariPengawasTerlewat() di kartuUjianSupabase.js). Read-only.
 *
 * @param {string[]} guruIds
 * @returns {Promise<number>} total penugasan (sesi x ruangan) yang menempel
 */
async function hitungPenugasanPengawas(supabase, guruIds) {
  if (!guruIds || guruIds.length === 0) return 0;
  const { count, error } = await supabase
    .from("ujian_pengawas")
    .select("id", { count: "exact", head: true })
    .in("guru_id", guruIds);
  if (error) throw error;
  return count || 0;
}

/**
 * Cek ada gak penugasan pengawas (ujian_pengawas) yang nomor_ruangan-nya
 * SUDAH GAK VALID lagi buat komposisi ruangan yang sekarang tersimpan di
 * peserta_ujian -- normalnya ini gak pernah kejadian (resetUntukProsesUlang()
 * di pembagianRuanganSupabase.js otomatis bersihin ujian_pengawas begitu
 * versi skema diganti), tapi dipakai sebagai JARING PENGAMAN tambahan di
 * UI (banner peringatan) buat kasus di luar jalur normal itu -- misal data
 * lama dari sebelum fix ini ada, atau edit manual langsung ke database.
 *
 * @param {string[]} jadwalIds - semua id ujian_jadwal buat ujian ini
 * @param {number[]} nomorRuanganValid - nomor_ruangan yang ADA sekarang
 *   di peserta_ujian (ambil dari hasil ambilRuanganUjian(), map ke
 *   nomor_ruangan)
 * @returns {Promise<Array>} baris ujian_pengawas yang nomor_ruangan-nya
 *   TIDAK ada di nomorRuanganValid -- [{ id, jadwal_id, nomor_ruangan, nama }],
 *   array kosong kalau semuanya valid (atau belum ada jadwal sama sekali)
 */
async function cariPenugasanPengawasTidakValid(supabase, jadwalIds, nomorRuanganValid) {
  if (!jadwalIds || jadwalIds.length === 0) return [];

  const { data, error } = await supabase
    .from("ujian_pengawas")
    .select("id, jadwal_id, nomor_ruangan, users:guru_id (full_name)")
    .in("jadwal_id", jadwalIds);
  if (error) throw error;

  const setValid = new Set(nomorRuanganValid);
  return (data || [])
    .filter((row) => !setValid.has(row.nomor_ruangan))
    .map((row) => ({
      id: row.id,
      jadwal_id: row.jadwal_id,
      nomor_ruangan: row.nomor_ruangan,
      nama: row.users?.full_name || "-",
    }));
}

/**
 * Hapus sekaligus semua penugasan pengawas basi (id-id dari hasil
 * cariPenugasanPengawasTidakValid()) -- dipakai tombol "Bersihkan
 * Sekarang" di banner peringatan.
 * @param {string[]} idList - id baris ujian_pengawas yang mau dihapus
 * @returns {Promise<number>} jumlah baris yang dihapus
 */
async function bersihkanPenugasanPengawasTidakValid(supabase, idList) {
  if (!idList || idList.length === 0) return 0;
  const { error } = await supabase.from("ujian_pengawas").delete().in("id", idList);
  if (error) throw error;
  return idList.length;
}

export {
  ambilRuanganUjian,
  ambilDaftarGuru,
  ambilJadwalSesi,
  simpanJadwalSesi,
  simpanJadwalSesiBulk,
  mataPelajaranUntukJenjang,
  mataPelajaranUntukRuangan,
  hapusJadwalSesi,
  ambilPengawasUntukJadwal,
  tambahPengawas,
  hapusPengawas,
  kelompokkanJadwalPerHari,
  terapkanRotasiPengawasHarian,
  ambilDaftarPengawasKode,
  ambilCalonPengawas,
  tambahPengawasKode,
  hapusPengawasKode,
  sarankanKodeDariTeacherId,
  simpanKodePengawas,
  cariPenugasanPengawasTidakValid,
  hitungPenugasanPengawas,
  bersihkanPenugasanPengawasTidakValid,
};
