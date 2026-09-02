// setting/kelola-raport/RekapMultiSemester.js
// Dipanggil sebagai sub-tab dari RaportNilaiTab.js (tab "Rekap Multi
// Semester"). Beda dari ManajemenRaportTable.js -- ini nampilin data
// LINTAS semester dalam satu tabel matrix (siswa x semester), bukan
// per-satu raport.
//
// Karena bentuknya matrix, komponen ini PAKE FILTER SENDIRI (bukan reuse
// SemesterFilterBar dari RaportShared.js) -- SemesterFilterBar punya field
// semester TUNGGAL, yang ga cocok buat matrix yang justru mau nampilin
// SEMUA semester sekaligus sbg kolom.
//
// Kalau filter "Mata Pelajaran" dipilih -> kolom semester nampilin nilai
// mapel itu aja. Kalau kosong -> nampilin rata-rata semua mapel per
// semester (keputusan desain, gampang diubah di bagian `useMemo` grouping
// kalau maunya beda -- misal wajib pilih mapel dulu baru tabel muncul).
//
// FILE INI GABUNGAN DARI 2 FILE SEBELUMNYA (refactor -- exportRekapExcel.js
// cuma dipakai di sini doang, jadi dijadikan fungsi internal
// exportRekapToExcel() di bawah, bukan file terpisah lagi).
// Perlu `npm install xlsx` (buat parseLegerExcel.js di alur Import, gak
// dipakai di sini) dan `npm install exceljs` (buat fungsi export di bawah,
// versi gratis `xlsx` gak bisa nulis styling/merge cell) di root project
// kalau belum ada.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Download, Loader2 } from "lucide-react";
import ExcelJS from "exceljs";
import { supabase } from "../../supabaseClient";
import { useAcademicYears, useReportedClasses } from "./RaportShared";

