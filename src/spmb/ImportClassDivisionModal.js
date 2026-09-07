import React, { useState } from "react";
import { importClassDivision } from "./SpmbExcel";
import { commitClassDivisionImport } from "./ClassOperations";

/**
 * 📥 Modal Import Pembagian Kelas (revisi)
 * Alur: upload file -> parse+diff (importClassDivision, read-only) ->
 * preview (cuma baris "changed" & "error" yang ditonjolkan, "unchanged"
 * disembunyikan biar gak berisik) -> TU klik "Terapkan Perubahan" ->
 * commitClassDivisionImport nulis cuma baris "changed" ke database.
 *
 * Dipasang di tab "Pembagian Kelas" (ClassDivision.js), buat kasus revisi
 * kecil pasca pembagian awal (misal orang tua minta pindah kelas) tanpa
 * TU harus edit satu-satu manual di UI.
 */
const ImportClassDivisionModal = ({
  isOpen,
  onClose,
  allStudents,
  validClassNames,
  supabase,
  setIsLoading,
  isLoading,
  showToast,
  onRefreshData,
  confirm,
}) => {
  const [file, setFile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [showUnchanged, setShowUnchanged] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setFile(null);
    setImportResult(null);
    setShowUnchanged(false);
    setSuccessInfo(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleFileChange = (e) => {
    setFile(e.target.files?.[0] || null);
    setImportResult(null);
  };

  const handleParse = async () => {
    if (!file) {
      showToast("Pilih file Excel dulu", "error");
      return;
    }
    setIsParsing(true);
    try {
      const result = await importClassDivision(file, allStudents, validClassNames);
      setImportResult(result);
      if (!result.success) {
        showToast("❌ Gagal membaca file import", "error");
      }
    } catch (error) {
      console.error("Error parsing class division import:", error);
      showToast("❌ Gagal membaca file: " + error.message, "error");
    } finally {
      setIsParsing(false);
    }
  };

  const handleCommit = async () => {
    if (!importResult) return;
    const changedRows = importResult.rows.filter((r) => r.status === "changed");

    if (confirm) {
      const ok = await confirm({
        title: "Terapkan Perubahan Kelas",
        message: `Terapkan ${changedRows.length} perubahan kelas dari file ini? Perubahan akan langsung tersimpan ke database.`,
        confirmText: "Ya, Terapkan",
      });
      if (!ok) return;
    }

    const success = await commitClassDivisionImport(
      changedRows,
      supabase,
      setIsLoading,
      showToast,
      onRefreshData
    );
    if (success) {
      // Jangan langsung tutup modal -- tampilin layar sukses DI DALAM
      // modal ini dulu, biar TU pasti lihat konfirmasinya, gak cuma
      // gantung ke toast global yang bisa aja "numpang lewat" doang kalau
      // modal keburu ke-unmount pas toast lagi muncul.
      setSuccessInfo({ count: changedRows.length });
    }
  };

  const errorRows = importResult ? importResult.rows.filter((r) => r.status === "error") : [];
  const changedRows = importResult ? importResult.rows.filter((r) => r.status === "changed") : [];
  const unchangedRows = importResult
    ? importResult.rows.filter((r) => r.status === "unchanged")
    : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden mx-2 sm:mx-4">
        <div className="bg-teal-600 dark:bg-teal-700 text-white p-3 sm:p-4 flex justify-between items-center">
          <h3 className="text-lg sm:text-xl font-bold">📥 Import Pembagian Kelas (Revisi)</h3>
          <button
            onClick={handleClose}
            className="text-white hover:bg-teal-700 dark:hover:bg-teal-600 rounded-full w-8 h-8 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-80px)] space-y-4">
          {successInfo ? (
            <div className="text-center py-8 sm:py-10">
              <div className="text-5xl sm:text-6xl mb-3">✅</div>
              <h4 className="text-lg sm:text-xl font-bold text-green-700 dark:text-green-400 mb-1">
                Berhasil Diterapkan!
              </h4>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-6">
                {successInfo.count} perubahan kelas sudah tersimpan ke database.
              </p>
              <button
                onClick={handleClose}
                className="px-6 py-2 sm:py-3 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 font-semibold text-sm min-h-[44px]"
              >
                Tutup
              </button>
            </div>
          ) : (
            <>
              <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-xs sm:text-sm text-blue-800 dark:text-blue-300">
                <p>
                  Pakai file hasil <strong>Export Kelas</strong> yang sudah direvisi manual (kolom
                  "Kelas" diubah untuk siswa yang pindah). Sistem cuma akan menerapkan baris yang{" "}
                  <strong>benar-benar berubah</strong> — bukan menimpa semua data.
                </p>
                <p className="mt-1">
                  Kolom <strong>"No. Pendaftaran"</strong> dipakai sebagai kunci pencocokan — jangan
                  diubah.
                </p>
              </div>

              {!importResult && (
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-start sm:items-center">
                  <input
                    type="file"
                    accept=".xlsx"
                    onChange={handleFileChange}
                    className="flex-1 text-xs sm:text-sm border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 w-full sm:w-auto"
                  />
                  <button
                    onClick={handleParse}
                    disabled={!file || isParsing}
                    className="px-4 py-2 bg-teal-600 dark:bg-teal-700 text-white rounded-lg hover:bg-teal-700 dark:hover:bg-teal-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed font-medium text-sm min-h-[40px] whitespace-nowrap"
                  >
                    {isParsing ? "Membaca..." : "🔍 Baca & Bandingkan"}
                  </button>
                </div>
              )}

              {importResult && (
                <div className="space-y-4">
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2 sm:p-3 text-center">
                      <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                        {changedRows.length}
                      </div>
                      <div className="text-xs text-green-800 dark:text-green-300">
                        Perubahan Terdeteksi
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-2 sm:p-3 text-center">
                      <div className="text-xl sm:text-2xl font-bold text-gray-600 dark:text-gray-300">
                        {unchangedRows.length}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Tidak Berubah</div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2 sm:p-3 text-center">
                      <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
                        {errorRows.length}
                      </div>
                      <div className="text-xs text-red-800 dark:text-red-300">Error</div>
                    </div>
                  </div>

                  {/* Missing from file warning */}
                  {importResult.missingFromFile.length > 0 && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-xs sm:text-sm text-yellow-800 dark:text-yellow-300">
                      <p className="font-semibold mb-1">
                        ⚠️ {importResult.missingFromFile.length} siswa tidak ditemukan di file ini
                        (kelas mereka TIDAK diubah):
                      </p>
                      <p className="truncate">
                        {importResult.missingFromFile.map((s) => s.nama_lengkap).join(", ")}
                      </p>
                    </div>
                  )}

                  {/* Changed rows table */}
                  {changedRows.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2 dark:text-gray-100">
                        🔄 Perubahan yang akan diterapkan
                      </h4>
                      <div className="overflow-x-auto border dark:border-gray-700 rounded-lg">
                        <table className="w-full text-xs sm:text-sm">
                          <thead className="bg-gray-100 dark:bg-gray-700">
                            <tr>
                              <th className="p-2 text-left">Nama</th>
                              <th className="p-2 text-center">Dari</th>
                              <th className="p-2 text-center"></th>
                              <th className="p-2 text-center">Ke</th>
                              <th className="p-2 text-center">Catatan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {changedRows.map((row) => (
                              <tr
                                key={row.no_pendaftaran}
                                className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                              >
                                <td className="p-2 font-medium dark:text-gray-100">
                                  {row.nama_lengkap}
                                </td>
                                <td className="p-2 text-center text-gray-500 dark:text-gray-400">
                                  {row.kelasLama}
                                </td>
                                <td className="p-2 text-center text-gray-400">→</td>
                                <td className="p-2 text-center font-semibold text-green-600 dark:text-green-400">
                                  {row.kelasBaru}
                                </td>
                                <td className="p-2 text-center">
                                  {row.hasNis && (
                                    <span
                                      className="text-xs text-amber-700 dark:text-amber-400"
                                      title="Sudah punya NIS -- aman diubah, tapi generate ulang NIS setelah ini kalau urutannya kepengin tetap rapi."
                                    >
                                      ℹ️ sudah ber-NIS
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Error rows table */}
                  {errorRows.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2 text-red-700 dark:text-red-400">
                        ❌ Baris bermasalah (tidak akan diterapkan)
                      </h4>
                      <div className="overflow-x-auto border border-red-200 dark:border-red-800 rounded-lg">
                        <table className="w-full text-xs sm:text-sm">
                          <thead className="bg-red-50 dark:bg-red-900/20">
                            <tr>
                              <th className="p-2 text-left">Baris</th>
                              <th className="p-2 text-left">No. Pendaftaran</th>
                              <th className="p-2 text-left">Nama</th>
                              <th className="p-2 text-left">Masalah</th>
                            </tr>
                          </thead>
                          <tbody>
                            {errorRows.map((row, idx) => (
                              <tr
                                key={idx}
                                className="border-t border-red-100 dark:border-red-900/40"
                              >
                                <td className="p-2 text-gray-500 dark:text-gray-400">
                                  {row.rowNumber || "-"}
                                </td>
                                <td className="p-2 dark:text-gray-100">
                                  {row.no_pendaftaran || "-"}
                                </td>
                                <td className="p-2 dark:text-gray-100">
                                  {row.nama_lengkap || "-"}
                                </td>
                                <td className="p-2 text-red-700 dark:text-red-400">
                                  {row.errors.join("; ")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Unchanged rows, collapsed by default */}
                  {unchangedRows.length > 0 && (
                    <div>
                      <button
                        onClick={() => setShowUnchanged((v) => !v)}
                        className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:underline"
                      >
                        {showUnchanged ? "▼" : "▶"} {unchangedRows.length} siswa tidak berubah (klik
                        untuk lihat)
                      </button>
                      {showUnchanged && (
                        <div className="mt-2 max-h-32 overflow-y-auto border dark:border-gray-700 rounded-lg p-2 text-xs text-gray-500 dark:text-gray-400">
                          {unchangedRows.map((r) => r.nama_lengkap).join(", ")}
                        </div>
                      )}
                    </div>
                  )}

                  {changedRows.length === 0 && errorRows.length === 0 && (
                    <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                      Tidak ada perubahan terdeteksi di file ini.
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 border-t dark:border-gray-700">
                    <button
                      onClick={handleCommit}
                      disabled={changedRows.length === 0 || isLoading}
                      className="flex-1 px-4 py-2 sm:py-3 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed font-semibold text-sm min-h-[44px]"
                    >
                      ✅ Terapkan {changedRows.length > 0 ? `${changedRows.length} Perubahan` : ""}
                    </button>
                    <button
                      onClick={handleReset}
                      disabled={isLoading}
                      className="px-4 py-2 sm:py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium text-sm min-h-[44px]"
                    >
                      🔄 Coba File Lain
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportClassDivisionModal;
