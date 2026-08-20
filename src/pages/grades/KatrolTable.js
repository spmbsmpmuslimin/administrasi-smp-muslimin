// 📊 KatrolTable.js - Component tabel hasil katrol (REVISED: SIMPLE VERSION)
import React from "react";

const KatrolTable = ({
  hasilKatrol,
  kkm,
  nilaiMaksimal,
  academicYear,
  semester,
  subject,
  className,
  showComparison = true,
  isDarkMode = false,
}) => {
  // Format nilai untuk display (pembulatan ke integer)
  const formatNilai = (nilai) => {
    if (nilai === null || nilai === undefined) return "-";
    return typeof nilai === "number" ? Math.round(nilai) : nilai;
  };

  // Format nilai dengan 2 desimal (untuk nilai akhir)
  const formatNilaiDetail = (nilai) => {
    if (nilai === null || nilai === undefined) return "-";
    return typeof nilai === "number" ? nilai.toFixed(2) : nilai;
  };

  // Status badge sederhana
  const StatusBadge = ({ nilaiAkhir }) => {
    const tuntas = nilaiAkhir >= kkm;
    return (
      <div className="flex justify-center">
        <span
          className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold ${
            tuntas
              ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700"
              : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700"
          }`}
        >
          {tuntas ? "Tuntas" : "Belum"}
        </span>
      </div>
    );
  };

  // Hitung statistik kelas
  const calculateStatistics = () => {
    const totalSiswa = hasilKatrol.length;
    const tuntasCount = hasilKatrol.filter((h) => h.nilai_akhir_k >= kkm).length;
    const belumTuntasCount = totalSiswa - tuntasCount;
    const naikStatusCount = hasilKatrol.filter(
      (h) => h.nilai_akhir < kkm && h.nilai_akhir_k >= kkm
    ).length;

    return {
      totalSiswa,
      tuntasCount,
      belumTuntasCount,
      naikStatusCount,
      persenTuntas: totalSiswa > 0 ? Math.round((tuntasCount / totalSiswa) * 100) : 0,
    };
  };

  const stats = calculateStatistics();

  return (
    <div className="w-full">
      {/* Wrapper dengan shadow dan rounded */}
      <div className="rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden bg-white dark:bg-gray-800">
        {/* Scrollable container untuk mobile */}
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-blue-500 dark:scrollbar-thumb-blue-600 scrollbar-track-gray-200 dark:scrollbar-track-gray-700">
          <table className="min-w-full divide-y-2 divide-gray-200 dark:divide-gray-700">
            {/* HEADER - SIMPLE */}
            <thead className="bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-800 dark:to-blue-900">
              <tr>
                {/* Kolom No */}
                <th className="sticky left-0 z-20 px-4 py-3 text-left text-xs font-bold text-white uppercase bg-blue-600 dark:bg-blue-900 border-r-2 border-blue-500 dark:border-blue-700 w-[50px] sm:w-[60px]">
                  No
                </th>

                {/* Kolom NIS */}
                <th className="sticky left-[50px] sm:left-[60px] z-20 px-4 py-3 text-left text-xs font-bold text-white uppercase bg-blue-600 dark:bg-blue-900 border-r-2 border-blue-500 dark:border-blue-700 w-[100px] sm:w-[120px]">
                  NIS
                </th>

                {/* Kolom Nama Siswa */}
                <th className="sticky left-[150px] sm:left-[180px] z-20 px-4 py-3 text-left text-xs font-bold text-white uppercase bg-blue-600 dark:bg-blue-900 border-r-2 border-blue-500 dark:border-blue-700 w-[180px] sm:w-[220px]">
                  Nama
                </th>

                {/* NILAI ASLI */}
                <th className="px-3 py-3 text-center text-xs font-bold text-white uppercase min-w-[50px]">
                  NH1
                </th>
                <th className="px-3 py-3 text-center text-xs font-bold text-white uppercase min-w-[50px]">
                  NH2
                </th>
                <th className="px-3 py-3 text-center text-xs font-bold text-white uppercase min-w-[50px]">
                  NH3
                </th>
                <th className="px-3 py-3 text-center text-xs font-bold text-white uppercase min-w-[60px]">
                  Rata NH
                </th>
                <th className="px-3 py-3 text-center text-xs font-bold text-white uppercase min-w-[50px]">
                  PSTS
                </th>
                <th className="px-3 py-3 text-center text-xs font-bold text-white uppercase min-w-[50px]">
                  PSAS
                </th>
                <th className="px-3 py-3 text-center text-xs font-bold text-white uppercase min-w-[70px]">
                  Nilai Akhir
                </th>

                {/* NILAI AKHIR KATROL - WARNING: HAPUS bg-green-700 */}
                <th className="px-3 py-3 text-center text-xs font-bold text-white uppercase min-w-[80px]">
                  Hasil Katrol
                </th>

                {/* STATUS */}
                <th className="px-3 py-3 text-center text-xs font-bold text-white uppercase min-w-[80px]">
                  Status
                </th>
              </tr>
            </thead>

            {/* BODY - SIMPLE */}
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {hasilKatrol.map((item, index) => {
                const naik = item.nilai_akhir_k > item.nilai_akhir;
                const selisih = naik ? item.nilai_akhir_k - item.nilai_akhir : 0;

                return (
                  <tr key={item.student_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    {/* No - Sticky */}
                    <td className="sticky left-0 z-10 px-4 py-3 text-sm font-semibold text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 w-[50px] sm:w-[60px]">
                      {index + 1}
                    </td>

                    {/* NIS - Sticky */}
                    <td className="sticky left-[50px] sm:left-[60px] z-10 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 w-[100px] sm:w-[120px]">
                      {item.nis}
                    </td>

                    {/* Nama - Sticky */}
                    <td className="sticky left-[150px] sm:left-[180px] z-10 px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 w-[180px] sm:w-[220px]">
                      {item.nama_siswa}
                    </td>

                    {/* NILAI ASLI */}
                    <td className="px-3 py-3 text-center">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatNilai(item.nh1)}
                      </div>
                    </td>

                    <td className="px-3 py-3 text-center">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatNilai(item.nh2)}
                      </div>
                    </td>

                    <td className="px-3 py-3 text-center">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatNilai(item.nh3)}
                      </div>
                    </td>

                    <td className="px-3 py-3 text-center">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatNilai(item.rata_nh)}
                      </div>
                    </td>

                    <td className="px-3 py-3 text-center">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatNilai(item.psts)}
                      </div>
                    </td>

                    <td className="px-3 py-3 text-center">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatNilai(item.psas)}
                      </div>
                    </td>

                    {/* Nilai Akhir Asli */}
                    <td className="px-3 py-3 text-center">
                      <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {formatNilai(item.nilai_akhir)}
                      </div>
                    </td>

                    {/* NILAI AKHIR KATROL */}
                    <td className="px-3 py-3 text-center bg-green-50 dark:bg-green-900/20 border-x border-green-200 dark:border-green-800">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {formatNilai(item.nilai_akhir_k)}
                        </span>
                        {naik && (
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                            +{Math.round(selisih)}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3 text-center">
                      <StatusBadge nilaiAkhir={item.nilai_akhir_k} />
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* FOOTER - Statistik */}
            <tfoot className="bg-gray-100 dark:bg-gray-900">
              <tr>
                <td
                  colSpan="3"
                  className="sticky left-0 px-4 py-3 text-sm font-bold text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-900 border-r border-gray-300 dark:border-gray-700"
                >
                  Ringkasan
                </td>
                <td colSpan="6" className="px-4 py-3">
                  <div className="flex flex-wrap justify-center gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-bold text-gray-900 dark:text-gray-100">
                        {stats.totalSiswa}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-green-600 dark:text-green-400">
                        {stats.tuntasCount}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Tuntas</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-red-600 dark:text-red-400">
                        {stats.belumTuntasCount}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Belum</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-blue-600 dark:text-blue-400">
                        {stats.naikStatusCount}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Naik Status</div>
                    </div>
                  </div>
                </td>
                <td colSpan="3" className="px-4 py-3 text-sm text-center">
                  <div className="text-gray-700 dark:text-gray-300">
                    KKM: <strong>{kkm}</strong> | Maks: <strong>{nilaiMaksimal}</strong>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Info untuk mobile - Scroll hint */}
      <div className="mt-3 text-center lg:hidden">
        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium bg-gray-100 dark:bg-gray-800 py-2 px-4 rounded-lg border border-gray-300 dark:border-gray-700">
          ← Geser tabel ke kiri/kanan untuk lihat semua kolom →
        </p>
      </div>
    </div>
  );
};

export default KatrolTable;
