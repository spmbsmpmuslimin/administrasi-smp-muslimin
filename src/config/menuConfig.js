// [file name]: config/menuConfig.js
// Single source of truth untuk semua route "biasa" (yang lewat ProtectedRoute + LayoutWrapper).
// Route khusus (login "/", "/login-siswa", "/secret-admin-panel-2024", catch-all "*") TETAP
// hardcoded langsung di App.js karena behavior-nya beda (gak pakai Layout / gak pakai ProtectedRoute biasa).
//
// ⚠️ PENTING -- ini file yang BENERAN nge-gembok akses (lihat juga
// ProtectedRoute di components/App.js yang eksekusi pengecekan ini):
//   allowedRoles            : array role yang boleh masuk. [] = semua role login boleh.
//   requireWaliKelas        : true = TAMBAHAN cek khusus (admin ATAU wali kelas)
//   requireWakasekKurikulum : true = TAMBAHAN cek GENERIK ke SEMUA role di allowedRoles
//                             (admin ATAU wakasek kurikulum) -- pakai ini kalau
//                             route memang KHUSUS wakasek kurikulum.
//   teacherRequiresWakasekKurikulum : true = TAMBAHAN cek CUMA buat role
//                             persis "teacher" (role lain di allowedRoles yang
//                             sama TETAP bebas, gak ikut kena syarat ini).
//                             Pakai ini kalau allowedRoles CAMPUR (misal
//                             admin/guru_bk/tu bebas + teacher wajib wakasek).
//   requireRuangBelajarAccess: true = TAMBAHAN cek whitelist by user id
//
// File ini BEDA sama config/sidebarConfig.js (yang cuma ngatur nongol/
// gaknya menu di sidebar, gak ngegembok apa-apa). Sidebar bisa aja
// nyembunyiin menu dari role tertentu, tapi kalau route-nya di sini gak
// dibatasin allowedRoles-nya, role itu TETAP bisa masuk kalau nembak
// URL-nya langsung. Selalu cek 2 file ini BARENGAN pas nambah akses buat
// role/jabatan baru -- nambah di salah satu doang bakal ketauan pas
// testing (baik "menu gak nongol" ATAU "nongol tapi Akses Ditolak").
//
// (Sep 2026, kasus "Monitor Presensi Siswa" buat Wakasek Kurikulum:
// sebelumnya /admin-attendance cuma nambahin "teacher" ke allowedRoles
// tanpa syarat tambahan -- efeknya SEMUA guru mapel biasa teknisnya ikut
// bisa akses via URL langsung, cuma "aman" karena sidebar nyembunyiin
// menu-nya. Sekarang FIXED pakai teacherRequiresWakasekKurikulum: true,
// jadi generik role "teacher" udah beneran digembok cuma buat yang
// Wakasek Kurikulum -- lihat komentar di entry /admin-attendance di
// bawah, dan ProtectedRoute di App.js buat detail implementasinya.)

// Import semua page/module components
import Dashboard from "../components/Dashboard";
import StudentPortal from "../portal-siswa/StudentPortal";
import PortalSiswaGuru from "../pages/PortalSiswaGuru";
import DenahDuduk from "../pages/DenahDuduk";
import Organigram from "../pages/Organigram";
import KeuanganKelas from "../pages/KeuanganKelas";
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
import NilaiRaportSiswa from "../pages/kelola-raport/NilaiRaportSiswa";
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

