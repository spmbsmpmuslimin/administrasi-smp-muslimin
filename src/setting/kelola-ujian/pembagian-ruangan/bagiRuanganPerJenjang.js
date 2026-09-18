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
// V2 -- GABUNG KELAS SEJENJANG (diganti total per Sep 2026, lihat catatan
// PERUBAHAN V2 di bawah): BEDA sama V1 & V3 karena V2 SEKARANG LINTAS
// JENJANG juga (kayak "silang"), bukan diproses 1 jenjang sendiri-sendiri
// lewat loop orchestrator -- makanya masuk lewat jalur sendiri
// (bagiRuanganGabungHuruf), persis kayak "silang".
//
// KASUS 2 JENJANG (PSAT: 7+8): kelas digabung berdasarkan HURUF YANG SAMA
// lintas jenjang (7A+8A jadi 1 grup, 7B+8B grup lain, dst -- BUKAN
// proporsional-nyambung-antar-huruf kayak bagiRuangan.js versi paling
// lama). Tiap grup itu lalu dipecah PROPORSIONAL (largest remainder,
// sama logic-nya kayak potongProporsional yang dipakai V1) jadi 2 ruang
// per grup huruf.
//   Contoh (7A=35, 8A=40): grup "A" total 75 siswa -> 2 ruang, proporsional
//   ke sisa 7A vs 8A saat itu (kalau pas rata: Ruang1=20+20, Ruang2=15+20).
//   Grup "B" (7B+8B) jadi Ruang berikutnya, dst -- gak ada nyambung sisa
//   antar huruf, tiap grup huruf berdiri sendiri.
//   Kalau jumlah kelas antar jenjang beda (mis. 7 ada 6 kelas, 8 cuma 5),
//   jenjang yang lebih pendek diindeks muter (modulo), sama kayak
//   bangunPetaRuangSilang() di bagiRuanganSilangJenjang.js.
//   Fungsi generiknya (prosesGrupHurufMultiJenjang) sebenarnya nerima
//   berapa pun jumlah jenjang, tapi SEKARANG cuma dipanggil buat 2 jenjang
//   (PSAT) -- kasus 3 jenjang punya jalur sendiri, lihat di bawah.
//
// KASUS 1 JENJANG (PSAJ: 9 doang): gak ada jenjang lain buat dipasangin
// per huruf, jadi PAKAI ULANG pola "silang" versi 1 jenjang
// (susunPasanganSatuJenjang): pasangan huruf BERDEKATAN (9A+9B, 9C+9D,
// dst, muter balik/wrap-around kalau kelasnya ganjil), 1 GRUP = 1 RUANG.
// FIX (Sep 2026): karena tiap kelas bisa muncul di 2 pasangan (pola
// "muter balik"-nya susunPasanganSatuJenjang), kelasnya WAJIB dipecah rata
// dulu (pecahRata) sebelum diisi ke tiap ruang -- kalau dibaca utuh tiap
// kemunculan, siswa yang sama kehitung dobel di 2 ruang (bug lama, udah
// dibenerin, lihat prosesPasanganSatuJenjang()).
//
// KASUS 3 JENJANG (PSAS: 7+8+9) -- FIX Sep 2026, sesuai praktek asli TU:
// kelas 9 SELALU dipisah total, TIDAK ikut campur proporsional sama 7 & 8
// (beda sama versi sebelum fix ini, yang salah nyampur 7A+8A+9A jadi 1
// grup 3-arah). Yang bener:
//   - Kelas 7 + 8 digabung pake skema KASUS 2 JENJANG di atas (7A+8A,
//     7B+8B, dst, tiap grup dipecah proporsional jadi 2 ruang) -> 12 ruang.
//   - Kelas 9 diproses SENDIRI pake skema KASUS 1 JENJANG di atas
//     (9A+9B, 9C+9D, dst, digabung utuh gak dipecah) -> 6 ruang.
//   - Nomor ruang: 7+8 duluan (Ruang 1-12), baru nyusul kelas 9 (Ruang
//     13-18).
//   CATATAN: cabang ini di-hardcode buat "jenjang paling tinggi dipisah,
//   sisanya digabung" KHUSUS pas ada TEPAT 3 jenjang, karena cuma itu yang
//   ada sekarang (PSAS=3, PSAT=2, PSAJ=1). Kalau kelak ada jenis ujian
//   baru dengan susunan jenjang lain (mis. 4 jenjang, atau 3 jenjang tapi
//   aturannya beda), cabang ini WAJIB direvisit -- jangan asumsikan pola
//   ini otomatis benar buat kombinasi jenjang lain.
//
// PERUBAHAN V2 (Sep 2026): sebelumnya V2 = "Rantai Muter" per-jenjang
// (tiap ruang cuma 2 kelas bersebelahan DALAM 1 jenjang yang sama, kode
// lama ada di git history). Diganti total atas permintaan panitia karena
// kebutuhan sebenarnya adalah gabung ANTAR jenjang per huruf, bukan antar
// huruf DALAM 1 jenjang. Kode `versi_skema` di DB ("rantai") SENGAJA
// TIDAK diganti (biar record lama yang udah nyimpen "rantai"/"v2" tetap
// kebaca sebagai versi ini) -- konsekuensinya, kalau ada ujian LAMA yang
// pernah diproses pakai V2 versi sebelumnya dan di-"Proses Ulang", hasil
// barunya bakal pakai algoritma BARU ini, bukan algoritma lama.
//
// CATATAN: nilai contoh di file Excel yang dijadiin acuan awal cuma
// ilustrasi kasar (bukan hasil hitungan pasti dari algoritma ini) --
// jadi angka detail per sel BISA beda dikit dari Excel itu. Yang WAJIB
// sama: (1) total per kelas selalu pas [Cek Total = Data Asli],
// (2) V1 = campur semua kelas tiap ruang, (3) V2 = grup per huruf dalam
// jenjang yang sama (2 jenjang) / pasangan huruf berdekatan (1 jenjang) /
// 7+8 digabung + 9 dipisah (3 jenjang, khusus PSAS).

