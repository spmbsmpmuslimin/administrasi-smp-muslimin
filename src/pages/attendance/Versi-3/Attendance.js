//[file name]: Attendance.js
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import AttendanceFilters from "./AttendanceFilters";
import AttendanceStats from "./AttendanceStats";
import AttendanceTable from "./AttendanceTable";
import AttendanceModals from "./AttendanceModals";
import { exportAttendanceFromComponent, exportSemesterRecapFromComponent } from "./AttendanceExcel";
import { getActiveAcademicInfo, filterBySemester } from "../../services/academicYearService";

// ✅ UTILITY FUNCTIONS - PERBAIKAN DATE HANDLING
const getDefaultDate = () => {
  const now = new Date();
  const wibOffset = 7 * 60;
  const localOffset = now.getTimezoneOffset();
  const wibTime = new Date(now.getTime() + (wibOffset + localOffset) * 60000);

  const year = wibTime.getFullYear();
  const month = String(wibTime.getMonth() + 1).padStart(2, "0");
  const day = String(wibTime.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getTodayWIB = () => {
  const now = new Date();
  const wibOffset = 7 * 60;
  const localOffset = now.getTimezoneOffset();
  const wibTime = new Date(now.getTime() + (wibOffset + localOffset) * 60000);

  wibTime.setHours(0, 0, 0, 0);
  return wibTime;
};

const parseDate = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

const Attendance = ({ user, onShowToast }) => {
  // ========== STATE MANAGEMENT ==========
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [date, setDate] = useState(getDefaultDate());
  const [students, setStudents] = useState([]);
  const [attendanceStatus, setAttendanceStatus] = useState({});
  const [attendanceNotes, setAttendanceNotes] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // ✅ HAPUS AUTH-RELATED STATE YANG SUDAH DIHANDLE DI ATTENDANCEMAIN
  const [teacherId, setTeacherId] = useState(null);
  const [isHomeroomTeacher, setIsHomeroomTeacher] = useState(false);
  const [homeroomClass, setHomeroomClass] = useState(null);

  const [showRekapModal, setShowRekapModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [existingAttendanceData, setExistingAttendanceData] = useState(null);
  const [pendingAttendanceData, setPendingAttendanceData] = useState(null);
  const [studentsLoaded, setStudentsLoaded] = useState(false);

  // ✅ TAMBAH STATE UNTUK SELECTED SEMESTER
  const [activeAcademicInfo, setActiveAcademicInfo] = useState(null);
  const [selectedSemesterId, setSelectedSemesterId] = useState(null);
  const [availableSemesters, setAvailableSemesters] = useState([]);
  const [isReadOnlyMode, setIsReadOnlyMode] = useState(false);

  // ========== UTILITY FUNCTIONS ==========
  const isHomeroomDaily = useCallback(() => {
    return selectedSubject && selectedSubject.includes("PRESENSI HARIAN");
  }, [selectedSubject]);

  const filteredStudents = students.filter(
    (student) =>
      student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.nis.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ========== CORE HANDLERS ==========
  const setAllHadir = () => {
    if (students.length === 0) {
      onShowToast?.("Tidak ada siswa untuk diset hadir", "error");
      return;
    }

    const newStatus = {};
    students.forEach((student) => {
      newStatus[student.id] = "Hadir";
    });
    setAttendanceStatus(newStatus);
    onShowToast?.(`Berhasil mengubah status ${students.length} siswa menjadi HADIR`, "success");
  };

  const handleExportMonthly = async () => {
    if (students.length === 0) {
      onShowToast?.("Tidak ada data siswa untuk diekspor", "error");
      return;
    }

    if (!selectedClass || !selectedSubject) {
      onShowToast?.("Pilih kelas dan mata pelajaran terlebih dahulu!", "error");
      return;
    }

    if (!selectedSemesterId) {
      onShowToast?.("Pilih semester terlebih dahulu!", "error");
      return;
    }

    try {
      const currentSemester = availableSemesters.find((s) => s.id === selectedSemesterId);

      await exportAttendanceFromComponent({
        students: students,
        selectedClass: selectedClass,
        selectedSubject: selectedSubject,
        date: date,
        attendanceStatus: attendanceStatus,
        attendanceNotes: attendanceNotes,
        onShowToast: onShowToast,
        teacherName: user?.full_name || user?.username,
        homeroomClass: homeroomClass,
        semesterId: selectedSemesterId,
        academicYear: currentSemester?.year || activeAcademicInfo?.year,
        semester: currentSemester?.semester || activeAcademicInfo?.activeSemester,
      });
    } catch (error) {
      onShowToast?.("Gagal mengekspor data: " + error.message, "error");
    }
  };

  const handleExportSemester = async () => {
    if (!selectedClass || !selectedSubject || students.length === 0) {
      onShowToast?.(
        "Pilih mata pelajaran dan kelas terlebih dahulu untuk export semester",
        "error"
      );
      return;
    }

    if (!selectedSemesterId) {
      onShowToast?.("Pilih semester terlebih dahulu!", "error");
      return;
    }

    try {
      const currentSemester = availableSemesters.find((s) => s.id === selectedSemesterId);

      await exportSemesterRecapFromComponent({
        classId: selectedClass,
        studentsData: students,
        subject: isHomeroomDaily() ? "Harian" : selectedSubject,
        type: isHomeroomDaily() ? "harian" : "mapel",
        currentUser: user,
        homeroomClass: homeroomClass,
        onShowToast: onShowToast,
        semesterId: selectedSemesterId,
        semester: currentSemester?.semester || activeAcademicInfo?.activeSemester,
        academicYear: currentSemester?.year || activeAcademicInfo?.year,
      });
    } catch (error) {
      onShowToast?.("Gagal mengekspor semester: " + error.message, "error");
    }
  };

  const handleShowRekap = () => {
    if (!selectedClass || !selectedSubject || students.length === 0) {
      onShowToast?.("Pilih mata pelajaran dan kelas terlebih dahulu untuk melihat rekap", "error");
      return;
    }
    setShowRekapModal(true);
  };

  // ========== DATA FETCHING EFFECTS ==========
  // ✅ HAPUS REAL-TIME SUBSCRIPTION JIKA TIDAK DIPERLUKAN
  // Atau bisa dipindahkan ke AttendanceMain.js jika diperlukan

  // ✅ EFFECT UNTUK LOAD ACTIVE ACADEMIC INFO
  useEffect(() => {
    const loadActiveAcademicInfo = async () => {
      try {
        const info = await getActiveAcademicInfo();
        setActiveAcademicInfo(info);

        if (info && info.activeSemesterId) {
          setSelectedSemesterId(info.activeSemesterId);
          setAvailableSemesters(info.availableSemesters || []);
          setIsReadOnlyMode(false);
        }
      } catch (error) {
        console.error("❌ Error loading active academic info:", error);
      }
    };

    loadActiveAcademicInfo();
  }, []);

  // ✅ EFFECT UNTUK LOAD TEACHER DATA (DIPINDAHKAN DARI AUTH CHECK)
  useEffect(() => {
    const loadTeacherData = async () => {
      if (!user || user.role === "admin") return;

      try {
        const { data: teacherData, error } = await supabase
          .from("users")
          .select("teacher_id, homeroom_class_id")
          .eq("username", user.username)
          .single();

        if (error) {
          console.error("Error fetching teacher data:", error);
          return;
        }

        if (teacherData) {
          setTeacherId(teacherData.teacher_id);
          if (teacherData.homeroom_class_id) {
            setIsHomeroomTeacher(true);
            setHomeroomClass(teacherData.homeroom_class_id);
          }
        }
      } catch (error) {
        console.error("Error loading teacher data:", error);
      }
    };

    loadTeacherData();
  }, [user]);

  // ✅ HANDLE SEMESTER CHANGE
  const handleSemesterChange = (semesterId) => {
    setSelectedSemesterId(semesterId);

    const selectedSemester = availableSemesters.find((s) => s.id === semesterId);
    const isActive = selectedSemester?.is_active || false;

    setIsReadOnlyMode(!isActive);

    // Reset data ketika ganti semester
    setClasses([]);
    setSelectedClass("");
    setStudents([]);
    setStudentsLoaded(false);

    if (selectedSemester) {
      const mode = isActive ? "Input Mode" : "View Only Mode";
      onShowToast?.(
        `Switched to ${selectedSemester.year} - Semester ${selectedSemester.semester} (${mode})`,
        isActive ? "info" : "warning"
      );
    }
  };

  // ✅ FUNCTION VALIDASI TANGGAL
  const validateDate = () => {
    if (!selectedSemesterId || !date) return { valid: true };

    const selectedSemester = availableSemesters.find((s) => s.id === selectedSemesterId);
    if (!selectedSemester) {
      return { valid: false, message: "Semester tidak valid" };
    }

    const inputDate = parseDate(date);
    const today = getTodayWIB();

    // Parse semester dates
    const startDate = parseDate(selectedSemester.start_date);
    const endDate = parseDate(selectedSemester.end_date);

    // ✅ VALIDASI 1: Tanggal tidak boleh masa depan
    if (inputDate > today) {
      return {
        valid: false,
        message: "❌ Tidak bisa input presensi untuk tanggal masa depan!",
      };
    }

    // ✅ VALIDASI 2: Tanggal harus dalam range semester
    if (inputDate < startDate || inputDate > endDate) {
      const semesterName =
        selectedSemester.semester === 1 ? "Ganjil (Juli-Desember)" : "Genap (Januari-Juni)";
      return {
        valid: false,
        message: `❌ Tanggal harus dalam periode ${selectedSemester.year} Semester ${semesterName}`,
      };
    }

    // ✅ VALIDASI 3: Hanya semester aktif yang bisa input
    if (!selectedSemester.is_active) {
      return {
        valid: false,
        message: "❌ Hanya semester aktif yang bisa input presensi baru!",
      };
    }

    return { valid: true };
  };

  useEffect(() => {
    const fetchSubjects = async () => {
      if (user?.role === "admin") return;
      if (!teacherId) return;
      if (!selectedSemesterId) return;

      try {
        let query = supabase
          .from("teacher_assignments")
          .select("subject")
          .eq("teacher_id", teacherId);

        query = filterBySemester(query, selectedSemesterId);

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching subjects:", error);
          return;
        }

        const uniqueSubjects = [...new Set(data.map((item) => item.subject))];

        if (isHomeroomTeacher && homeroomClass) {
          uniqueSubjects.push(`PRESENSI HARIAN KELAS ${homeroomClass}`);
        }

        setSubjects(uniqueSubjects);
      } catch (error) {
        console.error("Error in fetchSubjects:", error);
      }
    };

    fetchSubjects();
  }, [teacherId, isHomeroomTeacher, homeroomClass, user, selectedSemesterId]);

  useEffect(() => {
    const fetchClasses = async () => {
      if (user?.role === "admin") return;
      if (!selectedSubject || !teacherId) {
        setClasses([]);
        return;
      }

      try {
        const isDailyMode = selectedSubject.includes("PRESENSI HARIAN");

        if (isDailyMode) {
          if (!homeroomClass) return;

          const formattedClasses = [
            {
              id: homeroomClass,
              grade: homeroomClass.charAt(0),
              displayName: `Kelas ${homeroomClass}`,
            },
          ];

          setClasses(formattedClasses);
          setSelectedClass(homeroomClass);

          setLoading(true);
          const { data: studentsData, error } = await supabase
            .from("students")
            .select("id, full_name, nis")
            .eq("class_id", homeroomClass)
            .eq("is_active", true)
            .order("full_name");

          if (error) {
            console.error("Error fetching students:", error);
          } else {
            setStudents(studentsData || []);
            setStudentsLoaded(true);

            const newStatus = {};
            studentsData?.forEach((student) => {
              newStatus[student.id] = "Hadir";
            });
            setAttendanceStatus(newStatus);
          }
          setLoading(false);
          return;
        }

        if (!selectedSemesterId) {
          setClasses([]);
          return;
        }

        let query = supabase
          .from("teacher_assignments")
          .select("class_id")
          .eq("teacher_id", teacherId)
          .eq("subject", selectedSubject);

        query = filterBySemester(query, selectedSemesterId);

        const { data: assignmentData, error: assignmentError } = await query;

        if (assignmentError) {
          console.error("Assignment error:", assignmentError);
          throw assignmentError;
        }

        if (!assignmentData?.length) {
          setClasses([]);
          return;
        }

        const classIds = assignmentData.map((item) => item.class_id);
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

        setClasses(formattedClasses);
        setSelectedClass("");
        setStudents([]);
        setStudentsLoaded(false);
      } catch (error) {
        console.error("Error fetching classes:", error);
      }
    };

    fetchClasses();
  }, [
    selectedSubject,
    teacherId,
    isHomeroomTeacher,
    homeroomClass,
    user,
    selectedSemesterId,
    availableSemesters,
  ]);

  useEffect(() => {
    if (selectedClass && !isHomeroomDaily()) {
      fetchStudentsForClass(selectedClass);
    }
  }, [selectedClass]);

  // ========== FETCH ATTENDANCE WHEN DATE/CLASS/SUBJECT CHANGES ==========
  useEffect(() => {
    if (
      students.length > 0 &&
      studentsLoaded &&
      selectedClass &&
      date &&
      selectedSubject &&
      selectedSemesterId
    ) {
      fetchExistingAttendance();
    }
  }, [date, selectedClass, selectedSubject, students, studentsLoaded, selectedSemesterId]);

  const fetchStudentsForClass = async (classId) => {
    if (!classId) {
      setStudents([]);
      return;
    }

    try {
      setLoading(true);
      const { data: studentsData, error } = await supabase
        .from("students")
        .select("id, full_name, nis")
        .eq("class_id", classId)
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;

      setStudents(studentsData || []);
      setStudentsLoaded(true);

      const newStatus = {};
      studentsData.forEach((student) => {
        newStatus[student.id] = "Hadir";
      });
      setAttendanceStatus(newStatus);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingAttendance = async () => {
    if (!selectedClass || !date || !selectedSubject || !teacherId || !selectedSemesterId) {
      return;
    }

    try {
      setLoading(true);

      // Get teacher UUID
      const { data: teacherUser, error: teacherError } = await supabase
        .from("users")
        .select("id")
        .eq("teacher_id", teacherId)
        .single();

      if (teacherError || !teacherUser) {
        console.error("Error fetching teacher UUID:", teacherError);
        return;
      }

      const teacherUUID = teacherUser.id;
      const typeValue = isHomeroomDaily() ? "harian" : "mapel";

      // Fetch attendance data
      let query = supabase
        .from("attendances")
        .select("student_id, status, notes")
        .eq("teacher_id", teacherUUID)
        .eq("date", date)
        .eq("type", typeValue)
        .eq("class_id", selectedClass);

      query = filterBySemester(query, selectedSemesterId);

      const { data: attendanceData, error: attendanceError } = await query;

      if (attendanceError) {
        console.error("Error fetching attendance:", attendanceError);
        return;
      }

      if (attendanceData && attendanceData.length > 0) {
        const statusMap = {};
        const notesMap = {};

        attendanceData.forEach((record) => {
          statusMap[record.student_id] = record.status;
          if (record.notes) {
            notesMap[record.student_id] = record.notes;
          }
        });

        setAttendanceStatus(statusMap);
        setAttendanceNotes(notesMap);
      } else {
        const defaultStatus = {};
        students.forEach((student) => {
          defaultStatus[student.id] = "Hadir";
        });
        setAttendanceStatus(defaultStatus);
        setAttendanceNotes({});
      }
    } catch (error) {
      console.error("Error in fetchExistingAttendance:", error);
    } finally {
      setLoading(false);
    }
  };

  // ========== ATTENDANCE PROCESSING ==========
  const handleStatusChange = (studentId, status) => {
    setAttendanceStatus((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleNotesChange = (studentId, notes) => {
    setAttendanceNotes((prev) => ({ ...prev, [studentId]: notes }));
  };

  const checkExistingAttendance = async (teacherUUID, typeValue) => {
    try {
      let query = supabase
        .from("attendances")
        .select("id, student_id, status, notes")
        .eq("teacher_id", teacherUUID)
        .eq("date", date)
        .eq("type", typeValue)
        .eq("class_id", selectedClass)
        .in(
          "student_id",
          students.map((s) => s.id)
        );

      if (selectedSemesterId) {
        query = filterBySemester(query, selectedSemesterId);
      }

      const { data: existingData, error } = await query;

      if (error) {
        console.error("Error checking existing attendance:", error);
        return null;
      }

      return existingData || [];
    } catch (error) {
      console.error("Error in checkExistingAttendance:", error);
      return null;
    }
  };

  const prepareAttendanceData = (teacherUUID) => {
    const subjectValue = isHomeroomDaily() ? "Harian" : selectedSubject;
    const typeValue = isHomeroomDaily() ? "harian" : "mapel";
    const currentSemester = availableSemesters.find((s) => s.id === selectedSemesterId);

    return students.map((student) => ({
      student_id: student.id,
      teacher_id: teacherUUID,
      date: date,
      subject: subjectValue,
      class_id: selectedClass,
      type: typeValue,
      status: attendanceStatus[student.id] || "Hadir",
      notes: attendanceNotes[student.id] || null,
      academic_year_id: selectedSemesterId,
      semester: currentSemester?.semester || 1,
    }));
  };

  const deleteExistingAttendance = async (teacherUUID, typeValue) => {
    try {
      let query = supabase
        .from("attendances")
        .delete()
        .eq("teacher_id", teacherUUID)
        .eq("date", date)
        .eq("type", typeValue)
        .eq("class_id", selectedClass);

      if (selectedSemesterId) {
        query = filterBySemester(query, selectedSemesterId);
      }

      const { error } = await query;

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error deleting existing attendance:", error);
      throw error;
    }
  };

  const saveAttendanceData = async (attendanceData) => {
    const BATCH_SIZE = 5;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < attendanceData.length; i += BATCH_SIZE) {
      const batch = attendanceData.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from("attendances").insert(batch);

      if (error) {
        console.error(`Error inserting batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
      }
    }

    return { successCount, errorCount };
  };

  const processAttendanceSubmission = async () => {
    const dateValidation = validateDate();
    if (!dateValidation.valid) {
      onShowToast?.(dateValidation.message, "error");
      return;
    }

    if (isReadOnlyMode) {
      onShowToast?.(
        "🔒 Semester ini dalam mode View Only. Ganti ke semester aktif untuk input data baru!",
        "error"
      );
      return;
    }

    if (!teacherId || !selectedSubject || !selectedClass) {
      onShowToast?.("Pilih mata pelajaran dan kelas terlebih dahulu!", "error");
      return;
    }

    if (!selectedSemesterId) {
      onShowToast?.("Tidak ada semester yang dipilih!", "error");
      return;
    }

    if (students.length === 0) {
      onShowToast?.("Tidak ada siswa untuk diabsen!", "error");
      return;
    }

    setLoading(true);

    try {
      const { data: teacherUser, error: teacherError } = await supabase
        .from("users")
        .select("id")
        .eq("teacher_id", teacherId)
        .single();

      if (teacherError) throw new Error("Gagal mengambil data guru: " + teacherError.message);
      if (!teacherUser) throw new Error("Data guru tidak ditemukan di sistem");

      const teacherUUID = teacherUser.id;
      const typeValue = isHomeroomDaily() ? "harian" : "mapel";

      const existingData = await checkExistingAttendance(teacherUUID, typeValue);

      if (existingData && existingData.length > 0) {
        const attendanceData = prepareAttendanceData(teacherUUID);
        setPendingAttendanceData(attendanceData);
        setExistingAttendanceData(existingData);
        setShowConfirmModal(true);
        setLoading(false);
        return;
      }

      const attendanceData = prepareAttendanceData(teacherUUID);
      const { successCount, errorCount } = await saveAttendanceData(attendanceData);

      if (errorCount > 0) {
        throw new Error(`Berhasil menyimpan ${successCount} data, gagal ${errorCount} data.`);
      }

      handleSaveSuccess(successCount);
    } catch (error) {
      console.error("Error saving attendance:", error);
      onShowToast?.("Gagal menyimpan presensi: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOverwriteConfirmation = async () => {
    setLoading(true);
    setShowConfirmModal(false);

    try {
      const { data: teacherUser, error: teacherError } = await supabase
        .from("users")
        .select("id")
        .eq("teacher_id", teacherId)
        .single();

      if (teacherError) throw new Error("Gagal mengambil data guru: " + teacherError.message);
      if (!teacherUser) throw new Error("Data guru tidak ditemukan di sistem");

      const teacherUUID = teacherUser.id;
      const typeValue = isHomeroomDaily() ? "harian" : "mapel";

      await deleteExistingAttendance(teacherUUID, typeValue);
      const { successCount, errorCount } = await saveAttendanceData(pendingAttendanceData);

      if (errorCount > 0) {
        throw new Error(`Berhasil menyimpan ${successCount} data, gagal ${errorCount} data.`);
      }

      handleSaveSuccess(successCount);
    } catch (error) {
      console.error("Error overwriting attendance:", error);
      onShowToast?.("Gagal menimpa presensi: " + error.message, "error");
    } finally {
      setLoading(false);
      setPendingAttendanceData(null);
      setExistingAttendanceData(null);
    }
  };

  const handleCancelOverwrite = () => {
    setShowConfirmModal(false);
    setPendingAttendanceData(null);
    setExistingAttendanceData(null);
    onShowToast?.("Penyimpanan dibatalkan", "info");
  };

  const handleSaveSuccess = (successCount) => {
    const currentSemester = availableSemesters.find((s) => s.id === selectedSemesterId);

    onShowToast?.(
      `Presensi berhasil disimpan untuk ${successCount} siswa pada ${
        isHomeroomDaily() ? "presensi harian" : selectedSubject
      } tanggal ${date}${
        currentSemester ? ` (${currentSemester.year} - Semester ${currentSemester.semester})` : ""
      }`,
      "success"
    );

    const newStatus = {};
    students.forEach((student) => {
      newStatus[student.id] = "Hadir";
    });
    setAttendanceStatus(newStatus);
    setAttendanceNotes({});
  };

  // ========== RENDER LOGIC ==========
  // ✅ SEMUA AUTH & LOGIN CHECK SUDAH DIHANDLE DI ATTENDANCEMAIN.JS

  return (
    <div className="space-y-6">
      {/* ✅ READ-ONLY MODE WARNING */}
      {isReadOnlyMode && (
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/10 border-2 border-amber-300 dark:border-amber-600 rounded-2xl p-5 shadow-sm transition-colors duration-200">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center">
              <span className="text-2xl">🔒</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-amber-800 dark:text-amber-300 mb-2">
                Mode View Only (Read-Only)
              </h3>
              <p className="text-amber-700 dark:text-amber-400 leading-relaxed">
                Semester ini tidak aktif. Anda hanya bisa{" "}
                <strong>melihat data, export, dan rekap</strong>. Untuk input presensi baru, pilih
                semester yang sedang aktif.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ✅ SECTION 1: STATS */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span>📊</span>
          Ringkasan Kehadiran
        </h3>
        {students.length > 0 ? (
          <AttendanceStats attendanceStatus={attendanceStatus} students={students} />
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-2">📊</div>
            <p className="font-medium">Pilih kelas dan mata pelajaran untuk melihat statistik</p>
          </div>
        )}
      </div>

      {/* ✅ SECTION 2: FILTERS */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span>🎯</span>
          Filter & Kontrol
        </h3>
        <AttendanceFilters
          subjects={subjects}
          selectedSubject={selectedSubject}
          setSelectedSubject={setSelectedSubject}
          classes={classes}
          selectedClass={selectedClass}
          setSelectedClass={setSelectedClass}
          date={date}
          setDate={setDate}
          loading={loading}
          teacherId={teacherId}
          isHomeroomDaily={isHomeroomDaily}
          setStudents={setStudents}
          setStudentsLoaded={setStudentsLoaded}
          activeAcademicInfo={activeAcademicInfo}
          selectedSemesterId={selectedSemesterId}
          availableSemesters={availableSemesters}
          onSemesterChange={handleSemesterChange}
          isReadOnlyMode={isReadOnlyMode}
        />
      </div>

      {/* ✅ SECTION 3: SEARCH & ACTION BUTTONS */}
      {students.length > 0 && (
        <>
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Cari siswa (nama/NIS)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3.5 sm:py-3 text-base border-2 border-blue-200 dark:border-blue-700 rounded-xl focus:ring-3 focus:ring-blue-500/30 dark:focus:ring-blue-500/50 focus:border-blue-500 dark:focus:border-blue-500 transition-all duration-200 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 shadow-sm"
              />
              <span className="absolute right-4 top-3.5 text-blue-500 dark:text-blue-400 text-xl">
                🔍
              </span>
            </div>

            <div className="flex flex-wrap gap-3 w-full sm:w-auto">
              <button
                className="flex-1 sm:flex-none min-h-[52px] px-5 py-3 text-base font-medium bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-2 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-xl hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-800/40 dark:hover:to-blue-700/40 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                onClick={setAllHadir}
                disabled={loading || isReadOnlyMode}
                title={isReadOnlyMode ? "Tidak bisa edit di semester non-aktif" : ""}
                style={{ minWidth: "140px" }}
              >
                ✅ Hadir Semua
              </button>

              <button
                className={`flex-1 sm:flex-none min-h-[52px] px-5 py-3 text-base font-semibold rounded-xl active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${
                  isReadOnlyMode
                    ? "bg-gradient-to-r from-gray-400 to-gray-500 dark:from-gray-600 dark:to-gray-700 border-2 border-gray-400 dark:border-gray-600 text-white"
                    : "bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 border-2 border-emerald-500 dark:border-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 dark:hover:from-emerald-700 dark:hover:to-emerald-800"
                }`}
                onClick={processAttendanceSubmission}
                disabled={
                  loading ||
                  !selectedSubject ||
                  !selectedClass ||
                  !selectedSemesterId ||
                  students.length === 0 ||
                  isReadOnlyMode
                }
                title={isReadOnlyMode ? "Tidak bisa input di semester non-aktif" : ""}
                style={{ minWidth: "180px" }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                    Menyimpan...
                  </span>
                ) : isReadOnlyMode ? (
                  "🔒 View Only Mode"
                ) : (
                  "💾 Simpan Presensi"
                )}
              </button>

              <button
                className="flex-1 sm:flex-none min-h-[52px] px-5 py-3 text-base font-medium bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border-2 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 rounded-xl hover:from-purple-100 hover:to-purple-200 dark:hover:from-purple-800/40 dark:hover:to-purple-700/40 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                onClick={handleShowRekap}
                disabled={!selectedClass || !selectedSubject || students.length === 0}
                style={{ minWidth: "140px" }}
              >
                📊 Lihat Rekap
              </button>

              <button
                className="flex-1 sm:flex-none min-h-[52px] px-5 py-3 text-base font-medium bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border-2 border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300 rounded-xl hover:from-orange-100 hover:to-orange-200 dark:hover:from-orange-800/40 dark:hover:to-orange-700/40 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                onClick={handleExportMonthly}
                disabled={students.length === 0}
                style={{ minWidth: "160px" }}
              >
                📅 Export Bulanan
              </button>

              <button
                className="flex-1 sm:flex-none min-h-[52px] px-5 py-3 text-base font-medium bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30 border-2 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 rounded-xl hover:from-indigo-100 hover:to-indigo-200 dark:hover:from-indigo-800/40 dark:hover:to-indigo-700/40 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                onClick={handleExportSemester}
                disabled={!selectedClass || !selectedSubject || students.length === 0}
                style={{ minWidth: "160px" }}
              >
                📚 Export Semester
              </button>
            </div>
          </div>

          {/* ✅ SECTION 4: TABLE */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span>📋</span>
              Daftar Siswa
            </h3>
            <AttendanceTable
              filteredStudents={filteredStudents}
              classes={classes}
              selectedClass={selectedClass}
              searchTerm={searchTerm}
              attendanceStatus={attendanceStatus}
              attendanceNotes={attendanceNotes}
              loading={loading}
              handleStatusChange={handleStatusChange}
              handleNotesChange={handleNotesChange}
            />
          </div>
        </>
      )}

      {/* ✅ EMPTY STATES */}
      {selectedClass && students.length === 0 && !loading && (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 text-center transition-colors duration-200">
          <div className="text-5xl mb-4 text-slate-300 dark:text-slate-600">📝</div>
          <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">
            Tidak ada siswa aktif di kelas ini
          </p>
        </div>
      )}

      {!selectedClass && selectedSubject && classes.length === 0 && !isHomeroomDaily() && (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 text-center transition-colors duration-200">
          <div className="text-5xl mb-4 text-slate-300 dark:text-slate-600">🏫</div>
          <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">
            {selectedSemesterId
              ? `Tidak ada kelas untuk "${selectedSubject}" di semester yang dipilih`
              : "Pilih semester terlebih dahulu"}
          </p>
        </div>
      )}

      {!selectedSubject && (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 text-center transition-colors duration-200">
          <div className="text-5xl mb-4 text-slate-300 dark:text-slate-600">📚</div>
          <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">
            Pilih mata pelajaran untuk memulai
          </p>
        </div>
      )}

      {/* ✅ MODALS COMPONENT */}
      <AttendanceModals
        showRekapModal={showRekapModal}
        setShowRekapModal={setShowRekapModal}
        showConfirmModal={showConfirmModal}
        setShowConfirmModal={setShowConfirmModal}
        selectedClass={selectedClass}
        selectedSubject={selectedSubject}
        homeroomClass={homeroomClass}
        students={students}
        onShowToast={onShowToast}
        isHomeroomDaily={isHomeroomDaily}
        existingAttendanceData={existingAttendanceData}
        pendingAttendanceData={pendingAttendanceData}
        loading={loading}
        date={date}
        handleOverwriteConfirmation={handleOverwriteConfirmation}
        handleCancelOverwrite={handleCancelOverwrite}
        activeAcademicInfo={activeAcademicInfo}
        selectedSemesterId={selectedSemesterId}
        availableSemesters={availableSemesters}
      />
    </div>
  );
};

export default Attendance;
