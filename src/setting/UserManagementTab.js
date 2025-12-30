// UserManagementTab.js - FULL User Management dengan Fitur Wali Kelas ✅
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Shield,
  Eye,
  EyeOff,
  X,
  Save,
  AlertCircle,
  Phone,
  Mail,
  Download,
  Upload,
  ArrowRight,
} from "lucide-react";

// ✅ FUNGSI GENERATE TEACHER_ID SEQUENTIAL (DIPINDAHKAN dari SchoolManagementTab)
const generateNextTeacherId = async () => {
  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("teacher_id")
      .not("teacher_id", "is", null)
      .like("teacher_id", "G-%");

    if (error) throw error;

    const teacherNumbers = users
      .map((user) => {
        const match = user.teacher_id?.match(/G-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((num) => !isNaN(num) && num > 0);

    const maxNumber = teacherNumbers.length > 0 ? Math.max(...teacherNumbers) : 0;

    const nextNumber = maxNumber + 1;
    return `G-${nextNumber.toString().padStart(2, "0")}`;
  } catch (error) {
    console.error("❌ Error generating teacher_id:", error);
    const timestamp = Date.now().toString().slice(-4);
    return `G-${timestamp}`;
  }
};

const UserManagementTab = ({ user: currentUser, showToast, loading, setLoading }) => {
  // State untuk user list
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  // ✅ STATE BARU: Available Classes untuk Wali Kelas
  const [availableClasses, setAvailableClasses] = useState([]);

  // ✅ HAPUS state pagination, cukup totalUsers aja
  const [totalUsers, setTotalUsers] = useState(0);

  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // 'add' | 'edit'
  const [editingUser, setEditingUser] = useState(null);

  // Reset password modal
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [newGeneratedPassword, setNewGeneratedPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingUser, setDeletingUser] = useState(false);

  // Form states
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

  // ========== UTILITY FUNCTIONS ==========

  // Audit logging
  const logAuditActivity = async (action, targetUser, details = {}) => {
    try {
      await supabase.from("audit_logs").insert([
        {
          user_id: currentUser.id,
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

  // Generate random password
  const generateRandomPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // ✅ FUNGSI BARU: Load Available Classes untuk Wali Kelas
  const loadAvailableClasses = useCallback(async () => {
    try {
      // Get active academic year first
      const { data: activeYear } = await supabase
        .from("academic_years")
        .select("year")
        .eq("is_active", true)
        .maybeSingle();

      if (!activeYear) {
        console.warn("No active academic year found");
        return;
      }

      // Fetch classes for active year
      const { data: classesData, error } = await supabase
        .from("classes")
        .select("id, grade, academic_year")
        .eq("academic_year", activeYear.year)
        .order("grade")
        .order("id");

      if (error) throw error;

      setAvailableClasses(classesData || []);
    } catch (error) {
      console.error("Error loading classes:", error);
      showToast("Error loading classes: " + error.message, "error");
    }
  }, [showToast]);

  // ✅ FUNGSI BARU: Update Teacher Class (Assign Wali Kelas)
  const updateTeacherClass = async (teacherId, newClassId) => {
    try {
      setLoading(true);

      if (newClassId) {
        // Check if class already has a wali kelas
        const { data: existingWaliKelas, error: checkError } = await supabase
          .from("users")
          .select("id, full_name")
          .eq("homeroom_class_id", newClassId)
          .neq("id", teacherId)
          .maybeSingle();

        if (checkError) throw checkError;

        if (existingWaliKelas) {
          const confirm = window.confirm(
            `Kelas ${newClassId} sudah memiliki wali kelas: ${existingWaliKelas.full_name}.\n\n` +
              `Apakah Anda yakin ingin mengganti wali kelas ini?\n` +
              `(Wali kelas lama akan otomatis dilepas dari kelas ${newClassId})`
          );

          if (!confirm) {
            setLoading(false);
            return;
          }

          // Remove old wali kelas
          const { error: removeError } = await supabase
            .from("users")
            .update({ homeroom_class_id: null })
            .eq("id", existingWaliKelas.id);

          if (removeError) throw removeError;

          // Log removal
          await logAuditActivity("REMOVE_TEACHER_CLASS", existingWaliKelas, {
            removed_from_class: newClassId,
            reason: "Replaced by new wali kelas",
          });
        }
      }

      // Assign new wali kelas
      const { error } = await supabase
        .from("users")
        .update({ homeroom_class_id: newClassId || null })
        .eq("id", teacherId);

      if (error) throw error;

      // Log assignment
      await logAuditActivity(
        "UPDATE_TEACHER_CLASS",
        { id: teacherId },
        {
          new_class: newClassId,
          action: newClassId ? "assigned" : "removed",
        }
      );

      showToast("Penugasan wali kelas berhasil diupdate!", "success");
      searchUsers(""); // Refresh list
    } catch (error) {
      console.error("Error updating teacher class:", error);
      showToast("Error mengupdate wali kelas", "error");
    } finally {
      setLoading(false);
    }
  };

  // ========== EXPORT & IMPORT FUNCTIONS ==========

  // Export Users to CSV
  const exportUsersCSV = async () => {
    try {
      setLoading(true);
      showToast("Mengekspor data...", "info");

      // Fetch semua users
      const { data: allUsers, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at");

      if (error) throw error;

      if (!allUsers || allUsers.length === 0) {
        showToast("Tidak ada data user untuk diekspor", "warning");
        setLoading(false);
        return;
      }

      // Format CSV
      const headers = [
        "Username",
        "Nama Lengkap",
        "Role",
        "ID Guru",
        "No HP",
        "Status",
        "Tanggal Dibuat",
        "Wali Kelas",
      ];

      const csvRows = allUsers.map((user) => [
        `"${user.username}"`,
        `"${user.full_name}"`,
        user.role,
        user.teacher_id || "",
        user.no_hp || "",
        user.is_active ? "Aktif" : "Nonaktif",
        new Date(user.created_at).toLocaleDateString("id-ID"),
        user.homeroom_class_id || "",
      ]);

      const csvContent = [headers.join(","), ...csvRows].join("\n");

      // Download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `users_export_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast(`Berhasil mengekspor ${allUsers.length} user`, "success");
    } catch (error) {
      console.error("Export error:", error);
      showToast("Gagal mengekspor data", "error");
    } finally {
      setLoading(false);
    }
  };

  // Import Users from CSV
  const importUsersCSV = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      showToast("Mengimpor data...", "info");

      const text = await file.text();
      const lines = text.split("\n").filter((line) => line.trim());

      if (lines.length < 2) {
        showToast("File CSV kosong atau format salah", "error");
        setLoading(false);
        return;
      }

      // Parse header
      const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));

      // Validasi header minimal
      const requiredHeaders = ["Username", "Nama Lengkap", "Role"];
      const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));

      if (missingHeaders.length > 0) {
        showToast(`Header wajib tidak ditemukan: ${missingHeaders.join(", ")}`, "error");
        setLoading(false);
        return;
      }

      // Process data
      const usersToInsert = [];
      const errors = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        // Parse CSV line dengan handling quotes
        const values = [];
        let inQuotes = false;
        let currentValue = "";

        for (let char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            values.push(currentValue.trim().replace(/"/g, ""));
            currentValue = "";
          } else {
            currentValue += char;
          }
        }
        values.push(currentValue.trim().replace(/"/g, ""));

        // Map values ke headers
        const userData = {};
        headers.forEach((header, index) => {
          userData[header] = values[index] || "";
        });

        // Validasi data
        if (!userData["Username"] || !userData["Nama Lengkap"]) {
          errors.push(`Baris ${i + 1}: Username atau Nama kosong`);
          continue;
        }

        // ✅ AUTO-GENERATE TEACHER_ID jika role teacher dan kosong
        let teacherId = userData["ID Guru"] || null;
        if (userData["Role"]?.toLowerCase() === "teacher" && !teacherId) {
          teacherId = await generateNextTeacherId();
        }

        // Format data untuk database
        const user = {
          username: userData["Username"],
          full_name: userData["Nama Lengkap"],
          email: userData["Email"] || `${userData["Username"]}@school.com`,
          role: userData["Role"]?.toLowerCase() || "teacher",
          teacher_id: teacherId,
          no_hp: userData["No HP"] || null,
          homeroom_class_id: userData["Wali Kelas"] || null,
          is_active: (userData["Status"] || "Aktif").toLowerCase() === "aktif",
          password: userData["Password"] || "password123",
          created_at: new Date().toISOString(),
        };

        usersToInsert.push(user);
      }

      // Insert ke database
      if (usersToInsert.length > 0) {
        const { error } = await supabase.from("users").insert(usersToInsert);

        if (error) throw error;

        // Log audit
        await logAuditActivity("BULK_IMPORT_USERS", null, {
          count: usersToInsert.length,
          source: "CSV Import",
        });

        showToast(`${usersToInsert.length} user berhasil diimpor!`, "success");
        searchUsers(""); // Refresh list
      } else {
        showToast("Tidak ada data valid untuk diimpor", "warning");
      }

      if (errors.length > 0) {
        console.warn("Import errors:", errors);
        showToast(`${errors.length} baris gagal diimpor`, "warning");
      }

      // Reset file input
      event.target.value = "";
    } catch (error) {
      console.error("Import error:", error);
      showToast(`Gagal mengimpor data: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Download Template CSV
  const downloadTemplateCSV = () => {
    const headers = [
      "Username",
      "Nama Lengkap",
      "Role",
      "ID Guru",
      "No HP",
      "Status",
      "Password",
      "Email",
      "Wali Kelas",
    ];
    const exampleRow = [
      "johndoe",
      "John Doe",
      "teacher",
      "G-01",
      "08123456789",
      "Aktif",
      "password123",
      "john@school.com",
      "7A",
    ];

    const csvContent = [headers.join(","), exampleRow.join(",")].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "template_import_users.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Template berhasil diunduh", "info");
  };

  // ========== MAIN FUNCTIONS ==========

  // Search users dengan pagination
  const searchUsers = useCallback(async () => {
    try {
      setSearching(true);

      const { data, error } = await supabase
        .from("users")
        .select(
          "id, username, full_name, role, teacher_id, is_active, created_at, no_hp, homeroom_class_id"
        )
        .order("teacher_id", { ascending: true, nullsFirst: false })
        .order("full_name", { ascending: true });

      if (error) {
        console.error("Error searching users:", error);
        showToast("Gagal memuat daftar pengguna", "error");
        return;
      }

      setUserSearchResults(data || []);
      setTotalUsers(data?.length || 0);
    } catch (err) {
      console.error("Error in searchUsers:", err);
      showToast("Terjadi kesalahan saat memuat pengguna", "error");
    } finally {
      setSearching(false);
    }
  }, [showToast]);

  // ✅ TETAP - Filter users based on search (client-side)
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

  // Load users on mount
  useEffect(() => {
    searchUsers("");
    loadAvailableClasses(); // ✅ Load classes saat component mount
  }, [searchUsers, loadAvailableClasses]);

  // ========== FORM HANDLERS ==========

  const openAddModal = async () => {
    setModalMode("add");
    setEditingUser(null);

    // ✅ AUTO-GENERATE TEACHER_ID untuk role teacher
    let teacherId = "";
    if (formData.role === "teacher") {
      teacherId = await generateNextTeacherId();
    }

    setFormData({
      username: "",
      full_name: "",
      password: "",
      role: "teacher",
      teacher_id: teacherId,
      no_hp: "",
      is_active: true,
    });
    setFormErrors({});
    setShowUserModal(true);
  };

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

  // Form validation
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

  // Handle form submit dengan AUTO-GENERATE TEACHER_ID
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

      // ✅ Proceed with insert/update dengan AUTO-GENERATE TEACHER_ID
      if (modalMode === "add") {
        const userData = {
          username: formData.username,
          password: formData.password,
          full_name: formData.full_name,
          role: formData.role,
          no_hp: formData.no_hp || null,
          is_active: formData.is_active,
        };

        // ✅ AUTO-GENERATE TEACHER_ID jika role teacher dan kosong
        if (formData.role === "teacher") {
          let teacherId = formData.teacher_id;
          if (!teacherId) {
            teacherId = await generateNextTeacherId();
          }
          userData.teacher_id = teacherId;
        }

        console.log("📤 Inserting user data:", userData);

        const { error: insertError } = await supabase.from("users").insert([userData]);

        if (insertError) {
          console.error("❌ Insert error:", insertError);
          showToast(`Gagal menyimpan data user: ${insertError.message}`, "error");
          setSubmitting(false);
          return;
        }

        await logAuditActivity("CREATE_USER", null, {
          created_username: formData.username,
          created_role: formData.role,
          created_teacher_id: formData.teacher_id || "Auto-generated",
        });

        showToast(
          `User berhasil ditambahkan${
            formData.role === "teacher" ? ` dengan ID: ${formData.teacher_id}` : ""
          }!`,
          "success"
        );
        searchUsers("");
        setShowUserModal(false);
      } else if (modalMode === "edit") {
        const updateData = {
          username: formData.username.trim(),
          full_name: formData.full_name.trim(),
          role: formData.role,
          teacher_id: formData.role === "teacher" ? formData.teacher_id : null,
          no_hp: formData.no_hp || null,
          is_active: formData.is_active,
        };

        if (formData.password) {
          updateData.password = formData.password.trim();
        }

        console.log("📤 Updating user data:", updateData);

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
        setShowUserModal(false);
      }

      setSubmitting(false);
    } catch (err) {
      console.error("Error submitting form:", err);
      showToast("Terjadi kesalahan saat menyimpan data", "error");
      setSubmitting(false);
    }
  };

  // ========== RESET PASSWORD ==========

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

      showToast(`Password berhasil direset untuk ${resetPasswordUser.full_name}!`, "success");
      setResetting(false);
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

  // ========== DELETE USER ==========

  const handleOpenDeleteModal = (deleteUser) => {
    if (deleteUser.id === currentUser.id) {
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
      const { error } = await supabase.from("users").delete().eq("id", deleteTarget.id);
      if (error) throw error;

      await logAuditActivity("DELETE_USER", deleteTarget, {
        deleted_user_role: deleteTarget.role,
        deleted_user_teacher_id: deleteTarget.teacher_id,
      });

      showToast(`User "${deleteTarget.full_name}" berhasil dihapus!`, "success");
      handleCloseDeleteModal();
      searchUsers("");
    } catch (err) {
      showToast("Gagal menghapus user", "error");
    } finally {
      setDeletingUser(false);
    }
  };

  // ========== RENDER ==========

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Search & Add Section dengan Export/Import */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 mb-6 border border-blue-100 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"
              />
              <input
                type="text"
                placeholder="Cari pengguna (Nama, Username, ID Guru)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base transition min-h-[44px]"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Add User Button */}
              <button
                onClick={openAddModal}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white rounded-lg font-semibold transition-colors flex-shrink-0 text-sm min-h-[44px]"
              >
                <Plus size={18} />
                <span>Tambah User</span>
              </button>

              {/* Export Button */}
              <button
                onClick={exportUsersCSV}
                disabled={loading || totalUsers === 0}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors flex-shrink-0 text-sm min-h-[44px] disabled:opacity-50"
              >
                <Download size={18} />
                <span>Export CSV</span>
              </button>

              {/* Template Button */}
              <button
                onClick={downloadTemplateCSV}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors flex-shrink-0 text-sm min-h-[44px] disabled:opacity-50"
              >
                <Download size={18} />
                <span>Template</span>
              </button>

              {/* Import Button */}
              <label className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white rounded-lg font-semibold transition-colors flex-shrink-0 text-sm min-h-[44px] cursor-pointer disabled:opacity-50">
                <Upload size={18} />
                <span>Import CSV</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={importUsersCSV}
                  className="hidden"
                  disabled={loading}
                />
              </label>
            </div>
          </div>

          {/* User List dengan COLUMN WALI KELAS */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  {searching
                    ? "Mencari..."
                    : searchQuery
                    ? "Tidak ada pengguna yang ditemukan"
                    : "Belum ada pengguna"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Nama
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Username / ID
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Role
                      </th>
                      {/* ✅ COLUMN BARU: Wali Kelas */}
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Wali Kelas
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            {user.full_name}
                          </div>
                          {user.no_hp && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                              <Phone size={12} />
                              {user.no_hp}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <div className="font-medium text-gray-700 dark:text-gray-300">
                              {user.username}
                            </div>
                            {user.teacher_id && (
                              <div className="text-xs font-mono text-blue-600 dark:text-blue-400">
                                {user.teacher_id}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                              user.role === "admin"
                                ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                                : user.role === "guru_bk"
                                ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                                : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                            }`}
                          >
                            <Shield size={12} />
                            {user.role === "admin"
                              ? "Admin"
                              : user.role === "guru_bk"
                              ? "Guru BK"
                              : "Guru"}
                          </span>
                        </td>

                        {/* ✅ COLUMN WALI KELAS - Editable untuk Teacher */}
                        <td className="px-4 py-3">
                          {user.role === "teacher" ? (
                            <select
                              value={user.homeroom_class_id || ""}
                              onChange={(e) => updateTeacherClass(user.id, e.target.value || null)}
                              disabled={loading || !user.is_active}
                              className="text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white transition-colors min-w-[120px]"
                            >
                              <option value="">Pilih Kelas</option>
                              {availableClasses.map((cls) => (
                                <option key={cls.id} value={cls.id}>
                                  Kelas {cls.id}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 text-sm">-</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                              user.is_active
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                user.is_active
                                  ? "bg-green-500 dark:bg-green-400"
                                  : "bg-gray-400 dark:bg-gray-500"
                              }`}
                            ></span>
                            {user.is_active ? "Aktif" : "Nonaktif"}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditModal(user)}
                              className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              title="Edit User"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => openResetPasswordModal(user)}
                              className="p-2 text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                              title="Reset Password"
                            >
                              <Mail size={16} />
                            </button>
                            <button
                              onClick={() => handleOpenDeleteModal(user)}
                              className="p-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Hapus User"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-blue-200 dark:border-gray-700 shadow">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="text-blue-600 dark:text-blue-400" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Pengguna</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalUsers}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-blue-200 dark:border-gray-700 shadow">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Shield className="text-green-600 dark:text-green-400" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Aktif</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {filteredUsers.filter((u) => u.is_active).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-blue-200 dark:border-gray-700 shadow">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Shield className="text-purple-600 dark:text-purple-400" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Admin</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {filteredUsers.filter((u) => u.role === "admin").length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-blue-200 dark:border-gray-700 shadow">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Shield className="text-orange-600 dark:text-orange-400" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Guru BK</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {filteredUsers.filter((u) => u.role === "guru_bk").length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== MODALS ========== */}

      {/* Add/Edit User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 dark:bg-black/70 flex items-center justify-center p-4">
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-auto max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 rounded-t-xl z-10 border-b border-blue-200 dark:border-gray-700">
              <div className="flex items-center justify-between p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                  {modalMode === "add" ? (
                    <Plus size={20} className="text-green-600" />
                  ) : (
                    <Edit2 size={20} className="text-indigo-600" />
                  )}
                  {modalMode === "add" ? "Tambah User Baru" : "Edit User"}
                </h3>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="p-2 hover:bg-blue-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
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
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm ${
                    formErrors.username ? "border-red-500" : "border-blue-300 dark:border-gray-600"
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
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm ${
                    formErrors.full_name ? "border-red-500" : "border-blue-300 dark:border-gray-600"
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
                  onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
                  className="w-full px-4 py-3 border border-blue-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 text-sm"
                >
                  <option value="teacher">Guru</option>
                  <option value="guru_bk">Guru BK</option>
                  <option value="admin">Administrator</option>
                </select>
                {formData.role === "admin" && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                    ⚠️ <span className="font-semibold">PERINGATAN:</span> Role admin memiliki akses
                    penuh ke semua data dan fitur sistem.
                  </p>
                )}
              </div>

              {/* Teacher ID - Auto-generated untuk teacher */}
              {formData.role === "teacher" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    ID Guru <span className="text-red-500">*</span>
                    <span className="text-green-600 text-xs font-normal ml-2">
                      {modalMode === "add" ? "(Auto-generated)" : "(Dapat diedit)"}
                    </span>
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
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm ${
                      formErrors.teacher_id
                        ? "border-red-500"
                        : "border-blue-300 dark:border-gray-600"
                    }`}
                    placeholder="Contoh: G-01, G-12"
                    readOnly={modalMode === "add"}
                  />
                  {formErrors.teacher_id && (
                    <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle size={12} /> {formErrors.teacher_id}
                    </p>
                  )}
                  {modalMode === "add" && (
                    <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                      ✅ ID Guru akan di-generate otomatis secara sequential
                    </p>
                  )}
                </div>
              )}

              {/* Password */}
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Password {modalMode === "add" && <span className="text-red-500">*</span>}
                  {modalMode === "edit" && (
                    <span className="text-gray-500 dark:text-gray-400 text-xs font-normal ml-1">
                      (Kosongkan jika tidak diubah)
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm pr-12 ${
                      formErrors.password
                        ? "border-red-500"
                        : "border-blue-300 dark:border-gray-600"
                    }`}
                    placeholder={
                      modalMode === "add" ? "Masukkan password awal" : "Password baru (opsional)"
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} /> {formErrors.password}
                  </p>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Nomor HP
                </label>
                <input
                  type="text"
                  value={formData.no_hp}
                  onChange={(e) => setFormData((prev) => ({ ...prev, no_hp: e.target.value }))}
                  className="w-full px-4 py-3 border border-blue-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
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
                <label className="flex items-center gap-3 cursor-pointer">
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
            <div className="p-6 pt-4 border-t border-blue-200 dark:border-gray-700">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUserModal(false)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-100 to-blue-200 dark:from-gray-700 dark:to-gray-600 hover:from-blue-200 hover:to-blue-300 dark:hover:from-gray-600 dark:hover:to-gray-500 text-gray-800 dark:text-gray-300 rounded-lg font-semibold transition-all text-sm"
                  disabled={submitting}
                >
                  Batal
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-700 dark:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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

      {/* Reset Password Modal */}
      {showResetPasswordModal && resetPasswordUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 dark:bg-black/70 flex items-center justify-center p-4">
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-auto p-6">
            <div className="flex items-center justify-between border-b border-blue-200 dark:border-gray-700 pb-4 mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <Mail size={20} className="text-orange-600" />
                Reset Password
              </h3>
              <button
                onClick={closeResetPasswordModal}
                className="p-2 hover:bg-blue-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="text-center mb-6">
              <p className="text-gray-700 dark:text-gray-300 mb-3">Reset password untuk user:</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {resetPasswordUser.full_name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                ({resetPasswordUser.teacher_id || resetPasswordUser.username})
              </p>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-gray-700/50 dark:to-gray-800/50 border-2 border-blue-300 dark:border-gray-600 rounded-lg p-4 mb-4">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-semibold uppercase">
                Password Baru:
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <code className="text-xl font-mono font-bold text-gray-900 dark:text-gray-100 tracking-wider break-all text-center sm:text-left">
                  {newGeneratedPassword}
                </code>
                <button
                  onClick={copyPasswordToClipboard}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-1.5 mt-2 sm:mt-0 ${
                    passwordCopied
                      ? "bg-gradient-to-r from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 text-green-700 dark:text-green-300 border-2 border-green-500"
                      : "bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 text-blue-700 dark:text-blue-300 border-2 border-blue-500 hover:from-blue-200 hover:to-blue-300 dark:hover:from-blue-800/40 dark:hover:to-blue-700/40"
                  }`}
                >
                  {passwordCopied ? "Tersalin!" : "Salin"}
                </button>
              </div>
            </div>
            <div className="flex gap-3 pt-4 border-t border-blue-200 dark:border-gray-700">
              <button
                onClick={closeResetPasswordModal}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-100 to-blue-200 dark:from-gray-700 dark:to-gray-600 hover:from-blue-200 hover:to-blue-300 dark:hover:from-gray-600 dark:hover:to-gray-500 text-gray-800 dark:text-gray-300 rounded-lg font-semibold transition-all text-sm"
                disabled={resetting}
              >
                Batal
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetting}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 dark:from-orange-700 dark:to-orange-800 dark:hover:from-orange-600 dark:hover:to-orange-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                {resetting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Mereset...
                  </>
                ) : (
                  <>
                    <Mail size={16} />
                    Reset Sekarang
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-full">
                  <AlertCircle className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Konfirmasi Penghapusan User</h3>
                  <p className="text-sm text-red-100 mt-1">Tindakan ini tidak dapat dibatalkan!</p>
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
                    <span className="font-semibold text-red-900">{deleteTarget.full_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-700">Username:</span>
                    <span className="font-semibold text-red-900">@{deleteTarget.username}</span>
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
                      {deleteTarget.role === "admin"
                        ? "Administrator"
                        : deleteTarget.role === "guru_bk"
                        ? "Guru BK"
                        : "Guru"}
                    </span>
                  </div>
                  {deleteTarget.homeroom_class_id && (
                    <div className="flex justify-between">
                      <span className="text-red-700">Wali Kelas:</span>
                      <span className="font-semibold text-red-900">
                        Kelas {deleteTarget.homeroom_class_id}
                      </span>
                    </div>
                  )}
                </div>
              </div>
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
                  className="w-full px-4 py-3 border-2 border-red-300 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 font-mono"
                  autoFocus
                />
                <p className="text-xs text-gray-600 mt-2">
                  * Untuk keamanan, Anda harus mengetik kata "HAPUS" dengan huruf besar
                </p>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 rounded-b-2xl flex gap-3">
              <button
                onClick={handleCloseDeleteModal}
                disabled={deletingUser}
                className="flex-1 px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-white transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deletingUser || deleteConfirmText.toUpperCase() !== "HAPUS"}
                className="flex-1 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
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

export default UserManagementTab;
