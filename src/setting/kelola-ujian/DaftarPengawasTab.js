// setting/kelola-ujian/DaftarPengawasTab.js
// Sub-fitur "Daftar Pengawas" dari Manajemen Ujian.
// Tabel master: No | Nama Pengawas | Kode -- guru yang muncul di sini
// HANYA yang udah ditambahin sebagai pengawas (kode_pengawas terisi).
// Gak semua guru kebagian tugas ngawas (misal yang jadi panitia), jadi
// daftarnya ditambahin lewat panel checklist "Tambah Pengawas" di atas
// tabel -- centang guru yang ngawas (ada "Centang Semua" biar cepet),
// kode masing-masing otomatis disaranin dari teacher_id (mis. "G-01"
// jadi "01"), lalu tekan "Tambah" sekali buat masukin semuanya sekaligus.
//
// - Kolom Kode guru yang UDAH ada di daftar bisa diedit langsung di
//   tabel (kalau kode hasil saran perlu dikoreksi), disimpan sekaligus
//   lewat "Simpan Perubahan".
// - Tombol "Hapus" di tiap baris ngeluarin guru itu dari Daftar Pengawas
//   (ngosongin kode_pengawas-nya jadi null, BUKAN hapus akun guru) --
//   dia balik muncul di checklist "Tambah Pengawas".
//
// Kode ini TERPISAH dari teacher_id (dipakai fitur lain seperti Kelola
// Jadwal Pelajaran / Profile Guru) -- lihat migrasi kode_pengawas.
//
// Dipakai dalam 2 mode:
// - Standalone (embedded=false, default): halaman sendiri lengkap
//   dengan tombol "Kembali" & header jenis ujian.
// - Embedded (embedded=true): dipasang sebagai tab tengah di dalam
//   JadwalPengawasTab.js ("Jadwal Sesi" - "Daftar Pengawas" - "Jadwal
//   Ngawas"), tanpa tombol kembali & header sendiri karena sudah ada
//   di komponen induknya. Prop `onPerubahan` (opsional) dipanggil tiap
//   kali daftar pengawas berubah (tambah/hapus/edit kode) -- dipakai
//   parent buat refresh daftarGuru-nya sendiri (tab "Jadwal Ngawas"
//   narik guru dari kode_pengawas juga, jadi harus ikut ke-refresh
//   begitu ada guru baru ditambah/dihapus di sini).

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ChevronLeft, Loader2, Save, Plus, Trash2, ListOrdered } from "lucide-react";
import { supabase } from "../../supabaseClient";
import {
  ambilDaftarPengawasKode,
  ambilCalonPengawas,
  hapusPengawasKode,
  simpanKodePengawas,
} from "./jadwalPengawasSupabase";

const JENIS_UJIAN_LABEL = {
  PSAS: "PSAS - Penilaian Sumatif Akhir Semester",
  PSAT: "PSAT - Penilaian Sumatif Akhir Tahun",
  PSAJ: "PSAJ - Penilaian Sumatif Akhir Jenjang",
};

