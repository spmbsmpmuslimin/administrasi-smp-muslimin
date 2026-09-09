// src/system/checkers/RaportChecker.js
import { supabase } from "../../supabaseClient";

/**
 * RaportChecker - Validasi domain Nilai Raport
 * Nyentuh tabel yang gak dipegang checker lain manapun: student_reports,
 * student_report_grades, student_graduations. Dipisah jadi checker sendiri
 * (bukan numpang di BusinessLogicChecker/DataValidator) karena domain ini
 * lumayan besar & beda karakter -- banyak jalur insert manual (Import
 * Excel, Tambah Manual di ManajemenRaportTable.js, edit langsung sel di
 * RekapKelulusan.js), jadi rawan duplikat/data nyasar dibanding data yang
 * asalnya dari 1 jalur terstruktur.
 *
 * Cek-cek di sini nargetin masalah yang UDAH PERNAH KEJADIAN nyata di
 * lapangan (lihat komentar di ManajemenRaportTable.js/StudentRaport.js),
 * bukan spekulasi -- biar ketauan dari dashboard, bukan nunggu ada yang
 * lapor manual.
 */

export const checkRaport = async () => {
  console.log("🔍 RaportChecker: Starting check...");

  const issues = [];
  const startTime = Date.now();

  try {
    const duplicateIssues = await checkDuplicateReports();
    issues.push(...duplicateIssues);

    const unlinkedIssues = await checkUnlinkedPublishedReports();
    issues.push(...unlinkedIssues);

    const graduationIssues = await checkGraduationRecordsMissingYear();
    issues.push(...graduationIssues);

    const executionTime = Date.now() - startTime;
    console.log(`✅ RaportChecker completed in ${executionTime}ms`);
    console.log(`📊 Found ${issues.length} raport issues`);

    return {
      success: true,
      issues,
      executionTime,
    };
  } catch (error) {
    console.error("❌ RaportChecker failed:", error);
    return {
      success: false,
      error: error.message,
      issues,
      executionTime: Date.now() - startTime,
    };
  }
};

/**
 * Raport dengan nama siswa sama persis di tahun ajaran+semester yang sama,
 * tapi NIS beda -- ini pola bug yang UDAH KEJADIAN nyata (lihat komentar
 * di ManajemenRaportTable.js): format NIS beda antar semester (mis.
 * "3137255819" vs "25.26.07.203") bikin sistem nganggep itu 2 siswa beda
 * padahal orangnya sama, jadi ke-import DOBEL.
 */
const checkDuplicateReports = async () => {
  const issues = [];

  try {
    const { data, error } = await supabase
      .from("student_reports")
      .select("id, student_name, student_nis, academic_year, semester")
      .order("academic_year", { ascending: true })
      .order("semester", { ascending: true });

    if (error) throw error;

    const normName = (n) => (n || "").trim().toUpperCase().replace(/\s+/g, " ");
    const groups = {};

    (data || []).forEach((r) => {
      const key = `${r.academic_year}|${r.semester}|${normName(r.student_name)}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });

    const duplicateGroups = Object.values(groups).filter(
      (rows) => rows.length > 1 && new Set(rows.map((r) => r.student_nis)).size > 1
    );

    if (duplicateGroups.length > 0) {
      const contoh = duplicateGroups
        .slice(0, 5)
        .map((rows) => `${rows[0].student_name} (${rows[0].academic_year} smt ${rows[0].semester})`)
        .join(", ");

      issues.push({
        category: "raport",
        severity: "warning",
        message: "Kemungkinan raport duplikat (nama sama, NIS beda)",
        details: `Ditemukan ${duplicateGroups.length} kemungkinan duplikat -- biasanya karena format NIS beda antar semester. Contoh: ${contoh}${
          duplicateGroups.length > 5 ? ", dst" : ""
        }. Cek & gabungkan/hapus salah satu lewat Manajemen Nilai.`,
        table: "student_reports",
      });
    }
  } catch (error) {
    console.error("Error checking duplicate reports:", error);
    issues.push({
      category: "raport",
      severity: "info",
      message: "Could not complete duplicate report check",
      details: error.message,
      table: "student_reports",
    });
  }

  return issues;
};

/**
 * Raport berstatus "published" tapi student_id masih null -- artinya
 * TIDAK AKAN MUNCUL di halaman siswa manapun (lihat StudentRaport.js &
 * ManajemenRaportTable.js) walau statusnya udah published, sampai
 * dihubungkan manual lewat "Coba Hubungkan".
 */
const checkUnlinkedPublishedReports = async () => {
  const issues = [];

  try {
    const { count, error } = await supabase
      .from("student_reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .is("student_id", null);

    if (error) throw error;

    if (count > 0) {
      issues.push({
        category: "raport",
        severity: "warning",
        message: "Raport published tapi belum terhubung ke akun siswa",
        details: `${count} raport berstatus "published" tapi student_id kosong -- TIDAK akan muncul di halaman siswa manapun sampai dihubungkan manual lewat "Coba Hubungkan" di Manajemen Nilai.`,
        table: "student_reports",
      });
    }
  } catch (error) {
    console.error("Error checking unlinked published reports:", error);
    issues.push({
      category: "raport",
      severity: "info",
      message: "Could not complete unlinked report check",
      details: error.message,
      table: "student_reports",
    });
  }

  return issues;
};

/**
 * Baris student_graduations tanpa academic_year_id -- gap yang udah
 * ketemu manual (lihat catatan proyek): YearTransition.js STEP 3a belum
 * nulis kolom ini pas insert arsip siswa lulus.
 */
const checkGraduationRecordsMissingYear = async () => {
  const issues = [];

  try {
    const { count, error } = await supabase
      .from("student_graduations")
      .select("id", { count: "exact", head: true })
      .is("academic_year_id", null);

    if (error) throw error;

    if (count > 0) {
      issues.push({
        category: "raport",
        severity: "warning",
        message: "Arsip siswa lulus tanpa academic_year_id",
        details: `${count} baris di student_graduations tidak punya academic_year_id -- kemungkinan diinsert lewat Transisi Tahun Ajaran otomatis yang belum nulis kolom ini, atau insert manual yang kelewat isi.`,
        table: "student_graduations",
      });
    }
  } catch (error) {
    console.error("Error checking graduation records:", error);
    issues.push({
      category: "raport",
      severity: "info",
      message: "Could not complete graduation records check",
      details: error.message,
      table: "student_graduations",
    });
  }

  return issues;
};

export default checkRaport;
