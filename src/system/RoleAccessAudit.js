import React, { useState, useMemo } from "react";
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileWarning,
  Info,
} from "lucide-react";

// =====================================================================
// DATA SUMBER: manual, disalin dari config/menuConfig.js
// ⚠️ WAJIB DI-UPDATE MANUAL tiap kali ada route baru / allowedRoles
// berubah di menuConfig.js. Ini BUKAN hasil parse otomatis dari file
// aslinya (React di browser gak bisa baca source code project sendiri),
// jadi anggap ini "cermin" yang perlu disinkronin manual, bukan live data.
// =====================================================================
const ROUTES = [
  { path: "/dashboard", title: "Dashboard", roles: [] },
  { path: "/portal-siswa", title: "Portal Siswa", roles: ["siswa"] },
  { path: "/portal-siswa-guru", title: "Portal Siswa (Guru)", roles: ["teacher"], waliKelas: true },
  { path: "/denah-duduk", title: "Denah Duduk", roles: ["teacher"], waliKelas: true },
  { path: "/organigram", title: "Organigram Kelas", roles: ["teacher"], waliKelas: true },
  { path: "/keuangan-kelas", title: "Info Pembayaran", roles: ["teacher"], waliKelas: true },
  { path: "/teachers", title: "Data Guru", roles: [] },
  { path: "/classes", title: "Data Kelas", roles: [] },
  { path: "/students", title: "Data Siswa", roles: [] },
  {
    path: "/data-induk-siswa",
    title: "Data Induk Siswa",
    roles: ["admin", "tu", "teacher"],
    waliKelas: true,
  },
  { path: "/attendance", title: "Presensi", roles: [] },
  {
    path: "/attendance-teacher",
    title: "Presensi Guru / Monitor Presensi Guru",
    roles: ["teacher", "guru_bk", "admin", "tu"],
    note: "Title & view dinamis di dalam komponen (TeacherAttendance.js): admin/tu -> AdminAttendanceView, lainnya -> form presensi sendiri.",
  },
  { path: "/jurnal-harian", title: "Jurnal Harian", roles: ["teacher"] },
  { path: "/jurnal-harian-rekap", title: "Rekap Jurnal Harian", roles: ["admin"] },
  { path: "/nilai-siswa", title: "Nilai Siswa", roles: [] },
  { path: "/nilai-raport-siswa", title: "Nilai Raport Siswa", roles: ["admin", "tu"] },
  { path: "/attendance-management", title: "Kelola Presensi", roles: ["admin"] },
  {
    path: "/admin-attendance",
    title: "Monitor Presensi (Siswa)",
    roles: ["admin", "guru_bk", "tu", "teacher"],
    teacherRequiresWakasek: true,
  },
  { path: "/jadwal-saya", title: "Jadwal Saya", roles: [] },
  {
    path: "/kelola-jadwal-pelajaran",
    title: "Kelola Jadwal Pelajaran",
    roles: ["teacher"],
    waliKelas: true,
  },
  { path: "/jadwal-piket", title: "Jadwal Piket", roles: ["teacher"], waliKelas: true },
  { path: "/catatan-siswa", title: "Catatan Siswa", roles: [] },
  { path: "/konseling", title: "Konseling", roles: [] },
  { path: "/home-visit", title: "Home Visit", roles: [] },
  {
    path: "/reports",
    title: "Laporan",
    roles: [],
    note: 'Role-check MANUAL di dalam Reports.js (bukan lewat allowedRoles) -- lihat daftar "Komponen dengan role-check manual" di bawah.',
  },
  { path: "/spmb", title: "SPMB", roles: [] },
  { path: "/settings", title: "Manajemen Data", roles: [] },
  { path: "/administrasi-tu", title: "Administrasi TU", roles: ["admin", "tu"] },
  { path: "/monitor-sistem", title: "Monitor Sistem", roles: [] },
  { path: "/era-dashboard-admin", title: "Dashboard E-Raport (Admin)", roles: ["admin"] },
  { path: "/era-dashboard-teacher", title: "Dashboard E-Raport (Guru)", roles: ["teacher"] },
  {
    path: "/era-dashboard-homeroom",
    title: "Dashboard E-Raport (Wali Kelas)",
    roles: ["teacher"],
    waliKelas: true,
  },
  { path: "/era-input-tp", title: "Input Tujuan Pembelajaran", roles: ["admin", "teacher"] },
  { path: "/era-input-nilai", title: "Input Nilai", roles: ["admin", "teacher"] },
  { path: "/era-cek-nilai", title: "Cek Nilai", roles: ["admin", "teacher"] },
  {
    path: "/era-input-kehadiran",
    title: "Input Kehadiran",
    roles: ["teacher"],
    waliKelas: true,
  },
  {
    path: "/era-input-catatan",
    title: "Input Catatan",
    roles: ["admin", "teacher"],
    waliKelas: true,
  },
  {
    path: "/era-input-kokurikuler",
    title: "Input Kokurikuler",
    roles: ["admin", "teacher"],
    waliKelas: true,
  },
  {
    path: "/era-input-ekstrakurikuler",
    title: "Input Ekstrakurikuler",
    roles: ["admin", "teacher"],
    waliKelas: true,
  },
  {
    path: "/era-cek-kelengkapan",
    title: "Cek Kelengkapan Nilai",
    roles: ["teacher"],
    waliKelas: true,
  },
  { path: "/era-cetak-raport", title: "Cetak Raport", roles: ["teacher"], waliKelas: true },
  {
    path: "/ruang-belajar-admin",
    title: "Ruang Belajar",
    roles: ["admin", "teacher"],
    note: "Tambahan: whitelist by user id (requireRuangBelajarAccess).",
  },
  { path: "/katalog-buku", title: "Katalog Buku", roles: ["petugas_perpus"] },
  { path: "/peminjaman", title: "Peminjaman Buku", roles: ["petugas_perpus"] },
  { path: "/pengembalian", title: "Pengembalian Buku", roles: ["petugas_perpus"] },
  {
    path: "/kurikulum-administrasi",
    title: "Administrasi (Wakasek Kurikulum)",
    roles: ["admin", "teacher"],
    wakasekKurikulum: true,
  },
];

