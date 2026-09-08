// pages/datasiswa-induk/DataSiswaIndukDetailPanel.js
// ========================================================================
// ✅ SPLIT dari DataSiswaInduk.js (file utama udah kepanjangan, ~2000 baris)
// -- semua JSX yang berhubungan sama "1 siswa yang lagi dipilih" digabung
// di sini: picker "Pilih Siswa", header siswa terpilih (nav prev/next +
// tombol verifikasi), riwayat mutasi, tab "Isi Data" (form edit), dan tab
// "Preview" (read-only). MURNI presentational, gak ada state/effect
// sendiri -- semua state (selectedStudent, adminForm, picker*, dst) &
// handler (handleSaveAdminEdit, handleToggleVerify, dst) tetep dikelola
// di DataSiswaInduk.js, di sini cuma diterima lewat props.
// LOGIC-NYA GAK BERUBAH SAMA SEKALI dari versi lama, cuma dipindah ke sini
// apa adanya.
// ========================================================================
import {
  CheckCircle2,
  Search,
  X,
  ShieldCheck,
  ShieldAlert,
  Pencil,
  Loader2,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { REQUIRED_FIELDS } from "../../utils/studentProfileCompletion";
import {
  STATUS_META,
  DETAIL_ROWS,
  ADMIN_EDIT_SECTIONS,
  ADMIN_EDIT_FIELDS,
  getDetailRowValue,
} from "./DataSiswaIndukConfig";

// Sama kayak di DataSiswaInduk.js (nilainya emang konstan, gak pernah
// berubah) -- dipake picker "Pilih Siswa" buat mbatesin hasil pencarian.
const PICKER_LIMIT = 30;

export default function DataSiswaIndukDetailPanel({
  activePageTab,
  setActivePageTab,
  selectedStudent,
  isAdmin,
  isTU,
  isWaliKelas,
  prevStudent,
  nextStudent,
  goToAdjacentStudent,
  handleToggleVerify,
  verifying,
  goToDataSiswa,
  backToList,
  mutationHistory,
  mutationHistoryLoading,
  pickerQuery,
  setPickerQuery,
  pickerJenjang,
  setPickerJenjang,
  pickerClass,
  setPickerClass,
  pickerMatches,
  jenjangOptions,
  pickerFilteredClassOptions,
  waliKelasStudents,
  selectStudentInTab,
  adminForm,
  setAdminForm,
  setAdminFormDirty,
  setSaveSuccessVisible,
  saveSuccessVisible,
  adminEditError,
  savingAdmin,
  handleSaveAdminEdit,
}) {
  // ✅ NEW: card "Pilih Siswa" yang muncul di tab Isi Data/Preview kalau
  // belum ada selectedStudent (misal user langsung klik tab-nya tanpa
  // milih siswa dulu dari list). Search-nya lokal (pickerQuery), baru
  // nampilin hasil kalau udah ngetik sesuatu.
  const renderStudentPicker = () => (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-md p-4 sm:p-5 border border-slate-100 dark:border-slate-700">
      <p className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-200 mb-3">
        Pilih siswa dulu buat {activePageTab === "isi" ? "isi datanya" : "liat preview-nya"}.
      </p>
      {/* ✅ UPDATED: layout filter disamain sama tab "Data Siswa" --
          khusus HP (< sm): baris 1 = Cari Siswa (kotak label+input nyatu,
          full width), baris 2 = Pilih Jenjang & Pilih Kelas sejajar 2
          kolom sama lebar (grid-cols-2). Di sm ke atas tetap pakai
          flex-wrap kayak semula. */}
      <div className="mb-3">
        {/* Mobile (< sm) */}
        <div className="sm:hidden flex flex-col gap-2.5">
          <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 flex items-center gap-2.5 focus-within:ring-2 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-900 focus-within:border-indigo-300 transition">
            <Search size={16} className="text-slate-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 leading-tight">
                Cari Siswa
              </label>
              <input
                type="text"
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                placeholder="Nama atau NIS..."
                autoFocus
                className="w-full text-sm bg-transparent border-0 p-0 py-0.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-0"
              />
            </div>
          </div>

          {/* ✅ NEW: dropdown "Pilih Nama" KHUSUS Wali Kelas -- alternatif
              buat Cari Siswa di atas (ketik nama/NIS). Karena Wali Kelas
              cuma liat 1 kelas (udah di-scope dari fetch data), daftar
              nama di dropdown ini pasti muat & gak perlu Jenjang/Kelas
              filter kayak Admin/TU. Milih langsung dari dropdown ==
              selectStudentInTab(), sama kayak klik dari hasil pencarian di
              bawah. */}
          {isWaliKelas && waliKelasStudents.length > 0 && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-900 focus-within:border-indigo-300 transition">
              <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 leading-tight">
                Pilih Nama
              </label>
              <select
                value=""
                onChange={(e) => {
                  const student = waliKelasStudents.find((r) => String(r.id) === e.target.value);
                  if (student) selectStudentInTab(student);
                }}
                className="w-full text-sm bg-transparent border-0 p-0 py-0.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-0"
              >
                <option value="">Pilih siswa dari daftar...</option>
                {waliKelasStudents.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.full_name} ({r.nis || "-"})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ✅ Disembunyiin buat Wali Kelas -- kelasnya udah pasti cuma 1
              (di-scope lewat homeroom_class_id), jadi dropdown Jenjang/Kelas
              di sini gak ada gunanya (isinya cuma "Semua" + 1 opsi doang). */}
          {!isWaliKelas && (jenjangOptions.length > 0 || pickerFilteredClassOptions.length > 0) && (
            <div className="grid grid-cols-2 gap-2.5">
              {jenjangOptions.length > 0 && (
                <div
                  className={`rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-900 focus-within:border-indigo-300 transition ${
                    pickerFilteredClassOptions.length === 0 ? "col-span-2" : ""
                  }`}
                >
                  <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 leading-tight">
                    Pilih Jenjang
                  </label>
                  <select
                    value={pickerJenjang}
                    onChange={(e) => {
                      setPickerJenjang(e.target.value);
                      setPickerClass("all");
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

              {pickerFilteredClassOptions.length > 0 && (
                <div
                  className={`rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-900 focus-within:border-indigo-300 transition ${
                    jenjangOptions.length === 0 ? "col-span-2" : ""
                  }`}
                >
                  <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 leading-tight">
                    Pilih Kelas
                  </label>
                  <select
                    value={pickerClass}
                    onChange={(e) => setPickerClass(e.target.value)}
                    className="w-full text-sm bg-transparent border-0 p-0 py-0.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-0"
                  >
                    <option value="all">Semua Kelas</option>
                    {pickerFilteredClassOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        Kelas {c.id}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tablet/Desktop (sm ke atas) -- tetap seperti semula */}
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
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                placeholder="Nama atau NIS..."
                autoFocus
                className="w-full text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 focus:border-indigo-300"
              />
            </div>
          </div>

          {/* ✅ NEW: dropdown "Pilih Nama" KHUSUS Wali Kelas -- sama kayak
              versi mobile di atas. */}
          {isWaliKelas && waliKelasStudents.length > 0 && (
            <div className="shrink-0 min-w-[200px]">
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Pilih Nama
              </label>
              <select
                value=""
                onChange={(e) => {
                  const student = waliKelasStudents.find((r) => String(r.id) === e.target.value);
                  if (student) selectStudentInTab(student);
                }}
                className="w-full text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
              >
                <option value="">Pilih siswa dari daftar...</option>
                {waliKelasStudents.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.full_name} ({r.nis || "-"})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ✅ Disembunyiin buat Wali Kelas -- sama alasannya kayak versi
              mobile di atas (kelasnya udah fix 1, filter jadi percuma). */}
          {!isWaliKelas && jenjangOptions.length > 0 && (
            <div className="shrink-0 min-w-[130px]">
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Pilih Jenjang
              </label>
              <select
                value={pickerJenjang}
                onChange={(e) => {
                  setPickerJenjang(e.target.value);
                  // Reset filter Kelas tiap ganti Jenjang, sama kayak
                  // perilaku dropdown Jenjang di tab "Data Siswa".
                  setPickerClass("all");
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

          {!isWaliKelas && pickerFilteredClassOptions.length > 0 && (
            <div className="shrink-0 min-w-[140px]">
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Pilih Kelas
              </label>
              <select
                value={pickerClass}
                onChange={(e) => setPickerClass(e.target.value)}
                className="w-full text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
              >
                <option value="all">Semua Kelas</option>
                {pickerFilteredClassOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    Kelas {c.id}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
        {pickerMatches.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">
            {pickerQuery.trim() || pickerJenjang !== "all" || pickerClass !== "all"
              ? "Gak ada siswa yang cocok."
              : "Mulai ketik atau pilih jenjang/kelas buat cari siswa dari daftar."}
          </p>
        ) : (
          pickerMatches.map((r) => {
            const meta = STATUS_META[r.status];
            const Icon = meta?.icon;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => selectStudentInTab(r)}
                className="w-full flex items-center justify-between gap-3 px-2 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition"
              >
                <span className="min-w-0">
                  <span className="block text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {r.full_name}
                  </span>
                  <span className="block text-xs text-slate-400 dark:text-slate-500">
                    {r.nis} · {r.class_id}
                  </span>
                </span>
                {meta && (
                  <span
                    className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${meta.badge}`}
                  >
                    {Icon && <Icon size={12} />}
                    {meta.label}
                  </span>
                )}
              </button>
            );
          })
        )}
        {pickerMatches.length === PICKER_LIMIT && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center pt-2">
            Hasil dibatasi {PICKER_LIMIT} siswa teratas -- perhalus kata kunci pencarian kalau
            siswanya belum keliatan.
          </p>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ====== HEADER SISWA TERPILIH ====== */}
      {/* Dipake bareng sama tab "Isi Data" & "Preview" -- nampilin siapa
          yang lagi dibuka, status kelengkapan & verifikasi, tombol
          verifikasi (admin only), sama tombol balik ke list. Ganti dari
          header modal yang lama, sekarang jadi bagian halaman biasa. */}
      {selectedStudent && (activePageTab === "isi" || activePageTab === "preview") && (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-md p-4 border border-slate-100 dark:border-slate-700 mb-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-6 sm:gap-8 min-w-0">
              {/* Tombol geser ke siswa SEBELUMNYA (sesuai urutan list yang
                  lagi difilter). Dibikin gede & kontras (lingkaran solid,
                  bukan cuma ikon kecil polos) biar jelas keliatan & gampang
                  dipencet, terutama di HP. Disabled otomatis kalau udah di
                  siswa paling awal. */}
              <button
                type="button"
                onClick={() => goToAdjacentStudent("prev")}
                disabled={!prevStudent}
                title={
                  prevStudent
                    ? `Siswa sebelumnya: ${prevStudent.full_name}`
                    : "Sudah siswa paling awal"
                }
                className="shrink-0 inline-flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-indigo-600 text-white shadow-md hover:bg-indigo-700 active:scale-95 transition disabled:opacity-25 disabled:pointer-events-none disabled:shadow-none"
              >
                <ChevronLeft size={26} strokeWidth={2.75} />
              </button>

              <div className="min-w-0">
                <p className="text-lg font-bold text-slate-900 dark:text-white truncate">
                  {selectedStudent.full_name}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                  NIS {selectedStudent.nis || "-"} · Kelas {selectedStudent.class_id || "-"}
                </p>
                {/* Status kelengkapan, status verifikasi, & tombol verifikasi
                  digabung jadi 1 baris (wrap kalau kepotong di layar
                  sempit) -- lebih ringkas & enak diliat berkali-kali
                  dibanding numpuk ke bawah, apalagi TU bakal buka ratusan
                  siswa jadi UI-nya kudu betah dipandang. */}
                <div className="flex flex-wrap items-center gap-2">
                  {(() => {
                    const meta = STATUS_META[selectedStudent.status];
                    const StatusIcon = meta.icon;
                    return (
                      <span
                        className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full shadow-sm ${meta.badge}`}
                      >
                        <StatusIcon size={14} />
                        {meta.label}
                      </span>
                    );
                  })()}
                  <span
                    className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full shadow-sm ${
                      selectedStudent.isVerified
                        ? "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                    }`}
                  >
                    {selectedStudent.isVerified ? (
                      <ShieldCheck size={14} />
                    ) : (
                      <ShieldAlert size={14} />
                    )}
                    {selectedStudent.isVerified ? "Terverifikasi Admin" : "Belum Diverifikasi"}
                  </span>
                  {/* Tombol verifikasi cuma buat admin/TU -- wali kelas/guru
                    BK liat status ini tapi gak nge-verifikasi (cocokin ke
                    dokumen fisik itu tugas TU/admin sekolah). */}
                  {(isAdmin || isTU) && selectedStudent.detail && (
                    <button
                      onClick={() =>
                        handleToggleVerify(selectedStudent.id, !selectedStudent.isVerified)
                      }
                      disabled={verifying}
                      className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full shadow-sm disabled:opacity-60 disabled:hover:scale-100 hover:scale-105 active:scale-95 transition-transform ${
                        selectedStudent.isVerified
                          ? "text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
                          : "text-white bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-700 hover:to-sky-600"
                      }`}
                    >
                      {selectedStudent.isVerified ? (
                        <>
                          <ShieldAlert size={14} />
                          {verifying ? "Menyimpan..." : "Batalkan Verifikasi"}
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={14} />
                          {verifying ? "Menyimpan..." : "Tandai Terverifikasi"}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Tombol geser ke siswa BERIKUTNYA -- sama persis gayanya
                  kayak tombol sebelumnya di atas biar konsisten. */}
              <button
                type="button"
                onClick={() => goToAdjacentStudent("next")}
                disabled={!nextStudent}
                title={
                  nextStudent
                    ? `Siswa berikutnya: ${nextStudent.full_name}`
                    : "Sudah siswa paling akhir"
                }
                className="shrink-0 inline-flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-indigo-600 text-white shadow-md hover:bg-indigo-700 active:scale-95 transition disabled:opacity-25 disabled:pointer-events-none disabled:shadow-none"
              >
                <ChevronRight size={26} strokeWidth={2.75} />
              </button>
            </div>
            <div className="shrink-0 flex flex-wrap items-center gap-2">
              <button
                onClick={goToDataSiswa}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-3 py-2 rounded-lg transition"
              >
                <ArrowUpRight size={15} />
                Buka di Data Siswa
              </button>
              <button
                onClick={backToList}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 px-3 py-2 rounded-lg transition"
              >
                <X size={15} />
                Kembali ke Data Siswa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Riwayat mutasi (masuk/keluar) -- cuma nongol kalau siswa ini
          emang punya catatan mutasi. Siswa reguler yang gak pernah
          keluar/pindah gak bakal liat card ini sama sekali. */}
      {selectedStudent &&
        (activePageTab === "isi" || activePageTab === "preview") &&
        (mutationHistoryLoading || mutationHistory.length > 0) && (
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-md p-4 border border-slate-100 dark:border-slate-700 mb-4">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
              Riwayat Mutasi
            </p>
            {mutationHistoryLoading ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">Memuat...</p>
            ) : (
              <div className="space-y-2">
                {mutationHistory.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-start gap-2 text-sm p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/40"
                  >
                    <span
                      className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        m.type === "masuk"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                      }`}
                    >
                      {m.type === "masuk" ? "Masuk" : "Keluar"}
                    </span>
                    <div className="min-w-0">
                      <p className="text-slate-700 dark:text-slate-200">
                        {m.mutation_date
                          ? new Date(m.mutation_date).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })
                          : "-"}
                        {m.type === "masuk" && m.sekolah_asal && <> · dari {m.sekolah_asal}</>}
                        {m.type === "keluar" && m.sekolah_tujuan && <> · ke {m.sekolah_tujuan}</>}
                      </p>
                      {m.keterangan && (
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                          {m.keterangan}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      {/* ====== TAB "ISI DATA" (admin & TU doang -- wali kelas gak dikasih
          akses isi/edit, cuma "Data Siswa" & "Preview" read-only). Tab
          bar-nya sendiri udah disembunyiin buat wali kelas di
          DataSiswaInduk.js, ini cuma defense-in-depth. ====== */}
      {activePageTab === "isi" && !selectedStudent && (isAdmin || isTU) && renderStudentPicker()}
      {activePageTab === "isi" && selectedStudent && (isAdmin || isTU) && (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-md p-4 sm:p-5 border border-slate-100 dark:border-slate-700">
          <form onSubmit={handleSaveAdminEdit} className="space-y-3">
            {adminEditError && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-3 py-2 rounded-lg text-sm">
                {adminEditError}
              </div>
            )}
            {saveSuccessVisible && (
              <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                <CheckCircle2 size={16} />
                Data berhasil disimpan.
              </div>
            )}

            <div className="space-y-4">
              {Object.entries(ADMIN_EDIT_SECTIONS).map(([sectionKey, sectionLabel]) => {
                const sectionFields = ADMIN_EDIT_FIELDS.filter((f) => f.section === sectionKey);
                if (sectionFields.length === 0) return null;
                return (
                  <div key={sectionKey}>
                    <p className="text-xs font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400 mb-2">
                      {sectionLabel}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                      {sectionFields.map(({ key, label, type, options }) => {
                        const fieldInputClass =
                          "w-full text-sm sm:text-base border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/40 focus:border-indigo-400 transition";
                        const wrapperClass = type === "textarea" ? "sm:col-span-2" : "";
                        const value = adminForm?.[key] ?? "";
                        const onChange = (v) => {
                          setAdminForm((f) => ({ ...f, [key]: v }));
                          setAdminFormDirty(true);
                          setSaveSuccessVisible(false);
                        };
                        // Tanda field yang ikut nentuin status
                        // Lengkap/Sebagian/Belum (REQUIRED_FIELDS), biar
                        // TU tau mana yang prioritas.
                        const isRequired = REQUIRED_FIELDS.includes(key);
                        // Kalau field-nya select & isian yang udah
                        // kesimpen sebelumnya BUKAN salah satu opsi
                        // standar (misal ketikan bebas dari sebelum ada
                        // dropdown, kayak "BURUH HARIAN LEPAS"), tetep
                        // munculin sebagai 1 opsi ekstra di paling atas
                        // -- biar keliatan & gak ke-reset ke kosong
                        // gara-gara gak match ke list baru.
                        const hasLegacyValue =
                          type === "select" && value && !options.includes(value);

                        return (
                          <div key={key} className={wrapperClass}>
                            <label className="block text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-200 mb-1 sm:mb-1.5">
                              {label}
                              {isRequired && (
                                <span
                                  className="text-rose-500 ml-0.5"
                                  title="Wajib diisi untuk status Lengkap"
                                >
                                  *
                                </span>
                              )}
                            </label>
                            {type === "select" ? (
                              <select
                                value={value}
                                onChange={(e) => onChange(e.target.value)}
                                className={fieldInputClass}
                              >
                                <option value="">Pilih {label.toLowerCase()}</option>
                                {hasLegacyValue && (
                                  <option value={value}>{value} (isian lama)</option>
                                )}
                                {options.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : type === "textarea" ? (
                              <textarea
                                rows={2}
                                value={value}
                                onChange={(e) => onChange(e.target.value)}
                                className={fieldInputClass}
                              />
                            ) : (
                              <input
                                type={type}
                                value={value}
                                onChange={(e) => onChange(e.target.value)}
                                className={fieldInputClass}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                <span className="text-rose-500">*</span> wajib diisi biar status kelengkapan siswa
                jadi "Lengkap".
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={backToList}
                className="flex-1 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 py-2.5 rounded-lg"
              >
                Kembali ke Data Siswa
              </button>
              <button
                type="submit"
                disabled={savingAdmin}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-60"
              >
                {savingAdmin && <Loader2 size={16} className="animate-spin" />}
                {savingAdmin ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ====== TAB "PREVIEW" ====== */}
      {/* Read-only, sumbernya `adminForm` (sama kayak yang dipake tab Isi
          Data) -- buat admin ini ngikutin isian yang lagi diketik (live,
          belum tentu kesimpen), buat wali kelas/guru BK (gak pernah nyentuh
          tab Isi Data) otomatis nampilin data tersimpan apa adanya.
          Layout tabel 2 kolom (Field | Isian) SENGAJA disamain gayanya
          kayak DataSiswaIndukPDF.js -- kolom bener-bener sejajar (bukan
          teks nyambung), biar konsisten sama hasil export PDF/Excel yang
          udah familiar buat TU. */}
      {activePageTab === "preview" && !selectedStudent && renderStudentPicker()}
      {activePageTab === "preview" && selectedStudent && (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-md p-4 sm:p-5 border border-slate-100 dark:border-slate-700 overflow-x-auto">
          {adminForm ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-300 dark:border-slate-600">
                  <th className="py-2 pr-4 text-sm sm:text-base font-bold text-slate-700 dark:text-slate-200 w-[42%] sm:w-1/3">
                    Field
                  </th>
                  <th className="py-2 text-sm sm:text-base font-bold text-slate-700 dark:text-slate-200">
                    Isian
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Nama", value: selectedStudent.full_name },
                  { label: "NIS", value: selectedStudent.nis },
                  { label: "Kelas", value: selectedStudent.class_id },
                  ...DETAIL_ROWS.map(({ key, label, combine }) => ({
                    label,
                    value: getDetailRowValue(adminForm, { key, combine }),
                  })),
                  {
                    label: "Status Kelengkapan",
                    value: STATUS_META[selectedStudent.status]?.label,
                  },
                ].map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-100 dark:border-slate-700">
                    <td className="py-2.5 pr-4 align-top text-sm sm:text-base font-medium text-slate-600 dark:text-slate-300">
                      {row.label}
                    </td>
                    <td className="py-2.5 align-top text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-50 break-words">
                      {row.value || (
                        <span className="text-rose-600 dark:text-rose-400 font-semibold">
                          Belum diisi
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          {adminForm && (selectedStudent.detail?.updated_at || selectedStudent.verifiedAt) && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 space-y-1">
              {selectedStudent.detail?.updated_at && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Terakhir diperbarui:{" "}
                  {new Date(selectedStudent.detail.updated_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
              {selectedStudent.verifiedAt && (
                <p className="text-sm text-sky-700 dark:text-sky-400">
                  Diverifikasi oleh Admin:{" "}
                  {new Date(selectedStudent.verifiedAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          )}
          {!adminForm && (
            <div className="text-center py-4 space-y-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Siswa ini belum pernah mengisi data tambahan sama sekali.
              </p>
              {(isAdmin || isTU) && (
                <button
                  onClick={() => setActivePageTab("isi")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition"
                >
                  <Pencil size={14} />
                  Isi Data Sekarang
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
