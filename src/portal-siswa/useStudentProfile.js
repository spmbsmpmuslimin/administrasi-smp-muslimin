// portal-siswa/useStudentProfile.js
// ========================================================================
// Hook bareng: ambil profil siswa terbaru dari database berdasarkan sesi
// login (localStorage, lewat utils/studentSession.js). Dipakai di
// StudentDashboard, StudentJadwal, StudentPresensi, StudentLainnya — biar
// logic sesi cuma ada di 1 tempat.
//
// PENTING (beda dari versi Bahasa Inggris): di SMP, akun siswa TIDAK ada
// di tabel `users` — akun siswa ada di tabel terpisah `student_auth`
// (student_auth.student_id -> students.id). Jadi hook ini query ke
// `student_auth` + `students`, bukan `users`.
//
// `student.id`      = students.id (dipakai buat FK relasi lain: nilai,
//                      presensi, student_profile_details, piket, dll)
// `student.authId`  = student_auth.id (KHUSUS buat operasi akun/password,
//                      lihat StudentProfile.js -> ChangePasswordForm)
// ========================================================================
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../supabaseClient";
import { getStudentSession, clearStudentSession } from "../utils/studentSession";

// Konversi kode gender dari tabel `students` ("P"/"L") ke label penuh yang
// dipakai konsisten di UI & student_profile_details ("Perempuan"/"Laki-laki").
function genderCodeToLabel(code) {
  if (!code) return "";
  const normalized = String(code).trim().toUpperCase();
  if (normalized === "P") return "Perempuan";
  if (normalized === "L") return "Laki-laki";
  return ""; // kode gak dikenal -> biar fallback ke student_profile_details
}

export default function useStudentProfile() {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  // error: null | "NO_SESSION" | "FETCH_ERROR"
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const session = getStudentSession();
    if (!session) {
      console.error("[useStudentProfile] Sesi siswa gak ketemu.");
      if (mountedRef.current) {
        setError("NO_SESSION");
        setLoading(false);
      }
      return;
    }

    try {
      // 1. Verifikasi akun masih aktif di student_auth
      const { data: authRow, error: authErr } = await supabase
        .from("student_auth")
        .select("id, username, is_active, student_id")
        .eq("id", session.id)
        .maybeSingle();

      if (authErr) throw authErr;

      if (!authRow || !authRow.is_active) {
        console.error(
          "[useStudentProfile] Akun student_auth gak ketemu / non-aktif. session.id:",
          session.id
        );
        clearStudentSession();
        if (mountedRef.current) {
          setError("NO_SESSION");
          setLoading(false);
        }
        return;
      }

      // 2. Ambil data siswa dari tabel students
      const { data: studentRow, error: studentErr } = await supabase
        .from("students")
        // Kolom jenis kelamin di tabel `students` namanya `gender` (isinya
        // kode "P"/"L"), BEDA nama & format sama
        // student_profile_details.jenis_kelamin (isinya "Perempuan"/
        // "Laki-laki", dari dropdown form ProfileInfo). Konversi ke label
        // penuh dilakuin di bawah pas nyusun object `student`.
        .select("id, full_name, nis, class_id, academic_year, is_active, gender")
        .eq("id", authRow.student_id)
        .maybeSingle();

      if (studentErr) throw studentErr;

      if (!studentRow || !studentRow.is_active) {
        console.error("[useStudentProfile] Data siswa gak ketemu / non-aktif.");
        clearStudentSession();
        if (mountedRef.current) {
          setError("NO_SESSION");
          setLoading(false);
        }
        return;
      }

      // 3. Data profil tambahan (alamat, no HP, dst) — boleh kosong
      // kalau siswa belum pernah isi form-nya (maybeSingle -> null,
      // bukan error).
      const { data: detailRow, error: detailErr } = await supabase
        .from("student_profile_details")
        .select(
          "jenis_kelamin, tempat_lahir, tanggal_lahir, nisn, alamat, no_hp, nama_ortu, no_hp_ortu, sekolah_asal, nama_ayah, pekerjaan_ayah, pendidikan_ayah, nama_ibu, pekerjaan_ibu, pendidikan_ibu"
        )
        .eq("student_id", studentRow.id)
        .maybeSingle();

      if (detailErr) {
        console.error("[useStudentProfile] Gagal ambil detail profil tambahan:", detailErr);
      }

      if (mountedRef.current) {
        setStudent({
          id: studentRow.id, // students.id -> dipakai buat FK relasi lain
          // alias biar StudentDashboard.js & StudentPresensi.js (yang manggil
          // student.studentRecordId buat query tabel attendances) tetap jalan
          studentRecordId: studentRow.id,
          authId: authRow.id, // student_auth.id -> khusus operasi akun/password
          username: authRow.username,
          role: "siswa",
          full_name: studentRow.full_name,
          nis: studentRow.nis,
          class_id: studentRow.class_id,
          classId: studentRow.class_id,
          kelas: studentRow.class_id,
          // alias biar StudentLainnya.js (yang manggil
          // student.homeroom_class_id) tetap jalan tanpa diubah
          homeroom_class_id: studentRow.class_id,
          academic_year: studentRow.academic_year,
          is_active: studentRow.is_active,
          alamat: detailRow?.alamat || "",
          no_hp: detailRow?.no_hp || "",
          nama_ortu: detailRow?.nama_ortu || "",
          no_hp_ortu: detailRow?.no_hp_ortu || "",
          sekolah_asal: detailRow?.sekolah_asal || "",
          // Prioritas jenis_kelamin: kolom `students.gender` dulu (kode
          // P/L, dikonversi ke label penuh), baru fallback ke
          // student_profile_details.jenis_kelamin (hasil form siswa
          // sendiri di ProfileInfo) kalau students.gender kosong/gak valid.
          jenis_kelamin: genderCodeToLabel(studentRow?.gender) || detailRow?.jenis_kelamin || "",
          tempat_lahir: detailRow?.tempat_lahir || "",
          tanggal_lahir: detailRow?.tanggal_lahir || "",
          nisn: detailRow?.nisn || "",
          nama_ayah: detailRow?.nama_ayah || "",
          pekerjaan_ayah: detailRow?.pekerjaan_ayah || "",
          pendidikan_ayah: detailRow?.pendidikan_ayah || "",
          nama_ibu: detailRow?.nama_ibu || "",
          pekerjaan_ibu: detailRow?.pekerjaan_ibu || "",
          pendidikan_ibu: detailRow?.pendidikan_ibu || "",
        });
        setLoading(false);
      }
    } catch (err) {
      console.error("[useStudentProfile] Gagal ambil profil siswa:", err);
      if (mountedRef.current) {
        setError("FETCH_ERROR");
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  return { student, loading, error, refetch: load };
}
