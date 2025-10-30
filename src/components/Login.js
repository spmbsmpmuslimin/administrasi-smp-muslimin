// components/Login.js
import React, { useState, useEffect, useMemo } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../supabaseClient";
import Logo from "./Logo";
// Import background image - PERHATIKAN HURUF BESAR JPG
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

    // Preload image with animation trigger
    const img = new Image();
    img.src = backgroundImage;
    img.onload = () => {
      setTimeout(() => setImageLoaded(true), 100);
    };
    img.onerror = () => {
      console.error("Failed to load background image");
      setImageLoaded(true); // Still show content even if image fails
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
      console.log("🔍 Mencoba login dengan:", { username });

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("❌ Error dari Supabase:", error);
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

      console.log("✅ Login sukses:", data);

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
      console.error("❌ Login error:", error.message);
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* PHOTO SECTION - Kiri di desktop, Atas di mobile */}
        <div
          className={`relative overflow-hidden bg-gradient-to-br from-blue-800 via-blue-700 to-blue-900 flex-shrink-0 h-[35vh] lg:h-auto lg:flex-[7] transition-all duration-1000 ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}
          style={{
            backgroundImage: imageLoaded ? `url(${backgroundImage})` : "none",
            backgroundSize: "cover",
            backgroundPosition: "center 40%",
            backgroundRepeat: "no-repeat",
          }}>
          {/* Loading State */}
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            </div>
          )}

          {/* Vignette overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-blue-900/40"></div>

          {/* BRANDING OVERLAY with Animation */}
          <div
            className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-1000 delay-300 ${
              imageLoaded
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}>
            <div className="text-center px-4">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-white/25 tracking-wider drop-shadow-2xl leading-tight">
                SMP MUSLIMIN
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-white/20 mt-2 tracking-widest drop-shadow-xl">
                CILILIN
              </p>
            </div>
          </div>
        </div>

        {/* FORM SECTION - Kanan di desktop, Bawah di mobile */}
        <div className="flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-blue-50/50 to-blue-100/50 relative overflow-hidden flex-1 lg:flex-[2]">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-blue-800/5"></div>

          <form
            className={`bg-white/95 backdrop-blur-xl p-6 sm:p-7 lg:p-8 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md lg:max-w-sm relative z-10 border border-white/30 transition-all duration-700 delay-500 ${
              imageLoaded
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-12"
            } hover:shadow-3xl`}
            onSubmit={handleSubmit}>
            <div className="text-center mb-6 sm:mb-8 relative">
              <div className="mb-3 sm:mb-4 flex justify-center">
                <Logo size="medium" className="opacity-90" />
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-600 mb-1 sm:mb-2">
                Selamat Datang
              </h2>
              <p className="text-gray-500 text-sm sm:text-base">
                Silakan masuk ke akun Anda
              </p>
            </div>

            {/* Username Field */}
            <div className="mb-4 sm:mb-5 relative">
              <label
                className="block font-semibold text-gray-700 mb-2 text-sm tracking-wide"
                htmlFor="username">
                Username
              </label>
              <input
                type="text"
                id="username"
                className={`w-full px-4 py-3 sm:px-5 sm:py-3.5 border-2 rounded-xl text-sm sm:text-base transition-all duration-300 bg-white/80 backdrop-blur-sm ${
                  errors.username
                    ? "border-red-500 shadow-red-100"
                    : "border-gray-200 focus:border-blue-600 focus:shadow-blue-100"
                } focus:outline-none focus:shadow-lg focus:bg-white`}
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              {errors.username && (
                <div className="text-red-500 text-sm mt-2 flex items-center font-medium">
                  <span className="mr-2">⚠️</span>
                  {errors.username}
                </div>
              )}
            </div>

            {/* Password Field */}
            <div className="mb-4 sm:mb-5 relative">
              <label
                className="block font-semibold text-gray-700 mb-2 text-sm tracking-wide"
                htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  className={`w-full px-4 py-3 sm:px-5 sm:py-3.5 pr-12 border-2 rounded-xl text-sm sm:text-base transition-all duration-300 bg-white/80 backdrop-blur-sm ${
                    errors.password
                      ? "border-red-500 shadow-red-100"
                      : "border-gray-200 focus:border-blue-600 focus:shadow-blue-100"
                  } focus:outline-none focus:shadow-lg focus:bg-white`}
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-blue-600 transition-colors p-2"
                  onClick={togglePasswordVisibility}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <div className="text-red-500 text-sm mt-2 flex items-center font-medium">
                  <span className="mr-2">⚠️</span>
                  {errors.password}
                </div>
              )}
            </div>

            {/* Error Message */}
            {errors.general && (
              <div className="mb-4 sm:mb-5 p-3 sm:p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
                ⚠️ {errors.general}
              </div>
            )}

            {/* Remember Me & Forgot Password */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2 sm:gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 border-2 border-gray-300 rounded bg-white checked:bg-blue-600 checked:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors cursor-pointer"
                />
                <label
                  htmlFor="remember"
                  className="text-sm text-gray-600 font-medium cursor-pointer select-none">
                  Ingat saya
                </label>
              </div>
              <a
                href="#"
                className="text-sm text-blue-600 font-semibold hover:text-blue-700 hover:underline transition-colors">
                Lupa password?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 sm:py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-xl text-white text-sm sm:text-base font-bold cursor-pointer transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
              disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                  <span>Memproses...</span>
                </>
              ) : (
                <span>Masuk</span>
              )}
            </button>

            {/* Footer */}
            <div className="mt-6 pt-5 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-500 mb-1">
                © 2025 SMP MUSLIMIN CILILIN
              </p>
              <p className="text-xs text-gray-400">
                Sistem Administrasi Sekolah • v1.0.0
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
