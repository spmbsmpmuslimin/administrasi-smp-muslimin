// [path]: src/system/SystemTab.js
// [file name]: SystemTab.js
import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import JSZip from "jszip";
import {
  Download,
  Upload,
  AlertTriangle,
  RefreshCw,
  Table,
  FileText,
  Database,
  ChevronDown,
  ChevronRight,
  Search,
} from "lucide-react";

// ✅ FIX (Sep 2026 - revisi UI & sinkronisasi data): dulu 21 tombol export
// ditumpuk rata di 1 grid gede (dikelompokin cuma lewat komentar
// "// Group 1..7", gak keliatan di UI-nya) dan daftarnya ketinggalan jauh
// -- project asli sekarang udah 62 tabel/view (lihat COMPLETE TABLE LIST
// di PerformanceMonitor.js, itu yang paling rajin di-update jadi acuan
// disamain di sini). Sekalian ketauan 4 nama tabel E-Raport yang salah:
// tombol lama manggil "eraport_tp"/"eraport_nilai"/"eraport_kehadiran"/
// "eraport_catatan" yang GAK ADA di database -- nama aslinya
// tujuan_pembelajaran/nilai_eraport/attendance_eraport/catatan_eraport
// (lihat exportDatabaseBackup di bawah yang query-nya udah bener).
// Sekarang dikelompokin jadi TABLE_GROUPS, dirender sebagai section
// collapsible + search box biar tetap enak diakses walau daftar tabelnya
// nambah terus. Nambah tabel baru: tinggal push ke array `tables` grup
// yang paling relevan (atau bikin grup baru), TIDAK perlu ubah apa pun
// di JSX render -- exportAllTablesToCSV juga otomatis ikut nambah karena
// nariknya dari sini juga (bukan daftar hardcode terpisah kayak dulu).
//
// Beberapa entry berakhiran "_view" atau ditandai (View) di description
// PerformanceMonitor.js itu VIEW SQL, bukan tabel fisik -- aman buat
// dibaca/export CSV, tapi TIDAK bisa dipakai buat restore/insert (lihat
// catatan di exportDatabaseBackup/executeRestore, yang masih terpisah
// dan belum ikut di-sinkronin ke 62 tabel ini).
//
// ✅ FIX (Sep 2026 - highlight ganda pas export/backup/restore): dulu
// tombol "Export {tabel}" per-tabel, "Export Semua Tabel ke ZIP", "Download
// Backup Database", dan "Execute Restore" SEMUANYA baca `loading` yang sama
// (state global punya parent, dipassing lewat props). Klik SATU tombol
// bikin `loading` jadi true, terus tombol-tombol LAIN ikut ganti teks jadi
// teks loading masing-masing dan ke-disable/dim bareng -- keliatan kayak
// dua tombol nyala bareng padahal cuma 1 yang jalan. Sekarang:
// - `activeAction` (state lokal: nama tabel / "all" / "backup" / "restore")
//   nentuin tombol MANA yang nampilin teks/spinner aktifnya sendiri.
// - Export per-tabel itu ringan & independen (baca 1 tabel doang), jadi
//   tombol tabel lain TIDAK ikut ke-disable/dim sama sekali selagi tabel
//   lain lagi di-export -- cuma tombol yang diklik yang berubah tampilan.
// - Export Semua / Backup / Restore tetep saling blokir satu sama lain
//   lewat `loading` (bulk operation berat, mending gak numpuk bareng),
//   tapi gak keblokir gara-gara ada 1 export tabel kecil yang lagi jalan.
const TABLE_GROUPS = [
  {
    id: "akademik",
    label: "Akademik & Jadwal",
    color: "blue",
    tables: [
      { name: "academic_years", display: "Tahun Akademik" },
      { name: "academic_events", display: "Agenda Akademik" },
      { name: "event_categories", display: "Kategori Agenda" },
      { name: "classes", display: "Data Kelas" },
      { name: "class_schedules", display: "Jadwal Pelajaran Kelas" },
      { name: "kaldik_documents", display: "Dokumen Kalender Pendidikan" },
      { name: "kelulusan_config", display: "Konfigurasi Kelulusan" },
      { name: "kkm_mapel", display: "KKM per Mata Pelajaran" },
    ],
  },
  {
    id: "siswa",
    label: "Siswa & Kelas",
    color: "emerald",
    tables: [
      { name: "students", display: "Data Siswa" },
      { name: "student_auth", display: "Autentikasi Siswa" },
      { name: "student_devices", display: "Perangkat Siswa" },
      { name: "student_mutations", display: "Mutasi Siswa" },
      { name: "student_profile_details", display: "Detail Profil Siswa" },
      { name: "student_development_notes", display: "Catatan Perkembangan" },
      { name: "class_organization", display: "Struktur Organisasi Kelas" },
      { name: "seating_charts", display: "Denah Tempat Duduk" },
      { name: "duty_schedules", display: "Jadwal Piket" },
    ],
  },
  {
    id: "spmb",
    label: "SPMB & Siswa Baru",
    color: "amber",
    tables: [
      { name: "siswa_baru", display: "Pendaftaran Siswa Baru" },
      { name: "spmb_settings", display: "Pengaturan SPMB" },
    ],
  },
  {
    id: "guru",
    label: "Guru",
    color: "indigo",
    tables: [
      { name: "users", display: "Data Pengguna" },
      { name: "teacher_assignments", display: "Penugasan Guru" },
      { name: "teacher_schedules", display: "Jadwal Guru" },
      { name: "teacher_codes", display: "Kode Akses Guru" },
      { name: "teacher_attendance", display: "Presensi Guru" },
      { name: "teacher_attendance_view", display: "View Presensi Guru" },
      { name: "feedback_guru", display: "Feedback Guru" },
    ],
  },
  {
    id: "presensi-nilai",
    label: "Presensi, Nilai & Konseling",
    color: "cyan",
    tables: [
      { name: "attendances", display: "Data Presensi" },
      { name: "attendances_view", display: "View Presensi" },
      { name: "grades", display: "Data Nilai" },
      { name: "grades_katrol", display: "Nilai Katrol" },
      { name: "grades_katrol_settings", display: "Pengaturan Katrol" },
      { name: "konseling", display: "Data Konseling" },
      { name: "homevisits", display: "Kunjungan Rumah (Home Visit)" },
      {
        name: "tindaklanjut_homevisits",
        display: "Tindak Lanjut Home Visit",
      },
    ],
  },
  {
    id: "jurnal-raport",
    label: "Jurnal & Rapor",
    color: "violet",
    tables: [
      { name: "jurnal_harian", display: "Jurnal Mengajar Harian" },
      { name: "raport_config", display: "Konfigurasi Rapor" },
      { name: "raport_metadata", display: "Metadata Cetak Rapor" },
      { name: "student_report_grades", display: "Nilai Rapor (Import)" },
      { name: "student_reports", display: "Rapor Siswa (Import)" },
    ],
  },
  {
    id: "eraport",
    label: "E-Raport",
    color: "pink",
    tables: [
      { name: "eraport_settings", display: "Pengaturan E-Raport" },
      { name: "tujuan_pembelajaran", display: "Tujuan Pembelajaran (TP)" },
      { name: "nilai_eraport", display: "Nilai Akhir E-Raport" },
      {
        name: "nilai_eraport_detail",
        display: "Detail Capaian TP E-Raport",
      },
      { name: "attendance_eraport", display: "Presensi E-Raport" },
      { name: "catatan_eraport", display: "Catatan Wali Kelas E-Raport" },
      {
        name: "ekstrakurikuler_eraport",
        display: "Ekstrakurikuler E-Raport",
      },
    ],
  },
  {
    id: "perpustakaan",
    label: "Perpustakaan",
    color: "rose",
    tables: [
      { name: "buku", display: "Data Buku" },
      { name: "buku_dengan_stok", display: "View Stok Buku" },
      { name: "buku_stats", display: "Statistik Perpustakaan" },
      { name: "peminjaman", display: "Peminjaman Buku" },
    ],
  },
  {
    id: "portal-komunikasi",
    label: "Portal Siswa & Komunikasi",
    color: "sky",
    tables: [
      { name: "ruang_belajar", display: "Ruang Belajar (Portal Siswa)" },
      { name: "saran_masukan", display: "Saran & Masukan Siswa" },
      { name: "pengumuman_siswa", display: "Pengumuman untuk Siswa" },
      { name: "announcement", display: "Pengumuman" },
      { name: "announcement_reads", display: "Status Baca Pengumuman" },
      { name: "notifications", display: "Notifikasi" },
    ],
  },
  {
    id: "sistem",
    label: "Sistem & Lainnya",
    color: "slate",
    tables: [
      { name: "app_config", display: "Konfigurasi Aplikasi" },
      { name: "audit_logs", display: "Log Audit" },
      { name: "system_health_logs", display: "System Health Logs" },
      { name: "cleanup_history", display: "Riwayat Cleanup" },
      { name: "school_settings", display: "Pengaturan Sekolah" },
      { name: "user_devices", display: "Perangkat Pengguna" },
    ],
  },
];

