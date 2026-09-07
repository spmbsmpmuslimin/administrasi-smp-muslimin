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

// Kriteria penilaian baca (berlaku sama buat Baca Latin & Baca Al-Qur'an).
// Angka mentah 0-100 diinput langsung, label di bawah cuma buat
// ditampilin sebagai keterangan otomatis (bukan input manual lagi).
// HARUS SAMA sama tabel "Kriteria Penilaian Baca" yang dipegang penguji.
const KRITERIA_BACA = [
  {
    label: "Lancar",
    min: 91,
    max: 100,
    color: "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20",
  },
  {
    label: "Cukup Lancar",
    min: 76,
    max: 90,
    color: "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20",
  },
  {
    label: "Kurang Lancar",
    min: 60,
    max: 75,
    color: "text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20",
  },
  {
    label: "Belum Bisa",
    min: 0,
    max: 59,
    color: "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20",
  },
];

const getKategoriFromScore = (score) => {
  if (score === null || score === undefined || score === "" || isNaN(score)) return null;
  const num = typeof score === "number" ? score : parseFloat(score);
  return KRITERIA_BACA.find((k) => num >= k.min && num <= k.max) || null;
};

// Komposisi Nilai Akhir: Akademik 40%, Baca Latin 30%, Baca Al-Qur'an 30%.
// HARUS SAMA sama:
// - SpmbExcel.js (export/import template)
// - dokumen "Komposisi Nilai Gabungan" yang dipegang TU/penguji
const BOBOT = {
  skor_akademik: 0.4,
  skor_baca_latin: 0.3,
  skor_baca_quran: 0.3,
};

