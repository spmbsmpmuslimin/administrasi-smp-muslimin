import React from "react";
import { useNavigate } from "react-router-dom";
import { FileX } from "lucide-react";

const MaintenancePage = ({ message, darkMode }) => {
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
      className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${
        darkMode ? "bg-theme-bg" : "bg-theme-surface"
      }`}
    >
      {/* Main Container */}
      <div className="max-w-2xl w-full px-4">
        {/* Error Icon */}
        <div className="mb-8">
          <FileX
            className={`w-16 h-16 ${darkMode ? "text-theme-secondary" : "text-gray-400"}`}
            strokeWidth={1.5}
          />
        </div>

        {/* Main Heading */}
        <h1 className={`text-2xl font-normal mb-4 ${darkMode ? "text-gray-100" : "text-theme"}`}>
          This site can't be reached
        </h1>

        {/* URL Display */}
        <p className={`text-sm mb-2 ${darkMode ? "text-gray-400" : "text-theme-secondary"}`}>
          <span className={`font-medium ${darkMode ? "text-gray-200" : "text-theme"}`}>
            https://administrasi-smp-muslimin.vercel.app/dashboard
          </span>{" "}
          can't be reached
        </p>

        {/* Error Code */}
        <p className={`text-xs tracking-wide mb-8 ${darkMode ? "text-theme-secondary" : "text-theme-secondary"}`}>
          ERR_CONNECTION_TIME_OUT
        </p>

        {/* Reload Button */}
        <button
          onClick={handleRefresh}
          className={`px-6 py-3 rounded font-medium text-sm transition-colors ${
            darkMode
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          Reload
        </button>
      </div>
    </div>
  );
};

export default MaintenancePage;
