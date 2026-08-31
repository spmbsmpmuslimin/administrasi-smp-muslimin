//[file name]: PerpusMain.js
import React from "react";
import KatalogBuku from "./Katalog";
import Peminjaman from "./Peminjaman";
import Pengembalian from "./Pengembalian";

// Komponen utama (single entry point) modul Perpustakaan.
// App.js hanya mengimpor PerpusMain ini untuk ketiga route perpustakaan
// (/katalog-buku, /peminjaman, /pengembalian), lalu PerpusMain yang
// menentukan sub-halaman mana yang ditampilkan berdasarkan prop
// currentPage. Kalau mau tambah menu perpustakaan baru, tinggal:
// 1. Buat file komponennya di folder ini (src/perpustakaan/).
// 2. Import & tambahkan case baru di switch di bawah.
// App.js dan Sidebar tidak perlu tahu-menahu soal file barunya.
const PerpusMain = ({
  currentPage = "katalog-buku",
  darkMode = false,
  ...rest
}) => {
  switch (currentPage) {
    case "peminjaman":
      return <Peminjaman darkMode={darkMode} {...rest} />;
    case "pengembalian":
      return <Pengembalian darkMode={darkMode} {...rest} />;
    case "katalog-buku":
    default:
      return <KatalogBuku darkMode={darkMode} {...rest} />;
  }
};

export default PerpusMain;
