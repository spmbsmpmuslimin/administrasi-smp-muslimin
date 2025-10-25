// ClassDistribution.js - Logic untuk pembagian kelas dan management distribution

// Algoritma Pembagian Kelas Otomatis
export const generateClassDistribution = (
  unassignedStudents,
  numClasses,
  setIsLoading,
  setClassDistribution,
  setShowPreview,
  setShowSavedClasses,
  setEditMode,
  setHistory,
  setHistoryIndex,
  showToast
) => {
  if (unassignedStudents.length === 0) {
    showToast('Tidak ada siswa yang perlu dibagi kelas', 'error');
    return;
  }

  setIsLoading(true);

  try {
    const maleStudents = unassignedStudents.filter(s => s.jenis_kelamin === 'L');
    const femaleStudents = unassignedStudents.filter(s => s.jenis_kelamin === 'P');

    const sortBySchool = (students) => {
      return [...students].sort((a, b) => 
        (a.asal_sekolah || '').localeCompare(b.asal_sekolah || '')
      );
    };

    const sortedMales = sortBySchool(maleStudents);
    const sortedFemales = sortBySchool(femaleStudents);

    const classNames = Array.from({ length: numClasses }, (_, i) => 
      `7${String.fromCharCode(65 + i)}`
    );

    const distribution = {};
    classNames.forEach(className => {
      distribution[className] = [];
    });

    let classIndex = 0;

    sortedMales.forEach(student => {
      distribution[classNames[classIndex]].push(student);
      classIndex = (classIndex + 1) % numClasses;
    });

    classIndex = 0;
    sortedFemales.forEach(student => {
      distribution[classNames[classIndex]].push(student);
      classIndex = (classIndex + 1) % numClasses;
    });

    setClassDistribution(distribution);
    setShowPreview(true);
    setShowSavedClasses(false);
    setEditMode(false);
    
    // Initialize history
    setHistory([JSON.parse(JSON.stringify(distribution))]);
    setHistoryIndex(0);
    
    showToast(`Berhasil generate pembagian ${numClasses} kelas!`, 'success');
  } catch (error) {
    console.error('Error generating distribution:', error);
    showToast('Gagal generate pembagian kelas', 'error');
  } finally {
    setIsLoading(false);
  }
};

// Check balance gender per kelas
export const checkClassBalance = (classDistribution) => {
  const unbalanced = [];
  const avgStudentsPerClass = Object.values(classDistribution).reduce((sum, students) => sum + students.length, 0) / Object.keys(classDistribution).length;
  
  Object.entries(classDistribution).forEach(([className, students]) => {
    const males = students.filter(s => s.jenis_kelamin === 'L').length;
    const females = students.filter(s => s.jenis_kelamin === 'P').length;
    const total = students.length;
    
    // Check jika terlalu tidak seimbang
    const genderRatio = males / (females || 1);
    const isGenderUnbalanced = genderRatio > 2 || genderRatio < 0.5;
    const isSizeUnbalanced = Math.abs(total - avgStudentsPerClass) > 3;
    
    if (isGenderUnbalanced || isSizeUnbalanced) {
      unbalanced.push({
        className,
        reason: isGenderUnbalanced ? 'gender' : 'size',
        males,
        females,
        total
      });
    }
  });
  
  return unbalanced;
};

// Hitung statistik per kelas
export const getClassStats = (students) => {
  const males = students.filter(s => s.jenis_kelamin === 'L').length;
  const females = students.filter(s => s.jenis_kelamin === 'P').length;
  const schools = [...new Set(students.map(s => s.asal_sekolah))];
  
  return {
    total: students.length,
    males,
    females,
    schoolCount: schools.length,
    schools
  };
};

// Save to history untuk Undo/Redo
export const saveToHistory = (newDistribution, history, historyIndex, setHistory, setHistoryIndex) => {
  setHistory(prev => {
    const newHistory = prev.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newDistribution)));
    return newHistory;
  });
  setHistoryIndex(prev => prev + 1);
};

// Undo
export const handleUndo = (historyIndex, history, setHistoryIndex, setClassDistribution, showToast) => {
  if (historyIndex > 0) {
    setHistoryIndex(prev => prev - 1);
    setClassDistribution(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    showToast('↩️ Undo berhasil', 'info');
  }
};

// Redo
export const handleRedo = (historyIndex, history, setHistoryIndex, setClassDistribution, showToast) => {
  if (historyIndex < history.length - 1) {
    setHistoryIndex(prev => prev + 1);
    setClassDistribution(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    showToast('↪️ Redo berhasil', 'info');
  }
};