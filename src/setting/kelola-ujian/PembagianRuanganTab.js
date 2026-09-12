// setting/kelola-ujian/PembagianRuanganTab.js
// Sub-fitur "Pembagian Ruangan" dari Manajemen Ujian.
// Alur: pilih jenis ujian + tahun ajaran -> "Proses Pembagian" (preview
// dulu, belum nyimpen ke DB) -> kalau udah oke, "Simpan ke Database".
// Proses ulang aman dipanggil berkali-kali (lihat simpanPembagianRuangan
// di pembagianRuanganSupabase.js -- data lama dihapus dulu tiap simpan).

import React, { useState, useEffect } from "react";
import { ChevronLeft, RefreshCw, Save, Users, DoorOpen } from "lucide-react";
import { supabase } from "../../supabaseClient";
import {
  ambilDaftarTahunAjaran,
  getOrCreateUjian,
  prosesPembagianRuangan,
  simpanPembagianRuangan,
  KONFIGURASI_JENIS_UJIAN,
} from "./pembagianRuanganSupabase";

const JENIS_UJIAN_OPTIONS = [
  {
    value: "PSAS",
    label: "PSAS - Penilaian Sumatif Akhir Semester (kelas 7-9)",
  },
  {
    value: "PSAT",
    label: "PSAT - Penilaian Sumatif Akhir Tahun (kelas 7-8)",
  },
  {
    value: "PSAJ",
    label: "PSAJ - Penilaian Sumatif Akhir Jenjang (kelas 9)",
  },
];

// Cari kolom yang paling masuk akal buat label tahun ajaran, karena kita
// nggak tau pasti nama kolomnya (year / tahun_ajaran / name / dst)
function labelTahunAjaran(row) {
  return row.year || row.tahun_ajaran || row.name || row.label || row.nama || `ID: ${row.id}`;
}

const PembagianRuanganTab = ({ showToast, onBack }) => {
  const [daftarTahunAjaran, setDaftarTahunAjaran] = useState([]);
  const [tahunAjaranId, setTahunAjaranId] = useState("");
  const [jenisUjian, setJenisUjian] = useState("PSAS");
  const [kapasitas, setKapasitas] = useState(KONFIGURASI_JENIS_UJIAN.PSAS?.defaultKapasitas || 40);

  const [loadingTahunAjaran, setLoadingTahunAjaran] = useState(true);
  const [memproses, setMemproses] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [hasilPreview, setHasilPreview] = useState(null);

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
        const data = await ambilDaftarTahunAjaran(supabase);
        setDaftarTahunAjaran(data);
      } catch (err) {
        console.error(err);
        showToast?.("Gagal memuat daftar tahun ajaran", "error");
      } finally {
        setLoadingTahunAjaran(false);
      }
    })();
  }, [showToast]);

  // Tiap ganti jenis ujian, kapasitas direset ke default jenis itu
  // (PSAS/PSAT = 40, PSAJ = 20) -- admin tetap bisa ubah manual setelahnya
  // kalau perlu beda dari default.
  useEffect(() => {
    const defaultKapasitas = KONFIGURASI_JENIS_UJIAN[jenisUjian]?.defaultKapasitas || 40;
    setKapasitas(defaultKapasitas);
  }, [jenisUjian]);

  // Setiap ganti jenis ujian (atau data tahun ajaran baru kemuat), pastikan
  // tahunAjaranId yang aktif selalu ada di daftar opsi yang lagi ditampilin.
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
  }, [jenisUjian, daftarTahunAjaran]);

  const handleProses = async () => {
    if (!tahunAjaranId) {
      showToast?.("Pilih tahun ajaran dulu", "error");
      return;
    }
    setMemproses(true);
    setHasilPreview(null);
    try {
      const hasil = await prosesPembagianRuangan(supabase, tahunAjaranId, jenisUjian, kapasitas);
      if (hasil.length === 0) {
        showToast?.("Tidak ada siswa aktif ditemukan untuk kombinasi ini", "error");
      }
      setHasilPreview(hasil);
    } catch (err) {
      console.error(err);
      showToast?.("Gagal memproses pembagian ruangan: " + err.message, "error");
    } finally {
      setMemproses(false);
    }
  };

  const handleSimpan = async () => {
    if (!hasilPreview) return;
    setMenyimpan(true);
    try {
      const ujian = await getOrCreateUjian(supabase, jenisUjian, tahunAjaranId, kapasitas);
      const jumlah = await simpanPembagianRuangan(supabase, ujian.id, hasilPreview);
      showToast?.(
        `Berhasil disimpan: ${jumlah} siswa ke ${hasilPreview.length} ruangan`,
        "success"
      );
    } catch (err) {
      console.error(err);
      showToast?.("Gagal menyimpan ke database: " + err.message, "error");
    } finally {
      setMenyimpan(false);
    }
  };

  const totalSiswa = hasilPreview?.reduce((sum, r) => sum + r.siswa.length, 0) || 0;

  return (
    <div className="p-4 sm:p-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4"
      >
        <ChevronLeft size={16} /> Kembali ke Manajemen Ujian
      </button>

      {/* Form pilihan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Jenis Ujian
          </label>
          <select
            value={jenisUjian}
            onChange={(e) => setJenisUjian(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
          >
            {JENIS_UJIAN_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

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
            value={kapasitas}
            onChange={(e) => setKapasitas(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
          />
        </div>
      </div>

      <button
        onClick={handleProses}
        disabled={memproses}
        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-all active:scale-95"
      >
        <RefreshCw size={16} className={memproses ? "animate-spin" : ""} />
        {memproses ? "Memproses..." : "Proses Pembagian (Preview)"}
      </button>

      {/* Preview hasil */}
      {hasilPreview && (
        <div className="mt-6">
          <div className="flex items-center gap-4 mb-4 text-sm">
            <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
              <DoorOpen size={16} /> {hasilPreview.length} ruangan
            </span>
            <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
              <Users size={16} /> {totalSiswa} siswa
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5 max-h-96 overflow-y-auto pr-1">
            {hasilPreview.map((r) => {
              // Hitung breakdown asal kelas buat ditampilin ringkas
              const breakdown = {};
              r.siswa.forEach((s) => {
                breakdown[s.asal_kelas] = (breakdown[s.asal_kelas] || 0) + 1;
              });

              return (
                <div
                  key={r.nomor_ruangan}
                  className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                >
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">
                    Ruangan {r.nomor_ruangan}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {r.siswa.length} siswa —{" "}
                    {Object.entries(breakdown)
                      .map(([kelas, jumlah]) => `${kelas}: ${jumlah}`)
                      .join(", ")}
                  </p>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleSimpan}
            disabled={menyimpan}
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
