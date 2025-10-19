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
} from "lucide-react";

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

  // Default config jika schoolConfig belum loaded
  const config = {
    schoolName: schoolConfig?.schoolName || "SMP Muslimin Cililin",
    schoolLevel: schoolConfig?.schoolLevel || "SMP",
    grades: ["7", "8", "9"], // ✅ FIXED: Paksa pake angka biasa (bukan romawi)
    classesPerGrade: schoolConfig?.classesPerGrade || ["A", "B", "C", "D", "E", "F"],
  };

  const graduatingGrade = config.grades[config.grades.length - 1];

  useEffect(() => {
    loadSchoolData();
  }, []);

  const loadSchoolData = async () => {
    try {
      setLoading(true);

      // Load school settings
      const { data: settingsData, error: settingsError } = await supabase
        .from("school_settings")
        .select("setting_key, setting_value")
        .eq("setting_key", "academic_year");

      if (settingsError) throw settingsError;

      const academicYear = settingsData?.[0]?.setting_value || "2025/2026";

      // Load students dengan filter academic_year yang aktif
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
        classes (
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

      // Group students by class_id
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

  // Helper untuk group students by grade
  const getStudentsByGrade = () => {
    const byGrade = { "7": 0, "8": 0, "9": 0 };

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

      // Process existing students by class_id
      Object.entries(studentsByClass).forEach(([classId, classData]) => {
        const { grade, students } = classData;

        if (grade == graduatingGrade) {
          // Grade 9 → Lulus
          graduatingStudents.push(...students);
        } else {
          // Grade 7 → 8, Grade 8 → 9
          const currentIndex = config.grades.indexOf(grade.toString());
          if (currentIndex < config.grades.length - 1) {
            const nextGrade = config.grades[currentIndex + 1];

            // Extract huruf dari class_id (misal: "7A" → "A")
            const classLetter = classId.replace(/[0-9]/g, "");
            const newClassId = `${nextGrade}${classLetter}`; // "7A" → "8A"

            if (!promotionPlan[newClassId]) {
              promotionPlan[newClassId] = [];
            }
            promotionPlan[newClassId].push(...students);
          }
        }
      });

      // ✅ FIXED: LOAD SISWA BARU DARI SPMB (yang udah dibagi kelas)
      const { data: siswaBaruData, error: siswaBaruError } = await supabase
        .from("siswa_baru")
        .select("*")
        .eq("is_transferred", false)
        .eq("academic_year", newYear)
        .not("kelas", "is", null); // ✅ Hanya yang udah dibagi kelas

      if (siswaBaruError) {
        console.warn("Error loading siswa baru:", siswaBaruError);
      }

      // CHECK NISN CONFLICTS
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

      // ✅ FIXED: GUNAKAN KELAS YANG UDAH DI-ASSIGN DI ClassDivision
      const newStudentDistribution = {};
      const firstGrade = config.grades[0]; // "7"
      const classLetters = config.classesPerGrade || [
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
      ];

      // Inisialisasi kelas 7A-7F
      classLetters.forEach((letter) => {
        newStudentDistribution[`${firstGrade}${letter}`] = [];
      });

      // ✅ Pake kelas yang udah di-assign di ClassDivision
      validNewStudents.forEach((siswa) => {
        const kelasAsli = siswa.kelas; // Ambil dari field `kelas`
        if (kelasAsli && kelasAsli.startsWith('7')) {
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

  // Helper function untuk create kelas baru (18 kelas: 7A-7F, 8A-8F, 9A-9F)
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

    const totalPromotions = Object.values(preview.promotions).flat().length;

    const confirmed = window.confirm(
      `PERINGATAN: Tindakan ini akan:\n\n` +
        `1. Membuat 18 kelas baru untuk tahun ajaran ${yearTransition.newYear}\n` +
        `2. Menaikkan ${totalPromotions} siswa ke kelas berikutnya\n` +
        `3. Memasukkan ${preview.newStudents.length} siswa baru ke grade 7\n` +
        `4. Meluluskan ${preview.graduating.length} siswa grade ${graduatingGrade}\n` +
        `5. Mereset assignment guru\n` +
        `6. Mengubah tahun ajaran menjadi ${yearTransition.newYear}\n\n` +
        `Tindakan ini TIDAK DAPAT DIBATALKAN. Apakah Anda yakin?`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      setYearTransition((prev) => ({ ...prev, inProgress: true }));

      // STEP 1: Create new classes untuk tahun ajaran baru (18 kelas)
      showToast("Membuat 18 kelas baru...", "info");
      const newClasses = await createNewClasses(yearTransition.newYear);

      // STEP 2: Handle graduating students (Grade 9)
      if (preview.graduating.length > 0) {
        showToast(`Meluluskan ${preview.graduating.length} siswa...`, "info");
        const graduatingIds = preview.graduating.map((s) => s.id);

        const { error: graduateError } = await supabase
          .from("students")
          .update({ is_active: false })
          .in("id", graduatingIds);

        if (graduateError) throw graduateError;
      }

      // STEP 3: Handle promotions - update class_id ke kelas baru (7A→8A, dst)
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

      // ✅ FIXED: STEP 4 - TRANSFER SISWA BARU DENGAN KELAS YANG UDAH DI-ASSIGN
      if (preview.newStudents.length > 0) {
        showToast(
          `Memasukkan ${preview.newStudents.length} siswa baru...`,
          "info"
        );

        for (const [classId, siswaList] of Object.entries(
          preview.newStudentDistribution
        )) {
          if (siswaList.length === 0) continue;

          const newStudentsData = siswaList.map((siswa) => ({
            nis: siswa.nisn || null,
            full_name: siswa.nama_lengkap,
            gender: siswa.jenis_kelamin, // ✅ FIXED: Langsung pake "L" atau "P"
            class_id: classId, // ✅ Pake kelas dari ClassDivision
            academic_year: yearTransition.newYear,
            is_active: true,
          }));

          const { error: insertError } = await supabase
            .from("students")
            .insert(newStudentsData);

          if (insertError) throw insertError;
        }

        // STEP 5: UPDATE FLAG IS_TRANSFERRED DI SISWA_BARU
        const siswaBaruIds = preview.newStudents.map((s) => s.id);

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

      // STEP 6: Reset teacher assignments
      showToast("Mereset assignment guru...", "info");
      const { error: teacherResetError } = await supabase
        .from("teacher_assignments")
        .delete()
        .eq("academic_year", schoolStats.academic_year);

      if (teacherResetError) throw teacherResetError;

      // STEP 7: Update academic year in settings
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

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Calendar className="text-blue-600" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Manajemen Tahun Ajaran
            </h2>
            <p className="text-gray-600 text-sm">
              {config.schoolName} - {config.schoolLevel}
            </p>
          </div>
        </div>
      </div>

      {/* Current Academic Year */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg mb-8 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="text-blue-600" size={20} />
              <h3 className="text-sm font-medium text-blue-800">
                Tahun Ajaran Aktif
              </h3>
            </div>
            <p className="text-3xl font-bold text-blue-900 mb-1">
              {schoolStats.academic_year}
            </p>
            <p className="text-blue-700 text-sm">
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
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <div className="text-center">
              <p className="text-xs text-gray-600 mb-1">Total Kelas</p>
              <p className="text-2xl font-bold text-blue-600">
                {Object.keys(studentsByClass).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Students by Grade */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {["7", "8", "9"].map((grade) => {
          const totalStudents = studentsByGrade[grade] || 0;
          
          return (
            <div
              key={grade}
              className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-800">Kelas {grade}</h4>
                <span className="text-2xl font-bold text-blue-600">
                  {totalStudents}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {totalStudents === 0
                  ? "Belum ada siswa"
                  : `${totalStudents} siswa aktif`}
              </p>
            </div>
          );
        })}
      </div>

      {/* Year Transition */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              Transisi Tahun Ajaran
            </h3>
            <p className="text-gray-600 text-sm">
              Kelola perpindahan ke tahun ajaran berikutnya (termasuk siswa baru
              dari SPMB)
            </p>
          </div>

          {!yearTransition.preview && (
            <button
              onClick={generateYearTransitionPreview}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
              <Eye size={16} />
              Preview Naik Kelas
            </button>
          )}
        </div>

        {/* Transition Preview */}
        {yearTransition.preview && (
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle className="text-green-600" size={24} />
              <div>
                <h4 className="font-semibold text-gray-800 text-lg">
                  Preview Transisi Tahun Ajaran
                </h4>
                <p className="text-sm text-gray-600">
                  {yearTransition.preview.currentYear} →{" "}
                  {yearTransition.preview.newYear}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Promotions */}
              <div>
                <h5 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <Users size={16} className="text-blue-600" />
                  Siswa Naik Kelas
                </h5>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {Object.entries(yearTransition.preview.promotions).map(
                    ([classId, students]) => (
                      <div
                        key={classId}
                        className="bg-white p-3 rounded border border-blue-200">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-blue-600">
                            → {classId}
                          </span>
                          <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {students.length} siswa
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* NEW STUDENTS FROM SPMB */}
              <div>
                <h5 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <UserPlus size={16} className="text-green-600" />
                  Siswa Baru (SPMB)
                </h5>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {Object.entries(
                    yearTransition.preview.newStudentDistribution || {}
                  ).map(
                    ([classId, siswaList]) =>
                      siswaList.length > 0 && (
                        <div
                          key={classId}
                          className="bg-white p-3 rounded border border-green-200">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-green-600">
                              SPMB → {classId}
                            </span>
                            <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                              {siswaList.length} siswa
                            </span>
                          </div>
                        </div>
                      )
                  )}

                  {(!yearTransition.preview.newStudents ||
                    yearTransition.preview.newStudents.length === 0) && (
                    <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                      <p className="text-xs text-yellow-700">
                        ℹ️ Tidak ada siswa baru untuk tahun ajaran{" "}
                        {yearTransition.preview.newYear}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Graduating */}
              <div>
                <h5 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <CheckCircle size={16} className="text-purple-600" />
                  Siswa Lulus
                </h5>
                <div className="bg-white p-3 rounded border border-purple-200">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-purple-600">
                      Kelas {graduatingGrade} → Lulus
                    </span>
                    <span className="text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded">
                      {yearTransition.preview.graduating.length} siswa
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* NIS CONFLICT WARNING */}
            {yearTransition.preview.conflictedNIS?.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className="text-red-600 flex-shrink-0 mt-0.5"
                    size={16}
                  />
                  <div className="flex-1">
                    <p className="text-red-800 font-medium mb-2">
                      ⚠️ Konflik NIS Terdeteksi!
                    </p>
                    <p className="text-red-700 text-sm mb-2">
                      {yearTransition.preview.conflictedNIS.length} siswa baru
                      memiliki NIS yang sudah terdaftar:
                    </p>
                    <ul className="text-red-700 text-sm space-y-1 list-disc list-inside max-h-32 overflow-y-auto">
                      {yearTransition.preview.conflictedNIS.map((item, idx) => (
                        <li key={idx}>
                          {item.nama} (NIS: {item.nisn})
                        </li>
                      ))}
                    </ul>
                    <p className="text-red-600 text-xs mt-2 font-medium">
                      Siswa ini TIDAK akan dimasukkan ke sistem. Perbaiki NIS di
                      SPMB terlebih dahulu!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Summary Statistics */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h5 className="font-medium text-blue-900 mb-3">
                📊 Ringkasan Transisi
              </h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-white p-3 rounded">
                  <p className="text-gray-600">Siswa Naik Kelas</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {
                      Object.values(yearTransition.preview.promotions).flat()
                        .length
                    }
                  </p>
                </div>
                <div className="bg-white p-3 rounded">
                  <p className="text-gray-600">Siswa Baru</p>
                  <p className="text-2xl font-bold text-green-600">
                    {yearTransition.preview.newStudents?.length || 0}
                  </p>
                </div>
                <div className="bg-white p-3 rounded">
                  <p className="text-gray-600">Siswa Lulus</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {yearTransition.preview.graduating.length}
                  </p>
                </div>
                <div className="bg-white p-3 rounded">
                  <p className="text-gray-600">Total Aktif Baru</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {Object.values(yearTransition.preview.promotions).flat()
                      .length +
                      (yearTransition.preview.newStudents?.length || 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Execute Button */}
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className="text-yellow-600 flex-shrink-0 mt-0.5"
                  size={20}
                />
                <div className="flex-1">
                  <p className="text-yellow-900 font-semibold mb-2">
                    ⚠️ Peringatan: Tindakan Permanen
                  </p>
                  <ul className="text-yellow-800 text-sm space-y-1 mb-4 list-disc list-inside">
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

                  <div className="flex gap-3">
                    <button
                      onClick={executeYearTransition}
                      disabled={loading || yearTransition.inProgress}
                      className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-semibold transition">
                      {yearTransition.inProgress ? (
                        <>
                          <RefreshCw className="animate-spin" size={16} />
                          Memproses...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={16} />
                          Mulai Tahun Ajaran Baru
                        </>
                      )}
                    </button>

                    <button
                      onClick={() =>
                        setYearTransition({
                          preview: null,
                          newYear: "",
                          inProgress: false,
                        })
                      }
                      disabled={yearTransition.inProgress}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 font-medium transition">
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