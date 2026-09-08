// SiswaLulusTab.js
// Sub-Tab "Siswa Lulus" di dalam Student Management (School Combined Tab
// -> Data Sekolah -> Guru & Staf | Data Siswa | Riwayat Mutasi | Siswa
// Lulus).
//
// Revisi (7 Sep 2026): awalnya didesain baca dari `student_mutations`
// (type="lulus"), tapi ternyata sudah ada tabel khusus `student_graduations`
// yang menyimpan SNAPSHOT LENGKAP biodata siswa pas lulus (data pribadi,
// data ortu, no ijazah, dll -- mirip struktur formulir pendaftaran).
// Tabel ini bakal terisi otomatis dari alur "Mulai Tahun Ajaran Baru" pas
// siswa kelas 9 diluluskan (logic ada di modul Manajemen Tahun Ajaran,
// belum diintegrasikan di file ini).
//
// Karena datanya sudah lengkap sendiri (bukan lagi join ke `students`),
// tampilan tabel utama cuma nampilin kolom ringkas, detail lengkap dibuka
// lewat modal per-siswa.
//
// Revisi (7 Sep 2026, part 2):
// 1. Nambah stats card jumlah siswa lulus per tahun (mendukung multi
//    angkatan 2024-2026) -- diambil dari query "meta" yang ringan (cuma
//    kolom id/tahun_lulus/kelas_terakhir/academic_year_id), bukan dari
//    snapshot lengkap.
// 2. Urutan filter diubah: Tahun Ajaran sekarang tampil sebelum Kelas
//    Terakhir.
// 3. Label kolom/opsi "Tahun Ajaran" gak lagi nampilin semester, cukup
//    tahun ajarannya aja (mis. "2025/2026").
// 4 & 5. Data snapshot lengkap (select *) sekarang BARU di-fetch setelah
//    user eksplisit memilih opsi di dropdown Tahun Ajaran (baik tahun
//    spesifik maupun "Semua Tahun Ajaran"). Sebelum itu, tabel nampilin
//    pesan ajakan memilih dulu -- ini juga otomatis motong query berat pas
//    tab pertama kali dibuka.

// Revisi (7 Sep 2026, part 3):
// Nambah fitur EDIT langsung di modal detail (tombol Edit/Simpan/Batal).
// Alasannya: snapshot ke student_graduations itu sekali-jepret pas
// transisi -- kalau data siswa (NIK/alamat/data ortu) belum lengkap SAAT
// transisi dijalankan, sebelumnya gak ada cara buat benerin belakangan
// (siswa udah is_active:false, gak lagi muncul di DataSiswaInduk.js yang
// hard-filter .eq("is_active", true)). No. Ijazah & No. Peserta Ujian juga
// MEMANG sengaja gak pernah keisi otomatis pas transisi (terbit belakangan
// setelah transisi), jadi wajib bisa diisi manual dari sini.
// PENTING: field "academic_years" di tiap row itu HASIL JOIN (lihat
// loadGraduates/loadMeta di bawah), BUKAN kolom asli tabel
// student_graduations -- makanya field itu gak dibikin bisa diedit
// langsung, dan WAJIB dibuang dari payload sebelum .update() (lihat
// handleSaveGraduate).

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../../supabaseClient";
import { Search, GraduationCap, Loader2, X, Eye, Pencil, Save, XCircle } from "lucide-react";

