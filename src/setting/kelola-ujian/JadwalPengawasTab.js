// setting/kelola-ujian/JadwalPengawasTab.js
// Sub-fitur "Jadwal & Pengawas" dari Manajemen Ujian.
// Alur: pilih tahun ajaran -> kelola daftar sesi ujian (tanggal, jam, mapel)
// di tab "Jadwal Sesi" -> assign guru pengawas per ruangan untuk tiap sesi
// di tab "Pengawas". Ruangan yang tersedia diambil dari hasil Pembagian
// Ruangan (tabel peserta_ujian) -- kalau belum diproses, tampilkan
// peringatan untuk proses ruangan dulu.

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, Plus, Trash2, X, CalendarClock, Users, Loader2 } from "lucide-react";
import { supabase } from "../../supabaseClient";
import {
  ambilDaftarTahunAjaran,
  getOrCreateUjian,
  KONFIGURASI_JENIS_UJIAN,
} from "./pembagianRuanganSupabase";
import {
  ambilRuanganUjian,
  ambilDaftarGuru,
  ambilJadwalSesi,
  simpanJadwalSesi,
  hapusJadwalSesi,
  ambilPengawasUntukJadwal,
  tambahPengawas,
  hapusPengawas,
} from "./jadwalPengawasSupabase";

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

