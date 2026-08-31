// src/system/checkers/BusinessLogicChecker.js
import { supabase } from "../../supabaseClient";

/**
 * BusinessLogicChecker - Comprehensive business logic validation
 * Checks: Academic Rules, Scheduling Conflicts, Capacity Limits, Business Constraints
 */

export const checkBusinessLogic = async () => {
  console.log("🔍 BusinessLogicChecker: Starting comprehensive check...");

  const issues = [];
  const startTime = Date.now();

  try {
    // 1. Check Academic Year Rules
    console.log("📚 Checking academic year business rules...");
    const academicYearIssues = await checkAcademicYearRules();
    issues.push(...academicYearIssues);

    // 2. Check Attendance Business Logic
    console.log("📅 Checking attendance business logic...");
    const attendanceIssues = await checkAttendanceLogic();
    issues.push(...attendanceIssues);

    // 3. Check Grade Business Logic
    console.log("📊 Checking grade business logic...");
    const gradeIssues = await checkGradeLogic();
    issues.push(...gradeIssues);

    // 4. Check Class Capacity and Assignment
    console.log("🏫 Checking class capacity and assignments...");
    const classIssues = await checkClassLogic();
    issues.push(...classIssues);

    // 5. Check Teacher Schedule Conflicts
    console.log("👨‍🏫 Checking teacher schedule conflicts...");
    const scheduleIssues = await checkTeacherScheduleConflicts();
    issues.push(...scheduleIssues);

    // 6. Check Teacher Assignment Logic
    console.log("📝 Checking teacher assignment logic...");
    const assignmentIssues = await checkTeacherAssignmentLogic();
    issues.push(...assignmentIssues);

    // 6b. Check Stale Teacher Assignments (guru gak kejadwal lagi di kelas itu)
    console.log("🗓️ Checking stale teacher assignments...");
    const staleAssignmentIssues = await checkStaleTeacherAssignments();
    issues.push(...staleAssignmentIssues);

    // 7. Check Konseling Business Rules
    console.log("💬 Checking konseling business rules...");
    const konselingIssues = await checkKonselingLogic();
    issues.push(...konselingIssues);

    // 8. Check Student Status Consistency
    console.log("👨‍🎓 Checking student status consistency...");
    const studentStatusIssues = await checkStudentStatusLogic();
    issues.push(...studentStatusIssues);

    const executionTime = Date.now() - startTime;
    console.log(`✅ BusinessLogicChecker completed in ${executionTime}ms`);
    console.log(`📊 Found ${issues.length} business logic issues`);

    return {
      success: true,
      issues,
      executionTime,
    };
  } catch (error) {
    console.error("❌ BusinessLogicChecker error:", error);
    return {
      success: false,
      issues: [
        {
          category: "business_logic",
          severity: "critical",
          message: "Business logic checker failed",
          details: error.message,
          table: "system",
        },
      ],
      executionTime: Date.now() - startTime,
    };
  }
};

/**
 * Check Academic Year Business Rules
 */
