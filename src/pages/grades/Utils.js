// 📝 Utils.js - SMP VERSION (with ExcelJS styling + Dynamic Columns)
import ExcelJS from "exceljs";

const roundToTwo = (num) => {
  if (num === null || num === undefined || isNaN(num)) return null;
  return Math.round(parseFloat(num) * 100) / 100;
};

const formatNum = (num) => {
  if (num === null || num === undefined || isNaN(num)) return null;
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
  const nh = rataNH || 0;
  const uts = psts || 0;
  const uas = psas || 0;
  const nilaiAkhir = nh * 0.4 + uts * 0.3 + uas * 0.3;
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
  const minMax = {
    nh1: { min: null, max: null },
    nh2: { min: null, max: null },
    nh3: { min: null, max: null },
    psts: { min: null, max: null },
    psas: { min: null, max: null },
  };
  const students = Object.values(organizedData);
  ["nh1", "nh2", "nh3", "psts", "psas"].forEach((component) => {
    const values = students
      .map((student) => student[component])
      .filter((val) => val !== null && !isNaN(val));
    if (values.length > 0) {
      minMax[component].min = roundToTwo(Math.min(...values));
      minMax[component].max = roundToTwo(Math.max(...values));
    }
  });
  return minMax;
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
    const nilaiAkhirMentah =
      rataNHMentah !== null && grades.psts !== null && grades.psas !== null
        ? hitungNilaiAkhir(rataNHMentah, grades.psts, grades.psas)
        : null;
    const nh1Katrol = calculateKatrolValue(
      grades.nh1,
      minMax.nh1.min,
      minMax.nh1.max,
      kkm,
      targetMax
    );
    const nh2Katrol = calculateKatrolValue(
      grades.nh2,
      minMax.nh2.min,
      minMax.nh2.max,
      kkm,
      targetMax
    );
    const nh3Katrol = calculateKatrolValue(
      grades.nh3,
      minMax.nh3.min,
      minMax.nh3.max,
      kkm,
      targetMax
    );
    const pstsKatrol = calculateKatrolValue(
      grades.psts,
      minMax.psts.min,
      minMax.psts.max,
      kkm,
      targetMax
    );
    const psasKatrol = calculateKatrolValue(
      grades.psas,
      minMax.psas.min,
      minMax.psas.max,
      kkm,
      targetMax
    );
    const rataNHKatrol = hitungRataNH(nh1Katrol, nh2Katrol, nh3Katrol);
    const nilaiAkhirKatrol =
      rataNHKatrol !== null && pstsKatrol !== null && psasKatrol !== null
        ? hitungNilaiAkhir(rataNHKatrol, pstsKatrol, psasKatrol)
        : null;
    const nilaiAkhirMentahValues = Object.values(organizedGrades)
      .map((g) => {
        const rataNH = hitungRataNH(g.nh1, g.nh2, g.nh3);
        return rataNH !== null && g.psts !== null && g.psas !== null
          ? hitungNilaiAkhir(rataNH, g.psts, g.psas)
          : null;
      })
      .filter((val) => val !== null);
    const nilaiMinKelas =
      nilaiAkhirMentahValues.length > 0 ? roundToTwo(Math.min(...nilaiAkhirMentahValues)) : null;
    const nilaiMaxKelas =
      nilaiAkhirMentahValues.length > 0 ? roundToTwo(Math.max(...nilaiAkhirMentahValues)) : null;
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
      nh1_katrol: nh1Katrol,
      nh2_katrol: nh2Katrol,
      nh3_katrol: nh3Katrol,
      psts_katrol: pstsKatrol,
      psas_katrol: psasKatrol,
      rata_nh_katrol: rataNHKatrol,
      nilai_akhir_katrol: nilaiAkhirKatrol,
      kkm: roundToTwo(kkm),
      target_min: roundToTwo(kkm),
      target_max: roundToTwo(targetMax),
      nilai_min_kelas: nilaiMinKelas,
      nilai_max_kelas: nilaiMaxKelas,
      formula_used: "linear_scaling",
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
    nh1_k: katrolData.nh1_katrol,
    nh2_k: katrolData.nh2_katrol,
    nh3_k: katrolData.nh3_katrol,
    psts_k: katrolData.psts_katrol,
    psas_k: katrolData.psas_katrol,
    rata_nh_k: katrolData.rata_nh_katrol,
    nilai_akhir_k: katrolData.nilai_akhir_katrol,
    kkm: katrolData.kkm || 75,
    target_min: katrolData.target_min || 75,
    target_max: katrolData.target_max || 100,
    nilai_min_kelas: katrolData.nilai_min_kelas,
    nilai_max_kelas: katrolData.nilai_max_kelas,
    jumlah_siswa_kelas: katrolData.jumlah_siswa_kelas,
    formula_used: "linear_scaling",
    status: "processed",
    processed_by: userInfo.userId,
    processed_at: timestamp,
    created_at: timestamp,
    updated_at: timestamp,
  };
};

