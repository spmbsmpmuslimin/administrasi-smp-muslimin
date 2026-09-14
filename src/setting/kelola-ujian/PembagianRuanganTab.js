// setting/kelola-ujian/PembagianRuanganTab.js
// Sub-fitur "Pembagian Ruangan" dari Manajemen Ujian.
// Alur: pilih jenis ujian + tahun ajaran -> "Proses Pembagian" (preview
// dulu, belum nyimpen ke DB) -> kalau udah oke, "Simpan ke Database".
// Proses ulang aman dipanggil berkali-kali (lihat simpanPembagianRuangan
// di pembagianRuanganSupabase.js -- data lama dihapus dulu tiap simpan).

import React, { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  RefreshCw,
  Save,
  Users,
  DoorOpen,
  Plus,
  Trash2,
  Table2,
  Eye,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import {
  ambilDaftarTahunAjaran,
  getOrCreateUjian,
  cariUjian,
  prosesPembagianRuangan,
  simpanPembagianRuangan,
  ambilPembagianTersimpan,
  KONFIGURASI_JENIS_UJIAN,
} from "./pembagianRuanganSupabase";
import { terapkanQuotaManual, hitungTotalPerKelas } from "./bagiRuangan";

const JENIS_UJIAN_LABEL = {
  PSAS: "PSAS - Penilaian Sumatif Akhir Semester (kelas 7-9)",
  PSAT: "PSAT - Penilaian Sumatif Akhir Tahun (kelas 7-8)",
  PSAJ: "PSAJ - Penilaian Sumatif Akhir Jenjang (kelas 9)",
};

// Cari kolom yang paling masuk akal buat label tahun ajaran, karena kita
// nggak tau pasti nama kolomnya (year / tahun_ajaran / name / dst)
function labelTahunAjaran(row) {
  return row.year || row.tahun_ajaran || row.name || row.label || row.nama || `ID: ${row.id}`;
}

// jenisUjian sekarang datang dari level atas (JenisUjianMenuTab / pemilihan
// PSAS-PSAT-PSAJ) -- sudah fixed di sini, jadi tidak ada lagi dropdown buat
// gonta-ganti jenis ujian di dalam sub-fitur ini.
const PembagianRuanganTab = ({ jenisUjian, showToast, onBack }) => {
  const [daftarTahunAjaran, setDaftarTahunAjaran] = useState([]);
  const [tahunAjaranId, setTahunAjaranId] = useState("");
  const [kapasitas, setKapasitas] = useState(
    KONFIGURASI_JENIS_UJIAN[jenisUjian]?.defaultKapasitas || 40
  );

  const [loadingTahunAjaran, setLoadingTahunAjaran] = useState(true);
  const [memproses, setMemproses] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  // Loading khusus buat proses "narik data tersimpan" pas tab ini dibuka /
  // tahun ajaran diganti -- beda dari `memproses` (itu buat generate ulang
  // manual lewat tombol "Proses Pembagian").
  const [memuatTersimpan, setMemuatTersimpan] = useState(false);

  // hasilAsli = hasil bagiRuangan() ASLI (auto-generate, proporsional),
  // dipakai sebagai "sumber siswa" waktu quota manual diterapkan --
  // TIDAK ditampilkan langsung, cuma dipakai di belakang layar.
  const [hasilAsli, setHasilAsli] = useState(null);
  // quotaPerRuangan = yang admin lihat & edit di tabel: [{ nomor_ruangan, quota: { "7A": 14, ... } }]
  const [quotaPerRuangan, setQuotaPerRuangan] = useState(null);
  // targetPerKelas = total siswa per kelas (dari hasilAsli) -- angka yang
  // harus dipenuhi PAS oleh jumlah quota manual admin per kelas.
  const [targetPerKelas, setTargetPerKelas] = useState({});
  const [daftarKelas, setDaftarKelas] = useState([]);
  // Tab yang lagi aktif di bagian bawah: "edit" (tabel isi quota) atau
  // "preview" (lihat 1 ruangan sekaligus, format bersih -- fondasi buat
  // nanti dipakai cetak per ruangan).
  const [tabAktif, setTabAktif] = useState("edit");
  // Ruangan yang lagi dipilih di dropdown tab Preview
  const [ruanganPreviewAktif, setRuanganPreviewAktif] = useState(null);

  // Tahun ajaran yang relevan sama jenis ujian yang dipilih (PSAS = semester
  // ganjil/1, PSAT & PSAJ = semester genap/2). Kalau nggak ada yang cocok,
  // fallback tampilin semua biar admin tetap bisa pilih manual.
  const semesterDibutuhkan = KONFIGURASI_JENIS_UJIAN[jenisUjian]?.semester;
  const tahunAjaranTerfilter = daftarTahunAjaran.filter(
    (ta) => String(ta.semester) === semesterDibutuhkan
  );
  const opsiTahunAjaran =
    tahunAjaranTerfilter.length > 0 ? tahunAjaranTerfilter : daftarTahunAjaran;

  useEffect(() => {
    (async () => {
      try {
        const data = await ambilDaftarTahunAjaran();
        setDaftarTahunAjaran(data);
      } catch (err) {
        console.error(err);
        showToast?.("Gagal memuat daftar tahun ajaran", "error");
      } finally {
        setLoadingTahunAjaran(false);
      }
    })();
  }, [showToast]);

  // Begitu data tahun ajaran kemuat, pastikan tahunAjaranId yang aktif
  // selalu ada di daftar opsi yang lagi ditampilin (jenisUjian sendiri
  // sudah fixed dari prop, jadi tidak perlu lagi jadi dependency di sini).
  useEffect(() => {
    if (opsiTahunAjaran.length === 0) {
      setTahunAjaranId("");
      return;
    }
    const masihAda = opsiTahunAjaran.some((ta) => ta.id === tahunAjaranId);
    if (!masihAda) {
      // Prioritaskan yang is_active kalau ada
      const aktif = opsiTahunAjaran.find((ta) => ta.is_active);
      setTahunAjaranId((aktif || opsiTahunAjaran[0]).id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daftarTahunAjaran]);

  // Begitu tahunAjaranId siap (termasuk pas tab ini pertama kali dibuka
  // atau admin balik lagi setelah sempat pindah ke card lain), coba tarik
  // dulu data yang SUDAH TERSIMPAN di peserta_ujian buat kombinasi
  // jenisUjian + tahunAjaranId ini. Kalau ada, langsung isi hasilAsli +
  // quotaPerRuangan dari situ -- jadi admin lihat lagi hasil yang udah
  // disimpan, bukan form kosong kayak awal. Kalau belum pernah
  // diproses/disimpan sama sekali, biarin kosong seperti semula (nunggu
  // admin pencet "Proses Pembagian").
  useEffect(() => {
    if (!tahunAjaranId) return;
    let dibatalkan = false;
    (async () => {
      setMemuatTersimpan(true);
      setHasilAsli(null);
      setQuotaPerRuangan(null);
      try {
        const ujian = await cariUjian(supabase, jenisUjian, tahunAjaranId);
        if (!ujian) return; // belum pernah diproses buat kombinasi ini
        const tersimpan = await ambilPembagianTersimpan(supabase, ujian.id);
        if (dibatalkan || tersimpan.length === 0) return;

        setKapasitas(ujian.kapasitas_ruangan || kapasitas);
        setHasilAsli(tersimpan);
        setTargetPerKelas(hitungTotalPerKelas(tersimpan));
        setDaftarKelas(
          [...new Set(tersimpan.flatMap((r) => r.siswa.map((s) => s.asal_kelas)))].sort()
        );
        setQuotaPerRuangan(
          tersimpan.map((r) => {
            const quota = {};
            r.siswa.forEach((s) => {
              quota[s.asal_kelas] = (quota[s.asal_kelas] || 0) + 1;
            });
            return { nomor_ruangan: r.nomor_ruangan, quota };
          })
        );
        setRuanganPreviewAktif(tersimpan[0]?.nomor_ruangan ?? null);
      } catch (err) {
        console.error(err);
        showToast?.("Gagal memuat data tersimpan: " + err.message, "error");
      } finally {
        if (!dibatalkan) setMemuatTersimpan(false);
      }
    })();
    return () => {
      dibatalkan = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahunAjaranId, jenisUjian]);

  const handleProses = async () => {
    if (!tahunAjaranId) {
      showToast?.("Pilih tahun ajaran dulu", "error");
      return;
    }
    // Guard: kapasitas <= 0 (misal field dikosongin admin) bikin
    // bagiRuangan() looping tanpa henti -- ditangkep di sini dulu sebelum
    // sempat manggil algoritmanya.
    if (!Number.isFinite(kapasitas) || kapasitas <= 0) {
      showToast?.("Kapasitas per ruangan harus angka positif", "error");
      return;
    }
    setMemproses(true);
    setHasilAsli(null);
    setQuotaPerRuangan(null);
    try {
      const hasil = await prosesPembagianRuangan(supabase, tahunAjaranId, jenisUjian, kapasitas);
      if (hasil.length === 0) {
        showToast?.("Tidak ada siswa aktif ditemukan untuk kombinasi ini", "error");
      }
      setHasilAsli(hasil);
      setTargetPerKelas(hitungTotalPerKelas(hasil));
      setDaftarKelas([...new Set(hasil.flatMap((r) => r.siswa.map((s) => s.asal_kelas)))].sort());
      // quota awal = breakdown hasil auto-generate, admin tinggal geser2 dari sini
      setQuotaPerRuangan(
        hasil.map((r) => {
          const quota = {};
          r.siswa.forEach((s) => {
            quota[s.asal_kelas] = (quota[s.asal_kelas] || 0) + 1;
          });
          return { nomor_ruangan: r.nomor_ruangan, quota };
        })
      );
      setRuanganPreviewAktif(hasil[0]?.nomor_ruangan ?? null);
    } catch (err) {
      console.error(err);
      showToast?.("Gagal memproses pembagian ruangan: " + err.message, "error");
    } finally {
      setMemproses(false);
    }
  };

  // Total quota per kelas SAAT INI (setelah admin ubah2), buat dibandingin
  // sama targetPerKelas -- ini yang nentuin tombol Simpan boleh diklik atau nggak.
  const totalPerKelasSaatIni = {};
  (quotaPerRuangan || []).forEach((r) => {
    Object.entries(r.quota).forEach(([kelas, jumlah]) => {
      totalPerKelasSaatIni[kelas] = (totalPerKelasSaatIni[kelas] || 0) + (Number(jumlah) || 0);
    });
  });
  const quotaValid =
    quotaPerRuangan != null &&
    daftarKelas.every(
      (kelas) => (totalPerKelasSaatIni[kelas] || 0) === (targetPerKelas[kelas] || 0)
    );

  const handleUbahQuota = (nomorRuangan, kelas, valueBaru) => {
    setQuotaPerRuangan((prev) =>
      prev.map((r) =>
        r.nomor_ruangan === nomorRuangan
          ? { ...r, quota: { ...r.quota, [kelas]: Math.max(0, Number(valueBaru) || 0) } }
          : r
      )
    );
  };

  const handleTambahRuangan = () => {
    setQuotaPerRuangan((prev) => {
      const nomorBaru = Math.max(0, ...prev.map((r) => r.nomor_ruangan)) + 1;
      const quotaKosong = Object.fromEntries(daftarKelas.map((k) => [k, 0]));
      return [...prev, { nomor_ruangan: nomorBaru, quota: quotaKosong }];
    });
  };

  const handleHapusRuangan = (nomorRuangan) => {
    setQuotaPerRuangan((prev) => prev.filter((r) => r.nomor_ruangan !== nomorRuangan));
    setRuanganPreviewAktif((prev) => (prev === nomorRuangan ? null : prev));
  };

  // hasilLive = siswa SPESIFIK yang beneran masuk tiap ruangan sesuai quota
  // yang lagi di-set admin SAAT INI (dihitung ulang tiap quota berubah,
  // dipakai buat tab "Preview Per Ruangan").
  const hasilLive = useMemo(() => {
    if (!hasilAsli || !quotaPerRuangan) return [];
    return terapkanQuotaManual(hasilAsli, quotaPerRuangan);
  }, [hasilAsli, quotaPerRuangan]);

  const handleSimpan = async () => {
    if (!hasilAsli || !quotaPerRuangan || !quotaValid) return;
    setMenyimpan(true);
    try {
      const hasilFinal = terapkanQuotaManual(hasilAsli, quotaPerRuangan).filter(
        (r) => r.siswa.length > 0
      );
      const ujian = await getOrCreateUjian(supabase, jenisUjian, tahunAjaranId, kapasitas);
      const jumlah = await simpanPembagianRuangan(supabase, ujian.id, hasilFinal);
      showToast?.(`Berhasil disimpan: ${jumlah} siswa ke ${hasilFinal.length} ruangan`, "success");
    } catch (err) {
      console.error(err);
      showToast?.("Gagal menyimpan ke database: " + err.message, "error");
    } finally {
      setMenyimpan(false);
    }
  };

  const totalSiswaQuota = Object.values(totalPerKelasSaatIni).reduce((sum, v) => sum + v, 0);

  return (
    <div className="p-4 sm:p-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4"
      >
        <ChevronLeft size={16} /> Kembali ke Sub-fitur
      </button>

      <div className="mb-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">Jenis Ujian</p>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {JENIS_UJIAN_LABEL[jenisUjian] || jenisUjian}
        </p>
      </div>

      {/* Form pilihan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Tahun Ajaran
          </label>
          <select
            value={tahunAjaranId}
            onChange={(e) => setTahunAjaranId(e.target.value)}
            disabled={loadingTahunAjaran}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
          >
            {loadingTahunAjaran && <option>Memuat...</option>}
            {!loadingTahunAjaran && opsiTahunAjaran.length === 0 && (
              <option value="">Belum ada tahun ajaran</option>
            )}
            {opsiTahunAjaran.map((ta) => (
              <option key={ta.id} value={ta.id}>
                {labelTahunAjaran(ta)} - Semester{" "}
                {ta.semester === 1 || ta.semester === "1" ? "Ganjil" : "Genap"}
                {ta.is_active ? " (Aktif)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Kapasitas per Ruangan
          </label>
          <input
            type="number"
            min={1}
            // value dikosongin (bukan "0") pas kapasitas lagi 0/kosong -- kalau
            // dipaksa selalu jadi angka, field-nya nempelin "0" di depan tiap
            // admin ngetik ulang abis clear (bug klasik controlled number input).
            value={kapasitas === 0 ? "" : kapasitas}
            onChange={(e) => {
              const nilai = e.target.value;
              setKapasitas(nilai === "" ? 0 : Number(nilai));
            }}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
          />
        </div>
      </div>

      {memuatTersimpan && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Memuat data tersimpan...</p>
      )}

      <button
        onClick={handleProses}
        disabled={memproses || memuatTersimpan}
        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-all active:scale-95"
      >
        <RefreshCw size={16} className={memproses ? "animate-spin" : ""} />
        {memproses ? "Memproses..." : "Proses Pembagian (Preview)"}
      </button>

      {/* Tabel quota manual -- hasil auto-generate ditampilkan di sini,
          admin boleh ubah angkanya per kelas per ruangan sebelum disimpan. */}
      {quotaPerRuangan && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
            <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
              <DoorOpen size={16} /> {quotaPerRuangan.length} ruangan
            </span>
            <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
              <Users size={16} /> {totalSiswaQuota} siswa
            </span>
          </div>

          {/* Tab switcher: Edit Quota <-> Preview Per Ruangan */}
          <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setTabAktif("edit")}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tabAktif === "edit"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <Table2 size={15} /> Edit Quota
            </button>
            <button
              onClick={() => setTabAktif("preview")}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tabAktif === "preview"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <Eye size={15} /> Preview Per Ruangan
            </button>
          </div>

          {tabAktif === "edit" && (
            <>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Angka di bawah hasil auto-generate (proporsional) -- boleh diubah manual per kelas
                per ruangan sesuai kebutuhan. Total tiap kolom kelas harus PAS sama jumlah siswa
                kelas itu sebelum bisa disimpan.
              </p>

              <div className="overflow-x-auto mb-2 -mx-4 sm:mx-0 px-4 sm:px-0">
                <table className="w-full text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left py-2 pr-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        Ruangan
                      </th>
                      {daftarKelas.map((kelas) => (
                        <th
                          key={kelas}
                          className="text-center py-2 px-2 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap"
                        >
                          {kelas}
                        </th>
                      ))}
                      <th className="text-center py-2 px-2 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        Total
                      </th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotaPerRuangan.map((r) => {
                      const totalRuanganIni = Object.values(r.quota).reduce(
                        (sum, v) => sum + (Number(v) || 0),
                        0
                      );
                      return (
                        <tr
                          key={r.nomor_ruangan}
                          className="border-t border-gray-100 dark:border-gray-700"
                        >
                          <td className="py-1.5 pr-3 font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            Ruang {r.nomor_ruangan}
                          </td>
                          {daftarKelas.map((kelas) => (
                            <td key={kelas} className="py-1.5 px-2">
                              <input
                                type="number"
                                min={0}
                                value={!r.quota[kelas] ? "" : r.quota[kelas]}
                                onChange={(e) =>
                                  handleUbahQuota(r.nomor_ruangan, kelas, e.target.value)
                                }
                                className="w-14 sm:w-16 text-center px-1.5 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                              />
                            </td>
                          ))}
                          <td
                            className={`text-center px-2 font-semibold ${
                              totalRuanganIni > kapasitas
                                ? "text-red-600 dark:text-red-400"
                                : "text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {totalRuanganIni}
                          </td>
                          <td className="text-center px-1">
                            <button
                              onClick={() => handleHapusRuangan(r.nomor_ruangan)}
                              title="Hapus ruangan ini"
                              className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Baris target & selisih, buat bantu admin liat kolom mana yang belum pas */}
                    <tr className="border-t-2 border-gray-200 dark:border-gray-600">
                      <td className="py-1.5 pr-3 text-gray-500 dark:text-gray-400">Target</td>
                      {daftarKelas.map((kelas) => {
                        const sudah = totalPerKelasSaatIni[kelas] || 0;
                        const target = targetPerKelas[kelas] || 0;
                        const pas = sudah === target;
                        return (
                          <td
                            key={kelas}
                            className={`text-center px-2 ${
                              pas
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-600 dark:text-red-400 font-semibold"
                            }`}
                          >
                            {sudah}/{target}
                          </td>
                        );
                      })}
                      <td></td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <button
                onClick={handleTambahRuangan}
                className="flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-5"
              >
                <Plus size={15} /> Tambah Ruangan
              </button>
            </>
          )}

          {tabAktif === "preview" && (
            <div className="mb-5">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Pilih Ruangan
              </label>
              <select
                value={ruanganPreviewAktif ?? ""}
                onChange={(e) => setRuanganPreviewAktif(Number(e.target.value))}
                className="w-full sm:w-64 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 mb-4"
              >
                {quotaPerRuangan.map((r) => (
                  <option key={r.nomor_ruangan} value={r.nomor_ruangan}>
                    Ruang {r.nomor_ruangan}
                  </option>
                ))}
              </select>

              {(() => {
                const siswaRuanganIni =
                  hasilLive.find((h) => h.nomor_ruangan === ruanganPreviewAktif)?.siswa || [];
                const kelasDiRuanganIni = daftarKelas.filter((kelas) =>
                  siswaRuanganIni.some((s) => s.asal_kelas === kelas)
                );

                if (siswaRuanganIni.length === 0) {
                  return (
                    <p className="text-xs text-gray-400 italic">Belum ada siswa di ruangan ini.</p>
                  );
                }

                return (
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
                      <div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                          Ruang {ruanganPreviewAktif}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {JENIS_UJIAN_LABEL[jenisUjian] || jenisUjian}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        {siswaRuanganIni.length} siswa
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                      {kelasDiRuanganIni.map((kelas) => {
                        const siswaKelasIni = siswaRuanganIni.filter((s) => s.asal_kelas === kelas);
                        return (
                          <div key={kelas}>
                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                              Kelas {kelas}
                            </p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1.5">
                              {siswaKelasIni.length} orang
                            </p>
                            <ol className="text-xs text-gray-700 dark:text-gray-300 list-decimal list-inside space-y-0.5">
                              {siswaKelasIni.map((s) => (
                                <li key={s.id} className="truncate">
                                  {s.nama}
                                </li>
                              ))}
                            </ol>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {!quotaValid && (
            <p className="text-xs text-red-600 dark:text-red-400 mb-3">
              Total per kelas belum pas dengan jumlah siswa aktif -- cek baris "Target" di atas
              (kolom yang merah berarti belum sesuai).
            </p>
          )}

          <button
            onClick={handleSimpan}
            disabled={menyimpan || !quotaValid}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-all active:scale-95"
          >
            <Save size={16} />
            {menyimpan ? "Menyimpan..." : "Simpan ke Database"}
          </button>
        </div>
      )}
    </div>
  );
};

export default PembagianRuanganTab;
