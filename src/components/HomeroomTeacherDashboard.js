//[file name]: HomeroomTeacherDashboard.js - REVISED VERSION (WITH 2 ABSENT STUDENTS SECTIONS)
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import AnnouncementPopup from "./AnnouncementPopup"; // ✅ INI IMPORT NYA
import { getActiveAcademicInfo } from "../services/academicYearService";
import FeedbackGuru from "./FeedbackGuru";

// ✅ JAM SCHEDULE - untuk menghitung jam pelajaran yang benar
const JAM_SCHEDULE = {
  Senin: {
    1: { start: "06:30", end: "07:50" },
    2: { start: "07:50", end: "08:30" },
    3: { start: "08:30", end: "09:10" },
    4: { start: "09:10", end: "09:50" },
    5: { start: "10:30", end: "11:05" },
    6: { start: "11:05", end: "11:40" },
    7: { start: "11:40", end: "12:15" },
    8: { start: "13:00", end: "13:35" },
    9: { start: "13:35", end: "14:10" },
  },
  Selasa: {
    1: { start: "07:00", end: "07:40" },
    2: { start: "07:40", end: "08:20" },
    3: { start: "08:20", end: "09:00" },
    4: { start: "09:00", end: "09:40" },
    5: { start: "10:30", end: "11:05" },
    6: { start: "11:05", end: "11:40" },
    7: { start: "11:40", end: "12:15" },
    8: { start: "13:00", end: "13:35" },
    9: { start: "13:35", end: "14:10" },
  },
  Rabu: {
    1: { start: "07:00", end: "07:40" },
    2: { start: "07:40", end: "08:20" },
    3: { start: "08:20", end: "09:00" },
    4: { start: "09:00", end: "09:40" },
    5: { start: "10:30", end: "11:05" },
    6: { start: "11:05", end: "11:40" },
    7: { start: "11:40", end: "12:15" },
    8: { start: "13:00", end: "13:35" },
    9: { start: "13:35", end: "14:10" },
  },
  Kamis: {
    1: { start: "07:00", end: "07:40" },
    2: { start: "07:40", end: "08:20" },
    3: { start: "08:20", end: "09:00" },
    4: { start: "09:00", end: "09:40" },
    5: { start: "10:30", end: "11:05" },
    6: { start: "11:05", end: "11:40" },
    7: { start: "11:40", end: "12:15" },
    8: { start: "13:00", end: "13:35" },
    9: { start: "13:35", end: "14:10" },
  },
  Jumat: {
    1: { start: "06:30", end: "07:05" },
    2: { start: "07:05", end: "07:40" },
    3: { start: "07:40", end: "08:15" },
    4: { start: "08:15", end: "08:50" },
    5: { start: "08:50", end: "09:10" },
    6: { start: "09:40", end: "10:10" },
    7: { start: "10:10", end: "10:40" },
  },
};

const HomeroomTeacherDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [activeAcademicInfo, setActiveAcademicInfo] = useState(null);

  const [stats, setStats] = useState({
    totalStudents: 0,
    maleStudents: 0,
    femaleStudents: 0,
    presentToday: 0,
    absentToday: 0,
    sakitToday: 0,
    izinToday: 0,
    alpaToday: 0,
    className: "",
    grade: "",
  });

  const [teachingData, setTeachingData] = useState({
    subjects: [],
    classesTaught: [],
    totalClassesTaught: 0,
  });

  const [todaySchedule, setTodaySchedule] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  // ✅ TAMBAH 2 STATE BARU UNTUK 2 KATEGORI ABSENT
  const [absentStudentsHomeroom, setAbsentStudentsHomeroom] = useState([]); // Kelas walian
  const [absentStudentsMapel, setAbsentStudentsMapel] = useState([]); // Mapel hari ini

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Extract user data
  const username = user?.username;
  const fullName = user?.full_name;
  const homeroomClassId = user?.homeroom_class_id;
  const teacherId = user?.teacher_id;
  const userId = user?.id;
  const userRole = user?.role;

  // Load active academic info
  useEffect(() => {
    const loadActiveAcademicInfo = async () => {
      const info = await getActiveAcademicInfo();
      setActiveAcademicInfo(info);
    };
    loadActiveAcademicInfo();
  }, []);

  // Check if mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  // Fungsi untuk mendapatkan nama hari dalam Bahasa Indonesia
  const getDayName = (dayIndex) => {
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    return days[dayIndex];
  };

  // Fungsi untuk format waktu
  const formatTime = (time) => {
    if (!time) return "-";
    return time.substring(0, 5);
  };

  // ✅ Fungsi untuk menghitung jam pelajaran berdasarkan start_time dan end_time
  const calculateSessionNumbers = (dayName, startTime, endTime) => {
    const daySchedule = JAM_SCHEDULE[dayName];
    if (!daySchedule) return [];

    const sessions = [];
    const startTimeStr = startTime.substring(0, 5);
    const endTimeStr = endTime.substring(0, 5);

    // Loop through all periods untuk hari tersebut
    for (const [period, timeSlot] of Object.entries(daySchedule)) {
      const periodStart = timeSlot.start;
      const periodEnd = timeSlot.end;

      // Check jika period ini termasuk dalam range start-end time
      // Period termasuk jika periodStart >= startTime dan periodEnd <= endTime
      if (periodStart >= startTimeStr && periodEnd <= endTimeStr) {
        sessions.push(parseInt(period));
      }
    }

    return sessions;
  };

  // Fungsi untuk styling badge berdasarkan status
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case "Sakit":
        return "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800";
      case "Izin":
        return "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800";
      case "Alpa":
        return "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800";
      default:
        return "bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800";
    }
  };

  // Fungsi untuk icon berdasarkan status
  const getStatusIcon = (status) => {
    switch (status) {
      case "Sakit":
        return "🏥";
      case "Izin":
        return "📋";
      case "Alpa":
        return "❌";
      default:
        return "❓";
    }
  };

  // Fungsi untuk menggabungkan jadwal berurutan
  const mergeConsecutiveSchedules = (schedules, dayName) => {
    if (!schedules || schedules.length === 0) return [];

    const merged = [];
    let currentBlock = null;

    schedules.forEach((schedule) => {
      // ✅ Calculate session numbers berdasarkan waktu sebenarnya
      const sessionNumbers = calculateSessionNumbers(
        dayName,
        schedule.start_time,
        schedule.end_time
      );

      if (!currentBlock) {
        currentBlock = {
          ...schedule,
          sessionCount: sessionNumbers.length,
          sessionNumbers: sessionNumbers,
        };
      } else {
        const canMerge =
          currentBlock.class_id === schedule.class_id &&
          currentBlock.subject === schedule.subject &&
          currentBlock.end_time === schedule.start_time;

        if (canMerge) {
          currentBlock.end_time = schedule.end_time;
          // ✅ Update session numbers dengan yang baru
          const newSessionNumbers = calculateSessionNumbers(
            dayName,
            currentBlock.start_time,
            schedule.end_time
          );
          currentBlock.sessionCount = newSessionNumbers.length;
          currentBlock.sessionNumbers = newSessionNumbers;
        } else {
          merged.push(currentBlock);
          currentBlock = {
            ...schedule,
            sessionCount: sessionNumbers.length,
            sessionNumbers: sessionNumbers,
          };
        }
      }
    });

    if (currentBlock) {
      merged.push(currentBlock);
    }

    return merged;
  };

  // Debug log
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("🏠 HomeroomTeacherDashboard mounted with user:", username);
      console.log("📅 Active Academic Info:", activeAcademicInfo);
    }
  }, [username, activeAcademicInfo]);

  // Fetch jadwal hari ini
  const fetchTodaySchedule = useCallback(async () => {
    if (!userId || !teacherId) return;

    try {
      const today = new Date();
      const dayName = getDayName(today.getDay());

      const { data: schedules, error: scheduleError } = await supabase
        .from("teacher_schedules")
        .select("*")
        .eq("teacher_id", userId)
        .eq("day", dayName)
        .order("start_time", { ascending: true });

      if (scheduleError) throw scheduleError;

      if (!schedules || schedules.length === 0) {
        setTodaySchedule([]);
        return [];
      }

      const classIds = [...new Set(schedules.map((s) => s.class_id))];

      const { data: assignments } = await supabase
        .from("teacher_assignments")
        .select("class_id, subject")
        .eq("teacher_id", teacherId)
        .in("class_id", classIds);

      const enrichedSchedules = schedules.map((schedule) => {
        const assignment = assignments?.find((a) => a.class_id === schedule.class_id);
        return {
          ...schedule,
          subject: assignment?.subject || "N/A",
          // ✅ TAMBAHKAN PROPERTY 'kelas' UNTUK COMPATIBILITY
          kelas: schedule.class_id,
        };
      });

      const mergedSchedule = mergeConsecutiveSchedules(enrichedSchedules, dayName);
      setTodaySchedule(mergedSchedule);
      return mergedSchedule;
    } catch (err) {
      console.error("❌ Error fetching today's schedule:", err);
      setTodaySchedule([]);
      return [];
    }
  }, [userId, teacherId]);

  // ✅ FUNCTION 1: Fetch absent dari kelas walian (presensi harian)
  const fetchAbsentStudentsHomeroom = useCallback(async () => {
    if (!homeroomClassId) return;

    try {
      const now = new Date();
      const offset = 7 * 60 * 60 * 1000;
      const todayIndonesia = new Date(now.getTime() + offset);
      const todayString = todayIndonesia.toISOString().split("T")[0];

      console.log("🏫 Fetching homeroom absent students for:", homeroomClassId);
      console.log("📅 Date:", todayString);

      // ✅ CEK SEMUA PRESENSI (termasuk yang hadir)
      const { data: allAttendances, error: allError } = await supabase
        .from("attendances")
        .select("id")
        .eq("date", todayString)
        .eq("class_id", homeroomClassId)
        .eq("type", "harian")
        .limit(1); // Cukup ambil 1 untuk cek aja

      if (allError) throw allError;

      // ✅ Kalau belum ada presensi sama sekali
      if (!allAttendances || allAttendances.length === 0) {
        console.log("⚠️ No attendance records yet for homeroom class today");
        setAbsentStudentsHomeroom([{ no_data: true }]); // Flag khusus
        return;
      }

      // ✅ Ambil yang absent aja
      const { data, error } = await supabase
        .from("attendances")
        .select(
          `
        student_id,
        status,
        students!inner(full_name),
        class_id
      `
        )
        .eq("date", todayString)
        .eq("class_id", homeroomClassId)
        .eq("type", "harian")
        .in("status", ["Sakit", "Izin", "Alpa"])
        .order("students(full_name)", { ascending: true });

      if (error) throw error;

      // Group by student
      const studentMap = new Map();
      (data || []).forEach((item) => {
        const studentId = item.student_id;
        if (!studentMap.has(studentId)) {
          studentMap.set(studentId, {
            id: studentId,
            full_name: item.students?.full_name || "Nama tidak tersedia",
            status: item.status,
            class_id: item.class_id,
          });
        }
      });

      const formatted = Array.from(studentMap.values()).sort((a, b) =>
        a.full_name.localeCompare(b.full_name)
      );

      console.log("✅ Homeroom absent students:", formatted.length);
      setAbsentStudentsHomeroom(formatted);
    } catch (err) {
      console.error("❌ Error fetching homeroom absent:", err);
      setAbsentStudentsHomeroom([]);
    }
  }, [homeroomClassId]);

  // ✅ FUNCTION 2: Fetch absent dari mapel hari ini - EXCLUDE HOMEROOM CLASS
  const fetchAbsentStudentsMapel = useCallback(
    async (teacherUUID, todaySchedule) => {
      if (!todaySchedule || todaySchedule.length === 0) {
        console.log("⚠️ No schedule today, skipping mapel absent fetch");
        setAbsentStudentsMapel([]);
        return;
      }

      try {
        const now = new Date();
        const offset = 7 * 60 * 60 * 1000;
        const todayIndonesia = new Date(now.getTime() + offset);
        const todayString = todayIndonesia.toISOString().split("T")[0];

        const classIdsToday = [
          ...new Set(
            todaySchedule.map((s) => s.class_id).filter((classId) => classId !== homeroomClassId)
          ),
        ];

        console.log("📚 Classes taught today (excluding homeroom):", classIdsToday);

        if (classIdsToday.length === 0) {
          console.log("ℹ️ Teacher only teaches homeroom class today");
          setAbsentStudentsMapel([]);
          return;
        }

        // ✅ CEK SEMUA PRESENSI DULU
        const { data: allAttendances, error: allError } = await supabase
          .from("attendances")
          .select("id")
          .eq("date", todayString)
          .in("class_id", classIdsToday)
          .eq("type", "mapel")
          .eq("teacher_id", teacherUUID)
          .limit(1);

        if (allError) throw allError;

        // ✅ Kalau belum ada presensi sama sekali
        if (!allAttendances || allAttendances.length === 0) {
          console.log("⚠️ No attendance records yet for mapel today");
          setAbsentStudentsMapel([{ no_data: true }]); // Flag khusus
          return;
        }

        // ✅ Ambil yang absent aja
        const { data, error } = await supabase
          .from("attendances")
          .select(
            `
          student_id,
          status,
          students!inner(full_name),
          class_id,
          subject
        `
          )
          .eq("date", todayString)
          .in("class_id", classIdsToday)
          .eq("type", "mapel")
          .eq("teacher_id", teacherUUID)
          .in("status", ["Sakit", "Izin", "Alpa"])
          .order("students(full_name)", { ascending: true });

        if (error) throw error;

        const studentMap = new Map();
        (data || []).forEach((item) => {
          const studentId = item.student_id;
          if (!studentMap.has(studentId)) {
            studentMap.set(studentId, {
              id: studentId,
              full_name: item.students?.full_name || "Nama tidak tersedia",
              status: item.status,
              class_id: item.class_id,
              subject: item.subject,
            });
          }
        });

        const formatted = Array.from(studentMap.values()).sort((a, b) => {
          if (a.class_id !== b.class_id) {
            return a.class_id.localeCompare(b.class_id);
          }
          return a.full_name.localeCompare(b.full_name);
        });

        console.log("✅ Mapel absent students:", formatted.length);
        setAbsentStudentsMapel(formatted);
      } catch (err) {
        console.error("❌ Error fetching mapel absent:", err);
        setAbsentStudentsMapel([]);
      }
    },
    [homeroomClassId]
  );

  // Memoize fetchHomeroomDashboardData
  const fetchHomeroomDashboardData = useCallback(async () => {
    if (!homeroomClassId) {
      setError(
        `Guru ${
          fullName || username || "ini"
        } bukan wali kelas. Dashboard ini khusus untuk wali kelas.`
      );
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      if (process.env.NODE_ENV === "development") {
        console.log("📊 Fetching data for homeroom class:", homeroomClassId);
      }

      // Get class info
      const { data: classInfo, error: classError } = await supabase
        .from("classes")
        .select("id, grade, academic_year")
        .eq("id", homeroomClassId)
        .single();

      if (classError || !classInfo) {
        throw new Error("Kelas homeroom tidak ditemukan: " + (classError?.message || "No data"));
      }

      const currentYear = classInfo.academic_year;
      // ✅ PAKAI TANGGAL WIB YANG SAMA DENGAN fetchAbsentStudents
      const now = new Date();
      const offset = 7 * 60 * 60 * 1000; // UTC+7 (WIB)
      const todayIndonesia = new Date(now.getTime() + offset);
      const todayString = todayIndonesia.toISOString().split("T")[0];
      const activeSemester = activeAcademicInfo?.semester || 1;

      if (process.env.NODE_ENV === "development") {
        console.log("📅 Today (WIB):", todayString);
      }

      const [studentsResult, attendanceResult, announcementsResult, teachingResult] =
        await Promise.all([
          supabase
            .from("students")
            .select("id, full_name, gender")
            .eq("class_id", homeroomClassId)
            .eq("academic_year", classInfo.academic_year)
            .eq("is_active", true),

          supabase
            .from("attendances")
            .select("id, student_id, date, status, type, class_id")
            .eq("date", todayString) // ← GANTI JADI 'todayString'
            .eq("class_id", homeroomClassId),

          supabase
            .from("announcement")
            .select("id, title, content, created_at")
            .order("created_at", { ascending: false })
            .limit(5),

          supabase
            .from("teacher_assignments")
            .select("id, class_id, subject, academic_year, semester")
            .eq("teacher_id", teacherId)
            .eq("academic_year", currentYear)
            .eq("semester", activeSemester),
        ]);

      const students = studentsResult.data || [];
      const attendances = attendanceResult.data || [];
      let assignments = teachingResult.data || [];

      if (teachingResult.error) {
        console.error("❌ Teacher assignments error:", teachingResult.error);
        assignments = [];
      }

      // Calculate gender stats
      const maleCount = students.filter((s) => s.gender === "L").length;
      const femaleCount = students.filter((s) => s.gender === "P").length;

      // Calculate attendance stats
      const uniqueStudentsAbsent = new Set();
      const sakitCount = new Set();
      const izinCount = new Set();
      const alpaCount = new Set();

      attendances.forEach((att) => {
        const status = att.status;

        if (status === "Sakit") {
          uniqueStudentsAbsent.add(att.student_id);
          sakitCount.add(att.student_id);
        } else if (status === "Izin") {
          uniqueStudentsAbsent.add(att.student_id);
          izinCount.add(att.student_id);
        } else if (status === "Alpa") {
          uniqueStudentsAbsent.add(att.student_id);
          alpaCount.add(att.student_id);
        }
      });

      const presentCount = students.length - uniqueStudentsAbsent.size;

      // ✅ Fetch class info separately
      let classesData = [];
      if (assignments.length > 0) {
        const classIds = [...new Set(assignments.map((a) => a.class_id))];
        const { data: fetchedClasses } = await supabase
          .from("classes")
          .select("id, grade, academic_year")
          .in("id", classIds)
          .eq("academic_year", currentYear);

        classesData = fetchedClasses || [];
      }

      // Process teaching data
      const subjects = [...new Set(assignments.map((a) => a.subject))];
      const classesTaught = assignments.map((a) => {
        const classInfo = classesData.find((c) => c.id === a.class_id);
        return {
          id: a.class_id,
          className: classInfo?.id || a.class_id,
          grade: classInfo?.grade || "",
          subject: a.subject,
        };
      });

      setStats({
        totalStudents: students.length,
        maleStudents: maleCount,
        femaleStudents: femaleCount,
        presentToday: presentCount,
        absentToday: uniqueStudentsAbsent.size,
        sakitToday: sakitCount.size,
        izinToday: izinCount.size,
        alpaToday: alpaCount.size,
        className: homeroomClassId,
        grade: classInfo.grade,
      });

      setTeachingData({
        subjects,
        classesTaught,
        totalClassesTaught: assignments.length,
      });

      setAnnouncements(announcementsResult.data || []);

      // ✅ FETCH JADWAL HARI INI DULU
      const schedule = await fetchTodaySchedule();

      // ✅ FETCH 2 ABSENT LISTS
      await fetchAbsentStudentsHomeroom(); // Kelas walian
      await fetchAbsentStudentsMapel(userId, schedule); // Mapel hari ini

      setError(null);
    } catch (err) {
      console.error("❌ Error fetching homeroom dashboard data:", err);
      setError("Gagal memuat data dashboard homeroom: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [
    homeroomClassId,
    teacherId,
    userId,
    fullName,
    username,
    fetchTodaySchedule,
    fetchAbsentStudentsHomeroom,
    fetchAbsentStudentsMapel,
    activeAcademicInfo,
  ]);

  // Fetch data
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("🏠 User has homeroom_class_id:", homeroomClassId);
    }
    fetchHomeroomDashboardData();
  }, [fetchHomeroomDashboardData]);

  const handleRetry = () => {
    fetchHomeroomDashboardData();
  };

  // Navigation handlers
  const handleTeacherAttendance = useCallback(() => {
    navigate("/attendance-teacher");
  }, [navigate]);

  const handleStudentAttendance = useCallback(() => {
    navigate("/attendance");
  }, [navigate]);

  const handleGrades = useCallback(() => {
    navigate("/nilai-siswa");
  }, [navigate]);

  const handleStudents = useCallback(() => {
    navigate("/students");
  }, [navigate]);

  const handleReports = useCallback(() => {
    navigate("/reports");
  }, [navigate]);

  const handleDataGuru = useCallback(() => {
    navigate("/teachers");
  }, [navigate]);

  const handleDataKelas = useCallback(() => {
    navigate("/classes");
  }, [navigate]);

  const handleDataSiswa = useCallback(() => {
    navigate("/students");
  }, [navigate]);

  const handleCatatanSiswa = useCallback(() => {
    navigate("/student-notes");
  }, [navigate]);

  const handleJadwalSaya = useCallback(() => {
    navigate("/my-schedule");
  }, [navigate]);

  // Memoize calculations
  const subjectBreakdown = useMemo(() => {
    const breakdown = {};
    teachingData.classesTaught.forEach((cls) => {
      if (!breakdown[cls.subject]) {
        breakdown[cls.subject] = [];
      }
      breakdown[cls.subject].push(cls.className);
    });
    return breakdown;
  }, [teachingData.classesTaught]);

  const primarySubject = useMemo(() => {
    if (Object.keys(subjectBreakdown).length === 0) return "";
    return Object.keys(subjectBreakdown).reduce(
      (a, b) => (subjectBreakdown[a].length > subjectBreakdown[b].length ? a : b),
      teachingData.subjects[0] || ""
    );
  }, [subjectBreakdown, teachingData.subjects]);

  const currentDay = useMemo(() => {
    const today = new Date();
    return getDayName(today.getDay());
  }, []);

  // Quick Actions Component untuk Mobile
  const QuickActionsMobile = () => (
    <div className="mb-6">
      <h2 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">
        Aksi Cepat
      </h2>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <button
          onClick={handleTeacherAttendance}
          className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 shadow-sm active:scale-95 touch-manipulation min-h-[90px]"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center mb-2 shadow-md">
            <span className="text-white text-lg sm:text-xl">👨‍🏫</span>
          </div>
          <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 text-center">
            Presensi Guru
          </span>
        </button>

        <button
          onClick={handleStudentAttendance}
          className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 hover:border-green-300 dark:hover:border-green-600 transition-all duration-200 shadow-sm active:scale-95 touch-manipulation min-h-[90px]"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center mb-2 shadow-md">
            <span className="text-white text-lg sm:text-xl">👨‍🎓</span>
          </div>
          <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 text-center">
            Presensi Siswa
          </span>
        </button>

        <button
          onClick={handleGrades}
          className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-200 shadow-sm active:scale-95 touch-manipulation min-h-[90px]"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center mb-2 shadow-md">
            <span className="text-white text-lg sm:text-xl">📊</span>
          </div>
          <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 text-center">
            Nilai Siswa
          </span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <button
          onClick={handleDataGuru}
          className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/30 hover:border-orange-300 dark:hover:border-orange-600 transition-all duration-200 shadow-sm active:scale-95 touch-manipulation min-h-[90px]"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center mb-2 shadow-md">
            <span className="text-white text-lg sm:text-xl">👥</span>
          </div>
          <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 text-center">
            Data Guru
          </span>
        </button>

        <button
          onClick={handleDataKelas}
          className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-cyan-50 dark:hover:bg-cyan-900/30 hover:border-cyan-300 dark:hover:border-cyan-600 transition-all duration-200 shadow-sm active:scale-95 touch-manipulation min-h-[90px]"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-lg flex items-center justify-center mb-2 shadow-md">
            <span className="text-white text-lg sm:text-xl">🏫</span>
          </div>
          <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 text-center">
            Data Kelas
          </span>
        </button>

        <button
          onClick={handleDataSiswa}
          className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-pink-50 dark:hover:bg-pink-900/30 hover:border-pink-300 dark:hover:border-pink-600 transition-all duration-200 shadow-sm active:scale-95 touch-manipulation min-h-[90px]"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-pink-400 to-pink-600 rounded-lg flex items-center justify-center mb-2 shadow-md">
            <span className="text-white text-lg sm:text-xl">👤</span>
          </div>
          <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 text-center">
            Data Siswa
          </span>
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-500"></div>
            <span className="ml-4 text-slate-600 dark:text-slate-400">
              Memuat dashboard homeroom...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-amber-200 dark:border-amber-700 p-6 sm:p-8 text-center">
            <div className="text-amber-500 dark:text-amber-400 text-4xl sm:text-5xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">Info</h3>
            <p className="text-amber-600 dark:text-amber-400 mb-4 text-sm sm:text-base">{error}</p>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-4">
              Username: {username}
              <br />
              Role: {userRole}
              <br />
              Homeroom Class: {homeroomClassId || "Tidak ada"}
              <br />
              {activeAcademicInfo?.displayText && (
                <>
                  Semester: {activeAcademicInfo.displayText}
                  <br />
                </>
              )}
            </p>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6">
        {/* 🆕 Pop-up Pengumuman */}
        <AnnouncementPopup userId={user?.id} userRole="walikelas" />

        {/* Header */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 sm:p-5 md:p-6 lg:p-8 transition-colors duration-200">
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-2 sm:mb-3">
                Selamat Datang, {fullName || username}
              </h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Wali Kelas {stats.className}
                </span>
                {primarySubject && (
                  <span className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Guru {primarySubject}
                  </span>
                )}
                {activeAcademicInfo?.displayText && (
                  <span className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    {activeAcademicInfo.displayText}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* AKSI CEPAT MOBILE */}
        {isMobile && <QuickActionsMobile />}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6 mb-4 sm:mb-6 md:mb-8">
          {/* Total Siswa Kelas */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-3 sm:p-4 md:p-6 transition-colors duration-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Siswa Kelas {stats.className}
                </p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {stats.totalStudents}
                </p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center ml-2 shadow-lg">
                <span className="text-white text-base sm:text-lg md:text-2xl">👨‍🎓</span>
              </div>
            </div>
          </div>

          {/* Gender Ratio */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-3 sm:p-4 md:p-6 transition-colors duration-200">
            <div>
              <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mb-2 sm:mb-3">
                L / P
              </p>
              <div className="flex justify-between items-center">
                <div className="text-center">
                  <p className="text-base sm:text-lg md:text-xl font-bold text-blue-700 dark:text-blue-400">
                    {stats.maleStudents}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">L</p>
                </div>
                <div className="text-slate-400 dark:text-slate-600">/</div>
                <div className="text-center">
                  <p className="text-base sm:text-lg md:text-xl font-bold text-pink-600 dark:text-pink-400">
                    {stats.femaleStudents}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">P</p>
                </div>
              </div>
            </div>
          </div>

          {/* Hadir Hari Ini */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-3 sm:p-4 md:p-6 transition-colors duration-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Hadir Hari Ini
                </p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                  {stats.presentToday}
                </p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center ml-2 shadow-lg">
                <span className="text-white text-base sm:text-lg md:text-2xl">✅</span>
              </div>
            </div>
          </div>

          {/* Tidak Hadir */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-3 sm:p-4 md:p-6 transition-colors duration-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Tidak Hadir
                </p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-red-700 dark:text-red-400 mb-2">
                  {stats.absentToday}
                </p>
                {stats.absentToday > 0 && (
                  <div className="space-y-0.5 text-xs text-slate-600 dark:text-slate-400">
                    {stats.sakitToday > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-orange-500 dark:text-orange-400">🏥</span>
                        <span>Sakit: {stats.sakitToday}</span>
                      </div>
                    )}
                    {stats.izinToday > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-blue-500 dark:text-blue-400">📋</span>
                        <span>Izin: {stats.izinToday}</span>
                      </div>
                    )}
                    {stats.alpaToday > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-red-500 dark:text-red-400">✖</span>
                        <span>Alpa: {stats.alpaToday}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-xl flex items-center justify-center ml-2 shadow-lg">
                <span className="text-white text-base sm:text-lg md:text-2xl">📊</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Desktop */}
        {!isMobile && (
          <div className="mb-4 sm:mb-6 md:mb-8">
            <h2 className="text-base sm:text-lg md:text-xl font-semibold text-slate-800 dark:text-slate-200 mb-3 sm:mb-4">
              Aksi Cepat
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {/* Presensi Guru */}
              <button
                onClick={handleTeacherAttendance}
                className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-1 active:scale-95 touch-manipulation"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                    <span className="text-white text-lg sm:text-xl">👨‍🏫</span>
                  </div>
                  <div className="text-left">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                      Presensi Guru
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                      Presensi Sendiri
                    </p>
                  </div>
                </div>
              </button>

              {/* Presensi Siswa */}
              <button
                onClick={handleStudentAttendance}
                className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-1 active:scale-95 touch-manipulation"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                    <span className="text-white text-lg sm:text-xl">📋</span>
                  </div>
                  <div className="text-left">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                      Presensi Siswa
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                      Kelas {stats.className}
                    </p>
                  </div>
                </div>
              </button>

              {/* Input Nilai */}
              {primarySubject && (
                <button
                  onClick={handleGrades}
                  className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-1 active:scale-95 touch-manipulation"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                      <span className="text-white text-lg sm:text-xl">📝</span>
                    </div>
                    <div className="text-left">
                      <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                        Input Nilai
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                        {primarySubject}
                      </p>
                    </div>
                  </div>
                </button>
              )}

              {/* Data Siswa */}
              <button
                onClick={handleStudents}
                className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:bg-orange-50 dark:hover:bg-orange-900/30 hover:border-orange-300 dark:hover:border-orange-600 transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-1 active:scale-95 touch-manipulation"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                    <span className="text-white text-lg sm:text-xl">👥</span>
                  </div>
                  <div className="text-left">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                      Data Siswa
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                      Kelas {stats.className}
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6 mb-4 sm:mb-6 md:mb-8">
          {/* Left Column: Mata Pelajaran & Kelas + 2 Daftar Siswa Tidak Hadir */}
          <div>
            {/* Mata Pelajaran & Kelas */}
            {teachingData.classesTaught.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 sm:p-5 md:p-6 transition-colors duration-200 mb-6">
                <h3 className="text-base sm:text-lg md:text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                  <span className="mr-2">📖</span>
                  Mata Pelajaran & Kelas
                </h3>

                <div className="space-y-4">
                  {Object.entries(subjectBreakdown).map(([subject, classes]) => {
                    const classByGrade = {};
                    classes.forEach((className) => {
                      const grade = className.charAt(0);
                      if (!classByGrade[grade]) {
                        classByGrade[grade] = [];
                      }
                      classByGrade[grade].push(className);
                    });

                    return (
                      <div
                        key={subject}
                        className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 sm:p-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                            {subject}
                          </h4>
                          <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            {classes.length} kelas
                          </span>
                        </div>

                        <div className="space-y-2">
                          {Object.entries(classByGrade)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([grade, gradeClasses]) => (
                              <div key={grade} className="flex flex-wrap gap-2">
                                {gradeClasses.sort().map((className, index) => (
                                  <span
                                    key={index}
                                    className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                                      className === stats.className
                                        ? "bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                                        : "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                    }`}
                                  >
                                    {className}
                                    {className === stats.className && (
                                      <span className="ml-1 text-green-600 dark:text-green-400">
                                        👑
                                      </span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ✅ SECTION 1: SISWA TIDAK HADIR - KELAS WALIAN */}
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-gray-100 mb-3 flex items-center">
                    <span className="mr-2 text-blue-600 dark:text-blue-400">🏫</span>
                    Siswa Tidak Hadir - Kelas {homeroomClassId}
                  </h4>

                  {absentStudentsHomeroom.length > 0 && absentStudentsHomeroom[0]?.no_data ? (
                    <div className="text-center py-4 border border-amber-200 dark:border-amber-700 rounded-lg bg-amber-50 dark:bg-amber-900/30 mb-6">
                      <div className="text-xl mb-2">⚠️</div>
                      <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                        Anda belum melakukan presensi hari ini
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                        Silakan lakukan presensi harian untuk kelas {homeroomClassId}
                      </p>
                    </div>
                  ) : absentStudentsHomeroom.length > 0 ? (
                    <div className="overflow-x-auto mb-6">
                      <table className="w-full text-sm">
                        <thead className="text-xs text-slate-500 dark:text-gray-400 border-b border-slate-200 dark:border-gray-700">
                          <tr>
                            <th className="py-2 px-3 text-left w-12">No</th>
                            <th className="py-2 px-3 text-left">Nama Siswa</th>
                            <th className="py-2 px-3 text-left w-24">Kelas</th>
                            <th className="py-2 px-3 text-left w-32">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {absentStudentsHomeroom.map((student, index) => (
                            <tr
                              key={student.id}
                              className="border-b border-slate-100 dark:border-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                              <td className="py-2 px-3 text-slate-600 dark:text-gray-400">
                                {index + 1}
                              </td>
                              <td className="py-2 px-3 font-medium text-slate-800 dark:text-gray-200">
                                {student.full_name}
                              </td>
                              <td className="py-2 px-3 text-slate-600 dark:text-gray-400">
                                {student.class_id}
                              </td>
                              <td className="py-2 px-3">
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeStyle(
                                    student.status
                                  )}`}
                                >
                                  {getStatusIcon(student.status)} {student.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="mt-3 text-xs text-slate-500 dark:text-gray-400">
                        Total: {absentStudentsHomeroom.length} siswa tidak hadir
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 border border-slate-200 dark:border-gray-700 rounded-lg bg-slate-50 dark:bg-gray-900/30 mb-6">
                      <div className="text-xl mb-2">🎉</div>
                      <p className="text-sm text-slate-600 dark:text-gray-400">
                        Semua Siswa Kelas {homeroomClassId} Hadir Hari Ini
                      </p>
                    </div>
                  )}
                </div>

                {/* ✅ SECTION 2: SISWA TIDAK HADIR - MATA PELAJARAN */}
                <div className="pt-6 border-t border-slate-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-gray-100 mb-3 flex items-center">
                    <span className="mr-2 text-purple-600 dark:text-purple-400">📚</span>
                    Siswa Tidak Hadir - Mata Pelajaran {primarySubject ? `(${primarySubject})` : ""}
                  </h4>

                  {absentStudentsMapel.length > 0 && absentStudentsMapel[0]?.no_data ? (
                    <div className="text-center py-4 border border-amber-200 dark:border-amber-700 rounded-lg bg-amber-50 dark:bg-amber-900/30">
                      <div className="text-xl mb-2">⚠️</div>
                      <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                        Anda belum melakukan presensi mata pelajaran hari ini
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                        Silakan lakukan presensi mapel di kelas yang Anda ajar
                      </p>
                    </div>
                  ) : absentStudentsMapel.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-xs text-slate-500 dark:text-gray-400 border-b border-slate-200 dark:border-gray-700">
                          <tr>
                            <th className="py-2 px-3 text-left w-12">No</th>
                            <th className="py-2 px-3 text-left">Nama Siswa</th>
                            <th className="py-2 px-3 text-left w-24">Kelas</th>
                            <th className="py-2 px-3 text-left w-32">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {absentStudentsMapel.map((student, index) => (
                            <tr
                              key={student.id}
                              className="border-b border-slate-100 dark:border-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                              <td className="py-2 px-3 text-slate-600 dark:text-gray-400">
                                {index + 1}
                              </td>
                              <td className="py-2 px-3 font-medium text-slate-800 dark:text-gray-200">
                                {student.full_name}
                              </td>
                              <td className="py-2 px-3 text-slate-600 dark:text-gray-400">
                                {student.class_id}
                              </td>
                              <td className="py-2 px-3">
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeStyle(
                                    student.status
                                  )}`}
                                >
                                  {getStatusIcon(student.status)} {student.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="mt-3 text-xs text-slate-500 dark:text-gray-400">
                        Total: {absentStudentsMapel.length} siswa tidak hadir
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 border border-slate-200 dark:border-gray-700 rounded-lg bg-slate-50 dark:bg-gray-900/30">
                      <div className="text-xl mb-2">✅</div>
                      <p className="text-sm text-slate-600 dark:text-gray-400">
                        {todaySchedule.length > 0
                          ? "Semua siswa hadir di mata pelajaran Anda hari ini"
                          : "Tidak ada jadwal mengajar hari ini"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Jika tidak ada mata pelajaran */}
            {teachingData.classesTaught.length === 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 sm:p-5 md:p-6 transition-colors duration-200 mb-6">
                <h3 className="text-base sm:text-lg md:text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                  <span className="mr-2">📖</span>
                  Mata Pelajaran & Kelas
                </h3>
                <div className="text-center py-8">
                  <div className="text-3xl mb-3">📚</div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Belum ada data mata pelajaran
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Jadwal Hari Ini */}
          <div>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 sm:p-5 md:p-6 transition-colors duration-200">
              <h3 className="text-base sm:text-lg md:text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                <span className="mr-2">🗓️</span>
                Jadwal Hari Ini - {currentDay}
              </h3>

              {todaySchedule.length > 0 ? (
                <div className="space-y-3">
                  {todaySchedule.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="text-center min-w-[70px]">
                            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                              {schedule.sessionCount}JP ({schedule.sessionNumbers.join("-")})
                            </div>
                            <div className="font-semibold text-blue-700 dark:text-blue-400 text-xs sm:text-sm">
                              {formatTime(schedule.start_time)}
                            </div>
                            <div className="text-xs text-slate-400 dark:text-slate-600">-</div>
                            <div className="font-semibold text-blue-700 dark:text-blue-400 text-xs sm:text-sm">
                              {formatTime(schedule.end_time)}
                            </div>
                          </div>
                          <div className="h-auto min-h-[60px] w-px bg-slate-200 dark:bg-slate-700"></div>
                          <div className="flex-1">
                            <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm sm:text-base mb-1">
                              {schedule.subject}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                              <span className="flex items-center gap-1">
                                <span>🏫</span>
                                <span>Kelas {schedule.classes?.id || schedule.class_id}</span>
                              </span>
                              {schedule.room_number && (
                                <>
                                  <span className="text-slate-400 dark:text-slate-600">•</span>
                                  <span className="flex items-center gap-1">
                                    <span>📍</span>
                                    <span>R.{schedule.room_number}</span>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        {schedule.class_id === stats.className && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 whitespace-nowrap">
                            <span className="mr-1">👑</span>
                            Wali
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-10 md:py-12">
                  <div className="text-4xl sm:text-5xl md:text-5xl mb-4">📅</div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 text-sm sm:text-base">
                    Tidak Ada Jadwal
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    Anda Tidak Memiliki Jadwal Mengajar Hari Ini
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                    Selamat Menikmati Hari Libur ! 🎉
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pengumuman Terkini */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 sm:p-5 md:p-6 transition-colors duration-200">
          <h3 className="text-base sm:text-lg md:text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
            <span className="mr-2">📢</span>
            Pengumuman Terkini
          </h3>
          {announcements.length > 0 ? (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="border-l-4 border-blue-500 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/30 pl-4 py-3 rounded-r-lg"
                >
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                    {announcement.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {announcement.content}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                    {new Date(announcement.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 sm:py-7 md:py-8">
              <div className="text-3xl sm:text-4xl md:text-4xl mb-3">📢</div>
              <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-1 text-sm sm:text-base">
                Belum Ada Pengumuman
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Pengumuman terbaru akan ditampilkan di sini
              </p>
            </div>
          )}
        </div>

        {/* 💬 Saran & Masukan Guru */}
        <div className="mt-6">
          <FeedbackGuru guruId={userId} />
        </div>
      </div>
    </div>
  );
};

export default HomeroomTeacherDashboard;
