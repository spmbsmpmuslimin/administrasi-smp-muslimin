// StudentModals.js
import React from "react";
import { X, Users } from "lucide-react";

// ✅ FUNGSI MODAL SISWA (FIX DELAY)
const StudentModal = ({
  modal,
  setModal,
  form,
  setForm,
  loading,
  availableClasses,
  onSubmit,
  onCancel,
}) => {
  const firstInputRef = React.useRef(null);

  React.useEffect(() => {
    if (modal.show && firstInputRef.current) {
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 100);
    }
  }, [modal.show]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4 transition-colors duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto transition-colors duration-200 border border-gray-200 dark:border-gray-700">
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white p-5 sm:p-6 rounded-t-2xl flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Users size={20} className="sm:size-24" />
            <div>
              <h2 className="text-lg sm:text-xl font-bold">
                {modal.mode === "add" ? "Tambah Siswa" : "Edit Siswa"}
              </h2>
              <p className="text-green-100 text-xs sm:text-sm">SMP Muslimin Cililin</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 sm:p-2 hover:bg-green-700 rounded-lg transition-colors"
            aria-label="Tutup modal"
          >
            <X size={18} className="sm:size-20" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {/* ✅ NIS INPUT - FIX DELAY */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              NIS *
            </label>
            <input
              ref={firstInputRef}
              type="text"
              value={form.nis}
              onChange={(e) => setForm((prev) => ({ ...prev, nis: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-3 focus:ring-green-500/50 focus:border-green-500 dark:focus:ring-green-400/50 focus:outline-none transition-all bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white"
              placeholder="Masukkan NIS siswa"
              required
            />
          </div>

          {/* ✅ NAMA INPUT - FIX DELAY */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Nama Siswa *
            </label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-3 focus:ring-green-500/50 focus:border-green-500 dark:focus:ring-green-400/50 focus:outline-none transition-all bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white"
              placeholder="Masukkan nama lengkap siswa"
              required
            />
          </div>

          {/* ✅ GENDER SELECT - FIX DELAY */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Jenis Kelamin *
            </label>
            <select
              value={form.gender}
              onChange={(e) => setForm((prev) => ({ ...prev, gender: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-3 focus:ring-green-500/50 focus:border-green-500 dark:focus:ring-green-400/50 focus:outline-none transition-all bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white"
              required
            >
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>

          {/* ✅ KELAS SELECT - FIX DELAY */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Kelas *
            </label>
            <select
              value={form.class_id}
              onChange={(e) => setForm((prev) => ({ ...prev, class_id: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-3 focus:ring-green-500/50 focus:border-green-500 dark:focus:ring-green-400/50 focus:outline-none transition-all bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white"
              required
            >
              <option value="">Pilih Kelas</option>
              {availableClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  Kelas {cls.id}
                </option>
              ))}
            </select>
          </div>

          {/* ✅ ACTIVE CHECKBOX - FIX DELAY */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
              className="rounded border-gray-300 dark:border-gray-600 text-green-600 dark:text-green-400 focus:ring-green-500 dark:focus:ring-green-400 transition-colors size-5"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Siswa Aktif
            </span>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onSubmit}
              disabled={loading || !form.nis || !form.full_name || !form.class_id}
              className="flex-1 px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 dark:from-green-700 dark:hover:from-green-800 dark:hover:to-emerald-800 text-white rounded-xl disabled:opacity-50 font-semibold transition-all active:scale-[0.98] min-h-[44px] shadow-md hover:shadow-lg"
            >
              {loading ? "Menyimpan..." : modal.mode === "add" ? "Tambah Siswa" : "Update Siswa"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-5 py-3 bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:from-gray-400 hover:to-gray-500 dark:hover:from-gray-700 dark:hover:to-gray-800 disabled:opacity-50 transition-all active:scale-[0.98] min-h-[44px] shadow-md font-semibold"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DeleteConfirmModal = ({ confirm, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4 transition-colors duration-200">
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md transition-colors duration-200 border border-gray-200 dark:border-gray-700">
      <div className="bg-gradient-to-r from-red-100 to-red-50 dark:from-red-900/20 dark:to-red-900/10 border-b border-red-200 dark:border-red-800 p-5 sm:p-6 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <X className="text-red-600 dark:text-red-400" size={24} />
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-red-800 dark:text-red-300">
              Konfirmasi Hapus
            </h2>
            <p className="text-red-600 dark:text-red-400 text-xs sm:text-sm">
              Data siswa akan dihapus permanen
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Apakah Anda yakin ingin menghapus siswa{" "}
          <strong className="text-red-600 dark:text-red-400">{confirm.data?.full_name}</strong>?
        </p>
        <p className="text-sm text-red-600 dark:text-red-400 mb-6 font-medium">
          ⚠️ Tindakan ini tidak dapat dibatalkan!
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-5 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 dark:from-red-700 dark:hover:from-red-800 dark:hover:to-red-900 text-white rounded-xl disabled:opacity-50 font-semibold transition-all active:scale-[0.98] min-h-[44px] shadow-md hover:shadow-lg"
          >
            {loading ? "Menghapus..." : "Ya, Hapus"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-5 py-3 bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:from-gray-400 hover:to-gray-500 dark:hover:from-gray-700 dark:hover:to-gray-800 disabled:opacity-50 transition-all active:scale-[0.98] min-h-[44px] shadow-md font-semibold"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  </div>
);

export { StudentModal, DeleteConfirmModal };
