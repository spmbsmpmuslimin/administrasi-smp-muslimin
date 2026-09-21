// setting/kelola-ujian/dokumen-cetak/LaporanRekapAkhirTab.js
// Sub-fitur "Laporan Rekap Akhir" -- kumpulan rekap final dari seluruh
// sub-fitur Manajemen Ujian: tempat INPUT & PREVIEW data mentah yang jadi
// bahan Laporan Pelaksanaan PSAS/PSAT/PSAJ.
//
// Item yang datanya reuse langsung dari sub-fitur lain (read-only di sini):
//   1. Rekap Peserta & Ruangan   (dari Peserta & Pengawas)
//   3. Rekap Pengawas             (dari Jadwal & Pembagian Ruangan)
//
// Item yang butuh input manual di sini (belum ada datanya di modul lain):
//   2. Rekap Kehadiran   -- presensi ujian full manual di kertas (lihat
//      PresensiBeritaAcaraTab.js), jadi TU/panitia rekap ulang jumlah
//      hadir/tidak hadir per ruangan ke sini setelah ujian selesai.
//
// CATATAN (revisi): item "Rekap Anggaran & Realisasi Biaya", "Keterangan
// Nilai", "Evaluasi & Kendala", dan "Kesimpulan & Saran" SUDAH DIHAPUS dari
// sini -- dianggap gak kepake & bikin ribet. Sub-fitur "Anggaran & Biaya"
// dicabut total dari aplikasi (dikelola manual/terpisah di luar aplikasi).
// Konsekuensinya di PDF "Laporan Lengkap" (../laporan-lengkap/): BAB
// Pembiayaan, BAB Evaluasi & Kendala, dan sub-bagian "Keterangan Nilai"
// juga sudah dicabut & bab-nya dirapikan ulang (lihat laporanLengkapPdf.js).
//
// CATATAN PENTING (revisi): tab ini SUDAH TIDAK punya tombol export PDF
// sendiri. Sebelumnya ada tombol "Export Laporan Lengkap (PDF)" di sini,
// tapi ternyata redundant sama sub-fitur baru "Laporan Lengkap"
// (../laporan-lengkap/) yang menghasilkan PDF resmi lebih lengkap --
// sudah termasuk Cover, Kata Pengantar, Daftar Isi, dan Pendahuluan yang
// nggak ada di generator lama. Data rekap di atas TETAP DIINPUT/DISIMPAN
// di sini seperti biasa; sub-fitur "Laporan Lengkap" tinggal baca ulang
// data yang sama buat di-compile jadi 1 PDF utuh.
// -> generateLaporanRekapAkhirPdf() & file laporanRekapAkhirPdf.js SUDAH
//    DIHAPUS dari folder ini, isinya sudah dipindah ke
//    ../laporan-lengkap/laporanLengkapPdf.js.
//
// Pola alur & pemilihan tahun ajaran disamakan dengan sub-fitur lain di
// Manajemen Ujian supaya UX-nya konsisten.

import React, { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  Loader2,
  Users,
  ClipboardCheck,
  UserCheck,
  Save,
  FileText,
} from "lucide-react";
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
  simpanKehadiran,
} from "./laporanRekapAkhirSupabase";

const JENIS_UJIAN_LABEL = {
  PSAS: "PSAS - Penilaian Sumatif Akhir Semester",
  PSAT: "PSAT - Penilaian Sumatif Akhir Tahun",
  PSAJ: "PSAJ - Penilaian Sumatif Akhir Jenjang",
};

function labelTahunAjaran(row) {
  return row.year || row.tahun_ajaran || row.name || row.label || row.nama || `ID: ${row.id}`;
}

