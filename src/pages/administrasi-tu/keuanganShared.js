// [file name]: pages/administrasi-tu/keuanganShared.js
// Util & komponen kecil yang dipake bareng-bareng sama SppTab.js &
// TagihanLainTab.js (Uang Awal Tahun / Uang Akhir Tahun) di dalem
// Administrasi Keuangan (KeuanganTab.js) -- biar gak duplikat kode
// antar file kayak dulu waktu semuanya masih 1 file KeuanganTab.js.
import React from "react";

export const MONTH_NAMES = [
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

export const STATUS_META = {
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

export const formatRupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

export const Field = ({ label, children, darkMode }) => (
  <div className="flex flex-col gap-1">
    <label className={`text-xs font-semibold ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
      {label}
    </label>
    {children}
  </div>
);

export const inputClass = (darkMode) =>
  `px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
    darkMode
      ? "bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500"
      : "bg-white border-gray-300 text-gray-800"
  }`;

export const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.unpaid;
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${meta.badge}`}>
      {meta.label}
    </span>
  );
};

export const EmptyRow = ({ darkMode, children }) => (
  <tr>
    <td
      colSpan={99}
      className={`py-10 text-center text-sm ${darkMode ? "text-gray-500" : "text-gray-400"}`}
    >
      {children}
    </td>
  </tr>
);
