import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Settings, Save, Trash2, Plus, RefreshCw } from "lucide-react";

function KKMConfig({ user, onShowToast, darkMode }) {
  // State utama
  const [semester, setSemester] = useState("1"); // 1: Ganjil, 2: Genap
  const [academicYear, setAcademicYear] = useState(null);
  const [jenjang, setJenjang] = useState("");
  const [mapel, setMapel] = useState("");
  const [kkmValue, setKkmValue] = useState(75);

  // Data dropdown
  const [mapelOptions, setMapelOptions] = useState([]);
  const [kkmList, setKkmList] = useState([]);

  // Loading state
  const [loading, setLoading] = useState(true);
  const [loadingMapel, setLoadingMapel] = useState(false);
  const [saving, setSaving] = useState(false);

  // Daftar tetap
  const jenjangList = [7, 8, 9];
  const semesterOptions = [
    { value: "1", label: "Ganjil" },
    { value: "2", label: "Genap" },
  ];

  // Load tahun ajaran aktif saat pertama kali
  useEffect(() => {
    loadAcademicYear();
  }, []);

  // Load mapel options saat jenjang berubah
  useEffect(() => {
    if (jenjang && academicYear) {
      loadMapelOptions();
    } else {
      setMapelOptions([]);
      setMapel("");
    }
  }, [jenjang, academicYear, semester]);

  // Load KKM data saat semua filter terisi
  useEffect(() => {
    if (academicYear && jenjang && mapel && semester) {
      loadKKMData();
    } else {
      setKkmList([]);
    }
  }, [academicYear, jenjang, mapel, semester]);

  // 1. Load tahun ajaran aktif
  const loadAcademicYear = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("academic_years")
        .select("*")
        .eq("is_active", true)
        .single();

      if (error) throw error;
      setAcademicYear(data);
    } catch (error) {
      console.error("Error loading academic year:", error);
      onShowToast?.("Gagal memuat tahun ajaran", "error");
    } finally {
      setLoading(false);
    }
  };

  // 2. Load mapel options dari database
  const loadMapelOptions = async () => {
    if (!jenjang || !academicYear) return;

    try {
      setLoadingMapel(true);

      // Ambil semua kelas untuk jenjang ini (misal 7A, 7B, 7C, dst)
      const { data: classesData, error: classesError } = await supabase
        .from("classes")
        .select("id")
        .ilike("id", `${jenjang}%`);

      if (classesError) throw classesError;
      if (!classesData?.length) {
        setMapelOptions([]);
        return;
      }

      const classIds = classesData.map((c) => c.id);

      // Ambil mapel unik dari nilai_eraport
      const { data, error } = await supabase
        .from("nilai_eraport")
        .select("mata_pelajaran")
        .in("class_id", classIds)
        .eq("tahun_ajaran_id", academicYear.id)
        .eq("semester", semester);

      if (error) throw error;

      const uniqueMapel = [
        ...new Set(data?.map((item) => item.mata_pelajaran) || []),
      ];
      const sortedMapel = uniqueMapel.sort();

      setMapelOptions(sortedMapel);
    } catch (error) {
      console.error("Error loading mapel options:", error);
      onShowToast?.("Gagal memuat daftar mapel", "error");
      setMapelOptions([]);
    } finally {
      setLoadingMapel(false);
    }
  };

  // 3. Load KKM data yang sudah ada
  const loadKKMData = async () => {
    if (!academicYear || !jenjang || !mapel || !semester) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("raport_config")
        .select("*")
        .eq("tahun_ajaran_id", academicYear.id)
        .eq("semester", semester)
        .eq("jenjang", jenjang)
        .eq("mata_pelajaran", mapel)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      setKkmList(data || []);

      // Set nilai KKM terbaru jika ada
      if (data?.length > 0) {
        setKkmValue(data[0].kkm);
      } else {
        setKkmValue(75); // Reset ke default jika tidak ada
      }
    } catch (error) {
      console.error("Error loading KKM:", error);
      onShowToast?.("Gagal memuat data KKM", "error");
    } finally {
      setLoading(false);
    }
  };

  // 4. Simpan/Update KKM
  const handleSaveKKM = async () => {
    if (!academicYear || !jenjang || !mapel || !semester) {
      onShowToast?.("Harap lengkapi semua filter", "warning");
      return;
    }

    if (kkmValue < 0 || kkmValue > 100) {
      onShowToast?.("KKM harus antara 0-100", "warning");
      return;
    }

    try {
      setSaving(true);

      // Cek apakah sudah ada
      const { data: existing, error: checkError } = await supabase
        .from("raport_config")
        .select("id")
        .eq("tahun_ajaran_id", academicYear.id)
        .eq("semester", semester)
        .eq("jenjang", jenjang)
        .eq("mata_pelajaran", mapel)
        .single();

      let result;

      if (existing) {
        // Update existing
        result = await supabase
          .from("raport_config")
          .update({
            kkm: kkmValue,
            updated_at: new Date().toISOString(),
            updated_by: user?.id,
          })
          .eq("id", existing.id);

        if (result.error) throw result.error;
        onShowToast?.("✅ KKM berhasil diperbarui", "success");
      } else {
        // Insert new
        result = await supabase.from("raport_config").insert([
          {
            tahun_ajaran_id: academicYear.id,
            semester,
            jenjang,
            mata_pelajaran: mapel,
            kkm: kkmValue,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: user?.id,
            updated_by: user?.id,
          },
        ]);

        if (result.error) throw result.error;
        onShowToast?.("✅ KKM berhasil disimpan", "success");
      }

      // Refresh data
      await loadKKMData();
    } catch (error) {
      console.error("Error saving KKM:", error);
      onShowToast?.("❌ Gagal menyimpan KKM", "error");
    } finally {
      setSaving(false);
    }
  };

  // 5. Hapus KKM
  const handleDeleteKKM = async (id) => {
    if (!window.confirm("Yakin hapus KKM ini?")) return;

    try {
      const { error } = await supabase
        .from("raport_config")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Update state
      const updatedList = kkmList.filter((item) => item.id !== id);
      setKkmList(updatedList);

      // Reset value jika semua data dihapus
      if (updatedList.length === 0) {
        setKkmValue(75);
      }

      onShowToast?.("✅ KKM berhasil dihapus", "success");
    } catch (error) {
      console.error("Error deleting KKM:", error);
      onShowToast?.("❌ Gagal menghapus KKM", "error");
    }
  };

  // 6. Set KKM dengan prompt (bulk)
  const handleSetKKM = async () => {
    if (!academicYear || !jenjang || !mapel || !semester) {
      onShowToast?.("Harap lengkapi semua filter", "warning");
      return;
    }

    const newKKM = window.prompt(
      `Set KKM untuk ${mapel} (0-100):`,
      kkmValue.toString()
    );
    if (!newKKM) return;

    const kkmNum = parseInt(newKKM);
    if (isNaN(kkmNum) || kkmNum < 0 || kkmNum > 100) {
      onShowToast?.("KKM harus angka 0-100", "error");
      return;
    }

    setKkmValue(kkmNum);
    await handleSaveKKM();
  };

  // 7. Reset semua filter
  const handleReset = () => {
    setJenjang("");
    setMapel("");
    setMapelOptions([]);
    setKkmList([]);
    setKkmValue(75);
  };

  // 8. Refresh data
  const handleRefresh = () => {
    loadMapelOptions();
    loadKKMData();
  };

  // Loading state awal
  if (loading && !academicYear) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className={`mt-3 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
            Memuat data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen p-4 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <div className="max-w-6xl mx-auto">
        {/* Card utama */}
        <div
          className={`rounded-xl shadow-lg ${
            darkMode ? "bg-gray-800" : "bg-white"
          }`}>
          {/* Header */}
          <div
            className={`p-6 border-b ${
              darkMode ? "border-gray-700" : "border-gray-200"
            }`}>
            <div className="flex items-center justify-between">
              <div>
                <h1
                  className={`text-2xl font-bold flex items-center gap-2 ${
                    darkMode ? "text-white" : "text-gray-800"
                  }`}>
                  <Settings className="text-blue-500" />
                  Pengaturan KKM
                </h1>
                <p
                  className={`mt-1 ${
                    darkMode ? "text-gray-400" : "text-gray-600"
                  }`}>
                  Set Kriteria Ketuntasan Minimal per Mapel
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRefresh}
                  className="p-2 rounded-lg hover:bg-gray-700"
                  title="Refresh">
                  <RefreshCw
                    size={20}
                    className={darkMode ? "text-gray-400" : "text-gray-600"}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Filter Section */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Tahun Ajaran (readonly) */}
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}>
                  Tahun Ajaran
                </label>
                <div
                  className={`p-3 rounded-lg ${
                    darkMode
                      ? "bg-gray-700 text-gray-300"
                      : "bg-gray-100 text-gray-600"
                  }`}>
                  {academicYear?.year || "-"}
                </div>
              </div>

              {/* Semester */}
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}>
                  Semester
                </label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className={`w-full p-3 rounded-lg border ${
                    darkMode
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300"
                  }`}>
                  {semesterOptions.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Jenjang */}
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}>
                  Jenjang Kelas
                </label>
                <select
                  value={jenjang}
                  onChange={(e) => setJenjang(e.target.value)}
                  className={`w-full p-3 rounded-lg border ${
                    darkMode
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300"
                  }`}>
                  <option value="">Pilih Jenjang</option>
                  {jenjangList.map((j) => (
                    <option key={j} value={j}>
                      Kelas {j}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mapel Dropdown */}
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}>
                  Mata Pelajaran
                  {loadingMapel && (
                    <span className="text-xs text-gray-500 ml-2">
                      (loading...)
                    </span>
                  )}
                </label>
                <select
                  value={mapel}
                  onChange={(e) => setMapel(e.target.value)}
                  disabled={!jenjang || loadingMapel}
                  className={`w-full p-3 rounded-lg border ${
                    darkMode
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300"
                  } ${!jenjang ? "opacity-50 cursor-not-allowed" : ""}`}>
                  <option value="">
                    {jenjang ? "Pilih Mapel" : "Pilih jenjang dulu"}
                  </option>
                  {mapelOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status */}
            {jenjang && mapel && (
              <div
                className={`p-4 rounded-lg mb-6 ${
                  darkMode ? "bg-blue-900/30" : "bg-blue-50"
                }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3
                      className={`font-semibold ${
                        darkMode ? "text-white" : "text-blue-900"
                      }`}>
                      KKM untuk {mapel}
                    </h3>
                    <p
                      className={`text-sm ${
                        darkMode ? "text-blue-300" : "text-blue-700"
                      }`}>
                      Kelas {jenjang} • Semester{" "}
                      {semester === "1" ? "Ganjil" : "Genap"} •{" "}
                      {academicYear?.year}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={kkmValue}
                      onChange={(e) => setKkmValue(parseInt(e.target.value))}
                      className="w-48"
                    />
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-2xl font-bold ${
                          darkMode ? "text-white" : "text-blue-900"
                        }`}>
                        {kkmValue}
                      </span>
                      <span
                        className={`text-sm ${
                          darkMode ? "text-gray-400" : "text-gray-600"
                        }`}>
                        / 100
                      </span>
                    </div>
                  </div>
                </div>
                <p
                  className={`text-sm mt-2 ${
                    darkMode ? "text-blue-300" : "text-blue-700"
                  }`}>
                  Berlaku untuk semua kelas {jenjang}A sampai {jenjang}F
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSaveKKM}
                disabled={saving || !jenjang || !mapel}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  saving || !jenjang || !mapel
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                } text-white`}>
                <Save size={18} />
                {saving ? "Menyimpan..." : "Simpan KKM"}
              </button>

              <button
                onClick={handleSetKKM}
                disabled={saving || !jenjang || !mapel}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  saving || !jenjang || !mapel
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                } text-white`}>
                <Settings size={18} />
                Set KKM
              </button>

              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-gray-500 hover:bg-gray-600 text-white transition-colors">
                Reset Filter
              </button>
            </div>
          </div>

          {/* History Table */}
          {kkmList.length > 0 && (
            <div className="p-6 border-t">
              <h3
                className={`text-lg font-semibold mb-4 ${
                  darkMode ? "text-white" : "text-gray-800"
                }`}>
                Riwayat KKM
              </h3>
              <div className="overflow-x-auto rounded-lg border">
                <table className="min-w-full">
                  <thead className={darkMode ? "bg-gray-700" : "bg-gray-100"}>
                    <tr>
                      <th className="p-3 text-left text-sm font-medium">No</th>
                      <th className="p-3 text-left text-sm font-medium">
                        Mapel
                      </th>
                      <th className="p-3 text-left text-sm font-medium">
                        Jenjang
                      </th>
                      <th className="p-3 text-left text-sm font-medium">
                        Semester
                      </th>
                      <th className="p-3 text-left text-sm font-medium">KKM</th>
                      <th className="p-3 text-left text-sm font-medium">
                        Update Terakhir
                      </th>
                      <th className="p-3 text-left text-sm font-medium">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {kkmList.map((item, index) => (
                      <tr
                        key={item.id}
                        className={`border-b ${
                          darkMode
                            ? "border-gray-700 hover:bg-gray-800/50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}>
                        <td className="p-3">{index + 1}</td>
                        <td className="p-3">{item.mata_pelajaran}</td>
                        <td className="p-3">Kelas {item.jenjang}</td>
                        <td className="p-3">
                          {item.semester === "1" ? "Ganjil" : "Genap"}
                        </td>
                        <td className="p-3 font-bold">{item.kkm}</td>
                        <td className="p-3 text-sm">
                          {new Date(item.updated_at).toLocaleDateString(
                            "id-ID"
                          )}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => handleDeleteKKM(item.id)}
                            className="p-2 text-red-500 hover:text-red-700 rounded hover:bg-red-50"
                            title="Hapus">
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!jenjang && !mapel && (
            <div className="p-6 text-center">
              <Settings
                className={`w-16 h-16 mx-auto mb-4 ${
                  darkMode ? "text-gray-600" : "text-gray-400"
                }`}
              />
              <h3
                className={`text-lg font-medium mb-2 ${
                  darkMode ? "text-gray-300" : "text-gray-600"
                }`}>
                Atur KKM dengan Mudah
              </h3>
              <p
                className={`${
                  darkMode ? "text-gray-400" : "text-gray-500"
                } mb-4`}>
                1. Pilih Semester
                <br />
                2. Pilih Jenjang Kelas (7, 8, atau 9)
                <br />
                3. Pilih Mata Pelajaran dari dropdown
                <br />
                4. Atur nilai KKM
                <br />
                5. Klik Simpan
              </p>
              <p
                className={`text-sm ${
                  darkMode ? "text-gray-500" : "text-gray-400"
                }`}>
                KKM akan berlaku untuk semua kelas paralel dalam jenjang yang
                sama
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default KKMConfig;
