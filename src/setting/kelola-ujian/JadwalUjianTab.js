// setting/kelola-ujian/JadwalUjianTab.js
// Kartu "Jadwal Ujian" dari Manajemen Ujian -- kelola tanggal/jam/mapel tiap
// sesi ujian (tabel `ujian_jadwal`).
//
// CATATAN (restrukturisasi Sep 2026) -- kartu ini SENGAJA DIBIKIN independen
// dari "Peserta & Pembagian Ruangan" & "Daftar & Jadwal Pengawas", karena di
// real dunia jadwal ujian biasanya udah given dari sekolah/dinas (tinggal
// disalin ke sini), jadi panitia gak perlu nunggu urusan ruangan/pengawas
// kelar dulu buat mulai isi jadwal.
//
// Supaya ini bisa jalan, begitu Tahun Ajaran dipilih, kartu ini manggil
// getOrCreateUjianDraft() (BUKAN getOrCreateUjian() yang dipakai Pembagian
// Ruangan) -- bikin record `ujian` dengan `versi_skema = null` & status
// "draft" kalau belum ada sama sekali. "Draft" ini SENGAJA gak mengaktifkan
// Portal Ujian buat guru panitia (lihat catatan status di
// pembagianRuanganSupabase.js) -- itu baru kejadian pas Pembagian Ruangan
// BENERAN diproses & disimpan, sama presis kayak behavior sebelumnya.
// Kartu "Panitia Ujian" (PanitiaUjianTab.js) manggil fungsi yang sama juga,
// jadi record ini bisa "kebentuk" dari kartu manapun yang dibuka duluan.
//
// Tab lain (Daftar & Jadwal Pengawas, Kartu Ujian, dst) tetap TIDAK
// menganggap record draft ini sebagai "Pembagian Ruangan sudah diproses" --
// mereka ngecek `ujian.versi_skema` juga, bukan cuma keberadaan record.

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, Plus, X, CalendarClock, Loader2 } from "lucide-react";
import { supabase } from "../../supabaseClient";
import {
  ambilDaftarTahunAjaran,
  getOrCreateUjianDraft,
  KONFIGURASI_JENIS_UJIAN,
} from "./pembagian-ruangan/pembagianRuanganSupabase";
import {
  ambilJadwalSesi,
  simpanJadwalSesi,
  hapusJadwalSesi,
  mataPelajaranUntukJenjang,
} from "./jadwal-pengawas/jadwalPengawasSupabase";

const JENIS_UJIAN_LABEL = {
  PSAS: "PSAS - Penilaian Sumatif Akhir Semester",
  PSAT: "PSAT - Penilaian Sumatif Akhir Tahun",
  PSAJ: "PSAJ - Penilaian Sumatif Akhir Jenjang",
};

function labelTahunAjaran(row) {
  return row.year || row.tahun_ajaran || row.name || row.label || row.nama || `ID: ${row.id}`;
}

const emptyJadwalForm = {
  tanggal: "",
  sesi_ke: 1,
  waktu_mulai: "",
  waktu_selesai: "",
  mata_pelajaran: "",
  mata_pelajaran_kelas8: "",
  mata_pelajaran_kelas9: "",
};

/**
 * Format tanggal (string "YYYY-MM-DD" dari Supabase) jadi "Nama Hari,
 * DD-MM-YYYY" -- mengikuti format kolom "Hari/Tanggal" di edaran jadwal
 * ujian resmi sekolah. Pakai parsing manual (bukan `new Date(tanggal)`
 * langsung) supaya tidak kena pergeseran timezone di browser.
 */
function formatHariTanggal(tanggal) {
  if (!tanggal) return "-";
  const [tahun, bulan, hari] = tanggal.split("-").map(Number);
  const tgl = new Date(tahun, bulan - 1, hari);
  const namaHari = tgl.toLocaleDateString("id-ID", { weekday: "long" });
  const tanggalFormat = `${String(hari).padStart(2, "0")}-${String(bulan).padStart(2, "0")}-${tahun}`;
  return `${namaHari}, ${tanggalFormat}`;
}

const JadwalUjianTab = ({ jenisUjian, showToast, onBack }) => {
  const [daftarTahunAjaran, setDaftarTahunAjaran] = useState([]);
  const [tahunAjaranId, setTahunAjaranId] = useState("");
  const [loadingTahunAjaran, setLoadingTahunAjaran] = useState(true);

  const [ujian, setUjian] = useState(null);
  const [loadingUjian, setLoadingUjian] = useState(false);
  const [gagalSiapkanUjian, setGagalSiapkanUjian] = useState(false);

  const [daftarJadwal, setDaftarJadwal] = useState([]);
  const [loadingJadwal, setLoadingJadwal] = useState(false);

  const [showModalJadwal, setShowModalJadwal] = useState(false);
  const [editingJadwal, setEditingJadwal] = useState(null);
  const [formJadwal, setFormJadwal] = useState(emptyJadwalForm);
  const [savingJadwal, setSavingJadwal] = useState(false);

  // Jenjang peserta ujian ini (PSAS: 7/8/9, PSAT: 7/8, PSAJ: 9 saja) --
  // dipakai buat nentuin input override mata pelajaran kelas 8/9 mana yang
  // perlu ditampilkan di form Tambah/Edit Sesi.
  const gradesUjianIni = KONFIGURASI_JENIS_UJIAN[jenisUjian]?.grades || ["7", "8", "9"];

  const semesterDibutuhkan = KONFIGURASI_JENIS_UJIAN[jenisUjian]?.semester;
  // Kalau jenis ujian tidak dikenal (semesterDibutuhkan undefined), filter
  // tidak akan cocok sama sekali -- sengaja fallback ke semua tahun ajaran
  // supaya user tetap bisa pilih manual daripada dropdown kosong.
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

  // Begitu tahun ajaran fix, SIAPKAN record `ujian` -- beda dari kartu
  // "Daftar & Jadwal Pengawas" / "Kartu Ujian" yang cuma CARI (read-only),
  // kartu ini BOLEH bikin record baru (draft) lewat getOrCreateUjianDraft(),
  // karena kartu ini sengaja jadi salah satu titik masuk paling awal
  // (bareng "Panitia Ujian") sebelum Pembagian Ruangan diproses.
  useEffect(() => {
    if (!tahunAjaranId) {
      setUjian(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingUjian(true);
      setGagalSiapkanUjian(false);
      try {
        const kapasitasDefault = KONFIGURASI_JENIS_UJIAN[jenisUjian]?.defaultKapasitas || 40;
        const rec = await getOrCreateUjianDraft(supabase, jenisUjian, tahunAjaranId, kapasitasDefault);
        if (!cancelled) setUjian(rec);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setGagalSiapkanUjian(true);
          showToast?.("Gagal menyiapkan data ujian: " + err.message, "error");
        }
      } finally {
        if (!cancelled) setLoadingUjian(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tahunAjaranId, jenisUjian, showToast]);

  const muatJadwal = useCallback(async () => {
    if (!ujian?.id) return;
    setLoadingJadwal(true);
    try {
      const jadwal = await ambilJadwalSesi(supabase, ujian.id);
      setDaftarJadwal(jadwal);
    } catch (err) {
      console.error(err);
      showToast?.("Gagal memuat jadwal ujian: " + err.message, "error");
    } finally {
      setLoadingJadwal(false);
    }
  }, [ujian?.id, showToast]);

  useEffect(() => {
    muatJadwal();
  }, [muatJadwal]);

  const openAddJadwal = () => {
    setEditingJadwal(null);
    setFormJadwal(emptyJadwalForm);
    setShowModalJadwal(true);
  };

  const openEditJadwal = (jadwal) => {
    setEditingJadwal(jadwal);
    setFormJadwal({
      tanggal: jadwal.tanggal,
      sesi_ke: jadwal.sesi_ke,
      waktu_mulai: jadwal.waktu_mulai || "",
      waktu_selesai: jadwal.waktu_selesai || "",
      mata_pelajaran: jadwal.mata_pelajaran,
      mata_pelajaran_kelas8: jadwal.mata_pelajaran_kelas8 || "",
      mata_pelajaran_kelas9: jadwal.mata_pelajaran_kelas9 || "",
    });
    setShowModalJadwal(true);
  };

  const closeModalJadwal = () => {
    setShowModalJadwal(false);
    setEditingJadwal(null);
    setFormJadwal(emptyJadwalForm);
  };

  const handleSubmitJadwal = async (e) => {
    e.preventDefault();
    if (!formJadwal.tanggal || !formJadwal.mata_pelajaran.trim()) {
      showToast?.("Tanggal dan mata pelajaran wajib diisi", "error");
      return;
    }
    setSavingJadwal(true);
    try {
      await simpanJadwalSesi(supabase, {
        id: editingJadwal?.id,
        ujian_id: ujian.id,
        tanggal: formJadwal.tanggal,
        sesi_ke: Number(formJadwal.sesi_ke) || 1,
        waktu_mulai: formJadwal.waktu_mulai || null,
        waktu_selesai: formJadwal.waktu_selesai || null,
        mata_pelajaran: formJadwal.mata_pelajaran.trim(),
        mata_pelajaran_kelas8: formJadwal.mata_pelajaran_kelas8.trim() || null,
        mata_pelajaran_kelas9: formJadwal.mata_pelajaran_kelas9.trim() || null,
      });
      showToast?.(editingJadwal ? "Jadwal diperbarui" : "Jadwal ditambahkan", "success");
      closeModalJadwal();
      muatJadwal();
    } catch (err) {
      console.error(err);
      showToast?.("Gagal menyimpan jadwal: " + err.message, "error");
    } finally {
      setSavingJadwal(false);
    }
  };

  const handleHapusJadwal = async (jadwal) => {
    if (
      !window.confirm(
        `Hapus jadwal "${jadwal.mata_pelajaran}" (${jadwal.tanggal})? Data pengawas untuk sesi ini juga akan ikut terhapus.`
      )
    )
      return;
    try {
      await hapusJadwalSesi(supabase, jadwal.id);
      showToast?.("Jadwal dihapus", "success");
      muatJadwal();
    } catch (err) {
      console.error(err);
      showToast?.("Gagal menghapus jadwal: " + err.message, "error");
    }
  };

  const jadwalTerurut = useMemo(
    () =>
      [...daftarJadwal].sort((a, b) =>
        a.tanggal === b.tanggal ? a.sesi_ke - b.sesi_ke : a.tanggal.localeCompare(b.tanggal)
      ),
    [daftarJadwal]
  );

  return (
    <div className="p-4 sm:p-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4"
      >
        <ChevronLeft size={16} /> Kembali ke Sub-fitur
      </button>

      <div className="flex items-center gap-2 mb-1">
        <CalendarClock size={18} className="text-indigo-500" />
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Jadwal Ujian</h2>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Jenis Ujian: <strong>{JENIS_UJIAN_LABEL[jenisUjian] || jenisUjian}</strong>. Kelola tanggal,
        jam, dan mata pelajaran tiap sesi -- gak perlu nunggu Pembagian Ruangan atau Pengawas
        diproses dulu.
      </p>

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
          <Loader2 size={14} className="animate-spin" /> Menyiapkan data ujian...
        </p>
      )}

      {gagalSiapkanUjian && !loadingUjian && (
        <div className="p-3 mb-5 text-xs bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300">
          Gagal menyiapkan data ujian untuk kombinasi ini. Coba ganti tahun ajaran lalu pilih lagi,
          atau muat ulang halaman.
        </div>
      )}

      {ujian && !loadingJadwal && (
        <div>
          <button
            onClick={openAddJadwal}
            className="flex items-center gap-2 px-4 py-2.5 mb-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all active:scale-95"
          >
            <Plus size={16} /> Tambah Sesi
          </button>

          {jadwalTerurut.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Belum ada jadwal sesi.</p>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full text-xs sm:text-sm border-collapse border border-gray-300 dark:border-gray-600">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800">
                    <th
                      rowSpan={2}
                      className="border border-gray-300 dark:border-gray-600 py-3 px-3 font-bold text-sm sm:text-base text-center align-middle text-gray-800 dark:text-gray-100 whitespace-nowrap"
                    >
                      Hari/Tanggal
                    </th>
                    <th
                      rowSpan={2}
                      className="border border-gray-300 dark:border-gray-600 py-3 px-3 font-bold text-sm sm:text-base text-center align-middle text-gray-800 dark:text-gray-100 whitespace-nowrap"
                    >
                      Jam Ke
                    </th>
                    <th
                      rowSpan={2}
                      className="border border-gray-300 dark:border-gray-600 py-3 px-3 font-bold text-sm sm:text-base text-center align-middle text-gray-800 dark:text-gray-100 whitespace-nowrap"
                    >
                      Waktu
                    </th>
                    <th
                      colSpan={gradesUjianIni.length}
                      className="border border-gray-300 dark:border-gray-600 py-3 px-3 font-bold text-sm sm:text-base text-center align-middle text-gray-800 dark:text-gray-100 whitespace-nowrap"
                    >
                      Mata Pelajaran
                    </th>
                    <th
                      rowSpan={2}
                      className="border border-gray-300 dark:border-gray-600 py-3 px-3 font-bold text-sm sm:text-base text-center align-middle text-gray-800 dark:text-gray-100 whitespace-nowrap"
                    >
                      Aksi
                    </th>
                  </tr>
                  <tr className="bg-gray-100 dark:bg-gray-800">
                    {gradesUjianIni.map((g) => (
                      <th
                        key={g}
                        className="border border-gray-300 dark:border-gray-600 py-2 px-3 font-bold text-sm sm:text-base text-center align-middle text-gray-800 dark:text-gray-100 whitespace-nowrap"
                      >
                        Kelas {g}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jadwalTerurut.map((j, idx) => {
                    const tanggalSama = idx > 0 && jadwalTerurut[idx - 1].tanggal === j.tanggal;
                    // Sesi di tanggal yang sama digabung (rowSpan) jadi 1 sel
                    // Hari/Tanggal -- ditaruh di baris pertama hari itu, rata
                    // kiri & tengah secara vertikal. jadwalTerurut sudah
                    // terurut per tanggal, jadi sesi 1 hari pasti berurutan.
                    const jumlahSesiHari = jadwalTerurut.filter(
                      (x) => x.tanggal === j.tanggal
                    ).length;
                    return (
                      <tr
                        key={j.id}
                        className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-900 dark:even:bg-gray-800/40 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                      >
                        {!tanggalSama && (
                          <td
                            rowSpan={jumlahSesiHari}
                            className="border border-gray-200 dark:border-gray-700 py-2.5 px-3 align-middle text-left whitespace-nowrap text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900"
                          >
                            {formatHariTanggal(j.tanggal)}
                          </td>
                        )}
                        <td className="border border-gray-200 dark:border-gray-700 py-2.5 px-3 align-top text-center text-gray-700 dark:text-gray-300">
                          {j.sesi_ke}
                        </td>
                        <td className="border border-gray-200 dark:border-gray-700 py-2.5 px-3 align-top text-center whitespace-nowrap text-gray-700 dark:text-gray-300">
                          {j.waktu_mulai && j.waktu_selesai
                            ? `${j.waktu_mulai}–${j.waktu_selesai}`
                            : "-"}
                        </td>
                        {gradesUjianIni.map((g) => {
                          const mapel = mataPelajaranUntukJenjang(j, g);
                          return (
                            <td
                              key={g}
                              className="border border-gray-200 dark:border-gray-700 py-2.5 px-3 align-top text-center font-medium text-gray-800 dark:text-gray-100"
                            >
                              {mapel}
                            </td>
                          );
                        })}
                        <td className="border border-gray-200 dark:border-gray-700 py-2.5 px-3 align-top text-center whitespace-nowrap">
                          <button
                            onClick={() => openEditJadwal(j)}
                            className="text-indigo-600 dark:text-indigo-400 hover:underline mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleHapusJadwal(j)}
                            className="text-red-600 dark:text-red-400 hover:underline"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {loadingJadwal && (
        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <Loader2 size={14} className="animate-spin" /> Memuat jadwal...
        </p>
      )}

      {showModalJadwal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
                {editingJadwal ? "Edit Sesi" : "Tambah Sesi"}
              </h2>
              <button
                onClick={closeModalJadwal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitJadwal} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Tanggal
                </label>
                <input
                  type="date"
                  value={formJadwal.tanggal}
                  onChange={(e) => setFormJadwal({ ...formJadwal, tanggal: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Jam Ke
                </label>
                <input
                  type="number"
                  min={1}
                  value={formJadwal.sesi_ke}
                  onChange={(e) => setFormJadwal({ ...formJadwal, sesi_ke: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Waktu Mulai
                  </label>
                  <input
                    type="time"
                    value={formJadwal.waktu_mulai}
                    onChange={(e) => setFormJadwal({ ...formJadwal, waktu_mulai: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Waktu Selesai
                  </label>
                  <input
                    type="time"
                    value={formJadwal.waktu_selesai}
                    onChange={(e) =>
                      setFormJadwal({ ...formJadwal, waktu_selesai: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Mata Pelajaran
                </label>
                <input
                  value={formJadwal.mata_pelajaran}
                  onChange={(e) => setFormJadwal({ ...formJadwal, mata_pelajaran: e.target.value })}
                  placeholder="mis. Matematika"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Berlaku buat kelas 7{gradesUjianIni.includes("8") ? ", 8" : ""}
                  {gradesUjianIni.includes("9") ? ", 9" : ""} -- kecuali diisi beda di bawah.
                </p>
              </div>

              {gradesUjianIni.includes("8") && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Mata Pelajaran khusus Kelas 8 (opsional)
                  </label>
                  <input
                    value={formJadwal.mata_pelajaran_kelas8}
                    onChange={(e) =>
                      setFormJadwal({ ...formJadwal, mata_pelajaran_kelas8: e.target.value })
                    }
                    placeholder="Kosongkan kalau sama kayak di atas"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                </div>
              )}

              {gradesUjianIni.includes("9") && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Mata Pelajaran khusus Kelas 9 (opsional)
                  </label>
                  <input
                    value={formJadwal.mata_pelajaran_kelas9}
                    onChange={(e) =>
                      setFormJadwal({ ...formJadwal, mata_pelajaran_kelas9: e.target.value })
                    }
                    placeholder="Kosongkan kalau sama kayak di atas"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModalJadwal}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingJadwal}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
                >
                  {savingJadwal ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default JadwalUjianTab;
