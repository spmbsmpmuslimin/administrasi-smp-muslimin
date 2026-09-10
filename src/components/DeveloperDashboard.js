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
import React from "react";
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

const DeveloperDashboard = ({ user, darkMode }) => {
  const navigate = useNavigate();

  return (
    <PageContainer darkMode={darkMode}>
      {/* Header */}
      <Card darkMode={darkMode} className="mb-4 sm:mb-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800 text-white rounded-xl shadow-md">
            <Code2 className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <PageTitle darkMode={darkMode} className="mb-1">
              Developer Dashboard
            </PageTitle>
            <Text darkMode={darkMode}>
              Login sebagai <span className="font-medium">{user?.full_name || user?.username}</span>{" "}
              -- akses penuh ke semua menu, tanpa pembatasan role.
            </Text>
          </div>
        </div>
      </Card>

      {/* Notice: E-Raport gak dimasukin karena lagi off */}
      <Card darkMode={darkMode} className="mb-4 sm:mb-6">
        <Muted darkMode={darkMode}>
          Modul E-Raport sengaja tidak ditampilkan di sini -- statusnya masih dinonaktifkan
          (eraportActive: false) untuk semua role, termasuk developer.
        </Muted>
      </Card>

      {/* Grup modul */}
      <div className="space-y-4 sm:space-y-6">
        {MODULE_GROUPS.map((group) => (
          <Card key={group.title} darkMode={darkMode}>
            <SectionTitle darkMode={darkMode} className="mb-3 sm:mb-4">
              {group.title}
            </SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="group flex items-center gap-2 sm:gap-3 rounded-lg p-3 border border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md transition-all text-left active:scale-95 bg-white dark:bg-gray-800"
                  >
                    <div className={`p-2 rounded-lg flex-shrink-0 ${GROUP_COLORS[group.color]}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 leading-tight">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
};

export default DeveloperDashboard;
