import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
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

// ✅ IMPORT SERVICE YANG BENAR
import {
  getActiveAcademicInfo,
  getActiveAcademicYear,
  getCurrentAcademicYearFallback,
  getCurrentSemesterFallback,
  formatSemesterDisplay,
} from "../../services/academicYearService";

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
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedClass, setSelectedClass] = useState("");

  // ✅ STATE SEMESTER YANG BENAR
  const [selectedSemesterId, setSelectedSemesterId] = useState(null);
  const [availableSemesters, setAvailableSemesters] = useState([]);
  const [selectedSemesterInfo, setSelectedSemesterInfo] = useState(null);
  const [academicYear, setAcademicYear] = useState("");

  // ✅ TAMBAH STATE UNTUK READ-ONLY MODE
  const [isReadOnlyMode, setIsReadOnlyMode] = useState(false);

  // States untuk data siswa dan nilai
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [message, setMessage] = useState("");

  // ✅ STATE UNTUK ACTIVE ACADEMIC INFO
  const [activeAcademicInfo, setActiveAcademicInfo] = useState(null);
  const [loadingAcademicInfo, setLoadingAcademicInfo] = useState(true);

  // Assignment types
  const assignmentTypes = ["NH1", "NH2", "NH3", "PSTS", "PSAS"];

  // ✅ EFFECT UNTUK LOAD ACTIVE ACADEMIC INFO
  useEffect(() => {
    const loadActiveAcademicInfo = async () => {
      try {
        setLoadingAcademicInfo(true);
        const info = await getActiveAcademicInfo();
        setActiveAcademicInfo(info);
        console.log("✅ Active Academic Info loaded for Grades:", info);
      } catch (error) {
        console.error("❌ Error loading active academic info:", error);
        setMessage("Error: Gagal memuat informasi tahun ajaran aktif");
      } finally {
        setLoadingAcademicInfo(false);
      }
    };

    loadActiveAcademicInfo();
  }, []);

  // ✅ FIXED: LOAD AVAILABLE SEMESTERS YANG BENAR
  useEffect(() => {
    const loadAvailableSemesters = async () => {
      if (!activeAcademicInfo) return;

      try {
        console.log("🔄 Loading available semesters...");

        // ✅ GUNAKAN getActiveAcademicYear() YANG BENAR
        const activeYearData = await getActiveAcademicYear();

        if (activeYearData && activeYearData.semesters) {
          const semesters = activeYearData.semesters;
          console.log("✅ Available semesters loaded:", semesters);

          setAvailableSemesters(semesters);
          setAcademicYear(activeYearData.year);

          // ✅ PERBAIKAN: Default ke semester AKTIF, bukan semester pertama
          const activeSemester = semesters.find((s) => s.is_active);
          if (activeSemester) {
            setSelectedSemesterId(activeSemester.id);
            setSelectedSemesterInfo(activeSemester);
            setAcademicYear(activeSemester.year);
            setIsReadOnlyMode(false); // Semester aktif = tidak read-only
          } else if (semesters.length > 0) {
            // Fallback: kalau gak ada aktif, pilih yang pertama (read-only)
            setSelectedSemesterId(semesters[0].id);
            setSelectedSemesterInfo(semesters[0]);
            setAcademicYear(semesters[0].year);
            setIsReadOnlyMode(true);
          }
        } else {
          // Fallback jika tidak ada data
          console.warn("⚠️ No semester data, using fallback");
          const fallbackYear = getCurrentAcademicYearFallback();
          const fallbackSemester = getCurrentSemesterFallback();

          const fallbackSemesters = [
            {
              id: "fallback",
              year: fallbackYear,
              semester: fallbackSemester,
              is_active: false,
              start_date: new Date().toISOString().split("T")[0],
              end_date: new Date(new Date().setMonth(new Date().getMonth() + 6))
                .toISOString()
                .split("T")[0],
            },
          ];

          setAvailableSemesters(fallbackSemesters);
          setSelectedSemesterId("fallback");
          setSelectedSemesterInfo(fallbackSemesters[0]);
          setAcademicYear(fallbackYear);
          setIsReadOnlyMode(true);
        }
      } catch (error) {
        console.error("❌ Error loading semesters:", error);
        setMessage("Error: Gagal memuat data semester");
      }
    };

    loadAvailableSemesters();
  }, [activeAcademicInfo]);

  // ✅ TAMBAH HANDLER: SEMESTER CHANGE - DIPERBAIKI
  const handleSemesterChange = (semesterId) => {
    console.log("📅 Semester changed to:", semesterId);

    const semesterInfo = availableSemesters.find((s) => s.id === semesterId);
    if (!semesterInfo) {
      console.error("❌ Semester not found:", semesterId);
      return;
    }

    setSelectedSemesterId(semesterId);
    setSelectedSemesterInfo(semesterInfo);
    setAcademicYear(semesterInfo.year);

    // ✅ CEK APAKAH SEMESTER AKTIF ATAU TIDAK
    const isActive = semesterInfo?.is_active || false;
    setIsReadOnlyMode(!isActive); // Read-only jika bukan semester aktif

    // Reset filter dependencies
    setSelectedSubject("");
    setSelectedClass("");
    setStudents([]);
    setGrades({});

    console.log("✅ Semester info updated:", semesterInfo);
    console.log("🔒 Read-only mode:", !isActive);

    // ✅ TOAST NOTIFICATION
    if (onShowToast) {
      const mode = isActive ? "Input Mode" : "View Only Mode";
      onShowToast(
        `Switched to ${semesterInfo.year} - Semester ${semesterInfo.semester} (${mode})`,
        isActive ? "info" : "warning"
      );
    }
  };

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

  // ✅ UPDATE: Fetch subjects dengan academic_year_id
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!teacherId || !selectedSemesterId) {
        console.log("🔄 Skipping subjects fetch - missing teacherId or semesterId");
        setSubjects([]);
        return;
      }

      try {
        console.log("🔍 Fetching subjects for:", {
          teacherId,
          selectedSemesterId,
          semesterInfo: selectedSemesterInfo,
        });

        const { data, error } = await supabase
          .from("teacher_assignments")
          .select("subject, class_id, academic_year_id")
          .eq("teacher_id", teacherId)
          .eq("academic_year_id", selectedSemesterId);

        console.log("📊 Teacher assignments result:", {
          dataCount: data?.length || 0,
          data: data,
          error: error,
        });

        if (error) {
          console.error("Error fetching subjects:", error);
          setMessage("Error: Gagal mengambil mata pelajaran");
          return;
        }

        if (!data || data.length === 0) {
          console.warn("⚠️ [DEBUG] No subjects found for this semester");
          console.warn("   Teacher ID:", teacherId);
          console.warn("   Semester ID:", selectedSemesterId);
          console.warn("   Semester Info:", selectedSemesterInfo);

          setSubjects([]);
          setMessage(
            `Tidak ada mata pelajaran untuk ${selectedSemesterInfo?.year} Semester ${selectedSemesterInfo?.semester}`
          );
          return;
        }

        const uniqueSubjects = [...new Set(data.map((item) => item.subject))];
        console.log("✅ [DEBUG] Subjects loaded:", uniqueSubjects);
        setSubjects(uniqueSubjects);
      } catch (error) {
        console.error("Error in fetchSubjects:", error);
        setMessage("Error: Terjadi kesalahan sistem");
      }
    };

    fetchSubjects();
  }, [teacherId, selectedSemesterId]);

  // ✅ FIXED: Fetch classes dengan academic_year_id (TAPI KELAS TIDAK PERLU FILTER academic_year_id)
  useEffect(() => {
    const fetchClasses = async () => {
      if (!selectedSubject || !teacherId || !selectedSemesterId) {
        console.log("🔄 Skipping classes fetch - missing data");
        setClasses([]);
        return;
      }

      try {
        console.log("🔍 Fetching classes with:", {
          teacherId,
          selectedSubject,
          selectedSemesterId,
        });

        // ✅ HANYA FILTER teacher_assignments by academic_year_id
        const { data: assignmentData, error: assignmentError } = await supabase
          .from("teacher_assignments")
          .select("class_id")
          .eq("teacher_id", teacherId)
          .eq("subject", selectedSubject)
          .eq("academic_year_id", selectedSemesterId);

        console.log("📊 Assignment data for classes:", assignmentData);

        if (assignmentError) throw assignmentError;

        if (!assignmentData?.length) {
          console.warn("⚠️ No classes found for this subject in this semester");
          setClasses([]);
          setMessage(
            `Tidak ada kelas untuk ${selectedSubject} di Semester ${selectedSemesterInfo?.semester}`
          );
          return;
        }

        const classIds = assignmentData.map((item) => item.class_id);

        // ✅ KELAS TIDAK PERLU FILTER academic_year_id!
        // Kelas tetap sama untuk semua semester dalam satu tahun
        const { data: classData, error: classError } = await supabase
          .from("classes")
          .select("id, grade")
          .in("id", classIds);

        if (classError) throw classError;

        const formattedClasses = classData.map((cls) => ({
          id: cls.id,
          grade: cls.grade,
          displayName: `Kelas ${cls.id}`,
        }));

        console.log("✅ Classes loaded:", formattedClasses);
        setClasses(formattedClasses);
      } catch (error) {
        console.error("Error fetching classes:", error);
        setMessage("Error: Gagal mengambil data kelas - " + error.message);
      }
    };

    fetchClasses();
  }, [selectedSubject, teacherId, selectedSemesterId]);

  // ✅ FIXED: Fetch students dan existing grades dengan academic_year_id (TAPI SISWA TIDAK PERLU FILTER academic_year_id)
  const fetchStudentsAndGrades = async (classId) => {
    if (!classId || !selectedSemesterId) {
      console.log("❌ Cannot fetch - missing classId or semesterId");
      setStudents([]);
      setGrades({});
      return;
    }

    try {
      setLoading(true);
      setLoadingMessage("Mengambil data siswa...");

      console.log("🔍 Fetching students for class:", classId);

      // ✅ SISWA TIDAK PERLU FILTER academic_year_id!
      // Siswa tetap di kelas yang sama sepanjang tahun
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, full_name, nis")
        .eq("class_id", classId)
        .eq("is_active", true) // ✅ Hanya siswa aktif
        .order("full_name");

      if (studentsError) {
        console.error("Error fetching students:", studentsError);
        throw studentsError;
      }

      console.log("✅ Students loaded:", studentsData?.length || 0);
      setStudents(studentsData || []);

      if (!studentsData || studentsData.length === 0) {
        console.warn("⚠️ No active students found");
        setGrades({});
        setLoading(false);
        return;
      }

      setLoadingMessage("Mengambil data nilai...");

      // Get teacher user ID
      const { data: teacherUser, error: teacherError } = await supabase
        .from("users")
        .select("id")
        .eq("teacher_id", teacherId)
        .single();

      if (teacherError) {
        console.error("Error fetching teacher user:", teacherError);
        throw teacherError;
      }

      const teacherUUID = teacherUser.id;

      // Fetch existing grades
      // Fetch existing grades
      const { data: gradesData, error: gradesError } = await supabase
        .from("grades")
        .select("id, student_id, assignment_type, score")
        .eq("teacher_id", teacherUUID)
        .eq("subject", selectedSubject)
        .eq("academic_year", selectedSemesterInfo?.year) // Filter tahun ajaran
        .eq("semester", selectedSemesterInfo?.semester) // Filter semester (1 atau 2)
        .in(
          "student_id",
          studentsData.map((s) => s.id)
        )
        .in("assignment_type", assignmentTypes);

      if (gradesError && gradesError.code !== "PGRST116") {
        console.error("Error fetching grades:", gradesError);
        // Continue without grades data
      }

      console.log("📊 Existing grades:", gradesData?.length || 0);

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

        // Calculate NA
        const grades = formattedGrades[student.id];
        const nh1 = parseFloat(grades.NH1.score) || 0;
        const nh2 = parseFloat(grades.NH2.score) || 0;
        const nh3 = parseFloat(grades.NH3.score) || 0;
        const psts = parseFloat(grades.PSTS.score) || 0;
        const psas = parseFloat(grades.PSAS.score) || 0;

        const nhValues = [nh1, nh2, nh3].filter((n) => n > 0);
        const nhAvg =
          nhValues.length > 0 ? nhValues.reduce((a, b) => a + b, 0) / nhValues.length : 0;

        const na = nhAvg * 0.4 + psts * 0.3 + psas * 0.3;
        formattedGrades[student.id].na = na.toFixed(2);
      });

      setGrades(formattedGrades);
      console.log("✅ Grades loaded successfully");
    } catch (error) {
      console.error("Error fetching students and grades:", error);
      setMessage("Error: Gagal mengambil data - " + error.message);
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  useEffect(() => {
    if (selectedClass && selectedSubject && selectedSemesterId) {
      console.log("🔄 Trigger fetch students for:", {
        selectedClass,
        selectedSubject,
        selectedSemesterId,
      });
      fetchStudentsAndGrades(selectedClass);
    }
  }, [selectedClass, selectedSubject, selectedSemesterId]);

  // Calculate NA
  const calculateNA = (nh1, nh2, nh3, psts, psas) => {
    const nhValues = [parseFloat(nh1 || 0), parseFloat(nh2 || 0), parseFloat(nh3 || 0)].filter(
      (n) => n > 0
    );

    const nhAvg = nhValues.length > 0 ? nhValues.reduce((a, b) => a + b, 0) / nhValues.length : 0;

    const na = nhAvg * 0.4 + parseFloat(psts || 0) * 0.3 + parseFloat(psas || 0) * 0.3;
    return na.toFixed(2);
  };

  // Update grade
  const updateGrade = (studentId, assignmentType, value) => {
    if (isReadOnlyMode) {
      if (onShowToast) {
        onShowToast("🔒 Mode View Only - Tidak bisa edit nilai", "error");
      }
      return;
    }

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

  const saveGrades = async () => {
    // ✅ VALIDASI 1: READ-ONLY MODE
    if (isReadOnlyMode) {
      const msg =
        "🔒 Semester ini dalam mode View Only. Ganti ke semester aktif untuk input data baru!";
      setMessage(msg);
      if (onShowToast) onShowToast(msg, "error");
      return;
    }

    if (!teacherId || !selectedSubject || !selectedClass || !selectedSemesterId) {
      const msg = "Pilih mata pelajaran, kelas, dan semester terlebih dahulu!";
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

      if (teacherError) throw new Error("Gagal mengambil data guru: " + teacherError.message);

      const teacherUUID = teacherUser.id;
      const allGrades = [];

      students.forEach((student) => {
        const studentGrades = grades[student.id];
        if (studentGrades) {
          assignmentTypes.forEach((type) => {
            const gradeData = studentGrades[type];
            if (gradeData && gradeData.score !== "") {
              const scoreValue = parseFloat(gradeData.score);

              if (!isNaN(scoreValue) && scoreValue >= 0 && scoreValue <= 100) {
                allGrades.push({
                  student_id: student.id,
                  teacher_id: teacherUUID,
                  class_id: selectedClass,
                  subject: selectedSubject,
                  assignment_type: type,
                  score: scoreValue,
                  academic_year_id: selectedSemesterId,
                  semester: selectedSemesterInfo?.semester,
                  academic_year: selectedSemesterInfo?.year,
                });
              }
            }
          });
        }
      });

      if (allGrades.length === 0) {
        throw new Error(
          "Tidak ada data yang valid untuk disimpan. Pastikan Anda mengisi nilai terlebih dahulu."
        );
      }

      console.log(`💾 Saving ${allGrades.length} grades...`);
      setLoadingMessage(`Menyimpan ${allGrades.length} data nilai...`);

      const BATCH_SIZE = 50;
      let successCount = 0;
      let errorCount = 0;
      const errorDetails = [];

      for (let i = 0; i < allGrades.length; i += BATCH_SIZE) {
        const batch = allGrades.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(allGrades.length / BATCH_SIZE);

        setLoadingMessage(`Menyimpan batch ${batchNum}/${totalBatches}...`);

        try {
          const { data, error } = await supabase
            .from("grades")
            .upsert(batch, {
              onConflict: "student_id,teacher_id,class_id,subject,assignment_type,academic_year_id",
              ignoreDuplicates: false,
            })
            .select();

          if (error) {
            console.error(`Batch ${batchNum} error:`, error);
            errorCount += batch.length;
            errorDetails.push(`Batch ${batchNum}: ${error.message}`);
          } else {
            successCount += data?.length || batch.length;
          }
        } catch (batchError) {
          console.error(`Batch ${batchNum} exception:`, batchError);
          errorCount += batch.length;
          errorDetails.push(`Batch ${batchNum}: ${batchError.message}`);
        }
      }

      if (errorCount > 0 && successCount === 0) {
        throw new Error(`Semua data gagal disimpan.\nDetail:\n${errorDetails.join("\n")}`);
      }

      if (errorCount > 0) {
        const warningMsg = `Berhasil: ${successCount} data | Gagal: ${errorCount} data`;
        console.warn(warningMsg);
        setMessage(warningMsg);
        if (onShowToast) onShowToast(warningMsg, "warning");
      } else {
        const successMsg = `✅ Berhasil menyimpan ${successCount} data nilai!`;
        console.log(successMsg);
        setMessage(successMsg);
        if (onShowToast) onShowToast(successMsg, "success");

        // Update grade IDs
        setGrades((prev) => {
          const updated = { ...prev };
          allGrades.forEach((grade) => {
            if (updated[grade.student_id]) {
              updated[grade.student_id][grade.assignment_type].id =
                grade.id || updated[grade.student_id][grade.assignment_type].id;
            }
          });
          return updated;
        });

        setTimeout(() => {
          setMessage("");
        }, 2000);
      }
    } catch (error) {
      console.error("Save error:", error);
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
    if (!selectedClass || !selectedSubject || !selectedSemesterId || students.length === 0) {
      const msg = "Pilih mata pelajaran, kelas, dan semester terlebih dahulu!";
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
      academicYear: selectedSemesterInfo?.year,
      semester: selectedSemesterInfo?.semester,
      teacherId,
      activeSemester: activeAcademicInfo?.semester,
      selectedSemesterInfo,
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

    // ✅ VALIDASI: READ-ONLY MODE
    if (isReadOnlyMode) {
      const msg = "🔒 Semester ini dalam mode View Only. Tidak bisa import data!";
      setMessage(msg);
      if (onShowToast) onShowToast(msg, "error");
      event.target.value = "";
      return;
    }

    if (!selectedClass || !selectedSubject || !selectedSemesterId || students.length === 0) {
      const msg = "Pilih mata pelajaran, kelas, dan semester terlebih dahulu!";
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
      academicYear: selectedSemesterInfo?.year,
      semester: selectedSemesterInfo?.semester,
      activeSemester: activeAcademicInfo?.semester,
      selectedSemesterInfo,
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

    stats.average = completedCount > 0 ? (totalNA / completedCount).toFixed(2) : 0;
    return stats;
  };

  // Loading state untuk academic info
  if (loadingAcademicInfo) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Calculator className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-600 dark:text-indigo-400 mx-auto mb-4 animate-spin" />
          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
            Memuat informasi tahun ajaran...
          </p>
        </div>
      </div>
    );
  }

  // Loading state untuk auth
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
          <div className="text-red-500 dark:text-red-400 text-4xl sm:text-5xl mb-4">⚠️</div>
          <p className="text-slate-700 dark:text-slate-300 text-sm sm:text-base">
            Anda harus login untuk mengakses halaman ini
          </p>
        </div>
      </div>
    );
  }

  const stats = getGradeStats();

  return (
    <div className="min-h-screen">
      {/* Loading Overlay */}
      {loading && loadingMessage && <LoadingOverlay message={loadingMessage} />}

      <div>
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/30 border border-slate-200 dark:border-gray-700 p-4 sm:p-6 mb-4 sm:mb-6">
          {/* Message */}
          {message && (
            <div
              className={`mt-3 sm:mt-4 p-3 sm:p-3.5 rounded-lg text-sm sm:text-base ${
                message.includes("Error") || message.includes("Gagal")
                  ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700"
                  : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700"
              }`}
            >
              {message}
            </div>
          )}

          {/* ✅ TAMBAH READ-ONLY MODE WARNING INI */}
          {isReadOnlyMode && (
            <div className="mt-3 sm:mt-4 bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-400 dark:border-yellow-600 rounded-xl p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="text-2xl sm:text-3xl">🔒</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-1 text-sm sm:text-base">
                    Mode View Only (Read-Only)
                  </h3>
                  <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-400 leading-relaxed">
                    Semester ini tidak aktif. Anda hanya bisa melihat data, tidak bisa input atau
                    edit nilai. Untuk input data baru, pilih semester yang aktif.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-4 sm:mt-6">
            {/* ✅ FIXED: DROPDOWN SEMESTER YANG BENAR */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <GraduationCap className="w-3 h-3 sm:w-3.5 sm:h-3.5 inline mr-1.5" />
                Semester
              </label>
              <select
                value={selectedSemesterId || ""}
                onChange={(e) => handleSemesterChange(e.target.value)}
                className={`w-full p-3 sm:p-3.5 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 transition-colors ${
                  isReadOnlyMode
                    ? "border-yellow-300 dark:border-yellow-700"
                    : "border-slate-300 dark:border-gray-600"
                }`}
                disabled={availableSemesters.length === 0 || loading}
                style={{ minHeight: "44px", touchAction: "manipulation" }}
              >
                <option value="" className="dark:bg-gray-700">
                  {availableSemesters.length === 0 ? "Loading semester..." : "Pilih Semester"}
                </option>
                {availableSemesters.map((sem) => (
                  <option
                    key={sem.id}
                    value={sem.id}
                    className={`dark:bg-gray-700 dark:text-slate-100 ${
                      sem.is_active ? "font-semibold" : ""
                    }`}
                  >
                    {sem.semester === 1 ? "Semester Ganjil" : "Semester Genap"}
                    {sem.is_active ? " (Aktif)" : ""}
                  </option>
                ))}
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
                className="w-full p-3 sm:p-3.5 text-sm sm:text-base border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 transition-colors disabled:bg-slate-50 dark:disabled:bg-gray-800/50 disabled:text-slate-500 dark:disabled:text-slate-400 disabled:cursor-not-allowed"
                disabled={loading || !selectedSemesterId || subjects.length === 0 || isReadOnlyMode}
                style={{ minHeight: "44px", touchAction: "manipulation" }}
              >
                <option value="" className="dark:bg-gray-700">
                  {!selectedSemesterId
                    ? "Pilih semester dulu"
                    : subjects.length === 0
                    ? "Tidak ada mata pelajaran"
                    : "Pilih Mata Pelajaran"}
                </option>
                {subjects.map((subject, index) => (
                  <option
                    key={index}
                    value={subject}
                    className="dark:bg-gray-700 dark:text-slate-100"
                  >
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
                className="w-full p-3 sm:p-3.5 text-sm sm:text-base border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 transition-colors disabled:bg-slate-50 dark:disabled:bg-gray-800/50 disabled:text-slate-500 dark:disabled:text-slate-400 disabled:cursor-not-allowed"
                disabled={!selectedSubject || loading || classes.length === 0 || isReadOnlyMode}
                style={{ minHeight: "44px", touchAction: "manipulation" }}
              >
                <option value="" className="dark:bg-gray-700">
                  {!selectedSubject
                    ? "Pilih mata pelajaran dulu"
                    : classes.length === 0
                    ? "Tidak ada kelas"
                    : "Pilih Kelas"}
                </option>
                {classes.map((cls) => (
                  <option
                    key={cls.id}
                    value={cls.id}
                    className="dark:bg-gray-700 dark:text-slate-100"
                  >
                    {cls.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {selectedClass && selectedSubject && selectedSemesterId && students.length > 0 && (
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
        {selectedClass && selectedSubject && selectedSemesterId && students.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/30 border border-slate-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 sm:p-5 md:p-6 border-b border-slate-200 dark:border-gray-700">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
                <div>
                  <h2 className="text-base sm:text-lg md:text-xl font-semibold text-slate-800 dark:text-slate-100">
                    Daftar Nilai - {classes.find((c) => c.id === selectedClass)?.displayName}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {selectedSubject} • {selectedSemesterInfo?.year} • Semester{" "}
                    {selectedSemesterInfo?.semester}
                    {isReadOnlyMode && " • 🔒 View Only"}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-row gap-2 sm:gap-3">
                  <button
                    onClick={saveGrades}
                    disabled={loading || students.length === 0 || isReadOnlyMode}
                    className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 disabled:bg-gray-400 dark:disabled:bg-gray-700 text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-lg font-medium transition-colors active:scale-[0.98] text-sm sm:text-base"
                    style={{
                      minHeight: "44px",
                      touchAction: "manipulation",
                    }}
                  >
                    <Save className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                    <span className="hidden sm:inline">
                      {loading ? "Menyimpan..." : isReadOnlyMode ? "🔒 View Only" : "Simpan Nilai"}
                    </span>
                  </button>

                  <button
                    onClick={handleExport}
                    disabled={loading || students.length === 0}
                    className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 disabled:bg-gray-400 dark:disabled:bg-gray-700 text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-lg font-medium transition-colors active:scale-[0.98] text-sm sm:text-base"
                    title="Export data nilai ke Excel"
                    style={{
                      minHeight: "44px",
                      touchAction: "manipulation",
                    }}
                  >
                    <Download className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                    <span className="hidden sm:inline">Export Excel</span>
                    <span className="sm:hidden">Export</span>
                  </button>

                  <label
                    className={`flex items-center justify-center gap-2 ${
                      loading || students.length === 0 || isReadOnlyMode
                        ? "bg-gray-400 dark:bg-gray-700 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 cursor-pointer"
                    } text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-lg font-medium transition-colors active:scale-[0.98] text-sm sm:text-base`}
                    title="Import nilai dari file Excel"
                    style={{
                      minHeight: "44px",
                      touchAction: "manipulation",
                    }}
                  >
                    <Upload className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                    <span className="hidden sm:inline">Import Excel</span>
                    <span className="sm:hidden">Import</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleImport}
                      disabled={loading || students.length === 0 || isReadOnlyMode}
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
                    className="border-b border-slate-100 dark:border-gray-700 p-4"
                  >
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
                            onChange={(e) => updateGrade(student.id, "NH1", e.target.value)}
                            className="w-full p-3 text-sm text-center border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 transition-colors"
                            placeholder="0"
                            disabled={loading || isReadOnlyMode}
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
                            onChange={(e) => updateGrade(student.id, "NH2", e.target.value)}
                            className="w-full p-3 text-sm text-center border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 transition-colors"
                            placeholder="0"
                            disabled={loading || isReadOnlyMode}
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
                            onChange={(e) => updateGrade(student.id, "NH3", e.target.value)}
                            className="w-full p-3 text-sm text-center border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 transition-colors"
                            placeholder="0"
                            disabled={loading || isReadOnlyMode}
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
                            onChange={(e) => updateGrade(student.id, "PSTS", e.target.value)}
                            className="w-full p-3 text-sm text-center border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 transition-colors"
                            placeholder="0"
                            disabled={loading || isReadOnlyMode}
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
                            onChange={(e) => updateGrade(student.id, "PSAS", e.target.value)}
                            className="w-full p-3 text-sm text-center border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 transition-colors"
                            placeholder="0"
                            disabled={loading || isReadOnlyMode}
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
                      <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-gray-700/50">
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
                              onChange={(e) => updateGrade(student.id, type, e.target.value)}
                              className={`w-24 p-2.5 text-center text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors ${
                                loading || isReadOnlyMode
                                  ? "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600"
                                  : "bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-gray-600"
                              }`}
                              placeholder="0"
                              disabled={loading || isReadOnlyMode}
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
          selectedSemesterId &&
          students.length === 0 &&
          !loading && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/30 border border-slate-200 dark:border-gray-700 p-6 sm:p-8 md:p-12 text-center">
              <Users className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-slate-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg md:text-xl font-medium text-slate-500 dark:text-slate-400 mb-2">
                Tidak ada siswa aktif
              </h3>
              <p className="text-sm sm:text-base text-slate-400 dark:text-slate-500">
                Tidak ada siswa aktif di kelas ini untuk {selectedSemesterInfo?.year} Semester{" "}
                {selectedSemesterInfo?.semester}
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
              Tidak ada kelas untuk {selectedSubject} di semester ini
            </p>
          </div>
        )}

        {(!selectedClass || !selectedSubject || !selectedSemesterId) && (
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
