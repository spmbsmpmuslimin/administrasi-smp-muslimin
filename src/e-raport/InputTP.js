//[file name]: InputTP.js
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import ExcelJS from "exceljs";
import { Upload, Plus, Trash2, Edit2, Save, X } from "lucide-react";

function InputTP({ user, onShowToast, darkMode }) {
  const [kelas, setKelas] = useState("");
  const [selectedMapel, setSelectedMapel] = useState("");
  const [semester, setSemester] = useState(""); // Tambah state semester
  const [tpList, setTpList] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [academicYear, setAcademicYear] = useState(null);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Fungsi untuk mendapatkan fase berdasarkan angka kelas
  const getFaseByKelas = (kelasNumber) => {
    if (kelasNumber >= 1 && kelasNumber <= 2) return "A";
    if (kelasNumber >= 3 && kelasNumber <= 4) return "B";
    if (kelasNumber >= 5 && kelasNumber <= 6) return "C";
    if (kelasNumber >= 7 && kelasNumber <= 9) return "D";
    return "D";
  };

  // Load data awal
  useEffect(() => {
    loadUserAndAssignments();
  }, []);

  // Load TP ketika mapel, kelas, dan semester dipilih
  useEffect(() => {
    if (selectedMapel && academicYear && kelas && semester) {
      loadTP();
    }
  }, [selectedMapel, academicYear, kelas, semester]);

  const loadUserAndAssignments = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      // PERUBAHAN 1: Pisahkan teacherCode (VARCHAR) dan userId (UUID)
      const teacherCode = user.teacher_id;
      const userId = user.id;

      if (!teacherCode) {
        throw new Error("Teacher ID tidak ditemukan dalam session.");
      }

      // 1. CEK SESSION & DEBUG
      console.log("📱 User Data from Props:", user);
      console.log("🔍 User Keys:", Object.keys(user || {}));
      console.log("🆔 user.teacher_id:", user?.teacher_id);
      console.log("🆔 user.id:", user?.id);

      if (!user) {
        throw new Error("Session tidak valid. Silakan login ulang.");
      }

      console.log("👨‍🏫 Teacher Code yang digunakan:", teacherCode);
      console.log("👨‍🏫 User ID yang digunakan:", userId);

      // 2. Ambil academic year aktif
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

      // PERUBAHAN 2: Query teacher_assignments menggunakan teacherCode (VARCHAR)
      console.log("📚 Querying teacher_assignments...");
      console.log("   - teacher_id:", teacherCode);
      console.log("   - academic_year_id:", academicYearData.id);

      const { data: assignments, error: assignmentsError } = await supabase
        .from("teacher_assignments")
        .select("*")
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

      // 3. Ambil data classes secara terpisah
      const classIds = [...new Set(assignments.map((a) => a.class_id))];
      console.log("🎓 Class IDs to fetch:", classIds);

      const { data: classesData, error: classesError } = await supabase
        .from("classes")
        .select("id, grade")
        .in("id", classIds);

      console.log("🏫 Classes data:", classesData);

      if (classesError) {
        console.error("❌ Classes error:", classesError);
      }

      // 4. Gabungkan data assignments dengan classes
      const assignmentsWithClasses = assignments.map((assignment) => ({
        ...assignment,
        classes: classesData?.find((c) => c.id === assignment.class_id) || null,
      }));

      console.log("✅ Final assignments with classes:", assignmentsWithClasses);

      setTeacherAssignments(assignmentsWithClasses);

      // 5. Ekstrak data unik untuk dropdown (HANYA SEKALI!)
      const uniqueClasses = [];
      const uniqueSubjects = [];
      const seenClasses = new Set();
      const seenSubjects = new Set();

      assignmentsWithClasses.forEach((assignment) => {
        console.log("📝 Processing assignment:", assignment);

        // Kelas - GUNAKAN classes.id (7E, 8A, dst)
        const classId = assignment.class_id;
        const classData = assignment.classes;

        if (classId && classData && !seenClasses.has(classId)) {
          seenClasses.add(classId);
          uniqueClasses.push({
            id: classData.id,
            grade: classData.id,
          });
        }

        // Mapel (subject)
        if (assignment.subject && !seenSubjects.has(assignment.subject)) {
          seenSubjects.add(assignment.subject);
          uniqueSubjects.push(assignment.subject);
        }
      });

      console.log("🎓 Unique Classes:", uniqueClasses);
      console.log("📚 Unique Subjects:", uniqueSubjects);

      setAvailableClasses(uniqueClasses);
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
      console.log("Kelas selected:", kelas);
      console.log("Mapel selected:", selectedMapel);
      console.log("Semester selected:", semester);
      console.log("Academic Year:", academicYear);

      // Cari class_id dari kelas yang dipilih
      const selectedClass = availableClasses.find((c) => c.grade === kelas);
      if (!selectedClass) {
        console.error("Selected class not found");
        if (onShowToast) {
          onShowToast("Kelas tidak ditemukan dalam data!", "error");
        }
        return;
      }

      console.log("Selected Class ID:", selectedClass.id);

      // Query TP dengan filter semester
      const { data, error } = await supabase
        .from("tujuan_pembelajaran")
        .select("*")
        .eq("class_id", selectedClass.id)
        .eq("mata_pelajaran", selectedMapel)
        .eq("semester", semester) // Tambah filter semester
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
            "Belum ada data TP untuk kelas/mapel/semester ini",
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
      // Cari class_id dari kelas yang dipilih
      const selectedClass = availableClasses.find((c) => c.grade === kelas);
      if (!selectedClass) {
        if (onShowToast) onShowToast("Kelas tidak ditemukan!", "error");
        return;
      }

      // Ambil angka kelas dari grade (misal: "7E" → 7)
      const kelasNumber = parseInt(kelas.match(/\d+/)?.[0] || "0");
      const tingkatDefault = kelasNumber;
      const faseDefault = getFaseByKelas(kelasNumber);

      const workbook = new ExcelJS.Workbook();
      const buffer = await file.arrayBuffer();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.getWorksheet(1);
      const imported = [];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 6) {
          // Skip header
          const noCell = row.getCell(1).value;
          if (noCell && !isNaN(noCell)) {
            imported.push({
              class_id: selectedClass.id,
              tingkat: row.getCell(2).value || tingkatDefault,
              fase: row.getCell(3).value || faseDefault,
              deskripsi_tp: row.getCell(4).value,
              urutan: Number(noCell),
              mata_pelajaran: selectedMapel,
              tahun_ajaran_id: academicYear?.id,
              semester: semester, // Gunakan semester yang dipilih
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
      // Validasi semester dipilih
      if (!semester) {
        if (onShowToast)
          onShowToast("Pilih semester terlebih dahulu!", "warning");
        return;
      }

      // Ambil angka kelas dari grade
      const kelasNumber = parseInt(kelas.match(/\d+/)?.[0] || "0");
      const tingkatDefault = kelasNumber;
      const faseDefault = getFaseByKelas(kelasNumber);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Template TP");

      // Header
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
        fgColor: { argb: "FF7B1FA2" },
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

      worksheet.getCell("A3").value = `Kelas: ${kelas}`;
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

      // Table header
      const headerRow = worksheet.getRow(6);
      const headers = ["NO", "TINGKAT", "FASE", "TUJUAN PEMBELAJARAN"];

      headers.forEach((header, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF0D47A1" },
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      // Column widths
      worksheet.getColumn(1).width = 5;
      worksheet.getColumn(2).width = 10;
      worksheet.getColumn(3).width = 8;
      worksheet.getColumn(4).width = 70;

      // Example data
      const exampleRows = [
        [
          1,
          tingkatDefault,
          faseDefault,
          "Siswa mampu menjelaskan konsep dasar...",
        ],
        [2, tingkatDefault, faseDefault, "Siswa mampu menganalisis..."],
        [3, tingkatDefault, faseDefault, "Siswa mampu membuat..."],
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

      // Download
      workbook.xlsx.writeBuffer().then((buffer) => {
        const blob = new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Template_TP_${selectedMapel}_${kelas}_Semester_${semester}.xlsx`;
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
      // Validasi semester dipilih
      if (!semester) {
        if (onShowToast)
          onShowToast("Pilih semester terlebih dahulu!", "warning");
        return;
      }

      // Cari class_id dari kelas yang dipilih
      const selectedClass = availableClasses.find((c) => c.grade === kelas);
      if (!selectedClass) {
        if (onShowToast) onShowToast("Kelas tidak ditemukan!", "error");
        return;
      }

      // Ambil angka kelas
      const kelasNumber = parseInt(kelas.match(/\d+/)?.[0] || "0");
      const tingkatDefault = kelasNumber;
      const faseDefault = getFaseByKelas(kelasNumber);

      const newRow = {
        class_id: selectedClass.id,
        tingkat: tingkatDefault,
        fase: faseDefault,
        deskripsi_tp: "",
        urutan: tpList.length + 1,
        mata_pelajaran: selectedMapel,
        tahun_ajaran_id: academicYear?.id,
        semester: semester, // Gunakan semester yang dipilih
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
          semester: semester, // Update semester juga
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

  if (loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${
          darkMode
            ? "bg-gradient-to-br from-gray-900 to-gray-800"
            : "bg-gradient-to-br from-blue-50 to-indigo-100"
        }`}>
        <div className="text-center">
          <div
            className={`animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-4 mx-auto mb-3 sm:mb-4 transition-colors ${
              darkMode ? "border-blue-400" : "border-blue-600"
            }`}></div>
          <p
            className={`text-sm sm:text-base font-medium transition-colors ${
              darkMode ? "text-gray-300" : "text-gray-600"
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
            : "bg-gradient-to-br from-blue-50 to-indigo-100"
        }`}>
        <div className="max-w-7xl mx-auto">
          <div
            className={`rounded-2xl shadow-2xl p-4 sm:p-8 border transition-colors ${
              darkMode
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}>
            <div className="text-center py-8 sm:py-12">
              <div
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 ${
                  darkMode ? "bg-red-900/30" : "bg-red-100"
                }`}>
                <svg
                  className={`w-7 h-7 sm:w-8 sm:h-8 ${
                    darkMode ? "text-red-400" : "text-red-600"
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
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}>
                {errorMessage}
              </p>
              <button
                onClick={() => window.location.reload()}
                className={`px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-all duration-200 ${
                  darkMode
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-red-600 hover:bg-red-700 text-white"
                } min-h-[44px]`}>
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
          : "bg-gradient-to-br from-blue-50 to-indigo-100"
      }`}>
      <div className="max-w-7xl mx-auto">
        <div
          className={`rounded-2xl shadow-2xl p-4 sm:p-8 border transition-colors ${
            darkMode
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          }`}>
          <h2
            className={`text-base md:text-lg lg:text-xl font-bold mb-4 md:mb-6 transition-colors ${
              darkMode ? "text-white" : "text-gray-900"
            }`}>
            INPUT TUJUAN PEMBELAJARAN (TP)
          </h2>
          {/* Filter Section - Diubah menjadi 3 kolom */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div>
              <label
                className={`block text-sm font-semibold mb-2 transition-colors ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}>
                Pilih Kelas
              </label>
              <select
                value={kelas}
                onChange={(e) => setKelas(e.target.value)}
                className={`w-full p-3 border rounded-lg focus:ring-2 transition-all text-sm sm:text-base min-h-[44px] ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-white focus:ring-red-400"
                    : "bg-white border-gray-300 text-gray-900 focus:ring-red-500"
                }`}>
                <option value="" disabled>
                  -- Pilih Kelas --
                </option>
                {availableClasses.map((cls) => (
                  <option key={cls.id} value={cls.grade}>
                    {cls.grade}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className={`block text-sm font-semibold mb-2 transition-colors ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}>
                Pilih Mata Pelajaran
              </label>
              <select
                value={selectedMapel}
                onChange={(e) => setSelectedMapel(e.target.value)}
                className={`w-full p-3 border rounded-lg focus:ring-2 transition-all text-sm sm:text-base min-h-[44px] ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-white focus:ring-red-400"
                    : "bg-white border-gray-300 text-gray-900 focus:ring-red-500"
                }`}>
                <option value="" disabled>
                  -- Pilih Mata Pelajaran --
                </option>
                {availableSubjects.map((subject, idx) => (
                  <option key={idx} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>

            {/* Tambah dropdown semester */}
            <div>
              <label
                className={`block text-sm font-semibold mb-2 transition-colors ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}>
                Pilih Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className={`w-full p-3 border rounded-lg focus:ring-2 transition-all text-sm sm:text-base min-h-[44px] ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-white focus:ring-red-400"
                    : "bg-white border-gray-300 text-gray-900 focus:ring-red-500"
                }`}>
                <option value="" disabled>
                  -- Pilih Semester --
                </option>
                <option value="1">Semester Ganjil</option>
                <option value="2">Semester Genap</option>
              </select>
            </div>
          </div>

          {!selectedMapel || !kelas || !semester ? (
            <div
              className={`text-center py-8 sm:py-12 ${
                darkMode ? "text-gray-400" : "text-gray-500"
              }`}>
              <p className="text-base sm:text-lg">
                Silakan pilih Kelas, Mata Pelajaran, dan Semester terlebih
                dahulu
              </p>
            </div>
          ) : (
            <>
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6 justify-end">
                <button
                  onClick={handleAddRow}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors min-h-[44px] w-full sm:w-auto text-sm sm:text-base ${
                    darkMode
                      ? "bg-red-700 hover:bg-red-600 text-white"
                      : "bg-red-800 hover:bg-red-900 text-white"
                  }`}>
                  <Plus size={18} />
                  <span>Tambah TP</span>
                </button>
                <button
                  onClick={handleDownloadTemplate}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors min-h-[44px] w-full sm:w-auto text-sm sm:text-base ${
                    darkMode
                      ? "bg-red-700 hover:bg-red-600 text-white"
                      : "bg-red-800 hover:bg-red-900 text-white"
                  }`}>
                  <Upload size={18} />
                  <span>Download Template</span>
                </button>
                <label
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg cursor-pointer transition-colors min-h-[44px] w-full sm:w-auto text-sm sm:text-base ${
                    darkMode
                      ? "bg-red-700 hover:bg-red-600 text-white"
                      : "bg-red-800 hover:bg-red-900 text-white"
                  }`}>
                  <Upload size={18} />
                  <span>Import TP</span>
                  <input
                    type="file"
                    accept=".xlsx"
                    onChange={handleImportExcel}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className={darkMode ? "bg-red-900" : "bg-red-800"}>
                      <th
                        className={`border-b border-r p-2 sm:p-3 w-16 text-sm sm:text-base ${
                          darkMode ? "border-red-800" : "border-red-700"
                        }`}>
                        No
                      </th>
                      <th
                        className={`border-b border-r p-2 sm:p-3 w-24 text-sm sm:text-base ${
                          darkMode ? "border-red-800" : "border-red-700"
                        }`}>
                        Tingkat
                      </th>
                      <th
                        className={`border-b border-r p-2 sm:p-3 w-24 text-sm sm:text-base ${
                          darkMode ? "border-red-800" : "border-red-700"
                        }`}>
                        Fase
                      </th>
                      <th
                        className={`border-b border-r p-2 sm:p-3 text-sm sm:text-base ${
                          darkMode ? "border-red-800" : "border-red-700"
                        }`}>
                        Tujuan Pembelajaran
                      </th>
                      <th
                        className={`border-b border-r p-2 sm:p-3 w-28 text-sm sm:text-base ${
                          darkMode ? "border-red-800" : "border-red-700"
                        }`}>
                        Semester
                      </th>
                      <th
                        className={`border-b p-2 sm:p-3 w-32 text-sm sm:text-base ${
                          darkMode ? "border-red-800" : "border-red-700"
                        }`}>
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tpList.length === 0 ? (
                      <tr>
                        <td
                          colSpan="6"
                          className={`text-center py-8 ${
                            darkMode ? "text-gray-400" : "text-gray-500"
                          }`}>
                          Belum ada data Tujuan Pembelajaran untuk semester{" "}
                          {semester}. Tambah atau import data.
                        </td>
                      </tr>
                    ) : (
                      tpList.map((tp, idx) => (
                        <tr
                          key={tp.id}
                          className={`border-b ${
                            darkMode
                              ? "border-gray-700 hover:bg-gray-700"
                              : "border-gray-200 hover:bg-gray-50"
                          }`}>
                          <td
                            className={`border-r p-2 sm:p-3 text-center text-sm sm:text-base ${
                              darkMode ? "border-gray-700" : "border-gray-200"
                            }`}>
                            {idx + 1}
                          </td>

                          {editingId === tp.id ? (
                            <>
                              <td
                                className={`border-r p-2 sm:p-3 ${
                                  darkMode
                                    ? "border-gray-700"
                                    : "border-gray-200"
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
                                  className={`w-full p-2 border rounded text-center text-sm sm:text-base min-h-[44px] ${
                                    darkMode
                                      ? "bg-gray-600 border-gray-500 text-white"
                                      : "bg-white border-gray-300 text-gray-900"
                                  }`}
                                  placeholder="7"
                                />
                              </td>
                              <td
                                className={`border-r p-2 sm:p-3 ${
                                  darkMode
                                    ? "border-gray-700"
                                    : "border-gray-200"
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
                                  className={`w-full p-2 border rounded text-center text-sm sm:text-base min-h-[44px] ${
                                    darkMode
                                      ? "bg-gray-600 border-gray-500 text-white"
                                      : "bg-white border-gray-300 text-gray-900"
                                  }`}
                                  placeholder="D"
                                />
                              </td>
                              <td
                                className={`border-r p-2 sm:p-3 ${
                                  darkMode
                                    ? "border-gray-700"
                                    : "border-gray-200"
                                }`}>
                                <textarea
                                  value={editData.deskripsi_tp || ""}
                                  onChange={(e) =>
                                    setEditData({
                                      ...editData,
                                      deskripsi_tp: e.target.value,
                                    })
                                  }
                                  className={`w-full p-2 border rounded text-sm sm:text-base min-h-[60px] ${
                                    darkMode
                                      ? "bg-gray-600 border-gray-500 text-white"
                                      : "bg-white border-gray-300 text-gray-900"
                                  }`}
                                  placeholder="Masukkan tujuan pembelajaran..."
                                />
                              </td>
                              <td
                                className={`border-r p-2 sm:p-3 text-center ${
                                  darkMode
                                    ? "border-gray-700"
                                    : "border-gray-200"
                                }`}>
                                <span
                                  className={`px-3 py-1.5 rounded-full text-xs font-medium ${
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
                              <td className="p-2 sm:p-3">
                                <div className="flex gap-2 justify-center">
                                  <button
                                    onClick={handleSave}
                                    className={`p-2 sm:p-3 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors ${
                                      darkMode
                                        ? "bg-green-700 hover:bg-green-600 text-white"
                                        : "bg-green-600 hover:bg-green-700 text-white"
                                    }`}
                                    title="Simpan">
                                    <Save size={16} />
                                  </button>
                                  <button
                                    onClick={handleCancel}
                                    className={`p-2 sm:p-3 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors ${
                                      darkMode
                                        ? "bg-gray-700 hover:bg-gray-600 text-white"
                                        : "bg-gray-600 hover:bg-gray-700 text-white"
                                    }`}
                                    title="Batal">
                                    <X size={16} />
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td
                                className={`border-r p-2 sm:p-3 text-center text-sm sm:text-base ${
                                  darkMode
                                    ? "border-gray-700"
                                    : "border-gray-200"
                                }`}>
                                {tp.tingkat}
                              </td>
                              <td
                                className={`border-r p-2 sm:p-3 text-center text-sm sm:text-base ${
                                  darkMode
                                    ? "border-gray-700"
                                    : "border-gray-200"
                                }`}>
                                {tp.fase}
                              </td>
                              <td
                                className={`border-r p-2 sm:p-3 text-sm sm:text-base ${
                                  darkMode ? "text-gray-100" : "text-gray-900"
                                }`}>
                                {tp.deskripsi_tp}
                              </td>
                              <td
                                className={`border-r p-2 sm:p-3 text-center ${
                                  darkMode
                                    ? "border-gray-700"
                                    : "border-gray-200"
                                }`}>
                                <span
                                  className={`px-3 py-1.5 rounded-full text-xs font-medium ${
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
                              <td className="p-2 sm:p-3">
                                <div className="flex gap-2 justify-center">
                                  <button
                                    onClick={() => handleEdit(tp)}
                                    className={`p-2 sm:p-3 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors ${
                                      darkMode
                                        ? "bg-blue-700 hover:bg-blue-600 text-white"
                                        : "bg-blue-600 hover:bg-blue-700 text-white"
                                    }`}
                                    title="Edit">
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(tp.id)}
                                    className={`p-2 sm:p-3 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors ${
                                      darkMode
                                        ? "bg-red-700 hover:bg-red-600 text-white"
                                        : "bg-red-600 hover:bg-red-700 text-white"
                                    }`}
                                    title="Hapus">
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default InputTP;
