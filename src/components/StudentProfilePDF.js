// StudentProfilePDF.js
// Export PDF kelengkapan data siswa (StudentProfileCompletion.js).
// Beda sama AttendancePDF.js: gak query Supabase lagi -- data siswa yang
// dikirim ke sini udah lengkap (hasil merge students + student_profile_details
// yang udah dilakuin di StudentProfileCompletion.js), jadi tinggal dirender.
// Layout per siswa: Header sekolah -> DATA SISWA (identitas Nama/NIS/Kelas
// digabung sama field tambahan spt Jenis Kelamin dkk dalam 1 tabel) ->
// DATA ORANGTUA -> Catatan status & tanggal terakhir update. 1 halaman =
// 1 siswa.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const SCHOOL_NAME = "SMP MUSLIMIN CILILIN";
const SCHOOL_CITY = "Cililin";

const STATUS_LABEL = {
  lengkap: "Lengkap",
  sebagian: "Sebagian",
  belum: "Belum Isi",
};

// Warna badge status, dipakai buat header tabel ringkasan per siswa.
const STATUS_COLOR = {
  lengkap: [16, 185, 129], // emerald-500
  sebagian: [245, 158, 11], // amber-500
  belum: [244, 63, 94], // rose-500
};

// Field-field ini disamain sama student_profile_details versi baru
// (StudentProfile.js) yang udah dipecah Ayah/Ibu & nambah field formulir
// pendaftaran (jenis_kelamin, tempat/tanggal lahir, nisn). Kolom lama
// `nama_ortu` (generic) UDAH GAK DIPAKE lagi di sini, digantiin
// nama_ayah + nama_ibu.
//
// `combine: "ttl"` = field gabungan Tempat + Tanggal Lahir, nilainya
// diambil dari 2 kolom DB (tempat_lahir, tanggal_lahir) terus dirender
// jadi 1 baris "Cililin, 12 Januari 2012".
const DATA_SISWA_ROWS = [
  { key: "jenis_kelamin", label: "Jenis Kelamin" },
  { key: "ttl", label: "Tempat, Tanggal Lahir", combine: "ttl" },
  { key: "nisn", label: "NISN" },
  { key: "sekolah_asal", label: "Sekolah Asal" },
  { key: "alamat", label: "Alamat Lengkap" },
  { key: "no_hp", label: "No. HP Siswa" },
];

const DATA_ORANGTUA_ROWS = [
  { key: "nama_ayah", label: "Nama Lengkap Ayah" },
  { key: "pekerjaan_ayah", label: "Pekerjaan Ayah" },
  { key: "pendidikan_ayah", label: "Pendidikan Terakhir Ayah" },
  { key: "nama_ibu", label: "Nama Lengkap Ibu" },
  { key: "pekerjaan_ibu", label: "Pekerjaan Ibu" },
  { key: "pendidikan_ibu", label: "Pendidikan Terakhir Ibu" },
  { key: "no_hp_ortu", label: "No. HP Orang Tua/Wali" },
];

// Dipake buat hitung status kelengkapan (missingLabels di Catatan) —
// gabungan semua field tambahan dari kedua grup di atas.
const ALL_DETAIL_ROWS = [...DATA_SISWA_ROWS, ...DATA_ORANGTUA_ROWS];

