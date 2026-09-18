// setting/kelola-ujian/pembagian-ruangan/DenahDuduk.js
// Komponen isi tab "Denah Duduk" (dipisah dari PembagianRuanganTab.js atas
// permintaan -- dulu 1 blok JSX numpuk di sana). Dipakai di
// PembagianRuanganTab.js pas tabAktif === "denah", data & state (ruangan
// aktif, jumlah kolom, hasilLive, petaNoPeserta) tetap dipegang parent,
// komponen ini cuma nerima lewat props & ngurusin RENDER + LOGIC
// PENYUSUNAN MEJA-nya sendiri.
//
// ATURAN LAYOUT (sesuai instruksi):
// - Bukan grid kursi 1-1 lagi kayak versi lama, tapi grid MEJA -- 1 meja
//   diisi 2 siswa (kiri & kanan).
// - Default 4 KOLOM meja. Jumlah baris ngikutin jumlah siswa (kapasitas =
//   kolom x baris x 2). Kalau 1 ruangan isinya pas 40 siswa & kolom = 4,
//   otomatis jadi 5 baris x 4 kolom kayak yang diminta.
// - ATURAN WAJIB: 2 siswa dalam 1 meja yang sama TIDAK BOLEH dari
//   asal_kelas yang sama. Urutan asli (hasil algoritma pembagian, sudah
//   diurut no_kursi dari parent) dipasangin 2-2 apa adanya DULU; kalau ada
//   pasangan yang kebetulan sekelas, susunMejaAntiSekelas() nyari siswa
//   lain di bawahnya (kelas beda) buat ditukar -- jadi urutan asli
//   sebisa mungkin gak berubah, cuma ditukar seperlunya.
// - URUTAN PENGISIAN MEJA: KE BELAKANG dulu (nurunin 1 kolom sampai penuh
//   BUAT KOLOM ITU), baru geser ke kolom berikutnya -- BUKAN ke samping
//   dulu. Meja No.1 = paling depan kolom 1, Meja No.2 = di belakangnya
//   (masih kolom 1), dst.
// - JUMLAH MEJA PER KOLOM DISEIMBANGIN (BUKAN kolom awal digenjot penuh
//   dulu baru kolom terakhir kebagian sisa dikit). Kalau totalMeja gak
//   abis dibagi rata sama jumlahKolom, kolom-kolom PALING KIRI yang
//   kebagian 1 meja ekstra (selisih antar kolom maks cuma 1 meja), biar
//   gak ada kolom yang bolong panjang di bagian belakang kayak versi
//   lama. Misal 17 meja / 4 kolom -> kolom 1 = 5 meja, kolom 2 = 4 meja,
//   kolom 3 = 4 meja, kolom 4 = 4 meja (bukan 5,5,5,2 kayak sebelumnya).

import React, { useMemo } from "react";

// ---------------------------------------------------------------------
// LOGIC
// ---------------------------------------------------------------------

/**
 * Pasangin siswa (array yang sudah terurut no_kursi) jadi meja isi 2,
 * sambil jagain jangan sampai 1 meja isinya 2 siswa dari asal_kelas yang
 * sama. Strategi: jalan urut 2-2, begitu ketemu pasangan sekelas, cari
 * siswa TERDEKAT di posisi setelahnya yang kelasnya beda dari
 * pasangannya sekarang, terus tukar tempat. Urutan asli dipertahankan
 * sebisa mungkin -- cuma ditukar pas kepepet. Kalau sisa siswa di
 * ruangan itu 1 kelas doang (gak ada kandidat tukar), meja itu terpaksa
 * dibiarkan sekelas -- gak ada solusi lain yang mungkin.
 */
function susunMejaAntiSekelas(siswaTerurut) {
  const arr = [...siswaTerurut];

  for (let i = 0; i < arr.length - 1; i += 2) {
    const kiri = arr[i];
    const kanan = arr[i + 1];
    if (!kiri || !kanan) continue;
    if (kiri.asal_kelas !== kanan.asal_kelas) continue; // udah aman, lanjut

    let idxTukar = -1;
    for (let j = i + 2; j < arr.length; j++) {
      if (arr[j].asal_kelas !== kiri.asal_kelas) {
        idxTukar = j;
        break;
      }
    }

    if (idxTukar !== -1) {
      [arr[i + 1], arr[idxTukar]] = [arr[idxTukar], arr[i + 1]];
    }
  }

  return arr;
}

/** Ubah array siswa (sudah dipasangin) jadi array meja { kiri, kanan }. */
function bangunDaftarMeja(siswaTerpasang) {
  const daftar = [];
  for (let i = 0; i < siswaTerpasang.length; i += 2) {
    daftar.push({ kiri: siswaTerpasang[i], kanan: siswaTerpasang[i + 1] || null });
  }
  return daftar;
}

/**
 * Taruh daftar meja ke grid (baris x kolom), diisi KE BELAKANG dulu
 * (turun penuh 1 kolom) baru geser ke kolom berikutnya -- TAPI jumlah
 * meja per kolom diseimbangin dulu (selisih antar kolom maks 1 meja),
 * bukan kolom awal digenjot penuh baru sisanya dikit di kolom terakhir.
 * Kolom-kolom paling KIRI yang kebagian 1 meja ekstra kalau totalMeja
 * gak abis dibagi rata sama jumlahKolom.
 */