const DiagnostikPage = ({ allStudents, onSaveDiagnostik, onRefreshData, showToast, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState("");
  // Perubahan yang BELUM disimpan, keyed by student.id.
  // { [studentId]: { skor_akademik?, skor_baca_latin?, skor_baca_quran? } }
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

  // Nilai Akhir per baris, dihitung live dari nilai yang lagi ditampilkan
  // (termasuk edit yang belum disimpan). Cuma dihitung kalau KE-3 komponen
  // udah keisi -- kalau belum, return null (ditampilin "Belum Lengkap" di UI).
  // Alasan: ini dipake buat pemetaan siswa baru (bukan penentu lolos/tidak),
  // jadi data yang masih bolong sengaja dibedain dari yang udah lengkap
  // biar TU/wali kelas gak keliru anggap siswa itu udah selesai dites.
  const computeSkorGabungan = (student) => {
    const akademikRaw = getFieldValue(student, "skor_akademik");
    const latinRaw = getFieldValue(student, "skor_baca_latin");
    const quranRaw = getFieldValue(student, "skor_baca_quran");

    const akademik = akademikRaw !== "" && akademikRaw !== null ? parseFloat(akademikRaw) : null;
    const latin = latinRaw !== "" && latinRaw !== null ? parseFloat(latinRaw) : null;
    const quran = quranRaw !== "" && quranRaw !== null ? parseFloat(quranRaw) : null;

    if (
      akademik === null ||
      isNaN(akademik) ||
      latin === null ||
      isNaN(latin) ||
      quran === null ||
      isNaN(quran)
    ) {
      return null; // Belum Lengkap
    }

    const nilaiAkhir =
      akademik * BOBOT.skor_akademik +
      latin * BOBOT.skor_baca_latin +
      quran * BOBOT.skor_baca_quran;

    return nilaiAkhir.toFixed(1);
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

    const parseSkor = (raw, label) => {
      if (raw === "" || raw === null || raw === undefined) return { value: null };
      const num = typeof raw === "number" ? raw : parseFloat(raw);
      if (isNaN(num) || num < 0 || num > 100) {
        return { error: `${label} harus angka 0-100` };
      }
      return { value: num };
    };

    const akademikRaw =
      edit.skor_akademik !== undefined ? edit.skor_akademik : student.skor_akademik;
    const latinRaw =
      edit.skor_baca_latin !== undefined ? edit.skor_baca_latin : student.skor_baca_latin;
    const quranRaw =
      edit.skor_baca_quran !== undefined ? edit.skor_baca_quran : student.skor_baca_quran;

    const akademik = parseSkor(akademikRaw, "Skor Akademik");
    if (akademik.error) return { error: akademik.error };

    const latin = parseSkor(latinRaw, "Skor Baca Latin");
    if (latin.error) return { error: latin.error };

    const quran = parseSkor(quranRaw, "Skor Baca Al-Qur'an");
    if (quran.error) return { error: quran.error };

    return {
      data: {
        skor_akademik: akademik.value,
        skor_baca_latin: latin.value,
        skor_baca_quran: quran.value,
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
        skor_baca_latin: row.skor_baca_latin,
        skor_baca_quran: row.skor_baca_quran,
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
        <i className="fas fa-chart-line text-blue-600 dark:text-blue-400 text-lg sm:text-xl"></i>
        <span className="text-base sm:text-2xl">Skor Test Diagnostik</span>
      </h2>

      {/* Toolbar: search + export + import + simpan semua */}
      <div className="flex flex-col md:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 sm:p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm sm:text-base transition-colors bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 focus:outline-none pl-10 sm:pl-12 min-h-[48px]"
            placeholder="Cari nama siswa atau no. pendaftaran..."
          />
          <i className="fas fa-search absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm sm:text-base"></i>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExportTemplate}
            disabled={isExporting || !allStudents || allStudents.length === 0}
            className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 px-2 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold text-[11px] sm:text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 sm:gap-2 justify-center min-h-[44px] sm:min-h-[48px] flex-1 min-w-0"
          >
            <i className="fas fa-file-download text-xs sm:text-sm shrink-0"></i>
            <span className="hidden sm:inline truncate">
              {isExporting ? "Exporting..." : "Export Template"}
            </span>
            <span className="sm:hidden truncate">{isExporting ? "..." : "Template"}</span>
          </button>

          <button
            onClick={handleImportClick}
            disabled={isImporting}
            className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 px-2 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold text-[11px] sm:text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 sm:gap-2 justify-center min-h-[44px] sm:min-h-[48px] flex-1 min-w-0"
          >
            <i className="fas fa-file-upload text-xs sm:text-sm shrink-0"></i>
            <span className="hidden sm:inline truncate">
              {isImporting ? "Membaca..." : "Import Excel"}
            </span>
            <span className="sm:hidden truncate">{isImporting ? "..." : "Import"}</span>
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
              className="bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white px-2 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold text-[11px] sm:text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 sm:gap-2 justify-center min-h-[44px] sm:min-h-[48px] flex-1 min-w-0"
            >
              <i className="fas fa-save text-xs sm:text-sm shrink-0"></i>
              <span className="truncate">
                {isBulkSaving ? "Menyimpan..." : `Simpan (${dirtyCount})`}
              </span>
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
                className="bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <td className="p-2">{row.skor_baca_latin ?? "-"}</td>
                    <td className="p-2">{row.skor_baca_quran ?? "-"}</td>
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
            <thead className="bg-slate-800 dark:bg-slate-900 text-white">
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
                  Baca Al-Qur'an
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
                  const kategoriLatin = getKategoriFromScore(
                    getFieldValue(student, "skor_baca_latin")
                  );
                  const kategoriQuran = getKategoriFromScore(
                    getFieldValue(student, "skor_baca_quran")
                  );

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
                          className="w-24 p-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 focus:outline-none"
                          placeholder="-"
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={getFieldValue(student, "skor_baca_latin")}
                            onChange={(e) =>
                              updateEdit(student.id, "skor_baca_latin", e.target.value)
                            }
                            className="w-24 p-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 focus:outline-none"
                            placeholder="-"
                          />
                          {kategoriLatin && (
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full w-fit ${kategoriLatin.color}`}
                            >
                              {kategoriLatin.label}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={getFieldValue(student, "skor_baca_quran")}
                            onChange={(e) =>
                              updateEdit(student.id, "skor_baca_quran", e.target.value)
                            }
                            className="w-24 p-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 focus:outline-none"
                            placeholder="-"
                          />
                          {kategoriQuran && (
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full w-fit ${kategoriQuran.color}`}
                            >
                              {kategoriQuran.label}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        {skorGabungan !== null ? (
                          <span className="font-bold text-blue-700 dark:text-blue-300 text-sm">
                            {skorGabungan}
                          </span>
                        ) : (
                          <span className="text-xs italic text-gray-400 dark:text-gray-500">
                            Belum Lengkap
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleSaveRow(student)}
                          disabled={!dirty || saving}
                          className="bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 justify-center min-h-[36px] min-w-[70px]"
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
