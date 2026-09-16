// src/setting/kelola-ujian/pembagian-ruangan/bagiRuanganPerJenjang.js
// Algoritma Pembagian Ruangan versi BARU (menggantikan skema lama di
// bagiRuangan.js yang nyampur jenjang 7+8+9 dalam 1 ruangan).
//
// Skema baru: ruangan TIDAK dicampur lintas jenjang -- tiap jenjang
// (7/8/9) punya jatah ruangnya sendiri, dan JUMLAH RUANG = JUMLAH KELAS
// ASAL di jenjang itu (misal 6 kelas 7A-7F -> selalu 6 ruang buat
// jenjang 7), BUKAN dihitung dari kapasitas. Kapasitas yang diinput
// admin di layer Supabase sifatnya cuma INFORMASI/ACUAN pembagian rata
// (dipakai di tempat lain buat kasih peringatan kalau rata-rata per
// ruang jauh ngelewatin kapasitas), bukan hard limit yang menentukan
// jumlah ruang -- makanya fungsi-fungsi di sini SENGAJA tidak menerima
// parameter kapasitas sama sekali.
//
// CATATAN VERSI (per Sep 2026): sejak ada skema "Silang Jenjang"
// (bagiRuanganSilangJenjang.js) yang jadi V1, 2 versi di file ini TURUN
// NOMOR di UI -- yang di bawah ini ditulis sebagai "V1/V2" karena itu
// penamaan aslinya, tapi sekarang tampil sebagai:
//     V1 Rotasi Penuh  -> sekarang "V2 - Rotasi Penuh"   (kode: "rotasi")
//     V2 Rantai Muter  -> sekarang "V3 - Rantai Muter"   (kode: "rantai")
// Kode internal ("rotasi"/"rantai") sengaja BUKAN angka, biar penomoran
// di UI bisa digeser lagi kapan pun tanpa bikin data `versi_skema` yang
// udah tersimpan di DB jadi salah arti.
//
// 2 versi skema pembagian di dalam 1 jenjang:
//
// V1 -- ROTASI PENUH: tiap ruang kebagian potongan dari SEMUA kelas asal
// di jenjang itu (jadi 1 ruang isinya campuran kecil dari 7A,7B,7C,dst
// sekaligus). Cara kerja: gabung semua kelas dalam 1 jenjang jadi
// "antrian per kelas", lalu potong N ruangan (N = jumlah kelas) satu-
// satu, tiap potongan ngambil proporsional dari SEMUA antrian kelas yang
// masih tersisa (largest remainder method -- sama logic-nya kayak
// potongSatuRuangan() di bagiRuangan.js versi lama, cuma "kelas" di sini
// gantiin peran "angkatan" di situ). Besar potongan tiap ruang ditentuin
// dulu di awal: total dibagi N ruang, sisa pembulatan dikasih ke ruang-
// ruang PERTAMA.
//
// V2 -- RANTAI MUTER: tiap ruang cuma gabungan 2 kelas yang bersebelahan
// (R1=7A+7B, R2=7B+7C, ..., R terakhir = kelas terakhir + kelas pertama
// -- muter balik/wrap-around). Tiap kelas dibelah jadi 2 bagian: "bagian
// maju" (ceil, masuk ke ruang bareng kelas SESUDAHNYA) dan "bagian
// mundur" (floor, masuk ke ruang bareng kelas SEBELUMNYA) -- pembelahan
// ini SELALU pas nambah jadi total kelas asli, tapi ukuran tiap ruang
// sendiri BISA sedikit beda-beda (gak dipaksa rata persis kayak V1),
// karena tiap ruang cuma nampung remah-remahan dari 2 kelas doang.
//
// CATATAN: nilai contoh di file Excel yang dijadiin acuan awal cuma
// ilustrasi kasar (bukan hasil hitungan pasti dari algoritma ini) --
// jadi angka detail per sel BISA beda dikit dari Excel itu. Yang WAJIB
// sama: (1) total per kelas selalu pas [Cek Total = Data Asli],
// (2) V1 = campur semua kelas tiap ruang, (3) V2 = cuma 2 kelas
// bersebelahan tiap ruang.

