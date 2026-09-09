// system/StrukturSistem.js
// Gabungan Struktur Project + Struktur Database dalam satu tempat -- dulu
// dua card terpisah (ProjectStructure.js & DatabaseStructure.js), sekarang
// satu card dengan toggle Project/Database di dalemnya, plus tombol
// "Download strukturfile.txt" yang gabungin ascii tree project + plain
// list database jadi satu file teks buat ditimpa ke dokumentasi pribadi.
//
// PENTING: browser tetep gak bisa generate ulang isi laporannya (baca
// source code / skema DB harus dari Node/disk, dan buat DB sekarang wajib
// pakai service_role key yang gak boleh nempel di browser -- lihat
// komentar lama di DatabaseStructure.js). Jadi alurnya tetep: generate
// dari terminal dulu, baru "Muat Ulang" & "Download strukturfile.txt" di
// sini. Dua script generate-nya bisa digabung jadi 1 command kalau mau,
// misal nambahin di package.json:
//   "refresh-report": "node scripts/audit-kode.js && node scripts/db-struktur.js"
// abis itu tinggal: npm run refresh-report -> klik "Muat Ulang" di UI ->
// klik "Download strukturfile.txt". Bukan 1 klik penuh (browser gak bisa
// baca disk), tapi udah paling ringkas yang bisa dibikin aman.

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  RefreshCw,
  Terminal,
  Clock,
  FolderTree,
  Database,
  ChevronDown,
  ChevronRight,
  Folder,
  FileCode,
  Search,
  ArrowRight,
  ArrowLeft,
  Copy,
  Download,
  Check,
  ListTree,
  Network,
  Files,
  Component,
  AlertTriangle,
  Tags,
  KeyRound,
  Link2,
  Table2,
  Columns3,
  FileDown,
} from "lucide-react";

const TYPE_COLOR = {
  page: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
  component: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  hook: "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400",
  service: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  checker: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
  system: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400",
  util: "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400",
  config: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  other: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
};

function formatDate(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

// Metric card pastel yang dipakai di kedua section (Project & Database).
// onClick/active opsional -- dipakai buat card "Kemungkinan Orphan" yang
// berfungsi jadi shortcut filter.
function MetricCard({ icon: Icon, label, value, colorClass, iconBg, onClick, active }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-4 flex items-center gap-3 text-left transition-colors ${
        active
          ? "border-amber-300 dark:border-amber-700 ring-1 ring-amber-200 dark:ring-amber-800"
          : "border-gray-200 dark:border-gray-700"
      } ${onClick ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50" : ""}`}
    >
      <div className={`p-2.5 rounded-lg flex-shrink-0 ${iconBg}`}>
        <Icon className={`w-5 h-5 ${colorClass}`} />
      </div>
      <div className="min-w-0">
        <div className={`text-xl sm:text-2xl font-bold leading-tight truncate ${colorClass}`}>
          {value}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</div>
        {onClick && (
          <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
            {active ? "klik buat lihat semua file" : "klik buat filter"}
          </div>
        )}
      </div>
    </Tag>
  );
}

// Pill status generate, dipakai buat nunjukin freshness masing-masing
// report (Project & Database) berdampingan, gak peduli lagi liat section
// yang mana.
function ReportStatusPill({ label, report }) {
  const hasReport = Boolean(report);
  return (
    <span
      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs border ${
        hasReport
          ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-medium"
          : "bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500"
      }`}
    >
      <Clock size={12} />
      {label}: {hasReport ? formatDate(report.generatedAt) : "belum digenerate"}
    </span>
  );
}

/* ============================== PROJECT ============================== */

function FileRow({ node, depth, onSelect, isSelected }) {
  const file = node.file;
  return (
    <button
      onClick={() => onSelect(file)}
      className={`w-full flex items-center gap-2 py-1.5 px-2 rounded-md text-left text-sm transition-colors ${
        isSelected
          ? "bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-300 dark:ring-blue-700"
          : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
      }`}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      <FileCode size={14} className="flex-shrink-0 text-gray-400 dark:text-gray-500" />
      <span className="truncate text-gray-700 dark:text-gray-300 font-mono text-xs">
        {node.name}
      </span>
      {file.isOrphan && (
        <span className="ml-auto flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-semibold">
          orphan
        </span>
      )}
      <span
        className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium ${
          TYPE_COLOR[file.type] || TYPE_COLOR.other
        }`}
      >
        {file.type}
      </span>
    </button>
  );
}