export const exportToExcel = async (hasilKatrol, metadata = {}, filename = "katrol_nilai") => {
  if (!hasilKatrol || hasilKatrol.length === 0) {
    alert("Tidak ada data untuk diexport!");
    return;
  }
  const workbook = new ExcelJS.Workbook();
  const kkm = metadata.kkm || 75;
  const hasNH1 = hasilKatrol.some((r) => r.nh1 !== null && r.nh1 !== undefined);
  const hasNH2 = hasilKatrol.some((r) => r.nh2 !== null && r.nh2 !== undefined);
  const hasNH3 = hasilKatrol.some((r) => r.nh3 !== null && r.nh3 !== undefined);
  const hasPSTS = hasilKatrol.some((r) => r.psts !== null && r.psts !== undefined);
  const hasPSAS = hasilKatrol.some((r) => r.psas !== null && r.psas !== undefined);

  const ws1 = workbook.addWorksheet("Data Lengkap");
  const headerData = [
    ["SMP MUSLIMIN CILILIN"],
    [`REKAPITULASI NILAI KATROL - ${(metadata.subject || "").toUpperCase()}`],
    [`KELAS ${metadata.class_name || ""}`],
    [`Tahun Ajaran: ${metadata.academic_year || ""} - Semester ${metadata.semester || ""}`],
    [""],
  ];
  let currentRow = 1;
  let totalCols = 3;
  if (hasNH1) totalCols += 2;
  if (hasNH2) totalCols += 2;
  if (hasNH3) totalCols += 2;
  totalCols += 2;
  if (hasPSTS) totalCols += 2;
  if (hasPSAS) totalCols += 2;
  totalCols += 2;
  const lastColLetter = String.fromCharCode(64 + totalCols);
  headerData.forEach((row) => {
    const r = ws1.getRow(currentRow++);
    r.getCell(1).value = row[0];
    ws1.mergeCells(`A${currentRow - 1}:${lastColLetter}${currentRow - 1}`);
    r.getCell(1).font = {
      bold: true,
      size: currentRow <= 3 ? 14 : 11,
      name: "Calibri",
    };
    r.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
  });
  const headers = ["No", "NIS", "Nama Siswa"];
  if (hasNH1) headers.push("NH1", "NH1-K");
  if (hasNH2) headers.push("NH2", "NH2-K");
  if (hasNH3) headers.push("NH3", "NH3-K");
  headers.push("Rata NH", "Rata NH-K");
  if (hasPSTS) headers.push("PSTS", "PSTS-K");
  if (hasPSAS) headers.push("PSAS", "PSAS-K");
  headers.push("Nilai Akhir", "Nilai Akhir-K");
  const headerRow = ws1.getRow(currentRow);
  headerRow.values = headers;
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9E1F2" },
    };
    cell.font = { bold: true, size: 10 };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
  const columnWidths = [{ width: 5 }, { width: 14 }, { width: 40 }];
  if (hasNH1) columnWidths.push({ width: 7 }, { width: 7 });
  if (hasNH2) columnWidths.push({ width: 7 }, { width: 7 });
  if (hasNH3) columnWidths.push({ width: 7 }, { width: 7 });
  columnWidths.push({ width: 9 }, { width: 9 });
  if (hasPSTS) columnWidths.push({ width: 7 }, { width: 7 });
  if (hasPSAS) columnWidths.push({ width: 7 }, { width: 7 });
  columnWidths.push({ width: 10 }, { width: 14 });
  ws1.columns = columnWidths;
  currentRow++;
  hasilKatrol.forEach((siswa, index) => {
    const rowData = [index + 1, siswa.nis, siswa.nama_siswa];
    if (hasNH1) rowData.push(formatNum(siswa.nh1), formatNum(siswa.nh1_k));
    if (hasNH2) rowData.push(formatNum(siswa.nh2), formatNum(siswa.nh2_k));
    if (hasNH3) rowData.push(formatNum(siswa.nh3), formatNum(siswa.nh3_k));
    rowData.push(formatNum(siswa.rata_nh), formatNum(siswa.rata_nh_k));
    if (hasPSTS) rowData.push(formatNum(siswa.psts), formatNum(siswa.psts_k));
    if (hasPSAS) rowData.push(formatNum(siswa.psas), formatNum(siswa.psas_k));
    rowData.push(formatNum(siswa.nilai_akhir), formatNum(siswa.nilai_akhir_k));
    const r = ws1.addRow(rowData);
    r.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      if (colNumber === 1 || colNumber === 2)
        cell.alignment = { vertical: "middle", horizontal: "center" };
      else if (colNumber === 3) cell.alignment = { vertical: "middle", horizontal: "left" };
      else {
        cell.alignment = { vertical: "middle", horizontal: "center" };
        if (cell.value !== null) {
          cell.numFmt = "0";
          if (colNumber >= headers.length - 1) cell.font = { bold: true };
        }
      }
      if (index % 2 !== 0)
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF2F2F2" },
        };
    });
  });

  const ws2 = workbook.addWorksheet("Katrol Akhir");
  const headerData2 = [
    ["SMP MUSLIMIN CILILIN"],
    [`NILAI KATROL AKHIR - ${(metadata.subject || "").toUpperCase()}`],
    [`KELAS ${metadata.class_name || ""}`],
    [`Tahun Ajaran: ${metadata.academic_year || ""} - Semester ${metadata.semester || ""}`],
    [""],
  ];
  currentRow = 1;
  let totalCols2 = 3;
  if (hasNH1) totalCols2 += 1;
  if (hasNH2) totalCols2 += 1;
  if (hasNH3) totalCols2 += 1;
  totalCols2 += 1;
  if (hasPSTS) totalCols2 += 1;
  if (hasPSAS) totalCols2 += 1;
  totalCols2 += 1;
  const lastColLetter2 = String.fromCharCode(64 + totalCols2);
  headerData2.forEach((row) => {
    const r = ws2.getRow(currentRow++);
    r.getCell(1).value = row[0];
    ws2.mergeCells(`A${currentRow - 1}:${lastColLetter2}${currentRow - 1}`);
    r.getCell(1).font = {
      bold: true,
      size: currentRow <= 3 ? 14 : 11,
      name: "Calibri",
    };
    r.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
  });
  const headers2 = ["No", "NIS", "Nama Siswa"];
  if (hasNH1) headers2.push("NH1-K");
  if (hasNH2) headers2.push("NH2-K");
  if (hasNH3) headers2.push("NH3-K");
  headers2.push("Rata NH-K");
  if (hasPSTS) headers2.push("PSTS-K");
  if (hasPSAS) headers2.push("PSAS-K");
  headers2.push("Nilai Akhir-K");
  const headerRow2 = ws2.getRow(currentRow);
  headerRow2.values = headers2;
  headerRow2.height = 30;
  headerRow2.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9E1F2" },
    };
    cell.font = { bold: true, size: 10 };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
  const columnWidths2 = [{ width: 5 }, { width: 14 }, { width: 40 }];
  if (hasNH1) columnWidths2.push({ width: 8 });
  if (hasNH2) columnWidths2.push({ width: 8 });
  if (hasNH3) columnWidths2.push({ width: 8 });
  columnWidths2.push({ width: 10 });
  if (hasPSTS) columnWidths2.push({ width: 8 });
  if (hasPSAS) columnWidths2.push({ width: 8 });
  columnWidths2.push({ width: 14 });
  ws2.columns = columnWidths2;
  currentRow++;
  hasilKatrol.forEach((siswa, index) => {
    const rowData2 = [index + 1, siswa.nis, siswa.nama_siswa];
    if (hasNH1) rowData2.push(formatNum(siswa.nh1_k));
    if (hasNH2) rowData2.push(formatNum(siswa.nh2_k));
    if (hasNH3) rowData2.push(formatNum(siswa.nh3_k));
    rowData2.push(formatNum(siswa.rata_nh_k));
    if (hasPSTS) rowData2.push(formatNum(siswa.psts_k));
    if (hasPSAS) rowData2.push(formatNum(siswa.psas_k));
    rowData2.push(formatNum(siswa.nilai_akhir_k));
    const r = ws2.addRow(rowData2);
    r.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      if (colNumber === 1 || colNumber === 2)
        cell.alignment = { vertical: "middle", horizontal: "center" };
      else if (colNumber === 3) cell.alignment = { vertical: "middle", horizontal: "left" };
      else {
        cell.alignment = { vertical: "middle", horizontal: "center" };
        if (cell.value !== null) {
          cell.numFmt = "0";
          if (colNumber === headers2.length) cell.font = { bold: true };
        }
      }
      if (index % 2 !== 0)
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF2F2F2" },
        };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const timestamp = new Date().toISOString().split("T")[0];
  a.download = `${filename}_${timestamp}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

export const validateBeforeKatrol = (studentsData, organizedGrades) => {
  const errors = [];
  const warnings = [];
  if (!studentsData || studentsData.length === 0) errors.push("Tidak ada data siswa ditemukan!");
  if (!organizedGrades || Object.keys(organizedGrades).length === 0)
    errors.push("Tidak ada data nilai ditemukan!");
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
      if (student)
        studentsWithMissingGrades.push({
          name: student.full_name,
          missing: missingComponents,
        });
    }
  });
  if (studentsWithMissingGrades.length > 0)
    warnings.push(`${studentsWithMissingGrades.length} siswa memiliki nilai yang tidak lengkap`);
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

export const calculateClassStatistics = (hasilKatrol) => {
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
  const jumlahTuntas = nilaiAkhirValues.filter((val) => val >= 75).length;
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
