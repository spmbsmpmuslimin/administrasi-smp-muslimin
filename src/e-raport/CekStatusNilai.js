import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  getActiveAcademicInfo,
  applyAcademicFilters,
} from "../services/academicYearService";

// ✅ FUNGSI MAPPING NAMA MAPEL
const mapelToRaportName = (mapelTeacher) => {
  const mapping = {
    // Format dari teacher_assignments → Format di nilai_eraport
    "PENDIDIKAN AGAMA ISLAM": "Pendidikan Agama Islam dan Budi Pekerti",
    "PENDIDIKAN PANCASILA": "Pendidikan Pancasila",
    "BAHASA INDONESIA": "Bahasa Indonesia",
    MATEMATIKA: "Matematika (Umum)",
    "ILMU PENGETAHUAN ALAM": "Ilmu Pengetahuan Alam (IPA)",
    "ILMU PENGETAHUAN SOSIAL": "Ilmu Pengetahuan Sosial (IPS)",
    "BAHASA INGGRIS": "Bahasa Inggris",
    PJOK: "Pendidikan Jasmani, Olahraga dan Kesehatan",
    INFORMATIKA: "Informatika",
    "BAHASA SUNDA": "Muatan Lokal Bahasa Daerah",
    "KODING & AI": "Koding dan AI",
    "SENI TARI": "Seni Tari",
    PRAKARYA: "Prakarya",
    "SENI RUPA": "Seni Rupa",
    "BP/BK": "BP/BK",

    // Tambahan mapping dari format yang mungkin ada di database
    "PENDIDIKAN AGAMA ISLAM DAN BUDI PEKERTI":
      "Pendidikan Agama Islam dan Budi Pekerti",
    "MATEMATIKA (UMUM)": "Matematika (Umum)",
    "ILMU PENGETAHUAN ALAM (IPA)": "Ilmu Pengetahuan Alam (IPA)",
    "ILMU PENGETAHUAN SOSIAL (IPS)": "Ilmu Pengetahuan Sosial (IPS)",
    "PENDIDIKAN JASMANI, OLAHRAGA DAN KESEHATAN":
      "Pendidikan Jasmani, Olahraga dan Kesehatan",
    "MUATAN LOKAL BAHASA DAERAH": "Muatan Lokal Bahasa Daerah",
    "KODING DAN AI": "Koding dan AI",
  };

  // Return mapping jika ada, jika tidak return as-is
  const mapped = mapping[mapelTeacher?.toUpperCase()] || mapelTeacher;
  return mapped;
};

