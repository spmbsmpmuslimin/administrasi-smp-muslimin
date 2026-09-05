// ClassOperations.js - Operations & Utilities untuk kelas management
// ⚠️ NIS TIDAK dilibatkan di proses pembagian kelas ini sama sekali --
// NIS dikasih sekolah belakangan setelah siswa fixed diterima & kelasnya
// final (proses terpisah).

import { exportClassDivision, exportClassDivisionNIS } from "./SpmbExcel";
import { generateNIS } from "./ClassDistribution";

// ⚠️ NIS SENGAJA TIDAK di-generate/disimpan di sini. NIS dikasih sekolah
// belakangan setelah siswa BENER-BENER fixed diterima & penempatan
// kelasnya final -- itu proses terpisah, bukan bagian dari pembagian
// kelas ini.

// Simpan pembagian ke database (kelas SAJA, NIS diisi belakangan di
// proses terpisah)
export const saveClassAssignments = async (
  classDistribution,
  supabase,
  setIsLoading,
  showToast,
  onRefreshData,
  setShowPreview,
  setClassDistribution,
  setEditMode,
  setHistory,
  setHistoryIndex
) => {
  if (!window.confirm("Simpan pembagian kelas ini?")) {
    return;
  }

  setIsLoading(true);
  try {
    const updates = [];

    Object.entries(classDistribution).forEach(([className, students]) => {
      students.forEach((student) => {
        updates.push({
          id: student.id,
          kelas: className,
        });
      });
    });

    for (const update of updates) {
      const { error } = await supabase
        .from("siswa_baru")
        .update({
          kelas: update.kelas,
        })
        .eq("id", update.id);

      if (error) throw error;
    }

    showToast(`✅ Berhasil menyimpan pembagian ${updates.length} siswa!`, "success");
    setShowPreview(false);
    setClassDistribution({});
    setEditMode(false);
    setHistory([]);
    setHistoryIndex(-1);

    if (onRefreshData) {
      await onRefreshData();
    }
  } catch (error) {
    console.error("Error saving assignments:", error);
    showToast("❌ Gagal menyimpan pembagian kelas", "error");
  } finally {
    setIsLoading(false);
  }
};

// Bersihin value kosong/placeholder ("-", "", null, undefined) jadi null
// beneran -- dipake pas mapping siswa_baru -> student_profile_details,
// biar kolom kayak NISN (yang di siswa_baru defaultnya "-" kalau kosong,
// lihat StudentForm.js) gak ikut nyangkut jadi teks "-" di profil resmi.
const cleanValue = (value) => {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed === "" || trimmed === "-" ? null : trimmed;
};

