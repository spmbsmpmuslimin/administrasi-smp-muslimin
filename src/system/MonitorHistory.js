import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

function MonitorHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("system_health_logs")
        .select(
          `
          *,
          users:checked_by (full_name)
        `
        )
        .order("checked_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-8 text-center">
        <div className="animate-spin text-3xl sm:text-4xl mb-3 sm:mb-4 dark:text-gray-300">
          ⏳
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
          Memuat riwayat...
        </p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-8 text-center">
        <div className="text-3xl sm:text-4xl mb-3 sm:mb-4 dark:text-gray-300">
          📋
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-2 text-sm sm:text-base">
          Belum ada riwayat pemeriksaan
        </p>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-500">
          Jalankan pemeriksaan pertama untuk melihat riwayat
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      {/* Desktop View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Waktu
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Diperiksa Oleh
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Total Masalah
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Durasi
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {history.map((log) => (
              <tr
                key={log.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                  {new Date(log.checked_at).toLocaleString("id-ID", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </td>
                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                  {log.users?.full_name || "-"}
                </td>
                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-3 py-2 text-xs rounded-full ${
                      // Increased padding for better touch target
                      log.status === "healthy"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : log.status === "warning"
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    }`}>
                    {log.status === "healthy"
                      ? "✅ Sehat"
                      : log.status === "warning"
                      ? "⚠️ Warning"
                      : "🔴 Critical"}
                  </span>
                </td>
                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex gap-2">
                    {log.critical_count > 0 && (
                      <span className="text-red-600 dark:text-red-400">
                        🔴 {log.critical_count}
                      </span>
                    )}
                    {log.warning_count > 0 && (
                      <span className="text-yellow-600 dark:text-yellow-400">
                        ⚠️ {log.warning_count}
                      </span>
                    )}
                    {log.info_count > 0 && (
                      <span className="text-blue-600 dark:text-blue-400">
                        ℹ️ {log.info_count}
                      </span>
                    )}
                    {log.total_issues === 0 && (
                      <span className="text-green-600 dark:text-green-400">
                        ✅ 0
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {log.execution_time
                    ? `${(log.execution_time / 1000).toFixed(2)}s`
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile View */}
      <div className="md:hidden">
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {history.map((log) => (
            <div
              key={log.id}
              className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-300">
                    {new Date(log.checked_at).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Oleh: {log.users?.full_name || "-"}
                  </p>
                </div>
                <span
                  className={`px-3 py-2 text-xs rounded-full ${
                    // Increased padding for better touch target
                    log.status === "healthy"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : log.status === "warning"
                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                  }`}>
                  {log.status === "healthy"
                    ? "✅ Sehat"
                    : log.status === "warning"
                    ? "⚠️ Warning"
                    : "🔴 Critical"}
                </span>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="flex gap-3">
                  {log.critical_count > 0 && (
                    <span className="text-red-600 dark:text-red-400 text-sm">
                      🔴 {log.critical_count}
                    </span>
                  )}
                  {log.warning_count > 0 && (
                    <span className="text-yellow-600 dark:text-yellow-400 text-sm">
                      ⚠️ {log.warning_count}
                    </span>
                  )}
                  {log.info_count > 0 && (
                    <span className="text-blue-600 dark:text-blue-400 text-sm">
                      ℹ️ {log.info_count}
                    </span>
                  )}
                  {log.total_issues === 0 && (
                    <span className="text-green-600 dark:text-green-400 text-sm">
                      ✅ 0
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {log.execution_time
                    ? `${(log.execution_time / 1000).toFixed(2)}s`
                    : "-"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MonitorHistory;
