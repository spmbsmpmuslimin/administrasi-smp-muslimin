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
          <h3 className="text-red-800 dark:text-red-300 font-semibold mb-2 text-base md:text-lg">
            ⚠️ User Tidak Ditemukan
          </h3>
          <p className="text-red-700 dark:text-red-400 text-sm md:text-base mb-4">
            Terjadi kesalahan dalam memuat data user. Silakan logout dan login
            kembali.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-3 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white rounded-md transition-colors text-sm md:text-base w-full md:w-auto min-h-[44px]">
            Refresh Halaman
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 md:p-8 border border-gray-100 dark:border-gray-700">
      <h2 className="text-xl md:text-2xl font-bold text-blue-800 dark:text-blue-300 mb-6">
        Ubah Password
      </h2>

      {/* Info User */}
      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-lg p-4 md:p-5 mb-6 md:mb-8">
        <p className="text-sm md:text-base text-blue-800 dark:text-blue-300 mb-2.5">
          <span className="font-semibold">Username:</span> {user.username}
        </p>
        <p className="text-sm md:text-base text-blue-800 dark:text-blue-300">
          <span className="font-semibold">Nama:</span> {user.full_name}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
        {/* Password Lama */}
        <div>
          <label className="block text-base md:text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
            Password Lama
          </label>
          <div className="relative">
            <input
              type={showPasswords.current ? "text" : "password"}
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              className="w-full px-5 py-3.5 md:py-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-3 focus:ring-blue-500/50 dark:focus:ring-blue-400/50 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-base md:text-lg transition-all"
              disabled={loading}
              minLength={6}
            />
            <button
              type="button"
              onClick={() => toggleShowPassword("current")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-300 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-lg"
              aria-label={
                showPasswords.current
                  ? "Sembunyikan password"
                  : "Tampilkan password"
              }>
              {showPasswords.current ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        {/* Password Baru */}
        <div>
          <label className="block text-base md:text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
            Password Baru
          </label>
          <div className="relative">
            <input
              type={showPasswords.new ? "text" : "password"}
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              className="w-full px-5 py-3.5 md:py-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-3 focus:ring-blue-500/50 dark:focus:ring-blue-400/50 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-base md:text-lg transition-all"
              disabled={loading}
              minLength={6}
            />
            <button
              type="button"
              onClick={() => toggleShowPassword("new")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-300 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-lg"
              aria-label={
                showPasswords.new
                  ? "Sembunyikan password"
                  : "Tampilkan password"
              }>
              {showPasswords.new ? "🙈" : "👁️"}
            </button>
          </div>
          <p className="text-sm md:text-base text-blue-600 dark:text-blue-400 mt-2.5 pl-1">
            🔒 Minimal 6 karakter
          </p>
        </div>

        {/* Konfirmasi Password Baru */}
        <div>
          <label className="block text-base md:text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
            Konfirmasi Password Baru
          </label>
          <div className="relative">
            <input
              type={showPasswords.confirm ? "text" : "password"}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-5 py-3.5 md:py-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-3 focus:ring-blue-500/50 dark:focus:ring-blue-400/50 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-base md:text-lg transition-all"
              disabled={loading}
              minLength={6}
            />
            <button
              type="button"
              onClick={() => toggleShowPassword("confirm")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-300 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-lg"
              aria-label={
                showPasswords.confirm
                  ? "Sembunyikan password"
                  : "Tampilkan password"
              }>
              {showPasswords.confirm ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div
            className={`p-4 md:p-5 rounded-xl text-base md:text-lg ${
              message.type === "success"
                ? "bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-2 border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-2 border-red-200 dark:border-red-800"
            }`}>
            <div className="flex items-start">
              <span className="mr-3 text-lg">
                {message.type === "success" ? "✅" : "❌"}
              </span>
              <span>{message.text}</span>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white py-4 md:py-5 px-6 rounded-xl disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-all text-base md:text-lg font-bold shadow-md hover:shadow-lg active:scale-[0.98] min-h-[52px] md:min-h-[56px]">
          {loading ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin h-5 w-5 mr-3 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Mengubah Password...
            </span>
          ) : (
            "Ubah Password"
          )}
        </button>
      </form>
    </div>
  );
}
