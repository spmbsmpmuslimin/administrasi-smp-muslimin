// components/Login3.js
import React, { useState, useEffect, useMemo } from "react";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  GraduationCap,
  Users,
  BookOpen,
  School,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import Logo from "./Logo";

export const Login3 = ({ onLogin, onShowToast }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [stats, setStats] = useState({
    activeTeachers: 0,
    activeStudents: 0,
    grades: 0,
    classes: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchStatsData = async () => {
    try {
      setStatsLoading(true);

      const [teachersResult, studentsResult, gradesResult, classesResult] =
        await Promise.all([
          supabase
            .from("users")
            .select("*", { count: "exact", head: true })
            .eq("is_active", true)
            .in("role", ["teacher", "guru_bk"])
            .neq("username", "adenurmughni"),

          supabase
            .from("students")
            .select("*", { count: "exact", head: true })
            .eq("is_active", true),

          supabase
            .from("classes")
            .select("grade")
            .eq("is_active", true)
            .in("grade", [7, 8, 9]),

          supabase
            .from("classes")
            .select("*", { count: "exact", head: true })
            .eq("is_active", true),
        ]);

      const teacherCount = teachersResult.count || 0;
      const studentCount = studentsResult.count || 0;
      const classesCount = classesResult.count || 0;

      const uniqueGrades = new Set(
        (gradesResult.data || []).map((item) => item.grade)
      );
      const gradesCount = uniqueGrades.size;

      setStats({
        activeTeachers: teacherCount,
        activeStudents: studentCount,
        grades: gradesCount,
        classes: classesCount,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  const memoizedStats = useMemo(() => stats, [stats]);

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
    <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden">
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
        .stat-card {
          transition: all 0.3s ease;
        }
        .stat-card:hover {
          transform: translateY(-5px);
        }
      `}</style>

      {/* Animated Background */}
      <div className="absolute inset-0">
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900"></div>

        {/* Glowing Orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/30 rounded-full glow-effect"></div>
        <div
          className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full glow-effect"
          style={{ animationDelay: "1.5s" }}></div>
        <div
          className="absolute top-1/2 left-1/3 w-64 h-64 bg-cyan-500/20 rounded-full glow-effect"
          style={{ animationDelay: "0.8s" }}></div>

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
            }}></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-7xl mx-4 lg:mx-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Side - Branding & Stats */}
          <div className="slide-in-left">
            <div className="space-y-8">
              {/* Logo & Title */}
              <div className="text-white">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
                    <Logo size="medium" />
                  </div>
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-bold">
                      SMP MUSLIMIN
                    </h1>
                    <p className="text-blue-300 text-lg">CILILIN</p>
                  </div>
                </div>
                <p className="text-slate-300 text-lg leading-relaxed">
                  Platform administrasi sekolah yang modern dan terintegrasi
                  untuk memudahkan pengelolaan data akademik
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="stat-card bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                      <GraduationCap className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">
                      {statsLoading ? "..." : stats.activeTeachers}
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm font-medium">
                    Guru Aktif
                  </p>
                </div>

                <div className="stat-card bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                      <Users className="w-6 h-6 text-purple-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">
                      {statsLoading ? "..." : stats.activeStudents}
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm font-medium">
                    Siswa Aktif
                  </p>
                </div>

                <div className="stat-card bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">
                      {statsLoading ? "..." : stats.grades}
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm font-medium">Tingkat</p>
                </div>

                <div className="stat-card bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center">
                      <School className="w-6 h-6 text-pink-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">
                      {statsLoading ? "..." : stats.classes}
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm font-medium">Kelas</p>
                </div>
              </div>

              {/* Feature Highlights */}
              <div className="flex flex-wrap gap-3">
                <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-300 text-sm font-medium">
                  ✓ Dashboard Interaktif
                </div>
                <div className="px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-300 text-sm font-medium">
                  ✓ Data Real-time
                </div>
                <div className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-300 text-sm font-medium">
                  ✓ Aman & Terpercaya
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="slide-in-right">
            <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 lg:p-10 shadow-2xl">
              {/* Form Header */}
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">
                  Masuk ke Akun
                </h2>
                <p className="text-slate-400">
                  Silakan login untuk mengakses sistem
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Username Field */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-3">
                    Username
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                    </div>
                    <input
                      type="text"
                      className={`w-full pl-12 pr-4 py-4 bg-slate-900/50 border-2 rounded-xl text-white placeholder-slate-500 transition-all duration-300 ${
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
                    <p className="text-red-400 text-sm mt-2 flex items-center">
                      <span className="mr-1">⚠</span>
                      {errors.username}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-3">
                    Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      className={`w-full pl-12 pr-12 py-4 bg-slate-900/50 border-2 rounded-xl text-white placeholder-slate-500 transition-all duration-300 ${
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
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                      onClick={togglePasswordVisibility}>
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-400 text-sm mt-2 flex items-center">
                      <span className="mr-1">⚠</span>
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-2 border-slate-600 bg-slate-900/50 text-blue-500 focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                    />
                    <span className="ml-3 text-sm text-slate-400 group-hover:text-slate-300 transition-colors select-none">
                      Ingat saya
                    </span>
                  </label>
                  <a
                    href="#"
                    className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                    Lupa password?
                  </a>
                </div>

                {/* Error Message */}
                {errors.general && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-sm flex items-start">
                    <span className="mr-2 mt-0.5">⚠</span>
                    <span>{errors.general}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full py-4 bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 hover:from-blue-700 hover:via-blue-600 hover:to-purple-700 text-white font-bold rounded-xl transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <span className="text-lg">Masuk Sekarang</span>
                  )}
                </button>
              </form>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-slate-700/50 text-center">
                <p className="text-xs text-slate-500">
                  © 2025 SMP MUSLIMIN CILILIN
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Sistem Administrasi Sekolah v1.0.0
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login3;
