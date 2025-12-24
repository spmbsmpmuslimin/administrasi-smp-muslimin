import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  Calendar,
  Eye,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  UserPlus,
  Users,
  Clock,
  PlayCircle,
  PauseCircle,
  Trash2,
  Copy,
  Info, // ← TAMBAHKAN INI untuk tooltip
} from "lucide-react";
import Simulator from "./Simulator";

const AcademicYearTab = ({
  user,
  loading,
  setLoading,
  showToast,
  schoolConfig,
}) => {
  const [schoolStats, setSchoolStats] = useState({
    academic_year: "2025/2026",
    total_students: 0,
  });
  const [studentsByClass, setStudentsByClass] = useState({});
  const [yearTransition, setYearTransition] = useState({
    preview: null,
    newYear: "",
    inProgress: false,
  });

  const [semesters, setSemesters] = useState([]);
  const [showAddSemester, setShowAddSemester] = useState(false);
  const [newSemester, setNewSemester] = useState({
    year: "",
    semester: 1,
    start_date: "",
    end_date: "",
  });

  // ========== FITUR BARU: STATE COPY ASSIGNMENTS ==========
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyConfig, setCopyConfig] = useState({
    sourceYear: "",
    sourceSemester: 1,
    targetYear: "",
    targetSemester: 2,
  });
  const [assignmentPreview, setAssignmentPreview] = useState(null); // ← TAMBAHKAN INI

  // ========== FITUR BARU: SMART SEMESTER SWITCH ==========
  const [activeSemester, setActiveSemester] = useState(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchPreview, setSwitchPreview] = useState(null);

  const config = {
    schoolName: schoolConfig?.schoolName || "SMP Muslimin Cililin",
    schoolLevel: schoolConfig?.schoolLevel || "SMP",
    grades: ["7", "8", "9"],
    classesPerGrade: schoolConfig?.classesPerGrade || [
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
    ],
  };

  const graduatingGrade = config.grades[config.grades.length - 1];

  useEffect(() => {
    loadSchoolData();
    loadSemesters();
    loadActiveSemester(); // ← TAMBAHKAN INI
  }, []);

  useEffect(() => {
    if (copyConfig.sourceYear && copyConfig.sourceSemester) {
      loadAssignmentPreview(copyConfig.sourceYear, copyConfig.sourceSemester); // ← TAMBAHKAN INI
    } else {
      setAssignmentPreview(null);
    }
  }, [copyConfig.sourceYear, copyConfig.sourceSemester]);

  const loadActiveSemester = async () => {
    try {
      const { data, error } = await supabase
        .from("academic_years")
        .select("*")
        .eq("is_active", true)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      setActiveSemester(data);

      // Generate preview if active semester exists
      if (data) {
        const targetSemester = data.semester === 1 ? 2 : 1;
        const targetSemesterName = targetSemester === 1 ? "Ganjil" : "Genap";

        setSwitchPreview({
          current: {
            year: data.year,
            semester: data.semester,
            name: data.semester === 1 ? "Ganjil" : "Genap",
          },
          target: {
            year: data.year,
            semester: targetSemester,
            name: targetSemesterName,
          },
        });
      }
    } catch (error) {
      console.error("Error loading active semester:", error);
    }
  };

  const loadAssignmentPreview = async (sourceYear, sourceSemester) => {
    try {
      const { data, error, count } = await supabase
        .from("teacher_assignments")
        .select("*", { count: "exact", head: true })
        .eq("academic_year", sourceYear)
        .eq("semester", sourceSemester);

      if (error) throw error;
      setAssignmentPreview({ count: count || 0 });
    } catch (error) {
      console.error("Error loading assignment preview:", error);
      setAssignmentPreview({ count: 0 });
    }
  };

  const validateCopyConfig = () => {
    const errors = [];

    // Check if source selected
    if (!copyConfig.sourceYear || !copyConfig.sourceSemester) {
      errors.push("❌ Pilih source semester terlebih dahulu");
    }

    // Check if target selected
    if (!copyConfig.targetYear || !copyConfig.targetSemester) {
      errors.push("❌ Pilih target semester terlebih dahulu");
    }

    // Check if source = target
    if (
      copyConfig.sourceYear === copyConfig.targetYear &&
      copyConfig.sourceSemester === copyConfig.targetSemester
    ) {
      errors.push("❌ Source dan target tidak boleh sama");
    }

    // Check if source has data
    if (assignmentPreview && assignmentPreview.count === 0) {
      errors.push("⚠️ Source semester tidak memiliki data assignment");
    }

    return errors;
  };

  const loadSemesters = async () => {
    try {
      const { data, error } = await supabase
        .from("academic_years")
        .select("*")
        .order("year", { ascending: false })
        .order("semester", { ascending: false });

      if (error) throw error;
      setSemesters(data || []);

      // Reload active semester after loading all semesters
      await loadActiveSemester();
    } catch (error) {
      console.error("Error loading semesters:", error);
      showToast("Gagal memuat data semester: " + error.message, "error");
    }
  };

  // ========== FITUR BARU: SMART SEMESTER SWITCH ==========
  const executeSmartSemesterSwitch = async () => {
    if (!activeSemester) {
      showToast("❌ Tidak ada semester aktif yang ditemukan!", "error");
      return;
    }

    // STEP 1: Triple Confirmation
    const confirm1 = window.confirm(
      `🔄 KONFIRMASI PERPINDAHAN SEMESTER\n\n` +
        `Dari: ${activeSemester.year} - Semester ${
          activeSemester.semester === 1 ? "Ganjil" : "Genap"
        }\n` +
        `Ke: ${activeSemester.year} - Semester ${
          activeSemester.semester === 1 ? "Genap" : "Ganjil"
        }\n\n` +
        `Proses yang akan dilakukan:\n` +
        `✅ Check & create semester baru (jika belum ada)\n` +
        `✅ Copy semua teacher assignments\n` +
        `✅ Aktifkan semester baru\n` +
        `✅ Non-aktifkan semester lama\n\n` +
        `Lanjutkan?`
    );

    if (!confirm1) return;

    const confirm2 = prompt(
      `Ketik "PINDAH SEMESTER" (huruf besar) untuk konfirmasi:`
    );

    if (confirm2 !== "PINDAH SEMESTER") {
      showToast("Perpindahan semester dibatalkan", "info");
      return;
    }

    try {
      setIsSwitching(true);
      const targetSemester = activeSemester.semester === 1 ? 2 : 1;

      // STEP 2: Check if target semester exists
      showToast("🔍 Mengecek semester target...", "info");
      const { data: existingSemester } = await supabase
        .from("academic_years")
        .select("*")
        .eq("year", activeSemester.year)
        .eq("semester", targetSemester)
        .single();

      let targetSemesterId;

      // STEP 3: Create semester if not exists
      if (!existingSemester) {
        showToast("📝 Membuat semester baru...", "info");

        // Auto-calculate dates
        const currentStartDate = new Date(activeSemester.start_date);
        const currentEndDate = new Date(activeSemester.end_date);

        let newStartDate, newEndDate;

        if (targetSemester === 2) {
          // Semester 2 starts after semester 1 ends
          newStartDate = new Date(currentEndDate);
          newStartDate.setDate(newStartDate.getDate() + 1);

          newEndDate = new Date(newStartDate);
          newEndDate.setMonth(newEndDate.getMonth() + 6);
        } else {
          // Semester 1 starts in new academic year
          newStartDate = new Date(currentEndDate);
          newStartDate.setDate(newStartDate.getDate() + 1);

          newEndDate = new Date(newStartDate);
          newEndDate.setMonth(newEndDate.getMonth() + 6);
        }

        const { data: newSemester, error: createError } = await supabase
          .from("academic_years")
          .insert({
            year: activeSemester.year,
            semester: targetSemester,
            start_date: newStartDate.toISOString().split("T")[0],
            end_date: newEndDate.toISOString().split("T")[0],
            is_active: false,
          })
          .select()
          .single();

        if (createError) throw createError;
        targetSemesterId = newSemester.id;

        showToast("✅ Semester baru berhasil dibuat!", "success");
      } else {
        targetSemesterId = existingSemester.id;
        showToast("✅ Semester target sudah ada, melanjutkan...", "info");
      }

      // STEP 4: Copy teacher assignments
      showToast("📋 Mengambil data teacher assignments...", "info");

      const { data: assignments, error: fetchError } = await supabase
        .from("teacher_assignments")
        .select("*")
        .eq("academic_year", activeSemester.year)
        .eq("semester", activeSemester.semester);

      if (fetchError) throw fetchError;

      if (assignments && assignments.length > 0) {
        showToast(`📊 Ditemukan ${assignments.length} assignments`, "info");

        // Delete existing assignments in target semester
        const { error: deleteError } = await supabase
          .from("teacher_assignments")
          .delete()
          .eq("academic_year", activeSemester.year)
          .eq("semester", targetSemester);

        if (deleteError) throw deleteError;

        // Copy assignments
        const newAssignments = assignments.map((a) => ({
          teacher_id: a.teacher_id,
          subject: a.subject,
          class_id: a.class_id,
          academic_year: activeSemester.year,
          semester: targetSemester,
          academic_year_id: targetSemesterId,
        }));

        const { error: insertError } = await supabase
          .from("teacher_assignments")
          .insert(newAssignments);

        if (insertError) throw insertError;

        showToast(
          `✅ ${assignments.length} assignments berhasil di-copy!`,
          "success"
        );
      } else {
        showToast("ℹ️ Tidak ada assignments untuk di-copy", "info");
      }

      // STEP 5: Switch active semester
      showToast("🔄 Mengaktifkan semester baru...", "info");

      // Deactivate current
      const { error: deactivateError } = await supabase
        .from("academic_years")
        .update({ is_active: false })
        .eq("id", activeSemester.id);

      if (deactivateError) throw deactivateError;

      // Activate target
      const { error: activateError } = await supabase
        .from("academic_years")
        .update({ is_active: true })
        .eq("id", targetSemesterId);

      if (activateError) throw activateError;

      // STEP 6: Success
      showToast(
        `✅ Berhasil pindah ke Semester ${
          targetSemester === 1 ? "Ganjil" : "Genap"
        }!\n\n` +
          `📅 Tahun Ajaran: ${activeSemester.year}\n` +
          `📚 Semester: ${
            targetSemester === 1 ? "Ganjil" : "Genap"
          } (${targetSemester})\n` +
          `📋 ${assignments?.length || 0} teacher assignments di-copy\n\n` +
          `Sistem sekarang menggunakan semester baru.`,
        "success"
      );

      // Reload data
      await loadActiveSemester();
      await loadSemesters();
    } catch (error) {
      console.error("Error:", error);

      let errorMessage = "❌ Gagal pindah semester: ";

      if (error.message.includes("duplicate key")) {
        errorMessage += "Data sudah ada (duplikat)";
      } else if (error.message.includes("foreign key")) {
        errorMessage += "Data terkait dengan data lain (tidak bisa dihapus)";
      } else if (error.code === "PGRST116") {
        errorMessage += "Data tidak ditemukan";
      } else {
        errorMessage += error.message;
      }

      showToast(errorMessage, "error");
    } finally {
      setIsSwitching(false);
    }
  };

  const loadSchoolData = async () => {
    try {
      setLoading(true);

      const { data: settingsData, error: settingsError } = await supabase
        .from("school_settings")
        .select("setting_key, setting_value")
        .eq("setting_key", "academic_year");

      if (settingsError) throw settingsError;

      const academicYear = settingsData?.[0]?.setting_value || "2025/2026";

      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select(
          `
    id, 
    nis, 
    full_name, 
    gender, 
    class_id, 
    is_active,
    academic_year,
    classes:class_id (
      id,
      grade,
      academic_year
    )
  `
        )
        .eq("is_active", true)
        .eq("academic_year", academicYear)
        .order("full_name");

      if (studentsError) throw studentsError;

      const studentsByClass = {};

      studentsData?.forEach((student) => {
        const classId = student.class_id;
        const grade = student.classes?.grade;

        if (classId && grade !== null && grade !== undefined) {
          if (!studentsByClass[classId]) {
            studentsByClass[classId] = {
              grade: grade,
              students: [],
            };
          }
          studentsByClass[classId].students.push(student);
        }
      });

      setStudentsByClass(studentsByClass);
      setSchoolStats({
        academic_year: academicYear,
        total_students: studentsData?.length || 0,
      });
    } catch (error) {
      console.error("Error loading school data:", error);
      showToast("Gagal memuat data sekolah: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSemester = async () => {
    if (!newSemester.year || !newSemester.start_date || !newSemester.end_date) {
      showToast("Semua field harus diisi!", "error");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("academic_years")
        .insert([
          {
            year: newSemester.year,
            semester: parseInt(newSemester.semester),
            start_date: newSemester.start_date,
            end_date: newSemester.end_date,
            is_active: false,
          },
        ])
        .select();

      if (error) throw error;

      showToast("✅ Semester berhasil ditambahkan!", "success");
      setShowAddSemester(false);
      setNewSemester({
        year: "",
        semester: 1,
        start_date: "",
        end_date: "",
      });
      loadSemesters();
    } catch (error) {
      console.error("Error adding semester:", error);
      showToast("Gagal menambahkan semester: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleActivateSemester = async (semesterId) => {
    const confirmed = window.confirm(
      "Aktifkan semester ini?\n\nSemester yang sedang aktif akan dinonaktifkan."
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      const { error: deactivateError } = await supabase
        .from("academic_years")
        .update({ is_active: false })
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (deactivateError) throw deactivateError;

      const { error: activateError } = await supabase
        .from("academic_years")
        .update({ is_active: true })
        .eq("id", semesterId);

      if (activateError) throw activateError;

      showToast("✅ Semester berhasil diaktifkan!", "success");
      loadSemesters();
    } catch (error) {
      console.error("Error activating semester:", error);
      showToast("Gagal mengaktifkan semester: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSemester = async (semesterId, isActive) => {
    if (isActive) {
      showToast("❌ Tidak bisa menghapus semester yang sedang aktif!", "error");
      return;
    }

    // Enhanced triple confirmation
    const confirm1 = window.confirm(
      `⚠️ PERINGATAN: HAPUS SEMESTER\n\n` +
        `Anda akan menghapus semester ini secara permanen.\n\n` +
        `Tindakan ini TIDAK DAPAT DIBATALKAN!\n\n` +
        `Lanjutkan?`
    );

    if (!confirm1) return;

    const confirm2 = prompt(
      `Untuk konfirmasi, ketik "DELETE" (huruf besar semua):`
    );

    if (confirm2 !== "DELETE") {
      showToast("Penghapusan semester dibatalkan", "info");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from("academic_years")
        .delete()
        .eq("id", semesterId);

      if (error) throw error;

      showToast("✅ Semester berhasil dihapus!", "success");
      loadSemesters();
    } catch (error) {
      console.error("Error deleting semester:", error);

      let errorMessage = "❌ Gagal menghapus semester: ";

      if (error.message.includes("foreign key")) {
        errorMessage +=
          "Semester terkait dengan data lain (teacher assignments, dll)";
      } else {
        errorMessage += error.message;
      }

      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  // ========== FITUR BARU: COPY TEACHER ASSIGNMENTS ==========

  const handleOpenCopyModal = () => {
    const activeSem = semesters.find((s) => s.is_active);

    if (activeSem) {
      setCopyConfig({
        sourceYear: activeSem.year,
        sourceSemester: activeSem.semester,
        targetYear: activeSem.year,
        targetSemester: activeSem.semester === 1 ? 2 : 1,
      });
    } else {
      setCopyConfig({
        sourceYear: "",
        sourceSemester: 1,
        targetYear: "",
        targetSemester: 2,
      });
    }

    setShowCopyModal(true);
  };

  const handleCopyAssignments = async () => {
    const { sourceYear, sourceSemester, targetYear, targetSemester } =
      copyConfig;

    if (!sourceYear || !targetYear) {
      showToast("Pilih tahun ajaran source dan target!", "error");
      return;
    }

    const validationErrors = validateCopyConfig();
    if (validationErrors.length > 0) {
      showToast(validationErrors[0], "error");
      return;
    }

    const confirmed = window.confirm(
      `Copy semua teacher assignments dari:\n\n` +
        `📚 Source: ${sourceYear} Semester ${sourceSemester}\n` +
        `📝 Target: ${targetYear} Semester ${targetSemester}\n\n` +
        `📊 ${assignmentPreview?.count || 0} assignments akan di-copy\n\n` +
        `Data assignment yang sudah ada di target akan DITIMPA!\n\n` +
        `Lanjutkan?`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      showToast("🔄 Mengambil data assignment source...", "info");

      // 1. Ambil data dari source
      const { data: sourceData, error: sourceError } = await supabase
        .from("teacher_assignments")
        .select("*")
        .eq("academic_year", sourceYear)
        .eq("semester", sourceSemester);

      if (sourceError) throw sourceError;

      if (!sourceData || sourceData.length === 0) {
        showToast("❌ Tidak ada data assignment di source semester!", "error");
        setLoading(false);
        return;
      }

      showToast(
        `📊 Ditemukan ${sourceData.length} assignment untuk di-copy`,
        "info"
      );

      // 2. Hapus data lama di target (jika ada)
      showToast("🗑️ Menghapus data lama di target semester...", "info");
      const { error: deleteError } = await supabase
        .from("teacher_assignments")
        .delete()
        .eq("academic_year", targetYear)
        .eq("semester", targetSemester);

      if (deleteError) throw deleteError;

      // 3. Copy data ke target dengan update year & semester
      showToast("📝 Menyalin assignment ke target semester...", "info");
      const newAssignments = sourceData.map((assignment) => ({
        teacher_id: assignment.teacher_id,
        subject: assignment.subject,
        class_id: assignment.class_id,
        academic_year: targetYear,
        semester: targetSemester,
      }));

      // Insert dalam batch (50 per batch untuk menghindari timeout)
      const BATCH_SIZE = 50;
      let totalInserted = 0;

      for (let i = 0; i < newAssignments.length; i += BATCH_SIZE) {
        const batch = newAssignments.slice(i, i + BATCH_SIZE);

        const { error: insertError } = await supabase
          .from("teacher_assignments")
          .insert(batch);

        if (insertError) throw insertError;

        totalInserted += batch.length;
        showToast(
          `✅ Progress: ${totalInserted}/${newAssignments.length} assignment`,
          "info"
        );
      }

      showToast(
        `✅ Berhasil copy ${totalInserted} teacher assignments!\n\n` +
          `Dari: ${sourceYear} Semester ${sourceSemester}\n` +
          `Ke: ${targetYear} Semester ${targetSemester}`,
        "success"
      );

      setShowCopyModal(false);
    } catch (error) {
      console.error("Error copying assignments:", error);

      let errorMessage = "❌ Gagal copy assignments: ";

      if (error.message.includes("duplicate key")) {
        errorMessage += "Data sudah ada (duplikat)";
      } else if (error.message.includes("foreign key")) {
        errorMessage += "Data terkait dengan data lain";
      } else {
        errorMessage += error.message;
      }

      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const getStudentsByGrade = () => {
    const byGrade = { 7: 0, 8: 0, 9: 0 };

    Object.entries(studentsByClass).forEach(([classId, classData]) => {
      const grade = String(classData.grade);

      if (grade === "7" || grade === "8" || grade === "9") {
        byGrade[grade] += classData.students.length;
      }
    });

    return byGrade;
  };

  const generateYearTransitionPreview = async () => {
    try {
      setLoading(true);

      const currentYear = schoolStats.academic_year;
      const [startYear] = currentYear.split("/");
      const newYear = `${parseInt(startYear) + 1}/${parseInt(startYear) + 2}`;

      const promotionPlan = {};
      const graduatingStudents = [];

      Object.entries(studentsByClass).forEach(([classId, classData]) => {
        const { grade, students } = classData;

        if (grade == graduatingGrade) {
          graduatingStudents.push(...students);
        } else {
          const currentIndex = config.grades.indexOf(grade.toString());
          if (currentIndex < config.grades.length - 1) {
            const nextGrade = config.grades[currentIndex + 1];
            const classLetter = classId.replace(/[0-9]/g, "");
            const newClassId = `${nextGrade}${classLetter}`;

            if (!promotionPlan[newClassId]) {
              promotionPlan[newClassId] = [];
            }
            promotionPlan[newClassId].push(...students);
          }
        }
      });

      const { data: spmb_settings } = await supabase
        .from("spmb_settings")
        .select("target_academic_year")
        .eq("is_active", true)
        .single();

      const targetYear = spmb_settings?.target_academic_year || newYear;

      console.log("🔍 Looking for siswa baru with academic_year:", targetYear);

      const { data: siswaBaruData, error: siswaBaruError } = await supabase
        .from("siswa_baru")
        .select("*")
        .eq("is_transferred", false)
        .eq("academic_year", targetYear)
        .not("kelas", "is", null);

      if (siswaBaruError) {
        console.warn("Error loading siswa baru:", siswaBaruError);
      }

      console.log("📊 Siswa baru ditemukan:", siswaBaruData?.length || 0);

      // ✅ GANTI JADI INI
      const { data: existingStudents } = await supabase
        .from("students")
        .select("nis")
        .eq("is_active", true); // ✅ Filter active students only

      const existingNIS = new Set(existingStudents?.map((s) => s.nis) || []);

      const validNewStudents = [];
      const conflictedNIS = [];

      siswaBaruData?.forEach((siswa) => {
        if (siswa.nisn && existingNIS.has(siswa.nisn)) {
          conflictedNIS.push({
            nama: siswa.nama_lengkap,
            nisn: siswa.nisn,
          });
        } else {
          validNewStudents.push(siswa);
        }
      });

      const newStudentDistribution = {};
      const firstGrade = config.grades[0];
      const classLetters = config.classesPerGrade || [
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
      ];

      classLetters.forEach((letter) => {
        newStudentDistribution[`${firstGrade}${letter}`] = [];
      });

      validNewStudents.forEach((siswa) => {
        const kelasAsli = siswa.kelas;
        if (kelasAsli && kelasAsli.startsWith("7")) {
          if (!newStudentDistribution[kelasAsli]) {
            newStudentDistribution[kelasAsli] = [];
          }
          newStudentDistribution[kelasAsli].push(siswa);
        }
      });

      setYearTransition({
        preview: {
          currentYear,
          newYear,
          promotions: promotionPlan,
          graduating: graduatingStudents,
          newStudents: validNewStudents,
          newStudentDistribution: newStudentDistribution,
          conflictedNIS: conflictedNIS,
        },
        newYear,
        inProgress: false,
      });

      if (conflictedNIS.length > 0) {
        showToast(
          `⚠️ ${conflictedNIS.length} siswa baru memiliki NIS yang sudah terdaftar!`,
          "error"
        );
      }
    } catch (error) {
      console.error("Error generating preview:", error);
      showToast("Error generating preview: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const createNewClasses = async (newYear) => {
    const classesToCreate = [];
    const classLetters = config.classesPerGrade || [
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
    ];

    for (const grade of config.grades) {
      for (const letter of classLetters) {
        classesToCreate.push({
          id: `${grade}${letter}`,
          grade: parseInt(grade),
          academic_year: newYear,
        });
      }
    }

    const { data, error } = await supabase
      .from("classes")
      .insert(classesToCreate)
      .select();

    if (error) throw error;
    return data;
  };

  const executeYearTransition = async () => {
    const { preview } = yearTransition;

    // Enhanced triple confirmation
    const confirm1 = window.confirm(
      `⚠️ PERINGATAN: TRANSISI TAHUN AJARAN\n\n` +
        `Anda akan melakukan transisi tahun ajaran dari:\n` +
        `${preview.currentYear} → ${preview.newYear}\n\n` +
        `Proses yang akan dilakukan:\n` +
        `• Membuat 18 kelas baru\n` +
        `• Menaikkan ${
          Object.values(preview.promotions).flat().length
        } siswa\n` +
        `• Memasukkan ${preview.newStudents.length} siswa baru\n` +
        `• Meluluskan ${preview.graduating.length} siswa\n` +
        `• Mereset assignment guru\n\n` +
        `Tindakan ini TIDAK DAPAT DIBATALKAN!\n\n` +
        `Lanjutkan?`
    );

    if (!confirm1) return;

    const confirm2 = prompt(
      `Untuk konfirmasi, ketik "EXECUTE" (huruf besar semua):`
    );

    if (confirm2 !== "EXECUTE") {
      showToast("Transisi tahun ajaran dibatalkan", "info");
      return;
    }

    // Final countdown confirmation
    const confirm3 = window.confirm(
      `⏳ Final Warning!\n\n` +
        `Transisi tahun ajaran akan dimulai dalam 3 detik.\n\n` +
        `Tekan OK untuk melanjutkan, Cancel untuk membatalkan.`
    );

    if (!confirm3) {
      showToast("Transisi tahun ajaran dibatalkan", "info");
      return;
    }

    try {
      setLoading(true);
      setYearTransition((prev) => ({ ...prev, inProgress: true }));

      showToast("Membuat 18 kelas baru...", "info");
      const newClasses = await createNewClasses(yearTransition.newYear);

      // ========== REVISI FIX #2A: CREATE/GET ACADEMIC YEAR ID ==========
      showToast("🔍 Mengecek semester untuk tahun ajaran baru...", "info");

      let targetAcademicYearId;

      // Deactivate all semesters from old year
      const { error: deactivateOldError } = await supabase
        .from("academic_years")
        .update({ is_active: false })
        .eq("year", preview.currentYear);

      if (deactivateOldError) {
        console.warn("Warning deactivating old semesters:", deactivateOldError);
      }

      // Check if semester 1 for new year already exists
      const { data: existingAcademicYear } = await supabase
        .from("academic_years")
        .select("id")
        .eq("year", yearTransition.newYear)
        .eq("semester", 1)
        .single();

      if (existingAcademicYear) {
        // Semester already exists, just activate it
        targetAcademicYearId = existingAcademicYear.id;

        const { error: activateError } = await supabase
          .from("academic_years")
          .update({ is_active: true })
          .eq("id", targetAcademicYearId);

        if (activateError) throw activateError;

        showToast("✅ Semester 1 sudah ada, mengaktifkan...", "info");
      } else {
        // Create new semester 1
        showToast("📅 Membuat semester 1 untuk tahun ajaran baru...", "info");

        const [startYear] = yearTransition.newYear.split("/");
        const semesterStartDate = `${startYear}-07-01`;
        const semesterEndDate = `${startYear}-12-31`;

        const { data: newAcademicYear, error: createError } = await supabase
          .from("academic_years")
          .insert({
            year: yearTransition.newYear,
            semester: 1,
            start_date: semesterStartDate,
            end_date: semesterEndDate,
            is_active: true,
          })
          .select()
          .single();

        if (createError) throw createError;

        targetAcademicYearId = newAcademicYear.id;
        showToast("✅ Semester 1 berhasil dibuat!", "success");
      }
      // ========== END REVISI FIX #2A ==========

      if (preview.graduating.length > 0) {
        showToast(`Meluluskan ${preview.graduating.length} siswa...`, "info");
        const graduatingIds = preview.graduating.map((s) => s.id);

        const { error: graduateError } = await supabase
          .from("students")
          .update({ is_active: false })
          .in("id", graduatingIds);

        if (graduateError) throw graduateError;
      }

      for (const [newClassId, students] of Object.entries(preview.promotions)) {
        showToast(
          `Menaikkan ${students.length} siswa ke kelas ${newClassId}...`,
          "info"
        );

        const studentIds = students.map((s) => s.id);

        // ========== REVISI FIX #2B: UPDATE PROMOTE STUDENTS ==========
        const { error: promoteError } = await supabase
          .from("students")
          .update({
            class_id: newClassId,
            academic_year: yearTransition.newYear,
            academic_year_id: targetAcademicYearId, // ← ADD THIS LINE
          })
          .in("id", studentIds);

        if (promoteError) throw promoteError;
      }

      if (preview.newStudents.length > 0) {
        const { data: latestSiswaBaruData, error: fetchError } = await supabase
          .from("siswa_baru")
          .select("*")
          .eq("is_transferred", false)
          .eq("academic_year", yearTransition.newYear)
          .not("kelas", "is", null);

        if (fetchError) throw fetchError;

        const totalLatest = latestSiswaBaruData?.length || 0;
        const totalPreview = preview.newStudents.length;

        if (totalLatest !== totalPreview) {
          console.warn(
            `⚠️ Data siswa baru berubah: Preview ${totalPreview} → Sekarang ${totalLatest}`
          );
          showToast(
            `ℹ️ Data siswa baru diupdate: ${totalLatest} siswa akan dimasukkan`,
            "info"
          );
        }

        if (latestSiswaBaruData && latestSiswaBaruData.length > 0) {
          showToast(
            `Memasukkan ${latestSiswaBaruData.length} siswa baru...`,
            "info"
          );

          const distributionByClass = {};

          latestSiswaBaruData.forEach((siswa) => {
            const kelas = siswa.kelas;
            if (!distributionByClass[kelas]) {
              distributionByClass[kelas] = [];
            }
            distributionByClass[kelas].push(siswa);
          });

          for (const [classId, siswaList] of Object.entries(
            distributionByClass
          )) {
            if (siswaList.length === 0) continue;

            // ========== REVISI FIX #2C: UPDATE INSERT NEW STUDENTS ==========
            const newStudentsData = siswaList.map((siswa) => ({
              nis: siswa.nisn || null,
              full_name: siswa.nama_lengkap,
              gender: siswa.jenis_kelamin,
              class_id: classId,
              academic_year: yearTransition.newYear,
              academic_year_id: targetAcademicYearId, // ← ADD THIS LINE
              is_active: true,
            }));

            const { error: insertError } = await supabase
              .from("students")
              .insert(newStudentsData);

            if (insertError) throw insertError;
          }

          const siswaBaruIds = latestSiswaBaruData.map((s) => s.id);

          const { error: updateSiswaBaruError } = await supabase
            .from("siswa_baru")
            .update({
              is_transferred: true,
              transferred_at: new Date().toISOString(),
              transferred_by: user?.id || null,
            })
            .in("id", siswaBaruIds);

          if (updateSiswaBaruError) throw updateSiswaBaruError;
        }
      }

      showToast("Mereset assignment guru...", "info");
      const { error: teacherResetError } = await supabase
        .from("teacher_assignments")
        .delete()
        .eq("academic_year", schoolStats.academic_year);

      if (teacherResetError) throw teacherResetError;

      // ✅ FIX #3: CODE INI SUDAH ADA DAN BENAR
      const { error: settingError } = await supabase
        .from("school_settings")
        .update({ setting_value: yearTransition.newYear })
        .eq("setting_key", "academic_year");

      if (settingError) throw settingError;

      setSchoolStats((prev) => ({
        ...prev,
        academic_year: yearTransition.newYear,
      }));

      showToast(
        `✅ Tahun ajaran ${yearTransition.newYear} berhasil dimulai!\n\n` +
          `📊 ${preview.newStudents.length} siswa baru masuk grade 7\n` +
          `⬆️ ${
            Object.values(preview.promotions).flat().length
          } siswa naik kelas\n` +
          `🎓 ${preview.graduating.length} siswa lulus\n` +
          `👨‍🏫 Silakan assign guru ke kelas baru`,
        "success"
      );

      await loadSchoolData();
      setYearTransition({ preview: null, newYear: "", inProgress: false });
    } catch (error) {
      console.error("Error executing year transition:", error);

      let errorMessage = "❌ Gagal memulai tahun ajaran baru: ";

      if (error.message.includes("duplicate key")) {
        errorMessage += "Kelas sudah ada (duplikat)";
      } else if (error.message.includes("foreign key")) {
        errorMessage += "Data terkait dengan data lain";
      } else {
        errorMessage += error.message;
      }

      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
      setYearTransition((prev) => ({ ...prev, inProgress: false }));
    }
  };

  const studentsByGrade = getStudentsByGrade();

  return (
    <div className="p-3 sm:p-4 md:p-6 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-4 sm:mb-6 md:mb-8">
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-2 sm:mb-3">
          <div className="p-1.5 sm:p-2 md:p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <Calendar className="text-blue-600 dark:text-blue-400" size={20} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">
              Manajemen Tahun Ajaran
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              {config.schoolName} - {config.schoolLevel}
            </p>
          </div>
        </div>
      </div>

      {/* Current Academic Year Card */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 p-4 sm:p-5 md:p-6 rounded-xl mb-6 sm:mb-8 border border-blue-200 dark:border-blue-700 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Calendar
                className="text-blue-600 dark:text-blue-400"
                size={18}
              />
              <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                Tahun Ajaran Aktif
              </h3>
            </div>
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-900 dark:text-blue-200 mb-2">
              {schoolStats.academic_year}
            </p>
            <p className="text-blue-700 dark:text-blue-400 text-sm">
              <span className="font-semibold">
                {schoolStats.total_students}
              </span>{" "}
              siswa aktif dalam{" "}
              <span className="font-semibold">
                {Object.keys(studentsByClass).length}
              </span>{" "}
              kelas
            </p>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 sm:p-5 border border-blue-200 dark:border-blue-600 w-full sm:w-auto">
            <div className="text-center">
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">
                Total Kelas
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
                {Object.keys(studentsByClass).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========== FITUR BARU: SMART SEMESTER SWITCH ========== */}
      {activeSemester && (
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 p-4 sm:p-5 md:p-6 rounded-xl mb-6 sm:mb-8 border-2 border-blue-200 dark:border-blue-700 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                <RefreshCw
                  className="text-blue-600 dark:text-blue-400"
                  size={20}
                />
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">
                  Perpindahan Semester
                </h3>
                <div
                  className="cursor-help"
                  title="Fitur ini akan otomatis membuat semester baru, copy assignments, dan mengaktifkannya. Proses ini aman dan tidak mengubah data semester lama.">
                  <Info className="text-blue-500" size={16} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Current Semester */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border-2 border-blue-300 dark:border-blue-600">
                  <div className="flex items-center gap-3 mb-3">
                    <PlayCircle
                      className="text-blue-600 dark:text-blue-400"
                      size={20}
                    />
                    <div>
                      <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                        Semester Aktif
                      </p>
                      <p className="text-lg font-bold text-blue-900 dark:text-blue-200">
                        {activeSemester.semester === 1
                          ? "Ganjil (1)"
                          : "Genap (2)"}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {activeSemester.year}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {new Date(activeSemester.start_date).toLocaleDateString(
                      "id-ID",
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }
                    )}{" "}
                    s/d{" "}
                    {new Date(activeSemester.end_date).toLocaleDateString(
                      "id-ID",
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }
                    )}
                  </p>
                </div>

                {/* Target Semester */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border-2 border-green-300 dark:border-green-600">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle
                      className="text-green-600 dark:text-green-500"
                      size={20}
                    />
                    <div>
                      <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                        Semester Tujuan
                      </p>
                      <p className="text-lg font-bold text-green-900 dark:text-green-200">
                        {activeSemester.semester === 1
                          ? "Genap (2)"
                          : "Ganjil (1)"}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {activeSemester.year}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Tanggal akan dihitung otomatis
                  </p>
                </div>
              </div>

              {/* Process Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
                  💡 Proses Otomatis:
                </p>
                <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-500" />
                    <span>Check & create semester jika belum ada</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-500" />
                    <span>Copy semua teacher assignments</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-500" />
                    <span>Aktifkan semester baru</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-500" />
                    <span>Non-aktifkan semester lama</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="lg:w-1/3 flex items-center">
              <button
                onClick={executeSmartSemesterSwitch}
                disabled={loading || isSwitching}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-700 dark:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white rounded-lg disabled:opacity-50 font-bold text-lg transition-all duration-300 transform hover:scale-[1.02] min-h-[60px] flex items-center justify-center gap-3">
                {isSwitching ? (
                  <>
                    <RefreshCw className="animate-spin" size={20} />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={20} />
                    <span>
                      🚀 Pindah ke Semester{" "}
                      {activeSemester.semester === 1 ? "Genap" : "Ganjil"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panduan Penggunaan (Collapsible) */}
      <details className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
        <summary className="cursor-pointer font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-2">
          <span>💡 Panduan Penggunaan Manajemen Semester</span>
        </summary>

        <div className="mt-4 space-y-4 text-sm text-blue-700 dark:text-blue-400">
          <div>
            <h4 className="font-semibold mb-2">
              🔄 Perpindahan Semester (Rekomendasi)
            </h4>
            <p>
              Gunakan fitur "Pindah ke Semester X" untuk perpindahan semester
              dalam tahun ajaran yang sama. Fitur ini otomatis dan aman.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">📋 Copy Assignments (Manual)</h4>
            <p>
              Gunakan jika ingin copy assignments antar tahun ajaran atau dalam
              kondisi khusus. Pilih source dan target dengan hati-hati.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">📅 Transisi Tahun Ajaran</h4>
            <p>
              Gunakan di akhir tahun ajaran untuk naik kelas otomatis. Pastikan
              data siswa baru sudah di-input di SPMB.
            </p>
          </div>
        </div>
      </details>

      {/* Semester Management */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-5 md:p-6 mb-6 sm:mb-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="text-blue-600 dark:text-blue-400" size={18} />
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">
                Manajemen Semester
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Kelola semester dalam tahun ajaran aktif
            </p>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            {/* Tombol Copy Assignments - BARU */}
            <button
              onClick={handleOpenCopyModal}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white rounded-lg transition duration-200 w-full sm:w-auto min-h-[44px] font-medium">
              <Copy size={16} />
              <span>Copy Assignments</span>
            </button>

            {/* Tombol Tambah Semester - EXISTING */}
            <button
              onClick={() => setShowAddSemester(!showAddSemester)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg transition duration-200 w-full sm:w-auto min-h-[44px] font-medium">
              <Plus size={16} />
              <span>Tambah Semester</span>
            </button>
          </div>
        </div>

        {/* Active Semester Highlight */}
        {activeSemester && (
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg mb-5 border border-blue-200 dark:border-blue-600">
            <div className="flex items-center gap-3">
              <PlayCircle
                className="text-blue-600 dark:text-blue-400"
                size={20}
              />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                  Semester Aktif Sekarang
                </p>
                <p className="text-lg font-bold text-blue-900 dark:text-blue-200">
                  {activeSemester.year} - Semester{" "}
                  {activeSemester.semester === 1 ? "Ganjil" : "Genap"} (
                  {activeSemester.semester})
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {new Date(activeSemester.start_date).toLocaleDateString(
                    "id-ID",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }
                  )}{" "}
                  s/d{" "}
                  {new Date(activeSemester.end_date).toLocaleDateString(
                    "id-ID",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Add Semester Form */}
        {showAddSemester && (
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg mb-5 border border-gray-200 dark:border-gray-600">
            <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">
              Tambah Semester Baru
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tahun Ajaran
                </label>
                <input
                  type="text"
                  placeholder="2025/2026"
                  value={newSemester.year}
                  onChange={(e) =>
                    setNewSemester({ ...newSemester, year: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Semester
                </label>
                <select
                  value={newSemester.semester}
                  onChange={(e) =>
                    setNewSemester({
                      ...newSemester,
                      semester: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                  <option value={1}>Semester 1 (Ganjil)</option>
                  <option value={2}>Semester 2 (Genap)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tanggal Mulai
                </label>
                <input
                  type="date"
                  value={newSemester.start_date}
                  onChange={(e) =>
                    setNewSemester({
                      ...newSemester,
                      start_date: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tanggal Selesai
                </label>
                <input
                  type="date"
                  value={newSemester.end_date}
                  onChange={(e) =>
                    setNewSemester({ ...newSemester, end_date: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleAddSemester}
                disabled={loading}
                className="px-5 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 font-medium transition min-h-[44px]">
                Simpan Semester
              </button>
              <button
                onClick={() => {
                  setShowAddSemester(false);
                  setNewSemester({
                    year: "",
                    semester: 1,
                    start_date: "",
                    end_date: "",
                  });
                }}
                className="px-5 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition min-h-[44px]">
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Semester List */}
        <div className="space-y-3">
          {semesters.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Calendar size={64} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Belum Ada Semester
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Untuk memulai, tambahkan semester pertama dengan klik tombol
                "Tambah Semester" di atas.
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg max-w-md mx-auto">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  💡 <strong>Tip:</strong> Biasanya semester 1 (Ganjil) dimulai
                  Juli-Desember, semester 2 (Genap) Januari-Juni.
                </p>
              </div>
            </div>
          ) : (
            semesters.map((semester) => (
              <div
                key={semester.id}
                className={`p-4 rounded-lg border-2 transition ${
                  semester.is_active
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                }`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    {semester.is_active ? (
                      <PlayCircle
                        className="text-blue-600 dark:text-blue-400"
                        size={20}
                      />
                    ) : (
                      <PauseCircle
                        className="text-gray-400 dark:text-gray-500"
                        size={20}
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="font-semibold text-gray-800 dark:text-gray-100">
                          {semester.year} - Semester{" "}
                          {semester.semester === 1 ? "Ganjil" : "Genap"} (
                          {semester.semester})
                        </span>
                        {semester.is_active && (
                          <span className="px-3 py-1 bg-blue-600 dark:bg-blue-700 text-white text-xs rounded-full font-medium">
                            AKTIF
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {new Date(semester.start_date).toLocaleDateString(
                          "id-ID",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }
                        )}{" "}
                        -{" "}
                        {new Date(semester.end_date).toLocaleDateString(
                          "id-ID",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto">
                    {!semester.is_active && (
                      <button
                        onClick={() => handleActivateSemester(semester.id)}
                        disabled={loading}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white text-sm rounded-lg disabled:opacity-50 transition min-h-[44px] font-medium flex-1 sm:flex-none">
                        Aktifkan
                      </button>
                    )}
                    {!semester.is_active && (
                      <button
                        onClick={() =>
                          handleDeleteSemester(semester.id, semester.is_active)
                        }
                        disabled={loading}
                        className="px-4 py-2.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-800/40 text-red-600 dark:text-red-400 text-sm rounded-lg disabled:opacity-50 transition min-h-[44px] font-medium flex-1 sm:flex-none">
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Students by Grade */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {["7", "8", "9"].map((grade) => {
          const totalStudents = studentsByGrade[grade] || 0;

          return (
            <div
              key={grade}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-gray-800 dark:text-gray-100">
                  Kelas {grade}
                </h4>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {totalStudents}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {totalStudents === 0
                  ? "Belum ada siswa"
                  : `${totalStudents} siswa aktif`}
              </p>
            </div>
          );
        })}
      </div>

      {/* Year Transition */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-5 md:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">
                Transisi Tahun Ajaran
              </h3>
              <div
                className="cursor-help"
                title="Proses ini akan membuat tahun ajaran baru, menaikkan semua siswa ke kelas berikutnya, meluluskan siswa kelas 9, dan memasukkan siswa baru dari SPMB.">
                <Info className="text-orange-500" size={16} />
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Kelola Perpindahan Ke Tahun Ajaran Berikutnya (Termasuk Siswa Baru
              Dari SPMB)
            </p>
          </div>

          {!yearTransition.preview && (
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={generateYearTransitionPreview}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 transition w-full sm:w-auto min-h-[44px] font-medium">
                <Eye size={16} />
                <span>Preview Naik Kelas</span>
              </button>
            </div>
          )}
        </div>

        {/* Preview Section */}
        {yearTransition.preview && (
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 sm:p-5 md:p-6 rounded-xl border border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle
                className="text-green-600 dark:text-green-500"
                size={24}
              />
              <div>
                <h4 className="font-bold text-gray-800 dark:text-gray-100">
                  Preview Transisi Tahun Ajaran
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {yearTransition.preview.currentYear} →{" "}
                  {yearTransition.preview.newYear}
                </p>
              </div>
            </div>

            {/* NIS Conflict Warning */}
            {yearTransition.preview.conflictedNIS?.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className="text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5"
                    size={18}
                  />
                  <div className="flex-1">
                    <p className="text-red-800 dark:text-red-300 font-bold mb-2">
                      ⚠️ Konflik NIS Terdeteksi!
                    </p>
                    <p className="text-red-700 dark:text-red-400 text-sm mb-3">
                      {yearTransition.preview.conflictedNIS.length} siswa baru
                      memiliki NIS yang sudah terdaftar:
                    </p>
                    <ul className="text-red-700 dark:text-red-400 text-sm space-y-1 list-disc list-inside max-h-32 overflow-y-auto">
                      {yearTransition.preview.conflictedNIS.map((item, idx) => (
                        <li key={idx}>
                          {item.nama} (NIS: {item.nisn})
                        </li>
                      ))}
                    </ul>
                    <p className="text-red-600 dark:text-red-500 text-xs mt-3 font-medium">
                      Siswa ini TIDAK akan dimasukkan ke sistem. Perbaiki NIS di
                      SPMB terlebih dahulu!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Simulator Preview */}
            <Simulator
              mode="preview"
              preview={yearTransition.preview}
              schoolStats={schoolStats}
              config={config}
              loading={loading}
              onSimulate={() => {}}
            />

            {/* Execute Warning */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-xl p-4 sm:p-5 mt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className="text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5"
                  size={20}
                />
                <div className="flex-1">
                  <p className="text-yellow-900 dark:text-yellow-300 font-bold mb-3">
                    ⚠️ Peringatan: Tindakan Permanen
                  </p>
                  <ul className="text-yellow-800 dark:text-yellow-400 text-sm space-y-2 mb-4 list-disc list-inside">
                    <li>18 kelas baru akan dibuat (7A-7F, 8A-8F, 9A-9F)</li>
                    <li>Semua siswa akan naik kelas (7→8, 8→9)</li>
                    <li>
                      {yearTransition.preview.newStudents?.length || 0} siswa
                      baru masuk kelas 7 (sesuai pembagian di SPMB)
                    </li>
                    <li>Siswa kelas {graduatingGrade} akan diluluskan</li>
                    <li>Assignment guru akan direset</li>
                    <li>
                      Tahun ajaran berubah ke {yearTransition.preview.newYear}
                    </li>
                  </ul>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={executeYearTransition}
                      disabled={loading || yearTransition.inProgress}
                      className="flex items-center justify-center gap-2 px-6 py-3.5 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white rounded-lg disabled:opacity-50 font-bold transition min-h-[44px]">
                      {yearTransition.inProgress ? (
                        <>
                          <RefreshCw className="animate-spin" size={16} />
                          <span>Memproses...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle size={16} />
                          <span>Mulai Tahun Ajaran Baru</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setYearTransition({
                          preview: null,
                          newYear: "",
                          inProgress: false,
                        });
                      }}
                      disabled={yearTransition.inProgress}
                      className="px-5 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg disabled:opacity-50 font-medium transition min-h-[44px]">
                      Batal
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL COPY ASSIGNMENTS - TAMBAHKAN DI AKHIR */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Copy
                  className="text-green-600 dark:text-green-400"
                  size={24}
                />
                <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                    Copy Teacher Assignments
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Salin data assignment dari satu semester ke semester lain
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Source Section */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3">
                  📚 Source (Dari)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tahun Ajaran
                    </label>
                    <select
                      value={copyConfig.sourceYear}
                      onChange={(e) =>
                        setCopyConfig({
                          ...copyConfig,
                          sourceYear: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                      <option value="">Pilih Tahun</option>
                      {[...new Set(semesters.map((s) => s.year))]
                        .sort()
                        .map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Semester
                    </label>
                    <select
                      value={copyConfig.sourceSemester}
                      onChange={(e) =>
                        setCopyConfig({
                          ...copyConfig,
                          sourceSemester: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                      <option value={1}>Semester 1 (Ganjil)</option>
                      <option value={2}>Semester 2 (Genap)</option>
                    </select>
                  </div>
                </div>

                {/* Preview Count */}
                {assignmentPreview && (
                  <div className="mt-3 p-2 bg-white dark:bg-gray-800 rounded border border-blue-100 dark:border-blue-800">
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      📊 Preview:{" "}
                      <span className="font-bold">
                        {assignmentPreview.count}
                      </span>{" "}
                      assignments akan di-copy
                    </p>
                  </div>
                )}
              </div>

              {/* Arrow */}
              <div className="text-center">
                <div className="inline-block px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <span className="text-2xl">⬇️</span>
                </div>
              </div>

              {/* Target Section */}
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
                <p className="text-sm font-semibold text-green-800 dark:text-green-300 mb-3">
                  📝 Target (Ke)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tahun Ajaran
                    </label>
                    <select
                      value={copyConfig.targetYear}
                      onChange={(e) =>
                        setCopyConfig({
                          ...copyConfig,
                          targetYear: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                      <option value="">Pilih Tahun</option>
                      {[...new Set(semesters.map((s) => s.year))]
                        .sort()
                        .map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Semester
                    </label>
                    <select
                      value={copyConfig.targetSemester}
                      onChange={(e) =>
                        setCopyConfig({
                          ...copyConfig,
                          targetSemester: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                      <option value={1}>Semester 1 (Ganjil)</option>
                      <option value={2}>Semester 2 (Genap)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Validation Errors */}
              {(() => {
                const errors = validateCopyConfig();
                if (errors.length > 0) {
                  return (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
                      {errors.map((error, idx) => (
                        <p
                          key={idx}
                          className="text-xs text-red-600 dark:text-red-400 mb-1 last:mb-0">
                          {error}
                        </p>
                      ))}
                    </div>
                  );
                }
                return null;
              })()}

              {/* Warning */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
                <p className="text-xs text-yellow-800 dark:text-yellow-300 flex items-start gap-2">
                  <span className="text-base">⚠️</span>
                  <span>
                    Data assignment yang sudah ada di target akan{" "}
                    <strong>DITIMPA</strong> dan tidak dapat dikembalikan!
                  </span>
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                onClick={() => setShowCopyModal(false)}
                className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition min-h-[44px]">
                Batal
              </button>
              <button
                onClick={handleCopyAssignments}
                disabled={loading || validateCopyConfig().length > 0}
                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white rounded-lg font-medium disabled:opacity-50 transition min-h-[44px]">
                {loading ? "Menyalin..." : "Copy Sekarang"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicYearTab;
