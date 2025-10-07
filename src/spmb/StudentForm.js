import React, { useState, useRef, useEffect, useCallback } from 'react';

const StudentForm = ({ editingStudent, setEditingStudent, students, onSaveStudent, isLoading }) => {
  const [formSuccess, setFormSuccess] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState(null);
  const [pendingDuplicateCallback, setPendingDuplicateCallback] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Data siswa SMP
    nama_lengkap: "", jenis_kelamin: "", tempat_lahir: "", tanggal_lahir: "",
    asal_sekolah: "", nisn: "",
    
    // Data ortu
    nama_ayah: "", pekerjaan_ayah: "", pendidikan_ayah: "",
    nama_ibu: "", pekerjaan_ibu: "", pendidikan_ibu: "",
    no_hp: "", alamat: ""
  });

  // Refs untuk form inputs
  const refs = {
    nama_lengkap: useRef(), jenis_kelamin: useRef(), tempat_lahir: useRef(),
    tanggal_lahir: useRef(), nama_ayah: useRef(), nama_ibu: useRef(),
    no_hp: useRef(), alamat: useRef(), asal_sekolah: useRef(), nisn: useRef()
  };

  // Helper function untuk convert date format - FIXED
  const convertDateToISO = useCallback((dateString) => {
    if (!dateString) return null;
    
    // Jika sudah format YYYY-MM-DD, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // Jika format DD-MM-YYYY, convert ke YYYY-MM-DD
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
      const parts = dateString.split('-');
      const day = parts[0];
      const month = parts[1]; 
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    
    return null;
  }, []);

  // Helper function untuk convert date dari ISO ke display format
  const convertDateToDisplay = useCallback((isoDateString) => {
    if (!isoDateString) return '';
    
    // Jika sudah format DD-MM-YYYY, return as is
    if (/^\d{2}-\d{2}-\d{4}$/.test(isoDateString)) {
      return isoDateString;
    }
    
    // Jika format YYYY-MM-DD, convert ke DD-MM-YYYY
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoDateString)) {
      const parts = isoDateString.split('-');
      const year = parts[0];
      const month = parts[1];
      const day = parts[2];
      return `${day}-${month}-${year}`;
    }
    
    return isoDateString;
  }, []);

  // Sync form dengan editing student
  useEffect(() => {
    if (editingStudent) {
      setFormData({
        nama_lengkap: editingStudent.nama_lengkap || "",
        jenis_kelamin: editingStudent.jenis_kelamin || "",
        tempat_lahir: editingStudent.tempat_lahir || "",
        tanggal_lahir: convertDateToDisplay(editingStudent.tanggal_lahir) || "",
        asal_sekolah: editingStudent.asal_sekolah || "",
        nisn: editingStudent.nisn === "-" ? "" : (editingStudent.nisn || ""),
        
        // Data ortu dari database
        nama_ayah: editingStudent.nama_ayah || "",
        pekerjaan_ayah: editingStudent.pekerjaan_ayah || "",
        pendidikan_ayah: editingStudent.pendidikan_ayah || "",
        nama_ibu: editingStudent.nama_ibu || "",
        pekerjaan_ibu: editingStudent.pekerjaan_ibu || "",
        pendidikan_ibu: editingStudent.pendidikan_ibu || "",
        no_hp: editingStudent.no_hp || "",
        alamat: editingStudent.alamat || ""
      });
      setCurrentStep(1);
    } else {
      setFormData({
        nama_lengkap: "", jenis_kelamin: "", tempat_lahir: "", tanggal_lahir: "",
        asal_sekolah: "", nisn: "",
        nama_ayah: "", pekerjaan_ayah: "", pendidikan_ayah: "",
        nama_ibu: "", pekerjaan_ibu: "", pendidikan_ibu: "",
        no_hp: "", alamat: ""
      });
      setCurrentStep(1);
    }
  }, [editingStudent, convertDateToDisplay]);

  // Validation functions
  const validateDateFormat = useCallback((dateString) => /^\d{2}-\d{2}-\d{4}$/.test(dateString), []);

  const validateStudentInput = useCallback((student) => {
    const errors = [];
    
    // Name validation
    const nameWords = student.nama_lengkap.trim().split(" ").filter(word => word.length > 0);
    if (nameWords.length < 2) errors.push("Nama harus terdiri dari minimal 2 kata");
    if (!/^[a-zA-Z\s]+$/.test(student.nama_lengkap)) errors.push("Nama hanya boleh mengandung huruf dan spasi");

    // Phone validation
    if (!/^(\+62|62|0)[0-9]{9,13}$/.test(student.no_hp.replace(/\s+/g, ""))) {
      errors.push("Format nomor HP tidak valid");
    }

    // NISN validation (optional but if filled must be valid)
    if (student.nisn && student.nisn !== "-" && !/^\d{10}$/.test(student.nisn)) {
      errors.push("NISN harus berisi tepat 10 digit angka");
    }

    return errors;
  }, []);

  const formatDateInput = useCallback((input) => {
    let value = input.value.replace(/\D/g, "");
    if (value.length > 2 && value.length <= 4) {
      value = value.substring(0, 2) + "-" + value.substring(2);
    } else if (value.length > 4) {
      value = value.substring(0, 2) + "-" + value.substring(2, 4) + "-" + value.substring(4, 8);
    }
    input.value = value;
    setFormData(prev => ({ ...prev, tanggal_lahir: value }));
  }, []);

  const checkForDuplicates = useCallback((newName, existingStudents, excludeId = null) => {
    const calculateSimilarity = (str1, str2) => {
      const s1 = str1.toLowerCase().trim();
      const s2 = str2.toLowerCase().trim();
      if (s1 === s2) return 1.0;

      const longer = s1.length > s2.length ? s1 : s2;
      const shorter = s1.length > s2.length ? s2 : s1;
      if (longer.length === 0) return 1.0;

      // Simple similarity calculation
      let matches = 0;
      for (let i = 0; i < Math.min(longer.length, shorter.length); i++) {
        if (longer[i] === shorter[i]) matches++;
      }
      return matches / longer.length;
    };

    return existingStudents
      .filter(student => student.id !== excludeId)
      .map(student => ({
        student,
        similarity: calculateSimilarity(newName, student.nama_lengkap || "")
      }))
      .filter(item => item.similarity >= 0.8)
      .sort((a, b) => b.similarity - a.similarity);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const studentData = {
      nama_lengkap: formData.nama_lengkap,
      jenis_kelamin: formData.jenis_kelamin,
      tempat_lahir: formData.tempat_lahir,
      tanggal_lahir: convertDateToISO(formData.tanggal_lahir),
      asal_sekolah: formData.asal_sekolah,
      nisn: formData.nisn || "-",
      tanggal_daftar: editingStudent ? 
        convertDateToISO(editingStudent.tanggal_daftar) : 
        new Date().toISOString().split('T')[0]
    };

    const parentData = {
      nama_ayah: formData.nama_ayah,
      pekerjaan_ayah: formData.pekerjaan_ayah,
      pendidikan_ayah: formData.pendidikan_ayah,
      nama_ibu: formData.nama_ibu,
      pekerjaan_ibu: formData.pekerjaan_ibu,
      pendidikan_ibu: formData.pendidikan_ibu,
      no_hp: formData.no_hp,
      alamat: formData.alamat
    };

    // Debug logging
    console.log('Original tanggal_lahir:', formData.tanggal_lahir);
    console.log('Converted tanggal_lahir:', studentData.tanggal_lahir);
    console.log('tanggal_daftar:', studentData.tanggal_daftar);

    // Gabung untuk validation
    const studentForValidation = {
      ...studentData,
      no_hp: parentData.no_hp,
      tanggal_lahir: formData.tanggal_lahir
    };

    const errors = validateStudentInput(studentForValidation);
    if (errors.length > 0) {
      alert("Error: " + errors[0]);
      return;
    }

    if (!validateDateFormat(formData.tanggal_lahir)) {
      alert("Format tanggal lahir harus DD-MM-YYYY!");
      return;
    }

    const duplicates = checkForDuplicates(studentData.nama_lengkap, students, editingStudent?.id || null);
    if (duplicates.length > 0 && !pendingDuplicateCallback) {
      setDuplicateInfo(duplicates[0]);
      setShowDuplicateWarning(true);
      setPendingDuplicateCallback(() => () => proceedWithSave({ studentData, parentData }));
      return;
    }

    proceedWithSave({ studentData, parentData });
  };

  const proceedWithSave = async ({ studentData, parentData }) => {
    const success = await onSaveStudent({ studentData, parentData, isEdit: !!editingStudent });
    
    if (success) {
      setFormSuccess(true);
      setTimeout(() => setFormSuccess(false), 3000);
      
      if (editingStudent) {
        setEditingStudent(null);
      }
      resetForm();
    }
    
    setShowDuplicateWarning(false);
    setPendingDuplicateCallback(null);
  };

  const resetForm = useCallback(() => {
    setFormData({
      nama_lengkap: "", jenis_kelamin: "", tempat_lahir: "", tanggal_lahir: "",
      asal_sekolah: "", nisn: "",
      nama_ayah: "", pekerjaan_ayah: "", pendidikan_ayah: "",
      nama_ibu: "", pekerjaan_ibu: "", pendidikan_ibu: "",
      no_hp: "", alamat: ""
    });
    setEditingStudent(null);
    setShowDuplicateWarning(false);
    setPendingDuplicateCallback(null);
    setCurrentStep(1);
  }, [setEditingStudent]);

  const updateFormData = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const viewDuplicate = useCallback(() => {
    if (duplicateInfo) {
      const studentName = duplicateInfo.student.nama_lengkap || "Tidak diketahui";
      const studentSchool = duplicateInfo.student.asal_sekolah || "Tidak diketahui";
      alert(`Data ditemukan: ${studentName} dari ${studentSchool}`);
      setShowDuplicateWarning(false);
    }
  }, [duplicateInfo]);

  const continueAnyway = useCallback(() => {
    if (pendingDuplicateCallback) pendingDuplicateCallback();
  }, [pendingDuplicateCallback]);

  const nextStep = useCallback(() => {
    // Validasi step 1 sebelum lanjut
    if (currentStep === 1) {
      if (!formData.nama_lengkap.trim()) {
        alert("Nama lengkap harus diisi!");
        return;
      }
      if (!formData.jenis_kelamin) {
        alert("Jenis kelamin harus dipilih!");
        return;
      }
      if (!formData.tempat_lahir.trim()) {
        alert("Tempat lahir harus diisi!");
        return;
      }
      if (!validateDateFormat(formData.tanggal_lahir)) {
        alert("Format tanggal lahir harus DD-MM-YYYY!");
        return;
      }
    }
    setCurrentStep(prev => prev + 1);
  }, [currentStep, formData, validateDateFormat]);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => prev - 1);
  }, []);

  // Steps untuk mobile
  const steps = [
    { number: 1, title: "Data Siswa", icon: "fa-user" },
    { number: 2, title: "Data Orang Tua", icon: "fa-users" }
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-3">
        <i className="fas fa-file-alt text-blue-600"></i>
        Form Pendaftaran SMP Muslimin Cililin
      </h2>

      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-4 mb-6 flex items-center gap-3">
        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
        <span className="text-blue-800">
          <i className="fas fa-shield-alt"></i> Sistem Terhubung Ke Database - Data Aman
        </span>
      </div>

      {formSuccess && (
        <div className="bg-gradient-to-r from-green-100 to-green-50 text-green-800 p-4 rounded-xl border-l-4 border-green-500 mb-6 animate-slide-down">
          <i className="fas fa-check-circle"></i> Data berhasil disimpan dan siswa diterima!
        </div>
      )}

      {showDuplicateWarning && duplicateInfo && (
        <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-300 rounded-xl p-4 mb-6 flex items-center gap-3 animate-slide-down">
          <i className="fas fa-exclamation-triangle text-yellow-600"></i>
          <span className="text-yellow-800 flex-1">
            Nama serupa "{duplicateInfo.student.nama_lengkap}" sudah terdaftar! 
            ({Math.round(duplicateInfo.similarity * 100)}% kemiripan)
          </span>
          <button
            className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
            onClick={viewDuplicate}
          >
            Lihat Data
          </button>
          <button
            className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors ml-2"
            onClick={continueAnyway}
          >
            Tetap Simpan
          </button>
        </div>
      )}

      <div className={`text-center font-bold mb-4 p-2 rounded-lg ${
        editingStudent ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
      }`}>
        <i className={`fas ${editingStudent ? 'fa-edit' : 'fa-plus'}`}></i>
        Mode: {editingStudent ? `Edit Data - ${editingStudent.nama_lengkap}` : "Tambah Data Baru"}
      </div>

      {/* Mobile Step Indicator */}
      <div className="sm:hidden bg-white rounded-lg p-4 mb-6 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          {steps.map((step, index) => (
            <div key={step.number} className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                currentStep >= step.number 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {currentStep > step.number ? <i className="fas fa-check text-xs"></i> : step.number}
              </div>
              <span className="text-xs mt-1 text-gray-600">{step.title}</span>
            </div>
          ))}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          ></div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* STEP 1: Data Siswa */}
        {(currentStep === 1 || window.innerWidth >= 640) && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
            <h3 className="font-semibold text-blue-800 mb-4 flex items-center gap-2">
              <i className="fas fa-user"></i>
              Data Calon Siswa SMP
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nama_lengkap}
                  onChange={(e) => updateFormData('nama_lengkap', e.target.value)}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl text-base transition-all duration-300 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-200 focus:outline-none focus:-translate-y-1"
                  placeholder="Masukkan nama lengkap sesuai akta kelahiran"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Jenis Kelamin <span className="text-red-500">*</span>
                    <small className="block text-gray-500 font-normal">
                      Pilih jenis kelamin siswa
                    </small>
                  </label>
                  <select
                    value={formData.jenis_kelamin}
                    onChange={(e) => updateFormData('jenis_kelamin', e.target.value)}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl text-base transition-all duration-300 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-200 focus:outline-none focus:-translate-y-1"
                    required
                  >
                    <option value="">Pilih Jenis Kelamin</option>
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    NISN (Opsional)
                    <small className="block text-gray-500 font-normal">
                      Kosongkan jika belum memiliki NISN
                    </small>
                  </label>
                  <input
                    type="text"
                    value={formData.nisn}
                    onChange={(e) => updateFormData('nisn', e.target.value)}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl text-base transition-all duration-300 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-200 focus:outline-none focus:-translate-y-1"
                    placeholder="10 digit NISN"
                    maxLength="10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Tempat Lahir <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.tempat_lahir}
                    onChange={(e) => updateFormData('tempat_lahir', e.target.value)}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl text-base transition-all duration-300 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-200 focus:outline-none focus:-translate-y-1"
                    placeholder="Kota kelahiran"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Tanggal Lahir <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.tanggal_lahir}
                    onChange={(e) => updateFormData('tanggal_lahir', e.target.value)}
                    onInput={(e) => formatDateInput(e.target)}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl text-base transition-all duration-300 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-200 focus:outline-none focus:-translate-y-1"
                    placeholder="DD-MM-YYYY"
                    maxLength="10"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Asal Sekolah Dasar (SD)
                  <small className="block text-gray-500 font-normal">
                    Nama SD asal calon siswa
                  </small>
                </label>
                <input
                  type="text"
                  value={formData.asal_sekolah}
                  onChange={(e) => updateFormData('asal_sekolah', e.target.value)}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl text-base transition-all duration-300 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-200 focus:outline-none focus:-translate-y-1"
                  placeholder="Nama SD asal"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Data Orang Tua */}
        {(currentStep === 2 || window.innerWidth >= 640) && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
            <h3 className="font-semibold text-blue-800 mb-4 flex items-center gap-2">
              <i className="fas fa-users"></i>
              Data Orang Tua/Wali
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Nama Ayah
                  </label>
                  <input
                    type="text"
                    value={formData.nama_ayah}
                    onChange={(e) => updateFormData('nama_ayah', e.target.value)}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl text-base transition-all duration-300 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-200 focus:outline-none focus:-translate-y-1"
                    placeholder="Nama lengkap ayah"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Nama Ibu
                  </label>
                  <input
                    type="text"
                    value={formData.nama_ibu}
                    onChange={(e) => updateFormData('nama_ibu', e.target.value)}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl text-base transition-all duration-300 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-200 focus:outline-none focus:-translate-y-1"
                    placeholder="Nama lengkap ibu"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Pekerjaan Ayah
                  </label>
                  <input
                    type="text"
                    value={formData.pekerjaan_ayah}
                    onChange={(e) => updateFormData('pekerjaan_ayah', e.target.value)}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl text-base transition-all duration-300 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-200 focus:outline-none focus:-translate-y-1"
                    placeholder="Pekerjaan ayah"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Pekerjaan Ibu
                  </label>
                  <input
                    type="text"
                    value={formData.pekerjaan_ibu}
                    onChange={(e) => updateFormData('pekerjaan_ibu', e.target.value)}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl text-base transition-all duration-300 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-200 focus:outline-none focus:-translate-y-1"
                    placeholder="Pekerjaan ibu"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Pendidikan Ayah
                  </label>
                  <select
                    value={formData.pendidikan_ayah}
                    onChange={(e) => updateFormData('pendidikan_ayah', e.target.value)}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl text-base transition-all duration-300 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-200 focus:outline-none focus:-translate-y-1"
                  >
                    <option value="">Pilih Pendidikan</option>
                    <option value="SD/Sederajat">SD/Sederajat</option>
                    <option value="SMP/Sederajat">SMP/Sederajat</option>
                    <option value="SMA/Sederajat">SMA/Sederajat</option>
                    <option value="D3">D3</option>
                    <option value="S1">S1</option>
                    <option value="S2">S2</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Pendidikan Ibu
                  </label>
                  <select
                    value={formData.pendidikan_ibu}
                    onChange={(e) => updateFormData('pendidikan_ibu', e.target.value)}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl text-base transition-all duration-300 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-200 focus:outline-none focus:-translate-y-1"
                  >
                    <option value="">Pilih Pendidikan</option>
                    <option value="SD/Sederajat">SD/Sederajat</option>
                    <option value="SMP/Sederajat">SMP/Sederajat</option>
                    <option value="SMA/Sederajat">SMA/Sederajat</option>
                    <option value="D3">D3</option>
                    <option value="S1">S1</option>
                    <option value="S2">S2</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  No. HP Orang Tua <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.no_hp}
                  onChange={(e) => updateFormData('no_hp', e.target.value)}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl text-base transition-all duration-300 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-200 focus:outline-none focus:-translate-y-1"
                  placeholder="Contoh: 081234567890"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Alamat Lengkap <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.alamat}
                  onChange={(e) => updateFormData('alamat', e.target.value)}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl text-base transition-all duration-300 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-200 focus:outline-none focus:-translate-y-1"
                  rows="3"
                  placeholder="Alamat lengkap tempat tinggal"
                  required
                />
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-4 pt-4">
          {/* Mobile Step Navigation */}
          {window.innerWidth < 640 && currentStep > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-400 text-white p-4 rounded-xl font-semibold text-base transition-all duration-400 hover:-translate-y-1 hover:shadow-xl flex items-center justify-center gap-3"
            >
              <i className="fas fa-arrow-left"></i>
              Kembali
            </button>
          )}

          {window.innerWidth < 640 && currentStep < 2 && (
            <button
              type="button"
              onClick={nextStep}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-400 text-white p-4 rounded-xl font-semibold text-base transition-all duration-400 hover:-translate-y-1 hover:shadow-xl flex items-center justify-center gap-3"
            >
              Lanjut
              <i className="fas fa-arrow-right"></i>
            </button>
          )}

          {/* Desktop/Submit Buttons */}
          {(window.innerWidth >= 640 || currentStep === 2) && (
            <>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-400 text-white p-4 rounded-xl font-semibold text-base transition-all duration-400 hover:-translate-y-1 hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save"></i>
                    {editingStudent ? "Update Data" : "Simpan Data"}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-300 text-white p-4 rounded-xl font-semibold text-base transition-all duration-400 hover:-translate-y-1 hover:shadow-xl flex items-center justify-center gap-3"
              >
                <i className="fas fa-undo"></i>
                Reset Form
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};

export default StudentForm;