const checkAcademicYearRules = async () => {
  const issues = [];

  try {
    // 1. Multiple active academic years (CRITICAL!)
    const { data: activeYears } = await supabase
      .from("academic_years")
      .select("id, year, semester, start_date, end_date")
      .eq("is_active", true);

    if (activeYears && activeYears.length > 1) {
      issues.push({
        category: "business_logic",
        severity: "critical",
        message: "Multiple active academic years detected",
        details: `Found ${activeYears.length} active academic years: ${activeYears
          .map((y) => `${y.year}-${y.semester}`)
          .join(", ")}. Only ONE should be active!`,
        table: "academic_years",
      });
    }

    if (!activeYears || activeYears.length === 0) {
      issues.push({
        category: "business_logic",
        severity: "critical",
        message: "No active academic year",
        details:
          "System requires exactly one active academic year for proper operation",
        table: "academic_years",
      });
    }

    // 2. Academic year dates overlap
    const { data: allYears } = await supabase
      .from("academic_years")
      .select("id, year, semester, start_date, end_date")
      .not("start_date", "is", null)
      .not("end_date", "is", null)
      .order("start_date", { ascending: true });

    if (allYears && allYears.length > 1) {
      for (let i = 0; i < allYears.length - 1; i++) {
        const current = allYears[i];
        const next = allYears[i + 1];

        if (new Date(current.end_date) > new Date(next.start_date)) {
          issues.push({
            category: "business_logic",
            severity: "warning",
            message: "Academic year date overlap detected",
            details: `${current.year}-${current.semester} ends after ${next.year}-${next.semester} starts`,
            table: "academic_years",
          });
        }
      }
    }

    // 3. Active academic year in the past
    if (activeYears && activeYears.length === 1) {
      const active = activeYears[0];
      const today = new Date().toISOString().split("T")[0];

      if (active.end_date && active.end_date < today) {
        const daysPast = Math.floor(
          (new Date(today) - new Date(active.end_date)) / (1000 * 60 * 60 * 24),
        );
        issues.push({
          category: "business_logic",
          severity: "warning",
          message: "Active academic year has ended",
          details: `Academic year ${active.year}-${active.semester} ended ${daysPast} days ago. Consider updating to new academic year.`,
          table: "academic_years",
        });
      }
    }
  } catch (error) {
    console.error("Error checking academic year rules:", error);
    issues.push({
      category: "business_logic",
      severity: "info",
      message: "Could not complete academic year rules check",
      details: error.message,
      table: "academic_years",
    });
  }

  return issues;
};

/**
 * Check Attendance Business Logic
 */
const checkAttendanceLogic = async () => {
  const issues = [];

  try {
    const today = new Date().toISOString().split("T")[0];

    // 1. Attendances recorded in the future
    const { data: futureAttendances, count: futureCount } = await supabase
      .from("attendances")
      .select("id, date, student_id", { count: "exact" })
      .gt("date", today)
      .limit(50);

    if (futureCount > 0) {
      issues.push({
        category: "business_logic",
        severity: "warning",
        message: "Attendance recorded for future dates",
        details: `Found ${futureCount} attendance records with dates in the future - this violates business logic`,
        table: "attendances",
      });
    }

    // 2. Multiple attendances same student same day same subject
    const { data: recentAttendances } = await supabase
      .from("attendances")
      .select("student_id, date, subject, class_id")
      .gte(
        "date",
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      )
      .limit(1000);

    if (recentAttendances) {
      const attendanceMap = new Map();
      recentAttendances.forEach((att) => {
        const key = `${att.student_id}-${att.date}-${att.subject}`;
        attendanceMap.set(key, (attendanceMap.get(key) || 0) + 1);
      });

      const duplicates = Array.from(attendanceMap.values()).filter(
        (count) => count > 1,
      ).length;
      if (duplicates > 0) {
        issues.push({
          category: "business_logic",
          severity: "warning",
          message: "Duplicate attendance entries detected",
          details: `Found ${duplicates} cases where same student has multiple attendance records for same subject on same day`,
          table: "attendances",
        });
      }
    }

    // 3. Attendance for inactive students
    const { data: inactiveAttendances } = await supabase
      .from("attendances")
      .select(
        `
        id,
        date,
        students!inner(is_active, full_name)
      `,
      )
      .gte(
        "date",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      )
      .eq("students.is_active", false)
      .limit(50);

    if (inactiveAttendances && inactiveAttendances.length > 0) {
      issues.push({
        category: "business_logic",
        severity: "warning",
        message: "Recent attendance for inactive students",
        details: `Found ${inactiveAttendances.length} attendance records in last 30 days for students marked as inactive`,
        table: "attendances",
      });
    }
  } catch (error) {
    console.error("Error checking attendance logic:", error);
    issues.push({
      category: "business_logic",
      severity: "info",
      message: "Could not complete attendance logic check",
      details: error.message,
      table: "attendances",
    });
  }

  return issues;
};

/**
 * Check Grade Business Logic
 */
