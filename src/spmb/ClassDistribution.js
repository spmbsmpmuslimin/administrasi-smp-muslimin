// ClassDistribution.js - Logic untuk pembagian kelas dan management distribution

// Fungsi untuk format tampilan tahun ajaran (26.27 -> 2026/2027)
export const formatTahunAjaran = (tahunAjaran) => {
  const [tahun1, tahun2] = tahunAjaran.split(".");
  return `20${tahun1}/20${tahun2}`;
};

// Fungsi untuk auto-detect tahun ajaran
export const getTahunAjaran = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12

  // Januari - Juli: SPMB untuk masuk Juli tahun ini
  if (month >= 1 && month <= 7) {
    const tahun1 = year.toString().slice(-2);
    const tahun2 = (year + 1).toString().slice(-2);
    return `${tahun1}.${tahun2}`;
  }
  // Agustus - Desember: SPMB untuk masuk Juli tahun depan
  else {
    const tahun1 = (year + 1).toString().slice(-2);
    const tahun2 = (year + 2).toString().slice(-2);
    return `${tahun1}.${tahun2}`;
  }
};

// Fungsi untuk generate NIS dengan format: 26.27.07.001
export const generateNIS = (tahunAjaran, grade, nomorUrut) => {
  const gradeStr = grade.toString().padStart(2, "0"); // 7 -> "07"
  const nomorStr = nomorUrut.toString().padStart(3, "0"); // 1 -> "001"
  return `${tahunAjaran}.${gradeStr}.${nomorStr}`;
};

// Algoritma Pembagian Kelas OPTIMAL untuk 200-250 siswa
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
    showToast("Tidak ada siswa yang perlu dibagi kelas", "error");
    return;
  }

  setIsLoading(true);

  try {
    const tahunAjaran = getTahunAjaran();

    // STEP 1: Shuffle siswa by school untuk meratakan distribusi
    const shuffleBySchool = (students) => {
      // Group by school
      const bySchool = {};
      students.forEach((s) => {
        const school = s.asal_sekolah || "Unknown";
        if (!bySchool[school]) bySchool[school] = [];
        bySchool[school].push(s);
      });

      // Shuffle array untuk randomize urutan
      const shuffle = (arr) => {
        const shuffled = [...arr];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      };

      // Shuffle tiap sekolah
      Object.keys(bySchool).forEach((school) => {
        bySchool[school] = shuffle(bySchool[school]);
      });

      // Round-robin ambil dari tiap sekolah
      const result = [];
      const schools = Object.keys(bySchool);
      let hasMore = true;
      let idx = 0;

      while (hasMore) {
        hasMore = false;
        schools.forEach((school) => {
          if (bySchool[school][idx]) {
            result.push(bySchool[school][idx]);
            hasMore = true;
          }
        });
        idx++;
      }

      return result;
    };

    // Shuffle L dan P secara terpisah by school
    const males = unassignedStudents.filter((s) => s.jenis_kelamin === "L");
    const females = unassignedStudents.filter((s) => s.jenis_kelamin === "P");

    const shuffledMales = shuffleBySchool(males);
    const shuffledFemales = shuffleBySchool(females);

    // Gabung zigzag L-P-L-P untuk balance gender
    const balancedPool = [];
    const maxLen = Math.max(shuffledMales.length, shuffledFemales.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < shuffledMales.length) balancedPool.push(shuffledMales[i]);
      if (i < shuffledFemales.length) balancedPool.push(shuffledFemales[i]);
    }

    // STEP 2: Setup kelas & hitung target
    const classNames = Array.from(
      { length: numClasses },
      (_, i) => `7${String.fromCharCode(65 + i)}`
    );

    const distribution = {};
    classNames.forEach((className) => {
      distribution[className] = [];
    });

    const totalStudents = unassignedStudents.length;
    const studentsPerClass = Math.floor(totalStudents / numClasses);
    const remainder = totalStudents % numClasses;

    // STEP 3: SIMPLE ROUND-ROBIN distribusi
    let poolIndex = 0;

    classNames.forEach((className, classIdx) => {
      const targetTotal = studentsPerClass + (classIdx < remainder ? 1 : 0);

      for (let i = 0; i < targetTotal && poolIndex < balancedPool.length; i++) {
        distribution[className].push(balancedPool[poolIndex]);
        poolIndex++;
      }
    });

    // STEP 5: SORT setiap kelas by NAMA (A-Z)
    Object.keys(distribution).forEach((className) => {
      distribution[className].sort((a, b) =>
        (a.nama_lengkap || "").localeCompare(b.nama_lengkap || "")
      );
    });

    // STEP 6: ASSIGN NIS berurutan per kelas (sesuai urutan nama)
    let nisCounter = 1;

    classNames.forEach((className) => {
      distribution[className] = distribution[className].map((student) => {
        const nis = generateNIS(tahunAjaran, 7, nisCounter);
        nisCounter++;
        return {
          ...student,
          nis,
        };
      });
    });

    setClassDistribution(distribution);
    setShowPreview(true);
    setShowSavedClasses(false);
    setEditMode(false);

    // Initialize history
    setHistory([JSON.parse(JSON.stringify(distribution))]);
    setHistoryIndex(0);

    showToast(
      `✅ Berhasil generate ${numClasses} kelas seimbang (${totalStudents} siswa)!`,
      "success"
    );
  } catch (error) {
    console.error("Error generating distribution:", error);
    showToast("Gagal generate pembagian kelas", "error");
  } finally {
    setIsLoading(false);
  }
};

