import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import PreviewRaport from "./PreviewRaport";
import CetakRaport from "./CetakRaport";

function RaportPage() {
  const [activeTab, setActiveTab] = useState("preview"); // 'preview' atau 'cetak'
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

      const sessionData = localStorage.getItem("userSession");

      if (!sessionData) {
        throw new Error("Session tidak ditemukan. Silakan login ulang.");
      }

      const userData = JSON.parse(sessionData);
      const homeroomClassId = userData.homeroom_class_id;

      if (!homeroomClassId) {
        throw new Error(
          "Tidak ditemukan data wali kelas. Pastikan Anda login sebagai wali kelas."
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
    } catch (error) {
      console.error("Error:", error.message);
      setIsWaliKelas(false);
      setErrorMessage(error.message || "Terjadi kesalahan saat memuat data.");
      setInitialLoading(false);
    }
  };

  const loadActiveAcademicYear = async () => {
    const { data } = await supabase
      .from("academic_years")
      .select("*")
      .eq("is_active", true)
      .single();
    setAcademicYear(data);
  };

  // RENDER LOADING
  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-700 dark:text-gray-300">
            Memuat data wali kelas...
          </p>
        </div>
      </div>
    );
  }

  // RENDER ERROR
  if (errorMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600 dark:text-red-400"
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
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Akses Dibatasi
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {errorMessage}
          </p>
        </div>
      </div>
    );
  }

  // RENDER JIKA BUKAN WALI KELAS
  if (!isWaliKelas) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-blue-600 dark:text-blue-400"
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
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Akses Terbatas
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Hanya wali kelas yang dapat mengakses fitur ini.
          </p>
        </div>
      </div>
    );
  }

  // RENDER MAIN CONTENT
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg">
        {/* INFO WALI KELAS */}
        <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                Anda adalah wali kelas
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mt-1">
                {waliKelasName} - Kelas {classId}
              </p>
            </div>
            <div className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium whitespace-nowrap">
              Wali Kelas
            </div>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex">
            <button
              onClick={() => setActiveTab("preview")}
              className={`flex-1 px-4 py-4 text-center font-semibold transition-all duration-200 ${
                activeTab === "preview"
                  ? "text-blue-600 dark:text-blue-400 border-b-4 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}>
              <span className="text-sm md:text-base">📋 Preview Raport</span>
            </button>
            <button
              onClick={() => setActiveTab("cetak")}
              className={`flex-1 px-4 py-4 text-center font-semibold transition-all duration-200 ${
                activeTab === "cetak"
                  ? "text-red-600 dark:text-red-400 border-b-4 border-red-600 dark:border-red-400 bg-red-50 dark:bg-red-900/20"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}>
              <span className="text-sm md:text-base">🖨️ Cetak Raport</span>
            </button>
          </div>
        </div>

        {/* TAB CONTENT */}
        <div className="p-4 md:p-6">
          {activeTab === "preview" && (
            <PreviewRaport
              classId={classId}
              semester={semester}
              setSemester={setSemester}
              academicYear={academicYear}
            />
          )}

          {activeTab === "cetak" && <CetakRaport />}
        </div>
      </div>
    </div>
  );
}

export default RaportPage;
