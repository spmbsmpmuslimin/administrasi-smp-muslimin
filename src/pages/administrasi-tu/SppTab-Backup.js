// [file name]: pages/administrasi-tu/SppTab.js
// Sub-tab "SPP" di dalem KeuanganTab.js (salah satu dari 3 tab utama:
// SPP / Uang Awal Tahun / Uang Akhir Tahun -- lihat KeuanganTab.js).
//
// REVISI: SPP di sekolah ini dibayar fleksibel, gak ada jatuh tempo,
// dan siswa sering telat sampe lintas tahun ajaran (mis. udah kelas 9
// tapi masih ada bulan nunggak dari kelas 7). Jadi tab "Tagihan"
// (generate massal per kelas+bulan) DIHAPUS -- diganti sama alur baru
// yang lebih deket ke cara TU kerja sehari-hari:
//
// 1. Catat Pembayaran -> pilih Jenjang -> Kelas -> Nama Siswa. Begitu
//    siswa kepilih, semua bulan dalam TA yang siswa itu udah/lagi jalanin
//    dihitung otomatis dari tanggal masuknya (dibaca dari pola NIS
//    "yy.yy.07.xxx", lihat generateNISForGrade7 di BulkImportModals.js).
//    Beda dari versi lama: TA yang LAGI JALAN digenerate PENUH 12 bulan
//    (bukan cuma sampe bulan berjalan) -- biar TU bisa centang & catat
//    pembayaran di muka buat siswa yang bayar per semester (6 bulan)
//    atau per tahun (12 bulan) sekaligus. Bulan yang belom lewat
//    tanggalnya ditandain `isDue: false` -- tetep bisa dicentang/dibayar,
//    tapi TIDAK dihitung ke badge "Tertunggak" (baru "belum dibayar",
//    bukan "nunggak", karena bulannya emang belom kejalan).
//    Row spp_bills BARU dibikin on-the-fly pas TU centang & simpen
//    bulan itu (lazy insert), bukan disiapin duluan.
// 2. Tunggakan  -> rekap per kelas, dihitung dengan cara yang sama, TAPI
//    cuma bulan yang `isDue` (beneran udah lewat tanggalnya) yang
//    dihitung -- bulan yang masih di depan gak ikut nge-boost angka
//    tunggakan kelas.
// 3. Riwayat    -> log semua pembayaran yang udah masuk (gak berubah).
//
// Nominal SPP diambil dari school_settings, key `spp_nominal_per_ta`,
// JSON per tahun ajaran (mis. {"2026/2027": 12500}) -- biar kalau
// nominal naik tahun depan, bulan-bulan tahun lalu yang udah kejadian
// tetep kepake nominal lama.
//
// status di spp_bills dihitung OTOMATIS lewat trigger DB dari total
// spp_payments -- komponen ini TIDAK PERNAH update kolom status
// manual, cukup insert ke spp_payments.
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../supabaseClient";
import {
  CreditCard,
  Search,
  AlertTriangle,
  History,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  CheckCircle2,
  Circle,
  BadgeCheck,
  Calendar,
  StickyNote,
  Clock,
  Loader2,
  Trash2,
  Printer,
  FileSpreadsheet,
} from "lucide-react";
import { MONTH_NAMES, formatRupiah, Field, inputClass, EmptyRow } from "./keuanganShared";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { useConfirmDialog } from "../../components/ui/useConfirmDialog";
import { exportKartuPembayaranSPP } from "./sppPdfExport";
import { exportRekapTunggakanKelas } from "./sppExcelExport";

// ---- NIS grade-7 entrants: "yy.yy.07.xxx" -> tahun masuk ----
// Siswa dengan NIS yang gak match pola ini (pindahan/data legacy)
// dianggap gak bisa dihitung otomatis -> ditandai null biar TU tau
// harus dicek manual, bukan diam-diam dianggap lunas.
function parseEntryStartYear(nis) {
  const m = nis?.match(/^(\d{2})\.(\d{2})\.07\./);
  if (!m) return null;
  return 2000 + parseInt(m[1], 10);
}

const academicYearLabel = (startYear) => `${startYear}/${startYear + 1}`;

