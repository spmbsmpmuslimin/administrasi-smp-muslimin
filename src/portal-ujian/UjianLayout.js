// portal-ujian/UjianLayout.js
// ========================================================================
// Layout khusus Portal Panitia Ujian. Pola sama kayak StudentLayout.js:
// sidebar desktop (UjianSidebar) + bottom nav mobile (inline di bawah,
// cuma 3 item jadi gak perlu file terpisah) + header dengan judul halaman
// + tombol kembali ke aplikasi utama & logout.
//
// BEDA dari StudentLayout.js: gak ada dark mode toggle sendiri di sini —
// portal ujian ikut darkMode global aplikasi utama (dioper dari App.js
// lewat menuConfig ctx), karena panitia adalah guru yang sama, bukan
// akun terpisah kayak siswa.
// ========================================================================
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, FileText, ClipboardList, LogOut, ArrowLeftCircle } from "lucide-react";
import UjianSidebar from "./UjianSidebar";

const PAGE_TITLES = {
  "ujian-dashboard": "Dashboard",
  "ujian-jenis": "Jenis Ujian",
  "ujian-laporan": "Laporan Rekap Akhir",
};

const BOTTOM_NAV_ITEMS = [
  { id: "ujian-dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "ujian-jenis", label: "Ujian", icon: FileText },
  { id: "ujian-laporan", label: "Laporan", icon: ClipboardList },
];

export default function UjianLayout({
  children,
  currentPage,
  onPageChange,
  currentUser,
  onLogout,
}) {
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const pageTitle = PAGE_TITLES[currentPage] || "Portal Panitia Ujian";

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    if (onLogout) onLogout();
  };

  return (
    <div className="h-dvh overflow-hidden bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      {/* ====== SIDEBAR (desktop only, hidden di HP) ====== */}
      <UjianSidebar
        currentPage={currentPage}
        onPageChange={onPageChange}
        currentUser={currentUser}
      />

      {/* ====== KONTEN UTAMA — digeser ke kanan di desktop (lg:pl-64) ====== */}
      <div className="lg:pl-64 h-full flex flex-col">
        {/* ====== HEADER ====== */}
        <header className="shrink-0 bg-gradient-to-r from-amber-100 dark:from-amber-900/30 via-orange-100 dark:via-orange-900/30 to-amber-50 dark:to-amber-900/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 text-amber-900 dark:text-gray-100 z-30 shadow-sm border-b border-amber-100/80 dark:border-gray-800 transition-colors duration-200">
          <div className="px-4 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 bg-white/70 dark:bg-gray-800 rounded-full flex items-center justify-center shrink-0 lg:hidden shadow-sm">
                <ClipboardList size={18} className="text-amber-600 dark:text-gray-300" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold leading-tight truncate text-amber-900 dark:text-gray-100">
                  {pageTitle}
                </h1>
                <p className="text-xs text-amber-700/70 dark:text-gray-400 truncate hidden sm:block">
                  Portal Panitia Ujian — {currentUser?.full_name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                  text-amber-800 dark:text-gray-200 bg-white/60 dark:bg-gray-800 hover:bg-white
                  dark:hover:bg-gray-700 shadow-sm transition-colors"
                title="Kembali ke aplikasi utama"
              >
                <ArrowLeftCircle size={16} />
                <span className="hidden sm:inline">Aplikasi Utama</span>
              </button>

              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                  text-rose-600 dark:text-rose-400 bg-white/60 dark:bg-gray-800 hover:bg-rose-50
                  dark:hover:bg-rose-500/10 shadow-sm transition-colors"
                title="Keluar"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </div>
        </header>

        {/* ====== CONTENT — ini doang yang scroll ====== */}
        {/* Lebar sengaja gak dibatasin (beda dari StudentLayout.js yang
            sempit ala portal siswa) -- isi di sini reuse langsung
            JenisUjianMenuTab & sub-fiturnya (sama persis yang admin/TU
            pakai di Manajemen Ujian), yang emang didesain buat lebar
            penuh (tabel, matrix komposisi ruangan, grid card, dst). */}
        <main className="flex-1 overflow-y-auto overscroll-contain w-full px-4 py-5 pb-24 lg:pb-5 space-y-5">
          {children}
        </main>
      </div>

      {/* ====== LOGOUT CONFIRMATION MODAL ====== */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/30 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-amber-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Keluar Dari Portal Ujian?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Kamu harus login kembali buat masuk lagi.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Batal
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== BOTTOM NAV (mobile only, cuma 3 item jadi inline di sini) ====== */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-gray-900
          border-t border-gray-100 dark:border-gray-800 shadow-[0_-4px_24px_rgba(120,53,15,0.08)]
          flex items-stretch"
      >
        {BOTTOM_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onPageChange(item.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
                isActive ? "text-amber-600 dark:text-amber-400" : "text-gray-400 dark:text-gray-500"
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.6 : 2} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
