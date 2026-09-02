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
import { Search, Users, UserRound, X } from "lucide-react";

// Avatar dibedain per gender: bukan inisial nama, tapi warna + gradient
// beda buat Laki-Laki (biru) vs Perempuan (pink/rose), biar keliatan
// bedanya sekilas pas nge-scroll daftar tanpa perlu baca teksnya.
function getAvatarStyle(gender) {
  if (gender === "L") {
    return "bg-gradient-to-br from-sky-500 to-blue-700";
  }
  if (gender === "P") {
    return "bg-gradient-to-br from-pink-500 to-rose-600";
  }
  return "bg-gradient-to-br from-gray-400 to-gray-600";
}

export default function StudentDataSiswa({ student }) {
  const [classmates, setClassmates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);

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
        .select("id, full_name, nis, nisn, gender, class_id, is_active")
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
      (s.nis || "").toLowerCase().includes(search.toLowerCase()),
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
    return (
      <div className="text-center py-14 text-sm text-red-500">{error}</div>
    );
  }

  const totalCount = classmates.length;
  const laki = classmates.filter((s) => s.gender === "L").length;
  const perempuan = classmates.filter((s) => s.gender === "P").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-theme-secondary">
          Kelas {student.class_id}
        </span>
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
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
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
          {search
            ? "Siswa Tidak Ditemukan."
            : "Belum Ada Data Siswa Di Kelas Ini."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedStudent(s)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 text-left active:scale-[0.98] transition-transform ${
                s.id === student.id
                  ? "bg-indigo-50 dark:bg-indigo-950/30"
                  : "bg-theme-bg"
              }`}>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${getAvatarStyle(
                  s.gender,
                )}`}>
                <UserRound
                  size={20}
                  className="text-white"
                  strokeWidth={2.25}
                />
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
                  {s.gender === "L"
                    ? "Laki-Laki"
                    : s.gender === "P"
                      ? "Perempuan"
                      : "-"}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ====== MODAL DETAIL SIMPEL — cuma nampilin data yang udah ke-fetch
          (nama, NIS, gender, kelas). Bukan halaman profil lengkap kayak
          "Profil Saya", karena ini buat liat teman sekelas doang. ====== */}
      {selectedStudent && (
        <div
          className="fixed inset-0 bg-black/30 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setSelectedStudent(null)}>
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-xs w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            <div className="relative flex flex-col items-center gap-3 p-6 pb-6 bg-gray-50 dark:bg-gray-900/40">
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <X size={16} />
              </button>
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center shrink-0 ${getAvatarStyle(
                  selectedStudent.gender,
                )}`}>
                <UserRound
                  size={36}
                  className="text-white"
                  strokeWidth={2.25}
                />
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-gray-900 dark:text-gray-100">
                  {selectedStudent.full_name}
                  {selectedStudent.id === student.id && (
                    <span className="ml-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 align-middle">
                      (Kamu)
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Kelas {selectedStudent.class_id}
                </p>
              </div>
            </div>

            <div className="p-5 space-y-3.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">NIS</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {selectedStudent.nis || "-"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">NISN</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {selectedStudent.nisn || "-"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  Jenis Kelamin
                </span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {selectedStudent.gender === "L"
                    ? "Laki-Laki"
                    : selectedStudent.gender === "P"
                      ? "Perempuan"
                      : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Kelas</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {selectedStudent.class_id || "-"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
