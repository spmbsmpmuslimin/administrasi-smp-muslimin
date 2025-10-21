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
} from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// ✅ FIXED: Mapping Jam Ke ke Waktu per Hari
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

  const [formData, setFormData] = useState({
    day: "Senin",
    start_period: "1",
    end_period: "1",
    class_id: "",
  });

  const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];

  useEffect(() => {
    if (user && user.id) {
      fetchSchedules();
      fetchClasses();
    }
  }, [user]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("teacher_schedules")
        .select("*")
        .eq("teacher_id", user.id)
        .order("day")
        .order("start_time");

      if (error) throw error;
      setSchedules(data || []);
    } catch (err) {
      setError("Gagal memuat jadwal: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from("classes")
        .select("id")
        .eq("is_active", true)
        .order("id");
      if (error) throw error;
      setClasses(data || []);
    } catch (err) {
      console.error("Error fetching classes:", err);
    }
  };

  // ✅ FITUR BARU: EXPORT TO EXCEL DENGAN TAMPILAN GRID YANG BENER
  const exportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Jadwal Mengajar");

      // Title - Sesuai format yang diminta
      worksheet.mergeCells("A1:G1");
      const titleCell1 = worksheet.getCell("A1");
      titleCell1.value = "SMP MUSLIMIN CILILIN";
      titleCell1.font = { bold: true, size: 16 };
      titleCell1.alignment = { horizontal: "center", vertical: "middle" };

      worksheet.mergeCells("A2:G2");
      const titleCell2 = worksheet.getCell("A2");
      titleCell2.value = `JADWAL MENGAJAR (${user?.full_name})`;
      titleCell2.font = { bold: true, size: 14 };
      titleCell2.alignment = { horizontal: "center", vertical: "middle" };

      worksheet.mergeCells("A3:G3");
      const titleCell3 = worksheet.getCell("A3");
      titleCell3.value = "TAHUN AJARAN 2025/2026 SEMESTER GANJIL";
      titleCell3.font = { bold: true, size: 12 };
      titleCell3.alignment = { horizontal: "center", vertical: "middle" };

      // Kosong 2 baris
      worksheet.addRow([]);
      worksheet.addRow([]);

      // Header tabel (Grid Style)
      const headers = [
        "JAM KE",
        "WAKTU",
        "SENIN",
        "SELASA",
        "RABU",
        "KAMIS",
        "JUMAT",
      ];
      const headerRow = worksheet.addRow(headers);

      // Styling header row
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF3b82f6" },
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      // Generate schedule grid untuk export
      const scheduleGrid = generateScheduleGrid();

      // Data rows dalam format grid
      Object.entries(JAM_SCHEDULE.Selasa || {}).forEach(([period, time]) => {
        const rowData = [period, `${time.start} - ${time.end}`];

        // Isi data untuk setiap hari
        days.forEach((day) => {
          if (scheduleGrid[day] && scheduleGrid[day][period]) {
            rowData.push(`Kelas ${scheduleGrid[day][period].class_id}`);
          } else if (day === "Senin" && period === "1") {
            rowData.push("UPACARA");
          } else {
            rowData.push("");
          }
        });

        const row = worksheet.addRow(rowData);

        // Styling untuk UPACARA
        if (row.getCell(3).value === "UPACARA") {
          row.getCell(3).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFFF00" },
          };
        }

        // Styling untuk semua sel
        row.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
          cell.alignment = {
            horizontal: "center",
            vertical: "middle",
          };

          // Warna background untuk baris ganjil
          if (row.number % 2 === 0) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF3F4F6" },
            };
          }
        });
      });

      // Auto column width
      worksheet.columns.forEach((column) => {
        column.width = 15;
      });

      // Set height untuk row
      worksheet.eachRow((row) => {
        row.height = 25;
      });

      // Save file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(
        blob,
        `Jadwal_Mengajar_${user?.full_name}_${
          new Date().toISOString().split("T")[0]
        }.xlsx`
      );

      setSuccess("Jadwal berhasil diexport ke Excel!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError("Gagal export ke Excel: " + err.message);
    }
  };

  // ✅ GENERATE SCHEDULE GRID
  const generateScheduleGrid = () => {
    const grid = {};

    days.forEach((day) => {
      grid[day] = {};

      // Initialize semua period dengan null
      const daySchedule = JAM_SCHEDULE[day];
      if (daySchedule) {
        Object.keys(daySchedule).forEach((period) => {
          grid[day][period] = null;
        });
      }

      // Isi dengan data jadwal - handle multi-period
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

  // ✅ CARI PERIOD DARI WAKTU
  const findPeriodsByTimeRange = (day, startTime, endTime) => {
    const daySchedule = JAM_SCHEDULE[day];
    if (!daySchedule) return [];

    const periods = [];
    const targetStart = timeToMinutes(startTime);
    const targetEnd = timeToMinutes(endTime);

    for (const [period, timeRange] of Object.entries(daySchedule)) {
      const periodStart = timeToMinutes(timeRange.start);
      const periodEnd = timeToMinutes(timeRange.end);

      // Check if this period falls within the target range
      if (periodStart >= targetStart && periodEnd <= targetEnd) {
        periods.push(period);
      }
    }

    return periods;
  };

  // Helper: Convert time string to minutes
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

      const scheduleData = {
        day: formData.day,
        start_time: startTime,
        end_time: endTime,
        class_id: formData.class_id,
        teacher_id: user.id,
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

  const getAvailablePeriods = () => {
    return Object.keys(JAM_SCHEDULE[formData.day] || {});
  };

  const scheduleGrid = generateScheduleGrid();

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-7 h-7 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  JADWAL MENGAJAR
                </h1>
                <p className="text-slate-600 font-semibold">
                  {user?.full_name || "Loading..."} - TAHUN AJARAN 2025/2026
                  SEMESTER GANJIL
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              {/* Toggle View */}
              <button
                onClick={() =>
                  setViewMode(viewMode === "grid" ? "list" : "grid")
                }
                className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium">
                {viewMode === "grid" ? "Tampilan List" : "Tampilan Grid"}
              </button>

              {/* Tambah Jadwal */}
              <button
                onClick={() => handleOpenModal()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Tambah Jadwal
              </button>

              {/* Export Excel */}
              <button
                onClick={exportToExcel}
                disabled={schedules.length === 0}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                <Download className="w-5 h-5" />
                Export Jadwal
              </button>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>{success}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Today's Schedule - COMPACT VERSION */}
        {getTodaySchedules().length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border-2 border-indigo-200 p-4 mb-8">
            <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Jadwal Hari Ini ({days[new Date().getDay() - 1] || "Senin"})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {getTodaySchedules().map((schedule, idx) => (
                <div
                  key={idx}
                  className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-indigo-600 mb-1">
                        {schedule.start_time} - {schedule.end_time}
                      </p>
                      <p className="font-semibold text-slate-800 text-base">
                        Kelas {schedule.class_id}
                      </p>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => handleOpenModal(schedule)}
                        className="text-blue-600 hover:text-blue-700 p-1"
                        title="Edit">
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(schedule.id)}
                        className="text-red-600 hover:text-red-700 p-1"
                        title="Hapus">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Schedule View */}
        {viewMode === "grid" ? (
          // GRID VIEW
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">
                Jadwal Mengajar Mingguan (Tampilan Grid)
              </h2>
            </div>

            {loading && schedules.length === 0 ? (
              <div className="p-8 text-center text-slate-600">
                Memuat jadwal...
              </div>
            ) : schedules.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                <p className="mb-2">Belum ada jadwal</p>
                <p className="text-sm">Klik "Tambah Jadwal" untuk memulai</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-blue-800 text-white">
                      <th className="p-4 border border-slate-600 text-center font-semibold">
                        JAM KE
                      </th>
                      <th className="p-4 border border-slate-600 text-center font-semibold">
                        WAKTU*
                      </th>
                      {days.map((day) => (
                        <th
                          key={day}
                          className="p-4 border border-slate-600 text-center font-semibold">
                          {day.toUpperCase()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(JAM_SCHEDULE.Selasa || {}).map(
                      ([period, time]) => (
                        <React.Fragment key={period}>
                          <tr className="hover:bg-slate-50">
                            <td className="p-3 border border-slate-300 text-center font-semibold bg-slate-100">
                              {period}
                            </td>
                            <td
                              className={`p-3 border border-slate-300 text-center text-sm ${
                                period === "1"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-slate-100"
                              }`}>
                              {time.start} - {time.end}
                              {period === "1" && (
                                <div className="text-xs mt-1 text-yellow-600">
                                  Senin: 07:00-08:00
                                </div>
                              )}
                            </td>
                            {days.map((day) => (
                              <td
                                key={day}
                                className="p-3 border border-slate-300 text-center">
                                {day === "Jumat" ? (
                                  <div className="flex flex-col items-center">
                                    {scheduleGrid[day] &&
                                    scheduleGrid[day][period] ? (
                                      <>
                                        <span className="font-bold text-slate-800 text-lg">
                                          {scheduleGrid[day][period].class_id}
                                        </span>
                                        <div className="text-xs mt-1 text-blue-600 font-medium">
                                          {JAM_SCHEDULE.Jumat[period]?.start}-
                                          {JAM_SCHEDULE.Jumat[period]?.end}
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <span className="text-slate-400 text-lg">
                                          -
                                        </span>
                                        <div className="text-xs mt-1 text-blue-600 font-medium">
                                          {JAM_SCHEDULE.Jumat[period]?.start}-
                                          {JAM_SCHEDULE.Jumat[period]?.end}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ) : scheduleGrid[day] &&
                                  scheduleGrid[day][period] ? (
                                  <span className="font-bold text-slate-800 text-lg">
                                    {scheduleGrid[day][period].class_id}
                                  </span>
                                ) : day === "Senin" && period === "1" ? (
                                  <span className="font-bold text-slate-800 text-lg">
                                    UPACARA
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-lg">
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
                                className="p-3 bg-orange-50 border border-orange-200 text-center text-orange-800 font-semibold">
                                🕛 ISTIRAHAT {time.end} - 10:10 (30 menit)
                              </td>
                            </tr>
                          )}

                          {/* ISTIRAHAT SIANG SETELAH JP 7 (HANYA SENIN-KAMIS) */}
                          {period === "7" && (
                            <tr>
                              <td
                                colSpan={7}
                                className="p-3 bg-orange-50 border border-orange-200 text-center text-orange-800 font-semibold">
                                🕛 ISTIRAHAT 12:10 - 13:00 (45 menit)
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    )}
                  </tbody>
                </table>
                <div className="p-4 bg-slate-50 border-t border-slate-200">
                  <p className="text-sm md:text-base text-slate-600 text-center font-bold italic">
                    *Waktu Mengikuti Jadwal Masing-Masing Hari. Senin & Jumat
                    Memiliki Waktu Khusus.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          // LIST VIEW
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">
                Jadwal Mengajar Mingguan (Tampilan List)
              </h2>
            </div>

            {loading && schedules.length === 0 ? (
              <div className="p-8 text-center text-slate-600">
                Memuat jadwal...
              </div>
            ) : schedules.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                <p className="mb-2">Belum ada jadwal</p>
                <p className="text-sm">Klik "Tambah Jadwal" untuk memulai</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-blue-800 text-white">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold">
                        Hari
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">
                        Jam Ke
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">
                        Waktu
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">
                        Kelas
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">
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
                            className="border-b border-slate-200 hover:bg-slate-50">
                            {idx === 0 && (
                              <td
                                className="px-6 py-4 font-semibold text-slate-800"
                                rowSpan={daySchedules.length}>
                                {day}
                              </td>
                            )}
                            <td className="px-6 py-4 text-slate-700 font-medium">
                              JP {jamKe}
                            </td>
                            <td className="px-6 py-4 text-slate-700">
                              {schedule.start_time} - {schedule.end_time}
                            </td>
                            <td className="px-6 py-4 font-semibold text-slate-800">
                              Kelas {schedule.class_id}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleOpenModal(schedule)}
                                  className="text-blue-600 hover:text-blue-700 flex items-center gap-1">
                                  <Edit className="w-4 h-4" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(schedule.id)}
                                  className="text-red-600 hover:text-red-700 flex items-center gap-1">
                                  <Trash2 className="w-4 h-4" />
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">
                {editingId ? "Edit Jadwal" : "Tambah Jadwal"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Hari
                </label>
                <select
                  name="day"
                  value={formData.day}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                  {days.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Dari Jam Ke
                  </label>
                  <select
                    name="start_period"
                    value={formData.start_period}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                    {getAvailablePeriods().map((jam) => (
                      <option key={jam} value={jam}>
                        Jam {jam}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Sampai Jam Ke
                  </label>
                  <select
                    name="end_period"
                    value={formData.end_period}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg">
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
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Kelas
                </label>
                <select
                  name="class_id"
                  value={formData.class_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                  <option value="">Pilih Kelas</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      Kelas {cls.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg">
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">
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