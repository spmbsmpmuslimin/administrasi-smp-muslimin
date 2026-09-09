// system/CodeAudit.js
// Nampilin hasil audit statis kodebase (scripts/audit-kode.js) di dalam
// app. Beda sama tab lain di Monitor Sistem: tab ini gak nembak Supabase,
// cuma baca file public/audit-report.json yang di-generate dari terminal.
// Alasannya: browser gak punya akses baca file source code, jadi analisa
// import/orphan file/dsb HARUS jalan di Node lokal, bukan di sini.

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  RefreshCw,
  Terminal,
  Clock,
  FileCode2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  Files,
  Timer,
  Link2,
  FileX2,
  Menu as MenuIcon,
  Moon,
  GitMerge,
  Table2,
  Copy,
  Check,
} from "lucide-react";

const STATUS_LABEL = {
  healthy: "Sehat",
  warning: "Perlu Perhatian",
  critical: "Kritis",
};

// Tema warna buat hero card, ngikutin status keseluruhan report. Pake
// pastel (soft bg + border + text berwarna) biar konsisten sama gaya
// kartu-kartu lain di app, bukan gradient solid yang terlalu mencolok.
const STATUS_THEME = {
  healthy: {
    soft: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    text: "text-emerald-800 dark:text-emerald-200",
    subtext: "text-emerald-700/80 dark:text-emerald-300/70",
    icon: CheckCircle2,
  },
  warning: {
    soft: "bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40",
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
    iconColor: "text-amber-600 dark:text-amber-400",
    text: "text-amber-800 dark:text-amber-200",
    subtext: "text-amber-700/80 dark:text-amber-300/70",
    icon: AlertTriangle,
  },
  critical: {
    soft: "bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/40",
    iconBg: "bg-red-100 dark:bg-red-900/40",
    iconColor: "text-red-600 dark:text-red-400",
    text: "text-red-800 dark:text-red-200",
    subtext: "text-red-700/80 dark:text-red-300/70",
    icon: AlertOctagon,
  },
};

const BADGE_CLASS = {
  critical:
    "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700",
  warning:
    "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700",
  info: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700",
};

const SEVERITY_ICON = { critical: AlertOctagon, warning: AlertTriangle, info: Info };
const SEVERITY_ORDER = { critical: 3, warning: 2, info: 1 };

const SEVERITY_FILTERS = [
  { id: "all", label: "Semua" },
  { id: "critical", label: "Critical" },
  { id: "warning", label: "Warning" },
  { id: "info", label: "Info" },
];

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

// Nebak icon kategori dari label-nya, biar tiap section gampang dikenali
// sekilas tanpa harus ubah struktur data report.
function getCategoryIcon(label = "") {
  const l = label.toLowerCase();
  if (l.includes("import")) return Link2;
  if (l.includes("orphan") || l.includes("mati") || l.includes("unused")) return FileX2;
  if (l.includes("menu")) return MenuIcon;
  if (l.includes("dark")) return Moon;
  if (l.includes("join") || l.includes("embed")) return GitMerge;
  if (l.includes("table") || l.includes("drift") || l.includes("database")) return Table2;
  return FileCode2;
}

function MetricCard({ icon: Icon, label, value, colorClass, iconBg }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
      <div className={`p-2.5 rounded-lg flex-shrink-0 ${iconBg}`}>
        <Icon className={`w-5 h-5 ${colorClass}`} />
      </div>
      <div className="min-w-0">
        <div className={`text-xl sm:text-2xl font-bold leading-tight ${colorClass}`}>{value}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</div>
      </div>
    </div>
  );
}

function CopyDetailButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard gak tersedia -- diemin aja, bukan fitur kritikal
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex-shrink-0 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      title="Salin"
    >
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
    </button>
  );
}

