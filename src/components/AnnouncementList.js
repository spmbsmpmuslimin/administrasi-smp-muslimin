// AnnouncementList.js
// Versi LIST dari pengumuman admin -- gantiin AnnouncementPopup.js yang
// tadinya modal maksa muncul pas login. Sekarang wali kelas buka sendiri
// lewat tab "Dari Admin", konsisten sama 3 tab lain (semua bentuk list,
// gak ada yang modal lagi).
//
// Tetep pake tabel yang sama kayak AnnouncementPopup.js lama:
// - "announcement"       : isi pengumumannya
// - "announcement_reads" : nandain udah dibaca siapa aja
//
// Props:
// - userId   : currentUser.id, disimpen ke announcement_reads.user_id
// - userRole : dipake buat filter target_role (misal "walikelas")
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { Bell, Calendar } from "lucide-react";

const formatDateTime = (dateStr) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function AnnouncementList({ userId, userRole }) {
  const [items, setItems] = useState([]);
  const [readIds, setReadIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!userId || !userRole) return;
    setLoading(true);
    setError(null);
    try {
      const now = new Date().toISOString();

      // 1. Ambil pengumuman aktif yang masih dalam rentang tanggal berlaku
      //    ✅ FIX: sebelumnya pakai .lte("effective_from", now) dan
      //    .gte("effective_until", now) langsung -- kalau admin bikin
      //    pengumuman tanpa isi salah satu/kedua tanggal itu (maksudnya
      //    "berlaku terus, gak ada batas"), PostgREST bakal treat
      //    null >= now sebagai FALSE, jadi pengumumannya kesaring keluar
      //    walaupun is_active-nya true. Sekarang null dianggap "gak ada
      //    batas" (tetep muncul) pakai .or() per kolom.
      const { data: announcements, error: fetchError } = await supabase
        .from("announcement")
        .select("*")
        .eq("is_active", true)
        .or(`effective_from.is.null,effective_from.lte.${now}`)
        .or(`effective_until.is.null,effective_until.gte.${now}`)
        .or(`target_role.eq.${userRole},target_role.eq.semua`)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setItems(announcements || []);

      // 2. Ambil status "sudah dibaca" buat semua pengumuman itu sekaligus
      //    (1 query aja, bukan per-item, biar gak N+1)
      const ids = (announcements || []).map((a) => a.id);
      if (ids.length > 0) {
        const { data: reads, error: readError } = await supabase
          .from("announcement_reads")
          .select("announcement_id")
          .eq("user_id", userId)
          .in("announcement_id", ids);

        if (readError) throw readError;
        setReadIds(new Set((reads || []).map((r) => r.announcement_id)));
      } else {
        setReadIds(new Set());
      }
    } catch (err) {
      console.error("[AnnouncementList] Gagal ambil pengumuman:", err);
      setError("Gagal memuat pengumuman dari admin.");
    } finally {
      setLoading(false);
    }
  }, [userId, userRole]);

  useEffect(() => {
    load();
  }, [load]);

  // Tandain sebagai "sudah dibaca" pas item-nya diklik/dibuka
  const markAsRead = async (announcementId) => {
    if (readIds.has(announcementId)) return; // udah pernah dibaca, gak usah insert lagi
    setReadIds((prev) => new Set(prev).add(announcementId)); // optimistic update
    try {
      const { error: err } = await supabase.from("announcement_reads").insert({
        announcement_id: announcementId,
        user_id: userId,
        read_at: new Date().toISOString(),
      });
      if (err) throw err;
    } catch (err) {
      console.error("[AnnouncementList] Gagal tandai dibaca:", err);
      // gak perlu rollback UI -- gagal nandain "dibaca" bukan hal fatal
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
        ⚠️ {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
        <Bell className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
        <p className="text-sm">Belum ada pengumuman dari admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {items.map((item) => {
        const isUnread = !readIds.has(item.id);
        return (
          <div
            key={item.id}
            onClick={() => markAsRead(item.id)}
            className={`p-3 sm:p-4 rounded-xl border cursor-pointer transition-colors ${
              isUnread
                ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60"
                : "bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-700"
            }`}>
            <div className="flex items-center gap-2 mb-1">
              {isUnread && (
                <span
                  className="w-2 h-2 rounded-full bg-blue-600 shrink-0"
                  title="Belum dibaca"
                />
              )}
              <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">
                {item.title}
              </p>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-justify whitespace-pre-wrap">
              {item.content}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
              <Calendar className="w-3 h-3" />
              {formatDateTime(item.created_at)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