import KurikulumAdministrasi from "../pages/wakasek-kurikulum/KurikulumAdministrasi";
import AdministrasiTU from "../pages/administrasi-tu/AdministrasiTU";

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
  {
    path: "/keuangan-kelas",
    title: "Info Pembayaran",
    // Read-only: rekap status SPP semua siswa di kelas yang dia pegang
    // sebagai walikelas. Beda dari /administrasi-tu (yang bisa
    // catat/hapus pembayaran) -- walikelas cuma boleh liat.
    component: withPortalBackButton(KeuanganKelas),
    allowedRoles: ["teacher"],
    requireWaliKelas: true,
    getProps: (ctx) => ({ user: ctx.user }),
  },
  { path: "/teachers", title: "Data Guru", component: Teachers },
  { path: "/classes", title: "Data Kelas", component: Classes },
  { path: "/students", title: "Data Siswa", component: Students },
  {
    path: "/data-induk-siswa",
    title: "Data Induk Siswa",
    component: DataSiswaInduk,
    // ✅ FIX (Sep 2026): dibuka lagi buat Wali Kelas -- sebelumnya sempat
    // dibatasin cuma Admin & TU (guru/guru_bk dibuang dari allowedRoles
    // pas "teacher" masih generik ke semua guru mapel, bukan cuma wali
    // kelas). Sekarang "teacher" ditambahin BARENGAN requireWaliKelas:
    // true, jadi yang beneran ke-gembok cuma guru yang emang wali kelas
    // (homeroom_class_id keisi) -- guru mapel biasa TETAP kena Akses
    // Ditolak. "tu" tetap ada karena TU harus akses semua yang Admin bisa.
    // Jangan lupa samain juga show() di sidebarConfig.js (tambah
    // ctx.isWaliKelas) biar menunya kelihatan buat wali kelas.
    allowedRoles: ["admin", "tu", "teacher"],
    requireWaliKelas: true,
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
    //
    // "teacher" di sini SENGAJA generik (gak dibatasin
    // teacherRequiresWakasekKurikulum kayak /admin-attendance) -- karena
    // halaman ini justru DIPERUNTUKKAN buat semua guru isi presensi
    // sendiri, jadi generik itu emang sesuai maksudnya, bukan celah.
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
    // Dulu isi card "Manajemen Nilai Raport" di Setting (?tab=kelola-raport),
    // sekarang dipindah jadi menu utama sendiri buat Admin/TU -- lihat
    // sidebarConfig.js item "nilai-siswa" yang sekarang nge-alihin
    // Admin/TU kesini (bukan ke GradeMain punya Guru).
    path: "/nilai-raport-siswa",
    title: "Nilai Raport Siswa",
    component: NilaiRaportSiswa,
    allowedRoles: ["admin", "tu"],
  },
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
    // ✅ FIX (Sep 2026): "teacher" ditambahin -- Wakasek Kurikulum role-nya
    // tetap "teacher" (ditandai lewat jabatan_struktural, sama pola kayak
    // Wali Kelas), jadi kalau gak ada "teacher" di sini dia kena Akses
    // Ditolak walau menu "Monitor Presensi Siswa" udah muncul di sidebar-nya
    // (lihat sidebarConfig.js grup KURIKULUM).
    //
    // ✅ FIX lanjutan: teacherRequiresWakasekKurikulum: true dipasang biar
    // "teacher" di allowedRoles TIDAK generik ke semua guru mapel --
    // ProtectedRoute (App.js) bakal cek TAMBAHAN khusus buat role
    // "teacher": wajib Wakasek Kurikulum. Admin/guru_bk/tu di allowedRoles
    // yang sama TETAP bebas, gak kena syarat tambahan ini (lihat komentar
    // di ProtectedRoute buat detail logic-nya).
    allowedRoles: ["admin", "guru_bk", "tu", "teacher"],
    teacherRequiresWakasekKurikulum: true,
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

  // ===== DATA & SISTEM (ADMIN/TU) =====
  // ✅ FIX (Sep 2026) -- TAHAP 1 restrukturisasi grup ini (skeleton
  // sidebar + routing dulu, halaman "Manajemen Data" & "Administrasi TU"
  // MASIH belum di-rework/dibikin beneran, lihat komentar di masing2
  // entry di bawah + komentar di sidebarConfig.js grup "sistem"):
  { path: "/spmb", title: "SPMB", component: SPMB },
  // ⚠️ Route ini SENGAJA dipertahankan meski link sidebar-nya udah
  // dihapus (lihat sidebarConfig.js) -- rencananya nanti diakses lewat
  // card "Manajemen SPMB" di dalem halaman /settings (setelah direwrite
  // jadi grid), bukan link langsung di sidebar lagi.
  {
    path: "/settings",
    // ✅ FIX (Sep 2026): title di-rename dari "Pengaturan" -> "Manajemen
    // Data" (samain sama label baru di sidebarConfig.js). Komponen di
    // baliknya (Setting.js) BELUM di-rework -- masih tampilan lama, cuma
    // title/breadcrumb yang berubah dulu. Rework jadi grid card + card
    // baru "Manajemen SPMB" nyusul kalau desainnya udah fix.
    title: "Manajemen Data",
    component: Setting,
    getProps: (ctx) => ({
      ...defaultProps(ctx),
      onToggleDarkMode: ctx.handleToggleDarkMode,
    }),
  },
  {
    path: "/administrasi-tu",
    title: "Administrasi TU",
    // ✅ FIX (Sep 2026) -- update dari placeholder "coming soon" polos
    // jadi card-grid 5 kategori beneran (Persuratan, Arsip & Dokumen,
    // Administrasi Keuangan, Inventaris, Laporan Administrasi), pola sama
    // kayak KurikulumAdministrasi.js. Baru "Persuratan" yang punya skeleton
    // sub-tab (Surat Masuk/Keluar/Disposisi) -- lihat komentar lengkap di
    // AdministrasiTU.js buat urutan build & kategori yang masih
    // ComingSoonPanel.
    component: AdministrasiTU,
    allowedRoles: ["admin", "tu"],
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

  // ===== WAKASEK KURIKULUM =====
  // ✅ FIX (Sep 2026): sebelumnya "Kelola Jadwal Pelajaran" buat wakasek
  // kurikulum cuma numpang tab "jadwal-guru" di /settings (via alias
  // "settings-jadwal-guru" di Layout.js) -- gak ada route sendiri.
  // Sekarang diganti jadi hub "Administrasi": halaman mandiri baru,
  // card-grid sendiri (mirip Setting.js) di
  // src/pages/wakasek-kurikulum/KurikulumAdministrasi.js. Card pertamanya
  // masih "Manajemen Jadwal Pelajaran" (reuse JadwalGuruTab yang sama
  // persis), tapi sekarang jadi wadah buat nampung menu-menu khusus tugas
  // struktural Wakasek Kurikulum kedepannya, biar gak numpuk campur sama
  // menu "Guru Mapel" biasa dia di sidebar.
  //
  // requireWakasekKurikulum: true -> otomatis dicek ProtectedRoute lewat
  // canAccessWakasekKurikulumRoute() (admin ATAU wakasek kurikulum).
  {
    path: "/kurikulum-administrasi",
    title: "Administrasi",
    component: KurikulumAdministrasi,
    allowedRoles: ["admin", "teacher"],
    requireWakasekKurikulum: true,
    getProps: (ctx) => ({
      ...defaultProps(ctx),
      onToggleDarkMode: ctx.handleToggleDarkMode,
    }),
  },
];

export { defaultProps };
