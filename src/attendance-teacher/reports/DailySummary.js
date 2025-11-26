// src/attendance-teacher/reports/DailySummary.js
import React, { useState, useEffect } from "react";
import {
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Clock,
} from "lucide-react";
import { supabase } from "../../supabaseClient";

const DailySummary = ({ refreshTrigger }) => {
  const [stats, setStats] = useState({
    totalTeachers: 0,
    hadir: 0,
    izin: 0,
    sakit: 0,
    alpa: 0,
    belumAbsen: 0,
    attendanceRate: 0,
  });
  const [attendanceList, setAttendanceList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDailySummary();
  }, [refreshTrigger]);

  const fetchDailySummary = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];

      // Get total active teachers
      const { count: totalTeachers, error: teacherError } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .in("role", ["teacher", "guru_bk", "homeroom_teacher"])
        .eq("is_active", true);

      if (teacherError) throw teacherError;

      // Get today's attendances
      const { data: attendances, error: attendanceError } = await supabase
        .from("teacher_attendance")
        .select("status")
        .eq("attendance_date", today);

      if (attendanceError) throw attendanceError;

      // Calculate stats - CASE SENSITIVE!
      const hadir = attendances.filter((a) => a.status === "Hadir").length;
      const izin = attendances.filter((a) => a.status === "Izin").length;
      const sakit = attendances.filter((a) => a.status === "Sakit").length;
      const alpa = attendances.filter((a) => a.status === "Alpa").length;
      const belumAbsen = (totalTeachers || 0) - attendances.length;
      const attendanceRate =
        totalTeachers > 0 ? ((hadir / totalTeachers) * 100).toFixed(1) : 0;

      setStats({
        totalTeachers: totalTeachers || 0,
        hadir,
        izin,
        sakit,
        alpa,
        belumAbsen,
        attendanceRate,
      });

      // ========== TAMBAHAN: Fetch attendance list with teacher info ==========
      const { data: attendanceListData, error: listError } = await supabase
        .from("teacher_attendance")
        .select(
          `
          *,
          users:user_id (
            full_name
          )
        `
        )
        .eq("attendance_date", today)
        .order("check_in_time", { ascending: true });

      if (listError) throw listError;

      // Format attendance list
      const formattedList = attendanceListData.map((att, index) => ({
        no: index + 1,
        name: att.users?.full_name || "Unknown",
        time: att.check_in_time ? formatTime(att.check_in_time) : "-",
        status: att.status,
      }));

      setAttendanceList(formattedList);
      // ========== END TAMBAHAN ==========
    } catch (error) {
      console.error("Error fetching daily summary:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      Hadir: "bg-green-100 text-green-700 border-green-200",
      Izin: "bg-yellow-100 text-yellow-700 border-yellow-200",
      Sakit: "bg-orange-100 text-orange-700 border-orange-200",
      Alpa: "bg-red-100 text-red-700 border-red-200",
    };
    return badges[status] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    {
      title: "Total Guru",
      value: stats.totalTeachers,
      icon: Users,
      color: "bg-blue-500",
      textColor: "text-blue-600",
      bgLight: "bg-blue-50",
    },
    {
      title: "Hadir",
      value: stats.hadir,
      icon: CheckCircle,
      color: "bg-green-500",
      textColor: "text-green-600",
      bgLight: "bg-green-50",
      subtitle: `${stats.attendanceRate}% kehadiran`,
    },
    {
      title: "Izin / Sakit",
      value: `${stats.izin} / ${stats.sakit}`,
      icon: AlertCircle,
      color: "bg-yellow-500",
      textColor: "text-yellow-600",
      bgLight: "bg-yellow-50",
    },
    {
      title: "Alpha / Belum Absen",
      value: `${stats.alpa} / ${stats.belumAbsen}`,
      icon: XCircle,
      color: "bg-red-500",
      textColor: "text-red-600",
      bgLight: "bg-red-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards - LOGIC ASLI TETAP SAMA! */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-2">
                    {card.title}
                  </p>
                  <h3 className="text-3xl font-bold text-gray-800 mb-1">
                    {card.value}
                  </h3>
                  {card.subtitle && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <TrendingUp size={12} />
                      {card.subtitle}
                    </p>
                  )}
                </div>
                <div className={`${card.bgLight} p-3 rounded-lg`}>
                  <Icon className={card.textColor} size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========== TAMBAHAN BARU: Attendance List Table ========== */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Users size={20} />
            Daftar Guru yang Sudah Presensi Hari Ini
          </h3>
          <p className="text-blue-100 text-sm mt-1">
            Total: {attendanceList.length} guru
          </p>
        </div>

        {attendanceList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    No.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Nama Guru
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Clock size={14} />
                      Jam Presensi
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {attendanceList.map((item) => (
                  <tr
                    key={item.no}
                    className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.no}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-gray-400" />
                        {item.time}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusBadge(
                          item.status
                        )}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <Users size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">
              Belum ada guru yang presensi hari ini
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Data akan muncul setelah ada guru yang melakukan presensi
            </p>
          </div>
        )}
      </div>
      {/* ========== END TAMBAHAN ========== */}
    </div>
  );
};

export default DailySummary;
