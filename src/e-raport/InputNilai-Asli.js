import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import ExcelJS from "exceljs";
import { Save, Download, Upload } from "lucide-react";

// ✅ STANDARDISASI NAMA MAPEL - KONVERSI UPPERCASE KE TITLE CASE
const standardizeMapelName = (mapel) => {
  const mapping = {
    "BAHASA INGGRIS": "Bahasa Inggris",
    "BAHASA INDONESIA": "Bahasa Indonesia",
    MATEMATIKA: "Matematika (Umum)",
    "ILMU PENGETAHUAN ALAM": "Ilmu Pengetahuan Alam (IPA)",
    "ILMU PENGETAHUAN SOSIAL": "Ilmu Pengetahuan Sosial (IPS)",
    "PENDIDIKAN AGAMA ISLAM": "Pendidikan Agama Islam dan Budi Pekerti",
    "PENDIDIKAN PANCASILA": "Pendidikan Pancasila",
    PJOK: "Pendidikan Jasmani, Olahraga dan Kesehatan",
    INFORMATIKA: "Informatika",
    "BAHASA SUNDA": "Muatan Lokal Bahasa Daerah",
    "KODING & AI": "Koding dan AI",
    "SENI TARI": "Seni Tari",
    PRAKARYA: "Prakarya",
    "SENI RUPA": "Seni Rupa",
    "BP/BK": "BP/BK",
  };
  return mapping[mapel?.toUpperCase()] || mapel;
};

// ✅ PASTE FUNGSI INI DI SINI (sebelum function InputNilai)
const mapelToRaportName = (mapelTeacher) => {
  const mapping = {
    "PENDIDIKAN AGAMA ISLAM": "Pendidikan Agama Islam dan Budi Pekerti",
    "PENDIDIKAN PANCASILA": "Pendidikan Pancasila",
    "BAHASA INDONESIA": "Bahasa Indonesia",
    MATEMATIKA: "Matematika (Umum)",
    "ILMU PENGETAHUAN ALAM": "Ilmu Pengetahuan Alam (IPA)",
    "ILMU PENGETAHUAN SOSIAL": "Ilmu Pengetahuan Sosial (IPS)",
    "BAHASA INGGRIS": "Bahasa Inggris",
    PJOK: "Pendidikan Jasmani, Olahraga dan Kesehatan",
    INFORMATIKA: "Informatika",
    "BAHASA SUNDA": "Muatan Lokal Bahasa Daerah",
    "KODING & AI": "Koding dan AI",
    "SENI TARI": "Seni Tari",
    PRAKARYA: "Prakarya",
    "SENI RUPA": "Seni Rupa",
    "BP/BK": "BP/BK",
  };
  return mapping[mapelTeacher] || mapelTeacher;
};

