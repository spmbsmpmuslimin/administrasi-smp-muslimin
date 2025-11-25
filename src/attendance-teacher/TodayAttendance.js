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
  const [filter, setFilter] = useState("all"); // all, hadir, izin, sakit, alpha

  useEffect(() => {
    fetchTodayAttendances();
  }, [refreshTrigger]);

  const fetchTodayAttendances = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("teacher_attendance")
        .select(
          `
          *,
          users:teacher_id (
            id,
            full_name,
            role
          )
        `
        )
        .eq("attendance_date", today)
        .order("clock_in", { ascending: false, nullsFirst: false });

      if (error) throw error;
      setAttendances(data || []);
    } catch (error) {
      console.error("Error fetching today attendances:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      hadir: {
        bg: "bg-green-100",
        text: "text-green-800",
        icon: CheckCircle,
        label: "Hadir",
      },
      izin: {
        bg: "bg-blue-100",
        text: "text-blue-800",
        icon: AlertCircle,
        label: "Izin",
      },
      sakit: {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        icon: AlertCircle,
        label: "Sakit",
      },
      alpha: {
        bg: "bg-red-100",
        text: "text-red-800",
        icon: XCircle,
        label: "Alpha",
      },
    };

    const badge = badges[status] || badges.alpha;
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
    return method === "qr" ? (
      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium">
        QR Code
      </span>
    ) : (
      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">
        Manual
      </span>
    );
  };

  const filteredAttendances = attendances.filter((att) => {
    if (filter === "all") return true;
    return att.status === filter;
  });

  const stats = {
    total: attendances.length,
    hadir: attendances.filter((a) => a.status === "hadir").length,
    izin: attendances.filter((a) => a.status === "izin").length,
    sakit: attendances.filter((a) => a.status === "sakit").length,
    alpha: attendances.filter((a) => a.status === "alpha").length,
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

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
            filter === "all"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}>
          Semua ({stats.total})
        </button>
        <button
          onClick={() => setFilter("hadir")}
          className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
            filter === "hadir"
              ? "bg-green-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}>
          Hadir ({stats.hadir})
        </button>
        <button
          onClick={() => setFilter("izin")}
          className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
            filter === "izin"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}>
          Izin ({stats.izin})
        </button>
        <button
          onClick={() => setFilter("sakit")}
          className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
            filter === "sakit"
              ? "bg-yellow-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}>
          Sakit ({stats.sakit})
        </button>
        <button
          onClick={() => setFilter("alpha")}
          className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
            filter === "alpha"
              ? "bg-red-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}>
          Alpha ({stats.alpha})
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
                    {attendance.users?.full_name || "N/A"}
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusBadge(attendance.status)}
                    {getMethodBadge(attendance.check_in_method)}
                  </div>
                  {attendance.clock_in && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Clock size={14} />
                      <span>
                        {new Date(attendance.clock_in).toLocaleTimeString(
                          "id-ID",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
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