// ---- Generate semua periode (bulan+tahun) dari masuk s/d akhir TA yang
// lagi jalan sekarang (BUKAN cuma sampe bulan berjalan) -- biar TU bisa
// centang bulan-bulan yang belom lewat juga buat kasus bayar di muka
// per semester/tahun. `isDue` nandain mana yang beneran udah lewat
// tanggalnya (dipake buat itung "Tertunggak"); yang isDue-nya false
// tetep bisa dicentang & dibayar, cuma gak dihitung sebagai nunggak. ----
function generateExpectedPeriods(entryStartYear) {
  const now = new Date();
  const monthsOrder = [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6];
  const periods = [];
  let taStart = entryStartYear;
  let gradeOffset = 0;

  while (true) {
    const taStartDate = new Date(taStart, 6, 1); // 1 Juli taStart -- awal TA ini
    if (taStartDate > now) break; // TA ini belom mulai sama sekali -> stop di sini

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

const getJenjangOptions = (classes) =>
  Array.from(new Set(classes.map((c) => c.grade))).sort((a, b) => a - b);

const getKelasByJenjang = (classes, jenjang) =>
  jenjang ? classes.filter((c) => String(c.grade) === String(jenjang)) : classes;

// Tiap sub-tab dikasih warna aksen sendiri (bukan hijau semua) biar TU
// gampang bedain lagi di tab mana, dan hijau (emerald) tetep KHUSUS
// buat arti "Lunas" di dalem konten -- gak dipake buat identitas tab.
const SUB_TABS = [
  { id: "pembayaran", label: "Catat Pembayaran", icon: CreditCard, activeClass: "bg-blue-600" },
  { id: "tunggakan", label: "Tunggakan", icon: AlertTriangle, activeClass: "bg-amber-600" },
  { id: "riwayat", label: "Riwayat", icon: History, activeClass: "bg-indigo-600" },
];

const SppTab = ({ classes = [], darkMode, user, onShowToast }) => {
  const [subTab, setSubTab] = useState("pembayaran");
  const [nominalPerTA, setNominalPerTA] = useState({});
  const [settingsLoading, setSettingsLoading] = useState(true);
  // Dipake buat nyambungin klik nama siswa di tab Tunggakan -> langsung
  // lompat ke tab Catat Pembayaran dengan Jenjang/Kelas/Nama Siswa udah
  // ke-isi otomatis. PembayaranPanel yang nge-apply preset ini begitu
  // data siswanya kefetch, terus panggil onPresetApplied buat nge-clear
  // biar gak ke-apply ulang pas TU ganti-ganti pilihan sendiri.
  const [pembayaranPreset, setPembayaranPreset] = useState(null);

  const goToPembayaran = useCallback((preset) => {
    setPembayaranPreset(preset);
    setSubTab("pembayaran");
  }, []);

  useEffect(() => {
    const fetchNominal = async () => {
      setSettingsLoading(true);
      const { data, error } = await supabase
        .from("school_settings")
        .select("setting_value")
        .eq("setting_key", "spp_nominal_per_ta")
        .maybeSingle();
      if (error) {
        console.error("Error fetching spp_nominal_per_ta:", error);
      } else if (data?.setting_value) {
        try {
          setNominalPerTA(JSON.parse(data.setting_value));
        } catch (e) {
          console.error("spp_nominal_per_ta bukan JSON valid:", e);
        }
      }
      setSettingsLoading(false);
    };
    fetchNominal();
  }, []);

  const notify = useCallback(
    (msg, type = "success") => {
      if (onShowToast) onShowToast(msg, type);
    },
    [onShowToast]
  );

  const tabBtnClass = (id) => {
    const meta = SUB_TABS.find((t) => t.id === id);
    return `flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-500/50 ${
      subTab === id
        ? `${meta.activeClass} text-white shadow-md`
        : darkMode
          ? "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
          : "text-gray-500 hover:bg-white hover:text-gray-800 hover:shadow-sm"
    }`;
  };

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
          Memuat pengaturan SPP...
        </div>
      ) : (
        <>
          {subTab === "pembayaran" && (
            <PembayaranPanel
              classes={classes}
              darkMode={darkMode}
              user={user}
              notify={notify}
              nominalPerTA={nominalPerTA}
              preset={pembayaranPreset}
              onPresetApplied={() => setPembayaranPreset(null)}
            />
          )}
          {subTab === "tunggakan" && (
            <TunggakanPanel
              classes={classes}
              darkMode={darkMode}
              nominalPerTA={nominalPerTA}
              notify={notify}
              onPilihSiswa={(row, classId) => {
                const cls = classes.find((c) => c.id === classId);
                goToPembayaran({
                  jenjang: cls?.grade != null ? String(cls.grade) : "",
                  classId,
                  studentId: row.id,
                });
              }}
            />
          )}
          {subTab === "riwayat" && (
            <RiwayatPanel classes={classes} darkMode={darkMode} notify={notify} />
          )}
        </>
      )}
    </div>
  );
};

