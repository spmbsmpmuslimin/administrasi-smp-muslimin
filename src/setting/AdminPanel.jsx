import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const AdminPanel = () => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const { data } = await supabase
      .from("app_config")
      .select("*")
      .eq("id", 1)
      .single();

    if (data) {
      setIsMaintenanceMode(data.is_maintenance);
      setMessage(data.maintenance_message);
    }
    setIsLoading(false);
  };

  const toggleMaintenance = async () => {
    const newStatus = !isMaintenanceMode;

    const { error } = await supabase
      .from("app_config")
      .update({
        is_maintenance: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (!error) {
      setIsMaintenanceMode(newStatus);
      alert(newStatus ? "🔧 MAINTENANCE MODE ON!" : "✅ MAINTENANCE MODE OFF!");
    }
  };

  const updateMessage = async () => {
    const { error } = await supabase
      .from("app_config")
      .update({
        maintenance_message: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (!error) {
      alert("✅ Pesan berhasil diupdate!");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
        <div className="animate-spin rounded-full h-12 w-12 sm:h-14 sm:w-14 border-4 border-blue-200 dark:border-gray-700 border-t-blue-600 dark:border-t-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-3 sm:p-4 md:p-6 transition-colors duration-300">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-5 md:p-8 transition-colors duration-300 border border-blue-100 dark:border-gray-700">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 md:mb-8 text-gray-900 dark:text-white text-center">
          🎛️ Admin Control Panel
        </h1>

        {/* STATUS */}
        <div className="mb-4 sm:mb-6 md:mb-8 p-3 sm:p-4 md:p-5 bg-gradient-to-r from-blue-50 to-white dark:from-gray-700 dark:to-gray-800 rounded-lg sm:rounded-xl border border-blue-200 dark:border-gray-600 transition-colors duration-300">
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-1 sm:mb-2">
            Status Aplikasi:
          </p>
          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full ${
                isMaintenanceMode ? "bg-red-500 animate-pulse" : "bg-green-500"
              }`}></div>
            <p
              className={`text-lg sm:text-xl md:text-2xl font-bold ${
                isMaintenanceMode
                  ? "text-red-600 dark:text-red-400"
                  : "text-green-600 dark:text-green-400"
              }`}>
              {isMaintenanceMode ? "🔴 MAINTENANCE MODE" : "🟢 ONLINE"}
            </p>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2">
            {isMaintenanceMode
              ? "Aplikasi sedang dalam mode maintenance"
              : "Aplikasi berjalan normal"}
          </p>
        </div>

        {/* TOMBOL TOGGLE */}
        <button
          onClick={toggleMaintenance}
          className={`w-full py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl font-bold text-base sm:text-lg md:text-xl transition-all duration-300 active:scale-[0.98] min-h-[44px] sm:min-h-[52px] shadow-lg hover:shadow-xl ${
            isMaintenanceMode
              ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 dark:from-green-600 dark:to-green-700 dark:hover:from-green-700 dark:hover:to-green-800 text-white"
              : "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 dark:from-red-600 dark:to-red-700 dark:hover:from-red-700 dark:hover:to-red-800 text-white"
          }`}>
          {isMaintenanceMode
            ? "✅ AKTIFKAN APLIKASI"
            : "🔧 MATIKAN APLIKASI (MAINTENANCE)"}
        </button>

        {/* EDIT MESSAGE */}
        <div className="mt-4 sm:mt-6 md:mt-8">
          <label className="block text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">
            Pesan Maintenance:
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-3 sm:p-4 border border-blue-300 dark:border-gray-600 rounded-lg sm:rounded-xl mb-3 sm:mb-4 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent
                     transition-colors duration-300 resize-none min-h-[120px] sm:min-h-[140px] text-sm sm:text-base"
            rows="4"
            placeholder="Masukkan pesan maintenance yang akan dilihat oleh user..."
          />
          <button
            onClick={updateMessage}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-700 dark:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 
                     text-white py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl font-semibold text-base sm:text-lg
                     transition-all duration-300 active:scale-[0.98] min-h-[44px] shadow-md hover:shadow-lg">
            💾 Update Pesan
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            Pesan ini akan ditampilkan saat aplikasi dalam mode maintenance
          </p>
        </div>

        {/* INFO */}
        <div
          className="mt-4 sm:mt-6 md:mt-8 p-3 sm:p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 
                      border-l-4 border-yellow-400 dark:border-yellow-500 rounded-r-lg sm:rounded-r-xl">
          <div className="flex items-start gap-2">
            <span className="text-yellow-600 dark:text-yellow-400 text-base sm:text-lg">
              ⚠️
            </span>
            <div>
              <p className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-200 font-semibold mb-1">
                Perhatian:
              </p>
              <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300">
                Perubahan akan langsung terlihat oleh semua user secara
                real-time! Gunakan dengan hati-hati.
              </p>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="mt-4 sm:mt-6 md:mt-8 pt-3 sm:pt-4 border-t border-blue-100 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-white dark:from-gray-700/30 dark:to-gray-800/30 rounded-lg p-2 sm:p-3 text-center border border-blue-200 dark:border-gray-600">
              <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
              <p
                className={`text-sm sm:text-base font-bold ${
                  isMaintenanceMode
                    ? "text-red-600 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
                }`}>
                {isMaintenanceMode ? "MAINTENANCE" : "ONLINE"}
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-white dark:from-gray-700/30 dark:to-gray-800/30 rounded-lg p-2 sm:p-3 text-center border border-blue-200 dark:border-gray-600">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Karakter
              </p>
              <p className="text-sm sm:text-base font-bold text-blue-600 dark:text-blue-400">
                {message.length} / 500
              </p>
            </div>
          </div>
        </div>

        {/* MOBILE FOOTER SPACER */}
        <div className="h-6 sm:h-8 md:h-12"></div>
      </div>
    </div>
  );
};

export default AdminPanel;
