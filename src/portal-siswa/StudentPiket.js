// students/StudentPiket.js
// Isi menu "Jadwal Piket" di halaman Akun. Dulu logic ini nempel di
// StudentLainnya.js dan langsung fetch begitu halaman kebuka; sekarang
// dipisah jadi komponen sendiri yang cuma di-mount (jadi cuma fetch)
// pas accordion-nya diklik.
//
// CATATAN MIGRASI (Agustus 2026): sebelumnya komponen ini baca dari
// tabel "piket_schedule" (row-based, hasil insert SQL manual, gak ada
// konsep tahun ajaran/semester). Sekarang disamain sama sumber data
// yang dipakai dashboard Walikelas di JadwalPiket.js, yaitu tabel
// "duty_schedules" (satu baris per kelas+tahun ajaran+semester, isi
// jadwalnya jsonb: { "Senin": [student_id, ...], ... }). Ini penting
// biar jadwal yang disusun Walikelas lewat drag-and-drop beneran
// muncul di portal siswa.
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { DAY_NAMES, getDayName } from "./StudentHelpers";

// Ikutin jadwal KBM: Senin-Jumat (samain sama SCHOOL_DAYS di StudentJadwal.js)
const SCHOOL_DAYS = DAY_NAMES.filter((d) => d !== "Minggu" && d !== "Sabtu");

export default function StudentPiket({ student }) {
  const [piketWeek, setPiketWeek] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Sama kayak StudentJadwal.js: kalau hari ini bukan hari sekolah,
  // default balik ke Senin biar gak nyangkut ke tab yang gak jelas.
  const today = getDayName();
  const [activeDay, setActiveDay] = useState(
    SCHOOL_DAYS.includes(today) ? today : "Senin",
  );

  // Swipe pindah hari, pola sama persis kayak StudentJadwal.js
  const touchStartX = useRef(null);
  const SWIPE_THRESHOLD = 50;

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(diff) < SWIPE_THRESHOLD) return;

    const idx = SCHOOL_DAYS.indexOf(activeDay);
    if (diff < 0 && idx < SCHOOL_DAYS.length - 1) {
      setActiveDay(SCHOOL_DAYS[idx + 1]);
    } else if (diff > 0 && idx > 0) {
      setActiveDay(SCHOOL_DAYS[idx - 1]);
    }
  };

  useEffect(() => {
    if (!student) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Ambil tahun ajaran + semester yang lagi aktif (sama kayak
        // yang dipakai JadwalPiket.js di sisi Walikelas).
        const { data: activeYear, error: yearError } = await supabase
          .from("academic_years")
          .select("year, semester")
          .eq("is_active", true)
          .single();

        if (yearError) throw yearError;

        const yearStr = activeYear.year;
        const semesterStr =
          Number(activeYear.semester) === 1 ? "ganjil" : "genap";

        // 2. Ambil jadwal piket kelas ini untuk tahun ajaran & semester
        // yang aktif. layout jsonb-nya bentuknya { "Senin": [student_id, ...], ... }.
        const { data: chart, error: chartErr } = await supabase
          .from("duty_schedules")
          .select("layout")
          .eq("class_id", student.homeroom_class_id)
          .eq("academic_year", yearStr)
          .eq("semester", semesterStr)
          .maybeSingle();

        if (chartErr) throw chartErr;

        const layout = chart?.layout || {};
        const siswaIds = [
          ...new Set(Object.values(layout).flat().filter(Boolean)),
        ];

        // 3. Ambil nama siswa-siswa itu dari tabel students.
        let namesById = {};
        if (siswaIds.length > 0) {
          const { data: studentRows, error: studentErr } = await supabase
            .from("students")
            .select("id, full_name")
            .in("id", siswaIds);

          if (studentErr) throw studentErr;
          namesById = Object.fromEntries(
            (studentRows || []).map((s) => [s.id, s.full_name]),
          );
        }

        // 4. Ratain jadi bentuk { hari, siswa_id, full_name } biar
        // logic render di bawah (piketByDay) gak usah diubah.
        const rows = Object.entries(layout).flatMap(([hari, ids]) =>
          (ids || []).map((siswaId) => ({
            hari,
            siswa_id: siswaId,
            full_name: namesById[siswaId] || null,
          })),
        );

        setPiketWeek(rows);
      } catch (err) {
        console.error("[StudentPiket] Gagal ambil jadwal piket:", err);
        setError("Gagal memuat jadwal piket.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [student]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
        ⚠️ {error}
      </div>
    );
  }

  const namesForDay = (day) =>
    piketWeek
      .filter((p) => p.hari === day)
      .map((p) => p.full_name)
      .filter(Boolean);

  const activeNames = namesForDay(activeDay);

  return (
    <>
      {/* Tab hari — pola sama persis kayak StudentJadwal.js */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {SCHOOL_DAYS.map((day) => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border transition ${
              activeDay === day
                ? "bg-orange-600 border-orange-600 text-white"
                : "bg-theme-bg border-theme text-theme-secondary"
            }`}>
            {day}
          </button>
        ))}
      </div>

      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {activeNames.length === 0 ? (
          <div className="bg-theme-bg rounded-2xl border border-gray-100 p-8 text-center text-theme-secondary text-sm shadow-sm">
            🧹 Tidak ada petugas piket di hari {activeDay}.
          </div>
        ) : (
          <div className="bg-theme-bg rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800/60 border-b-2 border-gray-300 dark:border-gray-600">
                    <th className="text-left font-semibold text-theme-secondary px-4 py-2 whitespace-nowrap w-14">
                      No
                    </th>
                    <th className="text-left font-semibold text-theme-secondary px-4 py-2">
                      Petugas Piket
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeNames.map((name, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-300 dark:border-gray-600 last:border-b-0">
                      <td className="text-sm font-semibold text-theme px-4 py-2.5">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-sm font-medium text-theme">
                          {name}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
