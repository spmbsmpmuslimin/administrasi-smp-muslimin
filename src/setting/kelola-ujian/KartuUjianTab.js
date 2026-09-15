// setting/kelola-ujian/KartuUjianTab.js
// Sub-fitur "Kartu Ujian" -- 2 template lewat tab: Peserta & Pengawas.
// Pola alur & pemilihan tahun ajaran SENGAJA disamakan persis dengan
// JadwalPengawasTab.js (ambilDaftarTahunAjaran -> getOrCreateUjian),
// supaya UX-nya konsisten di seluruh sub-fitur Manajemen Ujian.

import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, Printer, DoorOpen, Users, Loader2, IdCard } from "lucide-react";
import { supabase } from "../../supabaseClient";
import {
  ambilDaftarTahunAjaran,
  getOrCreateUjian,
  KONFIGURASI_JENIS_UJIAN,
} from "./pembagianRuanganSupabase";
import { ambilRuanganUjian } from "./jadwalPengawasSupabase";
import {
  ambilPesertaRuangan,
  ambilJadwalPengawasPerGuru,
  ambilMetadataKepsek,
} from "./kartuUjianSupabase";
import { generateKartuPesertaPdf, generateKartuPengawasPdf } from "./kartuUjianPdf";

const JENIS_UJIAN_LABEL = {
  PSAS: "PSAS - Penilaian Sumatif Akhir Semester",
  PSAT: "PSAT - Penilaian Sumatif Akhir Tahun",
  PSAJ: "PSAJ - Penilaian Sumatif Akhir Jenjang",
};

function labelTahunAjaran(row) {
  return row.year || row.tahun_ajaran || row.name || row.label || row.nama || `ID: ${row.id}`;
}

