// setting/kelola-ujian/pembagian-ruangan/noPeserta.js
// Format nomor peserta ujian: "2627-07-001", "2627-07-002", dst.
//
// Aturannya:
// - Prefix tahun = TAHUN MASUK siswa (bukan tahun ajaran aktif sekarang),
//   diambil dari 2 segmen pertama NIS siswa. Mis. NIS "26.27.07.001" ->
//   prefix "2627". Ini WAJIB dari NIS (bukan dihitung dari tahun ajaran
//   aktif dikurangi selisih kelas) supaya tetap benar untuk siswa
//   pindahan yang tahun masuknya gak ngikutin pola normal.
// - Kode angkatan (2 digit) diambil dari KELAS SEKARANG siswa (asal_kelas),
//   bukan dari NIS -- "7A" -> "07", "8C" -> "08", "9B" -> "09".
// - Nomor urut (3 digit) RESET per angkatan -- kelas 7, 8, 9 masing-masing
//   mulai dari 001, karena prefix-nya udah beda duluan jadi gak akan
//   tabrakan. Urutannya tetap ngikutin urutan ruangan & no_kursi.
//
// ===================== PENTING, BACA DULU =====================
// Kolom `no_peserta` di tabel peserta_ujian DISIMPAN pakai format dari
// bangunPetaNoPeserta() ini juga -- lihat simpanPembagianRuangan() di
// pembagianRuanganSupabase.js. Kartu Ujian (kartuUjianSupabase.js) baca
// no_peserta langsung dari DB, jadi begitu format di sini berubah, hasil
// export daftar peserta & Kartu Ujian otomatis tetap nyambung -- gak perlu
// diubah manual di dua tempat.
// ==============================================================

/**
 * Ambil 4 digit "tahun masuk" dari NIS siswa: "26.27.07.001" -> "2627".
 * Kalau formatnya nggak ketebak (NIS kosong/kurang dari 2 segmen), balikin
 * string kosong -- pemanggil harus siap dengan prefix yang jadi cuma
 * "{grade}-{urut}" tanpa tahun (lebih baik gitu daripada gagal kebentuk).
 */
export function kodeTahunMasukDariNis(nis) {
  if (!nis) return "";
  const bagian = String(nis)
    .split(".")
    .map((s) => s.trim())
    .filter(Boolean);
  if (bagian.length < 2) return "";
  const tahunMasuk = bagian[0].padStart(2, "0").slice(-2);
  const tahunLulus = bagian[1].padStart(2, "0").slice(-2);
  return `${tahunMasuk}${tahunLulus}`;
}

/**
 * Ambil kode angkatan 2 digit dari nama kelas SEKARANG: "7A" -> "07".
 */
export function kodeAngkatanDariKelas(namaKelas) {
  const angka = String(namaKelas || "").match(/^\d+/)?.[0];
  return angka ? angka.padStart(2, "0") : "";
}

/**
 * Bangun peta id_siswa -> nomor peserta, format "{tahunMasuk}-{angkatan}-{urut}".
 *
 * WAJIB dikasih daftar ruangan LENGKAP (semua angkatan sekaligus kalau
 * memang PSAS/PSAT/PSAJ-nya lintas angkatan), bukan cuma ruangan yang lagi
 * mau dicetak -- soalnya nomor urut dihitung per angkatan dari urutan
 * ruangan & no_kursi keseluruhan.
 *
 * @param {Array} semuaRuangan - [{ nomor_ruangan, siswa: [{ id, nis, asal_kelas, no_kursi }] }]
 * @param {Object} [opts]
 * @param {number} [opts.lebarDigit=3] - jumlah digit nomor urut (001..999).
 *   Kalau pesertanya lebih dari batas digit, nomornya manjang sendiri
 *   (1000) daripada kepotong.
 * @returns {Map<string, string>} id siswa -> "2627-07-001"
 */
export function bangunPetaNoPeserta(semuaRuangan, { lebarDigit = 3 } = {}) {
  const peta = new Map();
  const urutPerAngkatan = {}; // { "07": 3, "08": 12, ... }

  // Urutan nomor ditentukan di sini: ruangan dari kecil ke besar, lalu di
  // dalam ruangan ikut no_kursi -- SAMA seperti urutan tempat duduk &
  // urutan daftar yang ditempel di pintu. Karena bagiRuangan() sekarang
  // udah misahin angkatan per ruangan (gak dicampur), urutan ini otomatis
  // juga jadi "semua kelas 7 duluan, baru 8, baru 9".
  [...semuaRuangan]
    .sort((a, b) => a.nomor_ruangan - b.nomor_ruangan)
    .forEach((r) => {
      [...(r.siswa || [])]
        .sort((a, b) => (a.no_kursi || 0) - (b.no_kursi || 0))
        .forEach((s) => {
          const angkatan = kodeAngkatanDariKelas(s.asal_kelas);
          const tahunMasuk = kodeTahunMasukDariNis(s.nis);

          urutPerAngkatan[angkatan] = (urutPerAngkatan[angkatan] || 0) + 1;
          const urut = String(urutPerAngkatan[angkatan]).padStart(lebarDigit, "0");

          const nomor = tahunMasuk ? `${tahunMasuk}-${angkatan}-${urut}` : `${angkatan}-${urut}`;
          peta.set(String(s.id), nomor);
        });
    });

  return peta;
}
