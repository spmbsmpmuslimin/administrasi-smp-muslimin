// [file name]: config/menuConfig.js
// Single source of truth untuk semua route "biasa" (yang lewat ProtectedRoute + LayoutWrapper).
// Route khusus (login "/", "/login-siswa", "/secret-admin-panel-2024", catch-all "*") TETAP
// hardcoded langsung di App.js karena behavior-nya beda (gak pakai Layout / gak pakai ProtectedRoute biasa).

// Import semua page/module components
import Dashboard from "../components/Dashboard";
import StudentPortal from "../portal-siswa/StudentPortal";
import PortalSiswaGuru from "../pages/PortalSiswaGuru";
import DenahDuduk from "../pages/DenahDuduk";
import Organigram from "../pages/Organigram";
import { withPortalBackButton } from "../pages/PortalBackButton";
import Teachers from "../pages/Teachers";
import Classes from "../pages/Classes";
import Students from "../pages/Students";
import DataSiswaInduk from "../pages/datasiswa-induk/DataSiswaInduk";
import AttendanceMain from "../pages/attendance/AttendanceMain";
import AttendanceManagement from "../pages/attendance/AttendanceManagement";
import AdminAttendance from "../pages/attendance/AdminAttendance";
import GradeMain from "../pages/grades/GradeMain";
import TeacherSchedule from "../pages/TeacherSchedule";
import KelolaJadwalPelajaran from "../pages/KelolaJadwalPelajaran";
import DutySchedule from "../pages/KelolaJadwalPiket";
import CatatanSiswa from "../pages/CatatanSiswa";
import Setting from "../setting/Setting";

import KonselingMain from "../konseling/KonselingMain";
import Reports from "../reports/Reports";
import SPMB from "../spmb/SPMB";
import MonitorSistem from "../system/MonitorSistem";

import TeacherAttendance from "../attendance-teacher/TeacherAttendance";

import JurnalHarian from "../pages/JurnalHarian";
import AdminJurnalRekap from "../components/AdminJurnalRekap";

import DashboardAdmin from "../e-raport/DashboardAdmin";
import DashboardTeacher from "../e-raport/DashboardTeacher";
import DashboardHomeroomTeacher from "../e-raport/DashboardHomeroomTeacher";
import InputTP from "../e-raport/InputTP";
import InputNilai from "../e-raport/InputNilai";
import InputKehadiran from "../e-raport/InputKehadiran";
import InputCatatan from "../e-raport/InputCatatan";
import InputKokurikuler from "../e-raport/InputKokurikuler";
import InputEkstrakurikuler from "../e-raport/InputEkstrakurikuler";
import CekStatusNilai from "../e-raport/CekStatusNilai";
import CekNilai from "../e-raport/CekNilai";
import RaportPage from "../e-raport/RaportPage";

import PerpusMain from "../perpustakaan/PerpusMain";
import RuangBelajarAdmin from "../portal-siswa/ruang-belajar-admin/RuangBelajarAdmin";

// ========== HELPER: default props buat kebanyakan komponen ==========
// ctx = { user, onShowToast, darkMode, handleLogout, handleToggleDarkMode }
const defaultProps = (ctx) => ({
  user: ctx.user,
  onShowToast: ctx.onShowToast,
  darkMode: ctx.darkMode,
});

// ========== MENU CONFIG ==========
// path              : url path, wajib unik
// component         : komponen React yang dirender
// allowedRoles      : [] artinya semua role yang login boleh akses
// requireWaliKelas  : true kalau khusus wali kelas/admin (lihat canAccessWaliKelasRoute di App.js)
// layout            : false kalau TIDAK mau dibungkus <LayoutWrapper> (default true)
// getProps          : override kalau komponen butuh props selain user/onShowToast/darkMode
// group / label     : dipakai buat Sidebar & breadcrumb kalau nanti mau di-generate dari sini juga

