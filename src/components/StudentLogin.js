// components/StudentLogin.js
// ========================================================================
// Halaman login KHUSUS siswa — terpisah total dari Login.js (yang dipakai
// guru/admin/tu/guru_bk/petugas_perpus). Query cuma ke `student_auth`,
// gak nyentuh tabel `users` sama sekali.
//
// UI sengaja disamain gaya visualnya dengan Login.js (dark navy
// glassmorphism, split panel foto, blob animasi) biar kerasa 1 produk yang
// sama walau pintu masuknya beda. Logic login DI BAWAH INI GAK DIUBAH SAMA
// SEKALI dari versi sebelumnya — cuma tampilannya yang diganti.
//
// Kenapa tetep dipisah dari Login.js:
// - Nambah fitur khusus siswa (kayak recordDeviceLogin) gak perlu
//   nyentuh/resiko ke flow login staf sama sekali.
// - Dua-duanya independen — aman diubah terpisah.
// ========================================================================
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../supabaseClient";
import { saveStudentSession } from "../utils/studentSession";
import { recordDeviceLogin } from "../utils/studentDevices";
import Logo from "./Logo";
import backgroundImage from "../assets/Background.webp";

export default function StudentLogin({ onLogin, onShowToast }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
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

  // ============================================================
  // ===== LOGIC LOGIN SISWA — TIDAK DIUBAH DARI VERSI SEBELUMNYA =====
  // ============================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    if (!username) {
      setErrors({ username: "Username belum diisi" });
      setIsLoading(false);
      return;
    }
    if (!password) {
      setErrors({ password: "Password belum diisi" });
      setIsLoading(false);
      return;
    }

    try {
      const { data: studentAuth, error: studentAuthError } = await supabase
        .from("student_auth")
        .select("*, students(id, full_name, nis, class_id, academic_year)")
        .eq("username", username)
        .eq("is_active", true)
        .maybeSingle();

      if (studentAuthError && studentAuthError.code !== "PGRST116") {
        throw new Error(
          "Terjadi kesalahan sistem: " + studentAuthError.message,
        );
      }
      if (!studentAuth) {
        throw new Error("Username tidak ditemukan");
      }
      if (studentAuth.password !== password) {
        throw new Error("Password salah");
      }

      await supabase
        .from("student_auth")
        .update({ last_login: new Date().toISOString() })
        .eq("id", studentAuth.id);

      const student = studentAuth.students || {};

      const userData = {
        id: studentAuth.id,
        student_id: studentAuth.student_id,
        username: studentAuth.username,
        role: "siswa",
        nama: student.full_name,
        full_name: student.full_name,
        nis: student.nis,
        class_id: student.class_id,
        academic_year: student.academic_year,
        is_active: studentAuth.is_active,
        created_at: studentAuth.created_at,
      };

      // session.id HARUS studentAuth.id (bukan student.id) — sama kayak
      // sebelumnya di Login.js, karena useStudentProfile.js query ulang ke
      // student_auth pakai id ini.
      saveStudentSession({ id: studentAuth.id });

      // Catat device ini ke riwayat (student_devices) — dipanggil sekali
      // tiap login sukses. Gak pernah nge-throw, jadi aman di-await tanpa
      // bikin login gagal kalau ini doang yang error.
      await recordDeviceLogin(studentAuth.student_id);

      onLogin(userData, rememberMe);

      if (onShowToast) {
        onShowToast(`Selamat Datang, ${userData.full_name}! 👋`, "success");
      }
    } catch (error) {
      setErrors({ general: error.message });
      if (onShowToast) onShowToast(error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword((v) => !v);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
      {/* Animated background patterns */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-teal-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-amber-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        .animate-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          background-size: 1000px 100%;
          animation: shimmer 3s infinite;
        }
        .shimmer-effect {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          background-size: 1000px 100%;
          animation: shimmer 3s infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .float-animation {
          animation: float 6s ease-in-out infinite;
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
          50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.5); }
        }
        .glow-pulse {
          animation: glow-pulse 3s ease-in-out infinite;
        }
        /* Fix browser autofill kuning */
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px rgba(255, 255, 255, 0.1) inset !important;
          -webkit-text-fill-color: white !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>

      <div className="flex-1 flex flex-col lg:flex-row relative z-10">
        {/* PHOTO SECTION (80%) - KANAN DI DESKTOP, ATAS DI MOBILE */}
        <div
          className={`relative overflow-hidden flex-shrink-0 h-[40vh] lg:h-screen lg:flex-[8] bg-slate-950 transition-opacity duration-1000 ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}>
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-teal-900 to-blue-900 flex items-center justify-center">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-white/20 border-t-white/80 rounded-full animate-spin"></div>
                <div
                  className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-teal-400/50 rounded-full animate-spin"
                  style={{ animationDuration: "1.5s" }}></div>
              </div>
            </div>
          )}

          {/* Background Image - CLEAR & CRISP */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: "100% auto",
              backgroundPosition: "center top",
              backgroundRepeat: "no-repeat",
            }}></div>

          {/* Desktop cover overlay */}
          <div
            className="hidden lg:block absolute inset-0"
            style={{
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center center",
              backgroundRepeat: "no-repeat",
            }}></div>

          {/* Aesthetic Overlay - HANYA EDGES BLUR, CENTER TETAP JELAS */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 via-transparent to-purple-900/30"></div>

          {/* Vignette Effect - Gelap di pinggir, terang di tengah */}
          <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/50"></div>

          {/* Bottom Fade untuk Aesthetic */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>

          {/* Light Shimmer untuk Glow Effect */}
          <div className="absolute inset-0 shimmer-effect opacity-10"></div>

          {/* Content Overlay dengan Glass Effect */}
          <div className="absolute bottom-8 left-0 right-0 px-6 sm:px-8 lg:px-12">
            <div className="text-white text-center max-w-3xl mx-auto">
              <div className="float-animation">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold mb-4 leading-tight uppercase drop-shadow-2xl">
                  Selamat Datang di
                  <br />
                  <span className="text-blue-300 glow-pulse inline-block">
                    SMP Muslimin Cililin
                  </span>
                </h1>
              </div>

              {/* Decorative Elements dengan Glow */}
              <div className="mt-6 flex justify-center gap-3">
                <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse shadow-lg shadow-blue-400/50"></div>
                <div
                  className="w-3 h-3 bg-purple-400 rounded-full animate-pulse shadow-lg shadow-purple-400/50"
                  style={{ animationDelay: "0.2s" }}></div>
                <div
                  className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse shadow-lg shadow-cyan-400/50"
                  style={{ animationDelay: "0.4s" }}></div>
              </div>
            </div>
          </div>

          {/* Bottom Gradient Fade (Mobile Only) */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-900 to-transparent lg:hidden"></div>
        </div>

        {/* FORM SECTION */}
        <div className="flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden flex-1 lg:flex-[2] bg-gradient-to-br from-slate-900/50 to-blue-900/50 backdrop-blur-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-teal-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div
            className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-amber-500/20 to-teal-500/20 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}></div>

          <form
            className={`relative w-full max-w-md lg:max-w-sm transition-all duration-700 delay-500 ${
              imageLoaded
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-12"
            }`}
            onSubmit={handleSubmit}>
            <div className="bg-white/10 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 border border-white/20 shadow-2xl relative overflow-hidden group hover:bg-white/[0.12] transition-all duration-500 hover:scale-[1.02] hover:shadow-teal-500/20">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-teal-500/0 via-blue-500/0 to-amber-500/0 group-hover:from-teal-500/20 group-hover:via-blue-500/20 group-hover:to-amber-500/20 transition-all duration-500 -z-10"></div>

              {/* Header */}
              <div className="text-center mb-8 relative">
                <div className="mb-4 flex justify-center">
                  <div className="relative group/logo">
                    <Logo
                      size="medium"
                      className="opacity-90 drop-shadow-2xl transition-transform duration-300 group-hover/logo:scale-110"
                    />
                    <div className="absolute inset-0 bg-teal-400/20 blur-xl rounded-full scale-150 group-hover/logo:bg-teal-400/30 transition-all duration-300"></div>
                  </div>
                </div>
                <p className="text-teal-200/80 text-xs font-semibold tracking-[0.2em] uppercase mb-1">
                  Portal Siswa
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 drop-shadow-lg">
                  Selamat Datang
                </h2>
                <p className="text-blue-200/80 text-sm sm:text-base">
                  Gunakan username &amp; password dari wali kelas
                </p>
                <div className="mt-3 w-16 h-1 mx-auto bg-gradient-to-r from-transparent via-teal-400/50 to-transparent rounded-full"></div>
              </div>

              {/* Username */}
              <div className="mb-5 relative group/input">
                <label className="block font-semibold text-white/90 mb-2 text-sm tracking-wide">
                  Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="username"
                    className={`w-full px-4 py-3.5 bg-white/10 backdrop-blur-sm border-2 rounded-xl text-white placeholder-white/40 transition-all duration-300 autofill:bg-white/10 autofill:text-white ${
                      errors.username
                        ? "border-red-400/50 shadow-lg shadow-red-500/20"
                        : "border-white/20 focus:border-teal-400/50 focus:shadow-lg focus:shadow-teal-500/20"
                    } focus:outline-none hover:border-white/30`}
                    placeholder="Masukkan username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-teal-500/0 to-blue-500/0 group-hover/input:from-teal-500/5 group-hover/input:to-blue-500/5 transition-all duration-300 pointer-events-none"></div>
                </div>
                {errors.username && (
                  <div className="text-red-300 text-sm mt-2 flex items-center font-medium animate-pulse">
                    <span className="mr-2">⚠️</span>
                    {errors.username}
                  </div>
                )}
              </div>

              {/* Password */}
              <div className="mb-5 relative group/input">
                <label className="block font-semibold text-white/90 mb-2 text-sm tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    className={`w-full px-4 py-3.5 pr-12 bg-white/10 backdrop-blur-sm border-2 rounded-xl text-white placeholder-white/40 transition-all duration-300 autofill:bg-white/10 autofill:text-white ${
                      errors.password
                        ? "border-red-400/50 shadow-lg shadow-red-500/20"
                        : "border-white/20 focus:border-blue-400/50 focus:shadow-lg focus:shadow-blue-500/20"
                    } focus:outline-none hover:border-white/30`}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-all duration-300 p-2 hover:bg-white/10 rounded-lg"
                    onClick={togglePasswordVisibility}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/0 to-teal-500/0 group-hover/input:from-blue-500/5 group-hover/input:to-teal-500/5 transition-all duration-300 pointer-events-none"></div>
                </div>
                {errors.password && (
                  <div className="text-red-300 text-sm mt-2 flex items-center font-medium animate-pulse">
                    <span className="mr-2">⚠️</span>
                    {errors.password}
                  </div>
                )}
              </div>

              {/* Error umum */}
              {errors.general && (
                <div className="mb-5 p-4 bg-red-500/20 backdrop-blur-sm border border-red-400/30 text-red-200 rounded-xl text-sm font-medium shadow-lg shadow-red-500/10 animate-pulse">
                  ⚠️ {errors.general}
                </div>
              )}

              {/* Remember me & lupa password */}
              <div className="flex justify-between items-center mb-6">
                <label className="flex items-center gap-2 cursor-pointer group/check">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-white/10 border-2 border-white/30 checked:bg-teal-500 checked:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-400/50 transition-all cursor-pointer"
                  />
                  <span className="text-sm text-white/80 group-hover/check:text-white transition-colors select-none">
                    Ingat saya
                  </span>
                </label>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onShowToast?.(
                      "Lupa password? Hubungi wali kelas kamu.",
                      "info",
                    );
                  }}
                  className="text-sm text-teal-300 hover:text-teal-200 transition-colors font-medium hover:underline">
                  Lupa password?
                </a>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="relative w-full py-4 rounded-xl text-white font-bold transition-all duration-500 flex items-center justify-center shadow-xl hover:scale-[1.02] active:scale-[0.98] group/btn overflow-hidden bg-gradient-to-r from-teal-800 via-teal-700 to-blue-700 hover:from-teal-700 hover:via-teal-600 hover:to-blue-600 shadow-teal-900/40 hover:shadow-2xl hover:shadow-teal-800/60 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed"
                disabled={isLoading}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></div>

                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span className="relative z-10">🚀 Masuk</span>
                )}
              </button>

              {/* Link ke login guru/staf */}
              <div className="text-center mt-5">
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="text-base font-bold text-white/70 hover:text-white/90 transition-colors">
                  Login Sebagai Guru 👉
                </button>
              </div>

              {/* Footer */}
              <div className="mt-6 pt-6 border-t border-white/10 text-center">
                <p className="text-xs text-white/60 mb-1">
                  © 2026 SMP MUSLIMIN CILILIN
                </p>
                <p className="text-xs text-white/40">Portal Siswa • v1.0.0</p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
