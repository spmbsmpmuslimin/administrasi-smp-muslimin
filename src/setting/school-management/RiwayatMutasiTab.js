// RiwayatMutasiTab.js
// Sub-tab "Riwayat Mutasi" di dalam Student Management (School Combined Tab
// -> Data Sekolah -> Data Siswa | Guru & Staf | Riwayat Mutasi).
//
// Desain (disepakati 4 Sep 2026): gabungan opsi B (nempel di Student
// Management karena mutasi emang hasil dari aksi CRUD di modul ini) + C
// (bisa difilter ke 1 siswa spesifik). Mode default nampilin tabel semua
// riwayat (buat rekap/laporan), tapi kalau dibuka lewat tombol "Lihat
// Riwayat" di halaman Data Siswa (?student=<id>), otomatis ke-filter ke
// siswa itu doang.
//
// Catatan: sengaja JOIN manual di JS (bukan embedded join Supabase),
// konsisten sama konvensi project ini (PGRST200 avoidance).

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import {
  Search,
  ArrowRightCircle,
  ArrowLeftCircle,
  GraduationCap,
  Loader2,
  X,
  History,
} from "lucide-react";

const TYPE_META = {
  masuk: {
    label: "Masuk",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    Icon: ArrowRightCircle,
  },
  keluar: {
    label: "Keluar",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    Icon: ArrowLeftCircle,
  },
  lulus: {
    label: "Lulus",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    Icon: GraduationCap,
  },
};

