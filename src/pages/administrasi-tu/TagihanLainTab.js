// [file name]: pages/administrasi-tu/TagihanLainTab.js
// Sub-tab generik buat 2 kategori "sekali bayar" di dalem KeuanganTab.js:
// "Uang Awal Tahun" (buat siswa baru -- Kaos OR, Batik, Atribut, Map
// Rapor, Foto, dsb) & "Uang Akhir Tahun" (buat kelas 9). Dua-duanya
// SENGAJA 1 komponen yang sama (bukan dipisah 2 file) karena polanya
// identik banget -- bedanya cuma:
// - feeType: 'awal_tahun' | 'akhir_tahun' (kolom pembeda di tabel)
// - gradeFilter: 7 | 9 (buat filter dropdown kelas jadi cuma nampilin
//   7A-7F atau 9A-9F, sesuai request user: simpel, gak usah filter
//   angkatan/tahun masuk segala)
//
// REVISI (itemized -- kayak nota tulis tangan TU): dulu 1 siswa = 1 row
// tagihan dengan 1 nominal flat. SEKARANG 1 siswa bisa punya BANYAK
// item (Kaos OR 150rb, Batik 130rb, Atribut 110rb, Map Rapor 70rb,
// Foto 40rb -> total 500rb), masing-masing 1 row di other_fee_bills
// dibedain kolom `item_name`. Nominal per item SENGAJA diinput manual
// TU pas generate (bukan dari master data item), soalnya daftar & harga
// itemnya suka beda tiap tahun ajaran/kelas -- lihat sql/003.
//
// Alur bayar ngikutin pola SppTab.js: checklist item (kayak checklist
// bulan SPP) --
// - Centang BEBERAPA item sekaligus -> dianggap lunas PENUH per item
//   yang dicentang (gak ada input nominal manual).
// - Centang cuma 1 item -> boleh nyicil, nominalnya bisa diedit manual
//   (kadang ortu cuma nitip duit sekian, belum tentu pas 1 item).
//
// BEDA dari SppTab.js (SPP):
// - Bukan bulanan/berulang tiap tahun ajaran -- item digenerate sekali
//   per siswa per tahun ajaran, gak ada logic tunggakan lintas tahun
//   kayak SPP (siswa naik kelas dari 7->9 gak "nunggak" Uang Awal Tahun
//   kelas 7 kalau emang belum pernah digenerate dari awal).
// - Daftar item + nominalnya diinput manual tiap generate (BEDA dari
//   SPP yang nominalnya dari school_settings), soalnya "Kaos OR" dkk
//   suka ganti nominal & bahkan ganti jenis item tiap tahun ajaran.
// - "academic_year" di-ambil otomatis dari kelas yang dipilih (field
//   `academic_year` yang udah ada di tabel classes, lihat KeuanganTab.js)
//   dan disimpen langsung di tiap baris item (denormalized) -- biar
//   gampang di-query buat Riwayat/Laporan tanpa join balik ke classes.
//
// Nempel ke tabel public.other_fee_bills & public.other_fee_payments
// (lihat sql/002_other_fee_schema.sql + sql/003_other_fee_bill_items.sql)
// -- SENGAJA 1 pasang tabel general (bukan 4 tabel terpisah kayak
// spp_bills/spp_payments x2) dengan kolom `fee_type` buat bedain Awal
// Tahun vs Akhir Tahun + kolom `item_name` buat bedain item dalem 1
// fee_type yang sama, biar gak duplikasi skema. status di
// other_fee_bills dihitung OTOMATIS lewat trigger DB dari total
// other_fee_payments PER ROW (per item) -- komponen ini TIDAK PERNAH
// update kolom status manual, cukup insert ke other_fee_payments.
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../supabaseClient";
import {
  FileText,
  Search,
  AlertTriangle,
  History,
  Plus,
  Trash2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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
// Util kecil: total & status gabungan dari sekumpulan item bill
// ============================================================
const sumAmount = (items) => items.reduce((sum, it) => sum + Number(it.amount || 0), 0);

// Status gabungan buat 1 siswa dari beberapa item:
// - semua item "paid" -> paid
// - ada yang udah ada progress (partial/paid) tapi belum semua -> partial
// - belum ada progress sama sekali -> unpaid
const combinedStatus = (items) => {
  if (items.length === 0) return "unpaid";
  if (items.every((it) => it.status === "paid")) return "paid";
  if (items.some((it) => it.status === "paid" || it.status === "partial")) return "partial";
  return "unpaid";
};

let itemRowSeq = 0;
const newItemRow = () => ({ rowId: `new-${++itemRowSeq}`, name: "", amount: "" });

// ============================================================
// 1. Tagihan -- generate itemized (nama item + nominal, bisa lebih
//    dari 1 baris) + lihat rincian per siswa
// ============================================================
const TagihanLainPanel = ({ classes, darkMode, user, notify, feeType }) => {
  const [classId, setClassId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [itemRows, setItemRows] = useState([newItemRow()]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [openStudent, setOpenStudent] = useState(null);

  const selectedClass = classes.find((c) => c.id === classId);

  const fetchBills = useCallback(async () => {
    if (!classId) {
      setBills([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("other_fee_bills")
      .select("id, item_name, amount, due_date, status, student_id, students(id, full_name, nis)")
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

  // Kelompokin item per siswa buat ditampilin di tabel (1 baris = 1
  // siswa, expand buat lihat rincian itemnya).
  const groupedByStudent = useMemo(() => {
    const map = new Map();
    for (const b of bills) {
      if (!map.has(b.student_id)) {
        map.set(b.student_id, { student: b.students, items: [] });
      }
      map.get(b.student_id).items.push(b);
    }
    return Array.from(map.values());
  }, [bills]);

  const addItemRow = () => setItemRows((prev) => [...prev, newItemRow()]);
  const removeItemRow = (rowId) =>
    setItemRows((prev) => (prev.length > 1 ? prev.filter((r) => r.rowId !== rowId) : prev));
  const updateItemRow = (rowId, field, value) =>
    setItemRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, [field]: value } : r)));

  const validItems = itemRows.filter((r) => r.name.trim() && Number(r.amount) > 0);
  const totalPerSiswa = sumAmount(validItems);

  const handleGenerate = async () => {
    if (!classId || validItems.length === 0) {
      notify("Pilih kelas & isi minimal 1 item + nominal dulu bre", "error");
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

      // Skip kombinasi siswa+item yang udah ada (biar bisa nambah item
      // BARU belakangan -- misal ketinggalan "Foto" -- tanpa
      // nge-duplikat item yang udah digenerate duluan). Unique
      // constraint (student_id, fee_type, academic_year, item_name) di
      // DB juga bakal nolak, tapi di-filter dulu di sini biar gak
      // insert error massal.
      const itemNames = validItems.map((it) => it.name.trim());
      const { data: existing, error: existingErr } = await supabase
        .from("other_fee_bills")
        .select("student_id, item_name")
        .eq("fee_type", feeType)
        .in("item_name", itemNames)
        .in(
          "student_id",
          students.map((s) => s.id)
        );
      if (existingErr) throw existingErr;

      const existingSet = new Set((existing || []).map((e) => `${e.student_id}::${e.item_name}`));
      const toInsert = [];
      for (const s of students) {
        for (const it of validItems) {
          const name = it.name.trim();
          if (existingSet.has(`${s.id}::${name}`)) continue;
          toInsert.push({
            student_id: s.id,
            class_id: classId,
            fee_type: feeType,
            item_name: name,
            academic_year: selectedClass?.academic_year || null,
            amount: Number(it.amount),
            due_date: dueDate || null,
            created_by: user?.id || null,
          });
        }
      }

      if (toInsert.length === 0) {
        notify("Semua siswa udah punya semua item ini", "error");
        setGenerating(false);
        return;
      }

      const { error: insertErr } = await supabase.from("other_fee_bills").insert(toInsert);
      if (insertErr) throw insertErr;

      notify(`Tagihan dibuat: ${toInsert.length} item buat ${students.length} siswa`, "success");
      setItemRows([newItemRow()]);
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
        className={`rounded-2xl border p-5 space-y-4 shadow-sm ${
          darkMode ? "bg-gray-800/60 border-gray-700" : "bg-gray-50 border-gray-200"
        }`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <Field label="Jatuh tempo (opsional, berlaku semua item)" darkMode={darkMode}>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputClass(darkMode)}
            />
          </Field>
        </div>

        <div>
          <p
            className={`text-xs font-semibold mb-2.5 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
          >
            Rincian item (misal: Kaos OR, Batik, Atribut, Map Rapor, Foto...)
          </p>
          <div className="space-y-2.5">
            {itemRows.map((row) => (
              <div key={row.rowId} className="flex items-center gap-2.5">
                <input
                  value={row.name}
                  onChange={(e) => updateItemRow(row.rowId, "name", e.target.value)}
                  placeholder="Nama item, mis. Kaos OR"
                  className={`${inputClass(darkMode)} flex-1`}
                />
                <input
                  type="number"
                  value={row.amount}
                  onChange={(e) => updateItemRow(row.rowId, "amount", e.target.value)}
                  placeholder="Nominal"
                  className={`${inputClass(darkMode)} w-40`}
                />
                <button
                  onClick={() => removeItemRow(row.rowId)}
                  disabled={itemRows.length === 1}
                  title="Hapus baris ini"
                  className={`p-2.5 rounded-xl transition-colors disabled:opacity-30 ${
                    darkMode ? "text-red-400 hover:bg-red-900/20" : "text-red-500 hover:bg-red-50"
                  }`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addItemRow}
            className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:underline"
          >
            <Plus size={14} /> Tambah item
          </button>
        </div>

        {validItems.length > 0 && (
          <p className={`text-sm font-semibold ${darkMode ? "text-gray-200" : "text-gray-700"}`}>
            Total per siswa: {formatRupiah(totalPerSiswa)} ({validItems.length} item)
          </p>
        )}
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
              <th className="px-5 py-3 text-right text-xs font-semibold tracking-wide">
                Total ({">"} klik buat rincian)
              </th>
              <th className="px-5 py-3 text-center text-xs font-semibold tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${darkMode ? "divide-gray-800" : "divide-gray-100"}`}>
            {loading ? (
              <EmptyRow darkMode={darkMode}>Memuat...</EmptyRow>
            ) : !classId ? (
              <EmptyRow darkMode={darkMode}>Pilih kelas dulu buat lihat tagihan.</EmptyRow>
            ) : groupedByStudent.length === 0 ? (
              <EmptyRow darkMode={darkMode}>Belum ada tagihan buat kelas ini.</EmptyRow>
            ) : (
              groupedByStudent.map(({ student, items }) => {
                const isOpen = openStudent === student?.id;
                const total = sumAmount(items);
                const status = combinedStatus(items);
                return (
                  <React.Fragment key={student?.id}>
                    <tr
                      onClick={() => setOpenStudent(isOpen ? null : student?.id)}
                      className={`cursor-pointer transition-colors ${
                        darkMode
                          ? "text-gray-200 hover:bg-gray-800/50"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <td className="px-5 py-3 font-mono text-xs">{student?.nis}</td>
                      <td className="px-5 py-3 font-medium">
                        <span className="flex items-center gap-1.5">
                          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          {student?.full_name}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-medium">
                        {formatRupiah(total)}{" "}
                        <span className="text-gray-400">({items.length})</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <StatusBadge status={status} />
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={4} className={darkMode ? "bg-gray-800/40" : "bg-gray-50/60"}>
                          <div className="px-5 py-3 space-y-1.5">
                            {items.map((it) => (
                              <div
                                key={it.id}
                                className="flex items-center justify-between text-xs px-2 py-1.5"
                              >
                                <span className={darkMode ? "text-gray-300" : "text-gray-600"}>
                                  {it.item_name}
                                </span>
                                <span className="flex items-center gap-2.5">
                                  <span className="font-medium">{formatRupiah(it.amount)}</span>
                                  <StatusBadge status={it.status} />
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================
// 2. Catat Pembayaran -- cari siswa -> checklist item (kayak
//    checklist bulan di SppTab.js). Centang > 1 item = lunas penuh
//    per item. Centang cuma 1 item = boleh nyicil (nominal manual).
// ============================================================
const PembayaranLainPanel = ({ darkMode, user, notify, feeType }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [selected, setSelected] = useState(new Set());
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
    setSelected(new Set());
    setAmountPaid("");
    setStudents([]);
    setSearchTerm(s.full_name);
    setLoadingItems(true);
    const { data, error } = await supabase
      .from("other_fee_bills")
      .select("id, item_name, amount, academic_year, status, other_fee_payments(amount_paid)")
      .eq("student_id", s.id)
      .eq("fee_type", feeType)
      .order("created_at", { ascending: true });
    if (!error) {
      const withRemaining = (data || []).map((b) => {
        const paid = (b.other_fee_payments || []).reduce(
          (sum, p) => sum + Number(p.amount_paid || 0),
          0
        );
        return { ...b, remaining: Math.max(0, Number(b.amount) - paid) };
      });
      setItems(withRemaining);
    }
    setLoadingItems(false);
  };

  const toggleItem = (item) => {
    if (item.remaining <= 0) return; // udah lunas, gak usah bisa dicentang
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(item.id) ? next.delete(item.id) : next.add(item.id);
      return next;
    });
  };

  const selectedItems = items.filter((it) => selected.has(it.id));
  const isSingleSelect = selectedItems.length === 1;
  const totalDipilih = isSingleSelect
    ? Number(amountPaid) || 0
    : selectedItems.reduce((sum, it) => sum + it.remaining, 0);

  // Prefill nominal manual pas cuma 1 item yang dicentang (default =
  // sisa tagihan item itu, tapi tetep bisa diedit buat nyicil).
  useEffect(() => {
    if (selectedItems.length === 1) {
      setAmountPaid(String(selectedItems[0].remaining));
    } else {
      setAmountPaid("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      notify("Pilih minimal 1 item dulu bre", "error");
      return;
    }
    if (isSingleSelect && (!amountPaid || Number(amountPaid) <= 0)) {
      notify("Isi nominal bayar dulu bre", "error");
      return;
    }
    setSubmitting(true);
    try {
      const rows = selectedItems.map((it) => ({
        bill_id: it.id,
        student_id: selectedStudent.id,
        amount_paid: isSingleSelect ? Number(amountPaid) : it.remaining,
        payment_date: paymentDate,
        payment_method: method,
        note: note || null,
        recorded_by: user?.id || null,
      }));
      const { error } = await supabase.from("other_fee_payments").insert(rows);
      if (error) throw error;

      notify(
        isSingleSelect
          ? "Pembayaran berhasil dicatat"
          : `Pembayaran ${selectedItems.length} item berhasil dicatat`,
        "success"
      );
      setNote("");
      // refresh item list buat siswa ini
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
              className={`text-xs font-semibold mb-2.5 flex items-center justify-between ${darkMode ? "text-gray-400" : "text-gray-500"}`}
            >
              <span>Rincian tagihan — {selectedStudent.full_name}</span>
              {selected.size > 0 && <span>{selected.size} item dicentang</span>}
            </p>
            {loadingItems ? (
              <div
                className={`flex items-center gap-2 text-sm px-3.5 py-3 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                <Loader2 size={14} className="animate-spin" /> Memuat...
              </div>
            ) : items.length === 0 ? (
              <p className={`text-sm ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                Belum ada tagihan buat siswa ini.
              </p>
            ) : (
              <div className="space-y-2.5">
                {items.map((it) => {
                  const isPaid = it.remaining <= 0;
                  const isChecked = selected.has(it.id);
                  return (
                    <button
                      key={it.id}
                      onClick={() => toggleItem(it)}
                      disabled={isPaid}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                        isChecked
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                          : darkMode
                            ? "border-gray-700 hover:bg-gray-800"
                            : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <span className={darkMode ? "text-gray-200" : "text-gray-700"}>
                        {it.item_name}
                        {it.status === "partial" && (
                          <span className="text-amber-500 text-xs ml-1.5">
                            (sisa {formatRupiah(it.remaining)})
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-2.5">
                        {!isPaid && <span className="font-medium">{formatRupiah(it.amount)}</span>}
                        <StatusBadge status={it.status} />
                      </span>
                    </button>
                  );
                })}
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
        {selectedItems.length === 0 ? (
          <p className={`text-sm ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
            Pilih siswa & centang item di sebelah kiri dulu.
          </p>
        ) : (
          <>
            {isSingleSelect ? (
              <Field label="Nominal dibayar (bisa dicicil)" darkMode={darkMode}>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder={`maks. ${formatRupiah(selectedItems[0].remaining)}`}
                  className={`${inputClass(darkMode)} w-full`}
                />
              </Field>
            ) : (
              <div
                className={`px-4 py-3 rounded-xl text-sm font-semibold ${darkMode ? "bg-blue-900/20 text-blue-300" : "bg-blue-50 text-blue-700"}`}
              >
                {selectedItems.length} item dicentang, dianggap lunas penuh masing-masing ={" "}
                {formatRupiah(totalDipilih)}
              </div>
            )}
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
// 3. Tunggakan -- rekap siswa yang masih ada item belum lunas
// ============================================================
const TunggakanLainPanel = ({ classes, darkMode, feeType }) => {
  const [classId, setClassId] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTunggakan = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("other_fee_bills")
      .select(
        "id, item_name, amount, academic_year, status, student_id, students(id, full_name, nis, class_id), other_fee_payments(amount_paid)"
      )
      .eq("fee_type", feeType)
      .neq("status", "paid");
    if (classId) query = query.eq("class_id", classId);

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching tunggakan:", error);
      setRows([]);
    } else {
      const byStudent = new Map();
      for (const b of data || []) {
        const paid = (b.other_fee_payments || []).reduce(
          (sum, p) => sum + Number(p.amount_paid || 0),
          0
        );
        const remaining = Math.max(0, Number(b.amount) - paid);
        if (remaining <= 0) continue;
        if (!byStudent.has(b.student_id)) {
          byStudent.set(b.student_id, {
            student: b.students,
            academic_year: b.academic_year,
            items: [],
            total: 0,
          });
        }
        const g = byStudent.get(b.student_id);
        g.items.push({ item_name: b.item_name, remaining });
        g.total += remaining;
      }
      setRows(Array.from(byStudent.values()));
    }
    setLoading(false);
  }, [classId, feeType]);

  useEffect(() => {
    fetchTunggakan();
  }, [fetchTunggakan]);

  const totalTunggakan = useMemo(() => rows.reduce((sum, r) => sum + r.total, 0), [rows]);

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
          Total tunggakan: {formatRupiah(totalTunggakan)} ({rows.length} siswa)
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
              <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide">
                Item Belum Lunas
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold tracking-wide">
                Sisa Tagihan
              </th>
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
                  key={r.student?.id}
                  className={`transition-colors ${
                    darkMode
                      ? "text-gray-200 hover:bg-gray-800/50"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <td className="px-5 py-3 font-medium">{r.student?.full_name}</td>
                  <td className="px-5 py-3">{r.student?.class_id}</td>
                  <td className="px-5 py-3">{r.academic_year || "-"}</td>
                  <td
                    className={`px-5 py-3 text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    {r.items.map((it) => it.item_name).join(", ")}
                  </td>
                  <td className="px-5 py-3 text-right font-medium">{formatRupiah(r.total)}</td>
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
// 4. Riwayat -- log semua pembayaran (per item)
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
        "id, amount_paid, payment_date, payment_method, note, students(id, full_name, nis, class_id), other_fee_bills!inner(academic_year, fee_type, item_name)"
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
              <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide">Item</th>
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
                  <td className="px-5 py-3">{r.other_fee_bills?.item_name || "-"}</td>
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
