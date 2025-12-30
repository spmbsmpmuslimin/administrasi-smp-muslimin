import React, { useState, useEffect } from "react";
import { AlertCircle, Power, Check, Trash2, Users, UserPlus } from "lucide-react";
import { supabase } from "../supabaseClient";

const MaintenanceModeTab = ({ showToast }) => {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [customMessage, setCustomMessage] = useState(
    "Aplikasi sedang dalam maintenance. Kami akan kembali nanti !"
  );
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ✅ WHITELIST STATE
  const [allUsers, setAllUsers] = useState([]);
  const [whitelistUsers, setWhitelistUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showWhitelistDetails, setShowWhitelistDetails] = useState(false);

  // ✅ Load maintenance settings
  useEffect(() => {
    loadMaintenanceSettings();
  }, []);

  // ✅ Load all users
  useEffect(() => {
    loadAllUsers();
  }, []);

  const loadMaintenanceSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("school_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["maintenance_mode", "maintenance_message", "maintenance_whitelist"]);

      if (error) throw error;

      const settings = {};
      data?.forEach((item) => {
        settings[item.setting_key] = item.setting_value;
      });

      setMaintenanceMode(
        settings.maintenance_mode === "true" || settings.maintenance_mode === true
      );
      setCustomMessage(
        settings.maintenance_message ||
          "Aplikasi sedang dalam maintenance. Kami akan kembali segera!"
      );

      // Parse whitelist
      if (settings.maintenance_whitelist) {
        try {
          const parsed = JSON.parse(settings.maintenance_whitelist);
          setWhitelistUsers(Array.isArray(parsed) ? parsed : []);
        } catch (e) {
          setWhitelistUsers([]);
        }
      }
    } catch (error) {
      console.error("Error loading maintenance settings:", error);
      showToast?.("Gagal memuat pengaturan maintenance", "error");
    } finally {
      setLoading(false);
    }
  };

  // 🔥 FIX: Load users TANPA admin
  const loadAllUsers = async () => {
    try {
      setLoadingUsers(true);
      const { data, error } = await supabase
        .from("users")
        .select("id, username, full_name, role, is_active")
        .eq("is_active", true)
        .neq("role", "admin") // 🔥 Filter admin
        .order("full_name", { ascending: true });

      if (error) throw error;

      setAllUsers(data || []);
    } catch (error) {
      console.error("Error loading users:", error);
      showToast?.("Gagal memuat daftar user", "error");
    } finally {
      setLoadingUsers(false);
    }
  };

  // ✅ Toggle maintenance mode
  const handleToggle = async () => {
    setIsSaving(true);
    try {
      const newState = !maintenanceMode;

      const { error } = await supabase.from("school_settings").upsert(
        {
          setting_key: "maintenance_mode",
          setting_value: newState ? "true" : "false",
        },
        {
          onConflict: "setting_key",
        }
      );

      if (error) throw error;

      setMaintenanceMode(newState);
      showToast?.(newState ? "🔴 Maintenance Mode AKTIF" : "🟢 Aplikasi AKTIF", "success");

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Error toggling maintenance mode:", error);
      showToast?.("Gagal mengubah mode maintenance", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ Update custom message
  const handleMessageChange = async (e) => {
    const msg = e.target.value;
    setCustomMessage(msg);

    try {
      const { error } = await supabase.from("school_settings").upsert(
        {
          setting_key: "maintenance_message",
          setting_value: msg,
        },
        {
          onConflict: "setting_key",
        }
      );

      if (error) throw error;

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Error updating message:", error);
      showToast?.("Gagal menyimpan pesan", "error");
    }
  };

  // ✅ Add user to whitelist dari dropdown
  const handleAddUserFromDropdown = async () => {
    if (!selectedUserId) {
      showToast?.("Pilih user terlebih dahulu", "warning");
      return;
    }

    const user = allUsers.find((u) => u.id === selectedUserId);
    if (!user) return;

    // Cek apakah user sudah ada di whitelist
    if (whitelistUsers.some((u) => u.id === user.id)) {
      showToast?.(`${user.full_name} sudah ada di whitelist`, "info");
      setSelectedUserId("");
      return;
    }

    const newWhitelist = [
      ...whitelistUsers,
      {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
      },
    ];

    await saveWhitelist(newWhitelist);
    setSelectedUserId("");
  };

  // ✅ Remove user from whitelist
  const handleRemoveUser = async (userId) => {
    const newWhitelist = whitelistUsers.filter((u) => u.id !== userId);
    await saveWhitelist(newWhitelist);
  };

  // ✅ Save whitelist ke database
  const saveWhitelist = async (whitelist) => {
    try {
      const { error } = await supabase.from("school_settings").upsert(
        {
          setting_key: "maintenance_whitelist",
          setting_value: JSON.stringify(whitelist),
        },
        {
          onConflict: "setting_key",
        }
      );

      if (error) throw error;

      setWhitelistUsers(whitelist);
      showToast?.("✅ Whitelist berhasil diperbarui", "success");

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Error saving whitelist:", error);
      showToast?.("Gagal menyimpan whitelist", "error");
    }
  };

  // ✅ Filter users yang belum ada di whitelist untuk dropdown
  const availableUsers = allUsers.filter((user) => !whitelistUsers.some((u) => u.id === user.id));

  if (loading) {
    return (
      <div className="p-4 sm:p-6 flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-start sm:items-center gap-3 mb-4 sm:mb-6">
        <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1 sm:mt-0" />
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
            Mode Maintenance
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            Kelola akses aplikasi dan tampilkan pesan maintenance
          </p>
        </div>
      </div>

      {/* Status Badge */}
      <div className="p-3 sm:p-4 rounded-lg bg-blue-50 dark:bg-gray-800 border border-blue-100 dark:border-gray-700">
        <p className="text-xs sm:text-sm text-blue-700 dark:text-gray-400 mb-2">Status Aplikasi:</p>
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0 ${
              maintenanceMode
                ? "bg-blue-600 dark:bg-red-600 animate-pulse"
                : "bg-green-500 dark:bg-green-600"
            }`}
          ></div>
          <span
            className={`font-bold text-base sm:text-lg ${
              maintenanceMode
                ? "text-blue-700 dark:text-red-400"
                : "text-green-600 dark:text-green-400"
            }`}
          >
            {maintenanceMode ? "🔴 MAINTENANCE" : "🟢 AKTIF"}
          </span>
          <span className="text-xs text-blue-600 dark:text-gray-400 ml-2">
            {maintenanceMode ? `${whitelistUsers.length} user bisa akses` : "Semua user bisa akses"}
          </span>
        </div>
      </div>

      {/* Toggle Button */}
      <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex-1">
            <p className="font-semibold text-blue-800 dark:text-gray-100 text-sm sm:text-base">
              Aktifkan Mode Maintenance
            </p>
            <p className="text-xs sm:text-sm text-blue-600 dark:text-gray-400 mt-1">
              Ketika diaktifkan, hanya user di whitelist + admin yang bisa akses
            </p>
          </div>
          <button
            onClick={handleToggle}
            disabled={isSaving}
            className={`relative w-14 h-8 sm:w-16 sm:h-9 rounded-full transition-all flex-shrink-0 ${
              maintenanceMode ? "bg-blue-600 dark:bg-red-600" : "bg-gray-300 dark:bg-gray-700"
            } ${isSaving ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:shadow-lg"}`}
            aria-label={maintenanceMode ? "Nonaktifkan" : "Aktifkan"}
          >
            <div
              className={`absolute top-1 left-1 sm:top-1.5 sm:left-1.5 w-5 h-5 sm:w-6 sm:h-6 bg-white dark:bg-gray-200 rounded-full transition-all flex items-center justify-center shadow-md ${
                maintenanceMode ? "translate-x-5 sm:translate-x-7" : ""
              }`}
            >
              <Power className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </div>
          </button>
        </div>
      </div>

      {/* Custom Message - hanya saat maintenance aktif */}
      {maintenanceMode && (
        <div className="p-3 sm:p-4 bg-blue-50 dark:bg-amber-900/10 rounded-lg border border-blue-200 dark:border-amber-800">
          <label className="block text-sm font-semibold text-blue-800 dark:text-gray-300 mb-2">
            📝 Pesan Maintenance
          </label>
          <textarea
            value={customMessage}
            onChange={handleMessageChange}
            rows="4"
            maxLength={500}
            className="w-full p-3 border border-blue-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-amber-600 resize-none text-sm min-h-[120px]"
            placeholder="Tulis pesan untuk user yang melihat halaman maintenance..."
          />
          <p className="text-xs text-blue-600 dark:text-gray-400 mt-2">
            {customMessage.length}/500 karakter
          </p>
        </div>
      )}

      {/* WHITELIST SECTION - hanya saat maintenance aktif */}
      {maintenanceMode && (
        <div className="space-y-3 sm:space-y-4">
          {/* Add User Section dengan DROPDOWN */}
          <div className="p-3 sm:p-4 bg-blue-50 dark:bg-purple-900/10 rounded-lg border border-blue-200 dark:border-purple-800">
            <div className="flex flex-wrap items-center gap-2 mb-3 sm:mb-4">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-purple-500 flex-shrink-0" />
              <h3 className="font-semibold text-blue-800 dark:text-gray-100 text-sm sm:text-base">
                Whitelist User
              </h3>
              <span className="ml-auto text-xs bg-blue-100 dark:bg-purple-900/40 text-blue-700 dark:text-purple-300 px-2 py-1 rounded-full">
                {whitelistUsers.length} user
              </span>
            </div>

            {/* 🔥 Dropdown + Button - RESPONSIVE VERSION */}
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={loadingUsers}
                className="flex-1 px-3 py-2 border border-blue-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-600 text-sm min-h-[44px] disabled:bg-blue-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
              >
                <option value="">{loadingUsers ? "Loading..." : "-- Pilih User --"}</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddUserFromDropdown}
                disabled={!selectedUserId || loadingUsers}
                className="px-4 py-2 bg-blue-600 dark:bg-purple-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-purple-600 transition disabled:bg-blue-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium min-h-[44px]"
              >
                <UserPlus className="w-4 h-4" />
                <span>Tambah</span>
              </button>
            </div>

            {availableUsers.length === 0 && !loadingUsers && (
              <p className="text-xs text-blue-600 dark:text-gray-400 mt-2 text-center">
                Semua user sudah ada di whitelist
              </p>
            )}
          </div>

          {/* Whitelisted Users - COLLAPSIBLE */}
          {whitelistUsers.length > 0 && (
            <div className="p-3 sm:p-4 bg-blue-50/70 dark:bg-green-900/10 rounded-lg border border-blue-200 dark:border-green-800">
              <button
                onClick={() => setShowWhitelistDetails(!showWhitelistDetails)}
                className="w-full flex items-center justify-between hover:bg-blue-100 dark:hover:bg-green-900/20 p-2 rounded-lg transition min-h-[44px]"
              >
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-blue-800 dark:text-gray-100 text-sm sm:text-base">
                    ✅ User yang Diwhitelist
                  </h3>
                  <span className="text-xs bg-blue-100 dark:bg-green-900/40 text-blue-700 dark:text-green-300 px-2 py-1 rounded-full">
                    {whitelistUsers.length} user
                  </span>
                </div>
                <span className="text-blue-600 dark:text-gray-400 text-xs">
                  {showWhitelistDetails ? "▲ Sembunyikan" : "▼ Tampilkan"}
                </span>
              </button>

              {/* Detail List - Show/Hide */}
              {showWhitelistDetails && (
                <div className="space-y-2 mt-3">
                  {whitelistUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-green-700"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-blue-800 dark:text-gray-100 truncate text-sm sm:text-base">
                          {user.full_name}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-gray-400 truncate">
                          @{user.username}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveUser(user.id)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition text-red-600 dark:text-red-400 ml-2 flex-shrink-0"
                        aria-label={`Hapus ${user.full_name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      {maintenanceMode && (
        <div className="p-3 sm:p-4 bg-blue-50 dark:bg-purple-900/10 rounded-lg border border-blue-200 dark:border-purple-800">
          <p className="text-sm font-semibold text-blue-800 dark:text-gray-300 mb-3">
            🖼️ Preview Halaman Maintenance:
          </p>
          <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm text-center border border-blue-200 dark:border-gray-700">
            <div className="text-4xl sm:text-6xl mb-2 sm:mb-3">🔧</div>
            <h3 className="text-lg sm:text-xl font-bold text-blue-800 dark:text-gray-100 mb-1 sm:mb-2">
              Sedang Maintenance
            </h3>
            <p className="text-blue-700 dark:text-gray-300 text-xs sm:text-sm leading-relaxed px-2">
              {customMessage}
            </p>
            <p className="text-blue-600 dark:text-gray-400 text-xs mt-3 sm:mt-4">
              Mohon maaf atas ketidaknyamanannya 🙏
            </p>
          </div>
        </div>
      )}

      {/* Save Indicator */}
      {saved && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg shadow-lg flex items-center gap-2 animate-pulse z-50">
          <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
          <span className="text-green-700 dark:text-green-300 font-semibold text-xs sm:text-sm">
            ✅ Pengaturan disimpan
          </span>
        </div>
      )}
    </div>
  );
};

export default MaintenanceModeTab;
