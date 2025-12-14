// file name: KatrolTable.js
import React, { useState } from "react";

const KatrolTable = ({
  hasilKatrol = [],
  kkm = 75,
  nilaiMaksimal = 100,
  academicYear = "",
  semester = "1",
  subject = "",
  className = "",
  showComparison = true,
  isDarkMode = false,
}) => {
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "ascending",
  });

  // Fungsi untuk sort tabel
  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  // Sorted data
  const sortedData = React.useMemo(() => {
    if (!sortConfig.key) return hasilKatrol;

    return [...hasilKatrol].sort((a, b) => {
      if (sortConfig.key === "nama") {
        // FIX: Ganti student_name dengan nama_siswa
        const aVal = a.nama_siswa || "";
        const bVal = b.nama_siswa || "";
        if (sortConfig.direction === "ascending") {
          return aVal.localeCompare(bVal);
        }
        return bVal.localeCompare(aVal);
      }

      // Sorting untuk nilai
      const aVal = a[sortConfig.key] || 0;
      const bVal = b[sortConfig.key] || 0;

      if (sortConfig.direction === "ascending") {
        return aVal - bVal;
      }
      return bVal - aVal;
    });
  }, [hasilKatrol, sortConfig]);

  // Format nilai dengan 2 desimal
  const formatNilai = (nilai) => {
    if (nilai === null || nilai === undefined) return "-";
    return parseFloat(nilai).toFixed(2);
  };

  // Warna untuk nilai di bawah KKM
  const getScoreColor = (score, isKatrol = false) => {
    if (score === null || score === undefined) return "";

    const nilai = parseFloat(score);
    if (isKatrol) {
      return nilai >= kkm
        ? "text-green-600 dark:text-green-400"
        : "text-red-500 dark:text-red-400";
    }
    return nilai >= kkm
      ? "text-blue-600 dark:text-blue-400"
      : "text-yellow-600 dark:text-yellow-400";
  };

  // Get sort icon
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return "↕️";
    return sortConfig.direction === "ascending" ? "↑" : "↓";
  };

  // Render header dengan sort
  const renderSortableHeader = (label, key) => (
    <th
      className={`cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors p-3 text-left ${
        isDarkMode ? "text-gray-300" : "text-gray-700"
      }`}
      onClick={() => requestSort(key)}>
      <div className="flex items-center justify-between">
        <span>{label}</span>
        <span className="text-xs ml-2">{getSortIcon(key)}</span>
      </div>
    </th>
  );

  // Hitung statistik
  const calculateStats = () => {
    if (hasilKatrol.length === 0) return null;

    const stats = {
      jumlahSiswa: hasilKatrol.length,
      lulusMentah: hasilKatrol.filter(
        (s) => parseFloat(s.nilai_akhir_mentah || 0) >= kkm
      ).length,
      lulusKatrol: hasilKatrol.filter(
        (s) => parseFloat(s.nilai_akhir_katrol || 0) >= kkm
      ).length,
      avgMentah: 0,
      avgKatrol: 0,
      minMentah: Infinity,
      maxMentah: -Infinity,
      minKatrol: Infinity,
      maxKatrol: -Infinity,
    };

    hasilKatrol.forEach((siswa) => {
      const nilaiMentah = parseFloat(siswa.nilai_akhir_mentah || 0);
      const nilaiKatrol = parseFloat(siswa.nilai_akhir_katrol || 0);

      stats.avgMentah += nilaiMentah;
      stats.avgKatrol += nilaiKatrol;
      stats.minMentah = Math.min(stats.minMentah, nilaiMentah);
      stats.maxMentah = Math.max(stats.maxMentah, nilaiMentah);
      stats.minKatrol = Math.min(stats.minKatrol, nilaiKatrol);
      stats.maxKatrol = Math.max(stats.maxKatrol, nilaiKatrol);
    });

    stats.avgMentah /= stats.jumlahSiswa;
    stats.avgKatrol /= stats.jumlahSiswa;

    return stats;
  };

  const stats = calculateStats();

  if (hasilKatrol.length === 0) {
    return (
      <div
        className={`rounded-xl p-8 text-center border ${
          isDarkMode
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-blue-100"
        }`}>
        <div
          className={`text-4xl mb-4 ${
            isDarkMode ? "text-gray-600" : "text-gray-300"
          }`}>
          📊
        </div>
        <h3
          className={`text-lg font-semibold mb-2 ${
            isDarkMode ? "text-gray-300" : "text-gray-700"
          }`}>
          Data Hasil Katrol Belum Tersedia
        </h3>
        <p className={`${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
          Proses katrol terlebih dahulu untuk melihat hasilnya.
        </p>
      </div>
    );
  }

  // Fungsi untuk warna baris saat hover
  const getRowHoverClass = () => {
    return isDarkMode ? "hover:bg-gray-800" : "hover:bg-blue-50";
  };

  return (
    <div className="space-y-6">
      {/* Informasi Header */}
      <div
        className={`rounded-xl p-4 ${
          isDarkMode
            ? "bg-gray-800 border border-gray-700"
            : "bg-blue-50 border border-blue-100"
        }`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p
              className={`text-sm font-medium ${
                isDarkMode ? "text-gray-400" : "text-blue-600"
              }`}>
              Kelas
            </p>
            <p
              className={`font-semibold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}>
              {className || "-"}
            </p>
          </div>
          <div>
            <p
              className={`text-sm font-medium ${
                isDarkMode ? "text-gray-400" : "text-blue-600"
              }`}>
              Mapel
            </p>
            <p
              className={`font-semibold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}>
              {subject || "-"}
            </p>
          </div>
          <div>
            <p
              className={`text-sm font-medium ${
                isDarkMode ? "text-gray-400" : "text-blue-600"
              }`}>
              Tahun Ajaran
            </p>
            <p
              className={`font-semibold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}>
              {academicYear || "-"}
            </p>
          </div>
          <div>
            <p
              className={`text-sm font-medium ${
                isDarkMode ? "text-gray-400" : "text-blue-600"
              }`}>
              Semester
            </p>
            <p
              className={`font-semibold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}>
              {semester === "1" ? "Ganjil" : "Genap"}
            </p>
          </div>
        </div>
      </div>

      {/* Statistik */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            className={`rounded-lg p-4 ${
              isDarkMode
                ? "bg-gray-800 border border-gray-700"
                : "bg-white border border-blue-100"
            }`}>
            <div className="flex items-center justify-between">
              <div>
                <p
                  className={`text-sm font-medium ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}>
                  Total Siswa
                </p>
                <p
                  className={`text-2xl font-bold ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}>
                  {stats.jumlahSiswa}
                </p>
              </div>
              <div className="text-3xl">👥</div>
            </div>
          </div>

          <div
            className={`rounded-lg p-4 ${
              isDarkMode
                ? "bg-gray-800 border border-gray-700"
                : "bg-white border border-blue-100"
            }`}>
            <div className="flex items-center justify-between">
              <div>
                <p
                  className={`text-sm font-medium ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}>
                  Lulus (Mentah)
                </p>
                <p
                  className={`text-2xl font-bold ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}>
                  {stats.lulusMentah}{" "}
                  <span className="text-sm">
                    (
                    {((stats.lulusMentah / stats.jumlahSiswa) * 100).toFixed(1)}
                    %)
                  </span>
                </p>
              </div>
              <div className="text-3xl">📈</div>
            </div>
          </div>

          <div
            className={`rounded-lg p-4 ${
              isDarkMode
                ? "bg-gray-800 border border-gray-700"
                : "bg-white border border-blue-100"
            }`}>
            <div className="flex items-center justify-between">
              <div>
                <p
                  className={`text-sm font-medium ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}>
                  Lulus (Katrol)
                </p>
                <p
                  className={`text-2xl font-bold ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}>
                  {stats.lulusKatrol}{" "}
                  <span className="text-sm">
                    (
                    {((stats.lulusKatrol / stats.jumlahSiswa) * 100).toFixed(1)}
                    %)
                  </span>
                </p>
              </div>
              <div className="text-3xl">🎯</div>
            </div>
          </div>

          <div
            className={`rounded-lg p-4 ${
              isDarkMode
                ? "bg-gray-800 border border-gray-700"
                : "bg-white border border-blue-100"
            }`}>
            <div className="flex items-center justify-between">
              <div>
                <p
                  className={`text-sm font-medium ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}>
                  Kenaikan Rata-rata
                </p>
                <p
                  className={`text-2xl font-bold ${
                    stats.avgKatrol - stats.avgMentah > 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}>
                  +{(stats.avgKatrol - stats.avgMentah).toFixed(2)}
                </p>
              </div>
              <div className="text-3xl">📊</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabel Utama */}
      <div className="overflow-x-auto rounded-xl border shadow-sm">
        <table
          className={`min-w-full divide-y ${
            isDarkMode ? "divide-gray-700" : "divide-gray-200"
          }`}>
          <thead className={isDarkMode ? "bg-gray-800" : "bg-blue-50"}>
            <tr>
              {renderSortableHeader("No", "no")}
              {renderSortableHeader("NIS", "nis")}
              {renderSortableHeader("Nama Siswa", "nama")}

              {/* Nilai Mentah */}
              <th
                colSpan="6"
                className="p-3 text-center border-x border-blue-300 dark:border-gray-600">
                <div
                  className={`font-semibold ${
                    isDarkMode ? "text-blue-400" : "text-blue-700"
                  }`}>
                  Nilai Mentah
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
              <th
                colSpan={showComparison ? 4 : 2}
                className="p-3 text-center border-x border-blue-300 dark:border-gray-600">
                <div
                  className={`font-semibold ${
                    isDarkMode ? "text-purple-400" : "text-purple-700"
                  }`}>
                  Nilai Akhir
                </div>
              </th>

              {/* Status */}
              {showComparison && renderSortableHeader("Status", "status")}
            </tr>

            {/* Sub Header */}
            <tr className={isDarkMode ? "bg-gray-800" : "bg-blue-50/50"}>
              <th className="p-2"></th>
              <th className="p-2"></th>
              <th className="p-2"></th>

              {/* Sub Header Nilai Mentah */}
              <th
                className={`p-2 text-xs font-medium text-center ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}>
                NH1
              </th>
              <th
                className={`p-2 text-xs font-medium text-center ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}>
                NH2
              </th>
              <th
                className={`p-2 text-xs font-medium text-center ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}>
                NH3
              </th>
              <th
                className={`p-2 text-xs font-medium text-center ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}>
                Rata NH
              </th>
              <th
                className={`p-2 text-xs font-medium text-center ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}>
                PSTS
              </th>
              <th
                className={`p-2 text-xs font-medium text-center border-r border-blue-300 dark:border-gray-600 ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}>
                PSAS
              </th>

              {/* Sub Header Nilai Katrol */}
              <th
                className={`p-2 text-xs font-medium text-center ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}>
                NH1
              </th>
              <th
                className={`p-2 text-xs font-medium text-center ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}>
                NH2
              </th>
              <th
                className={`p-2 text-xs font-medium text-center ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}>
                NH3
              </th>
              <th
                className={`p-2 text-xs font-medium text-center ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}>
                Rata NH
              </th>
              <th
                className={`p-2 text-xs font-medium text-center ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}>
                PSTS
              </th>
              <th
                className={`p-2 text-xs font-medium text-center ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}>
                PSAS
              </th>

              {/* Sub Header Nilai Akhir */}
              <th
                className={`p-2 text-xs font-medium text-center ${
                  isDarkMode ? "text-blue-300" : "text-blue-600"
                }`}>
                Mentah
              </th>
              <th
                className={`p-2 text-xs font-medium text-center ${
                  isDarkMode ? "text-green-300" : "text-green-600"
                }`}>
                Katrol
              </th>
              <th
                className={`p-2 text-xs font-medium text-center ${
                  isDarkMode ? "text-yellow-300" : "text-yellow-600"
                }`}>
                Selisih
              </th>
              <th
                className={`p-2 text-xs font-medium text-center border-r border-blue-300 dark:border-gray-600 ${
                  isDarkMode ? "text-purple-300" : "text-purple-600"
                }`}>
                Kenaikan
              </th>

              {/* Status */}
              {showComparison && <th className="p-2"></th>}
            </tr>
          </thead>

          <tbody
            className={`divide-y ${
              isDarkMode
                ? "divide-gray-700 bg-gray-900"
                : "divide-gray-200 bg-white"
            }`}>
            {sortedData.map((siswa, index) => {
              const selisih =
                parseFloat(siswa.nilai_akhir_katrol || 0) -
                parseFloat(siswa.nilai_akhir_mentah || 0);
              const kenaikanPersen =
                parseFloat(siswa.nilai_akhir_mentah || 0) > 0
                  ? (selisih / parseFloat(siswa.nilai_akhir_mentah || 0)) * 100
                  : 100;

              const isLulusMentah =
                parseFloat(siswa.nilai_akhir_mentah || 0) >= kkm;
              const isLulusKatrol =
                parseFloat(siswa.nilai_akhir_katrol || 0) >= kkm;

              const getStatusColor = () => {
                if (!isLulusMentah && isLulusKatrol)
                  return "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400";
                if (isLulusMentah && isLulusKatrol)
                  return "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400";
                if (!isLulusMentah && !isLulusKatrol)
                  return "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400";
                return "text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-400";
              };

              const getStatusText = () => {
                if (!isLulusMentah && isLulusKatrol) return "Naik Status";
                if (isLulusMentah && isLulusKatrol) return "Tetap Lulus";
                if (!isLulusMentah && !isLulusKatrol) return "Tetap Gagal";
                return "-";
              };

              return (
                <tr
                  key={siswa.student_id || index}
                  className={`${getRowHoverClass()} transition-colors`}>
                  {/* No */}
                  <td className="p-3 text-center">
                    <span
                      className={`font-medium ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}>
                      {index + 1}
                    </span>
                  </td>

                  {/* NIS */}
                  <td className="p-3">
                    <span
                      className={`font-mono text-sm ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      }`}>
                      {siswa.nis || "-"}
                    </span>
                  </td>

                  {/* Nama - FIX: Ganti student_name dengan nama_siswa */}
                  <td className="p-3">
                    <div>
                      <p
                        className={`font-medium ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}>
                        {siswa.nama_siswa || "-"}
                      </p>
                    </div>
                  </td>

                  {/* Nilai Mentah */}
                  <td
                    className={`p-3 text-center font-medium ${getScoreColor(
                      siswa.nh1_mentah,
                      false
                    )}`}>
                    {formatNilai(siswa.nh1_mentah)}
                  </td>
                  <td
                    className={`p-3 text-center font-medium ${getScoreColor(
                      siswa.nh2_mentah,
                      false
                    )}`}>
                    {formatNilai(siswa.nh2_mentah)}
                  </td>
                  <td
                    className={`p-3 text-center font-medium ${getScoreColor(
                      siswa.nh3_mentah,
                      false
                    )}`}>
                    {formatNilai(siswa.nh3_mentah)}
                  </td>
                  <td
                    className={`p-3 text-center font-medium ${getScoreColor(
                      siswa.rata_nh_mentah,
                      false
                    )}`}>
                    {formatNilai(siswa.rata_nh_mentah)}
                  </td>
                  <td
                    className={`p-3 text-center font-medium ${getScoreColor(
                      siswa.psts_mentah,
                      false
                    )}`}>
                    {formatNilai(siswa.psts_mentah)}
                  </td>
                  <td
                    className={`p-3 text-center font-medium border-r ${getScoreColor(
                      siswa.psas_mentah,
                      false
                    )} ${isDarkMode ? "border-gray-600" : "border-blue-300"}`}>
                    {formatNilai(siswa.psas_mentah)}
                  </td>

                  {/* Nilai Katrol */}
                  <td
                    className={`p-3 text-center font-medium ${getScoreColor(
                      siswa.nh1_katrol,
                      true
                    )}`}>
                    {formatNilai(siswa.nh1_katrol)}
                  </td>
                  <td
                    className={`p-3 text-center font-medium ${getScoreColor(
                      siswa.nh2_katrol,
                      true
                    )}`}>
                    {formatNilai(siswa.nh2_katrol)}
                  </td>
                  <td
                    className={`p-3 text-center font-medium ${getScoreColor(
                      siswa.nh3_katrol,
                      true
                    )}`}>
                    {formatNilai(siswa.nh3_katrol)}
                  </td>
                  <td
                    className={`p-3 text-center font-medium ${getScoreColor(
                      siswa.rata_nh_katrol,
                      true
                    )}`}>
                    {formatNilai(siswa.rata_nh_katrol)}
                  </td>
                  <td
                    className={`p-3 text-center font-medium ${getScoreColor(
                      siswa.psts_katrol,
                      true
                    )}`}>
                    {formatNilai(siswa.psts_katrol)}
                  </td>
                  <td
                    className={`p-3 text-center font-medium ${getScoreColor(
                      siswa.psas_katrol,
                      true
                    )}`}>
                    {formatNilai(siswa.psas_katrol)}
                  </td>

                  {/* Nilai Akhir */}
                  <td
                    className={`p-3 text-center font-medium ${getScoreColor(
                      siswa.nilai_akhir_mentah,
                      false
                    )}`}>
                    {formatNilai(siswa.nilai_akhir_mentah)}
                  </td>
                  <td
                    className={`p-3 text-center font-medium ${getScoreColor(
                      siswa.nilai_akhir_katrol,
                      true
                    )}`}>
                    {formatNilai(siswa.nilai_akhir_katrol)}
                  </td>
                  <td
                    className={`p-3 text-center font-medium ${
                      selisih >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}>
                    {selisih >= 0 ? "+" : ""}
                    {formatNilai(selisih)}
                  </td>
                  <td
                    className={`p-3 text-center font-medium border-r ${
                      selisih >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    } ${isDarkMode ? "border-gray-600" : "border-blue-300"}`}>
                    {selisih >= 0 ? "+" : ""}
                    {kenaikanPersen.toFixed(1)}%
                  </td>

                  {/* Status */}
                  {showComparison && (
                    <td className="p-3 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
                        {getStatusText()}
                      </span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>

          {/* Footer dengan rata-rata */}
          {stats && (
            <tfoot
              className={
                isDarkMode
                  ? "bg-gray-800 border-t border-gray-700"
                  : "bg-blue-50 border-t border-blue-100"
              }>
              <tr>
                <td colSpan="3" className="p-3 text-right font-semibold">
                  <span
                    className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
                    Rata-rata Kelas:
                  </span>
                </td>

                {/* Rata-rata Nilai Mentah */}
                <td className="p-3 text-center font-medium">
                  <span
                    className={isDarkMode ? "text-blue-400" : "text-blue-600"}>
                    {formatNilai(
                      hasilKatrol.reduce(
                        (sum, s) => sum + parseFloat(s.nh1_mentah || 0),
                        0
                      ) / hasilKatrol.length
                    )}
                  </span>
                </td>
                <td className="p-3 text-center font-medium">
                  <span
                    className={isDarkMode ? "text-blue-400" : "text-blue-600"}>
                    {formatNilai(
                      hasilKatrol.reduce(
                        (sum, s) => sum + parseFloat(s.nh2_mentah || 0),
                        0
                      ) / hasilKatrol.length
                    )}
                  </span>
                </td>
                <td className="p-3 text-center font-medium">
                  <span
                    className={isDarkMode ? "text-blue-400" : "text-blue-600"}>
                    {formatNilai(
                      hasilKatrol.reduce(
                        (sum, s) => sum + parseFloat(s.nh3_mentah || 0),
                        0
                      ) / hasilKatrol.length
                    )}
                  </span>
                </td>
                <td className="p-3 text-center font-medium">
                  <span
                    className={isDarkMode ? "text-blue-400" : "text-blue-600"}>
                    {formatNilai(stats.avgMentah * 0.4)}
                  </span>
                </td>
                <td className="p-3 text-center font-medium">
                  <span
                    className={isDarkMode ? "text-blue-400" : "text-blue-600"}>
                    {formatNilai(
                      hasilKatrol.reduce(
                        (sum, s) => sum + parseFloat(s.psts_mentah || 0),
                        0
                      ) / hasilKatrol.length
                    )}
                  </span>
                </td>
                <td
                  className={`p-3 text-center font-medium border-r ${
                    isDarkMode ? "border-gray-600" : "border-blue-300"
                  }`}>
                  <span
                    className={isDarkMode ? "text-blue-400" : "text-blue-600"}>
                    {formatNilai(
                      hasilKatrol.reduce(
                        (sum, s) => sum + parseFloat(s.psas_mentah || 0),
                        0
                      ) / hasilKatrol.length
                    )}
                  </span>
                </td>

                {/* Rata-rata Nilai Katrol */}
                <td className="p-3 text-center font-medium">
                  <span
                    className={
                      isDarkMode ? "text-green-400" : "text-green-600"
                    }>
                    {formatNilai(
                      hasilKatrol.reduce(
                        (sum, s) => sum + parseFloat(s.psts_katrol || 0),
                        0
                      ) / hasilKatrol.length
                    )}
                  </span>
                </td>
                <td className="p-3 text-center font-medium">
                  <span
                    className={
                      isDarkMode ? "text-green-400" : "text-green-600"
                    }>
                    {formatNilai(
                      hasilKatrol.reduce(
                        (sum, s) => sum + parseFloat(s.psas_katrol || 0),
                        0
                      ) / hasilKatrol.length
                    )}
                  </span>
                </td>

                {/* Rata-rata Nilai Akhir */}
                <td
                  className={`p-3 text-center font-medium border-l ${
                    isDarkMode ? "border-gray-600" : "border-blue-300"
                  }`}>
                  <span
                    className={isDarkMode ? "text-blue-400" : "text-blue-600"}>
                    {formatNilai(stats.avgMentah)}
                  </span>
                </td>
                <td className="p-3 text-center font-medium">
                  <span
                    className={
                      isDarkMode ? "text-green-400" : "text-green-600"
                    }>
                    {formatNilai(stats.avgKatrol)}
                  </span>
                </td>
                <td className="p-3 text-center font-medium">
                  <span
                    className={
                      isDarkMode ? "text-green-400" : "text-green-600"
                    }>
                    +{formatNilai(stats.avgKatrol - stats.avgMentah)}
                  </span>
                </td>
                <td
                  className={`p-3 text-center font-medium border-r ${
                    isDarkMode ? "border-gray-600" : "border-blue-300"
                  }`}>
                  <span
                    className={
                      isDarkMode ? "text-green-400" : "text-green-600"
                    }>
                    +
                    {(
                      ((stats.avgKatrol - stats.avgMentah) /
                        (stats.avgMentah || 1)) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </td>

                {/* Status Footer */}
                {showComparison && (
                  <td className="p-3 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        stats.lulusKatrol > stats.lulusMentah
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                      }`}>
                      {stats.lulusKatrol - stats.lulusMentah > 0
                        ? `+${stats.lulusKatrol - stats.lulusMentah} Lulus`
                        : "Stabil"}
                    </span>
                  </td>
                )}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Legend */}
      <div
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm ${
          isDarkMode ? "text-gray-400" : "text-gray-600"
        }`}>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500"></div>
          <span>Nilai katrol ≥ KKM ({kkm})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500"></div>
          <span>Nilai katrol &lt; KKM ({kkm})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500"></div>
          <span>Nilai mentah ≥ KKM ({kkm})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-500"></div>
          <span>Nilai mentah &lt; KKM ({kkm})</span>
        </div>
      </div>

      {/* Notes */}
      <div
        className={`text-sm ${isDarkMode ? "text-gray-500" : "text-gray-600"}`}>
        <p>
          <strong>Catatan:</strong> Nilai akhir = (Rata-rata NH × 40%) + (PSTS ×
          30%) + (PSAS × 30%)
        </p>
        <p>
          <strong>Target katrol:</strong> KKM = {kkm}, Nilai Maksimal ={" "}
          {nilaiMaksimal}
        </p>
      </div>
    </div>
  );
};

export default KatrolTable;
