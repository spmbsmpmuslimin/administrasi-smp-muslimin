// components/KelengkapanDataSiswa.js
// ========================================================================
// Halaman buat wali kelas/admin liat siapa aja siswa yang SUDAH dan BELUM
// isi data tambahan (alamat, no HP, data ortu) dari StudentProfile.js
// (form "Lengkapi / Edit Data" di sisi siswa).
//
// Sumber data:
// - students            : daftar siswa (id, full_name, nis, class_id)
// - student_profile_details : data tambahan, cuma ADA row-nya kalau siswa/
//   ortu udah pernah klik "Simpan" minimal sekali. Belum pernah isi = gak
//   ada row sama sekali (bukan row kosong).
//
// PENTING (beda dari project Bahasa Inggris):
// - Di project SMP ini, `student_profile_details.student_id` itu FOREIGN
//   KEY langsung ke `students.id` (SUDAH DICEK via pg_constraint:
//   "FOREIGN KEY (student_id) REFERENCES students(id)"). BUKAN ke users.id
//   kayak di project Bahasa Inggris. Jadi merge-nya pake `s.id`, bukan
//   `s.user_id`.
// - Role "admin" bisa liat semua kelas (dropdown filter), role "teacher"
//   di-scope otomatis ke currentUser.homeroom_class_id aja (gak ada
//   dropdown, cuma liat kelasnya sendiri) — samain kayak fitur wali kelas
//   lain (PengumumanWaliKelas, SaranMasukanSiswa).
// ========================================================================
import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabaseClient";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Search,
  ChevronDown,
  Users,
  FileDown,
} from "lucide-react";
import { exportStudentProfilePDF } from "./StudentProfilePDF";

// Field yang dianggap "wajib" buat status Lengkap. Samain persis sama
// field di form ProfileInfo (StudentProfile.js).
// ⚠️ UPDATE: `nama_ortu` udah gak dipake lagi di form (diganti nama_ayah +
// nama_ibu) dan emang gak pernah keisi lagi di DB -- sebelumnya bikin
// status siswa gak pernah bisa "Lengkap" walau udah isi semua data.
const REQUIRED_FIELDS = [
  "alamat",
  "no_hp",
  "nama_ayah",
  "nama_ibu",
  "no_hp_ortu",
];

// Tentuin status kelengkapan 1 siswa berdasarkan row student_profile_details
// (bisa null kalau belum pernah isi sama sekali).
function getCompletionStatus(detail) {
  if (!detail) return "belum";
  const filledCount = REQUIRED_FIELDS.filter(
    (f) => detail[f] && String(detail[f]).trim() !== "",
  ).length;
  if (filledCount === 0) return "belum";
  if (filledCount === REQUIRED_FIELDS.length) return "lengkap";
  return "sebagian";
}

// Konversi kode gender dari tabel `students` ("P"/"L") ke label penuh yang
// dipakai konsisten di UI & student_profile_details ("Perempuan"/"Laki-laki").
function genderCodeToLabel(code) {
  if (!code) return "";
  const normalized = String(code).trim().toUpperCase();
  if (normalized === "P") return "Perempuan";
  if (normalized === "L") return "Laki-laki";
  return "";
}

// Ekstrak jenjang (7/8/9) dari class_id, asumsi format "7A", "8B", "9C"
// (angka di depan = jenjang). Kalau format class_id di project ini beda
// (misal romawi "VII-A"), sesuaikan regex ini.
function getJenjang(classId) {
  if (!classId) return null;
  const match = String(classId).match(/^(\d+)/);
  return match ? match[1] : null;
}

