// 📁 KatrolTable.js - VERSI IMPROVED (tapi tetap lengkap)
import React, { useState } from "react";

const KatrolTable = ({
  hasilKatrol = [],
  kkm = 75,
  showComparison = true,
  isDarkMode = false,
}) => {
  const [viewMode, setViewMode] = useState("all"); // "all", "changed", "summary"

  // Filter hanya siswa yang nilainya berubah
  const siswaBerubah = hasilKatrol.filter(
    (siswa) => siswa.nilai_akhir !== siswa.nilai_akhir_k
  );

  // Format nilai
  const formatNilai = (nilai) => {
    if (nilai === null || nilai === undefined) return "-";
    return parseFloat(nilai).toFixed(2);
  };

  // Render table lengkap
  const renderFullTable = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className={`${isDarkMode ? "bg-gray-800" : "bg-blue-50"}`}>
            <th className="p-3 text-left">No</th>
            <th className="p-3 text-left">NIS</th>
            <th className="p-3 text-left">Nama Siswa</th>

            {/* Nilai Asli */}
            <th colSpan="6" className="p-3 text-center border-x">
              <div
                className={`font-semibold ${
                  isDarkMode ? "text-blue-400" : "text-blue-700"
                }`}>
                Nilai Asli
              </div>
            </th>

            {/* Nilai Katrol */}
            <th colSpan="6" className="p-3 text-center">
              <div
                className={`font-semibold ${
                  isDarkMode ? "text-green-400" : "text-green-700"
                }`}>
                Nilai Katrol
              </div>
            </th>

            {/* Nilai Akhir */}
            <th colSpan="4" className="p-3 text-center border-x">
              <div
                className={`font-semibold ${
                  isDarkMode ? "text-purple-400" : "text-purple-700"
                }`}>
                Nilai Akhir
              </div>
            </th>

            {showComparison && <th className="p-3 text-left">Status</th>}
          </tr>

          {/* Sub Header */}
          <tr className={`${isDarkMode ? "bg-gray-800" : "bg-blue-50/50"}`}>
            <th className="p-2"></th>
            <th className="p-2"></th>
            <th className="p-2"></th>

            {/* Sub Nilai Asli */}
            {["NH1", "NH2", "NH3", "Rata NH", "PSTS", "PSAS"].map((label) => (
              <th
                key={label}
                className={`p-2 text-xs text-center ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}>
                {label}
              </th>
            ))}

            {/* Sub Nilai Katrol */}
            {["NH1", "NH2", "NH3", "Rata NH", "PSTS", "PSAS"].map((label) => (
              <th
                key={`k-${label}`}
                className={`p-2 text-xs text-center ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}>
                {label}
              </th>
            ))}

            {/* Sub Nilai Akhir */}
            <th className="p-2 text-xs text-center">Asli</th>
            <th className="p-2 text-xs text-center">Katrol</th>
            <th className="p-2 text-xs text-center">Selisih</th>
            <th className="p-2 text-xs text-center">%</th>

            {showComparison && <th className="p-2"></th>}
          </tr>
        </thead>

        <tbody>
          {hasilKatrol.map((siswa, index) => {
            const selisih = siswa.nilai_akhir_k - siswa.nilai_akhir;
            const persentase = (selisih / siswa.nilai_akhir) * 100;
            const isLulusAsli = siswa.nilai_akhir >= kkm;
            const isLulusKatrol = siswa.nilai_akhir_k >= kkm;

            return (
              <tr
                key={siswa.student_id}
                className={`border-b ${
                  isDarkMode ? "border-gray-700" : "border-gray-200"
                }`}>
                <td className="p-3">{index + 1}</td>
                <td className="p-3 font-mono">{siswa.nis}</td>
                <td className="p-3 font-medium">{siswa.nama_siswa}</td>

                {/* Nilai Asli */}
                <td className="p-3 text-center">{formatNilai(siswa.nh1)}</td>
                <td className="p-3 text-center">{formatNilai(siswa.nh2)}</td>
                <td className="p-3 text-center">{formatNilai(siswa.nh3)}</td>
                <td className="p-3 text-center font-bold">
                  {formatNilai(siswa.rata_nh)}
                </td>
                <td className="p-3 text-center">{formatNilai(siswa.psts)}</td>
                <td className="p-3 text-center border-r">
                  {formatNilai(siswa.psas)}
                </td>

                {/* Nilai Katrol */}
                <td className="p-3 text-center">
                  <span
                    className={
                      siswa.nh1 !== siswa.nh1_k
                        ? "text-green-600 font-bold"
                        : ""
                    }>
                    {formatNilai(siswa.nh1_k)}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <span
                    className={
                      siswa.nh2 !== siswa.nh2_k
                        ? "text-green-600 font-bold"
                        : ""
                    }>
                    {formatNilai(siswa.nh2_k)}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <span
                    className={
                      siswa.nh3 !== siswa.nh3_k
                        ? "text-green-600 font-bold"
                        : ""
                    }>
                    {formatNilai(siswa.nh3_k)}
                  </span>
                </td>
                <td className="p-3 text-center font-bold">
                  <span
                    className={
                      siswa.rata_nh !== siswa.rata_nh_k ? "text-green-600" : ""
                    }>
                    {formatNilai(siswa.rata_nh_k)}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <span
                    className={
                      siswa.psts !== siswa.psts_k ? "text-green-600" : ""
                    }>
                    {formatNilai(siswa.psts_k)}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <span
                    className={
                      siswa.psas !== siswa.psas_k ? "text-green-600" : ""
                    }>
                    {formatNilai(siswa.psas_k)}
                  </span>
                </td>

                {/* Nilai Akhir */}
                <td
                  className={`p-3 text-center font-bold ${
                    isLulusAsli ? "text-blue-600" : "text-red-600"
                  }`}>
                  {formatNilai(siswa.nilai_akhir)}
                </td>
                <td
                  className={`p-3 text-center font-bold ${
                    isLulusKatrol ? "text-green-600" : "text-red-600"
                  }`}>
                  {formatNilai(siswa.nilai_akhir_k)}
                </td>
                <td
                  className={`p-3 text-center ${
                    selisih >= 0 ? "text-green-600" : "text-red-600"
                  }`}>
                  {selisih >= 0 ? "+" : ""}
                  {formatNilai(selisih)}
                </td>
                <td
                  className={`p-3 text-center ${
                    persentase >= 0 ? "text-green-600" : "text-red-600"
                  }`}>
                  {persentase >= 0 ? "+" : ""}
                  {persentase.toFixed(1)}%
                </td>

                {/* Status */}
                {showComparison && (
                  <td className="p-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs ${
                        !isLulusAsli && isLulusKatrol
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          : isLulusAsli && isLulusKatrol
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                      }`}>
                      {!isLulusAsli && isLulusKatrol
                        ? "Naik Status"
                        : isLulusAsli && isLulusKatrol
                        ? "Tetap Lulus"
                        : "Tetap Gagal"}
                    </span>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // Render view selector
  const renderViewSelector = () => (
    <div className="flex gap-2 mb-4">
      <button
        onClick={() => setViewMode("all")}
        className={`px-4 py-2 rounded-lg ${
          viewMode === "all"
            ? "bg-blue-600 text-white"
            : "bg-gray-200 text-gray-700"
        }`}>
        Semua Siswa ({hasilKatrol.length})
      </button>
      <button
        onClick={() => setViewMode("changed")}
        className={`px-4 py-2 rounded-lg ${
          viewMode === "changed"
            ? "bg-green-600 text-white"
            : "bg-gray-200 text-gray-700"
        }`}>
        Yang Berubah ({siswaBerubah.length})
      </button>
    </div>
  );

  return (
    <div>
      {renderViewSelector()}

      {viewMode === "all" && renderFullTable()}

      {viewMode === "changed" && siswaBerubah.length > 0 && (
        <div>
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-sm">
              <strong>Catatan:</strong> Menampilkan {siswaBerubah.length} siswa
              yang nilainya berubah setelah katrol.
            </p>
          </div>
          {renderFullTable()}
        </div>
      )}

      {viewMode === "changed" && siswaBerubah.length === 0 && (
        <div className="text-center p-8 text-gray-500">
          Tidak ada siswa yang nilainya berubah setelah katrol.
        </div>
      )}
    </div>
  );
};

export default KatrolTable;
