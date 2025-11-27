import { useState } from "react";
import { supabase } from "../supabaseClient"; // Sesuaikan path-nya

export default function ChangePasswordSection({ user }) {
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
      // Verifikasi user tersedia
      if (!user || !user.id) {
        throw new Error("User tidak ditemukan");
      }

      // Verifikasi password lama dari tabel users
      const { data: userData, error: fetchError } = await supabase
        .from("users")
        .select("password")
        .eq("id", user.id)
        .single();

      if (fetchError) {
        console.error("Error fetching user:", fetchError);
        throw new Error("Gagal memverifikasi password lama");
      }

      // Cek apakah password lama cocok
      if (userData.password !== formData.currentPassword) {
        setMessage({ type: "error", text: "Password lama salah!" });
        setLoading(false);
        return;
      }

      // Update password baru ke database
      const { error: updateError } = await supabase
        .from("users")
        .update({
          password: formData.newPassword,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("Error updating password:", updateError);
        throw new Error("Gagal mengubah password");
      }

      // Berhasil
      setMessage({ type: "success", text: "Password berhasil diubah!" });

      // Reset form
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error("Error changing password:", error);
      setMessage({
        type: "error",
        text: error.message || "Terjadi kesalahan saat mengubah password",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Ubah Password
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        {/* Password Lama */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password Lama
          </label>
          <div className="relative">
            <input
              type={showPasswords.current ? "text" : "password"}
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => toggleShowPassword("current")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
              {showPasswords.current ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        {/* Password Baru */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password Baru
          </label>
          <div className="relative">
            <input
              type={showPasswords.new ? "text" : "password"}
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => toggleShowPassword("new")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
              {showPasswords.new ? "🙈" : "👁️"}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Minimal 6 karakter</p>
        </div>

        {/* Konfirmasi Password Baru */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Konfirmasi Password Baru
          </label>
          <div className="relative">
            <input
              type={showPasswords.confirm ? "text" : "password"}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => toggleShowPassword("confirm")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
              {showPasswords.confirm ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div
            className={`p-3 rounded-md text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}>
            {message.text}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
          {loading ? "Mengubah Password..." : "Ubah Password"}
        </button>
      </form>
    </div>
  );
}
