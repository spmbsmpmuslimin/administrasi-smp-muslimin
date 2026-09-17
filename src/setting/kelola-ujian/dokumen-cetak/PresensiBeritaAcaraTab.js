// setting/kelola-ujian/PresensiBeritaAcaraTab.js
// Sub-fitur "Presensi, Berita Acara & Laporan" (bagian Presensi & Berita
// Acara -- "Laporan" rekap akhir belum dibangun, lihat catatan di
// JenisUjianMenuTab.js).
//
// Alur: pilih tahun ajaran -> pilih sesi ujian (dari Jadwal & Pembagian Ruangan)
// -> cetak Daftar Hadir dan/atau Berita Acara, per ruangan atau semua
// ruangan sekaligus. Kedua dokumen adalah PDF form KOSONG buat dicetak &
// diisi/ditandatangani manual di kertas -- BUKAN presensi digital.
//
// Pola alur & pemilihan tahun ajaran disamakan dengan KartuUjianTab.js /
// JadwalPengawasTab.js supaya UX-nya konsisten di seluruh sub-fitur
// Manajemen Ujian.

import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, Printer, DoorOpen, Loader2, ClipboardList, FileText } from "lucide-react";
import { supabase } from "../../../supabaseClient";
import {
  ambilDaftarTahunAjaran,
  cariUjian,
  KONFIGURASI_JENIS_UJIAN,
} from "../pembagian-ruangan/pembagianRuanganSupabase";
import { ambilRuanganUjian, ambilJadwalSesi } from "../jadwal-pengawas/jadwalPengawasSupabase";
import { ambilPesertaRuangan } from "./kartuUjianSupabase";
import { generateDaftarHadirPdf, generateBeritaAcaraPdf } from "./presensiBeritaAcaraPdf";

const JENIS_UJIAN_LABEL = {
  PSAS: "PSAS - Penilaian Sumatif Akhir Semester",
  PSAT: "PSAT - Penilaian Sumatif Akhir Tahun",
  PSAJ: "PSAJ - Penilaian Sumatif Akhir Jenjang",
};

function labelTahunAjaran(row) {
  return row.year || row.tahun_ajaran || row.name || row.label || row.nama || `ID: ${row.id}`;
}

function formatHariTanggalSingkat(tanggal) {
  if (!tanggal) return "-";
  const [tahun, bulan, hari] = tanggal.split("-").map(Number);
  const tgl = new Date(tahun, bulan - 1, hari);
  const namaHari = tgl.toLocaleDateString("id-ID", { weekday: "short" });
  return `${namaHari}, ${String(hari).padStart(2, "0")}-${String(bulan).padStart(2, "0")}-${tahun}`;
}

