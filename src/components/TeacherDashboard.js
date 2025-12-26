//[file name]: TeacherDashboard.js - WITH ACADEMIC YEAR SERVICE
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import AnnouncementPopup from "./AnnouncementPopup";
import { getActiveAcademicInfo } from "../services/academicYearService";

const TeacherDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeAcademicInfo, setActiveAcademicInfo] = useState(null);
  const [currentAcademicYearId, setCurrentAcademicYearId] = useState(null);

  const [stats, setStats] = useState({
    totalStudents: 0,
    totalClasses: 0,
    subjects: [],
    classesTaught: [],
  });
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load active academic info
  useEffect(() => {
    const loadActiveAcademicInfo = async () => {
      const info = await getActiveAcademicInfo();
      setActiveAcademicInfo(info);
    };
    loadActiveAcademicInfo();
  }, []);

  // Dark mode detection
  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );
    setIsDarkMode(darkModeMediaQuery.matches);

    const handleChange = (e) => {
      setIsDarkMode(e.matches);
    };

    darkModeMediaQuery.addEventListener("change", handleChange);
    return () => darkModeMediaQuery.removeEventListener("change", handleChange);
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

  // Fungsi untuk mendapatkan nama hari
  const getDayName = (dayIndex) => {
    const days = [
      "Minggu",
      "Senin",
      "Selasa",
      "Rabu",
      "Kamis",
      "Jumat",
      "Sabtu",
    ];
    return days[dayIndex];
  };

  // Fungsi untuk format waktu
  const formatTime = (time) => {
    if (!time) return "-";
    return time.substring(0, 5);
  };

  // Get current day name
  const currentDay = getDayName(new Date().getDay());

  useEffect(() => {
    console.log("🎯 TeacherDashboard received user:", user);
    console.log("📅 Active Academic Info:", activeAcademicInfo);

    if (user?.teacher_id && activeAcademicInfo) {
      // ✅ TAMBAH CEK activeAcademicInfo
      const teacherCode = user.teacher_id;
      const teacherUUID = user.id;
      console.log("✅ Found teacher_id:", teacherCode);
      console.log("✅ Found user.id:", teacherUUID);
      console.log("✅ Active Semester:", activeAcademicInfo.semester);
      fetchTeacherData(teacherCode, teacherUUID);
    } else if (user?.teacher_id && !activeAcademicInfo) {
      // ✅ JIKA USER ADA TAPI academicInfo BELUM
      console.log("⏳ Waiting for academic info...");
      // Biarin loading aja
    } else if (!user?.teacher_id) {
      console.log("❌ Teacher ID not found in user object:", user);
      setError("Teacher ID tidak ditemukan. Pastikan data guru sudah lengkap.");
      setLoading(false);
    }
  }, [user, activeAcademicInfo]); // ✅ TAMBAH activeAcademicInfo KE DEPENDENCY

  // Fetch jadwal hari ini
  const fetchTodaySchedule = async (
    teacherCode,
    teacherUUID,
    academicYearId
  ) => {
    try {
      const todayDay = getDayName(new Date().getDay());
      console.log("📅 Hari ini:", todayDay, "| Teacher UUID:", teacherUUID);
      console.log("📅 Academic Year ID:", academicYearId);

      // Weekend check
      if (todayDay === "Sabtu" || todayDay === "Minggu") {
        console.log("⚠️ Weekend - tidak ada jadwal");
        setTodaySchedule([]);
        return [];
      }

      // Query teacher_schedules
      const { data, error } = await supabase
        .from("teacher_schedules")
        .select("*")
        .eq("teacher_id", teacherUUID)
        .eq("day", todayDay)
        .order("start_time", { ascending: true });

      if (error) {
        console.error("❌ Error fetching schedule:", error);
        setTodaySchedule([]);
        return [];
      }

      if (!data || data.length === 0) {
        console.log("ℹ️ Tidak ada jadwal untuk hari ini");
        setTodaySchedule([]);
        return [];
      }

      console.log("📅 Schedule data:", data);

      // Get class details untuk jadwal
      const classIds = [...new Set(data.map((d) => d.class_id))];
      console.log("🎓 Class IDs from schedule:", classIds);

      const { data: classesData } = await supabase
        .from("classes")
        .select("id, grade")
        .in("id", classIds);

      console.log("🏫 Classes for schedule:", classesData);

      // Create mapping class_id -> class info
      const classMap = {};
      classesData?.forEach((c) => {
        classMap[c.id] = { id: c.id, grade: c.grade };
      });

      // ✅ GUNAKAN SEMESTER DARI ACADEMIC YEAR SERVICE
      const activeSemester = activeAcademicInfo.semester; // ✅ UDAH PASTI ADA
      console.log("📅 Active Semester (from service):", activeSemester);

      const { data: assignments } = await supabase
        .from("teacher_assignments")
        .select("class_id, subject")
        .eq("teacher_id", teacherCode)
        .eq("academic_year_id", academicYearId)
        .eq("semester", activeSemester) // ✅ GUNAKAN DARI SERVICE
        .in("class_id", classIds);

      console.log("📚 Assignments for schedule:", assignments);

      // Create mapping class_id -> subject
      const subjectMap = {};
      assignments?.forEach((a) => {
        subjectMap[a.class_id] = a.subject;
      });

      // Merge consecutive schedules
      const merged = [];
      let current = null;

      data.forEach((item) => {
        const mapel = subjectMap[item.class_id] || "Mata Pelajaran";
        const classInfo = classMap[item.class_id];
        const kelas = classInfo?.id || `Kelas ${item.class_id}`;

        if (!current) {
          current = {
            mapel,
            kelas,
            jam_mulai: formatTime(item.start_time),
            jam_selesai: formatTime(item.end_time),
            class_id: item.class_id,
          };
        } else {
          const sameClass = current.class_id === item.class_id;
          const sameSubject = current.mapel === mapel;
          const consecutive =
            current.jam_selesai === formatTime(item.start_time);

          if (sameClass && sameSubject && consecutive) {
            current.jam_selesai = formatTime(item.end_time);
          } else {
            merged.push({ ...current });
            delete merged[merged.length - 1].class_id;
            current = {
              mapel,
              kelas,
              jam_mulai: formatTime(item.start_time),
              jam_selesai: formatTime(item.end_time),
              class_id: item.class_id,
            };
          }
        }
      });

      // Push last block
      if (current) {
        delete current.class_id;
        merged.push(current);
      }

      console.log("✅ Jadwal merged:", merged);
      setTodaySchedule(merged);
      return merged;
    } catch (error) {
      console.error("❌ FATAL ERROR in fetchTodaySchedule:", error);
      setTodaySchedule([]);
      return [];
    }
  };

  const fetchTeacherData = async (teacherCode, teacherUUID) => {
    try {
      setLoading(true);
      setError(null);

      // 1. Get current academic year ID
      const { data: academicYearData, error: yearError } = await supabase
        .from("academic_years")
        .select("id, year")
        .eq("is_active", true)
        .single();

      if (yearError || !academicYearData) {
        throw new Error("Tahun ajaran aktif tidak ditemukan.");
      }

      const academicYearId = academicYearData.id;
      setCurrentAcademicYearId(academicYearId);

      console.log(
        "📅 Academic Year ID:",
        academicYearId,
        "Year:",
        academicYearData.year
      );

      // ✅ GUNAKAN SEMESTER DARI ACADEMIC YEAR SERVICE
      const activeSemester = activeAcademicInfo?.semester || 1;
      console.log("📅 Active Semester (from service):", activeSemester);

      // 2. Get teacher assignments - FILTER BY SEMESTER DARI SERVICE
      const { data: assignments, error: assignError } = await supabase
        .from("teacher_assignments")
        .select("id, class_id, subject, academic_year_id, semester")
        .eq("teacher_id", teacherCode)
        .eq("academic_year_id", academicYearId)
        .eq("semester", activeSemester); // ✅ FILTER SEMESTER AKTIF DARI SERVICE

      if (assignError) {
        console.error("❌ Teacher assignments error:", assignError);
        throw assignError;
      }

      if (!assignments || assignments.length === 0) {
        throw new Error(
          `Tidak ada penugasan untuk ${
            activeAcademicInfo?.displayText || "semester ini"
          }`
        );
      }

      console.log("✅ Teacher assignments:", assignments);

      // 3. Get class details terpisah
      const classIds = [...new Set(assignments.map((a) => a.class_id))];
      console.log("🎓 Class IDs to fetch:", classIds);

      const { data: classesData } = await supabase
        .from("classes")
        .select("id, grade")
        .in("id", classIds);

      console.log("🏫 Classes data:", classesData);

      // 4. Gabungkan manual
      const assignmentsWithClasses = assignments.map((assignment) => {
        const classData = classesData?.find(
          (c) => c.id === assignment.class_id
        );
        return {
          ...assignment,
          classes: classData || {
            id: assignment.class_id,
            grade: assignment.class_id.charAt(0),
          },
        };
      });

      console.log("✅ Final assignments with classes:", assignmentsWithClasses);

      // Get unique subjects and classes
      const subjects = [
        ...new Set(assignmentsWithClasses.map((a) => a.subject)),
      ];
      const classesTaught = assignmentsWithClasses.map((a) => ({
        id: a.class_id,
        className: a.classes.id,
        grade: a.classes.grade,
        subject: a.subject,
      }));

      // Count total students
      const { data: studentsData } = await supabase
        .from("students")
        .select("id, class_id")
        .in("class_id", classIds);

      const totalStudents = studentsData ? studentsData.length : 0;

      // Get announcements
      const { data: announcementsData } = await supabase
        .from("announcement")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      setStats({
        totalStudents,
        totalClasses: classIds.length,
        subjects,
        classesTaught,
      });

      setAnnouncements(announcementsData || []);

      // Fetch today's schedule
      await fetchTodaySchedule(teacherCode, teacherUUID, academicYearId);
    } catch (err) {
      console.error("❌ Error in fetchTeacherData:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (user?.teacher_id || user?.id) {
      fetchTeacherData(user.teacher_id, user.id);
    }
  };

  // Navigation handlers
  const handleTeacherAttendance = () => navigate("/attendance-teacher");
  const handleStudentAttendance = () => navigate("/attendance");
  const handleGrades = () => navigate("/grades");
  const handleReports = () => navigate("/reports");
  const handleDataGuru = () => navigate("/teachers");
  const handleDataKelas = () => navigate("/classes");
  const handleDataSiswa = () => navigate("/students");
  const handleCatatanSiswa = () => navigate("/student-notes");
  const handleJadwalSaya = () => navigate("/my-schedule");

  // Quick Actions Mobile
  const QuickActionsMobile = () => (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-gray-100 mb-3">
        Aksi Cepat
      </h2>
      <div className="grid grid-cols-3 gap-2 mb-2">
        <button
          onClick={handleTeacherAttendance}
          className="flex flex-col items-center justify-center p-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 shadow-sm h-full">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center mb-1 shadow-md">
            <span className="text-white text-sm">👨‍🏫</span>
          </div>
          <span className="text-xs font-medium text-slate-800 dark:text-gray-200 text-center leading-tight">
            Presensi Guru
          </span>
        </button>
        <button
          onClick={handleStudentAttendance}
          className="flex flex-col items-center justify-center p-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-600 transition-all duration-200 shadow-sm h-full">
          <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center mb-1 shadow-md">
            <span className="text-white text-sm">👨‍🎓</span>
          </div>
          <span className="text-xs font-medium text-slate-800 dark:text-gray-200 text-center leading-tight">
            Presensi Siswa
          </span>
        </button>
        <button
          onClick={handleGrades}
          className="flex flex-col items-center justify-center p-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-200 shadow-sm h-full">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center mb-1 shadow-md">
            <span className="text-white text-sm">📊</span>
          </div>
          <span className="text-xs font-medium text-slate-800 dark:text-gray-200 text-center leading-tight">
            Nilai Siswa
          </span>
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={handleDataGuru}
          className="flex flex-col items-center justify-center p-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-300 dark:hover:border-orange-600 transition-all duration-200 shadow-sm h-full">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center mb-1 shadow-md">
            <span className="text-white text-sm">👥</span>
          </div>
          <span className="text-xs font-medium text-slate-800 dark:text-gray-200 text-center leading-tight">
            Data Guru
          </span>
        </button>
        <button
          onClick={handleDataKelas}
          className="flex flex-col items-center justify-center p-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:border-cyan-300 dark:hover:border-cyan-600 transition-all duration-200 shadow-sm h-full">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-lg flex items-center justify-center mb-1 shadow-md">
            <span className="text-white text-sm">🏫</span>
          </div>
          <span className="text-xs font-medium text-slate-800 dark:text-gray-200 text-center leading-tight">
            Data Kelas
          </span>
        </button>
        <button
          onClick={handleDataSiswa}
          className="flex flex-col items-center justify-center p-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg hover:bg-pink-50 dark:hover:bg-pink-900/20 hover:border-pink-300 dark:hover:border-pink-600 transition-all duration-200 shadow-sm h-full">
          <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-pink-600 rounded-lg flex items-center justify-center mb-1 shadow-md">
            <span className="text-white text-sm">👤</span>
          </div>
          <span className="text-xs font-medium text-slate-800 dark:text-gray-200 text-center leading-tight">
            Data Siswa
          </span>
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div
        className={`min-h-screen transition-colors duration-300 ${
          isDarkMode ? "dark" : ""
        }`}>
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-gray-400">
              Memuat dashboard...
            </p>
            {activeAcademicInfo?.displayText && (
              <p className="text-xs text-slate-500 dark:text-gray-500 mt-2">
                {activeAcademicInfo.displayText}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`min-h-screen transition-colors duration-300 ${
          isDarkMode ? "dark" : ""
        }`}>
        <div className="min-h-screen bg-slate-50 dark:bg-gray-900 p-4 sm:p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-red-50 dark:from-red-900/20 to-rose-50 dark:to-rose-900/10 rounded-xl shadow-lg border border-red-200 dark:border-red-800 p-6 sm:p-8 text-center">
              <div className="text-red-500 dark:text-red-400 text-4xl sm:text-5xl mb-4">
                ⚠️
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-gray-100 mb-2">
                Terjadi Kesalahan
              </h3>
              <p className="text-red-600 dark:text-red-400 mb-4 text-sm sm:text-base">
                {error}
              </p>
              {activeAcademicInfo?.displayText && (
                <p className="text-xs text-slate-600 dark:text-gray-400 mb-4">
                  Semester Aktif: {activeAcademicInfo.displayText}
                </p>
              )}
              <button
                onClick={handleRetry}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                Coba Lagi
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate subject breakdown
  const subjectBreakdown = {};
  stats.classesTaught.forEach((cls) => {
    if (!subjectBreakdown[cls.subject]) {
      subjectBreakdown[cls.subject] = [];
    }
    subjectBreakdown[cls.subject].push(cls.className);
  });

  // Get primary subject
  const primarySubject = Object.keys(subjectBreakdown).reduce(
    (a, b) => (subjectBreakdown[a].length > subjectBreakdown[b].length ? a : b),
    stats.subjects[0] || ""
  );

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDarkMode ? "dark" : ""
      }`}>
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Pop-up Pengumuman */}
          <AnnouncementPopup userId={user?.id} userRole="teacher" />

          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="bg-gradient-to-br from-white dark:from-gray-800 via-blue-50/30 dark:via-blue-900/10 to-indigo-50/50 dark:to-indigo-900/10 rounded-xl shadow-lg border border-slate-200 dark:border-gray-700 p-4 sm:p-6 lg:p-8 backdrop-blur-sm">
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-gray-100 mb-3 sm:mb-2">
                  Selamat Datang, {user?.full_name || user?.username}
                </h1>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {primarySubject && (
                    <span className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      Guru {primarySubject}
                    </span>
                  )}
                  {stats.subjects.length > 1 && (
                    <span className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {stats.subjects.length} Mata Pelajaran
                    </span>
                  )}
                  {/* ✅ TAMBAHAN: Info Semester Aktif */}
                  {activeAcademicInfo?.displayText && (
                    <span className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Total Siswa */}
            <div className="group bg-gradient-to-br from-blue-50 dark:from-blue-900/10 via-white dark:via-gray-800 to-indigo-50 dark:to-indigo-900/10 rounded-xl shadow-lg hover:shadow-xl border border-blue-100 dark:border-blue-800 hover:border-blue-200 dark:hover:border-blue-600 p-4 sm:p-6 transform hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 mb-1 font-medium">
                    Total Siswa Diajar
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                    {stats.totalStudents}
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <span className="text-white text-lg sm:text-2xl">👨‍🎓</span>
                </div>
              </div>
            </div>

            {/* Total Kelas */}
            <div className="group bg-gradient-to-br from-emerald-50 dark:from-emerald-900/10 via-white dark:via-gray-800 to-green-50 dark:to-green-900/10 rounded-xl shadow-lg hover:shadow-xl border border-emerald-100 dark:border-emerald-800 hover:border-emerald-200 dark:hover:border-emerald-600 p-4 sm:p-6 transform hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 mb-1 font-medium">
                    Total Kelas Diajar
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-gray-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                    {stats.totalClasses}
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <span className="text-white text-lg sm:text-2xl">🏫</span>
                </div>
              </div>
            </div>

            {/* Mata Pelajaran */}
            <div className="group bg-gradient-to-br from-purple-50 dark:from-purple-900/10 via-white dark:via-gray-800 to-violet-50 dark:to-violet-900/10 rounded-xl shadow-lg hover:shadow-xl border border-purple-100 dark:border-purple-800 hover:border-purple-200 dark:hover:border-purple-600 p-4 sm:p-6 transform hover:-translate-y-1 transition-all duration-300 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm text-purple-600 dark:text-purple-400 mb-1 font-medium">
                    Mata Pelajaran
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-gray-100 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                    {stats.subjects.length}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-gray-400 mt-1 break-words">
                    {stats.subjects.join(", ")}
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg ml-4">
                  <span className="text-white text-lg sm:text-2xl">📚</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Desktop */}
          {!isMobile && (
            <div className="mb-6 sm:mb-8">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-gray-100 mb-3 sm:mb-4">
                Aksi Cepat
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <button
                  onClick={handleTeacherAttendance}
                  className="group bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg p-4 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                      <span className="text-white text-lg">👨‍🏫</span>
                    </div>
                    <div className="text-left">
                      <h4 className="font-semibold text-slate-800 dark:text-gray-100 text-sm">
                        Presensi Guru
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-gray-400">
                        Absensi Diri Sendiri
                      </p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={handleStudentAttendance}
                  className="group bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg p-4 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                      <span className="text-white text-lg">📋</span>
                    </div>
                    <div className="text-left">
                      <h4 className="font-semibold text-slate-800 dark:text-gray-100 text-sm">
                        Presensi {primarySubject}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-gray-400">
                        Catat Kehadiran
                      </p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={handleGrades}
                  className="group bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg p-4 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                      <span className="text-white text-lg">📝</span>
                    </div>
                    <div className="text-left">
                      <h4 className="font-semibold text-slate-800 dark:text-gray-100 text-sm">
                        Nilai {primarySubject}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-gray-400">
                        Input Nilai Siswa
                      </p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={handleReports}
                  className="group bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg p-4 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                      <span className="text-white text-lg">📊</span>
                    </div>
                    <div className="text-left">
                      <h4 className="font-semibold text-slate-800 dark:text-gray-100 text-sm">
                        Lihat Laporan
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-gray-400">
                        Nilai & Kehadiran
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Mata Pelajaran & Kelas */}
            <div className="bg-gradient-to-br from-white dark:from-gray-800 via-slate-50/30 dark:via-gray-700/30 to-blue-50/30 dark:to-blue-900/20 rounded-xl shadow-lg border border-slate-200 dark:border-gray-700 p-4 sm:p-6 backdrop-blur-sm">
              <h3 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-gray-100 mb-4 flex items-center">
                <span className="mr-2 text-blue-600 dark:text-blue-400">
                  📖
                </span>
                Mata Pelajaran & Kelas
              </h3>
              <div className="space-y-4">
                {Object.entries(subjectBreakdown).map(([subject, classes]) => {
                  const classByGrade = {};
                  classes.forEach((className) => {
                    const grade = className.charAt(0);
                    if (!classByGrade[grade]) classByGrade[grade] = [];
                    classByGrade[grade].push(className);
                  });

                  return (
                    <div
                      key={subject}
                      className="bg-gradient-to-r from-slate-50 dark:from-gray-700 to-white dark:to-gray-800 border border-slate-200 dark:border-gray-600 rounded-xl p-4 hover:shadow-md transition-all duration-300 transform hover:scale-[1.02]">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-slate-800 dark:text-gray-100 text-sm sm:text-base">
                          {subject}
                        </h4>
                        <span className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 bg-slate-100 dark:bg-gray-700 px-2 py-1 rounded-full">
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
                                  className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gradient-to-r from-blue-100 dark:from-blue-900/30 to-indigo-100 dark:to-indigo-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:scale-105 transition-transform">
                                  {className}
                                </span>
                              ))}
                            </div>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Jadwal Hari Ini */}
            <div className="bg-gradient-to-br from-white dark:from-gray-800 via-slate-50/30 dark:via-gray-700/30 to-indigo-50/30 dark:to-indigo-900/20 rounded-xl shadow-lg border border-slate-200 dark:border-gray-700 p-4 sm:p-6 backdrop-blur-sm">
              <h3 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-gray-100 mb-4 flex items-center">
                <span className="mr-2 text-indigo-600 dark:text-indigo-400">
                  🗓️
                </span>
                Jadwal Hari Ini - {currentDay}
              </h3>
              {todaySchedule.length > 0 ? (
                <div className="space-y-3">
                  {todaySchedule.map((schedule, index) => (
                    <div
                      key={index}
                      className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="text-center min-w-[70px]">
                            <div className="font-semibold text-blue-700 dark:text-blue-400 text-xs sm:text-sm">
                              {schedule.jam_mulai}
                            </div>
                            <div className="text-xs text-slate-400 dark:text-gray-500">
                              -
                            </div>
                            <div className="font-semibold text-blue-700 dark:text-blue-400 text-xs sm:text-sm">
                              {schedule.jam_selesai}
                            </div>
                          </div>
                          <div className="h-auto min-h-[60px] w-px bg-slate-200 dark:bg-gray-600"></div>
                          <div className="flex-1">
                            <div className="font-semibold text-slate-800 dark:text-gray-100 text-sm sm:text-base mb-1">
                              {schedule.mapel}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-gray-400">
                              <span className="flex items-center gap-1">
                                <span>🏫</span>
                                <span>{schedule.kelas}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">📅</div>
                  <h4 className="font-semibold text-slate-800 dark:text-gray-100 mb-2 text-sm sm:text-base">
                    Tidak Ada Jadwal
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-gray-400">
                    Anda Tidak Memiliki Jadwal Mengajar Hari Ini
                  </p>
                  <p className="text-xs text-slate-500 dark:text-gray-500 mt-2">
                    Selamat Menikmati Hari Libur ! 🎉
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Pengumuman */}
          <div className="bg-gradient-to-br from-white dark:from-gray-800 via-orange-50/30 dark:via-orange-900/10 to-amber-50/50 dark:to-amber-900/10 rounded-xl shadow-lg border border-orange-100 dark:border-orange-800 p-4 sm:p-6 backdrop-blur-sm">
            <h3 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-gray-100 mb-4 flex items-center">
              <span className="mr-2 text-orange-600 dark:text-orange-400">
                📢
              </span>
              Pengumuman Terkini
            </h3>
            {announcements.length > 0 ? (
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="group border-l-4 border-orange-500 dark:border-orange-600 bg-gradient-to-r from-orange-50/80 dark:from-orange-900/20 to-amber-50/50 dark:to-amber-900/10 hover:from-orange-100/80 dark:hover:from-orange-900/30 hover:to-amber-100/50 dark:hover:to-amber-900/20 pl-4 py-3 rounded-r-xl transition-all duration-300 transform hover:scale-[1.02] shadow-md hover:shadow-lg">
                    <h4 className="font-semibold text-slate-800 dark:text-gray-100 group-hover:text-orange-700 dark:group-hover:text-orange-400 transition-colors text-sm sm:text-base flex items-start">
                      <span className="mr-2 mt-0.5">📋</span>
                      {announcement.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-gray-400 mt-2 ml-6 group-hover:text-slate-700 dark:group-hover:text-gray-300 transition-colors">
                      {announcement.content}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-gray-500 mt-2 ml-6 flex items-center group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                      <span className="mr-1">🕐</span>
                      {new Date(announcement.created_at).toLocaleDateString(
                        "id-ID",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        }
                      )}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12 bg-gradient-to-br from-slate-50 dark:from-gray-700 to-orange-50/30 dark:to-orange-900/10 rounded-xl border-2 border-dashed border-orange-200 dark:border-orange-800">
                <div className="text-2xl sm:text-4xl mb-4 animate-bounce">
                  📢
                </div>
                <h4 className="font-medium text-slate-800 dark:text-gray-100 mb-2 text-sm sm:text-base">
                  Belum Ada Pengumuman
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-gray-400 mb-4">
                  Pengumuman terbaru akan ditampilkan di sini
                </p>
                <div className="inline-flex items-center px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-xs font-medium">
                  <span className="mr-1">💡</span>
                  Tip: Cek kembali secara berkala
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
