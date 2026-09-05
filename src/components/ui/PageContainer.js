// components/ui/PageContainer.js
// Wrapper layout standar -- dipakai di DALAM `children` yang dirender Layout.js
// (bukan pengganti Layout.js). Layout.js ngatur sidebar/header/dark-background,
// PageContainer ngatur spacing, padding kiri-kanan, & max-width konten di tiap halaman.
import React from "react";
import { PageTitle, Subtitle } from "./Typography";

// ⭐ Bungkus SELURUH isi tiap halaman dengan komponen ini, biar spacing,
// padding, max-width, dan (opsional) judul halaman konsisten di semua page.
// Kalau judul halaman sudah ditampilkan di header Layout.js (via
// menuConfig.title), title/subtitle di sini boleh di-skip.
//
// px-4 sm:px-6 -- kasih "napas" di kiri-kanan pas dibuka di HP (layar penuh
// gak kena max-w-7xl), biar konten gak nempel mentok ke tepi layar.
//
// Pemakaian:
//   <PageContainer darkMode={darkMode}>
//     <Card darkMode={darkMode}>...</Card>
//   </PageContainer>
//
// atau dengan judul lokal (kalau halaman butuh judul tambahan di dalam body,
// misal karena satu komponen dipakai buat beberapa "tab" berbeda):
//   <PageContainer darkMode={darkMode} title="Data Siswa" subtitle="Kelola data per kelas">
//     ...
//   </PageContainer>

const PageContainer = ({ children, darkMode, title, subtitle, className = "" }) => {
  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 space-y-4 sm:space-y-6 ${className}`}>
      {(title || subtitle) && (
        <div className="mb-2">
          {title && <PageTitle darkMode={darkMode}>{title}</PageTitle>}
          {subtitle && <Subtitle darkMode={darkMode}>{subtitle}</Subtitle>}
        </div>
      )}
      {children}
    </div>
  );
};

export default PageContainer;