// Konvensi tahun ajaran project ini: mulai Juli. Tanggal Jan-Jun masuk
// tahun ajaran yang dimulai tahun sebelumnya.
function toAcademicYear(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return m >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

function formatTanggal(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const RiwayatMutasiTab = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [mutations, setMutations] = useState([]);
  const [filterStudentId, setFilterStudentId] = useState(null);
  const [filterStudentName, setFilterStudentName] = useState("");

  const [typeFilter, setTypeFilter] = useState("semua");
  const [kelasFilter, setKelasFilter] = useState("semua");
  const [tahunFilter, setTahunFilter] = useState("semua");
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: mutData, error } = await supabase
        .from("student_mutations")
        .select("*")
        .order("mutation_date", { ascending: false });
      if (error) throw error;

      const studentIds = [...new Set((mutData || []).map((m) => m.student_id))];

      let studentsMap = {};
      if (studentIds.length > 0) {
        const { data: studentsData, error: studentsError } = await supabase
          .from("students")
          .select("id, full_name, nis, class_id")
          .in("id", studentIds);
        if (studentsError) throw studentsError;
        (studentsData || []).forEach((s) => {
          studentsMap[s.id] = s;
        });
      }

      // created_by disimpen sebagai text lepas (gak ada FK constraint),
      // jadi di-map manual di JS -- fetch semua users sekali aja (tabel
      // staff, kecil), match by String() biar aman dari kemungkinan beda
      // tipe data.
      const { data: usersData } = await supabase.from("users").select("id, full_name");
      const usersMap = {};
      (usersData || []).forEach((u) => {
        usersMap[String(u.id)] = u.full_name;
      });

      const merged = (mutData || []).map((m) => ({
        ...m,
        student: studentsMap[m.student_id] || null,
        created_by_name: m.created_by ? usersMap[String(m.created_by)] || null : null,
      }));

      setMutations(merged);
    } catch (err) {
      console.error("Error loading student_mutations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Deep-link dari Data Siswa: ?student=<id> -> filter ke siswa itu doang.
  useEffect(() => {
    const studentIdParam = searchParams.get("student");
    if (studentIdParam) {
      setFilterStudentId(studentIdParam);
    }
  }, [searchParams]);

  // Begitu data & filter siswa siap, ambil namanya buat ditampilin di
  // banner filter.
  useEffect(() => {
    if (!filterStudentId) {
      setFilterStudentName("");
      return;
    }
    const match = mutations.find((m) => String(m.student_id) === String(filterStudentId));
    if (match?.student?.full_name) {
      setFilterStudentName(match.student.full_name);
    }
  }, [filterStudentId, mutations]);

  const clearStudentFilter = () => {
    setFilterStudentId(null);
    setFilterStudentName("");
    // Bersihin query param juga biar konsisten kalau di-refresh.
    const next = new URLSearchParams(searchParams);
    next.delete("student");
    setSearchParams(next, { replace: true });
  };

  const kelasOptions = useMemo(() => {
    const set = new Set(mutations.map((m) => m.class_id).filter((c) => !!c));
    return [...set].sort();
  }, [mutations]);

  const tahunOptions = useMemo(() => {
    const set = new Set(mutations.map((m) => toAcademicYear(m.mutation_date)).filter(Boolean));
    return [...set].sort().reverse();
  }, [mutations]);

  const filtered = useMemo(() => {
    return mutations.filter((m) => {
      if (filterStudentId) {
        return String(m.student_id) === String(filterStudentId);
      }
      if (typeFilter !== "semua" && m.type !== typeFilter) return false;
      if (kelasFilter !== "semua" && m.class_id !== kelasFilter) return false;
      if (tahunFilter !== "semua" && toAcademicYear(m.mutation_date) !== tahunFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = (m.student?.full_name || "").toLowerCase();
        const nis = (m.student?.nis || "").toLowerCase();
        if (!name.includes(q) && !nis.includes(q)) return false;
      }
      return true;
    });
  }, [mutations, filterStudentId, typeFilter, kelasFilter, tahunFilter, search]);

  return (
    <div className="p-4 sm:p-6">
      {filterStudentId ? (
        <div className="mb-4 flex items-center justify-between gap-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <History size={16} className="text-indigo-600 dark:text-indigo-400" />
            <span className="text-indigo-800 dark:text-indigo-300 font-medium">
              Menampilkan riwayat untuk: {filterStudentName || "siswa ini"}
            </span>
          </div>
          <button
            onClick={clearStudentFilter}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <X size={14} />
            Lihat semua riwayat
          </button>
        </div>
      ) : (
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama/NIS..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100"
          >
            <option value="semua">Semua Jenis</option>
            <option value="masuk">Masuk</option>
            <option value="keluar">Keluar</option>
            <option value="lulus">Lulus</option>
          </select>
          <select
            value={kelasFilter}
            onChange={(e) => setKelasFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100"
          >
            <option value="semua">Semua Kelas</option>
            {kelasOptions.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <select
            value={tahunFilter}
            onChange={(e) => setTahunFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100"
          >
            <option value="semua">Semua Tahun Ajaran</option>
            {tahunOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
          <Loader2 size={20} className="animate-spin" />
          <span>Memuat riwayat mutasi...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          Belum ada riwayat mutasi{filterStudentId ? " untuk siswa ini" : ""}.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">
                  Tanggal
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">
                  Siswa
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600 dark:text-gray-300">
                  Kelas
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600 dark:text-gray-300">
                  Jenis
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">
                  Detail
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">
                  Dicatat Oleh
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((m) => {
                const meta = TYPE_META[m.type] || TYPE_META.keluar;
                const Icon = meta.Icon;
                return (
                  <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">
                      {formatTanggal(m.mutation_date)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {m.student?.full_name || "(siswa tidak ditemukan)"}
                      </p>
                      <p className="text-xs text-gray-400">NIS {m.student?.nis || "-"}</p>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">
                      {m.class_id || "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.badge}`}
                      >
                        <Icon size={12} />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {m.type === "masuk" && m.sekolah_asal && <p>dari {m.sekolah_asal}</p>}
                      {m.type === "keluar" && m.sekolah_tujuan && <p>ke {m.sekolah_tujuan}</p>}
                      {m.keterangan && (
                        <p className="text-xs text-gray-400 mt-0.5">{m.keterangan}</p>
                      )}
                      {!m.sekolah_asal && !m.sekolah_tujuan && !m.keterangan && "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                      {m.created_by_name || "-"}
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

export default RiwayatMutasiTab;
