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
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current academic year
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

      // Parallel fetch semua data
      const [
        teachersResult,
        classesResult,
        studentsResult,
        announcementsResult,
      ] = await Promise.all([
        supabase
          .from("users")
          .select("id")
          .in("role", ["teacher", "homeroom_teacher"])
          .eq("is_active", true),

        supabase.from("classes").select("id").eq("academic_year", currentYear),

        supabase
          .from("students")
          .select("id, class_id")
          .eq("academic_year", currentYear)
          .eq("is_active", true),

        supabase
          .from("announcement") // ✅ FIXED: Changed from "announcements" to "announcement"
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      // Handle errors
      const hasErrors = [
        teachersResult,
        classesResult,
        studentsResult,
        announcementsResult,
      ].some((result) => result.error);

      if (hasErrors) {
        console.error("Some queries failed:", {
          teachers: teachersResult.error,
          classes: classesResult.error,
          students: studentsResult.error,
          announcements: announcementsResult.error,
        });
      }

      // Get class data untuk students by grade
      const { data: classesData, error: classesError } = await supabase
        .from("classes")
        .select("id, grade")
        .eq("academic_year", currentYear);

      if (classesError) {
        console.error("Classes data error:", classesError);
      }

      // Process students by grade
      const gradeStats = {};
      if (studentsResult.data && classesData) {
        studentsResult.data.forEach((student) => {
          if (student?.class_id) {
            const classData = classesData.find(
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
        totalTeachers: teachersResult.data?.length || 0,
        totalClasses: classesResult.data?.length || 0,
        totalStudents: studentsResult.data?.length || 0,
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

  // CREATE - Tambah announcement baru
  const createAnnouncement = async (title, content) => {
    try {
      if (!title?.trim() || !content?.trim()) {
        throw new Error("Judul dan konten tidak boleh kosong");
      }

      const { data, error } = await supabase
        .from("announcement") // ✅ FIXED: Changed from "announcements" to "announcement"
        .insert([
          {
            title: title.trim(),
            content: content.trim(),
          },
        ])
        .select("*");

      if (error) {
        console.error("Create error details:", error);
        throw new Error(`Gagal membuat pengumuman: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error("Gagal membuat pengumuman");
      }

      const newRecord = data[0];
      setAnnouncements((prev) => [newRecord, ...prev.slice(0, 4)]); // Keep only 5 items

      console.log("Create successful:", newRecord);
      return { data: newRecord, error: null };
    } catch (error) {
      console.error("Error creating announcement:", error);
      return { data: null, error };
    }
  };

  // UPDATE - Edit announcement (FIXED)
  const updateAnnouncement = async (id, updates) => {
    try {
      if (!id) throw new Error("ID pengumuman tidak valid");
      if (!updates.title?.trim() || !updates.content?.trim()) {
        throw new Error("Judul dan konten tidak boleh kosong");
      }

      // Perform update with returning data
      const { data, error } = await supabase
        .from("announcement") // ✅ FIXED: Changed from "announcements" to "announcement"
        .update({
          title: updates.title.trim(),
          content: updates.content.trim(),
        })
        .eq("id", id)
        .select("*");

      if (error) {
        console.error("Update error details:", error);
        throw new Error(`Gagal mengupdate: ${error.message}`);
      }

      // Check if update affected any rows
      if (!data || data.length === 0) {
        throw new Error("Pengumuman tidak ditemukan");
      }

      const updatedRecord = data[0];

      // Update local state
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

  // DELETE - Hapus announcement
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
        .from("announcement") // ✅ FIXED: Changed from "announcements" to "announcement"
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      console.log("🟡 [DEBUG] handleSubmit started", {
        editData,
        formData,
        hasEditData: !!editData?.id,
      });

      if (editData?.id) {
        console.log("🟡 [DEBUG] Attempting UPDATE...");
        const result = await updateAnnouncement(editData.id, formData);
        console.log("🟡 [DEBUG] Update result:", result);

        if (result.data) {
          console.log("✅ [DEBUG] Update successful");
          setShowAddForm(false);
          setEditData(null);
          setFormData({ title: "", content: "" });
        } else {
          console.error("❌ [DEBUG] Update failed:", result.error);
          setError(result.error?.message || "Gagal mengupdate pengumuman");
        }
      } else {
        console.log("🟡 [DEBUG] Attempting CREATE...");
        const result = await createAnnouncement(
          formData.title,
          formData.content
        );
        console.log("🟡 [DEBUG] Create result:", result);

        if (result.data) {
          console.log("✅ [DEBUG] Create successful");
          setShowAddForm(false);
          setEditData(null);
          setFormData({ title: "", content: "" });
        } else {
          console.error("❌ [DEBUG] Create failed:", result.error);
          setError(result.error?.message || "Gagal membuat pengumuman");
        }
      }
    } catch (err) {
      console.error("❌ [DEBUG] Submit error:", err);
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
    });
    setShowAddForm(true);
    setError(null);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditData(null);
    setFormData({ title: "", content: "" });
    setError(null);
  };

  const handleRetry = () => {
    setError(null);
    fetchDashboardData();
  };

  const handleDeleteClick = async (id) => {
    try {
      await deleteAnnouncement(id);
    } catch (err) {
      setError(err.message || "Gagal menghapus pengumuman");
    }
  };

  // Navigation handlers for Quick Actions
  const handleManageTeachers = () => {
    navigate('/teachers');
  };

  const handleManageClasses = () => {
    navigate('/classes');
  };

  const handleManageStudents = () => {
    navigate('/students');
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

      {/* Enhanced Header - Removed Clock */}
      <div className="mb-6 sm:mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 lg:p-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-800 mb-3 sm:mb-2">
              Selamat Datang, {user?.full_name || user?.username}!
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
        {/* Total Guru */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-1">Total Guru</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-800">
                {stats.totalTeachers}
              </p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 text-sm sm:text-lg lg:text-2xl">👩‍🏫</span>
            </div>
          </div>
        </div>

        {/* Total Kelas */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-1">Total Kelas</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-800">
                {stats.totalClasses}
              </p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 text-sm sm:text-lg lg:text-2xl">🏫</span>
            </div>
          </div>
        </div>

        {/* Total Siswa */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-1">Total Siswa</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-800">
                {stats.totalStudents}
              </p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 text-sm sm:text-lg lg:text-2xl">👨‍🎓</span>
            </div>
          </div>
        </div>

        {/* Siswa per Jenjang */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 lg:p-6 col-span-2 lg:col-span-1">
          <div>
            <p className="text-xs sm:text-sm text-slate-500 mb-2 sm:mb-3">Siswa per Jenjang</p>
            <div className="space-y-1.5 sm:space-y-2">
              {stats.studentsByGrade.length > 0 ? (
                stats.studentsByGrade.map(({ grade, count }) => (
                  <div
                    key={grade}
                    className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm font-medium text-slate-700">
                      Kelas {grade}
                    </span>
                    <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                      {count}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs sm:text-sm text-slate-500 text-center">
                  Tidak ada data
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3 sm:mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <button 
            onClick={handleManageTeachers}
            className="bg-white hover:bg-blue-50 hover:border-blue-200 text-slate-800 p-3 sm:p-4 rounded-lg text-left h-auto transition-colors border border-slate-200 group">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-blue-200">
              <span className="text-blue-600 text-sm sm:text-lg">👩‍🏫</span>
            </div>
            <div className="font-semibold text-sm sm:text-base">Kelola Data Guru</div>
            <div className="text-xs sm:text-sm text-slate-600 mt-1">Tambah, edit, hapus guru</div>
          </button>

          <button 
            onClick={handleManageClasses}
            className="bg-white hover:bg-blue-50 hover:border-blue-200 text-slate-800 p-3 sm:p-4 rounded-lg text-left h-auto transition-colors border border-slate-200 group">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-blue-200">
              <span className="text-blue-600 text-sm sm:text-lg">🏫</span>
            </div>
            <div className="font-semibold text-sm sm:text-base">Kelola Kelas</div>
            <div className="text-xs sm:text-sm text-slate-600 mt-1">Atur kelas & tahun ajaran</div>
          </button>

          <button 
            onClick={handleManageStudents}
            className="bg-white hover:bg-blue-50 hover:border-blue-200 text-slate-800 p-3 sm:p-4 rounded-lg text-left h-auto transition-colors border border-slate-200 group">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-blue-200">
              <span className="text-blue-600 text-sm sm:text-lg">👨‍🎓</span>
            </div>
            <div className="font-semibold text-sm sm:text-base">Kelola Siswa</div>
            <div className="text-xs sm:text-sm text-slate-600 mt-1">Data siswa & enrollment</div>
          </button>

          <button
            onClick={handleRetry}
            className="bg-white hover:bg-blue-50 hover:border-blue-200 text-slate-800 p-3 sm:p-4 rounded-lg text-left h-auto transition-colors border border-slate-200 group">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-blue-200">
              <span className="text-blue-600 text-sm sm:text-lg">🔄</span>
            </div>
            <div className="font-semibold text-sm sm:text-base">Refresh Data</div>
            <div className="text-xs sm:text-sm text-slate-600 mt-1">Muat ulang dashboard</div>
          </button>
        </div>
      </div>

      {/* Pengumuman Terkini */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
          <h3 className="text-base sm:text-lg font-semibold text-slate-800 flex items-center">
            <span className="mr-2">📢</span>
            Pengumuman Terkini
          </h3>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base"
            disabled={submitting}>
            + Tambah
          </button>
        </div>

        {/* Form Tambah/Edit */}
        {showAddForm && (
          <div className="bg-slate-50 p-4 rounded-lg mb-4 border border-slate-200">
            <h4 className="font-semibold mb-3 text-slate-800 text-sm sm:text-base">
              {editData ? "Edit Pengumuman" : "Tambah Pengumuman Baru"}
            </h4>
            <div onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Judul *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  required
                  disabled={submitting}
                  placeholder="Masukkan judul pengumuman"
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Konten *
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  required
                  disabled={submitting}
                  placeholder="Masukkan isi pengumuman"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md font-medium transition-colors text-sm sm:text-base">
                  {submitting ? "Menyimpan..." : editData ? "Update" : "Simpan"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={submitting}
                  className="bg-slate-500 hover:bg-slate-600 disabled:bg-slate-400 text-white px-4 py-2 rounded-md font-medium transition-colors text-sm sm:text-base">
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Daftar Pengumuman */}
        <div>
          {announcements.length > 0 ? (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="border-l-4 border-blue-500 pl-4 py-3 bg-blue-50 rounded-r-lg">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-800 text-sm sm:text-base">
                        {announcement.title || "No Title"}
                      </h4>
                      <p className="text-sm text-slate-600 mt-1">
                        {announcement.content || "No content"}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        {announcement.created_at
                          ? new Date(
                              announcement.created_at
                            ).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Tanggal tidak tersedia"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(announcement)}
                        disabled={submitting}
                        className="text-blue-600 hover:text-blue-800 disabled:text-blue-400 text-sm font-medium px-2 py-1 rounded hover:bg-blue-100 transition-colors">
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(announcement.id)}
                        disabled={submitting}
                        className="text-red-600 hover:text-red-800 disabled:text-red-400 text-sm font-medium px-2 py-1 rounded hover:bg-red-100 transition-colors">
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-2xl sm:text-4xl mb-3">📢</div>
              <h4 className="font-medium text-slate-800 mb-1 text-sm sm:text-base">
                Belum Ada Pengumuman
              </h4>
              <p className="text-sm text-slate-600">
                Klik tombol "+ Tambah" untuk membuat pengumuman pertama
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;