const JadwalPengawasTab = ({ jenisUjian, showToast, onBack }) => {
  const [daftarTahunAjaran, setDaftarTahunAjaran] = useState([]);
  const [tahunAjaranId, setTahunAjaranId] = useState("");
  const [loadingTahunAjaran, setLoadingTahunAjaran] = useState(true);

  const [ujian, setUjian] = useState(null);
  const [loadingUjian, setLoadingUjian] = useState(false);

  const [daftarRuangan, setDaftarRuangan] = useState([]);
  const [daftarGuru, setDaftarGuru] = useState([]);
  const [daftarJadwal, setDaftarJadwal] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  const [tabAktif, setTabAktif] = useState("jadwal"); // "jadwal" | "pengawas"

  const [showModalJadwal, setShowModalJadwal] = useState(false);
  const [editingJadwal, setEditingJadwal] = useState(null);
  const [formJadwal, setFormJadwal] = useState(emptyJadwalForm);
  const [savingJadwal, setSavingJadwal] = useState(false);

  const [jadwalPengawasAktif, setJadwalPengawasAktif] = useState(null);
  const [pengawasPerRuangan, setPengawasPerRuangan] = useState({});
  const [loadingPengawas, setLoadingPengawas] = useState(false);
  const [guruTerpilihBaru, setGuruTerpilihBaru] = useState({});
  const [menambahPengawas, setMenambahPengawas] = useState(null);

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

  // Begitu tahun ajaran fix, ambil/bikin record `ujian` (idempotent, sama
  // seperti Pembagian Ruangan -- kapasitas default cuma dipakai kalau
  // admin buka Jadwal & Pengawas duluan sebelum Pembagian Ruangan).
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

  const muatData = useCallback(async () => {
    if (!ujian?.id) return;
    setLoadingData(true);
    try {
      const [ruangan, guru, jadwal] = await Promise.all([
        ambilRuanganUjian(supabase, ujian.id),
        ambilDaftarGuru(supabase),
        ambilJadwalSesi(supabase, ujian.id),
      ]);
      setDaftarRuangan(ruangan);
      setDaftarGuru(guru);
      setDaftarJadwal(jadwal);
    } catch (err) {
      console.error(err);
      showToast?.("Gagal memuat data jadwal & pengawas: " + err.message, "error");
    } finally {
      setLoadingData(false);
    }
  }, [ujian?.id, showToast]);

  useEffect(() => {
    muatData();
  }, [muatData]);

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
      });
      showToast?.(editingJadwal ? "Jadwal diperbarui" : "Jadwal ditambahkan", "success");
      closeModalJadwal();
      muatData();
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
      if (jadwalPengawasAktif === jadwal.id) setJadwalPengawasAktif(null);
      muatData();
    } catch (err) {
      console.error(err);
      showToast?.("Gagal menghapus jadwal: " + err.message, "error");
    }
  };

  useEffect(() => {
    if (tabAktif !== "pengawas" || !jadwalPengawasAktif) return;
    (async () => {
      setLoadingPengawas(true);
      try {
        const data = await ambilPengawasUntukJadwal(supabase, jadwalPengawasAktif);
        const grouped = {};
        daftarRuangan.forEach((r) => (grouped[r.nomor_ruangan] = []));
        data.forEach((p) => {
          if (!grouped[p.nomor_ruangan]) grouped[p.nomor_ruangan] = [];
          grouped[p.nomor_ruangan].push(p);
        });
        setPengawasPerRuangan(grouped);
      } catch (err) {
        console.error(err);
        showToast?.("Gagal memuat data pengawas: " + err.message, "error");
      } finally {
        setLoadingPengawas(false);
      }
    })();
  }, [tabAktif, jadwalPengawasAktif, daftarRuangan, showToast]);

  useEffect(() => {
    if (tabAktif === "pengawas" && !jadwalPengawasAktif && daftarJadwal.length > 0) {
      setJadwalPengawasAktif(daftarJadwal[0].id);
    }
  }, [tabAktif, jadwalPengawasAktif, daftarJadwal]);

  const handleTambahPengawas = async (nomorRuangan) => {
    const guruId = guruTerpilihBaru[nomorRuangan];
    if (!guruId) {
      showToast?.("Pilih guru dulu", "error");
      return;
    }
    const sudahAda = (pengawasPerRuangan[nomorRuangan] || []).some((p) => p.guru_id === guruId);
    if (sudahAda) {
      showToast?.("Guru ini sudah jadi pengawas di ruangan ini", "error");
      return;
    }
    setMenambahPengawas(nomorRuangan);
    try {
      const baru = await tambahPengawas(supabase, jadwalPengawasAktif, nomorRuangan, guruId);
      const guru = daftarGuru.find((g) => g.id === guruId);
      setPengawasPerRuangan((prev) => ({
        ...prev,
        [nomorRuangan]: [...(prev[nomorRuangan] || []), { ...baru, nama: guru?.full_name }],
      }));
      setGuruTerpilihBaru((prev) => ({ ...prev, [nomorRuangan]: "" }));
    } catch (err) {
      console.error(err);
      showToast?.("Gagal menambah pengawas: " + err.message, "error");
    } finally {
      setMenambahPengawas(null);
    }
  };

  const handleHapusPengawas = async (nomorRuangan, pengawasId) => {
    try {
      await hapusPengawas(supabase, pengawasId);
      setPengawasPerRuangan((prev) => ({
        ...prev,
        [nomorRuangan]: (prev[nomorRuangan] || []).filter((p) => p.id !== pengawasId),
      }));
    } catch (err) {
      console.error(err);
      showToast?.("Gagal menghapus pengawas: " + err.message, "error");
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
          <Loader2 size={14} className="animate-spin" /> Memuat data...
        </p>
      )}

      {ujian && !loadingData && (
        <>
          {daftarRuangan.length === 0 && (
            <div className="p-3 mb-5 text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-300">
              Belum ada data ruangan untuk tahun ajaran ini. Proses dulu{" "}
              <strong>Pembagian Ruangan</strong> supaya daftar ruangan tersedia di sini.
            </div>
          )}

          <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setTabAktif("jadwal")}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tabAktif === "jadwal"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <CalendarClock size={15} /> Jadwal Sesi
            </button>
            <button
              onClick={() => setTabAktif("pengawas")}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tabAktif === "pengawas"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <Users size={15} /> Pengawas
            </button>
          </div>

          {tabAktif === "jadwal" && (
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
                  <table className="w-full text-xs sm:text-sm border-collapse">
                    <thead>
                      <tr className="text-left text-gray-600 dark:text-gray-400">
                        <th className="py-2 pr-3 font-medium">Hari/Tanggal</th>
                        <th className="py-2 pr-3 font-medium">Jam Ke</th>
                        <th className="py-2 pr-3 font-medium">Waktu</th>
                        <th className="py-2 pr-3 font-medium">Mata Pelajaran</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {jadwalTerurut.map((j, idx) => {
                        const tanggalSama = idx > 0 && jadwalTerurut[idx - 1].tanggal === j.tanggal;
                        return (
                          <tr key={j.id} className="border-t border-gray-100 dark:border-gray-700">
                            <td className="py-2 pr-3 whitespace-nowrap text-gray-700 dark:text-gray-300">
                              {tanggalSama ? "" : formatHariTanggal(j.tanggal)}
                            </td>
                            <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">
                              {j.sesi_ke}
                            </td>
                            <td className="py-2 pr-3 whitespace-nowrap text-gray-700 dark:text-gray-300">
                              {j.waktu_mulai && j.waktu_selesai
                                ? `${j.waktu_mulai}–${j.waktu_selesai}`
                                : "-"}
                            </td>
                            <td className="py-2 pr-3 font-medium text-gray-800 dark:text-gray-100">
                              {j.mata_pelajaran}
                            </td>
                            <td className="py-2 text-right whitespace-nowrap">
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

          {tabAktif === "pengawas" && (
            <div>
              {daftarJadwal.length === 0 ? (
                <p className="text-xs text-gray-400 italic">
                  Belum ada jadwal sesi. Tambahkan dulu di tab "Jadwal Sesi".
                </p>
              ) : (
                <>
                  <div className="mb-4 max-w-sm">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Pilih Sesi
                    </label>
                    <select
                      value={jadwalPengawasAktif ?? ""}
                      onChange={(e) => setJadwalPengawasAktif(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                    >
                      {jadwalTerurut.map((j) => (
                        <option key={j.id} value={j.id}>
                          {formatHariTanggal(j.tanggal)} - Jam Ke {j.sesi_ke} - {j.mata_pelajaran}
                        </option>
                      ))}
                    </select>
                  </div>

                  {loadingPengawas ? (
                    <p className="text-xs text-gray-400 flex items-center gap-1.5">
                      <Loader2 size={14} className="animate-spin" /> Memuat data pengawas...
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {daftarRuangan.map((r) => (
                        <div
                          key={r.nomor_ruangan}
                          className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                              Ruang {r.nomor_ruangan}
                            </p>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400">
                              {r.jumlah_siswa} siswa
                            </span>
                          </div>

                          <div className="space-y-1.5 mb-3">
                            {(pengawasPerRuangan[r.nomor_ruangan] || []).length === 0 && (
                              <p className="text-[11px] text-gray-400 italic">Belum ada pengawas</p>
                            )}
                            {(pengawasPerRuangan[r.nomor_ruangan] || []).map((p) => (
                              <div
                                key={p.id}
                                className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-700/50 rounded-lg px-2.5 py-1.5"
                              >
                                <span className="text-gray-700 dark:text-gray-300">{p.nama}</span>
                                <button
                                  onClick={() => handleHapusPengawas(r.nomor_ruangan, p.id)}
                                  className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                          </div>

                          <div className="flex gap-1.5">
                            <select
                              value={guruTerpilihBaru[r.nomor_ruangan] || ""}
                              onChange={(e) =>
                                setGuruTerpilihBaru((prev) => ({
                                  ...prev,
                                  [r.nomor_ruangan]: e.target.value,
                                }))
                              }
                              className="flex-1 min-w-0 px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                            >
                              <option value="">Pilih guru...</option>
                              {daftarGuru.map((g) => (
                                <option key={g.id} value={g.id}>
                                  {g.full_name}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleTambahPengawas(r.nomor_ruangan)}
                              disabled={menambahPengawas === r.nomor_ruangan}
                              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
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
              </div>

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

export default JadwalPengawasTab;
