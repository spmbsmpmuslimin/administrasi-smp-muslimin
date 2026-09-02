// students/StudentLayout.js
// ========================================================================
// Layout khusus portal siswa. Dipakai buat SEMUA halaman siswa (Dashboard,
// Jadwal, Presensi, Lainnya) biar header + bottom nav konsisten di semua
// halaman — bukan cuma nempel di StudentDashboard.js kayak sebelumnya.
//
// UPDATE:
// - Tombol Logout yang dulu nempel di sidebar & di header (cuma muncul pas
//   di halaman dashboard) sekarang disatuin jadi dropdown "Profile" di
//   header, di sebelah jam live. Isinya: Profil Saya, Mode Gelap, Keluar.
//   Dropdown ini tampil di SEMUA halaman & SEMUA ukuran layar biar konsisten.
// - Mode Gelap toggle nge-set class "dark" di <html>, jadi utility
//   `dark:` di Tailwind otomatis ke-apply ke seluruh app (asal tailwind
//   config-nya `darkMode: "class"`). Preferensinya disimpan di localStorage.
// ========================================================================
import { useState, useEffect, useRef } from "react";
import {
  User,
  LogOut,
  Moon,
  Sun,
  ChevronDown,
  UserCircle,
  KeyRound,
  Smartphone,
} from "lucide-react";
import StudentBottomNav from "./StudentBottomNav";
import StudentSidebar from "./StudentSidebar";

const PAGE_TITLES = {
  "student-dashboard": "Beranda",
  "student-jadwal": "Jadwal Pelajaran",
  "student-presensi": "Presensi Saya",
  "student-belajar": "Belajar",
  "student-lainnya": "Info",
};

function getInitials(name) {
  const words = (name || "").trim().split(" ").filter(Boolean);
  if (words.length === 0) return "S";
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// Jam + tanggal live di header. Update tiap detik biar jamnya jalan,
// tapi cuma re-render komponen kecil ini (bukan seluruh layout).
function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const time = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const dateLine = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="hidden sm:flex flex-col items-end leading-tight shrink-0">
      <span className="text-base sm:text-lg font-bold text-blue-900 dark:text-gray-100 tabular-nums">
        {time}
      </span>
      <span className="text-[10px] sm:text-xs font-medium text-blue-500 dark:text-gray-400 whitespace-nowrap">
        {dateLine}
      </span>
    </div>
  );
}

