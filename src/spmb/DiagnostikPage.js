import React, { useState, useMemo, useRef } from "react";
import { exportDiagnostikTemplate, importDiagnostikScores } from "./SpmbExcel";

// ============================================================
// DiagnostikPage.js
// LOKASI: D:\Aplikasi Produksi\Administrasi SMP Muslimin\src\spmb\
// (satu folder sama StudentList.js, StudentForm.js, SpmbExcel.js)
//
// FUNGSI: halaman utuh (bukan modal) buat input skor test diagnostik
// (akademik, baca latin, mengaji) ke SEMUA siswa sekaligus -- tabel
// yang tiap barisnya langsung bisa diedit inline, plus tombol
// Export Template & Import Excel yang manggil SpmbExcel.js.
//
// Dipicu dari tab baru "Skor Diagnostik" di navigasi SPMB.js
// (activeTab === "diagnostik"), BUKAN dari tombol di StudentList.js
// -- keputusan revisi karena input massal (24+ siswa) lebih enak di
// halaman penuh daripada buka-tutup modal satu-satu.
//
// CARA KERJA SAVE: sama kayak DiagnostikModal.js, halaman ini TIDAK
// connect ke Supabase langsung. Dia manggil prop `onSaveDiagnostik`
// yang di-pass dari SPMB.js (lihat saveDiagnostikScore di sana).
// ============================================================

const KATEGORI_OPTIONS = ["Lancar", "Cukup Lancar", "Kurang Lancar", "Belum Bisa"];

// Baseline mapping kategori -> angka, HARUS SAMA sama:
// - DiagnostikModal.js
// - DIAGNOSTIK_KATEGORI_OPTIONS di SpmbExcel.js
// - CHECK constraint di tabel siswa_baru
const KATEGORI_SCORE_MAP = {
  Lancar: 100,
  "Cukup Lancar": 70,
  "Kurang Lancar": 40,
  "Belum Bisa": 10,
};

