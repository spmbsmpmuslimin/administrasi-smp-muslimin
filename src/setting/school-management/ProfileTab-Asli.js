import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../supabaseClient";
import ChangePasswordSection from "./ChangePasswordSection";
import {
  User,
  Mail,
  Shield,
  BookOpen,
  School,
  Calendar,
  History,
  ChevronDown,
  ChevronUp,
  Award,
  Clock,
  Users,
  Search,
  Eye,
  Edit2,
  Trash2,
  Plus,
  X,
  Save,
  AlertCircle,
  Phone,
  List,
} from "lucide-react";

const ProfileTab = ({ userId, user, showToast, loading, setLoading }) => {
  const [profileData, setProfileData] = useState(null);
  const [activeAcademicYear, setActiveAcademicYear] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [targetUserId, setTargetUserId] = useState(userId);

  // User Management States
  const [showUserList, setShowUserList] = useState(false);
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(20);
  const [totalUsers, setTotalUsers] = useState(0);

  // CRUD States
  const [showUserModal, setShowUserModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: "",
    full_name: "",
    password: "",
    role: "teacher",
    teacher_id: "",
    no_hp: "",
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [newGeneratedPassword, setNewGeneratedPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);

  // Delete Modal States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingUser, setDeletingUser] = useState(false);

  const isInitialLoad = useRef(true);

  // LOGIC: Fetch Active Academic Year
  const fetchActiveAcademicYear = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("academic_years")
        .select("year")
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Error fetching active academic year:", error);
        return null;
      }

      return data?.year || null;
    } catch (err) {
      console.error("Error in fetchActiveAcademicYear:", err);
      return null;
    }
  }, []);

  // LOGIC: Search Users (Admin) dengan Pagination
  const searchUsers = useCallback(
    async (query, page = 1) => {
      try {
        setSearching(true);
        const from = (page - 1) * usersPerPage;
        const to = from + usersPerPage - 1;

        let queryBuilder = supabase
          .from("users")
          .select(
            "id, username, full_name, role, teacher_id, is_active, created_at, no_hp",
            { count: "exact" }
          )
          .neq("role", "admin")
          .order("teacher_id", { ascending: true, nullsFirst: false })
          .order("full_name", { ascending: true })
          .range(from, to);

        if (query.trim()) {
          queryBuilder = queryBuilder.or(
            `full_name.ilike.%${query}%,username.ilike.%${query}%,teacher_id.ilike.%${query}%`
          );
        }

        const { data, error, count } = await queryBuilder;

        if (error) {
          console.error("Error searching users:", error);
          showToast("Gagal memuat daftar pengguna", "error");
          return;
        }

        setUserSearchResults(data || []);
        setTotalUsers(count || 0);
        setCurrentPage(page);
      } catch (err) {
        console.error("Error in searchUsers:", err);
        showToast("Terjadi kesalahan saat memuat pengguna", "error");
      } finally {
        setSearching(false);
      }
    },
    [showToast, usersPerPage]
  );

  // LOGIC: Load User Profile
  const loadUserProfile = useCallback(
    async (uid) => {
      try {
        console.log("Loading profile for user:", uid);
        setLoading(true);

        if (!uid) {
          console.error("User ID is missing");
          showToast("ID pengguna tidak ditemukan", "error");
          setLoading(false);
          return;
        }

        const activeYear = await fetchActiveAcademicYear();
        setActiveAcademicYear(activeYear);

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select(
            "id, username, full_name, role, teacher_id, homeroom_class_id, is_active, created_at, no_hp"
          )
          .eq("id", uid)
          .maybeSingle();

        if (userError) {
          console.error("Error loading user profile:", userError);
          const errorMsg =
            userError.code === "PGRST116"
              ? "Pengguna tidak ditemukan"
              : `Gagal memuat profil: ${userError.message}`;
          showToast(errorMsg, "error");
          setLoading(false);
          return;
        }

        if (!userData) {
          showToast("Data pengguna tidak ditemukan", "error");
          setLoading(false);
          return;
        }

        console.log("User profile loaded:", userData);
        setProfileData(userData);

        if (userData.homeroom_class_id) {
          const { data: classData, error: classError } = await supabase
            .from("classes")
            .select("id, grade, academic_year, is_active")
            .eq("id", userData.homeroom_class_id)
            .maybeSingle();

          if (classError) {
            console.error("Error loading homeroom class:", classError);
          } else if (classData) {
            console.log("Homeroom class loaded:", classData);
            setProfileData((prev) => ({
              ...prev,
              homeroom_class: classData,
            }));
          }
        }

        if (userData.teacher_id && activeYear) {
          await loadTeachingAssignments(userData.teacher_id, activeYear, false);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error loading profile:", err);
        showToast("Terjadi kesalahan saat memuat profil", "error");
        setLoading(false);
      }
    },
    [fetchActiveAcademicYear, setLoading, showToast]
  );

  // LOGIC: Load Teaching Assignments
  const loadTeachingAssignments = useCallback(
    async (teacherId, activeYear, includeHistory = false) => {
      try {
        if (includeHistory) {
          setLoadingHistory(true);
        }

        console.log("🔍 Loading assignments for:", {
          teacherId,
          activeYear,
          includeHistory,
        });

        if (includeHistory) {
          const { data: allAssignments, error: assignError } = await supabase
            .from("teacher_assignments")
            .select(
              `
            id, 
            subject, 
            class_id,
            academic_year, 
            semester,
            classes:class_id (
              id,
              grade,
              academic_year,
              is_active
            )
          `
            )
            .eq("teacher_id", teacherId)
            .order("academic_year", { ascending: false })
            .order("semester", { ascending: false });

          console.log("📊 All assignments:", allAssignments);
          console.log("❌ Error:", assignError);

          if (assignError) {
            console.error("Error loading teaching assignments:", assignError);
            setLoadingHistory(false);
            return;
          }

          if (allAssignments) {
            const filteredAssignments = allAssignments.filter((a) => {
              if (a.academic_year === activeYear) {
                return a.classes !== null;
              }
              return true;
            });

            console.log(
              "✅ Filtered assignments (with history):",
              filteredAssignments
            );

            setProfileData((prev) => ({
              ...prev,
              teaching_assignments: filteredAssignments,
            }));
          }
        } else {
          const { data: currentAssignments, error: assignError } =
            await supabase
              .from("teacher_assignments")
              .select(
                `
            id, 
            subject, 
            class_id,
            academic_year, 
            semester,
            classes:class_id (
              id,
              grade,
              academic_year,
              is_active
            )
          `
              )
              .eq("teacher_id", teacherId)
              .eq("academic_year", activeYear)
              .order("semester", { ascending: false });

          console.log("📊 Current assignments:", currentAssignments);
          console.log("❌ Error:", assignError);

          if (assignError) {
            console.error("Error loading teaching assignments:", assignError);
            return;
          }

          if (currentAssignments) {
            const filteredAssignments = currentAssignments.filter(
              (a) => a.classes !== null
            );

            console.log(
              "✅ Filtered current assignments:",
              filteredAssignments
            );

            setProfileData((prev) => ({
              ...prev,
              teaching_assignments: filteredAssignments,
            }));
          }
        }

        setLoadingHistory(false);
      } catch (err) {
        console.error("Error loading teaching assignments:", err);
        setLoadingHistory(false);
      }
    },
    []
  );

  // LOGIC: Auto-expand list on search
  useEffect(() => {
    if (searchQuery.trim() && !showUserList) {
      setShowUserList(true);
    }
  }, [searchQuery, showUserList]);

  // LOGIC: Filter users based on search
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = userSearchResults.filter(
        (u) =>
          u.full_name.toLowerCase().includes(query) ||
          u.username.toLowerCase().includes(query) ||
          u.teacher_id?.toLowerCase().includes(query)
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(userSearchResults);
    }
  }, [searchQuery, userSearchResults]);

  // LOGIC: Load users on mount (only for admin)
  useEffect(() => {
    if (user?.role === "admin" && userSearchResults.length === 0) {
      searchUsers("");
    }
  }, [user?.role, userSearchResults.length, searchUsers]);

  // LOGIC: Effects for initial load and target user change
  useEffect(() => {
    if (targetUserId && isInitialLoad.current) {
      isInitialLoad.current = false;
      loadUserProfile(targetUserId);
    }
  }, [targetUserId, loadUserProfile]);

  useEffect(() => {
    if (!isInitialLoad.current && targetUserId) {
      loadUserProfile(targetUserId);
    }
  }, [targetUserId]);

  // LOGIC: Effects for loading assignments
  useEffect(() => {
    if (
      !isInitialLoad.current &&
      profileData?.teacher_id &&
      activeAcademicYear
    ) {
      loadTeachingAssignments(
        profileData.teacher_id,
        activeAcademicYear,
        showHistory
      );
    }
  }, [
    showHistory,
    profileData?.teacher_id,
    activeAcademicYear,
    loadTeachingAssignments,
  ]);

  // LOGIC: Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (user?.role === "admin") {
        searchUsers(searchQuery);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers, user?.role]);

  // HANDLER: View Profile
  const handleViewProfile = (selectedUser) => {
    setTargetUserId(selectedUser.id);
    setShowUserList(false);
    setSearchQuery("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // HANDLER: Open Add Modal
  const openAddModal = () => {
    setModalMode("add");
    setEditingUser(null);
    setFormData({
      username: "",
      full_name: "",
      password: "",
      role: "teacher",
      teacher_id: "",
      no_hp: "",
      is_active: true,
    });
    setFormErrors({});
    setShowUserModal(true);
  };

  // HANDLER: Open Edit Modal
  const openEditModal = (user) => {
    setModalMode("edit");
    setEditingUser(user);
    setFormData({
      username: user.username,
      full_name: user.full_name,
      password: "",
      role: user.role,
      teacher_id: user.teacher_id || "",
      no_hp: user.no_hp || "",
      is_active: user.is_active,
    });
    setFormErrors({});
    setShowUserModal(true);
  };

  // LOGIC: Form Validation (Updated)
  const validateForm = () => {
    const errors = {};

    if (!formData.username.trim()) {
      errors.username = "Username wajib diisi";
    } else if (formData.username.length < 3) {
      errors.username = "Username minimal 3 karakter";
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = "Username hanya boleh huruf, angka, dan underscore";
    }

    if (!formData.full_name.trim()) {
      errors.full_name = "Nama lengkap wajib diisi";
    } else if (formData.full_name.length < 3) {
      errors.full_name = "Nama minimal 3 karakter";
    }

    if (modalMode === "add" && !formData.password) {
      errors.password = "Password wajib diisi";
    }
    if (formData.password && formData.password.length < 6) {
      errors.password = "Password minimal 6 karakter";
    }

    if (formData.role === "teacher") {
      if (!formData.teacher_id.trim()) {
        errors.teacher_id = "ID Guru wajib diisi untuk role teacher";
      } else if (!/^G-\d{2,3}$/.test(formData.teacher_id)) {
        errors.teacher_id = "Format salah! Contoh: G-01, G-12, G-100";
      }
    }

    if (formData.no_hp && formData.no_hp.trim()) {
      const cleanPhone = formData.no_hp.replace(/[\s-]/g, "");
      if (!/^(\+62|62|0)[0-9]{9,12}$/.test(cleanPhone)) {
        errors.no_hp = "Format nomor HP tidak valid (contoh: 08123456789)";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // LOGIC: Audit Logging
  const logAuditActivity = async (action, targetUser, details = {}) => {
    try {
      await supabase.from("audit_logs").insert([
        {
          user_id: userId,
          action: action,
          target_user_id: targetUser?.id || null,
          target_user_name: targetUser?.full_name || null,
          details: details,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.error("Failed to log audit:", err);
    }
  };

  // HANDLER: Form Submit (Add/Edit) - Updated
  const handleSubmit = async () => {
    if (!validateForm()) {
      showToast("Mohon lengkapi semua field yang wajib diisi", "error");
      return;
    }

    try {
      setSubmitting(true);

      // Check username uniqueness
      const { data: existingUsername } = await supabase
        .from("users")
        .select("id")
        .eq("username", formData.username)
        .neq("id", editingUser?.id || "00000000-0000-0000-0000-000000000000")
        .maybeSingle();

      if (existingUsername) {
        showToast(`Username "${formData.username}" sudah digunakan!`, "error");
        setFormErrors({ username: "Username sudah digunakan" });
        setSubmitting(false);
        return;
      }

      // Check teacher_id uniqueness
      if (formData.role === "teacher" && formData.teacher_id) {
        const { data: existingTeacherId } = await supabase
          .from("users")
          .select("id, full_name")
          .eq("teacher_id", formData.teacher_id)
          .neq("id", editingUser?.id || "00000000-0000-0000-0000-000000000000")
          .maybeSingle();

        if (existingTeacherId) {
          showToast(
            `ID Guru "${formData.teacher_id}" sudah dipakai oleh ${existingTeacherId.full_name}!`,
            "error"
          );
          setFormErrors({
            teacher_id: `Sudah dipakai oleh ${existingTeacherId.full_name}`,
          });
          setSubmitting(false);
          return;
        }
      }

      // Proceed with insert/update
      if (modalMode === "add") {
        const { error: insertError } = await supabase.from("users").insert([
          {
            username: formData.username,
            password: formData.password,
            full_name: formData.full_name,
            role: formData.role,
            teacher_id:
              formData.role === "teacher" ? formData.teacher_id : null,
            no_hp: formData.no_hp || null,
            is_active: formData.is_active,
          },
        ]);

        if (insertError) {
          showToast(
            `Gagal menyimpan data user: ${insertError.message}`,
            "error"
          );
          setSubmitting(false);
          return;
        }

        await logAuditActivity("CREATE_USER", null, {
          created_username: formData.username,
          created_role: formData.role,
          created_teacher_id: formData.teacher_id,
        });

        showToast("User berhasil ditambahkan!", "success");
        searchUsers("");
        setShowUserModal(false);
      } else if (modalMode === "edit") {
        const updateData = {
          username: formData.username,
          full_name: formData.full_name,
          role: formData.role,
          teacher_id: formData.role === "teacher" ? formData.teacher_id : null,
          no_hp: formData.no_hp || null,
          is_active: formData.is_active,
        };

        if (formData.password) {
          updateData.password = formData.password;
        }

        const { error: updateError } = await supabase
          .from("users")
          .update(updateData)
          .eq("id", editingUser.id);

        if (updateError) {
          showToast(`Gagal mengupdate user: ${updateError.message}`, "error");
          setSubmitting(false);
          return;
        }

        await logAuditActivity("UPDATE_USER", editingUser, {
          updated_fields: Object.keys(updateData),
        });

        showToast("User berhasil diupdate!", "success");
        searchUsers("");

        if (targetUserId === editingUser.id) {
          loadUserProfile(targetUserId);
        }

        setShowUserModal(false);
      }

      setSubmitting(false);
    } catch (err) {
      console.error("Error submitting form:", err);
      showToast("Terjadi kesalahan saat menyimpan data", "error");
      setSubmitting(false);
    }
  };

  // HANDLER: Delete User (Updated)
  const handleOpenDeleteModal = (deleteUser) => {
    if (deleteUser.id === userId) {
      showToast("Anda tidak bisa menghapus akun sendiri!", "error");
      return;
    }
    setDeleteTarget(deleteUser);
    setDeleteConfirmText("");
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteTarget(null);
    setDeleteConfirmText("");
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const expectedText = "HAPUS";
    if (deleteConfirmText.toUpperCase() !== expectedText) {
      showToast(`Ketik "${expectedText}" untuk konfirmasi`, "error");
      return;
    }
    setDeletingUser(true);
    try {
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", deleteTarget.id);
      if (error) throw error;

      await logAuditActivity("DELETE_USER", deleteTarget, {
        deleted_user_role: deleteTarget.role,
        deleted_user_teacher_id: deleteTarget.teacher_id,
      });

      showToast(
        `User "${deleteTarget.full_name}" berhasil dihapus!`,
        "success"
      );
      handleCloseDeleteModal();
      searchUsers("");
      if (targetUserId === deleteTarget.id) setTargetUserId(userId);
    } catch (err) {
      showToast("Gagal menghapus user", "error");
    } finally {
      setDeletingUser(false);
    }
  };

  // ========== FUNGSI BARU UNTUK RESET PASSWORD ==========
  const generateRandomPassword = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const openResetPasswordModal = (user) => {
    setResetPasswordUser(user);
    const generatedPass = generateRandomPassword();
    setNewGeneratedPassword(generatedPass);
    setPasswordCopied(false);
    setShowResetPasswordModal(true);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser || !newGeneratedPassword) return;

    try {
      setResetting(true);

      const { error: updateError } = await supabase
        .from("users")
        .update({
          password: newGeneratedPassword,
          updated_at: new Date().toISOString(),
        })
        .eq("id", resetPasswordUser.id);

      if (updateError) {
        showToast(`Gagal mereset password: ${updateError.message}`, "error");
        setResetting(false);
        return;
      }

      await logAuditActivity("RESET_PASSWORD", resetPasswordUser, {
        reset_by_admin: true,
      });

      showToast(
        `Password berhasil direset untuk ${resetPasswordUser.full_name}!`,
        "success"
      );
      setResetting(false);
      // Optional: close modal after successful reset
      setTimeout(() => setShowResetPasswordModal(false), 1500);
    } catch (err) {
      console.error("Error resetting password:", err);
      showToast("Terjadi kesalahan saat mereset password", "error");
      setResetting(false);
    }
  };

  const copyPasswordToClipboard = () => {
    navigator.clipboard.writeText(newGeneratedPassword);
    setPasswordCopied(true);
    setTimeout(() => setPasswordCopied(false), 2000);
  };

  const closeResetPasswordModal = () => {
    setShowResetPasswordModal(false);
    setResetPasswordUser(null);
    setNewGeneratedPassword("");
    setPasswordCopied(false);
  };
  // =====================================================

  const isViewingOtherProfile = targetUserId !== userId;
  const isAdmin = user?.role === "admin";

  const getClassName = (assignment) => {
    if (assignment.classes?.id) {
      return `Kelas ${assignment.classes.id}`;
    }
    if (assignment.classes?.grade) {
      return `Kelas ${assignment.classes.grade}`;
    }
    return `Kelas ${assignment.class_id}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-900 min-h-[400px] rounded-2xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 dark:border-gray-700 border-t-blue-600 dark:border-t-blue-500 mx-auto"></div>
          <p className="mt-6 text-gray-700 dark:text-gray-300 font-medium text-sm md:text-base">
            Memuat profil...
          </p>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-3 sm:p-4 md:p-6">
        <div className="max-w-xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 sm:p-6 md:p-8 text-center border border-red-200 dark:border-red-800">
          <AlertCircle className="w-12 h-12 sm:w-14 sm:h-14 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            Data Profil Hilang
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm sm:text-base">
            Terjadi kesalahan saat memuat data profil. Silakan coba *logout*
            lalu *login* kembali.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 sm:px-5 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg transition-colors text-sm sm:text-base font-medium min-h-[44px] w-full sm:w-auto">
            Refresh Halaman
          </button>
        </div>
      </div>
    );
  }

  const { teaching_assignments: assignments = [] } = profileData;

  // Filter current assignments
  const currentAssignments = assignments.filter(
    (a) => a.academic_year === activeAcademicYear
  );

  // Calculate stats for current year
  const totalSubjects = currentAssignments.length || 0;
  const uniqueSubjects = [...new Set(currentAssignments?.map((a) => a.subject))]
    .length;
  const totalClasses = [...new Set(currentAssignments?.map((a) => a.class_id))]
    .length;

  // Group history by year and semester
  const groupedAssignments = assignments.reduce((acc, assignment) => {
    const year = assignment.academic_year;
    const semester = assignment.semester;
    if (!acc[year]) {
      acc[year] = {
        year,
        semesters: {},
      };
    }
    if (!acc[year].semesters[semester]) {
      acc[year].semesters[semester] = [];
    }
    acc[year].semesters[semester].push(assignment);
    return acc;
  }, {});

  const historyYears = Object.values(groupedAssignments).sort((a, b) =>
    b.year > a.year ? 1 : b.year < a.year ? -1 : 0
  );

  // =======================================================================
  // ========================== RENDER START ===============================
  // =======================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* User Search & Management (Admin Only) */}
        {isAdmin && (
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 md:p-6 mb-6 sm:mb-8 border border-blue-100 dark:border-gray-700">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4 flex items-center gap-2">
              <Users size={18} className="text-blue-600 dark:text-blue-400" />
              Manajemen Pengguna
            </h2>

            <div className="mb-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"
                />
                <input
                  type="text"
                  placeholder="Cari pengguna (Nama, Username, ID Guru)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base transition min-h-[44px]"
                />
              </div>
              <button
                onClick={openAddModal}
                className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white rounded-lg font-semibold transition-colors flex-shrink-0 text-sm sm:text-base min-h-[44px] w-full sm:w-auto">
                <Plus size={18} />
                <span className="hidden sm:inline">Tambah User</span>
                <span className="sm:hidden">Tambah</span>
              </button>
            </div>

            {/* List Toggle */}
            <div
              onClick={() => setShowUserList(!showUserList)}
              className="flex items-center justify-between p-3 sm:p-4 cursor-pointer bg-blue-50 dark:bg-gray-700/50 hover:bg-blue-100 dark:hover:bg-gray-700 rounded-lg transition-colors border border-blue-200 dark:border-gray-700 mb-3 min-h-[60px]">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    showUserList
                      ? "bg-blue-600 dark:bg-blue-700"
                      : "bg-blue-100 dark:bg-gray-600"
                  }`}>
                  <List
                    size={18}
                    className={
                      showUserList
                        ? "text-white"
                        : "text-blue-600 dark:text-gray-300"
                    }
                  />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                    Semua Pengguna
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    {filteredUsers.length}{" "}
                    {searchQuery ? "hasil" : "pengguna terdaftar"}
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUserList(!showUserList);
                }}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white dark:bg-gray-600 hover:bg-blue-50 dark:hover:bg-gray-500 rounded-lg transition-colors text-xs sm:text-sm font-medium min-h-[44px] border border-blue-200 dark:border-gray-600">
                {showUserList ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
                {showUserList ? "Tutup" : "Lihat"}
              </button>
            </div>

            {showUserList && (
              <div className="border-t border-blue-200 dark:border-gray-700">
                <div className="max-h-[500px] overflow-y-auto p-2 sm:p-3 md:p-4">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-8 sm:py-12">
                      <Users
                        size={40}
                        className="text-gray-300 dark:text-gray-600 mx-auto mb-3"
                      />
                      <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                        {searchQuery
                          ? "Tidak ada pengguna yang ditemukan"
                          : "Belum ada pengguna"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredUsers.map((listUser) => (
                        <div
                          key={listUser.id}
                          className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors border border-blue-100 dark:border-gray-700 shadow-sm">
                          <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-gray-600 flex items-center justify-center text-blue-700 dark:text-gray-300 font-bold flex-shrink-0">
                              {listUser.full_name[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 dark:text-gray-100 truncate text-sm sm:text-base">
                                {listUser.full_name}
                              </p>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {listUser.teacher_id && (
                                  <span className="font-mono">
                                    ID: {listUser.teacher_id}
                                  </span>
                                )}
                                <span>@{listUser.username}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-3 sm:mt-0 flex-shrink-0 items-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium ${
                                listUser.role === "admin"
                                  ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                                  : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                              }`}>
                              <Shield size={12} />
                              {listUser.role === "admin" ? "Admin" : "Guru"}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium ${
                                listUser.is_active
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                  : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                              }`}>
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  listUser.is_active
                                    ? "bg-green-500 dark:bg-green-400"
                                    : "bg-gray-400 dark:bg-gray-500"
                                }`}></span>
                              {listUser.is_active ? "Aktif" : "Nonaktif"}
                            </span>
                            <div className="flex gap-1 sm:gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewProfile(listUser);
                                }}
                                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                                title="Lihat Profil">
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(listUser);
                                }}
                                className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                                title="Edit User">
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openResetPasswordModal(listUser);
                                }}
                                className="p-2 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                                title="Reset Password">
                                <Shield size={16} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDeleteModal(listUser);
                                }}
                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                                title="Hapus User">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pagination UI */}
                {filteredUsers.length > 0 && (
                  <div className="flex items-center justify-between p-4 border-t border-blue-200 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Menampilkan {(currentPage - 1) * usersPerPage + 1} -{" "}
                      {Math.min(currentPage * usersPerPage, totalUsers)} dari{" "}
                      {totalUsers} user
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          searchUsers(searchQuery, currentPage - 1)
                        }
                        disabled={currentPage === 1 || searching}
                        className="px-3 py-1.5 text-sm bg-blue-100 dark:bg-gray-700 hover:bg-blue-200 text-gray-800 dark:text-gray-300 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]">
                        ← Prev
                      </button>
                      <span className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 flex items-center">
                        Hal {currentPage} /{" "}
                        {Math.ceil(totalUsers / usersPerPage)}
                      </span>
                      <button
                        onClick={() =>
                          searchUsers(searchQuery, currentPage + 1)
                        }
                        disabled={
                          currentPage >= Math.ceil(totalUsers / usersPerPage) ||
                          searching
                        }
                        className="px-3 py-1.5 text-sm bg-blue-100 dark:bg-gray-700 hover:bg-blue-200 text-gray-800 dark:text-gray-300 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]">
                        Next →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Main Profile Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-5 md:p-8 border border-blue-100 dark:border-gray-700">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Left Side - Profile Picture & Main Info */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 flex-1 min-w-0">
              {/* Avatar Placeholder */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-blue-100 dark:bg-gray-600 rounded-full flex items-center justify-center text-blue-700 dark:text-gray-300 font-bold text-2xl sm:text-3xl md:text-4xl flex-shrink-0 border-4 border-white dark:border-gray-700 shadow-lg">
                {profileData.full_name[0]}
              </div>
              {/* Main Info */}
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                  {profileData.full_name}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-2 text-sm sm:text-base md:text-lg">
                  @{profileData.username}
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 mb-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium ${
                      profileData.role === "admin"
                        ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                        : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    }`}>
                    <Shield size={12} className="sm:w-3 sm:h-3" />
                    {profileData.role === "admin" ? "Administrator" : "Guru"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    <span
                      className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
                        profileData.is_active
                          ? "bg-green-500 dark:bg-green-400"
                          : "bg-gray-400 dark:bg-gray-500"
                      }`}></span>
                    {profileData.is_active ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400 justify-center sm:justify-start">
                  {profileData.teacher_id && (
                    <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-gray-700 px-3 py-1.5 rounded-lg">
                      <User
                        size={12}
                        className="text-blue-600 dark:text-blue-400"
                      />
                      <span className="font-mono font-medium">
                        {profileData.teacher_id}
                      </span>
                    </div>
                  )}
                  {profileData.no_hp && (
                    <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-gray-700 px-3 py-1.5 rounded-lg">
                      <Phone
                        size={12}
                        className="text-blue-600 dark:text-blue-400"
                      />
                      <span>{profileData.no_hp}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Right Side - Academic Info */}
            <div className="flex flex-col gap-3 flex-shrink-0 mt-4 md:mt-0 w-full sm:w-auto">
              {activeAcademicYear && (
                <div className="bg-blue-50 dark:bg-gray-700/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-200 dark:border-gray-600">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                    <Calendar
                      size={14}
                      className="text-blue-600 dark:text-blue-400"
                    />
                    <span className="font-medium">Tahun Ajaran:</span>
                    <span className="font-bold text-blue-700 dark:text-blue-300">
                      {activeAcademicYear}
                    </span>
                  </div>
                </div>
              )}
              {profileData.homeroom_class && (
                <div className="bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-300 dark:border-blue-800">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-blue-800 dark:text-blue-300">
                    <School
                      size={14}
                      className="text-blue-700 dark:text-blue-400"
                    />
                    <span className="font-medium">Wali Kelas:</span>
                    <span className="font-bold text-blue-900 dark:text-blue-200">
                      {profileData.homeroom_class.id}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* End Header Section */}

          {/* Role Description */}
          <div className="mt-6 border-t pt-6 border-blue-100 dark:border-gray-700">
            <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
              <Shield
                size={18}
                className="text-purple-600 dark:text-purple-400"
              />
              Role:{" "}
              <span
                className={`text-lg sm:text-xl md:text-2xl font-bold ${
                  profileData.role === "admin"
                    ? "text-purple-700 dark:text-purple-300"
                    : "text-blue-700 dark:text-blue-300"
                }`}>
                {profileData.role === "admin" ? "Administrator" : "Guru"}
              </span>
            </h3>
            <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 mb-4">
              {profileData.role === "teacher"
                ? "Bertanggung Jawab Atas Pengajaran Mata Pelajaran, Penilaian, Dan Presensi Siswa Di Kelas Yang Ditugaskan."
                : "Memiliki Hak Penuh Untuk Mengelola Semua Data Dan Pengguna Dalam Sistem"}
            </p>
            {/* Admin Privilege Details */}
            {profileData.role === "admin" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-left">
                <div className="bg-blue-50 dark:bg-gray-700/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-200 dark:border-gray-600">
                  <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2 text-sm sm:text-base">
                    Hak Akses:
                  </h4>
                  <ul className="text-xs sm:text-sm text-gray-700 dark:text-gray-400 space-y-1.5">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      Kelola semua user & role
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      Akses data lengkap sistem
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      Konfigurasi akademik
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      Monitoring aktivitas
                    </li>
                  </ul>
                </div>
                <div className="bg-blue-50 dark:bg-gray-700/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-200 dark:border-gray-600">
                  <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2 text-sm sm:text-base">
                    Fitur Khusus:
                  </h4>
                  <ul className="text-xs sm:text-sm text-gray-700 dark:text-gray-400 space-y-1.5">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      Lihat profil semua user
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      Edit & hapus user
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      Generate laporan
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      Backup & restore data
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content Grid (Assignments, Password, etc) */}
        <div className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Column 1: Password / Admin Management */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-5 md:p-6 border border-blue-100 dark:border-gray-700">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4 flex items-center gap-2">
                <Mail size={18} className="text-red-500" />
                Ubah Password
              </h3>
              <ChangePasswordSection user={user} />
            </div>
            {/* Admin Actions (Jika Admin dan Melihat Profil Sendiri) */}
            {isAdmin && !isViewingOtherProfile && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-5 md:p-6 border border-blue-100 dark:border-gray-700">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4 flex items-center gap-2">
                  <Users
                    size={18}
                    className="text-blue-600 dark:text-blue-400"
                  />
                  Aksi Admin
                </h3>
                <div className="space-y-3">
                  <button
                    onClick={openAddModal}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-700 dark:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl text-sm sm:text-base min-h-[44px]">
                    <Plus size={16} />
                    Tambah User Baru
                  </button>
                  <button
                    onClick={() => setShowUserList(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 dark:from-gray-700 dark:to-gray-600 dark:hover:from-gray-600 dark:hover:to-gray-500 text-gray-800 dark:text-gray-300 rounded-lg font-semibold transition-all shadow-sm hover:shadow text-sm sm:text-base min-h-[44px]">
                    <List size={16} />
                    Lihat Semua User
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Column 2/3: Teaching Assignments */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-5 md:p-6 border border-blue-100 dark:border-gray-700">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BookOpen size={18} className="text-orange-600" />
                  Penugasan Mengajar
                </span>
                {profileData.teacher_id && (
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    disabled={loadingHistory}
                    className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors disabled:opacity-50 min-h-[44px] px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    {loadingHistory ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-blue-600"></div>
                    ) : showHistory ? (
                      <ChevronUp size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    )}
                    <span className="hidden sm:inline">
                      {showHistory
                        ? "Sembunyikan Riwayat"
                        : "Tampilkan Riwayat"}
                    </span>
                    <span className="sm:hidden">
                      {showHistory ? "Tutup" : "Riwayat"}
                    </span>
                  </button>
                )}
              </h3>

              {/* Stats Bar - Current Year */}
              {!showHistory && (
                <>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4 border-b pb-3 border-blue-100 dark:border-gray-700">
                    Statistik Penugasan Tahun Ajaran Aktif (
                    {activeAcademicYear || "N/A"})
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                    {/* Stat Card: Total Mengajar */}
                    <div className="bg-gradient-to-br from-blue-50 to-white dark:from-gray-700/30 dark:to-gray-800/30 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-200 dark:border-gray-600 shadow-md">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2">
                        <div className="bg-gradient-to-r from-orange-100 to-orange-200 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-1.5 sm:p-2">
                          <BookOpen size={14} className="text-orange-600" />
                        </div>
                        <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                          {totalSubjects}
                        </p>
                      </div>
                      <p className="text-xs text-gray-700 dark:text-gray-400 font-medium">
                        Total Sesi
                      </p>
                    </div>
                    {/* Stat Card: Mata Pelajaran */}
                    <div className="bg-gradient-to-br from-blue-50 to-white dark:from-gray-700/30 dark:to-gray-800/30 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-200 dark:border-gray-600 shadow-md">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2">
                        <div className="bg-gradient-to-r from-purple-100 to-purple-200 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-1.5 sm:p-2">
                          <Award size={14} className="text-purple-600" />
                        </div>
                        <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                          {uniqueSubjects}
                        </p>
                      </div>
                      <p className="text-xs text-gray-700 dark:text-gray-400 font-medium">
                        Mata Pelajaran
                      </p>
                    </div>
                    {/* Stat Card: Kelas Berbeda */}
                    <div className="bg-gradient-to-br from-blue-50 to-white dark:from-gray-700/30 dark:to-gray-800/30 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-200 dark:border-gray-600 shadow-md">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2">
                        <div className="bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-1.5 sm:p-2">
                          <Users size={14} className="text-blue-600" />
                        </div>
                        <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                          {totalClasses}
                        </p>
                      </div>
                      <p className="text-xs text-gray-700 dark:text-gray-400 font-medium">
                        Kelas Diajar
                      </p>
                    </div>
                    {/* Stat Card: Homeroom Class */}
                    <div className="bg-gradient-to-br from-blue-50 to-white dark:from-gray-700/30 dark:to-gray-800/30 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-200 dark:border-gray-600 shadow-md">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2">
                        <div className="bg-gradient-to-r from-green-100 to-green-200 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-1.5 sm:p-2">
                          <History size={14} className="text-green-600" />
                        </div>
                        <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                          {profileData.homeroom_class?.id || "-"}
                        </p>
                      </div>
                      <p className="text-xs text-gray-700 dark:text-gray-400 font-medium">
                        Wali Kelas
                      </p>
                    </div>
                  </div>

                  {/* Current Assignments List */}
                  {currentAssignments.length > 0 ? (
                    <div className="space-y-3 sm:space-y-4">
                      {currentAssignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="bg-gradient-to-r from-blue-50 to-white dark:from-gray-700/30 dark:to-gray-800/30 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-200 dark:border-gray-600 hover:shadow-lg transition-all hover:-translate-y-0.5">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100">
                                {assignment.subject}
                              </p>
                              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-400 mt-1 flex items-center gap-1.5">
                                <School size={12} />
                                <span>{getClassName(assignment)}</span>
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-1.5 sm:gap-2 text-xs font-medium mt-2 sm:mt-0">
                              <span className="bg-gradient-to-r from-blue-100 to-blue-200 dark:from-gray-600 dark:to-gray-700 border border-blue-300 dark:border-gray-500 text-gray-800 dark:text-gray-300 px-2 py-1.5 rounded-lg font-medium">
                                Semester {assignment.semester}
                              </span>
                              <span className="bg-gradient-to-r from-blue-200 to-blue-300 dark:from-gray-600 dark:to-gray-700 text-gray-800 dark:text-gray-300 px-2 py-1.5 rounded-lg font-medium flex items-center gap-1">
                                <Clock size={10} />
                                {assignment.academic_year}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gradient-to-br from-blue-50 to-white dark:from-gray-700/30 dark:to-gray-800/30 rounded-xl p-6 sm:p-8 md:p-12 shadow-sm border border-blue-200 dark:border-gray-600 text-center">
                      <div className="bg-gradient-to-r from-blue-100 to-blue-200 dark:from-gray-600 dark:to-gray-700 rounded-full p-4 sm:p-6 w-fit mx-auto mb-4">
                        <BookOpen
                          size={32}
                          className="text-blue-400 dark:text-gray-500"
                        />
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                        Belum Ada Tugas Mengajar
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-400">
                        {isViewingOtherProfile ? "User ini" : "Anda"} belum
                        memiliki mata pelajaran untuk tahun ajaran ini.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* History Assignments List */}
              {showHistory && (
                <div className="mt-4 sm:mt-6 border-t pt-3 sm:pt-4 border-blue-100 dark:border-gray-700">
                  <p className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 sm:mb-4">
                    Riwayat Penugasan Mengajar
                  </p>
                  <div className="space-y-4 sm:space-y-6">
                    {historyYears.map((yearGroup) => (
                      <div key={yearGroup.year}>
                        <h4 className="text-sm sm:text-base font-bold text-gray-800 dark:text-gray-200 mb-2 sm:mb-3 border-l-4 border-orange-400 pl-2 sm:pl-3">
                          Tahun Ajaran {yearGroup.year}
                        </h4>
                        <div className="space-y-3 sm:space-y-4 ml-2">
                          {Object.entries(yearGroup.semesters).map(
                            ([semester, assignments]) => (
                              <div
                                key={semester}
                                className="space-y-1.5 sm:space-y-2">
                                <p className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-400 flex items-center gap-1.5">
                                  <Calendar
                                    size={12}
                                    className="text-blue-600 dark:text-blue-400"
                                  />
                                  Semester {semester}
                                </p>
                                <div className="space-y-2 sm:space-y-3 pl-3 sm:pl-4 border-l border-blue-200 dark:border-gray-600">
                                  {assignments.map((assignment) => (
                                    <div
                                      key={assignment.id}
                                      className="bg-gradient-to-r from-blue-50 to-white dark:from-gray-700/30 dark:to-gray-800/30 rounded-lg p-2.5 sm:p-3 border border-blue-200 dark:border-gray-600 hover:bg-blue-100 dark:hover:bg-gray-700/50 transition-all">
                                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-2">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100">
                                            {assignment.subject}
                                          </p>
                                          <p className="text-xs text-gray-700 dark:text-gray-400 mt-0.5">
                                            {getClassName(assignment)}
                                          </p>
                                        </div>
                                        <span className="bg-gradient-to-r from-blue-200 to-blue-300 dark:from-gray-600 dark:to-gray-700 text-gray-800 dark:text-gray-300 px-2 py-0.5 sm:py-1 rounded-lg font-medium text-xs">
                                          {assignment.academic_year}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* ======================= MODAL: ADD/EDIT USER ====================== */}
      {/* =================================================================== */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 dark:bg-black/70 flex items-center justify-center p-3 sm:p-4">
          <div className="relative bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl max-w-full sm:max-w-lg w-full mx-auto my-4 sm:my-8 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 rounded-t-xl sm:rounded-t-2xl z-10 border-b border-blue-200 dark:border-gray-700">
              <div className="flex items-center justify-between p-4 sm:p-5 md:p-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 sm:gap-3">
                  {modalMode === "add" ? (
                    <Plus size={20} className="text-green-600" />
                  ) : (
                    <Edit2 size={20} className="text-indigo-600" />
                  )}
                  {modalMode === "add" ? "Tambah User Baru" : "Edit User"}
                </h3>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="p-2 hover:bg-blue-100 dark:hover:bg-gray-700 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-5">
              {/* Form Fields */}
              {/* Username */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  className={`w-full px-3 sm:px-4 py-3 sm:py-3.5 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base min-h-[44px] ${
                    formErrors.username
                      ? "border-red-500"
                      : "border-blue-300 dark:border-gray-600"
                  }`}
                  placeholder="Masukkan username"
                  disabled={modalMode === "edit"}
                />
                {formErrors.username && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} /> {formErrors.username}
                  </p>
                )}
              </div>
              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      full_name: e.target.value,
                    }))
                  }
                  className={`w-full px-3 sm:px-4 py-3 sm:py-3.5 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base min-h-[44px] ${
                    formErrors.full_name
                      ? "border-red-500"
                      : "border-blue-300 dark:border-gray-600"
                  }`}
                  placeholder="Masukkan nama lengkap"
                />
                {formErrors.full_name && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} /> {formErrors.full_name}
                  </p>
                )}
              </div>
              {/* Role */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      role: e.target.value,
                    }))
                  }
                  className="w-full px-3 sm:px-4 py-3 sm:py-3.5 border border-blue-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 text-sm sm:text-base min-h-[44px]">
                  <option value="teacher">Guru</option>
                  <option value="guru_bk">Guru BK</option>
                  <option
                    value="admin"
                    className="text-red-600 dark:text-red-400 font-semibold">
                    ⚠️ Administrator (Hati-hati!)
                  </option>
                </select>
                {formData.role === "admin" && (
                  <p className="mt-2 text-xs sm:text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 sm:p-3 rounded-lg border border-red-200 dark:border-red-800">
                    ⚠️ <span className="font-semibold">PERINGATAN:</span> Role
                    admin memiliki akses penuh ke semua data dan fitur sistem.
                    Hanya berikan ke pengguna yang benar-benar dipercaya.
                  </p>
                )}
              </div>
              {/* Password */}
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Password{" "}
                  {modalMode === "add" && (
                    <span className="text-red-500">*</span>
                  )}
                  {modalMode === "edit" && (
                    <span className="text-gray-500 dark:text-gray-400 text-xs font-normal ml-1">
                      (Kosongkan jika tidak diubah)
                    </span>
                  )}
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  className={`w-full px-3 sm:px-4 py-3 sm:py-3.5 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base pr-10 min-h-[44px] ${
                    formErrors.password
                      ? "border-red-500"
                      : "border-blue-300 dark:border-gray-600"
                  }`}
                  placeholder={
                    modalMode === "add"
                      ? "Masukkan password awal"
                      : "Password baru (opsional)"
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[50%] transform -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <Eye size={18} />
                </button>
                {formErrors.password && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} /> {formErrors.password}
                  </p>
                )}
              </div>
              {/* Teacher ID (If role is teacher) */}
              {formData.role === "teacher" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    ID Guru <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.teacher_id}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        teacher_id: e.target.value,
                      }))
                    }
                    className={`w-full px-3 sm:px-4 py-3 sm:py-3.5 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base min-h-[44px] ${
                      formErrors.teacher_id
                        ? "border-red-500"
                        : "border-blue-300 dark:border-gray-600"
                    }`}
                    placeholder="Contoh: G-01, G-12, G-BK01"
                  />
                  {formErrors.teacher_id && (
                    <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle size={12} /> {formErrors.teacher_id}
                    </p>
                  )}
                </div>
              )}
              {/* Nomor HP */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Nomor HP
                </label>
                <input
                  type="text"
                  value={formData.no_hp}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, no_hp: e.target.value }))
                  }
                  className="w-full px-3 sm:px-4 py-3 sm:py-3.5 border border-blue-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base min-h-[44px]"
                  placeholder="Masukkan nomor HP (opsional)"
                />
                {formErrors.no_hp && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} /> {formErrors.no_hp}
                  </p>
                )}
              </div>
              {/* Is Active */}
              <div className="flex items-center">
                <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        is_active: e.target.checked,
                      }))
                    }
                    className="w-5 h-5 text-blue-600 dark:text-blue-500 rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Akun Aktif
                  </span>
                </label>
              </div>
            </div>
            {/* Action Buttons */}
            <div className="p-4 sm:p-5 md:p-6 pt-2 sm:pt-4 border-t border-blue-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => setShowUserModal(false)}
                  className="flex-1 px-4 sm:px-6 py-3 sm:py-3.5 bg-gradient-to-r from-blue-100 to-blue-200 dark:from-gray-700 dark:to-gray-600 hover:from-blue-200 hover:to-blue-300 dark:hover:from-gray-600 dark:hover:to-gray-500 text-gray-800 dark:text-gray-300 rounded-lg font-semibold transition-all text-sm sm:text-base min-h-[44px]"
                  disabled={submitting}>
                  Batal
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 px-4 sm:px-6 py-3 sm:py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-700 dark:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px]">
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Simpan User
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* ===================== MODAL: RESET PASSWORD ======================= */}
      {/* =================================================================== */}
      {showResetPasswordModal && resetPasswordUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 dark:bg-black/70 flex items-center justify-center p-3 sm:p-4">
          <div className="relative bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl max-w-full sm:max-w-md w-full mx-auto my-4 sm:my-8 p-4 sm:p-5 md:p-6">
            <div className="flex items-center justify-between border-b border-blue-200 dark:border-gray-700 pb-3 sm:pb-4 mb-3 sm:mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 sm:gap-3">
                <Shield size={20} className="text-orange-600" />
                Reset Password
              </h3>
              <button
                onClick={closeResetPasswordModal}
                className="p-2 hover:bg-blue-100 dark:hover:bg-gray-700 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                <X size={18} />
              </button>
            </div>
            <div className="text-center mb-4 sm:mb-6">
              <p className="text-gray-700 dark:text-gray-300 mb-2 sm:mb-3 text-sm sm:text-base">
                Anda yakin ingin mereset password untuk user:
              </p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-700 dark:text-blue-300">
                {resetPasswordUser.full_name}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                ({resetPasswordUser.teacher_id || resetPasswordUser.username})
              </p>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-gray-700/50 dark:to-gray-800/50 border-2 border-blue-300 dark:border-gray-600 rounded-lg p-3 sm:p-4 mb-4">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-semibold uppercase">
                Password Baru yang akan Digunakan:
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3">
                <code className="text-lg sm:text-xl font-mono font-bold text-gray-900 dark:text-gray-100 tracking-wider break-all text-center sm:text-left">
                  {newGeneratedPassword}
                </code>
                <button
                  onClick={copyPasswordToClipboard}
                  className={`flex-shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 mt-2 sm:mt-0 min-h-[44px] ${
                    passwordCopied
                      ? "bg-gradient-to-r from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 text-green-700 dark:text-green-300 border-2 border-green-500"
                      : "bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 text-blue-700 dark:text-blue-300 border-2 border-blue-500 hover:from-blue-200 hover:to-blue-300 dark:hover:from-blue-800/40 dark:hover:to-blue-700/40"
                  }`}>
                  {passwordCopied ? (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Tersalin!
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round">
                        <rect
                          x="9"
                          y="9"
                          width="13"
                          height="13"
                          rx="2"
                          ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                      Salin
                    </>
                  )}
                </button>
              </div>
            </div>
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-blue-200 dark:border-gray-700">
              <button
                onClick={closeResetPasswordModal}
                className="flex-1 px-4 sm:px-6 py-3 sm:py-3.5 bg-gradient-to-r from-blue-100 to-blue-200 dark:from-gray-700 dark:to-gray-600 hover:from-blue-200 hover:to-blue-300 dark:hover:from-gray-600 dark:hover:to-gray-500 text-gray-800 dark:text-gray-300 rounded-lg font-semibold transition-all text-sm sm:text-base min-h-[44px]"
                disabled={resetting}>
                Batal
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetting}
                className="flex-1 px-4 sm:px-6 py-3 sm:py-3.5 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 dark:from-orange-700 dark:to-orange-800 dark:hover:from-orange-600 dark:hover:to-orange-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px]">
                {resetting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                    Mereset...
                  </>
                ) : (
                  <>
                    <Shield size={16} />
                    Reset Sekarang
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* ======================= MODAL: DELETE USER ======================== */}
      {/* =================================================================== */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-full">
                  <AlertCircle className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Konfirmasi Penghapusan User
                  </h3>
                  <p className="text-sm text-red-100 mt-1">
                    Tindakan ini tidak dapat dibatalkan!
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm font-semibold text-red-900 dark:text-red-300 mb-3">
                  User yang akan dihapus:
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-red-700">Nama:</span>
                    <span className="font-semibold text-red-900">
                      {deleteTarget.full_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-700">Username:</span>
                    <span className="font-semibold text-red-900">
                      @{deleteTarget.username}
                    </span>
                  </div>
                  {deleteTarget.teacher_id && (
                    <div className="flex justify-between">
                      <span className="text-red-700">ID Guru:</span>
                      <span className="font-semibold text-red-900 font-mono">
                        {deleteTarget.teacher_id}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-red-700">Role:</span>
                    <span className="font-semibold text-red-900">
                      {deleteTarget.role === "admin" ? "Administrator" : "Guru"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-orange-800">
                    <p className="font-semibold mb-1">Peringatan:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Data user akan dihapus permanen</li>
                      <li>Semua penugasan terkait akan hilang</li>
                      <li>History login akan terhapus</li>
                      <li>Tindakan ini TIDAK BISA dibatalkan</li>
                    </ul>
                  </div>
                </div>
              </div>
              {deleteTarget.role === "admin" && (
                <div className="bg-red-100 dark:bg-red-900/30 border-2 border-red-400 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-red-700 mt-0.5" />
                    <div className="text-sm text-red-900">
                      <p className="font-bold mb-1">⚠️ PERHATIAN KHUSUS!</p>
                      <p className="text-xs">
                        Anda akan menghapus user dengan role{" "}
                        <strong>ADMINISTRATOR</strong>. Pastikan masih ada admin
                        lain!
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Ketik{" "}
                  <span className="text-red-600 font-mono bg-red-100 px-2 py-0.5 rounded">
                    HAPUS
                  </span>{" "}
                  untuk konfirmasi:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Ketik HAPUS (huruf besar)"
                  className="w-full px-4 py-3 border-2 border-red-300 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 font-mono min-h-[44px]"
                  autoFocus
                />
                <p className="text-xs text-gray-600 mt-2">
                  * Untuk keamanan, Anda harus mengetik kata "HAPUS" dengan
                  huruf besar
                </p>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 rounded-b-2xl flex gap-3">
              <button
                onClick={handleCloseDeleteModal}
                disabled={deletingUser}
                className="flex-1 px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-white transition-colors disabled:opacity-50 min-h-[44px]">
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={
                  deletingUser || deleteConfirmText.toUpperCase() !== "HAPUS"
                }
                className="flex-1 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]">
                {deletingUser ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    Hapus Permanen
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileTab;
