import React, { useState, useEffect } from "react";
import { supabase } from '../supabaseClient';

export const Teachers = () => {
  const [guruData, setGuruData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDataGuru();
  }, []);

  const fetchDataGuru = async () => {
    try {
      setIsLoading(true);

      // Query data guru
      const { data: guruData, error: guruError } = await supabase
        .from("users")
        .select("id, teacher_id, full_name, is_active, homeroom_class_id")
        .eq("role", "teacher")
        .order("full_name", { ascending: true });

      if (guruError) throw guruError;

      // Ambil data mapel dari teacher_assignments
      const { data: mapelData, error: mapelError } = await supabase
        .from("teacher_assignments")
        .select("teacher_id, subject")
        .order("subject", { ascending: true });

      if (mapelError) throw mapelError;

      // Gabungkan data
      const guruWithMapel = guruData.map((guru) => {
        const mapelGuru = mapelData
          .filter((item) => item.teacher_id === guru.teacher_id)
          .map((item) => item.subject);

        // Gabung semua mapel dengan tanda "dan"
        const combinedMapel = [...new Set(mapelGuru)].join(" dan ");

        return {
          ...guru,
          mapel: combinedMapel ? [combinedMapel] : [],
          walikelas: guru.homeroom_class_id || "-",
        };
      });

      setGuruData(guruWithMapel);
    } catch (error) {
      console.error("Error fetching guru data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading Component
  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-blue-50 to-white min-h-screen">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Data Guru</h1>
          <p className="text-sm sm:text-base text-slate-600">Memuat data guru...</p>
        </div>
        <div className="text-center py-8 sm:py-12">
          <div className="inline-block w-6 h-6 sm:w-8 sm:h-8 border-2 sm:border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="text-sm sm:text-base text-slate-500">Sedang memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-blue-50 to-white min-h-screen">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Data Guru</h1>
        <p className="text-sm sm:text-base text-slate-600">Manajemen Data Guru SMP Muslimin Cililin</p>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-xl shadow-lg shadow-blue-100/50 overflow-hidden border border-blue-100">
        {/* Table Wrapper - Responsive Scroll */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] sm:min-w-[768px]">
            {/* Table Header */}
            <thead className="bg-gradient-to-r from-blue-600 to-blue-700">
              <tr>
                <th className="w-12 sm:w-16 px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-white uppercase tracking-wider text-center">
                  No.
                </th>
                <th className="w-40 sm:w-48 px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Nama Guru
                </th>
                <th className="w-48 sm:w-72 px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Mata Pelajaran
                </th>
                <th className="w-28 sm:w-32 px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-white uppercase tracking-wider text-center">
                  Wali Kelas
                </th>
                <th className="w-20 sm:w-24 px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-white uppercase tracking-wider text-center">
                  Status
                </th>
              </tr>
            </thead>
            
            {/* Table Body */}
            <tbody className="bg-white divide-y divide-blue-100">
              {guruData.map((guru, index) => (
                <tr key={guru.id} className="hover:bg-blue-50/50 transition-colors duration-150">
                  {/* Nomor */}
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500 text-center font-medium">
                    {index + 1}
                  </td>
                  
                  {/* Nama Guru */}
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div className="text-xs sm:text-sm font-semibold text-slate-900">
                      {guru.full_name}
                    </div>
                  </td>
                  
                  {/* Mata Pelajaran */}
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    {guru.mapel?.length > 0 ? (
                      <div className="text-xs sm:text-sm text-slate-900 font-medium">
                        {guru.mapel.join(", ")}
                      </div>
                    ) : (
                      <span className="text-xs sm:text-sm text-slate-400 italic">
                        Belum ada mapel
                      </span>
                    )}
                  </td>
                  
                  {/* Wali Kelas */}
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                    {guru.walikelas !== "-" ? (
                      <div className="text-xs sm:text-sm text-slate-900 font-medium">
                        KELAS {guru.walikelas}
                      </div>
                    ) : (
                      <span className="text-xs sm:text-sm text-slate-400 italic">-</span>
                    )}
                  </td>
                  
                  {/* Status */}
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                    <div className="text-xs sm:text-sm text-slate-900 font-medium">
                      {guru.is_active ? "AKTIF" : "NONAKTIF"}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {guruData.length === 0 && (
          <div className="text-center py-12 sm:py-16 bg-slate-50">
            <div className="text-4xl sm:text-6xl mb-4">👨‍🏫</div>
            <h3 className="text-base sm:text-lg font-semibold text-slate-700 mb-2">
              Belum ada data guru
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">
              Silakan tambahkan data guru terlebih dahulu
            </p>
          </div>
        )}
      </div>

      {/* Stats Footer (Optional) */}
      {guruData.length > 0 && (
        <div className="mt-4 sm:mt-6 bg-white rounded-lg shadow-md shadow-blue-100/50 border border-blue-100 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs sm:text-sm text-slate-600 space-y-2 sm:space-y-0">
            <span>Total: {guruData.length} guru</span>
            <span>
              Aktif: {guruData.filter(g => g.is_active).length} | 
              Non-aktif: {guruData.filter(g => !g.is_active).length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Teachers;