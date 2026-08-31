import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "../supabaseClient";
import ExcelJS from "exceljs";
import {
  ClipboardCheck,
  Shuffle,
  Save,
  Trash2,
  Users,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  Upload,
} from "lucide-react";

// ⚠️ ASUMSI STRUKTUR TABEL - SESUAIKAN KALAU BEDA DI SUPABASE KAMU:
//
// Pakai tabel "students" dan "academic_years" yang sama seperti SeatingChart.js
//
// Tabel "duty_schedules" (BARU, perlu dibuat manual di Supabase):
//   CREATE TABLE duty_schedules (
//     id uuid primary key default gen_random_uuid(),
//     class_id text not null,
//     academic_year text not null,
//     semester text not null,       -- "ganjil" / "genap"
//     layout jsonb not null default '{}'::jsonb, -- { "Senin": [student_id, ...], ... }
//     updated_at timestamptz default now(),
//     unique (class_id, academic_year, semester)
//   );

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];
const EMPTY_LAYOUT = Object.fromEntries(DAYS.map((d) => [d, []]));

// Normalisasi teks header hari sebelum dibandingin, biar import tetap jalan
// walau file-nya sempat dibuka & disimpan ulang di Excel/Google
// Sheets/WPS -- aplikasi-aplikasi itu suka diam-diam ngubah teks pas save:
//   - Autocorrect nambahin apostrof: "Jumat" -> "Jum'at"
//   - Nambahin spasi ganda / non-breaking space (\u00A0) yang gak keliatan
// Tanpa normalisasi ini, header yang keliatannya identik di layar bisa
// gagal match persis di kode & bikin import selalu error "Kolom hari
// tidak ditemukan" walau isinya sebenarnya benar.
const normalizeHeaderText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['’‘`]/g, "") // hapus apostrof/tanda kutip: jum'at -> jumat
    .replace(/\s+/g, " "); // rapiin spasi ganda/non-breaking jadi 1 spasi

export default function DutySchedule({ currentUser }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [students, setStudents] = useState([]);
  const [academicYear, setAcademicYear] = useState("");
  const [semester, setSemester] = useState(""); // "ganjil" | "genap"

  const [layout, setLayout] = useState(EMPTY_LAYOUT); // { "Senin": [student_id, ...], ... }
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState(null); // { type: "success" | "error", message: string }

  const [draggedId, setDraggedId] = useState(null);
  const fileInputRef = useRef(null);

  // Toast otomatis hilang setelah 3 detik
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

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
        .select("id, full_name, nis, gender")
        .eq("class_id", classId)
        .eq("academic_year", yearStr)
        .eq("is_active", true)
        .order("full_name", { ascending: true });

      if (studentError) throw studentError;
      setStudents(studentData || []);

      // 3. Ambil jadwal piket yang sudah tersimpan (kalau ada)
      const { data: chart, error: chartError } = await supabase
        .from("duty_schedules")
        .select("*")
        .eq("class_id", classId)
        .eq("academic_year", yearStr)
        .eq("semester", semesterStr)
        .maybeSingle();

      if (chartError) throw chartError;

      if (chart?.layout && Object.keys(chart.layout).length > 0) {
        setLayout({ ...EMPTY_LAYOUT, ...chart.layout });
      } else {
        setLayout(EMPTY_LAYOUT);
      }

      setDirty(false);
    } catch (err) {
      console.error("Error loading duty schedule:", err);
      setError(err.message || "Gagal memuat jadwal piket");
    } finally {
      setLoading(false);
    }
  };

  // ===== DERIVED DATA =====
  const assignedIds = useMemo(() => new Set(Object.values(layout).flat()), [layout]);
  const unassignedStudents = useMemo(
    () => students.filter((s) => !assignedIds.has(s.id)),
    [students, assignedIds]
  );
  const studentMap = useMemo(() => {
    const map = {};
    students.forEach((s) => (map[s.id] = s));
    return map;
  }, [students]);

  // ===== DRAG & DROP HANDLERS =====
  const handleDragStart = useCallback((studentId) => {
    setDraggedId(studentId);
  }, []);

  const removeFromLayout = (prev, studentId) => {
    const next = {};
    for (const day of DAYS) {
      next[day] = (prev[day] || []).filter((id) => id !== studentId);
    }
    return next;
  };

  const handleDropOnDay = useCallback(
    (e, day) => {
      e.preventDefault();
      if (!draggedId) return;
      setLayout((prev) => {
        const next = removeFromLayout(prev, draggedId);
        next[day] = [...next[day], draggedId];
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
  const handleDistribute = () => {
    // Bagi rata TERPISAH per jenis kelamin, biar tiap hari dapet campuran
    // cowok-cewek yang proporsional (bukan random murni gabungan).
    // Contoh: 16 laki-laki / 5 hari = 3 per hari, sisa 1 masuk hari terakhir.
    //         20 perempuan / 5 hari = 4 per hari (pas, gak ada sisa).
    const next = Object.fromEntries(DAYS.map((d) => [d, []]));

    const distributeGroup = (group) => {
      const shuffled = [...group].sort(() => Math.random() - 0.5);
      const perDay = Math.floor(shuffled.length / DAYS.length);
      let idx = 0;
      DAYS.forEach((day, dayIndex) => {
        const isLastDay = dayIndex === DAYS.length - 1;
        const count = isLastDay ? shuffled.length - idx : perDay;
        for (let i = 0; i < count && idx < shuffled.length; i++) {
          next[day].push(shuffled[idx].id);
          idx++;
        }
      });
    };

    const laki = students.filter((s) => s.gender === "L");
    const perempuan = students.filter((s) => s.gender === "P");
    // Jaga-jaga kalau ada siswa yang datanya gender-nya kosong/belum keisi,
    // tetep ikut dibagi (bukan ilang) supaya semua siswa kebagian jadwal.
    const tanpaGender = students.filter((s) => s.gender !== "L" && s.gender !== "P");

    distributeGroup(laki);
    distributeGroup(perempuan);
    if (tanpaGender.length > 0) distributeGroup(tanpaGender);

    setLayout(next);
    setDirty(true);
  };

  const handleClear = () => {
    if (!window.confirm("Kosongkan semua jadwal piket?")) return;
    setLayout(EMPTY_LAYOUT);
    setDirty(true);
  };

  const removeStudent = (day, studentId) => {
    setLayout((prev) => ({
      ...prev,
      [day]: prev[day].filter((id) => id !== studentId),
    }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const { error: saveError } = await supabase.from("duty_schedules").upsert(
        {
          class_id: classId,
          academic_year: academicYear,
          semester,
          layout,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "class_id,academic_year,semester" }
      );

      if (saveError) throw saveError;
      setDirty(false);
      setToast({ type: "success", message: "Jadwal piket berhasil disimpan" });
    } catch (err) {
      console.error("Error saving duty schedule:", err);
      const msg = err.message || "Gagal menyimpan jadwal piket";
      setError(msg);
      setToast({ type: "error", message: msg });
    } finally {
      setSaving(false);
    }
  };

  // ===== HELPER: trigger download file dari Blob =====
  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ===== EXPORT EXCEL =====
  const handleExport = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Jadwal Piket");

      // Cuma set key + width di sini (TANPA 'header'), biar ga otomatis
      // nulis nama hari ke row 1 - kita atur sendiri urutan barisnya di bawah.
      worksheet.columns = DAYS.map((day) => ({ key: day, width: 28 }));

      // ===== Baris judul (baris 1-3), baris 4-5 kosong, baris 6 = header tabel =====
      const titleRow1 = worksheet.addRow(["SMP MUSLIMIN CILILIN"]);
      const titleRow2 = worksheet.addRow([`JADWAL PIKET KELAS ${classId}`]);
      const titleRow3 = worksheet.addRow([`TAHUN AJARAN ${academicYear}`]);
      worksheet.addRow([]); // baris kosong
      worksheet.addRow([]); // baris kosong

      worksheet.mergeCells(1, 1, 1, DAYS.length);
      worksheet.mergeCells(2, 1, 2, DAYS.length);
      worksheet.mergeCells(3, 1, 3, DAYS.length);

      titleRow1.getCell(1).font = { bold: true, size: 14 };
      titleRow1.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      titleRow1.height = 24;

      titleRow2.getCell(1).font = { bold: true, size: 12 };
      titleRow2.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      titleRow2.height = 20;

      titleRow3.getCell(1).font = { bold: true, size: 11 };
      titleRow3.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      titleRow3.height = 20;

      // Header tabel (baris 6)
      const headerRow = worksheet.addRow(DAYS);
      headerRow.height = 22;
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      // Isi baris data (samain panjang dengan hari yang paling banyak siswanya)
      const maxRows = Math.max(0, ...DAYS.map((d) => (layout[d] || []).length));
      for (let i = 0; i < maxRows; i++) {
        const rowData = {};
        DAYS.forEach((day) => {
          const studentId = (layout[day] || [])[i];
          rowData[day] = studentId ? studentMap[studentId]?.full_name || "" : "";
        });
        const row = worksheet.addRow(rowData);
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = {
            top: { style: "thin", color: { argb: "FFE5E7EB" } },
            left: { style: "thin", color: { argb: "FFE5E7EB" } },
            bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
            right: { style: "thin", color: { argb: "FFE5E7EB" } },
          };
          cell.alignment = { vertical: "middle" };
        });
      }

      worksheet.views = [{ state: "frozen", ySplit: headerRow.number }]; // header tabel tetap keliatan pas scroll

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const safeYear = (academicYear || "").replace(/\//g, "-");
      const filename = `Jadwal_Piket_${classId}_${safeYear}_${semester}.xlsx`;
      downloadBlob(blob, filename);

      setToast({ type: "success", message: "Jadwal piket berhasil diexport" });
    } catch (err) {
      console.error("Error exporting duty schedule:", err);
      setToast({ type: "error", message: "Gagal export jadwal piket" });
    }
  };

  // ===== IMPORT EXCEL =====
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.worksheets[0];

      if (!worksheet) {
        throw new Error("File Excel kosong");
      }

      // Cari baris header tabel (baris yang isinya persis 5 nama hari) -
      // gak hardcode row 1, karena sekarang ada blok judul di atas tabel.
      // Perbandingannya dinormalisasi (normalizeHeaderText) biar tetap
      // ketemu walau file sempat di-resave di Excel/Sheets/WPS (lihat
      // komentar di deklarasi normalizeHeaderText di atas).
      let headerRowNumber = -1;
      let dayColumnIndex = {};
      const scanLimit = Math.min(15, worksheet.rowCount);
      for (let r = 1; r <= scanLimit; r++) {
        const row = worksheet.getRow(r);
        const tempIndex = {};
        DAYS.forEach((day) => {
          let idx = -1;
          const normalizedDay = normalizeHeaderText(day);
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            if (normalizeHeaderText(cell.value) === normalizedDay) {
              idx = colNumber;
            }
          });
          tempIndex[day] = idx;
        });
        if (DAYS.every((d) => tempIndex[d] !== -1)) {
          headerRowNumber = r;
          dayColumnIndex = tempIndex;
          break;
        }
      }

      if (headerRowNumber === -1) {
        throw new Error(
          `Kolom hari tidak ditemukan di file. Pastikan ada baris header persis: ${DAYS.join(" | ")}`
        );
      }

      // Antrian id per nama (lowercase, trim) - biar nama kembar tetap
      // ke-assign ke siswa berbeda satu-satu, bukan siswa yang sama berkali-kali
      const nameQueue = {};
      students.forEach((s) => {
        const key = s.full_name.trim().toLowerCase();
        if (!nameQueue[key]) nameQueue[key] = [];
        nameQueue[key].push(s.id);
      });

      const newLayout = Object.fromEntries(DAYS.map((d) => [d, []]));
      const notFound = [];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= headerRowNumber) return; // skip blok judul + baris header tabel
        DAYS.forEach((day) => {
          const cellValue = row.getCell(dayColumnIndex[day]).value;
          const cell = String(cellValue || "").trim();
          if (!cell) return;
          const key = cell.toLowerCase();
          const queue = nameQueue[key];
          if (queue && queue.length > 0) {
            newLayout[day].push(queue.shift());
          } else {
            notFound.push(cell);
          }
        });
      });

      setLayout(newLayout);
      setDirty(true);

      if (notFound.length > 0) {
        setToast({
          type: "error",
          message: `Diimport, tapi ${notFound.length} nama tidak cocok dengan siswa aktif: ${notFound
            .slice(0, 5)
            .join(", ")}${notFound.length > 5 ? ", ..." : ""}`,
        });
      } else {
        setToast({ type: "success", message: "Jadwal piket berhasil diimport" });
      }
    } catch (err) {
      console.error("Error importing duty schedule:", err);
      setToast({
        type: "error",
        message: err.message || "Gagal membaca file Excel",
      });
    } finally {
      // reset biar file yang sama bisa diupload ulang
      e.target.value = "";
    }
  };

  // ===== RENDER =====
  if (loading) {
    return (
      <div className="bg-theme-bg rounded-xl border border-theme p-8 flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={20} />
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all ${
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {toast.type === "success" ? <Save size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      <div className="bg-theme-bg rounded-xl border border-theme p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <ClipboardCheck size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-theme">Jadwal Piket</h2>
              <p className="text-sm text-theme-secondary">
                Kelas {classId} • {academicYear} ({semester === "ganjil" ? "Ganjil" : "Genap"})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              onClick={handleImportClick}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-theme-secondary bg-theme-surface hover:bg-theme-surface border border-theme rounded-lg transition"
            >
              <Upload size={15} />
              Import Excel
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-theme-secondary bg-theme-surface hover:bg-theme-surface border border-theme rounded-lg transition"
            >
              <FileSpreadsheet size={15} />
              Export Excel
            </button>
            <button
              onClick={handleDistribute}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-theme-secondary bg-theme-surface hover:bg-theme-surface border border-theme rounded-lg transition"
            >
              <Shuffle size={15} />
              Bagi Rata
            </button>
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-theme-secondary bg-theme-surface hover:bg-theme-surface border border-theme rounded-lg transition"
            >
              <Trash2 size={15} />
              Kosongkan
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

      <div className="space-y-4">
        {/* Tabel 5 hari - full width, biar Senin-Jumat kelihatan penuh dalam satu layar */}
        <div className="bg-theme-bg rounded-xl border border-theme p-6 overflow-x-auto">
          <div className="grid grid-cols-5 gap-4 min-w-[600px]">
            {DAYS.map((day) => (
              <div
                key={day}
                onDragOver={allowDrop}
                onDrop={(e) => handleDropOnDay(e, day)}
                className="flex flex-col gap-2"
              >
                <div className="text-center">
                  <span className="text-sm font-semibold text-theme-secondary">{day}</span>
                  <span className="text-xs text-gray-400 ml-1">({(layout[day] || []).length})</span>
                </div>
                <div className="flex-1 min-h-[300px] bg-amber-50/60 border-2 border-dashed border-amber-200 rounded-lg p-2 space-y-2">
                  {(layout[day] || []).map((studentId) => {
                    const student = studentMap[studentId];
                    if (!student) return null;
                    return (
                      <div
                        key={studentId}
                        draggable
                        onDragStart={() => handleDragStart(studentId)}
                        className="group flex items-center justify-between gap-1 px-2 py-1.5 bg-theme-bg border border-amber-200 rounded-md text-xs cursor-grab active:cursor-grabbing shadow-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-theme truncate">{student.full_name}</p>
                        </div>
                        <button
                          onClick={() => removeStudent(day, studentId)}
                          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition shrink-0"
                          aria-label={`Hapus ${student.full_name} dari ${day}`}
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                  {(layout[day] || []).length === 0 && (
                    <p className="text-[10px] text-gray-300 text-center pt-4">
                      Seret siswa ke sini
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Daftar siswa belum ditugaskan - dipindah ke bawah tabel, tampil sebagai chip horizontal */}
        <div
          className="bg-theme-bg rounded-xl border border-theme p-4"
          onDragOver={allowDrop}
          onDrop={handleDropOnUnassigned}
        >
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-theme-secondary" />
            <h3 className="text-sm font-semibold text-theme">
              Belum Ditugaskan ({unassignedStudents.length})
            </h3>
          </div>

          {unassignedStudents.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">
              Semua siswa sudah dijadwalkan 🎉
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {unassignedStudents.map((s) => (
                <div
                  key={s.id}
                  draggable
                  onDragStart={() => handleDragStart(s.id)}
                  className="px-3 py-2 bg-theme-surface hover:bg-theme-surface border border-theme rounded-lg text-sm cursor-grab active:cursor-grabbing transition"
                >
                  <p className="font-medium text-theme leading-tight">{s.full_name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
