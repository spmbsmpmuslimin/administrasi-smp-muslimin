// src/attendance-teacher/reports/DailySummary.js
import React, { useState, useEffect } from "react";
import {
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
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
    } catch (error) {
      console.error("Error fetching daily summary:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
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
  );
};

export default DailySummary;