// ============================================================
// 1. Catat Pembayaran -- Jenjang -> Kelas -> Nama Siswa -> rincian
// ============================================================
const PembayaranPanel = ({
  classes,
  darkMode,
  user,
  notify,
  nominalPerTA,
  preset,
  onPresetApplied,
}) => {
  const [jenjang, setJenjang] = useState("");
  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [bills, setBills] = useState([]);
  const [loadingBills, setLoadingBills] = useState(false);
  const [openTA, setOpenTA] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const student = students.find((s) => s.id === studentId) || null;

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

  const fetchBills = useCallback(async (sid) => {
    setLoadingBills(true);
    // spp_payments(payment_date) di-join sekalian -- dipakein di kolom
    // "Tgl Bayar" pas cetak Kartu Pembayaran SPP (kalau ada cicilan >1x
    // buat 1 bulan yang sama, dipilih tanggal PALING BARU).
    const { data, error } = await supabase
      .from("spp_bills")
      .select("id, period_month, period_year, amount, status, spp_payments(payment_date)")
      .eq("student_id", sid);
    if (error) {
      console.error("Error fetching spp_bills:", error);
      setBills([]);
    } else {
      setBills(data || []);
    }
    setLoadingBills(false);
  }, []);

  const pickStudent = (id) => {
    setStudentId(id);
    setSelected(new Set());
    setOpenTA(null);
    if (id) fetchBills(id);
  };

  // Langkah 1 dari preset (dateng dari klik nama di tab Tunggakan):
  // isi Jenjang & Kelas duluan -- ini bakal mancing fetch daftar siswa
  // kelas itu lewat effect di atas.
  useEffect(() => {
    if (!preset) return;
    if (preset.jenjang) setJenjang(preset.jenjang);
    if (preset.classId) setClassId(preset.classId);
  }, [preset]);

  // Langkah 2: begitu classId di state udah nyusul preset.classId DAN
  // daftar siswa kelas itu udah kefetch (jadi studentId-nya beneran
  // valid buat dipilih), baru siswanya di-pickStudent. Preset di-clear
  // (via onPresetApplied) abis dipake, biar gak ke-apply ulang lagi
  // kalau TU ganti-ganti Jenjang/Kelas manual sesudahnya.
  useEffect(() => {
    if (!preset?.studentId) return;
    if (classId !== preset.classId) return;
    if (!students.some((s) => s.id === preset.studentId)) return;
    pickStudent(preset.studentId);
    onPresetApplied?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, classId, students]);

  const periods = useMemo(() => {
    if (!student) return [];
    const entryYear = parseEntryStartYear(student.nis);
    if (entryYear == null) return null; // NIS gak match pola -- perlu dicek manual
    const billMap = new Map(bills.map((b) => [`${b.period_year}-${b.period_month}`, b]));
    return generateExpectedPeriods(entryYear).map((p) => {
      const existing = billMap.get(p.key);
      const paymentDates = (existing?.spp_payments || [])
        .map((pay) => pay.payment_date)
        .filter(Boolean)
        .sort();
      const lastPaidDate = paymentDates.length > 0 ? paymentDates[paymentDates.length - 1] : null;
      return {
        ...p,
        billId: existing?.id || null,
        amount: existing?.amount ?? nominalPerTA[p.ta] ?? 0,
        status: existing?.status || "unpaid",
        lastPaidDate,
      };
    });
  }, [student, bills, nominalPerTA]);

  // default: buka grup TA yang paling baru
  useEffect(() => {
    if (periods && periods.length > 0) {
      setOpenTA(periods[periods.length - 1].ta);
    }
  }, [periods]);

  const groupedByTA = useMemo(() => {
    if (!periods) return {};
    const groups = {};
    for (const p of periods) {
      if (!groups[p.ta]) groups[p.ta] = { grade: p.grade, items: [] };
      groups[p.ta].items.push(p);
    }
    return groups;
  }, [periods]);

  // Badge "Tertunggak" cuma ngitung bulan yang beneran udah lewat
  // tanggalnya (isDue) -- bulan yang masih di depan (buka buat bayar di
  // muka) gak ikut nge-boost angka ini, walaupun tetep muncul & bisa
  // dicentang di grid bulan di bawah.
  const duePeriods = (periods || []).filter((p) => p.isDue);
  const totalBulan = duePeriods.length;
  const belumBayarList = duePeriods.filter((p) => p.status !== "paid");
  const totalBelumBayar = belumBayarList.length;
  const totalTunggakan = belumBayarList.reduce((sum, p) => sum + p.amount, 0);

  // `periods` udah keurut kronologis (TA lama -> baru, Juli -> Juni per
  // TA), jadi paidPeriods terakhir = bulan paling depan yang udah kebayar.
  // Dipake buat nunjukin "bayar di muka" di badge kalau siswa bayar lebih
  // maju dari bulan yang beneran udah jatuh tempo.
  const paidPeriods = (periods || []).filter((p) => p.status === "paid");
  const totalPaidBulan = paidPeriods.length;
  const lastPaidPeriod = paidPeriods[paidPeriods.length - 1] || null;
  const bulanDiMuka = Math.max(0, totalPaidBulan - (totalBulan - totalBelumBayar));

  const selectedPeriods = (periods || []).filter((p) => selected.has(p.key));
  const totalDipilih = selectedPeriods.reduce((sum, p) => sum + p.amount, 0);

  const toggleMonth = (key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // "Pilih Semua" nyentang SEMUA bulan yang belum lunas (termasuk yang
  // belum jatuh tempo/bayar di muka) di SEMUA TA, gak cuma yang lagi
  // dibuka accordion-nya -- biar TU tinggal 1 klik pas siswa mau
  // ngelunasin semua tunggakannya sekaligus.
  const selectAllUnpaid = () => {
    const unpaidKeys = (periods || []).filter((p) => p.status !== "paid").map((p) => p.key);
    setSelected(new Set(unpaidKeys));
  };

  const clearSelection = () => setSelected(new Set());
  const anyUnpaid = (periods || []).some((p) => p.status !== "paid");

  const SEMESTERS = [
    { label: "Semester 1 (Juli - Desember)" },
    { label: "Semester 2 (Januari - Juni)" },
  ];

  // 1 grup TA (12 bulan, urutan Juli...Juni dari generateExpectedPeriods)
  // dipecah jadi 2: 6 bulan pertama = semester 1, 6 sisanya = semester 2.
  const splitBySemester = (items) => [items.slice(0, 6), items.slice(6, 12)];

  const renderMonthButton = (p) => {
    const isPaid = p.status === "paid";
    const isPartial = p.status === "partial";
    const isChecked = selected.has(p.key);
    const isAdvance = !isPaid && !p.isDue;
    return (
      <button
        key={p.key}
        disabled={isPaid}
        onClick={() => toggleMonth(p.key)}
        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm border text-left transition-colors duration-150 ${
          isPaid
            ? darkMode
              ? "bg-emerald-900/20 border-emerald-900/40 text-emerald-300 cursor-default"
              : "bg-emerald-50 border-emerald-100 text-emerald-700 cursor-default"
            : isChecked
              ? "bg-blue-600 border-blue-600 text-white shadow-sm"
              : isPartial
                ? darkMode
                  ? "bg-amber-900/20 border-amber-900/40 text-amber-300"
                  : "bg-amber-50 border-amber-200 text-amber-700"
                : isAdvance
                  ? darkMode
                    ? "bg-gray-800/60 border-gray-700 border-dashed text-gray-400 hover:border-blue-700"
                    : "bg-gray-50 border-gray-200 border-dashed text-gray-500 hover:border-blue-300"
                  : darkMode
                    ? "bg-gray-800 border-gray-700 text-gray-200 hover:border-blue-700"
                    : "bg-white border-gray-200 text-gray-700 hover:border-blue-300"
        }`}
      >
        {isPaid || isChecked ? (
          <CheckCircle2 size={15} />
        ) : (
          <Circle size={15} className="text-gray-300" />
        )}
        <span className="flex flex-col">
          <span>{MONTH_NAMES[p.month - 1]}</span>
          {isPartial && !isChecked && <span className="text-[11px]">Cicilan</span>}
          {isAdvance && !isChecked && <span className="text-[11px]">Bayar di muka</span>}
        </span>
      </button>
    );
  };

  const handleCetakKartu = () => {
    exportKartuPembayaranSPP({
      student,
      groupedByTA,
      totalTunggakan,
      totalPaidBulan,
      lastPaidLabel: lastPaidPeriod
        ? `${MONTH_NAMES[lastPaidPeriod.month - 1]} ${lastPaidPeriod.year}`
        : null,
      showToast: notify,
    });
  };

  const handleSave = async () => {
    if (selectedPeriods.length === 0) return;
    setSaving(true);
    try {
      // 1x "Catat Pembayaran" = 1 nomor kuitansi, dipake bareng di semua
      // baris spp_payments yang disimpen dalam transaksi ini -- jadi
      // receipt_number juga sekalian jadi ID buat ngelompokin (gak perlu
      // kolom group ID terpisah, tinggal query WHERE receipt_number = ...).
      const { data: receiptNumber, error: receiptErr } = await supabase.rpc(
        "generate_spp_receipt_number"
      );
      if (receiptErr) throw receiptErr;

      for (const p of selectedPeriods) {
        let billId = p.billId;
        if (!billId) {
          const { data: newBill, error: billErr } = await supabase
            .from("spp_bills")
            .insert({
              student_id: student.id,
              class_id: student.class_id,
              period_month: p.month,
              period_year: p.year,
              amount: p.amount,
              created_by: user?.id || null,
            })
            .select("id")
            .single();
          if (billErr) throw billErr;
          billId = newBill.id;
        }
        const { error: payErr } = await supabase.from("spp_payments").insert({
          bill_id: billId,
          student_id: student.id,
          amount_paid: p.amount,
          payment_date: paymentDate,
          payment_method: method,
          note: note || null,
          recorded_by: user?.id || null,
          receipt_number: receiptNumber,
        });
        if (payErr) throw payErr;
      }
      notify(
        `Pembayaran ${selectedPeriods.length} bulan berhasil dicatat (Kuitansi ${receiptNumber})`,
        "success"
      );
      setSelected(new Set());
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
        className={`rounded-2xl border p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 shadow-sm ${
          darkMode ? "bg-gray-800/60 border-gray-700" : "bg-gray-50 border-gray-200"
        }`}
      >
        <Field label="Jenjang" darkMode={darkMode}>
          <select
            value={jenjang}
            onChange={(e) => {
              setJenjang(e.target.value);
              setClassId("");
              pickStudent("");
            }}
            className={inputClass(darkMode)}
          >
            <option value="">Pilih jenjang</option>
            {getJenjangOptions(classes).map((g) => (
              <option key={g} value={g}>
                Kelas {g}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Kelas" darkMode={darkMode}>
          <select
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              pickStudent("");
            }}
            className={inputClass(darkMode)}
            disabled={!jenjang}
          >
            <option value="">Pilih kelas</option>
            {getKelasByJenjang(classes, jenjang).map((c) => (
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
          Pilih jenjang → kelas → nama siswa buat lihat tagihan SPP-nya.
        </div>
      )}

      {student && loadingBills && (
        <div
          className={`text-sm flex items-center gap-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
        >
          <Loader2 size={14} className="animate-spin" /> Memuat riwayat tagihan...
        </div>
      )}

      {student && !loadingBills && periods === null && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 flex items-center gap-3">
          <AlertTriangle size={16} className="shrink-0" />
          NIS siswa ini ({student.nis}) gak sesuai pola standar kelas 7, jadi gak bisa dihitung
          otomatis. Perlu dicek manual bre.
        </div>
      )}

      {student && !loadingBills && periods && (
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
                NIS {student.nis} · Kelas {student.class_id}
              </p>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <div
                className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 ${
                  totalBelumBayar > 0
                    ? darkMode
                      ? "bg-red-900/20 text-red-300"
                      : "bg-red-50 text-red-700"
                    : darkMode
                      ? "bg-emerald-900/20 text-emerald-300"
                      : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {totalBelumBayar > 0 ? <AlertTriangle size={15} /> : <BadgeCheck size={15} />}
                {totalBelumBayar > 0
                  ? `Tertunggak ${formatRupiah(totalTunggakan)} (${totalBelumBayar} dari ${totalBulan} bulan)`
                  : bulanDiMuka > 0
                    ? `Lunas s/d sekarang + ${bulanDiMuka} bulan di muka (s/d ${MONTH_NAMES[lastPaidPeriod.month - 1]} ${lastPaidPeriod.year})`
                    : `Lunas semua (${totalBulan} bulan)`}
              </div>
              <button
                onClick={handleCetakKartu}
                title="Cetak Kartu Pembayaran SPP (PDF)"
                className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 border transition-colors active:scale-[0.98] ${
                  darkMode
                    ? "border-gray-700 text-gray-200 hover:bg-gray-800"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Printer size={15} />
                Cetak Kartu
              </button>
            </div>
          </div>

          <div
            className={`px-5 py-3 border-b flex items-center justify-between gap-3 ${
              darkMode ? "bg-gray-800/40 border-gray-700" : "bg-gray-50/60 border-gray-100"
            }`}
          >
            <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              {selected.size > 0
                ? `${selected.size} bulan dipilih`
                : "Centang bulan yang mau dicatat pembayarannya"}
            </span>
            <div className="flex items-center gap-4">
              <button
                onClick={selectAllUnpaid}
                disabled={!anyUnpaid}
                className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50 disabled:no-underline"
              >
                Pilih Semua
              </button>
              <button
                onClick={clearSelection}
                disabled={selected.size === 0}
                className={`text-xs font-semibold hover:underline disabled:opacity-50 disabled:no-underline ${
                  darkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Batal
              </button>
            </div>
          </div>

          <div className={`divide-y ${darkMode ? "divide-gray-800" : "divide-gray-100"}`}>
            {Object.entries(groupedByTA).map(([ta, group]) => {
              const nunggak = group.items.filter((p) => p.status !== "paid" && p.isDue).length;
              const diMuka = group.items.filter((p) => p.status !== "paid" && !p.isDue).length;
              const isOpen = openTA === ta;
              return (
                <div key={ta}>
                  <button
                    onClick={() => setOpenTA(isOpen ? null : ta)}
                    className={`w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors ${
                      darkMode ? "hover:bg-gray-800/60" : "hover:bg-gray-50"
                    }`}
                  >
                    <span
                      className={`text-sm font-semibold ${darkMode ? "text-gray-200" : "text-gray-700"}`}
                    >
                      TA {ta} (Kelas {group.grade})
                    </span>
                    <span className="flex items-center gap-2.5 text-xs">
                      <span
                        className={
                          nunggak > 0 ? "text-red-500 font-medium" : "text-emerald-500 font-medium"
                        }
                      >
                        {nunggak > 0
                          ? `${nunggak}/${group.items.length} nunggak`
                          : "Lunas s/d sekarang"}
                      </span>
                      {diMuka > 0 && (
                        <span className="text-gray-400 font-medium">
                          · {diMuka} blm jatuh tempo
                        </span>
                      )}
                      {isOpen ? (
                        <ChevronUp size={16} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={16} className="text-gray-400" />
                      )}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {splitBySemester(group.items).map((semItems, semIdx) => (
                        <div key={SEMESTERS[semIdx].label}>
                          <p
                            className={`text-xs font-semibold mb-2.5 ${
                              darkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            {SEMESTERS[semIdx].label}
                          </p>
                          <div className="grid grid-cols-2 gap-2.5">
                            {semItems.map((p) => renderMonthButton(p))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {selectedPeriods.length > 0 && (
            <div
              className={`p-5 border-t space-y-4 ${darkMode ? "bg-gray-800/60 border-gray-700" : "bg-gray-50 border-gray-200"}`}
            >
              <p
                className={`text-sm font-semibold ${darkMode ? "text-gray-200" : "text-gray-700"}`}
              >
                {selectedPeriods.length} bulan dipilih × nominal per TA ={" "}
                <span className="text-blue-600 dark:text-blue-400">
                  {formatRupiah(totalDipilih)}
                </span>
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Tanggal bayar" darkMode={darkMode}>
                  <div className="relative">
                    <Calendar
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className={`${inputClass(darkMode)} w-full pl-9`}
                    />
                  </div>
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
                  <div className="relative">
                    <StickyNote
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className={`${inputClass(darkMode)} w-full pl-9`}
                    />
                  </div>
                </Field>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-colors active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
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
// 2. Tunggakan -- rekap per kelas, dihitung dari NIS + spp_bills
// (bukan cuma dari row spp_bills yang udah ada, karena bulan yang
// belum pernah dibayar sama sekali gak punya row)
// ============================================================
const TunggakanPanel = ({ classes, darkMode, nominalPerTA, notify, onPilihSiswa }) => {
  const [classId, setClassId] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchTunggakan = useCallback(async () => {
    if (!classId) {
      setRows([]);
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
          .from("spp_bills")
          .select("student_id, period_month, period_year, status")
          .in("student_id", ids);
        if (billsErr) throw billsErr;
        billsByStudent = (allBills || []).reduce((map, b) => {
          map.set(`${b.student_id}:${b.period_year}-${b.period_month}`, b.status);
          return map;
        }, new Map());
      }

      const result = (studentsInClass || [])
        .map((s) => {
          const entryYear = parseEntryStartYear(s.nis);
          if (entryYear == null)
            return { ...s, unresolved: true, belumBulan: [], totalTunggakan: 0 };
          const periods = generateExpectedPeriods(entryYear).filter((p) => p.isDue);
          const belumBulan = periods.filter((p) => {
            const status = billsByStudent.get(`${s.id}:${p.key}`) || "unpaid";
            return status !== "paid";
          });
          const totalTunggakan = belumBulan.reduce((sum, p) => sum + (nominalPerTA[p.ta] ?? 0), 0);
          return { ...s, unresolved: false, belumBulan, totalTunggakan };
        })
        .filter((s) => s.unresolved || s.belumBulan.length > 0);

      setRows(result);
    } catch (err) {
      console.error("Error fetching tunggakan:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [classId, nominalPerTA]);

  useEffect(() => {
    fetchTunggakan();
  }, [fetchTunggakan]);

  const totalTunggakanKelas = rows.reduce((sum, r) => sum + (r.totalTunggakan || 0), 0);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await exportRekapTunggakanKelas({ classId, rows, showToast: notify });
    } catch (err) {
      console.error("Error exporting rekap tunggakan:", err);
      notify?.("Gagal export Excel", "error");
    } finally {
      setExporting(false);
    }
  };

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
        {classId && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <div
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold ${darkMode ? "bg-red-900/20 text-red-300" : "bg-red-50 text-red-700"}`}
            >
              Total tunggakan kelas: {formatRupiah(totalTunggakanKelas)} ({rows.length} siswa)
            </div>
            <button
              onClick={handleExportExcel}
              disabled={exporting || rows.length === 0}
              title="Export Rekap Tunggakan Kelas (Excel)"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition-colors active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
            >
              {exporting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <FileSpreadsheet size={15} />
              )}
              Export Excel
            </button>
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <p className={`text-xs -mt-2 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
          Klik nama siswa buat langsung catat pembayarannya.
        </p>
      )}

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
              <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide">
                Bulan Belum Bayar
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold tracking-wide">
                Total Tunggakan
              </th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className={`divide-y ${darkMode ? "divide-gray-800" : "divide-gray-100"}`}>
            {!classId ? (
              <EmptyRow darkMode={darkMode}>Pilih kelas dulu buat lihat tunggakan.</EmptyRow>
            ) : loading ? (
              <EmptyRow darkMode={darkMode}>Memuat...</EmptyRow>
            ) : rows.length === 0 ? (
              <EmptyRow darkMode={darkMode}>
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" /> Semua siswa di kelas ini
                  lunas.
                </span>
              </EmptyRow>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => onPilihSiswa?.(r, classId)}
                  title="Klik buat langsung catat pembayaran siswa ini"
                  className={`group cursor-pointer transition-colors ${
                    darkMode
                      ? "text-gray-200 hover:bg-gray-800/70"
                      : "text-gray-700 hover:bg-amber-50/70"
                  }`}
                >
                  <td className="px-5 py-3.5 font-mono text-xs">{r.nis}</td>
                  <td className="px-5 py-3.5 font-medium">{r.full_name}</td>
                  <td
                    className={`px-5 py-3.5 text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    {r.unresolved
                      ? "NIS gak sesuai pola, cek manual"
                      : `${r.belumBulan.length} bulan (${r.belumBulan
                          .slice(0, 3)
                          .map((p) => `${MONTH_NAMES[p.month - 1].slice(0, 3)} ${p.year}`)
                          .join(", ")}${r.belumBulan.length > 3 ? ", ..." : ""})`}
                  </td>
                  <td className="px-5 py-3.5 text-right font-medium">
                    {formatRupiah(r.totalTunggakan)}
                  </td>
                  <td className="pr-4">
                    <ChevronRight
                      size={16}
                      className={`transition-transform group-hover:translate-x-0.5 ${
                        darkMode ? "text-gray-600" : "text-gray-300"
                      }`}
                    />
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
// 3. Riwayat -- log semua pembayaran (gak berubah dari versi lama)
// ============================================================
const RiwayatPanel = ({ classes, darkMode, notify }) => {
  const [jenjang, setJenjang] = useState("");
  const [classId, setClassId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rawRows, setRawRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const { confirm, confirmDialogProps } = useConfirmDialog();

  // Query ke Supabase cuma difilter tanggal (data yang lain, ~200 baris
  // terakhir, ditarik semua). Filter Jenjang / Kelas / Nama-NIS
  // dikerjain di client (useMemo di bawah) -- lebih responsif buat TU
  // yang lagi ngetik-ngetik di kolom cari, gak perlu nge-fetch ulang.
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
      setRawRows([]);
    } else {
      setRawRows(data || []);
    }
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    fetchRiwayat();
  }, [fetchRiwayat]);

  // Kelas ikut jenjang -- ganti Jenjang, kelas yang kepilih sebelumnya
  // (mungkin dari jenjang lain) direset biar gak nyangkut.
  useEffect(() => {
    setClassId("");
  }, [jenjang]);

  const rows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return rawRows.filter((r) => {
      if (classId) {
        if (r.students?.class_id !== classId) return false;
      } else if (jenjang) {
        const cls = classes.find((c) => c.id === r.students?.class_id);
        if (String(cls?.grade) !== String(jenjang)) return false;
      }
      if (term) {
        const name = (r.students?.full_name || "").toLowerCase();
        const nis = (r.students?.nis || "").toLowerCase();
        if (!name.includes(term) && !nis.includes(term)) return false;
      }
      return true;
    });
  }, [rawRows, classId, jenjang, classes, searchTerm]);

  const METHOD_LABEL = { cash: "Tunai", transfer: "Transfer", other: "Lainnya" };

  const handleDelete = async (row) => {
    const periodLabel = row.spp_bills
      ? `${MONTH_NAMES[row.spp_bills.period_month - 1]} ${row.spp_bills.period_year}`
      : "bulan ini";
    const ok = await confirm({
      title: "Hapus Pembayaran",
      message: `Yakin hapus pembayaran ${row.students?.full_name} untuk ${periodLabel}?\n\nBulan ini bakal otomatis balik jadi "Belum Bayar" lagi.`,
      variant: "danger",
      confirmText: "Ya, Hapus",
    });
    if (!ok) return;

    setDeletingId(row.id);
    const { error } = await supabase.from("spp_payments").delete().eq("id", row.id);
    setDeletingId(null);

    if (error) {
      console.error("Error deleting payment:", error);
      notify?.("Gagal menghapus pembayaran", "error");
      return;
    }
    notify?.("Pembayaran dihapus, status bulan itu balik jadi belum lunas", "success");
    setRawRows((prev) => prev.filter((r) => r.id !== row.id));
  };

  return (
    <>
      <div className="space-y-6">
        <div
          className={`rounded-2xl border p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 shadow-sm ${
            darkMode ? "bg-gray-800/60 border-gray-700" : "bg-gray-50 border-gray-200"
          }`}
        >
          <Field label="Pilih Jenjang" darkMode={darkMode}>
            <select
              value={jenjang}
              onChange={(e) => setJenjang(e.target.value)}
              className={inputClass(darkMode)}
            >
              <option value="">Semua jenjang</option>
              {getJenjangOptions(classes).map((g) => (
                <option key={g} value={g}>
                  Kelas {g}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Pilih Kelas" darkMode={darkMode}>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className={inputClass(darkMode)}
            >
              <option value="">Semua kelas</option>
              {getKelasByJenjang(classes, jenjang).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Pilih Nama Siswa" darkMode={darkMode}>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari Nama / NIS"
                className={`${inputClass(darkMode)} w-full pl-9`}
              />
            </div>
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
                  Periode SPP
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold tracking-wide">
                  Nominal
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide">Metode</th>
                <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide">Catatan</th>
                <th className="px-5 py-3 text-center text-xs font-semibold tracking-wide">Aksi</th>
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
                        {new Date(r.payment_date).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium">{r.students?.full_name}</td>
                    <td className="px-5 py-3">{r.students?.class_id}</td>
                    <td className="px-5 py-3">
                      {r.spp_bills
                        ? `${MONTH_NAMES[r.spp_bills.period_month - 1]} ${r.spp_bills.period_year}`
                        : "-"}
                    </td>
                    <td className="px-5 py-3 text-right font-medium">
                      {formatRupiah(r.amount_paid)}
                    </td>
                    <td className="px-5 py-3">
                      {METHOD_LABEL[r.payment_method] || r.payment_method}
                    </td>
                    <td className={`px-5 py-3 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {r.note || "-"}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button
                        onClick={() => handleDelete(r)}
                        disabled={deletingId === r.id}
                        title="Hapus pembayaran ini"
                        className={`p-2 rounded-lg transition-colors active:scale-[0.95] disabled:opacity-50 ${
                          darkMode
                            ? "text-red-400 hover:bg-red-900/20"
                            : "text-red-500 hover:bg-red-50"
                        }`}
                      >
                        {deletingId === r.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog {...confirmDialogProps} />
    </>
  );
};

export default SppTab;
