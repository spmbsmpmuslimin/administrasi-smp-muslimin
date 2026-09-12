/**
 * Algoritma Pembagian Ruangan Ujian (PSAS/PSAT/PSAJ)
 * ----------------------------------------------------
 * Logika (proporsional per angkatan, seimbang):
 * 1. Kelas dikelompokkan berdasarkan huruf (7A+8A+9A = grup A, 7B+8B+9B = grup B, dst)
 * 2. Tiap angkatan (7/8/9) punya ANTRIAN sendiri -- diisi urut per huruf
 *    (semua anak 7 dari huruf A dulu, lalu huruf B, dst -- FIFO)
 * 3. Begitu total sisa di semua antrian udah >= kapasitas, potong 1 ruangan:
 *    jatah tiap angkatan di ruangan itu PROPORSIONAL ke jumlah sisa di
 *    antrian angkatan itu SAAT INI (largest remainder method, biar totalnya
 *    pas ke kapasitas walau hasil bagi gak bulat)
 * 4. Sisa yang belum cukup buat 1 ruangan penuh OTOMATIS lanjut nyampur
 *    sama huruf berikutnya (karena masih nongkrong di antrian) -- jadi
 *    ruangan "penyambung" antar huruf juga tetap proporsional, bukan cuma
 *    nempelin sisa apa adanya.
 * 5. Nomor ruangan JALAN TERUS lintas huruf (tidak reset tiap huruf)
 *
 * Contoh (kapasitas 40): 7A=35, 8A=40, 9A=32 siswa.
 * -> Ruangan 1: 7A=13, 8A=15, 9A=12 (total 40)
 * -> Ruangan 2: 7A=13, 8A=15, 9A=12 (total 40, dari sisa 22/25/20)
 * -> Sisa 7A=9, 8A=10, 9A=8 (total 27) BELUM cukup 1 ruangan -> nyambung ke
 *    huruf B. Kalau 7B/8B/9B masuk, Ruangan 3 bakal berisi sisa 27 dari A
 *    itu + 13 dari B (proporsional lagi), BUKAN ruangan sendiri yang cuma
 *    keisi 27.
 *
 * Contoh input dataSiswaPerKelas:
 * {
 *   "7A": [{id: 1, nama: "Ahmad"}, ...],   // 14 siswa
 *   "8A": [{id: 15, nama: "Budi"}, ...],   // 13 siswa
 *   "9A": [{id: 28, nama: "Citra"}, ...],  // 13 siswa
 *   "7B": [...], "8B": [...], "9B": [...],
 *   ...
 * }
 */

function bagiRuangan(dataSiswaPerKelas, kapasitas = 40) {
  // 1. Ambil semua huruf kelas yang unik, urutkan abjad (A, B, C, ...)
  const semuaKelas = Object.keys(dataSiswaPerKelas);
  const hurufSet = [...new Set(semuaKelas.map((k) => k.slice(-1)))].sort();

  // Angkatan diambil DINAMIS dari data yang ada (bukan hardcode 7/8/9),
  // supaya otomatis benar juga untuk PSAT (cuma kelas 7-8) atau PSAJ
  // (cuma kelas 9) yang datanya emang udah difilter sebelum masuk sini.
  const angkatanUrut = [
    ...new Set(semuaKelas.map((k) => k.match(/^\d+/)?.[0]).filter(Boolean)),
  ].sort((a, b) => Number(a) - Number(b));

  // Antrian per angkatan (FIFO) -- diisi urut per huruf, jadi urutan siswa
  // di dalamnya otomatis "huruf A dulu, baru B, baru C" tanpa perlu dicatat
  // terpisah.
  const antrianPerAngkatan = {};
  angkatanUrut.forEach((a) => (antrianPerAngkatan[a] = []));

  const hasilRuangan = []; // [{ nomor_ruangan, siswa: [...] }]
  let nomorRuanganBerjalan = 1;

  const totalSisa = () =>
    angkatanUrut.reduce((sum, a) => sum + antrianPerAngkatan[a].length, 0);

  // Potong 1 ruangan dari antrian yang ada SEKARANG, jatah tiap angkatan
  // proporsional ke sisa antrian angkatan itu saat ini (largest remainder
  // method: bulatkan ke bawah dulu, sisa kursi karena pembulatan dikasih
  // ke angkatan yang desimalnya paling gede duluan, biar totalnya presisi
  // pas ke kapasitas ruangan).
  function potongSatuRuangan() {
    const sisaPerAngkatan = angkatanUrut.map((a) => antrianPerAngkatan[a].length);
    const totalSisaSekarang = sisaPerAngkatan.reduce((s, v) => s + v, 0);
    // Ruangan terakhir (sisa < kapasitas) gak perlu dipaksa penuh.
    const kapasitasRuanganIni = Math.min(kapasitas, totalSisaSekarang);

    const jatahEksak = sisaPerAngkatan.map(
      (n) => (n / totalSisaSekarang) * kapasitasRuanganIni
    );
    const jatahBulat = jatahEksak.map(Math.floor);
    let sisaKursi = kapasitasRuanganIni - jatahBulat.reduce((s, v) => s + v, 0);

    const urutanBerdasarkanSisaDesimal = jatahEksak
      .map((v, i) => ({ i, frac: v - Math.floor(v) }))
      .sort((a, b) => b.frac - a.frac);
    for (let k = 0; k < sisaKursi; k++) {
      jatahBulat[urutanBerdasarkanSisaDesimal[k].i]++;
    }

    const siswaRuanganIni = [];
    angkatanUrut.forEach((a, i) => {
      const ambil = antrianPerAngkatan[a].splice(0, jatahBulat[i]);
      siswaRuanganIni.push(...ambil);
    });

    hasilRuangan.push({
      nomor_ruangan: nomorRuanganBerjalan,
      siswa: siswaRuanganIni.map((s, idx) => ({ ...s, no_kursi: idx + 1 })),
    });
    nomorRuanganBerjalan++;
  }

  for (const huruf of hurufSet) {
    // 2. Masukkan siswa huruf ini ke antrian angkatan masing-masing
    for (const angkatan of angkatanUrut) {
      const namaKelas = `${angkatan}${huruf}`;
      const siswaKelasIni = dataSiswaPerKelas[namaKelas] || [];
      antrianPerAngkatan[angkatan].push(
        ...siswaKelasIni.map((s) => ({ ...s, asal_kelas: namaKelas }))
      );
    }

    // 3. Potong ruangan proporsional selama total antrian masih cukup 1 ruangan penuh
    while (totalSisa() >= kapasitas) {
      potongSatuRuangan();
    }
    // sisa antrian (< kapasitas) otomatis nyambung ke huruf berikutnya
  }

  // 4. Kalau masih ada sisa siswa setelah semua huruf habis, jadiin 1 ruangan
  // terakhir yang gak penuh (proporsional juga ke sisa yang ada).
  if (totalSisa() > 0) {
    potongSatuRuangan();
  }

  return hasilRuangan;
}

export { bagiRuangan };
