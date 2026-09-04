// system/ProjectStructure.js
// Nampilin peta struktur src/ (folder tree, fungsi tiap file, siapa-impor-
// siapa) dari public/structure-report.json yang di-generate oleh
// scripts/audit-kode.js. Sama kayak CodeAudit.js: gak nembak Supabase,
// gak jalan otomatis, karena baca isi source code harus dari Node/disk,
// bukan dari browser.

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  RefreshCw,
  Terminal,
  Clock,
  FolderTree,
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
    return new Date(iso).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

// clickable: undefined kalau card ini emang gak punya aksi apa-apa (misal
// Total File / Tipe Terbanyak), diisi fungsi kalau card ini bisa jadi
// shortcut filter (misal klik "Kemungkinan Orphan" langsung nyalain
// filter orphan).
function SummaryCard({ label, value, colorClass, onClick, active }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4 text-center transition-colors ${
        active
          ? "border-yellow-400 dark:border-yellow-600 ring-1 ring-yellow-300 dark:ring-yellow-700"
          : "border-gray-200 dark:border-gray-700"
      } ${onClick ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50" : ""}`}
    >
      <div className={`text-2xl sm:text-3xl font-bold ${colorClass}`}>{value}</div>
      <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
        {label}
        {onClick && (
          <span className="block text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
            {active ? "klik buat lihat semua file" : "klik buat filter"}
          </span>
        )}
      </div>
    </Tag>
  );
}

// Satu baris file di dalam tree, klik buat buka detail panel di sebelah.
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
        <span className="ml-auto flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 font-semibold">
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

// Panel detail file yang lagi dipilih: fungsi, imports, importedBy.
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
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 font-semibold">
                Possibly Unused — gak ada file lain yang import ini
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Fungsi/component */}
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

      {/* Imports (dipanggil oleh file ini) */}
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

      {/* ImportedBy (dipanggil oleh siapa) */}
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

// Panel tree text polos (format klasik `tree`), buat di-copy/download —
// beda kegunaan sama tree interaktif: ini enak buat ditempel ke
// dokumentasi, chat, atau README.
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

function ProjectStructure() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedPath, setSelectedPath] = useState(null);
  const [search, setSearch] = useState("");
  const [showOrphansOnly, setShowOrphansOnly] = useState(false);
  const [viewMode, setViewMode] = useState("interactive"); // "interactive" | "text"

  const loadReport = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const res = await fetch(`/structure-report.json?t=${Date.now()}`, {
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

  const selectedFile = useMemo(() => {
    if (!report || !selectedPath) return null;
    return report.nodes[selectedPath] || null;
  }, [report, selectedPath]);

  // Filter tree berdasarkan search / orphan-only. Kalau ada filter aktif,
  // kita bikin flat list biar gampang di-scan, bukan render tree rekursif.
  const filteredFlatList = useMemo(() => {
    if (!report) return null;
    const q = search.trim().toLowerCase();
    if (!q && !showOrphansOnly) return null; // gak lagi filter, render tree normal
    return Object.values(report.nodes)
      .filter((n) => (showOrphansOnly ? n.isOrphan : true))
      .filter((n) => (q ? n.path.toLowerCase().includes(q) : true))
      .sort((a, b) => a.path.localeCompare(b.path));
  }, [report, search, showOrphansOnly]);

  return (
    <div className="p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5 mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <FolderTree className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-gray-800 dark:text-gray-100">Struktur Project</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Peta folder src/, fungsi tiap file, dan siapa-import-siapa — biar gak perlu buka
                file satu-satu buat inget struktur project.
              </p>
            </div>
          </div>
          <button
            onClick={loadReport}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Muat Ulang
          </button>
        </div>

        <div className="mt-4 flex items-start gap-2 bg-gray-50 dark:bg-gray-900/40 rounded-md p-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          <Terminal size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            Sama kayak Code Audit: peta struktur butuh baca file dari disk, gak bisa dari browser.
            Generate / update pakai command yang sama (satu script buat dua laporan):
            <code className="block mt-1.5 bg-gray-800 dark:bg-black text-green-400 rounded px-2 py-1.5 font-mono text-xs overflow-x-auto">
              node scripts/audit-kode.js
            </code>
          </div>
        </div>
      </div>

      {loading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="animate-spin text-3xl mb-2">🔄</div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Memuat peta struktur...</p>
        </div>
      )}

      {!loading && notFound && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="text-5xl mb-3">🗂️</div>
          <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
            Belum ada laporan struktur
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Jalankan <code className="font-mono">node scripts/audit-kode.js</code> di terminal dulu,
            terus klik "Muat Ulang" di atas.
          </p>
        </div>
      )}

      {!loading && report && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <SummaryCard
              label="Total File"
              value={report.totalFiles}
              colorClass="text-gray-800 dark:text-gray-100"
            />
            <SummaryCard
              label="Fungsi/Component"
              value={report.totalFunctions}
              colorClass="text-blue-600 dark:text-blue-400"
            />
            <SummaryCard
              label="Kemungkinan Orphan"
              value={report.orphanCount}
              colorClass="text-yellow-600 dark:text-yellow-400"
              active={showOrphansOnly}
              onClick={report.orphanCount > 0 ? () => setShowOrphansOnly((v) => !v) : undefined}
            />
            <SummaryCard
              label="Tipe Terbanyak"
              value={Object.entries(report.byType).sort((a, b) => b[1] - a[1])[0]?.[0] || "-"}
              colorClass="text-purple-600 dark:text-purple-400"
            />
          </div>

          <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500 dark:text-gray-400 mb-4 px-1">
            <span className="flex items-center gap-1">
              <Clock size={13} /> Terakhir di-generate: {formatDate(report.generatedAt)}
            </span>
          </div>

          {/* Toggle mode tampilan */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setViewMode("interactive")}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                viewMode === "interactive"
                  ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400"
                  : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              <Network size={13} /> Interaktif
            </button>
            <button
              onClick={() => setViewMode("text")}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                viewMode === "text"
                  ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400"
                  : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              <ListTree size={13} /> Tree Text (semua file)
            </button>
          </div>

          {viewMode === "text" ? (
            <AsciiTreePanel
              asciiTree={report.asciiTree || ""}
              totalAllFiles={report.totalAllFiles ?? report.totalFiles}
            />
          ) : (
            <>
              {/* Search + filter */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search
                    size={15}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari nama file..."
                    className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={() => setShowOrphansOnly((v) => !v)}
                  className={`text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
                    showOrphansOnly
                      ? "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-400"
                      : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  Orphan aja
                </button>
              </div>

              {/* Tree + Detail panel, side by side di desktop, stacked di mobile */}
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
                      node={report.tree}
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
    </div>
  );
}

export default ProjectStructure;
