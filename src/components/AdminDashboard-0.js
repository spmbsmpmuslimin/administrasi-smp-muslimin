//[file name]: AdminDashboard.js - IMPROVED VERSION with UX Enhancement
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const AdminDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalTeachers: 0,
    totalClasses: 0,
    totalStudents: 0,
    studentsByGrade: [],
  });
  
  // 🆕 NEW: Teacher attendance state
  const [teacherAttendance, setTeacherAttendance] = useState({
    hadir: 0,
    belumAbsen: 0,
    total: 0,
    percentage: 0,
    loading: true,
  });
  
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

  useEffect(() => {
    fetchDashboardData();
    fetchTeacherAttendance();
    
    // 🆕 Auto-refresh teacher attendance every 5 minutes
    const interval = setInterval(fetchTeacherAttendance, 300000);
    return () => clearInterval(interval);
  }, []);

  // 🆕 NEW: Fetch teacher attendance for today
  const fetchTeacherAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get total active teachers (excluding adenurmughni)
      const { count: totalTeachers } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .in("role", ["teacher", "guru_bk"])
        .eq("is_active", true)
        .neq("username", "adenurmughni");

      // Get teachers who have checked in today
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("user_id")
        .eq("date", today)
        .in("status", ["hadir", "terlambat"]);

      const hadirCount = attendanceData ? attendanceData.length : 0;
      const belumAbsen = (totalTeachers || 0) - hadirCount;
      const percentage = totalTeachers > 0 ? Math.round((hadirCount / totalTeachers) * 100) : 0;

      setTeacherAttendance({
        hadir: hadirCount,
        belumAbsen: belumAbsen,
        total: totalTeachers || 0,
        percentage: percentage,
        loading: false,
      });
    } catch (err) {
      console.error("Error fetching teacher attendance:", err);
      setTeacherAttendance(prev => ({ ...prev, loading: false }));
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: activeYear, error: yearError } = await supabase
        .from("classes")
        .select("academic_year")
        .order("academic_year", { ascending: false })
        .limit(1)
        .single();

      if (yearError && yearError.code !== "PGRST116") {
        console.warn("Error fetching academic year:", yearError.message);
      }

      const currentYear = activeYear?.academic_year || "2025/2026";

      const [
        teachersResult,
        classesResult,
        studentsResult,
        gradesResult,
        announcementsResult,
      ] = await Promise.all([
        supabase
          .from("users")
          .select("id", { count: "exact", head: true })
          .in("role", ["teacher", "guru_bk"])
          .eq("is_active", true)
          .neq("username", "adenurmughni"),
        supabase
          .from("classes")
          .select("id", { count: "exact", head: true })
          .eq("academic_year", currentYear),
        supabase
          .from("students")
          .select("id, class_id", { count: "exact" })
          .eq("academic_year", currentYear)
          .eq("is_active", true),
        supabase
          .from("classes")
          .select("id, grade")
          .eq("academic_year", currentYear),
        supabase
          .from("announcement")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      const hasErrors = [
        teachersResult,
        classesResult,
        studentsResult,
        gradesResult,
        announcementsResult,
      ].some((result) => result.error);

      if (hasErrors) {
        console.error("Some queries failed:", {
          teachers: teachersResult.error,
          classes: classesResult.error,
          students: studentsResult.error,
          grades: gradesResult.error,
          announcements: announcementsResult.error,
        });
      }

      const gradeStats = {};
      if (studentsResult.data && gradesResult.data) {
        studentsResult.data.forEach((student) => {
          if (student?.class_id) {
            const classData = gradesResult.data.find(
              (c) => c?.id === student.class_id
            );
            if (classData?.grade) {
              const grade = classData.grade;
              gradeStats[grade] = (gradeStats[grade] || 0) + 1;
            }
          }
        });
      }

      const studentsByGrade = Object.entries(gradeStats)
        .map(([grade, count]) => ({ grade: parseInt(grade), count }))
        .sort((a, b) => a.grade - b.grade);

      setStats({
        totalTeachers: teachersResult.count || 0,
        totalClasses: classesResult.count || 0,
        totalStudents: studentsResult.count || 0,
        studentsByGrade,
      });

      setAnnouncements(announcementsResult.data || []);
    } catch (err) {
      console.error("Error fetching admin dashboard data:", err);
      setError("Gagal memuat data dashboard. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const createAnnouncement = async (data) => {
    try {
      if (!data.title?.trim() || !data.content?.trim()) {
        throw new Error("Judul dan konten tidak boleh kosong");
      }

      if (!data.effective_from || !data.effective_until) {
        throw new Error("Tanggal efektif harus diisi");
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

      if (error) {
        console.error("Create error details:", error);
        throw new Error(`Gagal membuat pengumuman: ${error.message}`);
      }

      if (!newData || newData.length === 0) {
        throw new Error("Gagal membuat pengumuman");
      }

      const newRecord = newData[0];
      setAnnouncements((prev) => [newRecord, ...prev]);

      console.log("Create successful:", newRecord);
      return { data: newRecord, error: null };
    } catch (error) {
      console.error("Error creating announcement:", error);
      return { data: null, error };
    }
  };

  const updateAnnouncement = async (id, updates) => {
    try {
      if (!id) throw new Error("ID pengumuman tidak valid");
      if (!updates.title?.trim() || !updates.content?.trim()) {
        throw new Error("Judul dan konten tidak boleh kosong");
      }
      if (!updates.effective_from || !updates.effective_until) {
        throw new Error("Tanggal efektif harus diisi");
      }

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

      if (error) {
        console.error("Update error details:", error);
        throw new Error(`Gagal mengupdate: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error("Pengumuman tidak ditemukan");
      }

      const updatedRecord = data[0];
      setAnnouncements((prev) =>
        prev.map((item) => (item.id === id ? updatedRecord : item))
      );

      console.log("Update successful:", updatedRecord);
      return { data: updatedRecord, error: null };
    } catch (error) {
      console.error("Error updating announcement:", error);
      return { data: null, error };
    }
  };

  const deleteAnnouncement = async (id) => {
    try {
      if (!id) {
        throw new Error("ID pengumuman tidak valid");
      }

      if (
        !window.confirm("Apakah Anda yakin ingin menghapus pengumuman ini?")
      ) {
        return { error: null };
      }

      const { error } = await supabase
        .from("announcement")
        .delete()
        .eq("id", id);

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
        prev.map((item) =>
          item.id === id ? { ...item, is_active: !currentStatus } : item
        )
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

  // 🆕 Get today's date formatted
  const getTodayFormatted = () => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('id-ID', options);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Memuat dashboard admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div>
            <span className="font-medium">Error: </span>
            {error}
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-800 hover:text-red-900 font-bold text-xl self-end sm:self-auto">
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 lg:p-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-800 mb-3 sm:mb-2">
              Selamat Datang, {user?.full_name || user?.username}
            </h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium bg-purple-50 text-purple-700 border border-purple-200">
                Administrator
              </span>
              <span className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
                Kelola Seluruh Data Sekolah
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 🔥 MOVED TO TOP: Quick Actions - 9 Buttons */}
      <div className="mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3 sm:mb-4">
          Aksi Cepat
        </h2>
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {/* Row 1: Daily Operations */}
          <button
            onClick={() => navigate("/attendance-teacher")}
            className="group bg-white hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 text-slate-800 p-3 sm:p-4 rounded-xl text-center transition-all duration-300 border border-slate-200 hover:border-blue-300 shadow-md hover:shadow-xl transform hover:-translate-y-1">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <span className="text-white text-xl sm:text-2xl">👤</span>
            </div>
            <div className="font-semibold text-xs sm:text-sm group-hover:text-blue-700 transition-colors">
              Presensi Guru
            </div>
          </button>

          <button
            onClick={() => navigate("/attendance-student")}
            className="group bg-white hover:bg-gradient-to-br hover:from-sky-50 hover:to-blue-50 text-slate-800 p-3 sm:p-4 rounded-xl text-center transition-all duration-300 border border-slate-200 hover:border-sky-300 shadow-md hover:shadow-xl transform hover:-translate-y-1">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-sky-400 to-sky-600 rounded-xl flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <span className="text-white text-xl sm:text-2xl">👨‍🎓</span>
            </div>
            <div className="font-semibold text-xs sm:text-sm group-hover:text-sky-700 transition-colors">
              Presensi Siswa
            </div>
          </button>

          <button
            onClick={() => navigate("/classes")}
            className="group bg-white hover:bg-gradient-to-br hover:from-emerald-50 hover:to-green-50 text-slate-800 p-3 sm:p-4 rounded-xl text-center transition-all duration-300 border border-slate-200 hover:border-emerald-300 shadow-md hover:shadow-xl transform hover:-translate-y-1">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <span className="text-white text-xl sm:text-2xl">🏫</span>
            </div>
            <div className="font-semibold text-xs sm:text-sm group-hover:text-emerald-700 transition-colors">
              Data Kelas
            </div>
          </button>

          {/* Row 2: Data Management */}
          <button
            onClick={() => navigate("/teachers")}
            className="group bg-white hover:bg-gradient-to-br hover:from-orange-50 hover:to-amber-50 text-slate-800 p-3 sm:p-4 rounded-xl text-center transition-all duration-300 border border-slate-200 hover:border-orange-300 shadow-md hover:shadow-xl transform hover:-translate-y-1">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <span className="text-white text-xl sm:text-2xl">👥</span>
            </div>
            <div className="font-semibold text-xs sm:text-sm group-hover:text-orange-700 transition-colors">
              Data Guru
            </div>
          </button>

          <button
            onClick={() => navigate("/students")}
            className="group bg-white hover:bg-gradient-to-br hover:from-purple-50 hover:to-violet-50 text-slate-800 p-3 sm:p-4 rounded-xl text-center transition-all duration-300 border border-slate-200 hover:border-purple-300 shadow-md hover:shadow-xl transform hover:-translate-y-1">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <span className="text-white text-xl sm:text-2xl">👨‍🎓</span>
            </div>
            <div className="font-semibold text-xs sm:text-sm group-hover:text-purple-700 transition-colors">
              Data Siswa
            </div>
          </button>

          <button
            onClick={() => navigate("/reports")}
            className="group bg-white hover:bg-gradient-to-br hover:from-pink-50 hover:to-rose-50 text-slate-800 p-3 sm:p-4 rounded-xl text-center transition-all duration-300 border border-slate-200 hover:border-pink-300 shadow-md hover:shadow-xl transform hover:-translate-y-1">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-pink-400 to-pink-600 rounded-xl flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <span className="text-white text-xl sm:text-2xl">📋</span>
            </div>
            <div className="font-semibold text-xs sm:text-sm group-hover:text-pink-700 transition-colors">
              Laporan
            </div>
          </button>

          {/* Row 3: System Control */}
          <button
            onClick={() => navigate("/settings")}
            className="group bg-white hover:bg-gradient-to-br hover:from-slate-50 hover:to-gray-50 text-slate-800 p-3 sm:p-4 rounded-xl text-center transition-all duration-300 border border-slate-200 hover:border-slate-400 shadow-md hover:shadow-xl transform hover:-translate-y-1">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-slate-500 to-slate-700 rounded-xl flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <span className="text-white text-xl sm:text-2xl">⚙️</span>
            </div>
            <div className="font-semibold text-xs sm:text-sm group-hover:text-slate-700 transition-colors">
              Pengaturan
            </div>
          </button>

          <button
            onClick={() => navigate("/monitor")}
            className="group bg-white hover:bg-gradient-to-br hover:from-cyan-50 hover:to-teal-50 text-slate-800 p-3 sm:p-4 rounded-xl text-center transition-all duration-300 border border-slate-200 hover:border-cyan-300 shadow-md hover:shadow-xl transform hover:-translate-y-1">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-xl flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <span className="text-white text-xl sm:text-2xl">🖥️</span>
            </div>
            <div className="font-semibold text-xs sm:text-sm group-hover:text-cyan-700 transition-colors">
              Monitor Sistem
            </div>
          </button>

          <button
            onClick={() => navigate("/spmb")}
            className="group bg-white hover:bg-gradient-to-br hover:from-yellow-50 hover:to-amber-50 text-slate-800 p-3 sm:p-4 rounded-xl text-center transition-all duration-300 border border-slate-200 hover:border-yellow-300 shadow-md hover:shadow-xl transform hover:-translate-y-1">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <span className="text-white text-xl sm:text-2xl">📋</span>
            </div>
            <div className="font-semibold text-xs sm:text-sm group-hover:text-yellow-700 transition-colors">
              SPMB
            </div>
          </button>
        </div>
      </div>

      {/* 🆕 NEW: Presensi Guru Hari Ini Card */}
      <div className="mb-6 sm:mb-8">
        <div 
          className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 rounded-xl shadow-lg border border-blue-200 p-4 sm:p-6 cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          onClick={() => navigate("/attendance-teacher")}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-slate-800 flex items-center gap-2">
                <span className="text-blue-600">📅</span>
                Presensi Guru Hari Ini
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                {getTodayFormatted()}
              </p>
            </div>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded-lg hover:bg-blue-100 transition-all">
              Lihat Detail →
            </button>
          </div>

          {teacherAttendance.loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white rounded-lg p-3 sm:p-4 border border-green-200">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg sm:text-xl">✅</span>
                    <span className="text-xs sm:text-sm font-medium text-slate-600">Hadir</span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-green-600">
                    {teacherAttendance.hadir}
                  </p>
                </div>

                <div className="bg-white rounded-lg p-3 sm:p-4 border border-orange-200">
                  <div className="flex items-center gap-