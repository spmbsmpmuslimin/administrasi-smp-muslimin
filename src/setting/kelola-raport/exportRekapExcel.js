// setting/kelola-raport/exportRekapExcel.js
// Dipakai oleh RekapMultiSemester.js (tombol "Export Excel"). Logic generate
// file dipisah dari komponen UI-nya biar RekapMultiSemester.js fokus render
// doang, ga campur sama urusan bikin file.
//
// Pakai ExcelJS (bukan SheetJS/`xlsx`) -- versi gratis `xlsx` gak bisa nulis
// styling (warna, bold, merge cell), itu fitur Pro. ExcelJS gratis, full
// styling, tetep jalan di browser.
//   npm install exceljs
//
// STRUKTUR: 1 SHEET PER SEMESTER (bukan 1 sheet lebar semua semester
// jadi kolom berdampingan) -- soalnya kalau semester dijadiin kolom, makin
// banyak semester + makin banyak mapel = tabel makin ke samping tanpa
// batas (6 semester x 8 mapel = 48+ kolom, gak kebaca/gak bisa di-print).
// Dengan sheet per semester, lebar tabel tetap (cuma sejumlah mapel),
// berapa pun banyaknya semester -- tinggal nambah tab.
//
// WAJIB: kelas HARUS dipilih (gak boleh "Semua") sebelum manggil fungsi ini
// -- validasinya ada di RekapMultiSemester.js (handleExport), bukan di
// sini, biar UI yang kasih tau user duluan lewat toast. Kalau dipanggil
// dengan kelas kosong, title block bakal keliatan aneh (nyampur banyak
// kelas dalam 1 sheet semester) makanya divalidasi di pemanggil.
//
// PENTING: fungsi ini nerima data MENTAH (`reports`, hasil query Supabase
// di RekapMultiSemester.js), BUKAN `studentRows` yang udah di-grouping buat
// tabel UI -- buat mode "semua mapel" kita butuh breakdown nilai per-mapel,
// bukan cuma rata-ratanya kayak yang ditampilin di layar. Logic grouping di
// sini SENGAJA DUPLIKASI dari useMemo di RekapMultiSemester.js -- kalau
// logic grouping di sana berubah, sesuaikan juga di sini.

import ExcelJS from "exceljs";

const HEADER_FILL = "FF10B981";
const HEADER_FONT_COLOR = "FFFFFFFF";
const SUMMARY_FILL = "FFECFDF5"; // hijau muda, buat kolom Jumlah/Rata-rata
const MISSING_FONT_COLOR = "FFDC2626";
const MISSING_FILL = "FFFEE2E2";
const BORDER_COLOR = "FFD1D5DB";

// ---- Singkatan nama mapel (biar header kolom gak kepanjangan/berantakan) ----
// Nama lengkapnya TETEP disimpen sebagai comment di header cell (hover di
// Excel buat liat), jadi gak ada informasi yang ilang, cuma tampilannya
// yang dirapiin. Kalau ada mapel yang belum kedaftar di sini, otomatis
// disingkat pakai getMapelAbbrev() (ambil inisial kata penting), jadi gak
// akan error/ke-skip walau suatu saat ada mapel baru yang belum didaftar
// manual di bawah -- kalau hasil auto-nya kurang pas, tinggal tambahin
// entry manual di kamus ini.
const MAPEL_ABBREV = {
  "Pendidikan Agama Islam dan Budi Pekerti": "PAIBP",
  "Pendidikan Pancasila": "PPKn",
  "Bahasa Indonesia": "BIND",
  "Matematika (Umum)": "MTK",
  Matematika: "MTK",
  "Ilmu Pengetahuan Alam (IPA)": "IPA",
  "Ilmu Pengetahuan Alam": "IPA",
  IPA: "IPA",
  "Ilmu Pengetahuan Sosial (IPS)": "IPS",
  "Ilmu Pengetahuan Sosial": "IPS",
  IPS: "IPS",
  "Bahasa Inggris": "BING",
  "Pendidikan Jasmani, Olahraga dan Kesehatan": "PJOK",
  "Pendidikan Jasmani, Olahraga, dan Kesehatan": "PJOK",
  PJOK: "PJOK",
  Informatika: "INF",
  "Muatan Lokal Bahasa Daerah": "BSUN",
  "Koding & AI": "KAI",
  "Koding dan Kecerdasan Artifisial": "KAI",
  "Seni Tari": "SENTAR",
  "Seni Rupa": "SENRUP",
  Prakarya: "PRA",
};