const KartuUjianTab = ({ jenisUjian, showToast, onBack }) => {
  const [daftarTahunAjaran, setDaftarTahunAjaran] = useState([]);
  const [tahunAjaranId, setTahunAjaranId] = useState("");
  const [loadingTahunAjaran, setLoadingTahunAjaran] = useState(true);

  const [ujian, setUjian] = useState(null);
  const [loadingUjian, setLoadingUjian] = useState(false);

  const [tabAktif, setTabAktif] = useState("peserta"); // "peserta" | "pengawas"

  const [daftarRuangan, setDaftarRuangan] = useState([]);
  const [daftarGuruJadwal, setDaftarGuruJadwal] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  const [mencetakRuangan, setMencetakRuangan] = useState(null);
  const [mencetakSemuaPengawas, setMencetakSemuaPengawas] = useState(false);

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
  // seperti Pembagian Ruangan & Jadwal Pengawas).
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
      const [ruangan, guruJadwal] = await Promise.all([
        ambilRuanganUjian(supabase, ujian.id),
        ambilJadwalPengawasPerGuru(supabase, ujian.id),
      ]);
      setDaftarRuangan(ruangan);
      setDaftarGuruJadwal(guruJadwal);
    } catch (err) {
      console.error(err);
      showToast?.("Gagal memuat data kartu ujian: " + err.message, "error");
    } finally {
      setLoadingData(false);
    }
  }, [ujian?.id, showToast]);

  useEffect(() => {
    muatData();
  }, [muatData]);

  const ambilTahunAjaranTerpilih = () => daftarTahunAjaran.find((ta) => ta.id === tahunAjaranId);

  const handleCetakPeserta = async (nomorRuangan) => {
    const ta = ambilTahunAjaranTerpilih();
    if (!ta || !ujian) return;

    setMencetakRuangan(nomorRuangan);
    try {
      const [daftarPeserta, kepsek] = await Promise.all([
        ambilPesertaRuangan(supabase, ujian.id, nomorRuangan),
        ambilMetadataKepsek(supabase),
      ]);

      if (kepsek.nama === "-") {
        showToast?.(
          "Nama kepala sekolah belum diisi di Setting > Profil Sekolah -- kartu tetap dicetak, tapi kolom nama kepsek kosong",
          "error"
        );
      }

      generateKartuPesertaPdf({
        daftarPeserta,
        jenisUjian,
        tahunAjaran: labelTahunAjaran(ta),
        nomorRuangan,
        kepsek,
      });
      showToast?.(`Kartu peserta ruangan ${nomorRuangan} berhasil dicetak`, "success");
    } catch (err) {
      console.error(err);
      showToast?.("Gagal mencetak kartu peserta: " + err.message, "error");
    } finally {
      setMencetakRuangan(null);
    }
  };

  const handleCetakSemuaPengawas = async () => {
    const ta = ambilTahunAjaranTerpilih();
    if (!ta || !ujian) return;

    setMencetakSemuaPengawas(true);
    try {
      const kepsek = await ambilMetadataKepsek(supabase);
      if (kepsek.nama === "-") {
        showToast?.(
          "Nama kepala sekolah belum diisi di Setting > Profil Sekolah -- kartu tetap dicetak, tapi kolom nama kepsek kosong",
          "error"
        );
      }
      generateKartuPengawasPdf({
        daftarGuruJadwal,
        jenisUjian,
        tahunAjaran: labelTahunAjaran(ta),
        kepsek,
      });
      showToast?.("Kartu pengawas berhasil dicetak", "success");
    } catch (err) {
      console.error(err);
      showToast?.("Gagal mencetak kartu pengawas: " + err.message, "error");
    } finally {
      setMencetakSemuaPengawas(false);
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
          <Loader2 size={14} className="animate-spin" /> Memuat data...
        </p>
      )}

      {ujian && !loadingData && (
        <>
          <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setTabAktif("peserta")}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tabAktif === "peserta"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <IdCard size={15} /> Kartu Peserta
            </button>
            <button
              onClick={() => setTabAktif("pengawas")}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tabAktif === "pengawas"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <Users size={15} /> Kartu Pengawas
            </button>
          </div>

          {tabAktif === "peserta" && (
            <div>
              {daftarRuangan.length === 0 ? (
                <div className="p-3 text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-300">
                  Belum ada data ruangan untuk tahun ajaran ini. Proses & simpan dulu{" "}
                  <strong>Pembagian Ruangan</strong> supaya kartu peserta bisa dicetak.
                </div>
              ) : (
                <>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Pilih ruangan untuk dicetak kartu pesertanya:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {daftarRuangan.map((r) => (
                      <div
                        key={r.nomor_ruangan}
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                      >
                        <div className="flex items-center gap-2">
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
                        <button
                          onClick={() => handleCetakPeserta(r.nomor_ruangan)}
                          disabled={mencetakRuangan === r.nomor_ruangan}
                          className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {mencetakRuangan === r.nomor_ruangan ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Printer className="w-3.5 h-3.5" />
                          )}
                          Cetak
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {tabAktif === "pengawas" && (
            <div>
              {daftarGuruJadwal.length === 0 ? (
                <div className="p-3 text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-300">
                  Belum ada guru yang kebagian jadwal mengawas. Atur dulu di{" "}
                  <strong>Jadwal & Pengawas</strong> supaya kartu pengawas bisa dicetak.
                </div>
              ) : (
                <>
                  <button
                    onClick={handleCetakSemuaPengawas}
                    disabled={mencetakSemuaPengawas}
                    className="flex items-center gap-2 px-4 py-2.5 mb-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all active:scale-95 disabled:opacity-60"
                  >
                    {mencetakSemuaPengawas ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Printer className="w-4 h-4" />
                    )}
                    Cetak Semua Kartu Pengawas ({daftarGuruJadwal.length} guru)
                  </button>

                  <div className="space-y-1.5">
                    {daftarGuruJadwal.map((g) => (
                      <div
                        key={g.guru_id}
                        className="flex items-center justify-between text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2"
                      >
                        <span className="text-gray-700 dark:text-gray-300">{g.nama}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {g.sesi.length} sesi
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default KartuUjianTab;