// Susun payload buat student_profile_details dari 1 row siswa_baru + id
// students yang baru di-insert. SEMUA field yang udah dikumpulin pas SPMB
// disalin ke sini (biar siswa/ortu gak perlu isi ulang manual lewat
// StudentProfile.js -- field2 ini emang udah dikunci read-only di sana,
// lihat catatan panjang di StudentProfile.js).
//
// ⚠️ MAPPING PENTING: siswa_baru.no_hp itu SEBENARNYA nomor HP ORANG TUA
// (lihat label "No. HP Orang Tua" di StudentForm.js), BUKAN nomor HP
// siswa. Jadi harus dipetakan ke `no_hp_ortu`, BUKAN ke `no_hp` (yang di
// student_profile_details artinya nomor pribadi siswa sendiri, field itu
// sengaja dibiarin kosong -- cuma bisa diisi belakangan sama siswa lewat
// StudentProfile.js kalau/pas udah punya HP sendiri).
//
// `no_daftar` diisi dari `no_pendaftaran` (nomor SPMB, contoh
// "SPMB-26.27.07.001") -- korespondensi alami, gak perlu Admin isi ulang.
//
// Field yang SENGAJA dibiarin null/gak disalin dari SPMB karena emang gak
// pernah dikumpulin di sana (murni Admin-only atau isian mandiri siswa
// belakangan): no_hp (siswa), no_ijazah, no_peserta_ujian, no_kip*, dusun,
// anak_ke, keterangan.
// *no_kip TETAP disalin kalau ada -- itu udah masuk field SPMB (Step 1).
//
// `verified_at` SENGAJA di-set null (belum diverifikasi) walau datanya
// dari form SPMB -- tetep perlu dicek TU ke dokumen fisik dulu, konsisten
// sama alur verifikasi yang udah ada di DataSiswaInduk.js.
function buildProfileDetailPayload(siswa, studentId) {
  return {
    student_id: studentId,
    jenis_kelamin: cleanValue(siswa.jenis_kelamin),
    tempat_lahir: cleanValue(siswa.tempat_lahir),
    tanggal_lahir: siswa.tanggal_lahir || null,
    nisn: cleanValue(siswa.nisn),
    sekolah_asal: cleanValue(siswa.asal_sekolah),
    agama: cleanValue(siswa.agama),
    nik: cleanValue(siswa.nik),
    no_kk: cleanValue(siswa.no_kk),
    no_akta_lahir: cleanValue(siswa.no_akta_lahir),
    no_kip: cleanValue(siswa.no_kip),
    no_daftar: cleanValue(siswa.no_pendaftaran),
    nama_ayah: cleanValue(siswa.nama_ayah),
    pekerjaan_ayah: cleanValue(siswa.pekerjaan_ayah),
    pendidikan_ayah: cleanValue(siswa.pendidikan_ayah),
    nik_ayah: cleanValue(siswa.nik_ayah),
    tempat_tgl_lahir_ayah: cleanValue(siswa.tempat_tgl_lahir_ayah),
    nama_ibu: cleanValue(siswa.nama_ibu),
    pekerjaan_ibu: cleanValue(siswa.pekerjaan_ibu),
    pendidikan_ibu: cleanValue(siswa.pendidikan_ibu),
    nik_ibu: cleanValue(siswa.nik_ibu),
    tempat_tgl_lahir_ibu: cleanValue(siswa.tempat_tgl_lahir_ibu),
    alamat: cleanValue(siswa.alamat),
    kode_pos: cleanValue(siswa.kode_pos),
    // ⚠️ no_hp di siswa_baru = HP ORANG TUA, dipetakan ke no_hp_ortu.
    no_hp_ortu: cleanValue(siswa.no_hp),
    updated_at: new Date().toISOString(),
    verified_at: null,
  };
}

// Transfer ke tabel students
export const transferToStudents = async (
  allStudents,
  supabase,
  setIsLoading,
  showToast,
  getCurrentAcademicYear,
  onRefreshData
) => {
  const studentsWithClass = allStudents.filter(
    (s) => s.kelas && !s.is_transferred && s.status === "diterima"
  );

  if (studentsWithClass.length === 0) {
    showToast("Tidak ada siswa dengan kelas yang bisa ditransfer", "error");
    return;
  }

  if (!window.confirm(`Transfer ${studentsWithClass.length} siswa ke tabel Students?`)) {
    return;
  }

  setIsLoading(true);
  try {
    const currentYear = getCurrentAcademicYear();

    for (const siswa of studentsWithClass) {
      // .select() ditambahin biar dapet balik `id` yang baru di-generate --
      // dibutuhin buat FK student_profile_details.student_id di bawah.
      const { data: insertedRows, error: insertError } = await supabase
        .from("students")
        .insert([
          {
            full_name: siswa.nama_lengkap,
            nis: null, // NIS diisi belakangan di proses assignment NIS terpisah (bukan di sini)
            class_id: siswa.kelas,
            academic_year: currentYear,
            gender: siswa.jenis_kelamin,
            is_active: true,
          },
        ])
        .select("id");

      if (insertError) throw insertError;

      const newStudentId = insertedRows?.[0]?.id;
      if (!newStudentId) {
        throw new Error(
          `Gagal ambil ID siswa baru buat ${siswa.nama_lengkap} (insert ke students sukses tapi id gak balik)`
        );
      }

      // Auto-isi student_profile_details dari data SPMB, biar siswa/ortu
      // gak perlu isi ulang manual data yang udah pernah dikasih pas
      // daftar. Upsert (bukan insert polos) buat jaga-jaga kalau baris
      // student_id itu somehow udah ada.
      const { error: profileError } = await supabase
        .from("student_profile_details")
        .upsert(buildProfileDetailPayload(siswa, newStudentId), {
          onConflict: "student_id",
        });

      if (profileError) throw profileError;

      const { error: updateError } = await supabase
        .from("siswa_baru")
        .update({
          is_transferred: true,
          transferred_at: new Date().toISOString(),
        })
        .eq("id", siswa.id);

      if (updateError) throw updateError;
    }

    showToast(`✅ Berhasil transfer ${studentsWithClass.length} siswa ke Students!`, "success");

    if (onRefreshData) {
      await onRefreshData();
    }
  } catch (error) {
    console.error("Error transferring students:", error);
    showToast("❌ Gagal transfer siswa: " + error.message, "error");
  } finally {
    setIsLoading(false);
  }
};

