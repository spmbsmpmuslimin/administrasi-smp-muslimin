// setting/kelola-ujian/dokumen-cetak/ProgramKerjaTab.js
// Sub-fitur "Program Kerja Pelaksanaan" -- dokumen rencana pelaksanaan ujian
// (SEBELUM ujian berlangsung), dipakai sebagai bahan pemeriksaan pengawas.
// Pasangan dari programKerjaPdf.js. Polanya disamakan dengan
// LaporanRekapAkhirTab.js supaya UX-nya konsisten di seluruh Kelola Ujian.
//
// Item yang datanya reuse langsung dari sub-fitur lain (read-only di sini):
//   - Pembagian Ruang  -- dari ambilRekapPeserta() (sub-fitur Peserta &
//     Pengawas sudah mengisi ini sebelum ujian, jadi valid dipakai
//     untuk rencana, bukan cuma rekap pasca-ujian).
//   - Daftar Pengawas  -- dari ambilRekapPengawas() (sub-fitur Jadwal &
//     Pembagian Ruangan), ditampilkan sebagai jumlah sesi jaga per guru.
//
// Item yang butuh input manual di sini (belum ada sumber datanya):
//   - Susunan Panitia  -- belum ada tabelnya di database (dikonfirmasi),
//     jadi state lokal komponen ini saja, TIDAK dipersist ke Supabase.
//   - Jadwal per Sesi (tanggal/waktu/mapel) -- belum ada fungsi query yang
//     kelihatan menyediakan ini secara terstruktur, jadi manual juga (sama
//     alasannya dengan Rekap Kehadiran di LaporanRekapAkhirTab.js: sumbernya
//     belum tersedia dalam bentuk siap pakai).
//   - Nomor & Tanggal SK Panitia -- diketik manual tiap tahun ajaran.

import React, { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  Loader2,
  Users,
  UserCheck,
  FileSignature,
  CalendarClock,
  FileDown,
  Plus,
  Trash2,
} from "lucide-react";
import { supabase } from "../../../supabaseClient";
import {
  ambilDaftarTahunAjaran,
  getOrCreateUjian,
  KONFIGURASI_JENIS_UJIAN,
} from "../pembagian-ruangan/pembagianRuanganSupabase";
import { ambilRekapPeserta, ambilRekapPengawas } from "./laporanRekapAkhirSupabase";
import { generateProgramKerjaPdf } from "./programKerjaPdf";

const JENIS_UJIAN_LABEL = {
  PSAS: "PSAS - Penilaian Sumatif Akhir Semester",
  PSAT: "PSAT - Penilaian Sumatif Akhir Tahun",
  PSAJ: "PSAJ - Penilaian Sumatif Akhir Jenjang",
};

const JABATAN_DEFAULT = ["Penanggung Jawab", "Ketua Panitia", "Sekretaris", "Bendahara", "Anggota"];

function labelTahunAjaran(row) {
  return row.year || row.tahun_ajaran || row.name || row.label || row.nama || `ID: ${row.id}`;
}

function barisPanitiaKosong() {
  return { id: crypto.randomUUID(), jabatan: "", nama: "" };
}

function barisJadwalKosong() {
  return { id: crypto.randomUUID(), tanggal: "", sesi: "", waktu: "", mapel: "" };
}

