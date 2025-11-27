// attendance-teacher/LocationValidator.js
// Utility untuk validasi lokasi guru saat presensi manual

import { supabase } from "../supabaseClient"; // ADDED: Import supabase

// ========================================
// 🔧 KONFIGURASI - DISESUAIKAN DENGAN SEKOLAH 🔧
// ========================================

const SCHOOL_COORDS = {
  lat: -6.954375, // Koordinat sekolah
  lng: 107.416371,
};

const SCHOOL_RADIUS = 300; // 200 meter radius

// Debug mode - set true untuk lihat detail GPS di console
const DEBUG_MODE = true;

// ========================================
// ⏰ TIME WINDOW untuk Manual Input
// ========================================
// Manual input hanya bisa dilakukan dalam jam kerja (jam datang guru)
const MANUAL_INPUT_ALLOWED = {
  startHour: 7, // ← Ubah dari 6 jadi 7
  startMinute: 0, // ← Ubah dari 30 jadi 0
  endHour: 14, // ← Ubah dari 10 jadi 14
  endMinute: 0, // Tetap 0
};

/**
 * Hitung jarak antara 2 koordinat menggunakan Haversine formula
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

/**
 * Validasi lokasi guru untuk presensi manual
 * Returns: { allowed, distance, coords, error, message }
 */
export const validateAttendanceLocation = async () => {
  return new Promise((resolve) => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      resolve({
        allowed: false,
        error: "GEOLOCATION_NOT_SUPPORTED",
        message: "Browser Anda tidak mendukung GPS",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const distance = calculateDistance(
          position.coords.latitude,
          position.coords.longitude,
          SCHOOL_COORDS.lat,
          SCHOOL_COORDS.lng
        );

        const isWithinRadius = distance <= SCHOOL_RADIUS;

        const result = {
          allowed: isWithinRadius,
          distance: Math.round(distance),
          coords: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          accuracy: Math.round(position.coords.accuracy),
          timestamp: position.timestamp,
          message: isWithinRadius
            ? `Anda berada ${Math.round(distance)}m dari sekolah`
            : `Anda berada ${Math.round(
                distance
              )}m dari sekolah. Presensi manual hanya bisa dilakukan dalam radius ${SCHOOL_RADIUS}m`,
        };

        // Debug logging
        if (DEBUG_MODE) {
          console.log("🔍 GPS DEBUG INFO:");
          console.log("📍 Lokasi Anda:", {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: `±${Math.round(position.coords.accuracy)}m`,
          });
          console.log("🏫 Lokasi Sekolah:", SCHOOL_COORDS);
          console.log("📏 Jarak:", `${Math.round(distance)}m`);
          console.log("✅ Radius Max:", `${SCHOOL_RADIUS}m`);
          console.log("🎯 Status:", isWithinRadius ? "✅ VALID" : "❌ INVALID");
          console.log(
            "🗺️ Lihat di Maps:",
            `https://www.google.com/maps?q=${position.coords.latitude},${position.coords.longitude}`
          );
        }

        resolve(result);
      },
      (error) => {
        let errorMessage = "Tidak dapat mengakses lokasi";
        let errorCode = "GPS_ERROR";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Mohon izinkan akses lokasi di pengaturan browser";
            errorCode = "GPS_PERMISSION_DENIED";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Lokasi tidak tersedia. Pastikan GPS aktif";
            errorCode = "GPS_UNAVAILABLE";
            break;
          case error.TIMEOUT:
            errorMessage = "Timeout mendapatkan lokasi. Coba lagi";
            errorCode = "GPS_TIMEOUT";
            break;
        }

        resolve({
          allowed: false,
          error: errorCode,
          message: errorMessage,
        });
      },
      {
        enableHighAccuracy: true, // Akurasi tinggi
        timeout: 10000, // 10 detik timeout
        maximumAge: 0, // Jangan pake cached location
      }
    );
  });
};

/**
 * Check apakah guru punya jadwal hari ini
 * UPDATED: Real query ke Supabase
 */
export const validateTeacherSchedule = async (userId) => {
  try {
    // Get current day name in Indonesian
    const dayNames = [
      "Minggu",
      "Senin",
      "Selasa",
      "Rabu",
      "Kamis",
      "Jumat",
      "Sabtu",
    ];
    const today = dayNames[new Date().getDay()];

    console.log("🔍 Checking schedule for user:", userId, "Day:", today);

    // Query schedules for today
    const { data: schedules, error } = await supabase
      .from("teacher_schedules")
      .select("*")
      .eq("teacher_id", userId)
      .eq("day", today)
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error fetching schedule:", error);
      return {
        hasSchedule: null,
        suspicious: false,
        error: "SCHEDULE_CHECK_FAILED",
        message: "Tidak dapat memvalidasi jadwal",
      };
    }

    console.log("📅 Schedules found:", schedules?.length || 0);

    if (!schedules || schedules.length === 0) {
      return {
        hasSchedule: false,
        suspicious: true,
        reason: "NO_SCHEDULE_TODAY",
        message: `Anda tidak memiliki jadwal mengajar hari ini (${today})`,
      };
    }

    // Check apakah presensi sebelum kelas pertama
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}:00`;

    const firstClass = schedules[0];

    if (currentTime > firstClass.start_time) {
      return {
        hasSchedule: true,
        suspicious: true,
        reason: "LATE_CHECKIN",
        schedules: schedules,
        message: `Kelas pertama Anda dimulai pukul ${firstClass.start_time.slice(
          0,
          5
        )} (Kelas ${firstClass.class_id})`,
      };
    }

    return {
      hasSchedule: true,
      suspicious: false,
      schedules: schedules,
      totalClasses: schedules.length,
      message: `Hari ini Anda mengajar ${schedules.length} kelas`,
    };
  } catch (error) {
    console.error("Error validating schedule:", error);
    return {
      hasSchedule: null,
      suspicious: false,
      error: "SCHEDULE_CHECK_FAILED",
      message: "Tidak dapat memvalidasi jadwal",
    };
  }
};

/**
 * Validasi waktu untuk manual input
 * Manual input hanya bisa dilakukan jam 6:30 - 10:00 (jam datang guru)
 */
export const validateManualInputTime = () => {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  const currentMinutes = hour * 60 + minute;
  const startMinutes =
    MANUAL_INPUT_ALLOWED.startHour * 60 + MANUAL_INPUT_ALLOWED.startMinute;
  const endMinutes =
    MANUAL_INPUT_ALLOWED.endHour * 60 + MANUAL_INPUT_ALLOWED.endMinute;

  const isWithinWindow =
    currentMinutes >= startMinutes && currentMinutes <= endMinutes;

  if (!isWithinWindow) {
    return {
      allowed: false,
      message: `Manual input hanya bisa dilakukan jam ${
        MANUAL_INPUT_ALLOWED.startHour
      }:${MANUAL_INPUT_ALLOWED.startMinute.toString().padStart(2, "0")} - ${
        MANUAL_INPUT_ALLOWED.endHour
      }:${MANUAL_INPUT_ALLOWED.endMinute
        .toString()
        .padStart(2, "0")} (jam datang guru)`,
    };
  }

  return {
    allowed: true,
    message: "Waktu input valid",
  };
};

export default {
  validateAttendanceLocation,
  validateTeacherSchedule,
  validateManualInputTime,
  SCHOOL_COORDS,
  SCHOOL_RADIUS,
  MANUAL_INPUT_ALLOWED,
};
