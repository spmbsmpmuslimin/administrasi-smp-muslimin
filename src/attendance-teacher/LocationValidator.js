// attendance-teacher/LocationValidator.js
// Utility untuk validasi lokasi guru saat presensi manual

const SCHOOL_COORDS = {
  lat: -6.914744, // Ganti dengan koordinat sekolah lo
  lng: 107.60981,
};

const SCHOOL_RADIUS = 100; // 100 meter radius dari sekolah

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

        resolve({
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
        });
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
 */
export const validateTeacherSchedule = async (teacherId, date = new Date()) => {
  try {
    // TODO: Ganti dengan actual API call ke backend
    const response = await fetch(
      `/api/schedules/teacher/${teacherId}?date=${date.toISOString()}`
    );
    const schedules = await response.json();

    if (!schedules || schedules.length === 0) {
      return {
        hasSchedule: false,
        suspicious: true,
        reason: "NO_SCHEDULE_TODAY",
        message: "Anda tidak memiliki jadwal mengajar hari ini",
      };
    }

    // Check apakah presensi sebelum kelas pertama
    const now = new Date();
    const firstClass = schedules[0];
    const classStartTime = new Date(firstClass.startTime);

    if (now > classStartTime) {
      return {
        hasSchedule: true,
        suspicious: true,
        reason: "LATE_CHECKIN",
        message: `Kelas pertama Anda dimulai pukul ${firstClass.startTime
          .split("T")[1]
          .slice(0, 5)}`,
      };
    }

    return {
      hasSchedule: true,
      suspicious: false,
      schedules: schedules,
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

export default {
  validateAttendanceLocation,
  validateTeacherSchedule,
  SCHOOL_COORDS,
  SCHOOL_RADIUS,
};
