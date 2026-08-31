//[file name]: HomeVisitFilter.js
import React from "react";
import { Search, Plus } from "lucide-react";

const STATUS_OPTIONS = ["Semua", "Terjadwal", "Selesai", "Perlu Tindak Lanjut", "Dibatalkan"];

// ✅ REVISI: urutan filter sekarang
//   Cari Siswa - Pilih Jenjang - Pilih Kelas - Status - Tambah Home Visit
// - "Pilih Jenjang" = filter grade (7/8/9), opsinya dikirim dari HomeVisit.js
//   (hasil query tabel `classes`, kolom `grade`, distinct).
// - "Pilih Kelas" jadi DEPENDENT ke Jenjang: begitu Jenjang dipilih,
//   opsi kelasnya cuma yang grade-nya cocok (mis. Jenjang 7 -> 7A, 7B, dst).
//   `kelasOptions` yang diterima props ini SUDAH terfilter dari parent.
// ❌ Filter "Dari Tanggal / Sampai Tanggal" DIHAPUS — bikin bingung user,
//   tidak lagi ada di props maupun UI.
const HomeVisitFilter = ({
  searchTerm,
  setSearchTerm,
  filterJenjang,
  setFilterJenjang,
  jenjangOptions,
  filterKelas,
  setFilterKelas,
  kelasOptions,
  filterStatus,
  setFilterStatus,
  onTambah,
  darkMode = false,
}) => {
  const cardBg = darkMode ? "bg-gray-800 border-theme" : "bg-theme-bg border-theme";
  const inputBase = `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
    darkMode
      ? "bg-theme-bg border-theme text-gray-100 focus:ring-blue-500 placeholder-gray-500"
      : "bg-theme-bg border-theme text-theme focus:ring-blue-400 placeholder-gray-400"
  }`;

  return (
    <div className={`rounded-xl border p-3 sm:p-4 mb-6 ${cardBg}`}>
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-3">
        {/* 1. Cari Siswa */}
        <div className="relative flex-1 min-w-[180px]">
          <Search
            size={16}
            className={`absolute left-3 top-1/2 -translate-y-1/2 ${
              darkMode ? "text-theme-secondary" : "text-gray-400"
            }`}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama siswa..."
            className={`${inputBase} pl-9`}
          />
        </div>

        {/* 2. Pilih Jenjang */}
        <select
          value={filterJenjang}
          onChange={(e) => setFilterJenjang(e.target.value)}
          className={`${inputBase} sm:w-40`}
        >
          <option value="Semua">Semua Jenjang</option>
          {jenjangOptions.map((jenjang) => (
            <option key={jenjang} value={jenjang}>
              Kelas {jenjang}
            </option>
          ))}
        </select>

        {/* 3. Pilih Kelas (dependent ke Jenjang) */}
        <select
          value={filterKelas}
          onChange={(e) => setFilterKelas(e.target.value)}
          className={`${inputBase} sm:w-40`}
        >
          <option value="Semua">Semua Kelas</option>
          {kelasOptions.map((kelas) => (
            <option key={kelas} value={kelas}>
              Kelas {kelas}
            </option>
          ))}
        </select>

        {/* 4. Status */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={`${inputBase} sm:w-56`}
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status === "Semua" ? "Semua Status" : status}
            </option>
          ))}
        </select>

        {/* 5. Tambah Home Visit */}
        <button
          onClick={onTambah}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-lg transition-colors text-sm sm:text-base touch-manipulation active:scale-95 w-full sm:w-auto sm:flex-shrink-0"
        >
          <Plus size={18} />
          Tambah Home Visit
        </button>
      </div>
    </div>
  );
};

export default HomeVisitFilter;
