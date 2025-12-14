// 📁 Utils.js - Helper functions untuk GradesKatrol.js
import * as XLSX from "xlsx";

/**
 * Hitung nilai katrol per komponen menggunakan linear scaling
 * Rumus: KKM + ((Nilai - Min) / (Max - Min)) × (Target_Max - KKM)
 *
 * @param {number} nilai - Nilai mentah siswa
 * @param {number} minKelas - Nilai terkecil di kelas
 * @param {number} maxKelas - Nilai terbesar di kelas
 * @param {number} kkm - Kriteria Ketuntasan Minimal
 * @param {number} targetMax - Nilai maksimal yang diinginkan
 * @returns {number} Nilai setelah katrol
 */
export const calculateKatrolValue = (
  nilai,
  minKelas,
  maxKelas,
  kkm = 75,
  targetMax = 100
) => {
  // Jika nilai null/undefined, return null
  if (nilai === null || nilai === undefined) return null;

  // Jika nilai sudah >= KKM, tidak perlu katrol
  if (nilai >= kkm) return nilai;

  // Edge case: semua nilai sama
  if (minKelas === maxKelas) {
    return kkm;
  }

  // Rumus linear scaling
  const result =
    kkm + ((nilai - minKelas) / (maxKelas - minKelas)) * (targetMax - kkm);

  // Bulatkan ke 2 desimal
  return Math.round(result * 100) / 100;
};

/**
 * Hitung nilai akhir berdasarkan rumus SMP
 * @param {number} rataNH - Rata-rata nilai harian
 * @param {number} psts - Nilai PSTS
 * @param {number} psas - Nilai PSAS
 * @returns {number} Nilai akhir
 */
export const hitungNilaiAkhir = (rataNH, psts, psas) => {
  const nh = rataNH || 0;
  const uts = psts || 0;
  const uas = psas || 0;

  // Rumus: (Rata NH × 0.4) + (PSTS × 0.3) + (PSAS × 0.3)
  const nilaiAkhir = nh * 0.4 + uts * 0.3 + uas * 0.3;
  return Math.round(nilaiAkhir * 100) / 100;
};

/**
 * Organize data nilai dari format array ke object per student
 * @param {Array} gradesData - Data dari tabel grades
 * @returns {Object} Data terorganisir per student_id
 */
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

    switch (assignment_type) {
      case "NH1":
        organized[student_id].nh1 = score;
        break;
      case "NH2":
        organized[student_id].nh2 = score;
        break;
      case "NH3":
        organized[student_id].nh3 = score;
        break;
      case "PSTS":
        organized[student_id].psts = score;
        break;
      case "PSAS":
        organized[student_id].psas = score;
        break;
    }
  });

  return organized;
};

/**
 * Cari nilai minimum dan maksimum di kelas untuk setiap komponen
 * @param {Object} organizedData - Data terorganisir per student
 * @returns {Object} Min dan max untuk setiap komponen
 */
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
      .filter((val) => val !== null);

    if (values.length > 0) {
      minMax[component].min = Math.min(...values);
      minMax[component].max = Math.max(...values);
    }
  });

  return minMax;
};

