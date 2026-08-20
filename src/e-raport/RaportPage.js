import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import PreviewNilai from "./PreviewNilai";
import PreviewRaport from "./PreviewRaport";
import CetakRaport from "./CetakRaport";

// TAMBAH PROPS di sini
function RaportPage({ user, onShowToast, darkMode }) {
  const [activeTab, setActiveTab] = useState("nilai"); // 'nilai', 'preview', atau 'cetak'
  const [classId, setClassId] = useState("");
  const [semester, setSemester] = useState("");
  const [academicYear, setAcademicYear] = useState(null);
  const [isWaliKelas, setIsWaliKelas] = useState(false);
  const [waliKelasName, setWaliKelasName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    loadUserAndAssignments();
    loadActiveAcademicYear();
  }, []);

  const loadUserAndAssignments = async () => {
    try {
      setInitialLoading(true);
      setErrorMessage("");

      // GANTI: Gunakan user dari props, bukan localStorage
      if (!user || !user.id) {
        throw new Error("Session tidak ditemukan. Silakan login ulang.");
      }

      const userId = user.id;

      // Ambil data lengkap user dari database
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("homeroom_class_id, full_name, username")
        .eq("id", userId)
        .single();

      if (userError || !userData) {
        throw new Error("Data pengguna tidak ditemukan.");
      }

      const homeroomClassId = userData.homeroom_class_id;

      if (!homeroomClassId) {
        throw new Error(
          "Anda bukan wali kelas. Fitur ini hanya untuk wali kelas."
        );
      }

      // Validasi kelas
      const { data: classData, error: classError } = await supabase
        .from("classes")
        .select("id, grade, is_active")
        .eq("id", homeroomClassId)
        .eq("is_active", true)
        .single();

      if (classError || !classData) {
        throw new Error(
          `Kelas ${homeroomClassId} tidak ditemukan atau tidak aktif.`
        );
      }

      // Set state
      setIsWaliKelas(true);
      setWaliKelasName(userData.full_name || userData.username || "Wali Kelas");
      setClassId(homeroomClassId);
      setInitialLoading(false);

      // Tampilkan toast sukses
      if (onShowToast) {
        onShowToast("Data wali kelas berhasil dimuat", "success");
      }
    } catch (error) {
      console.error("Error:", error.message);
      setIsWaliKelas(false);
      setErrorMessage(error.message || "Terjadi kesalahan saat memuat data.");
      setInitialLoading(false);

      // Tampilkan toast error
      if (onShowToast) {
        onShowToast(error.message, "error");
      }
    }
  };

  const loadActiveAcademicYear = async () => {
    try {
      const { data } = await supabase
        .from("academic_years")
        .select("*")
        .eq("is_active", true)
        .single();
      setAcademicYear(data);
    } catch (error) {
      console.error("Gagal memuat tahun ajaran:", error);
    }
  };

  // RENDER LOADING - Tambahkan dark mode
  if (initialLoading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center p-4 ${
          darkMode ? "bg-gray-900" : "bg-gray-50"
        }`}>
        <div className="text-center">
          <div
            className={`animate-spin rounded-full h-12 w-12 border-b-4 mx-auto mb-3 ${
              darkMode ? "border-blue-400" : "border-blue-600"
            }`}></div>
          <p className={`${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            Memuat data wali kelas...
          </p>
        </div>
      </div>
    );
  }

  // RENDER ERROR - Tambahkan dark mode
  if (errorMessage) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center p-4 ${
          darkMode ? "bg-gray-900" : "bg-gray-50"
        }`}>
        <div className="text-center max-w-md">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              darkMode ? "bg-red-900/30" : "bg-red-100"
            }`}>
            <svg
              className={`w-8 h-8 ${
                darkMode ? "text-red-400" : "text-red-600"
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
            className={`text-xl font-bold mb-2 ${
              darkMode ? "text-white" : "text-gray-900"
            }`}>
            Akses Dibatasi
          </h3>
          <p className={`mb-6 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            {errorMessage}
          </p>
        </div>
      </div>
    );
  }

  // RENDER JIKA BUKAN WALI KELAS - Tambahkan dark mode
  if (!isWaliKelas) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center p-4 ${
          darkMode ? "bg-gray-900" : "bg-gray-50"
        }`}>
        <div className="text-center max-w-md">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              darkMode ? "bg-blue-900/30" : "bg-blue-100"
            }`}>
            <svg
              className={`w-8 h-8 ${
                darkMode ? "text-blue-400" : "text-blue-600"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h3
            className={`text-xl font-bold mb-2 ${
              darkMode ? "text-white" : "text-gray-900"
            }`}>
            Akses Terbatas
          </h3>
          <p className={`${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            Hanya wali kelas yang dapat mengakses fitur ini.
          </p>
        </div>
      </div>
    );
  }

  // RENDER MAIN CONTENT dengan dark mode
  return (
    <div
      className={`p-4 md:p-6 lg:p-8 min-h-screen ${
        darkMode ? "bg-gray-900" : "bg-gray-50"
      }`}>
      <div
        className={`rounded-lg shadow-lg ${
          darkMode ? "bg-gray-800" : "bg-white"
        }`}>
        {/* INFO WALI KELAS */}
        <div
          className={`p-4 md:p-6 border-b ${
            darkMode ? "border-gray-700" : "border-gray-200"
          }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h3
                className={`font-bold text-lg ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}>
                Anda adalah wali kelas
              </h3>
              <p
                className={`mt-1 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}>
                {waliKelasName} - Kelas {classId}
              </p>
            </div>
            <div
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                darkMode
                  ? "bg-blue-700 text-blue-100"
                  : "bg-blue-600 text-white"
              }`}>
              Wali Kelas
            </div>
          </div>
        </div>

        {/* TAB NAVIGATION - 3 TABS */}
        <div
          className={`border-b ${
            darkMode ? "border-gray-700" : "border-gray-200"
          }`}>
          <div className="flex overflow-x-auto">
            {/* TAB 1: PREVIEW NILAI */}
            <button
              onClick={() => setActiveTab("nilai")}
              className={`flex-1 min-w-[120px] px-4 py-4 text-center font-semibold transition-all duration-200 ${
                activeTab === "nilai"
                  ? `${
                      darkMode
                        ? "text-green-400 border-green-400 bg-green-900/20"
                        : "text-green-600 border-green-600 bg-green-50"
                    } border-b-4`
                  : `${
                      darkMode
                        ? "text-gray-400 hover:text-gray-200 hover:bg-gray-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`
              }`}>
              <span className="text-xs md:text-base">📊 Preview Nilai</span>
            </button>

            {/* TAB 2: PREVIEW RAPORT */}
            <button
              onClick={() => setActiveTab("preview")}
              className={`flex-1 min-w-[120px] px-4 py-4 text-center font-semibold transition-all duration-200 ${
                activeTab === "preview"
                  ? `${
                      darkMode
                        ? "text-blue-400 border-blue-400 bg-blue-900/20"
                        : "text-blue-600 border-blue-600 bg-blue-50"
                    } border-b-4`
                  : `${
                      darkMode
                        ? "text-gray-400 hover:text-gray-200 hover:bg-gray-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`
              }`}>
              <span className="text-xs md:text-base">📋 Preview Raport</span>
            </button>

            {/* TAB 3: CETAK RAPORT */}
            <button
              onClick={() => setActiveTab("cetak")}
              className={`flex-1 min-w-[120px] px-4 py-4 text-center font-semibold transition-all duration-200 ${
                activeTab === "cetak"
                  ? `${
                      darkMode
                        ? "text-red-400 border-red-400 bg-red-900/20"
                        : "text-red-600 border-red-600 bg-red-50"
                    } border-b-4`
                  : `${
                      darkMode
                        ? "text-gray-400 hover:text-gray-200 hover:bg-gray-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`
              }`}>
              <span className="text-xs md:text-base">🖨️ Cetak Raport</span>
            </button>
          </div>
        </div>

        {/* TAB CONTENT */}
        <div className="p-4 md:p-6">
          {activeTab === "nilai" && (
            <PreviewNilai
              classId={classId}
              semester={semester}
              setSemester={setSemester}
              academicYear={academicYear}
              darkMode={darkMode}
            />
          )}

          {activeTab === "preview" && (
            <PreviewRaport
              classId={classId}
              semester={semester}
              setSemester={setSemester}
              academicYear={academicYear}
              darkMode={darkMode}
            />
          )}

          {activeTab === "cetak" && (
            <CetakRaport
              classId={classId}
              darkMode={darkMode}
              onShowToast={onShowToast}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default RaportPage;
