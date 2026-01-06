import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { getActiveAcademicInfo } from "../services/academicYearService";

const AdminDashboard = ({ user }) => {
  const navigate = useNavigate();

  // State untuk academic info
  const [activeAcademicInfo, setActiveAcademicInfo] = useState(null);

  // State untuk real-time monitoring
  const [monitoring, setMonitoring] = useState({
    teacherAttendance: { hadir: 0, total: 0, percentage: 0, belumAbsen: 0 },
    studentAttendance: { hadir: 0, total: 0, percentage: 0, terlambat: 0, alpha: 0 },
    activeClasses: { active: 0, total: 0 },
    lastUpdate: new Date().toLocaleTimeString("id-ID"),
  });

  // State untuk performa comparison
  const [performance, setPerformance] = useState({
    teacherToday: 0,
    teacherYesterday: 0,
    studentToday: 0,
    studentYesterday: 0,
    lateToday: 0,
    lateYesterday: 0,
  });

  // State untuk urgent actions
  const [urgentActions, setUrgentActions] = useState([]);

  // State untuk activity timeline
  const [recentActivities, setRecentActivities] = useState([]);

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    effective_from: "",
    effective_until: "",
    target_role: "semua",
    is_active: true,
  });

  // Load academic info
  useEffect(() => {
    const loadActiveAcademicInfo = async () => {
      const info = await getActiveAcademicInfo();
      setActiveAcademicInfo(info);
    };
    loadActiveAcademicInfo();
  }, []);

  // Fetch all data on mount
  useEffect(() => {
    fetchAllData();
    fetchAnnouncements();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchAllData();
    }, 30000);

    return () => clearInterval(interval);
  }, [activeAcademicInfo]);

  // Fetch real-time monitoring data
  const fetchAllData = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const currentYear = activeAcademicInfo?.academicYear || "2025/2026";

      // 1. Teacher Attendance Today
      const { data: teachersToday } = await supabase
        .from("teacher_attendance")
        .select("*")
        .eq("attendance_date", today)
        .eq("status", "Hadir");

      const { data: allTeachers } = await supabase
        .from("users")
        .select("id, full_name")
        .in("role", ["teacher", "guru_bk"])
        .eq("is_active", true)
        .neq("username", "adenurmughni");

      const totalTeachers = allTeachers?.length || 0;
      const hadirTeachers = teachersToday?.length || 0;
      const belumAbsenTeachers = totalTeachers - hadirTeachers;

      // 2. Teacher Attendance Yesterday (for comparison)
      const { data: teachersYesterday } = await supabase
        .from("teacher_attendance")
        .select("*")
        .eq("attendance_date", yesterday)
        .eq("status", "Hadir");

      // 3. Student Attendance Today
      const { data: studentsToday } = await supabase
        .from("attendance")
        .select("*")
        .eq("attendance_date", today);

      const { data: allStudents } = await supabase
        .from("students")
        .select("id")
        .eq("academic_year", currentYear)
        .eq("is_active", true);

      const totalStudents = allStudents?.length || 0;
      const hadirStudents = studentsToday?.filter((s) => s.status === "Hadir").length || 0;
      const terlambatStudents = studentsToday?.filter((s) => s.status === "Terlambat").length || 0;
      const alphaStudents = studentsToday?.filter((s) => s.status === "Alpha").length || 0;

      // 4. Student Attendance Yesterday
      const { data: studentsYesterday } = await supabase
        .from("attendance")
        .select("*")
        .eq("attendance_date", yesterday);

      const hadirStudentsYesterday =
        studentsYesterday?.filter((s) => s.status === "Hadir").length || 0;
      const terlambatStudentsYesterday =
        studentsYesterday?.filter((s) => s.status === "Terlambat").length || 0;

      // 5. Active Classes
      const { data: classes } = await supabase
        .from("classes")
        .select("id")
        .eq("academic_year", currentYear);

      const totalClasses = classes?.length || 0;

      // Update monitoring state
      setMonitoring({
        teacherAttendance: {
          hadir: hadirTeachers,
          total: totalTeachers,
          percentage: totalTeachers > 0 ? Math.round((hadirTeachers / totalTeachers) * 100) : 0,
          belumAbsen: belumAbsenTeachers,
        },
        studentAttendance: {
          hadir: hadirStudents,
          total: totalStudents,
          percentage: totalStudents > 0 ? Math.round((hadirStudents / totalStudents) * 100) : 0,
          terlambat: terlambatStudents,
          alpha: alphaStudents,
        },
        activeClasses: {
          active: totalClasses,
          total: totalClasses,
        },
        lastUpdate: new Date().toLocaleTimeString("id-ID"),
      });

      // Update performance comparison
      const teacherPercentageToday =
        totalTeachers > 0 ? Math.round((hadirTeachers / totalTeachers) * 100) : 0;
      const teacherPercentageYesterday =
        totalTeachers > 0
          ? Math.round(((teachersYesterday?.length || 0) / totalTeachers) * 100)
          : 0;
      const studentPercentageToday =
        totalStudents > 0 ? Math.round((hadirStudents / totalStudents) * 100) : 0;
      const studentPercentageYesterday =
        totalStudents > 0 ? Math.round((hadirStudentsYesterday / totalStudents) * 100) : 0;

      setPerformance({
        teacherToday: teacherPercentageToday,
        teacherYesterday: teacherPercentageYesterday,
        studentToday: studentPercentageToday,
        studentYesterday: studentPercentageYesterday,
        lateToday: terlambatStudents,
        lateYesterday: terlambatStudentsYesterday,
      });

      // Generate urgent actions
      const actions = [];
      const currentHour = new Date().getHours();

      if (belumAbsenTeachers > 0 && currentHour >= 8) {
        actions.push({
          id: 1,
          type: "critical",
          icon: "🔴",
          title: `${belumAbsenTeachers} guru belum absen`,
          description: currentHour >= 9 ? "(sudah lewat jam 09:00)" : "(menjelang jam masuk)",
          action: "Lihat Daftar & Kirim Reminder",
          route: "/attendance-teacher",
        });
      }

      if (alphaStudents > 0) {
        actions.push({
          id: 2,
          type: "warning",
          icon: "🟡",
          title: `${alphaStudents} siswa alpha hari ini`,
          description: "Perlu tindak lanjut orang tua",
          action: "Hubungi Orang Tua / Wali Kelas",
          route: "/attendance",
        });
      }

      if (terlambatStudents > 5) {
        actions.push({
          id: 3,
          type: "warning",
          icon: "⚠️",
          title: `${terlambatStudents} siswa terlambat`,
          description: "Lebih tinggi dari biasanya",
          action: "Lihat Detail Keterlambatan",
          route: "/attendance",
        });
      }

      if (actions.length === 0) {
        actions.push({
          id: 4,
          type: "success",
          icon: "🟢",
          title: "Semua berjalan lancar",
          description: "Tidak ada tindakan mendesak",
          action: "Lihat Laporan Lengkap",
          route: "/reports",
        });
      }

      setUrgentActions(actions);

      // Generate recent activities
      const activities = [];

      if (teachersToday && teachersToday.length > 0) {
        teachersToday.slice(0, 3).forEach((teacher) => {
          activities.push({
            id: `t-${teacher.id}`,
            time: teacher.clock_in ? teacher.clock_in.substring(0, 5) : "07:30",
            icon: "✅",
            text: `${teacher.full_name} melakukan presensi`,
            type: "teacher",
          });
        });
      }

      if (alphaStudents > 0) {
        activities.push({
          id: "alpha-alert",
          time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
          icon: "⚠️",
          text: `${alphaStudents} siswa tidak hadir hari ini`,
          type: "alert",
        });
      }

      if (terlambatStudents > 0) {
        activities.push({
          id: "late-alert",
          time: "08:15",
          icon: "⏰",
          text: `${terlambatStudents} siswa terlambat`,
          type: "warning",
        });
      }

      setRecentActivities(activities.slice(0, 5));
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Gagal memuat data monitoring");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from("announcement")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (err) {
      console.error("Error fetching announcements:", err);
    }
  };

  const createAnnouncement = async (data) => {
    try {
      if (!data.title?.trim() || !data.content?.trim()) {
        throw new Error("Judul dan konten tidak boleh kosong");
      }

      const { data: newData, error } = await supabase
        .from("announcement")
        .insert([
          {
            title: data.title.trim(),
            content: data.content.trim(),
            effective_from: data.effective_from,
            effective_until: data.effective_until,
            target_role: data.target_role,
            is_active: data.is_active,
          },
        ])
        .select("*");

      if (error) throw error;
      if (!newData || newData.length === 0) throw new Error("Gagal membuat pengumuman");

      setAnnouncements((prev) => [newData[0], ...prev]);
      return { data: newData[0], error: null };
    } catch (error) {
      console.error("Error creating announcement:", error);
      return { data: null, error };
    }
  };

  const updateAnnouncement = async (id, updates) => {
    try {
      if (!id) throw new Error("ID pengumuman tidak valid");

      const { data, error } = await supabase
        .from("announcement")
        .update({
          title: updates.title.trim(),
          content: updates.content.trim(),
          effective_from: updates.effective_from,
          effective_until: updates.effective_until,
          target_role: updates.target_role,
          is_active: updates.is_active,
        })
        .eq("id", id)
        .select("*");

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Pengumuman tidak ditemukan");

      setAnnouncements((prev) => prev.map((item) => (item.id === id ? data[0] : item)));
      return { data: data[0], error: null };
    } catch (error) {
      console.error("Error updating announcement:", error);
      return { data: null, error };
    }
  };

  const deleteAnnouncement = async (id) => {
    try {
      if (!window.confirm("Apakah Anda yakin ingin menghapus pengumuman ini?")) {
        return { error: null };
      }

      const { error } = await supabase.from("announcement").delete().eq("id", id);
      if (error) throw error;

      setAnnouncements((prev) => prev.filter((item) => item?.id !== id));
      return { error: null };
    } catch (error) {
      console.error("Error deleting announcement:", error);
      throw error;
    }
  };

  const toggleActiveStatus = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from("announcement")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      setAnnouncements((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_active: !currentStatus } : item))
      );
    } catch (error) {
      console.error("Error toggling active status:", error);
      setError("Gagal mengubah status pengumuman");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      if (editData?.id) {
        const result = await updateAnnouncement(editData.id, formData);
        if (result.data) {
          setShowAddForm(false);
          setEditData(null);
          setFormData({
            title: "",
            content: "",
            effective_from: "",
            effective_until: "",
            target_role: "semua",
            is_active: true,
          });
        } else {
          setError(result.error?.message || "Gagal mengupdate pengumuman");
        }
      } else {
        const result = await createAnnouncement(formData);
        if (result.data) {
          setShowAddForm(false);
          setFormData({
            title: "",
            content: "",
            effective_from: "",
            effective_until: "",
            target_role: "semua",
            is_active: true,
          });
        } else {
          setError(result.error?.message || "Gagal membuat pengumuman");
        }
      }
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat menyimpan pengumuman");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (announcement) => {
    if (!announcement?.id) {
      setError("Data pengumuman tidak valid");
      return;
    }

    setEditData(announcement);
    setFormData({
      title: announcement.title || "",
      content: announcement.content || "",
      effective_from: announcement.effective_from || "",
      effective_until: announcement.effective_until || "",
      target_role: announcement.target_role || "semua",
      is_active: announcement.is_active ?? true,
    });
    setShowAddForm(true);
    setError(null);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditData(null);
    setFormData({
      title: "",
      content: "",
      effective_from: "",
      effective_until: "",
      target_role: "semua",
      is_active: true,
    });
    setError(null);
  };

  const handleDeleteClick = async (id) => {
    try {
      await deleteAnnouncement(id);
    } catch (err) {
      setError(err.message || "Gagal menghapus pengumuman");
    }
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const isAnnouncementActive = (announcement) => {
    const now = new Date();
    const effectiveFrom = new Date(announcement.effective_from);
    const effectiveUntil = new Date(announcement.effective_until);
    return now >= effectiveFrom && now <= effectiveUntil;
  };

  const getTodayFormatted = () => {
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return new Date().toLocaleDateString("id-ID", options);
  };

  const getTrendIcon = (today, yesterday) => {
    if (today > yesterday) return { icon: "↑", color: "text-green-600 dark:text-green-400" };
    if (today < yesterday) return { icon: "↓", color: "text-red-600 dark:text-red-400" };
    return { icon: "→", color: "text-slate-600 dark:text-slate-400" };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Memuat dashboard admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-4 flex justify-between items-center">
            <div>
              <span className="font-medium">Error: </span>
              {error}
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-800 dark:text-red-400 hover:text-red-900 font-bold text-xl"
            >
              ×
            </button>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-3">
              Selamat Datang, {user?.full_name || user?.username}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                Administrator
              </span>
              {activeAcademicInfo?.displayText && (
                <span className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  📚 {activeAcademicInfo.displayText}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3 Quick Actions */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
            Aksi Cepat
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {/* Presensi Guru */}
            <button
              onClick={() => navigate("/attendance-teacher")}
              className="group bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-blue-900/20 dark:via-slate-800 dark:to-indigo-900/20 p-4 rounded-xl text-center transition-all duration-300 border border-blue-100 dark:border-blue-800 hover:border-blue-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 hover:scale-105 active:scale-95"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition-all shadow-lg">
                <span className="text-xl text-white">👨‍🏫</span>
              </div>
              <div className="font-semibold text-sm group-hover:text-blue-700 dark:group-hover:text-blue-400 mb-1">
                Presensi Guru
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Lihat absensi guru</div>
            </button>

            {/* Laporan */}
            <button
              onClick={() => navigate("/reports")}
              className="group bg-gradient-to-br from-pink-50 via-white to-rose-50 dark:from-pink-900/20 dark:via-slate-800 dark:to-rose-900/20 p-4 rounded-xl text-center transition-all duration-300 border border-pink-100 dark:border-pink-800 hover:border-pink-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 hover:scale-105 active:scale-95"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-pink-600 rounded-xl flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition-all shadow-lg">
                <span className="text-xl text-white">📊</span>
              </div>
              <div className="font-semibold text-sm group-hover:text-pink-700 dark:group-hover:text-pink-400 mb-1">
                Laporan
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Analisis & Laporan</div>
            </button>

            {/* Pengaturan */}
            <button
              onClick={() => navigate("/settings")}
              className="group bg-gradient-to-br from-slate-50 via-white to-gray-50 dark:from-slate-800 dark:via-slate-800 dark:to-gray-900/20 p-4 rounded-xl text-center transition-all duration-300 border border-slate-200 dark:border-slate-700 hover:border-slate-400 shadow-lg hover:shadow-xl transform hover:-translate-y-1 hover:scale-105 active:scale-95"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-slate-500 to-slate-700 rounded-xl flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition-all shadow-lg">
                <span className="text-xl text-white">⚙️</span>
              </div>
              <div className="font-semibold text-sm group-hover:text-slate-700 dark:group-hover:text-slate-300 mb-1">
                Pengaturan
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Konfigurasi Sistem</div>
            </button>
          </div>
        </div>

        {/* Real-Time Monitoring Dashboard */}
        <div className="mb-6">
          <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-blue-900/20 dark:via-slate-800 dark:to-indigo-900/20 rounded-xl shadow-lg border border-blue-200 dark:border-blue-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span className="text-blue-600 dark:text-blue-400">📊</span>
                Monitoring Real-Time
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Live • {monitoring.lastUpdate}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Teacher Attendance */}
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border-l-4 border-blue-500">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    ✅ Presensi Guru
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      monitoring.teacherAttendance.percentage >= 90
                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                        : monitoring.teacherAttendance.percentage >= 75
                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
                        : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                    }`}
                  >
                    {monitoring.teacherAttendance.percentage}%
                  </span>
                </div>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-1">
                  {monitoring.teacherAttendance.hadir}/{monitoring.teacherAttendance.total}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-500">
                  {monitoring.teacherAttendance.belumAbsen > 0 && (
                    <span className="text-orange-600 dark:text-orange-400">
                      {monitoring.teacherAttendance.belumAbsen} belum absen
                    </span>
                  )}
                  {monitoring.teacherAttendance.belumAbsen === 0 && (
                    <span className="text-green-600 dark:text-green-400">Semua sudah absen ✓</span>
                  )}
                </div>
              </div>

              {/* Student Attendance */}
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border-l-4 border-purple-500">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    👨‍🎓 Presensi Siswa
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      monitoring.studentAttendance.percentage >= 90
                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                        : monitoring.studentAttendance.percentage >= 75
                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
                        : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                    }`}
                  >
                    {monitoring.studentAttendance.percentage}%
                  </span>
                </div>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-1">
                  {monitoring.studentAttendance.hadir}/{monitoring.studentAttendance.total}
                </div>
                <div className="flex gap-2 text-xs">
                  {monitoring.studentAttendance.terlambat > 0 && (
                    <span className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 px-2 py-0.5 rounded">
                      ⏰ {monitoring.studentAttendance.terlambat} terlambat
                    </span>
                  )}
                  {monitoring.studentAttendance.alpha > 0 && (
                    <span className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 px-2 py-0.5 rounded">
                      ⚠️ {monitoring.studentAttendance.alpha} alpha
                    </span>
                  )}
                </div>
              </div>

              {/* Active Classes */}
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border-l-4 border-emerald-500">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    🏫 Kelas Aktif
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    {monitoring.activeClasses.active}/{monitoring.activeClasses.total}
                  </span>
                </div>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-1">
                  {monitoring.activeClasses.active} Kelas
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-500">
                  Semester {activeAcademicInfo?.semester || "1"} •{" "}
                  {activeAcademicInfo?.academicYear || "2025/2026"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Comparison & Urgent Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Left: Performance Comparison */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <span className="text-amber-600 dark:text-amber-400">📈</span>
              Perbandingan Performa
            </h3>

            <div className="space-y-4">
              {/* Teacher Attendance Comparison */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/10 dark:to-transparent rounded-lg border border-blue-100 dark:border-blue-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 dark:text-blue-400">👨‍🏫</span>
                    </div>
                    <div>
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        Kehadiran Guru
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Dibandingkan kemarin
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                      {performance.teacherToday}%
                    </div>
                    <div className="text-sm">
                      <span
                        className={`${
                          getTrendIcon(performance.teacherToday, performance.teacherYesterday).color
                        } font-medium`}
                      >
                        {getTrendIcon(performance.teacherToday, performance.teacherYesterday).icon}{" "}
                        {Math.abs(performance.teacherToday - performance.teacherYesterday)}%
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                        ({performance.teacherYesterday}% kemarin)
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <span className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                    <div
                      className="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-full"
                      style={{ width: `${performance.teacherToday}%` }}
                    ></div>
                  </span>
                  <span>Hari ini</span>
                </div>
              </div>

              {/* Student Attendance Comparison */}
              <div className="p-4 bg-gradient-to-r from-purple-50 to-white dark:from-purple-900/10 dark:to-transparent rounded-lg border border-purple-100 dark:border-purple-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex items-center justify-center">
                      <span className="text-purple-600 dark:text-purple-400">👨‍🎓</span>
                    </div>
                    <div>
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        Kehadiran Siswa
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Dibandingkan kemarin
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                      {performance.studentToday}%
                    </div>
                    <div className="text-sm">
                      <span
                        className={`${
                          getTrendIcon(performance.studentToday, performance.studentYesterday).color
                        } font-medium`}
                      >
                        {getTrendIcon(performance.studentToday, performance.studentYesterday).icon}{" "}
                        {Math.abs(performance.studentToday - performance.studentYesterday)}%
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                        ({performance.studentYesterday}% kemarin)
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <span className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                    <div
                      className="bg-gradient-to-r from-purple-400 to-purple-600 h-full rounded-full"
                      style={{ width: `${performance.studentToday}%` }}
                    ></div>
                  </span>
                  <span>Hari ini</span>
                </div>
              </div>

              {/* Student Lateness Comparison */}
              <div className="p-4 bg-gradient-to-r from-amber-50 to-white dark:from-amber-900/10 dark:to-transparent rounded-lg border border-amber-100 dark:border-amber-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex items-center justify-center">
                      <span className="text-amber-600 dark:text-amber-400">⏰</span>
                    </div>
                    <div>
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        Keterlambatan Siswa
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Dibandingkan kemarin
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                      {performance.lateToday} siswa
                    </div>
                    <div className="text-sm">
                      <span
                        className={`${
                          getTrendIcon(performance.lateYesterday, performance.lateToday).color
                        } font-medium`}
                      >
                        {getTrendIcon(performance.lateYesterday, performance.lateToday).icon}{" "}
                        {Math.abs(performance.lateToday - performance.lateYesterday)}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                        ({performance.lateYesterday} kemarin)
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Hari ini</span>
                      <span>Kemarin</span>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                        <div
                          className="bg-gradient-to-r from-amber-400 to-amber-600 h-full rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              (performance.lateToday /
                                Math.max(performance.lateToday, performance.lateYesterday, 1)) *
                                100
                            )}%`,
                          }}
                        ></div>
                      </div>
                      <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                        <div
                          className="bg-gradient-to-r from-slate-400 to-slate-600 h-full rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              (performance.lateYesterday /
                                Math.max(performance.lateToday, performance.lateYesterday, 1)) *
                                100
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Urgent Actions */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span className="text-red-600 dark:text-red-400">🚨</span>
                Tindakan Mendesak
              </h3>
              <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 px-2 py-1 rounded-full">
                {urgentActions.length} item
              </span>
            </div>

            <div className="space-y-3">
              {urgentActions.map((action) => (
                <div
                  key={action.id}
                  className={`p-4 rounded-lg border ${
                    action.type === "critical"
                      ? "bg-gradient-to-r from-red-50 to-white dark:from-red-900/20 dark:to-transparent border-red-200 dark:border-red-800"
                      : action.type === "warning"
                      ? "bg-gradient-to-r from-amber-50 to-white dark:from-amber-900/20 dark:to-transparent border-amber-200 dark:border-amber-800"
                      : "bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-900/20 dark:to-transparent border-emerald-200 dark:border-emerald-800"
                  } cursor-pointer hover:shadow-md transition-shadow`}
                  onClick={() => navigate(action.route)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`text-xl ${
                        action.type === "critical"
                          ? "text-red-600 dark:text-red-400"
                          : action.type === "warning"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {action.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4
                          className={`font-medium ${
                            action.type === "critical"
                              ? "text-red-700 dark:text-red-300"
                              : action.type === "warning"
                              ? "text-amber-700 dark:text-amber-300"
                              : "text-emerald-700 dark:text-emerald-300"
                          }`}
                        >
                          {action.title}
                        </h4>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            action.type === "critical"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                              : action.type === "warning"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          }`}
                        >
                          {action.type === "critical"
                            ? "KRITIS"
                            : action.type === "warning"
                            ? "PERINGATAN"
                            : "INFO"}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                        {action.description}
                      </p>
                      <button className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1">
                        {action.action} →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Activity Timeline */}
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
              <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-3">
                🕐 Aktivitas Terbaru
              </h4>
              <div className="space-y-2">
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg"
                    >
                      <div className="flex-shrink-0 w-8 text-center">
                        <span className="text-lg">{activity.icon}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {activity.text}
                        </p>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-500">
                        {activity.time}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-slate-500 dark:text-slate-400">
                    <p className="text-sm">Tidak ada aktivitas terbaru</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pengumuman Section */}
        <div className="bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/50 dark:from-slate-800 dark:via-blue-900/10 dark:to-indigo-900/10 rounded-xl shadow-xl border border-blue-100 dark:border-blue-800 p-4 sm:p-5 md:p-6 backdrop-blur-sm transition-colors duration-200">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
            <h3 className="text-base sm:text-lg md:text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center">
              <span className="mr-2 text-blue-600 dark:text-blue-400">📢</span>
              Kelola Pengumuman
            </h3>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 dark:from-green-600 dark:to-emerald-700 dark:hover:from-green-700 dark:hover:to-emerald-800 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 text-sm sm:text-base shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 hover:scale-105 active:scale-95 touch-manipulation"
              disabled={submitting}
            >
              <span className="mr-1">✨</span> Tambah Pengumuman
            </button>
          </div>

          {/* Form dengan field lengkap */}
          {showAddForm && (
            <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 dark:from-slate-800 dark:to-blue-900/10 p-4 rounded-xl mb-4 border-2 border-blue-200 dark:border-blue-700 shadow-inner backdrop-blur-sm transition-colors duration-200">
              <h4 className="font-semibold mb-3 text-slate-800 dark:text-slate-200 text-sm sm:text-base flex items-center">
                <span className="mr-2">{editData ? "✏️" : "➕"}</span>
                {editData ? "Edit Pengumuman" : "Tambah Pengumuman Baru"}
              </h4>
              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Judul */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Judul Pengumuman *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm sm:text-base"
                    required
                    disabled={submitting}
                    placeholder="Contoh: Jadwal Pembagian Raport"
                  />
                </div>

                {/* Konten */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Isi Pengumuman *
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm sm:text-base"
                    required
                    disabled={submitting}
                    placeholder="Masukkan detail pengumuman..."
                  />
                </div>

                {/* Tanggal Efektif */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Mulai Tayang *
                    </label>
                    <input
                      type="datetime-local"
                      value={formatDateForInput(formData.effective_from)}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          effective_from: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm sm:text-base"
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Berakhir *
                    </label>
                    <input
                      type="datetime-local"
                      value={formatDateForInput(formData.effective_until)}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          effective_until: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm sm:text-base"
                      required
                      disabled={submitting}
                    />
                  </div>
                </div>

                {/* Target Role & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Target Penerima *
                    </label>
                    <select
                      value={formData.target_role}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          target_role: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm sm:text-base"
                      disabled={submitting}
                    >
                      <option value="semua">Semua Guru</option>
                      <option value="teacher">Guru Mapel</option>
                      <option value="walikelas">Wali Kelas</option>
                      <option value="guru_bk">Guru BK</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Status
                    </label>
                    <div className="flex items-center h-10">
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              is_active: e.target.checked,
                            })
                          }
                          className="sr-only peer"
                          disabled={submitting}
                        />
                        <div className="relative w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-700"></div>
                        <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                          {formData.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Tombol Action */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 disabled:from-blue-300 disabled:to-blue-400 dark:disabled:from-blue-800 dark:disabled:to-blue-900 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 text-sm sm:text-base shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none active:scale-95 touch-manipulation"
                  >
                    <span className="mr-1">{submitting ? "⏳" : editData ? "💾" : "✨"}</span>
                    {submitting ? "Menyimpan..." : editData ? "Update" : "Simpan"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={submitting}
                    className="bg-gradient-to-r from-slate-400 to-slate-500 hover:from-slate-500 hover:to-slate-600 dark:from-slate-600 dark:to-slate-700 dark:hover:from-slate-700 dark:hover:to-slate-800 disabled:from-slate-300 disabled:to-slate-400 dark:disabled:from-slate-800 dark:disabled:to-slate-900 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 text-sm sm:text-base shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none active:scale-95 touch-manipulation"
                  >
                    <span className="mr-1">✕</span>
                    Batal
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Daftar Pengumuman dengan info lengkap */}
          <div>
            {announcements.length > 0 ? (
              <div className="space-y-4">
                {announcements.map((announcement) => {
                  const isActive = isAnnouncementActive(announcement);
                  const statusColor = announcement.is_active
                    ? isActive
                      ? "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300"
                      : "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400";

                  return (
                    <div
                      key={announcement.id}
                      className="group border-l-4 border-blue-500 dark:border-blue-600 pl-4 py-3 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-r-xl hover:from-blue-100/80 hover:to-indigo-100/50 dark:hover:from-blue-900/40 dark:hover:to-indigo-900/40 transition-all duration-300 transform hover:scale-[1.02] shadow-md hover:shadow-lg"
                    >
                      <div className="flex flex-col gap-3">
                        {/* Header: Title + Status Badge */}
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm sm:text-base group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors flex items-start flex-1">
                            <span className="mr-2 mt-0.5">📋</span>
                            {announcement.title}
                          </h4>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColor}`}
                            >
                              {announcement.is_active
                                ? isActive
                                  ? "🟢 Tayang"
                                  : "🟡 Dijadwalkan"
                                : "⚫ Nonaktif"}
                            </span>
                            <button
                              onClick={() =>
                                toggleActiveStatus(announcement.id, announcement.is_active)
                              }
                              className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              title={announcement.is_active ? "Nonaktifkan" : "Aktifkan"}
                            >
                              {announcement.is_active ? "👁️" : "🚫"}
                            </button>
                          </div>
                        </div>

                        {/* Content */}
                        <p className="text-sm text-slate-600 dark:text-slate-400 ml-6 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                          {announcement.content}
                        </p>

                        {/* Meta Info */}
                        <div className="ml-6 space-y-1">
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-500">
                            <span className="flex items-center gap-1">
                              <span>👥</span>
                              <span className="font-medium">
                                {announcement.target_role === "semua"
                                  ? "Semua Guru"
                                  : announcement.target_role === "teacher"
                                  ? "Guru Mapel"
                                  : announcement.target_role === "walikelas"
                                  ? "Wali Kelas"
                                  : announcement.target_role === "guru_bk"
                                  ? "Guru BK"
                                  : "Admin"}
                              </span>
                            </span>
                            <span className="flex items-center gap-1">
                              <span>📅</span>
                              <span>
                                {new Date(announcement.effective_from).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                })}{" "}
                                -{" "}
                                {new Date(announcement.effective_until).toLocaleDateString(
                                  "id-ID",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )}
                              </span>
                            </span>
                            <span className="flex items-center gap-1">
                              <span>🕐</span>
                              <span>
                                {new Date(announcement.created_at).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 ml-6">
                          <button
                            onClick={() => handleEdit(announcement)}
                            disabled={submitting}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:text-blue-400 dark:disabled:text-blue-700 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all duration-200 transform hover:scale-105 active:scale-95 touch-manipulation shadow-sm"
                          >
                            <span className="mr-1">✏️</span>Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(announcement.id)}
                            disabled={submitting}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 disabled:text-red-400 dark:disabled:text-red-700 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200 transform hover:scale-105 active:scale-95 touch-manipulation shadow-sm"
                          >
                            <span className="mr-1">🗑️</span>Hapus
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-10 md:py-12 bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-800 dark:to-blue-900/10 rounded-xl border-2 border-dashed border-blue-200 dark:border-blue-800 transition-colors duration-200">
                <div className="text-2xl sm:text-3xl md:text-4xl mb-4 animate-bounce">📢</div>
                <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-2 text-sm sm:text-base">
                  Belum Ada Pengumuman
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Klik tombol "✨ Tambah Pengumuman" untuk membuat pengumuman pertama
                </p>
                <div className="inline-flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                  <span className="mr-1">💡</span>
                  Tip: Pengumuman akan tampil otomatis di dashboard guru
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              <p>Dashboard Admin • {getTodayFormatted()}</p>
              <p className="text-xs mt-1">Terakhir diperbarui: {monitoring.lastUpdate}</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => fetchAllData()}
                className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
              >
                <span>🔄</span>
                Refresh Data
              </button>
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-slate-600 dark:text-slate-400">Online</span>
                </div>
                <span className="text-slate-400 dark:text-slate-600">•</span>
                <span className="text-slate-600 dark:text-slate-400">System v1.0.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
