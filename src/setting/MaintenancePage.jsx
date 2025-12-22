import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, RotateCcw, Moon, Sun } from "lucide-react";

const MaintenancePage = ({ message }) => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);

  // Check system preference and localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("darkMode");
    if (savedTheme) {
      setDarkMode(savedTheme === "true");
    } else {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setDarkMode(isDark);
    }
  }, []);

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem("darkMode", darkMode.toString());
  }, [darkMode]);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // ✅ Handle Refresh - Clear session & redirect to login
  const handleRefresh = () => {
    try {
      // Clear all session data
      localStorage.removeItem("user");
      localStorage.removeItem("userSession");
      localStorage.removeItem("rememberMe");

      console.log("🔄 Refreshing... Redirecting to login");

      // Redirect to login
      navigate("/", { replace: true });

      // Force reload untuk clear state
      window.location.reload();
    } catch (error) {
      console.error("❌ Refresh error:", error);
      // Force redirect anyway
      window.location.href = "/";
    }
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${
        darkMode
          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-slate-900"
          : "bg-gradient-to-br from-red-50 via-orange-50 to-red-100"
      }`}>
      {/* Dark Mode Toggle */}
      <button
        onClick={toggleDarkMode}
        className={`fixed top-4 right-4 sm:top-6 sm:right-6 p-2 sm:p-3 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 z-50 ${
          darkMode
            ? "bg-gray-700 text-yellow-400 hover:bg-gray-600 focus:ring-yellow-400"
            : "bg-white text-red-600 hover:bg-gray-50 focus:ring-red-500"
        }`}
        aria-label="Toggle Dark Mode">
        {darkMode ? (
          <Sun className="w-5 h-5 sm:w-6 sm:h-6" />
        ) : (
          <Moon className="w-5 h-5 sm:w-6 sm:h-6" />
        )}
      </button>

      {/* Main Card */}
      <div
        className={`p-6 sm:p-8 md:p-10 lg:p-12 rounded-2xl md:rounded-3xl shadow-2xl max-w-xs sm:max-w-sm md:max-w-lg lg:max-w-2xl xl:max-w-3xl w-full text-center transition-all duration-300 ${
          darkMode
            ? "bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700"
            : "bg-white border border-red-100"
        }`}>
        {/* Icon Header - FIXED: Always horizontal */}
        <div className="flex flex-row items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <Settings
            className={`w-6 h-6 sm:w-10 sm:h-10 md:w-12 md:h-12 animate-spin flex-shrink-0 ${
              darkMode ? "text-red-500" : "text-red-600"
            }`}
            style={{ animationDuration: "3s" }}
          />
          <h1
            className={`text-xl sm:text-3xl md:text-4xl lg:text-5xl font-bold whitespace-nowrap ${
              darkMode ? "text-red-500" : "text-red-600"
            }`}>
            Whoops !!!
          </h1>
          <Settings
            className={`w-6 h-6 sm:w-10 sm:h-10 md:w-12 md:h-12 animate-spin flex-shrink-0 ${
              darkMode ? "text-red-500" : "text-red-600"
            }`}
            style={{ animationDuration: "3s" }}
          />
        </div>

        {/* Main Title */}
        <h2
          className={`text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-4 sm:mb-6 ${
            darkMode ? "text-red-500" : "text-red-600"
          }`}>
          Aplikasi Tidak Dapat Di Akses
        </h2>

        {/* Divider */}
        <div
          className={`w-16 sm:w-20 md:w-24 h-1 mx-auto mb-4 sm:mb-6 rounded-full ${
            darkMode ? "bg-red-500" : "bg-red-600"
          }`}></div>

        {/* Messages */}
        <p
          className={`text-sm sm:text-base md:text-lg mb-3 sm:mb-4 leading-relaxed px-2 ${
            darkMode ? "text-gray-300" : "text-gray-700"
          }`}>
          Mohon maaf atas ketidaknyamanannya 🙏
        </p>

        <p
          className={`text-sm sm:text-base md:text-lg mb-6 sm:mb-8 md:mb-10 leading-relaxed px-2 ${
            darkMode ? "text-gray-400" : "text-gray-600"
          }`}>
          {message ||
            "Silahkan Login Ulang Aplikasi Anda atau Klik Tombol Refresh"}
        </p>

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          className={`inline-flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-8 md:px-10 py-3 sm:py-3.5 md:py-4 min-h-[44px] sm:min-h-[50px] md:min-h-[56px] rounded-lg md:rounded-xl transition-all shadow-lg hover:shadow-2xl hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 font-bold text-sm sm:text-base md:text-lg ${
            darkMode
              ? "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 focus:ring-offset-gray-800"
              : "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 focus:ring-offset-white"
          }`}>
          <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
          <span>Refresh</span>
        </button>

        {/* Footer Icon */}
        <div className="mt-6 sm:mt-8 md:mt-10 text-3xl sm:text-4xl md:text-5xl animate-bounce">
          🔧
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;
