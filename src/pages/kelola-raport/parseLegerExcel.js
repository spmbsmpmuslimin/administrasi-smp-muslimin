// setting/kelola-raport/parseLegerExcel.js
// Parser untuk file Excel "Leger Nilai" (1 file = 1 kelas, 1 semester).
// Dipakai di ImportRaportForm.js sebagai alternatif dari flow PDF (yang
// lewat Storage bucket "raport-pdf" + Edge Function extract-raport-pdf).
// Excel diparse LANGSUNG DI BROWSER pakai SheetJS ("xlsx" package) --
// gak lewat Edge Function sama sekali, soalnya datanya udah tabular &
// gampang dibaca tanpa OCR/text-extraction kayak PDF.
//
// npm install xlsx  (belum ada di package.json project ini -- tambahin dulu)
//
// ASUMSI FORMAT (diverifikasi terhadap contoh file leger f_leger_7F_Asli.xlsx):
//   - 1 sheet, sheet pertama yang dipakai.
//   - Ada baris header (posisinya DICARI OTOMATIS, bukan hardcode nomor
//     baris) yang isinya "NO", "NAMA SISWA", "NISN", "MATA PELAJARAN" dalam
//     satu baris yang sama.
//   - Persis di bawah baris header itu ada baris kode mapel (mis. "PAIDBP",
//     "PP", "BI", "MU", ...). Kolom-kolom ini kolom nilai per mapel. Lebar
//     blok mapel ditentukan dari baris header: mulai dari kolom
//     "MATA PELAJARAN", berhenti pas ketemu label lain di baris yang sama
//     (biasanya "Ketidakhadiran") -- BUKAN dari isi baris kode mapel,
//     karena baris kode mapel gak punya penanda "berhenti di sini".
//   - Di bagian bawah sheet ada blok "KETERANGAN MAPEL :" isinya baris
//     "KODE : Nama Lengkap Mapel", dipakai buat expand kode jadi nama
//     lengkap mapel. Kalau satu kode dipakai dobel (mis. "BI" = Bahasa
//     Indonesia DAN Bahasa Inggris), urutan kemunculan legend-nya
//     diasumsikan sejajar sama urutan kemunculan kolomnya (lihat
//     buildSubjectNameMap). Baris legend yang keduplikasi persis (biasa
//     kejadian gara-gara merged cell ke-split pas dibaca) otomatis di-skip.
//   - NISN kadang tersimpan sbg angka (tanpa 0 di depan) dan kadang sbg
//     teks (ada 0 di depan) tergantung isinya -- udah dites, ini konsisten
//     dgn value asli di Excel-nya (Excel sendiri yg nyimpen jadi 2 tipe
//     beda), jadi String(nilai) di sini SUDAH BENAR, gak perlu di-pad.
//   - Kolom "Ketidakhadiran" (Sakit/Izin/Alpa) dan "Ekstra Kurikuler" ADA
//     di file leger tapi BELUM diimport ke sini -- tabel
//     student_report_grades cuma punya kolom subject+score, belum ada
//     tempat buat nyimpen itu. Kalau nanti mau diimport juga, perlu
//     migration tabel baru dulu.
//
// Kalau template leger sekolah berubah dan asumsi di atas ga cocok lagi,
// fungsi ini throw Error dengan pesan yang jelas (bukan gagal diem-diem
// nghasilin data ngaco) -- pesan errornya ditangkep di ImportRaportForm.js
// dan ditampilin lewat showToast.

import * as XLSX from "xlsx";

const HEADER_MARKERS = ["NO", "NAMA SISWA", "NISN"];

function normCell(v) {
  return v === null || v === undefined ? "" : String(v).trim();
}

function findHeaderRow(rows) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || [];
    const cells = row.map((c) => normCell(c).toUpperCase());
    const hasAllMarkers = HEADER_MARKERS.every((marker) =>
      cells.includes(marker),
    );
    const hasMapel = cells.includes("MATA PELAJARAN");
    if (hasAllMarkers && hasMapel) {
      return {
        headerRowIdx: i,
        colNo: cells.indexOf("NO"),
        colNama: cells.indexOf("NAMA SISWA"),
        colNisn: cells.indexOf("NISN"),
        // Sebagian template leger (kepake mulai semester genap) punya kolom
        // "NIS" TERPISAH dari "NISN" -- isinya NIS LOKAL sekolah (format
        // sama persis kayak students.nis di roster), beda dari template
        // semester ganjil yang cuma ada NISN. -1 kalau kolom ini emang ga
        // ada di file yang diupload (lihat resolveNis()).
        colNis: cells.indexOf("NIS"),
        colMapelStart: cells.indexOf("MATA PELAJARAN"),
      };
    }
  }
  throw new Error(
    'Gak nemu baris header ("NO", "NAMA SISWA", "NISN", "MATA PELAJARAN") di file ini. Pastikan file yang diupload adalah leger nilai, bukan file lain.',
  );
}

