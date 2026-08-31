//[file name]: HomeVisit.js
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Home, AlertTriangle, Download } from "lucide-react";
import HomeVisitStats from "./HomeVisitStats";
import HomeVisitFilter from "./HomeVisitFilter";
import HomeVisitTable from "./HomeVisitTable";
import HomeVisitModal from "./HomeVisitModal";
import HomeVisitDetail from "./HomeVisitDetail";
import { exportHomeVisitListToPDF } from "./HomeVisitExportPDF";

// ⚠️ ASUMSI PATH: sesuaikan import ini kalau lokasi supabaseClient
// lo beda dari src/supabaseClient.js
import { supabase } from "../../supabaseClient";

// ============================================================
// Halaman utama Home Visit. TERSAMBUNG ke Supabase:
//   - tabel `homevisits`  -> data kunjungan (existing)
//   - tabel `classes`     -> sumber opsi "Pilih Jenjang" & "Pilih Kelas"
//                            (kolom: id, grade, academic_year,
//                            academic_year_id, is_active, ...)
//
// ✅ REVISI filter (urutan baru):
//   Cari Siswa - Pilih Jenjang - Pilih Kelas - Status - Tambah Home Visit
// - "Pilih Jenjang" difilter dari kolom `grade` di tabel `classes`.
// - "Pilih Kelas" DEPENDENT ke Jenjang: opsinya cuma kelas aktif
//   (`is_active = true`) yang grade-nya cocok dengan Jenjang terpilih.
//   Kalau Jenjang = "Semua", semua kelas aktif ditampilkan.
// - Milih Jenjang baru otomatis reset filterKelas ke "Semua" biar
//   gak nyangkut ke kelas yang udah gak sesuai jenjang.
//
// ✅ HomeVisitModal.js sudah tersambung (tombol Tambah & Edit):
//   - narik data `students` (id, nis, full_name, gender, class_id)
//     utk dropdown "Pilih Siswa" (dependent ke Jenjang -> Kelas)
//   - insert/update langsung ke tabel `homevisits`
//   - ❌ Konsep "Petugas" DIHAPUS TOTAL: tidak ada field di form,
//     tidak dikirim ke payload, tidak ditarik dari tabel manapun.
//     Kolom petugas_id/nama_petugas di `homevisits` (kalau masih ada)
//     tidak lagi diisi dari sini.
//   - TODO: checklist tindak lanjut (tabel `tindaklanjut_homevisits`)
//     belum diikutsertakan, nyusul di iterasi berikutnya
//
// ✅ HomeVisitDetail.js sudah dibuat & tersambung (tombol "Detail" sekarang
//    buka modal read-only, narik ulang data `student_profile_details`
//    berdasarkan `student_id` sama seperti di HomeVisitModal.js).
//
// ✅ HomeVisitExportPDF.js sudah dibuat & tersambung (jsPDF + jspdf-autotable):
//    - HANYA 1 tombol export, di header halaman ini -> cetak `dataTersaring`
//      (data yang sedang tampil/difilter), tiap home visit jadi 1 halaman
//      laporan detail lengkap (format sama kayak modal HomeVisitDetail.js).
//    - Modal HomeVisitDetail.js TIDAK ada tombol export sendiri lagi.
//    ⚠️ Butuh `npm install jspdf jspdf-autotable` kalau belum ada di project.
//
// SEMUA 7 FILE MODUL HOME VISIT SUDAH SELESAI.
// ============================================================

const emptyStats = { total: 0, terjadwal: 0, selesai: 0, perluTindakLanjut: 0 };

