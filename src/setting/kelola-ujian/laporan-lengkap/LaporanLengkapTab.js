// setting/kelola-ujian/laporan-lengkap/LaporanLengkapTab.js
// Sub-fitur "Laporan Lengkap" -- kompilasi 1 file PDF utuh: Cover, Kata
// Pengantar, Daftar Isi (list section, TANPA nomor halaman -- simpel
// dulu), Pendahuluan, lalu rekap (REUSE data yg udah diisi lewat "Laporan
// Rekap Akhir" -- peserta, kehadiran, pengawas), dan Penutup.
//
// PENTING: sub-fitur ini TIDAK punya form input manual sendiri. Kalau
// Rekap Kehadiran belum diisi, isi dulu lewat sub-fitur "Laporan Rekap
// Akhir" -- di sini cuma preview status tiap bagian + compile jadi 1 PDF
// resmi (lengkap dengan Cover, Kata Pengantar, dst yang gak ada di
// Laporan Rekap Akhir).
//
// CATATAN (revisi): section "Rekap Anggaran & Realisasi Biaya",
// "Keterangan Nilai", "Evaluasi & Kendala", dan "Kesimpulan & Saran" SUDAH
// DIHAPUS dari sini -- form input-nya di "Laporan Rekap Akhir" juga sudah
// dicabut (dianggap gak kepake), jadi bab-bab itu di PDF juga sudah
// dirapikan ulang, bukan cuma dibiarin kosong. Lihat laporanLengkapPdf.js.
//
// Lampiran (Kartu Ujian, Daftar Hadir kertas, Jadwal Pengawas, dst)
// SENGAJA TIDAK digabung ke PDF ini -- tetap dokumen terpisah, dicetak
// dari sub-fitur masing-masing (lihat KelolaUjianTab > tombol Export
// Semua) biar gampang dicek satu-satu.
//
// Pola alur & pemilihan tahun ajaran disamakan dengan
// LaporanRekapAkhirTab.js biar UX-nya konsisten antar sub-fitur.

import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, Loader2, FileDown, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "../../../supabaseClient";
import {
  ambilDaftarTahunAjaran,
  cariUjian,
  KONFIGURASI_JENIS_UJIAN,
} from "../pembagian-ruangan/pembagianRuanganSupabase";
import {
  ambilRekapPeserta,
  ambilRekapPengawas,
  ambilKehadiran,
} from "../dokumen-cetak/laporanRekapAkhirSupabase";
import { ambilProfilSekolah } from "./laporanLengkapSupabase";
import { generateLaporanLengkapPdf } from "./laporanLengkapPdf";

const JENIS_UJIAN_LABEL = {
  PSAS: "PSAS - Penilaian Sumatif Akhir Semester",
  PSAT: "PSAT - Penilaian Sumatif Akhir Tahun",
  PSAJ: "PSAJ - Penilaian Sumatif Akhir Jenjang",
};

function labelTahunAjaran(row) {
  return row.year || row.tahun_ajaran || row.name || row.label || row.nama || `ID: ${row.id}`;
}

// Daftar section yang muncul di PDF, urut sesuai posisi di dokumen.
// "template" = selalu ada isi (Cover, Kata Pengantar, Pendahuluan,
// Penutup, Daftar Isi), gak pernah "belum diisi" karena digenerate
// otomatis dari jenis ujian & tahun ajaran.
// "rekap" = reuse data dari sub-fitur "Laporan Rekap Akhir", statusnya
// bisa "belum diisi" kalau memang belum pernah diisi di sana.
const DAFTAR_SECTION = [
  { id: "cover", label: "Cover", tipe: "template" },
  { id: "kata-pengantar", label: "Kata Pengantar", tipe: "template" },
  { id: "daftar-isi", label: "Daftar Isi", tipe: "template" },
  { id: "pendahuluan", label: "Pendahuluan", tipe: "template" },
  { id: "peserta", label: "Rekap Peserta & Ruangan", tipe: "rekap" },
  { id: "kehadiran", label: "Rekap Kehadiran", tipe: "rekap" },
  { id: "pengawas", label: "Rekap Pengawas", tipe: "rekap" },
  { id: "penutup", label: "Penutup", tipe: "template" },
];