import { bagiRuanganSilangJenjang } from "./bagiRuanganSilangJenjang";

/**
 * SUMBER KEBENARAN TUNGGAL daftar versi skema -- dipakai bareng sama UI
 * (PembagianRuanganTab.js) dan layer Supabase, biar nambah/geser versi
 * cukup diedit di satu tempat.
 *
 * `value` = kode yang DISIMPAN di kolom `ujian.versi_skema`. Sengaja
 * BUKAN "v1"/"v2"/"v3": nomor di UI bisa bergeser kapan pun (kayak yang
 * baru aja terjadi waktu Silang Jenjang masuk jadi V1), sedangkan nilai
 * yang udah nyangkut di DB gak boleh berubah artinya.
 */
const VERSI_SKEMA_LIST = [
  {
    value: "silang",
    label: "V1 - Silang Jenjang",
    deskripsi:
      "Tiap ruang campuran 1 potongan dari tiap jenjang, pasangan kelasnya bergeser tiap putaran. Jumlah ruang = jumlah kelas x jumlah jenjang.",
  },
  {
    value: "rotasi",
    label: "V2 - Rotasi Penuh",
    deskripsi: "Tiap ruang kecampur rata dari semua kelas asal di jenjang itu.",
  },
  {
    value: "rantai",
    label: "V3 - Rantai Muter",
    deskripsi: "Tiap ruang cuma gabungan 2 kelas yang bersebelahan.",
  },
];

const VERSI_DEFAULT = "silang";

/**
 * Peta nilai `versi_skema` LAMA yang udah terlanjur tersimpan di DB ke
 * kode baru. Record ujian yang dibikin sebelum Silang Jenjang ada nyimpen
 * "v1" (= Rotasi Penuh) dan "v2" (= Rantai Muter) -- tanpa peta ini,
 * ujian lama bakal kebaca sebagai versi yang SALAH begitu penomoran UI
 * digeser.
 */
const PETA_VERSI_LEGACY = {
  v1: "rotasi",
  v2: "rantai",
};

/**
 * Terjemahkan nilai versi apa pun (kode baru, nilai legacy, null/undefined
 * dari record lama yang kolomnya masih kosong) jadi kode yang valid.
 */
function normalisasiVersiSkema(versi) {
  if (!versi) return VERSI_DEFAULT;
  if (VERSI_SKEMA_LIST.some((o) => o.value === versi)) return versi;
  return PETA_VERSI_LEGACY[versi] || VERSI_DEFAULT;
}

/** Label tampilan buat sebuah kode versi, mis. "V2 - Rotasi Penuh". */
function labelVersiSkema(versi) {
  const kode = normalisasiVersiSkema(versi);
  return VERSI_SKEMA_LIST.find((o) => o.value === kode)?.label || kode;
}

/**
 * Helper internal: potong 1 "ruangan" dari beberapa antrian (per kelas)
 * sekaligus, proporsional ke sisa tiap antrian SAAT INI, pakai largest
 * remainder method (floor dulu, sisa kursi karena pembulatan dikasih ke
 * yang desimalnya paling gede) -- biar totalnya PAS ke targetRuangIni
 * walau hasil bagi antar kelas gak bulat.
 *
 * @param {string[]} urutanKelas - urutan key kelas di antrianPerKelas (fixed, gak berubah)
 * @param {object} antrianPerKelas - { [kelas]: array siswa tersisa } -- DIUBAH langsung (di-splice)
 * @param {number} targetRuangIni - jumlah siswa yang harus diambil buat ruangan ini
 * @returns {Array} siswa yang diambil buat ruangan ini (gabungan dari semua kelas)
 */
