// portal-siswa/belajar/RuangBelajarHome.js
// Layar "browse" Ruang Belajar -- muncul SETELAH siswa milih kategori
// (atau search / "Lihat Semua") dari RuangBelajarCategories.js.
// Nerima initialCategory & initialSearch buat langsung kefilter begitu
// masuk, plus onBack buat balik ke landing kategori.
import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient"; // sesuaikan path kalau beda

const CATEGORIES = [
  { key: "learning", label: "Tips Belajar", icon: "🧠" },
  { key: "subject_material", label: "Materi Pelajaran", icon: "📖" },
  { key: "digital_literacy", label: "Literasi Digital", icon: "💻" },
  { key: "self_development", label: "Pengembangan Diri", icon: "🎯" },
  { key: "general_knowledge", label: "Pengetahuan Umum", icon: "🌱" },
  { key: "challenge", label: "Latihan & Tantangan", icon: "📝" },
];

const TYPE_ICON = {
  article: "📄",
  video: "🎬",
  link: "🔗",
  quiz: "❓",
  infographic: "🖼️",
};

export default function RuangBelajarHome({
  onOpenDetail,
  onBack,
  initialCategory = null,
  initialSearch = "",
}) {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [activeCategory, setActiveCategory] = useState(initialCategory);

  useEffect(() => {
    fetchResources();
  }, []);

  async function fetchResources() {
    setLoading(true);
    const { data, error } = await supabase
      .from("ruang_belajar")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Gagal fetch ruang_belajar:", error);
      setResources([]);
    } else {
      setResources(data || []);
    }
    setLoading(false);
  }

  const filtered = resources.filter((r) => {
    const matchCategory = activeCategory ? r.category === activeCategory : true;
    const q = search.trim().toLowerCase();
    const matchSearch = q
      ? r.title.toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q)
      : true;
    return matchCategory && matchSearch;
  });

  const activeCategoryLabel = CATEGORIES.find(
    (c) => c.key === activeCategory,
  )?.label;

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        Memuat materi...
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5 pb-20">
      <button
        onClick={onBack}
        className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1">
        ← Kategori
      </button>

      <div>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">
          {activeCategoryLabel
            ? `${CATEGORIES.find((c) => c.key === activeCategory)?.icon} ${activeCategoryLabel}`
            : "📚 Semua Materi"}
        </h1>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔎 Cari materi..."
        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="flex flex-wrap gap-2">
        <CategoryPill
          label="Semua"
          icon="📚"
          active={activeCategory === null}
          onClick={() => setActiveCategory(null)}
        />
        {CATEGORIES.map((c) => (
          <CategoryPill
            key={c.key}
            label={c.label}
            icon={c.icon}
            active={activeCategory === c.key}
            onClick={() => setActiveCategory(c.key)}
          />
        ))}
      </div>

      <div>
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">
            Belum ada materi di sini.
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => (
              <ResourceCard
                key={r.id}
                resource={r}
                onClick={() => onOpenDetail(r)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryPill({ label, icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        active
          ? "bg-blue-600 text-white"
          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
      }`}>
      {icon} {label}
    </button>
  );
}

function ResourceCard({ resource, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
      <div className="text-2xl">
        {TYPE_ICON[resource.resource_type] || "📄"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {resource.title}
        </p>
        {resource.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {resource.description}
          </p>
        )}
        {resource.estimated_minutes && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            ⏱ {resource.estimated_minutes} menit
          </p>
        )}
      </div>
    </button>
  );
}
