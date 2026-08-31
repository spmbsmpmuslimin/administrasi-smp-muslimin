// portal-siswa/StudentRaport.js
// Menampilkan riwayat nilai raport siswa (semester 1-6) yang sudah
// diimport admin/TU dan berstatus "published" -- lihat
// src/setting/kelola-raport/ (ManajemenRaportTable.js, StatusBadge.js).
// Raport berstatus "draft" (belum final dicek admin) SENGAJA tidak
// ditampilkan ke siswa.
//
// Data diambil dari tabel student_reports + student_report_grades,
// dicocokkan pakai student_id ATAU student_nis (fallback) karena pas
// proses import, siswa yang NIS-nya gak ketemu di tabel `students` saat
// itu tetap disimpan dengan student_id null (lihat ImportRaportForm.js).
//
// REDESIGN 30 Agustus 2026: dari accordion (6 card collapsed, expand
// satu-satu) ke TAB SEMESTER -- pola swipe/tab horizontal yang SAMA
// kayak StudentJadwal.js (tab hari), biar siswa gak belajar interaksi
// baru. Alasan ganti: siswa paling sering cuma mau cek nilai SEMESTER
// INI doang (bukan riset banding 6 semester sekaligus), dan accordion
// mulai kerasa berat begitu datanya nambah sampai 6 semester penuh.
// Defaultnya kepilih tab TERBARU. Ditambahin juga indikator tren
// (naik/turun rata-rata dibanding semester sebelumnya) buat insight
// cepat tanpa siswa harus itung manual.
//
// Tabel mapel+nilai SEKARANG DIBIKIN SENDIRI di sini (bukan reuse
// RaportTable.js dari setting/kelola-raport/ kayak sebelumnya) --
// soalnya butuh styling lebih tegas khusus buat siswa (nilai di-bold,
// kontras lebih jelas) yang beda kebutuhan sama tampilan admin di
// Manajemen Nilai.

