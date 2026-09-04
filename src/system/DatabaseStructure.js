// system/DatabaseStructure.js
// Nampilin struktur database Supabase (tabel, kolom, tipe, PK/FK) dari
// public/db-structure-report.json yang di-generate oleh
// scripts/db-struktur.js.
//
// Awalnya komponen ini dirancang fetch LANGSUNG dari browser pakai anon
// key. Itu udah gak bisa lagi: per 8 April 2026 Supabase nutup akses
// endpoint OpenAPI schema buat anon key (breaking change dari Supabase,
// alasan keamanan — https://supabase.com/changelog/42949). Sekarang cuma
// bisa diakses pakai `service_role` key, dan key itu TIDAK BOLEH pernah
// nyentuh kode browser. Makanya polanya disamain sama CodeAudit.js /
// ProjectStructure.js: generate dari terminal, baca JSON statis di sini.

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  RefreshCw,
  Database,
  Clock,
  Terminal,
  ChevronDown,
  ChevronRight,
  KeyRound,
  Link2,
  Search,
  Copy,
  Download,
  Check,
  ListTree,
  Network,
} from "lucide-react";

function formatDate(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

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
        </div>
      )}
    </div>
  );
}

// Panel list polos "tabel : kolom1,kolom2,..." buat copy/download —
// sama konsepnya kayak AsciiTreePanel di tab Struktur Project.
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

function DatabaseStructure() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("interactive"); // "interactive" | "text"

  const loadReport = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const res = await fetch(`/db-structure-report.json?t=${Date.now()}`, {
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

  const allTableNames = useMemo(() => new Set((report?.tables || []).map((t) => t.name)), [report]);
  const filteredTables = useMemo(() => {
    if (!report?.tables) return [];
    const q = search.trim().toLowerCase();
    if (!q) return report.tables;
    return report.tables.filter(
      (t) =>
        t.name.toLowerCase().includes(q) || t.columns.some((c) => c.name.toLowerCase().includes(q))
    );
  }, [report, search]);

  return (
    <div className="p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5 mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <Database className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-gray-800 dark:text-gray-100">Struktur Database</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Daftar tabel, kolom, tipe data, dan foreign key — gak perlu diupdate manual kayak
                strukturfile.txt.
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
            Supabase nutup akses skema lewat anon key (per April 2026), jadi laporan ini harus
            di-generate dari terminal pakai <code className="font-mono">service_role</code> key
            (setup sekali di .env — detail ada di komentar file script). Generate / update:
            <code className="block mt-1.5 bg-gray-800 dark:bg-black text-green-400 rounded px-2 py-1.5 font-mono text-xs overflow-x-auto">
              node scripts/db-struktur.js
            </code>
          </div>
        </div>
      </div>

      {loading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="animate-spin text-3xl mb-2">🔄</div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Memuat struktur database...</p>
        </div>
      )}

      {!loading && notFound && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="text-5xl mb-3">🗄️</div>
          <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
            Belum ada laporan struktur database
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Jalankan <code className="font-mono">node scripts/db-struktur.js</code> di terminal dulu
            (butuh setup <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> di .env),
            terus klik "Muat Ulang" di atas.
          </p>
        </div>
      )}

      {!loading && report && (
        <>
          <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500 dark:text-gray-400 mb-4 px-1">
            <span className="flex items-center gap-1">
              <Clock size={13} /> Terakhir di-generate: {formatDate(report.generatedAt)}
            </span>
            <span>{report.totalTables} tabel terdeteksi</span>
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
              <ListTree size={13} /> Text List
            </button>
          </div>

          {viewMode === "text" ? (
            <PlainListPanel plainList={report.plainList || ""} totalTables={report.totalTables} />
          ) : (
            <>
              <div className="relative mb-4">
                <Search
                  size={15}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
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
    </div>
  );
}

export default DatabaseStructure;
