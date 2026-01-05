// components/Login3.js (OPSI 3 - CENTER FOCUS)
import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { supabase } from "../supabaseClient";
import Logo from "./Logo";
import backgroundImage from "../assets/Background.JPG";

export const Login = ({ onLogin, onShowToast }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    if (!username) {
      setErrors({ username: "Username harus diisi" });
      setIsLoading(false);
      return;
    }
    if (!password) {
      setErrors({ password: "Password harus diisi" });
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        if (error.code === "PGRST116") {
          throw new Error("Username tidak ditemukan");
        }
        throw new Error("Terjadi kesalahan sistem: " + error.message);
      }

      if (!data) {
        throw new Error("Username tidak ditemukan");
      }

      if (data.password !== password) {
        throw new Error("Password salah");
      }

      const userData = {
        id: data.id,
        username: data.username,
        role: data.role,
        nama: data.full_name,
        full_name: data.full_name,
        teacher_id: data.teacher_id,
        homeroom_class_id: data.homeroom_class_id,
        email: data.email || `${data.username}@smp.edu`,
        is_active: data.is_active,
        created_at: data.created_at,
      };

      onLogin(userData, rememberMe);

      if (onShowToast) {
        onShowToast(`Selamat datang, ${userData.full_name}! 👋`, "success");
      }
    } catch (error) {
      setErrors({ general: error.message });

      if (onShowToast) {
        onShowToast(error.message, "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Image with Blur */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          filter: "blur(2px)",
          transform: "scale(1.1)",
        }}
      ></div>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-blue-900/60 to-slate-900/70"></div>

      <style>{`
        @keyframes slide-in-down {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-in-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.3; filter: blur(40px); }
          50% { opacity: 0.6; filter: blur(50px); }
        }
        .slide-in-down {
          animation: slide-in-down 0.8s ease-out forwards;
        }
        .slide-in-up {
          animation: slide-in-up 0.8s ease-out 0.2s forwards;
          opacity: 0;
        }
        .glow-effect {
          animation: glow-pulse 4s ease-in-out infinite;
        }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #1e293b inset !important;
          -webkit-text-fill-color: white !important;
        }
      `}</style>

      {/* Subtle Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full glow-effect"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full glow-effect"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md mx-4 sm:mx-6">
        {/* Welcome Header */}
        <div className="text-center mb-8 slide-in-down">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight uppercase drop-shadow-2xl">
            SMP Muslimin Cililin
          </h1>
          <div className="max-w-lg mx-auto">
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
              <span className="text-blue-300 font-semibold">Visi: </span>
              Mewujudkan Peserta Didik yang Berakhlak Mulia, Moderat, Mandiri dan Berprestasi
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="slide-in-up">
          <div className="bg-slate-800/80 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-xl overflow-hidden p-2">
                <Logo size="large" className="rounded-xl" />
              </div>
            </div>

            {/* Form Header */}
            <div className="mb-6 text-center">
              <p className="text-slate-300 text-sm">Silakan Masuk Ke Akun Anda</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username Field */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Username</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  </div>
                  <input
                    type="text"
                    className={`w-full pl-11 pr-4 py-3 bg-slate-900/50 border-2 rounded-xl text-white placeholder-slate-500 transition-all duration-300 ${
                      errors.username
                        ? "border-red-500/50 focus:border-red-500 focus:ring-4 focus:ring-red-500/20"
                        : "border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
                    } focus:outline-none focus:bg-slate-900/70`}
                    placeholder="Masukkan username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                {errors.username && (
                  <p className="text-red-400 text-xs mt-1.5 flex items-center">
                    <span className="mr-1">⚠</span>
                    {errors.username}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    className={`w-full pl-11 pr-12 py-3 bg-slate-900/50 border-2 rounded-xl text-white placeholder-slate-500 transition-all duration-300 ${
                      errors.password
                        ? "border-red-500/50 focus:border-red-500 focus:ring-4 focus:ring-red-500/20"
                        : "border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
                    } focus:outline-none focus:bg-slate-900/70`}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                    onClick={togglePasswordVisibility}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-400 text-xs mt-1.5 flex items-center">
                    <span className="mr-1">⚠</span>
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-2 border-slate-600 bg-slate-900/50 text-blue-500 focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                  />
                  <span className="ml-2 text-slate-300 select-none">Ingat saya</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    onShowToast(
                      "Hubungi admin untuk reset password: admin@smpmuslimin.sch.id",
                      "info"
                    )
                  }
                  className="text-sm font-semibold text-white hover:text-slate-200 transition-colors"
                >
                  Lupa password?
                </button>
              </div>

              {/* Error Message */}
              {errors.general && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-sm flex items-start">
                  <span className="mr-2 mt-0.5">⚠</span>
                  <span>{errors.general}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 hover:from-blue-700 hover:via-blue-600 hover:to-purple-700 text-white font-bold rounded-xl transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span>Masuk Sekarang</span>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-6 pt-5 border-t border-slate-700/30 text-center">
              <p className="text-xs text-slate-400">© 2025 SMP MUSLIMIN CILILIN</p>
              <p className="text-xs text-slate-400 mt-1">Sistem Administrasi Sekolah v1.0.0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
