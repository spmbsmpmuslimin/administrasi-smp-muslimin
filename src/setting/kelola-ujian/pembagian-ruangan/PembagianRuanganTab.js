// setting/kelola-ujian/PembagianRuanganTab.js
// Sub-fitur "Pembagian Ruangan" dari Manajemen Ujian.
// Alur: pilih jenis ujian + tahun ajaran -> "Proses Pembagian" (preview
// dulu, belum nyimpen ke DB) -> kalau udah oke, "Simpan ke Database".
// Proses ulang aman dipanggil berkali-kali (lihat simpanPembagianRuangan
// di pembagianRuanganSupabase.js -- data lama dihapus dulu tiap simpan).
//
// Kelas peserta per jenis ujian (PSAS = 7-9, PSAT = 7-8, PSAJ = 9 saja)
// SUDAH otomatis difilter di prosesPembagianRuangan() lewat
// KONFIGURASI_JENIS_UJIAN[jenisUjian].grades -- jadi sengaja TIDAK ada
// dropdown "pilih kelas" manual di UI ini, admin cukup pilih jenis ujian
// di layar sebelumnya.

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
  FileSpreadsheet,
  FileText,
  Loader2,
  LayoutGrid,
} from "lucide-react";
import { supabase } from "../../../supabaseClient";
import {
  ambilDaftarTahunAjaran,
  ambilSiswaPerKelas,
  getOrCreateUjian,
  cariUjian,
  prosesPembagianRuangan,
  simpanPembagianRuangan,
  ambilPembagianTersimpan,
  KONFIGURASI_JENIS_UJIAN,
} from "./pembagianRuanganSupabase";
import { bagiRuanganPerJenjang, bangunMatrixKomposisi } from "./bagiRuanganPerJenjang";
import { terapkanQuotaManual, hitungTotalPerKelas } from "./bagiRuangan";
import { exportDaftarPesertaUjian } from "./daftarPesertaExcelExport";
import { exportDaftarPesertaUjianPdf } from "./daftarPesertaPdfExport";
import { bangunPetaNoPeserta } from "./noPeserta";

const JENIS_UJIAN_LABEL = {
  PSAS: "PSAS - Penilaian Sumatif Akhir Semester (kelas 7-9)",
  PSAT: "PSAT - Penilaian Sumatif Akhir Tahun (kelas 7-8)",
  PSAJ: "PSAJ - Penilaian Sumatif Akhir Jenjang (kelas 9)",
};

// Pilihan algoritma pembagian ruangan (lihat bagiRuanganPerJenjang.js buat
// detail cara kerja tiap versi). versi_skema tersimpan di record `ujian`
// pas pertama kali diproses & disimpan -- gak bisa diganti lagi setelah
// itu lewat sub-fitur ini (lihat versiSkemaTerkunci di bawah).
const VERSI_SKEMA_LIST = [
  {
    value: "v1",
    label: "V1 - Rotasi Penuh",
    deskripsi: "Tiap ruang kecampur rata dari semua kelas asal di jenjang itu.",
  },
  {
    value: "v2",
    label: "V2 - Rantai Muter",
    deskripsi: "Tiap ruang cuma gabungan 2 kelas yang bersebelahan.",
  },
];

// 2 tab level PALING ATAS: "Komposisi Ruangan" (bandingin V1 vs V2 dulu,
// murni preview, belum proses/simpan apa-apa) dan "Pembagian Ruangan"
// (alur asli: proses -> quota manual -> simpan). Beda sama TAB_LIST di
// bawah, yang itu sub-tab DI DALAM "Pembagian Ruangan" doang.
const VIEW_TAB_LIST = [
  { id: "komposisi", label: "Komposisi Ruangan", icon: LayoutGrid },
  { id: "pembagian", label: "Pembagian Ruangan", icon: DoorOpen },
];

