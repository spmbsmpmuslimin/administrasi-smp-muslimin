// components/ui/ConfirmDialog.js
import React from "react";

// ⭐ Modal konfirmasi generik -- gantiin window.confirm() bawaan browser
// (tampilannya beda-beda tiap browser/OS, gak bisa di-style, keliatan
// murahan). Pemakaian normalnya BUKAN import komponen ini langsung, tapi
// lewat hook useConfirmDialog() (satu folder ini) yang ngurusin
// buka/tutup + promise resolve otomatis -- lihat contoh di situ.
//
// variant nentuin warna tombol konfirmasi & ikon:
//   - "default" (biru) -- aksi normal, misal simpan
//   - "warning"  (kuning) -- aksi yang nimpa/ubah data, tapi masih aman
//   - "danger"   (merah) -- aksi destruktif/gak gampang di-undo (reset, hapus)

const VARIANT_STYLES = {
  default: {
    icon: "❓",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    confirmBtn: "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600",
  },
  warning: {
    icon: "⚠️",
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    confirmBtn: "bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600",
  },
  danger: {
    icon: "🗑️",
    iconBg: "bg-red-100 dark:bg-red-900/30",
    confirmBtn: "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600",
  },
};

export default function ConfirmDialog({
  isOpen,
  title = "Konfirmasi",
  message = "",
  confirmText = "OK",
  cancelText = "Batal",
  variant = "default",
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  const style = VARIANT_STYLES[variant] || VARIANT_STYLES.default;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop -- klik di luar dialog = sama kayak klik Batal */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />

      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col items-center text-center gap-3">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl ${style.iconBg}`}
          >
            {style.icon}
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h3>
          {message && (
            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
              {message}
            </p>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-h-[44px]"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-lg text-white font-medium transition-colors min-h-[44px] ${style.confirmBtn}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
