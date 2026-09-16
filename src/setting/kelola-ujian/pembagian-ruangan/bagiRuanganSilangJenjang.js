// src/setting/kelola-ujian/pembagian-ruangan/bagiRuanganSilangJenjang.js
// Algoritma Pembagian Ruangan "V1 -- Silang Jenjang" (skema baru, acuan:
// Skema_Pembagian_Ruang_Ujian_SMP_Muslimin_2026_2027.xlsx).
//
// Beda mendasar sama 2 versi lama (bagiRuanganPerJenjang.js): di sini
// ruangan SENGAJA DICAMPUR LINTAS JENJANG lagi -- tiap ruang berisi 1
// potongan dari TIAP jenjang yang ikut ujian (PSAS: 1 potong kelas 7 +
// 1 potong kelas 8 + 1 potong kelas 9). Yang bikin beda dari skema
// paling awal (bagiRuangan.js) adalah pasangan kelasnya BERGESER tiap
// putaran, jadi tidak ada 2 ruang yang komposisi kelas asalnya sama.
//
// CARA KERJA (multi-jenjang, J = jumlah jenjang, n = jumlah kelas per jenjang):
//   - Jumlah ruang = n x J  (PSAS: 6 kelas x 3 jenjang = 18 ruang,
//     PSAT: 6 kelas x 2 jenjang = 12 ruang) -- persis kayak Excel.
//   - Tiap kelas dipecah jadi J bagian yang (nyaris) sama besar.
//   - Ruang diindeks m = 0..(n*J - 1), dipecah jadi:
//       r = putaran  = Math.floor(m / n)      (0..J-1)
//       i = slot     = m % n                  (0..n-1)
//     Ruang itu isinya, untuk tiap jenjang ke-j (j = 0 buat jenjang
//     terkecil): kelas index (i + r*j) % n.
//
//     Putaran 0 (r=0) -> offset 0 semua   -> 7A+8A+9A, 7B+8B+9B, ...
//     Putaran 1 (r=1) -> offset 0,1,2     -> 7A+8B+9C, 7B+8C+9D, ...
//     Putaran 2 (r=2) -> offset 0,2,4     -> 7A+8C+9E, 7B+8D+9F, ...
//   Itu sama persis sama sheet PSAS & PSAT di Excel.
//
// KASUS 1 JENJANG (PSAJ -- cuma kelas 9):
//   Rumus di atas bakal ngasih 1 kelas per ruang, padahal aturan di Excel
//   "setiap ruang berisi minimal 2 rombel berbeda". Jadi buat J = 1
//   dipakai skema PASANGAN: tiap kelas dibelah 2, lalu dipasangkan dalam
//   2 putaran yang pasangannya beda:
//       putaran 0: (K0,K1), (K2,K3), (K4,K5)
//       putaran 1: (K1,K2), (K3,K4), (K5,K0)   <- geser 1, muter balik
//   Hasilnya n ruang (6 kelas -> 6 ruang), tiap kelas muncul pas 2x.
//   Kalau jumlah kelas GANJIL, pasangan sempurna gak mungkin -- otomatis
//   fallback ke pola rantai muter (sama kayak V3) biar gak ada ruang yang
//   cuma keisi 1 kelas.
//
// CATATAN: angka per sel di Excel cuma ilustrasi kasar (dibikin manual),
// jadi hasil hitungan di sini bisa beda beberapa siswa per sel. Yang
// dijamin sama: (1) jumlah ruang, (2) POLA kelas asal per ruang, dan
// (3) total per kelas selalu pas [Cek Total = Data Asli].

/**
 * Pecah sebuah array jadi `jumlahBagian` potongan yang sebisa mungkin rata
 * (largest remainder: sisa pembagian dikasih ke potongan-potongan PERTAMA).
 * Urutan siswa di dalam kelas TIDAK diacak -- tetap urut sesuai data asli.
 */
function pecahRata(arr, jumlahBagian) {
  if (jumlahBagian <= 0) return [];
  if (jumlahBagian === 1) return [arr.slice()];

  const dasar = Math.floor(arr.length / jumlahBagian);
  const sisa = arr.length - dasar * jumlahBagian;

  const hasil = [];
  let posisi = 0;
  for (let i = 0; i < jumlahBagian; i++) {
    const ukuran = dasar + (i < sisa ? 1 : 0);
    hasil.push(arr.slice(posisi, posisi + ukuran));
    posisi += ukuran;
  }
  return hasil;
}

/**
 * Skema khusus 1 jenjang (PSAJ): tiap ruang = gabungan 2 kelas, disusun
 * dalam 2 putaran dengan pasangan yang berbeda (lihat header file).
 *
 * @param {string[]} urutanKelas - mis. ["9A","9B",...,"9F"]
 * @param {object} dataSiswaPerKelasJenjang
 * @returns {Array<string[]>} daftar ruang, tiap ruang = array nama kelas isinya
 */
function susunPasanganSatuJenjang(urutanKelas) {
  const n = urutanKelas.length;
  if (n === 0) return [];
  if (n === 1) return [[urutanKelas[0]]];

  // Jumlah kelas ganjil -> gak bisa dipasangkan sempurna 2 putaran.
  // Fallback ke rantai muter: ruang ke-i = kelas[i] + kelas[i+1] (wrap).
  if (n % 2 !== 0) {
    return Array.from({ length: n }, (_, i) => [urutanKelas[i], urutanKelas[(i + 1) % n]]);
  }

  const ruang = [];
  // Putaran 0: (K0,K1), (K2,K3), (K4,K5) ...
  for (let k = 0; k < n; k += 2) {
    ruang.push([urutanKelas[k], urutanKelas[k + 1]]);
  }
  // Putaran 1: (K1,K2), (K3,K4), ..., (K(n-1),K0) -- geser 1, muter balik
  for (let k = 1; k < n; k += 2) {
    ruang.push([urutanKelas[k], urutanKelas[(k + 1) % n]]);
  }
  return ruang;
}

