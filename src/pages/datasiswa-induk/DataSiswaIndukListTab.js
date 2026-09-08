// pages/datasiswa-induk/DataSiswaIndukListTab.js
// ========================================================================
// ✅ SPLIT dari DataSiswaInduk.js (file utama udah kepanjangan, ~2000 baris)
// -- ini JSX buat tab "Data Siswa" (list/filter/tabel siswa) doang, MURNI
// presentational (gak ada state/effect sendiri, semua lewat props dari
// DataSiswaInduk.js). LOGIC-NYA GAK BERUBAH SAMA SEKALI dari versi lama,
// cuma dipindah ke sini apa adanya -- kalau nyari behavior tab ini, cek
// handler-nya di DataSiswaInduk.js (openStudent, handleExportPDF, dkk),
// file ini cuma nampilinnya.
// ========================================================================
import { Search, Users, FileDown, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { STATUS_META, getDetailRowValue } from "./DataSiswaIndukConfig";

export default function DataSiswaIndukListTab({
  isWaliKelas,
  summary,
  statusFilter,
  setStatusFilter,
  completionPercent,
  completionScopeLabel,
  search,
  setSearch,
  verifiedFilter,
  setVerifiedFilter,
  jenjangFilter,
  setJenjangFilter,
  classFilter,
  setClassFilter,
  jenjangOptions,
  filteredClassOptions,
  filteredRows,
  paginatedRows,
  visibleCount,
  setVisibleCount,
  PAGE_SIZE,
  selectedIds,
  toggleSelectOne,
  toggleSelectAllFiltered,
  allFilteredSelected,
  handleExportPDF,
  handleExportExcel,
  exporting,
  exportingExcel,
  openStudent,
}) {
  return (
    <>
      {/* ====== RINGKASAN ====== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-md p-3 sm:p-4 border border-slate-100 dark:border-slate-700 text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
              <Users size={18} className="text-white" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">
            {summary.total}
          </p>
          <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Siswa
          </p>
        </div>

        {["lengkap", "sebagian", "belum"].map((key) => {
          const meta = STATUS_META[key];
          const Icon = meta.icon;
          return (
            <button
              key={key}
              onClick={() => setStatusFilter((f) => (f === key ? "all" : key))}
              className={`bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-md p-3 sm:p-4 border text-center transition ${
                statusFilter === key
                  ? "border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-900"
                  : "border-slate-100 dark:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-center mb-2">
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-md ${meta.dot}`}
                >
                  <Icon size={18} className="text-white" />
                </div>
              </div>
              <p className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">
                {summary[key]}
              </p>
              <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
                {meta.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* ====== PERSENTASE KELENGKAPAN (scoped ke Jenjang/Kelas) ====== */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-md p-3 sm:p-4 border border-slate-100 dark:border-slate-700 mb-4">
        <div className="flex items-center justify-between mb-1.5 gap-2">
          <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 truncate">
            Kelengkapan Data — {completionScopeLabel}
          </p>
          <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
            {completionPercent}%{" "}
            <span className="font-normal text-slate-400 dark:text-slate-500">
              ({summary.lengkap}/{summary.total})
            </span>
          </p>
        </div>
        <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full transition-all duration-300"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>

      {/* ====== FILTER ====== */}
      {/* ✅ UPDATED: dari scroll horizontal (overflow-x-auto) jadi
            wrap otomatis (flex-wrap) -- semua kontrol filter (Cari Siswa,
            Pilih Jenjang, Pilih Kelas, Reset) tetep digabung 1 baris kalau
            muat, tapi kalau kepotong di layar sempit langsung turun ke
            baris baru sendiri, gak perlu geser/toggle buat liat semuanya.
            Cari Siswa tetep fleksibel (flex-1), dropdown & tombol reset
            lebar tetap (shrink-0). */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-md p-3 sm:p-4 border border-slate-100 dark:border-slate-700 mb-4 flex flex-col gap-3">
        {/* ✅ NEW: Layout filter khusus HP (< sm).
                  Sebelumnya semua filter (Cari Siswa, Status Verifikasi,
                  Pilih Jenjang, Pilih Kelas) pakai flex-wrap dengan
                  min-width masing-masing beda -> di layar sempit lebarnya
                  gak konsisten & kadang numpuk/nabrak satu sama lain.
                  Sekarang di HP: tiap filter dibungkus 1 kotak (border)
                  yang isinya label + input/dropdown SEKALIGUS, jadi
                  keliatan itu 1 kesatuan yang bisa diklik/ditap (bukan
                  label ngambang misah dari kotak inputnya). Pilih Jenjang
                  & Pilih Kelas taruh sejajar 2 kolom (grid-cols-2) biar
                  lebarnya persis sama. */}
        <div className="sm:hidden flex flex-col gap-2.5">
          <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 flex items-center gap-2.5 focus-within:ring-2 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-900 focus-within:border-indigo-300 transition">
            <Search size={16} className="text-slate-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 leading-tight">
                Cari Siswa
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nama atau NIS..."
                className="w-full text-sm bg-transparent border-0 p-0 py-0.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-0"
              />
            </div>
          </div>

          {/* ✅ Disembunyiin buat Wali Kelas -- verifikasi itu tugas
              Admin/TU (cocokin ke dokumen fisik), Wali Kelas gak pernah
              nge-verifikasi (tombolnya juga udah admin/TU only), jadi
              filter ini gak relevan buat mereka. */}
          {!isWaliKelas && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-900 focus-within:border-indigo-300 transition">
              <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 leading-tight">
                Status Verifikasi
              </label>
              <select
                value={verifiedFilter}
                onChange={(e) => setVerifiedFilter(e.target.value)}
                className="w-full text-sm bg-transparent border-0 p-0 py-0.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-0"
              >
                <option value="all">Semua</option>
                <option value="verified">Terverifikasi</option>
                <option value="unverified">Belum Diverifikasi</option>
              </select>
            </div>
          )}

          {/* ✅ Disembunyiin buat Wali Kelas -- kelasnya udah pasti cuma 1
              (di-scope lewat homeroom_class_id pas fetch data), jadi
              dropdown Jenjang/Kelas di sini percuma (isinya cuma "Semua" +
              1 opsi doang). */}
          {!isWaliKelas && (jenjangOptions.length > 0 || filteredClassOptions.length > 0) && (
            <div className="grid grid-cols-2 gap-2.5">
              {jenjangOptions.length > 0 && (
                <div
                  className={`rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-900 focus-within:border-indigo-300 transition ${
                    filteredClassOptions.length === 0 ? "col-span-2" : ""
                  }`}
                >
                  <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 leading-tight">
                    Pilih Jenjang
                  </label>
                  <select
                    value={jenjangFilter}
                    onChange={(e) => {
                      setJenjangFilter(e.target.value);
                      setClassFilter("all");
                    }}
                    className="w-full text-sm bg-transparent border-0 p-0 py-0.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-0"
                  >
                    <option value="all">Semua Jenjang</option>
                    {jenjangOptions.map((j) => (
                      <option key={j} value={j}>
                        Kelas {j}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {filteredClassOptions.length > 0 && (
                <div
                  className={`rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-900 focus-within:border-indigo-300 transition ${
                    jenjangOptions.length === 0 ? "col-span-2" : ""
                  }`}
                >
                  <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 leading-tight">
                    Pilih Kelas
                  </label>
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="w-full text-sm bg-transparent border-0 p-0 py-0.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-0"
                  >
                    <option value="all">Semua Kelas</option>
                    {filteredClassOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        Kelas {c.id}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {(statusFilter !== "all" ||
            verifiedFilter !== "all" ||
            jenjangFilter !== "all" ||
            classFilter !== "all") && (
            <button
              onClick={() => {
                setStatusFilter("all");
                setVerifiedFilter("all");
                setJenjangFilter("all");
                setClassFilter("all");
              }}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-2.5 rounded-lg w-full"
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* Layout filter versi tablet/desktop (sm ke atas) -- tetap
                  seperti semula, gak ada perubahan. */}
        <div className="hidden sm:flex flex-wrap items-end gap-2 sm:gap-3">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Cari Siswa
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nama atau NIS..."
                className="w-full text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 focus:border-indigo-300"
              />
            </div>
          </div>

          {/* ✅ Disembunyiin buat Wali Kelas -- verifikasi tugas Admin/TU,
              sama alasannya kayak versi mobile di atas. */}
          {!isWaliKelas && (
            <div className="shrink-0 min-w-[150px]">
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Status Verifikasi
              </label>
              <select
                value={verifiedFilter}
                onChange={(e) => setVerifiedFilter(e.target.value)}
                className="w-full text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
              >
                <option value="all">Semua</option>
                <option value="verified">Terverifikasi</option>
                <option value="unverified">Belum Diverifikasi</option>
              </select>
            </div>
          )}

          {/* ✅ Disembunyiin buat Wali Kelas -- sama alasannya kayak versi
              mobile di atas. */}
          {!isWaliKelas && (jenjangOptions.length > 0 || filteredClassOptions.length > 0) && (
            <>
              {jenjangOptions.length > 0 && (
                <div className="shrink-0 min-w-[130px]">
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Pilih Jenjang
                  </label>
                  <select
                    value={jenjangFilter}
                    onChange={(e) => {
                      setJenjangFilter(e.target.value);
                      // Reset filter Kelas tiap ganti Jenjang, biar gak
                      // nyangkut pilih kelas dari jenjang yang udah gak aktif.
                      setClassFilter("all");
                    }}
                    className="w-full text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
                  >
                    <option value="all">Semua Jenjang</option>
                    {jenjangOptions.map((j) => (
                      <option key={j} value={j}>
                        Kelas {j}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {filteredClassOptions.length > 0 && (
                <div className="shrink-0 min-w-[140px]">
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Pilih Kelas
                  </label>
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="w-full text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
                  >
                    <option value="all">Semua Kelas</option>
                    {filteredClassOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        Kelas {c.id}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {/* ✅ Reset Filter dipisah dari blok Jenjang/Kelas di atas (yang
              disembunyiin buat Wali Kelas) -- soalnya wali kelas tetap
              butuh reset buat Status Verifikasi walau dropdown Jenjang/
              Kelas gak ditampilin. Manggil setJenjangFilter/setClassFilter
              di sini tetep aman walau gak ada UI-nya (nilainya emang udah
              selalu "all" buat wali kelas). */}
          {(statusFilter !== "all" ||
            verifiedFilter !== "all" ||
            jenjangFilter !== "all" ||
            classFilter !== "all") && (
            <div className="shrink-0">
              <span className="block text-[11px] mb-1 invisible">Reset</span>
              <button
                onClick={() => {
                  setStatusFilter("all");
                  setVerifiedFilter("all");
                  setJenjangFilter("all");
                  setClassFilter("all");
                }}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-2 rounded-lg whitespace-nowrap"
              >
                Reset Filter
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ====== TOOLBAR SELEKSI & EXPORT PDF ====== */}
      {filteredRows.length > 0 && (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-md p-4 sm:p-6 border border-slate-100 dark:border-slate-700 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <label className="flex items-center gap-2 text-sm sm:text-base font-medium text-slate-600 dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={toggleSelectAllFiltered}
              className="w-4 h-4 sm:w-5 sm:h-5 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-400"
            />
            Pilih Semua ({filteredRows.length})
            {selectedIds.size > 0 && (
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                · {selectedIds.size} dipilih
              </span>
            )}
          </label>

          {/* Export PDF & Excel digabung di toolbar yang sama, pake
                selectedIds yang sama juga -- cuma format file-nya beda.
                Tombol dibikin lebih gede & "dinamis" (gradient + shadow +
                hover/active scale) sesuai request, tapi tetap full-width
                bertumpuk di HP (gampang dipencet jempol) & sejajar lebih
                lega di layar tablet/desktop. */}
          <div className="flex flex-col xs:flex-row gap-2.5 sm:gap-3">
            <button
              onClick={handleExportPDF}
              disabled={selectedIds.size === 0 || exporting || exportingExcel}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 text-sm sm:text-base font-bold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 disabled:from-slate-300 disabled:to-slate-300 dark:disabled:from-slate-700 dark:disabled:to-slate-700 disabled:cursor-not-allowed disabled:shadow-none px-6 py-3 sm:px-8 sm:py-3.5 rounded-xl shadow-md hover:shadow-lg active:scale-95 disabled:active:scale-100 transition-all"
            >
              <FileDown size={18} />
              {exporting
                ? "Membuat PDF..."
                : `PDF${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`}
            </button>

            <button
              onClick={handleExportExcel}
              disabled={selectedIds.size === 0 || exporting || exportingExcel}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 text-sm sm:text-base font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:from-slate-300 disabled:to-slate-300 dark:disabled:from-slate-700 dark:disabled:to-slate-700 disabled:cursor-not-allowed disabled:shadow-none px-6 py-3 sm:px-8 sm:py-3.5 rounded-xl shadow-md hover:shadow-lg active:scale-95 disabled:active:scale-100 transition-all"
            >
              <FileSpreadsheet size={18} />
              {exportingExcel
                ? "Membuat Excel..."
                : `Excel${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`}
            </button>
          </div>
        </div>
      )}

      {/* ====== LIST SISWA ====== */}
      {filteredRows.length === 0 ? (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-100 dark:border-slate-700 p-8 text-center text-slate-400 dark:text-slate-500 text-sm shadow-sm">
          Tidak ada siswa yang cocok dengan filter ini.
        </div>
      ) : (
        <>
          {/* ✅ NEW: Card list khusus HP (< sm) -- sebelumnya tabel
                    6 kolom (Nama, NIS, Kelas, Jenis Kelamin, TTL, Status)
                    dipaksa muat semua di layar sempit pakai table-fixed,
                    hasilnya numpuk & susah dibaca. Sekarang di HP cuma
                    tampil 3 info penting: Nama Siswa, NIS, dan Status
                    (checkbox + badge terverifikasi tetap ada). Info
                    lainnya (Kelas, Jenis Kelamin, TTL) tetap bisa dilihat
                    lengkap begitu buka detail siswa (openStudent). Tabel
                    lengkap tetap dipakai apa adanya di layar sm ke atas. */}
          <div className="sm:hidden space-y-2">
            {paginatedRows.map((r) => {
              const meta = STATUS_META[r.status];
              const StatusIcon = meta.icon;
              const isSelected = selectedIds.has(r.id);

              return (
                <div
                  key={r.id}
                  onClick={() => openStudent(r)}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    isSelected
                      ? "bg-indigo-50/70 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800"
                      : "bg-white/80 dark:bg-slate-800/80 border-slate-100 dark:border-slate-700 active:bg-slate-50 dark:active:bg-slate-700/40"
                  }`}
                >
                  <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectOne(r.id)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-400"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {r.full_name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      NIS: {r.nis || "-"}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {r.isVerified && (
                      <span
                        title="Terverifikasi Admin"
                        className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
                      >
                        <ShieldCheck size={11} />
                      </span>
                    )}
                    <span
                      className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${meta.badge}`}
                    >
                      <StatusIcon size={12} />
                      {meta.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tabel lengkap -- tetap tampil apa adanya di layar sm ke atas */}
          <div className="hidden sm:block overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <table className="w-full table-fixed text-left border-collapse bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <thead>
                {/* Header kolom -- font SENGAJA dibikin lebih gede &
                        bold/uppercase dibanding isian data di bawahnya,
                        biar jelas beda mana judul kolom mana isinya.
                        table-fixed + lebar per kolom (di bawah) dipake
                        biar kolom "Nama Siswa" dapet porsi paling lebar
                        (gak nyisain space kosong di kanan) & kolom lain
                        gak ikutan melar gak jelas. */}
                <tr className="border-b-2 border-slate-200 dark:border-slate-600">
                  <th className="p-3 w-10"></th>
                  <th className="p-3 w-[22%] text-sm sm:text-base font-extrabold uppercase text-slate-700 dark:text-slate-200">
                    Nama Siswa
                  </th>
                  <th className="p-3 w-[12%] text-sm sm:text-base font-extrabold uppercase text-slate-700 dark:text-slate-200 whitespace-nowrap">
                    NIS
                  </th>
                  <th className="p-3 w-[8%] text-sm sm:text-base font-extrabold uppercase text-slate-700 dark:text-slate-200 whitespace-nowrap">
                    Kelas
                  </th>
                  <th className="p-3 w-[13%] text-sm sm:text-base font-extrabold uppercase text-slate-700 dark:text-slate-200 whitespace-nowrap">
                    Jenis Kelamin
                  </th>
                  <th className="p-3 w-[25%] text-sm sm:text-base font-extrabold uppercase text-slate-700 dark:text-slate-200 whitespace-nowrap">
                    Tempat, Tanggal Lahir
                  </th>
                  <th className="p-3 w-[20%] text-sm sm:text-base font-extrabold uppercase text-slate-700 dark:text-slate-200 whitespace-nowrap text-right">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((r) => {
                  const meta = STATUS_META[r.status];
                  const StatusIcon = meta.icon;
                  const jenisKelamin = r.detail?.jenis_kelamin || null;
                  const ttl = getDetailRowValue(r.detail, { key: "ttl", combine: "ttl" });

                  return (
                    <tr
                      key={r.id}
                      onClick={() => openStudent(r)}
                      className={`border-b border-slate-100 dark:border-slate-700 cursor-pointer transition ${
                        selectedIds.has(r.id)
                          ? "bg-indigo-50/70 dark:bg-indigo-900/20"
                          : "hover:bg-slate-50 dark:hover:bg-slate-700/40"
                      }`}
                    >
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(r.id)}
                          onChange={() => toggleSelectOne(r.id)}
                          className="w-4 h-4 shrink-0 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-400"
                        />
                      </td>
                      <td className="p-3 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {r.full_name}
                      </td>
                      <td className="p-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {r.nis || "-"}
                      </td>
                      <td className="p-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {r.class_id || "-"}
                      </td>
                      <td className="p-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {jenisKelamin || "-"}
                      </td>
                      <td
                        className="p-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 truncate"
                        title={ttl || undefined}
                      >
                        {ttl || "-"}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {r.isVerified && (
                            <span
                              title="Terverifikasi Admin"
                              className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
                            >
                              <ShieldCheck size={13} />
                            </span>
                          )}
                          <span
                            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${meta.badge}`}
                          >
                            <StatusIcon size={13} />
                            {meta.label}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ====== MUAT LEBIH BANYAK (PAGINATION) ====== */}
      {filteredRows.length > 0 && (
        <div className="text-center mt-4 sm:mt-5">
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
            Menampilkan {paginatedRows.length} dari {filteredRows.length} siswa
          </p>
          {visibleCount < filteredRows.length && (
            <button
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-5 py-2.5 rounded-lg transition"
            >
              Muat Lebih Banyak ({Math.min(PAGE_SIZE, filteredRows.length - visibleCount)})
            </button>
          )}
        </div>
      )}
    </>
  );
}
