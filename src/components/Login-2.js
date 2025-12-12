// components/Login2.js
import React, { useState, useEffect, useMemo } from "react";
import { Eye, EyeOff, Lock, User, ArrowRight } from "lucide-react";
import { supabase } from "../supabaseClient";
import Logo from "./Logo";

export const Login2 = ({ onLogin, onShowToast }) => {
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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <style>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes float-up {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes scale-pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.7; }
        }
        .gradient-animated {
          background: linear-gradient(-45deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%);
          background-size: 400% 400%;
          animation: gradient-shift 15s ease infinite;
        }
        .float-animation {
          animation: float-up 6s ease-in-out infinite;
        }
        .scale-pulse-animation {
          animation: scale-pulse 4s ease-in-out infinite;
        }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px white inset !important;
          -webkit-text-fill-color: #1e293b !important;
        }
      `}</style>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient Orbs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-400/30 to-purple-400/30 rounded-full blur-3xl scale-pulse-animation"></div>
        <div
          className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-400/30 to-pink-400/30 rounded-full blur-3xl scale-pulse-animation"
          style={{ animationDelay: "2s" }}></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-cyan-400/20 to-blue-400/20 rounded-full blur-3xl scale-pulse-animation"
          style={{ animationDelay: "1s" }}></div>

        {/* Floating Dots */}
        <div className="absolute top-20 left-20 w-2 h-2 bg-blue-400 rounded-full float-animation"></div>
        <div
          className="absolute top-40 right-32 w-3 h-3 bg-purple-400 rounded-full float-animation"
          style={{ animationDelay: "1s" }}></div>
        <div
          className="absolute bottom-32 left-40 w-2 h-2 bg-indigo-400 rounded-full float-animation"
          style={{ animationDelay: "2s" }}></div>
        <div
          className="absolute bottom-20 right-20 w-3 h-3 bg-pink-400 rounded-full float-animation"
          style={{ animationDelay: "1.5s" }}></div>
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-5xl mx-4 lg:mx-8">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/50">
          <div className="flex flex-col lg:flex-row">
            {/* Left Side - Branding */}
            <div className="lg:w-5/12 gradient-animated p-8 lg:p-12 flex flex-col justify-center items-center text-white relative overflow-hidden">
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>

              <div className="relative z-10 text-center">
                {/* Logo */}
                <div className="mb-6 flex justify-center">
                  <div className="relative">
                    <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl">
                      <Logo size="large" className="opacity-90" />
                    </div>
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-3xl lg:text-4xl font-bold mb-4 drop-shadow-lg">
                  SMP MUSLIMIN CILILIN
                </h1>
                <p className="text-white/90 text-base lg:text-lg mb-8 leading-relaxed">
                  Sistem Administrasi Sekolah
                </p>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-4 mt-8">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                    <div className="text-3xl font-bold mb-1">
                      {statsLoading ? "..." : stats.activeTeachers}
                    </div>
                    <div className="text-sm text-white/90">Guru Aktif</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                    <div className="text-3xl font-bold mb-1">
                      {statsLoading ? "..." : stats.activeStudents}
                    </div>
                    <div className="text-sm text-white/90">Siswa Aktif</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                    <div className="text-3xl font-bold mb-1">
                      {statsLoading ? "..." : stats.grades}
                    </div>
                    <div className="text-sm text-white/90">Tingkat</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                    <div className="text-3xl font-bold mb-1">
                      {statsLoading ? "..." : stats.classes}
                    </div>
                    <div className="text-sm text-white/90">Kelas</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Form */}
            <div className="lg:w-7/12 p-8 lg:p-12 flex items-center">
              <div className="w-full max-w-md mx-auto">
                {/* Header */}
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-slate-800 mb-2">
                    Selamat Datang Kembali
                  </h2>
                  <p className="text-slate-600">
                    Masuk dengan akun Anda untuk melanjutkan
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Username Field */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Username
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        className={`w-full pl-12 pr-4 py-3.5 bg-white border-2 rounded-xl text-slate-800 placeholder-slate-400 transition-all duration-300 ${
                          errors.username
                            ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                            : "border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                        } focus:outline-none`}
                        placeholder="Masukkan username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                    </div>
                    {errors.username && (
                      <p className="text-red-500 text-sm mt-2 flex items-center">
                        <span className="mr-1">⚠️</span>
                        {errors.username}
                      </p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        className={`w-full pl-12 pr-12 py-3.5 bg-white border-2 rounded-xl text-slate-800 placeholder-slate-400 transition-all duration-300 ${
                          errors.password
                            ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                            : "border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                        } focus:outline-none`}
                        placeholder="Masukkan password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                        onClick={togglePasswordVisibility}>
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-red-500 text-sm mt-2 flex items-center">
                        <span className="mr-1">⚠️</span>
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
                        className="w-4 h-4 rounded border-2 border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="ml-2 text-sm text-slate-600 group-hover:text-slate-800 transition-colors select-none">
                        Ingat saya
                      </span>
                    </label>
                    <a
                      href="#"
                      className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                      Lupa password?
                    </a>
                  </div>

                  {/* Error Message */}
                  {errors.general && (
                    <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start">
                      <span className="mr-2 mt-0.5">⚠️</span>
                      <span>{errors.general}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl transition-all duration-300 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center group"
                    disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                        <span>Memproses...</span>
                      </>
                    ) : (
                      <>
                        <span>Masuk</span>
                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>

                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-slate-200 text-center">
                  <p className="text-xs text-slate-500">
                    © 2025 SMP MUSLIMIN CILILIN • Sistem Administrasi Sekolah
                    v1.0.0
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login2;
