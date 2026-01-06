import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function FeedbackGuru({ guruId }) {
  const [kategori, setKategori] = useState("Saran");
  const [pesan, setPesan] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!pesan.trim()) {
      setError("Pesan tidak boleh kosong");
      return;
    }

    setLoading(true);
    setSuccess(false);
    setError(null);

    try {
      const { error: supabaseError } = await supabase.from("feedback_guru").insert({
        guru_id: guruId,
        kategori,
        pesan: pesan.trim(),
        halaman: "dashboard_guru",
        status: "pending",
        created_at: new Date().toISOString(),
      });

      if (supabaseError) throw supabaseError;

      setPesan("");
      setSuccess(true);

      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      console.error("Error submitting feedback:", err);
      setError("Gagal mengirim masukan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 border border-slate-200 dark:border-slate-700">
      <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">💬 Saran & Masukan</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
        Bantu Kami Membuat Aplikasi Ini Lebih Mudah Untuk Digunakan
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Kategori
          </label>
          <select
            value={kategori}
            onChange={(e) => setKategori(e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="Saran">💡 Saran</option>
            <option value="Bug">🐛 Bug / Error</option>
            <option value="UI">🎨 Tampilan / UI</option>
            <option value="Fitur">✨ Permintaan Fitur</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Pesan
          </label>
          <textarea
            value={pesan}
            onChange={(e) => {
              setPesan(e.target.value);
              setError(null);
              // Auto-expand
              e.target.style.height = "auto";
              e.target.style.height = e.target.scrollHeight + "px";
            }}
            onInput={(e) => {
              // Auto-expand saat typing
              e.target.style.height = "auto";
              e.target.style.height = e.target.scrollHeight + "px";
            }}
            placeholder="Tuliskan kendala atau saran Anda di sini..."
            className={`w-full border rounded-lg px-3 py-2 text-sm min-h-[96px] max-h-[400px] overflow-y-auto bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 ${
              error
                ? "border-red-300 focus:ring-red-500"
                : "border-slate-300 dark:border-slate-600 focus:ring-blue-500"
            } focus:border-transparent`}
            style={{ resize: "none" }}
            rows={3}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !pesan.trim()}
          className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Mengirim..." : "Kirim Masukan"}
        </button>

        {success && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm text-green-700 dark:text-green-300 flex items-start gap-2">
            <span className="text-base">✅</span>
            <span>Terima kasih! Masukan Anda sudah terkirim.</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
            <span className="text-base">⚠️</span>
            <span>{error}</span>
          </div>
        )}
      </form>
    </div>
  );
}
