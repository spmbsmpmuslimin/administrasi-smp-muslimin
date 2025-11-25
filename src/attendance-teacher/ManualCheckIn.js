// src/attendance-teacher/ManualCheckIn.js - TIME FIX
import React, { useState, useEffect } from "react";
import { CheckCircle, XCircle, Save, AlertCircle } from "lucide-react";
import { supabase } from "../supabaseClient";

const ManualCheckIn = ({ currentUser, onSuccess }) => {
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [status, setStatus] = useState("Hadir");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  const isAdmin = currentUser.role === "admin";

  useEffect(() => {
    if (isAdmin) {
      fetchTeachers();
    } else {
      setSelectedTeacher(currentUser.id);
    }
  }, [isAdmin, currentUser.id]);

  const fetchTeachers = async () => {
    setLoadingTeachers(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, role")
        .in("role", ["teacher", "guru_bk", "homeroom_teacher"])
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;
      setTeachers(data || []);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      setMessage({
        type: "error",
        text: "Gagal memuat data guru: " + error.message,
      });
    } finally {
      setLoadingTeachers(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedTeacher) {
      setMessage({
        type: "error",
        text: "Pilih guru terlebih dahulu",
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const today = new Date().toISOString().split("T")[0];
      const now = new Date();

      // Format TIME untuk database (HH:MM:SS)
      const clockInTime = now.toTimeString().split(" ")[0]; // "23:14:59"

      // Cek sudah absen hari ini atau belum
      const { data: existingAttendance, error: checkError } = await supabase
        .from("teacher_attendance")
        .select("*")
        .eq("teacher_id", selectedTeacher)
        .eq("attendance_date", today)
        .maybeSingle();

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError;
      }

      if (existingAttendance) {
        setMessage({
          type: "warning",
          text: "Guru ini sudah melakukan presensi hari ini",
        });
        setLoading(false);
        return;
      }

      // Get teacher_id dari users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("teacher_id")
        .eq("id", selectedTeacher)
        .single();

      if (userError) throw userError;

      if (!userData.teacher_id) {
        throw new Error("Teacher ID tidak ditemukan di data guru");
      }

      // Prepare data untuk insert
      const attendanceData = {
        teacher_id: userData.teacher_id, // Pake teacher_id dari users table
        attendance_date: today,
        status: status,
        clock_in: clockInTime, // Format TIME: "HH:MM:SS"
        check_in_method: "manual",
        notes: notes.trim() || null,
      };

      console.log("Inserting data:", attendanceData);

      // Insert attendance
      const { data: insertedData, error: insertError } = await supabase
        .from("teacher_attendance")
        .insert(attendanceData)
        .select();

      if (insertError) {
        console.error("Insert error:", insertError);
        throw insertError;
      }

      setMessage({
        type: "success",
        text: `✅ Presensi berhasil disimpan! Status: ${status.toUpperCase()}`,
      });

      // Reset form
      if (!isAdmin) {
        setStatus("Hadir");
      } else {
        setSelectedTeacher("");
        setStatus("Hadir");
      }
      setNotes("");

      // Trigger refresh di parent
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error submitting attendance:", error);
      setMessage({
        type: "error",
        text: `Gagal menyimpan presensi: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Input Manual Presensi
        </h3>
        <p className="text-sm text-gray-600">
          {isAdmin
            ? "Input presensi untuk guru (jika QR bermasalah)"
            : "Input presensi Anda secara manual"}
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

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Pilih Guru (hanya untuk admin) */}
        {isAdmin && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Pilih Guru
            </label>
            {loadingTeachers ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : (
              <select
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required>
                <option value="">-- Pilih Guru --</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.full_name} ({teacher.role})
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Status */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Status Kehadiran
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-all">
              <input
                type="radio"
                name="status"
                value="Hadir"
                checked={status === "Hadir"}
                onChange={(e) => setStatus(e.target.value)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="font-medium text-gray-700">Hadir</span>
            </label>
            <label className="flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-all">
              <input
                type="radio"
                name="status"
                value="Izin"
                checked={status === "Izin"}
                onChange={(e) => setStatus(e.target.value)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="font-medium text-gray-700">Izin</span>
            </label>
            <label className="flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-all">
              <input
                type="radio"
                name="status"
                value="Sakit"
                checked={status === "Sakit"}
                onChange={(e) => setStatus(e.target.value)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="font-medium text-gray-700">Sakit</span>
            </label>
            <label className="flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-all">
              <input
                type="radio"
                name="status"
                value="Alpa"
                checked={status === "Alpa"}
                onChange={(e) => setStatus(e.target.value)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="font-medium text-gray-700">Alpa</span>
            </label>
          </div>
        </div>

        {/* Catatan */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Catatan (Opsional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Tambahkan catatan jika diperlukan..."
            rows="3"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg">
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

      {/* Info untuk non-admin */}
      {!isAdmin && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>ℹ️ Info:</strong> Gunakan Scan QR untuk presensi yang lebih
            cepat. Input manual hanya untuk kondisi darurat.
          </p>
        </div>
      )}
    </div>
  );
};

export default ManualCheckIn;
