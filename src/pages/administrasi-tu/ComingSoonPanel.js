// [file name]: pages/administrasi-tu/ComingSoonPanel.js
// Panel "menyusul" generik -- dipake bareng buat:
// 1. Kategori Administrasi TU yang belum digarap (Arsip & Dokumen,
//    Administrasi Keuangan, Inventaris, Laporan Administrasi) -- lihat
//    AdministrasiTU.js.
// 2. Sub-tab Persuratan yang skeleton-nya udah ada tapi isinya (form/
//    tabel data) belum dibikin -- lihat persuratan/PersuratanTab.js.
//
// Sengaja 1 komponen reusable (bukan bikin placeholder terpisah per
// kategori/tab) biar gampang diganti satu-satu jadi komponen asli tanpa
// nyisain banyak file "kosong" yang gak kepake lagi.
import React from "react";

export default function ComingSoonPanel({ title, description }) {
  return (
    <div className="flex items-center justify-center py-16 px-6">
      <div className="max-w-sm w-full text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-slate-400 dark:text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
          {title || "Segera Hadir"}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {description || "Fitur ini masih dalam pengembangan."}
        </p>
      </div>
    </div>
  );
}
