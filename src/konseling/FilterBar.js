import React from 'react';
import { Search, Plus, RotateCcw } from 'lucide-react';

const FilterBar = ({ 
  filters, 
  onFilterChange, 
  onResetFilters, 
  onOpenAddModal 
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-6">
      {/* Row 1: Search & Main Actions */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end justify-between mb-4">
        <div className="flex flex-col lg:flex-row gap-4 flex-1 w-full">
          {/* Search */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔍 Cari Siswa
            </label>
            <div className="relative">
              <input
                type="text"
                value={filters.search}
                onChange={(e) => onFilterChange('search', e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Cari berdasarkan nama atau NIS..."
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Tingkat Urgensi - NEW! */}
          <div className="w-full lg:w-52">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ⚠️ Tingkat Urgensi
            </label>
            <select
              value={filters.tingkat_urgensi}
              onChange={(e) => onFilterChange('tingkat_urgensi', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Urgensi</option>
              <option value="Rendah">🟢 Rendah</option>
              <option value="Sedang">🟡 Sedang</option>
              <option value="Tinggi">🟠 Tinggi</option>
              <option value="Darurat">🔴 Darurat</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="w-full lg:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📊 Status Layanan
            </label>
            <select
              value={filters.status}
              onChange={(e) => onFilterChange('status', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Status</option>
              <option value="Dalam Proses">⏳ Dalam Proses</option>
              <option value="Selesai">✅ Selesai</option>
              <option value="Dibatalkan">❌ Dibatalkan</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 w-full lg:w-auto">
          <button
            onClick={onResetFilters}
            className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
          >
            <RotateCcw size={16} />
            Reset
          </button>
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-md hover:shadow-lg"
          >
            <Plus size={18} />
            Tambah Data
          </button>
        </div>
      </div>

      {/* Row 2: Additional Filters */}
      <div className="border-t border-gray-200 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Kategori Masalah - NEW! */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📂 Kategori Masalah
            </label>
            <select
              value={filters.kategori_masalah}
              onChange={(e) => onFilterChange('kategori_masalah', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
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

          {/* Perlu Follow-up - NEW! */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📅 Follow-up
            </label>
            <select
              value={filters.perlu_followup}
              onChange={(e) => onFilterChange('perlu_followup', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Semua</option>
              <option value="true">✅ Perlu Follow-up</option>
              <option value="false">❌ Tidak Perlu</option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📅 Tanggal Awal
            </label>
            <input
              type="date"
              value={filters.tanggalAwal}
              onChange={(e) => onFilterChange('tanggalAwal', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📅 Tanggal Akhir
            </label>
            <input
              type="date"
              value={filters.tanggalAkhir}
              onChange={(e) => onFilterChange('tanggalAkhir', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Active Filters Indicator */}
      {(filters.search || filters.tingkat_urgensi || filters.status || 
        filters.kategori_masalah || filters.perlu_followup || 
        filters.tanggalAwal || filters.tanggalAkhir) && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">Filter Aktif:</span>
            {filters.search && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md">
                Pencarian: "{filters.search}"
              </span>
            )}
            {filters.tingkat_urgensi && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-md">
                Urgensi: {filters.tingkat_urgensi}
              </span>
            )}
            {filters.kategori_masalah && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md">
                Kategori: {filters.kategori_masalah}
              </span>
            )}
            {filters.status && (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md">
                Status: {filters.status}
              </span>
            )}
            {filters.perlu_followup && (
              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-md">
                Follow-up: {filters.perlu_followup === 'true' ? 'Ya' : 'Tidak'}
              </span>
            )}
            {(filters.tanggalAwal || filters.tanggalAkhir) && (
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md">
                Periode: {filters.tanggalAwal || '...'} s/d {filters.tanggalAkhir || '...'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterBar;