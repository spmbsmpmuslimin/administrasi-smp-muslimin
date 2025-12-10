import React, { useState, useEffect, useRef } from "react";
import HealthChecker from "./HealthChecker";
import { supabase } from "../supabaseClient";

const AnimatedCounter = ({ value, duration = 1000 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const end = parseInt(value) || 0;

    if (end === 0) {
      setCount(0);
      return;
    }

    let start = 0;
    const increment = Math.ceil(end / 20);
    const stepTime = duration / 20;

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{count}</span>;
};

const CheckerProgressBar = ({ checker, isActive, isDone }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isActive) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 100);
      return () => clearInterval(interval);
    } else if (isDone) {
      setProgress(100);
    } else {
      setProgress(0);
    }
  }, [isActive, isDone]);

  return (
    <div
      className={`p-4 rounded-lg border-2 transition-all duration-300 ${
        isActive
          ? "border-blue-400 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-600 shadow-lg scale-105"
          : isDone
          ? "border-green-400 bg-green-50 dark:bg-green-900/30 dark:border-green-600"
          : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
      }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">
            {isActive ? "🔄" : isDone ? "✅" : "⏳"}
          </span>
          <span
            className={`font-semibold text-sm ${
              isActive
                ? "text-blue-700 dark:text-blue-300"
                : isDone
                ? "text-green-700 dark:text-green-300"
                : "text-gray-500 dark:text-gray-400"
            }`}>
            {checker.name}
          </span>
        </div>
        {isDone && checker.time && (
          <span className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-1 rounded">
            {checker.time}ms
          </span>
        )}
      </div>

      <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ease-out ${
            isActive
              ? "bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 animate-pulse"
              : isDone
              ? "bg-gradient-to-r from-green-500 to-green-600 dark:from-green-400 dark:to-green-500"
              : "bg-gray-300 dark:bg-gray-600"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {isActive && (
        <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-1 text-right">
          {Math.round(progress)}%
        </div>
      )}
      {isDone && (
        <div className="text-xs text-green-600 dark:text-green-400 font-semibold mt-1 text-right">
          ✓ Complete
        </div>
      )}
    </div>
  );
};

const OverallProgressBar = ({ progress, elapsedTime, currentPhase }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 border-2 border-blue-200 dark:border-blue-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex-1">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <span className="animate-pulse">🔍</span>
            System Health Check in Progress
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {currentPhase || "Initializing system scan..."}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
            {(elapsedTime / 1000).toFixed(1)}s
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Elapsed Time
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="flex justify-between text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          <span>Overall Progress</span>
          <span className="text-blue-600 dark:text-blue-400">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="relative h-4 sm:h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 dark:from-blue-400 dark:via-blue-500 dark:to-blue-600 transition-all duration-500 ease-out relative overflow-hidden"
            style={{ width: `${progress}%` }}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white dark:via-gray-300 to-transparent opacity-30 animate-shimmer" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-white dark:text-gray-100 drop-shadow-lg">
              {progress > 5 && `${Math.round(progress)}%`}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
        {[
          { stage: 1, label: "Database" },
          { stage: 2, label: "Validation" },
          { stage: 3, label: "Logic" },
          { stage: 4, label: "Health" },
        ].map((item) => {
          const stageProgress = ((progress - (item.stage - 1) * 25) / 25) * 100;
          const isComplete = progress >= item.stage * 25;
          const isActive =
            progress >= (item.stage - 1) * 25 && progress < item.stage * 25;

          return (
            <div
              key={item.stage}
              className={`text-center p-2 rounded-lg transition-all ${
                isComplete
                  ? "bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-700"
                  : isActive
                  ? "bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700"
                  : "bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
              }`}>
              <div
                className={`text-xs font-semibold ${
                  isComplete
                    ? "text-green-700 dark:text-green-300"
                    : isActive
                    ? "text-blue-700 dark:text-blue-300"
                    : "text-gray-500 dark:text-gray-400"
                }`}>
                {item.label}
              </div>
              <div className="text-base sm:text-lg">
                {isComplete ? "✅" : isActive ? "🔄" : "⏳"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const StatsCard = ({
  icon,
  title,
  value,
  subtitle,
  color = "blue",
  isAnimating,
}) => {
  const colorClasses = {
    blue: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700",
    green:
      "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-700",
    yellow:
      "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-700",
    red: "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-700",
    gray: "bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700",
  };

  return (
    <div
      className={`rounded-lg shadow-md p-4 sm:p-6 border-2 transition-all duration-300 ${
        isAnimating ? "scale-105" : ""
      } ${colorClasses[color]}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 truncate">
            {title}
          </p>
          <p className="text-2xl sm:text-3xl font-bold truncate">
            {typeof value === "number" && isAnimating ? (
              <AnimatedCounter value={value} />
            ) : (
              value
            )}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
              {subtitle}
            </p>
          )}
        </div>
        <div className="text-3xl sm:text-4xl opacity-80 flex-shrink-0">
          {icon}
        </div>
      </div>
    </div>
  );
};

