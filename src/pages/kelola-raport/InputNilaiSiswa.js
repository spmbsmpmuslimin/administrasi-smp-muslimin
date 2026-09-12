// pages/kelola-raport/InputNilaiSiswa.js
// Sub-tab "Input Nilai Siswa" -- khusus kelas 9. Dipisah dari
// RekapKelulusan.js (yang sekarang cuma nampilin rekap NR + Nilai Akhir +
// status, gak ada input/edit nilai per mapel lagi) supaya alur kerjanya
// jelas: pilih kelas -> klik nama siswa -> detail nilai semester 1-6 dia
// kebuka (kekisi otomatis kalau udah ada dari hasil import Excel leger),
// baru di situ TU input/koreksi nilai yang bolong.
//
// Roster + histori nilai ditarik lewat fetchKelulusanRoster() di
// RaportShared.js -- SAMA PERSIS dengan yang dipakai RekapKelulusan.js
// (ditarik per NIS, bukan class_name historis), biar 2 tab ini konsisten
// soal siswa & nilai mana yang lagi dilihat.
//
// Kasih ke sel yang KOSONG tetap bisa diklik/diisi (bukan cuma dekorasi)
// -- ngetik di situ bikin student_reports+student_report_grades baru
// kalau siswa itu belum punya report di semester itu (kasus fotokopi
// raport lama yang belum pernah diinput sama sekali).

import React, { useCallback, useEffect, useState } from "react";
import { Search, ChevronRight, ChevronDown, User } from "lucide-react";
import { supabase } from "../../supabaseClient";
import {
  KELULUSAN_SEMESTERS,
  useKelasSembilanList,
  useAcademicYears,
  useAllReportedSubjects,
  fetchKelulusanRoster,
} from "./RaportShared";

