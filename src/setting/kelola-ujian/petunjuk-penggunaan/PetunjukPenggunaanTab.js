// setting/kelola-ujian/PetunjukPenggunaanTab.js
// Sub-fitur "Petunjuk & Penggunaan Aplikasi" -- panduan accordion di app,
// plus tombol unduh versi PDF. Isinya dibaca dari petunjukPenggunaanData.js
// (SUMBER TUNGGAL, dipakai bareng sama petunjukPenggunaanPdf.js) -- kalau
// ada alur sub-fitur yang berubah, cukup edit di file data itu saja dan
// tampilan di sini + PDF-nya otomatis ikut sinkron.

import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronDown,
  DoorOpen,
  CalendarClock,
  IdCard,
  FileBarChart2,
  FileText,
  Wallet,
  Info,
  Download,
  Loader2,
} from "lucide-react";
import { PANDUAN } from "./petunjukPenggunaanData";
import { generatePetunjukPenggunaanPdf } from "./petunjukPenggunaanPdf";

// Map iconName (string, dari data file) -> komponen ikon lucide-react.
// Data file sengaja cuma nyimpen nama string, bukan komponen, biar aman
// diimport juga dari petunjukPenggunaanPdf.js (generator PDF nggak perlu
// render ikon apa-apa).
const ICON_MAP = {
  DoorOpen,
  CalendarClock,
  IdCard,
  FileBarChart2,
  FileText,
  Wallet,
};

const PetunjukPenggunaanTab = ({ showToast, onBack }) => {
  const [terbuka, setTerbuka] = useState(PANDUAN[0].id);
  const [mengunduh, setMengunduh] = useState(false);

  const toggle = (id) => setTerbuka((prev) => (prev === id ? null : id));

  const handleDownloadPdf = () => {
    setMengunduh(true);
    try {
      generatePetunjukPenggunaanPdf({ showToast });
    } catch (err) {
      console.error(err);
      showToast?.("Gagal membuat PDF: " + err.message, "error");
    } finally {
      setMengunduh(false);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4"
      >
        <ChevronLeft size={16} /> Kembali ke Sub-fitur
      </button>

      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
            Petunjuk & Penggunaan Aplikasi
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Panduan langkah demi langkah untuk tiap sub-fitur Manajemen Ujian. Klik judul untuk
            buka/tutup.
          </p>
        </div>
        <button
          onClick={handleDownloadPdf}
          disabled={mengunduh}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-all active:scale-95 disabled:opacity-60 flex-shrink-0"
        >
          {mengunduh ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          Download PDF
        </button>
      </div>

      <div className="flex items-start gap-3 p-4 mb-6 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl">
        <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-indigo-700 dark:text-indigo-400">
          Urutan pengerjaan yang disarankan: <strong>Peserta & Pengawas</strong> lebih
          dulu, baru <strong>Jadwal & Pembagian Ruangan</strong>, <strong>Kartu Ujian</strong>,{" "}
          <strong>Presensi & Berita Acara</strong>, dan <strong>Anggaran & Biaya</strong> bisa
          dikerjakan kapan saja karena tidak bergantung ke data ruangan/jadwal. PDF di atas berisi
          panduan yang sama persis -- cocok buat ditempel atau dibagikan ke panitia yang tidak
          pegang akun admin.
        </p>
      </div>

      <div className="space-y-3">
        {PANDUAN.map((bagian) => {
          const IconComponent = ICON_MAP[bagian.iconName] || FileText;
          const sedangTerbuka = terbuka === bagian.id;

          return (
            <div
              key={bagian.id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
            >
              <button
                onClick={() => toggle(bagian.id)}
                className="w-full flex items-center justify-between gap-3 p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex-shrink-0">
                    <IconComponent className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {bagian.title}
                    </h3>
                    {bagian.belumTersedia && (
                      <span className="inline-block mt-0.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700/50 dark:text-gray-400">
                        Segera hadir
                      </span>
                    )}
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${
                    sedangTerbuka ? "rotate-180" : ""
                  }`}
                />
              </button>

              {sedangTerbuka && (
                <div className="px-4 pb-4">
                  {bagian.langkah.length > 0 && (
                    <ol className="space-y-3 mb-3">
                      {bagian.langkah.map((step, idx) => (
                        <li key={idx} className="flex gap-3">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-semibold flex items-center justify-center mt-0.5">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                              {step.judul}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                              {step.deskripsi}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                  {bagian.catatan && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5">
                      <strong>Catatan:</strong> {bagian.catatan}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PetunjukPenggunaanTab;