/**
 * Proses katrol untuk semua siswa dalam satu kelas
 * @param {Array} studentsData - Data siswa
 * @param {Object} organizedGrades - Data nilai terorganisir
 * @param {Object} minMax - Min dan max kelas
 * @param {number} kkm - KKM
 * @param {number} targetMax - Target maksimal
 * @param {Object} additionalInfo - Info tambahan (class_id, subject, dll)
 * @returns {Array} Hasil katrol untuk semua siswa
 */
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

    // Hitung nilai mentah
    const rataNHMentah =
      grades.nh1 && grades.nh2 && grades.nh3
        ? (grades.nh1 + grades.nh2 + grades.nh3) / 3
        : null;

    const nilaiAkhirMentah =
      rataNHMentah !== null && grades.psts !== null && grades.psas !== null
        ? hitungNilaiAkhir(rataNHMentah, grades.psts, grades.psas)
        : null;

    // Hitung nilai katrol untuk setiap komponen
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

    // Hitung rata-rata NH setelah katrol
    const rataNHKatrol =
      nh1Katrol && nh2Katrol && nh3Katrol
        ? (nh1Katrol + nh2Katrol + nh3Katrol) / 3
        : null;

    // Hitung nilai akhir setelah katrol
    const nilaiAkhirKatrol =
      rataNHKatrol !== null && pstsKatrol !== null && psasKatrol !== null
        ? hitungNilaiAkhir(rataNHKatrol, pstsKatrol, psasKatrol)
        : null;

    // Cari nilai min dan max kelas untuk nilai akhir
    const nilaiAkhirMentahValues = Object.values(organizedGrades)
      .map((g) => {
        const rataNH =
          g.nh1 && g.nh2 && g.nh3 ? (g.nh1 + g.nh2 + g.nh3) / 3 : null;
        return rataNH !== null && g.psts !== null && g.psas !== null
          ? hitungNilaiAkhir(rataNH, g.psts, g.psas)
          : null;
      })
      .filter((val) => val !== null);

    const nilaiMinKelas =
      nilaiAkhirMentahValues.length > 0
        ? Math.min(...nilaiAkhirMentahValues)
        : null;

    const nilaiMaxKelas =
      nilaiAkhirMentahValues.length > 0
        ? Math.max(...nilaiAkhirMentahValues)
        : null;

    hasil.push({
      // Info siswa
      student_id: studentId,
      student_name: student.full_name,
      student_nis: student.nis,

      // Info kelas
      ...additionalInfo,
      jumlah_siswa_kelas: studentsData.length,

      // Nilai mentah
      nh1_mentah: grades.nh1,
      nh2_mentah: grades.nh2,
      nh3_mentah: grades.nh3,
      psts_mentah: grades.psts,
      psas_mentah: grades.psas,
      rata_nh_mentah: rataNHMentah,
      nilai_akhir_mentah: nilaiAkhirMentah,

      // Nilai katrol
      nh1_katrol: nh1Katrol,
      nh2_katrol: nh2Katrol,
      nh3_katrol: nh3Katrol,
      psts_katrol: pstsKatrol,
      psas_katrol: psasKatrol,
      rata_nh_katrol: rataNHKatrol,
      nilai_akhir_katrol: nilaiAkhirKatrol,

      // Metadata
      kkm,
      target_min: kkm,
      target_max: targetMax,
      nilai_min_kelas: nilaiMinKelas,
      nilai_max_kelas: nilaiMaxKelas,
      formula_used: "linear_scaling",
    });
  });

  return hasil;
};

/**
 * Format data untuk disimpan ke database
 * @param {Object} katrolData - Data hasil katrol satu siswa
 * @param {Object} userInfo - Info user yang memproses
 * @returns {Object} Data yang siap diinsert ke grades_katrol
 */
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

    // Nilai mentah
    nh1_mentah: katrolData.nh1_mentah,
    nh2_mentah: katrolData.nh2_mentah,
    nh3_mentah: katrolData.nh3_mentah,
    psts_mentah: katrolData.psts_mentah,
    psas_mentah: katrolData.psas_mentah,
    rata_nh_mentah: katrolData.rata_nh_mentah,
    nilai_akhir_mentah: katrolData.nilai_akhir_mentah,

    // Nilai katrol
    nh1_katrol: katrolData.nh1_katrol,
    nh2_katrol: katrolData.nh2_katrol,
    nh3_katrol: katrolData.nh3_katrol,
    psts_katrol: katrolData.psts_katrol,
    psas_katrol: katrolData.psas_katrol,
    rata_nh_katrol: katrolData.rata_nh_katrol,
    nilai_akhir_katrol: katrolData.nilai_akhir_katrol,

    // Metadata
    kkm: katrolData.kkm || 75,
    target_min: katrolData.target_min || 75,
    target_max: katrolData.target_max || 100,
    nilai_min_kelas: katrolData.nilai_min_kelas,
    nilai_max_kelas: katrolData.nilai_max_kelas,
    jumlah_siswa_kelas: katrolData.jumlah_siswa_kelas,
    formula_used: "linear_scaling",

    // Status
    status: "processed",
    processed_by: userInfo.userId,
    processed_at: timestamp,

    // Timestamps
    created_at: timestamp,
    updated_at: timestamp,
  };
};

