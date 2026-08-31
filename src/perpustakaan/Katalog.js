//[file name]: Katalog.js
import React, { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Library,
  CheckCircle2,
  Clock3,
  ChevronLeft,
  ChevronRight,
  Upload,
  Download,
  FileCheck2,
} from "lucide-react";
import ExcelJS from "exceljs";
import { supabase } from "../supabaseClient";

const DAFTAR_KATEGORI = [
  "Fiksi",
  "Non-Fiksi",
  "Pelajaran",
  "Referensi",
  "Agama",
  "Sains",
  "Sejarah",
  "Biografi",
  "Komik",
  "Majalah",
];

const emptyForm = {
  judul: "",
  penulis: "",
  penerbit: "",
  tahun: "",
  isbn: "",
  kategori: DAFTAR_KATEGORI[0],
  rak: "",
  totalEksemplar: "",
};

const PAGE_SIZE = 20;

const EXCEL_HEADERS = [
  "Judul",
  "Penulis",
  "Penerbit",
  "Tahun",
  "ISBN",
  "Kategori",
  "Rak",
  "Jumlah Eksemplar",
];
const EXCEL_COL_WIDTHS = [32, 22, 20, 10, 20, 14, 10, 16];

const NAVY = "FF1E3A8A";
const BLUE = "FF2563EB";
const LIGHT_BORDER = "FFCBD5E1";

const downloadTemplateExcel = async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SMP Muslimin Cililin";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Buku", {
    views: [{ state: "frozen", ySplit: 4 }], // header nempel pas di-scroll
  });

  sheet.columns = EXCEL_COL_WIDTHS.map((w) => ({ width: w }));

  // ===== Baris 1: Nama Sekolah =====
  sheet.mergeCells(1, 1, 1, EXCEL_HEADERS.length);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = "SMP MUSLIMIN CILILIN";
  titleCell.font = { bold: true, size: 14, color: { argb: NAVY } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 26;

  // ===== Baris 2: Judul Dokumen =====
  sheet.mergeCells(2, 1, 2, EXCEL_HEADERS.length);
  const subtitleCell = sheet.getCell(2, 1);
  subtitleCell.value = "KATALOG BUKU PERPUSTAKAAN";
  subtitleCell.font = { bold: true, size: 12, color: { argb: BLUE } };
  subtitleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(2).height = 22;

  // ===== Baris 3: kosong (pemisah) =====
  sheet.addRow([]);

  // ===== Baris 4: Header tabel =====
  const headerRow = sheet.addRow(EXCEL_HEADERS);
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin", color: { argb: NAVY } },
      left: { style: "thin", color: { argb: NAVY } },
      bottom: { style: "thin", color: { argb: NAVY } },
      right: { style: "thin", color: { argb: NAVY } },
    };
  });

  // ===== Baris contoh data (biar keliatan format yang diharapkan) =====
  const contoh = [
    [
      "Laskar Pelangi",
      "Andrea Hirata",
      "Bentang Pustaka",
      2005,
      "978-979-1227-78-0",
      "Fiksi",
      "A1",
      5,
    ],
    [
      "Matematika untuk SMP Kelas VIII",
      "Tim Kemendikbud",
      "Kemendikbud",
      2021,
      "",
      "Pelajaran",
      "B2",
      20,
    ],
  ];

  contoh.forEach((rowValues, i) => {
    const row = sheet.addRow(rowValues);
    row.height = 18;
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: LIGHT_BORDER } },
        left: { style: "thin", color: { argb: LIGHT_BORDER } },
        bottom: { style: "thin", color: { argb: LIGHT_BORDER } },
        right: { style: "thin", color: { argb: LIGHT_BORDER } },
      };
      cell.alignment = { vertical: "middle" };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: i % 2 === 0 ? "FFFFFFFF" : "FFF1F5F9" },
      };
    });
  });

  // Siapin ~50 baris kosong ber-border juga, biar begitu dibuka user tinggal ngetik gak perlu narik border sendiri
  for (let i = 0; i < 50; i++) {
    const row = sheet.addRow(new Array(EXCEL_HEADERS.length).fill(""));
    row.height = 18;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: LIGHT_BORDER } },
        left: { style: "thin", color: { argb: LIGHT_BORDER } },
        bottom: { style: "thin", color: { argb: LIGHT_BORDER } },
        right: { style: "thin", color: { argb: LIGHT_BORDER } },
      };
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "template_katalog_buku.xlsx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const validateImportRow = (rowObj) => {
  const errors = [];
  if (!rowObj.judul) errors.push("Judul kosong");
  if (!rowObj.penulis) errors.push("Penulis kosong");
  const jumlah = Number(rowObj.jumlah_eksemplar);
  if (rowObj.jumlah_eksemplar === "" || Number.isNaN(jumlah) || jumlah < 0) {
    errors.push("Jumlah Eksemplar harus angka >= 0");
  }
  if (rowObj.tahun && Number.isNaN(Number(rowObj.tahun))) {
    errors.push("Tahun harus angka");
  }
  return errors;
};

