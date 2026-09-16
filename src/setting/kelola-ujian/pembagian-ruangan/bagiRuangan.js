/**
 * Algoritma Pembagian Ruangan Ujian (PSAS/PSAT/PSAJ)
 * ----------------------------------------------------
 * Prinsip: JUMLAH RUANGAN per angkatan = JUMLAH ROMBEL (kelas) di angkatan
 * itu -- bukan dihitung dari total siswa dibagi kapasitas. Ruangan yang
 * tersedia di sekolah pada dasarnya sama banyak dengan rombel yang ada
 * (1 rombel kira-kira butuh 1 ruangan), jadi angka itu yang dipakai
 * langsung, apa pun jumlah siswa aktualnya per rombel.
 *
 * Logika (angkatan dipisah, TIDAK dicampur):
 * 1. Angkatan diproses SATU-SATU secara berurutan (7 dulu sampai habis,
 *    baru 8, baru 9) -- TIDAK ada campuran angkatan dalam satu ruangan.
 * 2. Buat satu angkatan: jumlah ruangannya = jumlah rombel (huruf kelas)
 *    yang ada di angkatan itu (mis. 7A-7F = 6 rombel = 6 ruangan). Kalau
 *    angkatan lain rombelnya beda jumlah (mis. kelas 9 cuma 9A-9C = 3
 *    rombel), ruangannya ikut cuma 3 -- gak perlu sama rata antar angkatan.
 * 3. Siswa dalam satu angkatan diantrikan urut per huruf kelas (A dulu,
 *    lalu B, dst -- FIFO), lalu dibagi RATA (balanced, largest remainder)
 *    ke ruangan sejumlah rombel tadi -- bukan penuh-penuh-lalu-sisa di
 *    ruangan terakhir, dan boleh saja hasilnya di atas "kapasitas ideal"
 *    kalau memang rombelnya sedikit tapi siswanya banyak.
 * 4. Nomor ruangan JALAN TERUS lintas angkatan (tidak reset)
 *
 * Contoh: kelas 7 (7A-7F, 6 rombel) total 218 siswa.
 * -> 6 ruangan (jumlah rombel), dasar = floor(218/6) = 36, sisa = 2
 * -> Ruangan 1-2: 37 siswa, Ruangan 3-6: 36 siswa (total 2*37+4*36=218)
 *
 * Contoh lain: kelas 8 (8A-8F, 6 rombel) total 244 siswa.
 * -> tetap 6 ruangan (jumlah rombel, BUKAN ceil(244/40)=7)
 * -> dasar = floor(244/6) = 40, sisa = 244-40*6 = 4
 * -> 4 ruangan isi 41 siswa, 2 ruangan isi 40 siswa
 *
 * Contoh input dataSiswaPerKelas:
 * {
 *   "7A": [{id: 1, nama: "Ahmad"}, ...],
 *   "7B": [...], "8A": [...], "8B": [...], "9A": [...], "9B": [...],
 *   ...
 * }
 */

function bagiRuangan(dataSiswaPerKelas) {
  const semuaKelas = Object.keys(dataSiswaPerKelas);

  // Angkatan diambil DINAMIS dari data yang ada (bukan hardcode 7/8/9),
  // supaya otomatis benar juga untuk PSAT (kelas 7-8) atau PSAJ (kelas 9
  // saja) yang datanya emang udah difilter sebelum masuk sini.
  const angkatanUrut = [
    ...new Set(semuaKelas.map((k) => k.match(/^\d+/)?.[0]).filter(Boolean)),
  ].sort((a, b) => Number(a) - Number(b));

  const hasilRuangan = []; // [{ nomor_ruangan, siswa: [...] }]
  let nomorRuanganBerjalan = 1;

  for (const angkatan of angkatanUrut) {
    // Rombel (huruf kelas) milik angkatan ini -- "7A", "7B", dst, sudah
    // urut abjad karena sort() string dengan prefix angka sama panjang.
    const kelasAngkatanIni = semuaKelas
      .filter((k) => k.match(/^\d+/)?.[0] === angkatan)
      .sort();

    const jumlahRuangan = kelasAngkatanIni.length;
    if (jumlahRuangan === 0) continue;

    // Antrian siswa angkatan ini, urut per rombel (A dulu, lalu B, dst)
    const antrian = [];
    for (const namaKelas of kelasAngkatanIni) {
      const siswaKelasIni = dataSiswaPerKelas[namaKelas] || [];
      antrian.push(...siswaKelasIni.map((s) => ({ ...s, asal_kelas: namaKelas })));
    }

    const totalSiswa = antrian.length;
    if (totalSiswa === 0) continue;

    // Bagi rata (largest remainder) ke sejumlah ruangan = jumlah rombel,
    // supaya selisih antar ruangan maksimal cuma 1 siswa.
    const dasar = Math.floor(totalSiswa / jumlahRuangan);
    const sisaLebih = totalSiswa - dasar * jumlahRuangan; // ruangan pertama sejumlah ini dapat +1

    let idx = 0;
    for (let r = 0; r < jumlahRuangan; r++) {
      const ukuranRuanganIni = dasar + (r < sisaLebih ? 1 : 0);
      const siswaRuanganIni = antrian.slice(idx, idx + ukuranRuanganIni);
      idx += ukuranRuanganIni;

      hasilRuangan.push({
        nomor_ruangan: nomorRuanganBerjalan,
        siswa: siswaRuanganIni.map((s, i) => ({ ...s, no_kursi: i + 1 })),
      });
      nomorRuanganBerjalan++;
    }
  }

  return hasilRuangan;
}

