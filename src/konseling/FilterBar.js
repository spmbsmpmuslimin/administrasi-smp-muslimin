import React, { useState } from "react";
import { Search, Plus, Filter, X, ChevronDown, ChevronUp } from "lucide-react";

const FilterBar = ({
  filters,
  onFilterChange,
  onResetFilters,
  onOpenAddModal,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const hasActiveAdvancedFilters =
    filters.tingkat_urgensi ||
    filters.kategori_masalah ||
    filters.perlu_followup ||
    filters.tanggalAwal ||
    filters.tanggalAkhir;

  const activeFilterCount = [
    filters.tingkat_urgensi,
    filters.kategori_masalah,
    filters.perlu_followup,
    filters.tanggalAwal,
    filters.tanggalAkhir,
  ].filter(Boolean).length;

  const clearFilter = (field) => {
    onFilterChange(field, "");
  };

  // Helper untuk responsive icon size
  const getIconSize = () => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 640 ? 18 : 16;
    }
    return 16;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 mb-4 sm:mb-6 overflow-hidden">
      {/* Main Filter Bar - SINGLE ROW */}
      <div className="p-3 sm:p-4">
        <div className="flex flex-col xs:flex-row gap-2 sm:gap-3">
          {/* Search - Flexible Width */}
          <div className="flex-1 relative min-w-0">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
              size={getIconSize()}
            />
            <input
              type="text"
              placeholder="Cari nama siswa atau NIS..."
              value={filters.search}
              onChange={(e) => onFilterChange("search", e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-[44px] touch-target"
            />
          </div>

          {/* Quick Filter: Status */}
          <select
            value={filters.status}
            onChange={(e) => onFilterChange("status", e.target.value)}
            className="px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-900 text-sm min-w-[120px] sm:min-w-[140px] text-gray-800 dark:text-gray-200 min-h-[44px] touch-target">
            <option value="">Semua Status</option>
            <option value="Dalam Proses">Dalam Proses</option>
            <option value="Selesai">Selesai</option>
          </select>

          {/* Advanced Filter Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-medium flex items-center justify-center gap-1.5 sm:gap-2 transition-colors text-sm min-w-[120px] sm:min-w-[140px] min-h-[44px] touch-target ${
              showAdvanced || hasActiveAdvancedFilters
                ? "bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
            aria-expanded={showAdvanced}
            aria-label="Filter lanjutan">
            <Filter size={getIconSize() - 2} />
            <span className="whitespace-nowrap">Filter</span>
            {activeFilterCount > 0 && (
              <span className="bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                {activeFilterCount}
              </span>
            )}
            {showAdvanced ? (
              <ChevronUp size={getIconSize() - 2} />
            ) : (
              <ChevronDown size={getIconSize() - 2} />
            )}
          </button>

          {/* Tambah Data Button */}
          <button
            onClick={onOpenAddModal}
            className="px-3 sm:px-4 py-2.5 sm:py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 font-medium text-sm shadow-sm hover:shadow dark:shadow-gray-900 min-w-[120px] sm:min-w-[140px] min-h-[44px] touch-target"
            aria-label="Tambah data konseling">
            <Plus size={getIconSize()} />
            <span className="whitespace-nowrap">Tambah Data</span>
          </button>
        </div>

        {/* Active Filters Chips - Compact */}
        {(filters.search || filters.status) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {filters.search && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-md text-xs font-medium">
                <Search size={12} />
                <span className="truncate max-w-[120px] xs:max-w-none">
                  {filters.search}
                </span>
                <button
                  onClick={() => clearFilter("search")}
                  className="ml-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5 min-w-[24px] min-h-[24px] flex items-center justify-center touch-target"
                  aria-label="Hapus filter pencarian">
                  <X size={12} />
                </button>
              </span>
            )}
            {filters.status && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-md text-xs font-medium">
                Status: {filters.status}
                <button
                  onClick={() => clearFilter("status")}
                  className="ml-1 hover:bg-green-200 dark:hover:bg-green-800 rounded-full p-0.5 min-w-[24px] min-h-[24px] flex items-center justify-center touch-target"
                  aria-label="Hapus filter status">
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Advanced Filters - Collapsible */}
      {showAdvanced && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-3 sm:p-4">
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* Tingkat Urgensi */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Tingkat Urgensi
              </label>
              <select
                value={filters.tingkat_urgensi}
                onChange={(e) =>
                  onFilterChange("tingkat_urgensi", e.target.value)
                }
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-[44px] touch-target">
                <option value="">Semua Urgensi</option>
                <option value="Rendah">🟢 Rendah</option>
                <option value="Sedang">🟡 Sedang</option>
                <option value="Tinggi">🟠 Tinggi</option>
                <option value="Darurat">🔴 Darurat</option>
              </select>
            </div>

            {/* Kategori Masalah */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Kategori Masalah
              </label>
              <select
                value={filters.kategori_masalah}
                onChange={(e) =>
                  onFilterChange("kategori_masalah", e.target.value)
                }
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-[44px] touch-target">
                <option value="">Semua Kategori</option>
                <option value="Akademik">📚 Akademik</option>
                <option value="Perilaku">⚠️ Perilaku</option>
                <option value="Sosial-Emosional">😔 Sosial-Emosional</option>
                <option value="Pertemanan">👥 Pertemanan</option>
                <option value="Keluarga">🏠 Keluarga</option>
                <option value="Percintaan">💔 Percintaan</option>
                <option value="Teknologi/Gadget">📱 Teknologi/Gadget</option>
                <option value="Kenakalan">🚬 Kenakalan</option>
                <option value="Kesehatan Mental">🧠 Kesehatan Mental</option>
                <option value="Lainnya">📋 Lainnya</option>
              </select>
            </div>

            {/* Perlu Follow-up */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Follow-up
              </label>
              <select
                value={filters.perlu_followup}
                onChange={(e) =>
                  onFilterChange("perlu_followup", e.target.value)
                }
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-[44px] touch-target">
                <option value="">Semua</option>
                <option value="true">✅ Perlu Follow-up</option>
                <option value="false">❌ Tidak Perlu</option>
              </select>
            </div>

            {/* Date Range - Combined */}
            <div className="xs:col-span-2 md:col-span-1">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Periode Tanggal
              </label>
              <div className="flex flex-col xs:flex-row gap-2">
                <input
                  type="date"
                  value={filters.tanggalAwal}
                  onChange={(e) =>
                    onFilterChange("tanggalAwal", e.target.value)
                  }
                  className="flex-1 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-xs sm:text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-[44px] touch-target"
                  placeholder="Dari"
                />
                <input
                  type="date"
                  value={filters.tanggalAkhir}
                  onChange={(e) =>
                    onFilterChange("tanggalAkhir", e.target.value)
                  }
                  className="flex-1 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-xs sm:text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-[44px] touch-target"
                  placeholder="Sampai"
                />
              </div>
            </div>
          </div>

          {/* Advanced Filters Chips */}
          {hasActiveAdvancedFilters && (
            <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
              {filters.tingkat_urgensi && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 rounded-md text-xs font-medium">
                  Urgensi: {filters.tingkat_urgensi}
                  <button
                    onClick={() => clearFilter("tingkat_urgensi")}
                    className="ml-1 hover:bg-orange-200 dark:hover:bg-orange-800 rounded-full p-0.5 min-w-[24px] min-h-[24px] flex items-center justify-center touch-target"
                    aria-label="Hapus filter urgensi">
                    <X size={12} />
                  </button>
                </span>
              )}
              {filters.kategori_masalah && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-md text-xs font-medium">
                  Kategori: {filters.kategori_masalah}
                  <button
                    onClick={() => clearFilter("kategori_masalah")}
                    className="ml-1 hover:bg-purple-200 dark:hover:bg-purple-800 rounded-full p-0.5 min-w-[24px] min-h-[24px] flex items-center justify-center touch-target"
                    aria-label="Hapus filter kategori">
                    <X size={12} />
                  </button>
                </span>
              )}
              {filters.perlu_followup && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-md text-xs font-medium">
                  Follow-up:{" "}
                  {filters.perlu_followup === "true" ? "Ya" : "Tidak"}
                  <button
                    onClick={() => clearFilter("perlu_followup")}
                    className="ml-1 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-full p-0.5 min-w-[24px] min-h-[24px] flex items-center justify-center touch-target"
                    aria-label="Hapus filter follow-up">
                    <X size={12} />
                  </button>
                </span>
              )}
              {(filters.tanggalAwal || filters.tanggalAkhir) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-xs font-medium">
                  📅 {filters.tanggalAwal || "..."} -{" "}
                  {filters.tanggalAkhir || "..."}
                  <button
                    onClick={() => {
                      clearFilter("tanggalAwal");
                      clearFilter("tanggalAkhir");
                    }}
                    className="ml-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-0.5 min-w-[24px] min-h-[24px] flex items-center justify-center touch-target"
                    aria-label="Hapus filter tanggal">
                    <X size={12} />
                  </button>
                </span>
              )}
              <button
                onClick={onResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-md text-xs font-medium hover:bg-red-200 dark:hover:bg-red-800 min-h-[36px] touch-target"
                aria-label="Reset semua filter">
                <X size={12} />
                Reset Semua Filter
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterBar;