const STOPWORDS_MAPEL = new Set(["dan", "yang", "di", "ke", "dari", "atau"]);

function getMapelAbbrev(namaLengkap) {
  if (MAPEL_ABBREV[namaLengkap]) return MAPEL_ABBREV[namaLengkap];
  const words = namaLengkap
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS_MAPEL.has(w.toLowerCase()));
  if (words.length <= 1) return namaLengkap.slice(0, 10);
  return words.map((w) => w[0].toUpperCase()).join("");
}

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function formatTimestampID(date) {
  const jam = String(date.getHours()).padStart(2, "0");
  const menit = String(date.getMinutes()).padStart(2, "0");
  return `${HARI[date.getDay()]}, ${date.getDate()} ${BULAN[date.getMonth()]} ${date.getFullYear()} pukul ${jam}.${menit}`;
}

function styleHeaderCell(cell) {
  cell.font = { bold: true, color: { argb: HEADER_FONT_COLOR } };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: HEADER_FILL },
  };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
}

function applyThinBorder(cell) {
  const thin = { style: "thin", color: { argb: BORDER_COLOR } };
  cell.border = { top: thin, bottom: thin, left: thin, right: thin };
}

function buildSheetForSemester(
  workbook,
  sem,
  students,
  subjects,
  mapel,
  kelas,
  tahunAjaran,
) {
  const isBreakdown = !mapel;
  const sheet = workbook.addWorksheet(`Semester ${sem}`);

  const FIXED_COLS = 3; // No, NIS, Nama Siswa
  const valueCols = isBreakdown ? subjects.length + 2 : 1; // +2 = Jumlah Nilai, Rata-Rata
  const totalCols = FIXED_COLS + valueCols;
  const lastColLetter = sheet.getColumn(totalCols).letter;

  // ---- Title block ----
  const judul = isBreakdown
    ? "REKAP NILAI SELURUH MATA PELAJARAN"
    : `REKAP NILAI ${mapel.toUpperCase()}`;
  const titleLines = [
    { text: "SMP MUSLIMIN CILILIN", size: 14, bold: true },
    { text: `${judul} - Kelas ${kelas}`, size: 12, bold: true },
    {
      text: `Tahun Ajaran: ${tahunAjaran || "Semua Tahun Ajaran"} - Semester ${sem}`,
      size: 11,
      bold: true,
    },
    {
      text: `Diekspor: ${formatTimestampID(new Date())}`,
      size: 9,
      bold: false,
    },
  ];
  titleLines.forEach((line, i) => {
    const rowNum = i + 1;
    sheet.mergeCells(`A${rowNum}:${lastColLetter}${rowNum}`);
    const cell = sheet.getCell(`A${rowNum}`);
    cell.value = line.text;
    cell.font = { name: "Calibri", size: line.size, bold: line.bold };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(rowNum).height = rowNum <= 2 ? 22 : 16;
  });
  sheet.getRow(5).height = 8;

  // ---- Header tabel (baris 6) ----
  const headerRowNum = 6;
  const dataStartRow = headerRowNum + 1;
  const subjectHeaders = subjects.map((s) => getMapelAbbrev(s));
  const headers = isBreakdown
    ? [
        "No",
        "NIS",
        "Nama Siswa",
        ...subjectHeaders,
        "Jumlah Nilai",
        "Rata-Rata",
      ]
    : ["No", "NIS", "Nama Siswa", "Nilai"];
  const headerRow = sheet.getRow(headerRowNum);
  headerRow.values = headers;
  headerRow.eachCell((cell) => styleHeaderCell(cell));
  headerRow.height = 22;

  // Nama lengkap mapel disimpen sebagai comment di header cell (hover buat liat)
  if (isBreakdown) {
    subjects.forEach((fullName, i) => {
      const cell = headerRow.getCell(FIXED_COLS + 1 + i);
      if (getMapelAbbrev(fullName) !== fullName) {
        cell.note = fullName;
      }
    });
  }

  // ---- Kolom width ----
  sheet.getColumn(1).width = 6; // No
  sheet.getColumn(2).width = 15; // NIS
  sheet.getColumn(3).width = 30; // Nama Siswa
  for (let c = FIXED_COLS + 1; c <= totalCols; c++) {
    sheet.getColumn(c).width = 10;
  }

  // ---- Data rows ----
  students.forEach((s, idx) => {
    const rowNum = dataStartRow + idx;
    const row = sheet.getRow(rowNum);
    row.getCell(1).value = idx + 1;
    row.getCell(2).value = s.nis;
    row.getCell(3).value = s.name;
    row.getCell(1).alignment = { horizontal: "left" };
    row.getCell(2).alignment = { horizontal: "left" };
    row.getCell(3).alignment = { horizontal: "left" };

    const grades = s.gradesBySemester[sem] || [];

    if (isBreakdown) {
      let sum = 0;
      let count = 0;
      subjects.forEach((subj, i) => {
        const found = grades.find((g) => g.subject === subj);
        const cell = row.getCell(FIXED_COLS + 1 + i);
        cell.alignment = { horizontal: "center" };
        if (found && found.score !== null && found.score !== undefined) {
          cell.value = found.score;
          sum += found.score;
          count += 1;
        } else {
          cell.value = "—";
          cell.font = { color: { argb: MISSING_FONT_COLOR } };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: MISSING_FILL },
          };
        }
      });

      const jumlahCell = row.getCell(FIXED_COLS + subjects.length + 1);
      const rataCell = row.getCell(FIXED_COLS + subjects.length + 2);
      [jumlahCell, rataCell].forEach((cell) => {
        cell.alignment = { horizontal: "center" };
        cell.font = { bold: true };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: SUMMARY_FILL },
        };
      });
      if (count > 0) {
        jumlahCell.value = sum;
        rataCell.value = Math.round((sum / count) * 10) / 10;
      } else {
        jumlahCell.value = "—";
        rataCell.value = "—";
      }
    } else {
      const found = grades.find((g) => g.subject === mapel);
      const cell = row.getCell(FIXED_COLS + 1);
      cell.alignment = { horizontal: "center" };
      if (found && found.score !== null && found.score !== undefined) {
        cell.value = found.score;
      } else {
        cell.value = "—";
        cell.font = { color: { argb: MISSING_FONT_COLOR } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: MISSING_FILL },
        };
      }
    }
  });

  // ---- Border tipis buat seluruh area tabel ----
  for (let r = headerRowNum; r <= dataStartRow + students.length - 1; r++) {
    for (let c = 1; c <= totalCols; c++) {
      applyThinBorder(sheet.getRow(r).getCell(c));
    }
  }

  sheet.views = [{ state: "frozen", ySplit: headerRowNum, xSplit: FIXED_COLS }];
}

