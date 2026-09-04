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
  { path: "/dashboard", component: Dashboard },
  {
    path: "/portal-siswa",
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
    component: PortalSiswaGuru,
    allowedRoles: ["teacher"],
    requireWaliKelas: true,
  },
  {
    path: "/denah-duduk",
    component: withPortalBackButton(DenahDuduk),
    allowedRoles: ["teacher"],
    requireWaliKelas: true,
    getProps: (ctx) => ({ currentUser: ctx.user }),
  },
  {
    path: "/organigram",
    component: withPortalBackButton(Organigram),
    allowedRoles: ["teacher"],
    requireWaliKelas: true,
    getProps: (ctx) => ({ currentUser: ctx.user }),
  },
  { path: "/teachers", component: Teachers },
  { path: "/classes", component: Classes },
  { path: "/students", component: Students },
  {
    path: "/data-induk-siswa",
    component: withPortalBackButton(DataSiswaInduk),
    allowedRoles: ["admin", "teacher", "guru_bk"],
    requireWaliKelas: false,
    getProps: (ctx) => ({ currentUser: ctx.user }),
  },
  { path: "/attendance", component: AttendanceMain },
  {
    path: "/attendance-teacher",
    component: TeacherAttendance,
    allowedRoles: ["teacher", "guru_bk", "admin"],
  },
  {
    path: "/jurnal-harian",
    component: JurnalHarian,
    allowedRoles: ["teacher", "guru_bk"],
  },
  {
    path: "/jurnal-harian-rekap",
    component: AdminJurnalRekap,
    allowedRoles: ["admin"],
  },
  { path: "/nilai-siswa", component: GradeMain },
  {
    path: "/attendance-management",
    component: AttendanceManagement,
    allowedRoles: ["admin"],
  },
  {
    path: "/admin-attendance",
    component: AdminAttendance,
    allowedRoles: ["admin", "guru_bk"],
  },
  { path: "/jadwal-saya", component: TeacherSchedule },
  {
    path: "/kelola-jadwal-pelajaran",
    component: withPortalBackButton(KelolaJadwalPelajaran),
    allowedRoles: ["teacher"],
    requireWaliKelas: true,
  },
  {
    path: "/jadwal-piket",
    component: withPortalBackButton(DutySchedule),
    allowedRoles: ["teacher"],
    requireWaliKelas: true,
    getProps: (ctx) => ({ currentUser: ctx.user }),
  },
  { path: "/catatan-siswa", component: withPortalBackButton(CatatanSiswa) },
  {
    path: "/konseling",
    component: KonselingMain,
    getProps: (ctx) => ({ ...defaultProps(ctx), initialTab: "konseling" }),
  },
  {
    path: "/home-visit",
    component: KonselingMain,
    getProps: (ctx) => ({ ...defaultProps(ctx), initialTab: "home-visit" }),
  },
  { path: "/reports", component: Reports },

  // ===== SISTEM (ADMIN ONLY) =====
  { path: "/spmb", component: SPMB },
  {
    path: "/settings",
    component: Setting,
    getProps: (ctx) => ({
      ...defaultProps(ctx),
      onToggleDarkMode: ctx.handleToggleDarkMode,
    }),
  },
  { path: "/monitor-sistem", component: MonitorSistem },

  // ===== E-RAPORT =====
  {
    path: "/era-dashboard-admin",
    component: DashboardAdmin,
    allowedRoles: ["admin"],
  },
  {
    path: "/era-dashboard-teacher",
    component: DashboardTeacher,
    allowedRoles: ["teacher"],
  },
  {
    path: "/era-dashboard-homeroom",
    component: DashboardHomeroomTeacher,
    allowedRoles: ["teacher"],
    requireWaliKelas: true,
  },
  {
    path: "/era-input-tp",
    component: InputTP,
    allowedRoles: ["admin", "teacher"],
  },
  {
    path: "/era-input-nilai",
    component: InputNilai,
    allowedRoles: ["admin", "teacher"],
  },
  {
    path: "/era-cek-nilai",
    component: CekNilai,
    allowedRoles: ["admin", "teacher"],
  },
  {
    path: "/era-input-kehadiran",
    component: InputKehadiran,
    allowedRoles: ["teacher"],
    requireWaliKelas: true,
  },
  {
    path: "/era-input-catatan",
    component: InputCatatan,
    allowedRoles: ["admin", "teacher"],
    requireWaliKelas: true,
  },
  {
    path: "/era-input-kokurikuler",
    component: InputKokurikuler,
    allowedRoles: ["admin", "teacher"],
    requireWaliKelas: true,
  },
  {
    path: "/era-input-ekstrakurikuler",
    component: InputEkstrakurikuler,
    allowedRoles: ["admin", "teacher"],
    requireWaliKelas: true,
  },
  {
    path: "/era-cek-kelengkapan",
    component: CekStatusNilai,
    allowedRoles: ["teacher"],
    requireWaliKelas: true,
  },
  {
    path: "/era-cetak-raport",
    component: RaportPage,
    allowedRoles: ["teacher"],
    requireWaliKelas: true,
  },

  // ===== RUANG BELAJAR =====
  {
    path: "/ruang-belajar-admin",
    component: RuangBelajarAdmin,
    allowedRoles: ["admin", "teacher"],
    requireRuangBelajarAccess: true, // ← whitelist by user id, lihat config/ruangBelajarAccess.js
  },

  // ===== PERPUSTAKAAN =====
  {
    path: "/katalog-buku",
    component: PerpusMain,
    allowedRoles: ["petugas_perpus"],
    getProps: (ctx) => ({ ...defaultProps(ctx), currentPage: "katalog-buku" }),
  },
  {
    path: "/peminjaman",
    component: PerpusMain,
    allowedRoles: ["petugas_perpus"],
    getProps: (ctx) => ({ ...defaultProps(ctx), currentPage: "peminjaman" }),
  },
  {
    path: "/pengembalian",
    component: PerpusMain,
    allowedRoles: ["petugas_perpus"],
    getProps: (ctx) => ({ ...defaultProps(ctx), currentPage: "pengembalian" }),
  },
];

export { defaultProps };
