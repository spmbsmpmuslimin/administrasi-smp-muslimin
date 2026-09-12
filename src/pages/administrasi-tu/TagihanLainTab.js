// [file name]: pages/administrasi-tu/TagihanLainTab.js
// Sub-tab generik buat 2 kategori "sekali bayar" di dalem KeuanganTab.js:
// "Uang Awal Tahun" (buat siswa baru -- Kaos OR, Batik, Atribut, Map
// Rapor, Foto, dsb) & "Uang Akhir Tahun" (buat kelas 9). Dua-duanya
// SENGAJA 1 komponen yang sama (bukan dipisah 2 file) karena polanya
// identik banget -- bedanya cuma:
// - feeType: 'awal_tahun' | 'akhir_tahun' (kolom pembeda di tabel +
//   key school_settings `other_fee_items_${feeType}`)
// - gradeFilter: 7 | 9 (buat filter dropdown kelas jadi cuma nampilin
//   7A-7F atau 9A-9F, sesuai request user: simpel, gak usah filter
//   angkatan/tahun masuk segala)
//
// REVISI BESAR (ngikutin pola SppTab.js persis -- TIDAK ADA TOMBOL
// GENERATE LAGI):
// - Dulu: TU generate manual per kelas -> bikin row other_fee_bills
//   buat SEMUA siswa kelas itu di muka.
// - SEKARANG: TU cukup atur SEKALI daftar item + nominal per Tahun
//   Ajaran di tab "Item & Nominal", disimpen di school_settings key
//   `other_fee_items_awal_tahun` / `other_fee_items_akhir_tahun`,
//   format JSON per TA, contoh:
//     { "2026/2027": { "due_date": "2026-08-01", "items": [
//         { "name": "Kaos OR", "amount": 150000 },
//         { "name": "Batik", "amount": 130000 } ] } }
//   Row di other_fee_bills BARU beneran dibikin ON-THE-FLY (lazy
//   insert) pas TU nyatet pembayaran pertama buat item itu -- sama
//   persis kayak spp_bills di SppTab.js. Jadi gak ada lagi konsep
//   "generate buat kelas ini", tinggal atur nominalnya 1x, siswa mana
//   aja otomatis bisa langsung dibayarin itemnya.
// - Tahun ajaran yang dipake buat nyari setting item = academic_year
//   dari KELAS siswa itu sekarang (field `academic_year` di tabel
//   classes), BUKAN dihitung dari NIS kayak SPP -- soalnya ini fee
//   sekali-bayar yang nempel ke tahun ajaran BERJALAN siswa itu,
//   bukan bulan-bulan yang bisa nunggak lintas tahun.
//
// Alur bayar: checklist item (kayak checklist bulan SPP) --
// - Centang BEBERAPA item sekaligus -> dianggap lunas PENUH per item
//   yang dicentang (gak ada input nominal manual).
// - Centang cuma 1 item -> boleh nyicil, nominalnya bisa diedit manual
//   (kadang ortu cuma nitip duit sekian, belum tentu pas 1 item).
//
// status di other_fee_bills dihitung OTOMATIS lewat trigger DB dari
// total other_fee_payments PER ROW (per item) -- komponen ini TIDAK
// PERNAH update kolom status manual, cukup insert ke
// other_fee_payments (dan insert ke other_fee_bills kalau row-nya
// belom ada sama sekali -- lazy insert).
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../supabaseClient";
import {
  Settings,
  Search,
  AlertTriangle,
  History,
  Plus,
  Trash2,
  CheckCircle2,
  BadgeCheck,
  Loader2,
  ClipboardList,
} from "lucide-react";
import { formatRupiah, Field, inputClass, StatusBadge, EmptyRow } from "./keuanganShared";

const SUB_TABS = [
  { id: "item", label: "Item & Nominal", icon: Settings },
  { id: "pembayaran", label: "Catat Pembayaran", icon: Plus },
  { id: "rekap", label: "Rekap Pembayaran", icon: ClipboardList },
  { id: "riwayat", label: "Riwayat", icon: History },
];

