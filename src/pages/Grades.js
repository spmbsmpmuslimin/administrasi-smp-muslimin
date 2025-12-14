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
  Download,
  Upload,
  Loader2,
} from "lucide-react";
import { exportToExcel, importFromExcel } from "./GradesExcel";

// Loading Overlay Component
const LoadingOverlay = ({ message }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 sm:p-8 max-w-sm w-full">
      <div className="flex flex-col items-center">
        <Loader2 className="w-12 h-12 sm:w-16 sm:h-16 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
        <p className="text-slate-800 dark:text-slate-100 font-medium text-base sm:text-lg text-center mb-2">
          {message || "Memproses..."}
        </p>
        <p className="text-slate-600 dark:text-slate-400 text-sm text-center">
          Mohon tunggu sebentar
        </p>
      </div>
    </div>
  </div>
);

const Grades = ({ user, onShowToast }) => {
  // States untuk auth dan user
  const [teacherId, setTeacherId] = useState(null);
  const [teacherName, setTeacherName] = useState("");
  const [authLoading, setAuthLoading] = useState(true);

  // States untuk filter
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
  const [loadingMessage, setLoadingMessage] = useState("");
  const [message, setMessage] = useState("");

  // Assignment types
  const assignmentTypes = ["NH1", "NH2", "NH3", "PSTS", "PSAS"];

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (user) {
          const { data: teacherData, error: teacherError } = await supabase
            .from("users")
            .select("teacher_id, full_name")
            .eq("username", user.username)
            .single();

          if (teacherError) {
            console.error("Error fetching teacher data:", teacherError);
            setMessage("Error: Data guru tidak ditemukan");
          } else if (teacherData) {
            setTeacherId(teacherData.teacher_id);
            setTeacherName(teacherData.full_name);
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

  // Fetch Academic Years
  useEffect(() => {
    const fetchAcademicYears = async () => {
      if (!teacherId) return;

      try {
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
          setAcademicYears([]);
          setMessage("Tidak ada data tahun akademik untuk guru ini");
          return;
        }

        const uniqueYears = [
          ...new Set(assignmentData.map((item) => item.academic_year)),
        ];
        const sortedYears = uniqueYears.sort((a, b) => {
          const yearA = parseInt(a.split("/")[0]);
          const yearB = parseInt(b.split("/")[0]);
          return yearB - yearA;
        });

        setAcademicYears(sortedYears);

        if (!academicYear && sortedYears.length > 0) {
          setAcademicYear(sortedYears[0]);
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

  // Fetch subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!teacherId || !academicYear) {
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
          setSubjects([]);
          setMessage(
            `Tidak ada mata pelajaran untuk tahun ${academicYear} semester ${semester}`
          );
          return;
        }

        const uniqueSubjects = [...new Set(data.map((item) => item.subject))];
        setSubjects(uniqueSubjects);

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

  // Fetch classes
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
      setLoadingMessage("Mengambil data siswa...");

      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, full_name, nis")
        .eq("class_id", classId)
        .eq("academic_year", academicYear)
        .eq("is_active", true)
        .order("full_name");

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      setLoadingMessage("Mengambil data nilai...");

      const { data: teacherUser, error: teacherError } = await supabase
        .from("users")
        .select("id")
        .eq("teacher_id", teacherId)
        .single();

      if (teacherError) throw teacherError;

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

      const formattedGrades = {};
      studentsData.forEach((student) => {
        formattedGrades[student.id] = {
          NH1: { score: "", id: null },
          NH2: { score: "", id: null },
          NH3: { score: "", id: null },
          PSTS: { score: "", id: null },
          PSAS: { score: "", id: null },
          na: 0,
        };

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

        const grades = formattedGrades[student.id];
        const nh1 = parseFloat(grades.NH1.score) || 0;
        const nh2 = parseFloat(grades.NH2.score) || 0;
        const nh3 = parseFloat(grades.NH3.score) || 0;
        const psts = parseFloat(grades.PSTS.score) || 0;
        const psas = parseFloat(grades.PSAS.score) || 0;

        const nhAvg = (nh1 + nh2 + nh3) / 3;
        const na = nhAvg * 0.4 + psts * 0.3 + psas * 0.3;
        formattedGrades[student.id].na = na.toFixed(2);
      });

      setGrades(formattedGrades);
    } catch (error) {
      console.error("Error fetching students and grades:", error);
      setMessage("Error: Gagal mengambil data - " + error.message);
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  useEffect(() => {
    if (selectedClass && selectedSubject) {
      fetchStudentsAndGrades(selectedClass);
    }
  }, [selectedClass, selectedSubject, academicYear, semester]);

  // Calculate NA
  const calculateNA = (nh1, nh2, nh3, psts, psas) => {
    const nhAvg =
      (parseFloat(nh1 || 0) + parseFloat(nh2 || 0) + parseFloat(nh3 || 0)) / 3;
    const na =
      nhAvg * 0.4 + parseFloat(psts || 0) * 0.3 + parseFloat(psas || 0) * 0.3;
    return na.toFixed(2);
  };

  // Update grade
  const updateGrade = (studentId, assignmentType, value) => {
    setGrades((prev) => {
      const updated = { ...prev[studentId] };
      updated[assignmentType] = { ...updated[assignmentType], score: value };

      updated.na = calculateNA(
        updated.NH1.score,
        updated.NH2.score,
        updated.NH3.score,
        updated.PSTS.score,
        updated.PSAS.score
      );

      return { ...prev, [studentId]: updated };
    });
  };

  // Save grades function - OPTIMIZED
  const saveGrades = async () => {
    if (!teacherId || !selectedSubject || !selectedClass) {
      const msg = "Pilih mata pelajaran dan kelas terlebih dahulu!";
      setMessage(msg);
      if (onShowToast) onShowToast(msg, "error");
      return;
    }

    if (students.length === 0) {
      const msg = "Tidak ada siswa untuk disimpan!";
      setMessage(msg);
      if (onShowToast) onShowToast(msg, "error");
      return;
    }

    setLoading(true);
    setLoadingMessage("Mempersiapkan data...");
    setMessage("");

    try {
      const { data: teacherUser, error: teacherError } = await supabase
        .from("users")
        .select("id")
        .eq("teacher_id", teacherId)
        .single();

      if (teacherError)
        throw new Error("Gagal mengambil data guru: " + teacherError.message);

      const teacherUUID = teacherUser.id;
      const gradesToSave = [];
      const gradesToUpdate = [];

      students.forEach((student) => {
        const studentGrades = grades[student.id];
        if (studentGrades) {
          assignmentTypes.forEach((type) => {
            const gradeData = studentGrades[type];
            if (gradeData && gradeData.score !== "") {
              const scoreValue = parseFloat(gradeData.score);

              if (!isNaN(scoreValue) && scoreValue >= 0 && scoreValue <= 100) {
                const gradeRecord = {
                  student_id: student.id,
                  teacher_id: teacherUUID,
                  class_id: selectedClass,
                  subject: selectedSubject,
                  assignment_type: type,
                  score: scoreValue,
                  semester: semester,
                  academic_year: academicYear,
                };

                if (
                  !gradeRecord.student_id ||
                  !gradeRecord.teacher_id ||
                  !gradeRecord.class_id ||
                  !gradeRecord.subject ||
                  !gradeRecord.assignment_type ||
                  !gradeRecord.semester ||
                  !gradeRecord.academic_year
                ) {
                  throw new Error(
                    `Data tidak lengkap untuk siswa ${student.full_name}, assignment ${type}`
                  );
                }

                if (gradeData.id) {
                  gradesToUpdate.push({ ...gradeRecord, id: gradeData.id });
                } else {
                  gradesToSave.push(gradeRecord);
                }
              }
            }
          });
        }
      });

      let successCount = 0;
      let errorCount = 0;
      const errorDetails = [];

      // INSERT - Batch processing
      if (gradesToSave.length > 0) {
        setLoadingMessage(`Menyimpan ${gradesToSave.length} nilai baru...`);
        const BATCH_SIZE = 10; // Increased batch size for better performance
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

      // UPDATE - Batch processing (OPTIMIZED)
      if (gradesToUpdate.length > 0) {
        setLoadingMessage(`Memperbarui ${gradesToUpdate.length} nilai...`);

        // Group updates by student to reduce number of queries
        const BATCH_SIZE = 10;
        for (let i = 0; i < gradesToUpdate.length; i += BATCH_SIZE) {
          const batch = gradesToUpdate.slice(i, i + BATCH_SIZE);

          // Execute updates in parallel for better performance
          const updatePromises = batch.map(async (grade) => {
            const { id, ...updateData } = grade;
            try {
              const { error } = await supabase
                .from("grades")
                .update(updateData)
                .eq("id", id);

              if (error) {
                return { success: false, id, error: error.message };
              }
              return { success: true };
            } catch (updateError) {
              return { success: false, id, error: updateError.message };
            }
          });

          const results = await Promise.all(updatePromises);

          results.forEach((result) => {
            if (result.success) {
              successCount++;
            } else {
              errorCount++;
              errorDetails.push(`Update ID ${result.id}: ${result.error}`);
            }
          });
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
      if (onShowToast) onShowToast(successMsg, "success");

      setLoadingMessage("Memuat ulang data...");
      setTimeout(() => {
        fetchStudentsAndGrades(selectedClass);
        setMessage("");
      }, 1000);
    } catch (error) {
      const errorMsg = "Gagal menyimpan nilai: " + error.message;
      setMessage(errorMsg);
      if (onShowToast) onShowToast(errorMsg, "error");
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  // Handler Export
  const handleExport = async () => {
    if (!selectedClass || !selectedSubject || students.length === 0) {
      const msg = "Pilih mata pelajaran dan kelas terlebih dahulu!";
      setMessage(msg);
      if (onShowToast) onShowToast(msg, "error");
      return;
    }

    setLoading(true);
    setLoadingMessage("Mengekspor data ke Excel...");

    const result = await exportToExcel({
      students,
      grades,
      selectedSubject,
      selectedClass,
      className: classes.find((c) => c.id === selectedClass)?.displayName,
      academicYear,
      semester,
      teacherId,
    });

    setMessage(result.message);
    if (onShowToast) {
      onShowToast(result.message, result.success ? "success" : "error");
    }
    setLoading(false);
    setLoadingMessage("");
  };

  // Handler Import
  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!selectedClass || !selectedSubject || students.length === 0) {
      const msg = "Pilih mata pelajaran dan kelas terlebih dahulu!";
      setMessage(msg);
      if (onShowToast) onShowToast(msg, "error");
      event.target.value = "";
      return;
    }

    setLoading(true);
    setLoadingMessage("Memproses file Excel...");

    const result = await importFromExcel(file, {
      students,
      teacherId,
      selectedSubject,
      selectedClass,
      academicYear,
      semester,
    });

    setMessage(result.message);
    if (onShowToast) {
      onShowToast(result.message, result.success ? "success" : "error");
    }

    if (result.success) {
      setLoadingMessage("Memuat ulang data...");
      setTimeout(() => {
        fetchStudentsAndGrades(selectedClass);
        setMessage("");
        setLoadingMessage("");
      }, 1000);
    }

    setLoading(false);
    setLoadingMessage("");
    event.target.value = "";
  };

  // Get grade statistics
  const getGradeStats = () => {
    const stats = { total: 0, completed: 0, average: 0 };
    let totalNA = 0;
    let completedCount = 0;

    Object.values(grades).forEach((studentGrade) => {
      stats.total++;

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
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Calculator className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-600 dark:text-indigo-400 mx-auto mb-4 animate-spin" />
          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
            Memeriksa autentikasi...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/50 p-6 sm:p-8 text-center max-w-md">
          <div className="text-red-500 dark:text-red-400 text-4xl sm:text-5xl mb-4">
            ⚠️
          </div>
          <p className="text-slate-700 dark:text-slate-300 text-sm sm:text-base">
            Anda harus login untuk mengakses halaman ini
          </p>
        </div>
      </div>
    );
  }

  const stats = getGradeStats();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 p-3 sm:p-4 md:p-6">
      {/* Loading Overlay */}
      {loading && loadingMessage && <LoadingOverlay message={loadingMessage} />}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/30 border border-slate-200 dark:border-gray-700 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <Calculator className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-indigo-600 dark:text-indigo-400" />
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100">
                  Input Nilai Siswa
                </h1>
              </div>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                Kelola Nilai Siswa Untuk Mata Pelajaran
              </p>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`mt-3 sm:mt-4 p-3 sm:p-3.5 rounded-lg text-sm sm:text-base ${
                message.includes("Error") || message.includes("Gagal")
                  ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700"
                  : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700"
              }`}>
              {message}
            </div>
          )}

          {/* Filters */}
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-4 sm:mt-6">
            {/* Academic Year */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 inline mr-1.5" />
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
                className="w-full p-3 sm:p-3.5 text-sm sm:text-base border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 transition-colors"
                disabled={loading || academicYears.length === 0}
                style={{ minHeight: "44px", touchAction: "manipulation" }}>
                <option value="" className="dark:bg-gray-700">
                  Pilih Tahun Akademik
                </option>
                {academicYears.map((year) => (
                  <option
                    key={year}
                    value={year}
                    className="dark:bg-gray-700 dark:text-slate-100">
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Semester */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <GraduationCap className="w-3 h-3 sm:w-3.5 sm:h-3.5 inline mr-1.5" />
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
                className="w-full p-3 sm:p-3.5 text-sm sm:text-base border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 transition-colors"
                disabled={!academicYear}
                style={{ minHeight: "44px", touchAction: "manipulation" }}>
                <option value="1" className="dark:bg-gray-700">
                  Semester 1
                </option>
                <option value="2" className="dark:bg-gray-700">
                  Semester 2
                </option>
              </select>
            </div>

            {/* Mata Pelajaran */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5 inline mr-1.5" />
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
                className="w-full p-3 sm:p-3.5 text-sm sm:text-base border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 transition-colors"
                disabled={loading || !academicYear || subjects.length === 0}
                style={{ minHeight: "44px", touchAction: "manipulation" }}>
                <option value="" className="dark:bg-gray-700">
                  Pilih Mata Pelajaran
                </option>
                {subjects.map((subject, index) => (
                  <option
                    key={index}
                    value={subject}
                    className="dark:bg-gray-700 dark:text-slate-100">
                    {subject}
                  </option>
                ))}
              </select>
            </div>

            {/* Kelas */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 inline mr-1.5" />
                Kelas
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full p-3 sm:p-3.5 text-sm sm:text-base border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 transition-colors"
                disabled={!selectedSubject || loading || classes.length === 0}
                style={{ minHeight: "44px", touchAction: "manipulation" }}>
                <option value="" className="dark:bg-gray-700">
                  Pilih Kelas
                </option>
                {classes.map((cls) => (
                  <option
                    key={cls.id}
                    value={cls.id}
                    className="dark:bg-gray-700 dark:text-slate-100">
                    {cls.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {selectedClass && selectedSubject && students.length > 0 && (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/30 border border-slate-200 dark:border-gray-700 p-4 sm:p-5 md:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2.5 sm:p-3 rounded-lg">
                  <Users className="w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {stats.total}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    Total Siswa
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/30 border border-slate-200 dark:border-gray-700 p-4 sm:p-5 md:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="bg-green-100 dark:bg-green-900/30 p-2.5 sm:p-3 rounded-lg">
                  <Eye className="w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {stats.completed}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    Sudah Dinilai
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/30 border border-slate-200 dark:border-gray-700 p-4 sm:p-5 md:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="bg-purple-100 dark:bg-purple-900/30 p-2.5 sm:p-3 rounded-lg">
                  <BarChart3 className="w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {stats.average}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    Rata-rata NA
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Grades Table/Cards */}
        {selectedClass && selectedSubject && students.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/30 border border-slate-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 sm:p-5 md:p-6 border-b border-slate-200 dark:border-gray-700">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
                <div>
                  <h2 className="text-base sm:text-lg md:text-xl font-semibold text-slate-800 dark:text-slate-100">
                    Daftar Nilai -{" "}
                    {classes.find((c) => c.id === selectedClass)?.displayName}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {selectedSubject} • {academicYear} • Semester {semester}
                  </p>
                </div>

                {/* Action Buttons - SELALU HORIZONTAL */}
                <div className="flex flex-row gap-2 sm:gap-3">
                  <button
                    onClick={saveGrades}
                    disabled={loading || students.length === 0}
                    className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 disabled:bg-gray-400 dark:disabled:bg-gray-700 text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-lg font-medium transition-colors active:scale-[0.98] text-sm sm:text-base"
                    style={{ minHeight: "44px", touchAction: "manipulation" }}>
                    <Save className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                    <span className="hidden sm:inline">
                      {loading ? "Menyimpan..." : "Simpan Nilai"}
                    </span>
                  </button>

                  <button
                    onClick={handleExport}
                    disabled={loading || students.length === 0}
                    className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 disabled:bg-gray-400 dark:disabled:bg-gray-700 text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-lg font-medium transition-colors active:scale-[0.98] text-sm sm:text-base"
                    title="Export data nilai ke Excel"
                    style={{ minHeight: "44px", touchAction: "manipulation" }}>
                    <Download className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                    <span className="hidden sm:inline">Export Excel</span>
                    <span className="sm:hidden">Export</span>
                  </button>

                  <label
                    className={`flex items-center justify-center gap-2 ${
                      loading || students.length === 0
                        ? "bg-gray-400 dark:bg-gray-700 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 cursor-pointer"
                    } text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-lg font-medium transition-colors active:scale-[0.98] text-sm sm:text-base`}
                    title="Import nilai dari file Excel"
                    style={{ minHeight: "44px", touchAction: "manipulation" }}>
                    <Upload className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                    <span className="hidden sm:inline">Import Excel</span>
                    <span className="sm:hidden">Import</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleImport}
                      disabled={loading || students.length === 0}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Mobile View - Card Layout */}
            <div className="block lg:hidden">
              {students.map((student, index) => {
                const studentGrade = grades[student.id] || {};
                return (
                  <div
                    key={student.id}
                    className="border-b border-slate-100 dark:border-gray-700 p-4">
                    <div className="mb-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                            {index + 1}. {student.full_name}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            NIS: {student.nis}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                            Nilai Akhir
                          </div>
                          <div className="font-bold text-base sm:text-lg text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded px-3 py-1.5">
                            {studentGrade.na || "0.00"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Grade Inputs - Grid untuk mobile */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        {/* NH1 */}
                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            NH1
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={studentGrade.NH1?.score || ""}
                            onChange={(e) =>
                              updateGrade(student.id, "NH1", e.target.value)
                            }
                            className="w-full p-3 text-sm text-center border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 transition-colors"
                            placeholder="0"
                            disabled={loading}
                            style={{
                              minHeight: "44px",
                              touchAction: "manipulation",
                            }}
                          />
                        </div>

                        {/* NH2 */}
                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            NH2
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={studentGrade.NH2?.score || ""}
                            onChange={(e) =>
                              updateGrade(student.id, "NH2", e.target.value)
                            }
                            className="w-full p-3 text-sm text-center border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 transition-colors"
                            placeholder="0"
                            disabled={loading}
                            style={{
                              minHeight: "44px",
                              touchAction: "manipulation",
                            }}
                          />
                        </div>

                        {/* NH3 */}
                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            NH3
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={studentGrade.NH3?.score || ""}
                            onChange={(e) =>
                              updateGrade(student.id, "NH3", e.target.value)
                            }
                            className="w-full p-3 text-sm text-center border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 transition-colors"
                            placeholder="0"
                            disabled={loading}
                            style={{
                              minHeight: "44px",
                              touchAction: "manipulation",
                            }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {/* PSTS */}
                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            PSTS
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={studentGrade.PSTS?.score || ""}
                            onChange={(e) =>
                              updateGrade(student.id, "PSTS", e.target.value)
                            }
                            className="w-full p-3 text-sm text-center border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 transition-colors"
                            placeholder="0"
                            disabled={loading}
                            style={{
                              minHeight: "44px",
                              touchAction: "manipulation",
                            }}
                          />
                        </div>

                        {/* PSAS */}
                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            PSAS
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={studentGrade.PSAS?.score || ""}
                            onChange={(e) =>
                              updateGrade(student.id, "PSAS", e.target.value)
                            }
                            className="w-full p-3 text-sm text-center border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 transition-colors"
                            placeholder="0"
                            disabled={loading}
                            style={{
                              minHeight: "44px",
                              touchAction: "manipulation",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View - Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3.5 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      No
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      NIS
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Nama Siswa
                    </th>
                    <th className="px-4 py-3.5 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      NH1
                    </th>
                    <th className="px-4 py-3.5 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      NH2
                    </th>
                    <th className="px-4 py-3.5 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      NH3
                    </th>
                    <th className="px-4 py-3.5 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      PSTS
                    </th>
                    <th className="px-4 py-3.5 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      PSAS
                    </th>
                    <th className="px-4 py-3.5 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/30">
                      NA
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-slate-200 dark:divide-gray-700">
                  {students.map((student, index) => {
                    const studentGrade = grades[student.id] || {};
                    return (
                      <tr
                        key={student.id}
                        className="hover:bg-slate-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3.5 text-sm text-slate-900 dark:text-slate-100">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {student.nis}
                        </td>
                        <td className="px-4 py-3.5 text-sm font-medium text-slate-900 dark:text-slate-100">
                          {student.full_name}
                        </td>

                        {/* Input Fields */}
                        {assignmentTypes.map((type) => (
                          <td key={type} className="px-4 py-3.5">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={studentGrade[type]?.score || ""}
                              onChange={(e) =>
                                updateGrade(student.id, type, e.target.value)
                              }
                              className="w-24 p-2.5 text-center text-sm border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 transition-colors"
                              placeholder="0"
                              disabled={loading}
                            />
                          </td>
                        ))}

                        {/* Nilai Akhir */}
                        <td className="px-4 py-3.5">
                          <div className="text-center font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded px-3 py-2">
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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/30 border border-slate-200 dark:border-gray-700 p-6 sm:p-8 md:p-12 text-center">
              <Users className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-slate-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg md:text-xl font-medium text-slate-500 dark:text-slate-400 mb-2">
                Tidak ada siswa aktif
              </h3>
              <p className="text-sm sm:text-base text-slate-400 dark:text-slate-500">
                Tidak ada siswa aktif di kelas ini untuk tahun akademik{" "}
                {academicYear}
              </p>
            </div>
          )}

        {!selectedClass && selectedSubject && classes.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/30 border border-slate-200 dark:border-gray-700 p-6 sm:p-8 md:p-12 text-center">
            <BookOpen className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-slate-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg md:text-xl font-medium text-slate-500 dark:text-slate-400 mb-2">
              Tidak ada kelas
            </h3>
            <p className="text-sm sm:text-base text-slate-400 dark:text-slate-500">
              Tidak ada kelas untuk mata pelajaran ini di semester {semester}
            </p>
          </div>
        )}

        {(!selectedClass || !selectedSubject) && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/30 border border-slate-200 dark:border-gray-700 p-6 sm:p-8 md:p-12 text-center">
            <Calculator className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-slate-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg md:text-xl font-medium text-slate-500 dark:text-slate-400 mb-2">
              Pilih Filter
            </h3>
            <p className="text-sm sm:text-base text-slate-400 dark:text-slate-500">
              Silakan lengkapi semua filter untuk mulai input nilai
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Grades;
