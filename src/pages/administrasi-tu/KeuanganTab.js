// [file name]: pages/administrasi-tu/KeuanganTab.js
// Card "Administrasi Keuangan" di dalam AdministrasiTU.js (grup Data &
// Sistem > Administrasi TU). Sekarang nampung 3 jenis pembayaran siswa,
// masing-masing jadi tab utama sendiri (bukan digabung kayak dulu waktu
// cuma ada SPP):
// 1. SPP              -> lihat SppTab.js (bulanan, spp_bills/spp_payments)
// 2. Uang Awal Tahun  -> lihat TagihanLainTab.js (sekali bayar, cuma
//    kelas 7A-7F -- buat siswa baru, pembelian atribut dsb)
// 3. Uang Akhir Tahun -> lihat TagihanLainTab.js (sekali bayar, cuma
//    kelas 9A-9F -- buat kelas akhir)
//
// KeuanganTab.js ini sengaja jadi "thin switcher" doang: fetch `classes`
// SEKALI di sini (dipake bareng sama ketiga tab, biar gak fetch
// berkali-kali), terus tinggal oper ke masing-masing tab. Semua logic
// per jenis pembayaran ada di file tab-nya sendiri.
//
// SENGAJA gak nyentuh apapun punya "Bendahara Sekolah" -- modul ini
// cuma ngurus pembayaran siswa (SPP + Awal/Akhir Tahun), bukan keuangan
// sekolah secara umum.
import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { FileText, Sparkles, GraduationCap } from "lucide-react";
import SppTab from "./SppTab";
import TagihanLainTab from "./TagihanLainTab";

const MAIN_TABS = [
  { id: "spp", label: "SPP Bulanan", icon: FileText },
  { id: "awal-tahun", label: "Uang Awal Tahun", icon: Sparkles },
  { id: "akhir-tahun", label: "Uang Akhir Tahun", icon: GraduationCap },
];

const KeuanganTab = (props) => {
  const { darkMode } = props;
  const [mainTab, setMainTab] = useState("spp");
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

  const mainTabBtnClass = (id) =>
    `flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 transition-all duration-200 touch-manipulation active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${
      mainTab === id
        ? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-900/10"
        : darkMode
          ? "text-gray-300 hover:bg-gray-800 hover:text-gray-100"
          : "text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm"
    }`;

  return (
    <div className="p-4 sm:p-5">
      {/* Switcher 3 kategori pembayaran -- dibikin sebagai rail
          segmented-control (bg netral + pill aktif yang "ngambang"
          dengan shadow) biar keliatan jelas ini 1 grup pilihan, bukan
          sekadar deretan tombol lepas. */}
      <div
        className={`flex gap-1.5 overflow-x-auto p-1.5 rounded-2xl mb-6 ${
          darkMode ? "bg-gray-900/50" : "bg-gray-100"
        }`}
      >
        {MAIN_TABS.map((t) => (
          <button key={t.id} onClick={() => setMainTab(t.id)} className={mainTabBtnClass(t.id)}>
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {mainTab === "spp" && <SppTab {...props} classes={classes} />}
      {mainTab === "awal-tahun" && (
        <TagihanLainTab {...props} classes={classes} feeType="awal_tahun" gradeFilter={7} />
      )}
      {mainTab === "akhir-tahun" && (
        <TagihanLainTab {...props} classes={classes} feeType="akhir_tahun" gradeFilter={9} />
      )}
    </div>
  );
};

export default KeuanganTab;
