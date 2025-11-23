import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import AttendanceRecapModal from "./AttendanceRecapModal";
import {
  exportAttendanceToExcel,
  exportSemesterRecapFromComponent, // ✅ TAMBAHAN: Import fungsi export semester
} from "./AttendanceExcel";

const Attendance = ({ user, onShowToast }) => {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  const getDefaultDate = () => {
    const options = {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    };
    return new Intl.DateTimeFormat("en-CA", options).format(new Date());
  };

  const [date, setDate] = useState(getDefaultDate());
  const [students, setStudents] = useState([]);
  const [attendanceStatus, setAttendanceStatus] = useState({});
  const [attendanceNotes, setAttendanceNotes] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [teacherId, setTeacherId] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isHomeroomTeacher, setIsHomeroomTeacher] = useState(false);
  const [homeroomClass, setHomeroomClass] = useState(null);
  const [showRekapModal, setShowRekapModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [existingAttendanceData, setExistingAttendanceData] = useState(null);
  const [pendingAttendanceData, setPendingAttendanceData] = useState(null);
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showExportMonthlyModal, setShowExportMonthlyModal] = useState(false); // ✅ TAMBAHAN: Modal export bulanan
  const [showExportSemesterModal, setShowExportSemesterModal] = useState(false); // ✅ TAMBAHAN: Modal export semester

  const isHomeroomDaily = useCallback(() => {
    return selectedSubject && selectedSubject.includes("PRESENSI HARIAN");
  }, [selectedSubject]);

  const filteredStudents = students.filter(
    (student) =>
      student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.nis.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAttendanceStats = () => {
    const stats = { Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0 };
    Object.values(attendanceStatus).forEach((status) => {
      if (stats[status] !== undefined) stats[status]++;
    });
    return stats;
  };

  const setAllHadir = () => {
    if (students.length === 0) {
      if (onShowToast) {
        onShowToast("Tidak ada siswa untuk diset hadir", "error");
      }
      return;
    }

    const newStatus = {};
    students.forEach((student) => {
      newStatus[student.id] = "Hadir";
    });
    setAttendanceStatus(newStatus);

    if (onShowToast) {
      onShowToast(
        `Berhasil mengubah status ${students.length} siswa menjadi HADIR`,
        "success"
      );
    }
  };

  // ✅ PERBAIKAN: Handle Export Bulanan dengan Modal
  const handleExportMonthly = () => {
    if (students.length === 0) {
      if (onShowToast) {
        onShowToast("Tidak ada data siswa untuk diekspor", "error");
      }
      return;
    }
    setShowExportMonthlyModal(true);
  };

  // ✅ TAMBAHAN: Handle Export Semester dengan Modal
  const handleExportSemester = () => {
    if (!selectedClass || !selectedSubject || students.length === 0) {
      if (onShowToast) {
        onShowToast(
          "Pilih mata pelajaran dan kelas terlebih dahulu untuk export semester",
          "error"
        );
      }
      return;
    }
    setShowExportSemesterModal(true);
  };

  // ✅ TAMBAHAN: Function untuk proses export bulanan
  const processMonthlyExport = async (yearMonth) => {
    if (!yearMonth) return;

    try {
      await exportAttendanceToExcel(
        students,
        selectedClass,
        selectedSubject,
        date,
        attendanceStatus,
        attendanceNotes,
        (message) => {
          if (onShowToast) {
            onShowToast(`Ekspor Excel berhasil: ${message}`, "success");
          }
        },
        null, // selectedMonth
        user?.full_name || user?.username, // teacherName
        homeroomClass
      );
    } catch (error) {
      if (onShowToast) {
        onShowToast(
          "Gagal mengekspor data ke Excel: " + error.message,
          "error"
        );
      }
    }
  };

  // ✅ TAMBAHAN: Function untuk proses export semester
  const processSemesterExport = async (semester, year) => {
    setExportLoading(true);
    try {
      const classId = selectedClass;
      const subject = isHomeroomDaily() ? "Harian" : selectedSubject;
      const type = isHomeroomDaily() ? "harian" : "mapel";

      // Convert semester format
      const semesterNum = semester === "ganjil" ? 1 : 2;

      console.log("📊 Export Semester Data:", {
        classId,
        semester: semesterNum,
        year,
        subject,
        type,
        studentCount: students.length,
      });

      const result = await exportSemesterRecapFromComponent(
        classId,
        semesterNum,
        year,
        students,
        subject,
        type,
        user, // currentUser
        homeroomClass
      );

      if (result.success) {
        if (onShowToast) {
          onShowToast(result.message, "success");
        }
      } else {
        if (onShowToast) {
          onShowToast(result.message, "error");
        }
      }
    } catch (error) {
      console.error("Error exporting semester data:", error);
      if (onShowToast) {
        onShowToast(
          "Gagal mengekspor data semester: " + error.message,
          "error"
        );
      }
    } finally {
      setExportLoading(false);
      setShowExportSemesterModal(false);
    }
  };

  const handleNotesChange = (studentId, notes) => {
    setAttendanceNotes((prev) => ({ ...prev, [studentId]: notes }));
  };

  const handleShowRekap = () => {
    if (!selectedClass || !selectedSubject || students.length === 0) {
      if (onShowToast) {
        onShowToast(
          "Pilih mata pelajaran dan kelas terlebih dahulu untuk melihat rekap",
          "error"
        );
      }
      return;
    }
    setShowRekapModal(true);
  };

  useEffect(() => {
    if (!teacherId) return;

    const channel = supabase
      .channel(`attendance-${teacherId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "attendances",
        },
        () => {
          if (onShowToast) {
            onShowToast("Presensi Baru Ditambahkan", "info");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teacherId]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (user) {
          const { data: teacherData, error: teacherError } = await supabase
            .from("users")
            .select("teacher_id, homeroom_class_id")
            .eq("username", user.username)
            .single();

          if (teacherError) {
            console.error("Error fetching teacher data:", teacherError);
            setMessage("Error: Data guru tidak ditemukan");
          } else if (teacherData) {
            setTeacherId(teacherData.teacher_id);
            if (teacherData.homeroom_class_id) {
              setIsHomeroomTeacher(true);
              setHomeroomClass(teacherData.homeroom_class_id);
            }
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

  useEffect(() => {
    const fetchSubjects = async () => {
      if (!teacherId) return;
      try {
        const { data, error } = await supabase
          .from("teacher_assignments")
          .select("subject")
          .eq("teacher_id", teacherId);

        if (error) {
          console.error("Error fetching subjects:", error);
          setMessage("Error: Gagal mengambil mata pelajaran");
          return;
        }

        const uniqueSubjects = [...new Set(data.map((item) => item.subject))];

        if (isHomeroomTeacher && homeroomClass) {
          uniqueSubjects.push(`PRESENSI HARIAN KELAS ${homeroomClass}`);
        }

        setSubjects(uniqueSubjects);
      } catch (error) {
        console.error("Error in fetchSubjects:", error);
        setMessage("Error: Terjadi kesalahan sistem");
      }
    };

    fetchSubjects();
  }, [teacherId, isHomeroomTeacher, homeroomClass]);

  useEffect(() => {
    const fetchClasses = async () => {
      if (!selectedSubject || !teacherId) {
        setClasses([]);
        return;
      }

      setMessage("");

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
          const { data: studentsData, error: studentsError } = await supabase
            .from("students")
            .select("id, full_name, nis")
            .eq("class_id", homeroomClass)
            .eq("is_active", true)
            .order("full_name");

          if (studentsError) {
            setMessage(
              "Error: Gagal mengambil data siswa - " + studentsError.message
            );
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

        // ✅ FIX: AMBIL TAHUN AJARAN AKTIF
        const { data: activeYear } = await supabase
          .from("academic_years")
          .select("year, semester")
          .eq("is_active", true)
          .single();

        // ✅ FIX: TAMBAH FILTER TAHUN AJARAN & SEMESTER
        const { data: assignmentData, error: assignmentError } = await supabase
          .from("teacher_assignments")
          .select("class_id")
          .eq("teacher_id", teacherId)
          .eq("subject", selectedSubject)
          .eq("academic_year", activeYear?.year)
          .eq("semester", activeYear?.semester);

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
        setMessage("Error: Gagal mengambil data kelas - " + error.message);
      }
    };

    fetchClasses();
  }, [selectedSubject, teacherId, isHomeroomTeacher, homeroomClass]);

  useEffect(() => {
    if (selectedClass && !isHomeroomDaily()) {
      fetchStudentsForClass(selectedClass);
    }
  }, [selectedClass]);

  const fetchStudentsForClass = async (classId) => {
    if (!classId) {
      setStudents([]);
      return;
    }

    try {
      setLoading(true);
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, full_name, nis")
        .eq("class_id", classId)
        .eq("is_active", true)
        .order("full_name");

      if (studentsError) throw studentsError;

      setStudents(studentsData || []);
      setStudentsLoaded(true);

      const newStatus = {};
      studentsData.forEach((student) => {
        newStatus[student.id] = "Hadir";
      });
      setAttendanceStatus(newStatus);
    } catch (error) {
      console.error("Error fetching students:", error);
      setMessage("Error: Gagal mengambil data siswa - " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId, status) => {
    setAttendanceStatus((prev) => ({ ...prev, [studentId]: status }));
  };

  const checkExistingAttendance = async (teacherUUID, typeValue) => {
    try {
      const { data: existingData, error } = await supabase
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

    return students.map((student) => ({
      student_id: student.id,
      teacher_id: teacherUUID,
      date: date,
      subject: subjectValue,
      class_id: selectedClass,
      type: typeValue,
      status: attendanceStatus[student.id] || "Hadir",
      notes: attendanceNotes[student.id] || null,
    }));
  };

  const deleteExistingAttendance = async (teacherUUID, typeValue) => {
    try {
      const { error } = await supabase
        .from("attendances")
        .delete()
        .eq("teacher_id", teacherUUID)
        .eq("date", date)
        .eq("type", typeValue)
        .eq("class_id", selectedClass);

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
        console.error(
          `Error inserting batch ${Math.floor(i / BATCH_SIZE) + 1}:`,
          error
        );
        errorCount += batch.length;
      } else {
        successCount += batch.length;
      }
    }

    return { successCount, errorCount };
  };

  const processAttendanceSubmission = async () => {
    if (!teacherId || !selectedSubject || !selectedClass) {
      if (onShowToast) {
        onShowToast("Pilih mata pelajaran dan kelas terlebih dahulu!", "error");
      }
      return;
    }

    if (students.length === 0) {
      if (onShowToast) {
        onShowToast("Tidak ada siswa untuk diabsen!", "error");
      }
      return;
    }

    setLoading(true);

    try {
      const { data: teacherUser, error: teacherError } = await supabase
        .from("users")
        .select("id")
        .eq("teacher_id", teacherId)
        .single();

      if (teacherError)
        throw new Error("Gagal mengambil data guru: " + teacherError.message);
      if (!teacherUser) throw new Error("Data guru tidak ditemukan di sistem");

      const teacherUUID = teacherUser.id;
      const typeValue = isHomeroomDaily() ? "harian" : "mapel";

      const existingData = await checkExistingAttendance(
        teacherUUID,
        typeValue
      );

      if (existingData && existingData.length > 0) {
        const attendanceData = prepareAttendanceData(teacherUUID);
        setPendingAttendanceData(attendanceData);
        setExistingAttendanceData(existingData);
        setShowConfirmModal(true);
        setLoading(false);
        return;
      }

      const attendanceData = prepareAttendanceData(teacherUUID);
      const { successCount, errorCount } = await saveAttendanceData(
        attendanceData
      );

      if (errorCount > 0) {
        throw new Error(
          `Berhasil menyimpan ${successCount} data, gagal ${errorCount} data.`
        );
      }

      handleSaveSuccess(successCount);
    } catch (error) {
      console.error("Error saving attendance:", error);
      if (onShowToast) {
        onShowToast("Gagal menyimpan presensi: " + error.message, "error");
      }
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

      if (teacherError)
        throw new Error("Gagal mengambil data guru: " + teacherError.message);
      if (!teacherUser) throw new Error("Data guru tidak ditemukan di sistem");

      const teacherUUID = teacherUser.id;
      const typeValue = isHomeroomDaily() ? "harian" : "mapel";

      await deleteExistingAttendance(teacherUUID, typeValue);
      const { successCount, errorCount } = await saveAttendanceData(
        pendingAttendanceData
      );

      if (errorCount > 0) {
        throw new Error(
          `Berhasil menyimpan ${successCount} data, gagal ${errorCount} data.`
        );
      }

      handleSaveSuccess(successCount);
    } catch (error) {
      console.error("Error overwriting attendance:", error);
      if (onShowToast) {
        onShowToast("Gagal menimpa presensi: " + error.message, "error");
      }
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

    if (onShowToast) {
      onShowToast("Penyimpanan dibatalkan", "info");
    }
  };

  const handleSaveSuccess = (successCount) => {
    if (onShowToast) {
      onShowToast(
        `Presensi berhasil disimpan untuk ${successCount} siswa pada ${
          isHomeroomDaily() ? "presensi harian" : selectedSubject
        } tanggal ${date}`,
        "success"
      );
    }

    const newStatus = {};
    students.forEach((student) => {
      newStatus[student.id] = "Hadir";
    });
    setAttendanceStatus(newStatus);
    setAttendanceNotes({});
  };

  // ✅ TAMBAHAN: Modal untuk Export Bulanan
  const ExportMonthlyModal = () => {
    const [selectedMonth, setSelectedMonth] = useState("");
    const [selectedYear, setSelectedYear] = useState("");

    // Initialize with current month/year when modal opens
    useEffect(() => {
      if (showExportMonthlyModal) {
        const now = new Date();
        setSelectedYear(now.getFullYear().toString());
        setSelectedMonth(String(now.getMonth() + 1).padStart(2, "0"));
      }
    }, [showExportMonthlyModal]);

    const handleExport = () => {
      if (!selectedMonth || !selectedYear) return;
      const yearMonth = `${selectedYear}-${selectedMonth}`;
      processMonthlyExport(yearMonth);
      setShowExportMonthlyModal(false);
    };

    if (!showExportMonthlyModal) return null;

    // Year options
    const yearOptions = [];
    for (let year = 2024; year <= 2030; year++) {
      yearOptions.push(year);
    }

    // Month names
    const monthNames = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
          {/* Header - Blue theme */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-xl flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold">Export Bulanan</h2>
                <p className="text-blue-100 text-sm">
                  Pilih periode bulan untuk diunduh
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowExportMonthlyModal(false)}
              className="p-2 hover:bg-blue-600 rounded-lg transition">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Month Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilih Bulan
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition">
                <option value="">-- Pilih Bulan --</option>
                {monthNames.map((name, index) => (
                  <option
                    key={index}
                    value={String(index + 1).padStart(2, "0")}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilih Tahun
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition">
                <option value="">-- Pilih Tahun --</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowExportMonthlyModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium">
                Batal
              </button>
              <button
                onClick={handleExport}
                disabled={!selectedMonth || !selectedYear}
                className="flex-1 px-4 py-3 bg-blue-500 border border-blue-600 text-white rounded-lg hover:bg-blue-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <span>Download</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ✅ TAMBAHAN: Modal untuk Export Semester
  const ExportSemesterModal = () => {
    const [selectedSemester, setSelectedSemester] = useState("ganjil");
    const [selectedYear, setSelectedYear] = useState("");

    // Initialize with current year when modal opens
    useEffect(() => {
      if (showExportSemesterModal) {
        const now = new Date();
        setSelectedYear(now.getFullYear().toString());
      }
    }, [showExportSemesterModal]);

    const handleExport = () => {
      if (!selectedYear) return;
      processSemesterExport(selectedSemester, parseInt(selectedYear));
    };

    if (!showExportSemesterModal) return null;

    // Year options
    const yearOptions = [];
    for (let year = 2024; year <= 2030; year++) {
      yearOptions.push(year);
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
          {/* Header - Indigo theme */}
          <div className="sticky top-0 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white p-6 rounded-t-xl flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold">Export Semester</h2>
                <p className="text-indigo-100 text-sm">
                  Pilih semester untuk diunduh
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowExportSemesterModal(false)}
              className="p-2 hover:bg-indigo-600 rounded-lg transition">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Semester Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilih Semester
              </label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition">
                <option value="ganjil">Semester Ganjil (Juli-Desember)</option>
                <option value="genap">Semester Genap (Januari-Juni)</option>
              </select>
            </div>

            {/* Year Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilih Tahun
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition">
                <option value="">-- Pilih Tahun --</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Info Box */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="text-sm text-indigo-700">
                    Data akan diekspor dalam format Excel (.xlsx) untuk semester
                    yang dipilih
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowExportSemesterModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium">
                Batal
              </button>
              <button
                onClick={handleExport}
                disabled={!selectedYear || exportLoading}
                className="flex-1 px-4 py-3 bg-indigo-500 border border-indigo-600 text-white rounded-lg hover:bg-indigo-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {exportLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Mengekspor...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    <span>Download</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (authLoading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-blue-500 text-lg">Memeriksa autentikasi...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 sm:p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 text-lg">
            Anda harus login untuk mengakses halaman ini
          </p>
        </div>
      </div>
    );
  }

  const stats = getAttendanceStats();

  return (
    <div className="p-4 sm:p-6 bg-slate-50 min-h-screen">
      <div className="mb-6 sm:mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-800 mb-2">
                Input Presensi
              </h1>
              <p className="text-sm sm:text-base text-slate-600">
                Kelola Kehadiran Siswa Untuk Mata Pelajaran Dan Kelas
              </p>
            </div>
            <div className="sm:text-right">
              <div className="text-slate-800 font-medium text-sm sm:text-base">
                {user?.full_name || user?.username}
              </div>
              <div className="flex gap-2 mt-2">
                {isHomeroomTeacher && (
                  <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs sm:text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    Wali Kelas {homeroomClass}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm mb-4 sm:mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Mata Pelajaran
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setSelectedClass("");
                setStudents([]);
                setStudentsLoaded(false);
              }}
              disabled={loading || !teacherId}
              className="w-full p-2.5 sm:p-3 text-sm sm:text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition">
              <option value="">Pilih Mata Pelajaran</option>
              {subjects.map((subject, index) => (
                <option key={index} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Kelas
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              disabled={!selectedSubject || loading || isHomeroomDaily()}
              className="w-full p-2.5 sm:p-3 text-sm sm:text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:bg-slate-50">
              <option value="">Pilih Kelas</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.displayName}
                </option>
              ))}
            </select>
            {isHomeroomDaily() && (
              <p className="text-xs text-blue-600 mt-1">
                Kelas otomatis dipilih untuk presensi harian
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Tanggal
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={loading}
              min="2024-01-01"
              max="2026-12-31"
              className="w-full p-2.5 sm:p-3 text-sm sm:text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
            <p className="text-xs text-slate-500 mt-1">
              {new Date().toLocaleDateString("id-ID", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      {students.length > 0 && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border-l-4 border-green-500">
              <div className="flex items-center">
                <div className="text-green-600 text-lg sm:text-xl mr-2 sm:mr-3">
                  ✓
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-slate-800">
                    {stats.Hadir}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-600">Hadir</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border-l-4 border-yellow-500">
              <div className="flex items-center">
                <div className="text-yellow-600 text-lg sm:text-xl mr-2 sm:mr-3">
                  🏥
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-slate-800">
                    {stats.Sakit}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-600">Sakit</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
              <div className="flex items-center">
                <div className="text-blue-600 text-lg sm:text-xl mr-2 sm:mr-3">
                  📋
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-slate-800">
                    {stats.Izin}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-600">Izin</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border-l-4 border-red-500">
              <div className="flex items-center">
                <div className="text-red-600 text-lg sm:text-xl mr-2 sm:mr-3">
                  ✖
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-slate-800">
                    {stats.Alpa}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-600">Alpa</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="relative flex-grow min-w-full sm:min-w-[250px]">
              <input
                type="text"
                placeholder="Cari siswa (nama/NIS)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2.5 sm:py-2 text-sm sm:text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition w-full"
              />
              <span className="absolute right-3 top-2.5 sm:top-2 text-slate-400 text-lg">
                🔍
              </span>
            </div>

            <button
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm sm:text-base bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 transition disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              onClick={setAllHadir}
              disabled={loading}
              style={{ minHeight: "44px" }}>
              ✅ Hadir Semua
            </button>

            <button
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm sm:text-base bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium touch-manipulation"
              onClick={processAttendanceSubmission}
              disabled={
                loading ||
                !selectedSubject ||
                !selectedClass ||
                students.length === 0
              }
              style={{ minHeight: "44px" }}>
              {loading ? "Menyimpan..." : "💾 Simpan Presensi"}
            </button>

            <button
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm sm:text-base bg-purple-50 border border-purple-200 text-purple-700 rounded-lg hover:bg-purple-100 transition disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              onClick={handleShowRekap}
              disabled={
                !selectedClass || !selectedSubject || students.length === 0
              }
              style={{ minHeight: "44px" }}>
              📊 Lihat Rekap
            </button>

            {/* ✅ PERBAIKAN: Export Bulanan dengan Modal */}
            <button
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm sm:text-base bg-orange-50 border border-orange-200 text-orange-700 rounded-lg hover:bg-orange-100 transition disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              onClick={handleExportMonthly}
              disabled={students.length === 0}
              style={{ minHeight: "44px" }}>
              📅 Export Bulanan
            </button>

            {/* ✅ TAMBAHAN: Export Semester dengan Modal */}
            <button
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm sm:text-base bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-100 transition disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              onClick={handleExportSemester}
              disabled={
                !selectedClass || !selectedSubject || students.length === 0
              }
              style={{ minHeight: "44px" }}>
              📚 Export Semester
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-200">
              <h3 className="text-base sm:text-lg font-semibold text-slate-800">
                Daftar Siswa -{" "}
                {classes.find((c) => c.id === selectedClass)?.displayName}
                {searchTerm && (
                  <span className="text-sm text-slate-600 ml-2">
                    ({filteredStudents.length} siswa)
                  </span>
                )}
              </h3>
            </div>

            <div className="block sm:hidden">
              {filteredStudents.map((student, index) => (
                <div key={student.id} className="border-b border-slate-100 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium text-slate-900 mb-1">
                        {index + 1}. {student.full_name}
                      </div>
                      <div className="text-sm text-slate-600">
                        NIS: {student.nis}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-slate-700 mb-2 block">
                        Status Kehadiran
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition touch-manipulation ${
                            attendanceStatus[student.id] === "Hadir"
                              ? "bg-green-500 text-white"
                              : "bg-slate-100 text-slate-700 active:bg-slate-200"
                          }`}
                          onClick={() =>
                            handleStatusChange(student.id, "Hadir")
                          }
                          disabled={loading}
                          style={{ minHeight: "44px" }}>
                          ✓ Hadir
                        </button>
                        <button
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition touch-manipulation ${
                            attendanceStatus[student.id] === "Sakit"
                              ? "bg-yellow-500 text-white"
                              : "bg-slate-100 text-slate-700 active:bg-slate-200"
                          }`}
                          onClick={() =>
                            handleStatusChange(student.id, "Sakit")
                          }
                          disabled={loading}
                          style={{ minHeight: "44px" }}>
                          🏥 Sakit
                        </button>
                        <button
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition touch-manipulation ${
                            attendanceStatus[student.id] === "Izin"
                              ? "bg-blue-500 text-white"
                              : "bg-slate-100 text-slate-700 active:bg-slate-200"
                          }`}
                          onClick={() => handleStatusChange(student.id, "Izin")}
                          disabled={loading}
                          style={{ minHeight: "44px" }}>
                          📋 Izin
                        </button>
                        <button
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition touch-manipulation ${
                            attendanceStatus[student.id] === "Alpa"
                              ? "bg-red-500 text-white"
                              : "bg-slate-100 text-slate-700 active:bg-slate-200"
                          }`}
                          onClick={() => handleStatusChange(student.id, "Alpa")}
                          disabled={loading}
                          style={{ minHeight: "44px" }}>
                          ✖ Alpa
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-700 mb-2 block">
                        Keterangan
                      </label>
                      <input
                        type="text"
                        className="w-full p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        placeholder="Tambahkan keterangan jika diperlukan..."
                        value={attendanceNotes[student.id] || ""}
                        onChange={(e) =>
                          handleNotesChange(student.id, e.target.value)
                        }
                        disabled={loading}
                        style={{ minHeight: "44px" }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-slate-700 whitespace-nowrap"
                      style={{ width: "60px" }}>
                      No
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-slate-700 whitespace-nowrap"
                      style={{ width: "120px" }}>
                      NIS
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-slate-700"
                      style={{ minWidth: "200px" }}>
                      Nama Siswa
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-slate-700"
                      style={{ minWidth: "280px" }}>
                      Status Kehadiran
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-slate-700"
                      style={{ minWidth: "250px" }}>
                      Keterangan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student, index) => (
                    <tr
                      key={student.id}
                      className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 whitespace-nowrap">
                        {student.nis}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {student.full_name}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                              attendanceStatus[student.id] === "Hadir"
                                ? "bg-green-500 text-white"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                            onClick={() =>
                              handleStatusChange(student.id, "Hadir")
                            }
                            disabled={loading}>
                            ✓ Hadir
                          </button>
                          <button
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                              attendanceStatus[student.id] === "Sakit"
                                ? "bg-yellow-500 text-white"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                            onClick={() =>
                              handleStatusChange(student.id, "Sakit")
                            }
                            disabled={loading}>
                            🏥 Sakit
                          </button>
                          <button
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                              attendanceStatus[student.id] === "Izin"
                                ? "bg-blue-500 text-white"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                            onClick={() =>
                              handleStatusChange(student.id, "Izin")
                            }
                            disabled={loading}>
                            📋 Izin
                          </button>
                          <button
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                              attendanceStatus[student.id] === "Alpa"
                                ? "bg-red-500 text-white"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                            onClick={() =>
                              handleStatusChange(student.id, "Alpa")
                            }
                            disabled={loading}>
                            ✖ Alpa
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                          placeholder="Tambahkan keterangan..."
                          value={attendanceNotes[student.id] || ""}
                          onChange={(e) =>
                            handleNotesChange(student.id, e.target.value)
                          }
                          disabled={loading}
                          style={{ minWidth: "220px" }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {selectedClass && students.length === 0 && !loading && (
        <div className="bg-white p-8 rounded-xl shadow-sm text-center text-slate-500">
          <p>Tidak ada siswa aktif di kelas ini</p>
        </div>
      )}

      {!selectedClass &&
        selectedSubject &&
        classes.length === 0 &&
        !isHomeroomDaily() && (
          <div className="bg-white p-8 rounded-xl shadow-sm text-center text-slate-500">
            <p>Tidak ada kelas untuk mata pelajaran ini</p>
          </div>
        )}

      {!selectedSubject && (
        <div className="bg-white p-8 rounded-xl shadow-sm text-center text-slate-500">
          <p>Pilih mata pelajaran untuk memulai</p>
        </div>
      )}

      <AttendanceRecapModal
        showModal={showRekapModal}
        onClose={() => setShowRekapModal(false)}
        attendanceMode={isHomeroomDaily() ? "daily" : "subject"}
        selectedClass={selectedClass}
        selectedSubject={selectedSubject}
        homeroomClass={homeroomClass}
        students={students}
        onShowToast={onShowToast}
      />

      {/* ✅ TAMBAHAN: Modal Export Bulanan */}
      <ExportMonthlyModal />

      {/* ✅ TAMBAHAN: Modal Export Semester */}
      <ExportSemesterModal />

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-slate-200 sticky top-0 bg-white">
              <h3 className="text-base sm:text-lg font-semibold text-slate-800">
                ⚠️ Data Presensi Sudah Ada
              </h3>
            </div>

            <div className="p-4 sm:p-6">
              <p className="text-sm sm:text-base text-slate-700 mb-4">
                Presensi untuk <strong>{selectedSubject}</strong> pada tanggal{" "}
                <strong>{date}</strong> sudah tersimpan sebelumnya.
              </p>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>Data yang sudah ada:</strong>{" "}
                  {existingAttendanceData?.length} siswa
                </p>
              </div>

              <p className="text-sm text-slate-600 mb-6">
                Apakah Anda ingin <strong>menimpa data lama</strong> dengan data
                yang baru?
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleCancelOverwrite}
                  disabled={loading}
                  className="w-full sm:flex-1 px-4 py-3 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition font-medium text-sm sm:text-base touch-manipulation disabled:opacity-50"
                  style={{ minHeight: "44px" }}>
                  Batal
                </button>
                <button
                  onClick={handleOverwriteConfirmation}
                  disabled={loading}
                  className="w-full sm:flex-1 px-4 py-3 bg-red-500 border border-red-600 text-white rounded-lg hover:bg-red-600 active:bg-red-700 transition font-medium text-sm sm:text-base disabled:opacity-50 touch-manipulation"
                  style={{ minHeight: "44px" }}>
                  {loading ? "Menimpa..." : "Ya, Timpa Data"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
