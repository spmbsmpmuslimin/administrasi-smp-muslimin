// components/DeveloperDashboard.js
// Dashboard khusus role "developer" -- sebelumnya numpang AdminDashboard,
// sekarang dashboard sendiri: hub navigasi cepat ke SEMUA modul yang ada
// di app (dikelompokin per kategori), biar bisa langsung loncat ke halaman
// mana aja buat QA lintas role tanpa mesti hafal urutan sidebar.
//
// Semua path di bawah disalin dari config/menuConfig.js -- kalau nanti ada
// route baru ditambah di sana, tambahin juga card-nya di sini biar dashboard
// ini tetap jadi "peta lengkap" modul yang ada.
//
// Grup E-RAPORT SENGAJA gak dimasukin -- modul itu lagi dinonaktifkan
// (eraportActive: false), jadi gak ditaro di sini juga (konsisten sama
// sidebarConfig.js yang nge-hide grup itu buat semua role termasuk developer).
//
// REVISI: nambahin search/filter modul + quick-jump antar kategori, dan
// nampilin path route di tiap card (bukan cuma label) -- soalnya dashboard
// ini fungsinya emang buat developer ngecek/loncat ke route, jadi path-nya
// sendiri itu informasi yang kepake, bukan cuma dekorasi.
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Code2,
  LayoutDashboard,
  Users,
  School,
  UserSquare2,
  BookOpenCheck,
  FileBarChart,
  ClipboardCheck,
  CalendarClock,
  NotebookPen,
  ClipboardList as JurnalRekapIcon,
  StickyNote,
  FileText,
  Armchair,
  Network,
  Wallet,
  CalendarDays,
  ClipboardList,
  MessagesSquare,
  Heart,
  Settings,
  Building2,
  Database,
  ClipboardPlus,
  BookMarked,
  BookUp,
  BookDown,
  GraduationCap,
  DoorOpen,
  Smartphone,
  Search,
  X,
  SearchX,
  ArrowUpRight,
} from "lucide-react";
import PageContainer from "./ui/PageContainer";
import Card from "./ui/Card";
import { PageTitle, SectionTitle, Text, Muted } from "./ui/Typography";

// Palet warna ringkas per grup (dipakai buat background icon doang, gak
// serumit CARD_COLOR_STYLES di Setting.js karena di sini jumlah card per
// grup lebih banyak dan variatif).
const GROUP_COLORS = {
  blue: "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400",
  emerald: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400",
  violet: "bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400",
  rose: "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400",
  slate: "bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300",
  cyan: "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400",
};

