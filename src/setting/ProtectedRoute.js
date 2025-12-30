import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

// ✅ Halaman Maintenance
const MaintenancePage = ({ message }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="bg-white dark:bg-gray-800 p-10 rounded-3xl shadow-2xl max-w-xl text-center border border-gray-100 dark:border-gray-700">
        <div className="text-8xl mb-6 animate-bounce">🔧</div>
        <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-4">
          Sedang Maintenance
        </h1>
        <p className="text-gray-600 dark:text-gray-300 text-lg mb-6 leading-relaxed">
          {message || "Aplikasi sedang dalam maintenance. Kami akan kembali segera!"}
        </p>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-6">
          Mohon maaf atas ketidaknyamanannya 🙏
        </p>
      </div>
    </div>
  );
};

// ✅ Protected Route Component
const ProtectedRoute = ({ children, user, isLoading }) => {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [whitelistUsers, setWhitelistUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔥 FIX: useRef untuk track apakah maintenance check sudah dilakukan
  const hasCheckedMaintenance = React.useRef(false);

  // ✅ Check maintenance mode dari Supabase
  useEffect(() => {
    const checkMaintenance = async () => {
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

        const isMaintenance =
          settings.maintenance_mode === "true" || settings.maintenance_mode === true;

        // 🔥 Cuma update kalau berubah
        setMaintenanceMode((prev) => {
          if (prev !== isMaintenance) {
            console.log("🔄 Maintenance mode:", isMaintenance);
            return isMaintenance;
          }
          return prev;
        });

        setMaintenanceMessage(
          settings.maintenance_message ||
            "Aplikasi sedang dalam maintenance. Kami akan kembali segera!"
        );

        // Parse whitelist
        if (settings.maintenance_whitelist) {
          try {
            const parsed = JSON.parse(settings.maintenance_whitelist);
            setWhitelistUsers((prev) => {
              const newList = Array.isArray(parsed) ? parsed : [];
              if (JSON.stringify(prev) !== JSON.stringify(newList)) {
                console.log("✅ Whitelist updated");
                return newList;
              }
              return prev;
            });
          } catch (e) {
            setWhitelistUsers([]);
          }
        }

        hasCheckedMaintenance.current = true;
      } catch (error) {
        console.error("Error checking maintenance mode:", error);
      } finally {
        setLoading(false);
      }
    };

    // Initial check
    checkMaintenance();

    // 🔥 FIX: Realtime subscription cuma untuk maintenance mode
    const subscription = supabase
      .channel("maintenance-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "school_settings",
          filter: "setting_key=in.(maintenance_mode,maintenance_message,maintenance_whitelist)",
        },
        (payload) => {
          console.log("📡 Maintenance setting changed");
          checkMaintenance();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []); // 🔥 Empty dependency - cuma jalan sekali

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  // 🔥 FIX: Cek whitelist
  const isWhitelisted = whitelistUsers.some((u) => u.id === user?.id);

  // ✅ Jika maintenance ON dan user bukan admin/whitelist, tampilkan maintenance page
  if (maintenanceMode && user?.role !== "admin" && !isWhitelisted) {
    console.log(`🔴 User ${user?.username} blocked by maintenance`);
    return <MaintenancePage message={maintenanceMessage} />;
  }

  if (maintenanceMode && (user?.role === "admin" || isWhitelisted)) {
    console.log(`✅ User ${user?.username} bypassed maintenance`);
  }

  // ✅ Tampilkan halaman normal
  return children;
};

export default ProtectedRoute;
