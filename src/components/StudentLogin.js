// components/StudentLogin.js
// ========================================================================
// Halaman login KHUSUS siswa — terpisah total dari Login.js (yang dipakai
// guru/admin/tu/guru_bk/petugas_perpus). Query cuma ke `student_auth`,
// gak nyentuh tabel `users` sama sekali.
//
// UI sengaja dibedain dari Login.js: palet hangat (coral/amber/cream),
// lebih ringan & ramah buat siswa SMP — bukan glassmorphism navy gelap
// kayak versi staf. Logic login DI BAWAH INI GAK DIUBAH SAMA SEKALI dari
// versi sebelumnya — cuma tampilannya yang diganti.
//
// Kenapa tetep dipisah dari Login.js:
// - Nambah fitur khusus siswa (kayak recordDeviceLogin) gak perlu
//   nyentuh/resiko ke flow login staf sama sekali.
// - Dua-duanya independen — aman diubah terpisah.
// ========================================================================
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, User, Lock, ArrowRight } from "lucide-react";
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
        throw new Error("Terjadi kesalahan sistem: " + studentAuthError.message);
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 relative overflow-hidden">
      {/* Dua blob hangat — pelan & halus, bukan dekorasi berlebihan */}
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <div className="absolute -top-10 -left-10 w-80 h-80 bg-orange-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob-soft"></div>
        <div className="absolute -bottom-16 -right-10 w-80 h-80 bg-rose-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob-soft animation-delay-3000"></div>
      </div>

      <style>{`
        @keyframes blob-soft {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(24px, -24px) scale(1.08); }
        }
        .animate-blob-soft { animation: blob-soft 10s ease-in-out infinite; }
        .animation-delay-3000 { animation-delay: 3s; }

        @keyframes float-gentle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .float-gentle { animation: float-gentle 5s ease-in-out infinite; }

        /* Fix browser autofill kuning */
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px rgba(255, 247, 237, 1) inset !important;
          -webkit-text-fill-color: #431407 !important;
          transition: background-color 5000s ease-in-out 0s;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-blob-soft, .float-gentle { animation: none; }
        }
      `}</style>

      <div className="flex-1 flex flex-col lg:flex-row relative z-10">
        {/* PHOTO SECTION — foto sekolah, atas di mobile / kanan di desktop */}
        <div
          className={`relative overflow-hidden flex-shrink-0 h-[38vh] lg:h-screen lg:flex-[8] bg-orange-950 transition-opacity duration-1000 ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}
        >
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gradient-to-br from-orange-200 via-amber-100 to-rose-200 flex items-center justify-center">
              <div className="w-14 h-14 border-4 border-orange-300 border-t-orange-600 rounded-full animate-spin"></div>
            </div>
          )}

          {/* Background Image */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: "100% auto",
              backgroundPosition: "center top",
              backgroundRepeat: "no-repeat",
            }}
          ></div>
          <div
            className="hidden lg:block absolute inset-0"
            style={{
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center center",
              backgroundRepeat: "no-repeat",
            }}
          ></div>

          {/* Overlay hangat sunset, bukan navy/purple */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-900/25 via-transparent to-rose-900/25"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

          {/* Sapaan di atas foto */}
          <div className="absolute bottom-8 left-0 right-0 px-6 sm:px-8 lg:px-12">
            <div className="text-white text-center max-w-3xl mx-auto float-gentle">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold mb-4 leading-tight drop-shadow-xl">
                SELAMAT DATANG
                <br />
                <span className="text-amber-300">SMP Muslimin Cililin</span>
              </h1>
              <div className="flex justify-center gap-2">
                <div className="w-2.5 h-2.5 bg-orange-300 rounded-full"></div>
                <div className="w-2.5 h-2.5 bg-amber-300 rounded-full"></div>
                <div className="w-2.5 h-2.5 bg-rose-300 rounded-full"></div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-orange-50 to-transparent lg:hidden"></div>
        </div>

        {/* FORM SECTION */}
        <div className="flex items-center justify-center p-4 sm:p-6 lg:p-10 flex-1 lg:flex-[2] bg-white/60">
          <form
            className={`relative w-full max-w-md lg:max-w-sm transition-all duration-700 ${
              imageLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
            onSubmit={handleSubmit}
          >
            <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-xl shadow-orange-900/10 border border-orange-100">
              {/* Header */}
              <div className="text-center mb-7">
                <div className="mb-4 flex justify-center">
                  <Logo size="medium" className="drop-shadow-sm" />
                </div>
                <p className="text-orange-600 text-2xl font-extrabold mb-1">Portal Siswa</p>
                <p className="text-stone-500 text-sm sm:text-base">
                  Gunakan username &amp; password dari wali kelas kamu
                </p>
              </div>

              {/* Username */}
              <div className="mb-4">
                <label
                  htmlFor="username"
                  className="block font-semibold text-stone-700 mb-1.5 text-sm"
                >
                  Username
                </label>
                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-400"
                  />
                  <input
                    type="text"
                    id="username"
                    className={`w-full pl-11 pr-4 py-3.5 bg-orange-50/70 border-2 rounded-xl text-stone-800 placeholder-stone-400 transition-colors duration-200 ${
                      errors.username
                        ? "border-red-300"
                        : "border-orange-100 focus:border-orange-400"
                    } focus:outline-none`}
                    placeholder="Masukkan username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                {errors.username && (
                  <div className="text-red-500 text-sm mt-1.5 flex items-center font-medium">
                    <span className="mr-1.5">⚠️</span>
                    {errors.username}
                  </div>
                )}
              </div>

              {/* Password */}
              <div className="mb-5">
                <label
                  htmlFor="password"
                  className="block font-semibold text-stone-700 mb-1.5 text-sm"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-400"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    className={`w-full pl-11 pr-12 py-3.5 bg-orange-50/70 border-2 rounded-xl text-stone-800 placeholder-stone-400 transition-colors duration-200 ${
                      errors.password
                        ? "border-red-300"
                        : "border-orange-100 focus:border-orange-400"
                    } focus:outline-none`}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-orange-500 transition-colors p-1.5 rounded-lg"
                    onClick={togglePasswordVisibility}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <div className="text-red-500 text-sm mt-1.5 flex items-center font-medium">
                    <span className="mr-1.5">⚠️</span>
                    {errors.password}
                  </div>
                )}
              </div>

              {/* Error umum */}
              {errors.general && (
                <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium">
                  ⚠️ {errors.general}
                </div>
              )}

              {/* Remember me & lupa password */}
              <div className="flex justify-between items-center mb-6">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-2 border-orange-200 text-orange-500 checked:bg-orange-500 checked:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-300 cursor-pointer"
                  />
                  <span className="text-sm text-stone-600">Ingat saya</span>
                </label>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onShowToast?.("Lupa password? Hubungi wali kelas kamu.", "info");
                  }}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium hover:underline"
                >
                  Lupa password?
                </a>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full py-3.5 rounded-xl text-white font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 active:scale-[0.98] disabled:from-stone-300 disabled:to-stone-300 disabled:shadow-none disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              {/* Link ke login guru/staf */}
              <div className="text-center mt-5">
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="text-sm font-semibold text-stone-400 hover:text-orange-500 transition-colors"
                >
                  Login sebagai guru →
                </button>
              </div>

              {/* Footer */}
              <div className="mt-6 pt-5 border-t border-orange-100 text-center">
                <p className="text-xs text-stone-400 mb-0.5">© 2026 SMP MUSLIMIN CILILIN</p>
                <p className="text-xs text-stone-300">Portal Siswa • v1.0.0</p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
