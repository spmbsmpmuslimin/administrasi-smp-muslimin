import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function FeedbackGuruTab({ showToast }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [kategoriFilter, setKategoriFilter] = useState("all");

  useEffect(() => {
    fetchFeedbacks();
  }, [statusFilter, kategoriFilter]);

  async function fetchFeedbacks() {
    setLoading(true);

    let query = supabase
      .from("feedback_guru")
      .select(
        `
        *,
        guru:users!feedback_guru_guru_id_fkey (
          full_name,
          username
        )
      `
      )
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    if (kategoriFilter !== "all") {
      query = query.eq("kategori", kategoriFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching feedback:", error);
      if (showToast) showToast("Gagal memuat feedback", "error");
    } else {
      setFeedbacks(data || []);
    }

    setLoading(false);
  }

  async function updateStatus(id, newStatus) {
    const { error } = await supabase
      .from("feedback_guru")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      if (showToast) showToast("Gagal update status", "error");
    } else {
      if (showToast) showToast("Status berhasil diupdate", "success");
      fetchFeedbacks();
    }
  }

  async function deleteFeedback(id) {
    if (!window.confirm("Yakin ingin menghapus feedback ini?")) return;

    const { error } = await supabase.from("feedback_guru").delete().eq("id", id);

    if (error) {
      if (showToast) showToast("Gagal menghapus feedback", "error");
    } else {
      if (showToast) showToast("Feedback berhasil dihapus", "success");
      fetchFeedbacks();
    }
  }

  const getKategoriColor = (kategori) => {
    const colors = {
      Saran:
        "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      Bug: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
      UI: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
      Fitur:
        "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
    };
    return (
      colors[kategori] ||
      "bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800"
    );
  };

  const getStatusColor = (status) => {
    const colors = {
      pending:
        "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
      reviewed:
        "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      resolved:
        "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
    };
    return (
      colors[status] ||
      "bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800"
    );
  };

  const stats = {
    total: feedbacks.length,
    pending: feedbacks.filter((f) => f.status === "pending").length,
    reviewed: feedbacks.filter((f) => f.status === "reviewed").length,
    resolved: feedbacks.filter((f) => f.status === "resolved").length,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
          💬 Feedback dari Guru
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Kelola masukan, saran, dan laporan bug dari guru-guru
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-gray-700 rounded-lg shadow-sm p-3 sm:p-4 border border-gray-200 dark:border-gray-600">
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">
            Total Feedback
          </div>
          <div className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
            {stats.total}
          </div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg shadow-sm p-3 sm:p-4 border border-yellow-200 dark:border-yellow-800">
          <div className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-400 mb-1">
            ⏳ Pending
          </div>
          <div className="text-xl sm:text-2xl font-bold text-yellow-800 dark:text-yellow-300">
            {stats.pending}
          </div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow-sm p-3 sm:p-4 border border-blue-200 dark:border-blue-800">
          <div className="text-xs sm:text-sm text-blue-700 dark:text-blue-400 mb-1">
            👀 Reviewed
          </div>
          <div className="text-xl sm:text-2xl font-bold text-blue-800 dark:text-blue-300">
            {stats.reviewed}
          </div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg shadow-sm p-3 sm:p-4 border border-green-200 dark:border-green-800">
          <div className="text-xs sm:text-sm text-green-700 dark:text-green-400 mb-1">
            ✅ Resolved
          </div>
          <div className="text-xl sm:text-2xl font-bold text-green-800 dark:text-green-300">
            {stats.resolved}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-700 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-600">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">Semua Status</option>
              <option value="pending">⏳ Pending</option>
              <option value="reviewed">👀 Reviewed</option>
              <option value="resolved">✅ Resolved</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter Kategori
            </label>
            <select
              value={kategoriFilter}
              onChange={(e) => setKategoriFilter(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">Semua Kategori</option>
              <option value="Saran">💡 Saran</option>
              <option value="Bug">🐛 Bug</option>
              <option value="UI">🎨 UI</option>
              <option value="Fitur">✨ Fitur</option>
            </select>
          </div>
        </div>
      </div>

      {/* Feedback List */}
      <div className="space-y-4">
        {feedbacks.length === 0 ? (
          <div className="bg-white dark:bg-gray-700 rounded-lg shadow-sm p-12 text-center border border-gray-200 dark:border-gray-600">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-500 dark:text-gray-400">Belum ada feedback</p>
          </div>
        ) : (
          feedbacks.map((feedback) => (
            <div
              key={feedback.id}
              className="bg-white dark:bg-gray-700 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-600"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium border ${getKategoriColor(
                        feedback.kategori
                      )}`}
                    >
                      {feedback.kategori}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium border ${getStatusColor(
                        feedback.status
                      )}`}
                    >
                      {feedback.status}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {feedback.guru?.full_name || "Unknown"}
                    </span>
                    <span className="text-gray-400 dark:text-gray-500 mx-2">•</span>
                    <span>{feedback.guru?.username || ""}</span>
                    <span className="text-gray-400 dark:text-gray-500 mx-2">•</span>
                    <span>
                      {new Date(feedback.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-sm sm:text-base text-gray-800 dark:text-gray-200 mb-4 whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                {feedback.pesan}
              </p>

              <div className="flex flex-wrap gap-2">
                {feedback.status !== "reviewed" && (
                  <button
                    onClick={() => updateStatus(feedback.id, "reviewed")}
                    className="px-3 py-1.5 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    👀 Mark as Reviewed
                  </button>
                )}
                {feedback.status !== "resolved" && (
                  <button
                    onClick={() => updateStatus(feedback.id, "resolved")}
                    className="px-3 py-1.5 text-xs sm:text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    ✅ Mark as Resolved
                  </button>
                )}
                <button
                  onClick={() => deleteFeedback(feedback.id)}
                  className="px-3 py-1.5 text-xs sm:text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors ml-auto"
                >
                  🗑️ Hapus
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
