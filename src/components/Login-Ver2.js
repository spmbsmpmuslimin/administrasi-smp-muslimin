// components/Login_V2_SplitVertical.js
import React, { useState } from "react";
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
    <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden">
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-in-left {
          from { opacity: 0; transform: translateX(-50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .fade-in {
          animation: fade-in 1s ease-out forwards;
        }
        .slide-in-left {
          animation: slide-in-left 0.8s ease-out forwards;
        }
        .shimmer-effect {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          background-size: 1000px 100%;
          animation: shimmer 3s infinite;
        }
        .float-animation {
          animation: float 6s ease-in-out infinite;
        }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #1e293b inset !important;
          -webkit-text-fill-color: white !important;
        }
      `}</style>

      {/* LEFT SIDE - Form Section (30%) */}
      <div className="flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden flex-1 lg:flex-[3] bg-slate-900 slide-in-left">
        {/* Animated Gradient Orbs */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tr from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>

        {/* Form Container */}
        <div className="relative w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-2xl overflow-hidden p-2 hover:scale-110 transition-transform duration-300">
              <Logo size="large" className="rounded-xl" />
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
            {/* Form Header */}
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Masuk</h2>
              <p className="text-slate-400 text-sm">Silakan login ke akun Anda</p>
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

      {/* RIGHT SIDE - Photo Section (70%) */}
      <div className="relative overflow-hidden flex-shrink-0 h-[40vh] lg:h-screen lg:flex-[7] fade-in">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${backgroundImage})`,
          }}
        ></div>

        {/* Multi-layer Overlays */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/50 via-purple-900/40 to-slate-900/60"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

        {/* Shimmer Effect */}
        <div className="absolute inset-0 shimmer-effect opacity-20"></div>

        {/* Content Overlay */}
        <div className="absolute inset-0 flex items-center justify-center px-6 sm:px-8 lg:px-12">
          <div className="text-white text-center max-w-3xl">
            <div className="float-animation">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold mb-6 leading-tight uppercase drop-shadow-2xl">
                Selamat Datang di
                <br />
                <span className="text-blue-300">SMP Muslimin Cililin</span>
              </h1>
            </div>

            <div className="space-y-4 mt-8">
              <div className="inline-block px-4 py-2 bg-blue-500/20 backdrop-blur-sm border border-blue-300/30 rounded-full">
                <p className="text-blue-200 text-lg sm:text-xl font-semibold">Visi Sekolah</p>
              </div>
              <p className="text-slate-100 text-base sm:text-lg lg:text-xl xl:text-2xl leading-relaxed drop-shadow-lg max-w-2xl mx-auto">
                Mewujudkan Peserta Didik yang{" "}
                <span className="text-blue-300 font-semibold">Berakhlak Mulia</span>,
                <br className="hidden sm:block" />
                <span className="text-purple-300 font-semibold">Moderat</span>,{" "}
                <span className="text-cyan-300 font-semibold">Mandiri</span> dan{" "}
                <span className="text-pink-300 font-semibold">Berprestasi</span>
              </p>
            </div>

            {/* Decorative Elements */}
            <div className="mt-12 flex justify-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <div
                className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"
                style={{ animationDelay: "0.2s" }}
              ></div>
              <div
                className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"
                style={{ animationDelay: "0.4s" }}
              ></div>
            </div>
          </div>
        </div>

        {/* Bottom Gradient Fade (Mobile Only) */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-900 to-transparent lg:hidden"></div>
      </div>
    </div>
  );
};

export default Login;
