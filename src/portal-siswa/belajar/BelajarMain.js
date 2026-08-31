// portal-siswa/belajar/BelajarMain.js
// Alur: categories (landing, default) -> browse (list terfilter) -> detail.
// Klik "Belajar" di navbar = masuk sini, level "categories".
import { useState } from "react";
import RuangBelajarCategories from "./RuangBelajarCategories";
import RuangBelajarHome from "./RuangBelajarHome";
import RuangBelajarDetail from "./RuangBelajarDetail";

export default function BelajarMain({ currentUser }) {
  const [view, setView] = useState({
    level: "categories",
    category: null,
    search: "",
    selected: null,
  });

  const openBrowse = (category, search = "") =>
    setView((v) => ({ ...v, level: "browse", category, search }));

  const backToCategories = () =>
    setView({
      level: "categories",
      category: null,
      search: "",
      selected: null,
    });

  const openDetail = (resource) =>
    setView((v) => ({ ...v, level: "detail", selected: resource }));

  const backToBrowse = () =>
    setView((v) => ({ ...v, level: "browse", selected: null }));

  return (
    <div className="min-h-screen">
      {view.level === "categories" && (
        <RuangBelajarCategories
          onSelectCategory={(key) => openBrowse(key)}
          onSearch={(term) => openBrowse(null, term)}
          onBrowseAll={() => openBrowse(null)}
        />
      )}

      {view.level === "browse" && (
        <RuangBelajarHome
          initialCategory={view.category}
          initialSearch={view.search}
          onOpenDetail={openDetail}
          onBack={backToCategories}
        />
      )}

      {view.level === "detail" && (
        <RuangBelajarDetail resource={view.selected} onBack={backToBrowse} />
      )}
    </div>
  );
}