// reports: raw dari Supabase -- [{ student_name, student_nis, semester, student_report_grades: [{subject, score}] }]
// mapelOptions: daftar semua mapel yang ada di data (buat mode breakdown penuh), sudah urut alfabet
// mapel: kalau diisi -> mode 1 mapel aja (1 kolom Nilai). Kalau kosong -> breakdown semua mapel + Jumlah & Rata-Rata
// context: { tahunAjaran, kelas } -- kelas WAJIB diisi (divalidasi di pemanggil), buat title block tiap sheet
export async function exportRekapToExcel({
  reports,
  mapelOptions,
  mapel,
  fileName = "rekap-nilai.xlsx",
  context = {},
}) {
  const { tahunAjaran, kelas } = context;

  // ---- Grouping ulang dari data mentah (mirror logic useMemo RekapMultiSemester.js) ----
  const studentMap = new Map();
  const semesterSet = new Set();
  reports.forEach((r) => {
    semesterSet.add(r.semester);
    if (!studentMap.has(r.student_nis)) {
      studentMap.set(r.student_nis, {
        name: r.student_name,
        nis: r.student_nis,
        gradesBySemester: {}, // { [semester]: [{subject, score}, ...] }
      });
    }
    studentMap.get(r.student_nis).gradesBySemester[r.semester] =
      r.student_report_grades || [];
  });
  const students = Array.from(studentMap.values());
  const semesterList = Array.from(semesterSet).sort((a, b) => a - b);
  const subjects = mapel ? [] : mapelOptions;

  const workbook = new ExcelJS.Workbook();
  semesterList.forEach((sem) => {
    buildSheetForSemester(
      workbook,
      sem,
      students,
      subjects,
      mapel,
      kelas,
      tahunAjaran,
    );
  });

  // ---- Trigger download ----
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
