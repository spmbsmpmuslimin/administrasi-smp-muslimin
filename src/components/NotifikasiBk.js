// components/NotifikasiBk.js
// Bell notifikasi buat guru BK/BP. Nyambung ke tabel `notifications` yang
// diisi otomatis dari CatatanSiswa.js tiap kali walikelas bikin catatan
// baru berlabel "Perhatian" (lihat fungsi notifyGuruBk di sana).
//
// Cara pakai: taro <NotifikasiBk currentUser={dbUser} /> di navbar/header
// halaman dashboard BK. currentUser wajib punya field `id` (uuid dari
// tabel users). onOpenStudent opsional -- dipanggil dengan student_id
// pas notifikasi diklik, kalau mau langsung diarahkan ke halaman detail
// siswa yang bersangkutan.
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Bell, AlertCircle, X, Check } from "lucide-react";
import { supabase } from "../supabaseClient";

function formatRelativeTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} hari lalu`;
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function NotifikasiBk({ currentUser, onOpenStudent }) {
  const [notifikasi, setNotifikasi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  const unreadCount = notifikasi.filter((n) => !n.is_read).length;

  const loadNotifikasi = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifikasi(data || []);
    } catch (err) {
      console.error("💥 Gagal memuat notifikasi:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  // Fetch awal + subscribe realtime biar notifikasi baru langsung nongol
  // tanpa guru BK harus refresh halaman.
  useEffect(() => {
    if (!currentUser?.id) return;

    loadNotifikasi();

    const channel = supabase
      .channel(`notifications-${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${currentUser.id}`,
        },
        (payload) => {
          setNotifikasi((prev) => [payload.new, ...prev]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, loadNotifikasi]);

  // Klik di luar panel -> nutup dropdown
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const markAsRead = async (notif) => {
    if (notif.is_read) return;
    // Optimistic update dulu biar kerasa responsif, baru sinkron ke DB
    setNotifikasi((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)),
    );
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", notif.id);
      if (error) throw error;
    } catch (err) {
      console.error("💥 Gagal menandai notifikasi sebagai dibaca:", err);
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifikasi.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    setNotifikasi((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in("id", unreadIds);
      if (error) throw error;
    } catch (err) {
      console.error("💥 Gagal menandai semua notifikasi sebagai dibaca:", err);
    }
  };

  const handleClickNotif = (notif) => {
    markAsRead(notif);
    if (notif.student_id && onOpenStudent) {
      setOpen(false);
      onOpenStudent(notif.student_id);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
        title="Notifikasi">
        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[28rem] overflow-hidden flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/50 border border-gray-100 dark:border-gray-700 z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-gray-800 dark:text-white text-sm">
              Notifikasi Catatan Siswa
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
                  Tandai semua dibaca
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                Memuat notifikasi...
              </div>
            ) : notifikasi.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                Belum ada notifikasi catatan siswa.
              </div>
            ) : (
              notifikasi.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleClickNotif(notif)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 dark:border-gray-700/60 last:border-0 flex gap-3 items-start transition ${
                    notif.is_read
                      ? "hover:bg-gray-50 dark:hover:bg-gray-700/40"
                      : "bg-blue-50/60 dark:bg-blue-900/20 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                  }`}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      notif.is_read
                        ? "bg-gray-100 dark:bg-gray-700"
                        : "bg-pink-100 dark:bg-pink-900/40"
                    }`}>
                    <AlertCircle
                      className={`w-4 h-4 ${
                        notif.is_read
                          ? "text-gray-400 dark:text-gray-400"
                          : "text-pink-600 dark:text-pink-400"
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm ${
                        notif.is_read
                          ? "text-gray-600 dark:text-gray-300"
                          : "font-semibold text-gray-900 dark:text-white"
                      }`}>
                      {notif.student_name || "Siswa"}
                      {notif.category && (
                        <span className="ml-1.5 font-normal text-xs text-gray-400 dark:text-gray-500">
                          · {notif.category}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Dari: {notif.created_by_name || "Walikelas"}
                    </p>
                    {notif.note_content && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        "{notif.note_content}"
                      </p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {formatRelativeTime(notif.created_at)}
                    </p>
                  </div>
                  {!notif.is_read && (
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />
                  )}
                  {notif.is_read && (
                    <Check className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0 mt-1" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
