// students/StudentDataSiswa.js
// ========================================================================
// Nampilin daftar teman sekelas siswa yang lagi login. Filternya cuma
// berdasarkan class_id yang sama persis kayak class_id siswa itu sendiri
// (bukan wali kelas / academic_year_id) — jadi kalau siswa kelas 7B login,
// yang muncul cuma daftar siswa lain yang class_id-nya juga "7B".
//
// student.class_id didapat dari session login (lihat StudentLogin.js —
// class_id disimpen langsung di userData pas login), terus diteruskan ke
// sini lewat prop `student` (hasil useStudentProfile di StudentAkun.js).
// ========================================================================
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { IdCard, Search, Users, UserRound } from "lucide-react";

function getInitials(name) {
  const words = (name || "").trim().split(" ").filter(Boolean);
  if (words.length === 0) return "S";
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export default function StudentDataSiswa({ student }) {
  const [classmates, setClassmates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchClassmates() {
      if (!student?.class_id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("students")
        .select("id, full_name, nis, gender, class_id, is_active")
        .eq("class_id", student.class_id)
        .eq("is_active", true)
        .order("full_name", { ascending: true });

      if (cancelled) return;

      if (fetchError) {
        setError("Gagal Memuat Data Siswa. Coba Lagi.");
        setClassmates([]);
      } else {
        setClassmates(data || []);
      }
      setLoading(false);
    }

    fetchClassmates();
    return () => {
      cancelled = true;
    };
  }, [student?.class_id]);

  const filtered = classmates.filter(
    (s) =>
      (s.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.nis || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-14">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!student?.class_id) {
    return (
      <div className="text-center py-14 text-sm text-theme-secondary">
        Kelas Kamu Belum Terdaftar. Hubungi Wali Kelas.
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-14 text-sm text-red-500">{error}</div>;
  }

  const totalCount = classmates.length;
  const laki = classmates.filter((s) => s.gender === "L").length;
  const perempuan = classmates.filter((s) => s.gender === "P").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-theme-secondary">Kelas {student.class_id}</span>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900">
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
            <Users size={16} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <span className="text-lg font-extrabold text-indigo-900 dark:text-indigo-300 leading-none">
            {totalCount}
          </span>
          <span className="text-[11px] font-medium text-indigo-700/70 dark:text-indigo-400/70 text-center leading-tight">
            Total Siswa
          </span>
        </div>

        <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
            <UserRound size={16} className="text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-lg font-extrabold text-blue-900 dark:text-blue-300 leading-none">
            {laki}
          </span>
          <span className="text-[11px] font-medium text-blue-700/70 dark:text-blue-400/70 text-center leading-tight">
            Laki-Laki
          </span>
        </div>

        <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900">
          <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center">
            <UserRound size={16} className="text-rose-600 dark:text-rose-400" />
          </div>
          <span className="text-lg font-extrabold text-rose-900 dark:text-rose-300 leading-none">
            {perempuan}
          </span>
          <span className="text-[11px] font-medium text-rose-700/70 dark:text-rose-400/70 text-center leading-tight">
            Perempuan
          </span>
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari Nama Atau NIS..."
          className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-theme-bg focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10 text-sm text-theme-secondary">
          {search ? "Siswa Tidak Ditemukan." : "Belum Ada Data Siswa Di Kelas Ini."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <div
              key={s.id}
              className={`flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 ${
                s.id === student.id ? "bg-indigo-50 dark:bg-indigo-950/30" : "bg-theme-bg"
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">{getInitials(s.full_name)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-theme truncate">
                  {s.full_name}
                  {s.id === student.id && (
                    <span className="ml-2 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 align-middle">
                      (Kamu)
                    </span>
                  )}
                </p>
                <p className="text-xs text-theme-secondary truncate">
                  NIS: {s.nis || "-"} &middot;{" "}
                  {s.gender === "L" ? "Laki-Laki" : s.gender === "P" ? "Perempuan" : "-"}
                </p>
              </div>
              <IdCard size={16} className="text-gray-300 dark:text-gray-600 shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