const DaftarPengawasTab = ({ jenisUjian, showToast, onBack, embedded = false, onPerubahan }) => {
  const [daftarAsli, setDaftarAsli] = useState([]); // dari DB, buat dibandingin (deteksi baris yang berubah)
  const [daftarEdit, setDaftarEdit] = useState([]); // versi yang lagi diedit admin di tabel
  const [calonPengawas, setCalonPengawas] = useState([]); // guru yang belum ditambah
  const [loading, setLoading] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);

  const [calonTerpilih, setCalonTerpilih] = useState([]); // array guru_id yang dicentang
  const [menambah, setMenambah] = useState(false);
  const [menghapus, setMenghapus] = useState(null); // id guru yang lagi dihapus
  const [merapikan, setMerapikan] = useState(false); // lagi proses "Urutkan Ulang Kode"

  const muatData = useCallback(async () => {
    setLoading(true);
    try {
      const [pengawas, calon] = await Promise.all([
        ambilDaftarPengawasKode(supabase),
        ambilCalonPengawas(supabase),
      ]);
      setDaftarAsli(pengawas);
      setDaftarEdit(pengawas);
      setCalonPengawas(calon);
    } catch (err) {
      console.error(err);
      showToast?.("Gagal memuat daftar pengawas: " + err.message, "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    muatData();
  }, [muatData]);

  const toggleCalon = (guruId) => {
    setCalonTerpilih((prev) =>
      prev.includes(guruId) ? prev.filter((id) => id !== guruId) : [...prev, guruId]
    );
  };

  const semuaTercentang = calonPengawas.length > 0 && calonTerpilih.length === calonPengawas.length;

  const toggleCentangSemua = () => {
    setCalonTerpilih(semuaTercentang ? [] : calonPengawas.map((g) => g.id));
  };

  // Kode tiap guru yang ditambah dulu disaranin dari teacher_id, tapi itu
  // bikin nomor bolong-bolong (mis. 03 loncat ke 07) karena tidak semua
  // guru jadi pengawas -- ada yang cuma panitia. Jadi sekarang, tiap kali
  // ADA PENAMBAHAN, seluruh Daftar Pengawas (yang lama + yang baru
  // dicentang) dinomori ULANG dari 01 sampai terakhir sesuai jumlah
  // pengawas yang aktif saat itu. Yang lama tetap di urutan semula
  // (kode-nya bisa ikut bergeser kalau sebelumnya sempat bolong), yang
  // baru nempel di belakang sesuai urutan checklist-nya. Penomoran ulang
  // ini HANYA terjadi di titik "tambah" ini -- hapus guru dari daftar
  // tidak otomatis menutup bolong yang tersisa.
  const handleTambahBanyak = async () => {
    if (calonTerpilih.length === 0) {
      showToast?.("Centang minimal 1 guru dulu", "error");
      return;
    }
    setMenambah(true);
    try {
      const guruBaruUrut = calonPengawas.filter((g) => calonTerpilih.includes(g.id));
      const gabunganUrut = [...daftarAsli, ...guruBaruUrut];
      const perubahan = gabunganUrut.map((g, idx) => ({
        id: g.id,
        kode_pengawas: String(idx + 1).padStart(2, "0"),
      }));
      await simpanKodePengawas(supabase, perubahan);
      showToast?.(`${guruBaruUrut.length} guru ditambahkan ke Daftar Pengawas`, "success");
      setCalonTerpilih([]);
      await muatData();
      onPerubahan?.();
    } catch (err) {
      console.error(err);
      showToast?.("Gagal menambah pengawas: " + err.message, "error");
    } finally {
      setMenambah(false);
    }
  };

  // Buat merapikan guru yang UDAH ada di daftar sekarang (misal 22 orang
  // ini ditambahin sebelum logic penomoran otomatis di atas ada, jadi
  // kode-nya masih peninggalan cara lama/bolong-bolong). Nomor ulang dari
  // urutan tabel yang lagi ditampilin (daftarEdit) -- kalau ada baris yang
  // barusan dikoreksi manual di kolom Kode tapi belum ditekan "Simpan
  // Perubahan", urutan itu tetap dihormati.
  const handleUrutkanUlang = async () => {
    if (daftarEdit.length === 0) return;
    setMerapikan(true);
    try {
      const perubahan = daftarEdit.map((g, idx) => ({
        id: g.id,
        kode_pengawas: String(idx + 1).padStart(2, "0"),
      }));
      await simpanKodePengawas(supabase, perubahan);
      showToast?.(`Kode ${daftarEdit.length} pengawas berhasil diurutkan ulang`, "success");
      await muatData();
      onPerubahan?.();
    } catch (err) {
      console.error(err);
      showToast?.("Gagal mengurutkan ulang kode: " + err.message, "error");
    } finally {
      setMerapikan(false);
    }
  };

  const handleHapus = async (guru) => {
    if (!window.confirm(`Hapus "${guru.full_name}" dari Daftar Pengawas?`)) return;
    setMenghapus(guru.id);
    try {
      await hapusPengawasKode(supabase, guru.id);
      showToast?.("Guru dihapus dari Daftar Pengawas", "success");
      await muatData();
      onPerubahan?.();
    } catch (err) {
      console.error(err);
      showToast?.("Gagal menghapus pengawas: " + err.message, "error");
    } finally {
      setMenghapus(null);
    }
  };

  const handleUbahKode = (id, kode) => {
    setDaftarEdit((prev) => prev.map((g) => (g.id === id ? { ...g, kode_pengawas: kode } : g)));
  };

  // Cuma baris yang kode-nya BENERAN beda dari data asli yang dianggap
  // "berubah" -- ini yang dikirim ke simpanKodePengawas, bukan semua baris.
  const adaPerubahan = useMemo(() => {
    const asliMap = new Map(daftarAsli.map((g) => [g.id, g.kode_pengawas || ""]));
    return daftarEdit.some((g) => (g.kode_pengawas || "") !== (asliMap.get(g.id) || ""));
  }, [daftarAsli, daftarEdit]);

  const handleSimpan = async () => {
    const asliMap = new Map(daftarAsli.map((g) => [g.id, g.kode_pengawas || ""]));
    const perubahan = daftarEdit
      .filter((g) => (g.kode_pengawas || "") !== (asliMap.get(g.id) || ""))
      .map((g) => ({ id: g.id, kode_pengawas: g.kode_pengawas }));

    if (perubahan.length === 0) return;

    setMenyimpan(true);
    try {
      const jumlah = await simpanKodePengawas(supabase, perubahan);
      showToast?.(`Berhasil disimpan: ${jumlah} kode pengawas diperbarui`, "success");
      // Refresh "data asli" biar tombol Simpan balik nonaktif sampe ada
      // perubahan baru lagi, tanpa perlu fetch ulang ke DB.
      setDaftarAsli(daftarEdit);
      onPerubahan?.();
    } catch (err) {
      console.error(err);
      showToast?.("Gagal menyimpan: " + err.message, "error");
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <div className={embedded ? "" : "p-4 sm:p-6"}>
      {!embedded && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4"
        >
          <ChevronLeft size={16} /> Kembali ke Sub-fitur
        </button>
      )}

      {!embedded && (
        <div className="mb-5">
          <p className="text-xs text-gray-500 dark:text-gray-400">Jenis Ujian</p>
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
            Daftar Pengawas {JENIS_UJIAN_LABEL[jenisUjian] || jenisUjian}
          </h2>
        </div>
      )}

      {embedded && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Guru yang kebagian tugas ngawas ujian -- gak semua guru ada di sini, tambahin dulu lewat
          panel di bawah. Kode ini dipakai di Kartu Ujian & pemilihan guru di tab "Jadwal Ngawas".
        </p>
      )}

      {loading ? (
        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <Loader2 size={14} className="animate-spin" /> Memuat daftar pengawas...
        </p>
      ) : (
        <>
          {/* ---- Panel Tambah Pengawas (checklist) ---- */}
          <div className="p-3 mb-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Tambah Pengawas
              </p>
              {calonPengawas.length > 0 && (
                <label className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={semuaTercentang}
                    onChange={toggleCentangSemua}
                    className="rounded border-gray-300"
                  />
                  Centang Semua
                </label>
              )}
            </div>

            {calonPengawas.length === 0 ? (
              <p className="text-xs text-gray-400 italic">
                Semua guru sudah ada di Daftar Pengawas.
              </p>
            ) : (
              <>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
                  Centang guru yang kebagian tugas ngawas ujian (guru yang cuma jadi panitia gak
                  perlu dicentang). Kode masing-masing otomatis disaranin dari teacher_id, bisa
                  dikoreksi belakangan di tabel.
                </p>
                <div className="columns-1 sm:columns-2 lg:columns-3 gap-3 mb-3 p-2 rounded-lg bg-white dark:bg-gray-800">
                  {calonPengawas.map((g) => (
                    <label
                      key={g.id}
                      className="flex items-center gap-2 text-xs px-1.5 py-1 mb-1 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer break-inside-avoid"
                    >
                      <input
                        type="checkbox"
                        checked={calonTerpilih.includes(g.id)}
                        onChange={() => toggleCalon(g.id)}
                        className="rounded border-gray-300"
                      />
                      {g.full_name}
                    </label>
                  ))}
                </div>
                <button
                  onClick={handleTambahBanyak}
                  disabled={menambah || calonTerpilih.length === 0}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-all active:scale-95"
                >
                  <Plus size={15} />
                  {menambah
                    ? "Menambah..."
                    : `Tambah ${calonTerpilih.length > 0 ? calonTerpilih.length : ""} Pengawas`}
                </button>
              </>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 text-left text-gray-600 dark:text-gray-400">
                    <th className="py-2.5 px-3 font-medium w-12">No</th>
                    <th className="py-2.5 px-3 font-medium">Nama Pengawas</th>
                    <th className="py-2.5 px-3 font-medium w-24">Kode</th>
                    <th className="py-2.5 px-3 font-medium w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {daftarEdit.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs text-gray-400 italic">
                        Belum ada guru di Daftar Pengawas.
                      </td>
                    </tr>
                  )}
                  {daftarEdit.map((g, idx) => (
                    <tr
                      key={g.id}
                      className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50/60 dark:hover:bg-gray-700/30"
                    >
                      <td className="py-2 px-3 text-gray-500 dark:text-gray-400">{idx + 1}</td>
                      <td className="py-2 px-3 text-gray-800 dark:text-gray-100">{g.full_name}</td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={g.kode_pengawas || ""}
                          onChange={(e) => handleUbahKode(g.id, e.target.value)}
                          placeholder="mis. 01"
                          className="w-16 px-2 py-1 text-sm text-center font-mono rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => handleHapus(g)}
                          disabled={menghapus === g.id}
                          className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
                          title="Hapus dari Daftar Pengawas"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSimpan}
              disabled={menyimpan || !adaPerubahan}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-all active:scale-95"
            >
              <Save size={16} />
              {menyimpan ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
            <button
              onClick={handleUrutkanUlang}
              disabled={merapikan || daftarEdit.length === 0}
              title="Nomori ulang semua kode di daftar ini jadi 01, 02, ... sesuai urutan tabel sekarang"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-60 transition-all active:scale-95"
            >
              <ListOrdered size={16} />
              {merapikan ? "Mengurutkan..." : "Urutkan Ulang Kode"}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default DaftarPengawasTab;
