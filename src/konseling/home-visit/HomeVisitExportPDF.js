//[file name]: HomeVisitExportPDF.js
//
// ⚠️ ASUMSI DEPENDENCY: modul ini butuh package `jspdf` dan `jspdf-autotable`.
// Kalau belum ada di package.json, install dulu:
//   npm install jspdf jspdf-autotable
//
// Kop laporan ambil dari 2 tabel Supabase:
// - school_settings (setting_key='school_name') -> nama sekolah
// - academic_year (is_active=true)              -> tahun ajaran berjalan
//
// ============================================================
// Modul export PDF untuk Home Visit. BUKAN komponen React — ngikutin
// pola `ReportExcel.js`: data disiapin di komponen pemanggil, modul ini
// cuma urusan render PDF-nya.
//
// ✅ HANYA ADA 1 FUNGSI EXPORT (sesuai keputusan: tombol export cuma ada
//    satu, di halaman utama HomeVisit.js — modal HomeVisitDetail.js
//    TIDAK punya tombol export sendiri lagi):
//
//    exportHomeVisitListToPDF(items)
//    -> items = array record `homevisits` (boleh isi 1 atau banyak,
//       biasanya `dataTersaring` dari HomeVisit.js / hasil filter aktif)
//    -> tiap item dicetak SATU HALAMAN PENUH dengan format yang SAMA
//       persis kayak tampilan modal HomeVisitDetail.js (Data Siswa,
//       Data Kunjungan & Permasalahan, Hasil Kunjungan)
//    -> data siswa (student_profile_details) ditarik otomatis di dalam
//       modul ini via `student_id` masing-masing item (1 query pakai
//       `.in()`, bukan query terpisah per item)
// ============================================================

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ⚠️ ASUMSI PATH: sesuaikan kalau lokasi supabaseClient beda
import { supabase } from "../../supabaseClient";
import { getActiveYearString } from "../../services/academicYearService";

const PAGE_BOTTOM_LIMIT = 275; // batas aman sebelum ganti halaman (mm, A4)

// ---------- Helper: ambil nama sekolah dari `school_settings` ----------
const getSchoolName = async () => {
  const { data, error } = await supabase
    .from("school_settings")
    .select("setting_value")
    .eq("setting_key", "school_name")
    .maybeSingle();
  if (error) console.error("[HomeVisitExportPDF] Gagal ambil school_name:", error.message);
  return data?.setting_value || "";
};

// ---------- Helper: ambil tahun ajaran yang sedang aktif (dari service -
// sebelumnya query manual .maybeSingle() sendiri di sini, punya kerentanan
// yang sama kalau ada 2 tahun ajaran ke-mark aktif bersamaan) ----------
const getActiveAcademicYear = async () => {
  const year = await getActiveYearString();
  return year ? year.replace("/", "-") : "";
};

// ---------- Helper: ambil banyak `student_profile_details` sekaligus (1 query pakai .in()) ----------
const getStudentProfilesMap = async (studentIds) => {
  const uniqueIds = [...new Set(studentIds.filter(Boolean))];
  if (uniqueIds.length === 0) return {};

  const { data, error } = await supabase
    .from("student_profile_details")
    .select("*")
    .in("student_id", uniqueIds);

  if (error) {
    console.error("[HomeVisitExportPDF] Gagal ambil student_profile_details:", error.message);
    return {};
  }

  const map = {};
  (data || []).forEach((profile) => {
    map[profile.student_id] = profile;
  });
  return map;
};

// ---------- Helper: format tanggal ke format Indonesia, fallback ke nilai asli ----------
const formatTanggal = (val) => {
  if (!val) return "-";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
};

// ---------- Helper: kop laporan (nama sekolah, judul, tahun ajaran) ----------
const addDocHeader = (doc, title, schoolName, academicYear, centerX, pageWidth) => {
  let y = 16;

  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(schoolName || "-", centerX, y, { align: "center" });

  y += 6;
  doc.setFontSize(12);
  doc.text(title, centerX, y, { align: "center" });

  y += 6;
  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(academicYear ? `TAHUN AJARAN ${academicYear}` : "-", centerX, y, { align: "center" });

  y += 4;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, y, pageWidth - 14, y);

  return y + 8;
};

// ---------- Helper: footer "Dicetak: ..." di tiap halaman ----------
const addFooter = (doc) => {
  const pageCount = doc.internal.getNumberOfPages();
  const printedDate = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(`Dicetak: ${printedDate}`, pageWidth / 2, pageHeight - 10, { align: "center" });
  }
};