function IssueBlock({ issue }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = issue.details && issue.details.length > 0;
  const SeverityIcon = SEVERITY_ICON[issue.severity] || Info;

  return (
    <div className="py-3 border-b last:border-b-0 border-gray-100 dark:border-gray-700">
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex-shrink-0 p-1 rounded-md ${BADGE_CLASS[issue.severity] || ""}`}
        >
          <SeverityIcon size={14} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">{issue.title}</h4>
            <span
              className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded border ${
                BADGE_CLASS[issue.severity] || ""
              }`}
            >
              {issue.severity}
            </span>
          </div>
          {issue.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{issue.description}</p>
          )}

          {hasDetails && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              {expanded ? "Sembunyikan" : "Lihat"} detail ({issue.details.length})
            </button>
          )}

          {expanded && hasDetails && (
            <div className="mt-2 bg-gray-50 dark:bg-gray-900/50 rounded-md p-3 max-h-72 overflow-y-auto">
              <ul className="space-y-1">
                {issue.details.map((d, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-2 text-xs font-mono text-gray-700 dark:text-gray-300 break-all"
                  >
                    <span className="break-all">{d}</span>
                    <CopyDetailButton text={d} />
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

function CategorySection({ category, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const CategoryIcon = getCategoryIcon(category.label);

  const worstSeverity = category.issues.reduce((worst, issue) => {
    return SEVERITY_ORDER[issue.severity] > (SEVERITY_ORDER[worst] || 0) ? issue.severity : worst;
  }, null);

  const borderAccent =
    category.issues.length === 0
      ? "border-l-emerald-400 dark:border-l-emerald-600"
      : worstSeverity === "critical"
        ? "border-l-red-400 dark:border-l-red-600"
        : worstSeverity === "warning"
          ? "border-l-amber-400 dark:border-l-amber-600"
          : "border-l-blue-400 dark:border-l-blue-600";

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 border-l-4 ${borderAccent} overflow-hidden`}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1.5 rounded-md bg-gray-100 dark:bg-gray-700 flex-shrink-0">
            <CategoryIcon size={16} className="text-gray-500 dark:text-gray-400" />
          </div>
          <span className="font-semibold text-gray-800 dark:text-gray-100 text-left truncate">
            {category.label}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {category.issues.length === 0 ? (
            <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 size={13} /> Aman
            </span>
          ) : (
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                BADGE_CLASS[worstSeverity] || ""
              }`}
            >
              {category.issues.length} temuan
            </span>
          )}
          {open ? (
            <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
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
  const [severityFilter, setSeverityFilter] = useState("all");

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

  // Kategori yang ditampilin, difilter sesuai severity yang dipilih. Kalau
  // "all", tampil apa adanya. Kalau severity tertentu dipilih, cuma issue
  // yang match yang ditampilin dan kategori tanpa temuan yang match
  // disembunyiin (ngurangin noise pas lagi fokus nyari critical, misal).
  const visibleCategories = useMemo(() => {
    if (!report) return [];
    if (severityFilter === "all") return report.categories;
    return report.categories
      .map((cat) => ({
        ...cat,
        issues: cat.issues.filter((issue) => issue.severity === severityFilter),
      }))
      .filter((cat) => cat.issues.length > 0);
  }, [report, severityFilter]);

  const theme = STATUS_THEME[report?.summary?.status] || STATUS_THEME.healthy;
  const StatusIcon = theme.icon;
  const totalIssues =
    (report?.summary?.criticalCount || 0) +
    (report?.summary?.warningCount || 0) +
    (report?.summary?.infoCount || 0);

  return (
    <div className="p-3 sm:p-4 md:p-6">
      {/* Header + cara pakai */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5 mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
              <FileCode2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800 dark:text-gray-100">Code Audit</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Ngecek kodebase-nya sendiri (import rusak, file mati, konsistensi menu, dark mode,
                embedded join, table drift) — bukan data di database.
              </p>
            </div>
          </div>
          <button
            onClick={loadReport}
            disabled={loading}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Muat Ulang
          </button>
        </div>

        <div className="mt-4 flex items-start gap-2 bg-gray-50 dark:bg-gray-900/40 rounded-md p-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          <Terminal size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            Laporan ini gak jalan otomatis — analisa kode butuh baca file dari disk, gak bisa dari
            browser. Buat generate / update laporan, jalanin ini dari terminal di root project, lalu
            klik "Muat Ulang":
            <code className="block mt-1.5 bg-gray-800 dark:bg-black text-green-400 rounded px-2 py-1.5 font-mono text-xs overflow-x-auto">
              node scripts/audit-kode.js atau npm run check-all
            </code>
          </div>
        </div>
      </div>

      {loading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-10 text-center">
          <RefreshCw className="w-8 h-8 mx-auto mb-3 text-blue-500 animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Memuat laporan audit...</p>
        </div>
      )}

      {!loading && notFound && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
            <FileCode2 className="w-6 h-6 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
            Belum ada laporan audit
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Jalankan <code className="font-mono">node scripts/audit-kode.js</code> di terminal dulu,
            terus klik "Muat Ulang" di atas.
          </p>
        </div>
      )}

      {!loading && report && (
        <>
          {/* Hero status card */}
          <div className={`rounded-xl border p-5 sm:p-6 mb-4 ${theme.soft}`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl flex-shrink-0 ${theme.iconBg}`}>
                <StatusIcon className={`w-7 h-7 sm:w-8 sm:h-8 ${theme.iconColor}`} />
              </div>
              <div className="min-w-0">
                <div className={`text-xs uppercase tracking-wide font-medium ${theme.subtext}`}>
                  Status Keseluruhan
                </div>
                <div className={`text-xl sm:text-2xl font-bold truncate ${theme.text}`}>
                  {STATUS_LABEL[report.summary.status] || report.summary.status}
                </div>
                <div className={`text-xs sm:text-sm mt-0.5 ${theme.subtext}`}>
                  {totalIssues === 0
                    ? "Gak ada temuan sama sekali, mantap 🎉"
                    : `${totalIssues} total temuan dari ${report.categories.length} kategori`}
                </div>
              </div>
            </div>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <MetricCard
              icon={AlertOctagon}
              label="Critical"
              value={report.summary.criticalCount}
              colorClass="text-red-600 dark:text-red-400"
              iconBg="bg-red-50 dark:bg-red-900/30"
            />
            <MetricCard
              icon={AlertTriangle}
              label="Warning"
              value={report.summary.warningCount}
              colorClass="text-amber-600 dark:text-amber-400"
              iconBg="bg-amber-50 dark:bg-amber-900/30"
            />
            <MetricCard
              icon={Info}
              label="Info"
              value={report.summary.infoCount}
              colorClass="text-blue-600 dark:text-blue-400"
              iconBg="bg-blue-50 dark:bg-blue-900/30"
            />
            <MetricCard
              icon={Files}
              label="File Discan"
              value={report.filesScanned}
              colorClass="text-gray-700 dark:text-gray-300"
              iconBg="bg-gray-100 dark:bg-gray-700"
            />
          </div>

          {/* Meta info pills */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 dark:text-gray-400 mb-4 px-0.5">
            <span className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-full px-3 py-1.5">
              <Clock size={15} className="text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                Terakhir di-generate: {formatDate(report.generatedAt)}
              </span>
            </span>
            <span className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-3 py-1">
              <Timer size={12} /> {report.executionTimeMs}ms eksekusi
            </span>
          </div>

          {/* Severity filter */}
          <div className="flex items-center gap-2 flex-wrap mb-3 px-0.5">
            {SEVERITY_FILTERS.map((f) => {
              const isActive = severityFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setSeverityFilter(f.id)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                    isActive
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Categories */}
          {visibleCategories.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Gak ada temuan dengan severity "{severityFilter}".
            </div>
          ) : (
            <div className="space-y-3">
              {visibleCategories.map((cat) => (
                <CategorySection
                  key={cat.id}
                  category={cat}
                  defaultOpen={severityFilter !== "all" || cat.issues.length > 0}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default CodeAudit;
