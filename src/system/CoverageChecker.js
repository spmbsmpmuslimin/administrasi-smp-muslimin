// src/system/CoverageChecker.js
//
// Dashboard untuk cek: tabel mana yang SUDAH bisa di-CRUD penuh lewat UI,
// dan mana yang MASIH butuh akses Supabase manual.
//
// Cara pakai:
// 1. Isi status create/read/update/delete di coverageMap.js (true/false/null)
// 2. Tambahkan <CoverageChecker /> ke routing kamu (misal di dalam Setting.js
//    atau MonitorSistem.js sebagai tab baru)

import React, { useMemo, useState } from "react";
import { tableCoverage } from "./coverageMap";
import { supabase } from "../supabaseClient";

const STATUS_FILTERS = ["Semua", "Lengkap", "Sebagian", "Belum Dicek", "Butuh DB Manual"];

function getRowStatus(row) {
  const flags = [row.create, row.read, row.update, row.delete];

  if (flags.every((f) => f === null)) return "Belum Dicek";
  if (!row.page) return "Butuh DB Manual";
  if (flags.every((f) => f === true)) return "Lengkap";
  if (flags.some((f) => f === false)) return "Butuh DB Manual";
  return "Sebagian";
}

function StatusBadge({ status }) {
  const styles = {
    Lengkap:
      "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-800",
    Sebagian:
      "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800",
    "Belum Dicek":
      "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-700",
    "Butuh DB Manual":
      "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
      {status}
    </span>
  );
}

function CrudDot({ value }) {
  if (value === true)
    return <span className="text-green-600 dark:text-green-400 font-bold">✓</span>;
  if (value === false) return <span className="text-red-600 dark:text-red-400 font-bold">✕</span>;
  return <span className="text-gray-300 dark:text-gray-600">–</span>;
}

function LiveBadge({ liveStatus, checking }) {
  if (checking) {
    return <span className="text-xs text-gray-400 dark:text-gray-500 italic">Ngecek...</span>;
  }
  if (!liveStatus) {
    return <span className="text-xs text-gray-300 dark:text-gray-600">–</span>;
  }
  if (!liveStatus.exists_in_db) {
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium border bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800">
        Gak ada di DB
      </span>
    );
  }
  if (!liveStatus.is_accessible) {
    return (
      <span
        title={liveStatus.error_message || ""}
        className="px-2 py-1 rounded-full text-xs font-medium border bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800"
      >
        Ada, tapi gak bisa diakses
      </span>
    );
  }
  return (
    <span className="px-2 py-1 rounded-full text-xs font-medium border bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-800">
      {liveStatus.object_kind === "view" ? "View aktif" : "OK"}
    </span>
  );
}

export default function CoverageChecker() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [liveResults, setLiveResults] = useState({}); // { [table]: { exists_in_db, object_kind, is_accessible, error_message } }
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);
  const [liveError, setLiveError] = useState(null);

  const runLiveCheck = async () => {
    setChecking(true);
    setLiveError(null);
    try {
      const tableNames = Object.keys(tableCoverage);
      const { data, error } = await supabase.rpc("check_table_coverage", {
        table_names: tableNames,
      });
      if (error) throw error;
      const mapped = {};
      (data || []).forEach((row) => {
        mapped[row.table_name] = row;
      });
      setLiveResults(mapped);
      setLastChecked(new Date());
    } catch (err) {
      console.error("Live check gagal:", err);
      setLiveError(err.message || "Gagal ngecek ke database");
    } finally {
      setChecking(false);
    }
  };

  const rows = useMemo(() => {
    return Object.entries(tableCoverage).map(([table, data]) => ({
      table,
      ...data,
      status: getRowStatus(data),
    }));
  }, []);

  const filtered = rows.filter((r) => {
    const matchSearch = r.table.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "Semua" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const summary = useMemo(() => {
    const counts = { Lengkap: 0, Sebagian: 0, "Belum Dicek": 0, "Butuh DB Manual": 0 };
    rows.forEach((r) => counts[r.status]++);
    return counts;
  }, [rows]);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold mb-1 text-gray-800 dark:text-gray-100">
        Coverage Checker
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-2 text-sm">
        Cek tabel mana yang sudah bisa dioperasikan penuh lewat UI, tanpa perlu utak-atik Supabase.
      </p>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button
          onClick={runLiveCheck}
          disabled={checking}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white transition-colors"
        >
          {checking ? "Ngecek ke Supabase..." : "Cek Live ke Database"}
        </button>
        {lastChecked && !checking && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Terakhir dicek: {lastChecked.toLocaleTimeString("id-ID")}
          </span>
        )}
        {liveError && (
          <span className="text-xs text-red-500 dark:text-red-400">Error: {liveError}</span>
        )}
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Object.entries(summary).map(([status, count]) => (
          <div
            key={status}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm"
          >
            <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{count}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{status}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Cari nama tabel..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 flex-1 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Tabel */}
      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="text-left p-3 text-gray-700 dark:text-gray-300">Tabel</th>
              <th className="text-left p-3 text-gray-700 dark:text-gray-300">Halaman</th>
              <th className="text-center p-3 text-gray-700 dark:text-gray-300">C</th>
              <th className="text-center p-3 text-gray-700 dark:text-gray-300">R</th>
              <th className="text-center p-3 text-gray-700 dark:text-gray-300">U</th>
              <th className="text-center p-3 text-gray-700 dark:text-gray-300">D</th>
              <th className="text-left p-3 text-gray-700 dark:text-gray-300">Status</th>
              <th className="text-left p-3 text-gray-700 dark:text-gray-300">Live DB</th>
              <th className="text-left p-3 text-gray-700 dark:text-gray-300">Catatan</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r.table}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60"
              >
                <td className="p-3 font-mono text-xs text-gray-800 dark:text-gray-200">
                  {r.table}
                </td>
                <td className="p-3 text-xs text-gray-600 dark:text-gray-400">
                  {r.page || (
                    <span className="text-red-500 dark:text-red-400 italic">belum ada</span>
                  )}
                </td>
                <td className="p-3 text-center">
                  <CrudDot value={r.create} />
                </td>
                <td className="p-3 text-center">
                  <CrudDot value={r.read} />
                </td>
                <td className="p-3 text-center">
                  <CrudDot value={r.update} />
                </td>
                <td className="p-3 text-center">
                  <CrudDot value={r.delete} />
                </td>
                <td className="p-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="p-3">
                  <LiveBadge liveStatus={liveResults[r.table]} checking={checking} />
                </td>
                <td className="p-3 text-xs text-gray-500 dark:text-gray-400">{r.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-400 dark:text-gray-600 py-8">
          Tidak ada tabel yang cocok.
        </p>
      )}
    </div>
  );
}
