// students/StudentJadwal.js
// Jadwal pelajaran mingguan penuh buat siswa (read-only, cuma kelas sendiri).
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import useStudentProfile from "./useStudentProfile";
import { DAY_NAMES, getDayName, isOngoing } from "./StudentHelpers";

// Senin - Jumat (KBM cuma Senin-Jumat, Sabtu & Minggu libur)
const SCHOOL_DAYS = DAY_NAMES.filter((d) => d !== "Minggu" && d !== "Sabtu");

// FIX: dulu CLASS_NAME di-hardcode "7B" (app awalnya emang khusus 7B),
// tapi query di bawah udah difilter benar pakai student.homeroom_class_id
// — cuma judul halaman yang kelewat masih nulis "7B" buat semua siswa,
// gimanapun kelasnya. Sekarang ambil langsung dari data siswa yang login.

// Fallback tahun ajaran kalau kolom students.academic_year kosong/null.
// Tahun ajaran di Indonesia mulai bulan Juli, jadi:
// - Jul-Des -> "tahunSekarang/tahunSekarang+1"
// - Jan-Jun -> "tahunSekarang-1/tahunSekarang"
function getDefaultAcademicYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  return month >= 7 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}

export default function StudentJadwal() {
  const {
    student,
    loading: profileLoading,
    error: profileError,
  } = useStudentProfile();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Kalau hari ini bukan hari sekolah (mis. Sabtu/Minggu), default balik
  // ke Senin biar gak nyangkut ke hari lain yang gak jelas asal-usulnya.
  const today = getDayName();
  const [activeDay, setActiveDay] = useState(
    SCHOOL_DAYS.includes(today) ? today : "Senin",
  );

  // Swipe buat pindah hari (geser kiri = hari berikutnya, geser kanan =
  // hari sebelumnya). Threshold 50px biar gak ke-trigger cuma karena
  // scroll biasa / tap yang meleset dikit.
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
      // Geser ke kiri -> hari berikutnya
      setActiveDay(SCHOOL_DAYS[idx + 1]);
    } else if (diff > 0 && idx > 0) {
      // Geser ke kanan -> hari sebelumnya
      setActiveDay(SCHOOL_DAYS[idx - 1]);
    }
  };

  useEffect(() => {
    if (!student) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Catatan: tabel "jadwal" gak eksis, diganti "class_schedules"
        // (tabel baru, input manual, khusus jadwal per kelas).
        const { data, error: err } = await supabase
          .from("class_schedules")
          .select("id, day, subject, start_time, end_time, teacher_name")
          .eq("class_id", student.homeroom_class_id)
          .order("start_time", { ascending: true });

        if (err) throw err;
        setSchedule(data || []);
      } catch (err) {
        console.error("[StudentJadwal] Gagal ambil jadwal:", err);
        setError("Gagal memuat jadwal. Coba refresh halaman.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [student]);

  if (profileLoading || (student && loading)) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (profileError === "NO_SESSION") {
    return (
      <div className="text-center py-20 text-sm text-theme-secondary">
        Sesi gak ketemu. Silakan login ulang.
      </div>
    );
  }

  const daySchedule = schedule
    .filter((item) => item.day === activeDay)
    .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));

  const academicYear = student?.academic_year || getDefaultAcademicYear();

  return (
    <>
      {/* Header jadwal */}
      <div className="text-center mb-1">
        <h2 className="text-lg font-bold text-theme">
          JADWAL PELAJARAN KELAS {student?.homeroom_class_id || "-"}
        </h2>
        <p className="text-sm font-semibold text-theme-secondary tracking-wide">
          TAHUN AJARAN {academicYear}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Tab hari */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {SCHOOL_DAYS.map((day) => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border transition ${
              activeDay === day
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-theme-bg border-theme text-theme-secondary"
            }`}>
            {day}
          </button>
        ))}
      </div>

      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {daySchedule.length === 0 ? (
          <div className="bg-theme-bg rounded-2xl border border-gray-100 p-8 text-center text-theme-secondary text-sm shadow-sm">
            🎉 Tidak ada jadwal di hari {activeDay}.
          </div>
        ) : (
          <div className="bg-theme-bg rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800/60 border-b-2 border-gray-300 dark:border-gray-600">
                    <th className="text-left font-semibold text-theme-secondary px-4 py-2 whitespace-nowrap">
                      Jam Ke
                    </th>
                    <th className="text-left font-semibold text-theme-secondary px-4 py-2">
                      Mapel
                    </th>
                    <th className="text-right font-semibold text-theme-secondary px-4 py-2 whitespace-nowrap">
                      Waktu
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {daySchedule.map((item, idx) => {
                    const period = idx + 1;

                    // Waktu langsung dari DB (class_schedules) — udah bener
                    // buat semua hari termasuk Jumat, jadi gak perlu lagi
                    // override manual kayak dulu (FRIDAY_TIMES).
                    const startTime = item.start_time;
                    const endTime = item.end_time;

                    const ongoing =
                      activeDay === getDayName() &&
                      isOngoing(startTime, endTime);

                    return (
                      <tr
                        key={item.id}
                        className={`border-b border-gray-300 dark:border-gray-600 last:border-b-0 transition ${
                          ongoing ? "bg-blue-50 dark:bg-blue-950/30" : ""
                        }`}>
                        <td className="text-sm font-medium text-theme px-4 py-1.5">
                          {period}
                        </td>
                        <td className="px-4 py-1.5">
                          <p className="text-sm font-medium text-theme">
                            {item.subject}
                          </p>
                          <p className="text-xs text-blue-600 font-normal mt-0.5">
                            {item.teacher_name || "-"}
                          </p>
                        </td>
                        <td className="text-base font-extrabold text-theme text-right px-4 py-1.5 tabular-nums whitespace-nowrap">
                          {startTime && endTime
                            ? `${startTime.slice(0, 5)}–${endTime.slice(0, 5)}`
                            : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