const DiagnostikPage = ({ allStudents, onSaveDiagnostik, onRefreshData, showToast, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState("");
  // Perubahan yang BELUM disimpan, keyed by student.id.
  // { [studentId]: { skor_akademik?, kategori_baca_latin?, kategori_mengaji? } }
  const [edits, setEdits] = useState({});
  const [savingIds, setSavingIds] = useState({});
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  // Hasil parse importDiagnostikScores() sebelum di-"Terapkan"
  const [importPreview, setImportPreview] = useState(null);
  const fileInputRef = useRef(null);

  // Nilai yang ditampilkan di cell: edit lokal kalau ada, kalau nggak ambil
  // dari data siswa asli.
  const getFieldValue = (student, field) => {
    if (edits[student.id] && edits[student.id][field] !== undefined) {
      return edits[student.id][field];
    }
    return student[field] ?? "";
  };

  const updateEdit = (studentId, field, value) => {
    setEdits((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }));
  };

  const clearEdit = (studentId) => {
    setEdits((prev) => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
  };

  const isRowDirty = (studentId) => !!edits[studentId];
  const dirtyCount = Object.keys(edits).length;

  // Preview skor gabungan per baris, dihitung live dari nilai yang lagi
  // ditampilkan (termasuk edit yang belum disimpan).
  const computeSkorGabungan = (student) => {
    const akademikRaw = getFieldValue(student, "skor_akademik");
    const akademik = akademikRaw !== "" && akademikRaw !== null ? parseFloat(akademikRaw) : null;
    const latin = getFieldValue(student, "kategori_baca_latin");
    const mengaji = getFieldValue(student, "kategori_mengaji");

    const values = [
      akademik !== null && !isNaN(akademik) ? akademik : null,
      latin ? KATEGORI_SCORE_MAP[latin] : null,
      mengaji ? KATEGORI_SCORE_MAP[mengaji] : null,
    ].filter((v) => v !== null);

    if (values.length === 0) return null;
    return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
  };

  const filteredStudents = useMemo(() => {
    const list = allStudents || [];
    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase();
    return list.filter(
      (s) =>
        s.nama_lengkap?.toLowerCase().includes(q) || s.no_pendaftaran?.toLowerCase().includes(q)
    );
  }, [allStudents, searchTerm]);

  // Bangun payload diagnostikData final buat 1 siswa, gabungan antara edit
  // lokal (kalau ada) sama data asli.
  const buildDiagnostikData = (student) => {
    const edit = edits[student.id] || {};
    const skorRaw = edit.skor_akademik !== undefined ? edit.skor_akademik : student.skor_akademik;

    let skorAkademik = null;
    if (skorRaw !== "" && skorRaw !== null && skorRaw !== undefined) {
      const num = typeof skorRaw === "number" ? skorRaw : parseFloat(skorRaw);
      if (isNaN(num) || num < 0 || num > 100) {
        return { error: "Skor Akademik harus angka 0-100" };
      }
      skorAkademik = num;
    }

    return {
      data: {
        skor_akademik: skorAkademik,
        kategori_baca_latin:
          (edit.kategori_baca_latin !== undefined
            ? edit.kategori_baca_latin
            : student.kategori_baca_latin) || null,
        kategori_mengaji:
          (edit.kategori_mengaji !== undefined
            ? edit.kategori_mengaji
            : student.kategori_mengaji) || null,
      },
    };
  };

  // Simpan 1 baris (tombol "Simpan" di kolom Aksi)
  const handleSaveRow = async (student) => {
    const built = buildDiagnostikData(student);
    if (built.error) {
      if (showToast) showToast(built.error, "error");
      return;
    }

    setSavingIds((prev) => ({ ...prev, [student.id]: true }));
    try {
      const success = await onSaveDiagnostik(student.id, built.data);
      if (success) {
        clearEdit(student.id);
        if (showToast) showToast(`Skor ${student.nama_lengkap} tersimpan`, "success");
        if (onRefreshData) await onRefreshData();
      } else if (showToast) {
        showToast(`Gagal simpan skor ${student.nama_lengkap}`, "error");
      }
    } finally {
      setSavingIds((prev) => ({ ...prev, [student.id]: false }));
    }
  };

  // Simpan SEMUA baris yang lagi ada edit-nya (tombol "Simpan Semua")
  const handleSaveAll = async () => {
    const ids = Object.keys(edits);
    if (ids.length === 0) return;

    setIsBulkSaving(true);
    let successCount = 0;
    let failCount = 0;

    for (const idStr of ids) {
      const student = (allStudents || []).find((s) => String(s.id) === idStr);
      if (!student) continue;

      const built = buildDiagnostikData(student);
      if (built.error) {
        failCount += 1;
        continue;
      }

      const success = await onSaveDiagnostik(student.id, built.data);
      if (success) {
        successCount += 1;
        clearEdit(student.id);
      } else {
        failCount += 1;
      }
    }

    setIsBulkSaving(false);

    if (showToast) {
      showToast(
        failCount === 0
          ? `Berhasil simpan ${successCount} data skor diagnostik`
          : `Selesai: ${successCount} berhasil, ${failCount} gagal (cek data yang masih ke-highlight kuning)`,
        failCount === 0 ? "success" : "error"
      );
    }

    if (onRefreshData) await onRefreshData();
  };

  // --- Export / Import Excel ---

  const handleExportTemplate = async () => {
    setIsExporting(true);
    try {
      await exportDiagnostikTemplate(allStudents, showToast);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset input, biar file yang sama bisa dipilih ulang
    if (!file) return;

    setIsImporting(true);
    setImportPreview(null);
    try {
      const result = await importDiagnostikScores(file, allStudents);
      setImportPreview(result);

      if (!result.success && showToast) {
        showToast("Gagal membaca file / file kosong", "error");
      }
    } catch (error) {
      console.error("Error importing file:", error);
      if (showToast) showToast("Gagal membaca file", "error");
    } finally {
      setIsImporting(false);
    }
  };

  const handleApplyImport = async () => {
    if (!importPreview) return;
    const validRows = importPreview.rows.filter((r) => r.errors.length === 0 && r.matchedStudentId);

    if (validRows.length === 0) {
      if (showToast) showToast("Tidak ada baris valid untuk diterapkan", "error");
      return;
    }

    setIsBulkSaving(true);
    let successCount = 0;
    let failCount = 0;

    for (const row of validRows) {
      const success = await onSaveDiagnostik(row.matchedStudentId, {
        skor_akademik: row.skor_akademik,
        kategori_baca_latin: row.kategori_baca_latin,
        kategori_mengaji: row.kategori_mengaji,
      });
      if (success) successCount += 1;
      else failCount += 1;
    }

    setIsBulkSaving(false);
    setImportPreview(null);

    if (showToast) {
      showToast(
        failCount === 0
          ? `Berhasil terapkan ${successCount} data dari Excel`
          : `Selesai: ${successCount} berhasil, ${failCount} gagal`,
        failCount === 0 ? "success" : "error"
      );
    }

    if (onRefreshData) await onRefreshData();
  };

  return (
    <div className="px-3 sm:px-4 lg:px-6">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800 dark:text-gray-100 flex items-center gap-2 sm:gap-3">
        <i className="fas fa-chart-line text-purple-600 dark:text-purple-400 text-lg sm:text-xl"></i>
        <span className="text-base sm:text-2xl">Skor Test Diagnostik</span>
      </h2>

      {/* Toolbar: search + export + import + simpan semua */}
      <div className="flex flex-col md:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 sm:p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm sm:text-base transition-all duration-300 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-4 focus:ring-purple-200 dark:focus:ring-purple-900/30 focus:outline-none pl-10 sm:pl-12 min-h-[48px]"
            placeholder="Cari nama siswa atau no. pendaftaran..."
          />
          <i className="fas fa-search absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm sm:text-base"></i>
        </div>

        <div className="flex gap-2 sm:gap-3 flex-col xs:flex-row">
          <button
            onClick={handleExportTemplate}
            disabled={isExporting || !allStudents || allStudents.length === 0}
            className="bg-gradient-to-r from-green-700 to-green-500 dark:from-green-800 dark:to-green-600 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 hover:-translate-y-1 hover:shadow-xl disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2 sm:gap-3 justify-center min-h-[48px] flex-1 xs:flex-none"
          >
            <i className="fas fa-file-download text-sm sm:text-base"></i>
            <span className="hidden sm:inline">
              {isExporting ? "Exporting..." : "Export Template"}
            </span>
          </button>

          <button
            onClick={handleImportClick}
            disabled={isImporting}
            className="bg-gradient-to-r from-blue-800 to-blue-600 dark:from-blue-700 dark:to-blue-500 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 hover:-translate-y-1 hover:shadow-xl disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2 sm:gap-3 justify-center min-h-[48px] flex-1 xs:flex-none"
          >
            <i className="fas fa-file-upload text-sm sm:text-base"></i>
            <span className="hidden sm:inline">{isImporting ? "Membaca..." : "Import Excel"}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelected}
            className="hidden"
          />

          {dirtyCount > 0 && (
            <button
              onClick={handleSaveAll}
              disabled={isBulkSaving}
              className="bg-gradient-to-r from-purple-800 to-purple-600 dark:from-purple-900 dark:to-purple-700 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 hover:-translate-y-1 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 sm:gap-3 justify-center min-h-[48px] flex-1 xs:flex-none"
            >
              <i className="fas fa-save text-sm sm:text-base"></i>
              <span>{isBulkSaving ? "Menyimpan..." : `Simpan Semua (${dirtyCount})`}</span>
            </button>
          )}
        </div>
      </div>

      {/* Preview hasil Import Excel, sebelum di-"Terapkan" */}
      {importPreview && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-blue-200 dark:border-blue-800/30 p-4 sm:p-5 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3 sm:mb-4">
            <div>
              <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <i className="fas fa-eye text-blue-600 dark:text-blue-400"></i>
                Preview Hasil Import
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                {importPreview.validCount} baris valid, {importPreview.errorCount} baris bermasalah
                dari {importPreview.rows.length} baris terbaca
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setImportPreview(null)}
                className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleApplyImport}
                disabled={isBulkSaving || importPreview.validCount === 0}
                className="bg-gradient-to-r from-green-700 to-green-500 dark:from-green-800 dark:to-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBulkSaving ? "Menerapkan..." : `Terapkan ${importPreview.validCount} Data`}
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                <tr>
                  <th className="p-2 text-left">Baris</th>
                  <th className="p-2 text-left">No. Pendaftaran</th>
                  <th className="p-2 text-left">Nama</th>
                  <th className="p-2 text-left">Skor</th>
                  <th className="p-2 text-left">Baca Latin</th>
                  <th className="p-2 text-left">Mengaji</th>
                  <th className="p-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {importPreview.rows.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`border-t border-gray-100 dark:border-gray-700 ${
                      row.errors.length > 0
                        ? "bg-red-50 dark:bg-red-900/20"
                        : "bg-white dark:bg-gray-800"
                    }`}
                  >
                    <td className="p-2 text-gray-500 dark:text-gray-400">{row.rowNumber ?? "-"}</td>
                    <td className="p-2 font-mono text-gray-700 dark:text-gray-300">
                      {row.no_pendaftaran || "-"}
                    </td>
                    <td className="p-2 text-gray-800 dark:text-gray-200">
                      {row.nama_lengkap || "-"}
                    </td>
                    <td className="p-2">{row.skor_akademik ?? "-"}</td>
                    <td className="p-2">{row.kategori_baca_latin || "-"}</td>
                    <td className="p-2">{row.kategori_mengaji || "-"}</td>
                    <td className="p-2">
                      {row.errors.length > 0 ? (
                        <span
                          className="text-red-600 dark:text-red-400 text-xs"
                          title={row.errors.join("; ")}
                        >
                          <i className="fas fa-exclamation-triangle"></i> {row.errors[0]}
                        </span>
                      ) : (
                        <span className="text-green-600 dark:text-green-400 text-xs">
                          <i className="fas fa-check"></i> Valid
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

      {/* Tabel utama -- tiap baris langsung editable */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gradient-to-r from-purple-800 to-purple-600 dark:from-purple-900 dark:to-purple-700 text-white">
              <tr>
                <th className="p-3 text-left font-semibold text-xs sm:text-sm min-w-[180px]">
                  Nama Siswa
                </th>
                <th className="p-3 text-left font-semibold text-xs sm:text-sm min-w-[150px]">
                  No. Pendaftaran
                </th>
                <th className="p-3 text-left font-semibold text-xs sm:text-sm min-w-[130px]">
                  Skor Akademik
                </th>
                <th className="p-3 text-left font-semibold text-xs sm:text-sm min-w-[160px]">
                  Baca Latin
                </th>
                <th className="p-3 text-left font-semibold text-xs sm:text-sm min-w-[180px]">
                  Baca Al-Quran & Shalat
                </th>
                <th className="p-3 text-left font-semibold text-xs sm:text-sm min-w-[100px]">
                  Gabungan
                </th>
                <th className="p-3 text-left font-semibold text-xs sm:text-sm min-w-[90px]">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="p-6 sm:p-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    <i className="fas fa-inbox text-2xl sm:text-4xl mb-2 block"></i>
                    <p className="text-sm sm:text-base">
                      {searchTerm
                        ? "Tidak ada siswa yang sesuai pencarian"
                        : "Belum ada data siswa"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const dirty = isRowDirty(student.id);
                  const saving = !!savingIds[student.id];
                  const skorGabungan = computeSkorGabungan(student);

                  return (
                    <tr
                      key={student.id}
                      className={`border-b border-gray-100 dark:border-gray-700 transition-colors ${
                        dirty
                          ? "bg-yellow-50 dark:bg-yellow-900/10"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      }`}
                    >
                      <td className="p-3">
                        <div className="font-semibold text-gray-800 dark:text-gray-100 text-sm break-words">
                          {student.nama_lengkap}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-xs font-mono text-gray-600 dark:text-gray-300 break-words">
                          {student.no_pendaftaran}
                        </div>
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={getFieldValue(student, "skor_akademik")}
                          onChange={(e) => updateEdit(student.id, "skor_akademik", e.target.value)}
                          className="w-24 p-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900/30 focus:outline-none"
                          placeholder="-"
                        />
                      </td>
                      <td className="p-3">
                        <select
                          value={getFieldValue(student, "kategori_baca_latin")}
                          onChange={(e) =>
                            updateEdit(student.id, "kategori_baca_latin", e.target.value)
                          }
                          className="w-full min-w-[140px] p-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900/30 focus:outline-none"
                        >
                          <option value="">-- Belum dites --</option>
                          {KATEGORI_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3">
                        <select
                          value={getFieldValue(student, "kategori_mengaji")}
                          onChange={(e) =>
                            updateEdit(student.id, "kategori_mengaji", e.target.value)
                          }
                          className="w-full min-w-[140px] p-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900/30 focus:outline-none"
                        >
                          <option value="">-- Belum dites --</option>
                          {KATEGORI_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-purple-700 dark:text-purple-300 text-sm">
                          {skorGabungan !== null ? skorGabungan : "-"}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleSaveRow(student)}
                          disabled={!dirty || saving}
                          className="bg-gradient-to-r from-purple-800 to-purple-600 dark:from-purple-900 dark:to-purple-700 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:-translate-y-1 hover:shadow-md transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center gap-1 justify-center min-h-[36px] min-w-[70px]"
                          title="Simpan baris ini"
                        >
                          {saving ? (
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          ) : (
                            <i className="fas fa-save text-xs"></i>
                          )}
                          <span>{saving ? "..." : "Simpan"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isLoading && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
          <i className="fas fa-circle-notch fa-spin mr-2"></i>Memuat data...
        </div>
      )}
    </div>
  );
};

export default DiagnostikPage;
