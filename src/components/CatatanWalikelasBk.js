// CatatanWalikelasBk.js: src/components/CatatanWalikelasBk.js
// components/CatatanWalikelasBk.js
// Section "Catatan Dari Walikelas" -- ditaro di bagian bawah dashboard
// guru BK. Beda sama NotifikasiBk.js (bell dropdown yang ringkas), di
// sini isinya ditampilin LENGKAP: siapa pengirimnya (walikelas), siswa
// mana, kategori & label apa, isi catatannya apa, dan tindakan yang udah
// diambil walikelas apa -- biar BK langsung ngerti permasalahannya tanpa
// harus buka halaman lain.
//
// Sumbernya sama kayak NotifikasiBk.js (tabel `notifications`), cuma di
// sini nampilin SEMUA (bukan cuma yang belum dibaca) dan gak dibatasi
// dropdown kecil.
import React, { useState, useEffect, useCallback } from "react";
import {
  ClipboardList,
  User,
  Check,
  ChevronDown,
  ChevronUp,
  Trash2,
  Loader2,
} from "lucide-react";
import { supabase } from "../supabaseClient";

function formatDate(dateString) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CatatanWalikelasBk({ currentUser }) {
  const [catatanList, setCatatanList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  // ✅ NEW: state buat fitur hapus -- confirmingDeleteId nyimpen id catatan
  // yang lagi diminta konfirmasi hapusnya (biar ga kepencet ga sengaja),
  // deletingId nandain id yang lagi proses delete ke Supabase.
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadCatatan = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", currentUser.id)
        .eq("type", "catatan_perhatian")
        .order("created_at", { ascending: false });

      if (err) throw err;
      setCatatanList(data || []);
    } catch (err) {
      console.error("💥 Gagal memuat catatan dari walikelas:", err);
      setError("Gagal memuat catatan dari walikelas.");
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadCatatan();

    if (!currentUser?.id) return;
    // Realtime: catatan baru dari walikelas langsung nongol tanpa refresh
    const channel = supabase
      .channel(`catatan-walikelas-${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${currentUser.id}`,
        },
        (payload) => {
          if (payload.new.type === "catatan_perhatian") {
            setCatatanList((prev) => [payload.new, ...prev]);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, loadCatatan]);

  const markAsRead = async (id) => {
    setCatatanList((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_read: true } : c)),
    );
    try {
      const { error: err } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", id);
      if (err) throw err;
    } catch (err) {
      console.error("💥 Gagal menandai catatan sebagai dibaca:", err);
    }
  };

  const toggleExpand = (catatan) => {
    const willExpand = expandedId !== catatan.id;
    setExpandedId(willExpand ? catatan.id : null);
    setConfirmingDeleteId(null);
    if (willExpand && !catatan.is_read) {
      markAsRead(catatan.id);
    }
  };

  // ✅ NEW: hapus catatan dari tabel notifications. Karena row-nya per
  // recipient_id (bukan shared sama walikelas pengirim), delete di sini
  // aman -- cuma ngilangin dari sisi BK ini, ga mempengaruhi data walikelas.
  const handleDeleteCatatan = async (id) => {
    setDeletingId(id);
    try {
      const { error: err } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);
      if (err) throw err;

      setCatatanList((prev) => prev.filter((c) => c.id !== id));
      setExpandedId((prev) => (prev === id ? null : prev));
    } catch (err) {
      console.error("💥 Gagal menghapus catatan:", err);
      setError("Gagal menghapus catatan. Coba lagi.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setDeletingId(null);
      setConfirmingDeleteId(null);
    }
  };

  const unreadCount = catatanList.filter((c) => !c.is_read).length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200 dark:border-gray-700 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Catatan Dari Walikelas
        </h3>
        {unreadCount > 0 && (
          <span className="inline-flex w-fit items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
            {unreadCount} belum dibaca
          </span>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-3 text-sm text-slate-500 dark:text-gray-400">
            Memuat catatan...
          </p>
        </div>
      ) : error ? (
        <div className="text-center py-8 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      ) : catatanList.length === 0 ? (
        <div className="text-center py-8 sm:py-10 bg-slate-50 dark:bg-gray-900/40 rounded-xl border-2 border-dashed border-slate-200 dark:border-gray-700">
          <ClipboardList className="w-8 h-8 text-slate-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500 dark:text-gray-400">
            Belum ada catatan "Perlu Perhatian" yang dikirim walikelas.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {catatanList.map((catatan) => {
            const isExpanded = expandedId === catatan.id;
            return (
              <div
                key={catatan.id}
                className={`rounded-xl border-l-4 border border-slate-100 dark:border-gray-700 transition ${
                  catatan.is_read
                    ? "bg-slate-50/60 dark:bg-gray-900/30"
                    : "bg-red-50/60 dark:bg-red-900/10"
                }`}
                style={{
                  borderLeftColor: catatan.is_read ? "#94a3b8" : "#ef4444",
                }}>
                <button
                  onClick={() => toggleExpand(catatan)}
                  className="w-full text-left px-4 py-3 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-slate-500 dark:text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-sm text-slate-800 dark:text-white">
                        {catatan.student_name || "Siswa"}
                      </p>
                      {catatan.class_id && (
                        <span className="text-xs text-slate-400 dark:text-gray-500">
                          Kelas {catatan.class_id}
                        </span>
                      )}
                      {catatan.category && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                          {catatan.category}
                        </span>
                      )}
                      {!catatan.is_read && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                          Baru
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                      Dikirim oleh{" "}
                      <span className="font-medium">
                        {catatan.created_by_name || "Walikelas"}
                      </span>{" "}
                      · {formatDate(catatan.created_at)}
                    </p>
                    {!isExpanded && catatan.note_content && (
                      <p className="text-sm text-slate-600 dark:text-gray-300 mt-2 line-clamp-1">
                        {catatan.note_content}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 mt-1 flex items-center gap-2">
                    {catatan.is_read && (
                      <Check className="w-4 h-4 text-slate-300 dark:text-gray-600" />
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pl-16 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">
                        Isi Catatan
                      </p>
                      <p className="text-sm text-slate-700 dark:text-gray-200 whitespace-pre-wrap">
                        {catatan.note_content || "-"}
                      </p>
                    </div>
                    {catatan.action_taken && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">
                          Tindakan yang Diambil Walikelas
                        </p>
                        <p className="text-sm text-slate-700 dark:text-gray-200 whitespace-pre-wrap">
                          {catatan.action_taken}
                        </p>
                      </div>
                    )}

                    {/* ✅ NEW: Tombol hapus catatan + konfirmasi inline */}
                    <div className="pt-2 border-t border-slate-100 dark:border-gray-700">
                      {confirmingDeleteId === catatan.id ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-slate-600 dark:text-gray-400">
                            Hapus catatan ini secara permanen?
                          </span>
                          <button
                            onClick={() => handleDeleteCatatan(catatan.id)}
                            disabled={deletingId === catatan.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white transition">
                            {deletingId === catatan.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                            Ya, Hapus
                          </button>
                          <button
                            onClick={() => setConfirmingDeleteId(null)}
                            disabled={deletingId === catatan.id}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-slate-600 dark:text-gray-300 transition">
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmingDeleteId(catatan.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition">
                          <Trash2 className="w-3.5 h-3.5" />
                          Hapus Catatan
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
