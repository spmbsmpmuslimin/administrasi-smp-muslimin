// src/setting/academic/PreflightCheck.js
// Tab "Cek Kesinambungan" - dijalankan manual sebelum transisi tahun ajaran
// atau ganti semester, buat mastiin semua tabel yang konsumsi
// academic_year_id udah sinkron. Beda sama YearTransition.js (yang
// EKSEKUSI transisi) - ini cuma BACA & LAPORAN, gak ubah data apapun.

import React, { useState, useCallback } from "react";
import {
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { runPreflightCheck } from "../../services/academicYearService";

const StatCard = ({ label, value, colorClass }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
    <div className={`text-2xl sm:text-3xl font-bold ${colorClass}`}>{value}</div>
    <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</div>
  </div>
);

const TableCheckRow = ({ check }) => {
  const [open, setOpen] = useState(false);

  if (check.error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <span className="font-semibold text-gray-800 dark:text-gray-100">{check.label}</span>
          <span className="text-xs">({check.table})</span>
        </div>
        <p className="text-sm text-red-600 dark:text-red-400 mt-1">Gagal dicek: {check.error}</p>
      </div>
    );
  }

  const hasIssue = check.orphanCount > 0 || check.mismatchCount > 0;
  const badgeClass =
    check.orphanCount > 0
      ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700"
      : check.mismatchCount > 0
        ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700"
        : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={() => hasIssue && setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-3 p-4 text-left ${
          hasIssue ? "hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" : "cursor-default"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {hasIssue ? (
            open ? (
              <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
            ) : (
              <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
            )
          ) : (
            <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
          )}
          <div className="min-w-0">
            <span className="font-semibold text-gray-800 dark:text-gray-100">{check.label}</span>
            <span className="text-xs text-gray-400 ml-2">({check.table})</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-400 hidden sm:inline">
            {check.activeYearRowCount} baris di tahun aktif
          </span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${badgeClass}`}>
            {hasIssue ? `${check.orphanCount + check.mismatchCount} masalah` : "Sinkron ✓"}
          </span>
        </div>
      </button>

      {open && hasIssue && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 space-y-3 pt-3">
          {check.orphanCount > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-md p-3">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                🔴 {check.orphanCount} baris nunjuk ke academic_year_id yang gak ada di tabel
                academic_years (kemungkinan semester itu udah dihapus)
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono break-all">
                Contoh ID: {check.orphanSample.join(", ")}
              </p>
            </div>
          )}
          {check.mismatchCount > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-md p-3">
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                ⚠️ {check.mismatchCount} baris kolom teks "academic_year" gak sinkron sama tahun
                dari academic_year_id-nya
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono break-all">
                Contoh ID: {check.mismatchSample.join(", ")}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function PreflightCheck() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const runCheck = useCallback(async () => {
    setLoading(true);
    try {
      const result = await runPreflightCheck();
      setReport(result);
    } catch (err) {
      setReport({ isHealthy: false, error: err.message, tableChecks: [], summary: {} });
    } finally {
      setLoading(false);
      setHasRun(true);
    }
  }, []);

  return (
    <div className="p-3 sm:p-4 md:p-6">
      {/* Header + tombol jalankan */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5 mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-gray-800 dark:text-gray-100">Cek Kesinambungan</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Jalankan ini SEBELUM transisi tahun ajaran atau ganti semester, buat mastiin semua
                tabel yang nyimpen academic_year_id udah sinkron - gak ada data nyangkut di tahun
                lama atau foreign key nyasar.
              </p>
            </div>
          </div>
          <button
            onClick={runCheck}
            disabled={loading}
            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-colors flex-shrink-0"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Mengecek..." : "Jalankan Pengecekan"}
          </button>
        </div>
      </div>

      {!hasRun && !loading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <ShieldCheck className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
            Belum ada pengecekan dijalankan
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Klik "Jalankan Pengecekan" di atas sebelum melakukan transisi tahun ajaran.
          </p>
        </div>
      )}

      {loading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="animate-spin text-3xl mb-2">🔄</div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Memeriksa {18} tabel terkait tahun ajaran...
          </p>
        </div>
      )}

      {!loading && report && (
        <>
          {/* Ringkasan tahun aktif */}
          {report.activeInfo && (
            <div
              className={`rounded-lg p-4 mb-4 border ${
                report.activeInfo.isActive
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                  : "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700"
              }`}
            >
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Tahun ajaran aktif sekarang:{" "}
                <span className="font-semibold">{report.activeInfo.fullDisplayText}</span>
              </p>
              {!report.activeInfo.isActive && (
                <p className="text-sm text-red-700 dark:text-red-400 mt-1 font-medium">
                  ⚠️ Ini TEBAKAN, bukan data asli - gak ada tahun ajaran yang ke-mark aktif di
                  database. Aktifkan salah satu dulu sebelum lanjut transisi.
                </p>
              )}
            </div>
          )}

          {/* Overall verdict */}
          <div
            className={`rounded-lg p-4 mb-4 border flex items-center gap-3 ${
              report.isHealthy
                ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700"
                : "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700"
            }`}
          >
            {report.isHealthy ? (
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" />
            )}
            <p className="font-semibold text-gray-800 dark:text-gray-100">
              {report.isHealthy
                ? "Semua sinkron - aman buat lanjut transisi tahun ajaran/semester."
                : "Ada masalah yang perlu dibereskan dulu sebelum transisi."}
            </p>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <StatCard
              label="Tabel Dicek"
              value={report.summary?.tablesChecked ?? "-"}
              colorClass="text-gray-700 dark:text-gray-300"
            />
            <StatCard
              label="Bermasalah"
              value={report.summary?.criticalCount ?? 0}
              colorClass="text-red-600 dark:text-red-400"
            />
            <StatCard
              label="Perlu Dicek"
              value={report.summary?.warningCount ?? 0}
              colorClass="text-yellow-600 dark:text-yellow-400"
            />
            <StatCard
              label="Sinkron"
              value={report.summary?.infoCount ?? 0}
              colorClass="text-green-600 dark:text-green-400"
            />
          </div>

          {/* Kesehatan tabel academic_years */}
          {report.academicYearsTable && (
            <div
              className={`rounded-lg p-4 mb-4 border ${
                report.academicYearsTable.isHealthy
                  ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  : "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700"
              }`}
            >
              <p className="font-semibold text-gray-800 dark:text-gray-100 mb-1">
                Tabel academic_years itu sendiri
              </p>
              {report.academicYearsTable.isHealthy &&
              (!report.academicYearsTable.warnings ||
                report.academicYearsTable.warnings.length === 0) ? (
                <p className="text-sm text-green-600 dark:text-green-400">
                  ✅ Sehat - gak ada dobel-aktif, gak ada tanggal overlap.
                </p>
              ) : (
                <ul className="text-sm space-y-1">
                  {report.academicYearsTable.issues?.map((issue, i) => (
                    <li key={`issue-${i}`} className="text-red-600 dark:text-red-400">
                      🔴 {issue.message}
                    </li>
                  ))}
                  {report.academicYearsTable.warnings?.map((w, i) => (
                    <li key={`warn-${i}`} className="text-yellow-600 dark:text-yellow-400">
                      ⚠️ {w.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Per-tabel */}
          <div className="space-y-2">
            {report.tableChecks?.map((check) => (
              <TableCheckRow key={check.table} check={check} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default PreflightCheck;
