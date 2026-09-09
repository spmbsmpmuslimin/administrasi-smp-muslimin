// [file name]: pages/administrasi-tu/AdministrasiTU.js
// Halaman "Administrasi TU", route: /administrasi-tu (allowedRoles:
// ["admin","tu"], lihat config/menuConfig.js & sidebarConfig.js grup
// "Data & Sistem"). Nampung pekerjaan administrasi operasional TU yang
// TRANSAKSIONAL/pengarsipan/pelaporan -- SENGAJA gak ngulang Manajemen Data
// (Data Siswa/Guru/Kelas/Tahun Ajaran/Sekolah tetap di /settings). Lihat
// dokumentasi rencana modul TU (dikasih user Sep 2026) buat scope lengkap
// 5 kategori di bawah.
//
// Pola-nya SENGAJA disamain kayak pages/wakasek-kurikulum/
// KurikulumAdministrasi.js (card-grid dashboard -> klik card -> detail
// view, persist via ?tab= di URL). Bedanya: card "Persuratan" di sini
// nge-render komponen COMBINED yang punya sub-tab sendiri di dalemnya
// (Surat Masuk/Surat Keluar/Disposisi) -- pola sub-tab ini disamain persis
// kayak school-management/SchoolCombinedTab.js yang dipake di Setting.js,
// lihat PersuratanTab.js.
//
// ✅ TAHAP AWAL (Sep 2026) -- "Persuratan" baru skeleton sub-tab (isinya
// masih ComingSoonPanel, nunggu skema tabel DB). "Administrasi Keuangan"
// (SPP) udah jadi komponen asli -- lihat KeuanganTab.js (nempel ke
// spp_bills/spp_payments, sub-tab Tagihan/Pembayaran/Tunggakan/Riwayat) --
// dan sengaja ditaro paling depan di grid card. Sisa 3 kategori (Arsip,
// Inventaris, Laporan) masih ComingSoonPanel polos di level card -- ganti
// `component` card yang bersangkutan kalau modulnya udah mulai digarap,
// gak perlu ubah apapun di switcher/render dashboard-nya.
import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Home,
  ChevronRight,
  ArrowRight,
  LayoutGrid,
  FileText,
  Archive,
  Wallet,
  Package,
  FileSpreadsheet,
} from "lucide-react";
import PersuratanTab from "./PersuratanTab";
import KeuanganTab from "./KeuanganTab";
import ComingSoonPanel from "./ComingSoonPanel";

