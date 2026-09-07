// SiswaLulusTab.js
// Sub-tab "Siswa Lulus" di dalam Student Management (School Combined Tab
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

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../../supabaseClient";
import { Search, GraduationCap, Loader2, X, Eye } from "lucide-react";

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

// Baris label:value dipakai berulang di dalam modal detail.
const InfoRow = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2 py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
    <span className="w-full sm:w-48 shrink-0 text-xs font-semibold text-gray-500 dark:text-gray-400">
      {label}
    </span>
    <span className="text-sm text-gray-800 dark:text-gray-200 break-words">{value || "-"}</span>
  </div>
);

const GraduateDetailModal = ({ data, createdByName, onClose }) => {
  if (!data) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-2">
            <GraduationCap size={20} className="text-purple-600 dark:text-purple-400" />
            <h3 className="font-bold text-gray-800 dark:text-white text-base sm:text-lg">
              {data.nama}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-purple-600 dark:text-purple-400 mb-1">
              Data Kelulusan
            </h4>
            <InfoRow label="Kelas Terakhir" value={data.kelas_terakhir} />
            <InfoRow label="Tahun Ajaran" value={formatTahunAjaran(data.academic_years)} />
            <InfoRow label="Tahun Lulus" value={data.tahun_lulus} />
            <InfoRow label="Tanggal Lulus" value={formatTanggal(data.tanggal_lulus)} />
            <InfoRow label="No. Ijazah" value={data.no_ijazah} />
            <InfoRow label="No. Peserta Ujian" value={data.no_peserta_ujian} />
            <InfoRow label="Keterangan" value={data.keterangan} />
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-1">
              Data Calon Siswa
            </h4>
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
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-green-600 dark:text-green-400 mb-1">
              Alamat
            </h4>
            <InfoRow label="Alamat Lengkap" value={data.alamat} />
            <InfoRow label="Dusun" value={data.dusun} />
            <InfoRow label="Kode Pos" value={data.kode_pos} />
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-1">
              Data Ayah
            </h4>
            <InfoRow label="Nama" value={data.nama_ayah} />
            <InfoRow label="NIK" value={data.nik_ayah} />
            <InfoRow label="Pekerjaan" value={data.pekerjaan_ayah} />
            <InfoRow label="Pendidikan Terakhir" value={data.pendidikan_ayah} />
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-1">
              Data Ibu
            </h4>
            <InfoRow label="Nama" value={data.nama_ibu} />
            <InfoRow label="NIK" value={data.nik_ibu} />
            <InfoRow label="Pekerjaan" value={data.pekerjaan_ibu} />
            <InfoRow label="Pendidikan Terakhir" value={data.pendidikan_ibu} />
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

  // --- Data detail (berat): baru di-fetch setelah user pilih Tahun Ajaran.
  const [loading, setLoading] = useState(false);
  const [graduates, setGraduates] = useState([]);
  const [usersMap, setUsersMap] = useState({});

  const [kelasFilter, setKelasFilter] = useState("semua");
  // "" = belum dipilih sama sekali (state awal), "semua" = eksplisit pilih
  // "Semua Tahun Ajaran", selain itu = id academic_year spesifik.
  const [tahunAjaranFilter, setTahunAjaranFilter] = useState("");
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

  // Query berat (snapshot lengkap) -- hanya dipanggil setelah user memilih
  // Tahun Ajaran. Kalau tahun spesifik dipilih, filter langsung di query
  // (bukan di-fetch semua baru difilter di client).
  const loadGraduates = async (filterValue) => {
    setLoading(true);
    try {
      let query = supabase
        .from("student_graduations")
        .select("*, academic_years(id, year, semester, start_date)")
        .order("tanggal_lulus", { ascending: false });

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

  // Stats card: jumlah siswa lulus per tahun (mendukung banyak angkatan,
  // mis. 2024, 2025, 2026), diurut terbaru dulu.
  const yearStats = useMemo(() => {
    const map = new Map();
    meta.forEach((g) => {
      const y = g.tahun_lulus;
      if (!y) return;
      map.set(y, (map.get(y) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [meta]);

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

  const belumPilihTahun = !tahunAjaranFilter;

  return (
    <div className="p-4 sm:p-6">
      {/* STATS CARD PER TAHUN LULUS */}
      <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {metaLoading ? (
          <div className="col-span-full flex items-center gap-2 text-gray-400 text-sm py-4">
            <Loader2 size={16} className="animate-spin" />
            <span>Memuat ringkasan angkatan...</span>
          </div>
        ) : yearStats.length === 0 ? (
          <div className="col-span-full text-sm text-gray-400 dark:text-gray-500 py-2">
            Belum ada data siswa lulus.
          </div>
        ) : (
          yearStats.map(([year, count]) => (
            <div
              key={year}
              className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3"
            >
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                <GraduationCap size={18} className="text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Lulus {year}</p>
                <p className="text-lg font-bold text-gray-800 dark:text-white">{count} siswa</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* RINGKASAN HASIL FILTER -- cuma tampil kalau user sudah pilih Tahun Ajaran */}
      {tahunAjaranFilter && (
        <div className="mb-4 flex items-center gap-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl px-4 py-3">
          <GraduationCap size={18} className="text-purple-600 dark:text-purple-400" />
          <span className="text-sm text-purple-800 dark:text-purple-300 font-medium">
            Total {filtered.length} siswa lulus
            {tahunAjaranFilter !== "semua"
              ? ` (${formatTahunAjaran(tahunAjaranOptions.find((t) => t.id === tahunAjaranFilter))})`
              : ""}
          </span>
        </div>
      )}

      {/* FILTER -- urutan: Tahun Ajaran dulu, baru Kelas Terakhir */}
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama/NIS/NISN..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <select
          value={tahunAjaranFilter}
          onChange={(e) => setTahunAjaranFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100"
        >
          <option value="" disabled>
            -- Pilih Tahun Ajaran --
          </option>
          <option value="semua">Semua Tahun Ajaran</option>
          {tahunAjaranOptions.map((t) => (
            <option key={t.id} value={t.id}>
              {formatTahunAjaran(t)}
            </option>
          ))}
        </select>
        <select
          value={kelasFilter}
          onChange={(e) => setKelasFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100"
        >
          <option value="semua">Semua Kelas Terakhir</option>
          {kelasOptions.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </div>

      {belumPilihTahun ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-gray-400 dark:text-gray-500 text-center">
          <GraduationCap size={32} className="text-gray-300 dark:text-gray-600" />
          <p>
            Silahkan pilih Tahun Ajaran (atau "Semua Tahun Ajaran") dulu untuk menampilkan daftar
            siswa lulus.
          </p>
        </div>
      ) : loading ? (
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
          onClose={() => setDetailData(null)}
        />
      )}
    </div>
  );
};

export default SiswaLulusTab;
