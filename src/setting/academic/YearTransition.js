// src/components/settings/academic/YearTransition.js
import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Eye, CheckCircle, AlertTriangle, RefreshCw, Info } from "lucide-react";
import Simulator from "./Simulator";

// Import academic year service
import {
  getActiveAcademicInfo,
  getActiveYearString,
} from "../../services/academicYearService";

const YearTransition = ({
  schoolStats,
  schoolConfig,
  studentsByClass,
  loading,
  setLoading,
  showToast,
  user,
  onTransitionComplete,
  academicInfo, // ← Diterima dari parent component
}) => {
  // State untuk year transition
  const [yearTransition, setYearTransition] = useState({
    preview: null,
    newYear: "",
    inProgress: false,
  });
  const [localAcademicInfo, setLocalAcademicInfo] = useState(academicInfo);

  // Config dari schoolConfig
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

  // Load academic info jika tidak ada dari parent
  useEffect(() => {
    const loadAcademicInfo = async () => {
      if (academicInfo) {
        setLocalAcademicInfo(academicInfo);
      } else {
        try {
          const info = await getActiveAcademicInfo();
          setLocalAcademicInfo(info);
        } catch (error) {
          console.error("Error loading academic info:", error);
          showToast(
            "Gagal memuat informasi tahun ajaran: " + error.message,
            "error"
          );
        }
      }
    };

    loadAcademicInfo();
  }, [academicInfo]);

  // Fungsi untuk generate preview transisi
  const generateYearTransitionPreview = async () => {
    try {
      setLoading(true);

      if (!localAcademicInfo) {
        showToast("Informasi tahun ajaran belum dimuat", "error");
        return;
      }

      const currentYear = localAcademicInfo.year || schoolStats.academic_year;

      // Generate new year berdasarkan tahun aktif dinamis
      const [startYear] = currentYear.split("/");
      const newYear = `${parseInt(startYear) + 1}/${parseInt(startYear) + 2}`;

      const promotionPlan = {};
      const graduatingStudents = [];

      // Analisis data siswa saat ini
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

      // Ambil target tahun ajaran dari SPMB settings
      const { data: spmb_settings } = await supabase
        .from("spmb_settings")
        .select("target_academic_year")
        .eq("is_active", true)
        .single();

      const targetYear = spmb_settings?.target_academic_year || newYear;

      console.log("🔍 Looking for siswa baru with academic_year:", targetYear);

      // Ambil data siswa baru dari SPMB
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

      // Ambil NIS siswa yang sudah aktif dengan filter tahun ajaran
      const { data: existingStudents } = await supabase
        .from("students")
        .select("nis")
        .eq("is_active", true)
        .eq("academic_year", currentYear);

      const existingNIS = new Set(existingStudents?.map((s) => s.nis) || []);

      // Filter siswa baru yang NIS-nya belum terdaftar
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

      // Distribusi siswa baru ke kelas
      const newStudentDistribution = {};
      const firstGrade = config.grades[0];
      const classLetters = config.classesPerGrade;

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

      // Set preview state
      setYearTransition({
        preview: {
          currentYear,
          newYear,
          currentSemester: localAcademicInfo.semester,
          promotions: promotionPlan,
          graduating: graduatingStudents,
          newStudents: validNewStudents,
          newStudentDistribution: newStudentDistribution,
          conflictedNIS: conflictedNIS,
        },
        newYear,
        inProgress: false,
      });

      // Tampilkan warning jika ada NIS konflik
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

  // Fungsi untuk membuat kelas baru
  const createNewClasses = async (newYear) => {
    const classesToCreate = [];
    const classLetters = config.classesPerGrade;

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

  // Fungsi utama untuk execute year transition
  const executeYearTransition = async () => {
    const { preview } = yearTransition;

    if (!preview) {
      showToast("Preview tidak tersedia", "error");
      return;
    }

    // Enhanced triple confirmation
    const confirm1 = window.confirm(
      `⚠️ PERINGATAN: TRANSISI TAHUN AJARAN\n\n` +
        `Anda akan melakukan transisi tahun ajaran dari:\n` +
        `${preview.currentYear} (Semester ${
          preview.currentSemester || localAcademicInfo?.semester || "?"
        }) → ${preview.newYear} (Semester 1)\n\n` +
        `Proses yang akan dilakukan:\n` +
        `• Membuat 18 kelas baru\n` +
        `• Menaikkan ${
          Object.values(preview.promotions).flat().length
        } siswa\n` +
        `• Memasukkan ${preview.newStudents.length} siswa baru\n` +
        `• Meluluskan ${preview.graduating.length} siswa\n` +
        `• Mereset assignment guru\n` +
        `• Membuat semester 1 untuk tahun ajaran baru\n\n` +
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

      // STEP 1: Buat kelas baru
      showToast("Membuat 18 kelas baru...", "info");
      const newClasses = await createNewClasses(yearTransition.newYear);

      // STEP 2: Handle academic year semester - buat semester 1 untuk tahun baru
      showToast("📅 Membuat semester 1 untuk tahun ajaran baru...", "info");
      let targetAcademicYearId;

      // Deactivate semua semester yang aktif
      const { error: deactivateAllError } = await supabase
        .from("academic_years")
        .update({ is_active: false });

      if (deactivateAllError) {
        console.warn("Warning deactivating all semesters:", deactivateAllError);
      }

      // Cek apakah semester 1 untuk tahun baru sudah ada
      const { data: existingAcademicYear } = await supabase
        .from("academic_years")
        .select("id")
        .eq("year", yearTransition.newYear)
        .eq("semester", 1)
        .single();

      if (existingAcademicYear) {
        // Semester sudah ada, aktifkan saja
        targetAcademicYearId = existingAcademicYear.id;

        const { error: activateError } = await supabase
          .from("academic_years")
          .update({ is_active: true })
          .eq("id", targetAcademicYearId);

        if (activateError) throw activateError;

        showToast("✅ Semester 1 sudah ada, mengaktifkan...", "info");
      } else {
        // Buat semester 1 baru untuk tahun ajaran baru
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

      // STEP 3: Luluskan siswa kelas 9
      if (preview.graduating.length > 0) {
        showToast(`Meluluskan ${preview.graduating.length} siswa...`, "info");
        const graduatingIds = preview.graduating.map((s) => s.id);

        const { error: graduateError } = await supabase
          .from("students")
          .update({ is_active: false })
          .in("id", graduatingIds);

        if (graduateError) throw graduateError;
      }

      // STEP 4: Naikkan siswa (7→8, 8→9) dengan academic_year_id yang benar
      for (const [newClassId, students] of Object.entries(preview.promotions)) {
        if (students.length === 0) continue;

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
            academic_year_id: targetAcademicYearId, // ← Gunakan ID semester baru
          })
          .in("id", studentIds);

        if (promoteError) throw promoteError;
      }

      // STEP 5: Masukkan siswa baru dari SPMB
      if (preview.newStudents.length > 0) {
        // Ambil data terbaru dari SPMB untuk memastikan data fresh
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

          // Group siswa baru berdasarkan kelas
          const distributionByClass = {};
          latestSiswaBaruData.forEach((siswa) => {
            const kelas = siswa.kelas;
            if (!distributionByClass[kelas]) {
              distributionByClass[kelas] = [];
            }
            distributionByClass[kelas].push(siswa);
          });

          // Insert siswa baru ke database dengan academic_year_id yang benar
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
              academic_year_id: targetAcademicYearId, // ← Gunakan ID semester baru
              is_active: true,
            }));

            const { error: insertError } = await supabase
              .from("students")
              .insert(newStudentsData);

            if (insertError) throw insertError;
          }

          // Update status siswa baru di SPMB
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

      // STEP 6: Reset teacher assignments untuk tahun ajaran lama
      showToast("Mereset assignment guru untuk tahun ajaran lama...", "info");
      const { error: teacherResetError } = await supabase
        .from("teacher_assignments")
        .delete()
        .eq("academic_year", preview.currentYear);

      if (teacherResetError) throw teacherResetError;

      // STEP 7: Update academic year setting
      showToast("Memperbarui pengaturan tahun ajaran...", "info");
      const { error: settingError } = await supabase
        .from("school_settings")
        .update({ setting_value: yearTransition.newYear })
        .eq("setting_key", "academic_year");

      if (settingError) throw settingError;

      // Success message
      showToast(
        `✅ Tahun ajaran ${yearTransition.newYear} berhasil dimulai!\n\n` +
          `📅 Tahun Ajaran Baru: ${yearTransition.newYear} - Semester 1\n` +
          `📊 ${preview.newStudents.length} siswa baru masuk grade 7\n` +
          `⬆️ ${
            Object.values(preview.promotions).flat().length
          } siswa naik kelas\n` +
          `🎓 ${preview.graduating.length} siswa lulus\n` +
          `👨‍🏫 Silakan assign guru ke kelas baru`,
        "success"
      );

      // Reset state dan notify parent
      setYearTransition({
        preview: null,
        newYear: "",
        inProgress: false,
      });

      // Reload academic info
      try {
        const newAcademicInfo = await getActiveAcademicInfo();
        setLocalAcademicInfo(newAcademicInfo);
      } catch (error) {
        console.error("Error reloading academic info:", error);
      }

      if (onTransitionComplete) {
        onTransitionComplete();
      }
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

  return (
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
          {localAcademicInfo && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Tahun Ajaran Aktif: {localAcademicInfo.year} - Semester{" "}
              {localAcademicInfo.semester}
            </p>
          )}
        </div>

        {!yearTransition.preview && (
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={generateYearTransitionPreview}
              disabled={loading || !localAcademicInfo}
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
                {yearTransition.preview.currentYear} (Semester{" "}
                {yearTransition.preview.currentSemester ||
                  localAcademicInfo?.semester ||
                  "?"}
                ) → {yearTransition.preview.newYear} (Semester 1)
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
            academicInfo={localAcademicInfo} // ← Pass academic info ke Simulator
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
                    {yearTransition.preview.newStudents?.length || 0} siswa baru
                    masuk kelas 7 (sesuai pembagian di SPMB)
                  </li>
                  <li>Siswa kelas {graduatingGrade} akan diluluskan</li>
                  <li>Assignment guru akan direset</li>
                  <li>
                    Tahun ajaran berubah ke {yearTransition.preview.newYear} -
                    Semester 1
                  </li>
                  <li>
                    Semester yang aktif akan diubah ke Semester 1 Tahun{" "}
                    {yearTransition.preview.newYear}
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
  );
};

export default YearTransition;