// Check balance gender per kelas
export const checkClassBalance = (classDistribution) => {
  const unbalanced = [];
  const avgStudentsPerClass =
    Object.values(classDistribution).reduce(
      (sum, students) => sum + students.length,
      0
    ) / Object.keys(classDistribution).length;

  Object.entries(classDistribution).forEach(([className, students]) => {
    const males = students.filter((s) => s.jenis_kelamin === "L").length;
    const females = students.filter((s) => s.jenis_kelamin === "P").length;
    const total = students.length;

    // Check jika terlalu tidak seimbang
    const genderRatio = males / (females || 1);
    const isGenderUnbalanced = genderRatio > 2 || genderRatio < 0.5;
    const isSizeUnbalanced = Math.abs(total - avgStudentsPerClass) > 3;

    if (isGenderUnbalanced || isSizeUnbalanced) {
      unbalanced.push({
        className,
        reason: isGenderUnbalanced ? "gender" : "size",
        males,
        females,
        total,
      });
    }
  });

  return unbalanced;
};

// Hitung statistik per kelas
export const getClassStats = (students) => {
  const males = students.filter((s) => s.jenis_kelamin === "L").length;
  const females = students.filter((s) => s.jenis_kelamin === "P").length;
  const schools = [...new Set(students.map((s) => s.asal_sekolah))];

  return {
    total: students.length,
    males,
    females,
    schoolCount: schools.length,
    schools,
  };
};

// Save to history untuk Undo/Redo
export const saveToHistory = (
  newDistribution,
  history,
  historyIndex,
  setHistory,
  setHistoryIndex
) => {
  setHistory((prev) => {
    const newHistory = prev.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newDistribution)));
    return newHistory;
  });
  setHistoryIndex((prev) => prev + 1);
};

// Undo
export const handleUndo = (
  historyIndex,
  history,
  setHistoryIndex,
  setClassDistribution,
  showToast
) => {
  if (historyIndex > 0) {
    setHistoryIndex((prev) => prev - 1);
    setClassDistribution(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    showToast("↩️ Undo berhasil", "info");
  }
};

// Redo
export const handleRedo = (
  historyIndex,
  history,
  setHistoryIndex,
  setClassDistribution,
  showToast
) => {
  if (historyIndex < history.length - 1) {
    setHistoryIndex((prev) => prev + 1);
    setClassDistribution(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    showToast("↪️ Redo berhasil", "info");
  }
};
