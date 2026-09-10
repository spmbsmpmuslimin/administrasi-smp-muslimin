import React from "react";
import { Wrench } from "lucide-react";

const MaintenancePage = ({ message, darkMode }) => {
  const handleRefresh = () => {
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("userSession");
      localStorage.removeItem("rememberMe");

      window.location.replace("/");
    } catch (error) {
      window.location.href = "/";
    }
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${
        darkMode ? "bg-theme-bg" : "bg-theme-surface"
      }`}
    >
      <style>{`
        @keyframes maint-sweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
        .maint-progress-fill {
          animation: maint-sweep 1.8s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .maint-progress-fill { animation: none; }
          .maint-icon-spin { animation: none !important; }
        }
      `}</style>

      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center ${
              darkMode ? "bg-theme-surface" : "bg-amber-50"
            }`}
          >
            <Wrench
              className="maint-icon-spin w-7 h-7 text-amber-500"
              strokeWidth={1.75}
              style={{ animation: "spin 3.5s linear infinite" }}
            />
          </div>
        </div>

        {/* Heading */}
        <h1 className={`text-xl font-semibold mb-3 ${darkMode ? "text-gray-100" : "text-theme"}`}>
          Sedang Dalam Pemeliharaan
        </h1>

        {/* Message */}
        <p
          className={`text-sm leading-relaxed mb-8 ${darkMode ? "text-gray-400" : "text-theme-secondary"}`}
        >
          {message ||
            "Sistem Administrasi SMP Muslimin sedang kami perbarui agar berjalan lebih baik. Halaman ini akan kembali normal dalam waktu yang belum bisa ditentukan."}
        </p>

        {/* Progress indicator */}
        <div
          className={`h-1.5 w-full rounded-full overflow-hidden mb-8 ${
            darkMode ? "bg-theme-surface" : "bg-gray-200"
          }`}
        >
          <div className="maint-progress-fill h-full w-1/3 rounded-full bg-amber-500" />
        </div>

        {/* Action */}
        <button
          onClick={handleRefresh}
          className="px-6 py-3 rounded font-medium text-sm bg-amber-500 hover:bg-amber-600 text-white transition-colors"
        >
          Reload
        </button>
      </div>
    </div>
  );
};

export default MaintenancePage;
