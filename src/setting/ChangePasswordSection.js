import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function ChangePasswordSection({ user }) {
  // 🔍 DEBUG: Log user props
  console.log("🔍 DEBUG USER PROPS:", user);
  console.log("🔍 USER ID:", user?.id);
  console.log("🔍 USER KEYS:", user ? Object.keys(user) : "user is null");

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear message saat user mulai ngetik lagi
    if (message.text) setMessage({ type: "", text: "" });
  };

  const toggleShowPassword = (field) => {
    setShowPasswords({
      ...showPasswords,
      [field]: !showPasswords[field],
    });
  };

  const validateForm = () => {
    // Cek semua field terisi
    if (
      !formData.currentPassword ||
      !formData.newPassword ||
      !formData.confirmPassword
    ) {
      setMessage({ type: "error", text: "Semua field harus diisi!" });
      return false;
    }

    // Cek panjang password baru minimal 6 karakter
    if (formData.newPassword.length < 6) {
      setMessage({ type: "error", text: "Password baru minimal 6 karakter!" });
      return false;
    }

    // Cek password baru dan konfirmasi sama
    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({
        type: "error",
        text: "Password baru dan konfirmasi tidak sama!",
      });
      return false;
    }

    // Cek password baru tidak sama dengan password lama
    if (formData.currentPassword === formData.newPassword) {
      setMessage({
        type: "error",
        text: "Password baru harus berbeda dengan password lama!",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      // 🔍 DEBUG: Log user object
      console.log("📝 Starting password change for user:", user);

      // Verifikasi user tersedia
      if (!user) {
        console.error("❌ User object is null/undefined");
        throw new Error("User tidak ditemukan. Silakan login ulang.");
      }

      // Support both user.id and user.userId (dari localStorage)
      const userId = user.id || user.userId;

      if (!userId) {
        console.error("❌ USER STRUCTURE:", user);
        throw new Error("User ID tidak ditemukan. Silakan login ulang.");
      }

      console.log("✅ Using user ID:", userId);

      // Verifikasi password lama dari tabel users
      const { data: userData, error: fetchError } = await supabase
        .from("users")
        .select("password")
        .eq("id", userId)
        .single();

      console.log("📊 Query result:", { userData, fetchError });

      if (fetchError) {
        console.error("❌ Error fetching user:", fetchError);
        throw new Error("Gagal memverifikasi password lama");
      }

      if (!userData) {
        console.error("❌ User data not found for ID:", userId);
        throw new Error("Data user tidak ditemukan");
      }

      // Cek apakah password lama cocok
      if (userData.password !== formData.currentPassword) {
        console.log("❌ Password lama tidak cocok");
        setMessage({ type: "error", text: "Password lama salah!" });
        setLoading(false);
        return;
      }

      console.log("✅ Password lama cocok, updating...");

      // Update password baru ke database
      const { error: updateError } = await supabase
        .from("users")
        .update({
          password: formData.newPassword,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (updateError) {
        console.error("❌ Error updating password:", updateError);
        throw new Error("Gagal mengubah password");
      }

      console.log("✅ Password berhasil diubah!");

      // Berhasil
      setMessage({ type: "success", text: "Password berhasil diubah!" });

      // Reset form
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error("❌ Error changing password:", error);
      setMessage({
        type: "error",
        text: error.message || "Terjadi kesalahan saat mengubah password",
      });
    } finally {
      setLoading(false);
    }
  };

  // 🔍 Tampilkan error jika user tidak ada
  if (!user) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 md:p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="text-red-800 dark:text-red-300 font-semibold mb-2 text-base">
            ⚠️ User Tidak Ditemukan
          </h3>
          <p className="text-red-700 dark:text-red-400 text-sm mb-4">
            Terjadi kesalahan dalam memuat data user. Silakan logout dan login
            kembali.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-3 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white rounded-md transition-colors text-sm w-full md:w-auto min-h-[44px]">
            Refresh Halaman
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 md:p-6">
      <h2 className="text-lg md:text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
        Ubah Password
      </h2>

      {/* Info User */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 md:p-4 mb-5 md:mb-6">
        <p className="text-sm text-blue-800 dark:text-blue-300 mb-1.5">
          <span className="font-semibold">Username:</span> {user.username}
        </p>
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <span className="font-semibold">Nama:</span> {user.full_name}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
        {/* Password Lama */}
        <div>
          <label className="block text-sm md:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
            Password Lama
          </label>
          <div className="relative">
            <input
              type={showPasswords.current ? "text" : "password"}
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              className="w-full px-4 py-3 md:py-2.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm md:text-base"
              disabled={loading}
              minLength={6}
            />
            <button
              type="button"
              onClick={() => toggleShowPassword("current")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center">
              {showPasswords.current ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        {/* Password Baru */}
        <div>
          <label className="block text-sm md:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
            Password Baru
          </label>
          <div className="relative">
            <input
              type={showPasswords.new ? "text" : "password"}
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              className="w-full px-4 py-3 md:py-2.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm md:text-base"
              disabled={loading}
              minLength={6}
            />
            <button
              type="button"
              onClick={() => toggleShowPassword("new")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center">
              {showPasswords.new ? "🙈" : "👁️"}
            </button>
          </div>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-2">
            Minimal 6 karakter
          </p>
        </div>

        {/* Konfirmasi Password Baru */}
        <div>
          <label className="block text-sm md:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
            Konfirmasi Password Baru
          </label>
          <div className="relative">
            <input
              type={showPasswords.confirm ? "text" : "password"}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-4 py-3 md:py-2.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm md:text-base"
              disabled={loading}
              minLength={6}
            />
            <button
              type="button"
              onClick={() => toggleShowPassword("confirm")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center">
              {showPasswords.confirm ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div
            className={`p-3 md:p-4 rounded-md text-sm md:text-base ${
              message.type === "success"
                ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800"
            }`}>
            {message.text}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white py-3 md:py-2.5 px-4 rounded-md disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors text-sm md:text-base font-medium min-h-[48px] md:min-h-[44px]">
          {loading ? "Mengubah Password..." : "Ubah Password"}
        </button>
      </form>
    </div>
  );
}
