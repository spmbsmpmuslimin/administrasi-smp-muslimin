import React, { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "../supabaseClient";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
  Trash2,
  Database,
  Calendar,
  Play,
  Settings,
  CheckCircle,
  AlertTriangle,
  Info,
} from "lucide-react";
import { debugLog, debugWarn } from "./debugLog";

// Browser gak bisa jalanin cleanup terjadwal beneran di background (gak
// ada server yang nungguin) -- "auto cleanup" yang paling realistis
// dikerjain di sisi client cuma REMINDER: pas halaman ini dibuka, cek
// kapan terakhir kali cleanup dijalanin, dan kasih tau kalau udah lewat
// dari N hari. Auto cleanup beneran (jalan sendiri tanpa ada yang buka
// halaman) butuh Supabase Edge Function + pg_cron di sisi server.
const REMINDER_INTERVAL_DAYS = 7;

const DatabaseCleanupMonitor = ({ user, onShowToast }) => {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [cleanupHistory, setCleanupHistory] = useState([]);
  const [autoCleanup, setAutoCleanup] = useState({
    enabled: true,
    healthLogsRetention: 7,
    // 1100 hari = 3 tahun ajaran (3x365 + 1 hari buat jaga-jaga tahun
    // kabisat) -- biar presensi siswa yang masuk kelas 7 tetep ada
    // datanya sampe dia lulus kelas 9, gak kehapus di tengah jalan.
    attendanceRetention: 1100,
  });

  // Modal konfirmasi custom (pastel, konsisten sama gaya card lain),
  // gantiin window.confirm() bawaan browser yang kesannya kurang
  // "meyakinkan" buat aksi delete permanen. window.confirm() itu
  // sinkron & blocking, jadi buat gantiinnya di dalem alur async kita
  // pakai pattern Promise + resolver disimpen di ref: askConfirm()
  // nge-buka modal & nge-return Promise yang baru resolve pas user
  // klik salah satu tombol di modal.
  const [confirmState, setConfirmState] = useState({ open: false, message: "" });
  const confirmResolverRef = useRef(null);

  const askConfirm = (message) => {
    return new Promise((resolve) => {
      confirmResolverRef.current = resolve;
      setConfirmState({ open: true, message });
    });
  };

  const respondToConfirm = (result) => {
    setConfirmState({ open: false, message: "" });
    if (confirmResolverRef.current) {
      confirmResolverRef.current(result);
      confirmResolverRef.current = null;
    }
  };

  // Notifikasi hasil aksi -- pakai toast dari parent (MonitorSistem) kalau
  // ada, biar konsisten sama card lain. Fallback ke alert() cuma buat
  // jaga-jaga kalau suatu saat komponen ini dipanggil dari tempat lain
  // yang gak nyediain onShowToast.
  const notify = (message, type = "info") => {
    if (onShowToast) {
      onShowToast(message, type);
    } else {
      alert(message);
    }
  };

  // `enabled` sekarang beneran ngontrol sesuatu: nyala/matiin reminder
  // banner di bawah. cleanupHistory[0] = entri terbaru (query-nya udah
  // di-order descending di fetchCleanupHistory), jadi dipake sebagai
  // "kapan terakhir kali cleanup jalan".
  const daysSinceLastCleanup = useMemo(() => {
    if (!cleanupHistory || cleanupHistory.length === 0) return null;
    const lastRun = new Date(cleanupHistory[0].timestamp);
    const diffMs = Date.now() - lastRun.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }, [cleanupHistory]);

  const isCleanupOverdue =
    autoCleanup.enabled &&
    (daysSinceLastCleanup === null || daysSinceLastCleanup >= REMINDER_INTERVAL_DAYS);

  // Fetch database statistics
  const fetchStats = async () => {
    try {
      // NOTE: daftar tabel ini HANYA dipakai untuk breakdown per-tabel di UI
      // (dan target tombol cleanup di bawah), BUKAN untuk total keseluruhan lagi.
      // Total record & ukuran database sekarang diambil dari RPC yang menyapu
      // SEMUA tabel (lihat get_database_stats_detailed di bawah), jadi kalau
      // ada tabel baru ditambahkan ke database, totalnya otomatis ikut update
      // tanpa perlu edit array ini.
      const tables = [
        // Diurutkan dari yang paling banyak rows -> paling sedikit
        // (berdasarkan hasil query pg_stat_user_tables per 2026-09-07)
        "attendances", // 2528 - presensi harian siswa
        "student_report_grades", // 984
        "class_schedules", // 774
        "teacher_schedules", // 738
        "student_profile_details", // 663
        "student_auth", // 663
        "students", // 663
        "student_graduations", // 616
        "teacher_assignments", // 228
        "siswa_baru", // 220
        "grades", // 112 - nilai per assignment/ulangan
        "student_reports", // 82
        "student_devices", // 65
        "teacher_codes", // 42
        "users", // 33
        "system_health_logs", // 28 - log health check (target auto-cleanup)
        "user_devices", // 14
        "cleanup_history", // 7
        "academic_years", // 6
        "class_organization", // 6
        "teacher_attendance", // 4 - presensi harian guru
      ];

      // Fetch semua count secara PARALEL (bukan satu-satu/sequential) biar
      // nggak numpuk latency. Sebelumnya ini pakai for...of + await yang
      // nunggu tiap tabel selesai dulu baru lanjut ke tabel berikutnya -
      // itu yang bikin "Run Cleanup" kerasa lama, karena fetchStats() ini
      // ke-trigger 2x tiap klik cleanup (sebelum & sesudah cleanup jalan).
      const tableStats = {};

      const countResults = await Promise.all(
        tables.map(async (table) => {
          const { count, error } = await supabase
            .from(table)
            .select("*", { count: "exact", head: true });
          return { table, count: error ? null : count || 0, error };
        })
      );

      countResults.forEach(({ table, count, error }) => {
        if (!error) {
          tableStats[table] = count;
        }
      });

      // TRY to get REAL database size + REAL total rows (semua tabel) dari PostgreSQL
      let totalRecords;
      let estimatedSizeMB;
      let percentUsed;
      let isRealSize = false;

      try {
        const { data: detailedData, error: rpcError } = await supabase
          .rpc("get_database_stats_detailed")
          .single();

        if (!rpcError && detailedData) {
          // Use REAL size & REAL total rows dari PostgreSQL ✅ (semua tabel, bukan cuma yang di-list di atas)
          estimatedSizeMB = detailedData.database_size_mb;
          percentUsed = detailedData.percent_used;
          totalRecords = detailedData.total_rows;
          isRealSize = true;
          debugLog(
            "✅ Using REAL database size & total rows from PostgreSQL:",
            estimatedSizeMB,
            "MB /",
            totalRecords,
            "rows"
          );
        } else {
          throw new Error("RPC function not available");
        }
      } catch (rpcError) {
        // Fallback ke estimasi dari 9 tabel yang di-track manual di atas
        // (kurang akurat karena tidak mencakup semua tabel, tapi lebih baik
        // daripada tidak ada angka sama sekali kalau RPC belum ter-deploy)
        debugWarn("⚠️ RPC function not available, using estimation from tracked tables only");
        totalRecords = Object.values(tableStats).reduce((sum, count) => sum + count, 0);
        estimatedSizeMB = totalRecords * 0.00433;
        percentUsed = ((estimatedSizeMB / 500) * 100).toFixed(1);
        isRealSize = false;
      }

      setStats({
        tables: tableStats,
        totalRecords,
        estimatedSizeMB: parseFloat(estimatedSizeMB).toFixed(2),
        percentUsed: parseFloat(percentUsed).toFixed(1),
        isRealSize: isRealSize,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  // Cari student_id dari semua siswa yang udah lulus, buat dipake nyaring
  // attendances mereka -- match lewat NIS, karena student_graduations
  // TERNYATA gak punya kolom student_id yang FK langsung ke `students`
  // (isinya snapshot data siswa pas lulus, independen dari tabel students).
  //
  // Di-chunk per 150 NIS/ID biar query .in() gak kepanjangan kalau jumlah
  // alumni-nya banyak (PostgREST punya batas panjang query string).
  const CHUNK_SIZE = 150;
  const chunkArray = (arr, size) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };

  const fetchGraduatedStudentIds = async () => {
    const { data: graduations, error: gradError } = await supabase
      .from("student_graduations")
      .select("nis")
      .not("nis", "is", null);
    if (gradError) throw gradError;

    const graduatedNis = [...new Set((graduations || []).map((g) => g.nis).filter(Boolean))];
    if (graduatedNis.length === 0) return [];

    const nisChunks = chunkArray(graduatedNis, CHUNK_SIZE);
    const chunkResults = await Promise.all(
      nisChunks.map(async (chunk) => {
        const { data, error } = await supabase.from("students").select("id").in("nis", chunk);
        if (error) throw error;
        return data || [];
      })
    );

    return [...new Set(chunkResults.flat().map((s) => s.id))];
  };

  // Ambil attendances milik sekumpulan student_id, di-chunk juga sama
  // alasannya kayak di atas.
  const fetchAttendancesByStudentIds = async (studentIds) => {
    if (!studentIds || studentIds.length === 0) return [];
    const idChunks = chunkArray(studentIds, CHUNK_SIZE);
    const chunkResults = await Promise.all(
      idChunks.map(async (chunk) => {
        const { data, error } = await supabase
          .from("attendances")
          .select("*")
          .in("student_id", chunk);
        if (error) throw error;
        return data || [];
      })
    );
    return chunkResults.flat();
  };

  // delete-nya beneran jalan -- jadi walau kehapus dari database, datanya
  // tetep ada dalam bentuk arsip. Dipanggil dari runManualCleanup(),
  // bukan dari dalem cleanupHealthLogs/cleanupOldAttendances, biar bisa
  // digabung jadi 1 file & 1 kali trigger download (bukan 2 file kepisah).
  const exportCleanupArchive = async ({ healthRows, attendanceRows }) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Monitor Sistem - Database Cleanup";
    workbook.created = new Date();

    const addSheet = (sheetName, rows) => {
      if (!rows || rows.length === 0) return;
      const sheet = workbook.addWorksheet(sheetName);
      const columnKeys = Object.keys(rows[0]);
      sheet.columns = columnKeys.map((key) => ({ header: key, key, width: 20 }));
      rows.forEach((row) => sheet.addRow(row));
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFDDEBF7" },
      };
    };

    addSheet("System Health Logs", healthRows);
    addSheet("Attendances", attendanceRows);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
      now.getDate()
    ).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

    saveAs(blob, `arsip-cleanup-${stamp}.xlsx`);
  };

  // Cleanup health logs -- terima `rows` yang UDAH di-select & di-export
  // duluan di runManualCleanup(), bukan query ulang pake retentionDays.
  // Ini penting: kalau delete pake filter tanggal terpisah dari yang
  // dipake buat export, ada celah waktu di mana row BARU (yang lolos dari
  // export karena belum ada pas export jalan) bisa ikut kehapus tanpa
  // sempet ke-arsip. Delete by id dari rows yang sama = dijamin konsisten.
  const cleanupHealthLogs = async (rows) => {
    if (!rows || rows.length === 0) {
      return { success: true, deletedCount: 0, table: "system_health_logs" };
    }
    try {
      const ids = rows.map((r) => r.id);
      const { data, error } = await supabase
        .from("system_health_logs")
        .delete()
        .in("id", ids)
        .select("id");

      if (error) throw error;

      return {
        success: true,
        deletedCount: data?.length || 0,
        table: "system_health_logs",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        table: "system_health_logs",
      };
    }
  };

  // Cleanup old attendances -- sama pola-nya kayak cleanupHealthLogs di atas.
  const cleanupOldAttendances = async (rows) => {
    if (!rows || rows.length === 0) {
      return { success: true, deletedCount: 0, table: "attendances" };
    }
    try {
      const ids = rows.map((r) => r.id);
      const { data, error } = await supabase
        .from("attendances")
        .delete()
        .in("id", ids)
        .select("id");

      if (error) throw error;

      return {
        success: true,
        deletedCount: data?.length || 0,
        table: "attendances",
      };
    } catch (error) {
      return { success: false, error: error.message, table: "attendances" };
    }
  };

  // Run manual cleanup
  const runManualCleanup = async () => {
    const confirmed = await askConfirm(
      `Yakin mau jalankan cleanup?\n\nData lama (Health Logs > ${autoCleanup.healthLogsRetention} hari, Attendance > ${autoCleanup.attendanceRetention} hari, ATAU attendance siswa yang udah lulus) akan di-EXPORT dulu ke file Excel, baru dihapus PERMANEN dari database.`
    );
    if (!confirmed) return;

    setLoading(true);
    const results = [];

    try {
      // 1) Ambil dulu SEMUA row yang bakal kehapus (belum di-delete apapun
      // di titik ini) -- ini jadi satu-satunya sumber data buat export
      // MAUPUN delete, biar dua-duanya dijamin persis sama.
      const healthCutoff = new Date();
      healthCutoff.setDate(healthCutoff.getDate() - autoCleanup.healthLogsRetention);

      const attendanceCutoff = new Date();
      attendanceCutoff.setDate(attendanceCutoff.getDate() - autoCleanup.attendanceRetention);

      const { data: healthRows, error: healthSelectError } = await supabase
        .from("system_health_logs")
        .select("*")
        .lt("created_at", healthCutoff.toISOString());
      if (healthSelectError) throw healthSelectError;

      // Attendance yang di-archive = UNION dari 2 kondisi:
      //   a) lebih tua dari attendanceRetention hari (safety net umum,
      //      biar data yang gak nyambung ke siswa manapun tetep kebersihin)
      //   b) attendance milik siswa yang UDAH LULUS -- langsung eligible
      //      begitu ada record-nya di student_graduations, gak nunggu
      //      umur hari-nya lewat retention (sesuai keputusan: no grace
      //      period).
      const { data: oldAttendanceRows, error: oldAttendanceError } = await supabase
        .from("attendances")
        .select("*")
        .lt("date", attendanceCutoff.toISOString().split("T")[0]);
      if (oldAttendanceError) throw oldAttendanceError;

      const graduatedStudentIds = await fetchGraduatedStudentIds();
      const graduatedAttendanceRows = await fetchAttendancesByStudentIds(graduatedStudentIds);

      // Gabung + dedupe by id (bisa aja 1 row masuk 2 kondisi sekaligus),
      // sambil nandain alasan penghapusannya buat transparansi di arsip
      // Excel -- kolom ini murni buat dokumentasi, gak ngaruh ke delete.
      const attendanceRowsMap = new Map();
      (oldAttendanceRows || []).forEach((row) => {
        attendanceRowsMap.set(row.id, { ...row, alasan_dihapus: "retensi_hari_terlewati" });
      });
      graduatedAttendanceRows.forEach((row) => {
        const existing = attendanceRowsMap.get(row.id);
        attendanceRowsMap.set(row.id, {
          ...row,
          alasan_dihapus: existing ? "retensi_hari_terlewati + siswa_lulus" : "siswa_lulus",
        });
      });
      const attendanceRows = Array.from(attendanceRowsMap.values());

      const hasDataToArchive = (healthRows?.length || 0) > 0 || attendanceRows.length > 0;

      // 2) Export ke Excel DULU, sebelum delete apapun dijalankan. Kalau
      // export-nya gagal (misal ExcelJS error), delete gak akan jalan --
      // exception di sini otomatis loncat ke catch block di bawah.
      if (hasDataToArchive) {
        await exportCleanupArchive({ healthRows, attendanceRows });
      }

      // 3) Baru delete beneran, pake rows yang SAMA persis kayak yang
      // barusan di-export.
      const healthResult = await cleanupHealthLogs(healthRows);
      results.push(healthResult);

      const attendanceResult = await cleanupOldAttendances(attendanceRows);
      results.push(attendanceResult);

      // Save to history -- pakai identitas user yang beneran ngejalanin
      // (kalau ada), bukan string statis "manual" terus, biar ada audit
      // trail: siapa yang mencet Run Cleanup.
      await supabase.from("cleanup_history").insert({
        results: results,
        triggered_by: user?.email || user?.username || user?.name || "manual",
        timestamp: new Date().toISOString(),
      });

      // Refresh stats
      await fetchStats();
      await fetchCleanupHistory();

      notify(
        hasDataToArchive
          ? "Cleanup berhasil! Data lama sudah di-export ke Excel & dihapus dari database."
          : "Cleanup selesai — gak ada data lama yang perlu dihapus.",
        "success"
      );
    } catch (error) {
      console.error("Cleanup error:", error);
      notify(`Cleanup gagal: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch cleanup history
  const fetchCleanupHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("cleanup_history")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(10);

      if (!error && data) {
        setCleanupHistory(data);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchCleanupHistory();
  }, []);

  const getStatusColor = (percent) => {
    if (percent < 50) return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30";
    if (percent < 80)
      return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30";
    return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30";
  };

  // Helper function to safely parse results
  const parseResults = (results) => {
    if (!results) return [];
    if (Array.isArray(results)) return results;

    // If it's a string, try to parse it
    if (typeof results === "string") {
      try {
        const parsed = JSON.parse(results);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    // If it's an object with tables_cleaned property
    if (results.tables_cleaned && Array.isArray(results.tables_cleaned)) {
      return results.tables_cleaned;
    }

    return [];
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Database className="w-6 h-6 sm:w-7 sm:h-7" />
            <span className="truncate">Database Cleanup Manager</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">
            Monitor dan kelola penggunaan database
          </p>
        </div>
        <button
          onClick={runManualCleanup}
          disabled={loading}
          className="
            w-full sm:w-auto 
            flex items-center justify-center gap-2 
            px-4 py-3 sm:py-2.5 
            bg-blue-600 dark:bg-blue-700 
            hover:bg-blue-700 dark:hover:bg-blue-600 
            text-white 
            rounded-lg 
            disabled:bg-gray-400 dark:disabled:bg-gray-700 
            disabled:cursor-not-allowed 
            transition-colors
            min-h-[44px]
            font-medium text-sm
          "
        >
          <Play className="w-4 h-4 sm:w-5 sm:h-5" />
          {loading ? "Running..." : "Run Cleanup"}
        </button>
      </div>

      {/* Reminder Banner -- ini yang bikin toggle "enabled" di Cleanup
          Settings beneran ngefek. Cuma muncul pas halaman ini dibuka &
          udah lewat >= REMINDER_INTERVAL_DAYS sejak cleanup terakhir. */}
      {isCleanupOverdue && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 sm:p-4 flex items-start sm:items-center justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5 sm:mt-0" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              {daysSinceLastCleanup === null
                ? "Belum pernah dijalankan cleanup sama sekali."
                : `Udah ${daysSinceLastCleanup} hari sejak cleanup terakhir.`}{" "}
              Disaranin jalanin cleanup tiap {REMINDER_INTERVAL_DAYS} hari biar storage gak numpuk.
            </p>
          </div>
          <button
            onClick={runManualCleanup}
            disabled={loading}
            className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white transition-colors"
          >
            Run Cleanup Sekarang
          </button>
        </div>
      )}

      {/* Database Usage Overview */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md dark:shadow-none border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Records</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 mt-1 truncate">
                {stats.totalRecords?.toLocaleString() || 0}
              </p>
            </div>
            <Database className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500 dark:text-blue-400 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md dark:shadow-none border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                {stats.isRealSize ? (
                  <>
                    Database Size
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                      ✓ Real
                    </span>
                  </>
                ) : (
                  <>
                    Estimated Size
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
                      ~ Est
                    </span>
                  </>
                )}
              </p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 mt-1 truncate">
                {stats.estimatedSizeMB || 0} MB
              </p>
            </div>
            <Info className="w-8 h-8 sm:w-10 sm:h-10 text-purple-500 dark:text-purple-400 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md dark:shadow-none border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Storage Used</p>
              <p
                className={`text-xl sm:text-2xl md:text-3xl font-bold mt-1 truncate ${
                  getStatusColor(stats.percentUsed).split(" ")[0]
                }`}
              >
                {stats.percentUsed || 0}%
              </p>
            </div>
            {parseFloat(stats.percentUsed) < 50 ? (
              <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-500 dark:text-green-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-500 dark:text-yellow-400 flex-shrink-0" />
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md dark:shadow-none border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Free Tier Limit</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 mt-1 truncate">
                500 MB
              </p>
            </div>
            <Database className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Storage Progress Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md dark:shadow-none border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
            Database Storage
          </span>
          <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
            {stats.estimatedSizeMB || 0} / 500 MB
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 sm:h-4">
          <div
            className={`h-3 sm:h-4 rounded-full transition-all ${
              parseFloat(stats.percentUsed) < 50
                ? "bg-green-500 dark:bg-green-600"
                : parseFloat(stats.percentUsed) < 80
                  ? "bg-yellow-500 dark:bg-yellow-600"
                  : "bg-red-500 dark:bg-red-600"
            }`}
            style={{
              width: `${Math.min(stats.percentUsed || 0, 100)}%`,
            }}
          ></div>
        </div>
      </div>

      {/* Table Statistics */}
      <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md dark:shadow-none border border-gray-200 dark:border-gray-700">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3 sm:mb-4 flex items-center gap-2">
          <Database className="w-4 h-4 sm:w-5 sm:h-5" />
          Records Per Table
        </h3>
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 grid-flow-col xs:grid-rows-11 lg:grid-rows-7 gap-3">
          {Object.entries(stats.tables || {})
            .sort(([, countA], [, countB]) => countB - countA)
            .map(([table, count]) => (
              <div
                key={table}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                  {table}
                </span>
                <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 ml-2">
                  {count.toLocaleString()}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Cleanup Settings */}
      <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md dark:shadow-none border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4 flex-wrap">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            Cleanup Settings
          </h3>

          {/* Toggle reminder -- ini yang bikin autoCleanup.enabled beneran
              ngontrol sesuatu (banner di atas), bukan variabel nganggur. */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Reminder cleanup mingguan
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={autoCleanup.enabled}
              onClick={() => setAutoCleanup({ ...autoCleanup, enabled: !autoCleanup.enabled })}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                autoCleanup.enabled ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoCleanup.enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Health Logs Retention (days)
            </label>
            <input
              type="number"
              value={autoCleanup.healthLogsRetention}
              onChange={(e) =>
                setAutoCleanup({
                  ...autoCleanup,
                  healthLogsRetention: parseInt(e.target.value),
                })
              }
              className="
                w-full px-3 sm:px-4 py-2.5 sm:py-2
                border border-gray-300 dark:border-gray-600
                rounded-lg 
                bg-white dark:bg-gray-700
                text-gray-800 dark:text-gray-100
                focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                focus:border-blue-500 dark:focus:border-blue-400
                text-sm
                min-h-[44px]
              "
              min="1"
              max="90"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Hapus logs lebih dari N hari
            </p>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Attendance Retention (days)
            </label>
            <input
              type="number"
              value={autoCleanup.attendanceRetention}
              onChange={(e) =>
                setAutoCleanup({
                  ...autoCleanup,
                  attendanceRetention: parseInt(e.target.value),
                })
              }
              className="
                w-full px-3 sm:px-4 py-2.5 sm:py-2
                border border-gray-300 dark:border-gray-600
                rounded-lg 
                bg-white dark:bg-gray-700
                text-gray-800 dark:text-gray-100
                focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                focus:border-blue-500 dark:focus:border-blue-400
                text-sm
                min-h-[44px]
              "
              min="365"
              max="3650"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Hapus presensi lebih dari N hari (≈{Math.floor(autoCleanup.attendanceRetention / 365)}{" "}
              tahun ajaran — 1100 hari = pas 3 tahun ajaran, kelas 7 sampai lulus kelas 9)
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              + attendance siswa yang UDAH LULUS ikut dihapus juga, gak peduli umurnya (dicek lewat
              data di Student Graduations, tanpa masa tunggu)
            </p>
          </div>
        </div>
      </div>

      {/* Cleanup History */}
      <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md dark:shadow-none border border-gray-200 dark:border-gray-700">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3 sm:mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
          Cleanup History
        </h3>
        {cleanupHistory.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-6 sm:py-8 text-sm">
            Belum ada history cleanup
          </p>
        ) : (
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Timestamp
                  </th>
                  <th className="text-left py-2 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Triggered By
                  </th>
                  <th className="text-left py-2 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Results
                  </th>
                </tr>
              </thead>
              <tbody>
                {cleanupHistory.map((item, idx) => {
                  const results = parseResults(item.results);

                  return (
                    <tr
                      key={idx}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="py-2 px-2 sm:px-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {new Date(item.timestamp).toLocaleDateString("id-ID")}
                        <br className="sm:hidden" />
                        <span className="sm:hidden"> </span>
                        {new Date(item.timestamp).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-2 px-2 sm:px-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {item.triggered_by}
                      </td>
                      <td className="py-2 px-2 sm:px-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        {results.length === 0 ? (
                          <span className="text-gray-400 dark:text-gray-500">No results</span>
                        ) : (
                          results.map((r, i) => (
                            <div key={i} className="flex items-center gap-1.5 sm:gap-2 mb-1">
                              {r.success ? (
                                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 dark:text-green-400" />
                              ) : (
                                <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 dark:text-red-400" />
                              )}
                              <span className="truncate">
                                {r.table}: {r.deletedCount || 0} deleted
                              </span>
                            </div>
                          ))
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 dark:border-blue-600 p-3 sm:p-4 rounded">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2 text-sm sm:text-base">
              Recommendations:
            </h4>
            <ul className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
              <li>
                Reminder cleanup mingguan otomatis muncul di sini kalau udah lewat{" "}
                {REMINDER_INTERVAL_DAYS} hari sejak terakhir jalan (bisa dimatiin di Cleanup
                Settings)
              </li>
              <li>Keep health logs max 7-14 hari (cukup untuk debugging)</li>
              <li>
                Default attendance retention 1100 hari (3 tahun ajaran) — kelas 7 sampai lulus kelas
                9 tetep ada datanya
              </li>
              <li>
                Attendance siswa yang udah lulus (tercatat di Student Graduations) langsung ikut
                dihapus juga pas cleanup jalan, gak nunggu 1100 hari
              </li>
              <li>
                ✅ Data otomatis di-export ke Excel dulu sebelum dihapus permanen — cek folder
                Downloads tiap habis klik "Run Cleanup"
              </li>
              {parseFloat(stats.percentUsed) > 60 && (
                <li className="text-red-600 dark:text-red-400 font-semibold">
                  ⚠️ Storage usage tinggi! Consider upgrade atau aggressive cleanup
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
      {/* Confirm Modal -- pengganti window.confirm() bawaan browser */}
      {confirmState.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4"
          onClick={() => respondToConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-md w-full p-5 sm:p-6"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-1">
                  Konfirmasi Cleanup
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
                  {confirmState.message}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => respondToConfirm(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => respondToConfirm(true)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                Ya, Jalankan Cleanup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseCleanupMonitor;
