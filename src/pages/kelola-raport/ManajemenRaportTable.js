// setting/kelola-raport/ManajemenRaportTable.js
// Dipanggil sebagai sub-tab dari RaportNilaiTab.js (tab "Manajemen Nilai"
// di menu "Nilai Raport"), bukan halaman berdiri sendiri.
// Tiga view lokal (state "view"): "list" (fetch dari tabel student_reports,
// filter lewat SemesterFilterBar dari RaportShared.js), "detail" (komponen
// internal <DetailRaportSiswa> di bawah, muncul pas admin klik satu baris,
// buat edit nilai raport yang UDAH ADA), dan "manual" (komponen internal
// <TambahManualForm> di bawah, buat bikin raport BARU dari nol tanpa
// upload file apapun -- lihat komen di TambahManualForm soal kenapa ini
// ditambahin & bedanya sama jalur Import Excel di ImportRaportForm.js).
//
// Fetch pakai nested select `student_report_grades(subject, score)` --
// ini jalan otomatis karena foreign key report_id di student_report_grades
// (lihat supabase/migrations/..._create_nilai_raport.sql). Filter masih
// dieksekusi di query builder Supabase langsung (bukan di client), jadi
// aman walau datanya udah banyak.
//
// Publish massal: checkbox per baris + "Pilih Semua" di header tabel, lalu
// action bar (jumlah terpilih + tombol Hapus/Draft/Publish) muncul DI ATAS,
// nempel persis di bawah filter bar -- sebelumnya publish cuma bisa 1-1
// lewat DetailRaportSiswa (tombolnya di bawah tiap halaman detail, jadi
// harus buka & scroll satu-satu kalau mau publish banyak siswa sekaligus).
// Publish 1 siswa dari halaman detail (handleTogglePublish) TETAP ada dan
// gak berubah -- ini cuma nambahin jalur pintas buat publish banyak
// sekaligus dari halaman list.
//
// Hapus raport: dibutuhin buat beresin kasus salah import -- mis. NIS di
// file semester 2 formatnya beda sama semester 1 (satu "3137255819", satu
// lagi "25.26.07.203") sehingga sistem nganggep itu 2 siswa beda dan
// ke-import DOBEL, padahal orangnya sama. Bisa dihapus satu-satu (icon
// tempat sampah per baris) atau massal (tombol "Hapus Terpilih" di action
// bar), TERMASUK yang statusnya udah "published" (dikasih warning ekstra
// di konfirmasinya). Lihat juga pre-check di ImportRaportForm.js
// (handleSimpan) yang nyoba nyegah kasus kayak gini kejadian lagi dari
// awal, bukan cuma beresin setelah kejadian.
//
// FILE INI GABUNGAN DARI 2 FILE SEBELUMNYA (refactor -- DetailRaportSiswa.js
// cuma dipakai di sini doang, jadi dijadikan komponen internal
// <DetailRaportSiswa> di bawah, bukan file terpisah lagi).