/**
 * Export hasil katrol ke Excel
 * @param {Array} hasilKatrol - Data hasil katrol
 * @param {Object} metadata - Metadata untuk judul
 * @param {string} filename - Nama file output
 */
export const exportToExcel = (
  hasilKatrol,
  metadata = {},
  filename = "katrol_nilai"
) => {
  if (!hasilKatrol || hasilKatrol.length === 0) {
    alert("Tidak ada data untuk diexport!");
    return;
  }

  // Sheet 1: Nilai Asli
  const sheet1Data = hasilKatrol.map((row) => ({
    NIS: row.student_nis,
    "Nama Siswa": row.student_name,
    NH1: row.nh1_mentah || "-",
    NH2: row.nh2_mentah || "-",
    NH3: row.nh3_mentah || "-",
    "Rata NH": row.rata_nh_mentah || "-",
    PSTS: row.psts_mentah || "-",
    PSAS: row.psas_mentah || "-",
    "Nilai Akhir": row.nilai_akhir_mentah || "-",
  }));

  // Sheet 2: Nilai Katrol
  const sheet2Data = hasilKatrol.map((row) => ({
    NIS: row.student_nis,
    "Nama Siswa": row.student_name,
    "NH1 Katrol": row.nh1_katrol || "-",
    "NH2 Katrol": row.nh2_katrol || "-",
    "NH3 Katrol": row.nh3_katrol || "-",
    "Rata NH Katrol": row.rata_nh_katrol || "-",
    "PSTS Katrol": row.psts_katrol || "-",
    "PSAS Katrol": row.psas_katrol || "-",
    "Nilai Akhir Katrol": row.nilai_akhir_katrol || "-",
  }));

  // Sheet 3: Perbandingan
  const sheet3Data = hasilKatrol.map((row) => ({
    NIS: row.student_nis,
    "Nama Siswa": row.student_name,
    NH1: `${row.nh1_mentah || "-"} → ${row.nh1_katrol || "-"}`,
    NH2: `${row.nh2_mentah || "-"} → ${row.nh2_katrol || "-"}`,
    NH3: `${row.nh3_mentah || "-"} → ${row.nh3_katrol || "-"}`,
    "Rata NH": `${row.rata_nh_mentah || "-"} → ${row.rata_nh_katrol || "-"}`,
    PSTS: `${row.psts_mentah || "-"} → ${row.psts_katrol || "-"}`,
    PSAS: `${row.psas_mentah || "-"} → ${row.psas_katrol || "-"}`,
    "Nilai Akhir": `${row.nilai_akhir_mentah || "-"} → ${
      row.nilai_akhir_katrol || "-"
    }`,
  }));

  // Metadata sheet
  const metadataSheet = [
    {
      Judul: `Hasil Katrol Nilai - ${metadata.subject || ""}`,
      Kelas: metadata.class_name || "",
      "Tahun Ajaran": metadata.academic_year || "",
      Semester: metadata.semester || "",
      KKM: metadata.kkm || 75,
      "Target Maksimal": metadata.target_max || 100,
      "Jumlah Siswa": hasilKatrol.length,
      "Tanggal Export": new Date().toLocaleDateString("id-ID"),
      Pengolah: metadata.processed_by || "",
    },
  ];

  // Buat workbook
  const wb = XLSX.utils.book_new();

  // Tambah sheet
  wb.SheetNames.push("Metadata", "Nilai Asli", "Nilai Katrol", "Perbandingan");

  const ws1 = XLSX.utils.json_to_sheet(metadataSheet);
  const ws2 = XLSX.utils.json_to_sheet(sheet1Data);
  const ws3 = XLSX.utils.json_to_sheet(sheet2Data);
  const ws4 = XLSX.utils.json_to_sheet(sheet3Data);

  wb.Sheets["Metadata"] = ws1;
  wb.Sheets["Nilai Asli"] = ws2;
  wb.Sheets["Nilai Katrol"] = ws3;
  wb.Sheets["Perbandingan"] = ws4;

  // Export file
  const timestamp = new Date().toISOString().split("T")[0];
  const fullFilename = `${filename}_${timestamp}.xlsx`;
  XLSX.writeFile(wb, fullFilename);
};