const TOTAL_TABLE_COUNT = TABLE_GROUPS.reduce((n, g) => n + g.tables.length, 0);
const ERAPORT_TABLE_COUNT = TABLE_GROUPS.find((g) => g.id === "eraport")?.tables.length || 0;
// Dipakai exportAllTablesToCSV -- 1 sumber data flat, gak ada lagi daftar
// hardcode kedua yang bisa kesasar beda sama TABLE_GROUPS.
const ALL_EXPORTABLE_TABLES = TABLE_GROUPS.flatMap((g) => g.tables);

// ✅ FIX (Sep 2026 - sinkronisasi Database Backup/Restore): sebelumnya
// exportDatabaseBackup/executeRestore cuma nyakup 21 dari 62 tabel yang
// ada (hardcoded satu-satu), ketinggalan banyak data penting -- jadwal
// pelajaran (class_schedules), KKM (kkm_mapel), jurnal harian, nilai
// katrol, rapor import, auth siswa, profil siswa/ortu, mutasi siswa,
// jadwal piket, home visit, dll. Sekarang BACKUP_TABLES narik otomatis
// dari ALL_EXPORTABLE_TABLES (MINUS view SQL, karena view gak bisa
// di-insert balik pas restore) -- jadi kalau ada tabel baru ditambah di
// TABLE_GROUPS, backup & restore ikut update otomatis.
const VIEW_TABLE_NAMES = new Set([
  "teacher_attendance_view",
  "attendances_view",
  "buku_dengan_stok",
  "buku_stats",
]);
const BACKUP_TABLES = ALL_EXPORTABLE_TABLES.filter((t) => !VIEW_TABLE_NAMES.has(t.name));

