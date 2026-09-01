// system/CodeAudit.js
// Nampilin hasil audit statis kodebase (scripts/audit-kode.js) di dalam
// app. Beda sama tab lain di Monitor Sistem: tab ini gak nembak Supabase,
// cuma baca file public/audit-report.json yang di-generate dari terminal.
// Alasannya: browser gak punya akses baca file source code, jadi analisa
// import/orphan file/dsb HARUS jalan di Node lokal, bukan di sini.

import React, { useEffect, useState, useCallback } from "react";
import {
  RefreshCw,
  Terminal,
  Clock,
  FileCode2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

const STATUS_ICON = {
  healthy: "✅",
  warning: "⚠️",
  critical: "🔴",
  info: "ℹ️",
};
const STATUS_LABEL = {
  healthy: "Sehat",
  warning: "Perlu Perhatian",
  critical: "Kritis",
};

const BADGE_CLASS = {
  critical:
    "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700",
  warning:
    "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700",
  info: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700",
};

const SEVERITY_ICON = { critical: "🔴", warning: "⚠️", info: "ℹ️" };

function formatDate(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function SummaryCard({ label, value, colorClass }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
      <div className={`text-2xl sm:text-3xl font-bold ${colorClass}`}>
        {value}
      </div>
      <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
        {label}
      </div>
    </div>
  );
}

function IssueBlock({ issue }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = issue.details && issue.details.length > 0;

  return (
    <div className="py-3 border-b last:border-b-0 border-gray-100 dark:border-gray-700">
      <div className="flex items-start gap-3">
        <span className="text-lg mt-0.5 flex-shrink-0">
          {SEVERITY_ICON[issue.severity] || "❓"}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">
              {issue.title}
            </h4>
            <span
              className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded border ${
                BADGE_CLASS[issue.severity] || ""
              }`}>
              {issue.severity}
            </span>
          </div>
          {issue.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {issue.description}
            </p>
          )}

          {hasDetails && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
              {expanded ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
              {expanded ? "Sembunyikan" : "Lihat"} detail (
              {issue.details.length})
            </button>
          )}

          {expanded && hasDetails && (
            <div className="mt-2 bg-gray-50 dark:bg-gray-900/50 rounded-md p-3 max-h-72 overflow-y-auto">
              <ul className="space-y-1">
                {issue.details.map((d, i) => (
                  <li
                    key={i}
                    className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CategorySection({ category }) {
  const [open, setOpen] = useState(category.issues.length > 0);
  const worstSeverity = category.issues.reduce((worst, issue) => {
    const rank = { critical: 3, warning: 2, info: 1 };
    return rank[issue.severity] > (rank[worst] || 0) ? issue.severity : worst;
  }, null);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
        <div className="flex items-center gap-2 min-w-0">
          {open ? (
            <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
          )}
          <span className="font-semibold text-gray-800 dark:text-gray-100 text-left">
            {category.label}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {category.issues.length === 0 ? (
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
              Aman ✅
            </span>
          ) : (
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                BADGE_CLASS[worstSeverity] || ""
              }`}>
              {category.issues.length} temuan
            </span>
          )}
        </div>
      </button>
      {open && category.issues.length > 0 && (
        <div className="px-4 pb-2 border-t border-gray-100 dark:border-gray-700">
          {category.issues.map((issue, i) => (
            <IssueBlock key={i} issue={issue} />
          ))}
        </div>
      )}
    </div>
  );
}

function CodeAudit() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const res = await fetch(`/audit-report.json?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("not found");
      const data = await res.json();
      setReport(data);
    } catch (err) {
      setReport(null);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  return (
    <div className="p-3 sm:p-4 md:p-6">
      {/* Header + cara pakai */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5 mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <FileCode2 className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-gray-800 dark:text-gray-100">
                Code Audit
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Ngecek kodebase-nya sendiri (import rusak, file mati,
                konsistensi menu, dark mode, embedded join, table drift) — bukan
                data di database.
              </p>
            </div>
          </div>
          <button
            onClick={loadReport}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Muat Ulang
          </button>
        </div>

        <div className="mt-4 flex items-start gap-2 bg-gray-50 dark:bg-gray-900/40 rounded-md p-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          <Terminal size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            Laporan ini gak jalan otomatis — analisa kode butuh baca file dari
            disk, gak bisa dari browser. Buat generate / update laporan, jalanin
            ini dari terminal di root project, lalu klik "Muat Ulang":
            <code className="block mt-1.5 bg-gray-800 dark:bg-black text-green-400 rounded px-2 py-1.5 font-mono text-xs overflow-x-auto">
              node scripts/audit-kode.js
            </code>
          </div>
        </div>
      </div>

      {loading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="animate-spin text-3xl mb-2">🔄</div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Memuat laporan...
          </p>
        </div>
      )}

      {!loading && notFound && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="text-5xl mb-3">📄</div>
          <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
            Belum ada laporan audit
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Jalankan{" "}
            <code className="font-mono">node scripts/audit-kode.js</code> di
            terminal dulu, terus klik "Muat Ulang" di atas.
          </p>
        </div>
      )}

      {!loading && report && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <SummaryCard
              label="Status"
              value={STATUS_ICON[report.summary.status]}
              colorClass=""
            />
            <SummaryCard
              label="Critical"
              value={report.summary.criticalCount}
              colorClass="text-red-600 dark:text-red-400"
            />
            <SummaryCard
              label="Warning"
              value={report.summary.warningCount}
              colorClass="text-yellow-600 dark:text-yellow-400"
            />
            <SummaryCard
              label="Info"
              value={report.summary.infoCount}
              colorClass="text-blue-600 dark:text-blue-400"
            />
          </div>

          <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500 dark:text-gray-400 mb-4 px-1">
            <span className="flex items-center gap-1">
              <Clock size={13} /> Terakhir di-generate:{" "}
              {formatDate(report.generatedAt)}
            </span>
            <span>{report.filesScanned} file discan</span>
            <span>{report.executionTimeMs}ms</span>
          </div>

          {/* Categories */}
          <div className="space-y-3">
            {report.categories.map((cat) => (
              <CategorySection key={cat.id} category={cat} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default CodeAudit;
