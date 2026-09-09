// pages/KeuanganKelas.jsx
// Halaman "Info Pembayaran" khusus Walikelas -- READ ONLY.
// Nampilin rekap status SPP SEMUA siswa di kelas yang dia pegang jadi
// walikelas (bukan pilih 1 siswa kayak admin PembayaranPanel), biar sekali
// buka langsung ketauan siapa aja yang nunggak.
//
// Logic hitung periode & nominal SENGAJA disamain persis kayak
// pages/administrasi-tu/SppTab.js (generateExpectedPeriods, parseEntryStartYear,
// nominalPerTA dari school_settings) -- kalau logic itu diubah di sana,
// sesuaikan juga di sini. Pertimbangkan next time: pindahin fungsi-fungsi
// ini ke keuanganShared.js biar gak ke-duplikasi di 3 tempat
// (SppTab.js, StudentKeuangan.js, file ini).
//
// TODO (perlu dikonfirmasi sebelum production):
//   1. Cara nentuin "kelas yang dipegang walikelas ini" -- di bawah gue
//      pakai `user.homeroom_class_id` (mengikuti pola yang kelihatan di
//      komentar menuConfig.js: "guru yang emang wali kelas -- homeroom_
//      class_id keisi"). Kalau ternyata field itu gak langsung ada di
//      object `user` yang dioper dari App.js (misal perlu di-fetch dulu
//      dari tabel teachers/profiles), sesuaikan fetchMyClass() di bawah.
//   2. WAJIB ada RLS di `spp_bills` & `spp_payments` yang ngebatesin query
//      dari akun guru cuma boleh SELECT baris murid yang class_id-nya
//      sama dengan kelas yang dia pegang -- biar guru gak bisa ngintip
//      kelas lain walau tau class_id-nya. Query di file ini SUDAH filter
//      by class_id di sisi client, tapi itu doang GAK CUKUP buat
//      keamanan -- client-side filter gampang dilewatin. Sesuai catatan
//      sebelumnya soal RLS spp_bills/spp_payments buat portal siswa,
//      policy yang sama perlu nyakup role guru/walikelas juga.
import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabaseClient";
import { AlertTriangle, CheckCircle2, Search } from "lucide-react";

function formatRupiah(angka) {
  if (angka === null || angka === undefined) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
}

// ---- Sama persis dengan SppTab.js ----
function parseEntryStartYear(nis) {
  const m = nis?.match(/^(\d{2})\.(\d{2})\.07\./);
  if (!m) return null;
  return 2000 + parseInt(m[1], 10);
}

const academicYearLabel = (startYear) => `${startYear}/${startYear + 1}`;

function generateExpectedPeriods(entryStartYear) {
  const now = new Date();
  const monthsOrder = [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6];
  const periods = [];
  let taStart = entryStartYear;
  let gradeOffset = 0;

  while (true) {
    const taStartDate = new Date(taStart, 6, 1);
    if (taStartDate > now) break;

    for (const m of monthsOrder) {
      const calYear = m >= 7 ? taStart : taStart + 1;
      const periodDate = new Date(calYear, m - 1, 1);
      periods.push({
        ta: academicYearLabel(taStart),
        month: m,
        year: calYear,
        key: `${calYear}-${m}`,
        isDue: periodDate <= now,
      });
    }
    taStart += 1;
    gradeOffset += 1;
  }
  return periods;
}

// Hitung ringkasan 1 siswa: berapa bulan nunggak & total nominalnya.
function summarizeStudent(student, bills, nominalPerTA) {
  const entryYear = parseEntryStartYear(student.nis);
  if (entryYear == null) {
    return { unresolved: true, belumBayar: 0, totalTunggakan: 0, totalBulan: 0 };
  }
  const billMap = new Map(bills.map((b) => [`${b.period_year}-${b.period_month}`, b]));
  const periods = generateExpectedPeriods(entryYear).map((p) => {
    const existing = billMap.get(p.key);
    return {
      ...p,
      amount: existing?.amount ?? nominalPerTA[p.ta] ?? 0,
      status: existing?.status || "unpaid",
    };
  });
  const duePeriods = periods.filter((p) => p.isDue);
  const belumBayarList = duePeriods.filter((p) => p.status !== "paid");
  return {
    unresolved: false,
    belumBayar: belumBayarList.length,
    totalBulan: duePeriods.length,
    totalTunggakan: belumBayarList.reduce((sum, p) => sum + p.amount, 0),
  };
}

