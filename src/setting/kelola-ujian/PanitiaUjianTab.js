// setting/kelola-ujian/PanitiaUjianTab.js
// ========================================================================
// Sub-fitur "Panitia Ujian" -- tempat admin/TU nentuin guru mana yang
// jadi panitia buat 1 jenis ujian di 1 tahun ajaran. Ini yang ngontrol
// akses Portal Ujian (src/portal-ujian/) -- guru yang di-checklist aktif
// di sini bakal otomatis kebuka /portal-ujian pas dia login (lihat
// isPanitiaAktif() di portal-ujian/portalUjianSupabase.js).
//
// PENTING -- beda sama "Susunan Panitia" di ProgramKerjaTab.js (tab
// "Program Kerja Pelaksanaan"): itu cuma form teks bebas buat nyusun
// dokumen cetak SK Panitia (nama diketik manual, gak nyambung ke guru
// beneran di tabel users, gak keSimpen ke database). Tab INI yang beneran
// nyambung ke user login & database (tabel ujian_kepanitiaan).
// Kedua tempat ini SENGAJA dipisah dulu (belum digabung) -- kalau nanti
// mau disatuin (misal pilih panitia di sini otomatis keisi juga di
// susunan SK), itu perlu kerjaan tambahan nyambungin dua sub-fitur ini.
//
// CATATAN STRUKTUR -- dulu tab ini nerima `jenisUjian` sebagai PROP dari
// JenisUjianMenuTab.js (karena posisinya sub-fitur di bawah 1 jenis ujian
// yang udah dipilih di KelolaUjianTab.js). SEKARANG tab ini dipindah jadi
// kartu TOP-LEVEL sendiri di KelolaUjianTab.js (terpusat, lintas jenis
// ujian) -- jadi `jenisUjian` bukan lagi prop, tapi STATE LOKAL di sini,
// dipilih lewat segmented tab PSAS/PSAT/PSAJ di bagian atas halaman ini.
//
// Pola alur (tahun ajaran, cek ujian ada/belum) disamain sama
// ProgramKerjaTab.js / LaporanRekapAkhirTab.js biar UX-nya konsisten.
// ========================================================================
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, Loader2, Search, UserCog, CheckCircle2 } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { ambilDaftarTahunAjaran, cariUjian, KONFIGURASI_JENIS_UJIAN } from "./pembagian-ruangan/pembagianRuanganSupabase";
import { ambilGuruEligiblePanitia, ambilPanitiaUjian, setPanitiaUjian } from "./panitiaUjianSupabase";

const JENIS_UJIAN_LIST = ["PSAS", "PSAT", "PSAJ"];

const JENIS_UJIAN_LABEL = {
  PSAS: "PSAS - Penilaian Sumatif Akhir Semester",
  PSAT: "PSAT - Penilaian Sumatif Akhir Tahun",
  PSAJ: "PSAJ - Penilaian Sumatif Akhir Jenjang",
};

const ROLE_LABEL = {
  teacher: "Guru Mapel",
  guru_bk: "Guru BK",
  petugas_perpus: "Petugas Perpus",
};

function labelTahunAjaran(row) {
  return row.year || row.tahun_ajaran || row.name || row.label || row.nama || `ID: ${row.id}`;
}

