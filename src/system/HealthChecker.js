import { supabase } from "../supabaseClient";
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

  async runFullCheck(userId) {
    console.log("🔍 Starting system health check...");
    this.startTime = Date.now();
    this.errors = [];

    try {
      // Run all checks in parallel
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
      const summary = this.calculateSummary();

      console.log("✅ Health check completed:", summary);

      // Save to database
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

  // === DATABASE CHECKER ===
  async runDatabaseCheck() {
    console.log("🔍 Running database checks...");
    const startTime = Date.now();
    const issues = [];

    try {
      // 1. Check connection
      const { data, error } = await supabase
        .from("students")
        .select("id")
        .limit(1);
      if (error) {
        issues.push({
          title: "Database connection failed",
          message: "Unable to connect to database",
          severity: "critical",
          details: { description: error.message },
        });
        return {
          status: "critical",
          checks: issues,
          executionTime: Date.now() - startTime,
        };
      }

      // 2. Check essential tables
      const tables = ["students", "users", "classes", "academic_years"];
      for (const table of tables) {
        const { error } = await supabase.from(table).select("id").limit(1);
        if (error) {
          issues.push({
            title: `Table '${table}' inaccessible`,
            message: `Critical table cannot be accessed`,
            severity: "critical",
            details: { table, description: error.message },
          });
        }
      }

      // 3. Check orphaned students
      const { data: students } = await supabase
        .from("students")
        .select("id, class_id")
        .not("class_id", "is", null)
        .limit(50);
      if (students && students.length > 0) {
        const classIds = [...new Set(students.map((s) => s.class_id))];
        const { data: existingClasses } = await supabase
          .from("classes")
          .select("id")
          .in("id", classIds);
        const existingIds = new Set(existingClasses?.map((c) => c.id) || []);
        const orphaned = students.filter(
          (s) => !existingIds.has(s.class_id)
        ).length;

        if (orphaned > 0) {
          issues.push({
            title: "Students with invalid class references",
            message: `Found ${orphaned} students referencing non-existent classes`,
            severity: "warning",
            details: { affectedRecords: orphaned },
          });
        }
      }

      return {
        status:
          issues.length === 0
            ? "healthy"
            : issues.some((i) => i.severity === "critical")
            ? "critical"
            : "warning",
        checks: issues,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error("❌ Database check failed:", error);
      return {
        status: "critical",
        checks: [
          {
            title: "Database check crashed",
            message: "Unexpected error during database check",
            severity: "critical",
            details: { description: error.message },
          },
        ],
        executionTime: Date.now() - startTime,
      };
    }
  }

  // === DATA VALIDATION CHECKER ===
  async runDataValidationCheck() {
    console.log("🔍 Running data validation checks...");
    const startTime = Date.now();
    const issues = [];

    try {
      // Check students without names
      const { data: noNameStudents } = await supabase
        .from("students")
        .select("id")
        .or('full_name.is.null,full_name.eq.""')
        .limit(10);
      if (noNameStudents?.length > 0) {
        issues.push({
          title: "Students with missing names",
          message: `Found ${noNameStudents.length} students without names`,
          severity: "critical",
          details: { affectedRecords: noNameStudents.length },
        });
      }

      // Check users without usernames
      const { data: noUsernameUsers } = await supabase
        .from("users")
        .select("id")
        .or('username.is.null,username.eq.""')
        .limit(10);
      if (noUsernameUsers?.length > 0) {
        issues.push({
          title: "Users with missing usernames",
          message: `Found ${noUsernameUsers.length} users without username`,
          severity: "critical",
          details: { affectedRecords: noUsernameUsers.length },
        });
      }

      return {
        status:
          issues.length === 0
            ? "healthy"
            : issues.some((i) => i.severity === "critical")
            ? "critical"
            : "warning",
        checks: issues,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error("❌ Data validation check failed:", error);
      return {
        status: "warning",
        checks: [
          {
            title: "Data validation check failed",
            message: "Error during data validation",
            severity: "warning",
            details: { description: error.message },
          },
        ],
        executionTime: Date.now() - startTime,
      };
    }
  }

  // === BUSINESS LOGIC CHECKER ===
  async runBusinessLogicCheck() {
    console.log("🔍 Running business logic checks...");
    const startTime = Date.now();
    const issues = [];

    try {
      // Check active academic year
      const { data: activeYears } = await supabase
        .from("academic_years")
        .select("*")
        .eq("is_active", true);
      if (!activeYears || activeYears.length === 0) {
        issues.push({
          title: "No active academic year",
          message: "System requires an active academic year",
          severity: "critical",
          details: {
            description: "Set an academic year as active in settings",
          },
        });
      } else if (activeYears.length > 1) {
        issues.push({
          title: "Multiple active academic years",
          message: `Found ${activeYears.length} active academic years`,
          severity: "warning",
          details: { affectedRecords: activeYears.length },
        });
      }

      return {
        status:
          issues.length === 0
            ? "healthy"
            : issues.some((i) => i.severity === "critical")
            ? "critical"
            : "warning",
        checks: issues,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error("❌ Business logic check failed:", error);
      return {
        status: "warning",
        checks: [
          {
            title: "Business logic check failed",
            message: "Error during business logic validation",
            severity: "warning",
            details: { description: error.message },
          },
        ],
        executionTime: Date.now() - startTime,
      };
    }
  }

  // === APP HEALTH CHECKER ===
  async runAppHealthCheck() {
    console.log("🔍 Running comprehensive app health checks...");
    const startTime = Date.now();

    try {
      const result = await checkAppHealth();

      // If check failed completely
      if (!result.success) {
        return {
          status: "critical",
          checks: [
            {
              title: "App health check failed",
              message: "Failed to complete application health check",
              severity: "critical",
              details: { description: "Check function returned failure" },
            },
          ],
          executionTime: Date.now() - startTime,
        };
      }

      // Convert format from AppHealthChecker to HealthChecker format
      const checks = result.issues.map((issue) => ({
        title: issue.message || "Unknown issue",
        message: issue.details || "No details provided",
        severity: issue.severity || "info",
        details: {
          table: issue.table || "unknown",
          category: issue.category || "app_health",
          description: issue.details || "No description",
        },
      }));

      // Determine overall status
      const hasCritical = checks.some((c) => c.severity === "critical");
      const hasWarning = checks.some((c) => c.severity === "warning");

      let status = "healthy";
      if (hasCritical) status = "critical";
      else if (hasWarning) status = "warning";

      console.log(
        `✅ App Health Check completed: ${checks.length} issues found, status: ${status}`
      );

      return {
        status,
        checks,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error("❌ App health check failed:", error);
      return {
        status: "critical",
        checks: [
          {
            title: "App health check crashed",
            message: "Failed to complete application health check",
            severity: "critical",
            details: {
              description: error.message,
            },
          },
        ],
        executionTime: Date.now() - startTime,
      };
    }
  }

  // === HELPER METHODS ===
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
        executionTime: 0,
      };
    }
  }

  calculateSummary() {
    let totalIssues = 0;
    let criticalCount = 0;
    let warningCount = 0;
    let infoCount = 0;
    let totalChecksRun = 0;

    const countIssues = (checks) => {
      if (!checks || !Array.isArray(checks)) return;
      checks.forEach((check) => {
        totalIssues++;
        if (check.severity === "critical") criticalCount++;
        else if (check.severity === "warning") warningCount++;
        else if (check.severity === "info") infoCount++;
      });
    };

    // Count checks that actually ran
    if (this.results.database && this.results.database.status) totalChecksRun++;
    if (this.results.validation && this.results.validation.status)
      totalChecksRun++;
    if (this.results.businessLogic && this.results.businessLogic.status)
      totalChecksRun++;
    if (this.results.appHealth && this.results.appHealth.status)
      totalChecksRun++;

    // Count all issues
    countIssues(this.results.database?.checks);
    countIssues(this.results.validation?.checks);
    countIssues(this.results.businessLogic?.checks);
    countIssues(this.results.appHealth?.checks);

    // Determine overall status (info doesn't affect status)
    let overallStatus = "healthy";
    if (criticalCount > 0) overallStatus = "critical";
    else if (warningCount > 0) overallStatus = "warning";

    return {
      totalIssues,
      criticalCount,
      warningCount,
      infoCount,
      totalChecksRun,
      status: overallStatus,
    };
  }

  async saveResults(userId, summary, executionTime) {
    try {
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

  getSeverityIcon(status) {
    const icons = { healthy: "✅", warning: "⚠️", critical: "🔴", info: "ℹ️" };
    return icons[status] || "❓";
  }

  getSeverityColor(status) {
    const colors = {
      healthy: "green",
      warning: "yellow",
      critical: "red",
      info: "blue",
    };
    return colors[status] || "gray";
  }
}

export default HealthChecker;
