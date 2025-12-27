import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import ExcelJS from "exceljs";
import { Save, Download, Upload } from "lucide-react";
import {
  getActiveAcademicInfo,
  getActiveSemester,
  getActiveYearString,
  getActiveAcademicYearId,
  applyAcademicFilters,
} from "../services/academicYearService";

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
  const [selectedSemester, setSelectedSemester] = useState("");
  const [siswaList, setSiswaList] = useState([]);
  const [tpList, setTpList] = useState([]);
  const [academicInfo, setAcademicInfo] = useState(null);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0 });

  // ✅ BAGIAN 1: Tambah State untuk Auto-Save
  const [autoSaveTimeout, setAutoSaveTimeout] = useState(null);
  const [lastAutoSave, setLastAutoSave] = useState(null);

  const fileInputRef = useRef(null);

  // Load data awal
  useEffect(() => {
    loadAcademicInfoAndAssignments();
  }, []);

  // Load data saat filter berubah
  useEffect(() => {
    if (kelas && selectedMapel && selectedSemester && academicInfo) {
      loadData();
    }
  }, [kelas, selectedMapel, selectedSemester, academicInfo]);

  // Load TP terpisah untuk validasi
  useEffect(() => {
    if (kelas && selectedMapel && selectedSemester && academicInfo) {
      loadTP();
    }
  }, [kelas, selectedMapel, selectedSemester, academicInfo]);

  const loadAcademicInfoAndAssignments = async () => {
    try {
      setLoading(true);

      // ✅ GANTI: Load academic info dinamis
      const academicInfo = await getActiveAcademicInfo();
      setAcademicInfo(academicInfo);

      // Set semester aktif sebagai default
      if (academicInfo && academicInfo.semester) {
        setSelectedSemester(academicInfo.semester.toString());
      }

      console.log("📅 Academic Info loaded:", academicInfo);

      if (!user) {
        throw new Error("Session tidak valid. Silakan login ulang.");
      }

      const teacherId = user.teacher_id || user.id;
      if (!teacherId) {
        throw new Error("Teacher ID tidak ditemukan dalam session.");
      }

      console.log("👨‍🏫 Teacher ID:", teacherId);
      console.log("🎯 Academic Year ID:", academicInfo.yearId);

      // ✅ GANTI: Ambil teacher assignments dengan academicInfo.yearId
      const { data: assignments, error: assignmentsError } = await supabase
        .from("teacher_assignments")
        .select("*")
        .eq("teacher_id", teacherId)
        .eq("academic_year_id", academicInfo.yearId);

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
      console.error("Error in loadAcademicInfoAndAssignments:", error);
      if (onShowToast) onShowToast(`Error: ${error.message}`, "error");
      setLoading(false);
    }
  };

  const loadTP = async () => {
    try {
      const tingkat = getTingkatFromKelas(kelas);
      if (!tingkat || !academicInfo || !selectedSemester) return;

      // ✅ HAPUS manual filter tahun_ajaran_id, pakai applyAcademicFilters
      let query = supabase
        .from("tujuan_pembelajaran")
        .select("*")
        .eq("tingkat", tingkat)
        .eq("mata_pelajaran", selectedMapel)
        .eq("semester", selectedSemester)
        .eq("is_active", true)
        .order("urutan");
      // ❌ HAPUS INI KALAU ADA: .eq("tahun_ajaran_id", academicInfo.yearId)

      // ✅ PAKAI applyAcademicFilters (otomatis pakai academic_year_id)
      query = await applyAcademicFilters(query, {
        filterYearId: true,
        filterSemester: false,
      });

      const { data: tp, error } = await query;

      if (error) {
        console.error("Error loading TP:", error);
        return;
      }

      setTpList(tp || []);
      console.log(`✅ Loaded ${tp?.length || 0} TP untuk tingkat ${tingkat}`);
    } catch (error) {
      console.error("Error loading TP:", error);
    }
  };

  const loadData = async () => {
    if (!kelas || !selectedMapel || !selectedSemester || !academicInfo) return;

    setLoading(true);
    try {
      const selectedClass = availableClasses.find((c) => c.grade === kelas);
      if (!selectedClass) {
        if (onShowToast) onShowToast("Kelas tidak ditemukan!", "error");
        return;
      }

      // ✅ GANTI: AMBIL KKM dengan academicInfo.yearId
      const { data: kkmData, error: kkmError } = await supabase
        .from("raport_config")
        .select("kkm")
        .eq("class_id", kelas)
        .eq("mata_pelajaran", selectedMapel)
        .eq("academic_year_id", academicInfo.yearId) // ✅ FIX: academic_year_id
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

      // ✅ GANTI: Load existing nilai dengan applyAcademicFilters
      let query = supabase
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
        .eq("mata_pelajaran", standardizeMapelName(selectedMapel))
        .eq("semester", selectedSemester); // ✅ Filter manual - string langsung

      // Apply academic filter untuk tahun ajaran
      query = await applyAcademicFilters(query, {
        filterYearId: true,
        filterSemester: false, // ✅ MATIIN karena udah filter manual di atas
      });

      // ✅ DEBUG LOG SEBELUM EXECUTE QUERY
      console.log("🔍 Filter Query Nilai:");
      console.log("  - class_id:", kelas);
      console.log("  - mata_pelajaran:", standardizeMapelName(selectedMapel));
      console.log(
        "  - semester:",
        selectedSemester,
        "(manual filter, type:",
        typeof selectedSemester,
        ")"
      );
      console.log("  - academic_year_id:", academicInfo.yearId);

      const { data: existingNilai, error: nilaiError } = await query;

      // ✅ DEBUG LOG ERROR (kalau ada)
      if (nilaiError) {
        console.error("❌ Error loading nilai:", nilaiError);
      }

      // ✅ DEBUG LOG HASIL QUERY
      console.log("📊 Existing nilai loaded:", existingNilai?.length || 0);
      console.log(
        "🔍 existingNilai FULL:",
        JSON.stringify(existingNilai, null, 2)
      );
      console.log("🔍 Sample student:", existingNilai?.[0]);
      console.log("🔍 Detail TP:", existingNilai?.[0]?.nilai_eraport_detail);

      // ✅ DEBUG LOG TIPE DATA SEMESTER (PERBAIKAN 3)
      if (existingNilai && existingNilai.length > 0) {
        console.log("🔍 ===== CEK TIPE DATA SEMESTER =====");
        console.log("🔍 Sample data dari DB:", existingNilai[0]);
        console.log("🔍 DB semester value:", existingNilai[0].semester);
        console.log("🔍 DB semester type:", typeof existingNilai[0].semester);
        console.log("🔍 Filter semester value:", selectedSemester);
        console.log("🔍 Filter semester type:", typeof selectedSemester);
        console.log(
          "🔍 Apakah sama (strict)?",
          existingNilai[0].semester === selectedSemester
        );
        console.log(
          "🔍 Apakah sama (loose)?",
          existingNilai[0].semester == selectedSemester
        );
        console.log("🔍 =====================================");
      } else {
        console.warn("⚠️ TIDAK ADA DATA existingNilai!");
        console.log("🔍 Filter yang digunakan:");
        console.log("  - class_id:", kelas);
        console.log("  - mata_pelajaran:", standardizeMapelName(selectedMapel));
        console.log(
          "  - semester:",
          selectedSemester,
          "(type:",
          typeof selectedSemester,
          ")"
        );
        console.log("  - academic_year_id:", academicInfo.yearId);
        console.log("🔍 Coba cek manual di Supabase dengan query:");
        console.log(
          `  SELECT * FROM nilai_eraport WHERE class_id = '${kelas}' AND mata_pelajaran = '${standardizeMapelName(
            selectedMapel
          )}' AND semester = '${selectedSemester}' AND academic_year_id = '${
            academicInfo.yearId
          }';`
        );
      }
      console.log("🔍 Detail TP:", existingNilai?.[0]?.nilai_eraport_detail);

      // ✅ CEK TIPE DATA SEMESTER DI DATABASE
      if (existingNilai && existingNilai.length > 0) {
        console.log("🔍 DB semester value:", existingNilai[0].semester);
        console.log("🔍 DB semester type:", typeof existingNilai[0].semester);
        console.log("🔍 Filter semester value:", selectedSemester);
        console.log("🔍 Filter semester type:", typeof selectedSemester);
      }

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
    triggerAutoSave(); // ✅ TRIGGER AUTO-SAVE - BAGIAN 4
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
    triggerAutoSave(); // ✅ TRIGGER AUTO-SAVE - BAGIAN 5
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

  // ✅ BAGIAN 3: Tambah Fungsi triggerAutoSave
  const triggerAutoSave = () => {
    // Clear timeout sebelumnya
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    // Set timeout baru - auto-save 3 detik setelah user berhenti input
    const timeout = setTimeout(() => {
      handleSave(true, true); // true = auto-save mode, true = silent mode (no toast)
      setLastAutoSave(new Date());
    }, 10000); // 3 detik delay

    setAutoSaveTimeout(timeout);
  };

  // ✅ BAGIAN 2: Replace Fungsi handleSave dengan versi baru
  const handleSave = async (isAutoSave = false, silent = false) => {
    if (!kelas || !selectedMapel || !selectedSemester || !academicInfo) {
      if (!isAutoSave && onShowToast)
        onShowToast(
          "Pilih Kelas, Mapel, dan Semester terlebih dahulu!",
          "warning"
        );
      return;
    }

    if (tpList.length === 0) {
      if (!isAutoSave && onShowToast)
        onShowToast(
          "Belum ada Tujuan Pembelajaran (TP) untuk kelas/mapel ini. Silakan input TP terlebih dahulu!",
          "warning"
        );
      return;
    }

    if (siswaList.length === 0) {
      if (!isAutoSave && onShowToast)
        onShowToast("Tidak ada data siswa untuk disimpan!", "warning");
      return;
    }

    // Skip konfirmasi untuk auto-save
    if (
      !isAutoSave &&
      !window.confirm(`Simpan nilai untuk ${siswaList.length} siswa?`)
    )
      return;

    setSaving(true);
    setSaveProgress({ current: 0, total: siswaList.length });

    try {
      const selectedClass = availableClasses.find((c) => c.grade === kelas);
      if (!selectedClass) throw new Error("Kelas tidak ditemukan!");

      const userId = user.id;

      // ✅ GANTI: Get KKM dengan academicInfo.yearId
      const { data: kkmData } = await supabase
        .from("raport_config")
        .select("kkm")
        .eq("class_id", kelas)
        .eq("mata_pelajaran", selectedMapel)
        .eq("academic_year_id", academicInfo.yearId) // ✅ FIX: academic_year_id
        .maybeSingle();
      const kkm = kkmData?.kkm || 75;

      // ✅ FILTER: Hanya siswa yang ada datanya
      const siswaWithData = siswaList.filter((siswa) => {
        const hasNilai = siswa.nilai_akhir && siswa.nilai_akhir > 0;
        const hasTP =
          siswa.tp_tercapai?.length > 0 ||
          siswa.tp_perlu_peningkatan?.length > 0;
        return hasNilai || hasTP;
      });

      if (siswaWithData.length === 0) {
        if (!isAutoSave && onShowToast)
          onShowToast("Tidak ada data yang perlu disimpan!", "warning");
        setSaving(false);
        return;
      }

      // ✅ PISAHKAN DATA: Yang sudah ada (UPDATE) vs yang baru (INSERT)
      const dataToUpdate = [];
      const dataToInsert = [];

      siswaWithData.forEach((siswa) => {
        const deskripsiGenerated = generateDeskripsi(
          siswa.tp_tercapai || [],
          siswa.tp_perlu_peningkatan || []
        );

        const nilaiData = {
          student_id: siswa.id,
          class_id: kelas,
          mata_pelajaran: standardizeMapelName(selectedMapel),
          guru_id: userId,
          academic_year_id: academicInfo.yearId, // ✅ FIX: academic_year_id
          semester: selectedSemester, // ✅ GANTI: selectedSemester
          nilai_akhir: siswa.nilai_akhir || 0,
          deskripsi_capaian: deskripsiGenerated,
          kkm: kkm,
          created_by: userId,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        };

        if (siswa.rapor_id) {
          dataToUpdate.push({
            ...nilaiData,
            id: siswa.rapor_id,
            student_id_key: siswa.id,
          });
        } else {
          dataToInsert.push({ ...nilaiData, student_id_key: siswa.id });
        }
      });

      let insertedCount = 0;
      let updatedCount = 0;

      // ✅ BULK UPDATE (parallel processing untuk speed)
      if (dataToUpdate.length > 0) {
        const updatePromises = dataToUpdate.map(async (data) => {
          const { id, student_id_key, ...updateData } = data;
          const { error } = await supabase
            .from("nilai_eraport")
            .update(updateData)
            .eq("id", id);

          if (error) throw error;
          return id;
        });

        await Promise.all(updatePromises);
        updatedCount = dataToUpdate.length;
        setSaveProgress({ current: updatedCount, total: siswaWithData.length });
      }

      // ✅ BULK INSERT (satu query aja!)
      let newRapors = [];
      if (dataToInsert.length > 0) {
        const insertData = dataToInsert.map(
          ({ student_id_key, ...rest }) => rest
        );
        const { data: inserted, error: insertError } = await supabase
          .from("nilai_eraport")
          .insert(insertData)
          .select();

        if (insertError) throw insertError;
        newRapors = inserted || [];
        insertedCount = newRapors.length;
        setSaveProgress({
          current: updatedCount + insertedCount,
          total: siswaWithData.length,
        });
      }

      // ✅ HAPUS SEMUA TP DETAIL LAMA (BULK DELETE - satu query!)
      const allRaporIds = [
        ...dataToUpdate.map((d) => d.id),
        ...newRapors.map((r) => r.id),
      ].filter(Boolean);

      if (allRaporIds.length > 0) {
        await supabase
          .from("nilai_eraport_detail")
          .delete()
          .in("nilai_eraport_id", allRaporIds);
      }

      // ✅ PREPARE TP DETAILS (BULK INSERT)
      const tpDetailsToInsert = [];

      siswaWithData.forEach((siswa) => {
        let raporId = siswa.rapor_id;

        // Kalau data baru, cari ID dari hasil insert
        if (!raporId) {
          const newRapor = newRapors.find((r) => r.student_id === siswa.id);
          raporId = newRapor?.id;
        }

        if (raporId) {
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

          tpDetailsToInsert.push(...tpDetails);
        }
      });

      // ✅ BULK INSERT TP DETAILS (satu query!)
      if (tpDetailsToInsert.length > 0) {
        const { error: detailError } = await supabase
          .from("nilai_eraport_detail")
          .insert(tpDetailsToInsert);

        if (detailError) throw detailError;
      }

      const skipped = siswaList.length - siswaWithData.length;
      const message = isAutoSave
        ? `✓ Auto-saved ${siswaWithData.length} siswa`
        : `Berhasil menyimpan ${
            siswaWithData.length
          } siswa (${updatedCount} diperbarui, ${insertedCount} baru ditambahkan${
            skipped > 0 ? `, ${skipped} dilewati` : ""
          })`;

      // ✅ Cuma tampilkan toast kalau BUKAN silent mode
      if (onShowToast && !silent) onShowToast(message, "success");

      // Reload data hanya kalau bukan auto-save
      if (!isAutoSave) {
        await loadData();
      }
    } catch (error) {
      console.error("Error saving data:", error);
      // ✅ Error tetap muncul walaupun silent mode
      if (onShowToast && !isAutoSave)
        onShowToast(`Gagal menyimpan: ${error.message}`, "error");
    } finally {
      setSaving(false);
      setSaveProgress({ current: 0, total: 0 });
    }
  };

  const handleDownloadTemplate = () => {
    if (!selectedMapel || !kelas || !selectedSemester || !academicInfo) {
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
      worksheet.getCell("A3").value = `Kelas: ${kelas} | Semester: ${
        selectedSemester === "1" ? "Ganjil" : "Genap"
      } | Tahun Ajaran: ${academicInfo.year}`;
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
        a.download = `Template_Nilai_${selectedMapel}_${kelas}_Semester_${selectedSemester}_${academicInfo.year.replace(
          /\//g,
          "-"
        )}.xlsx`;
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

    if (!selectedMapel || !kelas || !selectedSemester || !academicInfo) {
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

  // ✅ STEP 1: Tambah 3 Fungsi Helper setelah handleImportExcel
  const toggleAllTercapaiSemuaSiswa = () => {
    const updated = siswaList.map((siswa) => ({
      ...siswa,
      tp_tercapai: tpList.map((tp) => tp.id),
      tp_perlu_peningkatan: [],
    }));
    setSiswaList(updated);

    // ✅ Toast muncul untuk konfirmasi aksi user
    if (onShowToast)
      onShowToast(
        `✓ Semua TP ditandai tercapai untuk ${siswaList.length} siswa`,
        "success"
      );

    // Auto-save silent di background
    triggerAutoSave();
  };

  const toggleAllPerluPeningkatanSemuaSiswa = () => {
    const updated = siswaList.map((siswa) => ({
      ...siswa,
      tp_tercapai: [],
      tp_perlu_peningkatan: tpList.map((tp) => tp.id),
    }));
    setSiswaList(updated);

    if (onShowToast)
      onShowToast(
        `⚠ Semua TP ditandai perlu peningkatan untuk ${siswaList.length} siswa`,
        "info"
      );

    triggerAutoSave();
  };

  const resetAllTPSemuaSiswa = () => {
    const updated = siswaList.map((siswa) => ({
      ...siswa,
      tp_tercapai: [],
      tp_perlu_peningkatan: [],
    }));
    setSiswaList(updated);

    if (onShowToast)
      onShowToast(
        `↺ Semua centang TP direset untuk ${siswaList.length} siswa`,
        "info"
      );

    triggerAutoSave();
  };

  if (loading && !kelas) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className={`mt-3 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
            Memuat data akademik dan mengajar...
          </p>
        </div>
      </div>
    );
  }

  if (!academicInfo) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${
          darkMode
            ? "bg-gradient-to-br from-gray-900 to-gray-800"
            : "bg-gradient-to-br from-blue-50 to-sky-100"
        }`}>
        <div className="text-center">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              darkMode ? "bg-red-900/30" : "bg-red-100"
            }`}>
            <svg
              className={`w-8 h-8 ${
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
            className={`text-lg font-bold mb-2 ${
              darkMode ? "text-white" : "text-gray-900"
            }`}>
            Data Akademik Tidak Ditemukan
          </h3>
          <p className={`${darkMode ? "text-gray-300" : "text-gray-600"}`}>
            Tidak ada tahun ajaran aktif di sistem.
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
          {/* Header dengan Info Akademik */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b">
            <h2
              className={`text-xl sm:text-2xl lg:text-3xl font-bold mb-4 sm:mb-0 ${
                darkMode ? "text-white" : "text-blue-800"
              }`}>
              Input Nilai e-Raport
            </h2>
            <div
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                darkMode
                  ? "bg-blue-900/30 text-blue-300"
                  : "bg-blue-100 text-blue-800"
              }`}>
              {academicInfo.displayText}
            </div>
          </div>

          {/* Info Akademik Detail */}
          <div
            className="mb-6 p-4 rounded-lg border bg-opacity-50"
            style={{
              backgroundColor: darkMode
                ? "rgba(30, 58, 138, 0.2)"
                : "rgba(219, 234, 254, 0.5)",
              borderColor: darkMode ? "#374151" : "#bfdbfe",
            }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex flex-col">
                <span
                  className={`text-xs font-medium mb-1 ${
                    darkMode ? "text-gray-400" : "text-gray-500"
                  }`}>
                  Tahun Ajaran Aktif
                </span>
                <span
                  className={`font-medium ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}>
                  {academicInfo.year}
                </span>
              </div>
              <div className="flex flex-col">
                <span
                  className={`text-xs font-medium mb-1 ${
                    darkMode ? "text-gray-400" : "text-gray-500"
                  }`}>
                  Semester Aktif di Sistem
                </span>
                <span
                  className={`font-medium ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}>
                  {academicInfo.semesterText}
                </span>
              </div>
              <div className="flex flex-col">
                <span
                  className={`text-xs font-medium mb-1 ${
                    darkMode ? "text-gray-400" : "text-gray-500"
                  }`}>
                  Status Tahun Ajaran
                </span>
                <span
                  className={`font-medium ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}>
                  {academicInfo.isActive ? "Aktif" : "Tidak Aktif"}
                </span>
              </div>
            </div>
          </div>

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
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
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

          {kelas && selectedMapel && selectedSemester && (
            <>
              {/* ✅ SEMUA TOMBOL DALAM 1 BARIS */}
              <div className="flex flex-wrap gap-2 sm:gap-3 mb-6 justify-end items-center">
                <button
                  onClick={toggleAllTercapaiSemuaSiswa}
                  disabled={tpList.length === 0 || siswaList.length === 0}
                  className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                    darkMode
                      ? "bg-green-900/50 hover:bg-green-800 text-green-200 border border-green-700"
                      : "bg-green-100 hover:bg-green-200 text-green-800 border border-green-300"
                  }`}
                  title="Tandai semua TP tercapai untuk semua siswa">
                  <span className="hidden sm:inline">✓</span> Tandai Semua
                  Tercapai
                </button>

                <button
                  onClick={toggleAllPerluPeningkatanSemuaSiswa}
                  disabled={tpList.length === 0 || siswaList.length === 0}
                  className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                    darkMode
                      ? "bg-yellow-900/50 hover:bg-yellow-800 text-yellow-200 border border-yellow-700"
                      : "bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border border-yellow-300"
                  }`}
                  title="Tandai semua TP perlu peningkatan untuk semua siswa">
                  <span className="hidden sm:inline">⚠</span> Tandai Perlu
                  Peningkatan
                </button>

                <button
                  onClick={resetAllTPSemuaSiswa}
                  disabled={tpList.length === 0 || siswaList.length === 0}
                  className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                    darkMode
                      ? "bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300"
                  }`}
                  title="Reset semua centang TP untuk semua siswa">
                  <span className="hidden sm:inline">↺</span> Reset Semua
                </button>

                {/* Separator */}
                <div
                  className={`hidden lg:block w-px h-8 ${
                    darkMode ? "bg-gray-600" : "bg-gray-300"
                  }`}></div>

                <button
                  onClick={handleDownloadTemplate}
                  className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm shadow-md hover:shadow-lg ${
                    darkMode
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-green-600 hover:bg-green-700 text-white"
                  }`}>
                  <Download size={16} className="sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Download</span> Template
                </button>

                <label
                  className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg cursor-pointer font-medium transition-all duration-200 text-xs sm:text-sm shadow-md hover:shadow-lg ${
                    darkMode
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}>
                  <Upload size={16} className="sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Import</span> Excel
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleImportExcel}
                    className="hidden"
                  />
                </label>
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
                            {/* ✅ BAGIAN 6: Fix UI Alignment (Checkbox + Text) - Kolom "TP Tercapai" */}
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
                            {/* ✅ BAGIAN 6: Fix UI Alignment (Checkbox + Text) - Kolom "TP Perlu Peningkatan" */}
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

                  {/* ✅ STEP 4: Tombol Simpan di Bawah Tabel */}
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => handleSave(false)}
                      disabled={
                        saving || siswaList.length === 0 || tpList.length === 0
                      }
                      className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 min-h-[44px] rounded-xl bg-blue-700 hover:bg-blue-800 text-white transition-all duration-200 text-base sm:text-lg font-bold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed">
                      <Save size={24} />
                      Simpan Semua Data ({siswaList.length} Siswa)
                    </button>
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
              {academicInfo && (
                <div
                  className={`mt-3 px-3 py-1.5 rounded-lg text-sm inline-block ${
                    darkMode
                      ? "bg-blue-900/30 text-blue-300"
                      : "bg-blue-100 text-blue-800"
                  }`}>
                  Tahun Ajaran: {academicInfo.year}
                </div>
              )}
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
