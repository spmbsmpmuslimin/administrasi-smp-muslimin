// src/setting/academic/TransitionReadiness.js
// Tab "Kesiapan Transisi" - dijalankan manual sebelum menekan tombol
// "Mulai Tahun Ajaran Baru" di YearTransition.js. Beda sama PreflightCheck.js
// (yang cuma cek sinkronisasi academic_year_id) - ini cek KESIAPAN DATA
// buat proses kenaikan kelas, siswa baru SPMB, dan kelulusan, ngikutin
// persis logika executeYearTransition().

import React, { useState, useCallback } from "react";
import {
  Rocket,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { runTransitionReadinessCheck } from "../../services/academicYearService";

const STATUS_STYLE = {
  critical: {
    badge:
      "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700",
    icon: <XCircle size={16} className="text-red-500 flex-shrink-0" />,
    label: "Bermasalah",
  },
  warning: {
    badge:
      "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700",
    icon: <AlertTriangle size={16} className="text-yellow-500 flex-shrink-0" />,
    label: "Perlu Dicek",
  },
  ok: {
    badge:
      "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700",
    icon: <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />,
    label: "Aman",
  },
  info: {
    badge:
      "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700",
    icon: <Info size={16} className="text-blue-500 flex-shrink-0" />,
    label: "Info",
  },
};

const StatCard = ({ label, value, colorClass }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
    <div className={`text-2xl sm:text-3xl font-bold ${colorClass}`}>{value}</div>
    <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</div>
  </div>
);

const ReadinessItemRow = ({ item }) => {
  const [open, setOpen] = useState(false);
  const style = STATUS_STYLE[item.status] || STATUS_STYLE.info;
  const hasDetails = item.details && item.details.length > 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={() => hasDetails && setOpen((v) => !v)}
        className={`w-full flex items-start sm:items-center justify-between gap-3 p-4 text-left ${
          hasDetails
            ? "hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
            : "cursor-default"
        }`}
      >
        <div className="flex items-start sm:items-center gap-2 min-w-0">
          {hasDetails ? (
            open ? (
              <ChevronDown size={16} className="text-gray-400 flex-shrink-0 mt-0.5 sm:mt-0" />
            ) : (
              <ChevronRight size={16} className="text-gray-400 flex-shrink-0 mt-0.5 sm:mt-0" />
            )
          ) : (
            <span className="mt-0.5 sm:mt-0">{style.icon}</span>
          )}
          <div className="min-w-0">
            <span className="font-semibold text-gray-800 dark:text-gray-100">{item.label}</span>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{item.message}</p>
          </div>
        </div>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${style.badge}`}
        >
          {style.label}
        </span>
      </button>

      {open && hasDetails && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3">
          <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1 font-mono">
            {item.details.slice(0, 10).map((d, i) => (
              <li key={i}>• {d}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

function TransitionReadiness({ schoolConfig }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const runCheck = useCallback(async () => {
    setLoading(true);
    try {
      const result = await runTransitionReadinessCheck(schoolConfig || {});
      setReport(result);
    } catch (err) {
      setReport({
        items: [{ id: "fatal_error", label: "Error", status: "critical", message: err.message }],
        summary: { critical: 1, warning: 0, ok: 0, info: 0 },
      });
    } finally {
      setLoading(false);
      setHasRun(true);
    }
  }, [schoolConfig]);

  const isReady =
    report &&
    (report.summary?.critical ?? 0) === 0 &&
    !report.items?.some((i) => i.id === "fatal_error");

  return (
    <div className="p-3 sm:p-4 md:p-6">
      {/* Header + tombol jalankan */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5 mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <Rocket className="w-6 h-6 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-gray-800 dark:text-gray-100">
                Kesiapan Transisi Tahun Ajaran
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Jalankan ini SEBELUM menekan "Mulai Tahun Ajaran Baru" - cek siswa baru SPMB,
                kenaikan kelas, kelas duplikat, dan hal lain yang bisa bikin transisi salah atau
                gagal.
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1.5 font-medium">
                ⚠️ Ini cuma cek KESIAPAN DATA, bukan rekomendasi waktu. Menjalankan cek ini kapan
                saja (termasuk di tengah semester) itu aman dan gak ngubah apa-apa - pastiin sendiri
                emang udah waktunya sebelum menekan tombol transisi di tab sebelah.
              </p>
            </div>
          </div>
          <button
            onClick={runCheck}
            disabled={loading}
            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white transition-colors flex-shrink-0"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Mengecek..." : "Jalankan Pengecekan"}
          </button>
        </div>
      </div>

      {!hasRun && !loading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <Rocket className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
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
          <p className="text-sm text-gray-500 dark:text-gray-400">Memeriksa kesiapan transisi...</p>
        </div>
      )}

      {!loading && report && (
        <>
          {/* Ringkasan tahun */}
          {report.currentYear && (
            <div className="rounded-lg p-4 mb-4 border bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Transisi: <span className="font-semibold">{report.currentYear}</span> →{" "}
                <span className="font-semibold">{report.newYear || "?"}</span> (Semester 1)
              </p>
            </div>
          )}

          {/* Overall verdict */}
          <div
            className={`rounded-lg p-4 mb-4 border flex items-center gap-3 ${
              isReady
                ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700"
                : "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700"
            }`}
          >
            {isReady ? (
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" />
            )}
            <p className="font-semibold text-gray-800 dark:text-gray-100">
              {isReady
                ? "Semua aman - siap buat jalanin transisi tahun ajaran."
                : "Ada masalah yang WAJIB dibereskan dulu sebelum transisi (lihat yang berlabel Bermasalah)."}
            </p>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <StatCard
              label="Bermasalah"
              value={report.summary?.critical ?? 0}
              colorClass="text-red-600 dark:text-red-400"
            />
            <StatCard
              label="Perlu Dicek"
              value={report.summary?.warning ?? 0}
              colorClass="text-yellow-600 dark:text-yellow-400"
            />
            <StatCard
              label="Aman"
              value={report.summary?.ok ?? 0}
              colorClass="text-green-600 dark:text-green-400"
            />
            <StatCard
              label="Info"
              value={report.summary?.info ?? 0}
              colorClass="text-blue-600 dark:text-blue-400"
            />
          </div>

          {/* Per-item */}
          <div className="space-y-2">
            {report.items?.map((item) => (
              <ReadinessItemRow key={item.id} item={item} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default TransitionReadiness;
