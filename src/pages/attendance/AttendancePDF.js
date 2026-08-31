// AttendancePDF.js
// Generate laporan presensi PDF per satu siswa (bukan rekap satu kelas).
// Layout: Header sekolah -> Info siswa -> Ringkasan kehadiran ->
// Rekap per bulan (khusus mode semester) -> Detail per tanggal -> Tanda tangan.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../../supabaseClient";

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

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const STATUS_LABEL = { hadir: "Hadir", sakit: "Sakit", izin: "Izin", alpa: "Alpa" };

const SCHOOL_NAME = "SMP MUSLIMIN CILILIN";
const SCHOOL_CITY = "Cililin";

function normalizeStatus(status) {
  if (!status) return null;
  const s = status.toString().toLowerCase().trim();
  if (s === "alpha") return "alpa"; // data lama kadang nyimpen "Alpha"
  return s;
}

function formatTanggalCetak(date) {
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * @param {Object} params
 * @param {{id:string,nis:string,full_name:string}} params.student
 * @param {string} params.classId - kelas untuk mode "mapel"
 * @param {"harian"|"mapel"} params.attendanceType
 * @param {string} params.subject - nama mapel (khusus mode "mapel")
 * @param {string} params.homeroomClass - kelas homeroom (khusus mode "harian")
 * @param {string} params.academicYear - format "2026/2027"
 * @param {string} params.teacherName
 * @param {"bulanan"|"semester"} params.mode
 * @param {number} [params.month] - wajib kalau mode "bulanan" (1-12)
 * @param {number} params.year - tahun kalender yang dipakai utk rentang tanggal
 * @param {number} params.semester - 1 (ganjil) atau 2 (genap)
 * @param {boolean} [params.includeSignature] - default true. Set false untuk skip blok
 *   tempat/tanggal + jabatan + tanda tangan di footer (dipakai untuk export sisi admin,
 *   yang bukan wali kelas/guru mapel jadi gak perlu tanda tangan atas nama mereka).
 */
export async function exportStudentAttendancePDF({
  student,
  classId,
  attendanceType,
  subject,
  homeroomClass,
  academicYear, // teks tampilan, misal "2026/2027" (cuma buat header PDF)
  academicYearId, // uuid FK ke tabel academic_years (dipakai buat filter query)
  teacherName,
  mode,
  month,
  year,
  semester,
  includeSignature = true,
}) {
  try {
    if (!student) {
      return { success: false, message: "Data siswa tidak ditemukan" };
    }

    const isHomeroomDaily = attendanceType === "harian";
    const typeFilter = isHomeroomDaily ? "harian" : "mapel";
    const subjectFilter = isHomeroomDaily ? "Harian" : subject;
    const classFilter = isHomeroomDaily ? homeroomClass : classId;

    if (!classFilter || (!isHomeroomDaily && !subjectFilter)) {
      return { success: false, message: "Kelas/mapel belum lengkap" };
    }

    // ✅ Tentukan rentang tanggal & daftar bulan yang direkap
    let startDate, endDate, monthsInRange;
    if (mode === "bulanan") {
      const mm = String(month).padStart(2, "0");
      startDate = `${year}-${mm}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      endDate = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;
      monthsInRange = [month];
    } else {
      monthsInRange = semester === 1 ? [7, 8, 9, 10, 11, 12] : [1, 2, 3, 4, 5, 6];
      startDate = semester === 1 ? `${year}-07-01` : `${year}-01-01`;
      endDate = semester === 1 ? `${year}-12-31` : `${year}-06-30`;
    }

    // ✅ Query presensi khusus 1 siswa ini
    let query = supabase
      .from("attendances")
      .select("date, status, notes")
      .eq("student_id", student.id)
      .eq("subject", subjectFilter)
      .eq("class_id", classFilter)
      .eq("type", typeFilter)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });

    if (semester) {
      query = query.eq("semester", semester);
    }
    if (academicYearId) {
      query = query.eq("academic_year_id", academicYearId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const records = data || [];
    if (records.length === 0) {
      return { success: false, message: "Tidak ada data presensi untuk periode ini" };
    }

    // ✅ Ringkasan total
    const summary = { hadir: 0, sakit: 0, izin: 0, alpa: 0 };
    records.forEach((r) => {
      const s = normalizeStatus(r.status);
      if (summary[s] !== undefined) summary[s] += 1;
    });
    const total = summary.hadir + summary.sakit + summary.izin + summary.alpa;
    const persentase = total > 0 ? Math.round((summary.hadir / total) * 1000) / 10 : 0;

    // ✅ Rekap per bulan (dipakai kalau mode semester)
    const monthlyRecap = monthsInRange.map((m) => {
      const ms = { hadir: 0, sakit: 0, izin: 0, alpa: 0 };
      records
        .filter((r) => parseInt(r.date.split("-")[1], 10) === m)
        .forEach((r) => {
          const s = normalizeStatus(r.status);
          if (ms[s] !== undefined) ms[s] += 1;
        });
      return { month: m, ...ms };
    });

    // ============= BUILD PDF =============
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 18;

    const semesterLabel = semester === 1 ? "Ganjil" : "Genap";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(SCHOOL_NAME, pageWidth / 2, y, { align: "center" });
    y += 6;
    doc.setFontSize(12);
    const kelasLabel = isHomeroomDaily ? homeroomClass : classId;
    doc.text(`LAPORAN PRESENSI SISWA KELAS ${kelasLabel}`, pageWidth / 2, y, {
      align: "center",
    });
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    const headerPeriodText =
      mode === "bulanan"
        ? `BULAN : ${MONTH_NAMES[month - 1].toUpperCase()} ${year}`
        : `SEMESTER : ${semesterLabel.toUpperCase()} ${academicYear || year}`;
    doc.text(headerPeriodText, pageWidth / 2, y, { align: "center" });
    y += 4;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 7;

    // --- INFORMASI SISWA ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("INFORMASI SISWA", margin, y);
    y += 2;
    const periodeText =
      mode === "bulanan"
        ? `${MONTH_NAMES[month - 1]} ${year}`
        : semester === 1
          ? `Juli – Desember ${year}`
          : `Januari – Juni ${year}`;
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: "grid",
      styles: { fontSize: 9.5, cellPadding: 2.2 },
      body: [
        ["Nama", `: ${student.full_name}`],
        ["NIS", `: ${student.nis || "-"}`],
        ["Kelas", `: ${isHomeroomDaily ? homeroomClass : classId}`],
        ["Periode", `: ${periodeText}`],
      ],
      columnStyles: {
        0: { cellWidth: 30, fontStyle: "bold" },
        1: { cellWidth: pageWidth - margin * 2 - 30 },
      },
    });
    y = doc.lastAutoTable.finalY + 8;

    // --- RINGKASAN KEHADIRAN ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("RINGKASAN KEHADIRAN", margin, y);
    y += 3;
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: "grid",
      styles: { fontSize: 9.5, halign: "center", cellPadding: 3 },
      head: [["HADIR", "SAKIT", "IZIN", "ALPA", "% HADIR"]],
      body: [[summary.hadir, summary.sakit, summary.izin, summary.alpa, `${persentase}%`]],
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
    });
    y = doc.lastAutoTable.finalY + 8;

    // --- REKAP PRESENSI (per bulan, cuma relevan buat mode semester) ---
    if (mode === "semester") {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("REKAP PRESENSI", margin, y);
      y += 3;
      const recapBody = monthlyRecap.map((m) => [
        MONTH_NAMES[m.month - 1],
        m.hadir,
        m.sakit,
        m.izin,
        m.alpa,
      ]);
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        theme: "grid",
        styles: { fontSize: 9, halign: "center", cellPadding: 2 },
        head: [["Bulan", "Hadir", "Sakit", "Izin", "Alpa"]],
        body: recapBody,
        foot: [["TOTAL", summary.hadir, summary.sakit, summary.izin, summary.alpa]],
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
        footStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: "bold" },
        columnStyles: { 0: { halign: "left" } },
      });
      y = doc.lastAutoTable.finalY + 8;
    }

    // --- DETAIL PRESENSI ---
    // Mode "bulanan": tampilkan semua hari (cuma 1 bulan, masih ringkas).
    // Mode "semester": cukup yang BUKAN hadir aja (sakit/izin/alpa),
    // biar ga kepanjangan sampe beberapa halaman.
    const detailSource =
      mode === "semester" ? records.filter((r) => normalizeStatus(r.status) !== "hadir") : records;

    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(mode === "semester" ? "DETAIL KETIDAKHADIRAN" : "DETAIL PRESENSI", margin, y);
    y += 3;

    if (detailSource.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.text("Tidak ada ketidakhadiran pada periode ini.", margin, y);
      y += 8;
    } else {
      const detailBody = detailSource.map((r, idx) => {
        const [yy, mm, dd] = r.date.split("-");
        const dateObj = new Date(parseInt(yy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
        const s = normalizeStatus(r.status);
        return [
          idx + 1,
          `${dd}/${mm}/${yy}`,
          DAY_NAMES[dateObj.getDay()],
          STATUS_LABEL[s] || r.status,
          r.notes || "-",
        ];
      });
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        theme: "grid",
        styles: { fontSize: 8.5, cellPadding: 1.8 },
        head: [["No", "Tanggal", "Hari", "Status", "Keterangan"]],
        body: detailBody,
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 24, halign: "center" },
          2: { cellWidth: 22, halign: "center" },
          3: { cellWidth: 22, halign: "center" },
        },
      });
      y = doc.lastAutoTable.finalY;
    }
    y += 10;

    // --- FOOTER: persentase + tanda tangan ---
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Persentase Kehadiran: ${persentase}%`, margin, y);
    y += 14;

    // ✅ Blok tempat/tanggal + jabatan + tanda tangan cuma dicetak kalau includeSignature
    // (default true, dipakai guru/walikelas). Export dari sisi admin lewat
    // AdminAttendance.js pakai includeSignature: false karena admin bukan pihak
    // yang menandatangani laporan ini.
    if (includeSignature) {
      const rightX = pageWidth - margin;
      doc.text(`${SCHOOL_CITY}, ${formatTanggalCetak(new Date())}`, rightX, y, { align: "right" });
      y += 5;
      const jabatan = isHomeroomDaily
        ? `Wali Kelas ${homeroomClass}`
        : `Guru Mata Pelajaran ${subject || ""}`;
      doc.text(jabatan, rightX, y, { align: "right" });
      y += 20; // ruang kosong buat tanda tangan
      doc.setFont("helvetica", "bold");
      doc.text(`( ${teacherName || "-"} )`, rightX, y, { align: "right" });
    }

    // --- Simpan file ---
    const periodFileLabel =
      mode === "bulanan" ? MONTH_NAMES[month - 1] : `Semester${semesterLabel}`;
    const fileName = `Presensi_${student.full_name.replace(/\s+/g, "_")}_${periodFileLabel}_${year}.pdf`;
    doc.save(fileName);

    return { success: true };
  } catch (error) {
    console.error("❌ Error exportStudentAttendancePDF:", error);
    return { success: false, message: error.message };
  }
}