function findSubjectColumns(headerRow, subjectCodeRow, colMapelStart) {
  // Kolom nilai mapel berhenti begitu ketemu label lain di baris HEADER yang
  // sama (mis. "Ketidakhadiran"), dihitung dari posisi setelah "MATA
  // PELAJARAN". Baris kode mapel sendiri gak punya penanda berhenti.
  let stopColIdx = headerRow.length;
  for (let c = colMapelStart + 1; c < headerRow.length; c++) {
    if (normCell(headerRow[c])) {
      stopColIdx = c;
      break;
    }
  }

  const subjectCols = [];
  for (let c = colMapelStart; c < stopColIdx; c++) {
    const code = normCell(subjectCodeRow[c]);
    if (code) subjectCols.push({ colIdx: c, code });
  }
  if (subjectCols.length === 0) {
    throw new Error(
      "Gak nemu kolom kode mapel (baris persis di bawah header NO/NAMA SISWA/NISN/MATA PELAJARAN). Cek lagi format filenya.",
    );
  }
  return { subjectCols };
}

function buildSubjectNameMap(rows, subjectCols) {
  const legendByCode = new Map(); // code -> antrean nama lengkap, urut kemunculan
  let inLegend = false;
  for (const row of rows) {
    const first = normCell(row?.[0]).toUpperCase();
    if (first.startsWith("KETERANGAN MAPEL")) {
      inLegend = true;
      continue;
    }
    if (!inLegend) continue;
    const cell = row?.[1];
    if (typeof cell !== "string" || !cell.includes(":")) continue;
    const [codePart, ...rest] = cell.split(":");
    const code = codePart.trim();
    const name = rest.join(":").trim();
    if (!code || !name) continue;
    const queue = legendByCode.get(code) || [];
    if (queue[queue.length - 1] !== name) queue.push(name); // skip baris duplikat persis
    legendByCode.set(code, queue);
  }

  const cursor = new Map(); // code -> index nama berikutnya yang belum "dipakein" ke kolom
  const result = new Map(); // colIdx -> nama lengkap mapel
  for (const { colIdx, code } of subjectCols) {
    const queue = legendByCode.get(code);
    if (!queue || queue.length === 0) continue; // ga ada di legend -> fallback ke kode aslinya
    const idx = cursor.get(code) || 0;
    result.set(colIdx, queue[Math.min(idx, queue.length - 1)]);
    cursor.set(code, idx + 1);
  }
  return result;
}

function findLabelValue(rows, label) {
  for (const row of rows) {
    if (normCell(row?.[0]).toUpperCase() === label) {
      for (let c = 1; c < row.length; c++) {
        if (typeof row[c] === "string" && row[c].trim()) {
          return row[c].replace(/^:\s*/, "").trim();
        }
      }
    }
  }
  return null;
}

