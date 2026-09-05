// [file name]: components/ui/Card.js
import React from "react";

// ⭐ Wadah standar untuk semua "kotak konten" di dalam halaman (form, tabel,
// widget statistik, dll). Style-nya diambil dari pola yang sudah dipakai
// berulang kali di Layout.js (bg-white/bg-gray-800, border, rounded-xl,
// shadow-sm) -- disatukan di sini biar gak ditulis ulang beda-beda tiap page.
//
// Pemakaian:
//   <Card darkMode={darkMode}>
//     <SectionTitle darkMode={darkMode}>Judul</SectionTitle>
//     ...
//   </Card>
//
// Kalau butuh card tanpa padding (misal buat tabel full-width yang mau
// nempel ke tepi card), pakai prop `noPadding`.

const Card = ({ children, darkMode, className = "", noPadding = false }) => {
  return (
    <div
      className={`rounded-xl shadow-sm border transition-colors ${noPadding ? "" : "p-4 sm:p-6"} ${
        darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-blue-100"
      } ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
