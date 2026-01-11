// 📝 Utils.js - SMP VERSION (FIXED FINAL)
import ExcelJS from "exceljs";

const roundToTwo = (num) => {
  if (num === null || num === undefined || isNaN(num)) return null;
  return Math.round(parseFloat(num) * 100) / 100;
};

const formatNum = (num) => {
  if (num === null || num === undefined || isNaN(num)) return "-";
  return Math.round(roundToTwo(num));
};

export const calculateKatrolValue = (nilai, minKelas, maxKelas, kkm, targetMax) => {
  if (nilai === null || nilai === undefined) return null;
  if (minKelas === null || maxKelas === null) return roundToTwo(nilai);
  if (minKelas === maxKelas) return roundToTwo(kkm);
  const result = kkm + ((nilai - minKelas) / (maxKelas - minKelas)) * (targetMax - kkm);
  const limitedResult = Math.min(result, targetMax);
  return roundToTwo(limitedResult);
};

export const hitungNilaiAkhir = (rataNH, psts, psas) => {
  if (rataNH === null || psts === null || psas === null) return null;
  const nilaiAkhir = rataNH * 0.4 + psts * 0.3 + psas * 0.3;
  return roundToTwo(nilaiAkhir);
};

export const organizeGradesByStudent = (gradesData) => {
  const organized = {};
  gradesData?.forEach((grade) => {
    const { student_id, assignment_type, score } = grade;
    if (!organized[student_id]) {
      organized[student_id] = {
        student_id,
        nh1: null,
        nh2: null,
        nh3: null,
        psts: null,
        psas: null,
      };
    }
    const roundedScore = score !== null ? roundToTwo(score) : null;
    switch (assignment_type) {
      case "NH1":
        organized[student_id].nh1 = roundedScore;
        break;
      case "NH2":
        organized[student_id].nh2 = roundedScore;
        break;
      case "NH3":
        organized[student_id].nh3 = roundedScore;
        break;
      case "PSTS":
        organized[student_id].psts = roundedScore;
        break;
      case "PSAS":
        organized[student_id].psas = roundedScore;
        break;
    }
  });
  return organized;
};

export const calculateMinMaxKelas = (organizedData) => {
  const nilaiAkhirList = Object.values(organizedData)
    .map((grades) => {
      const nh1 = grades.nh1;
      const nh2 = grades.nh2;
      const nh3 = grades.nh3;
      const psts = grades.psts;
      const psas = grades.psas;

      const nhValues = [nh1, nh2, nh3].filter((n) => n !== null && n > 0);
      if (nhValues.length === 0) return null;
      const rataNH = nhValues.reduce((a, b) => a + b, 0) / nhValues.length;

      if (rataNH === null || psts === null || psas === null) return null;
      return rataNH * 0.4 + psts * 0.3 + psas * 0.3;
    })
    .filter((n) => n !== null);

  if (nilaiAkhirList.length === 0) {
    return {
      nilai_akhir: { min: null, max: null },
    };
  }

  return {
    nilai_akhir: {
      min: roundToTwo(Math.min(...nilaiAkhirList)),
      max: roundToTwo(Math.max(...nilaiAkhirList)),
    },
  };
};

export const hitungRataNH = (nh1, nh2, nh3) => {
  const nhValues = [nh1, nh2, nh3].filter((n) => n !== null && n > 0);
  if (nhValues.length === 0) return null;
  const rata = nhValues.reduce((a, b) => a + b, 0) / nhValues.length;
  return roundToTwo(rata);
};

export const prosesKatrol = (
  studentsData,
  organizedGrades,
  minMax,
  kkm = 75,
  targetMax = 100,
  additionalInfo = {}
) => {
  const hasil = [];

  studentsData?.forEach((student) => {
    const studentId = student.id;
    const grades = organizedGrades[studentId] || {
      nh1: null,
      nh2: null,
      nh3: null,
      psts: null,
      psas: null,
    };

    const rataNHMentah = hitungRataNH(grades.nh1, grades.nh2, grades.nh3);
    const nilaiAkhirMentah = hitungNilaiAkhir(rataNHMentah, grades.psts, grades.psas);

    const nilaiAkhirKatrol =
      nilaiAkhirMentah !== null
        ? calculateKatrolValue(
            nilaiAkhirMentah,
            minMax.nilai_akhir.min,
            minMax.nilai_akhir.max,
            kkm,
            targetMax
          )
        : null;

    hasil.push({
      student_id: studentId,
      student_name: student.full_name,
      student_nis: student.nis,
      ...additionalInfo,
      jumlah_siswa_kelas: studentsData.length,

      nh1_mentah: grades.nh1,
      nh2_mentah: grades.nh2,
      nh3_mentah: grades.nh3,
      psts_mentah: grades.psts,
      psas_mentah: grades.psas,
      rata_nh_mentah: rataNHMentah,
      nilai_akhir_mentah: nilaiAkhirMentah,

      nilai_akhir_katrol: nilaiAkhirKatrol,

      kkm: roundToTwo(kkm),
      target_min: roundToTwo(kkm),
      target_max: roundToTwo(targetMax),
      nilai_min_kelas: minMax.nilai_akhir.min,
      nilai_max_kelas: minMax.nilai_akhir.max,
      formula_used: "katrol_nilai_akhir_only",
    });
  });

  return hasil;
};

