// setting/kelola-raport/RaportTable.js
// Dipakai di PreviewImportTable.js (mode editable, admin koreksi hasil
// extract sebelum simpan) dan DetailRaportSiswa.js (mode editable, admin
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

import React from "react";

// grades: [{ subject: string, score: number }]
// editable: boolean -- kalau true, nilai jadi input number
// onChangeScore: (subject, newScore) => void
const RaportTable = ({ grades = [], editable = false, onChangeScore }) => {
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

export default RaportTable;