// Role yang dianggap "generik" (semua guru mapel) vs yang butuh syarat
// tambahan (wali kelas/wakasek) ditandai lewat note di atas per-route.
const ALL_ROLES = [
  "admin",
  "tu",
  "developer",
  "teacher",
  "guru_bk",
  "siswa",
  "parent",
  "petugas_perpus",
];

const ROLE_LABELS = {
  admin: "Admin",
  tu: "TU",
  developer: "Developer",
  teacher: "Teacher",
  guru_bk: "Guru BK",
  siswa: "Siswa",
  parent: "Ortu",
  petugas_perpus: "Perpus",
};

// =====================================================================
// Komponen dengan role-check MANUAL (di luar menuConfig.js), yang kena
// bug "lupa nambahin role X" berkali-kali. Update daftar ini tiap ketemu
// pola serupa di file lain, biar gak perlu nemu ulang lewat trial & error.
// =====================================================================
const MANUAL_ROLE_CHECKS = [
  {
    file: "reports/Reports.js",
    what: "Nentuin render AdminReports / BKReports / TeacherReports / dst berdasarkan user.role.",
    roles: "admin, tu, developer -> AdminReports",
    status: "fixed",
    lastNote: "developer & tu udah ditambahin (Sep 2026).",
  },
  {
    file: "attendance-teacher/TeacherAttendance.js",
    what: "Nentuin AdminAttendanceView vs form presensi guru biasa (isAdmin check).",
    roles: "admin, tu, developer -> AdminAttendanceView",
    status: "fixed",
    lastNote:
      "Sempat salah tercatat 'fixed' padahal kode masih cuma cek admin -- tu & developer kejatuh ke view guru. Beneran dibenerin (Sep 2026).",
  },
  {
    file: "attendance-teacher/AttendanceTabs.js",
    what: 'Nentuin tab "Generate QR" muncul atau tidak (isAdmin check).',
    roles: "admin, tu, developer -> tab Generate QR muncul",
    status: "fixed",
    lastNote:
      "Sempat salah tercatat 'fixed' padahal kode masih ketinggalan role tu. Beneran dibenerin (Sep 2026), disamain sama isAdmin di TeacherAttendance.js.",
  },
];

