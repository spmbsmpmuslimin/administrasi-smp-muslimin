import React, { useState, useEffect, useRef } from "react";
import HealthChecker from "./HealthChecker";
import { supabase } from "../supabaseClient";

// Animated Counter Component
const AnimatedCounter = ({ value, duration = 1000 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(value);
    if (start === end) return;

    const incrementTime = (duration / end) * 1000;
    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start === end) clearInterval(timer);
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{count}</span>;
};

// Circular Progress Component
const CircularProgress = ({ progress, size = 120, strokeWidth = 8 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-blue-600 transition-all duration-500 ease-out"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold text-gray-700">
          {Math.round(progress)}%
        </div>
      </div>
    </div>
  );
};

// Stats Card Component
const StatsCard = ({
  icon,
  title,
  value,
  subtitle,
  color = "blue",
  isAnimating,
}) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    yellow: "bg-yellow-50 text-yellow-600 border-yellow-200",
    red: "bg-red-50 text-red-600 border-red-200",
    gray: "bg-gray-50 text-gray-600 border-gray-200",
  };

  return (
    <div
      className={`rounded-lg shadow-md p-6 border-2 transition-all duration-300 ${
        isAnimating ? "scale-105" : ""
      } ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold">
            {typeof value === "number" && isAnimating ? (
              <AnimatedCounter value={value} />
            ) : (
              value
            )}
          </p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className="text-4xl opacity-80">{icon}</div>
      </div>
    </div>
  );
};

// Main Dashboard Component
const MonitorDashboard = ({ user }) => {
  const userId = user?.id;
  const [isChecking, setIsChecking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentChecker, setCurrentChecker] = useState(null);
  const [results, setResults] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [checkers, setCheckers] = useState([
    { id: "database", name: "Database Check", status: "pending", time: null },
    {
      id: "validation",
      name: "Data Validation",
      status: "pending",
      time: null,
    },
    {
      id: "businessLogic",
      name: "Business Logic",
      status: "pending",
      time: null,
    },
    { id: "appHealth", name: "App Health", status: "pending", time: null },
  ]);

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const isMountedRef = useRef(true);
  const healthCheckerRef = useRef(null);

  // Initialize HealthChecker and load history
  useEffect(() => {
    healthCheckerRef.current = new HealthChecker();
    isMountedRef.current = true;

    // Load history from database
    loadHistoryFromDatabase();

    return () => {
      isMountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Load history from Supabase
  const loadHistoryFromDatabase = async () => {
    try {
      setIsLoadingHistory(true);

      const { data, error } = await supabase
        .from("system_health_logs")
        .select("*")
        .order("checked_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      // Transform database records to match our format
      const transformedHistory = data.map((record) => ({
        timestamp: record.checked_at,
        summary: {
          totalIssues: record.total_issues,
          criticalCount: record.critical_count,
          warningCount: record.warning_count,
          infoCount: record.info_count,
          status: record.status,
        },
        results: record.issues_detail,
        executionTime: record.execution_time,
        errors: [],
        id: record.id,
      }));

      if (isMountedRef.current) {
        setHistory(transformedHistory);
      }
    } catch (err) {
      console.error("Error loading history:", err);
    } finally {
      if (isMountedRef.current) {
        setIsLoadingHistory(false);
      }
    }
  };

  // Run actual health check
  const runHealthCheck = async () => {
    if (isChecking) return;

    setIsChecking(true);
    setProgress(0);
    setElapsedTime(0);
    setResults(null);
    setError(null);
    startTimeRef.current = Date.now();

    // Clear existing timer
    if (timerRef.current) clearInterval(timerRef.current);

    // Reset checkers
    const initialCheckers = [
      { id: "database", name: "Database Check", status: "pending", time: null },
      {
        id: "validation",
        name: "Data Validation",
        status: "pending",
        time: null,
      },
      {
        id: "businessLogic",
        name: "Business Logic",
        status: "pending",
        time: null,
      },
      { id: "appHealth", name: "App Health", status: "pending", time: null },
    ];
    setCheckers(initialCheckers);

    // Start elapsed timer
    timerRef.current = setInterval(() => {
      if (isMountedRef.current) {
        setElapsedTime(Date.now() - startTimeRef.current);
      }
    }, 100);

    try {
      const checker = healthCheckerRef.current;

      // Simulate progress tracking by running checks sequentially with UI updates
      const checkSequence = [
        { id: "database", fn: () => checker.runDatabaseCheck(), progress: 25 },
        {
          id: "validation",
          fn: () => checker.runDataValidationCheck(),
          progress: 50,
        },
        {
          id: "businessLogic",
          fn: () => checker.runBusinessLogicCheck(),
          progress: 75,
        },
        {
          id: "appHealth",
          fn: () => checker.runAppHealthCheck(),
          progress: 100,
        },
      ];

      for (const check of checkSequence) {
        if (!isMountedRef.current) break;

        setCurrentChecker(check.id);
        const checkStartTime = Date.now();

        // Run the actual check
        await check.fn();

        const checkTime = Date.now() - checkStartTime;

        if (isMountedRef.current) {
          setProgress(check.progress);
          setCheckers((prev) =>
            prev.map((c) =>
              c.id === check.id ? { ...c, status: "done", time: checkTime } : c
            )
          );
        }
      }

      // Get final results
      const finalResults = {
        timestamp: new Date().toISOString(),
        summary: checker.calculateSummary(),
        results: checker.results,
        executionTime: Date.now() - startTimeRef.current,
        errors: checker.errors,
      };

      // Save to database
      if (userId) {
        await checker.saveResults(
          userId,
          finalResults.summary,
          finalResults.executionTime
        );
      }

      if (isMountedRef.current) {
        setResults(finalResults);
        setCurrentChecker(null);

        // Reload history from database to get latest
        await loadHistoryFromDatabase();
      }
    } catch (err) {
      console.error("Health check error:", err);
      if (isMountedRef.current) {
        setError(err.message || "Health check failed");
      }
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      if (isMountedRef.current) {
        setIsChecking(false);
      }
    }
  };

  const formatTime = (ms) => {
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTimestamp = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      healthy: "green",
      warning: "yellow",
      critical: "red",
      info: "blue",
    };
    return colors[status] || "gray";
  };

  const getStatusIcon = (status) => {
    const icons = {
      healthy: "✅",
      warning: "⚠️",
      critical: "🔴",
      info: "ℹ️",
    };
    return icons[status] || "❓";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              System Health Monitor
            </h1>
            <p className="text-gray-600 mt-1">
              Real-time system monitoring dashboard
            </p>
          </div>
          <div className="flex gap-3">
            {history.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium shadow-lg transition-all transform hover:scale-105 flex items-center gap-2">
                <span>📊</span>
                History ({history.length})
              </button>
            )}
            <button
              onClick={runHealthCheck}
              disabled={isChecking}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium shadow-lg transition-all transform hover:scale-105 flex items-center gap-2">
              {isChecking ? (
                <>
                  <span className="animate-spin">🔄</span>
                  Checking...
                </>
              ) : (
                <>
                  <span>🔍</span>
                  Run System Check
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">❌</span>
              <div>
                <h3 className="font-semibold text-red-800">Check Failed</h3>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* History Panel */}
        {showHistory && (
          <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                Check History
                {isLoadingHistory && (
                  <span className="text-sm text-gray-500 ml-2">Loading...</span>
                )}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={loadHistoryFromDatabase}
                  disabled={isLoadingHistory}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400">
                  🔄 Refresh
                </button>
                <button
                  onClick={async () => {
                    if (
                      window.confirm(
                        "Clear all history from database? This cannot be undone."
                      )
                    ) {
                      try {
                        const { error } = await supabase
                          .from("system_health_logs")
                          .delete()
                          .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

                        if (error) throw error;

                        setHistory([]);
                        alert("History cleared successfully!");
                      } catch (err) {
                        alert("Error clearing history: " + err.message);
                      }
                    }
                  }}
                  className="text-sm text-red-600 hover:text-red-700 font-medium">
                  Clear All
                </button>
              </div>
            </div>

            {isLoadingHistory ? (
              <div className="text-center py-8 text-gray-500">
                <div className="animate-spin text-4xl mb-2">🔄</div>
                Loading history...
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📭</div>
                No history available
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {history.map((item, index) => (
                  <div
                    key={item.id || index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => {
                      setResults(item);
                      setShowHistory(false);
                    }}>
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">
                        {getStatusIcon(item.summary.status)}
                      </span>
                      <div>
                        <div className="font-semibold text-gray-800">
                          {formatTimestamp(item.timestamp)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {item.summary.totalIssues} issues •{" "}
                          {formatTime(item.executionTime)}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        item.summary.status === "healthy"
                          ? "bg-green-100 text-green-700"
                          : item.summary.status === "warning"
                          ? "bg-yellow-100 text-yellow-700"
                          : item.summary.status === "critical"
                          ? "bg-red-100 text-red-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                      {item.summary.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Progress Section */}
        {isChecking && (
          <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Health Check in Progress
                </h2>
                <p className="text-gray-600">
                  Running comprehensive system analysis...
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">
                  {formatTime(elapsedTime)}
                </div>
                <div className="text-sm text-gray-500">Elapsed Time</div>
              </div>
            </div>

            <div className="flex items-center justify-center mb-6">
              <CircularProgress progress={progress} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {checkers.map((checker) => {
                const isActive = currentChecker === checker.id;
                const isDone = checker.status === "done";

                return (
                  <div
                    key={checker.id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isActive
                        ? "border-blue-400 bg-blue-50 scale-105"
                        : isDone
                        ? "border-green-400 bg-green-50"
                        : "border-gray-200 bg-gray-50"
                    }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">
                        {isActive ? "🔄" : isDone ? "✅" : "⏳"}
                      </span>
                      <span
                        className={`font-semibold ${
                          isActive
                            ? "text-blue-700"
                            : isDone
                            ? "text-green-700"
                            : "text-gray-500"
                        }`}>
                        {checker.name}
                      </span>
                    </div>
                    {isDone && checker.time && (
                      <div className="text-sm text-gray-600">
                        {checker.time}ms
                      </div>
                    )}
                    {isActive && (
                      <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 animate-pulse"
                          style={{ width: "70%" }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Results Section */}
        {!isChecking && results && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                icon={getStatusIcon(results.summary.status)}
                title="Overall Status"
                value={results.summary.status.toUpperCase()}
                color={getStatusColor(results.summary.status)}
                isAnimating={true}
              />
              <StatsCard
                icon="📊"
                title="Total Issues"
                value={results.summary.totalIssues}
                subtitle={`${results.summary.criticalCount} critical, ${results.summary.warningCount} warning`}
                color={
                  results.summary.totalIssues === 0
                    ? "green"
                    : results.summary.criticalCount > 0
                    ? "red"
                    : "yellow"
                }
                isAnimating={true}
              />
              <StatsCard
                icon="⚡"
                title="Execution Time"
                value={formatTime(results.executionTime)}
                subtitle="Total scan duration"
                color="blue"
                isAnimating={false}
              />
              <StatsCard
                icon="🔧"
                title="Checks Run"
                value={4}
                subtitle="Database, Validation, Logic, Health"
                color="gray"
                isAnimating={true}
              />
            </div>

            {/* Detailed Results */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Checker Results */}
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">
                  Checker Results
                </h3>
                <div className="space-y-3">
                  {Object.entries(results.results || {})
                    .filter(([_, value]) => value !== null)
                    .map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {getStatusIcon(value?.status || "info")}
                          </span>
                          <div>
                            <div className="font-medium text-gray-800 capitalize">
                              {key.replace(/([A-Z])/g, " $1").trim()}
                            </div>
                            <div className="text-sm text-gray-500">
                              {value?.checks?.length || 0} issues found
                            </div>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            value?.status === "healthy"
                              ? "bg-green-100 text-green-700"
                              : value?.status === "warning"
                              ? "bg-yellow-100 text-yellow-700"
                              : value?.status === "critical"
                              ? "bg-red-100 text-red-700"
                              : "bg-blue-100 text-blue-700"
                          }`}>
                          {value?.status || "unknown"}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">
                  Performance Metrics
                </h3>
                <div className="space-y-4">
                  {checkers
                    .filter((c) => c.status === "done")
                    .map((checker) => (
                      <div key={checker.id}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-700">
                            {checker.name}
                          </span>
                          <span className="text-sm text-gray-600">
                            {checker.time}ms
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-1000"
                            style={{
                              width: `${Math.min(
                                (checker.time / 5000) * 100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-900">
                      Total Execution
                    </span>
                    <span className="text-2xl font-bold text-blue-600">
                      {formatTime(results.executionTime)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Issues Detail (if any) */}
            {results.summary.totalIssues > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">
                  Issues Found
                </h3>
                <div className="space-y-3">
                  {Object.entries(results.results || {}).map(
                    ([checkerName, checkerResult]) =>
                      checkerResult?.checks?.map((issue, idx) => (
                        <div
                          key={`${checkerName}-${idx}`}
                          className={`p-4 rounded-lg border-l-4 ${
                            issue.severity === "critical"
                              ? "border-red-500 bg-red-50"
                              : issue.severity === "warning"
                              ? "border-yellow-500 bg-yellow-50"
                              : "border-blue-500 bg-blue-50"
                          }`}>
                          <div className="flex items-start gap-3">
                            <span className="text-xl">
                              {issue.severity === "critical"
                                ? "🔴"
                                : issue.severity === "warning"
                                ? "⚠️"
                                : "ℹ️"}
                            </span>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-800 capitalize">
                                {checkerName.replace(/([A-Z])/g, " $1").trim()}
                              </div>
                              <div className="text-sm text-gray-700 mt-1">
                                {issue.message}
                              </div>
                              {issue.details && (
                                <div className="text-xs text-gray-600 mt-2 font-mono bg-white p-2 rounded">
                                  {JSON.stringify(issue.details, null, 2)}
                                </div>
                              )}
                            </div>
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                issue.severity === "critical"
                                  ? "bg-red-100 text-red-700"
                                  : issue.severity === "warning"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}>
                              {issue.severity}
                            </span>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!isChecking && !results && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center border-2 border-dashed border-gray-300">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Ready to Check System Health
            </h3>
            <p className="text-gray-600 mb-6">
              Click "Run System Check" to start monitoring your system
            </p>
            <div className="flex justify-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⚡</span>
                <span>Fast Execution</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎯</span>
                <span>Accurate Results</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">📊</span>
                <span>Detailed Reports</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonitorDashboard;
