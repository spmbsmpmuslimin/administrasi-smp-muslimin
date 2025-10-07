// components/Login.js
import React, { useState, useEffect, useMemo } from "react";
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabaseClient';
import Logo from './Logo';

export const Login = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [stats, setStats] = useState({
    activeTeachers: 0,
    activeStudents: 0,
    grades: 0,
    classes: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // ✅ FIX: Optimized stats fetching dengan role yang benar
  const fetchStatsData = async () => {
    try {
      setStatsLoading(true);
      
      // ✅ QUERY YANG BENAR - sesuaikan dengan role database
      const [teachersResult, studentsResult] = await Promise.all([
        supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true)
          .in("role", ["teacher", "guru_bk"]), // ✅ UPDATE: include guru_bk
        
        supabase
          .from("students")
          .select("class_id")
          .eq("is_active", true)
      ]);

      const teacherCount = teachersResult.count || 0;
      const studentsData = studentsResult.data || [];
      
      // Process students data for grades and classes
      const uniqueGrades = new Set();
      const uniqueClasses = new Set();
      
      studentsData.forEach((student) => {
        if (student.class_id) {
          const grade = student.class_id.charAt(0);
          uniqueGrades.add(grade);
          uniqueClasses.add(student.class_id);
        }
      });

      setStats({
        activeTeachers: teacherCount,
        activeStudents: studentsData.length,
        grades: uniqueGrades.size,
        classes: uniqueClasses.size,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  // Memoized stats to prevent unnecessary re-renders
  const memoizedStats = useMemo(() => stats, [stats]);

  useEffect(() => {
    fetchStatsData();
  }, []);

  // ✅ FIX: Login handler dengan error handling yang better
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
      console.log("Mencoba login dengan:", { username });

      // ✅ QUERY YANG BENAR - sesuaikan dengan structure database
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", username) 
        .eq("is_active", true)
        .maybeSingle() 

      if (error) {
        console.error("Error dari Supabase:", error);
        // ✅ ERROR HANDLING YANG LEBIH SPECIFIC
        if (error.code === 'PGRST116') {
          throw new Error("Username tidak ditemukan");
        }
        throw new Error("Terjadi kesalahan sistem: " + error.message);
      }

      if (!data) {
        throw new Error("Username tidak ditemukan");
      }

      // ✅ PASSWORD CHECK - tambahkan logging untuk debug
      console.log("Password check:", { 
        input: password, 
        stored: data.password,
        match: data.password === password 
      });

      if (data.password !== password) {
        throw new Error("Password salah");
      }

      console.log("Login sukses:", data);

      // ✅ PASS USER DATA YANG LENGKAP
      onLogin({
        id: data.id, // ✅ IMPORTANT: tambahkan ID
        username: data.username,
        role: data.role,
        nama: data.full_name,
        full_name: data.full_name,
        teacher_id: data.teacher_id,
        homeroom_class_id: data.homeroom_class_id,
        email: data.email || `${data.username}@smp.edu`,
        is_active: data.is_active,
        created_at: data.created_at
      });

    } catch (error) {
      console.error("Login error:", error.message);
      setErrors({ general: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2">
        {/* Brand Section - Enhanced Mobile Support */}
        <div className="flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-blue-600 to-blue-800 text-white text-center relative overflow-hidden">
          {/* Floating Background Elements */}
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-radial from-white/10 to-transparent animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-4/5 h-4/5 bg-gradient-radial from-white/5 to-transparent animate-pulse delay-1000"></div>
          
          {/* Brand Logo - Logo PUTIH untuk sebelah kiri */}
          <div className="mb-4 sm:mb-6 lg:mb-8 relative z-10 transition-transform duration-300 hover:scale-105">
            <Logo 
              size="xlarge"
              className="drop-shadow-2xl"
              variant="white"
            />
          </div>
          
          {/* Brand Title - Responsive */}
          <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold mb-1 sm:mb-2 relative z-10 drop-shadow-lg">
            SMP MUSLIMIN CILILIN
          </h1>
          <p className="text-sm sm:text-base lg:text-xl opacity-90 mb-4 sm:mb-6 lg:mb-8 relative z-10">
            Sistem Administrasi Sekolah Digital
          </p>

          {/* Mobile Stats - Compact Version */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 w-full max-w-sm sm:max-w-lg lg:max-w-2xl mb-4 sm:mb-6 lg:mb-8 relative z-10">
            <div className="text-center p-3 sm:p-4 lg:p-6 bg-white/10 rounded-lg sm:rounded-xl lg:rounded-2xl backdrop-blur-sm border border-white/20 transition-all duration-300 hover:-translate-y-1 lg:hover:-translate-y-2 hover:bg-white/15 hover:shadow-xl hover:border-white/30">
              <span className="text-lg sm:text-xl lg:text-3xl font-extrabold block mb-1 lg:mb-2 drop-shadow-md">
                {statsLoading ? "-" : memoizedStats.activeTeachers}
              </span>
              <span className="text-xs sm:text-sm opacity-90 font-medium tracking-wide leading-tight">
                Guru Aktif
              </span>
            </div>
            <div className="text-center p-3 sm:p-4 lg:p-6 bg-white/10 rounded-lg sm:rounded-xl lg:rounded-2xl backdrop-blur-sm border border-white/20 transition-all duration-300 hover:-translate-y-1 lg:hover:-translate-y-2 hover:bg-white/15 hover:shadow-xl hover:border-white/30">
              <span className="text-lg sm:text-xl lg:text-3xl font-extrabold block mb-1 lg:mb-2 drop-shadow-md">
                {statsLoading ? "-" : memoizedStats.activeStudents}
              </span>
              <span className="text-xs sm:text-sm opacity-90 font-medium tracking-wide leading-tight">
                Siswa Aktif
              </span>
            </div>
            <div className="text-center p-3 sm:p-4 lg:p-6 bg-white/10 rounded-lg sm:rounded-xl lg:rounded-2xl backdrop-blur-sm border border-white/20 transition-all duration-300 hover:-translate-y-1 lg:hover:-translate-y-2 hover:bg-white/15 hover:shadow-xl hover:border-white/30">
              <span className="text-lg sm:text-xl lg:text-3xl font-extrabold block mb-1 lg:mb-2 drop-shadow-md">
                {statsLoading ? "-" : memoizedStats.grades}
              </span>
              <span className="text-xs sm:text-sm opacity-90 font-medium tracking-wide leading-tight">
                Jenjang
              </span>
            </div>
            <div className="text-center p-3 sm:p-4 lg:p-6 bg-white/10 rounded-lg sm:rounded-xl lg:rounded-2xl backdrop-blur-sm border border-white/20 transition-all duration-300 hover:-translate-y-1 lg:hover:-translate-y-2 hover:bg-white/15 hover:shadow-xl hover:border-white/30">
              <span className="text-lg sm:text-xl lg:text-3xl font-extrabold block mb-1 lg:mb-2 drop-shadow-md">
                {statsLoading ? "-" : memoizedStats.classes}
              </span>
              <span className="text-xs sm:text-sm opacity-90 font-medium tracking-wide leading-tight">
                Kelas
              </span>
            </div>
          </div>

          {/* School Vision - Responsive */}
          <div className="bg-white/8 rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-7 max-w-sm sm:max-w-lg lg:max-w-2xl w-full backdrop-blur-lg border border-white/15 relative z-10">
            <h3 className="text-sm sm:text-base lg:text-xl font-bold mb-2 sm:mb-3 lg:mb-4 text-center relative pb-2">
              VISI SEKOLAH
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 sm:w-15 h-0.5 sm:h-1 bg-white rounded-full opacity-80"></div>
            </h3>
            <p className="text-xs sm:text-sm lg:text-base leading-relaxed text-center text-white/95 font-medium">
              "Mewujudkan Peserta Didik yang Berakhlak Mulia, Moderat, Mandiri dan Berprestasi"
            </p>
          </div>
        </div>

        {/* Login Form Section - Mobile Optimized */}
        <div className="flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-blue-50/30 to-blue-100/50 relative overflow-hidden">
          {/* Subtle Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-blue-800/5 animate-pulse"></div>
          
          <form 
            className="bg-white/95 backdrop-blur-xl p-6 sm:p-8 lg:p-12 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-sm sm:max-w-md relative z-10 border border-white/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-3xl"
            onSubmit={handleSubmit}
          >
            {/* Form Header - Logo WARNA ASLI untuk form login */}
            <div className="text-center mb-6 sm:mb-8 lg:mb-10 relative">
              {/* Logo kecil di form login */}
              <div className="mb-3 sm:mb-4 flex justify-center">
                <Logo 
                  size="medium"
                  className="opacity-90"
                />
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-600 mb-1 sm:mb-2">
                Selamat Datang
              </h2>
              <p className="text-gray-500 text-sm sm:text-base">
                Silakan masuk ke akun Anda
              </p>
            </div>

            {/* Username Field - Touch Optimized */}
            <div className="mb-4 sm:mb-6 relative">
              <label className="block font-semibold text-gray-700 mb-2 text-sm tracking-wide" htmlFor="username">
                Username
              </label>
              <input
                type="text"
                id="username"
                className={`w-full px-4 py-3 sm:px-5 sm:py-4 border-2 rounded-xl text-sm sm:text-base transition-all duration-300 bg-white/80 backdrop-blur-sm touch-manipulation ${
                  errors.username 
                    ? "border-red-500 shadow-red-100 animate-shake" 
                    : "border-gray-200 focus:border-blue-600 focus:shadow-blue-100"
                } focus:outline-none focus:shadow-lg focus:bg-white focus:-translate-y-0.5`}
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ minHeight: '48px' }}
                required
              />
              {errors.username && (
                <div className="text-red-500 text-sm mt-2 flex items-center font-medium">
                  <span className="mr-2">⚠️</span>
                  {errors.username}
                </div>
              )}
            </div>

            {/* Password Field - Touch Optimized */}
            <div className="mb-4 sm:mb-6 relative">
              <label className="block font-semibold text-gray-700 mb-2 text-sm tracking-wide" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  className={`w-full px-4 py-3 sm:px-5 sm:py-4 pr-12 sm:pr-14 border-2 rounded-xl text-sm sm:text-base transition-all duration-300 bg-white/80 backdrop-blur-sm touch-manipulation ${
                    errors.password 
                      ? "border-red-500 shadow-red-100 animate-shake" 
                      : "border-gray-200 focus:border-blue-600 focus:shadow-blue-100"
                  } focus:outline-none focus:shadow-lg focus:bg-white focus:-translate-y-0.5`}
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ minHeight: '48px' }}
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 bg-white/80 border border-gray-200 text-gray-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-600 rounded-lg p-2 transition-all duration-200 hover:scale-105 backdrop-blur-sm w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center touch-manipulation"
                  style={{ minWidth: '44px', minHeight: '44px' }}
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? (
                    <EyeOff size={16} className="text-current" />
                  ) : (
                    <Eye size={16} className="text-current" />
                  )}
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
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
                ⚠️ {errors.general}
              </div>
            )}

            {/* Remember Me & Forgot Password - Mobile Friendly */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-3 sm:gap-4">
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="remember" 
                  name="remember"
                  className="w-4 h-4 border-2 border-gray-300 rounded bg-white checked:bg-blue-600 checked:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors"
                />
                <label htmlFor="remember" className="text-sm text-gray-600 font-medium cursor-pointer touch-manipulation">
                  Ingat saya
                </label>
              </div>
              <a href="#" className="text-sm text-blue-600 font-semibold hover:text-blue-700 hover:underline transition-colors touch-manipulation">
                Lupa password?
              </a>
            </div>

            {/* Submit Button - Touch Optimized */}
            <button 
              type="submit" 
              className="w-full py-3 sm:py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-500 disabled:opacity-70 disabled:cursor-not-allowed border-none rounded-xl text-white text-sm sm:text-base font-bold cursor-pointer transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl hover:-translate-y-1 active:translate-y-0 tracking-wide relative overflow-hidden group touch-manipulation"
              style={{ minHeight: '48px' }}
              disabled={isLoading}
            >
              {/* Button shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
              
              {isLoading ? (
                <>
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2 sm:mr-3"></div>
                  <span>Memproses...</span>
                </>
              ) : (
                <span>Masuk</span>
              )}
            </button>

            {/* Footer inside form card */}
            <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-100 text-center">
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