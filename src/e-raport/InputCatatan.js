import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Save } from "lucide-react";

function InputCatatan({ user, onShowToast, darkMode }) {
  const [kelas, setKelas] = useState("");
  const [semester, setSemester] = useState("");
  const [siswaList, setSiswaList] = useState([]);
  const [academicYear, setAcademicYear] = useState(null);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0 });
  const [isWaliKelas, setIsWaliKelas] = useState(false);
  const [waliKelasName, setWaliKelasName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Load data awal
  useEffect(() => {
    loadUserAndAssignments();
  }, []);

  // Load data saat filter berubah
  useEffect(() => {
    if (kelas && semester && academicYear) {
      loadData();
    }
  }, [kelas, semester, academicYear]);

  const loadUserAndAssignments = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      if (!user) {
        throw new Error("Session tidak valid. Silakan login ulang.");
      }

      // CEK APAKAH USER ADALAH WALI KELAS
      const homeroomClassId = user.homeroom_class_id;

      if (!homeroomClassId) {
        // BUKAN WALI KELAS
        setIsWaliKelas(false);
        setErrorMessage(
          "Anda bukan wali kelas. Fitur Input Catatan hanya untuk wali kelas."
        );
        setLoading(false);

        if (onShowToast) {
          onShowToast("Anda tidak ditugaskan sebagai wali kelas", "warning");
        }
        return;
      }

      // AMBIL ACADEMIC YEAR AKTIF
      const { data: academicYearData, error: ayError } = await supabase
        .from("academic_years")
        .select("*")
        .eq("is_active", true)
        .single();

      if (ayError || !academicYearData) {
        throw new Error("Tahun ajaran aktif tidak ditemukan.");
      }

      setAcademicYear(academicYearData);

      // AMBIL DATA KELAS WALI
      const { data: classData, error: classError } = await supabase
        .from("classes")
        .select("id, grade, academic_year_id, is_active")
        .eq("id", homeroomClassId)
        .eq("is_active", true)
        .single();

      if (classError || !classData) {
        console.error("❌ Kelas wali tidak ditemukan:", classError);
        setIsWaliKelas(false);
        setErrorMessage(
          `Kelas wali ${homeroomClassId} tidak ditemukan atau sudah tidak aktif.`
        );
        setLoading(false);
        return;
      }

      // SET DATA KELAS (hanya satu kelas - kelas wali)
      setAvailableClasses([
        {
          id: classData.id, // "7F"
          grade: classData.id, // "7F" untuk display
        },
      ]);

      // SET STATUS WALI KELAS
      setIsWaliKelas(true);
      setWaliKelasName(user.full_name || user.username);

      setLoading(false);

      if (onShowToast) {
        onShowToast(`Anda adalah wali kelas ${classData.id}`, "success");
      }
    } catch (error) {
      console.error("❌ Error in loadUserAndAssignments:", error);
      setIsWaliKelas(false);
      setErrorMessage(error.message || "Terjadi kesalahan saat memuat data.");
      setLoading(false);

      if (onShowToast) {
        onShowToast(`Error: ${error.message}`, "error");
      }
    }
  };

  const loadData = async () => {
    if (!kelas || !semester || !academicYear) return;

    setLoading(true);
    try {
      // CARI KELAS BERDASARKAN ID (bukan grade)
      const selectedClass = availableClasses.find((c) => c.id === kelas);
      if (!selectedClass) {
        if (onShowToast) onShowToast("Kelas tidak ditemukan!", "error");
        return;
      }

      // LOAD SISWA
      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("id, nis, full_name")
        .eq("class_id", selectedClass.id)
        .eq("is_active", true)
        .order("full_name");

      if (studentsError) {
        throw new Error(`Gagal load siswa: ${studentsError.message}`);
      }

      // LOAD EXISTING CATATAN
      const { data: existingCatatan, error: catatanError } = await supabase
        .from("catatan_eraport")
        .select("*")
        .eq("class_id", selectedClass.id)
        .eq("tahun_ajaran_id", academicYear.id)
        .eq("semester", semester);

      if (catatanError) {
        console.error("❌ Error loading catatan:", catatanError);
      }

      // MERGE DATA
      const merged = (students || []).map((siswa) => {
        const catatan = existingCatatan?.find((c) => c.student_id === siswa.id);

        return {
          id: siswa.id,
          nis: siswa.nis,
          full_name: siswa.full_name,
          catatan_id: catatan?.id,
          catatan_wali_kelas: catatan?.catatan_wali_kelas || "",
        };
      });

      setSiswaList(merged);
    } catch (error) {
      console.error("❌ Error loading data:", error);
      if (onShowToast)
        onShowToast(`Gagal memuat data: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCatatanChange = (studentId, value) => {
    const updated = siswaList.map((siswa) => {
      if (siswa.id === studentId) {
        return { ...siswa, catatan_wali_kelas: value };
      }
      return siswa;
    });
    setSiswaList(updated);
  };

  const handleSave = async () => {
    if (!kelas || !semester) {
      if (onShowToast)
        onShowToast("Pilih Kelas dan Semester terlebih dahulu!", "warning");
      return;
    }

    if (siswaList.length === 0) {
      if (onShowToast)
        onShowToast("Tidak ada data siswa untuk disimpan!", "warning");
      return;
    }

    if (!window.confirm(`Simpan catatan untuk ${siswaList.length} siswa?`))
      return;

    setSaving(true);
    setSaveProgress({ current: 0, total: siswaList.length });

    try {
      const selectedClass = availableClasses.find((c) => c.id === kelas);
      if (!selectedClass) throw new Error("Kelas tidak ditemukan!");

      const userId = user.id;

      for (let i = 0; i < siswaList.length; i++) {
        const siswa = siswaList[i];
        const catatanId = siswa.catatan_id;

        const catatanData = {
          student_id: siswa.id,
          class_id: selectedClass.id,
          tahun_ajaran_id: academicYear.id,
          semester: semester,
          catatan_wali_kelas: siswa.catatan_wali_kelas || "",
          created_by: userId,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        };

        if (catatanId) {
          const { error: updateError } = await supabase
            .from("catatan_eraport")
            .update(catatanData)
            .eq("id", catatanId);

          if (updateError) {
            console.error("❌ Update error:", updateError);
            throw new Error(
              `Gagal update catatan siswa ${siswa.full_name}: ${updateError.message}`
            );
          }
        } else {
          const { error: insertError } = await supabase
            .from("catatan_eraport")
            .insert(catatanData);

          if (insertError) {
            console.error("❌ Insert error:", insertError);
            throw new Error(
              `Gagal insert catatan siswa ${siswa.full_name}: ${insertError.message}`
            );
          }
        }

        setSaveProgress({ current: i + 1, total: siswaList.length });
      }

      if (onShowToast) onShowToast("Catatan berhasil disimpan!", "success");
      await loadData();
    } catch (error) {
      console.error("Error saving data:", error);
      if (onShowToast)
        onShowToast(`Gagal menyimpan: ${error.message}`, "error");
    } finally {
      setSaving(false);
      setSaveProgress({ current: 0, total: 0 });
    }
  };

  if (loading && !kelas) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-3 text-gray-600">Memuat data mengajar...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen py-4 sm:py-8 px-4 ${
        darkMode ? "bg-gray-900" : "bg-gray-50"
      }`}>
      <div className="max-w-7xl mx-auto">
        <div
          className={`rounded-xl shadow-lg p-4 sm:p-6 ${
            darkMode ? "bg-gray-800" : "bg-white"
          }`}>
          <h2
            className={`text-xl font-bold mb-6 ${
              darkMode ? "text-white" : "text-gray-900"
            }`}>
            Input Catatan
          </h2>

          {/* Tampilkan error jika bukan wali kelas */}
          {errorMessage ? (
            <div className="text-center py-12">
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
                className={`text-lg font-bold mb-2 ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}>
                Akses Dibatasi
              </h3>
              <p
                className={`mb-6 ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}>
                {errorMessage}
              </p>
            </div>
          ) : !isWaliKelas ? (
            <div className="text-center py-8 text-gray-500">
              Memuat data wali kelas...
            </div>
          ) : (
            <>
              {/* Info Wali Kelas */}
              {isWaliKelas && (
                <div
                  className={`mb-6 p-4 rounded-lg border ${
                    darkMode
                      ? "bg-green-900/20 border-green-500"
                      : "bg-green-50 border-green-200"
                  }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3
                        className={`font-bold ${
                          darkMode ? "text-white" : "text-gray-900"
                        }`}>
                        Anda adalah wali kelas
                      </h3>
                      <p
                        className={`text-sm ${
                          darkMode ? "text-gray-300" : "text-gray-600"
                        } mt-1`}>
                        {waliKelasName}
                      </p>
                    </div>
                    <div
                      className={`px-4 py-2 rounded-full ${
                        darkMode
                          ? "bg-green-800 text-green-100"
                          : "bg-green-600 text-white"
                      }`}>
                      <span className="text-sm font-medium">Wali Kelas</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Filter Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}>
                    Pilih Kelas
                  </label>
                  <select
                    value={kelas}
                    onChange={(e) => setKelas(e.target.value)}
                    className={`w-full p-3 rounded-lg border ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}>
                    {/* OPTION DEFAULT - WAJIB DIPILIH */}
                    <option value="" disabled>
                      -- Pilih Kelas --
                    </option>

                    {/* SATU-SATUNYA KELAS WALI */}
                    {availableClasses.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        Kelas {cls.grade}
                      </option>
                    ))}
                  </select>
                  {availableClasses.length === 1 && !kelas && (
                    <p className="text-xs text-yellow-600 mt-1">
                      Pilih kelas di atas untuk melanjutkan
                    </p>
                  )}
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}>
                    Pilih Semester
                  </label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className={`w-full p-3 rounded-lg border ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}>
                    <option value="" disabled>
                      -- Pilih Semester --
                    </option>
                    <option value="1">Semester Ganjil</option>
                    <option value="2">Semester Genap</option>
                  </select>
                </div>
              </div>

              {kelas && semester && (
                <>
                  {/* Action Buttons */}
                  <div className="flex justify-end mb-6">
                    <button
                      onClick={handleSave}
                      disabled={saving || siswaList.length === 0}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                      <Save size={18} />
                      Simpan Semua Catatan
                    </button>
                  </div>

                  {loading ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                      <p className="mt-2 text-gray-600">Memuat data siswa...</p>
                    </div>
                  ) : siswaList.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full border-collapse">
                        <thead className="bg-red-800 text-white">
                          <tr>
                            <th className="p-3 text-center border-r border-red-700 w-16">
                              No
                            </th>
                            <th className="p-3 text-left border-r border-red-700 w-32">
                              NIS
                            </th>
                            <th className="p-3 text-left border-r border-red-700 w-64">
                              Nama Siswa
                            </th>
                            <th className="p-3 text-left">
                              Catatan Wali Kelas
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {siswaList.map((siswa, idx) => (
                            <tr
                              key={siswa.id}
                              className={`border-b ${
                                darkMode
                                  ? "border-gray-700 hover:bg-gray-800"
                                  : "border-gray-200 hover:bg-gray-50"
                              }`}>
                              <td className="p-3 text-center border-r">
                                {idx + 1}
                              </td>
                              <td className="p-3 border-r">{siswa.nis}</td>
                              <td className="p-3 border-r font-medium">
                                {siswa.full_name}
                              </td>
                              <td className="p-3">
                                <textarea
                                  value={siswa.catatan_wali_kelas || ""}
                                  onChange={(e) =>
                                    handleCatatanChange(
                                      siswa.id,
                                      e.target.value
                                    )
                                  }
                                  className={`w-full p-3 border rounded text-sm ${
                                    darkMode
                                      ? "bg-gray-700 border-gray-600 text-white"
                                      : "bg-white border-gray-300 text-gray-900"
                                  }`}
                                  rows="4"
                                  placeholder="Masukkan catatan untuk siswa ini..."
                                />
                                <div className="text-xs text-gray-500 mt-1">
                                  {siswa.catatan_wali_kelas?.length || 0}{" "}
                                  karakter
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Tidak ada data siswa untuk kelas ini
                    </div>
                  )}
                </>
              )}

              {(!kelas || !semester) && isWaliKelas && (
                <div className="text-center py-8 text-gray-500">
                  Silakan pilih Kelas dan Semester
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Save Progress Overlay */}
      {saving && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className={`rounded-xl p-6 ${
              darkMode ? "bg-gray-800" : "bg-white"
            }`}>
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-bold mb-2">Menyimpan Catatan...</h3>
              <p className="text-sm text-gray-600 mb-4">
                {saveProgress.current} dari {saveProgress.total} siswa
              </p>
              <div className="w-64 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      (saveProgress.current / saveProgress.total) * 100
                    }%`,
                  }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InputCatatan;