/**
 * Bangun "peta ruang": tiap ruang berisi daftar nama kelas yang ikut di
 * dalamnya, sesuai pola silang di header file. Dipisah dari pembagian
 * siswa supaya polanya gampang diuji/dibaca sendiri.
 *
 * @param {string[]} urutanJenjang - mis. ["7","8","9"] (urut naik)
 * @param {object} kelasPerJenjang - { "7": ["7A",...], "8": [...], ... } (masing-masing udah tersortir)
 * @returns {Array<string[]>} [[kelas...], [kelas...], ...] panjangnya = jumlah ruang
 */
function bangunPetaRuangSilang(urutanJenjang, kelasPerJenjang) {
  const J = urutanJenjang.length;
  if (J === 0) return [];
  if (J === 1) return susunPasanganSatuJenjang(kelasPerJenjang[urutanJenjang[0]]);

  // n = jumlah kelas TERBANYAK di antara jenjang yang ikut. Jenjang yang
  // kelasnya lebih sedikit tetap kebagian tiap ruang (index-nya di-modulo
  // ke panjang kelasnya sendiri), cuma kelasnya jadi kepecah lebih banyak.
  const n = Math.max(...urutanJenjang.map((j) => kelasPerJenjang[j].length));
  const totalRuang = n * J;

  const peta = [];
  for (let m = 0; m < totalRuang; m++) {
    const r = Math.floor(m / n); // putaran
    const i = m % n; // slot dalam putaran
    const kelasRuangIni = urutanJenjang.map((jenjang, j) => {
      const daftar = kelasPerJenjang[jenjang];
      return daftar[(i + r * j) % daftar.length];
    });
    peta.push(kelasRuangIni);
  }
  return peta;
}

/**
 * V1 -- Silang Jenjang. Entry point utama, dipanggil dari
 * bagiRuanganPerJenjang() (orchestrator lama) waktu versiSkema = "silang".
 *
 * @param {object} dataSiswaPerKelas - { "7A": [...], "8B": [...], ... } SEMUA kelas yang ikut ujian
 * @returns {Array} [{ nomor_ruangan, jenjang, siswa: [{...,asal_kelas,no_kursi}] }]
 *   `jenjang` di sini diisi gabungan jenjang yang ada di ruang itu (mis.
 *   "7+8+9") -- beda sama 2 versi lama yang tiap ruang cuma 1 jenjang.
 *   Dipakai cuma buat label/grouping di UI.
 */
function bagiRuanganSilangJenjang(dataSiswaPerKelas) {
  // Kelompokkan nama kelas per jenjang, urut jenjang naik (7, 8, 9)
  const kelasPerJenjang = {};
  Object.keys(dataSiswaPerKelas).forEach((k) => {
    const jenjang = k.match(/^\d+/)?.[0];
    if (!jenjang) return; // skip key yang formatnya gak sesuai pola "7A"
    if (!kelasPerJenjang[jenjang]) kelasPerJenjang[jenjang] = [];
    kelasPerJenjang[jenjang].push(k);
  });
  const urutanJenjang = Object.keys(kelasPerJenjang).sort((a, b) => Number(a) - Number(b));
  urutanJenjang.forEach((j) => kelasPerJenjang[j].sort());

  if (urutanJenjang.length === 0) return [];

  const petaRuang = bangunPetaRuangSilang(urutanJenjang, kelasPerJenjang);
  if (petaRuang.length === 0) return [];

  // Hitung tiap kelas kepake di berapa ruang -> segitu jumlah potongannya.
  const jumlahPotonganPerKelas = {};
  petaRuang.forEach((kelasRuangIni) => {
    kelasRuangIni.forEach((kelas) => {
      jumlahPotonganPerKelas[kelas] = (jumlahPotonganPerKelas[kelas] || 0) + 1;
    });
  });

  // Pecah siswa tiap kelas jadi potongan-potongan itu (antrian FIFO --
  // potongan diambil urut, jadi urutan siswa asli tetap terjaga).
  const antrianPotongan = {};
  Object.entries(jumlahPotonganPerKelas).forEach(([kelas, jumlah]) => {
    const siswaKelas = (dataSiswaPerKelas[kelas] || []).map((s) => ({ ...s, asal_kelas: kelas }));
    antrianPotongan[kelas] = pecahRata(siswaKelas, jumlah);
  });

  return petaRuang.map((kelasRuangIni, idx) => {
    const siswaRuanganIni = [];
    kelasRuangIni.forEach((kelas) => {
      const potongan = antrianPotongan[kelas].shift() || [];
      siswaRuanganIni.push(...potongan);
    });

    const jenjangRuangIni = [
      ...new Set(kelasRuangIni.map((k) => k.match(/^\d+/)?.[0]).filter(Boolean)),
    ].sort((a, b) => Number(a) - Number(b));

    return {
      nomor_ruangan: idx + 1,
      jenjang: jenjangRuangIni.join("+"),
      siswa: siswaRuanganIni.map((s, i) => ({ ...s, no_kursi: i + 1 })),
    };
  });
}

export { bagiRuanganSilangJenjang, bangunPetaRuangSilang, pecahRata };
