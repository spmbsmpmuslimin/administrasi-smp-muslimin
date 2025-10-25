import { supabase } from "../supabaseClient";
import { checkDatabase } from "./checkers/DatabaseChecker";
import { checkDataValidation } from "./checkers/DataValidator";
import { checkBusinessLogic } from "./checkers/BusinessLogicChecker";
import { checkAppHealth } from "./checkers/AppHealthChecker";

class HealthChecker {
  constructor() {
    this.results = {
      database: null,
      validation: null,
      businessLogic: null,
      appHealth: null,
    };
    this.startTime = null;
    this.errors = [];
  }

  /**
   * Run full system health check
   * @param {string} userId - UUID of admin running the check
   * @returns {Object} Check results with summary
   */
  async runFullCheck(userId) {
    console.log("🔍 Starting system health check...");
    this.startTime = Date.now();
    this.errors = [];

    try {
      // Run all checks in parallel for better performance
      const [database, validation, businessLogic, appHealth] =
        await Promise.allSettled([
          this.runDatabaseCheck(),
          this.runDataValidationCheck(),
          this.runBusinessLogicCheck(),
          this.runAppHealthCheck(),
        ]);

      // Process results
      this.results.database = this.processCheckResult(
        database,
        "Database Check"
      );
      this.results.validation = this.processCheckResult(
        validation,
        "Data Validation"
      );
      this.results.businessLogic = this.processCheckResult(
        businessLogic,
        "Business Logic"
      );
      this.results.appHealth = this.processCheckResult(appHealth, "App Health");

      const executionTime = Date.now() - this.startTime;

      // Calculate summary
      const summary = this.calculateSummary();

      console.log("✅ Health check completed:", summary);

      // Save results to database
      await this.saveResults(userId, summary, executionTime);

      return {
        success: true,
        summary,
        results: this.results,
        executionTime,
        errors: this.errors,
      };
    } catch (error) {
      console.error("❌ Health check failed:", error);
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - this.startTime,
      };
    }
  }

  /**
   * Run database integrity checks
   */
  async runDatabaseCheck() {
    console.log("🔍 Running database checks...");
    try {
      const result = await checkDatabase();
      console.log("✅ Database check completed:", result);

      // Transform issues to checks and calculate status
      return this.transformResult(result, "database");
    } catch (error) {
      console.error("❌ Database check failed:", error);
      this.errors.push({ checker: "database", error: error.message });
      return {
        status: "critical",
        error: error.message,
        checks: [],
      };
    }
  }

  /**
   * Run data validation checks
   */
  async runDataValidationCheck() {
    console.log("🔍 Running data validation checks...");
    try {
      const result = await checkDataValidation();
      console.log("✅ Data validation check completed:", result);

      // Transform issues to checks and calculate status
      return this.transformResult(result, "validation");
    } catch (error) {
      console.error("❌ Data validation check failed:", error);
      this.errors.push({ checker: "validation", error: error.message });
      return {
        status: "warning",
        error: error.message,
        checks: [],
      };
    }
  }

  /**
   * Run business logic checks
   */
  async runBusinessLogicCheck() {
    console.log("🔍 Running business logic checks...");
    try {
      const result = await checkBusinessLogic();
      console.log("✅ Business logic check completed:", result);

      // Transform issues to checks and calculate status
      return this.transformResult(result, "businessLogic");
    } catch (error) {
      console.error("❌ Business logic check failed:", error);
      this.errors.push({ checker: "businessLogic", error: error.message });
      return {
        status: "warning",
        error: error.message,
        checks: [],
      };
    }
  }

  /**
   * Run application health checks
   */
  async runAppHealthCheck() {
    console.log("🔍 Running app health checks...");
    try {
      const result = await checkAppHealth();
      console.log("✅ App health check completed:", result);

      // Transform issues to checks and calculate status
      return this.transformResult(result, "appHealth");
    } catch (error) {
      console.error("❌ App health check failed:", error);
      this.errors.push({ checker: "appHealth", error: error.message });
      return {
        status: "info",
        error: error.message,
        checks: [],
      };
    }
  }

  /**
   * Transform checker result to expected format
   * Converts 'issues' array to 'checks' array and determines status
   */
  transformResult(result, checkerType) {
    if (!result || !result.success) {
      return {
        status: "critical",
        error: result?.error || "Check failed",
        checks: [],
      };
    }

    // Transform issues to checks
    const checks = result.issues || [];

    // Determine status based on severity of issues
    let status = "healthy";
    let hasCritical = false;
    let hasWarning = false;

    checks.forEach((issue) => {
      if (issue.severity === "critical") {
        hasCritical = true;
      } else if (issue.severity === "warning") {
        hasWarning = true;
      }
    });

    if (hasCritical) {
      status = "critical";
    } else if (hasWarning) {
      status = "warning";
    } else if (checks.length > 0) {
      status = "info";
    }

    return {
      status,
      checks,
      executionTime: result.executionTime,
    };
  }

  /**
   * Process check result from Promise.allSettled
   */
  processCheckResult(result, checkName) {
    if (result.status === "fulfilled") {
      return result.value;
    } else {
      console.error(`${checkName} rejected:`, result.reason);
      this.errors.push({
        checker: checkName,
        error: result.reason?.message || "Unknown error",
      });
      return {
        status: "critical",
        error: result.reason?.message || "Check failed",
        checks: [],
      };
    }
  }

  /**
   * Calculate summary from all check results
   */
  calculateSummary() {
    let totalIssues = 0;
    let criticalCount = 0;
    let warningCount = 0;
    let infoCount = 0;
    let overallStatus = "healthy";

    // Helper function to count issues
    const countIssues = (checks) => {
      if (!checks || !Array.isArray(checks)) return;

      checks.forEach((check) => {
        totalIssues++;
        if (check.severity === "critical") {
          criticalCount++;
        } else if (check.severity === "warning") {
          warningCount++;
        } else if (check.severity === "info") {
          infoCount++;
        }
      });
    };

    // Count issues from each checker
    if (this.results.database?.checks) {
      countIssues(this.results.database.checks);
    }

    if (this.results.validation?.checks) {
      countIssues(this.results.validation.checks);
    }

    if (this.results.businessLogic?.checks) {
      countIssues(this.results.businessLogic.checks);
    }

    if (this.results.appHealth?.checks) {
      countIssues(this.results.appHealth.checks);
    }

    // Determine overall status
    if (criticalCount > 0) {
      overallStatus = "critical";
    } else if (warningCount > 0) {
      overallStatus = "warning";
    } else if (infoCount > 0) {
      overallStatus = "healthy";
    }

    return {
      totalIssues,
      criticalCount,
      warningCount,
      infoCount,
      status: overallStatus,
    };
  }

  /**
   * Save check results to database
   */
  async saveResults(userId, summary, executionTime) {
    try {
      console.log("💾 Saving results to database...");

      const { data, error } = await supabase
        .from("system_health_logs")
        .insert({
          checked_at: new Date().toISOString(),
          checked_by: userId,
          total_issues: summary.totalIssues,
          critical_count: summary.criticalCount,
          warning_count: summary.warningCount,
          info_count: summary.infoCount,
          issues_detail: this.results,
          execution_time: executionTime,
          status: summary.status,
        })
        .select()
        .single();

      if (error) throw error;

      console.log("✅ Results saved successfully:", data.id);
      return data;
    } catch (error) {
      console.error("❌ Error saving health check results:", error);
      throw error;
    }
  }

  /**
   * Get severity level for UI display
   */
  getSeverityIcon(status) {
    const icons = {
      healthy: "✅",
      warning: "⚠️",
      critical: "🔴",
      info: "ℹ️",
      ok: "✅",
      error: "❌",
    };
    return icons[status] || "❓";
  }

  /**
   * Get severity color for UI display
   */
  getSeverityColor(status) {
    const colors = {
      healthy: "green",
      warning: "yellow",
      critical: "red",
      info: "blue",
      ok: "green",
      error: "red",
    };
    return colors[status] || "gray";
  }
}

export default HealthChecker;