const MONTH_NAMES = [
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

function formatTanggalCetak(date) {
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function formatTanggalUpdate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Format tanggal lahir jadi "12 Januari 2012" (pake MONTH_NAMES yang sama
// kayak tanggal cetak, biar konsisten & gak gantung ke locale browser).
function formatTanggalSingkat(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTempatTanggalLahir(detail) {
  const tempat = detail?.tempat_lahir;
  const tanggal = formatTanggalSingkat(detail?.tanggal_lahir);
  if (!tempat && !tanggal) return null;
  if (tempat && tanggal) return `${tempat}, ${tanggal}`;
  return tempat || tanggal;
}

// Ambil nilai 1 baris detail (support field gabungan kayak `ttl`), balikin
// { display, isEmpty } biar didParseCell & Catatan gak duplikat logika.
function getRowValue(detail, row) {
  if (row.combine === "ttl") {
    const display = formatTempatTanggalLahir(detail);
    return { display, isEmpty: !display };
  }
  const raw = detail ? detail[row.key] : null;
  const isEmpty = !raw || String(raw).trim() === "";
  return { display: isEmpty ? null : raw, isEmpty };
}

/**
 * Render 1 halaman untuk 1 siswa. Dipanggil dari dalam loop, doc-nya di-share.
 * @param {import("jspdf").jsPDF} doc
 * @param {{full_name:string,nis:string,class_id:string,status:string,detail:Object|null}} student
 * @param {string} academicYear - format "2026/2027" (ditampilin di header pake "-")
 */
function renderStudentPage(doc, student, academicYear) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 18;

  const statusKey = student.status || "belum";
  const statusLabel = STATUS_LABEL[statusKey] || "Belum Isi";
  const detail = student.detail || null;
  const kelasLabel = student.class_id || "-";
  const tahunLabel = academicYear ? academicYear.replace(/\//g, "-") : null;

  // --- HEADER SEKOLAH (3 baris: nama sekolah, kelas, tahun ajaran) ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(SCHOOL_NAME, pageWidth / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(12);
  doc.text(`DATA KELENGKAPAN SISWA KELAS ${kelasLabel}`, pageWidth / 2, y, {
    align: "center",
  });
  y += 6;
  if (tahunLabel) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.text(`TAHUN AJARAN ${tahunLabel}`, pageWidth / 2, y, {
      align: "center",
    });
    y += 4;
  }
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 9;

  // --- DATA SISWA (identitas dasar dari tabel `students` + field
  // tambahan hasil isian form dari student_profile_details, digabung jadi
  // 1 tabel biar gak keliatan redundan sama section INFORMASI SISWA yang
  // dulu terpisah) ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("DATA SISWA", margin, y);
  y += 2;
  // Baris identitas (Nama/NIS/Kelas) selalu dianggap "ada isinya" -> gak
  // ikut logic warna merah "Belum diisi" kayak field form tambahan.
  const identitasBody = [
    ["Nama", student.full_name || "-"],
    ["NIS", student.nis || "-"],
    ["Kelas", kelasLabel],
  ];
  const siswaBody = DATA_SISWA_ROWS.map((row) => getRowValue(detail, row));
  const identitasCount = identitasBody.length;
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2.2 },
    head: [["Field", "Isian"]],
    body: [
      ...identitasBody,
      ...DATA_SISWA_ROWS.map((row, i) => [row.label, siswaBody[i].display || "Belum diisi"]),
    ],
    headStyles: {
      fillColor: [230, 230, 230],
      textColor: 30,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.section !== "body" || data.column.index !== 1) return;
      const rowIdx = data.row.index - identitasCount;
      if (rowIdx >= 0 && siswaBody[rowIdx]?.isEmpty) {
        data.cell.styles.textColor = [244, 63, 94]; // rose-500
        data.cell.styles.fontStyle = "italic";
      }
    },
  });
  y = doc.lastAutoTable.finalY + 7;

  // --- DATA ORANGTUA (Ayah, Ibu, Kontak) ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("DATA ORANGTUA", margin, y);
  y += 3;
  const orangtuaBody = DATA_ORANGTUA_ROWS.map((row) => getRowValue(detail, row));
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2.2 },
    head: [["Field", "Isian"]],
    body: DATA_ORANGTUA_ROWS.map((row, i) => [row.label, orangtuaBody[i].display || "Belum diisi"]),
    headStyles: {
      fillColor: [230, 230, 230],
      textColor: 30,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (
        data.section === "body" &&
        data.column.index === 1 &&
        orangtuaBody[data.row.index]?.isEmpty
      ) {
        data.cell.styles.textColor = [244, 63, 94]; // rose-500
        data.cell.styles.fontStyle = "italic";
      }
    },
  });
  y = doc.lastAutoTable.finalY + 6;

  // --- CATATAN: status kelengkapan + field yang masih kosong + tanggal update ---
  const missingLabels = ALL_DETAIL_ROWS.filter((row) => getRowValue(detail, row).isEmpty).map(
    (row) => row.label
  );

  let catatanText;
  if (statusKey === "belum") {
    catatanText = "Siswa ini belum pernah mengisi data tambahan sama sekali.";
  } else if (statusKey === "sebagian") {
    catatanText = `Data belum lengkap (${statusLabel}). Field yang belum diisi: ${missingLabels.join(", ")}.`;
  } else {
    catatanText = `Data sudah lengkap (${statusLabel}).`;
  }
  const updatedLabel = formatTanggalUpdate(detail?.updated_at);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(0);
  doc.text("Catatan:", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const catatanColor =
    statusKey === "belum"
      ? STATUS_COLOR.belum
      : statusKey === "sebagian"
        ? STATUS_COLOR.sebagian
        : STATUS_COLOR.lengkap;
  doc.setTextColor(...catatanColor);
  const catatanLines = doc.splitTextToSize(catatanText, pageWidth - margin * 2);
  doc.text(catatanLines, margin, y);
  y += catatanLines.length * 4.2 + 2;
  doc.setTextColor(100);
  doc.setFontSize(8.5);
  if (updatedLabel) {
    doc.text(`Terakhir diperbarui: ${updatedLabel}`, margin, y);
  }
  doc.setTextColor(0);

  // --- FOOTER: tanggal cetak, rata kanan bawah halaman ---
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(130);
  doc.text(`Dicetak: ${formatTanggalCetak(new Date())}`, pageWidth - margin, pageHeight - 12, {
    align: "right",
  });
  doc.setTextColor(0);
}

/**
 * Export PDF kelengkapan data untuk sekumpulan siswa, 1 halaman per siswa.
 * @param {Array<{id:string,full_name:string,nis:string,class_id:string,status:string,detail:Object|null}>} students
 * @param {{academicYear?:string}} [options] - academicYear format "2026/2027", ditampilin di header tiap halaman
 * @returns {{success:boolean,message?:string}}
 */
export function exportStudentProfilePDF(students, options = {}) {
  try {
    if (!students || students.length === 0) {
      return { success: false, message: "Tidak ada siswa yang dipilih" };
    }

    const { academicYear } = options;
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    students.forEach((student, idx) => {
      if (idx > 0) doc.addPage();
      renderStudentPage(doc, student, academicYear);
    });

    const fileName =
      students.length === 1
        ? `Kelengkapan_Data_${students[0].full_name.replace(/\s+/g, "_")}.pdf`
        : `Kelengkapan_Data_Siswa_${students.length}_Siswa.pdf`;
    doc.save(fileName);

    return { success: true };
  } catch (error) {
    console.error("❌ Error exportStudentProfilePDF:", error);
    return { success: false, message: error.message };
  }
}

export default exportStudentProfilePDF;
