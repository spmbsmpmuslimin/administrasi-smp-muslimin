// students/StudentSaran.js
//
// Isi menu "Saran/Masukan" di halaman Akun siswa — "kotak saran": siswa
// nulis & kirim pesan ke wali kelas, disimpen ke tabel `saran_masukan`
// (tabel yang sama yang dibaca guru lewat komponen SaranMasukanSiswa
// punya guru — file itu TERPISAH, jangan disatuin lagi ke sini, karena
// itu nampilin saran SEMUA siswa sekelas + bisa ubah status, yang gak
// boleh keliatan/diutak-atik siswa).
//
// Siswa cuma bisa: kirim saran baru, dan liat riwayat saran DIA SENDIRI
// (read-only, gak bisa ubah status — itu hak wali kelas).
import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Loader2, Send } from "lucide-react";

const STATUS_META = {
  baru: { label: "Baru", badge: "bg-rose-100 text-rose-700" },
  dibaca: { label: "Dibaca", badge: "bg-amber-100 text-amber-700" },
  ditindaklanjuti: {
    label: "Ditindaklanjuti",
    badge: "bg-emerald-100 text-emerald-700",
  },
};

const formatDateTime = (iso) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function StudentSaran({ student }) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = useCallback(async () => {
    if (!student?.id) return;
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("saran_masukan")
        .select("id, message, status, created_at")
        .eq("student_id", student.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error("[StudentSaran] Gagal ambil riwayat saran:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, [student?.id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);

    if (!student?.id) {
      setSubmitError("Sesi tidak ketemu, silakan login ulang.");
      return;
    }
    if (!message.trim()) {
      setSubmitError("Tulis dulu saran/masukannya ya.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("saran_masukan").insert({
        student_id: student.id,
        class_id: student.homeroom_class_id,
        message: message.trim(),
        status: "baru",
      });

      if (error) throw error;

      setMessage("");
      setSubmitSuccess(true);
      loadHistory();
    } catch (err) {
      console.error("[StudentSaran] Gagal kirim saran:", err);
      setSubmitError("Gagal mengirim saran. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Form kirim saran baru */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {submitError && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-3 py-2 rounded-lg text-sm">
            {submitError}
          </div>
        )}
        {submitSuccess && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-3 py-2 rounded-lg text-sm">
            Saran berhasil dikirim ke wali kelas.
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-theme-secondary mb-1">
            Tulis Saran/Masukan
          </label>
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tulis saran atau masukan buat wali kelas di sini..."
            className="w-full text-sm text-theme bg-theme-bg border border-theme rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 focus:border-blue-300"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-60"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {submitting ? "Mengirim..." : "Kirim Saran"}
        </button>
      </form>

      {/* Riwayat saran yang pernah dikirim siswa ini sendiri */}
      <div>
        <h3 className="text-sm font-semibold text-theme-secondary mb-2">Riwayat Saran Kamu</h3>

        {loadingHistory ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-theme-secondary text-center py-6">Belum ada saran yang dikirim.</p>
        ) : (
          <div className="space-y-2.5">
            {history.map((item) => {
              const meta = STATUS_META[item.status] || STATUS_META.baru;
              return (
                <div key={item.id} className="p-3 bg-theme-surface rounded-xl border border-gray-100">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm text-theme-secondary">{formatDateTime(item.created_at)}</span>
                    <span
                      className={`text-sm font-bold px-2 py-0.5 rounded-full shrink-0 ${meta.badge}`}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-sm text-theme-secondary">{item.message}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
