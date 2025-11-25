// src/attendance-teacher/MyMonthlyHistory.js
import React, { useState, useEffect } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  List,
  Grid3x3,
  Clock,
} from "lucide-react";
import { supabase } from "../supabaseClient";

const MyMonthlyHistory = ({ currentUser }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("list"); // list | calendar

  const months = [
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

  useEffect(() => {
    if (currentUser?.teacher_id) {
      fetchMyMonthlyData();
    }
  }, [selectedMonth, selectedYear, currentUser]);

  const fetchMyMonthlyData = async () => {
    setLoading(true);
    try {
      const startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(
        2,
        "0"
      )}-01`;
      const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      const endDate = `${selectedYear}-${String(selectedMonth + 1).padStart(
        2,
        "0"
      )}-${lastDay}`;

      const { data, error } = await supabase
        .from("teacher_attendance")
        .select("*")
        .eq("teacher_id", currentUser.teacher_id)
        .gte("attendance_date", startDate)
        .lte("attendance_date", endDate)
        .order("attendance_date", { ascending: false });

      if (error) throw error;

      setAttendances(data || []);
    } catch (error) {
      console.error("Error fetching my monthly data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  };

  const getFirstDayOfMonth = () => {
    return new Date(selectedYear, selectedMonth, 1).getDay();
  };

  const getAttendanceForDate = (day) => {
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}`;
    return attendances.find((att) => att.attendance_date === dateStr);
  };

  const calculateStats = () => {
    return {
      hadir: attendances.filter((a) => a.status === "Hadir").length,
      izin: attendances.filter((a) => a.status === "Izin").length,
      sakit: attendances.filter((a) => a.status === "Sakit").length,
      alpa: attendances.filter((a) => a.status === "Alpa").length,
      total: attendances.length,
    };
  };

  const getStatusColor = (status) => {
    const colors = {
      Hadir: "bg-green-500 text-white",
      Izin: "bg-blue-500 text-white",
      Sakit: "bg-yellow-500 text-white",
      Alpa: "bg-red-500 text-white",
    };
    return colors[status] || "bg-gray-200 text-gray-600";
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Hadir":
        return <CheckCircle size={16} />;
      case "Izin":
        return <AlertCircle size={16} />;
      case "Sakit":
        return <AlertCircle size={16} />;
      case "Alpa":
        return <XCircle size={16} />;
      default:
        return null;
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return "-";
    if (
      typeof timeString === "string" &&
      timeString.match(/^\d{2}:\d{2}:\d{2}$/)
    ) {
      return timeString.substring(0, 5);
    }
    return timeString;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const stats = calculateStats();
  const daysInMonth = getDaysInMonth();
  const firstDay = getFirstDayOfMonth();
  const attendanceRate =
    daysInMonth > 0 ? ((stats.hadir / daysInMonth) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-4">
      {/* Header & Stats */}
      <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="text-blue-600" size={24} />
            <h2 className="text-xl font-bold text-gray-800">Riwayat Saya</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-gray-100 rounded transition-all">
              <ChevronLeft size={20} />
            </button>
            <span className="px-3 py-1 font-semibold text-gray-800 text-sm sm:text-base">
              {months[selectedMonth]} {selectedYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-gray-100 rounded transition-all">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Stats Summary - Compact */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="text-green-600" size={16} />
              <p className="text-xs text-green-700 font-medium">Hadir</p>
            </div>
            <p className="text-xl font-bold text-green-600">{stats.hadir}</p>
          </div>

          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="text-blue-600" size={16} />
              <p className="text-xs text-blue-700 font-medium">Izin</p>
            </div>
            <p className="text-xl font-bold text-blue-600">{stats.izin}</p>
          </div>

          <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="text-yellow-600" size={16} />
              <p className="text-xs text-yellow-700 font-medium">Sakit</p>
            </div>
            <p className="text-xl font-bold text-yellow-600">{stats.sakit}</p>
          </div>

          <div className="bg-red-50 rounded-lg p-3 border border-red-200">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="text-red-600" size={16} />
              <p className="text-xs text-red-700 font-medium">Alpha</p>
            </div>
            <p className="text-xl font-bold text-red-600">{stats.alpa}</p>
          </div>

          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="text-blue-600" size={16} />
              <p className="text-xs text-blue-700 font-medium">Rate</p>
            </div>
            <p className="text-xl font-bold text-blue-600">{attendanceRate}%</p>
          </div>
        </div>
      </div>

      {/* View Switcher */}
      <div className="flex gap-2 px-1">
        <button
          onClick={() => setViewMode("list")}
          className={`flex-1 sm:flex-none sm:px-6 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-sm ${
            viewMode === "list"
              ? "bg-blue-600 text-white shadow-lg"
              : "bg-white text-gray-600 hover:bg-gray-50"
          }`}>
          <List size={18} />
          <span className="hidden sm:inline">List</span>
        </button>
        <button
          onClick={() => setViewMode("calendar")}
          className={`flex-1 sm:flex-none sm:px-6 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-sm ${
            viewMode === "calendar"
              ? "bg-blue-600 text-white shadow-lg"
              : "bg-white text-gray-600 hover:bg-gray-50"
          }`}>
          <Grid3x3 size={18} />
          <span className="hidden sm:inline">Calendar</span>
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Memuat data...</p>
          </div>
        ) : viewMode === "list" ? (
          /* List View - Mobile Friendly */
          <div className="space-y-2">
            {attendances.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Belum ada data presensi bulan ini
              </div>
            ) : (
              attendances.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 text-sm sm:text-base">
                      {formatDate(att.attendance_date)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock size={14} className="text-gray-500" />
                      <p className="text-xs text-gray-600">
                        {formatTime(att.clock_in)}
                      </p>
                      <span className="text-xs text-gray-400">•</span>
                      <p className="text-xs text-gray-600 capitalize">
                        {att.check_in_method}
                      </p>
                    </div>
                    {att.notes && (
                      <p className="text-xs text-gray-500 italic mt-1">
                        {att.notes}
                      </p>
                    )}
                  </div>
                  <div
                    className={`px-3 py-2 rounded-lg font-bold flex items-center gap-2 ${getStatusColor(
                      att.status
                    )}`}>
                    {getStatusIcon(att.status)}
                    <span className="text-sm">{att.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Calendar View - Ultra Compact Date Picker Style */
          <>
            <div className="max-w-sm mx-auto">
              <div className="grid grid-cols-7 gap-1">
                {/* Day Headers */}
                {["M", "S", "S", "R", "K", "J", "S"].map((day, idx) => (
                  <div
                    key={idx}
                    className="text-center font-bold text-gray-500 text-xs py-1">
                    {day}
                  </div>
                ))}

                {/* Empty cells */}
                {Array.from({ length: firstDay }).map((_, index) => (
                  <div key={`empty-${index}`}></div>
                ))}

                {/* Date cells */}
                {Array.from({ length: daysInMonth }).map((_, index) => {
                  const day = index + 1;
                  const attendance = getAttendanceForDate(day);
                  const now = new Date();
                  const isToday =
                    day === now.getDate() &&
                    selectedMonth === now.getMonth() &&
                    selectedYear === now.getFullYear();

                  return (
                    <div
                      key={day}
                      className={`relative aspect-square rounded flex items-center justify-center ${
                        attendance
                          ? getStatusColor(attendance.status)
                          : isToday
                          ? "bg-blue-100 border border-blue-300"
                          : "bg-gray-50"
                      }`}
                      title={
                        attendance
                          ? `${attendance.status} - ${formatTime(
                              attendance.clock_in
                            )}`
                          : isToday
                          ? "Hari ini"
                          : ""
                      }>
                      <span
                        className={`text-xs font-semibold ${
                          attendance
                            ? "text-white"
                            : isToday
                            ? "text-blue-600"
                            : "text-gray-700"
                        }`}>
                        {day}
                      </span>
                      {attendance && (
                        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white rounded-full border border-current"></div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend - Mini */}
              <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-4 gap-2 text-xs">
                <div className="flex flex-col items-center gap-1">
                  <div className="bg-green-500 w-6 h-6 rounded flex items-center justify-center">
                    <CheckCircle size={12} className="text-white" />
                  </div>
                  <span className="text-gray-600 text-[10px]">Hadir</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="bg-blue-500 w-6 h-6 rounded flex items-center justify-center">
                    <AlertCircle size={12} className="text-white" />
                  </div>
                  <span className="text-gray-600 text-[10px]">Izin</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="bg-yellow-500 w-6 h-6 rounded flex items-center justify-center">
                    <AlertCircle size={12} className="text-white" />
                  </div>
                  <span className="text-gray-600 text-[10px]">Sakit</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="bg-red-500 w-6 h-6 rounded flex items-center justify-center">
                    <XCircle size={12} className="text-white" />
                  </div>
                  <span className="text-gray-600 text-[10px]">Alpha</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MyMonthlyHistory;
