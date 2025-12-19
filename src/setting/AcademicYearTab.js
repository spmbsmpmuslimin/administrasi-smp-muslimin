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
  }, []);

  const loadSemesters = async () => {
    try {
      const { data, error } = await supabase
        .from("academic_years")
        .select("*")
        .order("year", { ascending: false })
        .order("semester", { ascending: false });

      if (error) throw error;
      setSemesters(data || []);
    } catch (error) {
      console.error("Error loading semesters:", error);
      showToast("Gagal memuat data semester: " + error.message, "error");
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

    const confirmed = window.confirm(
      "Hapus semester ini?\n\nTindakan ini tidak dapat dibatalkan."
    );

    if (!confirmed) return;

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
      showToast("Gagal menghapus semester: " + error.message, "error");
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

      const { data: existingStudents } = await supabase
        .from("students")
        .select("nis");

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

    const { data: latestSiswaBaruData } = await supabase
      .from("siswa_baru")
      .select("id", { count: "exact" })
      .eq("is_transferred", false)
      .eq("academic_year", yearTransition.newYear)
      .not("kelas", "is", null);

    const latestSiswaBaruCount = latestSiswaBaruData?.length || 0;
    const previewSiswaBaruCount = preview.newStudents.length;

    const totalPromotions = Object.values(preview.promotions).flat().length;

    let warningMessage = "";
    if (latestSiswaBaruCount !== previewSiswaBaruCount) {
      warningMessage = `\n⚠️ PERHATIAN: Data siswa baru berubah!\n   Preview: ${previewSiswaBaruCount} siswa → Sekarang: ${latestSiswaBaruCount} siswa\n`;
    }

    const confirmed = window.confirm(
      `PERINGATAN: Tindakan ini akan:\n\n` +
        `1. Membuat 18 kelas baru untuk tahun ajaran ${yearTransition.newYear}\n` +
        `2. Menaikkan ${totalPromotions} siswa ke kelas berikutnya\n` +
        `3. Memasukkan ${latestSiswaBaruCount} siswa baru ke grade 7\n` +
        `4. Meluluskan ${preview.graduating.length} siswa grade ${graduatingGrade}\n` +
        `5. Mereset assignment guru\n` +
        `6. Mengubah tahun ajaran menjadi ${yearTransition.newYear}\n` +
        warningMessage +
        `\nTindakan ini TIDAK DAPAT DIBATALKAN. Apakah Anda yakin?`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      setYearTransition((prev) => ({ ...prev, inProgress: true }));

      showToast("Membuat 18 kelas baru...", "info");
      const newClasses = await createNewClasses(yearTransition.newYear);

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

        const { error: promoteError } = await supabase
          .from("students")
          .update({
            class_id: newClassId,
            academic_year: yearTransition.newYear,
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

            const newStudentsData = siswaList.map((siswa) => ({
              nis: siswa.nisn || null,
              full_name: siswa.nama_lengkap,
              gender: siswa.jenis_kelamin,
              class_id: classId,
              academic_year: yearTransition.newYear,
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
          `⬆️ ${totalPromotions} siswa naik kelas\n` +
          `🎓 ${preview.graduating.length} siswa lulus\n` +
          `👨‍🏫 Silakan assign guru ke kelas baru`,
        "success"
      );

      await loadSchoolData();
      setYearTransition({ preview: null, newYear: "", inProgress: false });
    } catch (error) {
      console.error("Error executing year transition:", error);
      showToast("Error memulai tahun ajaran baru: " + error.message, "error");
    } finally {
      setLoading(false);
      setYearTransition((prev) => ({ ...prev, inProgress: false }));
    }
  };

  const studentsByGrade = getStudentsByGrade();
  const activeSemester = semesters.find((s) => s.is_active);

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

          <button
            onClick={() => setShowAddSemester(!showAddSemester)}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg transition duration-200 w-full sm:w-auto min-h-[44px] font-medium">
            <Plus size={16} />
            <span>Tambah Semester</span>
          </button>
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
                  {activeSemester.year} - Semester {activeSemester.semester}
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
                  <option value={1}>Semester 1</option>
                  <option value={2}>Semester 2</option>
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
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Clock size={40} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">Belum ada data semester</p>
              <p className="text-xs mt-1">
                Klik "Tambah Semester" untuk memulai
              </p>
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
                          {semester.year} - Semester {semester.semester}
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
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">
              Transisi Tahun Ajaran
            </h3>
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
    </div>
  );
};

export default AcademicYearTab;