// Return: { siswaList, detectedKelas, detectedSekolah, warnings }
// siswaList shape SAMA PERSIS kayak hasil extract-raport-pdf (KECUALI
// field `issues`, yang emang baru ditambahin di sini -- lihat catatan di
// bawah soal itu), jadi PreviewImportTable.js & handleSimpan di
// ImportRaportForm.js gak perlu diubah struktur besarnya:
//   [{ id, name, nis, status: "valid"|"warning", grades: [{subject, score}], issues: string[] }]
// `issues`: alasan spesifik kenapa status-nya "warning" (kosong kalau
// "valid") -- dipakein PreviewImportTable.js buat nampilin alasan persis
// di bawah nama siswa, bukan cuma badge status tanpa penjelasan.
export async function parseLegerExcel(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: true,
  });

  const { headerRowIdx, colNo, colNama, colNisn, colNis, colMapelStart } =
    findHeaderRow(rows);
  const headerRow = rows[headerRowIdx] || [];
  const subjectCodeRowIdx = headerRowIdx + 1;
  const subjectCodeRow = rows[subjectCodeRowIdx] || [];

  const { subjectCols } = findSubjectColumns(
    headerRow,
    subjectCodeRow,
    colMapelStart,
  );
  const subjectNameMap = buildSubjectNameMap(rows, subjectCols);

  const detectedKelas = findLabelValue(rows, "KELAS");
  const detectedSekolah = findLabelValue(rows, "SEKOLAH");

  const siswaList = [];
  const warnings = [];

  for (let r = subjectCodeRowIdx + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const no = row[colNo];
    const nama = row[colNama];

    // Baris kosong nandain tabel siswa udah abis (lanjut ke "KETERANGAN
    // MAPEL" atau baris pemisah) -- berhenti begitu ketemu, TAPI cuma
    // kalau udah pernah dapet minimal 1 siswa (biar ga salah stop kalau
    // ada baris kosong nyempil di tengah karena sheet-nya rapi).
    if ((no === null || no === undefined || no === "") && !nama) {
      if (siswaList.length > 0) break;
      continue;
    }
    if (!nama) continue;

    // Prioritaskan kolom "NIS" (NIS LOKAL, format sama kayak students.nis
    // di roster) kalau file ini punya kolom itu -- lebih akurat buat
    // matching, karena NISN & NIS lokal itu angka dari instansi BEDA yang
    // gak bisa saling diturunin. Fallback ke NISN kalau filenya cuma
    // punya itu (mis. template semester ganjil) -- raport yang kepake
    // NISN di sini kemungkinan besar TETAP perlu dihubungkan manual ke
    // akun siswa di Manajemen Nilai, soalnya roster `students` cuma
    // nyimpen NIS lokal, bukan NISN.
    const nisLokalRaw = colNis >= 0 ? row[colNis] : null;
    const nisnRaw = row[colNisn];
    const nisLokal =
      nisLokalRaw === null || nisLokalRaw === undefined
        ? ""
        : String(nisLokalRaw).trim();
    const nisn =
      nisnRaw === null || nisnRaw === undefined ? "" : String(nisnRaw).trim();
    const nis = nisLokal || nisn;
    const usedNisn = !nisLokal && !!nisn;

    const grades = subjectCols.map(({ colIdx, code }) => {
      const raw = row[colIdx];
      const score =
        raw === null || raw === undefined || raw === "" ? null : Number(raw);
      return {
        subject: subjectNameMap.get(colIdx) || code,
        score: Number.isFinite(score) ? score : null,
      };
    });

    const missingSubjects = grades
      .filter((g) => g.score === null)
      .map((g) => g.subject);
    const missingScore = missingSubjects.length > 0;
    const missingNis = !nis;
    const status = missingScore || missingNis ? "warning" : "valid";

    // Alasan spesifik kenapa siswa ini di-flag "Perlu Diperiksa" -- DITEMPEL
    // LANGSUNG ke objek siswa (bukan cuma masuk ke `warnings` global di
    // bawah), soalnya sebelumnya admin cuma liat badge "Perlu Diperiksa"
    // tanpa tau alasannya apa (nilai kelihatan sama kayak siswa lain di
    // preview) -- baru ketauan alasannya dari notice terpisah yang isinya
    // cuma ANGKA jumlah baris bermasalah, bukan detail per-siswa. Sekarang
    // `issues` ini yang dipakein PreviewImportTable.js buat nampilin alasan
    // persis di bawah nama siswa yang bersangkutan.
    const issues = [];
    if (missingNis) issues.push("NIS/NISN kosong");
    if (missingScore)
      issues.push(`Nilai kosong: ${missingSubjects.join(", ")}`);
    if (usedNisn) {
      issues.push(
        `File ini gak punya kolom NIS lokal, dipakein NISN (${nisn}) -- kemungkinan perlu dihubungkan manual ke akun siswa nanti di Manajemen Nilai`,
      );
    }

    if (missingNis)
      warnings.push(`Baris ${r + 1}: "${nama}" tidak punya NIS/NISN.`);
    if (missingScore)
      warnings.push(
        `Baris ${r + 1}: "${nama}" ada nilai mapel yang kosong (${missingSubjects.join(", ")}).`,
      );
    if (usedNisn) {
      warnings.push(
        `Baris ${r + 1}: "${nama}" -- file ini gak punya kolom NIS lokal, dipakein NISN (${nisn}). Kemungkinan besar perlu dihubungkan manual ke akun siswa nanti di Manajemen Nilai.`,
      );
    }

    siswaList.push({
      id: nis || `row-${r}`,
      name: String(nama).trim(),
      nis,
      status,
      grades,
      issues,
    });
  }

  if (siswaList.length === 0) {
    throw new Error(
      "Gak nemu baris data siswa di file ini. Pastikan formatnya sesuai template leger (ada kolom NO, NAMA SISWA, NISN).",
    );
  }

  return { siswaList, detectedKelas, detectedSekolah, warnings };
}
