import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { DataExcel } from "./DataExcel"; // ✅ IMPORT DATAEXCEL

export const Teachers = () => {
  const [guruData, setGuruData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false); // ✅ STATE LOADING EXPORT
  const [isDarkMode, setIsDarkMode] = useState(false);

  // ✅ DARK MODE SYNC - Baca dari HTML class & localStorage
  useEffect(() => {
    const checkDarkMode = () => {
      const htmlHasDark = document.documentElement.classList.contains("dark");
      const savedTheme = localStorage.getItem("theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

      const shouldBeDark = htmlHasDark || savedTheme === "dark" || (!savedTheme && prefersDark);

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
    fetchDataGuru();
  }, []);

  const fetchDataGuru = async () => {
    try {
      setIsLoading(true);

      // ✅ UPDATE: Include both teacher AND guru_bk roles
      const { data: guruData, error: guruError } = await supabase
        .from("users")
        .select("id, teacher_id, full_name, is_active, homeroom_class_id, role")
        .in("role", ["teacher", "guru_bk"]); // ✅ Include guru_bk

      if (guruError) throw guruError;

      // Sort berdasarkan kode guru secara numerik (ekstrak angka dari teacher_id)
      const sortedGuruData = guruData.sort((a, b) => {
        const numA = parseInt(a.teacher_id?.replace(/\D/g, "") || "0");
        const numB = parseInt(b.teacher_id?.replace(/\D/g, "") || "0");
        return numA - numB;
      });

      // Ambil data mapel dari teacher_assignments
      const { data: mapelData, error: mapelError } = await supabase
        .from("teacher_assignments")
        .select("teacher_id, subject")
        .order("subject", { ascending: true });

      if (mapelError) throw mapelError;

      // Gabungkan data
      const guruWithMapel = sortedGuruData.map((guru) => {
        // ✅ Tentukan tugas/mapel berdasarkan role dan teacher_id
        let tugasMapel = [];

        if (guru.teacher_id === "G-01") {
          // Kepala Sekolah
          tugasMapel = ["Kepala Sekolah"];
        } else if (guru.role === "guru_bk") {
          // GURU BK/BP
          tugasMapel = ["GURU BK/BP"];
        } else {
          // Guru biasa - ambil dari teacher_assignments
          const mapelGuru = mapelData
            .filter((item) => item.teacher_id === guru.teacher_id)
            .map((item) => item.subject);
          tugasMapel = [...new Set(mapelGuru)];
        }

        // Gabung semua mapel dengan tanda "dan"
        const combinedMapel = tugasMapel.join(" dan ");

        return {
          ...guru,
          mapel: combinedMapel ? [combinedMapel] : [],
          walikelas: guru.homeroom_class_id || "-",
        };
      });

      // ✅ TAMBAHKAN DATA KEPALA SEKOLAH (HARDCODED)
      const kepalaSekolah = {
        id: "kepala-sekolah-001",
        teacher_id: "G-01",
        full_name: "ADE NURMUGHNI, S.Pd.",
        is_active: true,
        homeroom_class_id: null,
        role: "teacher",
        mapel: ["KEPALA SEKOLAH"],
        walikelas: "-",
      };

      // Gabungkan kepala sekolah di urutan pertama
      const finalGuruData = [kepalaSekolah, ...guruWithMapel];

      setGuruData(finalGuruData);
    } catch (error) {
      console.error("Error fetching guru data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ FUNCTION EXPORT GURU
  const handleExportGuru = async () => {
    setExportLoading(true);
    try {
      await DataExcel.exportTeachers(guruData);
    } catch (error) {
      console.error("Error exporting guru data:", error);
      alert("Gagal mengexport data guru");
    } finally {
      setExportLoading(false);
    }
  };

  // Loading Component
  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 min-h-screen transition-colors duration-200">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Data Guru
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-gray-300">
            Memuat data guru...
          </p>
        </div>
        <div className="text-center py-8 sm:py-12">
          <div className="inline-block w-8 h-8 sm:w-10 sm:h-10 border-3 sm:border-4 border-blue-200 dark:border-blue-500 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mb-4"></div>
          <p className="text-sm sm:text-base text-slate-500 dark:text-gray-400">
            Sedang memuat data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 min-h-screen transition-colors duration-200">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Data Guru
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-gray-300">
              Manajemen Data Guru SMP Muslimin Cililin
            </p>
          </div>

          {/* ✅ TOMBOL EXPORT GURU */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Export Button */}
            <button
              onClick={handleExportGuru}
              disabled={exportLoading || guruData.length === 0}
              className={`px-4 sm:px-6 py-3 sm:py-3.5 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 min-w-[140px] sm:min-w-[160px] text-sm sm:text-base touch-manipulation ${
                exportLoading || guruData.length === 0
                  ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  : "bg-green-600 dark:bg-green-500 text-white hover:bg-green-700 dark:hover:bg-green-600 shadow-md hover:shadow-lg"
              }`}
            >
              {exportLoading ? (
                <>
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Export...</span>
                </>
              ) : (
                <>
                  <span className="text-lg sm:text-xl">📊</span>
                  <span>Export Excel</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Container - Menggunakan 2 Layout: Card (Default/HP) dan Table (sm: ke atas) */}

      {/* ---------------------------------------------------- */}
      {/* 🚀 LAYOUT MOBILE-FIRST (Card View) - Default/HP/Kecil */}
      {/* ---------------------------------------------------- */}
      <div className="sm:hidden space-y-3">
        {guruData.length > 0 ? (
          guruData.map((guru, index) => (
            <div
              key={guru.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg shadow-blue-100/50 dark:shadow-gray-900/50 p-4 border border-blue-100 dark:border-gray-700 hover:shadow-xl dark:hover:shadow-gray-900 transition-all duration-300 touch-manipulation"
            >
              {/* Header Card */}
              <div className="flex justify-between items-start border-b border-blue-100/70 dark:border-gray-700 pb-3 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-gray-400 mb-1">
                    No. {index + 1} | Kode:{" "}
                    <span className="text-blue-600 dark:text-blue-400 font-bold">
                      {guru.teacher_id || "-"}
                    </span>
                  </p>
                  <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                    {guru.full_name}
                  </p>
                </div>
                {/* Status */}
                <div className="flex-shrink-0 ml-3">
                  {guru.is_active ? (
                    <span className="inline-flex items-center px-3 py-1.5 text-xs sm:text-sm font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
                      Aktif
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1.5 text-xs sm:text-sm font-semibold bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full">
                      Nonaktif
                    </span>
                  )}
                </div>
              </div>

              {/* Body Card */}
              <div className="space-y-2 text-sm sm:text-base">
                <div className="flex justify-between items-start">
                  <span className="text-slate-500 dark:text-gray-400 font-medium w-2/5">
                    Tugas/Mapel:
                  </span>
                  <div className="text-right flex-1 text-slate-900 dark:text-white font-semibold">
                    {guru.mapel?.length > 0 ? (
                      guru.mapel.join(", ")
                    ) : (
                      <span className="text-slate-400 dark:text-gray-500 italic">
                        Belum ada tugas
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-blue-50/50 dark:border-gray-700/50">
                  <span className="text-slate-500 dark:text-gray-400 font-medium w-2/5">
                    Wali Kelas:
                  </span>
                  <div className="text-right flex-1 text-slate-900 dark:text-white font-semibold">
                    {guru.walikelas !== "-" ? (
                      `KELAS ${guru.walikelas}`
                    ) : (
                      <span className="text-slate-400 dark:text-gray-500 italic">-</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          /* Empty State untuk Mobile */
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-blue-100 dark:border-gray-700">
            <div className="text-4xl sm:text-5xl mb-4">👨‍🏫</div>
            <h3 className="text-base sm:text-lg font-semibold text-slate-700 dark:text-gray-200 mb-2">
              Belum ada data guru
            </h3>
            <p className="text-sm text-slate-500 dark:text-gray-400">
              Silakan tambahkan data guru terlebih dahulu
            </p>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* 💻 LAYOUT TABLE - Tablet (sm: ke atas) & Laptop */}
      {/* ---------------------------------------------------- */}
      <div className="hidden sm:block bg-white dark:bg-gray-800 rounded-xl shadow-lg shadow-blue-100/50 dark:shadow-gray-900/50 overflow-hidden border border-blue-100 dark:border-gray-700 transition-colors duration-200">
        {/* Table Wrapper - Responsive Scroll (hanya jika memang tidak muat) */}
        <div className="overflow-x-auto">
          {guruData.length > 0 ? (
            <table className="w-full">
              {/* Table Header */}
              <thead className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-gray-700 dark:to-gray-600">
                <tr>
                  <th className="w-12 sm:w-16 px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider text-center">
                    No.
                  </th>
                  <th className="w-24 sm:w-32 px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider text-center">
                    Kode Guru
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider">
                    Nama Guru
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider w-1/3">
                    Tugas/Mapel
                  </th>
                  <th className="w-28 sm:w-32 px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider text-center">
                    Wali Kelas
                  </th>
                  <th className="w-20 sm:w-24 px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider text-center">
                    Status
                  </th>
                </tr>
              </thead>
              {/* Table Body */}
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-blue-100 dark:divide-gray-700">
                {guruData.map((guru, index) => (
                  <tr
                    key={guru.id}
                    className="hover:bg-blue-50/50 dark:hover:bg-gray-700/50 transition-colors duration-150"
                  >
                    {/* Nomor */}
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500 dark:text-gray-400 text-center font-medium">
                      {index + 1}
                    </td>

                    {/* Kode Guru */}
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                      <div className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400">
                        {guru.teacher_id || "-"}
                      </div>
                    </td>

                    {/* Nama Guru */}
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                        {guru.full_name}
                      </div>
                    </td>

                    {/* Tugas/Mapel */}
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      {guru.mapel?.length > 0 ? (
                        <div className="text-xs sm:text-sm text-slate-900 dark:text-gray-200 font-medium">
                          {guru.mapel.join(", ")}
                        </div>
                      ) : (
                        <span className="text-xs sm:text-sm text-slate-400 dark:text-gray-500 italic">
                          Belum ada tugas
                        </span>
                      )}
                    </td>

                    {/* Wali Kelas */}
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                      {guru.walikelas !== "-" ? (
                        <div className="text-xs sm:text-sm text-slate-900 dark:text-white font-medium">
                          KELAS {guru.walikelas}
                        </div>
                      ) : (
                        <span className="text-xs sm:text-sm text-slate-400 dark:text-gray-500 italic">
                          -
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                      {guru.is_active ? (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                          Nonaktif
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            /* Empty State untuk Tablet/Laptop */
            <div className="text-center py-12 sm:py-16 bg-slate-50 dark:bg-gray-800">
              <div className="text-5xl sm:text-6xl mb-4">👨‍🏫</div>
              <h3 className="text-base sm:text-lg font-semibold text-slate-700 dark:text-gray-200 mb-2">
                Belum ada data guru
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">
                Silakan tambahkan data guru terlebih dahulu
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Footer (Optional) */}
      {guruData.length > 0 && (
        <div className="mt-4 sm:mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-md shadow-blue-100/50 dark:shadow-gray-900/50 border border-blue-100 dark:border-gray-700 p-3 sm:p-4 transition-colors duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs sm:text-sm text-slate-600 dark:text-gray-300 space-y-2 sm:space-y-0">
            <span className="font-medium">
              Total:{" "}
              <span className="font-bold text-blue-600 dark:text-blue-400">{guruData.length}</span>{" "}
              guru
            </span>
            <span className="font-medium">
              Aktif:{" "}
              <span className="font-bold text-green-600 dark:text-green-400">
                {guruData.filter((g) => g.is_active).length}
              </span>{" "}
              | Non-aktif:{" "}
              <span className="font-bold text-red-600 dark:text-red-400">
                {guruData.filter((g) => !g.is_active).length}
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Teachers;
