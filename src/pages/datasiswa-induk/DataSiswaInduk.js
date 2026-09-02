// pages/datasiswa-induk/DataSiswaInduk.js
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
import { supabase } from "../../supabaseClient";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Search,
  X,
  Users,
  FileDown,
  FileSpreadsheet,
  ShieldCheck,
  ShieldAlert,
  Pencil,
  Loader2,
} from "lucide-react";
import { exportStudentProfilePDF } from "./DataSiswaIndukPDF";
import { exportStudentProfileExcel } from "./DataSiswaIndukExcel";

// Field yang dianggap "wajib" buat status Lengkap. Samain persis sama
// field di form ProfileInfo (StudentProfile.js).
// ⚠️ UPDATE: `nama_ortu` udah gak dipake lagi di form (diganti nama_ayah +
// nama_ibu) dan emang gak pernah keisi lagi di DB -- sebelumnya bikin
// status siswa gak pernah bisa "Lengkap" walau udah isi semua data.
const REQUIRED_FIELDS = ["alamat", "no_hp", "nama_ayah", "nama_ibu", "no_hp_ortu"];

// Tentuin status kelengkapan 1 siswa berdasarkan row student_profile_details
// (bisa null kalau belum pernah isi sama sekali).
function getCompletionStatus(detail) {
  if (!detail) return "belum";
  const filledCount = REQUIRED_FIELDS.filter(
    (f) => detail[f] && String(detail[f]).trim() !== ""
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
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  sebagian: {
    label: "Sebagian",
    icon: AlertCircle,
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
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
// DataSiswaIndukPDF.js, biar field yang muncul di kartu expand & di PDF
// konsisten. `nama_ortu` (generic, lama) udah gak dipake di form
// StudentProfile.js -> diganti nama_ayah + nama_ibu.
// `combine: "ttl"` = gabungan tempat_lahir + tanggal_lahir jadi 1 baris.
// `keterangan` sempat sengaja di-exclude, tapi ternyata 16 siswa udah
// keisi datanya -- ditambahin balik di baris paling bawah biar keliatan.
const DETAIL_ROWS = [
  { key: "jenis_kelamin", label: "Jenis Kelamin" },
  { key: "ttl", label: "Tempat, Tanggal Lahir", combine: "ttl" },
  { key: "nisn", label: "NISN" },
  { key: "nik", label: "NIK Siswa" },
  { key: "no_kk", label: "No. Kartu Keluarga (KK)" },
  { key: "no_akta_lahir", label: "No. Akta Lahir" },
  { key: "agama", label: "Agama" },
  { key: "anak_ke", label: "Anak ke-" },
  { key: "sekolah_asal", label: "Sekolah Asal" },
  { key: "no_peserta_ujian", label: "No. Peserta Ujian" },
  { key: "no_ijazah", label: "No. Ijazah" },
  { key: "no_kip", label: "No. KIP" },
  { key: "no_daftar", label: "No. Pendaftaran" },
  { key: "alamat", label: "Alamat Lengkap" },
  { key: "dusun", label: "Dusun" },
  { key: "kode_pos", label: "Kode Pos" },
  { key: "no_hp", label: "No. HP Siswa" },
  { key: "nama_ayah", label: "Nama Lengkap Ayah" },
  { key: "nik_ayah", label: "NIK Ayah" },
  { key: "tempat_tgl_lahir_ayah", label: "Tempat, Tanggal Lahir Ayah" },
  { key: "pekerjaan_ayah", label: "Pekerjaan Ayah" },
  { key: "pendidikan_ayah", label: "Pendidikan Terakhir Ayah" },
  { key: "nama_ibu", label: "Nama Lengkap Ibu" },
  { key: "nik_ibu", label: "NIK Ibu" },
  { key: "tempat_tgl_lahir_ibu", label: "Tempat, Tanggal Lahir Ibu" },
  { key: "pekerjaan_ibu", label: "Pekerjaan Ibu" },
  { key: "pendidikan_ibu", label: "Pendidikan Terakhir Ibu" },
  { key: "no_hp_ortu", label: "No. HP Orang Tua/Wali" },
  // Sempat sengaja di-exclude nunggu keputusan purpose-nya -- ternyata 16
  // siswa udah keisi datanya, jadi ditambahin balik biar keliatan.
  { key: "keterangan", label: "Keterangan" },
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

const AGAMA_OPTIONS = ["Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Konghucu"];
const PENDIDIKAN_OPTIONS = ["SD", "SMP", "SMA", "D3", "S1", "S2"];

// Konfigurasi form edit admin -- SEMUA kolom student_profile_details bisa
// diedit dari sini (beda dari sisi siswa di StudentProfile.js yang sekarang
// cuma bisa isi field "Kelompok B"/kontak). "ttl" (gabungan tempat+tanggal
// lahir) dipecah lagi jadi 2 field terpisah (tempat_lahir, tanggal_lahir)
// buat form, karena kolom DB-nya emang 2 kolom beda.
// ⚠️ CATATAN NISN: kolom `nisn` di sini nulis ke
// `student_profile_details.nisn` (legacy). Sisi siswa (StudentProfile.js)
// nampilin NISN dari `students.nisn` (sumber resmi terbaru), BUKAN dari
// kolom ini. Jadi ngedit NISN di sini TIDAK bakal keliatan di portal siswa
// -- kalau NISN-nya salah/kosong, benerin langsung di tabel `students`
// (menu Data Siswa), bukan di sini.
// Label section dipakai buat heading pengelompokan di tab "Isi Data" &
// urutan section di tab "Preview". Urutan object ini yang nentuin urutan
// section muncul (siswa -> ayah -> ibu -> lainnya).
const ADMIN_EDIT_SECTIONS = {
  siswa: "Data Siswa",
  ayah: "Data Ayah",
  ibu: "Data Ibu",
  lainnya: "Kontak Orang Tua & Lainnya",
};

const ADMIN_EDIT_FIELDS = [
  {
    key: "jenis_kelamin",
    label: "Jenis Kelamin",
    type: "select",
    options: ["Laki-laki", "Perempuan"],
    section: "siswa",
  },
  { key: "tempat_lahir", label: "Tempat Lahir", type: "text", section: "siswa" },
  { key: "tanggal_lahir", label: "Tanggal Lahir", type: "date", section: "siswa" },
  {
    key: "nisn",
    label: "NISN (legacy, lihat catatan di atas)",
    type: "text",
    section: "siswa",
  },
  { key: "nik", label: "NIK Siswa", type: "text", section: "siswa" },
  { key: "no_kk", label: "No. Kartu Keluarga (KK)", type: "text", section: "siswa" },
  { key: "no_akta_lahir", label: "No. Akta Lahir", type: "text", section: "siswa" },
  {
    key: "agama",
    label: "Agama",
    type: "select",
    options: AGAMA_OPTIONS,
    section: "siswa",
  },
  { key: "anak_ke", label: "Anak ke-", type: "number", section: "siswa" },
  { key: "sekolah_asal", label: "Sekolah Asal", type: "text", section: "siswa" },
  {
    key: "no_peserta_ujian",
    label: "No. Peserta Ujian",
    type: "text",
    section: "siswa",
  },
  { key: "no_ijazah", label: "No. Ijazah", type: "text", section: "siswa" },
  { key: "no_kip", label: "No. KIP", type: "text", section: "siswa" },
  { key: "no_daftar", label: "No. Pendaftaran", type: "text", section: "siswa" },
  { key: "alamat", label: "Alamat Lengkap", type: "textarea", section: "siswa" },
  { key: "dusun", label: "Dusun", type: "text", section: "siswa" },
  { key: "kode_pos", label: "Kode Pos", type: "text", section: "siswa" },
  { key: "no_hp", label: "No. HP Siswa", type: "text", section: "siswa" },
  { key: "nama_ayah", label: "Nama Lengkap Ayah", type: "text", section: "ayah" },
  { key: "nik_ayah", label: "NIK Ayah", type: "text", section: "ayah" },
  {
    key: "tempat_tgl_lahir_ayah",
    label: "Tempat, Tanggal Lahir Ayah",
    type: "text",
    section: "ayah",
  },
  { key: "pekerjaan_ayah", label: "Pekerjaan Ayah", type: "text", section: "ayah" },
  {
    key: "pendidikan_ayah",
    label: "Pendidikan Terakhir Ayah",
    type: "select",
    options: PENDIDIKAN_OPTIONS,
    section: "ayah",
  },
  { key: "nama_ibu", label: "Nama Lengkap Ibu", type: "text", section: "ibu" },
  { key: "nik_ibu", label: "NIK Ibu", type: "text", section: "ibu" },
  {
    key: "tempat_tgl_lahir_ibu",
    label: "Tempat, Tanggal Lahir Ibu",
    type: "text",
    section: "ibu",
  },
  { key: "pekerjaan_ibu", label: "Pekerjaan Ibu", type: "text", section: "ibu" },
  {
    key: "pendidikan_ibu",
    label: "Pendidikan Terakhir Ibu",
    type: "select",
    options: PENDIDIKAN_OPTIONS,
    section: "ibu",
  },
  {
    key: "no_hp_ortu",
    label: "No. HP Orang Tua/Wali",
    type: "text",
    section: "lainnya",
  },
  { key: "keterangan", label: "Keterangan", type: "textarea", section: "lainnya" },
];

function emptyAdminForm(detail) {
  const form = {};
  ADMIN_EDIT_FIELDS.forEach(({ key }) => {
    form[key] = detail?.[key] ?? "";
  });
  return form;
}

function formatTanggalLahirSingkat(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getDate()} ${MONTH_NAMES_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

// Ambil nilai 1 baris detail buat kartu expand (support field gabungan
// "ttl" kayak di DataSiswaIndukPDF.js -> getRowValue).
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

export default function KelengkapanDataSiswa({ currentUser }) {
  const isAdmin = currentUser?.role === "admin";
  const isGuruBK = currentUser?.role === "guru_bk";
  // ✅ Guru BK dikasih akses penuh kayak admin — bisa liat & filter semua
  // kelas/jenjang, karena guru BK gak terikat 1 kelas walian aja.
  const hasFullAccess = isAdmin || isGuruBK;
  // Wali kelas (role "teacher" yang punya homeroom_class_id) tetap
  // ter-scope otomatis ke kelasnya sendiri, gak berubah dari sebelumnya.
  const isWaliKelas = currentUser?.role === "teacher" && !!currentUser?.homeroom_class_id;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalStudent, setModalStudent] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | lengkap | sebagian | belum
  // all | verified | unverified -- filter TERPISAH dari statusFilter
  // (kelengkapan) di atas, krn "udah lengkap" beda sama "udah diverifikasi".
  const [verifiedFilter, setVerifiedFilter] = useState("all");
  const [verifying, setVerifying] = useState(false);
  const [isEditingAdmin, setIsEditingAdmin] = useState(false);
  // "isi" = form input (dikelompokin per section), "preview" = ringkasan
  // read-only semua kolom dari isian form yang lagi diketik (live), biar
  // TU bisa cek ulang sebelum klik Simpan.
  const [adminFormTab, setAdminFormTab] = useState("isi");
  const [adminForm, setAdminForm] = useState(null);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [adminEditError, setAdminEditError] = useState(null);
  const [jenjangFilter, setJenjangFilter] = useState("all"); // all | "7" | "8" | "9"
  const [classOptions, setClassOptions] = useState([]); // [{ id: "7A", jenjang: "7" }, ...]
  const [classFilter, setClassFilter] = useState(
    hasFullAccess ? "all" : currentUser?.homeroom_class_id || "all"
  );

  // ====== SELEKSI SISWA UNTUK EXPORT PDF ======
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [exporting, setExporting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

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
          studentQuery = studentQuery.eq("class_id", currentUser.homeroom_class_id);
        }

        const [
          { data: students, error: studentErr },
          { data: details, error: detailErr },
          { data: activeYear },
        ] = await Promise.all([
          studentQuery,
          supabase
            .from("student_profile_details")
            // Semua kolom formulir (identitas kependudukan, dokumen, alamat
            // detail, data ortu) di-select semua sekarang -- sebelumnya cuma
            // 16 kolom "lama" yang narik, jadi field2 kayak NIK/No KK/Dusun/
            // NIK Ayah-Ibu dkk gak pernah nyampe ke kartu expand & Export
            // PDF walau udah kesimpen di DB. `nama_ortu` dibuang dari sini
            // karena udah gak dipake sama sekali (diganti nama_ayah+nama_ibu).
            // `keterangan` sempat SENGAJA di-exclude nunggu keputusan purpose
            // field-nya -- tapi ternyata 16 siswa udah keisi datanya, jadi
            // ditambahin balik biar gak ke-hidden dari admin/walikelas.
            // Purpose jangka panjangnya (admin-only? gabung CatatanSiswa.js?)
            // masih open, tapi visibilitas data yang UDAH ADA gak boleh nunggu.
            // `verified_at` = kolom baru buat status verifikasi admin (lihat
            // migrasi add_verified_at_student_profile_details.sql). null =
            // belum pernah diverifikasi / berubah lagi setelah diverifikasi
            // (StudentProfile.js otomatis reset ini ke null tiap kali siswa
            // save data baru -- lihat handleSubmit di sana).
            .select(
              "student_id, jenis_kelamin, tempat_lahir, tanggal_lahir, nisn, nik, no_kk, no_akta_lahir, agama, anak_ke, sekolah_asal, no_peserta_ujian, no_ijazah, no_kip, no_daftar, alamat, dusun, kode_pos, no_hp, no_hp_ortu, nama_ayah, nik_ayah, tempat_tgl_lahir_ayah, pekerjaan_ayah, pendidikan_ayah, nama_ibu, nik_ibu, tempat_tgl_lahir_ibu, pekerjaan_ibu, pendidikan_ibu, keterangan, updated_at, verified_at"
            ),
          supabase.from("academic_years").select("year").eq("is_active", true).limit(1),
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
          // biar DETAIL_ROWS (kartu expand) & DataSiswaIndukPDF.js yang
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
            // Status verifikasi (BEDA dari status kelengkapan di atas):
            // kelengkapan = "udah diisi apa belum", verifikasi = "udah
            // dicek admin/TU ke dokumen fisik apa belum & masih valid".
            // rawDetail null (belum pernah isi) otomatis gak verified.
            isVerified: !!rawDetail?.verified_at,
            verifiedAt: rawDetail?.verified_at || null,
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
          setClassOptions(uniqueClasses.map((c) => ({ id: c, jenjang: getJenjang(c) })));
        }
      } catch (err) {
        console.error("[KelengkapanDataSiswa] Gagal memuat data:", err);
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
        { total: 0, lengkap: 0, sebagian: 0, belum: 0 }
      ),
    [rows]
  );

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (verifiedFilter === "verified" && !r.isVerified) return false;
      if (verifiedFilter === "unverified" && r.isVerified) return false;
      if (jenjangFilter !== "all" && getJenjang(r.class_id) !== jenjangFilter) return false;
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
    return [...new Set(classOptions.map((c) => c.jenjang).filter(Boolean))].sort();
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
  }, [statusFilter, verifiedFilter, jenjangFilter, classFilter, search]);

  const paginatedRows = useMemo(
    () => filteredRows.slice(0, visibleCount),
    [filteredRows, visibleCount]
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

  // Export Excel pake selectedIds yang SAMA kayak export PDF, cuma manggil
  // fungsi & file yang beda (DataSiswaIndukExcel.js) -- gak perlu seleksi
  // terpisah, toolbar-nya juga digabung jadi 1 (lihat JSX toolbar di bawah).
  const handleExportExcel = async () => {
    const selectedRows = rows.filter((r) => selectedIds.has(r.id));
    if (selectedRows.length === 0) return;

    setExportingExcel(true);
    try {
      const result = await exportStudentProfileExcel(selectedRows, {
        academicYear,
      });
      if (!result.success) {
        setError(result.message || "Gagal export Excel.");
      }
    } finally {
      setExportingExcel(false);
    }
  };

  // Tandai/batalkan verifikasi 1 siswa. `verify=true` -> set verified_at =
  // sekarang (admin udah cocokin ke dokumen fisik). `verify=false` ->
  // batalin (verified_at = null), buat jaga-jaga kalau admin salah klik.
  // Update langsung ke `rows` & `modalStudent` (optimistic) biar UI
  // ke-update instan tanpa nunggu refetch penuh dari server.
  const handleToggleVerify = async (studentId, verify) => {
    setVerifying(true);
    try {
      const verifiedAt = verify ? new Date().toISOString() : null;
      const { error: verifyErr } = await supabase
        .from("student_profile_details")
        .update({ verified_at: verifiedAt })
        .eq("student_id", studentId);

      if (verifyErr) throw verifyErr;

      setRows((prev) =>
        prev.map((r) => (r.id === studentId ? { ...r, isVerified: verify, verifiedAt } : r))
      );
      setModalStudent((prev) =>
        prev && prev.id === studentId ? { ...prev, isVerified: verify, verifiedAt } : prev
      );
    } catch (err) {
      console.error("[KelengkapanDataSiswa] Gagal update verifikasi:", err);
      setError("Gagal menyimpan status verifikasi. Coba lagi.");
    } finally {
      setVerifying(false);
    }
  };

  // Admin nyimpen SEMUA field lewat form edit di modal (beda dari
  // handleToggleVerify yang cuma toggle 1 kolom verified_at). Upsert
  // langsung ke student_profile_details, sama kayak upsert di
  // StudentProfile.js sisi siswa -- bedanya field yang dikirim di sini
  // full semua (Kelompok A + B), bukan cuma Kelompok B.
  // verified_at otomatis di-set ke sekarang: karena yang isi/edit di sini
  // admin sendiri, datanya dianggap udah "terverifikasi" tanpa perlu
  // klik tombol verifikasi terpisah lagi setelahnya.
  const handleSaveAdminEdit = async (e) => {
    e.preventDefault();
    if (!modalStudent) return;
    setAdminEditError(null);
    setSavingAdmin(true);
    try {
      const verifiedAt = new Date().toISOString();
      const payload = {
        student_id: modalStudent.id,
        updated_at: verifiedAt,
        verified_at: verifiedAt,
      };
      ADMIN_EDIT_FIELDS.forEach(({ key, type }) => {
        const raw = adminForm[key];
        if (type === "number") {
          payload[key] = raw === "" ? null : Number(raw);
        } else {
          payload[key] = raw === "" ? null : raw;
        }
      });

      const { error: upsertErr } = await supabase
        .from("student_profile_details")
        .upsert(payload, { onConflict: "student_id" });

      if (upsertErr) throw upsertErr;

      // Update optimistic: gabungin field baru ke detail yang lama biar
      // kolom yang gak ada di ADMIN_EDIT_FIELDS (kalau ada) gak ke-drop.
      const newDetail = { ...(modalStudent.detail || {}), ...payload };
      const newStatus = getCompletionStatus(newDetail);

      setRows((prev) =>
        prev.map((r) =>
          r.id === modalStudent.id
            ? {
                ...r,
                detail: newDetail,
                status: newStatus,
                isVerified: true,
                verifiedAt,
              }
            : r
        )
      );
      setModalStudent((prev) =>
        prev
          ? {
              ...prev,
              detail: newDetail,
              status: newStatus,
              isVerified: true,
              verifiedAt,
            }
          : prev
      );
      setIsEditingAdmin(false);
    } catch (err) {
      console.error("[KelengkapanDataSiswa] Gagal simpan edit admin:", err);
      setAdminEditError("Gagal menyimpan data. Coba lagi.");
    } finally {
      setSavingAdmin(false);
    }
  };

  const closeModal = () => {
    setModalStudent(null);
    setIsEditingAdmin(false);
    setAdminForm(null);
    setAdminEditError(null);
    setAdminFormTab("isi");
  };

  const openAdminEdit = () => {
    setAdminForm(emptyAdminForm(modalStudent?.detail));
    setAdminEditError(null);
    setAdminFormTab("isi");
    setIsEditingAdmin(true);
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
              Pantau siswa/orang tua yang sudah & belum melengkapi data alamat dan kontak.
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
                onClick={() => setStatusFilter((f) => (f === key ? "all" : key))}
                className={`bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-md p-3 sm:p-4 border text-center transition ${
                  statusFilter === key
                    ? "border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-900"
                    : "border-slate-100 dark:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-center mb-2">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-md ${meta.dot}`}
                  >
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
        {/* Semua kontrol filter (Cari Siswa, Pilih Jenjang, Pilih Kelas,
            Reset) digabung jadi 1 baris. Cari Siswa fleksibel (flex-1),
            dropdown & tombol reset lebar tetap (shrink-0). Kalau kepotong
            di layar sempit, baris ini scroll horizontal. */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-md p-3 sm:p-4 border border-slate-100 dark:border-slate-700 mb-4 flex flex-col gap-3">
          <div className="flex flex-nowrap items-end gap-2 sm:gap-3 overflow-x-auto">
            <div className="flex-1 min-w-[160px]">
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

            <div className="shrink-0 min-w-[150px]">
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Status Verifikasi
              </label>
              <select
                value={verifiedFilter}
                onChange={(e) => setVerifiedFilter(e.target.value)}
                className="w-full text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
              >
                <option value="all">Semua</option>
                <option value="verified">Terverifikasi</option>
                <option value="unverified">Belum Diverifikasi</option>
              </select>
            </div>

            {hasFullAccess && (jenjangOptions.length > 0 || filteredClassOptions.length > 0) && (
              <>
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
                      className="w-full text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
                    >
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
                      className="w-full text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
                    >
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
                  verifiedFilter !== "all" ||
                  jenjangFilter !== "all" ||
                  classFilter !== "all") && (
                  <div className="shrink-0">
                    <span className="block text-[11px] mb-1 invisible">Reset</span>
                    <button
                      onClick={() => {
                        setStatusFilter("all");
                        setVerifiedFilter("all");
                        setJenjangFilter("all");
                        setClassFilter(
                          hasFullAccess ? "all" : currentUser?.homeroom_class_id || "all"
                        );
                      }}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-2 rounded-lg whitespace-nowrap"
                    >
                      Reset Filter
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Wali kelas (gak hasFullAccess) tetap bisa reset status filter
              aja, taruh di baris sendiri karena gak ada dropdown Jenjang/Kelas. */}
          {!hasFullAccess && (statusFilter !== "all" || verifiedFilter !== "all") && (
            <div>
              <button
                onClick={() => {
                  setStatusFilter("all");
                  setVerifiedFilter("all");
                }}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-2 rounded-lg whitespace-nowrap"
              >
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

            {/* Export PDF & Excel digabung di toolbar yang sama, pake
                selectedIds yang sama juga -- cuma format file-nya beda. */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportPDF}
                disabled={selectedIds.size === 0 || exporting || exportingExcel}
                className="flex items-center gap-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed px-4 py-2 rounded-lg shadow-sm transition"
              >
                <FileDown size={16} />
                {exporting
                  ? "Membuat PDF..."
                  : `PDF${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`}
              </button>

              <button
                onClick={handleExportExcel}
                disabled={selectedIds.size === 0 || exporting || exportingExcel}
                className="flex items-center gap-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed px-4 py-2 rounded-lg shadow-sm transition"
              >
                <FileSpreadsheet size={16} />
                {exportingExcel
                  ? "Membuat Excel..."
                  : `Excel${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`}
              </button>
            </div>
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

              return (
                <div
                  key={r.id}
                  className={`bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border shadow-sm overflow-hidden transition ${
                    selectedIds.has(r.id)
                      ? "border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-100 dark:ring-indigo-900/50"
                      : "border-slate-100 dark:border-slate-700"
                  }`}
                >
                  <div className="w-full flex items-center gap-3 p-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r.id)}
                      onChange={() => toggleSelectOne(r.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 shrink-0 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-400"
                    />
                    {/* Klik nama siswa buka modal detail, bukan expand
                        inline lagi -- biar list gak makin panjang ke bawah
                        walau banyak yang dibuka. */}
                    <button
                      onClick={() => {
                        setModalStudent(r);
                        setIsEditingAdmin(false);
                      }}
                      className="flex-1 min-w-0 flex items-center justify-between gap-3 text-left"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {r.full_name}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          NIS {r.nis || "-"} · Kelas {r.class_id || "-"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {r.isVerified && (
                          <span
                            title="Terverifikasi Admin"
                            className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
                          >
                            <ShieldCheck size={13} />
                          </span>
                        )}
                        <span
                          className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${meta.badge}`}
                        >
                          <StatusIcon size={13} />
                          {meta.label}
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ====== MUAT LEBIH BANYAK (PAGINATION) ====== */}
        {filteredRows.length > 0 && (
          <div className="text-center mt-4 sm:mt-5">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
              Menampilkan {paginatedRows.length} dari {filteredRows.length} siswa
            </p>
            {visibleCount < filteredRows.length && (
              <button
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-5 py-2.5 rounded-lg transition"
              >
                Muat Lebih Banyak ({Math.min(PAGE_SIZE, filteredRows.length - visibleCount)})
              </button>
            )}
          </div>
        )}
      </div>

      {/* ====== MODAL DETAIL SISWA ====== */}
      {/* Ganti expand-inline yang lama: sekarang detail siswa muncul di
          modal terpusat, jadi list di belakang gak makin panjang walau
          banyak siswa yang dibuka satu-satu. */}
      {modalStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header modal (sticky, gak ikut scroll) */}
            <div className="flex items-start justify-between gap-3 p-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {modalStudent.full_name}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
                  NIS {modalStudent.nis || "-"} · Kelas {modalStudent.class_id || "-"}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {(() => {
                    const meta = STATUS_META[modalStudent.status];
                    const StatusIcon = meta.icon;
                    return (
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${meta.badge}`}
                      >
                        <StatusIcon size={13} />
                        {meta.label}
                      </span>
                    );
                  })()}
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      modalStudent.isVerified
                        ? "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                    }`}
                  >
                    {modalStudent.isVerified ? (
                      <ShieldCheck size={13} />
                    ) : (
                      <ShieldAlert size={13} />
                    )}
                    {modalStudent.isVerified ? "Terverifikasi Admin" : "Belum Diverifikasi"}
                  </span>
                </div>
                {/* Tombol verifikasi cuma buat admin -- wali kelas/guru BK
                    liat status ini tapi gak nge-verifikasi (cocokin ke
                    dokumen fisik itu tugas TU/admin sekolah). */}
                {isAdmin && modalStudent.detail && (
                  <button
                    onClick={() => handleToggleVerify(modalStudent.id, !modalStudent.isVerified)}
                    disabled={verifying}
                    className={`mt-2 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-60 transition ${
                      modalStudent.isVerified
                        ? "text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
                        : "text-white bg-sky-600 hover:bg-sky-700"
                    }`}
                  >
                    {modalStudent.isVerified ? (
                      <>
                        <ShieldAlert size={14} />
                        {verifying ? "Menyimpan..." : "Batalkan Verifikasi"}
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={14} />
                        {verifying ? "Menyimpan..." : "Tandai Terverifikasi"}
                      </>
                    )}
                  </button>
                )}
                {/* Edit Semua Data: admin bisa isi/ubah langsung SEMUA
                    kolom (Kelompok A + B), gak cuma yang wajib. Beda dari
                    tombol verifikasi di atas yang cuma toggle 1 kolom. */}
                {isAdmin && !isEditingAdmin && (
                  <button
                    onClick={openAdminEdit}
                    className="mt-2 ml-2 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition"
                  >
                    <Pencil size={14} />
                    Edit Semua Data
                  </button>
                )}
              </div>
              <button
                onClick={closeModal}
                aria-label="Tutup"
                className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Isi detail (yang ini aja yang scroll kalau kepanjangan) */}
            <div className="p-4 overflow-y-auto">
              {isEditingAdmin ? (
                <form onSubmit={handleSaveAdminEdit} className="space-y-3">
                  {adminEditError && (
                    <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-3 py-2 rounded-lg text-sm">
                      {adminEditError}
                    </div>
                  )}

                  {/* Tab switcher: "Isi Data" (input, dikelompokin per
                      section) vs "Preview" (ringkasan semua kolom dari
                      isian yang lagi diketik -- belum tentu udah kesimpen
                      ke DB). Ini murni UI, gak ngaruh ke data/logic simpan. */}
                  <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
                    {[
                      { key: "isi", label: "Isi Data" },
                      { key: "preview", label: "Preview" },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setAdminFormTab(tab.key)}
                        className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px transition ${
                          adminFormTab === tab.key
                            ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                            : "border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {adminFormTab === "isi" ? (
                    <div className="space-y-4 pt-1">
                      {Object.entries(ADMIN_EDIT_SECTIONS).map(([sectionKey, sectionLabel]) => {
                        const sectionFields = ADMIN_EDIT_FIELDS.filter(
                          (f) => f.section === sectionKey
                        );
                        if (sectionFields.length === 0) return null;
                        return (
                          <div key={sectionKey}>
                            <p className="text-xs font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400 mb-2">
                              {sectionLabel}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                              {sectionFields.map(({ key, label, type, options }) => {
                                const fieldInputClass =
                                  "w-full text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 focus:border-indigo-300";
                                const wrapperClass = type === "textarea" ? "sm:col-span-2" : "";
                                const value = adminForm?.[key] ?? "";
                                const onChange = (v) =>
                                  setAdminForm((f) => ({
                                    ...f,
                                    [key]: v,
                                  }));
                                // Tanda field yang ikut nentuin status
                                // Lengkap/Sebagian/Belum (REQUIRED_FIELDS),
                                // biar TU tau mana yang prioritas.
                                const isRequired = REQUIRED_FIELDS.includes(key);

                                return (
                                  <div key={key} className={wrapperClass}>
                                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                                      {label}
                                      {isRequired && (
                                        <span
                                          className="text-rose-500 ml-0.5"
                                          title="Wajib diisi untuk status Lengkap"
                                        >
                                          *
                                        </span>
                                      )}
                                    </label>
                                    {type === "select" ? (
                                      <select
                                        value={value}
                                        onChange={(e) => onChange(e.target.value)}
                                        className={fieldInputClass}
                                      >
                                        <option value="">Pilih {label.toLowerCase()}</option>
                                        {options.map((opt) => (
                                          <option key={opt} value={opt}>
                                            {opt}
                                          </option>
                                        ))}
                                      </select>
                                    ) : type === "textarea" ? (
                                      <textarea
                                        rows={2}
                                        value={value}
                                        onChange={(e) => onChange(e.target.value)}
                                        className={fieldInputClass}
                                      />
                                    ) : (
                                      <input
                                        type={type}
                                        value={value}
                                        onChange={(e) => onChange(e.target.value)}
                                        className={fieldInputClass}
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        <span className="text-rose-500">*</span> wajib diisi biar status kelengkapan
                        siswa jadi "Lengkap".
                      </p>
                    </div>
                  ) : (
                    // ====== TAB PREVIEW ======
                    // Ringkasan semua kolom dalam format read-only, sumbernya
                    // dari `adminForm` (isian yang lagi diketik) BUKAN dari
                    // modalStudent.detail (data lama yang udah kesimpen) --
                    // jadi TU beneran ngecek apa yang BAKAL kesimpen kalau
                    // klik Simpan. Pakai DETAIL_ROWS & getDetailRowValue yang
                    // sama kayak tampilan detail biasa, biar layoutnya
                    // konsisten.
                    <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 divide-y sm:divide-y-0 divide-slate-100 dark:divide-slate-700">
                      {DETAIL_ROWS.map(({ key, label, combine } = {}) => {
                        const value = getDetailRowValue(adminForm, {
                          key,
                          combine,
                        });
                        return (
                          <div
                            key={key}
                            className="flex items-start justify-between py-2 gap-3 border-b border-slate-100 dark:border-slate-700 sm:border-b-0 sm:py-2.5"
                          >
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">
                              {label}
                            </span>
                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 text-right break-words">
                              {value || (
                                <span className="text-rose-500 font-medium">Belum diisi</span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingAdmin(false)}
                      className="flex-1 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 py-2.5 rounded-lg"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={savingAdmin}
                      className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-60"
                    >
                      {savingAdmin && <Loader2 size={16} className="animate-spin" />}
                      {savingAdmin ? "Menyimpan..." : "Simpan"}
                    </button>
                  </div>
                </form>
              ) : modalStudent.detail ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 divide-y sm:divide-y-0 divide-slate-100 dark:divide-slate-700">
                  {DETAIL_ROWS.map(({ key, label, combine } = {}) => {
                    const value = getDetailRowValue(modalStudent.detail, {
                      key,
                      combine,
                    });
                    return (
                      <div
                        key={key}
                        className="flex items-start justify-between py-2 gap-3 border-b border-slate-100 dark:border-slate-700 sm:border-b-0 sm:py-2.5"
                      >
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">
                          {label}
                        </span>
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 text-right break-words">
                          {value || <span className="text-rose-500 font-medium">Belum diisi</span>}
                        </span>
                      </div>
                    );
                  })}
                  {modalStudent.detail.updated_at && (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-2 sm:col-span-2">
                      Terakhir diperbarui:{" "}
                      {new Date(modalStudent.detail.updated_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  )}
                  {modalStudent.verifiedAt && (
                    <p className="text-[11px] text-sky-600 dark:text-sky-400 pt-0.5 sm:col-span-2">
                      Diverifikasi oleh Admin:{" "}
                      {new Date(modalStudent.verifiedAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 space-y-3">
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    Siswa ini belum pernah mengisi data tambahan sama sekali.
                  </p>
                  {isAdmin && (
                    <button
                      onClick={openAdminEdit}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition"
                    >
                      <Pencil size={14} />
                      Isi Data Sekarang
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
