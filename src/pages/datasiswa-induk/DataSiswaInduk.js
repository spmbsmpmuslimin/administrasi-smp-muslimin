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
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  ArrowUpRight,
} from "lucide-react";
import { exportStudentProfilePDF } from "./DataSiswaIndukPDF";
import { exportStudentProfileExcel } from "./DataSiswaIndukExcel";
import {
  REQUIRED_FIELDS,
  getCompletionStatus,
  resolveCompletion,
} from "../../utils/studentProfileCompletion";

// REQUIRED_FIELDS, getCompletionStatus, genderCodeToLabel (lewat
// resolveCompletion) sekarang diimport dari utils/studentProfileCompletion.js
// -- dipake bareng sama halaman Data Siswa (badge kelengkapan) biar status
// kelengkapan SELALU sama persis di kedua halaman.

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
  // `dusun` SENGAJA gak dimasukin lagi -- kolomnya dibiarin ada di DB
  // (data lama), tapi udah gak dimunculin di UI manapun (konsisten sama
  // StudentProfile.js & useStudentProfile.js sisi siswa) karena
  // purpose-nya gak jelas & isinya biasanya udah nempel di teks `alamat`.
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

const AGAMA_OPTIONS = ["ISLAM", "KRISTEN", "KATOLIK", "HINDU", "BUDDHA", "KONGHUCU"];
const PENDIDIKAN_OPTIONS = ["SD", "SMP", "SMA", "D3", "S1", "S2"];

// Daftar pekerjaan standar -- SENGAJA disamain persis sama
// pekerjaanListAyah/pekerjaanListIbu di StudentForm.js (form pendaftaran
// siswa baru), biar pilihan yang muncul di admin sini konsisten sama yang
// dipilih ortu pas awal daftar. Bedanya di sini gak ada input "Lainnya"
// terpisah (StudentForm.js punya field _lainnya sendiri) -- kalau isian
// lama gak ada di daftar (misal ketikan bebas dari sebelum ada dropdown),
// field select otomatis nambahin isian lama itu jadi 1 opsi ekstra di
// bagian atas, jadi datanya TETAP KELIATAN & gak ke-reset ke kosong tanpa
// sengaja pas dibuka (lihat pemakaian `hasLegacyValue` di form Isi Data).
const PEKERJAAN_AYAH_OPTIONS = [
  "PNS/TNI/POLRI",
  "KARYAWAN SWASTA",
  "WIRASWASTA/PEDAGANG",
  "PETANI",
  "BURUH HARIAN",
  "GURU/DOSEN",
  "DOKTER/TENAGA KESEHATAN",
  "SOPIR/DRIVER",
  "PENSIUNAN",
  "TIDAK BEKERJA",
  "LAINNYA",
];
const PEKERJAAN_IBU_OPTIONS = [
  "IBU RUMAH TANGGA",
  "PNS/TNI/POLRI",
  "KARYAWAN SWASTA",
  "WIRASWASTA/PEDAGANG",
  "PETANI",
  "BURUH",
  "GURU/DOSEN",
  "DOKTER/TENAGA KESEHATAN",
  "PENSIUNAN",
  "TIDAK BEKERJA",
  "LAINNYA",
];

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
  { key: "anak_ke", label: "Anak Ke Berapa dalam Keluarga", type: "number", section: "siswa" },
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
  {
    key: "pekerjaan_ayah",
    label: "Pekerjaan Ayah",
    type: "select",
    options: PEKERJAAN_AYAH_OPTIONS,
    section: "ayah",
  },
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
  {
    key: "pekerjaan_ibu",
    label: "Pekerjaan Ibu",
    type: "select",
    options: PEKERJAAN_IBU_OPTIONS,
    section: "ibu",
  },
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

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [mutationHistory, setMutationHistory] = useState([]);
  const [mutationHistoryLoading, setMutationHistoryLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | lengkap | sebagian | belum
  // all | verified | unverified -- filter TERPISAH dari statusFilter
  // (kelengkapan) di atas, krn "udah lengkap" beda sama "udah diverifikasi".
  const [verifiedFilter, setVerifiedFilter] = useState("all");
  const [verifying, setVerifying] = useState(false);
  // ====== TAB HALAMAN UTAMA ======
  // "list"    = list/filter siswa (tampilan default)
  // "isi"     = form edit (admin only) buat selectedStudent
  // "preview" = ringkasan read-only buat selectedStudent (semua role bisa
  //             liat, isinya dari `adminForm` yang sama dipakai tab "isi",
  //             jadi utk non-admin otomatis nampilin data tersimpan apa
  //             adanya krn mereka gak bisa ngubah adminForm).
  const [activePageTab, setActivePageTab] = useState("list");
  const [adminForm, setAdminForm] = useState(null);
  // True kalau ada perubahan di form yang belum di-klik Simpan -- dipake
  // buat munculin konfirmasi sebelum TU pindah tab/siswa lain & kehilangan
  // perubahan gak sengaja.
  const [adminFormDirty, setAdminFormDirty] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [adminEditError, setAdminEditError] = useState(null);
  // Notif sukses sementara di tab "Isi Data" setelah klik Simpan (TU tetap
  // di tab yang sama, gak auto-pindah ke list).
  const [saveSuccessVisible, setSaveSuccessVisible] = useState(false);
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
              "student_id, jenis_kelamin, tempat_lahir, tanggal_lahir, nisn, nik, no_kk, no_akta_lahir, agama, anak_ke, sekolah_asal, no_peserta_ujian, no_ijazah, no_kip, no_daftar, alamat, kode_pos, no_hp, no_hp_ortu, nama_ayah, nik_ayah, tempat_tgl_lahir_ayah, pekerjaan_ayah, pendidikan_ayah, nama_ibu, nik_ibu, tempat_tgl_lahir_ibu, pekerjaan_ibu, pendidikan_ibu, keterangan, updated_at, verified_at"
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

          // resolveCompletion: prioritas jenis_kelamin dari students.gender
          // (kode P/L, dikonversi ke label penuh) dulu, fallback ke
          // student_profile_details.jenis_kelamin (form siswa) kalau
          // students.gender kosong/gak valid -- hasil gabungannya dipake
          // buat DETAIL_ROWS (kartu expand), DataSiswaIndukPDF.js, DAN
          // status kelengkapan sekaligus (jenis_kelamin ada di
          // REQUIRED_FIELDS, jadi siswa yang gender-nya udah keisi lewat
          // students.gender tetep ke-anggep "keisi" buat field ini).
          const { detail, status } = resolveCompletion(s.gender, rawDetail);

          return {
            ...s,
            detail,
            status,
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
  // Update langsung ke `rows` & `selectedStudent` (optimistic) biar UI
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
      setSelectedStudent((prev) =>
        prev && prev.id === studentId ? { ...prev, isVerified: verify, verifiedAt } : prev
      );
    } catch (err) {
      console.error("[KelengkapanDataSiswa] Gagal update verifikasi:", err);
      setError("Gagal menyimpan status verifikasi. Coba lagi.");
    } finally {
      setVerifying(false);
    }
  };

  // Admin nyimpen SEMUA field lewat form edit di tab "Isi Data" (beda dari
  // handleToggleVerify yang cuma toggle 1 kolom verified_at). Upsert
  // langsung ke student_profile_details, sama kayak upsert di
  // StudentProfile.js sisi siswa -- bedanya field yang dikirim di sini
  // full semua (Kelompok A + B), bukan cuma Kelompok B.
  // verified_at otomatis di-set ke sekarang: karena yang isi/edit di sini
  // admin sendiri, datanya dianggap udah "terverifikasi" tanpa perlu
  // klik tombol verifikasi terpisah lagi setelahnya.
  // Setelah sukses, TU TETAP di tab "Isi Data" (gak auto-pindah ke list) --
  // cuma munculin notif sukses sebentar, biar bisa lanjut ngecek di tab
  // Preview atau langsung ngedit siswa lain lewat "Kembali ke Data Siswa".
  const handleSaveAdminEdit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setAdminEditError(null);
    setSaveSuccessVisible(false);
    setSavingAdmin(true);
    try {
      const verifiedAt = new Date().toISOString();
      const payload = {
        student_id: selectedStudent.id,
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
      const newDetail = { ...(selectedStudent.detail || {}), ...payload };
      const newStatus = getCompletionStatus(newDetail);

      setRows((prev) =>
        prev.map((r) =>
          r.id === selectedStudent.id
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
      setSelectedStudent((prev) =>
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
      setAdminFormDirty(false);
      setSaveSuccessVisible(true);
    } catch (err) {
      console.error("[KelengkapanDataSiswa] Gagal simpan edit admin:", err);
      setAdminEditError("Gagal menyimpan data. Coba lagi.");
    } finally {
      setSavingAdmin(false);
    }
  };

  // Kalau ada perubahan belum disimpan (adminFormDirty), minta konfirmasi
  // dulu sebelum TU pindah tab/kembali ke list/ganti siswa lain -- biar
  // gak kehilangan isian gak sengaja. Dipanggil di tiap titik navigasi
  // keluar dari tab "Isi Data".
  const confirmDiscardIfDirty = () => {
    if (!adminFormDirty) return true;
    return window.confirm("Perubahan belum disimpan. Yakin mau keluar tanpa menyimpan?");
  };

  // Buka 1 siswa: isi adminForm dari detail-nya (buat sumber data tab Isi
  // Data & Preview), lalu langsung arahkan ke tab yang sesuai role --
  // admin/TU ke "Isi Data" (bisa langsung ngedit), wali kelas/guru BK
  // (gak punya akses edit) langsung ke "Preview" (read-only).
  const openStudent = (student) => {
    setSelectedStudent(student);
    setAdminForm(emptyAdminForm(student.detail));
    setAdminEditError(null);
    setAdminFormDirty(false);
    setSaveSuccessVisible(false);
    setActivePageTab(isAdmin ? "isi" : "preview");
  };

  // Riwayat mutasi (masuk/keluar) siswa yang lagi dibuka -- cuma info,
  // gak bisa diedit dari sini. Reset dulu tiap ganti siswa biar gak
  // sempet numpuk data siswa sebelumnya pas fetch masih jalan.
  useEffect(() => {
    if (!selectedStudent?.id) {
      setMutationHistory([]);
      return;
    }
    let cancelled = false;
    setMutationHistory([]);
    setMutationHistoryLoading(true);
    supabase
      .from("student_mutations")
      .select("*")
      .eq("student_id", selectedStudent.id)
      .order("mutation_date", { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) {
          console.error("Error fetching student_mutations:", fetchError);
          return;
        }
        setMutationHistory(data || []);
      })
      .finally(() => {
        if (!cancelled) setMutationHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedStudent?.id]);

  // ===== Deep-link dari halaman "Data Siswa" (?student=<id>) =====
  // Begitu `rows` selesai kemuat, cek apakah halaman ini dibuka lewat link
  // dari Students.js. Kalau iya & siswanya ketemu, langsung buka detailnya
  // (tanpa TU harus cari manual lagi). Cuma jalan sekali per kunjungan.
  const appliedDeepLinkRef = useRef(false);
  useEffect(() => {
    if (appliedDeepLinkRef.current) return;
    if (!rows.length) return;
    const studentIdParam = searchParams.get("student");
    if (!studentIdParam) return;

    const match = rows.find((r) => String(r.id) === String(studentIdParam));
    appliedDeepLinkRef.current = true;
    setSearchParams({}, { replace: true });
    if (match) {
      openStudent(match);
    }
  }, [rows, searchParams, setSearchParams]);

  // Balik ke halaman "Data Siswa" (Students.js) buat siswa yang lagi
  // dibuka -- BEDA dari backToList (yang cuma balik ke tab list internal
  // halaman ini). Kirim NIS lewat query param biar Students.js otomatis
  // filter ke siswa yang sama.
  const goToDataSiswa = () => {
    if (!confirmDiscardIfDirty()) return;
    const nis = selectedStudent?.nis;
    navigate(nis ? `/students?search=${encodeURIComponent(nis)}` : "/students");
  };

  // Balik ke tab "Data Siswa" (list). Kalau lagi di tab Isi Data & ada
  // perubahan belum disimpan, minta konfirmasi dulu.
  const backToList = () => {
    if (!confirmDiscardIfDirty()) return;
    setSelectedStudent(null);
    setAdminForm(null);
    setAdminEditError(null);
    setAdminFormDirty(false);
    setSaveSuccessVisible(false);
    setActivePageTab("list");
  };

  // Ganti tab level-halaman (dipanggil dari tab bar). Klik tab "Data
  // Siswa" == backToList (ada guard dirty). Klik "Isi Data"/"Preview"
  // cuma jalan kalau udah ada selectedStudent (kalau belum, tab-nya emang
  // di-disable di UI, tapi guard di sini jaga-jaga juga).
  const goToTab = (tabKey) => {
    if (tabKey === "list") {
      backToList();
      return;
    }
    if (!selectedStudent) return;
    setActivePageTab(tabKey);
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
              Kelengkapan Data Siswa Induk
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mt-1 text-sm">
              Pantau Siswa/Orang Tua Yang Sudah & Belum Melengkapi Data Alamat Dan Kontak.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-5">
            ⚠️ {error}
          </div>
        )}

        {/* ====== TAB HALAMAN UTAMA ====== */}
        {/* Ganti sistem modal yang lama: sekarang navigasi antar "Data
            Siswa" (list) <-> "Isi Data" (form edit, admin only) <->
            "Preview" (ringkasan read-only) pake tab di level halaman, biar
            keliatan jelas lagi ngapain (isi data vs cuma liat), bukan
            numpuk semua di 1 modal kecil. */}
        <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700 mb-5 sm:mb-6 overflow-x-auto">
          {[
            { key: "list", label: "Data Siswa" },
            ...(isAdmin ? [{ key: "isi", label: "Isi Data" }] : []),
            { key: "preview", label: "Preview" },
          ].map((tab) => {
            // Tab "isi" & "preview" nonaktif selama belum ada siswa yang
            // dipilih dari list -- gak masuk akal nampilin form/ringkasan
            // kosong tanpa konteks siswa mana.
            const disabled = tab.key !== "list" && !selectedStudent;
            const active = activePageTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                disabled={disabled}
                onClick={() => goToTab(tab.key)}
                title={disabled ? "Pilih siswa dulu dari tab Data Siswa" : undefined}
                className={`shrink-0 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition ${
                  active
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                    : disabled
                      ? "border-transparent text-slate-300 dark:text-slate-600 cursor-not-allowed"
                      : "border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
              >
                {tab.label}
                {tab.key !== "list" && selectedStudent && (
                  <span className="hidden sm:inline text-xs font-normal text-slate-400 dark:text-slate-500">
                    {" "}
                    · {selectedStudent.full_name}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {activePageTab === "list" && (
          <>
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

                {hasFullAccess &&
                  (jenjangOptions.length > 0 || filteredClassOptions.length > 0) && (
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
                        {/* Klik nama siswa: admin/TU langsung ke tab "Isi
                        Data", wali kelas/guru BK ke tab "Preview" (lihat
                        openStudent). */}
                        <button
                          onClick={() => openStudent(r)}
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
          </>
        )}
      </div>

      {/* ====== HEADER SISWA TERPILIH ====== */}
      {/* Dipake bareng sama tab "Isi Data" & "Preview" -- nampilin siapa
          yang lagi dibuka, status kelengkapan & verifikasi, tombol
          verifikasi (admin only), sama tombol balik ke list. Ganti dari
          header modal yang lama, sekarang jadi bagian halaman biasa. */}
      {selectedStudent && (activePageTab === "isi" || activePageTab === "preview") && (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-md p-4 border border-slate-100 dark:border-slate-700 mb-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-lg font-bold text-slate-900 dark:text-white truncate">
                {selectedStudent.full_name}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                NIS {selectedStudent.nis || "-"} · Kelas {selectedStudent.class_id || "-"}
              </p>
              {/* Status kelengkapan, status verifikasi, & tombol verifikasi
                  digabung jadi 1 baris (wrap kalau kepotong di layar
                  sempit) -- lebih ringkas & enak diliat berkali-kali
                  dibanding numpuk ke bawah, apalagi TU bakal buka ratusan
                  siswa jadi UI-nya kudu betah dipandang. */}
              <div className="flex flex-wrap items-center gap-2">
                {(() => {
                  const meta = STATUS_META[selectedStudent.status];
                  const StatusIcon = meta.icon;
                  return (
                    <span
                      className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full shadow-sm ${meta.badge}`}
                    >
                      <StatusIcon size={14} />
                      {meta.label}
                    </span>
                  );
                })()}
                <span
                  className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full shadow-sm ${
                    selectedStudent.isVerified
                      ? "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                  }`}
                >
                  {selectedStudent.isVerified ? (
                    <ShieldCheck size={14} />
                  ) : (
                    <ShieldAlert size={14} />
                  )}
                  {selectedStudent.isVerified ? "Terverifikasi Admin" : "Belum Diverifikasi"}
                </span>
                {/* Tombol verifikasi cuma buat admin -- wali kelas/guru BK
                    liat status ini tapi gak nge-verifikasi (cocokin ke
                    dokumen fisik itu tugas TU/admin sekolah). */}
                {isAdmin && selectedStudent.detail && (
                  <button
                    onClick={() =>
                      handleToggleVerify(selectedStudent.id, !selectedStudent.isVerified)
                    }
                    disabled={verifying}
                    className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full shadow-sm disabled:opacity-60 disabled:hover:scale-100 hover:scale-105 active:scale-95 transition-transform ${
                      selectedStudent.isVerified
                        ? "text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
                        : "text-white bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-700 hover:to-sky-600"
                    }`}
                  >
                    {selectedStudent.isVerified ? (
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
              </div>
            </div>
            <div className="shrink-0 flex flex-wrap items-center gap-2">
              <button
                onClick={goToDataSiswa}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-3 py-2 rounded-lg transition"
              >
                <ArrowUpRight size={15} />
                Buka di Data Siswa
              </button>
              <button
                onClick={backToList}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 px-3 py-2 rounded-lg transition"
              >
                <X size={15} />
                Kembali ke Data Siswa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Riwayat mutasi (masuk/keluar) -- cuma nongol kalau siswa ini
          emang punya catatan mutasi. Siswa reguler yang gak pernah
          keluar/pindah gak bakal liat card ini sama sekali. */}
      {selectedStudent &&
        (activePageTab === "isi" || activePageTab === "preview") &&
        (mutationHistoryLoading || mutationHistory.length > 0) && (
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-md p-4 border border-slate-100 dark:border-slate-700 mb-4">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
              Riwayat Mutasi
            </p>
            {mutationHistoryLoading ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">Memuat...</p>
            ) : (
              <div className="space-y-2">
                {mutationHistory.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-start gap-2 text-sm p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/40"
                  >
                    <span
                      className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        m.type === "masuk"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                      }`}
                    >
                      {m.type === "masuk" ? "Masuk" : "Keluar"}
                    </span>
                    <div className="min-w-0">
                      <p className="text-slate-700 dark:text-slate-200">
                        {m.mutation_date
                          ? new Date(m.mutation_date).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })
                          : "-"}
                        {m.type === "masuk" && m.sekolah_asal && <> · dari {m.sekolah_asal}</>}
                        {m.type === "keluar" && m.sekolah_tujuan && <> · ke {m.sekolah_tujuan}</>}
                      </p>
                      {m.keterangan && (
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                          {m.keterangan}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      {/* ====== TAB "ISI DATA" (admin only) ====== */}
      {activePageTab === "isi" && selectedStudent && isAdmin && (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-md p-4 sm:p-5 border border-slate-100 dark:border-slate-700">
          <form onSubmit={handleSaveAdminEdit} className="space-y-3">
            {adminEditError && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-3 py-2 rounded-lg text-sm">
                {adminEditError}
              </div>
            )}
            {saveSuccessVisible && (
              <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                <CheckCircle2 size={16} />
                Data berhasil disimpan.
              </div>
            )}

            <div className="space-y-4">
              {Object.entries(ADMIN_EDIT_SECTIONS).map(([sectionKey, sectionLabel]) => {
                const sectionFields = ADMIN_EDIT_FIELDS.filter((f) => f.section === sectionKey);
                if (sectionFields.length === 0) return null;
                return (
                  <div key={sectionKey}>
                    <p className="text-xs font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400 mb-2">
                      {sectionLabel}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                      {sectionFields.map(({ key, label, type, options }) => {
                        const fieldInputClass =
                          "w-full text-sm sm:text-base border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/40 focus:border-indigo-400 transition";
                        const wrapperClass = type === "textarea" ? "sm:col-span-2" : "";
                        const value = adminForm?.[key] ?? "";
                        const onChange = (v) => {
                          setAdminForm((f) => ({ ...f, [key]: v }));
                          setAdminFormDirty(true);
                          setSaveSuccessVisible(false);
                        };
                        // Tanda field yang ikut nentuin status
                        // Lengkap/Sebagian/Belum (REQUIRED_FIELDS), biar
                        // TU tau mana yang prioritas.
                        const isRequired = REQUIRED_FIELDS.includes(key);
                        // Kalau field-nya select & isian yang udah
                        // kesimpen sebelumnya BUKAN salah satu opsi
                        // standar (misal ketikan bebas dari sebelum ada
                        // dropdown, kayak "BURUH HARIAN LEPAS"), tetep
                        // munculin sebagai 1 opsi ekstra di paling atas
                        // -- biar keliatan & gak ke-reset ke kosong
                        // gara-gara gak match ke list baru.
                        const hasLegacyValue =
                          type === "select" && value && !options.includes(value);

                        return (
                          <div key={key} className={wrapperClass}>
                            <label className="block text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-200 mb-1 sm:mb-1.5">
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
                                {hasLegacyValue && (
                                  <option value={value}>{value} (isian lama)</option>
                                )}
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
                <span className="text-rose-500">*</span> wajib diisi biar status kelengkapan siswa
                jadi "Lengkap".
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={backToList}
                className="flex-1 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 py-2.5 rounded-lg"
              >
                Kembali ke Data Siswa
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
        </div>
      )}

      {/* ====== TAB "PREVIEW" ====== */}
      {/* Read-only, sumbernya `adminForm` (sama kayak yang dipake tab Isi
          Data) -- buat admin ini ngikutin isian yang lagi diketik (live,
          belum tentu kesimpen), buat wali kelas/guru BK (gak pernah nyentuh
          tab Isi Data) otomatis nampilin data tersimpan apa adanya.
          Layout tabel 2 kolom (Field | Isian) SENGAJA disamain gayanya
          kayak DataSiswaIndukPDF.js -- kolom bener-bener sejajar (bukan
          teks nyambung), biar konsisten sama hasil export PDF/Excel yang
          udah familiar buat TU. */}
      {activePageTab === "preview" && selectedStudent && (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-md p-4 sm:p-5 border border-slate-100 dark:border-slate-700 overflow-x-auto">
          {adminForm ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-300 dark:border-slate-600">
                  <th className="py-2 pr-4 text-sm sm:text-base font-bold text-slate-700 dark:text-slate-200 w-[42%] sm:w-1/3">
                    Field
                  </th>
                  <th className="py-2 text-sm sm:text-base font-bold text-slate-700 dark:text-slate-200">
                    Isian
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Nama", value: selectedStudent.full_name },
                  { label: "NIS", value: selectedStudent.nis },
                  { label: "Kelas", value: selectedStudent.class_id },
                  {
                    label: "Status Kelengkapan",
                    value: STATUS_META[selectedStudent.status]?.label,
                  },
                  ...DETAIL_ROWS.map(({ key, label, combine }) => ({
                    label,
                    value: getDetailRowValue(adminForm, { key, combine }),
                  })),
                ].map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-100 dark:border-slate-700">
                    <td className="py-2.5 pr-4 align-top text-sm sm:text-base font-medium text-slate-600 dark:text-slate-300">
                      {row.label}
                    </td>
                    <td className="py-2.5 align-top text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-50 break-words">
                      {row.value || (
                        <span className="text-rose-600 dark:text-rose-400 font-semibold">
                          Belum diisi
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          {adminForm && (selectedStudent.detail?.updated_at || selectedStudent.verifiedAt) && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 space-y-1">
              {selectedStudent.detail?.updated_at && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Terakhir diperbarui:{" "}
                  {new Date(selectedStudent.detail.updated_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
              {selectedStudent.verifiedAt && (
                <p className="text-sm text-sky-700 dark:text-sky-400">
                  Diverifikasi oleh Admin:{" "}
                  {new Date(selectedStudent.verifiedAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          )}
          {!adminForm && (
            <div className="text-center py-4 space-y-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Siswa ini belum pernah mengisi data tambahan sama sekali.
              </p>
              {isAdmin && (
                <button
                  onClick={() => setActivePageTab("isi")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition"
                >
                  <Pencil size={14} />
                  Isi Data Sekarang
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
