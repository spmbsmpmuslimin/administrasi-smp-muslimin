import React from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";

const MaintenancePage = ({ message }) => {
  const navigate = useNavigate();

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
      className="min-h-screen flex items-center justify-center 
                   bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50 
                   dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 
                   p-4 transition-colors duration-200">
      <div
        className="bg-white dark:bg-gray-800 p-6 sm:p-8 md:p-10 
                     rounded-3xl shadow-2xl max-w-md sm:max-w-lg w-full text-center
                     transition-colors duration-200 border border-blue-100 dark:border-gray-700">
        {/* Icon Animasi */}
        <div className="text-7xl sm:text-8xl mb-5 sm:mb-6 animate-pulse">
          🔧
        </div>

        {/* Judul */}
        <h1
          className="text-2xl sm:text-3xl md:text-4xl 
                      font-bold text-gray-800 dark:text-white 
                      mb-4 sm:mb-5">
          Sedang Maintenance
        </h1>

        {/* Pesan */}
        <p
          className="text-gray-600 dark:text-gray-300 
                     text-base sm:text-lg md:text-xl
                     mb-6 sm:mb-8 leading-relaxed">
          {message ||
            "Aplikasi sedang dalam maintenance. Kami akan kembali segera!"}
        </p>
        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          className="inline-flex items-center justify-center gap-3 
                   px-7 sm:px-8 py-3.5 min-h-[44px]
                   bg-blue-600 hover:bg-blue-700 
                   dark:bg-blue-500 dark:hover:bg-blue-600
                   text-white font-bold rounded-xl 
                   transition-all duration-200 
                   shadow-lg hover:shadow-xl 
                   active:scale-[0.98] 
                   focus:outline-none focus:ring-4 focus:ring-blue-500/50 
                   dark:focus:ring-blue-400/50 focus:ring-offset-2
                   dark:focus:ring-offset-gray-800
                   w-full sm:w-auto">
          <RefreshCw size={20} className="animate-spin" />
          <span className="text-base sm:text-lg">Refresh Halaman</span>
        </button>
        {/* Footer */}
        <p
          className="text-gray-500 dark:text-gray-400 
                     text-xs sm:text-sm mt-6 sm:mt-8">
          Mohon maaf atas ketidaknyamanannya 🙏
        </p>
      </div>
    </div>
  );
};

export default MaintenancePage;
