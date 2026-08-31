//[file name]: HomeVisitTable.js
import React from "react";
import { Eye, Pencil, Trash2, Home } from "lucide-react";

const formatTanggal = (isoStr) => {
  if (!isoStr) return "-";
  return new Date(isoStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const statusBadgeClass = (status) => {
  switch (status) {
    case "Terjadwal":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    case "Selesai":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
    case "Perlu Tindak Lanjut":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300";
    case "Dibatalkan":
      return "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const HomeVisitTable = ({ data, darkMode = false, onDetail, onEdit, onDelete }) => {
  const cardBg = darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200";

  if (data.length === 0) {
    return (
      <div
        className={`rounded-xl border-2 border-dashed p-10 text-center ${
          darkMode ? "border-gray-700 bg-gray-800/50" : "border-gray-300 bg-white"
        }`}
      >
        <Home
          size={32}
          className={`mx-auto mb-2 ${darkMode ? "text-gray-600" : "text-gray-300"}`}
        />
        <p className="font-semibold mb-1">Tidak ada data Home Visit</p>
        <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
          Coba ubah kata kunci pencarian atau filter.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className={`hidden md:block rounded-xl border overflow-hidden ${cardBg}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={darkMode ? "bg-gray-900/60" : "bg-gray-50"}>
                <th className="text-left font-semibold px-4 py-3 whitespace-nowrap">Siswa</th>
                <th className="text-left font-semibold px-4 py-3 whitespace-nowrap">Kelas</th>
                <th className="text-left font-semibold px-4 py-3 whitespace-nowrap hidden lg:table-cell">
                  Tanggal
                </th>
                <th className="text-left font-semibold px-4 py-3 whitespace-nowrap hidden lg:table-cell">
                  Alasan
                </th>
                <th className="text-center font-semibold px-4 py-3 whitespace-nowrap">Status</th>
                <th className="text-right font-semibold px-4 py-3 whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? "divide-gray-700" : "divide-gray-100"}`}>
              {data.map((item) => (
                <tr
                  key={item.id}
                  className={darkMode ? "hover:bg-gray-700/40" : "hover:bg-gray-50"}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{item.nama_siswa}</p>
                    {item.nis && (
                      <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                        NIS: {item.nis}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">{item.kelas}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {formatTanggal(item.tanggal_kunjungan)}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell max-w-xs">
                    <p className="truncate">{item.alasan}</p>
                    <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {item.kategori_permasalahan}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onDetail(item)}
                        className={`p-2 rounded-lg transition-colors ${
                          darkMode
                            ? "hover:bg-gray-700 text-gray-300"
                            : "hover:bg-gray-100 text-gray-600"
                        }`}
                        title="Lihat Detail"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => onEdit(item)}
                        className={`p-2 rounded-lg transition-colors ${
                          darkMode
                            ? "hover:bg-gray-700 text-blue-300"
                            : "hover:bg-blue-50 text-blue-600"
                        }`}
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(item)}
                        className={`p-2 rounded-lg transition-colors ${
                          darkMode
                            ? "hover:bg-gray-700 text-red-300"
                            : "hover:bg-red-50 text-red-600"
                        }`}
                        title="Hapus"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {data.map((item) => (
          <div key={item.id} className={`rounded-xl border p-4 ${cardBg}`}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <p className="font-semibold break-words">{item.nama_siswa}</p>
                <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Kelas {item.kelas} {item.nis ? `· NIS ${item.nis}` : ""}
                </p>
              </div>
              <span
                className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(
                  item.status
                )}`}
              >
                {item.status}
              </span>
            </div>

            <div
              className={`text-xs mb-3 space-y-0.5 ${darkMode ? "text-gray-300" : "text-gray-600"}`}
            >
              <p>
                <span className="font-medium">Tanggal:</span>{" "}
                {formatTanggal(item.tanggal_kunjungan)}
              </p>
              <p>
                <span className="font-medium">Alasan:</span> {item.alasan}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onDetail(item)}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors touch-manipulation active:scale-95 ${
                  darkMode
                    ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Eye size={14} />
                Detail
              </button>
              <button
                onClick={() => onEdit(item)}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors touch-manipulation active:scale-95 ${
                  darkMode
                    ? "bg-gray-700 text-blue-300 hover:bg-gray-600"
                    : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                }`}
              >
                <Pencil size={14} />
                Edit
              </button>
              <button
                onClick={() => onDelete(item)}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors touch-manipulation active:scale-95 ${
                  darkMode
                    ? "bg-gray-700 text-red-300 hover:bg-gray-600"
                    : "bg-red-50 text-red-600 hover:bg-red-100"
                }`}
              >
                <Trash2 size={14} />
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default HomeVisitTable;
