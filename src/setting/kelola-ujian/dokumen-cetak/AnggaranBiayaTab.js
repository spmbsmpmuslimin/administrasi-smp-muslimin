// setting/kelola-ujian/AnggaranBiayaTab.js
// Sub-fitur "Anggaran & Biaya" -- catat rencana anggaran & realisasi biaya
// per pos (ATK, konsumsi, honor pengawas, dst) untuk 1 ujian.
//
// Pola alur (pilih tahun ajaran -> cariUjian) disamakan dengan
// sub-fitur lain (PembagianRuanganTab.js, KartuUjianTab.js, dst) supaya
// UX-nya konsisten di seluruh Manajemen Ujian.

import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, Plus, Trash2, Pencil, Loader2, Wallet, X, Check } from "lucide-react";
import { supabase } from "../../../supabaseClient";
import { ambilDaftarTahunAjaran, cariUjian } from "../pembagian-ruangan/pembagianRuanganSupabase";
import {
  ambilAnggaran,
  tambahAnggaran,
  updateAnggaran,
  hapusAnggaran,
  hitungRingkasanAnggaran,
} from "./anggaranBiayaSupabase";

const JENIS_UJIAN_LABEL = {
  PSAS: "PSAS - Penilaian Sumatif Akhir Semester",
  PSAT: "PSAT - Penilaian Sumatif Akhir Tahun",
  PSAJ: "PSAJ - Penilaian Sumatif Akhir Jenjang",
};

const POS_KOSONG = { kategori: "", uraian: "", anggaran: "", realisasi: "", keterangan: "" };

function labelTahunAjaran(row) {
  return row.year || row.tahun_ajaran || row.name || row.label || row.nama || `ID: ${row.id}`;
}

function formatRupiah(angka) {
  const n = Number(angka) || 0;
  return "Rp" + n.toLocaleString("id-ID");
}

const AnggaranBiayaTab = ({ jenisUjian, showToast, onBack }) => {
  const [daftarTahunAjaran, setDaftarTahunAjaran] = useState([]);
  const [tahunAjaranId, setTahunAjaranId] = useState("");
  const [loadingTahunAjaran, setLoadingTahunAjaran] = useState(true);

  const [ujian, setUjian] = useState(null);
  const [loadingUjian, setLoadingUjian] = useState(false);

  const [daftarPos, setDaftarPos] = useState([]);
  const [loadingPos, setLoadingPos] = useState(false);

  const [formTerbuka, setFormTerbuka] = useState(false);
  const [posEdit, setPosEdit] = useState(null); // null = tambah baru, object = sedang edit
  const [form, setForm] = useState(POS_KOSONG);
  const [menyimpan, setMenyimpan] = useState(false);
  const [menghapusId, setMenghapusId] = useState(null);

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
    if (daftarTahunAjaran.length === 0) {
      setTahunAjaranId("");
      return;
    }
    const masihAda = daftarTahunAjaran.some((ta) => ta.id === tahunAjaranId);
    if (!masihAda) {
      const aktif = daftarTahunAjaran.find((ta) => ta.is_active);
      setTahunAjaranId((aktif || daftarTahunAjaran[0]).id);
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

  const muatAnggaran = useCallback(async () => {
    if (!ujian?.id) return;
    setLoadingPos(true);
    try {
      const data = await ambilAnggaran(supabase, ujian.id);
      setDaftarPos(data);
    } catch (err) {
      console.error(err);
      showToast?.("Gagal memuat data anggaran: " + err.message, "error");
    } finally {
      setLoadingPos(false);
    }
  }, [ujian?.id, showToast]);

  useEffect(() => {
    muatAnggaran();
  }, [muatAnggaran]);

  const ringkasan = hitungRingkasanAnggaran(daftarPos);

  const bukaFormTambah = () => {
    setPosEdit(null);
    setForm(POS_KOSONG);
    setFormTerbuka(true);
  };

  const bukaFormEdit = (pos) => {
    setPosEdit(pos);
    setForm({
      kategori: pos.kategori || "",
      uraian: pos.uraian || "",
      anggaran: pos.anggaran ?? "",
      realisasi: pos.realisasi ?? "",
      keterangan: pos.keterangan || "",
    });
    setFormTerbuka(true);
  };

  const tutupForm = () => {
    setFormTerbuka(false);
    setPosEdit(null);
    setForm(POS_KOSONG);
  };

  const handleSimpan = async () => {
    if (!ujian?.id) return;
    if (!form.uraian.trim()) {
      showToast?.("Uraian pos anggaran wajib diisi", "error");
      return;
    }
    setMenyimpan(true);
    try {
      const payload = {
        kategori: form.kategori.trim(),
        uraian: form.uraian.trim(),
        anggaran: Number(form.anggaran) || 0,
        realisasi: Number(form.realisasi) || 0,
        keterangan: form.keterangan.trim() || null,
      };
      if (posEdit) {
        await updateAnggaran(supabase, posEdit.id, payload);
        showToast?.("Pos anggaran diperbarui", "success");
      } else {
        await tambahAnggaran(supabase, ujian.id, payload);
        showToast?.("Pos anggaran ditambahkan", "success");
      }
      tutupForm();
      await muatAnggaran();
    } catch (err) {
      console.error(err);
      showToast?.("Gagal menyimpan: " + err.message, "error");
    } finally {
      setMenyimpan(false);
    }
  };

  const handleHapus = async (pos) => {
    if (!window.confirm(`Hapus pos anggaran "${pos.uraian}"?`)) return;
    setMenghapusId(pos.id);
    try {
      await hapusAnggaran(supabase, pos.id);
      showToast?.("Pos anggaran dihapus", "success");
      await muatAnggaran();
    } catch (err) {
      console.error(err);
      showToast?.("Gagal menghapus: " + err.message, "error");
    } finally {
      setMenghapusId(null);
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
          {!loadingTahunAjaran && daftarTahunAjaran.length === 0 && (
            <option value="">Belum ada tahun ajaran</option>
          )}
          {daftarTahunAjaran.map((ta) => (
            <option key={ta.id} value={ta.id}>
              {labelTahunAjaran(ta)} - Semester{" "}
              {ta.semester === 1 || ta.semester === "1" ? "Ganjil" : "Genap"}
              {ta.is_active ? " (Aktif)" : ""}
            </option>
          ))}
        </select>
      </div>

      {(loadingUjian || loadingPos) && (
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

      {ujian && !loadingPos && (
        <>
          {/* Ringkasan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Anggaran</p>
              <p className="text-base font-bold text-gray-800 dark:text-gray-100">
                {formatRupiah(ringkasan.totalAnggaran)}
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Realisasi</p>
              <p className="text-base font-bold text-gray-800 dark:text-gray-100">
                {formatRupiah(ringkasan.totalRealisasi)}
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sisa Anggaran</p>
              <p
                className={`text-base font-bold ${
                  ringkasan.sisa < 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {formatRupiah(ringkasan.sisa)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Daftar Pos Anggaran ({daftarPos.length})
            </p>
            <button
              onClick={bukaFormTambah}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Pos
            </button>
          </div>

          {/* Form tambah/edit */}
          {formTerbuka && (
            <div className="mb-4 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Kategori
                  </label>
                  <input
                    type="text"
                    value={form.kategori}
                    onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                    placeholder="mis. ATK, Konsumsi, Honor Pengawas"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Uraian *
                  </label>
                  <input
                    type="text"
                    value={form.uraian}
                    onChange={(e) => setForm({ ...form, uraian: e.target.value })}
                    placeholder="mis. Fotokopi soal 5 mapel"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Anggaran (Rp)
                  </label>
                  <input
                    type="number"
                    value={form.anggaran}
                    onChange={(e) => setForm({ ...form, anggaran: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Realisasi (Rp)
                  </label>
                  <input
                    type="number"
                    value={form.realisasi}
                    onChange={(e) => setForm({ ...form, realisasi: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Keterangan
                  </label>
                  <input
                    type="text"
                    value={form.keterangan}
                    onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                    placeholder="Opsional"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSimpan}
                  disabled={menyimpan}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60"
                >
                  {menyimpan ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  {posEdit ? "Simpan Perubahan" : "Tambah"}
                </button>
                <button
                  onClick={tutupForm}
                  disabled={menyimpan}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="w-3.5 h-3.5" /> Batal
                </button>
              </div>
            </div>
          )}

          {/* Tabel pos anggaran */}
          {daftarPos.length === 0 ? (
            <div className="p-4 text-xs text-center bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400">
              Belum ada pos anggaran. Klik <strong>Tambah Pos</strong> untuk mulai mencatat.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-400">
                      Kategori
                    </th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-400">
                      Uraian
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 dark:text-gray-400">
                      Anggaran
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 dark:text-gray-400">
                      Realisasi
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 dark:text-gray-400">
                      Selisih
                    </th>
                    <th className="text-center px-3 py-2 font-medium text-gray-600 dark:text-gray-400">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {daftarPos.map((pos) => {
                    const selisih = (Number(pos.anggaran) || 0) - (Number(pos.realisasi) || 0);
                    return (
                      <tr key={pos.id} className="bg-white dark:bg-gray-800">
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                          {pos.kategori || "-"}
                        </td>
                        <td className="px-3 py-2 text-gray-800 dark:text-gray-100">
                          {pos.uraian}
                          {pos.keterangan && (
                            <p className="text-[11px] text-gray-400 dark:text-gray-500">
                              {pos.keterangan}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                          {formatRupiah(pos.anggaran)}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                          {formatRupiah(pos.realisasi)}
                        </td>
                        <td
                          className={`px-3 py-2 text-right font-medium ${
                            selisih < 0
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {formatRupiah(selisih)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => bukaFormEdit(pos)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleHapus(pos)}
                              disabled={menghapusId === pos.id}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 disabled:opacity-50"
                              title="Hapus"
                            >
                              {menghapusId === pos.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AnggaranBiayaTab;
