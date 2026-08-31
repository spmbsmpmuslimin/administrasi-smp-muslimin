// students/StudentOrganigram.js
// ========================================================================
// Versi READ-ONLY dari pages/Organigram.js, khusus portal siswa. Cuma
// nampilin bagan struktur organisasi kelas (setara mode "Preview Bagan"
// di komponen aslinya) — gak ada tab Edit, tombol Tambah Posisi, Simpan,
// dsb. Semua editing itu tetep punya wali kelas doang (lewat
// Organigram.js aslinya, di menuConfig.js path "/organigram").
//
// Kenapa dipisah jadi file sendiri (bukan reuse Organigram.js apa
// adanya): sama kayak alasan StudentDenahDuduk.js —
// 1. Organigram.js pake `currentUser?.homeroom_class_id`, field yang
//    cuma ada di session guru, bukan siswa.
// 2. Defaultnya kebuka di mode "edit" (bisa tambah/hapus posisi & assign
//    siswa) — jelas gak boleh diakses siswa.
//
// CATATAN PENTING: node "Wali Kelas" di bagan aslinya nampilin
// currentUser.full_name (karena yang liat = wali kelas itu sendiri).
// Di sisi siswa kita gak punya akses ke nama wali kelasnya dari session
// siswa. Kalau ada tabel yang nyimpen relasi kelas -> wali kelas (mis.
// kolom di tabel `classes`), kasih tau bre, biar query-nya disambungin
// biar nama walikelasnya beneran muncul, bukan placeholder kayak sekarang.
// ========================================================================
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { Network } from "lucide-react";

export default function StudentOrganigram({ student }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [academicYear, setAcademicYear] = useState("");
  const [studentMap, setStudentMap] = useState({});
  const [rows, setRows] = useState([]);

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
          .select("year")
          .eq("is_active", true)
          .single();
        if (yearError) throw yearError;
        if (cancelled) return;
        setAcademicYear(activeYear.year);

        const { data: studentData, error: studentError } = await supabase
          .from("students")
          .select("id, full_name, nis")
          .eq("class_id", classId)
          .eq("academic_year", activeYear.year)
          .eq("is_active", true);
        if (studentError) throw studentError;

        const map = {};
        (studentData || []).forEach((s) => (map[s.id] = s));
        if (cancelled) return;
        setStudentMap(map);

        const { data: orgData, error: orgError } = await supabase
          .from("class_organization")
          .select("*")
          .eq("class_id", classId)
          .eq("academic_year", activeYear.year)
          .order("position_order", { ascending: true });
        if (orgError) throw orgError;

        if (cancelled) return;
        setRows((orgData || []).map((r) => ({ ...r, position_level: r.position_level || 2 })));
      } catch (err) {
        console.error("Error loading organigram (student view):", err);
        if (!cancelled) setError(err.message || "Gagal Memuat Struktur Organisasi.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [classId]);

  const levelGroups = useMemo(() => {
    const validRows = rows.filter((r) => (r.position || "").trim() !== "");
    const map = new Map();
    validRows.forEach((r) => {
      const lvl = r.position_level || 2;
      if (!map.has(lvl)) map.set(lvl, []);
      map.get(lvl).push(r);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([level, items]) => ({ level, items }));
  }, [rows]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-14">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-14 text-sm text-red-500">{error}</div>;
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-14">
        <Network size={32} className="mx-auto text-gray-300 mb-3" />
        <p className="text-sm text-theme-secondary">
          Struktur Organisasi Kelas {classId} Belum Diatur Wali Kelas.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 overflow-x-auto">
      <div className="min-w-[520px] py-4 px-2">
        <div className="text-center mb-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Struktur Organisasi Kelas {classId}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Tahun Ajaran {academicYear}</p>
        </div>

        {/* Node Wali Kelas — lihat catatan di atas file soal nama wali kelas */}
        <div className="flex flex-col items-center">
          <div className="w-36">
            <OrgBox label="Wali Kelas" name="Wali Kelas" tone="emerald" />
          </div>
          {levelGroups.length > 0 && <Connector />}
        </div>

        {levelGroups.map((group, gi) => (
          <div key={group.level} className="flex flex-col items-center">
            {group.items.length > 1 ? (
              <div className="flex justify-center w-full">
                <div className="inline-flex flex-wrap justify-center gap-x-5 gap-y-6 border-t border-gray-300 dark:border-gray-600 pt-4">
                  {group.items.map((row) => {
                    const s = row.student_id ? studentMap[row.student_id] : null;
                    const isMe = s && student?.id === s.id;
                    return (
                      <div key={row.id} className="relative flex flex-col items-center w-36">
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-px h-4 bg-gray-400 dark:bg-gray-600" />
                        <div
                          className="absolute -top-[3px] left-1/2 -translate-x-1/2 w-0 h-0"
                          style={{
                            borderLeft: "4px solid transparent",
                            borderRight: "4px solid transparent",
                            borderTop: "5px solid #9ca3af",
                          }}
                        />
                        <OrgBox
                          label={row.position || "(Tanpa Nama Posisi)"}
                          name={s ? `${s.full_name}${isMe ? " (Kamu)" : ""}` : "— Kosong —"}
                          tone={isMe ? "indigo" : "sky"}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center w-36">
                <Connector />
                <OrgBox
                  label={group.items[0].position || "(Tanpa Nama Posisi)"}
                  name={
                    group.items[0].student_id
                      ? `${studentMap[group.items[0].student_id]?.full_name || "— Kosong —"}${
                          studentMap[group.items[0].student_id]?.id === student?.id ? " (Kamu)" : ""
                        }`
                      : "— Kosong —"
                  }
                  tone={
                    group.items[0].student_id &&
                    studentMap[group.items[0].student_id]?.id === student?.id
                      ? "indigo"
                      : "sky"
                  }
                />
              </div>
            )}
            {gi < levelGroups.length - 1 && <Connector />}
          </div>
        ))}
      </div>
    </div>
  );
}

function OrgBox({ label, name, tone = "sky" }) {
  const tones = {
    emerald:
      "bg-emerald-100 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300",
    sky: "bg-sky-100 dark:bg-sky-950/40 border-sky-400 dark:border-sky-700 text-sky-800 dark:text-sky-300",
    indigo:
      "bg-indigo-100 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-700 text-indigo-800 dark:text-indigo-300",
  };
  const toneClass = tones[tone] || tones.sky;

  return (
    <div className="w-full rounded-md border overflow-hidden shadow-sm">
      <div
        className={`px-2.5 py-1 text-[9px] font-semibold text-center uppercase tracking-wide leading-tight border-b ${toneClass}`}
      >
        {label}
      </div>
      <div className="px-2.5 py-1.5 bg-white dark:bg-gray-800 text-[11px] font-medium text-gray-800 dark:text-gray-200 text-center leading-tight">
        {name}
      </div>
    </div>
  );
}

function Connector() {
  return (
    <div className="flex flex-col items-center">
      <div className="w-px h-4 bg-gray-400 dark:bg-gray-600" />
      <div
        className="w-0 h-0"
        style={{
          borderLeft: "4px solid transparent",
          borderRight: "4px solid transparent",
          borderTop: "5px solid #9ca3af",
        }}
      />
    </div>
  );
}
