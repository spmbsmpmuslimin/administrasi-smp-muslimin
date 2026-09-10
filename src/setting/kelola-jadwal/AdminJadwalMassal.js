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
  CalendarCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { DAYS } from "../../services/JamPelajaranProvider";
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

// Palet pastel per jenjang -- dipake buat bedain baris "Kelas 7/8/9" di
// kartu "Jadwal Aktif Saat Ini" secara visual. `chip` = warna tombol kelas
// pas gak aktif, `chipActive` = pas kelas itu lagi dipilih (Lihat Detail).
const GRADE_COLORS = {
  7: {
    card: "bg-amber-50 border-amber-100",
    label: "text-amber-700",
    chip: "bg-white/80 text-amber-700 border-amber-200 hover:bg-amber-100",
    chipActive: "bg-amber-500 text-white border-amber-500",
  },
  8: {
    card: "bg-violet-50 border-violet-100",
    label: "text-violet-700",
    chip: "bg-white/80 text-violet-700 border-violet-200 hover:bg-violet-100",
    chipActive: "bg-violet-500 text-white border-violet-500",
  },
  9: {
    card: "bg-emerald-50 border-emerald-100",
    label: "text-emerald-700",
    chip: "bg-white/80 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
    chipActive: "bg-emerald-500 text-white border-emerald-500",
  },
};
const DEFAULT_GRADE_COLOR = {
  card: "bg-gray-50 border-gray-100",
  label: "text-gray-700",
  chip: "bg-white/80 text-gray-700 border-gray-200 hover:bg-gray-100",
  chipActive: "bg-gray-500 text-white border-gray-500",
};

