import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function ActiveUsersTab({ showToast }) {
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [filter, setFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filter, roleFilter, allUsers]);

  const fetchUsers = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .in("role", ["teacher", "guru_bk"])
        .order("last_login", { ascending: false, nullsFirst: false });

      if (error) throw error;

      setAllUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      if (showToast) showToast("Gagal memuat data user", "error");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allUsers];
    const now = new Date();

    // Filter by activity
    if (filter === "today") {
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      filtered = filtered.filter((u) => u.last_login && new Date(u.last_login) >= todayStart);
    } else if (filter === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((u) => u.last_login && new Date(u.last_login) >= weekAgo);
    } else if (filter === "inactive") {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((u) => !u.last_login || new Date(u.last_login) < sevenDaysAgo);
    }

    // Filter by role
    if (roleFilter === "homeroom") {
      filtered = filtered.filter((u) => u.homeroom_class_id);
    } else if (roleFilter === "mapel") {
      filtered = filtered.filter((u) => !u.homeroom_class_id);
    }

    setUsers(filtered);
  };

  const getStatusColor = (lastLogin) => {
    if (!lastLogin) return "🔴";

    const now = new Date();
    const loginDate = new Date(lastLogin);
    const diffHours = (now - loginDate) / (1000 * 60 * 60);

    if (diffHours < 1) return "🟢";
    if (diffHours < 24) return "🟡";
    if (diffHours < 168) return "🟠";
    return "🔴";
  };

  const getTimeAgo = (date) => {
    if (!date) return "Belum pernah login";

    const now = new Date();
    const past = new Date(date);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Baru saja";
    if (diffMins < 60) return `${diffMins} menit yang lalu`;
    if (diffHours < 24) return `${diffHours} jam yang lalu`;
    if (diffDays === 1) return "Kemarin";
    return `${diffDays} hari yang lalu`;
  };

  const stats = {
    total: allUsers.length,
    today: allUsers.filter((u) => {
      if (!u.last_login) return false;
      const today = new Date().setHours(0, 0, 0, 0);
      return new Date(u.last_login) >= today;
    }).length,
    week: allUsers.filter((u) => {
      if (!u.last_login) return false;
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return new Date(u.last_login) >= weekAgo;
    }).length,
    inactive: allUsers.filter((u) => {
      if (!u.last_login) return true;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return new Date(u.last_login) < sevenDaysAgo;
    }).length,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
          👥 User Activity Monitoring
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Pantau aktivitas login dan engagement guru-guru
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-gray-700 rounded-lg shadow-sm p-3 sm:p-4 border border-gray-200 dark:border-gray-600">
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Total Guru</div>
          <div className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
            {stats.total}
          </div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg shadow-sm p-3 sm:p-4 border border-green-200 dark:border-green-800">
          <div className="text-xs sm:text-sm text-green-700 dark:text-green-400 mb-1">
            🟢 Hari Ini
          </div>
          <div className="text-xl sm:text-2xl font-bold text-green-800 dark:text-green-300">
            {stats.today}
          </div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg shadow-sm p-3 sm:p-4 border border-yellow-200 dark:border-yellow-800">
          <div className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-400 mb-1">
            🟡 Minggu Ini
          </div>
          <div className="text-xl sm:text-2xl font-bold text-yellow-800 dark:text-yellow-300">
            {stats.week}
          </div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow-sm p-3 sm:p-4 border border-red-200 dark:border-red-800">
          <div className="text-xs sm:text-sm text-red-700 dark:text-red-400 mb-1">
            🔴 Tidak Aktif
          </div>
          <div className="text-xl sm:text-2xl font-bold text-red-800 dark:text-red-300">
            {stats.inactive}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-700 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-600">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter Aktivitas
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">Semua Guru</option>
              <option value="today">🟢 Login Hari Ini</option>
              <option value="week">🟡 Login Minggu Ini</option>
              <option value="inactive">🔴 Tidak Aktif (&gt;7 hari)</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter Role
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">Semua Role</option>
              <option value="homeroom">👑 Wali Kelas</option>
              <option value="mapel">📚 Guru Mapel</option>
            </select>
          </div>
        </div>
      </div>

      {/* User List */}
      <div className="space-y-3">
        {users.length === 0 ? (
          <div className="bg-white dark:bg-gray-700 rounded-lg shadow-sm p-12 text-center border border-gray-200 dark:border-gray-600">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-gray-500 dark:text-gray-400">
              Tidak ada data dengan filter yang dipilih
            </p>
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="bg-white dark:bg-gray-700 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="text-2xl flex-shrink-0">{getStatusColor(user.last_login)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 dark:text-gray-200 text-base mb-1">
                      {user.full_name || user.username}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1">📧 {user.username}</span>
                      <span className="text-gray-400 dark:text-gray-600">•</span>
                      <span className="flex items-center gap-1">
                        {user.homeroom_class_id ? (
                          <>
                            👑 <span>Wali Kelas {user.homeroom_class_id}</span>
                          </>
                        ) : (
                          <>
                            📚 <span>Guru Mapel</span>
                          </>
                        )}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-500 mt-2 flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1">
                        🕐 {getTimeAgo(user.last_login)}
                      </span>
                      {user.last_login && (
                        <>
                          <span className="text-gray-400 dark:text-gray-600">•</span>
                          <span className="flex items-center gap-1 text-xs">
                            {new Date(user.last_login).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                      📊 Total Login:{" "}
                      <span className="font-semibold">{user.login_count || 0}x</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Info */}
      {users.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2 text-sm text-blue-700 dark:text-blue-300">
            <span className="text-lg">💡</span>
            <div>
              <p className="font-semibold mb-1">Legend Status:</p>
              <div className="space-y-1 text-xs">
                <p>🟢 Login &lt; 1 jam yang lalu (Online)</p>
                <p>🟡 Login hari ini (&lt; 24 jam)</p>
                <p>🟠 Login minggu ini (&lt; 7 hari)</p>
                <p>🔴 Login &gt; 7 hari yang lalu atau belum pernah login (Inactive)</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