// ---------- Helper: judul section + garis bawah, otomatis pindah halaman kalau mepet ----------
const addSectionTitle = (doc, text, y) => {
  if (y > PAGE_BOTTOM_LIMIT - 15) {
    doc.addPage();
    y = 18;
  }
  doc.setFontSize(11);
  doc.setFont(undefined, "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(text, 14, y);
  doc.setDrawColor(203, 213, 225);
  doc.line(14, y + 1.5, 196, y + 1.5);
  return y + 7;
};

// ---------- Helper: baris label:value (2 kolom, tanpa header tabel) ----------
const addRows = (doc, y, rows) => {
  autoTable(doc, {
    startY: y,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 1.3, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 55, textColor: [100, 116, 139] },
      1: { fontStyle: "bold" },
    },
    body: rows.map(([label, value]) => [label, value || "-"]),
    margin: { left: 14, right: 14 },
  });
  return doc.lastAutoTable.finalY + 6;
};

// ---------- Helper: render 1 home visit (format sama persis kayak HomeVisitDetail.js) di halaman yang sedang aktif ----------
const renderDetailPage = (
  doc,
  item,
  studentProfile,
  schoolName,
  academicYear,
  pageWidth,
  centerX
) => {
  let y = addDocHeader(doc, "LAPORAN HOME VISIT", schoolName, academicYear, centerX, pageWidth);

  const jk =
    studentProfile?.jenis_kelamin === "L"
      ? "Laki-laki"
      : studentProfile?.jenis_kelamin === "P"
        ? "Perempuan"
        : studentProfile?.jenis_kelamin;

  // Section: Data Siswa (gabung data dasar kunjungan + profil siswa)
  y = addSectionTitle(doc, "Data Siswa", y);
  y = addRows(doc, y, [
    ["Nama Siswa", item.nama_siswa],
    ["NIS", item.nis],
    ["Kelas", item.kelas],
    [
      "Tempat, Tanggal Lahir",
      [studentProfile?.tempat_lahir, studentProfile?.tanggal_lahir].filter(Boolean).join(", "),
    ],
    ["Jenis Kelamin", jk],
    ["Sekolah Asal", studentProfile?.sekolah_asal],
    ["Nama Ayah", studentProfile?.nama_ayah],
    ["Nama Ibu", studentProfile?.nama_ibu],
    ["No HP Orangtua", studentProfile?.no_hp_ortu],
    ["Alamat", studentProfile?.alamat],
  ]);

  // Section: Data Kunjungan & Permasalahan
  y = addSectionTitle(doc, "Data Kunjungan & Permasalahan", y);
  y = addRows(doc, y, [
    ["Tanggal Kunjungan", formatTanggal(item.tanggal_kunjungan)],
    ["Jenis Kunjungan", item.jenis_kunjungan],
    ["Kategori Permasalahan", item.kategori_permasalahan],
    ["Status", item.status],
    ["Alasan Kunjungan", item.alasan],
  ]);

  // Section: Hasil Kunjungan (tanpa Alamat Kunjungan, sudah ada di Data Siswa)
  y = addSectionTitle(doc, "Hasil Kunjungan", y);
  y = addRows(doc, y, [
    ["Nama Pihak yang Ditemui", item.nama_pihak_ditemui],
    ["Hubungan dengan Siswa", item.hubungan_pihak_ditemui],
    ["Kondisi & Informasi", item.hasil_kondisi_info],
    ["Hasil Diskusi", item.hasil_diskusi],
  ]);
};

// ============================================================
// SATU-SATUNYA fungsi export yang dipakai (dipanggil dari HomeVisit.js).
//   items = array record dari tabel `homevisits` (1 atau banyak record,
//           biasanya `dataTersaring` = data yang sedang lolos filter)
// Tiap item jadi 1 halaman laporan detail lengkap.
// ============================================================
export const exportHomeVisitListToPDF = async (items) => {
  if (!items || items.length === 0) return;

  const [schoolName, academicYear, profilesMap] = await Promise.all([
    getSchoolName(),
    getActiveAcademicYear(),
    getStudentProfilesMap(items.map((i) => i.student_id)),
  ]);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;

  items.forEach((item, idx) => {
    if (idx > 0) doc.addPage();
    renderDetailPage(
      doc,
      item,
      profilesMap[item.student_id],
      schoolName,
      academicYear,
      pageWidth,
      centerX
    );
  });

  addFooter(doc);

  const fileName =
    items.length === 1
      ? `home_visit_${(items[0].nama_siswa || "siswa").trim().replace(/\s+/g, "_")}_${
          items[0].tanggal_kunjungan || "tanpa_tanggal"
        }.pdf`
      : `laporan_home_visit_${new Date().toISOString().split("T")[0]}.pdf`;

  doc.save(fileName);
};
