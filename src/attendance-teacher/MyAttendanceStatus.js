// src/attendance-teacher/MyAttendanceStatus.js
import React, { useState, useEffect } from "react";
import { CheckCircle, Clock, AlertCircle, XCircle } from "lucide-react";
import { supabase } from "../supabaseClient";

// Helper function untuk format metode check-in
const formatCheckInMethod = (method) => {
  const methodMap = {
    qr_scan: "Scan QR",
    qr: "Scan QR",
    manual: "Manual",
    nfc: "NFC",
  };
  return methodMap[method] || method;
};

const MyAttendanceStatus = ({ currentUser, refreshTrigger }) => {
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.teacher_id) {
      fetchMyAttendance();
    }
  }, [currentUser, refreshTrigger]);

  const fetchMyAttendance = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const today = `${year}-${month}-${day}`;

      const { data, error } = await supabase
        .from("teacher_attendance")
        .select("*")
        .eq("teacher_id", currentUser.teacher_id)
        .eq("attendance_date", today)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      setTodayAttendance(data);
    } catch (error) {
      console.error("Error fetching my attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
      </div>
    );
  }

  const getStatusConfig = () => {
    if (!todayAttendance) {
      return {
        icon: Clock,
        color: "bg-gray-500",
        textColor: "text-gray-600 dark:text-gray-400",
        bgLight: "bg-gray-50 dark:bg-gray-700",
        borderColor: "border-gray-300 dark:border-gray-600",
        title: "Belum Absen",
        message: "Anda Belum Melakukan Presensi Hari Ini",
        detail: "Silakan Scan QR Code Atau Input Manual",
      };
    }

    const statusMap = {
      Hadir: {
        icon: CheckCircle,
        color: "bg-green-500",
        textColor: "text-green-600 dark:text-green-400",
        bgLight: "bg-green-50 dark:bg-green-900/20",
        borderColor: "border-green-300 dark:border-green-600",
        title: "Hadir",
        message: "Anda sudah absen hari ini",
      },
      Izin: {
        icon: AlertCircle,
        color: "bg-yellow-500",
        textColor: "text-yellow-600 dark:text-yellow-400",
        bgLight: "bg-yellow-50 dark:bg-yellow-900/20",
        borderColor: "border-yellow-300 dark:border-yellow-600",
        title: "Izin",
        message: "Status presensi: Izin",
      },
      Sakit: {
        icon: AlertCircle,
        color: "bg-orange-500",
        textColor: "text-orange-600 dark:text-orange-400",
        bgLight: "bg-orange-50 dark:bg-orange-900/20",
        borderColor: "border-orange-300 dark:border-orange-600",
        title: "Sakit",
        message: "Status presensi: Sakit",
      },
      Alpa: {
        icon: XCircle,
        color: "bg-red-500",
        textColor: "text-red-600 dark:text-red-400",
        bgLight: "bg-red-50 dark:bg-red-900/20",
        borderColor: "border-red-300 dark:border-red-600",
        title: "Alpha",
        message: "Status presensi: Alpha",
      },
    };

    return statusMap[todayAttendance.status] || statusMap.Hadir;
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const formatTime = (timeString) => {
    if (!timeString) return "-";

    try {
      if (
        typeof timeString === "string" &&
        timeString.match(/^\d{2}:\d{2}:\d{2}$/)
      ) {
        return timeString.substring(0, 5).replace(":", ".") + " WIB";
      }

      const date = new Date(timeString);
      if (!isNaN(date.getTime())) {
        const time = date.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        });
        return time.replace(":", ".") + " WIB";
      }

      return timeString;
    } catch (error) {
      console.error("Error formatting time:", error);
      return timeString || "-";
    }
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 ${config.borderColor}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
            Status Presensi Anda
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className={`${config.bgLight} p-3 rounded-lg`}>
          <Icon className={config.textColor} size={28} />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className={`text-2xl font-bold ${config.textColor}`}>
            {config.title}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {config.message}
          </p>
        </div>

        {todayAttendance ? (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                Jam Masuk
              </p>
              <p className="text-sm font-semibold text-gray-800 dark:text-white">
                {formatTime(todayAttendance.clock_in)}
              </p>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                Metode
              </p>
              <p className="text-sm font-semibold text-gray-800 dark:text-white">
                {formatCheckInMethod(todayAttendance.check_in_method) || "-"}
              </p>
            </div>
            {todayAttendance.notes && (
              <div className="col-span-2">
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Catatan
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                  {todayAttendance.notes}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {config.detail}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
export default MyAttendanceStatus;
