// setting/kelola-jadwal/AdminJadwalMassal.js
// Dipanggil sebagai sub-tab dari JadwalGuruTab.js (menu "Kelola Jadwal
// Pelajaran" di halaman Setting), bukan lagi halaman berdiri sendiri.
// Fitur inti: Admin olah jadwal dari PDF WKS. Kurikulum (yang isinya cuma
// KODE guru per kelas per jam) jadi jadwal "manusiawi" (Mapel + Nama
// Guru), lalu di-PUBLISH sekaligus ke SEMUA kelas (tabel class_schedules)
// — otomatis kebaca sama wali kelas (KelolaJadwalPelajaran.js) dan siswa
// (StudentJadwal.js), tanpa wali kelas perlu isi manual satu-satu.
//
// ALUR:
// 1. Admin download Template (Excel kosong, kolom = semua kelas aktif,
//    baris = Hari + Jam Ke). Admin isi tiap sel dengan KODE guru sambil
//    liat PDF dari WKS. Kurikulum (copy langsung angka per angka).
// 2. Admin upload file yang udah diisi -> sistem BACA MENTAH kode per
//    sel dulu (belum ditranslate), simpan di state `rawCells`.
// 3. `decoded` (useMemo) nge-translate tiap kode pake Master Kode Guru
//    (tabel teacher_codes) -> Mapel + Nama Guru. Kode yang gak ketemu di
//    master ditandai ERROR (bukan langsung gagal semua, biar admin bisa
//    liat mana yang bermasalah).
// 4. PREVIEW: admin liat hasil decode per kelas + daftar kode error. Kode
//    error bisa langsung dipetain di tempat (tanpa re-upload) lewat form
//    kecil, yang otomatis nambahin ke Master Kode Guru & re-decode.
// 5. PUBLISH: baru kalau semua kode di file udah ke-decode alias 0 error,
//    tombol Publish aktif. Publish = REPLACE TOTAL class_schedules untuk
//    semua kelas yang ada di file (hapus lama, insert hasil decode baru).
//
// VALIDASI SILANG (opsional, non-blocking): kalau teacher_codes punya
// teacher_id (format G-01, dst -- lihat migration_add_teacher_id.sql),
// tiap hasil decode (guru+mapel+kelas) dicek ke tabel teacher_assignments
// (siapa beneran ngajar apa di kelas mana). Kalau gak ketemu, ditandain
// "kombinasi ganjil" (warning oranye) -- BUKAN error, publish tetep bisa
// jalan. Ini buat nangkep kasus kode ke-baca "valid" (ada di master) tapi
// sebenernya salah ketik/ketuker pas nyalin dari PDF WKS. Kurikulum.
//
// ✅ FIX (struktur file, Sep 2026): file ini tadinya ~1900 baris satu file,
// sekarang dipecah jadi 3:
//   - useJadwalMassalLogic.js -> semua state, effect, useMemo, handler
//   - AdminJadwalMassal.js (file ini) -> JSX utama (upload/preview)
//   - JadwalMassalModals.js -> 2 modal (Confirm Publish & Quick Map)
// Logic-nya SAMA PERSIS kayak sebelumnya, cuma dipindah lokasi biar tiap
// file lebih ringkas & gampang dicari.
import React from "react";
import {
  AlertCircle,
  CheckCircle,
  Download,
  Upload,
  UploadCloud,
  Rocket,
  X,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";
import { DAYS } from "../../utils/jamPelajaran";
import useJadwalMassalLogic from "./useJadwalMassalLogic";
import JadwalMassalModals from "./JadwalMassalModals";

// Warna pill nama hari di preview per kelas — samain nuansa sama warna
// band hari di Template Excel (dayColors di useJadwalMassalLogic ->
// handleDownloadTemplate), biar konsisten secara visual antara template &
// preview.
const DAY_BADGE_COLORS = {
  Senin: "bg-blue-50 text-blue-700 dark:bg-blue-950/30",
  Selasa: "bg-pink-50 text-pink-700 dark:bg-pink-950/30",
  Rabu: "bg-green-50 text-green-700 dark:bg-green-950/30",
  Kamis: "bg-amber-50 text-amber-700 dark:bg-amber-950/30",
  Jumat: "bg-purple-50 text-purple-700 dark:bg-purple-950/30",
};

export default function AdminJadwalMassal() {
  const {
    academicYear,
    classes,
    loading,
    error,
    success,
    sourceFileName,
    importing,
    fileInputRef,
    handleImportClick,
    handleImportFile,
    handleDownloadTemplate,
    handleExportPreview,
    handleResetPreview,
    hasData,
    decoded,
    syncPreview,
    sortedClassIds,
    selectedClassIds,
    toggleClassSelection,
    selectAllClasses,
    deselectAllClasses,
    previewMode,
    setPreviewMode,
    setGridClassId,
    activeGridClassId,
    gridCellMap,
    gridPeriods,
    publishing,
    publishedAt,
    handlePublish,
    runPublish,
    confirmPublishOpen,
    setConfirmPublishOpen,
    pendingPublishClassIds,
    quickMapCode,
    setQuickMapCode,
    openQuickMap,
    quickMapForm,
    setQuickMapForm,
    quickMapSaving,
    handleQuickMapSubmit,
  } = useJadwalMassalLogic();

  return (
    <div className="w-full overflow-x-hidden">
      <div className="max-w-6xl mx-auto space-y-4 p-3 sm:p-4 md:p-6">
        <div>
          <h1 className="text-lg font-bold text-theme">Import Jadwal Pelajaran (Massal)</h1>
          <p className="text-xs text-theme-secondary mt-0.5">
            Tahun Ajaran {academicYear || "—"} · Olah PDF Dari Wakasek Kurikulum Jadi Jadwal Per
            Kelas, Lalu Publish Sekaligus Ke Semua Kelas.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm whitespace-pre-line">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {success}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Step 1 & 2: download template + upload */}
            <div className="bg-theme-bg rounded-2xl border border-gray-100 p-4 shadow-sm">
              <h2 className="text-sm font-bold text-theme-secondary mb-3">
                1. Download template, isi kode, lalu upload
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleImportFile}
                />
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-theme-bg border border-theme hover:border-theme text-theme-secondary rounded-xl text-sm font-semibold"
                >
                  <Download className="w-4 h-4" />
                  Download Template ({classes.length} kelas)
                </button>
                <button
                  onClick={handleImportClick}
                  disabled={importing}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-semibold"
                >
                  {importing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UploadCloud className="w-4 h-4" />
                  )}
                  {importing ? "Membaca..." : "Upload File Terisi"}
                </button>
                <button
                  onClick={handleExportPreview}
                  disabled={!hasData}
                  title={
                    hasData
                      ? "Export hasil decode (kelas yang dicentang) ke Excel"
                      : "Upload file dulu buat bisa export"
                  }
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-theme-bg border border-theme hover:border-theme text-theme-secondary rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Export Preview
                </button>
                {hasData && (
                  <button
                    onClick={handleResetPreview}
                    title="Bersihin preview ini (tanpa upload ulang file)"
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-theme-bg border border-theme hover:border-theme text-theme-secondary rounded-xl text-sm font-semibold"
                  >
                    <X className="w-4 h-4" />
                    Mulai Baru
                  </button>
                )}
                {sourceFileName && (
                  <span className="text-xs text-gray-400">File: {sourceFileName}</span>
                )}
              </div>
            </div>

            {/* Step 2: publish -- sengaja ditaruh persis di bawah Step 1 dan
                dibikin sticky, biar tetep keliatan pas admin scroll ngecek
                preview yang panjang (banyak kelas / mode tabel mingguan).
                Aman ditaruh di atas karena tombolnya sendiri udah dikunci
                (disabled) selama masih ada kode error atau belum ada kelas
                yang dicentang -- jadi gak akan ke-klik asal sebelum preview
                beneran udah oke. */}
            {hasData && (
              <div className="sticky top-2 z-20 bg-theme-bg rounded-2xl border border-gray-100 p-4 shadow-md flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-bold text-theme-secondary">
                      2. Publish ke kelas terpilih
                    </h2>
                    {publishedAt && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[11px] font-semibold">
                        <CheckCircle className="w-3 h-3" />
                        Sudah dipublish{" "}
                        {publishedAt.toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-theme-secondary mt-0.5">
                    {publishedAt
                      ? 'Preview ini udah dipublish. Masih bisa Export Preview kapan aja -- klik "Mulai Baru" atau upload file lain kalau mau lanjut ke batch berikutnya.'
                      : decoded.errors.length > 0
                        ? "Selesaikan dulu semua kode yang belum dikenali di preview."
                        : selectedClassIds.size === 0
                          ? "Belum ada kelas yang dipilih. Centang minimal 1 kelas di preview."
                          : `Akan mengganti jadwal aktif untuk ${selectedClassIds.size} kelas (dari ${decoded.classCount} kelas di file).`}
                  </p>
                </div>
                <button
                  onClick={handlePublish}
                  disabled={
                    decoded.errors.length > 0 ||
                    publishing ||
                    selectedClassIds.size === 0 ||
                    !!publishedAt
                  }
                  title={
                    publishedAt ? "Sudah dipublish. Upload file baru buat publish lagi." : undefined
                  }
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-xl text-sm font-semibold"
                >
                  {publishing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : publishedAt ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Rocket className="w-4 h-4" />
                  )}
                  {publishing
                    ? "Mempublish..."
                    : publishedAt
                      ? "Sudah Dipublish"
                      : `Publish ke ${selectedClassIds.size} Kelas`}
                </button>
              </div>
            )}

            {/* Step 3: preview */}
            {hasData && (
              <div className="bg-theme-bg rounded-2xl border border-gray-100 p-4 shadow-sm space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-sm font-bold text-theme-secondary">
                    3. Preview hasil decode
                  </h2>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-theme-secondary">
                      {decoded.totalCells} sel · {decoded.classCount} kelas
                    </span>
                    <span
                      className={
                        decoded.errors.length > 0
                          ? "text-red-600 font-semibold"
                          : "text-green-600 font-semibold"
                      }
                    >
                      {decoded.errors.length > 0
                        ? `${decoded.errors.length} kode belum dikenali`
                        : "Semua kode dikenali ✓"}
                    </span>
                    {decoded.mismatches.length > 0 && (
                      <span className="text-orange-600 font-semibold">
                        {decoded.mismatches.length} kombinasi ganjil
                      </span>
                    )}
                    {syncPreview.toAdd.length > 0 && (
                      <span className="text-emerald-600 font-semibold">
                        +{syncPreview.toAdd.length} assignment baru
                      </span>
                    )}
                    {syncPreview.stale.length > 0 && (
                      <span className="text-slate-600 font-semibold">
                        {syncPreview.stale.length} assignment perlu dicek
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                  <p className="text-xs text-blue-800 font-medium">
                    {selectedClassIds.size} dari {sortedClassIds.length} kelas dipilih buat
                    di-publish. Uncheck kelas yang gak mau ketimpa (mis. udah ada jadwal manual yang
                    bener).
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={selectAllClasses}
                      className="text-xs font-semibold text-blue-700 hover:underline"
                    >
                      Pilih semua
                    </button>
                    <span className="text-blue-200">|</span>
                    <button
                      type="button"
                      onClick={deselectAllClasses}
                      className="text-xs font-semibold text-blue-700 hover:underline"
                    >
                      Batalkan semua
                    </button>
                  </div>
                </div>

                {decoded.mismatches.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-semibold text-orange-800">
                      Kode-kode ini dikenali di Master Kode Guru, tapi kombinasi guru + mapel +
                      kelasnya gak ketemu di data pengampu mapel (teacher_assignments) -- coba cek
                      lagi, siapa tau salah ketik kode pas nyalin dari PDF WKS. Kurikulum. Ini cuma
                      peringatan, publish tetep bisa jalan.
                    </p>
                    <ul className="text-xs text-orange-700 space-y-0.5 list-disc list-inside">
                      {decoded.mismatches.map((m, idx) => (
                        <li key={idx}>
                          Kelas {m.class_id}, {m.day} jam ke-{m.period}: kode{" "}
                          <span className="font-mono font-bold">{m.code}</span> &rarr;{" "}
                          {m.teacher_name} ({m.subject})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {syncPreview.stale.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-semibold text-slate-700">
                      Kombinasi ini ADA di data pengampu mapel (teacher_assignments), tapi gak
                      ketemu lagi di file yang barusan diupload -- kemungkinan guru itu udah gak
                      ngajar mapel/kelas ini lagi. Publish TIDAK akan menghapus ini otomatis
                      (assignment lama bisa nempel histori jurnal harian) -- cek &amp; hapus manual
                      lewat menu Penugasan Guru kalau memang udah gak berlaku.
                    </p>
                    <ul className="text-xs text-slate-600 space-y-0.5 list-disc list-inside">
                      {syncPreview.stale.map((s, idx) => (
                        <li key={idx}>
                          Kelas {s.class_id}: {s.teacher_name} ({s.subject})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {decoded.errors.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-semibold text-amber-800">
                      Kode berikut belum ada di Master Kode Guru — petakan langsung di sini, atau
                      tambahkan lewat halaman Master Kode Guru lalu upload ulang:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {decoded.errorCodes.map((code) => (
                        <button
                          key={code}
                          onClick={() => openQuickMap(code)}
                          className="px-2.5 py-1 bg-theme-bg border border-amber-300 text-amber-800 rounded-lg text-xs font-mono font-bold hover:bg-amber-100"
                        >
                          {code} ?
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <button
                    type="button"
                    onClick={() => setPreviewMode("grid")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      previewMode === "grid"
                        ? "bg-blue-600 text-white"
                        : "bg-theme-surface text-theme-secondary hover:bg-gray-200"
                    }`}
                  >
                    Tabel Mingguan
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode("accordion")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      previewMode === "accordion"
                        ? "bg-blue-600 text-white"
                        : "bg-theme-surface text-theme-secondary hover:bg-gray-200"
                    }`}
                  >
                    Per Kelas (semua kelas)
                  </button>
                </div>

                {/* Mode "Tabel Mingguan": satu kelas dilihat sekaligus, format
                    Jam x Hari kayak tampilan Kelola Jadwal Pelajaran punya
                    Walikelas -- lebih gampang buat ngecek "kerasa bener gak
                    jadwalnya" dibanding daftar per-hari. */}
                {previewMode === "grid" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="text-xs font-semibold text-theme-secondary">Kelas:</label>
                      <select
                        value={activeGridClassId}
                        onChange={(e) => setGridClassId(e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-theme bg-theme-bg text-sm font-semibold text-blue-700"
                      >
                        {sortedClassIds.map((id) => (
                          <option key={id} value={id}>
                            Kelas {id}
                          </option>
                        ))}
                      </select>
                      {activeGridClassId && !selectedClassIds.has(activeGridClassId) && (
                        <span className="text-[10px] font-normal text-gray-400">
                          (kelas ini gak dipublish)
                        </span>
                      )}
                    </div>

                    {gridPeriods.length === 0 ? (
                      <div className="text-center text-sm text-theme-secondary py-8">
                        Belum ada jadwal ter-decode buat kelas ini.
                      </div>
                    ) : (
                      <div className="bg-theme-bg rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-theme-secondary border-b border-gray-100">
                                <th className="py-2.5 px-3 font-semibold text-xs whitespace-nowrap">
                                  Jam
                                </th>
                                {DAYS.map((day) => (
                                  <th
                                    key={day}
                                    className="py-2.5 px-3 font-semibold text-xs whitespace-nowrap"
                                  >
                                    {day}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {gridPeriods.map((period) => (
                                <tr
                                  key={period}
                                  className="border-b border-gray-50 last:border-0 align-top"
                                >
                                  <td className="py-3 px-3 font-semibold text-theme">{period}</td>
                                  {DAYS.map((day) => {
                                    const item = gridCellMap.get(`${day}|${period}`);
                                    return (
                                      <td key={day} className="py-2.5 px-2.5 min-w-[150px]">
                                        {item ? (
                                          <div
                                            className={`rounded-lg px-2.5 py-1.5 ${
                                              item.mismatch ? "bg-orange-50" : "bg-theme-surface"
                                            }`}
                                            title={
                                              item.mismatch
                                                ? "Kombinasi guru+mapel+kelas gak ketemu di teacher_assignments"
                                                : undefined
                                            }
                                          >
                                            <p className="font-bold text-theme text-sm">
                                              {item.subject}
                                              {item.mismatch && (
                                                <span className="text-orange-500 ml-1">⚠</span>
                                              )}
                                            </p>
                                            <p className="text-xs text-theme-secondary mt-0.5">
                                              {item.teacher_name}
                                            </p>
                                            <p className="text-xs text-blue-600 font-semibold mt-0.5">
                                              {item.start}–{item.end}
                                            </p>
                                          </div>
                                        ) : (
                                          <span className="text-theme-secondary text-xs pl-2.5">
                                            –
                                          </span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Mode "Per Kelas": accordion lama, semua kelas dalam file
                    sekaligus keliatan (dikelompokin per hari), enak buat
                    scan cepet banyak kelas sebelum publish. */}
                {previewMode === "accordion" && (
                  <div className="space-y-3">
                    {sortedClassIds.map((classId) => {
                      const items = [...decoded.byClass[classId]].sort((a, b) => {
                        const dayDiff = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
                        if (dayDiff !== 0) return dayDiff;
                        return Number(a.period) - Number(b.period);
                      });
                      const isSelected = selectedClassIds.has(classId);
                      return (
                        <details
                          key={classId}
                          className={`border rounded-xl overflow-hidden ${
                            isSelected ? "border-gray-100" : "border-theme opacity-60"
                          }`}
                        >
                          <summary className="cursor-pointer px-3 py-2 bg-theme-surface text-sm font-semibold text-theme-secondary flex items-center justify-between">
                            <label
                              className="flex items-center gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleClassSelection(classId)}
                                className="w-4 h-4 rounded border-theme accent-blue-600"
                              />
                              <span>
                                Kelas {classId}
                                {!isSelected && (
                                  <span className="ml-1.5 text-[10px] font-normal text-gray-400">
                                    (gak dipublish)
                                  </span>
                                )}
                              </span>
                            </label>
                            <span className="text-xs text-gray-400 font-normal">
                              {items.length} jam pelajaran
                            </span>
                          </summary>
                          <div className="p-3 space-y-3 bg-theme-bg">
                            {DAYS.filter((day) => items.some((it) => it.day === day)).map((day) => {
                              const dayItems = items
                                .filter((it) => it.day === day)
                                .sort((a, b) => Number(a.period) - Number(b.period));
                              return (
                                <div
                                  key={day}
                                  className="rounded-xl border border-gray-100 overflow-hidden shadow-sm"
                                >
                                  <div
                                    className={`px-3 py-1.5 text-xs font-bold tracking-wide ${
                                      DAY_BADGE_COLORS[day] || "bg-gray-50 text-gray-600"
                                    }`}
                                  >
                                    {day}
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="text-left text-theme-secondary border-b border-gray-100">
                                          <th className="py-2 px-3 font-semibold text-xs whitespace-nowrap">
                                            Jam Ke
                                          </th>
                                          <th className="py-2 px-3 font-semibold text-xs whitespace-nowrap">
                                            Waktu
                                          </th>
                                          <th className="py-2 px-3 font-semibold text-xs">Mapel</th>
                                          <th className="py-2 px-3 font-semibold text-xs">Guru</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {dayItems.map((item, idx) => (
                                          <tr
                                            key={idx}
                                            className={`border-b border-gray-50 last:border-0 ${
                                              item.mismatch ? "bg-orange-50" : ""
                                            }`}
                                            title={
                                              item.mismatch
                                                ? "Kombinasi guru+mapel+kelas gak ketemu di teacher_assignments"
                                                : undefined
                                            }
                                          >
                                            <td className="py-2 px-3 font-semibold text-theme">
                                              {item.period}
                                            </td>
                                            <td className="py-2 px-3 font-semibold text-blue-600 whitespace-nowrap">
                                              {item.start}–{item.end}
                                            </td>
                                            <td className="py-2 px-3 font-semibold text-theme">
                                              {item.subject}
                                              {item.mismatch && (
                                                <span className="text-orange-500 ml-1">⚠</span>
                                              )}
                                            </td>
                                            <td className="py-2 px-3 font-semibold text-blue-600">
                                              {item.teacher_name}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </details>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <JadwalMassalModals
          confirmPublishOpen={confirmPublishOpen}
          setConfirmPublishOpen={setConfirmPublishOpen}
          sourceFileName={sourceFileName}
          pendingPublishClassIds={pendingPublishClassIds}
          runPublish={runPublish}
          publishing={publishing}
          quickMapCode={quickMapCode}
          setQuickMapCode={setQuickMapCode}
          handleQuickMapSubmit={handleQuickMapSubmit}
          quickMapForm={quickMapForm}
          setQuickMapForm={setQuickMapForm}
          quickMapSaving={quickMapSaving}
        />
      </div>
    </div>
  );
}
