import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const CekNilai = ({ user, darkMode, onShowToast }) => {
  const [selectedKelas, setSelectedKelas] = useState("");
  const [kelasList, setKelasList] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalSiswa, setTotalSiswa] = useState(0);
  const [tahunAjaranId, setTahunAjaranId] = useState("");
  const [semester, setSemester] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Load user data dan tahun ajaran aktif saat component mount
  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  // Load status penilaian ketika kelas dipilih
  useEffect(() => {
    if (selectedKelas && tahunAjaranId && semester) {
      loadStatusPenilaian();
    }
  }, [selectedKelas, tahunAjaranId, semester]);

  // Di loadInitialData function:
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      console.log("🔍 Loading initial data for user:", user);

      // 1. Set current user dari props
      setCurrentUser(user);

      // 2. Get tahun ajaran aktif dari academic_years
      const { data: academicYear, error: ayError } = await supabase
        .from("academic_years")
        .select("id, year, semester")
        .eq("is_active", true)
        .single();

      if (ayError) {
        console.error("Error loading academic year:", ayError);
        // Fallback: coba ambil semester dari eraport_settings
        const { data: eraportSettings, error: settingsError } = await supabase
          .from("eraport_settings")
          .select("academic_year_id, semester")
          .eq("is_active", true)
          .single();

        if (settingsError) {
          throw new Error("Tahun ajaran aktif tidak ditemukan.");
        }

        const { data: ayData, error: ayDataError } = await supabase
          .from("academic_years")
          .select("id, year, semester")
          .eq("id", eraportSettings.academic_year_id)
          .single();

        if (ayDataError) throw ayDataError;

        setTahunAjaranId(ayData.id);
        setSemester(eraportSettings.semester || "1");
      } else {
        setTahunAjaranId(academicYear.id);
        setSemester(academicYear.semester || "1");
      }

      console.log(
        "📅 Academic Year ID:",
        academicYear?.id,
        "Semester:",
        academicYear?.semester
      );

      // 3. Load kelas list (kelas yang dia jadi wali kelas)
      if (user.homeroom_class_id) {
        console.log(
          "👨‍🏫 User is homeroom teacher for class:",
          user.homeroom_class_id
        );

        const { data: kelasData, error: kelasError } = await supabase
          .from("classes")
          .select("id, grade")
          .eq("id", user.homeroom_class_id) // PAKAI ID, bukan grade!
          .eq("is_active", true);

        if (kelasError) {
          console.error("Error loading classes:", kelasError);
          setErrorMessage(`Gagal memuat data kelas: ${kelasError.message}`);
        } else {
          console.log("🏫 Classes found:", kelasData);

          // Format data untuk dropdown: tampilkan ID (7F) sebagai label
          const formattedClasses = kelasData.map((kelas) => ({
            id: kelas.id, // "7F"
            grade: kelas.id, // Tampilkan ID sebagai display name
          }));

          setKelasList(formattedClasses);

          // Auto select kelas jika cuma 1
          if (formattedClasses && formattedClasses.length === 1) {
            setSelectedKelas(formattedClasses[0].id);
            console.log("✅ Auto-selected class:", formattedClasses[0].id);
          }
        }
      } else {
        console.log("❌ User is NOT a homeroom teacher");
        setErrorMessage(
          "Anda bukan wali kelas. Fitur ini hanya untuk wali kelas."
        );
      }
    } catch (error) {
      console.error("Error loading initial data:", error);
      setErrorMessage(error.message || "Terjadi kesalahan saat memuat data.");
      if (onShowToast) {
        onShowToast(`Error: ${error.message}`, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadStatusPenilaian = async () => {
    setLoading(true);
    setStatusData([]);
    try {
      console.log("📊 Loading status penilaian for class:", selectedKelas);

      // 1. Hitung total siswa di kelas
      const { data: siswaData, error: siswaError } = await supabase
        .from("students")
        .select("id")
        .eq("class_id", selectedKelas)
        .eq("is_active", true);

      if (siswaError) throw siswaError;

      const jumlahSiswa = siswaData?.length || 0;
      setTotalSiswa(jumlahSiswa);

      console.log("👥 Total siswa:", jumlahSiswa);

      // 2. Get semua DISTINCT mata pelajaran yang ada di teacher_assignments untuk tahun ajaran ini
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("teacher_assignments")
        .select("subject")
        .eq("class_id", selectedKelas)
        .eq("academic_year_id", tahunAjaranId)
        .eq("semester", semester);

      if (assignmentsError) {
        console.error("Error loading teacher assignments:", assignmentsError);
        // Fallback: coba ambil dari tujuan_pembelajaran
        const { data: tpData, error: tpError } = await supabase
          .from("tujuan_pembelajaran")
          .select("mata_pelajaran")
          .eq("class_id", selectedKelas)
          .eq("tahun_ajaran_id", tahunAjaranId)
          .eq("semester", semester)
          .order("mata_pelajaran");

        if (tpError) throw tpError;

        const subjects = [
          ...new Set(tpData?.map((item) => item.mata_pelajaran) || []),
        ];
        console.log("📚 Subjects from tujuan_pembelajaran:", subjects);

        // Process each subject
        const statusPromises = subjects.map(async (mapel, index) => {
          return await getMapelStatus(mapel, index, jumlahSiswa);
        });

        const hasil = await Promise.all(statusPromises);
        setStatusData(hasil.filter((item) => item !== null));
      } else {
        // Get unique subjects from assignments
        const subjects = [
          ...new Set(assignmentsData?.map((item) => item.subject) || []),
        ];
        console.log("📚 Subjects from teacher_assignments:", subjects);

        // Process each subject
        const statusPromises = subjects.map(async (mapel, index) => {
          return await getMapelStatus(mapel, index, jumlahSiswa);
        });

        const hasil = await Promise.all(statusPromises);
        setStatusData(hasil.filter((item) => item !== null));
      }
    } catch (error) {
      console.error("Error loading status penilaian:", error);
      setErrorMessage(`Gagal memuat data status penilaian: ${error.message}`);
      if (onShowToast) {
        onShowToast(`Error: ${error.message}`, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const getMapelStatus = async (mapel, index, jumlahSiswa) => {
    try {
      // AMBIL DESKRIPSI LANGSUNG DARI nilai_eraport
      const { data: nilaiData, error: nilaiError } = await supabase
        .from("nilai_eraport")
        .select("id, student_id, nilai_akhir, deskripsi_capaian")
        .eq("class_id", selectedKelas)
        .eq("mata_pelajaran", mapel)
        .eq("tahun_ajaran_id", tahunAjaranId)
        .eq("semester", semester);

      if (nilaiError) return null;

      const siswaDenganNilai =
        nilaiData?.filter((item) => {
          if (!item.nilai_akhir) return false;
          const nilai = item.nilai_akhir.toString().trim();
          return parseFloat(nilai) > 0;
        }) || [];

      const jumlahNilai = siswaDenganNilai.length;

      // HITUNG DESKRIPSI dari field deskripsi_capaian
      const jumlahDeskripsi = siswaDenganNilai.filter(
        (item) =>
          item.deskripsi_capaian &&
          item.deskripsi_capaian.toString().trim() !== ""
      ).length;

      return {
        no: index + 1,
        nama_mapel: mapel,
        kelas: selectedKelas,
        jumlah_nilai: jumlahNilai,
        jumlah_deskripsi: jumlahDeskripsi,
        total_siswa: jumlahSiswa,
      };
    } catch (error) {
      return null;
    }
  };

  const formatStatusNilai = (jumlah, total) => {
    if (total === 0) return "0 Data";
    if (jumlah === 0) return "0 Data";
    if (jumlah === total) return `${jumlah} Data`;
    return `${jumlah}/${total} Data`;
  };

  const getTextColor = (jumlah, total) => {
    if (jumlah === 0) return "text-red-600 dark:text-red-400";
    if (jumlah === total) return "text-green-700 dark:text-green-400";
    return "text-amber-600 dark:text-amber-400";
  };

  if (loading && !selectedKelas) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${
          darkMode
            ? "bg-gradient-to-br from-gray-900 to-gray-800"
            : "bg-gradient-to-br from-blue-50 to-sky-100"
        }`}>
        <div className="text-center">
          <div
            className={`animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-4 mx-auto mb-3 sm:mb-4 transition-colors ${
              darkMode ? "border-blue-400" : "border-blue-600"
            }`}></div>
          <p
            className={`text-sm sm:text-base font-medium transition-colors ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}>
            Memuat data...
          </p>
        </div>
      </div>
    );
  }

  if (errorMessage && !currentUser?.homeroom_class_id) {
    return (
      <div
        className={`min-h-screen py-4 sm:py-8 px-4 transition-colors duration-300 ${
          darkMode
            ? "bg-gradient-to-br from-gray-900 to-gray-800"
            : "bg-gradient-to-br from-blue-50 to-sky-100"
        }`}>
        <div className="max-w-7xl mx-auto">
          <div
            className={`rounded-2xl shadow-2xl p-4 sm:p-8 border transition-colors ${
              darkMode
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-blue-200"
            }`}>
            <div className="text-center py-8 sm:py-12">
              <div
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 ${
                  darkMode ? "bg-blue-900/30" : "bg-blue-100"
                }`}>
                <svg
                  className={`w-7 h-7 sm:w-8 sm:h-8 ${
                    darkMode ? "text-blue-400" : "text-blue-600"
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
                className={`text-lg sm:text-xl font-bold mb-2 transition-colors ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}>
                Akses Dibatasi
              </h3>
              <p
                className={`text-sm sm:text-base mb-6 transition-colors ${
                  darkMode ? "text-gray-300" : "text-gray-600"
                }`}>
                {errorMessage}
              </p>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <p>User: {currentUser?.full_name}</p>
                <p>Teacher ID: {currentUser?.teacher_id}</p>
                <p>
                  Homeroom Class ID:{" "}
                  {currentUser?.homeroom_class_id || "Tidak ada"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen py-4 sm:py-8 px-4 transition-colors duration-300 ${
        darkMode
          ? "bg-gradient-to-br from-gray-900 to-gray-800"
          : "bg-gradient-to-br from-blue-50 to-sky-100"
      }`}>
      <div className="max-w-7xl mx-auto">
        <div
          className={`rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8 border transition-colors ${
            darkMode
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-blue-200"
          }`}>
          <h1
            className={`text-lg md:text-xl lg:text-2xl font-bold mb-6 md:mb-8 transition-colors ${
              darkMode ? "text-white" : "text-gray-900"
            }`}>
            STATUS PENILAIAN OLEH GURU MAPEL
          </h1>

          {/* User Info */}
          {currentUser && (
            <div
              className={`mb-6 p-4 rounded-xl border ${
                darkMode
                  ? "bg-blue-900/20 border-blue-500"
                  : "bg-blue-50 border-blue-300"
              }`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3
                    className={`font-bold text-base sm:text-lg transition-colors ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}>
                    {currentUser.full_name}
                  </h3>
                  <p
                    className={`text-sm sm:text-base mt-1 transition-colors ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}>
                    {currentUser.teacher_id} • {currentUser.role}
                  </p>
                </div>
                <div
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                    currentUser.homeroom_class_id
                      ? darkMode
                        ? "bg-blue-700 text-blue-100"
                        : "bg-blue-600 text-white"
                      : darkMode
                      ? "bg-gray-700 text-gray-300"
                      : "bg-gray-600 text-white"
                  }`}>
                  {currentUser.homeroom_class_id
                    ? `Wali Kelas ${currentUser.homeroom_class_id}`
                    : "Bukan Wali Kelas"}
                </div>
              </div>
            </div>
          )}

          {/* Filter Section */}
          <div className="mb-6 md:mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <label
                className={`text-sm sm:text-base font-medium w-full sm:w-32 transition-colors ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}>
                Pilih Kelas:
              </label>
              <div className="flex-1">
                <select
                  value={selectedKelas}
                  onChange={(e) => setSelectedKelas(e.target.value)}
                  disabled={kelasList.length === 0}
                  className={`w-full p-2.5 sm:p-3 border rounded-lg focus:ring-2 focus:outline-none transition-all text-sm sm:text-base min-h-[44px] ${
                    darkMode
                      ? "bg-gray-700 border-gray-600 text-white focus:ring-blue-400 focus:border-blue-400 disabled:bg-gray-800"
                      : "bg-white border-blue-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  }`}>
                  <option value="" disabled className="text-gray-400">
                    {kelasList.length === 0
                      ? "-- Tidak ada kelas --"
                      : "-- Pilih Kelas --"}
                  </option>
                  {kelasList.map((kelas) => (
                    <option key={kelas.id} value={kelas.id}>
                      Kelas {kelas.grade} {/* Tampilkan ID (7F) */}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedKelas && totalSiswa > 0 && (
              <div
                className={`mt-4 text-sm sm:text-base transition-colors ${
                  darkMode ? "text-gray-300" : "text-gray-600"
                }`}>
                Total Siswa di Kelas {selectedKelas}:{" "}
                <span className="font-semibold">{totalSiswa} siswa</span>
              </div>
            )}
          </div>

          {/* Table Section */}
          {selectedKelas ? (
            <div
              className={`rounded-xl border overflow-hidden ${
                darkMode ? "border-gray-700" : "border-gray-200"
              }`}>
              {loading ? (
                <div className="text-center py-12">
                  <div
                    className={`inline-block animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-4 mx-auto mb-3 sm:mb-4 ${
                      darkMode ? "border-blue-400" : "border-blue-600"
                    }`}></div>
                  <p
                    className={`text-sm sm:text-base transition-colors ${
                      darkMode ? "text-gray-300" : "text-gray-600"
                    }`}>
                    Memuat data penilaian...
                  </p>
                </div>
              ) : statusData.length === 0 ? (
                <div
                  className={`text-center py-12 ${
                    darkMode ? "text-gray-400" : "text-gray-500"
                  }`}>
                  <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <svg
                      className={`w-12 h-12 ${
                        darkMode ? "text-gray-600" : "text-blue-400"
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
                      />
                    </svg>
                  </div>
                  <p className="text-base sm:text-lg font-medium mb-1">
                    Belum ada data penilaian
                  </p>
                  <p className="text-sm">
                    Guru mapel belum mengisi nilai untuk kelas ini
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px]">
                    <thead className={darkMode ? "bg-blue-900" : "bg-blue-700"}>
                      <tr>
                        <th
                          className={`p-3 sm:p-4 text-center text-white text-sm sm:text-base font-medium border-r ${
                            darkMode ? "border-blue-800" : "border-blue-600"
                          } w-16`}>
                          No
                        </th>
                        <th
                          className={`p-3 sm:p-4 text-left text-white text-sm sm:text-base font-medium border-r ${
                            darkMode ? "border-blue-800" : "border-blue-600"
                          }`}>
                          Nama Mapel
                        </th>
                        <th
                          className={`p-3 sm:p-4 text-center text-white text-sm sm:text-base font-medium border-r ${
                            darkMode ? "border-blue-800" : "border-blue-600"
                          } w-40`}>
                          Kelas
                        </th>
                        <th
                          className={`p-3 sm:p-4 text-center text-white text-sm sm:text-base font-medium border-r ${
                            darkMode ? "border-blue-800" : "border-blue-600"
                          }`}
                          colSpan="2">
                          <div className="font-bold mb-2">Nilai Rapor</div>
                          <div
                            className={`flex border-t ${
                              darkMode ? "border-blue-800" : "border-blue-600"
                            }`}>
                            <div
                              className={`flex-1 py-2 border-r ${
                                darkMode ? "border-blue-800" : "border-blue-600"
                              }`}>
                              Nilai Rapor
                            </div>
                            <div className="flex-1 py-2">Deskripsi</div>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {statusData.map((item, index) => (
                        <tr
                          key={item.no}
                          className={`border-b ${
                            darkMode
                              ? index % 2 === 0
                                ? "bg-gray-800/50 border-gray-700"
                                : "bg-gray-800 border-gray-700"
                              : index % 2 === 0
                              ? "bg-blue-50 border-blue-100"
                              : "bg-white border-blue-100"
                          }`}>
                          <td
                            className={`p-3 sm:p-4 text-center text-sm sm:text-base font-semibold border-r ${
                              darkMode
                                ? "border-gray-700 text-gray-300"
                                : "border-blue-100 text-gray-700"
                            }`}>
                            {item.no}
                          </td>
                          <td
                            className={`p-3 sm:p-4 text-sm sm:text-base border-r ${
                              darkMode
                                ? "border-gray-700 text-gray-200"
                                : "border-blue-100 text-gray-900"
                            }`}>
                            {item.nama_mapel}
                          </td>
                          <td
                            className={`p-3 sm:p-4 text-center text-sm sm:text-base border-r ${
                              darkMode
                                ? "border-gray-700 text-gray-300"
                                : "border-blue-100 text-gray-700"
                            }`}>
                            {item.rombel}
                          </td>
                          <td
                            className={`p-3 sm:p-4 text-center text-sm sm:text-base border-r ${
                              darkMode
                                ? "bg-gray-700/50 border-gray-700"
                                : "bg-gray-100 border-blue-100"
                            }`}>
                            <span
                              className={`font-semibold ${getTextColor(
                                item.jumlah_nilai,
                                item.total_siswa
                              )}`}>
                              {formatStatusNilai(
                                item.jumlah_nilai,
                                item.total_siswa
                              )}
                            </span>
                          </td>
                          <td
                            className={`p-3 sm:p-4 text-center text-sm sm:text-base ${
                              darkMode ? "bg-gray-700/50" : "bg-gray-100"
                            }`}>
                            <span
                              className={`font-semibold ${getTextColor(
                                item.jumlah_deskripsi,
                                item.total_siswa
                              )}`}>
                              {formatStatusNilai(
                                item.jumlah_deskripsi,
                                item.total_siswa
                              )}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div
              className={`text-center py-12 rounded-xl border-2 border-dashed ${
                darkMode
                  ? "text-gray-400 border-gray-700 bg-gray-800/50"
                  : "text-gray-500 border-blue-300 bg-blue-50"
              }`}>
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <svg
                  className={`w-12 h-12 ${
                    darkMode ? "text-gray-600" : "text-blue-400"
                  }`}
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
              <p className="text-base sm:text-lg font-medium mb-2">
                {kelasList.length === 0
                  ? "Anda bukan wali kelas"
                  : "Pilih Kelas"}
              </p>
              <p className="text-sm">
                {kelasList.length === 0
                  ? "Fitur ini hanya tersedia untuk wali kelas"
                  : "Untuk melihat status penilaian guru mapel"}
              </p>
            </div>
          )}

          {/* Legend */}
          {selectedKelas && statusData.length > 0 && (
            <div
              className={`mt-6 p-4 rounded-xl border ${
                darkMode
                  ? "bg-gray-800/50 border-gray-700"
                  : "bg-blue-50 border-blue-200"
              }`}>
              <h3
                className={`font-semibold mb-3 transition-colors ${
                  darkMode ? "text-white" : "text-gray-700"
                }`}>
                Keterangan Status:
              </h3>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-green-700 dark:bg-green-500 rounded"></span>
                  <span
                    className={darkMode ? "text-gray-300" : "text-gray-600"}>
                    Lengkap (semua siswa sudah dinilai)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-amber-600 dark:bg-amber-500 rounded"></span>
                  <span
                    className={darkMode ? "text-gray-300" : "text-gray-600"}>
                    Sebagian (belum semua siswa dinilai)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-red-600 dark:bg-red-500 rounded"></span>
                  <span
                    className={darkMode ? "text-gray-300" : "text-gray-600"}>
                    Kosong (belum ada yang dinilai)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CekNilai;
