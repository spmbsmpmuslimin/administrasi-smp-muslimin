//[file name]: Peminjaman.js
import React, { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Clock3,
  CheckCircle2,
  RotateCcw,
  Users,
} from "lucide-react";
import { supabase } from "../supabaseClient";

const toISODate = (date) => date.toISOString().slice(0, 10);
const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

const today = new Date();

const emptyForm = {
  bukuId: "",
  studentId: "",
  tanggalPinjam: toISODate(today),
  tanggalJatuhTempo: toISODate(addDays(today, 7)),
};

const getStatus = (item) => {
  if (item.status === "dikembalikan") return "Dikembalikan";
  if (item.tanggalJatuhTempo < toISODate(today)) return "Terlambat";
  return "Dipinjam";
};

const formatTanggal = (isoStr) => {
  if (!isoStr) return "-";
  return new Date(isoStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const statusBadgeClass = (status) => {
  switch (status) {
    case "Dipinjam":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    case "Terlambat":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
    case "Dikembalikan":
    default:
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  }
};

const mapRow = (r) => ({
  id: r.id,
  bukuId: r.buku_id,
  judulBuku: r.judul_buku_snapshot,
  peminjamStudentId: r.peminjam_student_id,
  namaPeminjam: r.nama_peminjam,
  noAnggota: r.no_anggota,
  tanggalPinjam: r.tanggal_pinjam,
  tanggalJatuhTempo: r.tanggal_jatuh_tempo,
  status: r.status,
});

const Peminjaman = ({ darkMode = false }) => {
  const [daftarPeminjaman, setDaftarPeminjaman] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [daftarBuku, setDaftarBuku] = useState([]); // { id, judul } buat dropdown

  // ---------- Dropdown berjenjang: Jenjang -> Kelas -> Nama Peminjam ----------
  const [classesData, setClassesData] = useState([]); // [{ id, grade }]
  const [selectedJenjang, setSelectedJenjang] = useState("");
  const [selectedKelas, setSelectedKelas] = useState("");
  const [studentsInKelas, setStudentsInKelas] = useState([]); // [{ id, full_name, nis }]
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua");

  const [stats, setStats] = useState({ total: 0, dipinjam: 0, terlambat: 0, dikembalikan: 0 });

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);

  // ---------- Debounce search ----------
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // ---------- Fetch daftar buku buat dropdown pilih buku ----------
  const fetchDaftarBuku = useCallback(async () => {
    const { data, error } = await supabase.from("buku").select("id, judul").order("judul");
    if (error) {
      console.error("Gagal memuat daftar buku:", error);
      return;
    }
    setDaftarBuku(data || []);
  }, []);

  useEffect(() => {
    fetchDaftarBuku();
  }, [fetchDaftarBuku]);

  // ---------- Fetch daftar kelas (buat dropdown Jenjang & Kelas) ----------
  const fetchClasses = useCallback(async () => {
    const { data, error } = await supabase
      .from("classes")
      .select("id, grade")
      .order("grade", { ascending: true })
      .order("id", { ascending: true });
    if (error) {
      console.error("Gagal memuat daftar kelas:", error);
      return;
    }
    setClassesData(data || []);
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const jenjangList = [...new Set(classesData.map((c) => c.grade))].sort((a, b) => a - b);
  const kelasList = classesData
    .filter((c) => String(c.grade) === String(selectedJenjang))
    .map((c) => c.id);

  // ---------- Fetch siswa aktif di kelas terpilih ----------
  useEffect(() => {
    if (!selectedKelas) {
      setStudentsInKelas([]);
      return;
    }
    const fetchStudentsInKelas = async () => {
      setLoadingStudents(true);
      try {
        const { data, error } = await supabase
          .from("students")
          .select("id, full_name, nis")
          .eq("class_id", selectedKelas)
          .eq("is_active", true)
          .order("full_name", { ascending: true });
        if (error) throw error;
        setStudentsInKelas(data || []);
      } catch (err) {
        console.error("Gagal memuat siswa:", err);
        setStudentsInKelas([]);
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchStudentsInKelas();
  }, [selectedKelas]);

  const handleJenjangChange = (e) => {
    setSelectedJenjang(e.target.value);
    setSelectedKelas("");
    setForm((prev) => ({ ...prev, studentId: "" }));
  };

  const handleKelasChange = (e) => {
    setSelectedKelas(e.target.value);
    setForm((prev) => ({ ...prev, studentId: "" }));
  };

  // ---------- Fetch data peminjaman ----------
  const fetchPeminjaman = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("peminjaman")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);

      if (debouncedSearch) {
        const kw = debouncedSearch.replace(/[%,]/g, "");
        query = query.or(
          `judul_buku_snapshot.ilike.%${kw}%,nama_peminjam.ilike.%${kw}%,no_anggota.ilike.%${kw}%`
        );
      }
      if (filterStatus === "Dikembalikan") {
        query = query.eq("status", "dikembalikan");
      } else if (filterStatus === "Dipinjam" || filterStatus === "Terlambat") {
        query = query.eq("status", "dipinjam");
      }

      const { data, error } = await query;
      if (error) throw error;

      let mapped = (data || []).map(mapRow);
      // "Terlambat" itu turunan (dipinjam + lewat jatuh tempo), bukan status asli di DB,
      // jadi butuh 1 filter tambahan di sisi klien buat mempersempit dari "Dipinjam".
      if (filterStatus === "Terlambat") {
        mapped = mapped.filter((item) => item.tanggalJatuhTempo < toISODate(today));
      }

      setDaftarPeminjaman(mapped);
    } catch (err) {
      console.error("Gagal memuat data peminjaman:", err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterStatus]);

  useEffect(() => {
    fetchPeminjaman();
  }, [fetchPeminjaman]);

  // ---------- Fetch statistik (agregat semua data, gak kena filter search/status) ----------
  const fetchStats = useCallback(async () => {
    try {
      const todayStr = toISODate(today);
      const [totalRes, dipinjamRes, terlambatRes, dikembalikanRes] = await Promise.all([
        supabase.from("peminjaman").select("*", { count: "exact", head: true }),
        supabase
          .from("peminjaman")
          .select("*", { count: "exact", head: true })
          .eq("status", "dipinjam")
          .gte("tanggal_jatuh_tempo", todayStr),
        supabase
          .from("peminjaman")
          .select("*", { count: "exact", head: true })
          .eq("status", "dipinjam")
          .lt("tanggal_jatuh_tempo", todayStr),
        supabase
          .from("peminjaman")
          .select("*", { count: "exact", head: true })
          .eq("status", "dikembalikan"),
      ]);

      setStats({
        total: totalRes.count || 0,
        dipinjam: dipinjamRes.count || 0,
        terlambat: terlambatRes.count || 0,
        dikembalikan: dikembalikanRes.count || 0,
      });
    } catch (err) {
      console.error("Gagal memuat statistik peminjaman:", err);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const refreshAll = () => {
    fetchPeminjaman();
    fetchStats();
  };

  // ---------- Derived: tampilan status per baris ----------
  const dataDenganStatus = daftarPeminjaman.map((item) => ({
    ...item,
    statusText: getStatus(item),
  }));

  // ---------- Handlers ----------
  const openAddModal = () => {
    setEditingId(null);
    setForm({ ...emptyForm, bukuId: daftarBuku[0]?.id || "" });
    setSelectedJenjang("");
    setSelectedKelas("");
    setStudentsInKelas([]);
    setFormError("");
    setShowModal(true);
  };

  const openEditModal = async (item) => {
    setEditingId(item.id);
    setForm({
      bukuId: item.bukuId,
      studentId: item.peminjamStudentId || "",
      tanggalPinjam: item.tanggalPinjam,
      tanggalJatuhTempo: item.tanggalJatuhTempo,
    });
    setFormError("");
    setShowModal(true);

    if (item.peminjamStudentId) {
      // Cari kelas & jenjang siswa ini biar dropdown ke-preselect otomatis
      const { data: studentRow, error } = await supabase
        .from("students")
        .select("id, full_name, nis, class_id")
        .eq("id", item.peminjamStudentId)
        .maybeSingle();

      if (!error && studentRow) {
        const kelasRow = classesData.find((c) => c.id === studentRow.class_id);
        setSelectedJenjang(kelasRow ? String(kelasRow.grade) : "");
        setSelectedKelas(studentRow.class_id || "");
        // Pre-seed langsung biar dropdown "Nama Peminjam" gak kosong sambil nunggu fetch selesai
        setStudentsInKelas([
          { id: studentRow.id, full_name: studentRow.full_name, nis: studentRow.nis },
        ]);
      } else {
        setSelectedJenjang("");
        setSelectedKelas("");
        setStudentsInKelas([]);
      }
    } else {
      // Data lama yang belum ada link ke siswa (dicatat manual sebelum fitur ini ada)
      setSelectedJenjang("");
      setSelectedKelas("");
      setStudentsInKelas([]);
    }
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

    if (!form.bukuId) {
      setFormError("Pilih buku yang akan dipinjam.");
      return;
    }
    if (!form.studentId) {
      setFormError("Pilih siswa peminjam (Jenjang → Kelas → Nama).");
      return;
    }
    if (!form.tanggalPinjam || !form.tanggalJatuhTempo) {
      setFormError("Tanggal Pinjam dan Tanggal Jatuh Tempo wajib diisi.");
      return;
    }
    if (form.tanggalJatuhTempo < form.tanggalPinjam) {
      setFormError("Tanggal Jatuh Tempo tidak boleh lebih awal dari Tanggal Pinjam.");
      return;
    }

    const bukuTerpilih = daftarBuku.find((b) => b.id === form.bukuId);
    const siswaTerpilih = studentsInKelas.find((s) => s.id === form.studentId);

    if (!siswaTerpilih) {
      setFormError("Data siswa tidak ditemukan, coba pilih ulang kelas & namanya.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        buku_id: form.bukuId,
        judul_buku_snapshot: bukuTerpilih?.judul || "",
        peminjam_student_id: siswaTerpilih.id,
        nama_peminjam: siswaTerpilih.full_name,
        no_anggota: siswaTerpilih.nis || siswaTerpilih.id,
        tanggal_pinjam: form.tanggalPinjam,
        tanggal_jatuh_tempo: form.tanggalJatuhTempo,
      };

      if (editingId) {
        const { error } = await supabase.from("peminjaman").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("peminjaman")
          .insert({ ...payload, status: "dipinjam" });
        if (error) throw error;
      }

      setShowModal(false);
      setFormError("");
      refreshAll();
    } catch (err) {
      console.error(err);
      setFormError("Gagal menyimpan data. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (item) => setDeleteTarget(item);
  const cancelDelete = () => setDeleteTarget(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from("peminjaman").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      setDeleteTarget(null);
      refreshAll();
    } catch (err) {
      console.error(err);
      setDeleteTarget(null);
    }
  };

  const handleTandaiKembali = async (item) => {
    try {
      const { error } = await supabase
        .from("peminjaman")
        .update({ status: "dikembalikan", tanggal_kembali: toISODate(today) })
        .eq("id", item.id);
      if (error) throw error;
      refreshAll();
    } catch (err) {
      console.error("Gagal menandai pengembalian:", err);
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
            <h1 className="text-xl sm:text-2xl font-bold leading-tight">Peminjaman</h1>
            <p className={`text-xs sm:text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Catat dan kelola peminjaman buku
            </p>
          </div>
        </div>

        {/* ===== Stats ===== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className={`rounded-xl border p-4 ${cardBg}`}>
            <div className="flex items-center gap-2 mb-1">
              <Users size={16} className={darkMode ? "text-blue-300" : "text-blue-600"} />
              <span
                className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                Total Peminjaman
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-bold">{stats.total}</p>
          </div>

          <div className={`rounded-xl border p-4 ${cardBg}`}>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={16} className={darkMode ? "text-blue-300" : "text-blue-600"} />
              <span
                className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                Sedang Dipinjam
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-bold">{stats.dipinjam}</p>
          </div>

          <div className={`rounded-xl border p-4 ${cardBg}`}>
            <div className="flex items-center gap-2 mb-1">
              <Clock3 size={16} className={darkMode ? "text-red-300" : "text-red-600"} />
              <span
                className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                Terlambat
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-bold">{stats.terlambat}</p>
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
                Sudah Dikembalikan
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-bold">{stats.dikembalikan}</p>
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
                placeholder="Cari judul buku, nama peminjam, atau no. anggota..."
                className={`${inputBase} pl-9`}
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`${inputBase} sm:w-56`}
            >
              <option value="Semua">Semua Status</option>
              <option value="Dipinjam">Dipinjam</option>
              <option value="Terlambat">Terlambat</option>
              <option value="Dikembalikan">Dikembalikan</option>
            </select>

            <button
              onClick={openAddModal}
              disabled={daftarBuku.length === 0}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-lg transition-colors text-sm sm:text-base touch-manipulation active:scale-95 w-full sm:w-auto sm:flex-shrink-0 disabled:opacity-50"
              title={daftarBuku.length === 0 ? "Tambahkan buku ke katalog dulu" : ""}
            >
              <Plus size={18} />
              Catat Peminjaman
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
        {!loading && dataDenganStatus.length === 0 && (
          <div
            className={`rounded-xl border-2 border-dashed p-10 text-center ${
              darkMode ? "border-gray-700 bg-gray-800/50" : "border-gray-300 bg-white"
            }`}
          >
            <BookOpen
              size={32}
              className={`mx-auto mb-2 ${darkMode ? "text-gray-600" : "text-gray-300"}`}
            />
            <p className="font-semibold mb-1">Tidak ada data peminjaman</p>
            <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Coba ubah kata kunci pencarian atau filter status.
            </p>
          </div>
        )}

        {/* ===== Desktop / tablet-lebar: table ===== */}
        {!loading && dataDenganStatus.length > 0 && (
          <div className={`hidden md:block rounded-xl border overflow-hidden ${cardBg}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={darkMode ? "bg-gray-900/60" : "bg-gray-50"}>
                    <th className="text-left font-semibold px-4 py-3 whitespace-nowrap">Buku</th>
                    <th className="text-left font-semibold px-4 py-3 whitespace-nowrap">
                      Peminjam
                    </th>
                    <th className="text-left font-semibold px-4 py-3 whitespace-nowrap hidden lg:table-cell">
                      Tgl Pinjam
                    </th>
                    <th className="text-left font-semibold px-4 py-3 whitespace-nowrap hidden lg:table-cell">
                      Jatuh Tempo
                    </th>
                    <th className="text-center font-semibold px-4 py-3 whitespace-nowrap">
                      Status
                    </th>
                    <th className="text-right font-semibold px-4 py-3 whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? "divide-gray-700" : "divide-gray-100"}`}>
                  {dataDenganStatus.map((item) => (
                    <tr
                      key={item.id}
                      className={darkMode ? "hover:bg-gray-700/40" : "hover:bg-gray-50"}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{item.judulBuku}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{item.namaPeminjam}</p>
                        <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                          {item.noAnggota}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {formatTanggal(item.tanggalPinjam)}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {formatTanggal(item.tanggalJatuhTempo)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(
                            item.statusText
                          )}`}
                        >
                          {item.statusText}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.statusText !== "Dikembalikan" && (
                            <button
                              onClick={() => handleTandaiKembali(item)}
                              className={`p-2 rounded-lg transition-colors ${
                                darkMode
                                  ? "hover:bg-gray-700 text-emerald-300"
                                  : "hover:bg-emerald-50 text-emerald-600"
                              }`}
                              title="Tandai Dikembalikan"
                            >
                              <RotateCcw size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(item)}
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
                            onClick={() => confirmDelete(item)}
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== Mobile: card list ===== */}
        {!loading && dataDenganStatus.length > 0 && (
          <div className="md:hidden space-y-3">
            {dataDenganStatus.map((item) => (
              <div key={item.id} className={`rounded-xl border p-4 ${cardBg}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{item.judulBuku}</p>
                    <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {item.namaPeminjam} · {item.noAnggota}
                    </p>
                  </div>
                  <span
                    className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(
                      item.statusText
                    )}`}
                  >
                    {item.statusText}
                  </span>
                </div>

                <div
                  className={`grid grid-cols-2 gap-x-3 gap-y-1 text-xs mb-3 ${
                    darkMode ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  <p>
                    <span className="font-medium">Pinjam:</span> {formatTanggal(item.tanggalPinjam)}
                  </p>
                  <p>
                    <span className="font-medium">Jatuh Tempo:</span>{" "}
                    {formatTanggal(item.tanggalJatuhTempo)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {item.statusText !== "Dikembalikan" && (
                    <button
                      onClick={() => handleTandaiKembali(item)}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors touch-manipulation active:scale-95 ${
                        darkMode
                          ? "bg-gray-700 text-emerald-300 hover:bg-gray-600"
                          : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                      }`}
                    >
                      <RotateCcw size={14} />
                      Kembali
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(item)}
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
                    onClick={() => confirmDelete(item)}
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
            ))}
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
                {editingId ? "Edit Peminjaman" : "Catat Peminjaman"}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelBase}>Pilih Jenjang *</label>
                  <select
                    value={selectedJenjang}
                    onChange={handleJenjangChange}
                    className={inputBase}
                  >
                    <option value="">-- Pilih Jenjang --</option>
                    {jenjangList.map((g) => (
                      <option key={g} value={g}>
                        Kelas {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelBase}>Pilih Kelas *</label>
                  <select
                    value={selectedKelas}
                    onChange={handleKelasChange}
                    className={inputBase}
                    disabled={!selectedJenjang}
                  >
                    <option value="">-- Pilih Kelas --</option>
                    {kelasList.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelBase}>Nama Peminjam *</label>
                <select
                  value={form.studentId}
                  onChange={handleFormChange("studentId")}
                  className={inputBase}
                  disabled={!selectedKelas || loadingStudents}
                >
                  <option value="">
                    {!selectedKelas
                      ? "-- Pilih kelas dulu --"
                      : loadingStudents
                        ? "Memuat siswa..."
                        : studentsInKelas.length === 0
                          ? "-- Tidak ada siswa aktif di kelas ini --"
                          : "-- Pilih Nama Siswa --"}
                  </option>
                  {studentsInKelas.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} {s.nis ? `(${s.nis})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelBase}>Judul Buku *</label>
                <select
                  value={form.bukuId}
                  onChange={handleFormChange("bukuId")}
                  className={inputBase}
                >
                  {daftarBuku.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.judul}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelBase}>Tanggal Pinjam *</label>
                  <input
                    type="date"
                    value={form.tanggalPinjam}
                    onChange={handleFormChange("tanggalPinjam")}
                    className={inputBase}
                  />
                </div>
                <div>
                  <label className={labelBase}>Jatuh Tempo *</label>
                  <input
                    type="date"
                    value={form.tanggalJatuhTempo}
                    onChange={handleFormChange("tanggalJatuhTempo")}
                    className={inputBase}
                  />
                </div>
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
                  {saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Catat Peminjaman"}
                </button>
              </div>
            </form>
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
              <h3 className="font-bold text-base sm:text-lg">Hapus Data Peminjaman?</h3>
            </div>
            <p className={`text-sm mb-5 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
              Catatan peminjaman <span className="font-semibold">"{deleteTarget.judulBuku}"</span>{" "}
              oleh <span className="font-semibold">{deleteTarget.namaPeminjam}</span> akan dihapus.
              Tindakan ini tidak dapat dibatalkan.
            </p>
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

export default Peminjaman;