const mapRow = (b) => ({
  id: b.id,
  judul: b.judul,
  penulis: b.penulis || "",
  penerbit: b.penerbit || "",
  tahun: b.tahun || "",
  isbn: b.isbn || "",
  kategori: b.kategori,
  rak: b.rak || "",
  totalEksemplar: b.total_eksemplar,
  dipinjam: b.dipinjam || 0,
});

const KatalogBuku = ({ darkMode = false }) => {
  const [daftarBuku, setDaftarBuku] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterKategori, setFilterKategori] = useState("Semua");

  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [stats, setStats] = useState({
    totalJudul: 0,
    totalEksemplar: 0,
    totalDipinjam: 0,
    totalTersedia: 0,
  });

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  // ---------- Import CSV ----------
  const [showImportModal, setShowImportModal] = useState(false);
  const [importRows, setImportRows] = useState([]); // hasil parse + validasi
  const [importFileName, setImportFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [importResult, setImportResult] = useState(null); // { berhasil, gagal }

  // ---------- Debounce pencarian, biar gak nembak query tiap ketikan ----------
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Reset ke halaman pertama tiap kali keyword/filter berubah
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, filterKategori]);

  // ---------- Fetch data (server-side search + filter + pagination) ----------
  const fetchBuku = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("buku_dengan_stok")
        .select("*", { count: "exact" })
        .order("judul", { ascending: true })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (debouncedSearch) {
        const kw = debouncedSearch.replace(/[%,]/g, "");
        query = query.or(`judul.ilike.%${kw}%,penulis.ilike.%${kw}%,isbn.ilike.%${kw}%`);
      }
      if (filterKategori !== "Semua") {
        query = query.eq("kategori", filterKategori);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      setDaftarBuku((data || []).map(mapRow));
      setTotalCount(count || 0);
    } catch (err) {
      console.error("Gagal memuat data buku:", err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filterKategori]);

  useEffect(() => {
    fetchBuku();
  }, [fetchBuku]);

  // ---------- Fetch statistik (agregat semua buku, bukan cuma halaman ini) ----------
  const fetchStats = useCallback(async () => {
    const { data, error } = await supabase.from("buku_stats").select("*").single();
    if (error) {
      console.error("Gagal memuat statistik buku:", error);
      return;
    }
    setStats({
      totalJudul: data.total_judul,
      totalEksemplar: data.total_eksemplar,
      totalDipinjam: data.total_dipinjam,
      totalTersedia: data.total_tersedia,
    });
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // ---------- Import CSV handlers ----------
  const openImportModal = () => {
    setImportRows([]);
    setImportFileName("");
    setImportResult(null);
    setShowImportModal(true);
  };

  const closeImportModal = () => {
    if (importing) return;
    setShowImportModal(false);
  };

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      setCheckingDuplicates(true);
      try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(evt.target.result);
        const sheet = workbook.worksheets[0];

        // Cari baris header tabel (baris yang salah satu selnya "Judul"), jadi gak
        // kaku soal ada berapa baris judul sekolah/dokumen di atasnya.
        let headerRowNumber = null;
        let headerMap = {};
        const maxScan = Math.min(15, sheet.rowCount);
        for (let i = 1; i <= maxScan; i++) {
          const values = sheet.getRow(i).values || [];
          const idx = values.findIndex(
            (v) => typeof v === "string" && v.trim().toLowerCase() === "judul"
          );
          if (idx > -1) {
            headerRowNumber = i;
            values.forEach((v, colIdx) => {
              if (typeof v === "string") headerMap[v.trim().toLowerCase()] = colIdx;
            });
            break;
          }
        }

        if (!headerRowNumber) {
          setImportRows([]);
          setImportResult({
            berhasil: 0,
            gagal: 0,
            fatalError:
              'Format file tidak dikenali — pastikan ada baris header dengan kolom "Judul".',
          });
          return;
        }

        const get = (values, key) => {
          const col = headerMap[key];
          if (!col) return "";
          const v = values[col];
          return v === null || v === undefined ? "" : v.toString().trim();
        };

        const rawRows = [];
        for (let i = headerRowNumber + 1; i <= sheet.rowCount; i++) {
          const values = sheet.getRow(i).values || [];
          const isEmpty = values.every(
            (v) => v === null || v === undefined || v.toString().trim() === ""
          );
          if (isEmpty) continue;

          rawRows.push({
            judul: get(values, "judul"),
            penulis: get(values, "penulis"),
            penerbit: get(values, "penerbit"),
            tahun: get(values, "tahun"),
            isbn: get(values, "isbn"),
            kategori: get(values, "kategori"),
            rak: get(values, "rak"),
            jumlah_eksemplar: get(values, "jumlah eksemplar"),
            _baris: i,
          });
        }

        // ---------- Cek duplikat: ke database + di dalam file yang sama ----------
        const { data: existingBooks, error: existingErr } = await supabase
          .from("buku")
          .select("judul, penulis, isbn");
        if (existingErr) throw existingErr;

        const normalize = (s) => (s || "").toString().trim().toLowerCase();
        const keyOf = (judul, penulis) => `${normalize(judul)}|${normalize(penulis)}`;

        const existingISBN = new Set(
          (existingBooks || []).filter((b) => normalize(b.isbn)).map((b) => normalize(b.isbn))
        );
        const existingJudulPenulis = new Set(
          (existingBooks || []).map((b) => keyOf(b.judul, b.penulis))
        );

        const seenISBNInFile = new Set();
        const seenJudulPenulisInFile = new Set();

        const parsed = rawRows.map((row) => {
          const errors = validateImportRow(row);

          const isbnNorm = normalize(row.isbn);
          const jpKey = keyOf(row.judul, row.penulis);

          if (isbnNorm) {
            if (existingISBN.has(isbnNorm)) {
              errors.push("ISBN sudah ada di katalog");
            } else if (seenISBNInFile.has(isbnNorm)) {
              errors.push("ISBN duplikat di file ini");
            } else {
              seenISBNInFile.add(isbnNorm);
            }
          } else if (row.judul && row.penulis) {
            if (existingJudulPenulis.has(jpKey)) {
              errors.push("Judul + Penulis sudah ada di katalog");
            } else if (seenJudulPenulisInFile.has(jpKey)) {
              errors.push("Duplikat di file ini");
            } else {
              seenJudulPenulisInFile.add(jpKey);
            }
          }

          return { ...row, _errors: errors };
        });

        setImportRows(parsed);
      } catch (err) {
        console.error("Gagal membaca file Excel:", err);
        setImportRows([]);
        setImportResult({
          berhasil: 0,
          gagal: 0,
          fatalError:
            "Gagal memproses file. Pastikan formatnya .xlsx, belum rusak, dan koneksi stabil.",
        });
      } finally {
        setCheckingDuplicates(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const importValidCount = importRows.filter((r) => r._errors.length === 0).length;
  const importInvalidCount = importRows.length - importValidCount;

  const handleImportSubmit = async () => {
    const validRows = importRows.filter((r) => r._errors.length === 0);
    if (validRows.length === 0) return;

    setImporting(true);
    try {
      const payloads = validRows.map((r) => ({
        judul: r.judul.trim(),
        penulis: r.penulis.trim(),
        penerbit: r.penerbit?.trim() || null,
        tahun: r.tahun ? Number(r.tahun) : null,
        isbn: r.isbn?.trim() || null,
        kategori: DAFTAR_KATEGORI.includes(r.kategori?.trim()) ? r.kategori.trim() : "Non-Fiksi",
        rak: r.rak?.trim() || null,
        total_eksemplar: Number(r.jumlah_eksemplar),
      }));

      // Insert per-batch 100 baris, biar gak kena limit payload kalau datanya ratusan
      const BATCH_SIZE = 100;
      let berhasil = 0;
      let gagal = 0;

      for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
        const batch = payloads.slice(i, i + BATCH_SIZE);
        const { error, data } = await supabase.from("buku").insert(batch).select("id");
        if (error) {
          console.error("Gagal insert batch:", error);
          gagal += batch.length;
        } else {
          berhasil += data?.length || batch.length;
        }
      }

      setImportResult({ berhasil, gagal });
      fetchBuku();
      fetchStats();
    } catch (err) {
      console.error(err);
      setImportResult({ berhasil: 0, gagal: importRows.length });
    } finally {
      setImporting(false);
    }
  };

  // ---------- Handlers ----------
  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setShowModal(true);
  };

  const openEditModal = (buku) => {
    setEditingId(buku.id);
    setForm({
      judul: buku.judul,
      penulis: buku.penulis,
      penerbit: buku.penerbit,
      tahun: String(buku.tahun || ""),
      isbn: buku.isbn || "",
      kategori: buku.kategori,
      rak: buku.rak || "",
      totalEksemplar: String(buku.totalEksemplar),
    });
    setFormError("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setFormError("");
  };

  const handleFormChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.judul.trim() || !form.penulis.trim() || !form.totalEksemplar) {
      setFormError("Judul, Penulis, dan Jumlah Eksemplar wajib diisi.");
      return;
    }
    const totalBaru = Number(form.totalEksemplar);
    if (Number.isNaN(totalBaru) || totalBaru < 0) {
      setFormError("Jumlah Eksemplar harus berupa angka yang valid.");
      return;
    }

    const payload = {
      judul: form.judul.trim(),
      penulis: form.penulis.trim(),
      penerbit: form.penerbit.trim() || null,
      tahun: form.tahun ? Number(form.tahun) : null,
      isbn: form.isbn.trim() || null,
      kategori: form.kategori,
      rak: form.rak.trim() || null,
      total_eksemplar: totalBaru,
    };

    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase.from("buku").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("buku").insert(payload);
        if (error) throw error;
      }
      setShowModal(false);
      setFormError("");
      fetchBuku();
      fetchStats();
    } catch (err) {
      console.error(err);
      setFormError(
        err.code === "23505"
          ? "ISBN sudah terdaftar untuk buku lain."
          : "Gagal menyimpan data. Coba lagi."
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (buku) => {
    setDeleteTarget(buku);
    setDeleteError("");
  };
  const cancelDelete = () => setDeleteTarget(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from("buku").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      setDeleteTarget(null);
      // Kalau halaman jadi kosong setelah hapus (misal hapus 1 satunya data di halaman terakhir), mundur 1 halaman
      if (daftarBuku.length === 1 && page > 0) {
        setPage((p) => p - 1);
      } else {
        fetchBuku();
      }
      fetchStats();
    } catch (err) {
      console.error(err);
      // FK "on delete restrict" -> gagal kalau buku masih punya riwayat peminjaman
      setDeleteError(
        "Buku ini tidak bisa dihapus karena masih punya riwayat peminjaman. Hapus/arsipkan riwayat peminjamannya dulu."
      );
    }
  };

  // ---------- Style helpers ----------
  const cardBg = darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200";
  const inputBase = `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
    darkMode
      ? "bg-gray-900 border-gray-700 text-gray-100 focus:ring-blue-500 placeholder-gray-500"
      : "bg-white border-gray-300 text-gray-800 focus:ring-blue-400 placeholder-gray-400"
  }`;
  const labelBase = `block text-xs font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-600"}`;

  return (
    <div
      className={`min-h-full w-full p-4 sm:p-6 lg:p-8 ${
        darkMode ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-800"
      }`}
    >
      <div className="w-full max-w-[1600px] mx-auto">
        {/* ===== Header ===== */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              darkMode ? "bg-blue-900" : "bg-blue-100"
            }`}
          >
            <BookOpen
              className={`w-5 h-5 sm:w-6 sm:h-6 ${darkMode ? "text-blue-300" : "text-blue-700"}`}
            />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold leading-tight">Katalog Buku</h1>
            <p className={`text-xs sm:text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Kelola koleksi buku perpustakaan
            </p>
          </div>
        </div>

        {/* ===== Stats ===== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className={`rounded-xl border p-4 ${cardBg}`}>
            <div className="flex items-center gap-2 mb-1">
              <Library size={16} className={darkMode ? "text-blue-300" : "text-blue-600"} />
              <span
                className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                Judul Buku
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-bold">{stats.totalJudul}</p>
          </div>

          <div className={`rounded-xl border p-4 ${cardBg}`}>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={16} className={darkMode ? "text-purple-300" : "text-purple-600"} />
              <span
                className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                Total Eksemplar
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-bold">{stats.totalEksemplar}</p>
          </div>

          <div className={`rounded-xl border p-4 ${cardBg}`}>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2
                size={16}
                className={darkMode ? "text-emerald-300" : "text-emerald-600"}
              />
              <span
                className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                Tersedia
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-bold">{stats.totalTersedia}</p>
          </div>

          <div className={`rounded-xl border p-4 ${cardBg}`}>
            <div className="flex items-center gap-2 mb-1">
              <Clock3 size={16} className={darkMode ? "text-orange-300" : "text-orange-600"} />
              <span
                className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                Sedang Dipinjam
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-bold">{stats.totalDipinjam}</p>
          </div>
        </div>

        {/* ===== Search & Filter ===== */}
        <div className={`rounded-xl border p-3 sm:p-4 mb-6 ${cardBg}`}>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                size={16}
                className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                  darkMode ? "text-gray-500" : "text-gray-400"
                }`}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari judul, penulis, atau ISBN..."
                className={`${inputBase} pl-9`}
              />
            </div>

            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              className={`${inputBase} sm:w-56`}
            >
              <option value="Semua">Semua Kategori</option>
              {DAFTAR_KATEGORI.map((kat) => (
                <option key={kat} value={kat}>
                  {kat}
                </option>
              ))}
            </select>

            <button
              onClick={openImportModal}
              className={`inline-flex items-center justify-center gap-2 font-medium px-4 py-2.5 rounded-lg transition-colors text-sm sm:text-base touch-manipulation active:scale-95 w-full sm:w-auto sm:flex-shrink-0 border ${
                darkMode
                  ? "border-gray-700 text-gray-200 hover:bg-gray-700"
                  : "border-gray-300 text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Upload size={18} />
              Import Excel
            </button>

            <button
              onClick={openAddModal}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-lg transition-colors text-sm sm:text-base touch-manipulation active:scale-95 w-full sm:w-auto sm:flex-shrink-0"
            >
              <Plus size={18} />
              Tambah Buku
            </button>
          </div>
        </div>

        {/* ===== Loading state ===== */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* ===== Empty state ===== */}
        {!loading && daftarBuku.length === 0 && (
          <div
            className={`rounded-xl border-2 border-dashed p-10 text-center ${
              darkMode ? "border-gray-700 bg-gray-800/50" : "border-gray-300 bg-white"
            }`}
          >
            <BookOpen
              size={32}
              className={`mx-auto mb-2 ${darkMode ? "text-gray-600" : "text-gray-300"}`}
            />
            <p className="font-semibold mb-1">Tidak ada buku ditemukan</p>
            <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Coba ubah kata kunci pencarian atau filter kategori.
            </p>
          </div>
        )}

        {/* ===== Desktop / tablet-lebar: table ===== */}
        {!loading && daftarBuku.length > 0 && (
          <div className={`hidden md:block rounded-xl border overflow-hidden ${cardBg}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={darkMode ? "bg-gray-900/60" : "bg-gray-50"}>
                    <th className="text-left font-semibold px-4 py-3 whitespace-nowrap">Judul</th>
                    <th className="text-left font-semibold px-4 py-3 whitespace-nowrap">Penulis</th>
                    <th className="text-left font-semibold px-4 py-3 whitespace-nowrap hidden lg:table-cell">
                      Kategori
                    </th>
                    <th className="text-left font-semibold px-4 py-3 whitespace-nowrap hidden xl:table-cell">
                      Rak
                    </th>
                    <th className="text-center font-semibold px-4 py-3 whitespace-nowrap">Stok</th>
                    <th className="text-center font-semibold px-4 py-3 whitespace-nowrap">
                      Status
                    </th>
                    <th className="text-right font-semibold px-4 py-3 whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? "divide-gray-700" : "divide-gray-100"}`}>
                  {daftarBuku.map((buku) => {
                    const tersedia = buku.totalEksemplar - buku.dipinjam;
                    return (
                      <tr
                        key={buku.id}
                        className={darkMode ? "hover:bg-gray-700/40" : "hover:bg-gray-50"}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium">{buku.judul}</p>
                          <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                            {buku.penerbit || "-"}
                            {buku.tahun ? ` · ${buku.tahun}` : ""}
                          </p>
                        </td>
                        <td className="px-4 py-3">{buku.penulis}</td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                              darkMode ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {buku.kategori}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell">{buku.rak || "-"}</td>
                        <td className="px-4 py-3 text-center">
                          {tersedia}/{buku.totalEksemplar}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {tersedia > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                              Tersedia
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                              Habis
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(buku)}
                              className={`p-2 rounded-lg transition-colors ${
                                darkMode
                                  ? "hover:bg-gray-700 text-blue-300"
                                  : "hover:bg-blue-50 text-blue-600"
                              }`}
                              title="Edit"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => confirmDelete(buku)}
                              className={`p-2 rounded-lg transition-colors ${
                                darkMode
                                  ? "hover:bg-gray-700 text-red-300"
                                  : "hover:bg-red-50 text-red-600"
                              }`}
                              title="Hapus"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== Mobile: card list ===== */}
        {!loading && daftarBuku.length > 0 && (
          <div className="md:hidden space-y-3">
            {daftarBuku.map((buku) => {
              const tersedia = buku.totalEksemplar - buku.dipinjam;
              return (
                <div key={buku.id} className={`rounded-xl border p-4 ${cardBg}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{buku.judul}</p>
                      <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                        {buku.penulis}
                      </p>
                    </div>
                    {tersedia > 0 ? (
                      <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        Tersedia
                      </span>
                    ) : (
                      <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                        Habis
                      </span>
                    )}
                  </div>

                  <div
                    className={`grid grid-cols-2 gap-x-3 gap-y-1 text-xs mb-3 ${
                      darkMode ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    <p>
                      <span className="font-medium">Kategori:</span> {buku.kategori}
                    </p>
                    <p>
                      <span className="font-medium">Rak:</span> {buku.rak || "-"}
                    </p>
                    <p>
                      <span className="font-medium">Stok:</span> {tersedia}/{buku.totalEksemplar}
                    </p>
                    <p>
                      <span className="font-medium">Tahun:</span> {buku.tahun || "-"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(buku)}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors touch-manipulation active:scale-95 ${
                        darkMode
                          ? "bg-gray-700 text-blue-300 hover:bg-gray-600"
                          : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                      }`}
                    >
                      <Pencil size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => confirmDelete(buku)}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors touch-manipulation active:scale-95 ${
                        darkMode
                          ? "bg-gray-700 text-red-300 hover:bg-gray-600"
                          : "bg-red-50 text-red-600 hover:bg-red-100"
                      }`}
                    >
                      <Trash2 size={14} />
                      Hapus
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ===== Pagination ===== */}
        {!loading && totalCount > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-4">
            <p className={`text-xs sm:text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Halaman {page + 1} dari {totalPages} · {totalCount} buku
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className={`p-2 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  darkMode
                    ? "border-gray-700 hover:bg-gray-800"
                    : "border-gray-300 hover:bg-gray-100"
                }`}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className={`p-2 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  darkMode
                    ? "border-gray-700 hover:bg-gray-800"
                    : "border-gray-300 hover:bg-gray-100"
                }`}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===== Modal Tambah/Edit ===== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div
            className={`w-full max-w-lg rounded-xl shadow-xl max-h-[90vh] overflow-y-auto ${
              darkMode ? "bg-gray-800" : "bg-white"
            }`}
          >
            <div
              className={`flex items-center justify-between px-5 py-4 border-b ${
                darkMode ? "border-gray-700" : "border-gray-200"
              }`}
            >
              <h2 className="text-base sm:text-lg font-bold">
                {editingId ? "Edit Buku" : "Tambah Buku"}
              </h2>
              <button
                onClick={closeModal}
                className={`p-1.5 rounded-lg ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                    darkMode ? "bg-red-900/20 text-red-300" : "bg-red-50 text-red-600"
                  }`}
                >
                  <AlertTriangle size={16} className="flex-shrink-0" />
                  {formError}
                </div>
              )}

              <div>
                <label className={labelBase}>Judul Buku *</label>
                <input
                  type="text"
                  value={form.judul}
                  onChange={handleFormChange("judul")}
                  className={inputBase}
                  placeholder="Contoh: Laskar Pelangi"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelBase}>Penulis *</label>
                  <input
                    type="text"
                    value={form.penulis}
                    onChange={handleFormChange("penulis")}
                    className={inputBase}
                  />
                </div>
                <div>
                  <label className={labelBase}>Penerbit</label>
                  <input
                    type="text"
                    value={form.penerbit}
                    onChange={handleFormChange("penerbit")}
                    className={inputBase}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelBase}>Tahun Terbit</label>
                  <input
                    type="number"
                    value={form.tahun}
                    onChange={handleFormChange("tahun")}
                    className={inputBase}
                    placeholder="2024"
                  />
                </div>
                <div>
                  <label className={labelBase}>ISBN</label>
                  <input
                    type="text"
                    value={form.isbn}
                    onChange={handleFormChange("isbn")}
                    className={inputBase}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelBase}>Kategori</label>
                  <select
                    value={form.kategori}
                    onChange={handleFormChange("kategori")}
                    className={inputBase}
                  >
                    {DAFTAR_KATEGORI.map((kat) => (
                      <option key={kat} value={kat}>
                        {kat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelBase}>Lokasi Rak</label>
                  <input
                    type="text"
                    value={form.rak}
                    onChange={handleFormChange("rak")}
                    className={inputBase}
                    placeholder="Contoh: A1"
                  />
                </div>
              </div>

              <div>
                <label className={labelBase}>Jumlah Eksemplar *</label>
                <input
                  type="number"
                  min="0"
                  value={form.totalEksemplar}
                  onChange={handleFormChange("totalEksemplar")}
                  className={inputBase}
                  placeholder="0"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 ${
                    darkMode
                      ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-lg font-medium text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Tambah Buku"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== Modal Import CSV ===== */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div
            className={`w-full max-w-2xl rounded-xl shadow-xl max-h-[90vh] overflow-y-auto ${
              darkMode ? "bg-gray-800" : "bg-white"
            }`}
          >
            <div
              className={`flex items-center justify-between px-5 py-4 border-b ${
                darkMode ? "border-gray-700" : "border-gray-200"
              }`}
            >
              <h2 className="text-base sm:text-lg font-bold">Import Buku dari Excel</h2>
              <button
                onClick={closeImportModal}
                className={`p-1.5 rounded-lg ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {!importResult && (
                <>
                  {/* Step 1: Download template */}
                  <div
                    className={`rounded-lg border p-3 flex items-center justify-between gap-3 ${
                      darkMode ? "border-gray-700 bg-gray-900/40" : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className="text-sm">
                      <p className="font-medium">1. Belum punya file Excel-nya?</p>
                      <p className={darkMode ? "text-gray-400" : "text-gray-500"}>
                        Download template, isi langsung di Excel, simpan, lalu upload lagi filenya.
                      </p>
                    </div>
                    <button
                      onClick={downloadTemplateExcel}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium flex-shrink-0 transition-colors ${
                        darkMode
                          ? "bg-gray-700 hover:bg-gray-600 text-gray-100"
                          : "bg-white border border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      <Download size={14} />
                      Template
                    </button>
                  </div>

                  {/* Step 2: Upload */}
                  <div>
                    <p
                      className={`text-sm font-medium mb-2 ${darkMode ? "text-gray-200" : "text-gray-700"}`}
                    >
                      2. Upload file Excel yang sudah diisi
                    </p>
                    <label
                      className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors ${
                        darkMode
                          ? "border-gray-700 hover:border-blue-600 hover:bg-gray-900/40"
                          : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                      }`}
                    >
                      <Upload size={24} className={darkMode ? "text-gray-500" : "text-gray-400"} />
                      <span className="text-sm font-medium">
                        {importFileName || "Klik untuk pilih file .xlsx"}
                      </span>
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={handleFileSelected}
                      />
                    </label>
                  </div>

                  {/* Step 3: Preview & validasi */}
                  {checkingDuplicates && (
                    <div className="flex items-center gap-2 text-sm py-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span className={darkMode ? "text-gray-400" : "text-gray-500"}>
                        Membaca file & mengecek duplikat ke katalog...
                      </span>
                    </div>
                  )}

                  {!checkingDuplicates && importRows.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-2 text-sm">
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <FileCheck2 size={14} />
                          {importValidCount} baris valid
                        </span>
                        {importInvalidCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                            <AlertTriangle size={14} />
                            {importInvalidCount} baris bermasalah
                          </span>
                        )}
                      </div>

                      <div
                        className={`max-h-56 overflow-y-auto rounded-lg border text-xs ${
                          darkMode ? "border-gray-700" : "border-gray-200"
                        }`}
                      >
                        <table className="w-full">
                          <thead
                            className={`sticky top-0 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}
                          >
                            <tr>
                              <th className="text-left font-semibold px-3 py-2">Baris</th>
                              <th className="text-left font-semibold px-3 py-2">Judul</th>
                              <th className="text-left font-semibold px-3 py-2">Penulis</th>
                              <th className="text-left font-semibold px-3 py-2">Status</th>
                            </tr>
                          </thead>
                          <tbody
                            className={`divide-y ${darkMode ? "divide-gray-700" : "divide-gray-100"}`}
                          >
                            {importRows.map((r) => (
                              <tr key={r._baris}>
                                <td className="px-3 py-2">{r._baris}</td>
                                <td className="px-3 py-2 truncate max-w-[140px]">
                                  {r.judul || "-"}
                                </td>
                                <td className="px-3 py-2 truncate max-w-[120px]">
                                  {r.penulis || "-"}
                                </td>
                                <td className="px-3 py-2">
                                  {r._errors.length === 0 ? (
                                    <span className="text-emerald-600 dark:text-emerald-400">
                                      OK
                                    </span>
                                  ) : (
                                    <span className="text-red-600 dark:text-red-400">
                                      {r._errors.join(", ")}
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
                </>
              )}

              {/* Hasil import */}
              {importResult && (
                <div
                  className={`rounded-lg border p-4 text-sm ${
                    darkMode ? "border-gray-700 bg-gray-900/40" : "border-gray-200 bg-gray-50"
                  }`}
                >
                  {importResult.fatalError ? (
                    <p className="text-red-600 dark:text-red-400 flex items-start gap-2">
                      <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                      {importResult.fatalError}
                    </p>
                  ) : (
                    <>
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                        {importResult.berhasil} buku berhasil diimpor
                      </p>
                      {importResult.gagal > 0 && (
                        <p className="text-red-600 dark:text-red-400">
                          {importResult.gagal} buku gagal diimpor, coba cek koneksi lalu ulangi
                          baris yang gagal.
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeImportModal}
                  disabled={importing}
                  className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 ${
                    darkMode
                      ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  {importResult ? "Tutup" : "Batal"}
                </button>
                {!importResult && (
                  <button
                    type="button"
                    onClick={handleImportSubmit}
                    disabled={importing || checkingDuplicates || importValidCount === 0}
                    className="flex-1 py-2.5 rounded-lg font-medium text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
                  >
                    {importing ? "Mengimpor..." : `Import ${importValidCount} Buku`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal Konfirmasi Hapus ===== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div
            className={`w-full max-w-sm rounded-xl shadow-xl p-5 ${darkMode ? "bg-gray-800" : "bg-white"}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  darkMode ? "bg-red-900/30" : "bg-red-100"
                }`}
              >
                <AlertTriangle size={20} className={darkMode ? "text-red-300" : "text-red-600"} />
              </div>
              <h3 className="font-bold text-base sm:text-lg">Hapus Buku?</h3>
            </div>
            <p className={`text-sm mb-3 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
              Buku <span className="font-semibold">"{deleteTarget.judul}"</span> akan dihapus dari
              katalog. Tindakan ini tidak dapat dibatalkan.
            </p>
            {deleteError && (
              <div
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm mb-3 ${
                  darkMode ? "bg-red-900/20 text-red-300" : "bg-red-50 text-red-600"
                }`}
              >
                <AlertTriangle size={16} className="flex-shrink-0" />
                {deleteError}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={cancelDelete}
                className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  darkMode
                    ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-lg font-medium text-sm bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KatalogBuku;
