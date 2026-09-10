// [file name]: pages/administrasi-tu/TagihanLainTab.js
// Sub-tab generik buat 2 kategori "sekali bayar" di dalem KeuanganTab.js:
// "Uang Awal Tahun" (buat siswa baru -- pembelian atribut dsb) & "Uang
// Akhir Tahun" (buat kelas 9). Dua-duanya SENGAJA 1 komponen yang sama
// (bukan dipisah 2 file) karena polanya identik banget -- bedanya cuma:
// - feeType: 'awal_tahun' | 'akhir_tahun' (kolom pembeda di tabel)
// - gradeFilter: 7 | 9 (buat filter dropdown kelas jadi cuma nampilin
//   7A-7F atau 9A-9F, sesuai request user: simpel, gak usah filter
//   angkatan/tahun masuk segala)
//
// BEDA dari SppTab.js (SPP):
// - Bukan bulanan -- sekali bayar per siswa per tahun ajaran, jadi gak
//   ada input Bulan pas generate tagihan, cuma pilih Kelas + Nominal
//   + (opsional) jatuh tempo.
// - Nominal SENGAJA gak ada default/flat -- TU isi manual tiap generate,
//   soalnya nominalnya suka beda tiap tahun ajaran (bukan fix kayak SPP).
// - "academic_year" di-ambil otomatis dari kelas yang dipilih (field
//   `academic_year` yang udah ada di tabel classes, lihat KeuanganTab.js)
//   dan disimpen langsung di baris tagihan (denormalized) -- biar gampang
//   di-query buat Riwayat/Laporan tanpa join balik ke classes.
//
// Nempel ke tabel BARU public.other_fee_bills & public.other_fee_payments
// (lihat sql/002_other_fee_schema.sql) -- SENGAJA 1 pasang tabel general
// (bukan 4 tabel terpisah kayak spp_bills/spp_payments x2) dengan kolom
// `fee_type` buat bedain Awal Tahun vs Akhir Tahun, biar gak duplikasi
// skema. status di other_fee_bills juga dihitung OTOMATIS lewat trigger
// DB dari total other_fee_payments -- komponen ini TIDAK PERNAH update
// kolom status manual, cukup insert ke other_fee_payments.
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../supabaseClient";
import {
  FileText,
  Search,
  AlertTriangle,
  History,
  Plus,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";
import { formatRupiah, Field, inputClass, StatusBadge, EmptyRow } from "./keuanganShared";

const SUB_TABS = [
  { id: "tagihan", label: "Tagihan", icon: FileText },
  { id: "pembayaran", label: "Catat Pembayaran", icon: Plus },
  { id: "tunggakan", label: "Tunggakan", icon: AlertTriangle },
  { id: "riwayat", label: "Riwayat", icon: History },
];

const TagihanLainTab = ({ classes = [], darkMode, user, onShowToast, feeType, gradeFilter }) => {
  const [subTab, setSubTab] = useState("tagihan");

  const notify = useCallback(
    (msg, type = "success") => {
      if (onShowToast) onShowToast(msg, type);
    },
    [onShowToast]
  );

  // Cuma kelas sesuai gradeFilter (7A-7F buat Awal Tahun, 9A-9F buat
  // Akhir Tahun) -- classes penuh (semua jenjang) dikirim dari
  // KeuanganTab.js, difilter di sini biar fetch-nya tetep 1x aja di atas.
  const relevantClasses = useMemo(
    () => classes.filter((c) => Number(c.grade) === Number(gradeFilter)),
    [classes, gradeFilter]
  );

  const tabBtnClass = (id) =>
    `flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${
      subTab === id
        ? "bg-emerald-600 text-white shadow-md"
        : darkMode
          ? "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
          : "text-gray-500 hover:bg-white hover:text-gray-800 hover:shadow-sm"
    }`;

  return (
    <div>
      <div
        className={`flex gap-1.5 overflow-x-auto p-1.5 rounded-2xl mb-6 ${
          darkMode ? "bg-gray-800/60" : "bg-gray-100/80"
        }`}
      >
        {SUB_TABS.map((t) => (
          <button key={t.id} onClick={() => setSubTab(t.id)} className={tabBtnClass(t.id)}>
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "tagihan" && (
        <TagihanLainPanel
          classes={relevantClasses}
          darkMode={darkMode}
          user={user}
          notify={notify}
          feeType={feeType}
        />
      )}
      {subTab === "pembayaran" && (
        <PembayaranLainPanel darkMode={darkMode} user={user} notify={notify} feeType={feeType} />
      )}
      {subTab === "tunggakan" && (
        <TunggakanLainPanel classes={relevantClasses} darkMode={darkMode} feeType={feeType} />
      )}
      {subTab === "riwayat" && (
        <RiwayatLainPanel classes={relevantClasses} darkMode={darkMode} feeType={feeType} />
      )}
    </div>
  );
};

// ============================================================
// 1. Tagihan -- generate + lihat status per kelas (sekali bayar, gak
//    ada input bulan kayak SPP)
// ============================================================
const TagihanLainPanel = ({ classes, darkMode, user, notify, feeType }) => {
  const [classId, setClassId] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const selectedClass = classes.find((c) => c.id === classId);

  const fetchBills = useCallback(async () => {
    if (!classId) {
      setBills([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("other_fee_bills")
      .select("id, amount, due_date, status, students(id, full_name, nis)")
      .eq("class_id", classId)
      .eq("fee_type", feeType)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Error fetching bills:", error);
    } else {
      setBills(data || []);
    }
    setLoading(false);
  }, [classId, feeType]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const handleGenerate = async () => {
    if (!classId || !amount || Number(amount) <= 0) {
      notify("Pilih kelas & isi nominal dulu bre", "error");
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

      // Skip siswa yang udah punya tagihan jenis ini (unique constraint
      // student_id+fee_type+academic_year juga bakal nolak, tapi
      // di-filter dulu di sini biar gak insert error).
      const { data: existing, error: existingErr } = await supabase
        .from("other_fee_bills")
        .select("student_id")
        .eq("fee_type", feeType)
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
          fee_type: feeType,
          academic_year: selectedClass?.academic_year || null,
          amount: Number(amount),
          due_date: dueDate || null,
          created_by: user?.id || null,
        }));

      if (toInsert.length === 0) {
        notify("Semua siswa di kelas ini udah punya tagihan ini", "error");
        setGenerating(false);
        return;
      }

      const { error: insertErr } = await supabase.from("other_fee_bills").insert(toInsert);
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
    <div className="space-y-6">
      <div
        className={`rounded-2xl border p-5 grid grid-cols-2 sm:grid-cols-3 gap-4 items-end shadow-sm ${
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
        <Field label="Nominal" darkMode={darkMode}>
          <input
            type="number"
            placeholder="isi sesuai tahun ajaran ini"
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
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition-colors active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
      >
        {generating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        Generate Tagihan buat Kelas Ini
      </button>

      <div
        className={`rounded-2xl border overflow-hidden shadow-sm ${darkMode ? "border-gray-700" : "border-gray-200"}`}
      >
        <table className="w-full text-sm">
          <thead
            className={
              darkMode
                ? "bg-gray-800 text-gray-400 border-b border-gray-700"
                : "bg-gray-50 text-gray-500 border-b border-gray-200"
            }
          >
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide">NIS</th>
              <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide">Nama</th>
              <th className="px-5 py-3 text-right text-xs font-semibold tracking-wide">Nominal</th>
              <th className="px-5 py-3 text-center text-xs font-semibold tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${darkMode ? "divide-gray-800" : "divide-gray-100"}`}>
            {loading ? (
              <EmptyRow darkMode={darkMode}>Memuat...</EmptyRow>
            ) : !classId ? (
              <EmptyRow darkMode={darkMode}>Pilih kelas dulu buat lihat tagihan.</EmptyRow>
            ) : bills.length === 0 ? (
              <EmptyRow darkMode={darkMode}>Belum ada tagihan buat kelas ini.</EmptyRow>
            ) : (
              bills.map((b) => (
                <tr
                  key={b.id}
                  className={`transition-colors ${
                    darkMode
                      ? "text-gray-200 hover:bg-gray-800/50"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <td className="px-5 py-3 font-mono text-xs">{b.students?.nis}</td>
                  <td className="px-5 py-3 font-medium">{b.students?.full_name}</td>
                  <td className="px-5 py-3 text-right font-medium">{formatRupiah(b.amount)}</td>
                  <td className="px-5 py-3 text-center">
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
const PembayaranLainPanel = ({ darkMode, user, notify, feeType }) => {
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
      .from("other_fee_bills")
      .select("id, amount, academic_year, status")
      .eq("student_id", s.id)
      .eq("fee_type", feeType)
      .in("status", ["unpaid", "partial"])
      .order("academic_year", { ascending: true });
    if (!error) setOutstandingBills(data || []);
  };

  const handleSubmit = async () => {
    if (!selectedBill || !amountPaid || Number(amountPaid) <= 0) {
      notify("Pilih tagihan & isi nominal bayar dulu bre", "error");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("other_fee_payments").insert({
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            className={`mt-2 rounded-xl border divide-y overflow-hidden shadow-sm ${darkMode ? "border-gray-700 divide-gray-700" : "border-gray-200 divide-gray-100"}`}
          >
            {students.map((s) => (
              <button
                key={s.id}
                onClick={() => pickStudent(s)}
                className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/20 ${darkMode ? "text-gray-200" : "text-gray-700"}`}
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
          <div className="mt-5">
            <p
              className={`text-xs font-semibold mb-2.5 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
            >
              Tagihan belum lunas — {selectedStudent.full_name}
            </p>
            {outstandingBills.length === 0 ? (
              <div
                className={`flex items-center gap-2 text-sm px-3.5 py-3 rounded-xl ${darkMode ? "bg-emerald-900/20 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`}
              >
                <CheckCircle2 size={16} /> Semua tagihan siswa ini udah lunas.
              </div>
            ) : (
              <div className="space-y-2.5">
                {outstandingBills.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setSelectedBill(b);
                      setAmountPaid("");
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-sm transition-colors ${
                      selectedBill?.id === b.id
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                        : darkMode
                          ? "border-gray-700 hover:bg-gray-800"
                          : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <span className={darkMode ? "text-gray-200" : "text-gray-700"}>
                      TA {b.academic_year || "-"} — {formatRupiah(b.amount)}
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
        className={`rounded-2xl border p-5 space-y-4 shadow-sm ${darkMode ? "bg-gray-800/60 border-gray-700" : "bg-gray-50 border-gray-200"}`}
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
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition-colors active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
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
const TunggakanLainPanel = ({ classes, darkMode, feeType }) => {
  const [classId, setClassId] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTunggakan = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("other_fee_bills")
      .select("id, amount, academic_year, status, students(id, full_name, nis, class_id)")
      .eq("fee_type", feeType)
      .in("status", ["unpaid", "partial"])
      .order("academic_year", { ascending: true });
    if (classId) query = query.eq("class_id", classId);

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching tunggakan:", error);
      setRows([]);
    } else {
      setRows(data || []);
    }
    setLoading(false);
  }, [classId, feeType]);

  useEffect(() => {
    fetchTunggakan();
  }, [fetchTunggakan]);

  const totalTunggakan = useMemo(
    () => rows.reduce((sum, r) => sum + Number(r.amount || 0), 0),
    [rows]
  );

  return (
    <div className="space-y-6">
      <div
        className={`rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-end gap-4 shadow-sm ${
          darkMode ? "bg-gray-800/60 border-gray-700" : "bg-gray-50 border-gray-200"
        }`}
      >
        <div className="sm:w-56">
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
        </div>
        <div
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold ${darkMode ? "bg-red-900/20 text-red-300" : "bg-red-50 text-red-700"}`}
        >
          Total tunggakan: {formatRupiah(totalTunggakan)} ({rows.length} tagihan)
        </div>
      </div>

      <div
        className={`rounded-2xl border overflow-hidden shadow-sm ${darkMode ? "border-gray-700" : "border-gray-200"}`}
      >
        <table className="w-full text-sm">
          <thead
            className={
              darkMode
                ? "bg-gray-800 text-gray-400 border-b border-gray-700"
                : "bg-gray-50 text-gray-500 border-b border-gray-200"
            }
          >
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide">Nama</th>
              <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide">Kelas</th>
              <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide">
                Tahun Ajaran
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold tracking-wide">Nominal</th>
              <th className="px-5 py-3 text-center text-xs font-semibold tracking-wide">Status</th>
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
                <tr
                  key={r.id}
                  className={`transition-colors ${
                    darkMode
                      ? "text-gray-200 hover:bg-gray-800/50"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <td className="px-5 py-3 font-medium">{r.students?.full_name}</td>
                  <td className="px-5 py-3">{r.students?.class_id}</td>
                  <td className="px-5 py-3">{r.academic_year || "-"}</td>
                  <td className="px-5 py-3 text-right font-medium">{formatRupiah(r.amount)}</td>
                  <td className="px-5 py-3 text-center">
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
const RiwayatLainPanel = ({ classes, darkMode, feeType }) => {
  const [classId, setClassId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchRiwayat = useCallback(async () => {
    setLoading(true);
    // !inner di sini biar bisa filter fee_type lewat kolom tabel
    // other_fee_bills yang di-embed (PostgREST butuh !inner buat filter
    // kolom di embedded resource).
    let query = supabase
      .from("other_fee_payments")
      .select(
        "id, amount_paid, payment_date, payment_method, note, students(id, full_name, nis, class_id), other_fee_bills!inner(academic_year, fee_type)"
      )
      .eq("other_fee_bills.fee_type", feeType)
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
  }, [classId, startDate, endDate, feeType]);

  useEffect(() => {
    fetchRiwayat();
  }, [fetchRiwayat]);

  const METHOD_LABEL = { cash: "Tunai", transfer: "Transfer", other: "Lainnya" };

  return (
    <div className="space-y-6">
      <div
        className={`rounded-2xl border p-5 flex flex-wrap items-end gap-4 shadow-sm ${
          darkMode ? "bg-gray-800/60 border-gray-700" : "bg-gray-50 border-gray-200"
        }`}
      >
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
        className={`rounded-2xl border overflow-hidden shadow-sm ${darkMode ? "border-gray-700" : "border-gray-200"}`}
      >
        <table className="w-full text-sm">
          <thead
            className={
              darkMode
                ? "bg-gray-800 text-gray-400 border-b border-gray-700"
                : "bg-gray-50 text-gray-500 border-b border-gray-200"
            }
          >
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide">Tanggal</th>
              <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide">Nama</th>
              <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide">Kelas</th>
              <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide">
                Tahun Ajaran
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold tracking-wide">Nominal</th>
              <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide">Metode</th>
              <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide">Catatan</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${darkMode ? "divide-gray-800" : "divide-gray-100"}`}>
            {loading ? (
              <EmptyRow darkMode={darkMode}>Memuat...</EmptyRow>
            ) : rows.length === 0 ? (
              <EmptyRow darkMode={darkMode}>Belum ada riwayat pembayaran.</EmptyRow>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className={`transition-colors ${
                    darkMode
                      ? "text-gray-200 hover:bg-gray-800/50"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <td className="px-5 py-3 whitespace-nowrap">
                    <span className="flex items-center gap-1.5 text-xs">
                      <Clock size={13} className="text-gray-400 shrink-0" />
                      {new Date(r.payment_date).toLocaleDateString("id-ID")}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-medium">{r.students?.full_name}</td>
                  <td className="px-5 py-3">{r.students?.class_id}</td>
                  <td className="px-5 py-3">{r.other_fee_bills?.academic_year || "-"}</td>
                  <td className="px-5 py-3 text-right font-medium">
                    {formatRupiah(r.amount_paid)}
                  </td>
                  <td className="px-5 py-3">
                    {METHOD_LABEL[r.payment_method] || r.payment_method}
                  </td>
                  <td className={`px-5 py-3 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
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

export default TagihanLainTab;