const CekNilai = ({ user, darkMode, onShowToast }) => {
  const [selectedKelas, setSelectedKelas] = useState("");
  const [kelasList, setKelasList] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalSiswa, setTotalSiswa] = useState(0);
  const [academicInfo, setAcademicInfo] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [showDebug, setShowDebug] = useState(false); // For debugging

  // Load user data dan tahun ajaran aktif saat component mount
  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  // Load status penilaian ketika kelas dipilih
  useEffect(() => {
    if (selectedKelas && academicInfo) {
      loadStatusPenilaian();
    }
  }, [selectedKelas, academicInfo]);

  // Load initial data
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      console.log("🔍 Loading initial data for user:", user);

      // 1. Set current user dari props
      setCurrentUser(user);

      // ✅ 2. Pakai getActiveAcademicInfo dari service
      const academicData = await getActiveAcademicInfo();

      if (!academicData) {
        throw new Error("Informasi tahun ajaran aktif tidak ditemukan.");
      }

      setAcademicInfo(academicData);

      console.log(
        "📅 Academic Info:",
        academicData,
        "Year ID:",
        academicData.yearId,
        "Semester:",
        academicData.semester
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
          .eq("id", user.homeroom_class_id)
          .eq("is_active", true);

        if (kelasError) {
          console.error("Error loading classes:", kelasError);
          setErrorMessage(`Gagal memuat data kelas: ${kelasError.message}`);
        } else {
          console.log("🏫 Classes found:", kelasData);

          // Format data untuk dropdown: tampilkan ID (7F) sebagai label
          const formattedClasses = kelasData.map((kelas) => ({
            id: kelas.id,
            grade: kelas.id,
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
    if (!academicInfo) {
      setErrorMessage("Informasi tahun ajaran belum tersedia");
      return;
    }

    setLoading(true);
    setStatusData([]);
    try {
      console.log("📊 ========== START LOAD STATUS ==========");
      console.log("📊 Class:", selectedKelas);
      console.log("📊 Academic Year ID:", academicInfo.yearId);
      console.log("📊 Semester:", academicInfo.semester);

      // 1. Hitung total siswa di kelas
      const { data: siswaData, error: siswaError } = await supabase
        .from("students")
        .select("id, full_name")
        .eq("class_id", selectedKelas)
        .eq("is_active", true);

      if (siswaError) throw siswaError;

      const jumlahSiswa = siswaData?.length || 0;
      setTotalSiswa(jumlahSiswa);

      console.log("👥 Total siswa aktif:", jumlahSiswa);

      // 2. Cek data langsung dari nilai_eraport untuk debugging
      const { data: nilaiDebug, error: nilaiDebugError } = await supabase
        .from("nilai_eraport")
        .select("mata_pelajaran")
        .eq("class_id", selectedKelas)
        .eq("academic_year_id", academicInfo.yearId)
        .eq("semester", academicInfo.semester);

      if (!nilaiDebugError && nilaiDebug) {
        // Group manual untuk debugging
        const mapelCount = nilaiDebug.reduce((acc, item) => {
          acc[item.mata_pelajaran] = (acc[item.mata_pelajaran] || 0) + 1;
          return acc;
        }, {});
        console.log("🔍 Mata pelajaran di nilai_eraport:", mapelCount);
      }

      // 3. Load teacher assignments dengan applyAcademicFilters
      let assignmentsQuery = supabase
        .from("teacher_assignments")
        .select("subject, teacher_id")
        .eq("class_id", selectedKelas);

      assignmentsQuery = await applyAcademicFilters(assignmentsQuery, {
        filterYearId: true,
        filterSemester: true,
      });

      const { data: assignmentsData, error: assignmentsError } =
        await assignmentsQuery;

      if (assignmentsError) {
        console.error("Error loading teacher assignments:", assignmentsError);
        throw assignmentsError;
      }

      console.log(
        "📚 Teacher assignments found:",
        assignmentsData?.length || 0
      );

      // Get unique subjects dari teacher_assignments
      const subjectsFromTeacher = [
        ...new Set(assignmentsData?.map((item) => item.subject) || []),
      ];

      console.log("📚 Subjects from teacher_assignments:", subjectsFromTeacher);

      // ✅ MAPPING NAMA MAPEL KE FORMAT RAPORT
      const subjects = subjectsFromTeacher.map((mapel) => {
        const mapped = mapelToRaportName(mapel);
        console.log(`📚 Mapping: "${mapel}" → "${mapped}"`);
        return mapped;
      });

      console.log("📚 Final subjects to check:", subjects);

      // 4. Process each subject
      const statusPromises = subjects.map(async (mapel, index) => {
        return await getMapelStatus(mapel, index, jumlahSiswa);
      });

      const hasil = await Promise.all(statusPromises);

      // Urutan standar mata pelajaran sesuai kurikulum
      const urutanMapel = [
        "Pendidikan Agama Islam dan Budi Pekerti",
        "Pendidikan Pancasila",
        "Bahasa Indonesia",
        "Matematika (Umum)",
        "Ilmu Pengetahuan Alam (IPA)",
        "Ilmu Pengetahuan Sosial (IPS)",
        "Bahasa Inggris",
        "Informatika",
        "Pendidikan Jasmani, Olahraga dan Kesehatan",
        "Seni Tari",
        "Seni Rupa",
        "Prakarya",
        "Muatan Lokal Bahasa Daerah",
        "Koding dan AI",
        "BP/BK",
      ];

      // Filter null dan sort berdasarkan urutan standar
      const filteredHasil = hasil
        .filter((item) => item !== null)
        .sort((a, b) => {
          const indexA = urutanMapel.indexOf(a.nama_mapel);
          const indexB = urutanMapel.indexOf(b.nama_mapel);

          // Jika kedua mapel ada di urutan standar
          if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
          }
          // Jika mapel A tidak ada di urutan, taruh di belakang
          if (indexA === -1) return 1;
          // Jika mapel B tidak ada di urutan, taruh di belakang
          if (indexB === -1) return -1;
          // Fallback ke alfabetis
          return a.nama_mapel.localeCompare(b.nama_mapel);
        })
        .map((item, index) => ({
          ...item,
          no: index + 1, // Re-assign nomor urut setelah sorting
        }));

      console.log("📊 Final status data:", filteredHasil);
      setStatusData(filteredHasil);

      console.log("📊 ========== END LOAD STATUS ==========");
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
    if (!academicInfo) return null;

    try {
      console.log(`🔍 Checking status for: ${mapel}`);

      // Query nilai untuk mata pelajaran ini (hanya siswa aktif) + detail TP
      const { data: nilaiData, error: nilaiError } = await supabase
        .from("nilai_eraport")
        .select(
          `
          id,
          student_id, 
          nilai_akhir, 
          deskripsi_capaian,
          nilai_eraport_detail(id, status_tercapai),
          students!inner(is_active)
        `
        )
        .eq("class_id", selectedKelas)
        .eq("mata_pelajaran", mapel)
        .eq("academic_year_id", academicInfo.yearId)
        .eq("semester", academicInfo.semester)
        .eq("students.is_active", true);

      if (nilaiError) {
        console.error(`❌ Error loading nilai for ${mapel}:`, nilaiError);
        return null;
      }

      console.log(`📊 Found ${nilaiData?.length || 0} records for ${mapel}`);

      // Hitung siswa yang sudah ada nilai dan deskripsi
      const siswaDenganNilaiSet = new Set();
      const siswaDenganDeskripsiSet = new Set();

      nilaiData?.forEach((item) => {
        const studentId = item.student_id;

        // Cek apakah semua TP sudah dicentang (ada detail dan ada status_tercapai)
        const detailTP = item.nilai_eraport_detail || [];
        const semuaTPTercentang =
          detailTP.length > 0 &&
          detailTP.every((detail) => detail.status_tercapai !== null);

        // ✅ Cek nilai (SELALU hitung, TIDAK peduli TP)
        if (item.nilai_akhir !== null && item.nilai_akhir !== undefined) {
          const nilai = parseFloat(item.nilai_akhir);
          if (!isNaN(nilai) && nilai > 0) {
            siswaDenganNilaiSet.add(studentId);
          }
        }

        // ✅ Cek deskripsi (HANYA hitung kalau TP udah dicentang semua)
        if (
          semuaTPTercentang &&
          item.deskripsi_capaian &&
          item.deskripsi_capaian.toString().trim() !== "" &&
          item.deskripsi_capaian.toString().trim() !== "null" &&
          item.deskripsi_capaian.toString().trim() !== "-"
        ) {
          siswaDenganDeskripsiSet.add(studentId);
        }
      });

      const jumlahNilai = siswaDenganNilaiSet.size;
      const jumlahDeskripsi = siswaDenganDeskripsiSet.size;

      console.log(
        `📊 ${mapel}: ${jumlahNilai}/${jumlahSiswa} nilai, ${jumlahDeskripsi}/${jumlahSiswa} deskripsi`
      );

      // Cek jika ada duplikat data
      if (nilaiData?.length > jumlahSiswa) {
        console.warn(
          `⚠️  Duplikat ditemukan untuk ${mapel}: ${nilaiData.length} records untuk ${jumlahSiswa} siswa`
        );

        // Hitung duplikat per student
        const studentCount = {};
        nilaiData?.forEach((item) => {
          studentCount[item.student_id] =
            (studentCount[item.student_id] || 0) + 1;
        });

        const duplicates = Object.entries(studentCount).filter(
          ([_, count]) => count > 1
        );
        if (duplicates.length > 0) {
          console.warn(`⚠️  Student dengan data ganda:`, duplicates);
        }
      }

      return {
        no: index + 1,
        nama_mapel: mapel,
        kelas: selectedKelas,
        jumlah_nilai: jumlahNilai,
        jumlah_deskripsi: jumlahDeskripsi,
        total_siswa: jumlahSiswa,
      };
    } catch (error) {
      console.error(`❌ Error in getMapelStatus for ${mapel}:`, error);
      return null;
    }
  };

  const formatStatusNilai = (jumlah, total) => {
    if (total === 0) return "0 Data";
    if (jumlah === 0) return "0 Data";
    if (jumlah === total) return `${jumlah} Data`;
    if (jumlah > total) {
      return `${jumlah} Data ⚠️`;
    }
    return `${jumlah}/${total} Data`;
  };

  const getTextColor = (jumlah, total) => {
    if (jumlah === 0) return "text-red-600 dark:text-red-400";
    if (jumlah === total) return "text-green-700 dark:text-green-400";
    if (jumlah > total) return "text-purple-600 dark:text-purple-400";
    return "text-amber-600 dark:text-amber-400";
  };

  const getStatusIcon = (jumlah, total) => {
    if (jumlah === 0) return "❌";
    if (jumlah === total) return "✅";
    if (jumlah > total) return "⚠️";
    return "🟡";
  };

  // Fungsi untuk membersihkan data duplikat
  const cleanDuplicateData = async () => {
    if (!selectedKelas || !academicInfo) {
      alert("Pilih kelas terlebih dahulu");
      return;
    }

    if (
      !window.confirm(
        "Yakin ingin membersihkan data duplikat? Tindakan ini tidak dapat dibatalkan."
      )
    ) {
      return;
    }

    try {
      // Ambil semua data nilai untuk kelas dan tahun ajaran ini
      const { data: allNilai, error } = await supabase
        .from("nilai_eraport")
        .select("*")
        .eq("class_id", selectedKelas)
        .eq("academic_year_id", academicInfo.yearId)
        .eq("semester", academicInfo.semester)
        .order("student_id", { ascending: true })
        .order("mata_pelajaran", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Identifikasi duplikat (pertahankan yang terbaru)
      const seen = new Set();
      const duplicates = [];

      allNilai?.forEach((item) => {
        const key = `${item.student_id}-${item.mata_pelajaran}`;
        if (seen.has(key)) {
          duplicates.push(item.id);
        } else {
          seen.add(key);
        }
      });

      if (duplicates.length === 0) {
        alert("✅ Tidak ditemukan data duplikat");
        return;
      }

      // Hapus data duplikat
      const { error: deleteError } = await supabase
        .from("nilai_eraport")
        .delete()
        .in("id", duplicates);

      if (deleteError) throw deleteError;

      alert(`✅ Berhasil menghapus ${duplicates.length} data duplikat`);
      loadStatusPenilaian(); // Reload data
    } catch (error) {
      console.error("Error cleaning duplicate data:", error);
      alert(`❌ Error: ${error.message}`);
    }
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
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 gap-4">
            <h1
              className={`text-lg md:text-xl lg:text-2xl font-bold transition-colors ${
                darkMode ? "text-white" : "text-gray-900"
              }`}>
              STATUS PENILAIAN OLEH GURU MAPEL
            </h1>

            <div className="flex gap-2">
              <button
                onClick={() => setShowDebug(!showDebug)}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  darkMode
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}>
                {showDebug ? "Hide Debug" : "Show Debug"}
              </button>

              {statusData.some(
                (item) => item.jumlah_nilai > item.total_siswa
              ) && (
                <button
                  onClick={cleanDuplicateData}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700"
                  title="Bersihkan data duplikat">
                  🧹 Clean Duplicates
                </button>
              )}
            </div>
          </div>

          {/* ✅ INFO AKADEMIK DINAMIS */}
          {academicInfo && (
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
                    Semester Aktif
                  </span>
                  <span
                    className={`font-medium ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}>
                    {academicInfo.semesterText ||
                      (academicInfo.semester === 1
                        ? "Semester 1 (Ganjil)"
                        : "Semester 2 (Genap)")}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span
                    className={`text-xs font-medium mb-1 ${
                      darkMode ? "text-gray-400" : "text-gray-500"
                    }`}>
                    Tahun Ajaran
                  </span>
                  <span
                    className={`font-medium ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}>
                    {academicInfo.displayText || academicInfo.year || "Aktif"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span
                    className={`text-xs font-medium mb-1 ${
                      darkMode ? "text-gray-400" : "text-gray-500"
                    }`}>
                    Status
                  </span>
                  <span
                    className={`font-medium px-2 py-1 rounded-full text-xs inline-block w-20 text-center ${
                      academicInfo.isActive
                        ? darkMode
                          ? "bg-green-900/30 text-green-300"
                          : "bg-green-100 text-green-700"
                        : darkMode
                        ? "bg-red-900/30 text-red-300"
                        : "bg-red-100 text-red-700"
                    }`}>
                    {academicInfo.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
              </div>

              {/* Debug Info */}
              {showDebug && (
                <div className="mt-4 p-3 rounded bg-gray-800/30 dark:bg-gray-900/30">
                  <div className="text-xs font-mono">
                    <div>Year ID: {academicInfo.yearId}</div>
                    <div>Semester: {academicInfo.semester}</div>
                    <div>Start: {academicInfo.startDate}</div>
                    <div>End: {academicInfo.endDate}</div>
                  </div>
                </div>
              )}
            </div>
          )}

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
                      Kelas {kelas.grade}
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
                    {academicInfo
                      ? `Guru mapel belum mengisi nilai untuk kelas ini di semester ${academicInfo.semester}`
                      : "Guru mapel belum mengisi nilai untuk kelas ini"}
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
                          colSpan="3">
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
                            <div
                              className={`flex-1 py-2 border-r ${
                                darkMode ? "border-blue-800" : "border-blue-600"
                              }`}>
                              Deskripsi
                            </div>
                            <div className="flex-1 py-2">Lengkap</div>
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
                            {showDebug && (
                              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                ID: {item.jumlah_nilai}/{item.total_siswa}
                              </div>
                            )}
                          </td>
                          <td
                            className={`p-3 sm:p-4 text-center text-sm sm:text-base border-r ${
                              darkMode
                                ? "border-gray-700 text-gray-300"
                                : "border-blue-100 text-gray-700"
                            }`}>
                            {item.kelas}
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
                          <td
                            className={`p-3 sm:p-4 text-center text-sm sm:text-base ${
                              darkMode ? "bg-gray-700/50" : "bg-gray-100"
                            }`}>
                            {item.jumlah_nilai === item.total_siswa &&
                            item.jumlah_deskripsi === item.total_siswa ? (
                              <span className="text-2xl">✅</span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-600">
                                -
                              </span>
                            )}
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
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-3">
                <h3
                  className={`font-semibold transition-colors ${
                    darkMode ? "text-white" : "text-gray-700"
                  }`}>
                  Keterangan Status:
                </h3>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Total Mapel: {statusData.length} | Siswa: {totalSiswa}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-green-700 dark:bg-green-500 rounded"></span>
                  <span
                    className={darkMode ? "text-gray-300" : "text-gray-600"}>
                    ✅ Lengkap (semua siswa sudah dinilai)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-amber-600 dark:bg-amber-500 rounded"></span>
                  <span
                    className={darkMode ? "text-gray-300" : "text-gray-600"}>
                    🟡 Sebagian (belum semua siswa dinilai)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-red-600 dark:bg-red-500 rounded"></span>
                  <span
                    className={darkMode ? "text-gray-300" : "text-gray-600"}>
                    ❌ Kosong (belum ada yang dinilai)
                  </span>
                </div>
                {statusData.some(
                  (item) => item.jumlah_nilai > item.total_siswa
                ) && (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 bg-purple-600 dark:bg-purple-500 rounded"></span>
                    <span
                      className={darkMode ? "text-gray-300" : "text-gray-600"}>
                      ⚠️ Duplikat (data lebih dari jumlah siswa)
                    </span>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-700">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="text-center">
                    <div className="font-bold text-green-700 dark:text-green-400">
                      {
                        statusData.filter(
                          (item) => item.jumlah_nilai === item.total_siswa
                        ).length
                      }
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Lengkap
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-amber-600 dark:text-amber-400">
                      {
                        statusData.filter(
                          (item) =>
                            item.jumlah_nilai > 0 &&
                            item.jumlah_nilai < item.total_siswa
                        ).length
                      }
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Sebagian
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-red-600 dark:text-red-400">
                      {
                        statusData.filter((item) => item.jumlah_nilai === 0)
                          .length
                      }
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Kosong
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-purple-600 dark:text-purple-400">
                      {
                        statusData.filter(
                          (item) => item.jumlah_nilai > item.total_siswa
                        ).length
                      }
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Duplikat
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <span className="text-sm">{errorMessage}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CekNilai;