const STATUS_STYLE = {
  fixed: {
    icon: CheckCircle2,
    label: "Sudah diperbaiki",
    className: "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20",
  },
  needs_check: {
    icon: AlertTriangle,
    label: "Perlu dicek ulang",
    className: "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20",
  },
};

const RoleAccessAudit = () => {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const filteredRoutes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ROUTES.filter((r) => {
      const matchSearch =
        !q || r.path.toLowerCase().includes(q) || r.title.toLowerCase().includes(q);
      const matchRole =
        roleFilter === "all" || r.roles.length === 0 || r.roles.includes(roleFilter);
      return matchSearch && matchRole;
    });
  }, [search, roleFilter]);

  const hasAccess = (route, role) => {
    if (role === "developer") return true; // bypass global di ProtectedRoute
    if (route.roles.length === 0) return true; // semua role login boleh
    return route.roles.includes(role);
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
            Audit Akses Role
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            Matriks akses tiap route berdasarkan role, plus daftar komponen dengan role-check manual
            yang pernah kena bug "lupa nambahin role".
          </p>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-xs sm:text-sm text-blue-700 dark:text-blue-300">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>
          Data di halaman ini disalin manual dari <code>config/menuConfig.js</code> — bukan
          live/otomatis. Kalau nambah route baru atau ubah <code>allowedRoles</code>, update juga
          array <code>ROUTES</code> di <code>RoleAccessAudit.js</code>.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari path atau nama halaman..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[42px]"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[42px]"
        >
          <option value="all">Semua role</option>
          {ALL_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="min-w-full text-xs sm:text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                Halaman
              </th>
              {ALL_ROLES.map((r) => (
                <th
                  key={r}
                  className="px-2 py-2 font-semibold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap"
                >
                  {ROLE_LABELS[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredRoutes.map((route) => (
              <tr key={route.path} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-3 py-2 align-top">
                  <div className="font-medium text-gray-800 dark:text-gray-100">{route.title}</div>
                  <div className="text-gray-400 dark:text-gray-500 font-mono text-[11px]">
                    {route.path}
                  </div>
                  {(route.waliKelas || route.wakasekKurikulum || route.teacherRequiresWakasek) && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {route.waliKelas && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
                          + wali kelas
                        </span>
                      )}
                      {route.wakasekKurikulum && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                          + wakasek kurikulum
                        </span>
                      )}
                      {route.teacherRequiresWakasek && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                          teacher wajib wakasek
                        </span>
                      )}
                    </div>
                  )}
                  {route.note && (
                    <div className="mt-1 flex items-start gap-1 text-[11px] text-amber-700 dark:text-amber-400">
                      <FileWarning className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      <span>{route.note}</span>
                    </div>
                  )}
                </td>
                {ALL_ROLES.map((r) => (
                  <td key={r} className="px-2 py-2 text-center">
                    {hasAccess(route, r) ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 inline-block" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-300 dark:text-gray-600 inline-block" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
            {filteredRoutes.length === 0 && (
              <tr>
                <td colSpan={ALL_ROLES.length + 1} className="text-center py-6 text-gray-400">
                  Tidak ada halaman yang cocok
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Manual role-check components */}
      <div>
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-2">
          <FileWarning className="w-4 h-4 text-amber-500" />
          Komponen dengan role-check manual (di luar menuConfig)
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          File-file ini nentuin tampilan berdasarkan <code>user.role</code> di dalam komponennya
          sendiri, bukan lewat <code>allowedRoles</code> di menuConfig.js. Rawan kelewat pas ada
          role baru (kayak <code>developer</code>) ditambahin ke sistem.
        </p>
        <div className="space-y-2">
          {MANUAL_ROLE_CHECKS.map((item) => {
            const style = STATUS_STYLE[item.status];
            const StatusIcon = style.icon;
            return (
              <div
                key={item.file}
                className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <code className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {item.file}
                  </code>
                  <span
                    className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${style.className}`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {style.label}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{item.what}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-1">
                  Role tercakup: {item.roles}
                </p>
                <p className="text-[11px] text-gray-400 dark:text-gray-600 mt-0.5 italic">
                  {item.lastNote}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RoleAccessAudit;
