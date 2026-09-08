// students/StudentProfile.js
// ========================================================================
// Isi konten buat 3 menu di halaman "Akun": info profil, form ganti
// password, dan tombol keluar. Dipecah jadi named export (BUKAN 1
// komponen gede kayak sebelumnya) supaya masing-masing bisa dipasang
// sebagai isi accordion item terpisah di StudentLainnya.js.
//
// PENTING soal Ganti Password:
// Sistem login siswa ini custom (bukan supabase.auth), sesi disimpen lewat
// getStudentSession()/clearStudentSession() di utils/studentSession.js.
// Di bawah ini gue ASUMSIKAN password disimpen di tabel `users` kolom
// `password`. INI HARUS DICEK ULANG:
//   - Kalau kolomnya beda nama, sesuaikan query update-nya.
//   - Kalau passwordnya masih plaintext, JANGAN update plaintext langsung
//     dari client kayak di bawah ini buat production — idealnya validasi +
//     hashing dilakuin di server (Supabase Edge Function / RPC), bukan di
//     browser, biar gak gampang diakalin lewat devtools.
//   - Untuk sekarang kode di bawah masih update langsung ke tabel `users`
//     supaya UI-nya jalan, tapi tandain ini sebagai TODO keamanan.
// ========================================================================
import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { clearStudentSession } from "../utils/studentSession";
import {
  REQUIRED_FIELDS,
  getCompletionStatus,
  COMPLETION_STATUS_META,
} from "../utils/studentProfileCompletion";
import { Eye, EyeOff, Loader2, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

// --- Helper validasi & normalisasi nomor HP Indonesia -------------------
// Nerima input dalam berbagai format umum (08xxxxxxxxxx, +62xxxxxxxxxxx,
// 62xxxxxxxxxxx, atau ada spasi/strip di tengah kayak 0812-3456-7890),
// terus dirapiin jadi format baku internasional "+62xxxxxxxxxxx" sebelum
// disimpen ke DB biar konsisten & resmi (gak ada yang kesimpen 08...
// sementara yang lain +62...).
function normalizePhone(raw) {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, ""); // buang semua selain angka
  let national; // nomor nasional tanpa kode negara, diawali "8"
  if (digits.startsWith("0")) {
    national = digits.slice(1);
  } else if (digits.startsWith("62")) {
    national = digits.slice(2);
  } else {
    // kadang orang nulis tanpa 0 di depan, misal "812xxxx"
    national = digits;
  }
  return "+62" + national;
}

// Nomor HP Indonesia yang valid: nomor nasional diawali 8 (mobile),
// panjang total 9-12 digit setelah kode negara (contoh: +6281234567890).
// Longgar dikit di batas atas/bawah biar gak nolak nomor yang beneran
// valid tapi agak pendek/panjang.
function isValidPhone(raw) {
  const normalized = normalizePhone(raw);
  return /^\+628\d{8,11}$/.test(normalized);
}

// --- Isi menu "Profile" -------------------------------------------------
// Field-nya disamain sama Formulir Pendaftaran Calon Siswa Baru (Bagian A:
// Data Calon Siswa, Bagian B: Data Orang Tua/Wali) biar data yang keisi
// pas daftar dulu bisa dilanjut/dilengkapi siswa sendiri dari portal ini.
//
// Field identitas resmi tambahan (agama, NIK, No. KK, akta lahir, ijazah,
// no peserta ujian, kode pos, NIK ortu, tempat/tgl lahir ortu,
// No. KIP, no daftar) udah ditambahin ke form ini
// dan ke query di useStudentProfile.js — kolomnya udah ada di tabel
// student_profile_details (lihat DDL terbaru).
// Field lama yang generic (nama_ortu) udah gak dipake di form ini karena
// dipecah jadi Ayah/Ibu terpisah — kolom lamanya dibiarin aja di DB (gak
// didrop) buat jaga-jaga data lama, tapi UI-nya udah gak nampilin/isi itu.
//
// ⚠️ UPDATE 2 (unlock field yang masih kosong): sejak backlog data lama
// (hasil import Excel TU sebelum aplikasi ini ada) ketauan banyak yang
// bolong, field2 di bawah ini SEKARANG BOLEH diisi mandiri oleh
// siswa/ortu -- TAPI CUMA KALAU nilainya masih kosong di database:
//   nisn, jenis_kelamin, tempat_lahir, tanggal_lahir, sekolah_asal,
//   alamat, kode_pos, agama, nik, no_kk, no_akta_lahir,
//   nama_ayah, nik_ayah, tempat_tgl_lahir_ayah, pekerjaan_ayah, pendidikan_ayah,
//   nama_ibu, nik_ibu, tempat_tgl_lahir_ibu, pekerjaan_ibu, pendidikan_ibu,
//   no_hp_ortu
// Begitu field itu keisi (dari siswa ATAU dari TU), otomatis TERKUNCI
// LAGI selamanya -- kalau ternyata salah ketik, harus lapor Tata Usaha
// buat dikoreksi lewat DataSiswaInduk.js, bukan diedit ulang dari sini.
// Ini bukan "pintu ke-3" yang membuka lagi celah data nyimpang: karena
// begitu terkunci, field itu PERSIS sama seperti sebelum update ini --
// cuma dipakai buat ngisi yang KOSONG, bukan buat nimpa/mengoreksi yang
// udah ada. Lihat LockableField & unlockableFields di ProfileInfo di
// bawah buat detail implementasinya.
// No. KIP, No. Ijazah, No. Peserta Ujian, No. Daftar, dan Keterangan
// TETAP admin-only (gak termasuk dalam daftar di atas) -- lihat alasannya
// di bagian "Section Data Kelulusan & Lainnya" di bawah.
//
// Section "Data Kelulusan & Lainnya" (No. Ijazah, No. Peserta Ujian,
// No. Daftar, Keterangan) DIHAPUS TOTAL dari sisi siswa (baik tampilan
// maupun form) -- keempatnya jadi murni Admin-only, dikelola dari
// DataSiswaInduk.js aja. `keterangan` sengaja ikut dihapus karena
// purpose-nya emang gak pernah jelas dari awal (lihat catatan di
// DataSiswaInduk.js) dan udah jadi pintu ganda (siswa + admin bisa nulis
// ke kolom yang sama tanpa pembagian tanggung jawab).
//
// Field yang SELALU bisa diisi mandiri (gak pernah terkunci, gak ada di
// SPMB, gak ada sumber lain): no_hp (HP siswa sendiri, opsional), anak_ke.
// Field lain yang CUMA bisa diisi kalau masih kosong: lihat UPDATE 2 di
// atas. `dusun` DIBIARIN ADA DI DB (buat data lama), tapi SENGAJA gak
// dimunculin di UI manapun -- purpose-nya gak jelas & isinya biasanya
// udah nempel di teks `alamat`.
//
// `onUpdated` (opsional): dipanggil abis form data tambahan berhasil
// disimpen, biasanya diisi `refetch` dari useStudentProfile() supaya
// data yang tampil langsung ke-update tanpa reload halaman.

