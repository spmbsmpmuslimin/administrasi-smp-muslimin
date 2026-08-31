// setting/kelola-raport/SemesterFilterBar.js
// Dipakai di ManajemenRaportTable.js dan RekapMultiSemester.js untuk filter
// tahun ajaran / semester / kelas (+ search siswa opsional). Controlled
// component murni -- ga fetch data sendiri, cuma emit onChange({ ...value })
// ke parent, parent yang nentuin apa yang di-fetch/filter berdasarkan itu.
//
// tahunAjaranOptions & kelasOptions WAJIB dikasih dari parent (hasil fetch
// asli lewat useAcademicOptions.js) -- BUKAN hardcode lagi. kelasOptions
// berupa array string kode kelas yang SUDAH PERNAH diimport (dari
// student_reports.class_name lewat useReportedClasses, BUKAN dari tabel
// `classes` -- lihat catatan di useAcademicOptions.js kenapa). Daftar
// semester masih hardcode 1-6 sesuai dokumentasi bag. 8 (rentang semester
// 1-6 / SMP-SMA).

import React from "react";
import { Search } from "lucide-react";

const SEMESTER_OPTIONS = [1, 2, 3, 4, 5, 6];

// value: { tahunAjaran, semester, kelas, search }
// onChange: (partialValue) => void  -- dipanggil dengan field yang berubah aja
const SemesterFilterBar = ({
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

export default SemesterFilterBar;
