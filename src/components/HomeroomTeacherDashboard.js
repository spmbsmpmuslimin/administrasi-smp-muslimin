import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const HomeroomTeacherDashboard = ({ user }) => {
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({
    totalStudents: 0,
    maleStudents: 0,
    femaleStudents: 0,
    presentToday: 0,
    absentToday: 0,
    className: "",
    grade: "",
  });
  const [teachingData, setTeachingData] = useState({
    subjects: [],
    classesTaught: [],
    totalClassesTaught: 0,
  });
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Extract user data untuk prevent unnecessary re-renders
  const username = user?.username;
  const fullName = user?.full_name;
  const homeroomClassId = user?.homeroom_class_id;
  const teacherId = user?.teacher_id;
  const userRole = user?.role;

  // Debug log - HANYA sekali saat mount atau username berubah
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("🏠 HomeroomTeacherDashboard mounted with user:", username);
    }
  }, [username]);

  // Memoize fetchHomeroomDashboardData untuk prevent re-creation
  const fetchHomeroomDashboardData = useCallback(async () => {
    if (!homeroomClassId) {
      setError(
        `Guru ${fullName || username || "ini"} bukan wali kelas. Dashboard ini khusus untuk wali kelas.`
      );
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      if (process.env.NODE_ENV === 'development') {
        console.log("📊 Fetching data for homeroom class:", homeroomClassId);
      }

      // Get class info
      const { data: classInfo, error: classError } = await supabase
        .from("classes")
        .select("id, grade, academic_year")
        .eq("id", homeroomClassId)
        .single();

      if (process.env.NODE_ENV === 'development') {
        console.log("🏫 Class info result:", { classInfo, classError });
      }

      if (classError || !classInfo) {
        throw new Error(
          "Kelas homeroom tidak ditemukan: " +
            (classError?.message || "No data")
        );
      }

      // Get current academic year
      const currentYear = classInfo.academic_year;

      // Get today's date
      const today = new Date().toISOString().split("T")[0];
      if (process.env.NODE_ENV === 'development') {
        console.log("📅 Today:", today);
      }

      // Parallel fetch data
      const [studentsResult, attendanceResult, announcementsResult, teachingResult] =
        await Promise.all([
          // Students in homeroom class
          supabase
            .from("students")
            .select("id, full_name, gender")
            .eq("class_id", homeroomClassId)
            .eq("academic_year", classInfo.academic_year)
            .eq("is_active", true),

          // Today's attendance for this class
          supabase
            .from("attendances")
            .select(
              `
            id,
            student_id,
            status,
            students!inner (
              id,
              class_id
            )
          `
            )
            .eq("date", today)
            .eq("class_id", homeroomClassId),

          // Recent Announcements
          supabase
            .from("announcement")
            .select("id, title, content, created_at")
            .order("created_at", { ascending: false })
            .limit(5),

          // Teacher assignments (all classes taught by this teacher)
          supabase
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
            .eq("teacher_id", teacherId)
            .eq("academic_year", currentYear),
        ]);

      if (process.env.NODE_ENV === 'development') {
        console.log("📊 Query results:", {
          students: studentsResult.data?.length,
          attendances: attendanceResult.data?.length,
          announcements: announcementsResult.data?.length,
          teaching: teachingResult.data?.length,
        });
      }

      const students = studentsResult.data || [];
      const attendances = attendanceResult.data || [];
      const assignments = teachingResult.data || [];

      // Calculate gender stats
      const maleCount = students.filter((s) => s.gender === "L").length;
      const femaleCount = students.filter((s) => s.gender === "P").length;

      // Calculate attendance stats - hitung unique students yang hadir
      const uniqueStudentsPresent = new Set();
      const uniqueStudentsAbsent = new Set();

      attendances.forEach((att) => {
        if (att.status === "hadir") {
          uniqueStudentsPresent.add(att.student_id);
        } else if (
          att.status === "tidak_hadir" ||
          att.status === "sakit" ||
          att.status === "izin"
        ) {
          uniqueStudentsAbsent.add(att.student_id);
        }
      });

      // Process teaching data
      const subjects = [...new Set(assignments.map((a) => a.subject))];
      const classesTaught = assignments.map((a) => ({
        id: a.class_id,
        className: a.classes.id,
        grade: a.classes.grade,
        subject: a.subject,
      }));

      setStats({
        totalStudents: students.length,
        maleStudents: maleCount,
        femaleStudents: femaleCount,
        presentToday: uniqueStudentsPresent.size,
        absentToday: uniqueStudentsAbsent.size,
        className: homeroomClassId,
        grade: classInfo.grade,
      });

      setTeachingData({
        subjects,
        classesTaught,
        totalClassesTaught: assignments.length,
      });

      setAnnouncements(announcementsResult.data || []);
      setError(null);
    } catch (err) {
      console.error("❌ Error fetching homeroom dashboard data:", err);
      setError("Gagal memuat data dashboard homeroom: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [homeroomClassId, teacherId, fullName, username]); // ✅ DEPENDENCY SPESIFIK!

  // Fetch data - HANYA ketika dependency berubah
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("🏠 User has homeroom_class_id:", homeroomClassId);
    }
    fetchHomeroomDashboardData();
  }, [fetchHomeroomDashboardData]); // ✅ Dependency pada memoized function

  const handleRetry = () => {
    fetchHomeroomDashboardData();
  };

  // Navigation handlers - Memoized untuk prevent re-creation
  const handleAttendance = useCallback(() => {
    navigate('/attendance');
  }, [navigate]);

  const handleGrades = useCallback(() => {
    navigate('/grades');
  }, [navigate]);

  const handleStudents = useCallback(() => {
    navigate('/students');
  }, [navigate]);

  const handleReports = useCallback(() => {
    navigate('/reports');
  }, [navigate]);

  // Memoize subject breakdown calculation
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

  // Memoize primary subject calculation
  const primarySubject = useMemo(() => {
    if (Object.keys(subjectBreakdown).length === 0) return "";
    return Object.keys(subjectBreakdown).reduce(
      (a, b) => (subjectBreakdown[a].length > subjectBreakdown[b].length ? a : b),
      teachingData.subjects[0] || ""
    );
  }, [subjectBreakdown, teachingData.subjects]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-4 text-slate-600">
              Memuat dashboard homeroom...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-amber-200 p-6 sm:p-8 text-center">
            <div className="text-amber-500 text-4xl sm:text-5xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Info</h3>
            <p className="text-amber-600 mb-4 text-sm sm:text-base">{error}</p>
            <p className="text-xs sm:text-sm text-slate-500 mb-4">
              Username: {username}
              <br />
              Role: {userRole}
              <br />
              Homeroom Class: {homeroomClassId || "Tidak ada"}
            </p>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 lg:p-8">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-800 mb-3 sm:mb-2">
                Selamat Datang, {fullName || username}
              </h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  Wali Kelas {stats.className}
                </span>
                {primarySubject && (
                  <span className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Guru {primarySubject}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          {/* Total Siswa Kelas */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-slate-500 mb-1">
                  Siswa Kelas {stats.className}
                </p>
                <p className="text-xl sm:text-2xl font-bold text-blue-700">
                  {stats.totalStudents}
                </p>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center ml-2 shadow-lg">
                <span className="text-white text-lg sm:text-2xl">👨‍🎓</span>
              </div>
            </div>
          </div>

          {/* Gender Ratio */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-6">
            <div>
              <p className="text-xs sm:text-sm font-medium text-slate-500 mb-2 sm:mb-3">
                L / P
              </p>
              <div className="flex justify-between items-center">
                <div className="text-center">
                  <p className="text-lg sm:text-xl font-bold text-blue-700">
                    {stats.maleStudents}
                  </p>
                  <p className="text-xs text-slate-500">L</p>
                </div>
                <div className="text-slate-400">/</div>
                <div className="text-center">
                  <p className="text-lg sm:text-xl font-bold text-pink-600">
                    {stats.femaleStudents}
                  </p>
                  <p className="text-xs text-slate-500">P</p>
                </div>
              </div>
            </div>
          </div>

          {/* Hadir Hari Ini */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-slate-500 mb-1">
                  Hadir Hari Ini
                </p>
                <p className="text-xl sm:text-2xl font-bold text-emerald-700">
                  {stats.presentToday}
                </p>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center ml-2 shadow-lg">
                <span className="text-white text-lg sm:text-2xl">✅</span>
              </div>
            </div>
          </div>

          {/* Tidak Hadir */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-slate-500 mb-1">
                  Tidak Hadir
                </p>
                <p className="text-xl sm:text-2xl font-bold text-red-700">
                  {stats.absentToday}
                </p>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-xl flex items-center justify-center ml-2 shadow-lg">
                <span className="text-white text-lg sm:text-2xl">❌</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Mata Pelajaran & Kelas */}
          {teachingData.subjects.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-4 flex items-center">
                <span className="mr-2">📖</span>
                Mata Pelajaran & Kelas
              </h3>
              <div className="space-y-4">
                {Object.entries(subjectBreakdown).map(([subject, classes]) => {
                  // Group classes by grade
                  const classByGrade = {};
                  classes.forEach(className => {
                    const grade = className.charAt(0);
                    if (!classByGrade[grade]) {
                      classByGrade[grade] = [];
                    }
                    classByGrade[grade].push(className);
                  });

                  return (
                    <div
                      key={subject}
                      className="border border-slate-200 rounded-lg p-3 sm:p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-slate-800 text-sm sm:text-base">{subject}</h4>
                        <span className="text-xs sm:text-sm text-slate-500">
                          {classes.length} kelas
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        {Object.entries(classByGrade)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([grade, gradeClasses]) => (
                            <div key={grade} className="flex flex-wrap gap-2">
                              {gradeClasses
                                .sort()
                                .map((className, index) => (
                                  <span
                                    key={index}
                                    className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                                      className === stats.className 
                                        ? 'bg-green-50 text-green-700 border-green-200' 
                                        : 'bg-blue-50 text-blue-700 border-blue-200'
                                    }`}>
                                    {className}
                                    {className === stats.className && (
                                      <span className="ml-1 text-green-600">👑</span>
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
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-4 flex items-center">
              <span className="mr-2">⚡</span>
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button 
                onClick={handleAttendance}
                className="w-full text-left p-4 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors group min-h-[60px] focus:ring-4 focus:ring-blue-300">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                    <span className="text-white text-lg">📋</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 text-sm sm:text-base">
                      Presensi Kelas {stats.className}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600">
                      Catat Kehadiran Siswa Mapel & Walikelas
                    </p>
                  </div>
                </div>
              </button>

              {primarySubject && (
                <button 
                  onClick={handleGrades}
                  className="w-full text-left p-4 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors group min-h-[60px] focus:ring-4 focus:ring-blue-300">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                      <span className="text-white text-lg">📝</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800 text-sm sm:text-base">
                        Input Nilai {primarySubject}
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-600">Input Nilai Siswa</p>
                    </div>
                  </div>
                </button>
              )}

              <button 
                onClick={handleStudents}
                className="w-full text-left p-4 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors group min-h-[60px] focus:ring-4 focus:ring-blue-300">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                    <span className="text-white text-lg">👨‍🎓</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 text-sm sm:text-base">
                      Data Siswa {stats.className}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600">
                      Kelola Data Siswa Kelas
                    </p>
                  </div>
                </div>
              </button>

              <button 
                onClick={handleReports}
                className="w-full text-left p-4 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors group min-h-[60px] focus:ring-4 focus:ring-blue-300">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                    <span className="text-white text-lg">📊</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 text-sm sm:text-base">
                      Laporan Kelas {stats.className}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600">
                      Laporan Khusus Walikelas
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Pengumuman Terkini */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-4 flex items-center">
            <span className="mr-2">📢</span>
            Pengumuman Terkini
          </h3>
          {announcements.length > 0 ? (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="border-l-4 border-blue-500 bg-blue-50 pl-4 py-3 rounded-r-lg">
                  <h4 className="font-semibold text-slate-800 text-sm sm:text-base">
                    {announcement.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    {announcement.content}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
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
            <div className="text-center py-6 sm:py-8">
              <div className="text-3xl sm:text-4xl mb-3">📢</div>
              <h4 className="font-medium text-slate-800 mb-1 text-sm sm:text-base">
                Belum Ada Pengumuman
              </h4>
              <p className="text-xs sm:text-sm text-slate-600">
                Pengumuman terbaru akan ditampilkan di sini
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeroomTeacherDashboard;