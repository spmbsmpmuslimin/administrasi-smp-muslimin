// components/Classes.js
import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export const Classes = ({ user, onShowToast }) => {
  const [kelasData, setKelasData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDataKelas();
  }, []);

  const fetchDataKelas = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // QUERY untuk data kelas
      const { data: kelasDataFromDB, error: kelasError } = await supabase
        .from("classes")
        .select("id, grade, academic_year")
        .order("grade", { ascending: true })
        .order("id", { ascending: true });

      if (kelasError) throw kelasError;

      // Ambil data wali kelas
      const { data: waliKelasData, error: waliError } = await supabase
        .from("users")
        .select("id, full_name, homeroom_class_id")
        .not("homeroom_class_id", "is", null);

      if (waliError) throw waliError;

      // Ambil data jumlah siswa per kelas
      const { data: siswaData, error: siswaError } = await supabase
        .from("students")
        .select("class_id, gender, is_active")
        .eq("is_active", true);

      if (siswaError) throw siswaError;

      // Hitung statistik siswa per kelas
      const statsPerKelas = {};
      siswaData.forEach(siswa => {
        const classId = siswa.class_id;
        
        if (!statsPerKelas[classId]) {
          statsPerKelas[classId] = { total: 0, laki: 0, perempuan: 0 };
        }
        statsPerKelas[classId].total++;
        if (siswa.gender === 'L') statsPerKelas[classId].laki++;
        if (siswa.gender === 'P') statsPerKelas[classId].perempuan++;
      });

      // Gabungkan semua data
      const dataGabungan = kelasDataFromDB.map(kelas => {
        const waliKelas = waliKelasData.find(w => w.homeroom_class_id === kelas.id);
        const stats = statsPerKelas[kelas.id] || { total: 0, laki: 0, perempuan: 0 };

        return {
          ...kelas,
          wali_kelas: waliKelas ? { full_name: waliKelas.full_name } : null,
          jumlah_siswa: stats.total,
          laki_laki: stats.laki,
          perempuan: stats.perempuan
        };
      });

      setKelasData(dataGabungan);

    } catch (error) {
      console.error("Error fetching kelas data:", error);
      setError("Gagal memuat data kelas. Silakan coba lagi.");
      onShowToast("Gagal memuat data kelas", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Hitung total
  const totalSiswa = kelasData.reduce((sum, kelas) => sum + kelas.jumlah_siswa, 0);
  const totalLaki = kelasData.reduce((sum, kelas) => sum + kelas.laki_laki, 0);
  const totalPerempuan = kelasData.reduce((sum, kelas) => sum + kelas.perempuan, 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-800">Data Kelas</h1>
            <p className="text-gray-600">Memuat data kelas...</p>
          </div>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-800">Data Kelas</h1>
            <p className="text-gray-600">Manajemen Data Kelas SMP Muslimin Cililin</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="bg-red-100 p-3 rounded-full mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Terjadi Kesalahan</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={fetchDataKelas}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Coba Lagi
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Data Kelas</h1>
          <p className="text-gray-600">Manajemen Data Kelas SMP Muslimin Cililin</p>
        </div>

        {/* Table Data Kelas */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">No.</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Kelas</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Wali Kelas</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Jumlah Siswa</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Laki-laki</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Perempuan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {kelasData.map((kelas, index) => (
                  <tr key={kelas.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-left">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-left">
                      <div className="font-semibold text-gray-900">{kelas.id}</div>
                      <div className="text-sm text-gray-500">{kelas.academic_year}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-left">
                      {kelas.wali_kelas ? (
                        <span className="text-gray-900">{kelas.wali_kelas.full_name}</span>
                      ) : (
                        <span className="text-gray-400 italic">Belum ditentukan</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-left font-semibold text-gray-900">
                      {kelas.jumlah_siswa}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 text-left">
                      {kelas.laki_laki}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 text-left">
                      {kelas.perempuan}
                    </td>
                  </tr>
                ))}
                
                {/* Baris Total */}
                {kelasData.length > 0 && (
                  <tr className="bg-blue-50 font-semibold">
                    <td className="px-6 py-4 text-left" colSpan="3">
                      TOTAL
                    </td>
                    <td className="px-6 py-4 text-left text-blue-700">
                      {totalSiswa}
                    </td>
                    <td className="px-6 py-4 text-left text-blue-700">
                      {totalLaki}
                    </td>
                    <td className="px-6 py-4 text-left text-blue-700">
                      {totalPerempuan}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {kelasData.length === 0 && (
            <div className="py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada data kelas</h3>
              <p className="mt-1 text-sm text-gray-500">Tidak ada data kelas yang tersedia saat ini.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Classes;