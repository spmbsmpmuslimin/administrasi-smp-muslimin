// pages/KelolaJadwalPelajaran.js
// CRUD jadwal pelajaran per kelas (tabel class_schedules) — khusus role
// wali kelas (bukan admin/TU), supaya wali kelas bisa atur sendiri jadwal
// kelasnya tanpa nunggu admin.
// Ditampilin di portal siswa lewat StudentJadwal.js.
// JAM_SCHEDULE dipindah ke utils/jamPelajaran.js (dipakai bareng sama
// AdminJadwalMassal.js) biar gak dobel definisi di beberapa file.
import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "../supabaseClient";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { Plus, Trash2, X, AlertCircle, CheckCircle, Download, Upload } from "lucide-react";
import { JAM_SCHEDULE, DAYS, ALL_PERIODS, getAvailablePeriods, findPeriod } from "../utils/jamPelajaran";

const emptyForm = {
  day: "Senin",
  periods: [],
  subject: "",
  teacher_name: "",
};

export default function JadwalPelajaran({ user }) {
  // FIX (kebocoran jadwal antar-kelas): prop `user` yang dioper dari App.js
  // itu SNAPSHOT localStorage dari pas login — bisa aja gak punya
  // homeroom_class_id, atau udah basi kalau admin ubah penugasan kelas
  // belakangan. Gerbang akses "Wali Kelas Only" di ProtectedRoute malah
  // pakai data fresh hasil fetch ulang dari tabel `users`, tapi hasil
  // fetch itu gak pernah dioper ke komponen ini. Jadi di sini kita fetch
  // ULANG sendiri homeroom_class_id yang bener, langsung dari DB pakai
  // user.id — gak percaya ke prop user.homeroom_class_id begitu aja.
  const [classId, setClassId] = useState("");
  const [resolvingUser, setResolvingUser] = useState(true);
  const [userError, setUserError] = useState(null);

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null); // null = mode tambah
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const resolveHomeroomClass = async () => {
      setResolvingUser(true);
      setUserError(null);

      if (!user?.id) {
        if (!cancelled) {
          setClassId("");
          setResolvingUser(false);
        }
        return;
      }

      try {
        const { data, error: err } = await supabase
          .from("users")
          .select("role, homeroom_class_id")
          .eq("id", user.id)
          .maybeSingle();

        if (cancelled) return;

        if (err) throw err;

        if (!data || data.role !== "teacher" || !data.homeroom_class_id) {
          setClassId("");
        } else {
          setClassId(data.homeroom_class_id);
        }
      } catch (err) {
        if (!cancelled) {
          setUserError("Gagal memverifikasi data wali kelas: " + err.message);
          setClassId("");
        }
      } finally {
        if (!cancelled) setResolvingUser(false);
      }
    };

    resolveHomeroomClass();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (resolvingUser) return;
    if (classId) fetchSchedules(classId);
    else setSchedules([]);
  }, [classId, resolvingUser]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 2500);
    return () => clearTimeout(t);
  }, [success]);

  const fetchSchedules = async (cid) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("class_schedules")
        .select("id, class_id, day, subject, start_time, end_time, teacher_name")
        .eq("class_id", cid)
        .order("day")
        .order("start_time");

      if (err) throw err;
      setSchedules(data || []);
    } catch (err) {
      setError("Gagal memuat jadwal: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Grid: { [day]: { [period]: schedule | undefined } }
  const grid = useMemo(() => {
    const g = {};
    DAYS.forEach((day) => (g[day] = {}));
    schedules.forEach((s) => {
      const period = findPeriod(s.day, s.start_time, s.end_time);
      if (period) g[s.day][period] = s;
    });
    return g;
  }, [schedules]);

  const openAddModal = (day, period) => {
    setEditingSchedule(null);
    setFormData({
      day,
      periods: period ? [period] : [],
      subject: "",
      teacher_name: "",
    });
    setShowModal(true);
  };

  const openEditModal = (schedule) => {
    const period = findPeriod(schedule.day, schedule.start_time, schedule.end_time);
    setEditingSchedule(schedule);
    setFormData({
      day: schedule.day,
      periods: period ? [period] : [],
      subject: schedule.subject || "",
      teacher_name: schedule.teacher_name || "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSchedule(null);
    setFormData(emptyForm);
  };

  const togglePeriod = (period) => {
    setFormData((prev) => {
      const has = prev.periods.includes(period);
      return {
        ...prev,
        periods: has
          ? prev.periods.filter((p) => p !== period)
          : [...prev.periods, period].sort((a, b) => a - b),
      };
    });
  };

  const handleCellClick = (day, period) => {
    const existing = grid[day][period];
    if (existing) openEditModal(existing);
    else openAddModal(day, period);
  };

  const handleDelete = async (schedule) => {
    if (!window.confirm(`Hapus jadwal "${schedule.subject}" (${schedule.day})?`)) return;
    try {
      const { error: err } = await supabase.from("class_schedules").delete().eq("id", schedule.id);
      if (err) throw err;
      setSuccess("Jadwal berhasil dihapus");
      fetchSchedules(classId);
    } catch (err) {
      setError("Gagal menghapus: " + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject.trim()) {
      setError("Mapel wajib diisi");
      return;
    }
    if (formData.periods.length === 0) {
      setError("Pilih minimal satu jam pelajaran");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (editingSchedule) {
        // Mode edit: cuma 1 periode, update row yang ada.
        const period = formData.periods[0];
        const range = JAM_SCHEDULE[formData.day][period];
        const { error: err } = await supabase
          .from("class_schedules")
          .update({
            day: formData.day,
            subject: formData.subject.trim(),
            teacher_name: formData.teacher_name.trim() || null,
            start_time: `${range.start}:00`,
            end_time: `${range.end}:00`,
          })
          .eq("id", editingSchedule.id);
        if (err) throw err;
        setSuccess("Jadwal berhasil diperbarui");
      } else {
        // Mode tambah: bisa banyak periode sekaligus, tiap periode -> 1 row
        // (biar konsisten sama struktur data existing & numbering "Jam Ke"
        // di portal siswa).
        const rows = formData.periods.map((period) => {
          const range = JAM_SCHEDULE[formData.day][period];
          return {
            class_id: classId,
            day: formData.day,
            subject: formData.subject.trim(),
            teacher_name: formData.teacher_name.trim() || null,
            start_time: `${range.start}:00`,
            end_time: `${range.end}:00`,
          };
        });
        const { error: err } = await supabase.from("class_schedules").insert(rows);
        if (err) throw err;
        setSuccess(`${rows.length} jadwal berhasil ditambahkan`);
      }

      closeModal();
      fetchSchedules(classId);
    } catch (err) {
      setError("Gagal menyimpan: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Export jadwal kelas terpilih ke Excel yang rapi & gampang diisi orang
  // awam: ada judul, petunjuk pengisian, header berwarna, baris per-hari
  // dikasih warna selang-seling, dan kolom Hari/Jam Ke/Jam Mulai/Jam
  // Selesai DIKUNCI (cuma Mapel & Guru yang bisa diedit) biar gak ada yang
  // gak sengaja ubah/hapus kolom lain. Slot yang belum ada jadwalnya
  // Mapel/Guru-nya dikosongin -> otomatis jadi template kosong.
  const handleExport = async () => {
    if (!classId) return;

    const wb = new ExcelJS.Workbook();
    wb.creator = "Aplikasi Administrasi SMP Muslimin";
    const ws = wb.addWorksheet("Jadwal", {
      views: [{ state: "frozen", ySplit: 5 }],
      pageSetup: {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      },
    });

    ws.columns = [
      { width: 10 }, // Hari
      { width: 9 }, // Jam Ke
      { width: 11 }, // Jam Mulai
      { width: 12 }, // Jam Selesai
      { width: 26 }, // Mapel
      { width: 26 }, // Guru
    ];

    // Baris 1: judul
    ws.mergeCells("A1:F1");
    const titleCell = ws.getCell("A1");
    titleCell.value = `JADWAL PELAJARAN KELAS ${classId}`;
    titleCell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1D4ED8" },
    };
    ws.getRow(1).height = 26;

    // Baris 2-3: petunjuk pengisian
    ws.mergeCells("A2:F3");
    const infoCell = ws.getCell("A2");
    infoCell.value =
      "PETUNJUK: Isi kolom Mapel (wajib) dan Guru (boleh kosong) di baris jam yang sesuai. " +
      "Kolom Hari, Jam Ke, Jam Mulai, dan Jam Selesai dikunci, JANGAN diubah. " +
      "Baris yang Mapel-nya dibiarin kosong dianggap jam kosong. " +
      "Kalau sudah selesai, Simpan file ini, lalu upload lewat tombol Import di aplikasi.";
    infoCell.font = { italic: true, size: 10, color: { argb: "FF78716C" } };
    infoCell.alignment = { vertical: "middle", wrapText: true };
    infoCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFEF3C7" },
    };
    ws.getRow(2).height = 34;
    ws.getRow(3).height = 34;

    ws.getRow(4).height = 6; // spacer tipis sebelum header

    // Baris 5: header kolom
    const headerRow = ws.getRow(5);
    headerRow.values = ["Hari", "Jam Ke", "Jam Mulai", "Jam Selesai", "Mapel", "Guru"];
    headerRow.height = 20;
    // Border hitam polos, tipis, di semua sisi tiap sel.
    const blackBorder = { style: "thin", color: { argb: "FF000000" } };
    const cellBorder = {
      top: blackBorder,
      bottom: blackBorder,
      left: blackBorder,
      right: blackBorder,
    };

    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2563EB" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = cellBorder;
    });

    // Baris data, dikelompokin per hari — SATU HARI SATU WARNA, semua
    // kolom (termasuk Mapel & Guru) kena warna yang sama biar keliatan
    // satu blok utuh. Gak di-merge, biar aman kalau dibaca ulang pas
    // import.
    const dayColors = {
      Senin: "FFDCEEFF", // biru muda
      Selasa: "FFFFE4EC", // pink muda
      Rabu: "FFE3F9E8", // hijau muda
      Kamis: "FFFFF3D1", // kuning muda
      Jumat: "FFEDE3FF", // ungu muda
    };
    let rowIdx = 6;
    DAYS.forEach((day, dayIdx) => {
      const periods = getAvailablePeriods(day);
      const bandColor = dayColors[day] || "FFF1F5F9";
      const isFirstRowOfDay = true;

      periods.forEach((period, pIdx) => {
        const range = JAM_SCHEDULE[day][period];
        const existing = grid[day][period];
        const row = ws.getRow(rowIdx);
        row.values = [
          day,
          period,
          range.start,
          range.end,
          existing?.subject || "",
          existing?.teacher_name || "",
        ];
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const locked = colNumber <= 4; // Hari, Jam Ke, Jam Mulai, Jam Selesai
          cell.protection = { locked };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: bandColor },
          };
          cell.alignment = {
            vertical: "middle",
            horizontal: colNumber <= 4 ? "center" : "left",
          };
          cell.border = cellBorder;
        });
        if (isFirstRowOfDay && pIdx === 0) {
          row.getCell(1).font = { bold: true };
        }
        rowIdx++;
      });

      // Baris pemisah abu-abu tipis antar blok hari (kecuali setelah hari
      // terakhir).
      if (dayIdx < DAYS.length - 1) {
        const spacerRow = ws.getRow(rowIdx);
        spacerRow.height = 6;
        for (let col = 1; col <= 6; col++) {
          spacerRow.getCell(col).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD1D5DB" },
          };
        }
        rowIdx++;
      }
    });

    // Kunci kolom Hari/Jam, biarin Mapel & Guru bebas diedit.
    ws.protect("", { selectLockedCells: true, selectUnlockedCells: true });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Jadwal_Kelas_${classId}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    if (!classId || importing) return;
    fileInputRef.current?.click();
  };

  // Import: baca file Excel, cari baris header otomatis (baris yang punya
  // "Hari" & "Mapel" di kolomnya) biar gak tergantung layout export persis
  // di baris berapa, validasi tiap baris, lalu REPLACE TOTAL jadwal kelas
  // terpilih (hapus semua yang lama, insert yang baru dari file). Baris
  // dengan Mapel kosong dianggap slot kosong dan dilewatin.
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // biar file yang sama bisa dipilih ulang nanti
    if (!file || !classId) return;

    setError(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

      // Cari baris header
      let headerRowIdx = -1;
      let colMap = {};
      for (let i = 0; i < raw.length; i++) {
        const rowLabels = raw[i].map((v) => String(v).trim());
        if (rowLabels.includes("Hari") && rowLabels.includes("Mapel")) {
          headerRowIdx = i;
          rowLabels.forEach((label, colIdx) => {
            colMap[label] = colIdx;
          });
          break;
        }
      }

      if (headerRowIdx === -1) {
        setError(
          "Format file gak dikenali: kolom header (Hari, Jam Ke, Mapel, dst) gak ketemu. Pastikan pakai file hasil Export dari aplikasi ini."
        );
        return;
      }

      const parsed = [];
      const errors = [];
      raw.slice(headerRowIdx + 1).forEach((row, i) => {
        const excelRowNumber = headerRowIdx + 2 + i + 1; // nomor baris asli buat pesan error
        const day = String(row[colMap["Hari"]] ?? "").trim();
        const period = String(row[colMap["Jam Ke"]] ?? "").trim();
        const subject = String(row[colMap["Mapel"]] ?? "").trim();
        const teacher = String(row[colMap["Guru"]] ?? "").trim();

        if (!day && !subject) return; // baris kosong total
        if (!subject) return; // slot kosong, dilewatin

        if (!DAYS.includes(day)) {
          errors.push(`Baris ${excelRowNumber}: hari "${day}" tidak dikenali`);
          return;
        }
        const range = JAM_SCHEDULE[day]?.[period];
        if (!range?.start) {
          errors.push(`Baris ${excelRowNumber}: jam ke "${period}" tidak valid untuk hari ${day}`);
          return;
        }
        parsed.push({
          class_id: classId,
          day,
          subject,
          teacher_name: teacher || null,
          start_time: `${range.start}:00`,
          end_time: `${range.end}:00`,
        });
      });

      if (errors.length > 0) {
        setError(
          `Import dibatalkan, ada ${errors.length} baris bermasalah:\n` +
            errors.slice(0, 5).join("\n") +
            (errors.length > 5 ? `\n...dan ${errors.length - 5} lagi` : "")
        );
        return;
      }
      if (parsed.length === 0) {
        setError("Tidak ada jadwal yang bisa diimport (semua baris Mapel kosong).");
        return;
      }
      if (
        !window.confirm(
          `Import akan MENGGANTI semua jadwal Kelas ${classId} yang ada sekarang dengan ${parsed.length} jadwal dari file ini. Lanjutkan?`
        )
      )
        return;

      setImporting(true);
      const { error: delErr } = await supabase
        .from("class_schedules")
        .delete()
        .eq("class_id", classId);
      if (delErr) throw delErr;

      const { error: insErr } = await supabase.from("class_schedules").insert(parsed);
      if (insErr) throw insErr;

      setSuccess(`${parsed.length} jadwal berhasil diimport`);
      fetchSchedules(classId);
    } catch (err) {
      setError("Gagal import: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  const availablePeriodsForForm = getAvailablePeriods(formData.day);
  // Pas mode tambah, jangan tawarin periode yang udah keisi (kecuali yang
  // baru diklik). Pas mode edit, cuma tampilin periode yang lagi dipake.
  const periodOptions = editingSchedule
    ? availablePeriodsForForm
    : availablePeriodsForForm.filter((p) => !grid[formData.day][p] || formData.periods.includes(p));

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-lg font-bold text-theme">Jadwal Pelajaran Kelas</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleImportFile}
            />
            <button
              onClick={handleExport}
              disabled={!classId}
              title="Download jadwal kelas ini sebagai Excel (kosong = jadi template)"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-theme-bg border border-theme hover:border-theme disabled:opacity-40 text-theme-secondary rounded-xl text-sm font-semibold"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={handleImportClick}
              disabled={!classId || importing}
              title="Upload Excel untuk mengganti jadwal kelas ini"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-theme-bg border border-theme hover:border-theme disabled:opacity-40 text-theme-secondary rounded-xl text-sm font-semibold"
            >
              <Upload className="w-4 h-4" />
              {importing ? "Mengimport..." : "Import"}
            </button>
            <button
              onClick={() => openAddModal(formData.day || "Senin", null)}
              disabled={!classId}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              Tambah Jadwal
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {success}
          </div>
        )}

        {/* Kelas — FIX: dulu ini dropdown bebas pilih SEMUA kelas yang ada
            di DB + tombol nambah kelas baru sembarangan. Sekarang cuma
            label statis kelas yang emang jadi tanggung jawab wali kelas
            yang login (dari user.homeroom_class_id), gak bisa diganti. */}
        <div className="bg-theme-bg rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-3 flex-wrap">
          <label className="text-sm font-semibold text-theme-secondary">Kelas:</label>
          <span className="px-3 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-semibold">
            {classId ? `Kelas ${classId}` : "—"}
          </span>
        </div>

        {/* Grid jadwal */}
        {resolvingUser || loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : userError ? (
          <div className="bg-theme-bg rounded-2xl border border-red-100 p-8 text-center text-red-500 text-sm shadow-sm">
            {userError}
          </div>
        ) : !classId ? (
          <div className="bg-theme-bg rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-sm shadow-sm">
            Akun ini belum ditugaskan sebagai wali kelas manapun (kolom homeroom_class_id kosong).
            Hubungi admin untuk mengatur kelasnya.
          </div>
        ) : (
          <div className="bg-theme-bg rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="bg-theme-surface text-theme-secondary">
                    <th className="py-2.5 px-3 font-semibold text-left w-14">Jam</th>
                    {DAYS.map((day) => (
                      <th key={day} className="py-2.5 px-3 font-semibold text-left min-w-[140px]">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ALL_PERIODS.map((period) => {
                    const anyDayHasPeriod = DAYS.some((d) => JAM_SCHEDULE[d][period]?.start);
                    if (!anyDayHasPeriod) return null;

                    return (
                      <tr key={period} className="border-t border-gray-50">
                        <td className="py-2 px-3 font-bold text-gray-400 align-top">{period}</td>
                        {DAYS.map((day) => {
                          const range = JAM_SCHEDULE[day][period];
                          const disabled = !range?.start;
                          const item = grid[day][period];

                          if (disabled) {
                            return (
                              <td key={day} className="py-2 px-3 text-gray-200 align-top">
                                —
                              </td>
                            );
                          }

                          return (
                            <td key={day} className="py-1.5 px-1.5 align-top">
                              <button
                                onClick={() => handleCellClick(day, period)}
                                className={`w-full text-left rounded-lg px-2.5 py-2 border transition group relative ${
                                  item
                                    ? "bg-blue-50 border-blue-100 hover:border-blue-300"
                                    : "bg-theme-surface border-dashed border-theme hover:border-blue-300 hover:bg-blue-50/50"
                                }`}
                              >
                                {item ? (
                                  <>
                                    <p className="font-semibold text-theme leading-tight">
                                      {item.subject}
                                    </p>
                                    <p className="text-[11px] text-theme-secondary mt-0.5">
                                      {item.teacher_name || "-"}
                                    </p>
                                    <p className="text-[10px] text-blue-500 font-medium mt-0.5">
                                      {range.start}–{range.end}
                                    </p>
                                    <span
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(item);
                                      }}
                                      className="hidden group-hover:flex absolute top-1 right-1 items-center justify-center w-5 h-5 rounded-md bg-theme-bg border border-red-100 text-red-500 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </span>
                                  </>
                                ) : (
                                  <p className="text-[11px] text-gray-300 flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> Kosong
                                  </p>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal tambah/edit */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-theme-bg rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-theme">
                  {editingSchedule ? "Edit Jadwal" : "Tambah Jadwal"}
                </h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-theme-secondary">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-theme-secondary mb-1.5">Hari</label>
                  <select
                    value={formData.day}
                    disabled={!!editingSchedule}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        day: e.target.value,
                        periods: [],
                      })
                    }
                    className="w-full px-3 py-2 bg-theme-bg text-theme border border-theme rounded-xl text-sm disabled:bg-theme-surface disabled:text-gray-400"
                  >
                    {DAYS.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-theme-secondary mb-1.5">
                    Jam Ke {!editingSchedule && "(bisa pilih lebih dari satu)"}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {periodOptions.map((p) => {
                      const active = formData.periods.includes(p);
                      return (
                        <button
                          type="button"
                          key={p}
                          disabled={!!editingSchedule && !active}
                          onClick={() => togglePeriod(p)}
                          className={`w-9 h-9 rounded-lg text-sm font-semibold border transition ${
                            active
                              ? "bg-blue-600 border-blue-600 text-white"
                              : "bg-theme-bg border-theme text-theme-secondary hover:border-blue-300"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                    {periodOptions.length === 0 && (
                      <p className="text-xs text-gray-400">Semua jam di hari ini udah keisi.</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-theme-secondary mb-1.5">Mapel</label>
                  <input
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="mis. IPA"
                    className="w-full px-3 py-2 bg-theme-bg text-theme border border-theme rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-theme-secondary mb-1.5">
                    Guru (opsional)
                  </label>
                  <input
                    value={formData.teacher_name}
                    onChange={(e) => setFormData({ ...formData, teacher_name: e.target.value })}
                    placeholder="mis. Syalfa Hauratunisa"
                    className="w-full px-3 py-2 bg-theme-bg text-theme border border-theme rounded-xl text-sm"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  {editingSchedule && (
                    <button
                      type="button"
                      onClick={() => {
                        handleDelete(editingSchedule);
                        closeModal();
                      }}
                      className="px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50"
                    >
                      Hapus
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-theme-secondary bg-theme-surface hover:bg-gray-200"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
                  >
                    {saving ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
