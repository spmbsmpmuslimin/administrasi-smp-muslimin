import React from "react";
import {
  Edit3,
  Trash2,
  Eye,
  FileText,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { Clock, CheckCircle, XCircle } from "lucide-react";

const KonselingTable = ({
  data,
  loading,
  onView,
  onEdit,
  onDelete,
  onExportPDF,
}) => {
  // Status Badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      "Dalam Proses": {
        color:
          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
        icon: Clock,
        label: "Dalam Proses",
      },
      Selesai: {
        color:
          "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        icon: CheckCircle,
        label: "Selesai",
      },
      Dibatalkan: {
        color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        icon: XCircle,
        label: "Dibatalkan",
      },
    };

    const config = statusConfig[status] || statusConfig["Dalam Proses"];
    const IconComponent = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <IconComponent size={12} />
        {config.label}
      </span>
    );
  };

  // ✅ NEW: Urgency Badge
  const getUrgencyBadge = (urgency) => {
    const urgencyConfig = {
      Darurat: {
        color:
          "bg-red-100 text-red-800 border border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
        emoji: "🔴",
        label: "Darurat",
      },
      Tinggi: {
        color:
          "bg-orange-100 text-orange-800 border border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700",
        emoji: "🟠",
        label: "Tinggi",
      },
      Sedang: {
        color:
          "bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700",
        emoji: "🟡",
        label: "Sedang",
      },
      Rendah: {
        color:
          "bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
        emoji: "🟢",
        label: "Rendah",
      },
    };

    const config = urgencyConfig[urgency] || urgencyConfig["Sedang"];

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${config.color}`}>
        <span>{config.emoji}</span>
        {config.label}
      </span>
    );
  };

  // ✅ NEW: Category Badge
  const getCategoryBadge = (category) => {
    const categoryConfig = {
      Akademik: {
        color:
          "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        emoji: "📚",
      },
      Perilaku: {
        color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        emoji: "⚠️",
      },
      "Sosial-Emosional": {
        color:
          "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
        emoji: "😔",
      },
      Pertemanan: {
        color:
          "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
        emoji: "👥",
      },
      Keluarga: {
        color:
          "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
        emoji: "🏠",
      },
      Percintaan: {
        color:
          "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
        emoji: "💔",
      },
      "Teknologi/Gadget": {
        color:
          "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
        emoji: "📱",
      },
      Kenakalan: {
        color: "bg-gray-700 text-white dark:bg-gray-800 dark:text-gray-200",
        emoji: "🚬",
      },
      "Kesehatan Mental": {
        color:
          "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
        emoji: "🧠",
      },
      Lainnya: {
        color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
        emoji: "📋",
      },
    };

    const config = categoryConfig[category] || categoryConfig["Lainnya"];

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${config.color}`}>
        <span>{config.emoji}</span>
        {category}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-4 sm:px-6 py-8 text-center">
          <div className="flex justify-center">
            <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 dark:border-blue-800 dark:border-t-blue-400 rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm sm:text-base">
            Memuat data...
          </p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-4 sm:px-6 py-8 text-center text-gray-500 dark:text-gray-400 text-sm sm:text-base">
          Tidak ada data konseling yang ditemukan
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {/* Mobile Card View */}
      <div className="block lg:hidden">
        {data.map((item) => (
          <div
            key={item.id}
            className="border-b border-gray-200 dark:border-gray-700 p-4 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors">
            {/* Header Row */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                    {item.full_name}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {getStatusBadge(item.status_layanan)}
                    {item.perlu_followup && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 rounded-full text-xs font-medium border border-purple-300 dark:border-purple-700"
                        title="Perlu Follow-up">
                        <Calendar size={10} />
                        Follow-up
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                  NIS: {item.nis} | Kelas: {item.class_id}
                </p>
              </div>

              {/* Action Buttons - Mobile */}
              <div className="flex gap-1 ml-2">
                <button
                  onClick={() => onView(item)}
                  className="p-2 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                  title="Lihat Detail"
                  aria-label="Lihat Detail">
                  <Eye size={16} />
                </button>
                <button
                  onClick={() => onExportPDF(item)}
                  className="p-2 text-purple-600 hover:bg-purple-100 dark:text-purple-400 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                  title="Export PDF"
                  aria-label="Export PDF">
                  <FileText size={16} />
                </button>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Tanggal
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(item.tanggal).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                {item.perlu_followup && item.tanggal_followup && (
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 flex items-center gap-1">
                    <Calendar size={10} />
                    {new Date(item.tanggal_followup).toLocaleDateString(
                      "id-ID",
                      {
                        day: "numeric",
                        month: "short",
                      }
                    )}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Urgensi
                </p>
                <div className="text-sm">
                  {getUrgencyBadge(item.tingkat_urgensi)}
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Kategori
                </p>
                <div className="text-sm">
                  {getCategoryBadge(item.kategori_masalah)}
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Layanan
                </p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {item.jenis_layanan}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {item.bidang_bimbingan}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Guru BK
                </p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {item.guru_bk_name}
                </p>
              </div>
            </div>

            {/* Bottom Action Buttons */}
            <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => onEdit(item)}
                className="flex-1 py-2 px-3 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                aria-label="Edit Konseling">
                <Edit3 size={14} />
                Edit
              </button>
              <button
                onClick={() => onDelete(item.id, item.full_name)}
                className="flex-1 py-2 px-3 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                aria-label="Hapus Konseling">
                <Trash2 size={14} />
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full min-w-[1200px]">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Siswa
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Tanggal
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Urgensi
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Kategori
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Layanan
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Guru BK
              </th>
              <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {data.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-4 py-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      {item.full_name}
                      {/* ✅ NEW: Follow-up Badge */}
                      {item.perlu_followup && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 rounded-full text-xs font-medium border border-purple-300 dark:border-purple-700"
                          title="Perlu Follow-up">
                          <Calendar size={10} />
                          Follow-up
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      NIS: {item.nis} | Kelas: {item.class_id}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(item.tanggal).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                  {item.perlu_followup && item.tanggal_followup && (
                    <div className="text-xs text-purple-600 dark:text-purple-400 mt-1 flex items-center gap-1">
                      <Calendar size={10} />
                      {new Date(item.tanggal_followup).toLocaleDateString(
                        "id-ID",
                        {
                          day: "numeric",
                          month: "short",
                        }
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {getUrgencyBadge(item.tingkat_urgensi)}
                </td>
                <td className="px-4 py-4">
                  {getCategoryBadge(item.kategori_masalah)}
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {item.jenis_layanan}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {item.bidang_bimbingan}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {getStatusBadge(item.status_layanan)}
                </td>
                <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                  {item.guru_bk_name}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => onView(item)}
                      className="p-2 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                      title="Lihat Detail"
                      aria-label="Lihat Detail">
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => onEdit(item)}
                      className="p-2 text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                      title="Edit"
                      aria-label="Edit">
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => onExportPDF(item)}
                      className="p-2 text-purple-600 hover:bg-purple-100 dark:text-purple-400 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                      title="Export PDF"
                      aria-label="Export PDF">
                      <FileText size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(item.id, item.full_name)}
                      className="p-2 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      title="Hapus"
                      aria-label="Hapus">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 py-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <span className="text-sm sm:text-base">
            Total:{" "}
            <strong className="text-gray-900 dark:text-white">
              {data.length}
            </strong>{" "}
            data konseling
          </span>
          <div className="flex flex-wrap gap-3 text-xs sm:text-sm">
            <span className="flex items-center gap-1">
              🔴 Darurat:{" "}
              <strong className="text-gray-900 dark:text-white">
                {data.filter((d) => d.tingkat_urgensi === "Darurat").length}
              </strong>
            </span>
            <span className="flex items-center gap-1">
              📅 Follow-up:{" "}
              <strong className="text-gray-900 dark:text-white">
                {data.filter((d) => d.perlu_followup).length}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KonselingTable;