import {
  bagiRuanganSilangJenjang,
  susunPasanganSatuJenjang,
  pecahRata,
} from "./bagiRuanganSilangJenjang";

/**
 * SUMBER KEBENARAN TUNGGAL daftar versi skema -- dipakai bareng sama UI
 * (PembagianRuanganTab.js) dan layer Supabase, biar nambah/geser versi
 * cukup diedit di satu tempat.
 *
 * `value` = kode yang DISIMPAN di kolom `ujian.versi_skema`. Sengaja
 * BUKAN "v1"/"v2"/"v3": nomor di UI bisa bergeser kapan pun (kayak yang
 * baru aja terjadi waktu Silang Jenjang dipindah dari V1 ke V3), sedangkan
 * nilai yang udah nyangkut di DB gak boleh berubah artinya.
 */
const VERSI_SKEMA_LIST = [
  {
    value: "rotasi",
    label: "V1 - Campur Merata (1 Jenjang)",
    deskripsi: "Tiap ruang kecampur rata dari semua kelas asal di jenjang itu.",
  },
  {
    value: "rantai",
    label: "V2 - Gabung Kelas Sejenjang",
    deskripsi:
      "Kelas digabung per huruf yang sama lintas jenjang (7A+8A, 7B+8B, dst), dipecah proporsional ke sejumlah ruang = jumlah jenjang. Khusus 1 jenjang (mis. kelas 9 doang): gabung 2 kelas berdekatan per huruf (9A+9B, dst), 1 ruang per pasangan.",
  },
  {
    value: "silang",
    label: "V3 - Silang Jenjang",
    deskripsi:
      "Tiap ruang campuran 1 potongan dari tiap jenjang, pasangan kelasnya bergeser tiap putaran. Jumlah ruang = jumlah kelas x jumlah jenjang.",
  },
];

