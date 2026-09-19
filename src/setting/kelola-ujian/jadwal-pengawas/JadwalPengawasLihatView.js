// setting/kelola-ujian/jadwal-pengawas/JadwalPengawasLihatView.js
// Isi tab "Jadwal Pengawas" (versi LIHAT & CETAK, read-only). Menampilkan
// tabel yang sama persis dengan file export: jadwal per sesi x ruangan
// (isi = kode pengawas), lalu tabel Daftar Kode Pengawas di bawahnya.
// Pengeditan tetap di tab "Kelola Jadwal Pengawas".
//
// Komponen ini murni presentasi: semua data dikirim dari JadwalPengawasTab.js
// lewat props, jadi gak ada query tambahan ke Supabase.

import React, { useMemo, useState } from "react";
import { Loader2, FileSpreadsheet, FileText } from "lucide-react";
import { bangunDataJadwalPengawas } from "./jadwalPengawasCetak";
import { exportJadwalPengawasExcel } from "./jadwalPengawasExcel";
import { exportJadwalPengawasPdf } from "./jadwalPengawasPdf";

const JadwalPengawasLihatView = ({
  jenisUjian,
  tahunAjaran,
  daftarJadwal,
  daftarRuangan,
  daftarGuru,
  rekapPerJadwal,
  grades,
  loading,
  showToast,
}) => {
  const [sedangExport, setSedangExport] = useState(null); // "excel" | "pdf" | null

  const data = useMemo(
    () =>
      bangunDataJadwalPengawas({
        jenisUjian,
        tahunAjaran,
        daftarJadwal,
        daftarRuangan,
        daftarGuru,
        rekapPerJadwal,
        grades,
      }),
    [jenisUjian, tahunAjaran, daftarJadwal, daftarRuangan, daftarGuru, rekapPerJadwal, grades]
  );

  const jalankanExport = async (jenis) => {
    setSedangExport(jenis);
    try {
      if (jenis === "excel") await exportJadwalPengawasExcel(data);
      else await exportJadwalPengawasPdf(data);
      showToast?.(`Jadwal Pengawas berhasil diexport ke ${jenis === "excel" ? "Excel" : "PDF"}.`, "success");
    } catch (err) {
      console.error(err);
      showToast?.("Gagal export: " + err.message, "error");
    } finally {
      setSedangExport(null);
    }
  };

  if (daftarJadwal.length === 0) {
    return (
      <p className="text-xs text-gray-400 italic">
        Belum ada jadwal sesi. Tambahkan dulu di tab "Jadwal Sesi".
      </p>
    );
  }

  if (loading) {
    return (
      <p className="text-xs text-gray-400 flex items-center gap-1.5">
        <Loader2 size={14} className="animate-spin" /> Memuat jadwal pengawas...
      </p>
    );
  }

  if (data.nomorRuangan.length === 0) {
    return (
      <p className="text-xs text-gray-400 italic">
        Belum ada data ruangan untuk ujian ini. Proses dulu Pembagian Ruangan.
      </p>
    );
  }

  const tombol =
    "flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{data.judul[2]}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{data.judul[1]}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => jalankanExport("excel")}
            disabled={sedangExport !== null}
            className={`${tombol} bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white`}
          >
            {sedangExport === "excel" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <FileSpreadsheet size={14} />
            )}
            Export Excel
          </button>
          <button
            onClick={() => jalankanExport("pdf")}
            disabled={sedangExport !== null}
            className={`${tombol} bg-red-600 hover:bg-red-700 border-red-600 text-white`}
          >
            {sedangExport === "pdf" ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            Export PDF
          </button>
        </div>
      </div>

      {/* Tabel jadwal -- 22 kolom, jadi scroll horizontal di dalam wadahnya sendiri */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 mb-6">
        <table className="min-w-full text-xs text-gray-800 dark:text-gray-100">
          <thead className="bg-gray-100 dark:bg-gray-800">
            <tr>
              <th className="px-2 py-2 border border-gray-200 dark:border-gray-700 text-left">Hari/Tanggal</th>
              <th className="px-2 py-2 border border-gray-200 dark:border-gray-700">Waktu</th>
              <th className="px-2 py-2 border border-gray-200 dark:border-gray-700 whitespace-nowrap">Jam ke</th>
              <th className="px-2 py-2 border border-gray-200 dark:border-gray-700 text-left">Mata Pelajaran</th>
              {data.nomorRuangan.map((n) => (
                <th key={n} className="px-2 py-2 border border-gray-200 dark:border-gray-700 whitespace-nowrap">
                  R. {n}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.baris.map((b, i) => (
              <tr key={i}>
                {b.spanHari > 0 && (
                  <td
                    rowSpan={b.spanHari}
                    className="px-2 py-2 border border-gray-200 dark:border-gray-700 whitespace-nowrap align-middle"
                  >
                    {b.tanggalLabel}
                  </td>
                )}
                <td className="px-2 py-2 border border-gray-200 dark:border-gray-700 text-center whitespace-nowrap">
                  {b.waktu}
                </td>
                <td className="px-2 py-2 border border-gray-200 dark:border-gray-700 text-center">{b.jamKe}</td>
                <td className="px-2 py-2 border border-gray-200 dark:border-gray-700 min-w-[10rem]">{b.mapel}</td>
                {b.kodePerRuangan.map((kode, j) => (
                  <td
                    key={j}
                    className={`px-2 py-2 border border-gray-200 dark:border-gray-700 text-center ${
                      kode.includes("?") ? "text-red-600 font-semibold" : ""
                    }`}
                  >
                    {kode}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">Daftar Kode Pengawas</p>
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 max-w-md">
        <table className="min-w-full text-xs text-gray-800 dark:text-gray-100">
          <thead className="bg-gray-100 dark:bg-gray-800">
            <tr>
              <th className="px-3 py-2 border border-gray-200 dark:border-gray-700 w-12">No</th>
              <th className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-left">Nama Pengawas</th>
              <th className="px-3 py-2 border border-gray-200 dark:border-gray-700 w-16">Kode</th>
            </tr>
          </thead>
          <tbody>
            {data.daftarKode.map((k) => (
              <tr key={k.no}>
                <td className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-center">{k.no}</td>
                <td className="px-3 py-1.5 border border-gray-200 dark:border-gray-700">{k.nama}</td>
                <td className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-center">{k.kode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.baris.some((b) => b.kodePerRuangan.some((k) => k.includes("?"))) && (
        <p className="mt-3 text-xs text-red-600 dark:text-red-400">
          Tanda "?" berarti guru itu masih ditugaskan di sesi tersebut tapi kodenya sudah dihapus dari Daftar
          Pengawas. Isi lagi kodenya di tab "Daftar Pengawas" atau ganti gurunya di "Kelola Jadwal Pengawas".
        </p>
      )}
    </div>
  );
};

export default JadwalPengawasLihatView;
