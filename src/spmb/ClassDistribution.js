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

// Algoritma Pembagian Kelas OPTIMAL - Maximum Balance
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

    // STEP 1: MAXIMUM DISTRIBUTION - Strict Round-Robin by School
    const distributeBySchool = (students) => {
      // Group by school
      const bySchool = {};
      students.forEach((s) => {
        const school = s.asal_sekolah || "Unknown";
        if (!bySchool[school]) bySchool[school] = [];
        bySchool[school].push(s);
      });

      // Shuffle tiap sekolah untuk randomness
      const shuffle = (arr) => {
        const shuffled = [...arr];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      };

      Object.keys(bySchool).forEach((school) => {
        bySchool[school] = shuffle(bySchool[school]);
      });

      // ULTRA STRICT Round-Robin: ambil 1 dari tiap sekolah bergiliran
      const result = [];
      const schools = Object.keys(bySchool).sort();
      const maxLength = Math.max(
        ...Object.values(bySchool).map((arr) => arr.length)
      );

      for (let i = 0; i < maxLength; i++) {
        schools.forEach((school) => {
          if (bySchool[school][i]) {
            result.push(bySchool[school][i]);
          }
        });
      }

      return result;
    };

    // Distribute L dan P secara terpisah by school
    const males = unassignedStudents.filter((s) => s.jenis_kelamin === "L");
    const females = unassignedStudents.filter((s) => s.jenis_kelamin === "P");

    const distributedMales = distributeBySchool(males);
    const distributedFemales = distributeBySchool(females);

    // Setup kelas
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

    // STEP 2: Distribute Males - Round Robin
    let maleIndex = 0;
    classNames.forEach((className, classIdx) => {
      const targetMales =
        Math.floor(males.length / numClasses) +
        (classIdx < males.length % numClasses ? 1 : 0);

      for (
        let i = 0;
        i < targetMales && maleIndex < distributedMales.length;
        i++
      ) {
        distribution[className].push(distributedMales[maleIndex]);
        maleIndex++;
      }
    });

    // STEP 3: Distribute Females - Round Robin
    let femaleIndex = 0;
    classNames.forEach((className, classIdx) => {
      const targetFemales =
        Math.floor(females.length / numClasses) +
        (classIdx < females.length % numClasses ? 1 : 0);

      for (
        let i = 0;
        i < targetFemales && femaleIndex < distributedFemales.length;
        i++
      ) {
        distribution[className].push(distributedFemales[femaleIndex]);
        femaleIndex++;
      }
    });

    // STEP 4: Track School Distribution
    const schoolCountPerClass = {};
    classNames.forEach((className) => {
      schoolCountPerClass[className] = {};
      distribution[className].forEach((student) => {
        const school = student.asal_sekolah || "Unknown";
        if (!schoolCountPerClass[className][school]) {
          schoolCountPerClass[className][school] = 0;
        }
        schoolCountPerClass[className][school]++;
      });
    });

    // STEP 5: AGGRESSIVE MULTI-PHASE REBALANCING
    const studentsWithSchool = unassignedStudents.filter(
      (s) => s.asal_sekolah && s.asal_sekolah !== "Unknown"
    );
    const uniqueSchools = [
      ...new Set(studentsWithSchool.map((s) => s.asal_sekolah)),
    ];

    console.log("🔍 Rebalancing Stats:");
    console.log(`Total Schools: ${uniqueSchools.length}`);
    console.log(`Total Students with School: ${studentsWithSchool.length}`);

    // Calculate thresholds
    const avgSchoolPerClass = studentsWithSchool.length / numClasses;
    const avgSchoolsFromSameSchool =
      studentsWithSchool.length / uniqueSchools.length / numClasses;
    const maxSchoolPerClass = Math.ceil(avgSchoolsFromSameSchool) + 1;
    const minSchoolPerClass = Math.floor(avgSchoolsFromSameSchool) - 1;

    console.log(
      `Max students from same school per class: ${maxSchoolPerClass}`
    );
    console.log(
      `Min students from same school per class: ${minSchoolPerClass}`
    );

    // PHASE 1: Reduce overloaded schools
    let phase1Swaps = 0;
    for (let iteration = 0; iteration < 100; iteration++) {
      let swapped = false;

      for (const className of classNames) {
        for (const school in schoolCountPerClass[className]) {
          if (school === "Unknown") continue;

          // If this class has too many from this school
          if (schoolCountPerClass[className][school] > maxSchoolPerClass) {
            // Find class with fewer students from this school
            for (const targetClass of classNames) {
              if (targetClass === className) continue;

              const targetCount = schoolCountPerClass[targetClass][school] || 0;

              if (targetCount < maxSchoolPerClass) {
                // Find student from overloaded school in source class
                const sourceStudentIdx = distribution[className].findIndex(
                  (s) => s.asal_sekolah === school
                );

                if (sourceStudentIdx !== -1) {
                  const sourceStudent =
                    distribution[className][sourceStudentIdx];

                  // Find swap candidate in target class (same gender, different school)
                  const targetStudentIdx = distribution[targetClass].findIndex(
                    (s) =>
                      s.jenis_kelamin === sourceStudent.jenis_kelamin &&
                      s.asal_sekolah !== school
                  );

                  if (targetStudentIdx !== -1) {
                    const targetStudent =
                      distribution[targetClass][targetStudentIdx];
                    const targetSchool =
                      targetStudent.asal_sekolah || "Unknown";

                    // Perform swap
                    distribution[className][sourceStudentIdx] = targetStudent;
                    distribution[targetClass][targetStudentIdx] = sourceStudent;

                    // Update tracking
                    schoolCountPerClass[className][school]--;
                    schoolCountPerClass[targetClass][school] =
                      (schoolCountPerClass[targetClass][school] || 0) + 1;

                    if (!schoolCountPerClass[className][targetSchool])
                      schoolCountPerClass[className][targetSchool] = 0;
                    schoolCountPerClass[className][targetSchool]++;

                    if (!schoolCountPerClass[targetClass][targetSchool])
                      schoolCountPerClass[targetClass][targetSchool] = 0;
                    schoolCountPerClass[targetClass][targetSchool]--;

                    phase1Swaps++;
                    swapped = true;
                    break;
                  }
                }
              }
            }
            if (swapped) break;
          }
        }
        if (swapped) break;
      }

      if (!swapped) break;
    }

    // PHASE 2: Increase school diversity in underrepresented classes
    let phase2Swaps = 0;
    for (let iteration = 0; iteration < 100; iteration++) {
      let swapped = false;

      // Find class with least school diversity
      let minDiversityClass = null;
      let minDiversity = Infinity;

      for (const className of classNames) {
        const schoolsInClass = Object.keys(
          schoolCountPerClass[className]
        ).filter(
          (s) => s !== "Unknown" && schoolCountPerClass[className][s] > 0
        );
        if (schoolsInClass.length < minDiversity) {
          minDiversity = schoolsInClass.length;
          minDiversityClass = className;
        }
      }

      if (
        !minDiversityClass ||
        minDiversity >= Math.floor(uniqueSchools.length * 0.7)
      ) {
        break; // Already good enough
      }

      // Find schools missing from this class
      const schoolsInMinClass = Object.keys(
        schoolCountPerClass[minDiversityClass]
      ).filter(
        (s) => s !== "Unknown" && schoolCountPerClass[minDiversityClass][s] > 0
      );
      const missingSchools = uniqueSchools.filter(
        (s) => !schoolsInMinClass.includes(s)
      );

      // Try to get student from missing school
      for (const missingSchool of missingSchools) {
        // Find class that has this school
        for (const sourceClass of classNames) {
          if (sourceClass === minDiversityClass) continue;

          const sourceCount =
            schoolCountPerClass[sourceClass][missingSchool] || 0;
          if (sourceCount > 1) {
            // Only if they have more than 1
            // Find student from missing school in source class
            const sourceStudentIdx = distribution[sourceClass].findIndex(
              (s) => s.asal_sekolah === missingSchool
            );

            if (sourceStudentIdx !== -1) {
              const sourceStudent = distribution[sourceClass][sourceStudentIdx];

              // Find swap in target (same gender, preferably from overrepresented school in target)
              const targetStudentIdx = distribution[
                minDiversityClass
              ].findIndex(
                (s) => s.jenis_kelamin === sourceStudent.jenis_kelamin
              );

              if (targetStudentIdx !== -1) {
                const targetStudent =
                  distribution[minDiversityClass][targetStudentIdx];
                const targetSchool = targetStudent.asal_sekolah || "Unknown";

                // Swap
                distribution[sourceClass][sourceStudentIdx] = targetStudent;
                distribution[minDiversityClass][targetStudentIdx] =
                  sourceStudent;

                // Update tracking
                schoolCountPerClass[sourceClass][missingSchool]--;
                if (!schoolCountPerClass[minDiversityClass][missingSchool])
                  schoolCountPerClass[minDiversityClass][missingSchool] = 0;
                schoolCountPerClass[minDiversityClass][missingSchool]++;

                if (!schoolCountPerClass[sourceClass][targetSchool])
                  schoolCountPerClass[sourceClass][targetSchool] = 0;
                schoolCountPerClass[sourceClass][targetSchool]++;

                if (!schoolCountPerClass[minDiversityClass][targetSchool])
                  schoolCountPerClass[minDiversityClass][targetSchool] = 0;
                schoolCountPerClass[minDiversityClass][targetSchool]--;

                phase2Swaps++;
                swapped = true;
                break;
              }
            }
          }
        }
        if (swapped) break;
      }

      if (!swapped) break;
    }

    console.log(`✅ Phase 1 (Reduce overload): ${phase1Swaps} swaps`);
    console.log(`✅ Phase 2 (Increase diversity): ${phase2Swaps} swaps`);

    // STEP 6: SORT setiap kelas by NAMA (A-Z)
    Object.keys(distribution).forEach((className) => {
      distribution[className].sort((a, b) =>
        (a.nama_lengkap || "").localeCompare(b.nama_lengkap || "")
      );
    });

    // STEP 7: ASSIGN NIS berurutan per kelas (sesuai urutan nama)
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

    // Log final distribution
    console.log("\n📊 Final Distribution:");
    classNames.forEach((className) => {
      const schools = Object.keys(schoolCountPerClass[className]).filter(
        (s) => s !== "Unknown" && schoolCountPerClass[className][s] > 0
      );
      console.log(
        `${className}: ${schools.length} schools - ${distribution[className].length} students`
      );
    });

    setClassDistribution(distribution);
    setShowPreview(true);
    setShowSavedClasses(false);
    setEditMode(false);

    // Initialize history
    setHistory([JSON.parse(JSON.stringify(distribution))]);
    setHistoryIndex(0);

    showToast(
      `✅ Generate ${numClasses} kelas seimbang (${totalStudents} siswa, ${
        phase1Swaps + phase2Swaps
      } optimizations)!`,
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
  const schools = [
    ...new Set(
      students.map((s) => s.asal_sekolah).filter((s) => s && s !== "Unknown")
    ),
  ];

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
