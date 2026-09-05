// pages/datasiswa-induk/DataSiswaIndukConfig.js
// ========================================================================
// Konstanta & helper MURNI (no state, no JSX) buat fitur Data Siswa Induk.
// Dipisah dari DataSiswaInduk.js (2026-xx-xx) supaya:
// 1. Gampang di-share ke file lain yang butuh daftar field yang SAMA
//    persis -- terutama DataSiswaIndukPDF.js & DataSiswaIndukExcel.js.
//    SEBELUM dipisah, daftar field ini ("DETAIL_ROWS") disalin manual ke
//    tiap file (lihat komentar lama "samain persis sama
//    DATA_SISWA_ROWS + DATA_ORANGTUA_ROWS di DataSiswaIndukPDF.js") --
//    ini beneran pernah bikin field `keterangan` sempat gak sinkron
//    antar tempat (16 siswa yang udah keisi datanya sempat gak keliatan
//    di salah satu tempat). Import dari sini di SEMUA file yang butuh,
//    JANGAN disalin manual lagi.
// 2. Motong ukuran DataSiswaInduk.js biar bagian state/handler/JSX-nya
//    lebih gampang dibaca.
//
// ⚠️ File ini SENGAJA gak boleh import React/useState/dll -- kalau ada
// kebutuhan naruh sesuatu yang butuh hook/state di sini, taruh di
// DataSiswaInduk.js aja, bukan di sini.
// ========================================================================
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";

// Ekstrak jenjang (7/8/9) dari class_id, asumsi format "7A", "8B", "9C"
// (angka di depan = jenjang). Kalau format class_id di project ini beda
// (misal romawi "VII-A"), sesuaikan regex ini.
export function getJenjang(classId) {
  if (!classId) return null;
  const match = String(classId).match(/^(\d+)/);
  return match ? match[1] : null;
}

export const STATUS_META = {
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

// Daftar field buat kartu expand & tab Preview, DAN jadi acuan yang
// SAMA dipakai DataSiswaIndukPDF.js supaya field yang muncul di PDF &
// di halaman ini konsisten. `nama_ortu` (generic, lama) udah gak dipake
// di form StudentProfile.js -> diganti nama_ayah + nama_ibu.
// `combine: "ttl"` = gabungan tempat_lahir + tanggal_lahir jadi 1 baris.
export const DETAIL_ROWS = [
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
  { key: "keterangan", label: "Keterangan" },
];

export const MONTH_NAMES_SHORT = [
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

export const AGAMA_OPTIONS = ["ISLAM", "KRISTEN", "KATOLIK", "HINDU", "BUDDHA", "KONGHUCU"];
export const PENDIDIKAN_OPTIONS = ["SD", "SMP", "SMA", "D3", "S1", "S2"];

// Daftar pekerjaan standar -- SENGAJA disamain persis sama
// pekerjaanListAyah/pekerjaanListIbu di StudentForm.js (form pendaftaran
// siswa baru), biar pilihan yang muncul di admin sini konsisten sama yang
// dipilih ortu pas awal daftar. Bedanya di sini gak ada input "Lainnya"
// terpisah (StudentForm.js punya field _lainnya sendiri) -- kalau isian
// lama gak ada di daftar (misal ketikan bebas dari sebelum ada dropdown),
// field select otomatis nambahin isian lama itu jadi 1 opsi ekstra di
// bagian atas, jadi datanya TETAP KELIATAN & gak ke-reset ke kosong tanpa
// sengaja pas dibuka (lihat pemakaian `hasLegacyValue` di form Isi Data).
export const PEKERJAAN_AYAH_OPTIONS = [
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
export const PEKERJAAN_IBU_OPTIONS = [
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
export const ADMIN_EDIT_SECTIONS = {
  siswa: "Data Siswa",
  ayah: "Data Ayah",
  ibu: "Data Ibu",
  lainnya: "Kontak Orang Tua & Lainnya",
};

export const ADMIN_EDIT_FIELDS = [
  {
    key: "jenis_kelamin",
    label: "Jenis Kelamin",
    type: "select",
    // ⚠️ HARUS UPPERCASE -- samain persis sama check constraint DB
    // "student_profile_details_jenis_kelamin_check" yang cuma izinin
    // ARRAY['LAKI-LAKI','PEREMPUAN']. Sebelumnya opsi di sini "Laki-laki"/
    // "Perempuan" (mixed-case) -> ditolak Postgres pas admin save edit
    // (error code 23514). Kalau constraint DB-nya diubah lagi nanti,
    // samain juga di sini.
    options: ["LAKI-LAKI", "PEREMPUAN"],
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

export function emptyAdminForm(detail) {
  const form = {};
  ADMIN_EDIT_FIELDS.forEach(({ key }) => {
    form[key] = detail?.[key] ?? "";
  });
  return form;
}

export function formatTanggalLahirSingkat(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getDate()} ${MONTH_NAMES_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

// Ambil nilai 1 baris detail buat kartu expand (support field gabungan
// "ttl" kayak di DataSiswaIndukPDF.js -> getRowValue).
export function getDetailRowValue(detail, row) {
  if (row.combine === "ttl") {
    const tempat = detail?.tempat_lahir;
    const tanggal = formatTanggalLahirSingkat(detail?.tanggal_lahir);
    if (!tempat && !tanggal) return null;
    if (tempat && tanggal) return `${tempat}, ${tanggal}`;
    return tempat || tanggal;
  }
  return detail ? detail[row.key] : null;
}