function SeksiCard({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="mb-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
          <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

// Daftar item yang muncul di halaman daftar (list) -- klik salah satu
// buka halaman detail-nya sendiri, biar nggak perlu scroll panjang.
const DAFTAR_ITEM = [
  { id: "peserta", title: "Rekap Peserta & Ruangan", icon: Users },
  { id: "kehadiran", title: "Rekap Kehadiran", icon: ClipboardCheck },
  { id: "pengawas", title: "Rekap Pengawas", icon: UserCheck },
];

const LaporanRekapAkhirTab = ({ jenisUjian, showToast, onBack }) => {
  const [daftarTahunAjaran, setDaftarTahunAjaran] = useState([]);
  const [tahunAjaranId, setTahunAjaranId] = useState("");
  const [loadingTahunAjaran, setLoadingTahunAjaran] = useState(true);

  const [ujian, setUjian] = useState(null);
  const [loadingUjian, setLoadingUjian] = useState(false);

  const [rekapPeserta, setRekapPeserta] = useState(null);
  const [rekapPengawas, setRekapPengawas] = useState(null);
  const [kehadiran, setKehadiran] = useState([]);
  const [loadingRekap, setLoadingRekap] = useState(false);
  const [menyimpanKehadiran, setMenyimpanKehadiran] = useState(null); // nomor_ruangan yg lagi disave
  const [activeItem, setActiveItem] = useState(null); // null = tampilkan daftar item

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

  const muatSemuaRekap = useCallback(async () => {
    if (!ujian?.id) return;
    setLoadingRekap(true);
    try {
      const [peserta, pengawas, hadir] = await Promise.all([
        ambilRekapPeserta(supabase, ujian.id),
        ambilRekapPengawas(supabase, ujian.id),
        ambilKehadiran(supabase, ujian.id),
      ]);
      setRekapPeserta(peserta);
      setRekapPengawas(pengawas);
      setKehadiran(hadir);
    } catch (err) {
      console.error(err);
      showToast?.("Gagal memuat rekap: " + err.message, "error");
    } finally {
      setLoadingRekap(false);
    }
  }, [ujian?.id, showToast]);

  useEffect(() => {
    muatSemuaRekap();
  }, [muatSemuaRekap]);  // Gabungkan daftar ruangan dari rekap peserta dengan baris kehadiran yg
  // sudah tersimpan, supaya ruangan yg belum diisi tetap muncul (default 0).
  const baristKehadiran = (rekapPeserta?.perRuangan || []).map((r) => {
    const existing = kehadiran.find((k) => k.nomor_ruangan === r.nomor_ruangan);
    return {
      nomor_ruangan: r.nomor_ruangan,
      jumlah_siswa: r.jumlah_siswa,
      jumlah_hadir: existing?.jumlah_hadir ?? "",
      jumlah_tidak_hadir: existing?.jumlah_tidak_hadir ?? "",
      keterangan: existing?.keterangan ?? "",
    };
  });

  const [formKehadiran, setFormKehadiran] = useState({});
  useEffect(() => {
    const init = {};
    baristKehadiran.forEach((b) => {
      init[b.nomor_ruangan] = {
        jumlah_hadir: b.jumlah_hadir,
        jumlah_tidak_hadir: b.jumlah_tidak_hadir,
        keterangan: b.keterangan,
      };
    });
    setFormKehadiran(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kehadiran, rekapPeserta]);

  const handleSimpanKehadiran = async (nomorRuangan) => {
    if (!ujian?.id) return;
    setMenyimpanKehadiran(nomorRuangan);
    try {
      const nilai = formKehadiran[nomorRuangan] || {};
      const saved = await simpanKehadiran(supabase, ujian.id, nomorRuangan, {
        jumlah_hadir: Number(nilai.jumlah_hadir) || 0,
        jumlah_tidak_hadir: Number(nilai.jumlah_tidak_hadir) || 0,
        keterangan: nilai.keterangan,
      });
      setKehadiran((prev) => {
        const tanpaIni = prev.filter((k) => k.nomor_ruangan !== nomorRuangan);
        return [...tanpaIni, saved].sort((a, b) => a.nomor_ruangan - b.nomor_ruangan);
      });
      showToast?.(`Kehadiran ruangan ${nomorRuangan} tersimpan`, "success");
    } catch (err) {
      console.error(err);
      showToast?.("Gagal simpan kehadiran: " + err.message, "error");
    } finally {
      setMenyimpanKehadiran(null);
    }
  };

  const totalHadir = kehadiran.reduce((sum, k) => sum + (k.jumlah_hadir || 0), 0);
  const totalTidakHadir = kehadiran.reduce((sum, k) => sum + (k.jumlah_tidak_hadir || 0), 0);

  // Subtitle ringkas per item, dipakai di halaman daftar.
  function subtitleItem(id) {
    switch (id) {
      case "peserta":
        return rekapPeserta
          ? `${rekapPeserta.totalPeserta} peserta di ${rekapPeserta.jumlahRuangan} ruangan`
          : "Belum ada data pembagian ruangan";
      case "kehadiran":
        return kehadiran.length > 0
          ? `Total ${totalHadir} hadir, ${totalTidakHadir} tidak hadir (${kehadiran.length} ruangan diisi)`
          : "Belum diisi -- input manual berdasarkan Daftar Hadir kertas";
      case "pengawas":
        return rekapPengawas
          ? `${rekapPengawas.jumlahPengawas} guru bertugas di ${rekapPengawas.jumlahSesi} sesi`
          : "Belum ada data";
      default:
        return "";
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <button
        onClick={activeItem ? () => setActiveItem(null) : onBack}
        className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4"
      >
        <ChevronLeft size={16} /> {activeItem ? "Kembali ke Daftar Rekap" : "Kembali ke Sub-fitur"}
      </button>

      <div className="mb-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">Jenis Ujian</p>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {JENIS_UJIAN_LABEL[jenisUjian] || jenisUjian}
        </p>
      </div>

      {!activeItem && (
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
      )}

      {(loadingUjian || loadingRekap) && (
        <p className="text-xs text-gray-400 flex items-center gap-1.5 mb-4">
          <Loader2 size={14} className="animate-spin" /> Memuat rekap...
        </p>
      )}

      {(!ujian || !ujian.versi_skema) && !loadingUjian && tahunAjaranId && (
        <div className="p-3 mb-5 text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-300">
          Data ujian untuk tahun ajaran ini belum diproses. Proses dulu{" "}
          <strong>Pembagian Ruangan</strong> (pilih versi skema & simpan) sebelum lanjut ke sini.
        </div>
      )}

      {ujian && ujian.versi_skema && !loadingRekap && !activeItem && (
        <>
          {/* Dulu ada tombol "Export Laporan Lengkap (PDF)" di sini --
              dicabut karena redundant sama sub-fitur "Laporan Lengkap"
              (lihat catatan di header file). Data di bawah ini tetap
              yang dipakai sub-fitur itu, cuma export PDF-nya pindah ke
              sana. */}
          <div className="mb-4 p-3 text-xs bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl text-indigo-700 dark:text-indigo-300 flex items-start gap-2">
            <FileText className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Mau cetak PDF laporan resmi (lengkap dengan Cover, Kata Pengantar, dst)? Isi semua
              rekap di bawah ini dulu, lalu buka sub-fitur <strong>Laporan Lengkap</strong>.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DAFTAR_ITEM.map((item) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveItem(item.id)}
                  className="text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 cursor-pointer active:scale-95 transition-all"
                >
                  <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 w-fit mb-2">
                    <IconComponent className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {subtitleItem(item.id)}
                  </p>
                </button>
              );
            })}
          </div>
        </>
      )}

      {ujian && ujian.versi_skema && !loadingRekap && activeItem && (
        <>
          {/* 1. Rekap Peserta & Ruangan */}
          {activeItem === "peserta" && (
            <SeksiCard
              icon={Users}
              title="Rekap Peserta & Ruangan"
              subtitle={
                rekapPeserta
                  ? `${rekapPeserta.totalPeserta} peserta di ${rekapPeserta.jumlahRuangan} ruangan`
                  : "Belum ada data pembagian ruangan"
              }
            >
              {rekapPeserta && rekapPeserta.perRuangan.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {rekapPeserta.perRuangan.map((r) => (
                    <div
                      key={r.nomor_ruangan}
                      className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900/40 text-center"
                    >
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        Ruang {r.nomor_ruangan}
                      </p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                        {r.jumlah_siswa} siswa
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">
                  Belum ada data. Proses & simpan dulu di <strong>Peserta & Pengawas</strong>.
                </p>
              )}
            </SeksiCard>
          )}

          {/* 2. Rekap Kehadiran -- input manual */}
          {activeItem === "kehadiran" && (
            <SeksiCard
              icon={ClipboardCheck}
              title="Rekap Kehadiran"
              subtitle={
                kehadiran.length > 0
                  ? `Total ${totalHadir} hadir, ${totalTidakHadir} tidak hadir (dari ${kehadiran.length} ruangan diisi)`
                  : "Belum diisi -- input manual berdasarkan Daftar Hadir kertas"
              }
            >
              {baristKehadiran.length === 0 ? (
                <p className="text-xs text-gray-400">
                  Belum ada ruangan. Proses dulu <strong>Peserta & Pengawas</strong>.
                </p>
              ) : (
                <div className="space-y-2">
                  {baristKehadiran.map((b) => (
                    <div
                      key={b.nomor_ruangan}
                      className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-900/40"
                    >
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-20">
                        Ruang {b.nomor_ruangan}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        ({b.jumlah_siswa} peserta terdaftar)
                      </span>
                      <input
                        type="number"
                        min="0"
                        placeholder="Hadir"
                        value={formKehadiran[b.nomor_ruangan]?.jumlah_hadir ?? ""}
                        onChange={(e) =>
                          setFormKehadiran((prev) => ({
                            ...prev,
                            [b.nomor_ruangan]: {
                              ...prev[b.nomor_ruangan],
                              jumlah_hadir: e.target.value,
                            },
                          }))
                        }
                        className="w-20 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                      />
                      <input
                        type="number"
                        min="0"
                        placeholder="Tdk hadir"
                        value={formKehadiran[b.nomor_ruangan]?.jumlah_tidak_hadir ?? ""}
                        onChange={(e) =>
                          setFormKehadiran((prev) => ({
                            ...prev,
                            [b.nomor_ruangan]: {
                              ...prev[b.nomor_ruangan],
                              jumlah_tidak_hadir: e.target.value,
                            },
                          }))
                        }
                        className="w-24 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                      />
                      <input
                        type="text"
                        placeholder="Keterangan (mis. nama & alasan tdk hadir)"
                        value={formKehadiran[b.nomor_ruangan]?.keterangan ?? ""}
                        onChange={(e) =>
                          setFormKehadiran((prev) => ({
                            ...prev,
                            [b.nomor_ruangan]: {
                              ...prev[b.nomor_ruangan],
                              keterangan: e.target.value,
                            },
                          }))
                        }
                        className="flex-1 min-w-[10rem] px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                      />
                      <button
                        onClick={() => handleSimpanKehadiran(b.nomor_ruangan)}
                        disabled={menyimpanKehadiran === b.nomor_ruangan}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {menyimpanKehadiran === b.nomor_ruangan ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        Simpan
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </SeksiCard>
          )}

          {/* 3. Rekap Pengawas */}
          {activeItem === "pengawas" && (
            <SeksiCard
              icon={UserCheck}
              title="Rekap Pengawas"
              subtitle={
                rekapPengawas
                  ? `${rekapPengawas.jumlahPengawas} guru bertugas di ${rekapPengawas.jumlahSesi} sesi`
                  : "Belum ada data"
              }
            >
              {rekapPengawas && rekapPengawas.daftarPengawas.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {rekapPengawas.daftarPengawas.map((p) => (
                    <div
                      key={p.guru_id}
                      className="flex justify-between px-2 py-1.5 text-xs rounded-lg bg-gray-50 dark:bg-gray-900/40"
                    >
                      <span className="text-gray-700 dark:text-gray-300">{p.nama}</span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {p.jumlahSesiJaga}x jaga
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">
                  Belum ada data. Atur dulu di <strong>Jadwal & Pembagian Ruangan</strong>.
                </p>
              )}
            </SeksiCard>
          )}

        </>
      )}
    </div>
  );
};

export default LaporanRekapAkhirTab;