const InputNilaiSiswa = ({ showToast }) => {
  const { kelasList, loading: isLoadingKelas } = useKelasSembilanList(showToast);
  const [kelas, setKelas] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [expandedNis, setExpandedNis] = useState(null);

  const fetchData = useCallback(async () => {
    setExpandedNis(null);
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
      showToast?.("Gagal memuat data siswa", "error");
    } finally {
      setIsLoading(false);
    }
  }, [kelas, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredStudents = students.filter(
    (s) =>
      !search.trim() ||
      s.name.toLowerCase().includes(search.trim().toLowerCase()) ||
      s.nis.includes(search.trim())
  );

  // Jumlah semester yang udah ada minimal 1 nilai -- ditampilin di list
  // biar TU sekilas tau siswa mana yang datanya masih bolong banyak.
  const countSemesterTerisi = (student) =>
    KELULUSAN_SEMESTERS.filter((sem) => (student.gradesBySemester[sem] || []).length > 0).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-end">
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

        {kelas && (
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Cari Siswa
            </label>
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nama atau NIS..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100"
              />
            </div>
          </div>
        )}
      </div>

      {!kelas ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <User className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium text-gray-700 dark:text-gray-300">Pilih kelas dulu</p>
          <p className="text-sm mt-1">Klik nama siswa buat lihat & isi nilai semester 1-6 dia.</p>
        </div>
      ) : isLoading ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
          Memuat data...
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p className="font-medium text-gray-700 dark:text-gray-300">Tidak ada siswa</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredStudents.map((s) => {
            const isExpanded = expandedNis === s.nis;
            const terisi = countSemesterTerisi(s);
            return (
              <div
                key={s.nis}
                className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedNis(isExpanded ? null : s.nis)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-100">{s.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{s.nis}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        terisi === KELULUSAN_SEMESTERS.length
                          ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                          : "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {terisi}/{KELULUSAN_SEMESTERS.length} semester
                    </span>
                    {isExpanded ? (
                      <ChevronDown size={16} className="text-gray-400" />
                    ) : (
                      <ChevronRight size={16} className="text-gray-400" />
                    )}
                  </div>
                </button>
                {isExpanded && (
                  <StudentGradeDetail
                    student={s}
                    showToast={showToast}
                    onStudentUpdate={(updated) =>
                      setStudents((prev) => prev.map((p) => (p.nis === updated.nis ? updated : p)))
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Detail nilai 1 siswa, semester 1-6, dengan sub-tab semester internal.
// Tiap sel nilai bisa diklik & diisi/diedit langsung (auto-save on blur).
const StudentGradeDetail = ({ student, showToast, onStudentUpdate }) => {
  const { years: academicYearOptions } = useAcademicYears(showToast);
  const { subjects: allReportedSubjects } = useAllReportedSubjects(showToast);
  const [semester, setSemester] = useState(1);
  const [savingKey, setSavingKey] = useState(null);
  const [academicYearInput, setAcademicYearInput] = useState(
    student.reportMetaBySemester[1]?.academicYear || ""
  );

  // Ganti semester -> prefill "Tahun Ajaran" dari data yang udah ada di
  // semester itu (kalau ada).
  useEffect(() => {
    setAcademicYearInput(student.reportMetaBySemester[semester]?.academicYear || "");
  }, [semester, student.nis]); // eslint-disable-line react-hooks/exhaustive-deps

  const grades = student.gradesBySemester[semester] || [];
  // Begitu Tahun Ajaran dipilih, langsung tampilin SEMUA mapel yang udah
  // pernah tercatat di sistem (allReportedSubjects) -- gak perlu nambah
  // manual satu-satu lagi. Sebelum Tahun Ajaran dipilih, cuma tampilin
  // mapel yang emang udah ada nilainya (kalau ada), biar gak nge-block
  // liat data existing sebelum TU sempat milih tahun.
  const subjects = academicYearInput
    ? Array.from(new Set([...allReportedSubjects, ...grades.map((g) => g.subject)])).sort()
    : Array.from(new Set(grades.map((g) => g.subject))).sort();

  const handleScoreEdit = async (gradeId, rawValue) => {
    const trimmed = rawValue.trim();
    if (trimmed === "") return;
    const newScore = Number(trimmed);
    if (Number.isNaN(newScore)) {
      showToast?.("Nilai harus berupa angka", "error");
      return;
    }
    setSavingKey(gradeId);
    try {
      const { error } = await supabase
        .from("student_report_grades")
        .update({ score: newScore })
        .eq("id", gradeId);
      if (error) throw error;

      onStudentUpdate({
        ...student,
        gradesBySemester: {
          ...student.gradesBySemester,
          [semester]: grades.map((g) => (g.id === gradeId ? { ...g, score: newScore } : g)),
        },
      });
      showToast?.("Nilai tersimpan", "success");
    } catch (err) {
      console.error(err);
      showToast?.("Gagal menyimpan nilai", "error");
    } finally {
      setSavingKey(null);
    }
  };

  const handleScoreCreate = async (subject, rawValue) => {
    const trimmed = rawValue.trim();
    if (trimmed === "") return;
    const newScore = Number(trimmed);
    if (Number.isNaN(newScore)) {
      showToast?.("Nilai harus berupa angka", "error");
      return;
    }
    if (!academicYearInput) {
      showToast?.(
        `Isi dulu "Tahun Ajaran" buat Semester ${semester} -- baru bisa nambah nilai baru`,
        "error"
      );
      return;
    }

    const cellKey = `new-${subject}`;
    setSavingKey(cellKey);
    try {
      // Report siswa ini di semester ini mungkin udah ada (dari mapel lain
      // yang udah diisi duluan) -- kalau udah ada, tinggal numpang insert
      // grade baru ke report_id yang sama.
      let reportId = student.reportMetaBySemester[semester]?.id;
      if (!reportId) {
        const { data: inserted, error: insertReportErr } = await supabase
          .from("student_reports")
          .insert({
            student_id: student.studentId,
            student_name: student.name,
            student_nis: student.nis,
            // `class_name` kolomnya NOT NULL di DB -- gak bisa dikosongin
            // biarpun kelas SISWA WAKTU ITU (mis. "7F" pas semester 1) gak
            // ditrack di sini (roster yang ditarik cuma kelas SEKARANG,
            // lihat fetchKelulusanRoster di RaportShared.js). Pakai "-"
            // sebagai placeholder eksplisit -- BUKAN kelas 9 sekarang,
            // biar gak nyesatin data historis kalau suatu saat dibaca ulang.
            class_name: "-",
            academic_year: academicYearInput,
            semester,
            status: "draft",
            source_file: null,
          })
          .select("id")
          .single();
        if (insertReportErr) throw insertReportErr;
        reportId = inserted.id;
      }

      const { data: insertedGrade, error: gradeErr } = await supabase
        .from("student_report_grades")
        .insert({ report_id: reportId, subject, score: newScore })
        .select("id, subject, score")
        .single();
      if (gradeErr) throw gradeErr;

      onStudentUpdate({
        ...student,
        gradesBySemester: {
          ...student.gradesBySemester,
          [semester]: [...grades, insertedGrade],
        },
        reportMetaBySemester: {
          ...student.reportMetaBySemester,
          [semester]: { id: reportId, academicYear: academicYearInput },
        },
      });
      showToast?.("Nilai baru tersimpan", "success");
    } catch (err) {
      console.error(err);
      showToast?.(err.message || "Gagal menyimpan nilai baru", "error");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="border-t border-gray-100 dark:border-gray-700 p-4 space-y-4 bg-gray-50/50 dark:bg-gray-900/30">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Semester
          </label>
          <div className="flex gap-1">
            {KELULUSAN_SEMESTERS.map((sem) => (
              <button
                key={sem}
                onClick={() => setSemester(sem)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  semester === sem
                    ? "bg-teal-600 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {sem}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Tahun Ajaran (Semester {semester})
          </label>
          <select
            value={academicYearInput}
            onChange={(e) => setAcademicYearInput(e.target.value)}
            className="px-3 py-1.5 w-36 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100"
          >
            <option value="">Pilih tahun...</option>
            {academicYearOptions.map((ta) => (
              <option key={ta} value={ta}>
                {ta}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Pilih dulu buat nampilin semua mapel siap diisi.
          </p>
        </div>
      </div>

      {subjects.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 italic">
          Belum ada mapel di semester ini. Pilih "Tahun Ajaran" dulu di atas buat nampilin semua
          mapel.
        </p>
      ) : (
        <div className="overflow-x-auto border border-gray-100 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-left text-gray-500 dark:text-gray-400">
                <th className="px-4 py-2 font-medium">Mata Pelajaran</th>
                <th className="px-4 py-2 font-medium text-right w-28">Nilai</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subj) => {
                const grade = grades.find((g) => g.subject === subj);
                const cellKey = grade ? grade.id : `new-${subj}`;
                return (
                  <tr key={subj} className="border-t border-gray-50 dark:border-gray-800">
                    <td className="px-4 py-2 text-gray-700 dark:text-gray-200">{subj}</td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="text"
                        inputMode="decimal"
                        defaultValue={grade?.score ?? ""}
                        placeholder={grade ? undefined : "--"}
                        disabled={savingKey === cellKey}
                        onBlur={(e) => {
                          const val = e.target.value;
                          if (grade) {
                            if (val.trim() === String(grade.score ?? "")) return;
                            handleScoreEdit(grade.id, val);
                          } else {
                            handleScoreCreate(subj, val);
                          }
                        }}
                        className={`w-20 text-right px-2 py-1 rounded border bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 ${
                          grade
                            ? "border-gray-200 dark:border-gray-700"
                            : "border-dashed border-gray-300 dark:border-gray-600"
                        }`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default InputNilaiSiswa;
