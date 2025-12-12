import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  Download,
  Upload,
  AlertTriangle,
  RefreshCw,
  Table,
  FileText,
  Database,
  Monitor,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const SystemTab = ({ user, loading, setLoading, showToast }) => {
  const [schoolSettings, setSchoolSettings] = useState({
    academic_year: "2025/2026",
    school_name: "SMP Muslimin Cililin",
  });
  const [schoolStats, setSchoolStats] = useState({
    total_students: 0,
    total_teachers: 0,
  });
  const [restoreFile, setRestoreFile] = useState(null);
  const [restorePreview, setRestorePreview] = useState(null);
  const [exportProgress, setExportProgress] = useState("");
  const navigate = useNavigate();

  const getCurrentAcademicYear = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (currentMonth >= 7) {
      return `${currentYear + 1}/${currentYear + 2}`;
    } else {
      return `${currentYear}/${currentYear + 1}`;
    }
  };

  useEffect(() => {
    loadSchoolData();
  }, []);

  const loadSchoolData = async () => {
    try {
      setLoading(true);

      const { data: settingsData, error: settingsError } = await supabase
        .from("school_settings")
        .select("setting_key, setting_value");

      if (settingsError) throw settingsError;

      if (settingsData && settingsData.length > 0) {
        const settings = {};
        settingsData.forEach((item) => {
          settings[item.setting_key] = item.setting_value;
        });
        setSchoolSettings((prev) => ({
          ...prev,
          academic_year: settings.academic_year || getCurrentAcademicYear(),
          school_name: settings.school_name || prev.school_name,
        }));
      } else {
        setSchoolSettings((prev) => ({
          ...prev,
          academic_year: getCurrentAcademicYear(),
        }));
      }

      const [teachersRes, studentsRes] = await Promise.all([
        supabase
          .from("users")
          .select("id")
          .in("role", ["admin", "guru_mapel", "guru_walikelas"]),
        supabase.from("students").select("id").eq("is_active", true),
      ]);

      if (teachersRes.error) throw teachersRes.error;
      if (studentsRes.error) throw studentsRes.error;

      setSchoolStats({
        total_students: studentsRes.data?.length || 0,
        total_teachers: teachersRes.data?.length || 0,
      });
    } catch (error) {
      console.error("Error loading school data:", error);
      showToast("Error memuat data sekolah", "error");
    } finally {
      setLoading(false);
    }
  };

  const convertToCSV = (data) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return "";
    }

    const validData = data.filter(
      (item) => item !== null && typeof item === "object"
    );
    if (validData.length === 0) return "";

    const headers = Object.keys(validData[0]);
    const csvHeaders = headers.join(",");

    const csvRows = validData.map((row) => {
      return headers
        .map((header) => {
          let value = row[header];
          if (value === null || value === undefined) {
            value = "";
          }
          value = String(value);
          if (
            value.includes(",") ||
            value.includes('"') ||
            value.includes("\n")
          ) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(",");
    });

    return [csvHeaders, ...csvRows].join("\n");
  };

  const exportTableToCSV = async (tableName, displayName) => {
    try {
      setLoading(true);
      setExportProgress(`Mengambil data ${displayName}...`);

      const { data, error } = await supabase.from(tableName).select("*");

      if (error) throw error;

      if (!data || data.length === 0) {
        showToast(`Tidak ada data di tabel ${displayName}`, "warning");
        return;
      }

      setExportProgress(`Mengkonversi ${data.length} records...`);
      const csvContent = convertToCSV(data);

      if (!csvContent) {
        showToast(`Data ${displayName} tidak valid untuk di-export`, "error");
        return;
      }

      setExportProgress("Membuat file...");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      const schoolName = (
        schoolSettings.school_name || "SMP_Muslimin_Cililin"
      ).replace(/\s+/g, "_");
      const academicYear = (
        schoolSettings.academic_year || getCurrentAcademicYear()
      ).replace("/", "_");
      const date = new Date().toISOString().split("T")[0];

      a.href = url;
      a.download = `${schoolName}_${tableName}_${academicYear}_${date}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast(
        `${displayName} berhasil di-export! (${data.length} records)`,
        "success"
      );
    } catch (error) {
      console.error(`Error exporting ${tableName}:`, error);
      showToast(`Error exporting ${displayName}: ${error.message}`, "error");
    } finally {
      setLoading(false);
      setExportProgress("");
    }
  };

  const exportAllTablesToCSV = async () => {
    try {
      setLoading(true);

      const tables = [
        { name: "academic_years", display: "Tahun Ajaran" },
        { name: "users", display: "Pengguna" },
        { name: "teacher_assignments", display: "Penugasan Guru" },
        { name: "classes", display: "Kelas" },
        { name: "students", display: "Siswa" },
        { name: "attendances", display: "Kehadiran" },
        { name: "grades", display: "Nilai" },
        { name: "konseling", display: "Konseling" },
        { name: "siswa_baru", display: "Siswa Baru" },
        { name: "school_settings", display: "Pengaturan Sekolah" },
        { name: "announcement", display: "Pengumuman" },
        { name: "teacher_schedules", display: "Jadwal Guru" },
        {
          name: "student_development_notes",
          display: "Catatan Perkembangan Siswa",
        },
        { name: "system_health_logs", display: "System Health Logs" },
        { name: "cleanup_history", display: "Riwayat Cleanup" },
        { name: "spmb_settings", display: "Pengaturan SPMB" },
      ];

      let exportedCount = 0;
      const schoolName = (
        schoolSettings.school_name || "SMP_Muslimin_Cililin"
      ).replace(/\s+/g, "_");
      const academicYear = (
        schoolSettings.academic_year || getCurrentAcademicYear()
      ).replace("/", "_");
      const date = new Date().toISOString().split("T")[0];

      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];

        try {
          setExportProgress(
            `Exporting ${table.display} (${i + 1}/${tables.length})...`
          );

          const { data, error } = await supabase.from(table.name).select("*");

          if (error) {
            console.error(`Error fetching ${table.name}:`, error);
            continue;
          }

          if (data && data.length > 0) {
            const csvContent = convertToCSV(data);
            if (csvContent) {
              const blob = new Blob([csvContent], {
                type: "text/csv;charset=utf-8;",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${schoolName}_${table.name}_${academicYear}_${date}.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              exportedCount++;

              await new Promise((resolve) => setTimeout(resolve, 300));
            }
          }
        } catch (tableError) {
          console.error(`Error exporting ${table.name}:`, tableError);
        }
      }

      if (exportedCount > 0) {
        showToast(
          `✅ ${exportedCount} tabel berhasil di-export ke CSV!`,
          "success"
        );
      } else {
        showToast("Tidak ada data untuk di-export", "warning");
      }
    } catch (error) {
      console.error("Error exporting all tables:", error);
      showToast("Error exporting data", "error");
    } finally {
      setLoading(false);
      setExportProgress("");
    }
  };

  const exportDatabaseBackup = async () => {
    try {
      setLoading(true);
      setExportProgress("Mengambil data dari database...");

      const [
        academicYearsRes,
        usersRes,
        teacherAssignmentsRes,
        classesRes,
        studentsRes,
        attendancesRes,
        gradesRes,
        konselingRes,
        siswaBaruRes,
        schoolSettingsRes,
        announcementRes,
        teacherSchedulesRes,
        studentDevelopmentNotesRes,
        systemHealthLogsRes,
        cleanupHistoryRes,
        spmbSettingsRes,
      ] = await Promise.all([
        supabase.from("academic_years").select("*"),
        supabase.from("users").select("*"),
        supabase.from("teacher_assignments").select("*"),
        supabase.from("classes").select("*"),
        supabase.from("students").select("*"),
        supabase.from("attendances").select("*"),
        supabase.from("grades").select("*"),
        supabase.from("konseling").select("*"),
        supabase.from("siswa_baru").select("*"),
        supabase.from("school_settings").select("*"),
        supabase.from("announcement").select("*"),
        supabase.from("teacher_schedules").select("*"),
        supabase.from("student_development_notes").select("*"),
        supabase.from("system_health_logs").select("*"),
        supabase.from("cleanup_history").select("*"),
        supabase.from("spmb_settings").select("*"),
      ]);

      const errors = [
        academicYearsRes.error,
        usersRes.error,
        teacherAssignmentsRes.error,
        classesRes.error,
        studentsRes.error,
        attendancesRes.error,
        gradesRes.error,
        konselingRes.error,
        siswaBaruRes.error,
        schoolSettingsRes.error,
        announcementRes.error,
        teacherSchedulesRes.error,
        studentDevelopmentNotesRes.error,
        systemHealthLogsRes.error,
        cleanupHistoryRes.error,
        spmbSettingsRes.error,
      ].filter(Boolean);

      if (errors.length > 0) {
        throw new Error(
          `Failed to fetch some tables: ${errors
            .map((e) => e.message)
            .join(", ")}`
        );
      }

      setExportProgress("Membuat file backup...");

      const backupData = {
        timestamp: new Date().toISOString(),
        academic_year: schoolSettings.academic_year || getCurrentAcademicYear(),
        school_info: schoolSettings,
        data: {
          academic_years: academicYearsRes.data,
          users: usersRes.data,
          teacher_assignments: teacherAssignmentsRes.data,
          classes: classesRes.data,
          students: studentsRes.data,
          attendances: attendancesRes.data,
          grades: gradesRes.data,
          konseling: konselingRes.data,
          siswa_baru: siswaBaruRes.data,
          school_settings: schoolSettingsRes.data,
          announcement: announcementRes.data,
          teacher_schedules: teacherSchedulesRes.data,
          student_development_notes: studentDevelopmentNotesRes.data,
          system_health_logs: systemHealthLogsRes.data,
          cleanup_history: cleanupHistoryRes.data,
          spmb_settings: spmbSettingsRes.data,
        },
        stats: {
          total_academic_years: academicYearsRes.data?.length || 0,
          total_users: usersRes.data?.length || 0,
          total_teacher_assignments: teacherAssignmentsRes.data?.length || 0,
          total_classes: classesRes.data?.length || 0,
          total_students: studentsRes.data?.length || 0,
          total_attendance_records: attendancesRes.data?.length || 0,
          total_grades_records: gradesRes.data?.length || 0,
          total_konseling_records: konselingRes.data?.length || 0,
          total_siswa_baru: siswaBaruRes.data?.length || 0,
          total_announcements: announcementRes.data?.length || 0,
          total_teacher_schedules: teacherSchedulesRes.data?.length || 0,
          total_development_notes: studentDevelopmentNotesRes.data?.length || 0,
          total_system_health_logs: systemHealthLogsRes.data?.length || 0,
          total_cleanup_history: cleanupHistoryRes.data?.length || 0,
          total_spmb_settings: spmbSettingsRes.data?.length || 0,
        },
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      const schoolName = (
        schoolSettings.school_name || "SMP_Muslimin_Cililin"
      ).replace(/\s+/g, "_");
      const academicYear = (
        schoolSettings.academic_year || getCurrentAcademicYear()
      ).replace("/", "_");
      const date = new Date().toISOString().split("T")[0];

      a.href = url;
      a.download = `${schoolName}_backup_${academicYear}_${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast("✅ Database backup berhasil didownload!", "success");
    } catch (error) {
      console.error("Error creating backup:", error);
      showToast("❌ Error membuat database backup: " + error.message, "error");
    } finally {
      setLoading(false);
      setExportProgress("");
    }
  };

  const handleRestoreFile = (event) => {
    const file = event.target.files[0];
    if (file) {
      setRestoreFile(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const backupData = JSON.parse(e.target.result);

          if (!backupData.data || !backupData.stats) {
            throw new Error("Format backup tidak valid");
          }

          setRestorePreview({
            timestamp: backupData.timestamp,
            academic_year: backupData.academic_year,
            school_info: backupData.school_info,
            stats: backupData.stats,
          });
        } catch (error) {
          showToast(
            "Format file backup tidak valid: " + error.message,
            "error"
          );
          setRestoreFile(null);
        }
      };
      reader.readAsText(file);
    }
  };

  const executeRestore = async () => {
    if (!restoreFile) return;

    const confirmed = window.confirm(
      `PERINGATAN: Restore akan menimpa semua data yang ada!\n\n` +
        `Backup dari: ${new Date(restorePreview.timestamp).toLocaleString(
          "id-ID"
        )}\n` +
        `Tahun Ajaran: ${restorePreview.academic_year}\n` +
        `Sekolah: ${restorePreview.school_info?.school_name}\n\n` +
        `Data yang akan di-restore:\n` +
        `- ${restorePreview.stats?.total_academic_years || 0} tahun ajaran\n` +
        `- ${restorePreview.stats?.total_users || 0} pengguna\n` +
        `- ${
          restorePreview.stats?.total_teacher_assignments || 0
        } penugasan guru\n` +
        `- ${restorePreview.stats?.total_classes || 0} kelas\n` +
        `- ${restorePreview.stats?.total_students || 0} siswa\n` +
        `- ${restorePreview.stats?.total_attendance_records || 0} kehadiran\n` +
        `- ${restorePreview.stats?.total_grades_records || 0} nilai\n` +
        `- ${restorePreview.stats?.total_konseling_records || 0} konseling\n` +
        `- ${
          restorePreview.stats?.total_teacher_schedules || 0
        } jadwal guru\n` +
        `- ${
          restorePreview.stats?.total_development_notes || 0
        } catatan perkembangan\n` +
        `- ${
          restorePreview.stats?.total_system_health_logs || 0
        } system health logs\n` +
        `- ${
          restorePreview.stats?.total_cleanup_history || 0
        } riwayat cleanup\n` +
        `- ${
          restorePreview.stats?.total_spmb_settings || 0
        } pengaturan SPMB\n\n` +
        `Tindakan ini TIDAK DAPAT DIBATALKAN. Apakah Anda yakin?`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      setExportProgress("Membaca file backup...");

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const backupData = JSON.parse(e.target.result);

          setExportProgress("Menghapus data lama (1/3)...");

          await supabase
            .from("attendances")
            .delete()
            .neq("id", "00000000-0000-0000-0000-000000000000");
          await supabase
            .from("grades")
            .delete()
            .neq("id", "00000000-0000-0000-0000-000000000000");
          await supabase
            .from("konseling")
            .delete()
            .neq("id", "00000000-0000-0000-0000-000000000000");
          await supabase
            .from("teacher_assignments")
            .delete()
            .neq("id", "00000000-0000-0000-0000-000000000000");
          await supabase
            .from("teacher_schedules")
            .delete()
            .neq("id", "00000000-0000-0000-0000-000000000000");
          await supabase
            .from("student_development_notes")
            .delete()
            .neq("id", "00000000-0000-0000-0000-000000000000");
          await supabase
            .from("system_health_logs")
            .delete()
            .neq("id", "00000000-0000-0000-0000-000000000000");
          await supabase
            .from("cleanup_history")
            .delete()
            .neq("id", "00000000-0000-0000-0000-000000000000");

          setExportProgress("Menghapus data lama (2/3)...");

          await supabase
            .from("siswa_baru")
            .delete()
            .neq("id", "00000000-0000-0000-0000-000000000000");
          await supabase
            .from("students")
            .delete()
            .neq("id", "00000000-0000-0000-0000-000000000000");

          setExportProgress("Menghapus data lama (3/3)...");

          await supabase
            .from("users")
            .delete()
            .neq("id", "00000000-0000-0000-0000-000000000000");
          await supabase
            .from("classes")
            .delete()
            .neq("id", "00000000-0000-0000-0000-000000000000");
          await supabase
            .from("announcement")
            .delete()
            .neq("id", "00000000-0000-0000-0000-000000000000");
          await supabase
            .from("school_settings")
            .delete()
            .neq("id", "00000000-0000-0000-0000-000000000000");
          await supabase
            .from("academic_years")
            .delete()
            .neq("id", "00000000-0000-0000-0000-000000000000");
          await supabase
            .from("spmb_settings")
            .delete()
            .neq("id", "00000000-0000-0000-0000-000000000000");

          let insertedTables = 0;
          const totalTables = 16;

          if (backupData.data.academic_years?.length > 0) {
            setExportProgress(
              `Restore academic years (${++insertedTables}/${totalTables})...`
            );
            const { error } = await supabase
              .from("academic_years")
              .insert(backupData.data.academic_years);
            if (error) console.error("Error inserting academic_years:", error);
          }

          if (backupData.data.school_settings?.length > 0) {
            setExportProgress(
              `Restore settings (${++insertedTables}/${totalTables})...`
            );
            const { error } = await supabase
              .from("school_settings")
              .insert(backupData.data.school_settings);
            if (error) console.error("Error inserting school_settings:", error);
          }

          if (backupData.data.classes?.length > 0) {
            setExportProgress(
              `Restore classes (${++insertedTables}/${totalTables})...`
            );
            const { error } = await supabase
              .from("classes")
              .insert(backupData.data.classes);
            if (error) console.error("Error inserting classes:", error);
          }

          if (backupData.data.users?.length > 0) {
            setExportProgress(
              `Restore users (${++insertedTables}/${totalTables})...`
            );
            const { error } = await supabase
              .from("users")
              .insert(backupData.data.users);
            if (error) console.error("Error inserting users:", error);
          }

          if (backupData.data.students?.length > 0) {
            setExportProgress(
              `Restore students (${++insertedTables}/${totalTables})...`
            );
            const { error } = await supabase
              .from("students")
              .insert(backupData.data.students);
            if (error) console.error("Error inserting students:", error);
          }

          if (backupData.data.siswa_baru?.length > 0) {
            setExportProgress(
              `Restore siswa baru (${++insertedTables}/${totalTables})...`
            );
            const { error } = await supabase
              .from("siswa_baru")
              .insert(backupData.data.siswa_baru);
            if (error) console.error("Error inserting siswa_baru:", error);
          }

          if (backupData.data.attendances?.length > 0) {
            setExportProgress(
              `Restore attendances (${++insertedTables}/${totalTables})...`
            );
            const { error } = await supabase
              .from("attendances")
              .insert(backupData.data.attendances);
            if (error) console.error("Error inserting attendances:", error);
          }

          if (backupData.data.grades?.length > 0) {
            setExportProgress(
              `Restore grades (${++insertedTables}/${totalTables})...`
            );
            const { error } = await supabase
              .from("grades")
              .insert(backupData.data.grades);
            if (error) console.error("Error inserting grades:", error);
          }

          if (backupData.data.konseling?.length > 0) {
            setExportProgress(
              `Restore konseling (${++insertedTables}/${totalTables})...`
            );
            const { error } = await supabase
              .from("konseling")
              .insert(backupData.data.konseling);
            if (error) console.error("Error inserting konseling:", error);
          }

          if (backupData.data.teacher_assignments?.length > 0) {
            setExportProgress(
              `Restore teacher assignments (${++insertedTables}/${totalTables})...`
            );
            const { error } = await supabase
              .from("teacher_assignments")
              .insert(backupData.data.teacher_assignments);
            if (error)
              console.error("Error inserting teacher_assignments:", error);
          }

          if (backupData.data.announcement?.length > 0) {
            setExportProgress(
              `Restore announcements (${++insertedTables}/${totalTables})...`
            );
            const { error } = await supabase
              .from("announcement")
              .insert(backupData.data.announcement);
            if (error) console.error("Error inserting announcement:", error);
          }

          if (backupData.data.teacher_schedules?.length > 0) {
            setExportProgress(
              `Restore teacher schedules (${++insertedTables}/${totalTables})...`
            );
            const { error } = await supabase
              .from("teacher_schedules")
              .insert(backupData.data.teacher_schedules);
            if (error)
              console.error("Error inserting teacher_schedules:", error);
          }

          if (backupData.data.student_development_notes?.length > 0) {
            setExportProgress(
              `Restore development notes (${++insertedTables}/${totalTables})...`
            );
            const { error } = await supabase
              .from("student_development_notes")
              .insert(backupData.data.student_development_notes);
            if (error)
              console.error(
                "Error inserting student_development_notes:",
                error
              );
          }

          if (backupData.data.system_health_logs?.length > 0) {
            setExportProgress(
              `Restore system health logs (${++insertedTables}/${totalTables})...`
            );
            const { error } = await supabase
              .from("system_health_logs")
              .insert(backupData.data.system_health_logs);
            if (error)
              console.error("Error inserting system_health_logs:", error);
          }

          if (backupData.data.cleanup_history?.length > 0) {
            setExportProgress(
              `Restore cleanup history (${++insertedTables}/${totalTables})...`
            );
            const { error } = await supabase
              .from("cleanup_history")
              .insert(backupData.data.cleanup_history);
            if (error) console.error("Error inserting cleanup_history:", error);
          }

          if (backupData.data.spmb_settings?.length > 0) {
            setExportProgress(
              `Restore SPMB settings (${++insertedTables}/${totalTables})...`
            );
            const { error } = await supabase
              .from("spmb_settings")
              .insert(backupData.data.spmb_settings);
            if (error) console.error("Error inserting spmb_settings:", error);
          }

          showToast("✅ Database berhasil di-restore!", "success");
          setRestoreFile(null);
          setRestorePreview(null);

          setExportProgress("Memuat ulang data...");
          await loadSchoolData();
        } catch (error) {
          console.error("Error restoring backup:", error);
          showToast("❌ Error restoring database: " + error.message, "error");
        } finally {
          setLoading(false);
          setExportProgress("");
        }
      };

      reader.readAsText(restoreFile);
    } catch (error) {
      console.error("Error reading restore file:", error);
      showToast("Error membaca file backup", "error");
      setLoading(false);
      setExportProgress("");
    }
  };

  const navigateToSystemMonitor = () => {
    navigate("/monitor-sistem");
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
          System Management
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
          SMP Muslimin Cililin - Backup & Restore Database
        </p>

        {exportProgress && (
          <div className="mt-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <RefreshCw
                className="animate-spin text-blue-600 dark:text-blue-400"
                size={20}
              />
              <span className="text-sm sm:text-base text-blue-800 dark:text-blue-300 font-medium">
                {exportProgress}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* System Health Monitor Card */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 rounded-xl p-5 sm:p-6 mb-6 sm:mb-8 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <Monitor size={24} className="text-blue-200" />
              <h3 className="text-lg sm:text-xl font-bold">
                System Health Monitor
              </h3>
            </div>
            <p className="text-blue-100 mb-5 text-sm sm:text-base">
              Pantau kesehatan sistem, cek performa database, dan validasi
              integritas data
            </p>
            <button
              onClick={navigateToSystemMonitor}
              className="flex items-center justify-center gap-3 px-5 sm:px-6 py-3.5 bg-white text-blue-600 dark:text-blue-700 rounded-lg hover:bg-blue-50 font-semibold transition-colors min-h-[44px] w-full md:w-auto">
              <Monitor size={18} />
              <span className="text-sm sm:text-base">
                Buka System Health Monitor
              </span>
            </button>
          </div>
          <div className="hidden md:block">
            <Monitor size={64} className="text-blue-300 opacity-80" />
          </div>
        </div>
      </div>

      {/* Export Individual Tables to CSV */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-5 md:p-6 mb-6 sm:mb-8 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="text-blue-600 dark:text-blue-400" size={20} />
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">
            Export Data ke CSV
          </h3>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-5 text-sm sm:text-base">
          Export data per tabel ke format CSV untuk analisis atau backup
          selektif.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {/* Group 1: Academic Data */}
          <button
            onClick={() => exportTableToCSV("academic_years", "Tahun Ajaran")}
            disabled={loading}
            className="flex items-center gap-3 px-4 py-3.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 font-medium transition-colors min-h-[44px]">
            <Table size={16} />
            <span className="truncate">Export Tahun Ajaran</span>
          </button>

          <button
            onClick={() => exportTableToCSV("classes", "Data Kelas")}
            disabled={loading}
            className="flex items-center gap-3 px-4 py-3.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 font-medium transition-colors min-h-[44px]">
            <Table size={16} />
            <span className="truncate">Export Kelas</span>
          </button>

          <button
            onClick={() => exportTableToCSV("students", "Data Siswa")}
            disabled={loading}
            className="flex items-center gap-3 px-4 py-3.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 font-medium transition-colors min-h-[44px]">
            <Table size={16} />
            <span className="truncate">Export Students</span>
          </button>

          {/* Group 2: Teacher Data */}
          <button
            onClick={() => exportTableToCSV("users", "Data Pengguna")}
            disabled={loading}
            className="flex items-center gap-3 px-4 py-3.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 disabled:opacity-50 font-medium transition-colors min-h-[44px]">
            <Table size={16} />
            <span className="truncate">Export Users</span>
          </button>

          <button
            onClick={() =>
              exportTableToCSV("teacher_assignments", "Penugasan Guru")
            }
            disabled={loading}
            className="flex items-center gap-3 px-4 py-3.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 disabled:opacity-50 font-medium transition-colors min-h-[44px]">
            <Table size={16} />
            <span className="truncate">Export Penugasan Guru</span>
          </button>

          <button
            onClick={() => exportTableToCSV("teacher_schedules", "Jadwal Guru")}
            disabled={loading}
            className="flex items-center gap-3 px-4 py-3.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 disabled:opacity-50 font-medium transition-colors min-h-[44px]">
            <Table size={16} />
            <span className="truncate">Export Jadwal Guru</span>
          </button>

          {/* Group 3: Academic Records */}
          <button
            onClick={() => exportTableToCSV("attendances", "Data Kehadiran")}
            disabled={loading}
            className="flex items-center gap-3 px-4 py-3.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 disabled:opacity-50 font-medium transition-colors min-h-[44px]">
            <Table size={16} />
            <span className="truncate">Export Attendance</span>
          </button>

          <button
            onClick={() => exportTableToCSV("grades", "Data Nilai")}
            disabled={loading}
            className="flex items-center gap-3 px-4 py-3.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 disabled:opacity-50 font-medium transition-colors min-h-[44px]">
            <Table size={16} />
            <span className="truncate">Export Nilai</span>
          </button>

          <button
            onClick={() => exportTableToCSV("konseling", "Data Konseling")}
            disabled={loading}
            className="flex items-center gap-3 px-4 py-3.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 disabled:opacity-50 font-medium transition-colors min-h-[44px]">
            <Table size={16} />
            <span className="truncate">Export Konseling</span>
          </button>

          {/* Group 4: Additional Data */}
          <button
            onClick={() => exportTableToCSV("siswa_baru", "Data Siswa Baru")}
            disabled={loading}
            className="flex items-center gap-3 px-4 py-3.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50 disabled:opacity-50 font-medium transition-colors min-h-[44px]">
            <Table size={16} />
            <span className="truncate">Export Siswa Baru</span>
          </button>

          <button
            onClick={() =>
              exportTableToCSV(
                "student_development_notes",
                "Catatan Perkembangan"
              )
            }
            disabled={loading}
            className="flex items-center gap-3 px-4 py-3.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50 disabled:opacity-50 font-medium transition-colors min-h-[44px]">
            <Table size={16} />
            <span className="truncate">Export Catatan Perkembangan</span>
          </button>

          <button
            onClick={() => exportTableToCSV("announcement", "Pengumuman")}
            disabled={loading}
            className="flex items-center gap-3 px-4 py-3.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50 disabled:opacity-50 font-medium transition-colors min-h-[44px]">
            <Table size={16} />
            <span className="truncate">Export Pengumuman</span>
          </button>

          {/* Group 5: System Data */}
          <button
            onClick={() =>
              exportTableToCSV("school_settings", "Pengaturan Sekolah")
            }
            disabled={loading}
            className="flex items-center gap-3 px-4 py-3.5 bg-gray-50 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900/50 disabled:opacity-50 font-medium transition-colors min-h-[44px]">
            <Table size={16} />
            <span className="truncate">Export Settings</span>
          </button>

          <button
            onClick={() => exportTableToCSV("spmb_settings", "Pengaturan SPMB")}
            disabled={loading}
            className="flex items-center gap-3 px-4 py-3.5 bg-gray-50 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900/50 disabled:opacity-50 font-medium transition-colors min-h-[44px]">
            <Table size={16} />
            <span className="truncate">Export Pengaturan SPMB</span>
          </button>

          <button
            onClick={() =>
              exportTableToCSV("system_health_logs", "System Health Logs")
            }
            disabled={loading}
            className="flex items-center gap-3 px-4 py-3.5 bg-gray-50 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900/50 disabled:opacity-50 font-medium transition-colors min-h-[44px]">
            <Table size={16} />
            <span className="truncate">Export System Logs</span>
          </button>

          {/* Group 6: History */}
          <button
            onClick={() =>
              exportTableToCSV("cleanup_history", "Riwayat Cleanup")
            }
            disabled={loading}
            className="flex items-center gap-3 px-4 py-3.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 disabled:opacity-50 font-medium transition-colors min-h-[44px]">
            <Table size={16} />
            <span className="truncate">Export Riwayat Cleanup</span>
          </button>

          {/* Export All Button */}
          <div className="sm:col-span-2 lg:col-span-3">
            <button
              onClick={exportAllTablesToCSV}
              disabled={loading}
              className="flex items-center justify-center gap-3 px-5 py-4 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 font-bold transition-colors w-full min-h-[44px]">
              <FileText size={20} />
              <span className="text-base">
                {loading ? "Exporting..." : "Export Semua Tabel (16 Tabel)"}
              </span>
            </button>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
            ℹ️ Total 16 tabel yang didukung untuk export
          </p>
        </div>
      </div>

      {/* Database Backup */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-5 md:p-6 mb-6 sm:mb-8 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Download className="text-blue-600 dark:text-blue-400" size={20} />
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">
            Database Backup (JSON)
          </h3>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-5 text-sm sm:text-base">
          Download backup lengkap database untuk keperluan keamanan dan migrasi
          data.
        </p>

        <button
          onClick={exportDatabaseBackup}
          disabled={loading}
          className="flex items-center justify-center gap-3 px-5 sm:px-6 py-3.5 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 font-bold transition-colors w-full sm:w-auto min-h-[44px] mb-5">
          <Download size={20} />
          <span className="text-base">
            {loading ? "Membuat Backup..." : "Download Backup Database (JSON)"}
          </span>
        </button>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-300 font-medium mb-3">
            ℹ️ Backup akan berisi semua data dari 16 tabel:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-blue-700 dark:text-blue-400">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
              <span>Tahun Ajaran</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
              <span>Data Pengguna</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
              <span>Penugasan Guru</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
              <span>Data Kelas</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
              <span>Data Siswa</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
              <span>Data Kehadiran</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
              <span>Data Nilai</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
              <span>Data Konseling</span>
            </div>
          </div>
        </div>
      </div>

      {/* Database Restore */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-5 md:p-6 mb-6 sm:mb-8 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Upload className="text-red-600 dark:text-red-400" size={20} />
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">
            Database Restore
          </h3>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-5 text-sm sm:text-base">
          Upload dan restore backup database.{" "}
          <span className="text-red-600 dark:text-red-400 font-bold">
            PERHATIAN: Ini akan menimpa semua data yang ada!
          </span>
        </p>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Upload Backup File (.json)
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleRestoreFile}
              disabled={loading}
              className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-3 file:px-5 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50 disabled:opacity-50 cursor-pointer"
            />
          </div>

          {restorePreview && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-xl p-4 sm:p-5">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle
                  className="text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-1"
                  size={20}
                />
                <div className="flex-1">
                  <h4 className="font-bold text-yellow-800 dark:text-yellow-300 text-base mb-3">
                    ⚠️ Backup File Preview
                  </h4>
                  <div className="text-sm text-yellow-700 dark:text-yellow-400 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <p>
                        <strong className="block text-xs">
                          Tanggal Backup:
                        </strong>
                        {new Date(restorePreview.timestamp).toLocaleString(
                          "id-ID"
                        )}
                      </p>
                      <p>
                        <strong className="block text-xs">Tahun Ajaran:</strong>
                        {restorePreview.academic_year}
                      </p>
                      <p>
                        <strong className="block text-xs">Sekolah:</strong>
                        {restorePreview.school_info?.school_name}
                      </p>
                      <p>
                        <strong className="block text-xs">
                          Total Records:
                        </strong>
                        {(restorePreview.stats?.total_academic_years || 0) +
                          (restorePreview.stats?.total_users || 0) +
                          (restorePreview.stats?.total_teacher_assignments ||
                            0) +
                          (restorePreview.stats?.total_classes || 0) +
                          (restorePreview.stats?.total_students || 0)}{" "}
                        records
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 mt-5">
                    <button
                      onClick={executeRestore}
                      disabled={loading}
                      className="flex items-center justify-center gap-3 px-5 py-3.5 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-800 disabled:opacity-50 font-bold transition-colors min-h-[44px]">
                      {loading ? (
                        <>
                          <RefreshCw className="animate-spin" size={18} />
                          <span>Restoring...</span>
                        </>
                      ) : (
                        "Execute Restore"
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setRestoreFile(null);
                        setRestorePreview(null);
                      }}
                      disabled={loading}
                      className="px-5 py-3.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 font-medium transition-colors min-h-[44px]">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* System Information */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 sm:p-5 md:p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Database className="text-blue-600 dark:text-blue-400" size={20} />
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">
            Informasi Sistem
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
              Database
            </label>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              Supabase PostgreSQL
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
              Total Records
            </label>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {schoolStats.total_students + schoolStats.total_teachers} pengguna
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
              Tahun Ajaran
            </label>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {schoolSettings.academic_year}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
              Nama Sekolah
            </label>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {schoolSettings.school_name}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              👨‍🏫 {schoolStats.total_teachers} guru
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              👨‍🎓 {schoolStats.total_students} siswa
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              🏫 SMP Muslimin Cililin
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemTab;
