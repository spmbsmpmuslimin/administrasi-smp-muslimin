import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { getActiveAcademicInfo } from "../services/academicYearService";
import { RefreshCw } from "lucide-react";

// ✅ STANDARDISASI NAMA MAPEL - sama kayak InputNilai.js
const standardizeMapelName = (mapel) => {
  const mapping = {
    "BAHASA INGGRIS": "Bahasa Inggris",
    "BAHASA INDONESIA": "Bahasa Indonesia",
    MATEMATIKA: "Matematika (Umum)",
    "ILMU PENGETAHUAN ALAM": "Ilmu Pengetahuan Alam (IPA)",
    "ILMU PENGETAHUAN SOSIAL": "Ilmu Pengetahuan Sosial (IPS)",
    "PENDIDIKAN AGAMA ISLAM": "Pendidikan Agama Islam dan Budi Pekerti",
    "PENDIDIKAN PANCASILA": "Pendidikan Pancasila",
    PJOK: "Pendidikan Jasmani, Olahraga dan Kesehatan",
    INFORMATIKA: "Informatika",
    "BAHASA SUNDA": "Muatan Lokal Bahasa Daerah",
    "KODING & AI": "Koding dan AI",
    "SENI TARI": "Seni Tari",
    PRAKARYA: "Prakarya",
    "SENI RUPA": "Seni Rupa",
    "BP/BK": "BP/BK",
  };
  return mapping[mapel?.toUpperCase()] || mapel;
};