/**
 * Validasi sebelum proses katrol
 * @param {Array} studentsData - Data siswa
 * @param {Object} organizedGrades - Data nilai terorganisir
 * @returns {Object} Hasil validasi
 */
export const validateBeforeKatrol = (studentsData, organizedGrades) => {
  const errors = [];
  const warnings = [];

  if (!studentsData || studentsData.length === 0) {
    errors.push("Tidak ada data siswa ditemukan!");
  }

  if (!organizedGrades || Object.keys(organizedGrades).length === 0) {
    errors.push("Tidak ada data nilai ditemukan!");
  }

  // Cek apakah ada siswa yang belum lengkap nilainya
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
    warnings.push(
      `${studentsWithMissingGrades.length} siswa memiliki nilai yang tidak lengkap`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    studentsWithMissingGrades,
  };
};

/**
 * Format nilai untuk display (menambahkan tanda * jika dikatrol)
 * @param {number} nilaiMentah - Nilai asli
 * @param {number} nilaiKatrol - Nilai setelah katrol
 * @returns {string} Formatted string
 */
export const formatNilaiDisplay = (nilaiMentah, nilaiKatrol) => {
  if (nilaiMentah === null || nilaiKatrol === null) return "-";

  if (nilaiMentah === nilaiKatrol) {
    return nilaiMentah.toString();
  }

  return `${nilaiKatrol}*`;
};

/**
 * Hitung statistik kelas
 * @param {Array} hasilKatrol - Data hasil katrol
 * @returns {Object} Statistik kelas
 */
export const calculateClassStatistics = (hasilKatrol) => {
  const nilaiAkhirValues = hasilKatrol
    .map((row) => row.nilai_akhir_katrol)
    .filter((val) => val !== null);

  if (nilaiAkhirValues.length === 0) {
    return {
      rataRata: 0,
      nilaiTerendah: 0,
      nilaiTertinggi: 0,
      jumlahTuntas: 0,
      persentaseTuntas: 0,
    };
  }

  const rataRata =
    nilaiAkhirValues.reduce((a, b) => a + b, 0) / nilaiAkhirValues.length;
  const nilaiTerendah = Math.min(...nilaiAkhirValues);
  const nilaiTertinggi = Math.max(...nilaiAkhirValues);

  // Anggap KKM 75
  const jumlahTuntas = nilaiAkhirValues.filter((val) => val >= 75).length;
  const persentaseTuntas = (jumlahTuntas / nilaiAkhirValues.length) * 100;

  return {
    rataRata: Math.round(rataRata * 100) / 100,
    nilaiTerendah: Math.round(nilaiTerendah * 100) / 100,
    nilaiTertinggi: Math.round(nilaiTertinggi * 100) / 100,
    jumlahTuntas,
    persentaseTuntas: Math.round(persentaseTuntas * 100) / 100,
  };
};

export default {
  calculateKatrolValue,
  hitungNilaiAkhir,
  organizeGradesByStudent,
  calculateMinMaxKelas,
  prosesKatrol,
  formatDataForDatabase,
  exportToExcel,
  validateBeforeKatrol,
  formatNilaiDisplay,
  calculateClassStatistics,
};
