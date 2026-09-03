// utils/studentProfileCompletion.js
// ========================================================================
// SATU-SATUNYA sumber kebenaran buat ngitung status kelengkapan Data Siswa
// Induk (student_profile_details). Dipake bareng oleh:
// - pages/datasiswa-induk/DataSiswaInduk.js (halaman detail lengkap)
// - pages/Students.js (badge ringkas kelengkapan di halaman Data Siswa)
// Sengaja dipisah ke sini biar dua halaman itu SELALU ngasih status yang
// sama persis buat 1 siswa yang sama -- kalau field wajib berubah,
// cukup edit REQUIRED_FIELDS di 1 tempat ini aja.
// ========================================================================

// Field yang dianggap "wajib" buat status Lengkap. Field yang SENGAJA gak
// dimasukin karena kondisional / gak semua siswa punya / baru keisi
// belakangan: no_hp (siswa), no_kip (cuma penerima KIP), no_peserta_ujian/
// no_ijazah/no_daftar (baru keisi pas lulus), kode_pos (sering nempel di
// teks alamat), keterangan (cuma catatan tambahan), anak_ke, sekolah_asal.
export const REQUIRED_FIELDS = [
  "jenis_kelamin",
  "tempat_lahir",
  "tanggal_lahir",
  "nisn",
  "nik",
  "no_kk",
  "no_akta_lahir",
  "agama",
  "alamat",
  "nama_ayah",
  "nik_ayah",
  "pekerjaan_ayah",
  "pendidikan_ayah",
  "tempat_tgl_lahir_ayah",
  "nama_ibu",
  "nik_ibu",
  "pekerjaan_ibu",
  "pendidikan_ibu",
  "tempat_tgl_lahir_ibu",
  "no_hp_ortu",
];

// Konversi kode gender dari tabel `students` ("P"/"L") ke label penuh yang
// dipakai konsisten di UI & student_profile_details ("Perempuan"/"Laki-laki").
export function genderCodeToLabel(code) {
  if (!code) return "";
  const normalized = String(code).trim().toUpperCase();
  if (normalized === "P") return "Perempuan";
  if (normalized === "L") return "Laki-laki";
  return "";
}

// Tentuin status kelengkapan 1 siswa berdasarkan row student_profile_details
// (bisa null kalau belum pernah isi sama sekali).
export function getCompletionStatus(detail) {
  if (!detail) return "belum";
  const filledCount = REQUIRED_FIELDS.filter(
    (f) => detail[f] && String(detail[f]).trim() !== ""
  ).length;
  if (filledCount === 0) return "belum";
  if (filledCount === REQUIRED_FIELDS.length) return "lengkap";
  return "sebagian";
}

// Gabung `students.gender` (kode P/L, sumber prioritas) ke
// student_profile_details (rawDetail, bisa null), terus langsung tentuin
// status kelengkapannya. Dipake bareng-bareng biar cara gabungnya konsisten
// di semua tempat yang butuh status kelengkapan.
export function resolveCompletion(studentGenderCode, rawDetail) {
  const resolvedJenisKelamin =
    genderCodeToLabel(studentGenderCode) || rawDetail?.jenis_kelamin || "";
  const detail = resolvedJenisKelamin
    ? { ...(rawDetail || {}), jenis_kelamin: resolvedJenisKelamin }
    : rawDetail;
  return { detail, status: getCompletionStatus(detail) };
}

// Styling badge ringkas (dipake di kolom "Kelengkapan" halaman Data Siswa).
// Warna disamain sama STATUS_META di DataSiswaInduk.js biar konsisten,
// tapi TANPA komponen icon (icon-nya di-import & dipasang sendiri-sendiri
// di tiap file pemakai, biar file util ini gak perlu tau soal lucide-react).
export const COMPLETION_STATUS_META = {
  lengkap: {
    label: "Lengkap",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  sebagian: {
    label: "Sebagian",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  belum: {
    label: "Belum Isi",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  },
};
