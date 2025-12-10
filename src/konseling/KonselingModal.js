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

  useEffect(() => {
    if (show) {
      setStudentFilters({ jenjang: "", kelas: "" });
      setFilteredStudents([]);
      setAvailableKelas([]);
    }
  }, [show]);

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

  const updateFilteredStudents = (kelas) => {
    if (kelas) {
      const filtered = students.filter((s) => s.class_id === kelas);
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents([]);
    }
  };

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

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  const handleInputChange = (field, value) => {
    onFormChange({ [field]: value });
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-2 sm:p-3 md:p-4 overflow-y-auto">
      {/* DARK MODE FIX - INLINE STYLE UNTUK SELECT */}
      <style>{`
        .dark-select option {
          background-color: #1f2937 !important;
          color: #f3f4f6 !important;
        }
        .dark-select option:hover {
          background-color: #3b82f6 !important;
        }
        .dark-select option:checked {
          background-color: #3b82f6 !important;
          color: white !important;
        }
        .dark-select:disabled option {
          background-color: #374151 !important;
          color: #9ca3af !important;
        }
        .dark-select::-webkit-scrollbar {
          width: 8px;
        }
        .dark-select::-webkit-scrollbar-track {
          background: #374151;
          border-radius: 4px;
        }
        .dark-select::-webkit-scrollbar-thumb {
          background: #6b7280;
          border-radius: 4px;
        }
        .dark-select::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>

      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] my-4 mx-2 sm:mx-4">
        {/* Header Sticky */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white p-4 sm:p-5 md:p-6 rounded-t-xl flex justify-between items-center z-10">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
              <Users className="w-full h-full" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold">
                {mode === "add"
                  ? "Tambah Data Konseling"
                  : mode === "edit"
                  ? "Edit Data Konseling"
                  : "Detail Konseling"}
              </h2>
              <p className="text-blue-100 text-xs sm:text-sm">
                SMP Muslimin Cililin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-blue-600 dark:hover:bg-blue-800 rounded-lg transition min-h-[44px] min-w-[44px] flex items-center justify-center touch-target"
            aria-label="Tutup modal">
            <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-5 md:space-y-6">
          {/* ✅ STUDENT SELECTION - Responsif */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 sm:p-4 rounded-lg">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">
              👤 Pilih Siswa *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
              {/* Jenjang */}
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
                className="dark-select w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-gray-600 
                         rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                         disabled:bg-gray-100 dark:disabled:bg-gray-700 
                         disabled:text-gray-500 dark:disabled:text-gray-400 
                         text-sm min-h-[44px] touch-target
                         bg-white dark:bg-gray-800
                         text-gray-900 dark:text-gray-100"
                required>
                <option value="">-- Pilih Jenjang --</option>
                <option value="Kelas 7">Kelas 7</option>
                <option value="Kelas 8">Kelas 8</option>
                <option value="Kelas 9">Kelas 9</option>
              </select>

              {/* Kelas */}
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
                className="dark-select w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-gray-600 
                         rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                         disabled:bg-gray-100 dark:disabled:bg-gray-700 
                         disabled:text-gray-500 dark:disabled:text-gray-400 
                         text-sm min-h-[44px] touch-target
                         bg-white dark:bg-gray-800
                         text-gray-900 dark:text-gray-100"
                required>
                <option value="">-- Pilih Kelas --</option>
                {availableKelas.map((kelas) => (
                  <option key={kelas} value={kelas}>
                    {kelas}
                  </option>
                ))}
              </select>

              {/* ✅ NAMA SISWA */}
              <select
                value={formData.student_id}
                onChange={(e) => handleStudentSelect(e.target.value)}
                disabled={!studentFilters.kelas || mode === "view"}
                className="dark-select w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-gray-600 
                         rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                         disabled:bg-gray-100 dark:disabled:bg-gray-700 
                         disabled:text-gray-500 dark:disabled:text-gray-400 
                         text-sm min-h-[44px] touch-target
                         bg-white dark:bg-gray-800
                         text-gray-900 dark:text-gray-100"
                required>
                <option value="">-- Pilih Nama Siswa --</option>
                {filteredStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.full_name}
                  </option>
                ))}
              </select>
            </div>
            {filteredStudents.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                ✅ {filteredStudents.length} siswa tersedia
              </p>
            )}
          </div>

          {/* Student Info (auto-filled) - Responsif */}
          {formData.student_id && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg text-xs sm:text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400 text-xs">
                  NIS:
                </span>
                <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                  {formData.nis}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400 text-xs">
                  Nama:
                </span>
                <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                  {formData.full_name}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400 text-xs">
                  Kelas:
                </span>
                <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                  {formData.class_id}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400 text-xs">
                  Kelamin:
                </span>
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

          {/* Date & Layanan - Responsif */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                Tanggal Konseling *
              </label>
              <input
                type="date"
                value={formData.tanggal}
                onChange={(e) => handleInputChange("tanggal", e.target.value)}
                disabled={mode === "view"}
                className="dark-select w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-gray-600 
                         rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                         disabled:bg-gray-100 dark:disabled:bg-gray-700 
                         disabled:text-gray-500 dark:disabled:text-gray-400 
                         text-sm min-h-[44px] touch-target
                         bg-white dark:bg-gray-800
                         text-gray-900 dark:text-gray-100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                Jenis Layanan *
              </label>
              <select
                value={formData.jenis_layanan}
                onChange={(e) =>
                  handleInputChange("jenis_layanan", e.target.value)
                }
                disabled={mode === "view"}
                className="dark-select w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-gray-600 
                         rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                         disabled:bg-gray-100 dark:disabled:bg-gray-700 
                         disabled:text-gray-500 dark:disabled:text-gray-400 
                         text-sm min-h-[44px] touch-target
                         bg-white dark:bg-gray-800
                         text-gray-900 dark:text-gray-100"
                required>
                <option value="">Pilih Jenis Layanan</option>
                <option value="Pribadi">Pribadi</option>
                <option value="Sosial">Sosial</option>
                <option value="Belajar">Belajar</option>
                <option value="Karier">Karier</option>
                <option value="Keluarga">Keluarga</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                Bidang Bimbingan *
              </label>
              <select
                value={formData.bidang_bimbingan}
                onChange={(e) =>
                  handleInputChange("bidang_bimbingan", e.target.value)
                }
                disabled={mode === "view"}
                className="dark-select w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-gray-600 
                         rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                         disabled:bg-gray-100 dark:disabled:bg-gray-700 
                         disabled:text-gray-500 dark:disabled:text-gray-400 
                         text-sm min-h-[44px] touch-target
                         bg-white dark:bg-gray-800
                         text-gray-900 dark:text-gray-100"
                required>
                <option value="">Pilih Bidang Bimbingan</option>
                <option value="Pribadi dan Sosial">Pribadi dan Sosial</option>
                <option value="Akademik">Akademik</option>
                <option value="Karier dan Pekerjaan">
                  Karier dan Pekerjaan
                </option>
                <option value="Keluarga">Keluarga</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
          </div>

          {/* Tingkat Urgensi & Kategori Masalah */}
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <AlertTriangle className="text-orange-600 dark:text-orange-400 w-4 h-4 sm:w-5 sm:h-5" />
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm sm:text-base">
                Klasifikasi Masalah
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                  Tingkat Urgensi *
                </label>
                <select
                  value={formData.tingkat_urgensi}
                  onChange={(e) =>
                    handleInputChange("tingkat_urgensi", e.target.value)
                  }
                  disabled={mode === "view"}
                  className="dark-select w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-gray-600 
                           rounded-lg focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 
                           disabled:bg-gray-100 dark:disabled:bg-gray-700 
                           disabled:text-gray-500 dark:disabled:text-gray-400 
                           text-sm min-h-[44px] touch-target
                           bg-white dark:bg-gray-800
                           text-gray-900 dark:text-gray-100"
                  required>
                  <option value="">Pilih Tingkat Urgensi</option>
                  <option value="Rendah">🟢 Rendah - Konsultasi ringan</option>
                  <option value="Sedang">🟡 Sedang - Perlu perhatian</option>
                  <option value="Tinggi">🟠 Tinggi - Segera ditangani</option>
                  <option value="Darurat">🔴 Darurat - Prioritas utama</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                  Kategori Masalah *
                </label>
                <select
                  value={formData.kategori_masalah}
                  onChange={(e) =>
                    handleInputChange("kategori_masalah", e.target.value)
                  }
                  disabled={mode === "view"}
                  className="dark-select w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-gray-600 
                           rounded-lg focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 
                           disabled:bg-gray-100 dark:disabled:bg-gray-700 
                           disabled:text-gray-500 dark:disabled:text-gray-400 
                           text-sm min-h-[44px] touch-target
                           bg-white dark:bg-gray-800
                           text-gray-900 dark:text-gray-100"
                  required>
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

          {/* Text Areas - Responsif - INI YANG DIPERBAIKI */}
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                Permasalahan *
              </label>
              <textarea
                value={formData.permasalahan}
                onChange={(e) =>
                  handleInputChange("permasalahan", e.target.value)
                }
                disabled={mode === "view"}
                rows="3"
                className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 text-sm min-h-[120px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                placeholder="Jelaskan permasalahan yang dihadapi siswa secara detail..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                Kronologi *
              </label>
              <textarea
                value={formData.kronologi}
                onChange={(e) => handleInputChange("kronologi", e.target.value)}
                disabled={mode === "view"}
                rows="3"
                className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 text-sm min-h-[120px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                placeholder="Jelaskan kronologi kejadian secara runtut..."
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                  Tindakan Layanan
                </label>
                <textarea
                  value={formData.tindakan_layanan}
                  onChange={(e) =>
                    handleInputChange("tindakan_layanan", e.target.value)
                  }
                  disabled={mode === "view"}
                  rows="3"
                  className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 text-sm min-h-[120px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                  placeholder="Jelaskan tindakan yang dilakukan..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                  Hasil Layanan
                </label>
                <textarea
                  value={formData.hasil_layanan}
                  onChange={(e) =>
                    handleInputChange("hasil_layanan", e.target.value)
                  }
                  disabled={mode === "view"}
                  rows="3"
                  className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 text-sm min-h-[120px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                  placeholder="Jelaskan hasil dari layanan yang diberikan..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                Rencana Tindak Lanjut
              </label>
              <textarea
                value={formData.rencana_tindak_lanjut}
                onChange={(e) =>
                  handleInputChange("rencana_tindak_lanjut", e.target.value)
                }
                disabled={mode === "view"}
                rows="2"
                className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 text-sm min-h-[90px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                placeholder="Jelaskan rencana tindak lanjut..."
              />
            </div>
          </div>

          {/* Follow-up */}
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <Calendar className="text-purple-600 dark:text-purple-400 w-4 h-4 sm:w-5 sm:h-5" />
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm sm:text-base">
                Follow-up
              </h3>
            </div>

            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center gap-2 sm:gap-3">
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
                  className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400 rounded focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 touch-target bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                />
                <label
                  htmlFor="perlu_followup"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  Perlu Follow-up / Konseling Lanjutan
                </label>
              </div>

              {formData.perlu_followup && (
                <div className="ml-0 sm:ml-8 mt-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                    Tanggal Follow-up *
                  </label>
                  <input
                    type="date"
                    value={formData.tanggal_followup}
                    onChange={(e) =>
                      handleInputChange("tanggal_followup", e.target.value)
                    }
                    disabled={mode === "view"}
                    min={new Date().toISOString().split("T")[0]}
                    className="dark-select w-full sm:w-64 px-3 sm:px-4 py-2.5 border border-purple-300 dark:border-purple-600 
                             rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 
                             disabled:bg-gray-100 dark:disabled:bg-gray-700 
                             disabled:text-gray-500 dark:disabled:text-gray-400 
                             text-sm min-h-[44px] touch-target
                             bg-white dark:bg-gray-800
                             text-gray-900 dark:text-gray-100"
                    required={formData.perlu_followup}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                Status Layanan
              </label>
              <select
                value={formData.status_layanan}
                onChange={(e) =>
                  handleInputChange("status_layanan", e.target.value)
                }
                disabled={mode === "view"}
                className="dark-select w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-gray-600 
                         rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                         disabled:bg-gray-100 dark:disabled:bg-gray-700 
                         disabled:text-gray-500 dark:disabled:text-gray-400 
                         text-sm min-h-[44px] touch-target
                         bg-white dark:bg-gray-800
                         text-gray-900 dark:text-gray-100">
                <option value="Dalam Proses">⏳ Dalam Proses</option>
                <option value="Selesai">✅ Selesai</option>
                <option value="Dibatalkan">❌ Dibatalkan</option>
              </select>
            </div>
          </div>

          {/* Action Buttons - Responsif */}
          {mode !== "view" && (
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="submit"
                className="flex-1 px-4 sm:px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-lg font-medium text-sm sm:text-base min-h-[44px] touch-target transition-colors duration-200 shadow-lg hover:shadow-xl">
                {mode === "add"
                  ? "✅ Tambah Data Konseling"
                  : "💾 Update Data Konseling"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 sm:px-6 py-3 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 text-gray-700 rounded-lg font-medium text-sm sm:text-base min-h-[44px] touch-target transition-colors duration-200">
                Batal
              </button>
            </div>
          )}

          {mode === "view" && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="w-full px-4 sm:px-6 py-3 bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg font-medium text-sm sm:text-base min-h-[44px] touch-target transition-colors duration-200">
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
