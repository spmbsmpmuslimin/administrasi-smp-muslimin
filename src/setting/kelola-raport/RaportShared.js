// setting/kelola-raport/RaportShared.js
// Kumpulan komponen UI kecil + hook data akademik yang dipakai BARENG-BARENG
// oleh lebih dari satu file di fitur "Nilai Raport" -- digabung jadi satu
// modul dari sebelumnya 4 file terpisah (StatusBadge.js, RaportTable.js,
// SemesterFilterBar.js, useAcademicOptions.js), soalnya masing2 kecil dan
// selalu dipakai bareng-bareng (mis. StatusBadge dipakai di 4 file
// berbeda), jadi mubazir kalau dipecah sendiri-sendiri.
//
// Bagian yang "anak tunggal" (cuma dipakai 1 parent doang) SENGAJA TIDAK
// dipindah ke sini, tetap nempel di parent-nya masing2:
//   - ImportProgress + PreviewImportTable -> digabung ke ImportRaportForm.js
//   - DetailRaportSiswa                   -> digabung ke ManajemenRaportTable.js
//   - exportRekapExcel                    -> digabung ke RekapMultiSemester.js
//
// Isi:
//   - StatusBadge         : badge status (import / publish / kelulusan)
//   - RaportTable          : tabel mapel+nilai (editable / read-only)
//   - SemesterFilterBar    : filter tahun ajaran/semester/kelas/search
//   - useAcademicYears     : hook daftar tahun ajaran (tabel academic_years)
//   - useReportedClasses   : hook daftar kelas yang SUDAH PERNAH diimport

import React, { useState, useEffect } from "react";
import {
  Check,
  AlertTriangle,
  X,
  FileEdit,
  Globe,
  AlertCircle,
  Search,
} from "lucide-react";
import { supabase } from "../../supabaseClient";

// ============================================================
// StatusBadge
// Dipakai di PreviewImportTable (status extract: Valid/Perlu Diperiksa/
// Gagal Dibaca) dan di ManajemenRaportTable + DetailRaportSiswa (status
// publish: Draft/Published) dan RekapKelulusan (status kelulusan). Satu
// komponen, tiga "type" beda konfig warna & label -- ga ada logic lain
// selain nampilin label sesuai status.
//
// Dokumentasi terkait: bag. 7 (status Draft/Published) & bag. 10 (status
// validasi import: ✓ Valid / ⚠ Perlu Diperiksa / ✕ Gagal Dibaca).
// ============================================================

const IMPORT_CONFIG = {
  valid: {
    label: "Valid",
    icon: Check,
    className:
      "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  warning: {
    label: "Perlu Diperiksa",
    icon: AlertTriangle,
    className:
      "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  failed: {
    label: "Gagal Dibaca",
    icon: X,
    className:
      "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
  },
};

const PUBLISH_CONFIG = {
  draft: {
    label: "Draft",
    icon: FileEdit,
    className:
      "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600",
  },
  published: {
    label: "Published",
    icon: Globe,
    className:
      "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800",
  },
};

