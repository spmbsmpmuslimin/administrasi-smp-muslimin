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
  Settings,
} from "lucide-react";

export default function RaportConfig({ user, showToast, darkMode }) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("toggle");

  // Toggle State
  const [eraportSettings, setEraportSettings] = useState({
    is_active: false,
    active_period: "",
    message: "",
  });

  // KKM State - Tab KKM Jenjang (dari KKMConfig.js)
  const [semester, setSemester] = useState("1");
  const [academicYear, setAcademicYear] = useState(null);
  const [jenjang, setJenjang] = useState("");
  const [mapel, setMapel] = useState("");
  const [kkmValue, setKkmValue] = useState(75);
  const [mapelOptions, setMapelOptions] = useState([]);
  const [kkmList, setKkmList] = useState([]);
  const [loadingMapel, setLoadingMapel] = useState(false);
  const [saving, setSaving] = useState(false);

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

  // Daftar tetap
  const jenjangList = [7, 8, 9];
  const semesterOptions = [
    { value: "1", label: "Ganjil" },
    { value: "2", label: "Genap" },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedAcademicYear && selectedSemester) {
      fetchMetadata();
    }
  }, [selectedAcademicYear, selectedSemester]);

  // Load tahun ajaran aktif saat pertama kali (untuk tab KKM Jenjang)
  useEffect(() => {
    loadAcademicYear();
  }, []);

  // Load mapel options saat jenjang berubah (untuk tab KKM Jenjang)
  useEffect(() => {
    if (jenjang && academicYear) {
      loadMapelOptions();
    } else {
      setMapelOptions([]);
      setMapel("");
    }
  }, [jenjang, academicYear, semester]);

  // Load KKM data saat semua filter terisi (untuk tab KKM Jenjang)
  useEffect(() => {
    if (academicYear && jenjang && mapel && semester) {
      loadKKMData();
    } else {
      setKkmList([]);
    }
  }, [academicYear, jenjang, mapel, semester]);

  // ==================== FUNGSI UMUM ====================
  const fetchData = async () => {
    try {
      // Fetch E-Raport Settings
      const { data: settings } = await supabase
        .from("eraport_settings")
        .select("*")
        .single();

      if (settings) setEraportSettings(settings);

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
      showToast("Gagal memuat data", "error");
    } finally {
      setLoading(false);
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

  // ==================== FUNGSI KKM JENJANG (dari KKMConfig.js) ====================
  const loadAcademicYear = async () => {
    try {
      const { data, error } = await supabase
        .from("academic_years")
        .select("*")
        .eq("is_active", true)
        .single();

      if (error) throw error;
      setAcademicYear(data);
    } catch (error) {
      console.error("Error loading academic year:", error);
      showToast("Gagal memuat tahun ajaran", "error");
    }
  };

  const loadMapelOptions = async () => {
    if (!jenjang || !academicYear) return;

    try {
      setLoadingMapel(true);

      // Ambil mapel langsung dari nilai_eraport berdasarkan jenjang
      // Jenjang bisa didapat dari 2 digit pertama class_id (misal: 7F → jenjang 7)
      const { data, error } = await supabase
        .from("nilai_eraport")
        .select("mata_pelajaran, class_id")
        .eq("academic_year_id", academicYear.id)
        .eq("semester", semester);

      if (error) throw error;

      // Filter hanya class_id yang sesuai jenjang (misal: jenjang 7 → 7A, 7B, 7C, dll)
      const filteredData =
        data?.filter((item) => {
          const classJenjang = item.class_id?.charAt(0);
          return classJenjang === jenjang.toString();
        }) || [];

      // Ambil unique mata pelajaran
      const uniqueMapel = [
        ...new Set(filteredData.map((item) => item.mata_pelajaran)),
      ];

      const sortedMapel = uniqueMapel.sort();
      setMapelOptions(sortedMapel);

      console.log("✅ Mapel loaded:", sortedMapel);
    } catch (error) {
      console.error("Error loading mapel options:", error);
      showToast("Gagal memuat daftar mapel", "error");
      setMapelOptions([]);
    } finally {
      setLoadingMapel(false);
    }
  };

  const loadKKMData = async () => {
    if (!academicYear || !jenjang || !mapel || !semester) return;

    try {
      const { data, error } = await supabase
        .from("raport_config")
        .select("*")
        .eq("academic_year_id", academicYear.id)
        .eq("semester", parseInt(semester))
        .eq("jenjang", parseInt(jenjang))
        .eq("mata_pelajaran", mapel)
        .eq("is_jenjang_default", true)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      console.log("📊 KKM data loaded:", data);
      setKkmList(data || []);

      if (data?.length > 0) {
        setKkmValue(parseFloat(data[0].kkm));
      } else {
        setKkmValue(75);
      }
    } catch (error) {
      console.error("❌ Error loading KKM:", error);
      showToast("Gagal memuat data KKM", "error");
    }
  };

  const handleSaveKKMJenjang = async () => {
    if (!academicYear || !jenjang || !mapel || !semester) {
      showToast("Harap lengkapi semua filter", "warning");
      return;
    }

    if (kkmValue < 0 || kkmValue > 100) {
      showToast("KKM harus antara 0-100", "warning");
      return;
    }

    try {
      setSaving(true);

      // Cek apakah sudah ada data
      const { data: existing, error: checkError } = await supabase
        .from("raport_config")
        .select("id")
        .eq("academic_year_id", academicYear.id)
        .eq("semester", parseInt(semester))
        .eq("jenjang", parseInt(jenjang))
        .eq("mata_pelajaran", mapel)
        .eq("is_jenjang_default", true)
        .maybeSingle();

      if (checkError) {
        console.error("❌ Error checking existing:", checkError);
        throw checkError;
      }

      let result;

      if (existing) {
        // Update data yang sudah ada
        result = await supabase
          .from("raport_config")
          .update({
            kkm: parseFloat(kkmValue),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select();

        if (result.error) throw result.error;
        console.log("✅ Update result:", result);
        showToast("✅ KKM berhasil diperbarui", "success");
      } else {
        // Insert data baru - class_id bisa null untuk KKM jenjang
        result = await supabase
          .from("raport_config")
          .insert([
            {
              class_id: null, // KKM jenjang ga perlu class_id spesifik
              academic_year_id: academicYear.id,
              semester: parseInt(semester),
              jenjang: parseInt(jenjang),
              mata_pelajaran: mapel,
              kkm: parseFloat(kkmValue),
              is_jenjang_default: true,
            },
          ])
          .select();

        if (result.error) throw result.error;
        console.log("✅ Insert result:", result);
        showToast("✅ KKM berhasil disimpan", "success");
      }

      await loadKKMData();
    } catch (error) {
      console.error("❌ Error saving KKM:", error);
      showToast(`❌ Gagal menyimpan KKM: ${error.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKKMJenjang = async (id) => {
    if (!window.confirm("Yakin hapus KKM ini?")) return;

    try {
      const { error } = await supabase
        .from("raport_config")
        .delete()
        .eq("id", id);

      if (error) throw error;

      const updatedList = kkmList.filter((item) => item.id !== id);
      setKkmList(updatedList);

      if (updatedList.length === 0) {
        setKkmValue(75);
      }

      showToast("✅ KKM berhasil dihapus", "success");
    } catch (error) {
      console.error("Error deleting KKM:", error);
      showToast("❌ Gagal menghapus KKM", "error");
    }
  };

  // ==================== FUNGSI UMUM LAINNYA ====================
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
      showToast("Gagal mengubah status E-Raport", "error");
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
      showToast("Gagal menyimpan pesan", "error");
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
        const { error } = await supabase
          .from("raport_metadata")
          .update({
            ...metadata,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
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

  const handleResetKKMJenjang = () => {
    setJenjang("");
    setMapel("");
    setMapelOptions([]);
    setKkmList([]);
    setKkmValue(75);
  };

  // ==================== RENDER ====================
  if (loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          darkMode ? "bg-gray-900" : "bg-gray-50"
        }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className={`mt-3 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
            Memuat data...
          </p>
        </div>
      </div>
    );
  }

  const bgColor = darkMode ? "bg-gray-800" : "bg-white";
  const textColor = darkMode ? "text-white" : "text-gray-900";
  const textSecondary = darkMode ? "text-gray-400" : "text-gray-600";
  const borderColor = darkMode ? "border-gray-700" : "border-gray-200";
  const inputBg = darkMode ? "bg-gray-700 border-gray-600" : "";

  return (
    <div
      className={`min-h-screen p-4 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-white">
          Konfigurasi E-Raport
        </h1>

        {/* Tabs */}
        <div className={`flex space-x-2 mb-6 border-b ${borderColor}`}>
          <button
            onClick={() => setActiveTab("toggle")}
            className={`px-4 py-2 font-medium ${
              activeTab === "toggle"
                ? "border-b-2 border-blue-500 text-blue-600"
                : textSecondary
            }`}>
            🔧 Status E-Raport
          </button>
          <button
            onClick={() => setActiveTab("kkm-jenjang")}
            className={`px-4 py-2 font-medium ${
              activeTab === "kkm-jenjang"
                ? "border-b-2 border-blue-500 text-blue-600"
                : textSecondary
            }`}>
            🎯 KKM Per Jenjang
          </button>
          <button
            onClick={() => setActiveTab("metadata")}
            className={`px-4 py-2 font-medium ${
              activeTab === "metadata"
                ? "border-b-2 border-blue-500 text-blue-600"
                : textSecondary
            }`}>
            📝 Metadata Raport
          </button>
        </div>

        {/* Tab Content */}
        <div className={`${bgColor} rounded-lg shadow p-6`}>
          {activeTab === "toggle" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">
                    Status Fitur E-Raport
                  </h2>
                  <p className={textSecondary}>
                    Aktifkan fitur ini saat periode input nilai raport
                  </p>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex flex-col items-end">
                    <div className="text-sm font-medium mb-1">
                      {eraportSettings.is_active ? "Aktif" : "Nonaktif"}
                    </div>
                    <div className={`text-xs ${textSecondary}`}>
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
                    className={`w-full px-3 py-2 border rounded-lg ${inputBg}`}
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
                    className={`w-full px-3 py-2 border rounded-lg ${inputBg}`}
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

          {activeTab === "kkm-jenjang" && (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                Kelola KKM Per Jenjang
              </h2>
              <p className={`mb-6 ${textSecondary}`}>
                KKM akan berlaku untuk semua kelas paralel dalam jenjang yang
                sama
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${textColor}`}>
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

                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${textColor}`}>
                    Semester
                  </label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className={`w-full p-3 rounded-lg border ${inputBg}`}>
                    {semesterOptions.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${textColor}`}>
                    Jenjang Kelas
                  </label>
                  <select
                    value={jenjang}
                    onChange={(e) => setJenjang(e.target.value)}
                    className={`w-full p-3 rounded-lg border ${inputBg}`}>
                    <option value="">Pilih Jenjang</option>
                    {jenjangList.map((j) => (
                      <option key={j} value={j}>
                        Kelas {j}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${textColor}`}>
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
                    className={`w-full p-3 rounded-lg border ${inputBg} ${
                      !jenjang ? "opacity-50 cursor-not-allowed" : ""
                    }`}>
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
                      <p
                        className={`text-sm mt-2 ${
                          darkMode ? "text-blue-300" : "text-blue-700"
                        }`}>
                        Berlaku untuk semua kelas {jenjang}A sampai {jenjang}F
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium">Nilai KKM:</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={kkmValue}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          if (val >= 0 && val <= 100) {
                            setKkmValue(val);
                          }
                        }}
                        className={`w-24 px-3 py-2 border rounded-lg text-center text-lg font-bold ${inputBg}`}
                        placeholder="0-100"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleSaveKKMJenjang}
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
                  onClick={handleResetKKMJenjang}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-gray-500 hover:bg-gray-600 text-white transition-colors">
                  Reset Filter
                </button>
              </div>

              {kkmList.length > 0 && (
                <div className="mt-8">
                  <h3 className={`text-lg font-semibold mb-4 ${textColor}`}>
                    Riwayat KKM
                  </h3>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="min-w-full">
                      <thead
                        className={darkMode ? "bg-gray-700" : "bg-gray-100"}>
                        <tr>
                          <th className="p-3 text-left text-sm font-medium">
                            No
                          </th>
                          <th className="p-3 text-left text-sm font-medium">
                            Mapel
                          </th>
                          <th className="p-3 text-left text-sm font-medium">
                            Jenjang
                          </th>
                          <th className="p-3 text-left text-sm font-medium">
                            Semester
                          </th>
                          <th className="p-3 text-left text-sm font-medium">
                            KKM
                          </th>
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
                                onClick={() => handleDeleteKKMJenjang(item.id)}
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
            </div>
          )}

          {activeTab === "metadata" && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Metadata Raport</h2>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tahun Ajaran
                  </label>
                  <select
                    value={selectedAcademicYear}
                    onChange={(e) => setSelectedAcademicYear(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg ${inputBg}`}>
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        {ay.year}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Semester
                  </label>
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg ${inputBg}`}>
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
                      className={`w-full px-3 py-2 border rounded-lg ${inputBg}`}
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
                        setMetadata((prev) => ({
                          ...prev,
                          tempat: e.target.value,
                        }))
                      }
                      className={`w-full px-3 py-2 border rounded-lg ${inputBg}`}
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
                      className={`w-full px-3 py-2 border rounded-lg ${inputBg}`}
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
                      className={`w-full px-3 py-2 border rounded-lg ${inputBg}`}
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
                    className={`w-full px-3 py-2 border rounded-lg ${inputBg}`}
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
      </div>
    </div>
  );
}