// Warna per grup -- dipisah header/badge/button biar konsisten, ditulis
// lengkap per-kelas (bukan template string `bg-${color}-50`) supaya
// Tailwind bisa nge-scan class-nya pas build (pola sama kayak
// CARD_COLOR_STYLES di MonitorSistem.js).
const GROUP_COLOR_STYLES = {
  blue: {
    header: "text-blue-700 dark:text-blue-300",
    badge: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
    button:
      "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50",
  },
  indigo: {
    header: "text-indigo-700 dark:text-indigo-300",
    badge: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300",
    button:
      "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50",
  },
  emerald: {
    header: "text-emerald-700 dark:text-emerald-300",
    badge: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
    button:
      "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50",
  },
  amber: {
    header: "text-amber-700 dark:text-amber-300",
    badge: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
    button:
      "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50",
  },
  slate: {
    header: "text-slate-700 dark:text-slate-300",
    badge: "bg-slate-100 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300",
    button:
      "bg-slate-50 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900/50",
  },
  pink: {
    header: "text-pink-700 dark:text-pink-300",
    badge: "bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300",
    button:
      "bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-900/50",
  },
  cyan: {
    header: "text-cyan-700 dark:text-cyan-300",
    badge: "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300",
    button:
      "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/50",
  },
  violet: {
    header: "text-violet-700 dark:text-violet-300",
    badge: "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300",
    button:
      "bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/50",
  },
  rose: {
    header: "text-rose-700 dark:text-rose-300",
    badge: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
    button:
      "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50",
  },
  sky: {
    header: "text-sky-700 dark:text-sky-300",
    badge: "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300",
    button:
      "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/50",
  },
};

