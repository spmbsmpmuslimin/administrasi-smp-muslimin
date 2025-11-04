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

// Algoritma Pembagian Kelas Otomatis dengan NIS (MANUAL STYLE)
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
    // Get tahun ajaran otomatis
    const tahunAjaran = getTahunAjaran();

    const maleStudents = unassignedStudents.filter(
      (s) => s.jenis_kelamin === "L"
    );
    const femaleStudents = unassignedStudents.filter(
      (s) => s.jenis_kelamin === "P"
    );

    const sortBySchool = (students) => {
      return [...students].sort((a, b) =>
        (a.asal_sekolah || "").localeCompare(b.asal_sekolah || "")
      );
    };

    const sortedMales = sortBySchool(maleStudents);
    const sortedFemales = sortBySchool(femaleStudents);

    const classNames = Array.from(
      { length: numClasses },
      (_, i) => `7${String.fromCharCode(65 + i)}`
    );

    const distribution = {};
    classNames.forEach((className) => {
      distribution[className] = [];
    });

    // STEP 1: BAGI SISWA KE KELAS (merata: gender, asal sekolah)
    const totalStudents = unassignedStudents.length;
    const studentsPerClass = Math.floor(totalStudents / numClasses);
    const remainder = totalStudents % numClasses;

    // Hitung target laki-laki dan perempuan per kelas
    const malesPerClass = Math.floor(sortedMales.length / numClasses);
    const femalesPerClass = Math.floor(sortedFemales.length / numClasses);
    const malesRemainder = sortedMales.length % numClasses;
    const femalesRemainder = sortedFemales.length % numClasses;

    let maleIndex = 0;
    let femaleIndex = 0;

    // Isi setiap kelas satu per satu (TANPA NIS dulu)
    classNames.forEach((className, classIdx) => {
      // Kuota untuk kelas ini
      const malesForThisClass =
        malesPerClass + (classIdx < malesRemainder ? 1 : 0);
      const femalesForThisClass =
        femalesPerClass + (classIdx < femalesRemainder ? 1 : 0);

      // Ambil laki-laki sesuai kuota
      for (
        let i = 0;
        i < malesForThisClass && maleIndex < sortedMales.length;
        i++
      ) {
        distribution[className].push(sortedMales[maleIndex]);
        maleIndex++;
      }

      // Ambil perempuan sesuai kuota
      for (
        let i = 0;
        i < femalesForThisClass && femaleIndex < sortedFemales.length;
        i++
      ) {
        distribution[className].push(sortedFemales[femaleIndex]);
        femaleIndex++;
      }
    });

    // STEP 2: SORT SETIAP KELAS BERDASARKAN NAMA (A-Z)
    Object.keys(distribution).forEach((className) => {
      distribution[className].sort((a, b) =>
        (a.nama_lengkap || "").localeCompare(b.nama_lengkap || "")
      );
    });

    // STEP 3: ASSIGN NIS BERURUTAN PER KELAS
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
      `Berhasil generate pembagian ${numClasses} kelas dengan NIS berurutan per nama!`,
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
