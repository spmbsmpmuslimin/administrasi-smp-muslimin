// pages/Classes.js
// Dirender lewat menuConfig.js DI DALAM Layout.js -- sidebar, header, dan
// background halaman udah disediain Layout.js. Komponen ini pakai
// PageContainer & Card standar dari components/ui, bukan bikin
// min-h-screen/background sendiri.
import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { DataExcel } from "../pages/DataExcel";
import { AlertTriangle, Users, FileSpreadsheet } from "lucide-react";
import PageContainer from "../components/ui/PageContainer";
import Card from "../components/ui/Card";
import { PageTitle, SectionTitle, Text, Muted, Subtitle } from "../components/ui/Typography";

// State kosong dipakai bareng oleh versi mobile (card) & versi tablet/desktop (table)
const EmptyState = ({ darkMode }) => (
  <div className="py-10 sm:py-12 text-center">
    <Users className={`mx-auto mb-2 ${darkMode ? "text-gray-500" : "text-gray-400"}`} size={40} />
    <SectionTitle darkMode={darkMode} className="mb-1">
      Tidak ada data kelas
    </SectionTitle>
    <Muted darkMode={darkMode}>Tidak ada data kelas yang tersedia saat ini.</Muted>
  </div>
);

export const Classes = ({ user, onShowToast, darkMode }) => {
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
      siswaData.forEach((siswa) => {
        const classId = siswa.class_id;

        if (!statsPerKelas[classId]) {
          statsPerKelas[classId] = { total: 0, laki: 0, perempuan: 0 };
        }
        statsPerKelas[classId].total++;
        if (siswa.gender === "L") statsPerKelas[classId].laki++;
        if (siswa.gender === "P") statsPerKelas[classId].perempuan++;
      });

      // Gabungkan semua data
      const dataGabungan = kelasDataFromDB.map((kelas) => {
        const waliKelas = waliKelasData.find((w) => w.homeroom_class_id === kelas.id);
        const stats = statsPerKelas[kelas.id] || {
          total: 0,
          laki: 0,
          perempuan: 0,
        };

        return {
          ...kelas,
          wali_kelas: waliKelas ? { full_name: waliKelas.full_name } : null,
          jumlah_siswa: stats.total,
          laki_laki: stats.laki,
          perempuan: stats.perempuan,
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

  // Data untuk export Excel
  const excelData = kelasData.map((kelas) => ({
    Kelas: kelas.id,
    "Tahun Ajaran": kelas.academic_year,
    "Wali Kelas": kelas.wali_kelas ? kelas.wali_kelas.full_name : "Belum ditentukan",
    "Jumlah Siswa": kelas.jumlah_siswa,
    "Laki-laki": kelas.laki_laki,
    Perempuan: kelas.perempuan,
  }));

  const handleExportExcel = async () => {
    try {
      await DataExcel.exportClasses(excelData);
      onShowToast("Data kelas berhasil diexport", "success");
    } catch (error) {
      console.error("Error exporting kelas:", error);
      onShowToast("Gagal mengexport data kelas", "error");
    }
  };

  if (isLoading) {
    return (
      <PageContainer darkMode={darkMode}>
        <div>
          <PageTitle darkMode={darkMode}>Data Kelas</PageTitle>
          <Subtitle darkMode={darkMode}>Memuat data kelas...</Subtitle>
        </div>
        <div className="flex justify-center items-center h-48 sm:h-64">
          <div
            className={`animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 ${
              darkMode ? "border-blue-400" : "border-blue-600"
            }`}
          />
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer
        darkMode={darkMode}
        title="Data Kelas"
        subtitle="Manajemen Data Kelas SMP Muslimin Cililin"
      >
        <Card darkMode={darkMode}>
          <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
            <div
              className={`p-3 rounded-full mb-3 sm:mb-4 ${
                darkMode ? "bg-red-900/30" : "bg-red-100"
              }`}
            >
              <AlertTriangle className={darkMode ? "text-red-400" : "text-red-600"} size={28} />
            </div>
            <SectionTitle darkMode={darkMode} className="mb-1">
              Terjadi Kesalahan
            </SectionTitle>
            <Text darkMode={darkMode} className="mb-4">
              {error}
            </Text>
            <button
              onClick={fetchDataKelas}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors touch-manipulation min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                darkMode
                  ? "bg-blue-500 hover:bg-blue-600 focus:ring-offset-gray-800"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              Coba Lagi
            </button>
          </div>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer darkMode={darkMode}>
      {/* Header: judul halaman + tombol export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <PageTitle darkMode={darkMode}>Data Kelas</PageTitle>
          <Subtitle darkMode={darkMode}>Manajemen Data Kelas SMP Muslimin Cililin</Subtitle>
        </div>

        {kelasData.length > 0 && (
          <button
            onClick={handleExportExcel}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white shadow-sm transition-colors touch-manipulation min-h-[44px] focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
              darkMode
                ? "bg-green-600 hover:bg-green-500 focus:ring-offset-gray-900"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            <FileSpreadsheet size={16} />
            Export Excel
          </button>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* Mobile (di bawah sm): daftar Card, satu kelas = satu Card */}
      {/* ---------------------------------------------------- */}
      <div className="sm:hidden space-y-3">
        {kelasData.length > 0 ? (
          kelasData.map((kelas, index) => (
            <Card key={kelas.id} darkMode={darkMode} className="touch-manipulation">
              <div
                className={`flex justify-between items-start border-b pb-3 mb-3 ${
                  darkMode ? "border-gray-700" : "border-gray-100"
                }`}
              >
                <div>
                  <Muted darkMode={darkMode} className="block mb-1">
                    No. {index + 1}
                  </Muted>
                  <p
                    className={`text-lg font-bold ${darkMode ? "text-blue-400" : "text-blue-600"}`}
                  >
                    {kelas.id}
                  </p>
                  <Muted darkMode={darkMode}>{kelas.academic_year}</Muted>
                </div>
                <div className="text-right">
                  <Muted darkMode={darkMode} className="block mb-1">
                    Wali Kelas
                  </Muted>
                  {kelas.wali_kelas ? (
                    <Text darkMode={darkMode} className="font-semibold">
                      {kelas.wali_kelas.full_name}
                    </Text>
                  ) : (
                    <Text darkMode={darkMode} className="italic opacity-70">
                      Belum ditentukan
                    </Text>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center text-center">
                <div
                  className={`flex-1 border-r pr-2 ${
                    darkMode ? "border-gray-700" : "border-gray-100"
                  }`}
                >
                  <Muted darkMode={darkMode}>Total Siswa</Muted>
                  <p className={`text-lg font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>
                    {kelas.jumlah_siswa}
                  </p>
                </div>
                <div
                  className={`flex-1 border-r px-2 ${
                    darkMode ? "border-gray-700" : "border-gray-100"
                  }`}
                >
                  <Muted darkMode={darkMode}>Laki-laki</Muted>
                  <p
                    className={`text-base font-bold ${darkMode ? "text-blue-400" : "text-blue-600"}`}
                  >
                    {kelas.laki_laki}
                  </p>
                </div>
                <div className="flex-1 pl-2">
                  <Muted darkMode={darkMode}>Perempuan</Muted>
                  <p
                    className={`text-base font-bold ${darkMode ? "text-pink-400" : "text-pink-500"}`}
                  >
                    {kelas.perempuan}
                  </p>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card darkMode={darkMode}>
            <EmptyState darkMode={darkMode} />
          </Card>
        )}

        {/* Ringkasan total -- cuma tampil di mobile, versi desktop ada di baris TOTAL tabel */}
        {kelasData.length > 0 && (
          <div
            className={`rounded-xl shadow-md p-4 text-white bg-gradient-to-r ${
              darkMode ? "from-blue-700 to-blue-800" : "from-blue-600 to-blue-700"
            }`}
          >
            <h4
              className={`text-base font-bold mb-3 border-b pb-2 ${
                darkMode ? "border-blue-500" : "border-blue-400"
              }`}
            >
              Total Keseluruhan
            </h4>
            <div className="flex justify-between items-center text-center">
              <div className="flex-1 border-r border-blue-400/60 pr-2">
                <p className="text-xs font-medium opacity-90">Siswa Total</p>
                <p className="text-xl font-extrabold">{totalSiswa}</p>
              </div>
              <div className="flex-1 border-r border-blue-400/60 px-2">
                <p className="text-xs font-medium opacity-90">Laki-laki</p>
                <p className="text-lg font-bold">{totalLaki}</p>
              </div>
              <div className="flex-1 pl-2">
                <p className="text-xs font-medium opacity-90">Perempuan</p>
                <p className="text-lg font-bold">{totalPerempuan}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* Tablet & desktop (sm ke atas): tabel penuh di dalam Card */}
      {/* ---------------------------------------------------- */}
      <Card darkMode={darkMode} noPadding className="hidden sm:block overflow-hidden">
        <div className="overflow-x-auto">
          {kelasData.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr
                  className={`text-white bg-gradient-to-r ${
                    darkMode ? "from-gray-700 to-gray-800" : "from-blue-600 to-blue-700"
                  }`}
                >
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider w-12">
                    No.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider w-1/5">
                    Kelas
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider w-1/4">
                    Wali Kelas
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    Jumlah Siswa
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    Laki-laki
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    Perempuan
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? "divide-gray-700" : "divide-gray-200"}`}>
                {kelasData.map((kelas, index) => (
                  <tr
                    key={kelas.id}
                    className={`transition-colors ${
                      darkMode ? "hover:bg-gray-700/50" : "hover:bg-gray-50"
                    }`}
                  >
                    <td
                      className={`px-4 py-3 whitespace-nowrap text-sm ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className={`font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
                        {kelas.id}
                      </div>
                      <div className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                        {kelas.academic_year}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {kelas.wali_kelas ? (
                        <span className={`text-sm ${darkMode ? "text-gray-200" : "text-gray-900"}`}>
                          {kelas.wali_kelas.full_name}
                        </span>
                      ) : (
                        <span
                          className={`text-sm italic ${
                            darkMode ? "text-gray-500" : "text-gray-400"
                          }`}
                        >
                          Belum ditentukan
                        </span>
                      )}
                    </td>
                    <td
                      className={`px-4 py-3 whitespace-nowrap text-sm font-semibold ${
                        darkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {kelas.jumlah_siswa}
                    </td>
                    <td
                      className={`px-4 py-3 whitespace-nowrap text-sm ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      {kelas.laki_laki}
                    </td>
                    <td
                      className={`px-4 py-3 whitespace-nowrap text-sm ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      {kelas.perempuan}
                    </td>
                  </tr>
                ))}

                {/* Baris Total */}
                <tr
                  className={`font-semibold border-t-2 ${
                    darkMode ? "bg-blue-900/30 border-blue-700" : "bg-blue-50 border-blue-200"
                  }`}
                >
                  <td
                    className={`px-4 py-3 text-sm ${darkMode ? "text-white" : "text-gray-900"}`}
                    colSpan="3"
                  >
                    TOTAL
                  </td>
                  <td
                    className={`px-4 py-3 text-sm ${darkMode ? "text-blue-300" : "text-blue-700"}`}
                  >
                    {totalSiswa}
                  </td>
                  <td
                    className={`px-4 py-3 text-sm ${darkMode ? "text-blue-300" : "text-blue-700"}`}
                  >
                    {totalLaki}
                  </td>
                  <td
                    className={`px-4 py-3 text-sm ${darkMode ? "text-blue-300" : "text-blue-700"}`}
                  >
                    {totalPerempuan}
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <EmptyState darkMode={darkMode} />
          )}
        </div>
      </Card>
    </PageContainer>
  );
};

export default Classes;
