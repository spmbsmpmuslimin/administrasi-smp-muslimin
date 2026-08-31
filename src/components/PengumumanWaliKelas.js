// PengumumanWaliKelas.js
// ========================================================================
// Widget kelola pengumuman, ditempel di DashboardHomeTeacher.js (khusus
// wali kelas). Guru bisa nambah pengumuman buat kelasnya sendiri, atau
// buat "Semua Kelas" (target_class = NULL), langsung dari dashboard —
// gak perlu lagi masuk Supabase SQL Editor manual.
//
// Props:
// - classId   : ID kelas yang diampu (currentUser.homeroom_class_id)
// - teacherId : UUID user guru yang login (currentUser.id) — disimpen di
//               kolom created_by, dan dipake buat batasin siapa yang boleh
//               hapus pengumuman (cuma pembuatnya sendiri).
// ========================================================================
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { Bell, Plus, Trash2, X, Send, Pencil, Pin } from "lucide-react";

const formatDateShort = (dateStr) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export default function PengumumanWaliKelas({ classId, teacherId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = mode tambah, isi = mode edit
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [pinningId, setPinningId] = useState(null);

  const loadAnnouncements = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("pengumuman_siswa")
        .select("id, title, content, target_class, created_by, created_at, is_pinned")
        .or(`target_class.eq.${classId},target_class.is.null`)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (err) throw err;
      setItems(data || []);
    } catch (err) {
      console.error("[PengumumanWaliKelas] Gagal ambil pengumuman:", err);
      setError("Gagal memuat pengumuman.");
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setEditingId(null);
  };

  // Buka form kosong buat tambah pengumuman baru
  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  // Buka form terisi data existing buat edit
  const openEditForm = (item) => {
    setEditingId(item.id);
    setTitle(item.title);
    setContent(item.content);
    setShowForm(true);
  };

  const closeForm = () => {
    resetForm();
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        content: content.trim(),
        target_class: classId,
      };

      if (editingId) {
        // Mode edit — update, dibatasin cuma bisa update punya sendiri
        const { error: err } = await supabase
          .from("pengumuman_siswa")
          .update(payload)
          .eq("id", editingId)
          .eq("created_by", teacherId);

        if (err) throw err;
      } else {
        // Mode tambah — insert baru
        const { error: err } = await supabase.from("pengumuman_siswa").insert({
          ...payload,
          created_by: teacherId || null,
        });

        if (err) throw err;
      }

      resetForm();
      setShowForm(false);
      loadAnnouncements();
    } catch (err) {
      console.error("[PengumumanWaliKelas] Gagal simpan pengumuman:", err);
      setError("Gagal menyimpan pengumuman. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Hapus pengumuman ini?")) return;
    setDeletingId(id);
    try {
      const { error: err } = await supabase
        .from("pengumuman_siswa")
        .delete()
        .eq("id", id)
        .eq("created_by", teacherId); // jaga-jaga: cuma bisa hapus punya sendiri

      if (err) throw err;
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (editingId === id) closeForm();
    } catch (err) {
      console.error("[PengumumanWaliKelas] Gagal hapus pengumuman:", err);
      setError("Gagal menghapus pengumuman.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleTogglePin = async (item) => {
    setPinningId(item.id);
    setError(null);
    try {
      const { error: err } = await supabase
        .from("pengumuman_siswa")
        .update({ is_pinned: !item.is_pinned })
        .eq("id", item.id)
        .eq("created_by", teacherId); // cuma pembuatnya sendiri yang boleh pin

      if (err) throw err;

      // Update state lokal + urutin ulang (pinned dulu, baru terbaru)
      setItems((prev) =>
        prev
          .map((i) => (i.id === item.id ? { ...i, is_pinned: !i.is_pinned } : i))
          .sort((a, b) => {
            if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
            return new Date(b.created_at) - new Date(a.created_at);
          })
      );
    } catch (err) {
      console.error("[PengumumanWaliKelas] Gagal ubah status pin:", err);
      setError("Gagal mengubah status pin.");
    } finally {
      setPinningId(null);
    }
  };

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-md p-4 sm:p-6 border border-slate-100 dark:border-slate-700 min-w-0">
      <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
        <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center min-w-0">
          <span className="w-1 h-5 sm:h-6 bg-gradient-to-b from-yellow-500 to-orange-500 rounded-full mr-3 shrink-0"></span>
          <span className="truncate">Pengumuman Kelas</span>
        </h2>
        <button
          onClick={() => (showForm ? closeForm() : openAddForm())}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors shrink-0"
        >
          {showForm ? (
            <>
              <X size={14} /> Batal
            </>
          ) : (
            <>
              <Plus size={14} /> Tambah
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 px-3 py-2 rounded-lg text-xs sm:text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* ====== FORM TAMBAH / EDIT ====== */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-4 p-3 sm:p-4 bg-orange-50/60 dark:bg-orange-950/20 rounded-xl border border-orange-100 dark:border-orange-900/40 space-y-3"
        >
          <p className="text-xs font-bold uppercase tracking-wide text-orange-600 dark:text-orange-400">
            {editingId ? "Edit Pengumuman" : "Pengumuman Baru"}
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Judul
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Ulangan Harian Bab 3"
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Isi Pengumuman
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tulis detail pengumuman di sini..."
              required
              rows={9}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="shrink-0 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-semibold bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60">
              Kelas {classId}
            </span>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {editingId ? <Pencil size={15} /> : <Send size={15} />}
              {submitting ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Kirim Pengumuman"}
            </button>
          </div>
        </form>
      )}

      {/* ====== LIST PENGUMUMAN ====== */}
      {loading ? (
        <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
          Memuat pengumuman...
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 sm:py-10 text-slate-500 dark:text-slate-400">
          <Bell className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Belum ada pengumuman
          </p>
          <p className="text-xs sm:text-sm">Klik "Tambah" buat bikin pengumuman baru</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.id}
              className={`p-3 sm:p-4 rounded-xl border min-w-0 ${
                item.is_pinned
                  ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60"
                  : "bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-700"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                  {item.is_pinned && (
                    <Pin
                      size={13}
                      fill="currentColor"
                      className="text-amber-600 dark:text-amber-400 shrink-0"
                    />
                  )}
                  <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">
                    {item.title}
                  </p>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 shrink-0">
                    {item.target_class ? `Kelas ${item.target_class}` : "Semua Kelas"}
                  </span>
                </div>
                {item.created_by === teacherId && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleTogglePin(item)}
                      disabled={pinningId === item.id}
                      className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                        item.is_pinned
                          ? "text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-950/40"
                          : "text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                      }`}
                      title={item.is_pinned ? "Lepas pin" : "Pin pengumuman"}
                    >
                      <Pin size={15} fill={item.is_pinned ? "currentColor" : "none"} />
                    </button>
                    <button
                      onClick={() => openEditForm(item)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                      title="Edit pengumuman"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
                      title="Hapus pengumuman"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-justify">
                {item.content}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                {formatDateShort(item.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
