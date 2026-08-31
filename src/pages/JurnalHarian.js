import { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabaseClient";
import { getActiveAcademicInfo } from "../services/academicYearService";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  NotebookPen,
  Save,
  Trash2,
  AlertCircle,
  Loader2,
  Pencil,
  X,
  BookOpen,
  Calendar,
  Download,
} from "lucide-react";

// STRUKTUR TABEL (sesuai Supabase project ini):
//
// Tabel "teacher_assignments": id, teacher_id, subject, class_id, academic_year_id
// (class_id & subject text biasa, mis. "7B" / "BAHASA INGGRIS")
//
// Tabel "jurnal_harian":
//   id, user_id, teacher_id, assignment_id, class_id, subject, academic_year_id,
//   semester, tanggal, jam_ke, materi, tujuan_pembelajaran, kegiatan_pembelajaran,
//   kendala_catatan, status, created_at, updated_at
// ⚠️ semester gak lagi diisi manual lewat form — otomatis diambil dari
// getActiveAcademicInfo() saat disimpan, biar item form-nya sama kayak
// TeachingJournal.js (app Bahasa Inggris).

// Format tanggal jadi "Selasa, 09-08-2026"
const formatTanggalIndo = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return "";
  const hari = d.toLocaleDateString("id-ID", { weekday: "long" });
  const tgl = String(d.getDate()).padStart(2, "0");
  const bln = String(d.getMonth() + 1).padStart(2, "0");
  const thn = d.getFullYear();
  return `${hari}, ${tgl}-${bln}-${thn}`;
};

// Ambil tanggal HARI INI berdasarkan waktu lokal (bukan UTC).
// Jangan pakai new Date().toISOString().slice(0,10) karena itu convert ke UTC,
// jadi pas dini hari WIB (00:00-06:59) tanggalnya masih kebaca "kemarin".
const getLocalDateString = () => {
  const d = new Date();
  const tahun = d.getFullYear();
  const bulan = String(d.getMonth() + 1).padStart(2, "0");
  const tgl = String(d.getDate()).padStart(2, "0");
  return `${tahun}-${bulan}-${tgl}`;
};

const emptyForm = {
  tanggal: getLocalDateString(),
  jam_ke: "",
  materi: "",
  tujuan_pembelajaran: "",
  kegiatan_pembelajaran: "",
  kendala_catatan: "",
};

