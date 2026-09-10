// setting/kelola-jadwal/KelolaJamPelajaran.js
// Batch 3 dari migrasi Jam Pelajaran (lihat dokumentasi migrasi-jam-pelajaran.md):
// halaman admin buat CRUD period_schedules langsung -- sebelumnya cuma
// bisa diedit manual lewat SQL/Supabase dashboard.
//
// Catatan desain:
// - academic_years itu per-SEMESTER (bukan per-tahun-ajaran-penuh), jadi
//   dropdown di sini nunjukin tiap semester sebagai pilihan sendiri, dan
//   period_schedules-nya juga per academic_year_id (= per semester).
// - "Salin dari Semester Lain" bisa dari semester manapun ke semester
//   manapun (gak dibatasin cuma "tahun sebelumnya"), soalnya gak ada
//   asumsi urutan/hierarki antar semester di skema academic_years.
// - Grid gak fix 9 baris per hari -- admin bebas tambah/hapus baris,
//   soalnya jumlah jam pelajaran per hari bisa beda (mis. Jumat cuma 7 JP).
// - Simpan pakai strategi delete-all-lalu-insert-ulang per academic_year_id
//   (lihat savePeriodSchedules() di jamPelajaranService.js) -- aman karena
//   gak ada tabel lain yang FK ke period_schedules.id.
import React, { useState, useEffect, useCallback } from "react";
import {
  Save,
  Copy,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  Clock,
} from "lucide-react";
import { getAllAcademicYears, formatAcademicYearDisplay } from "../../services/academicYearService";
import {
  fetchRawPeriodSchedules,
  savePeriodSchedules,
  copyPeriodSchedules,
} from "../../services/jamPelajaranService";
import { DAYS } from "../../services/JamPelajaranProvider";

let tempIdCounter = 0;
const newTempKey = () => `tmp-${Date.now()}-${tempIdCounter++}`;

const emptyRow = (day) => ({
  _key: newTempKey(),
  day,
  period: "",
  start_time: "",
  end_time: "",
  session_type: "pelajaran",
  label: "",
});