const TagihanLainTab = ({ classes = [], darkMode, user, onShowToast, feeType, gradeFilter }) => {
  const [subTab, setSubTab] = useState("item");
  const [itemsSettings, setItemsSettings] = useState({});
  const [settingsLoading, setSettingsLoading] = useState(true);
  // Dipake buat nyambungin klik nama siswa di tab Tunggakan -> langsung
  // lompat ke tab Catat Pembayaran dengan Kelas/Nama Siswa udah ke-isi
  // otomatis (sama persis pola preset di SppTab.js).
  const [pembayaranPreset, setPembayaranPreset] = useState(null);

  const settingsKey = `other_fee_items_${feeType}`;

  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    const { data, error } = await supabase
      .from("school_settings")
      .select("setting_value")
      .eq("setting_key", settingsKey)
      .maybeSingle();
    if (error) {
      console.error(`Error fetching ${settingsKey}:`, error);
    } else if (data?.setting_value) {
      try {
        setItemsSettings(JSON.parse(data.setting_value));
      } catch (e) {
        console.error(`${settingsKey} bukan JSON valid:`, e);
      }
    } else {
      setItemsSettings({});
    }
    setSettingsLoading(false);
  }, [settingsKey]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const goToPembayaran = useCallback((preset) => {
    setPembayaranPreset(preset);
    setSubTab("pembayaran");
  }, []);

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

      {settingsLoading ? (
        <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
          Memuat pengaturan item...
        </div>
      ) : (
        <>
          {subTab === "item" && (
            <ItemSettingsPanel
              classes={relevantClasses}
              darkMode={darkMode}
              notify={notify}
              settingsKey={settingsKey}
              itemsSettings={itemsSettings}
              onSaved={setItemsSettings}
              feeType={feeType}
            />
          )}
          {subTab === "pembayaran" && (
            <PembayaranLainPanel
              classes={relevantClasses}
              darkMode={darkMode}
              user={user}
              notify={notify}
              feeType={feeType}
              itemsSettings={itemsSettings}
              preset={pembayaranPreset}
              onPresetApplied={() => setPembayaranPreset(null)}
            />
          )}
          {subTab === "rekap" && (
            <RekapLainPanel
              classes={relevantClasses}
              darkMode={darkMode}
              feeType={feeType}
              itemsSettings={itemsSettings}
              onPilihSiswa={(studentId, classId) => goToPembayaran({ classId, studentId })}
            />
          )}
          {subTab === "riwayat" && (
            <RiwayatLainPanel classes={relevantClasses} darkMode={darkMode} feeType={feeType} />
          )}
        </>
      )}
    </div>
  );
};

// ============================================================
// Util bareng
// ============================================================
const sumAmount = (items) => items.reduce((sum, it) => sum + Number(it.amount || 0), 0);

// Status gabungan dari sekumpulan item per siswa (buat badge ringkasan):
// - semua "paid" -> paid
// - ada progress (partial/paid) tapi belum semua -> partial
// - belum ada progress sama sekali -> unpaid
const combinedStatus = (items) => {
  if (items.length === 0) return "unpaid";
  if (items.every((it) => it.status === "paid")) return "paid";
  if (items.some((it) => it.status === "paid" || it.status === "partial")) return "partial";
  return "unpaid";
};

// Gabungin daftar item dari setting (nama+nominal standar TA itu) sama
// row other_fee_bills yang UDAH PERNAH kebikin buat siswa itu (kalo
// ada -- biasanya karena udah pernah dibayar sebagian/lunas). Row yang
// belom pernah ada dianggap unpaid, billId null (bakal di-insert
// on-the-fly pas disimpen pembayarannya).
function mergeStudentItems(itemsForYear, existingBills) {
  if (!itemsForYear?.items) return [];
  const billMap = new Map((existingBills || []).map((b) => [b.item_name, b]));
  return itemsForYear.items.map((it) => {
    const existing = billMap.get(it.name);
    const paid = (existing?.other_fee_payments || []).reduce(
      (sum, p) => sum + Number(p.amount_paid || 0),
      0
    );
    // Kalo row-nya udah ada, pake nominal yang KESIMPEN di row itu
    // (biar konsisten sama kuitansi lama walau setting nominal
    // kebetulan udah diubah TU belakangan). Kalo belom ada row, pake
    // nominal dari setting saat ini.
    const amount = existing ? Number(existing.amount) : Number(it.amount);
    return {
      item_name: it.name,
      amount,
      billId: existing?.id || null,
      status: existing?.status || "unpaid",
      remaining: Math.max(0, amount - paid),
    };
  });
}

let itemRowSeq = 0;
const newItemRow = (name = "", amount = "") => ({ rowId: `row-${++itemRowSeq}`, name, amount });

