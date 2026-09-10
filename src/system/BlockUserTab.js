import React, { useState, useEffect, useMemo } from "react";
import { Ban, ShieldCheck, Search, Users } from "lucide-react";
import { supabase } from "../supabaseClient";

const BlockUserTab = ({ showToast }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("users")
        .select("id, username, full_name, role, is_active, is_blocked")
        .neq("role", "developer") // developer selalu bebas, gak bisa diblokir dari sini
        .order("full_name", { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error loading users:", error);
      showToast?.("Gagal memuat daftar user", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlock = async (user) => {
    setSavingId(user.id);
    try {
      const newValue = !user.is_blocked;

      const { error } = await supabase
        .from("users")
        .update({ is_blocked: newValue })
        .eq("id", user.id);

      if (error) throw error;

      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_blocked: newValue } : u)));
      setSelectedIds((prev) => {
        if (!prev.has(user.id)) return prev;
        const next = new Set(prev);
        next.delete(user.id);
        return next;
      });

      showToast?.(
        newValue ? `🚫 ${user.full_name} diblokir` : `✅ ${user.full_name} dibuka blokirnya`,
        "success"
      );
    } catch (error) {
      console.error("Error toggling block:", error);
      showToast?.("Gagal mengubah status blokir", "error");
    } finally {
      setSavingId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.full_name?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q)
    );
  }, [users, search]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isAllSelected =
    filteredUsers.length > 0 && filteredUsers.every((u) => selectedIds.has(u.id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (isAllSelected) {
        // Batalkan pilihan cuma buat user yang lagi kelihatan (filteredUsers)
        const next = new Set(prev);
        filteredUsers.forEach((u) => next.delete(u.id));
        return next;
      }
      const next = new Set(prev);
      filteredUsers.forEach((u) => next.add(u.id));
      return next;
    });
  };

  const handleBulkBlock = async () => {
    if (selectedIds.size === 0) return;
    setBulkSaving(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase.from("users").update({ is_blocked: true }).in("id", ids);

      if (error) throw error;

      setUsers((prev) => prev.map((u) => (ids.includes(u.id) ? { ...u, is_blocked: true } : u)));
      showToast?.(`🚫 ${ids.length} user diblokir`, "success");
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Error bulk blocking:", error);
      showToast?.("Gagal memblokir user terpilih", "error");
    } finally {
      setBulkSaving(false);
    }
  };

  const blockedCount = users.filter((u) => u.is_blocked).length;

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
        <Ban className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1 sm:mt-0" />
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
            Blokir User
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            Blokir akses user tertentu tanpa mengaktifkan mode maintenance
          </p>
        </div>
      </div>

      {/* Status Badge */}
      <div className="p-3 sm:p-4 rounded-lg bg-blue-50 dark:bg-gray-800 border border-blue-100 dark:border-gray-700">
        <p className="text-xs sm:text-sm text-blue-700 dark:text-gray-400 mb-2">Status Aplikasi:</p>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0 bg-green-500 dark:bg-green-600"></div>
          <span className="font-bold text-base sm:text-lg text-green-600 dark:text-green-400">
            🟢 AKTIF
          </span>
          <span className="text-xs text-blue-600 dark:text-gray-400 ml-2">
            {blockedCount > 0 ? `${blockedCount} user diblokir` : "Tidak ada user yang diblokir"}
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 dark:text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama atau username..."
          className="w-full pl-9 pr-3 py-2 border border-blue-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-600 text-sm min-h-[44px]"
        />
      </div>

      {/* User List */}
      <div className="p-3 sm:p-4 bg-blue-50 dark:bg-purple-900/10 rounded-lg border border-blue-200 dark:border-purple-800">
        <div className="flex flex-wrap items-center gap-2 mb-3 sm:mb-4">
          <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-purple-500 flex-shrink-0" />
          <h3 className="font-semibold text-blue-800 dark:text-gray-100 text-sm sm:text-base">
            Daftar User
          </h3>
          <span className="text-xs bg-blue-100 dark:bg-purple-900/40 text-blue-700 dark:text-purple-300 px-2 py-1 rounded-full">
            {filteredUsers.length} user
          </span>
          <label className="ml-auto flex items-center gap-1.5 text-xs sm:text-sm text-blue-700 dark:text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={toggleSelectAll}
              disabled={filteredUsers.length === 0}
              className="w-4 h-4 rounded border-blue-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            Pilih Semua
          </label>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between gap-2 mb-3 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
            <span className="text-xs sm:text-sm text-red-700 dark:text-red-400 font-medium">
              {selectedIds.size} user dipilih
            </span>
            <button
              onClick={handleBulkBlock}
              disabled={bulkSaving}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition ${
                bulkSaving ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <Ban className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{bulkSaving ? "Memblokir..." : "Blokir yang Dipilih"}</span>
            </button>
          </div>
        )}

        {filteredUsers.length === 0 ? (
          <p className="text-xs text-blue-600 dark:text-gray-400 text-center py-4">
            Tidak ada user yang cocok
          </p>
        ) : (
          <div className="space-y-2">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className={`flex items-center justify-between gap-3 p-3 rounded-lg border transition ${
                  user.is_blocked
                    ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800"
                    : "bg-white dark:bg-gray-800 border-blue-200 dark:border-gray-700"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(user.id)}
                  onChange={() => toggleSelect(user.id)}
                  className="w-4 h-4 rounded border-blue-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-blue-800 dark:text-gray-100 truncate text-sm sm:text-base">
                    {user.full_name}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-gray-400 truncate">
                    @{user.username} · {user.role}
                    {user.is_blocked && (
                      <span className="ml-2 text-red-600 dark:text-red-400 font-semibold">
                        · Diblokir
                      </span>
                    )}
                  </p>
                </div>

                <button
                  onClick={() => handleToggleBlock(user)}
                  disabled={savingId === user.id}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition min-h-[40px] flex-shrink-0 ml-2 ${
                    user.is_blocked
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-red-600 text-white hover:bg-red-700"
                  } ${savingId === user.id ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {user.is_blocked ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>Buka</span>
                    </>
                  ) : (
                    <>
                      <Ban className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>Blokir</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockUserTab;