function susunGridMeja(daftarMeja, jumlahKolom) {
  const kolom = Math.max(1, jumlahKolom || 1);
  const totalMeja = daftarMeja.length;

  const barisDasar = Math.floor(totalMeja / kolom); // jatah rata tiap kolom
  const jumlahKolomEkstra = totalMeja % kolom; // sisa yg didistribusiin 1-1
  const baris = Math.max(1, barisDasar + (jumlahKolomEkstra > 0 ? 1 : 0));

  const grid = Array.from({ length: baris }, () => Array(kolom).fill(null));

  let idx = 0;
  for (let k = 0; k < kolom; k++) {
    // kolom ke-0 s.d. (jumlahKolomEkstra - 1) kebagian 1 meja ekstra
    const barisKolomIni = barisDasar + (k < jumlahKolomEkstra ? 1 : 0);
    for (let b = 0; b < barisKolomIni; b++) {
      if (idx >= totalMeja) break;
      grid[b][k] = { ...daftarMeja[idx], nomorMeja: idx + 1 };
      idx++;
    }
  }

  return { grid, baris, kolom };
}

// ---------------------------------------------------------------------
// SUB-KOMPONEN
// ---------------------------------------------------------------------

/**
 * Ambil 2 kata pertama dari nama apa adanya, sisanya (kata ke-3 dst)
 * disingkat jadi inisial huruf depan + titik. Contoh:
 * "Muhammad Rizky Ramadhan Putra" -> "Muhammad Rizky R. P."
 * Nama yang cuma 1-2 kata dibiarkan apa adanya.
 */
function singkatNama(nama) {
  if (!nama) return "-";
  const kata = nama.trim().split(/\s+/).filter(Boolean);
  if (kata.length <= 2) return nama;

  const duaKataAwal = kata.slice(0, 2).join(" ");
  const inisialSisanya = kata
    .slice(2)
    .map((k) => `${k[0].toUpperCase()}.`)
    .join(" ");

  return `${duaKataAwal} ${inisialSisanya}`;
}

/** Format label kelas jadi "Kelas 7A" -- kalau sumbernya udah ada kata
 * "kelas" (apa pun kapitalisasinya), gak usah dobel ditambahin lagi. */
function formatLabelKelas(asalKelas) {
  if (!asalKelas) return "-";
  const sudahAdaKataKelas = /^kelas\b/i.test(asalKelas.trim());
  return sudahAdaKataKelas ? asalKelas.trim() : `Kelas ${asalKelas.trim()}`;
}

const KartuSiswa = ({ siswa, petaNoPeserta }) => {
  if (!siswa) {
    return (
      <div className="flex-1 min-w-0 rounded-md border border-dashed border-gray-300 dark:border-gray-600 min-h-[3.75rem]" />
    );
  }
  return (
    <div className="flex-1 min-w-0 rounded-md bg-white dark:bg-gray-900/40 p-1.5 text-center">
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500">
        {petaNoPeserta.get(String(siswa.id)) || "-"}
      </p>
      <p
        className="text-xs font-bold text-gray-900 dark:text-white truncate"
        title={siswa.nama || "-"}
      >
        {singkatNama(siswa.nama)}
      </p>
      <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
        {formatLabelKelas(siswa.asal_kelas)}
      </p>
    </div>
  );
};

// ---------------------------------------------------------------------
// KOMPONEN UTAMA
// ---------------------------------------------------------------------

/**
 * Props:
 * - quotaPerRuangan: array ruangan [{ nomor_ruangan, ... }] -- buat isi
 *   dropdown "Pilih Ruangan".
 * - ruanganAktif: nomor_ruangan yang lagi dipilih (bisa null di awal).
 * - onRuanganChange(nomorRuangan): dipanggil pas admin ganti ruangan.
 * - hasilLive: array [{ nomor_ruangan, siswa: [...] }] -- sumber data
 *   siswa per ruangan, PERSIS sama yang dipakai tab Preview.
 * - petaNoPeserta: Map(id siswa -> no. peserta), dari bangunPetaNoPeserta().
 * - jumlahKolom: jumlah KOLOM MEJA. Default 4.
 * - onJumlahKolomChange(angka): dipanggil pas admin ganti jumlah kolom.
 * - jenisUjianLabel: teks jenis ujian yang sudah diformat (buat header).
 * - labelTahunAjaranAktif: teks tahun ajaran (buat header).
 */
