import React, { useState } from "react";

function MonitorResults({ results, isChecking }) {
  console.log("🐛 RESULTS PROPS:", results); // Cek ini di console

  // ⚡ TEMPORARY: PAKSA PAKE DATA TEST
  const testData = {
    summary: {
      totalIssues: 5,
      criticalCount: 2,
      warningCount: 2,
      infoCount: 1,
      status: "critical",
      totalChecksRun: 4,
    },
    results: {
      database: { status: "healthy", checks: [] },
      validation: { status: "healthy", checks: [] },
      businessLogic: { status: "healthy", checks: [] },
      appHealth: {
        status: "critical",
        checks: [
          { title: "TEST Critical", message: "Ini test", severity: "critical" },
          { title: "TEST Warning", message: "Ini test", severity: "warning" },
        ],
      },
    },
    executionTime: 2600,
  };

  // ⚡ PAKSA PAKE testData, JANGAN results
  const displayData = testData; // Ganti jadi 'results' kalo mau balik normal

  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (sectionKey) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  if (isChecking) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/30 p-6 md:p-8 text-center">
        <div className="animate-spin text-4xl mb-4">🔄</div>
        <p className="text-gray-600 dark:text-gray-300 font-medium">
          Memeriksa kesehatan sistem...
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Mohon tunggu sebentar</p>
        <div className="mt-4 flex justify-center gap-2">
          <div
            className="w-2 h-2 bg-blue-600 dark:bg-blue-500 rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          ></div>
          <div
            className="w-2 h-2 bg-blue-600 dark:bg-blue-500 rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          ></div>
          <div
            className="w-2 h-2 bg-blue-600 dark:bg-blue-500 rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          ></div>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/30 p-6 md:p-8 text-center">
        <div className="text-6xl mb-4">🔧</div>
        <p className="text-gray-600 dark:text-gray-300 mb-2 font-medium text-lg">
          Belum ada pemeriksaan
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Klik tombol "Run System Check" untuk memulai pemeriksaan kesehatan sistem
        </p>
      </div>
    );
  }

  const { summary, results: checkResults, executionTime, errors } = results;

  // Helper function to get status color
  const getStatusColor = (status) => {
    const colors = {
      healthy: "green",
      warning: "yellow",
      critical: "red",
      info: "blue",
    };
    return colors[status] || "gray";
  };

  // Helper function to get status icon
  const getStatusIcon = (status) => {
    const icons = {
      healthy: "✅",
      warning: "⚠️",
      critical: "🔴",
      info: "ℹ️",
    };
    return icons[status] || "❓";
  };

  // Helper to get badge classes
  const getBadgeClass = (severity) => {
    const classes = {
      critical:
        "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700",
      warning:
        "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700",
      info: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700",
      healthy:
        "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700",
    };
    return (
      classes[severity] ||
      "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
    );
  };

  // Helper to render check items
  const renderCheckItem = (check, index) => {
    return (
      <div
        key={index}
        className="py-4 first:pt-3 border-b last:border-b-0 border-gray-100 dark:border-gray-700"
      >
        <div className="flex items-start gap-3">
          <span className="text-xl mt-0.5 flex-shrink-0">{getStatusIcon(check.severity)}</span>

          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
              {check.title || check.message}
            </h4>

            {check.message && check.title && check.title !== check.message && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{check.message}</p>
            )}

            {check.details && (
              <div className="mt-2 space-y-1">
                {check.details.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {check.details.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                  {check.details.table && (
                    <div className="flex items-center gap-1.5">
                      <span>📋</span>
                      <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600">
                        {check.details.table}
                      </span>
                    </div>
                  )}

                  {(check.details.affectedRecords !== undefined ||
                    check.details.count !== undefined) && (
                    <div className="flex items-center gap-1.5">
                      <span>📊</span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        {check.details.affectedRecords || check.details.count} record(s)
                      </span>
                    </div>
                  )}

                  {check.details.recommendation && (
                    <div className="w-full mt-1 text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                      💡 {check.details.recommendation}
                    </div>
                  )}

                  {check.details.value && (
                    <div className="flex items-center gap-1.5">
                      <span>📌</span>
                      <span>{check.details.value}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex-shrink-0 ${getBadgeClass(
              check.severity
            )}`}
          >
            {check.severity.toUpperCase()}
          </span>
        </div>
      </div>
    );
  };

  // Helper to render category section
  const renderCategorySection = (categoryKey, categoryData, icon, title) => {
    if (!categoryData || !categoryData.checks) return null;

    const isExpanded = expandedSections[categoryKey];
    const hasIssues = categoryData.checks.length > 0;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-none border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          onClick={() => toggleSection(categoryKey)}
          className="w-full px-4 sm:px-5 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-h-[60px] sm:min-h-[auto]"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                {title}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {categoryData.checks.length} issue(s) ditemukan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${getBadgeClass(
                categoryData.status
              )}`}
            >
              {categoryData.status.toUpperCase()}
            </span>
            <span
              className={`transform transition-transform text-gray-400 dark:text-gray-500 ${
                isExpanded ? "rotate-180" : ""
              }`}
            >
              ▼
            </span>
          </div>
        </button>

        {isExpanded && (
          <div className="px-4 sm:px-5 pb-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            {hasIssues ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {categoryData.checks.map((check, idx) => renderCheckItem(check, idx))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                <span className="text-3xl block mb-2">✅</span>
                <p className="text-sm">Tidak ada masalah ditemukan</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Overall Status Card */}
      <div
        className={`rounded-lg p-4 sm:p-6 border-2 ${
          summary.status === "healthy"
            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700"
            : summary.status === "warning"
            ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700"
            : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1 text-gray-800 dark:text-gray-100">
              {getStatusIcon(summary.status)} Status Keseluruhan
            </h3>
            <p
              className={`text-sm font-medium ${
                summary.status === "healthy"
                  ? "text-green-700 dark:text-green-400"
                  : summary.status === "warning"
                  ? "text-yellow-700 dark:text-yellow-400"
                  : "text-red-700 dark:text-red-400"
              }`}
            >
              {summary.status === "healthy"
                ? "Sistem Sehat"
                : summary.status === "warning"
                ? "Perlu Perhatian"
                : "Critical - Perlu Tindakan Segera"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              {summary.totalIssues || 0}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Issues</p>
          </div>
        </div>

        <div className="mt-4 flex gap-3 sm:gap-4 text-sm flex-wrap">
          {summary.criticalCount > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-red-600 dark:text-red-400 font-semibold">
                🔴 {summary.criticalCount}
              </span>
              <span className="text-gray-600 dark:text-gray-400">Critical</span>
            </div>
          )}
          {summary.warningCount > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-yellow-600 dark:text-yellow-400 font-semibold">
                ⚠️ {summary.warningCount}
              </span>
              <span className="text-gray-600 dark:text-gray-400">Warning</span>
            </div>
          )}
          {summary.infoCount > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                ℹ️ {summary.infoCount}
              </span>
              <span className="text-gray-600 dark:text-gray-400">Info</span>
            </div>
          )}
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-gray-500 dark:text-gray-400">⏱️</span>
            <span className="text-gray-600 dark:text-gray-400">
              {executionTime ? `${(executionTime / 1000).toFixed(2)}s` : "0s"}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Database Card */}
        <div
          className={`bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none p-4 sm:p-5 border-l-4 ${
            checkResults.database?.status === "healthy"
              ? "border-green-500"
              : checkResults.database?.status === "warning"
              ? "border-yellow-500"
              : "border-red-500"
          }`}
        >
          <h4 className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
            Database Integrity
          </h4>
          <div className="flex items-center justify-between">
            <p className="text-2xl sm:text-3xl">
              {getStatusIcon(checkResults.database?.status || "info")}
            </p>
            <div className="text-right">
              <p
                className={`text-base sm:text-lg font-bold ${
                  checkResults.database?.status === "healthy"
                    ? "text-green-600 dark:text-green-400"
                    : checkResults.database?.status === "warning"
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {checkResults.database?.checks?.length || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">checks</p>
            </div>
          </div>
          {checkResults.database?.error && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2 truncate">
              Error: {checkResults.database.error}
            </p>
          )}
        </div>

        {/* Data Validation Card */}
        <div
          className={`bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none p-4 sm:p-5 border-l-4 ${
            checkResults.validation?.status === "healthy"
              ? "border-green-500"
              : checkResults.validation?.status === "warning"
              ? "border-yellow-500"
              : "border-red-500"
          }`}
        >
          <h4 className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
            Data Validation
          </h4>
          <div className="flex items-center justify-between">
            <p className="text-2xl sm:text-3xl">
              {getStatusIcon(checkResults.validation?.status || "info")}
            </p>
            <div className="text-right">
              <p
                className={`text-base sm:text-lg font-bold ${
                  checkResults.validation?.status === "healthy"
                    ? "text-green-600 dark:text-green-400"
                    : checkResults.validation?.status === "warning"
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {checkResults.validation?.checks?.length || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">checks</p>
            </div>
          </div>
          {checkResults.validation?.error && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2 truncate">
              Error: {checkResults.validation.error}
            </p>
          )}
        </div>

        {/* Business Logic Card */}
        <div
          className={`bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none p-4 sm:p-5 border-l-4 ${
            checkResults.businessLogic?.status === "healthy"
              ? "border-green-500"
              : checkResults.businessLogic?.status === "warning"
              ? "border-yellow-500"
              : "border-red-500"
          }`}
        >
          <h4 className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
            Business Logic
          </h4>
          <div className="flex items-center justify-between">
            <p className="text-2xl sm:text-3xl">
              {getStatusIcon(checkResults.businessLogic?.status || "info")}
            </p>
            <div className="text-right">
              <p
                className={`text-base sm:text-lg font-bold ${
                  checkResults.businessLogic?.status === "healthy"
                    ? "text-green-600 dark:text-green-400"
                    : checkResults.businessLogic?.status === "warning"
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {checkResults.businessLogic?.checks?.length || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">checks</p>
            </div>
          </div>
          {checkResults.businessLogic?.error && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2 truncate">
              Error: {checkResults.businessLogic.error}
            </p>
          )}
        </div>

        {/* App Health Card */}
        <div
          className={`bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none p-4 sm:p-5 border-l-4 ${
            checkResults.appHealth?.status === "healthy"
              ? "border-green-500"
              : checkResults.appHealth?.status === "warning"
              ? "border-yellow-500"
              : "border-red-500"
          }`}
        >
          <h4 className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
            App Health
          </h4>
          <div className="flex items-center justify-between">
            <p className="text-2xl sm:text-3xl">
              {getStatusIcon(checkResults.appHealth?.status || "info")}
            </p>
            <div className="text-right">
              <p
                className={`text-base sm:text-lg font-bold ${
                  checkResults.appHealth?.status === "healthy"
                    ? "text-green-600 dark:text-green-400"
                    : checkResults.appHealth?.status === "warning"
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {checkResults.appHealth?.checks?.length || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">metrics</p>
            </div>
          </div>
          {checkResults.appHealth?.error && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2 truncate">
              Error: {checkResults.appHealth.error}
            </p>
          )}
        </div>
      </div>

      {/* Errors Section */}
      {errors && errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <p className="font-semibold text-red-800 dark:text-red-300 mb-2 flex items-center gap-2">
            <span>⚠️</span>
            Errors During Check:
          </p>
          <ul className="space-y-1 text-sm text-red-700 dark:text-red-300">
            {errors.map((err, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-red-500 dark:text-red-400">•</span>
                <span className="break-words">
                  <strong>{err.checker}:</strong> {err.error}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Detailed Results - Expandable Sections */}
      <div className="space-y-3 sm:space-y-4">
        <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-100">
          <span>📋</span>
          Detail Hasil Pemeriksaan
        </h3>

        {renderCategorySection("validation", checkResults.validation, "✅", "Data Validation")}
        {renderCategorySection("database", checkResults.database, "🗄️", "Database Integrity")}
        {renderCategorySection("businessLogic", checkResults.businessLogic, "💼", "Business Logic")}
        {renderCategorySection("appHealth", checkResults.appHealth, "💊", "App Health")}
      </div>
    </div>
  );
}

export default MonitorResults;
