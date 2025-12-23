import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import ExcelJS from "exceljs";
import { Upload, Plus, Trash2, Edit2, Save, X } from "lucide-react";

function InputTP({ user, onShowToast, darkMode }) {
  const [tingkat, setTingkat] = useState("");
  const [selectedMapel, setSelectedMapel] = useState("");
  const [semester, setSemester] = useState("");
  const [tpList, setTpList] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [academicYear, setAcademicYear] = useState(null);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const getFaseByTingkat = (tingkatNumber) => {
    if (tingkatNumber >= 1 && tingkatNumber <= 2) return "A";
    if (tingkatNumber >= 3 && tingkatNumber <= 4) return "B";
    if (tingkatNumber >= 5 && tingkatNumber <= 6) return "C";
    if (tingkatNumber >= 7 && tingkatNumber <= 9) return "D";
    return "D";
  };

  useEffect(() => {
    loadUserAndAssignments();
  }, []);

  useEffect(() => {
    if (selectedMapel && academicYear && tingkat && semester) {
      loadTP();
    }
  }, [selectedMapel, academicYear, tingkat, semester]);

  const loadUserAndAssignments = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const teacherCode = user.teacher_id;
      if (!teacherCode) {
        throw new Error("Teacher ID tidak ditemukan dalam session.");
      }

      console.log("📱 User Data from Props:", user);
      console.log("🔍 User Keys:", Object.keys(user || {}));
      console.log("🆔 user.teacher_id:", user?.teacher_id);
      console.log("🆔 user.id:", user?.id);

      if (!user) {
        throw new Error("Session tidak valid. Silakan login ulang.");
      }

      console.log("👨‍🏫 Teacher Code yang digunakan:", teacherCode);

      const { data: academicYearData, error: ayError } = await supabase
        .from("academic_years")
        .select("*")
        .eq("is_active", true)
        .single();

      if (ayError || !academicYearData) {
        console.error("❌ Academic year error:", ayError);
        throw new Error("Tahun ajaran aktif tidak ditemukan.");
      }

      setAcademicYear(academicYearData);
      console.log("📅 Academic Year:", academicYearData);

      console.log("📚 Querying teacher_assignments...");
      console.log("   - teacher_id:", teacherCode);
      console.log("   - academic_year_id:", academicYearData.id);

      const { data: assignments, error: assignmentsError } = await supabase
        .from("teacher_assignments")
        .select("subject")
        .eq("teacher_id", teacherCode)
        .eq("academic_year_id", academicYearData.id);

      console.log("📦 Assignments result:", assignments);
      console.log("❌ Assignments error:", assignmentsError);

      if (assignmentsError) {
        console.error("❌ Query error details:", assignmentsError);
        throw new Error(
          `Gagal load tugas mengajar: ${assignmentsError.message}`
        );
      }

      if (!assignments || assignments.length === 0) {
        setErrorMessage("Anda belum ditugaskan mengajar kelas/mapel apapun.");
        setLoading(false);
        return;
      }

      const uniqueSubjects = [...new Set(assignments.map((a) => a.subject))];
      console.log("📚 Unique Subjects:", uniqueSubjects);

      setAvailableSubjects(uniqueSubjects);
      setLoading(false);

      if (onShowToast) {
        onShowToast("Data mengajar berhasil dimuat!", "success");
      }
    } catch (error) {
      console.error("❌ Error in loadUserAndAssignments:", error);
      setErrorMessage(error.message || "Terjadi kesalahan saat memuat data.");
      setLoading(false);

      if (onShowToast) {
        onShowToast(`Error: ${error.message}`, "error");
      }
    }
  };

  const loadTP = async () => {
    try {
      console.log("=== LOAD TP DEBUG ===");
      console.log("Tingkat selected:", tingkat);
      console.log("Mapel selected:", selectedMapel);
      console.log("Semester selected:", semester);
      console.log("Academic Year:", academicYear);

      const { data, error } = await supabase
        .from("tujuan_pembelajaran")
        .select("*")
        .eq("mata_pelajaran", selectedMapel)
        .eq("tingkat", parseInt(tingkat))
        .eq("semester", semester)
        .eq("tahun_ajaran_id", academicYear?.id)
        .order("urutan");

      if (error) {
        console.error("❌ Error loading TP:", error);
        if (onShowToast) {
          onShowToast(`Error load TP: ${error.message}`, "error");
        }
        return;
      }

      console.log("✅ TP Data:", data);
      console.log("===================");

      setTpList(data || []);

      if (onShowToast) {
        if (data?.length > 0) {
          onShowToast(
            `${data.length} TP ditemukan untuk semester ${semester}`,
            "info"
          );
        } else {
          onShowToast(
            "Belum ada data TP untuk mapel/tingkat/semester ini",
            "warning"
          );
        }
      }
    } catch (error) {
      console.error("❌ Error in loadTP:", error);
      if (onShowToast) {
        onShowToast(`Error: ${error.message}`, "error");
      }
    }
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const faseDefault = getFaseByTingkat(parseInt(tingkat));

      const workbook = new ExcelJS.Workbook();
      const buffer = await file.arrayBuffer();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.getWorksheet(1);
      const imported = [];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 6) {
          const noCell = row.getCell(1).value;
          if (noCell && !isNaN(noCell)) {
            imported.push({
              tingkat: parseInt(tingkat),
              fase: row.getCell(3).value || faseDefault,
              deskripsi_tp: row.getCell(4).value,
              urutan: Number(noCell),
              mata_pelajaran: selectedMapel,
              tahun_ajaran_id: academicYear?.id,
              semester: semester,
              is_active: true,
            });
          }
        }
      });

      if (imported.length === 0) {
        if (onShowToast)
          onShowToast("Tidak ada data ditemukan di file Excel!", "warning");
        return;
      }

      const { error } = await supabase
        .from("tujuan_pembelajaran")
        .insert(imported);

      if (error) throw error;

      if (onShowToast)
        onShowToast(
          `Import berhasil! ${imported.length} data TP ditambahkan untuk semester ${semester}.`,
          "success"
        );
      loadTP();
    } catch (error) {
      console.error("❌ Import error:", error);
      if (onShowToast) onShowToast(`Import gagal: ${error.message}`, "error");
    } finally {
      e.target.value = "";
    }
  };

  const handleDownloadTemplate = () => {
    try {
      if (!semester || !tingkat) {
        if (onShowToast)
          onShowToast("Pilih tingkat dan semester terlebih dahulu!", "warning");
        return;
      }

      const faseDefault = getFaseByTingkat(parseInt(tingkat));

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Template TP");

      worksheet.mergeCells("A1:D1");
      worksheet.mergeCells("A2:D2");
      worksheet.mergeCells("A3:D3");
      worksheet.mergeCells("A4:D4");

      worksheet.getCell("A1").value = "TEMPLATE TUJUAN PEMBELAJARAN";
      worksheet.getCell("A1").font = {
        bold: true,
        size: 16,
        color: { argb: "FFFFFFFF" },
      };
      worksheet.getCell("A1").fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0D47A1" }, // Biru professional
      };
      worksheet.getCell("A1").alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      worksheet.getCell("A2").value = `Mata Pelajaran: ${selectedMapel}`;
      worksheet.getCell("A2").font = { bold: true, size: 12 };
      worksheet.getCell("A2").alignment = {
        vertical: "middle",
        horizontal: "left",
      };

      worksheet.getCell("A3").value = `Tingkat: ${tingkat}`;
      worksheet.getCell("A3").font = { bold: true, size: 12 };
      worksheet.getCell("A3").alignment = {
        vertical: "middle",
        horizontal: "left",
      };

      worksheet.getCell("A4").value = `Semester: ${semester}`;
      worksheet.getCell("A4").font = { bold: true, size: 12 };
      worksheet.getCell("A4").alignment = {
        vertical: "middle",
        horizontal: "left",
      };

      const headerRow = worksheet.getRow(6);
      const headers = ["NO", "TINGKAT", "FASE", "TUJUAN PEMBELAJARAN"];

      headers.forEach((header, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF0D47A1" }, // Biru professional
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      worksheet.getColumn(1).width = 5;
      worksheet.getColumn(2).width = 10;
      worksheet.getColumn(3).width = 8;
      worksheet.getColumn(4).width = 70;

      const exampleRows = [
        [
          1,
          parseInt(tingkat),
          faseDefault,
          "Siswa mampu menjelaskan konsep dasar...",
        ],
        [2, parseInt(tingkat), faseDefault, "Siswa mampu menganalisis..."],
        [3, parseInt(tingkat), faseDefault, "Siswa mampu membuat..."],
      ];

      exampleRows.forEach((rowData, idx) => {
        const row = worksheet.getRow(7 + idx);
        rowData.forEach((value, i) => {
          const cell = row.getCell(i + 1);
          cell.value = value;
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
          if (i === 0 || i === 1 || i === 2) {
            cell.alignment = { horizontal: "center", vertical: "middle" };
          }
        });
      });

      workbook.xlsx.writeBuffer().then((buffer) => {
        const blob = new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Template_TP_${selectedMapel}_Tingkat${tingkat}_Semester${semester}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);

        if (onShowToast) onShowToast("Template berhasil diunduh!", "success");
      });
    } catch (error) {
      console.error("❌ Template error:", error);
      if (onShowToast)
        onShowToast(`Gagal membuat template: ${error.message}`, "error");
    }
  };

  const handleAddRow = async () => {
    try {
      if (!semester || !tingkat) {
        if (onShowToast)
          onShowToast("Pilih tingkat dan semester terlebih dahulu!", "warning");
        return;
      }

      const faseDefault = getFaseByTingkat(parseInt(tingkat));

      const newRow = {
        tingkat: parseInt(tingkat),
        fase: faseDefault,
        deskripsi_tp: "",
        urutan: tpList.length + 1,
        mata_pelajaran: selectedMapel,
        tahun_ajaran_id: academicYear?.id,
        semester: semester,
        is_active: true,
      };

      const { data, error } = await supabase
        .from("tujuan_pembelajaran")
        .insert(newRow)
        .select()
        .single();

      if (error) throw error;

      setEditingId(data.id);
      setEditData(data);
      loadTP();

      if (onShowToast) onShowToast("Baris TP berhasil ditambahkan!", "success");
    } catch (error) {
      console.error("❌ Add row error:", error);
      if (onShowToast)
        onShowToast(`Gagal menambah baris: ${error.message}`, "error");
    }
  };

  const handleEdit = (tp) => {
    setEditingId(tp.id);
    setEditData(tp);
    if (onShowToast) onShowToast("Mode edit diaktifkan", "info");
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from("tujuan_pembelajaran")
        .update({
          tingkat: editData.tingkat,
          fase: editData.fase,
          deskripsi_tp: editData.deskripsi_tp,
          semester: semester,
        })
        .eq("id", editingId);

      if (error) throw error;

      setEditingId(null);
      setEditData({});
      loadTP();

      if (onShowToast) onShowToast("Perubahan berhasil disimpan!", "success");
    } catch (error) {
      console.error("❌ Save error:", error);
      if (onShowToast)
        onShowToast(`Gagal menyimpan: ${error.message}`, "error");
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
    if (onShowToast) onShowToast("Edit dibatalkan", "info");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin ingin menghapus TP ini?")) return;

    try {
      const { error } = await supabase
        .from("tujuan_pembelajaran")
        .delete()
        .eq("id", id);

      if (error) throw error;

      loadTP();
      if (onShowToast) onShowToast("TP berhasil dihapus!", "success");
    } catch (error) {
      console.error("❌ Delete error:", error);
      if (onShowToast)
        onShowToast(`Gagal menghapus: ${error.message}`, "error");
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from("tujuan_pembelajaran")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      loadTP();
      if (onShowToast) {
        onShowToast(
          `TP ${!currentStatus ? "diaktifkan" : "dinonaktifkan"}`,
          "success"
        );
      }
    } catch (error) {
      console.error("Error:", error);
      if (onShowToast) onShowToast(`Gagal: ${error.message}`, "error");
    }
  };

  if (loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${
          darkMode
            ? "bg-gradient-to-br from-gray-900 to-gray-800"
            : "bg-gradient-to-br from-blue-50 to-sky-100"
        }`}>
        <div className="text-center">
          <div
            className={`animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-4 mx-auto mb-3 sm:mb-4 transition-colors ${
              darkMode ? "border-blue-400" : "border-blue-600"
            }`}></div>
          <p
            className={`text-sm sm:text-base font-medium transition-colors ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}>
            Memuat data mengajar...
          </p>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div
        className={`min-h-screen py-4 sm:py-8 px-4 transition-colors duration-300 ${
          darkMode
            ? "bg-gradient-to-br from-gray-900 to-gray-800"
            : "bg-gradient-to-br from-blue-50 to-sky-100"
        }`}>
        <div className="max-w-7xl mx-auto">
          <div
            className={`rounded-2xl shadow-2xl p-4 sm:p-8 border transition-colors ${
              darkMode
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-blue-200"
            }`}>
            <div className="text-center py-8 sm:py-12">
              <div
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 ${
                  darkMode ? "bg-blue-900/30" : "bg-blue-100"
                }`}>
                <svg
                  className={`w-7 h-7 sm:w-8 sm:h-8 ${
                    darkMode ? "text-blue-400" : "text-blue-600"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3
                className={`text-lg sm:text-xl font-bold mb-2 transition-colors ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}>
                Tidak Dapat Mengakses
              </h3>
              <p
                className={`text-sm sm:text-base mb-6 transition-colors ${
                  darkMode ? "text-gray-300" : "text-gray-600"
                }`}>
                {errorMessage}
              </p>
              <button
                onClick={() => window.location.reload()}
                className={`px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-all duration-200 min-h-[44px] ${
                  darkMode
                    ? "bg-blue-600 hover:bg-blue-500 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}>
                Coba Lagi
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen py-4 sm:py-8 px-4 transition-colors duration-300 ${
        darkMode
          ? "bg-gradient-to-br from-gray-900 to-gray-800"
          : "bg-gradient-to-br from-blue-50 to-sky-100"
      }`}>
      <div className="max-w-7xl mx-auto">
        <div
          className={`rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8 border transition-colors ${
            darkMode
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-blue-200"
          }`}>
          <h2
            className={`text-lg md:text-xl lg:text-2xl font-bold mb-6 md:mb-8 transition-colors ${
              darkMode ? "text-white" : "text-gray-900"
            }`}>
            INPUT TUJUAN PEMBELAJARAN (TP)
          </h2>

          {/* Filter Section - Responsive Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 md:mb-8">
            <div>
              <label
                className={`block text-sm sm:text-base font-medium mb-1.5 sm:mb-2 transition-colors ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}>
                Pilih Tingkat
              </label>
              <select
                value={tingkat}
                onChange={(e) => setTingkat(e.target.value)}
                className={`w-full p-2.5 sm:p-3 border rounded-lg focus:ring-2 focus:outline-none transition-all text-sm sm:text-base min-h-[44px] ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-white focus:ring-blue-400 focus:border-blue-400"
                    : "bg-white border-blue-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                }`}>
                <option value="" disabled>
                  -- Pilih Tingkat --
                </option>
                <option value="7">Tingkat 7</option>
                <option value="8">Tingkat 8</option>
                <option value="9">Tingkat 9</option>
              </select>
            </div>

            <div>
              <label
                className={`block text-sm sm:text-base font-medium mb-1.5 sm:mb-2 transition-colors ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}>
                Pilih Mata Pelajaran
              </label>
              <select
                value={selectedMapel}
                onChange={(e) => setSelectedMapel(e.target.value)}
                className={`w-full p-2.5 sm:p-3 border rounded-lg focus:ring-2 focus:outline-none transition-all text-sm sm:text-base min-h-[44px] ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-white focus:ring-blue-400 focus:border-blue-400"
                    : "bg-white border-blue-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                }`}>
                <option value="" disabled className="text-gray-400">
                  -- Pilih Mata Pelajaran --
                </option>
                {availableSubjects.map((subject, idx) => (
                  <option key={idx} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 lg:col-span-1">
              <label
                className={`block text-sm sm:text-base font-medium mb-1.5 sm:mb-2 transition-colors ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}>
                Pilih Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className={`w-full p-2.5 sm:p-3 border rounded-lg focus:ring-2 focus:outline-none transition-all text-sm sm:text-base min-h-[44px] ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-white focus:ring-blue-400 focus:border-blue-400"
                    : "bg-white border-blue-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                }`}>
                <option value="" disabled className="text-gray-400">
                  -- Pilih Semester --
                </option>
                <option value="1">Semester Ganjil</option>
                <option value="2">Semester Genap</option>
              </select>
            </div>
          </div>

          {!selectedMapel || !tingkat || !semester ? (
            <div
              className={`text-center py-8 sm:py-12 rounded-xl border-2 border-dashed ${
                darkMode
                  ? "text-gray-400 border-gray-700 bg-gray-800/50"
                  : "text-gray-500 border-blue-300 bg-blue-50"
              }`}>
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <svg
                  className={`w-12 h-12 ${
                    darkMode ? "text-gray-600" : "text-blue-400"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <p className="text-base sm:text-lg font-medium mb-2">
                Pilih Mata Pelajaran, Tingkat, dan Semester
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Untuk memulai input Tujuan Pembelajaran
              </p>
            </div>
          ) : (
            <>
              {/* Action Buttons - Tetap di Kanan dengan Responsive Layout */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-6 md:mb-8 justify-end">
                <button
                  onClick={handleAddRow}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 min-h-[44px] w-full sm:w-auto ${
                    darkMode
                      ? "bg-blue-600 hover:bg-blue-500 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}>
                  <Plus size={18} />
                  <span className="text-sm sm:text-base">Tambah TP</span>
                </button>
                <button
                  onClick={handleDownloadTemplate}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 min-h-[44px] w-full sm:w-auto ${
                    darkMode
                      ? "bg-blue-700 hover:bg-blue-600 text-white"
                      : "bg-blue-700 hover:bg-blue-800 text-white"
                  }`}>
                  <Upload size={18} />
                  <span className="text-sm sm:text-base">
                    Download Template
                  </span>
                </button>
                <label
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg cursor-pointer transition-all duration-200 min-h-[44px] w-full sm:w-auto ${
                    darkMode
                      ? "bg-blue-800 hover:bg-blue-700 text-white"
                      : "bg-blue-800 hover:bg-blue-900 text-white"
                  }`}>
                  <Upload size={18} />
                  <span className="text-sm sm:text-base">Import TP</span>
                  <input
                    type="file"
                    accept=".xlsx"
                    onChange={handleImportExcel}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Table - Mobile Responsive */}
              <div className="overflow-hidden rounded-xl border">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px]">
                    <thead>
                      <tr className={darkMode ? "bg-blue-900" : "bg-blue-700"}>
                        <th
                          className={`p-3 sm:p-4 text-center text-white text-sm sm:text-base font-medium border-r ${
                            darkMode ? "border-blue-800" : "border-blue-600"
                          }`}>
                          No
                        </th>
                        <th
                          className={`p-3 sm:p-4 text-center text-white text-sm sm:text-base font-medium border-r ${
                            darkMode ? "border-blue-800" : "border-blue-600"
                          }`}>
                          Tingkat
                        </th>
                        <th
                          className={`p-3 sm:p-4 text-center text-white text-sm sm:text-base font-medium border-r ${
                            darkMode ? "border-blue-800" : "border-blue-600"
                          }`}>
                          Fase
                        </th>
                        <th
                          className={`p-3 sm:p-4 text-center text-white text-sm sm:text-base font-medium border-r ${
                            darkMode ? "border-blue-800" : "border-blue-600"
                          }`}>
                          Semester
                        </th>
                        <th
                          className={`p-3 sm:p-4 text-left text-white text-sm sm:text-base font-medium border-r ${
                            darkMode ? "border-blue-800" : "border-blue-600"
                          }`}>
                          Tujuan Pembelajaran
                        </th>
                        <th
                          className={`p-3 sm:p-4 text-center text-white text-sm sm:text-base font-medium border-r ${
                            darkMode ? "border-blue-800" : "border-blue-600"
                          }`}>
                          Status
                        </th>
                        <th
                          className={`p-3 sm:p-4 text-center text-white text-sm sm:text-base font-medium ${
                            darkMode ? "border-blue-800" : "border-blue-600"
                          }`}>
                          Hapus
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tpList.length === 0 ? (
                        <tr>
                          <td
                            colSpan="7"
                            className={`text-center py-8 sm:py-12 ${
                              darkMode
                                ? "text-gray-400 bg-gray-800/50"
                                : "text-gray-500 bg-blue-50"
                            }`}>
                            <div className="flex flex-col items-center">
                              <svg
                                className={`w-12 h-12 mb-3 ${
                                  darkMode ? "text-gray-600" : "text-blue-300"
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
                                />
                              </svg>
                              <p className="text-base font-medium mb-1">
                                Belum ada data Tujuan Pembelajaran
                              </p>
                              <p className="text-sm">
                                Tambah data atau import dari Excel
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        tpList.map((tp, idx) => (
                          <tr
                            key={tp.id}
                            className={`border-b ${
                              darkMode
                                ? "border-gray-700 hover:bg-gray-700/50"
                                : "border-blue-100 hover:bg-blue-50"
                            }`}>
                            {editingId === tp.id ? (
                              <>
                                <td
                                  className={`p-3 sm:p-4 text-center text-sm sm:text-base border-r ${
                                    darkMode
                                      ? "border-gray-700 text-gray-300"
                                      : "border-blue-100 text-gray-700"
                                  }`}>
                                  {idx + 1}
                                </td>
                                <td
                                  className={`p-2 sm:p-3 border-r ${
                                    darkMode
                                      ? "border-gray-700"
                                      : "border-blue-100"
                                  }`}>
                                  <input
                                    type="text"
                                    value={editData.tingkat || ""}
                                    onChange={(e) =>
                                      setEditData({
                                        ...editData,
                                        tingkat: e.target.value,
                                      })
                                    }
                                    className={`w-full p-2 sm:p-2.5 border rounded text-center text-sm sm:text-base min-h-[44px] ${
                                      darkMode
                                        ? "bg-gray-600 border-gray-500 text-white focus:ring-blue-400 focus:border-blue-400"
                                        : "bg-white border-blue-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                                    }`}
                                    placeholder="7"
                                  />
                                </td>
                                <td
                                  className={`p-2 sm:p-3 border-r ${
                                    darkMode
                                      ? "border-gray-700"
                                      : "border-blue-100"
                                  }`}>
                                  <input
                                    type="text"
                                    value={editData.fase || ""}
                                    onChange={(e) =>
                                      setEditData({
                                        ...editData,
                                        fase: e.target.value,
                                      })
                                    }
                                    className={`w-full p-2 sm:p-2.5 border rounded text-center text-sm sm:text-base min-h-[44px] ${
                                      darkMode
                                        ? "bg-gray-600 border-gray-500 text-white focus:ring-blue-400 focus:border-blue-400"
                                        : "bg-white border-blue-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                                    }`}
                                    placeholder="D"
                                  />
                                </td>
                                <td
                                  className={`p-3 sm:p-4 text-center border-r ${
                                    darkMode
                                      ? "border-gray-700"
                                      : "border-blue-100"
                                  }`}>
                                  <span
                                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${
                                      semester === "1"
                                        ? darkMode
                                          ? "bg-orange-900/30 text-orange-300"
                                          : "bg-orange-100 text-orange-800"
                                        : darkMode
                                        ? "bg-green-900/30 text-green-300"
                                        : "bg-green-100 text-green-800"
                                    }`}>
                                    {semester === "1" ? "Ganjil" : "Genap"}
                                  </span>
                                </td>
                                <td
                                  className={`p-2 sm:p-3 border-r ${
                                    darkMode
                                      ? "border-gray-700"
                                      : "border-blue-100"
                                  }`}>
                                  <textarea
                                    value={editData.deskripsi_tp || ""}
                                    onChange={(e) =>
                                      setEditData({
                                        ...editData,
                                        deskripsi_tp: e.target.value,
                                      })
                                    }
                                    className={`w-full p-2 sm:p-2.5 border rounded text-sm sm:text-base min-h-[60px] resize-y ${
                                      darkMode
                                        ? "bg-gray-600 border-gray-500 text-white focus:ring-blue-400 focus:border-blue-400"
                                        : "bg-white border-blue-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                                    }`}
                                    placeholder="Masukkan tujuan pembelajaran..."
                                  />
                                </td>
                                <td colSpan="2" className="p-2 sm:p-3">
                                  <div className="flex gap-2 justify-center">
                                    <button
                                      onClick={handleSave}
                                      className={`p-2 sm:p-2.5 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors ${
                                        darkMode
                                          ? "bg-green-600 hover:bg-green-500 text-white"
                                          : "bg-green-600 hover:bg-green-700 text-white"
                                      }`}
                                      title="Simpan">
                                      <Save size={18} />
                                    </button>
                                    <button
                                      onClick={handleCancel}
                                      className={`p-2 sm:p-2.5 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors ${
                                        darkMode
                                          ? "bg-gray-600 hover:bg-gray-500 text-white"
                                          : "bg-gray-600 hover:bg-gray-700 text-white"
                                      }`}
                                      title="Batal">
                                      <X size={18} />
                                    </button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td
                                  className={`p-3 sm:p-4 text-center text-sm sm:text-base border-r ${
                                    darkMode
                                      ? "border-gray-700 text-gray-300"
                                      : "border-blue-100 text-gray-700"
                                  }`}>
                                  {idx + 1}
                                </td>
                                <td
                                  className={`p-3 sm:p-4 text-center text-sm sm:text-base border-r ${
                                    darkMode
                                      ? "border-gray-700 text-gray-300"
                                      : "border-blue-100 text-gray-700"
                                  }`}>
                                  {tp.tingkat}
                                </td>
                                <td
                                  className={`p-3 sm:p-4 text-center text-sm sm:text-base border-r ${
                                    darkMode
                                      ? "border-gray-700 text-gray-300"
                                      : "border-blue-100 text-gray-700"
                                  }`}>
                                  {tp.fase}
                                </td>
                                <td
                                  className={`p-3 sm:p-4 text-center border-r ${
                                    darkMode
                                      ? "border-gray-700"
                                      : "border-blue-100"
                                  }`}>
                                  <span
                                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${
                                      tp.semester === "1"
                                        ? darkMode
                                          ? "bg-orange-900/30 text-orange-300"
                                          : "bg-orange-100 text-orange-800"
                                        : darkMode
                                        ? "bg-green-900/30 text-green-300"
                                        : "bg-green-100 text-green-800"
                                    }`}>
                                    {tp.semester === "1" ? "Ganjil" : "Genap"}
                                  </span>
                                </td>
                                <td
                                  className={`p-3 sm:p-4 text-sm sm:text-base border-r ${
                                    darkMode ? "text-gray-200" : "text-gray-900"
                                  }`}>
                                  {tp.deskripsi_tp}
                                </td>
                                <td
                                  className={`p-3 sm:p-4 text-center border-r ${
                                    darkMode
                                      ? "border-gray-700"
                                      : "border-blue-100"
                                  }`}>
                                  <button
                                    onClick={() =>
                                      handleToggleStatus(tp.id, tp.is_active)
                                    }
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                      tp.is_active
                                        ? "bg-green-500"
                                        : "bg-gray-300"
                                    }`}>
                                    <span
                                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        tp.is_active
                                          ? "translate-x-6"
                                          : "translate-x-1"
                                      }`}
                                    />
                                  </button>
                                </td>
                                <td className="p-2 sm:p-3">
                                  <button
                                    onClick={() => handleDelete(tp.id)}
                                    className={`p-2 sm:p-2.5 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors ${
                                      darkMode
                                        ? "bg-red-600 hover:bg-red-500 text-white"
                                        : "bg-red-600 hover:bg-red-700 text-white"
                                    }`}
                                    title="Hapus">
                                    <Trash2 size={18} />
                                  </button>
                                </td>
                              </>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default InputTP;
