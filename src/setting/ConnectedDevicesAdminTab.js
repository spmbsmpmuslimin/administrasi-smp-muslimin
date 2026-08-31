// setting/ConnectedDevicesAdminTab.js
//
// Isi sub-tab "Perangkat Terhubung" di dalam ActiveUsersTab.js (menu
// Pengaturan -> Active Users). Nampilin device yang pernah dipake
// guru/staff (tabel `users`) buat login, admin bisa liat semuanya
// sekaligus + search by nama.
//
// PENTING: tombol "Hapus" cuma ngapus baris riwayat device dari
// database, BUKAN paksa logout device itu (lihat komentar lengkap
// di utils/userDevices.js).

import { useCallback, useEffect, useState } from "react";
import { Smartphone, Search, RefreshCw } from "lucide-react";
import { getAllUserDevices, deleteUserDevice } from "../utils/userDevices";

function formatWIB(isoString) {
  if (!isoString) return "-";
  try {
    const date = new Date(isoString);
    const parts = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);

    const get = (type) => parts.find((p) => p.type === type)?.value || "";
    return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")} WIB`;
  } catch (err) {
    console.error("[ConnectedDevicesAdminTab] Gagal format tanggal:", err);
    return "-";
  }
}

function getUserDisplayName(user, userId) {
  if (!user) return `User (ID: ${userId})`;
  return user.full_name || user.username || `User (ID: ${userId})`;
}

function getUserRoleLabel(user) {
  if (!user) return null;
  return user.homeroom_class_id ? `👑 Wali Kelas ${user.homeroom_class_id}` : "📚 Guru Mapel";
}

export default function ConnectedDevicesAdminTab({ showToast }) {
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState("");

  const loadDevices = useCallback(async () => {
    setIsLoading(true);
    const data = await getAllUserDevices();
    setDevices(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const handleDelete = async (row) => {
    const userName = getUserDisplayName(row.user, row.user_id);
    const deviceLabel = [row.brand, row.model].filter(Boolean).join(" - ") || "device ini";
    const confirmed = window.confirm(
      `Hapus riwayat "${deviceLabel}" milik ${userName}? Ini cuma ngapus catatannya -- kalau device itu masih login, dia gak akan otomatis ke-logout.`
    );
    if (!confirmed) return;

    setDeletingId(row.id);
    const ok = await deleteUserDevice(row.id);
    setDeletingId(null);

    if (ok) {
      setDevices((prev) => prev.filter((d) => d.id !== row.id));
      if (showToast) showToast("Riwayat device berhasil dihapus", "success");
    } else {
      if (showToast) showToast("Gagal hapus riwayat device", "error");
      else window.alert("Gagal hapus riwayat device, coba lagi.");
    }
  };

  const filteredDevices = devices.filter((row) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    const userName = getUserDisplayName(row.user, row.user_id).toLowerCase();
    const username = (row.user?.username || "").toLowerCase();
    const brand = (row.brand || "").toLowerCase();
    const model = (row.model || "").toLowerCase();
    return userName.includes(q) || username.includes(q) || brand.includes(q) || model.includes(q);
  });

  const stats = {
    totalDevices: devices.length,
    totalUsers: new Set(devices.map((d) => d.user_id)).size,
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
            📱 Perangkat Terhubung
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Pantau device yang pernah dipakai guru/staff buat login, dan hapus riwayatnya kalau
            perlu
          </p>
        </div>
        <button
          onClick={loadDevices}
          className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
        >
          <RefreshCw size={14} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-gray-700 rounded-lg shadow-sm p-3 sm:p-4 border border-gray-200 dark:border-gray-600">
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">
            Total Device
          </div>
          <div className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
            {stats.totalDevices}
          </div>
        </div>
        <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg shadow-sm p-3 sm:p-4 border border-cyan-200 dark:border-cyan-800">
          <div className="text-xs sm:text-sm text-cyan-700 dark:text-cyan-400 mb-1">
            User Terdaftar
          </div>
          <div className="text-xl sm:text-2xl font-bold text-cyan-800 dark:text-cyan-300">
            {stats.totalUsers}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-700 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-600">
        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Cari Nama / Username / Merek Device
        </label>
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ketik nama guru, username, atau merek HP..."
            className="w-full pl-9 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Device List */}
      <div className="space-y-3">
        {filteredDevices.length === 0 ? (
          <div className="bg-white dark:bg-gray-700 rounded-lg shadow-sm p-12 text-center border border-gray-200 dark:border-gray-600">
            <div className="text-4xl mb-3">📱</div>
            <p className="text-gray-500 dark:text-gray-400">
              {devices.length === 0
                ? "Belum ada riwayat device."
                : "Tidak ada device yang cocok dengan pencarian."}
            </p>
          </div>
        ) : (
          filteredDevices.map((row) => {
            const userName = getUserDisplayName(row.user, row.user_id);
            const roleLabel = getUserRoleLabel(row.user);

            return (
              <div
                key={row.id}
                className="bg-white dark:bg-gray-700 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 border border-cyan-100 dark:border-cyan-800 flex items-center justify-center shrink-0">
                      <Smartphone className="text-cyan-500 dark:text-cyan-400" size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 dark:text-gray-200 text-base mb-0.5 truncate">
                        {userName}
                      </div>
                      {roleLabel && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          {roleLabel}
                        </div>
                      )}
                      <div className="text-sm text-gray-600 dark:text-gray-400 flex flex-wrap items-center gap-2">
                        <span className="font-medium uppercase">
                          {row.brand || "Tidak diketahui"}
                        </span>
                        {row.model && (
                          <>
                            <span className="text-gray-400 dark:text-gray-600">•</span>
                            <span>{row.model}</span>
                          </>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        🕐 Login terakhir: {formatWIB(row.last_login_at)}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(row)}
                    disabled={deletingId === row.id}
                    className="bg-red-400 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors flex-shrink-0"
                  >
                    {deletingId === row.id ? "Menghapus..." : "Hapus"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      {devices.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2 text-sm text-blue-700 dark:text-blue-300">
            <span className="text-lg">💡</span>
            <p>
              Tombol "Hapus" cuma ngapus catatan riwayat device -- bukan paksa logout jarak jauh.
              Kalau device itu masih login, dia tetap login sampai logout sendiri atau clear data
              browser.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
