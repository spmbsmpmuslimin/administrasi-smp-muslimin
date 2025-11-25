// src/attendance-teacher/reports/MonthlyView.js
import React, { useState, useEffect } from "react";
import {
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import ExportExcel from "./ExportExcel";

const MonthlyView = ({ currentUser }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [attendances, setAttendances] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showExport, setShowExport] = useState(false);

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
    fetchMonthlyData();
  }, [selectedMonth, selectedYear]);

  const fetchMonthlyData = async () => {
    setLoading(true);
    try {
      // Get date range for selected month
      const startDate = new Date(selectedYear, selectedMonth, 1)
        .toISOString()
        .split("T")[0];
      const endDate = new Date(selectedYear, selectedMonth + 1, 0)
        .toISOString()
        .split("T")[0];

      // Fetch all active teachers
      const { data: teachersData, error: teachersError } = await supabase
        .from("users")
        .select("id, full_name, role")
        .in("role", ["teacher", "guru_bk", "homeroom_teacher"])
        .eq("is_active", true)
        .order("full_name");

      if (teachersError) throw teachersError;

      // Fetch attendances for the month
      const { data: attendancesData, error: attendancesError } = await supabase
        .from("teacher_attendance")
        .select("*")
        .gte("attendance_date", startDate)
        .lte("attendance_date", endDate);

      if (attendancesError) throw attendancesError;

      setTeachers(teachersData || []);
      setAttendances(attendancesData || []);
    } catch (error) {
      console.error("Error fetching monthly data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  };

  const getAttendanceForDay = (teacherId, day) => {
    const dateStr = new Date(selectedYear, selectedMonth, day)
      .toISOString()
      .split("T")[0];
    return attendances.find(
      (att) => att.teacher_id === teacherId && att.attendance_date === dateStr
    );
  };

  const getStatusBadge = (status) => {
    const badges = {
      hadir: { bg: "bg-green-500", text: "H", title: "Hadir" },
      izin: { bg: "bg-blue-500", text: "I", title: "Izin" },
      sakit: { bg: "bg-yellow-500", text: "S", title: "Sakit" },
      alpha: { bg: "bg-red-500", text: "A", title: "Alpha" },
    };
    return (
      badges[status] || {
        bg: "bg-gray-300",
        text: "-",
        title: "Tidak ada data",
      }
    );
  };

  const calculateTeacherStats = (teacherId) => {
    const teacherAttendances = attendances.filter(
      (att) => att.teacher_id === teacherId
    );
    return {
      hadir: teacherAttendances.filter((a) => a.status === "hadir").length,
      izin: teacherAttendances.filter((a) => a.status === "izin").length,
      sakit: teacherAttendances.filter((a) => a.status === "sakit").length,
      alpha: teacherAttendances.filter((a) => a.status === "alpha").length,
      total: teacherAttendances.length,
    };
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

  const filteredTeachers = teachers.filter((teacher) =>
    teacher.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const daysInMonth = getDaysInMonth();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="text-blue-600" size={24} />
          <h2 className="text-xl font-bold text-gray-800">Laporan Bulanan</h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Month Navigation */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-white rounded transition-all">
              <ChevronLeft size={20} />
            </button>
            <span className="px-4 font-semibold text-gray-800 min-w-[180px] text-center">
              {months[selectedMonth]} {selectedYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-white rounded transition-all">
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Export Button */}
          <button
            onClick={() => setShowExport(true)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all flex items-center gap-2">
            <Download size={20} />
            Export Excel
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Cari nama guru..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Memuat data...</p>
        </div>
      ) : (
        /* Table */
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700 sticky left-0 bg-gray-100 z-10 min-w-[200px]">
                  Nama Guru
                </th>
                {days.map((day) => (
                  <th
                    key={day}
                    className="border border-gray-300 px-2 py-3 text-center font-semibold text-gray-700 min-w-[40px]">
                    {day}
                  </th>
                ))}
                <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700 min-w-[80px]">
                  H/I/S/A
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td
                    colSpan={daysInMonth + 2}
                    className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                    Tidak ada data guru
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher) => {
                  const stats = calculateTeacherStats(teacher.id);
                  return (
                    <tr key={teacher.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 font-medium text-gray-800 sticky left-0 bg-white z-10">
                        {teacher.full_name}
                      </td>
                      {days.map((day) => {
                        const attendance = getAttendanceForDay(teacher.id, day);
                        const badge = attendance
                          ? getStatusBadge(attendance.status)
                          : {
                              bg: "bg-gray-200",
                              text: "-",
                              title: "Belum absen",
                            };

                        return (
                          <td
                            key={day}
                            className="border border-gray-300 px-2 py-3 text-center">
                            <span
                              className={`${badge.bg} text-white font-bold text-xs px-2 py-1 rounded inline-block min-w-[24px]`}
                              title={badge.title}>
                              {badge.text}
                            </span>
                          </td>
                        );
                      })}
                      <td className="border border-gray-300 px-4 py-3 text-center font-semibold text-sm">
                        <span className="text-green-600">{stats.hadir}</span>/
                        <span className="text-blue-600">{stats.izin}</span>/
                        <span className="text-yellow-600">{stats.sakit}</span>/
                        <span className="text-red-600">{stats.alpha}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="bg-green-500 text-white font-bold text-xs px-2 py-1 rounded">
            H
          </span>
          <span className="text-gray-600">Hadir</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-blue-500 text-white font-bold text-xs px-2 py-1 rounded">
            I
          </span>
          <span className="text-gray-600">Izin</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-yellow-500 text-white font-bold text-xs px-2 py-1 rounded">
            S
          </span>
          <span className="text-gray-600">Sakit</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-red-500 text-white font-bold text-xs px-2 py-1 rounded">
            A
          </span>
          <span className="text-gray-600">Alpha</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-gray-200 text-gray-600 font-bold text-xs px-2 py-1 rounded">
            -
          </span>
          <span className="text-gray-600">Belum Absen</span>
        </div>
      </div>

      {/* Export Modal */}
      {showExport && (
        <ExportExcel
          attendances={attendances}
          teachers={teachers}
          month={selectedMonth}
          year={selectedYear}
          monthName={months[selectedMonth]}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
};

export default MonthlyView;
