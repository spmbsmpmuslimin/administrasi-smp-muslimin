// ClassOperations.js - Operations & Utilities untuk kelas management

import { exportClassDivision } from './SpmbExcel';

// Simpan pembagian ke database
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
  if (!window.confirm('Simpan pembagian kelas ini? Data tidak bisa diubah setelah disimpan.')) {
    return;
  }

  setIsLoading(true);
  try {
    const updates = [];

    Object.entries(classDistribution).forEach(([className, students]) => {
      students.forEach(student => {
        updates.push({
          id: student.id,
          kelas: className
        });
      });
    });

    for (const update of updates) {
      const { error } = await supabase
        .from('siswa_baru')
        .update({ kelas: update.kelas })
        .eq('id', update.id);

      if (error) throw error;
    }

    showToast(`✅ Berhasil menyimpan pembagian ${updates.length} siswa!`, 'success');
    setShowPreview(false);
    setClassDistribution({});
    setEditMode(false);
    setHistory([]);
    setHistoryIndex(-1);
    
    if (onRefreshData) {
      await onRefreshData();
    }
  } catch (error) {
    console.error('Error saving assignments:', error);
    showToast('❌ Gagal menyimpan pembagian kelas', 'error');
  } finally {
    setIsLoading(false);
  }
};

// Transfer ke tabel students
export const transferToStudents = async (
  allStudents,
  supabase,
  setIsLoading,
  showToast,
  getCurrentAcademicYear,
  onRefreshData
) => {
  const studentsWithClass = allStudents.filter(s => 
    s.kelas && !s.is_transferred && s.status === 'diterima'
  );

  if (studentsWithClass.length === 0) {
    showToast('Tidak ada siswa dengan kelas yang bisa ditransfer', 'error');
    return;
  }

  if (!window.confirm(`Transfer ${studentsWithClass.length} siswa ke tabel Students?`)) {
    return;
  }

  setIsLoading(true);
  try {
    const currentYear = getCurrentAcademicYear();

    for (const siswa of studentsWithClass) {
      const { error: insertError } = await supabase
        .from('students')
        .insert([{
          full_name: siswa.nama_lengkap,
          nis: siswa.nisn,
          class_id: siswa.kelas,
          academic_year: currentYear,
          gender: siswa.jenis_kelamin,
          is_active: true
        }]);

      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from('siswa_baru')
        .update({
          is_transferred: true,
          transferred_at: new Date().toISOString()
        })
        .eq('id', siswa.id);

      if (updateError) throw updateError;
    }

    showToast(`✅ Berhasil transfer ${studentsWithClass.length} siswa ke Students!`, 'success');
    
    if (onRefreshData) {
      await onRefreshData();
    }
  } catch (error) {
    console.error('Error transferring students:', error);
    showToast('❌ Gagal transfer siswa: ' + error.message, 'error');
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
  const studentsWithClass = allStudents.filter(s => 
    s.kelas && !s.is_transferred && s.status === 'diterima'
  );

  if (studentsWithClass.length === 0) {
    showToast('Tidak ada pembagian kelas yang bisa direset', 'error');
    return;
  }

  if (!window.confirm(`Reset pembagian ${studentsWithClass.length} siswa? Semua kelas akan dikosongkan.`)) {
    return;
  }

  setIsLoading(true);
  try {
    for (const siswa of studentsWithClass) {
      const { error } = await supabase
        .from('siswa_baru')
        .update({ 
          kelas: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', siswa.id);

      if (error) throw error;
    }

    showToast(`✅ Berhasil reset ${studentsWithClass.length} siswa!`, 'success');
    
    if (onRefreshData) {
      await onRefreshData();
    }
  } catch (error) {
    console.error('Error resetting assignments:', error);
    showToast('❌ Gagal reset pembagian kelas', 'error');
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
      .from('siswa_baru')
      .update({ 
        kelas: newClass,
        updated_at: new Date().toISOString()
      })
      .eq('id', studentId);

    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error updating class:', error);
    showToast('❌ Gagal update kelas', 'error');
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
  supabase
) => {
  if (!window.confirm(`Pindahkan siswa ke ${toClass}?`)) return;

  const success = await updateClassAssignment(studentId, toClass, supabase, setIsLoading, showToast);
  
  if (success) {
    const newDistribution = JSON.parse(JSON.stringify(savedClassDistribution));
    
    newDistribution[fromClass] = newDistribution[fromClass].filter(
      s => s.id !== studentId
    );
    
    if (!newDistribution[toClass]) {
      newDistribution[toClass] = [];
    }
    const student = allStudents.find(s => s.id === studentId);
    newDistribution[toClass].push(student);
    
    setSavedClassDistribution(newDistribution);
    showToast(`✅ Siswa dipindah ke ${toClass}`, 'success');
  }
};

// Export Excel untuk preview
export const handleExportClassDivision = async (
  classDistribution,
  setIsExporting,
  showToast
) => {
  if (!classDistribution || Object.keys(classDistribution).length === 0) {
    showToast('Tidak ada pembagian kelas untuk di-export', 'error');
    return;
  }

  setIsExporting(true);
  try {
    await exportClassDivision(classDistribution, showToast);
  } catch (error) {
    console.error('Error in handleExportClassDivision:', error);
  } finally {
    setIsExporting(false);
  }
};

// Export Excel untuk kelas tersimpan
export const handleExportSavedClasses = async (
  allStudents,
  setIsExporting,
  showToast
) => {
  const studentsWithClass = allStudents.filter(s => 
    s.kelas && !s.is_transferred && s.status === 'diterima'
  );

  if (studentsWithClass.length === 0) {
    showToast('Tidak ada siswa dengan kelas yang bisa di-export', 'error');
    return;
  }

  const distribution = {};
  studentsWithClass.forEach(student => {
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
    console.error('Error in handleExportSavedClasses:', error);
  } finally {
    setIsExporting(false);
  }
};

// Drag & Drop Handlers
export const handleDragStart = (e, student, fromClass, setDraggedStudent) => {
  setDraggedStudent({ student, fromClass });
  e.dataTransfer.effectAllowed = 'move';
};

export const handleDragOver = (e, toClass, setDragOverClass) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
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
    s => s.id !== draggedStudent.student.id
  );
  
  // Tambah ke kelas tujuan
  newDistribution[toClass].push(draggedStudent.student);
  
  setDistribution(newDistribution);
  
  if (!showSavedClasses) {
    saveToHistory(newDistribution, [], historyIndex, setHistory, setHistoryIndex);
  }
  
  showToast(`✅ ${draggedStudent.student.nama_lengkap} dipindah ke ${toClass}`, 'success');
  
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
  if (!window.confirm('Keluarkan siswa dari kelas ini?')) return;

  const newDistribution = JSON.parse(JSON.stringify(currentDistribution));
  const student = newDistribution[fromClass].find(s => s.id === studentId);
  
  newDistribution[fromClass] = newDistribution[fromClass].filter(s => s.id !== studentId);
  
  setDistribution(newDistribution);
  
  if (!showSavedClasses) {
    saveToHistory(newDistribution, [], historyIndex, setHistory, setHistoryIndex);
  }
  
  showToast(`${student.nama_lengkap} dikeluarkan dari ${fromClass}`, 'info');
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
    students.some(s => s.id === student.id)
  );
  
  if (existingClass) {
    // Pindahkan dari kelas lama
    newDistribution[existingClass[0]] = newDistribution[existingClass[0]].filter(
      s => s.id !== student.id
    );
  }
  
  newDistribution[toClass].push(student);
  
  setDistribution(newDistribution);
  
  if (!showSavedClasses) {
    saveToHistory(newDistribution, [], historyIndex, setHistory, setHistoryIndex);
  }
  
  showToast(`✅ ${student.nama_lengkap} ditambahkan ke ${toClass}`, 'success');
};

// Get all students in distribution (for swap modal)
export const getAllStudentsInDistribution = (currentDistribution, showSavedClasses) => {
  const allInClasses = [];
  Object.entries(currentDistribution).forEach(([className, students]) => {
    students.forEach(student => {
      allInClasses.push({ 
        ...student, 
        className,
        uniqueId: `${className}-${student.id}`
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
    showToast('Pilih 2 siswa untuk ditukar', 'error');
    return;
  }

  if (!swapStudent1.student || !swapStudent2.student) {
    showToast('Data siswa tidak valid', 'error');
    return;
  }

  if (swapStudent1.className === swapStudent2.className) {
    showToast('Siswa berada di kelas yang sama', 'error');
    return;
  }

  const newDistribution = JSON.parse(JSON.stringify(currentDistribution));
  
  const student1Exists = newDistribution[swapStudent1.className]?.some(
    s => s.id === swapStudent1.student.id
  );
  const student2Exists = newDistribution[swapStudent2.className]?.some(
    s => s.id === swapStudent2.student.id
  );

  if (!student1Exists || !student2Exists) {
    showToast('Salah satu siswa sudah tidak ada di kelasnya', 'error');
    return;
  }

  // Remove both students
  newDistribution[swapStudent1.className] = newDistribution[swapStudent1.className].filter(
    s => s.id !== swapStudent1.student.id
  );
  newDistribution[swapStudent2.className] = newDistribution[swapStudent2.className].filter(
    s => s.id !== swapStudent2.student.id
  );
  
  // Swap them
  newDistribution[swapStudent1.className].push(swapStudent2.student);
  newDistribution[swapStudent2.className].push(swapStudent1.student);
  
  setDistribution(newDistribution);
  
  if (!showSavedClasses) {
    saveToHistory(newDistribution, [], historyIndex, setHistory, setHistoryIndex);
  }
  
  showToast(`🔄 ${swapStudent1.student.nama_lengkap} ↔ ${swapStudent2.student.nama_lengkap}`, 'success');
  
  setShowSwapModal(false);
  setSwapStudent1(null);
  setSwapStudent2(null);
};