const MonitorDashboard = ({ user }) => {
  const userId = user?.id;
  const [isChecking, setIsChecking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentPhase, setCurrentPhase] = useState("");
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
  const isSavingRef = useRef(false); // Flag to prevent duplicate saves

  useEffect(() => {
    healthCheckerRef.current = new HealthChecker();
    isMountedRef.current = true;

    loadHistoryFromDatabase();

    const style = document.createElement("style");
    style.textContent = `
      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      .animate-shimmer {
        animation: shimmer 2s infinite;
      }
    `;
    document.head.appendChild(style);

    return () => {
      isMountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const saveResultsToDatabase = async (finalResults) => {
    // Log stack trace to see who's calling this
    console.log("🔍 STACK TRACE:", new Error().stack);
    console.log("🔍 isSavingRef.current:", isSavingRef.current);

    // Prevent duplicate saves
    if (isSavingRef.current) {
      console.log("⚠️ Save already in progress, skipping...");
      return;
    }

    try {
      isSavingRef.current = true;
      console.log("🔒 Locking save operation at:", new Date().toISOString());

      // Map status to valid database values (healthy, warning, critical ONLY)
      let dbStatus = String(
        finalResults.summary?.status || "healthy"
      ).toLowerCase();

      // Database constraint: CHECK (status = ANY (ARRAY['healthy', 'warning', 'critical']))
      const validStatuses = ["healthy", "warning", "critical"];

      if (!validStatuses.includes(dbStatus)) {
        console.log(
          `ℹ️ Mapping invalid status "${dbStatus}" to "healthy" for database constraint`
        );
        dbStatus = "healthy"; // Default to 'healthy' for 'info', 'unknown', etc.
      }

      const logEntry = {
        checked_by: user?.id || null,
        checked_at: new Date().toISOString(),
        status: dbStatus, // Use validated status
        total_issues: parseInt(finalResults.summary?.totalIssues) || 0,
        critical_count: parseInt(finalResults.summary?.criticalCount) || 0,
        warning_count: parseInt(finalResults.summary?.warningCount) || 0,
        info_count: parseInt(finalResults.summary?.infoCount) || 0,
        issues_detail: {
          database: finalResults.results?.database || {},
          validation: finalResults.results?.validation || {},
          businessLogic: finalResults.results?.businessLogic || {},
          appHealth: finalResults.results?.appHealth || {},
        },
        execution_time: parseInt(finalResults.executionTime) || null,
      };

      console.log(
        "📤 Saving to database at:",
        new Date().toISOString(),
        logEntry
      );

      const { data, error } = await supabase
        .from("system_health_logs")
        .insert([logEntry])
        .select();

      if (error) {
        console.error("❌ Database error:", error);
        throw error;
      }

      console.log(
        "✅ Saved to database successfully at:",
        new Date().toISOString(),
        data
      );
    } catch (error) {
      console.error("💥 Error saving to database:", error);
    } finally {
      // Reset flag after a delay to prevent immediate re-saves
      setTimeout(() => {
        isSavingRef.current = false;
        console.log(
          "🔓 Unlocking save operation at:",
          new Date().toISOString()
        );
      }, 2000);
    }
  };

  const loadHistoryFromDatabase = async () => {
    try {
      setIsLoadingHistory(true);

      const { data, error } = await supabase
        .from("system_health_logs")
        .select("*")
        .order("checked_at", { ascending: false })
        .limit(10);

      if (error) throw error;

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

  const runHealthCheck = async () => {
    if (isChecking) return;

    setIsChecking(true);
    setProgress(0);
    setElapsedTime(0);
    setResults(null);
    setError(null);
    startTimeRef.current = Date.now();
    isSavingRef.current = false; // Reset save flag when starting new check

    if (timerRef.current) clearInterval(timerRef.current);

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

    timerRef.current = setInterval(() => {
      if (isMountedRef.current) {
        setElapsedTime(Date.now() - startTimeRef.current);
      }
    }, 100);

    try {
      const checker = healthCheckerRef.current;

      // Simulate progress for each phase
      const phases = [
        {
          progress: 25,
          phase: "🗄️ Checking database connections and integrity...",
        },
        {
          progress: 50,
          phase: "✅ Validating data consistency and structure...",
        },
        { progress: 75, phase: "🧠 Verifying business rules and logic..." },
        { progress: 100, phase: "📱 Analyzing application health metrics..." },
      ];

      let phaseIndex = 0;
      const progressInterval = setInterval(() => {
        if (phaseIndex < phases.length && isMountedRef.current) {
          setProgress(phases[phaseIndex].progress);
          setCurrentPhase(phases[phaseIndex].phase);
          phaseIndex++;
        } else {
          clearInterval(progressInterval);
        }
      }, 3000);

      // Run full check (calls all checkers internally)
      const checkResult = await checker.runFullCheck(userId);

      clearInterval(progressInterval);

      if (!checkResult.success) {
        throw new Error(checkResult.error || "Health check failed");
      }

      // Update checker status with execution times
      const updatedCheckers = [
        {
          id: "database",
          name: "Database Check",
          status: "done",
          time: checkResult.results?.database?.executionTime || 0,
        },
        {
          id: "validation",
          name: "Data Validation",
          status: "done",
          time: checkResult.results?.validation?.executionTime || 0,
        },
        {
          id: "businessLogic",
          name: "Business Logic",
          status: "done",
          time: checkResult.results?.businessLogic?.executionTime || 0,
        },
        {
          id: "appHealth",
          name: "App Health",
          status: "done",
          time: checkResult.results?.appHealth?.executionTime || 0,
        },
      ];

      const finalResults = {
        timestamp: new Date().toISOString(),
        summary: checkResult.summary,
        results: checkResult.results,
        executionTime: checkResult.executionTime,
        errors: checkResult.errors,
      };

      console.log("✅ Final Results:", finalResults);
      console.log("✅ Summary:", finalResults.summary);

      // Save to database (with duplicate prevention)
      console.log("📝 Calling saveResultsToDatabase...");
      await saveResultsToDatabase(finalResults);
      console.log("📝 saveResultsToDatabase completed");

      if (isMountedRef.current) {
        setProgress(100);
        setCheckers(updatedCheckers);
        setResults(finalResults);
        setCurrentPhase("");
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 dark:text-white">
              System Health Monitor
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              Real-time system monitoring dashboard
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            {history.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 font-medium shadow-lg transition-all hover:scale-105 min-h-[44px] touch-manipulation order-2 sm:order-1">
                <span>📊</span>
                <span className="text-sm sm:text-base">
                  History ({history.length})
                </span>
              </button>
            )}
            <button
              onClick={runHealthCheck}
              disabled={isChecking}
              className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed font-medium shadow-lg transition-all hover:scale-105 min-h-[44px] touch-manipulation order-1 sm:order-2">
              {isChecking ? (
                <>
                  <span className="animate-spin">🔄</span>
                  <span className="text-sm sm:text-base">Checking...</span>
                </>
              ) : (
                <>
                  <span>🔍</span>
                  <span className="text-sm sm:text-base">Run System Check</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">❌</span>
              <div>
                <h3 className="font-semibold text-red-800 dark:text-red-300">
                  Check Failed
                </h3>
                <p className="text-red-600 dark:text-red-400 text-sm">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* History Panel */}
        {showHistory && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 border-2 border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                Check History
                {isLoadingHistory && (
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                    Loading...
                  </span>
                )}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={loadHistoryFromDatabase}
                  disabled={isLoadingHistory}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium disabled:text-gray-400 dark:disabled:text-gray-600 px-3 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
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
                          .neq("id", "00000000-0000-0000-0000-000000000000");

                        if (error) throw error;

                        setHistory([]);
                        alert("History cleared successfully!");
                      } catch (err) {
                        alert("Error clearing history: " + err.message);
                      }
                    }
                  }}
                  className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium px-3 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                  Clear All
                </button>
              </div>
            </div>

            {isLoadingHistory ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <div className="animate-spin text-4xl mb-2">🔄</div>
                Loading history...
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <div className="text-4xl mb-2">🔭</div>
                No history available
              </div>
            ) : (
              <div className="space-y-3 max-h-72 sm:max-h-96 overflow-y-auto pr-2">
                {history.map((item, index) => (
                  <div
                    key={item.id || index}
                    className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer touch-manipulation"
                    onClick={() => {
                      setResults(item);
                      setShowHistory(false);
                    }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl sm:text-3xl flex-shrink-0">
                        {getStatusIcon(item.summary.status)}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-800 dark:text-gray-200 text-sm sm:text-base truncate">
                          {formatTimestamp(item.timestamp)}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                          {item.summary.totalIssues} issues •{" "}
                          {formatTime(item.executionTime)}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                        item.summary.status === "healthy"
                          ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                          : item.summary.status === "warning"
                          ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300"
                          : item.summary.status === "critical"
                          ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                          : "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
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
          <>
            <OverallProgressBar
              progress={progress}
              elapsedTime={elapsedTime}
              currentPhase={currentPhase}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {checkers.map((checker) => {
                const isActive =
                  progress >= checkers.indexOf(checker) * 25 &&
                  progress < (checkers.indexOf(checker) + 1) * 25;
                const isDone = checker.status === "done";

                return (
                  <CheckerProgressBar
                    key={checker.id}
                    checker={checker}
                    isActive={isActive}
                    isDone={isDone}
                  />
                );
              })}
            </div>
          </>
        )}

        {/* Results Section */}
        {!isChecking && results && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              <StatsCard
                icon={getStatusIcon(results.summary?.status || "healthy")}
                title="Overall Status"
                value={(results.summary?.status || "unknown").toUpperCase()}
                color={getStatusColor(results.summary?.status || "gray")}
                isAnimating={true}
              />
              <StatsCard
                icon="📊"
                title="Total Issues"
                value={Number(results.summary?.totalIssues) || 0}
                subtitle={`${
                  Number(results.summary?.criticalCount) || 0
                } critical, ${
                  Number(results.summary?.warningCount) || 0
                } warning, ${Number(results.summary?.infoCount) || 0} info`}
                color={
                  (Number(results.summary?.totalIssues) || 0) === 0
                    ? "green"
                    : (Number(results.summary?.criticalCount) || 0) > 0
                    ? "red"
                    : "yellow"
                }
                isAnimating={true}
              />
              <StatsCard
                icon="⚡"
                title="Execution Time"
                value={formatTime(results.executionTime || 0)}
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Checker Results */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-800 dark:text-white">
                  Checker Results
                </h3>
                <div className="space-y-3">
                  {checkers
                    .filter((c) => c.status === "done")
                    .map((checker) => {
                      const resultKey = checker.id;
                      const value = results.results?.[resultKey];

                      // Safely get issue count
                      let issueCount = 0;
                      if (value?.issues && Array.isArray(value.issues)) {
                        issueCount = value.issues.length;
                      } else if (value?.checks && Array.isArray(value.checks)) {
                        issueCount = value.checks.length;
                      }

                      const status =
                        value?.status ||
                        (issueCount === 0 ? "healthy" : "info");

                      return (
                        <div
                          key={checker.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-2xl flex-shrink-0">
                              {getStatusIcon(status)}
                            </span>
                            <div className="min-w-0">
                              <div className="font-medium text-gray-800 dark:text-gray-200 text-sm sm:text-base truncate">
                                {checker.name}
                              </div>
                              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                                {issueCount} issue{issueCount !== 1 ? "s" : ""}{" "}
                                found • {checker.time || 0}ms
                              </div>
                            </div>
                          </div>
                          <span
                            className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                              status === "healthy"
                                ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                                : status === "warning"
                                ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300"
                                : status === "critical"
                                ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                                : "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                            }`}>
                            {String(status)}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-800 dark:text-white">
                  Performance Metrics
                </h3>
                <div className="space-y-3 sm:space-y-4">
                  {checkers
                    .filter((c) => c.status === "done")
                    .map((checker) => (
                      <div key={checker.id}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                            {checker.name}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400 flex-shrink-0 ml-2">
                            {checker.time}ms
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 transition-all duration-1000"
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

                <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-900 dark:text-blue-300">
                      Total Execution
                    </span>
                    <span className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {formatTime(results.executionTime)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Issues Detail */}
            {results.summary.totalIssues > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-800 dark:text-white flex items-center gap-2">
                  <span>🔍</span>
                  Issues Found ({results.summary.totalIssues})
                </h3>
                <div className="space-y-3">
                  {(() => {
                    console.log(
                      "🔍 DEBUG - Results structure:",
                      results.results
                    );

                    const allIssues = [];

                    Object.entries(results.results || {}).forEach(
                      ([checkerName, checkerResult]) => {
                        const issues =
                          checkerResult?.issues || checkerResult?.checks || [];

                        if (!Array.isArray(issues) || issues.length === 0)
                          return;

                        console.log(
                          `🔍 DEBUG - ${checkerName} issues:`,
                          issues
                        );

                        issues.forEach((issue, idx) => {
                          console.log(
                            `🔍 DEBUG - Issue ${idx}:`,
                            issue,
                            "Type:",
                            typeof issue
                          );

                          // Handle different issue formats - ensure everything is a string or null
                          let issueMessage = "Unknown issue";
                          let issueDetails = null;
                          let issueSeverity = "info";
                          let issueTable = null;
                          let issueCount = null;
                          let issueCategory = null;

                          if (typeof issue === "string") {
                            issueMessage = issue;
                          } else if (
                            typeof issue === "object" &&
                            issue !== null
                          ) {
                            // Safely extract message
                            if (issue.message) {
                              issueMessage = String(issue.message);
                            } else if (issue.description) {
                              issueMessage = String(issue.description);
                            }

                            // Safely extract other fields
                            if (
                              issue.details &&
                              typeof issue.details === "string"
                            ) {
                              issueDetails = issue.details;
                            } else if (
                              issue.details &&
                              typeof issue.details === "object"
                            ) {
                              issueDetails = JSON.stringify(issue.details);
                            }

                            if (issue.severity)
                              issueSeverity = String(issue.severity);
                            if (issue.table) issueTable = String(issue.table);
                            if (issue.count) issueCount = Number(issue.count);

                            // Handle category - could be string or object
                            if (issue.category) {
                              if (typeof issue.category === "string") {
                                issueCategory = issue.category;
                              } else if (typeof issue.category === "object") {
                                issueCategory = JSON.stringify(issue.category);
                              }
                            }
                          }

                          const displayName =
                            checkerName === "validation"
                              ? "Data Validation"
                              : checkerName === "businessLogic"
                              ? "Business Logic"
                              : checkerName === "appHealth"
                              ? "App Health"
                              : checkerName === "database"
                              ? "Database Check"
                              : String(checkerName);

                          allIssues.push({
                            key: `${checkerName}-${idx}`,
                            message: issueMessage,
                            details: issueDetails,
                            severity: issueSeverity,
                            table: issueTable,
                            count: issueCount,
                            category: issueCategory,
                            source: displayName,
                          });
                        });
                      }
                    );

                    return allIssues.map((issue) => (
                      <div
                        key={issue.key}
                        className={`p-4 rounded-lg border-l-4 transition-all hover:shadow-md ${
                          issue.severity === "critical"
                            ? "border-red-500 dark:border-red-600 bg-red-50 dark:bg-red-900/30"
                            : issue.severity === "warning"
                            ? "border-yellow-500 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/30"
                            : "border-blue-500 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/30"
                        }`}>
                        <div className="flex items-start gap-3">
                          <span className="text-xl flex-shrink-0">
                            {issue.severity === "critical"
                              ? "🔴"
                              : issue.severity === "warning"
                              ? "⚠️"
                              : "ℹ️"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-800 dark:text-gray-200 mb-1 text-sm sm:text-base">
                              {issue.message}
                            </div>
                            {issue.details && (
                              <div className="text-sm text-gray-700 dark:text-gray-300">
                                {issue.details}
                              </div>
                            )}
                            {issue.table && (
                              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                <span className="font-semibold">Table:</span>{" "}
                                {issue.table}
                                {issue.count && (
                                  <span className="ml-2">
                                    • {issue.count} affected
                                  </span>
                                )}
                              </div>
                            )}
                            {issue.category && (
                              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                <span className="inline-block bg-white dark:bg-gray-700 px-2 py-1 rounded border border-gray-300 dark:border-gray-600">
                                  {issue.category}
                                </span>
                              </div>
                            )}
                            <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                              From: {issue.source}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold flex-shrink-0 ${
                              issue.severity === "critical"
                                ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                                : issue.severity === "warning"
                                ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300"
                                : "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                            }`}>
                            {issue.severity}
                          </span>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!isChecking && !results && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 sm:p-12 text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
            <div className="text-5xl sm:text-6xl mb-4">🔍</div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white mb-2">
              Ready to Check System Health
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4 sm:mb-6 text-sm sm:text-base">
              Click "Run System Check" to start monitoring your system
            </p>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-8 text-sm text-gray-500 dark:text-gray-400">
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
