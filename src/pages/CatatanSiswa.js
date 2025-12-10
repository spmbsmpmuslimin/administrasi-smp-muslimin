import React, { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { exportToExcel, exportToPDF } from "./CatatanSiswaExport";
import {
  Plus,
  Search,
  TrendingUp,
  TrendingDown,
  Eye,
  AlertCircle,
  CheckCircle,
  Info,
  Trash2,
  Edit,
  X,
} from "lucide-react";

// Komponen FormView yang terpisah - DARK MODE SUPPORT
const FormView = ({
  formData,
  onFormChange,
  onSubmit,
  onCancel,
  siswaList,
  editingNote,
  loading,
  kategoris,
  isAdmin,
}) => {
  // JIKA ADMIN, JANGAN TAMPILKAN FORM
  if (isAdmin) {
    return (
      <div className="max-w-3xl mx-auto p-3 sm:p-4 md:p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm dark:shadow-gray-900/50 p-6 sm:p-8 text-center">
          <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-yellow-500 dark:text-yellow-400 mx-auto mb-3 sm:mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-2">
            Akses Ditolak
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm sm:text-base">
            Admin tidak dapat membuat atau mengedit catatan perkembangan siswa.
          </p>
          <button
            onClick={onCancel}
            className="bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg border border-gray-300 dark:border-gray-600 font-medium transition min-h-[44px] text-sm sm:text-base">
            ← Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    onFormChange(name, value);
  };

  const handleLabelSelect = (label) => {
    onFormChange("label", label);
  };

  return (
    <div className="max-w-3xl mx-auto p-3 sm:p-4 md:p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm dark:shadow-gray-900/50 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6 pb-4 border-b dark:border-gray-700">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 dark:text-white">
            {editingNote ? "Edit Catatan" : "Tambah Catatan Baru"}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 font-medium transition min-h-[44px] text-sm w-full sm:w-auto">
            ← Kembali
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 sm:space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Siswa <span className="text-red-500">*</span>
              </label>
              <select
                name="student_id"
                value={formData.student_id}
                onChange={handleInputChange}
                disabled={editingNote}
                className="w-full px-3 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:ring-blue-400 disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">
                <option value="">Pilih Siswa</option>
                {siswaList.map((siswa) => (
                  <option key={siswa.id} value={siswa.id}>
                    {siswa.nama} (NIS: {siswa.nis})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Kategori <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-3 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:ring-blue-400 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">
                <option value="">Pilih Kategori</option>
                {kategoris.map((kategori) => (
                  <option key={kategori} value={kategori}>
                    {kategori}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Label <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-col xs:flex-row gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => handleLabelSelect("positif")}
                  className={`flex-1 px-2 py-2.5 sm:py-3 rounded-lg border font-medium transition min-h-[44px] ${
                    formData.label === "positif"
                      ? "bg-green-100 dark:bg-green-900 border-green-500 dark:border-green-600 text-green-800 dark:text-green-300"
                      : "bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                  }`}>
                  👍 Positif
                </button>
                <button
                  type="button"
                  onClick={() => handleLabelSelect("perhatian")}
                  className={`flex-1 px-2 py-2.5 sm:py-3 rounded-lg border font-medium transition min-h-[44px] ${
                    formData.label === "perhatian"
                      ? "bg-red-100 dark:bg-red-900 border-red-500 dark:border-red-600 text-red-800 dark:text-red-300"
                      : "bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                  }`}>
                  ⚠️ Perhatian
                </button>
                <button
                  type="button"
                  onClick={() => handleLabelSelect("netral")}
                  className={`flex-1 px-2 py-2.5 sm:py-3 rounded-lg border font-medium transition min-h-[44px] ${
                    formData.label === "netral"
                      ? "bg-gray-100 dark:bg-gray-600 border-gray-500 dark:border-gray-500 text-gray-800 dark:text-gray-300"
                      : "bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                  }`}>
                  📝 Biasa
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Isi Catatan <span className="text-red-500">*</span>
            </label>
            <textarea
              name="note_content"
              value={formData.note_content}
              onChange={handleInputChange}
              rows={5}
              placeholder="Tuliskan catatan perkembangan siswa secara detail..."
              className="w-full px-3 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:ring-blue-400 resize-none text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Tindakan yang Diambil
            </label>
            <textarea
              name="action_taken"
              value={formData.action_taken}
              onChange={handleInputChange}
              rows={3}
              placeholder="Tuliskan tindakan yang sudah atau akan dilakukan..."
              className="w-full px-3 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:ring-blue-400 resize-none text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-3 sm:pt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 dark:bg-blue-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm min-h-[44px]">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {editingNote ? "Menyimpan..." : "Membuat..."}
                </>
              ) : editingNote ? (
                "Update Catatan"
              ) : (
                "Buat Catatan"
              )}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg border border-gray-300 dark:border-gray-600 font-semibold hover:bg-gray-100 dark:hover:bg-gray-600 transition disabled:opacity-50 min-h-[44px] text-sm">
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Komponen DashboardView yang terpisah - DARK MODE SUPPORT
const DashboardView = ({
  currentClass,
  academicYear,
  semester,
  stats,
  searchTerm,
  onSearchChange,
  onAddNote,
  loading,
  siswaList,
  filteredSiswa,
  onViewDetail,
  isAdmin,
}) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 dark:text-white">
            {isAdmin
              ? "Monitoring Catatan Perkembangan Siswa"
              : "Catatan Perkembangan Siswa"}
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
            {currentClass
              ? `Kelas ${currentClass} - ${academicYear} (${semester})`
              : `Semua Kelas - ${academicYear} (${semester})`}
            {isAdmin && (
              <span className="ml-2 text-blue-600 dark:text-blue-400 font-semibold text-xs sm:text-sm">
                (Mode Admin)
              </span>
            )}
          </p>
        </div>
        {/* HIDE TOMBOL TAMBAH CATATAN UNTUK ADMIN */}
        {!isAdmin && (
          <button
            onClick={onAddNote}
            className="bg-blue-600 dark:bg-blue-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 dark:hover:bg-blue-600 transition min-h-[44px] w-full sm:w-auto text-sm sm:text-base">
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Tambah Catatan</span>
          </button>
        )}
      </div>

      {/* Stats Grid - RESPONSIVE */}
      <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 md:p-5 rounded-lg shadow-sm dark:shadow-gray-900/50 border-l-4 border-blue-500">
          <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-1">
            Total Siswa
          </p>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
            {stats.totalSiswa}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 md:p-5 rounded-lg shadow-sm dark:shadow-gray-900/50 border-l-4 border-green-500">
          <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-1">
            Progress Positif
          </p>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">
            {stats.progressPositif}
            <span className="text-sm sm:text-base font-normal ml-1">Siswa</span>
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 md:p-5 rounded-lg shadow-sm dark:shadow-gray-900/50 border-l-4 border-red-500">
          <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-1">
            Perlu Perhatian
          </p>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-red-600 dark:text-red-400">
            {stats.perluPerhatian}
            <span className="text-sm sm:text-base font-normal ml-1">Siswa</span>
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 md:p-5 rounded-lg shadow-sm dark:shadow-gray-900/50 border-l-4 border-gray-500 dark:border-gray-400">
          <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-1">
            Catatan Biasa
          </p>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-600 dark:text-gray-300">
            {stats.catatanBiasa}
            <span className="text-sm sm:text-base font-normal ml-1">Siswa</span>
          </p>
        </div>
      </div>

      {/* Info untuk Admin */}
      {isAdmin && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 dark:border-blue-400 p-3 sm:p-4 rounded">
          <div className="flex items-start gap-2 sm:gap-3">
            <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-300 text-xs sm:text-sm md:text-base">
                Mode Monitoring Admin
              </p>
              <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200">
                Anda dapat memantau semua catatan perkembangan siswa dari semua
                kelas dan guru.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search - RESPONSIVE */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          placeholder="Cari siswa berdasarkan nama atau NIS..."
          value={searchTerm}
          onChange={onSearchChange}
          className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-sm sm:text-base bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
        />
      </div>

      {/* ---------------------------------------------------- */}
      {/* 🚀 LAYOUT MOBILE-FIRST (Card View) - Default/HP/Kecil */}
      {/* ---------------------------------------------------- */}
      <div className="md:hidden space-y-3 sm:space-y-4">
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-8 sm:p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-7 w-7 sm:h-8 sm:w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
            <p className="mt-3 sm:mt-4 text-gray-600 dark:text-gray-400 text-sm sm:text-base">
              Memuat data...
            </p>
          </div>
        ) : siswaList.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-8 sm:p-12 text-center">
            <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-lg">
              Tidak ada data siswa di kelas ini.
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-2">
              Pastikan sudah ada siswa yang terdaftar di kelas Anda.
            </p>
          </div>
        ) : filteredSiswa.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-8 sm:p-12 text-center">
            <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-lg">
              Tidak ada siswa yang sesuai dengan pencarian "{searchTerm}"
            </p>
          </div>
        ) : (
          filteredSiswa.map((siswa) => (
            <div
              key={siswa.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-md dark:shadow-gray-900/50 p-3 sm:p-4 border border-gray-100 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-gray-800/50 transition-shadow duration-300">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-700 pb-2 sm:pb-3 mb-2 sm:mb-3">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {siswa.nama}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    NIS: {siswa.nis}
                  </p>
                </div>
                {/* Aksi */}
                <button
                  onClick={() => onViewDetail(siswa)}
                  className="flex-shrink-0 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 font-medium text-xs sm:text-sm min-h-[36px] sm:min-h-[44px] px-2">
                  <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Detail</span>
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-700 text-sm text-center">
                <div className="pr-2 sm:pr-3">
                  <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
                    Positif
                  </p>
                  <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold text-sm sm:text-base">
                    <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                    {siswa.positif}
                  </span>
                </div>
                <div className="px-2 sm:px-3">
                  <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
                    Perhatian
                  </p>
                  {siswa.perhatian > 0 ? (
                    <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold text-sm sm:text-base">
                      <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />
                      {siswa.perhatian}
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500 font-semibold text-sm sm:text-base">
                      -
                    </span>
                  )}
                </div>
                <div className="pl-2 sm:pl-3">
                  <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
                    Biasa
                  </p>
                  {siswa.netral > 0 ? (
                    <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-300 font-semibold text-sm sm:text-base">
                      <Info className="w-3 h-3 sm:w-4 sm:h-4" />
                      {siswa.netral}
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500 font-semibold text-sm sm:text-base">
                      -
                    </span>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 text-right">
                Update Terakhir: {siswa.lastUpdate}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* 💻 LAYOUT TABLE - Tablet (md: ke atas) & Laptop */}
      {/* ---------------------------------------------------- */}
      {!loading && siswaList.length > 0 && (
        <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Nama Siswa
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    NIS
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Positif
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Perhatian
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Catatan Biasa
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Update Terakhir
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredSiswa.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      Tidak ada siswa yang sesuai dengan pencarian "{searchTerm}
                      "
                    </td>
                  </tr>
                ) : (
                  filteredSiswa.map((siswa) => (
                    <tr
                      key={siswa.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                      <td className="px-4 sm:px-6 py-4">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {siswa.nama}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-gray-600 dark:text-gray-300">
                        {siswa.nis}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold">
                          <TrendingUp className="w-4 h-4" />
                          {siswa.positif}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-center">
                        {siswa.perhatian > 0 ? (
                          <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold">
                            <TrendingDown className="w-4 h-4" />
                            {siswa.perhatian}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">
                            -
                          </span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-center">
                        {siswa.netral > 0 ? (
                          <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-300 font-semibold">
                            <Info className="w-4 h-4" />
                            {siswa.netral}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">
                            -
                          </span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">
                        {siswa.lastUpdate}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-center">
                        <button
                          onClick={() => onViewDetail(siswa)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 mx-auto font-medium min-h-[44px] px-3">
                          <Eye className="w-4 h-4" />
                          <span>Detail</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// Komponen DetailView yang terpisah - DARK MODE SUPPORT
const DetailView = ({
  selectedSiswa,
  catatanList,
  loading,
  onBack,
  onAddNote,
  onEditNote,
  onDeleteNote,
  formatDate,
  getLabelBadge,
  getLabelIcon,
  isAdmin,
}) => {
  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-4 md:p-6">
      <button
        onClick={onBack}
        className="bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 mb-4 sm:mb-6 font-medium transition min-h-[44px] text-sm w-full sm:w-auto">
        ← Kembali ke Dashboard
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-0">
          <div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 dark:text-white">
              {selectedSiswa?.nama}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm">
              NIS: {selectedSiswa?.nis}
            </p>
            {isAdmin && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-semibold">
                Mode Monitoring Admin
              </p>
            )}
          </div>
          {/* ✅ RESPONSIVE GRID UNTUK STATS DETAIL */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 md:gap-6 w-full sm:w-auto">
            <div className="text-center">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                Catatan Positif
              </p>
              <p className="text-lg sm:text-xl md:text-3xl font-bold text-green-600 dark:text-green-400">
                {selectedSiswa?.positif}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                Perlu Perhatian
              </p>
              <p className="text-lg sm:text-xl md:text-3xl font-bold text-red-600 dark:text-red-400">
                {selectedSiswa?.perhatian}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                Catatan Biasa
              </p>
              <p className="text-lg sm:text-xl md:text-3xl font-bold text-gray-600 dark:text-gray-300">
                {selectedSiswa?.netral}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 dark:text-white">
          Timeline Catatan
        </h3>
        {/* HIDE TOMBOL TAMBAH CATATAN UNTUK ADMIN */}
        {!isAdmin && (
          <button
            onClick={onAddNote}
            className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 dark:hover:bg-blue-600 font-medium text-sm min-h-[44px] w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            <span>Tambah Catatan</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-8 sm:p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-7 w-7 sm:h-8 sm:w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-3 sm:mt-4 text-gray-600 dark:text-gray-400">
            Memuat catatan...
          </p>
        </div>
      ) : catatanList.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6 sm:p-8 text-center text-gray-500 dark:text-gray-400">
          <Info className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3 sm:mb-4" />
          <p className="text-sm sm:text-lg mb-2">
            Belum ada catatan untuk siswa ini
          </p>
          {!isAdmin && (
            <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500">
              Klik "Tambah Catatan" untuk membuat catatan pertama
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {catatanList.map((catatan) => (
            <div
              key={catatan.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4 sm:p-6 border-l-4"
              style={{
                borderLeftColor:
                  catatan.label === "positif"
                    ? "#10b981"
                    : catatan.label === "perhatian"
                    ? "#ef4444"
                    : "#6b7280",
              }}>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-0 mb-3">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span
                    className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1 sm:gap-2 ${getLabelBadge(
                      catatan.label
                    )} dark:${getLabelBadge(catatan.label)
                      .replace("bg-", "dark:bg-")
                      .replace("text-", "dark:text-")}`}>
                    {getLabelIcon(catatan.label)}
                    {catatan.label === "positif"
                      ? "Positif"
                      : catatan.label === "perhatian"
                      ? "Perlu Perhatian"
                      : "Catatan Biasa"}
                  </span>
                  <span className="px-2 py-1 sm:px-3 sm:py-1.5 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 rounded-full text-xs sm:text-sm font-semibold">
                    {catatan.category}
                  </span>
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">
                    {formatDate(catatan.created_at)}
                  </span>
                </div>
                {/* HIDE EDIT/DELETE BUTTONS UNTUK ADMIN */}
                {!isAdmin && (
                  <div className="flex gap-2 flex-shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => onEditNote(catatan)}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                      title="Edit catatan">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteNote(catatan.id)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                      title="Hapus catatan">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-sm sm:text-base text-gray-800 dark:text-gray-200 leading-relaxed mb-2 whitespace-pre-line">
                {catatan.note_content}
              </p>
              {catatan.action_taken && (
                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      Tindakan:
                    </span>{" "}
                    {catatan.action_taken}
                  </p>
                </div>
              )}
              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Oleh: {catatan.teacher_name || "Guru"}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedSiswa?.perhatian > 0 && (
        <div className="mt-4 sm:mt-6 bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-500 dark:border-yellow-400 p-3 sm:p-4 md:p-5 rounded-lg">
          <div className="flex gap-2 sm:gap-3">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-900 dark:text-yellow-300 mb-1 text-xs sm:text-sm md:text-base">
                Perhatian Khusus
              </p>
              <p className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-200">
                Terdeteksi pola yang perlu diperhatikan. Pertimbangkan untuk
                melakukan konsultasi lebih lanjut dengan guru BK.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Komponen Utama - UPDATE dengan isAdmin logic dan DARK MODE
const CatatanSiswa = ({ user, onShowToast }) => {
  const [activeView, setActiveView] = useState("dashboard");
  const [selectedSiswa, setSelectedSiswa] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data states
  const [siswaList, setSiswaList] = useState([]);
  const [catatanList, setCatatanList] = useState([]);
  const [stats, setStats] = useState({
    totalSiswa: 0,
    progressPositif: 0,
    perluPerhatian: 0,
    catatanBiasa: 0,
  });

  // Form states
  const [formData, setFormData] = useState({
    student_id: "",
    category: "",
    label: "",
    note_content: "",
    action_taken: "",
  });
  const [editingNote, setEditingNote] = useState(null);

  // User session data
  const [currentUser, setCurrentUser] = useState(null);
  const [currentClass, setCurrentClass] = useState(null);
  const [academicYear, setAcademicYear] = useState("2025/2026");
  const [semester, setSemester] = useState("Ganjil");
  const [initError, setInitError] = useState(null);

  const kategoris = ["Akademik", "Perilaku", "Sosial", "Karakter", "Kesehatan"];

  // TAMBAH: Cek apakah user adalah admin
  const isAdmin =
    currentUser?.role === "admin" || currentUser?.role === "administrator";

  // Get current user and class info
  useEffect(() => {
    if (user) {
      getCurrentUser();
    }
  }, [user]);

  // Load data when user is ready
  useEffect(() => {
    if (currentUser) {
      loadDashboardData();
    }
  }, [currentUser, currentClass]);

  const getCurrentUser = async () => {
    try {
      setLoading(true);
      console.log("🔍 Getting current user...");

      if (!user) {
        console.warn("⚠️ No user prop provided");
        setInitError("Sesi tidak ditemukan. Silakan login kembali.");
        setLoading(false);
        return;
      }

      console.log("✅ User from props:", user);

      const { data: dbUser, error: userError } = await supabase
        .from("users")
        .select("id, full_name, homeroom_class_id, is_active, role")
        .eq("id", user.id)
        .single();

      if (userError) {
        console.error("❌ Error verifying user:", userError);
        setInitError("Error memverifikasi sesi. Silakan login kembali.");
        setLoading(false);
        return;
      }

      if (!dbUser) {
        console.warn("⚠️ User not found in database");
        setInitError("Akun tidak ditemukan. Silakan login kembali.");
        setLoading(false);
        return;
      }

      if (!dbUser.is_active) {
        console.warn("⚠️ User account is inactive");
        setInitError("Akun Anda tidak aktif. Hubungi administrator.");
        setLoading(false);
        return;
      }

      console.log("📊 User verified:", dbUser);

      // FIX: Handle admin user yang gak punya homeroom_class_id
      const isAdminUser =
        dbUser.role === "admin" || dbUser.role === "administrator";

      if (!dbUser.homeroom_class_id && !isAdminUser) {
        console.warn("⚠️ User has no homeroom class assigned and is not admin");
        setInitError(
          "Anda belum memiliki kelas yang di-assign. Hubungi administrator untuk assign kelas wali."
        );
        setLoading(false);
        return;
      }

      setCurrentUser(dbUser);

      // FIX: Untuk admin, biarkan currentClass = null (lihat semua kelas)
      if (isAdminUser && !dbUser.homeroom_class_id) {
        console.log("👨‍💼 Admin user detected - will view all classes");
        setCurrentClass(null);
      } else {
        setCurrentClass(dbUser.homeroom_class_id);
      }

      const { data: activeYear, error: yearError } = await supabase
        .from("academic_years")
        .select("year, semester")
        .eq("is_active", true)
        .single();

      if (yearError) {
        console.warn("⚠️ No active academic year found, using default");
      } else if (activeYear) {
        console.log("📅 Active academic year:", activeYear);
        setAcademicYear(activeYear.year);
        setSemester(activeYear.semester === 1 ? "Ganjil" : "Genap");
      }

      console.log("✅ User initialization complete");
      setLoading(false);
    } catch (err) {
      console.error("💥 Unexpected error in getCurrentUser:", err);
      setInitError(`Terjadi kesalahan: ${err.message}`);
      setLoading(false);
    }
  };

  // LOAD DASHBOARD DATA - FIX semester comparison
  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("📊 Loading dashboard via RPC...");

      const semesterValue = semester === "Ganjil" ? "1" : "2";

      // Call RPC function
      const { data, error } = await supabase.rpc("get_student_notes_summary", {
        p_academic_year: academicYear,
        p_semester: semesterValue,
        p_teacher_id: !isAdmin ? currentUser.id : null,
        p_class_id: !isAdmin ? currentClass : null,
      });

      if (error) {
        console.error("❌ RPC Error:", error);
        throw error;
      }

      console.log(`✅ RPC returned ${data?.length || 0} students`);

      if (!data || data.length === 0) {
        setSiswaList([]);
        setStats({
          totalSiswa: 0,
          progressPositif: 0,
          perluPerhatian: 0,
          catatanBiasa: 0,
        });
        setLoading(false);
        return;
      }

      // Process RPC results
      const processedStudents = data.map((student) => ({
        id: student.student_id,
        nama: student.full_name,
        nis: student.nis,
        class_id: student.class_id,
        positif: parseInt(student.positif_count) || 0,
        perhatian: parseInt(student.perhatian_count) || 0,
        netral: parseInt(student.netral_count) || 0,
        lastUpdate: student.last_note_date
          ? formatRelativeTime(student.last_note_date)
          : "Belum ada catatan",
      }));

      setSiswaList(processedStudents);

      // Calculate stats
      const studentsWithPositif = processedStudents.filter(
        (s) => s.positif > 0
      );
      const studentsWithPerhatian = processedStudents.filter(
        (s) => s.perhatian > 0
      );
      const studentsWithNetral = processedStudents.filter((s) => s.netral > 0);

      setStats({
        totalSiswa: processedStudents.length,
        progressPositif: studentsWithPositif.length,
        perluPerhatian: studentsWithPerhatian.length,
        catatanBiasa: studentsWithNetral.length,
      });

      console.log("✅ Dashboard loaded via RPC! 🚀");
    } catch (err) {
      setError(err.message);
      console.error("💥 Error loading dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  // Juga UPDATE loadStudentNotes function - cari dan ganti bagian ini:
  const loadStudentNotes = async (studentId) => {
    setLoading(true);
    try {
      console.log("📝 Loading notes for student:", studentId);

      // FIX: Gunakan semester sebagai text
      const semesterValue = semester === "Ganjil" ? "1" : "2";

      let notesQuery = supabase
        .from("student_development_notes")
        .select("*")
        .eq("student_id", studentId)
        .eq("academic_year", academicYear)
        .eq("semester", semesterValue) // FIX: Gunakan text, bukan number
        .order("created_at", { ascending: false });

      // Hanya teacher yang filter by teacher_id sendiri
      if (!isAdmin && currentUser) {
        notesQuery = notesQuery.eq("teacher_id", currentUser.id);
        console.log("👨‍🏫 Teacher mode: only loading own notes");
      } else {
        console.log("👨‍💼 Admin mode: loading all notes from all teachers");
      }

      const { data, error } = await notesQuery;

      if (error) {
        console.error("❌ Error loading student notes:", error);
        throw error;
      }

      console.log(`✅ Loaded ${data?.length || 0} notes for student`);

      // Add teacher name
      const notesWithTeacher = await Promise.all(
        (data || []).map(async (note) => {
          if (note.teacher_id) {
            const { data: teacher } = await supabase
              .from("users")
              .select("full_name")
              .eq("id", note.teacher_id)
              .single();

            return {
              ...note,
              teacher_name: teacher?.full_name || "Guru",
            };
          }
          return { ...note, teacher_name: "Guru" };
        })
      );

      setCatatanList(notesWithTeacher);
    } catch (err) {
      setError(err.message);
      console.error("💥 Error loading notes:", err);
    } finally {
      setLoading(false);
    }
  };

  // Juga UPDATE handleCreateNote function - cari dan ganti bagian ini:
  const handleCreateNote = async (e) => {
    e.preventDefault();

    if (isAdmin) {
      window.alert("Admin tidak dapat membuat catatan perkembangan siswa.");
      return;
    }

    if (
      !formData.student_id ||
      !formData.category ||
      !formData.label ||
      !formData.note_content
    ) {
      window.alert("Mohon lengkapi semua field yang wajib diisi!");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // FIX: Gunakan semester sebagai text
      const semesterValue = semester === "Ganjil" ? "1" : "2";

      const noteData = {
        student_id: formData.student_id,
        teacher_id: currentUser.id,
        class_id: currentClass,
        academic_year: academicYear,
        semester: semesterValue, // FIX: Gunakan text, bukan number
        category: formData.category,
        label: formData.label,
        note_content: formData.note_content,
        action_taken: formData.action_taken || null,
      };

      console.log("💾 Creating note:", noteData);

      const { error } = await supabase
        .from("student_development_notes")
        .insert([noteData]);

      if (error) throw error;

      console.log("✅ Note created successfully");

      setFormData({
        student_id: "",
        category: "",
        label: "",
        note_content: "",
        action_taken: "",
      });

      await loadDashboardData();
      setActiveView("dashboard");

      if (onShowToast) {
        onShowToast("Catatan berhasil disimpan!", "success");
      } else {
        window.alert("Catatan berhasil disimpan!");
      }
    } catch (err) {
      setError(err.message);
      console.error("💥 Error creating note:", err);
      window.alert("Gagal menyimpan catatan: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // UPDATE NOTE - ADMIN TIDAK BISA UPDATE
  const handleUpdateNote = async (e) => {
    e.preventDefault();

    if (isAdmin) {
      window.alert("Admin tidak dapat mengedit catatan perkembangan siswa.");
      return;
    }

    if (!formData.category || !formData.label || !formData.note_content) {
      window.alert("Mohon lengkapi semua field yang wajib diisi!");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updates = {
        category: formData.category,
        label: formData.label,
        note_content: formData.note_content,
        action_taken: formData.action_taken || null,
        updated_at: new Date().toISOString(),
      };

      console.log("💾 Updating note:", editingNote.id, updates);

      const { error } = await supabase
        .from("student_development_notes")
        .update(updates)
        .eq("id", editingNote.id);

      if (error) throw error;

      console.log("✅ Note updated successfully");

      // FIX: Reload data untuk semua state
      await loadStudentNotes(selectedSiswa.id);
      await loadDashboardData();

      setEditingNote(null);
      setFormData({
        student_id: "",
        category: "",
        label: "",
        note_content: "",
        action_taken: "",
      });

      setActiveView("detail");

      if (onShowToast) {
        onShowToast("Catatan berhasil diupdate!", "success");
      } else {
        window.alert("Catatan berhasil diupdate!");
      }
    } catch (err) {
      setError(err.message);
      console.error("💥 Error updating note:", err);
      window.alert("Gagal update catatan: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // DELETE NOTE - ADMIN TIDAK BISA DELETE
  const handleDeleteNote = async (noteId) => {
    if (isAdmin) {
      window.alert("Admin tidak dapat menghapus catatan perkembangan siswa.");
      return;
    }

    if (!window.confirm("Yakin ingin menghapus catatan ini?")) return;

    setLoading(true);
    try {
      console.log("🗑️ Deleting note:", noteId);

      const { error } = await supabase
        .from("student_development_notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;

      console.log("✅ Note deleted successfully");

      await loadStudentNotes(selectedSiswa.id);
      await loadDashboardData();

      if (onShowToast) {
        onShowToast("Catatan berhasil dihapus!", "success");
      } else {
        window.alert("Catatan berhasil dihapus!");
      }
    } catch (err) {
      setError(err.message);
      console.error("💥 Error deleting note:", err);
      window.alert("Gagal menghapus catatan: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Hari ini";
    if (diffDays === 1) return "1 hari lalu";
    if (diffDays < 7) return `${diffDays} hari lalu`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} minggu lalu`;
    return `${Math.floor(diffDays / 30)} bulan lalu`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getLabelIcon = (label) => {
    if (label === "positif") return <CheckCircle className="w-4 h-4" />;
    if (label === "perhatian") return <AlertCircle className="w-4 h-4" />;
    return <Info className="w-4 h-4" />;
  };

  const getLabelBadge = (label) => {
    if (label === "positif") return "bg-green-100 text-green-800";
    if (label === "perhatian") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  // Memoized handlers
  const handleFormChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleAddNote = useCallback(() => {
    if (isAdmin) {
      window.alert("Admin tidak dapat membuat catatan perkembangan siswa.");
      return;
    }
    setFormData({
      student_id: "",
      category: "",
      label: "",
      note_content: "",
      action_taken: "",
    });
    setEditingNote(null);
    setActiveView("form");
  }, [isAdmin]);

  const handleViewDetail = useCallback(async (siswa) => {
    setSelectedSiswa(siswa);
    setActiveView("detail");
    await loadStudentNotes(siswa.id);
  }, []);

  const handleEditNote = useCallback(
    (catatan) => {
      if (isAdmin) {
        window.alert("Admin tidak dapat mengedit catatan perkembangan siswa.");
        return;
      }
      setEditingNote(catatan);
      setFormData({
        student_id: catatan.student_id,
        category: catatan.category,
        label: catatan.label,
        note_content: catatan.note_content,
        action_taken: catatan.action_taken || "",
      });
      setActiveView("form");
    },
    [isAdmin]
  );

  const handleCancelForm = useCallback(() => {
    setActiveView(editingNote ? "detail" : "dashboard");
    setEditingNote(null);
    setFormData({
      student_id: "",
      category: "",
      label: "",
      note_content: "",
      action_taken: "",
    });
  }, [editingNote]);

  const handleBackToDashboard = useCallback(() => {
    setActiveView("dashboard");
  }, []);

  const handleAddNoteFromDetail = useCallback(() => {
    if (isAdmin) {
      window.alert("Admin tidak dapat membuat catatan perkembangan siswa.");
      return;
    }
    setFormData({
      student_id: selectedSiswa.id,
      category: "",
      label: "",
      note_content: "",
      action_taken: "",
    });
    setEditingNote(null);
    setActiveView("form");
  }, [selectedSiswa, isAdmin]);

  const filteredSiswa = useMemo(
    () =>
      siswaList.filter(
        (s) =>
          s.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.nis.includes(searchTerm)
      ),
    [siswaList, searchTerm]
  );

  // MAIN RENDER - ✅ DARK MODE & RESPONSIVE
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-3 sm:p-4 md:p-6 lg:p-8">
      {error && (
        <div className="mb-3 sm:mb-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-400 p-3 sm:p-4 rounded">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400" />
            <p className="text-red-800 dark:text-red-300 text-xs sm:text-sm flex-1">
              {error}
            </p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 min-w-[44px] min-h-[44px] flex items-center justify-center">
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      )}

      {initError ? (
        <div className="max-w-2xl mx-auto p-3 sm:p-4 md:p-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6 sm:p-8 text-center">
            <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-red-500 dark:text-red-400 mx-auto mb-3 sm:mb-4" />
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 dark:text-white mb-2">
              Tidak Dapat Memuat Data
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4 sm:mb-6 text-sm sm:text-base">
              {initError}
            </p>
            <div className="space-y-3 sm:space-y-4">
              <button
                onClick={() => {
                  setInitError(null);
                  setLoading(true);
                  getCurrentUser();
                }}
                className="bg-blue-600 dark:bg-blue-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 font-semibold transition min-h-[44px] w-full sm:w-auto text-sm sm:text-base">
                Coba Lagi
              </button>
              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                <p>Jika masalah berlanjut, silakan:</p>
                <ul className="mt-1 sm:mt-2 space-y-1 text-left inline-block">
                  <li>• Pastikan Anda sudah login</li>
                  <li>• Periksa koneksi internet Anda</li>
                  <li>• Hubungi administrator untuk assign kelas wali</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : loading && !currentUser ? (
        <div className="max-w-2xl mx-auto p-3 sm:p-4 md:p-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-8 sm:p-10 md:p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 border-b-2 border-blue-600 dark:border-blue-400 mb-3 sm:mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-lg">
              Memuat data pengguna...
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-2">
              Mohon tunggu sebentar
            </p>
          </div>
        </div>
      ) : (
        <>
          {activeView === "dashboard" && (
            <DashboardView
              currentClass={currentClass}
              academicYear={academicYear}
              semester={semester}
              stats={stats}
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
              onAddNote={handleAddNote}
              loading={loading}
              siswaList={siswaList}
              filteredSiswa={filteredSiswa}
              onViewDetail={handleViewDetail}
              isAdmin={isAdmin}
            />
          )}

          {activeView === "form" && (
            <FormView
              formData={formData}
              onFormChange={handleFormChange}
              onSubmit={editingNote ? handleUpdateNote : handleCreateNote}
              onCancel={handleCancelForm}
              siswaList={siswaList}
              editingNote={editingNote}
              loading={loading}
              kategoris={kategoris}
              isAdmin={isAdmin}
            />
          )}

          {activeView === "detail" && (
            <DetailView
              selectedSiswa={selectedSiswa}
              catatanList={catatanList}
              loading={loading}
              onBack={handleBackToDashboard}
              onAddNote={handleAddNoteFromDetail}
              onEditNote={handleEditNote}
              onDeleteNote={handleDeleteNote}
              formatDate={formatDate}
              getLabelBadge={getLabelBadge}
              getLabelIcon={getLabelIcon}
              isAdmin={isAdmin}
            />
          )}
        </>
      )}
    </div>
  );
};

export default CatatanSiswa;
