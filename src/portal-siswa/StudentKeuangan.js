// portal-siswa/StudentKeuangan.js
// Halaman "Pembayaran" — read-only, khusus SPP dulu (Uang Awal Tahun /
// Uang Akhir Tahun nyusul kalau tabelnya udah dikasih liat, kemungkinan
// besar strukturnya beda dari SPP jadi gak bisa diasumsiin sama).
//
// Logic generate periode & nominal SENGAJA disamain persis kayak
// PembayaranPanel di pages/administrasi-tu/SppTab.js, biar bulan yang
// belum sempet punya row `spp_bills` (baru dibikin lazy pas TU nyatet
// pembayaran) tetep kebaca sebagai "Belum Bayar", bukan ilang begitu aja
// dari tampilan. Kalau logic di SppTab.js diubah, sesuain juga di sini.
//
// Keamanan: query di bawah ini nembak tabel spp_bills & spp_payments
// LANGSUNG (bukan lewat view), makanya WAJIB ada RLS policy di kedua
// tabel itu yang MEMBATASI portal siswa cuma boleh SELECT baris dengan
// student_id = siswa yang lagi login (via auth.uid() -> student_auth).
// Tanpa itu, siswa lain bisa aja ngintip data siswa lain. Lihat SQL RLS
// terpisah yang menyertai file ini.
import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabaseClient";
import { CheckCircle2, Circle, Clock, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function formatRupiah(angka) {
  if (angka === null || angka === undefined) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
}

// Sama persis dengan SppTab.js — NIS pola "yy.yy.07.xxx" -> tahun masuk.
function parseEntryStartYear(nis) {
  const m = nis?.match(/^(\d{2})\.(\d{2})\.07\./);
  if (!m) return null;
  return 2000 + parseInt(m[1], 10);
}

const academicYearLabel = (startYear) => `${startYear}/${startYear + 1}`;

// Sama persis dengan SppTab.js — generate semua periode dari masuk s/d
// akhir TA yang lagi jalan sekarang.
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
        grade: Math.min(7 + gradeOffset, 9),
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

export default function StudentKeuangan({ student }) {
  const [nominalPerTA, setNominalPerTA] = useState({});
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openTA, setOpenTA] = useState(null);
  const [showRiwayat, setShowRiwayat] = useState(false);

  useEffect(() => {
    if (!student?.id) return;

    async function fetchAll() {
      setLoading(true);
      setError(null);

      const [settingsRes, billsRes] = await Promise.all([
        supabase
          .from("school_settings")
          .select("setting_value")
          .eq("setting_key", "spp_nominal_per_ta")
          .maybeSingle(),
        supabase
          .from("spp_bills")
          .select(
            "id, period_month, period_year, amount, status, spp_payments(payment_date, amount_paid, payment_method, note)"
          )
          .eq("student_id", student.id),
      ]);

      if (settingsRes.error) {
        console.error("Error fetching spp_nominal_per_ta:", settingsRes.error);
      } else if (settingsRes.data?.setting_value) {
        try {
          setNominalPerTA(JSON.parse(settingsRes.data.setting_value));
        } catch (e) {
          console.error("spp_nominal_per_ta bukan JSON valid:", e);
        }
      }

      if (billsRes.error) {
        setError(billsRes.error.message);
      } else {
        setBills(billsRes.data || []);
      }
      setLoading(false);
    }

    fetchAll();
  }, [student?.id]);

  const periods = useMemo(() => {
    if (!student) return [];
    const entryYear = parseEntryStartYear(student.nis);
    if (entryYear == null) return null; // NIS gak match pola -- gak bisa dihitung otomatis
    const billMap = new Map(bills.map((b) => [`${b.period_year}-${b.period_month}`, b]));
    return generateExpectedPeriods(entryYear).map((p) => {
      const existing = billMap.get(p.key);
      return {
        ...p,
        amount: existing?.amount ?? nominalPerTA[p.ta] ?? 0,
        status: existing?.status || "unpaid",
        payments: existing?.spp_payments || [],
      };
    });
  }, [student, bills, nominalPerTA]);

  useEffect(() => {
    if (periods && periods.length > 0) {
      setOpenTA(periods[periods.length - 1].ta);
    }
  }, [periods]);

  const groupedByTA = useMemo(() => {
    if (!periods) return {};
    const groups = {};
    for (const p of periods) {
      if (!groups[p.ta]) groups[p.ta] = [];
      groups[p.ta].push(p);
    }
    return groups;
  }, [periods]);

  const duePeriods = (periods || []).filter((p) => p.isDue);
  const belumBayarList = duePeriods.filter((p) => p.status !== "paid");
  const totalTunggakan = belumBayarList.reduce((sum, p) => sum + p.amount, 0);

  const riwayat = useMemo(() => {
    const rows = [];
    for (const p of periods || []) {
      for (const pay of p.payments) {
        rows.push({ ...pay, periodLabel: `${MONTH_NAMES[p.month - 1]} ${p.year}` });
      }
    }
    return rows.sort((a, b) => (a.payment_date < b.payment_date ? 1 : -1));
  }, [periods]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 text-sm text-red-600">
        Gagal memuat data pembayaran: {error}
      </div>
    );
  }

  if (periods === null) {
    return (
      <div className="text-center py-10 text-sm text-theme-secondary">
        Data periode pembayaran belum bisa dihitung otomatis untuk akun ini. Silakan hubungi TU /
        Tata Usaha sekolah.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Ringkasan tunggakan */}
      <div
        className={`p-4 rounded-xl border ${
          belumBayarList.length > 0
            ? "bg-red-50 border-red-100"
            : "bg-emerald-50 border-emerald-100"
        }`}
      >
        <div className="flex items-center gap-2">
          {belumBayarList.length > 0 ? (
            <AlertTriangle size={18} className="text-red-600" />
          ) : (
            <CheckCircle2 size={18} className="text-emerald-600" />
          )}
          <span
            className={`font-bold ${
              belumBayarList.length > 0 ? "text-red-700" : "text-emerald-700"
            }`}
          >
            {belumBayarList.length > 0
              ? `Tertunggak ${belumBayarList.length} bulan`
              : "Semua SPP lunas"}
          </span>
        </div>
        {belumBayarList.length > 0 && (
          <p className="text-sm text-red-700/80 mt-1">Total: {formatRupiah(totalTunggakan)}</p>
        )}
      </div>

      {/* Rincian per tahun ajaran */}
      <div className="space-y-2">
        {Object.entries(groupedByTA).map(([ta, items]) => {
          const isOpen = openTA === ta;
          return (
            <div key={ta} className="rounded-xl border border-gray-100 overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenTA(isOpen ? null : ta)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 text-left"
              >
                <span className="font-bold text-sm text-theme">TA {ta}</span>
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {isOpen && (
                <div className="grid grid-cols-3 gap-2 p-3">
                  {items.map((p) => {
                    const isPaid = p.status === "paid";
                    const isPartial = p.status === "partial";
                    const isOverdue = !isPaid && !isPartial && p.isDue;
                    return (
                      <div
                        key={p.key}
                        className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs border ${
                          isPaid
                            ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                            : isPartial
                              ? "bg-amber-50 border-amber-200 text-amber-700"
                              : isOverdue
                                ? "bg-red-50 border-red-200 text-red-700 font-semibold"
                                : "bg-gray-50 border-gray-200 border-dashed text-gray-400"
                        }`}
                      >
                        {isPaid ? (
                          <CheckCircle2 size={13} />
                        ) : isPartial ? (
                          <Clock size={13} />
                        ) : isOverdue ? (
                          <AlertTriangle size={13} />
                        ) : (
                          <Circle size={13} />
                        )}
                        {MONTH_NAMES[p.month - 1].slice(0, 3)}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Riwayat pembayaran */}
      <div className="rounded-xl border border-gray-100 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowRiwayat((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 text-left"
        >
          <span className="font-bold text-sm text-theme">Riwayat Pembayaran</span>
          {showRiwayat ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showRiwayat && (
          <div className="divide-y divide-gray-50">
            {riwayat.length === 0 ? (
              <p className="p-4 text-sm text-theme-secondary">Belum ada riwayat.</p>
            ) : (
              riwayat.map((r, i) => (
                <div key={i} className="p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-theme">{r.periodLabel}</span>
                    <span className="text-theme">{formatRupiah(r.amount_paid)}</span>
                  </div>
                  <div className="text-xs text-theme-secondary mt-0.5">
                    {new Date(r.payment_date).toLocaleDateString("id-ID")}
                    {r.note ? ` · ${r.note}` : ""}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
