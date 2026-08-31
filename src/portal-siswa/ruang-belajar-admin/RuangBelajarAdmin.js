// portal-siswa/ruang-belajar-admin/RuangBelajarAdmin.js
// Halaman admin buat kelola konten ruang_belajar: list + filter, tambah,
// edit, toggle aktif/nonaktif, delete. Dipanggil dari menuConfig.js
// dengan path "/ruang-belajar-admin", allowedRoles: ["admin"].
import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient"; // sesuaikan path kalau beda
import RuangBelajarForm from "./RuangBelajarForm";

const CATEGORY_LABEL = {
  learning: "🧠 Tips Belajar",
  digital_literacy: "💻 Literasi Digital",
  self_development: "🎯 Pengembangan Diri",
  general_knowledge: "🌱 Pengetahuan Umum",
  challenge: "📝 Latihan & Tantangan",
};

export default function RuangBelajarAdmin({ user, onShowToast, darkMode }) {
  const [view, setView] = useState({ mode: "list", editing: null });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | inactive

  useEffect(() => {
    if (view.mode === "list") fetchItems();
  }, [view.mode]);

  async function fetchItems() {
    setLoading(true);
    const { data, error } = await supabase
      .from("ruang_belajar")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Gagal fetch ruang_belajar:", error);
      onShowToast?.("Gagal memuat data", "error");
      setItems([]);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  }

  async function toggleActive(item) {
    const { error } = await supabase
      .from("ruang_belajar")
      .update({
        is_active: !item.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      onShowToast?.("Gagal update status", "error");
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, is_active: !i.is_active } : i,
      ),
    );
    onShowToast?.(
      item.is_active ? "Materi dinonaktifkan" : "Materi diaktifkan",
      "success",
    );
  }

  async function handleDelete(item) {
    const confirmed = window.confirm(
      `Hapus permanen "${item.title}"? Tindakan ini tidak bisa dibatalkan.`,
    );
    if (!confirmed) return;

    const { error } = await supabase
      .from("ruang_belajar")
      .delete()
      .eq("id", item.id);
    if (error) {
      onShowToast?.("Gagal menghapus materi", "error");
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    onShowToast?.("Materi dihapus", "success");
  }

  const filtered = items.filter((i) => {
    const matchCategory =
      categoryFilter === "all" ? true : i.category === categoryFilter;
    const matchStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
          ? i.is_active
          : !i.is_active;
    return matchCategory && matchStatus;
  });

  if (view.mode === "form") {
    return (
      <RuangBelajarForm
        user={user}
        initialData={view.editing}
        onShowToast={onShowToast}
        onCancel={() => setView({ mode: "list", editing: null })}
        onSaved={() => setView({ mode: "list", editing: null })}
      />
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">
            📚 Kelola Ruang Belajar
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {items.length} total materi
          </p>
        </div>
        <button
          onClick={() => setView({ mode: "form", editing: null })}
          className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-medium">
          + Tambah Materi
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300">
          <option value="all">Semua Kategori</option>
          {Object.entries(CATEGORY_LABEL).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300">
          <option value="all">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
          Memuat data...
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">
          Belum ada materi.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {item.title}
                  </p>
                  {item.is_featured && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300">
                      ✨ Featured
                    </span>
                  )}
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      item.is_active
                        ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                    }`}>
                    {item.is_active ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {CATEGORY_LABEL[item.category] || item.category}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setView({ mode: "form", editing: item })}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300">
                  Edit
                </button>
                <button
                  onClick={() => toggleActive(item)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300">
                  {item.is_active ? "Nonaktifkan" : "Aktifkan"}
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