const STATUS_META = {
  lengkap: {
    label: "Lengkap",
    icon: CheckCircle2,
    badge:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  sebagian: {
    label: "Sebagian",
    icon: AlertCircle,
    badge:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  belum: {
    label: "Belum Isi",
    icon: XCircle,
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    dot: "bg-rose-500",
  },
};

// Samain persis sama DATA_SISWA_ROWS + DATA_ORANGTUA_ROWS di
// StudentProfilePDF.js, biar field yang muncul di kartu expand & di PDF
// konsisten. `nama_ortu` (generic, lama) udah gak dipake di form
// StudentProfile.js -> diganti nama_ayah + nama_ibu.
// `combine: "ttl"` = gabungan tempat_lahir + tanggal_lahir jadi 1 baris.
const DETAIL_ROWS = [
  { key: "jenis_kelamin", label: "Jenis Kelamin" },
  { key: "ttl", label: "Tempat, Tanggal Lahir", combine: "ttl" },
  { key: "nisn", label: "NISN" },
  { key: "sekolah_asal", label: "Sekolah Asal" },
  { key: "alamat", label: "Alamat Lengkap" },
  { key: "no_hp", label: "No. HP Siswa" },
  { key: "nama_ayah", label: "Nama Lengkap Ayah" },
  { key: "pekerjaan_ayah", label: "Pekerjaan Ayah" },
  { key: "pendidikan_ayah", label: "Pendidikan Terakhir Ayah" },
  { key: "nama_ibu", label: "Nama Lengkap Ibu" },
  { key: "pekerjaan_ibu", label: "Pekerjaan Ibu" },
  { key: "pendidikan_ibu", label: "Pendidikan Terakhir Ibu" },
  { key: "no_hp_ortu", label: "No. HP Orang Tua/Wali" },
];

const MONTH_NAMES_SHORT = [
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

function formatTanggalLahirSingkat(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getDate()} ${MONTH_NAMES_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

// Ambil nilai 1 baris detail buat kartu expand (support field gabungan
// "ttl" kayak di StudentProfilePDF.js -> getRowValue).
function getDetailRowValue(detail, row) {
  if (row.combine === "ttl") {
    const tempat = detail?.tempat_lahir;
    const tanggal = formatTanggalLahirSingkat(detail?.tanggal_lahir);
    if (!tempat && !tanggal) return null;
    if (tempat && tanggal) return `${tempat}, ${tanggal}`;
    return tempat || tanggal;
  }
  return detail ? detail[row.key] : null;
}

export default function StudentProfileCompletion({ currentUser }) {
  const isAdmin = currentUser?.role === "admin";
  const isGuruBK = currentUser?.role === "guru_bk";
  // ✅ Guru BK dikasih akses penuh kayak admin — bisa liat & filter semua
  // kelas/jenjang, karena guru BK gak terikat 1 kelas walian aja.
  const hasFullAccess = isAdmin || isGuruBK;
  // Wali kelas (role "teacher" yang punya homeroom_class_id) tetap
  // ter-scope otomatis ke kelasnya sendiri, gak berubah dari sebelumnya.
  const isWaliKelas =
    currentUser?.role === "teacher" && !!currentUser?.homeroom_class_id;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | lengkap | sebagian | belum
  const [jenjangFilter, setJenjangFilter] = useState("all"); // all | "7" | "8" | "9"
  const [classOptions, setClassOptions] = useState([]); // [{ id: "7A", jenjang: "7" }, ...]
  const [classFilter, setClassFilter] = useState(
    hasFullAccess ? "all" : currentUser?.homeroom_class_id || "all",
  );

  // ====== SELEKSI SISWA UNTUK EXPORT PDF ======
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [exporting, setExporting] = useState(false);

  // ✅ PAGINATION (biar gak lag di HP) — render maksimal PAGE_SIZE card
  // dulu, sisanya dimuat pas user klik "Muat Lebih Banyak". Data lengkap
  // (filteredRows) tetep dipakai buat "Pilih Semua" & Export PDF, cuma
  // yang di-render ke DOM yang dibatasin.
  const PAGE_SIZE = 15;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [academicYear, setAcademicYear] = useState(null); // format "2026/2027", buat header PDF

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        let studentQuery = supabase
          .from("students")
          // Kolom jenis kelamin di tabel `students` namanya `gender`
          // (isinya kode "P"/"L"), BEDA nama & format sama
          // student_profile_details.jenis_kelamin ("Perempuan"/
          // "Laki-laki"). Konversi ke label penuh di bagian merge.
          .select("id, full_name, nis, class_id, user_id, gender")
          .eq("is_active", true)
          .order("full_name", { ascending: true });

        // Wali kelas (bukan admin/guru BK): otomatis di-scope ke kelasnya
        // sendiri. Admin & Guru BK (hasFullAccess) gak di-filter, bisa
        // liat semua kelas/jenjang.
        if (isWaliKelas) {
          studentQuery = studentQuery.eq(
            "class_id",
            currentUser.homeroom_class_id,
          );
        }

        const [
          { data: students, error: studentErr },
          { data: details, error: detailErr },
          { data: activeYear },
        ] = await Promise.all([
          studentQuery,
          supabase
            .from("student_profile_details")
            // Kolom baru (jenis_kelamin dkk, ditambahin di form ProfileInfo
            // StudentProfile.js) ikut di-select juga -- sebelumnya cuma
            // narik kolom lama, jadi Export PDF (StudentProfilePDF.js)
            // gak pernah nerima nilainya walau udah kesimpen di DB.
            .select(
              "student_id, jenis_kelamin, tempat_lahir, tanggal_lahir, nisn, alamat, no_hp, nama_ortu, no_hp_ortu, sekolah_asal, nama_ayah, pekerjaan_ayah, pendidikan_ayah, nama_ibu, pekerjaan_ibu, pendidikan_ibu, updated_at",
            ),
          supabase
            .from("academic_years")
            .select("year")
            .eq("is_active", true)
            .limit(1),
        ]);

        if (studentErr) throw studentErr;
        if (detailErr) throw detailErr;

        setAcademicYear(activeYear?.[0]?.year || null);

        const detailMap = {};
        (details || []).forEach((d) => {
          detailMap[d.student_id] = d;
        });

        const merged = (students || []).map((s) => {
          // student_profile_details.student_id nunjuk LANGSUNG ke
          // students.id di project ini (bukan users.id).
          const rawDetail = detailMap[s.id] || null;

          // Prioritas jenis_kelamin: students.gender (kode P/L dari
          // admin/SQL, dikonversi ke label penuh) dulu, fallback ke
          // student_profile_details.jenis_kelamin (form siswa) kalau
          // students.gender kosong/gak valid.
          const resolvedJenisKelamin =
            genderCodeToLabel(s.gender) || rawDetail?.jenis_kelamin || "";

          // Suntikkan hasil resolve ke `detail` (bukan bikin field baru),
          // biar DETAIL_ROWS (kartu expand) & StudentProfilePDF.js yang
          // sama-sama baca `detail.jenis_kelamin` otomatis dapet nilai yang
          // benar tanpa perlu diubah lagi. Kalau siswa belum pernah isi
          // form sama sekali (rawDetail null) TAPI jenis_kelamin udah ada
          // di students, tetep bikin object detail minimal biar muncul di
          // UI (bukan dianggap "belum isi apa-apa").
          const detail = resolvedJenisKelamin
            ? { ...(rawDetail || {}), jenis_kelamin: resolvedJenisKelamin }
            : rawDetail;

          return {
            ...s,
            detail,
            // Status kelengkapan tetap dihitung dari data asli
            // student_profile_details -- jenis_kelamin dari tabel students
            // gak termasuk REQUIRED_FIELDS, jadi gak pengaruh ke status.
            status: getCompletionStatus(rawDetail),
          };
        });

        setRows(merged);
        setSelectedIds(new Set());

        // Dropdown filter Jenjang & Kelas cuma relevan buat yang
        // hasFullAccess (admin & guru BK) — wali kelas udah otomatis
        // ke-scope 1 kelas, gak butuh filter kelas/jenjang lagi.
        if (hasFullAccess) {
          const uniqueClasses = [
            ...new Set((students || []).map((s) => s.class_id).filter(Boolean)),
          ].sort();
          setClassOptions(
            uniqueClasses.map((c) => ({ id: c, jenjang: getJenjang(c) })),
          );
        }
      } catch (err) {
        console.error("[StudentProfileCompletion] Gagal memuat data:", err);
        setError("Gagal memuat data kelengkapan siswa. Coba refresh halaman.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isAdmin, hasFullAccess, isWaliKelas, currentUser]);

  const summary = useMemo(
    () =>
      rows.reduce(
        (acc, r) => {
          acc[r.status] += 1;
          acc.total += 1;
          return acc;
        },
        { total: 0, lengkap: 0, sebagian: 0, belum: 0 },
      ),
    [rows],
  );

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (jenjangFilter !== "all" && getJenjang(r.class_id) !== jenjangFilter)
        return false;
      if (classFilter !== "all" && r.class_id !== classFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchName = r.full_name?.toLowerCase().includes(q);
        const matchNis = r.nis?.toLowerCase?.().includes(q);
        if (!matchName && !matchNis) return false;
      }
      return true;
    });
  }, [rows, statusFilter, jenjangFilter, classFilter, search]);

  // Daftar jenjang unik (7/8/9) dari classOptions, buat dropdown pertama.
  const jenjangOptions = useMemo(() => {
    return [
      ...new Set(classOptions.map((c) => c.jenjang).filter(Boolean)),
    ].sort();
  }, [classOptions]);

  // Dropdown Kelas (kedua) cuma nampilin kelas dari jenjang yang lagi
  // dipilih di dropdown pertama. Kalau jenjang "Semua", tampilkan semua.
  const filteredClassOptions = useMemo(() => {
    if (jenjangFilter === "all") return classOptions;
    return classOptions.filter((c) => c.jenjang === jenjangFilter);
  }, [classOptions, jenjangFilter]);

  // Reset ke halaman pertama (30 teratas) tiap kali filter/search berubah,
  // biar gak nyangkut di posisi scroll yang salah pas hasil filter beda.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [statusFilter, jenjangFilter, classFilter, search]);

  const paginatedRows = useMemo(
    () => filteredRows.slice(0, visibleCount),
    [filteredRows, visibleCount],
  );

  // "Pilih semua" ngikutin hasil filter yang lagi ditampilin, bukan semua
  // siswa di kelas -- biar konsisten sama apa yang keliatan di layar.
  const allFilteredSelected =
    filteredRows.length > 0 && filteredRows.every((r) => selectedIds.has(r.id));

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        // Semua yang keliatan lagi kepilih -> unselect semua yang keliatan.
        filteredRows.forEach((r) => next.delete(r.id));
      } else {
        filteredRows.forEach((r) => next.add(r.id));
      }
      return next;
    });
  };

  const handleExportPDF = async () => {
    const selectedRows = rows.filter((r) => selectedIds.has(r.id));
    if (selectedRows.length === 0) return;

    setExporting(true);
    try {
      const result = await exportStudentProfilePDF(selectedRows, {
        academicYear,
      });
      if (!result.success) {
        setError(result.message || "Gagal export PDF.");
      }
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-400 dark:border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300 font-medium">
            Memuat data kelengkapan siswa...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-3 sm:p-4 md:p-6">
      <div>
        {/* ====== HEADER ====== */}
        <div className="bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800 rounded-xl sm:rounded-2xl shadow-lg p-5 sm:p-7 mb-5 sm:mb-6 relative overflow-hidden border border-blue-200/50 dark:border-slate-700">
          <div className="absolute inset-0 opacity-20 dark:opacity-10">
            <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full translate-x-1/3 translate-y-1/3"></div>
          </div>
          <div className="relative min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50">
              Kelengkapan Data Siswa
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mt-1 text-sm">
              Pantau siswa/orang tua yang sudah & belum melengkapi data alamat
              dan kontak.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-5">
            ⚠️ {error}
          </div>
        )}

        {/* ====== RINGKASAN ====== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-md p-3 sm:p-4 border border-slate-100 dark:border-slate-700 text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                <Users size={18} className="text-white" />
              </div>
            </div>
            <p className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">
              {summary.total}
            </p>
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Siswa
            </p>
          </div>

          {["lengkap", "sebagian", "belum"].map((key) => {
            const meta = STATUS_META[key];
            const Icon = meta.icon;
            return (
              <button
                key={key}
                onClick={() =>
                  setStatusFilter((f) => (f === key ? "all" : key))
                }
                className={`bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-md p-3 sm:p-4 border text-center transition ${
                  statusFilter === key
                    ? "border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-900"
                    : "border-slate-100 dark:border-slate-700"
                }`}>
                <div className="flex items-center justify-center mb-2">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-md ${meta.dot}`}>
                    <Icon size={18} className="text-white" />
                  </div>
                </div>
                <p className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">
                  {summary[key]}
                </p>
                <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
                  {meta.label}
                </p>
              </button>
            );
          })}
        </div>

        {/* ====== FILTER ====== */}
        {/* Baris 1: Cari Siswa full-width sendirian.
            Baris 2: Pilih Jenjang + Pilih Kelas + Reset, 1 baris (scroll
            horizontal di HP kalau kepotong). */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-md p-3 sm:p-4 border border-slate-100 dark:border-slate-700 mb-4 flex flex-col gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Cari Siswa
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nama atau NIS..."
                className="w-full text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 focus:border-indigo-300"
              />
            </div>
          </div>

          {hasFullAccess &&
            (jenjangOptions.length > 0 || filteredClassOptions.length > 0) && (
              <div className="flex flex-nowrap items-end gap-2 sm:gap-3 overflow-x-auto">
                {jenjangOptions.length > 0 && (
                  <div className="shrink-0 min-w-[130px]">
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Pilih Jenjang
                    </label>
                    <select
                      value={jenjangFilter}
                      onChange={(e) => {
                        setJenjangFilter(e.target.value);
                        // Reset filter Kelas tiap ganti Jenjang, biar gak
                        // nyangkut pilih kelas dari jenjang yang udah gak aktif.
                        setClassFilter("all");
                      }}
                      className="w-full text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900">
                      <option value="all">Semua Jenjang</option>
                      {jenjangOptions.map((j) => (
                        <option key={j} value={j}>
                          Kelas {j}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {filteredClassOptions.length > 0 && (
                  <div className="shrink-0 min-w-[140px]">
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Pilih Kelas
                    </label>
                    <select
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                      className="w-full text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900">
                      <option value="all">Semua Kelas</option>
                      {filteredClassOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          Kelas {c.id}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {(statusFilter !== "all" ||
                  jenjangFilter !== "all" ||
                  classFilter !== "all") && (
                  <div className="shrink-0">
                    <span className="block text-[11px] mb-1 invisible">
                      Reset
                    </span>
                    <button
                      onClick={() => {
                        setStatusFilter("all");
                        setJenjangFilter("all");
                        setClassFilter(
                          hasFullAccess
                            ? "all"
                            : currentUser?.homeroom_class_id || "all",
                        );
                      }}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-2 rounded-lg whitespace-nowrap">
                      Reset Filter
                    </button>
                  </div>
                )}
              </div>
            )}

          {/* Wali kelas (gak hasFullAccess) tetap bisa reset status filter
              aja, taruh di baris sendiri karena gak ada dropdown Jenjang/Kelas. */}
          {!hasFullAccess && statusFilter !== "all" && (
            <div>
              <button
                onClick={() => setStatusFilter("all")}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-2 rounded-lg whitespace-nowrap">
                Reset Filter Status
              </button>
            </div>
          )}
        </div>

        {/* ====== TOOLBAR SELEKSI & EXPORT PDF ====== */}
        {filteredRows.length > 0 && (
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-md p-3 sm:p-4 border border-slate-100 dark:border-slate-700 mb-4 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleSelectAllFiltered}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-400"
              />
              Pilih Semua ({filteredRows.length})
              {selectedIds.size > 0 && (
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                  · {selectedIds.size} dipilih
                </span>
              )}
            </label>

            <button
              onClick={handleExportPDF}
              disabled={selectedIds.size === 0 || exporting}
              className="flex items-center gap-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed px-4 py-2 rounded-lg shadow-sm transition">
              <FileDown size={16} />
              {exporting
                ? "Membuat PDF..."
                : `Export PDF${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`}
            </button>
          </div>
        )}

        {/* ====== LIST SISWA ====== */}
        {filteredRows.length === 0 ? (
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-100 dark:border-slate-700 p-8 text-center text-slate-400 dark:text-slate-500 text-sm shadow-sm">
            Tidak ada siswa yang cocok dengan filter ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3">
            {paginatedRows.map((r) => {
              const meta = STATUS_META[r.status];
              const StatusIcon = meta.icon;
              const isExpanded = expandedId === r.id;

              return (
                <div
                  key={r.id}
                  className={`bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border shadow-sm overflow-hidden transition ${
                    selectedIds.has(r.id)
                      ? "border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-100 dark:ring-indigo-900/50"
                      : "border-slate-100 dark:border-slate-700"
                  }`}>
                  <div className="w-full flex items-center gap-3 p-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r.id)}
                      onChange={() => toggleSelectOne(r.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 shrink-0 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-400"
                    />
                    <button
                      onClick={() =>
                        setExpandedId((id) => (id === r.id ? null : r.id))
                      }
                      className="flex-1 min-w-0 flex items-center justify-between gap-3 text-left">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {r.full_name}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          NIS {r.nis || "-"} · Kelas {r.class_id || "-"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${meta.badge}`}>
                          <StatusIcon size={13} />
                          {meta.label}
                        </span>
                        <ChevronDown
                          size={16}
                          className={`text-slate-400 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700 pt-3">
                      {r.detail ? (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                          {DETAIL_ROWS.map(({ key, label, combine } = {}) => {
                            const value = getDetailRowValue(r.detail, {
                              key,
                              combine,
                            });
                            return (
                              <div
                                key={key}
                                className="flex items-start justify-between py-2 gap-3">
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">
                                  {label}
                                </span>
                                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 text-right break-words">
                                  {value || (
                                    <span className="text-rose-500 font-medium">
                                      Belum diisi
                                    </span>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                          {r.detail.updated_at && (
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-2">
                              Terakhir diperbarui:{" "}
                              {new Date(r.detail.updated_at).toLocaleDateString(
                                "id-ID",
                                {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                },
                              )}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-2">
                          Siswa ini belum pernah mengisi data tambahan sama
                          sekali.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ====== MUAT LEBIH BANYAK (PAGINATION) ====== */}
        {filteredRows.length > 0 && (
          <div className="text-center mt-4 sm:mt-5">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
              Menampilkan {paginatedRows.length} dari {filteredRows.length}{" "}
              siswa
            </p>
            {visibleCount < filteredRows.length && (
              <button
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-5 py-2.5 rounded-lg transition">
                Muat Lebih Banyak (
                {Math.min(PAGE_SIZE, filteredRows.length - visibleCount)})
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
