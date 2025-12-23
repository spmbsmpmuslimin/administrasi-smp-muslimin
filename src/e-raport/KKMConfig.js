import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Settings, Save, Trash2, Plus, RefreshCw } from "lucide-react";

function KKMConfig({ user, onShowToast, darkMode }) {
  const [academicYear, setAcademicYear] = useState(null);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [availableMapel, setAvailableMapel] = useState([]); // Mapel dari database
  const [kkmList, setKkmList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedClass, setSelectedClass] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [loadingMapel, setLoadingMapel] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    class_id: "",
    mata_pelajaran: "",
    kkm: 75,
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedClass && academicYear) {
      loadKKMData();
    }
  }, [selectedClass, academicYear]);

  useEffect(() => {
    // Load mata pelajaran dari database
    loadMapelFromDatabase();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      // Load academic year aktif
      const { data: ayData, error: ayError } = await supabase
        .from("academic_years")
        .select("*")
        .eq("is_active", true)
        .single();

      if (ayError || !ayData) {
        throw new Error("Tahun ajaran aktif tidak ditemukan.");
      }

      setAcademicYear(ayData);

      // Load semua kelas - tampilkan id (misal "7A") sebagai label
      const { data: classesData, error: classesError } = await supabase
        .from("classes")
        .select("id, grade, academic_year")
        .order("id"); // Urut berdasarkan id kelas

      if (classesError) {
        throw new Error("Gagal load data kelas.");
      }

      setAvailableClasses(classesData || []);

      if (onShowToast) onShowToast("Data berhasil dimuat!", "success");
    } catch (error) {
      console.error("Error loading initial data:", error);
      if (onShowToast) onShowToast(`Error: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const loadMapelFromDatabase = async () => {
    try {
      setLoadingMapel(true);

      // Ambil mata pelajaran unik dari tabel nilai_eraport
      const { data, error } = await supabase
        .from("nilai_eraport")
        .select("mata_pelajaran")
        .order("mata_pelajaran");

      if (error) throw error;

      // Ekstrak mata pelajaran unik
      const uniqueMapel = [
        ...new Set(data?.map((item) => item.mata_pelajaran) || []),
      ];

      // Urutkan alfabet
      uniqueMapel.sort();

      setAvailableMapel(uniqueMapel);
    } catch (error) {
      console.error("Error loading mata pelajaran:", error);
      if (onShowToast)
        onShowToast(`Gagal load mata pelajaran: ${error.message}`, "error");
    } finally {
      setLoadingMapel(false);
    }
  };

  const loadKKMData = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("raport_config")
        .select("*")
        .eq("class_id", selectedClass)
        .eq("tahun_ajaran_id", academicYear.id)
        .order("mata_pelajaran");

      if (error) throw error;

      setKkmList(data || []);
    } catch (error) {
      console.error("Error loading KKM:", error);
      if (onShowToast) onShowToast(`Gagal load KKM: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddKKM = async () => {
    if (!formData.class_id || !formData.mata_pelajaran) {
      if (onShowToast) onShowToast("Lengkapi semua field!", "warning");
      return;
    }

    if (formData.kkm < 0 || formData.kkm > 100) {
      if (onShowToast) onShowToast("KKM harus antara 0-100!", "warning");
      return;
    }

    // Check duplicate
    const exists = kkmList.find(
      (item) =>
        item.class_id === formData.class_id &&
        item.mata_pelajaran === formData.mata_pelajaran
    );

    if (exists) {
      if (onShowToast)
        onShowToast("KKM untuk mapel ini sudah ada! Gunakan edit.", "warning");
      return;
    }

    try {
      setSaving(true);

      const newKKM = {
        class_id: formData.class_id,
        mata_pelajaran: formData.mata_pelajaran,
        tahun_ajaran_id: academicYear.id,
        kkm: formData.kkm,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("raport_config").insert([newKKM]);

      if (error) throw error;

      if (onShowToast) onShowToast("KKM berhasil ditambahkan!", "success");

      // Reset form & reload
      setFormData({ class_id: "", mata_pelajaran: "", kkm: 75 });
      setShowAddForm(false);
      await loadKKMData();
    } catch (error) {
      console.error("Error adding KKM:", error);
      if (onShowToast)
        onShowToast(`Gagal tambah KKM: ${error.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateKKM = async (id, newKKM) => {
    if (newKKM < 0 || newKKM > 100) {
      if (onShowToast) onShowToast("KKM harus antara 0-100!", "warning");
      return;
    }

    try {
      const { error } = await supabase
        .from("raport_config")
        .update({
          kkm: newKKM,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      // Update local state
      setKkmList(
        kkmList.map((item) =>
          item.id === id ? { ...item, kkm: newKKM } : item
        )
      );

      if (onShowToast) onShowToast("KKM berhasil diupdate!", "success");
    } catch (error) {
      console.error("Error updating KKM:", error);
      if (onShowToast)
        onShowToast(`Gagal update KKM: ${error.message}`, "error");
    }
  };

  const handleDeleteKKM = async (id, mapel) => {
    if (!window.confirm(`Hapus KKM untuk ${mapel}?`)) return;

    try {
      const { error } = await supabase
        .from("raport_config")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setKkmList(kkmList.filter((item) => item.id !== id));
      if (onShowToast) onShowToast("KKM berhasil dihapus!", "success");
    } catch (error) {
      console.error("Error deleting KKM:", error);
      if (onShowToast)
        onShowToast(`Gagal hapus KKM: ${error.message}`, "error");
    }
  };

  const handleBulkSetKKM = async () => {
    if (!selectedClass) {
      if (onShowToast) onShowToast("Pilih kelas terlebih dahulu!", "warning");
      return;
    }

    const kkm = window.prompt(
      "Set KKM untuk SEMUA mata pelajaran (0-100):",
      "75"
    );
    if (!kkm) return;

    const kkmValue = parseInt(kkm);
    if (isNaN(kkmValue) || kkmValue < 0 || kkmValue > 100) {
      if (onShowToast) onShowToast("KKM tidak valid!", "error");
      return;
    }

    // Tampilkan nama kelas yang dipilih
    const selectedClassData = availableClasses.find(
      (cls) => cls.id === selectedClass
    );
    const className = selectedClassData
      ? `Kelas ${selectedClassData.id}`
      : `Kelas ${selectedClass}`;

    if (
      !window.confirm(
        `Set KKM ${kkmValue} untuk SEMUA mata pelajaran di ${className}?`
      )
    ) {
      return;
    }

    try {
      setSaving(true);

      const bulkData = availableMapel.map((mapel) => ({
        class_id: selectedClass,
        mata_pelajaran: mapel,
        tahun_ajaran_id: academicYear.id,
        kkm: kkmValue,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      // Delete existing KKM untuk kelas ini
      const { error: deleteError } = await supabase
        .from("raport_config")
        .delete()
        .eq("class_id", selectedClass)
        .eq("tahun_ajaran_id", academicYear.id);

      if (deleteError) throw deleteError;

      // Insert KKM baru
      const { error: insertError } = await supabase
        .from("raport_config")
        .insert(bulkData);

      if (insertError) throw insertError;

      if (onShowToast)
        onShowToast(
          `KKM ${kkmValue} berhasil di-set untuk ${availableMapel.length} mapel!`,
          "success"
        );

      await loadKKMData();
    } catch (error) {
      console.error("Error bulk set KKM:", error);
      if (onShowToast)
        onShowToast(`Gagal set KKM massal: ${error.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !selectedClass) {
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
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b">
            <div>
              <h2
                className={`text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2 ${
                  darkMode ? "text-white" : "text-blue-800"
                }`}>
                <Settings className="text-blue-600" size={28} />
                Pengaturan KKM
              </h2>
              <p
                className={`text-sm mt-1 ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}>
                Kriteria Ketuntasan Minimal per Kelas & Mata Pelajaran
              </p>
            </div>
          </div>

          {/* Filter Kelas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label
                className={`block text-sm font-semibold mb-2 ${
                  darkMode ? "text-gray-300" : "text-blue-700"
                }`}>
                Pilih Kelas
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className={`w-full p-3 rounded-xl border transition-all duration-200 ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-blue-300 text-blue-900"
                }`}>
                <option value="">-- Pilih Kelas --</option>
                {availableClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.id} (Kelas {cls.grade})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className={`block text-sm font-semibold mb-2 ${
                  darkMode ? "text-gray-300" : "text-blue-700"
                }`}>
                Tahun Ajaran
              </label>
              <input
                type="text"
                value={academicYear?.year || "-"}
                disabled
                className={`w-full p-3 rounded-xl border ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-gray-400"
                    : "bg-gray-100 border-gray-300 text-gray-600"
                }`}
              />
            </div>
          </div>

          {/* Action Buttons */}
          {selectedClass && (
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md hover:shadow-lg transition-all">
                <Plus size={20} />
                Tambah KKM
              </button>

              <button
                onClick={handleBulkSetKKM}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50">
                <Settings size={20} />
                Set KKM Massal
              </button>

              <button
                onClick={loadKKMData}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-600 hover:bg-gray-700 text-white font-medium shadow-md hover:shadow-lg transition-all">
                <RefreshCw size={20} />
                Refresh
              </button>
            </div>
          )}

          {/* Add Form */}
          {showAddForm && (
            <div
              className={`p-4 rounded-xl mb-6 border-2 ${
                darkMode
                  ? "bg-gray-700 border-blue-500"
                  : "bg-blue-50 border-blue-300"
              }`}>
              <h3
                className={`text-lg font-bold mb-4 ${
                  darkMode ? "text-white" : "text-blue-800"
                }`}>
                Tambah KKM Baru
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}>
                    Kelas
                  </label>
                  <select
                    value={formData.class_id}
                    onChange={(e) =>
                      setFormData({ ...formData, class_id: e.target.value })
                    }
                    className={`w-full p-3 rounded-lg border ${
                      darkMode
                        ? "bg-gray-600 border-gray-500 text-white"
                        : "bg-white border-blue-300"
                    }`}>
                    <option value="">-- Pilih --</option>
                    {availableClasses.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.id} (Kelas {cls.grade})
                      </option>
                    ))}
                  </select>
                </div>

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
                    value={formData.mata_pelajaran}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        mata_pelajaran: e.target.value,
                      })
                    }
                    disabled={loadingMapel}
                    className={`w-full p-3 rounded-lg border ${
                      darkMode
                        ? "bg-gray-600 border-gray-500 text-white"
                        : "bg-white border-blue-300"
                    } ${loadingMapel ? "opacity-50" : ""}`}>
                    <option value="">-- Pilih --</option>
                    {availableMapel.map((mapel) => (
                      <option key={mapel} value={mapel}>
                        {mapel}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}>
                    KKM (0-100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.kkm}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        kkm: parseInt(e.target.value) || 0,
                      })
                    }
                    className={`w-full p-3 rounded-lg border ${
                      darkMode
                        ? "bg-gray-600 border-gray-500 text-white"
                        : "bg-white border-blue-300"
                    }`}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleAddKKM}
                  disabled={saving || loadingMapel}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50">
                  <Save size={18} />
                  Simpan
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded-lg bg-gray-500 hover:bg-gray-600 text-white font-medium">
                  Batal
                </button>
              </div>
            </div>
          )}

          {/* KKM List */}
          {selectedClass && (
            <>
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                  <p
                    className={`mt-3 ${
                      darkMode ? "text-gray-300" : "text-gray-600"
                    }`}>
                    Memuat data KKM...
                  </p>
                </div>
              ) : kkmList.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border shadow-sm">
                  <table className="w-full border-collapse">
                    <thead className={darkMode ? "bg-gray-700" : "bg-blue-700"}>
                      <tr>
                        <th className="p-4 text-left text-white border-r border-gray-600">
                          No
                        </th>
                        <th className="p-4 text-left text-white border-r border-gray-600">
                          Kelas
                        </th>
                        <th className="p-4 text-left text-white border-r border-gray-600">
                          Mata Pelajaran
                        </th>
                        <th className="p-4 text-center text-white border-r border-gray-600">
                          KKM
                        </th>
                        <th className="p-4 text-center text-white">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kkmList.map((item, idx) => (
                        <tr
                          key={item.id}
                          className={`border-b ${
                            darkMode
                              ? "border-gray-700 hover:bg-gray-800/50"
                              : "border-blue-100 hover:bg-blue-50/50"
                          }`}>
                          <td
                            className={`p-4 border-r border-gray-600 ${
                              darkMode ? "text-white" : "text-gray-900"
                            }`}>
                            {idx + 1}
                          </td>
                          <td
                            className={`p-4 border-r border-gray-600 font-medium ${
                              darkMode ? "text-white" : "text-gray-900"
                            }`}>
                            {item.class_id}
                          </td>
                          <td
                            className={`p-4 border-r border-gray-600 ${
                              darkMode ? "text-white" : "text-gray-900"
                            }`}>
                            {item.mata_pelajaran}
                          </td>
                          <td className="p-4 text-center border-r border-gray-600">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.kkm}
                              onChange={(e) =>
                                handleUpdateKKM(
                                  item.id,
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className={`w-20 p-2 text-center rounded-lg border font-bold ${
                                darkMode
                                  ? "bg-gray-700 border-gray-600 text-white"
                                  : "bg-white border-blue-300 text-blue-900"
                              }`}
                            />
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() =>
                                handleDeleteKKM(item.id, item.mata_pelajaran)
                              }
                              className="p-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors">
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 rounded-xl border border-dashed">
                  <Settings
                    className={`w-16 h-16 mx-auto mb-3 ${
                      darkMode ? "text-gray-500" : "text-gray-400"
                    }`}
                  />
                  <p
                    className={`${
                      darkMode ? "text-gray-400" : "text-gray-500"
                    }`}>
                    Belum ada data KKM untuk kelas ini
                  </p>
                  <p
                    className={`text-sm mt-2 ${
                      darkMode ? "text-gray-500" : "text-gray-400"
                    }`}>
                    Klik "Tambah KKM" atau "Set KKM Massal" untuk mulai
                  </p>
                </div>
              )}
            </>
          )}

          {!selectedClass && (
            <div className="text-center py-12 rounded-xl border border-dashed">
              <Settings
                className={`w-16 h-16 mx-auto mb-3 ${
                  darkMode ? "text-gray-500" : "text-blue-400"
                }`}
              />
              <p className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                Silakan pilih kelas untuk melihat & mengatur KKM
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default KKMConfig;
