// src/attendance-teacher/ManualCheckIn.js
import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Save,
  CheckCircle,
  XCircle,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import {
  validateAttendanceLocation,
  validateTeacherSchedule,
  validateManualInputTime,
} from "./LocationValidator";

const ManualCheckIn = ({ currentUser, onSuccess }) => {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toTimeString().split(" ")[0].slice(0, 5); // HH:MM

  const [formData, setFormData] = useState({
    date: today,
    status: "Hadir",
    clockIn: now,
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [locationStatus, setLocationStatus] = useState(null);
  const [checkingLocation, setCheckingLocation] = useState(false);

  const statusOptions = [
    { value: "Hadir", label: "Hadir", color: "bg-green-500" },
    { value: "Izin", label: "Izin", color: "bg-blue-500" },
    { value: "Sakit", label: "Sakit", color: "bg-yellow-500" },
    { value: "Alpa", label: "Alpa", color: "bg-red-500" },
  ];

  // Pre-check location saat component mount (untuk status "Hadir" only)
  useEffect(() => {
    if (formData.status === "Hadir") {
      checkLocation();
    } else {
      setLocationStatus(null);
    }
  }, [formData.status]);

  const checkLocation = async () => {
    setCheckingLocation(true);
    const locationCheck = await validateAttendanceLocation();
    setLocationStatus(locationCheck);
    setCheckingLocation(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // VALIDASI WAKTU - HANYA JAM 07:00-14.00
      const timeCheck = validateManualInputTime();
      if (!timeCheck.allowed) {
        const currentTime = new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Jakarta",
          hour12: false,
        });

        setMessage({
          type: "error",
          text: `⏰ Presensi hanya dapat dilakukan pada jam 07:00 - 14:00 WIB.\nWaktu saat ini: ${currentTime} WIB`,
        });
        setLoading(false);
        return;
      }

      // VALIDASI GPS - HANYA UNTUK STATUS "HADIR" (Soft check, no blocking)
      if (formData.status === "Hadir") {
        const locationCheck = await validateAttendanceLocation();
        setLocationStatus(locationCheck);
        // GPS cuma dicatet aja, ga blocking submit

        // VALIDASI JADWAL (SOFT WARNING)
        const scheduleCheck = await validateTeacherSchedule(currentUser.id);

        if (scheduleCheck.suspicious) {
          const confirmMessage = `⚠️ Perhatian!\n\n${scheduleCheck.message}\n\nTetap lanjutkan presensi?`;
          const confirmed = window.confirm(confirmMessage);

          if (!confirmed) {
            setLoading(false);
            return;
          }
        }
      }

      // Get teacher_id
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("teacher_id, full_name")
        .eq("id", currentUser.id)
        .single();

      if (userError) throw userError;

      if (!userData.teacher_id) {
        throw new Error("Teacher ID tidak ditemukan");
      }

      // Cek apakah sudah ada presensi di tanggal yang dipilih
      const { data: existingAttendance, error: checkError } = await supabase
        .from("teacher_attendance")
        .select("*")
        .eq("teacher_id", userData.teacher_id)
        .eq("attendance_date", formData.date)
        .maybeSingle();

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError;
      }

      // Prepare attendance metadata (untuk audit trail)
      const attendanceMetadata = {
        check_in_method: "manual",
        notes: formData.notes || null,
        updated_at: new Date().toISOString(),
      };

      // Tambahkan GPS metadata jika status "Hadir" DAN lokasi valid
      if (
        formData.status === "Hadir" &&
        locationStatus?.allowed &&
        locationStatus?.coords
      ) {
        attendanceMetadata.gps_location = JSON.stringify({
          lat: locationStatus.coords.lat,
          lng: locationStatus.coords.lng,
          distance: locationStatus.distance,
          accuracy: locationStatus.accuracy,
          timestamp: new Date().toISOString(),
        });
      } else if (formData.status === "Hadir" && !locationStatus?.allowed) {
        // GPS error tapi diizinkan submit
        attendanceMetadata.gps_location = JSON.stringify({
          error: locationStatus?.error || "GPS_UNAVAILABLE",
          message: locationStatus?.message || "Lokasi tidak tersedia",
          timestamp: new Date().toISOString(),
        });
      }

      // Jika sudah ada, update. Jika belum, insert
      if (existingAttendance) {
        // UPDATE existing attendance
        const { error: updateError } = await supabase
          .from("teacher_attendance")
          .update({
            status: formData.status,
            clock_in: formData.clockIn + ":00", // Format TIME: HH:MM:SS
            ...attendanceMetadata,
          })
          .eq("id", existingAttendance.id);

        if (updateError) throw updateError;

        setMessage({
          type: "success",
          text: `✅ Presensi tanggal ${formData.date} berhasil diupdate!`,
        });
      } else {
        // INSERT new attendance
        const { error: insertError } = await supabase
          .from("teacher_attendance")
          .insert({
            teacher_id: userData.teacher_id,
            attendance_date: formData.date,
            status: formData.status,
            clock_in: formData.clockIn + ":00", // Format TIME: HH:MM:SS
            ...attendanceMetadata,
          });

        if (insertError) throw insertError;

        setMessage({
          type: "success",
          text: `✅ Presensi tanggal ${formData.date} berhasil disimpan!`,
        });
      }

      // ✅ Auto-hide success message after 3 seconds
      setTimeout(() => {
        setMessage(null);
      }, 3000);

      // Trigger refresh di parent
      if (onSuccess) onSuccess();

      // ✅ FIX: Reset form AND re-check location
      setFormData({
        date: today,
        status: "Hadir",
        clockIn: now,
        notes: "",
      });

      // Re-check location after reset (karena status kembali ke "Hadir")
      setTimeout(() => {
        checkLocation();
      }, 500);
    } catch (error) {
      console.error("Error submitting attendance:", error);
      setMessage({
        type: "error",
        text: "Gagal menyimpan presensi: " + error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Input Presensi Manual
        </h3>
        <p className="text-sm text-gray-600">
          Isi form di bawah untuk mencatat presensi
        </p>
      </div>

      {/* GPS Status Indicator - REMOVED! Cuma dicatat di background aja */}
      {/* GPS check tetep jalan tapi ga ditampilin ke user biar ga ganggu */}

      {/* Message Alert */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-start gap-3 transition-all duration-500 ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 animate-fade-in"
              : "bg-red-50 border border-red-200 animate-fade-in"
          }`}>
          {message.type === "success" ? (
            <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
          ) : (
            <XCircle className="text-red-600 flex-shrink-0" size={24} />
          )}
          <p
            className={`text-sm font-medium whitespace-pre-line ${
              message.type === "success" ? "text-green-800" : "text-red-800"
            }`}>
            {message.text}
          </p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tanggal */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Calendar size={18} />
            Tanggal Presensi
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => handleChange("date", e.target.value)}
            max={today}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            * Bisa pilih tanggal mundur untuk input presensi yang terlupa
          </p>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status Kehadiran
          </label>
          <div className="grid grid-cols-2 gap-3">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleChange("status", option.value)}
                className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                  formData.status === option.value
                    ? `${option.color} text-white shadow-lg scale-105`
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}>
                {option.label}
              </button>
            ))}
          </div>
          {formData.status !== "Hadir" && (
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <AlertTriangle size={14} />
              Status selain "Hadir" tidak memerlukan validasi GPS
            </p>
          )}
        </div>

        {/* Jam Masuk */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Clock size={18} />
            Jam Masuk
          </label>
          <input
            type="time"
            value={formData.clockIn}
            onChange={(e) => handleChange("clockIn", e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Catatan (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Catatan (Opsional)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            rows={3}
            placeholder="Contoh: Sakit demam, Ada keperluan keluarga, dll..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg">
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Menyimpan...
            </>
          ) : (
            <>
              <Save size={20} />
              Simpan Presensi
            </>
          )}
        </button>
      </form>

      {/* Info - Simple */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>ℹ️ Info:</strong> Input manual presensi hanya tersedia pada
          jam 07:00 - 14:00. Jika sudah ada presensi di tanggal yang dipilih,
          data akan diupdate.
        </p>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ManualCheckIn;
