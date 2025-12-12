import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  Building2,
  MapPin,
  Phone,
  Calendar,
  Image,
  Edit3,
  Save,
  Upload,
  X,
  RotateCcw,
  Mail,
  Globe,
  User,
  AlertTriangle,
  Check,
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
  });

  const [editingSchoolSettings, setEditingSchoolSettings] = useState(false);
  const [tempSchoolSettings, setTempSchoolSettings] = useState({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageValidation, setImageValidation] = useState({
    isValid: true,
    message: "",
  });

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
        settingsData.forEach((item) => {
          settings[item.setting_key] = item.setting_value;
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

      const sizeReduction = (
        ((file.size - compressedBlob.size) / file.size) *
        100
      ).toFixed(1);
      showToast(
        `Logo berhasil diupload! (${sizeReduction}% lebih kecil)`,
        "success"
      );
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
    if (
      tempSchoolSettings.school_email &&
      !emailRegex.test(tempSchoolSettings.school_email)
    ) {
      errors.push("Format email tidak valid");
    }

    const urlRegex = /^https?:\/\/.+\..+$/;
    if (
      tempSchoolSettings.school_website &&
      !urlRegex.test(tempSchoolSettings.school_website)
    ) {
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

      const updatePromises = Object.entries(tempSchoolSettings).map(
        ([key, value]) =>
          supabase
            .from("school_settings")
            .upsert(
              { setting_key: key, setting_value: value },
              { onConflict: "setting_key" }
            )
      );

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

  return (
    <div className="p-4 sm:p-6 bg-gradient-to-br from-blue-50/50 to-white dark:from-gray-900 dark:to-gray-800 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex-1">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
            Pengaturan Sekolah
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">
            Kelola informasi dan identitas SMP Muslimin Cililin
          </p>
        </div>
        {!editingSchoolSettings && (
          <button
            onClick={() => {
              setEditingSchoolSettings(true);
              setTempSchoolSettings({ ...schoolSettings });
            }}
            className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all duration-200 w-full sm:w-auto min-h-[44px] touch-manipulation shadow-md hover:shadow-lg active:scale-[0.98]">
            <Edit3 size={18} className="sm:size-[16px]" />
            <span className="text-sm sm:text-base font-medium">
              Edit Pengaturan
            </span>
          </button>
        )}
      </div>

      {/* ✅ SEMESTER MISMATCH WARNING */}
      {!editingSchoolSettings && isSemesterMismatch() && (
        <div className="mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-l-4 border-yellow-500 dark:border-yellow-600 p-4 rounded-xl shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5"
              size={20}
            />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-yellow-900 dark:text-yellow-300 mb-1">
                ⚠️ Perhatian: Semester Mungkin Perlu Diupdate
              </h4>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                Sekarang{" "}
                <strong className="dark:text-yellow-100">
                  {getCurrentMonthName()} {getCurrentYear()}
                </strong>
                , semester seharusnya{" "}
                <strong className="text-yellow-900 dark:text-yellow-100">
                  "{getExpectedSemester()}"
                </strong>
                <br />
                Semester aktif saat ini:{" "}
                <strong className="text-red-700 dark:text-red-300">
                  "{schoolSettings.semester}"
                </strong>
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-yellow-700 dark:text-yellow-300 mb-3">
                <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg">
                  Juli-Des = Ganjil
                </span>
                <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg">
                  Jan-Jun = Genap
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  onClick={quickUpdateSemester}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-4 sm:px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-all duration-200 shadow-sm min-h-[44px] touch-manipulation active:scale-[0.98]">
                  <Check size={16} />
                  {loading
                    ? "Updating..."
                    : `Update ke "${getExpectedSemester()}" Sekarang`}
                </button>
                <span className="text-xs text-yellow-700 dark:text-yellow-300 self-center text-center sm:text-left">
                  atau abaikan jika semester sudah benar
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informasi Sekolah */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Building2
                  size={20}
                  className="text-blue-600 dark:text-blue-400"
                />
              </div>
              Informasi Sekolah
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Nama Sekolah *
                </label>
                {editingSchoolSettings ? (
                  <input
                    type="text"
                    value={tempSchoolSettings.school_name || ""}
                    onChange={(e) =>
                      setTempSchoolSettings((prev) => ({
                        ...prev,
                        school_name: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-3 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:ring-blue-400/50 dark:focus:border-blue-400 bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white dark:placeholder-gray-400 min-h-[44px] touch-manipulation transition-all duration-200"
                    placeholder="Masukkan nama sekolah"
                  />
                ) : (
                  <div className="w-full px-4 py-3 bg-blue-50/50 dark:bg-gray-700/50 border border-blue-100 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white min-h-[44px] flex items-center font-medium">
                    {schoolSettings.school_name}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Tingkat Sekolah *
                </label>
                <div className="w-full px-4 py-3 bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-900/20 dark:to-blue-900/10 border border-blue-200 dark:border-blue-700 rounded-xl font-bold text-blue-800 dark:text-blue-300 min-h-[44px] flex items-center">
                  {schoolSettings.school_level}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Alamat Sekolah *
                </label>
                {editingSchoolSettings ? (
                  <textarea
                    value={tempSchoolSettings.school_address || ""}
                    onChange={(e) =>
                      setTempSchoolSettings((prev) => ({
                        ...prev,
                        school_address: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-3 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:ring-blue-400/50 dark:focus:border-blue-400 bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white dark:placeholder-gray-400 resize-vertical min-h-[100px] sm:min-h-[76px] touch-manipulation transition-all duration-200"
                    rows="3"
                    placeholder="Masukkan alamat lengkap sekolah"
                  />
                ) : (
                  <div className="w-full px-4 py-3 bg-blue-50/50 dark:bg-gray-700/50 border border-blue-100 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white min-h-[100px] sm:min-h-[76px] flex items-start p-4 font-medium">
                    {schoolSettings.school_address}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  NPSN *
                </label>
                {editingSchoolSettings ? (
                  <input
                    type="text"
                    value={tempSchoolSettings.npsn || ""}
                    onChange={(e) =>
                      setTempSchoolSettings((prev) => ({
                        ...prev,
                        npsn: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-3 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:ring-blue-400/50 dark:focus:border-blue-400 bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white dark:placeholder-gray-400 min-h-[44px] touch-manipulation transition-all duration-200"
                    placeholder="8 digit NPSN"
                    maxLength="8"
                  />
                ) : (
                  <div className="w-full px-4 py-3 bg-blue-50/50 dark:bg-gray-700/50 border border-blue-100 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white min-h-[44px] flex items-center font-medium">
                    {schoolSettings.npsn}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Maks. Siswa per Kelas
                </label>
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
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-3 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:ring-blue-400/50 dark:focus:border-blue-400 bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white dark:placeholder-gray-400 min-h-[44px] touch-manipulation transition-all duration-200"
                    placeholder="36"
                    min="20"
                    max="40"
                  />
                ) : (
                  <div className="w-full px-4 py-3 bg-blue-50/50 dark:bg-gray-700/50 border border-blue-100 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white min-h-[44px] flex items-center font-medium">
                    {schoolSettings.max_students_per_class} siswa
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Kontak Sekolah */}
          <div className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Phone
                  size={20}
                  className="text-green-600 dark:text-green-400"
                />
              </div>
              Kontak Sekolah
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Nomor Telepon
                </label>
                {editingSchoolSettings ? (
                  <input
                    type="text"
                    value={tempSchoolSettings.school_phone || ""}
                    onChange={(e) =>
                      setTempSchoolSettings((prev) => ({
                        ...prev,
                        school_phone: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-3 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:ring-blue-400/50 dark:focus:border-blue-400 bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white dark:placeholder-gray-400 min-h-[44px] touch-manipulation transition-all duration-200"
                    placeholder="Contoh: 022-1234567"
                  />
                ) : (
                  <div className="w-full px-4 py-3 bg-blue-50/50 dark:bg-gray-700/50 border border-blue-100 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white min-h-[44px] flex items-center font-medium">
                    {schoolSettings.school_phone || "-"}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Email Sekolah
                </label>
                {editingSchoolSettings ? (
                  <input
                    type="email"
                    value={tempSchoolSettings.school_email || ""}
                    onChange={(e) =>
                      setTempSchoolSettings((prev) => ({
                        ...prev,
                        school_email: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-3 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:ring-blue-400/50 dark:focus:border-blue-400 bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white dark:placeholder-gray-400 min-h-[44px] touch-manipulation transition-all duration-200"
                    placeholder="email@sekolah.sch.id"
                  />
                ) : (
                  <div className="w-full px-4 py-3 bg-blue-50/50 dark:bg-gray-700/50 border border-blue-100 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white min-h-[44px] flex items-center font-medium">
                    {schoolSettings.school_email || "-"}
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Website Sekolah
                </label>
                {editingSchoolSettings ? (
                  <input
                    type="url"
                    value={tempSchoolSettings.school_website || ""}
                    onChange={(e) =>
                      setTempSchoolSettings((prev) => ({
                        ...prev,
                        school_website: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-3 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:ring-blue-400/50 dark:focus:border-blue-400 bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white dark:placeholder-gray-400 min-h-[44px] touch-manipulation transition-all duration-200"
                    placeholder="https://example.sch.id"
                  />
                ) : (
                  <div className="w-full px-4 py-3 bg-blue-50/50 dark:bg-gray-700/50 border border-blue-100 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white min-h-[44px] flex items-center font-medium">
                    {schoolSettings.school_website || "-"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tahun Ajaran dan Logo */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Calendar
                  size={20}
                  className="text-purple-600 dark:text-purple-400"
                />
              </div>
              Tahun Ajaran
            </h3>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Tahun Ajaran Aktif *
                </label>
                {editingSchoolSettings ? (
                  <div className="space-y-2">
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
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-3 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:ring-blue-400/50 dark:focus:border-blue-400 bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white dark:placeholder-gray-400 min-h-[44px] touch-manipulation transition-all duration-200"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 px-1">
                      Format: YYYY/YYYY (contoh: 2024/2025)
                    </p>
                  </div>
                ) : (
                  <div className="w-full px-4 py-3 bg-gradient-to-r from-purple-100 to-purple-50 dark:from-purple-900/20 dark:to-purple-900/10 border border-purple-200 dark:border-purple-700 rounded-xl font-bold text-purple-800 dark:text-purple-300 min-h-[44px] flex items-center">
                    {schoolSettings.current_academic_year}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Semester Aktif
                </label>
                {editingSchoolSettings ? (
                  <div className="space-y-2">
                    <select
                      value={tempSchoolSettings.semester || ""}
                      onChange={(e) =>
                        setTempSchoolSettings((prev) => ({
                          ...prev,
                          semester: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-3 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:ring-blue-400/50 dark:focus:border-blue-400 bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white min-h-[44px] touch-manipulation transition-all duration-200">
                      <option value="Ganjil">Ganjil</option>
                      <option value="Genap">Genap</option>
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-200 dark:border-blue-800">
                      📅 <strong>Info:</strong> Jul-Des = Ganjil | Jan-Jun =
                      Genap
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="w-full px-4 py-3 bg-blue-50/50 dark:bg-gray-700/50 border border-blue-100 dark:border-gray-600 rounded-xl mb-2 text-gray-900 dark:text-white min-h-[44px] flex items-center font-medium">
                      {schoolSettings.semester}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 px-1">
                      Jul-Des: Ganjil | Jan-Jun: Genap
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Logo Section */}
          <div className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Image
                  size={20}
                  className="text-orange-600 dark:text-orange-400"
                />
              </div>
              Logo Sekolah
            </h3>

            {editingSchoolSettings ? (
              <div className="space-y-5">
                {uploadProgress > 0 && (
                  <div className="space-y-2">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                      Mengupload... {uploadProgress}%
                    </p>
                  </div>
                )}

                {!imageValidation.isValid && (
                  <div className="p-3 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10 border border-red-200 dark:border-red-800 rounded-xl">
                    <p className="text-sm font-medium text-red-700 dark:text-red-300">
                      {imageValidation.message}
                    </p>
                  </div>
                )}

                {(tempSchoolSettings.school_logo ||
                  schoolSettings.school_logo) && (
                  <div className="relative p-4 bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-gray-700/50 dark:to-gray-700/30 rounded-xl border border-blue-200 dark:border-gray-600">
                    <button
                      onClick={removeLogo}
                      className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-full p-2 transition-all duration-200 shadow-md touch-manipulation active:scale-90"
                      title="Hapus logo"
                      aria-label="Hapus logo">
                      <X size={16} />
                    </button>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <img
                        src={
                          tempSchoolSettings.school_logo ||
                          schoolSettings.school_logo
                        }
                        alt="Preview Logo"
                        className="h-20 w-20 object-contain border-2 border-white dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 p-2 mx-auto sm:mx-0 shadow-sm"
                      />
                      <div className="flex-1 text-center sm:text-left">
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                          Preview Logo
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Logo akan disimpan dalam format terkompresi
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
                          ✓ Gambar telah dioptimasi
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <label
                  className={`flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
                    loading
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-gray-700/70 border-gray-300 dark:border-gray-600"
                  } bg-blue-50/20 dark:bg-gray-700/30 touch-manipulation active:scale-[0.98]`}>
                  <Upload className="w-10 h-10 text-gray-400 dark:text-gray-500 mb-3" />
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300 text-center mb-1">
                    Klik untuk upload logo
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    PNG, JPG, JPEG • Maks. 2MB • Minimal 100x100px
                  </span>
                  <span className="text-xs text-blue-600 dark:text-blue-400 mt-2 text-center font-medium">
                    Gambar akan dikompresi otomatis
                  </span>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={loading}
                  />
                </label>

                <div className="p-3 bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/10 dark:to-blue-900/5 rounded-xl border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>Tips:</strong> Gunakan gambar dengan latar belakang
                    transparan (PNG) untuk hasil terbaik. Logo akan otomatis
                    dikompresi hingga 70% lebih kecil.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center p-6 bg-gradient-to-r from-blue-50 to-blue-100/30 dark:from-gray-700/50 dark:to-gray-700/30 rounded-xl border-2 border-dashed border-blue-200 dark:border-gray-600">
                  {schoolSettings.school_logo ? (
                    <img
                      src={schoolSettings.school_logo}
                      alt="School Logo"
                      className="h-28 w-28 object-contain p-2 bg-white dark:bg-gray-800 rounded-2xl shadow-md"
                    />
                  ) : (
                    <div className="text-center">
                      <div className="w-28 h-28 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-3 shadow-md">
                        <span className="text-3xl">🏫</span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                        Logo belum diset
                      </p>
                    </div>
                  )}
                </div>
                {schoolSettings.school_logo && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center font-medium">
                    Logo terpasang • Format terkompresi
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Action Buttons */}
      {editingSchoolSettings && (
        <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              onClick={updateSchoolSettings}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-4 sm:py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl disabled:opacity-50 transition-all duration-200 min-h-[44px] touch-manipulation shadow-md hover:shadow-lg active:scale-[0.98] order-2 sm:order-1">
              <Save size={18} className="sm:size-[16px]" />
              <span className="text-sm sm:text-base font-medium">
                {loading ? "Menyimpan..." : "Simpan Perubahan"}
              </span>
            </button>

            <button
              onClick={resetForm}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-4 sm:py-3 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-xl disabled:opacity-50 transition-all duration-200 min-h-[44px] touch-manipulation shadow-md hover:shadow-lg active:scale-[0.98] order-3 sm:order-2">
              <RotateCcw size={18} className="sm:size-[16px]" />
              <span className="text-sm sm:text-base font-medium">Reset</span>
            </button>

            <button
              onClick={() => {
                setEditingSchoolSettings(false);
                setTempSchoolSettings({});
                setImageValidation({ isValid: true, message: "" });
              }}
              disabled={loading}
              className="px-6 py-4 sm:py-3 bg-gradient-to-r from-gray-300 to-gray-400 hover:from-gray-400 hover:to-gray-500 dark:from-gray-600 dark:to-gray-700 dark:hover:from-gray-700 dark:hover:to-gray-800 text-gray-700 dark:text-gray-300 rounded-xl disabled:opacity-50 transition-all duration-200 min-h-[44px] touch-manipulation shadow-md hover:shadow-lg active:scale-[0.98] order-1 sm:order-3 font-medium">
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolSettingsTab;