export default function KelolaJamPelajaran() {
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYearId, setSelectedYearId] = useState("");
  const [rowsByDay, setRowsByDay] = useState({});
  const [loadingYears, setLoadingYears] = useState(true);
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copySourceId, setCopySourceId] = useState("");
  const [copying, setCopying] = useState(false);

  // Load daftar semester (academic_years) sekali pas mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingYears(true);
      try {
        const years = await getAllAcademicYears();
        if (cancelled) return;
        setAcademicYears(years);
        const active = years.find((y) => y.is_active);
        setSelectedYearId((active || years[0])?.id || "");
      } catch (err) {
        if (!cancelled) setError("Gagal memuat daftar tahun ajaran.");
      } finally {
        if (!cancelled) setLoadingYears(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadGrid = useCallback(async (yearId) => {
    if (!yearId) {
      setRowsByDay({});
      return;
    }
    setLoadingGrid(true);
    setError(null);
    try {
      const raw = await fetchRawPeriodSchedules(yearId);
      const grouped = {};
      DAYS.forEach((day) => {
        grouped[day] = [];
      });
      raw.forEach((row) => {
        if (!grouped[row.day]) grouped[row.day] = [];
        grouped[row.day].push({ ...row, _key: row.id });
      });
      setRowsByDay(grouped);
    } catch (err) {
      setError("Gagal memuat jam pelajaran untuk semester ini.");
    } finally {
      setLoadingGrid(false);
    }
  }, []);

  useEffect(() => {
    loadGrid(selectedYearId);
  }, [selectedYearId, loadGrid]);

  const selectedYear = academicYears.find((y) => y.id === selectedYearId);

  const addRow = (day) => {
    setSuccess(null);
    setRowsByDay((prev) => ({
      ...prev,
      [day]: [...(prev[day] || []), emptyRow(day)],
    }));
  };

  const updateRow = (day, key, field, value) => {
    setSuccess(null);
    setRowsByDay((prev) => ({
      ...prev,
      [day]: prev[day].map((r) => (r._key === key ? { ...r, [field]: value } : r)),
    }));
  };

  const removeRow = (day, key) => {
    setSuccess(null);
    setRowsByDay((prev) => ({
      ...prev,
      [day]: prev[day].filter((r) => r._key !== key),
    }));
  };

  // Validasi sebelum simpan: "Jam Ke" wajib diisi & unik per hari, jam
  // mulai/selesai harus diisi berdua atau kosong berdua, selesai > mulai,
  // dan gak boleh ada 2 baris di hari yang sama yang jamnya tumpang tindih
  // (dicek lintas pelajaran & istirahat sekaligus -- dua-duanya tetap gak
  // boleh bentrok).
  const validateGrid = () => {
    for (const day of DAYS) {
      const rows = rowsByDay[day] || [];
      const seenPeriods = new Set();
      const ranges = [];

      for (const row of rows) {
        const period = row.period.trim();
        if (!period) {
          return `${day}: ada baris tanpa "Jam Ke" / kode period.`;
        }
        if (seenPeriods.has(period)) {
          return `${day}: period "${period}" dobel -- tiap period cuma boleh 1 baris per hari.`;
        }
        seenPeriods.add(period);

        const hasStart = !!row.start_time;
        const hasEnd = !!row.end_time;
        if (hasStart !== hasEnd) {
          return `${day} period ${period}: jam mulai & selesai harus diisi berdua, atau dikosongin berdua.`;
        }
        if (hasStart && hasEnd) {
          if (row.end_time <= row.start_time) {
            return `${day} period ${period}: jam selesai harus lebih besar dari jam mulai.`;
          }
          ranges.push({ period, start: row.start_time, end: row.end_time });
        }
      }

      for (let i = 0; i < ranges.length; i++) {
        for (let j = i + 1; j < ranges.length; j++) {
          const a = ranges[i];
          const b = ranges[j];
          const overlap = a.start < b.end && b.start < a.end;
          if (overlap) {
            return `${day}: period ${a.period} (${a.start}-${a.end}) tumpang tindih sama period ${b.period} (${b.start}-${b.end}).`;
          }
        }
      }
    }
    return null;
  };

  const handleSave = async () => {
    const validationError = validateGrid();
    if (validationError) {
      setError(validationError);
      setSuccess(null);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const allRows = DAYS.flatMap((day) => (rowsByDay[day] || []).map((r) => ({ ...r, day })));
      await savePeriodSchedules(selectedYearId, allRows);
      setSuccess("Jam pelajaran berhasil disimpan.");
      await loadGrid(selectedYearId);
    } catch (err) {
      setError(`Gagal menyimpan: ${err.message || "Terjadi kesalahan"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!copySourceId) return;
    setCopying(true);
    setError(null);
    try {
      const result = await copyPeriodSchedules(copySourceId, selectedYearId, { overwrite: true });
      if (result.copied === 0) {
        setError(result.message || "Semester sumber belum punya data jam pelajaran.");
      } else {
        setSuccess(`Berhasil menyalin ${result.copied} baris jam pelajaran.`);
        setCopyModalOpen(false);
        setCopySourceId("");
        await loadGrid(selectedYearId);
      }
    } catch (err) {
      setError(`Gagal menyalin: ${err.message || "Terjadi kesalahan"}`);
    } finally {
      setCopying(false);
    }
  };

  if (loadingYears) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (academicYears.length === 0) {
    return (
      <div className="p-6 text-center text-theme-secondary text-sm">
        Belum ada tahun ajaran/semester di database. Buat dulu lewat menu Manajemen Tahun Ajaran.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 space-y-4">
      {/* Bar pilih semester + aksi */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-theme-secondary mb-1.5">
            Semester
          </label>
          <select
            value={selectedYearId}
            onChange={(e) => {
              setSelectedYearId(e.target.value);
              setError(null);
              setSuccess(null);
            }}
            className="w-full sm:max-w-xs px-3 py-2.5 bg-theme-bg text-theme border border-theme rounded-xl text-sm font-medium"
          >
            {academicYears.map((y) => (
              <option key={y.id} value={y.id}>
                {formatAcademicYearDisplay(y.year, y.semester)}
                {y.is_active ? " • Aktif" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 sm:pt-5">
          <button
            onClick={() => setCopyModalOpen(true)}
            disabled={loadingGrid}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-theme-secondary bg-theme-surface hover:bg-gray-200 disabled:opacity-50"
          >
            <Copy className="w-4 h-4" />
            Salin dari Semester Lain
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loadingGrid}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Menyimpan..." : "Simpan Semua"}
          </button>
        </div>
      </div>

      {/* Banner error / sukses */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl text-sm">
          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Grid per hari */}
      {loadingGrid ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="space-y-4">
          {DAYS.map((day) => {
            const rows = rowsByDay[day] || [];
            return (
              <div
                key={day}
                className="bg-theme-bg rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-bold text-theme">{day}</h3>
                  <button
                    onClick={() => addRow(day)}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Baris
                  </button>
                </div>

                {rows.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-theme-secondary">
                    Belum ada jam pelajaran di hari {day}.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs font-semibold text-theme-secondary">
                          <th className="px-4 py-2 whitespace-nowrap">Jam Ke</th>
                          <th className="px-2 py-2 whitespace-nowrap">Mulai</th>
                          <th className="px-2 py-2 whitespace-nowrap">Selesai</th>
                          <th className="px-2 py-2 whitespace-nowrap">Tipe</th>
                          <th className="px-2 py-2">Label</th>
                          <th className="px-2 py-2 w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr
                            key={row._key}
                            className="border-t border-gray-100 dark:border-gray-700/60"
                          >
                            <td className="px-4 py-1.5">
                              <input
                                value={row.period}
                                onChange={(e) => updateRow(day, row._key, "period", e.target.value)}
                                placeholder="1 / I1"
                                className="w-16 px-2 py-1.5 bg-theme-surface text-theme border border-theme rounded-lg text-sm font-semibold text-center"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="time"
                                value={row.start_time}
                                onChange={(e) =>
                                  updateRow(day, row._key, "start_time", e.target.value)
                                }
                                className="px-2 py-1.5 bg-theme-surface text-theme border border-theme rounded-lg text-sm"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="time"
                                value={row.end_time}
                                onChange={(e) =>
                                  updateRow(day, row._key, "end_time", e.target.value)
                                }
                                className="px-2 py-1.5 bg-theme-surface text-theme border border-theme rounded-lg text-sm"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <select
                                value={row.session_type}
                                onChange={(e) =>
                                  updateRow(day, row._key, "session_type", e.target.value)
                                }
                                className="px-2 py-1.5 bg-theme-surface text-theme border border-theme rounded-lg text-sm"
                              >
                                <option value="pelajaran">Pelajaran</option>
                                <option value="istirahat">Istirahat</option>
                              </select>
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                value={row.label}
                                onChange={(e) => updateRow(day, row._key, "label", e.target.value)}
                                placeholder="opsional, mis. Upacara"
                                className="w-full px-2 py-1.5 bg-theme-surface text-theme border border-theme rounded-lg text-sm"
                              />
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <button
                                onClick={() => removeRow(day, row._key)}
                                className="text-gray-400 hover:text-red-600 transition"
                                title="Hapus baris"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Salin dari Semester Lain */}
      {copyModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-theme-bg rounded-2xl shadow-xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-theme flex items-center gap-2">
                <Copy className="w-4 h-4 text-blue-600" />
                Salin Jam Pelajaran
              </h2>
              <button
                onClick={() => {
                  setCopyModalOpen(false);
                  setCopySourceId("");
                }}
                className="text-gray-400 hover:text-theme-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-theme-secondary mb-4">
              Menyalin ke:{" "}
              <span className="font-semibold text-theme">
                {selectedYear
                  ? formatAcademicYearDisplay(selectedYear.year, selectedYear.semester)
                  : "-"}
              </span>
            </p>

            <label className="block text-xs font-semibold text-theme-secondary mb-1.5">
              Salin dari semester
            </label>
            <select
              value={copySourceId}
              onChange={(e) => setCopySourceId(e.target.value)}
              className="w-full px-3 py-2 bg-theme-bg text-theme border border-theme rounded-xl text-sm mb-3"
              autoFocus
            >
              <option value="">-- pilih semester sumber --</option>
              {academicYears
                .filter((y) => y.id !== selectedYearId)
                .map((y) => (
                  <option key={y.id} value={y.id}>
                    {formatAcademicYearDisplay(y.year, y.semester)}
                  </option>
                ))}
            </select>

            <div className="flex items-start gap-2 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 rounded-xl p-3 mb-4">
              <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
              <p className="text-xs text-orange-700 dark:text-orange-400">
                Semua jam pelajaran yang udah ada di semester tujuan akan{" "}
                <span className="font-semibold">diganti total</span> sama data dari semester sumber.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setCopyModalOpen(false);
                  setCopySourceId("");
                }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-theme-secondary bg-theme-surface hover:bg-gray-200"
              >
                Batal
              </button>
              <button
                onClick={handleCopy}
                disabled={!copySourceId || copying}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
              >
                {copying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
                {copying ? "Menyalin..." : "Salin Sekarang"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