// SENGAJA GAK ADA VERSI_DEFAULT.
// Dulu ada konstanta VERSI_DEFAULT yang dipakai sebagai fallback di mana-
// mana (radio kepilih duluan, parameter fungsi, nilai balik normalisasi
// kalau inputnya gak dikenal). Itu dicabut karena 2 alasan:
//   1. Pemilihan versi itu KEPUTUSAN PANITIA, bukan technical default --
//      tiap sekolah/tiap jenis ujian bisa beda kebutuhan, jadi admin yang
//      mesti milih sadar-sadar, bukan ikut apa pun yang kebetulan kepilih.
//   2. Fallback diam-diam bikin bug versi nyasar jadi gak keliatan: kalau
//      ada kode yang lupa ngoper versi, dulu dia jalan mulus pakai versi
//      default; sekarang dia LANGSUNG error, jadi ketahuan pas dites.
// Konsekuensinya: bagiRuanganPerJenjang() WAJIB dioper versi yang valid,
// dan UI gak boleh manggil "Proses Pembagian" sebelum admin milih.

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
 * Arti `versi_skema` yang KOSONG (null/"") pada record ujian yang UDAH ADA
 * di DB. Record kayak gitu dibikin sebelum kolom versi_skema kepakai, dan
 * waktu itu satu-satunya perilaku yang ada = campur merata dalam 1 jenjang
 * (sekarang kodenya "rotasi"). Jadi ini FAKTA SEJARAH, bukan "default" --
 * makanya nilainya di-hardcode di sini dan TIDAK ikut bergeser kalau
 * urutan/isi VERSI_SKEMA_LIST diubah lagi nanti.
 */
const VERSI_RECORD_LAMA_KOSONG = "rotasi";

/** true kalau `versi` adalah kode versi yang dikenal saat ini. */
function versiSkemaValid(versi) {
  return VERSI_SKEMA_LIST.some((o) => o.value === versi);
}

/**
 * Terjemahkan sebuah nilai versi jadi kode yang dikenal.
 * Nilai legacy ("v1"/"v2") dipetakan; nilai kosong / gak dikenal
 * mengembalikan null -- SENGAJA null, bukan fallback ke versi mana pun,
 * biar pemanggilnya yang mutusin mau diapain (UI: minta admin milih,
 * pembacaan record lama: pakai normalisasiVersiSkemaTersimpan()).
 *
 * @returns {string|null}
 */
function normalisasiVersiSkema(versi) {
  if (!versi) return null;
  if (versiSkemaValid(versi)) return versi;
  return PETA_VERSI_LEGACY[versi] || null;
}

/**
 * Versi khusus buat baca kolom `versi_skema` dari record ujian yang UDAH
 * TERSIMPAN. Bedanya sama normalisasiVersiSkema(): nilai kosong di sini
 * BUKAN "belum milih", tapi record warisan -> diartikan sebagai
 * VERSI_RECORD_LAMA_KOSONG. Jangan dipakai buat nilai yang datang dari
 * input admin.
 *
 * @returns {string|null} null cuma kalau isinya kode yang bener-bener asing
 *   (mis. hasil edit manual lewat SQL yang salah ketik).
 */
function normalisasiVersiSkemaTersimpan(versi) {
  if (!versi) return VERSI_RECORD_LAMA_KOSONG;
  return normalisasiVersiSkema(versi);
}

/**
 * Label tampilan buat sebuah kode versi, mis. "V1 - Campur Merata
 * (1 Jenjang)". Dikasih teks penanda kalau versinya belum dipilih atau
 * kodenya gak dikenal, biar gak pernah nampilin string kosong di UI.
 */
