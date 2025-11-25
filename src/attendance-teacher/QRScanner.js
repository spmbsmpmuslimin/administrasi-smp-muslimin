// src/attendance-teacher/QRScanner.js - CAMERA ONLY
import React, { useState, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { CheckCircle, XCircle, Camera, AlertCircle } from "lucide-react";
import { supabase } from "../supabaseClient";

const QRScanner = ({ currentUser, onSuccess }) => {
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [html5QrCode, setHtml5QrCode] = useState(null);

  useEffect(() => {
    if (scanning) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [scanning]);

  const startCamera = async () => {
    try {
      console.log("🎥 Starting camera...");

      const qrCode = new Html5Qrcode("qr-reader");
      setHtml5QrCode(qrCode);

      await qrCode.start(
        { facingMode: "environment" }, // Use back camera on mobile
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        onScanSuccess,
        onScanError
      );

      console.log("✅ Camera started!");
    } catch (err) {
      console.error("❌ Camera error:", err);
      setMessage({
        type: "error",
        text: "Gagal membuka kamera: " + err.message,
      });
      setScanning(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCode && html5QrCode.isScanning) {
      try {
        console.log("🛑 Stopping camera...");
        await html5QrCode.stop();
        console.log("✅ Camera stopped");
      } catch (err) {
        console.error("❌ Error stopping camera:", err);
      }
    }
  };

  const onScanSuccess = async (decodedText) => {
    console.log("📷 QR Detected:", decodedText);

    // Validasi QR Code
    const validQRCodes = [
      "QR_PRESENSI_GURU_SMP_MUSLIMIN_CILILIN",
      "QR_PRESENSI_GURU_2024", // Backup untuk QR lama
    ];

    if (!validQRCodes.includes(decodedText)) {
      console.log("❌ Invalid QR Code");
      setMessage({
        type: "error",
        text: "QR Code tidak valid! Gunakan QR Code resmi presensi guru.",
      });
      return;
    }

    console.log("✅ Valid QR Code, stopping scanner...");
    setScanning(false);
    setLoading(true);

    try {
      const today = new Date().toISOString().split("T")[0];
      const now = new Date();
      const clockInTime = now.toTimeString().split(" ")[0];

      console.log("📅 Date:", today, "Time:", clockInTime);

      // Get teacher_id dari users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("teacher_id")
        .eq("id", currentUser.id)
        .single();

      if (userError) {
        console.error("❌ User error:", userError);
        throw userError;
      }

      console.log("👨‍🏫 Teacher data:", userData);

      if (!userData.teacher_id) {
        throw new Error("Teacher ID tidak ditemukan di data guru");
      }

      // Cek sudah absen hari ini atau belum
      console.log("🔍 Checking existing attendance...");
      const { data: existingAttendance, error: checkError } = await supabase
        .from("teacher_attendance")
        .select("*")
        .eq("teacher_id", userData.teacher_id)
        .eq("attendance_date", today)
        .maybeSingle();

      if (checkError && checkError.code !== "PGRST116") {
        console.error("❌ Check error:", checkError);
        throw checkError;
      }

      console.log("📋 Existing attendance:", existingAttendance);

      if (existingAttendance) {
        setMessage({
          type: "warning",
          text: `Anda sudah melakukan presensi hari ini pada pukul ${existingAttendance.clock_in}`,
        });
        setLoading(false);
        return;
      }

      // Insert attendance
      console.log("💾 Inserting attendance...");
      const { error: insertError } = await supabase
        .from("teacher_attendance")
        .insert({
          teacher_id: userData.teacher_id,
          attendance_date: today,
          status: "Hadir",
          clock_in: clockInTime,
          check_in_method: "qr",
          notes: null,
        });

      if (insertError) {
        console.error("❌ Insert error:", insertError);
        throw insertError;
      }

      console.log("✅ Attendance saved successfully!");

      setMessage({
        type: "success",
        text: `✅ Presensi berhasil! Jam masuk: ${now.toLocaleTimeString(
          "id-ID",
          { hour: "2-digit", minute: "2-digit" }
        )}`,
      });

      // Trigger refresh di parent
      if (onSuccess) {
        console.log("🔄 Triggering parent refresh...");
        onSuccess();
      }
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

  const onScanError = (error) => {
    // Silent - normal scanning errors
  };

  const startScanning = () => {
    console.log("🚀 Start scanning button clicked");
    setMessage(null);
    setScanning(true);
  };

  const stopScanning = () => {
    console.log("🛑 Stop scanning button clicked");
    setScanning(false);
    setMessage(null);
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Scan QR Code untuk Presensi
        </h3>
        <p className="text-sm text-gray-600">
          Arahkan kamera ke QR Code Presensi Guru
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

      {/* QR Scanner */}
      {!scanning && !loading && (
        <button
          onClick={startScanning}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg">
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
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>💡 Tips:</strong> Pastikan pencahayaan cukup dan QR Code
          terlihat jelas di kamera
        </p>
      </div>
    </div>
  );
};

export default QRScanner;