const SystemTab = ({ user, loading, setLoading, showToast }) => {
  const [schoolSettings, setSchoolSettings] = useState({
    academic_year: "2025/2026",
    school_name: "SMP Muslimin Cililin",
  });
  const [schoolStats, setSchoolStats] = useState({
    total_students: 0,
    total_teachers: 0,
  });
  const [restoreFile, setRestoreFile] = useState(null);
  const [restorePreview, setRestorePreview] = useState(null);
  const [exportProgress, setExportProgress] = useState("");
  // ✅ BARU: search + collapsible group state buat card "Export Data ke
  // CSV" -- default cuma grup pertama ("Akademik") yang kebuka, sisanya
  // collapsed biar gak langsung numpuk panjang pas halaman dibuka.
  const [tableSearch, setTableSearch] = useState("");
  const [openGroupIds, setOpenGroupIds] = useState(() => new Set(["akademik"]));
  // ✅ FIX (Sep 2026 - highlight ganda pas export/backup): dulu tombol
  // "Export {tabel}" per-tabel, "Export Semua Tabel ke ZIP", "Download
  // Backup Database", dan "Execute Restore" SEMUANYA baca `loading` yang
  // sama (state punya parent, di-passing lewat props), jadi klik SATU
  // tombol bikin tombol-tombol LAIN ikut ganti teks & ke-disable/dim bareng.
  // `activeAction` (state lokal) nyimpen AKSI yang beneran lagi jalan: nama
  // tabel (export per-tabel), "all", "backup", atau "restore" -- cuma
  // tombol yang cocok yang nampilin teks/style aktifnya. Export per-tabel
  // sengaja TIDAK saling blokir sesama tombol tabel (baca 1 tabel doang,
  // ringan) -- yang saling blokir cuma Export Semua/Backup/Restore lewat
  // `loading`, karena itu bulk operation berat.
  const [activeAction, setActiveAction] = useState(null);

  const toggleGroup = (id) => {
    setOpenGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isSearching = tableSearch.trim().length > 0;
  const filteredGroups = TABLE_GROUPS.map((group) => ({
    ...group,
    tables: isSearching
      ? group.tables.filter((t) =>
          t.display.toLowerCase().includes(tableSearch.trim().toLowerCase())
        )
      : group.tables,
  })).filter((group) => group.tables.length > 0);

  const getCurrentAcademicYear = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (currentMonth >= 7) {
      return `${currentYear + 1}/${currentYear + 2}`;
    } else {
      return `${currentYear}/${currentYear + 1}`;
    }
  };

  useEffect(() => {
    loadSchoolData();
  }, []);

  const loadSchoolData = async () => {
    try {
      setLoading(true);

      const { data: settingsData, error: settingsError } = await supabase
        .from("school_settings")
        .select("setting_key, setting_value");

      if (settingsError) throw settingsError;

      if (settingsData && settingsData.length > 0) {
        const settings = {};
        settingsData.forEach((item) => {
          settings[item.setting_key] = item.setting_value;
        });
        setSchoolSettings((prev) => ({
          ...prev,
          academic_year: settings.academic_year || getCurrentAcademicYear(),
          school_name: settings.school_name || prev.school_name,
        }));
      } else {
        setSchoolSettings((prev) => ({
          ...prev,
          academic_year: getCurrentAcademicYear(),
        }));
      }

      const [teachersRes, studentsRes] = await Promise.all([
        // ✅ FIX: role di DB itu "teacher"/"guru_bk", bukan "guru_mapel"/
        // "guru_walikelas" (wali kelas cuma "teacher" yang punya
        // homeroom_class_id, bukan role terpisah) -- sebelumnya query ini
        // gak pernah match satupun guru, jadi "Total Guru" di halaman ini
        // selalu ke-underscount parah.
        supabase.from("users").select("id").in("role", ["admin", "teacher", "guru_bk"]),
        supabase.from("students").select("id").eq("is_active", true),
      ]);

      if (teachersRes.error) throw teachersRes.error;
      if (studentsRes.error) throw studentsRes.error;

      setSchoolStats({
        total_students: studentsRes.data?.length || 0,
        total_teachers: teachersRes.data?.length || 0,
      });
    } catch (error) {
      console.error("Error loading school data:", error);
      showToast("Error memuat data sekolah", "error");
    } finally {
      setLoading(false);
    }
  };

  const convertToCSV = (data) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return "";
    }

    const validData = data.filter((item) => item !== null && typeof item === "object");
    if (validData.length === 0) return "";

    const headers = Object.keys(validData[0]);
    const csvHeaders = headers.join(",");

    const csvRows = validData.map((row) => {
      return headers
        .map((header) => {
          let value = row[header];
          if (value === null || value === undefined) {
            value = "";
          }
          value = String(value);
          if (value.includes(",") || value.includes('"') || value.includes("\n")) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(",");
    });

    return [csvHeaders, ...csvRows].join("\n");
  };

  const exportTableToCSV = async (tableName, displayName) => {
    try {
      setActiveAction(tableName);
      setExportProgress(`Mengambil data ${displayName}...`);

      const { data, error } = await supabase.from(tableName).select("*");

      if (error) throw error;

      if (!data || data.length === 0) {
        showToast(`Tidak ada data di tabel ${displayName}`, "warning");
        return;
      }

      setExportProgress(`Mengkonversi ${data.length} records...`);
      const csvContent = convertToCSV(data);

      if (!csvContent) {
        showToast(`Data ${displayName} tidak valid untuk di-export`, "error");
        return;
      }

      setExportProgress("Membuat file...");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      const schoolName = (schoolSettings.school_name || "SMP_Muslimin_Cililin").replace(
        /\s+/g,
        "_"
      );
      const academicYear = (schoolSettings.academic_year || getCurrentAcademicYear()).replace(
        "/",
        "_"
      );
      const date = new Date().toISOString().split("T")[0];

      a.href = url;
      a.download = `${schoolName}_${tableName}_${academicYear}_${date}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast(`${displayName} berhasil di-export! (${data.length} records)`, "success");
    } catch (error) {
      console.error(`Error exporting ${tableName}:`, error);
      showToast(`Error exporting ${displayName}: ${error.message}`, "error");
    } finally {
      setActiveAction(null);
      setExportProgress("");
    }
  };

  // ✅ FIX (Sep 2026 - revisi export semua tabel): dulu tiap tabel bikin
  // <a download> + Blob URL sendiri-sendiri, jadi 1 klik tombol ini bisa
  // munculin puluhan file .csv sekaligus di folder Downloads (dan browser
  // sering nge-block download beruntun kayak gitu). Sekarang semua CSV
  // dikumpulin ke satu instance JSZip (folder di dalam zip = per grup
  // tabel, biar rapi) lalu di-generate & didownload SEKALI sebagai satu
  // file .zip. Progress text tetap jalan per-tabel (`table.display`)
  // supaya user masih lihat proses jalan, cuma hasil akhirnya 1 file.
  // Catatan: perlu tambah dependency "jszip" (npm install jszip) kalau
  // belum ada di project ini.
  const exportAllTablesToCSV = async () => {
    try {
      setLoading(true);
      setActiveAction("all");

      // Dipakai exportAllTablesToCSV -- 1 sumber data flat, gak ada lagi
      // daftar hardcode kedua yang bisa kesasar beda sama TABLE_GROUPS.
      const tables = ALL_EXPORTABLE_TABLES;

      const zip = new JSZip();
      let exportedCount = 0;
      const skippedTables = [];

      const schoolName = (schoolSettings.school_name || "SMP_Muslimin_Cililin").replace(
        /\s+/g,
        "_"
      );
      const academicYear = (schoolSettings.academic_year || getCurrentAcademicYear()).replace(
        "/",
        "_"
      );
      const date = new Date().toISOString().split("T")[0];

      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];

        try {
          setExportProgress(`Mengambil ${table.display} (${i + 1}/${tables.length})...`);

          const { data, error } = await supabase.from(table.name).select("*");

          if (error) {
            console.error(`Error fetching ${table.name}:`, error);
            skippedTables.push(table.display);
            continue;
          }

          if (data && data.length > 0) {
            const csvContent = convertToCSV(data);
            if (csvContent) {
              // Masukin ke folder per grup tabel (mis. "akademik/classes.csv")
              // biar isi zip-nya gak numpuk rata 62 file di root.
              const groupId =
                TABLE_GROUPS.find((g) => g.tables.some((t) => t.name === table.name))?.id ||
                "lainnya";
              zip.file(`${groupId}/${table.name}.csv`, csvContent);
              exportedCount++;
            }
          }
        } catch (tableError) {
          console.error(`Error exporting ${table.name}:`, tableError);
          skippedTables.push(table.display);
        }
      }

      if (exportedCount === 0) {
        showToast("Tidak ada data untuk di-export", "warning");
        return;
      }

      setExportProgress(`Membuat file ZIP (${exportedCount} tabel)...`);
      const zipBlob = await zip.generateAsync({ type: "blob" });

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${schoolName}_export_semua_tabel_${academicYear}_${date}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const skippedNote =
        skippedTables.length > 0 ? ` (${skippedTables.length} tabel dilewati/kosong)` : "";
      showToast(
        `✅ ${exportedCount} tabel berhasil di-export ke 1 file ZIP!${skippedNote}`,
        "success"
      );
    } catch (error) {
      console.error("Error exporting all tables:", error);
      showToast("Error exporting data", "error");
    } finally {
      setLoading(false);
      setActiveAction(null);
      setExportProgress("");
    }
  };

  const exportDatabaseBackup = async () => {
    try {
      setLoading(true);
      setActiveAction("backup");

      const data = {};
      const failedTables = [];

      for (let i = 0; i < BACKUP_TABLES.length; i++) {
        const table = BACKUP_TABLES[i];
        setExportProgress(`Mengambil ${table.display} (${i + 1}/${BACKUP_TABLES.length})...`);

        const { data: rows, error } = await supabase.from(table.name).select("*");

        if (error) {
          console.error(`Error fetching ${table.name}:`, error);
          failedTables.push(table.display);
          data[table.name] = [];
          continue;
        }
        data[table.name] = rows || [];
      }

      setExportProgress("Membuat file backup...");

      // Key di `stats` dan `data` sama-sama pakai nama tabel asli (bukan
      // alias custom kayak dulu "eraport_tp"/"eraport_kehadiran") biar gak
      // ada lagi kesasar nama pas restore.
      const stats = {};
      BACKUP_TABLES.forEach((table) => {
        stats[table.name] = data[table.name]?.length || 0;
      });

      const backupData = {
        timestamp: new Date().toISOString(),
        academic_year: schoolSettings.academic_year || getCurrentAcademicYear(),
        school_info: schoolSettings,
        data,
        stats,
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      const schoolName = (schoolSettings.school_name || "SMP_Muslimin_Cililin").replace(
        /\s+/g,
        "_"
      );
      const academicYear = (schoolSettings.academic_year || getCurrentAcademicYear()).replace(
        "/",
        "_"
      );
      const date = new Date().toISOString().split("T")[0];

      a.href = url;
      a.download = `${schoolName}_backup_${academicYear}_${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const failedNote =
        failedTables.length > 0
          ? ` (⚠️ ${failedTables.length} tabel gagal diambil: ${failedTables.join(", ")})`
          : "";
      showToast(
        `✅ Database backup (${BACKUP_TABLES.length} tabel) berhasil didownload!${failedNote}`,
        failedTables.length > 0 ? "warning" : "success"
      );
    } catch (error) {
      console.error("Error creating backup:", error);
      showToast("❌ Error membuat database backup: " + error.message, "error");
    } finally {
      setLoading(false);
      setActiveAction(null);
      setExportProgress("");
    }
  };

  const handleRestoreFile = (event) => {
    const file = event.target.files[0];
    if (file) {
      setRestoreFile(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const backupData = JSON.parse(e.target.result);

          if (!backupData.data || !backupData.stats) {
            throw new Error("Format backup tidak valid");
          }

          // Total record & jumlah tabel keisi dihitung langsung dari
          // `stats` (key = nama tabel) -- generik, gak perlu diinget
          // manual field mana aja yang mau dijumlah kayak dulu.
          const statsValues = Object.values(backupData.stats);
          const totalRecords = statsValues.reduce((sum, n) => sum + (n || 0), 0);
          const totalTablesFilled = statsValues.filter((n) => (n || 0) > 0).length;

          setRestorePreview({
            timestamp: backupData.timestamp,
            academic_year: backupData.academic_year,
            school_info: backupData.school_info,
            stats: backupData.stats,
            totalRecords,
            totalTablesFilled,
            totalTables: Object.keys(backupData.stats).length,
          });
        } catch (error) {
          showToast("Format file backup tidak valid: " + error.message, "error");
          setRestoreFile(null);
        }
      };
      reader.readAsText(file);
    }
  };

  const executeRestore = async () => {
    if (!restoreFile) return;

    const confirmed = window.confirm(
      `PERINGATAN: Restore akan menimpa semua data yang ada!\n\n` +
        `Backup dari: ${new Date(restorePreview.timestamp).toLocaleString("id-ID")}\n` +
        `Tahun Ajaran: ${restorePreview.academic_year}\n` +
        `Sekolah: ${restorePreview.school_info?.school_name}\n\n` +
        `Total ${restorePreview.totalRecords} records dari ${restorePreview.totalTablesFilled} tabel (dari ${restorePreview.totalTables} tabel yang didukung) akan di-restore.\n\n` +
        `Tindakan ini TIDAK DAPAT DIBATALKAN. Apakah Anda yakin?`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      setActiveAction("restore");
      setExportProgress("Membaca file backup...");

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const backupData = JSON.parse(e.target.result);

          // ✅ FIX (Sep 2026 - sinkronisasi ke BACKUP_TABLES/62 tabel):
          // dulu delete & insert ditulis manual satu-satu untuk 21 tabel.
          // Sekarang generik: urutan DELETE = kebalikan urutan
          // BACKUP_TABLES (BACKUP_TABLES sendiri ngikut urutan
          // TABLE_GROUPS dari yang paling "induk" akademik/siswa/guru ke
          // yang paling "anak"/transaksional -- jadi pas delete, tabel
          // "anak" dihapus duluan, tabel induk belakangan biar gak
          // nabrak foreign key). Ini best-effort berdasarkan pengelompokan
          // TABLE_GROUPS, BUKAN peta foreign key asli database -- kalau
          // ada error FK di tabel tertentu, errornya kelihatan di console
          // dan TIDAK ngehentiin proses delete/insert tabel lain.
          const deleteOrder = [...BACKUP_TABLES].reverse();

          for (let i = 0; i < deleteOrder.length; i++) {
            const table = deleteOrder[i];
            setExportProgress(
              `Menghapus data lama: ${table.display} (${i + 1}/${deleteOrder.length})...`
            );
            const { error } = await supabase
              .from(table.name)
              .delete()
              .neq("id", "00000000-0000-0000-0000-000000000000");
            if (error) console.error(`Error deleting ${table.name}:`, error);
          }

          let insertedTables = 0;
          const totalTables = BACKUP_TABLES.length;

          for (const table of BACKUP_TABLES) {
            const rows = backupData.data[table.name];
            if (rows?.length > 0) {
              setExportProgress(`Restore ${table.display} (${++insertedTables}/${totalTables})...`);
              const { error } = await supabase.from(table.name).insert(rows);
              if (error) console.error(`Error inserting ${table.name}:`, error);
            }
          }

          showToast("✅ Database berhasil di-restore!", "success");
          setRestoreFile(null);
          setRestorePreview(null);

          setExportProgress("Memuat ulang data...");
          await loadSchoolData();
        } catch (error) {
          console.error("Error restoring backup:", error);
          showToast("❌ Error restoring database: " + error.message, "error");
        } finally {
          setLoading(false);
          setActiveAction(null);
          setExportProgress("");
        }
      };

      reader.readAsText(restoreFile);
    } catch (error) {
      console.error("Error reading restore file:", error);
      showToast("Error membaca file backup", "error");
      setLoading(false);
      setActiveAction(null);
      setExportProgress("");
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
          System Management
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
          SMP Muslimin Cililin - Backup & Restore Database
        </p>

        {exportProgress && (
          <div className="mt-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="animate-spin text-blue-600 dark:text-blue-400" size={20} />
              <span className="text-sm sm:text-base text-blue-800 dark:text-blue-300 font-medium">
                {exportProgress}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ✅ FIX (Sep 2026): section "System Health Monitor Card" DIHAPUS --
          isinya cuma tombol navigate("/monitor-sistem"), padahal SystemTab
          ini sendiri sekarang udah jadi salah satu card DI DALAM halaman
          Monitor Sistem (dipindah dari Setting.js, lihat MonitorSistem.js).
          Efeknya dulu cuma balik ke grid Monitor Sistem yang sama persis
          kayak tombol "Kembali" yang udah ada di header halaman itu --
          mubazir & bikin bingung ("loh kok balik ke sini lagi"). */}

      {/* Export Individual Tables to CSV */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-5 md:p-6 mb-6 sm:mb-8 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="text-blue-600 dark:text-blue-400" size={20} />
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">
            Export Data ke CSV
          </h3>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-5 text-sm sm:text-base">
          Export data per tabel ke format CSV untuk analisis atau backup selektif.{" "}
          {TOTAL_TABLE_COUNT} tabel, dikelompokkan per kategori biar gampang dicari.
        </p>

        {/* Search tabel */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            placeholder="Cari nama tabel... (contoh: nilai, presensi, siswa)"
            className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[42px]"
          />
        </div>

        {/* Groups */}
        <div className="space-y-2.5 mb-5">
          {filteredGroups.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
              Gak ada tabel yang cocok sama "{tableSearch}".
            </p>
          )}

          {filteredGroups.map((group) => {
            const style = GROUP_COLOR_STYLES[group.color] || GROUP_COLOR_STYLES.blue;
            const isOpen = isSearching || openGroupIds.has(group.id);

            return (
              <div
                key={group.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-900/40 hover:bg-gray-100 dark:hover:bg-gray-900/70 transition-colors min-h-[44px]"
                >
                  <span className={`font-semibold text-sm ${style.header}`}>{group.label}</span>
                  <span className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${style.badge}`}
                    >
                      {group.tables.length} tabel
                    </span>
                    {isOpen ? (
                      <ChevronDown size={16} className="text-gray-400 dark:text-gray-500" />
                    ) : (
                      <ChevronRight size={16} className="text-gray-400 dark:text-gray-500" />
                    )}
                  </span>
                </button>

                {isOpen && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 p-3">
                    {group.tables.map((t) => {
                      // Cuma tombol yang beneran diklik (isActive) yang
                      // berubah tampilan (spinner + ring). Export per-tabel
                      // itu ringan & independen -- baca 1 tabel doang --
                      // jadi tombol tabel LAIN gak perlu ikut ke-disable/dim
                      // sama sekali selama gak ada BULK op (Export Semua /
                      // Backup / Restore, ditandai `loading`) yang jalan.
                      const isActive = activeAction === t.name;
                      const isDisabled = isActive || loading;

                      return (
                        <button
                          key={t.name}
                          onClick={() => exportTableToCSV(t.name, t.display)}
                          disabled={isDisabled}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors min-h-[44px] ${
                            isActive
                              ? `${style.button} ring-2 ring-current`
                              : loading
                                ? "opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-900/30 text-gray-400 dark:text-gray-600"
                                : style.button
                          }`}
                        >
                          {isActive ? (
                            <RefreshCw size={16} className="animate-spin" />
                          ) : (
                            <Table size={16} />
                          )}
                          <span className="truncate">
                            {isActive ? `Mengexport ${t.display}...` : `Export ${t.display}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Export All Button */}
        <button
          onClick={exportAllTablesToCSV}
          disabled={loading}
          className="flex items-center justify-center gap-3 px-5 py-4 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 font-bold transition-colors w-full min-h-[44px] mb-5"
        >
          <FileText size={20} />
          <span className="text-base">
            {activeAction === "all"
              ? "Membuat ZIP..."
              : `Export Semua Tabel ke ZIP (${TOTAL_TABLE_COUNT} Tabel)`}
          </span>
        </button>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
            ℹ️ Total {TOTAL_TABLE_COUNT} tabel yang didukung untuk export (termasuk{" "}
            {ERAPORT_TABLE_COUNT} tabel E-Raport)
          </p>
        </div>
      </div>

      {/* Database Backup */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-5 md:p-6 mb-6 sm:mb-8 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Download className="text-blue-600 dark:text-blue-400" size={20} />
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">
            Database Backup (JSON)
          </h3>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-5 text-sm sm:text-base">
          Download backup lengkap database untuk keperluan keamanan dan migrasi data.
        </p>

        <button
          onClick={exportDatabaseBackup}
          disabled={loading}
          className="flex items-center justify-center gap-3 px-5 sm:px-6 py-3.5 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 font-bold transition-colors w-full sm:w-auto min-h-[44px] mb-5"
        >
          <Download size={20} />
          <span className="text-base">
            {activeAction === "backup" ? "Membuat Backup..." : "Download Backup Database (JSON)"}
          </span>
        </button>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-300 font-medium mb-3">
            ℹ️ Backup akan berisi semua data dari {BACKUP_TABLES.length} tabel (semua tabel fisik
            kecuali view SQL, yang emang gak bisa direstore):
          </p>
          {/* Ditampilin per grup (bukan 1-1 tiap tabel kayak dulu) biar
              ringkas -- daftar lengkap nama tabelnya sama persis kayak di
              section "Export Data ke CSV" di atas. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-blue-700 dark:text-blue-400">
            {TABLE_GROUPS.map((group) => {
              const includedCount = group.tables.filter(
                (t) => !VIEW_TABLE_NAMES.has(t.name)
              ).length;
              if (includedCount === 0) return null;
              return (
                <div key={group.id} className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                  <span>
                    {group.label} ({includedCount} tabel)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Database Restore */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-5 md:p-6 mb-6 sm:mb-8 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Upload className="text-red-600 dark:text-red-400" size={20} />
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">
            Database Restore
          </h3>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-5 text-sm sm:text-base">
          Upload dan restore backup database.{" "}
          <span className="text-red-600 dark:text-red-400 font-bold">
            PERHATIAN: Ini akan menimpa semua data yang ada!
          </span>
        </p>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Upload Backup File (.json)
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleRestoreFile}
              disabled={loading}
              className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-3 file:px-5 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50 disabled:opacity-50 cursor-pointer"
            />
          </div>

          {restorePreview && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-xl p-4 sm:p-5">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle
                  className="text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-1"
                  size={20}
                />
                <div className="flex-1">
                  <h4 className="font-bold text-yellow-800 dark:text-yellow-300 text-base mb-3">
                    ⚠️ Backup File Preview
                  </h4>
                  <div className="text-sm text-yellow-700 dark:text-yellow-400 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <p>
                        <strong className="block text-xs">Tanggal Backup:</strong>
                        {new Date(restorePreview.timestamp).toLocaleString("id-ID")}
                      </p>
                      <p>
                        <strong className="block text-xs">Tahun Ajaran:</strong>
                        {restorePreview.academic_year}
                      </p>
                      <p>
                        <strong className="block text-xs">Sekolah:</strong>
                        {restorePreview.school_info?.school_name}
                      </p>
                      <p>
                        <strong className="block text-xs">Total Records:</strong>
                        {restorePreview.totalRecords || 0} records dari{" "}
                        {restorePreview.totalTablesFilled || 0} tabel
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 mt-5">
                    <button
                      onClick={executeRestore}
                      disabled={loading}
                      className="flex items-center justify-center gap-3 px-5 py-3.5 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-800 disabled:opacity-50 font-bold transition-colors min-h-[44px]"
                    >
                      {activeAction === "restore" ? (
                        <>
                          <RefreshCw className="animate-spin" size={18} />
                          <span>Restoring...</span>
                        </>
                      ) : (
                        "Execute Restore"
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setRestoreFile(null);
                        setRestorePreview(null);
                      }}
                      disabled={loading}
                      className="px-5 py-3.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 font-medium transition-colors min-h-[44px]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* System Information */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 sm:p-5 md:p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Database className="text-blue-600 dark:text-blue-400" size={20} />
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">
            Informasi Sistem
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
              Database
            </label>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              Supabase PostgreSQL
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
              Total Records
            </label>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {schoolStats.total_students + schoolStats.total_teachers} pengguna
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
              Tahun Ajaran
            </label>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {schoolSettings.academic_year}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
              Nama Sekolah
            </label>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {schoolSettings.school_name}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              👨‍🏫 {schoolStats.total_teachers} guru
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              👨‍🎓 {schoolStats.total_students} siswa
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              🏫 SMP Muslimin Cililin
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemTab;
