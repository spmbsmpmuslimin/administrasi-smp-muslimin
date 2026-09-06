// pages/Teachers.js
// Dirender lewat menuConfig.js DI DALAM Layout.js -- sidebar, header, dan
// background halaman udah disediain Layout.js. Komponen ini pakai
// PageContainer & Card standar dari components/ui, bukan bikin
// min-h-screen/background sendiri.
import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { DataExcel } from "./DataExcel";
import { Users, FileSpreadsheet } from "lucide-react";
import PageContainer from "../components/ui/PageContainer";
import Card from "../components/ui/Card";
import { PageTitle, SectionTitle, Text, Muted, Subtitle } from "../components/ui/Typography";

// State kosong dipakai bareng oleh versi mobile (card) & versi tablet/desktop (table)
const EmptyState = ({ darkMode }) => (
  <div className="py-10 sm:py-12 text-center">
    <Users className={`mx-auto mb-2 ${darkMode ? "text-gray-500" : "text-gray-400"}`} size={40} />
    <SectionTitle darkMode={darkMode} className="mb-1">
      Belum ada data guru
    </SectionTitle>
    <Muted darkMode={darkMode}>Silakan tambahkan data guru terlebih dahulu</Muted>
  </div>
);

export const Teachers = ({ darkMode }) => {
  const [guruData, setGuruData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    fetchDataGuru();
  }, []);

  const fetchDataGuru = async () => {
    try {
      setIsLoading(true);

      // Include teacher, guru_bk, tu, dan petugas_perpus (Data Guru & Staf)
      const { data: guruData, error: guruError } = await supabase
        .from("users")
        .select("id, teacher_id, full_name, is_active, homeroom_class_id, role")
        .in("role", ["teacher", "guru_bk", "tu", "petugas_perpus"]);

      if (guruError) throw guruError;

      // Urutan: Guru & BK -> Staf TU -> Petugas Perpustakaan (Kepala Sekolah selalu di paling atas, ditambahkan terpisah di bawah)
      const rolePriority = { teacher: 1, guru_bk: 1, tu: 2, petugas_perpus: 3 };

      const sortedGuruData = guruData.sort((a, b) => {
        const groupA = rolePriority[a.role] ?? 99;
        const groupB = rolePriority[b.role] ?? 99;
        if (groupA !== groupB) return groupA - groupB;

        // Dalam grup yang sama, urutkan berdasarkan kode guru secara numerik
        const numA = parseInt(a.teacher_id?.replace(/\D/g, "") || "0");
        const numB = parseInt(b.teacher_id?.replace(/\D/g, "") || "0");
        if (numA !== numB) return numA - numB;

        // Kalau kode guru sama-sama kosong (Staf TU / Petugas Perpus), urutkan alfabetis
        return (a.full_name || "").localeCompare(b.full_name || "");
      });

      // Ambil data mapel dari teacher_assignments
      const { data: mapelData, error: mapelError } = await supabase
        .from("teacher_assignments")
        .select("teacher_id, subject")
        .order("subject", { ascending: true });

      if (mapelError) throw mapelError;

      // Gabungkan data
      const guruWithMapel = sortedGuruData.map((guru) => {
        // Tentukan tugas/mapel berdasarkan role dan teacher_id
        let tugasMapel = [];

        if (guru.teacher_id === "KS") {
          tugasMapel = ["Kepala Sekolah"];
        } else if (guru.role === "guru_bk") {
          tugasMapel = ["GURU BK/BP"];
        } else if (guru.role === "tu") {
          tugasMapel = ["STAF TATA USAHA"];
        } else if (guru.role === "petugas_perpus") {
          tugasMapel = ["PERPUSTAKAAN"];
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

      // Tambahkan data Kepala Sekolah (hardcoded)
      const kepalaSekolah = {
        id: "kepala-sekolah-001",
        teacher_id: "KS",
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

  if (isLoading) {
    return (
      <PageContainer darkMode={darkMode}>
        <div>
          <PageTitle darkMode={darkMode}>Data Guru dan Staf</PageTitle>
          <Subtitle darkMode={darkMode}>Memuat data guru...</Subtitle>
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

  return (
    <PageContainer darkMode={darkMode}>
      {/* Header: judul halaman + tombol export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <PageTitle darkMode={darkMode}>Data Guru dan Staf</PageTitle>
          <Subtitle darkMode={darkMode}>Manajemen Data Guru dan Staf SMP Muslimin Cililin</Subtitle>
        </div>

        <button
          onClick={handleExportGuru}
          disabled={exportLoading || guruData.length === 0}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white shadow-sm transition-colors touch-manipulation min-h-[44px] min-w-[150px] focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
            exportLoading || guruData.length === 0
              ? darkMode
                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
              : darkMode
                ? "bg-green-600 hover:bg-green-500 focus:ring-offset-gray-900"
                : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {exportLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Export...</span>
            </>
          ) : (
            <>
              <FileSpreadsheet size={16} />
              <span>Export Excel</span>
            </>
          )}
        </button>
      </div>

      {/* ---------------------------------------------------- */}
      {/* Mobile (di bawah sm): daftar Card, satu guru = satu Card */}
      {/* ---------------------------------------------------- */}
      <div className="sm:hidden space-y-3">
        {guruData.length > 0 ? (
          guruData.map((guru, index) => (
            <Card key={guru.id} darkMode={darkMode} className="touch-manipulation">
              <div
                className={`flex justify-between items-start border-b pb-2 mb-2 ${
                  darkMode ? "border-gray-700" : "border-gray-100"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <Muted darkMode={darkMode} className="block mb-1">
                    No. {index + 1} | Kode:{" "}
                    <span className={`font-bold ${darkMode ? "text-blue-400" : "text-blue-600"}`}>
                      {guru.teacher_id || "-"}
                    </span>
                  </Muted>
                  <p
                    className={`text-base font-bold truncate ${darkMode ? "text-white" : "text-gray-900"}`}
                  >
                    {guru.full_name}
                  </p>
                </div>
                <div className="flex-shrink-0 ml-3">
                  {guru.is_active ? (
                    <span
                      className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full ${
                        darkMode ? "bg-green-900/30 text-green-300" : "bg-green-100 text-green-800"
                      }`}
                    >
                      Aktif
                    </span>
                  ) : (
                    <span
                      className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full ${
                        darkMode ? "bg-red-900/30 text-red-300" : "bg-red-100 text-red-800"
                      }`}
                    >
                      Nonaktif
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between items-start">
                  <Muted darkMode={darkMode} className="w-2/5">
                    Tugas/Mapel:
                  </Muted>
                  <div
                    className={`text-right flex-1 font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
                  >
                    {guru.mapel?.length > 0 ? (
                      guru.mapel.join(", ")
                    ) : (
                      <span className={`italic ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                        Belum ada tugas
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className={`flex justify-between items-center pt-2 border-t ${
                    darkMode ? "border-gray-700/50" : "border-gray-100/70"
                  }`}
                >
                  <Muted darkMode={darkMode} className="w-2/5">
                    Wali Kelas:
                  </Muted>
                  <div
                    className={`text-right flex-1 font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
                  >
                    {guru.walikelas !== "-" ? (
                      `KELAS ${guru.walikelas}`
                    ) : (
                      <span className={`italic ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                        -
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card darkMode={darkMode}>
            <EmptyState darkMode={darkMode} />
          </Card>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* Tablet & desktop (sm ke atas): tabel penuh di dalam Card */}
      {/* ---------------------------------------------------- */}
      <Card darkMode={darkMode} noPadding className="hidden sm:block overflow-hidden">
        <div className="overflow-x-auto">
          {guruData.length > 0 ? (
            <table className="w-full">
              <thead
                className={`bg-gradient-to-r ${darkMode ? "from-gray-700 to-gray-600" : "from-blue-600 to-blue-700"}`}
              >
                <tr>
                  <th className="w-12 sm:w-16 px-4 py-2.5 text-center text-xs font-semibold text-white uppercase tracking-wider">
                    No.
                  </th>
                  <th className="w-24 sm:w-32 px-4 py-2.5 text-center text-xs font-semibold text-white uppercase tracking-wider">
                    Kode Guru
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Nama Guru
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wider w-1/3">
                    Tugas/Mapel
                  </th>
                  <th className="w-28 sm:w-32 px-4 py-2.5 text-center text-xs font-semibold text-white uppercase tracking-wider">
                    Wali Kelas
                  </th>
                  <th className="w-20 sm:w-24 px-4 py-2.5 text-center text-xs font-semibold text-white uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? "divide-gray-700" : "divide-gray-200"}`}>
                {guruData.map((guru, index) => (
                  <tr
                    key={guru.id}
                    className={`transition-colors ${darkMode ? "hover:bg-gray-700/50" : "hover:bg-gray-50"}`}
                  >
                    <td
                      className={`px-4 py-2.5 whitespace-nowrap text-sm text-center font-medium ${
                        darkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {index + 1}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-center">
                      <span
                        className={`text-sm font-bold ${darkMode ? "text-blue-400" : "text-blue-600"}`}
                      >
                        {guru.teacher_id || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span
                        className={`text-sm font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
                      >
                        {guru.full_name}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {guru.mapel?.length > 0 ? (
                        <span
                          className={`text-sm font-medium ${darkMode ? "text-gray-200" : "text-gray-900"}`}
                        >
                          {guru.mapel.join(", ")}
                        </span>
                      ) : (
                        <span
                          className={`text-sm italic ${darkMode ? "text-gray-500" : "text-gray-400"}`}
                        >
                          Belum ada tugas
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-center">
                      {guru.walikelas !== "-" ? (
                        <span
                          className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}
                        >
                          KELAS {guru.walikelas}
                        </span>
                      ) : (
                        <span
                          className={`text-sm italic ${darkMode ? "text-gray-500" : "text-gray-400"}`}
                        >
                          -
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-center">
                      {guru.is_active ? (
                        <span
                          className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                            darkMode
                              ? "bg-green-900/30 text-green-300"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          Aktif
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                            darkMode ? "bg-red-900/30 text-red-300" : "bg-red-100 text-red-800"
                          }`}
                        >
                          Nonaktif
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState darkMode={darkMode} />
          )}
        </div>
      </Card>

      {/* Stats Footer */}
      {guruData.length > 0 && (
        <Card darkMode={darkMode}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 text-sm">
            <Text darkMode={darkMode} className="font-medium">
              Total:{" "}
              <span className={`font-bold ${darkMode ? "text-blue-400" : "text-blue-600"}`}>
                {guruData.length}
              </span>{" "}
              Guru & Staf
            </Text>
            <Text darkMode={darkMode} className="font-medium">
              Aktif:{" "}
              <span className={`font-bold ${darkMode ? "text-green-400" : "text-green-600"}`}>
                {guruData.filter((g) => g.is_active).length}
              </span>{" "}
              | Non-aktif:{" "}
              <span className={`font-bold ${darkMode ? "text-red-400" : "text-red-600"}`}>
                {guruData.filter((g) => !g.is_active).length}
              </span>
            </Text>
          </div>
        </Card>
      )}
    </PageContainer>
  );
};

export default Teachers;
