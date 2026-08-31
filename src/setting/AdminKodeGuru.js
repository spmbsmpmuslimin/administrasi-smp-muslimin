// setting/AdminKodeGuru.js
// Dipanggil sebagai sub-tab dari JadwalGuruTab.js (menu "Kelola Jadwal
// Pelajaran" di halaman Setting), bukan lagi halaman berdiri sendiri.
// Master "Kode Guru" — mapping kode singkat (yang dipakai WKS. Kurikulum
// di PDF jadwal, mis. "18", "8P", "23I") -> Nama Guru + Mata Pelajaran.
// Sumber datanya PDF/tabel yang di-share WKS. Kurikulum tiap semester,
// jadi flow utamanya IMPORT (bukan admin ngarang kode sendiri). Ada juga
// koreksi manual ringan (tambah/edit/hapus 1 baris) buat benerin typo
// tanpa perlu re-upload seluruh file.
//
// Dipakai sebagai kamus buat AdminJadwalMassal.js pas nge-decode kode
// jadwal per kelas jadi Mapel + Nama Guru.
import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "../supabaseClient";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import {
  Plus,
  Trash2,
  Pencil,
  X,
  AlertCircle,
  CheckCircle,
  Download,
  Upload,
  Search,
} from "lucide-react";
import { getActiveYearString } from "../services/academicYearService";

const emptyForm = {
  code: "",
  teacher_name: "",
  subject: "",
  weekly_hours: "",
  note: "",
  teacher_id: "",
};

