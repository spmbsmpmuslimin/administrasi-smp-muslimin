import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const TeacherDashboard = ({ user }) => {
  const navigate = useNavigate();

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

  // Fungsi untuk mendapatkan nama hari dalam Bahasa Indonesia
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
    return time.substring(0, 5); // Format HH:MM
  };

  // Fungsi untuk menggabungkan jadwal berurutan
  const mergeConsecutiveSchedules = (schedules) => {
    if (!schedules || schedules.length === 0) return [];

    const merged = [];
    let currentBlock = null;

    schedules.forEach((schedule, index) => {
      if (!currentBlock) {
        // Mulai blok baru
        currentBlock = {
          ...schedule,
          sessionCount: 1,
          sessionNumbers: [index + 1],
        };
      } else {
        // Cek apakah bisa digabung dengan blok sebelumnya
        const canMerge =
          currentBlock.class_id === schedule.class_id &&
          currentBlock.subject === schedule.subject &&
          currentBlock.end_time === schedule.start_time;

        if (canMerge) {
          // Gabungkan dengan blok sebelumnya
          currentBlock.end_time = schedule.end_time;
          currentBlock.sessionCount += 1;
          currentBlock.sessionNumbers.push(index + 1);
        } else {
          // Simpan blok sebelumnya dan mulai blok baru
          merged.push(currentBlock);
          currentBlock = {
            ...schedule,
            sessionCount: 1,
            sessionNumbers: [index + 1],
          };
        }
      }
    });

    // Jangan lupa push blok terakhir
    if (currentBlock) {
      merged.push(currentBlock);
    }

    return merged;
  };

  // Get current day name
  const currentDay = getDayName(new Date().getDay());

  useEffect(() => {
    console.log("🎯 TeacherDashboard received user:", user);

    if (user?.teacher_id || user?.id) {
      const teacherCode = user.teacher_id; // G-12
      const teacherUUID = user.id; // UUID
      console.log("✅ Found teacher_id:", teacherCode);
      console.log("✅ Found user.id:", teacherUUID);
      fetchTeacherData(teacherCode, teacherUUID);
    } else {
      console.log("❌ Teacher ID not found in user object:", user);
      setError("Teacher ID tidak ditemukan. Pastikan data guru sudah lengkap.");
      setLoading(false);
    }
  }, [user]);

  // Fetch jadwal hari ini
  const fetchTodaySchedule = useCallback(async (teacherCode, teacherUUID) => {
    try {
      const today = new Date();
      const dayName = getDayName(today.getDay());

      // Query menggunakan UUID (user.id)
      const { data: schedules, error: scheduleError } = await supabase
        .from("teacher_schedules")
        .select(
          `
          *,
          classes:class_id (
            id,
            grade
          )
        `
        )
        .eq("teacher_id", teacherUUID) // ✅ Pakai UUID
        .eq("day", dayName)
        .order("start_time", { ascending: true });

      if (scheduleError) throw scheduleError;

      // Get subject info from teacher_assignments menggunakan teacher_id (G-12)
      const scheduleIds = schedules?.map((s) => s.class_id) || [];
      const { data: assignments } = await supabase
        .from("teacher_assignments")
        .select("class_id, subject")
        .eq("teacher_id", teacherCode) // ✅ Pakai teacher_id (G-12)
        .in("class_id", scheduleIds);

      // Merge schedule with subject data
      const enrichedSchedules =
        schedules?.map((schedule) => {
          const assignment = assignments?.find(
            (a) => a.class_id === schedule.class_id
          );
          return {
            ...schedule,
            subject: assignment?.subject || "N/A",
          };
        }) || [];

      // ✅ Gabungkan jadwal berurutan
      const mergedSchedules = mergeConsecutiveSchedules(enrichedSchedules);

      setTodaySchedule(mergedSchedules);
    } catch (err) {
      console.error("❌ Error fetching today's schedule:", err);
    }
  }, []);

  const fetchTeacherData = async (teacherCode, teacherUUID) => {
    try {
      setLoading(true);
      setError(null);

      // Get current academic year
      const { data: yearData } = await supabase
        .from("classes")
        .select("academic_year")
        .order("academic_year", { ascending: false })
        .limit(1)
        .single();

      const currentYear = yearData?.academic_year || "2025/2026";

      // Get teacher assignments with class details (pakai teacher_id/G-12)
      const { data: assignments, error: assignError } = await supabase
        .from("teacher_assignments")
        .select(
          `
          id,
          class_id,
          subject,
          academic_year,
          classes!inner (
            id,
            grade,
            academic_year
          )
        `
        )
        .eq("teacher_id", teacherCode) // ✅ Pakai teacher_id (G-12)
        .eq("academic_year", currentYear);

      if (assignError) throw assignError;

      if (!assignments || assignments.length === 0) {
        throw new Error(
          `Tidak ada penugasan mengajar untuk tahun ajaran ${currentYear}`
        );
      }

      // Get unique subjects and classes
      const subjects = [...new Set(assignments.map((a) => a.subject))];
      const classIds = assignments.map((a) => a.class_id);
      const classesTaught = assignments.map((a) => ({
        id: a.class_id,
        className: a.classes.id,
        grade: a.classes.grade,
        subject: a.subject,
      }));

      // Count total students from all classes taught
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, class_id")
        .in("class_id", classIds);

      if (studentsError) throw studentsError;

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
      await fetchTodaySchedule(teacherCode, teacherUUID);
    } catch (err) {
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

  // Navigation handlers for Quick Actions
  const handleAttendance = () => {
    navigate("/attendance");
  };

  const handleGrades = () => {
    navigate("/grades");
  };

  const handleReports = () => {
    navigate("/reports");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl shadow-lg border border-red-200 p-6 sm:p-8 text-center">
            <div className="text-red-500 text-4xl sm:text-5xl mb-4">⚠️</div>
            <h3 className="text-lg sm:text-xl font-semibold text-slate-800 mb-2">
              Terjadi Kesalahan
            </h3>
            <p className="text-red-600 mb-4 text-sm sm:text-base">{error}</p>
            <button
              onClick={handleRetry}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
              Coba Lagi
            </button>
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

  // Get primary subject (most taught)
  const primarySubject = Object.keys(subjectBreakdown).reduce(
    (a, b) => (subjectBreakdown[a].length > subjectBreakdown[b].length ? a : b),
    stats.subjects[0] || ""
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header - Original Style */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/50 rounded-xl shadow-lg border border-slate-200 p-4 sm:p-6 lg:p-8 backdrop-blur-sm">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-800 mb-3 sm:mb-2">
                Selamat Datang, {user?.full_name || user?.username}
              </h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {primarySubject && (
                  <span className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    Guru {primarySubject}
                  </span>
                )}
                {stats.subjects.length > 1 && (
                  <span className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {stats.subjects.length} Mata Pelajaran
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Total Siswa */}
          <div className="group bg-gradient-to-br from-blue-50 via-white to-indigo-50 rounded-xl shadow-lg hover:shadow-xl border border-blue-100 hover:border-blue-200 p-4 sm:p-6 transform hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-blue-600 mb-1 font-medium">
                  Total Siswa Diajar
                </p>
                <p className="text-xl sm:text-2xl font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                  {stats.totalStudents}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <span className="text-white text-lg sm:text-2xl">👨‍🎓</span>
              </div>
            </div>
          </div>

          {/* Total Kelas */}
          <div className="group bg-gradient-to-br from-emerald-50 via-white to-green-50 rounded-xl shadow-lg hover:shadow-xl border border-emerald-100 hover:border-emerald-200 p-4 sm:p-6 transform hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-emerald-600 mb-1 font-medium">
                  Total Kelas Diajar
                </p>
                <p className="text-xl sm:text-2xl font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                  {stats.totalClasses}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <span className="text-white text-lg sm:text-2xl">🏫</span>
              </div>
            </div>
          </div>

          {/* Mata Pelajaran */}
          <div className="group bg-gradient-to-br from-purple-50 via-white to-violet-50 rounded-xl shadow-lg hover:shadow-xl border border-purple-100 hover:border-purple-200 p-4 sm:p-6 transform hover:-translate-y-1 transition-all duration-300 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-purple-600 mb-1 font-medium">
                  Mata Pelajaran
                </p>
                <p className="text-xl sm:text-2xl font-bold text-slate-800 group-hover:text-purple-700 transition-colors">
                  {stats.subjects.length}
                </p>
                <p className="text-xs text-slate-600 mt-1 break-words">
                  {stats.subjects.join(", ")}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg ml-4">
                <span className="text-white text-lg sm:text-2xl">📚</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions - Horizontal Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <button
            onClick={handleAttendance}
            className="group bg-white border border-slate-200 rounded-lg p-4 hover:bg-blue-50 hover:border-blue-300 transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                <span className="text-white text-lg">📋</span>
              </div>
              <div className="text-left">
                <h4 className="font-semibold text-slate-800 text-sm">
                  Presensi {primarySubject}
                </h4>
                <p className="text-xs text-slate-600">Catat Kehadiran</p>
              </div>
            </div>
          </button>

          <button
            onClick={handleGrades}
            className="group bg-white border border-slate-200 rounded-lg p-4 hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                <span className="text-white text-lg">📝</span>
              </div>
              <div className="text-left">
                <h4 className="font-semibold text-slate-800 text-sm">
                  Nilai {primarySubject}
                </h4>
                <p className="text-xs text-slate-600">Input Nilai Siswa</p>
              </div>
            </div>
          </button>

          <button
            onClick={handleReports}
            className="group bg-white border border-slate-200 rounded-lg p-4 hover:bg-purple-50 hover:border-purple-300 transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                <span className="text-white text-lg">📊</span>
              </div>
              <div className="text-left">
                <h4 className="font-semibold text-slate-800 text-sm">
                  Lihat Laporan
                </h4>
                <p className="text-xs text-slate-600">Nilai & Kehadiran</p>
              </div>
            </div>
          </button>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Mata Pelajaran & Kelas */}
          <div className="bg-gradient-to-br from-white via-slate-50/30 to-blue-50/30 rounded-xl shadow-lg border border-slate-200 p-4 sm:p-6 backdrop-blur-sm">
            <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-4 flex items-center">
              <span className="mr-2 text-blue-600">📖</span>
              Mata Pelajaran & Kelas
            </h3>

            <div className="space-y-4">
              {Object.entries(subjectBreakdown).map(([subject, classes]) => {
                // Group classes by grade
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
                    className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all duration-300 transform hover:scale-[1.02]">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-slate-800 text-sm sm:text-base">
                        {subject}
                      </h4>
                      <span className="text-xs sm:text-sm text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
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
                                className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border border-blue-200 hover:scale-105 transition-transform">
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
          <div className="bg-gradient-to-br from-white via-slate-50/30 to-indigo-50/30 rounded-xl shadow-lg border border-slate-200 p-4 sm:p-6 backdrop-blur-sm">
            <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-4 flex items-center">
              <span className="mr-2 text-indigo-600">🗓️</span>
              Jadwal Hari Ini - {currentDay}
            </h3>

            {todaySchedule.length > 0 ? (
              <div className="space-y-3">
                {todaySchedule.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="bg-white border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="text-center min-w-[70px]">
                          <div className="text-xs font-medium text-slate-500 mb-1">
                            {schedule.sessionCount}JP (
                            {schedule.sessionNumbers.join("-")})
                          </div>
                          <div className="font-semibold text-blue-700 text-xs sm:text-sm">
                            {formatTime(schedule.start_time)}
                          </div>
                          <div className="text-xs text-slate-400">-</div>
                          <div className="font-semibold text-blue-700 text-xs sm:text-sm">
                            {formatTime(schedule.end_time)}
                          </div>
                        </div>
                        <div className="h-auto min-h-[60px] w-px bg-slate-200"></div>
                        <div className="flex-1">
                          <div className="font-semibold text-slate-800 text-sm sm:text-base mb-1">
                            {schedule.subject}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <span className="flex items-center gap-1">
                              <span>🏫</span>
                              <span>
                                Kelas{" "}
                                {schedule.classes?.id || schedule.class_id}
                              </span>
                            </span>
                            {schedule.room_number && (
                              <>
                                <span className="text-slate-400">•</span>
                                <span className="flex items-center gap-1">
                                  <span>📍</span>
                                  <span>R.{schedule.room_number}</span>
                                </span>
                              </>
                            )}
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
                <h4 className="font-semibold text-slate-800 mb-2 text-sm sm:text-base">
                  Tidak Ada Jadwal
                </h4>
                <p className="text-xs sm:text-sm text-slate-600">
                  Anda Tidak Memiliki Jadwal Mengajar Hari Ini
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Selamat Menikmati Hari Libur ! 🎉
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Pengumuman */}
        <div className="bg-gradient-to-br from-white via-orange-50/30 to-amber-50/50 rounded-xl shadow-lg border border-orange-100 p-4 sm:p-6 backdrop-blur-sm">
          <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-4 flex items-center">
            <span className="mr-2 text-orange-600">📢</span>
            Pengumuman Terkini
          </h3>
          {announcements.length > 0 ? (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="group border-l-4 border-orange-500 bg-gradient-to-r from-orange-50/80 to-amber-50/50 hover:from-orange-100/80 hover:to-amber-100/50 pl-4 py-3 rounded-r-xl transition-all duration-300 transform hover:scale-[1.02] shadow-md hover:shadow-lg">
                  <h4 className="font-semibold text-slate-800 group-hover:text-orange-700 transition-colors text-sm sm:text-base flex items-start">
                    <span className="mr-2 mt-0.5">📋</span>
                    {announcement.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 mt-2 ml-6 group-hover:text-slate-700 transition-colors">
                    {announcement.content}
                  </p>
                  <p className="text-xs text-slate-500 mt-2 ml-6 flex items-center group-hover:text-orange-600 transition-colors">
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
            <div className="text-center py-8 sm:py-12 bg-gradient-to-br from-slate-50 to-orange-50/30 rounded-xl border-2 border-dashed border-orange-200">
              <div className="text-2xl sm:text-4xl mb-4 animate-bounce">📢</div>
              <h4 className="font-medium text-slate-800 mb-2 text-sm sm:text-base">
                Belum Ada Pengumuman
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 mb-4">
                Pengumuman terbaru akan ditampilkan di sini
              </p>
              <div className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                <span className="mr-1">💡</span>
                Tip: Cek kembali secara berkala
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
