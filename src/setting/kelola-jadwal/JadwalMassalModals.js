// setting/kelola-jadwal/JadwalMassalModals.js
// Dua modal punya AdminJadwalMassal.js (Confirm Publish & Quick Map kode
// error), dipecah jadi komponen sendiri biar AdminJadwalMassal.js gak
// kepanjangan. Murni presentational -- semua state & handler tetep dipegang
// sama hook `useJadwalMassalLogic`, di sini cuma nerima lewat props.
import React from "react";
import { Rocket, ClipboardList, Users, Loader2, X } from "lucide-react";

export default function JadwalMassalModals({
  // Confirm Publish
  confirmPublishOpen,
  setConfirmPublishOpen,
  sourceFileName,
  pendingPublishClassIds,
  runPublish,
  publishing,
  // Quick Map
  quickMapCode,
  setQuickMapCode,
  handleQuickMapSubmit,
  quickMapForm,
  setQuickMapForm,
  quickMapSaving,
}) {
  return (
    <>
      {/* Modal konfirmasi Publish -- custom (bukan window.confirm), lebih
          gede & ada warna biar admin gak asal klik OK tanpa baca. */}
      {confirmPublishOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-theme-bg rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Header gradient mencolok */}
            <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 px-6 py-5 flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/25 flex items-center justify-center shrink-0">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white leading-tight">
                  Konfirmasi Publish Jadwal
                </h2>
                <p className="text-sm text-orange-50">File: {sourceFileName}</p>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 rounded-2xl p-4">
                <p className="text-base font-semibold text-orange-800 dark:text-orange-300">
                  Ini akan MENGGANTI jadwal aktif untuk {pendingPublishClassIds.length} kelas:
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {pendingPublishClassIds.map((id) => (
                    <span
                      key={id}
                      className="px-2.5 py-1 rounded-lg bg-orange-200/70 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300 text-sm font-semibold"
                    >
                      {id}
                    </span>
                  ))}
                </div>
              </div>

              <p className="text-sm font-semibold text-theme-secondary uppercase tracking-wide">
                2 hal yang bakal langsung keupdate:
              </p>

              <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-2xl p-4">
                <ClipboardList className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-base font-bold text-blue-800 dark:text-blue-300">
                    Jadwal Kelas
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-400 mt-0.5">
                    Wali kelas & portal siswa langsung liat perubahan ini, real-time.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 rounded-2xl p-4">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-base font-bold text-purple-800 dark:text-purple-300">
                    Penugasan Guru (teacher_assignments)
                  </p>
                  <p className="text-sm text-purple-700 dark:text-purple-400 mt-0.5">
                    Kombinasi guru + kelas + mapel baru otomatis ditambahin -- gak perlu isi manual
                    lagi.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setConfirmPublishOpen(false)}
                className="flex-1 px-4 py-3 rounded-2xl text-base font-semibold text-theme-secondary bg-theme-surface hover:bg-gray-200"
              >
                Batal
              </button>
              <button
                onClick={runPublish}
                disabled={publishing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-base font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:from-orange-300 disabled:to-amber-300 disabled:cursor-not-allowed shadow-lg shadow-orange-500/30"
              >
                {publishing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5" />
                    Ya, Publish Sekarang
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal quick-map kode error */}
      {quickMapCode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-theme-bg rounded-2xl shadow-xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-theme">Petakan kode "{quickMapCode}"</h2>
              <button
                onClick={() => setQuickMapCode(null)}
                className="text-gray-400 hover:text-theme-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleQuickMapSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-theme-secondary mb-1.5">
                  Nama Guru
                </label>
                <input
                  value={quickMapForm.teacher_name}
                  onChange={(e) =>
                    setQuickMapForm({
                      ...quickMapForm,
                      teacher_name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-theme-bg text-theme border border-theme rounded-xl text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-theme-secondary mb-1.5">
                  Mapel
                </label>
                <input
                  value={quickMapForm.subject}
                  onChange={(e) =>
                    setQuickMapForm({
                      ...quickMapForm,
                      subject: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-theme-bg text-theme border border-theme rounded-xl text-sm"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickMapCode(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-theme-secondary bg-theme-surface hover:bg-gray-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={quickMapSaving}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {quickMapSaving ? "Menyimpan..." : "Simpan & Decode Ulang"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
