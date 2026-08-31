// [file name]: pages/DenahDuduk.js
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "../supabaseClient";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  LayoutGrid,
  Shuffle,
  Save,
  Trash2,
  Users,
  AlertCircle,
  Loader2,
  User,
  Download,
} from "lucide-react";

// ⚠️ ASUMSI STRUKTUR TABEL - SESUAIKAN KALAU BEDA DI SUPABASE KAMU:
//
// Tabel "students": id, full_name, nis, gender, class_id, academic_year,
//                   is_active, created_at, updated_at
// (contoh class_id: "7F", academic_year: "2026/2027")
//
// Tabel "seating_charts" (BARU, perlu dibuat manual di Supabase):
//   CREATE TABLE seating_charts (
//     id uuid primary key default gen_random_uuid(),
//     class_id text not null,
//     academic_year text not null,
//     semester text not null,       -- "ganjil" / "genap"
//     rows int not null default 4,
//     cols int not null default 5,          -- jumlah MEJA per baris
//     seats_per_desk int not null default 2, -- jumlah siswa per meja
//     layout jsonb not null default '{}'::jsonb, -- { "r-c-slot": student_id }
//     updated_at timestamptz default now(),
//     unique (class_id, academic_year, semester)
//   );
//
// Kalau tabel seating_charts sudah pernah dibuat SEBELUM ada kolom
// seats_per_desk, jalankan ini juga di SQL Editor:
//   ALTER TABLE seating_charts ADD COLUMN seats_per_desk int not null default 2;

