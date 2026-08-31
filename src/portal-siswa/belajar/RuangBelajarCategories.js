// portal-siswa/belajar/RuangBelajarCategories.js
// Landing screen Ruang Belajar. Ini yang PERTAMA muncul pas siswa klik
// "Belajar" di navbar -- tujuannya biar siswa langsung ngeh mau buka
// kategori yang mana, bukan ketemu search+list+rekomendasi sekaligus.
import { useState } from "react";

const CATEGORIES = [
  {
    key: "learning",
    label: "Tips Belajar",
    icon: "🧠",
    desc: "Cara belajar efektif, tips ujian, teknik menghafal",
  },
  {
    key: "subject_material",
    label: "Materi Pelajaran",
    icon: "📖",
    desc: "Materi ringan seputar pelajaran sekolah",
  },
  {
    key: "digital_literacy",
    label: "Literasi Digital",
    icon: "💻",
    desc: "Aman & bijak pakai teknologi, mengenali hoaks",
  },
  {
    key: "self_development",
    label: "Pengembangan Diri",
    icon: "🎯",
    desc: "Manajemen waktu, percaya diri, kerja sama",
  },
  {
    key: "general_knowledge",
    label: "Pengetahuan Umum",
    icon: "🌱",
    desc: "Sains, teknologi, sejarah, fakta menarik",
  },
  {
    key: "challenge",
    label: "Latihan & Tantangan",
    icon: "📝",
    desc: "Quiz mingguan & mini challenge",
  },
];

export default function RuangBelajarCategories({
  onSelectCategory,
  onSearch,
  onBrowseAll,
}) {
  const [search, setSearch] = useState("");

  function handleSearchSubmit(e) {
    e.preventDefault();
    if (search.trim()) onSearch(search.trim());
  }

  return (
    <div className="p-4 space-y-6 pb-20">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          📚 Ruang Belajar
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Pilih kategori yang mau kamu pelajari.
        </p>
      </div>

      <form onSubmit={handleSearchSubmit}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔎 Atau cari materi langsung..."
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </form>

      <div className="grid grid-cols-2 gap-3">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => onSelectCategory(c.key)}
            className="flex flex-col items-start gap-1.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-left hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm transition-all">
            <span className="text-3xl">{c.icon}</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
              {c.label}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 leading-snug">
              {c.desc}
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={onBrowseAll}
        className="w-full text-center text-sm font-medium text-blue-600 dark:text-blue-400 py-2">
        Lihat Semua Materi →
      </button>
    </div>
  );
}
