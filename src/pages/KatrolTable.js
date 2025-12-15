// 📊 KatrolTable.js - Component tabel hasil katrol (SIMPLE & CLEAN)
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

  // Cell component dengan styling sederhana
  const NilaiCell = ({ nilaiAsli, nilaiKatrol }) => {
    const naik = isKatrolled(nilaiAsli, nilaiKatrol);
    const selisih = hitungSelisih(nilaiAsli, nilaiKatrol);

    return (
      <div className="flex flex-col items-center justify-center gap-1 min-h-[3rem]">
        {/* Nilai Asli → Katrol */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[1.5rem]">
            {formatNilai(nilaiAsli)}
          </span>

          {naik && (
            <span className="text-green-600 dark:text-green-400 text-xs">
              →
            </span>
          )}

          <span
            className={`text-sm font-semibold min-w-[1.5rem] ${
              naik
                ? "text-green-600 dark:text-green-400"
                : "text-gray-900 dark:text-gray-100"
            }`}>
            {formatNilai(nilaiKatrol)}
          </span>
        </div>

        {/* Selisih (hanya kalau naik) */}
        {naik && (
          <span className="text-xs text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded">
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
          className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium ${
            lulus
              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
              : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
          }`}>
          {lulus ? "✓ Tuntas" : "✗ Belum"}
        </span>
      </div>
    );
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        {/* HEADER */}
        <thead className={`${isDarkMode ? "bg-gray-700" : "bg-gray-50"}`}>
          <tr>
            <th className="px-4 py-3.5 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              No
            </th>
            <th className="px-4 py-3.5 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              NIS
            </th>
            <th className="px-4 py-3.5 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Nama Siswa
            </th>
            <th className="px-4 py-3.5 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              NH1
            </th>
            <th className="px-4 py-3.5 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              NH2
            </th>
            <th className="px-4 py-3.5 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              NH3
            </th>
            <th className="px-4 py-3.5 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Rata NH
            </th>
            <th className="px-4 py-3.5 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              PSTS
            </th>
            <th className="px-4 py-3.5 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              PSAS
            </th>
            <th className="px-4 py-3.5 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Nilai Akhir
            </th>
            <th className="px-4 py-3.5 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>

        {/* BODY */}
        <tbody
          className={`${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } divide-y divide-gray-200 dark:divide-gray-700`}>
          {hasilKatrol.map((item, index) => (
            <tr
              key={item.student_id}
              className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150">
              {/* No */}
              <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100 font-medium">
                {index + 1}
              </td>

              {/* NIS */}
              <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                {item.nis}
              </td>

              {/* Nama */}
              <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                {item.nama_siswa}
              </td>

              {/* NH1 */}
              <td className="px-4 py-4">
                <NilaiCell nilaiAsli={item.nh1} nilaiKatrol={item.nh1_k} />
              </td>

              {/* NH2 */}
              <td className="px-4 py-4">
                <NilaiCell nilaiAsli={item.nh2} nilaiKatrol={item.nh2_k} />
              </td>

              {/* NH3 */}
              <td className="px-4 py-4">
                <NilaiCell nilaiAsli={item.nh3} nilaiKatrol={item.nh3_k} />
              </td>

              {/* Rata NH */}
              <td className="px-4 py-4">
                <NilaiCell
                  nilaiAsli={item.rata_nh}
                  nilaiKatrol={item.rata_nh_k}
                />
              </td>

              {/* PSTS */}
              <td className="px-4 py-4">
                <NilaiCell nilaiAsli={item.psts} nilaiKatrol={item.psts_k} />
              </td>

              {/* PSAS */}
              <td className="px-4 py-4">
                <NilaiCell nilaiAsli={item.psas} nilaiKatrol={item.psas_k} />
              </td>

              {/* Nilai Akhir */}
              <td className="px-4 py-4">
                <NilaiCell
                  nilaiAsli={item.nilai_akhir}
                  nilaiKatrol={item.nilai_akhir_k}
                />
              </td>

              {/* Status */}
              <td className="px-4 py-4">
                <StatusBadge nilaiAkhir={item.nilai_akhir_k} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default KatrolTable;