function formatTanggal(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Label tahun ajaran dari relasi `academic_years` (via academic_year_id),
// bukan dari kolom `tahun_lulus` (integer manual). Format: "2025/2026"
// (semester sengaja gak ditampilkan lagi -- lihat revisi part 2, poin 3).
function formatTahunAjaran(academicYear) {
  if (!academicYear) return "-";
  return academicYear.year || "-";
}

// Palet warna pastel untuk stats card per angkatan, di-cycle kalau
// jumlah angkatan lebih banyak dari jumlah warna.
const PASTEL_PALETTE = [
  {
    card: "bg-pink-50 dark:bg-pink-900/20",
    icon: "bg-pink-100 dark:bg-pink-900/40 text-pink-500 dark:text-pink-300",
    label: "text-pink-500 dark:text-pink-300",
    value: "text-pink-800 dark:text-pink-100",
  },
  {
    card: "bg-sky-50 dark:bg-sky-900/20",
    icon: "bg-sky-100 dark:bg-sky-900/40 text-sky-500 dark:text-sky-300",
    label: "text-sky-500 dark:text-sky-300",
    value: "text-sky-800 dark:text-sky-100",
  },
  {
    card: "bg-amber-50 dark:bg-amber-900/20",
    icon: "bg-amber-100 dark:bg-amber-900/40 text-amber-500 dark:text-amber-300",
    label: "text-amber-500 dark:text-amber-300",
    value: "text-amber-800 dark:text-amber-100",
  },
  {
    card: "bg-emerald-50 dark:bg-emerald-900/20",
    icon: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-500 dark:text-emerald-300",
    label: "text-emerald-500 dark:text-emerald-300",
    value: "text-emerald-800 dark:text-emerald-100",
  },
  {
    card: "bg-violet-50 dark:bg-violet-900/20",
    icon: "bg-violet-100 dark:bg-violet-900/40 text-violet-500 dark:text-violet-300",
    label: "text-violet-500 dark:text-violet-300",
    value: "text-violet-800 dark:text-violet-100",
  },
  {
    card: "bg-teal-50 dark:bg-teal-900/20",
    icon: "bg-teal-100 dark:bg-teal-900/40 text-teal-500 dark:text-teal-300",
    label: "text-teal-500 dark:text-teal-300",
    value: "text-teal-800 dark:text-teal-100",
  },
];

// Baris label:value dipakai berulang di dalam modal detail (mode LIHAT).
const InfoRow = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2 py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
    <span className="w-full sm:w-48 shrink-0 text-xs font-semibold text-gray-500 dark:text-gray-400">
      {label}
    </span>
    <span className="text-sm text-gray-800 dark:text-gray-200 break-words">{value || "-"}</span>
  </div>
);

// Baris label:input dipakai berulang di dalam modal detail (mode EDIT).
// `type` "select" butuh `options` (array of string) buat dropdown.
const EditRow = ({ label, field, value, onChange, type = "text", options = null }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
    <label className="w-full sm:w-48 shrink-0 text-xs font-semibold text-gray-500 dark:text-gray-400">
      {label}
    </label>
    {type === "select" ? (
      <select
        value={value ?? ""}
        onChange={(e) => onChange(field, e.target.value)}
        className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        <option value="">- Pilih -</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    ) : (
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(field, e.target.value)}
        className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
      />
    )}
  </div>
);

