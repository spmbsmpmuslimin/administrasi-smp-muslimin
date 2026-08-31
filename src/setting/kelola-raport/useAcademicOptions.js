// setting/kelola-raport/useAcademicOptions.js
// Hook bareng: daftar tahun ajaran (dari tabel academic_years, dipakai
// ImportRaportForm.js + filter Manajemen/Rekap) dan daftar kode kelas yang
// SUDAH PERNAH diimport (dari student_reports.class_name, dipakai filter
// Manajemen Nilai & Rekap Multi Semester -- lihat useReportedClasses di
// bawah untuk alasan kenapa BUKAN dari tabel `classes`).
//
// SEBELUMNYA: ketiga file itu hardcode daftar tahun ajaran (cuma
// "2026/2027"). Sekarang ditarik dari DB asli, biar:
//   1. Tahun ajaran lama (mis. 2025/2026) ikut kepilih -- perlu buat import
//      raport arsip lama, bukan cuma tahun berjalan
//   2. Otomatis ke-update tiap ada tahun ajaran baru dibikin lewat fitur
//      Transisi Tahun Ajaran (setting/academic/YearTransition.js) -- gak
//      perlu ubah kode ini lagi tiap tahun

import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";

export function useAcademicYears(showToast) {
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("academic_years")
          .select("year")
          .order("year", { ascending: false });
        if (error) throw error;
        if (mounted) setYears(Array.from(new Set((data || []).map((r) => r.year))));
      } catch (err) {
        console.error("[useAcademicYears] Gagal ambil daftar tahun ajaran:", err);
        showToast?.("Gagal memuat daftar tahun ajaran", "error");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [showToast]);

  return { years, loading };
}

// PENTING: tabel `classes` TERNYATA BUKAN arsip historis per tahun --
// `id` (mis. "7F") adalah primary key TUNGGAL, jadi 1 baris per kode kelas
// yang DITIMPA ULANG tiap kali Transisi Tahun Ajaran jalan (bukan nambah
// baris baru per tahun). Jadi kolom academic_year di tabel itu cuma
// nunjukin kondisi SEKARANG, bukan histori -- gak bisa dipakai buat cari
// "kelas apa aja yang ada di tahun 2025/2026" karena datanya udah ketimpa.
//
// Makanya untuk raport (arsip historis), Kelas TIDAK diambil dari tabel
// `classes`. Sebagai gantinya:
//   - Saat IMPORT: Kelas diisi manual (teks bebas) oleh admin, sesuai apa
//     yang tertulis di PDF raport -- lihat ImportRaportForm.js
//   - Saat FILTER (Manajemen Nilai / Rekap): pilihan Kelas diambil dari
//     nilai class_name yang SUDAH PERNAH diimport ke student_reports
//     (useReportedClasses di bawah) -- ini mencerminkan data yang beneran
//     ada, bukan kondisi kelas saat ini.

export function useReportedClasses(tahunAjaran, showToast) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        let query = supabase.from("student_reports").select("class_name");
        if (tahunAjaran) {
          query = query.eq("academic_year", tahunAjaran);
        }
        const { data, error } = await query;
        if (error) throw error;
        const uniqueClasses = Array.from(
          new Set((data || []).map((r) => r.class_name).filter(Boolean))
        ).sort();
        if (mounted) setClasses(uniqueClasses);
      } catch (err) {
        console.error("[useReportedClasses] Gagal ambil daftar kelas:", err);
        showToast?.("Gagal memuat daftar kelas", "error");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [tahunAjaran, showToast]);

  return { classes, loading };
}