// Status kelulusan siswa kelas 9 -- dihitung di RekapKelulusan.js
// (computeStatusKelulusan), berdasarkan KKM per mapel + batas minimum
// Nilai Akhir yang diisi TU di KelolaKKM.js.
const KELULUSAN_CONFIG = {
  lulus: {
    label: "Lulus",
    icon: Check,
    className:
      "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  tidak_lulus: {
    label: "Tidak Lulus",
    icon: X,
    className:
      "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
  },
  belum_lengkap: {
    label: "Belum Lengkap",
    icon: AlertCircle,
    className:
      "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
};

// type: "import" | "publish" | "kelulusan"
// status: "valid" | "warning" | "failed"        (kalau type="import")
//         "draft" | "published"                 (kalau type="publish")
//         "lulus" | "tidak_lulus" | "belum_lengkap" (kalau type="kelulusan")
export const StatusBadge = ({ type = "import", status }) => {
  const config =
    type === "publish"
      ? PUBLISH_CONFIG[status]
      : type === "kelulusan"
        ? KELULUSAN_CONFIG[status]
        : IMPORT_CONFIG[status];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
};

// ============================================================
// RaportTable
// Dipakai di PreviewImportTable (mode editable, admin koreksi hasil
// extract sebelum simpan) dan DetailRaportSiswa (mode editable, admin
// edit nilai raport yang udah tersimpan). Satu komponen tabel mapel+nilai
// murni presentational -- ga nyimpen data sendiri, parent yang pegang state
// & dikasih balik lewat onChangeScore.
//
// Nilai kosong (score null/undefined, mis. hasil extract yang emang gak
// kebaca) ditandain jelas -- border+ring kuning & placeholder "Kosong" pas
// editable, teks kuning italic "kosong" pas read-only -- biar admin ga
// perlu nebak baris mana yang bolong pas expand row yang statusnya "Perlu
// Diperiksa" (sebelumnya nilai kosong nongol sebagai kotak angka biasa yang
// polos, gampang kelewat di antara banyak baris lain).
//
// Dokumentasi terkait: bag. 5 (Nilai Akademik: mata pelajaran + nilai akhir)
// dan bag. 8 (tampilan Portal Siswa).
// ============================================================

// grades: [{ subject: string, score: number }]
// editable: boolean -- kalau true, nilai jadi input number
// onChangeScore: (subject, newScore) => void
export const RaportTable = ({ grades = [], editable = false, onChangeScore }) => {
  if (!grades.length) {
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500 italic py-4">
        Belum ada data nilai.
      </p>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
          <th className="py-2 font-medium">Mata Pelajaran</th>
          <th className="py-2 font-medium text-right w-24">Nilai</th>
        </tr>
      </thead>
      <tbody>
        {grades.map((g) => {
          const isEmpty = g.score === null || g.score === undefined;
          return (
            <tr
              key={g.subject}
              className="border-b border-gray-50 dark:border-gray-800 last:border-0">
              <td className="py-2 text-gray-700 dark:text-gray-200">
                {g.subject}
              </td>
              <td className="py-2 text-right">
                {editable ? (
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={g.score ?? ""}
                    placeholder={isEmpty ? "Kosong" : undefined}
                    onChange={(e) =>
                      onChangeScore?.(
                        g.subject,
                        e.target.value === "" ? null : Number(e.target.value),
                      )
                    }
                    className={`w-16 text-right px-2 py-1 rounded border bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder:text-amber-500 dark:placeholder:text-amber-400 ${
                      isEmpty
                        ? "border-amber-400 dark:border-amber-600 ring-1 ring-amber-200 dark:ring-amber-900"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  />
                ) : isEmpty ? (
                  <span className="text-amber-600 dark:text-amber-400 italic">
                    kosong
                  </span>
                ) : (
                  <span className="font-medium text-gray-800 dark:text-gray-100">
                    {g.score}
                  </span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

// ============================================================
// SemesterFilterBar
// Dipakai di ManajemenRaportTable dan RekapMultiSemester untuk filter
// tahun ajaran / semester / kelas (+ search siswa opsional). Controlled
// component murni -- ga fetch data sendiri, cuma emit onChange({ ...value })
// ke parent, parent yang nentuin apa yang di-fetch/filter berdasarkan itu.
//
// tahunAjaranOptions & kelasOptions WAJIB dikasih dari parent (hasil fetch
// asli lewat useAcademicYears/useReportedClasses di bawah) -- BUKAN
// hardcode lagi. kelasOptions berupa array string kode kelas yang SUDAH
// PERNAH diimport (dari student_reports.class_name lewat
// useReportedClasses, BUKAN dari tabel `classes` -- lihat catatan di
// useReportedClasses di bawah kenapa). Daftar semester masih hardcode 1-6
// sesuai dokumentasi bag. 8 (rentang semester 1-6 / SMP-SMA).
// ============================================================

const SEMESTER_OPTIONS = [1, 2, 3, 4, 5, 6];

// value: { tahunAjaran, semester, kelas, search }
// onChange: (partialValue) => void  -- dipanggil dengan field yang berubah aja
export const SemesterFilterBar = ({
  tahunAjaranOptions = [],
  kelasOptions = [],
  value,
  onChange,
  showSearch = true,
}) => {
  const { tahunAjaran = "", semester = "", kelas = "", search = "" } = value || {};

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Tahun Ajaran
        </label>
        <select
          value={tahunAjaran}
          onChange={(e) => onChange?.({ tahunAjaran: e.target.value })}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100"
        >
          <option value="">Semua</option>
          {tahunAjaranOptions.map((ta) => (
            <option key={ta} value={ta}>
              {ta}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Semester
        </label>
        <select
          value={semester}
          onChange={(e) => onChange?.({ semester: e.target.value })}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100"
        >
          <option value="">Semua</option>
          {SEMESTER_OPTIONS.map((s) => (
            <option key={s} value={s}>
              Semester {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Kelas
        </label>
        <select
          value={kelas}
          onChange={(e) => onChange?.({ kelas: e.target.value })}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100"
        >
          <option value="">Semua</option>
          {kelasOptions.map((k) => (
            <option key={k} value={k}>
              Kelas {k}
            </option>
          ))}
        </select>
      </div>

      {showSearch && (
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Cari Siswa
          </label>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => onChange?.({ search: e.target.value })}
              placeholder="Nama atau NIS/NISN..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// useAcademicYears / useReportedClasses
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
// ============================================================

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
