// portal-siswa/belajar/RuangBelajarDetail.js
// Detail 1 konten Ruang Belajar. Nerima `resource` penuh dari Home,
// gak fetch ulang ke Supabase.
const CATEGORY_LABEL = {
  learning: "🧠 Tips Belajar",
  subject_material: "📖 Materi Pelajaran",
  digital_literacy: "💻 Literasi Digital",
  self_development: "🎯 Pengembangan Diri",
  general_knowledge: "🌱 Pengetahuan Umum",
  challenge: "📝 Latihan & Tantangan",
};

export default function RuangBelajarDetail({ resource, onBack }) {
  if (!resource) return null;

  return (
    <div className="p-4 space-y-4 pb-20">
      <button
        onClick={onBack}
        className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1">
        ← Kembali
      </button>

      <div>
        <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 mb-2">
          {CATEGORY_LABEL[resource.category] || resource.category}
        </span>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">
          {resource.title}
        </h1>
        {resource.estimated_minutes && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            ⏱ Estimasi {resource.estimated_minutes} menit
          </p>
        )}
      </div>

      {resource.thumbnail && (
        <img
          src={resource.thumbnail}
          alt={resource.title}
          className="w-full rounded-xl object-cover max-h-56"
        />
      )}

      {(resource.resource_type === "link" ||
        resource.resource_type === "video") &&
        resource.url && (
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center rounded-xl bg-blue-600 text-white py-2.5 text-sm font-medium">
            {resource.resource_type === "video"
              ? "▶ Tonton Video"
              : "🔗 Buka Link"}
          </a>
        )}

      {resource.content && (
        <div className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {resource.content}
        </div>
      )}
    </div>
  );
}
