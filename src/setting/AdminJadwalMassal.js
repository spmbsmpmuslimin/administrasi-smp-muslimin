// setting/AdminJadwalMassal.js
// Dipanggil sebagai sub-tab dari JadwalGuruTab.js (menu "Kelola Jadwal
// Pelajaran" di halaman Setting), bukan lagi halaman berdiri sendiri.
// Fitur inti: Admin olah jadwal dari PDF WKS. Kurikulum (yang isinya cuma
// KODE guru per kelas per jam) jadi jadwal "manusiawi" (Mapel + Nama
// Guru), lalu di-PUBLISH sekaligus ke SEMUA kelas (tabel class_schedules)
// — otomatis kebaca sama wali kelas (KelolaJadwalPelajaran.js) dan siswa
// (StudentJadwal.js), tanpa wali kelas perlu isi manual satu-satu.
//
// ALUR:
// 1. Admin download Template (Excel kosong, kolom = semua kelas aktif,
//    baris = Hari + Jam Ke). Admin isi tiap sel dengan KODE guru sambil
//    liat PDF dari WKS. Kurikulum (copy langsung angka per angka).
// 2. Admin upload file yang udah diisi -> sistem BACA MENTAH kode per
//    sel dulu (belum ditranslate), simpan di state `rawCells`.
// 3. `decoded` (useMemo) nge-translate tiap kode pake Master Kode Guru
//    (tabel teacher_codes) -> Mapel + Nama Guru. Kode yang gak ketemu di
//    master ditandai ERROR (bukan langsung gagal semua, biar admin bisa
//    liat mana yang bermasalah).
// 4. PREVIEW: admin liat hasil decode per kelas + daftar kode error. Kode
//    error bisa langsung dipetain di tempat (tanpa re-upload) lewat form
//    kecil, yang otomatis nambahin ke Master Kode Guru & re-decode.
// 5. PUBLISH: baru kalau semua kode di file udah ke-decode alias 0 error,
//    tombol Publish aktif. Publish = REPLACE TOTAL class_schedules untuk
//    semua kelas yang ada di file (hapus lama, insert hasil decode baru).
//
// VALIDASI SILANG (opsional, non-blocking): kalau teacher_codes punya
// teacher_id (format G-01, dst -- lihat migration_add_teacher_id.sql),
// tiap hasil decode (guru+mapel+kelas) dicek ke tabel teacher_assignments
// (siapa beneran ngajar apa di kelas mana). Kalau gak ketemu, ditandain
// "kombinasi ganjil" (warning oranye) -- BUKAN error, publish tetep bisa
// jalan. Ini buat nangkep kasus kode ke-baca "valid" (ada di master) tapi
// sebenernya salah ketik/ketuker pas nyalin dari PDF WKS. Kurikulum.
import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "../supabaseClient";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import {
  AlertCircle,
  CheckCircle,
  Download,
  Upload,
  UploadCloud,
  Rocket,
  X,
  Loader2,
  FileSpreadsheet,
  ClipboardList,
  Users,
} from "lucide-react";
import { getActiveYearString } from "../services/academicYearService";
import { JAM_SCHEDULE, DAYS, getAvailablePeriods } from "../utils/jamPelajaran";

// Warna pill nama hari di preview per kelas — samain nuansa sama warna
// band hari di Template Excel (dayColors di handleDownloadTemplate),
// biar konsisten secara visual antara template & preview.
const DAY_BADGE_COLORS = {
  Senin: "bg-blue-50 text-blue-700 dark:bg-blue-950/30",
  Selasa: "bg-pink-50 text-pink-700 dark:bg-pink-950/30",
  Rabu: "bg-green-50 text-green-700 dark:bg-green-950/30",
  Kamis: "bg-amber-50 text-amber-700 dark:bg-amber-950/30",
  Jumat: "bg-purple-50 text-purple-700 dark:bg-purple-950/30",
};

