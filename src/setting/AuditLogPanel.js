// AuditLogPanel.js - Menampilkan riwayat aktivitas admin (audit_logs)
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { X, History, Filter, RefreshCw } from "lucide-react";

const ACTION_LABELS = {
  CREATE_USER: "Tambah User",
  UPDATE_USER: "Ubah User",
  DELETE_USER: "Hapus User",
  RESET_PASSWORD: "Reset Password",
  BULK_IMPORT_USERS: "Import Massal",
  REMOVE_TEACHER_CLASS: "Hapus Wali Kelas",
  UPDATE_TEACHER_CLASS: "Ubah Wali Kelas",
};

const ACTION_COLORS = {
  CREATE_USER: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  UPDATE_USER: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  DELETE_USER: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  RESET_PASSWORD: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  BULK_IMPORT_USERS: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
  REMOVE_TEACHER_CLASS: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
  UPDATE_TEACHER_CLASS: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400",
};

const formatDateTime = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const AuditLogPanel = ({ onClose }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("audit_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }
      if (dateFrom) {
        query = query.gte("created_at", `${dateFrom}T00:00:00`);
      }
      if (dateTo) {
        query = query.lte("created_at", `${dateTo}T23:59:59`);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;
      if (fetchError) throw fetchError;

      setLogs(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error("Gagal mengambil audit log:", err);
      setError("Gagal memuat riwayat aktivitas.");
    } finally {
      setLoading(false);
    }
  }, [actionFilter, dateFrom, dateTo, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <History size={20} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Riwayat Aktivitas
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 px-5 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
          <div className="flex items-center gap-2 flex-1">
            <Filter size={16} className="text-gray-400 flex-shrink-0" />
            <select
              value={actionFilter}
              onChange={(e) => {
                setPage(1);
                setActionFilter(e.target.value);
              }}
              className="flex-1 text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">Semua Aksi</option>
              {Object.entries(ACTION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setPage(1);
                setDateFrom(e.target.value);
              }}
              className="text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <span className="text-gray-400 text-sm">s/d</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setPage(1);
                setDateTo(e.target.value);
              }}
              className="text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex-shrink-0"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Log list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <RefreshCw size={20} className="animate-spin mr-2" /> Memuat...
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500 text-sm">{error}</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              Belum ada aktivitas tercatat.
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40"
                >
                  <span
                    className={`inline-flex w-fit items-center px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                      ACTION_COLORS[log.action] ||
                      "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {ACTION_LABELS[log.action] || log.action}
                  </span>
                  <div className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                    {log.target_user_name ? (
                      <span>
                        Target: <span className="font-medium">{log.target_user_name}</span>
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                    {formatDateTime(log.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalCount > pageSize && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-700 text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              Halaman {page} dari {totalPages} ({totalCount} log)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 text-gray-700 dark:text-gray-300"
              >
                Sebelumnya
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 text-gray-700 dark:text-gray-300"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogPanel;
