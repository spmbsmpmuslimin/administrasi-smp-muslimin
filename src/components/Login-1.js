// components/Login.js
import React, { useState, useEffect, useMemo } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../supabaseClient";
import Logo from "./Logo";
import logoSekolah from "../assets/logo_sekolah.png";
import backgroundImage from "../assets/Background.JPG";

export const Login = ({ onLogin, onShowToast }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
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

    const img = new Image();
    img.src = backgroundImage;
    img.onload = () => {
      setTimeout(() => setImageLoaded(true), 100);
    };
    img.onerror = () => {
      console.error("Failed to load background image");
      setImageLoaded(true);
    };
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a4d8f] via-[#0d5ea8] to-[#0f2b4d] relative overflow-hidden">
      {/* Animated background elements */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(30px, -30px) rotate(5deg); }
          66% { transform: translate(-20px, 20px) rotate(-5deg); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(-25px, 25px) rotate(-3deg); }
          66% { transform: translate(20px, -15px) rotate(3deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 10s ease-in-out infinite;
        }
        .animate-pulse-glow {
          animation: pulse-glow 4s ease-in-out infinite;
        }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px rgba(255, 255, 255, 0.15) inset !important;
          -webkit-text-fill-color: white !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>

      {/* Floating decorative shapes */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-blue-400/20 rounded-full blur-3xl animate-pulse-glow"></div>
      <div
        className="absolute top-20 right-20 w-24 h-24 bg-cyan-400/20 rounded-full blur-2xl animate-pulse-glow"
        style={{ animationDelay: "1s" }}></div>
      <div
        className="absolute bottom-20 left-1/4 w-40 h-40 bg-blue-500/15 rounded-full blur-3xl animate-pulse-glow"
        style={{ animationDelay: "2s" }}></div>

      {/* Wavy floating shapes - Left side */}
      <div className="absolute left-8 top-1/4 opacity-20 animate-float">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <path
            d="M10 40 Q 25 20, 40 40 T 70 40"
            stroke="#60A5FA"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M10 55 Q 25 35, 40 55 T 70 55"
            stroke="#3B82F6"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Wavy floating shapes - Right side */}
      <div className="absolute right-12 top-1/3 opacity-25 animate-float-delayed">
        <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
          <path
            d="M15 50 Q 32 25, 50 50 T 85 50"
            stroke="#60A5FA"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M15 70 Q 32 45, 50 70 T 85 70"
            stroke="#3B82F6"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Bottom wavy shapes */}
      <div
        className="absolute bottom-8 right-1/4 opacity-20 animate-float"
        style={{ animationDelay: "1.5s" }}>
        <svg width="120" height="60" viewBox="0 0 120 60" fill="none">
          <path
            d="M10 30 Q 35 10, 60 30 T 110 30"
            stroke="#60A5FA"
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Spinning circle top */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
        <div
          className="w-20 h-20 border-4 border-cyan-400/30 border-t-cyan-400/60 rounded-full animate-spin"
          style={{ animationDuration: "3s" }}></div>
      </div>

      {/* Login Card Container */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Glassmorphism Card */}
        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl p-8 border border-white/20 shadow-2xl relative overflow-hidden">
          {/* Gradient overlay effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>

          {/* Header with logo */}
          <div className="text-center mb-8 relative z-10">
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <Logo size="medium" className="opacity-90 drop-shadow-2xl" />
                <div className="absolute inset-0 bg-blue-400/20 blur-2xl rounded-full scale-150"></div>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
              Login
            </h2>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            {/* Username Field */}
            <div>
              <label className="block text-white/90 mb-2 text-sm font-medium">
                Email
              </label>
              <input
                type="text"
                className={`w-full px-4 py-3 bg-white/15 backdrop-blur-sm border rounded-xl text-white placeholder-white/50 transition-all duration-300 ${
                  errors.username
                    ? "border-red-400/50"
                    : "border-white/30 focus:border-white/50"
                } focus:outline-none focus:ring-2 focus:ring-white/20`}
                placeholder="username@gmail.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              {errors.username && (
                <p className="text-red-300 text-xs mt-1">{errors.username}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-white/90 mb-2 text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className={`w-full px-4 py-3 pr-12 bg-white/15 backdrop-blur-sm border rounded-xl text-white placeholder-white/50 transition-all duration-300 ${
                    errors.password
                      ? "border-red-400/50"
                      : "border-white/30 focus:border-white/50"
                  } focus:outline-none focus:ring-2 focus:ring-white/20`}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors p-1"
                  onClick={togglePasswordVisibility}>
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-300 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <a
                href="#"
                className="text-sm text-cyan-300 hover:text-cyan-200 transition-colors">
                Forgot Password?
              </a>
            </div>

            {/* Error Message */}
            {errors.general && (
              <div className="p-3 bg-red-500/20 border border-red-400/30 text-red-200 rounded-lg text-sm">
                {errors.general}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-[#1e3a5f] to-[#0d5ea8] hover:from-[#2a4a75] hover:to-[#1570c4] text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                "Sign In"
              )}
            </button>

            {/* Register Link */}
            <div className="text-center pt-4">
              <p className="text-white/70 text-sm">
                Don't have an account yet?{" "}
                <a
                  href="#"
                  className="text-cyan-300 hover:text-cyan-200 font-medium transition-colors">
                  Register for free
                </a>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
