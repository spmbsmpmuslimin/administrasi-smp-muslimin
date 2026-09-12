// setting/kelola-raport/RekapKelulusan.js
// Tab rekap buat proses kelulusan kelas 9: rekap NR (Nilai Rapor) per
// mapel dari semester 1-6, hitung Nilai Akhir (NR + NASAJ berbobot), dan
// status Lulus/Tidak Lulus/Belum Lengkap dibanding KKM & batas minimum
// (diisi TU di tab "KKM dan Kelulusan").
//
// SEJAK DIPISAH ke InputNilaiSiswa.js: tab ini TIDAK LAGI tempat buat
// input/edit nilai per mapel per semester -- itu semua sekarang di tab
// "Input Nilai Siswa" (klik nama siswa -> detail semester 1-6). Tab ini
// murni REKAP (NR per mapel + ringkasan) DITAMBAH satu-satunya input yang
// masih ada di sini: NASAJ (Nilai Ujian Sekolah) per siswa, karena itu
// bagian dari proses FINALISASI kelulusan, bukan input nilai raport.
// Begitu semua nilai siswa lengkap (dicek/diisi lewat "Input Nilai
// Siswa"), proses kelulusan (isi NASAJ -> lihat Nilai Akhir & status)
// jalan di sini.
//
// NASAJ masih SEMENTARA cuma disimpen di memori browser (state), BUKAN
// ke database -- belum ada tabel buat nyimpen NASAJ permanen. Ke-reset
// kalau ganti kelas / refresh halaman.
//
// Roster + histori nilai + rumus NR/Nilai Akhir/status ditarik dari
// RaportShared.js (fetchKelulusanRoster, compute*()) -- SAMA PERSIS
// dengan yang dipakai InputNilaiSiswa.js, biar 2 tab ini selalu konsisten.

import React, { useCallback, useEffect, useState } from "react";
import { GraduationCap, Loader2 } from "lucide-react";
import {
  StatusBadge,
  KELULUSAN_SEMESTERS,
  KELULUSAN_BOBOT_NR,
  KELULUSAN_BOBOT_NASAJ,
  useKelasSembilanList,
  useKriteriaKelulusan,
  fetchKelulusanRoster,
  computeAllSubjectsAcrossSemesters,
  computeNRPerMapel,
  computeNRRataRataKeseluruhan,
  computeRataRataSemester,
  computeRataRataSemesterKeseluruhan,
  computeNilaiAkhir,
  computeStatusKelulusan,
} from "./RaportShared";