// ========== DATA: semua modul, dikelompokin per kategori ==========
// Disalin dari menuConfig.js -- title & path harus persis sama.
const MODULE_GROUPS = [
  {
    title: "Akademik & Guru",
    color: "blue",
    items: [
      { path: "/teachers", label: "Data Guru", icon: Users },
      { path: "/classes", label: "Data Kelas", icon: School },
      { path: "/students", label: "Data Siswa", icon: UserSquare2 },
      { path: "/data-induk-siswa", label: "Data Induk Siswa", icon: Database },
      { path: "/nilai-siswa", label: "Nilai Siswa", icon: BookOpenCheck },
      { path: "/nilai-raport-siswa", label: "Nilai Raport Siswa", icon: FileBarChart },
      { path: "/attendance", label: "Presensi", icon: ClipboardCheck },
      { path: "/attendance-teacher", label: "Presensi Guru", icon: ClipboardCheck },
      { path: "/admin-attendance", label: "Monitor Presensi", icon: ClipboardCheck },
      { path: "/attendance-management", label: "Kelola Presensi", icon: ClipboardCheck },
      { path: "/jadwal-saya", label: "Jadwal Saya", icon: CalendarClock },
      { path: "/jurnal-harian", label: "Jurnal Harian", icon: NotebookPen },
      { path: "/jurnal-harian-rekap", label: "Rekap Jurnal Harian", icon: JurnalRekapIcon },
      { path: "/catatan-siswa", label: "Catatan Siswa", icon: StickyNote },
      { path: "/reports", label: "Laporan", icon: FileText },
    ],
  },
  {
    title: "Wali Kelas",
    color: "emerald",
    items: [
      { path: "/portal-siswa-guru", label: "Portal Siswa (Guru)", icon: GraduationCap },
      { path: "/denah-duduk", label: "Denah Duduk", icon: Armchair },
      { path: "/organigram", label: "Organigram Kelas", icon: Network },
      { path: "/keuangan-kelas", label: "Info Pembayaran", icon: Wallet },
      { path: "/kelola-jadwal-pelajaran", label: "Kelola Jadwal Pelajaran", icon: CalendarDays },
      { path: "/jadwal-piket", label: "Jadwal Piket", icon: ClipboardList },
    ],
  },
  {
    title: "Guru BK",
    color: "rose",
    items: [
      { path: "/konseling", label: "Konseling", icon: MessagesSquare },
      { path: "/home-visit", label: "Home Visit", icon: Heart },
    ],
  },
  {
    title: "Data & Sistem",
    color: "slate",
    items: [
      { path: "/settings", label: "Manajemen Data", icon: Settings },
      { path: "/administrasi-tu", label: "Administrasi TU", icon: Building2 },
      { path: "/monitor-sistem", label: "Monitor Sistem", icon: Database },
      { path: "/spmb", label: "SPMB", icon: ClipboardPlus },
    ],
  },
  {
    title: "Perpustakaan",
    color: "amber",
    items: [
      { path: "/katalog-buku", label: "Katalog Buku", icon: BookMarked },
      { path: "/peminjaman", label: "Peminjaman Buku", icon: BookUp },
      { path: "/pengembalian", label: "Pengembalian Buku", icon: BookDown },
    ],
  },
  {
    // ⚠️ Beda dari "Portal Siswa (Guru)" di grup Wali Kelas di atas --
    // ini portal SISWA aslinya (allowedRoles: ["siswa"] di menuConfig.js,
    // developer tetap bisa masuk karena bypass-nya di ProtectedRoute
    // ke-trigger sebelum allowedRoles dicek). Route ini punya layout: false
    // di menuConfig.js, jadi dia gak dibungkus Sidebar/BottomNav biasa --
    // begitu masuk, navigasi baliknya pakai UI sendiri (bukan tombol
    // BottomNav "Home" developer).
    title: "Portal Siswa",
    color: "violet",
    items: [{ path: "/portal-siswa", label: "Portal Siswa (Siswa)", icon: Smartphone }],
  },
  {
    title: "Wakasek Kurikulum & Lainnya",
    color: "cyan",
    items: [
      { path: "/kurikulum-administrasi", label: "Administrasi Kurikulum", icon: LayoutDashboard },
      { path: "/ruang-belajar-admin", label: "Ruang Belajar", icon: DoorOpen },
    ],
  },
];