function potongProporsional(urutanKelas, antrianPerKelas, targetRuangIni) {
  const sisaPerKelas = urutanKelas.map((k) => antrianPerKelas[k].length);
  const totalSisa = sisaPerKelas.reduce((s, v) => s + v, 0);
  if (totalSisa === 0) return [];

  // jaga-jaga kalau sisa antrian udah lebih kecil dari target (ruang terakhir)
  const targetAman = Math.min(targetRuangIni, totalSisa);

  const jatahEksak = sisaPerKelas.map((n) => (n / totalSisa) * targetAman);
  const jatahBulat = jatahEksak.map(Math.floor);
  let sisaKursi = targetAman - jatahBulat.reduce((s, v) => s + v, 0);

  const urutanSisaDesimal = jatahEksak
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < sisaKursi; k++) {
    jatahBulat[urutanSisaDesimal[k].i]++;
  }

  const siswaRuanganIni = [];
  urutanKelas.forEach((k, i) => {
    const ambil = antrianPerKelas[k].splice(0, jatahBulat[i]);
    siswaRuanganIni.push(...ambil);
  });
  return siswaRuanganIni;
}

/**
 * Hitung target jumlah siswa per ruang (largest remainder), dipakai V1
 * buat mastiin ukuran tiap ruang serata mungkin: total dibagi jumlah
 * ruang, sisa pembulatan dikasih ke ruang-ruang PERTAMA.
 */
function hitungTargetPerRuang(total, jumlahRuang) {
  const dasar = Math.floor(total / jumlahRuang);
  const sisa = total - dasar * jumlahRuang;
  return Array.from({ length: jumlahRuang }, (_, i) => dasar + (i < sisa ? 1 : 0));
}

/**
 * V1 -- Rotasi Penuh, buat 1 jenjang.
 * @param {object} dataSiswaPerKelasJenjang - { "7A": [...], "7B": [...], ... } (cuma 1 jenjang)
 * @returns {Array} [{ siswa: [...] }] per ruang -- nomor ruang belum di-set
 *   di sini, biar gampang digabung lintas jenjang di orchestrator.
 */
function bagiSatuJenjangV1(dataSiswaPerKelasJenjang) {
  const urutanKelas = Object.keys(dataSiswaPerKelasJenjang).sort(); // 7A,7B,7C,...
  const jumlahRuang = urutanKelas.length;
  if (jumlahRuang === 0) return [];

  const antrianPerKelas = {};
  urutanKelas.forEach((k) => {
    antrianPerKelas[k] = dataSiswaPerKelasJenjang[k].map((s) => ({ ...s, asal_kelas: k }));
  });

  const totalSiswa = urutanKelas.reduce((sum, k) => sum + antrianPerKelas[k].length, 0);
  const targetPerRuang = hitungTargetPerRuang(totalSiswa, jumlahRuang);

  const hasil = [];
  for (let i = 0; i < jumlahRuang; i++) {
    const siswaRuanganIni = potongProporsional(urutanKelas, antrianPerKelas, targetPerRuang[i]);
    hasil.push({ siswa: siswaRuanganIni.map((s, idx) => ({ ...s, no_kursi: idx + 1 })) });
  }
  return hasil;
}

/**
 * V2 -- Rantai Muter, buat 1 jenjang.
 * Tiap kelas dibelah 2: "bagian maju" (ceil, masuk ke ruang bareng kelas
 * SESUDAHNYA) dan "bagian mundur" (floor, masuk ke ruang bareng kelas
 * SEBELUMNYA) -- urutan kelas muter balik ke awal di ujung (kelas
 * terakhir "maju"-nya nyambung ke kelas pertama).
 *
 * Kalau cuma ada 1 kelas di jenjang itu, gak ada pasangan buat dirantai
 * -- fallback jadi 1 ruang isi semua siswa kelas itu (sama kayak V1).
 *
 * @param {object} dataSiswaPerKelasJenjang - { "7A": [...], "7B": [...], ... }
 * @returns {Array} [{ siswa: [...] }] per ruang
 */