const LaporanLengkapTab = ({ jenisUjian, showToast, onBack }) => {
  const [daftarTahunAjaran, setDaftarTahunAjaran] = useState([]);
  const [tahunAjaranId, setTahunAjaranId] = useState("");
  const [loadingTahunAjaran, setLoadingTahunAjaran] = useState(true);

  const [ujian, setUjian] = useState(null);
  const [loadingUjian, setLoadingUjian] = useState(false);

  const [profilSekolah, setProfilSekolah] = useState(null);
  const [rekapPeserta, setRekapPeserta] = useState(null);
  const [rekapPengawas, setRekapPengawas] = useState(null);
  const [kehadiran, setKehadiran] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

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

  // Tarik semua data yang dibutuhin sekaligus (profil sekolah + 5 rekap
  // dari Laporan Rekap Akhir) begitu `ujian` ketemu. Dipisah dari effect
  // di atas biar gampang di-retry lewat muatSemuaData() kalau perlu.
  const muatSemuaData = useCallback(async () => {
    if (!ujian?.id) return;
    setLoadingData(true);
    try {
      const [profil, peserta, pengawas, hadir] = await Promise.all([
        ambilProfilSekolah(supabase),
        ambilRekapPeserta(supabase, ujian.id),
        ambilRekapPengawas(supabase, ujian.id),
        ambilKehadiran(supabase, ujian.id),
      ]);
      setProfilSekolah(profil);
      setRekapPeserta(peserta);
      setRekapPengawas(pengawas);
      setKehadiran(hadir);
    } catch (err) {
      console.error(err);
      showToast?.("Gagal memuat data laporan: " + err.message, "error");
    } finally {
      setLoadingData(false);
    }
  }, [ujian, showToast]);

  useEffect(() => {
    muatSemuaData();
  }, [muatSemuaData]);

  // Status tiap section buat ditampilin di daftar preview -- section
  // "template" SELALU siap (isinya digenerate otomatis), section "rekap"
  // statusnya tergantung data yang udah diisi lewat Laporan Rekap Akhir.
  function statusSection(id) {
    switch (id) {
      case "peserta":
        return !!rekapPeserta && rekapPeserta.totalPeserta > 0;
      case "kehadiran":
        return kehadiran.length > 0;
      case "pengawas":
        return !!rekapPengawas && rekapPengawas.jumlahPengawas > 0;
      default:
        return true; // section "template" selalu siap
    }
  }

  const semuaSiap = DAFTAR_SECTION.every((s) => statusSection(s.id));

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true);
    try {
      const ta = daftarTahunAjaran.find((t) => t.id === tahunAjaranId);
      generateLaporanLengkapPdf({
        jenisUjian,
        jenisUjianLabel: JENIS_UJIAN_LABEL[jenisUjian] || jenisUjian,
        tahunAjaran: ta ? labelTahunAjaran(ta) : "",
        profilSekolah,
        rekapPeserta,
        kehadiran,
        rekapPengawas,
        daftarSection: DAFTAR_SECTION,
      });
      showToast?.("Laporan lengkap berhasil diunduh", "success");
    } catch (err) {
      console.error(err);
      showToast?.("Gagal generate PDF: " + err.message, "error");
    } finally {
      setGeneratingPdf(false);
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
          <Loader2 size={14} className="animate-spin" /> Memuat data laporan...
        </p>
      )}

      {!ujian && !loadingUjian && tahunAjaranId && (
        <div className="p-3 mb-5 text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-300">
          Data ujian untuk tahun ajaran ini belum diproses. Proses dulu{" "}
          <strong>Pembagian Ruangan</strong> sebelum lanjut ke sini.
        </div>
      )}

      {ujian && !loadingData && (
        <>
          <div className="mb-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                Isi Laporan Lengkap
              </h3>
            </div>

            <div className="space-y-1">
              {DAFTAR_SECTION.map((s) => {
                const siap = statusSection(s.id);
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between px-2 py-1.5 text-xs rounded-lg bg-gray-50 dark:bg-gray-900/40"
                  >
                    <span className="text-gray-700 dark:text-gray-300">{s.label}</span>
                    {siap ? (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Siap
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <AlertCircle className="w-3.5 h-3.5" /> Belum diisi
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {!semuaSiap && (
              <p className="text-[11px] text-gray-400 mt-3">
                Bagian yang "Belum diisi" tetap muncul di PDF sebagai bab kosong (ditandai "belum
                diisi"), bukan dihapus. Isi dulu lewat sub-fitur{" "}
                <strong>Laporan Rekap Akhir</strong> kalau mau lengkap.
              </p>
            )}
          </div>

          <button
            onClick={handleGeneratePdf}
            disabled={generatingPdf}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all active:scale-95 disabled:opacity-60"
          >
            {generatingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            Generate Laporan Lengkap (PDF)
          </button>
        </>
      )}
    </div>
  );
};

export default LaporanLengkapTab;
