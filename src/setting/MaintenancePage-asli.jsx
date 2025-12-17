import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const MaintenancePage = ({ message }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    try {
      setIsRefreshing(true);

      // Clear all session data
      localStorage.removeItem("user");
      localStorage.removeItem("userSession");
      localStorage.removeItem("rememberMe");

      console.log("🔄 Refreshing... Redirecting to login");

      // Small delay for UX
      setTimeout(() => {
        // Force redirect to login
        window.location.href = "/";
      }, 500);
    } catch (error) {
      console.error("❌ Refresh error:", error);
      // Force redirect anyway
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 transition-colors duration-200">
      <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 md:p-10 rounded-3xl shadow-2xl max-w-md sm:max-w-lg w-full text-center transition-colors duration-200 border border-blue-100 dark:border-gray-700">
        <div className="text-7xl sm:text-8xl mb-5 sm:mb-6 animate-pulse">
          🔧
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-red-700 dark:text-red-300 mb-4 sm:mb-5">
          Sedang Maintenance
        </h1>

        <p className="text-gray-600 dark:text-gray-300 text-base sm:text-lg md:text-xl mb-6 sm:mb-8 leading-relaxed">
          {message ||
            "Aplikasi Sedang Dalam maintenance. Kami Akan Kembali Segera!"}
        </p>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center justify-center gap-3 px-7 sm:px-8 py-3.5 min-h-[44px] bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-blue-500/50 dark:focus:ring-blue-400/50 focus:ring-offset-2 dark:focus:ring-offset-gray-800 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed">
          <svg
            className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span className="text-base sm:text-lg">
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </span>
        </button>

        <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg mt-4 font-semibold">
          Mohon maaf atas ketidaknyamanannya 🙏
        </p>
      </div>
    </div>
  );
};

export default MaintenancePage;
