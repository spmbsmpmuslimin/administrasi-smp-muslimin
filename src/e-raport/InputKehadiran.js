import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Save, Download, Upload } from "lucide-react";

function InputKehadiran({ user, onShowToast, darkMode }) {
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
          "Anda bukan wali kelas. Fitur Input Kehadiran hanya untuk wali kelas."
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
        console.error("Kelas wali tidak ditemukan:", classError);
        setIsWaliKelas(false);
        setErrorMessage(
          `Kelas wali ${homeroomClassId} tidak ditemukan atau sudah tidak aktif.`
        );
        setLoading(false);
        return;
      }

      const kelasData = {
        id: classData.id,
        grade: classData.id,
      };

      setAvailableClasses([kelasData]);
      setIsWaliKelas(true);
      setWaliKelasName(user.full_name || user.username);
      setLoading(false);

      if (onShowToast) {
        onShowToast(`Anda adalah wali kelas ${classData.id}`, "success");
      }
    } catch (error) {
      console.error("Error in loadUserAndAssignments:", error);
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

      const { data: existingKehadiran, error: kehadiranError } = await supabase
        .from("kehadiran_siswa")
        .select("*")
        .eq("class_id", selectedClass.id)
        .eq("tahun_ajaran_id", academicYear.id)
        .eq("semester", semester);

      if (kehadiranError) {
        console.error("Error loading kehadiran:", kehadiranError);
      }

      const merged = (students || []).map((siswa) => {
        const kehadiran = existingKehadiran?.find(
          (k) => k.student_id === siswa.id
        );

        return {
          id: siswa.id,
          nis: siswa.nis,
          full_name: siswa.full_name,
          kehadiran_id: kehadiran?.id,
          sakit: kehadiran?.sakit || 0,
          ijin: kehadiran?.ijin || 0,
          tanpa_keterangan: kehadiran?.tanpa_keterangan || 0,
        };
      });

      setSiswaList(merged);
    } catch (error) {
      console.error("Error loading data:", error);
      if (onShowToast)
        onShowToast(`Gagal memuat data: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleKehadiranChange = (studentId, field, value) => {
    const numValue = parseInt(value) || 0;
    if (numValue < 0) return;

    if (numValue > 100) {
      if (onShowToast) onShowToast("Maksimal 100 hari per kategori", "warning");
      return;
    }

    const updated = siswaList.map((siswa) => {
      if (siswa.id === studentId) {
        return { ...siswa, [field]: numValue };
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

    const hasError = siswaList.some((siswa) => {
      const total = siswa.sakit + siswa.ijin + siswa.tanpa_keterangan;
      return total > 120;
    });

    if (hasError) {
      if (onShowToast)
        onShowToast(
          "Total hari tidak hadir tidak boleh melebihi 120 hari!",
          "error"
        );
      return;
    }

    if (
      !window.confirm(`Simpan data kehadiran untuk ${siswaList.length} siswa?`)
    )
      return;

    setSaving(true);
    setSaveProgress({ current: 0, total: siswaList.length });

    try {
      const selectedClass = availableClasses.find((c) => c.id === kelas);
      if (!selectedClass) throw new Error("Kelas tidak ditemukan!");

      const userId = user.id;

      for (let i = 0; i < siswaList.length; i++) {
        const siswa = siswaList[i];
        const kehadiranId = siswa.kehadiran_id;

        const kehadiranData = {
          student_id: siswa.id,
          nis: siswa.nis || "",
          class_id: selectedClass.id,
          tahun_ajaran_id: academicYear.id,
          semester: semester,
          sakit: siswa.sakit || 0,
          ijin: siswa.ijin || 0,
          tanpa_keterangan: siswa.tanpa_keterangan || 0,
          created_by: userId,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        };

        if (kehadiranId) {
          const { error: updateError } = await supabase
            .from("kehadiran_siswa")
            .update(kehadiranData)
            .eq("id", kehadiranId);

          if (updateError) {
            console.error("Update error:", updateError);
            throw new Error(
              `Gagal update kehadiran siswa ${siswa.full_name}: ${updateError.message}`
            );
          }
        } else {
          const { error: insertError } = await supabase
            .from("kehadiran_siswa")
            .insert(kehadiranData);

          if (insertError) {
            console.error("Insert error:", insertError);
            throw new Error(
              `Gagal insert kehadiran siswa ${siswa.full_name}: ${insertError.message}`
            );
          }
        }

        setSaveProgress({ current: i + 1, total: siswaList.length });
      }

      if (onShowToast)
        onShowToast("Data kehadiran berhasil disimpan!", "success");
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

  const handleExportExcel = () => {
    if (siswaList.length === 0) {
      if (onShowToast) onShowToast("Tidak ada data untuk diexport!", "warning");
      return;
    }

    if (onShowToast)
      onShowToast("Fitur export Excel akan segera tersedia", "info");
  };

  const handleImportExcel = () => {
    if (onShowToast)
      onShowToast("Fitur import Excel akan segera tersedia", "info");
  };

  if (loading && !kelas) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className={`mt-3 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
            Memuat data wali kelas...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen py-4 sm:py-8 px-3 sm:px-4 ${
        darkMode ? "bg-gray-900" : "bg-gradient-to-br from-blue-50 to-gray-50"
      }`}>
      <div className="max-w-7xl mx-auto">
        <div
          className={`rounded-xl shadow-lg p-4 sm:p-6 ${
            darkMode
              ? "bg-gray-800 border border-gray-700"
              : "bg-white border border-blue-100"
          }`}>
          <h2
            className={`text-xl sm:text-2xl font-bold mb-6 ${
              darkMode ? "text-white" : "text-blue-900"
            }`}>
            📊 Input Kehadiran Siswa
          </h2>

          {errorMessage ? (
            <div className="text-center py-8 sm:py-12">
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
                className={`text-lg sm:text-xl font-bold mb-2 ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}>
                Akses Dibatasi
              </h3>
              <p
                className={`mb-6 max-w-md mx-auto ${
                  darkMode ? "text-gray-300" : "text-gray-600"
                }`}>
                {errorMessage}
              </p>
            </div>
          ) : !isWaliKelas ? (
            <div
              className={`text-center py-8 ${
                darkMode ? "text-gray-300" : "text-gray-500"
              }`}>
              Memuat data wali kelas...
            </div>
          ) : (
            <>
              {isWaliKelas && (
                <div
                  className={`mb-6 p-4 rounded-lg border ${
                    darkMode
                      ? "bg-gray-700/50 border-gray-600"
                      : "bg-blue-50 border-blue-200"
                  }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3
                        className={`font-bold ${
                          darkMode ? "text-white" : "text-blue-900"
                        }`}>
                        👨‍🏫 Anda adalah wali kelas
                      </h3>
                      <p
                        className={`text-sm ${
                          darkMode ? "text-gray-300" : "text-blue-700"
                        } mt-1`}>
                        {waliKelasName}
                      </p>
                    </div>
                    <div
                      className={`px-4 py-2 rounded-full ${
                        darkMode
                          ? "bg-gray-700 text-white"
                          : "bg-blue-600 text-white"
                      }`}>
                      <span className="text-sm font-medium">Wali Kelas</span>
                    </div>
                  </div>
                </div>
              )}

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
                    className={`w-full p-3 rounded-lg border text-sm sm:text-base ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500"
                        : "bg-white border-blue-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                    }`}>
                    <option value="" disabled>
                      -- Pilih Kelas --
                    </option>
                    {availableClasses.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        Kelas {cls.grade}
                      </option>
                    ))}
                  </select>
                  {availableClasses.length === 1 && !kelas && (
                    <p
                      className={`text-xs mt-1 ${
                        darkMode ? "text-yellow-400" : "text-yellow-600"
                      }`}>
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
                    className={`w-full p-3 rounded-lg border text-sm sm:text-base ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500"
                        : "bg-white border-blue-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
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
                  <div className="flex flex-wrap justify-end gap-3 mb-6">
                    <button
                      onClick={handleImportExcel}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors text-sm min-h-[44px] min-w-[44px]"
                      aria-label="Import Excel">
                      <Upload size={18} />
                      <span className="hidden sm:inline">Import Excel</span>
                    </button>
                    <button
                      onClick={handleExportExcel}
                      disabled={siswaList.length === 0}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors text-sm min-h-[44px] min-w-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Export Excel">
                      <Download size={18} />
                      <span className="hidden sm:inline">Export Excel</span>
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving || siswaList.length === 0}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white transition-colors text-sm min-h-[44px] min-w-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Simpan Semua Kehadiran">
                      <Save size={18} />
                      <span className="hidden sm:inline">Simpan Semua</span>
                    </button>
                  </div>

                  {loading ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p
                        className={`mt-2 ${
                          darkMode ? "text-gray-300" : "text-gray-600"
                        }`}>
                        Memuat data siswa...
                      </p>
                    </div>
                  ) : siswaList.length > 0 ? (
                    <>
                      <div
                        className={`mb-4 p-3 rounded-lg ${
                          darkMode
                            ? "bg-gray-700 text-gray-300"
                            : "bg-blue-50 text-blue-700"
                        }`}>
                        <p className="text-sm">
                          Menampilkan {siswaList.length} siswa untuk semester{" "}
                          {semester === "1" ? "Ganjil" : "Genap"}
                        </p>
                      </div>
                      <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full border-collapse min-w-[640px]">
                          <thead
                            className={
                              darkMode
                                ? "bg-gray-700 text-white"
                                : "bg-blue-700 text-white"
                            }>
                            <tr>
                              <th className="p-3 text-center border-r border-gray-600 dark:border-gray-600 w-16 text-sm sm:text-base">
                                No
                              </th>
                              <th className="p-3 text-left border-r border-gray-600 dark:border-gray-600 w-40 text-sm sm:text-base">
                                NIS
                              </th>
                              <th className="p-3 text-left border-r border-gray-600 dark:border-gray-600 min-w-[180px] text-sm sm:text-base">
                                Nama Siswa
                              </th>
                              <th className="p-3 text-center border-r border-gray-600 dark:border-gray-600 w-32 text-sm sm:text-base">
                                Sakit
                              </th>
                              <th className="p-3 text-center border-r border-gray-600 dark:border-gray-600 w-32 text-sm sm:text-base">
                                Ijin
                              </th>
                              <th className="p-3 text-center border-r border-gray-600 dark:border-gray-600 w-40 text-sm sm:text-base">
                                Tanpa Keterangan
                              </th>
                              <th className="p-3 text-center w-40 text-sm sm:text-base">
                                Total Tidak Hadir
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {siswaList.map((siswa, idx) => {
                              const totalTidakHadir =
                                siswa.sakit +
                                siswa.ijin +
                                siswa.tanpa_keterangan;
                              return (
                                <tr
                                  key={siswa.id}
                                  className={`border-b ${
                                    darkMode
                                      ? "border-gray-700 hover:bg-gray-700/50"
                                      : "border-gray-200 hover:bg-blue-50/50"
                                  }`}>
                                  <td className="p-3 text-center border-r border-gray-600 dark:border-gray-600 text-sm sm:text-base">
                                    {idx + 1}
                                  </td>
                                  <td
                                    className={`p-3 border-r border-gray-600 dark:border-gray-600 font-medium text-sm sm:text-base ${
                                      darkMode ? "text-white" : "text-gray-900"
                                    }`}>
                                    {siswa.nis}
                                  </td>
                                  <td
                                    className={`p-3 border-r border-gray-600 dark:border-gray-600 font-medium text-sm sm:text-base ${
                                      darkMode ? "text-white" : "text-gray-900"
                                    }`}>
                                    {siswa.full_name}
                                  </td>
                                  <td className="p-3 border-r border-gray-600 dark:border-gray-600">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={siswa.sakit}
                                      onChange={(e) =>
                                        handleKehadiranChange(
                                          siswa.id,
                                          "sakit",
                                          e.target.value
                                        )
                                      }
                                      className={`w-full p-2 sm:p-3 border rounded text-center text-sm sm:text-base ${
                                        darkMode
                                          ? "bg-gray-700 border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500"
                                          : "bg-white border-blue-200 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                                      }`}
                                      aria-label={`Sakit untuk ${siswa.full_name}`}
                                    />
                                  </td>
                                  <td className="p-3 border-r border-gray-600 dark:border-gray-600">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={siswa.ijin}
                                      onChange={(e) =>
                                        handleKehadiranChange(
                                          siswa.id,
                                          "ijin",
                                          e.target.value
                                        )
                                      }
                                      className={`w-full p-2 sm:p-3 border rounded text-center text-sm sm:text-base ${
                                        darkMode
                                          ? "bg-gray-700 border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500"
                                          : "bg-white border-blue-200 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                                      }`}
                                      aria-label={`Ijin untuk ${siswa.full_name}`}
                                    />
                                  </td>
                                  <td className="p-3 border-r border-gray-600 dark:border-gray-600">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={siswa.tanpa_keterangan}
                                      onChange={(e) =>
                                        handleKehadiranChange(
                                          siswa.id,
                                          "tanpa_keterangan",
                                          e.target.value
                                        )
                                      }
                                      className={`w-full p-2 sm:p-3 border rounded text-center text-sm sm:text-base ${
                                        darkMode
                                          ? "bg-gray-700 border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500"
                                          : "bg-white border-blue-200 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                                      }`}
                                      aria-label={`Tanpa keterangan untuk ${siswa.full_name}`}
                                    />
                                  </td>
                                  <td className="p-3 text-center">
                                    <span
                                      className={`inline-block px-3 py-1 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium ${
                                        totalTidakHadir === 0
                                          ? darkMode
                                            ? "bg-green-900/30 text-green-300"
                                            : "bg-green-100 text-green-800"
                                          : totalTidakHadir <= 10
                                          ? darkMode
                                            ? "bg-yellow-900/30 text-yellow-300"
                                            : "bg-yellow-100 text-yellow-800"
                                          : darkMode
                                          ? "bg-red-900/30 text-red-300"
                                          : "bg-red-100 text-red-800"
                                      }`}>
                                      {totalTidakHadir} hari
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div
                      className={`text-center py-8 ${
                        darkMode ? "text-gray-300" : "text-gray-500"
                      }`}>
                      Tidak ada data siswa untuk kelas ini atau terjadi
                      kesalahan saat memuat data.
                    </div>
                  )}
                </>
              )}

              {(!kelas || !semester) && isWaliKelas && (
                <div
                  className={`text-center py-8 ${
                    darkMode ? "text-gray-300" : "text-gray-500"
                  }`}>
                  Silakan pilih Kelas dan Semester untuk melanjutkan
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {saving && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            className={`rounded-xl p-6 w-full max-w-md ${
              darkMode ? "bg-gray-800" : "bg-white"
            }`}>
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3
                className={`text-lg font-bold mb-2 ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}>
                Menyimpan Kehadiran...
              </h3>
              <p
                className={`text-sm mb-4 ${
                  darkMode ? "text-gray-300" : "text-gray-600"
                }`}>
                {saveProgress.current} dari {saveProgress.total} siswa
              </p>
              <div
                className={`w-full rounded-full h-2 ${
                  darkMode ? "bg-gray-700" : "bg-gray-200"
                }`}>
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
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

export default InputKehadiran;