export const formatDataForDatabase = (katrolData, userInfo) => {
  const timestamp = new Date().toISOString();
  return {
    student_id: katrolData.student_id,
    class_id: katrolData.class_id,
    teacher_id: katrolData.teacher_id || userInfo.teacherId,
    subject: katrolData.subject,
    academic_year_id: katrolData.academic_year_id,
    academic_year: katrolData.academic_year,
    semester: katrolData.semester,

    nh1: katrolData.nh1_mentah,
    nh2: katrolData.nh2_mentah,
    nh3: katrolData.nh3_mentah,
    psts: katrolData.psts_mentah,
    psas: katrolData.psas_mentah,
    rata_nh: katrolData.rata_nh_mentah,
    nilai_akhir: katrolData.nilai_akhir_mentah,

    nilai_akhir_k: katrolData.nilai_akhir_katrol,

    kkm: katrolData.kkm || 75,
    target_min: katrolData.target_min || 75,
    target_max: katrolData.target_max || 100,
    nilai_min_kelas: katrolData.nilai_min_kelas,
    nilai_max_kelas: katrolData.nilai_max_kelas,
    jumlah_siswa_kelas: katrolData.jumlah_siswa_kelas,
    formula_used: "katrol_nilai_akhir_only",
    status: "processed",
    processed_by: userInfo.userId,
    processed_at: timestamp,
    created_at: timestamp,
    updated_at: timestamp,
  };
};

// ✅ FIXED: Export Excel
export const exportToExcel = async (hasilKatrol, metadata = {}, filename = "katrol_nilai") => {
  if (!hasilKatrol || hasilKatrol.length === 0) {
    alert("Tidak ada data untuk diexport!");
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const kkm = metadata.kkm || 75;

  const worksheet = workbook.addWorksheet("Data Nilai Hasil Katrol");

  const headerData = [
    ["SMP MUSLIMIN CILILIN"],
    [`REKAPITULASI NILAI KATROL - ${(metadata.subject || "").toUpperCase()}`],
    [`KELAS ${metadata.class_name || ""}`],
    [`Tahun Ajaran: ${metadata.academic_year || ""} - Semester ${metadata.semester || ""}`],
    [""],
  ];

  let currentRow = 1;
  const totalCols = 11;
  const lastColLetter = String.fromCharCode(64 + totalCols);

  headerData.forEach((row) => {
    const r = worksheet.getRow(currentRow++);
    r.getCell(1).value = row[0];
    worksheet.mergeCells(`A${currentRow - 1}:${lastColLetter}${currentRow - 1}`);
    r.getCell(1).font = {
      bold: true,
      size: currentRow <= 4 ? 14 : 11,
      name: "Calibri",
    };
    r.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
  });

  const headers = [
    "No",
    "NIS",
    "Nama Siswa",
    "NH1",
    "NH2",
    "NH3",
    "Rata NH",
    "PSTS",
    "PSAS",
    "Nilai Akhir",
    "Hasil Katrol",
  ];

  const headerRow = worksheet.getRow(currentRow);
  headerRow.values = headers;
  headerRow.height = 30;

  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9E1F2" },
    };
    cell.font = {
      bold: true,
      size: 10,
      name: "Calibri",
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
    };
  });

  worksheet.columns = [
    { width: 5 },
    { width: 14 },
    { width: 35 },
    { width: 8 },
    { width: 8 },
    { width: 8 },
    { width: 10 },
    { width: 8 },
    { width: 8 },
    { width: 12 },
    { width: 12 },
  ];

  currentRow++;

  // ✅ ISI DATA
  hasilKatrol.forEach((siswa, index) => {
    const rowData = [
      index + 1, // No
      siswa.nis || "-", // NIS
      siswa.nama_siswa || "-", // Nama
      formatNum(siswa.nh1), // NH1
      formatNum(siswa.nh2), // NH2
      formatNum(siswa.nh3), // NH3
      formatNum(siswa.rata_nh), // Rata NH
      formatNum(siswa.psts), // PSTS
      formatNum(siswa.psas), // PSAS
      formatNum(siswa.nilai_akhir), // Nilai Akhir
      formatNum(siswa.nilai_akhir_k), // Hasil Katrol
    ];

    const r = worksheet.addRow(rowData);

    r.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } },
      };

      if (colNumber === 1 || colNumber === 2 || (colNumber >= 4 && colNumber <= 11)) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else if (colNumber === 3) {
        cell.alignment = { vertical: "middle", horizontal: "left" };
      }

      if (colNumber >= 4 && colNumber <= 11 && cell.value !== null && cell.value !== "-") {
        cell.numFmt = "0";
      }

      let fillColor = null;

      if (colNumber === 11) {
        cell.font = { bold: true };
        if (cell.value !== null && cell.value !== "-" && cell.value >= kkm) {
          fillColor = { argb: "FFC6EFCE" };
        }
      }

      if (fillColor === null && index % 2 !== 0) {
        fillColor = { argb: "FFF2F2F2" };
      }

      if (fillColor !== null) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: fillColor,
        };
      }
    });
  });

  // Generate file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  const timestamp = new Date().toISOString().split("T")[0];
  const classSafe = (metadata.class_name || "").replace(/[^a-zA-Z0-9]/g, "_");
  const subjectSafe = (metadata.subject || "").replace(/[^a-zA-Z0-9]/g, "_");
  a.download = `Katrol_${subjectSafe}_${classSafe}_${timestamp}.xlsx`;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

