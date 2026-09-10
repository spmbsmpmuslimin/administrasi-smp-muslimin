// services/JamPelajaranProvider.jsx
// Batch 2 -- React Context + hook useJamPelajaran(). Fetch sekali di
// level atas (bukan tiap komponen fetch sendiri-sendiri), lalu expose
// shape yang sama kayak import lama dari utils/jamPelajaran.js:
//   { JAM_SCHEDULE, DAYS, ALL_PERIODS, getAvailablePeriods, findPeriod }
// ditambah BREAK_SCHEDULE, loading, error, refetch.
//
// LOKASI FILE: sengaja ditaruh satu folder sama jamPelajaran.js
// (utils/), biar gampang dicari -- makanya import di bawah pake "./"
// (satu folder), bukan "../utils/" kayak versi sebelumnya.
//
// PEMAKAIAN (bungkus sekali di root, mis. App.js):
//   <JamPelajaranProvider>
//     <App />
//   </JamPelajaranProvider>
//
// Kalau mau paksa academic_year_id tertentu (mis. testing / halaman
// arsip yang liat tahun ajaran lama), tinggal kasih prop:
//   <JamPelajaranProvider academicYearId={someId}>...
// Default-nya provider resolve sendiri dari academic_years yang
// is_active = true lewat fetchActiveAcademicYearId().
import { createContext, useContext, useCallback, useEffect, useState } from "react";
import { fetchJamPelajaran, fetchActiveAcademicYearId } from "../services/jamPelajaranService";
import {
  getAvailablePeriods as getAvailablePeriodsPure,
  findPeriod as findPeriodPure,
} from "./jamPelajaran";

export const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];

const JamPelajaranContext = createContext(null);

export function JamPelajaranProvider({ academicYearId: academicYearIdProp, children }) {
  const [academicYearId, setAcademicYearId] = useState(academicYearIdProp || null);
  const [JAM_SCHEDULE, setJamSchedule] = useState({});
  const [BREAK_SCHEDULE, setBreakSchedule] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let yearId = academicYearIdProp;
      if (!yearId) {
        yearId = await fetchActiveAcademicYearId();
        setAcademicYearId(yearId);
      }
      if (!yearId) {
        // Ngga ada tahun ajaran aktif -- bukan error fatal, tapi jadwal
        // gak akan bisa diisi/ditampilkan sampai admin set salah satu
        // academic_years jadi is_active = true.
        setJamSchedule({});
        setBreakSchedule({});
        setError("Belum ada tahun ajaran aktif (academic_years.is_active).");
        return;
      }
      const { JAM_SCHEDULE: js, BREAK_SCHEDULE: bs } = await fetchJamPelajaran(yearId);
      setJamSchedule(js);
      setBreakSchedule(bs);
    } catch (err) {
      setError(err.message || "Gagal memuat jam pelajaran");
    } finally {
      setLoading(false);
    }
  }, [academicYearIdProp]);

  useEffect(() => {
    load();
  }, [load]);

  // ALL_PERIODS: union semua nomor jam pelajaran (BUKAN istirahat, itu
  // sudah gak ada di JAM_SCHEDULE) di seluruh hari, diurutkan numerik.
  // Diturunin dari data fetch, bukan hardcode "1".."9" -- kalau
  // kurikulum berubah jadi 10 JP misalnya, otomatis ikut tanpa perlu
  // ubah kode.
  const ALL_PERIODS = Array.from(
    new Set(Object.values(JAM_SCHEDULE).flatMap((day) => Object.keys(day)))
  ).sort((a, b) => Number(a) - Number(b));

  const getAvailablePeriods = useCallback(
    (day) => getAvailablePeriodsPure(JAM_SCHEDULE, day),
    [JAM_SCHEDULE]
  );

  const findPeriod = useCallback(
    (day, start, end) => findPeriodPure(JAM_SCHEDULE, day, start, end),
    [JAM_SCHEDULE]
  );

  const value = {
    JAM_SCHEDULE,
    BREAK_SCHEDULE,
    DAYS,
    ALL_PERIODS,
    getAvailablePeriods,
    findPeriod,
    academicYearId,
    loading,
    error,
    refetch: load,
  };

  return <JamPelajaranContext.Provider value={value}>{children}</JamPelajaranContext.Provider>;
}

export function useJamPelajaran() {
  const ctx = useContext(JamPelajaranContext);
  if (!ctx) {
    throw new Error("useJamPelajaran() harus dipanggil di dalam <JamPelajaranProvider>");
  }
  return ctx;
}