/**
 * Terapkan quota manual (hasil edit admin) ke atas hasil bagiRuangan() yang
 * asli, TANPA mengubah urutan siswa per kelas (tetap FIFO -- siswa yang
 * sama yang bakal masuk ruangan tertentu, cuma jumlah per kelas per
 * ruangan yang diganti sesuai input admin).
 *
 * Alur pemakaian:
 * 1. bagiRuangan() dipanggil dulu (auto-generate, balanced per angkatan) -> hasilAsli
 * 2. Admin lihat breakdown per ruangan di UI, dan BOLEH mengubah jumlah
 *    per kelas per ruangan (mis. Ruang 1: 7A=14, 7B=13, 7C=13)
 * 3. Quota yang sudah diedit itu (quotaPerRuangan) dikirim ke sini bareng
 *    hasilAsli -- fungsi ini yang nentuin SIAPA (siswa mana persis) yang
 *    masuk tiap ruangan berdasarkan quota baru itu.
 *
 * PENTING: total quota per kelas di semua ruangan (dijumlah) HARUS SAMA
 * dengan total siswa kelas itu di hasilAsli, kalau tidak akan ada siswa
 * yang hilang atau ke-assign dobel. Makanya validasi total per kelas
 * WAJIB dilakukan di sisi UI sebelum fungsi ini dipanggil (lihat
 * hitungTotalPerKelas di bawah, dipakai untuk validasi itu).
 *
 * @param {Array} hasilAsli - hasil bagiRuangan() asli (sumber urutan siswa per kelas)
 * @param {Array} quotaPerRuangan - [{ nomor_ruangan, quota: { "7A": 14, "7B": 13, ... } }, ...]
 * @returns {Array} hasil ruangan baru sesuai quota manual, format sama seperti bagiRuangan()
 */
function terapkanQuotaManual(hasilAsli, quotaPerRuangan) {
  // Susun ulang antrian per kelas (BUKAN per angkatan) dari hasilAsli,
  // urut sesuai nomor_ruangan supaya urutan asli (alfabetis dari query)
  // tetap terjaga -- karena tiap kelas cuma pernah "disisipin" berurutan
  // waktu bagiRuangan() jalan, mengumpulkannya kembali per kelas otomatis
  // balikin urutan semula.
  const antrianPerKelas = {};
  [...hasilAsli]
    .sort((a, b) => a.nomor_ruangan - b.nomor_ruangan)
    .forEach((r) => {
      r.siswa.forEach((s) => {
        if (!antrianPerKelas[s.asal_kelas]) antrianPerKelas[s.asal_kelas] = [];
        antrianPerKelas[s.asal_kelas].push(s);
      });
    });

  return quotaPerRuangan.map((r) => {
    const siswaRuanganIni = [];
    Object.entries(r.quota).forEach(([kelas, jumlah]) => {
      if (!jumlah || jumlah <= 0) return;
      const ambil = (antrianPerKelas[kelas] || []).splice(0, jumlah);
      siswaRuanganIni.push(...ambil);
    });
    return {
      nomor_ruangan: r.nomor_ruangan,
      siswa: siswaRuanganIni.map((s, idx) => ({ ...s, no_kursi: idx + 1 })),
    };
  });
}

/**
 * Hitung total siswa per kelas dari hasil bagiRuangan() (dipakai sebagai
 * "angka target" buat validasi quota manual di UI -- total quota yang
 * diedit admin per kelas harus PAS sama angka ini).
 */
function hitungTotalPerKelas(hasilRuangan) {
  const total = {};
  hasilRuangan.forEach((r) => {
    r.siswa.forEach((s) => {
      total[s.asal_kelas] = (total[s.asal_kelas] || 0) + 1;
    });
  });
  return total;
}

export { bagiRuangan, terapkanQuotaManual, hitungTotalPerKelas };