function formatTanggalLahir(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatTempatTanggalLahir(student) {
  const tempat = student?.tempat_lahir;
  const tanggal = formatTanggalLahir(student?.tanggal_lahir);
  if (!tempat && !tanggal) return "-";
  if (tempat && tanggal) return `${tempat}, ${tanggal}`;
  return tempat || tanggal;
}

// Daftar pekerjaan standar — DISALIN PERSIS dari spmb/StudentForm.js biar
// istilahnya seragam sama form SPMB. Cuma dipake buat nampilin <select
// disabled>, BUKAN buat validasi/simpan (field ini udah read-only di
// sini). ⚠️ Kalau daftar di StudentForm.js diubah, samain juga di sini
// biar gak beda-beda antara SPMB & portal siswa.
const PEKERJAAN_LIST_AYAH = [
  "PNS/TNI/Polri",
  "Karyawan Swasta",
  "Wiraswasta/Pedagang",
  "Petani",
  "Buruh",
  "Guru/Dosen",
  "Dokter/Tenaga Kesehatan",
  "Sopir/Driver",
  "Pensiunan",
  "Tidak Bekerja",
];

const PEKERJAAN_LIST_IBU = [
  "Ibu Rumah Tangga",
  "PNS/TNI/Polri",
  "Karyawan Swasta",
  "Wiraswasta/Pedagang",
  "Petani",
  "Buruh",
  "Guru/Dosen",
  "Dokter/Tenaga Kesehatan",
  "Pensiunan",
  "Tidak Bekerja",
];

// Susun daftar <option> yang bakal dirender di <select disabled>: daftar
// standar + value yang lagi kesimpen di DB (kalau ternyata gak ada di
// daftar standar, misal dulu diisi custom lewat "Lainnya" di SPMB, atau
// data lama) ditambahin di paling atas biar tetep keliatan & kepilih.
function pekerjaanOptionsFor(value, standardList) {
  if (!value) return standardList;
  return standardList.includes(value) ? standardList : [value, ...standardList];
}

const AGAMA_OPTIONS = ["ISLAM", "KRISTEN", "KATOLIK", "HINDU", "BUDDHA", "KONGHUCU"];

// ✅ NEW: field kosong (null/undefined/string kosong) di database = boleh
// diisi mandiri sekali sama siswa/ortu. Field yang UDAH ada isinya (dari
// SPMB atau diisi TU) tetap terkunci total kayak sebelumnya. Ini dicek per
// FIELD, bukan per SISWA -- jadi 1 siswa bisa isi beberapa field yang
// masih kosong dalam 1x submit yang sama, sementara field lain yang udah
// keisi tetap gak kesentuh.
function isEmptyValue(v) {
  return v === null || v === undefined || v === "";
}

// Daftar field yang boleh diisi mandiri KALAU masih kosong di DB (lihat
// "UPDATE 2" di komentar panjang di atas). Diangkat ke scope module (bukan
// di dalem handleSubmit doang) biar bisa dipake bareng buat:
//   1. handleSubmit -> nentuin field mana yang boleh dikirim ke DB.
//   2. Badge kelengkapan data (lihat getProfileCompleteness) -> nentuin
//      berapa dari field2 ini yang udah keisi buat siswa yang lagi login.
const UNLOCKABLE_FIELDS = [
  "nisn",
  "jenis_kelamin",
  "tempat_lahir",
  "tanggal_lahir",
  "sekolah_asal",
  "alamat",
  "kode_pos",
  "agama",
  "nik",
  "no_kk",
  "no_akta_lahir",
  "nama_ayah",
  "nik_ayah",
  "tempat_tgl_lahir_ayah",
  "pekerjaan_ayah",
  "pendidikan_ayah",
  "nama_ibu",
  "nik_ibu",
  "tempat_tgl_lahir_ibu",
  "pekerjaan_ibu",
  "pendidikan_ibu",
  "no_hp_ortu",
];

// ⚠️ CATATAN kelengkapan data (badge di ProfileInfo di bawah): kriteria
// "Lengkap/Sebagian/Belum Isi" SENGAJA gak dihitung manual di file ini --
// dipake langsung getCompletionStatus() + REQUIRED_FIELDS dari
// utils/studentProfileCompletion.js, SATU-SATUNYA sumber kebenaran yang
// juga dipake DataSiswaInduk.js (halaman admin/TU/wali kelas). Ini
// penting: `student` di sini (dari useStudentProfile.js) udah berisi
// `jenis_kelamin` sebagai LABEL jadi ("Perempuan"/"Laki-laki", lihat
// catatan di rows[] bawah), BUKAN kode P/L mentah dari tabel `students` --
// jadi cukup langsung getCompletionStatus(student), TANPA perlu
// resolveCompletion(genderCode, ...) yang minta kode mentah (itu cuma
// dipake di DataSiswaInduk.js yang emang megang `students.gender` mentah).
// Kalau ternyata useStudentProfile.js TERNYATA belum nge-resolve gender
// prioritas students.gender > student_profile_details.jenis_kelamin kayak
// resolveCompletion(), badge di sini bisa keliatan "Sebagian" padahal
// harusnya "Lengkap" utk siswa yg gender-nya cuma keisi di tabel
// `students` -- worth dicek ke useStudentProfile.js kalau ketemu kasus
// gitu di lapangan.

export function ProfileInfo({ student, onUpdated }) {
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  // `form` sekarang nampung SEMUA field yang mungkin diisi mandiri --
  // baik yang dari awal emang selalu terbuka (no_hp, anak_ke) maupun yang
  // cuma kebuka KALAU nilainya masih kosong di DB (lihat isEmptyValue()
  // + LockableField di bawah). Field yang udah keisi gak pernah kesentuh
  // dari form ini sama sekali (lihat handleSubmit), jadi nilai form buat
  // field yang udah terkunci gak relevan/gak pernah dipakai.
  const [form, setForm] = useState({
    no_hp: "",
    anak_ke: "",
    nisn: "",
    jenis_kelamin: "",
    tempat_lahir: "",
    tanggal_lahir: "",
    sekolah_asal: "",
    alamat: "",
    kode_pos: "",
    agama: "",
    nik: "",
    no_kk: "",
    no_akta_lahir: "",
    nama_ayah: "",
    nik_ayah: "",
    tempat_tgl_lahir_ayah: "",
    pekerjaan_ayah: "",
    pendidikan_ayah: "",
    nama_ibu: "",
    nik_ibu: "",
    tempat_tgl_lahir_ibu: "",
    pekerjaan_ibu: "",
    pendidikan_ibu: "",
    no_hp_ortu: "",
  });

  // Sinkronin form pas data student berubah (pertama kali load, atau
  // abis refetch sukses) — biar form gak nampilin data basi.
  useEffect(() => {
    setForm({
      no_hp: student?.no_hp || "",
      anak_ke: student?.anak_ke ?? "",
      nisn: student?.nisn || "",
      jenis_kelamin: student?.jenis_kelamin || "",
      tempat_lahir: student?.tempat_lahir || "",
      tanggal_lahir: student?.tanggal_lahir || "",
      sekolah_asal: student?.sekolah_asal || "",
      alamat: student?.alamat || "",
      kode_pos: student?.kode_pos || "",
      agama: student?.agama || "",
      nik: student?.nik || "",
      no_kk: student?.no_kk || "",
      no_akta_lahir: student?.no_akta_lahir || "",
      nama_ayah: student?.nama_ayah || "",
      nik_ayah: student?.nik_ayah || "",
      tempat_tgl_lahir_ayah: student?.tempat_tgl_lahir_ayah || "",
      pekerjaan_ayah: student?.pekerjaan_ayah || "",
      pendidikan_ayah: student?.pendidikan_ayah || "",
      nama_ibu: student?.nama_ibu || "",
      nik_ibu: student?.nik_ibu || "",
      tempat_tgl_lahir_ibu: student?.tempat_tgl_lahir_ibu || "",
      pekerjaan_ibu: student?.pekerjaan_ibu || "",
      pendidikan_ibu: student?.pendidikan_ibu || "",
      no_hp_ortu: student?.no_hp_ortu || "",
    });
  }, [student]);

  // Status kelengkapan (buat badge) -- pakai getCompletionStatus() resmi
  // dari utils/studentProfileCompletion.js (lihat catatan panjang di atas
  // komponen ini), SAMA PERSIS kayak yang dipake DataSiswaInduk.js. Cuma
  // dihitung ulang pas `student` beneran berubah (misal abis
  // onUpdated/refetch), bukan tiap render.
  const completionStatus = React.useMemo(() => getCompletionStatus(student), [student]);
  // `filledCount` CUMA buat tampilan "x/y" di badge status "Sebagian" --
  // gak dipake buat nentuin status-nya sendiri (itu tugas
  // getCompletionStatus di atas, biar 1 sumber kebenaran).
  const filledCount = React.useMemo(
    () => REQUIRED_FIELDS.filter((f) => student?.[f] && String(student[f]).trim() !== "").length,
    [student]
  );

  // ---- Tampilan (bukan edit) — dikelompokin persis kayak formulir ----
  const rows = [
    { section: "Data Siswa" },
    { label: "Nama Lengkap", value: student?.full_name || "-" },
    { label: "Username", value: `@${student?.username || "-"}` },
    { label: "NIS", value: student?.nis || "-" },
    { label: "NISN", value: student?.nisn || "-" },
    {
      label: "Jenis Kelamin",
      // Cuma diubah tampilannya (UPPERCASE) biar konsisten sama panel
      // admin -- data asli di `student` (dari useStudentProfile.js)
      // TETAP Title Case ("Perempuan"), gak diubah, karena field ini
      // read-only doang di sini (gak pernah disimpen ulang ke DB dari
      // form siswa, lihat handleSubmit di bawah).
      value: student?.jenis_kelamin ? student.jenis_kelamin.toUpperCase() : "-",
    },
    {
      label: "Kelas",
      value: student?.classes?.grade || student?.homeroom_class_id || "-",
    },
    {
      label: "Tempat, Tanggal Lahir",
      value: formatTempatTanggalLahir(student),
    },
    { label: "Sekolah Asal", value: student?.sekolah_asal || "-" },
    { label: "Alamat Lengkap", value: student?.alamat || "-" },
    { label: "Kode Pos", value: student?.kode_pos || "-" },
    { label: "No. HP Siswa (Kalau Ada)", value: student?.no_hp || "-" },
    { label: "Agama", value: student?.agama || "-" },
    { label: "Anak Ke Berapa Dalam Keluarga", value: student?.anak_ke || "-" },
    { label: "NIK", value: student?.nik || "-" },
    { label: "No. Kartu Keluarga (KK)", value: student?.no_kk || "-" },
    { label: "No. Akta Lahir", value: student?.no_akta_lahir || "-" },
    { label: "No. KIP", value: student?.no_kip || "-" },
    // divider: true -> section ini yang jadi pemisah antara blok Data
    // Siswa & Data Orangtua (garis lebih tegas, bukan section biasa).
    { section: "Data Orangtua", divider: true },
    { label: "Nama Lengkap Ayah", value: student?.nama_ayah || "-" },
    { label: "NIK Ayah", value: student?.nik_ayah || "-" },
    {
      label: "Tempat, Tanggal Lahir Ayah",
      value: student?.tempat_tgl_lahir_ayah || "-",
    },
    { label: "Pekerjaan Ayah", value: student?.pekerjaan_ayah || "-" },
    {
      label: "Pendidikan Terakhir Ayah",
      value: student?.pendidikan_ayah || "-",
    },
    { label: "Nama Lengkap Ibu", value: student?.nama_ibu || "-" },
    { label: "NIK Ibu", value: student?.nik_ibu || "-" },
    {
      label: "Tempat, Tanggal Lahir Ibu",
      value: student?.tempat_tgl_lahir_ibu || "-",
    },
    { label: "Pekerjaan Ibu", value: student?.pekerjaan_ibu || "-" },
    { label: "Pendidikan Terakhir Ibu", value: student?.pendidikan_ibu || "-" },
    { label: "No. HP Orang Tua/Wali", value: student?.no_hp_ortu || "-" },
    // Section "Data Kelulusan & Lainnya" (No. Ijazah, No. Peserta Ujian,
    // No. Daftar, Keterangan) SENGAJA dihapus dari sisi siswa -- 3 field
    // pertama emang gak pernah relevan buat siswa liat, dan `keterangan`
    // sekarang murni Admin-only (lihat catatan panjang di atas). Kalau
    // butuh lihat/edit ke-4 field ini, lewat DataSiswaInduk.js aja.
  ];

  // 16 digit angka -- format standar NIK/No. KK Indonesia. Divalidasi
  // CUMA kalau field itu emang lagi kebuka (kosong di DB) dan diisi --
  // field yang udah terkunci gak pernah lewat validasi ini.
  const isValid16Digit = (v) => /^\d{16}$/.test(String(v).trim());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!student?.id) {
      setFormError("Sesi tidak ketemu, silakan login ulang.");
      return;
    }

    // Validasi nomor HP (kalau diisi) sebelum kirim ke database — biar
    // gak ada nomor asal-asalan/kepotong kesimpen. Kosongin field-nya
    // tetep boleh (opsional), jadi cuma divalidasi kalau ada isinya.
    if (form.no_hp && !isValidPhone(form.no_hp)) {
      setFormError("No. HP Siswa tidak valid. Contoh format yang benar: 08123456789.");
      return;
    }

    // ✅ NEW: field yang boleh diisi mandiri KALAU masih kosong di DB.
    // Field yang udah keisi (isEmptyValue(student?.[key]) === false)
    // SENGAJA gak dimasukin ke payload sama sekali -- biar upsert
    // Supabase gak nyentuh/nimpa kolom yang harusnya cuma boleh dikoreksi
    // TU lewat DataSiswaInduk.js.
    const nikLikeFields = ["nik", "no_kk", "nik_ayah", "nik_ibu"];

    const extra = {};
    for (const key of UNLOCKABLE_FIELDS) {
      if (!isEmptyValue(student?.[key])) continue; // udah keisi -> skip total
      const val = typeof form[key] === "string" ? form[key].trim() : form[key];
      if (nikLikeFields.includes(key) && val && !isValid16Digit(val)) {
        setFormError(`${key.toUpperCase()} harus 16 digit angka. Cek lagi ya.`);
        return;
      }
      extra[key] = val === "" ? null : val;
    }

    setSubmitting(true);
    try {
      // Upsert: 1 baris per siswa di student_profile_details
      // (student_id = primary key), jadi otomatis update kalau udah
      // pernah isi, atau insert kalau baru pertama kali.
      // Kirim field yang SELALU self-service (no_hp, anak_ke) + field di
      // `extra` (field lain yang kebetulan masih kosong di DB pas ini
      // disubmit). SEMUA field yang udah ada isinya -- baik eks-SPMB
      // (nama_ayah dkk, alamat, no_hp_ortu, kode_pos) maupun identitas
      // resmi (NIK, No.KK, dst) -- TETAP gak kesentuh dari sini, cuma
      // bisa dikoreksi TU lewat DataSiswaInduk.js. `keterangan` juga
      // tetap admin-only, gak pernah dikirim dari sini.
      const { error: upsertErr } = await supabase.from("student_profile_details").upsert(
        {
          student_id: student.id,
          no_hp: form.no_hp ? normalizePhone(form.no_hp) : null,
          anak_ke: form.anak_ke === "" ? null : Number(form.anak_ke),
          ...extra,
          updated_at: new Date().toISOString(),
          // Data berubah -> status verifikasi admin otomatis batal, harus
          // dicek ulang. Lihat DataSiswaInduk.js buat tombol
          // "Tandai Terverifikasi"-nya.
          verified_at: null,
        },
        { onConflict: "student_id" }
      );

      if (upsertErr) throw upsertErr;

      setIsEditing(false);
      if (onUpdated) await onUpdated();
    } catch (err) {
      console.error("[ProfileInfo] Gagal simpan data profil tambahan:", err);
      setFormError("Gagal menyimpan data. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full text-sm text-theme border border-theme rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300";
  const lockedInputClass =
    "w-full text-sm text-theme-secondary bg-theme-surface border border-theme rounded-lg px-3 py-2 cursor-not-allowed";
  const labelClass = "block text-sm font-semibold text-theme-secondary mb-1";

  // ✅ NEW: 1 komponen dipakai bareng buat SEMUA field yang "terkunci
  // kalau udah keisi, kebuka kalau masih kosong" -- baik field yang
  // sebelumnya udah ada inputnya (NISN, Alamat, dst, cuma tadinya SELALU
  // disabled) maupun field yang sebelumnya cuma nongol di tampilan biasa
  // (Jenis Kelamin, NIK, No. KK, dst -- sebelumnya gak ada input edit-nya
  // sama sekali). `dbValue` (nilai asli di `student`) yang nentuin
  // lock/unlock; `formValue`/`onChange` cuma relevan pas lagi kebuka.
  function LockableField({
    label: fieldLabel,
    dbValue,
    formValue,
    onChange,
    type = "text",
    options,
    taRows = 2,
  }) {
    if (!isEmptyValue(dbValue)) {
      return (
        <div>
          <label className={labelClass}>{fieldLabel}</label>
          {type === "textarea" ? (
            <textarea rows={taRows} value={dbValue} disabled className={lockedInputClass} />
          ) : (
            <input
              type={type === "date" ? "date" : "text"}
              value={dbValue}
              disabled
              className={lockedInputClass}
            />
          )}
        </div>
      );
    }
    return (
      <div>
        <label className={labelClass}>
          {fieldLabel}{" "}
          <span className="text-amber-600 dark:text-amber-400 font-normal text-xs">
            (belum diisi TU — boleh diisi sendiri)
          </span>
        </label>
        {type === "textarea" ? (
          <textarea rows={taRows} value={formValue} onChange={onChange} className={inputClass} />
        ) : type === "select" ? (
          <select value={formValue} onChange={onChange} className={inputClass}>
            <option value="">-- Pilih {fieldLabel} --</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            value={formValue}
            onChange={onChange}
            placeholder={fieldLabel}
            className={inputClass}
          />
        )}
      </div>
    );
  }

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  if (isEditing) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-3 py-2 rounded-lg text-sm">
            {formError}
          </div>
        )}

        {/* ---- Data Siswa ---- */}
        <div className="space-y-3">
          <p className="text-sm font-extrabold uppercase tracking-wide text-theme-secondary">
            Data Siswa
          </p>
          <p className="text-xs text-theme-secondary -mt-1">
            Field yang masih kosong boleh diisi sendiri (sekali) — begitu tersimpan, otomatis
            terkunci dan cuma bisa dikoreksi lewat Tata Usaha kalau ternyata salah ketik.
          </p>

          <LockableField
            label="NISN"
            dbValue={student?.nisn}
            formValue={form.nisn}
            onChange={setField("nisn")}
          />

          <LockableField
            label="Jenis Kelamin"
            dbValue={student?.jenis_kelamin}
            formValue={form.jenis_kelamin}
            onChange={setField("jenis_kelamin")}
            type="select"
            options={["LAKI-LAKI", "PEREMPUAN"]}
          />

          <LockableField
            label="Tempat Lahir"
            dbValue={student?.tempat_lahir}
            formValue={form.tempat_lahir}
            onChange={setField("tempat_lahir")}
          />

          <LockableField
            label="Tanggal Lahir"
            dbValue={student?.tanggal_lahir}
            formValue={form.tanggal_lahir}
            onChange={setField("tanggal_lahir")}
            type="date"
          />

          <LockableField
            label="Sekolah Asal"
            dbValue={student?.sekolah_asal}
            formValue={form.sekolah_asal}
            onChange={setField("sekolah_asal")}
          />

          <LockableField
            label="Alamat Lengkap"
            dbValue={student?.alamat}
            formValue={form.alamat}
            onChange={setField("alamat")}
            type="textarea"
          />

          {/* Kolom `dusun` SENGAJA gak dimasukin ke UI manapun (baik view
              maupun form edit) -- purpose-nya gak jelas & datanya biasanya
              udah nempel di teks `alamat`. Kolomnya dibiarin ada di DB
              buat data lama, tapi gak dipake/ditampilin lagi di sini. */}

          <LockableField
            label="Kode Pos"
            dbValue={student?.kode_pos}
            formValue={form.kode_pos}
            onChange={setField("kode_pos")}
          />

          <div>
            <label className={labelClass}>No. HP Siswa (Kalau Ada)</label>
            <input
              type="tel"
              value={form.no_hp}
              onChange={(e) => setForm((f) => ({ ...f, no_hp: e.target.value }))}
              placeholder="08xxxxxxxxxx"
              className={inputClass}
            />
            <p className="text-xs text-theme-secondary mt-1">
              Nomor pribadi siswa (opsional) — beda dengan No. HP Orang Tua/Wali di bagian bawah.
            </p>
          </div>

          <LockableField
            label="Agama"
            dbValue={student?.agama}
            formValue={form.agama}
            onChange={setField("agama")}
            type="select"
            options={AGAMA_OPTIONS}
          />

          <div>
            <label className={labelClass}>Anak Ke Berapa Dalam Keluarga</label>
            <input
              type="number"
              min="1"
              value={form.anak_ke}
              onChange={(e) => setForm((f) => ({ ...f, anak_ke: e.target.value }))}
              className={inputClass}
            />
          </div>

          <LockableField
            label="NIK"
            dbValue={student?.nik}
            formValue={form.nik}
            onChange={setField("nik")}
          />

          <LockableField
            label="No. Kartu Keluarga (KK)"
            dbValue={student?.no_kk}
            formValue={form.no_kk}
            onChange={setField("no_kk")}
          />

          <LockableField
            label="No. Akta Lahir"
            dbValue={student?.no_akta_lahir}
            formValue={form.no_akta_lahir}
            onChange={setField("no_akta_lahir")}
          />
          {/* No. KIP SENGAJA gak dibukain di sini -- bukan bagian dari
              REQUIRED_FIELDS status kelengkapan, dan tetap admin-only
              kayak No. Ijazah/No. Peserta Ujian/No. Daftar/Keterangan. */}
        </div>

        {/* ---- Data Orangtua (gabungan Ayah, Ibu, & Kontak) ---- */}
        <div className="mt-3 pt-4 border-t-2 border-theme space-y-3">
          <p className="text-sm font-extrabold uppercase tracking-wide text-theme-secondary">
            Data Orangtua
          </p>
          <p className="text-xs text-theme-secondary -mt-1">
            Sama kayak di atas — field yang masih kosong boleh diisi sendiri, yang udah keisi tetap
            terkunci.
          </p>

          <LockableField
            label="Nama Lengkap Ayah"
            dbValue={student?.nama_ayah}
            formValue={form.nama_ayah}
            onChange={setField("nama_ayah")}
          />

          <LockableField
            label="NIK Ayah"
            dbValue={student?.nik_ayah}
            formValue={form.nik_ayah}
            onChange={setField("nik_ayah")}
          />

          <LockableField
            label="Tempat, Tanggal Lahir Ayah"
            dbValue={student?.tempat_tgl_lahir_ayah}
            formValue={form.tempat_tgl_lahir_ayah}
            onChange={setField("tempat_tgl_lahir_ayah")}
          />

          <LockableField
            label="Pekerjaan Ayah"
            dbValue={student?.pekerjaan_ayah}
            formValue={form.pekerjaan_ayah}
            onChange={setField("pekerjaan_ayah")}
            type="select"
            options={PEKERJAAN_LIST_AYAH}
          />

          <LockableField
            label="Pendidikan Terakhir Ayah"
            dbValue={student?.pendidikan_ayah}
            formValue={form.pendidikan_ayah}
            onChange={setField("pendidikan_ayah")}
          />

          <LockableField
            label="Nama Lengkap Ibu"
            dbValue={student?.nama_ibu}
            formValue={form.nama_ibu}
            onChange={setField("nama_ibu")}
          />

          <LockableField
            label="NIK Ibu"
            dbValue={student?.nik_ibu}
            formValue={form.nik_ibu}
            onChange={setField("nik_ibu")}
          />

          <LockableField
            label="Tempat, Tanggal Lahir Ibu"
            dbValue={student?.tempat_tgl_lahir_ibu}
            formValue={form.tempat_tgl_lahir_ibu}
            onChange={setField("tempat_tgl_lahir_ibu")}
          />

          <LockableField
            label="Pekerjaan Ibu"
            dbValue={student?.pekerjaan_ibu}
            formValue={form.pekerjaan_ibu}
            onChange={setField("pekerjaan_ibu")}
            type="select"
            options={PEKERJAAN_LIST_IBU}
          />

          <LockableField
            label="Pendidikan Terakhir Ibu"
            dbValue={student?.pendidikan_ibu}
            formValue={form.pendidikan_ibu}
            onChange={setField("pendidikan_ibu")}
          />

          <LockableField
            label="No. HP Orang Tua/Wali"
            dbValue={student?.no_hp_ortu}
            formValue={form.no_hp_ortu}
            onChange={setField("no_hp_ortu")}
            type="tel"
          />
        </div>

        {/* Section "Lainnya" (Keterangan, No. Ijazah, No. Peserta Ujian,
            No. Daftar) DIHAPUS TOTAL dari form siswa -- ke-4 nya sekarang
            murni Admin-only, dikelola dari DataSiswaInduk.js. */}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="flex-1 text-sm font-semibold text-theme-secondary bg-theme-surface py-2.5 rounded-lg"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-60"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    );
  }

  const statusMeta = COMPLETION_STATUS_META[completionStatus];
  const StatusIcon =
    completionStatus === "lengkap"
      ? CheckCircle2
      : completionStatus === "sebagian"
        ? AlertTriangle
        : XCircle;

  return (
    <div>
      {/* Badge kelengkapan data -- warna & label DIAMBIL LANGSUNG dari
          COMPLETION_STATUS_META (utils/studentProfileCompletion.js), jadi
          identik sama badge "Kelengkapan" di halaman Data Siswa Induk
          (admin/TU/wali kelas). Cuma icon-nya yang dipasang di sini
          sendiri (util-nya sengaja gak megang lucide-react, lihat
          komentar di file util). Status "Sebagian" dikasih tambahan
          "(x/20)" biar siswa tau seberapa jauh, "Lengkap"/"Belum Isi" gak
          perlu angka (0/20 atau 20/20 gak nambah info). Dipasang di sini
          (bukan cuma di tombol "Lengkapi / Edit Data") biar keliatan
          begitu buka menu Profile, gak perlu nunggu scroll ke bawah. */}
      <div
        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full mb-3 ${statusMeta.badge}`}
      >
        <StatusIcon size={14} />
        {statusMeta.label}
        {completionStatus === "sebagian" && ` (${filledCount}/${REQUIRED_FIELDS.length})`}
      </div>

      {/* Pesan ajakan CUMA muncul pas status "Sebagian" (data udah ada
          tapi belum semua field wajib keisi) -- status "Lengkap" gak
          perlu diingetin apa-apa, status "Belum Isi" udah cukup jelas
          dari tombol "Lengkapi / Edit Data" di bawah tanpa perlu banner
          terpisah. */}
      {completionStatus === "sebagian" && (
        <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm rounded-lg px-3 py-2.5 mb-3">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>
            <span className="font-semibold">Segera Lengkapi Data Putra/i Anda.</span> Masih ada data
            yang belum diisi lengkap.
          </span>
        </div>
      )}

      {/* Grid 3 kolom (label, titik dua, value) dalam SATU grid container
          bareng, jadi lebar kolom label otomatis ngikutin label terpanjang
          & titik duanya sejajar semua. Baris section ("Data Siswa", "Data
          Orangtua") nge-span 3 kolom sekaligus jadi sub-header di tengah
          daftar. Section yang `divider: true` dikasih garis pemisah lebih
          tegas di atasnya buat misahin blok Data Siswa vs Data Orangtua. */}
      <div className="grid grid-cols-[auto_auto_1fr] gap-x-3">
        {rows.map((r, i) => {
          if (r.section) {
            const isFirst = i === 0;
            return (
              <p
                key={r.section}
                className={`col-span-3 text-sm font-extrabold uppercase tracking-wide text-theme-secondary pb-1.5 ${
                  isFirst ? "pt-0" : r.divider ? "mt-3 pt-4 border-t-2 border-theme" : "pt-4"
                }`}
              >
                {r.section}
              </p>
            );
          }
          const prev = rows[i - 1];
          const bordered = i !== 0 && !prev?.section ? "border-t border-gray-100" : "";
          return (
            <React.Fragment key={r.label}>
              <span
                className={`text-sm font-medium text-theme-secondary whitespace-nowrap py-3 ${bordered}`}
              >
                {r.label}
              </span>
              <span className={`text-sm font-medium text-theme-secondary py-3 ${bordered}`}>:</span>
              <span className={`text-sm font-bold text-theme break-words py-3 ${bordered}`}>
                {r.value}
              </span>
            </React.Fragment>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="w-full mt-3 text-sm font-semibold text-blue-600 bg-blue-50 py-2.5 rounded-lg"
      >
        Lengkapi / Edit Data
      </button>
    </div>
  );
}

// --- Isi menu "Ganti Password" ------------------------------------------
export function ChangePasswordForm({ student }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pwError, setPwError] = useState(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwError("Semua kolom wajib diisi.");
      return;
    }
    if (newPassword.length < 6) {
      setPwError("Password baru minimal 6 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Konfirmasi password baru tidak cocok.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Cek password lama dulu (tabel student_auth, bukan users —
      // akun siswa di SMP ada di student_auth, cocokin pakai authId)
      const { data: authRow, error: fetchErr } = await supabase
        .from("student_auth")
        .select("id, password")
        .eq("id", student.authId)
        .maybeSingle();

      if (fetchErr) throw fetchErr;
      if (!authRow || authRow.password !== currentPassword) {
        setPwError("Password lama salah.");
        setSubmitting(false);
        return;
      }

      // 2. Update ke password baru
      // TODO KEAMANAN: idealnya hash password sebelum simpen, dan proses
      // ini dijalanin lewat server-side function, bukan langsung dari
      // client kayak sekarang.
      const { error: updateErr } = await supabase
        .from("student_auth")
        .update({ password: newPassword, updated_at: new Date().toISOString() })
        .eq("id", student.authId);

      if (updateErr) throw updateErr;

      setPwSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("[ChangePasswordForm] Gagal ganti password:", err);
      setPwError("Gagal menyimpan password baru. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleChangePassword} className="space-y-3">
      {pwError && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-3 py-2 rounded-lg text-sm">
          {pwError}
        </div>
      )}
      {pwSuccess && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-3 py-2 rounded-lg text-sm">
          Password berhasil diubah.
        </div>
      )}

      <div className="relative">
        <input
          type={showPw ? "text" : "password"}
          placeholder="Password lama"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full text-sm text-theme bg-theme-bg border border-theme rounded-lg px-3 py-2 pr-9 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 focus:border-blue-300"
        />
      </div>
      <div className="relative">
        <input
          type={showPw ? "text" : "password"}
          placeholder="Password baru (min. 6 karakter)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full text-sm text-theme bg-theme-bg border border-theme rounded-lg px-3 py-2 pr-9 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 focus:border-blue-300"
        />
      </div>
      <div className="relative">
        <input
          type={showPw ? "text" : "password"}
          placeholder="Konfirmasi password baru"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full text-sm text-theme bg-theme-bg border border-theme rounded-lg px-3 py-2 pr-9 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 focus:border-blue-300"
        />
        <button
          type="button"
          onClick={() => setShowPw((v) => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
        >
          {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-60"
      >
        {submitting && <Loader2 size={16} className="animate-spin" />}
        {submitting ? "Menyimpan..." : "Simpan Password Baru"}
      </button>
    </form>
  );
}

// --- Isi menu "Keluar" ---------------------------------------------------
export function LogoutSection() {
  const [confirmLogout, setConfirmLogout] = useState(false);

  const handleLogout = () => {
    clearStudentSession();
    // Reload penuh biar semua state ke-reset & balik ke halaman login
    window.location.href = "/";
  };

  if (!confirmLogout) {
    return (
      <button
        type="button"
        onClick={() => setConfirmLogout(true)}
        className="text-sm font-semibold text-red-600"
      >
        Klik untuk konfirmasi keluar dari akun.
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-theme-secondary">Yakin Mau Keluar?</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setConfirmLogout(false)}
          className="flex-1 text-sm font-semibold text-theme-secondary bg-theme-surface py-2 rounded-lg"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="flex-1 text-sm font-semibold text-white bg-red-600 py-2 rounded-lg"
        >
          Ya, Keluar
        </button>
      </div>
    </div>
  );
}