// ✅ FUNGSI UNTUK MENDAPATKAN TINGKAT DARI KELAS (7A → 7)
const getTingkatFromKelas = (kelas) => {
  const match = kelas?.match(/\d+/);
  return match ? parseInt(match[0]) : null;
};

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

  // Load TP terpisah untuk validasi
  useEffect(() => {
    if (kelas && selectedMapel && semester && academicYear) {
      loadTP();
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

  const loadTP = async () => {
    try {
      const tingkat = getTingkatFromKelas(kelas);
      if (!tingkat) return;

      const { data: tp } = await supabase
        .from("tujuan_pembelajaran")
        .select("*")
        .eq("tingkat", tingkat)
        .eq("mata_pelajaran", selectedMapel)
        .eq("semester", semester)
        .eq("tahun_ajaran_id", academicYear.id)
        .eq("is_active", true)
        .order("urutan");

      setTpList(tp || []);
      console.log(`✅ Loaded ${tp?.length || 0} TP untuk tingkat ${tingkat}`);
    } catch (error) {
      console.error("Error loading TP:", error);
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
        .eq("class_id", kelas)
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

      // LOAD EXISTING NILAI
      console.log("🔍 Query params:", {
        class_id: kelas,
        mata_pelajaran: selectedMapel,
        semester: semester,
        semester_type: typeof semester,
        tahun_ajaran_id: academicYear.id,
      });

      // ✅ TEST 0: Ambil semua data untuk kelas ini tanpa filter apapun
      const { data: test0, error: error0 } = await supabase
        .from("nilai_eraport")
        .select("*")
        .ilike("class_id", `%${kelas}%`)
        .limit(10);

      console.log(
        "🔍 TEST 0 - Semua data kelas 7F (pakai ILIKE):",
        test0?.length || 0,
        "records"
      );
      console.log("🔍 TEST 0 - Samples:", test0);

      if (test0 && test0.length > 0) {
        console.log("🔍 TEST 0 - Mata pelajaran yang ada:", [
          ...new Set(test0.map((n) => n.mata_pelajaran)),
        ]);
      }

      // ✅ TEST 1: Query dengan filter class_id dan mata_pelajaran saja
      const { data: test1, error: error1 } = await supabase
        .from("nilai_eraport")
        .select("*")
        .eq("class_id", kelas)
        .eq("mata_pelajaran", selectedMapel);

      console.log(
        "🔍 TEST 1 - Filter class + mapel (EXACT):",
        test1?.length || 0,
        "records"
      );
      console.log("🔍 TEST 1 - Sample:", test1?.[0]);

      // ✅ TEST 2: Tambah filter semester
      const { data: test2, error: error2 } = await supabase
        .from("nilai_eraport")
        .select("*")
        .eq("class_id", kelas)
        .eq("mata_pelajaran", selectedMapel)
        .eq("semester", semester);

      console.log("🔍 TEST 2 - + semester:", test2?.length || 0, "records");
      console.log("🔍 TEST 2 - Sample:", test2?.[0]);

      // ✅ TEST 3: Tambah filter tahun ajaran
      const { data: test3, error: error3 } = await supabase
        .from("nilai_eraport")
        .select("*")
        .eq("class_id", kelas)
        .eq("mata_pelajaran", selectedMapel)
        .eq("semester", semester)
        .eq("tahun_ajaran_id", academicYear.id);

      console.log("🔍 TEST 3 - + tahun_ajaran:", test3?.length || 0, "records");
      console.log("🔍 TEST 3 - Sample:", test3?.[0]);

      const { data: existingNilai, error: nilaiError } = await supabase
        .from("nilai_eraport")
        .select(
          `
    id,
    student_id,
    nilai_akhir,
    deskripsi_capaian,
    nilai_eraport_detail (
      id,
      tujuan_pembelajaran_id,
      status_tercapai
    )
  `
        )
        .eq("class_id", kelas)
        .eq("mata_pelajaran", standardizeMapelName(selectedMapel)) // ✅ TAMBAHIN INI
        .eq("semester", semester)
        .eq("tahun_ajaran_id", academicYear.id);

      // Debug log
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
          deskripsi_capaian: nilai?.deskripsi_capaian || "",
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

  const generateDeskripsi = (tpTercapai, tpPerluPeningkatan) => {
    // ✅ CHECK JIKA tpList KOSONG
    if (!tpList || tpList.length === 0) {
      return "Belum ada data tujuan pembelajaran";
    }

    let deskripsi = "";

    // ✅ Ambil deskripsi TP yang tercapai
    const tpTercapaiText = tpList
      .filter((tp) => tpTercapai.includes(tp.id))
      .map((tp) => tp.deskripsi_tp)
      .join(", ");

    // ✅ Ambil deskripsi TP yang perlu peningkatan
    const tpPerluPeningkatanText = tpList
      .filter((tp) => tpPerluPeningkatan.includes(tp.id))
      .map((tp) => tp.deskripsi_tp)
      .join(", ");

    // ✅ Format: "Mencapai kompetensi dengan sangat baik dalam hal..."
    if (tpTercapaiText) {
      deskripsi += `Mencapai kompetensi dengan sangat baik dalam hal ${tpTercapaiText.toLowerCase()}.`;
    }

    // ✅ Format: "Perlu peningkatan dalam hal..."
    if (tpPerluPeningkatanText) {
      if (deskripsi) deskripsi += " ";
      deskripsi += `Perlu peningkatan dalam hal ${tpPerluPeningkatanText.toLowerCase()}.`;
    }

    return deskripsi || "-";
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

    // ✅ CHECK JIKA TP KOSONG
    if (tpList.length === 0) {
      if (onShowToast)
        onShowToast(
          "Belum ada Tujuan Pembelajaran (TP) untuk kelas/mapel ini. Silakan input TP terlebih dahulu!",
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
        .eq("class_id", kelas)
        .eq("mata_pelajaran", selectedMapel)
        .eq("tahun_ajaran_id", academicYear.id)
        .single();
      const kkm = kkmData?.kkm || 75;

      let saved = 0;
      let updated = 0;
      let inserted = 0;
      let skipped = 0;

      for (let i = 0; i < siswaList.length; i++) {
        const siswa = siswaList[i];

        // FILTER: Skip siswa yang belum ada data
        const hasNilai = siswa.nilai_akhir && siswa.nilai_akhir > 0;
        const hasTP =
          siswa.tp_tercapai?.length > 0 ||
          siswa.tp_perlu_peningkatan?.length > 0;

        if (!hasNilai && !hasTP) {
          skipped++;
          setSaveProgress({ current: i + 1, total: siswaList.length });
          continue;
        }

        let raporId = siswa.rapor_id;

        const deskripsiGenerated = generateDeskripsi(
          siswa.tp_tercapai || [],
          siswa.tp_perlu_peningkatan || []
        );

        const nilaiData = {
          student_id: siswa.id,
          class_id: kelas,
          mata_pelajaran: standardizeMapelName(selectedMapel),
          guru_id: userId,
          tahun_ajaran_id: academicYear.id,
          semester: semester,
          nilai_akhir: siswa.nilai_akhir || 0,
          deskripsi_capaian: deskripsiGenerated,
          kkm: kkm,
          created_by: userId,
          updated_by: userId,
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
          updated++;
          saved++;
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
          inserted++;
          saved++;
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

      // Tampilkan summary
      const message = `Berhasil menyimpan ${saved} siswa (${updated} diperbarui, ${inserted} baru ditambahkan, ${skipped} dilewati karena belum ada data)`;
      if (onShowToast) onShowToast(message, "success");
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

  // Fungsi untuk menampilkan info tingkat dari kelas yang dipilih
  const renderTingkatInfo = () => {
    if (!kelas) return null;
    const tingkat = getTingkatFromKelas(kelas);
    if (!tingkat) return null;

    return (
      <div
        className={`text-sm mb-4 p-3 rounded-lg ${
          darkMode ? "bg-gray-700 text-gray-300" : "bg-blue-50 text-blue-700"
        }`}>
        <span className="font-semibold">Info:</span> Kelas{" "}
        <span className="font-bold">{kelas}</span> menggunakan Tujuan
        Pembelajaran Tingkat <span className="font-bold">{tingkat}</span>
      </div>
    );
  };

  if (loading && !kelas) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className={`mt-3 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
            Memuat data mengajar...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen py-4 sm:py-8 px-3 sm:px-4 lg:px-6 ${
        darkMode ? "bg-gray-900" : "bg-gradient-to-br from-blue-50 to-blue-100"
      }`}>
      <div className="max-w-7xl mx-auto">
        <div
          className={`rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 ${
            darkMode
              ? "bg-gray-800 border border-gray-700"
              : "bg-white border border-blue-200"
          }`}>
          <h2
            className={`text-xl sm:text-2xl lg:text-3xl font-bold mb-6 pb-4 border-b ${
              darkMode
                ? "text-white border-gray-700"
                : "text-blue-800 border-blue-100"
            }`}>
            Input Nilai e-Raport
          </h2>

          {/* Filter Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-8">
            <div>
              <label
                className={`block text-sm sm:text-base font-semibold mb-2 ${
                  darkMode ? "text-gray-300" : "text-blue-700"
                }`}>
                Pilih Kelas
              </label>
              <select
                value={kelas}
                onChange={(e) => setKelas(e.target.value)}
                className={`w-full p-3 sm:p-4 rounded-xl border text-sm sm:text-base transition-all duration-200 ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    : "bg-white border-blue-300 text-blue-900 focus:border-blue-500 focus:ring-3 focus:ring-blue-500/20"
                }`}>
                <option value="" className="dark:bg-gray-800">
                  -- Pilih Kelas --
                </option>
                {availableClasses.map((cls) => (
                  <option
                    key={cls.id}
                    value={cls.grade}
                    className="dark:bg-gray-800">
                    Kelas {cls.grade}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className={`block text-sm sm:text-base font-semibold mb-2 ${
                  darkMode ? "text-gray-300" : "text-blue-700"
                }`}>
                Pilih Mata Pelajaran
              </label>
              <select
                value={selectedMapel}
                onChange={(e) => setSelectedMapel(e.target.value)}
                className={`w-full p-3 sm:p-4 rounded-xl border text-sm sm:text-base transition-all duration-200 ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    : "bg-white border-blue-300 text-blue-900 focus:border-blue-500 focus:ring-3 focus:ring-blue-500/20"
                }`}>
                <option value="" className="dark:bg-gray-800">
                  -- Pilih Mata Pelajaran --
                </option>
                {availableSubjects.map((subject, idx) => (
                  <option
                    key={idx}
                    value={subject}
                    className="dark:bg-gray-800">
                    {subject}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className={`block text-sm sm:text-base font-semibold mb-2 ${
                  darkMode ? "text-gray-300" : "text-blue-700"
                }`}>
                Pilih Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className={`w-full p-3 sm:p-4 rounded-xl border text-sm sm:text-base transition-all duration-200 ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    : "bg-white border-blue-300 text-blue-900 focus:border-blue-500 focus:ring-3 focus:ring-blue-500/20"
                }`}>
                <option value="" className="dark:bg-gray-800">
                  -- Pilih Semester --
                </option>
                <option value="1" className="dark:bg-gray-800">
                  Semester Ganjil
                </option>
                <option value="2" className="dark:bg-gray-800">
                  Semester Genap
                </option>
              </select>
            </div>
          </div>

          {/* Info Tingkat */}
          {kelas && renderTingkatInfo()}

          {kelas && selectedMapel && semester && (
            <>
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-8 justify-end">
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center justify-center gap-2 px-4 sm:px-5 py-3 min-h-[44px] rounded-xl bg-green-600 hover:bg-green-700 text-white transition-all duration-200 text-sm sm:text-base font-medium shadow-md hover:shadow-lg">
                  <Download size={20} />
                  Download Template
                </button>

                <label className="flex items-center justify-center gap-2 px-4 sm:px-5 py-3 min-h-[44px] rounded-xl cursor-pointer bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 text-sm sm:text-base font-medium shadow-md hover:shadow-lg">
                  <Upload size={20} />
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
                  disabled={
                    saving || siswaList.length === 0 || tpList.length === 0
                  }
                  className="flex items-center justify-center gap-2 px-4 sm:px-5 py-3 min-h-[44px] rounded-xl bg-blue-700 hover:bg-blue-800 text-white transition-all duration-200 text-sm sm:text-base font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                  <Save size={20} />
                  Simpan Semua Data
                </button>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                  <p
                    className={`mt-3 text-sm sm:text-base ${
                      darkMode ? "text-gray-300" : "text-gray-600"
                    }`}>
                    Memuat data siswa...
                  </p>
                </div>
              ) : siswaList.length > 0 ? (
                <>
                  {/* Info Jumlah TP */}
                  <div
                    className={`mb-4 p-3 rounded-lg ${
                      darkMode ? "bg-gray-700" : "bg-blue-50"
                    }`}>
                    <div className="flex flex-wrap gap-4 items-center">
                      <span
                        className={`font-medium ${
                          darkMode ? "text-gray-300" : "text-blue-700"
                        }`}>
                        Tujuan Pembelajaran:{" "}
                        <span className="font-bold">{tpList.length} TP</span>
                      </span>
                      <div className="flex gap-2">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            darkMode
                              ? "bg-green-900/30 text-green-300"
                              : "bg-green-100 text-green-800"
                          }`}>
                          ✓ Tercapai
                        </span>
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            darkMode
                              ? "bg-yellow-900/30 text-yellow-300"
                              : "bg-yellow-100 text-yellow-800"
                          }`}>
                          ⚠ Perlu Peningkatan
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border shadow-sm">
                    <table className="w-full border-collapse">
                      <thead
                        className={
                          darkMode
                            ? "bg-gray-700 text-white"
                            : "bg-blue-700 text-white"
                        }>
                        <tr>
                          <th className="p-3 sm:p-4 text-center border-r border-gray-600 dark:border-gray-600 text-xs sm:text-sm lg:text-base">
                            No
                          </th>
                          <th className="p-3 sm:p-4 text-left border-r border-gray-600 dark:border-gray-600 text-xs sm:text-sm lg:text-base">
                            NIS
                          </th>
                          <th className="p-3 sm:p-4 text-left border-r border-gray-600 dark:border-gray-600 text-xs sm:text-sm lg:text-base">
                            Nama Siswa
                          </th>
                          <th className="p-3 sm:p-4 text-center border-r border-gray-600 dark:border-gray-600 text-xs sm:text-sm lg:text-base">
                            Nilai
                          </th>
                          <th className="p-3 sm:p-4 text-left border-r border-gray-600 dark:border-gray-600 text-xs sm:text-sm lg:text-base">
                            TP Yang diukur dan Tercapai dengan Optimal
                          </th>
                          <th className="p-3 sm:p-4 text-left text-xs sm:text-sm lg:text-base">
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
                                ? "border-gray-700 hover:bg-gray-800/50"
                                : "border-blue-100 hover:bg-blue-50/50"
                            }`}>
                            <td
                              className={`p-3 sm:p-4 text-center border-r border-gray-600 dark:border-gray-600 text-sm sm:text-base ${
                                darkMode ? "text-white" : "text-gray-900"
                              }`}>
                              {idx + 1}
                            </td>
                            <td
                              className={`p-3 sm:p-4 border-r border-gray-600 dark:border-gray-600 text-sm sm:text-base font-mono ${
                                darkMode ? "text-white" : "text-gray-900"
                              }`}>
                              {siswa.nis}
                            </td>
                            <td
                              className={`p-3 sm:p-4 border-r border-gray-600 dark:border-gray-600 text-sm sm:text-base ${
                                darkMode ? "text-white" : "text-gray-900"
                              }`}>
                              {siswa.full_name}
                            </td>
                            <td className="p-3 sm:p-4 text-center border-r border-gray-600 dark:border-gray-600">
                              <input
                                type="number"
                                value={siswa.nilai_akhir || ""}
                                onChange={(e) =>
                                  handleNilaiChange(siswa.id, e.target.value)
                                }
                                className={`w-16 sm:w-20 p-2 sm:p-3 text-center rounded-lg border text-sm sm:text-base transition-all duration-200 ${
                                  darkMode
                                    ? "bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    : "bg-white border-blue-300 text-blue-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                }`}
                                min="0"
                                max="100"
                              />
                            </td>
                            <td className="p-3 sm:p-4 border-r border-gray-600 dark:border-gray-600">
                              <div className="space-y-1">
                                {tpList.map((tp) => (
                                  <label
                                    key={tp.id}
                                    className="flex items-start gap-3 cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/10 p-2 rounded-lg transition-colors duration-150">
                                    <input
                                      type="checkbox"
                                      checked={siswa.tp_tercapai?.includes(
                                        tp.id
                                      )}
                                      onChange={() =>
                                        handleTPChange(
                                          siswa.id,
                                          tp.id,
                                          "tercapai"
                                        )
                                      }
                                      className="mt-1 accent-green-600 w-4 h-4 flex-shrink-0"
                                    />
                                    <span
                                      className={`flex-1 text-sm leading-relaxed ${
                                        darkMode
                                          ? "text-gray-300"
                                          : "text-gray-700"
                                      }`}>
                                      {tp.deskripsi_tp}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </td>
                            <td className="p-3 sm:p-4">
                              <div className="space-y-1">
                                {tpList.map((tp) => (
                                  <label
                                    key={tp.id}
                                    className="flex items-start gap-3 cursor-pointer hover:bg-yellow-50 dark:hover:bg-yellow-900/10 p-2 rounded-lg transition-colors duration-150">
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
                                      className="mt-1 accent-yellow-600 w-4 h-4 flex-shrink-0"
                                    />
                                    <span
                                      className={`flex-1 text-sm leading-relaxed ${
                                        darkMode
                                          ? "text-gray-300"
                                          : "text-gray-700"
                                      }`}>
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
                </>
              ) : (
                <div className="text-center py-12 rounded-xl border border-dashed">
                  <div
                    className={`${
                      darkMode ? "text-gray-500" : "text-gray-400"
                    } mb-2`}>
                    <svg
                      className="w-16 h-16 mx-auto"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                      />
                    </svg>
                  </div>
                  <p
                    className={`text-sm sm:text-base ${
                      darkMode ? "text-gray-400" : "text-gray-500"
                    }`}>
                    Tidak ada data siswa untuk kelas ini
                  </p>
                </div>
              )}
            </>
          )}

          {!kelas && !loading && (
            <div className="text-center py-12 rounded-xl border border-dashed">
              <div
                className={`${
                  darkMode ? "text-gray-500" : "text-blue-400"
                } mb-3`}>
                <svg
                  className="w-16 h-16 mx-auto"
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
              <p
                className={`text-sm sm:text-base ${
                  darkMode ? "text-gray-400" : "text-gray-500"
                }`}>
                Silakan pilih Kelas, Mata Pelajaran, dan Semester untuk memulai
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Save Progress Overlay */}
      {saving && (
        <div className="fixed inset-0 bg-black/70 dark:bg-black/80 flex items-center justify-center z-50 p-4">
          <div
            className={`rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl ${
              darkMode
                ? "bg-gray-800 border border-gray-700"
                : "bg-white border border-blue-200"
            }`}>
            <div className="text-center">
              <div className="animate-spin rounded-full h-14 w-14 border-b-3 border-blue-600 mx-auto mb-5"></div>
              <h3
                className={`text-lg sm:text-xl font-bold mb-3 ${
                  darkMode ? "text-white" : "text-blue-800"
                }`}>
                Menyimpan Data...
              </h3>
              <p
                className={`text-sm sm:text-base mb-5 ${
                  darkMode ? "text-gray-300" : "text-blue-600"
                }`}>
                {saveProgress.current} dari {saveProgress.total} siswa
              </p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 sm:h-3.5 mb-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      (saveProgress.current / saveProgress.total) * 100
                    }%`,
                  }}></div>
              </div>
              <p
                className={`text-xs sm:text-sm mt-2 ${
                  darkMode ? "text-gray-400" : "text-blue-500"
                }`}>
                Mohon tunggu sebentar...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InputNilai;
