import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  X,
  Download,
  Upload,
  LayoutGrid,
  List,
} from "lucide-react";
import TeacherScheduleExcel from "./TeacherScheduleExcel";
import {
  getActiveAcademicInfo,
  applyAcademicFilters,
} from "../services/academicYearService";

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
  },
};

const TeacherSchedule = ({ user }) => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [classes, setClasses] = useState([]);
  const [viewMode, setViewMode] = useState("grid");
  const [academicInfo, setAcademicInfo] = useState(null);
  const [academicLoading, setAcademicLoading] = useState(true);

  const [formData, setFormData] = useState({
    day: "Senin",
    start_period: "1",
    end_period: "1",
    class_id: "",
  });

  const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];

  useEffect(() => {
    const loadAcademicData = async () => {
      try {
        setAcademicLoading(true);
        const info = await getActiveAcademicInfo();
        setAcademicInfo(info);
      } catch (err) {
        console.error("Error loading academic info:", err);
        setError("Gagal memuat informasi tahun ajaran");
      } finally {
        setAcademicLoading(false);
      }
    };

    loadAcademicData();
  }, []);

  useEffect(() => {
    if (user && user.id && academicInfo) {
      fetchSchedules();
      fetchClasses();
    }
  }, [user, academicInfo]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("teacher_schedules")
        .select("*")
        .eq("teacher_id", user.id)
        .order("day")
        .order("start_time");

      // Gunakan filter dengan cara manual jika kolom academic_year_id tidak ada
      const { semester, year } = academicInfo;

      // Cek apakah tabel memiliki kolom academic_year_id atau tidak
      // Untuk sementara, kita asumsikan tabel belum memiliki kolom tersebut
      // Jadi kita tidak filter berdasarkan academic_year_id

      const { data, error } = await query;

      if (error) throw error;

      // Filter di sisi client jika perlu
      // Atau biarkan tanpa filter jika tabel belum mendukung filtering per tahun ajaran
      setSchedules(data || []);
    } catch (err) {
      setError("Gagal memuat jadwal: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      if (!user.teacher_id) {
        console.error("❌ User tidak memiliki teacher_id!");
        const { data: allClasses } = await supabase
          .from("classes")
          .select("id, grade")
          .eq("is_active", true)
          .order("id");
        setClasses(allClasses || []);
        return;
      }

      console.log("🔑 Using teacher_id:", user.teacher_id);

      // Untuk teacher_assignments, gunakan filter tanpa academic_year_id
      // karena mungkin tabel ini juga belum memiliki kolom tersebut
      const { data: assignments, error: assignError } = await supabase
        .from("teacher_assignments")
        .select("class_id")
        .eq("teacher_id", user.teacher_id);

      if (assignError) {
        console.error("❌ Error fetching assignments:", assignError);
        throw assignError;
      }

      console.log("📋 Teacher assignments:", assignments);

      if (!assignments || assignments.length === 0) {
        console.warn(
          "⚠️ Guru belum memiliki penugasan kelas, menampilkan semua kelas"
        );

        const { data: allClasses, error: allClassError } = await supabase
          .from("classes")
          .select("id, grade")
          .eq("is_active", true)
          .order("id");

        if (allClassError) throw allClassError;

        setClasses(allClasses || []);
        console.log(
          `🔄 FALLBACK: Menampilkan ${allClasses?.length || 0} kelas`
        );
        return;
      }

      const assignedClassIds = assignments.map((a) => a.class_id);
      console.log("🎯 Assigned class IDs:", assignedClassIds);

      const { data: classesData, error: classError } = await supabase
        .from("classes")
        .select("id, grade")
        .in("id", assignedClassIds)
        .eq("is_active", true)
        .order("id");

      if (classError) throw classError;

      setClasses(classesData || []);
      console.log(
        `✅ Guru mengampu ${classesData?.length || 0} kelas:`,
        classesData
      );
    } catch (err) {
      console.error("❌ Error fetching classes:", err);
      try {
        const { data: allClasses } = await supabase
          .from("classes")
          .select("id, grade")
          .eq("is_active", true)
          .order("id");
        setClasses(allClasses || []);
        console.log("🆘 EMERGENCY FALLBACK: Loaded all classes");
      } catch (fallbackErr) {
        console.error("💀 Complete failure:", fallbackErr);
        setClasses([]);
      }
    }
  };

  const saveImportedSchedules = async (importedSchedules) => {
    try {
      // Hapus jadwal guru untuk tahun ajaran ini
      // Karena belum ada academic_year_id, kita hapus semua dulu (sementara)
      const { error: deleteError } = await supabase
        .from("teacher_schedules")
        .delete()
        .eq("teacher_id", user.id);

      if (deleteError) throw deleteError;

      // Simpan jadwal baru
      const { error: insertError } = await supabase
        .from("teacher_schedules")
        .insert(importedSchedules);

      if (insertError) throw insertError;

      return {
        success: true,
        message: `Berhasil menyimpan ${importedSchedules.length} jadwal`,
      };
    } catch (error) {
      throw new Error("Gagal menyimpan jadwal import: " + error.message);
    }
  };

  const handleExportToExcel = async () => {
    try {
      const result = await TeacherScheduleExcel.exportToExcel(
        schedules,
        user,
        days,
        academicInfo
      );

      if (result.success) {
        setSuccess(result.message);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message);
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      setError("Gagal export ke Excel: " + err.message);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleImportFromExcel = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const result = await TeacherScheduleExcel.importFromExcel(
        file,
        user.id,
        academicInfo
      );

      if (result.success) {
        if (result.schedules && result.schedules.length > 0) {
          const saveResult = await saveImportedSchedules(result.schedules);
          if (saveResult.success) {
            setSuccess(`${result.message} ${saveResult.message}`);
          } else {
            setError(saveResult.message);
          }
        } else {
          setSuccess(result.message);
        }

        setTimeout(() => {
          setSuccess(null);
          setError(null);
        }, 4000);

        fetchSchedules();
      } else {
        setError(result.message);
        setTimeout(() => setError(null), 4000);
      }
    } catch (err) {
      setError("Gagal import dari Excel: " + err.message);
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const result = await TeacherScheduleExcel.downloadTemplate(
        user,
        academicInfo
      );
      if (result.success) {
        setSuccess(result.message);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message);
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      setError("Gagal download template: " + err.message);
      setTimeout(() => setError(null), 3000);
    }
  };

  const generateScheduleGrid = () => {
    const grid = {};

    days.forEach((day) => {
      grid[day] = {};

      const daySchedule = JAM_SCHEDULE[day];
      if (daySchedule) {
        Object.keys(daySchedule).forEach((period) => {
          grid[day][period] = null;
        });
      }

      schedules
        .filter((schedule) => schedule.day === day)
        .forEach((schedule) => {
          const periods = findPeriodsByTimeRange(
            day,
            schedule.start_time,
            schedule.end_time
          );
          periods.forEach((period) => {
            grid[day][period] = schedule;
          });
        });
    });

    return grid;
  };

  const findPeriodsByTimeRange = (day, startTime, endTime) => {
    const daySchedule = JAM_SCHEDULE[day];
    if (!daySchedule) return [];

    const periods = [];
    const targetStart = timeToMinutes(startTime);
    const targetEnd = timeToMinutes(endTime);

    for (const [period, timeRange] of Object.entries(daySchedule)) {
      const periodStart = timeToMinutes(timeRange.start);
      const periodEnd = timeToMinutes(timeRange.end);

      if (periodStart >= targetStart && periodEnd <= targetEnd) {
        periods.push(period);
      }
    }

    return periods;
  };

  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const getPeriodFromTime = (day, startTime, endTime) => {
    const periods = findPeriodsByTimeRange(day, startTime, endTime);
    return {
      startPeriod: periods[0] || "1",
      endPeriod: periods[periods.length - 1] || "1",
    };
  };

  const handleOpenModal = (schedule = null) => {
    if (schedule) {
      setEditingId(schedule.id);
      const { startPeriod, endPeriod } = getPeriodFromTime(
        schedule.day,
        schedule.start_time,
        schedule.end_time
      );
      setFormData({
        day: schedule.day,
        start_period: startPeriod,
        end_period: endPeriod,
        class_id: schedule.class_id,
      });
    } else {
      setEditingId(null);
      setFormData({
        day: "Senin",
        start_period: "1",
        end_period: "1",
        class_id: "",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setError(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.class_id) {
      setError("Kelas harus dipilih");
      return;
    }

    if (parseInt(formData.start_period) > parseInt(formData.end_period)) {
      setError("Jam mulai harus lebih awal dari jam selesai");
      return;
    }

    setLoading(true);

    try {
      const daySchedule = JAM_SCHEDULE[formData.day];
      const startTime = daySchedule[formData.start_period].start;
      const endTime = daySchedule[formData.end_period].end;

      // Hanya tambahkan academic_year_id jika kolomnya ada di tabel
      // Untuk sementara kita tidak tambahkan karena tabel belum punya kolom tersebut
      const scheduleData = {
        day: formData.day,
        start_time: startTime,
        end_time: endTime,
        class_id: formData.class_id,
        teacher_id: user.id,
        // academic_year_id: academicInfo.yearId, // Jangan tambahkan dulu
      };

      if (editingId) {
        const { error } = await supabase
          .from("teacher_schedules")
          .update(scheduleData)
          .eq("id", editingId);
        if (error) throw error;
        setSuccess("Jadwal berhasil diperbarui");
      } else {
        const { error } = await supabase
          .from("teacher_schedules")
          .insert(scheduleData);
        if (error) throw error;
        setSuccess("Jadwal berhasil ditambahkan");
      }

      handleCloseModal();
      fetchSchedules();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError("Gagal menyimpan jadwal: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin ingin menghapus jadwal ini?")) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("teacher_schedules")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setSuccess("Jadwal berhasil dihapus");
      fetchSchedules();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError("Gagal menghapus jadwal");
    } finally {
      setLoading(false);
    }
  };

  const getTodaySchedules = () => {
    const today = days[new Date().getDay() - 1] || "Senin";
    return schedules.filter((s) => s.day === today);
  };

  const getGroupedTodaySchedules = () => {
    const todaySchedules = getTodaySchedules();
    if (todaySchedules.length === 0) return [];

    const sorted = [...todaySchedules].sort((a, b) =>
      a.start_time.localeCompare(b.start_time)
    );

    const groups = [];
    let currentGroup = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = currentGroup[currentGroup.length - 1];

      const isSameClass = current.class_id === last.class_id;
      const lastEndMinutes = timeToMinutes(last.end_time);
      const currentStartMinutes = timeToMinutes(current.start_time);
      const isConsecutive =
        Math.abs(currentStartMinutes - lastEndMinutes) <= 30;

      if (isSameClass && isConsecutive) {
        currentGroup.push(current);
      } else {
        groups.push(currentGroup);
        currentGroup = [current];
      }
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  };

  const getAvailablePeriods = () => {
    return Object.keys(JAM_SCHEDULE[formData.day] || {});
  };

  const scheduleGrid = generateScheduleGrid();

  if (academicLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-gray-400">
            Memuat informasi tahun ajaran...
          </p>
        </div>
      </div>
    );
  }

  if (!academicInfo) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-6 py-4 rounded-lg max-w-md">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5" />
            <h3 className="font-bold">Gagal Memuat Data</h3>
          </div>
          <p>
            Informasi tahun ajaran tidak tersedia. Silakan hubungi
            administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* ✅ CARD 1: Header Info - MENGGUNAKAN DATA DINAMIS */}
        <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-gray-100">
                JADWAL MENGAJAR
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-gray-400 font-semibold">
                {/* ✅ TAHUN AJARAN MENGGUNAKAN DATA DINAMIS */}
                TAHUN AJARAN {academicInfo.year}{" "}
                {academicInfo.semester === 1
                  ? "SEMESTER GANJIL"
                  : "SEMESTER GENAP"}
              </p>
            </div>
          </div>
        </div>

        {/* ✅ CARD 2: Action Buttons */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center flex-wrap">
            {/* Tampilan Grid */}
            <button
              onClick={() => setViewMode("grid")}
              className={`flex-1 min-w-[120px] sm:min-w-[140px] px-3 py-2.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium flex items-center gap-2 justify-center border transition-all touch-manipulation active:scale-[0.98] ${
                viewMode === "grid"
                  ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700"
                  : "bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-300 border-slate-300 dark:border-gray-600 hover:bg-slate-200 dark:hover:bg-gray-600"
              }`}>
              <LayoutGrid className="w-5 h-5" />
              <span className="truncate">Tampilan Grid</span>
            </button>

            {/* Tampilan List */}
            <button
              onClick={() => setViewMode("list")}
              className={`flex-1 min-w-[120px] sm:min-w-[140px] px-3 py-2.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium flex items-center gap-2 justify-center border transition-all touch-manipulation active:scale-[0.98] ${
                viewMode === "list"
                  ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700"
                  : "bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-300 border-slate-300 dark:border-gray-600 hover:bg-slate-200 dark:hover:bg-gray-600"
              }`}>
              <List className="w-5 h-5" />
              <span className="truncate">Tampilan List</span>
            </button>

            {/* Tambah Jadwal */}
            <button
              onClick={() => handleOpenModal()}
              className="flex-1 min-w-[120px] sm:min-w-[140px] bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 text-slate-700 dark:text-gray-300 px-3 py-2.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium flex items-center gap-2 justify-center border border-slate-300 dark:border-gray-600 transition-all touch-manipulation active:scale-[0.98]">
              <Plus className="w-5 h-5" />
              <span className="truncate">Tambah Jadwal</span>
            </button>

            {/* Export Excel */}
            <button
              onClick={handleExportToExcel}
              disabled={schedules.length === 0}
              className="flex-1 min-w-[120px] sm:min-w-[140px] bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 text-slate-700 dark:text-gray-300 px-3 py-2.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium flex items-center gap-2 justify-center border border-slate-300 dark:border-gray-600 transition-all touch-manipulation active:scale-[0.98]">
              <Download className="w-5 h-5" />
              <span className="truncate">Export Jadwal</span>
            </button>

            {/* Download Template */}
            <button
              onClick={handleDownloadTemplate}
              className="flex-1 min-w-[120px] sm:min-w-[140px] bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 text-slate-700 dark:text-gray-300 px-3 py-2.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium flex items-center gap-2 justify-center border border-slate-300 dark:border-gray-600 transition-all touch-manipulation active:scale-[0.98]">
              <Download className="w-5 h-5" />
              <span className="truncate">Template Excel</span>
            </button>

            {/* Import Excel */}
            <label className="flex-1 min-w-[120px] sm:min-w-[140px] bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 cursor-pointer text-slate-700 dark:text-gray-300 px-3 py-2.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium flex items-center gap-2 justify-center border border-slate-300 dark:border-gray-600 transition-all touch-manipulation active:scale-[0.98]">
              <Upload className="w-5 h-5" />
              <span className="truncate">Import Jadwal</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportFromExcel}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Alerts */}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 px-4 py-3 rounded-lg mb-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>{success}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Today's Schedule */}
        {getGroupedTodaySchedules().length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 border-indigo-200 dark:border-indigo-800 p-4 mb-8">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-gray-100 mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Jadwal Hari Ini ({days[new Date().getDay() - 1] || "Senin"})
            </h2>

            <div
              className={`grid gap-2 ${
                getGroupedTodaySchedules().length <= 4
                  ? "grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4"
                  : ""
              } ${
                getGroupedTodaySchedules().length > 4 &&
                getGroupedTodaySchedules().length <= 6
                  ? "grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-3"
                  : ""
              } ${
                getGroupedTodaySchedules().length > 6
                  ? "grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
                  : ""
              }`}>
              {getGroupedTodaySchedules().map((group, idx) => {
                const first = group[0];
                const last = group[group.length - 1];
                const totalJP = group.length;

                return (
                  <div
                    key={idx}
                    className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-200 dark:border-indigo-800 p-3 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1 truncate">
                          {first.start_time} - {last.end_time}
                        </p>
                        <p className="font-semibold text-slate-800 dark:text-gray-100 text-sm mb-1 truncate">
                          Kelas {first.class_id}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-gray-400 truncate">
                          {totalJP}JP
                          {group.length > 1 &&
                            ` (${
                              findPeriodsByTimeRange(
                                first.day,
                                first.start_time,
                                first.end_time
                              )[0]
                            }-${findPeriodsByTimeRange(
                              last.day,
                              last.start_time,
                              last.end_time
                            ).pop()})`}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 gap-1 ml-2">
                        <button
                          onClick={() => handleOpenModal(first)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-1 touch-manipulation active:scale-90"
                          title="Edit">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                `Hapus sesi Kelas ${first.class_id}?`
                              )
                            ) {
                              group.forEach((schedule) =>
                                handleDelete(schedule.id)
                              );
                            }
                          }}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1 touch-manipulation active:scale-90"
                          title="Hapus Sesi">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Schedule View */}
        {viewMode === "grid" ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-slate-800 dark:text-gray-100">
                Jadwal Mengajar Mingguan (Tampilan Grid)
              </h2>
            </div>

            {loading && schedules.length === 0 ? (
              <div className="p-8 text-center text-slate-600 dark:text-gray-400">
                Memuat jadwal...
              </div>
            ) : schedules.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-400 dark:text-gray-600" />
                <p className="mb-2 dark:text-gray-400">Belum ada jadwal</p>
                <p className="text-sm dark:text-gray-500">
                  Klik "Tambah Jadwal" untuk memulai
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-max">
                  <thead>
                    <tr className="bg-blue-800 dark:bg-blue-900 text-white text-xs sm:text-sm">
                      <th className="p-3 border border-slate-600 dark:border-gray-700 text-center font-semibold">
                        JAM KE
                      </th>
                      <th className="p-3 border border-slate-600 dark:border-gray-700 text-center font-semibold">
                        WAKTU*
                      </th>
                      {days.map((day) => (
                        <th
                          key={day}
                          className="p-3 border border-slate-600 dark:border-gray-700 text-center font-semibold">
                          {day.toUpperCase()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(JAM_SCHEDULE.Selasa || {}).map(
                      ([period, time]) => (
                        <React.Fragment key={period}>
                          <tr className="hover:bg-slate-50 dark:hover:bg-gray-700/50 text-sm">
                            <td className="p-2 border border-slate-300 dark:border-gray-600 text-center font-semibold bg-slate-100 dark:bg-gray-800 text-slate-800 dark:text-gray-200">
                              {period}
                            </td>
                            <td
                              className={`p-2 border border-slate-300 dark:border-gray-600 text-center text-xs ${
                                period === "1"
                                  ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                                  : "bg-slate-100 dark:bg-gray-800"
                              }`}>
                              {time.start} - {time.end}
                              {period === "1" && (
                                <div className="text-[10px] mt-1 text-yellow-600 dark:text-yellow-400">
                                  Senin: 07:00-08:00
                                </div>
                              )}
                            </td>
                            {days.map((day) => (
                              <td
                                key={day}
                                className="p-2 border border-slate-300 dark:border-gray-600 text-center">
                                {day === "Jumat" ? (
                                  <div className="flex flex-col items-center">
                                    {scheduleGrid[day] &&
                                    scheduleGrid[day][period] ? (
                                      <>
                                        <span className="font-bold text-slate-800 dark:text-gray-100 text-sm sm:text-lg">
                                          {scheduleGrid[day][period].class_id}
                                        </span>
                                        <div className="text-[10px] mt-1 text-blue-600 dark:text-blue-400 font-medium">
                                          {JAM_SCHEDULE.Jumat[period]?.start}-
                                          {JAM_SCHEDULE.Jumat[period]?.end}
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <span className="text-slate-400 dark:text-gray-600 text-sm sm:text-lg">
                                          -
                                        </span>
                                        <div className="text-[10px] mt-1 text-blue-600 dark:text-blue-400 font-medium">
                                          {JAM_SCHEDULE.Jumat[period]?.start}-
                                          {JAM_SCHEDULE.Jumat[period]?.end}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ) : scheduleGrid[day] &&
                                  scheduleGrid[day][period] ? (
                                  <span className="font-bold text-slate-800 dark:text-gray-100 text-sm sm:text-lg">
                                    {scheduleGrid[day][period].class_id}
                                  </span>
                                ) : day === "Senin" && period === "1" ? (
                                  <span className="font-bold text-slate-800 dark:text-gray-100 text-sm sm:text-lg">
                                    UPACARA
                                  </span>
                                ) : (
                                  <span className="text-slate-400 dark:text-gray-600 text-sm sm:text-lg">
                                    -
                                  </span>
                                )}
                              </td>
                            ))}
                          </tr>

                          {/* ISTIRAHAT PAGI SETELAH JP 4 */}
                          {period === "4" && (
                            <tr>
                              <td
                                colSpan={7}
                                className="p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-center text-orange-800 dark:text-orange-300 font-semibold text-xs sm:text-sm">
                                🕛 ISTIRAHAT {time.end} - 10:10 (30 menit)
                              </td>
                            </tr>
                          )}

                          {/* ISTIRAHAT SIANG SETELAH JP 7 */}
                          {period === "7" && (
                            <tr>
                              <td
                                colSpan={7}
                                className="p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-center text-orange-800 dark:text-orange-300 font-semibold text-xs sm:text-sm">
                                🕛 ISTIRAHAT 12:10 - 13:00 (50 menit)
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    )}
                  </tbody>
                </table>
                <div className="p-3 bg-slate-50 dark:bg-gray-800 border-t border-slate-200 dark:border-gray-700">
                  <p className="text-xs md:text-sm text-slate-600 dark:text-gray-400 text-center font-bold italic">
                    *Waktu Mengikuti Jadwal Masing-Masing Hari. Senin & Jumat
                    Memiliki Waktu Khusus.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-slate-800 dark:text-gray-100">
                Jadwal Mengajar Mingguan (Tampilan List)
              </h2>
            </div>

            {loading && schedules.length === 0 ? (
              <div className="p-8 text-center text-slate-600 dark:text-gray-400">
                Memuat jadwal...
              </div>
            ) : schedules.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-400 dark:text-gray-600" />
                <p className="mb-2 dark:text-gray-400">Belum ada jadwal</p>
                <p className="text-sm dark:text-gray-500">
                  Klik "Tambah Jadwal" untuk memulai
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-max">
                  <thead className="bg-blue-800 dark:bg-blue-900 text-white text-xs sm:text-sm">
                    <tr>
                      <th className="px-3 py-3 sm:px-6 text-left font-semibold">
                        Hari
                      </th>
                      <th className="px-3 py-3 sm:px-6 text-left font-semibold">
                        Jam Ke
                      </th>
                      <th className="px-3 py-3 sm:px-6 text-left font-semibold">
                        Waktu
                      </th>
                      <th className="px-3 py-3 sm:px-6 text-left font-semibold">
                        Kelas
                      </th>
                      <th className="px-3 py-3 sm:px-6 text-left font-semibold">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {days.map((day) => {
                      const daySchedules = schedules.filter(
                        (s) => s.day === day
                      );
                      return daySchedules.map((schedule, idx) => {
                        const periods = findPeriodsByTimeRange(
                          day,
                          schedule.start_time,
                          schedule.end_time
                        );
                        const jamKe =
                          periods.length > 0
                            ? `${periods[0]}${
                                periods.length > 1
                                  ? `-${periods[periods.length - 1]}`
                                  : ""
                              }`
                            : "?";

                        return (
                          <tr
                            key={schedule.id}
                            className="border-b border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700/50 text-sm">
                            {idx === 0 && (
                              <td
                                className="px-3 py-3 sm:px-6 font-semibold text-slate-800 dark:text-gray-100"
                                rowSpan={daySchedules.length}>
                                {day}
                              </td>
                            )}
                            <td className="px-3 py-3 sm:px-6 text-slate-700 dark:text-gray-300 font-medium">
                              JP {jamKe}
                            </td>
                            <td className="px-3 py-3 sm:px-6 text-slate-700 dark:text-gray-400">
                              {schedule.start_time} - {schedule.end_time}
                            </td>
                            <td className="px-3 py-3 sm:px-6 font-semibold text-slate-800 dark:text-gray-100">
                              Kelas {schedule.class_id}
                            </td>
                            <td className="px-3 py-3 sm:px-6">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleOpenModal(schedule)}
                                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 text-xs sm:text-sm touch-manipulation active:scale-95">
                                  <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(schedule.id)}
                                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-1 text-xs sm:text-sm touch-manipulation active:scale-95">
                                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                  Hapus
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 flex flex-col">
            {/* HEADER */}
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-gray-100">
                {editingId ? "Edit Jadwal" : "Tambah Jadwal"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-400 p-1 touch-manipulation active:scale-90">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* FORM */}
            <form
              onSubmit={handleSubmit}
              className="flex-1 flex flex-col min-h-0">
              <div className="space-y-4 flex-1 overflow-y-auto pr-1 pb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                    Hari
                  </label>
                  <select
                    name="day"
                    value={formData.day}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 sm:py-2 text-sm sm:text-base border border-slate-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none touch-manipulation min-h-[44px]">
                    {days.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                      Dari Jam Ke
                    </label>
                    <select
                      name="start_period"
                      value={formData.start_period}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 sm:py-2 text-sm sm:text-base border border-slate-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none touch-manipulation min-h-[44px]">
                      {getAvailablePeriods().map((jam) => (
                        <option key={jam} value={jam}>
                          Jam {jam}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                      Sampai Jam Ke
                    </label>
                    <select
                      name="end_period"
                      value={formData.end_period}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 sm:py-2 text-sm sm:text-base border border-slate-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none touch-manipulation min-h-[44px]">
                      {getAvailablePeriods().map((jam) => (
                        <option
                          key={jam}
                          value={jam}
                          disabled={
                            parseInt(jam) < parseInt(formData.start_period)
                          }>
                          Jam {jam}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                    Kelas
                  </label>
                  <select
                    name="class_id"
                    value={formData.class_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 sm:py-2 text-sm sm:text-base border border-slate-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none touch-manipulation min-h-[44px]">
                    <option value="">Pilih Kelas</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        Kelas {cls.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* BUTTONS */}
              <div className="flex gap-3 pt-4 sm:pt-6 mt-auto flex-shrink-0">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2.5 bg-slate-200 dark:bg-gray-700 hover:bg-slate-300 dark:hover:bg-gray-600 text-slate-700 dark:text-gray-300 rounded-lg font-medium text-sm sm:text-base touch-manipulation active:scale-[0.98]">
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white rounded-lg disabled:bg-indigo-400 dark:disabled:bg-gray-600 font-medium text-sm sm:text-base touch-manipulation active:scale-[0.98]">
                  {loading ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherSchedule;