// Default bawaan buat "Uang Awal Tahun" kelas 7 -- persis nota tulis
// tangan TU (Kaos OR, Batik, Atribut, Map Rapor, Foto). Ini CUMA
// dipakein pas belum ada rincian TERSIMPAN buat Tahun Ajaran yang lagi
// dipilih, biar TU gak perlu ngetik ulang dari nol -- nominalnya
// TETEP bisa diedit/dihapus sebelum diklik Simpan (misal buat TA
// depan nominalnya naik). Iuran SPP bulanan (Rp 12.500/bln) SENGAJA
// TIDAK dimasukin ke sini, itu diatur lewat SppTab.js.
const DEFAULT_ITEMS = {
  awal_tahun: [
    { name: "Kaos OR", amount: 150000 },
    { name: "Batik", amount: 130000 },
    { name: "Atribut", amount: 110000 },
    { name: "Map Rapor", amount: 70000 },
    { name: "Foto", amount: 40000 },
  ],
  akhir_tahun: [
    { name: "Uang Akhir Tahun", amount: 200000 },
    { name: "Map Ijazah", amount: 50000 },
    { name: "Foto", amount: 50000 },
  ],
};

// ============================================================
// 1. Item & Nominal -- atur SEKALI daftar item + nominal per Tahun
//    Ajaran (disimpen di school_settings, bukan bikin row per siswa)
// ============================================================
const ItemSettingsPanel = ({
  classes,
  darkMode,
  notify,
  settingsKey,
  itemsSettings,
  onSaved,
  feeType,
}) => {
  // Tebakan default: Tahun Ajaran yang lagi kepake di kelas-kelas
  // jenjang ini sekarang (paling gede/terbaru di antara classes.academic_year).
  const currentYearGuess = useMemo(() => {
    const years = classes.map((c) => c.academic_year).filter(Boolean);
    if (years.length === 0) return "";
    return years.sort().slice(-1)[0];
  }, [classes]);

  const [academicYear, setAcademicYear] = useState(currentYearGuess);
  const [dueDate, setDueDate] = useState("");
  const [itemRows, setItemRows] = useState([newItemRow()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!academicYear && currentYearGuess) setAcademicYear(currentYearGuess);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentYearGuess]);

  // Begitu Tahun Ajaran diketik/dipilih, load rincian item yang UDAH
  // pernah disimpen buat tahun itu (kalo ada), biar TU tinggal edit,
  // bukan ngetik ulang dari nol tiap buka tab ini. Kalo BELUM pernah
  // disimpen sama sekali, prefill pake DEFAULT_ITEMS (nota tulis
  // tangan TU) biar tinggal cek & klik Simpan.
  useEffect(() => {
    const existing = itemsSettings[academicYear];
    if (existing?.items?.length) {
      setItemRows(existing.items.map((it) => newItemRow(it.name, String(it.amount))));
      setDueDate(existing.due_date || "");
    } else if (DEFAULT_ITEMS[feeType]) {
      setItemRows(DEFAULT_ITEMS[feeType].map((it) => newItemRow(it.name, String(it.amount))));
      setDueDate("");
    } else {
      setItemRows([newItemRow()]);
      setDueDate("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicYear]);

  const addItemRow = () => setItemRows((prev) => [...prev, newItemRow()]);
  const removeItemRow = (rowId) =>
    setItemRows((prev) => (prev.length > 1 ? prev.filter((r) => r.rowId !== rowId) : prev));
  const updateItemRow = (rowId, field, value) =>
    setItemRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, [field]: value } : r)));

  const validItems = itemRows.filter((r) => r.name.trim() && Number(r.amount) > 0);
  const total = sumAmount(validItems);

  const handleSave = async () => {
    if (!academicYear.trim() || validItems.length === 0) {
      notify("Isi Tahun Ajaran & minimal 1 item + nominal dulu bre", "error");
      return;
    }
    setSaving(true);
    try {
      const updated = {
        ...itemsSettings,
        [academicYear.trim()]: {
          due_date: dueDate || null,
          items: validItems.map((it) => ({ name: it.name.trim(), amount: Number(it.amount) })),
        },
      };
      const { error } = await supabase
        .from("school_settings")
        .upsert(
          { setting_key: settingsKey, setting_value: JSON.stringify(updated) },
          { onConflict: "setting_key" }
        );
      if (error) throw error;
      onSaved(updated);
      notify(`Rincian item TA ${academicYear} tersimpan`, "success");
    } catch (err) {
      console.error("Error saving item settings:", err);
      notify("Gagal menyimpan rincian item", "error");
    } finally {
      setSaving(false);
    }
  };

  const savedYears = Object.keys(itemsSettings).sort().reverse();

  return (
    <div className="space-y-6">
      <div
        className={`rounded-2xl border p-5 space-y-4 shadow-sm ${
          darkMode ? "bg-gray-800/60 border-gray-700" : "bg-gray-50 border-gray-200"
        }`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Tahun Ajaran" darkMode={darkMode}>
            <input
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="mis. 2026/2027"
              list="ta-options"
              className={inputClass(darkMode)}
            />
            <datalist id="ta-options">
              {savedYears.map((y) => (
                <option key={y} value={y} />
              ))}
            </datalist>
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
            Total per siswa: {formatRupiah(total)} ({validItems.length} item)
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition-colors active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
          Simpan Rincian TA {academicYear || "-"}
        </button>
      </div>

      {savedYears.length > 0 && (
        <div
          className={`rounded-2xl border overflow-hidden shadow-sm ${darkMode ? "border-gray-700" : "border-gray-200"}`}
        >
          <div
            className={`px-5 py-3 text-xs font-semibold ${darkMode ? "bg-gray-800 text-gray-400 border-b border-gray-700" : "bg-gray-50 text-gray-500 border-b border-gray-200"}`}
          >
            Tahun ajaran yang udah punya rincian
          </div>
          <div className={`divide-y ${darkMode ? "divide-gray-800" : "divide-gray-100"}`}>
            {savedYears.map((y) => (
              <button
                key={y}
                onClick={() => setAcademicYear(y)}
                className={`w-full flex items-center justify-between px-5 py-3 text-sm text-left transition-colors ${
                  darkMode ? "text-gray-200 hover:bg-gray-800/50" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span>
                  TA {y} · {itemsSettings[y].items.length} item
                </span>
                <span className="font-medium">
                  {formatRupiah(sumAmount(itemsSettings[y].items))}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// 2. Catat Pembayaran -- Kelas -> Nama Siswa -> checklist item (kayak
//    checklist bulan di SppTab.js), dihitung langsung dari setting
//    Item & Nominal, TANPA butuh generate duluan.
// ============================================================
const PembayaranLainPanel = ({
  classes,
  darkMode,
  user,
  notify,
  feeType,
  itemsSettings,
  preset,
  onPresetApplied,
}) => {
  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [bills, setBills] = useState([]);
  const [loadingBills, setLoadingBills] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedClass = classes.find((c) => c.id === classId);
  const student = students.find((s) => s.id === studentId) || null;
  const academicYear = selectedClass?.academic_year || null;
  const itemsForYear = academicYear ? itemsSettings[academicYear] : null;

  useEffect(() => {
    if (!classId) {
      setStudents([]);
      return;
    }
    const fetchStudents = async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name, nis, class_id")
        .eq("class_id", classId)
        .eq("is_active", true)
        .order("full_name", { ascending: true });
      if (error) {
        console.error("Error fetching students:", error);
        return;
      }
      setStudents(data || []);
    };
    fetchStudents();
  }, [classId]);

  const fetchBills = useCallback(
    async (sid) => {
      setLoadingBills(true);
      const { data, error } = await supabase
        .from("other_fee_bills")
        .select("id, item_name, amount, status, other_fee_payments(amount_paid)")
        .eq("student_id", sid)
        .eq("fee_type", feeType);
      if (error) {
        console.error("Error fetching other_fee_bills:", error);
        setBills([]);
      } else {
        setBills(data || []);
      }
      setLoadingBills(false);
    },
    [feeType]
  );

  const pickStudent = (id) => {
    setStudentId(id);
    setSelected(new Set());
    setAmountPaid("");
    if (id) fetchBills(id);
  };

  // Preset dari klik nama siswa di tab Tunggakan.
  useEffect(() => {
    if (!preset) return;
    if (preset.classId) setClassId(preset.classId);
  }, [preset]);

  useEffect(() => {
    if (!preset?.studentId) return;
    if (classId !== preset.classId) return;
    if (!students.some((s) => s.id === preset.studentId)) return;
    pickStudent(preset.studentId);
    onPresetApplied?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, classId, students]);

  const items = useMemo(() => mergeStudentItems(itemsForYear, bills), [itemsForYear, bills]);

  const toggleItem = (item) => {
    if (item.remaining <= 0) return;
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(item.item_name) ? next.delete(item.item_name) : next.add(item.item_name);
      return next;
    });
  };

  const selectedItems = items.filter((it) => selected.has(it.item_name));
  const isSingleSelect = selectedItems.length === 1;
  const totalDipilih = isSingleSelect
    ? Number(amountPaid) || 0
    : selectedItems.reduce((sum, it) => sum + it.remaining, 0);

  const belumBayar = items.filter((it) => it.status !== "paid");
  const totalTunggakan = belumBayar.reduce((sum, it) => sum + it.remaining, 0);

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
    setSaving(true);
    try {
      for (const it of selectedItems) {
        let billId = it.billId;
        // Lazy insert: row other_fee_bills buat item ini belom pernah
        // ada -- bikin sekarang, PAS mau dibayar (sama pola kayak
        // spp_bills di SppTab.js).
        if (!billId) {
          const { data: newBill, error: billErr } = await supabase
            .from("other_fee_bills")
            .insert({
              student_id: student.id,
              class_id: student.class_id,
              fee_type: feeType,
              item_name: it.item_name,
              academic_year: academicYear,
              amount: it.amount,
              due_date: itemsForYear?.due_date || null,
              created_by: user?.id || null,
            })
            .select("id")
            .single();
          if (billErr) throw billErr;
          billId = newBill.id;
        }
        const { error: payErr } = await supabase.from("other_fee_payments").insert({
          bill_id: billId,
          student_id: student.id,
          amount_paid: isSingleSelect ? Number(amountPaid) : it.remaining,
          payment_date: paymentDate,
          payment_method: method,
          note: note || null,
          recorded_by: user?.id || null,
        });
        if (payErr) throw payErr;
      }
      notify(
        isSingleSelect
          ? "Pembayaran berhasil dicatat"
          : `Pembayaran ${selectedItems.length} item berhasil dicatat`,
        "success"
      );
      setNote("");
      fetchBills(student.id);
    } catch (err) {
      console.error("Error recording payment:", err);
      notify("Gagal mencatat pembayaran", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div
        className={`rounded-2xl border p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 shadow-sm ${
          darkMode ? "bg-gray-800/60 border-gray-700" : "bg-gray-50 border-gray-200"
        }`}
      >
        <Field label="Kelas" darkMode={darkMode}>
          <select
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              pickStudent("");
            }}
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
        <Field label="Nama Siswa" darkMode={darkMode}>
          <select
            value={studentId}
            onChange={(e) => pickStudent(e.target.value)}
            className={inputClass(darkMode)}
            disabled={!classId}
          >
            <option value="">Pilih siswa</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name} ({s.nis})
              </option>
            ))}
          </select>
        </Field>
      </div>

      {!student && (
        <div
          className={`rounded-2xl border border-dashed py-16 text-center text-sm flex flex-col items-center gap-3 ${
            darkMode ? "border-gray-700 text-gray-500" : "border-gray-300 text-gray-400"
          }`}
        >
          <div className={`p-3 rounded-full ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
            <Search size={20} />
          </div>
          Pilih kelas lalu nama siswa buat lihat rincian tagihannya.
        </div>
      )}

      {student && loadingBills && (
        <div
          className={`text-sm flex items-center gap-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
        >
          <Loader2 size={14} className="animate-spin" /> Memuat...
        </div>
      )}

      {student && !loadingBills && !itemsForYear && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 flex items-center gap-3">
          <AlertTriangle size={16} className="shrink-0" />
          Belum ada rincian item buat Tahun Ajaran {academicYear || "kelas ini"}. Atur dulu di tab
          "Item & Nominal".
        </div>
      )}

      {student && !loadingBills && itemsForYear && (
        <div
          className={`rounded-2xl border overflow-hidden shadow-sm ${darkMode ? "border-gray-700" : "border-gray-200"}`}
        >
          <div
            className={`p-5 border-b flex flex-wrap items-center justify-between gap-4 ${
              darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
            }`}
          >
            <div>
              <p className={`font-semibold ${darkMode ? "text-gray-100" : "text-gray-800"}`}>
                {student.full_name}
              </p>
              <p className={`text-xs mt-0.5 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                NIS {student.nis} · Kelas {student.class_id} · TA {academicYear}
              </p>
            </div>
            <div
              className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 ${
                belumBayar.length > 0
                  ? darkMode
                    ? "bg-red-900/20 text-red-300"
                    : "bg-red-50 text-red-700"
                  : darkMode
                    ? "bg-emerald-900/20 text-emerald-300"
                    : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {belumBayar.length > 0 ? <AlertTriangle size={15} /> : <BadgeCheck size={15} />}
              {belumBayar.length > 0
                ? `Tertunggak ${formatRupiah(totalTunggakan)} (${belumBayar.length} dari ${items.length} item)`
                : `Lunas semua (${items.length} item)`}
            </div>
          </div>

          <div className="p-5 space-y-2.5">
            {items.map((it) => {
              const isPaid = it.remaining <= 0;
              const isChecked = selected.has(it.item_name);
              return (
                <button
                  key={it.item_name}
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

          {selectedItems.length > 0 && (
            <div
              className={`p-5 border-t space-y-4 ${darkMode ? "bg-gray-800/60 border-gray-700" : "bg-gray-50 border-gray-200"}`}
            >
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
                <p
                  className={`text-sm font-semibold ${darkMode ? "text-gray-200" : "text-gray-700"}`}
                >
                  {selectedItems.length} item dicentang, dianggap lunas penuh masing-masing ={" "}
                  <span className="text-blue-600 dark:text-blue-400">
                    {formatRupiah(totalDipilih)}
                  </span>
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Tanggal bayar" darkMode={darkMode}>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className={inputClass(darkMode)}
                  />
                </Field>
                <Field label="Metode" darkMode={darkMode}>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className={inputClass(darkMode)}
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
                    className={inputClass(darkMode)}
                  />
                </Field>
              </div>

              <button
                onClick={handleSubmit}
                disabled={saving}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition-colors active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                Catat Pembayaran
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================
// 3. Rekap Pembayaran -- per kelas, tampilin SEMUA siswa (Lunas /
//    Belum Lunas / Semua), klik nama buat expand rincian tiap item
//    per status. Dihitung dari setting Item & Nominal + row
//    other_fee_bills yang udah ada (item yang belom pernah dibayar
//    sama sekali dianggap unpaid walau belom punya row).
// ============================================================
const STATUS_FILTERS = [
  { id: "semua", label: "Semua" },
  { id: "lunas", label: "Lunas" },
  { id: "belum", label: "Belum Lunas" },
];

const RekapLainPanel = ({ classes, darkMode, feeType, itemsSettings, onPilihSiswa }) => {
  const [classId, setClassId] = useState("");
  const [statusFilter, setStatusFilter] = useState("belum");
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const selectedClass = classes.find((c) => c.id === classId);
  const academicYear = selectedClass?.academic_year || null;
  const itemsForYear = academicYear ? itemsSettings[academicYear] : null;

  const fetchRekap = useCallback(async () => {
    if (!classId || !itemsForYear) {
      setAllRows([]);
      return;
    }
    setLoading(true);
    try {
      const { data: studentsInClass, error: studErr } = await supabase
        .from("students")
        .select("id, full_name, nis, class_id")
        .eq("class_id", classId)
        .eq("is_active", true)
        .order("full_name", { ascending: true });
      if (studErr) throw studErr;

      const ids = (studentsInClass || []).map((s) => s.id);
      let billsByStudent = new Map();
      if (ids.length > 0) {
        const { data: allBills, error: billsErr } = await supabase
          .from("other_fee_bills")
          .select("student_id, item_name, amount, status, other_fee_payments(amount_paid)")
          .eq("fee_type", feeType)
          .in("student_id", ids);
        if (billsErr) throw billsErr;
        billsByStudent = (allBills || []).reduce((map, b) => {
          if (!map.has(b.student_id)) map.set(b.student_id, []);
          map.get(b.student_id).push(b);
          return map;
        }, new Map());
      }

      const result = (studentsInClass || []).map((s) => {
        const items = mergeStudentItems(itemsForYear, billsByStudent.get(s.id) || []);
        const remaining = items.reduce((sum, it) => sum + it.remaining, 0);
        return { ...s, items, status: combinedStatus(items), remaining };
      });

      setAllRows(result);
    } catch (err) {
      console.error("Error fetching rekap:", err);
      setAllRows([]);
    } finally {
      setLoading(false);
    }
  }, [classId, feeType, itemsForYear]);

  useEffect(() => {
    fetchRekap();
  }, [fetchRekap]);

  const rows = useMemo(() => {
    if (statusFilter === "lunas") return allRows.filter((r) => r.status === "paid");
    if (statusFilter === "belum") return allRows.filter((r) => r.status !== "paid");
    return allRows;
  }, [allRows, statusFilter]);

  const totalTunggakanKelas = allRows.reduce((sum, r) => sum + r.remaining, 0);
  const jumlahLunas = allRows.filter((r) => r.status === "paid").length;

  return (
    <div className="space-y-6">
      <div
        className={`rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-end gap-4 shadow-sm ${
          darkMode ? "bg-gray-800/60 border-gray-700" : "bg-gray-50 border-gray-200"
        }`}
      >
        <div className="sm:w-56">
          <Field label="Pilih Kelas" darkMode={darkMode}>
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
        </div>
        {classId && itemsForYear && (
          <div className="flex flex-wrap items-center gap-2.5">
            <div
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold ${darkMode ? "bg-emerald-900/20 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`}
            >
              {jumlahLunas} dari {allRows.length} siswa lunas
            </div>
            <div
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold ${darkMode ? "bg-red-900/20 text-red-300" : "bg-red-50 text-red-700"}`}
            >
              Total tunggakan: {formatRupiah(totalTunggakanKelas)}
            </div>
          </div>
        )}
      </div>

      {classId && !itemsForYear && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 flex items-center gap-3">
          <AlertTriangle size={16} className="shrink-0" />
          Belum ada rincian item buat Tahun Ajaran {academicYear}. Atur dulu di tab "Item &
          Nominal".
        </div>
      )}

      {classId && itemsForYear && (
        <div className="flex items-center gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === f.id
                  ? "bg-emerald-600 text-white"
                  : darkMode
                    ? "bg-gray-800 text-gray-400 hover:text-gray-200"
                    : "bg-gray-100 text-gray-500 hover:text-gray-800"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <p className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
          Klik baris siswa buat langsung catat pembayarannya.
        </p>
      )}

      <div
        className={`rounded-2xl border overflow-x-auto shadow-sm ${darkMode ? "border-gray-700" : "border-gray-200"}`}
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
              <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap">
                Nama Siswa
              </th>
              {(itemsForYear?.items || []).map((it) => (
                <th
                  key={it.name}
                  className="px-3 py-3 text-center text-xs font-semibold tracking-wide whitespace-nowrap"
                >
                  {it.name}
                </th>
              ))}
              <th className="px-5 py-3 text-right text-xs font-semibold tracking-wide whitespace-nowrap">
                Sisa Tagihan
              </th>
              <th className="px-5 py-3 text-center text-xs font-semibold tracking-wide whitespace-nowrap">
                Status
              </th>
            </tr>
          </thead>
          <tbody className={`divide-y ${darkMode ? "divide-gray-800" : "divide-gray-100"}`}>
            {loading ? (
              <EmptyRow darkMode={darkMode}>Memuat...</EmptyRow>
            ) : !classId ? (
              <EmptyRow darkMode={darkMode}>Pilih kelas dulu.</EmptyRow>
            ) : rows.length === 0 ? (
              <EmptyRow darkMode={darkMode}>
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  {statusFilter === "lunas"
                    ? "Belum ada yang lunas."
                    : statusFilter === "belum"
                      ? "Gak ada tunggakan."
                      : "Belum ada siswa aktif di kelas ini."}
                </span>
              </EmptyRow>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => onPilihSiswa?.(r.id, r.class_id)}
                  className={`cursor-pointer transition-colors ${
                    darkMode
                      ? "text-gray-200 hover:bg-gray-800/50"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <td className="px-5 py-3 font-medium whitespace-nowrap">
                    {r.full_name}
                    <span
                      className={`block font-mono text-[11px] font-normal ${darkMode ? "text-gray-500" : "text-gray-400"}`}
                    >
                      {r.nis}
                    </span>
                  </td>
                  {r.items.map((it) => (
                    <td key={it.item_name} className="px-3 py-3 text-center">
                      <StatusBadge status={it.status} />
                    </td>
                  ))}
                  <td className="px-5 py-3 text-right font-medium whitespace-nowrap">
                    {r.remaining > 0 ? formatRupiah(r.remaining) : "-"}
                  </td>
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
// 4. Riwayat -- log semua pembayaran (per item) -- gak berubah dari
//    versi sebelumnya, tetep baca dari other_fee_payments.
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
