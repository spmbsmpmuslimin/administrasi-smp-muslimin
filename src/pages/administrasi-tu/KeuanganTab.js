// [file name]: pages/administrasi-tu/KeuanganTab.js
// Card "Administrasi Keuangan" di dalam AdministrasiTU.js (grup Data &
// Sistem > Administrasi TU). Nempel ke tabel yang SUDAH ADA
// (public.students, public.classes) + tabel baru public.spp_bills &
// public.spp_payments (lihat sql/001_spp_schema.sql).
//
// SENGAJA gak nyentuh apapun punya "Bendahara Sekolah" -- modul ini
// cuma ngurus SPP siswa (tagihan bulanan + riwayat bayar), bukan
// keuangan sekolah secara umum.
//
// Sub-tab (disamain pola sama PersuratanTab.js -- komponen dengan
// sub-tab sendiri di dalemnya):
// 1. Tagihan     -> generate tagihan SPP per kelas+bulan, lihat status
// 2. Pembayaran  -> cari siswa, catat pembayaran/cicilan
// 3. Tunggakan   -> rekap siswa yang belum lunas
// 4. Riwayat     -> log semua pembayaran yang udah masuk
//
// status di spp_bills dihitung OTOMATIS lewat trigger DB dari total
// spp_payments -- komponen ini TIDAK PERNAH update kolom status
// manual, cukup insert ke spp_payments.
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../supabaseClient";
import {
  Wallet,
  FileText,
  Search,
  AlertTriangle,
  History,
  Plus,
  X,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";

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

const STATUS_META = {
  unpaid: {
    label: "Belum Bayar",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  },
  partial: {
    label: "Cicilan",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
  paid: {
    label: "Lunas",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
};

const formatRupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

const SUB_TABS = [
  { id: "tagihan", label: "Tagihan SPP", icon: FileText },
  { id: "pembayaran", label: "Catat Pembayaran", icon: Plus },
  { id: "tunggakan", label: "Tunggakan", icon: AlertTriangle },
  { id: "riwayat", label: "Riwayat", icon: History },
];

const KeuanganTab = ({ user, darkMode, onShowToast }) => {
  const [subTab, setSubTab] = useState("tagihan");
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    const fetchClasses = async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, grade, academic_year")
        .eq("is_active", true)
        .order("id", { ascending: true });
      if (error) {
        console.error("Error fetching classes:", error);
        return;
      }
      setClasses(data || []);
    };
    fetchClasses();
  }, []);

  const notify = useCallback(
    (msg, type = "success") => {
      if (onShowToast) onShowToast(msg, type);
    },
    [onShowToast]
  );

  const tabBtnClass = (id) =>
    `flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
      subTab === id
        ? "bg-emerald-600 text-white"
        : darkMode
          ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
          : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
    }`;

  return (
    <div className="p-4 sm:p-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 bg-gradient-to-br from-emerald-400 to-emerald-500 dark:from-emerald-600 dark:to-emerald-700 text-white rounded-xl shadow-md">
          <Wallet className="w-5 h-5" />
        </div>
        <div>
          <h2
            className={`text-base sm:text-lg font-bold ${darkMode ? "text-gray-100" : "text-gray-800"}`}
          >
            Administrasi Keuangan
          </h2>
          <p className={`text-xs sm:text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            Tagihan SPP, pembayaran, tunggakan, dan riwayat
          </p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 mb-5">
        {SUB_TABS.map((t) => (
          <button key={t.id} onClick={() => setSubTab(t.id)} className={tabBtnClass(t.id)}>
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "tagihan" && (
        <TagihanPanel classes={classes} darkMode={darkMode} user={user} notify={notify} />
      )}
      {subTab === "pembayaran" && (
        <PembayaranPanel darkMode={darkMode} user={user} notify={notify} />
      )}
      {subTab === "tunggakan" && <TunggakanPanel classes={classes} darkMode={darkMode} />}
      {subTab === "riwayat" && <RiwayatPanel classes={classes} darkMode={darkMode} />}
    </div>
  );
};

// ============================================================
// Shared bits
// ============================================================
const Field = ({ label, children, darkMode }) => (
  <div className="flex flex-col gap-1">
    <label className={`text-xs font-semibold ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
      {label}
    </label>
    {children}
  </div>
);

const inputClass = (darkMode) =>
  `px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
    darkMode
      ? "bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500"
      : "bg-white border-gray-300 text-gray-800"
  }`;

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.unpaid;
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${meta.badge}`}>
      {meta.label}
    </span>
  );
};

const EmptyRow = ({ darkMode, children }) => (
  <tr>
    <td
      colSpan={99}
      className={`py-10 text-center text-sm ${darkMode ? "text-gray-500" : "text-gray-400"}`}
    >
      {children}
    </td>
  </tr>
);

// ============================================================
// 1. Tagihan SPP -- generate + lihat status per kelas/bulan
// ============================================================
const TagihanPanel = ({ classes, darkMode, user, notify }) => {
  const now = new Date();
  const [classId, setClassId] = useState("");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchBills = useCallback(async () => {
    if (!classId) {
      setBills([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("spp_bills")
      .select("id, amount, due_date, status, students(id, full_name, nis)")
      .eq("class_id", classId)
      .eq("period_month", month)
      .eq("period_year", year)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Error fetching bills:", error);
    } else {
      setBills(data || []);
    }
    setLoading(false);
  }, [classId, month, year]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const handleGenerate = async () => {
    if (!classId || !amount || Number(amount) <= 0) {
      notify("Pilih kelas & isi nominal SPP dulu bre", "error");
      return;
    }
    setGenerating(true);
    try {
      // Ambil siswa aktif di kelas ini
      const { data: students, error: studentErr } = await supabase
        .from("students")
        .select("id")
        .eq("class_id", classId)
        .eq("is_active", true);
      if (studentErr) throw studentErr;

      if (!students || students.length === 0) {
        notify("Gak ada siswa aktif di kelas ini", "error");
        setGenerating(false);
        return;
      }

      // Skip siswa yang udah punya tagihan di period ini (unique constraint
      // juga bakal nolak, tapi di-filter dulu di sini biar gak insert error).
      const { data: existing, error: existingErr } = await supabase
        .from("spp_bills")
        .select("student_id")
        .eq("period_month", month)
        .eq("period_year", year)
        .in(
          "student_id",
          students.map((s) => s.id)
        );
      if (existingErr) throw existingErr;

      const existingIds = new Set((existing || []).map((e) => e.student_id));
      const toInsert = students
        .filter((s) => !existingIds.has(s.id))
        .map((s) => ({
          student_id: s.id,
          class_id: classId,
          period_month: Number(month),
          period_year: Number(year),
          amount: Number(amount),
          due_date: dueDate || null,
          created_by: user?.id || null,
        }));

      if (toInsert.length === 0) {
        notify("Semua siswa di kelas ini udah punya tagihan buat periode ini", "error");
        setGenerating(false);
        return;
      }

      const { error: insertErr } = await supabase.from("spp_bills").insert(toInsert);
      if (insertErr) throw insertErr;

      notify(`Tagihan dibuat buat ${toInsert.length} siswa`, "success");
      fetchBills();
    } catch (err) {
      console.error("Error generating bills:", err);
      notify("Gagal generate tagihan", "error");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div
        className={`rounded-xl border p-4 grid grid-cols-2 sm:grid-cols-5 gap-3 items-end ${
          darkMode ? "bg-gray-800/60 border-gray-700" : "bg-gray-50 border-gray-200"
        }`}
      >
        <Field label="Kelas" darkMode={darkMode}>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className={inputClass(darkMode)}
          >
            <option value="">Pilih kelas</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Bulan" darkMode={darkMode}>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className={inputClass(darkMode)}
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tahun" darkMode={darkMode}>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className={inputClass(darkMode)}
          />
        </Field>
        <Field label="Nominal SPP" darkMode={darkMode}>
          <input
            type="number"
            placeholder="mis. 150000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass(darkMode)}
          />
        </Field>
        <Field label="Jatuh tempo (opsional)" darkMode={darkMode}>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={inputClass(darkMode)}
          />
        </Field>
      </div>

      <button
        onClick={handleGenerate}
        disabled={generating}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm disabled:opacity-60"
      >
        {generating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        Generate Tagihan buat Kelas Ini
      </button>

      <div
        className={`rounded-xl border overflow-hidden ${darkMode ? "border-gray-700" : "border-gray-200"}`}
      >
        <table className="w-full text-sm">
          <thead className={darkMode ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600"}>
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold">NIS</th>
              <th className="px-4 py-2.5 text-left font-semibold">Nama</th>
              <th className="px-4 py-2.5 text-right font-semibold">Nominal</th>
              <th className="px-4 py-2.5 text-center font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${darkMode ? "divide-gray-800" : "divide-gray-100"}`}>
            {loading ? (
              <EmptyRow darkMode={darkMode}>Memuat...</EmptyRow>
            ) : !classId ? (
              <EmptyRow darkMode={darkMode}>
                Pilih kelas & periode dulu buat lihat tagihan.
              </EmptyRow>
            ) : bills.length === 0 ? (
              <EmptyRow darkMode={darkMode}>Belum ada tagihan buat kelas & periode ini.</EmptyRow>
            ) : (
              bills.map((b) => (
                <tr key={b.id} className={darkMode ? "text-gray-200" : "text-gray-700"}>
                  <td className="px-4 py-2.5 font-mono">{b.students?.nis}</td>
                  <td className="px-4 py-2.5">{b.students?.full_name}</td>
                  <td className="px-4 py-2.5 text-right">{formatRupiah(b.amount)}</td>
                  <td className="px-4 py-2.5 text-center">
                    <StatusBadge status={b.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================
// 2. Catat Pembayaran -- cari siswa, pilih tagihan, input bayar
// ============================================================
const PembayaranPanel = ({ darkMode, user, notify }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [outstandingBills, setOutstandingBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (searchTerm.trim().length < 2) {
        setStudents([]);
        return;
      }
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name, nis, class_id")
        .eq("is_active", true)
        .or(`full_name.ilike.%${searchTerm}%,nis.ilike.%${searchTerm}%`)
        .limit(10);
      if (!error) setStudents(data || []);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const pickStudent = async (s) => {
    setSelectedStudent(s);
    setSelectedBill(null);
    setStudents([]);
    setSearchTerm(s.full_name);
    const { data, error } = await supabase
      .from("spp_bills")
      .select("id, amount, period_month, period_year, status")
      .eq("student_id", s.id)
      .in("status", ["unpaid", "partial"])
      .order("period_year", { ascending: true })
      .order("period_month", { ascending: true });
    if (!error) setOutstandingBills(data || []);
  };

  const handleSubmit = async () => {
    if (!selectedBill || !amountPaid || Number(amountPaid) <= 0) {
      notify("Pilih tagihan & isi nominal bayar dulu bre", "error");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("spp_payments").insert({
        bill_id: selectedBill.id,
        student_id: selectedStudent.id,
        amount_paid: Number(amountPaid),
        payment_date: paymentDate,
        payment_method: method,
        note: note || null,
        recorded_by: user?.id || null,
      });
      if (error) throw error;

      notify("Pembayaran berhasil dicatat", "success");
      setAmountPaid("");
      setNote("");
      // refresh outstanding bills buat siswa ini
      pickStudent(selectedStudent);
    } catch (err) {
      console.error("Error recording payment:", err);
      notify("Gagal mencatat pembayaran", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div>
        <Field label="Cari siswa (nama / NIS)" darkMode={darkMode}>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedStudent(null);
              }}
              placeholder="Ketik nama atau NIS..."
              className={`${inputClass(darkMode)} w-full pl-9`}
            />
          </div>
        </Field>

        {students.length > 0 && (
          <div
            className={`mt-2 rounded-lg border divide-y ${darkMode ? "border-gray-700 divide-gray-700" : "border-gray-200 divide-gray-100"}`}
          >
            {students.map((s) => (
              <button
                key={s.id}
                onClick={() => pickStudent(s)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/20 ${darkMode ? "text-gray-200" : "text-gray-700"}`}
              >
                <span className="font-medium">{s.full_name}</span>{" "}
                <span className="text-gray-400 font-mono text-xs">
                  ({s.nis}) · {s.class_id}
                </span>
              </button>
            ))}
          </div>
        )}

        {selectedStudent && (
          <div className="mt-4">
            <p
              className={`text-xs font-semibold mb-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
            >
              Tagihan belum lunas — {selectedStudent.full_name}
            </p>
            {outstandingBills.length === 0 ? (
              <div
                className={`flex items-center gap-2 text-sm px-3 py-3 rounded-lg ${darkMode ? "bg-emerald-900/20 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`}
              >
                <CheckCircle2 size={16} /> Semua tagihan siswa ini udah lunas.
              </div>
            ) : (
              <div className="space-y-2">
                {outstandingBills.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setSelectedBill(b);
                      setAmountPaid("");
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                      selectedBill?.id === b.id
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                        : darkMode
                          ? "border-gray-700 hover:bg-gray-800"
                          : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <span className={darkMode ? "text-gray-200" : "text-gray-700"}>
                      {MONTH_NAMES[b.period_month - 1]} {b.period_year} — {formatRupiah(b.amount)}
                    </span>
                    <StatusBadge status={b.status} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div
        className={`rounded-xl border p-4 space-y-3 ${darkMode ? "bg-gray-800/60 border-gray-700" : "bg-gray-50 border-gray-200"}`}
      >
        <p className={`text-sm font-semibold ${darkMode ? "text-gray-200" : "text-gray-700"}`}>
          Detail Pembayaran
        </p>
        {!selectedBill ? (
          <p className={`text-sm ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
            Pilih siswa & tagihan di sebelah kiri dulu.
          </p>
        ) : (
          <>
            <Field label="Nominal dibayar" darkMode={darkMode}>
              <input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder={`maks. ${formatRupiah(selectedBill.amount)}`}
                className={`${inputClass(darkMode)} w-full`}
              />
            </Field>
            <Field label="Tanggal bayar" darkMode={darkMode}>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className={`${inputClass(darkMode)} w-full`}
              />
            </Field>
            <Field label="Metode" darkMode={darkMode}>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className={`${inputClass(darkMode)} w-full`}
              >
                <option value="cash">Tunai</option>
                <option value="transfer">Transfer</option>
                <option value="other">Lainnya</option>
              </select>
            </Field>
            <Field label="Catatan (opsional)" darkMode={darkMode}>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="mis. cicilan ke-2"
                className={`${inputClass(darkMode)} w-full`}
              />
            </Field>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <CheckCircle2 size={16} />
              )}
              Simpan Pembayaran
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// ============================================================
// 3. Tunggakan -- rekap siswa yang belum lunas
// ============================================================
const TunggakanPanel = ({ classes, darkMode }) => {
  const [classId, setClassId] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTunggakan = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("spp_bills")
      .select(
        "id, amount, period_month, period_year, status, students(id, full_name, nis, class_id)"
      )
      .in("status", ["unpaid", "partial"])
      .order("period_year", { ascending: true })
      .order("period_month", { ascending: true });
    if (classId) query = query.eq("class_id", classId);

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching tunggakan:", error);
      setRows([]);
    } else {
      setRows(data || []);
    }
    setLoading(false);
  }, [classId]);

  useEffect(() => {
    fetchTunggakan();
  }, [fetchTunggakan]);

  const totalTunggakan = useMemo(
    () => rows.reduce((sum, r) => sum + Number(r.amount || 0), 0),
    [rows]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <Field label="Filter kelas" darkMode={darkMode}>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className={inputClass(darkMode)}
          >
            <option value="">Semua kelas</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id}
              </option>
            ))}
          </select>
        </Field>
        <div
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold ${darkMode ? "bg-red-900/20 text-red-300" : "bg-red-50 text-red-700"}`}
        >
          Total tunggakan: {formatRupiah(totalTunggakan)} ({rows.length} tagihan)
        </div>
      </div>

      <div
        className={`rounded-xl border overflow-hidden ${darkMode ? "border-gray-700" : "border-gray-200"}`}
      >
        <table className="w-full text-sm">
          <thead className={darkMode ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600"}>
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold">Nama</th>
              <th className="px-4 py-2.5 text-left font-semibold">Kelas</th>
              <th className="px-4 py-2.5 text-left font-semibold">Periode</th>
              <th className="px-4 py-2.5 text-right font-semibold">Nominal</th>
              <th className="px-4 py-2.5 text-center font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${darkMode ? "divide-gray-800" : "divide-gray-100"}`}>
            {loading ? (
              <EmptyRow darkMode={darkMode}>Memuat...</EmptyRow>
            ) : rows.length === 0 ? (
              <EmptyRow darkMode={darkMode}>
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" /> Gak ada tunggakan.
                </span>
              </EmptyRow>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className={darkMode ? "text-gray-200" : "text-gray-700"}>
                  <td className="px-4 py-2.5">{r.students?.full_name}</td>
                  <td className="px-4 py-2.5">{r.students?.class_id}</td>
                  <td className="px-4 py-2.5">
                    {MONTH_NAMES[r.period_month - 1]} {r.period_year}
                  </td>
                  <td className="px-4 py-2.5 text-right">{formatRupiah(r.amount)}</td>
                  <td className="px-4 py-2.5 text-center">
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================
// 4. Riwayat -- log semua pembayaran
// ============================================================
const RiwayatPanel = ({ classes, darkMode }) => {
  const [classId, setClassId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchRiwayat = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("spp_payments")
      .select(
        "id, amount_paid, payment_date, payment_method, note, students(id, full_name, nis, class_id), spp_bills(period_month, period_year)"
      )
      .order("payment_date", { ascending: false })
      .limit(200);

    if (startDate) query = query.gte("payment_date", startDate);
    if (endDate) query = query.lte("payment_date", endDate);

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching riwayat:", error);
      setRows([]);
    } else {
      const filtered = classId
        ? (data || []).filter((r) => r.students?.class_id === classId)
        : data || [];
      setRows(filtered);
    }
    setLoading(false);
  }, [classId, startDate, endDate]);

  useEffect(() => {
    fetchRiwayat();
  }, [fetchRiwayat]);

  const METHOD_LABEL = { cash: "Tunai", transfer: "Transfer", other: "Lainnya" };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Filter kelas" darkMode={darkMode}>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className={inputClass(darkMode)}
          >
            <option value="">Semua kelas</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Dari tanggal" darkMode={darkMode}>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputClass(darkMode)}
          />
        </Field>
        <Field label="Sampai tanggal" darkMode={darkMode}>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputClass(darkMode)}
          />
        </Field>
      </div>

      <div
        className={`rounded-xl border overflow-hidden ${darkMode ? "border-gray-700" : "border-gray-200"}`}
      >
        <table className="w-full text-sm">
          <thead className={darkMode ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600"}>
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold">Tanggal</th>
              <th className="px-4 py-2.5 text-left font-semibold">Nama</th>
              <th className="px-4 py-2.5 text-left font-semibold">Kelas</th>
              <th className="px-4 py-2.5 text-left font-semibold">Periode SPP</th>
              <th className="px-4 py-2.5 text-right font-semibold">Nominal</th>
              <th className="px-4 py-2.5 text-left font-semibold">Metode</th>
              <th className="px-4 py-2.5 text-left font-semibold">Catatan</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${darkMode ? "divide-gray-800" : "divide-gray-100"}`}>
            {loading ? (
              <EmptyRow darkMode={darkMode}>Memuat...</EmptyRow>
            ) : rows.length === 0 ? (
              <EmptyRow darkMode={darkMode}>Belum ada riwayat pembayaran.</EmptyRow>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className={darkMode ? "text-gray-200" : "text-gray-700"}>
                  <td className="px-4 py-2.5 whitespace-nowrap flex items-center gap-1.5">
                    <Clock size={13} className="text-gray-400" />
                    {new Date(r.payment_date).toLocaleDateString("id-ID")}
                  </td>
                  <td className="px-4 py-2.5">{r.students?.full_name}</td>
                  <td className="px-4 py-2.5">{r.students?.class_id}</td>
                  <td className="px-4 py-2.5">
                    {r.spp_bills
                      ? `${MONTH_NAMES[r.spp_bills.period_month - 1]} ${r.spp_bills.period_year}`
                      : "-"}
                  </td>
                  <td className="px-4 py-2.5 text-right">{formatRupiah(r.amount_paid)}</td>
                  <td className="px-4 py-2.5">
                    {METHOD_LABEL[r.payment_method] || r.payment_method}
                  </td>
                  <td className={`px-4 py-2.5 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {r.note || "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default KeuanganTab;