const RekapKelulusan = ({ showToast }) => {
  const { kelasList, loading: isLoadingKelas } = useKelasSembilanList(showToast);
  const { kkmMap, nilaiAkhirMinimum } = useKriteriaKelulusan(showToast);
  const [kelas, setKelas] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [students, setStudents] = useState([]);

  // NASAJ (Nilai Ujian Sekolah) per siswa -- lihat catatan header soal
  // ini belum tersimpan permanen. { [nis]: number }
  const [nasajByNis, setNasajByNis] = useState({});

  const fetchData = useCallback(async () => {
    setNasajByNis({}); // ganti kelas -> NASAJ in-memory yang lama gak relevan lagi
    if (!kelas) {
      setStudents([]);
      return;
    }
    setIsLoading(true);
    try {
      const { students: fetched } = await fetchKelulusanRoster(kelas);
      setStudents(fetched);
    } catch (err) {
      console.error(err);
      showToast?.("Gagal memuat data kelulusan", "error");
    } finally {
      setIsLoading(false);
    }
  }, [kelas, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const allSubjectsAcrossSemesters = computeAllSubjectsAcrossSemesters(students);

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Kelas 9
        </label>
        <select
          value={kelas}
          onChange={(e) => setKelas(e.target.value)}
          disabled={isLoadingKelas}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 disabled:opacity-60"
        >
          <option value="">Pilih kelas...</option>
          {kelasList.map((k) => (
            <option key={k} value={k}>
              Kelas {k}
            </option>
          ))}
        </select>
      </div>

      {!kelas ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium text-gray-700 dark:text-gray-300">Pilih kelas dulu</p>
          <p className="text-sm mt-1">Rekap nilai kelulusan ditampilkan per kelas 9.</p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-gray-400 dark:text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Memuat data...</span>
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p className="font-medium text-gray-700 dark:text-gray-300">
            Belum ada siswa di kelas ini
          </p>
        </div>
      ) : (
        <>
          {/* NR (Nilai Rapor) per mapel -- lintas semester 1-6, dasar Nilai Ijazah. Read-only. */}
          <div>
            <div className="mb-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                NR (Nilai Rapor) per Mata Pelajaran
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Rata-rata tiap mapel dari semester 1-6 yang sudah ada nilainya (Permendikbudristek
                No. 21/2022). Nilainya diambil dari tab "Input Nilai Siswa" -- kalau ada yang
                kurang, lengkapi di sana.
              </p>
            </div>
            <div className="overflow-x-auto border border-gray-100 dark:border-gray-700 rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 text-left text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-2.5 font-medium sticky left-0 bg-gray-50 dark:bg-gray-800/50">
                      Siswa
                    </th>
                    {allSubjectsAcrossSemesters.map((subj) => (
                      <th
                        key={subj}
                        className="px-3 py-2.5 font-medium text-center whitespace-nowrap"
                      >
                        {subj}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 font-medium text-center whitespace-nowrap bg-teal-50 dark:bg-teal-900/20">
                      Rata-Rata NR
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.nis} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="px-4 py-2.5 sticky left-0 bg-white dark:bg-gray-900">
                        <p className="font-medium text-gray-800 dark:text-gray-100">{s.name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{s.nis}</p>
                      </td>
                      {allSubjectsAcrossSemesters.map((subj) => {
                        const nr = computeNRPerMapel(s.gradesBySemester, subj);
                        return (
                          <td
                            key={subj}
                            className="px-3 py-2.5 text-center text-gray-700 dark:text-gray-200"
                          >
                            {nr ?? "—"}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2.5 text-center font-bold text-teal-700 dark:text-teal-300 bg-teal-50/50 dark:bg-teal-900/10">
                        {computeNRRataRataKeseluruhan(
                          s.gradesBySemester,
                          allSubjectsAcrossSemesters
                        ) ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ringkasan Nilai Akhir Kelulusan -- per semester, rata-rata gabungan,
              NASAJ (satu-satunya input manual yang masih ada di tab ini), dan
              Nilai Akhir hasil rumus berbobot */}
          <div>
            <div className="mb-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Ringkasan Nilai Akhir Kelulusan
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Nilai Akhir = ({KELULUSAN_BOBOT_NR * 100}% × Rata-rata Rapor) + (
                {KELULUSAN_BOBOT_NASAJ * 100}% × NASAJ). Bobot ini masih PLACEHOLDER (belum
                dikonfirmasi ke sekolah), dan kolom NASAJ belum tersimpan permanen ke database --
                isi ulang tiap buka halaman ini.
              </p>
            </div>
            <div className="overflow-x-auto border border-gray-100 dark:border-gray-700 rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 text-left text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-2.5 font-medium sticky left-0 bg-gray-50 dark:bg-gray-800/50">
                      Siswa
                    </th>
                    {KELULUSAN_SEMESTERS.map((sem) => (
                      <th
                        key={sem}
                        className="px-3 py-2.5 font-medium text-center whitespace-nowrap"
                      >
                        Semester {sem}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 font-medium text-center whitespace-nowrap">
                      Rata-rata
                    </th>
                    <th className="px-3 py-2.5 font-medium text-center whitespace-nowrap">NASAJ</th>
                    <th className="px-3 py-2.5 font-medium text-center whitespace-nowrap bg-teal-50 dark:bg-teal-900/20">
                      Nilai Akhir
                    </th>
                    <th className="px-3 py-2.5 font-medium text-center whitespace-nowrap">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => {
                    const rataRataRapor = computeRataRataSemesterKeseluruhan(s.gradesBySemester);
                    const nasaj = nasajByNis[s.nis] ?? "";
                    const nilaiAkhir = computeNilaiAkhir(s.gradesBySemester, nasaj);
                    const { status, alasan } = computeStatusKelulusan(s.gradesBySemester, nasaj, {
                      allSubjectsAcrossSemesters,
                      kkmMap,
                      nilaiAkhirMinimum,
                    });
                    return (
                      <tr key={s.nis} className="border-t border-gray-100 dark:border-gray-700">
                        <td className="px-4 py-2.5 sticky left-0 bg-white dark:bg-gray-900">
                          <p className="font-medium text-gray-800 dark:text-gray-100">{s.name}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{s.nis}</p>
                        </td>
                        {KELULUSAN_SEMESTERS.map((sem) => {
                          const avg = computeRataRataSemester(s.gradesBySemester, sem);
                          return (
                            <td
                              key={sem}
                              className="px-3 py-2.5 text-center text-gray-700 dark:text-gray-200"
                            >
                              {avg ?? "—"}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2.5 text-center font-semibold text-gray-700 dark:text-gray-200">
                          {rataRataRapor ?? "—"}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="isi NASAJ"
                            value={nasaj}
                            onChange={(e) =>
                              setNasajByNis((prev) => ({
                                ...prev,
                                [s.nis]: e.target.value,
                              }))
                            }
                            className="w-20 text-center px-1.5 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-center font-bold text-teal-700 dark:text-teal-300 bg-teal-50/50 dark:bg-teal-900/10">
                          {nilaiAkhir ?? "—"}
                        </td>
                        <td
                          className="px-3 py-2.5 text-center"
                          title={alasan.join(" · ") || undefined}
                        >
                          <StatusBadge type="kelulusan" status={status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RekapKelulusan;