export default function AdminKodeGuru() {
  const [academicYear, setAcademicYear] = useState("");
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        const year = await getActiveYearString();
        if (!year) {
          setError(
            "Tidak ada tahun ajaran aktif. Atur dulu di menu Pengaturan.",
          );
          setLoading(false);
          return;
        }
        setAcademicYear(year);
        await fetchCodes(year);
      } catch (err) {
        setError("Gagal memuat data: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 2500);
    return () => clearTimeout(t);
  }, [success]);

  // Urutan kode "natural": angka di depan dulu (1, 2, 3, ...), baru
  // suffix hurufnya (2 sebelum 2P, 3 sebelum 3S). Kalau cuma di-sort
  // sebagai teks biasa, urutannya bakal aneh (1, 11, 12, ..., 2, 20, ...).
  const naturalCodeSort = (a, b) => {
    const numA = parseInt(a.code.match(/^\d+/)?.[0] ?? "0", 10);
    const numB = parseInt(b.code.match(/^\d+/)?.[0] ?? "0", 10);
    if (numA !== numB) return numA - numB;
    return a.code.localeCompare(b.code);
  };

  // Kode turunan (prefix angka sama, guru sama -- mis. kode dasar "2"
  // dan variasi mapel lain "2P" punya-nya Agus Sopandi) gak perlu
  // nampilin ulang Keterangan (mis. status Wali Kelas) yang udah
  // ditampilin di kode dasarnya, biar tabel/export-nya gak "rame".
  // Note ASLI di tiap row TETEP disimpen (dipake pas buka form Edit),
  // ini cuma nambahin field baru `visibleNote` buat ditampilin. List
  // yang masuk harus udah kesortir naturalCodeSort (kode dasar duluan)
  // biar baris pertama per grup yang ketiban nampilin.
  const withVisibleNotes = (list) => {
    const lastShown = new Map(); // key -> teks note terakhir yang ditampilin buat grup ini
    return list.map((c) => {
      const prefix = c.code.match(/^\d+/)?.[0] ?? c.code;
      const key = `${prefix}|${c.teacher_name}`;
      let visibleNote = c.note || "";
      if (visibleNote) {
        if (lastShown.get(key) === visibleNote) {
          // Sama persis kayak yang udah ditampilin di kode sebelumnya
          // dalam grup ini -> gak usah diulang.
          visibleNote = "";
        } else {
          // Kosong pertama kali ketemu, ATAU beda teksnya dari yang
          // sebelumnya (mis. keterangan khusus per-mapel) -> tetep
          // ditampilin, jangan asal suppress.
          lastShown.set(key, visibleNote);
        }
      }
      return { ...c, visibleNote };
    });
  };

  const fetchCodes = async (year) => {
    const { data, error: err } = await supabase
      .from("teacher_codes")
      .select("id, code, teacher_name, subject, weekly_hours, note, teacher_id")
      .eq("academic_year", year);
    if (err) throw err;
    setCodes((data || []).slice().sort(naturalCodeSort));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = !q
      ? codes
      : codes.filter(
          (c) =>
            c.code.toLowerCase().includes(q) ||
            c.teacher_name.toLowerCase().includes(q) ||
            c.subject.toLowerCase().includes(q),
        );
    // Suppress dihitung dari `codes` penuh (bukan hasil filter search),
    // biar kode dasarnya tetep "ngitung" walau lagi ke-filter out sama
    // pencarian -- jadi kode turunan yang nyantol di hasil search gak
    // tiba-tiba nampilin note-nya lagi cuma gara-gara kode dasarnya lagi
    // gak keliatan.
    const visibleMap = new Map(
      withVisibleNotes(codes).map((c) => [c.id, c.visibleNote]),
    );
    return base.map((c) => ({
      ...c,
      visibleNote: visibleMap.get(c.id) ?? c.note ?? "",
    }));
  }, [codes, search]);

  const openAddModal = () => {
    setEditingRow(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (row) => {
    setEditingRow(row);
    setFormData({
      code: row.code,
      teacher_name: row.teacher_name,
      subject: row.subject,
      weekly_hours: row.weekly_hours != null ? String(row.weekly_hours) : "",
      note: row.note || "",
      teacher_id: row.teacher_id || "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRow(null);
    setFormData(emptyForm);
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Hapus kode "${row.code}" (${row.teacher_name})?`))
      return;
    try {
      const { error: err } = await supabase
        .from("teacher_codes")
        .delete()
        .eq("id", row.id);
      if (err) throw err;
      setSuccess("Kode berhasil dihapus");
      fetchCodes(academicYear);
    } catch (err) {
      setError("Gagal menghapus: " + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = formData.code.trim().toUpperCase();
    const teacher_name = formData.teacher_name.trim();
    const subject = formData.subject.trim();
    const teacher_id = formData.teacher_id.trim().toUpperCase() || null;
    if (!code || !teacher_name || !subject) {
      setError("Kode, Nama Guru, dan Mapel wajib diisi");
      return;
    }
    if (teacher_id && !/^G-\d+$/.test(teacher_id)) {
      setError(
        'Format ID Guru harus "G-" diikuti angka, mis. G-08 (atau kosongkan kalau belum tau)',
      );
      return;
    }
    // Jumlah jam mengajar (JP/minggu) opsional -- kosong itu wajar buat
    // kode kayak BP/BK (22, 27) yang jamnya gak dihitung per-JP di PDF
    // WKS. Kurikulum.
    const weeklyHoursRaw = formData.weekly_hours.trim();
    let weekly_hours = null;
    if (weeklyHoursRaw) {
      weekly_hours = parseInt(weeklyHoursRaw, 10);
      if (isNaN(weekly_hours) || weekly_hours < 0) {
        setError(
          "Jumlah Jam Mengajar harus angka (JP/minggu), atau kosongkan kalau belum ada",
        );
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      if (editingRow) {
        const { error: err } = await supabase
          .from("teacher_codes")
          .update({
            code,
            teacher_name,
            subject,
            weekly_hours,
            note: formData.note.trim() || null,
            teacher_id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingRow.id);
        if (err) throw err;
        setSuccess("Kode berhasil diperbarui");
      } else {
        const { error: err } = await supabase.from("teacher_codes").insert({
          academic_year: academicYear,
          code,
          teacher_name,
          subject,
          weekly_hours,
          note: formData.note.trim() || null,
          teacher_id,
        });
        if (err) {
          if (err.code === "23505") {
            throw new Error(
              `Kode "${code}" sudah ada untuk tahun ajaran ${academicYear}`,
            );
          }
          throw err;
        }
        setSuccess("Kode berhasil ditambahkan");
      }
      closeModal();
      fetchCodes(academicYear);
    } catch (err) {
      setError("Gagal menyimpan: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Export: kalau kosong -> jadi template kosong buat diisi sambil liat
  // PDF dari WKS. Kurikulum. Kalau udah ada isinya -> jadi backup / dasar
  // buat di-update semester depan.
  const handleExport = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Kode Guru");
    ws.columns = [
      { width: 10 },
      { width: 28 },
      { width: 22 },
      { width: 14 },
      { width: 34 },
      { width: 12 },
    ];

    ws.mergeCells("A1:F1");
    const title = ws.getCell("A1");
    title.value = `MASTER KODE GURU — TAHUN AJARAN ${academicYear}`;
    title.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
    title.alignment = { vertical: "middle", horizontal: "center" };
    title.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1D4ED8" },
    };
    ws.getRow(1).height = 24;

    ws.mergeCells("A2:F2");
    const info = ws.getCell("A2");
    info.value =
      "Isi/cek kolom Kode, Nama Guru, Mapel berdasarkan tabel kode guru dari WKS. Kurikulum. " +
      "Kode HARUS unik & sama persis kaya yang dipakai di grid jadwal (mis. 18, 8P, 23I). " +
      "Jumlah Jam (JP/minggu) opsional -- kosongin buat kode yang jamnya emang gak dihitung per-JP (mis. BP/BK). " +
      "ID Guru (format G-01, G-02, dst) opsional -- diisi kalau mau aktifin validasi silang ke data pengampu mapel (teacher_assignments).";
    info.font = { italic: true, size: 10, color: { argb: "FF78716C" } };
    info.alignment = { wrapText: true, vertical: "middle" };
    ws.getRow(2).height = 34;

    const header = ws.getRow(4);
    header.values = [
      "Kode",
      "Nama Guru",
      "Mapel",
      "Jumlah Jam (opsional)",
      "Keterangan (opsional)",
      "ID Guru (opsional)",
    ];
    header.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2563EB" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    let rowIdx = 5;
    withVisibleNotes(codes).forEach((c) => {
      ws.getRow(rowIdx).values = [
        c.code,
        c.teacher_name,
        c.subject,
        c.weekly_hours ?? "",
        c.visibleNote || "",
        c.teacher_id || "",
      ];
      rowIdx++;
    });
    if (codes.length === 0) {
      // Kasih beberapa baris kosong biar keliatan tempat isinya
      for (let i = 0; i < 30; i++) {
        rowIdx++;
      }
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Master_Kode_Guru_${academicYear.replace("/", "-")}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    if (importing) return;
    fileInputRef.current?.click();
  };

  // Import: REPLACE TOTAL master kode guru tahun ajaran aktif dengan isi
  // file. Baris yang Kode/Nama Guru/Mapel-nya kosong dilewatin.
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

      let headerRowIdx = -1;
      let colMap = {};
      for (let i = 0; i < raw.length; i++) {
        const rowLabels = raw[i].map((v) => String(v).trim());
        if (rowLabels.includes("Kode") && rowLabels.includes("Nama Guru")) {
          headerRowIdx = i;
          rowLabels.forEach((label, colIdx) => (colMap[label] = colIdx));
          break;
        }
      }
      if (headerRowIdx === -1) {
        setError(
          "Format file gak dikenali: kolom header (Kode, Nama Guru, Mapel) gak ketemu. Pakai file hasil Export dari halaman ini.",
        );
        return;
      }

      const seen = new Set();
      const parsed = [];
      const errors = [];
      raw.slice(headerRowIdx + 1).forEach((row, i) => {
        const excelRowNumber = headerRowIdx + 2 + i + 1;
        const code = String(row[colMap["Kode"]] ?? "")
          .trim()
          .toUpperCase();
        const teacher_name = String(row[colMap["Nama Guru"]] ?? "").trim();
        const subject = String(row[colMap["Mapel"]] ?? "").trim();
        // Kolom Jumlah Jam & ID Guru opsional -- file lama (sebelum
        // fitur ini ada) gak bakal punya kolom ini, colMap[...] jadi
        // undefined dan otomatis kekosongan, gak bikin import gagal.
        const weeklyHoursRaw = String(
          row[colMap["Jumlah Jam (opsional)"]] ?? "",
        ).trim();
        const note = String(row[colMap["Keterangan (opsional)"]] ?? "").trim();
        const teacherIdRaw = String(row[colMap["ID Guru (opsional)"]] ?? "")
          .trim()
          .toUpperCase();

        if (!code && !teacher_name && !subject) return; // baris kosong
        if (!code || !teacher_name || !subject) {
          errors.push(
            `Baris ${excelRowNumber}: Kode/Nama Guru/Mapel ada yang kosong`,
          );
          return;
        }
        if (seen.has(code)) {
          errors.push(
            `Baris ${excelRowNumber}: kode "${code}" duplikat di file ini`,
          );
          return;
        }
        let weekly_hours = null;
        if (weeklyHoursRaw) {
          weekly_hours = parseInt(weeklyHoursRaw, 10);
          if (isNaN(weekly_hours) || weekly_hours < 0) {
            errors.push(
              `Baris ${excelRowNumber}: Jumlah Jam "${weeklyHoursRaw}" harus angka (atau kosongkan)`,
            );
            return;
          }
        }
        if (teacherIdRaw && !/^G-\d+$/.test(teacherIdRaw)) {
          errors.push(
            `Baris ${excelRowNumber}: ID Guru "${teacherIdRaw}" formatnya salah (harus G-01, G-02, dst)`,
          );
          return;
        }
        seen.add(code);
        parsed.push({
          academic_year: academicYear,
          code,
          teacher_name,
          subject,
          weekly_hours,
          note: note || null,
          teacher_id: teacherIdRaw || null,
        });
      });

      if (errors.length > 0) {
        setError(
          `Import dibatalkan, ada ${errors.length} baris bermasalah:\n` +
            errors.slice(0, 6).join("\n") +
            (errors.length > 6 ? `\n...dan ${errors.length - 6} lagi` : ""),
        );
        return;
      }
      if (parsed.length === 0) {
        setError("Tidak ada data yang bisa diimport.");
        return;
      }
      if (
        !window.confirm(
          `Import akan MENGGANTI seluruh Master Kode Guru tahun ajaran ${academicYear} dengan ${parsed.length} baris dari file ini. Lanjutkan?`,
        )
      )
        return;

      setImporting(true);
      const { error: delErr } = await supabase
        .from("teacher_codes")
        .delete()
        .eq("academic_year", academicYear);
      if (delErr) throw delErr;

      const { error: insErr } = await supabase
        .from("teacher_codes")
        .insert(parsed);
      if (insErr) throw insErr;

      setSuccess(`${parsed.length} kode guru berhasil diimport`);
      fetchCodes(academicYear);
    } catch (err) {
      setError("Gagal import: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="w-full overflow-x-hidden">
      <div className="w-full space-y-4 p-3 sm:p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-theme">Master Kode Guru</h1>
            <p className="text-xs text-theme-secondary mt-0.5">
              Tahun Ajaran {academicYear || "—"} · sumber: tabel kode guru dari
              WKS. Kurikulum
            </p>
          </div>
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
              className="flex items-center gap-1.5 px-3.5 py-2 bg-theme-bg border border-theme hover:border-theme text-theme-secondary rounded-xl text-sm font-semibold">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={handleImportClick}
              disabled={importing}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-theme-bg border border-theme hover:border-theme disabled:opacity-40 text-theme-secondary rounded-xl text-sm font-semibold">
              <Upload className="w-4 h-4" />
              {importing ? "Mengimport..." : "Import"}
            </button>
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold">
              <Plus className="w-4 h-4" />
              Tambah
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm whitespace-pre-line">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {success}
          </div>
        )}

        <div className="bg-theme-bg rounded-2xl border border-gray-100 p-3 shadow-sm flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode, nama guru, atau mapel..."
            className="w-full text-sm outline-none"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-theme-bg rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-theme-surface text-theme-secondary text-left">
                    <th className="py-2.5 px-3 font-semibold w-20">Kode</th>
                    <th className="py-2.5 px-3 font-semibold">Nama Guru</th>
                    <th className="py-2.5 px-3 font-semibold">Mapel</th>
                    <th className="py-2.5 px-3 font-semibold w-24 text-center">
                      Jam/Minggu
                    </th>
                    <th className="py-2.5 px-3 font-semibold hidden md:table-cell">
                      Keterangan
                    </th>
                    <th className="py-2.5 px-3 font-semibold w-20 hidden sm:table-cell">
                      ID Guru
                    </th>
                    <th className="py-2.5 px-3 font-semibold w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-10 text-center text-gray-400">
                        {codes.length === 0
                          ? "Belum ada data. Import dulu dari Excel tabel kode guru WKS. Kurikulum."
                          : "Gak ada yang cocok dengan pencarian."}
                      </td>
                    </tr>
                  )}
                  {filtered.map((c) => (
                    <tr
                      key={c.id}
                      className="border-t border-gray-50 hover:bg-gray-50/60">
                      <td className="py-2 px-3 font-mono font-bold text-blue-700">
                        {c.code}
                      </td>
                      <td className="py-2 px-3">{c.teacher_name}</td>
                      <td className="py-2 px-3">{c.subject}</td>
                      <td className="py-2 px-3 text-center font-semibold text-theme-secondary">
                        {c.weekly_hours != null ? `${c.weekly_hours} JP` : "-"}
                      </td>
                      <td className="py-2 px-3 text-theme-secondary text-xs hidden md:table-cell">
                        {c.visibleNote || "-"}
                      </td>
                      <td className="py-2 px-3 text-xs hidden sm:table-cell">
                        {c.teacher_id ? (
                          <span className="font-mono text-theme-secondary">
                            {c.teacher_id}
                          </span>
                        ) : (
                          <span
                            className="text-amber-500"
                            title="Belum diisi, validasi silang ke data pengampu gak bisa jalan buat kode ini">
                            belum diisi
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => openEditModal(c)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(c)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-theme-bg rounded-2xl shadow-xl w-full max-w-md p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-theme">
                  {editingRow ? "Edit Kode Guru" : "Tambah Kode Guru"}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-theme-secondary">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-theme-secondary mb-1.5">
                    Kode
                  </label>
                  <input
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    placeholder="mis. 18 atau 8P"
                    className="w-full px-3 py-2 bg-theme-bg text-theme border border-theme rounded-xl text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-theme-secondary mb-1.5">
                    Nama Guru
                  </label>
                  <input
                    value={formData.teacher_name}
                    onChange={(e) =>
                      setFormData({ ...formData, teacher_name: e.target.value })
                    }
                    placeholder="mis. Jajang Hilman, S.Pd.I"
                    className="w-full px-3 py-2 bg-theme-bg text-theme border border-theme rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-theme-secondary mb-1.5">
                    Mapel
                  </label>
                  <input
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                    placeholder="mis. PJOK"
                    className="w-full px-3 py-2 bg-theme-bg text-theme border border-theme rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-theme-secondary mb-1.5">
                    Jumlah Jam Mengajar (JP/minggu, opsional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.weekly_hours}
                    onChange={(e) =>
                      setFormData({ ...formData, weekly_hours: e.target.value })
                    }
                    placeholder="mis. 24"
                    className="w-full px-3 py-2 bg-theme-bg text-theme border border-theme rounded-xl text-sm"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Sesuai kolom "JUMLAH JAM" di tabel kode guru WKS. Kurikulum.
                    Kosongkan buat kode yang jamnya gak dihitung per-JP (mis.
                    BP/BK).
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-theme-secondary mb-1.5">
                    Keterangan (opsional)
                  </label>
                  <input
                    value={formData.note}
                    onChange={(e) =>
                      setFormData({ ...formData, note: e.target.value })
                    }
                    placeholder="mis. Wali kelas 8A"
                    className="w-full px-3 py-2 bg-theme-bg text-theme border border-theme rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-theme-secondary mb-1.5">
                    ID Guru (opsional)
                  </label>
                  <input
                    value={formData.teacher_id}
                    onChange={(e) =>
                      setFormData({ ...formData, teacher_id: e.target.value })
                    }
                    placeholder="mis. G-08"
                    className="w-full px-3 py-2 bg-theme-bg text-theme border border-theme rounded-xl text-sm font-mono"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Isi ini kalau mau aktifin validasi silang ke data pengampu
                    mapel (teacher_assignments) di Import Jadwal Massal.
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-theme-secondary bg-theme-surface hover:bg-gray-200">
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300">
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