function labelVersiSkema(versi) {
  const kode = normalisasiVersiSkema(versi);
  if (!kode) return versi ? `(versi tidak dikenal: ${versi})` : "(belum dipilih)";
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
 * Bentuk baris hasil 1 ruangan buat skema V2: label jenjang gabungan
 * (mis. "7+8") + siswa yang diberi nomor kursi urut. Dipisah jadi fungsi
 * module-level (bukan nested) supaya bisa dipakai bareng oleh
 * prosesPasanganSatuJenjang() dan prosesGrupHurufMultiJenjang() --
 * dua-duanya kepake sekaligus di cabang "3 jenjang".
 */
function buatBarisHasilGabungHuruf(kelasRuangIni, siswaRuanganIni) {
  const jenjangRuangIni = [
    ...new Set(kelasRuangIni.map((k) => k.match(/^\d+/)?.[0]).filter(Boolean)),
  ].sort((a, b) => Number(a) - Number(b));
  return {
    jenjang: jenjangRuangIni.join("+"),
    siswa: siswaRuanganIni.map((s, idx) => ({ ...s, no_kursi: idx + 1 })),
  };
}

/**
 * Skema pasangan huruf berdekatan buat 1 jenjang (9A+9B, 9C+9D, dst,
 * wrap-around kalau ganjil). Dipakai buat 2 situasi: (1) SEMUA jenjang di
 * ujian itu cuma 1 (PSAJ), dan (2) 1 jenjang tertentu sengaja DIPISAH dari
 * jenjang lain (kelas 9 di PSAS, kasus 3 jenjang).
 *
 * CATATAN (fix bug lama, bukan cuma buat kasus 3 jenjang): susunPasanganSatuJenjang()
 * itu didesain BARENG downstream-nya yang mecah tiap kelas (lihat
 * bagiRuanganSilangJenjang() -- kelas yang muncul di N pasangan otomatis
 * dipecah jadi N potongan pake pecahRata). Kalau ukuran kelas GENAP, tiap
 * kelas muncul PAS 2x di hasil susunPasanganSatuJenjang (lihat docstring-nya
 * di bagiRuanganSilangJenjang.js). Sebelumnya di sini kelasnya dibaca UTUH
 * tiap kali muncul (gak dipecah) -- akibatnya siswa yang sama kehitung
 * DOBEL di 2 ruang sekaligus (total per kelas jadi 2x lipat dari data asli).
 * Makanya di sini WAJIB dipecah dulu, sama persis kayak
 * bagiRuanganSilangJenjang() nanganin kasus 1 jenjangnya sendiri.
 *
 * @param {string[]} daftarKelasJenjangIni - mis. ["9A",...,"9F"] (udah tersortir)
 */
function prosesPasanganSatuJenjang(daftarKelasJenjangIni, dataSiswaPerKelas) {
  const petaPasangan = susunPasanganSatuJenjang(daftarKelasJenjangIni);

  const jumlahPotonganPerKelas = {};
  petaPasangan.forEach((kelasRuangIni) => {
    kelasRuangIni.forEach((k) => {
      jumlahPotonganPerKelas[k] = (jumlahPotonganPerKelas[k] || 0) + 1;
    });
  });

  const antrianPotongan = {};
  Object.entries(jumlahPotonganPerKelas).forEach(([kelas, jumlah]) => {
    const siswaKelas = (dataSiswaPerKelas[kelas] || []).map((s) => ({ ...s, asal_kelas: kelas }));
    antrianPotongan[kelas] = pecahRata(siswaKelas, jumlah);
  });

  return petaPasangan.map((kelasRuangIni) => {
    const siswaRuanganIni = [];
    kelasRuangIni.forEach((k) => {
      const potongan = antrianPotongan[k].shift() || [];
      siswaRuanganIni.push(...potongan);
    });
    return buatBarisHasilGabungHuruf(kelasRuangIni, siswaRuanganIni);
  });
}

/**
 * Skema grup-per-huruf-proporsional buat jenjang-jenjang yang MEMANG mau
 * digabung jadi satu (dulu ini dipanggil dengan SEMUA jenjang sekaligus
 * termasuk kasus 3 jenjang PSAS -- sekarang khusus dioper jenjang yang
 * digabung aja, lihat catatan "KASUS 3 JENJANG" di header file). Grup per
 * huruf (index kelas ke-i di tiap jenjang), tiap grup dipecah proporsional
 * jadi J ruang (J = jumlah jenjang yang dioper). Jenjang yang kelasnya
 * lebih sedikit diindeks muter (modulo), sama kayak bangunPetaRuangSilang()
 * -- KONSEKUENSINYA, kalau n (jumlah grup) lebih banyak dari panjang kelas
 * jenjang itu, ada kelas yang kepake di LEBIH DARI 1 grup (mis. 7 = 3
 * kelas, 8 = 2 kelas -> n=3, 8A kepake di grup ke-0 DAN ke-2). Makanya
 * kelas gak boleh langsung "dibaca utuh" tiap kali dipake di suatu grup
 * (bisa kehitung dobel) -- harus dipecah DULU jadi sebanyak jumlah grup
 * yang makainya (pakai pecahRata, sama persis kayak
 * bagiRuanganSilangJenjang.js nanganin kasus serupa), baru tiap grup
 * ngambil 1 potongan jatahnya masing-masing secara FIFO.
 *
 * @param {string[]} daftarJenjang - jenjang yang mau digabung, mis. ["7","8"]
 * @param {object} kelasPerJenjang - { "7": ["7A",...], "8": [...], ... } (masing-masing tersortir)
 */
function prosesGrupHurufMultiJenjang(daftarJenjang, kelasPerJenjang, dataSiswaPerKelas) {
  const J = daftarJenjang.length;
  const n = Math.max(...daftarJenjang.map((j) => kelasPerJenjang[j].length));

  const petaGrup = [];
  for (let i = 0; i < n; i++) {
    petaGrup.push(
      daftarJenjang.map((j) => {
        const daftar = kelasPerJenjang[j];
        return daftar[i % daftar.length];
      })
    );
  }

  const jumlahPotonganPerKelas = {};
  petaGrup.forEach((kelasGrupIni) => {
    kelasGrupIni.forEach((k) => {
      jumlahPotonganPerKelas[k] = (jumlahPotonganPerKelas[k] || 0) + 1;
    });
  });

  const antrianPotongan = {};
  Object.entries(jumlahPotonganPerKelas).forEach(([kelas, jumlah]) => {
    const siswaKelas = (dataSiswaPerKelas[kelas] || []).map((s) => ({ ...s, asal_kelas: kelas }));
    antrianPotongan[kelas] = pecahRata(siswaKelas, jumlah);
  });

  const hasil = [];
  petaGrup.forEach((kelasGrupIni) => {
    const antrianPerKelas = {};
    kelasGrupIni.forEach((k) => {
      antrianPerKelas[k] = antrianPotongan[k].shift() || [];
    });

    const totalGrup = kelasGrupIni.reduce((sum, k) => sum + antrianPerKelas[k].length, 0);
    const targetPerRuang = hitungTargetPerRuang(totalGrup, J);

    for (let r = 0; r < J; r++) {
      const siswaRuanganIni = potongProporsional(kelasGrupIni, antrianPerKelas, targetPerRuang[r]);
      hasil.push(buatBarisHasilGabungHuruf(kelasGrupIni, siswaRuanganIni));
    }
  });
  return hasil;
}

/**
 * V2 -- Gabung Kelas Sejenjang. Entry point utama, dipanggil dari
 * bagiRuanganPerJenjang() (orchestrator) waktu versiSkema = "rantai".
 * SAMA POSISINYA kayak bagiRuanganSilangJenjang(): nerima SEMUA kelas
 * lintas jenjang sekaligus dan gak lewat loop per-jenjang, karena
 * pengelompokannya emang lintas jenjang (lihat header file).
 *
 * @param {object} dataSiswaPerKelas - { "7A": [...], "8B": [...], ... } SEMUA kelas yang ikut ujian
 * @returns {Array} [{ nomor_ruangan, jenjang, siswa: [{...,asal_kelas,no_kursi}] }]
 *   `jenjang` diisi gabungan jenjang yang ada di ruang itu: "7+8" buat
 *   ruang gabungan (kasus 2 & 3 jenjang), atau cuma "9" buat ruang kelas 9
 *   (kasus 1 jenjang, dan bagian kelas 9 yang dipisah di kasus 3 jenjang)
 *   -- dipakai buat label/grouping di UI, sama kayak bagiRuanganSilangJenjang().
 */
function bagiRuanganGabungHuruf(dataSiswaPerKelas) {
  // Kelompokkan nama kelas per jenjang, urut jenjang naik (7, 8, 9, ...)
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

  // KASUS 1 JENJANG (PSAJ: 9 doang): gak ada jenjang lain buat digabung
  // per huruf, jadi pakai skema pasangan huruf berdekatan.
  if (urutanJenjang.length === 1) {
    return prosesPasanganSatuJenjang(kelasPerJenjang[urutanJenjang[0]], dataSiswaPerKelas);
  }

  // KASUS 3 JENJANG (PSAS: 7+8+9) -- jenjang PALING TINGGI (angka
  // terbesar di urutanJenjang, mis. "9") dipisah total, TIDAK ikut
  // digabung proporsional sama 2 jenjang di bawahnya. Lihat catatan
  // "KASUS 3 JENJANG" di header file buat alasannya (sesuai praktek asli
  // TU) dan kenapa cabang ini di-hardcode khusus buat TEPAT 3 jenjang.
  if (urutanJenjang.length === 3) {
    const jenjangDipisah = urutanJenjang[urutanJenjang.length - 1]; // "9"
    const jenjangGabung = urutanJenjang.slice(0, -1); // ["7","8"]

    // 7+8 duluan (jadi Ruang 1-12), baru nyusul kelas 9 (Ruang 13-18) --
    // nomor_ruangan final ditempel belakangan di orchestrator
    // (bagiRuanganPerJenjang), urutan array ini yang nentuin urutannya.
    const hasilGabung = prosesGrupHurufMultiJenjang(
      jenjangGabung,
      kelasPerJenjang,
      dataSiswaPerKelas
    );
    const hasilPisah = prosesPasanganSatuJenjang(
      kelasPerJenjang[jenjangDipisah],
      dataSiswaPerKelas
    );
    return [...hasilGabung, ...hasilPisah];
  }

  // KASUS 2 JENJANG (PSAT: 7+8): grup per huruf, tiap grup dipecah
  // proporsional jadi 2 ruang.
  return prosesGrupHurufMultiJenjang(urutanJenjang, kelasPerJenjang, dataSiswaPerKelas);
}

/**
 * Orchestrator utama -- dipanggil dari layer Supabase (pembagianRuanganSupabase.js)
 * gantiin bagiRuangan() yang lama.
 *
 * @param {object} dataSiswaPerKelas - SEMUA kelas yang ikut ujian ini (lintas jenjang),
 *   format sama seperti input bagiRuangan() lama: { "7A": [...], "8B": [...], ... }
 * @param {"rotasi"|"rantai"|"silang"} versiSkema - versi algoritma yang dipilih
 *   admin. WAJIB diisi -- gak ada nilai default, lihat catatan
 *   "SENGAJA GAK ADA VERSI_DEFAULT" di atas. Nilai legacy "v1"/"v2" (dari
 *   record ujian lama di DB) otomatis dipetakan ke "rotasi"/"rantai".
 *   "silang" dilempar ke bagiRuanganSilangJenjang() karena skema itu
 *   mencampur jenjang, jadi gak lewat jalur per-jenjang di bawah.
 * @throws {Error} kalau versiSkema kosong atau bukan kode yang dikenal --
 *   sengaja error keras, biar salah oper versi ketahuan langsung dan gak
 *   diem-diem ngasilin pembagian pakai skema yang gak diminta siapa pun.
 * @returns {Array} [{ nomor_ruangan, jenjang, siswa: [{ id, nama, nis, asal_kelas, no_kursi }] }]
 *   nomor_ruangan selalu JALAN TERUS 1..N, tapi URUTANNYA beda per versi:
 *   "rotasi" = jenjang kecil duluan (7, lalu 8, lalu 9); "rantai" = per
 *   grup huruf lintas jenjang urut A,B,C,... (2+ jenjang) atau per
 *   pasangan huruf berdekatan (1 jenjang); "silang" = per putaran rotasi
 *   (lihat bagiRuanganSilangJenjang.js). Field `jenjang` ditambahin per
 *   ruang biar gampang di-group di UI (tab Komposisi Ruangan / Preview)
 *   tanpa perlu nebak-nebak dari asal_kelas siswa pertamanya.
 */
function bagiRuanganPerJenjang(dataSiswaPerKelas, versiSkema) {
  const versi = normalisasiVersiSkema(versiSkema);
  if (!versi) {
    throw new Error(
      `Versi skema pembagian belum dipilih atau tidak dikenal: ${JSON.stringify(versiSkema)}. ` +
        `Pilihan yang tersedia: ${VERSI_SKEMA_LIST.map((o) => o.value).join(", ")}.`
    );
  }

  // Silang Jenjang & Gabung Kelas Sejenjang (rantai) punya alur sendiri
  // (ruang dicampur/digabung lintas jenjang), jadi langsung dilempar ke
  // modulnya dan gak ikut loop per-jenjang di bawah -- beda sama V1
  // (rotasi) yang emang diproses 1 jenjang sendiri-sendiri.
  if (versi === "silang") {
    return bagiRuanganSilangJenjang(dataSiswaPerKelas);
  }
  if (versi === "rantai") {
    const hasilGabungHuruf = bagiRuanganGabungHuruf(dataSiswaPerKelas);
    return hasilGabungHuruf.map((r, idx) => ({ nomor_ruangan: idx + 1, ...r }));
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

    // Titik ini cuma kena buat "rotasi" -- "silang" & "rantai" udah
    // dicegat & di-return duluan di atas sebelum loop ini mulai.
    const hasilJenjangIni = bagiSatuJenjangV1(dataSiswaPerKelasJenjang);

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
  versiSkemaValid,
  normalisasiVersiSkema,
  normalisasiVersiSkemaTersimpan,
  labelVersiSkema,
};