export const menuConfig = [
  // ===== MENU UTAMA & AKADEMIK =====
  { path: "/dashboard", title: "Dashboard", component: Dashboard },
  {
    path: "/portal-siswa",
    title: "Portal Siswa",
    component: StudentPortal,
    allowedRoles: ["siswa"],
    layout: false,
    getProps: (ctx) => ({
      user: ctx.user,
      onShowToast: ctx.onShowToast,
      darkMode: ctx.darkMode,
      onLogout: ctx.handleLogout,
    }),
  },
  {
    path: "/portal-siswa-guru",
    title: "Portal Siswa (Guru)",
    component: PortalSiswaGuru,
    allowedRoles: ["teacher"],
    requireWaliKelas: true,
  },
  {
    path: "/denah-duduk",
    title: "Denah Duduk",
    component: withPortalBackButton(DenahDuduk),
    allowedRoles: ["teacher"],
    requireWaliKelas: true,
    getProps: (ctx) => ({ currentUser: ctx.user }),
  },
  {
    path: "/organigram",
    title: "Organigram Kelas",
    component: withPortalBackButton(Organigram),
    allowedRoles: ["teacher"],
    requireWaliKelas: true,
    getProps: (ctx) => ({ currentUser: ctx.user }),
  },
  { path: "/teachers", title: "Data Guru", component: Teachers },
  { path: "/classes", title: "Data Kelas", component: Classes },
  { path: "/students", title: "Data Siswa", component: Students },
  {
    path: "/data-induk-siswa",
    title: "Data Induk Siswa",
    component: DataSiswaInduk,
    // ✅ FIX: dibuka dari withPortalBackButton(DataSiswaInduk) -- tombol
    // "Kembali ke Portal Siswa" gak relevan lagi buat route ini. Dulu
    // dipakai wali kelas yang masuk lewat hub Portal Siswa, tapi sekarang
    // route ini khusus Admin & TU (lihat allowedRoles di bawah), yang gak
    // pernah masuk lewat Portal Siswa sama sekali.
    // ✅ FIX: "teacher" dibuang -- guru emang gak pernah dikasih lihat menu
    // ini di sidebar (lihat sidebarConfig.js, show-nya cuma isAdmin/isTU),
    // jadi allowedRoles disamain sama apa yang sidebar tampilin. "tu"
    // ditambahin karena TU harus akses semua yang Admin bisa akses.
    // ✅ FIX: "guru_bk" dibuang juga -- sidebar sengaja cuma nampilin menu
    // ini buat Admin & TU, jadi allowedRoles disamain biar route gak lebih
    // longgar dari yang ditampilin sidebar.
    allowedRoles: ["admin", "tu"],
    requireWaliKelas: false,
    getProps: (ctx) => ({ currentUser: ctx.user }),
  },
  { path: "/attendance", title: "Presensi", component: AttendanceMain },
  {
    path: "/attendance-teacher",
    // Dinamis: Admin/TU mantau semua guru, Teacher/Guru BK isi presensi
    // diri sendiri -- title bisa berupa function (user) => string, lihat
    // getCurrentPageName() di Layout.js.
    title: (user) =>
      user?.role === "admin" || user?.role === "tu" ? "Monitor Presensi Guru" : "Presensi Guru",
    component: TeacherAttendance,
    // ✅ FIX: "tu" ditambahin. "teacher" TETAP HARUS ADA -- 1 halaman ini
    // dipakai dobel: Admin/TU liat "Monitor Presensi Guru" (mantau semua
    // guru), sedangkan Teacher/Guru BK liat "Presensi Guru" (isi presensi
    // diri sendiri) -- lihat label() dinamis di sidebarConfig.js. Kalau
    // "teacher" dibuang dari sini, guru kena Akses Ditolak pas mau
    // presensi sendiri walau menunya masih muncul di sidebar mereka.
    allowedRoles: ["teacher", "guru_bk", "admin", "tu"],
  },
  {
    path: "/jurnal-harian",
    title: "Jurnal Harian",
    component: JurnalHarian,
    // ✅ FIX: "guru_bk" dibuang -- sidebar sengaja gak nampilin menu ini
    // buat Guru BK (jurnal mengajar harian cuma relevan buat guru yang
    // punya jam KBM reguler), jadi route disamain biar konsisten.
    allowedRoles: ["teacher"],
  },
  {
    path: "/jurnal-harian-rekap",
    title: "Rekap Jurnal Harian",
    component: AdminJurnalRekap,
    allowedRoles: ["admin"],
  },
  { path: "/nilai-siswa", title: "Nilai Siswa", component: GradeMain },
  {
    path: "/attendance-management",
    title: "Kelola Presensi",
    component: AttendanceManagement,
    allowedRoles: ["admin"],
  },
  {
    path: "/admin-attendance",
    title: "Monitor Presensi",
    component: AdminAttendance,
    allowedRoles: ["admin", "guru_bk", "tu"], // ✅ FIX: tambah "tu"
  },
  { path: "/jadwal-saya", title: "Jadwal Saya", component: TeacherSchedule },
  {
    path: "/kelola-jadwal-pelajaran",
    title: "Kelola Jadwal Pelajaran",
    component: withPortalBackButton(KelolaJadwalPelajaran),
    allowedRoles: ["teacher"],
    requireWaliKelas: true,
  },
  {
    path: "/jadwal-piket",
    title: "Jadwal Piket",
    component: withPortalBackButton(DutySchedule),
    allowedRoles: ["teacher"],
    requireWaliKelas: true,
    getProps: (ctx) => ({ currentUser: ctx.user }),
  },
  {
    path: "/catatan-siswa",
    title: "Catatan Siswa",
    component: withPortalBackButton(CatatanSiswa),
  },
  {
    path: "/konseling",
    title: "Konseling",
    component: KonselingMain,
    getProps: (ctx) => ({ ...defaultProps(ctx), initialTab: "konseling" }),
  },
  {
    path: "/home-visit",
    title: "Home Visit",
    component: KonselingMain,
    getProps: (ctx) => ({ ...defaultProps(ctx), initialTab: "home-visit" }),
  },
  { path: "/reports", title: "Laporan", component: Reports },

  // ===== SISTEM (ADMIN ONLY) =====
  { path: "/spmb", title: "SPMB", component: SPMB },
  {
    path: "/settings",
    title: "Pengaturan",
    component: Setting,
    getProps: (ctx) => ({
      ...defaultProps(ctx),
      onToggleDarkMode: ctx.handleToggleDarkMode,
    }),
  },
  { path: "/monitor-sistem", title: "Monitor Sistem", component: MonitorSistem },

  // ===== E-RAPORT =====
  {
    path: "/era-dashboard-admin",
    title: "Dashboard E-Raport (Admin)",
    component: DashboardAdmin,
    allowedRoles: ["admin"],
  },
  {
    path: "/era-dashboard-teacher",
    title: "Dashboard E-Raport (Guru)",
    component: DashboardTeacher,
    allowedRoles: ["teacher"],
  },
  {
    path: "/era-dashboard-homeroom",
    title: "Dashboard E-Raport (Wali Kelas)",
    component: DashboardHomeroomTeacher,
    allowedRoles: ["teacher"],
    requireWaliKelas: true,
  },
  {
    path: "/era-input-tp",
    title: "Input Tujuan Pembelajaran",
    component: InputTP,
    allowedRoles: ["admin", "teacher"],
  },
  {
    path: "/era-input-nilai",
    title: "Input Nilai",
    component: InputNilai,
    allowedRoles: ["admin", "teacher"],
  },
  {
    path: "/era-cek-nilai",
    title: "Cek Nilai",
    component: CekNilai,
    allowedRoles: ["admin", "teacher"],
  },
  {
    path: "/era-input-kehadiran",
    title: "Input Kehadiran",
    component: InputKehadiran,
    allowedRoles: ["teacher"],
    requireWaliKelas: true,
  },
  {
    path: "/era-input-catatan",
    title: "Input Catatan",
    component: InputCatatan,
    allowedRoles: ["admin", "teacher"],
    requireWaliKelas: true,
  },
  {
    path: "/era-input-kokurikuler",
    title: "Input Kokurikuler",
    component: InputKokurikuler,
    allowedRoles: ["admin", "teacher"],
    requireWaliKelas: true,
  },
  {
    path: "/era-input-ekstrakurikuler",
    title: "Input Ekstrakurikuler",
    component: InputEkstrakurikuler,
    allowedRoles: ["admin", "teacher"],
    requireWaliKelas: true,
  },
  {
    path: "/era-cek-kelengkapan",
    title: "Cek Kelengkapan Nilai",
    component: CekStatusNilai,
    allowedRoles: ["teacher"],
    requireWaliKelas: true,
  },
  {
    path: "/era-cetak-raport",
    title: "Cetak Raport",
    component: RaportPage,
    allowedRoles: ["teacher"],
    requireWaliKelas: true,
  },

  // ===== RUANG BELAJAR =====
  {
    path: "/ruang-belajar-admin",
    title: "Ruang Belajar",
    component: RuangBelajarAdmin,
    allowedRoles: ["admin", "teacher"],
    requireRuangBelajarAccess: true, // ← whitelist by user id, lihat config/ruangBelajarAccess.js
  },

  // ===== PERPUSTAKAAN =====
  {
    path: "/katalog-buku",
    title: "Katalog Buku",
    component: PerpusMain,
    allowedRoles: ["petugas_perpus"],
    getProps: (ctx) => ({ ...defaultProps(ctx), currentPage: "katalog-buku" }),
  },
  {
    path: "/peminjaman",
    title: "Peminjaman Buku",
    component: PerpusMain,
    allowedRoles: ["petugas_perpus"],
    getProps: (ctx) => ({ ...defaultProps(ctx), currentPage: "peminjaman" }),
  },
  {
    path: "/pengembalian",
    title: "Pengembalian Buku",
    component: PerpusMain,
    allowedRoles: ["petugas_perpus"],
    getProps: (ctx) => ({ ...defaultProps(ctx), currentPage: "pengembalian" }),
  },
];

export { defaultProps };
