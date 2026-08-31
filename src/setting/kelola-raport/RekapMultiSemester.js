// setting/kelola-raport/RekapMultiSemester.js
// Dipanggil sebagai sub-tab dari RaportNilaiTab.js (tab "Rekap Multi
// Semester"). Beda dari ManajemenRaportTable.js -- ini nampilin data
// LINTAS semester dalam satu tabel matrix (siswa x semester), bukan
// per-satu raport.
//
// Karena bentuknya matrix, komponen ini PAKE FILTER SENDIRI (bukan reuse
// SemesterFilterBar.js) -- SemesterFilterBar punya field semester TUNGGAL,
// yang ga cocok buat matrix yang justru mau nampilin SEMUA semester
// sekaligus sbg kolom.
//
// Kalau filter "Mata Pelajaran" dipilih -> kolom semester nampilin nilai
// mapel itu aja. Kalau kosong -> nampilin rata-rata semua mapel per
// semester (keputusan desain, gampang diubah di bagian `useMemo` grouping
// kalau maunya beda -- misal wajib pilih mapel dulu baru tabel muncul).
//
// Export Excel logic ada di exportRekapExcel.js (dipisah dari file ini).
// Perlu `npm install xlsx` (SheetJS) dulu di root project kalau belum ada.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Download, Loader2 } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { exportRekapToExcel } from "./exportRekapExcel";
import { useAcademicYears, useReportedClasses } from "./useAcademicOptions";

const RekapMultiSemester = ({ showToast }) => {
  const [tahunAjaran, setTahunAjaran] = useState("");
  const [kelas, setKelas] = useState("");
  const [mapel, setMapel] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [reports, setReports] = useState([]); // raw dari Supabase, belum di-grouping

  const { years: academicYearsList } = useAcademicYears(showToast);
  // Kelas di sini = kode yang SUDAH PERNAH diimport (student_reports.class_name),
  // bukan dari tabel `classes` -- lihat catatan di useAcademicOptions.js.
  const { classes: classesList, loading: loadingClasses } = useReportedClasses(
    tahunAjaran,
    showToast,
  );

  // Kelas lama gak relevan lagi kalau tahun ajarannya diganti (kode rombel
  // didaur ulang tiap tahun, lihat useAcademicOptions.js).
  useEffect(() => {
    setKelas("");
  }, [tahunAjaran]);

  const fetchRekap = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("student_reports")
        .select(
          "student_name, student_nis, semester, student_report_grades(subject, score)",
        )
        .order("student_name", { ascending: true });

      if (tahunAjaran) query = query.eq("academic_year", tahunAjaran);
      if (kelas) query = query.eq("class_name", kelas);

      const { data, error } = await query;
      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error(err);
      showToast?.("Gagal memuat data rekap", "error");
    } finally {
      setIsLoading(false);
    }
  }, [tahunAjaran, kelas, showToast]);

  useEffect(() => {
    fetchRekap();
  }, [fetchRekap]);

  // Daftar mapel unik dari data yang lagi ke-fetch, buat isi dropdown filter.
  // Dinamis (bukan hardcode) biar otomatis ngikutin mapel apa aja yang
  // beneran ada di data ter-import, ga perlu diupdate manual tiap ganti kurikulum.
  const mapelOptions = useMemo(() => {
    const set = new Set();
    reports.forEach((r) =>
      (r.student_report_grades || []).forEach((g) => set.add(g.subject)),
    );
    return Array.from(set).sort();
  }, [reports]);

  // Grouping data mentah per-raport jadi matrix: 1 siswa = 1 baris,
  // tiap semester yang ada datanya jadi 1 kolom.
  const { studentRows, semesterList } = useMemo(() => {
    const studentMap = new Map();
    const semesterSet = new Set();

    reports.forEach((r) => {
      semesterSet.add(r.semester);

      if (!studentMap.has(r.student_nis)) {
        studentMap.set(r.student_nis, {
          name: r.student_name,
          nis: r.student_nis,
          scoresBySemester: {},
        });
      }

      const grades = r.student_report_grades || [];
      let score = null;

      if (mapel) {
        const found = grades.find((g) => g.subject === mapel);
        score = found ? found.score : null;
      } else if (grades.length > 0) {
        score =
          Math.round(
            (grades.reduce((sum, g) => sum + g.score, 0) / grades.length) * 10,
          ) / 10;
      }

      studentMap.get(r.student_nis).scoresBySemester[r.semester] = score;
    });

    return {
      studentRows: Array.from(studentMap.values()),
      semesterList: Array.from(semesterSet).sort((a, b) => a - b),
    };
  }, [reports, mapel]);

  const handleExport = () => {
    if (!kelas) {
      showToast?.(
        "Pilih kelas dulu sebelum export (biar tiap sheet semester isinya 1 kelas aja)",
        "error",
      );
      return;
    }
    if (studentRows.length === 0) {
      showToast?.("Ga ada data buat di-export", "error");
      return;
    }
    exportRekapToExcel({
      reports,
      mapelOptions,
      mapel,
      fileName: `rekap-nilai${mapel ? `-${mapel}` : ""}-${kelas}.xlsx`,
      context: { tahunAjaran, kelas },
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Tahun Ajaran
          </label>
          <select
            value={tahunAjaran}
            onChange={(e) => setTahunAjaran(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100">
            <option value="">Semua</option>
            {academicYearsList.map((ta) => (
              <option key={ta} value={ta}>
                {ta}
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
            onChange={(e) => setKelas(e.target.value)}
            disabled={loadingClasses}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 disabled:opacity-60">
            <option value="">Semua</option>
            {classesList.map((c) => (
              <option key={c} value={c}>
                Kelas {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Mata Pelajaran
          </label>
          <select
            value={mapel}
            onChange={(e) => setMapel(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100">
            <option value="">Rata-rata semua mapel</option>
            {mapelOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors active:scale-95 ml-auto">
          <Download size={16} />
          Export Excel
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-gray-400 dark:text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Memuat data rekap...</span>
        </div>
      ) : studentRows.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium text-gray-700 dark:text-gray-300">
            Belum ada data
          </p>
          <p className="text-sm mt-1">
            Ga ada raport yang cocok sama filter ini.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-100 dark:border-gray-700 rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-left text-gray-500 dark:text-gray-400">
                <th className="px-4 py-2.5 font-medium sticky left-0 bg-gray-50 dark:bg-gray-800/50">
                  Siswa
                </th>
                {semesterList.map((sem) => (
                  <th
                    key={sem}
                    className="px-4 py-2.5 font-medium text-right whitespace-nowrap">
                    Semester {sem}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {studentRows.map((s) => (
                <tr
                  key={s.nis}
                  className="border-t border-gray-100 dark:border-gray-700">
                  <td className="px-4 py-2.5 sticky left-0 bg-white dark:bg-gray-900">
                    <p className="font-medium text-gray-800 dark:text-gray-100">
                      {s.name}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {s.nis}
                    </p>
                  </td>
                  {semesterList.map((sem) => (
                    <td
                      key={sem}
                      className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-200">
                      {s.scoresBySemester[sem] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RekapMultiSemester;
