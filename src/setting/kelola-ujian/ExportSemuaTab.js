// setting/kelola-ujian/ExportSemuaTab.js
// Sub-fitur "Export Semua (PDF)" -- checklist semua dokumen PDF yang ada
// di Manajemen Ujian (Daftar Peserta, Kartu Peserta, Kartu Pengawas,
// Daftar Hadir, Berita Acara, Laporan Rekap Akhir, Petunjuk Penggunaan),
// dicentang mana yang mau di-download lalu diproses berurutan.
//
// Semua datanya query ulang dari database (lihat catatan di
// exportSemuaKelolaUjian.js) -- BUKAN reuse state dari tab lain, jadi
// panel ini nggak perlu tab lain pernah dibuka dulu (asal datanya sudah
// tersimpan di DB).

import React, { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  Loader2,
  CheckSquare,
  Square,
  FileDown,
  CheckCircle2,
  XCircle,
  Circle,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import { ambilDaftarTahunAjaran, KONFIGURASI_JENIS_UJIAN } from "./pembagian-ruangan/pembagianRuanganSupabase";
import {
  OPSI_EXPORT_SEMUA,
  cariUjianUntukExport,
  jalankanExportSemua,
} from "./exportSemuaKelolaUjian";

const JENIS_UJIAN_LABEL = {
  PSAS: "PSAS - Penilaian Sumatif Akhir Semester",
  PSAT: "PSAT - Penilaian Sumatif Akhir Tahun",
  PSAJ: "PSAJ - Penilaian Sumatif Akhir Jenjang",
};

function labelTahunAjaran(row) {
  return row.year || row.tahun_ajaran || row.name || row.label || row.nama || `ID: ${row.id}`;
}

const SEMUA_ID = OPSI_EXPORT_SEMUA.map((o) => o.id);

const STATUS_ICON = {
  idle: Circle,
  loading: Loader2,
  done: CheckCircle2,
  error: XCircle,
};

const STATUS_STYLE = {
  idle: "text-gray-300 dark:text-gray-600",
  loading: "text-indigo-500 animate-spin",
  done: "text-emerald-500",
  error: "text-red-500",
};

const ExportSemuaTab = ({ jenisUjian, showToast, onBack }) => {
  const [daftarTahunAjaran, setDaftarTahunAjaran] = useState([]);
  const [tahunAjaranId, setTahunAjaranId] = useState("");
  const [loadingTahunAjaran, setLoadingTahunAjaran] = useState(true);

  const [ujian, setUjian] = useState(null); // null = belum ada / belum dicek
  const [loadingUjian, setLoadingUjian] = useState(false);

  const [dipilih, setDipilih] = useState(() => new Set(SEMUA_ID));
  const [status, setStatus] = useState({}); // { [itemId]: "idle"|"loading"|"done"|"error" }
  const [infoStatus, setInfoStatus] = useState({}); // { [itemId]: string }
  const [sedangExport, setSedangExport] = useState(false);

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
      setUjian(null);
      try {
        const rec = await cariUjianUntukExport(supabase, jenisUjian, tahunAjaranId);
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

  // Reset status tiap ganti tahun ajaran, biar nggak nyampur sisa run sebelumnya.
  useEffect(() => {
    setStatus({});
    setInfoStatus({});
  }, [tahunAjaranId]);

  const semuaDicentang = dipilih.size === SEMUA_ID.length;

  const togglePilihSemua = () => {
    setDipilih(semuaDicentang ? new Set() : new Set(SEMUA_ID));
  };

  const toggleItem = (id) => {
    setDipilih((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleProgress = useCallback((itemId, st, info) => {
    setStatus((prev) => ({ ...prev, [itemId]: st }));
    if (info !== undefined) setInfoStatus((prev) => ({ ...prev, [itemId]: info }));
  }, []);

  const handleExport = async () => {
    if (!ujian?.id || dipilih.size === 0) return;
    setSedangExport(true);
    setStatus({});
    setInfoStatus({});
    try {
      const ta = daftarTahunAjaran.find((t) => t.id === tahunAjaranId);
      const hasil = await jalankanExportSemua({
        supabase,
        jenisUjian,
        ujianId: ujian.id,
        tahunAjaran: ta ? labelTahunAjaran(ta) : "",
        itemIdTerpilih: Array.from(dipilih),
        onProgress: handleProgress,
      });

      if (hasil.gagal.length === 0) {
        showToast?.(`Export selesai -- ${hasil.totalFile} file PDF berhasil diunduh`, "success");
      } else if (hasil.berhasil.length === 0) {
        showToast?.("Export gagal -- belum ada data untuk item yang dipilih", "error");
      } else {
        showToast?.(
          `Export selesai sebagian -- ${hasil.totalFile} file berhasil, ${hasil.gagal.length} item dilewati (lihat keterangan di bawah)`,
          "error"
        );
      }
    } catch (err) {
      console.error(err);
      showToast?.("Gagal menjalankan export: " + err.message, "error");
    } finally {
      setSedangExport(false);
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
          disabled={loadingTahunAjaran || sedangExport}
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
          <Loader2 size={14} className="animate-spin" /> Memeriksa data ujian...
        </p>
      )}

      {!loadingUjian && tahunAjaranId && !ujian && (
        <div className="p-4 mb-5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Ujian untuk tahun ajaran ini belum pernah diproses -- belum ada apa pun untuk diexport.
            Mulai dulu dari <strong>Peserta & Pembagian Ruangan</strong>.
          </p>
        </div>
      )}

      {ujian && (
        <>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden mb-5">
            <button
              onClick={togglePilihSemua}
              disabled={sedangExport}
              className="w-full flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 text-left hover:bg-gray-100 dark:hover:bg-gray-900/70 disabled:opacity-60"
            >
              {semuaDicentang ? (
                <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-gray-400 flex-shrink-0" />
              )}
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                Pilih Semua
              </span>
              <span className="text-xs text-gray-400 ml-auto">
                {dipilih.size}/{SEMUA_ID.length} dipilih
              </span>
            </button>

            {OPSI_EXPORT_SEMUA.map((opsi) => {
              const dicentang = dipilih.has(opsi.id);
              const st = status[opsi.id] || "idle";
              const StatusIcon = STATUS_ICON[st];
              return (
                <div
                  key={opsi.id}
                  className="flex items-start gap-2 px-4 py-3 border-b last:border-b-0 border-gray-100 dark:border-gray-700"
                >
                  <button
                    onClick={() => toggleItem(opsi.id)}
                    disabled={sedangExport}
                    className="mt-0.5 flex-shrink-0 disabled:opacity-60"
                  >
                    {dicentang ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                      {opsi.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {infoStatus[opsi.id] && st === "error" ? infoStatus[opsi.id] : opsi.deskripsi}
                    </p>
                  </div>
                  <StatusIcon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${STATUS_STYLE[st]}`} />
                </div>
              );
            })}
          </div>

          <button
            onClick={handleExport}
            disabled={sedangExport || dipilih.size === 0}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all active:scale-95 disabled:opacity-50"
          >
            {sedangExport ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            {sedangExport ? "Mengexport..." : `Export ${dipilih.size} Item Terpilih`}
          </button>

          <p className="text-[11px] text-gray-400 mt-2">
            Beberapa item (Kartu Peserta, Daftar Hadir, Berita Acara) menghasilkan lebih dari 1 file
            PDF sekaligus (per ruangan/sesi) -- izinkan "multiple downloads" kalau browser
            menanyakan.
          </p>
        </>
      )}
    </div>
  );
};

export default ExportSemuaTab;
