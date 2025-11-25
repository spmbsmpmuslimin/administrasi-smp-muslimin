// src/attendance-teacher/ManualCheckIn.js
import React, { useState } from "react";
import { Calendar, Clock, Save, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "../supabaseClient";

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

  const statusOptions = [
    { value: "Hadir", label: "Hadir", color: "bg-green-500" },
    { value: "Izin", label: "Izin", color: "bg-blue-500" },
    { value: "Sakit", label: "Sakit", color: "bg-yellow-500" },
    { value: "Alpa", label: "Alpha", color: "bg-red-500" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
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

      // Jika sudah ada, update. Jika belum, insert
      if (existingAttendance) {
        // UPDATE existing attendance
        const { error: updateError } = await supabase
          .from("teacher_attendance")
          .update({
            status: formData.status,
            clock_in: formData.clockIn + ":00", // Format TIME: HH:MM:SS
            check_in_method: "manual",
            notes: formData.notes || null,
            updated_at: new Date().toISOString(),
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
            check_in_method: "manual",
            notes: formData.notes || null,
          });

        if (insertError) throw insertError;

        setMessage({
          type: "success",
          text: `✅ Presensi tanggal ${formData.date} berhasil disimpan!`,
        });
      }

      // Trigger refresh di parent
      if (onSuccess) onSuccess();

      // Reset form to today
      setFormData({
        date: today,
        status: "Hadir",
        clockIn: now,
        notes: "",
      });
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

      {/* Message Alert */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-start gap-3 ${
            message.type === "success"
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}>
          {message.type === "success" ? (
            <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
          ) : (
            <XCircle className="text-red-600 flex-shrink-0" size={24} />
          )}
          <p
            className={`text-sm font-medium ${
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

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>💡 Tips:</strong> Jika sudah ada presensi di tanggal yang
          dipilih, data akan diupdate. Jika belum ada, akan membuat presensi
          baru.
        </p>
      </div>
    </div>
  );
};

export default ManualCheckIn;
