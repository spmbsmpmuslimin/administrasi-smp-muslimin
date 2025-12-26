// 📊 KatrolTable.js - Component tabel hasil katrol (FIXED DARK MODE + FIREFOX)
import React from "react";

const KatrolTable = ({
  hasilKatrol,
  kkm,
  showComparison = true,
  isDarkMode = false,
}) => {
  // Format nilai untuk display (pembulatan ke integer)
  const formatNilai = (nilai) => {
    if (nilai === null || nilai === undefined) return "-";
    return typeof nilai === "number" ? Math.round(nilai) : nilai;
  };

  // Cek apakah nilai dikatrol (naik)
  const isKatrolled = (nilaiAsli, nilaiKatrol) => {
    if (nilaiAsli === null || nilaiKatrol === null) return false;
    return nilaiKatrol > nilaiAsli;
  };

  // Hitung selisih nilai
  const hitungSelisih = (nilaiAsli, nilaiKatrol) => {
    if (nilaiAsli === null || nilaiKatrol === null) return 0;
    return nilaiKatrol - nilaiAsli;
  };

  // Cell component dengan styling sederhana - REVISI
  const NilaiCell = ({ nilaiAsli, nilaiKatrol }) => {
    const naik = isKatrolled(nilaiAsli, nilaiKatrol);
    const selisih = hitungSelisih(nilaiAsli, nilaiKatrol);

    return (
      <div className="flex flex-col items-center justify-center gap-1 min-h-[3rem] py-1">
        {/* Nilai Asli → Katrol */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2">
          {/* NILAI ASLI - REVISI: HITAM BOLD */}
          <span className="text-xs sm:text-sm font-bold text-black dark:text-white min-w-[1.5rem]">
            {formatNilai(nilaiAsli)}
          </span>

          {naik && (
            <span className="text-blue-500 dark:text-blue-400 text-xs font-bold">
              →
            </span>
          )}

          {/* NILAI KATROL */}
          <span
            className={`text-xs sm:text-sm font-bold min-w-[1.5rem] ${
              naik
                ? "text-blue-700 dark:text-blue-400"
                : "text-black dark:text-white"
            }`}>
            {formatNilai(nilaiKatrol)}
          </span>
        </div>

        {/* Selisih (hanya kalau naik) */}
        {naik && (
          <span className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-300 font-bold bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">
            +{Math.round(selisih)}
          </span>
        )}
      </div>
    );
  };

  // Status badge sederhana
  const StatusBadge = ({ nilaiAkhir }) => {
    const lulus = nilaiAkhir >= kkm;
    return (
      <div className="flex justify-center">
        <span
          className={`inline-flex items-center px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold ${
            lulus
              ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
              : "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700"
          }`}>
          {lulus ? "✓ Tuntas" : "✗ Belum"}
        </span>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Wrapper dengan shadow dan rounded */}
      <div className="rounded-xl border-2 border-blue-300 dark:border-blue-800 shadow-lg overflow-hidden bg-white dark:bg-gray-800">
        {/* Scrollable container untuk mobile */}
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-blue-500 dark:scrollbar-thumb-blue-600 scrollbar-track-gray-200 dark:scrollbar-track-gray-700">
          <table className="min-w-full divide-y-2 divide-blue-300 dark:divide-blue-800">
            {/* HEADER */}
            <thead className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 dark:from-blue-800 dark:via-blue-900 dark:to-gray-900">
              <tr>
                {/* Kolom No */}
                <th className="sticky left-0 z-20 px-3 sm:px-4 py-3.5 sm:py-4 text-left text-[10px] sm:text-xs font-extrabold text-white uppercase tracking-wide bg-blue-600 dark:bg-blue-900 border-r-2 border-blue-500 dark:border-blue-700 shadow-lg w-[50px] sm:w-[60px]">
                  No
                </th>

                {/* Kolom NIS - REVISI: PERBAIKI LEBAR */}
                <th className="sticky left-[50px] sm:left-[60px] z-20 px-3 sm:px-4 py-3.5 sm:py-4 text-left text-[10px] sm:text-xs font-extrabold text-white uppercase tracking-wide bg-blue-600 dark:bg-blue-900 border-r-2 border-blue-500 dark:border-blue-700 shadow-lg w-[100px] sm:w-[120px]">
                  NIS
                </th>

                {/* Kolom Nama Siswa - REVISI: PERBAIKI LEBAR */}
                <th className="sticky left-[150px] sm:left-[180px] z-20 px-3 sm:px-4 py-3.5 sm:py-4 text-left text-[10px] sm:text-xs font-extrabold text-white uppercase tracking-wide bg-blue-700 dark:bg-blue-900 border-r-4 border-blue-400 dark:border-blue-600 shadow-xl w-[180px] sm:w-[220px]">
                  Nama Siswa
                </th>

                <th className="px-2 sm:px-3 py-3.5 sm:py-4 text-center text-[10px] sm:text-xs font-extrabold text-white uppercase tracking-wide min-w-[70px] sm:min-w-[85px]">
                  NH1
                </th>
                <th className="px-2 sm:px-3 py-3.5 sm:py-4 text-center text-[10px] sm:text-xs font-extrabold text-white uppercase tracking-wide min-w-[70px] sm:min-w-[85px]">
                  NH2
                </th>
                <th className="px-2 sm:px-3 py-3.5 sm:py-4 text-center text-[10px] sm:text-xs font-extrabold text-white uppercase tracking-wide min-w-[70px] sm:min-w-[85px]">
                  NH3
                </th>
                <th className="px-2 sm:px-3 py-3.5 sm:py-4 text-center text-[10px] sm:text-xs font-extrabold text-white uppercase tracking-wide min-w-[75px] sm:min-w-[90px]">
                  Rata NH
                </th>
                <th className="px-2 sm:px-3 py-3.5 sm:py-4 text-center text-[10px] sm:text-xs font-extrabold text-white uppercase tracking-wide min-w-[70px] sm:min-w-[85px]">
                  PSTS
                </th>
                <th className="px-2 sm:px-3 py-3.5 sm:py-4 text-center text-[10px] sm:text-xs font-extrabold text-white uppercase tracking-wide min-w-[70px] sm:min-w-[85px]">
                  PSAS
                </th>
                <th className="px-2 sm:px-3 py-3.5 sm:py-4 text-center text-[10px] sm:text-xs font-extrabold text-white uppercase tracking-wide min-w-[85px] sm:min-w-[100px]">
                  Nilai Akhir
                </th>
                <th className="px-3 sm:px-4 py-3.5 sm:py-4 text-center text-[10px] sm:text-xs font-extrabold text-white uppercase tracking-wide min-w-[100px] sm:min-w-[110px]">
                  Status
                </th>
              </tr>
            </thead>

            {/* BODY - REVISI: HAPUS HOVER */}
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-blue-200 dark:divide-gray-700">
              {hasilKatrol.map((item, index) => (
                <tr
                  key={item.student_id}
                  className="border-b border-gray-200 dark:border-gray-700">
                  {/* No - Sticky */}
                  <td className="sticky left-0 z-10 px-3 sm:px-4 py-3.5 sm:py-4 text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 border-r border-blue-200 dark:border-gray-700 w-[50px] sm:w-[60px]">
                    {index + 1}
                  </td>

                  {/* NIS - Sticky - REVISI: PERBAIKI POSISI */}
                  <td className="sticky left-[50px] sm:left-[60px] z-10 px-3 sm:px-4 py-3.5 sm:py-4 text-xs sm:text-sm font-bold text-blue-700 dark:text-blue-400 bg-white dark:bg-gray-800 border-r border-blue-200 dark:border-gray-700 w-[100px] sm:w-[120px]">
                    {item.nis}
                  </td>

                  {/* Nama - Sticky - REVISI: PERBAIKI POSISI */}
                  <td className="sticky left-[150px] sm:left-[180px] z-10 px-3 sm:px-4 py-3.5 sm:py-4 text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 border-r-2 border-blue-300 dark:border-gray-600 w-[180px] sm:w-[220px]">
                    {item.nama_siswa}
                  </td>

                  {/* NH1 */}
                  <td className="px-2 sm:px-3 py-3.5 sm:py-4">
                    <NilaiCell nilaiAsli={item.nh1} nilaiKatrol={item.nh1_k} />
                  </td>

                  {/* NH2 */}
                  <td className="px-2 sm:px-3 py-3.5 sm:py-4">
                    <NilaiCell nilaiAsli={item.nh2} nilaiKatrol={item.nh2_k} />
                  </td>

                  {/* NH3 */}
                  <td className="px-2 sm:px-3 py-3.5 sm:py-4">
                    <NilaiCell nilaiAsli={item.nh3} nilaiKatrol={item.nh3_k} />
                  </td>

                  {/* Rata NH - REVISI: HAPUS BG */}
                  <td className="px-2 sm:px-3 py-3.5 sm:py-4">
                    <NilaiCell
                      nilaiAsli={item.rata_nh}
                      nilaiKatrol={item.rata_nh_k}
                    />
                  </td>

                  {/* PSTS */}
                  <td className="px-2 sm:px-3 py-3.5 sm:py-4">
                    <NilaiCell
                      nilaiAsli={item.psts}
                      nilaiKatrol={item.psts_k}
                    />
                  </td>

                  {/* PSAS */}
                  <td className="px-2 sm:px-3 py-3.5 sm:py-4">
                    <NilaiCell
                      nilaiAsli={item.psas}
                      nilaiKatrol={item.psas_k}
                    />
                  </td>

                  {/* Nilai Akhir - REVISI: HAPUS BG */}
                  <td className="px-2 sm:px-3 py-3.5 sm:py-4">
                    <NilaiCell
                      nilaiAsli={item.nilai_akhir}
                      nilaiKatrol={item.nilai_akhir_k}
                    />
                  </td>

                  {/* Status */}
                  <td className="px-3 sm:px-4 py-3.5 sm:py-4">
                    <StatusBadge nilaiAkhir={item.nilai_akhir_k} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info untuk mobile - Scroll hint */}
      <div className="mt-3 text-center lg:hidden">
        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium bg-blue-50 dark:bg-blue-950/20 py-2 px-4 rounded-lg border border-blue-200 dark:border-blue-800">
          ← Geser tabel ke kiri/kanan untuk lihat semua kolom →
        </p>
      </div>
    </div>
  );
};

export default KatrolTable;
