import React, { useState, useEffect } from "react";
import { AlertCircle, Power, Check, Trash2, Users, Search } from "lucide-react";
import { supabase } from "../supabaseClient";

const MaintenanceModeTab = ({ showToast }) => {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [customMessage, setCustomMessage] = useState(
    "Aplikasi sedang dalam maintenance. Kami akan kembali segera!"
  );
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ✅ WHITELIST STATE
  const [allUsers, setAllUsers] = useState([]);
  const [whitelistUsers, setWhitelistUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);

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
        .in("setting_key", [
          "maintenance_mode",
          "maintenance_message",
          "maintenance_whitelist",
        ]);

      if (error) throw error;

      const settings = {};
      data?.forEach((item) => {
        settings[item.setting_key] = item.setting_value;
      });

      setMaintenanceMode(
        settings.maintenance_mode === "true" ||
          settings.maintenance_mode === true
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

  // ✅ Load all users dari database
  const loadAllUsers = async () => {
    try {
      setLoadingUsers(true);
      const { data, error } = await supabase
        .from("users")
        .select("id, username, full_name, role, is_active")
        .eq("is_active", true)
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
      showToast?.(
        newState ? "🔴 Maintenance Mode AKTIF" : "🟢 Aplikasi AKTIF",
        "success"
      );

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

  // ✅ Add user to whitelist
  const handleAddUser = async (user) => {
    // Cek apakah user sudah ada di whitelist
    if (whitelistUsers.some((u) => u.id === user.id)) {
      showToast?.(`${user.full_name} sudah ada di whitelist`, "info");
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
      showToast?.("✓ Whitelist berhasil diperbarui", "success");

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Error saving whitelist:", error);
      showToast?.("Gagal menyimpan whitelist", "error");
    }
  };

  // ✅ Filter users untuk search
  const filteredUsers = allUsers.filter(
    (user) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <AlertCircle className="w-8 h-8 text-amber-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Mode Maintenance</h2>
          <p className="text-sm text-gray-600 mt-1">
            Kelola akses aplikasi dan tampilkan pesan maintenance
          </p>
        </div>
      </div>

      {/* Status Badge */}
      <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
        <p className="text-sm text-gray-600 mb-2">Status Aplikasi:</p>
        <div className="flex items-center gap-2">
          <div
            className={`w-4 h-4 rounded-full ${
              maintenanceMode ? "bg-red-500 animate-pulse" : "bg-green-500"
            }`}></div>
          <span
            className={`font-bold text-lg ${
              maintenanceMode ? "text-red-600" : "text-green-600"
            }`}>
            {maintenanceMode ? "🔴 MAINTENANCE" : "🟢 AKTIF"}
          </span>
          <span className="text-xs text-gray-500 ml-2">
            {maintenanceMode
              ? `${whitelistUsers.length} user bisa akses`
              : "Semua user bisa akses"}
          </span>
        </div>
      </div>

      {/* Toggle Button */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-800">
              Aktifkan Mode Maintenance
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Ketika diaktifkan, hanya user di whitelist + admin yang bisa akses
            </p>
          </div>
          <button
            onClick={handleToggle}
            disabled={isSaving}
            className={`relative w-16 h-9 rounded-full transition-all flex-shrink-0 ${
              maintenanceMode ? "bg-red-500" : "bg-gray-300"
            } ${
              isSaving
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer hover:shadow-lg"
            }`}>
            <div
              className={`absolute top-1.5 left-1.5 w-6 h-6 bg-white rounded-full transition-all flex items-center justify-center shadow-md ${
                maintenanceMode ? "translate-x-7" : ""
              }`}>
              <Power className="w-3 h-3" />
            </div>
          </button>
        </div>
      </div>

      {/* Custom Message - hanya saat maintenance aktif */}
      {maintenanceMode && (
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            📝 Pesan Maintenance
          </label>
          <textarea
            value={customMessage}
            onChange={handleMessageChange}
            rows="4"
            maxLength={500}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none text-sm"
            placeholder="Tulis pesan untuk user yang melihat halaman maintenance..."
          />
          <p className="text-xs text-gray-500 mt-2">
            {customMessage.length}/500 karakter
          </p>
        </div>
      )}

      {/* WHITELIST SECTION - hanya saat maintenance aktif */}
      {maintenanceMode && (
        <div className="space-y-4">
          {/* Add User Section */}
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-gray-800">Whitelist User</h3>
              <span className="ml-auto text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                {whitelistUsers.length} user
              </span>
            </div>

            {/* Search & Add User */}
            <div className="mb-4">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari user (username/nama)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>

              {/* Available Users List */}
              {loadingUsers ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
                </div>
              ) : filteredUsers.length > 0 ? (
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white">
                  {filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleAddUser(user)}
                      disabled={whitelistUsers.some((u) => u.id === user.id)}
                      className={`w-full px-3 py-2 text-left text-sm border-b border-gray-100 hover:bg-purple-50 transition ${
                        whitelistUsers.some((u) => u.id === user.id)
                          ? "opacity-50 cursor-not-allowed bg-purple-100"
                          : "cursor-pointer"
                      }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-800">
                            {user.full_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            @{user.username}
                          </p>
                        </div>
                        {whitelistUsers.some((u) => u.id === user.id) && (
                          <Check className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-gray-500 py-4">
                  Tidak ada user ditemukan
                </p>
              )}
            </div>
          </div>

          {/* Whitelisted Users */}
          {whitelistUsers.length > 0 && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-semibold text-gray-800 mb-3">
                ✓ User yang Diwhitelist
              </h3>
              <div className="space-y-2">
                {whitelistUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200">
                    <div>
                      <p className="font-medium text-gray-800">
                        {user.full_name}
                      </p>
                      <p className="text-xs text-gray-500">@{user.username}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveUser(user.id)}
                      className="p-2 hover:bg-red-100 rounded-lg transition text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      {maintenanceMode && (
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            📺 Preview Halaman Maintenance:
          </p>
          <div className="bg-white p-6 rounded-lg shadow-sm text-center border border-gray-200">
            <div className="text-6xl mb-3">🔧</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Sedang Maintenance
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              {customMessage}
            </p>
            <p className="text-gray-500 text-xs mt-4">
              Mohon maaf atas ketidaknyamanannya 🙏
            </p>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-900">
          <strong>ℹ️ Informasi:</strong> Saat maintenance ON, hanya admin + user
          di whitelist yang bisa akses. User lain akan melihat halaman
          maintenance.
        </p>
      </div>

      {/* Save Indicator */}
      {saved && (
        <div className="fixed bottom-6 right-6 p-4 bg-green-50 border border-green-300 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
          <Check className="w-5 h-5 text-green-600" />
          <span className="text-green-700 font-semibold text-sm">
            ✓ Pengaturan disimpan
          </span>
        </div>
      )}
    </div>
  );
};

export default MaintenanceModeTab;
