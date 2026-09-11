import { useState, useEffect } from "react";
import { UserCheck, Smartphone, GraduationCap, Users } from "lucide-react";
import { supabase } from "../supabaseClient";
import ConnectedDevicesAdminTab from "./ConnectedDevicesAdminTab";
import StudentConnectedDevicesAdminTab from "./StudentConnectedDevicesAdminTab";

export default function ActiveUsersTab({ showToast }) {
  // Sub-tab: "active-user" (default, isi lama) atau "perangkat-terhubung" (baru)
  const [subTab, setSubTab] = useState("active-user");

  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [filter, setFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Sub-tab baru: Active Siswa (student_auth join students)
  const [siswaList, setSiswaList] = useState([]);
  const [allSiswaList, setAllSiswaList] = useState([]);
  const [siswaFilter, setSiswaFilter] = useState("all");
  const [siswaClassFilter, setSiswaClassFilter] = useState("all");
  const [siswaSearch, setSiswaSearch] = useState("");
  const [siswaLoading, setSiswaLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
    fetchSiswa();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filter, roleFilter, allUsers]);

  useEffect(() => {
    applySiswaFilters();
  }, [siswaFilter, siswaClassFilter, siswaSearch, allSiswaList]);

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

  const fetchSiswa = async () => {
    setSiswaLoading(true);

    try {
      // student_auth.student_id -> students.id
      // Filter is_active=true di kedua sisi: kalau siswa udah pindah/keluar,
      // biasanya is_active di-set false di student_auth DAN students, tapi
      // kita jaga-jaga filter dua-duanya biar konsisten walau salah satu
      // kelewat ke-update.
      const { data, error } = await supabase
        .from("student_auth")
        .select(
          "id, username, is_active, last_login, students:student_id(full_name, nis, nisn, class_id, academic_year, is_active)"
        )
        .eq("is_active", true)
        .order("last_login", { ascending: false, nullsFirst: false });

      if (error) throw error;

      // Buang juga kalau data siswa di tabel students-nya udah nonaktif
      const activeOnly = (data || []).filter((s) => s.students?.is_active !== false);

      setAllSiswaList(activeOnly);
    } catch (error) {
      console.error("Error fetching siswa:", error);
      if (showToast) showToast("Gagal memuat data siswa", "error");
    } finally {
      setSiswaLoading(false);
    }
  };

  const applySiswaFilters = () => {
    let filtered = [...allSiswaList];
    const now = new Date();

    // Filter by activity
    if (siswaFilter === "today") {
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      filtered = filtered.filter((s) => s.last_login && new Date(s.last_login) >= todayStart);
    } else if (siswaFilter === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((s) => s.last_login && new Date(s.last_login) >= weekAgo);
    } else if (siswaFilter === "inactive") {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((s) => !s.last_login || new Date(s.last_login) < sevenDaysAgo);
    }

    // Filter by kelas (dropdown)
    if (siswaClassFilter !== "all") {
      filtered = filtered.filter((s) => s.students?.class_id === siswaClassFilter);
    }

    // Search by nama / kelas / username
    const q = siswaSearch.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(
        (s) =>
          s.students?.full_name?.toLowerCase().includes(q) ||
          s.students?.class_id?.toLowerCase().includes(q) ||
          s.username?.toLowerCase().includes(q)
      );
    }

    setSiswaList(filtered);
  };

  // Daftar kelas unik dari data siswa aktif, buat isi dropdown filter kelas
  const uniqueClasses = [
    ...new Set(allSiswaList.map((s) => s.students?.class_id).filter(Boolean)),
  ].sort();

  const siswaStats = {
    total: allSiswaList.length,
    today: allSiswaList.filter((s) => {
      if (!s.last_login) return false;
      const today = new Date().setHours(0, 0, 0, 0);
      return new Date(s.last_login) >= today;
    }).length,
    week: allSiswaList.filter((s) => {
      if (!s.last_login) return false;
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return new Date(s.last_login) >= weekAgo;
    }).length,
    inactive: allSiswaList.filter((s) => {
      if (!s.last_login) return true;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return new Date(s.last_login) < sevenDaysAgo;
    }).length,
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

  return (
    <div className="p-6 space-y-6">
      {/* Sub-tab Switcher */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setSubTab("active-user")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
            subTab === "active-user"
              ? "border-teal-500 text-teal-600 dark:text-teal-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <UserCheck size={16} />
          User Guru
        </button>
        <button
          onClick={() => setSubTab("perangkat-guru")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
            subTab === "perangkat-guru"
              ? "border-teal-500 text-teal-600 dark:text-teal-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <Smartphone size={16} />
          Perangkat Guru
        </button>
        <button
          onClick={() => setSubTab("active-siswa")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
            subTab === "active-siswa"
              ? "border-teal-500 text-teal-600 dark:text-teal-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <Users size={16} />
          User Siswa
        </button>
        <button
          onClick={() => setSubTab("perangkat-siswa")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
            subTab === "perangkat-siswa"
              ? "border-teal-500 text-teal-600 dark:text-teal-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <GraduationCap size={16} />
          Perangkat Siswa
        </button>
      </div>

      {/* Sub-tab: Perangkat Guru */}
      {subTab === "perangkat-guru" && <ConnectedDevicesAdminTab showToast={showToast} />}

      {/* Sub-tab: Perangkat Siswa */}
      {subTab === "perangkat-siswa" && <StudentConnectedDevicesAdminTab showToast={showToast} />}

      {/* Sub-tab: User Siswa (baru) */}
      {subTab === "active-siswa" && (
        <>
          {siswaLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-500"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header */}
              <div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
                  🎓 User Activity Siswa
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Pantau aktivitas login siswa aktif (siswa yang pindah/keluar otomatis tidak
                  ditampilkan)
                </p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white dark:bg-gray-700 rounded-lg shadow-sm p-3 sm:p-4 border border-gray-200 dark:border-gray-600">
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Total Siswa Aktif
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
                    {siswaStats.total}
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg shadow-sm p-3 sm:p-4 border border-green-200 dark:border-green-800">
                  <div className="text-xs sm:text-sm text-green-700 dark:text-green-400 mb-1">
                    🟢 Hari Ini
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-green-800 dark:text-green-300">
                    {siswaStats.today}
                  </div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg shadow-sm p-3 sm:p-4 border border-yellow-200 dark:border-yellow-800">
                  <div className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-400 mb-1">
                    🟡 Minggu Ini
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-yellow-800 dark:text-yellow-300">
                    {siswaStats.week}
                  </div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow-sm p-3 sm:p-4 border border-red-200 dark:border-red-800">
                  <div className="text-xs sm:text-sm text-red-700 dark:text-red-400 mb-1">
                    🔴 Tidak Aktif
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-red-800 dark:text-red-300">
                    {siswaStats.inactive}
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
                      value={siswaFilter}
                      onChange={(e) => setSiswaFilter(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="all">Semua Siswa</option>
                      <option value="today">🟢 Login Hari Ini</option>
                      <option value="week">🟡 Login Minggu Ini</option>
                      <option value="inactive">🔴 Tidak Aktif (&gt;7 hari)</option>
                    </select>
                  </div>

                  <div className="flex-1">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Filter Kelas
                    </label>
                    <select
                      value={siswaClassFilter}
                      onChange={(e) => setSiswaClassFilter(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="all">Semua Kelas</option>
                      {uniqueClasses.map((kelas) => (
                        <option key={kelas} value={kelas}>
                          🏫 Kelas {kelas}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Cari Nama / Kelas / Username
                    </label>
                    <input
                      type="text"
                      value={siswaSearch}
                      onChange={(e) => setSiswaSearch(e.target.value)}
                      placeholder="Contoh: 8B atau nama siswa..."
                      className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Siswa List */}
              <div className="space-y-3">
                {siswaList.length === 0 ? (
                  <div className="bg-white dark:bg-gray-700 rounded-lg shadow-sm p-12 text-center border border-gray-200 dark:border-gray-600">
                    <div className="text-4xl mb-3">🔍</div>
                    <p className="text-gray-500 dark:text-gray-400">
                      Tidak ada data dengan filter yang dipilih
                    </p>
                  </div>
                ) : (
                  siswaList.map((s) => (
                    <div
                      key={s.id}
                      className="bg-white dark:bg-gray-700 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="text-2xl flex-shrink-0">
                            {getStatusColor(s.last_login)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-800 dark:text-gray-200 text-base mb-1">
                              {s.students?.full_name || "(Nama tidak ditemukan)"}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 flex flex-wrap items-center gap-2">
                              <span className="flex items-center gap-1">📧 {s.username}</span>
                              <span className="text-gray-400 dark:text-gray-600">•</span>
                              <span className="flex items-center gap-1">
                                🏫 Kelas {s.students?.class_id || "-"}
                              </span>
                              {s.students?.nisn && (
                                <>
                                  <span className="text-gray-400 dark:text-gray-600">•</span>
                                  <span className="flex items-center gap-1">
                                    NISN {s.students.nisn}
                                  </span>
                                </>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-500 mt-2 flex flex-wrap items-center gap-2">
                              <span className="flex items-center gap-1">
                                🕐 {getTimeAgo(s.last_login)}
                              </span>
                              {s.last_login && (
                                <>
                                  <span className="text-gray-400 dark:text-gray-600">•</span>
                                  <span className="flex items-center gap-1 text-xs">
                                    {new Date(s.last_login).toLocaleDateString("id-ID", {
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
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Sub-tab: Active User (default, isi lama, gak diubah) */}
      {subTab === "active-user" && (
        <>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-500"></div>
            </div>
          ) : (
            <div className="space-y-6">
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
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Total Guru
                  </div>
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
                          <div className="text-2xl flex-shrink-0">
                            {getStatusColor(user.last_login)}
                          </div>
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
          )}
        </>
      )}
    </div>
  );
}