// Palet pastel per kartu menu -- SENGAJA disalin apa adanya (bukan
// di-import dari Setting.js/KurikulumAdministrasi.js) biar halaman ini
// tetap berdiri sendiri, gak bikin dependency lintas-modul. Samain kalau
// mau nambah warna baru di sini.
const CARD_COLOR_STYLES = {
  sky: {
    bg: "bg-sky-50/80 dark:bg-sky-950/20",
    border: "border-sky-100 dark:border-sky-900/40",
    hoverBorder: "hover:border-sky-300 dark:hover:border-sky-700",
    iconBg: "bg-sky-100 dark:bg-sky-900/40 group-hover:bg-sky-200 dark:group-hover:bg-sky-800/50",
    iconColor: "text-sky-600 dark:text-sky-400",
    titleHover: "group-hover:text-sky-700 dark:group-hover:text-sky-300",
    header: "from-sky-400 to-sky-500 dark:from-sky-600 dark:to-sky-700",
  },
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
  emerald: {
    bg: "bg-emerald-50/80 dark:bg-emerald-950/20",
    border: "border-emerald-100 dark:border-emerald-900/40",
    hoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-700",
    iconBg:
      "bg-emerald-100 dark:bg-emerald-900/40 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-800/50",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    titleHover: "group-hover:text-emerald-700 dark:group-hover:text-emerald-300",
    header: "from-emerald-400 to-emerald-500 dark:from-emerald-600 dark:to-emerald-700",
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
  cyan: {
    bg: "bg-cyan-50/80 dark:bg-cyan-950/20",
    border: "border-cyan-100 dark:border-cyan-900/40",
    hoverBorder: "hover:border-cyan-300 dark:hover:border-cyan-700",
    iconBg:
      "bg-cyan-100 dark:bg-cyan-900/40 group-hover:bg-cyan-200 dark:group-hover:bg-cyan-800/50",
    iconColor: "text-cyan-600 dark:text-cyan-400",
    titleHover: "group-hover:text-cyan-700 dark:group-hover:text-cyan-300",
    header: "from-cyan-400 to-cyan-500 dark:from-cyan-600 dark:to-cyan-700",
  },
};

// Menu cards -- urutan tampilan card SENGAJA taro "Administrasi Keuangan"
// paling depan (beda sama urutan prioritas build di dokumentasi rencana
// user yang tadinya Persuratan -> Arsip -> SPP -> Inventaris -> Laporan).
// NOTE: cuma "component" yang berubah kalau modul udah digarap, "id"
// jangan diubah-ubah -- dipake juga buat ?tab= di URL.
const menuCards = [
  {
    id: "keuangan",
    title: "Administrasi Keuangan",
    description: "Pembayaran SPP, tunggakan, dan riwayat pembayaran",
    icon: Wallet,
    color: "emerald",
    component: KeuanganTab,
  },
  {
    id: "persuratan",
    title: "Persuratan",
    description: "Surat masuk, surat keluar, dan disposisi",
    icon: FileText,
    color: "sky",
    component: PersuratanTab,
  },
  {
    id: "arsip",
    title: "Arsip & Dokumen",
    description: "Simpan dan kelola dokumen administrasi sekolah",
    icon: Archive,
    color: "amber",
    component: () => (
      <ComingSoonPanel
        title="Arsip & Dokumen"
        description="Modul arsip digital masih dalam pengembangan."
      />
    ),
  },
  {
    id: "inventaris",
    title: "Inventaris",
    description: "Data barang dan aset operasional sekolah",
    icon: Package,
    color: "slate",
    component: () => (
      <ComingSoonPanel
        title="Inventaris"
        description="Modul data barang & aset masih dalam pengembangan."
      />
    ),
  },
  {
    id: "laporan",
    title: "Laporan Administrasi",
    description: "Rekap laporan dari seluruh modul TU",
    icon: FileSpreadsheet,
    color: "cyan",
    component: () => (
      <ComingSoonPanel
        title="Laporan Administrasi"
        description="Rekap laporan TU masih dalam pengembangan -- nunggu modul sumbernya (Persuratan/Keuangan/Inventaris/Arsip) jadi dulu."
      />
    ),
  },
];

const AdministrasiTU = (props) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tabFromURL = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromURL || "dashboard");

  const changeTab = (tabId) => {
    setActiveTab(tabId);
    window.history.replaceState(null, "", `/administrasi-tu?tab=${tabId}`);
  };

  const getCurrentCard = () => menuCards.find((card) => card.id === activeTab);

  // Detail View -- satu kategori spesifik lagi dibuka
  if (activeTab && activeTab !== "dashboard") {
    const currentCard = getCurrentCard();
    const IconComponent = currentCard?.icon || LayoutGrid;
    const ActiveComponent = currentCard?.component;
    const colorStyle = CARD_COLOR_STYLES[currentCard?.color] || CARD_COLOR_STYLES.sky;

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
              Administrasi TU
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
            {ActiveComponent && <ActiveComponent {...props} />}
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
            Administrasi TU
          </span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white rounded-xl shadow-md">
              <LayoutGrid className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 dark:text-gray-100">
                Administrasi TU
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                Persuratan, arsip, keuangan, inventaris & laporan operasional TU
              </p>
            </div>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {menuCards.map((card) => {
            const IconComponent = card.icon;
            const colorStyle = CARD_COLOR_STYLES[card.color] || CARD_COLOR_STYLES.sky;

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

export default AdministrasiTU;
