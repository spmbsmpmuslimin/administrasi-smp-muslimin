// pages/wakasek-kurikulum/KurikulumAdministrasi.js
// Halaman "Administrasi" khusus Wakasek Kurikulum, route: /kurikulum-administrasi
// (allowedRoles: ["admin","teacher"] + requireWakasekKurikulum: true, lihat
// config/menuConfig.js). Sengaja dibikin halaman mandiri (BUKAN tab baru di
// dalam Setting.js) supaya kedepannya semua menu tugas struktural Wakasek
// Kurikulum bisa dikumpulin di 1 tempat, biar sidebar dia (yang juga guru
// mapel biasa) gak numpuk.
//
// Pola-nya sengaja disamain kayak setting/Setting.js (card-grid dashboard ->
// klik card -> detail view single tab, persist via ?tab= di URL) biar
// familiar buat yang udah biasa maintain Setting.js. Bedanya cuma di scope:
// di sini scope-nya cuma Wakasek Kurikulum, bukan semua role sistem.
//
// Card pertama & satu-satunya buat saat ini: "Manajemen Jadwal Pelajaran"
// (id: "jadwal-guru"), reuse JadwalGuruTab yang sama persis dipakai di
// Setting.js -- logic & data-fetching-nya gak diubah sama sekali di sini.
//
// ✅ Nambah card baru kedepannya: tinggal tambah 1 object di array
// `menuCards` (title, description, icon, color) + 1 case baru di
// `renderActiveTab()`. Gak perlu ubah apa-apa di menuConfig.js atau
// sidebarConfig.js -- route & entry sidebar-nya udah ada, cuma nambah isi
// di dalam halaman ini aja.

import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Home, ChevronRight, ArrowRight, CalendarClock, LayoutGrid } from "lucide-react";
import JadwalGuruTab from "../../setting/JadwalGuruTab";

// Palet pastel per kartu menu -- sama persis dengan CARD_COLOR_STYLES di
// Setting.js (class Tailwind ditulis lengkap, bukan digabung template
// string, supaya gak ke-purge pas build). Disalin apa adanya (bukan
// di-import dari Setting.js) supaya halaman ini tetap berdiri sendiri dan
// gak bikin Setting.js jadi dependency lintas-modul.
const CARD_COLOR_STYLES = {
  amber: {
    bg: "bg-amber-50/80 dark:bg-amber-950/20",
    border: "border-amber-100 dark:border-amber-900/40",
    hoverBorder: "hover:border-amber-300 dark:hover:border-amber-700",
    iconBg:
      "bg-amber-100 dark:bg-amber-900/40 group-hover:bg-amber-200 dark:group-hover:bg-amber-800/50",
    iconColor: "text-amber-600 dark:text-amber-400",
    titleHover: "group-hover:text-amber-700 dark:group-hover:text-amber-300",
    header: "from-amber-400 to-amber-500 dark:from-amber-600 dark:to-amber-700",
  },
  sky: {
    bg: "bg-sky-50/80 dark:bg-sky-950/20",
    border: "border-sky-100 dark:border-sky-900/40",
    hoverBorder: "hover:border-sky-300 dark:hover:border-sky-700",
    iconBg: "bg-sky-100 dark:bg-sky-900/40 group-hover:bg-sky-200 dark:group-hover:bg-sky-800/50",
    iconColor: "text-sky-600 dark:text-sky-400",
    titleHover: "group-hover:text-sky-700 dark:group-hover:text-sky-300",
    header: "from-sky-400 to-sky-500 dark:from-sky-600 dark:to-sky-700",
  },
  teal: {
    bg: "bg-teal-50/80 dark:bg-teal-950/20",
    border: "border-teal-100 dark:border-teal-900/40",
    hoverBorder: "hover:border-teal-300 dark:hover:border-teal-700",
    iconBg:
      "bg-teal-100 dark:bg-teal-900/40 group-hover:bg-teal-200 dark:group-hover:bg-teal-800/50",
    iconColor: "text-teal-600 dark:text-teal-400",
    titleHover: "group-hover:text-teal-700 dark:group-hover:text-teal-300",
    header: "from-teal-400 to-teal-500 dark:from-teal-600 dark:to-teal-700",
  },
  slate: {
    bg: "bg-slate-50/80 dark:bg-slate-800/40",
    border: "border-slate-200 dark:border-slate-700/60",
    hoverBorder: "hover:border-slate-400 dark:hover:border-slate-600",
    iconBg:
      "bg-slate-100 dark:bg-slate-700/50 group-hover:bg-slate-200 dark:group-hover:bg-slate-700/70",
    iconColor: "text-slate-600 dark:text-slate-300",
    titleHover: "group-hover:text-slate-700 dark:group-hover:text-slate-200",
    header: "from-slate-400 to-slate-500 dark:from-slate-600 dark:to-slate-700",
  },
};

