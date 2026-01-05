// components/Login3.js
import React, { useState, useEffect, useMemo } from "react";
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
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchStatsData = async () => {
    try {
      setStatsLoading(true);

      const [teachersResult, studentsResult, gradesResult, classesResult] = await Promise.all([
        supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true)
          .in("role", ["teacher", "guru_bk"])
          .neq("username", "adenurmughni"),

        supabase.from("students").select("*", { count: "exact", head: true }).eq("is_active", true),

        supabase.from("classes").select("grade").eq("is_active", true).in("grade", [7, 8, 9]),

        supabase.from("classes").select("*", { count: "exact", head: true }).eq("is_active", true),
      ]);

      const teacherCount = teachersResult.count || 0;
      const studentCount = studentsResult.count || 0;
      const classesCount = classesResult.count || 0;

      const uniqueGrades = new Set((gradesResult.data || []).map((item) => item.grade));
      const gradesCount = uniqueGrades.size;
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatsData();
  }, []);

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
      {/* Background Image with Blur - SAMA untuk mobile & desktop */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          filter: "blur(0.5px)",
          transform: "scale(1.05)",
        }}
      ></div>

      {/* Dark Overlay - lebih tipis biar gambar lebih keliatan */}
      <div className="absolute inset-0 bg-slate-900/30"></div>

      <style>{`
        @keyframes wave {
          0% { transform: translateX(0) translateY(0); }
          50% { transform: translateX(-25%) translateY(-10px); }
          100% { transform: translateX(-50%) translateY(0); }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.5; filter: blur(20px); }
          50% { opacity: 0.8; filter: blur(25px); }
        }
        @keyframes slide-in-right {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slide-in-left {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .wave-pattern {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 200%;
          height: 100%;
          background: linear-gradient(to top, rgba(59, 130, 246, 0.1), transparent);
          animation: wave 20s linear infinite;
        }
        .glow-effect {
          animation: glow-pulse 3s ease-in-out infinite;
        }
        .slide-in-right {
          animation: slide-in-right 0.6s ease-out forwards;
        }
        .slide-in-left {
          animation: slide-in-left 0.6s ease-out forwards;
        }
        .fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #1e293b inset !important;
          -webkit-text-fill-color: white !important;
        }
      `}</style>

      {/* Animated Background Effects */}
      <div className="absolute inset-0">
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/20 via-blue-900/10 to-slate-900/20"></div>

        {/* Glowing Orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/20 rounded-full glow-effect"></div>
        <div
          className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/15 rounded-full glow-effect"
          style={{ animationDelay: "1.5s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/3 w-64 h-64 bg-cyan-500/15 rounded-full glow-effect"
          style={{ animationDelay: "0.8s" }}
        ></div>

        {/* Wave Pattern */}
        <div className="wave-pattern"></div>

        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)`,
              backgroundSize: "50px 50px",
            }}
          ></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-7xl mx-4 lg:mx-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Side - Welcome Message */}
          <div className="slide-in-left">
            <div className="space-y-8">
              {/* Welcome Message */}
              <div className="text-white text-center">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6 leading-tight uppercase">
                  Selamat Datang di
                  <br />
                  SMP Muslimin Cililin
                </h1>
                <div className="space-y-3">
                  <p className="text-blue-300 text-lg sm:text-xl font-semibold">Visi :</p>
                  {/* Visi - 2 baris di semua ukuran layar */}
                  <p className="text-slate-200 text-base sm:text-lg lg:text-xl leading-relaxed max-w-2xl mx-auto">
                    <span className="block">Mewujudkan Peserta Didik yang Berakhlak Mulia</span>
                    <span className="block">Moderat, Mandiri dan Berprestasi</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="slide-in-right flex justify-center lg:justify-end">
            <div className="bg-slate-800/70 backdrop-blur-2xl border border-white/20 rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl w-full max-w-md">
              {/* Logo - Rounded corners */}
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-xl overflow-hidden p-2">
                  <Logo size="large" className="rounded-xl" />
                </div>
              </div>

              {/* Form Header */}
              <div className="mb-6">
                <p className="text-slate-300 text-sm text-center">Silakan Masuk Ke Akun Anda</p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Username Field */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Username
                  </label>
                  <div className="max-w-sm">
                    {" "}
                    {/* 👈 TAMBAH INI */}
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
                  </div>{" "}
                  {/* 👈 TUTUP DIV */}
                  {errors.username && (
                    <p className="text-red-400 text-xs mt-1.5 flex items-center max-w-xs mx-auto">
                      {" "}
                      {/* 👈 TAMBAH max-w-xs mx-auto */}
                      <span className="mr-1">⚠</span>
                      {errors.username}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Password
                  </label>
                  <div className="max-w-sm">
                    {" "}
                    {/* 👈 TAMBAH INI */}
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
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>{" "}
                  {/* 👈 TUTUP DIV */}
                  {errors.password && (
                    <p className="text-red-400 text-xs mt-1.5 flex items-center max-w-xs mx-auto">
                      {" "}
                      {/* 👈 TAMBAH max-w-xs mx-auto */}
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
                    <span className="ml-2 text-slate-300 group-hover:text-slate-300 transition-colors select-none">
                      Ingat saya
                    </span>
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
    </div>
  );
};

export default Login;