export default function TeachingJournal({ user }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  const [academicYear, setAcademicYear] = useState(""); // label buat ditampilkan, mis. "2026/2027"
  const [academicYearId, setAcademicYearId] = useState(null); // uuid, dipakai buat query & insert
  const [currentSemester, setCurrentSemester] = useState(1); // ✅ NEW: otomatis, gak lagi di-input manual
  const [assignments, setAssignments] = useState([]); // [{ id, class_id, subject }]
  const [selected, setSelected] = useState(null); // { id (assignment_id), class_id, subject }

  const [entries, setEntries] = useState([]);
  const [entriesLoading, setEntriesLoading] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const teacherId = user?.teacher_id;

  // ===== LOAD ASSIGNMENTS (Kelas & Mapel yang diajar) =====
  useEffect(() => {
    if (!teacherId) {
      setError("Data guru tidak ditemukan. Hubungi administrator.");
      setLoading(false);
      return;
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherId]);

  const init = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: activeYear, error: yearError } = await supabase
        .from("academic_years")
        .select("id, year")
        .eq("is_active", true)
        .single();

      if (yearError) throw yearError;
      setAcademicYear(activeYear.year);
      setAcademicYearId(activeYear.id);

      // ✅ NEW: Ambil semester aktif otomatis (gak lagi di-input manual di form)
      try {
        const academicInfo = await getActiveAcademicInfo();
        setCurrentSemester(academicInfo?.semester || 1);
      } catch (semErr) {
        console.error("Error loading current semester:", semErr);
        setCurrentSemester(1);
      }

      const { data, error: assignError } = await supabase
        .from("teacher_assignments")
        .select("id, class_id, subject")
        .eq("teacher_id", teacherId)
        .eq("academic_year_id", activeYear.id);

      if (assignError) throw assignError;

      // unique by class_id + subject
      const seen = new Set();
      const unique = [];
      (data || []).forEach((item) => {
        const key = `${item.class_id}__${item.subject}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(item);
        }
      });
      unique.sort((a, b) =>
        a.class_id === b.class_id
          ? a.subject.localeCompare(b.subject)
          : a.class_id.localeCompare(b.class_id)
      );

      setAssignments(unique);
    } catch (err) {
      console.error("Error loading assignments:", err);
      setError(err.message || "Gagal memuat data kelas & mapel");
    } finally {
      setLoading(false);
    }
  };

  // ===== LOAD ENTRIES WHEN CARD SELECTED =====
  useEffect(() => {
    if (!selected) {
      setEntries([]);
      return;
    }
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const loadEntries = async () => {
    setEntriesLoading(true);
    try {
      const { data, error: entriesError } = await supabase
        .from("jurnal_harian")
        .select("*")
        .eq("teacher_id", teacherId)
        .eq("class_id", selected.class_id)
        .eq("subject", selected.subject)
        .eq("academic_year_id", academicYearId)
        .order("tanggal", { ascending: false });

      if (entriesError) throw entriesError;
      setEntries(data || []);
    } catch (err) {
      console.error("Error loading journal entries:", err);
      setError(err.message || "Gagal memuat jurnal");
    } finally {
      setEntriesLoading(false);
    }
  };

  // ===== FORM ACTIONS =====
  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleEdit = (entry) => {
    setForm({
      tanggal: entry.tanggal,
      jam_ke: entry.jam_ke || "",
      materi: entry.materi || "",
      tujuan_pembelajaran: entry.tujuan_pembelajaran || "",
      kegiatan_pembelajaran: entry.kegiatan_pembelajaran || "",
      kendala_catatan: entry.kendala_catatan || "",
    });
    setEditingId(entry.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Hapus entri jurnal ini?")) return;
    try {
      const { error: delError } = await supabase.from("jurnal_harian").delete().eq("id", id);
      if (delError) throw delError;
      setEntries((prev) => prev.filter((e) => e.id !== id));
      if (editingId === id) resetForm();
    } catch (err) {
      console.error("Error deleting entry:", err);
      setError(err.message || "Gagal menghapus jurnal");
    }
  };

  const handleSave = async () => {
    if (!form.materi.trim()) {
      setError("Materi wajib diisi.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        user_id: user.id,
        teacher_id: teacherId,
        assignment_id: selected.id,
        class_id: selected.class_id,
        subject: selected.subject,
        academic_year_id: academicYearId,
        semester: currentSemester || 1,
        tanggal: form.tanggal,
        jam_ke: form.jam_ke.trim() || null,
        materi: form.materi.trim(),
        tujuan_pembelajaran: form.tujuan_pembelajaran.trim() || null,
        kegiatan_pembelajaran: form.kegiatan_pembelajaran.trim() || null,
        kendala_catatan: form.kendala_catatan.trim() || null,
        status: "terkirim",
      };

      if (editingId) {
        const { error: updError } = await supabase
          .from("jurnal_harian")
          .update(payload)
          .eq("id", editingId);
        if (updError) throw updError;
      } else {
        const { error: insError } = await supabase.from("jurnal_harian").insert(payload);
        if (insError) throw insError;
      }

      resetForm();
      await loadEntries();
    } catch (err) {
      console.error("Error saving journal entry:", err);
      setError(err.message || "Gagal menyimpan jurnal");
    } finally {
      setSaving(false);
    }
  };

  // ===== EXPORT PDF =====
  const handleExportPDF = () => {
    if (!selected || entries.length === 0) return;
    setExporting(true);
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFontSize(13);
      doc.text("Jurnal Harian Mengajar", pageWidth / 2, 14, { align: "center" });

      doc.setFontSize(9);
      doc.setTextColor(90);
      const guru = user?.full_name || user?.username || "-";
      doc.text(`Guru: ${guru}`, 14, 22);
      doc.text(`Kelas: ${selected.class_id}   |   Mapel: ${selected.subject}`, 14, 27);
      doc.text(`Tahun Ajaran: ${academicYear || "-"}`, 14, 32);
      doc.text(
        `Dicetak: ${new Date().toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}`,
        pageWidth - 14,
        22,
        { align: "right" }
      );

      const rows = [...entries]
        .sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal))
        .map((e) => [
          formatTanggalIndo(e.tanggal),
          e.jam_ke || "-",
          e.materi || "-",
          e.tujuan_pembelajaran || "-",
          e.kegiatan_pembelajaran || "-",
          e.kendala_catatan || "-",
        ]);

      autoTable(doc, {
        startY: 37,
        head: [
          [
            "Tanggal",
            "Jam Ke",
            "Materi",
            "Tujuan Pembelajaran",
            "Kegiatan Pembelajaran",
            "Kendala/Catatan",
          ],
        ],
        body: rows,
        styles: { fontSize: 8, cellPadding: 2, valign: "top" },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 14 },
          2: { cellWidth: 45 },
          3: { cellWidth: 45 },
          4: { cellWidth: 45 },
          5: { cellWidth: "auto" },
        },
      });

      const fileName = `Jurnal_${selected.class_id}_${selected.subject}_${academicYear || ""}`
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .replace(/_+/g, "_");
      doc.save(`${fileName}.pdf`);
    } catch (err) {
      console.error("Error exporting PDF:", err);
      setError("Gagal membuat PDF. Coba lagi.");
    } finally {
      setExporting(false);
    }
  };

  const cardColors = useMemo(
    () => [
      "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300",
      "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300",
      "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300",
      "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300",
      "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300",
      "bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300",
    ],
    []
  );

  // ===== RENDER =====
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 max-w-full overflow-x-hidden">
      <div className="bg-theme-bg rounded-xl border border-theme p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
            <NotebookPen size={18} className="text-blue-600 sm:hidden" />
            <NotebookPen size={20} className="text-blue-600 hidden sm:block" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-theme truncate">
              Jurnal Mengajar
            </h2>
            <p className="text-xs sm:text-sm text-theme-secondary truncate">
              {academicYear ? `Tahun Ajaran ${academicYear}` : "Catatan harian kegiatan mengajar"}
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-3 rounded flex items-start sm:items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5 sm:mt-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
      </div>

      {/* Pilih Kelas & Mapel */}
      <div className="bg-theme-bg rounded-xl border border-theme p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-theme mb-3">Pilih Kelas & Mata Pelajaran</h3>
        {assignments.length === 0 ? (
          <p className="text-xs text-gray-400">
            Belum ada penugasan kelas/mapel untuk tahun ajaran ini.
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
            {assignments.map((a, idx) => {
              const isActive = selected?.class_id === a.class_id && selected?.subject === a.subject;
              const color = cardColors[idx % cardColors.length];
              return (
                <button
                  key={`${a.class_id}-${a.subject}`}
                  onClick={() => {
                    setSelected(a);
                    resetForm();
                  }}
                  className={`text-left p-2 min-h-[56px] rounded-lg border-2 transition active:scale-[0.98] ${
                    isActive
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 ring-2 ring-blue-200 dark:ring-blue-800"
                      : `border-theme hover:border-theme ${color.split(" ")[0]}`
                  }`}
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <BookOpen
                      size={11}
                      className={isActive ? "text-blue-600 shrink-0" : "shrink-0"}
                    />
                    <span className="text-[10px] font-medium text-theme-secondary truncate">Kelas</span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-theme truncate">
                    {a.class_id}
                  </p>
                  <p className="text-[10px] sm:text-xs text-theme-secondary mt-0.5 truncate">
                    {a.subject}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Form + list jurnal, muncul setelah pilih card */}
      {selected && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {/* Form input */}
          <div className="bg-theme-bg rounded-xl border border-theme p-4 sm:p-5">
            <div className="flex items-start sm:items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold text-theme min-w-0 break-words">
                {editingId ? "Edit Entri" : "Tambah Entri"} — {selected.class_id} •{" "}
                {selected.subject}
              </h3>
              {editingId && (
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-theme-secondary shrink-0 p-1 -m-1"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="block text-xs font-medium text-theme-secondary mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={form.tanggal}
                    onChange={(e) => handleFormChange("tanggal", e.target.value)}
                    className="w-full px-3 py-2.5 sm:py-2 text-base sm:text-sm bg-theme-bg text-theme border border-theme rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-theme-secondary mb-1">Jam Ke</label>
                  <input
                    type="text"
                    value={form.jam_ke}
                    onChange={(e) => handleFormChange("jam_ke", e.target.value)}
                    placeholder="mis. 3-4"
                    className="w-full px-3 py-2.5 sm:py-2 text-base sm:text-sm bg-theme-bg text-theme border border-theme rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-theme-secondary mb-1">Materi *</label>
                <textarea
                  value={form.materi}
                  onChange={(e) => handleFormChange("materi", e.target.value)}
                  rows={2}
                  placeholder="Materi yang diajarkan"
                  className="w-full px-3 py-2.5 sm:py-2 text-base sm:text-sm bg-theme-bg text-theme border border-theme rounded-lg resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-theme-secondary mb-1">
                  Tujuan Pembelajaran
                </label>
                <textarea
                  value={form.tujuan_pembelajaran}
                  onChange={(e) => handleFormChange("tujuan_pembelajaran", e.target.value)}
                  rows={2}
                  placeholder="Opsional — tujuan/KD/CP"
                  className="w-full px-3 py-2.5 sm:py-2 text-base sm:text-sm bg-theme-bg text-theme border border-theme rounded-lg resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-theme-secondary mb-1">Kegiatan</label>
                <textarea
                  value={form.kegiatan_pembelajaran}
                  onChange={(e) => handleFormChange("kegiatan_pembelajaran", e.target.value)}
                  rows={2}
                  placeholder="Ringkasan kegiatan pembelajaran"
                  className="w-full px-3 py-2.5 sm:py-2 text-base sm:text-sm bg-theme-bg text-theme border border-theme rounded-lg resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-theme-secondary mb-1">Catatan</label>
                <textarea
                  value={form.kendala_catatan}
                  onChange={(e) => handleFormChange("kendala_catatan", e.target.value)}
                  rows={2}
                  placeholder="Refleksi, kendala, tindak lanjut"
                  className="w-full px-3 py-2.5 sm:py-2 text-base sm:text-sm bg-theme-bg text-theme border border-theme rounded-lg resize-none"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-3 sm:py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {editingId ? "Simpan Perubahan" : "Simpan Data"}
              </button>
            </div>
          </div>

          {/* Daftar entri */}
          <div className="bg-theme-bg rounded-xl border border-theme p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold text-theme">Riwayat Jurnal</h3>
              <button
                onClick={handleExportPDF}
                disabled={exporting || entries.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                {exporting ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Download size={13} />
                )}
                Export PDF
              </button>
            </div>

            {entriesLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              </div>
            ) : entries.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-10">
                Belum ada entri jurnal untuk kelas & mapel ini.
              </p>
            ) : (
              <div className="space-y-2 max-h-[360px] sm:max-h-[600px] overflow-y-auto -mx-1 px-1">
                {entries.map((entry) => (
                  <div key={entry.id} className="bg-theme-bg text-theme border border-theme rounded-lg p-3 bg-theme-surface">
                    <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-theme-secondary min-w-0">
                        <Calendar size={12} className="shrink-0" />
                        <span className="break-words">
                          {formatTanggalIndo(entry.tanggal)}
                          {entry.jam_ke && ` • Jam ${entry.jam_ke}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-1 shrink-0">
                        <button
                          onClick={() => handleEdit(entry)}
                          className="text-gray-400 hover:text-blue-600 transition p-1 -m-1"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-gray-400 hover:text-red-600 transition p-1 -m-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-theme mt-1.5 break-words">
                      {entry.materi}
                    </p>
                    {entry.kegiatan_pembelajaran && (
                      <p className="text-xs text-theme-secondary mt-1 line-clamp-2 break-words">
                        {entry.kegiatan_pembelajaran}
                      </p>
                    )}
                    {entry.kendala_catatan && (
                      <p className="text-xs text-amber-600 mt-1 line-clamp-2 break-words">
                        📝 {entry.kendala_catatan}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
