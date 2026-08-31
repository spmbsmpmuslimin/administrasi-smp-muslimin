// feedback/FeedbackSiswaTab.js
// Tab admin buat baca "Saran/Masukan" yang dikirim siswa dari
// StudentSaran.js (portal siswa) -- tabel `saran_masukan`.
//
// ⚠️ Ini BUKAN gantiin komponen punya wali kelas (SaranMasukanSiswa) yang
// udah ada -- punya wali kelas itu scope-nya cuma kelas dia sendiri.
// Tab ini scope-nya ADMIN: nampilin saran dari SEMUA kelas sekaligus, buat
// jaga-jaga kalau ada saran yang lebih cocok ditangani admin (misal soal
// aplikasi) ketimbang wali kelas (soal kelas).
//
// Nama siswa pengirim di-gabung manual lewat query terpisah ke tabel
// `students` (bukan lewat join foreign-key di select()), soalnya nama
// constraint FK-nya belum pasti -- lebih aman gini daripada nebak nama FK
// dan query-nya gagal diam-diam.
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import { Loader2 } from "lucide-react";

const STATUS_META = {
  baru: {
    label: "Baru",
    badge:
      "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  },
  dibaca: {
    label: "Dibaca",
    badge:
      "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  ditindaklanjuti: {
    label: "Ditindaklanjuti",
    badge:
      "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
};

const formatDateTime = (iso) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function FeedbackSiswaTab({ showToast }) {
  const [saran, setSaran] = useState([]);
  const [studentMap, setStudentMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchSaran = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("saran_masukan")
        .select("id, student_id, class_id, message, status, created_at")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (classFilter !== "all") {
        query = query.eq("class_id", classFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = data || [];
      setSaran(rows);

      // Ambil nama siswa pengirim lewat query terpisah, biar ga gantung
      // sama nama FK constraint yang belum pasti.
      const studentIds = [...new Set(rows.map((r) => r.student_id).filter(Boolean))];
      if (studentIds.length > 0) {
        const { data: studentRows, error: studentErr } = await supabase
          .from("students")
          .select("id, full_name, nis")
          .in("id", studentIds);
        if (studentErr) throw studentErr;

        const map = {};
        (studentRows || []).forEach((s) => {
          map[s.id] = s;
        });
        setStudentMap(map);
      } else {
        setStudentMap({});
      }
    } catch (err) {
      console.error("[FeedbackSiswaTab] Gagal memuat saran siswa:", err);
      showToast && showToast("Gagal memuat saran siswa", "error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, classFilter, showToast]);

  useEffect(() => {
    fetchSaran();
  }, [fetchSaran]);

  const updateStatus = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from("saran_masukan")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;

      showToast && showToast("Status berhasil diupdate", "success");
      fetchSaran();
    } catch (err) {
      console.error("[FeedbackSiswaTab] Gagal update status:", err);
      showToast && showToast("Gagal update status", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteSaran = async (id) => {
    if (!window.confirm("Yakin ingin menghapus saran ini?")) return;

    setDeletingId(id);
    try {
      const { error } = await supabase.from("saran_masukan").delete().eq("id", id);
      if (error) throw error;

      showToast && showToast("Saran berhasil dihapus", "success");
      fetchSaran();
    } catch (err) {
      console.error("[FeedbackSiswaTab] Gagal menghapus saran:", err);
      showToast && showToast("Gagal menghapus saran", "error");
    } finally {
      setDeletingId(null);
    }
  };

  // Daftar kelas buat dropdown filter, diambil dari data yang lagi tampil
  // (bukan query terpisah ke tabel classes) -- lebih simpel & otomatis
  // cuma nampilin kelas yang emang ada saran-nya.
  const classOptions = [...new Set(saran.map((s) => s.class_id).filter(Boolean))].sort();

  const stats = {
    total: saran.length,
    baru: saran.filter((s) => s.status === "baru").length,
    dibaca: saran.filter((s) => s.status === "dibaca").length,
    ditindaklanjuti: saran.filter((s) => s.status === "ditindaklanjuti").length,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="animate-spin text-blue-600 dark:text-blue-500" size={40} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
          💬 Saran dari Siswa
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Masukan yang dikirim siswa dari portal siswa, dari semua kelas
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-gray-700 rounded-lg shadow-sm p-3 sm:p-4 border border-gray-200 dark:border-gray-600">
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">
            Total Saran
          </div>
          <div className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
            {stats.total}
          </div>
        </div>
        <div className="bg-rose-50 dark:bg-rose-900/20 rounded-lg shadow-sm p-3 sm:p-4 border border-rose-200 dark:border-rose-800">
          <div className="text-xs sm:text-sm text-rose-700 dark:text-rose-400 mb-1">🆕 Baru</div>
          <div className="text-xl sm:text-2xl font-bold text-rose-800 dark:text-rose-300">
            {stats.baru}
          </div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg shadow-sm p-3 sm:p-4 border border-amber-200 dark:border-amber-800">
          <div className="text-xs sm:text-sm text-amber-700 dark:text-amber-400 mb-1">
            👀 Dibaca
          </div>
          <div className="text-xl sm:text-2xl font-bold text-amber-800 dark:text-amber-300">
            {stats.dibaca}
          </div>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg shadow-sm p-3 sm:p-4 border border-emerald-200 dark:border-emerald-800">
          <div className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 mb-1">
            ✅ Ditindaklanjuti
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-800 dark:text-emerald-300">
            {stats.ditindaklanjuti}
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
              <option value="baru">🆕 Baru</option>
              <option value="dibaca">👀 Dibaca</option>
              <option value="ditindaklanjuti">✅ Ditindaklanjuti</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter Kelas
            </label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">Semua Kelas</option>
              {classOptions.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Saran List */}
      <div className="space-y-4">
        {saran.length === 0 ? (
          <div className="bg-white dark:bg-gray-700 rounded-lg shadow-sm p-12 text-center border border-gray-200 dark:border-gray-600">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-500 dark:text-gray-400">Belum ada saran dari siswa</p>
          </div>
        ) : (
          saran.map((item) => {
            const meta = STATUS_META[item.status] || STATUS_META.baru;
            const student = studentMap[item.student_id];

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-700 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-600"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium border ${meta.badge}`}
                      >
                        {meta.label}
                      </span>
                      {item.class_id && (
                        <span className="text-xs px-2 py-1 rounded-full font-medium border bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800">
                          Kelas {item.class_id}
                        </span>
                      )}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {student?.full_name || "Siswa (data tidak ditemukan)"}
                      </span>
                      {student?.nis && (
                        <>
                          <span className="text-gray-400 dark:text-gray-500 mx-2">•</span>
                          <span>NIS: {student.nis}</span>
                        </>
                      )}
                      <span className="text-gray-400 dark:text-gray-500 mx-2">•</span>
                      <span>{formatDateTime(item.created_at)}</span>
                    </div>
                  </div>
                </div>

                <p className="text-sm sm:text-base text-gray-800 dark:text-gray-200 mb-4 whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  {item.message}
                </p>

                <div className="flex flex-wrap gap-2">
                  {item.status !== "dibaca" && (
                    <button
                      onClick={() => updateStatus(item.id, "dibaca")}
                      disabled={updatingId === item.id}
                      className="px-3 py-1.5 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      👀 Tandai Dibaca
                    </button>
                  )}
                  {item.status !== "ditindaklanjuti" && (
                    <button
                      onClick={() => updateStatus(item.id, "ditindaklanjuti")}
                      disabled={updatingId === item.id}
                      className="px-3 py-1.5 text-xs sm:text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      ✅ Tandai Ditindaklanjuti
                    </button>
                  )}
                  <button
                    onClick={() => deleteSaran(item.id)}
                    disabled={deletingId === item.id}
                    className="px-3 py-1.5 text-xs sm:text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors ml-auto disabled:opacity-50"
                  >
                    🗑️ Hapus
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
