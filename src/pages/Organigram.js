import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "../supabaseClient";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  Network,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  Loader2,
  GripVertical,
  Eye,
  Pencil,
  FileDown,
} from "lucide-react";

// ⚠️ ASUMSI STRUKTUR TABEL - SESUAIKAN KALAU BEDA DI SUPABASE KAMU:
//
// Tabel "students": id, full_name, nis, gender, class_id, academic_year,
//                   is_active, created_at, updated_at
// (contoh class_id: "7F", academic_year: "2026/2027")
//
// Tabel "class_organization" (dibuat via SQL terpisah):
//   id, class_id (text), academic_year (text), position (text),
//   position_order (int), student_id (uuid, nullable), created_at, updated_at
//   — 1 struktur berlaku sepanjang tahun ajaran (tidak dipisah per semester)

const DEFAULT_POSITIONS = [
  { position: "Ketua Murid", position_level: 1 },
  { position: "Wk. Ketua Murid", position_level: 2 },
  { position: "Sekretaris 1", position_level: 2 },
  { position: "Sekretaris 2", position_level: 2 },
  { position: "Bendahara 1", position_level: 3 },
  { position: "Bendahara 2", position_level: 3 },
];

const MAX_LEVEL = 5;

export default function Organigram({ currentUser }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [students, setStudents] = useState([]);
  const [academicYear, setAcademicYear] = useState("");
  const [rows, setRows] = useState([]); // [{ id, position, position_order, student_id, _isNew }]
  const [dirty, setDirty] = useState(false);

  const [viewMode, setViewMode] = useState("edit"); // "edit" | "preview"
  const [exporting, setExporting] = useState(false);
  const chartRef = useRef(null);

  const classId = currentUser?.homeroom_class_id;

  // ===== LOAD DATA =====
  useEffect(() => {
    if (!classId) {
      setError(
        "Anda belum memiliki kelas yang di-assign. Hubungi administrator.",
      );
      setLoading(false);
      return;
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const init = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Ambil tahun ajaran aktif
      const { data: activeYear, error: yearError } = await supabase
        .from("academic_years")
        .select("year")
        .eq("is_active", true)
        .single();

      if (yearError) throw yearError;
      const yearStr = activeYear.year;
      setAcademicYear(yearStr);

      // 2. Ambil daftar siswa di kelas ini
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id, full_name, nis")
        .eq("class_id", classId)
        .eq("academic_year", yearStr)
        .eq("is_active", true)
        .order("full_name", { ascending: true });

      if (studentError) throw studentError;
      setStudents(studentData || []);

      // 3. Ambil struktur organisasi yang sudah tersimpan
      const { data: orgData, error: orgError } = await supabase
        .from("class_organization")
        .select("*")
        .eq("class_id", classId)
        .eq("academic_year", yearStr)
        .order("position_order", { ascending: true });

      if (orgError) throw orgError;

      if (orgData && orgData.length > 0) {
        // fallback ke level 2 kalau data lama belum punya kolom position_level
        setRows(
          orgData.map((r) => ({
            ...r,
            position_level: r.position_level || 2,
          })),
        );
      } else {
        // belum ada struktur -> tawarkan template default
        setRows(
          DEFAULT_POSITIONS.map((tpl, idx) => ({
            id: `new-${idx}`,
            position: tpl.position,
            position_order: idx + 1,
            position_level: tpl.position_level,
            student_id: null,
            _isNew: true,
          })),
        );
      }

      setDirty(false);
    } catch (err) {
      console.error("Error loading organigram:", err);
      setError(err.message || "Gagal memuat struktur organisasi kelas");
    } finally {
      setLoading(false);
    }
  };

  // ===== DERIVED DATA =====
  const studentMap = useMemo(() => {
    const map = {};
    students.forEach((s) => (map[s.id] = s));
    return map;
  }, [students]);

  const assignedIds = useMemo(
    () => new Set(rows.map((r) => r.student_id).filter(Boolean)),
    [rows],
  );

  // Kelompokkan posisi berdasarkan "Tingkat" untuk bagan bertingkat,
  // urut dari tingkat terkecil (paling dekat Wali Kelas) ke terbesar.
  const levelGroups = useMemo(() => {
    const validRows = rows.filter((r) => r.position.trim() !== "");
    const map = new Map();
    validRows.forEach((r) => {
      const lvl = r.position_level || 2;
      if (!map.has(lvl)) map.set(lvl, []);
      map.get(lvl).push(r);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([level, items]) => ({ level, items }));
  }, [rows]);

  // ===== ROW ACTIONS =====
  const handlePositionChange = (rowId, value) => {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, position: value } : r)),
    );
    setDirty(true);
  };

  const handleStudentChange = (rowId, studentId) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId ? { ...r, student_id: studentId || null } : r,
      ),
    );
    setDirty(true);
  };

  const handleLevelChange = (rowId, value) => {
    const level = Math.min(Math.max(parseInt(value, 10) || 1, 1), MAX_LEVEL);
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, position_level: level } : r)),
    );
    setDirty(true);
  };

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        position: "",
        position_order: prev.length + 1,
        position_level: 2,
        student_id: null,
        _isNew: true,
      },
    ]);
    setDirty(true);
  };

  const handleRemoveRow = async (row) => {
    if (!window.confirm(`Hapus posisi "${row.position || "ini"}"?`)) return;

    if (!row._isNew) {
      try {
        const { error: delError } = await supabase
          .from("class_organization")
          .delete()
          .eq("id", row.id);
        if (delError) throw delError;
      } catch (err) {
        console.error("Error deleting position:", err);
        setError(err.message || "Gagal menghapus posisi");
        return;
      }
    }

    setRows((prev) => prev.filter((r) => r.id !== row.id));
    setDirty(true);
  };

  // ===== SAVE =====
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const cleanRows = rows
        .filter((r) => r.position.trim() !== "")
        .map((r, idx) => ({ ...r, position_order: idx + 1 }));

      const toInsert = cleanRows
        .filter((r) => r._isNew)
        .map((r) => ({
          class_id: classId,
          academic_year: academicYear,
          position: r.position.trim(),
          position_order: r.position_order,
          position_level: r.position_level || 2,
          student_id: r.student_id,
        }));

      const toUpdate = cleanRows.filter((r) => !r._isNew);

      if (toInsert.length > 0) {
        const { error: insError } = await supabase
          .from("class_organization")
          .insert(toInsert);
        if (insError) throw insError;
      }

      for (const r of toUpdate) {
        const { error: updError } = await supabase
          .from("class_organization")
          .update({
            position: r.position.trim(),
            position_order: r.position_order,
            position_level: r.position_level || 2,
            student_id: r.student_id,
          })
          .eq("id", r.id);
        if (updError) throw updError;
      }

      setRows(cleanRows);
      await init(); // refresh biar id "new-x" ganti jadi id asli dari DB
    } catch (err) {
      console.error("Error saving organigram:", err);
      setError(err.message || "Gagal menyimpan struktur organisasi kelas");
    } finally {
      setSaving(false);
    }
  };

  // ===== EXPORT PDF =====
  const handleExportPDF = async () => {
    if (!chartRef.current) return;
    setExporting(true);
    setError(null);
    try {
      const canvas = await html2canvas(chartRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");

      // Landscape A4, gambar di-fit dengan margin
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const maxW = pageWidth - margin * 2;
      const maxH = pageHeight - margin * 2;

      const imgRatio = canvas.width / canvas.height;
      let renderW = maxW;
      let renderH = renderW / imgRatio;
      if (renderH > maxH) {
        renderH = maxH;
        renderW = renderH * imgRatio;
      }
      const x = (pageWidth - renderW) / 2;
      const y = (pageHeight - renderH) / 2;

      pdf.setFontSize(12);
      pdf.text(
        `Organigram Kelas ${classId} - ${academicYear}`,
        pageWidth / 2,
        margin,
        { align: "center" },
      );

      pdf.addImage(imgData, "PNG", x, y + 2, renderW, renderH);
      pdf.save(`Organigram-${classId}-${academicYear.replace("/", "-")}.pdf`);
    } catch (err) {
      console.error("Error exporting PDF:", err);
      setError(err.message || "Gagal mengekspor PDF");
    } finally {
      setExporting(false);
    }
  };

  // ===== RENDER =====
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Network size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Organigram
              </h2>
              <p className="text-sm text-gray-500">
                Kelas {classId} • {academicYear}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Toggle Edit / Preview */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("edit")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition ${
                  viewMode === "edit"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}>
                <Pencil size={14} />
                Edit
              </button>
              <button
                onClick={() => setViewMode("preview")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition ${
                  viewMode === "preview"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}>
                <Eye size={14} />
                Preview Bagan
              </button>
            </div>

            {viewMode === "edit" ? (
              <>
                <button
                  onClick={handleAddRow}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-lg transition">
                  <Plus size={15} />
                  Tambah Posisi
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !dirty}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed">
                  {saving ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Save size={15} />
                  )}
                  {dirty ? "Simpan Perubahan" : "Tersimpan"}
                </button>
              </>
            ) : (
              <button
                onClick={handleExportPDF}
                disabled={exporting}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed">
                {exporting ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <FileDown size={15} />
                )}
                Export PDF
              </button>
            )}
          </div>
        </div>

        {viewMode === "edit" && dirty && (
          <p className="mt-3 text-xs text-amber-600">
            Ada perubahan yang belum disimpan. Pindah ke tab Preview tidak akan
            menghapusnya, tapi jangan lupa klik "Simpan Perubahan".
          </p>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-3 rounded flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
      </div>

      {viewMode === "edit" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {/* Walikelas - selalu di atas */}
          <div className="flex justify-center mb-6">
            <div className="flex flex-col items-center gap-1 bg-emerald-50 border-2 border-emerald-300 rounded-lg px-6 py-3">
              <span className="text-[10px] text-emerald-600 font-medium">
                Wali Kelas
              </span>
              <span className="text-sm font-semibold text-emerald-800">
                {currentUser?.full_name || "-"}
              </span>
            </div>
          </div>

          {rows.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-10">
              Belum ada posisi. Klik "Tambah Posisi" untuk mulai.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {rows.map((row) => {
                const student = row.student_id
                  ? studentMap[row.student_id]
                  : null;
                return (
                  <div
                    key={row.id}
                    className="border border-gray-200 rounded-lg p-3 bg-gray-50 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <GripVertical
                        size={14}
                        className="text-gray-300 shrink-0"
                      />
                      <input
                        type="text"
                        value={row.position}
                        onChange={(e) =>
                          handlePositionChange(row.id, e.target.value)
                        }
                        placeholder="Nama posisi (mis. Seksi Kebersihan)"
                        className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white"
                      />
                      <button
                        onClick={() => handleRemoveRow(row)}
                        className="text-gray-400 hover:text-red-600 transition shrink-0">
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-gray-500 shrink-0">
                        Tingkat
                      </label>
                      <select
                        value={row.position_level || 2}
                        onChange={(e) =>
                          handleLevelChange(row.id, e.target.value)
                        }
                        className="px-2 py-1 text-xs border border-gray-300 rounded-md bg-white">
                        {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map(
                          (lvl) => (
                            <option key={lvl} value={lvl}>
                              Tingkat {lvl}
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    <select
                      value={row.student_id || ""}
                      onChange={(e) =>
                        handleStudentChange(row.id, e.target.value)
                      }
                      className="px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white">
                      <option value="">— Belum dipilih —</option>
                      {students
                        .filter(
                          (s) =>
                            s.id === row.student_id || !assignedIds.has(s.id),
                        )
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.full_name}
                          </option>
                        ))}
                    </select>

                    {student && (
                      <p className="text-[11px] text-gray-400 truncate">
                        {student.full_name}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {viewMode === "preview" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 overflow-x-auto">
          <div ref={chartRef} className="min-w-[640px] py-6 px-4 bg-white">
            {/* Judul chart, ikut ter-export ke PDF */}
            <div className="text-center mb-8">
              <h3 className="text-base font-semibold text-gray-900">
                Struktur Organisasi Kelas {classId}
              </h3>
              <p className="text-xs text-gray-500">
                Tahun Ajaran {academicYear}
              </p>
            </div>

            {/* Node Wali Kelas */}
            <div className="flex flex-col items-center">
              <div className="w-40">
                <OrgBox
                  label="Wali Kelas"
                  name={currentUser?.full_name || "-"}
                  tone="emerald"
                />
              </div>
              {rows.length > 0 && <Connector />}
            </div>

            {rows.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-10">
                Belum ada posisi untuk ditampilkan. Tambahkan posisi lewat tab
                Edit.
              </p>
            ) : (
              levelGroups.map((group, gi) => (
                <div key={group.level} className="flex flex-col items-center">
                  {group.items.length > 1 ? (
                    // Garis horizontal & vertikal otomatis pas selebar baris
                    // box (bukan angka persen tebakan), pakai border-top pada
                    // wrapper inline-flex sehingga lebarnya = lebar konten.
                    <div className="flex justify-center w-full">
                      <div className="inline-flex flex-wrap justify-center gap-x-6 gap-y-7 border-t border-gray-300 pt-5">
                        {group.items.map((row) => {
                          const student = row.student_id
                            ? studentMap[row.student_id]
                            : null;
                          return (
                            <div
                              key={row.id}
                              className="relative flex flex-col items-center w-40">
                              <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-px h-5 bg-gray-400" />
                              <div
                                className="absolute -top-[3px] left-1/2 -translate-x-1/2 w-0 h-0"
                                style={{
                                  borderLeft: "4px solid transparent",
                                  borderRight: "4px solid transparent",
                                  borderTop: "5px solid #9ca3af",
                                }}
                              />
                              <OrgBox
                                label={row.position || "(Tanpa nama posisi)"}
                                name={
                                  student ? student.full_name : "— Kosong —"
                                }
                                tone="sky"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    // Satu posisi saja di tingkat ini -> cukup satu garis lurus
                    <div className="flex flex-col items-center w-40">
                      <Connector />
                      <OrgBox
                        label={group.items[0].position || "(Tanpa nama posisi)"}
                        name={
                          group.items[0].student_id
                            ? studentMap[group.items[0].student_id]
                                ?.full_name || "— Kosong —"
                            : "— Kosong —"
                        }
                        tone="sky"
                      />
                    </div>
                  )}

                  {/* garis turun ke tingkat berikutnya, dari tengah tingkat ini */}
                  {gi < levelGroups.length - 1 && <Connector />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Kotak node bagan: strip warna berisi label posisi di atas, nama di bawah
// (putih), meniru gaya kotak pada bagan struktur organisasi konvensional.
function OrgBox({ label, name, tone = "sky" }) {
  const tones = {
    emerald: "bg-emerald-100 border-emerald-400 text-emerald-800",
    sky: "bg-sky-100 border-sky-400 text-sky-800",
  };
  const toneClass = tones[tone] || tones.sky;

  return (
    <div className="w-full rounded-md border overflow-hidden shadow-sm">
      <div
        className={`px-3 py-1.5 text-[10px] font-semibold text-center uppercase tracking-wide leading-tight border-b ${toneClass}`}>
        {label}
      </div>
      <div className="px-3 py-1.5 bg-white text-xs font-medium text-gray-800 text-center leading-tight">
        {name}
      </div>
    </div>
  );
}

// Garis penghubung vertikal dengan ujung panah, meniru tanda panah pada
// bagan struktur organisasi konvensional.
function Connector() {
  return (
    <div className="flex flex-col items-center">
      <div className="w-px h-5 bg-gray-400" />
      <div
        className="w-0 h-0"
        style={{
          borderLeft: "4px solid transparent",
          borderRight: "4px solid transparent",
          borderTop: "5px solid #9ca3af",
        }}
      />
    </div>
  );
}
