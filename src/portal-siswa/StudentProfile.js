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
import { Eye, EyeOff, Loader2 } from "lucide-react";

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
// no peserta ujian, dusun, kode pos, NIK ortu, tempat/tgl lahir ortu,
// No. KIP, anak ke-, keterangan, no daftar) udah ditambahin ke form ini
// dan ke query di useStudentProfile.js — kolomnya udah ada di tabel
// student_profile_details (lihat DDL terbaru).
// Field lama yang generic (nama_ortu) udah gak dipake di form ini karena
// dipecah jadi Ayah/Ibu terpisah — kolom lamanya dibiarin aja di DB (gak
// didrop) buat jaga-jaga data lama, tapi UI-nya udah gak nampilin/isi itu.
//
// `onUpdated` (opsional): dipanggil abis form data tambahan berhasil
// disimpen, biasanya diisi `refetch` dari useStudentProfile() supaya
// data yang tampil langsung ke-update tanpa reload halaman.

const PENDIDIKAN_OPTIONS = ["SD", "SMP", "SMA", "D3", "S1", "S2"];

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

export function ProfileInfo({ student, onUpdated }) {
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [form, setForm] = useState({
    alamat: "",
    no_hp: "",
    nama_ayah: "",
    pekerjaan_ayah: "",
    pendidikan_ayah: "",
    nama_ibu: "",
    pekerjaan_ibu: "",
    pendidikan_ibu: "",
    no_hp_ortu: "",
    dusun: "",
    kode_pos: "",
    anak_ke: "",
    keterangan: "",
  });

  // Sinkronin form pas data student berubah (pertama kali load, atau
  // abis refetch sukses) — biar form gak nampilin data basi.
  useEffect(() => {
    setForm({
      alamat: student?.alamat || "",
      no_hp: student?.no_hp || "",
      nama_ayah: student?.nama_ayah || "",
      pekerjaan_ayah: student?.pekerjaan_ayah || "",
      pendidikan_ayah: student?.pendidikan_ayah || "",
      nama_ibu: student?.nama_ibu || "",
      pekerjaan_ibu: student?.pekerjaan_ibu || "",
      pendidikan_ibu: student?.pendidikan_ibu || "",
      no_hp_ortu: student?.no_hp_ortu || "",
      dusun: student?.dusun || "",
      kode_pos: student?.kode_pos || "",
      anak_ke: student?.anak_ke ?? "",
      keterangan: student?.keterangan || "",
    });
  }, [student]);

  // ---- Tampilan (bukan edit) — dikelompokin persis kayak formulir ----
  const rows = [
    { section: "Data Siswa" },
    { label: "Nama Lengkap", value: student?.full_name || "-" },
    { label: "Username", value: `@${student?.username || "-"}` },
    { label: "NIS", value: student?.nis || "-" },
    { label: "NISN", value: student?.nisn || "-" },
    { label: "Jenis Kelamin", value: student?.jenis_kelamin || "-" },
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
    { label: "Dusun", value: student?.dusun || "-" },
    { label: "Kode Pos", value: student?.kode_pos || "-" },
    { label: "No. HP Siswa (Kalau Ada)", value: student?.no_hp || "-" },
    { label: "Agama", value: student?.agama || "-" },
    { label: "Anak Ke-", value: student?.anak_ke || "-" },
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
    // divider: true -> pemisah blok Data Orangtua & Data Kelulusan/Lainnya.
    { section: "Data Kelulusan & Lainnya", divider: true },
    { label: "No. Ijazah", value: student?.no_ijazah || "-" },
    { label: "No. Peserta Ujian", value: student?.no_peserta_ujian || "-" },
    { label: "No. Daftar", value: student?.no_daftar || "-" },
    { label: "Keterangan", value: student?.keterangan || "-" },
  ];

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
      setFormError(
        "No. HP Siswa tidak valid. Contoh format yang benar: 08123456789.",
      );
      return;
    }
    if (form.no_hp_ortu && !isValidPhone(form.no_hp_ortu)) {
      setFormError(
        "No. HP Orang Tua/Wali tidak valid. Contoh format yang benar: 08123456789.",
      );
      return;
    }

    setSubmitting(true);
    try {
      // Upsert: 1 baris per siswa di student_profile_details
      // (student_id = primary key), jadi otomatis update kalau udah
      // pernah isi, atau insert kalau baru pertama kali.
      // Kirim CUMA field Kelompok B (kontak & data ortu deskriptif) dari
      // sisi siswa. Field identitas/dokumen resmi (jenis_kelamin,
      // tempat/tanggal lahir, agama, NIK, No.KK, No.Akta Lahir, sekolah
      // asal, No.KIP/Ijazah/Peserta Ujian/Daftar, NIK & TTL ortu) SENGAJA
      // gak dikirim dari sini lagi -- sekarang cuma admin/TU yang isi/edit
      // field itu lewat KelengkapanDataSiswa.js, biar tervalidasi ke
      // dokumen fisik (samain pola kayak NISN yang udah duluan begini).
      const { error: upsertErr } = await supabase
        .from("student_profile_details")
        .upsert(
          {
            student_id: student.id,
            alamat: form.alamat || null,
            no_hp: form.no_hp ? normalizePhone(form.no_hp) : null,
            nama_ayah: form.nama_ayah || null,
            pekerjaan_ayah: form.pekerjaan_ayah || null,
            pendidikan_ayah: form.pendidikan_ayah || null,
            nama_ibu: form.nama_ibu || null,
            pekerjaan_ibu: form.pekerjaan_ibu || null,
            pendidikan_ibu: form.pendidikan_ibu || null,
            no_hp_ortu: form.no_hp_ortu
              ? normalizePhone(form.no_hp_ortu)
              : null,
            dusun: form.dusun || null,
            kode_pos: form.kode_pos || null,
            anak_ke: form.anak_ke === "" ? null : Number(form.anak_ke),
            keterangan: form.keterangan || null,
            updated_at: new Date().toISOString(),
            // Data berubah -> status verifikasi admin otomatis batal, harus
            // dicek ulang. Lihat KelengkapanDataSiswa.js buat tombol
            // "Tandai Terverifikasi"-nya.
            verified_at: null,
          },
          { onConflict: "student_id" },
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
  const labelClass = "block text-sm font-semibold text-theme-secondary mb-1";

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
            Data identitas resmi (jenis kelamin, tempat/tanggal lahir, agama,
            NIK, No. KK, No. Akta Lahir, sekolah asal, No. KIP/Ijazah/Peserta
            Ujian/Daftar) dikelola oleh Tata Usaha berdasarkan dokumen fisik.
            Kalau ada yang salah/kosong, hubungi Tata Usaha — bukan diisi
            sendiri dari sini.
          </p>

          <div>
            <label className={labelClass}>NISN</label>
            <input
              type="text"
              value={student?.nisn || "Belum tersedia, hubungi Tata Usaha"}
              disabled
              className={`${inputClass} bg-theme-surface text-theme-secondary cursor-not-allowed`}
            />
          </div>

          <div>
            <label className={labelClass}>Alamat Lengkap</label>
            <textarea
              rows={2}
              value={form.alamat}
              onChange={(e) =>
                setForm((f) => ({ ...f, alamat: e.target.value }))
              }
              placeholder="Contoh: Kp. Cikadu RT 08 RW 07 Desa Bongas Kec. Cililin Kab. Bandung Barat"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Dusun</label>
              <input
                type="text"
                value={form.dusun}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dusun: e.target.value }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Kode Pos</label>
              <input
                type="text"
                value={form.kode_pos}
                onChange={(e) =>
                  setForm((f) => ({ ...f, kode_pos: e.target.value }))
                }
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>No. HP Siswa (Kalau Ada)</label>
            <input
              type="tel"
              value={form.no_hp}
              onChange={(e) =>
                setForm((f) => ({ ...f, no_hp: e.target.value }))
              }
              placeholder="08xxxxxxxxxx"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Anak Ke-</label>
            <input
              type="number"
              min="1"
              value={form.anak_ke}
              onChange={(e) =>
                setForm((f) => ({ ...f, anak_ke: e.target.value }))
              }
              className={inputClass}
            />
          </div>
        </div>

        {/* ---- Data Orangtua (gabungan Ayah, Ibu, & Kontak) ---- */}
        <div className="mt-3 pt-4 border-t-2 border-theme space-y-3">
          <p className="text-sm font-extrabold uppercase tracking-wide text-theme-secondary">
            Data Orangtua
          </p>
          <p className="text-xs text-theme-secondary -mt-1">
            NIK & tempat/tanggal lahir ayah-ibu dikelola Tata Usaha (data
            dokumen resmi). Bagian ini cuma buat data yang sering berubah.
          </p>
          <div>
            <label className={labelClass}>Nama Lengkap Ayah</label>
            <input
              type="text"
              value={form.nama_ayah}
              onChange={(e) =>
                setForm((f) => ({ ...f, nama_ayah: e.target.value }))
              }
              placeholder="Nama lengkap ayah"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Pekerjaan Ayah</label>
            <input
              type="text"
              value={form.pekerjaan_ayah}
              onChange={(e) =>
                setForm((f) => ({ ...f, pekerjaan_ayah: e.target.value }))
              }
              placeholder="Contoh: Wiraswasta"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Pendidikan Terakhir Ayah</label>
            <select
              value={form.pendidikan_ayah}
              onChange={(e) =>
                setForm((f) => ({ ...f, pendidikan_ayah: e.target.value }))
              }
              className={inputClass}>
              <option value="">Pilih pendidikan terakhir</option>
              {PENDIDIKAN_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Nama Lengkap Ibu</label>
            <input
              type="text"
              value={form.nama_ibu}
              onChange={(e) =>
                setForm((f) => ({ ...f, nama_ibu: e.target.value }))
              }
              placeholder="Nama lengkap ibu"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Pekerjaan Ibu</label>
            <input
              type="text"
              value={form.pekerjaan_ibu}
              onChange={(e) =>
                setForm((f) => ({ ...f, pekerjaan_ibu: e.target.value }))
              }
              placeholder="Contoh: Ibu Rumah Tangga"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Pendidikan Terakhir Ibu</label>
            <select
              value={form.pendidikan_ibu}
              onChange={(e) =>
                setForm((f) => ({ ...f, pendidikan_ibu: e.target.value }))
              }
              className={inputClass}>
              <option value="">Pilih pendidikan terakhir</option>
              {PENDIDIKAN_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>No. HP Orang Tua/Wali</label>
            <input
              type="tel"
              value={form.no_hp_ortu}
              onChange={(e) =>
                setForm((f) => ({ ...f, no_hp_ortu: e.target.value }))
              }
              placeholder="08xxxxxxxxxx"
              className={inputClass}
            />
          </div>
        </div>

        {/* ---- Lainnya ---- */}
        <div className="mt-3 pt-4 border-t-2 border-theme space-y-3">
          <p className="text-sm font-extrabold uppercase tracking-wide text-theme-secondary">
            Lainnya
          </p>
          <p className="text-xs text-theme-secondary -mt-1">
            No. Ijazah, No. Peserta Ujian, dan No. Daftar dikelola Tata Usaha.
          </p>
          <div>
            <label className={labelClass}>Keterangan</label>
            <textarea
              rows={2}
              value={form.keterangan}
              onChange={(e) =>
                setForm((f) => ({ ...f, keterangan: e.target.value }))
              }
              placeholder="Catatan tambahan (opsional)"
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="flex-1 text-sm font-semibold text-theme-secondary bg-theme-surface py-2.5 rounded-lg">
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-60">
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div>
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
                  isFirst
                    ? "pt-0"
                    : r.divider
                      ? "mt-3 pt-4 border-t-2 border-theme"
                      : "pt-4"
                }`}>
                {r.section}
              </p>
            );
          }
          const prev = rows[i - 1];
          const bordered =
            i !== 0 && !prev?.section ? "border-t border-gray-100" : "";
          return (
            <React.Fragment key={r.label}>
              <span
                className={`text-sm font-medium text-theme-secondary whitespace-nowrap py-3 ${bordered}`}>
                {r.label}
              </span>
              <span
                className={`text-sm font-medium text-theme-secondary py-3 ${bordered}`}>
                :
              </span>
              <span
                className={`text-sm font-bold text-theme break-words py-3 ${bordered}`}>
                {r.value}
              </span>
            </React.Fragment>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="w-full mt-3 text-sm font-semibold text-blue-600 bg-blue-50 py-2.5 rounded-lg">
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
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
          {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-60">
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
        className="text-sm font-semibold text-red-600">
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
          className="flex-1 text-sm font-semibold text-theme-secondary bg-theme-surface py-2 rounded-lg">
          Batal
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="flex-1 text-sm font-semibold text-white bg-red-600 py-2 rounded-lg">
          Ya, Keluar
        </button>
      </div>
    </div>
  );
}