export default function KeuanganKelas({ user }) {
  const [className, setClassName] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user?.id) return;

    async function fetchAll() {
      setLoading(true);
      setError(null);

      // 1. Kelas yang dipegang walikelas ini -- diambil dari
      // user.homeroom_class_id (pola yang dipakai di seluruh app buat
      // ngecek "requireWaliKelas", lihat menuConfig.js).
      const classId = user.homeroom_class_id;
      if (!classId) {
        setError("Akun ini belum terdaftar sebagai walikelas di kelas manapun.");
        setLoading(false);
        return;
      }
      setClassName(classId);

      // 2. Ambil semua siswa aktif di kelas itu.
      const { data: students, error: studentsErr } = await supabase
        .from("students")
        .select("id, full_name, nis")
        .eq("class_id", classId)
        .eq("is_active", true)
        .order("full_name", { ascending: true });

      if (studentsErr) {
        setError(studentsErr.message);
        setLoading(false);
        return;
      }

      if (!students || students.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      // 3. Ambil nominal per TA & semua spp_bills siswa-siswa itu SEKALIGUS
      //    (1 query pakai .in(), bukan loop per siswa -- biar ringan).
      const studentIds = students.map((s) => s.id);
      const [settingsRes, billsRes] = await Promise.all([
        supabase
          .from("school_settings")
          .select("setting_value")
          .eq("setting_key", "spp_nominal_per_ta")
          .maybeSingle(),
        supabase
          .from("spp_bills")
          .select("student_id, period_month, period_year, amount, status")
          .in("student_id", studentIds),
      ]);

      let nominalPerTA = {};
      if (settingsRes.data?.setting_value) {
        try {
          nominalPerTA = JSON.parse(settingsRes.data.setting_value);
        } catch (e) {
          console.error("spp_nominal_per_ta bukan JSON valid:", e);
        }
      }

      if (billsRes.error) {
        setError(billsRes.error.message);
        setLoading(false);
        return;
      }

      const billsByStudent = new Map();
      for (const b of billsRes.data || []) {
        if (!billsByStudent.has(b.student_id)) billsByStudent.set(b.student_id, []);
        billsByStudent.get(b.student_id).push(b);
      }

      const summarized = students.map((s) => ({
        ...s,
        ...summarizeStudent(s, billsByStudent.get(s.id) || [], nominalPerTA),
      }));

      setRows(summarized);
      setLoading(false);
    }

    fetchAll();
  }, [user?.id]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => r.full_name.toLowerCase().includes(q));
  }, [rows, search]);

  const totalNunggak = rows.filter((r) => r.belumBayar > 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-20 text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-xl md:text-2xl font-bold text-slate-800 mb-1">
        Info Pembayaran{className ? ` — Kelas ${className}` : ""}
      </h1>
      <p className="text-sm text-slate-500 mb-4">
        Rekap status SPP siswa di kelas Anda (read-only)
      </p>

      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama siswa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm"
          />
        </div>
        <span className="text-sm text-slate-500">
          {totalNunggak} dari {rows.length} siswa nunggak
        </span>
      </div>

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold">Nama Siswa</th>
              <th className="px-4 py-2.5 text-left font-semibold">Status</th>
              <th className="px-4 py-2.5 text-right font-semibold">Tertunggak</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                  Tidak ada siswa yang cocok.
                </td>
              </tr>
            ) : (
              filteredRows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2.5 text-slate-700">{r.full_name}</td>
                  <td className="px-4 py-2.5">
                    {r.unresolved ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                        <AlertTriangle size={12} /> NIS gak sesuai pola, cek manual
                      </span>
                    ) : r.belumBayar > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded-full">
                        <AlertTriangle size={12} /> Nunggak {r.belumBayar} bulan
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                        <CheckCircle2 size={12} /> Lunas ({r.totalBulan} bulan)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-700">
                    {r.totalTunggakan > 0 ? formatRupiah(r.totalTunggakan) : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