const PanitiaUjianTab = ({ showToast, onBack }) => {
  // Jenis ujian sekarang dipilih di dalam tab ini sendiri (bukan prop
  // dari luar lagi), default PSAS.
  const [jenisUjian, setJenisUjian] = useState("PSAS");

  const [daftarTahunAjaran, setDaftarTahunAjaran] = useState([]);
  const [tahunAjaranId, setTahunAjaranId] = useState("");
  const [loadingTahunAjaran, setLoadingTahunAjaran] = useState(true);

  const [ujian, setUjian] = useState(null);
  const [loadingUjian, setLoadingUjian] = useState(false);

  const [daftarGuru, setDaftarGuru] = useState([]);
  const [loadingGuru, setLoadingGuru] = useState(true);

  // Map guru_id -> "aktif" | "nonaktif", diambil dari ujian_kepanitiaan
  const [statusPanitia, setStatusPanitia] = useState({});
  const [loadingPanitia, setLoadingPanitia] = useState(false);

  // guru_id yang lagi diproses togglenya (biar checkbox-nya disabled
  // sesaat, cegah double-klik nembak upsert dobel)
  const [processingId, setProcessingId] = useState(null);

  const [pencarian, setPencarian] = useState("");

  const semesterDibutuhkan = KONFIGURASI_JENIS_UJIAN[jenisUjian]?.semester;
  const tahunAjaranTerfilter = daftarTahunAjaran.filter(
    (ta) => String(ta.semester) === semesterDibutuhkan
  );
  const opsiTahunAjaran =
    tahunAjaranTerfilter.length > 0 ? tahunAjaranTerfilter : daftarTahunAjaran;

  // ---------- Muat daftar tahun ajaran ----------
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

  // Setiap ganti jenis ujian, opsi tahun ajaran (hasil filter semester)
  // ikut berubah -- pastikan tahunAjaranId yang lagi dipilih masih valid
  // buat jenis ujian yang baru, kalau enggak reset ke default.
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
  }, [daftarTahunAjaran, jenisUjian]);

  // ---------- Muat data ujian (buat jenis + tahun ajaran terpilih) ----------
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

  // ---------- Muat daftar guru eligible (sekali aja, gak gantung ujian) ----------
  useEffect(() => {
    (async () => {
      setLoadingGuru(true);
      try {
        const data = await ambilGuruEligiblePanitia(supabase);
        setDaftarGuru(data);
      } catch (err) {
        console.error(err);
        showToast?.("Gagal memuat daftar guru: " + err.message, "error");
      } finally {
        setLoadingGuru(false);
      }
    })();
  }, [showToast]);

  // ---------- Muat status panitia existing buat ujian ini ----------
  const muatStatusPanitia = useCallback(async () => {
    if (!ujian?.id) {
      setStatusPanitia({});
      return;
    }
    setLoadingPanitia(true);
    try {
      const rows = await ambilPanitiaUjian(supabase, ujian.id);
      const peta = {};
      rows.forEach((r) => {
        peta[r.guru_id] = r.status;
      });
      setStatusPanitia(peta);
    } catch (err) {
      console.error(err);
      showToast?.("Gagal memuat data panitia: " + err.message, "error");
    } finally {
      setLoadingPanitia(false);
    }
  }, [ujian?.id, showToast]);

  useEffect(() => {
    muatStatusPanitia();
  }, [muatStatusPanitia]);

  const handleGantiJenisUjian = (jenis) => {
    if (jenis === jenisUjian) return;
    setJenisUjian(jenis);
    setPencarian("");
  };

  const handleToggle = async (guruId, aktifBaru) => {
    if (!ujian?.id) return;
    setProcessingId(guruId);
    // Optimistic update -- checkbox langsung kerasa responsif, di-rollback
    // kalau ternyata gagal.
    const statusSebelumnya = statusPanitia[guruId];
    setStatusPanitia((prev) => ({ ...prev, [guruId]: aktifBaru ? "aktif" : "nonaktif" }));

    try {
      await setPanitiaUjian(supabase, ujian.id, guruId, aktifBaru);
      showToast?.(
        aktifBaru ? "Ditambahkan sebagai panitia aktif" : "Dinonaktifkan dari panitia",
        "success"
      );
    } catch (err) {
      console.error(err);
      showToast?.("Gagal menyimpan perubahan: " + err.message, "error");
      // rollback
      setStatusPanitia((prev) => ({ ...prev, [guruId]: statusSebelumnya }));
    } finally {
      setProcessingId(null);
    }
  };

  const guruTerfilter = useMemo(() => {
    const q = pencarian.trim().toLowerCase();
    if (!q) return daftarGuru;
    return daftarGuru.filter(
      (g) => g.full_name?.toLowerCase().includes(q) || g.username?.toLowerCase().includes(q)
    );
  }, [daftarGuru, pencarian]);

  const jumlahPanitiaAktif = Object.values(statusPanitia).filter((s) => s === "aktif").length;

  return (
    <div className="p-4 sm:p-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4"
      >
        <ChevronLeft size={16} /> Kembali ke Manajemen Ujian
      </button>

      <div className="flex items-center gap-2 mb-1">
        <UserCog size={18} className="text-indigo-500" />
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
          Panitia Ujian
        </h2>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Pilih jenis ujian, lalu centang guru yang ditugaskan jadi panitia. Guru yang dicentang
        otomatis bisa akses Portal Ujian setelah login.
      </p>

      {/* Segmented tab pilih jenis ujian -- ini yang dulu ditentukan di
          KelolaUjianTab.js, sekarang jadi bagian dari tab ini sendiri
          karena Panitia Ujian udah top-level & lintas jenis ujian. */}
      <div className="flex gap-1.5 mb-5 p-1 bg-gray-100 dark:bg-gray-700/40 rounded-xl w-fit">
        {JENIS_UJIAN_LIST.map((jenis) => (
          <button
            key={jenis}
            onClick={() => handleGantiJenisUjian(jenis)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              jenisUjian === jenis
                ? "bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {jenis}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">Jenis Ujian</p>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {JENIS_UJIAN_LABEL[jenisUjian] || jenisUjian}
        </p>
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

      {loadingUjian && (
        <p className="text-xs text-gray-400 flex items-center gap-1.5 mb-4">
          <Loader2 size={14} className="animate-spin" /> Memuat data ujian...
        </p>
      )}

      {!ujian && !loadingUjian && tahunAjaranId && (
        <div className="p-3 mb-5 text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-300">
          Data ujian untuk tahun ajaran ini belum diproses. Proses dulu{" "}
          <strong>Pembagian Ruangan</strong> (pilih versi skema & simpan) sebelum menentukan
          panitia di sini.
        </div>
      )}

      {ujian && (
        <>
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
              <UserCog size={16} className="text-indigo-500" />
              Daftar Guru
            </div>
            <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 size={13} />
              {jumlahPanitiaAktif} panitia aktif
            </span>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Centang guru yang ditugaskan jadi panitia {jenisUjian} tahun ajaran ini. Guru yang
            dicentang otomatis bisa akses Portal Ujian setelah login (atau logout-login ulang
            kalau lagi login pas dicentang).
          </p>

          <div className="relative mb-3">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Cari nama atau username guru..."
              value={pencarian}
              onChange={(e) => setPencarian(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
            />
          </div>

          {(loadingGuru || loadingPanitia) && (
            <p className="text-xs text-gray-400 flex items-center gap-1.5 mb-3">
              <Loader2 size={14} className="animate-spin" /> Memuat daftar guru & panitia...
            </p>
          )}

          {!loadingGuru && guruTerfilter.length === 0 && (
            <p className="p-4 text-xs text-gray-400 text-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              Tidak ada guru yang cocok dengan pencarian.
            </p>
          )}

          {/* Pakai CSS columns (bukan grid) supaya urutan guru ngisi ke
              BAWAH dulu di 1 kolom, baru lanjut ke kolom berikutnya --
              beda sama CSS grid yang defaultnya ngisi ke kanan dulu. Tiap
              item dibungkus break-inside-avoid biar kartunya gak kepotong
              di tengah pas pindah kolom. */}
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-2">
            {guruTerfilter.map((guru) => {
              const aktif = statusPanitia[guru.id] === "aktif";
              const sedangDiproses = processingId === guru.id;
              return (
                <label
                  key={guru.id}
                  className={`flex items-center gap-3 px-4 py-2.5 mb-2 rounded-xl border cursor-pointer transition-colors break-inside-avoid ${
                    aktif
                      ? "border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/40"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={aktif}
                    disabled={sedangDiproses}
                    onChange={(e) => handleToggle(guru.id, e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                      {guru.full_name || guru.username}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      @{guru.username} &middot; {ROLE_LABEL[guru.role] || guru.role}
                    </p>
                  </div>
                  {sedangDiproses && (
                    <Loader2 size={14} className="animate-spin text-gray-400 shrink-0" />
                  )}
                </label>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default PanitiaUjianTab;
