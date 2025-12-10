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
                   bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 
                   dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 
                   p-4 transition-colors duration-200">
      <div
        className="bg-white dark:bg-gray-800 p-5 sm:p-8 md:p-10 
                     rounded-3xl shadow-2xl max-w-xl w-full text-center
                     transition-colors duration-200">
        {/* Icon Animasi */}
        <div className="text-6xl sm:text-7xl md:text-8xl mb-4 sm:mb-6 animate-bounce">
          🔧
        </div>

        {/* Judul */}
        <h1
          className="text-xl sm:text-2xl md:text-3xl lg:text-4xl 
                      font-bold text-gray-800 dark:text-white 
                      mb-3 sm:mb-4">
          Sedang Maintenance
        </h1>

        {/* Pesan */}
        <p
          className="text-gray-600 dark:text-gray-300 
                     text-sm sm:text-base md:text-lg 
                     mb-6 sm:mb-8 leading-relaxed">
          {message ||
            "Aplikasi sedang dalam maintenance. Kami akan kembali segera!"}
        </p>

        {/* Refresh Button - Single & Clean */}
        <button
          onClick={handleRefresh}
          className="inline-flex items-center justify-center gap-2 
                   px-6 sm:px-8 py-3 min-h-[44px]
                   bg-blue-600 hover:bg-blue-700 
                   dark:bg-blue-500 dark:hover:bg-blue-600
                   text-white font-semibold rounded-xl 
                   transition-all duration-200 
                   shadow-lg hover:shadow-xl 
                   active:scale-[0.98] 
                   focus:outline-none focus:ring-2 focus:ring-blue-500 
                   dark:focus:ring-blue-400 focus:ring-offset-2
                   dark:focus:ring-offset-gray-800">
          <RefreshCw size={18} className="sm:size-20" />
          <span className="text-sm sm:text-base">Refresh Halaman</span>
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
