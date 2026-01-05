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
    <div className="min-h-screen flex flex-col lg:flex-row-reverse overflow-hidden">
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
          -webkit-box-shadow: 0 0 0 30px white inset !important;
          -webkit-text-fill-color: #1e293b !important;
        }
      `}</style>

      {/* PHOTO SECTION (80%) - KANAN DI DESKTOP, ATAS DI MOBILE - LEBIH LEBAR! */}
      <div className="relative overflow-hidden flex-shrink-0 h-[40vh] lg:h-screen lg:flex-[8] fade-in bg-slate-900">
        {/* Background Image - MOBILE: contain + object-fit hack biar minim space */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: "100% auto",
            backgroundPosition: "center top",
            backgroundRepeat: "no-repeat",
          }}
        ></div>

        {/* Desktop cover overlay */}
        <div
          className="hidden lg:block absolute inset-0"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",
          }}
        ></div>

        {/* Multi-layer Overlays */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/50 via-purple-900/40 to-slate-900/60"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

        {/* Shimmer Effect */}
        <div className="absolute inset-0 shimmer-effect opacity-20"></div>

        {/* Content Overlay - TURUN KE BAWAH biar ga nutupin muka guru! */}
        <div className="absolute bottom-8 left-0 right-0 px-6 sm:px-8 lg:px-12">
          <div className="text-white text-center max-w-3xl mx-auto">
            <div className="float-animation">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold mb-4 leading-tight uppercase drop-shadow-2xl">
                Selamat Datang di
                <br />
                <span className="text-blue-300">SMP Muslimin Cililin</span>
              </h1>
            </div>

            {/* Decorative Elements */}
            <div className="mt-4 flex justify-center gap-2">
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

      {/* FORM SECTION (20%) - KIRI DI DESKTOP, BAWAH DI MOBILE - LEBIH KECIL! */}
      <div className="flex items-center justify-center p-4 sm:p-6 lg:p-6 relative overflow-hidden flex-1 lg:flex-[2] bg-slate-900 slide-in-left">
        {/* Animated Gradient Orbs */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tr from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>

        {/* Form Container */}
        <div className="relative w-full max-w-sm">
          {/* Logo - Desktop Only (outside card) */}
          <div className="hidden lg:flex justify-center mb-4">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl overflow-hidden p-2 hover:scale-110 transition-transform duration-300">
              <Logo size="medium" className="rounded-xl" />
            </div>
          </div>

          {/* Form Card - BACKGROUND PUTIH */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xl">
            {/* Logo - Mobile Only (inside card) */}
            <div className="flex lg:hidden justify-center mb-4">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden p-2">
                <Logo size="medium" className="rounded-xl" />
              </div>
            </div>

            {/* Form Header */}
            <div className="mb-4 text-center">
              <p className="text-slate-800 text-xs font-medium">Silakan Login Ke Akun Anda</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Field */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">Username</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    className={`w-full pl-10 pr-3 py-2.5 bg-slate-50 border-2 rounded-xl text-sm text-slate-900 placeholder-slate-500 transition-all duration-300 ${
                      errors.username
                        ? "border-red-500/50 focus:border-red-500 focus:ring-4 focus:ring-red-500/20"
                        : "border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
                    } focus:outline-none focus:bg-white`}
                    placeholder="Masukkan username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                {errors.username && (
                  <p className="text-red-600 text-xs mt-1 flex items-center font-medium">
                    <span className="mr-1">⚠</span>
                    {errors.username}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 border-2 rounded-xl text-sm text-slate-900 placeholder-slate-500 transition-all duration-300 ${
                      errors.password
                        ? "border-red-500/50 focus:border-red-500 focus:ring-4 focus:ring-red-500/20"
                        : "border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
                    } focus:outline-none focus:bg-white`}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-700 transition-colors"
                    onClick={togglePasswordVisibility}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-600 text-xs mt-1 flex items-center font-medium">
                    <span className="mr-1">⚠</span>
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-2 border-slate-300 bg-white text-blue-500 focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                  />
                  <span className="ml-1.5 text-slate-800 select-none font-medium">Ingat saya</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    onShowToast(
                      "Hubungi admin untuk reset password: admin@smpmuslimin.sch.id",
                      "info"
                    )
                  }
                  className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Lupa password?
                </button>
              </div>

              {/* Error Message */}
              {errors.general && (
                <div className="p-2.5 bg-red-50 border border-red-300 text-red-700 rounded-xl text-xs flex items-start font-medium">
                  <span className="mr-1.5 mt-0.5">⚠</span>
                  <span>{errors.general}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 hover:from-blue-700 hover:via-blue-600 hover:to-purple-700 text-white text-sm font-bold rounded-xl transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-3 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span>Masuk Sekarang</span>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-slate-200 text-center">
              <p className="text-[10px] text-slate-500">© 2025 SMP MUSLIMIN CILILIN</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Sistem Administrasi Sekolah v1.0.0
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
