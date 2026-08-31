// students/studentHelpers.js
// ========================================================================
// Helper bareng buat semua halaman portal siswa (Dashboard, Jadwal,
// Presensi, dll) — biar gak copy-paste logic yang sama di tiap file.
// ========================================================================
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

export const DAY_NAMES = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

export const getDayName = (date = new Date()) => DAY_NAMES[date.getDay()];

export const formatDate = (date = new Date()) =>
  date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export const formatDateShort = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const getStatusMeta = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "hadir")
    return {
      label: "Hadir",
      color: "bg-green-100 dark:bg-green-900/30 text-green-700 border-green-300",
      icon: CheckCircle,
    };
  if (s === "sakit")
    return {
      label: "Sakit",
      color: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 border-yellow-300",
      icon: AlertCircle,
    };
  if (s === "izin")
    return {
      label: "Izin",
      color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 border-blue-300",
      icon: AlertCircle,
    };
  if (s === "alpa")
    return {
      label: "Alpa",
      color: "bg-red-100 dark:bg-red-900/30 text-red-700 border-red-300",
      icon: XCircle,
    };
  return {
    label: "Belum Ada Data Presensi",
    color: "bg-gray-100 dark:bg-gray-900/30 text-gray-600 border-gray-300",
    icon: AlertCircle,
  };
};

// Cek apakah jam pelajaran ini lagi berlangsung sekarang
export const isOngoing = (startTime, endTime) => {
  if (!startTime || !endTime) return false;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;
  return nowMinutes >= startMinutes && nowMinutes < endMinutes;
};