// Catatan soal field "Tahun Ajaran" & "academic_years": itu HASIL JOIN
// (relasi via academic_year_id) yang dilakuin loadGraduates() buat
// keperluan TAMPILAN doang (formatTahunAjaran). Field object `academic_years`
// itu BUKAN kolom asli di tabel student_graduations, jadi:
// 1. Gak ditampilin sebagai EditRow yang bisa diedit langsung (mengubah
//    academic_year_id butuh dropdown terpisah kalau suatu saat dibutuhin,
//    bukan scope revisi ini).
// 2. WAJIB dibuang dari payload sebelum .update() ke Supabase -- lihat
//    handleSaveGraduate di bawah, kalau kebawa bisa error/insert ngaco
//    karena kolom "academic_years" gak eksis di tabel aslinya.
const GraduateDetailModal = ({ data, createdByName, onClose, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(data || {});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Reset form & keluar dari mode edit tiap kali modal dibuka buat siswa
  // yang beda (atau abis save sukses, `data` dari parent ke-update juga).
  useEffect(() => {
    setForm(data || {});
    setIsEditing(false);
    setSaveError(null);
  }, [data]);

  if (!data) return null;

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleCancel = () => {
    setForm(data);
    setIsEditing(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    const result = await onSave(data.id, form);
    setSaving(false);
    if (result?.error) {
      setSaveError(result.error);
    } else {
      setIsEditing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-5 py-4 flex items-center justify-between rounded-t-2xl gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <GraduationCap size={20} className="text-purple-600 dark:text-purple-400 shrink-0" />
            <h3 className="font-bold text-gray-800 dark:text-white text-base sm:text-lg truncate">
              {data.nama}
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  title="Batal"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  <XCircle size={14} />
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  title="Simpan Perubahan"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Simpan
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                title="Edit Data"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
              >
                <Pencil size={14} />
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {saveError && (
          <div className="mx-5 mt-4 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-400">
            ⚠️ Gagal menyimpan: {saveError}
          </div>
        )}

        <div className="px-5 py-4 space-y-5">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-purple-600 dark:text-purple-400 mb-1">
              Data Kelulusan
            </h4>
            {isEditing ? (
              <>
                <EditRow
                  label="Kelas Terakhir"
                  field="kelas_terakhir"
                  value={form.kelas_terakhir}
                  onChange={handleChange}
                />
                {/* Tahun Ajaran (academic_year_id) sengaja GAK dibikin EditRow --
                    itu hasil join, ngubahnya butuh dropdown pilih academic_years
                    yang valid, bukan input teks bebas. Kalau perlu, kelola dari
                    tempat lain / minta ditambahin terpisah. */}
                <InfoRow label="Tahun Ajaran" value={formatTahunAjaran(data.academic_years)} />
                <EditRow
                  label="Tahun Lulus"
                  field="tahun_lulus"
                  value={form.tahun_lulus}
                  onChange={handleChange}
                  type="number"
                />
                <EditRow
                  label="Tanggal Lulus"
                  field="tanggal_lulus"
                  value={form.tanggal_lulus}
                  onChange={handleChange}
                  type="date"
                />
                <EditRow
                  label="No. Ijazah"
                  field="no_ijazah"
                  value={form.no_ijazah}
                  onChange={handleChange}
                />
                <EditRow
                  label="No. Peserta Ujian"
                  field="no_peserta_ujian"
                  value={form.no_peserta_ujian}
                  onChange={handleChange}
                />
                <EditRow
                  label="Keterangan"
                  field="keterangan"
                  value={form.keterangan}
                  onChange={handleChange}
                />
              </>
            ) : (
              <>
                <InfoRow label="Kelas Terakhir" value={data.kelas_terakhir} />
                <InfoRow label="Tahun Ajaran" value={formatTahunAjaran(data.academic_years)} />
                <InfoRow label="Tahun Lulus" value={data.tahun_lulus} />
                <InfoRow label="Tanggal Lulus" value={formatTanggal(data.tanggal_lulus)} />
                <InfoRow label="No. Ijazah" value={data.no_ijazah} />
                <InfoRow label="No. Peserta Ujian" value={data.no_peserta_ujian} />
                <InfoRow label="Keterangan" value={data.keterangan} />
              </>
            )}
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-1">
              Data Calon Siswa
            </h4>
            {isEditing ? (
              <>
                <EditRow
                  label="Nama Lengkap"
                  field="nama"
                  value={form.nama}
                  onChange={handleChange}
                />
                <EditRow label="NIS" field="nis" value={form.nis} onChange={handleChange} />
                <EditRow label="NISN" field="nisn" value={form.nisn} onChange={handleChange} />
                <EditRow
                  label="Jenis Kelamin"
                  field="jenis_kelamin"
                  value={form.jenis_kelamin}
                  onChange={handleChange}
                  type="select"
                  options={["LAKI-LAKI", "PEREMPUAN"]}
                />
                <EditRow
                  label="Tempat Lahir"
                  field="tempat_lahir"
                  value={form.tempat_lahir}
                  onChange={handleChange}
                />
                <EditRow
                  label="Tanggal Lahir"
                  field="tanggal_lahir"
                  value={form.tanggal_lahir}
                  onChange={handleChange}
                  type="date"
                />
                <EditRow label="Agama" field="agama" value={form.agama} onChange={handleChange} />
                <EditRow
                  label="Anak ke"
                  field="anak_ke"
                  value={form.anak_ke}
                  onChange={handleChange}
                  type="number"
                />
                <EditRow
                  label="Asal Sekolah"
                  field="sekolah_asal"
                  value={form.sekolah_asal}
                  onChange={handleChange}
                />
                <EditRow label="NIK" field="nik" value={form.nik} onChange={handleChange} />
                <EditRow label="No. KK" field="no_kk" value={form.no_kk} onChange={handleChange} />
                <EditRow
                  label="No. Akta Lahir"
                  field="no_akta_lahir"
                  value={form.no_akta_lahir}
                  onChange={handleChange}
                />
                <EditRow
                  label="No. KIP"
                  field="no_kip"
                  value={form.no_kip}
                  onChange={handleChange}
                />
              </>
            ) : (
              <>
                <InfoRow label="Nama Lengkap" value={data.nama} />
                <InfoRow label="NIS" value={data.nis} />
                <InfoRow label="NISN" value={data.nisn} />
                <InfoRow label="Jenis Kelamin" value={data.jenis_kelamin} />
                <InfoRow
                  label="Tempat, Tanggal Lahir"
                  value={
                    data.tempat_lahir || data.tanggal_lahir
                      ? `${data.tempat_lahir || "-"}, ${formatTanggal(data.tanggal_lahir)}`
                      : null
                  }
                />
                <InfoRow label="Agama" value={data.agama} />
                <InfoRow label="Anak ke" value={data.anak_ke} />
                <InfoRow label="Asal Sekolah" value={data.sekolah_asal} />
                <InfoRow label="NIK" value={data.nik} />
                <InfoRow label="No. KK" value={data.no_kk} />
                <InfoRow label="No. Akta Lahir" value={data.no_akta_lahir} />
                <InfoRow label="No. KIP" value={data.no_kip} />
              </>
            )}
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-green-600 dark:text-green-400 mb-1">
              Alamat
            </h4>
            {isEditing ? (
              <>
                <EditRow
                  label="Alamat Lengkap"
                  field="alamat"
                  value={form.alamat}
                  onChange={handleChange}
                />
                <EditRow label="Dusun" field="dusun" value={form.dusun} onChange={handleChange} />
                <EditRow
                  label="Kode Pos"
                  field="kode_pos"
                  value={form.kode_pos}
                  onChange={handleChange}
                />
              </>
            ) : (
              <>
                <InfoRow label="Alamat Lengkap" value={data.alamat} />
                <InfoRow label="Dusun" value={data.dusun} />
                <InfoRow label="Kode Pos" value={data.kode_pos} />
              </>
            )}
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-1">
              Data Ayah
            </h4>
            {isEditing ? (
              <>
                <EditRow
                  label="Nama"
                  field="nama_ayah"
                  value={form.nama_ayah}
                  onChange={handleChange}
                />
                <EditRow
                  label="NIK"
                  field="nik_ayah"
                  value={form.nik_ayah}
                  onChange={handleChange}
                />
                <EditRow
                  label="Pekerjaan"
                  field="pekerjaan_ayah"
                  value={form.pekerjaan_ayah}
                  onChange={handleChange}
                />
                <EditRow
                  label="Pendidikan Terakhir"
                  field="pendidikan_ayah"
                  value={form.pendidikan_ayah}
                  onChange={handleChange}
                />
              </>
            ) : (
              <>
                <InfoRow label="Nama" value={data.nama_ayah} />
                <InfoRow label="NIK" value={data.nik_ayah} />
                <InfoRow label="Pekerjaan" value={data.pekerjaan_ayah} />
                <InfoRow label="Pendidikan Terakhir" value={data.pendidikan_ayah} />
              </>
            )}
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-1">
              Data Ibu
            </h4>
            {isEditing ? (
              <>
                <EditRow
                  label="Nama"
                  field="nama_ibu"
                  value={form.nama_ibu}
                  onChange={handleChange}
                />
                <EditRow label="NIK" field="nik_ibu" value={form.nik_ibu} onChange={handleChange} />
                <EditRow
                  label="Pekerjaan"
                  field="pekerjaan_ibu"
                  value={form.pekerjaan_ibu}
                  onChange={handleChange}
                />
                <EditRow
                  label="Pendidikan Terakhir"
                  field="pendidikan_ibu"
                  value={form.pendidikan_ibu}
                  onChange={handleChange}
                />
              </>
            ) : (
              <>
                <InfoRow label="Nama" value={data.nama_ibu} />
                <InfoRow label="NIK" value={data.nik_ibu} />
                <InfoRow label="Pekerjaan" value={data.pekerjaan_ibu} />
                <InfoRow label="Pendidikan Terakhir" value={data.pendidikan_ibu} />
              </>
            )}
          </div>

          <div className="text-xs text-gray-400 dark:text-gray-500 pt-1">
            Dicatat oleh {createdByName || "-"} &middot; {formatTanggal(data.created_at)}
          </div>
        </div>
      </div>
    </div>
  );
};

const SiswaLulusTab = () => {
  // --- Meta (ringan): dipakai buat stats card + isi dropdown, di-load
  // sekali saat tab dibuka. Gak ambil kolom snapshot biodata lengkap.
  const [metaLoading, setMetaLoading] = useState(true);
  const [meta, setMeta] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  // --- Data detail (berat): baru di-fetch setelah user pilih Tahun Ajaran.
  const [loading, setLoading] = useState(false);
  const [graduates, setGraduates] = useState([]);
  const [usersMap, setUsersMap] = useState({});

  const [kelasFilter, setKelasFilter] = useState("semua");
  // Default langsung "semua" -- Semua Tahun Ajaran ke-load begitu tab dibuka.
  const [tahunAjaranFilter, setTahunAjaranFilter] = useState("semua");
  const [search, setSearch] = useState("");
  const [detailData, setDetailData] = useState(null);

  // Query ringan untuk stats card & opsi filter (kolom seperlunya aja).
  const loadMeta = async () => {
    setMetaLoading(true);
    try {
      const { data, error } = await supabase
        .from("student_graduations")
        .select(
          "id, tahun_lulus, kelas_terakhir, academic_year_id, academic_years(id, year, semester, start_date)"
        );
      if (error) throw error;
      setMeta(data || []);
    } catch (err) {
      console.error("Error loading student_graduations meta:", err);
    } finally {
      setMetaLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data } = await supabase.from("users").select("id, full_name");
      const map = {};
      (data || []).forEach((u) => {
        map[String(u.id)] = u.full_name;
      });
      setUsersMap(map);
    } catch (err) {
      console.error("Error loading users:", err);
    }
  };

  // Semua Tahun Ajaran yang terdaftar di sistem (bukan cuma yang sudah
  // punya lulusan) -- dipakai supaya stats card angkatan yang akan datang
  // (mis. 2027/2028) sudah siap tampil duluan walau siswanya belum lulus.
  const loadAcademicYears = async () => {
    try {
      const { data, error } = await supabase
        .from("academic_years")
        .select("id, year, semester, start_date");
      if (error) throw error;
      setAcademicYears(data || []);
    } catch (err) {
      console.error("Error loading academic_years:", err);
    }
  };

  // Query berat (snapshot lengkap) -- hanya dipanggil setelah user memilih
  // Tahun Ajaran. Kalau tahun spesifik dipilih, filter langsung di query
  // (bukan di-fetch semua baru difilter di client).
  const loadGraduates = async (filterValue) => {
    setLoading(true);
    try {
      let query = supabase
        .from("student_graduations")
        .select("*, academic_years(id, year, semester, start_date)")
        .order("nama", { ascending: true });

      if (filterValue !== "semua") {
        query = query.eq("academic_year_id", filterValue);
      }

      const { data, error } = await query;
      if (error) throw error;
      setGraduates(data || []);
    } catch (err) {
      console.error("Error loading student_graduations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeta();
    loadUsers();
    loadAcademicYears();
  }, []);

  // Baru fetch data detail begitu user memilih sesuatu di dropdown Tahun
  // Ajaran (termasuk pilihan eksplisit "Semua Tahun Ajaran").
  useEffect(() => {
    if (tahunAjaranFilter) {
      loadGraduates(tahunAjaranFilter);
    } else {
      setGraduates([]);
    }
  }, [tahunAjaranFilter]);

  // Nyimpen perubahan hasil edit dari GraduateDetailModal ke student_graduations.
  // Tiga hal yang WAJIB dibuang dari payload sebelum .update():
  // - `id`, `created_by`, `created_at` -- audit trail asli, gak boleh
  //   kesentuh dari edit manual.
  // - `academic_years` -- ini HASIL JOIN dari select("*, academic_years(...)")
  //   di loadGraduates(), bukan kolom asli di tabel student_graduations.
  //   Kalau kebawa, Supabase bakal nolak soalnya disuruh nulis ke kolom yang
  //   gak eksis.
  // `tahun_lulus` & `anak_ke` dikonversi ke integer (keduanya numeric di
  // DB) -- HTML input balikin string, string kosong "" kalau dipaksa masuk
  // kolom integer bakal error, jadi di-null-in kalau kosong.
  const handleSaveGraduate = async (id, form) => {
    try {
      const payload = { ...form };
      delete payload.id;
      delete payload.created_by;
      delete payload.created_at;
      delete payload.academic_years;

      payload.tahun_lulus =
        payload.tahun_lulus !== "" && payload.tahun_lulus != null
          ? parseInt(payload.tahun_lulus, 10)
          : null;
      payload.anak_ke =
        payload.anak_ke !== "" && payload.anak_ke != null ? parseInt(payload.anak_ke, 10) : null;

      const { data: updated, error } = await supabase
        .from("student_graduations")
        .update(payload)
        .eq("id", id)
        .select("*, academic_years(id, year, semester, start_date)")
        .single();

      if (error) throw error;

      setGraduates((prev) => prev.map((g) => (g.id === id ? updated : g)));
      setDetailData(updated);
      return { data: updated };
    } catch (err) {
      console.error("Gagal update student_graduations:", err);
      return { error: err.message };
    }
  };

  // Stats card: jumlah siswa lulus per Tahun Ajaran (label ambil dari
  // academic_years.year, BUKAN dari kolom tahun_lulus manual). Digabung
  // dengan seluruh Tahun Ajaran yang sudah terdaftar di sistem, jadi
  // angkatan yang belum ada lulusannya sama sekali (mis. 2027/2028, tahun
  // ajarannya sudah dibuat lewat modul Tahun Ajaran tapi siswanya belum
  // diluluskan) tetap kelihatan card-nya dengan angka 0.
  const yearStats = useMemo(() => {
    const countByLabel = new Map();
    meta.forEach((g) => {
      const label = g.academic_years?.year;
      if (!label) return;
      countByLabel.set(label, (countByLabel.get(label) || 0) + 1);
    });

    const earliestStartByLabel = new Map();
    academicYears.forEach((ay) => {
      if (!ay.year) return;
      const prev = earliestStartByLabel.get(ay.year);
      if (!prev || (ay.start_date && new Date(ay.start_date) < new Date(prev))) {
        earliestStartByLabel.set(ay.year, ay.start_date);
      }
    });

    const allLabels = new Set([...countByLabel.keys(), ...earliestStartByLabel.keys()]);

    return [...allLabels]
      .map((label) => ({
        label,
        count: countByLabel.get(label) || 0,
        start_date: earliestStartByLabel.get(label) || null,
      }))
      .sort((a, b) => {
        // Terbaru/akan datang di depan. Kalau start_date gak ketemu (jarang
        // terjadi), fallback sort abjad terbalik biar tetap konsisten.
        if (!a.start_date && !b.start_date) return b.label.localeCompare(a.label);
        if (!a.start_date) return -1;
        if (!b.start_date) return 1;
        return new Date(b.start_date) - new Date(a.start_date);
      });
  }, [meta, academicYears]);

  const kelasOptions = useMemo(() => {
    const set = new Set(meta.map((g) => g.kelas_terakhir).filter(Boolean));
    return [...set].sort();
  }, [meta]);

  const tahunAjaranOptions = useMemo(() => {
    const map = new Map();
    meta.forEach((g) => {
      if (g.academic_years?.id) {
        map.set(g.academic_years.id, g.academic_years);
      }
    });
    // Urut terbaru dulu berdasarkan start_date (bukan sort string tahun_lulus).
    return [...map.values()].sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
  }, [meta]);

  // Filter kelas & pencarian diterapkan di client terhadap data yang sudah
  // di-fetch (filter tahun ajaran sudah ditangani di level query).
  const filtered = useMemo(() => {
    return graduates.filter((g) => {
      if (kelasFilter !== "semua" && g.kelas_terakhir !== kelasFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = (g.nama || "").toLowerCase();
        const nis = (g.nis || "").toLowerCase();
        const nisn = (g.nisn || "").toLowerCase();
        if (!name.includes(q) && !nis.includes(q) && !nisn.includes(q)) return false;
      }
      return true;
    });
  }, [graduates, kelasFilter, search]);

  // Keterangan dinamis di atas tabel, mis. "Menampilkan 662 Siswa (semua
  // kelas, belum difilter)" kalau default, atau "Menampilkan 45 Siswa
  // (Tahun Ajaran 2025/2026, Kelas 9A)" kalau lagi difilter.
  const filterDescription = useMemo(() => {
    const parts = [];
    if (tahunAjaranFilter !== "semua") {
      const ay = tahunAjaranOptions.find((t) => t.id === tahunAjaranFilter);
      parts.push(`Tahun Ajaran ${formatTahunAjaran(ay)}`);
    }
    if (kelasFilter !== "semua") {
      parts.push(`Kelas ${kelasFilter}`);
    }
    if (search.trim()) {
      parts.push(`pencarian "${search.trim()}"`);
    }
    if (parts.length === 0) {
      return "semua kelas, belum difilter";
    }
    return parts.join(", ");
  }, [tahunAjaranFilter, kelasFilter, search, tahunAjaranOptions]);

  return (
    <div className="p-4 sm:p-6">
      {/* STATS CARD PER TAHUN AJARAN -- HP: grid 2 kolom fix (selalu 2
          baris/kolom, gak ikut ngecil-lebar konten). Desktop: flex satu
          baris, lebar tiap card otomatis rata bagi jumlah angkatan. */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:flex sm:flex-nowrap">
        {metaLoading ? (
          <div className="col-span-2 sm:flex-1 flex items-center gap-2 text-gray-400 text-sm py-4">
            <Loader2 size={16} className="animate-spin" />
            <span>Memuat ringkasan angkatan...</span>
          </div>
        ) : yearStats.length === 0 ? (
          <div className="col-span-2 sm:flex-1 text-sm text-gray-400 dark:text-gray-500 py-2">
            Belum ada data siswa lulus.
          </div>
        ) : (
          yearStats.map(({ label, count }, idx) => {
            const palette = PASTEL_PALETTE[idx % PASTEL_PALETTE.length];
            return (
              <div
                key={label}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 min-w-0 sm:flex-1 sm:basis-0 ${palette.card}`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${palette.icon}`}>
                  <GraduationCap size={18} />
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-medium truncate ${palette.label}`}>Lulus {label}</p>
                  <p className={`text-lg font-bold ${palette.value}`}>{count} siswa</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FILTER
          - Desktop (sm+): search, Tahun Ajaran, Kelas Terakhir tetap SATU
            baris sejajar (seperti semula).
          - HP: search sendiri di baris pertama (layar sempit), Tahun
            Ajaran & Kelas Terakhir digabung satu baris di bawahnya
            (masing-masing 50%, balance). */}
      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <div className="flex flex-col gap-1 w-full sm:flex-1 sm:min-w-[180px]">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            Cari Siswa
          </label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama/NIS/NISN..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
        {/* sm:contents "membubarkan" div ini di desktop, jadi 2 select di
            bawah ini otomatis nyatu jadi item flex langsung di baris yang
            sama dengan search. Di HP, div ini tetap jadi baris flex sendiri
            berisi 2 select yang berdampingan. */}
        <div className="flex gap-2 sm:contents">
          <div className="flex flex-col gap-1 flex-1 basis-0 min-w-0 sm:flex-none sm:basis-auto sm:w-auto">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Pilih Tahun Ajaran
            </label>
            <select
              value={tahunAjaranFilter}
              onChange={(e) => setTahunAjaranFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="semua">Semua Tahun Ajaran</option>
              {tahunAjaranOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {formatTahunAjaran(t)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 flex-1 basis-0 min-w-0 sm:flex-none sm:basis-auto sm:w-auto">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Pilih Kelas Terakhir
            </label>
            <select
              value={kelasFilter}
              onChange={(e) => setKelasFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="semua">Semua Kelas Terakhir</option>
              {kelasOptions.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
        Menampilkan{" "}
        <span className="font-semibold text-gray-700 dark:text-gray-200">{filtered.length}</span>{" "}
        Siswa ({filterDescription})
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
          <Loader2 size={20} className="animate-spin" />
          <span>Memuat data siswa lulus...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          {graduates.length === 0
            ? "Belum ada data siswa lulus untuk tahun ajaran ini."
            : "Tidak ditemukan siswa yang sesuai dengan filter."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">
                  NIS
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">
                  Nama Siswa
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600 dark:text-gray-300">
                  Kelas Terakhir
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600 dark:text-gray-300">
                  Tahun Ajaran
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600 dark:text-gray-300">
                  Tanggal Lulus
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">
                  No. Ijazah
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600 dark:text-gray-300">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((g) => (
                <tr key={g.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-200">
                    {g.nis || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{g.nama}</p>
                    <p className="text-xs text-gray-400">NISN {g.nisn || "-"}</p>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">
                    {g.kelas_terakhir || "-"}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    {formatTahunAjaran(g.academic_years)}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    {formatTanggal(g.tanggal_lulus)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {g.no_ijazah || "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setDetailData(g)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                      title="Lihat Detail"
                    >
                      <Eye size={14} />
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detailData && (
        <GraduateDetailModal
          data={detailData}
          createdByName={detailData.created_by ? usersMap[String(detailData.created_by)] : null}
          onSave={handleSaveGraduate}
          onClose={() => setDetailData(null)}
        />
      )}
    </div>
  );
};

export default SiswaLulusTab;
