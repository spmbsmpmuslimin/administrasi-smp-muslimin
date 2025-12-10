// pages/DataSiswa.js
import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { DataExcel } from "./DataExcel";

export const Students = () => {
  const [siswaData, setSiswaData] = useState([]);
  const [kelasOptions, setKelasOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJenjang, setSelectedJenjang] = useState("");
  const [selectedKelas, setSelectedKelas] = useState("");
  const [selectedGender, setSelectedGender] = useState("");

  // ✅ STATE MODAL EXPORT
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // ✅ DARK MODE STATE
  const [isDarkMode, setIsDarkMode] = useState(false);

  // ✅ DARK MODE SYNC
  useEffect(() => {
    const checkDarkMode = () => {
      const htmlHasDark = document.documentElement.classList.contains("dark");
      const savedTheme = localStorage.getItem("theme");
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;

      const shouldBeDark =
        htmlHasDark || savedTheme === "dark" || (!savedTheme && prefersDark);

      setIsDarkMode(shouldBeDark);
      if (shouldBeDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    checkDarkMode();

    // ✅ Observer untuk detect perubahan dark mode dari halaman lain
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    fetchStudents();
    fetchKelasOptions();
  }, []);

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from("students")
        .select("*")
        .eq("is_active", true)
        .order("full_name", { ascending: true })
        .order("class_id", { ascending: true });

      const { data, error } = await query;
      if (error) throw error;
      setSiswaData(data || []);
    } catch (error) {
      console.error("Error fetching siswa data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchKelasOptions = async () => {
    try {
      const { data, error } = await supabase
        .from("classes")
        .select("id")
        .order("id", { ascending: true });

      if (error) throw error;
      setKelasOptions(data.map((item) => item.id) || []);
    } catch (error) {
      console.error("Error fetching kelas options:", error);
    }
  };

  // ✅ FUNGSI EXPORT DENGAN LOADING
  const handleExportAll = async () => {
    setExportLoading(true);
    try {
      await DataExcel.exportAllStudents(siswaData);
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setExportLoading(false);
      setShowExportModal(false);
    }
  };

  const handleExportByJenjang = async (jenjang) => {
    setExportLoading(true);
    try {
      await DataExcel.exportByJenjang(siswaData, jenjang);
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setExportLoading(false);
      setShowExportModal(false);
    }
  };

  const handleExportByKelas = async (kelas) => {
    setExportLoading(true);
    try {
      await DataExcel.exportByKelas(siswaData, kelas);
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setExportLoading(false);
      setShowExportModal(false);
    }
  };

  const handleExportByFilter = async () => {
    setExportLoading(true);
    try {
      await DataExcel.exportByFilter(
        filteredData,
        selectedKelas,
        selectedJenjang,
        selectedGender
      );
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setExportLoading(false);
      setShowExportModal(false);
    }
  };

  // Filter data
  const filteredKelasOptions = selectedJenjang
    ? kelasOptions.filter((kelas) => kelas.startsWith(selectedJenjang))
    : [];

  const filteredData = siswaData.filter((siswa) => {
    const matchesSearch =
      siswa.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      siswa.nis?.toString().includes(searchTerm);
    const matchesJenjang = selectedJenjang
      ? siswa.class_id?.startsWith(selectedJenjang)
      : true;
    const matchesKelas = selectedKelas
      ? siswa.class_id === selectedKelas
      : true;
    const matchesGender = selectedGender
      ? siswa.gender === selectedGender
      : true;

    return matchesSearch && matchesJenjang && matchesKelas && matchesGender;
  });

  const handleJenjangChange = (e) => {
    setSelectedJenjang(e.target.value);
    setSelectedKelas("");
  };

  // ✅ MODAL COMPONENT DENGAN DARK MODE
  const ExportModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-3 sm:p-4 md:p-6 touch-manipulation">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-3 sm:mx-4 transition-colors duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-gray-700 dark:to-gray-800 p-4 sm:p-5 md:p-6 rounded-t-xl">
          <h2 className="text-lg sm:text-xl font-bold text-white text-center">
            📊 Export Data Siswa
          </h2>
          <p className="text-blue-100 dark:text-gray-300 text-center text-xs sm:text-sm mt-1">
            Pilih jenis export yang diinginkan
          </p>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 md:p-6 space-y-3 sm:space-y-4">
          {/* Export Semua Data */}
          <button
            onClick={handleExportAll}
            disabled={exportLoading || siswaData.length === 0}
            className={`w-full p-3 sm:p-4 rounded-lg border-2 transition-all flex items-center justify-between touch-manipulation min-h-[60px] sm:min-h-[70px] ${
              exportLoading || siswaData.length === 0
                ? "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                : "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:border-blue-300 dark:hover:border-blue-600"
            }`}>
            <div className="text-left">
              <div className="font-semibold text-sm sm:text-base">
                Export Semua Data
              </div>
              <div className="text-xs sm:text-sm opacity-75">
                {siswaData.length} siswa
              </div>
            </div>
            <div className="text-xl sm:text-2xl">📋</div>
          </button>

          {/* Export Berdasarkan Filter */}
          <button
            onClick={handleExportByFilter}
            disabled={exportLoading || filteredData.length === 0}
            className={`w-full p-3 sm:p-4 rounded-lg border-2 transition-all flex items-center justify-between touch-manipulation min-h-[60px] sm:min-h-[70px] ${
              exportLoading || filteredData.length === 0
                ? "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                : "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50 hover:border-green-300 dark:hover:border-green-600"
            }`}>
            <div className="text-left">
              <div className="font-semibold text-sm sm:text-base">
                Export Hasil Filter
              </div>
              <div className="text-xs sm:text-sm opacity-75">
                {filteredData.length} siswa
                {(selectedJenjang || selectedKelas || selectedGender) &&
                  ` • ${selectedJenjang ? `Kelas ${selectedJenjang}` : ""} ${
                    selectedKelas ? selectedKelas : ""
                  } ${
                    selectedGender
                      ? `• ${
                          selectedGender === "L" ? "Laki-laki" : "Perempuan"
                        }`
                      : ""
                  }`}
              </div>
            </div>
            <div className="text-xl sm:text-2xl">🎯</div>
          </button>

          {/* Export Per Jenjang */}
          <div className="space-y-2">
            <div className="font-semibold text-gray-700 dark:text-gray-300 text-xs sm:text-sm">
              Export Per Jenjang:
            </div>
            <div className="grid grid-cols-3 gap-2">
              {["7", "8", "9"].map((jenjang) => {
                const count = siswaData.filter((s) =>
                  s.class_id?.startsWith(jenjang)
                ).length;
                return (
                  <button
                    key={jenjang}
                    onClick={() => handleExportByJenjang(jenjang)}
                    disabled={exportLoading || count === 0}
                    className={`p-3 rounded-lg border transition-all touch-manipulation ${
                      exportLoading || count === 0
                        ? "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                        : "bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/50 hover:border-orange-300 dark:hover:border-orange-600"
                    }`}>
                    <div className="font-semibold text-sm">Kelas {jenjang}</div>
                    <div className="text-xs opacity-75">{count} siswa</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Export Per Kelas */}
          <div className="space-y-2">
            <div className="font-semibold text-gray-700 dark:text-gray-300 text-xs sm:text-sm">
              Export Per Kelas:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-32 sm:max-h-40 overflow-y-auto">
              {" "}
              {/* Grid responsif untuk kelas */}
              {kelasOptions.map((kelas) => {
                const count = siswaData.filter(
                  (s) => s.class_id === kelas
                ).length;
                return (
                  <button
                    key={kelas}
                    onClick={() => handleExportByKelas(kelas)}
                    disabled={exportLoading || count === 0}
                    className={`p-3 rounded-lg border transition-all text-left touch-manipulation ${
                      exportLoading || count === 0
                        ? "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                        : "bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 hover:border-purple-300 dark:hover:border-purple-600"
                    }`}>
                    <div className="font-semibold text-sm">{kelas}</div>
                    <div className="text-xs opacity-75">{count} siswa</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-3 sm:p-4 flex justify-end">
          <button
            onClick={() => setShowExportModal(false)}
            disabled={exportLoading}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium disabled:opacity-50 text-sm sm:text-base touch-manipulation">
            {exportLoading ? "Mengexport..." : "Tutup"}
          </button>
        </div>

        {/* Loading Overlay */}
        {exportLoading && (
          <div className="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-80 dark:bg-opacity-80 flex items-center justify-center rounded-xl">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 dark:border-blue-400 mb-2"></div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Sedang mengexport data...
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen p-3 sm:p-4 md:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 dark:text-white">
            Data Siswa
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            Memuat data siswa...
          </p>
        </div>
        <div className="flex justify-center items-center h-48 sm:h-64">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* ✅ MODAL RENDER */}
      {showExportModal && <ExportModal />}

      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 dark:text-white">
          Data Siswa
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-300">
          Manajemen Data Siswa SMP Muslimin Cililin
        </p>
      </div>

      {/* ✅ STATS CARDS DENGAN DARK MODE */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
        {/* Total Kelas */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/30 p-3 sm:p-4 rounded-lg border border-blue-200 dark:border-blue-700 shadow-sm">
          <div className="text-blue-600 dark:text-blue-400 text-xs font-semibold mb-1">
            Total Kelas
          </div>
          <div className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-300">
            {kelasOptions.length}
          </div>
        </div>

        {/* Total Siswa */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/30 p-3 sm:p-4 rounded-lg border border-purple-200 dark:border-purple-700 shadow-sm">
          <div className="text-purple-600 dark:text-purple-400 text-xs font-semibold mb-1">
            Total Siswa
          </div>
          <div className="text-xl sm:text-2xl font-bold text-purple-700 dark:text-purple-300">
            {siswaData.length}
          </div>
        </div>

        {/* Kelas 7 */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/30 p-3 sm:p-4 rounded-lg border border-green-200 dark:border-green-700 shadow-sm">
          <div className="text-green-600 dark:text-green-400 text-xs font-semibold mb-1">
            Kelas 7
          </div>
          <div className="text-xl sm:text-2xl font-bold text-green-700 dark:text-green-300">
            {siswaData.filter((s) => s.class_id?.startsWith("7")).length}
          </div>
        </div>

        {/* Kelas 8 */}
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/30 p-3 sm:p-4 rounded-lg border border-yellow-200 dark:border-yellow-700 shadow-sm">
          <div className="text-yellow-600 dark:text-yellow-400 text-xs font-semibold mb-1">
            Kelas 8
          </div>
          <div className="text-xl sm:text-2xl font-bold text-yellow-700 dark:text-yellow-300">
            {siswaData.filter((s) => s.class_id?.startsWith("8")).length}
          </div>
        </div>

        {/* Kelas 9 */}
        <div className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/30 p-3 sm:p-4 rounded-lg border border-pink-200 dark:border-pink-700 shadow-sm">
          <div className="text-pink-600 dark:text-pink-400 text-xs font-semibold mb-1">
            Kelas 9
          </div>
          <div className="text-xl sm:text-2xl font-bold text-pink-700 dark:text-pink-300">
            {siswaData.filter((s) => s.class_id?.startsWith("9")).length}
          </div>
        </div>
      </div>

      {/* Filter Section dengan Dark Mode */}
      <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 md:p-6 rounded-xl shadow-sm mb-4 sm:mb-6 transition-colors duration-200">
        <div className="flex flex-col md:flex-row gap-2 sm:gap-3 md:gap-4 items-center">
          {/* Search Input */}
          <div className="flex-1 md:flex-[2] w-full">
            <input
              type="text"
              placeholder="Cari siswa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-xs sm:text-sm md:text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white touch-manipulation"
            />
          </div>
          {/* Dropdown Jenjang */}
          <div className="flex-1 w-full">
            <select
              value={selectedJenjang}
              onChange={handleJenjangChange}
              className="w-full p-2 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 cursor-pointer transition text-xs sm:text-sm md:text-base text-gray-900 dark:text-white touch-manipulation">
              <option value="">Semua Jenjang</option>
              <option value="7">Kelas 7</option>
              <option value="8">Kelas 8</option>
              <option value="9">Kelas 9</option>
            </select>
          </div>
          {/* Dropdown Kelas */}
          <div className="flex-1 w-full">
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              disabled={!selectedJenjang}
              className={`w-full p-2 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-xs sm:text-sm md:text-base touch-manipulation ${
                !selectedJenjang
                  ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-70 text-gray-500 dark:text-gray-400"
                  : "bg-white dark:bg-gray-700 cursor-pointer text-gray-900 dark:text-white"
              }`}>
              <option value="">Semua Kelas</option>
              {filteredKelasOptions.map((kelas) => (
                <option key={kelas} value={kelas}>
                  {kelas}
                </option>
              ))}
            </select>
          </div>
          {/* Dropdown Jenis Kelamin */}
          <div className="flex-1 w-full">
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="w-full p-2 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 cursor-pointer transition text-xs sm:text-sm md:text-base text-gray-900 dark:text-white touch-manipulation">
              <option value="">Semua Jenis Kelamin</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>
          {/* ✅ TOMBOL EXPORT MODAL */}
          <div className="flex-1 w-full">
            <button
              onClick={() => setShowExportModal(true)}
              disabled={siswaData.length === 0}
              className={`w-full p-2 sm:p-3 rounded-lg font-semibold transition flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm md:text-base touch-manipulation min-h-[44px] sm:min-h-[48px] ${
                siswaData.length === 0
                  ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  : "bg-green-600 dark:bg-green-700 text-white hover:bg-green-700 dark:hover:bg-green-600 shadow-md hover:shadow-lg"
              }`}>
              <span className="text-sm sm:text-base">📊</span>
              <span>Export Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Info Filter dengan Dark Mode */}
      {(selectedJenjang || selectedKelas || searchTerm || selectedGender) && (
        <div className="mb-4 sm:mb-6 p-2 sm:p-3 md:p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-100 dark:border-blue-700 text-xs sm:text-sm md:text-base inline-block">
          Menampilkan{" "}
          <strong className="text-blue-700 dark:text-blue-300">
            {filteredData.length} Siswa
          </strong>
          {searchTerm && ` dengan kata kunci "${searchTerm}"`}
          {selectedKelas && ` Di Kelas ${selectedKelas}`}
          {selectedGender &&
            ` ${selectedGender === "L" ? "Laki-laki" : "Perempuan"}`}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 🚀 LAYOUT MOBILE-FIRST (Card View) - Default/HP/Kecil */}
      {/* ---------------------------------------------------- */}
      <div className="md:hidden space-y-2 sm:space-y-3">
        {filteredData.length > 0 ? (
          filteredData.map((siswa, index) => (
            <div
              key={siswa.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-3 sm:p-4 border border-gray-100 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-gray-900 transition-all duration-300 touch-manipulation">
              {/* Header: Nama & Kelas */}
              <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-700 pb-2 sm:pb-3 mb-2 sm:mb-3">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    No. {index + 1} | Kelas:{" "}
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {siswa.class_id}
                    </span>
                  </p>
                  <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">
                    {siswa.full_name}
                  </p>
                </div>
                {/* Status */}
                <div className="flex-shrink-0 ml-2">
                  <span
                    className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
                      siswa.is_active
                        ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    }`}>
                    {siswa.is_active ? "Aktif" : "Non-Aktif"}
                  </span>
                </div>
              </div>

              {/* Body Card: Detail */}
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    NIS:
                  </span>
                  <span className="font-mono text-gray-900 dark:text-gray-200">
                    {siswa.nis}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    Jenis Kelamin:
                  </span>
                  <span className="text-gray-900 dark:text-gray-200">
                    {siswa.gender === "L" ? "Laki-laki" : "Perempuan"}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          /* Empty State untuk Mobile dengan Dark Mode */
          <div className="p-8 sm:p-12 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <svg
              className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400 dark:text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              Tidak ada data siswa
            </p>
            <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {searchTerm || selectedJenjang || selectedKelas || selectedGender
                ? "Siswa tidak ditemukan sesuai filter."
                : "Belum ada data siswa di sistem."}
            </p>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* 💻 LAYOUT TABLE - Tablet (md: ke atas) & Laptop */}
      {/* ---------------------------------------------------- */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700 transition-colors duration-200">
        {/* Table Data Siswa */}
        <div className="overflow-x-auto">
          {filteredData.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-gray-700 dark:to-gray-800 text-white">
                <tr>
                  <th className="px-3 sm:px-4 md:px-6 py-3 text-left w-1/12 text-xs md:text-sm uppercase tracking-wider text-center">
                    No.
                  </th>
                  <th className="px-3 sm:px-4 md:px-6 py-3 text-left w-2/12 text-xs md:text-sm uppercase tracking-wider">
                    NIS
                  </th>
                  <th className="px-3 sm:px-4 md:px-6 py-3 text-left w-4/12 text-xs md:text-sm uppercase tracking-wider">
                    Nama
                  </th>
                  <th className="px-3 sm:px-4 md:px-6 py-3 text-left w-2/12 text-xs md:text-sm uppercase tracking-wider">
                    Kelas
                  </th>
                  <th className="px-3 sm:px-4 md:px-6 py-3 text-left w-2/12 text-xs md:text-sm uppercase tracking-wider">
                    Jenis Kelamin
                  </th>
                  <th className="px-3 sm:px-4 md:px-6 py-3 text-left w-1/12 text-xs md:text-sm uppercase tracking-wider text-center">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredData.map((siswa, index) => (
                  <tr
                    key={siswa.id}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-3 sm:px-4 md:px-6 py-3 text-center text-xs md:text-sm text-gray-700 dark:text-gray-300">
                      {index + 1}
                    </td>
                    <td className="px-3 sm:px-4 md:px-6 py-3 font-mono text-xs md:text-sm text-gray-900 dark:text-white">
                      {siswa.nis}
                    </td>
                    <td className="px-3 sm:px-4 md:px-6 py-3 font-medium text-xs md:text-sm text-gray-900 dark:text-white">
                      {siswa.full_name}
                    </td>
                    <td className="px-3 sm:px-4 md:px-6 py-3 font-semibold text-xs md:text-sm text-gray-900 dark:text-white">
                      {siswa.class_id}
                    </td>
                    <td className="px-3 sm:px-4 md:px-6 py-3 text-xs md:text-sm text-gray-700 dark:text-gray-300">
                      {siswa.gender === "L" ? "Laki-laki" : "Perempuan"}
                    </td>
                    <td className="px-3 sm:px-4 md:px-6 py-3 text-center">
                      <span
                        className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
                          siswa.is_active
                            ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                        }`}>
                        {siswa.is_active ? "Aktif" : "Non-Aktif"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            /* Empty State untuk Tablet/Laptop dengan Dark Mode */
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                Tidak ada data siswa
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {searchTerm ||
                selectedJenjang ||
                selectedKelas ||
                selectedGender
                  ? "Siswa tidak ditemukan sesuai filter."
                  : "Belum ada data siswa di sistem."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Students;
