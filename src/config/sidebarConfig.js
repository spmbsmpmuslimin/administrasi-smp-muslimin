// [file name]: config/sidebarConfig.js
// Single source of truth untuk struktur menu di Sidebar.js
//
// ctx yang dikirim ke setiap show()/label()/page() function:
// { isAdmin, isTeacher, isGuruBK, isTU, isWaliKelas, userRole, eraportActive }
//
// Tiap item:
//   page            : string, ATAU function(ctx) => string (buat target dinamis)
//   label           : string, ATAU function(ctx) => string
//   icon            : array of SVG path "d" string (biasanya 1, kadang 2 buat icon 2-layer)
//   show            : function(ctx) => boolean (default: selalu tampil)
//   highlightPages  : array of page key buat nge-highlight menu walau page-nya dinamis
//   indent          : true kalau menu ini sub-item (padding lebih dalam, dipakai di E-RAPORT > Wali Kelas)
//   sectionHeader   : string, render mini-header sebelum item ini (misal "Konseling", "Menu Wali Kelas")
//   sectionHeaderStyle : "main" (default, uppercase besar) | "sub" (lebih kecil, dipakai utk sub-section)

export const sidebarGroups = [
  {
    id: "main",
    title: null,
    items: [
      {
        page: "dashboard",
        label: "Dashboard",
        icon: ["M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z", "m7 7 5-5 5 5"],
      },
    ],
  },

  {
    id: "master-data",
    title: "MASTER DATA",
    items: [
      {
        page: "teachers",
        label: "Data Guru & Staff",
        icon: ["M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"],
      },
      {
        page: "classes",
        label: "Data Kelas",
        icon: [
          "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
        ],
      },
      {
        page: "students",
        label: "Data Siswa",
        icon: [
          "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m9 5.197v1M13 7a4 4 0 11-8 0 4 4 0 018 0z",
        ],
      },
      {
        page: "data-induk-siswa",
        label: "Data Siswa Induk",
        icon: [
          "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
          "M9 14l2 2 4-4",
        ],
        // Sebelumnya cuma bisa diakses walikelas lewat hub "Portal Siswa"
        // (portal-siswa-guru), yang show()-nya cuma isWaliKelas -- admin
        // gak pernah nyampe kesitu walau route-nya (menuConfig.js) udah
        // allowedRoles admin/teacher/guru_bk. Sekarang dikasih entry
        // langsung di sidebar, tapi dibatasi cuma buat Admin.
        show: (ctx) => ctx.isAdmin || ctx.isTU,
      },
    ],
  },

  {
    id: "akademik",
    title: "AKADEMIK",
    items: [
      {
        page: "attendance-teacher",
        label: (ctx) => (ctx.isAdmin || ctx.isTU ? "Monitor Presensi Guru" : "Presensi Guru"),
        icon: ["M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"],
        show: (ctx) => ctx.isAdmin || ctx.isTU || ctx.isTeacher || ctx.isGuruBK,
      },
      {
        page: "attendance",
        label: "Presensi Siswa",
        icon: [
          "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
        ],
        show: (ctx) => ctx.isTeacher || ctx.isGuruBK,
      },
      {
        page: "admin-attendance",
        label: "Monitor Presensi Siswa",
        icon: [
          "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
        ],
        show: (ctx) => ctx.isAdmin || ctx.isTU || ctx.isGuruBK,
      },
      {
        page: "nilai-siswa",
        label: "Nilai Siswa",
        icon: [
          "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
        ],
        show: (ctx) => ctx.isAdmin || ctx.isTU || ctx.isTeacher || ctx.isGuruBK,
      },
      {
        page: "jadwal-saya",
        label: "Jadwal Mengajar",
        icon: [
          "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
        ],
        // ✅ FIX: Guru BK/BP dihilangkan dari menu ini -- Guru BK gak
        // punya jam mengajar reguler kayak guru mapel/wali kelas, jadi
        // menu "Jadwal Mengajar" gak relevan buat role ini.
        show: (ctx) => ctx.isTeacher || ctx.userRole === "homeroom",
      },
      {
        page: "jurnal-harian",
        label: "Jurnal Mengajar",
        icon: [
          "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
        ],
        // ✅ FIX: Guru BK/BP dihilangkan dari menu ini -- jurnal mengajar
        // harian cuma relevan buat guru yang punya jam KBM reguler.
        show: (ctx) => ctx.isTeacher,
      },
      {
        page: "portal-siswa-guru",
        label: "Portal Siswa",
        icon: ["M4 4h6v6H4V4zM14 4h6v6h-6V4zM4 14h6v6H4v-6zM14 14h6v6h-6v-6z"],
        show: (ctx) => ctx.isWaliKelas,
      },
      {
        page: "konseling",
        label: "Data Konseling",
        icon: [
          "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
        ],
        show: (ctx) => ctx.isGuruBK,
        sectionHeader: "Konseling",
      },
      {
        page: "home-visit",
        label: "Home Visit",
        icon: [
          "M3 12l2-2m0 0l7-7 7 7m-14 0v8a2 2 0 002 2h3m6-10l2 2m-2-2v10a2 2 0 01-2 2h-3m0 0v-6h-4v6m4 0H9",
        ],
        show: (ctx) => ctx.isGuruBK,
      },
      {
        page: "reports",
        label: "Laporan",
        icon: [
          "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
        ],
        show: (ctx) => ctx.isAdmin || ctx.isTU || ctx.isWaliKelas || ctx.isTeacher || ctx.isGuruBK,
      },
    ],
  },

  {
    id: "eraport",
    title: "E-RAPORT",
    // ⚠️ Perilaku asli: seluruh grup E-RAPORT disembunyikan dari Admin di sidebar
    // (walaupun Admin tetap punya akses route era-dashboard-admin dkk via App.js).
    // TU disamain kayak Admin -> ikut disembunyikan juga.
    show: (ctx) => ctx.eraportActive && !ctx.isAdmin && !ctx.isTU,
    items: [
      {
        // Target dinamis tergantung role yang login
        page: (ctx) =>
          ctx.isAdmin
            ? "era-dashboard-admin"
            : ctx.isWaliKelas
              ? "era-dashboard-homeroom"
              : "era-dashboard-teacher",
        highlightPages: ["era-dashboard-admin", "era-dashboard-teacher", "era-dashboard-homeroom"],
        label: "Dashboard",
        icon: ["M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z", "m7 7 5-5 5 5"],
      },
      {
        page: "era-input-tp",
        label: "Input TP",
        icon: [
          "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
        ],
      },
      {
        page: "era-input-nilai",
        label: "Input Nilai",
        icon: [
          "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
        ],
      },
      {
        page: "era-cek-nilai",
        label: "Cek Nilai",
        icon: ["M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"],
      },
      // ===== Sub-section "Menu Wali Kelas" =====
      {
        page: "era-input-kehadiran",
        label: "Input Kehadiran",
        icon: [
          "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
        ],
        show: (ctx) => ctx.isWaliKelas || ctx.isAdmin,
        indent: true,
        sectionHeader: "Menu Wali Kelas",
        sectionHeaderStyle: "sub",
      },
      {
        page: "era-input-catatan",
        label: "Input Catatan",
        icon: [
          "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
        ],
        show: (ctx) => ctx.isWaliKelas || ctx.isAdmin,
        indent: true,
      },
      {
        page: "era-input-kokurikuler",
        label: "Input Kokurikuler",
        icon: [
          "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
        ],
        show: (ctx) => ctx.isWaliKelas || ctx.isAdmin,
        indent: true,
      },
      {
        page: "era-input-ekstrakurikuler",
        label: "Input Ekstrakurikuler",
        icon: [
          "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
        ],
        show: (ctx) => ctx.isWaliKelas || ctx.isAdmin,
        indent: true,
      },
      {
        page: "era-cek-kelengkapan",
        label: "Cek Status Nilai",
        icon: [
          "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
        ],
        show: (ctx) => ctx.isWaliKelas || ctx.isAdmin,
        indent: true,
      },
      {
        page: "era-cetak-raport",
        label: "Cetak Nilai",
        icon: [
          "M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z",
        ],
        show: (ctx) => ctx.isWaliKelas || ctx.isAdmin,
        indent: true,
      },
    ],
  },

  {
    id: "perpustakaan",
    title: "PERPUSTAKAAN",
    show: (ctx) => ctx.userRole === "petugas_perpus",
    items: [
      {
        page: "katalog-buku",
        label: "Katalog Buku",
        icon: [
          "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
        ],
      },
      {
        page: "peminjaman",
        label: "Peminjaman",
        icon: ["M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5 5 5M12 5v12"],
      },
      {
        page: "pengembalian",
        label: "Pengembalian",
        icon: ["M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M17 10l-5 5-5-5M12 15V3"],
      },
    ],
  },

  {
    id: "sistem",
    title: "SISTEM",
    show: (ctx) => ctx.isAdmin || ctx.isTU,
    items: [
      {
        page: "spmb",
        label: "SPMB",
        icon: [
          "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
        ],
      },
      {
        page: "settings",
        label: "Pengaturan",
        icon: [
          "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
          "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
        ],
      },
      {
        page: "monitor-sistem",
        label: "Monitor Sistem",
        icon: [
          "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z",
        ],
      },
    ],
  },
];