const PresensiBeritaAcaraTab = ({ jenisUjian, showToast, onBack }) => {
  const [daftarTahunAjaran, setDaftarTahunAjaran] = useState([]);
  const [tahunAjaranId, setTahunAjaranId] = useState("");
  const [loadingTahunAjaran, setLoadingTahunAjaran] = useState(true);

  const [ujian, setUjian] = useState(null);
  const [loadingUjian, setLoadingUjian] = useState(false);

  const [daftarJadwal, setDaftarJadwal] = useState([]);
  const [jadwalId, setJadwalId] = useState("");
  const [daftarRuangan, setDaftarRuangan] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  const [mencetak, setMencetak] = useState(null); // "hadir-<ruangan>" | "berita-<ruangan>" | "hadir-semua" | "berita-semua"

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

  useEffect(() => {
    if (opsiTahunAjaran.length === 0) {
      setTahunAjaranId("");
      return;
    }
    const masihAda = opsiTahunAjaran.some((ta) => ta.id === tahunAjaranId);
    if (!masihAda) {
      const aktif = opsiTahunAjaran.find((ta) => ta.is_active);
      setTahunAjaranId((aktif || opsiTahunAjaran[0]).id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daftarTahunAjaran]);

  useEffect(() => {
    if (!tahunAjaranId) {
      setUjian(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingUjian(true);
      try {
        const rec = await cariUjian(supabase, jenisUjian, tahunAjaranId);
        if (!cancelled) setUjian(rec);
      } catch (err) {
        console.error(err);
        if (!cancelled) showToast?.("Gagal memuat data ujian: " + err.message, "error");
      } finally {
        if (!cancelled) setLoadingUjian(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tahunAjaranId, jenisUjian, showToast]);

  const muatJadwalDanRuangan = useCallback(async () => {
    if (!ujian?.id) return;
    setLoadingData(true);
    try {
      const [jadwal, ruangan] = await Promise.all([
        ambilJadwalSesi(supabase, ujian.id),
        ambilRuanganUjian(supabase, ujian.id),
      ]);
      setDaftarJadwal(jadwal);
      setDaftarRuangan(ruangan);
    } catch (err) {
      console.error(err);
      showToast?.("Gagal memuat data jadwal/ruangan: " + err.message, "error");
    } finally {
      setLoadingData(false);
    }
  }, [ujian?.id, showToast]);

  useEffect(() => {
    muatJadwalDanRuangan();
  }, [muatJadwalDanRuangan]);

  // Begitu daftar jadwal berubah, default-kan pilihan ke sesi pertama.
  useEffect(() => {
    if (daftarJadwal.length === 0) {
      setJadwalId("");
      return;
    }
    setJadwalId((prev) => (daftarJadwal.some((j) => j.id === prev) ? prev : daftarJadwal[0].id));
  }, [daftarJadwal]);

  const jadwalTerpilih = daftarJadwal.find((j) => j.id === jadwalId);

  /**
   * Kumpulkan data peserta untuk 1 atau beberapa ruangan pada sesi jadwal
   * yang dipilih -- siap dilempar ke generator PDF. Data pengawas SENGAJA
   * tidak diikutkan -- kolom tanda tangan pengawas di PDF selalu kosong
   * (lihat catatan di presensiBeritaAcaraPdf.js).
   */
  const kumpulkanDataRuangan = async (nomorRuanganList) => {
    const hasil = [];
    for (const nomor of nomorRuanganList) {
      const daftarPeserta = await ambilPesertaRuangan(supabase, ujian.id, nomor);
      hasil.push({ nomor_ruangan: nomor, daftarPeserta });
    }
    return hasil;
  };

  const handleCetak = async (tipe, nomorRuangan = null) => {
    if (!jadwalTerpilih || !ujian) return;
    const key = `${tipe}-${nomorRuangan ?? "semua"}`;
    setMencetak(key);
    try {
      const nomorList =
        nomorRuangan == null ? daftarRuangan.map((r) => r.nomor_ruangan) : [nomorRuangan];
      const daftarRuanganData = await kumpulkanDataRuangan(nomorList);
      const ta = daftarTahunAjaran.find((t) => t.id === tahunAjaranId);
      const opsi = {
        daftarRuanganData,
        jadwal: jadwalTerpilih,
        jenisUjian,
        tahunAjaran: ta ? labelTahunAjaran(ta) : "",
        showToast,
      };
      if (tipe === "hadir") generateDaftarHadirPdf(opsi);
      else generateBeritaAcaraPdf(opsi);
    } catch (err) {
      console.error(err);
      showToast?.("Gagal mencetak: " + err.message, "error");
    } finally {
      setMencetak(null);
    }
  };

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

      <div className="mb-3 p-3 text-xs bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl text-indigo-700 dark:text-indigo-300">
        Daftar Hadir & Berita Acara dicetak sebagai <strong>PDF form kosong</strong> -- diisi &
        ditandatangani manual di kertas saat ujian berlangsung, bukan presensi digital.
      </div>

      <div className="mb-5 max-w-xs">
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

      {(loadingUjian || loadingData) && (
        <p className="text-xs text-gray-400 flex items-center gap-1.5 mb-4">
          <Loader2 size={14} className="animate-spin" /> Memuat data...
        </p>
      )}

      {!ujian && !loadingUjian && tahunAjaranId && (
        <div className="p-3 mb-5 text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-300">
          Data ujian untuk tahun ajaran ini belum diproses. Proses dulu{" "}
          <strong>Pembagian Ruangan</strong> (pilih versi skema & simpan) sebelum lanjut ke sini.
        </div>
      )}

      {ujian && !loadingData && daftarJadwal.length === 0 && (
        <div className="p-3 text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-300">
          Belum ada sesi jadwal untuk tahun ajaran ini. Atur dulu di{" "}
          <strong>Jadwal & Pembagian Ruangan</strong> supaya Daftar Hadir & Berita Acara bisa dicetak.
        </div>
      )}

      {ujian && !loadingData && daftarJadwal.length > 0 && (
        <>
          <div className="mb-5 max-w-md">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Sesi Ujian
            </label>
            <select
              value={jadwalId}
              onChange={(e) => setJadwalId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
            >
              {daftarJadwal.map((j) => (
                <option key={j.id} value={j.id}>
                  {formatHariTanggalSingkat(j.tanggal)} - Sesi {j.sesi_ke} - {j.mata_pelajaran}
                </option>
              ))}
            </select>
          </div>

          {daftarRuangan.length === 0 ? (
            <div className="p-3 text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-300">
              Belum ada data ruangan. Proses & simpan dulu <strong>Pembagian Ruangan</strong>.
            </div>
          ) : (
            jadwalTerpilih && (
              <>
                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                  <button
                    onClick={() => handleCetak("hadir")}
                    disabled={mencetak === "hadir-semua"}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all active:scale-95 disabled:opacity-60"
                  >
                    {mencetak === "hadir-semua" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ClipboardList className="w-4 h-4" />
                    )}
                    Cetak Semua Daftar Hadir ({daftarRuangan.length} ruangan)
                  </button>
                  <button
                    onClick={() => handleCetak("berita")}
                    disabled={mencetak === "berita-semua"}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-800 text-white text-sm font-medium rounded-xl transition-all active:scale-95 disabled:opacity-60"
                  >
                    {mencetak === "berita-semua" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    Cetak Semua Berita Acara
                  </button>
                </div>

                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Atau cetak per ruangan:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {daftarRuangan.map((r) => (
                    <div
                      key={r.nomor_ruangan}
                      className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                    >
                      <div className="flex items-center gap-2 mb-2.5">
                        <DoorOpen className="w-4 h-4 text-indigo-500" />
                        <div>
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                            Ruangan {r.nomor_ruangan}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {r.jumlah_siswa} siswa
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleCetak("hadir", r.nomor_ruangan)}
                          disabled={mencetak === `hadir-${r.nomor_ruangan}`}
                          className="flex-1 flex items-center justify-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {mencetak === `hadir-${r.nomor_ruangan}` ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Printer className="w-3.5 h-3.5" />
                          )}
                          Hadir
                        </button>
                        <button
                          onClick={() => handleCetak("berita", r.nomor_ruangan)}
                          disabled={mencetak === `berita-${r.nomor_ruangan}`}
                          className="flex-1 flex items-center justify-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg bg-gray-700 text-white hover:bg-gray-800 disabled:opacity-50"
                        >
                          {mencetak === `berita-${r.nomor_ruangan}` ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Printer className="w-3.5 h-3.5" />
                          )}
                          B.Acara
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )
          )}
        </>
      )}
    </div>
  );
};

export default PresensiBeritaAcaraTab;
