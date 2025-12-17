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

  useEffect(() => {
    loadUserAndAssignments();
  }, []);

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

      const homeroomClassId = user.homeroom_class_id;

      if (!homeroomClassId) {
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

      const { data: academicYearData, error: ayError } = await supabase
        .from("academic_years")
        .select("*")
        .eq("is_active", true)
        .single();

      if (ayError || !academicYearData) {
        throw new Error("Tahun ajaran aktif tidak ditemukan.");
      }

      setAcademicYear(academicYearData);

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

      setAvailableClasses([
        {
          id: classData.id,
          grade: classData.id,
        },
      ]);

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
      const selectedClass = availableClasses.find((c) => c.id === kelas);
      if (!selectedClass) {
        if (onShowToast) onShowToast("Kelas tidak ditemukan!", "error");
        return;
      }

      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("id, nis, full_name")
        .eq("class_id", selectedClass.id)
        .eq("is_active", true)
        .order("full_name");

      if (studentsError) {
        throw new Error(`Gagal load siswa: ${studentsError.message}`);
      }

      const { data: existingCatatan, error: catatanError } = await supabase
        .from("catatan_eraport")
        .select("*")
        .eq("class_id", selectedClass.id)
        .eq("tahun_ajaran_id", academicYear.id)
        .eq("semester", semester);

      if (catatanError) {
        console.error("❌ Error loading catatan:", catatanError);
      }

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
            Memuat data wali kelas...
          </p>
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
          <h2
            className={`text-lg md:text-xl lg:text-2xl font-bold mb-6 md:mb-8 transition-colors ${
              darkMode ? "text-white" : "text-gray-900"
            }`}>
            Input Catatan Wali Kelas
          </h2>

          {errorMessage ? (
            <div className="text-center py-12 rounded-xl border-2 border-dashed">
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
          ) : !isWaliKelas ? (
            <div
              className={`text-center py-8 rounded-xl border-2 border-dashed ${
                darkMode
                  ? "text-gray-400 border-gray-700 bg-gray-800/50"
                  : "text-gray-500 border-blue-300 bg-blue-50"
              }`}>
              <p className="text-base sm:text-lg">Memuat data wali kelas...</p>
            </div>
          ) : (
            <>
              {/* Info Wali Kelas */}
              {isWaliKelas && (
                <div
                  className={`mb-6 md:mb-8 p-4 md:p-6 rounded-xl border ${
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
                        Anda adalah wali kelas
                      </h3>
                      <p
                        className={`text-sm sm:text-base mt-1 transition-colors ${
                          darkMode ? "text-gray-300" : "text-gray-700"
                        }`}>
                        {waliKelasName}
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
              )}

              {/* Filter Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 md:mb-8">
                <div>
                  <label
                    className={`block text-sm sm:text-base font-medium mb-1.5 sm:mb-2 transition-colors ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}>
                    Pilih Kelas
                  </label>
                  <select
                    value={kelas}
                    onChange={(e) => setKelas(e.target.value)}
                    className={`w-full p-2.5 sm:p-3 border rounded-lg focus:ring-2 focus:outline-none transition-all text-sm sm:text-base min-h-[44px] ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-white focus:ring-blue-400 focus:border-blue-400"
                        : "bg-white border-blue-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                    }`}>
                    <option value="" disabled className="text-gray-400">
                      -- Pilih Kelas --
                    </option>
                    {availableClasses.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        Kelas {cls.grade}
                      </option>
                    ))}
                  </select>
                  {availableClasses.length === 1 && !kelas && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Pilih kelas di atas untuk melanjutkan
                    </p>
                  )}
                </div>

                <div>
                  <label
                    className={`block text-sm sm:text-base font-medium mb-1.5 sm:mb-2 transition-colors ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}>
                    Pilih Semester
                  </label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className={`w-full p-2.5 sm:p-3 border rounded-lg focus:ring-2 focus:outline-none transition-all text-sm sm:text-base min-h-[44px] ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-white focus:ring-blue-400 focus:border-blue-400"
                        : "bg-white border-blue-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                    }`}>
                    <option value="" disabled className="text-gray-400">
                      -- Pilih Semester --
                    </option>
                    <option value="1">Semester Ganjil</option>
                    <option value="2">Semester Genap</option>
                  </select>
                </div>
              </div>

              {kelas && semester && (
                <>
                  {/* Action Button */}
                  <div className="flex justify-end mb-6 md:mb-8">
                    <button
                      onClick={handleSave}
                      disabled={saving || siswaList.length === 0}
                      className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-lg transition-all duration-200 min-h-[44px] ${
                        darkMode
                          ? "bg-blue-600 hover:bg-blue-500 text-white disabled:bg-blue-800 disabled:cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-400 disabled:cursor-not-allowed"
                      }`}>
                      <Save size={18} />
                      <span className="text-sm sm:text-base">
                        {saving ? "Menyimpan..." : "Simpan Semua Catatan"}
                      </span>
                    </button>
                  </div>

                  {loading ? (
                    <div className="text-center py-12">
                      <div
                        className={`inline-block animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-4 mb-3 sm:mb-4 ${
                          darkMode ? "border-blue-400" : "border-blue-600"
                        }`}></div>
                      <p
                        className={`text-sm sm:text-base transition-colors ${
                          darkMode ? "text-gray-300" : "text-gray-600"
                        }`}>
                        Memuat data siswa...
                      </p>
                    </div>
                  ) : siswaList.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                      <table className="w-full min-w-[768px]">
                        <thead
                          className={darkMode ? "bg-blue-900" : "bg-blue-700"}>
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
                              } w-32`}>
                              NIS
                            </th>
                            <th
                              className={`p-3 sm:p-4 text-left text-white text-sm sm:text-base font-medium border-r ${
                                darkMode ? "border-blue-800" : "border-blue-600"
                              } w-64`}>
                              Nama Siswa
                            </th>
                            <th
                              className={`p-3 sm:p-4 text-left text-white text-sm sm:text-base font-medium ${
                                darkMode ? "border-blue-800" : "border-blue-600"
                              }`}>
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
                                  ? "border-gray-700 hover:bg-gray-700/50"
                                  : "border-gray-200 hover:bg-gray-50"
                              }`}>
                              <td
                                className={`p-3 sm:p-4 text-center text-sm sm:text-base border-r ${
                                  darkMode
                                    ? "border-gray-700 text-gray-300"
                                    : "border-gray-200 text-gray-700"
                                }`}>
                                {idx + 1}
                              </td>
                              <td
                                className={`p-3 sm:p-4 text-sm sm:text-base border-r ${
                                  darkMode
                                    ? "border-gray-700 text-gray-300"
                                    : "border-gray-200 text-gray-700"
                                }`}>
                                {siswa.nis}
                              </td>
                              <td
                                className={`p-3 sm:p-4 text-sm sm:text-base font-medium border-r ${
                                  darkMode
                                    ? "border-gray-700 text-gray-200"
                                    : "border-gray-200 text-gray-900"
                                }`}>
                                {siswa.full_name}
                              </td>
                              <td className="p-3 sm:p-4">
                                <textarea
                                  value={siswa.catatan_wali_kelas || ""}
                                  onChange={(e) =>
                                    handleCatatanChange(
                                      siswa.id,
                                      e.target.value
                                    )
                                  }
                                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:outline-none transition-all text-sm sm:text-base min-h-[120px] ${
                                    darkMode
                                      ? "bg-gray-700 border-gray-600 text-white focus:ring-blue-400 focus:border-blue-400"
                                      : "bg-white border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                                  }`}
                                  placeholder="Masukkan catatan untuk siswa ini..."
                                />
                                <div
                                  className={`text-xs mt-1 ${
                                    darkMode ? "text-gray-400" : "text-gray-500"
                                  }`}>
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
                            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                          />
                        </svg>
                      </div>
                      <p className="text-base sm:text-lg font-medium mb-1">
                        Tidak ada data siswa
                      </p>
                      <p className="text-sm">
                        Tidak ada siswa terdaftar di kelas ini
                      </p>
                    </div>
                  )}
                </>
              )}

              {(!kelas || !semester) && isWaliKelas && (
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
                    Pilih Kelas dan Semester
                  </p>
                  <p className="text-sm">
                    Untuk mulai input catatan wali kelas
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Save Progress Overlay */}
      {saving && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className={`rounded-xl p-6 sm:p-8 w-full max-w-md border transition-colors ${
              darkMode
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-blue-200"
            }`}>
            <div className="text-center">
              <div
                className={`animate-spin rounded-full h-12 w-12 sm:h-14 sm:w-14 border-b-4 mx-auto mb-4 ${
                  darkMode ? "border-blue-400" : "border-blue-600"
                }`}></div>
              <h3
                className={`text-lg sm:text-xl font-bold mb-2 transition-colors ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}>
                Menyimpan Catatan...
              </h3>
              <p
                className={`text-sm sm:text-base mb-4 transition-colors ${
                  darkMode ? "text-gray-300" : "text-gray-600"
                }`}>
                {saveProgress.current} dari {saveProgress.total} siswa
              </p>
              <div
                className={`w-full rounded-full h-2.5 mb-2 ${
                  darkMode ? "bg-gray-700" : "bg-blue-100"
                }`}>
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      (saveProgress.current / saveProgress.total) * 100
                    }%`,
                  }}></div>
              </div>
              <div
                className={`text-xs transition-colors ${
                  darkMode ? "text-gray-400" : "text-gray-500"
                }`}>
                Jangan tutup halaman ini...
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InputCatatan;
