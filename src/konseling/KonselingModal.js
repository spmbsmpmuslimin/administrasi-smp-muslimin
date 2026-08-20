import React, { useState, useEffect } from "react";
import { Users, XCircle, AlertTriangle, Calendar } from "lucide-react";

const KonselingModal = ({
  show,
  mode,
  formData,
  students,
  classes,
  onClose,
  onSubmit,
  onFormChange,
}) => {
  const [studentFilters, setStudentFilters] = useState({
    jenjang: "",
    kelas: "",
  });
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [availableKelas, setAvailableKelas] = useState([]);

  // Reset filters when modal opens
  useEffect(() => {
    if (show) {
      setStudentFilters({ jenjang: "", kelas: "" });
      setFilteredStudents([]);
      setAvailableKelas([]);
    }
  }, [show]);

  // Update available classes based on selected grade
  const updateAvailableKelas = (jenjang) => {
    if (jenjang) {
      const jenjangAngka = jenjang.replace("Kelas ", "");
      const kelasList = classes
        .filter((c) => c.grade.toString() === jenjangAngka)
        .map((c) => c.id)
        .sort();
      setAvailableKelas(kelasList);
    } else {
      setAvailableKelas([]);
    }
  };

  // Update filtered students based on selected class
  const updateFilteredStudents = (kelas) => {
    if (kelas) {
      const filtered = students.filter((s) => s.class_id === kelas);
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents([]);
    }
  };

  // Handle student selection
  const handleStudentSelect = (studentId) => {
    const selectedStudent = students.find((s) => s.id === studentId);
    if (selectedStudent) {
      onFormChange({
        student_id: studentId,
        nis: selectedStudent.nis,
        full_name: selectedStudent.full_name,
        gender: selectedStudent.gender,
        class_id: selectedStudent.class_id,
      });
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    onFormChange({ [field]: value });
  };

  // If modal is not shown, return null
  if (!show) return null;

  // Base styling classes for consistent design
  const inputBaseClasses =
    "w-full px-4 py-3 border rounded-lg text-sm md:text-base min-h-[48px] touch-target transition-all duration-200";
  const inputLightClasses = "bg-white border-gray-300 text-gray-900 placeholder:text-gray-500";
  const inputDarkClasses =
    "dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-400";
  const inputFocusClasses =
    "focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 outline-none";
  const inputDisabledClasses =
    "disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed";

  const selectBaseClasses = `${inputBaseClasses} ${inputLightClasses} ${inputDarkClasses} ${inputFocusClasses} ${inputDisabledClasses} appearance-none bg-select-arrow bg-no-repeat bg-right-4`;

  const textareaBaseClasses =
    "w-full px-4 py-3 border rounded-lg text-sm md:text-base transition-all duration-200 resize-y min-h-[120px]";
  const textareaLightClasses = "bg-white border-gray-300 text-gray-900 placeholder:text-gray-500";
  const textareaDarkClasses =
    "dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-400";
  const textareaFocusClasses =
    "focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 outline-none";
  const textareaDisabledClasses =
    "disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed";

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-2 sm:p-3 md:p-4 overflow-y-auto backdrop-blur-sm">
      {/* Modal Container */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] my-4 mx-2 sm:mx-4 overflow-hidden flex flex-col">
        {/* Header - Sticky */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-700 dark:to-blue-800 text-white p-4 sm:p-5 md:p-6 flex justify-between items-center z-10">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center bg-white/20 rounded-lg p-1">
              <Users className="w-full h-full" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold">
                {mode === "add"
                  ? "Tambah Data Konseling"
                  : mode === "edit"
                  ? "Edit Data Konseling"
                  : "Detail Konseling"}
              </h2>
              <p className="text-blue-100 text-xs sm:text-sm mt-1">SMP Muslimin Cililin</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition min-h-[44px] min-w-[44px] flex items-center justify-center touch-target"
            aria-label="Tutup modal"
          >
            <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Form Content - Scrollable */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 space-y-5 sm:space-y-6"
        >
          {/* ✅ STUDENT SELECTION SECTION */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 p-4 sm:p-5 rounded-xl">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 sm:mb-4">
              <span className="inline-flex items-center gap-2">
                <span className="text-blue-600 dark:text-blue-400">👤</span>
                Pilih Siswa *
              </span>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              {/* Jenjang Selection */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Jenjang
                </label>
                <select
                  value={studentFilters.jenjang}
                  onChange={(e) => {
                    const jenjang = e.target.value;
                    setStudentFilters({ jenjang: jenjang, kelas: "" });
                    updateAvailableKelas(jenjang);
                    onFormChange({
                      student_id: "",
                      nis: "",
                      full_name: "",
                      gender: "",
                      class_id: "",
                    });
                  }}
                  disabled={mode === "view"}
                  className={selectBaseClasses}
                  required
                >
                  <option value="">-- Pilih Jenjang --</option>
                  <option value="Kelas 7">Kelas 7</option>
                  <option value="Kelas 8">Kelas 8</option>
                  <option value="Kelas 9">Kelas 9</option>
                </select>
              </div>

              {/* Kelas Selection */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Kelas
                </label>
                <select
                  value={studentFilters.kelas}
                  onChange={(e) => {
                    const kelas = e.target.value;
                    setStudentFilters((prev) => ({ ...prev, kelas }));
                    updateFilteredStudents(kelas);
                    onFormChange({
                      student_id: "",
                      nis: "",
                      full_name: "",
                      gender: "",
                      class_id: "",
                    });
                  }}
                  disabled={!studentFilters.jenjang || mode === "view"}
                  className={selectBaseClasses}
                  required
                >
                  <option value="">-- Pilih Kelas --</option>
                  {availableKelas.map((kelas) => (
                    <option key={kelas} value={kelas}>
                      {kelas}
                    </option>
                  ))}
                </select>
              </div>

              {/* Student Selection */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Nama Siswa
                </label>
                <select
                  value={formData.student_id}
                  onChange={(e) => handleStudentSelect(e.target.value)}
                  disabled={!studentFilters.kelas || mode === "view"}
                  className={selectBaseClasses}
                  required
                >
                  <option value="">-- Pilih Nama Siswa --</option>
                  {filteredStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredStudents.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                {filteredStudents.length} siswa tersedia
              </p>
            )}
          </div>

          {/* ✅ STUDENT INFO DISPLAY */}
          {formData.student_id && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">NIS</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                  {formData.nis}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Nama Lengkap</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                  {formData.full_name}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Kelas</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                  {formData.class_id}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Jenis Kelamin</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                  {formData.gender === "L"
                    ? "Laki-laki"
                    : formData.gender === "P"
                    ? "Perempuan"
                    : formData.gender}
                </p>
              </div>
            </div>
          )}

          {/* ✅ DATE & SERVICE INFO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {/* Date */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tanggal Konseling *
              </label>
              <input
                type="date"
                value={formData.tanggal}
                onChange={(e) => handleInputChange("tanggal", e.target.value)}
                disabled={mode === "view"}
                className={`${inputBaseClasses} ${inputLightClasses} ${inputDarkClasses} ${inputFocusClasses} ${inputDisabledClasses}`}
                required
              />
            </div>

            {/* Service Type */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Jenis Layanan *
              </label>
              <select
                value={formData.jenis_layanan}
                onChange={(e) => handleInputChange("jenis_layanan", e.target.value)}
                disabled={mode === "view"}
                className={selectBaseClasses}
                required
              >
                <option value="">Pilih Jenis Layanan</option>
                <option value="Pribadi">Pribadi</option>
                <option value="Sosial">Sosial</option>
                <option value="Belajar">Belajar</option>
                <option value="Karier">Karier</option>
                <option value="Keluarga">Keluarga</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            {/* Guidance Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Bidang Bimbingan *
              </label>
              <select
                value={formData.bidang_bimbingan}
                onChange={(e) => handleInputChange("bidang_bimbingan", e.target.value)}
                disabled={mode === "view"}
                className={selectBaseClasses}
                required
              >
                <option value="">Pilih Bidang Bimbingan</option>
                <option value="Pribadi dan Sosial">Pribadi dan Sosial</option>
                <option value="Akademik">Akademik</option>
                <option value="Karier dan Pekerjaan">Karier dan Pekerjaan</option>
                <option value="Keluarga">Keluarga</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
          </div>

          {/* ✅ PROBLEM CLASSIFICATION */}
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/50 rounded-xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-lg">
                <AlertTriangle className="text-orange-600 dark:text-orange-400 w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-lg">
                Klasifikasi Masalah
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {/* Urgency Level */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tingkat Urgensi *
                </label>
                <select
                  value={formData.tingkat_urgensi}
                  onChange={(e) => handleInputChange("tingkat_urgensi", e.target.value)}
                  disabled={mode === "view"}
                  className={selectBaseClasses}
                  required
                >
                  <option value="">Pilih Tingkat Urgensi</option>
                  <option value="Rendah">🟢 Rendah - Konsultasi ringan</option>
                  <option value="Sedang">🟡 Sedang - Perlu perhatian</option>
                  <option value="Tinggi">🟠 Tinggi - Segera ditangani</option>
                  <option value="Darurat">🔴 Darurat - Prioritas utama</option>
                </select>
              </div>

              {/* Problem Category */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Kategori Masalah *
                </label>
                <select
                  value={formData.kategori_masalah}
                  onChange={(e) => handleInputChange("kategori_masalah", e.target.value)}
                  disabled={mode === "view"}
                  className={selectBaseClasses}
                  required
                >
                  <option value="">Pilih Kategori Masalah</option>
                  <option value="Akademik">📚 Akademik</option>
                  <option value="Perilaku">⚠️ Perilaku</option>
                  <option value="Sosial-Emosional">😔 Sosial-Emosional</option>
                  <option value="Pertemanan">👥 Pertemanan</option>
                  <option value="Keluarga">🏠 Keluarga</option>
                  <option value="Percintaan">💔 Percintaan</option>
                  <option value="Teknologi/Gadget">📱 Teknologi/Gadget</option>
                  <option value="Kenakalan">🚬 Kenakalan</option>
                  <option value="Kesehatan Mental">🧠 Kesehatan Mental</option>
                  <option value="Lainnya">📋 Lainnya</option>
                </select>
              </div>
            </div>
          </div>

          {/* ✅ TEXT AREAS SECTION */}
          <div className="space-y-4 sm:space-y-5">
            {/* Problem Description */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Permasalahan *
              </label>
              <textarea
                value={formData.permasalahan}
                onChange={(e) => handleInputChange("permasalahan", e.target.value)}
                disabled={mode === "view"}
                rows={4}
                className={`${textareaBaseClasses} ${textareaLightClasses} ${textareaDarkClasses} ${textareaFocusClasses} ${textareaDisabledClasses}`}
                placeholder="Jelaskan permasalahan yang dihadapi siswa secara detail..."
                required
              />
            </div>

            {/* Chronology */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Kronologi *
              </label>
              <textarea
                value={formData.kronologi}
                onChange={(e) => handleInputChange("kronologi", e.target.value)}
                disabled={mode === "view"}
                rows={4}
                className={`${textareaBaseClasses} ${textareaLightClasses} ${textareaDarkClasses} ${textareaFocusClasses} ${textareaDisabledClasses}`}
                placeholder="Jelaskan kronologi kejadian secara runtut..."
                required
              />
            </div>

            {/* Action & Result */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tindakan Layanan
                </label>
                <textarea
                  value={formData.tindakan_layanan}
                  onChange={(e) => handleInputChange("tindakan_layanan", e.target.value)}
                  disabled={mode === "view"}
                  rows={3}
                  className={`${textareaBaseClasses} ${textareaLightClasses} ${textareaDarkClasses} ${textareaFocusClasses} ${textareaDisabledClasses}`}
                  placeholder="Jelaskan tindakan yang dilakukan..."
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Hasil Layanan
                </label>
                <textarea
                  value={formData.hasil_layanan}
                  onChange={(e) => handleInputChange("hasil_layanan", e.target.value)}
                  disabled={mode === "view"}
                  rows={3}
                  className={`${textareaBaseClasses} ${textareaLightClasses} ${textareaDarkClasses} ${textareaFocusClasses} ${textareaDisabledClasses}`}
                  placeholder="Jelaskan hasil dari layanan yang diberikan..."
                />
              </div>
            </div>

            {/* Follow-up Plan */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Rencana Tindak Lanjut
              </label>
              <textarea
                value={formData.rencana_tindak_lanjut}
                onChange={(e) => handleInputChange("rencana_tindak_lanjut", e.target.value)}
                disabled={mode === "view"}
                rows={3}
                className={`${textareaBaseClasses} ${textareaLightClasses} ${textareaDarkClasses} ${textareaFocusClasses} ${textareaDisabledClasses}`}
                placeholder="Jelaskan rencana tindak lanjut..."
              />
            </div>
          </div>

          {/* ✅ FOLLOW-UP SECTION */}
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/50 rounded-xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                <Calendar className="text-purple-600 dark:text-purple-400 w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-lg">Follow-up</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="perlu_followup"
                  checked={formData.perlu_followup}
                  onChange={(e) => {
                    handleInputChange("perlu_followup", e.target.checked);
                    if (!e.target.checked) {
                      handleInputChange("tanggal_followup", "");
                    }
                  }}
                  disabled={mode === "view"}
                  className="w-5 h-5 text-purple-600 dark:text-purple-400 rounded focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 touch-target bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                />
                <label
                  htmlFor="perlu_followup"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Perlu Follow-up / Konseling Lanjutan
                </label>
              </div>

              {formData.perlu_followup && (
                <div className="ml-0 sm:ml-8 space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tanggal Follow-up *
                  </label>
                  <input
                    type="date"
                    value={formData.tanggal_followup}
                    onChange={(e) => handleInputChange("tanggal_followup", e.target.value)}
                    disabled={mode === "view"}
                    min={new Date().toISOString().split("T")[0]}
                    className={`${inputBaseClasses} ${inputLightClasses} ${inputDarkClasses} ${inputFocusClasses} ${inputDisabledClasses} border-purple-300 dark:border-purple-600`}
                    required={formData.perlu_followup}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ✅ STATUS SECTION */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Status Layanan
              </label>
              <select
                value={formData.status_layanan}
                onChange={(e) => handleInputChange("status_layanan", e.target.value)}
                disabled={mode === "view"}
                className={selectBaseClasses}
              >
                <option value="Dalam Proses">⏳ Dalam Proses</option>
                <option value="Selesai">✅ Selesai</option>
                <option value="Dibatalkan">❌ Dibatalkan</option>
              </select>
            </div>
          </div>

          {/* ✅ ACTION BUTTONS */}
          {mode !== "view" && (
            <div className="flex flex-col sm:flex-row gap-3 pt-5 border-t border-gray-200 dark:border-gray-700">
              <button
                type="submit"
                className="flex-1 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-700 dark:to-blue-800 dark:hover:from-blue-800 dark:hover:to-blue-900 text-white rounded-xl font-semibold text-base min-h-[52px] touch-target transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98]"
              >
                {mode === "add" ? "✅ Tambah Data Konseling" : "💾 Update Data Konseling"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 text-gray-800 rounded-xl font-semibold text-base min-h-[52px] touch-target transition-all duration-200"
              >
                Batal
              </button>
            </div>
          )}

          {mode === "view" && (
            <div className="pt-5 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="w-full px-6 py-3.5 bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-xl font-semibold text-base min-h-[52px] touch-target transition-all duration-200"
              >
                Tutup
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default KonselingModal;
