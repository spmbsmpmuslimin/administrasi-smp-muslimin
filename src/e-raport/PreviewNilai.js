import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { FileSpreadsheet, Download, RefreshCw } from "lucide-react";
import ExcelJS from "exceljs";
import {
  getActiveAcademicInfo,
  applyAcademicFilters,
} from "../services/academicYearService";

function PreviewNilai({ classId, semester, setSemester, academicYear }) {
  const [loading, setLoading] = useState(false);
  const [academicInfo, setAcademicInfo] = useState(null);
  const [academicLoading, setAcademicLoading] = useState(true);
  const [siswaList, setSiswaList] = useState([]);
  const [mapelList, setMapelList] = useState([]);
  const [nilaiData, setNilaiData] = useState({});
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  // Load academic info on component mount
  useEffect(() => {
    loadAcademicInfo();
  }, []);

  // Load leger data when dependencies change
  useEffect(() => {
    if (classId && academicInfo && semester) {
      loadLegerData();
    }
  }, [classId, academicInfo, semester]);

  // Load academic information from service
  const loadAcademicInfo = async () => {
    setAcademicLoading(true);
    try {
      const info = await getActiveAcademicInfo();
      setAcademicInfo(info);
      console.log("Academic Info:", info);
    } catch (error) {
      setError("Gagal memuat informasi tahun ajaran: " + error.message);
      console.error("Error loading academic info:", error);
    } finally {
      setAcademicLoading(false);
    }
  };

  const loadLegerData = async () => {
    if (!classId) {
      setError("Kelas tidak tersedia");
      return;
    }

    if (!semester) {
      setError("Pilih semester terlebih dahulu");
      return;
    }

    if (!academicInfo) {
      setError("Data tahun ajaran aktif belum tersedia");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Load semua siswa di kelas
      const { data: siswa, error: siswaError } = await supabase
        .from("students")
        .select("id, full_name, nis")
        .eq("class_id", classId)
        .eq("is_active", true)
        .order("full_name");

      if (siswaError) throw siswaError;

      // 2. Load semua nilai dari tabel nilai_eraport menggunakan applyAcademicFilters
      let query = supabase
        .from("nilai_eraport")
        .select("student_id, mata_pelajaran, nilai_akhir, kkm")
        .eq("class_id", classId);

      // Apply academic filters
      query = await applyAcademicFilters(query, {
        filterYearId: true, // Filter by academic_year_id
        customSemester: semester, // Gunakan semester yang dipilih
      });

      const { data: nilai, error: nilaiError } = await query;

      if (nilaiError) throw nilaiError;

      console.log("Data Siswa:", siswa);
      console.log("Data Nilai:", nilai);

      // 3. Mapping nama mapel ke singkatan
      const mapelMapping = {
        "Pendidikan Agama Islam dan Budi Pekerti": "PAIBP",
        "Pendidikan Pancasila": "PPKn",
        "Bahasa Indonesia": "BIND",
        "Matematika (Umum)": "MTK",
        Matematika: "MTK",
        "Ilmu Pengetahuan Alam (IPA)": "IPA",
        "Ilmu Pengetahuan Alam": "IPA",
        IPA: "IPA",
        "Ilmu Pengetahuan Sosial (IPS)": "IPS",
        "Ilmu Pengetahuan Sosial": "IPS",
        IPS: "IPS",
        "Bahasa Inggris": "BING",
        "Pendidikan Jasmani, Olahraga dan Kesehatan": "PJOK",
        PJOK: "PJOK",
        Informatika: "INF",
        "Muatan Lokal Bahasa Daerah": "BSUN",
        "Bahasa Daerah": "BSUN",
        "Koding & AI": "KKA",
        "Koding dan AI": "KKA",
        "Seni Tari": "SENTAR",
        "Seni Rupa": "SENRUP",
        Prakarya: "PRA",
      };

      // Urutan standar mapel
      const mapelUrutan = [
        "PAIBP",
        "PPKn",
        "BIND",
        "MTK",
        "IPA",
        "IPS",
        "BING",
        "PJOK",
        "INF",
        "BSUN",
        "KKA",
        "SENTAR",
        "SENRUP",
        "PRA",
      ];

      const mapelSet = new Set();
      nilai?.forEach((n) => {
        if (n.mata_pelajaran) {
          const singkatan = mapelMapping[n.mata_pelajaran] || n.mata_pelajaran;
          mapelSet.add(singkatan);
        }
      });

      const mapelArray = Array.from(mapelSet).sort((a, b) => {
        const indexA = mapelUrutan.indexOf(a);
        const indexB = mapelUrutan.indexOf(b);

        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
      });

      // 4. Buat struktur data nilai per siswa per mapel
      const nilaiMap = {};
      nilai?.forEach((n) => {
        if (!nilaiMap[n.student_id]) {
          nilaiMap[n.student_id] = {};
        }
        const singkatan = mapelMapping[n.mata_pelajaran] || n.mata_pelajaran;
        nilaiMap[n.student_id][singkatan] = {
          nilai_akhir: n.nilai_akhir,
          kkm: n.kkm || 65,
          nama_lengkap: n.mata_pelajaran,
        };
      });

      console.log("Mapel List:", mapelArray);
      console.log("Nilai Map:", nilaiMap);

      setSiswaList(siswa || []);
      setMapelList(mapelArray);
      setNilaiData(nilaiMap);
    } catch (error) {
      setError("Gagal memuat data: " + error.message);
      console.error("Error loading leger:", error);
    }
    setLoading(false);
  };

  // FUNGSI EXPORT EXCEL - 2 SHEET (NILAI + PERINGKAT)
  const exportExcel = async () => {
    if (!academicInfo) {
      setError("Informasi tahun ajaran belum tersedia");
      return;
    }

    if (siswaList.length === 0 || mapelList.length === 0) {
      setError("Tidak ada data untuk di-export");
      return;
    }

    setExporting(true);
    setError("");

    try {
      const workbook = new ExcelJS.Workbook();
      const semesterLabel =
        academicInfo.semesterText ||
        (academicInfo.semester === "1" ? "Ganjil" : "Genap");
      const tahunAjaran = academicInfo.year || "Tahun Ajaran";

      // ========== SHEET 1: LEGER NILAI (Urut Nama) ==========
      const wsNilai = workbook.addWorksheet("Leger Nilai");

      const headerNilai = [
        ["SMP MUSLIMIN CILILIN"],
        ["LEGER NILAI KELAS " + classId],
        [`Tahun Ajaran: ${tahunAjaran} - ${semesterLabel}`],
        [""],
      ];

      let rowNilai = 1;
      headerNilai.forEach((row) => {
        const r = wsNilai.getRow(rowNilai++);
        r.getCell(1).value = row[0];
        const totalColumns = mapelList.length + 5;
        const lastColumn = String.fromCharCode(65 + totalColumns - 1);
        wsNilai.mergeCells(`A${rowNilai - 1}:${lastColumn}${rowNilai - 1}`);
        r.getCell(1).font = {
          bold: true,
          size: rowNilai <= 4 ? 14 : 11,
          name: "Calibri",
        };
        r.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
      });

      // Header kolom
      const headersNilai = [
        "No",
        "NIS",
        "Nama Siswa",
        ...mapelList,
        "JML",
        "Rata2",
      ];
      const headerRowNilai = wsNilai.getRow(rowNilai);
      headerRowNilai.values = headersNilai;
      headerRowNilai.height = 30;

      headerRowNilai.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD9E1F2" },
        };
        cell.font = { bold: true, size: 10 };
        cell.alignment = {
          vertical: "middle",
          horizontal: "center",
          wrapText: true,
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      // Column widths
      const columns = [{ width: 5 }, { width: 12 }, { width: 30 }];
      mapelList.forEach(() => columns.push({ width: 8 }));
      columns.push({ width: 11 });
      columns.push({ width: 11 });
      wsNilai.columns = columns;

      rowNilai++;

      // Data rows (urut nama)
      siswaList.forEach((siswa, index) => {
        // Hitung nilai
        const nilaiList = mapelList
          .map((mapel) => {
            const data = nilaiData[siswa.id]?.[mapel];
            return data?.nilai_akhir;
          })
          .filter((n) => n !== undefined && n !== null);

        // JUMLAH: Tanpa desimal
        const jumlah =
          nilaiList.length > 0
            ? Math.round(nilaiList.reduce((sum, n) => sum + parseFloat(n), 0))
            : "-";

        // RATA-RATA: Dengan 2 desimal
        const rataRata =
          nilaiList.length > 0
            ? (
                nilaiList.reduce((sum, n) => sum + parseFloat(n), 0) /
                nilaiList.length
              ).toFixed(2)
            : "-";

        const rowData = [
          index + 1,
          siswa.nis || "-",
          siswa.full_name,
          ...mapelList.map((mapel) => {
            const data = nilaiData[siswa.id]?.[mapel];
            return data?.nilai_akhir || "-";
          }),
          jumlah,
          rataRata,
        ];

        const r = wsNilai.addRow(rowData);

        r.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };

          if (colNumber === 1) {
            cell.alignment = { vertical: "middle", horizontal: "center" };
          } else if (colNumber === 2) {
            cell.alignment = { vertical: "middle", horizontal: "center" };
            cell.numFmt = "@";
          } else if (colNumber === 3) {
            cell.alignment = { vertical: "middle", horizontal: "left" };
          } else if (colNumber === rowData.length - 1) {
            // Kolom JML (sebelum terakhir)
            cell.alignment = { vertical: "middle", horizontal: "center" };
            if (cell.value !== "-" && !isNaN(cell.value)) {
              cell.numFmt = "0";
              cell.font = { bold: true };
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFFEF9C3" },
              };
            }
          } else if (colNumber === rowData.length) {
            // Kolom Rata2 (terakhir)
            cell.alignment = { vertical: "middle", horizontal: "center" };
            if (cell.value !== "-" && !isNaN(cell.value)) {
              cell.numFmt = "0.00";
              cell.font = { bold: true };
            }
          } else {
            cell.alignment = { vertical: "middle", horizontal: "center" };
            if (cell.value !== "-" && !isNaN(cell.value)) {
              cell.numFmt = "0";
            }
          }

          // Warna baris ganjil-genap
          if (index % 2 !== 0) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF2F2F2" },
            };
          }
        });
      });

      // ========== SHEET 2: LEGER PERINGKAT (Urut Jumlah) ==========
      const wsPeringkat = workbook.addWorksheet("Leger Peringkat");

      const headerPeringkat = [
        ["SMP MUSLIMIN CILILIN"],
        ["LEGER PERINGKAT KELAS " + classId],
        [`Tahun Ajaran: ${tahunAjaran} - ${semesterLabel}`],
        ["(Diurutkan berdasarkan Jumlah Nilai - Tertinggi ke Terendah)"],
        [""],
      ];

      let rowPeringkat = 1;
      headerPeringkat.forEach((row) => {
        const r = wsPeringkat.getRow(rowPeringkat++);
        r.getCell(1).value = row[0];
        const totalColumns = mapelList.length + 5;
        const lastColumn = String.fromCharCode(65 + totalColumns - 1);
        wsPeringkat.mergeCells(
          `A${rowPeringkat - 1}:${lastColumn}${rowPeringkat - 1}`
        );
        r.getCell(1).font = {
          bold: true,
          size: rowPeringkat <= 4 ? 14 : 11,
          name: "Calibri",
        };
        r.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
      });

      const headersPeringkat = [
        "No",
        "NIS",
        "Nama Siswa",
        ...mapelList,
        "JML",
        "Rata2",
      ];

      const headerRowPeringkat = wsPeringkat.getRow(rowPeringkat);
      headerRowPeringkat.values = headersPeringkat;
      headerRowPeringkat.height = 30;

      headerRowPeringkat.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE2EFDA" },
        };
        cell.font = { bold: true, size: 10 };
        cell.alignment = {
          vertical: "middle",
          horizontal: "center",
          wrapText: true,
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      wsPeringkat.columns = columns;
      rowPeringkat++;

      // Sort data by jumlah nilai (descending)
      const peringkatData = siswaList
        .map((siswa) => {
          const nilaiList = mapelList
            .map((mapel) => nilaiData[siswa.id]?.[mapel]?.nilai_akhir)
            .filter((n) => n !== undefined && n !== null);

          // JUMLAH: Tanpa desimal
          const jumlahNilai =
            nilaiList.length > 0
              ? Math.round(nilaiList.reduce((sum, n) => sum + parseFloat(n), 0))
              : 0;

          // RATA-RATA: Dengan 2 desimal
          const rataRata =
            nilaiList.length > 0
              ? (
                  nilaiList.reduce((sum, n) => sum + parseFloat(n), 0) /
                  nilaiList.length
                ).toFixed(2)
              : "-";

          return {
            siswa,
            jumlahNilai,
            rataRata,
            nilaiList,
          };
        })
        .filter((item) => item.jumlahNilai > 0)
        .sort((a, b) => b.jumlahNilai - a.jumlahNilai);

      peringkatData.forEach((item, index) => {
        const rowData = [
          index + 1,
          item.siswa.nis || "-",
          item.siswa.full_name,
          ...mapelList.map((mapel) => {
            const data = nilaiData[item.siswa.id]?.[mapel];
            return data?.nilai_akhir || "-";
          }),
          item.jumlahNilai,
          item.rataRata,
        ];

        const r = wsPeringkat.addRow(rowData);

        r.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };

          if (colNumber === 1) {
            cell.alignment = { vertical: "middle", horizontal: "center" };
            // Highlight top 3
            if (index < 3) {
              cell.font = { bold: true, size: 11 };
              if (index === 0) {
                cell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: "FFFFD700" },
                };
              } else if (index === 1) {
                cell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: "FFC0C0C0" },
                };
              } else if (index === 2) {
                cell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: "FFCD7F32" },
                };
              }
            }
          } else if (colNumber === 2) {
            cell.alignment = { vertical: "middle", horizontal: "center" };
            cell.numFmt = "@";
          } else if (colNumber === 3) {
            cell.alignment = { vertical: "middle", horizontal: "left" };
          } else if (colNumber === rowData.length - 1) {
            // Kolom JML (sebelum terakhir)
            cell.alignment = { vertical: "middle", horizontal: "center" };
            if (cell.value !== "-" && !isNaN(cell.value)) {
              cell.numFmt = "0";
              cell.font = { bold: true };
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFFEF9C3" },
              };
            }
          } else if (colNumber === rowData.length) {
            // Kolom Rata2 (terakhir)
            cell.alignment = { vertical: "middle", horizontal: "center" };
            if (cell.value !== "-" && !isNaN(cell.value)) {
              cell.numFmt = "0.00";
              cell.font = { bold: true };
            }
          } else {
            cell.alignment = { vertical: "middle", horizontal: "center" };
            if (cell.value !== "-" && !isNaN(cell.value)) {
              cell.numFmt = "0";
            }
          }

          // Highlight top 3 rows
          if (index < 3 && colNumber > 1) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: {
                argb:
                  index === 0
                    ? "FFFFFFCC"
                    : index === 1
                    ? "FFE8E8E8"
                    : "FFF5E6CC",
              },
            };
          } else if (index % 2 !== 0) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF2F2F2" },
            };
          }
        });
      });

      // Download file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const semesterShort = semesterLabel;
      const tahunAjaranShort =
        academicInfo.year?.replace("/", "-") || "Tahun-Ajaran";

      a.download = `Leger_Nilai_Kelas_${classId}_${semesterShort}_${tahunAjaranShort}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError("Gagal export Excel: " + err.message);
      console.error("Export error:", err);
    } finally {
      setExporting(false);
    }
  };

  // Loading state untuk data akademik
  if (academicLoading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-700 font-medium">
            Memuat informasi tahun ajaran...
          </p>
        </div>
      </div>
    );
  }

  if (!academicInfo) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <span>Gagal memuat informasi tahun ajaran aktif</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6">
      {/* HEADER & FILTER */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-blue-200 dark:border-gray-700 p-4 md:p-6 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4">
          <div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet
                className="text-blue-600 dark:text-blue-400"
                size={24}
              />
              <span className="text-base sm:text-lg md:text-xl">
                Preview Nilai (Leger)
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
              Kelas {classId} - {academicInfo.displayText || academicInfo.year}
            </p>
          </div>

          <div className="flex gap-2 mt-2 sm:mt-0">
            {!loading && semester && (
              <button
                onClick={loadLegerData}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg flex items-center gap-2 font-medium text-sm sm:text-base shadow hover:shadow-md transition-all min-h-[44px] min-w-[44px]">
                <RefreshCw size={18} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            )}
            {!loading && siswaList.length > 0 && mapelList.length > 0 && (
              <button
                onClick={exportExcel}
                disabled={exporting}
                className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg flex items-center gap-2 font-medium text-sm sm:text-base shadow hover:shadow-md transition-all disabled:opacity-50 min-h-[44px] min-w-[44px]">
                <FileSpreadsheet size={18} />
                <span className="hidden sm:inline">
                  {exporting ? "Exporting..." : "Export Excel"}
                </span>
                <span className="sm:hidden">
                  {exporting ? "..." : "Export"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* SEMESTER SELECTOR */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Pilih Semester
            </label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full px-3 py-3 border border-blue-300 dark:border-gray-600 rounded-lg 
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-600
                transition-all duration-200 text-sm sm:text-base
                hover:border-blue-400 dark:hover:border-blue-500 min-h-[44px]">
              <option value="">-- Pilih Semester --</option>
              <option value="1">Semester Ganjil</option>
              <option value="2">Semester Genap</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2 sm:pt-0">
            <div
              className={`w-3 h-3 rounded-full ${
                siswaList.length > 0
                  ? "bg-blue-500 dark:bg-blue-400"
                  : "bg-gray-400 dark:bg-gray-600"
              }`}></div>
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              {siswaList.length > 0
                ? `Data: ${siswaList.length} siswa, ${mapelList.length} mapel`
                : "Pilih semester"}
            </span>
          </div>
        </div>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <div className="mb-4 p-3 sm:p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <span className="text-sm sm:text-base">{error}</span>
          </div>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="text-center py-8 sm:py-12">
          <div className="inline-flex flex-col items-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-blue-200 dark:border-blue-800/30 border-t-blue-600 dark:border-t-blue-500 rounded-full animate-spin mb-3 sm:mb-4"></div>
            <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 font-medium">
              Memuat data leger...
            </p>
          </div>
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && !semester && (
        <div className="text-center py-8 sm:py-12 text-gray-500 dark:text-gray-400">
          <FileSpreadsheet
            size={48}
            className="mx-auto mb-3 sm:mb-4 opacity-30"
          />
          <p className="text-sm sm:text-base font-medium">
            Silakan pilih semester terlebih dahulu
          </p>
        </div>
      )}

      {!loading && semester && siswaList.length === 0 && (
        <div className="text-center py-8 sm:py-12 text-gray-500 dark:text-gray-400">
          <FileSpreadsheet
            size={48}
            className="mx-auto mb-3 sm:mb-4 opacity-30"
          />
          <p className="text-sm sm:text-base font-medium">
            Tidak ada data siswa di kelas ini
          </p>
        </div>
      )}

      {!loading &&
        semester &&
        siswaList.length > 0 &&
        mapelList.length === 0 && (
          <div className="text-center py-8 sm:py-12 text-yellow-600 dark:text-yellow-400">
            <FileSpreadsheet
              size={48}
              className="mx-auto mb-3 sm:mb-4 opacity-50"
            />
            <p className="text-sm sm:text-base font-medium">
              Tidak ada data nilai untuk semester ini
            </p>
            <p className="text-xs sm:text-sm mt-1 sm:mt-2">
              Silakan input nilai terlebih dahulu
            </p>
          </div>
        )}

      {/* TABEL LEGER */}
      {!loading && semester && siswaList.length > 0 && mapelList.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <table className="w-full border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-blue-700 dark:bg-blue-900 text-white">
                  <th className="border border-blue-600 dark:border-blue-800 p-2 text-center font-bold sticky left-0 bg-blue-700 dark:bg-blue-900 z-10 w-[35px] sm:w-[40px]">
                    No
                  </th>
                  <th className="border border-blue-600 dark:border-blue-800 p-2 text-center font-bold sticky left-[35px] sm:left-[40px] bg-blue-700 dark:bg-blue-900 z-10 w-[80px] sm:w-[100px]">
                    NIS
                  </th>
                  <th className="border border-blue-600 dark:border-blue-800 p-2 text-left font-bold sticky left-[115px] sm:left-[140px] bg-blue-700 dark:bg-blue-900 z-10 w-[120px] sm:w-[150px]">
                    Nama
                  </th>
                  {mapelList.map((mapel, idx) => (
                    <th
                      key={idx}
                      title={
                        nilaiData[siswaList[0]?.id]?.[mapel]?.nama_lengkap ||
                        mapel
                      }
                      className="border border-blue-600 dark:border-blue-800 p-2 text-center font-bold w-[60px] sm:w-[65px] whitespace-nowrap cursor-help">
                      {mapel}
                    </th>
                  ))}
                  <th className="border border-blue-600 dark:border-blue-800 p-2 text-center font-bold w-[60px] sm:w-[70px]">
                    JML
                  </th>
                  <th className="border border-blue-600 dark:border-blue-800 p-2 text-center font-bold w-[60px] sm:w-[70px]">
                    Rata2
                  </th>
                </tr>
              </thead>
              <tbody>
                {siswaList.map((siswa, idx) => {
                  const nilaiList = mapelList
                    .map((mapel) => {
                      const data = nilaiData[siswa.id]?.[mapel];
                      return data?.nilai_akhir;
                    })
                    .filter((n) => n !== undefined && n !== null);

                  // JUMLAH: Tanpa desimal
                  const jumlahNilai =
                    nilaiList.length > 0
                      ? Math.round(
                          nilaiList.reduce((sum, n) => sum + parseFloat(n), 0)
                        )
                      : null;

                  // RATA-RATA: Dengan 2 desimal
                  const rataRata =
                    nilaiList.length > 0
                      ? (
                          nilaiList.reduce((sum, n) => sum + parseFloat(n), 0) /
                          nilaiList.length
                        ).toFixed(2)
                      : null;

                  return (
                    <tr
                      key={siswa.id}
                      className={
                        idx % 2 === 0
                          ? "bg-blue-50/30 dark:bg-gray-800/50"
                          : "bg-white dark:bg-gray-900"
                      }>
                      <td className="border border-gray-300 dark:border-gray-700 p-2 text-center font-medium sticky left-0 bg-inherit z-[5]">
                        {idx + 1}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-700 p-2 text-center font-mono sticky left-[35px] sm:left-[40px] bg-inherit z-[5]">
                        {siswa.nis || "-"}
                      </td>
                      <td
                        className="border border-gray-300 dark:border-gray-700 p-2 font-medium sticky left-[115px] sm:left-[140px] bg-inherit z-[5] truncate"
                        title={siswa.full_name}>
                        {siswa.full_name}
                      </td>
                      {mapelList.map((mapel, mapelIdx) => {
                        const data = nilaiData[siswa.id]?.[mapel];
                        const nilai = data?.nilai_akhir;
                        const kkm = data?.kkm || 65;

                        return (
                          <td
                            key={mapelIdx}
                            title={data?.nama_lengkap || mapel}
                            className={`border border-gray-300 dark:border-gray-700 p-2 text-center font-semibold cursor-help ${
                              nilai
                                ? nilai >= kkm
                                  ? "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20"
                                  : "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
                                : "text-gray-400 dark:text-gray-600"
                            }`}>
                            {nilai || "-"}
                          </td>
                        );
                      })}
                      <td
                        className={`border border-gray-300 dark:border-gray-700 p-2 text-center font-bold bg-yellow-100 dark:bg-yellow-900/30 ${
                          jumlahNilai
                            ? "text-yellow-800 dark:text-yellow-300"
                            : "text-gray-400 dark:text-gray-600"
                        }`}>
                        {jumlahNilai || "-"}
                      </td>
                      <td
                        className={`border border-gray-300 dark:border-gray-700 p-2 text-center font-bold ${
                          rataRata
                            ? rataRata >= 65
                              ? "text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30"
                              : "text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30"
                            : "text-gray-400 dark:text-gray-600"
                        }`}>
                        {rataRata || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* INFO */}
          <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded"></div>
                <span className="text-gray-700 dark:text-gray-300">
                  Nilai ≥ KKM
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded"></div>
                <span className="text-gray-700 dark:text-gray-300">
                  Nilai &lt; KKM
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded"></div>
                <span className="text-gray-700 dark:text-gray-300">
                  Jumlah Nilai
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-500 font-mono">
                  -
                </span>
                <span className="text-gray-700 dark:text-gray-300">
                  Belum ada nilai
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              💡 Scroll horizontal untuk melihat semua mata pelajaran. Hover
              pada nama mapel untuk lihat nama lengkap. Total siswa:{" "}
              {siswaList.length} | Total mapel: {mapelList.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default PreviewNilai;