export default function DenahDuduk({
  quotaPerRuangan = [],
  ruanganAktif,
  onRuanganChange,
  hasilLive = [],
  petaNoPeserta,
  jumlahKolom = 4,
  onJumlahKolomChange,
  jenisUjianLabel,
  labelTahunAjaranAktif,
}) {
  // PENTING: semua Hook (useMemo) HARUS dipanggil sebelum early return
  // apa pun di bawah -- kalau enggak, urutan Hook jadi beda antar render
  // (misal pas quotaPerRuangan kosong vs enggak) dan React bakal error
  // "Rules of Hooks". Makanya ruangDipilih/siswaRuanganIni dibikin aman
  // (pakai fallback ?. ) DULU, baru dipakai di useMemo, baru SETELAH itu
  // baru cek early return "Belum ada ruangan".
  const ruangDipilih =
    quotaPerRuangan.find((r) => r.nomor_ruangan === ruanganAktif) || quotaPerRuangan[0];

  const siswaRuanganIni =
    hasilLive.find((h) => h.nomor_ruangan === ruangDipilih?.nomor_ruangan)?.siswa || [];

  // Urut pakai no_kursi dulu -- sama persis kayak tab Preview -- BARU
  // dipasangin per meja. Jadi kalau algoritma pembagian ruangan udah
  // nyusun urutan yang gantian kelas, hasil pemasangannya juga ngikut
  // rapi tanpa perlu ditukar-tukar lagi.
  const siswaTerurut = useMemo(
    () => [...siswaRuanganIni].sort((a, b) => (a.no_kursi || 0) - (b.no_kursi || 0)),
    [siswaRuanganIni]
  );

  const { grid, baris, kolom, jumlahMejaSekelas, totalMeja } = useMemo(() => {
    const terpasang = susunMejaAntiSekelas(siswaTerurut);
    const daftarMeja = bangunDaftarMeja(terpasang);
    const { grid, baris, kolom } = susunGridMeja(daftarMeja, jumlahKolom);
    const sekelas = daftarMeja.filter(
      (m) => m.kanan && m.kiri.asal_kelas === m.kanan.asal_kelas
    ).length;
    return { grid, baris, kolom, jumlahMejaSekelas: sekelas, totalMeja: daftarMeja.length };
  }, [siswaTerurut, jumlahKolom]);

  // Early return ini sekarang aman, karena semua Hook di atas sudah
  // pasti kepanggil duluan di setiap render, apa pun kondisinya.
  if (quotaPerRuangan.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 italic">Belum ada ruangan.</p>;
  }

  return (
    <>
      <div className="flex flex-wrap items-end gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Pilih Ruangan
          </label>
          <select
            value={ruangDipilih.nomor_ruangan}
            onChange={(e) => onRuanganChange(Number(e.target.value))}
            className="w-full sm:w-64 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
          >
            {quotaPerRuangan.map((r) => (
              <option key={r.nomor_ruangan} value={r.nomor_ruangan}>
                Ruang {String(r.nomor_ruangan).padStart(2, "0")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Jumlah Kolom Meja
          </label>
          <input
            type="number"
            min={1}
            value={jumlahKolom === 0 ? "" : jumlahKolom}
            onChange={(e) => {
              const nilai = e.target.value;
              onJumlahKolomChange(nilai === "" ? 0 : Number(nilai));
            }}
            className="w-24 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
        <div className="text-center mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            DENAH DUDUK — RUANG {String(ruangDipilih.nomor_ruangan).padStart(2, "0")}
          </p>
          {labelTahunAjaranAktif && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {jenisUjianLabel} — TAHUN AJARAN {labelTahunAjaranAktif}
            </p>
          )}
        </div>

        {siswaTerurut.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Belum ada siswa di ruangan ini.</p>
        ) : (
          <>
            <p className="text-center text-xs font-semibold tracking-widest text-gray-400 dark:text-gray-500 mb-3">
              — DEPAN / PAPAN TULIS —
            </p>

            {jumlahMejaSekelas > 0 && (
              <p className="text-center text-xs text-red-500 dark:text-red-400 mb-3">
                ⚠ {jumlahMejaSekelas} meja terpaksa 1 kelas yang sama (kemungkinan siswa di ruangan
                ini didominasi 1 kelas, jadi gak ada pasangan kelas lain yang tersisa).
              </p>
            )}

            <div className="space-y-2.5">
              {Array.from({ length: baris }).map((_, b) => (
                <div key={b} className="flex gap-2.5">
                  {Array.from({ length: kolom }).map((_, k) => {
                    const meja = grid[b][k];
                    return (
                      <div
                        key={k}
                        className="flex-1 min-w-0 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/60 p-1.5"
                      >
                        {meja ? (
                          <>
                            <p className="text-center text-[9px] font-medium text-gray-400 dark:text-gray-500 mb-1">
                              Meja {meja.nomorMeja}
                            </p>
                            <div className="flex gap-1.5">
                              <KartuSiswa siswa={meja.kiri} petaNoPeserta={petaNoPeserta} />
                              <KartuSiswa siswa={meja.kanan} petaNoPeserta={petaNoPeserta} />
                            </div>
                          </>
                        ) : (
                          <div className="h-full min-h-[3.75rem]" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <p className="text-right text-sm text-gray-500 dark:text-gray-400 mt-3">
              {siswaTerurut.length} siswa · {totalMeja} meja ({baris} baris x {kolom} kolom)
            </p>
          </>
        )}
      </div>
    </>
  );
}
