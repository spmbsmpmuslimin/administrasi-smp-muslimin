// [file name]: components/ui/Typography.js
// Kumpulan komponen teks standar (bukan halaman/page) -- tempatnya di folder
// "ui" biar kepisah jelas dari komponen fitur (Dashboard.js, Students.js, dll).
import React from "react";

// ⭐ Standar teks untuk seluruh app. Tujuannya: page mana pun yang butuh judul,
// sub-judul, body text, atau caption, TINGGAL PAKAI komponen ini -- jangan
// nulis class ukuran font manual (text-lg, text-xl, dst) di masing-masing page,
// biar gak ada halaman yang "beda sendiri".
//
// Pola dark mode ikut Layout.js: pakai prop `darkMode` (bukan class Tailwind `dark:`).
//
// Skala ukuran (lihat STYLE_GUIDE.md untuk tabel lengkap):
//   PageTitle    -> judul halaman (1x per halaman)
//   SectionTitle -> judul di dalam Card
//   Text         -> body text / isi form / isi tabel
//   Muted        -> caption, timestamp, helper text
//   Subtitle     -> subtitle biru di bawah PageTitle

// Judul utama halaman (dipakai sekali per halaman, biasanya lewat PageContainer)
export const PageTitle = ({ children, darkMode, className = "" }) => (
  <h1
    className={`text-xl sm:text-2xl font-bold transition-colors ${
      darkMode ? "text-white" : "text-gray-900"
    } ${className}`}
  >
    {children}
  </h1>
);

// Judul section / header di dalam Card
export const SectionTitle = ({ children, darkMode, className = "" }) => (
  <h2
    className={`text-base sm:text-lg font-semibold mb-3 transition-colors ${
      darkMode ? "text-white" : "text-gray-900"
    } ${className}`}
  >
    {children}
  </h2>
);

// Body text standar (paragraf, isi form, isi tabel)
export const Text = ({ children, darkMode, className = "" }) => (
  <p
    className={`text-sm sm:text-base transition-colors ${
      darkMode ? "text-gray-300" : "text-gray-700"
    } ${className}`}
  >
    {children}
  </p>
);

// Caption / helper text / meta info (timestamp, hint, dsb)
export const Muted = ({ children, darkMode, className = "" }) => (
  <span
    className={`text-xs font-medium transition-colors ${
      darkMode ? "text-gray-400" : "text-gray-500"
    } ${className}`}
  >
    {children}
  </span>
);

// Subtitle biru (dipakai di bawah PageTitle, konsisten sama subtitle di header Layout.js)
export const Subtitle = ({ children, darkMode, className = "" }) => (
  <p
    className={`text-xs sm:text-sm font-medium transition-colors ${
      darkMode ? "text-blue-400" : "text-blue-600"
    } ${className}`}
  >
    {children}
  </p>
);
