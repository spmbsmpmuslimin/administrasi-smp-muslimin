// portal-siswa/ruang-belajar-admin/RuangBelajarForm.js
// Form tambah/edit 1 konten ruang_belajar. Dipanggil dari RuangBelajarAdmin.js.
// `initialData` null = mode tambah, terisi = mode edit.
import { useState } from "react";
import { supabase } from "../../supabaseClient"; // sesuaikan path kalau beda

const CATEGORY_OPTIONS = [
  { value: "learning", label: "🧠 Tips Belajar" },
  { value: "digital_literacy", label: "💻 Literasi Digital" },
  { value: "self_development", label: "🎯 Pengembangan Diri" },
  { value: "general_knowledge", label: "🌱 Pengetahuan Umum" },
  { value: "challenge", label: "📝 Latihan & Tantangan" },
];

const TYPE_OPTIONS = [
  { value: "article", label: "📄 Artikel" },
  { value: "video", label: "🎬 Video" },
  { value: "link", label: "🔗 Link" },
  { value: "quiz", label: "❓ Quiz" },
  { value: "infographic", label: "🖼️ Infografis" },
];

const emptyForm = {
  title: "",
  category: "learning",
  description: "",
  content: "",
  resource_type: "article",
  thumbnail: "",
  url: "",
  estimated_minutes: "",
  is_featured: false,
  is_active: true,
};

export default function RuangBelajarForm({
  user,
  initialData,
  onSaved,
  onCancel,
  onShowToast,
}) {
  const isEdit = Boolean(initialData);
  const [form, setForm] = useState(
    initialData ? { ...emptyForm, ...initialData } : emptyForm,
  );
  const [saving, setSaving] = useState(false);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      onShowToast?.("Judul wajib diisi", "error");
      return;
    }

    setSaving(true);
    const payload = {
      title: form.title.trim(),
      category: form.category,
      description: form.description?.trim() || null,
      content: form.content?.trim() || null,
      resource_type: form.resource_type,
      thumbnail: form.thumbnail?.trim() || null,
      url: form.url?.trim() || null,
      estimated_minutes: form.estimated_minutes
        ? Number(form.estimated_minutes)
        : null,
      is_featured: form.is_featured,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (isEdit) {
      ({ error } = await supabase
        .from("ruang_belajar")
        .update(payload)
        .eq("id", initialData.id));
    } else {
      ({ error } = await supabase.from("ruang_belajar").insert({
        ...payload,
        created_by: user?.id || null,
      }));
    }

    setSaving(false);

    if (error) {
      console.error("Gagal simpan ruang_belajar:", error);
      onShowToast?.("Gagal menyimpan materi", "error");
      return;
    }

    onShowToast?.(
      isEdit ? "Materi berhasil diupdate" : "Materi berhasil ditambahkan",
      "success",
    );
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4 max-w-2xl">
      <h1 className="text-lg font-bold text-gray-900 dark:text-white">
        {isEdit ? "Edit Materi" : "Tambah Materi Baru"}
      </h1>

      <Field label="Judul">
        <input
          type="text"
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          className={inputClass}
          required
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Kategori">
          <select
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
            className={inputClass}>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tipe Konten">
          <select
            value={form.resource_type}
            onChange={(e) => update("resource_type", e.target.value)}
            className={inputClass}>
            {TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Deskripsi singkat">
        <input
          type="text"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          className={inputClass}
          placeholder="Muncul di card & hasil pencarian"
        />
      </Field>

      <Field label="Isi materi">
        <textarea
          value={form.content}
          onChange={(e) => update("content", e.target.value)}
          rows={8}
          className={inputClass}
          placeholder="Isi lengkap artikel..."
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="URL Thumbnail (opsional)">
          <input
            type="text"
            value={form.thumbnail}
            onChange={(e) => update("thumbnail", e.target.value)}
            className={inputClass}
            placeholder="https://..."
          />
        </Field>
        <Field label="URL Video/Link (opsional)">
          <input
            type="text"
            value={form.url}
            onChange={(e) => update("url", e.target.value)}
            className={inputClass}
            placeholder="https://..."
          />
        </Field>
      </div>

      <Field label="Estimasi waktu baca (menit)">
        <input
          type="number"
          min="0"
          value={form.estimated_minutes}
          onChange={(e) => update("estimated_minutes", e.target.value)}
          className={inputClass}
        />
      </Field>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={form.is_featured}
            onChange={(e) => update("is_featured", e.target.checked)}
          />
          Jadikan rekomendasi (featured)
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => update("is_active", e.target.checked)}
          />
          Aktif (tampil ke siswa)
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50">
          {saving
            ? "Menyimpan..."
            : isEdit
              ? "Simpan Perubahan"
              : "Tambah Materi"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 text-sm font-medium">
          Batal
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
