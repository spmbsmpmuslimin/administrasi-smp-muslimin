import React, { useState, useRef, useEffect, useCallback } from "react";

const StudentForm = ({
  editingStudent,
  setEditingStudent,
  students,
  onSaveStudent,
  isLoading,
}) => {
  const [formSuccess, setFormSuccess] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState(null);
  const [pendingDuplicateCallback, setPendingDuplicateCallback] =
    useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [showPekerjaanAyahLainnya, setShowPekerjaanAyahLainnya] =
    useState(false);
  const [showPekerjaanIbuLainnya, setShowPekerjaanIbuLainnya] = useState(false);

  const [formData, setFormData] = useState({
    nama_lengkap: "",
    jenis_kelamin: "",
    tempat_lahir: "",
    tanggal_lahir: "",
    asal_sekolah: "",
    nisn: "",
    nama_ayah: "",
    pekerjaan_ayah: "",
    pekerjaan_ayah_lainnya: "",
    pendidikan_ayah: "",
    nama_ibu: "",
    pekerjaan_ibu: "",
    pekerjaan_ibu_lainnya: "",
    pendidikan_ibu: "",
    no_hp: "",
    alamat: "",
  });

  const refs = {
    nama_lengkap: useRef(),
    jenis_kelamin: useRef(),
    tempat_lahir: useRef(),
    tanggal_lahir: useRef(),
    nama_ayah: useRef(),
    nama_ibu: useRef(),
    no_hp: useRef(),
    alamat: useRef(),
    asal_sekolah: useRef(),
    nisn: useRef(),
  };

  const convertDateToISO = useCallback((dateString) => {
    if (!dateString) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
      const parts = dateString.split("-");
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return null;
  }, []);

  const convertDateToDisplay = useCallback((isoDateString) => {
    if (!isoDateString) return "";
    if (/^\d{2}-\d{2}-\d{4}$/.test(isoDateString)) return isoDateString;
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoDateString)) {
      const parts = isoDateString.split("-");
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return isoDateString;
  }, []);

  // Daftar pekerjaan standar
  const pekerjaanListAyah = [
    "PNS/TNI/Polri",
    "Karyawan Swasta",
    "Wiraswasta/Pedagang",
    "Petani",
    "Buruh",
    "Guru/Dosen",
    "Dokter/Tenaga Kesehatan",
    "Sopir/Driver",
    "Pensiunan",
    "Tidak Bekerja",
    "Lainnya",
  ];

  const pekerjaanListIbu = [
    "Ibu Rumah Tangga",
    "PNS/TNI/Polri",
    "Karyawan Swasta",
    "Wiraswasta/Pedagang",
    "Petani",
    "Buruh",
    "Guru/Dosen",
    "Dokter/Tenaga Kesehatan",
    "Pensiunan",
    "Tidak Bekerja",
    "Lainnya",
  ];

  useEffect(() => {
    if (editingStudent) {
      const pekerjaanAyah = editingStudent.pekerjaan_ayah || "";
      const pekerjaanIbu = editingStudent.pekerjaan_ibu || "";

      // Cek apakah pekerjaan ada di list standar
      const isAyahStandard = pekerjaanListAyah.includes(pekerjaanAyah);
      const isIbuStandard = pekerjaanListIbu.includes(pekerjaanIbu);

      setFormData({
        nama_lengkap: editingStudent.nama_lengkap || "",
        jenis_kelamin: editingStudent.jenis_kelamin || "",
        tempat_lahir: editingStudent.tempat_lahir || "",
        tanggal_lahir: convertDateToDisplay(editingStudent.tanggal_lahir) || "",
        asal_sekolah: editingStudent.asal_sekolah || "",
        nisn: editingStudent.nisn === "-" ? "" : editingStudent.nisn || "",
        nama_ayah: editingStudent.nama_ayah || "",
        pekerjaan_ayah: isAyahStandard ? pekerjaanAyah : "Lainnya",
        pekerjaan_ayah_lainnya: isAyahStandard ? "" : pekerjaanAyah,
        pendidikan_ayah: editingStudent.pendidikan_ayah || "",
        nama_ibu: editingStudent.nama_ibu || "",
        pekerjaan_ibu: isIbuStandard ? pekerjaanIbu : "Lainnya",
        pekerjaan_ibu_lainnya: isIbuStandard ? "" : pekerjaanIbu,
        pendidikan_ibu: editingStudent.pendidikan_ibu || "",
        no_hp: editingStudent.no_hp || "",
        alamat: editingStudent.alamat || "",
      });

      setShowPekerjaanAyahLainnya(!isAyahStandard && pekerjaanAyah !== "");
      setShowPekerjaanIbuLainnya(!isIbuStandard && pekerjaanIbu !== "");
      setCurrentStep(1);
    } else {
      setFormData({
        nama_lengkap: "",
        jenis_kelamin: "",
        tempat_lahir: "",
        tanggal_lahir: "",
        asal_sekolah: "",
        nisn: "",
        nama_ayah: "",
        pekerjaan_ayah: "",
        pekerjaan_ayah_lainnya: "",
        pendidikan_ayah: "",
        nama_ibu: "",
        pekerjaan_ibu: "",
        pekerjaan_ibu_lainnya: "",
        pendidikan_ibu: "",
        no_hp: "",
        alamat: "",
      });
      setShowPekerjaanAyahLainnya(false);
      setShowPekerjaanIbuLainnya(false);
      setCurrentStep(1);
    }
  }, [editingStudent, convertDateToDisplay]);

  const validateDateFormat = useCallback(
    (dateString) => /^\d{2}-\d{2}-\d{4}$/.test(dateString),
    []
  );

  const validateStudentInput = useCallback((student) => {
    const errors = [];
    const nameWords = student.nama_lengkap
      .trim()
      .split(" ")
      .filter((word) => word.length > 0);
    if (nameWords.length < 2)
      errors.push("Nama harus terdiri dari minimal 2 kata");
    if (!/^[a-zA-Z\s]+$/.test(student.nama_lengkap))
      errors.push("Nama hanya boleh mengandung huruf dan spasi");
    if (!/^(\+62|62|0)[0-9]{9,13}$/.test(student.no_hp.replace(/\s+/g, ""))) {
      errors.push("Format nomor HP tidak valid");
    }
    if (
      student.nisn &&
      student.nisn !== "-" &&
      !/^\d{10}$/.test(student.nisn)
    ) {
      errors.push("NISN harus berisi tepat 10 digit angka");
    }
    return errors;
  }, []);

  const formatDateInput = useCallback((input) => {
    let value = input.value.replace(/\D/g, "");
    if (value.length > 2 && value.length <= 4) {
      value = value.substring(0, 2) + "-" + value.substring(2);
    } else if (value.length > 4) {
      value =
        value.substring(0, 2) +
        "-" +
        value.substring(2, 4) +
        "-" +
        value.substring(4, 8);
    }
    input.value = value;
    setFormData((prev) => ({ ...prev, tanggal_lahir: value }));
  }, []);

  const checkForDuplicates = useCallback(
    (newName, existingStudents, excludeId = null) => {
      const calculateSimilarity = (str1, str2) => {
        const s1 = str1.toLowerCase().trim();
        const s2 = str2.toLowerCase().trim();
        if (s1 === s2) return 1.0;
        const longer = s1.length > s2.length ? s1 : s2;
        const shorter = s1.length > s2.length ? s2 : s1;
        if (longer.length === 0) return 1.0;
        let matches = 0;
        for (let i = 0; i < Math.min(longer.length, shorter.length); i++) {
          if (longer[i] === shorter[i]) matches++;
        }
        return matches / longer.length;
      };
      return existingStudents
        .filter((student) => student.id !== excludeId)
        .map((student) => ({
          student,
          similarity: calculateSimilarity(newName, student.nama_lengkap || ""),
        }))
        .filter((item) => item.similarity >= 0.8)
        .sort((a, b) => b.similarity - a.similarity);
    },
    []
  );

  const downloadWordTemplate = useCallback(() => {
    const htmlContent = `
<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>Formulir Pendaftaran SMP Muslimin Cililin</title>
<style>
  @page {
    size: A4;
    margin: 1.5cm;
  }
  body {
    font-family: 'Arial', sans-serif;
    font-size: 11pt;
  }
  .header {
    text-align: center;
    margin-bottom: 20px;
    border-bottom: 3px double #000;
    padding-bottom: 10px;
  }
  .header h1 {
    font-size: 16pt;
    font-weight: bold;
    margin: 3px 0;
  }
  .header h2 {
    font-size: 13pt;
    font-weight: bold;
    margin: 3px 0;
  }
  .header h3 {
    font-size: 11pt;
    margin: 3px 0;
  }
  .section-title {
    background-color: #e8f4f8;
    padding: 5px 8px;
    font-weight: bold;
    border: 1px solid #000;
    margin: 15px 0 10px 0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 5px 0;
  }
  td {
    padding: 5px 2px;
    vertical-align: top;
  }
  .label-col {
    width: 280px;
  }
  .colon-col {
    width: 15px;
    text-align: center;
  }
  .value-col {
    border-bottom: 1px dotted #000;
  }
  .checkbox {
    display: inline-block;
    border: 1px solid #000;
    width: 15px;
    height: 15px;
    margin: 0 3px 0 0;
    vertical-align: middle;
  }
  .alamat-box {
    border: 1px solid #000;
    min-height: 60px;
    padding: 5px;
  }
  .signature-table {
    margin-top: 30px;
  }
  .signature-table td {
    text-align: center;
    padding: 10px;
  }
  .ttd-line {
    border-bottom: 1px solid #000;
    width: 200px;
    margin: 60px auto 5px auto;
  }
</style>
</head>
<body>

<div class="header">
  <h1>SMP MUSLIMIN CILILIN</h1>
  <h2>FORMULIR PENDAFTARAN CALON SISWA BARU</h2>
  <h3>TAHUN AJARAN 2026/2027</h3>
</div>

<div class="section-title">BAGIAN A: DATA CALON SISWA</div>

<table>
  <tr>
    <td class="label-col">1. Nama Lengkap <strong>(*)</strong></td>
    <td class="colon-col">:</td>
    <td class="value-col">&nbsp;</td>
  </tr>
  <tr>
    <td class="label-col">2. Jenis Kelamin <strong>(*)</strong></td>
    <td class="colon-col">:</td>
    <td>
      <span class="checkbox"></span> Laki-laki &nbsp;&nbsp;&nbsp;&nbsp;
      <span class="checkbox"></span> Perempuan
    </td>
  </tr>
  <tr>
    <td class="label-col">3. Tempat Lahir <strong>(*)</strong></td>
    <td class="colon-col">:</td>
    <td class="value-col">&nbsp;</td>
  </tr>
  <tr>
    <td class="label-col">4. Tanggal Lahir <strong>(*)</strong></td>
    <td class="colon-col">:</td>
    <td class="value-col">&nbsp;</td>
  </tr>
  <tr>
    <td class="label-col">5. Asal Sekolah Dasar</td>
    <td class="colon-col">:</td>
    <td class="value-col">&nbsp;</td>
  </tr>
  <tr>
    <td class="label-col">6. NISN</td>
    <td class="colon-col">:</td>
    <td class="value-col">&nbsp;</td>
  </tr>
</table>

<div class="section-title">BAGIAN B: DATA ORANG TUA / WALI</div>

<p style="margin: 10px 0 5px 0;"><strong>DATA AYAH</strong></p>

<table>
  <tr>
    <td class="label-col">7. Nama Lengkap Ayah</td>
    <td class="colon-col">:</td>
    <td class="value-col">&nbsp;</td>
  </tr>
  <tr>
    <td class="label-col">8. Pekerjaan Ayah</td>
    <td class="colon-col">:</td>
    <td class="value-col">&nbsp;</td>
  </tr>
  <tr>
    <td class="label-col">9. Pendidikan Terakhir Ayah</td>
    <td class="colon-col">:</td>
    <td>
      <span class="checkbox"></span> SD &nbsp;
      <span class="checkbox"></span> SMP &nbsp;
      <span class="checkbox"></span> SMA &nbsp;
      <span class="checkbox"></span> D3 &nbsp;
      <span class="checkbox"></span> S1 &nbsp;
      <span class="checkbox"></span> S2
    </td>
  </tr>
</table>

<p style="margin: 10px 0 5px 0;"><strong>DATA IBU</strong></p>

<table>
  <tr>
    <td class="label-col">10. Nama Lengkap Ibu</td>
    <td class="colon-col">:</td>
    <td class="value-col">&nbsp;</td>
  </tr>
  <tr>
    <td class="label-col">11. Pekerjaan Ibu</td>
    <td class="colon-col">:</td>
    <td class="value-col">&nbsp;</td>
  </tr>
  <tr>
    <td class="label-col">12. Pendidikan Terakhir Ibu</td>
    <td class="colon-col">:</td>
    <td>
      <span class="checkbox"></span> SD &nbsp;
      <span class="checkbox"></span> SMP &nbsp;
      <span class="checkbox"></span> SMA &nbsp;
      <span class="checkbox"></span> D3 &nbsp;
      <span class="checkbox"></span> S1 &nbsp;
      <span class="checkbox"></span> S2
    </td>
  </tr>
</table>

<p style="margin: 10px 0 5px 0;"><strong>DATA KONTAK</strong></p>

<table>
  <tr>
    <td class="label-col">13. No. HP Orang Tua <strong>(*)</strong></td>
    <td class="colon-col">:</td>
    <td class="value-col">&nbsp;</td>
  </tr>
  <tr>
    <td class="label-col" style="vertical-align: top;">14. Alamat Lengkap <strong>(*)</strong></td>
    <td class="colon-col" style="vertical-align: top;">:</td>
    <td>
      <div class="alamat-box"></div>
    </td>
  </tr>
</table>

<table class="signature-table">
  <tr>
    <td style="width: 40%;"></td>
    <td style="text-align: left;">
      Cililin, .................................
    </td>
  </tr>
  <tr>
    <td>
      <strong>Orang Tua/Wali</strong>
      <div class="ttd-line"></div>
      ( ................................. )
    </td>
    <td>
      <strong>Calon Siswa</strong>
      <div class="ttd-line"></div>
      ( ................................. )
    </td>
  </tr>
</table>

</body>
</html>`;

    const blob = new Blob(["\ufeff", htmlContent], {
      type: "application/msword;charset=utf-8",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Formulir_Pendaftaran_SMP_Muslimin_Cililin.doc";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Tentukan pekerjaan final
    const finalPekerjaanAyah =
      formData.pekerjaan_ayah === "Lainnya"
        ? formData.pekerjaan_ayah_lainnya
        : formData.pekerjaan_ayah;

    const finalPekerjaanIbu =
      formData.pekerjaan_ibu === "Lainnya"
        ? formData.pekerjaan_ibu_lainnya
        : formData.pekerjaan_ibu;

    const studentData = {
      nama_lengkap: formData.nama_lengkap,
      jenis_kelamin: formData.jenis_kelamin,
      tempat_lahir: formData.tempat_lahir,
      tanggal_lahir: convertDateToISO(formData.tanggal_lahir),
      asal_sekolah: formData.asal_sekolah,
      nisn: formData.nisn || "-",
      tanggal_daftar: editingStudent
        ? convertDateToISO(editingStudent.tanggal_daftar)
        : new Date().toISOString().split("T")[0],
    };

    const parentData = {
      nama_ayah: formData.nama_ayah,
      pekerjaan_ayah: finalPekerjaanAyah,
      pendidikan_ayah: formData.pendidikan_ayah,
      nama_ibu: formData.nama_ibu,
      pekerjaan_ibu: finalPekerjaanIbu,
      pendidikan_ibu: formData.pendidikan_ibu,
      no_hp: formData.no_hp,
      alamat: formData.alamat,
    };

    const studentForValidation = {
      ...studentData,
      no_hp: parentData.no_hp,
      tanggal_lahir: formData.tanggal_lahir,
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

    const duplicates = checkForDuplicates(
      studentData.nama_lengkap,
      students,
      editingStudent?.id || null
    );
    if (duplicates.length > 0 && !pendingDuplicateCallback) {
      setDuplicateInfo(duplicates[0]);
      setShowDuplicateWarning(true);
      setPendingDuplicateCallback(
        () => () => proceedWithSave({ studentData, parentData })
      );
      return;
    }

    proceedWithSave({ studentData, parentData });
  };

  const proceedWithSave = async ({ studentData, parentData }) => {
    const success = await onSaveStudent({
      studentData,
      parentData,
      isEdit: !!editingStudent,
    });

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
      nama_lengkap: "",
      jenis_kelamin: "",
      tempat_lahir: "",
      tanggal_lahir: "",
      asal_sekolah: "",
      nisn: "",
      nama_ayah: "",
      pekerjaan_ayah: "",
      pekerjaan_ayah_lainnya: "",
      pendidikan_ayah: "",
      nama_ibu: "",
      pekerjaan_ibu: "",
      pekerjaan_ibu_lainnya: "",
      pendidikan_ibu: "",
      no_hp: "",
      alamat: "",
    });
    setEditingStudent(null);
    setShowDuplicateWarning(false);
    setPendingDuplicateCallback(null);
    setShowPekerjaanAyahLainnya(false);
    setShowPekerjaanIbuLainnya(false);
    setCurrentStep(1);
  }, [setEditingStudent]);

  const updateFormData = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Handle show/hide input lainnya
    if (field === "pekerjaan_ayah") {
      setShowPekerjaanAyahLainnya(value === "Lainnya");
      if (value !== "Lainnya") {
        setFormData((prev) => ({ ...prev, pekerjaan_ayah_lainnya: "" }));
      }
    }

    if (field === "pekerjaan_ibu") {
      setShowPekerjaanIbuLainnya(value === "Lainnya");
      if (value !== "Lainnya") {
        setFormData((prev) => ({ ...prev, pekerjaan_ibu_lainnya: "" }));
      }
    }
  }, []);

  const viewDuplicate = useCallback(() => {
    if (duplicateInfo) {
      const studentName =
        duplicateInfo.student.nama_lengkap || "Tidak diketahui";
      const studentSchool =
        duplicateInfo.student.asal_sekolah || "Tidak diketahui";
      alert(`Data ditemukan: ${studentName} dari ${studentSchool}`);
      setShowDuplicateWarning(false);
    }
  }, [duplicateInfo]);

  const continueAnyway = useCallback(() => {
    if (pendingDuplicateCallback) pendingDuplicateCallback();
  }, [pendingDuplicateCallback]);

  const nextStep = useCallback(() => {
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
    setCurrentStep((prev) => prev + 1);
  }, [currentStep, formData, validateDateFormat]);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => prev - 1);
  }, []);

  const steps = [
    { number: 1, title: "Data Siswa", icon: "fa-user" },
    { number: 2, title: "Data Orang Tua", icon: "fa-users" },
  ];

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800 dark:text-gray-200 flex items-center gap-2 sm:gap-3">
        <i className="fas fa-file-alt text-blue-600 dark:text-blue-400 text-lg sm:text-xl"></i>
        Form Pendaftaran SMP Muslimin Cililin
      </h2>

      <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-2 border-blue-200 dark:border-blue-700 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
        <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse flex-shrink-0"></div>
        <span className="text-blue-800 dark:text-blue-300 text-xs sm:text-sm">
          <i className="fas fa-shield-alt mr-1"></i>
          Sistem Terhubung Ke Database - Data Aman
        </span>
      </div>

      {formSuccess && (
        <div className="bg-gradient-to-r from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/30 text-green-800 dark:text-green-300 p-3 sm:p-4 rounded-xl border-l-4 border-green-500 dark:border-green-600 mb-4 sm:mb-6 animate-slide-down">
          <i className="fas fa-check-circle mr-2"></i>
          Data berhasil disimpan dan siswa diterima!
        </div>
      )}

      {showDuplicateWarning && duplicateInfo && (
        <div className="bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 animate-slide-down">
          <i className="fas fa-exclamation-triangle text-yellow-600 dark:text-yellow-400 text-lg flex-shrink-0"></i>
          <span className="text-yellow-800 dark:text-yellow-300 text-sm flex-1">
            Nama serupa "{duplicateInfo.student.nama_lengkap}" sudah terdaftar!
            ({Math.round(duplicateInfo.similarity * 100)}% kemiripan)
          </span>
          <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
            <button
              className="bg-blue-600 dark:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex-1 sm:flex-none min-h-[40px]"
              onClick={viewDuplicate}>
              Lihat Data
            </button>
            <button
              className="bg-green-600 dark:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 dark:hover:bg-green-600 transition-colors flex-1 sm:flex-none min-h-[40px]"
              onClick={continueAnyway}>
              Tetap Simpan
            </button>
          </div>
        </div>
      )}

      <div
        className={`text-center font-bold mb-3 sm:mb-4 p-2 rounded-lg ${
          editingStudent
            ? "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300"
            : "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
        }`}>
        <i className={`fas ${editingStudent ? "fa-edit" : "fa-plus"} mr-2`}></i>
        Mode:{" "}
        {editingStudent
          ? `Edit Data - ${editingStudent.nama_lengkap}`
          : "Tambah Data Baru"}
      </div>

      <div className="sm:hidden bg-white dark:bg-gray-800 rounded-lg p-3 mb-4 border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-3">
          {steps.map((step, index) => (
            <div key={step.number} className="flex flex-col items-center">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ${
                  currentStep >= step.number
                    ? "bg-blue-500 dark:bg-blue-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                }`}>
                {currentStep > step.number ? (
                  <i className="fas fa-check text-xs"></i>
                ) : (
                  step.number
                )}
              </div>
              <span className="text-xs mt-1 text-gray-600 dark:text-gray-400">
                {step.title}
              </span>
            </div>
          ))}
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
          <div
            className="bg-blue-500 dark:bg-blue-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}></div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {(currentStep === 1 || window.innerWidth >= 640) && (
          <div className="bg-blue-50 dark:bg-gray-800 border-l-4 border-blue-400 dark:border-blue-600 p-3 sm:p-4 rounded-r-lg">
            <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
              <i className="fas fa-user text-blue-600 dark:text-blue-400"></i>
              Data Calon Siswa SMP
            </h3>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1 sm:mb-2 text-sm sm:text-base">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nama_lengkap}
                  onChange={(e) =>
                    updateFormData("nama_lengkap", e.target.value)
                  }
                  className="w-full p-3 sm:p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-sm sm:text-base transition-all duration-300 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900/30 focus:outline-none"
                  placeholder="Masukkan nama lengkap sesuai akta kelahiran"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1 sm:mb-2 text-sm sm:text-base">
                    Jenis Kelamin <span className="text-red-500">*</span>
                    <small className="block text-gray-500 dark:text-gray-400 font-normal text-xs sm:text-sm">
                      Pilih jenis kelamin siswa
                    </small>
                  </label>
                  <select
                    value={formData.jenis_kelamin}
                    onChange={(e) =>
                      updateFormData("jenis_kelamin", e.target.value)
                    }
                    className="w-full p-3 sm:p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-sm sm:text-base transition-all duration-300 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900/30 focus:outline-none appearance-none"
                    required>
                    <option value="" className="text-gray-400">
                      Pilih Jenis Kelamin
                    </option>
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1 sm:mb-2 text-sm sm:text-base">
                    NISN (Opsional)
                    <small className="block text-gray-500 dark:text-gray-400 font-normal text-xs sm:text-sm">
                      Kosongkan jika belum memiliki NISN
                    </small>
                  </label>
                  <input
                    type="text"
                    value={formData.nisn}
                    onChange={(e) => updateFormData("nisn", e.target.value)}
                    className="w-full p-3 sm:p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-sm sm:text-base transition-all duration-300 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900/30 focus:outline-none"
                    placeholder="10 digit NISN"
                    maxLength="10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1 sm:mb-2 text-sm sm:text-base">
                    Tempat Lahir <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.tempat_lahir}
                    onChange={(e) =>
                      updateFormData("tempat_lahir", e.target.value)
                    }
                    className="w-full p-3 sm:p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-sm sm:text-base transition-all duration-300 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900/30 focus:outline-none"
                    placeholder="Kota kelahiran"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1 sm:mb-2 text-sm sm:text-base">
                    Tanggal Lahir <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.tanggal_lahir}
                    onChange={(e) =>
                      updateFormData("tanggal_lahir", e.target.value)
                    }
                    onInput={(e) => formatDateInput(e.target)}
                    className="w-full p-3 sm:p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-sm sm:text-base transition-all duration-300 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900/30 focus:outline-none"
                    placeholder="DD-MM-YYYY"
                    maxLength="10"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1 sm:mb-2 text-sm sm:text-base">
                  Asal Sekolah Dasar (SD)
                  <small className="block text-gray-500 dark:text-gray-400 font-normal text-xs sm:text-sm">
                    Nama SD asal calon siswa
                  </small>
                </label>
                <input
                  type="text"
                  value={formData.asal_sekolah}
                  onChange={(e) =>
                    updateFormData("asal_sekolah", e.target.value)
                  }
                  className="w-full p-3 sm:p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-sm sm:text-base transition-all duration-300 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900/30 focus:outline-none"
                  placeholder="Nama SD asal"
                />
              </div>
            </div>
          </div>
        )}

        {(currentStep === 2 || window.innerWidth >= 640) && (
          <div className="bg-blue-50 dark:bg-gray-800 border-l-4 border-blue-400 dark:border-blue-600 p-3 sm:p-4 rounded-r-lg">
            <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
              <i className="fas fa-users text-blue-600 dark:text-blue-400"></i>
              Data Orang Tua/Wali
            </h3>

            <div className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1 sm:mb-2 text-sm sm:text-base">
                    Nama Ayah
                  </label>
                  <input
                    type="text"
                    value={formData.nama_ayah}
                    onChange={(e) =>
                      updateFormData("nama_ayah", e.target.value)
                    }
                    className="w-full p-3 sm:p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-sm sm:text-base transition-all duration-300 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900/30 focus:outline-none"
                    placeholder="Nama lengkap ayah"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1 sm:mb-2 text-sm sm:text-base">
                    Nama Ibu
                  </label>
                  <input
                    type="text"
                    value={formData.nama_ibu}
                    onChange={(e) => updateFormData("nama_ibu", e.target.value)}
                    className="w-full p-3 sm:p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-sm sm:text-base transition-all duration-300 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900/30 focus:outline-none"
                    placeholder="Nama lengkap ibu"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1 sm:mb-2 text-sm sm:text-base">
                    Pekerjaan Ayah
                  </label>
                  <select
                    value={formData.pekerjaan_ayah}
                    onChange={(e) =>
                      updateFormData("pekerjaan_ayah", e.target.value)
                    }
                    className="w-full p-3 sm:p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-sm sm:text-base transition-all duration-300 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900/30 focus:outline-none appearance-none">
                    <option value="" className="text-gray-400">
                      Pilih Pekerjaan
                    </option>
                    {pekerjaanListAyah.map((pekerjaan) => (
                      <option key={pekerjaan} value={pekerjaan}>
                        {pekerjaan}
                      </option>
                    ))}
                  </select>

                  {showPekerjaanAyahLainnya && (
                    <input
                      type="text"
                      value={formData.pekerjaan_ayah_lainnya}
                      onChange={(e) =>
                        updateFormData("pekerjaan_ayah_lainnya", e.target.value)
                      }
                      className="w-full p-3 sm:p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-sm sm:text-base transition-all duration-300 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900/30 focus:outline-none mt-2"
                      placeholder="Sebutkan pekerjaan lainnya"
                      required
                    />
                  )}
                </div>

                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1 sm:mb-2 text-sm sm:text-base">
                    Pekerjaan Ibu
                  </label>
                  <select
                    value={formData.pekerjaan_ibu}
                    onChange={(e) =>
                      updateFormData("pekerjaan_ibu", e.target.value)
                    }
                    className="w-full p-3 sm:p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-sm sm:text-base transition-all duration-300 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900/30 focus:outline-none appearance-none">
                    <option value="" className="text-gray-400">
                      Pilih Pekerjaan
                    </option>
                    {pekerjaanListIbu.map((pekerjaan) => (
                      <option key={pekerjaan} value={pekerjaan}>
                        {pekerjaan}
                      </option>
                    ))}
                  </select>

                  {showPekerjaanIbuLainnya && (
                    <input
                      type="text"
                      value={formData.pekerjaan_ibu_lainnya}
                      onChange={(e) =>
                        updateFormData("pekerjaan_ibu_lainnya", e.target.value)
                      }
                      className="w-full p-3 sm:p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-sm sm:text-base transition-all duration-300 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900/30 focus:outline-none mt-2"
                      placeholder="Sebutkan pekerjaan lainnya"
                      required
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1 sm:mb-2 text-sm sm:text-base">
                    Pendidikan Ayah
                  </label>
                  <select
                    value={formData.pendidikan_ayah}
                    onChange={(e) =>
                      updateFormData("pendidikan_ayah", e.target.value)
                    }
                    className="w-full p-3 sm:p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-sm sm:text-base transition-all duration-300 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900/30 focus:outline-none appearance-none">
                    <option value="" className="text-gray-400">
                      Pilih Pendidikan
                    </option>
                    <option value="SD/Sederajat">SD/Sederajat</option>
                    <option value="SMP/Sederajat">SMP/Sederajat</option>
                    <option value="SMA/Sederajat">SMA/Sederajat</option>
                    <option value="D3">D3</option>
                    <option value="S1">S1</option>
                    <option value="S2">S2</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1 sm:mb-2 text-sm sm:text-base">
                    Pendidikan Ibu
                  </label>
                  <select
                    value={formData.pendidikan_ibu}
                    onChange={(e) =>
                      updateFormData("pendidikan_ibu", e.target.value)
                    }
                    className="w-full p-3 sm:p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-sm sm:text-base transition-all duration-300 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900/30 focus:outline-none appearance-none">
                    <option value="" className="text-gray-400">
                      Pilih Pendidikan
                    </option>
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
                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1 sm:mb-2 text-sm sm:text-base">
                  No. HP Orang Tua <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.no_hp}
                  onChange={(e) => updateFormData("no_hp", e.target.value)}
                  className="w-full p-3 sm:p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-sm sm:text-base transition-all duration-300 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900/30 focus:outline-none"
                  placeholder="Contoh: 081234567890"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1 sm:mb-2 text-sm sm:text-base">
                  Alamat Lengkap <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.alamat}
                  onChange={(e) => updateFormData("alamat", e.target.value)}
                  className="w-full p-3 sm:p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-sm sm:text-base transition-all duration-300 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900/30 focus:outline-none resize-none"
                  rows="3"
                  placeholder="Alamat lengkap tempat tinggal"
                  required
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 pt-3 sm:pt-4">
          {window.innerWidth < 640 && currentStep > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-700 dark:to-blue-500 text-white p-3 sm:p-4 rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 hover:shadow-lg flex items-center justify-center gap-2 sm:gap-3 min-h-[48px]">
              <i className="fas fa-arrow-left"></i>
              Kembali
            </button>
          )}

          {window.innerWidth < 640 && currentStep < 2 && (
            <button
              type="button"
              onClick={nextStep}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-700 dark:to-blue-500 text-white p-3 sm:p-4 rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 hover:shadow-lg flex items-center justify-center gap-2 sm:gap-3 min-h-[48px]">
              Lanjut
              <i className="fas fa-arrow-right"></i>
            </button>
          )}

          {(window.innerWidth >= 640 || currentStep === 2) && (
            <>
              <button
                type="button"
                onClick={downloadWordTemplate}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-400 dark:from-green-700 dark:to-green-500 text-white p-3 sm:p-4 rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 hover:shadow-lg flex items-center justify-center gap-2 sm:gap-3 min-h-[48px]">
                <i className="fas fa-file-download text-sm sm:text-base"></i>
                <span className="hidden sm:inline">Download Form</span>
                <span className="sm:hidden">Download</span>
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-700 dark:to-blue-500 text-white p-3 sm:p-4 rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 hover:shadow-lg disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:gap-3 min-h-[48px]">
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span className="hidden sm:inline">Menyimpan...</span>
                    <span className="sm:hidden">Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-save text-sm sm:text-base"></i>
                    {editingStudent ? "Update Data" : "Simpan Data"}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-300 dark:from-blue-600 dark:to-blue-400 text-white p-3 sm:p-4 rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 hover:shadow-lg flex items-center justify-center gap-2 sm:gap-3 min-h-[48px]">
                <i className="fas fa-undo text-sm sm:text-base"></i>
                <span className="hidden sm:inline">Reset Form</span>
                <span className="sm:hidden">Reset</span>
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};

export default StudentForm;