export default function AdminJadwalMassal() {
  const [academicYear, setAcademicYear] = useState("");
  const [classes, setClasses] = useState([]); // [{id, grade}]
  const [teacherCodes, setTeacherCodes] = useState([]); // dari tabel teacher_codes
  // teacherAssignments: dari tabel teacher_assignments (siapa ngajar mapel
  // apa di kelas mana). Dipakai buat validasi silang di `decoded` -- bukan
  // buat translate kode (itu tugasnya teacher_codes), tapi buat nangkep
  // kode yang salah ketik/ketuker meski kodenya sendiri "valid" di master.
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  // teacherUsers: dari tabel `users`, cuma yang punya `teacher_id` (kode
  // G-01 dst, sama kayak di teacher_codes). Dipakai buat resolve kode
  // guru hasil decode -> akun login guru (users.id) pas Publish, biar
  // jadwal massal ini juga otomatis ngisi teacher_schedules (Jadwal
  // Mengajar guru), gak cuma class_schedules & teacher_assignments.
  const [teacherUsers, setTeacherUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // rawCells: array { class_id, day, period, code } — mentah dari file,
  // sebelum ditranslate. Disimpen terpisah dari hasil decode supaya bisa
  // re-decode tanpa perlu re-upload pas admin nambahin kode yang tadinya
  // ketinggalan ke Master Kode Guru.
  const [rawCells, setRawCells] = useState([]);
  const [sourceFileName, setSourceFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  // publishedAt: kapan preview yang lagi ditampilin ini terakhir
  // dipublish (null = belum). Sengaja gak reset rawCells abis publish
  // supaya admin masih bisa Export Preview / liat hasil decode kalau
  // belum sempet export sebelum publish -- tinggal klik "Mulai Baru"
  // (reset manual) atau upload file baru kalau mau mulai dari nol.
  const [publishedAt, setPublishedAt] = useState(null);
  const fileInputRef = useRef(null);

  // Modal konfirmasi Publish (custom, gantiin window.confirm bawaan browser
  // yang gak bisa diatur ukuran/warnanya). `pendingPublishClassIds` nyimpen
  // classIds yang udah divalidasi & siap publish, disiapin pas admin klik
  // tombol Publish, dieksekusi beneran pas admin konfirmasi di modal.
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);
  const [pendingPublishClassIds, setPendingPublishClassIds] = useState([]);

  // Form kecil buat map kode yang error langsung dari preview
  const [quickMapCode, setQuickMapCode] = useState(null); // string kode yang lagi diisi
  const [quickMapForm, setQuickMapForm] = useState({
    teacher_name: "",
    subject: "",
  });
  const [quickMapSaving, setQuickMapSaving] = useState(false);

  // Kelas mana aja yang mau ke-publish (checkbox per kelas di preview).
  // Default = semua kelas yang ada di file (select all), admin bisa
  // uncheck kelas tertentu (mis. kelas yang jadwal manualnya udah bener
  // dan gak mau kesundul sama hasil decode file ini).
  const [selectedClassIds, setSelectedClassIds] = useState(new Set());

  // Mode tampilan preview: "grid" = tabel mingguan 1 kelas sekaligus
  // (Jam x Hari, kayak tampilan Kelola Jadwal Pelajaran punya Walikelas),
  // "accordion" = daftar per kelas yang bisa dibuka-tutup satu-satu
  // (tampilan lama, masih dipertahankan buat liat banyak kelas sekaligus
  // sebelum publish). "gridClassId" nyimpen kelas mana yang lagi dipilih
  // di dropdown pas mode "grid".
  const [previewMode, setPreviewMode] = useState("grid");
  const [gridClassId, setGridClassId] = useState("");

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        const year = await getActiveYearString();
        if (!year) {
          setError(
            "Tidak ada tahun ajaran aktif. Atur dulu di menu Pengaturan.",
          );
          setLoading(false);
          return;
        }
        setAcademicYear(year);

        const [
          { data: classData, error: classErr },
          { data: codeData, error: codeErr },
          { data: assignData, error: assignErr },
          { data: userData, error: userErr },
        ] = await Promise.all([
          supabase
            .from("classes")
            .select("id, grade")
            .eq("academic_year", year)
            .order("grade")
            .order("id"),
          supabase
            .from("teacher_codes")
            .select("code, teacher_name, subject, teacher_id")
            .eq("academic_year", year),
          supabase
            .from("teacher_assignments")
            .select("teacher_id, class_id, subject")
            .eq("academic_year", year),
          supabase
            .from("users")
            .select("id, teacher_id, full_name")
            .not("teacher_id", "is", null),
        ]);
        if (classErr) throw classErr;
        if (codeErr) throw codeErr;
        // teacher_assignments dianggap "nice to have": kalau gagal/tabel
        // belum ada isinya, jangan sampe gagalin seluruh halaman -- cukup
        // matiin fitur validasi silangnya aja (assignmentSet kosong).
        if (assignErr) {
          console.warn(
            "Gagal memuat teacher_assignments, validasi silang dimatikan:",
            assignErr.message,
          );
        }
        // users (buat mapping teacher_id -> akun login) juga "nice to
        // have": kalau gagal, cuma matiin auto-sync teacher_schedules,
        // gak boleh gagalin seluruh halaman.
        if (userErr) {
          console.warn(
            "Gagal memuat users, auto-sync teacher_schedules dimatikan:",
            userErr.message,
          );
        }

        setClasses(classData || []);
        setTeacherCodes(codeData || []);
        setTeacherAssignments(assignData || []);
        setTeacherUsers(userData || []);
      } catch (err) {
        setError("Gagal memuat data awal: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 3000);
    return () => clearTimeout(t);
  }, [success]);

  // Reset seleksi ke "semua kelas dipilih" tiap kali ada file BARU
  // diupload (rawCells ganti reference). Sengaja gak nempel ke `decoded`
  // biar quick-map kode error (yang cuma re-decode, bukan upload baru)
  // gak reset pilihan admin yang udah di-uncheck.
  useEffect(() => {
    const ids = new Set(rawCells.map((c) => c.class_id));
    setSelectedClassIds(ids);
    const sortedIds = Array.from(ids).sort();
    setGridClassId(sortedIds[0] || "");
    setPublishedAt(null);
  }, [rawCells]);

  const codeMap = useMemo(() => {
    const m = new Map();
    teacherCodes.forEach((c) => m.set(c.code.toUpperCase(), c));
    return m;
  }, [teacherCodes]);

  // Beberapa mapel ditulis singkat di Master Kode Guru (mengikuti
  // kebiasaan grid jadwal WKS. Kurikulum, mis. "PP") tapi ditulis lengkap
  // di teacher_assignments (mis. "PENDIDIKAN PANCASILA"). Alias ini CUMA
  // dipakai buat pencocokan validasi silang -- gak ngubah tampilan mapel
  // di preview/jadwal, yang tetep pake penulisan aslinya dari teacher_codes.
  // Kalau nanti nemu mapel lain yang beda penulisan, tinggal tambahin di sini.
  const SUBJECT_ALIASES = { PP: "PENDIDIKAN PANCASILA" };
  const canonicalSubject = (s) => {
    const up = s.toUpperCase();
    return SUBJECT_ALIASES[up] || up;
  };

  // Subject yang sengaja DIKECUALIKAN dari pengecekan "stale" (assignment
  // perlu dicek) di syncPreview. Alasan: BP/BK gak pernah punya jam masuk
  // kelas di grid jadwal kode (guru BP/BK gak pernah kepake di rawCells),
  // tapi assignment-nya di teacher_assignments SENGAJA dipertahankan buat
  // keperluan lain (mis. presensi/jurnal kelas yang dia pegang). Kalau
  // BP/BK ikut dicek stale, dia bakal SELALU muncul di "perlu dicek" di
  // SETIAP import jadwal massal, walau datanya udah bener -- karena
  // memang gak akan pernah ketemu lagi di file manapun. Kalau nanti ada
  // subject lain dengan sifat serupa (dipegang tapi gak pernah di grid),
  // tinggal tambahin di sini.
  const SUBJECTS_EXCLUDED_FROM_STALE_CHECK = new Set(["BP/BK"]);

  // Set kombinasi "teacher_id|class_id|SUBJECT" yang sah menurut
  // teacher_assignments. Subject di-uppercase karena penulisan di
  // teacher_assignments ALL CAPS sedangkan di teacher_codes bebas.
  const assignmentSet = useMemo(() => {
    const s = new Set();
    teacherAssignments.forEach((a) => {
      s.add(`${a.teacher_id}|${a.class_id}|${canonicalSubject(a.subject)}`);
    });
    return s;
  }, [teacherAssignments]);

  // Hasil decode rawCells pake codeMap terkini. Otomatis re-run tiap
  // codeMap berubah (mis. abis quick-map kode error).
  const decoded = useMemo(() => {
    const byClass = {}; // { class_id: [{day, period, subject, teacher_name, start, end, mismatch}] }
    const errors = []; // [{class_id, day, period, code}]
    const errorCodesSet = new Set();
    // mismatches: kode ketemu di teacher_codes (BUKAN error), tapi
    // kombinasi (guru, kelas, mapel) hasilnya gak ketemu di
    // teacher_assignments. Ini WARNING, bukan blocker publish -- soalnya
    // teacher_assignments bisa aja belum lengkap/update. Tujuannya cuma
    // ngasih tau admin "coba double-check, siapa tau salah ketik kode".
    const mismatches = [];

    rawCells.forEach(({ class_id, day, period, code }) => {
      const range = JAM_SCHEDULE[day]?.[period];
      if (!range?.start) return; // jaga-jaga, seharusnya gak kejadian
      const found = codeMap.get(code.toUpperCase());
      if (!found) {
        errors.push({ class_id, day, period, code });
        errorCodesSet.add(code.toUpperCase());
        return;
      }

      // Validasi silang: cuma jalan kalau kode ini punya teacher_id
      // terdaftar DAN ada data assignment sama sekali buat tahun ajaran
      // ini. Kalau salah satu gak ada, skip diem-diem (jangan sok tau
      // nge-flag padahal datanya emang belum lengkap).
      let mismatch = false;
      if (found.teacher_id && assignmentSet.size > 0) {
        const key = `${found.teacher_id}|${class_id}|${canonicalSubject(found.subject)}`;
        if (!assignmentSet.has(key)) {
          mismatch = true;
          mismatches.push({
            class_id,
            day,
            period,
            code,
            teacher_name: found.teacher_name,
            subject: found.subject,
          });
        }
      }

      if (!byClass[class_id]) byClass[class_id] = [];
      byClass[class_id].push({
        day,
        period,
        subject: found.subject,
        teacher_name: found.teacher_name,
        teacher_id: found.teacher_id || null, // dipakai buat auto-sync teacher_assignments pas publish
        start: range.start,
        end: range.end,
        mismatch,
      });
    });

    return {
      byClass,
      errors,
      errorCodes: Array.from(errorCodesSet).sort(),
      mismatches,
      totalCells: rawCells.length,
      totalOk: rawCells.length - errors.length,
      classCount: Object.keys(byClass).length,
    };
  }, [rawCells, codeMap, assignmentSet]);

  // teacher_id -> teacher_name, dari Master Kode Guru. Beberapa kode bisa
  // punya teacher_id yang sama (mis. kode "6" & "6P" guru yang sama ngajar
  // 2 mapel beda) -- gak masalah, nama gurunya tetep sama, jadi overwrite
  // aman aja.
  const teacherNameById = useMemo(() => {
    const m = new Map();
    teacherCodes.forEach((c) => {
      if (c.teacher_id) m.set(c.teacher_id, c.teacher_name);
    });
    return m;
  }, [teacherCodes]);

  // teacher_id (kode G-01, dst) -> users.id (akun login guru). Dipakai
  // pas Publish buat nentuin baris teacher_schedules ini punya akun guru
  // yang mana. Kalau satu teacher_id kebetulan kepake di >1 akun (harusnya
  // gak terjadi), yang kepake yang terakhir -- cukup buat kasus normal.
  const userIdByTeacherCode = useMemo(() => {
    const m = new Map();
    teacherUsers.forEach((u) => {
      if (u.teacher_id) m.set(u.teacher_id, u.id);
    });
    return m;
  }, [teacherUsers]);

  // Preview efek auto-sync teacher_assignments SEBELUM admin klik Publish --
  // biar keliatan duluan assignment baru yang bakal ditambahin & assignment
  // lama yang kelihatannya udah gak kepake, tanpa perlu publish dulu buat
  // tau. Dihitung dari SEMUA kelas yang ada di file (bukan cuma yang
  // dicentang) -- samain gaya sama `decoded.mismatches`, keduanya cuma
  // informasi buat admin. Kelas mana yang beneran diproses tetep ditentuin
  // pas klik Publish (lihat handlePublish, yang re-hitung sendiri scoped ke
  // classIds yang dicentang).
  const syncPreview = useMemo(() => {
    const candidateRows = [];
    const seenCandidate = new Set();
    Object.keys(decoded.byClass).forEach((classId) => {
      decoded.byClass[classId].forEach((item) => {
        if (!item.teacher_id) return; // kode belum terhubung ke user guru
        const subject = canonicalSubject(item.subject);
        const key = `${item.teacher_id}|${classId}|${subject}`;
        if (seenCandidate.has(key)) return;
        seenCandidate.add(key);
        candidateRows.push({
          teacher_id: item.teacher_id,
          class_id: classId,
          subject,
          teacher_name: item.teacher_name,
        });
      });
    });

    const existingKeySet = new Set(
      teacherAssignments.map(
        (a) => `${a.teacher_id}|${a.class_id}|${canonicalSubject(a.subject)}`,
      ),
    );
    const toAdd = candidateRows.filter(
      (r) => !existingKeySet.has(`${r.teacher_id}|${r.class_id}|${r.subject}`),
    );

    const decodedKeys = new Set(
      candidateRows.map((r) => `${r.teacher_id}|${r.class_id}|${r.subject}`),
    );
    const filedClassIds = new Set(Object.keys(decoded.byClass));
    const stale = teacherAssignments
      .filter(
        (a) =>
          filedClassIds.has(a.class_id) &&
          !SUBJECTS_EXCLUDED_FROM_STALE_CHECK.has(
            canonicalSubject(a.subject),
          ) &&
          !decodedKeys.has(
            `${a.teacher_id}|${a.class_id}|${canonicalSubject(a.subject)}`,
          ),
      )
      .map((a) => ({
        ...a,
        teacher_name: teacherNameById.get(a.teacher_id) || a.teacher_id,
      }));

    return { toAdd, stale };
  }, [decoded.byClass, teacherAssignments, teacherNameById]);

  const hasData = rawCells.length > 0;

  // ===== Template download: grid kosong, kolom = semua kelas aktif =====
  const handleDownloadTemplate = async () => {
    if (classes.length === 0) {
      setError("Belum ada data kelas untuk tahun ajaran aktif.");
      return;
    }
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Jadwal Kode", {
      views: [{ state: "frozen", ySplit: 5, xSplit: 4 }],
    });

    const classCols = classes.map((c) => c.id);
    ws.columns = [
      { width: 9 },
      { width: 8 },
      { width: 10 },
      { width: 11 },
      ...classCols.map(() => ({ width: 8 })),
    ];

    const lastColLetter = XLSX.utils.encode_col(3 + classCols.length);
    ws.mergeCells(`A1:${lastColLetter}1`);
    const title = ws.getCell("A1");
    title.value = `TEMPLATE JADWAL PELAJARAN (KODE) — TAHUN AJARAN ${academicYear}`;
    title.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
    title.alignment = { vertical: "middle", horizontal: "center" };
    title.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1D4ED8" },
    };
    ws.getRow(1).height = 24;

    ws.mergeCells(`A2:${lastColLetter}3`);
    const info = ws.getCell("A2");
    info.value =
      "PETUNJUK: Isi kolom kelas (7A, 7B, dst) dengan KODE GURU sesuai PDF jadwal dari WKS. Kurikulum, " +
      "di baris Hari + Jam Ke yang sesuai. Kolom Hari/Jam Ke/Jam Mulai/Jam Selesai JANGAN diubah. " +
      "Sel yang gak ada pelajarannya (kosong) biarin kosong. Simpan, lalu upload lewat tombol Import.";
    info.font = { italic: true, size: 10, color: { argb: "FF78716C" } };
    info.alignment = { wrapText: true, vertical: "middle" };
    ws.getRow(2).height = 34;
    ws.getRow(3).height = 34;

    const header = ws.getRow(5);
    header.values = [
      "Hari",
      "Jam Ke",
      "Jam Mulai",
      "Jam Selesai",
      ...classCols,
    ];
    header.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2563EB" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    header.height = 20;

    const dayColors = {
      Senin: "FFDCEEFF",
      Selasa: "FFFFE4EC",
      Rabu: "FFE3F9E8",
      Kamis: "FFFFF3D1",
      Jumat: "FFEDE3FF",
    };
    let rowIdx = 6;
    DAYS.forEach((day) => {
      const periods = getAvailablePeriods(day);
      const bandColor = dayColors[day] || "FFF1F5F9";
      periods.forEach((period) => {
        const range = JAM_SCHEDULE[day][period];
        const row = ws.getRow(rowIdx);
        row.values = [day, period, range.start, range.end];
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: bandColor },
          };
          cell.alignment = {
            vertical: "middle",
            horizontal: colNumber <= 4 ? "center" : "left",
          };
        });
        rowIdx++;
      });
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Template_Jadwal_Kode_${academicYear.replace("/", "-")}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Export hasil decode (preview) ke Excel -- BUKAN buat di-upload lagi
  // (formatnya beda dari Template Kode), murni buat arsip/print/dikirim
  // ke Walikelas atau guru buat validasi manual sebelum publish resmi.
  // Cuma kelas yang lagi dicentang buat publish yang di-export, biar
  // filenya nyambung sama apa yang bakal beneran ke-publish.
  const handleExportPreview = async () => {
    const classIdsToExport = sortedClassIds.filter((id) =>
      selectedClassIds.has(id),
    );
    if (classIdsToExport.length === 0) {
      setError(
        "Gak ada kelas yang dicentang buat di-export. Centang minimal 1 kelas di preview.",
      );
      return;
    }

    const wb = new ExcelJS.Workbook();
    const lastColLetter = XLSX.utils.encode_col(DAYS.length); // 1 kolom "Jam" + n kolom hari

    classIdsToExport.forEach((classId) => {
      const items = decoded.byClass[classId] || [];
      const cellMap = new Map();
      items.forEach((it) => cellMap.set(`${it.day}|${it.period}`, it));
      const periods = Array.from(new Set(items.map((it) => it.period))).sort(
        (a, b) => Number(a) - Number(b),
      );

      // Nama sheet Excel maksimal 31 karakter & gak boleh ada karakter
      // \/*?:[] -- class_id kita (mis. "7A") udah pasti aman, tapi tetep
      // di-guard jaga-jaga format id kelas berubah di masa depan.
      const sheetName = String(classId)
        .slice(0, 31)
        .replace(/[\\/*?:[\]]/g, "-");
      const ws = wb.addWorksheet(sheetName);

      ws.columns = [{ width: 7 }, ...DAYS.map(() => ({ width: 26 }))];

      // Baris 1-3: kop sekolah. Nama kelas & tahun ajaran diambil dari
      // data yang lagi kepake di halaman ini (classId dari tabel classes,
      // academicYear dari academic_years) -- bukan hardcode.
      ws.mergeCells(`A1:${lastColLetter}1`);
      const schoolCell = ws.getCell("A1");
      schoolCell.value = "SMP MUSLIMIN CILILIN";
      schoolCell.font = { bold: true, size: 18, color: { argb: "FF111827" } };
      schoolCell.alignment = { vertical: "middle", horizontal: "center" };
      ws.getRow(1).height = 26;

      ws.mergeCells(`A2:${lastColLetter}2`);
      const classCell = ws.getCell("A2");
      classCell.value = `JADWAL PELAJARAN KELAS ${classId}`;
      classCell.font = { bold: true, size: 14, color: { argb: "FF1D4ED8" } };
      classCell.alignment = { vertical: "middle", horizontal: "center" };
      ws.getRow(2).height = 22;

      ws.mergeCells(`A3:${lastColLetter}3`);
      const yearCell = ws.getCell("A3");
      yearCell.value = `TAHUN AJARAN ${academicYear}`;
      yearCell.font = { bold: true, size: 12, color: { argb: "FF6B7280" } };
      yearCell.alignment = { vertical: "middle", horizontal: "center" };
      ws.getRow(3).height = 20;

      // Baris 4 sengaja dikosongin -- pemisah kop sekolah & tabel jadwal.

      // Baris 5: header tabel (Jam + tiap hari jadi kolom sendiri).
      const header = ws.getRow(5);
      header.values = ["Jam", ...DAYS];
      header.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        // fgColor DAN bgColor sengaja diisi warna yang sama -- pattern
        // "solid" di Excel kadang render pake bgColor (bukan fgColor
        // sesuai spec OOXML-nya), jadi kalau cuma fgColor yang diisi
        // hasilnya bisa keliatan putih/pudar, bukan biru solid.
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF2563EB" },
          bgColor: { argb: "FF2563EB" },
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });
      header.height = 20;

      // Warna border sengaja abu-abu yang cukup gelap (bukan nyaris-putih)
      // biar garis tabelnya keliatan pas dibuka di Excel.
      const thinBorder = { style: "thin", color: { argb: "FF94A3B8" } };

      let rowIdx = 6;
      periods.forEach((period) => {
        const row = ws.getRow(rowIdx);

        const jamCell = row.getCell(1);
        jamCell.value = period;
        jamCell.font = { bold: true };
        jamCell.alignment = { vertical: "middle", horizontal: "center" };
        jamCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
          bgColor: { argb: "FFF8FAFC" },
        };
        jamCell.border = {
          top: thinBorder,
          left: thinBorder,
          bottom: thinBorder,
          right: thinBorder,
        };

        DAYS.forEach((day, dayIdx) => {
          const cell = row.getCell(2 + dayIdx);
          const item = cellMap.get(`${day}|${period}`);

          if (item) {
            // Satu sel isinya 3 baris (Mapel / Guru / Waktu) pake richText
            // biar tiap baris bisa beda gaya, mirip tampilan card di
            // preview "Tabel Mingguan" -- Mapel tebal, Guru abu-abu,
            // Waktu biru.
            cell.value = {
              richText: [
                { font: { bold: true, size: 11 }, text: `${item.subject}\n` },
                {
                  font: { size: 9, color: { argb: "FF6B7280" } },
                  text: `${item.teacher_name || "-"}\n`,
                },
                {
                  font: { size: 9, bold: true, color: { argb: "FF2563EB" } },
                  text: `${item.start}–${item.end}`,
                },
              ],
            };
            cell.alignment = {
              wrapText: true,
              vertical: "middle",
              horizontal: "left",
            };
            const fillColor = item.mismatch ? "FFFED7AA" : "FFFFFFFF";
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: fillColor },
              bgColor: { argb: fillColor },
            };
          } else {
            cell.value = "–";
            cell.font = { color: { argb: "FFD1D5DB" } };
            cell.alignment = { vertical: "middle", horizontal: "center" };
          }
          cell.border = {
            top: thinBorder,
            left: thinBorder,
            bottom: thinBorder,
            right: thinBorder,
          };
        });

        row.height = 55;
        rowIdx++;
      });

      if (periods.length === 0) {
        ws.mergeCells(`A6:${lastColLetter}6`);
        const emptyCell = ws.getCell("A6");
        emptyCell.value = "Belum ada jadwal ter-decode buat kelas ini.";
        emptyCell.font = { italic: true, color: { argb: "FF9CA3AF" } };
        emptyCell.alignment = { vertical: "middle", horizontal: "center" };
      }

      // Catatan kaki: 1 baris kosong buat jarak dari tabel, lalu baris
      // catatan istirahat & aturan khusus hari Jumat. Isinya statis
      // (jam istirahat gak diambil dari data karena bukan bagian dari
      // JAM_SCHEDULE / hasil decode) -- kalau jamnya berubah di masa
      // depan, tinggal update teks di sini.
      let noteRowIdx = rowIdx + 1;
      const noteLines = [
        "Catatan:",
        "1. Istirahat ke 1 (09.40 - 10.30)",
        "    Istirahat ke 2 (12.15 - 13.00)",
        "2. Khusus untuk Hari Jumat :",
        "    Masuk Jam 06.30 (1 jam pelajarannya 30 Menit)",
        "    Istirahat setelah Jam ke 5 (09.10-09.40), Pulang Jam 10.40",
      ];
      noteLines.forEach((line, i) => {
        ws.mergeCells(`A${noteRowIdx}:${lastColLetter}${noteRowIdx}`);
        const noteCell = ws.getCell(`A${noteRowIdx}`);
        noteCell.value = line;
        noteCell.font = {
          bold: i === 0,
          size: 10,
          color: { argb: "FF374151" },
        };
        noteCell.alignment = { vertical: "middle", horizontal: "left" };
        ws.getRow(noteRowIdx).height = 16;
        noteRowIdx++;
      });
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Preview_Jadwal_${academicYear.replace("/", "-")}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    if (importing) return;
    fileInputRef.current?.click();
  };

  // Baca file -> rawCells (MENTAH, belum ditranslate). Validasi cuma di
  // level struktur (header ketemu, hari/jam valid) — validasi "kode ada
  // di master apa nggak" itu urusan `decoded`, ditampilin di preview.
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

      let headerRowIdx = -1;
      let colMap = {};
      for (let i = 0; i < raw.length; i++) {
        const rowLabels = raw[i].map((v) => String(v).trim());
        if (rowLabels.includes("Hari") && rowLabels.includes("Jam Ke")) {
          headerRowIdx = i;
          rowLabels.forEach((label, colIdx) => {
            if (label) colMap[label] = colIdx;
          });
          break;
        }
      }
      if (headerRowIdx === -1) {
        setError(
          "Format file gak dikenali: kolom header (Hari, Jam Ke, dst) gak ketemu. Pakai file hasil Download Template.",
        );
        return;
      }

      const knownClassIds = new Set(classes.map((c) => c.id));
      const classColumns = Object.entries(colMap).filter(([label]) =>
        knownClassIds.has(label),
      );
      const unknownColumns = Object.keys(colMap).filter(
        (label) =>
          !["Hari", "Jam Ke", "Jam Mulai", "Jam Selesai"].includes(label) &&
          !knownClassIds.has(label),
      );

      if (classColumns.length === 0) {
        setError(
          "Gak ada kolom kelas yang cocok sama data kelas aktif di sistem. Pastikan header kolom (7A, 7B, dst) gak diubah.",
        );
        return;
      }

      const cells = [];
      const structErrors = [];
      raw.slice(headerRowIdx + 1).forEach((row, i) => {
        const excelRowNumber = headerRowIdx + 2 + i + 1;
        const day = String(row[colMap["Hari"]] ?? "").trim();
        const period = String(row[colMap["Jam Ke"]] ?? "").trim();
        if (!day && !period) return;

        if (!DAYS.includes(day)) {
          structErrors.push(
            `Baris ${excelRowNumber}: hari "${day}" tidak dikenali`,
          );
          return;
        }
        if (!JAM_SCHEDULE[day]?.[period]?.start) {
          structErrors.push(
            `Baris ${excelRowNumber}: jam ke "${period}" tidak valid untuk ${day}`,
          );
          return;
        }

        classColumns.forEach(([classId, colIdx]) => {
          const code = String(row[colIdx] ?? "").trim();
          if (!code) return;
          cells.push({ class_id: classId, day, period, code });
        });
      });

      if (structErrors.length > 0) {
        setError(
          `Import dibatalkan, ada ${structErrors.length} baris bermasalah:\n` +
            structErrors.slice(0, 6).join("\n") +
            (structErrors.length > 6
              ? `\n...dan ${structErrors.length - 6} lagi`
              : ""),
        );
        return;
      }

      // ✅ FIX: file Excel sumbernya kadang punya baris DUPLIKAT (mis. 2
      // baris sama-sama "Jumat, Jam Ke 3" gara-gara copy-paste gak
      // sengaja). Kalau dibiarin, tiap baris duplikat generate `cells`
      // yang identik buat semua kelas di baris itu -- nembus jadi row
      // duplikat di teacher_schedules pas publish, meskipun logic
      // delete+insert publish-nya sendiri udah bener. Dedup di sini,
      // SEBELUM disimpan ke rawCells, berdasarkan (class_id, day,
      // period). Kalau kode-nya BEDA antar duplikat (bukan cuma
      // baris kembar biasa), itu tandanya ada salah ketik di file --
      // block import & suruh admin benerin file-nya dulu.
      const dedupMap = new Map();
      const conflictRows = [];
      cells.forEach((cell) => {
        const key = `${cell.class_id}|${cell.day}|${cell.period}`;
        const existing = dedupMap.get(key);
        if (!existing) {
          dedupMap.set(key, cell);
        } else if (existing.code !== cell.code) {
          conflictRows.push(
            `Kelas ${cell.class_id}, ${cell.day} jam ke-${cell.period}: kode "${existing.code}" vs "${cell.code}"`,
          );
        }
        // kalau kodenya sama persis, diem-diem di-skip (duplikat aman)
      });

      if (conflictRows.length > 0) {
        setError(
          `Import dibatalkan, ada ${conflictRows.length} baris duplikat dengan kode BEDA di file (kemungkinan salah ketik):\n` +
            conflictRows.slice(0, 6).join("\n") +
            (conflictRows.length > 6
              ? `\n...dan ${conflictRows.length - 6} lagi`
              : "") +
            "\nBenerin dulu file Excel-nya (hapus baris duplikat/salah satu kodenya), baru import ulang.",
        );
        return;
      }

      const dedupedCells = Array.from(dedupMap.values());
      const duplicateCount = cells.length - dedupedCells.length;

      if (dedupedCells.length === 0) {
        setError(
          "Tidak ada kode yang bisa dibaca dari file ini (semua sel kelas kosong).",
        );
        return;
      }

      setImporting(true);
      setRawCells(dedupedCells);
      if (duplicateCount > 0) {
        setSuccess(
          `File berhasil dibaca. ${duplicateCount} baris duplikat (kode sama persis) otomatis digabung jadi 1.`,
        );
      }
      setSourceFileName(file.name);
      if (unknownColumns.length > 0) {
        setSuccess(
          `File dibaca: ${cells.length} sel terisi dari ${classColumns.length} kelas. ` +
            `Kolom diabaikan (gak dikenali): ${unknownColumns.join(", ")}`,
        );
      } else {
        setSuccess(
          `File dibaca: ${cells.length} sel terisi dari ${classColumns.length} kelas. Cek preview di bawah.`,
        );
      }
    } catch (err) {
      setError("Gagal membaca file: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  const openQuickMap = (code) => {
    setQuickMapCode(code);
    setQuickMapForm({ teacher_name: "", subject: "" });
  };

  const handleQuickMapSubmit = async (e) => {
    e.preventDefault();
    const teacher_name = quickMapForm.teacher_name.trim();
    const subject = quickMapForm.subject.trim();
    if (!teacher_name || !subject) {
      setError("Nama Guru dan Mapel wajib diisi");
      return;
    }
    setQuickMapSaving(true);
    setError(null);
    try {
      const { error: err } = await supabase.from("teacher_codes").insert({
        academic_year: academicYear,
        code: quickMapCode,
        teacher_name,
        subject,
      });
      if (err) {
        if (err.code === "23505")
          throw new Error(`Kode "${quickMapCode}" sudah ada di master`);
        throw err;
      }
      setTeacherCodes((prev) => [
        ...prev,
        { code: quickMapCode, teacher_name, subject },
      ]);
      setQuickMapCode(null);
      setSuccess(`Kode "${quickMapCode}" berhasil dipetakan`);
    } catch (err) {
      setError("Gagal menyimpan pemetaan: " + err.message);
    } finally {
      setQuickMapSaving(false);
    }
  };

  const handlePublish = () => {
    if (decoded.errors.length > 0) return;
    // Cuma kelas yang dicentang admin di preview yang diproses -- kelas
    // yang ada di file tapi di-uncheck (mis. karena jadwal manualnya
    // udah bener & gak mau ketimpa) dilewatin sama sekali, gak disentuh.
    const classIds = Object.keys(decoded.byClass).filter((id) =>
      selectedClassIds.has(id),
    );
    if (classIds.length === 0) return;

    // Bukan langsung publish -- buka modal konfirmasi custom dulu (lihat
    // render modal di bawah, deket modal quick-map). Eksekusi beneran
    // ada di `runPublish`, dipanggil pas admin klik tombol konfirmasi.
    setPendingPublishClassIds(classIds);
    setConfirmPublishOpen(true);
  };

  const runPublish = async () => {
    // ✅ FIX: guard dobel-eksekusi. `disabled={publishing}` di tombol
    // udah nutup celah utama (klik dobel manusia), tapi state React
    // baru re-render abis event loop giliran berikutnya -- kalau ada
    // trigger lain yang manggil runPublish() sebelum re-render kejadian,
    // guard ini yang nahan biar delete+insert ga pernah jalan 2x
    // bersamaan (itu penyebab data teacher_schedules dobel).
    if (publishing) return;
    const classIds = pendingPublishClassIds;
    setConfirmPublishOpen(false);
    setPublishing(true);
    setError(null);
    try {
      const { error: delErr } = await supabase
        .from("class_schedules")
        .delete()
        .in("class_id", classIds);
      if (delErr) throw delErr;

      const rows = [];
      classIds.forEach((classId) => {
        decoded.byClass[classId].forEach((item) => {
          rows.push({
            class_id: classId,
            day: item.day,
            subject: item.subject,
            teacher_name: item.teacher_name,
            start_time: `${item.start}:00`,
            end_time: `${item.end}:00`,
          });
        });
      });

      const { error: insErr } = await supabase
        .from("class_schedules")
        .insert(rows);
      if (insErr) throw insErr;

      // ===== AUTO-SYNC teacher_assignments =====
      // Sebelumnya admin isi teacher_assignments manual (Excel/form terpisah)
      // padahal datanya sebenernya udah ada di sini: hasil decode jadwal ini
      // JUGA ngasih tau siapa ngajar apa di kelas mana. Jadi begitu jadwal
      // dipublish, kombinasi (guru, kelas, mapel) yang ketemu langsung
      // disinkronin ke teacher_assignments -- gak perlu isi 2x.
      //
      // Prinsip aman:
      // - Cuma INSERT kombinasi yang belum ada (gak pernah overwrite/replace
      //   assignment lama, beda sama class_schedules yang di-delete+insert).
      // - Kombinasi lama yang gak ketemu lagi di batch ini TIDAK dihapus
      //   otomatis (assignment bisa nempel histori jurnal_harian) -- cuma
      //   dilaporkan biar admin cek manual lewat menu Penugasan Guru.
      // - Kode tanpa teacher_id di Master Kode Guru dilewatin (gak bisa
      //   auto-assign kalau gak tau ini guru user yang mana).
      // - Gagal sync BUKAN alasan nge-fail-in publish jadwal yang udah
      //   sukses -- cukup kasih tau admin.
      let syncMessage = "";
      try {
        const { data: activeYearRow, error: ayErr } = await supabase
          .from("academic_years")
          .select("id, year, semester")
          .eq("is_active", true)
          .single();
        if (ayErr) throw ayErr;

        // Reuse `syncPreview` (yang juga dipake buat badge & kotak info di
        // preview) -- tinggal disaring ke kelas yang BENERAN dicentang buat
        // dipublish sekarang, biar angka di preview & yang beneran keinsert
        // gak pernah beda.
        const toInsert = syncPreview.toAdd
          .filter((r) => classIds.includes(r.class_id))
          .map((r) => ({
            teacher_id: r.teacher_id,
            class_id: r.class_id,
            subject: r.subject,
            academic_year: activeYearRow.year,
            academic_year_id: activeYearRow.id,
            semester: String(activeYearRow.semester),
          }));

        const staleAssignments = syncPreview.stale.filter((a) =>
          classIds.includes(a.class_id),
        );

        let syncedCount = 0;
        if (toInsert.length > 0) {
          const { error: syncErr } = await supabase
            .from("teacher_assignments")
            .insert(toInsert);
          if (syncErr) throw syncErr;
          syncedCount = toInsert.length;

          const { data: refreshed } = await supabase
            .from("teacher_assignments")
            .select("teacher_id, class_id, subject")
            .eq("academic_year", activeYearRow.year);
          setTeacherAssignments(refreshed || []);
        }

        syncMessage =
          ` Teacher_assignments: ${syncedCount} kombinasi baru otomatis ditambahin` +
          (staleAssignments.length > 0
            ? `, ${staleAssignments.length} kombinasi lama gak ketemu lagi di jadwal ini (cek manual di menu Penugasan Guru, gak di-auto-hapus).`
            : ".");
      } catch (syncError) {
        console.warn("Gagal auto-sync teacher_assignments:", syncError.message);
        syncMessage = ` TAPI gagal auto-sync ke teacher_assignments (${syncError.message}). Lengkapi manual lewat menu Penugasan Guru.`;
      }

      // ===== AUTO-SYNC teacher_schedules (Jadwal Mengajar guru) =====
      // Prinsip beda dari teacher_assignments (yang cuma nambah, gak
      // pernah hapus): di sini kita REPLACE, sama kayak class_schedules,
      // karena tujuannya jadwal guru selalu cerminan terbaru dari jadwal
      // massal ini. Tapi supaya gak nyenggol jadwal yang diisi MANUAL
      // sama guru (mis. buat kelas/kegiatan di luar jadwal massal), yang
      // di-delete+insert cuma baris dengan source='admin' -- baris
      // source='manual' punya guru gak pernah disentuh dari sini.
      let teacherScheduleMessage = "";
      try {
        const teacherRows = [];
        const unmatchedCodes = new Set();
        classIds.forEach((classId) => {
          decoded.byClass[classId].forEach((item) => {
            if (!item.teacher_id) {
              // Kode gak punya teacher_id (belum terhubung ke akun guru
              // manapun di Master Kode Guru) -- gak bisa disync, skip.
              return;
            }
            const userId = userIdByTeacherCode.get(item.teacher_id);
            if (!userId) {
              // teacher_id ada, tapi belum ada akun `users` yang
              // teacher_id-nya cocok -- kemungkinan guru itu belum
              // dibikinin akun login. Catat buat dilaporkan ke admin.
              unmatchedCodes.add(`${item.teacher_name} (${item.teacher_id})`);
              return;
            }
            teacherRows.push({
              teacher_id: userId,
              class_id: classId,
              day: item.day,
              start_time: `${item.start}:00`,
              end_time: `${item.end}:00`,
              subject: item.subject,
              source: "admin",
            });
          });
        });

        // ✅ FIX: sebelumnya cuma `.eq("source", "admin")` -- row lama
        // yang ditulis SEBELUM kolom `source` ini ada (source-nya NULL)
        // jadi ga pernah kehapus tiap kali publish ulang, numpuk terus
        // jadi row duplikat/overlap tiap kali sync ini jalan. Sekarang
        // disapu juga row yang source-nya NULL, tapi row 'manual' punya
        // guru tetap gak disentuh (aman, sesuai desain awal).
        const { error: delTsErr } = await supabase
          .from("teacher_schedules")
          .delete()
          .in("class_id", classIds)
          .or("source.eq.admin,source.is.null");
        if (delTsErr) throw delTsErr;

        if (teacherRows.length > 0) {
          const { error: insTsErr } = await supabase
            .from("teacher_schedules")
            .insert(teacherRows);
          if (insTsErr) throw insTsErr;
        }

        teacherScheduleMessage =
          ` Jadwal Mengajar guru: ${teacherRows.length} slot otomatis tersinkron.` +
          (unmatchedCodes.size > 0
            ? ` ${unmatchedCodes.size} guru belum punya akun login yang terhubung (${Array.from(unmatchedCodes).join(", ")}) -- jadwalnya gak masuk ke Jadwal Mengajar sampai akunnya dihubungkan lewat kolom teacher_id di data user.`
            : "");
      } catch (tsError) {
        console.warn("Gagal auto-sync teacher_schedules:", tsError.message);
        teacherScheduleMessage = ` TAPI gagal auto-sync ke Jadwal Mengajar guru (${tsError.message}).`;
      }

      setSuccess(
        `Berhasil publish ${rows.length} jadwal ke ${classIds.length} kelas. Wali kelas & portal siswa sudah terupdate.` +
          syncMessage +
          teacherScheduleMessage,
      );
      setPublishedAt(new Date());
    } catch (err) {
      setError("Gagal publish: " + err.message);
    } finally {
      setPublishing(false);
    }
  };

  const sortedClassIds = useMemo(
    () => Object.keys(decoded.byClass).sort(),
    [decoded.byClass],
  );

  // Kelas yang lagi ditampilin di mode "Tabel Mingguan". Kalau kelas yang
  // kesimpen di state udah gak ada lagi di file (mis. abis upload file
  // baru), fallback ke kelas pertama biar dropdown gak nampilin kelas
  // yang gak ada datanya.
  const activeGridClassId =
    gridClassId && sortedClassIds.includes(gridClassId)
      ? gridClassId
      : sortedClassIds[0] || "";

  const gridCellMap = useMemo(() => {
    const m = new Map();
    const items = activeGridClassId
      ? decoded.byClass[activeGridClassId] || []
      : [];
    items.forEach((it) => m.set(`${it.day}|${it.period}`, it));
    return m;
  }, [decoded, activeGridClassId]);

  const gridPeriods = useMemo(() => {
    const items = activeGridClassId
      ? decoded.byClass[activeGridClassId] || []
      : [];
    return Array.from(new Set(items.map((it) => it.period))).sort(
      (a, b) => Number(a) - Number(b),
    );
  }, [decoded, activeGridClassId]);

  const toggleClassSelection = (classId) => {
    setSelectedClassIds((prev) => {
      const next = new Set(prev);
      if (next.has(classId)) next.delete(classId);
      else next.add(classId);
      return next;
    });
  };

  const selectAllClasses = () => setSelectedClassIds(new Set(sortedClassIds));
  const deselectAllClasses = () => setSelectedClassIds(new Set());

  // Reset manual: bersihin preview yang lagi ditampilin (biasanya dipake
  // abis publish, kalau admin udah gak butuh lagi preview/export file
  // ini). Beda sama upload file baru -- ini gak butuh file, cuma balikin
  // state ke kondisi awal (belum ada data).
  const handleResetPreview = () => {
    setRawCells([]);
    setSourceFileName("");
    setPublishedAt(null);
  };

  return (
    <div className="w-full overflow-x-hidden">
      <div className="max-w-6xl mx-auto space-y-4 p-3 sm:p-4 md:p-6">
        <div>
          <h1 className="text-lg font-bold text-theme">
            Import Jadwal Pelajaran (Massal)
          </h1>
          <p className="text-xs text-theme-secondary mt-0.5">
            Tahun Ajaran {academicYear || "—"} · Olah PDF Dari Wakasek Kurikulum
            Jadi Jadwal Per Kelas, Lalu Publish Sekaligus Ke Semua Kelas.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm whitespace-pre-line">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {success}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Step 1 & 2: download template + upload */}
            <div className="bg-theme-bg rounded-2xl border border-gray-100 p-4 shadow-sm">
              <h2 className="text-sm font-bold text-theme-secondary mb-3">
                1. Download template, isi kode, lalu upload
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleImportFile}
                />
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-theme-bg border border-theme hover:border-theme text-theme-secondary rounded-xl text-sm font-semibold">
                  <Download className="w-4 h-4" />
                  Download Template ({classes.length} kelas)
                </button>
                <button
                  onClick={handleImportClick}
                  disabled={importing}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-semibold">
                  {importing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UploadCloud className="w-4 h-4" />
                  )}
                  {importing ? "Membaca..." : "Upload File Terisi"}
                </button>
                <button
                  onClick={handleExportPreview}
                  disabled={!hasData}
                  title={
                    hasData
                      ? "Export hasil decode (kelas yang dicentang) ke Excel"
                      : "Upload file dulu buat bisa export"
                  }
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-theme-bg border border-theme hover:border-theme text-theme-secondary rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
                  <FileSpreadsheet className="w-4 h-4" />
                  Export Preview
                </button>
                {hasData && (
                  <button
                    onClick={handleResetPreview}
                    title="Bersihin preview ini (tanpa upload ulang file)"
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-theme-bg border border-theme hover:border-theme text-theme-secondary rounded-xl text-sm font-semibold">
                    <X className="w-4 h-4" />
                    Mulai Baru
                  </button>
                )}
                {sourceFileName && (
                  <span className="text-xs text-gray-400">
                    File: {sourceFileName}
                  </span>
                )}
              </div>
            </div>

            {/* Step 2: publish -- sengaja ditaruh persis di bawah Step 1 dan
                dibikin sticky, biar tetep keliatan pas admin scroll ngecek
                preview yang panjang (banyak kelas / mode tabel mingguan).
                Aman ditaruh di atas karena tombolnya sendiri udah dikunci
                (disabled) selama masih ada kode error atau belum ada kelas
                yang dicentang -- jadi gak akan ke-klik asal sebelum preview
                beneran udah oke. */}
            {hasData && (
              <div className="sticky top-2 z-20 bg-theme-bg rounded-2xl border border-gray-100 p-4 shadow-md flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-bold text-theme-secondary">
                      2. Publish ke kelas terpilih
                    </h2>
                    {publishedAt && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[11px] font-semibold">
                        <CheckCircle className="w-3 h-3" />
                        Sudah dipublish{" "}
                        {publishedAt.toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-theme-secondary mt-0.5">
                    {publishedAt
                      ? 'Preview ini udah dipublish. Masih bisa Export Preview kapan aja -- klik "Mulai Baru" atau upload file lain kalau mau lanjut ke batch berikutnya.'
                      : decoded.errors.length > 0
                        ? "Selesaikan dulu semua kode yang belum dikenali di preview."
                        : selectedClassIds.size === 0
                          ? "Belum ada kelas yang dipilih. Centang minimal 1 kelas di preview."
                          : `Akan mengganti jadwal aktif untuk ${selectedClassIds.size} kelas (dari ${decoded.classCount} kelas di file).`}
                  </p>
                </div>
                <button
                  onClick={handlePublish}
                  disabled={
                    decoded.errors.length > 0 ||
                    publishing ||
                    selectedClassIds.size === 0 ||
                    !!publishedAt
                  }
                  title={
                    publishedAt
                      ? "Sudah dipublish. Upload file baru buat publish lagi."
                      : undefined
                  }
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-xl text-sm font-semibold">
                  {publishing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : publishedAt ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Rocket className="w-4 h-4" />
                  )}
                  {publishing
                    ? "Mempublish..."
                    : publishedAt
                      ? "Sudah Dipublish"
                      : `Publish ke ${selectedClassIds.size} Kelas`}
                </button>
              </div>
            )}

            {/* Step 3: preview */}
            {hasData && (
              <div className="bg-theme-bg rounded-2xl border border-gray-100 p-4 shadow-sm space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-sm font-bold text-theme-secondary">
                    3. Preview hasil decode
                  </h2>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-theme-secondary">
                      {decoded.totalCells} sel · {decoded.classCount} kelas
                    </span>
                    <span
                      className={
                        decoded.errors.length > 0
                          ? "text-red-600 font-semibold"
                          : "text-green-600 font-semibold"
                      }>
                      {decoded.errors.length > 0
                        ? `${decoded.errors.length} kode belum dikenali`
                        : "Semua kode dikenali ✓"}
                    </span>
                    {decoded.mismatches.length > 0 && (
                      <span className="text-orange-600 font-semibold">
                        {decoded.mismatches.length} kombinasi ganjil
                      </span>
                    )}
                    {syncPreview.toAdd.length > 0 && (
                      <span className="text-emerald-600 font-semibold">
                        +{syncPreview.toAdd.length} assignment baru
                      </span>
                    )}
                    {syncPreview.stale.length > 0 && (
                      <span className="text-slate-600 font-semibold">
                        {syncPreview.stale.length} assignment perlu dicek
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                  <p className="text-xs text-blue-800 font-medium">
                    {selectedClassIds.size} dari {sortedClassIds.length} kelas
                    dipilih buat di-publish. Uncheck kelas yang gak mau ketimpa
                    (mis. udah ada jadwal manual yang bener).
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={selectAllClasses}
                      className="text-xs font-semibold text-blue-700 hover:underline">
                      Pilih semua
                    </button>
                    <span className="text-blue-200">|</span>
                    <button
                      type="button"
                      onClick={deselectAllClasses}
                      className="text-xs font-semibold text-blue-700 hover:underline">
                      Batalkan semua
                    </button>
                  </div>
                </div>

                {decoded.mismatches.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-semibold text-orange-800">
                      Kode-kode ini dikenali di Master Kode Guru, tapi kombinasi
                      guru + mapel + kelasnya gak ketemu di data pengampu mapel
                      (teacher_assignments) -- coba cek lagi, siapa tau salah
                      ketik kode pas nyalin dari PDF WKS. Kurikulum. Ini cuma
                      peringatan, publish tetep bisa jalan.
                    </p>
                    <ul className="text-xs text-orange-700 space-y-0.5 list-disc list-inside">
                      {decoded.mismatches.map((m, idx) => (
                        <li key={idx}>
                          Kelas {m.class_id}, {m.day} jam ke-{m.period}: kode{" "}
                          <span className="font-mono font-bold">{m.code}</span>{" "}
                          &rarr; {m.teacher_name} ({m.subject})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {syncPreview.stale.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-semibold text-slate-700">
                      Kombinasi ini ADA di data pengampu mapel
                      (teacher_assignments), tapi gak ketemu lagi di file yang
                      barusan diupload -- kemungkinan guru itu udah gak ngajar
                      mapel/kelas ini lagi. Publish TIDAK akan menghapus ini
                      otomatis (assignment lama bisa nempel histori jurnal
                      harian) -- cek &amp; hapus manual lewat menu Penugasan
                      Guru kalau memang udah gak berlaku.
                    </p>
                    <ul className="text-xs text-slate-600 space-y-0.5 list-disc list-inside">
                      {syncPreview.stale.map((s, idx) => (
                        <li key={idx}>
                          Kelas {s.class_id}: {s.teacher_name} ({s.subject})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {decoded.errors.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-semibold text-amber-800">
                      Kode berikut belum ada di Master Kode Guru — petakan
                      langsung di sini, atau tambahkan lewat halaman Master Kode
                      Guru lalu upload ulang:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {decoded.errorCodes.map((code) => (
                        <button
                          key={code}
                          onClick={() => openQuickMap(code)}
                          className="px-2.5 py-1 bg-theme-bg border border-amber-300 text-amber-800 rounded-lg text-xs font-mono font-bold hover:bg-amber-100">
                          {code} ?
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <button
                    type="button"
                    onClick={() => setPreviewMode("grid")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      previewMode === "grid"
                        ? "bg-blue-600 text-white"
                        : "bg-theme-surface text-theme-secondary hover:bg-gray-200"
                    }`}>
                    Tabel Mingguan
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode("accordion")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      previewMode === "accordion"
                        ? "bg-blue-600 text-white"
                        : "bg-theme-surface text-theme-secondary hover:bg-gray-200"
                    }`}>
                    Per Kelas (semua kelas)
                  </button>
                </div>

                {/* Mode "Tabel Mingguan": satu kelas dilihat sekaligus, format
                    Jam x Hari kayak tampilan Kelola Jadwal Pelajaran punya
                    Walikelas -- lebih gampang buat ngecek "kerasa bener gak
                    jadwalnya" dibanding daftar per-hari. */}
                {previewMode === "grid" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="text-xs font-semibold text-theme-secondary">
                        Kelas:
                      </label>
                      <select
                        value={activeGridClassId}
                        onChange={(e) => setGridClassId(e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-theme bg-theme-bg text-sm font-semibold text-blue-700">
                        {sortedClassIds.map((id) => (
                          <option key={id} value={id}>
                            Kelas {id}
                          </option>
                        ))}
                      </select>
                      {activeGridClassId &&
                        !selectedClassIds.has(activeGridClassId) && (
                          <span className="text-[10px] font-normal text-gray-400">
                            (kelas ini gak dipublish)
                          </span>
                        )}
                    </div>

                    {gridPeriods.length === 0 ? (
                      <div className="text-center text-sm text-theme-secondary py-8">
                        Belum ada jadwal ter-decode buat kelas ini.
                      </div>
                    ) : (
                      <div className="bg-theme-bg rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-theme-secondary border-b border-gray-100">
                                <th className="py-2.5 px-3 font-semibold text-xs whitespace-nowrap">
                                  Jam
                                </th>
                                {DAYS.map((day) => (
                                  <th
                                    key={day}
                                    className="py-2.5 px-3 font-semibold text-xs whitespace-nowrap">
                                    {day}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {gridPeriods.map((period) => (
                                <tr
                                  key={period}
                                  className="border-b border-gray-50 last:border-0 align-top">
                                  <td className="py-3 px-3 font-semibold text-theme">
                                    {period}
                                  </td>
                                  {DAYS.map((day) => {
                                    const item = gridCellMap.get(
                                      `${day}|${period}`,
                                    );
                                    return (
                                      <td
                                        key={day}
                                        className="py-2.5 px-2.5 min-w-[150px]">
                                        {item ? (
                                          <div
                                            className={`rounded-lg px-2.5 py-1.5 ${
                                              item.mismatch
                                                ? "bg-orange-50"
                                                : "bg-theme-surface"
                                            }`}
                                            title={
                                              item.mismatch
                                                ? "Kombinasi guru+mapel+kelas gak ketemu di teacher_assignments"
                                                : undefined
                                            }>
                                            <p className="font-bold text-theme text-sm">
                                              {item.subject}
                                              {item.mismatch && (
                                                <span className="text-orange-500 ml-1">
                                                  ⚠
                                                </span>
                                              )}
                                            </p>
                                            <p className="text-xs text-theme-secondary mt-0.5">
                                              {item.teacher_name}
                                            </p>
                                            <p className="text-xs text-blue-600 font-semibold mt-0.5">
                                              {item.start}–{item.end}
                                            </p>
                                          </div>
                                        ) : (
                                          <span className="text-theme-secondary text-xs pl-2.5">
                                            –
                                          </span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Mode "Per Kelas": accordion lama, semua kelas dalam file
                    sekaligus keliatan (dikelompokin per hari), enak buat
                    scan cepet banyak kelas sebelum publish. */}
                {previewMode === "accordion" && (
                  <div className="space-y-3">
                    {sortedClassIds.map((classId) => {
                      const items = [...decoded.byClass[classId]].sort(
                        (a, b) => {
                          const dayDiff =
                            DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
                          if (dayDiff !== 0) return dayDiff;
                          return Number(a.period) - Number(b.period);
                        },
                      );
                      const isSelected = selectedClassIds.has(classId);
                      return (
                        <details
                          key={classId}
                          className={`border rounded-xl overflow-hidden ${
                            isSelected
                              ? "border-gray-100"
                              : "border-theme opacity-60"
                          }`}>
                          <summary className="cursor-pointer px-3 py-2 bg-theme-surface text-sm font-semibold text-theme-secondary flex items-center justify-between">
                            <label
                              className="flex items-center gap-2"
                              onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleClassSelection(classId)}
                                className="w-4 h-4 rounded border-theme accent-blue-600"
                              />
                              <span>
                                Kelas {classId}
                                {!isSelected && (
                                  <span className="ml-1.5 text-[10px] font-normal text-gray-400">
                                    (gak dipublish)
                                  </span>
                                )}
                              </span>
                            </label>
                            <span className="text-xs text-gray-400 font-normal">
                              {items.length} jam pelajaran
                            </span>
                          </summary>
                          <div className="p-3 space-y-3 bg-theme-bg">
                            {DAYS.filter((day) =>
                              items.some((it) => it.day === day),
                            ).map((day) => {
                              const dayItems = items
                                .filter((it) => it.day === day)
                                .sort(
                                  (a, b) => Number(a.period) - Number(b.period),
                                );
                              return (
                                <div
                                  key={day}
                                  className="rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                                  <div
                                    className={`px-3 py-1.5 text-xs font-bold tracking-wide ${
                                      DAY_BADGE_COLORS[day] ||
                                      "bg-gray-50 text-gray-600"
                                    }`}>
                                    {day}
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="text-left text-theme-secondary border-b border-gray-100">
                                          <th className="py-2 px-3 font-semibold text-xs whitespace-nowrap">
                                            Jam Ke
                                          </th>
                                          <th className="py-2 px-3 font-semibold text-xs whitespace-nowrap">
                                            Waktu
                                          </th>
                                          <th className="py-2 px-3 font-semibold text-xs">
                                            Mapel
                                          </th>
                                          <th className="py-2 px-3 font-semibold text-xs">
                                            Guru
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {dayItems.map((item, idx) => (
                                          <tr
                                            key={idx}
                                            className={`border-b border-gray-50 last:border-0 ${
                                              item.mismatch
                                                ? "bg-orange-50"
                                                : ""
                                            }`}
                                            title={
                                              item.mismatch
                                                ? "Kombinasi guru+mapel+kelas gak ketemu di teacher_assignments"
                                                : undefined
                                            }>
                                            <td className="py-2 px-3 font-semibold text-theme">
                                              {item.period}
                                            </td>
                                            <td className="py-2 px-3 font-semibold text-blue-600 whitespace-nowrap">
                                              {item.start}–{item.end}
                                            </td>
                                            <td className="py-2 px-3 font-semibold text-theme">
                                              {item.subject}
                                              {item.mismatch && (
                                                <span className="text-orange-500 ml-1">
                                                  ⚠
                                                </span>
                                              )}
                                            </td>
                                            <td className="py-2 px-3 font-semibold text-blue-600">
                                              {item.teacher_name}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </details>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Modal konfirmasi Publish -- custom (bukan window.confirm), lebih
            gede & ada warna biar admin gak asal klik OK tanpa baca. */}
        {confirmPublishOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-theme-bg rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
              {/* Header gradient mencolok */}
              <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 px-6 py-5 flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/25 flex items-center justify-center shrink-0">
                  <Rocket className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white leading-tight">
                    Konfirmasi Publish Jadwal
                  </h2>
                  <p className="text-sm text-orange-50">
                    File: {sourceFileName}
                  </p>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 rounded-2xl p-4">
                  <p className="text-base font-semibold text-orange-800 dark:text-orange-300">
                    Ini akan MENGGANTI jadwal aktif untuk{" "}
                    {pendingPublishClassIds.length} kelas:
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {pendingPublishClassIds.map((id) => (
                      <span
                        key={id}
                        className="px-2.5 py-1 rounded-lg bg-orange-200/70 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300 text-sm font-semibold">
                        {id}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="text-sm font-semibold text-theme-secondary uppercase tracking-wide">
                  2 hal yang bakal langsung keupdate:
                </p>

                <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-2xl p-4">
                  <ClipboardList className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-base font-bold text-blue-800 dark:text-blue-300">
                      Jadwal Kelas
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mt-0.5">
                      Wali kelas & portal siswa langsung liat perubahan ini,
                      real-time.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 rounded-2xl p-4">
                  <Users className="w-6 h-6 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-base font-bold text-purple-800 dark:text-purple-300">
                      Penugasan Guru (teacher_assignments)
                    </p>
                    <p className="text-sm text-purple-700 dark:text-purple-400 mt-0.5">
                      Kombinasi guru + kelas + mapel baru otomatis ditambahin --
                      gak perlu isi manual lagi.
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 px-6 pb-6">
                <button
                  onClick={() => setConfirmPublishOpen(false)}
                  className="flex-1 px-4 py-3 rounded-2xl text-base font-semibold text-theme-secondary bg-theme-surface hover:bg-gray-200">
                  Batal
                </button>
                <button
                  onClick={runPublish}
                  disabled={publishing}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-base font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:from-orange-300 disabled:to-amber-300 disabled:cursor-not-allowed shadow-lg shadow-orange-500/30">
                  {publishing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-5 h-5" />
                      Ya, Publish Sekarang
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal quick-map kode error */}
        {quickMapCode && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-theme-bg rounded-2xl shadow-xl w-full max-w-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-theme">
                  Petakan kode "{quickMapCode}"
                </h2>
                <button
                  onClick={() => setQuickMapCode(null)}
                  className="text-gray-400 hover:text-theme-secondary">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleQuickMapSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-theme-secondary mb-1.5">
                    Nama Guru
                  </label>
                  <input
                    value={quickMapForm.teacher_name}
                    onChange={(e) =>
                      setQuickMapForm({
                        ...quickMapForm,
                        teacher_name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-theme-bg text-theme border border-theme rounded-xl text-sm"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-theme-secondary mb-1.5">
                    Mapel
                  </label>
                  <input
                    value={quickMapForm.subject}
                    onChange={(e) =>
                      setQuickMapForm({
                        ...quickMapForm,
                        subject: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-theme-bg text-theme border border-theme rounded-xl text-sm"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setQuickMapCode(null)}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-theme-secondary bg-theme-surface hover:bg-gray-200">
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={quickMapSaving}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300">
                    {quickMapSaving ? "Menyimpan..." : "Simpan & Decode Ulang"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