function SeksiCard({ icon: Icon, title, subtitle, action, children }) {
  return (
    <div className="mb-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
            <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

const ProgramKerjaTab = ({ jenisUjian, showToast, onBack, kepalaSekolah }) => {
  const [daftarTahunAjaran, setDaftarTahunAjaran] = useState([]);
  const [tahunAjaranId, setTahunAjaranId] = useState("");
  const [loadingTahunAjaran, setLoadingTahunAjaran] = useState(true);

  const [ujian, setUjian] = useState(null);
  const [loadingUjian, setLoadingUjian] = useState(false);

  const [rekapPeserta, setRekapPeserta] = useState(null);
  const [rekapPengawas, setRekapPengawas] = useState(null);
  const [loadingRekap, setLoadingRekap] = useState(false);

  const [nomorSkPanitia, setNomorSkPanitia] = useState("");
  const [tanggalSkPanitia, setTanggalSkPanitia] = useState("");
  const [susunanPanitia, setSusunanPanitia] = useState([barisPanitiaKosong()]);
  const [jadwal, setJadwal] = useState([barisJadwalKosong()]);
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
        const kapasitasDefault = KONFIGURASI_JENIS_UJIAN[jenisUjian]?.defaultKapasitas || 40;
        const rec = await getOrCreateUjian(supabase, jenisUjian, tahunAjaranId, kapasitasDefault);
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

  const muatRencanaPelaksanaan = useCallback(async () => {
    if (!ujian?.id) return;
    setLoadingRekap(true);
    try {
      const [peserta, pengawas] = await Promise.all([
        ambilRekapPeserta(supabase, ujian.id),
        ambilRekapPengawas(supabase, ujian.id),
      ]);
      setRekapPeserta(peserta);
      setRekapPengawas(pengawas);
    } catch (err) {
      console.error(err);
      showToast?.("Gagal memuat data pembagian ruang & pengawas: " + err.message, "error");
    } finally {
      setLoadingRekap(false);
    }
  }, [ujian?.id, showToast]);

  useEffect(() => {
    muatRencanaPelaksanaan();
  }, [muatRencanaPelaksanaan]);

  function ubahBarisPanitia(id, field, value) {
    setSusunanPanitia((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  }
  function tambahBarisPanitia() {
    setSusunanPanitia((prev) => [...prev, barisPanitiaKosong()]);
  }
  function hapusBarisPanitia(id) {
    setSusunanPanitia((prev) => (prev.length > 1 ? prev.filter((b) => b.id !== id) : prev));
  }

  function ubahBarisJadwal(id, field, value) {
    setJadwal((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  }
  function tambahBarisJadwal() {
    setJadwal((prev) => [...prev, barisJadwalKosong()]);
  }
  function hapusBarisJadwal(id) {
    setJadwal((prev) => (prev.length > 1 ? prev.filter((b) => b.id !== id) : prev));
  }

  const handleGeneratePdf = async () => {
    const panitiaTerisi = susunanPanitia.filter((b) => b.jabatan.trim() && b.nama.trim());
    if (panitiaTerisi.length === 0) {
      showToast?.("Isi minimal 1 susunan panitia sebelum generate.", "error");
      return;
    }
    setGeneratingPdf(true);
    try {
      const ta = daftarTahunAjaran.find((t) => t.id === tahunAjaranId);
      const jadwalTerisi = jadwal.filter((j) => j.tanggal.trim() || j.mapel.trim());
      generateProgramKerjaPdf({
        jenisUjian,
        tahunAjaran: ta ? labelTahunAjaran(ta) : "",
        nomorSkPanitia: nomorSkPanitia.trim() || undefined,
        tanggalSkPanitia: tanggalSkPanitia.trim() || undefined,
        susunanPanitia: panitiaTerisi,
        jadwal: jadwalTerisi,
        pembagianRuang: rekapPeserta?.perRuangan || [],
        daftarPengawas: (rekapPengawas?.daftarPengawas || []).map((p) => ({
          nama: p.nama,
          ruangan: "-",
          sesi: `${p.jumlahSesiJaga}x jaga`,
        })),
        kepalaSekolah,
      });
      showToast?.("Program Kerja berhasil diunduh", "success");
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

      {(loadingUjian || loadingRekap) && (
        <p className="text-xs text-gray-400 flex items-center gap-1.5 mb-4">
          <Loader2 size={14} className="animate-spin" /> Memuat data pelaksanaan...
        </p>
      )}

      {/* SK Panitia */}
      <SeksiCard icon={FileSignature} title="Surat Keputusan Panitia">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Nomor SK (mis. 421/012-SMP/2026)"
            value={nomorSkPanitia}
            onChange={(e) => setNomorSkPanitia(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
          />
          <input
            type="text"
            placeholder="Tanggal SK (mis. 10 Oktober 2026)"
            value={tanggalSkPanitia}
            onChange={(e) => setTanggalSkPanitia(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
          />
        </div>
      </SeksiCard>

      {/* Susunan Panitia */}
      <SeksiCard
        icon={Users}
        title="Susunan Panitia"
        subtitle="Belum ada tabelnya di sistem -- isi manual di sini tiap generate"
        action={
          <button
            onClick={tambahBarisPanitia}
            className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <Plus size={14} /> Tambah
          </button>
        }
      >
        <div className="space-y-2">
          {susunanPanitia.map((b) => (
            <div key={b.id} className="flex gap-2 items-center">
              <input
                list="jabatan-default-list"
                type="text"
                placeholder="Jabatan"
                value={b.jabatan}
                onChange={(e) => ubahBarisPanitia(b.id, "jabatan", e.target.value)}
                className="w-2/5 px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              />
              <input
                type="text"
                placeholder="Nama"
                value={b.nama}
                onChange={(e) => ubahBarisPanitia(b.id, "nama", e.target.value)}
                className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              />
              <button
                onClick={() => hapusBarisPanitia(b.id)}
                disabled={susunanPanitia.length === 1}
                className="text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Hapus baris"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <datalist id="jabatan-default-list">
          {JABATAN_DEFAULT.map((j) => (
            <option key={j} value={j} />
          ))}
        </datalist>
      </SeksiCard>

      {/* Jadwal per Sesi */}
      <SeksiCard
        icon={CalendarClock}
        title="Jadwal per Sesi"
        subtitle="Belum ada sumber data terstruktur -- isi manual sesuai jadwal yang ditetapkan"
        action={
          <button
            onClick={tambahBarisJadwal}
            className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <Plus size={14} /> Tambah
          </button>
        }
      >
        <div className="space-y-2">
          {jadwal.map((j) => (
            <div key={j.id} className="flex flex-wrap gap-2 items-center">
              <input
                type="text"
                placeholder="Tanggal"
                value={j.tanggal}
                onChange={(e) => ubahBarisJadwal(j.id, "tanggal", e.target.value)}
                className="w-28 px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              />
              <input
                type="text"
                placeholder="Sesi"
                value={j.sesi}
                onChange={(e) => ubahBarisJadwal(j.id, "sesi", e.target.value)}
                className="w-20 px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              />
              <input
                type="text"
                placeholder="Waktu"
                value={j.waktu}
                onChange={(e) => ubahBarisJadwal(j.id, "waktu", e.target.value)}
                className="w-28 px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              />
              <input
                type="text"
                placeholder="Mata Pelajaran"
                value={j.mapel}
                onChange={(e) => ubahBarisJadwal(j.id, "mapel", e.target.value)}
                className="flex-1 min-w-[8rem] px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              />
              <button
                onClick={() => hapusBarisJadwal(j.id)}
                disabled={jadwal.length === 1}
                className="text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Hapus baris"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </SeksiCard>

      {/* Ringkasan data yang otomatis kepakai dari sistem */}
      <SeksiCard
        icon={UserCheck}
        title="Pembagian Ruang & Pengawas"
        subtitle="Otomatis dari sub-fitur Jadwal & Pembagian Ruangan / Peserta & Pengawas"
      >
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {rekapPeserta
            ? `${rekapPeserta.totalPeserta} peserta di ${rekapPeserta.jumlahRuangan} ruangan`
            : "Belum ada data pembagian ruangan."}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {rekapPengawas
            ? `${rekapPengawas.jumlahPengawas} guru bertugas sebagai pengawas`
            : "Belum ada data pengawas."}
        </p>
      </SeksiCard>

      <button
        onClick={handleGeneratePdf}
        disabled={generatingPdf || loadingUjian || loadingRekap}
        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all active:scale-95 disabled:opacity-60"
      >
        {generatingPdf ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileDown className="w-4 h-4" />
        )}
        Generate Program Kerja (PDF)
      </button>
    </div>
  );
};

export default ProgramKerjaTab;
