// ClassDistribution.js - OPTIMIZED VERSION untuk distribusi asal SD lebih proporsional

// Fungsi untuk format tampilan tahun ajaran (26.27 -> 2026/2027)
export const formatTahunAjaran = (tahunAjaran) => {
  const [tahun1, tahun2] = tahunAjaran.split(".");
  return `20${tahun1}/20${tahun2}`;
};

export const getTahunAjaran = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  let baseYear;
  if (month >= 1 && month <= 7) {
    baseYear = year;
  } else {
    baseYear = year + 1;
  }
  const tahun1 = baseYear.toString().slice(-2);
  const tahun1Int = parseInt(tahun1);
  const tahun2 = (tahun1Int + 1).toString().padStart(2, "0");
  const result = `${tahun1}.${tahun2}`;

  console.log("🔥 getTahunAjaran() HASIL:", result); // ← TAMBAH INI

  return result;
};

// Fungsi untuk generate NIS dengan format: 26.27.07.001
export const generateNIS = (tahunAjaran, grade, nomorUrut) => {
  console.log("🔥 generateNIS INPUT:", { tahunAjaran, grade, nomorUrut }); // ← TAMBAH INI

  const gradeStr = grade.toString().padStart(2, "0");
  const nomorStr = nomorUrut.toString().padStart(3, "0");
  const result = `${tahunAjaran}.${gradeStr}.${nomorStr}`;

  console.log("🔥 generateNIS HASIL:", result); // ← TAMBAH INI

  return result;
};

// Helper function to sanitize school name
const sanitizeSchoolName = (schoolName) => {
  if (!schoolName || schoolName === "Unknown") return "Unknown";
  return schoolName.trim().replace(/\s+/g, " ");
};

