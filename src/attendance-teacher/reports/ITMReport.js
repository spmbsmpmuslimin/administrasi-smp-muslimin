import React, { useState, useEffect } from "react";
import {
  Calendar,
  Download,
  Printer,
  Search,
  User,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import { exportITMReportToExcel } from "./ITMReportExcel";

// Jam schedule
const JAM_SCHEDULE = {
  Senin: {
    1: { start: "07:00", end: "08:00" },
    2: { start: "08:00", end: "08:40" },
    3: { start: "08:40", end: "09:20" },
    4: { start: "09:20", end: "10:00" },
    5: { start: "10:30", end: "11:05" },
    6: { start: "11:05", end: "11:40" },
    7: { start: "11:40", end: "12:15" },
    8: { start: "13:00", end: "13:35" },
    9: { start: "13:35", end: "14:10" },
  },
  Selasa: {
    1: { start: "07:00", end: "07:40" },
    2: { start: "07:40", end: "08:20" },
    3: { start: "08:20", end: "09:00" },
    4: { start: "09:00", end: "09:40" },
    5: { start: "10:10", end: "10:50" },
    6: { start: "10:50", end: "11:30" },
    7: { start: "11:30", end: "12:10" },
    8: { start: "13:00", end: "13:35" },
    9: { start: "13:35", end: "14:10" },
  },
  Rabu: {
    1: { start: "07:00", end: "07:40" },
    2: { start: "07:40", end: "08:20" },
    3: { start: "08:20", end: "09:00" },
    4: { start: "09:00", end: "09:40" },
    5: { start: "10:10", end: "10:50" },
    6: { start: "10:50", end: "11:30" },
    7: { start: "11:30", end: "12:10" },
    8: { start: "13:00", end: "13:35" },
    9: { start: "13:35", end: "14:10" },
  },
  Kamis: {
    1: { start: "07:00", end: "07:40" },
    2: { start: "07:40", end: "08:20" },
    3: { start: "08:20", end: "09:00" },
    4: { start: "09:00", end: "09:40" },
    5: { start: "10:10", end: "10:50" },
    6: { start: "10:50", end: "11:30" },
    7: { start: "11:30", end: "12:10" },
    8: { start: "13:00", end: "13:35" },
    9: { start: "13:35", end: "14:10" },
  },
  Jumat: {
    1: { start: "07:00", end: "07:30" },
    2: { start: "07:30", end: "08:00" },
    3: { start: "08:00", end: "08:30" },
    4: { start: "08:30", end: "09:00" },
    5: { start: "09:30", end: "10:00" },
    6: { start: "10:00", end: "10:30" },
    7: { start: "", end: "" },
    8: { start: "", end: "" },
    9: { start: "", end: "" },
  },
};

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];
const FULL_DAY_NAMES = ["Senin", "Selasa", "Rabu", "Kamis", "Jum'at"];
const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const ITMReport = () => {
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [teachersError, setTeachersError] = useState(null);
  const [reportData, setReportData] = useState(null);

  // Fetch semua guru aktif
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setTeachersLoading(true);
        setTeachersError(null);

        const { data, error } = await supabase
          .from("users")
          .select("id, teacher_id, full_name")
          .in("role", ["teacher", "guru_bk", "homeroom_teacher"])
          .eq("is_active", true)
          .order("full_name");

        if (error) throw error;

        setTeachers(data || []);
      } catch (err) {
        console.error("Error fetching teachers:", err);
        setTeachersError("Gagal memuat data guru. Silakan refresh halaman.");
      } finally {
        setTeachersLoading(false);
      }
    };

    fetchTeachers();
  }, []);

  // Helper: Mapping start_time ke jam ke-berapa
  const getJamKe = (day, startTime) => {
    const mapping = {
      Senin: {
        "07:00:00": 1,
        "08:00:00": 2,
        "08:40:00": 3,
        "09:20:00": 4,
        "10:30:00": 5,
        "11:05:00": 6,
        "11:40:00": 7,
        "13:00:00": 8,
        "13:35:00": 9,
      },
      Selasa: {
        "07:00:00": 1,
        "07:40:00": 2,
        "08:20:00": 3,
        "09:00:00": 4,
        "10:10:00": 5,
        "10:50:00": 6,
        "11:30:00": 7,
        "13:00:00": 8,
        "13:35:00": 9,
      },
      Rabu: {
        "07:00:00": 1,
        "07:40:00": 2,
        "08:20:00": 3,
        "09:00:00": 4,
        "10:10:00": 5,
        "10:50:00": 6,
        "11:30:00": 7,
        "13:00:00": 8,
        "13:35:00": 9,
      },
      Kamis: {
        "07:00:00": 1,
        "07:40:00": 2,
        "08:20:00": 3,
        "09:00:00": 4,
        "10:10:00": 5,
        "10:50:00": 6,
        "11:30:00": 7,
        "13:00:00": 8,
        "13:35:00": 9,
      },
      Jumat: {
        "07:00:00": 1,
        "07:30:00": 2,
        "08:00:00": 3,
        "08:30:00": 4,
        "09:30:00": 5,
        "10:00:00": 6,
      },
    };

    return mapping[day]?.[startTime] || null;
  };

  // Helper: Get dates for each week in month
  const getWeeksInMonth = (year, month) => {
    const weeks = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let currentWeek = [];
    let weekNum = 1;
    let startDate = new Date(firstDay);

    const firstDayIndex = startDate.getDay();

    if (firstDayIndex !== 1 && firstDayIndex !== 0 && firstDayIndex !== 6) {
      const daysToSubtract = firstDayIndex - 1;
      startDate.setDate(startDate.getDate() - daysToSubtract);
    } else if (firstDayIndex === 0 || firstDayIndex === 6) {
      const daysToAdd = firstDayIndex === 0 ? 1 : 2;
      startDate.setDate(startDate.getDate() + daysToAdd);
    }

    let currentDate = new Date(startDate);

    while (
      currentDate <= lastDay ||
      (currentWeek.length > 0 && currentWeek.length < 5)
    ) {
      const dayIndex = currentDate.getDay();
      const dayName =
        dayIndex >= 1 && dayIndex <= 5 ? DAYS[dayIndex - 1] : null;

      if (dayName && currentDate.getMonth() === month) {
        currentWeek.push({
          day: currentDate.getDate(),
          date: new Date(currentDate),
          dayName: dayName,
        });
      }

      if (currentDate.getDay() === 5) {
        if (currentWeek.length > 0) {
          weeks.push({
            weekNumber: weekNum++,
            dates: [...currentWeek],
          });
          currentWeek = [];
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);

      if (currentDate.getMonth() > month && currentWeek.length === 0) {
        break;
      }
    }

    if (currentWeek.length > 0) {
      weeks.push({
        weekNumber: weekNum++,
        dates: [...currentWeek],
      });
    }

    return weeks;
  };

  // Fetch data laporan
  const generateReport = async () => {
    if (!selectedTeacher) {
      alert("Pilih guru terlebih dahulu!");
      return;
    }

    setLoading(true);

    try {
      const teacher = teachers.find((t) => t.teacher_id === selectedTeacher);
      if (!teacher) throw new Error("Guru tidak ditemukan");

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, teacher_id, full_name")
        .eq("teacher_id", selectedTeacher)
        .single();

      if (userError) throw userError;
      const userId = userData.id;

      const { data: schedules, error: scheduleError } = await supabase
        .from("teacher_schedules")
        .select("id, day, start_time, end_time, class_id")
        .eq("teacher_id", userId)
        .order("day", { ascending: true })
        .order("start_time", { ascending: true });

      if (scheduleError) throw scheduleError;

      const startDate = new Date(selectedYear, selectedMonth, 1);
      const endDate = new Date(selectedYear, selectedMonth + 1, 0);

      const startDateStr = startDate.toISOString().split("T")[0];
      const endDateStr = endDate.toISOString().split("T")[0];

      const { data: attendance, error: attendanceError } = await supabase
        .from("teacher_attendance")
        .select("*")
        .eq("teacher_id", selectedTeacher)
        .gte("attendance_date", startDateStr)
        .lte("attendance_date", endDateStr)
        .order("attendance_date", { ascending: true });

      if (attendanceError) throw attendanceError;

      console.log("=== DEBUG ATTENDANCE ===");
      console.log("Attendance Data:", attendance);

      const weeks = getWeeksInMonth(selectedYear, selectedMonth);

      const formattedSchedules =
        schedules?.map((schedule) => ({
          id: schedule.id,
          day: schedule.day,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          class_id: schedule.class_id,
          className: schedule.class_id,
          jamKe: getJamKe(schedule.day, schedule.start_time),
        })) || [];

      const formattedAttendance = {};
      attendance?.forEach((record) => {
        const dateStr = record.attendance_date;
        formattedAttendance[dateStr] = {
          status: record.status,
          check_in: record.check_in,
        };
      });

      const processedWeeks = weeks.map((week) => {
        const weekData = [];

        for (let jamKe = 1; jamKe <= 9; jamKe++) {
          const jamRow = { jamKe, days: {} };

          week.dates.forEach(({ day, date, dayName }) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const dayNum = String(date.getDate()).padStart(2, "0");
            const dateStr = `${year}-${month}-${dayNum}`;

            const attendanceRecord = formattedAttendance[dateStr];

            if (date.getDate() === 29 || date.getDate() === 30) {
              console.log(
                `DATE ${dateStr}: attendanceRecord =`,
                attendanceRecord
              );
            }

            let hadir = attendanceRecord?.status === "Hadir";

            if (jamKe === 1 && dayName === "Senin") {
              jamRow.days[dayName] = {
                kelas: "UPACARA",
                hadir: false,
                status: "UPACARA",
              };
            } else {
              const schedule = formattedSchedules.find(
                (s) => s.day === dayName && s.jamKe === jamKe
              );

              if (schedule) {
                jamRow.days[dayName] = {
                  kelas: schedule.className,
                  hadir: hadir,
                  status: attendanceRecord?.status || "",
                };
              } else {
                if (dayName === "Jumat" && jamKe > 6) {
                  jamRow.days[dayName] = {
                    kelas: "",
                    hadir: false,
                    status: "",
                  };
                } else {
                  jamRow.days[dayName] = null;
                }
              }
            }
          });

          weekData.push(jamRow);
        }

        return { ...week, schedule: weekData };
      });

      const totalScheduledHours = processedWeeks.reduce((total, week) => {
        return (
          total +
          DAYS.reduce((weekTotal, day) => {
            return weekTotal + calculateJamPerHari(week.schedule, day);
          }, 0)
        );
      }, 0);

      setReportData({
        teacher: userData,
        month: MONTHS[selectedMonth],
        year: selectedYear,
        weeks: processedWeeks,
        totalScheduledHours: totalScheduledHours,
        totalAttendedHours:
          attendance?.filter((a) => a.status === "Hadir").length || 0,
      });
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Gagal generate laporan: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Hitung JP terjadwal per hari
  const calculateJamPerHari = (weekSchedule, dayName) => {
    let total = 0;
    weekSchedule.forEach((jam) => {
      const dayData = jam.days[dayName];
      if (
        dayData &&
        dayData.kelas &&
        dayData.kelas !== "" &&
        dayData.kelas !== "UPACARA"
      ) {
        total++;
      }
    });
    return total;
  };

  // Hitung JP yang HADIR per hari
  const calculateJamHadirPerHari = (weekSchedule, dayName) => {
    let total = 0;
    weekSchedule.forEach((jam) => {
      const dayData = jam.days[dayName];
      if (
        dayData &&
        dayData.hadir &&
        dayData.kelas &&
        dayData.kelas !== "" &&
        dayData.kelas !== "UPACARA"
      ) {
        total++;
      }
    });
    return total;
  };

  // Hitung total keseluruhan
  const calculateOverallTotal = () => {
    if (!reportData) return 0;
    let total = 0;
    reportData.weeks.forEach((week) => {
      DAYS.forEach((day) => {
        total += calculateJamPerHari(week.schedule, day);
      });
    });
    return total;
  };

  // Hitung total jam hadir
  const calculateTotalHadir = () => {
    if (!reportData) return 0;
    let total = 0;
    reportData.weeks.forEach((week) => {
      week.schedule.forEach((jam) => {
        DAYS.forEach((day) => {
          const dayData = jam.days[day];
          if (
            dayData &&
            dayData.hadir &&
            dayData.kelas &&
            dayData.kelas !== "" &&
            dayData.kelas !== "UPACARA"
          ) {
            total++;
          }
        });
      });
    });
    return total;
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  // Export ke Excel
  const exportToExcel = async () => {
    if (!reportData) return;

    try {
      await exportITMReportToExcel(reportData);
      alert("Export Excel berhasil!");
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Gagal export Excel: " + error.message);
    }
  };

  // Loading state untuk teachers
  if (teachersLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Memuat data guru...
          </p>
        </div>
      </div>
    );
  }

  // Error state untuk teachers
  if (teachersError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-600 dark:text-red-400 w-6 h-6 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-800 dark:text-red-300 font-semibold mb-2">
                Terjadi Kesalahan
              </h3>
              <p className="text-red-600 dark:text-red-400 mb-4 text-sm">
                {teachersError}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium">
                Muat Ulang Halaman
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state jika tidak ada guru
  if (teachers.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <User className="mx-auto text-gray-400 dark:text-gray-600 w-16 h-16 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
            Tidak Ada Data Guru
          </h3>
          <p className="text-gray-500 dark:text-gray-500 text-sm">
            Belum ada guru yang terdaftar dalam sistem.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="print:hidden bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/50 p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <Calendar className="text-blue-600 dark:text-blue-400 w-6 h-6 sm:w-7 sm:h-7" />
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">
            Laporan Jam Tatap Muka Guru
          </h1>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4 mb-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
              <User className="inline mr-1 w-4 h-4 sm:w-4 sm:h-4" />
              Pilih Guru
            </label>
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="w-full px-3 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none touch-manipulation min-h-[44px]"
              disabled={loading}>
              <option value="">-- Pilih Guru --</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.teacher_id}>
                  {teacher.full_name} ({teacher.teacher_id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
              Bulan
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full px-3 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none touch-manipulation min-h-[44px]"
              disabled={loading}>
              {MONTHS.map((month, idx) => (
                <option key={idx} value={idx}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
              Tahun
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-3 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none touch-manipulation min-h-[44px]"
              disabled={loading}>
              {[2025, 2026, 2027, 2028, 2029, 2030].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={generateReport}
              disabled={loading || !selectedTeacher}
              className="w-full px-4 py-2.5 sm:py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 touch-manipulation min-h-[44px] active:scale-[0.98] text-sm sm:text-base">
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Loading...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 sm:w-4 sm:h-4" />
                  <span className="truncate">Lihat Laporan</span>
                </>
              )}
            </button>
          </div>
        </div>

        {reportData && (
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 sm:py-2 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 touch-manipulation min-h-[44px] active:scale-[0.98] text-sm sm:text-base">
              <Printer className="w-4 h-4 sm:w-4 sm:h-4" />
              Print
            </button>
            <button
              onClick={exportToExcel}
              className="px-4 py-2.5 sm:py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 touch-manipulation min-h-[44px] active:scale-[0.98] text-sm sm:text-base">
              <FileSpreadsheet className="w-4 h-4 sm:w-4 sm:h-4" />
              Export Excel
            </button>
          </div>
        )}
      </div>

      {/* Report Content */}
      {reportData && (
        <div className="print:p-0">
          {reportData.weeks.map((week, weekIdx) => (
            <div
              key={weekIdx}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/50 p-4 sm:p-6 mb-4 sm:mb-6 print:shadow-none print:mb-8 print:break-after-page">
              {/* Header */}
              <div className="text-center mb-4 sm:mb-6 border-b-2 border-gray-800 dark:border-gray-600 pb-3 sm:pb-4">
                <h2 className="text-sm sm:text-base md:text-lg font-bold uppercase tracking-wide text-gray-800 dark:text-gray-100">
                  JUMLAH JAM TATAP MUKA GURU SMP MUSLIMIN CILILIN
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  TAHUN AJARAN 2025/2026
                </p>
                <div className="mt-2 sm:mt-3 text-left space-y-1">
                  <p className="text-xs sm:text-sm">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      MINGGU KE
                    </span>{" "}
                    :{" "}
                    <span className="text-gray-800 dark:text-gray-200">
                      {week.weekNumber}
                    </span>
                  </p>
                  <p className="text-xs sm:text-sm">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      NAMA GURU
                    </span>{" "}
                    :{" "}
                    <span className="text-gray-800 dark:text-gray-200">
                      {reportData.teacher.full_name}
                    </span>
                  </p>
                  <p className="text-xs sm:text-sm">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      BULAN
                    </span>{" "}
                    :{" "}
                    <span className="text-gray-800 dark:text-gray-200">
                      {reportData.month} {reportData.year}
                    </span>
                  </p>
                </div>
              </div>

              {/* Tabel */}
              <div className="overflow-x-auto -mx-2 sm:-mx-0">
                <table className="w-full border-collapse border-2 border-gray-800 dark:border-gray-600 text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700">
                      <th className="border border-gray-800 dark:border-gray-600 px-1 sm:px-2 py-1 sm:py-2 w-10 sm:w-12 text-gray-800 dark:text-gray-200">
                        JAM
                      </th>
                      {DAYS.map((day, idx) => {
                        const dateInfo = week.dates.find(
                          (d) => d.dayName === day
                        );
                        const tanggal = dateInfo ? dateInfo.day : "";
                        const bulanAktual = dateInfo
                          ? dateInfo.date.getMonth()
                          : selectedMonth;
                        const bulanSingkat = MONTHS[bulanAktual].substring(
                          0,
                          3
                        );

                        return (
                          <React.Fragment key={day}>
                            <th className="border border-gray-800 dark:border-gray-600 px-1 sm:px-2 py-1 sm:py-2 w-12 sm:w-16 text-gray-800 dark:text-gray-200">
                              Kelas
                            </th>
                            <th className="border border-gray-800 dark:border-gray-600 px-1 sm:px-2 py-1 sm:py-2 w-16 sm:w-20 text-gray-800 dark:text-gray-200">
                              <div className="text-center">
                                <div className="font-bold">
                                  {FULL_DAY_NAMES[idx]}
                                </div>
                                {tanggal && (
                                  <div className="text-xs font-normal mt-0.5 text-gray-600 dark:text-gray-400">
                                    {tanggal} {bulanSingkat}
                                  </div>
                                )}
                              </div>
                            </th>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {week.schedule.map((jamRow, idx) => (
                      <tr key={idx}>
                        <td className="border border-gray-800 dark:border-gray-600 px-1 sm:px-2 py-1 sm:py-2 text-center font-semibold text-gray-800 dark:text-gray-200">
                          {jamRow.jamKe}
                        </td>
                        {DAYS.map((day) => {
                          const dayData = jamRow.days[day];
                          const isUpacara = dayData?.kelas === "UPACARA";

                          return (
                            <React.Fragment key={day}>
                              <td className="border border-gray-800 dark:border-gray-600 px-1 sm:px-2 py-1 sm:py-2 text-center text-gray-800 dark:text-gray-200">
                                {dayData?.kelas || "-"}
                              </td>
                              <td className="border border-gray-800 dark:border-gray-600 px-1 sm:px-2 py-1 sm:py-2 text-center">
                                {isUpacara ? (
                                  ""
                                ) : dayData?.hadir ? (
                                  <span className="text-green-600 dark:text-green-400 font-bold text-base sm:text-lg">
                                    ✓
                                  </span>
                                ) : dayData?.status &&
                                  dayData.status !== "Hadir" ? (
                                  <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                                    {dayData.status}
                                  </span>
                                ) : dayData?.kelas && dayData.kelas !== "" ? (
                                  <div className="w-4 h-4 sm:w-6 sm:h-6 border-2 border-gray-800 dark:border-gray-400 mx-auto"></div>
                                ) : (
                                  <span className="text-gray-400 dark:text-gray-500">
                                    -
                                  </span>
                                )}
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    ))}
                    {/* Row JUMLAH per hari */}
                    <tr className="bg-gray-100 dark:bg-gray-700 font-bold">
                      <td className="border border-gray-800 dark:border-gray-600 px-1 sm:px-2 py-1 sm:py-2 text-center text-gray-800 dark:text-gray-200">
                        JUMLAH :{" "}
                        {DAYS.reduce(
                          (total, day) =>
                            total +
                            calculateJamHadirPerHari(week.schedule, day),
                          0
                        )}
                      </td>
                      {DAYS.map((day) => {
                        const jamHadir = calculateJamHadirPerHari(
                          week.schedule,
                          day
                        );

                        return (
                          <React.Fragment key={day}>
                            <td
                              className="border border-gray-800 dark:border-gray-600 px-1 sm:px-2 py-1 sm:py-2 text-center text-gray-800 dark:text-gray-200"
                              colSpan="2">
                              {jamHadir > 0 ? jamHadir : ""}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Total Keseluruhan */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-800 rounded-xl p-4 sm:p-6 print:mt-6">
            <h3 className="text-lg sm:text-xl font-bold text-blue-800 dark:text-blue-300 mb-3 sm:mb-4">
              TOTAL JAM TATAP MUKA
            </h3>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex justify-between items-center pb-2 sm:pb-3 border-b border-blue-200 dark:border-blue-800">
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Bulan:
                </p>
                <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                  {reportData.month} {reportData.year}
                </p>
              </div>
              <div className="flex justify-between items-center pb-2 sm:pb-3 border-b border-blue-200 dark:border-blue-800">
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Guru:
                </p>
                <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                  {reportData.teacher.full_name}
                </p>
              </div>
              <div className="flex justify-between items-center pb-2 sm:pb-3 border-b border-blue-200 dark:border-blue-800">
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Total Minggu:
                </p>
                <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                  {reportData.weeks.length} minggu
                </p>
              </div>

              <div className="pt-2 sm:pt-3 space-y-1.5 sm:space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-gray-700 dark:text-gray-300 font-medium text-sm sm:text-base">
                    Jam Terjadwal:
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
                    {calculateOverallTotal()} Jam
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-gray-700 dark:text-gray-300 font-medium text-sm sm:text-base">
                    Jam Hadir:
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                    {calculateTotalHadir()} Jam
                    <span className="text-xs sm:text-sm ml-1 sm:ml-2 text-gray-600 dark:text-gray-400">
                      (
                      {calculateOverallTotal() > 0
                        ? (
                            (calculateTotalHadir() / calculateOverallTotal()) *
                            100
                          ).toFixed(1)
                        : 0}
                      %)
                    </span>
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-gray-700 dark:text-gray-300 font-medium text-sm sm:text-base">
                    Jam Tidak Hadir:
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
                    {calculateOverallTotal() - calculateTotalHadir()} Jam
                    <span className="text-xs sm:text-sm ml-1 sm:ml-2 text-gray-600 dark:text-gray-400">
                      (
                      {calculateOverallTotal() > 0
                        ? (
                            ((calculateOverallTotal() - calculateTotalHadir()) /
                              calculateOverallTotal()) *
                            100
                          ).toFixed(1)
                        : 0}
                      %)
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!reportData && !loading && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/50 p-6 sm:p-8 md:p-12 text-center print:hidden">
          <Calendar className="mx-auto text-gray-400 dark:text-gray-600 w-12 h-12 sm:w-16 sm:h-16" />
          <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:mb-2 mt-3">
            Belum Ada Laporan
          </h3>
          <p className="text-gray-500 dark:text-gray-500 text-sm sm:text-base">
            Pilih guru, bulan, dan tahun lalu klik "Lihat Laporan"
          </p>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body { margin: 0; }
          @page { size: A4; margin: 1cm; }
          .print\\:hidden { display: none !important; }
          .print\\:break-after-page { page-break-after: always; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:mb-8 { margin-bottom: 2rem !important; }
          .print\\:mt-6 { margin-top: 1.5rem !important; }
          
          /* Dark mode styles for print */
          .dark\\:bg-gray-800,
          .dark\\:bg-gray-900,
          .dark\\:text-gray-100,
          .dark\\:text-gray-200,
          .dark\\:text-gray-300,
          .dark\\:border-gray-600,
          .dark\\:border-gray-700 {
            background: white !important;
            color: black !important;
            border-color: #374151 !important;
          }
          
          .dark\\:shadow-gray-900\\/50 {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ITMReport;