// Definisi 3 tab di bagian bawah (dulu masing-masing ditulis manual jadi
// 3 blok JSX yang identik kecuali label/ikon) -- sekarang cukup 1 array
// yang di-map, biar kalau nambah/ubah tab nggak perlu copy-paste style-nya lagi.
const TAB_LIST = [
  { id: "edit", label: "Pembagian Ruangan", icon: Table2 },
  { id: "preview", label: "Preview Per Ruangan", icon: Eye },
  { id: "export", label: "Export Daftar Peserta", icon: FileSpreadsheet },
];

// Cari kolom yang paling masuk akal buat label tahun ajaran, karena kita
// nggak tau pasti nama kolomnya (year / tahun_ajaran / name / dst)
function labelTahunAjaran(row) {
  return row.year || row.tahun_ajaran || row.name || row.label || row.nama || `ID: ${row.id}`;
}

// Render 1 tabel matrix (Ruang x Kelas) buat 1 jenjang, gaya sama kayak
// file Excel referensi awal: baris = ruang, kolom = kelas asal, + baris
// "Cek Total" (dijumlah dari hasil pembagian) & "Data Asli" (jumlah siswa
// kelas itu sebelum dibagi) buat validasi visual -- kalau 2 baris itu gak
// pas di 1 kolom, kolomnya di-highlight merah (harusnya nggak pernah
// kejadian selama algoritmanya bener, tapi tetep dicek biar keliatan
// kalau ada yang aneh).
const TabelMatrixJenjang = ({ data }) => {
  const { jenjang, urutanKelas, ruang, cekTotal, dataAsli } = data;
  return (
    <div className="mb-6">
      <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">Jenjang {jenjang}</p>
      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <table className="w-full text-xs sm:text-sm border-collapse rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700">
              <th className="text-left py-2.5 px-3 font-bold text-gray-900 dark:text-white whitespace-nowrap border-b border-gray-300 dark:border-gray-600">
                Ruangan
              </th>
              {urutanKelas.map((kelas) => (
                <th
                  key={kelas}
                  className="text-center py-2.5 px-3 font-bold text-gray-900 dark:text-white whitespace-nowrap border-b border-gray-300 dark:border-gray-600"
                >
                  {kelas}
                </th>
              ))}
              <th className="text-center py-2.5 px-3 font-bold text-gray-900 dark:text-white whitespace-nowrap border-b border-gray-300 dark:border-gray-600">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {ruang.map((r, idx) => (
              <tr
                key={r.nomor_ruangan}
                className={`border-b border-gray-200 dark:border-gray-700 ${
                  idx % 2 === 1 ? "bg-gray-50 dark:bg-gray-800/40" : "bg-white dark:bg-gray-800"
                }`}
              >
                <td className="py-2 px-3 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                  Ruang {r.nomor_ruangan}
                </td>
                {urutanKelas.map((kelas) => (
                  <td
                    key={kelas}
                    className="text-center py-2 px-3 font-medium text-gray-900 dark:text-white"
                  >
                    {r.perKelas[kelas] || 0}
                  </td>
                ))}
                <td className="text-center py-2 px-3 font-bold text-gray-900 dark:text-white">
                  {r.total}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-400 dark:border-gray-500 bg-gray-50 dark:bg-gray-800/60">
              <td className="py-2 px-3 font-bold text-gray-900 dark:text-white">Cek Total</td>
              {urutanKelas.map((kelas) => {
                const pas = (cekTotal[kelas] || 0) === (dataAsli[kelas] || 0);
                return (
                  <td key={kelas} className="text-center py-2 px-3">
                    <span
                      className={`inline-block min-w-[2rem] px-2 py-0.5 rounded-md font-bold ${
                        pas
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                          : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                      }`}
                    >
                      {cekTotal[kelas] || 0}
                    </span>
                  </td>
                );
              })}
              <td></td>
            </tr>
            <tr className="bg-gray-50 dark:bg-gray-800/60">
              <td className="py-2 px-3 font-semibold text-gray-900 dark:text-white">Data Asli</td>
              {urutanKelas.map((kelas) => (
                <td
                  key={kelas}
                  className="text-center py-2 px-3 font-medium text-gray-900 dark:text-white"
                >
                  {dataAsli[kelas] || 0}
                </td>
              ))}
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

// jenisUjian sekarang datang dari level atas (JenisUjianMenuTab / pemilihan
// PSAS-PSAT-PSAJ) -- sudah fixed di sini, jadi tidak ada lagi dropdown buat
// gonta-ganti jenis ujian di dalam sub-fitur ini.
const PembagianRuanganTab = ({ jenisUjian, showToast, onBack }) => {
  const [daftarTahunAjaran, setDaftarTahunAjaran] = useState([]);
  const [tahunAjaranId, setTahunAjaranId] = useState("");
  const [kapasitas, setKapasitas] = useState(
    KONFIGURASI_JENIS_UJIAN[jenisUjian]?.defaultKapasitas || 40
  );
  const [versiSkema, setVersiSkema] = useState("v1");
  // true kalau ujian utk kombinasi jenisUjian+tahunAjaranId ini SUDAH ada
  // record-nya di DB (udah pernah diproses & disimpan) -- versi_skema
  // record itu gak bisa diganti lagi lewat sub-fitur ini, jadi radio-nya
  // dikunci & cuma nampilin versi yang beneran kepake.
  const [versiSkemaTerkunci, setVersiSkemaTerkunci] = useState(false);

  // Tab level PALING ATAS: "komposisi" (bandingin V1 vs V2, preview doang)
  // atau "pembagian" (alur proses -> quota manual -> simpan, default).
  const [viewAktif, setViewAktif] = useState("pembagian");
  // Hasil bangunMatrixKomposisi() buat KEDUA versi sekaligus: { v1: [...], v2: [...] },
  // masing-masing array per jenjang. null = belum pernah dihitung.
  const [komposisiData, setKomposisiData] = useState(null);
  const [memuatKomposisi, setMemuatKomposisi] = useState(false);
  // tahunAjaranId waktu komposisiData terakhir dihitung -- dipakai buat
  // deteksi "udah basi" (tahun ajaran diganti) tanpa perlu useEffect+reset
  // terpisah; render tinggal bandingin ini sama tahunAjaranId yang aktif.
  const [komposisiUntukTahunAjaran, setKomposisiUntukTahunAjaran] = useState(null);
  // Sub-tab DI DALAM tab Komposisi Ruangan: lagi liatin V1 atau V2.
  const [komposisiVersiAktif, setKomposisiVersiAktif] = useState("v1");

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
  // Tab "Export Daftar": ruangan mana yang mau diexport. "semua" = semua
  // ruangan jadi 1 file (1 sheet per ruangan), selain itu isinya nomor ruangan.
  const [ruanganExport, setRuanganExport] = useState("semua");
  const [mengexport, setMengexport] = useState(false);
  const [mengexportPdf, setMengexportPdf] = useState(false);

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
      setVersiSkemaTerkunci(false);
      try {
        const ujian = await cariUjian(supabase, jenisUjian, tahunAjaranId);
        if (!ujian) return; // belum pernah diproses buat kombinasi ini
        setVersiSkema(ujian.versi_skema || "v1");
        setVersiSkemaTerkunci(true);
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

  // Hitung V1 & V2 SEKALIGUS (murni di memori, gak nyentuh DB) buat
  // ditampilin berdampingan di tab "Komposisi Ruangan" -- beda dari
  // handleProses di bawah yang cuma proses 1 versi (yang lagi dipilih di
  // radio) dan itu yang bakal disimpan.
  const handleLihatKomposisi = async () => {
    if (!tahunAjaranId) {
      showToast?.("Pilih tahun ajaran dulu", "error");
      return;
    }
    setMemuatKomposisi(true);
    try {
      const allowedGrades = KONFIGURASI_JENIS_UJIAN[jenisUjian]?.grades || null;
      const dataSiswaPerKelas = await ambilSiswaPerKelas(supabase, tahunAjaranId, allowedGrades);
      const hasilV1 = bagiRuanganPerJenjang(dataSiswaPerKelas, "v1");
      const hasilV2 = bagiRuanganPerJenjang(dataSiswaPerKelas, "v2");
      setKomposisiData({
        v1: bangunMatrixKomposisi(hasilV1, dataSiswaPerKelas),
        v2: bangunMatrixKomposisi(hasilV2, dataSiswaPerKelas),
      });
      setKomposisiUntukTahunAjaran(tahunAjaranId);
    } catch (err) {
      console.error(err);
      showToast?.("Gagal memuat komposisi ruangan: " + err.message, "error");
    } finally {
      setMemuatKomposisi(false);
    }
  };

  // Dipanggil dari tombol "Pakai versi ini" di tab Komposisi Ruangan --
  // set radio versiSkema di tab Pembagian Ruangan, terus langsung pindah
  // ke tab itu biar admin tinggal klik "Proses Pembagian". Gak ngapa-
  // ngapain kalau versinya udah terkunci (ujian ini udah pernah diproses).
  const handlePilihVersi = (value) => {
    if (versiSkemaTerkunci) {
      showToast?.(
        "Versi udah terkunci ke " +
          versiSkema.toUpperCase() +
          " -- ujian ini sudah pernah diproses/disimpan",
        "error"
      );
      return;
    }
    setVersiSkema(value);
    setViewAktif("pembagian");
  };

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
      const hasil = await prosesPembagianRuangan(
        supabase,
        tahunAjaranId,
        jenisUjian,
        kapasitas,
        versiSkema
      );
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
  // Di-useMemo biar konsisten sama derived state lain di file ini (hasilLive,
  // petaNoPeserta) -- cuma dihitung ulang kalau quotaPerRuangan beneran berubah.
  const totalPerKelasSaatIni = useMemo(() => {
    const totals = {};
    (quotaPerRuangan || []).forEach((r) => {
      Object.entries(r.quota).forEach(([kelas, jumlah]) => {
        totals[kelas] = (totals[kelas] || 0) + (Number(jumlah) || 0);
      });
    });
    return totals;
  }, [quotaPerRuangan]);

  const quotaValid = useMemo(
    () =>
      quotaPerRuangan != null &&
      daftarKelas.every(
        (kelas) => (totalPerKelasSaatIni[kelas] || 0) === (targetPerKelas[kelas] || 0)
      ),
    [quotaPerRuangan, daftarKelas, totalPerKelasSaatIni, targetPerKelas]
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
      const ujian = await getOrCreateUjian(
        supabase,
        jenisUjian,
        tahunAjaranId,
        kapasitas,
        versiSkema
      );
      const jumlah = await simpanPembagianRuangan(
        supabase,
        ujian.id,
        hasilFinal,
        labelTahunAjaranAktif
      );
      showToast?.(`Berhasil disimpan: ${jumlah} siswa ke ${hasilFinal.length} ruangan`, "success");
    } catch (err) {
      console.error(err);
      showToast?.("Gagal menyimpan ke database: " + err.message, "error");
    } finally {
      setMenyimpan(false);
    }
  };

  // Label tahun ajaran yang lagi dipilih (mis. "2026/2027"), dipakai di
  // letterhead file Excel. Diambil dari record academic_years yang lagi
  // aktif di dropdown -- bukan diketik manual, biar ikut kebawa otomatis
  // kalau tahun ajarannya ganti.
  const labelTahunAjaranAktif = useMemo(() => {
    const ta = daftarTahunAjaran.find((t) => t.id === tahunAjaranId);
    return ta ? labelTahunAjaran(ta) : "";
  }, [daftarTahunAjaran, tahunAjaranId]);

  // Peta No. Peserta buat tab "Preview Per Ruangan" -- dihitung dari
  // hasilLive UTUH (semua ruangan, bukan cuma yang lagi dipilih di
  // dropdown) biar nomornya urut lintas ruangan, PERSIS sama kayak yang
  // dipakai di daftarPesertaExcelExport.js.
  const petaNoPeserta = useMemo(
    () => bangunPetaNoPeserta(hasilLive, labelTahunAjaranAktif),
    [hasilLive, labelTahunAjaranAktif]
  );

  const handleExportExcel = async () => {
    setMengexport(true);
    try {
      // hasilLive dikirim UTUH (bukan difilter di sini) walaupun yang dicetak
      // cuma 1 ruangan -- nomor peserta urut lintas ruangan, jadi fungsi
      // export butuh lihat semuanya dulu baru motong.
      //
      // Sengaja pakai hasilLive (bukan narik ulang dari DB) supaya yang
      // keexport PERSIS yang lagi keliatan di layar, termasuk kalau admin
      // baru ngubah quota dan belum sempat klik "Simpan ke Database".
      await exportDaftarPesertaUjian({
        semuaRuangan: hasilLive,
        nomorRuangan: ruanganExport === "semua" ? null : Number(ruanganExport),
        jenisUjian,
        tahunAjaran: labelTahunAjaranAktif,
        showToast,
      });
    } catch (err) {
      console.error(err);
      showToast?.("Gagal export Excel: " + err.message, "error");
    } finally {
      setMengexport(false);
    }
  };

  // Sama persis alurnya dengan handleExportExcel di atas -- cuma manggil
  // fungsi PDF-nya, dan hasilLive yang dikirim juga UTUH (bukan difilter
  // duluan) karena nomor peserta harus urut lintas ruangan.
  const handleExportPdf = async () => {
    setMengexportPdf(true);
    try {
      await exportDaftarPesertaUjianPdf({
        semuaRuangan: hasilLive,
        nomorRuangan: ruanganExport === "semua" ? null : Number(ruanganExport),
        jenisUjian,
        tahunAjaran: labelTahunAjaranAktif,
        showToast,
      });
    } catch (err) {
      console.error(err);
      showToast?.("Gagal export PDF: " + err.message, "error");
    } finally {
      setMengexportPdf(false);
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

      {/* Tab level PALING ATAS: bandingin V1 vs V2 dulu di "Komposisi
          Ruangan" (preview doang, belum proses/simpan apa-apa), atau
          langsung ke alur "Pembagian Ruangan" (proses -> quota manual ->
          simpan). Beda sama TAB_LIST di bawah, yang itu sub-tab DI DALAM
          "Pembagian Ruangan". */}
      <div className="flex flex-wrap gap-1 mb-5 border-b border-gray-200 dark:border-gray-700">
        {VIEW_TAB_LIST.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setViewAktif(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                viewAktif === tab.id
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <Icon size={15} /> {tab.label}
            </button>
          );
        })}
      </div>

      {viewAktif === "komposisi" && (
        <div className="mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Bandingkan hasil 2 versi algoritma sebelum diproses beneran -- V1 (Rotasi Penuh) vs V2
            (Rantai Muter). Murni hitungan preview di memori, belum nyimpen apa-apa ke database.
          </p>

          {!tahunAjaranId && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
              Pilih tahun ajaran dulu di atas.
            </p>
          )}

          {tahunAjaranId && (!komposisiData || komposisiUntukTahunAjaran !== tahunAjaranId) && (
            <button
              onClick={handleLihatKomposisi}
              disabled={memuatKomposisi}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-all active:scale-95"
            >
              <RefreshCw size={16} className={memuatKomposisi ? "animate-spin" : ""} />
              {memuatKomposisi ? "Menghitung..." : "Lihat Komposisi Ruangan"}
            </button>
          )}

          {komposisiData && komposisiUntukTahunAjaran === tahunAjaranId && (
            <>
              {/* Sub-tab: lagi liatin matrix versi mana */}
              <div className="flex flex-wrap gap-1 mb-4 mt-1 border-b border-gray-200 dark:border-gray-700">
                {VERSI_SKEMA_LIST.map((opsi) => (
                  <button
                    key={opsi.value}
                    onClick={() => setKomposisiVersiAktif(opsi.value)}
                    className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      komposisiVersiAktif === opsi.value
                        ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                        : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                  >
                    {opsi.label}
                  </button>
                ))}
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                {VERSI_SKEMA_LIST.find((o) => o.value === komposisiVersiAktif)?.deskripsi}
              </p>

              {komposisiData[komposisiVersiAktif].map((matrixJenjang) => (
                <TabelMatrixJenjang key={matrixJenjang.jenjang} data={matrixJenjang} />
              ))}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => handlePilihVersi(komposisiVersiAktif)}
                  disabled={versiSkemaTerkunci}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-all active:scale-95"
                >
                  Pakai {VERSI_SKEMA_LIST.find((o) => o.value === komposisiVersiAktif)?.label} untuk
                  Pembagian Ruangan
                </button>

                <button
                  onClick={handleLihatKomposisi}
                  disabled={memuatKomposisi}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {memuatKomposisi
                    ? "Menghitung ulang..."
                    : "Hitung ulang (kalau data siswa berubah)"}
                </button>
              </div>

              {versiSkemaTerkunci && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  Versi udah terkunci ke {versiSkema.toUpperCase()} -- ujian ini sudah pernah
                  diproses/disimpan, jadi pilihan di sini nggak berpengaruh lagi.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {viewAktif === "pembagian" && (
        <>
          {/* Versi algoritma -- terkunci begitu ujian ini punya record tersimpan
              (lihat versiSkemaTerkunci), karena versi_skema cuma boleh dipilih
              sekali pas record ujian pertama kali dibikin. */}
          <div className="mb-5">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              Versi Algoritma Pembagian
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {VERSI_SKEMA_LIST.map((opsi) => (
                <label
                  key={opsi.value}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border transition-all ${
                    versiSkema === opsi.value
                      ? "border-indigo-400 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  } ${
                    versiSkemaTerkunci
                      ? "opacity-60 cursor-not-allowed"
                      : "cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="versiSkema"
                    value={opsi.value}
                    checked={versiSkema === opsi.value}
                    disabled={versiSkemaTerkunci}
                    onChange={(e) => setVersiSkema(e.target.value)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                      {opsi.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {opsi.deskripsi}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            {versiSkemaTerkunci && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                Versi terkunci — ujian ini sudah pernah diproses/disimpan dengan versi{" "}
                <span className="font-semibold">{versiSkema.toUpperCase()}</span>. Ganti versi cuma
                bisa dilakukan buat ujian yang belum pernah disimpan pada kombinasi jenis ujian +
                tahun ajaran ini.
              </p>
            )}
          </div>

          {memuatTersimpan && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Memuat data tersimpan...
            </p>
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

              {/* Tab switcher: Pembagian Ruangan <-> Preview Per Ruangan <-> Export.
              flex-wrap supaya 3 tab ini nggak kepotong/nyempil di layar HP sempit. */}
              <div className="flex flex-wrap gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
                {TAB_LIST.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setTabAktif(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                        tabAktif === tab.id
                          ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                          : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      }`}
                    >
                      <Icon size={15} /> {tab.label}
                    </button>
                  );
                })}
              </div>

              {tabAktif === "edit" && (
                <>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    Angka di bawah hasil auto-generate (proporsional) -- boleh diubah manual per
                    kelas per ruangan sesuai kebutuhan. Total tiap kolom kelas harus PAS sama jumlah
                    siswa kelas itu sebelum bisa disimpan.
                  </p>

                  <div className="overflow-x-auto mb-2 -mx-4 sm:mx-0 px-4 sm:px-0">
                    <table className="w-full text-xs sm:text-sm border-collapse rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700">
                          <th className="text-left py-2.5 px-3 font-bold text-gray-900 dark:text-white whitespace-nowrap border-b border-gray-300 dark:border-gray-600">
                            Ruangan
                          </th>
                          {daftarKelas.map((kelas) => (
                            <th
                              key={kelas}
                              className="text-center py-2.5 px-3 font-bold text-gray-900 dark:text-white whitespace-nowrap border-b border-gray-300 dark:border-gray-600"
                            >
                              {kelas}
                            </th>
                          ))}
                          <th className="text-center py-2.5 px-3 font-bold text-gray-900 dark:text-white whitespace-nowrap border-b border-gray-300 dark:border-gray-600">
                            Total
                          </th>
                          <th className="border-b border-gray-300 dark:border-gray-600"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {quotaPerRuangan.map((r, idx) => {
                          const totalRuanganIni = Object.values(r.quota).reduce(
                            (sum, v) => sum + (Number(v) || 0),
                            0
                          );
                          return (
                            <tr
                              key={r.nomor_ruangan}
                              className={`border-b border-gray-200 dark:border-gray-700 ${
                                idx % 2 === 1
                                  ? "bg-gray-50 dark:bg-gray-800/40"
                                  : "bg-white dark:bg-gray-800"
                              }`}
                            >
                              <td className="py-2 px-3 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
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
                                    className="w-14 sm:w-16 text-center px-1.5 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 font-semibold text-gray-900 dark:text-white"
                                  />
                                </td>
                              ))}
                              <td
                                className={`text-center px-3 font-bold ${
                                  totalRuanganIni > kapasitas
                                    ? "text-red-600 dark:text-red-400"
                                    : "text-gray-900 dark:text-white"
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
                        <tr className="border-t-2 border-gray-400 dark:border-gray-500 bg-gray-50 dark:bg-gray-800/60">
                          <td className="py-2 px-3 font-bold text-gray-900 dark:text-white">
                            Target
                          </td>
                          {daftarKelas.map((kelas) => {
                            const sudah = totalPerKelasSaatIni[kelas] || 0;
                            const target = targetPerKelas[kelas] || 0;
                            const pas = sudah === target;
                            return (
                              <td key={kelas} className="text-center px-3 py-2">
                                <span
                                  className={`inline-block min-w-[2.5rem] px-2 py-0.5 rounded-md font-bold ${
                                    pas
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                                      : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                                  }`}
                                >
                                  {sudah}/{target}
                                </span>
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

                    if (siswaRuanganIni.length === 0) {
                      return (
                        <p className="text-xs text-gray-400 italic">
                          Belum ada siswa di ruangan ini.
                        </p>
                      );
                    }

                    // Urut pakai no_kursi (= no_peserta yang disimpan ke DB) --
                    // sama persis dengan urutan di daftarPesertaExcelExport.js,
                    // biar preview ini benar-benar cerminan hasil Excel-nya.
                    const siswaTerurut = [...siswaRuanganIni].sort(
                      (a, b) => (a.no_kursi || 0) - (b.no_kursi || 0)
                    );

                    return (
                      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
                        {/* Kop dokumen -- meniru letterhead di file Excel */}
                        <div className="text-center mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                            DAFTAR PESERTA{" "}
                            {(JENIS_UJIAN_LABEL[jenisUjian] || jenisUjian).toUpperCase()}
                          </p>
                          {labelTahunAjaranAktif && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              TAHUN AJARAN {labelTahunAjaranAktif}
                            </p>
                          )}
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-0.5">
                            RUANG {String(ruanganPreviewAktif).padStart(2, "0")}
                          </p>
                        </div>

                        <div className="overflow-x-auto rounded-lg border border-gray-300 dark:border-gray-600">
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="bg-gray-100 dark:bg-gray-700">
                                <th className="py-2 pl-3 pr-3 w-10 text-left font-bold text-gray-900 dark:text-white border-b border-gray-300 dark:border-gray-600">
                                  No
                                </th>
                                <th className="py-2 pr-3 text-left font-bold text-gray-900 dark:text-white border-b border-gray-300 dark:border-gray-600">
                                  Nama Peserta
                                </th>
                                <th className="py-2 pr-3 text-center font-bold text-gray-900 dark:text-white border-b border-gray-300 dark:border-gray-600">
                                  No. Peserta
                                </th>
                                <th className="py-2 pr-3 text-center font-bold text-gray-900 dark:text-white border-b border-gray-300 dark:border-gray-600">
                                  NIS
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {siswaTerurut.map((s, idx) => (
                                <tr
                                  key={s.id}
                                  className={`border-b border-gray-200 dark:border-gray-700 ${
                                    idx % 2 === 1
                                      ? "bg-gray-50 dark:bg-gray-800/40"
                                      : "bg-white dark:bg-gray-800"
                                  }`}
                                >
                                  <td className="py-1.5 pl-3 pr-3 font-medium text-gray-900 dark:text-white">
                                    {idx + 1}
                                  </td>
                                  <td className="py-1.5 pr-3 font-semibold text-gray-900 dark:text-white truncate">
                                    {s.nama || "-"}
                                  </td>
                                  <td className="py-1.5 pr-3 text-center font-medium text-gray-900 dark:text-white">
                                    {petaNoPeserta.get(String(s.id)) || "-"}
                                  </td>
                                  <td className="py-1.5 pr-3 text-center font-medium text-gray-900 dark:text-white">
                                    {s.nis || "-"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <p className="text-right text-[11px] text-gray-500 dark:text-gray-400 mt-3">
                          {siswaRuanganIni.length} siswa
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}

              {tabAktif === "export" && (
                <div className="mb-5">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    Export daftar peserta ke Excel — buat ditempel di pintu ruangan & pegangan
                    pengawas. Isinya mengikuti pembagian yang sedang tampil di layar, termasuk
                    perubahan quota yang belum disimpan.
                  </p>

                  <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-4">
                    <div className="flex-1 sm:max-w-xs">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Ruangan
                      </label>
                      <select
                        value={ruanganExport}
                        onChange={(e) => setRuanganExport(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                      >
                        <option value="semua">Semua Ruangan (1 file, 1 sheet per ruangan)</option>
                        {quotaPerRuangan.map((r) => (
                          <option key={r.nomor_ruangan} value={r.nomor_ruangan}>
                            Ruang {String(r.nomor_ruangan).padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleExportExcel}
                      disabled={mengexport || hasilLive.length === 0}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-all active:scale-95"
                    >
                      {mengexport ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <FileSpreadsheet size={16} />
                      )}
                      {mengexport ? "Menyiapkan file..." : "Download Excel"}
                    </button>

                    <button
                      onClick={handleExportPdf}
                      disabled={mengexportPdf || hasilLive.length === 0}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 w-full sm:w-auto bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-all active:scale-95"
                    >
                      {mengexportPdf ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <FileText size={16} />
                      )}
                      {mengexportPdf ? "Menyiapkan file..." : "Download PDF"}
                    </button>
                  </div>

                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 mb-4">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">
                      Isi file
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Kop SMP Muslimin Cililin, judul{" "}
                      <span className="font-medium">
                        Daftar Peserta{" "}
                        {JENIS_UJIAN_LABEL[jenisUjian]?.split(" - ")[1] || jenisUjian}
                      </span>
                      , Tahun Ajaran {labelTahunAjaranAktif || "-"}, nomor ruangan, lalu tabel: No,
                      Nama Peserta, No. Peserta, NIS.
                    </p>
                  </div>
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
        </>
      )}
    </div>
  );
};

export default PembagianRuanganTab;
