import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import ExcelJS from "exceljs";
import { Save, Download, Upload } from "lucide-react";

function InputNilai({ user, onShowToast, darkMode }) {
  const [kelas, setKelas] = useState("");
  const [selectedMapel, setSelectedMapel] = useState("");
  const [semester, setSemester] = useState("");
  const [siswaList, setSiswaList] = useState([]);
  const [tpList, setTpList] = useState([]);
  const [academicYear, setAcademicYear] = useState(null);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef(null);

  // Load data awal
  useEffect(() => {
    loadUserAndAssignments();
  }, []);

  // Load data saat filter berubah
  useEffect(() => {
    if (kelas && selectedMapel && semester && academicYear) {
      loadData();
    }
  }, [kelas, selectedMapel, semester, academicYear]);

  const loadUserAndAssignments = async () => {
    try {
      setLoading(true);

      if (!user) {
        throw new Error("Session tidak valid. Silakan login ulang.");
      }

      const teacherId = user.teacher_id || user.id;
      if (!teacherId) {
        throw new Error("Teacher ID tidak ditemukan dalam session.");
      }

      // Ambil academic year aktif
      const { data: academicYearData, error: ayError } = await supabase
        .from("academic_years")
        .select("*")
        .eq("is_active", true)
        .single();

      if (ayError || !academicYearData) {
        throw new Error("Tahun ajaran aktif tidak ditemukan.");
      }

      setAcademicYear(academicYearData);

      // Ambil teacher assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from("teacher_assignments")
        .select("*")
        .eq("teacher_id", teacherId)
        .eq("academic_year_id", academicYearData.id);

      if (assignmentsError) {
        throw new Error(
          `Gagal load tugas mengajar: ${assignmentsError.message}`
        );
      }

      if (!assignments || assignments.length === 0) {
        if (onShowToast)
          onShowToast(
            "Anda belum ditugaskan mengajar kelas/mapel apapun.",
            "warning"
          );
        setLoading(false);
        return;
      }

      // Ambil data classes
      const classIds = [...new Set(assignments.map((a) => a.class_id))];
      const { data: classesData } = await supabase
        .from("classes")
        .select("id, grade")
        .in("id", classIds);

      // Gabungkan data assignments dengan classes
      const assignmentsWithClasses = assignments.map((assignment) => ({
        ...assignment,
        classes: classesData?.find((c) => c.id === assignment.class_id) || null,
      }));

      setTeacherAssignments(assignmentsWithClasses);

      // Ekstrak data unik untuk dropdown
      const uniqueClasses = [];
      const uniqueSubjects = [];
      const seenClasses = new Set();
      const seenSubjects = new Set();

      assignmentsWithClasses.forEach((assignment) => {
        const classId = assignment.class_id;
        const classData = assignment.classes;
        if (classId && classData && !seenClasses.has(classId)) {
          seenClasses.add(classId);
          uniqueClasses.push({
            id: classData.id,
            grade: classData.id,
          });
        }

        if (assignment.subject && !seenSubjects.has(assignment.subject)) {
          seenSubjects.add(assignment.subject);
          uniqueSubjects.push(assignment.subject);
        }
      });

      setAvailableClasses(uniqueClasses);
      setAvailableSubjects(uniqueSubjects);
      setLoading(false);

      if (onShowToast) onShowToast("Data mengajar berhasil dimuat!", "success");
    } catch (error) {
      console.error("Error in loadUserAndAssignments:", error);
      if (onShowToast) onShowToast(`Error: ${error.message}`, "error");
      setLoading(false);
    }
  };

  const loadData = async () => {
    if (!kelas || !selectedMapel || !semester || !academicYear) return;

    setLoading(true);
    try {
      const selectedClass = availableClasses.find((c) => c.grade === kelas);
      if (!selectedClass) {
        if (onShowToast) onShowToast("Kelas tidak ditemukan!", "error");
        return;
      }

      // AMBIL KKM
      const { data: kkmData, error: kkmError } = await supabase
        .from("raport_config")
        .select("kkm")
        .eq("class_id", selectedClass.id)
        .eq("mata_pelajaran", selectedMapel)
        .eq("tahun_ajaran_id", academicYear.id)
        .maybeSingle();

      if (kkmError) {
        console.warn("⚠️ KKM error:", kkmError);
      }

      const kkm = kkmData?.kkm || 75;

      // LOAD SISWA
      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("id, nis, full_name")
        .eq("class_id", selectedClass.id)
        .eq("is_active", true)
        .order("full_name");

      if (studentsError) {
        throw new Error(`Gagal load siswa: ${studentsError.message}`);
      }

      // LOAD TP
      const { data: tp } = await supabase
        .from("tujuan_pembelajaran")
        .select("*")
        .eq("class_id", selectedClass.id)
        .eq("mata_pelajaran", selectedMapel)
        .eq("semester", semester)
        .eq("tahun_ajaran_id", academicYear.id)
        .order("urutan");

      setTpList(tp || []);

      // LOAD EXISTING NILAI
      const { data: existingNilai, error: nilaiError } = await supabase
        .from("nilai_eraport")
        .select(
          `
    id,
    student_id,
    nilai_akhir,
    nilai_eraport_detail (
      id,
      tujuan_pembelajaran_id,
      status_tercapai
    )
  `
        )
        .eq("class_id", selectedClass.id)
        .eq("mata_pelajaran", selectedMapel)
        .eq("semester", semester)
        .eq("tahun_ajaran_id", academicYear.id);

      // TAMBAHKAN 3 BARIS INI:
      console.log(
        "🔍 existingNilai FULL:",
        JSON.stringify(existingNilai, null, 2)
      );
      console.log("🔍 Sample student:", existingNilai?.[0]);
      console.log("🔍 Detail TP:", existingNilai?.[0]?.nilai_eraport_detail);

      if (nilaiError) {
        console.error("❌ Error loading nilai:", nilaiError);
      }

      console.log("📊 Existing nilai loaded:", existingNilai?.length || 0);

      // MERGE DATA
      const merged = (students || []).map((siswa) => {
        const nilai = existingNilai?.find((n) => n.student_id === siswa.id);

        const nilaiAkhir = nilai?.nilai_akhir || 0;

        return {
          id: siswa.id,
          nis: siswa.nis,
          full_name: siswa.full_name,
          nilai_akhir: nilaiAkhir,
          kkm: kkm,
          rapor_id: nilai?.id,
          tp_tercapai:
            nilai?.nilai_eraport_detail
              ?.filter(
                (d) =>
                  d.status_tercapai === true || d.status_tercapai === "true"
              )
              .map((d) => d.tujuan_pembelajaran_id) || [],
          tp_perlu_peningkatan:
            nilai?.nilai_eraport_detail
              ?.filter(
                (d) =>
                  d.status_tercapai === false || d.status_tercapai === "false"
              )
              .map((d) => d.tujuan_pembelajaran_id) || [],
        };
      });

      setSiswaList(merged);
    } catch (error) {
      console.error("❌ Error loading data:", error);
      if (onShowToast)
        onShowToast(`Gagal memuat data: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleNilaiChange = (studentId, value) => {
    const updated = siswaList.map((siswa) => {
      if (siswa.id === studentId) {
        const nilai = parseInt(value) || 0;
        return { ...siswa, nilai_akhir: nilai };
      }
      return siswa;
    });
    setSiswaList(updated);
  };

  const handleTPChange = (studentId, tpId, type) => {
    const updatedSiswaList = siswaList.map((siswa) => {
      if (siswa.id === studentId) {
        let tpTercapai = [...siswa.tp_tercapai];
        let tpPerluPeningkatan = [...siswa.tp_perlu_peningkatan];

        if (type === "tercapai") {
          if (tpTercapai.includes(tpId)) {
            tpTercapai = tpTercapai.filter((id) => id !== tpId);
          } else {
            tpTercapai.push(tpId);
            tpPerluPeningkatan = tpPerluPeningkatan.filter((id) => id !== tpId);
          }
        } else {
          if (tpPerluPeningkatan.includes(tpId)) {
            tpPerluPeningkatan = tpPerluPeningkatan.filter((id) => id !== tpId);
          } else {
            tpPerluPeningkatan.push(tpId);
            tpTercapai = tpTercapai.filter((id) => id !== tpId);
          }
        }

        return {
          ...siswa,
          tp_tercapai: tpTercapai,
          tp_perlu_peningkatan: tpPerluPeningkatan,
        };
      }
      return siswa;
    });

    setSiswaList(updatedSiswaList);
  };

  const handleSave = async () => {
    if (!kelas || !selectedMapel || !semester) {
      if (onShowToast)
        onShowToast(
          "Pilih Kelas, Mapel, dan Semester terlebih dahulu!",
          "warning"
        );
      return;
    }

    if (siswaList.length === 0) {
      if (onShowToast)
        onShowToast("Tidak ada data siswa untuk disimpan!", "warning");
      return;
    }

    if (!window.confirm(`Simpan nilai untuk ${siswaList.length} siswa?`))
      return;

    setSaving(true);
    setSaveProgress({ current: 0, total: siswaList.length });

    try {
      const selectedClass = availableClasses.find((c) => c.grade === kelas);
      if (!selectedClass) throw new Error("Kelas tidak ditemukan!");

      const userId = user.id;
      const { data: kkmData } = await supabase
        .from("raport_config")
        .select("kkm")
        .eq("class_id", selectedClass.id)
        .eq("mata_pelajaran", selectedMapel)
        .eq("tahun_ajaran_id", academicYear.id)
        .single();

      const kkm = kkmData?.kkm || 75;

      for (let i = 0; i < siswaList.length; i++) {
        const siswa = siswaList[i];
        let raporId = siswa.rapor_id;

        const nilaiData = {
          student_id: siswa.id,
          class_id: selectedClass.id,
          mata_pelajaran: selectedMapel,
          guru_id: userId, // ✅ GANTI dari teacherId
          tahun_ajaran_id: academicYear.id,
          semester: semester,
          nh1: null,
          nh2: null,
          nh3: null,
          pts: null,
          pas: null,
          rata_nh: null,
          nilai_akhir: siswa.nilai_akhir || 0,
          predikat: "",
          deskripsi_capaian: null,
          kkm: kkm,
          status: "draft",
          is_finalized: false,
          finalized_at: null,
          created_by: userId, // ✅ GANTI dari teacherId
          updated_by: userId, // ✅ GANTI dari teacherId
          updated_at: new Date().toISOString(),
        };

        if (raporId) {
          const { error: updateError } = await supabase
            .from("nilai_eraport")
            .update(nilaiData)
            .eq("id", raporId);

          if (updateError) {
            console.error("❌ Update error:", updateError);
            throw new Error(
              `Gagal update siswa ${siswa.full_name}: ${updateError.message}`
            );
          }
        } else {
          const { data: newRapor, error: insertError } = await supabase
            .from("nilai_eraport")
            .insert(nilaiData)
            .select()
            .single();

          if (insertError) {
            console.error("❌ Insert error:", insertError);
            console.log("Data yang gagal:", nilaiData);
            throw new Error(
              `Gagal insert siswa ${siswa.full_name}: ${insertError.message}`
            );
          }

          raporId = newRapor?.id;
        }

        if (raporId) {
          await supabase
            .from("nilai_eraport_detail")
            .delete()
            .eq("nilai_eraport_id", raporId);
        }

        const tpDetails = [
          ...siswa.tp_tercapai.map((tpId) => ({
            nilai_eraport_id: raporId,
            tujuan_pembelajaran_id: tpId,
            status_tercapai: true,
          })),
          ...siswa.tp_perlu_peningkatan.map((tpId) => ({
            nilai_eraport_id: raporId,
            tujuan_pembelajaran_id: tpId,
            status_tercapai: false,
          })),
        ];

        if (tpDetails.length > 0 && raporId) {
          await supabase.from("nilai_eraport_detail").insert(tpDetails);
        }

        setSaveProgress({ current: i + 1, total: siswaList.length });
      }

      if (onShowToast) onShowToast("Data berhasil disimpan!", "success");
      await loadData();
    } catch (error) {
      console.error("Error saving data:", error);
      if (onShowToast)
        onShowToast(`Gagal menyimpan: ${error.message}`, "error");
    } finally {
      setSaving(false);
      setSaveProgress({ current: 0, total: 0 });
    }
  };

  const handleDownloadTemplate = () => {
    if (!selectedMapel || !kelas || !semester) {
      if (onShowToast)
        onShowToast(
          "Pilih Kelas, Mapel, dan Semester terlebih dahulu!",
          "warning"
        );
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Template Nilai");

      worksheet.mergeCells("A1:C1");
      worksheet.getCell("A1").value = "TEMPLATE INPUT NILAI E-RAPORT";
      worksheet.getCell("A1").font = { bold: true, size: 16 };
      worksheet.getCell("A1").alignment = {
        horizontal: "center",
        vertical: "middle",
      };

      worksheet.mergeCells("A2:C2");
      worksheet.getCell("A2").value = `Mata Pelajaran: ${selectedMapel}`;
      worksheet.getCell("A2").font = { bold: true };

      worksheet.mergeCells("A3:C3");
      worksheet.getCell("A3").value = `Kelas: ${kelas} | Semester: ${semester}`;
      worksheet.getCell("A3").font = { bold: true };

      const headerRow = worksheet.getRow(5);
      const headers = ["NO", "NIS", "NAMA SISWA", "NILAI AKHIR"];

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

      siswaList.forEach((siswa, idx) => {
        const row = worksheet.getRow(6 + idx);
        row.getCell(1).value = idx + 1;
        row.getCell(2).value = siswa.nis;
        row.getCell(3).value = siswa.full_name;
        row.getCell(4).value = siswa.nilai_akhir || "";
      });

      worksheet.getColumn(1).width = 5;
      worksheet.getColumn(2).width = 15;
      worksheet.getColumn(3).width = 30;
      worksheet.getColumn(4).width = 12;

      workbook.xlsx.writeBuffer().then((buffer) => {
        const blob = new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Template_Nilai_${selectedMapel}_${kelas}_Semester_${semester}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);

        if (onShowToast) onShowToast("Template berhasil diunduh!", "success");
      });
    } catch (error) {
      console.error("Template error:", error);
      if (onShowToast)
        onShowToast(`Gagal membuat template: ${error.message}`, "error");
    }
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!selectedMapel || !kelas || !semester) {
      if (onShowToast)
        onShowToast(
          "Pilih Kelas, Mapel, dan Semester terlebih dahulu!",
          "warning"
        );
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const buffer = await file.arrayBuffer();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.getWorksheet(1);
      const importedData = [];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 5) {
          const nis = row.getCell(2).value?.toString()?.trim();
          const nilai = parseInt(row.getCell(4).value) || 0;

          if (nis) {
            importedData.push({ nis, nilai });
          }
        }
      });

      if (importedData.length === 0) {
        if (onShowToast)
          onShowToast("Tidak ada data ditemukan di file Excel!", "warning");
        return;
      }

      let importCount = 0;
      const updatedSiswaList = siswaList.map((siswa) => {
        const imported = importedData.find(
          (item) => item.nis === siswa.nis.toString()
        );
        if (imported) {
          importCount++;
          return { ...siswa, nilai_akhir: imported.nilai };
        }
        return siswa;
      });

      setSiswaList(updatedSiswaList);

      if (onShowToast)
        onShowToast(`${importCount} nilai berhasil diimport!`, "success");
    } catch (error) {
      console.error("Import error:", error);
      if (onShowToast)
        onShowToast(
          "Gagal import file! Pastikan format Excel sesuai template.",
          "error"
        );
    } finally {
      e.target.value = "";
    }
  };

  if (loading && !kelas) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-3 text-gray-600">Memuat data mengajar...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen py-4 sm:py-8 px-4 ${
        darkMode ? "bg-gray-900" : "bg-gray-50"
      }`}>
      <div className="max-w-7xl mx-auto">
        <div
          className={`rounded-xl shadow-lg p-4 sm:p-6 ${
            darkMode ? "bg-gray-800" : "bg-white"
          }`}>
          <h2
            className={`text-xl font-bold mb-6 ${
              darkMode ? "text-white" : "text-gray-900"
            }`}>
            Input Nilai
          </h2>

          {/* Filter Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}>
                Pilih Kelas
              </label>
              <select
                value={kelas}
                onChange={(e) => setKelas(e.target.value)}
                className={`w-full p-3 rounded-lg border ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}>
                <option value="">-- Pilih Kelas --</option>
                {availableClasses.map((cls) => (
                  <option key={cls.id} value={cls.grade}>
                    Kelas {cls.grade}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}>
                Pilih Mata Pelajaran
              </label>
              <select
                value={selectedMapel}
                onChange={(e) => setSelectedMapel(e.target.value)}
                className={`w-full p-3 rounded-lg border ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}>
                <option value="">-- Pilih Mata Pelajaran --</option>
                {availableSubjects.map((subject, idx) => (
                  <option key={idx} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}>
                Pilih Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className={`w-full p-3 rounded-lg border ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}>
                <option value="">-- Pilih Semester --</option>
                <option value="1">Semester Ganjil</option>
                <option value="2">Semester Genap</option>
              </select>
            </div>
          </div>

          {kelas && selectedMapel && semester && (
            <>
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 sm:gap-3 mb-6 justify-end">
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors text-sm">
                  <Download size={18} />
                  Download Template
                </button>

                <label className="flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer bg-blue-600 hover:bg-blue-700 text-white transition-colors text-sm">
                  <Upload size={18} />
                  Import dari Excel
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleImportExcel}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={handleSave}
                  disabled={saving || siswaList.length === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  <Save size={18} />
                  Simpan Semua Data
                </button>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                  <p className="mt-2 text-gray-600">Memuat data siswa...</p>
                </div>
              ) : siswaList.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full border-collapse">
                    <thead className="bg-red-800 text-white">
                      <tr>
                        <th className="p-3 text-center border-r border-red-700">
                          No
                        </th>
                        <th className="p-3 text-left border-r border-red-700">
                          Nama Siswa
                        </th>
                        <th className="p-3 text-left border-r border-red-700">
                          NISN
                        </th>
                        <th className="p-3 text-center border-r border-red-700">
                          Nilai
                        </th>
                        <th className="p-3 text-left border-r border-red-700">
                          TP Yang diukur dan Tercapai dengan Optimal
                        </th>
                        <th className="p-3 text-left">
                          TP yang diukur dan Perlu Peningkatan
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {siswaList.map((siswa, idx) => (
                        <tr
                          key={siswa.id}
                          className={`border-b ${
                            darkMode
                              ? "border-gray-700 hover:bg-gray-800"
                              : "border-gray-200 hover:bg-gray-50"
                          }`}>
                          <td className="p-3 text-center border-r">
                            {idx + 1}
                          </td>
                          <td className="p-3 border-r">{siswa.full_name}</td>
                          <td className="p-3 border-r">{siswa.nis}</td>
                          <td className="p-3 text-center border-r">
                            <input
                              type="number"
                              value={siswa.nilai_akhir || ""}
                              onChange={(e) =>
                                handleNilaiChange(siswa.id, e.target.value)
                              }
                              className={`w-16 p-2 text-center rounded border ${
                                darkMode
                                  ? "bg-gray-700 border-gray-600 text-white"
                                  : "bg-white border-gray-300 text-gray-900"
                              }`}
                              min="0"
                              max="100"
                            />
                          </td>
                          <td className="p-3 border-r">
                            <div className="space-y-1 text-sm">
                              {tpList.map((tp) => (
                                <label
                                  key={tp.id}
                                  className="flex items-start gap-2 cursor-pointer hover:bg-green-50 p-1 rounded">
                                  <input
                                    type="checkbox"
                                    checked={siswa.tp_tercapai?.includes(tp.id)}
                                    onChange={() =>
                                      handleTPChange(
                                        siswa.id,
                                        tp.id,
                                        "tercapai"
                                      )
                                    }
                                    className="mt-1 accent-green-600"
                                  />
                                  <span
                                    className={
                                      darkMode
                                        ? "text-gray-300"
                                        : "text-gray-700"
                                    }>
                                    {tp.deskripsi_tp}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="space-y-1 text-sm">
                              {tpList.map((tp) => (
                                <label
                                  key={tp.id}
                                  className="flex items-start gap-2 cursor-pointer hover:bg-yellow-50 p-1 rounded">
                                  <input
                                    type="checkbox"
                                    checked={siswa.tp_perlu_peningkatan?.includes(
                                      tp.id
                                    )}
                                    onChange={() =>
                                      handleTPChange(
                                        siswa.id,
                                        tp.id,
                                        "peningkatan"
                                      )
                                    }
                                    className="mt-1 accent-yellow-600 w-6 h-6"
                                  />
                                  <span
                                    className={
                                      darkMode
                                        ? "text-gray-300"
                                        : "text-gray-700"
                                    }>
                                    {tp.deskripsi_tp}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Tidak ada data siswa untuk kelas ini
                </div>
              )}
            </>
          )}

          {!kelas && !loading && (
            <div className="text-center py-8 text-gray-500">
              Silakan pilih Kelas, Mata Pelajaran, dan Semester
            </div>
          )}
        </div>
      </div>

      {/* Save Progress Overlay */}
      {saving && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className={`rounded-xl p-6 ${
              darkMode ? "bg-gray-800" : "bg-white"
            }`}>
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-bold mb-2">Menyimpan Data...</h3>
              <p className="text-sm text-gray-600 mb-4">
                {saveProgress.current} dari {saveProgress.total} siswa
              </p>
              <div className="w-64 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      (saveProgress.current / saveProgress.total) * 100
                    }%`,
                  }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InputNilai;
