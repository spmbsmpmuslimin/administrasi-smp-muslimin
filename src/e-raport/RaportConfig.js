//[file name]: RaportConfig.js
import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  CheckCircle,
  XCircle,
  Save,
  Edit2,
  Trash2,
  Plus,
  AlertCircle,
} from "lucide-react";

export default function RaportConfig({ user, showToast }) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("toggle");

  // Toggle State
  const [eraportSettings, setEraportSettings] = useState({
    is_active: false,
    active_period: "",
    message: "",
  });

  // KKM State
  const [selectedClass, setSelectedClass] = useState("");
  const [classes, setClasses] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [editingConfig, setEditingConfig] = useState(null);
  const [availableSubjects, setAvailableSubjects] = useState([]); // NEW: untuk dropdown mapel
  const [newConfig, setNewConfig] = useState({
    mata_pelajaran: "",
    kkm: 75,
    bobot_nh: 40,
    bobot_pts: 30,
    bobot_pas: 30,
  });

  // Metadata State
  const [metadata, setMetadata] = useState({
    tanggal_raport: "",
    tempat: "Bandung",
    nama_kepala_sekolah: "",
    nip_kepala_sekolah: "",
    ttd_kepala_sekolah: "",
  });
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("Ganjil");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedClass && selectedAcademicYear) {
      fetchConfigs();
      fetchAvailableSubjects(); // NEW: ambil mata pelajaran saat kelas dan tahun ajaran dipilih
    }
  }, [selectedClass, selectedAcademicYear]);

  useEffect(() => {
    if (selectedAcademicYear && selectedSemester) {
      fetchMetadata();
    }
  }, [selectedAcademicYear, selectedSemester]);

  const fetchData = async () => {
    try {
      // Fetch E-Raport Settings
      const { data: settings } = await supabase
        .from("eraport_settings")
        .select("*")
        .single();

      if (settings) setEraportSettings(settings);

      // Fetch Classes - AMBIL SEMUA DATA KELAS
      const { data: classData } = await supabase
        .from("classes")
        .select("id, grade, academic_year, is_active")
        .eq("is_active", true)
        .order("grade");

      setClasses(classData || []);

      // Fetch Academic Years
      const { data: ayData } = await supabase
        .from("academic_years")
        .select("*")
        .order("year", { ascending: false });

      setAcademicYears(ayData || []);

      const activeYear = ayData?.find((y) => y.is_active);
      if (activeYear) {
        setSelectedAcademicYear(activeYear.id);
        setSelectedSemester(activeYear.semester);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  // NEW: Fungsi untuk mengambil mata pelajaran yang tersedia berdasarkan kelas dan tahun ajaran
  const fetchAvailableSubjects = async () => {
    try {
      console.log("🔍 Fetching subjects for:", {
        class_id: selectedClass,
        academic_year_id: selectedAcademicYear,
      });

      const { data, error } = await supabase
        .from("teacher_assignments")
        .select("subject")
        .eq("class_id", selectedClass)
        .eq("academic_year_id", selectedAcademicYear)
        .order("subject");
      // 👇 TAMBAHKAN 3 BARIS INI
      console.log(
        "🔍 Filter: class_id =",
        selectedClass,
        "academic_year_id =",
        selectedAcademicYear
      );
      console.log("📚 Data mapel:", data);
      console.log("📊 Jumlah mapel:", data?.length);

      if (error) {
        console.error("❌ Error fetching subjects:", error);
        return;
      }

      console.log("📚 Subjects found:", data);

      // Hapus duplikat mata pelajaran
      const uniqueSubjects = [
        ...new Set(data?.map((item) => item.subject) || []),
      ];

      console.log("✅ Unique subjects:", uniqueSubjects);
      setAvailableSubjects(uniqueSubjects);
    } catch (error) {
      console.error("💥 Exception:", error);
    }
  };

  const fetchConfigs = async () => {
    try {
      const { data } = await supabase
        .from("raport_config")
        .select("*")
        .eq("class_id", selectedClass)
        .eq("tahun_ajaran_id", selectedAcademicYear);

      setConfigs(data || []);
    } catch (error) {
      console.error("Error fetching configs:", error);
    }
  };

  const fetchMetadata = async () => {
    try {
      const { data } = await supabase
        .from("raport_metadata")
        .select("*")
        .eq("tahun_ajaran_id", selectedAcademicYear)
        .eq("semester", selectedSemester)
        .single();

      if (data) {
        setMetadata({
          tanggal_raport: data.tanggal_raport || "",
          tempat: data.tempat || "Bandung",
          nama_kepala_sekolah: data.nama_kepala_sekolah || "",
          nip_kepala_sekolah: data.nip_kepala_sekolah || "",
          ttd_kepala_sekolah: data.ttd_kepala_sekolah || "",
        });
      } else {
        setMetadata({
          tanggal_raport: "",
          tempat: "Bandung",
          nama_kepala_sekolah: "",
          nip_kepala_sekolah: "",
          ttd_kepala_sekolah: "",
        });
      }
    } catch (error) {
      console.error("Error fetching metadata:", error);
    }
  };

  const handleToggleEraport = async () => {
    try {
      const { error } = await supabase
        .from("eraport_settings")
        .update({
          is_active: !eraportSettings.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", eraportSettings.id);

      if (error) throw error;

      setEraportSettings((prev) => ({ ...prev, is_active: !prev.is_active }));
      showToast(
        `E-Raport ${
          !eraportSettings.is_active ? "diaktifkan" : "dinonaktifkan"
        }`,
        "success"
      );
    } catch (error) {
      console.error("Error toggling:", error);
      alert("Gagal mengubah status E-Raport");
    }
  };

  const handleSaveMessage = async () => {
    try {
      const { error } = await supabase
        .from("eraport_settings")
        .update({
          message: eraportSettings.message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", eraportSettings.id);

      if (error) throw error;
      showToast("Pesan berhasil disimpan", "success");
    } catch (error) {
      console.error("Error saving message:", error);
      alert("Gagal menyimpan pesan");
    }
  };

  const validateBobot = (nh, pts, pas) => {
    return parseFloat(nh) + parseFloat(pts) + parseFloat(pas) === 100;
  };

  const handleSaveConfig = async (config) => {
    if (!config.mata_pelajaran) {
      showToast("Mata pelajaran harus dipilih!", "error");
      return;
    }

    if (!validateBobot(config.bobot_nh, config.bobot_pts, config.bobot_pas)) {
      showToast("Total bobot harus 100%!", "error");
      return;
    }

    try {
      if (config.id) {
        // Update
        const { error } = await supabase
          .from("raport_config")
          .update({
            kkm: config.kkm,
            bobot_nh: config.bobot_nh,
            bobot_pts: config.bobot_pts,
            bobot_pas: config.bobot_pas,
            updated_at: new Date().toISOString(),
          })
          .eq("id", config.id);

        if (error) throw error;
      } else {
        // Cek dulu apakah mapel untuk kelas ini sudah ada konfigurasinya
        const existingConfig = configs.find(
          (c) => c.mata_pelajaran === config.mata_pelajaran
        );

        if (existingConfig) {
          showToast("Mata pelajaran ini sudah ada konfigurasinya!", "error");
          return;
        }

        // Insert
        const { error } = await supabase.from("raport_config").insert({
          class_id: selectedClass,
          mata_pelajaran: config.mata_pelajaran,
          tahun_ajaran_id: selectedAcademicYear,
          kkm: config.kkm,
          bobot_nh: config.bobot_nh,
          bobot_pts: config.bobot_pts,
          bobot_pas: config.bobot_pas,
        });

        if (error) throw error;
      }

      showToast("Konfigurasi berhasil disimpan", "success");
      setEditingConfig(null);
      setNewConfig({
        mata_pelajaran: "",
        kkm: 75,
        bobot_nh: 40,
        bobot_pts: 30,
        bobot_pas: 30,
      });
      fetchConfigs();
    } catch (error) {
      console.error("Error saving config:", error);
      showToast("Gagal menyimpan konfigurasi", "error");
    }
  };

  const handleDeleteConfig = async (id) => {
    if (!window.confirm("Hapus konfigurasi ini?")) return;

    try {
      const { error } = await supabase
        .from("raport_config")
        .delete()
        .eq("id", id);

      if (error) throw error;
      showToast("Konfigurasi berhasil dihapus", "success");
      fetchConfigs();
    } catch (error) {
      console.error("Error deleting config:", error);
      showToast("Gagal menghapus konfigurasi", "error");
    }
  };

  const handleSaveMetadata = async () => {
    if (!metadata.tanggal_raport || !metadata.nama_kepala_sekolah) {
      showToast("Tanggal raport dan nama kepala sekolah wajib diisi!", "error");
      return;
    }

    try {
      const { data: existing } = await supabase
        .from("raport_metadata")
        .select("id")
        .eq("tahun_ajaran_id", selectedAcademicYear)
        .eq("semester", selectedSemester)
        .single();

      if (existing) {
        // Update
        const { error } = await supabase
          .from("raport_metadata")
          .update({
            ...metadata,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase.from("raport_metadata").insert({
          tahun_ajaran_id: selectedAcademicYear,
          semester: selectedSemester,
          ...metadata,
        });

        if (error) throw error;
      }

      showToast("Metadata raport berhasil disimpan", "success");
    } catch (error) {
      console.error("Error saving metadata:", error);
      showToast("Gagal menyimpan metadata raport", "error");
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setMetadata((prev) => ({ ...prev, ttd_kepala_sekolah: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Konfigurasi E-Raport</h1>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab("toggle")}
          className={`px-4 py-2 font-medium ${
            activeTab === "toggle"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600"
          }`}>
          Status E-Raport
        </button>
        <button
          onClick={() => setActiveTab("kkm")}
          className={`px-4 py-2 font-medium ${
            activeTab === "kkm"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600"
          }`}>
          KKM & Bobot Nilai
        </button>
        <button
          onClick={() => setActiveTab("metadata")}
          className={`px-4 py-2 font-medium ${
            activeTab === "metadata"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600"
          }`}>
          Metadata Raport
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "toggle" && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">
                Status Fitur E-Raport
              </h2>
              <p className="text-gray-600">
                Aktifkan fitur ini saat periode input nilai raport
              </p>
            </div>

            {/* TOGGLE SWITCH YANG LEBIH JELAS */}
            <div className="flex items-center space-x-4">
              <div className="flex flex-col items-end">
                <div className="text-sm font-medium mb-1">
                  {eraportSettings.is_active ? "Aktif" : "Nonaktif"}
                </div>
                <div className="text-xs text-gray-500">
                  {eraportSettings.is_active
                    ? "Fitur dapat diakses"
                    : "Fitur ditutup"}
                </div>
              </div>

              <button
                onClick={handleToggleEraport}
                className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-300 ${
                  eraportSettings.is_active ? "bg-green-500" : "bg-gray-300"
                }`}>
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-300 ${
                    eraportSettings.is_active
                      ? "translate-x-9"
                      : "translate-x-1"
                  }`}
                />
              </button>

              <div className="flex flex-col items-start">
                <div
                  className={`text-sm font-medium ${
                    eraportSettings.is_active
                      ? "text-green-600"
                      : "text-gray-400"
                  }`}>
                  {eraportSettings.is_active ? (
                    <div className="flex items-center">
                      <CheckCircle size={20} className="mr-1" />
                      On
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <XCircle size={20} className="mr-1" />
                      Off
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Periode Aktif
              </label>
              <input
                type="text"
                value={eraportSettings.active_period}
                onChange={(e) =>
                  setEraportSettings((prev) => ({
                    ...prev,
                    active_period: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Semester 1 2025/2026"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Pesan (saat non-aktif)
              </label>
              <textarea
                value={eraportSettings.message}
                onChange={(e) =>
                  setEraportSettings((prev) => ({
                    ...prev,
                    message: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border rounded-lg"
                rows="3"
                placeholder="Fitur E-Raport sedang tidak aktif"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleSaveMessage}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center space-x-2">
                <Save size={18} />
                <span>Simpan Pesan</span>
              </button>

              <button
                onClick={handleToggleEraport}
                className={`px-4 py-2 rounded-lg font-medium flex items-center space-x-2 ${
                  eraportSettings.is_active
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-green-500 hover:bg-green-600 text-white"
                }`}>
                {eraportSettings.is_active ? (
                  <>
                    <XCircle size={18} />
                    <span>Nonaktifkan E-Raport</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    <span>Aktifkan E-Raport</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "kkm" && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            Kelola KKM & Bobot Nilai
          </h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">Kelas</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg">
                <option value="">Pilih Kelas</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} - {c.academic_year}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Tahun Ajaran
              </label>
              <select
                value={selectedAcademicYear}
                onChange={(e) => setSelectedAcademicYear(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg">
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>
                    {ay.year} - {ay.semester}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedClass && (
            <>
              {/* Add New Config */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h3 className="font-medium mb-3">Tambah Mata Pelajaran</h3>
                <div className="grid grid-cols-5 gap-3">
                  {/* DROPDOWN untuk pilih mata pelajaran */}
                  <select
                    value={newConfig.mata_pelajaran}
                    onChange={(e) =>
                      setNewConfig((prev) => ({
                        ...prev,
                        mata_pelajaran: e.target.value,
                      }))
                    }
                    className="px-3 py-2 border rounded">
                    <option value="">Pilih Mata Pelajaran</option>
                    {availableSubjects.map((subject, index) => (
                      <option key={index} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="KKM"
                    value={newConfig.kkm}
                    onChange={(e) =>
                      setNewConfig((prev) => ({ ...prev, kkm: e.target.value }))
                    }
                    className="px-3 py-2 border rounded"
                  />
                  <input
                    type="number"
                    placeholder="Bobot NH (%)"
                    value={newConfig.bobot_nh}
                    onChange={(e) =>
                      setNewConfig((prev) => ({
                        ...prev,
                        bobot_nh: e.target.value,
                      }))
                    }
                    className="px-3 py-2 border rounded"
                  />
                  <input
                    type="number"
                    placeholder="PTS (%)"
                    value={newConfig.bobot_pts}
                    onChange={(e) =>
                      setNewConfig((prev) => ({
                        ...prev,
                        bobot_pts: e.target.value,
                      }))
                    }
                    className="px-3 py-2 border rounded"
                  />
                  <input
                    type="number"
                    placeholder="PAS (%)"
                    value={newConfig.bobot_pas}
                    onChange={(e) =>
                      setNewConfig((prev) => ({
                        ...prev,
                        bobot_pas: e.target.value,
                      }))
                    }
                    className="px-3 py-2 border rounded"
                  />
                </div>
                <button
                  onClick={() => handleSaveConfig(newConfig)}
                  className="mt-3 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center space-x-2">
                  <Plus size={18} />
                  <span>Tambah</span>
                </button>
              </div>

              {/* Config Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Mata Pelajaran</th>
                      <th className="px-4 py-2 text-left">KKM</th>
                      <th className="px-4 py-2 text-left">Bobot NH</th>
                      <th className="px-4 py-2 text-left">Bobot PTS</th>
                      <th className="px-4 py-2 text-left">Bobot PAS</th>
                      <th className="px-4 py-2 text-left">Total</th>
                      <th className="px-4 py-2 text-left">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {configs.map((config) => {
                      const total =
                        parseFloat(config.bobot_nh) +
                        parseFloat(config.bobot_pts) +
                        parseFloat(config.bobot_pas);
                      const isValid = total === 100;

                      return editingConfig?.id === config.id ? (
                        <tr key={config.id} className="border-b bg-blue-50">
                          <td className="px-4 py-2">{config.mata_pelajaran}</td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={editingConfig.kkm}
                              onChange={(e) =>
                                setEditingConfig((prev) => ({
                                  ...prev,
                                  kkm: e.target.value,
                                }))
                              }
                              className="w-20 px-2 py-1 border rounded"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={editingConfig.bobot_nh}
                              onChange={(e) =>
                                setEditingConfig((prev) => ({
                                  ...prev,
                                  bobot_nh: e.target.value,
                                }))
                              }
                              className="w-20 px-2 py-1 border rounded"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={editingConfig.bobot_pts}
                              onChange={(e) =>
                                setEditingConfig((prev) => ({
                                  ...prev,
                                  bobot_pts: e.target.value,
                                }))
                              }
                              className="w-20 px-2 py-1 border rounded"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={editingConfig.bobot_pas}
                              onChange={(e) =>
                                setEditingConfig((prev) => ({
                                  ...prev,
                                  bobot_pas: e.target.value,
                                }))
                              }
                              className="w-20 px-2 py-1 border rounded"
                            />
                          </td>
                          <td className="px-4 py-2">
                            {parseFloat(editingConfig.bobot_nh) +
                              parseFloat(editingConfig.bobot_pts) +
                              parseFloat(editingConfig.bobot_pas)}
                            %
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleSaveConfig(editingConfig)}
                                className="text-green-600 hover:text-green-800">
                                <Save size={18} />
                              </button>
                              <button
                                onClick={() => setEditingConfig(null)}
                                className="text-gray-600 hover:text-gray-800">
                                ✕
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr
                          key={config.id}
                          className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2">{config.mata_pelajaran}</td>
                          <td className="px-4 py-2">{config.kkm}</td>
                          <td className="px-4 py-2">{config.bobot_nh}%</td>
                          <td className="px-4 py-2">{config.bobot_pts}%</td>
                          <td className="px-4 py-2">{config.bobot_pas}%</td>
                          <td className="px-4 py-2">
                            <span
                              className={
                                isValid
                                  ? "text-green-600"
                                  : "text-red-600 font-medium"
                              }>
                              {total}%{" "}
                              {!isValid && (
                                <AlertCircle size={16} className="inline" />
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setEditingConfig(config)}
                                className="text-blue-600 hover:text-blue-800">
                                <Edit2 size={18} />
                              </button>
                              <button
                                onClick={() => handleDeleteConfig(config.id)}
                                className="text-red-600 hover:text-red-800">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "metadata" && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Metadata Raport</h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Tahun Ajaran
              </label>
              <select
                value={selectedAcademicYear}
                onChange={(e) => setSelectedAcademicYear(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg">
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>
                    {ay.year}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Semester</label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg">
                <option value="Ganjil">Ganjil</option>
                <option value="Genap">Genap</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Tanggal Raport *
                </label>
                <input
                  type="date"
                  value={metadata.tanggal_raport}
                  onChange={(e) =>
                    setMetadata((prev) => ({
                      ...prev,
                      tanggal_raport: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Tempat *
                </label>
                <input
                  type="text"
                  value={metadata.tempat}
                  onChange={(e) =>
                    setMetadata((prev) => ({ ...prev, tempat: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Bandung"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Nama Kepala Sekolah *
                </label>
                <input
                  type="text"
                  value={metadata.nama_kepala_sekolah}
                  onChange={(e) =>
                    setMetadata((prev) => ({
                      ...prev,
                      nama_kepala_sekolah: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Drs. Ahmad Subarjo, M.Pd"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  NIP Kepala Sekolah
                </label>
                <input
                  type="text"
                  value={metadata.nip_kepala_sekolah}
                  onChange={(e) =>
                    setMetadata((prev) => ({
                      ...prev,
                      nip_kepala_sekolah: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="196512101990031005"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Tanda Tangan Digital (Opsional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full px-3 py-2 border rounded-lg"
              />
              {metadata.ttd_kepala_sekolah && (
                <div className="mt-2">
                  <img
                    src={metadata.ttd_kepala_sekolah}
                    alt="TTD"
                    className="h-24 border rounded"
                  />
                </div>
              )}
            </div>

            <button
              onClick={handleSaveMetadata}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center space-x-2">
              <Save size={18} />
              <span>Simpan Metadata</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