// Reset class assignments
export const resetClassAssignments = async (
  allStudents,
  supabase,
  setIsLoading,
  showToast,
  onRefreshData
) => {
  const studentsWithClass = allStudents.filter(
    (s) => s.kelas && !s.is_transferred && s.status === "diterima"
  );

  if (studentsWithClass.length === 0) {
    showToast("Tidak ada pembagian kelas yang bisa direset", "error");
    return;
  }

  if (
    !window.confirm(`Reset pembagian ${studentsWithClass.length} siswa? Semua kelas akan direset.`)
  ) {
    return;
  }

  setIsLoading(true);
  try {
    for (const siswa of studentsWithClass) {
      const { error } = await supabase
        .from("siswa_baru")
        .update({
          kelas: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", siswa.id);

      if (error) throw error;
    }

    showToast(`✅ Berhasil reset pembagian ${studentsWithClass.length} siswa!`, "success");

    if (onRefreshData) {
      await onRefreshData();
    }
  } catch (error) {
    console.error("Error resetting assignments:", error);
    showToast("❌ Gagal reset pembagian kelas", "error");
  } finally {
    setIsLoading(false);
  }
};

// Update kelas di database (untuk edit setelah disimpan)
export const updateClassAssignment = async (
  studentId,
  newClass,
  supabase,
  setIsLoading,
  showToast
) => {
  setIsLoading(true);
  try {
    const { error } = await supabase
      .from("siswa_baru")
      .update({
        kelas: newClass,
        updated_at: new Date().toISOString(),
      })
      .eq("id", studentId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error("Error updating class:", error);
    showToast("❌ Gagal update kelas", "error");
    return false;
  } finally {
    setIsLoading(false);
  }
};

// Handle move student (untuk kelas tersimpan)
export const handleMoveStudentSaved = async (
  studentId,
  fromClass,
  toClass,
  savedClassDistribution,
  allStudents,
  updateClassAssignment,
  setSavedClassDistribution,
  showToast,
  setIsLoading,
  supabase,
  onRefreshData // 🔥 TAMBAH PARAMETER INI
) => {
  if (!window.confirm(`Pindahkan siswa ke ${toClass}?`)) return;

  const success = await updateClassAssignment(
    studentId,
    toClass,
    supabase,
    setIsLoading,
    showToast
  );

  if (success) {
    showToast(`✅ Siswa dipindah ke ${toClass}`, "success");

    // 🔥 REFRESH DATA dari database
    if (onRefreshData) {
      await onRefreshData();
    }
  }
};

// Export Excel untuk preview
export const handleExportClassDivision = async (classDistribution, setIsExporting, showToast) => {
  if (!classDistribution || Object.keys(classDistribution).length === 0) {
    showToast("Tidak ada pembagian kelas untuk di-export", "error");
    return;
  }
  setIsExporting(true);
  try {
    await exportClassDivision(classDistribution, showToast);
  } catch (error) {
    console.error("Error in handleExportClassDivision:", error);
  } finally {
    setIsExporting(false);
  }
};

// Export Excel untuk kelas tersimpan
export const handleExportSavedClasses = async (allStudents, setIsExporting, showToast) => {
  const studentsWithClass = allStudents.filter(
    (s) => s.kelas && !s.is_transferred && s.status === "diterima"
  );
  if (studentsWithClass.length === 0) {
    showToast("Tidak ada siswa dengan kelas yang bisa di-export", "error");
    return;
  }
  const distribution = {};
  studentsWithClass.forEach((student) => {
    const className = student.kelas;
    if (!distribution[className]) {
      distribution[className] = [];
    }
    distribution[className].push(student);
  });
  setIsExporting(true);
  try {
    await exportClassDivision(distribution, showToast);
  } catch (error) {
    console.error("Error in handleExportSavedClasses:", error);
  } finally {
    setIsExporting(false);
  }
};

// Export Excel ringkas (per-kelas + NIS aja, tanpa Rekapitulasi/Sebaran
// Asal SD) -- dipake setelah generateAndSaveNIS jalan.
export const handleExportSavedClassesNIS = async (allStudents, setIsExporting, showToast) => {
  const studentsWithClass = allStudents.filter(
    (s) => s.kelas && !s.is_transferred && s.status === "diterima"
  );
  if (studentsWithClass.length === 0) {
    showToast("Tidak ada siswa dengan kelas yang bisa di-export", "error");
    return;
  }
  const studentsWithNIS = studentsWithClass.filter((s) => s.nis && s.nis !== "-");
  if (studentsWithNIS.length === 0) {
    showToast("Belum ada siswa yang punya NIS -- generate NIS dulu", "error");
    return;
  }
  const distribution = {};
  studentsWithClass.forEach((student) => {
    const className = student.kelas;
    if (!distribution[className]) {
      distribution[className] = [];
    }
    distribution[className].push(student);
  });
  setIsExporting(true);
  try {
    await exportClassDivisionNIS(distribution, showToast);
  } catch (error) {
    console.error("Error in handleExportSavedClassesNIS:", error);
  } finally {
    setIsExporting(false);
  }
};

// Drag & Drop Handlers
export const handleDragStart = (e, student, fromClass, setDraggedStudent) => {
  setDraggedStudent({ student, fromClass });
  e.dataTransfer.effectAllowed = "move";
};

export const handleDragOver = (e, toClass, setDragOverClass) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  setDragOverClass(toClass);
};

export const handleDragLeave = (setDragOverClass) => {
  setDragOverClass(null);
};

export const handleDrop = (
  e,
  toClass,
  draggedStudent,
  currentDistribution,
  setDistribution,
  showSavedClasses,
  saveToHistory,
  setDraggedStudent,
  setDragOverClass,
  showToast,
  setHistory,
  setHistoryIndex,
  historyIndex
) => {
  e.preventDefault();
  if (!draggedStudent || draggedStudent.fromClass === toClass) {
    setDraggedStudent(null);
    setDragOverClass(null);
    return;
  }

  const newDistribution = JSON.parse(JSON.stringify(currentDistribution));

  // Remove dari kelas asal
  newDistribution[draggedStudent.fromClass] = newDistribution[draggedStudent.fromClass].filter(
    (s) => s.id !== draggedStudent.student.id
  );

  // Tambah ke kelas tujuan
  newDistribution[toClass].push(draggedStudent.student);

  setDistribution(newDistribution);

  if (!showSavedClasses) {
    saveToHistory(newDistribution, [], historyIndex, setHistory, setHistoryIndex);
  }

  showToast(`✅ ${draggedStudent.student.nama_lengkap} dipindah ke ${toClass}`, "success");

  setDraggedStudent(null);
  setDragOverClass(null);
};

// Remove student dari kelas (kembali ke unassigned)
export const handleRemoveStudent = (
  studentId,
  fromClass,
  currentDistribution,
  setDistribution,
  showSavedClasses,
  saveToHistory,
  showToast,
  historyIndex,
  setHistory,
  setHistoryIndex
) => {
  if (!window.confirm("Keluarkan siswa dari kelas ini?")) return;

  const newDistribution = JSON.parse(JSON.stringify(currentDistribution));
  const student = newDistribution[fromClass].find((s) => s.id === studentId);

  newDistribution[fromClass] = newDistribution[fromClass].filter((s) => s.id !== studentId);

  setDistribution(newDistribution);

  if (!showSavedClasses) {
    saveToHistory(newDistribution, [], historyIndex, setHistory, setHistoryIndex);
  }

  showToast(`${student.nama_lengkap} dikeluarkan dari ${fromClass}`, "info");
};

// Add student ke kelas
export const handleAddStudent = (
  student,
  toClass,
  currentDistribution,
  setDistribution,
  showSavedClasses,
  saveToHistory,
  showToast,
  historyIndex,
  setHistory,
  setHistoryIndex
) => {
  const newDistribution = JSON.parse(JSON.stringify(currentDistribution));

  // Check apakah siswa sudah ada di kelas lain
  const existingClass = Object.entries(newDistribution).find(([_, students]) =>
    students.some((s) => s.id === student.id)
  );

  if (existingClass) {
    // Pindahkan dari kelas lama
    newDistribution[existingClass[0]] = newDistribution[existingClass[0]].filter(
      (s) => s.id !== student.id
    );
  }

  newDistribution[toClass].push(student);

  setDistribution(newDistribution);

  if (!showSavedClasses) {
    saveToHistory(newDistribution, [], historyIndex, setHistory, setHistoryIndex);
  }

  showToast(`✅ ${student.nama_lengkap} ditambahkan ke ${toClass}`, "success");
};

// Get all students in distribution (for swap modal)
export const getAllStudentsInDistribution = (currentDistribution, showSavedClasses) => {
  const allInClasses = [];
  Object.entries(currentDistribution).forEach(([className, students]) => {
    students.forEach((student) => {
      allInClasses.push({
        ...student,
        className,
        uniqueId: `${className}-${student.id}`,
      });
    });
  });
  return allInClasses;
};

// Swap 2 siswa
export const handleSwapStudents = (
  swapStudent1,
  swapStudent2,
  currentDistribution,
  setDistribution,
  showSavedClasses,
  saveToHistory,
  showToast,
  setShowSwapModal,
  setSwapStudent1,
  setSwapStudent2,
  setHistory,
  setHistoryIndex,
  historyIndex
) => {
  if (!swapStudent1 || !swapStudent2) {
    showToast("Pilih 2 siswa untuk ditukar", "error");
    return;
  }

  if (!swapStudent1.student || !swapStudent2.student) {
    showToast("Data siswa tidak valid", "error");
    return;
  }

  if (swapStudent1.className === swapStudent2.className) {
    showToast("Siswa berada di kelas yang sama", "error");
    return;
  }

  const newDistribution = JSON.parse(JSON.stringify(currentDistribution));

  const student1Exists = newDistribution[swapStudent1.className]?.some(
    (s) => s.id === swapStudent1.student.id
  );
  const student2Exists = newDistribution[swapStudent2.className]?.some(
    (s) => s.id === swapStudent2.student.id
  );

  if (!student1Exists || !student2Exists) {
    showToast("Salah satu siswa sudah tidak ada di kelasnya", "error");
    return;
  }

  // Remove both students
  newDistribution[swapStudent1.className] = newDistribution[swapStudent1.className].filter(
    (s) => s.id !== swapStudent1.student.id
  );
  newDistribution[swapStudent2.className] = newDistribution[swapStudent2.className].filter(
    (s) => s.id !== swapStudent2.student.id
  );

  // Swap them
  newDistribution[swapStudent1.className].push(swapStudent2.student);
  newDistribution[swapStudent2.className].push(swapStudent1.student);

  setDistribution(newDistribution);

  if (!showSavedClasses) {
    saveToHistory(newDistribution, [], historyIndex, setHistory, setHistoryIndex);
  }

  showToast(
    `🔄 ${swapStudent1.student.nama_lengkap} ↔ ${swapStudent2.student.nama_lengkap}`,
    "success"
  );

  setShowSwapModal(false);
  setSwapStudent1(null);
  setSwapStudent2(null);
};

// ============================================================
// GENERATE NIS
// ============================================================
// Konversi tahun ajaran aktif ("2027/2028", dari getCurrentAcademicYear()
// / spmb_settings.target_academic_year) ke format kode dipakai di NIS
// ("27.28"). generateNIS() di ClassDistribution.js tinggal terima format
// ini + grade + nomor urut.
const academicYearToNISCode = (academicYearStr) => {
  if (!academicYearStr || typeof academicYearStr !== "string") return null;
  const parts = academicYearStr.split("/");
  if (parts.length !== 2) return null;
  const tahunMasuk = parts[0].trim().slice(-2);
  const tahunKeluar = parts[1].trim().slice(-2);
  if (!tahunMasuk || !tahunKeluar) return null;
  return `${tahunMasuk}.${tahunKeluar}`;
};

// Generate & simpan NIS buat siswa yang udah punya kelas (belum ditransfer).
// Format: {tahun_masuk}.{tahun_keluar}.07.{urut 3 digit} -- 07 itu kode
// TETAP identitas SPMB/sekolah (BUKAN kode kelas), sama buat semua
// angkatan. Nomor urut: per kelas diurutkan abjad nama_lengkap, lanjut
// terus lintas kelas (7A -> 7F), BUKAN ikut urutan allStudents yang
// biasanya ikutan nomor_pendaftaran.
//
// Idempotent: bisa dipencet ulang, hasilnya bakal sama persis selama data
// siswa/kelas gak berubah -- makanya boleh nimpa NIS yang udah ada tanpa
// takut kacau, TAPI tetep minta konfirmasi biar TU sadar ini nimpa.
export const generateAndSaveNIS = async (
  allStudents,
  supabase,
  setIsLoading,
  showToast,
  getCurrentAcademicYear,
  onRefreshData
) => {
  const studentsWithClass = allStudents.filter(
    (s) => s.kelas && !s.is_transferred && s.status === "diterima"
  );

  if (studentsWithClass.length === 0) {
    showToast("Tidak ada siswa dengan kelas yang bisa digenerate NIS-nya", "error");
    return;
  }

  const nisCode = academicYearToNISCode(getCurrentAcademicYear());
  if (!nisCode) {
    showToast("❌ Gagal baca tahun ajaran aktif, cek Pengaturan SPMB dulu", "error");
    return;
  }

  if (
    !window.confirm(
      `Generate NIS untuk ${studentsWithClass.length} siswa (kode tahun ajaran ${nisCode})?\n\nNIS yang sudah ada sebelumnya akan ditimpa.`
    )
  ) {
    return;
  }

  setIsLoading(true);
  try {
    const byClass = {};
    studentsWithClass.forEach((s) => {
      if (!byClass[s.kelas]) byClass[s.kelas] = [];
      byClass[s.kelas].push(s);
    });

    // Urut kelas 7A -> 7F
    const sortedClassNames = Object.keys(byClass).sort();

    let seq = 1;
    const updates = [];
    sortedClassNames.forEach((className) => {
      const sortedStudents = [...byClass[className]].sort((a, b) =>
        (a.nama_lengkap || "").localeCompare(b.nama_lengkap || "")
      );
      sortedStudents.forEach((student) => {
        updates.push({
          id: student.id,
          nis: generateNIS(nisCode, 7, seq),
        });
        seq++;
      });
    });

    for (const update of updates) {
      const { error } = await supabase
        .from("siswa_baru")
        .update({
          nis: update.nis,
          updated_at: new Date().toISOString(),
        })
        .eq("id", update.id);

      if (error) throw error;
    }

    showToast(`✅ Berhasil generate NIS untuk ${updates.length} siswa!`, "success");

    if (onRefreshData) {
      await onRefreshData();
    }
  } catch (error) {
    console.error("Error generating NIS:", error);
    showToast("❌ Gagal generate NIS: " + error.message, "error");
  } finally {
    setIsLoading(false);
  }
};