// Algoritma Pembagian Kelas OPTIMAL - Maximum Balance & School Distribution
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
    // STEP 0: SANITIZE ALL STUDENT DATA
    const sanitizedStudents = unassignedStudents.map((student) => ({
      ...student,
      asal_sekolah: sanitizeSchoolName(student.asal_sekolah),
    }));

    console.log("🧹 Data sanitized - school names normalized");

    // STEP 1: MAXIMUM DISTRIBUTION - Strict Round-Robin by School
    const distributeBySchool = (students) => {
      const bySchool = {};
      students.forEach((s) => {
        const school = sanitizeSchoolName(s.asal_sekolah);
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

      // ULTRA STRICT Round-Robin
      const result = [];
      const schools = Object.keys(bySchool).sort();
      const maxLength = Math.max(...Object.values(bySchool).map((arr) => arr.length));

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
    const males = sanitizedStudents.filter((s) => s.jenis_kelamin === "L");
    const females = sanitizedStudents.filter((s) => s.jenis_kelamin === "P");

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

    // 🔥 FIX: sisa pembagian (remainder) laki-laki & perempuan HARUS
    // ditaro di kelas yang BEDA sebisa mungkin. Kalau dua-duanya ditaro
    // di kelas awal (index 0, 1, dst) kayak sebelumnya, ada resiko
    // numpuk: 1 kelas kebagian sisa laki-laki DAN sisa perempuan
    // sekaligus (+2), sementara kelas lain gak dapet sisa sama sekali.
    // Contoh nyata: 26 siswa / 6 kelas = 4 sisa 2 -> harusnya jadi
    // 5,5,4,4,4,4 (sisa nyebar 2 kelas), BUKAN 6,4,4,4,4,4 (numpuk 1
    // kelas). Makanya sisa laki-laki ditaro dari kelas AWAL, sisa
    // perempuan dari kelas AKHIR -- biar dua sisa itu jatuh di kelas
    // yang beda (kecuali sisanya emang banyak sampe ketemu di tengah,
    // itu pun otomatis nyebar rata karena saling silang).
    const maleRemainder = males.length % numClasses;
    const femaleRemainder = females.length % numClasses;

    // STEP 2: Distribute Males - Round Robin (sisa di kelas AWAL)
    let maleIndex = 0;
    classNames.forEach((className, classIdx) => {
      const targetMales =
        Math.floor(males.length / numClasses) + (classIdx < maleRemainder ? 1 : 0);

      for (let i = 0; i < targetMales && maleIndex < distributedMales.length; i++) {
        distribution[className].push(distributedMales[maleIndex]);
        maleIndex++;
      }
    });

    // STEP 3: Distribute Females - Round Robin (sisa di kelas AKHIR)
    let femaleIndex = 0;
    classNames.forEach((className, classIdx) => {
      const isExtraClass = classIdx >= numClasses - femaleRemainder;
      const targetFemales = Math.floor(females.length / numClasses) + (isExtraClass ? 1 : 0);

      for (let i = 0; i < targetFemales && femaleIndex < distributedFemales.length; i++) {
        distribution[className].push(distributedFemales[femaleIndex]);
        femaleIndex++;
      }
    });

    // STEP 4: Track School Distribution
    const schoolCountPerClass = {};
    classNames.forEach((className) => {
      schoolCountPerClass[className] = {};
      distribution[className].forEach((student) => {
        const school = sanitizeSchoolName(student.asal_sekolah);
        if (!schoolCountPerClass[className][school]) {
          schoolCountPerClass[className][school] = 0;
        }
        schoolCountPerClass[className][school]++;
      });
    });

    // STEP 5: ENHANCED MULTI-PHASE REBALANCING
    const studentsWithSchool = sanitizedStudents.filter(
      (s) => s.asal_sekolah && s.asal_sekolah !== "Unknown"
    );
    const uniqueSchools = [
      ...new Set(studentsWithSchool.map((s) => sanitizeSchoolName(s.asal_sekolah))),
    ];

    console.log("🔍 Rebalancing Stats:");
    console.log(`Total Schools: ${uniqueSchools.length}`);
    console.log(`Total Students with School: ${studentsWithSchool.length}`);

    // ⭐ OPTIMIZED THRESHOLDS - Lebih ketat!
    const avgSchoolsFromSameSchool = studentsWithSchool.length / uniqueSchools.length / numClasses;

    // Threshold lebih ketat: maksimal hanya boleh 1 siswa lebih dari rata-rata
    const maxSchoolPerClass = Math.ceil(avgSchoolsFromSameSchool);
    const minSchoolPerClass = Math.floor(avgSchoolsFromSameSchool);

    console.log(`Target students per school per class: ${avgSchoolsFromSameSchool.toFixed(2)}`);
    console.log(`Max allowed: ${maxSchoolPerClass}`);
    console.log(`Min target: ${minSchoolPerClass}`);

    // PHASE 1: Reduce overloaded schools (ENHANCED - lebih banyak iterasi)
    let phase1Swaps = 0;
    for (let iteration = 0; iteration < 200; iteration++) {
      let swapped = false;

      for (const className of classNames) {
        for (const school in schoolCountPerClass[className]) {
          if (school === "Unknown") continue;

          if (schoolCountPerClass[className][school] > maxSchoolPerClass) {
            for (const targetClass of classNames) {
              if (targetClass === className) continue;

              const targetCount = schoolCountPerClass[targetClass][school] || 0;

              if (targetCount < maxSchoolPerClass) {
                const sourceStudentIdx = distribution[className].findIndex(
                  (s) => sanitizeSchoolName(s.asal_sekolah) === school
                );

                if (sourceStudentIdx !== -1) {
                  const sourceStudent = distribution[className][sourceStudentIdx];

                  const targetStudentIdx = distribution[targetClass].findIndex(
                    (s) =>
                      s.jenis_kelamin === sourceStudent.jenis_kelamin &&
                      sanitizeSchoolName(s.asal_sekolah) !== school
                  );

                  if (targetStudentIdx !== -1) {
                    const targetStudent = distribution[targetClass][targetStudentIdx];
                    const targetSchool = sanitizeSchoolName(targetStudent.asal_sekolah);

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

    // PHASE 2: Increase school diversity (ENHANCED - target 80-90% coverage)
    let phase2Swaps = 0;
    const targetDiversityRatio = 0.85;

    for (let iteration = 0; iteration < 200; iteration++) {
      let swapped = false;

      let minDiversityClass = null;
      let minDiversity = Infinity;

      for (const className of classNames) {
        const schoolsInClass = Object.keys(schoolCountPerClass[className]).filter(
          (s) => s !== "Unknown" && schoolCountPerClass[className][s] > 0
        );
        if (schoolsInClass.length < minDiversity) {
          minDiversity = schoolsInClass.length;
          minDiversityClass = className;
        }
      }

      if (
        !minDiversityClass ||
        minDiversity >= Math.floor(uniqueSchools.length * targetDiversityRatio)
      ) {
        break;
      }

      const schoolsInMinClass = Object.keys(schoolCountPerClass[minDiversityClass]).filter(
        (s) => s !== "Unknown" && schoolCountPerClass[minDiversityClass][s] > 0
      );
      const missingSchools = uniqueSchools.filter((s) => !schoolsInMinClass.includes(s));

      for (const missingSchool of missingSchools) {
        for (const sourceClass of classNames) {
          if (sourceClass === minDiversityClass) continue;

          const sourceCount = schoolCountPerClass[sourceClass][missingSchool] || 0;
          if (sourceCount > minSchoolPerClass) {
            const sourceStudentIdx = distribution[sourceClass].findIndex(
              (s) => sanitizeSchoolName(s.asal_sekolah) === missingSchool
            );

            if (sourceStudentIdx !== -1) {
              const sourceStudent = distribution[sourceClass][sourceStudentIdx];

              const targetStudentIdx = distribution[minDiversityClass].findIndex(
                (s) => s.jenis_kelamin === sourceStudent.jenis_kelamin
              );

              if (targetStudentIdx !== -1) {
                const targetStudent = distribution[minDiversityClass][targetStudentIdx];
                const targetSchool = sanitizeSchoolName(targetStudent.asal_sekolah);

                // Swap
                distribution[sourceClass][sourceStudentIdx] = targetStudent;
                distribution[minDiversityClass][targetStudentIdx] = sourceStudent;

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

    // ⭐ PHASE 3: BALANCE FINAL PASS - Ratakan variance asal SD antar kelas
    let phase3Swaps = 0;
    for (let iteration = 0; iteration < 100; iteration++) {
      let swapped = false;

      // Hitung variance jumlah asal SD per kelas
      const schoolCounts = classNames.map((className) => {
        return Object.keys(schoolCountPerClass[className]).filter(
          (s) => s !== "Unknown" && schoolCountPerClass[className][s] > 0
        ).length;
      });

      const avgSchoolCount = schoolCounts.reduce((a, b) => a + b, 0) / schoolCounts.length;
      const variance =
        schoolCounts.reduce((sum, count) => sum + Math.pow(count - avgSchoolCount, 2), 0) /
        schoolCounts.length;

      // Kalau variance sudah cukup kecil, stop
      if (variance < 0.5) break;

      // Cari kelas dengan diversity tertinggi dan terendah
      const maxDiversityClass = classNames[schoolCounts.indexOf(Math.max(...schoolCounts))];
      const minDiversityClass = classNames[schoolCounts.indexOf(Math.min(...schoolCounts))];

      if (maxDiversityClass === minDiversityClass) break;

      // Cari school yang ada di maxClass tapi tidak di minClass
      const schoolsInMax = Object.keys(schoolCountPerClass[maxDiversityClass]).filter(
        (s) => s !== "Unknown" && schoolCountPerClass[maxDiversityClass][s] > 0
      );
      const schoolsInMin = Object.keys(schoolCountPerClass[minDiversityClass]).filter(
        (s) => s !== "Unknown" && schoolCountPerClass[minDiversityClass][s] > 0
      );
      const uniqueToMax = schoolsInMax.filter((s) => !schoolsInMin.includes(s));

      for (const school of uniqueToMax) {
        const sourceStudentIdx = distribution[maxDiversityClass].findIndex(
          (s) => sanitizeSchoolName(s.asal_sekolah) === school
        );

        if (sourceStudentIdx !== -1) {
          const sourceStudent = distribution[maxDiversityClass][sourceStudentIdx];

          const targetStudentIdx = distribution[minDiversityClass].findIndex(
            (s) => s.jenis_kelamin === sourceStudent.jenis_kelamin
          );

          if (targetStudentIdx !== -1) {
            const targetStudent = distribution[minDiversityClass][targetStudentIdx];
            const targetSchool = sanitizeSchoolName(targetStudent.asal_sekolah);

            // Swap
            distribution[maxDiversityClass][sourceStudentIdx] = targetStudent;
            distribution[minDiversityClass][targetStudentIdx] = sourceStudent;

            // Update tracking
            schoolCountPerClass[maxDiversityClass][school]--;
            if (schoolCountPerClass[maxDiversityClass][school] === 0) {
              delete schoolCountPerClass[maxDiversityClass][school];
            }

            if (!schoolCountPerClass[minDiversityClass][school])
              schoolCountPerClass[minDiversityClass][school] = 0;
            schoolCountPerClass[minDiversityClass][school]++;

            if (!schoolCountPerClass[maxDiversityClass][targetSchool])
              schoolCountPerClass[maxDiversityClass][targetSchool] = 0;
            schoolCountPerClass[maxDiversityClass][targetSchool]++;

            if (!schoolCountPerClass[minDiversityClass][targetSchool])
              schoolCountPerClass[minDiversityClass][targetSchool] = 0;
            schoolCountPerClass[minDiversityClass][targetSchool]--;
            if (schoolCountPerClass[minDiversityClass][targetSchool] === 0) {
              delete schoolCountPerClass[minDiversityClass][targetSchool];
            }

            phase3Swaps++;
            swapped = true;
            break;
          }
        }
      }

      if (!swapped) break;
    }

    console.log(`✅ Phase 1 (Reduce overload): ${phase1Swaps} swaps`);
    console.log(`✅ Phase 2 (Increase diversity): ${phase2Swaps} swaps`);
    console.log(`✅ Phase 3 (Balance variance): ${phase3Swaps} swaps`);

    // ⭐ PHASE 4: FORCE SPREAD DOMINANT SCHOOLS (v2 - lebih niat & lebih ketat)
    // Bug versi lama: begitu 1 sekolah gagal nemu kandidat tukeran yang valid,
    // SELURUH phase langsung nyerah (padahal sekolah lain yang masih timpang
    // jadi ikut kebengkalai gara-gara 1 sekolah "sial" ketemu duluan). Versi
    // ini: setiap sekolah yang timpang dicoba SEMUA kombinasi kandidat
    // (semua kelas overload x semua siswa di kelas itu x semua kelas
    // underload x semua siswa di kelas itu) sebelum dianggap "gak bisa
    // diperbaiki", dan sekolah lain tetap lanjut diproses walau 1 sekolah
    // gagal. Ambang batas selisih juga diperketat dari >3 jadi >2, karena
    // kelas isi ~20 siswa dari ~10-11 sekolah asal, selisih 3 masih kerasa
    // njomplang.
    let phase4Swaps = 0;
    const maxAllowedSpread = 1;

    for (let iteration = 0; iteration < 300; iteration++) {
      let anySwapThisIteration = false;

      for (const school of uniqueSchools) {
        const schoolDistribution = classNames.map(
          (className) => schoolCountPerClass[className][school] || 0
        );
        const maxInClass = Math.max(...schoolDistribution);
        const minInClass = Math.min(...schoolDistribution);

        // Sekolah ini udah cukup rata, skip - lanjut cek sekolah berikutnya
        // (BUKAN berhenti total)
        if (maxInClass - minInClass <= maxAllowedSpread) continue;

        // Semua kelas yang lagi "kebanyakan" & "kekurangan" dari sekolah ini
        // (bisa lebih dari 1 kelas masing-masing)
        const overloadedClasses = classNames.filter(
          (c) => (schoolCountPerClass[c][school] || 0) === maxInClass
        );
        const underloadedClasses = classNames.filter(
          (c) => (schoolCountPerClass[c][school] || 0) === minInClass
        );

        let swappedForThisSchool = false;

        for (const maxClassName of overloadedClasses) {
          if (swappedForThisSchool) break;

          const candidateSources = distribution[maxClassName].filter(
            (s) => sanitizeSchoolName(s.asal_sekolah) === school
          );

          for (const sourceStudent of candidateSources) {
            if (swappedForThisSchool) break;

            for (const minClassName of underloadedClasses) {
              if (swappedForThisSchool) break;

              // Coba SEMUA kandidat target di kelas ini (bukan cuma yang
              // pertama ketemu) - urutkan biar swap yang paling "aman"
              // (gak numpuk sekolah lain) dicoba duluan.
              const candidateTargets = distribution[minClassName]
                .filter(
                  (s) =>
                    s.jenis_kelamin === sourceStudent.jenis_kelamin &&
                    sanitizeSchoolName(s.asal_sekolah) !== school
                )
                .sort((a, b) => {
                  const aCount =
                    schoolCountPerClass[maxClassName][sanitizeSchoolName(a.asal_sekolah)] || 0;
                  const bCount =
                    schoolCountPerClass[maxClassName][sanitizeSchoolName(b.asal_sekolah)] || 0;
                  return aCount - bCount;
                });

              for (const targetStudent of candidateTargets) {
                const targetSchool = sanitizeSchoolName(targetStudent.asal_sekolah);
                const targetSchoolInMax = schoolCountPerClass[maxClassName][targetSchool] || 0;
                const targetSchoolInMin = schoolCountPerClass[minClassName][targetSchool] || 0;

                // Swap gak boleh bikin sekolah lain jadi timpang gara-gara
                // pindah tempat
                if (targetSchoolInMax + 1 - (targetSchoolInMin - 1) > maxAllowedSpread) continue;

                // Lakukan swap
                const srcIdx = distribution[maxClassName].findIndex(
                  (s) => s.id === sourceStudent.id
                );
                const tgtIdx = distribution[minClassName].findIndex(
                  (s) => s.id === targetStudent.id
                );
                distribution[maxClassName][srcIdx] = targetStudent;
                distribution[minClassName][tgtIdx] = sourceStudent;

                // Update tracking
                schoolCountPerClass[maxClassName][school]--;
                schoolCountPerClass[minClassName][school] =
                  (schoolCountPerClass[minClassName][school] || 0) + 1;

                if (!schoolCountPerClass[maxClassName][targetSchool])
                  schoolCountPerClass[maxClassName][targetSchool] = 0;
                schoolCountPerClass[maxClassName][targetSchool]++;

                if (!schoolCountPerClass[minClassName][targetSchool])
                  schoolCountPerClass[minClassName][targetSchool] = 0;
                schoolCountPerClass[minClassName][targetSchool]--;

                phase4Swaps++;
                swappedForThisSchool = true;
                anySwapThisIteration = true;
                break;
              }
            }
          }
        }
        // swappedForThisSchool gagal? Gapapa, lanjut ke sekolah berikutnya
        // di for-loop ini juga (bukan break keluar semua) - itu inti
        // perbaikannya.
      }

      // Baru berhenti kalau SATU PUTARAN PENUH ke semua sekolah gak
      // menghasilkan swap sama sekali (beneran udah mentok/optimal),
      // bukan cuma gara-gara 1 sekolah pertama gagal.
      if (!anySwapThisIteration) break;
    }

    console.log(`✅ Phase 4 (Force spread dominant): ${phase4Swaps} swaps`);

    // PHASE 5: Rebalance rata-rata skor akademik diagnostik antar kelas.
    // Ini PERTIMBANGAN PALING RENDAH prioritasnya -- di bawah gender & asal
    // sekolah. Banyak siswa gak punya skor ini (data dari sekolah asal
    // sering gak lengkap/gak jelas kata TU), jadi itu NORMAL: siswa yang
    // skornya kosong (null) tetap dibiarkan di posisinya, cuma siswa yang
    // PUNYA skor yang dipertimbangkan buat nyeimbangin rata-rata per
    // kelas. Kalau kelas yang mau dibandingin sama-sama gak punya data
    // skor, proses ini otomatis berhenti tanpa error -- pembagian kelas
    // TETAP jalan normal berdasarkan gender + sekolah aja.
    let phase5Swaps = 0;

    const getAvgSkor = (className) => {
      const scored = distribution[className].filter((s) => typeof s.skor_akademik === "number");
      if (scored.length === 0) return null; // gak ada data -- skip, bukan error
      return scored.reduce((sum, s) => sum + s.skor_akademik, 0) / scored.length;
    };

    for (let iteration = 0; iteration < 100; iteration++) {
      const classAverages = classNames
        .map((className) => ({ className, avg: getAvgSkor(className) }))
        .filter((c) => c.avg !== null);

      // Kurang dari 2 kelas yang punya data skor -> gak ada yang bisa
      // dibandingkan, stop (skor kosong semua/hampir semua = wajar, lanjut
      // aja pakai hasil gender+sekolah yang udah ada).
      if (classAverages.length < 2) break;

      classAverages.sort((a, b) => b.avg - a.avg);
      const highest = classAverages[0];
      const lowest = classAverages[classAverages.length - 1];

      // Selisih rata-rata udah kecil (<5 poin dari skala 0-100) -> anggap
      // cukup seimbang, gak usah dipaksa terus-terusan.
      if (highest.avg - lowest.avg < 5) break;

      // Cari kandidat tuker: skor tinggi di kelas `highest` <-> skor
      // rendah di kelas `lowest`. WAJIB gender sama (biar balance gender
      // yang udah dicapai Phase 2-3 gak keganggu), dan swap gak boleh
      // bikin sebaran sekolah numpuk ngelewatin `maxSchoolPerClass` yang
      // udah ditetapkan di Phase 1.
      const highClassStudents = distribution[highest.className]
        .filter((s) => typeof s.skor_akademik === "number")
        .sort((a, b) => b.skor_akademik - a.skor_akademik);
      const lowClassStudents = distribution[lowest.className]
        .filter((s) => typeof s.skor_akademik === "number")
        .sort((a, b) => a.skor_akademik - b.skor_akademik);

      let didSwap = false;
      for (const highStudent of highClassStudents) {
        for (const lowStudent of lowClassStudents) {
          if (highStudent.jenis_kelamin !== lowStudent.jenis_kelamin) continue;
          if (highStudent.skor_akademik <= lowStudent.skor_akademik) continue;

          const highSchool = sanitizeSchoolName(highStudent.asal_sekolah);
          const lowSchool = sanitizeSchoolName(lowStudent.asal_sekolah);

          if (highSchool !== lowSchool) {
            const highSchoolCountInLowClass =
              schoolCountPerClass[lowest.className][highSchool] || 0;
            const lowSchoolCountInHighClass =
              schoolCountPerClass[highest.className][lowSchool] || 0;

            if (highSchoolCountInLowClass + 1 > maxSchoolPerClass) continue;
            if (lowSchoolCountInHighClass + 1 > maxSchoolPerClass) continue;
          }

          // Lakukan swap
          distribution[highest.className] = distribution[highest.className].filter(
            (s) => s.id !== highStudent.id
          );
          distribution[lowest.className] = distribution[lowest.className].filter(
            (s) => s.id !== lowStudent.id
          );
          distribution[highest.className].push(lowStudent);
          distribution[lowest.className].push(highStudent);

          // Update tracking sebaran sekolah
          if (highSchool !== lowSchool) {
            schoolCountPerClass[highest.className][highSchool]--;
            schoolCountPerClass[highest.className][lowSchool] =
              (schoolCountPerClass[highest.className][lowSchool] || 0) + 1;
            schoolCountPerClass[lowest.className][lowSchool]--;
            schoolCountPerClass[lowest.className][highSchool] =
              (schoolCountPerClass[lowest.className][highSchool] || 0) + 1;
          }

          phase5Swaps++;
          didSwap = true;
          break;
        }
        if (didSwap) break;
      }

      // Gak ada kandidat swap yang valid (misal kehalang batas sekolah
      // terus) -> stop, jangan infinite loop.
      if (!didSwap) break;
    }

    console.log(`✅ Phase 5 (Rebalance skor diagnostik): ${phase5Swaps} swaps`);

    // STEP 6: SORT setiap kelas by NAMA (A-Z)
    // ⚠️ NIS SENGAJA TIDAK di-generate di sini. NIS baru dikasih sekolah
    // belakangan setelah siswa BENER-BENER fixed diterima & penempatan
    // kelasnya final (proses terpisah, bukan bagian dari pembagian kelas
    // ini). `generateNIS`/`getTahunAjaran` di atas dibiarin ada buat
    // dipakai nanti di tahap NIS assignment yang terpisah itu.
    Object.keys(distribution).forEach((className) => {
      distribution[className].sort((a, b) =>
        (a.nama_lengkap || "").localeCompare(b.nama_lengkap || "")
      );
    });

    // Log final distribution dengan detail
    console.log("\n📊 Final Distribution:");
    classNames.forEach((className) => {
      const schools = Object.keys(schoolCountPerClass[className]).filter(
        (s) => s !== "Unknown" && schoolCountPerClass[className][s] > 0
      );
      const schoolDetails = schools
        .map((s) => `${s}:${schoolCountPerClass[className][s]}`)
        .join(", ");
      console.log(
        `${className}: ${schools.length} schools (${schoolDetails}) - ${distribution[className].length} students`
      );
    });

    // Log school distribution summary
    const schoolSummary = {};
    uniqueSchools.forEach((school) => {
      schoolSummary[school] = sanitizedStudents.filter(
        (s) => sanitizeSchoolName(s.asal_sekolah) === school
      ).length;
    });
    console.log("\n📚 School Distribution Summary:", schoolSummary);

    setClassDistribution(distribution);
    setShowPreview(true);
    setShowSavedClasses(false);
    setEditMode(false);

    setHistory([JSON.parse(JSON.stringify(distribution))]);
    setHistoryIndex(0);

    const totalSwaps = phase1Swaps + phase2Swaps + phase3Swaps + phase4Swaps + phase5Swaps;
    showToast(
      `✅ Generate ${numClasses} kelas seimbang (${sanitizedStudents.length} siswa, ${totalSwaps} optimizations)!`,
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
    Object.values(classDistribution).reduce((sum, students) => sum + students.length, 0) /
    Object.keys(classDistribution).length;

  Object.entries(classDistribution).forEach(([className, students]) => {
    const males = students.filter((s) => s.jenis_kelamin === "L").length;
    const females = students.filter((s) => s.jenis_kelamin === "P").length;
    const total = students.length;

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
    ...new Set(students.map((s) => s.asal_sekolah).filter((s) => s && s !== "Unknown")),
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