import React, { useEffect, useState, useRef } from "react";
import { GraduationCap, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "../supabaseClient";

function average(grades) {
  if (!grades || grades.length === 0) return null;
  const sum = grades.reduce((s, g) => s + g.score, 0);
  return Math.round((sum / grades.length) * 10) / 10;
}

// "2025/2026" -> "25/26", biar tab-nya ringkas gak makan tempat
function shortYear(academicYear) {
  const match = (academicYear || "").match(/(\d{2})(\d{2})\/(\d{2})(\d{2})/);
  return match ? `${match[2]}/${match[4]}` : academicYear || "-";
}

// FIX 30 Agustus 2026: sebelumnya query di bawah cocokin student_nis
// PERSIS SAMA (exact string). Masalahnya format NIS di file leger beda-beda
// antar semester (mis. "25.26.07.203" vs "252607203" -- lihat catatan
// panjang soal ini di ImportRaportForm.js), jadi kalau student_id juga
// null (NIS gak ketemu di tabel `students` pas import), raport itu jadi
// GAK PERNAH ketemu oleh siswa manapun walau statusnya udah published.
// nisVariants() bikin beberapa kemungkinan format dari NIS asli siswa
// (di tabel `students`) biar query nyoba semuanya, bukan cuma satu bentuk.
// Ini best-effort, BUKAN pengganti benerin data mentahnya -- kalau NIS di
// raport typo/beda jauh (bukan cuma soal titik), tetep gak bakal ketemu
// dan harus dibenerin manual admin di Manajemen Nilai.
function normalizeNis(nis) {
  return (nis || "").replace(/\D/g, "");
}

function nisVariants(nis) {
  const raw = (nis || "").trim();
  if (!raw) return [];
  const digitsOnly = normalizeNis(raw);
  const variants = new Set([raw]);
  if (digitsOnly) variants.add(digitsOnly);
  // Pola leger yang kepake sekolah ini: NN.NN.NN.NNN (9 digit)
  if (digitsOnly.length === 9) {
    variants.add(
      `${digitsOnly.slice(0, 2)}.${digitsOnly.slice(2, 4)}.${digitsOnly.slice(4, 6)}.${digitsOnly.slice(6, 9)}`,
    );
  }
  return Array.from(variants);
}

export default function StudentRaport({ student }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeId, setActiveId] = useState(null);

  // Swipe pindah semester, pola sama persis kayak StudentJadwal.js
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

    const idx = reports.findIndex((r) => r.id === activeId);
    if (idx === -1) return;
    if (diff < 0 && idx < reports.length - 1) {
      setActiveId(reports[idx + 1].id);
    } else if (diff > 0 && idx > 0) {
      setActiveId(reports[idx - 1].id);
    }
  };

  useEffect(() => {
    if (!student) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // DIAGNOSTIK SEMENTARA 30 Agustus 2026: buat nelusurin kasus raport
        // published tapi gak muncul walau student_id di raportnya UDAH keisi
        // (bukan null). Dugaan: ada >1 baris di tabel `students` buat orang
        // yang sama, dan akun yang dipakai LOGIN beda id-nya sama yang
        // dipointer di student_reports.student_id. Cek console browser pas
        // buka halaman ini, terus bandingin id/nis di sini VS student_id di
        // baris raport (liat di Supabase table editor / tanya Claude).
        // Hapus log ini kalau udah ketemu akar masalahnya.
        console.debug("[StudentRaport] akun yang lagi login:", {
          id: student.id,
          nis: student.nis,
          nama: student.nama || student.name,
        });

        // student_id dulu (paling akurat, diisi kalau NIS ketemu pas
        // import), lalu fallback ke SEMUA kandidat format NIS -- bukan
        // cuma satu bentuk kayak sebelumnya. Nilai NIS gak pernah
        // berisi koma jadi aman dipakai langsung di string filter ini.
        const variants = nisVariants(student.nis);
        const orFilters = [`student_id.eq.${student.id}`];
        if (variants.length > 0) {
          orFilters.push(`student_nis.in.(${variants.join(",")})`);
        }

        const { data, error: err } = await supabase
          .from("student_reports")
          .select(
            "id, academic_year, semester, status, student_report_grades(subject, score)",
          )
          .eq("status", "published")
          .or(orFilters.join(","))
          .order("academic_year", { ascending: true })
          .order("semester", { ascending: true });

        if (err) throw err;
        const data2 = data || [];
        setReports(data2);
        // Default kepilih tab paling baru (item terakhir, sudah urut ascending)
        if (data2.length > 0) {
          setActiveId(data2[data2.length - 1].id);
        }
      } catch (err) {
        console.error("[StudentRaport] Gagal ambil data raport:", err);
        setError("Gagal memuat nilai raport. Coba refresh halaman.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [student]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
        ⚠️ {error}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="bg-theme-bg rounded-2xl border border-gray-100 p-8 text-center text-theme-secondary text-sm shadow-sm">
        📄 Belum ada nilai raport yang tersedia. Nilai akan muncul di sini
        setelah diinput oleh sekolah.
      </div>
    );
  }

  const activeIdx = reports.findIndex((r) => r.id === activeId);
  const active = reports[activeIdx] || reports[reports.length - 1];
  const grades = active.student_report_grades || [];
  const avg = average(grades);

  // Tren: banding rata-rata semester aktif vs semester SEBELUMNYA (index-1
  // di array yang udah urut ascending, bukan berdasar nomor semester --
  // biar tetep bener walau ada semester yang datanya belum diinput/skip)
  const prevReport = activeIdx > 0 ? reports[activeIdx - 1] : null;
  const prevAvg = prevReport
    ? average(prevReport.student_report_grades || [])
    : null;
  const delta =
    avg !== null && prevAvg !== null
      ? Math.round((avg - prevAvg) * 10) / 10
      : null;

  return (
    <div className="space-y-3">
      {/* Tab semester -- horizontal scroll, pola sama kayak StudentJadwal.js */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {reports.map((r) => (
          <button
            key={r.id}
            onClick={() => setActiveId(r.id)}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border transition ${
              activeId === r.id
                ? "bg-rose-600 border-rose-600 text-white"
                : "bg-theme-bg border-theme text-theme-secondary"
            }`}>
            Smt {r.semester} &middot; {shortYear(r.academic_year)}
          </button>
        ))}
      </div>

      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className="bg-theme-bg rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Ringkasan: rata-rata + tren vs semester sebelumnya */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-50 dark:border-gray-800">
            <div className="w-9 h-9 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center shrink-0">
              <GraduationCap
                size={18}
                className="text-rose-600 dark:text-rose-400"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-theme">
                Semester {active.semester} — {active.academic_year}
              </p>
              <p className="text-sm text-theme-secondary">
                {grades.length} Mata Pelajaran
                {avg !== null ? ` · Rata-Rata ${avg}` : ""}
              </p>
            </div>
            {delta !== null && (
              <div
                className={`flex items-center gap-1 shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold ${
                  delta > 0
                    ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400"
                    : delta < 0
                      ? "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400"
                      : "bg-gray-50 dark:bg-gray-800 text-theme-secondary"
                }`}>
                {delta > 0 ? (
                  <TrendingUp size={13} />
                ) : delta < 0 ? (
                  <TrendingDown size={13} />
                ) : (
                  <Minus size={13} />
                )}
                {delta > 0 ? `+${delta}` : delta}
              </div>
            )}
          </div>

          {/* Tabel mapel + nilai -- pake garis biar jelas strukturnya,
              nilai di-bold & lebih besar biar gampang dibaca */}
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800/60 border-b-2 border-gray-300 dark:border-gray-600">
                <th className="text-left font-semibold text-theme-secondary px-4 py-2">
                  Mata Pelajaran
                </th>
                <th className="text-right font-semibold text-theme-secondary px-4 py-2 w-20">
                  Nilai
                </th>
              </tr>
            </thead>
            <tbody>
              {grades.map((g, i) => (
                <tr
                  key={i}
                  className="border-b border-gray-300 dark:border-gray-600 last:border-b-0">
                  <td className="text-sm font-medium text-theme px-4 py-1.5">
                    {g.subject}
                  </td>
                  <td className="text-lg font-extrabold text-theme text-right px-4 py-1.5 tabular-nums">
                    {g.score}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 dark:bg-gray-800/60 border-t-2 border-gray-300 dark:border-gray-600">
                <td className="font-bold text-theme px-4 py-2.5">
                  Jumlah Nilai
                </td>
                <td className="font-extrabold text-theme text-right px-4 py-2.5 tabular-nums">
                  {grades.reduce((s, g) => s + g.score, 0)}
                </td>
              </tr>
              <tr className="bg-gray-100 dark:bg-gray-800/60">
                <td className="font-bold text-theme px-4 py-2.5 rounded-bl-2xl">
                  Rata-Rata Nilai
                </td>
                <td className="font-extrabold text-rose-600 dark:text-rose-400 text-right px-4 py-2.5 tabular-nums rounded-br-2xl">
                  {avg ?? "-"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