// ============================================================
// exportRekapToExcel (sebelumnya exportRekapExcel.js)
// Dipakai oleh tombol "Export Excel" di bawah. Logic generate file
// dipisah ke fungsi sendiri (bukan dicampur ke JSX) biar bagian render
// tetap fokus, ga campur sama urusan bikin file.
//
// STRUKTUR: 1 SHEET PER SEMESTER (bukan 1 sheet lebar semua semester
// jadi kolom berdampingan) -- soalnya kalau semester dijadiin kolom, makin
// banyak semester + makin banyak mapel = tabel makin ke samping tanpa
// batas (6 semester x 8 mapel = 48+ kolom, gak kebaca/gak bisa di-print).
// Dengan sheet per semester, lebar tabel tetap (cuma sejumlah mapel),
// berapa pun banyaknya semester -- tinggal nambah tab.
//
// WAJIB: kelas HARUS dipilih (gak boleh "Semua") sebelum manggil fungsi ini
// -- validasinya ada di handleExport di bawah, bukan di fungsi ini, biar
// UI yang kasih tau user duluan lewat toast. Kalau dipanggil dengan kelas
// kosong, title block bakal keliatan aneh (nyampur banyak kelas dalam 1
// sheet semester) makanya divalidasi di pemanggil.
//
// PENTING: fungsi ini nerima data MENTAH (`reports`, hasil query Supabase
// di fetchRekap di bawah), BUKAN `studentRows` yang udah di-grouping buat
// tabel UI -- buat mode "semua mapel" kita butuh breakdown nilai per-mapel,
// bukan cuma rata-ratanya kayak yang ditampilin di layar. Logic grouping di
// sini SENGAJA DUPLIKASI dari useMemo grouping di bawah -- kalau logic
// grouping di sana berubah, sesuaikan juga di sini.
// ============================================================

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
async function exportRekapToExcel({
  reports,
  mapelOptions,
  mapel,
  fileName = "rekap-nilai.xlsx",
  context = {},
}) {
  const { tahunAjaran, kelas } = context;

  // ---- Grouping ulang dari data mentah (mirror logic useMemo grouping di bawah) ----
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

// ============================================================
// RekapMultiSemester (komponen utama, di-export default)
// ============================================================

const RekapMultiSemester = ({ showToast }) => {
  const [tahunAjaran, setTahunAjaran] = useState("");
  const [kelas, setKelas] = useState("");
  const [mapel, setMapel] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [reports, setReports] = useState([]); // raw dari Supabase, belum di-grouping

  const { years: academicYearsList } = useAcademicYears(showToast);
  // Kelas di sini = kode yang SUDAH PERNAH diimport (student_reports.class_name),
  // bukan dari tabel `classes` -- lihat catatan di RaportShared.js.
  const { classes: classesList, loading: loadingClasses } = useReportedClasses(
    tahunAjaran,
    showToast,
  );

  // Kelas lama gak relevan lagi kalau tahun ajarannya diganti (kode rombel
  // didaur ulang tiap tahun, lihat RaportShared.js).
  useEffect(() => {
    setKelas("");
  }, [tahunAjaran]);

  const fetchRekap = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("student_reports")
        .select(
          "student_name, student_nis, semester, student_report_grades(subject, score)",
        )
        .order("student_name", { ascending: true });

      if (tahunAjaran) query = query.eq("academic_year", tahunAjaran);
      if (kelas) query = query.eq("class_name", kelas);

      const { data, error } = await query;
      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error(err);
      showToast?.("Gagal memuat data rekap", "error");
    } finally {
      setIsLoading(false);
    }
  }, [tahunAjaran, kelas, showToast]);

  useEffect(() => {
    fetchRekap();
  }, [fetchRekap]);

  // Daftar mapel unik dari data yang lagi ke-fetch, buat isi dropdown filter.
  // Dinamis (bukan hardcode) biar otomatis ngikutin mapel apa aja yang
  // beneran ada di data ter-import, ga perlu diupdate manual tiap ganti kurikulum.
  const mapelOptions = useMemo(() => {
    const set = new Set();
    reports.forEach((r) =>
      (r.student_report_grades || []).forEach((g) => set.add(g.subject)),
    );
    return Array.from(set).sort();
  }, [reports]);

  // Grouping data mentah per-raport jadi matrix: 1 siswa = 1 baris,
  // tiap semester yang ada datanya jadi 1 kolom.
  const { studentRows, semesterList } = useMemo(() => {
    const studentMap = new Map();
    const semesterSet = new Set();

    reports.forEach((r) => {
      semesterSet.add(r.semester);

      if (!studentMap.has(r.student_nis)) {
        studentMap.set(r.student_nis, {
          name: r.student_name,
          nis: r.student_nis,
          scoresBySemester: {},
        });
      }

      const grades = r.student_report_grades || [];
      let score = null;

      if (mapel) {
        const found = grades.find((g) => g.subject === mapel);
        score = found ? found.score : null;
      } else if (grades.length > 0) {
        score =
          Math.round(
            (grades.reduce((sum, g) => sum + g.score, 0) / grades.length) * 10,
          ) / 10;
      }

      studentMap.get(r.student_nis).scoresBySemester[r.semester] = score;
    });

    return {
      studentRows: Array.from(studentMap.values()),
      semesterList: Array.from(semesterSet).sort((a, b) => a - b),
    };
  }, [reports, mapel]);

  const handleExport = () => {
    if (!kelas) {
      showToast?.(
        "Pilih kelas dulu sebelum export (biar tiap sheet semester isinya 1 kelas aja)",
        "error",
      );
      return;
    }
    if (studentRows.length === 0) {
      showToast?.("Ga ada data buat di-export", "error");
      return;
    }
    exportRekapToExcel({
      reports,
      mapelOptions,
      mapel,
      fileName: `rekap-nilai${mapel ? `-${mapel}` : ""}-${kelas}.xlsx`,
      context: { tahunAjaran, kelas },
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Tahun Ajaran
          </label>
          <select
            value={tahunAjaran}
            onChange={(e) => setTahunAjaran(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100">
            <option value="">Semua</option>
            {academicYearsList.map((ta) => (
              <option key={ta} value={ta}>
                {ta}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Kelas
          </label>
          <select
            value={kelas}
            onChange={(e) => setKelas(e.target.value)}
            disabled={loadingClasses}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 disabled:opacity-60">
            <option value="">Semua</option>
            {classesList.map((c) => (
              <option key={c} value={c}>
                Kelas {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Mata Pelajaran
          </label>
          <select
            value={mapel}
            onChange={(e) => setMapel(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100">
            <option value="">Rata-rata semua mapel</option>
            {mapelOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors active:scale-95 ml-auto">
          <Download size={16} />
          Export Excel
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-gray-400 dark:text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Memuat data rekap...</span>
        </div>
      ) : studentRows.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium text-gray-700 dark:text-gray-300">
            Belum ada data
          </p>
          <p className="text-sm mt-1">
            Ga ada raport yang cocok sama filter ini.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-100 dark:border-gray-700 rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-left text-gray-500 dark:text-gray-400">
                <th className="px-4 py-2.5 font-medium sticky left-0 bg-gray-50 dark:bg-gray-800/50">
                  Siswa
                </th>
                {semesterList.map((sem) => (
                  <th
                    key={sem}
                    className="px-4 py-2.5 font-medium text-right whitespace-nowrap">
                    Semester {sem}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {studentRows.map((s) => (
                <tr
                  key={s.nis}
                  className="border-t border-gray-100 dark:border-gray-700">
                  <td className="px-4 py-2.5 sticky left-0 bg-white dark:bg-gray-900">
                    <p className="font-medium text-gray-800 dark:text-gray-100">
                      {s.name}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {s.nis}
                    </p>
                  </td>
                  {semesterList.map((sem) => (
                    <td
                      key={sem}
                      className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-200">
                      {s.scoresBySemester[sem] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RekapMultiSemester;