const checkGradeLogic = async () => {
  const issues = [];

  try {
    // 1. Grades outside valid range
    const { data: invalidScores, count: invalidCount } = await supabase
      .from("grades")
      .select("id, score, subject", { count: "exact" })
      .or("score.lt.0,score.gt.100")
      .limit(50);

    if (invalidCount > 0) {
      issues.push({
        category: "business_logic",
        severity: "warning",
        message: "Grades outside valid range (0-100)",
        details: `Found ${invalidCount} grade entries with scores outside the valid 0-100 range`,
        table: "grades",
      });
    }

    // 2. Grades for inactive students (recent)
    const { data: inactiveGrades } = await supabase
      .from("grades")
      .select(
        `
        id,
        created_at,
        students!inner(is_active, full_name)
      `,
      )
      .gte(
        "created_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      )
      .eq("students.is_active", false)
      .limit(50);

    if (inactiveGrades && inactiveGrades.length > 0) {
      issues.push({
        category: "business_logic",
        severity: "warning",
        message: "Recent grades for inactive students",
        details: `Found ${inactiveGrades.length} grades entered in last 30 days for students marked as inactive`,
        table: "grades",
      });
    }
  } catch (error) {
    console.error("Error checking grade logic:", error);
    issues.push({
      category: "business_logic",
      severity: "info",
      message: "Could not complete grade logic check",
      details: error.message,
      table: "grades",
    });
  }

  return issues;
};

/**
 * Check Class Capacity and Assignment Logic
 */
const checkClassLogic = async () => {
  const issues = [];

  try {
    // Classes with too many or no students
    const { data: classes } = await supabase
      .from("classes")
      .select("id, grade")
      .eq("is_active", true);

    if (classes) {
      for (const classData of classes.slice(0, 50)) {
        const { count: studentCount } = await supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("class_id", classData.id)
          .eq("is_active", true);

        if (studentCount > 45) {
          issues.push({
            category: "business_logic",
            severity: "warning",
            message: "Class exceeds recommended capacity",
            details: `Class ${classData.grade} (ID: ${classData.id}) has ${studentCount} students - exceeds recommended limit of 45`,
            table: "classes",
          });
        }

        if (studentCount === 0) {
          issues.push({
            category: "business_logic",
            severity: "info",
            message: "Active class with no students",
            details: `Class ${classData.grade} (ID: ${classData.id}) is marked active but has no students assigned`,
            table: "classes",
          });
        }
      }
    }
  } catch (error) {
    console.error("Error checking class logic:", error);
    issues.push({
      category: "business_logic",
      severity: "info",
      message: "Could not complete class logic check",
      details: error.message,
      table: "classes",
    });
  }

  return issues;
};

/**
 * Check Teacher Schedule Conflicts
 */
const checkTeacherScheduleConflicts = async () => {
  const issues = [];

  try {
    // Get all teacher schedules
    // ✅ FIX: sebelumnya `.limit(500)` -- kalau total row di tabel ini
    // udah lebih dari 500 (gampang kelewat kalau puluhan guru x puluhan
    // slot/minggu), checker diem-diem cuma ngecek 500 row pertama dan
    // ngelewatin sisanya tanpa ada tanda apa-apa. Dihapus biar ngecek
    // SEMUA row.
    const { data: schedules } = await supabase
      .from("teacher_schedules")
      .select("id, teacher_id, day, start_time, end_time, class_id")
      .order("teacher_id", { ascending: true })
      .order("day", { ascending: true })
      .order("start_time", { ascending: true });

    if (schedules && schedules.length > 0) {
      // Group by teacher and day
      const teacherSchedules = new Map();
      schedules.forEach((schedule) => {
        const key = `${schedule.teacher_id}-${schedule.day}`;
        if (!teacherSchedules.has(key)) {
          teacherSchedules.set(key, []);
        }
        teacherSchedules.get(key).push(schedule);
      });

      // Check for time conflicts
      teacherSchedules.forEach((dayScheds) => {
        // ✅ FIX: sebelumnya `key.split("-")` buat narik teacherId & day
        // dari composite key -- tapi `teacher_id` itu UUID yang SENDIRINYA
        // udah pake tanda "-" (mis. "1ebde390-aa49-41c1-..."), jadi
        // ke-split jadi berkeping-keping dan yang kepake malah pecahan
        // UUID itu sendiri (makanya muncul "day: aa49" yang sebenernya
        // bukan nama hari). Sekarang ambil langsung dari object schedule
        // yang udah pasti benar, gak perlu rekonstruksi dari string key.
        if (dayScheds.length === 0) return;
        const teacherId = dayScheds[0].teacher_id;
        const day = dayScheds[0].day;

        for (let i = 0; i < dayScheds.length - 1; i++) {
          for (let j = i + 1; j < dayScheds.length; j++) {
            const sched1 = dayScheds[i];
            const sched2 = dayScheds[j];

            // Check time overlap
            if (
              sched1.start_time < sched2.end_time &&
              sched2.start_time < sched1.end_time
            ) {
              // ✅ FIX: sertain class_id tiap slot di pesan -- kalau
              // class_id-nya SAMA berarti ini murni row duplikat (data
              // ke-insert dobel), kalau class_id-nya BEDA berarti guru
              // ini emang kejadwal ngajar 2 kelas bersamaan (perlu dicek
              // manual, kemungkinan salah decode kode guru pas import).
              issues.push({
                category: "business_logic",
                severity: "critical",
                message: "Teacher schedule conflict detected",
                details: `Teacher ${teacherId} has overlapping schedules on ${day}: Kelas ${sched1.class_id} (${sched1.start_time}-${sched1.end_time}) and Kelas ${sched2.class_id} (${sched2.start_time}-${sched2.end_time})`,
                table: "teacher_schedules",
              });
            }
          }
        }
      });
    }
  } catch (error) {
    console.error("Error checking teacher schedule conflicts:", error);
    issues.push({
      category: "business_logic",
      severity: "info",
      message: "Could not complete teacher schedule conflict check",
      details: error.message,
      table: "teacher_schedules",
    });
  }

  return issues;
};

/**
 * Check Teacher Assignment Logic
 */
const checkTeacherAssignmentLogic = async () => {
  const issues = [];

  try {
    // Teachers assigned to too many classes
    const { data: assignments } = await supabase
      .from("teacher_assignments")
      .select("teacher_id, class_id, subject")
      .limit(1000);

    if (assignments) {
      const teacherClassCount = new Map();
      assignments.forEach((assignment) => {
        const key = assignment.teacher_id;
        teacherClassCount.set(key, (teacherClassCount.get(key) || 0) + 1);
      });

      teacherClassCount.forEach((count, teacherId) => {
        if (count > 20) {
          issues.push({
            category: "business_logic",
            severity: "warning",
            message: "Teacher assigned to excessive number of classes",
            details: `Teacher ${teacherId} is assigned to ${count} classes - exceeds recommended limit of 20`,
            table: "teacher_assignments",
          });
        }
      });
    }
  } catch (error) {
    console.error("Error checking teacher assignment logic:", error);
    issues.push({
      category: "business_logic",
      severity: "info",
      message: "Could not complete teacher assignment logic check",
      details: error.message,
      table: "teacher_assignments",
    });
  }

  return issues;
};

/**
 * Check Stale Teacher Assignments
 * Assignment (teacher_assignments) dianggap stale kalau guru itu udah gak
 * ada jadwal (teacher_schedules) sama sekali di kelas tsb -- kemungkinan
 * jadwal berubah di tengah semester (lewat Jadwal Massal / Jadwal
 * Mengajar guru) tapi Penugasan Guru-nya kelupaan diupdate manual.
 * Severity WARNING (bukan critical) karena ini bukan data corrupt --
 * presensi/nilai historis tetap aman (disimpen independen, gak nempel
 * ke assignment_id). Cuma ngingetin admin biar guru gak kejebak gabisa
 * input presensi/nilai di kelas barunya.
 * BP/BK selalu dikecualiin -- guru BK emang gak pernah punya jam masuk
 * kelas reguler tapi tetep butuh assignment buat keperluan presensi.
 */
const checkStaleTeacherAssignments = async () => {
  const issues = [];

  try {
    const { data: assignments } = await supabase
      .from("teacher_assignments")
      .select("id, teacher_id, class_id, subject")
      .limit(2000);

    if (!assignments || assignments.length === 0) return issues;

    // ⚠️ PENTING: teacher_assignments.teacher_id nyimpen KODE GURU (mis.
    // "G-01"), sedangkan teacher_schedules.teacher_id nyimpen UUID
    // (users.id). Wajib diterjemahin dulu lewat users.teacher_id (kode)
    // -> users.id (UUID) sebelum dibandingin, kalau enggak SEMUA
    // assignment bakal keflag stale (kode vs UUID gak akan pernah match).
    const [{ data: scheduleCombos }, { data: usersData }] = await Promise.all([
      supabase.from("teacher_schedules").select("teacher_id, class_id"),
      supabase
        .from("users")
        .select("id, teacher_id")
        .not("teacher_id", "is", null),
    ]);

    const scheduleKeySet = new Set(
      (scheduleCombos || []).map((s) => `${s.teacher_id}-${s.class_id}`),
    );
    const codeToUuid = new Map(
      (usersData || []).map((u) => [u.teacher_id, u.id]),
    );

    const stale = assignments.filter((a) => {
      if ((a.subject || "").toUpperCase() === "BP/BK") return false;
      const uuid = codeToUuid.get(a.teacher_id);
      if (!uuid) return false; // kode guru gak ketemu di users -- jangan asal flag
      return !scheduleKeySet.has(`${uuid}-${a.class_id}`);
    });

    if (stale.length > 0) {
      issues.push({
        category: "business_logic",
        severity: "warning",
        message: "Stale teacher assignments detected",
        details: `Found ${stale.length} teacher_assignments where the teacher no longer has any teacher_schedules entry for that class. Kemungkinan jadwal berubah di tengah semester tapi Penugasan Guru belum diupdate. Cek menu Penugasan Guru.`,
        table: "teacher_assignments",
      });
    }
  } catch (error) {
    console.error("Error checking stale teacher assignments:", error);
    issues.push({
      category: "business_logic",
      severity: "info",
      message: "Could not complete stale teacher assignment check",
      details: error.message,
      table: "teacher_assignments",
    });
  }

  return issues;
};

/**
 * Check Konseling Business Rules
 */
const checkKonselingLogic = async () => {
  const issues = [];

  try {
    // Konseling with perlu_followup but no tanggal_followup
    const { data: needsFollowup } = await supabase
      .from("konseling")
      .select("id, full_name, tanggal, perlu_followup, tanggal_followup")
      .eq("perlu_followup", true)
      .is("tanggal_followup", null)
      .limit(50);

    if (needsFollowup && needsFollowup.length > 0) {
      issues.push({
        category: "business_logic",
        severity: "warning",
        message: "Konseling marked for followup without date",
        details: `Found ${needsFollowup.length} konseling records marked as needing followup but without tanggal_followup`,
        table: "konseling",
      });
    }

    // Overdue followups
    const today = new Date().toISOString().split("T")[0];
    const { data: overdueFollowups } = await supabase
      .from("konseling")
      .select("id, full_name, tanggal_followup")
      .eq("perlu_followup", true)
      .not("tanggal_followup", "is", null)
      .lt("tanggal_followup", today)
      .in("status_layanan", ["dalam_proses", "terjadwal"])
      .limit(50);

    if (overdueFollowups && overdueFollowups.length > 0) {
      issues.push({
        category: "business_logic",
        severity: "warning",
        message: "Overdue konseling followups",
        details: `Found ${overdueFollowups.length} konseling cases with overdue followup dates`,
        table: "konseling",
      });
    }
  } catch (error) {
    console.error("Error checking konseling logic:", error);
    issues.push({
      category: "business_logic",
      severity: "info",
      message: "Could not complete konseling logic check",
      details: error.message,
      table: "konseling",
    });
  }

  return issues;
};

/**
 * Check Student Status Consistency
 */
const checkStudentStatusLogic = async () => {
  const issues = [];

  try {
    // Students without class but marked active
    const { data: noClassActive, count: noClassCount } = await supabase
      .from("students")
      .select("id, full_name", { count: "exact" })
      .eq("is_active", true)
      .is("class_id", null)
      .limit(50);

    if (noClassCount > 0) {
      issues.push({
        category: "business_logic",
        severity: "warning",
        message: "Active students not assigned to any class",
        details: `Found ${noClassCount} active students without class assignment`,
        table: "students",
      });
    }
  } catch (error) {
    console.error("Error checking student status logic:", error);
    issues.push({
      category: "business_logic",
      severity: "info",
      message: "Could not complete student status logic check",
      details: error.message,
      table: "students",
    });
  }

  return issues;
};

export default checkBusinessLogic;