// Menu cards configuration -- baru ada 1 sekarang, tambah di sini kalau
// mau nambah card baru (lihat catatan panjang di atas).
const menuCards = [
  {
    id: "jadwal-guru",
    title: "Manajemen Jadwal Pelajaran",
    description: "Import jadwal massal & master kode guru",
    icon: CalendarClock,
    color: "amber",
  },
];

const KurikulumAdministrasi = ({ user }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tabFromURL = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromURL || "dashboard");

  const changeTab = (tabId) => {
    setActiveTab(tabId);
    window.history.replaceState(null, "", `/kurikulum-administrasi?tab=${tabId}`);
  };

  const getCurrentCard = () => menuCards.find((card) => card.id === activeTab);

  const renderActiveTab = () => {
    switch (activeTab) {
      case "jadwal-guru":
        return <JadwalGuruTab />;
      default:
        return null;
    }
  };

  // Detail View -- satu tab spesifik lagi dibuka
  if (activeTab && activeTab !== "dashboard") {
    const currentCard = getCurrentCard();
    const IconComponent = currentCard?.icon || LayoutGrid;
    const colorStyle = CARD_COLOR_STYLES[currentCard?.color] || CARD_COLOR_STYLES.amber;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="px-4 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4 sm:mb-5 overflow-x-auto">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-all whitespace-nowrap flex-shrink-0 p-2 sm:p-2.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 active:scale-95"
            >
              <Home size={16} className="sm:w-4 sm:h-4" />
              <span className="hidden xs:inline font-medium">Dashboard</span>
            </button>
            <ChevronRight
              size={16}
              className="text-gray-400 dark:text-gray-500 flex-shrink-0 sm:w-4 sm:h-4"
            />
            <button
              onClick={() => changeTab("dashboard")}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-all whitespace-nowrap font-medium"
            >
              Administrasi
            </button>
            <ChevronRight
              size={16}
              className="text-gray-400 dark:text-gray-500 flex-shrink-0 sm:w-4 sm:h-4"
            />
            <span className="text-blue-600 dark:text-blue-400 font-semibold whitespace-nowrap truncate">
              {currentCard?.title}
            </span>
          </div>

          {/* Header with back button */}
          <div className="flex items-center justify-between mb-5 sm:mb-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div
                className={`p-2.5 bg-gradient-to-br ${colorStyle.header} text-white rounded-xl shadow-md`}
              >
                <IconComponent className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 dark:text-gray-100">
                  {currentCard?.title}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {currentCard?.description}
                </p>
              </div>
            </div>

            <button
              onClick={() => changeTab("dashboard")}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-all active:scale-95 text-gray-700 dark:text-gray-300 font-medium"
            >
              <ChevronRight size={18} className="rotate-180" />
              <span>Kembali</span>
            </button>
          </div>

          {/* Tab Content */}
          <div
            id={`${activeTab}-tab-content`}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/30 transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700"
          >
            {renderActiveTab()}
          </div>
        </div>
      </div>
    );
  }

  // Dashboard View -- Card Grid
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4 sm:mb-5 overflow-x-auto">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-all whitespace-nowrap flex-shrink-0 p-2 sm:p-2.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 active:scale-95"
          >
            <Home size={16} className="sm:w-4 sm:h-4" />
            <span className="hidden xs:inline font-medium">Dashboard</span>
          </button>
          <ChevronRight
            size={16}
            className="text-gray-400 dark:text-gray-500 flex-shrink-0 sm:w-4 sm:h-4"
          />
          <span className="text-blue-600 dark:text-blue-400 font-semibold whitespace-nowrap">
            Administrasi
          </span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700 text-white rounded-xl shadow-md">
              <LayoutGrid className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 dark:text-gray-100">
                Administrasi Kurikulum
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                Menu khusus tugas struktural Wakasek Kurikulum
              </p>
            </div>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {menuCards.map((card) => {
            const IconComponent = card.icon;
            const colorStyle = CARD_COLOR_STYLES[card.color] || CARD_COLOR_STYLES.amber;

            return (
              <button
                key={card.id}
                onClick={() => changeTab(card.id)}
                className={`group relative rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-lg dark:shadow-gray-900/30 border transition-all duration-300 text-left hover:-translate-y-0.5 active:scale-95 min-h-[140px] flex flex-col ${colorStyle.bg} ${colorStyle.border} ${colorStyle.hoverBorder}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2.5 rounded-lg transition-colors ${colorStyle.iconBg}`}>
                    <IconComponent className={`w-5 h-5 ${colorStyle.iconColor}`} />
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <div className="flex-grow">
                  <h3
                    className={`text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-100 mb-1 transition-colors ${colorStyle.titleHover}`}
                  >
                    {card.title}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-tight">
                    {card.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default KurikulumAdministrasi;
