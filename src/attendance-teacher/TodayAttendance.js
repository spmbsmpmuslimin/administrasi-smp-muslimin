// src/attendance-teacher/TodayAttendance.js
import React, { useState, useEffect } from "react";
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { supabase } from "../supabaseClient";

const TodayAttendance = ({ refreshTrigger }) => {
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, Hadir, Izin, Sakit, Alpa

  useEffect(() => {
    fetchTodayAttendances();
  }, [refreshTrigger]);

  const fetchTodayAttendances = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];

      // Fetch attendances
      const { data: attendancesData, error: attendancesError } = await supabase
        .from("teacher_attendance")
        .select("*")
        .eq("attendance_date", today)
        .order("clock_in", { ascending: false });

      if (attendancesError) throw attendancesError;

      // Fetch teachers data
      const teacherIds = attendancesData.map((a) => a.teacher_id);
      const { data: teachersData, error: teachersError } = await supabase
        .from("users")
        .select("teacher_id, full_name, role")
        .in("teacher_id", teacherIds);

      if (teachersError) throw teachersError;

      // Merge data
      const mergedData = attendancesData.map((attendance) => {
        const teacher = teachersData.find(
          (t) => t.teacher_id === attendance.teacher_id
        );
        return {
          ...attendance,
          teacher_name: teacher?.full_name || "Unknown",
          teacher_role: teacher?.role || "N/A",
        };
      });

      setAttendances(mergedData);
    } catch (error) {
      console.error("Error fetching today attendances:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      Hadir: {
        bg: "bg-green-100",
        text: "text-green-800",
        icon: CheckCircle,
        label: "Hadir",
      },
      Izin: {
        bg: "bg-blue-100",
        text: "text-blue-800",
        icon: AlertCircle,
        label: "Izin",
      },
      Sakit: {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        icon: AlertCircle,
        label: "Sakit",
      },
      Alpa: {
        bg: "bg-red-100",
        text: "text-red-800",
        icon: XCircle,
        label: "Alpha",
      },
    };

    const badge = badges[status] || badges.Alpa;
    const Icon = badge.icon;

    return (
      <span
        className={`${badge.bg} ${badge.text} px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit`}>
        <Icon size={14} />
        {badge.label}
      </span>
    );
  };

  const getMethodBadge = (method) => {
    const badges = {
      qr: { bg: "bg-purple-100", text: "text-purple-800", label: "QR Code" },
      qr_link: {
        bg: "bg-indigo-100",
        text: "text-indigo-800",
        label: "QR Link",
      },
      manual: { bg: "bg-gray-100", text: "text-gray-800", label: "Manual" },
    };

    const badge = badges[method] || badges.manual;

    return (
      <span
        className={`${badge.bg} ${badge.text} px-2 py-1 rounded text-xs font-medium`}>
        {badge.label}
      </span>
    );
  };

  const filteredAttendances = attendances.filter((att) => {
    if (filter === "all") return true;
    return att.status === filter;
  });

  const stats = {
    total: attendances.length,
    Hadir: attendances.filter((a) => a.status === "Hadir").length,
    Izin: attendances.filter((a) => a.status === "Izin").length,
    Sakit: attendances.filter((a) => a.status === "Sakit").length,
    Alpa: attendances.filter((a) => a.status === "Alpa").length,
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="text-blue-600" size={24} />
          <h2 className="text-xl font-bold text-gray-800">Presensi Hari Ini</h2>
        </div>
        <button
          onClick={fetchTodayAttendances}
          className="p-2 hover:bg-gray-100 rounded-lg transition-all"
          title="Refresh">
          <RefreshCw size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
          <p className="text-xs text-gray-600">Total</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.Hadir}</p>
          <p className="text-xs text-green-700">Hadir</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.Izin}</p>
          <p className="text-xs text-blue-700">Izin</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-yellow-600">{stats.Sakit}</p>
          <p className="text-xs text-yellow-700">Sakit</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.Alpa}</p>
          <p className="text-xs text-red-700">Alpha</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
            filter === "all"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}>
          Semua
        </button>
        <button
          onClick={() => setFilter("Hadir")}
          className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
            filter === "Hadir"
              ? "bg-green-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}>
          Hadir
        </button>
        <button
          onClick={() => setFilter("Izin")}
          className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
            filter === "Izin"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}>
          Izin
        </button>
        <button
          onClick={() => setFilter("Sakit")}
          className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
            filter === "Sakit"
              ? "bg-yellow-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}>
          Sakit
        </button>
        <button
          onClick={() => setFilter("Alpa")}
          className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
            filter === "Alpa"
              ? "bg-red-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}>
          Alpha
        </button>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Memuat data...</p>
        </div>
      ) : filteredAttendances.length === 0 ? (
        <div className="text-center py-8">
          <Users size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            {filter === "all"
              ? "Belum ada presensi hari ini"
              : `Tidak ada guru dengan status ${filter}`}
          </p>
        </div>
      ) : (
        /* List Attendances */
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {filteredAttendances.map((attendance) => (
            <div
              key={attendance.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 mb-1">
                    {attendance.teacher_name}
                  </h3>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {getStatusBadge(attendance.status)}
                    {getMethodBadge(attendance.check_in_method)}
                  </div>
                  {attendance.clock_in && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Clock size={14} />
                      <span>
                        {attendance.clock_in.slice(0, 5)}
                        {/* Format HH:MM dari HH:MM:SS */}
                      </span>
                    </div>
                  )}
                  {attendance.notes && (
                    <p className="text-sm text-gray-600 mt-2 italic">
                      "{attendance.notes}"
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TodayAttendance;
