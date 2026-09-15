// setting/kelola-ujian/noPeserta.js
// Format nomor peserta ujian: "26-27-001", "26-27-002", dst.
//
// Aturannya:
// - Prefix = tahun ajaran disingkat 2 digit-2 digit ("2026/2027" -> "26-27")
// - Nomor urut BERJALAN TERUS untuk SEMUA peserta lintas ruangan (bukan
//   reset per ruangan). Jadi kalau Ruang 01 isi 40 orang, Ruang 02 mulai
//   dari 041, bukan balik ke 001.
//
// ===================== PENTING, BACA DULU =====================
// Ini murni format TAMPILAN. Yang kesimpan di kolom `no_peserta` tabel
// peserta_ujian sampai sekarang masih `no_kursi` (angka 1..N, RESET tiap
// ruangan) -- lihat simpanPembagianRuangan() di pembagianRuanganSupabase.js.
//
// Konsekuensinya: sub-fitur Kartu Ujian (kartuUjianSupabase.js) yang baca
// no_peserta langsung dari DB bakal nyetak "1", "2", "3" -- BEDA sama
// daftar peserta hasil export ini yang nyetak "26-27-001". Dua dokumen yang
// harusnya nyocok jadi nggak nyocok.
//
// Biar konsisten, salah satu harus dipilih:
//   (a) simpan format ini ke DB waktu "Simpan ke Database" (ubah
//       simpanPembagianRuangan), lalu Kartu Ujian otomatis ikut benar; ATAU
//   (b) biarin DB nyimpen angka urut, tapi Kartu Ujian juga dipaksa lewat
//       helper ini pas nyetak.
// Sampai salah satunya dikerjain, ketidakcocokan di atas MASIH ADA.
// ==============================================================

/**
 * "2026/2027" -> "26-27". Kalau formatnya nggak ketebak (mis. cuma "2026"
 * atau kosong), dibalikin apa adanya setelah dibersihin -- lebih baik
 * prefix-nya aneh daripada nomor pesertanya gagal kebentuk sama sekali.
 */
export function kodeTahunAjaran(tahunAjaran) {
  if (!tahunAjaran) return "";
  const bagian = String(tahunAjaran)
    .split(/[/\-–]/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (bagian.length >= 2) {
    return `${bagian[0].slice(-2)}-${bagian[1].slice(-2)}`;
  }
  return bagian[0]?.slice(-2) || "";
}

/**
 * Bangun peta id_siswa -> nomor peserta, dihitung dari SELURUH ruangan.
 *
 * WAJIB dikasih daftar ruangan LENGKAP, bukan cuma ruangan yang lagi mau
 * dicetak -- kalau cuma sebagian, nomor urutnya bakal mulai dari 001 lagi
 * dan nggak nyambung sama ruangan lain.
 *
 * @param {Array} semuaRuangan - [{ nomor_ruangan, siswa: [{ id, no_kursi }] }]
 * @param {string} tahunAjaran - mis. "2026/2027"
 * @param {Object} [opts]
 * @param {number} [opts.lebarDigit=3] - jumlah digit nomor urut (001..999).
 *   Kalau pesertanya lebih dari batas digit, nomornya manjang sendiri
 *   (1000) daripada kepotong.
 * @returns {Map<string, string>} id siswa -> "26-27-001"
 */
export function bangunPetaNoPeserta(semuaRuangan, tahunAjaran, { lebarDigit = 3 } = {}) {
  const prefix = kodeTahunAjaran(tahunAjaran);
  const peta = new Map();
  let urut = 0;

  // Urutan nomor ditentukan di sini: ruangan dari kecil ke besar, lalu di
  // dalam ruangan ikut no_kursi. Ini yang bikin nomor peserta selaras sama
  // urutan tempat duduk & urutan daftar yang ditempel di pintu.
  [...semuaRuangan]
    .sort((a, b) => a.nomor_ruangan - b.nomor_ruangan)
    .forEach((r) => {
      [...(r.siswa || [])]
        .sort((a, b) => (a.no_kursi || 0) - (b.no_kursi || 0))
        .forEach((s) => {
          urut++;
          const nomor = String(urut).padStart(lebarDigit, "0");
          peta.set(String(s.id), prefix ? `${prefix}-${nomor}` : nomor);
        });
    });

  return peta;
}