// Dropdown Profile: avatar + nama singkat -> Profil Saya / Mode Gelap / Keluar
function ProfileMenu({
  currentUser,
  darkMode,
  onToggleDarkMode,
  onGoToPassword,
  onGoToDevices,
  onRequestLogout,
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const initials = getInitials(currentUser?.full_name);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-full border border-violet-200/70 dark:border-gray-700 bg-gradient-to-br from-violet-100 via-purple-100 to-indigo-100 dark:bg-gray-800/70 hover:from-violet-200 hover:via-purple-200 hover:to-indigo-200 dark:hover:bg-gray-800 shadow-sm transition-all duration-200"
        aria-haspopup="true"
        aria-expanded={open}>
        <UserCircle
          size={18}
          className="text-violet-600 dark:text-gray-300 shrink-0"
        />
        <span className="text-sm font-semibold text-violet-700 dark:text-gray-100">
          Profil
        </span>
        <ChevronDown
          size={14}
          className={`text-violet-500 dark:text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Identitas user */}
          <div className="p-4 bg-gradient-to-br from-blue-50 dark:from-blue-950/30 to-indigo-50 dark:to-indigo-950/30 dark:from-gray-900 dark:to-gray-900 flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0 ring-2 ring-white dark:ring-gray-800 shadow">
              <span className="text-white text-sm font-bold">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {currentUser?.full_name || "Siswa"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                @{currentUser?.username || "-"}
              </p>
            </div>
          </div>

          <div className="p-1.5">
            <button
              onClick={() => {
                setOpen(false);
                onGoToPassword();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:bg-gray-950/30 dark:hover:bg-gray-700/60 transition-colors">
              <KeyRound
                size={18}
                className="text-gray-400 dark:text-gray-500"
              />
              Ganti Password
            </button>

            <button
              onClick={() => {
                setOpen(false);
                onGoToDevices();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:bg-gray-950/30 dark:hover:bg-gray-700/60 transition-colors">
              <Smartphone
                size={18}
                className="text-gray-400 dark:text-gray-500"
              />
              Perangkat Terhubung
            </button>

            {/* Mode Gelap: toggle switch, dropdown tetap kebuka biar keliatan efeknya */}
            <button
              onClick={onToggleDarkMode}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:bg-gray-950/30 dark:hover:bg-gray-700/60 transition-colors">
              {darkMode ? (
                <Moon size={18} className="text-gray-400 dark:text-gray-500" />
              ) : (
                <Sun size={18} className="text-gray-400 dark:text-gray-500" />
              )}
              <span className="flex-1 text-left">Mode Gelap</span>
              <span
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${
                  darkMode ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-600"
                }`}>
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                    darkMode ? "translate-x-4.5 ml-0.5" : "translate-x-0.5"
                  }`}
                />
              </span>
            </button>

            <div className="my-1 h-px bg-gray-100 dark:bg-gray-700" />

            <button
              onClick={() => {
                setOpen(false);
                onRequestLogout();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:bg-rose-950/30 dark:hover:bg-rose-500/10 transition-colors">
              <LogOut size={18} />
              Keluar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudentLayout({
  children,
  currentPage,
  onPageChange,
  currentUser,
  onLogout,
}) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("student-dark-mode") === "true";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("student-dark-mode", String(darkMode));
  }, [darkMode]);

  const pageTitle = PAGE_TITLES[currentPage] || "Portal Siswa";

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    if (onLogout) onLogout();
  };

  return (
    // h-dvh + overflow-hidden di root: document/<body> SENGAJA gak dibiarin
    // scroll sendiri. Kalau body yang scroll, di iOS pas swipe mentok
    // atas/bawah dia "rubber-band"/bounce, dan efek bounce itu ikut
    // nge-drag semua elemen position:fixed (termasuk StudentBottomNav).
    // Solusinya: shell utama fixed-height, cuma <main> di dalam yang
    // scroll (overflow-y-auto), jadi bottom nav bener-bener statis.
    <div className="h-dvh overflow-hidden bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      {/* ====== SIDEBAR (desktop only, hidden di HP) ====== */}
      <StudentSidebar
        currentPage={currentPage}
        onPageChange={onPageChange}
        currentUser={currentUser}
      />

      {/* ====== KONTEN UTAMA — digeser ke kanan di desktop biar gak
          ketiban sidebar (lg:w-64 -> lg:pl-64) ====== */}
      <div className="lg:pl-64 h-full flex flex-col">
        {/* ====== HEADER ====== */}
        <header className="shrink-0 bg-gradient-to-r from-sky-100 dark:from-sky-900/30 via-blue-100 dark:via-blue-900/30 to-indigo-100 dark:to-indigo-900/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 text-blue-900 dark:text-gray-100 z-30 shadow-sm border-b border-blue-100/80 dark:border-gray-800 transition-colors duration-200">
          <div className="px-4 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 bg-white/70 dark:bg-gray-800 rounded-full flex items-center justify-center shrink-0 lg:hidden shadow-sm">
                <User size={18} className="text-blue-500 dark:text-gray-300" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold leading-tight truncate text-blue-900 dark:text-gray-100">
                  {pageTitle}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {currentPage === "student-dashboard" && <LiveClock />}
              <ProfileMenu
                currentUser={currentUser}
                darkMode={darkMode}
                onToggleDarkMode={() => setDarkMode((v) => !v)}
                onGoToPassword={() =>
                  onPageChange("student-lainnya", "password")
                }
                onGoToDevices={() => onPageChange("student-lainnya", "devices")}
                onRequestLogout={() => setShowLogoutConfirm(true)}
              />
            </div>
          </div>
        </header>

        {/* ====== CONTENT — ini doang yang scroll, bukan document/body ====== */}
        <main className="flex-1 overflow-y-auto overscroll-contain max-w-lg lg:max-w-3xl mx-auto w-full px-4 py-5 pb-24 lg:pb-5 space-y-5">
          {children}
        </main>
      </div>

      {/* ====== LOGOUT CONFIRMATION MODAL ====== */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/30 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/30 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Keluar Dari Portal Siswa?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Kamu Harus Login Kembali Buat Masuk Lagi.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:bg-gray-950/30 dark:hover:bg-gray-700 transition-colors font-medium">
                Batal
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== BOTTOM NAV (mobile only, sudah lg:hidden bawaan) ====== */}
      <StudentBottomNav currentPage={currentPage} onPageChange={onPageChange} />
    </div>
  );
}