const HomeVisit = ({ darkMode = false }) => {
  const [daftarHomeVisit, setDaftarHomeVisit] = useState([]);
  const [classesList, setClassesList] = useState([]); // semua kelas (untuk mapping grade)
  const [studentsList, setStudentsList] = useState([]); // dari tabel students (utk dropdown Nama Siswa di modal)
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // ---------- Modal Tambah/Edit ----------
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("tambah"); // "tambah" | "edit"
  const [editingItem, setEditingItem] = useState(null);

  // ---------- Modal Detail (read-only) ----------
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailItem, setDetailItem] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterJenjang, setFilterJenjangState] = useState("Semua");
  const [filterKelas, setFilterKelas] = useState("Semua");
  const [filterStatus, setFilterStatus] = useState("Semua");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ---------- Fetch data Home Visit dari Supabase ----------
  const fetchHomeVisits = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");

    const { data, error } = await supabase
      .from("homevisits")
      .select("*")
      .order("tanggal_kunjungan", { ascending: false });

    if (error) {
      setErrorMsg("Gagal memuat data Home Visit: " + error.message);
      setDaftarHomeVisit([]);
    } else {
      setDaftarHomeVisit(data || []);
    }
    setLoading(false);
  }, []);

  // ---------- Fetch daftar kelas dari Supabase (utk Jenjang & Kelas) ----------
  const fetchClasses = useCallback(async () => {
    const { data, error } = await supabase
      .from("classes")
      .select("id, grade, academic_year, academic_year_id, is_active")
      .order("id", { ascending: true });

    if (error) {
      setErrorMsg((prev) => prev || "Gagal memuat daftar kelas: " + error.message);
      setClassesList([]);
    } else {
      setClassesList(data || []);
    }
  }, []);

  // ---------- Fetch daftar siswa dari Supabase (utk dropdown "Nama Siswa" di modal) ----------
  const fetchStudents = useCallback(async () => {
    const { data, error } = await supabase
      .from("students")
      .select("id, nis, full_name, gender, class_id")
      .order("full_name", { ascending: true });

    if (error) {
      setErrorMsg((prev) => prev || "Gagal memuat daftar siswa: " + error.message);
      setStudentsList([]);
    } else {
      setStudentsList(data || []);
    }
  }, []);

  useEffect(() => {
    fetchHomeVisits();
    fetchClasses();
    fetchStudents();
  }, [fetchHomeVisits, fetchClasses, fetchStudents]);

  // ---------- Handler khusus Jenjang: reset Kelas tiap kali Jenjang ganti ----------
  const setFilterJenjang = (value) => {
    setFilterJenjangState(value);
    setFilterKelas("Semua");
  };

  // ---------- Derived: opsi Jenjang (grade unik, dari classes aktif) ----------
  const jenjangOptions = useMemo(() => {
    const unik = new Set(
      classesList
        .filter((c) => c.is_active)
        .map((c) => String(c.grade))
        .filter(Boolean)
    );
    return Array.from(unik).sort((a, b) => Number(a) - Number(b));
  }, [classesList]);

  // ---------- Derived: opsi Kelas (dependent ke Jenjang, dari classes aktif) ----------
  const kelasOptions = useMemo(() => {
    return classesList
      .filter((c) => c.is_active)
      .filter((c) => filterJenjang === "Semua" || String(c.grade) === filterJenjang)
      .map((c) => c.id)
      .sort();
  }, [classesList, filterJenjang]);

  // ---------- Mapping nama kelas -> grade (utk filter data saat Kelas = "Semua") ----------
  const gradeByKelas = useMemo(() => {
    const map = {};
    classesList.forEach((c) => {
      map[c.id] = String(c.grade);
    });
    return map;
  }, [classesList]);

  // ---------- Filter data tabel ----------
  const dataTersaring = useMemo(() => {
    const kw = searchTerm.trim().toLowerCase();
    return daftarHomeVisit.filter((item) => {
      const cocokKeyword = !kw || (item.nama_siswa || "").toLowerCase().includes(kw);
      const cocokJenjang = filterJenjang === "Semua" || gradeByKelas[item.kelas] === filterJenjang;
      const cocokKelas = filterKelas === "Semua" || item.kelas === filterKelas;
      const cocokStatus = filterStatus === "Semua" || item.status === filterStatus;
      return cocokKeyword && cocokJenjang && cocokKelas && cocokStatus;
    });
  }, [daftarHomeVisit, searchTerm, filterJenjang, filterKelas, filterStatus, gradeByKelas]);

  const stats = useMemo(() => {
    if (daftarHomeVisit.length === 0) return emptyStats;
    return {
      total: daftarHomeVisit.length,
      terjadwal: daftarHomeVisit.filter((i) => i.status === "Terjadwal").length,
      selesai: daftarHomeVisit.filter((i) => i.status === "Selesai").length,
      perluTindakLanjut: daftarHomeVisit.filter((i) => i.status === "Perlu Tindak Lanjut").length,
    };
  }, [daftarHomeVisit]);

  // ---------- Export rekap PDF (data yang sedang tampil / sudah difilter) ----------
  // Tiap home visit di `dataTersaring` dicetak 1 halaman detail lengkap
  // (data siswa diambil otomatis oleh HomeVisitExportPDF.js).
  const handleExportPDF = async () => {
    await exportHomeVisitListToPDF(dataTersaring);
  };

  // ---------- Handlers ----------
  const handleTambah = () => {
    setModalMode("tambah");
    setEditingItem(null);
    setShowModal(true);
  };

  const handleDetail = (item) => {
    setDetailItem(item);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setDetailItem(null);
  };

  const handleEdit = (item) => {
    setModalMode("edit");
    setEditingItem(item);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  const handleModalSaved = () => {
    fetchHomeVisits();
  };

  const confirmDelete = (item) => setDeleteTarget(item);
  const cancelDelete = () => setDeleteTarget(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from("homevisits").delete().eq("id", deleteTarget.id);
    setDeleting(false);

    if (error) {
      setErrorMsg("Gagal menghapus data: " + error.message);
      return;
    }
    setDeleteTarget(null);
    fetchHomeVisits();
  };

  // ---------- Style helpers ----------
  const cardBg = darkMode ? "bg-gray-800 border-theme" : "bg-theme-bg border-theme";

  return (
    <div
      className={`min-h-full w-full p-4 sm:p-6 lg:p-8 ${
        darkMode ? "bg-theme-bg text-gray-100" : "bg-theme-surface text-theme"
      }`}
    >
      <div className="w-full max-w-[1600px] mx-auto">
        {/* ===== Header ===== */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                darkMode ? "bg-blue-900" : "bg-blue-100"
              }`}
            >
              <Home
                className={`w-5 h-5 sm:w-6 sm:h-6 ${darkMode ? "text-blue-300" : "text-blue-700"}`}
              />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold leading-tight">Home Visit</h1>
              <p className={`text-xs sm:text-sm ${darkMode ? "text-gray-400" : "text-theme-secondary"}`}>
                Dokumentasi kunjungan rumah siswa oleh Guru BK/BP
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={dataTersaring.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 flex-shrink-0"
          >
            <Download size={16} />
            Export PDF
          </button>
        </div>

        {/* ===== Error banner ===== */}
        {errorMsg && (
          <div
            className={`flex items-start gap-2 rounded-lg border px-3 py-2 mb-6 text-xs sm:text-sm ${
              darkMode
                ? "bg-red-900/20 border-red-800/40 text-red-300"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ===== Stats ===== */}
        <HomeVisitStats stats={stats} darkMode={darkMode} />

        {/* ===== Filter ===== */}
        <HomeVisitFilter
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterJenjang={filterJenjang}
          setFilterJenjang={setFilterJenjang}
          jenjangOptions={jenjangOptions}
          filterKelas={filterKelas}
          setFilterKelas={setFilterKelas}
          kelasOptions={kelasOptions}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          onTambah={handleTambah}
          darkMode={darkMode}
        />

        {/* ===== Loading state ===== */}
        {loading ? (
          <div
            className={`rounded-xl border-2 border-dashed p-10 text-center ${
              darkMode ? "border-theme bg-gray-800/50" : "border-theme bg-theme-bg"
            }`}
          >
            <p className={`text-sm ${darkMode ? "text-gray-400" : "text-theme-secondary"}`}>
              Memuat data Home Visit...
            </p>
          </div>
        ) : (
          <HomeVisitTable
            data={dataTersaring}
            darkMode={darkMode}
            onDetail={handleDetail}
            onEdit={handleEdit}
            onDelete={confirmDelete}
          />
        )}
      </div>

      {/* ===== Modal Tambah/Edit Home Visit ===== */}
      <HomeVisitModal
        isOpen={showModal}
        mode={modalMode}
        initialData={editingItem}
        classesList={classesList}
        studentsList={studentsList}
        onClose={closeModal}
        onSaved={handleModalSaved}
        darkMode={darkMode}
      />

      {/* ===== Modal Detail Home Visit (read-only) ===== */}
      <HomeVisitDetail
        isOpen={showDetailModal}
        item={detailItem}
        onClose={closeDetailModal}
        darkMode={darkMode}
      />

      {/* ===== Modal Konfirmasi Hapus ===== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={`w-full max-w-sm rounded-xl shadow-xl p-5 ${cardBg}`}>
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  darkMode ? "bg-red-900/30" : "bg-red-100"
                }`}
              >
                <AlertTriangle size={20} className={darkMode ? "text-red-300" : "text-red-600"} />
              </div>
              <h3 className="font-bold text-base sm:text-lg">Hapus Data Home Visit?</h3>
            </div>
            <p className={`text-sm mb-5 ${darkMode ? "text-gray-300" : "text-theme-secondary"}`}>
              Catatan kunjungan untuk{" "}
              <span className="font-semibold">{deleteTarget.nama_siswa}</span> pada{" "}
              {deleteTarget.tanggal_kunjungan} akan dihapus beserta seluruh tindak lanjutnya.
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelDelete}
                disabled={deleting}
                className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 ${
                  darkMode
                    ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                    : "bg-theme-surface hover:bg-gray-200 text-theme-secondary"
                }`}
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-lg font-medium text-sm bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
              >
                {deleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeVisit;
