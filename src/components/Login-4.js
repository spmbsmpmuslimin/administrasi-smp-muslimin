import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Sparkles, Zap, Shield, Users } from "lucide-react";
import { supabase } from "../supabaseClient";
import Logo from "./Logo";

export const Login = ({ onLogin, onShowToast }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [activePanel, setActivePanel] = useState("login");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    if (!username.trim()) {
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
        .eq("username", username.trim())
        .eq("is_active", true)
        .maybeSingle();

      if (error || !data) {
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
        kelas: data.kelas,
        email: data.email || `${data.username}@smp.edu`,
        is_active: data.is_active,
        created_at: data.created_at,
      };

      localStorage.setItem("userSession", JSON.stringify(userData));

      if (onShowToast) {
        onShowToast(
          `Welcome back, ${data.full_name.split(" ")[0]}! ✨`,
          "success"
        );
      }

      if (onLogin) {
        onLogin(userData, rememberMe);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Animated Grid Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_1px,transparent_1px),linear-gradient(0deg,transparent_1px,transparent_1px)] bg-[size:40px_40px] bg-[position:-20px_-20px] opacity-10"></div>
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-gradient-to-r from-blue-500/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-gradient-to-r from-purple-500/10 to-transparent rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-2xl shadow-cyan-500/30">
                  <Logo size="small" className="text-white" />
                </div>
                <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 animate-pulse" />
              </div>
              <div className="text-left">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  SMP Digital Hub
                </h1>
                <p className="text-gray-400 text-sm">Administration Portal</p>
              </div>
            </div>

            {/* Panel Toggle */}
            <div className="inline-flex bg-gray-800/50 backdrop-blur-sm rounded-2xl p-1 mb-8">
              <button
                onClick={() => setActivePanel("login")}
                className={`px-6 py-2 rounded-xl font-medium transition-all duration-300 ${
                  activePanel === "login"
                    ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg"
                    : "text-gray-400 hover:text-white"
                }`}>
                Login
              </button>
              <button
                onClick={() => setActivePanel("info")}
                className={`px-6 py-2 rounded-xl font-medium transition-all duration-300 ${
                  activePanel === "info"
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                    : "text-gray-400 hover:text-white"
                }`}>
                System Info
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Panel - Dynamic Content */}
            <div
              className={`transition-all duration-500 ${
                activePanel === "login"
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 -translate-x-10 lg:opacity-100 lg:translate-x-0"
              }`}>
              {activePanel === "login" ? (
                <div className="bg-gray-800/30 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-8 h-full">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">
                        Quick Access
                      </h3>
                      <p className="text-gray-400 text-sm">
                        Login dengan akun terdaftar
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Username
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-4 py-3.5 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all"
                        placeholder="user.name"
                        autoComplete="off"
                      />
                      {errors.username && (
                        <p className="mt-2 text-sm text-red-400">
                          {errors.username}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full px-4 py-3.5 pr-12 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all"
                          placeholder="••••••••"
                          autoComplete="off"
                        />
                        <button
                          type="button"
                          onClick={togglePasswordVisibility}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white p-2">
                          {showPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="mt-2 text-sm text-red-400">
                          {errors.password}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <div className="relative w-5 h-5">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="opacity-0 absolute w-5 h-5 cursor-pointer"
                          />
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                              rememberMe
                                ? "bg-gradient-to-r from-cyan-500 to-blue-500 border-transparent"
                                : "border-gray-600 bg-gray-800/50"
                            }`}>
                            {rememberMe && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="3"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                        <span className="text-sm text-gray-400 select-none">
                          Ingat perangkat ini
                        </span>
                      </label>
                      <button
                        type="button"
                        className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
                        Butuh bantuan?
                      </button>
                    </div>

                    {errors.general && (
                      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                        <p className="text-red-400 text-sm">{errors.general}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/30 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed">
                      {isLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Authenticating...</span>
                        </>
                      ) : (
                        <>
                          <span>Access Dashboard</span>
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M13 7l5 5m0 0l-5 5m5-5H6"
                            />
                          </svg>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-gray-800/30 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-8 h-full">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">
                        System Status
                      </h3>
                      <p className="text-gray-400 text-sm">
                        Platform informasi & keamanan
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-900/30 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                          <Users className="w-4 h-4 text-green-400" />
                        </div>
                        <span className="text-gray-300">Active Users</span>
                      </div>
                      <span className="text-2xl font-bold text-white">247</span>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-900/30 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                          <Zap className="w-4 h-4 text-blue-400" />
                        </div>
                        <span className="text-gray-300">Response Time</span>
                      </div>
                      <span className="text-2xl font-bold text-white">
                        42ms
                      </span>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-gray-900/50 to-transparent border border-gray-700/30 rounded-xl">
                      <h4 className="font-medium text-white mb-2">
                        Security Level
                      </h4>
                      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 w-4/5"></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mt-2">
                        <span>Basic</span>
                        <span>Maximum</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel - Static Content */}
            <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-8">
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-3">
                    Platform Features
                  </h2>
                  <p className="text-gray-400 leading-relaxed">
                    Sistem administrasi terpadu dengan teknologi terkini untuk
                    manajemen sekolah yang efisien dan transparan.
                  </p>
                </div>

                <div className="grid gap-4">
                  <div className="flex items-start gap-4 p-4 bg-gray-900/30 rounded-xl hover:bg-gray-900/50 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500/20 to-cyan-500/20 flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-6 h-6 text-blue-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-1">
                        Real-time Data Sync
                      </h4>
                      <p className="text-sm text-gray-400">
                        Update data secara instan di semua perangkat
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-gray-900/30 rounded-xl hover:bg-gray-900/50 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-6 h-6 text-purple-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-1">
                        End-to-End Encryption
                      </h4>
                      <p className="text-sm text-gray-400">
                        Keamanan data dengan enkripsi tingkat tinggi
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-gray-900/30 rounded-xl hover:bg-gray-900/50 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-emerald-500/20 to-green-500/20 flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-6 h-6 text-emerald-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-1">
                        High Performance
                      </h4>
                      <p className="text-sm text-gray-400">
                        Optimized untuk ribuan pengguna bersamaan
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-700/50">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Version 2.1.4</span>
                    <span className="text-cyan-400 font-medium">• Online</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              © 2025 SMP Digital Platform • All rights reserved
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
