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
  confirmFn,
  onRefreshData,
  setShowPreview,
  setClassDistribution,
  setEditMode,
  setHistory,
  setHistoryIndex
) => {
  const ok = await confirmFn({
    title: "Simpan Pembagian Kelas",
    message: "Simpan pembagian kelas ini?",
    confirmText: "Ya, Simpan",
  });
  if (!ok) return;

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

    // Kirim semua update PARALEL (Promise.all) -- sama kayak fix di
    // resetClassAssignments/generateAndSaveNIS, bukan upsert (risiko
    // not-null constraint kalau ada kolom wajib yang gak dikirim).
    await Promise.all(
      updates.map(async (update) => {
        const { error } = await supabase
          .from("siswa_baru")
          .update({
            kelas: update.kelas,
          })
          .eq("id", update.id);

        if (error) throw error;
      })
    );

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

// ✅ FIX (transaksi atomik): logic mapping siswa_baru -> students +
// student_profile_details (cleanValue, toJenisKelaminLabel,
// toPendidikanCode, buildProfileDetailPayload) UDAH PINDAH ke SQL
// function `transfer_siswa_ke_students` (lihat
// transfer_siswa_ke_students.sql, dijalankan sekali lewat Supabase SQL
// Editor). Sebelumnya insert `students` + upsert `student_profile_details`
// + update `siswa_baru` itu 3 request Supabase TERPISAH -- kalau request
// ke-2/3 gagal di tengah, siswa itu udah kesimpen di `students` tapi
// `siswa_baru.is_transferred` masih false, jadi retry bisa insert dobel.
// Sekarang ke-3 langkah itu 1 transaksi Postgres (all-or-nothing per
// siswa) lewat RPC, dipanggil di dalam transferToStudents() di bawah.

// Transfer ke tabel students
export const transferToStudents = async (
  allStudents,
  supabase,
  setIsLoading,
  showToast,
  getCurrentAcademicYear,
  onRefreshData,
  // ✅ FIX: 2 parameter opsional baru -- ditambahin biar fungsi ini bisa
  // dipakai bareng dari YearTransition.js (proses "Transisi Tahun Ajaran"),
  // bukan cuma dari tombol "Transfer ke Students" di SPMB. Sebelumnya
  // YearTransition.js punya insert manual sendiri yang gak isi 2 kolom ini
  // (academic_year_id gak pernah keisi, transferred_by gak konsisten).
  // Default null biar pemanggilan lama (dari ClassDivision.js) tetap jalan
  // tanpa perlu diubah.
  academicYearId = null,
  transferredBy = null
) => {
  const studentsWithClass = allStudents.filter(
    (s) => s.kelas && !s.is_transferred && s.status === "diterima"
  );

  if (studentsWithClass.length === 0) {
    showToast("Tidak ada siswa dengan kelas yang bisa ditransfer", "error");
    return;
  }

  setIsLoading(true);
  try {
    const currentYear = getCurrentAcademicYear();

    for (const siswa of studentsWithClass) {
      // ✅ FIX: 1 RPC = 1 transaksi Postgres (insert students + upsert
      // student_profile_details + update siswa_baru sekaligus, gak bisa
      // kepotong di tengah). Lihat transfer_siswa_ke_students.sql.
      const { data: newStudentId, error: rpcError } = await supabase.rpc(
        "transfer_siswa_ke_students",
        {
          p_siswa_baru_id: siswa.id,
          p_academic_year: currentYear,
          p_academic_year_id: academicYearId || null,
          p_transferred_by: transferredBy || null,
        }
      );

      if (rpcError) {
        throw new Error(`Gagal transfer siswa "${siswa.nama_lengkap}": ${rpcError.message}`);
      }
      if (!newStudentId) {
        throw new Error(
          `Gagal transfer siswa "${siswa.nama_lengkap}" (RPC sukses tapi id siswa baru gak balik)`
        );
      }
    }

    showToast(`✅ Berhasil transfer ${studentsWithClass.length} siswa ke Students!`, "success");

    if (onRefreshData) {
      await onRefreshData();
    }
  } catch (error) {
    console.error("Error transferring students:", error);
    showToast("❌ Gagal transfer siswa: " + error.message, "error");
    // ✅ FIX: refresh data WALAU gagal di tengah batch -- siswa sebelum
    // yang gagal itu udah beneran sukses (masing-masing atomik lewat RPC),
    // jadi state React (`allStudents`) harus ikut ke-update biar kalau TU
    // klik "Transfer" lagi, siswa yang udah sukses gak keitung ulang.
    // Sebelumnya cuma direfresh pas full-sukses, jadi retry abis gagal
    // separuh jalan bisa nyoba insert siswa yang sebenernya udah pernah
    // ditransfer (RPC sekarang bakal nolak siswa itu spesifik dengan
    // pesan "sudah pernah ditransfer sebelumnya", tapi tetep mending
    // biar gak ke-loop lagi dari awal).
    if (onRefreshData) {
      await onRefreshData();
    }
    // rethrow biar pemanggil (misal YearTransition.js, yang masih punya
    // beberapa step lanjutan setelah ini) tau proses ini gagal dan bisa
    // berhenti -- sebelumnya error ditelen di sini doang, jadi kalau
    // dipanggil dari alur multi-step, step-step setelahnya tetap lanjut
    // jalan walau transfer ini gagal di tengah.
    throw error;
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
  confirmFn,
  onRefreshData
) => {
  const studentsWithClass = allStudents.filter(
    (s) => s.kelas && !s.is_transferred && s.status === "diterima"
  );

  if (studentsWithClass.length === 0) {
    showToast("Tidak ada pembagian kelas yang bisa direset", "error");
    return;
  }

  const ok = await confirmFn({
    title: "Reset Pembagian Kelas",
    message: `Reset pembagian ${studentsWithClass.length} siswa? Semua kelas akan direset.`,
    variant: "danger",
    confirmText: "Ya, Reset",
  });
  if (!ok) return;

  setIsLoading(true);
  try {
    // Kirim semua update PARALEL (Promise.all), bukan satu-satu berurutan
    // -- itu penyebab lama (30-100+ siswa = 30-100+ round-trip berurutan).
    // Sengaja tetep pakai .update() biasa (bukan upsert) karena upsert bisa
    // kena error not-null constraint buat kolom wajib yang gak dikirim di
    // payload (nama_lengkap, no_pendaftaran, dst) -- .update() aman karena
    // cuma nyentuh kolom yang disebut.
    await Promise.all(
      studentsWithClass.map(async (siswa) => {
        const { error } = await supabase
          .from("siswa_baru")
          .update({
            kelas: null,
            nis: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", siswa.id);

        if (error) throw error;
      })
    );

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

// Commit hasil import Excel pembagian kelas (revisi). Cuma nulis baris
// dengan status "changed" -- baris "unchanged" & "error" udah difilter
// duluan sama caller (ImportClassDivisionModal.js) sebelum manggil ini.
// Pola update-nya sama kayak saveClassAssignments/resetClassAssignments:
// Promise.all per-siswa pakai .update() biasa (bukan upsert), biar gak
// kena risiko not-null constraint buat kolom wajib yang gak dikirim.
export const commitClassDivisionImport = async (
  changedRows,
  supabase,
  setIsLoading,
  showToast,
  onRefreshData
) => {
  if (!changedRows || changedRows.length === 0) {
    showToast("Tidak ada perubahan untuk disimpan", "error");
    return false;
  }

  setIsLoading(true);
  try {
    await Promise.all(
      changedRows.map(async (row) => {
        const { error } = await supabase
          .from("siswa_baru")
          .update({
            kelas: row.kelasBaru,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.matchedStudentId);

        if (error) throw error;
      })
    );

    showToast(
      `✅ Berhasil menerapkan ${changedRows.length} perubahan kelas dari import!`,
      "success"
    );

    if (onRefreshData) {
      await onRefreshData();
    }
    return true;
  } catch (error) {
    console.error("Error committing class division import:", error);
    showToast("❌ Gagal menyimpan hasil import: " + error.message, "error");
    return false;
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
  onRefreshData, // 🔥 TAMBAH PARAMETER INI
  confirmFn
) => {
  const ok = await confirmFn({
    title: "Pindah Kelas",
    message: `Pindahkan siswa ke ${toClass}?`,
  });
  if (!ok) return;

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
export const handleRemoveStudent = async (
  studentId,
  fromClass,
  currentDistribution,
  setDistribution,
  showSavedClasses,
  saveToHistory,
  showToast,
  historyIndex,
  setHistory,
  setHistoryIndex,
  confirmFn
) => {
  const ok = await confirmFn({
    title: "Keluarkan Siswa",
    message: "Keluarkan siswa dari kelas ini?",
    variant: "danger",
    confirmText: "Ya, Keluarkan",
  });
  if (!ok) return;

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
  confirmFn,
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

  const ok = await confirmFn({
    title: "Generate NIS",
    message: `Generate NIS untuk ${studentsWithClass.length} siswa (kode tahun ajaran ${nisCode})?\n\nNIS yang sudah ada sebelumnya akan ditimpa.`,
    variant: "warning",
    confirmText: "Ya, Generate",
  });
  if (!ok) return;

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

    // Kirim semua update PARALEL (Promise.all) -- sama kayak fix di
    // resetClassAssignments, gak pakai upsert karena berisiko kena
    // not-null constraint buat kolom wajib yang gak ikut dikirim.
    await Promise.all(
      updates.map(async (update) => {
        const { error } = await supabase
          .from("siswa_baru")
          .update({
            nis: update.nis,
            updated_at: new Date().toISOString(),
          })
          .eq("id", update.id);

        if (error) throw error;
      })
    );

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