// Slug id buat tiap grup, dipakai buat anchor scroll-to dari quick-jump nav.
const groupSlug = (title) => `dev-group-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

const totalModuleCount = MODULE_GROUPS.reduce((sum, g) => sum + g.items.length, 0);

const DeveloperDashboard = ({ user, darkMode }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  // Filter grup+item berdasarkan query (cocok di label ATAU path, biar
  // developer yang inget nama route-nya doang tetep ketemu).
  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MODULE_GROUPS;
    return MODULE_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => item.label.toLowerCase().includes(q) || item.path.toLowerCase().includes(q)
      ),
    })).filter((group) => group.items.length > 0);
  }, [query]);

  const isFiltering = query.trim().length > 0;
  const matchCount = filteredGroups.reduce((sum, g) => sum + g.items.length, 0);

  const scrollToGroup = (title) => {
    const el = document.getElementById(groupSlug(title));
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <PageContainer darkMode={darkMode}>
      {/* Header */}
      <Card
        darkMode={darkMode}
        className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 p-4 sm:p-6 dark:border-slate-700 dark:from-gray-800 dark:via-gray-800 dark:to-slate-900"
      >
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="rounded-2xl bg-slate-900 p-3 text-white shadow-lg shadow-slate-900/15 dark:bg-slate-700">
              <Code2 className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0">
              <Muted darkMode={darkMode} className="uppercase tracking-[0.16em]">
                Internal workspace
              </Muted>
              <PageTitle darkMode={darkMode} className="mb-1 mt-1">
                Developer Dashboard
              </PageTitle>
              <Text darkMode={darkMode} className="max-w-2xl">
                Halo, <span className="font-semibold">{user?.full_name || user?.username}</span>.
                Akses cepat untuk QA dan navigasi lintas modul.
              </Text>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:min-w-[190px]">
            <div className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2.5 dark:border-slate-700 dark:bg-gray-900/50">
              <span className="block text-lg font-bold text-slate-900 dark:text-white">
                {totalModuleCount}
              </span>
              <Muted darkMode={darkMode}>Modul</Muted>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2.5 dark:border-slate-700 dark:bg-gray-900/50">
              <span className="block text-lg font-bold text-slate-900 dark:text-white">
                {MODULE_GROUPS.length}
              </span>
              <Muted darkMode={darkMode}>Kategori</Muted>
            </div>
          </div>
        </div>
      </Card>

      {/* Search bar -- buat loncat cepat tanpa scroll-scroll nyari card */}
      <Card darkMode={darkMode} className="mb-4 sm:mb-6 border-slate-200 dark:border-slate-700">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <SectionTitle darkMode={darkMode} className="mb-0">
              Module finder
            </SectionTitle>
            <Muted darkMode={darkMode}>Cari berdasarkan nama modul atau route path.</Muted>
          </div>
          {isFiltering && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {matchCount} hasil
            </span>
          )}
        </div>
        <div className="relative">
          <Search
            className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
              darkMode ? "text-gray-500" : "text-gray-400"
            }`}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari modul, misal 'presensi' atau '/nilai-siswa'..."
            className={`w-full pl-9 pr-9 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 ${
              darkMode
                ? "bg-gray-900 border-gray-700 text-gray-100 placeholder-gray-500"
                : "bg-white border-gray-200 text-gray-800 placeholder-gray-400"
            }`}
          />
          {isFiltering && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label="Hapus pencarian"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </Card>

      {/* Quick-jump antar kategori -- disembunyiin pas lagi searching biar
          gak dobel sama hasil filter yang udah ke-scope sendiri */}
      {!isFiltering && (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:mb-6 sm:grid-cols-3 lg:grid-cols-6">
          {MODULE_GROUPS.map((group) => (
            <button
              key={group.title}
              onClick={() => scrollToGroup(group.title)}
              className={`flex min-h-[52px] items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-all hover:-translate-y-0.5 hover:shadow-sm ${
                darkMode
                  ? "border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600"
                  : "border-gray-200 bg-white text-gray-600 hover:border-slate-300"
              }`}
            >
              <span className="line-clamp-2">{group.title}</span>
              <span className="flex-shrink-0 text-[10px] text-gray-400 dark:text-gray-500">
                {group.items.length}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Notice: E-Raport gak dimasukin karena lagi off */}
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 sm:mb-6 dark:border-amber-900/60 dark:bg-amber-950/20">
        <Muted darkMode={darkMode} className="leading-relaxed text-amber-700 dark:text-amber-300">
          E-Raport tidak ditampilkan karena statusnya masih dinonaktifkan untuk semua role.
        </Muted>
      </div>

      {/* Grup modul (atau hasil filter) */}
      {filteredGroups.length === 0 ? (
        <Card darkMode={darkMode} className="text-center py-10">
          <SearchX
            className={`w-8 h-8 mx-auto mb-2 ${darkMode ? "text-gray-600" : "text-gray-300"}`}
          />
          <Text darkMode={darkMode} className="font-medium">
            Gak ada modul yang cocok
          </Text>
          <Muted darkMode={darkMode}>Coba kata kunci lain, atau cek ejaan path-nya.</Muted>
        </Card>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {filteredGroups.map((group) => (
            <div key={group.title} id={groupSlug(group.title)} className="scroll-mt-4">
              <Card darkMode={darkMode} className="border-slate-200 dark:border-slate-700">
                <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${GROUP_COLORS[group.color].split(" ")[0]}`}
                    />
                    <SectionTitle darkMode={darkMode} className="mb-0 truncate">
                      {group.title}
                    </SectionTitle>
                  </div>
                  <span className="flex-shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {group.items.length} modul
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className="group flex min-h-[76px] items-start gap-2 rounded-lg border border-gray-100 bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:scale-[0.98] dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600 sm:gap-3"
                      >
                        <div
                          className={`p-2 rounded-lg flex-shrink-0 ${GROUP_COLORS[group.color]}`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 leading-tight">
                            {item.label}
                          </span>
                          {/* Path route -- info yang kepake buat developer, bukan dekorasi */}
                          <span className="mt-1 block truncate font-mono text-[10px] text-gray-400 dark:text-gray-500 sm:text-xs">
                            {item.path}
                          </span>
                        </div>
                        <ArrowUpRight className="ml-auto h-3.5 w-3.5 flex-shrink-0 text-gray-300 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-500 dark:text-gray-600 dark:group-hover:text-gray-300" />
                      </button>
                    );
                  })}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
};

export default DeveloperDashboard;