function CekNilai({ darkMode, user }) {
  const [loading, setLoading] = useState(false);
  const [semester, setSemester] = useState("");
  const [classList, setClassList] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [mapelList, setMapelList] = useState([]);
  const [selectedMapel, setSelectedMapel] = useState("");
  const [nilaiData, setNilaiData] = useState([]);
  const [academicInfo, setAcademicInfo] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [teacherAssignments, setTeacherAssignments] = useState([]);

  // Load academic year dan teacher assignments saat mount
  useEffect(() => {
    loadAcademicInfo();
  }, []);

  // Load teacher assignments setelah academic info ready
  useEffect(() => {
    if (academicInfo && user) {
      loadTeacherAssignments();
    }
  }, [academicInfo, user]);

  // Load mapel saat kelas dipilih
  useEffect(() => {
    if (selectedClass && teacherAssignments.length > 0) {
      loadMapelList();
    } else {
      setMapelList([]);
      setSelectedMapel("");
    }
  }, [selectedClass, teacherAssignments]);

  // Load nilai saat semua filter dipilih
  useEffect(() => {
    if (selectedClass && selectedMapel && semester && academicInfo) {
      loadNilaiData();
    } else {
      setNilaiData([]);
    }
  }, [selectedClass, selectedMapel, semester, academicInfo]);

  const loadAcademicInfo = async () => {
    const info = await getActiveAcademicInfo();
    setAcademicInfo(info);
    console.log("📅 Academic Info:", info);
  };

  const loadTeacherAssignments = async () => {
    setLoading(true);
    try {
      const teacherId = user?.teacher_id || user?.id;

      if (!teacherId) {
        console.error("❌ Teacher ID tidak ditemukan");
        setLoading(false);
        return;
      }

      console.log("👨‍🏫 Loading assignments for teacher:", teacherId);

      const { data, error } = await supabase
        .from("teacher_assignments")
        .select("*")
        .eq("teacher_id", teacherId)
        .eq("academic_year_id", academicInfo?.yearId);

      if (error) throw error;

      console.log("📚 Teacher Assignments:", data);
      setTeacherAssignments(data || []);

      // Extract unique class_id untuk dropdown kelas
      const uniqueClasses = [
        ...new Set(data?.map((item) => item.class_id)),
      ].filter(Boolean);

      // Load class details
      if (uniqueClasses.length > 0) {
        const { data: classData, error: classError } = await supabase
          .from("classes")
          .select("id, grade")
          .in("id", uniqueClasses)
          .eq("is_active", true)
          .order("grade");

        if (classError) throw classError;

        setClassList(classData || []);
        console.log("🏫 Available Classes:", classData);
      } else {
        setClassList([]);
        console.log("⚠️ No classes found for this teacher");
      }
    } catch (error) {
      console.error("❌ Error loading teacher assignments:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMapelList = () => {
    try {
      // Filter assignments by selected class (tanpa semester dulu)
      const filteredAssignments = teacherAssignments.filter(
        (assignment) => assignment.class_id === selectedClass
      );

      // Get unique subjects
      const uniqueMapel = [
        ...new Set(filteredAssignments.map((item) => item.subject)),
      ];
      setMapelList(uniqueMapel.sort());
      console.log("📚 Mapel List for class", selectedClass, ":", uniqueMapel);
    } catch (error) {
      console.error("❌ Error loading mapel:", error);
    }
  };

  const loadNilaiData = async () => {
    setLoadingData(true);
    try {
      // ✅ STANDARDIZE mapel name sebelum query
      const standardizedMapel = standardizeMapelName(selectedMapel);

      console.log("🔍 Query params:");
      console.log("  - Original mapel:", selectedMapel);
      console.log("  - Standardized mapel:", standardizedMapel);
      console.log("  - class_id:", selectedClass);
      console.log("  - semester:", semester);
      console.log("  - academic_year_id:", academicInfo?.yearId);

      const { data, error } = await supabase
        .from("nilai_eraport")
        .select(
          `
          *,
          students!inner(full_name, nis, is_active)
        `
        )
        .eq("class_id", selectedClass)
        .eq("semester", semester)
        .eq("mata_pelajaran", standardizedMapel)
        .eq("academic_year_id", academicInfo?.yearId)
        .eq("students.is_active", true)
        .order("students(full_name)");

      if (error) throw error;

      console.log("📊 Nilai Data:", data);
      setNilaiData(data || []);
    } catch (error) {
      console.error("❌ Error loading nilai:", error);
      alert("Gagal memuat data nilai: " + error.message);
    } finally {
      setLoadingData(false);
    }
  };

  const handleRefresh = () => {
    if (selectedClass && semester && selectedMapel && academicInfo) {
      loadNilaiData();
    }
  };

  const getKelasName = () => {
    const kelas = classList.find((k) => k.id === selectedClass);
    return kelas ? `Kelas ${kelas.id}` : "";
  };

  if (!academicInfo || loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center p-4 ${
          darkMode ? "bg-gray-900" : "bg-gradient-to-br from-blue-50 to-sky-100"
        }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className={darkMode ? "text-gray-300" : "text-gray-600"}>
            {!academicInfo
              ? "Memuat informasi akademik..."
              : "Memuat data mengajar..."}
          </p>
        </div>
      </div>
    );
  }

  // Empty state jika tidak ada assignments
  if (teacherAssignments.length === 0 && !loading) {
    return (
      <div
        className={`min-h-screen py-4 sm:py-8 px-3 sm:px-4 lg:px-6 ${
          darkMode
            ? "bg-gray-900"
            : "bg-gradient-to-br from-blue-50 to-blue-100"
        }`}>
        <div className="max-w-7xl mx-auto">
          <div
            className={`rounded-2xl shadow-xl p-8 text-center ${
              darkMode
                ? "bg-gray-800 border border-gray-700"
                : "bg-white border border-blue-200"
            }`}>
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                darkMode ? "bg-yellow-900/30" : "bg-yellow-100"
              }`}>
              <svg
                className={`w-8 h-8 ${
                  darkMode ? "text-yellow-400" : "text-yellow-600"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3
              className={`text-lg font-bold mb-2 ${
                darkMode ? "text-white" : "text-gray-900"
              }`}>
              Tidak Ada Data Mengajar
            </h3>
            <p className={darkMode ? "text-gray-400" : "text-gray-600"}>
              Anda belum ditugaskan mengajar kelas/mata pelajaran untuk tahun
              ajaran ini.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen py-4 sm:py-8 px-3 sm:px-4 lg:px-6 ${
        darkMode ? "bg-gray-900" : "bg-gradient-to-br from-blue-50 to-blue-100"
      }`}>
      <div className="max-w-7xl mx-auto">
        <div
          className={`rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 ${
            darkMode
              ? "bg-gray-800 border border-gray-700"
              : "bg-white border border-blue-200"
          }`}>
          {/* Header dengan Info Akademik */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b">
            <h2
              className={`text-xl sm:text-2xl lg:text-3xl font-bold mb-4 sm:mb-0 ${
                darkMode ? "text-white" : "text-blue-800"
              }`}>
              Cek Nilai Siswa
            </h2>
            <div
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                darkMode
                  ? "bg-blue-900/30 text-blue-300"
                  : "bg-blue-100 text-blue-800"
              }`}>
              {academicInfo.displayText}
            </div>
          </div>

          {/* Info Akademik Detail */}
          <div
            className="mb-6 p-4 rounded-lg border bg-opacity-50"
            style={{
              backgroundColor: darkMode
                ? "rgba(30, 58, 138, 0.2)"
                : "rgba(219, 234, 254, 0.5)",
              borderColor: darkMode ? "#374151" : "#bfdbfe",
            }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex flex-col">
                <span
                  className={`text-xs font-medium mb-1 ${
                    darkMode ? "text-gray-400" : "text-gray-500"
                  }`}>
                  Tahun Ajaran Aktif
                </span>
                <span
                  className={`font-medium ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}>
                  {academicInfo.year}
                </span>
              </div>
              <div className="flex flex-col">
                <span
                  className={`text-xs font-medium mb-1 ${
                    darkMode ? "text-gray-400" : "text-gray-500"
                  }`}>
                  Semester Aktif di Sistem
                </span>
                <span
                  className={`font-medium ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}>
                  {academicInfo.semesterText}
                </span>
              </div>
              <div className="flex flex-col">
                <span
                  className={`text-xs font-medium mb-1 ${
                    darkMode ? "text-gray-400" : "text-gray-500"
                  }`}>
                  Status Tahun Ajaran
                </span>
                <span
                  className={`font-medium ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}>
                  {academicInfo.isActive ? "Aktif" : "Tidak Aktif"}
                </span>
              </div>
            </div>
          </div>

          {/* Filter Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-8">
            {/* Pilih Kelas */}
            <div>
              <label
                className={`block text-sm sm:text-base font-semibold mb-2 ${
                  darkMode ? "text-gray-300" : "text-blue-700"
                }`}>
                Pilih Kelas
              </label>
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedMapel("");
                  setSemester("");
                  setNilaiData([]);
                }}
                className={`w-full p-3 sm:p-4 rounded-xl border text-sm sm:text-base transition-all duration-200 ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    : "bg-white border-blue-300 text-blue-900 focus:border-blue-500 focus:ring-3 focus:ring-blue-500/20"
                }`}>
                <option value="" className="dark:bg-gray-800">
                  -- Pilih Kelas --
                </option>
                {classList.map((kelas) => (
                  <option
                    key={kelas.id}
                    value={kelas.id}
                    className="dark:bg-gray-800">
                    Kelas {kelas.id}
                  </option>
                ))}
              </select>
            </div>

            {/* Pilih Mapel */}
            <div>
              <label
                className={`block text-sm sm:text-base font-semibold mb-2 ${
                  darkMode ? "text-gray-300" : "text-blue-700"
                }`}>
                Pilih Mata Pelajaran
              </label>
              <select
                value={selectedMapel}
                onChange={(e) => {
                  setSelectedMapel(e.target.value);
                  setSemester("");
                  setNilaiData([]);
                }}
                disabled={!selectedClass}
                className={`w-full p-3 sm:p-4 rounded-xl border text-sm sm:text-base transition-all duration-200 ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    : "bg-white border-blue-300 text-blue-900 focus:border-blue-500 focus:ring-3 focus:ring-blue-500/20"
                } disabled:opacity-50 disabled:cursor-not-allowed`}>
                <option value="" className="dark:bg-gray-800">
                  -- Pilih Mata Pelajaran --
                </option>
                {mapelList.map((mapel, idx) => (
                  <option key={idx} value={mapel} className="dark:bg-gray-800">
                    {mapel}
                  </option>
                ))}
              </select>
            </div>

            {/* Pilih Semester */}
            <div>
              <label
                className={`block text-sm sm:text-base font-semibold mb-2 ${
                  darkMode ? "text-gray-300" : "text-blue-700"
                }`}>
                Pilih Semester
              </label>
              <select
                value={semester}
                onChange={(e) => {
                  setSemester(e.target.value);
                  setNilaiData([]);
                }}
                disabled={!selectedMapel}
                className={`w-full p-3 sm:p-4 rounded-xl border text-sm sm:text-base transition-all duration-200 ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    : "bg-white border-blue-300 text-blue-900 focus:border-blue-500 focus:ring-3 focus:ring-blue-500/20"
                } disabled:opacity-50 disabled:cursor-not-allowed`}>
                <option value="" className="dark:bg-gray-800">
                  -- Pilih Semester --
                </option>
                <option value="1" className="dark:bg-gray-800">
                  Semester Ganjil
                </option>
                <option value="2" className="dark:bg-gray-800">
                  Semester Genap
                </option>
              </select>
            </div>
          </div>

          {/* Loading State */}
          {loadingData && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              <p
                className={`mt-3 text-sm sm:text-base ${
                  darkMode ? "text-gray-300" : "text-gray-600"
                }`}>
                Memuat data nilai...
              </p>
            </div>
          )}

          {/* Data Table */}
          {!loadingData && nilaiData.length > 0 && (
            <>
              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                <div>
                  <h3
                    className={`text-lg font-bold ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}>
                    Daftar Nilai - {selectedMapel}
                  </h3>
                  <p
                    className={`text-sm ${
                      darkMode ? "text-gray-400" : "text-gray-600"
                    }`}>
                    {getKelasName()} • Semester {semester} •{" "}
                    {academicInfo?.year}
                  </p>
                </div>
                <button
                  onClick={handleRefresh}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                    darkMode
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}>
                  <RefreshCw size={18} />
                  Refresh
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border shadow-sm">
                <table className="w-full border-collapse">
                  <thead
                    className={
                      darkMode
                        ? "bg-gray-700 text-white"
                        : "bg-blue-700 text-white"
                    }>
                    <tr>
                      <th className="p-3 sm:p-4 text-center border-r border-gray-600 dark:border-gray-600">
                        No
                      </th>
                      <th className="p-3 sm:p-4 text-left border-r border-gray-600 dark:border-gray-600">
                        Nama Siswa
                      </th>
                      <th className="p-3 sm:p-4 text-center border-r border-gray-600 dark:border-gray-600">
                        NIS
                      </th>
                      <th className="p-3 sm:p-4 text-center border-r border-gray-600 dark:border-gray-600">
                        Nilai Akhir
                      </th>
                      <th className="p-3 sm:p-4 text-left">
                        Capaian Kompetensi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {nilaiData.map((nilai, idx) => (
                      <tr
                        key={nilai.id}
                        className={`border-b ${
                          darkMode
                            ? "border-gray-700 hover:bg-gray-800/50"
                            : "border-blue-100 hover:bg-blue-50/50"
                        }`}>
                        <td
                          className={`p-3 sm:p-4 text-center border-r border-gray-600 dark:border-gray-600 font-medium ${
                            darkMode ? "text-white" : "text-gray-900"
                          }`}>
                          {idx + 1}
                        </td>
                        <td
                          className={`p-3 sm:p-4 border-r border-gray-600 dark:border-gray-600 font-medium ${
                            darkMode ? "text-white" : "text-gray-900"
                          }`}>
                          {nilai.students?.full_name || "-"}
                        </td>
                        <td
                          className={`p-3 sm:p-4 text-center border-r border-gray-600 dark:border-gray-600 font-mono ${
                            darkMode ? "text-white" : "text-gray-900"
                          }`}>
                          {nilai.students?.nis || "-"}
                        </td>
                        <td
                          className={`p-3 sm:p-4 text-center border-r border-gray-600 dark:border-gray-600 font-bold text-lg ${
                            darkMode ? "text-white" : "text-blue-900"
                          }`}>
                          {nilai.nilai_akhir || "-"}
                        </td>
                        <td
                          className={`p-3 sm:p-4 text-sm ${
                            darkMode ? "text-gray-300" : "text-gray-700"
                          }`}>
                          {nilai.deskripsi_capaian || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div
                className={`mt-4 p-3 rounded-lg ${
                  darkMode
                    ? "bg-blue-900/30 text-blue-300"
                    : "bg-blue-100 text-blue-800"
                }`}>
                <p className="text-sm">
                  <span className="font-semibold">Total Siswa:</span>{" "}
                  {nilaiData.length} siswa
                </p>
              </div>
            </>
          )}

          {/* Empty State - Belum Pilih Filter */}
          {!loadingData && !selectedMapel && (
            <div className="text-center py-12 rounded-xl border border-dashed">
              <div
                className={`${
                  darkMode ? "text-gray-500" : "text-blue-400"
                } mb-3`}>
                <svg
                  className="w-16 h-16 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <p
                className={`text-sm sm:text-base ${
                  darkMode ? "text-gray-400" : "text-gray-500"
                }`}>
                Silakan pilih Kelas, Mata Pelajaran, dan Semester untuk melihat
                nilai siswa
              </p>
              <div
                className={`mt-3 px-3 py-1.5 rounded-lg text-sm inline-block ${
                  darkMode
                    ? "bg-blue-900/30 text-blue-300"
                    : "bg-blue-100 text-blue-800"
                }`}>
                Tahun Ajaran: {academicInfo.year}
              </div>
            </div>
          )}

          {/* Empty State - Data Kosong */}
          {!loadingData && selectedMapel && nilaiData.length === 0 && (
            <div className="text-center py-12 rounded-xl border border-dashed">
              <div
                className={`${
                  darkMode ? "text-gray-500" : "text-gray-400"
                } mb-2`}>
                <svg
                  className="w-16 h-16 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
              </div>
              <p
                className={`text-sm sm:text-base ${
                  darkMode ? "text-gray-400" : "text-gray-500"
                }`}>
                Tidak ada data nilai untuk filter yang dipilih
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CekNilai;