import React, { useCallback, useEffect, useState } from "react";
import {
  ListChecks,
  Loader2,
  ChevronRight,
  Check,
  Trash2,
  Link2,
  ArrowLeft,
  Save,
  Globe,
  FileEdit,
  X,
  UserPlus,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import {
  SemesterFilterBar,
  StatusBadge,
  RaportTable,
  useAcademicYears,
  useReportedClasses,
} from "./RaportShared";

// Sama persis kayak yang dipake di StudentRaport.js & ImportRaportForm.js --
// SENGAJA didup, bukan di-share dari util bersama (repo ini belum punya
// folder util bersama). Kalau nambah kasus format NIS baru, benerin di
// TIGA tempat ini.
function normalizeNis(nis) {
  return (nis || "").replace(/\D/g, "");
}

function nisVariants(nis) {
  const raw = (nis || "").trim();
  if (!raw) return [];
  const digitsOnly = normalizeNis(raw);
  const variants = new Set([raw]);
  if (digitsOnly) variants.add(digitsOnly);
  if (digitsOnly.length === 9) {
    variants.add(
      `${digitsOnly.slice(0, 2)}.${digitsOnly.slice(2, 4)}.${digitsOnly.slice(4, 6)}.${digitsOnly.slice(6, 9)}`
    );
  }
  return Array.from(variants);
}

// ============================================================
// DetailRaportSiswa (sebelumnya DetailRaportSiswa.js)
// Ditampilin pas admin klik satu baris di list (view === "detail").
// Nampilin detail satu raport (bukan hasil extract mentah kayak
// PreviewImportTable di ImportRaportForm.js, ini data yang UDAH tersimpan
// di database) -- bisa edit nilai lewat RaportTable, dan toggle status
// Draft <-> Published lewat StatusBadge + tombol publish.
//
// onSave & onTogglePublish dikasih dari ManajemenRaportTable (handleSaveGrades
// & handleTogglePublish di bawah) dan udah nyambung ke Supabase beneran
// (update student_report_grades / student_reports) -- komponen ini sendiri
// ga tau soal Supabase, cuma manggil prop & nunggu hasilnya.
//
// Dokumentasi terkait bag. 7: status Draft belum bisa dilihat siswa di
// Portal Siswa, status Published baru muncul di sana.
//
// siswa shape: { id, name, nis, kelas, tahunAjaran, semester, status: "draft"|"published", grades: [{subject, score}] }
// ============================================================

const DetailRaportSiswa = ({ siswa, onBack, onSave, onTogglePublish }) => {
  const [grades, setGrades] = useState(siswa?.grades || []);
  const [isDirty, setIsDirty] = useState(false);

  if (!siswa) return null;

  const handleChangeScore = (subject, newScore) => {
    setGrades((prev) => prev.map((g) => (g.subject === subject ? { ...g, score: newScore } : g)));
    setIsDirty(true);
  };

  const handleSave = async () => {
    const success = await onSave?.(siswa.id, grades);
    if (success) setIsDirty(false);
    // Toast sukses/gagal udah ditangani parent (ManajemenRaportTable),
    // biar single source of truth soal hasil save yang sebenernya.
  };

  const handleTogglePublish = () => {
    const next = siswa.status === "published" ? "draft" : "published";
    onTogglePublish?.(siswa.id, next);
  };

  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        <ArrowLeft size={16} />
        Kembali ke daftar
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{siswa.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {siswa.nis} · Kelas {siswa.kelas} · {siswa.tahunAjaran} · Semester {siswa.semester}
          </p>
        </div>
        <StatusBadge type="publish" status={siswa.status} />
      </div>

      <div className="border border-gray-100 dark:border-gray-700 rounded-xl p-4">
        <RaportTable grades={grades} editable onChangeScore={handleChangeScore} />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleSave}
          disabled={!isDirty}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors active:scale-95"
        >
          <Save size={16} />
          Simpan Perubahan
        </button>

        <button
          onClick={handleTogglePublish}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors active:scale-95"
        >
          {siswa.status === "published" ? (
            <>
              <FileEdit size={16} />
              Set ke Draft
            </>
          ) : (
            <>
              <Globe size={16} />
              Publish
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// ============================================================
// TambahManualForm
// Ditampilin pas admin klik "+ Tambah Manual" di halaman list (view ===
// "manual"). Beda sama DetailRaportSiswa di atas (yang edit raport YANG
// UDAH ADA) -- ini bikin 1 baris student_reports BARU dari nol, tanpa
// upload file apapun. Ditambahin gara2 jalur Import PDF di
// ImportRaportForm.js dicabut (Excel leger jauh lebih akurat & gampang),
// jadi butuh jalan pintas buat kasus 1-2 siswa yang datanya gak ada di
// leger sama sekali (mis. siswa pindahan, atau leger aslinya ilang/rusak)
// -- gak masuk akal nyuruh admin bikin 1 file Excel cuma buat 1 siswa.
//
// NIS: admin bisa klik "Cari" buat coba cocokin ke tabel `students` (pake
// normalizeNis/nisVariants yang sama kayak ImportRaportForm.js/handleSimpan
// -- lihat komen di situ soal NISN vs NIS lokal), biar student_id kesambung
// dari awal (raport-nya langsung muncul di Portal Siswa begitu dipublish,
// gak perlu "Coba Hubungkan" belakangan). Kalau gak ketemu, admin tetap
// bisa lanjut isi manual (student_id bakal null, sama kayak siswa yang
// gak ketemu pas import -- bisa disambungkan belakangan dari halaman
// list).
//
// Daftar mapel: PRE-FILL dari `existingSubjects` (mata pelajaran unik yang
// udah pernah ada di student_report_grades, dikirim dari parent -- lihat
// fetchExistingSubjects di ManajemenRaportTable) biar admin ga perlu
// ngetik ulang nama mapel yang standar. Admin tetep bisa nambah/buang baris
// bebas (mis. mapel baru yang belum pernah ada di data manapun) -- struktur
// grades di sini SENGAJA sama persis kayak yang dipakai RaportTable
// (subject+score), gak ada validasi nama mapel harus cocok ke KKM atau
// resmi/tidaknya.
// ============================================================

const TambahManualForm = ({
  showToast,
  tahunAjaranOptions = [],
  loadingTahunAjaran,
  existingSubjects = [],
  onBatal,
  onSelesai,
}) => {
  const [nisInput, setNisInput] = useState("");
  const [isSearchingNis, setIsSearchingNis] = useState(false);
  const [matchedStudentId, setMatchedStudentId] = useState(null);
  const [nama, setNama] = useState("");
  const [kelas, setKelas] = useState("");
  const [tahunAjaran, setTahunAjaran] = useState("");
  const [semester, setSemester] = useState("");
  const [grades, setGrades] = useState(
    existingSubjects.length > 0
      ? existingSubjects.map((subj) => ({ subject: subj, score: null }))
      : [{ subject: "", score: null }]
  );
  const [isSaving, setIsSaving] = useState(false);

  // Ganti NIS manual -> match lama (kalau ada) kemungkinan besar udah gak
  // relevan, reset biar gak nyimpen student_id yang salah tanpa sadar.
  const handleChangeNis = (value) => {
    setNisInput(value);
    setMatchedStudentId(null);
  };

  const handleCariNis = async () => {
    if (!nisInput.trim()) return;
    setIsSearchingNis(true);
    try {
      const variants = nisVariants(nisInput);
      const { data, error } = await supabase
        .from("students")
        .select("id, nis, full_name")
        .in("nis", variants.length > 0 ? variants : [nisInput]);
      if (error) throw error;

      if ((data || []).length === 1) {
        const found = data[0];
        setMatchedStudentId(found.id);
        setNama(found.full_name || nama);
        showToast?.(`Ketemu: ${found.full_name} (NIS: ${found.nis})`, "success");
      } else if ((data || []).length > 1) {
        showToast?.(
          "Ketemu lebih dari 1 akun dengan NIS mirip -- isi nama secara manual, nanti bisa disambungkan lewat 'Coba Hubungkan' di daftar.",
          "warning"
        );
      } else {
        showToast?.(
          "NIS gak ketemu di data siswa. Tetap bisa lanjut isi manual (nanti disambungkan belakangan lewat 'Coba Hubungkan').",
          "warning"
        );
      }
    } catch (err) {
      console.error(err);
      showToast?.("Gagal mencari NIS", "error");
    } finally {
      setIsSearchingNis(false);
    }
  };

  const handleChangeScore = (subject, newScore) => {
    setGrades((prev) => prev.map((g) => (g.subject === subject ? { ...g, score: newScore } : g)));
  };

  const handleChangeSubjectName = (index, newName) => {
    setGrades((prev) => prev.map((g, i) => (i === index ? { ...g, subject: newName } : g)));
  };

  const handleTambahBarisMapel = () => {
    setGrades((prev) => [...prev, { subject: "", score: null }]);
  };

  const handleHapusBarisMapel = (index) => {
    setGrades((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSimpan = async () => {
    if (!nama.trim() || !tahunAjaran || !semester) {
      showToast?.("Lengkapi nama siswa, tahun ajaran, dan semester dulu", "error");
      return;
    }
    const gradesToSave = grades.filter((g) => g.subject.trim());
    if (gradesToSave.length === 0) {
      showToast?.("Isi minimal 1 mata pelajaran", "error");
      return;
    }

    setIsSaving(true);
    try {
      // Cek calon duplikat -- sama kayak pre-check di ImportRaportForm.js
      // (handleSimpan): nama sama persis dengan raport yang UDAH ADA di
      // tahun ajaran & semester ini. Bukan block keras, cuma warning yang
      // bisa di-skip admin (bisa aja emang 2 siswa beda kebetulan namanya
      // sama).
      const { data: existingSameSemester, error: checkError } = await supabase
        .from("student_reports")
        .select("student_name, student_nis")
        .eq("academic_year", tahunAjaran)
        .eq("semester", Number(semester));
      if (checkError) throw checkError;

      const normName = (n) => (n || "").trim().toUpperCase().replace(/\s+/g, " ");
      const isDup = (existingSameSemester || []).some(
        (e) => normName(e.student_name) === normName(nama) && e.student_nis !== nisInput.trim()
      );
      if (isDup) {
        const lanjut = window.confirm(
          `Ada raport dengan nama sama ("${nama}") yang UDAH ADA di ${tahunAjaran} semester ${semester}, tapi NIS-nya beda -- kemungkinan siswa yang sama dan bakal jadi DUPLIKAT kalau dilanjut.\n\nTetap simpan?`
        );
        if (!lanjut) {
          setIsSaving(false);
          return;
        }
      }

      // 1. Insert student_reports (1 baris)
      const { data: inserted, error: insertError } = await supabase
        .from("student_reports")
        .insert({
          student_id: matchedStudentId,
          student_name: nama.trim(),
          student_nis: nisInput.trim() || null,
          class_name: kelas.trim() || null,
          academic_year: tahunAjaran,
          semester: Number(semester),
          status: "draft",
          source_file: null, // input manual -- gak ada file sumbernya
        })
        .select("id")
        .single();

      if (insertError) {
        throw new Error(
          insertError.message.includes("duplicate")
            ? "Raport untuk siswa & semester ini sudah ada sebelumnya."
            : insertError.message
        );
      }

      // 2. Insert nilai per mapel
      const { error: gradesError } = await supabase.from("student_report_grades").insert(
        gradesToSave.map((g) => ({
          report_id: inserted.id,
          subject: g.subject.trim(),
          score: g.score,
        }))
      );
      if (gradesError) throw gradesError;

      showToast?.(`Raport "${nama}" berhasil dibuat`, "success");
      onSelesai?.();
    } catch (err) {
      console.error(err);
      showToast?.(err.message || "Gagal menyimpan raport", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <button
        onClick={onBatal}
        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        <ArrowLeft size={16} />
        Kembali ke daftar
      </button>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          NIS
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={nisInput}
            onChange={(e) => handleChangeNis(e.target.value)}
            placeholder="Contoh: 25.26.07.079"
            className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100"
          />
          <button
            type="button"
            onClick={handleCariNis}
            disabled={isSearchingNis || !nisInput.trim()}
            className="px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSearchingNis ? "Mencari..." : "Cari"}
          </button>
        </div>
        <p className="text-xs mt-1.5">
          {matchedStudentId ? (
            <span className="text-emerald-600 dark:text-emerald-400">
              ✓ Terhubung ke akun siswa
            </span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500">
              Opsional, tapi kalau ketemu raport langsung tersambung ke akun siswa (gak perlu "Coba
              Hubungkan" belakangan).
            </span>
          )}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Nama Siswa
        </label>
        <input
          type="text"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="Nama lengkap siswa"
          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Kelas
          </label>
          <input
            type="text"
            value={kelas}
            onChange={(e) => setKelas(e.target.value.toUpperCase())}
            placeholder="Contoh: 7F"
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Tahun Ajaran
          </label>
          <select
            value={tahunAjaran}
            onChange={(e) => setTahunAjaran(e.target.value)}
            disabled={loadingTahunAjaran}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 disabled:opacity-60"
          >
            <option value="">{loadingTahunAjaran ? "Memuat..." : "Pilih tahun ajaran"}</option>
            {tahunAjaranOptions.map((ta) => (
              <option key={ta} value={ta}>
                {ta}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Semester
          </label>
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100"
          >
            <option value="">Pilih semester</option>
            <option value="1">Semester 1 (Ganjil)</option>
            <option value="2">Semester 2 (Genap)</option>
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Nilai per Mata Pelajaran
          </label>
          <button
            type="button"
            onClick={handleTambahBarisMapel}
            className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline"
          >
            + Tambah Mapel
          </button>
        </div>
        <div className="border border-gray-100 dark:border-gray-700 rounded-xl divide-y divide-gray-100 dark:divide-gray-700">
          {grades.map((g, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2">
              <input
                type="text"
                value={g.subject}
                onChange={(e) => handleChangeSubjectName(i, e.target.value)}
                placeholder="Nama mata pelajaran"
                className="flex-1 px-2.5 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100"
              />
              <input
                type="number"
                min={0}
                max={100}
                value={g.score ?? ""}
                placeholder="Kosong"
                onChange={(e) =>
                  handleChangeScore(
                    g.subject,
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
                className="w-20 text-right px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100"
              />
              <button
                type="button"
                onClick={() => handleHapusBarisMapel(i)}
                title="Hapus baris mapel ini"
                className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleSimpan}
        disabled={isSaving}
        className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors active:scale-95"
      >
        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        Simpan Raport
      </button>
    </div>
  );
};

// ============================================================
// ManajemenRaportTable (komponen utama, di-export default)
// ============================================================

const ManajemenRaportTable = ({ showToast }) => {
  const [view, setView] = useState("list"); // "list" | "detail" | "manual"
  const [selectedSiswa, setSelectedSiswa] = useState(null);
  const [raportList, setRaportList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [linkingId, setLinkingId] = useState(null); // id raport yang lagi diproses "Coba Hubungkan"
  const [isBulkLinking, setIsBulkLinking] = useState(false);
  const [filter, setFilter] = useState({
    tahunAjaran: "",
    semester: "",
    kelas: "",
    search: "",
  });
  // id-id student_reports yang lagi dicentang di daftar -- direset tiap
  // kali filter berubah / list di-refetch, biar ga kebawa nyentang ke
  // baris yang beda pas admin ganti filter.
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  // Dipakai buat pre-fill baris mapel di TambahManualForm -- lihat komen
  // di komponen itu soal kenapa.
  const [existingSubjects, setExistingSubjects] = useState([]);

  const { years: tahunAjaranOptions, loading: loadingTahunAjaran } = useAcademicYears(showToast);
  // Kelas di sini = kode yang SUDAH PERNAH diimport (student_reports.class_name),
  // bukan dari tabel `classes` -- lihat catatan di RaportShared.js.
  const { classes: kelasOptions } = useReportedClasses(filter.tahunAjaran, showToast);

  // Sama kayak yang dipake KelolaKKM.js buat pre-fill daftar mapel --
  // ditarik dari data yang UDAH ADA di student_report_grades (bukan
  // konstanta hardcode), soalnya nama mapel sumbernya dari legend
  // "KETERANGAN MAPEL" tiap file leger, bisa beda2 tergantung template.
  // Cukup fetch sekali pas komponen mount (bukan tiap buka view "manual"),
  // gak perlu realtime-akurat -- ini cuma buat memudahkan ngetik, bukan
  // sumber kebenaran.
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { data, error } = await supabase.from("student_report_grades").select("subject");
        if (error) throw error;
        if (mounted) {
          setExistingSubjects(
            Array.from(new Set((data || []).map((r) => r.subject).filter(Boolean))).sort()
          );
        }
      } catch (err) {
        console.error("[ManajemenRaportTable] Gagal ambil daftar mapel:", err);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const fetchRaportList = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("student_reports")
        .select(
          "id, student_id, student_name, student_nis, class_name, academic_year, semester, status, student_report_grades(subject, score)"
        )
        .order("student_name", { ascending: true });

      if (filter.tahunAjaran) query = query.eq("academic_year", filter.tahunAjaran);
      if (filter.semester) query = query.eq("semester", Number(filter.semester));
      if (filter.kelas) query = query.eq("class_name", filter.kelas);
      if (filter.search) query = query.ilike("student_name", `%${filter.search}%`);

      const { data, error } = await query;
      if (error) throw error;

      setRaportList(
        (data || []).map((r) => ({
          id: r.id,
          // null berarti pas import NIS di file gak ketemu persis di tabel
          // `students` -- raport ini GAK BAKAL muncul di halaman siswa
          // manapun (walau statusnya published) sampai ini kesambung.
          // Lihat badge "Belum terhubung" di bawah & catatan di
          // ImportRaportForm.js / StudentRaport.js soal kenapa ini bisa
          // kejadian (format NIS beda antar file).
          studentId: r.student_id,
          name: r.student_name,
          nis: r.student_nis,
          kelas: r.class_name,
          tahunAjaran: r.academic_year,
          semester: r.semester,
          status: r.status,
          grades: r.student_report_grades || [],
        }))
      );
      setSelectedIds(new Set());
    } catch (err) {
      console.error(err);
      showToast?.("Gagal memuat data raport", "error");
    } finally {
      setIsLoading(false);
    }
  }, [filter, showToast]);

  useEffect(() => {
    fetchRaportList();
  }, [fetchRaportList]);

  const isAllSelected = raportList.length > 0 && selectedIds.size === raportList.length;
  const isSomeSelected = selectedIds.size > 0 && !isAllSelected;

  const toggleSelectAll = () => {
    setSelectedIds(isAllSelected ? new Set() : new Set(raportList.map((r) => r.id)));
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSaveGrades = async (id, grades) => {
    try {
      const { error } = await supabase.from("student_report_grades").upsert(
        grades.map((g) => ({
          report_id: id,
          subject: g.subject,
          score: g.score,
        })),
        { onConflict: "report_id,subject" }
      );
      if (error) throw error;

      setRaportList((prev) => prev.map((r) => (r.id === id ? { ...r, grades } : r)));
      setSelectedSiswa((prev) => (prev && prev.id === id ? { ...prev, grades } : prev));
      showToast?.("Nilai raport tersimpan", "success");
      return true;
    } catch (err) {
      console.error(err);
      showToast?.("Gagal menyimpan nilai", "error");
      return false;
    }
  };

  const handleTogglePublish = async (id, nextStatus) => {
    // FIX 30 Agustus 2026: warning kalau admin publish raport yang belum
    // kesambung ke akun siswa (student_id null) -- soalnya statusnya bisa
    // aja "published" tapi TETEP gak akan pernah muncul di halaman siswa
    // manapun (lihat StudentRaport.js), dan sebelumnya admin baru ketauan
    // dari laporan siswa. Sekarang diingetin dari awal.
    if (nextStatus === "published") {
      const target = raportList.find((r) => r.id === id);
      if (target && !target.studentId) {
        const lanjut = window.confirm(
          `Raport "${target?.name}" ini BELUM TERHUBUNG ke akun siswa manapun (lihat badge ⚠️). Kalau dipublish sekarang, statusnya bakal "published" tapi TETEP GAK BAKAL MUNCUL di halaman siswa sampai dihubungkan dulu (pakai tombol "Coba Hubungkan").\n\nTetap lanjut publish?`
        );
        if (!lanjut) return;
      }
    }

    try {
      const { error } = await supabase
        .from("student_reports")
        .update({ status: nextStatus })
        .eq("id", id);
      if (error) throw error;

      setRaportList((prev) => prev.map((r) => (r.id === id ? { ...r, status: nextStatus } : r)));
      setSelectedSiswa((prev) => (prev && prev.id === id ? { ...prev, status: nextStatus } : prev));
      showToast?.(
        nextStatus === "published"
          ? "Raport dipublish, sudah bisa dilihat siswa"
          : "Raport diset ke Draft",
        "success"
      );
    } catch (err) {
      console.error(err);
      showToast?.("Gagal mengubah status publish", "error");
    }
  };

  // Sama kayak handleTogglePublish tapi buat banyak siswa terpilih
  // sekaligus (1 query update pakai .in(), bukan loop 1-1 per siswa).
  const handleBulkTogglePublish = async (nextStatus) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const label = nextStatus === "published" ? "publish" : "set ke Draft";

    // Sama kayak di handleTogglePublish -- cek dulu ada berapa raport
    // terpilih yang belum kesambung ke akun siswa sebelum publish massal.
    let confirmMsg = `${nextStatus === "published" ? "Publish" : "Set ke Draft"} ${ids.length} raport terpilih?`;
    if (nextStatus === "published") {
      const unlinkedCount = raportList.filter((r) => ids.includes(r.id) && !r.studentId).length;
      if (unlinkedCount > 0) {
        confirmMsg = `${unlinkedCount} dari ${ids.length} raport terpilih BELUM TERHUBUNG ke akun siswa manapun. Raport itu bakal berstatus "published" tapi TETEP GAK MUNCUL di halaman siswa sampai dihubungkan (pakai "Coba Hubungkan" / "Hubungkan Semua").\n\n${confirmMsg}`;
      }
    }

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setIsBulkSaving(true);
    try {
      const { error } = await supabase
        .from("student_reports")
        .update({ status: nextStatus })
        .in("id", ids);
      if (error) throw error;

      setRaportList((prev) =>
        prev.map((r) => (ids.includes(r.id) ? { ...r, status: nextStatus } : r))
      );
      setSelectedIds(new Set());
      showToast?.(`${ids.length} raport berhasil di-${label}`, "success");
    } catch (err) {
      console.error(err);
      showToast?.(`Gagal ${label} raport terpilih`, "error");
    } finally {
      setIsBulkSaving(false);
    }
  };

  // Hapus permanen dari student_reports (+ student_report_grades-nya).
  // Dipakai buat beresin kasus salah import (mis. duplikat gara2 NIS beda
  // format antar semester) -- termasuk raport yang statusnya udah
  // "published", makanya konfirmasinya dibedain/diperkeras kalau ada yang
  // udah published biar ga kepencet ga sengaja.
  const deleteReports = async (ids) => {
    // Grades dihapus manual dulu (bukan andelin ON DELETE CASCADE di FK --
    // gak ada jaminan itu di-set di migration-nya) baru rownya sendiri.
    const { error: gradesError } = await supabase
      .from("student_report_grades")
      .delete()
      .in("report_id", ids);
    if (gradesError) throw gradesError;

    const { error: reportsError } = await supabase.from("student_reports").delete().in("id", ids);
    if (reportsError) throw reportsError;
  };

  // Nyoba nyambungin ulang raport yang student_id-nya null ke tabel
  // `students`, pake logic normalisasi NIS yang sama kayak ImportRaportForm.js
  // -- buat data LAMA yang keburu keimport SEBELUM fix normalisasi NIS ada.
  // Ini gak nyentuh/nghapus data raport sama sekali, cuma nyambungin ID.
  //
  // PENTING (ketauan 30 Agustus 2026 dari kasus Adriansyah): NIS di tabel
  // `students` itu NIS LOKAL sekolah, formatnya "25.26.07.079" (9 digit,
  // pola tahunajaran.tahunajaran.kelas.urutan) -- BEDA SAMA SEKALI dari
  // NISN (Nomor Induk Siswa Nasional, 10 digit, mis. "3137255819") yang
  // kadang justru itu yang kebaca dari kolom "NISN" di file leger Excel
  // (lihat komen di ImportRaportForm.js). Dua ID ini diterbitin instansi
  // beda dan TIDAK BISA saling diturunin lewat manipulasi string (nambah/
  // hapus titik dll) -- kalau raport-nya nyimpen NISN padahal `students`
  // cuma punya NIS lokal, auto-match APAPUN gak akan pernah nemu, dan
  // satu-satunya jalan adalah cocokin manual (nama / NIS lokal yang bener).
  // Bagian auto-match TANPA nanya apa-apa ke admin (deterministik, aman
  // buat dipanggil banyak sekali sekaligus di handleBulkTryLink). Kasus
  // yang butuh keputusan manusia (NISN vs NIS lokal / nama ganda) TETAP
  // gak ke-handle di sini -- itu cuma ada di alur single handleTryLink.
  const findAutoMatch = async (r) => {
    const variants = nisVariants(r.nis);
    if (variants.length > 0) {
      const { data: candidates, error: findError } = await supabase
        .from("students")
        .select("id, nis")
        .in("nis", variants);
      if (findError) throw findError;
      if ((candidates || []).length > 0) return candidates[0];
    }

    const targetDigits = normalizeNis(r.nis);
    if (targetDigits) {
      const { data: allStudents, error: allErr } = await supabase
        .from("students")
        .select("id, nis");
      if (allErr) throw allErr;
      const found = (allStudents || []).find((s) => normalizeNis(s.nis) === targetDigits);
      if (found) return found;
    }
    return null;
  };

  const handleTryLink = async (r) => {
    setLinkingId(r.id);
    try {
      const match = await findAutoMatch(r);
      let finalMatch = match;

      // Terakhir, coba cari by nama (full_name) -- buat kasus kayak NISN
      // vs NIS lokal ini, di mana angkanya emang gak akan pernah nyambung
      // otomatis. Kalau ketemu PERSIS 1 kandidat, konfirmasi dulu ke admin
      // sebelum link (jangan asal nebak kalau ada >1 nama mirip).
      if (!finalMatch && r.name) {
        const { data: byName, error: nameErr } = await supabase
          .from("students")
          .select("id, nis, full_name")
          .ilike("full_name", `%${r.name.trim()}%`);
        if (nameErr) throw nameErr;

        if ((byName || []).length === 1) {
          const candidate = byName[0];
          const confirmed = window.confirm(
            `NIS "${r.nis}" di raport ini kemungkinan NISN (bukan NIS lokal), jadi gak bisa auto-match.\n\nKetemu 1 akun dengan nama mirip: "${candidate.full_name}" (NIS lokal: ${candidate.nis}).\n\nHubungkan raport ini ke akun tersebut?`
          );
          if (confirmed) finalMatch = candidate;
        } else if ((byName || []).length > 1) {
          showToast?.(
            `Ada ${byName.length} akun siswa dengan nama mirip "${r.name}" -- gak bisa auto-pilih. Masukkan NIS lokal yang benar secara manual.`,
            "warning"
          );
        }
      }

      // Fallback paling akhir: minta admin ketik NIS LOKAL yang benar
      // secara manual (dicek sendiri di tabel Siswa).
      if (!finalMatch) {
        const manualNis = window.prompt(
          `Gak ketemu otomatis buat "${r.name}" (NIS di raport: ${r.nis}).\n\nKalau NIS di raport ini emang NISN (bukan NIS lokal sekolah), ketik NIS LOKAL yang benar di sini (cek di tabel Siswa, formatnya kayak "25.26.07.079"). Kosongkan/Batal buat skip.`,
          ""
        );
        if (!manualNis || !manualNis.trim()) {
          showToast?.("Dibatalkan, gak ada yang dihubungkan", "info");
          return;
        }
        const { data: manualMatch, error: manualErr } = await supabase
          .from("students")
          .select("id, nis")
          .eq("nis", manualNis.trim())
          .maybeSingle();
        if (manualErr) throw manualErr;
        if (!manualMatch) {
          showToast?.(
            `NIS "${manualNis.trim()}" juga gak ketemu di tabel Siswa. Cek lagi ejaannya.`,
            "error"
          );
          return;
        }
        finalMatch = manualMatch;
      }

      const { error: updateError } = await supabase
        .from("student_reports")
        .update({ student_id: finalMatch.id })
        .eq("id", r.id);
      if (updateError) throw updateError;

      setRaportList((prev) =>
        prev.map((x) => (x.id === r.id ? { ...x, studentId: finalMatch.id } : x))
      );
      showToast?.(`Berhasil dihubungkan ke akun siswa (NIS: ${finalMatch.nis})`, "success");
    } catch (err) {
      console.error(err);
      showToast?.("Gagal mencoba menghubungkan raport", "error");
    } finally {
      setLinkingId(null);
    }
  };

  // Versi bulk dari handleTryLink -- JALAN OTOMATIS ke semua baris yang
  // ada di daftar (raportList, ngikut filter aktif) dan student_id-nya
  // masih null, TANPA nanya-nanya satu-satu (biar gak muncul puluhan
  // window.confirm/prompt beruntun). Yang butuh keputusan manusia (nama
  // ganda, atau angkanya emang NISN bukan NIS lokal) SENGAJA di-skip di
  // sini dan tetep harus diselesein manual satu-satu lewat "Coba
  // Hubungkan" per baris -- makanya di akhir dikasih ringkasan berapa
  // yang berhasil vs berapa yang masih nyangkut.
  const handleBulkTryLink = async () => {
    const unlinked = raportList.filter((r) => !r.studentId);
    if (unlinked.length === 0) {
      showToast?.("Semua raport di daftar ini udah terhubung ke akun siswa", "info");
      return;
    }
    if (
      !window.confirm(
        `Coba hubungkan otomatis ${unlinked.length} raport yang belum terhubung? Yang gak ketemu otomatis (mis. kasus NISN vs NIS lokal) tetep perlu dihubungkan manual satu-satu setelah ini.`
      )
    ) {
      return;
    }

    setIsBulkLinking(true);
    const linkedUpdates = [];
    let updateFailCount = 0;
    try {
      for (const r of unlinked) {
        try {
          const match = await findAutoMatch(r);
          // DEBUG SEMENTARA 30 Agustus 2026: bulk-link 0/76 tanpa error apa
          // pun di console -- nge-log tiap baris biar ketauan match-nya
          // ketemu apa nggak, dan (yang paling dicurigai) nge-log updateError
          // yang SEBELUMNYA didiemin total (dicek doang lewat `if
          // (!updateError)`, gak pernah di-console.error apalagi ditampilin
          // ke admin). Hapus block console.log ini kalau udah ketemu akar
          // masalahnya.
          console.log("[bulkLink]", {
            reportId: r.id,
            nisReport: r.nis,
            matchFound: !!match,
            matchedStudentId: match?.id,
            matchedStudentNis: match?.nis,
          });
          if (match) {
            const { error: updateError } = await supabase
              .from("student_reports")
              .update({ student_id: match.id })
              .eq("id", r.id);
            if (!updateError) {
              linkedUpdates.push({ id: r.id, studentId: match.id });
            } else {
              updateFailCount += 1;
              console.error(
                `[bulkLink] UPDATE GAGAL buat raport ${r.id} (mau di-set ke student_id ${match.id}):`,
                updateError
              );
            }
          }
        } catch (innerErr) {
          console.error(`Gagal auto-link raport ${r.id}:`, innerErr);
        }
      }
      if (updateFailCount > 0) {
        showToast?.(
          `${updateFailCount} raport ketemu kandidatnya tapi GAGAL disimpan (lihat console) -- kemungkinan besar dibatasi izin akses (RLS Supabase).`,
          "error"
        );
      }

      if (linkedUpdates.length > 0) {
        setRaportList((prev) =>
          prev.map((x) => {
            const found = linkedUpdates.find((l) => l.id === x.id);
            return found ? { ...x, studentId: found.studentId } : x;
          })
        );
      }

      const remaining = unlinked.length - linkedUpdates.length;
      showToast?.(
        `${linkedUpdates.length} raport berhasil dihubungkan otomatis.` +
          (remaining > 0
            ? ` ${remaining} sisanya masih perlu dihubungkan manual satu-satu (kemungkinan besar kasus NISN vs NIS lokal) -- klik "Coba Hubungkan" di baris masing-masing.`
            : ""),
        linkedUpdates.length > 0 ? "success" : "warning"
      );
    } finally {
      setIsBulkLinking(false);
    }
  };

  const handleDeleteOne = async (r) => {
    const warnPublished =
      r.status === "published"
        ? "\n\nRaport ini SUDAH DIPUBLISH dan mungkin udah dilihat siswa."
        : "";
    if (
      !window.confirm(
        `Hapus permanen raport "${r.name}" (${r.tahunAjaran} semester ${r.semester})? Nilai-nilainya ikut kehapus, dan ini gak bisa di-undo.${warnPublished}`
      )
    ) {
      return;
    }
    try {
      await deleteReports([r.id]);
      setRaportList((prev) => prev.filter((x) => x.id !== r.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(r.id);
        return next;
      });
      showToast?.(`Raport "${r.name}" berhasil dihapus`, "success");
    } catch (err) {
      console.error(err);
      showToast?.("Gagal menghapus raport", "error");
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const selectedRows = raportList.filter((r) => selectedIds.has(r.id));
    const publishedCount = selectedRows.filter((r) => r.status === "published").length;
    const warnPublished =
      publishedCount > 0
        ? `\n\n${publishedCount} DI ANTARANYA SUDAH DIPUBLISH dan mungkin udah dilihat siswa.`
        : "";

    if (
      !window.confirm(
        `Hapus permanen ${ids.length} raport terpilih? Nilai-nilainya ikut kehapus, dan ini gak bisa di-undo.${warnPublished}`
      )
    ) {
      return;
    }

    setIsBulkSaving(true);
    try {
      await deleteReports(ids);
      setRaportList((prev) => prev.filter((r) => !ids.includes(r.id)));
      setSelectedIds(new Set());
      showToast?.(`${ids.length} raport berhasil dihapus`, "success");
    } catch (err) {
      console.error(err);
      showToast?.("Gagal menghapus raport terpilih", "error");
    } finally {
      setIsBulkSaving(false);
    }
  };

  if (view === "manual") {
    return (
      <TambahManualForm
        showToast={showToast}
        tahunAjaranOptions={tahunAjaranOptions}
        loadingTahunAjaran={loadingTahunAjaran}
        existingSubjects={existingSubjects}
        onBatal={() => setView("list")}
        onSelesai={() => {
          setView("list");
          fetchRaportList();
        }}
      />
    );
  }

  if (view === "detail" && selectedSiswa) {
    return (
      <DetailRaportSiswa
        siswa={selectedSiswa}
        showToast={showToast}
        onBack={() => setView("list")}
        onSave={handleSaveGrades}
        onTogglePublish={handleTogglePublish}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setView("manual")}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/30 hover:bg-teal-100 dark:hover:bg-teal-900/50 rounded-lg transition-colors"
        >
          <UserPlus size={16} />
          Tambah Manual
        </button>
      </div>

      <SemesterFilterBar
        tahunAjaranOptions={tahunAjaranOptions}
        kelasOptions={kelasOptions}
        value={filter}
        onChange={(partial) =>
          setFilter((prev) => ({
            ...prev,
            ...partial,
            // Kelas lama gak relevan lagi kalau tahun ajarannya diganti
            // (kode rombel didaur ulang tiap tahun, lihat RaportShared.js)
            ...(partial.tahunAjaran !== undefined && partial.tahunAjaran !== prev.tahunAjaran
              ? { kelas: "" }
              : {}),
          }))
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-gray-400 dark:text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Memuat data raport...</span>
        </div>
      ) : raportList.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <ListChecks className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium text-gray-700 dark:text-gray-300">Belum ada data</p>
          <p className="text-sm mt-1">Ga ada raport yang cocok sama filter ini.</p>
        </div>
      ) : (
        <>
          {/* Action bar publish massal -- selalu di atas tabel (bukan di
              bawah), jadi keliatan tanpa scroll begitu ada siswa yang
              dicentang. */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
            <label className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isSomeSelected;
                }}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500"
              />
              {selectedIds.size > 0 ? (
                <span className="font-medium text-gray-800 dark:text-gray-100">
                  {selectedIds.size} dipilih
                </span>
              ) : (
                "Pilih Semua"
              )}
            </label>

            <div className="flex items-center gap-2">
              {raportList.some((r) => !r.studentId) && (
                <button
                  onClick={handleBulkTryLink}
                  disabled={isBulkLinking}
                  title="Nyoba nyambungin otomatis semua raport di daftar ini yang belum terhubung ke akun siswa. Yang gak ketemu otomatis tetep perlu dihubungkan manual satu-satu."
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isBulkLinking ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Link2 size={14} />
                  )}
                  Hubungkan Semua ({raportList.filter((r) => !r.studentId).length})
                </button>
              )}
              <button
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0 || isBulkSaving}
                className="px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                Hapus Terpilih
              </button>
              <button
                onClick={() => handleBulkTogglePublish("draft")}
                disabled={selectedIds.size === 0 || isBulkSaving}
                className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                Set ke Draft
              </button>
              <button
                onClick={() => handleBulkTogglePublish("published")}
                disabled={selectedIds.size === 0 || isBulkSaving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {isBulkSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                Publish Terpilih
              </button>
            </div>
          </div>

          <div className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
            {raportList.map((r) => (
              <div
                key={r.id}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(r.id)}
                  onChange={() => toggleSelectOne(r.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 shrink-0 rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500"
                />
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedSiswa(r);
                    setView("detail");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedSiswa(r);
                      setView("detail");
                    }
                  }}
                  className="flex-1 flex items-center justify-between gap-3 min-w-0 text-left cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                      {r.name}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {r.nis} · Kelas {r.kelas} · {r.tahunAjaran} · Semester {r.semester}
                    </p>
                    {!r.studentId && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <p
                          className="text-xs font-medium text-amber-600 dark:text-amber-400"
                          title="NIS di file ini gak ketemu persis di tabel akun siswa saat diimport -- raport ini gak akan muncul di halaman siswa manapun sampai NIS-nya dibenerin."
                        >
                          ⚠️ Belum terhubung ke akun siswa
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTryLink(r);
                          }}
                          disabled={linkingId === r.id}
                          className="flex items-center gap-1 text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline disabled:opacity-50"
                        >
                          {linkingId === r.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Link2 size={12} />
                          )}
                          Coba Hubungkan
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge type="publish" status={r.status} />
                    <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteOne(r);
                  }}
                  title="Hapus raport ini"
                  className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ManajemenRaportTable;
