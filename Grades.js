import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  Save,
  Users,
  BookOpen,
  Calculator,
  Eye,
  BarChart3,
  Calendar,
  GraduationCap,
} from "lucide-react";

const Grades = ({ user, onShowToast }) => {
  // States untuk auth dan user
  const [teacherId, setTeacherId] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // States untuk filter - IMPROVED WITH DYNAMIC DATA
  const [academicYears, setAcademicYears] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [semester, setSemester] = useState("1");
  const [academicYear, setAcademicYear] = useState("");

  // States untuk data siswa dan nilai
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Assignment types
  const assignmentTypes = ["NH1", "NH2", "NH3", "UTS", "UAS"];

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (user) {
          const { data: teacherData, error: teacherError } = await supabase
            .from("users")
            .select("teacher_id")
            .eq("username", user.username)
            .single();

          if (teacherError) {
            console.error("Error fetching teacher data:", teacherError);
            setMessage("Error: Data guru tidak ditemukan");
          } else if (teacherData) {
            setTeacherId(teacherData.teacher_id);
          }
        } else {
          setMessage("Silakan login terlebih dahulu");
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setMessage("Error: Terjadi kesalahan sistem");
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, [user]);

  // NEW: Fetch Available Academic Years from Database
  useEffect(() => {
    const fetchAcademicYears = async () => {
      if (!teacherId) return;

      try {
        // Get unique academic years from teacher_assignments
        const { data: assignmentData, error: assignmentError } = await supabase
          .from("teacher_assignments")
          .select("academic_year")
          .eq("teacher_id", teacherId);

        if (assignmentError) {
          console.error("Error fetching academic years:", assignmentError);
          setMessage("Error: Gagal mengambil tahun akademik");
          return;
        }

        if (!assignmentData || assignmentData.length === 0) {
          console.log("No academic years found for teacher");
          setAcademicYears([]);
          setMessage("Tidak ada data tahun akademik untuk guru ini");
          return;
        }

        // Get unique academic years and sort them
        const uniqueYears = [
          ...new Set(assignmentData.map((item) => item.academic_year)),
        ];
        const sortedYears = uniqueYears.sort((a, b) => {
          // Sort by year desc (newest first)
          const yearA = parseInt(a.split("/")[0]);
          const yearB = parseInt(b.split("/")[0]);
          return yearB - yearA;
        });

        setAcademicYears(sortedYears);

        // Auto-select the latest academic year if none selected
        if (!academicYear && sortedYears.length > 0) {
          const latestYear = sortedYears[0];
          setAcademicYear(latestYear);
        }
      } catch (error) {
        console.error("Error in fetchAcademicYears:", error);
        setMessage(
          "Error: Terjadi kesalahan sistem saat mengambil tahun akademik"
        );
      }
    };

    fetchAcademicYears();
  }, [teacherId]);

  // Fetch subjects berdasarkan teacher_assignments - UPDATED
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!teacherId || !academicYear) {
        console.log("Missing teacherId or academicYear for subjects");
        setSubjects([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("teacher_assignments")
          .select("subject")
          .eq("teacher_id", teacherId)
          .eq("academic_year", academicYear)
          .eq("semester", semester);

        if (error) {
          console.error("Error fetching subjects:", error);
          setMessage("Error: Gagal mengambil mata pelajaran");
          return;
        }

        if (!data || data.length === 0) {
          console.log("No subjects found");
          setSubjects([]);
          setMessage(
            `Tidak ada mata pelajaran untuk tahun ${academicYear} semester ${semester}`
          );
          return;
        }

        const uniqueSubjects = [...new Set(data.map((item) => item.subject))];
        setSubjects(uniqueSubjects);

        // Clear message on success
        if (uniqueSubjects.length > 0 && message.includes("mata pelajaran")) {
          setMessage("");
        }
      } catch (error) {
        console.error("Error in fetchSubjects:", error);
        setMessage("Error: Terjadi kesalahan sistem");
      }
    };

    fetchSubjects();
  }, [teacherId, academicYear, semester]);

  // Fetch classes berdasarkan teacher_assignments
  useEffect(() => {
    const fetchClasses = async () => {
      if (!selectedSubject || !teacherId || !academicYear) {
        setClasses([]);
        return;
      }

      try {
        const { data: assignmentData, error: assignmentError } = await supabase
          .from("teacher_assignments")
          .select("class_id")
          .eq("teacher_id", teacherId)
          .eq("subject", selectedSubject)
          .eq("academic_year", academicYear)
          .eq("semester", semester);

        if (assignmentError) throw assignmentError;
        if (!assignmentData?.length) {
          setClasses([]);
          setMessage("Tidak ada kelas untuk mata pelajaran ini");
          return;
        }

        const classIds = assignmentData.map((item) => item.class_id);
        const { data: classData, error: classError } = await supabase
          .from("classes")
          .select("id, grade")
          .in("id", classIds)
          .eq("academic_year", academicYear);

        if (classError) throw classError;

        const formattedClasses = classData.map((cls) => ({
          id: cls.id,
          grade: cls.grade,
          displayName: `Kelas ${cls.id}`,
        }));

        setClasses(formattedClasses);
      } catch (error) {
        console.error("Error fetching classes:", error);
        setMessage("Error: Gagal mengambil data kelas - " + error.message);
      }
    };

    fetchClasses();
  }, [selectedSubject, teacherId, academicYear, semester]);

  // Fetch students dan existing grades
  const fetchStudentsAndGrades = async (classId) => {
    if (!classId) {
      setStudents([]);
      setGrades({});
      return;
    }

    try {
      setLoading(true);

      // Fetch students berdasarkan class_id dan academic_year
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, full_name, nis")
        .eq("class_id", classId)
        .eq("academic_year", academicYear)
        .eq("is_active", true)
        .order("full_name");

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      // Get teacher UUID untuk query grades
      const { data: teacherUser, error: teacherError } = await supabase
        .from("users")
        .select("id")
        .eq("teacher_id", teacherId)
        .single();

      if (teacherError) throw teacherError;

      // Fetch existing grades untuk semua assignment types
      const { data: gradesData, error: gradesError } = await supabase
        .from("grades")
        .select("*")
        .eq("teacher_id", teacherUser.id)
        .eq("subject", selectedSubject)
        .eq("semester", semester)
        .eq("academic_year", academicYear)
        .in(
          "student_id",
          studentsData.map((s) => s.id)
        )
        .in("assignment_type", assignmentTypes);

      if (gradesError && gradesError.code !== "PGRST116") {
        console.error("Error fetching grades:", gradesError);
      }

      // Format grades data
      const formattedGrades = {};
      studentsData.forEach((student) => {
        formattedGrades[student.id] = {
          NH1: { score: "", id: null },
          NH2: { score: "", id: null },
          NH3: { score: "", id: null },
          UTS: { score: "", id: null },
          UAS: { score: "", id: null },
          na: 0,
        };

        // Fill existing grades
        if (gradesData) {
          assignmentTypes.forEach((type) => {
            const existingGrade = gradesData.find(
              (g) => g.student_id === student.id && g.assignment_type === type
            );
            if (existingGrade) {
              formattedGrades[student.id][type] = {
                score: existingGrade.score || "",
                id: existingGrade.id,
              };
            }
          });
        }

        // Calculate NA
        const grades = formattedGrades[student.id];
        const nh1 = parseFloat(grades.NH1.score) || 0;
        const nh2 = parseFloat(grades.NH2.score) || 0;
        const nh3 = parseFloat(grades.NH3.score) || 0;
        const uts = parseFloat(grades.UTS.score) || 0;
        const uas = parseFloat(grades.UAS.score) || 0;

        const nhAvg = (nh1 + nh2 + nh3) / 3;
        const na = nhAvg * 0.4 + uts * 0.3 + uas * 0.3;
        formattedGrades[student.id].na = na.toFixed(2);
      });

      setGrades(formattedGrades);
    } catch (error) {
      console.error("Error fetching students and grades:", error);
      setMessage("Error: Gagal mengambil data - " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClass && selectedSubject) {
      fetchStudentsAndGrades(selectedClass);
    }
  }, [selectedClass, selectedSubject, academicYear, semester]);

  // Calculate NA
  const calculateNA = (nh1, nh2, nh3, uts, uas) => {
    const nhAvg =
      (parseFloat(nh1 || 0) + parseFloat(nh2 || 0) + parseFloat(nh3 || 0)) / 3;
    const na =
      nhAvg * 0.4 + parseFloat(uts || 0) * 0.3 + parseFloat(uas || 0) * 0.3;
    return na.toFixed(2);
  };

  // Update grade
  const updateGrade = (studentId, assignmentType, value) => {
    setGrades((prev) => {
      const updated = { ...prev[studentId] };
      updated[assignmentType] = { ...updated[assignmentType], score: value };

      // Recalculate NA
      updated.na = calculateNA(
        updated.NH1.score,
        updated.NH2.score,
        updated.NH3.score,
        updated.UTS.score,
        updated.UAS.score
      );

      return { ...prev, [studentId]: updated };
    });
  };

  // Save grades function
  const saveGrades = async () => {
    if (!teacherId || !selectedSubject || !selectedClass) {
      setMessage("Pilih mata pelajaran dan kelas terlebih dahulu!");
      return;
    }

    if (students.length === 0) {
      setMessage("Tidak ada siswa untuk disimpan!");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // Get teacher UUID
      const { data: teacherUser, error: teacherError } = await supabase
        .from("users")
        .select("id")
        .eq("teacher_id", teacherId)
        .single();

      if (teacherError)
        throw new Error("Gagal mengambil data guru: " + teacherError.message);

      const teacherUUID = teacherUser.id;

      // Prepare data untuk disimpan/update
      const gradesToSave = [];
      const gradesToUpdate = [];

      // Perbaikan pada fungsi saveGrades - bagian yang membuat gradeRecord
      students.forEach((student) => {
        const studentGrades = grades[student.id];
        if (studentGrades) {
          assignmentTypes.forEach((type) => {
            const gradeData = studentGrades[type];
            if (gradeData && gradeData.score !== "") {
              const scoreValue = parseFloat(gradeData.score);

              // VALIDASI SCORE
              if (!isNaN(scoreValue) && scoreValue >= 0 && scoreValue <= 100) {
                const gradeRecord = {
                  student_id: student.id,
                  teacher_id: teacherUUID,
                  class_id: selectedClass, // TAMBAHKAN INI!
                  subject: selectedSubject,
                  assignment_type: type,
                  score: scoreValue,
                  semester: semester,
                  academic_year: academicYear,
                };

                // Pastikan semua field required ada
                if (
                  !gradeRecord.student_id ||
                  !gradeRecord.teacher_id ||
                  !gradeRecord.class_id || // TAMBAHKAN VALIDASI INI!
                  !gradeRecord.subject ||
                  !gradeRecord.assignment_type ||
                  !gradeRecord.semester ||
                  !gradeRecord.academic_year
                ) {
                  console.error("Missing required fields:", gradeRecord);
                  throw new Error(
                    `Data tidak lengkap untuk siswa ${student.full_name}, assignment ${type}`
                  );
                }

                if (gradeData.id) {
                  // Update existing record
                  gradesToUpdate.push({ ...gradeRecord, id: gradeData.id });
                } else {
                  // Insert new record
                  gradesToSave.push(gradeRecord);
                }
              } else {
                console.warn(
                  `Invalid score for student ${student.full_name}, ${type}: ${gradeData.score}`
                );
              }
            }
          });
        }
      });

      let successCount = 0;
      let errorCount = 0;
      const errorDetails = [];

      // Insert new grades dengan batch yang lebih kecil
      if (gradesToSave.length > 0) {
        const BATCH_SIZE = 5;
        for (let i = 0; i < gradesToSave.length; i += BATCH_SIZE) {
          const batch = gradesToSave.slice(i, i + BATCH_SIZE);

          try {
            const { data, error } = await supabase
              .from("grades")
              .insert(batch)
              .select();

            if (error) {
              errorCount += batch.length;
              errorDetails.push(
                `Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`
              );
            } else {
              successCount += data?.length || batch.length;
            }
          } catch (batchError) {
            errorCount += batch.length;
            errorDetails.push(
              `Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batchError.message}`
            );
          }
        }
      }

      // Update existing grades
      if (gradesToUpdate.length > 0) {
        for (const grade of gradesToUpdate) {
          const { id, ...updateData } = grade;

          try {
            const { error } = await supabase
              .from("grades")
              .update(updateData)
              .eq("id", id);

            if (error) {
              errorCount++;
              errorDetails.push(`Update ID ${id}: ${error.message}`);
            } else {
              successCount++;
            }
          } catch (updateError) {
            errorCount++;
            errorDetails.push(`Update ID ${id}: ${updateError.message}`);
          }
        }
      }

      if (errorCount > 0) {
        const errorMsg = `Berhasil menyimpan ${successCount} data, gagal ${errorCount} data.\nDetail error:\n${errorDetails.join(
          "\n"
        )}`;
        throw new Error(errorMsg);
      }

      if (successCount === 0) {
        throw new Error(
          "Tidak ada data yang berhasil disimpan. Pastikan Anda mengisi nilai terlebih dahulu."
        );
      }

      const successMsg = `Nilai berhasil disimpan! (${successCount} records)`;
      setMessage(successMsg);
      if (onShowToast) {
        onShowToast(successMsg);
      }

      // Refresh data setelah save
      setTimeout(() => {
        fetchStudentsAndGrades(selectedClass);
        setMessage("");
      }, 2000);
    } catch (error) {
      const errorMsg = "Gagal menyimpan nilai: " + error.message;
      setMessage(errorMsg);
      if (onShowToast) {
        onShowToast(errorMsg, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  // Get grade statistics
  const getGradeStats = () => {
    const stats = { total: 0, completed: 0, average: 0 };
    let totalNA = 0;
    let completedCount = 0;

    Object.values(grades).forEach((studentGrade) => {
      stats.total++;

      // Check if any grade is filled
      const hasGrades = assignmentTypes.some(
        (type) => studentGrade[type] && studentGrade[type].score !== ""
      );

      if (hasGrades) {
        stats.completed++;
        const na = parseFloat(studentGrade.na) || 0;
        if (na > 0) {
          totalNA += na;
          completedCount++;
        }
      }
    });

    stats.average =
      completedCount > 0 ? (totalNA / completedCount).toFixed(2) : 0;
    return stats;
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Calculator className="w-12 h-12 text-indigo-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Memeriksa autentikasi...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-500 text-6xl mb-4">⚠</div>
          <p className="text-gray-700">
            Anda harus login untuk mengakses halaman ini
          </p>
        </div>
      </div>
    );
  }

  const stats = getGradeStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Calculator className="w-8 h-8 text-indigo-600" />
                <h1 className="text-2xl font-bold text-gray-800">
                  Input Nilai Siswa
                </h1>
              </div>
              <div className="text-gray-600">
                <span>
                  Kelola Nilai Siswa Untuk Mata Pelajaran
                </span>
              </div>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`mt-4 p-3 rounded-lg ${
                message.includes("Error") || message.includes("Gagal")
                  ? "bg-red-100 text-red-700 border border-red-300"
                  : "bg-green-100 text-green-700 border border-green-300"
              }`}>
              {message}
            </div>
          )}

          {/* UPDATED FILTERS with Dynamic Academic Year */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {/* Academic Year - DYNAMIC FROM DATABASE */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Tahun Akademik
              </label>
              <select
                value={academicYear}
                onChange={(e) => {
                  setAcademicYear(e.target.value);
                  setSelectedSubject("");
                  setSelectedClass("");
                  setStudents([]);
                  setGrades({});
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={loading || academicYears.length === 0}>
                <option value="">Pilih Tahun Akademik</option>
                {academicYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Semester */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <GraduationCap className="w-4 h-4 inline mr-2" />
                Semester
              </label>
              <select
                value={semester}
                onChange={(e) => {
                  setSemester(e.target.value);
                  setSelectedSubject("");
                  setSelectedClass("");
                  setStudents([]);
                  setGrades({});
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={!academicYear}>
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
              </select>
            </div>

            {/* Mata Pelajaran */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <BookOpen className="w-4 h-4 inline mr-2" />
                Mata Pelajaran
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  setSelectedClass("");
                  setStudents([]);
                  setGrades({});
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={loading || !academicYear || subjects.length === 0}>
                <option value="">Pilih Mata Pelajaran</option>
                {subjects.map((subject, index) => (
                  <option key={index} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>

            {/* Kelas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 inline mr-2" />
                Kelas
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={!selectedSubject || loading || classes.length === 0}>
                <option value="">Pilih Kelas</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {selectedClass && selectedSubject && students.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">
                    {stats.total}
                  </p>
                  <p className="text-gray-600">Total Siswa</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center gap-4">
                <div className="bg-green-100 p-3 rounded-lg">
                  <Eye className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">
                    {stats.completed}
                  </p>
                  <p className="text-gray-600">Sudah Dinilai</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center gap-4">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">
                    {stats.average}
                  </p>
                  <p className="text-gray-600">Rata-rata NA</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Grades Table */}
        {selectedClass && selectedSubject && students.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">
                    Daftar Nilai -{" "}
                    {classes.find((c) => c.id === selectedClass)?.displayName}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedSubject} • {academicYear} • Semester {semester}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    NA = Rata-rata NH (40%) + UTS (30%) + UAS (30%)
                  </p>
                </div>
                <button
                  onClick={saveGrades}
                  disabled={loading || students.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors">
                  <Save className="w-4 h-4" />
                  {loading ? "Menyimpan..." : "Simpan Nilai"}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      No
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      NIS
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nama Siswa
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      NH1
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      NH2
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      NH3
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      UTS
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      UAS
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-indigo-50">
                      NA
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((student, index) => {
                    const studentGrade = grades[student.id] || {};
                    return (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {student.nis}
                        </td>
                        <td className="px-4 py-4 text-sm font-medium text-gray-900">
                          {student.full_name}
                        </td>

                        {/* Input Fields */}
                        {assignmentTypes.map((type) => (
                          <td key={type} className="px-4 py-4">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={studentGrade[type]?.score || ""}
                              onChange={(e) =>
                                updateGrade(student.id, type, e.target.value)
                              }
                              className="w-20 p-2 text-center border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="0"
                              disabled={loading}
                            />
                          </td>
                        ))}

                        {/* Nilai Akhir */}
                        <td className="px-4 py-4">
                          <div className="text-center font-bold text-indigo-600 bg-indigo-50 rounded px-3 py-2">
                            {studentGrade.na || "0.00"}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty States */}
        {selectedClass &&
          selectedSubject &&
          students.length === 0 &&
          !loading && (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-500 mb-2">
                Tidak ada siswa aktif
              </h3>
              <p className="text-gray-400">
                Tidak ada siswa aktif di kelas ini untuk tahun akademik{" "}
                {academicYear}
              </p>
            </div>
          )}

        {!selectedClass && selectedSubject && classes.length === 0 && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-2">
              Tidak ada kelas
            </h3>
            <p className="text-gray-400">
              Tidak ada kelas untuk mata pelajaran ini di semester {semester}
            </p>
          </div>
        )}

        {(!selectedClass || !selectedSubject) && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <Calculator className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-2">
              Pilih Filter
            </h3>
            <p className="text-gray-400">
              Silakan lengkapi semua filter untuk mulai input nilai
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Grades;
