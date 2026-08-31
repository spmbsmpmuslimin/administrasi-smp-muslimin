// students/StudentDenahDuduk.js
// ========================================================================
// Versi READ-ONLY dari pages/DenahDuduk.js, khusus portal siswa. Siswa
// cuma bisa LIAT denah duduk kelasnya, gak ada drag-drop/save/shuffle/
// export — semua itu tetep punya wali kelas doang (lewat DenahDuduk.js
// yang aslinya, di menuConfig.js path "/denah-duduk").
//
// Kenapa dipisah jadi file sendiri (bukan reuse DenahDuduk.js apa
// adanya):
// 1. DenahDuduk.js pake `currentUser?.homeroom_class_id` buat nentuin
//    kelas — field ini cuma ada di session GURU. Session siswa
//    (StudentLogin.js) nyimpen `class_id` langsung, beda field.
// 2. DenahDuduk.js itu FULL EDITOR (drag-drop kursi, tombol Simpan/Acak/
//    Kosongkan/Export PDF). Kalau di-embed apa adanya ke portal siswa,
//    siswa bisa ubah2 posisi duduk temannya — jelas gak boleh.
//
// Data yang di-fetch SAMA PERSIS kayak DenahDuduk.js (tabel `students` +
// `seating_charts`, key layout "r-c-slot": student_id), cuma cara
// render-nya dibikin display-only, dan kursi siswa yang lagi login
// di-highlight biar gampang nemuin posisi dia sendiri.
// ========================================================================
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { LayoutGrid, User } from "lucide-react";

export default function StudentDenahDuduk({ student }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [academicYear, setAcademicYear] = useState("");
  const [rows, setRows] = useState(4);
  const [cols, setCols] = useState(5);
  const [seatsPerDesk, setSeatsPerDesk] = useState(2);
  const [layout, setLayout] = useState({});
  const [studentMap, setStudentMap] = useState({});
  const [hasChart, setHasChart] = useState(false);

  const classId = student?.class_id;

  useEffect(() => {
    if (!classId) {
      setError("Kelas Kamu Belum Terdaftar. Hubungi Wali Kelas.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data: activeYear, error: yearError } = await supabase
          .from("academic_years")
          .select("year, semester")
          .eq("is_active", true)
          .single();
        if (yearError) throw yearError;

        const yearStr = activeYear.year;
        const semesterStr = Number(activeYear.semester) === 1 ? "ganjil" : "genap";
        if (cancelled) return;
        setAcademicYear(yearStr);

        const { data: studentData, error: studentError } = await supabase
          .from("students")
          .select("id, full_name, nis")
          .eq("class_id", classId)
          .eq("academic_year", yearStr)
          .eq("is_active", true);
        if (studentError) throw studentError;

        const map = {};
        (studentData || []).forEach((s) => (map[s.id] = s));
        if (cancelled) return;
        setStudentMap(map);

        const { data: chart, error: chartError } = await supabase
          .from("seating_charts")
          .select("*")
          .eq("class_id", classId)
          .eq("academic_year", yearStr)
          .eq("semester", semesterStr)
          .maybeSingle();
        if (chartError) throw chartError;

        if (cancelled) return;
        if (chart) {
          setRows(chart.rows || 4);
          setCols(chart.cols || 5);
          setSeatsPerDesk(chart.seats_per_desk || 2);
          setLayout(chart.layout || {});
          setHasChart(true);
        } else {
          setHasChart(false);
        }
      } catch (err) {
        console.error("Error loading seating chart (student view):", err);
        if (!cancelled) setError(err.message || "Gagal Memuat Denah Duduk.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [classId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-14">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-14 text-sm text-red-500">{error}</div>;
  }

  if (!hasChart) {
    return (
      <div className="text-center py-14">
        <LayoutGrid size={32} className="mx-auto text-gray-300 mb-3" />
        <p className="text-sm text-theme-secondary">
          Denah Duduk Kelas {classId} Belum Diatur Wali Kelas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-theme-secondary text-center">
        Kelas {classId} &middot; Tahun Ajaran {academicYear}
      </p>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 overflow-x-auto">
        <div className="mb-3 text-[10px] text-gray-400 text-center">
          💡 Geser Ke Kanan Untuk Lihat Meja Lainnya
        </div>
        <div className="inline-block min-w-full">
          <div className="mb-4 text-xs text-gray-400 text-center">
            — Papan Tulis / Depan Kelas —
          </div>
          <div className="flex flex-col gap-3 items-center">
            {/* Meja Guru */}
            <div className="flex gap-2.5">
              {Array.from({ length: cols - 1 }).map((_, i) => (
                <div key={`spacer-${i}`} className="invisible flex flex-col items-center gap-1">
                  <span className="text-[9px]">&nbsp;</span>
                  <div className="flex gap-1 p-1">
                    {Array.from({ length: seatsPerDesk }).map((_, s) => (
                      <div key={s} className="w-[76px] h-[58px]" />
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex flex-col items-center gap-1">
                <span className="text-[9px] text-gray-400">Meja Guru</span>
                <div className="flex gap-1 bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-700 rounded-lg p-1">
                  <div
                    className="h-[58px] flex flex-col items-center justify-center gap-0.5"
                    style={{ width: `${seatsPerDesk * 76 + (seatsPerDesk - 1) * 4}px` }}
                  >
                    <User size={16} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[8px] font-medium text-emerald-700 dark:text-emerald-400">
                      Guru
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {Array.from({ length: rows }).map((_, r) => (
              <div key={r} className="flex gap-2.5">
                {Array.from({ length: cols }).map((_, c) => (
                  <div key={c} className="flex flex-col items-center gap-1">
                    <span className="text-[9px] text-gray-300">Meja {r * cols + c + 1}</span>
                    <div className="flex gap-1 bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-800 rounded-lg p-1">
                      {Array.from({ length: seatsPerDesk }).map((_, slot) => {
                        const key = `${r}-${c}-${slot}`;
                        const studentId = layout[key];
                        const s = studentId ? studentMap[studentId] : null;
                        const isMe = s && student?.id === s.id;

                        return (
                          <div
                            key={slot}
                            className={`w-[76px] h-[58px] rounded-md border-2 flex flex-col items-center justify-center p-1 text-center ${
                              isMe
                                ? "bg-indigo-100 dark:bg-indigo-900/40 border-indigo-400"
                                : s
                                  ? "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800"
                                  : "bg-white dark:bg-gray-800 border-dashed border-gray-200 dark:border-gray-700"
                            }`}
                          >
                            {s ? (
                              <span
                                className={`text-[9px] font-semibold leading-tight line-clamp-3 ${
                                  isMe
                                    ? "text-indigo-900 dark:text-indigo-300"
                                    : "text-blue-900 dark:text-blue-300"
                                }`}
                              >
                                {isMe ? "Kamu" : s.full_name}
                              </span>
                            ) : (
                              <span className="text-[8px] text-gray-300">Kosong</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