export const validateBeforeKatrol = (studentsData, organizedGrades) => {
  const errors = [];
  const warnings = [];

  if (!studentsData || studentsData.length === 0) {
    errors.push("Tidak ada data siswa ditemukan!");
  }

  if (!organizedGrades || Object.keys(organizedGrades).length === 0) {
    errors.push("Tidak ada data nilai ditemukan!");
  }

  const studentsWithMissingGrades = [];
  Object.entries(organizedGrades).forEach(([studentId, grades]) => {
    const missingComponents = [];
    if (grades.nh1 === null) missingComponents.push("NH1");
    if (grades.nh2 === null) missingComponents.push("NH2");
    if (grades.nh3 === null) missingComponents.push("NH3");
    if (grades.psts === null) missingComponents.push("PSTS");
    if (grades.psas === null) missingComponents.push("PSAS");

    if (missingComponents.length > 0) {
      const student = studentsData.find((s) => s.id === studentId);
      if (student) {
        studentsWithMissingGrades.push({
          name: student.full_name,
          missing: missingComponents,
        });
      }
    }
  });

  if (studentsWithMissingGrades.length > 0) {
    warnings.push(`${studentsWithMissingGrades.length} siswa memiliki nilai yang tidak lengkap`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    studentsWithMissingGrades,
  };
};

export const formatNilaiDisplay = (nilaiMentah, nilaiKatrol) => {
  if (nilaiMentah === null || nilaiKatrol === null) return "-";
  const mentah = roundToTwo(nilaiMentah);
  const katrol = roundToTwo(nilaiKatrol);
  return mentah === katrol ? Math.round(mentah) : Math.round(katrol);
};

export const formatNilaiSimple = (nilai) => {
  if (nilai === null || nilai === undefined || isNaN(nilai)) return "-";
  return Math.round(roundToTwo(nilai));
};

export const calculateClassStatistics = (hasilKatrol, kkm = 75) => {
  const nilaiAkhirValues = hasilKatrol
    .map((row) => row.nilai_akhir_katrol)
    .filter((val) => val !== null && !isNaN(val));

  if (nilaiAkhirValues.length === 0) {
    return {
      rataRata: 0,
      nilaiTerendah: 0,
      nilaiTertinggi: 0,
      jumlahTuntas: 0,
      persentaseTuntas: 0,
    };
  }

  const rataRata = nilaiAkhirValues.reduce((a, b) => a + b, 0) / nilaiAkhirValues.length;
  const nilaiTerendah = Math.min(...nilaiAkhirValues);
  const nilaiTertinggi = Math.max(...nilaiAkhirValues);
  const jumlahTuntas = nilaiAkhirValues.filter((val) => val >= kkm).length;
  const persentaseTuntas = (jumlahTuntas / nilaiAkhirValues.length) * 100;

  return {
    rataRata: roundToTwo(rataRata),
    nilaiTerendah: roundToTwo(nilaiTerendah),
    nilaiTertinggi: roundToTwo(nilaiTertinggi),
    jumlahTuntas,
    persentaseTuntas: roundToTwo(persentaseTuntas),
  };
};

export default {
  roundToTwo,
  calculateKatrolValue,
  hitungNilaiAkhir,
  hitungRataNH,
  organizeGradesByStudent,
  calculateMinMaxKelas,
  prosesKatrol,
  formatDataForDatabase,
  exportToExcel,
  validateBeforeKatrol,
  formatNilaiDisplay,
  formatNilaiSimple,
  calculateClassStatistics,
};