function bagiSatuJenjangV2(dataSiswaPerKelasJenjang) {
  const urutanKelas = Object.keys(dataSiswaPerKelasJenjang).sort();
  const n = urutanKelas.length;
  if (n === 0) return [];
  if (n === 1) {
    const k = urutanKelas[0];
    const siswa = dataSiswaPerKelasJenjang[k].map((s, idx) => ({
      ...s,
      asal_kelas: k,
      no_kursi: idx + 1,
    }));
    return [{ siswa }];
  }

  // Belah tiap kelas jadi bagianMaju (ceil, ke ruang index sama) dan
  // bagianMundur (floor, ke ruang index sebelumnya -- wrap: kelas 0
  // "mundur"-nya nyambung ke ruang index n-1).
  const bagianMaju = {};
  const bagianMundur = {};
  urutanKelas.forEach((k) => {
    const siswaKelas = dataSiswaPerKelasJenjang[k].map((s) => ({ ...s, asal_kelas: k }));
    const jumlahMaju = Math.ceil(siswaKelas.length / 2);
    bagianMaju[k] = siswaKelas.slice(0, jumlahMaju);
    bagianMundur[k] = siswaKelas.slice(jumlahMaju);
  });

  // Ruang ke-i = bagianMaju kelas[i] + bagianMundur kelas[i+1] (wrap)
  const hasil = [];
  for (let i = 0; i < n; i++) {
    const kelasIni = urutanKelas[i];
    const kelasSelanjutnya = urutanKelas[(i + 1) % n];
    const siswaRuanganIni = [...bagianMaju[kelasIni], ...bagianMundur[kelasSelanjutnya]];
    hasil.push({ siswa: siswaRuanganIni.map((s, idx) => ({ ...s, no_kursi: idx + 1 })) });
  }
  return hasil;
}

/**
 * Orchestrator utama -- dipanggil dari layer Supabase (pembagianRuanganSupabase.js)
 * gantiin bagiRuangan() yang lama.
 *
 * @param {object} dataSiswaPerKelas - SEMUA kelas yang ikut ujian ini (lintas jenjang),
 *   format sama seperti input bagiRuangan() lama: { "7A": [...], "8B": [...], ... }
 * @param {"silang"|"rotasi"|"rantai"} versiSkema - versi algoritma yang dipilih
 *   admin. Nilai legacy "v1"/"v2" (dari record ujian lama di DB) otomatis
 *   dipetakan ke "rotasi"/"rantai" lewat normalisasiVersiSkema().
 *   "silang" dilempar ke bagiRuanganSilangJenjang() karena skema itu
 *   mencampur jenjang, jadi gak lewat jalur per-jenjang di bawah.
 * @returns {Array} [{ nomor_ruangan, jenjang, siswa: [{ id, nama, nis, asal_kelas, no_kursi }] }]
 *   nomor_ruangan JALAN TERUS lintas jenjang (jenjang kecil duluan: 7,
 *   lalu 8, lalu 9). Field `jenjang` ditambahin per ruang biar gampang
 *   di-group di UI (tab Komposisi Ruangan / Preview) tanpa perlu
 *   nebak-nebak dari asal_kelas siswa pertamanya.
 */