function FolderRow({ node, depth, onSelect, selectedPath, defaultOpenDepth }) {
  const [open, setOpen] = useState(depth < defaultOpenDepth);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 py-1.5 px-2 rounded-md text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {open ? (
          <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
        )}
        <Folder size={14} className="flex-shrink-0 text-blue-400 dark:text-blue-500" />
        <span className="font-medium text-gray-800 dark:text-gray-200">{node.name}</span>
        <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-1">
          ({node.children.length})
        </span>
      </button>
      {open && (
        <div>
          {node.children.map((child) =>
            child.type === "folder" ? (
              <FolderRow
                key={child.path}
                node={child}
                depth={depth + 1}
                onSelect={onSelect}
                selectedPath={selectedPath}
                defaultOpenDepth={defaultOpenDepth}
              />
            ) : (
              <FileRow
                key={child.file.path}
                node={child}
                depth={depth + 1}
                onSelect={onSelect}
                isSelected={selectedPath === child.file.path}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

function FileDetailPanel({ file, onNavigate }) {
  if (!file) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center h-full flex flex-col items-center justify-center">
        <FileCode size={32} className="text-gray-300 dark:text-gray-600 mb-2" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Klik salah satu file di tree buat lihat detailnya
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="font-mono text-sm font-semibold text-gray-800 dark:text-gray-100 break-all">
            {file.path}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                TYPE_COLOR[file.type] || TYPE_COLOR.other
              }`}
            >
              {file.type}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">{file.lines} baris</span>
            {file.isOrphan && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-semibold">
                Possibly Unused — gak ada file lain yang import ini
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1.5">
          Fungsi & Component ({file.functions.length})
        </p>
        {file.functions.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">
            Gak kedeteksi (mungkin cuma re-export atau file config)
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {file.functions.map((fn) => (
              <span
                key={fn}
                className="text-xs font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                {fn}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1.5 flex items-center gap-1">
          <ArrowRight size={12} /> Memanggil ({file.imports.length})
        </p>
        {file.imports.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">Gak import file lain</p>
        ) : (
          <ul className="space-y-1">
            {file.imports.map((imp) => (
              <li key={imp}>
                <button
                  onClick={() => onNavigate(imp)}
                  className="text-xs font-mono text-blue-600 dark:text-blue-400 hover:underline text-left break-all"
                >
                  {imp}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1.5 flex items-center gap-1">
          <ArrowLeft size={12} /> Dipanggil oleh ({file.importedBy.length})
        </p>
        {file.importedBy.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">
            Gak ada — kemungkinan orphan/entry point
          </p>
        ) : (
          <ul className="space-y-1">
            {file.importedBy.map((imp) => (
              <li key={imp}>
                <button
                  onClick={() => onNavigate(imp)}
                  className="text-xs font-mono text-blue-600 dark:text-blue-400 hover:underline text-left break-all"
                >
                  {imp}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AsciiTreePanel({ asciiTree, totalAllFiles }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(asciiTree).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [asciiTree]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([asciiTree], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "struktur-project.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [asciiTree]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between gap-2 p-3 border-b border-gray-100 dark:border-gray-700 flex-wrap">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {totalAllFiles} total file di src/ (termasuk asset — gambar, html, dll — bukan cuma file
          kode)
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
            {copied ? "Ke-copy!" : "Copy"}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Download size={13} />
            Download .txt
          </button>
        </div>
      </div>
      <pre className="p-4 text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto max-h-[600px] overflow-y-auto whitespace-pre">
        {asciiTree}
      </pre>
    </div>
  );
}

/* ============================= DATABASE ============================= */

function TableCard({ table, allTableNames }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          {open ? (
            <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
          )}
          <span className="font-mono font-semibold text-gray-800 dark:text-gray-100 text-left">
            {table.name}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">
          <span>{table.columns.length} kolom</span>
          {table.foreignKeys.length > 0 && (
            <span className="flex items-center gap-0.5 text-blue-500 dark:text-blue-400">
              <Link2 size={12} /> {table.foreignKeys.length}
            </span>
          )}
          {(table.referencedBy || []).length > 0 && (
            <span className="flex items-center gap-0.5 text-purple-500 dark:text-purple-400">
              <Network size={12} /> {table.referencedBy.length}
            </span>
          )}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-400 dark:text-gray-500 uppercase text-[10px]">
                  <th className="py-1.5 pr-3">Kolom</th>
                  <th className="py-1.5 pr-3">Tipe</th>
                  <th className="py-1.5 pr-3">Nullable</th>
                  <th className="py-1.5 pr-3">Relasi</th>
                </tr>
              </thead>
              <tbody>
                {table.columns.map((col) => (
                  <tr key={col.name} className="border-t border-gray-50 dark:border-gray-700/50">
                    <td className="py-1.5 pr-3 font-mono text-gray-700 dark:text-gray-300">
                      <span className="flex items-center gap-1">
                        {col.isPrimaryKey && (
                          <KeyRound size={11} className="text-amber-500 flex-shrink-0" />
                        )}
                        {col.name}
                      </span>
                    </td>
                    <td className="py-1.5 pr-3 text-gray-500 dark:text-gray-400">{col.type}</td>
                    <td className="py-1.5 pr-3 text-gray-500 dark:text-gray-400">
                      {col.nullable ? "ya" : "tidak"}
                    </td>
                    <td className="py-1.5 pr-3">
                      {col.foreignKey ? (
                        <span
                          className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
                            allTableNames.has(col.foreignKey.table)
                              ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                              : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                          }`}
                          title={
                            allTableNames.has(col.foreignKey.table)
                              ? undefined
                              : "Tabel tujuan gak muncul di daftar — bisa jadi referensi ke tabel yang udah gak ada"
                          }
                        >
                          → {col.foreignKey.table}.{col.foreignKey.column}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(table.referencedBy || []).length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
              <p className="text-[10px] uppercase font-semibold text-gray-400 dark:text-gray-500 mb-2 flex items-center gap-1">
                <Network size={11} />
                Direferensikan oleh ({table.referencedBy.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {table.referencedBy.map((ref, i) => (
                  <span
                    key={i}
                    className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                    title={`${ref.table}.${ref.column} → ${table.name}.${ref.refColumn}`}
                  >
                    {ref.table}.{ref.column}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlainListPanel({ plainList, totalTables }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(plainList).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [plainList]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([plainList], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "struktur-database.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [plainList]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between gap-2 p-3 border-b border-gray-100 dark:border-gray-700 flex-wrap">
        <p className="text-xs text-gray-500 dark:text-gray-400">{totalTables} tabel</p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
            {copied ? "Ke-copy!" : "Copy"}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Download size={13} />
            Download .txt
          </button>
        </div>
      </div>
      <pre className="p-4 text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto max-h-[600px] overflow-y-auto whitespace-pre-wrap break-all">
        {plainList}
      </pre>
    </div>
  );
}

/* ============================ MAIN CARD ============================ */

function StrukturSistem() {
  const [section, setSection] = useState("project"); // "project" | "database"

  // ----- Project state -----
  const [projectReport, setProjectReport] = useState(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [projectNotFound, setProjectNotFound] = useState(false);
  const [selectedPath, setSelectedPath] = useState(null);
  const [projectSearch, setProjectSearch] = useState("");
  const [showOrphansOnly, setShowOrphansOnly] = useState(false);
  const [projectViewMode, setProjectViewMode] = useState("interactive"); // "interactive" | "text"

  // ----- Database state -----
  const [dbReport, setDbReport] = useState(null);
  const [dbLoading, setDbLoading] = useState(true);
  const [dbNotFound, setDbNotFound] = useState(false);
  const [dbSearch, setDbSearch] = useState("");
  const [dbViewMode, setDbViewMode] = useState("interactive"); // "interactive" | "text"

  const loadProjectReport = useCallback(async () => {
    setProjectLoading(true);
    setProjectNotFound(false);
    try {
      const res = await fetch(`/structure-report.json?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("not found");
      setProjectReport(await res.json());
    } catch {
      setProjectReport(null);
      setProjectNotFound(true);
    } finally {
      setProjectLoading(false);
    }
  }, []);

  const loadDbReport = useCallback(async () => {
    setDbLoading(true);
    setDbNotFound(false);
    try {
      const res = await fetch(`/db-structure-report.json?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("not found");
      setDbReport(await res.json());
    } catch {
      setDbReport(null);
      setDbNotFound(true);
    } finally {
      setDbLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjectReport();
    loadDbReport();
  }, [loadProjectReport, loadDbReport]);

  const refreshAll = () => {
    loadProjectReport();
    loadDbReport();
  };

  const selectedFile = useMemo(() => {
    if (!projectReport || !selectedPath) return null;
    return projectReport.nodes[selectedPath] || null;
  }, [projectReport, selectedPath]);

  const filteredFlatList = useMemo(() => {
    if (!projectReport) return null;
    const q = projectSearch.trim().toLowerCase();
    if (!q && !showOrphansOnly) return null;
    return Object.values(projectReport.nodes)
      .filter((n) => (showOrphansOnly ? n.isOrphan : true))
      .filter((n) => (q ? n.path.toLowerCase().includes(q) : true))
      .sort((a, b) => a.path.localeCompare(b.path));
  }, [projectReport, projectSearch, showOrphansOnly]);

  const allTableNames = useMemo(
    () => new Set((dbReport?.tables || []).map((t) => t.name)),
    [dbReport]
  );
  const dbStats = useMemo(() => {
    const tables = dbReport?.tables || [];
    return {
      totalColumns: tables.reduce((sum, t) => sum + t.columns.length, 0),
      totalForeignKeys: tables.reduce((sum, t) => sum + t.foreignKeys.length, 0),
    };
  }, [dbReport]);
  const filteredTables = useMemo(() => {
    if (!dbReport?.tables) return [];
    const q = dbSearch.trim().toLowerCase();
    if (!q) return dbReport.tables;
    return dbReport.tables.filter(
      (t) =>
        t.name.toLowerCase().includes(q) || t.columns.some((c) => c.name.toLowerCase().includes(q))
    );
  }, [dbReport, dbSearch]);

  // Gabungin ascii tree project + plain list database jadi satu file teks
  // yang siap ditimpa ke strukturfile.txt dokumentasi pribadi.
  const canDownloadCombined = Boolean(projectReport || dbReport);
  const handleDownloadCombined = useCallback(() => {
    const now = new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
    const parts = [
      "STRUKTUR SISTEM",
      `Di-download dari UI: ${now}`,
      "",
      "=".repeat(70),
      "STRUKTUR PROJECT (src/)",
      `Terakhir di-generate: ${formatDate(projectReport?.generatedAt)}`,
      "=".repeat(70),
      projectReport?.asciiTree
        ? projectReport.asciiTree
        : "(belum digenerate -- jalankan: node scripts/audit-kode.js)",
      "",
      "=".repeat(70),
      "STRUKTUR DATABASE",
      `Terakhir di-generate: ${formatDate(dbReport?.generatedAt)}`,
      "=".repeat(70),
      dbReport?.plainList
        ? dbReport.plainList
        : "(belum digenerate -- jalankan: node scripts/db-struktur.js)",
    ];
    const blob = new Blob([parts.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "strukturfile.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [projectReport, dbReport]);

  const anyLoading = projectLoading || dbLoading;

  return (
    <div className="p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5 mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
              <Network className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800 dark:text-gray-100">Struktur Sistem</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Peta struktur project (src/) dan skema database dalam satu tempat — plus tombol buat
                download gabungan keduanya jadi satu file strukturfile.txt.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadCombined}
              disabled={!canDownloadCombined}
              className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white transition-colors"
            >
              <FileDown size={14} />
              Download strukturfile.txt
            </button>
            <button
              onClick={refreshAll}
              className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <RefreshCw size={14} className={anyLoading ? "animate-spin" : ""} />
              Muat Ulang
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 bg-gray-50 dark:bg-gray-900/40 rounded-md p-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          <Terminal size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            Peta struktur butuh baca file/skema dari disk, gak bisa dari browser. Generate / update
            dua-duanya sekaligus:
            <code className="block mt-1.5 bg-gray-800 dark:bg-black text-green-400 rounded px-2 py-1.5 font-mono text-xs overflow-x-auto">
              npm run check-all
            </code>
            (jalanin <code className="font-mono">system-check</code> +{" "}
            <code className="font-mono">db-struktur</code> sekaligus — udah ada di package.json).
            Abis itu klik "Muat Ulang", terus "Download strukturfile.txt" buat narik hasil gabungan
            keduanya jadi satu file siap timpa ke dokumentasi.
          </div>
        </div>

        {/* Status kedua report, selalu keliatan gak peduli section mana yang aktif */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <ReportStatusPill label="Project" report={projectReport} />
          <ReportStatusPill label="Database" report={dbReport} />
        </div>
      </div>

      {/* Section toggle */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setSection("project")}
          className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border transition-colors ${
            section === "project"
              ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400"
              : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          <FolderTree size={15} /> Struktur Project
        </button>
        <button
          onClick={() => setSection("database")}
          className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border transition-colors ${
            section === "database"
              ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400"
              : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          <Database size={15} /> Struktur Database
        </button>
      </div>

      {/* ===================== SECTION: PROJECT ===================== */}
      {section === "project" && (
        <>
          {projectLoading && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-10 text-center">
              <RefreshCw className="w-8 h-8 mx-auto mb-3 text-blue-500 animate-spin" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Memuat peta struktur...</p>
            </div>
          )}

          {!projectLoading && projectNotFound && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-10 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
                <FolderTree className="w-6 h-6 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
                Belum ada laporan struktur
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Jalankan <code className="font-mono">node scripts/audit-kode.js</code> di terminal
                dulu, terus klik "Muat Ulang" di atas.
              </p>
            </div>
          )}

          {!projectLoading && projectReport && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <MetricCard
                  icon={Files}
                  label="Total File"
                  value={projectReport.totalFiles}
                  colorClass="text-gray-700 dark:text-gray-300"
                  iconBg="bg-gray-100 dark:bg-gray-700"
                />
                <MetricCard
                  icon={Component}
                  label="Fungsi/Component"
                  value={projectReport.totalFunctions}
                  colorClass="text-blue-600 dark:text-blue-400"
                  iconBg="bg-blue-50 dark:bg-blue-900/30"
                />
                <MetricCard
                  icon={AlertTriangle}
                  label="Kemungkinan Orphan"
                  value={projectReport.orphanCount}
                  colorClass="text-amber-600 dark:text-amber-400"
                  iconBg="bg-amber-50 dark:bg-amber-900/30"
                  active={showOrphansOnly}
                  onClick={
                    projectReport.orphanCount > 0 ? () => setShowOrphansOnly((v) => !v) : undefined
                  }
                />
                <MetricCard
                  icon={Tags}
                  label="Tipe Terbanyak"
                  value={
                    Object.entries(projectReport.byType).sort((a, b) => b[1] - a[1])[0]?.[0] || "-"
                  }
                  colorClass="text-purple-600 dark:text-purple-400"
                  iconBg="bg-purple-50 dark:bg-purple-900/30"
                />
              </div>

              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setProjectViewMode("interactive")}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                    projectViewMode === "interactive"
                      ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400"
                      : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  <Network size={13} /> Interaktif
                </button>
                <button
                  onClick={() => setProjectViewMode("text")}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                    projectViewMode === "text"
                      ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400"
                      : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  <ListTree size={13} /> Tree Text (semua file)
                </button>
              </div>

              {projectViewMode === "text" ? (
                <AsciiTreePanel
                  asciiTree={projectReport.asciiTree || ""}
                  totalAllFiles={projectReport.totalAllFiles ?? projectReport.totalFiles}
                />
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search
                        size={15}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="text"
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                        placeholder="Cari nama file..."
                        className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      onClick={() => setShowOrphansOnly((v) => !v)}
                      className={`text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
                        showOrphansOnly
                          ? "bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400"
                          : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      Orphan aja
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-2 sm:p-3 max-h-[600px] overflow-y-auto">
                      {filteredFlatList ? (
                        filteredFlatList.length === 0 ? (
                          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
                            Gak ada hasil
                          </p>
                        ) : (
                          <div className="space-y-0.5">
                            {filteredFlatList.map((f) => (
                              <FileRow
                                key={f.path}
                                node={{ name: f.path, file: f }}
                                depth={0}
                                onSelect={(file) => setSelectedPath(file.path)}
                                isSelected={selectedPath === f.path}
                              />
                            ))}
                          </div>
                        )
                      ) : (
                        <FolderRow
                          node={projectReport.tree}
                          depth={0}
                          onSelect={(file) => setSelectedPath(file.path)}
                          selectedPath={selectedPath}
                          defaultOpenDepth={1}
                        />
                      )}
                    </div>

                    <div className="max-h-[600px] overflow-y-auto">
                      <FileDetailPanel file={selectedFile} onNavigate={setSelectedPath} />
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {/* ===================== SECTION: DATABASE ===================== */}
      {section === "database" && (
        <>
          {dbLoading && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-10 text-center">
              <RefreshCw className="w-8 h-8 mx-auto mb-3 text-blue-500 animate-spin" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Memuat struktur database...
              </p>
            </div>
          )}

          {!dbLoading && dbNotFound && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-10 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
                <Database className="w-6 h-6 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
                Belum ada laporan struktur database
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Jalankan <code className="font-mono">node scripts/db-struktur.js</code> di terminal
                dulu (butuh setup <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> di
                .env), terus klik "Muat Ulang" di atas.
              </p>
            </div>
          )}

          {!dbLoading && dbReport && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                <MetricCard
                  icon={Table2}
                  label="Total Tabel"
                  value={dbReport.totalTables}
                  colorClass="text-blue-600 dark:text-blue-400"
                  iconBg="bg-blue-50 dark:bg-blue-900/30"
                />
                <MetricCard
                  icon={Columns3}
                  label="Total Kolom"
                  value={dbStats.totalColumns}
                  colorClass="text-gray-700 dark:text-gray-300"
                  iconBg="bg-gray-100 dark:bg-gray-700"
                />
                <MetricCard
                  icon={Link2}
                  label="Foreign Key"
                  value={dbStats.totalForeignKeys}
                  colorClass="text-purple-600 dark:text-purple-400"
                  iconBg="bg-purple-50 dark:bg-purple-900/30"
                />
              </div>

              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setDbViewMode("interactive")}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                    dbViewMode === "interactive"
                      ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400"
                      : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  <Network size={13} /> Interaktif
                </button>
                <button
                  onClick={() => setDbViewMode("text")}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                    dbViewMode === "text"
                      ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400"
                      : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  <ListTree size={13} /> Text List
                </button>
              </div>

              {dbViewMode === "text" ? (
                <PlainListPanel
                  plainList={dbReport.plainList || ""}
                  totalTables={dbReport.totalTables}
                />
              ) : (
                <>
                  <div className="relative mb-4">
                    <Search
                      size={15}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={dbSearch}
                      onChange={(e) => setDbSearch(e.target.value)}
                      placeholder="Cari nama tabel atau kolom..."
                      className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    {filteredTables.length === 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
                        Gak ada tabel yang cocok
                      </p>
                    ) : (
                      filteredTables.map((table) => (
                        <TableCard key={table.name} table={table} allTableNames={allTableNames} />
                      ))
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default StrukturSistem;
