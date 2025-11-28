// src/attendance-teacher/QRScanner.js - FIXED CAMERA FLICKERING
import React, { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  CheckCircle,
  XCircle,
  Camera,
  AlertCircle,
  Clock,
  Shield,
} from "lucide-react";
import { supabase } from "../supabaseClient";

const QRScanner = ({ currentUser, onSuccess }) => {
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showTeacherSelect, setShowTeacherSelect] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState(null);
  const [teachersList, setTeachersList] = useState([]);

  // ✅ USE REF INSTEAD OF STATE - mencegah re-render
  const html5QrCodeRef = useRef(null);
  const isScanningRef = useRef(false);

  // Check if user is admin
  useEffect(() => {
    checkAdminStatus();
  }, [currentUser]);

  // Load teachers list for admin
  useEffect(() => {
    if (isAdmin) {
      loadTeachers();
    }
  }, [isAdmin]);

  // ✅ CAMERA CONTROL - FIXED dengan useRef
  useEffect(() => {
    let mounted = true;

    const initCamera = async () => {
      if (scanning && !isScanningRef.current && mounted) {
        await startCamera();
      } else if (!scanning && isScanningRef.current) {
        await stopCamera();
      }
    };

    initCamera();

    return () => {
      mounted = false;
      stopCamera();
    };
  }, [scanning]);

  const checkAdminStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", currentUser.id)
        .single();

      if (error) throw error;
      setIsAdmin(data.role === "admin");
    } catch (error) {
      console.error("Error checking admin status:", error);
    }
  };

  const loadTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("teacher_id, full_name, username")
        .eq("role", "teacher")
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;
      setTeachersList(data || []);
    } catch (error) {
      console.error("Error loading teachers:", error);
    }
  };

  // ✅ FUNGSI KAMERA - FIXED FLICKERING
  const startCamera = async () => {
    // Cegah double start
    if (isScanningRef.current) {
      console.log("⚠️ Camera already running, skipping start");
      return;
    }

    try {
      console.log("🎥 Starting camera...");

      const qrCode = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = qrCode;

      await qrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        onScanSuccess,
        onScanError
      );

      isScanningRef.current = true;
      console.log("✅ Camera started!");
    } catch (err) {
      console.error("❌ Camera error:", err);
      setMessage({
        type: "error",
        text: "Gagal membuka kamera: " + err.message,
      });
      setScanning(false);
      isScanningRef.current = false;
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && isScanningRef.current) {
      try {
        console.log("🛑 Stopping camera...");
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
        isScanningRef.current = false;
        console.log("✅ Camera stopped");
      } catch (err) {
        console.error("❌ Error stopping camera:", err);
        isScanningRef.current = false;
      }
    }
  };

  const onScanError = (error) => {
    // Silent - normal scanning errors
  };

  const onScanSuccess = async (decodedText) => {
    console.log("📷 QR Detected:", decodedText);

    // Validasi QR Code
    const validQRCodes = [
      "QR_PRESENSI_GURU_SMP_MUSLIMIN_CILILIN",
      "QR_PRESENSI_GURU_2024",
    ];

    if (!validQRCodes.includes(decodedText)) {
      console.log("❌ Invalid QR Code");
      setMessage({
        type: "error",
        text: "QR Code tidak valid! Gunakan QR Code resmi presensi guru.",
      });
      return;
    }

    console.log("✅ Valid QR Code");

    // Stop camera dulu sebelum proses lebih lanjut
    await stopCamera();
    setScanning(false);

    // Jika Admin, tanya dulu mau input untuk siapa
    if (isAdmin) {
      console.log("👤 Admin detected, showing teacher selection...");
      setShowTeacherSelect(true);
      return;
    }

    // Jika bukan admin, langsung proses
    await processAttendance();
  };

  const processAttendance = async (adminSelectedTeacherId = null) => {
    setLoading(true);
    setShowTeacherSelect(false);

    try {
      // Get current time in Jakarta timezone
      const jakartaDate = new Date(
        new Date().toLocaleString("en-US", {
          timeZone: "Asia/Jakarta",
        })
      );

      const year = jakartaDate.getFullYear();
      const month = String(jakartaDate.getMonth() + 1).padStart(2, "0");
      const day = String(jakartaDate.getDate()).padStart(2, "0");
      const today = `${year}-${month}-${day}`;

      const hour = jakartaDate.getHours();
      const minute = jakartaDate.getMinutes();
      const hourStr = String(hour).padStart(2, "0");
      const minuteStr = String(minute).padStart(2, "0");
      const second = String(jakartaDate.getSeconds()).padStart(2, "0");
      const clockInTime = `${hourStr}:${minuteStr}:${second}`;

      console.log("📅 Date:", today, "Time:", clockInTime);

      // ✅ VALIDASI JAM OPERASIONAL: 07:00 - 14:00 (HANYA UNTUK GURU BIASA)
      if (!isAdmin) {
        const currentTimeInMinutes = hour * 60 + minute;
        const startTime = 7 * 60;
        const endTime = 14 * 60;

        if (
          currentTimeInMinutes < startTime ||
          currentTimeInMinutes > endTime
        ) {
          setMessage({
            type: "error",
            text: `⏰ Presensi hanya dapat dilakukan pada jam 07:00 - 14:00 WIB. Waktu saat ini: ${hourStr}:${minuteStr} WIB`,
          });
          setLoading(false);
          return;
        }
      }

      // Get teacher_id
      let targetTeacherId;
      let targetTeacherName;

      if (isAdmin && adminSelectedTeacherId) {
        // Admin input untuk guru lain
        targetTeacherId = adminSelectedTeacherId;
        const teacher = teachersList.find(
          (t) => t.teacher_id === adminSelectedTeacherId
        );
        targetTeacherName = teacher?.full_name || "Unknown";
      } else {
        // Guru input sendiri
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("teacher_id, full_name")
          .eq("id", currentUser.id)
          .single();

        if (userError) throw userError;

        if (!userData.teacher_id) {
          throw new Error("Teacher ID tidak ditemukan di data guru");
        }

        targetTeacherId = userData.teacher_id;
        targetTeacherName = userData.full_name;
      }

      // Cek sudah absen hari ini atau belum
      console.log("🔍 Checking existing attendance...");
      const { data: existingAttendance, error: checkError } = await supabase
        .from("teacher_attendance")
        .select("*")
        .eq("teacher_id", targetTeacherId)
        .eq("attendance_date", today)
        .maybeSingle();

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError;
      }

      if (existingAttendance) {
        setMessage({
          type: "warning",
          text: isAdmin
            ? `${targetTeacherName} sudah melakukan presensi hari ini pada pukul ${existingAttendance.clock_in.substring(
                0,
                5
              )} WIB`
            : `Anda sudah melakukan presensi hari ini pada pukul ${existingAttendance.clock_in.substring(
                0,
                5
              )} WIB`,
        });
        setLoading(false);
        return;
      }

      // Prepare attendance data
      const attendanceData = {
        teacher_id: targetTeacherId,
        attendance_date: today,
        status: "Hadir",
        clock_in: clockInTime,
        check_in_method: isAdmin ? "admin_qr" : "qr",
        notes: null,
      };

      // Tambahkan admin_info jika di-input oleh admin
      if (isAdmin) {
        const { data: adminData } = await supabase
          .from("users")
          .select("full_name")
          .eq("id", currentUser.id)
          .single();

        attendanceData.admin_info = JSON.stringify({
          admin_id: currentUser.id,
          admin_name: adminData?.full_name || "Admin",
          input_time: new Date().toISOString(),
          reason: "Scan QR oleh admin",
        });
      }

      // Insert attendance
      console.log("💾 Inserting attendance...");
      const { error: insertError } = await supabase
        .from("teacher_attendance")
        .insert(attendanceData);

      if (insertError) throw insertError;

      setMessage({
        type: "success",
        text: isAdmin
          ? `✅ Presensi ${targetTeacherName} berhasil! Jam: ${clockInTime.substring(
              0,
              5
            )} WIB`
          : `✅ Presensi berhasil! Jam masuk: ${clockInTime.substring(
              0,
              5
            )} WIB`,
      });

      // Reset selection
      setSelectedTeacherId(null);

      // Auto-hide success message
      setTimeout(() => {
        setMessage(null);
      }, 3000);

      // Trigger refresh
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("❌ Error submitting attendance:", error);
      setMessage({
        type: "error",
        text: "Gagal menyimpan presensi: " + error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const startScanning = () => {
    setMessage(null);
    setScanning(true);
  };

  const stopScanning = () => {
    setScanning(false);
    setMessage(null);
  };

  const handleTeacherSubmit = () => {
    if (!selectedTeacherId) {
      setMessage({
        type: "error",
        text: "Silakan pilih guru terlebih dahulu",
      });
      return;
    }
    processAttendance(selectedTeacherId);
  };

  const handleCancelTeacherSelect = () => {
    setShowTeacherSelect(false);
    setSelectedTeacherId(null);
    setMessage(null);
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center justify-center gap-2">
          {isAdmin && <Shield className="text-blue-600" size={20} />}
          Scan QR Code untuk Presensi
          {isAdmin && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              ADMIN MODE
            </span>
          )}
        </h3>
        <p className="text-sm text-gray-600">
          {isAdmin
            ? "Scan QR Code untuk input presensi guru (tanpa batasan waktu)"
            : "Arahkan kamera ke QR Code Presensi Guru"}
        </p>
      </div>

      {/* Message Alert */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-start gap-3 ${
            message.type === "success"
              ? "bg-green-50 border border-green-200"
              : message.type === "error"
              ? "bg-red-50 border border-red-200"
              : "bg-yellow-50 border border-yellow-200"
          }`}>
          {message.type === "success" ? (
            <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
          ) : message.type === "error" ? (
            <XCircle className="text-red-600 flex-shrink-0" size={24} />
          ) : (
            <AlertCircle className="text-yellow-600 flex-shrink-0" size={24} />
          )}
          <p
            className={`text-sm font-medium ${
              message.type === "success"
                ? "text-green-800"
                : message.type === "error"
                ? "text-red-800"
                : "text-yellow-800"
            }`}>
            {message.text}
          </p>
        </div>
      )}

      {/* Teacher Selection Modal (Admin Only) */}
      {showTeacherSelect && isAdmin && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-2 text-blue-800 font-semibold">
            <Shield size={20} />
            <span>Pilih Guru untuk Presensi</span>
          </div>

          <select
            value={selectedTeacherId || ""}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
            className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">-- Pilih Guru --</option>
            {teachersList.map((teacher) => (
              <option key={teacher.teacher_id} value={teacher.teacher_id}>
                {teacher.full_name}
              </option>
            ))}
          </select>

          <div className="flex gap-3">
            <button
              onClick={handleTeacherSubmit}
              disabled={!selectedTeacherId}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-all">
              Submit Presensi
            </button>
            <button
              onClick={handleCancelTeacherSelect}
              className="flex-1 py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all">
              Batal
            </button>
          </div>
        </div>
      )}

      {/* QR Scanner */}
      {!scanning && !loading && !showTeacherSelect && (
        <button
          onClick={startScanning}
          className={`w-full py-4 ${
            isAdmin
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-green-600 hover:bg-green-700"
          } text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg`}>
          <Camera size={20} />
          Buka Kamera
        </button>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Menyimpan presensi...</p>
        </div>
      )}

      {scanning && (
        <div className="space-y-4">
          <div
            id="qr-reader"
            className="rounded-lg overflow-hidden"
            style={{ width: "100%", minHeight: "300px" }}></div>
          <button
            onClick={stopScanning}
            className="w-full py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all">
            Tutup Kamera
          </button>
        </div>
      )}

      {/* Info */}
      <div className="space-y-3">
        <div
          className={`${
            isAdmin
              ? "bg-blue-50 border-blue-200"
              : "bg-green-50 border-green-200"
          } border rounded-lg p-4`}>
          <p className="text-sm text-gray-800">
            <strong>💡 Tips:</strong> Pastikan pencahayaan cukup dan QR Code
            terlihat jelas di kamera
          </p>
        </div>

        {!isAdmin && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <Clock className="text-amber-600 flex-shrink-0" size={20} />
            <p className="text-sm text-amber-800">
              <strong>⏰ Jam Operasional:</strong> Presensi hanya dapat
              dilakukan pada pukul 07:00 - 14:00 WIB
            </p>
          </div>
        )}

        {isAdmin && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <Shield className="text-blue-600 flex-shrink-0" size={20} />
            <p className="text-sm text-blue-800">
              <strong>Admin Mode:</strong> Anda dapat scan QR kapan saja tanpa
              batasan waktu untuk input presensi guru lain
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRScanner;