function bagiRuanganPerJenjang(dataSiswaPerKelas, versiSkema = VERSI_DEFAULT) {
  const versi = normalisasiVersiSkema(versiSkema);

  // V1 Silang Jenjang punya alur sendiri (ruang dicampur lintas jenjang),
  // jadi langsung dilempar ke modulnya dan gak ikut loop per-jenjang.
  if (versi === "silang") {
    return bagiRuanganSilangJenjang(dataSiswaPerKelas);
  }

  const semuaKelas = Object.keys(dataSiswaPerKelas);

  // Kelompokkan nama kelas per jenjang, urut jenjang naik (7, 8, 9, ...)
  const kelasPerJenjang = {};
  semuaKelas.forEach((k) => {
    const jenjang = k.match(/^\d+/)?.[0];
    if (!jenjang) return; // skip key yang formatnya gak sesuai pola "7A" dst
    if (!kelasPerJenjang[jenjang]) kelasPerJenjang[jenjang] = [];
    kelasPerJenjang[jenjang].push(k);
  });
  const urutanJenjang = Object.keys(kelasPerJenjang).sort((a, b) => Number(a) - Number(b));

  const hasilAkhir = [];
  let nomorRuanganBerjalan = 1;

  for (const jenjang of urutanJenjang) {
    const dataSiswaPerKelasJenjang = {};
    kelasPerJenjang[jenjang].forEach((k) => {
      dataSiswaPerKelasJenjang[k] = dataSiswaPerKelas[k];
    });

    const hasilJenjangIni =
      versi === "rantai"
        ? bagiSatuJenjangV2(dataSiswaPerKelasJenjang)
        : bagiSatuJenjangV1(dataSiswaPerKelasJenjang);

    hasilJenjangIni.forEach((ruang) => {
      hasilAkhir.push({
        nomor_ruangan: nomorRuanganBerjalan,
        jenjang,
        siswa: ruang.siswa,
      });
      nomorRuanganBerjalan++;
    });
  }

  return hasilAkhir;
}

/**
 * Bentuk matrix Ruang x Kelas dari hasil bagiRuanganPerJenjang() -- dipakai
 * nanti di tab "Komposisi Ruangan" buat nampilin tabel gaya Excel (per
 * jenjang: baris = ruang, kolom = kelas asal, + baris "Cek Total" &
 * "Data Asli" buat validasi visual).
 *
 * @param {Array} hasilRuangan - output bagiRuanganPerJenjang()
 * @param {object} dataSiswaPerKelas - data asli (buat baris "Data Asli" --
 *   jumlah siswa per kelas SEBELUM dibagi ruangan, dibandingin sama "Cek Total")
 * @returns {Array} [{ jenjang, urutanKelas: [...], ruang: [{ nomor_ruangan, perKelas: {kelas: jumlah}, total }],
 *   cekTotal: {kelas: jumlah}, dataAsli: {kelas: jumlah} }]
 */
function bangunMatrixKomposisi(hasilRuangan, dataSiswaPerKelas) {
  const jenjangSet = [...new Set(hasilRuangan.map((r) => r.jenjang))].sort(
    (a, b) => Number(a) - Number(b)
  );

  return jenjangSet.map((jenjang) => {
    const ruangJenjangIni = hasilRuangan.filter((r) => r.jenjang === jenjang);
    const urutanKelas = [
      ...new Set(ruangJenjangIni.flatMap((r) => r.siswa.map((s) => s.asal_kelas))),
    ].sort();

    const ruang = ruangJenjangIni.map((r) => {
      const perKelas = {};
      urutanKelas.forEach((k) => (perKelas[k] = 0));
      r.siswa.forEach((s) => {
        perKelas[s.asal_kelas] = (perKelas[s.asal_kelas] || 0) + 1;
      });
      return { nomor_ruangan: r.nomor_ruangan, perKelas, total: r.siswa.length };
    });

    const cekTotal = {};
    urutanKelas.forEach((k) => {
      cekTotal[k] = ruang.reduce((sum, r) => sum + (r.perKelas[k] || 0), 0);
    });

    const dataAsli = {};
    urutanKelas.forEach((k) => {
      dataAsli[k] = (dataSiswaPerKelas[k] || []).length;
    });

    return { jenjang, urutanKelas, ruang, cekTotal, dataAsli };
  });
}

export {
  bagiRuanganPerJenjang,
  bangunMatrixKomposisi,
  VERSI_SKEMA_LIST,
  VERSI_DEFAULT,
  normalisasiVersiSkema,
  labelVersiSkema,
};
