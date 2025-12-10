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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 md:p-8 transition-colors duration-200">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 md:p-8 transition-colors duration-200">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 md:mb-8 text-gray-900 dark:text-white">
          🎛️ Admin Control Panel
        </h1>

        {/* STATUS */}
        <div className="mb-6 md:mb-8 p-4 sm:p-6 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors duration-200">
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-2">
            Status Aplikasi:
          </p>
          <p
            className={`text-xl sm:text-2xl font-bold ${
              isMaintenanceMode
                ? "text-red-500 dark:text-red-400"
                : "text-green-500 dark:text-green-400"
            }`}>
            {isMaintenanceMode ? "🔴 MAINTENANCE MODE" : "🟢 ONLINE"}
          </p>
        </div>

        {/* TOMBOL TOGGLE */}
        <button
          onClick={toggleMaintenance}
          className={`w-full py-3 sm:py-4 px-4 sm:px-6 rounded-lg font-bold text-lg sm:text-xl transition-all duration-200 active:scale-[0.98] min-h-[44px] sm:min-h-[52px] ${
            isMaintenanceMode
              ? "bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white"
              : "bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white"
          }`}>
          {isMaintenanceMode
            ? "✅ AKTIFKAN APLIKASI"
            : "🔧 MATIKAN APLIKASI (MAINTENANCE)"}
        </button>

        {/* EDIT MESSAGE */}
        <div className="mt-6 md:mt-8">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Pesan Maintenance:
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-3 sm:p-4 border border-gray-300 dark:border-gray-600 rounded-lg mb-3 sm:mb-4 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent
                     transition-colors duration-200 resize-none"
            rows="4"
            placeholder="Masukkan pesan maintenance..."
          />
          <button
            onClick={updateMessage}
            className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 
                     text-white py-3 px-4 sm:px-6 rounded-lg font-semibold text-base sm:text-lg
                     transition-colors duration-200 active:scale-[0.98] min-h-[44px]">
            💾 Update Pesan
          </button>
        </div>

        {/* INFO */}
        <div
          className="mt-6 md:mt-8 p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-900/30 
                      border-l-4 border-yellow-400 dark:border-yellow-500 rounded-r">
          <p className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ <strong>Perhatian:</strong> Perubahan akan langsung terlihat oleh
            semua user secara real-time!
          </p>
        </div>

        {/* MOBILE FOOTER SPACER */}
        <div className="h-8 sm:h-0 md:h-0"></div>
      </div>
    </div>
  );
};

export default AdminPanel;