export default function DenahDuduk({ currentUser }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  const [students, setStudents] = useState([]);
  const [academicYear, setAcademicYear] = useState("");
  const [semester, setSemester] = useState(""); // "ganjil" | "genap"

  const [rows, setRows] = useState(4); // jumlah baris meja
  const [cols, setCols] = useState(5); // jumlah meja per baris
  const [seatsPerDesk, setSeatsPerDesk] = useState(2); // siswa per meja
  const [layout, setLayout] = useState({}); // { "r-c-slot": student_id }
  const [dirty, setDirty] = useState(false);

  const [draggedId, setDraggedId] = useState(null);

  const chartRef = useRef(null);
  const scrollWrapRef = useRef(null);
  const [fitsContainer, setFitsContainer] = useState(true);

  const classId = currentUser?.homeroom_class_id;

  // ===== LOAD DATA =====
  useEffect(() => {
    if (!classId) {
      setError("Anda belum memiliki kelas yang di-assign. Hubungi administrator.");
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
        .select("year, semester")
        .eq("is_active", true)
        .single();

      if (yearError) throw yearError;

      const yearStr = activeYear.year;
      const semesterStr = Number(activeYear.semester) === 1 ? "ganjil" : "genap";
      setAcademicYear(yearStr);
      setSemester(semesterStr);

      // 2. Ambil daftar siswa di kelas ini (kelas + tahun ajaran + masih aktif)
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id, full_name, nis")
        .eq("class_id", classId)
        .eq("academic_year", yearStr)
        .eq("is_active", true)
        .order("full_name", { ascending: true });

      if (studentError) throw studentError;
      setStudents(studentData || []);

      // 3. Ambil denah yang sudah tersimpan (kalau ada)
      const { data: chart, error: chartError } = await supabase
        .from("seating_charts")
        .select("*")
        .eq("class_id", classId)
        .eq("academic_year", yearStr)
        .eq("semester", semesterStr)
        .maybeSingle();

      if (chartError) throw chartError;

      if (chart) {
        setRows(chart.rows || 4);
        setCols(chart.cols || 5);
        setSeatsPerDesk(chart.seats_per_desk || 2);
        setLayout(chart.layout || {});
      } else {
        setRows(4);
        setCols(5);
        setSeatsPerDesk(2);
        setLayout({});
      }

      setDirty(false);
    } catch (err) {
      console.error("Error loading seating chart:", err);
      setError(err.message || "Gagal memuat data denah duduk");
    } finally {
      setLoading(false);
    }
  };

  // ===== DERIVED DATA =====
  const assignedIds = useMemo(() => new Set(Object.values(layout)), [layout]);
  const unassignedStudents = useMemo(
    () => students.filter((s) => !assignedIds.has(s.id)),
    [students, assignedIds]
  );
  const studentMap = useMemo(() => {
    const map = {};
    students.forEach((s) => (map[s.id] = s));
    return map;
  }, [students]);

  // ===== CEK APAKAH DENAH MUAT DI CONTAINER (biar centering nggak nge-block scroll) =====
  useEffect(() => {
    const checkFit = () => {
      if (scrollWrapRef.current && chartRef.current) {
        const fits = chartRef.current.scrollWidth <= scrollWrapRef.current.clientWidth;
        setFitsContainer(fits);
      }
    };
    const t = setTimeout(checkFit, 50);
    window.addEventListener("resize", checkFit);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", checkFit);
    };
  }, [rows, cols, seatsPerDesk, layout, loading]);

  // ===== DRAG & DROP HANDLERS =====
  const handleDragStart = useCallback((studentId) => {
    setDraggedId(studentId);
  }, []);

  const removeFromLayout = (prev, studentId) => {
    const next = { ...prev };
    for (const key in next) {
      if (next[key] === studentId) delete next[key];
    }
    return next;
  };

  const handleDropOnSeat = useCallback(
    (e, seatKey) => {
      e.preventDefault();
      if (!draggedId) return;
      setLayout((prev) => {
        const next = removeFromLayout(prev, draggedId);
        next[seatKey] = draggedId;
        return next;
      });
      setDirty(true);
      setDraggedId(null);
    },
    [draggedId]
  );

  const handleDropOnUnassigned = useCallback(
    (e) => {
      e.preventDefault();
      if (!draggedId) return;
      setLayout((prev) => removeFromLayout(prev, draggedId));
      setDirty(true);
      setDraggedId(null);
    },
    [draggedId]
  );

  const allowDrop = (e) => e.preventDefault();

  // ===== ACTIONS =====
  const handleShuffle = () => {
    const totalSeats = rows * cols * seatsPerDesk;
    const shuffled = [...students].sort(() => Math.random() - 0.5);
    const next = {};
    let idx = 0;
    outer: for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        for (let slot = 0; slot < seatsPerDesk; slot++) {
          if (idx >= shuffled.length || idx >= totalSeats) break outer;
          next[`${r}-${c}-${slot}`] = shuffled[idx].id;
          idx++;
        }
      }
    }
    setLayout(next);
    setDirty(true);
  };

  const handleClear = () => {
    if (!window.confirm("Kosongkan semua posisi duduk?")) return;
    setLayout({});
    setDirty(true);
  };

  const handleRowsChange = (val) => {
    const n = Math.min(10, Math.max(1, Number(val) || 1));
    setRows(n);
    setDirty(true);
  };

  const handleColsChange = (val) => {
    const n = Math.min(10, Math.max(1, Number(val) || 1));
    setCols(n);
    setDirty(true);
  };

  const handleSeatsPerDeskChange = (val) => {
    const n = Math.min(4, Math.max(1, Number(val) || 1));
    setSeatsPerDesk(n);
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        class_id: classId,
        academic_year: academicYear,
        semester,
        rows,
        cols,
        seats_per_desk: seatsPerDesk,
        layout,
        updated_at: new Date().toISOString(),
      };

      const { error: saveError } = await supabase
        .from("seating_charts")
        .upsert(payload, { onConflict: "class_id,academic_year,semester" });

      if (saveError) throw saveError;
      setDirty(false);
    } catch (err) {
      console.error("Error saving seating chart:", err);
      setError(err.message || "Gagal menyimpan denah duduk");
    } finally {
      setSaving(false);
    }
  };

  const handleExportPDF = async () => {
    if (!chartRef.current) return;
    setExporting(true);
    setError(null);
    try {
      const canvas = await html2canvas(chartRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");

      const orientation = canvas.width > canvas.height ? "landscape" : "portrait";
      const pdf = new jsPDF({ orientation, unit: "mm", format: "a4" });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;

      // Header
      pdf.setFontSize(14);
      pdf.setFont(undefined, "bold");
      pdf.text("DENAH TEMPAT DUDUK SISWA", pageWidth / 2, margin, {
        align: "center",
      });

      pdf.setFontSize(10);
      pdf.setFont(undefined, "normal");
      let y = margin + 8;
      pdf.text(`Kelas: ${classId}`, margin, y);
      pdf.text(`Wali Kelas: ${currentUser?.full_name || "-"}`, pageWidth - margin, y, {
        align: "right",
      });
      y += 6;
      pdf.text(
        `Tahun Ajaran: ${academicYear} - Semester ${semester === "ganjil" ? "Ganjil" : "Genap"}`,
        margin,
        y
      );
      y += 8;

      // Gambar denah
      const imgWidthFull = pageWidth - margin * 2;
      const imgHeightFull = (canvas.height * imgWidthFull) / canvas.width;

      const maxHeight = pageHeight - y - margin - 30; // sisakan ruang tanda tangan
      let finalWidth = imgWidthFull;
      let finalHeight = imgHeightFull;
      if (finalHeight > maxHeight) {
        finalHeight = maxHeight;
        finalWidth = (canvas.width * finalHeight) / canvas.height;
      }
      const imgX = (pageWidth - finalWidth) / 2;

      pdf.addImage(imgData, "PNG", imgX, y, finalWidth, finalHeight);

      // Tanda tangan
      const today = new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      let signY = y + finalHeight + 15;
      if (signY > pageHeight - margin - 20) {
        signY = pageHeight - margin - 20;
      }
      const signX = pageWidth - margin - 55;
      pdf.setFontSize(10);
      pdf.text(`............., ${today}`, signX, signY);
      pdf.text("Wali Kelas,", signX, signY + 5);
      pdf.text(currentUser?.full_name || "___________________", signX, signY + 25);

      pdf.save(`Denah_Duduk_${classId}_${academicYear.replace("/", "-")}_${semester}.pdf`);
    } catch (err) {
      console.error("Error export PDF:", err);
      setError("Gagal export PDF: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  // ===== RENDER STATES =====
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Memuat denah duduk...</p>
      </div>
    );
  }

  if (error && students.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <p className="text-gray-700 font-medium mb-1">Tidak Dapat Memuat Data</p>
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <LayoutGrid size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Denah Duduk</h2>
              <p className="text-sm text-gray-500">
                Kelas {classId} • {academicYear} ({semester === "ganjil" ? "Ganjil" : "Genap"})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-sm">
              <label className="text-gray-500">Baris</label>
              <input
                type="number"
                min={1}
                max={10}
                value={rows}
                onChange={(e) => handleRowsChange(e.target.value)}
                className="w-14 px-2 py-1 border border-gray-300 rounded-lg text-center"
              />
            </div>
            <div className="flex items-center gap-1 text-sm">
              <label className="text-gray-500">Meja/Baris</label>
              <input
                type="number"
                min={1}
                max={10}
                value={cols}
                onChange={(e) => handleColsChange(e.target.value)}
                className="w-14 px-2 py-1 border border-gray-300 rounded-lg text-center"
              />
            </div>
            <div className="flex items-center gap-1 text-sm">
              <label className="text-gray-500">Siswa/Meja</label>
              <input
                type="number"
                min={1}
                max={4}
                value={seatsPerDesk}
                onChange={(e) => handleSeatsPerDeskChange(e.target.value)}
                className="w-14 px-2 py-1 border border-gray-300 rounded-lg text-center"
              />
            </div>

            <button
              onClick={handleShuffle}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-lg transition"
            >
              <Shuffle size={15} />
              Acak
            </button>
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-lg transition"
            >
              <Trash2 size={15} />
              Kosongkan
            </button>
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              Export PDF
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {dirty ? "Simpan Perubahan" : "Tersimpan"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-3 rounded flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Grid meja */}
        <div
          ref={scrollWrapRef}
          className={`lg:col-span-3 bg-white rounded-xl border border-gray-200 p-6 overflow-x-auto flex flex-col ${
            fitsContainer ? "items-center" : "items-start"
          }`}
        >
          <div className="mb-1 text-[10px] text-gray-400 text-center">
            💡 Geser ke kanan untuk lihat meja lainnya
          </div>
          <div ref={chartRef} className="inline-block bg-white p-2">
            <div className="mb-4 text-xs text-gray-400 text-center">
              — Papan Tulis / Depan Kelas —
            </div>
            <div className="flex flex-col gap-4 items-center">
              {/* Meja Guru - di depan, rata kanan sejajar meja siswa paling kanan */}
              <div className="flex gap-3">
                {Array.from({ length: cols - 1 }).map((_, i) => (
                  <div key={`spacer-${i}`} className="invisible flex flex-col items-center gap-1">
                    <span className="text-[10px]">&nbsp;</span>
                    <div className="flex gap-1 p-1.5">
                      {Array.from({ length: seatsPerDesk }).map((_, s) => (
                        <div key={s} className="w-[96px] h-[72px]" />
                      ))}
                    </div>
                  </div>
                ))}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-gray-400">Meja Guru</span>
                  <div className="flex gap-1 bg-emerald-50 border-2 border-emerald-300 rounded-lg p-1.5">
                    <div
                      className="h-[72px] flex flex-col items-center justify-center gap-1"
                      style={{
                        width: `${seatsPerDesk * 96 + (seatsPerDesk - 1) * 4}px`,
                      }}
                    >
                      <User size={20} className="text-emerald-600" />
                      <span className="text-[9px] font-medium text-emerald-700">Guru</span>
                    </div>
                  </div>
                </div>
              </div>

              {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className="flex gap-3">
                  {Array.from({ length: cols }).map((_, c) => (
                    <div key={c} className="flex flex-col items-center gap-1">
                      <span className="text-[10px] text-gray-300">Meja {r * cols + c + 1}</span>
                      <div className="flex gap-1 bg-amber-50 border-2 border-amber-200 rounded-lg p-1.5">
                        {Array.from({ length: seatsPerDesk }).map((_, slot) => {
                          const key = `${r}-${c}-${slot}`;
                          const studentId = layout[key];
                          const student = studentId ? studentMap[studentId] : null;

                          return (
                            <div
                              key={slot}
                              onDragOver={allowDrop}
                              onDrop={(e) => handleDropOnSeat(e, key)}
                              draggable={!!student}
                              onDragStart={() => student && handleDragStart(student.id)}
                              className={`w-[96px] h-[72px] rounded-md border-2 border-dashed flex flex-col items-center justify-center p-1 text-center cursor-grab active:cursor-grabbing transition ${
                                student
                                  ? "bg-blue-50 border-blue-300"
                                  : "bg-white border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              {student ? (
                                <span className="text-[11px] font-semibold text-blue-900 leading-tight line-clamp-3">
                                  {student.full_name}
                                </span>
                              ) : (
                                <span className="text-[9px] text-gray-300">Kosong</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Daftar siswa belum ditempatkan */}
        <div
          className="bg-white rounded-xl border border-gray-200 p-4"
          onDragOver={allowDrop}
          onDrop={handleDropOnUnassigned}
        >
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-800">
              Belum Ditempatkan ({unassignedStudents.length})
            </h3>
          </div>

          {unassignedStudents.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">
              Semua siswa sudah ditempatkan 🎉
            </p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {unassignedStudents.map((s) => (
                <div
                  key={s.id}
                  draggable
                  onDragStart={() => handleDragStart(s.id)}
                  className="px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm cursor-grab active:cursor-grabbing transition"
                >
                  <p className="font-medium text-gray-800 leading-tight">{s.full_name}</p>
                  <p className="text-xs text-gray-400">{s.nis}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
