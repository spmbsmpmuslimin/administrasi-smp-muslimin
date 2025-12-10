// src/attendance-teacher/AttendanceTabs.js
import React, { useState, useEffect } from "react";
import { QrCode, Edit3, Sparkles, AlertTriangle, X } from "lucide-react";
import { supabase } from "../supabaseClient";
import QRScanner from "./QRScanner";
import ManualCheckIn from "./ManualCheckIn";
import QRCodeGenerator from "./QRCodeGenerator";

const AttendanceTabs = ({ currentUser, onSuccess }) => {
  const [activeTab, setActiveTab] = useState("qr");
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  // Conditional tabs based on role
  const isAdmin = currentUser?.role === "admin";

  // Check today's attendance saat component mount
  useEffect(() => {
    checkTodayAttendance();
  }, [currentUser]);

  // Re-check saat tab berubah
  useEffect(() => {
    checkTodayAttendance();
  }, [activeTab]);

  const checkTodayAttendance = async () => {
    if (!currentUser?.teacher_id) return;

    try {
      // ✅ GET TANGGAL SESUAI TIMEZONE INDONESIA (WIB)
      const jakartaDate = new Date(
        new Date().toLocaleString("en-US", {
          timeZone: "Asia/Jakarta",
        })
      );

      const year = jakartaDate.getFullYear();
      const month = String(jakartaDate.getMonth() + 1).padStart(2, "0");
      const day = String(jakartaDate.getDate()).padStart(2, "0");
      const today = `${year}-${month}-${day}`;

      console.log("🔍 Checking attendance for date (WIB):", today);

      const { data, error } = await supabase
        .from("teacher_attendance")
        .select("*")
        .eq("teacher_id", currentUser.teacher_id)
        .eq("attendance_date", today)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error checking attendance:", error);
        return;
      }

      console.log("📊 Today's attendance data:", data);
      setTodayAttendance(data);
    } catch (error) {
      console.error("Error in checkTodayAttendance:", error);
    }
  };

  // Wrapper function yang dipanggil sebelum submit dari QR/Manual
  const handleBeforeSubmit = async (submitData) => {
    setCheckingDuplicate(true);

    try {
      // ✅ GET TANGGAL SESUAI TIMEZONE INDONESIA (WIB)
      const jakartaDate = new Date(
        new Date().toLocaleString("en-US", {
          timeZone: "Asia/Jakarta",
        })
      );

      const year = jakartaDate.getFullYear();
      const month = String(jakartaDate.getMonth() + 1).padStart(2, "0");
      const day = String(jakartaDate.getDate()).padStart(2, "0");
      const today = `${year}-${month}-${day}`;

      const targetTeacherId = submitData.teacher_id || currentUser.teacher_id;

      console.log("🔍 Re-checking duplicate for date (WIB):", today);
      console.log("👤 Teacher ID:", targetTeacherId);

      const { data: existingData, error } = await supabase
        .from("teacher_attendance")
        .select("*")
        .eq("teacher_id", targetTeacherId)
        .eq("attendance_date", today)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      console.log("📋 Existing data found:", existingData);

      if (existingData) {
        // Sudah ada presensi → Tanya konfirmasi
        setTodayAttendance(existingData);
        setPendingSubmitData(submitData);
        setShowDuplicateModal(true);
      } else {
        // Belum ada presensi → Langsung submit
        console.log("✅ No duplicate, proceeding with submit");
        await processSubmit(submitData);
      }
    } catch (error) {
      console.error("Error checking duplicate:", error);
      // Kalau error checking, tetap lanjut submit
      await processSubmit(submitData);
    } finally {
      setCheckingDuplicate(false);
    }
  };

  // Process actual submit (INSERT atau UPDATE)
  const processSubmit = async (submitData) => {
    try {
      // ✅ GET TANGGAL SESUAI TIMEZONE INDONESIA (WIB)
      const jakartaDate = new Date(
        new Date().toLocaleString("en-US", {
          timeZone: "Asia/Jakarta",
        })
      );

      const year = jakartaDate.getFullYear();
      const month = String(jakartaDate.getMonth() + 1).padStart(2, "0");
      const day = String(jakartaDate.getDate()).padStart(2, "0");
      const today = `${year}-${month}-${day}`;

      const targetTeacherId = submitData.teacher_id || currentUser.teacher_id;

      console.log("💾 Processing submit for date (WIB):", today);
      console.log("📝 Submit data:", submitData);

      // Check lagi apakah sudah ada
      const { data: existingData } = await supabase
        .from("teacher_attendance")
        .select("id")
        .eq("teacher_id", targetTeacherId)
        .eq("attendance_date", today)
        .maybeSingle();

      if (existingData) {
        // UPDATE existing
        console.log("🔄 Updating existing attendance, ID:", existingData.id);
        const { error: updateError } = await supabase
          .from("teacher_attendance")
          .update({
            status: submitData.status || "Hadir",
            clock_in: submitData.clock_in,
            check_in_method: submitData.check_in_method,
            notes: submitData.notes || null,
            gps_location: submitData.gps_location || null,
            admin_info: submitData.admin_info || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingData.id);

        if (updateError) throw updateError;
        console.log("✅ Update successful!");
      } else {
        // INSERT new
        console.log("➕ Inserting new attendance");
        const { error: insertError } = await supabase
          .from("teacher_attendance")
          .insert({
            teacher_id: targetTeacherId,
            attendance_date: today,
            status: submitData.status || "Hadir",
            clock_in: submitData.clock_in,
            check_in_method: submitData.check_in_method,
            notes: submitData.notes || null,
            gps_location: submitData.gps_location || null,
            admin_info: submitData.admin_info || null,
          });

        if (insertError) throw insertError;
        console.log("✅ Insert successful!");
      }

      // Success callback
      if (onSuccess) onSuccess();

      // Refresh today's attendance
      await checkTodayAttendance();

      return { success: true };
    } catch (error) {
      console.error("Error in processSubmit:", error);
      throw error;
    }
  };

  // Handle konfirmasi "Simpan Ulang"
  const handleConfirmOverwrite = async () => {
    setShowDuplicateModal(false);

    if (pendingSubmitData) {
      console.log("🔄 User confirmed overwrite, processing...");
      await processSubmit(pendingSubmitData);
      setPendingSubmitData(null);
    }
  };

  // Handle "Batal"
  const handleCancelOverwrite = () => {
    console.log("❌ User cancelled overwrite");
    setShowDuplicateModal(false);
    setPendingSubmitData(null);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Duplicate Check Modal */}
      {showDuplicateModal && todayAttendance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-400 to-orange-500 dark:from-amber-500 dark:to-orange-600 rounded-t-2xl p-6 relative">
              <button
                onClick={handleCancelOverwrite}
                className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-all">
                <X size={20} />
              </button>
              <div className="flex items-center gap-3">
                <div className="bg-white bg-opacity-20 p-3 rounded-full">
                  <AlertTriangle className="text-white" size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    ⚠️ Peringatan Duplikat
                  </h3>
                  <p className="text-white text-sm opacity-90">
                    Presensi Sudah Ada
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-700 dark:text-gray-200 text-center text-lg font-medium mb-4">
                Anda Sudah Melakukan Presensi Hari Ini
              </p>

              {/* Info Box */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400 p-4 rounded-lg mb-4">
                <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                  <p>
                    <strong>📅 Hari/Tanggal:</strong>{" "}
                    {new Date(
                      todayAttendance.attendance_date
                    ).toLocaleDateString("id-ID", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <p>
                    <strong>🕐 Waktu Check-in:</strong>{" "}
                    {todayAttendance.clock_in?.substring(0, 5)} WIB
                  </p>
                  <p>
                    <strong>📊 Status:</strong>{" "}
                    <span
                      className={`font-semibold ${
                        todayAttendance.status === "Hadir"
                          ? "text-green-600 dark:text-green-400"
                          : todayAttendance.status === "Izin"
                          ? "text-blue-600 dark:text-blue-400"
                          : todayAttendance.status === "Sakit"
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-red-600 dark:text-red-400"
                      }`}>
                      {todayAttendance.status}
                    </span>
                  </p>
                  {todayAttendance.notes && (
                    <p>
                      <strong>📝 Catatan:</strong> {todayAttendance.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Warning */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 dark:border-amber-400 p-4 rounded-lg mb-6">
                <p className="text-amber-800 dark:text-amber-200 text-sm">
                  <strong>⚠️ Perhatian:</strong> Jika Anda melanjutkan, data
                  presensi sebelumnya akan diganti dengan data baru. Pastikan
                  keputusan Anda sudah tepat.
                </p>
              </div>

              <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                Apakah Anda ingin{" "}
                <strong className="text-orange-600 dark:text-orange-400">
                  menyimpan ulang
                </strong>{" "}
                atau{" "}
                <strong className="text-gray-800 dark:text-gray-200">
                  membatalkan
                </strong>
                ?
              </p>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCancelOverwrite}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg transition-all border border-gray-300 dark:border-gray-600">
                  ❌ Batal
                </button>
                <button
                  onClick={handleConfirmOverwrite}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold rounded-lg transition-all shadow-lg">
                  ✅ Simpan Ulang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Header - Mobile Responsive */}
      <div className="flex gap-1 sm:gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto scrollbar-hide">
        {/* TAB 1: SCAN QR */}
        <button
          onClick={() => setActiveTab("qr")}
          className={`
            flex-1 py-3 px-3 sm:px-4 font-semibold transition-all 
            flex items-center justify-center gap-1.5 sm:gap-2
            text-xs sm:text-sm whitespace-nowrap
            min-h-[44px]
            ${
              activeTab === "qr"
                ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            }
          `}>
          <QrCode size={16} className="sm:w-5 sm:h-5" />
          Scan QR
        </button>

        {/* TAB 2: INPUT MANUAL - SEMUA BISA! */}
        <button
          onClick={() => setActiveTab("manual")}
          className={`
            flex-1 py-3 px-3 sm:px-4 font-semibold transition-all 
            flex items-center justify-center gap-1.5 sm:gap-2
            text-xs sm:text-sm whitespace-nowrap
            min-h-[44px]
            ${
              activeTab === "manual"
                ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            }
          `}>
          <Edit3 size={16} className="sm:w-5 sm:h-5" />
          Input Manual
        </button>

        {/* TAB 3: GENERATE QR (ADMIN ONLY) */}
        {isAdmin && (
          <button
            onClick={() => setActiveTab("generate")}
            className={`
              flex-1 py-3 px-3 sm:px-4 font-semibold transition-all 
              flex items-center justify-center gap-1.5 sm:gap-2
              text-xs sm:text-sm whitespace-nowrap
              min-h-[44px]
              ${
                activeTab === "generate"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              }
            `}>
            <Sparkles size={16} className="sm:w-5 sm:h-5" />
            Generate QR
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="p-4 sm:p-6">
        {activeTab === "qr" && (
          <QRScanner
            currentUser={currentUser}
            onSuccess={onSuccess}
            onBeforeSubmit={handleBeforeSubmit}
          />
        )}
        {activeTab === "manual" && (
          <ManualCheckIn
            currentUser={currentUser}
            onSuccess={onSuccess}
            onBeforeSubmit={handleBeforeSubmit}
          />
        )}
        {activeTab === "generate" && <QRCodeGenerator />}
      </div>

      {/* CSS for animation */}
      <style>{`
        @keyframes scale-in {
          0% {
            opacity: 0;
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default AttendanceTabs;
