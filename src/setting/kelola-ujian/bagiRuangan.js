/**
 * Algoritma Pembagian Ruangan Ujian (PSAS/PSAT/PSAJ)
 * ----------------------------------------------------
 * Logika:
 * 1. Kelas dikelompokkan berdasarkan huruf (7A+8A+9A = grup A, 7B+8B+9B = grup B, dst)
 * 2. Di dalam satu grup huruf, siswa digabung URUT per angkatan (semua 7 dulu, lalu 8, lalu 9)
 * 3. Gabungan itu dipotong per KAPASITAS (default 40) jadi ruangan-ruangan
 * 4. Nomor ruangan JALAN TERUS lintas huruf (tidak reset tiap huruf)
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

  const hasilRuangan = []; // [{ nomor_ruangan, siswa: [...] }]
  let nomorRuanganBerjalan = 1;
  let bufferSiswa = []; // penampung sementara sebelum dipotong per kapasitas

  for (const huruf of hurufSet) {
    // 2. Gabung urut per angkatan (urutan naik: 7 dulu, lalu 8, lalu 9 -- atau
    // cuma yang ada datanya kalau PSAT/PSAJ)
    for (const angkatan of angkatanUrut) {
      const namaKelas = `${angkatan}${huruf}`;
      const siswaKelasIni = dataSiswaPerKelas[namaKelas] || [];
      bufferSiswa.push(
        ...siswaKelasIni.map((s) => ({ ...s, asal_kelas: namaKelas }))
      );
    }

    // 3. Potong buffer jadi ruangan-ruangan selama masih cukup 1 ruangan penuh
    while (bufferSiswa.length >= kapasitas) {
      const isiRuangan = bufferSiswa.splice(0, kapasitas);
      hasilRuangan.push({
        nomor_ruangan: nomorRuanganBerjalan,
        siswa: isiRuangan.map((s, i) => ({ ...s, no_kursi: i + 1 })),
      });
      nomorRuanganBerjalan++;
    }
    // sisa bufferSiswa (< kapasitas) dibawa lanjut ke huruf berikutnya
  }

  // 4. Kalau masih ada sisa siswa setelah semua huruf habis, taruh di ruangan terakhir
  if (bufferSiswa.length > 0) {
    hasilRuangan.push({
      nomor_ruangan: nomorRuanganBerjalan,
      siswa: bufferSiswa.map((s, i) => ({ ...s, no_kursi: i + 1 })),
    });
  }

  return hasilRuangan;
}

export { bagiRuangan };
