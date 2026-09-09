import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import {
  Building2,
  MapPin,
  Phone,
  Calendar,
  Edit3,
  Save,
  Upload,
  X,
  RotateCcw,
  Mail,
  Globe,
  AlertTriangle,
  Check,
  Layers,
  Wallet,
  Wrench,
  Plus,
  Trash2,
  ShieldCheck,
} from "lucide-react";

const SchoolSettingsTab = ({ user, loading, setLoading, showToast }) => {
  const [schoolSettings, setSchoolSettings] = useState({
    school_name: "SMP Muslimin Cililin",
    school_level: "SMP",
    school_address: "Jl. Raya Cililin No. 123, Cililin, Bandung Barat",
    school_phone: "022-1234567",
    school_email: "smp.muslimin.cililin@email.com",
    school_website: "https://smp-muslimin-cililin.sch.id",
    current_academic_year: "2024/2025",
    semester: "Ganjil",
    school_logo: null,
    max_students_per_class: "45",
    npsn: "20240001",
    grades: ["7", "8", "9"],
    spp_nominal_per_ta: {},
    maintenance_mode: false,
    maintenance_message: "Aplikasi Sedang Dalam Maintenance. Kami Akan Kembali Segera!",
    maintenance_whitelist: [],
  });

  const [editingSchoolSettings, setEditingSchoolSettings] = useState(false);
  const [tempSchoolSettings, setTempSchoolSettings] = useState({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageValidation, setImageValidation] = useState({
    isValid: true,
    message: "",
  });

  // State bantu untuk form tambah data SPP & whitelist maintenance
  const [newSppYear, setNewSppYear] = useState("");
  const [newSppNominal, setNewSppNominal] = useState("");
  const [newWhitelistUsername, setNewWhitelistUsername] = useState("");
  const [newWhitelistFullName, setNewWhitelistFullName] = useState("");

  const ALL_GRADE_OPTIONS = ["7", "8", "9", "10", "11", "12"];

  // ✅ AUTO-DETECTION SEMESTER
  const getExpectedSemester = () => {
    const month = new Date().getMonth() + 1; // 1-12

    // Juli (7) - Desember (12) = GANJIL
    if (month >= 7 && month <= 12) {
      return "Ganjil";
    }
    // Januari (1) - Juni (6) = GENAP
    else {
      return "Genap";
    }
  };

  const getCurrentMonthName = () => {
    const months = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    return months[new Date().getMonth()];
  };

  const getCurrentYear = () => {
    return new Date().getFullYear();
  };

  // Cek apakah semester match dengan bulan sekarang
  const isSemesterMismatch = () => {
    return schoolSettings.semester !== getExpectedSemester();
  };

  useEffect(() => {
    loadSchoolSettings();
  }, []);

  const loadSchoolSettings = async () => {
    try {
      setLoading(true);

      const { data: settingsData, error } = await supabase
        .from("school_settings")
        .select("setting_key, setting_value");

      if (error) throw error;

      if (settingsData && settingsData.length > 0) {
        const settings = {};
        const jsonKeys = ["grades", "spp_nominal_per_ta", "maintenance_whitelist"];

        settingsData.forEach((item) => {
          let value = item.setting_value;

          if (jsonKeys.includes(item.setting_key)) {
            try {
              value = JSON.parse(value);
            } catch (e) {
              value = item.setting_key === "spp_nominal_per_ta" ? {} : [];
            }
          } else if (item.setting_key === "maintenance_mode") {
            value = value === true || value === "true";
          }

          settings[item.setting_key] = value;
        });
        setSchoolSettings((prev) => ({ ...prev, ...settings }));
      }
    } catch (error) {
      console.error("Error loading school settings:", error);
      showToast("Error memuat pengaturan sekolah", "error");
    } finally {
      setLoading(false);
    }
  };

  // ✅ QUICK UPDATE SEMESTER
  const quickUpdateSemester = async () => {
    try {
      setLoading(true);
      const newSemester = getExpectedSemester();

      const { error } = await supabase.from("school_settings").upsert(
        {
          setting_key: "semester",
          setting_value: newSemester,
        },
        { onConflict: "setting_key" }
      );

      if (error) throw error;

      setSchoolSettings((prev) => ({ ...prev, semester: newSemester }));
      showToast(`Semester berhasil diupdate ke "${newSemester}"!`, "success");
    } catch (error) {
      console.error("Error updating semester:", error);
      showToast("Error mengupdate semester", "error");
    } finally {
      setLoading(false);
    }
  };

  // Enhanced Image Compression Function
  const compressImage = (file, options = {}) => {
    return new Promise((resolve, reject) => {
      const { maxWidth = 800, maxHeight = 800, quality = 0.7 } = options;

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Canvas to Blob conversion failed"));
            }
          },
          "image/jpeg",
          quality
        );
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(file);
    });
  };

  const validateImageFile = (file) => {
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const maxSize = 2 * 1024 * 1024; // 2MB

    if (!validTypes.includes(file.type)) {
      return {
        isValid: false,
        message: "Format file harus JPG, PNG, atau WebP",
      };
    }

    if (file.size > maxSize) {
      return {
        isValid: false,
        message: "Ukuran file maksimal 2MB",
      };
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        if (img.width < 100 || img.height < 100) {
          resolve({
            isValid: false,
            message: "Resolusi gambar minimal 100x100px",
          });
        } else if (img.width > 4000 || img.height > 4000) {
          resolve({
            isValid: false,
            message: "Resolusi gambar maksimal 4000x4000px",
          });
        } else {
          resolve({ isValid: true, message: "" });
        }
      };
      img.onerror = () =>
        resolve({
          isValid: false,
          message: "Gagal memuat gambar",
        });
      img.src = URL.createObjectURL(file);
    });
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      setUploadProgress(0);
      setImageValidation({ isValid: true, message: "" });

      const validation = await validateImageFile(file);
      if (!validation.isValid) {
        setImageValidation(validation);
        showToast(validation.message, "error");
        return;
      }

      setUploadProgress(30);

      const compressedBlob = await compressImage(file, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.7,
      });

      setUploadProgress(70);

      const base64String = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(compressedBlob);
        reader.onload = () => resolve(reader.result);
      });

      setUploadProgress(100);

      setTempSchoolSettings((prev) => ({
        ...prev,
        school_logo: base64String,
      }));

      const sizeReduction = (((file.size - compressedBlob.size) / file.size) * 100).toFixed(1);
      showToast(`Logo berhasil diupload! (${sizeReduction}% lebih kecil)`, "success");
    } catch (error) {
      console.error("Error uploading logo:", error);
      showToast("Error uploading logo", "error");
    } finally {
      setLoading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  const removeLogo = () => {
    setTempSchoolSettings((prev) => ({
      ...prev,
      school_logo: null,
    }));
    setImageValidation({ isValid: true, message: "" });
    showToast("Logo dihapus dari form", "info");
  };

  const validateForm = () => {
    const errors = [];

    if (!tempSchoolSettings.school_name?.trim()) {
      errors.push("Nama sekolah wajib diisi");
    }

    if (!tempSchoolSettings.school_address?.trim()) {
      errors.push("Alamat sekolah wajib diisi");
    }

    if (!tempSchoolSettings.current_academic_year?.trim()) {
      errors.push("Tahun ajaran wajib diisi");
    }

    const yearRegex = /^\d{4}\/\d{4}$/;
    if (
      tempSchoolSettings.current_academic_year &&
      !yearRegex.test(tempSchoolSettings.current_academic_year)
    ) {
      errors.push("Format tahun ajaran harus: YYYY/YYYY (contoh: 2024/2025)");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (tempSchoolSettings.school_email && !emailRegex.test(tempSchoolSettings.school_email)) {
      errors.push("Format email tidak valid");
    }

    const urlRegex = /^https?:\/\/.+\..+$/;
    if (tempSchoolSettings.school_website && !urlRegex.test(tempSchoolSettings.school_website)) {
      errors.push("Format website harus dimulai dengan http:// atau https://");
    }

    const npsnRegex = /^\d{8}$/;
    if (tempSchoolSettings.npsn && !npsnRegex.test(tempSchoolSettings.npsn)) {
      errors.push("NPSN harus terdiri dari 8 digit angka");
    }

    return errors;
  };

  const updateSchoolSettings = async () => {
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      validationErrors.forEach((error) => showToast(error, "error"));
      return;
    }

    try {
      setLoading(true);

      const jsonKeys = ["grades", "spp_nominal_per_ta", "maintenance_whitelist"];

      const updatePromises = Object.entries(tempSchoolSettings).map(([key, value]) => {
        let storedValue = value;
        if (jsonKeys.includes(key)) {
          storedValue = JSON.stringify(value);
        } else if (key === "maintenance_mode") {
          storedValue = value ? "true" : "false";
        }

        return supabase
          .from("school_settings")
          .upsert({ setting_key: key, setting_value: storedValue }, { onConflict: "setting_key" });
      });

      const results = await Promise.all(updatePromises);
      const hasError = results.some((result) => result.error);

      if (hasError) {
        throw new Error("Failed to update some settings");
      }

      setSchoolSettings((prev) => ({ ...prev, ...tempSchoolSettings }));
      setEditingSchoolSettings(false);
      setTempSchoolSettings({});
      setImageValidation({ isValid: true, message: "" });

      showToast("Pengaturan sekolah berhasil disimpan!", "success");
    } catch (error) {
      console.error("Error updating school settings:", error);
      showToast("Error menyimpan pengaturan sekolah", "error");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTempSchoolSettings({ ...schoolSettings });
    setImageValidation({ isValid: true, message: "" });
    showToast("Form telah direset ke nilai semula", "info");
  };

  // ✅ TINGKATAN KELAS (grades)
  const toggleGrade = (grade) => {
    setTempSchoolSettings((prev) => {
      const current = prev.grades || [];
      const updated = current.includes(grade)
        ? current.filter((g) => g !== grade)
        : [...current, grade].sort();
      return { ...prev, grades: updated };
    });
  };

  // ✅ NOMINAL SPP PER TAHUN AJARAN
  const addOrUpdateSppNominal = () => {
    if (!newSppYear.trim() || !newSppNominal) {
      showToast("Tahun ajaran dan nominal SPP wajib diisi", "error");
      return;
    }

    const yearRegex = /^\d{4}\/\d{4}$/;
    if (!yearRegex.test(newSppYear.trim())) {
      showToast("Format tahun ajaran harus: YYYY/YYYY (contoh: 2026/2027)", "error");
      return;
    }

    setTempSchoolSettings((prev) => ({
      ...prev,
      spp_nominal_per_ta: {
        ...(prev.spp_nominal_per_ta || {}),
        [newSppYear.trim()]: Number(newSppNominal),
      },
    }));
    setNewSppYear("");
    setNewSppNominal("");
  };

  const removeSppNominal = (year) => {
    setTempSchoolSettings((prev) => {
      const updated = { ...(prev.spp_nominal_per_ta || {}) };
      delete updated[year];
      return { ...prev, spp_nominal_per_ta: updated };
    });
  };

  // ✅ MODE MAINTENANCE
  const toggleMaintenanceMode = () => {
    setTempSchoolSettings((prev) => ({
      ...prev,
      maintenance_mode: !prev.maintenance_mode,
    }));
  };

  const addWhitelistUser = () => {
    if (!newWhitelistUsername.trim() || !newWhitelistFullName.trim()) {
      showToast("Username dan nama lengkap wajib diisi", "error");
      return;
    }

    setTempSchoolSettings((prev) => ({
      ...prev,
      maintenance_whitelist: [
        ...(prev.maintenance_whitelist || []),
        {
          id: crypto.randomUUID(),
          username: newWhitelistUsername.trim(),
          full_name: newWhitelistFullName.trim(),
        },
      ],
    }));
    setNewWhitelistUsername("");
    setNewWhitelistFullName("");
  };

  const removeWhitelistUser = (id) => {
    setTempSchoolSettings((prev) => ({
      ...prev,
      maintenance_whitelist: (prev.maintenance_whitelist || []).filter((u) => u.id !== id),
    }));
  };

  const formatRupiah = (value) => {
    if (value === undefined || value === null || value === "") return "-";
    return `Rp ${Number(value).toLocaleString("id-ID")}`;
  };

  // ── Style tokens (biar konsisten di semua section, ga acak-acakan) ──
  const cardClass =
    "bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 sm:p-6";
  const sectionTitleClass =
    "text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2.5";
  const labelClass = "block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5";
  const inputClass =
    "w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-900/40 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors min-h-[42px]";
  const displayClass =
    "w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white min-h-[42px] flex items-center";
  const iconBadge = (colorClasses) =>
    `w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClasses}`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Pengaturan Sekolah
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Kelola informasi dan identitas {schoolSettings.school_name}
            </p>
          </div>
          {!editingSchoolSettings && (
            <button
              onClick={() => {
                setEditingSchoolSettings(true);
                setTempSchoolSettings({ ...schoolSettings });
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors w-full sm:w-auto min-h-[44px] touch-manipulation active:scale-[0.98]"
            >
              <Edit3 size={16} />
              Edit Pengaturan
            </button>
          )}
        </div>

        {/* ── Semester mismatch alert ── */}
        {!editingSchoolSettings && isSemesterMismatch() && (
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5"
                size={20}
              />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
                  Semester mungkin perlu diupdate
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  Sekarang{" "}
                  <strong>
                    {getCurrentMonthName()} {getCurrentYear()}
                  </strong>
                  , semester seharusnya <strong>"{getExpectedSemester()}"</strong>. Semester aktif
                  saat ini:{" "}
                  <strong className="text-red-600 dark:text-red-400">
                    "{schoolSettings.semester}"
                  </strong>
                  .
                </p>
                <button
                  onClick={quickUpdateSemester}
                  disabled={loading}
                  className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors min-h-[40px] touch-manipulation active:scale-[0.98]"
                >
                  <Check size={15} />
                  {loading ? "Updating..." : `Update ke "${getExpectedSemester()}" sekarang`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Hero: Identitas & Logo Sekolah ── */}
        <div className={cardClass}>
          <h3 className={sectionTitleClass}>
            <div
              className={iconBadge(
                "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
              )}
            >
              <Building2 size={18} />
            </div>
            Identitas Sekolah
          </h3>

          <div className="flex flex-col sm:flex-row gap-6">
            {/* Logo */}
            <div className="sm:w-44 flex-shrink-0">
              {editingSchoolSettings ? (
                <div className="space-y-3">
                  {tempSchoolSettings.school_logo || schoolSettings.school_logo ? (
                    <div className="relative">
                      <img
                        src={tempSchoolSettings.school_logo || schoolSettings.school_logo}
                        alt="Preview Logo"
                        className="w-full aspect-square object-contain border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900/30 p-3"
                      />
                      <button
                        onClick={removeLogo}
                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-sm transition-colors touch-manipulation active:scale-90"
                        title="Hapus logo"
                        aria-label="Hapus logo"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label
                      className={`flex flex-col items-center justify-center w-full aspect-square border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                        loading
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:border-blue-400 dark:hover:border-blue-500 border-gray-300 dark:border-gray-600"
                      } bg-gray-50 dark:bg-gray-900/30 touch-manipulation`}
                    >
                      <Upload className="w-7 h-7 text-gray-400 dark:text-gray-500 mb-2" />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center px-2">
                        Klik untuk upload
                      </span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        onChange={handleLogoUpload}
                        className="hidden"
                        disabled={loading}
                      />
                    </label>
                  )}

                  {uploadProgress > 0 && (
                    <div className="space-y-1">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 text-center">
                        Mengupload... {uploadProgress}%
                      </p>
                    </div>
                  )}

                  {!imageValidation.isValid && (
                    <p className="text-xs font-medium text-red-600 dark:text-red-400">
                      {imageValidation.message}
                    </p>
                  )}

                  <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">
                    JPG/PNG/WebP, maks 2MB. Otomatis dikompresi.
                  </p>
                </div>
              ) : (
                <div className="w-full aspect-square flex items-center justify-center bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-xl">
                  {schoolSettings.school_logo ? (
                    <img
                      src={schoolSettings.school_logo}
                      alt="School Logo"
                      className="w-full h-full object-contain p-3"
                    />
                  ) : (
                    <div className="text-center">
                      <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center text-white mx-auto mb-2">
                        <span className="text-2xl">🏫</span>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500">Logo belum diset</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Identity fields */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelClass}>Nama Sekolah *</label>
                {editingSchoolSettings ? (
                  <input
                    type="text"
                    value={tempSchoolSettings.school_name || ""}
                    onChange={(e) =>
                      setTempSchoolSettings((prev) => ({ ...prev, school_name: e.target.value }))
                    }
                    className={inputClass}
                    placeholder="Masukkan nama sekolah"
                  />
                ) : (
                  <div className={`${displayClass} font-semibold`}>
                    {schoolSettings.school_name}
                  </div>
                )}
              </div>

              <div>
                <label className={labelClass}>Tingkat Sekolah *</label>
                <div className="px-3.5 py-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg font-semibold text-blue-700 dark:text-blue-300 min-h-[42px] flex items-center text-sm">
                  {schoolSettings.school_level}
                </div>
              </div>

              <div>
                <label className={labelClass}>NPSN *</label>
                {editingSchoolSettings ? (
                  <input
                    type="text"
                    value={tempSchoolSettings.npsn || ""}
                    onChange={(e) =>
                      setTempSchoolSettings((prev) => ({ ...prev, npsn: e.target.value }))
                    }
                    className={inputClass}
                    placeholder="8 digit NPSN"
                    maxLength="8"
                  />
                ) : (
                  <div className={displayClass}>{schoolSettings.npsn}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Akademik & Kontak (2 kolom) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Akademik */}
          <div className={`${cardClass} h-full flex flex-col`}>
            <h3 className={sectionTitleClass}>
              <div
                className={iconBadge(
                  "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
                )}
              >
                <Calendar size={18} />
              </div>
              Tahun Ajaran &amp; Akademik
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Tahun Ajaran Aktif *</label>
                {editingSchoolSettings ? (
                  <>
                    <input
                      type="text"
                      value={tempSchoolSettings.current_academic_year || ""}
                      onChange={(e) =>
                        setTempSchoolSettings((prev) => ({
                          ...prev,
                          current_academic_year: e.target.value,
                        }))
                      }
                      placeholder="2024/2025"
                      className={inputClass}
                    />
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                      Format: YYYY/YYYY
                    </p>
                  </>
                ) : (
                  <div className="px-3.5 py-2.5 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg font-semibold text-purple-700 dark:text-purple-300 min-h-[42px] flex items-center text-sm">
                    {schoolSettings.current_academic_year}
                  </div>
                )}
              </div>

              <div>
                <label className={labelClass}>Semester Aktif</label>
                {editingSchoolSettings ? (
                  <select
                    value={tempSchoolSettings.semester || ""}
                    onChange={(e) =>
                      setTempSchoolSettings((prev) => ({ ...prev, semester: e.target.value }))
                    }
                    className={inputClass}
                  >
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                ) : (
                  <div className={displayClass}>{schoolSettings.semester}</div>
                )}
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                  Jul–Des: Ganjil · Jan–Jun: Genap
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>Maks. Siswa per Kelas</label>
                {editingSchoolSettings ? (
                  <input
                    type="number"
                    value={tempSchoolSettings.max_students_per_class || ""}
                    onChange={(e) =>
                      setTempSchoolSettings((prev) => ({
                        ...prev,
                        max_students_per_class: e.target.value,
                      }))
                    }
                    className={inputClass}
                    placeholder="36"
                    min="20"
                    max="40"
                  />
                ) : (
                  <div className={displayClass}>{schoolSettings.max_students_per_class} siswa</div>
                )}
              </div>
            </div>

            {/* Tingkatan Kelas sub-section */}
            <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
              <label className={`${labelClass} flex items-center gap-2`}>
                <Layers size={14} /> Tingkatan Kelas
              </label>
              {editingSchoolSettings ? (
                <div className="flex flex-wrap gap-2">
                  {ALL_GRADE_OPTIONS.map((grade) => {
                    const active = (tempSchoolSettings.grades || []).includes(grade);
                    return (
                      <button
                        key={grade}
                        type="button"
                        onClick={() => toggleGrade(grade)}
                        className={`px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors min-h-[40px] touch-manipulation active:scale-[0.98] ${
                          active
                            ? "bg-purple-600 text-white border-purple-600"
                            : "bg-white dark:bg-gray-900/30 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-purple-400"
                        }`}
                      >
                        Kelas {grade}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(schoolSettings.grades || []).length > 0 ? (
                    schoolSettings.grades.map((grade) => (
                      <span
                        key={grade}
                        className="px-3.5 py-1.5 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg text-sm font-medium text-purple-700 dark:text-purple-300"
                      >
                        Kelas {grade}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500">Belum diset</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Kontak & Lokasi */}
          <div className={`${cardClass} h-full flex flex-col`}>
            <h3 className={sectionTitleClass}>
              <div
                className={iconBadge(
                  "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                )}
              >
                <Phone size={18} />
              </div>
              Kontak &amp; Lokasi
            </h3>

            <div className="space-y-4">
              <div>
                <label className={`${labelClass} flex items-center gap-1.5`}>
                  <MapPin size={13} /> Alamat Sekolah *
                </label>
                {editingSchoolSettings ? (
                  <textarea
                    value={tempSchoolSettings.school_address || ""}
                    onChange={(e) =>
                      setTempSchoolSettings((prev) => ({ ...prev, school_address: e.target.value }))
                    }
                    className={`${inputClass} resize-vertical min-h-[80px]`}
                    rows="3"
                    placeholder="Masukkan alamat lengkap sekolah"
                  />
                ) : (
                  <div className={`${displayClass} min-h-[80px] items-start py-3`}>
                    {schoolSettings.school_address}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Nomor Telepon</label>
                  {editingSchoolSettings ? (
                    <input
                      type="text"
                      value={tempSchoolSettings.school_phone || ""}
                      onChange={(e) =>
                        setTempSchoolSettings((prev) => ({ ...prev, school_phone: e.target.value }))
                      }
                      className={inputClass}
                      placeholder="Contoh: 022-1234567"
                    />
                  ) : (
                    <div className={displayClass}>{schoolSettings.school_phone || "-"}</div>
                  )}
                </div>

                <div>
                  <label className={`${labelClass} flex items-center gap-1.5`}>
                    <Mail size={13} /> Email Sekolah
                  </label>
                  {editingSchoolSettings ? (
                    <input
                      type="email"
                      value={tempSchoolSettings.school_email || ""}
                      onChange={(e) =>
                        setTempSchoolSettings((prev) => ({ ...prev, school_email: e.target.value }))
                      }
                      className={inputClass}
                      placeholder="email@sekolah.sch.id"
                    />
                  ) : (
                    <div className={displayClass}>{schoolSettings.school_email || "-"}</div>
                  )}
                </div>
              </div>

              <div>
                <label className={`${labelClass} flex items-center gap-1.5`}>
                  <Globe size={13} /> Website Sekolah
                </label>
                {editingSchoolSettings ? (
                  <input
                    type="url"
                    value={tempSchoolSettings.school_website || ""}
                    onChange={(e) =>
                      setTempSchoolSettings((prev) => ({ ...prev, school_website: e.target.value }))
                    }
                    className={inputClass}
                    placeholder="https://example.sch.id"
                  />
                ) : (
                  <div className={displayClass}>{schoolSettings.school_website || "-"}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── SPP Nominal ── */}
        <div className={cardClass}>
          <h3 className={sectionTitleClass}>
            <div
              className={iconBadge(
                "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
              )}
            >
              <Wallet size={18} />
            </div>
            Nominal SPP per Tahun Ajaran
          </h3>

          <div className="space-y-2 mb-4">
            {Object.entries(
              (editingSchoolSettings
                ? tempSchoolSettings.spp_nominal_per_ta
                : schoolSettings.spp_nominal_per_ta) || {}
            )
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([year, nominal]) => (
                <div
                  key={year}
                  className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <span className="font-medium text-gray-800 dark:text-white text-sm">{year}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400 text-sm">
                      {formatRupiah(nominal)}
                    </span>
                    {editingSchoolSettings && (
                      <button
                        type="button"
                        onClick={() => removeSppNominal(year)}
                        className="text-red-500 hover:text-red-700 p-1 touch-manipulation active:scale-90"
                        title="Hapus"
                        aria-label={`Hapus nominal SPP ${year}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            {Object.keys(
              (editingSchoolSettings
                ? tempSchoolSettings.spp_nominal_per_ta
                : schoolSettings.spp_nominal_per_ta) || {}
            ).length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Belum ada nominal SPP diset
              </p>
            )}
          </div>

          {editingSchoolSettings && (
            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
              <input
                type="text"
                value={newSppYear}
                onChange={(e) => setNewSppYear(e.target.value)}
                placeholder="2026/2027"
                className={`${inputClass} flex-1 mt-3`}
              />
              <input
                type="number"
                value={newSppNominal}
                onChange={(e) => setNewSppNominal(e.target.value)}
                placeholder="Nominal SPP (Rp)"
                className={`${inputClass} flex-1 mt-3`}
              />
              <button
                type="button"
                onClick={addOrUpdateSppNominal}
                className="flex items-center justify-center gap-2 px-5 py-2.5 mt-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors min-h-[42px] touch-manipulation active:scale-[0.98]"
              >
                <Plus size={16} />
                Tambah/Update
              </button>
            </div>
          )}
        </div>

        {/* ── Mode Maintenance — Danger Zone, sengaja di paling bawah ── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-red-100 dark:border-red-900/30 shadow-sm p-5 sm:p-6">
          <h3 className={sectionTitleClass}>
            <div
              className={iconBadge("bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400")}
            >
              <Wrench size={18} />
            </div>
            Mode Maintenance
            <span className="ml-auto text-[11px] font-medium uppercase tracking-wide text-red-400 dark:text-red-500">
              Zona Sensitif
            </span>
          </h3>

          <div className="space-y-5">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div>
                <p className="font-medium text-sm text-gray-800 dark:text-white">
                  Status Maintenance
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Jika aktif, hanya user di whitelist yang bisa mengakses aplikasi
                </p>
              </div>
              {editingSchoolSettings ? (
                <button
                  type="button"
                  onClick={toggleMaintenanceMode}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 touch-manipulation flex-shrink-0 ${
                    tempSchoolSettings.maintenance_mode
                      ? "bg-red-500"
                      : "bg-gray-300 dark:bg-gray-600"
                  }`}
                  aria-label="Toggle mode maintenance"
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      tempSchoolSettings.maintenance_mode ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              ) : (
                <span
                  className={`px-3 py-1 rounded-md text-xs font-bold flex-shrink-0 ${
                    schoolSettings.maintenance_mode
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  }`}
                >
                  {schoolSettings.maintenance_mode ? "AKTIF" : "NONAKTIF"}
                </span>
              )}
            </div>

            <div>
              <label className={labelClass}>Pesan Maintenance</label>
              {editingSchoolSettings ? (
                <textarea
                  value={tempSchoolSettings.maintenance_message || ""}
                  onChange={(e) =>
                    setTempSchoolSettings((prev) => ({
                      ...prev,
                      maintenance_message: e.target.value,
                    }))
                  }
                  className={`${inputClass} resize-vertical min-h-[76px]`}
                  rows="2"
                  placeholder="Pesan yang ditampilkan saat maintenance"
                />
              ) : (
                <div className={`${displayClass} min-h-[44px]`}>
                  {schoolSettings.maintenance_message || "-"}
                </div>
              )}
            </div>

            <div>
              <label className={`${labelClass} flex items-center gap-1.5`}>
                <ShieldCheck size={14} /> Whitelist Maintenance
              </label>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-2 -mt-1">
                Tetap bisa akses saat maintenance aktif
              </p>

              <div className="space-y-2 mb-3">
                {(
                  (editingSchoolSettings
                    ? tempSchoolSettings.maintenance_whitelist
                    : schoolSettings.maintenance_whitelist) || []
                ).map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-800 dark:text-white text-sm">
                        {u.full_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">@{u.username}</p>
                    </div>
                    {editingSchoolSettings && (
                      <button
                        type="button"
                        onClick={() => removeWhitelistUser(u.id)}
                        className="text-red-500 hover:text-red-700 p-1 touch-manipulation active:scale-90"
                        title="Hapus dari whitelist"
                        aria-label={`Hapus ${u.username} dari whitelist`}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                {(
                  (editingSchoolSettings
                    ? tempSchoolSettings.maintenance_whitelist
                    : schoolSettings.maintenance_whitelist) || []
                ).length === 0 && (
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Belum ada user di whitelist
                  </p>
                )}
              </div>

              {editingSchoolSettings && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={newWhitelistUsername}
                    onChange={(e) => setNewWhitelistUsername(e.target.value)}
                    placeholder="Username"
                    className={`${inputClass} flex-1`}
                  />
                  <input
                    type="text"
                    value={newWhitelistFullName}
                    onChange={(e) => setNewWhitelistFullName(e.target.value)}
                    placeholder="Nama Lengkap"
                    className={`${inputClass} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={addWhitelistUser}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors min-h-[42px] touch-manipulation active:scale-[0.98]"
                  >
                    <Plus size={16} />
                    Tambah
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Action bar (sticky di bawah, ngikutin lebar konten — bukan fixed ke viewport, jadi ga nabrak sidebar) ── */}
        {editingSchoolSettings && (
          <div className="sticky bottom-0 -mx-4 sm:-mx-6 lg:-mx-8 bg-white/95 dark:bg-gray-800/95 backdrop-blur border-t border-gray-200 dark:border-gray-700 p-4 z-20">
            <div className="flex flex-col sm:flex-row gap-3 px-4 sm:px-6 lg:px-8">
              <button
                onClick={updateSchoolSettings}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors min-h-[44px] touch-manipulation active:scale-[0.98] order-1"
              >
                <Save size={16} />
                {loading ? "Menyimpan..." : "Simpan Perubahan"}
              </button>

              <button
                onClick={resetForm}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium rounded-lg disabled:opacity-50 transition-colors min-h-[44px] touch-manipulation active:scale-[0.98] order-2"
              >
                <RotateCcw size={16} />
                Reset
              </button>

              <button
                onClick={() => {
                  setEditingSchoolSettings(false);
                  setTempSchoolSettings({});
                  setImageValidation({ isValid: true, message: "" });
                }}
                disabled={loading}
                className="px-6 py-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium rounded-lg disabled:opacity-50 transition-colors min-h-[44px] touch-manipulation active:scale-[0.98] order-3"
              >
                Batal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SchoolSettingsTab;