// Kelompokin daftar kelas berdasarkan jenjang (7/8/9), diurutin ascending
// per jenjang -- dipake buat 2 tempat: tombol pilih-kelas di kartu
// "Jadwal Aktif Saat Ini" & checkbox kelas di modal Export Jadwal Aktif.
// `getGrade` fleksibel karena 2 sumber datanya beda bentuk (liveSchedule.
// byClass punya field `grade`, `classes` juga punya `grade` tapi field id
// kelasnya bernama beda: `class_id` vs `id`).
function groupByGrade(items, getGrade) {
  const groups = new Map();
  items.forEach((item) => {
    const grade = getGrade(item) ?? "Lainnya";
    if (!groups.has(grade)) groups.set(grade, []);
    groups.get(grade).push(item);
  });
  return Array.from(groups.entries()).sort((a, b) => {
    const na = Number(a[0]);
    const nb = Number(b[0]);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return String(a[0]).localeCompare(String(b[0]));
  });
}

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
    liveSchedule,
    showLiveDetail,
    setShowLiveDetail,
    selectedLiveClassId,
    setSelectedLiveClassId,
    liveClassGridCellMap,
    liveClassGridRows,
    exportLiveModalOpen,
    setExportLiveModalOpen,
    exportLiveClassIds,
    exportingLive,
    openExportLiveModal,
    toggleExportLiveClass,
    selectAllExportLiveClasses,
    deselectAllExportLiveClasses,
    handleExportLiveSchedule,
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
            {/* Kartu status: ringkasan jadwal yang LAGI AKTIF di
                class_schedules sekarang (bukan hasil decode file yang lagi
                diupload) -- biar halaman gak polos pas belum ada file
                diupload, admin langsung liat "oh segini yang udah live". */}
            <div className="bg-theme-bg rounded-3xl border border-gray-100 p-5 sm:p-6 shadow-md">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3.5">
                  <div
                    className={`p-3 rounded-2xl shrink-0 ${
                      liveSchedule.classCount > 0
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    <CalendarCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-base sm:text-lg font-bold text-theme">
                      Jadwal Aktif Saat Ini
                    </p>
                    <p className="text-xs sm:text-sm text-theme-secondary mt-0.5">
                      {liveSchedule.classCount > 0
                        ? `${liveSchedule.classCount} kelas · ${liveSchedule.totalSlots} jam pelajaran aktif` +
                          (liveSchedule.lastPublishedAt
                            ? ` · terakhir dipublish ${new Date(
                                liveSchedule.lastPublishedAt
                              ).toLocaleString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}`
                            : "")
                        : "Belum ada jadwal yang dipublish untuk tahun ajaran ini."}
                    </p>
                  </div>
                </div>
                {liveSchedule.classCount > 0 && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={openExportLiveModal}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowLiveDetail(!showLiveDetail);
                        setSelectedLiveClassId(null);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-theme-surface text-theme-secondary text-xs font-semibold hover:bg-gray-200 transition-colors"
                    >
                      {showLiveDetail ? "Sembunyikan" : "Lihat Detail"}
                      {showLiveDetail ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}
              </div>
              {showLiveDetail && liveSchedule.byClass.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  {groupByGrade(liveSchedule.byClass, (c) => c.grade).map(([grade, items]) => {
                    const colors = GRADE_COLORS[grade] || DEFAULT_GRADE_COLOR;
                    return (
                      <div
                        key={grade}
                        className={`rounded-2xl border p-3.5 sm:p-4 transition-shadow hover:shadow-sm ${colors.card}`}
                      >
                        <p className={`text-xs font-bold mb-2.5 ${colors.label}`}>Kelas {grade}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                          {items.map((c) => {
                            const active = selectedLiveClassId === c.class_id;
                            return (
                              <button
                                key={c.class_id}
                                type="button"
                                onClick={() => setSelectedLiveClassId(active ? null : c.class_id)}
                                className={`px-3 py-3.5 rounded-xl text-sm font-semibold border transition-all hover:scale-[1.03] ${
                                  active ? colors.chipActive : colors.chip
                                }`}
                              >
                                {c.class_id} - {c.slotCount} Jam
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {selectedLiveClassId && (
                    <div className="mt-3">
                      <p className="text-xs font-bold text-theme mb-2">
                        Jadwal Kelas {selectedLiveClassId}
                      </p>
                      {liveClassGridRows.length === 0 ? (
                        <p className="text-xs text-theme-secondary">
                          Gak ada data jadwal buat kelas ini.
                        </p>
                      ) : (
                        <div className="bg-theme-surface rounded-xl border border-gray-100 overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left text-theme-secondary border-b border-gray-100">
                                  <th className="py-2 px-3 font-semibold text-xs whitespace-nowrap">
                                    Jam
                                  </th>
                                  {DAYS.map((day) => (
                                    <th
                                      key={day}
                                      className="py-2 px-3 font-semibold text-xs whitespace-nowrap"
                                    >
                                      {day}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {liveClassGridRows.map((period) => (
                                  <tr
                                    key={period}
                                    className="border-b border-gray-50 last:border-0 align-top"
                                  >
                                    <td className="py-2.5 px-3 font-semibold text-theme text-xs whitespace-nowrap">
                                      Jam {period}
                                    </td>
                                    {DAYS.map((day) => {
                                      const item = liveClassGridCellMap.get(`${day}|${period}`);
                                      return (
                                        <td key={day} className="py-2 px-2 min-w-[130px]">
                                          {item ? (
                                            <div className="rounded-lg px-2 py-1 bg-theme-bg">
                                              <p className="font-bold text-theme text-xs">
                                                {item.subject}
                                              </p>
                                              <p className="text-[11px] text-theme-secondary mt-0.5">
                                                {item.teacher_name}
                                              </p>
                                              <p className="text-[10px] text-blue-500 font-medium mt-0.5">
                                                {item.start_time?.slice(0, 5)}–
                                                {item.end_time?.slice(0, 5)}
                                              </p>
                                            </div>
                                          ) : (
                                            <span className="text-theme-secondary text-xs pl-2">
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
                </div>
              )}
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

        {/* Modal export jadwal aktif: pilih kelas mana yang mau di-export
            (checkbox per kelas, dikelompokin per jenjang biar gampang
            di-scan, + "Pilih Semua Kelas"). Cuma jadwal yang UDAH aktif/
            published di class_schedules yang di-export -- bukan hasil
            decode file yang lagi diupload (itu ada di "Export Preview"
            terpisah). */}
        {exportLiveModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-theme-bg rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-theme">Export Jadwal Aktif</h2>
                <button
                  onClick={() => setExportLiveModalOpen(false)}
                  className="text-gray-400 hover:text-theme-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-theme-secondary mb-3">
                Pilih kelas yang mau di-export ke Excel (1 sheet per kelas). Kelas yang belum punya
                jadwal aktif ditandai <span className="font-semibold">(kosong)</span>.
              </p>

              <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-gray-100">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-theme cursor-pointer">
                  <input
                    type="checkbox"
                    checked={classes.length > 0 && exportLiveClassIds.size === classes.length}
                    onChange={(e) =>
                      e.target.checked
                        ? selectAllExportLiveClasses()
                        : deselectAllExportLiveClasses()
                    }
                    className="w-4 h-4 rounded border-theme accent-blue-600"
                  />
                  Pilih Semua Kelas
                </label>
                <span className="text-xs text-gray-400">
                  {exportLiveClassIds.size} dari {classes.length} kelas dipilih
                </span>
              </div>

              <div className="space-y-3">
                {groupByGrade(classes, (c) => c.grade).map(([grade, items]) => (
                  <div key={grade}>
                    <p className="text-xs font-bold text-theme-secondary mb-1.5">Kelas {grade}</p>
                    <div className="flex flex-wrap gap-2">
                      {items.map((c) => {
                        const checked = exportLiveClassIds.has(c.id);
                        const hasSchedule = liveSchedule.byClass.some((b) => b.class_id === c.id);
                        return (
                          <label
                            key={c.id}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                              checked
                                ? "bg-blue-50 border-blue-200 text-blue-700"
                                : "bg-theme-surface border-theme text-theme-secondary"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleExportLiveClass(c.id)}
                              className="w-3.5 h-3.5 rounded border-theme accent-blue-600"
                            />
                            {c.id}
                            {!hasSchedule && (
                              <span className="text-gray-400 font-normal">(kosong)</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-4 mt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setExportLiveModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-theme-secondary bg-theme-surface hover:bg-gray-200"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExportLiveSchedule}
                  disabled={exportingLive || exportLiveClassIds.size === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {exportingLive ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {exportingLive ? "Meng-export..." : `Export ${exportLiveClassIds.size} Kelas`}
                </button>
              </div>
            </div>
          </div>
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
