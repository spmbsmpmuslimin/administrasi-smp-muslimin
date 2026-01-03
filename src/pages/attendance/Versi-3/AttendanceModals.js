//[file name]: AttendanceModals.js
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import { filterBySemester, getActiveAcademicInfo } from "../../services/academicYearService";

// ==============================================
// UTILITY FUNCTIONS
// ==============================================

const normalizeStatus = (status) => {
  if (!status) return null;
  const normalized = status.toString().toLowerCase().trim();
  if (normalized === "alpha") return "alpa";
  return normalized;
};

const formatDateHeader = (dateStr) => {
  try {
    const date = new Date(dateStr + "T00:00:00");
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return `${day}/${month}`;
  } catch {
    return dateStr;
  }
};

const getStatusBadge = (status) => {
  if (!status) return <span className="text-gray-400">-</span>;

  const normalized = normalizeStatus(status);

  const statusMap = {
    hadir: { text: "H", color: "bg-green-500 text-white" },
    sakit: { text: "S", color: "bg-yellow-500 text-white" },
    izin: { text: "I", color: "bg-blue-500 text-white" },
    alpa: { text: "A", color: "bg-red-500 text-white" },
  };

  const statusInfo = statusMap[normalized] || {
    text: "-",
    color: "bg-gray-200 text-gray-500",
  };

  return (
    <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${statusInfo.color}`}>
      {statusInfo.text}
    </span>
  );
};

const getAttendanceCategory = (percentage) => {
  if (percentage >= 90)
    return {
      text: "Sangat Baik",
      color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    };
  if (percentage >= 80)
    return {
      text: "Baik",
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    };
  if (percentage >= 70)
    return {
      text: "Cukup",
      color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    };
  return {
    text: "Kurang",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  };
};

// ==============================================
// ATTENDANCE MODALS COMPONENT (Compact Version)
// ==============================================

const AttendanceModals = ({ user, onShowToast, darkMode }) => {
  // State Management
  const [viewMode, setViewMode] = useState("monthly");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);

  // Academic Year States
  const [selectedSemesterId, setSelectedSemesterId] = useState(null);
  const [availableSemesters, setAvailableSemesters] = useState([]);

  // Monthly View States
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  // Semester View States - Dynamic default
  const [selectedSemester, setSelectedSemester] = useState(() => {
    const currentMonth = new Date().getMonth() + 1;
    return currentMonth >= 1 && currentMonth <= 6 ? "genap" : "ganjil";
  });

  // Data States
  const [students, setStudents] = useState([]);
  const [rekapData, setRekapData] = useState([]);
  const [attendanceDates, setAttendanceDates] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);

  // Teacher Info
  const [teacherId, setTeacherId] = useState(null);
  const [isHomeroomTeacher, setIsHomeroomTeacher] = useState(false);
  const [homeroomClass, setHomeroomClass] = useState(null);

  // Storage Key untuk sticky selection
  const STORAGE_KEY = "attendance_preview_filters";

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

  // ==============================================
  // STICKY SELECTION - localStorage
  // ==============================================

  // Load saved filters on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const {
          subject,
          classId,
          viewMode: savedViewMode,
          month,
          year,
          semester,
        } = JSON.parse(saved);

        if (savedViewMode) setViewMode(savedViewMode);
        if (subject) setSelectedSubject(subject);
        if (classId) setSelectedClass(classId);
        if (month) setSelectedMonth(month);
        if (year) setSelectedYear(year);
        if (semester) setSelectedSemester(semester);
      }
    } catch (error) {
      console.error("Error loading saved filters:", error);
    }
  }, []);

  // Save filters when they change
  useEffect(() => {
    if (selectedSubject && selectedClass) {
      const filtersToSave = {
        subject: selectedSubject,
        classId: selectedClass,
        viewMode,
        month: selectedMonth,
        year: selectedYear,
        semester: selectedSemester,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtersToSave));
    }
  }, [selectedSubject, selectedClass, viewMode, selectedMonth, selectedYear, selectedSemester]);

  // ==============================================
  // DATA FETCHING FUNCTIONS
  // ==============================================

  // ✅ Fetch Teacher Info from user - IMPROVED
  useEffect(() => {
    const fetchTeacherInfo = async () => {
      if (!user?.id) {
        console.log("⚠️ No user.id available yet");
        return;
      }

      console.log("🔍 Fetching teacher info for user:", user.id);

      try {
        const { data, error } = await supabase
          .from("users")
          .select("teacher_id, homeroom_class_id")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("❌ Supabase error:", error);
          throw error;
        }

        if (data) {
          console.log("✅ Teacher info loaded:", data);

          if (data.teacher_id) {
            setTeacherId(data.teacher_id);
            console.log("👨‍🏫 Teacher ID set:", data.teacher_id);
          } else {
            console.warn("⚠️ No teacher_id in user data");
          }

          if (data.homeroom_class_id) {
            setIsHomeroomTeacher(true);
            setHomeroomClass(data.homeroom_class_id);
            console.log("🏠 Homeroom class:", data.homeroom_class_id);
          }
        } else {
          console.warn("⚠️ No data returned from users table");
        }
      } catch (error) {
        console.error("❌ Error fetching teacher info:", error);
        onShowToast?.("Gagal memuat data guru", "error");
      }
    };

    fetchTeacherInfo();
  }, [user?.id, onShowToast]);

  // ✅ Fetch Active Academic Info
  useEffect(() => {
    const loadAcademicInfo = async () => {
      try {
        const info = await getActiveAcademicInfo();
        if (info) {
          console.log("📅 Academic info loaded:", info);
          setSelectedSemesterId(info.activeSemesterId);
          setAvailableSemesters(info.availableSemesters || []);
        }
      } catch (error) {
        console.error("Error loading academic info:", error);
        onShowToast?.("Gagal memuat informasi tahun ajaran", "error");
      }
    };

    loadAcademicInfo();
  }, [onShowToast]);

  // ✅ Sync semester selection dengan active semester
  useEffect(() => {
    if (availableSemesters.length > 0 && selectedSemesterId) {
      const activeSem = availableSemesters.find((s) => s.id === selectedSemesterId);
      if (activeSem) {
        const semesterType = activeSem.semester === 1 ? "ganjil" : "genap";
        console.log(
          "🔄 Auto-setting semester type to:",
          semesterType,
          "based on active semester:",
          activeSem.semester
        );
        setSelectedSemester(semesterType);
      }
    }
  }, [selectedSemesterId, availableSemesters]);

  // ✅ Fetch Subjects based on teacher_id & semester - DENGAN AUTO-SELECT
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!teacherId) {
        console.log("⏳ Waiting for teacherId to be loaded... (current:", teacherId, ")");
        setSubjects([]);
        setSelectedSubject(""); // Reset selection
        return;
      }

      if (!selectedSemesterId) {
        console.log("⏳ Waiting for semesterId... (current:", selectedSemesterId, ")");
        setSubjects([]);
        return;
      }

      try {
        console.log("🔍 Fetching subjects for:", { teacherId, selectedSemesterId });

        let query = supabase
          .from("teacher_assignments")
          .select("subject")
          .eq("teacher_id", teacherId);

        query = filterBySemester(query, selectedSemesterId);

        const { data, error } = await query;

        if (error) throw error;

        console.log("📚 Raw subjects data:", data);

        // Get unique subjects
        const uniqueSubjects = [...new Set(data?.map((item) => item.subject) || [])];

        // Add homeroom daily if applicable
        if (isHomeroomTeacher && homeroomClass) {
          uniqueSubjects.push(`PRESENSI HARIAN KELAS ${homeroomClass}`);
        }

        console.log("✅ Final subjects:", uniqueSubjects);
        setSubjects(uniqueSubjects);

        // ✅ AUTO-SELECT: Pilih first option jika belum ada yang dipilih
        if (uniqueSubjects.length > 0 && !selectedSubject) {
          const firstSubject = uniqueSubjects[0];
          console.log("🎯 Auto-selecting first subject:", firstSubject);
          setSelectedSubject(firstSubject);
        }
      } catch (error) {
        console.error("Error fetching subjects:", error);
        onShowToast?.("Gagal memuat daftar mata pelajaran", "error");
      }
    };

    fetchSubjects();
  }, [teacherId, selectedSemesterId, isHomeroomTeacher, homeroomClass, onShowToast]);

  // ✅ Fetch Classes based on subject & semester - DENGAN AUTO-SELECT
  useEffect(() => {
    const fetchClasses = async () => {
      if (!teacherId) {
        console.log("⏳ Classes waiting for teacherId...");
        setClasses([]);
        return;
      }

      if (!selectedSemesterId) {
        console.log("⏳ Classes waiting for semesterId...");
        setClasses([]);
        return;
      }

      if (!selectedSubject) {
        console.log("⏳ Classes waiting for subject selection...");
        setClasses([]);
        setSelectedClass(""); // Reset class selection
        return;
      }

      try {
        console.log("🔍 Fetching classes for:", { selectedSubject, teacherId, selectedSemesterId });

        const isDailyMode = selectedSubject.includes("PRESENSI HARIAN");

        if (isDailyMode) {
          // For homeroom daily attendance
          if (homeroomClass) {
            const classesList = [
              {
                id: homeroomClass,
                displayName: `Kelas ${homeroomClass}`,
              },
            ];
            console.log("🏠 Homeroom classes:", classesList);
            setClasses(classesList);

            // ✅ AUTO-SELECT: Pilih homeroom class jika belum ada yang dipilih
            if (!selectedClass) {
              console.log("🎯 Auto-selecting homeroom class:", homeroomClass);
              setSelectedClass(homeroomClass);
            }
          }
          return;
        }

        // For subject-based attendance
        let query = supabase
          .from("teacher_assignments")
          .select("class_id")
          .eq("teacher_id", teacherId)
          .eq("subject", selectedSubject);

        query = filterBySemester(query, selectedSemesterId);

        const { data, error } = await query;

        if (error) throw error;

        console.log("📚 Raw classes data:", data);

        if (!data || data.length === 0) {
          console.warn("⚠️ No classes found for this subject");
          setClasses([]);
          return;
        }

        // Get unique class IDs
        const uniqueClassIds = [...new Set(data.map((item) => item.class_id))];

        // ✅ Fetch class details (hanya id dan grade untuk validasi)
        const { data: classData, error: classError } = await supabase
          .from("classes")
          .select("id, grade") // ✅ Hapus "name", hanya ambil id & grade
          .in("id", uniqueClassIds)
          .order("grade")
          .order("id");

        if (classError) throw classError;

        // ✅ Format class display names (id sudah berisi format lengkap seperti "7A")
        const formattedClasses =
          classData?.map((cls) => ({
            id: cls.id,
            displayName: `Kelas ${cls.id}`, // ✅ Langsung pakai id: "7A" → "Kelas 7A"
          })) || [];

        console.log("✅ Formatted classes:", formattedClasses);
        setClasses(formattedClasses);

        // ✅ AUTO-SELECT: Pilih first class jika belum ada yang dipilih
        if (formattedClasses.length > 0 && !selectedClass) {
          const firstClass = formattedClasses[0].id;
          console.log("🎯 Auto-selecting first class:", firstClass);
          setSelectedClass(firstClass);
        }
      } catch (error) {
        console.error("Error fetching classes:", error);
        onShowToast?.("Gagal memuat daftar kelas", "error");
      }
    };

    fetchClasses();
  }, [selectedSubject, teacherId, selectedSemesterId, homeroomClass, onShowToast]);

  // ✅ Fetch Students based on selected class
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClass) {
        console.log("⚠️ Waiting for class selection");
        setStudents([]);
        return;
      }

      try {
        console.log("👨‍🎓 Fetching students for class:", selectedClass);

        const { data, error } = await supabase
          .from("students")
          .select("id, full_name, nis")
          .eq("class_id", selectedClass)
          .eq("is_active", true)
          .order("full_name");

        if (error) throw error;

        console.log("✅ Students loaded:", data?.length || 0);
        setStudents(data || []);
      } catch (error) {
        console.error("Error fetching students:", error);
        onShowToast?.("Gagal memuat data siswa", "error");
      }
    };

    fetchStudents();
  }, [selectedClass, onShowToast]);

  // ==============================================
  // DATA FETCHING LOGIC (Monthly & Semester)
  // ==============================================

  // ✅ Fetch Monthly Data - useCallback for memoization
  const fetchMonthlyData = useCallback(
    async (month, year) => {
      console.log("📊 fetchMonthlyData called:", {
        month,
        year,
        selectedClass,
        selectedSubject,
        selectedSemesterId,
      });

      if (!selectedClass || !selectedSubject || !selectedSemesterId) {
        console.log("⏸️ Missing required filters for monthly data");
        return;
      }

      if (!students || students.length === 0) {
        console.log("⏸️ No students data available");
        return;
      }

      setTableLoading(true);

      try {
        const semesterInfo = availableSemesters.find((s) => s.id === selectedSemesterId);

        if (!semesterInfo) {
          console.error("❌ Semester info not found");
          return;
        }

        // Get semester info and auto-correct year
        const semesterNumber = semesterInfo.semester;
        const [startYear, endYear] = semesterInfo.year.split("/").map(Number);

        // Determine correct year based on month
        let correctYear = year;
        if (month >= 7 && month <= 12) {
          // Juli-Desember pakai startYear
          correctYear = startYear;
        } else if (month >= 1 && month <= 6) {
          // Januari-Juni pakai endYear
          correctYear = endYear;
        }

        // Auto-correct year if needed
        if (year !== correctYear) {
          console.log(`📅 Auto-correcting year: ${year} → ${correctYear} (month: ${month})`);
          setSelectedYear(correctYear);
          setTimeout(() => fetchMonthlyData(month, correctYear), 100);
          return;
        }

        const lastDay = new Date(year, month, 0).getDate();
        const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
        const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(
          2,
          "0"
        )}`;

        const isDailyMode = selectedSubject.includes("PRESENSI HARIAN");
        const subjectFilter = isDailyMode ? "Harian" : selectedSubject;
        const typeFilter = isDailyMode ? "harian" : "mapel";

        console.log("🔍 Query params:", {
          subjectFilter,
          classFilter: selectedClass,
          typeFilter,
          startDate,
          endDate,
          selectedSemesterId,
        });

        let query = supabase
          .from("attendances")
          .select("student_id, status, date")
          .eq("subject", subjectFilter)
          .eq("class_id", selectedClass)
          .eq("type", typeFilter)
          .gte("date", startDate)
          .lte("date", endDate);

        query = filterBySemester(query, selectedSemesterId);

        const { data: attendanceData, error } = await query;

        if (error) {
          console.error("❌ Supabase error:", error);
          throw error;
        }

        console.log("📊 Attendance data loaded:", attendanceData?.length || 0);

        if (!attendanceData || attendanceData.length === 0) {
          console.log("ℹ️ No attendance data for this period");
          setRekapData([]);
          setAttendanceDates([]);
          return;
        }

        // Get unique dates
        const uniqueDates = [...new Set(attendanceData.map((r) => r.date))].sort();
        setAttendanceDates(uniqueDates);

        console.log("📅 Unique dates found:", uniqueDates.length);

        // Process data
        const studentSummary = {};
        students.forEach((student, index) => {
          studentSummary[student.id] = {
            no: index + 1,
            studentId: student.id,
            name: student.full_name,
            nis: student.nis,
            dailyStatus: {},
            hadir: 0,
            sakit: 0,
            izin: 0,
            alpa: 0,
            total: 0,
            percentage: 0,
          };
        });

        // Count attendance
        attendanceData.forEach((record) => {
          if (studentSummary[record.student_id]) {
            const status = normalizeStatus(record.status);

            studentSummary[record.student_id].dailyStatus[record.date] = status;

            if (status === "hadir") studentSummary[record.student_id].hadir++;
            else if (status === "sakit") studentSummary[record.student_id].sakit++;
            else if (status === "izin") studentSummary[record.student_id].izin++;
            else if (status === "alpa") studentSummary[record.student_id].alpa++;
          }
        });

        // Calculate totals
        Object.keys(studentSummary).forEach((studentId) => {
          const student = studentSummary[studentId];
          student.total = student.hadir + student.sakit + student.izin + student.alpa;
          student.percentage =
            student.total > 0 ? Math.round((student.hadir / student.total) * 100) : 0;
        });

        const finalData = Object.values(studentSummary);
        setRekapData(finalData);

        console.log("✅ Rekap data processed:", finalData.length, "students");
      } catch (error) {
        console.error("❌ Error in fetchMonthlyData:", error);
        setRekapData([]);
        setAttendanceDates([]);
      } finally {
        setTableLoading(false);
      }
    },
    [selectedClass, selectedSubject, selectedSemesterId, students, availableSemesters, onShowToast]
  );

  // ✅ Fetch Semester Data - useCallback for memoization
  const fetchSemesterData = useCallback(
    async (semester) => {
      console.log("📊 fetchSemesterData called:", {
        semester,
        selectedClass,
        selectedSubject,
        selectedSemesterId,
      });

      if (!selectedClass || !selectedSubject || !selectedSemesterId) {
        console.log("⏸️ Missing required filters for semester data");
        return;
      }

      if (!students || students.length === 0) {
        console.log("⏸️ No students data available");
        return;
      }

      setTableLoading(true);

      try {
        const semesterInfo = availableSemesters.find((s) => s.id === selectedSemesterId);

        if (!semesterInfo) {
          console.error("❌ Semester info not found");
          return;
        }

        const semesterNumber = semesterInfo.semester;
        const [startYear, endYear] = semesterInfo.year.split("/").map(Number);

        let startDate, endDate;
        if (semester === "ganjil") {
          startDate = `${startYear}-07-01`;
          endDate = `${startYear}-12-31`;
        } else {
          startDate = `${endYear}-01-01`;
          endDate = `${endYear}-06-30`;
        }

        const isDailyMode = selectedSubject.includes("PRESENSI HARIAN");
        const subjectFilter = isDailyMode ? "Harian" : selectedSubject;
        const typeFilter = isDailyMode ? "harian" : "mapel";

        console.log("🔍 Semester query params:", {
          subjectFilter,
          classFilter: selectedClass,
          typeFilter,
          startDate,
          endDate,
          selectedSemesterId,
        });

        // ✅ PAGINATION: Fetch semua data dengan loop
        let allRecords = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;
        console.log("🔄 Starting pagination fetch...");
        while (hasMore) {
          let query = supabase
            .from("attendances")
            .select("student_id, status, date")
            .eq("subject", subjectFilter)
            .eq("class_id", selectedClass)
            .eq("type", typeFilter)
            .gte("date", startDate)
            .lte("date", endDate)
            .order("date", { ascending: true })
            .range(page * pageSize, (page + 1) * pageSize - 1);
          query = filterBySemester(query, selectedSemesterId);
          const { data, error: fetchError } = await query;

          if (fetchError) {
            console.error("❌ Pagination error:", fetchError);
            throw fetchError;
          }

          console.log(`📄 Page ${page + 1}: fetched ${data?.length || 0} records`); // ✅ FIX: Ganti backtick

          if (data && data.length > 0) {
            allRecords = [...allRecords, ...data];
            if (data.length < pageSize) {
              hasMore = false;
            } else {
              page++;
            }
          } else {
            hasMore = false;
          }
        }

        const attendanceData = allRecords;
        console.log("✅ Total records fetched:", attendanceData.length);

        // ✅ HAPUS BAGIAN INI (sudah diganti dengan fetchError di atas)
        // if (error) {
        //   console.error("❌ Supabase error:", error);
        //   throw error;
        // }

        console.log("📊 Semester attendance data loaded:", attendanceData?.length || 0);

        // ✅ DEBUG: Cek data untuk siswa pertama
        const firstStudent = students[0];
        if (firstStudent) {
          const studentRecords = attendanceData.filter((r) => r.student_id === firstStudent.id);
          console.log(`🔍 DEBUG - Data untuk ${firstStudent.full_name}:`, {
            // ✅ FIX: Ganti backtick
            totalRecords: studentRecords.length,
            hadir: studentRecords.filter((r) => normalizeStatus(r.status) === "hadir").length,
            sakit: studentRecords.filter((r) => normalizeStatus(r.status) === "sakit").length,
            izin: studentRecords.filter((r) => normalizeStatus(r.status) === "izin").length,
            alpa: studentRecords.filter((r) => normalizeStatus(r.status) === "alpa").length,
            sampleDates: studentRecords.slice(0, 5).map((r) => r.date),
          });
        }

        if (!attendanceData || attendanceData.length === 0) {
          console.log("ℹ️ No semester attendance data");
          setRekapData([]);
          return;
        }

        // ✅ DEBUG LOG
        const uniqueDates = [...new Set(attendanceData.map((r) => r.date))].sort();
        const totalHariEfektif = uniqueDates.length;

        console.log("📊 Semester data debug:", {
          totalRecords: attendanceData.length,
          totalHariEfektif: totalHariEfektif,
          firstDate: uniqueDates[0],
          lastDate: uniqueDates[uniqueDates.length - 1],
          sampleDates: uniqueDates.slice(0, 5),
        });

        // Process data
        const studentSummary = {};
        students.forEach((student, index) => {
          studentSummary[student.id] = {
            no: index + 1,
            studentId: student.id,
            name: student.full_name,
            nis: student.nis,
            hadir: 0,
            sakit: 0,
            izin: 0,
            alpa: 0,
            total: totalHariEfektif,
            percentage: 0,
          };
        });

        // Count attendance
        attendanceData.forEach((record) => {
          if (studentSummary[record.student_id]) {
            const status = normalizeStatus(record.status);

            if (status === "hadir") studentSummary[record.student_id].hadir++;
            else if (status === "sakit") studentSummary[record.student_id].sakit++;
            else if (status === "izin") studentSummary[record.student_id].izin++;
            else if (status === "alpa") studentSummary[record.student_id].alpa++;
          }
        });

        // Calculate percentage
        Object.keys(studentSummary).forEach((studentId) => {
          const student = studentSummary[studentId];
          student.percentage =
            totalHariEfektif > 0 ? Math.round((student.hadir / totalHariEfektif) * 100) : 0;
        });

        setRekapData(Object.values(studentSummary));
        setAttendanceDates([]);

        console.log(
          "✅ Semester data processed:",
          Object.values(studentSummary).length,
          "students"
        );
      } catch (error) {
        console.error("❌ Error in fetchSemesterData:", error);
        setRekapData([]);
      } finally {
        setTableLoading(false);
      }
    },
    [selectedClass, selectedSubject, selectedSemesterId, students, availableSemesters, onShowToast]
  );

  // ==============================================
  // AUTO-FETCH LOGIC
  // ==============================================

  // ✅ AUTO-FETCH: Trigger data load when all filters ready
  useEffect(() => {
    console.log("🔄 Auto-fetch check:", {
      selectedClass,
      selectedSubject,
      selectedSemesterId,
      viewMode,
      studentsCount: students.length,
    });

    // Check if all required filters are selected
    if (!selectedClass || !selectedSubject || !selectedSemesterId) {
      console.log("⏸️ Missing filters, skipping auto-fetch");
      return;
    }

    // Add small delay to prevent rapid re-fetching
    const timeoutId = setTimeout(() => {
      console.log("🚀 Triggering auto-fetch for", viewMode);
      if (viewMode === "monthly") {
        fetchMonthlyData(selectedMonth, selectedYear);
      } else {
        fetchSemesterData(selectedSemester);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    selectedClass,
    selectedSubject,
    selectedSemesterId,
    viewMode,
    selectedMonth,
    selectedYear,
    selectedSemester,
    fetchMonthlyData,
    fetchSemesterData,
  ]);

  // ==============================================
  // EVENT HANDLERS
  // ==============================================

  const handleMonthlyPeriodChange = (month, year) => {
    console.log("📅 Period changed:", { month, year });
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  const handleSemesterChange = (semester) => {
    console.log("📊 Semester changed:", semester);
    setSelectedSemester(semester);
  };

  // ==============================================
  // RENDER COMPONENT (Compact Version)
  // ==============================================

  const classDisplayName =
    classes.find((c) => c.id === selectedClass)?.displayName || selectedClass;

  return (
    <div className="w-full min-h-screen p-3 md:p-4">
      {/* COMPACT FILTER SECTION - 2 ROWS */}
      <div
        className={`rounded-lg shadow-sm mb-3 p-3 ${
          darkMode ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200"
        }`}
      >
        {/* Row 1: Main Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <select
            value={selectedSemesterId || ""}
            onChange={(e) => setSelectedSemesterId(e.target.value)}
            className={`flex-1 min-w-[150px] px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              darkMode
                ? "bg-slate-700 border-slate-600 text-white"
                : "bg-white border-gray-300 text-gray-900"
            }`}
          >
            <option value="">Semester</option>
            {availableSemesters.map((sem) => (
              <option key={sem.id} value={sem.id}>
                {sem.year} - Semester {sem.semester}
              </option>
            ))}
          </select>

          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className={`flex-1 min-w-[150px] px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              darkMode
                ? "bg-slate-700 border-slate-600 text-white"
                : "bg-white border-gray-300 text-gray-900"
            }`}
            disabled={!teacherId || !selectedSemesterId}
          >
            <option value="">Mata Pelajaran</option>
            {subjects.map((subj) => (
              <option key={subj} value={subj}>
                {subj}
              </option>
            ))}
          </select>

          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className={`flex-1 min-w-[120px] px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              darkMode
                ? "bg-slate-700 border-slate-600 text-white"
                : "bg-white border-gray-300 text-gray-900"
            }`}
            disabled={!selectedSubject || classes.length === 0}
          >
            <option value="">Kelas</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.displayName}
              </option>
            ))}
          </select>
        </div>

        {/* Row 2: View Mode + Period Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div
            className={`inline-flex rounded-lg p-0.5 ${darkMode ? "bg-slate-700" : "bg-slate-100"}`}
          >
            <button
              onClick={() => setViewMode("monthly")}
              className={`px-4 py-1.5 text-sm rounded-md transition ${
                viewMode === "monthly"
                  ? "bg-blue-500 text-white shadow-sm"
                  : darkMode
                  ? "text-gray-400 hover:text-white hover:bg-slate-600"
                  : "text-gray-600 hover:text-gray-900 hover:bg-slate-200"
              }`}
              disabled={!selectedClass}
            >
              📅 Bulanan
            </button>
            <button
              onClick={() => setViewMode("semester")}
              className={`px-4 py-1.5 text-sm rounded-md transition ${
                viewMode === "semester"
                  ? "bg-blue-500 text-white shadow-sm"
                  : darkMode
                  ? "text-gray-400 hover:text-white hover:bg-slate-600"
                  : "text-gray-600 hover:text-gray-900 hover:bg-slate-200"
              }`}
              disabled={!selectedClass}
            >
              📊 Semester
            </button>
          </div>

          {/* Period Selector - Conditional based on viewMode */}
          {viewMode === "monthly" ? (
            <>
              <select
                value={selectedMonth}
                onChange={(e) => handleMonthlyPeriodChange(parseInt(e.target.value), selectedYear)}
                className={`px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode
                    ? "bg-slate-700 border-slate-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
                disabled={!selectedClass}
              >
                {monthNames.map((month, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {month}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={selectedYear}
                onChange={(e) =>
                  handleMonthlyPeriodChange(selectedMonth, parseInt(e.target.value) || 2024)
                }
                className={`w-20 px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode
                    ? "bg-slate-700 border-slate-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
                min="2020"
                max="2030"
                disabled={!selectedClass}
              />
            </>
          ) : (
            <select
              value={selectedSemester}
              onChange={(e) => handleSemesterChange(e.target.value)}
              className={`px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                darkMode
                  ? "bg-slate-700 border-slate-600 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
              disabled={!selectedClass}
            >
              <option value="ganjil">Ganjil</option>
              <option value="genap">Genap</option>
            </select>
          )}

          {/* Loading Indicator */}
          {tableLoading && (
            <div className="flex items-center gap-2 text-blue-500 text-sm ml-auto">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span>Memuat...</span>
            </div>
          )}
        </div>
      </div>

      {/* Loading Teacher Info */}
      {!teacherId && (
        <div
          className={`rounded-lg shadow-sm mb-3 p-4 ${
            darkMode ? "bg-blue-900/20 border border-blue-800" : "bg-blue-50 border border-blue-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            <span className={`text-sm ${darkMode ? "text-blue-300" : "text-blue-700"}`}>
              Memuat informasi guru...
            </span>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div
        className={`rounded-lg shadow-sm overflow-hidden ${
          darkMode ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200"
        }`}
      ></div>

      {/* Data Table */}
      <div
        className={`rounded-lg shadow-sm overflow-hidden ${
          darkMode ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200"
        }`}
      >
        {/* Table Header - Only show when data is loaded */}
        {rekapData.length > 0 && (
          <div className={`p-3 border-b ${darkMode ? "border-slate-700" : "border-gray-200"}`}>
            <h3 className={`font-bold text-lg ${darkMode ? "text-white" : "text-gray-800"} mb-1`}>
              SMP MUSLIMIN CILILIN
            </h3>
            <div className="flex flex-wrap items-center gap-4">
              <p className={`font-medium ${darkMode ? "text-slate-300" : "text-gray-700"}`}>
                <span className="font-bold">{classDisplayName}</span>
              </p>
              <p className={`font-medium ${darkMode ? "text-slate-300" : "text-gray-700"}`}>
                Mata Pelajaran: <span className="font-bold">{selectedSubject}</span>
              </p>
              <p className={`font-medium ${darkMode ? "text-slate-300" : "text-gray-700"}`}>
                <span className="font-bold">
                  {viewMode === "monthly"
                    ? `${monthNames[selectedMonth - 1]} ${selectedYear}`
                    : `Semester ${selectedSemester === "ganjil" ? "Ganjil" : "Genap"}`}
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {tableLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-3"></div>
              <p className={`text-sm ${darkMode ? "text-slate-300" : "text-gray-600"}`}>
                Memuat data presensi...
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Monthly Table View */}
            {viewMode === "monthly" && attendanceDates.length > 0 && (
              <>
                <div
                  className={`p-2 text-center text-xs md:hidden border-b ${
                    darkMode
                      ? "bg-blue-900/30 text-blue-300 border-blue-800"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}
                >
                  👉 Geser untuk melihat semua hari
                </div>

                <div className="overflow-auto">
                  <table className="w-full text-xs md:text-sm border-collapse">
                    <thead
                      className={`${darkMode ? "bg-slate-700" : "bg-gray-100"} sticky top-0 z-20`}
                    >
                      <tr
                        className={`border-b-2 ${
                          darkMode ? "border-slate-600" : "border-gray-400"
                        }`}
                      >
                        <th
                          className={`p-2 text-center font-bold ${
                            darkMode
                              ? "text-slate-200 border-slate-600"
                              : "text-gray-800 border-gray-300"
                          } border-r-2 ${
                            darkMode ? "bg-slate-700" : "bg-gray-100"
                          } sticky left-0 z-30 min-w-[40px]`}
                        >
                          No.
                        </th>
                        <th
                          className={`p-2 text-left font-bold ${
                            darkMode
                              ? "text-slate-200 border-slate-600"
                              : "text-gray-800 border-gray-300"
                          } border-r-2 ${
                            darkMode ? "bg-slate-700" : "bg-gray-100"
                          } sticky left-[40px] z-30 min-w-[140px]`}
                        >
                          Nama Siswa
                        </th>

                        {attendanceDates.map((date, index) => (
                          <th
                            key={date}
                            className={`p-2 text-center font-bold ${
                              darkMode ? "text-slate-200" : "text-gray-800"
                            } min-w-[45px] border-r ${
                              darkMode ? "border-slate-600" : "border-gray-300"
                            }`}
                          >
                            {formatDateHeader(date)}
                          </th>
                        ))}

                        <th
                          className={`p-2 text-center font-bold ${
                            darkMode
                              ? "text-green-300 border-slate-600"
                              : "text-green-700 border-gray-300"
                          } min-w-[40px] ${darkMode ? "bg-green-900/30" : "bg-green-50"} border-r`}
                        >
                          H
                        </th>
                        <th
                          className={`p-2 text-center font-bold ${
                            darkMode
                              ? "text-blue-300 border-slate-600"
                              : "text-blue-700 border-gray-300"
                          } min-w-[40px] ${darkMode ? "bg-blue-900/30" : "bg-blue-50"} border-r`}
                        >
                          I
                        </th>
                        <th
                          className={`p-2 text-center font-bold ${
                            darkMode
                              ? "text-yellow-300 border-slate-600"
                              : "text-yellow-700 border-gray-300"
                          } min-w-[40px] ${
                            darkMode ? "bg-yellow-900/30" : "bg-yellow-50"
                          } border-r`}
                        >
                          S
                        </th>
                        <th
                          className={`p-2 text-center font-bold ${
                            darkMode
                              ? "text-red-300 border-slate-600"
                              : "text-red-700 border-gray-300"
                          } min-w-[40px] ${darkMode ? "bg-red-900/30" : "bg-red-50"} border-r-2 ${
                            darkMode ? "border-slate-600" : "border-gray-400"
                          }`}
                        >
                          A
                        </th>
                        <th
                          className={`p-2 text-center font-bold ${
                            darkMode
                              ? "text-slate-200 border-slate-600"
                              : "text-gray-800 border-gray-300"
                          } min-w-[45px] border-r`}
                        >
                          Total
                        </th>
                        <th
                          className={`p-2 text-center font-bold ${
                            darkMode ? "text-slate-200" : "text-gray-800"
                          } min-w-[50px]`}
                        >
                          %
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rekapData.length > 0 ? (
                        rekapData.map((student) => (
                          <tr
                            key={student.studentId}
                            className={`border-b ${
                              darkMode
                                ? "border-slate-700 hover:bg-slate-700"
                                : "border-gray-200 hover:bg-blue-50"
                            } transition`}
                          >
                            <td
                              className={`p-2 text-center border-r-2 ${
                                darkMode
                                  ? "border-slate-700 bg-slate-800"
                                  : "border-gray-300 bg-white"
                              } sticky left-0 z-10`}
                            >
                              {student.no}
                            </td>
                            <td
                              className={`p-2 font-medium border-r-2 ${
                                darkMode
                                  ? "border-slate-700 bg-slate-800 text-slate-200"
                                  : "border-gray-300 bg-white text-gray-800"
                              } sticky left-[40px] z-10`}
                            >
                              {student.name}
                            </td>

                            {attendanceDates.map((date, index) => (
                              <td
                                key={date}
                                className={`p-2 text-center border-r ${
                                  darkMode ? "border-slate-700" : "border-gray-200"
                                }`}
                              >
                                {getStatusBadge(student.dailyStatus?.[date])}
                              </td>
                            ))}

                            <td
                              className={`p-2 text-center font-bold border-r ${
                                darkMode
                                  ? "text-green-300 border-slate-700 bg-green-900/20"
                                  : "text-green-700 border-gray-200 bg-green-50/50"
                              }`}
                            >
                              {student.hadir}
                            </td>
                            <td
                              className={`p-2 text-center font-bold border-r ${
                                darkMode
                                  ? "text-blue-300 border-slate-700 bg-blue-900/20"
                                  : "text-blue-700 border-gray-200 bg-blue-50/50"
                              }`}
                            >
                              {student.izin}
                            </td>
                            <td
                              className={`p-2 text-center font-bold border-r ${
                                darkMode
                                  ? "text-yellow-300 border-slate-700 bg-yellow-900/20"
                                  : "text-yellow-700 border-gray-200 bg-yellow-50/50"
                              }`}
                            >
                              {student.sakit}
                            </td>
                            <td
                              className={`p-2 text-center font-bold border-r-2 ${
                                darkMode
                                  ? "text-red-300 border-slate-600 bg-red-900/20"
                                  : "text-red-700 border-gray-400 bg-red-50/50"
                              }`}
                            >
                              {student.alpa}
                            </td>
                            <td
                              className={`p-2 text-center font-bold border-r ${
                                darkMode
                                  ? "text-slate-200 border-slate-700"
                                  : "text-gray-800 border-gray-200"
                              }`}
                            >
                              {student.total}
                            </td>
                            <td
                              className={`p-2 text-center font-bold ${
                                darkMode ? "text-slate-200" : "text-gray-800"
                              }`}
                            >
                              {student.percentage}%
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={attendanceDates.length + 8} className="p-8 text-center">
                            <div className={`${darkMode ? "text-slate-400" : "text-gray-500"}`}>
                              <div className="text-3xl mb-3">📅</div>
                              <h4 className="font-semibold mb-2">Belum Ada Data</h4>
                              <p className="text-sm">Tidak ada data presensi untuk periode ini</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Semester Table View */}
            {viewMode === "semester" && rekapData.length > 0 && (
              <div className="overflow-auto">
                <table className="w-full text-xs md:text-sm border-collapse">
                  <thead
                    className={`${darkMode ? "bg-slate-700" : "bg-gray-100"} sticky top-0 z-20`}
                  >
                    <tr
                      className={`border-b-2 ${darkMode ? "border-slate-600" : "border-gray-400"}`}
                    >
                      <th
                        className={`p-2 text-center font-bold ${
                          darkMode ? "text-slate-200" : "text-gray-800"
                        } border-r ${
                          darkMode ? "border-slate-600" : "border-gray-300"
                        } min-w-[40px]`}
                      >
                        No
                      </th>
                      <th
                        className={`p-2 text-left font-bold ${
                          darkMode ? "text-slate-200" : "text-gray-800"
                        } border-r ${
                          darkMode ? "border-slate-600" : "border-gray-300"
                        } min-w-[180px]`}
                      >
                        Nama Siswa
                      </th>
                      <th
                        className={`p-2 text-center font-bold ${
                          darkMode ? "text-green-300" : "text-green-700"
                        } border-r ${
                          darkMode ? "border-slate-600" : "border-gray-300"
                        } min-w-[60px] ${darkMode ? "bg-green-900/30" : "bg-green-50"}`}
                      >
                        Hadir
                      </th>
                      <th
                        className={`p-2 text-center font-bold ${
                          darkMode ? "text-yellow-300" : "text-yellow-700"
                        } border-r ${
                          darkMode ? "border-slate-600" : "border-gray-300"
                        } min-w-[60px] ${darkMode ? "bg-yellow-900/30" : "bg-yellow-50"}`}
                      >
                        Sakit
                      </th>
                      <th
                        className={`p-2 text-center font-bold ${
                          darkMode ? "text-blue-300" : "text-blue-700"
                        } border-r ${
                          darkMode ? "border-slate-600" : "border-gray-300"
                        } min-w-[60px] ${darkMode ? "bg-blue-900/30" : "bg-blue-50"}`}
                      >
                        Izin
                      </th>
                      <th
                        className={`p-2 text-center font-bold ${
                          darkMode ? "text-red-300" : "text-red-700"
                        } border-r ${
                          darkMode ? "border-slate-600" : "border-gray-300"
                        } min-w-[60px] ${darkMode ? "bg-red-900/30" : "bg-red-50"}`}
                      >
                        Alpa
                      </th>
                      <th
                        className={`p-2 text-center font-bold ${
                          darkMode ? "text-slate-200" : "text-gray-800"
                        } border-r ${
                          darkMode ? "border-slate-600" : "border-gray-300"
                        } min-w-[60px]`}
                      >
                        Total
                      </th>
                      <th
                        className={`p-2 text-center font-bold ${
                          darkMode ? "text-slate-200" : "text-gray-800"
                        } border-r ${
                          darkMode ? "border-slate-600" : "border-gray-300"
                        } min-w-[70px]`}
                      >
                        %
                      </th>
                      <th
                        className={`p-2 text-center font-bold ${
                          darkMode ? "text-slate-200" : "text-gray-800"
                        } min-w-[100px]`}
                      >
                        Kategori
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rekapData.map((student) => {
                      const category = getAttendanceCategory(student.percentage);
                      return (
                        <tr
                          key={student.studentId}
                          className={`border-b ${
                            darkMode
                              ? "border-slate-700 hover:bg-slate-700"
                              : "border-gray-200 hover:bg-blue-50"
                          } transition`}
                        >
                          <td
                            className={`p-2 text-center border-r ${
                              darkMode
                                ? "border-slate-700 text-slate-200"
                                : "border-gray-200 text-gray-800"
                            } font-medium`}
                          >
                            {student.no}
                          </td>
                          <td
                            className={`p-2 border-r ${
                              darkMode
                                ? "border-slate-700 text-slate-200"
                                : "border-gray-200 text-gray-800"
                            } font-medium`}
                          >
                            {student.name}
                          </td>
                          <td
                            className={`p-2 text-center font-bold border-r ${
                              darkMode
                                ? "text-green-300 border-slate-700 bg-green-900/20"
                                : "text-green-700 border-gray-200 bg-green-50/30"
                            }`}
                          >
                            {student.hadir}
                          </td>
                          <td
                            className={`p-2 text-center font-bold border-r ${
                              darkMode
                                ? "text-yellow-300 border-slate-700 bg-yellow-900/20"
                                : "text-yellow-700 border-gray-200 bg-yellow-50/30"
                            }`}
                          >
                            {student.sakit}
                          </td>
                          <td
                            className={`p-2 text-center font-bold border-r ${
                              darkMode
                                ? "text-blue-300 border-slate-700 bg-blue-900/20"
                                : "text-blue-700 border-gray-200 bg-blue-50/30"
                            }`}
                          >
                            {student.izin}
                          </td>
                          <td
                            className={`p-2 text-center font-bold border-r ${
                              darkMode
                                ? "text-red-300 border-slate-700 bg-red-900/20"
                                : "text-red-700 border-gray-200 bg-red-50/30"
                            }`}
                          >
                            {student.alpa}
                          </td>
                          <td
                            className={`p-2 text-center font-bold border-r ${
                              darkMode
                                ? "text-slate-200 border-slate-700"
                                : "text-gray-800 border-gray-200"
                            }`}
                          >
                            {student.total}
                          </td>
                          <td className="p-2 text-center font-bold border-r">
                            <span
                              className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-semibold ${
                                student.percentage >= 90
                                  ? darkMode
                                    ? "bg-green-900/30 text-green-300"
                                    : "bg-green-100 text-green-700"
                                  : student.percentage >= 80
                                  ? darkMode
                                    ? "bg-blue-900/30 text-blue-300"
                                    : "bg-blue-100 text-blue-700"
                                  : student.percentage >= 70
                                  ? darkMode
                                    ? "bg-yellow-900/30 text-yellow-300"
                                    : "bg-yellow-100 text-yellow-700"
                                  : darkMode
                                  ? "bg-red-900/30 text-red-300"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {student.percentage}%
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            <span
                              className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold ${category.color}`}
                            >
                              {category.text}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Simple Empty State - No text spam */}
            {rekapData.length === 0 && !tableLoading && (
              <div className="p-8">
                <div
                  className={`text-center text-5xl ${
                    darkMode ? "text-slate-700" : "text-gray-200"
                  }`}
                >
                  📊
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Stats */}
      {rekapData.length > 0 && (
        <div className={`mt-3 text-sm ${darkMode ? "text-slate-400" : "text-gray-600"}`}>
          <p>
            📊 Total {rekapData.length} siswa
            {viewMode === "monthly" &&
              attendanceDates.length > 0 &&
              ` • ${attendanceDates.length} hari aktif`}
          </p>
        </div>
      )}
    </div>
  );
};

export default AttendanceModals;
