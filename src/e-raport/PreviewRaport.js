import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Printer, Download, RefreshCw } from "lucide-react";

// ✅ URUTAN MAPEL STANDAR
const getMapelOrder = (mapel) => {
  const order = [
    "Pendidikan Agama Islam dan Budi Pekerti",
    "Pendidikan Pancasila",
    "Bahasa Indonesia",
    "Matematika (Umum)",
    "Ilmu Pengetahuan Alam (IPA)",
    "Ilmu Pengetahuan Sosial (IPS)",
    "Bahasa Inggris",
    "Seni Tari",
    "Seni Rupa",
    "Pendidikan Jasmani, Olahraga dan Kesehatan",
    "Informatika",
    "Muatan Lokal Bahasa Daerah",
    "Prakarya",
    "Koding dan AI",
    "BP/BK",
  ];

  const index = order.indexOf(mapel);
  return index === -1 ? 999 : index; // Kalau ngga ada di list, taruh di belakang
};

function PreviewRaport({ semester, setSemester, academicYear }) {
  const [loading, setLoading] = useState(false);
  const [siswaList, setSiswaList] = useState([]);
  const [selectedSiswaId, setSelectedSiswaId] = useState("");
  const [siswaData, setSiswaData] = useState(null);
  const [nilaiData, setNilaiData] = useState([]);
  const [kelasInfo, setKelasInfo] = useState(null);
  const [schoolSettings, setSchoolSettings] = useState({});
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Ambil classId dari localStorage
  const [classId, setClassId] = useState("");
  const [isWaliKelas, setIsWaliKelas] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Load user dan kelas saat component mount
  useEffect(() => {
    loadUserAndClass();
  }, []);

  // Load daftar siswa saat classId tersedia
  useEffect(() => {
    console.log("📄 useEffect classId triggered, classId:", classId);
    if (classId) {
      console.log("✅ classId ada, memanggil loadSiswaList()");
      loadSiswaList();
      loadSchoolSettings();
    } else {
      console.log("⚠️ classId masih kosong");
    }
  }, [classId]);

  // Load preview saat siswa dan semester dipilih
  useEffect(() => {
    if (selectedSiswaId && semester && academicYear) {
      loadPreviewData();
    }
  }, [selectedSiswaId, semester, academicYear]);

  // Fungsi untuk load user dan classId
  const loadUserAndClass = async () => {
    try {
      console.log("🔍 DEBUG: Mulai load user dan class");

      const sessionData = localStorage.getItem("userSession");
      console.log("📦 Session Data:", sessionData);

      if (!sessionData) {
        throw new Error("Session tidak ditemukan. Silakan login ulang.");
      }

      const userData = JSON.parse(sessionData);
      console.log("👤 User Data:", userData);

      const homeroomClassId = userData.homeroom_class_id;
      console.log("🏫 Homeroom Class ID:", homeroomClassId);

      if (!homeroomClassId) {
        throw new Error("Tidak ditemukan data wali kelas.");
      }

      // Validasi kelas
      const { data: classData, error: classError } = await supabase
        .from("classes")
        .select("id, grade, is_active")
        .eq("id", homeroomClassId)
        .eq("is_active", true)
        .single();

      console.log("📊 Class Data:", classData);
      console.log("❌ Class Error:", classError);

      if (classError || !classData) {
        throw new Error(`Kelas tidak ditemukan atau tidak aktif.`);
      }

      console.log("✅ Setting classId:", homeroomClassId);
      setClassId(homeroomClassId);
      setIsWaliKelas(true);
    } catch (error) {
      console.error("❌ Error loading user:", error);
      setErrorMessage(error.message);
      setIsWaliKelas(false);
    }
  };

  const loadSiswaList = async () => {
    console.log("🔍 DEBUG: loadSiswaList dipanggil dengan classId:", classId);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name, nis")
        .eq("class_id", classId)
        .eq("is_active", true)
        .order("full_name");

      console.log("📊 Siswa Data:", data);
      console.log("❌ Siswa Error:", error);

      if (error) throw error;

      setSiswaList(data || []);
      console.log("✅ Siswa List berhasil di-set, jumlah:", data?.length || 0);

      // Load kelas info
      const { data: kelas } = await supabase
        .from("classes")
        .select("grade, id")
        .eq("id", classId)
        .single();

      console.log("🏫 Kelas Info:", kelas);
      setKelasInfo(kelas);
    } catch (error) {
      console.error("❌ Error loading siswa:", error);
    } finally {
      setLoading(false);
      console.log("✅ Loading siswa selesai");
    }
  };

  const loadSchoolSettings = async () => {
    const { data } = await supabase.from("school_settings").select("*");
    const settings = {};
    data?.forEach((item) => {
      settings[item.setting_key] = item.setting_value;
    });
    setSchoolSettings(settings);
  };

  const loadPreviewData = async () => {
    setLoadingPreview(true);
    try {
      // Load siswa data (hanya siswa aktif)
      const { data: siswa, error: siswaError } = await supabase
        .from("students")
        .select("*")
        .eq("id", selectedSiswaId)
        .eq("is_active", true)
        .single();

      if (siswaError) throw new Error("Siswa tidak ditemukan atau tidak aktif");

      // Load nilai data - COBA FINALIZED DULU (hanya siswa aktif)
      let { data: nilai } = await supabase
        .from("nilai_eraport")
        .select(
          `*, nilai_eraport_detail(*, tujuan_pembelajaran(*)), students!inner(is_active)`
        )
        .eq("student_id", selectedSiswaId)
        .eq("class_id", classId)
        .eq("academic_year_id", academicYear?.id)
        .eq("semester", semester)
        .eq("is_finalized", true)
        .eq("students.is_active", true);
      // ✅ HAPUS .order("mata_pelajaran") - nanti sort manual

      console.log("📊 Nilai Finalized:", nilai?.length || 0);

      // FALLBACK: Kalau ngga ada yang finalized, ambil semua (termasuk draft, tapi tetap siswa aktif)
      if (!nilai || nilai.length === 0) {
        console.log("⚠️ Tidak ada nilai finalized, coba ambil semua data...");

        const { data: nilaiAll } = await supabase
          .from("nilai_eraport")
          .select(
            `*, nilai_eraport_detail(*, tujuan_pembelajaran(*)), students!inner(is_active)`
          )
          .eq("student_id", selectedSiswaId)
          .eq("class_id", classId)
          .eq("academic_year_id", academicYear?.id)
          .eq("semester", semester)
          .eq("students.is_active", true);
        // ✅ HAPUS .order("mata_pelajaran") - nanti sort manual

        nilai = nilaiAll;
        console.log("📊 Nilai Total (termasuk draft):", nilai?.length || 0);
      }

      // ✅ SORT berdasarkan urutan mapel standar
      const sortedNilai = (nilai || []).sort((a, b) => {
        return (
          getMapelOrder(a.mata_pelajaran) - getMapelOrder(b.mata_pelajaran)
        );
      });

      console.log("✅ Nilai sudah disort berdasarkan urutan mapel standar");

      setSiswaData(siswa);
      setNilaiData(sortedNilai);
    } catch (err) {
      console.error("Error loading preview:", err);
      alert("Gagal memuat data: " + err.message);
    } finally {
      setLoadingPreview(false);
    }
  };

  const getFase = (kelasNum) => {
    if (kelasNum <= 2) return "A";
    if (kelasNum <= 4) return "B";
    if (kelasNum <= 6) return "C";
    return "D";
  };

  const generateCapaianKompetensi = (nilaiItem) => {
    const tercapai = [];
    const peningkatan = [];

    nilaiItem.nilai_eraport_detail?.forEach((detail) => {
      if (detail.status_tercapai === true && detail.tujuan_pembelajaran) {
        tercapai.push(detail.tujuan_pembelajaran.deskripsi_tp);
      } else if (
        detail.status_tercapai === false &&
        detail.tujuan_pembelajaran
      ) {
        peningkatan.push(detail.tujuan_pembelajaran.deskripsi_tp);
      }
    });

    let text = "";
    if (tercapai.length > 0) {
      text += `Mencapai Kompetensi dengan sangat baik dalam hal ${tercapai.join(
        ", "
      )}.`;
    }
    if (peningkatan.length > 0) {
      if (text) text += " ";
      text += `Perlu peningkatan dalam hal ${peningkatan.join(", ")}.`;
    }
    return text || "-";
  };

  const handlePrint = () => {
    window.print();
  };

  const fase = kelasInfo ? getFase(parseInt(kelasInfo.grade)) : "D";

  // Handle error message
  if (errorMessage) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-lg shadow">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-red-600 dark:text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          Akses Terbatas
        </h3>
        <p className="text-gray-600 dark:text-gray-400">{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Form Filter */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pilih Siswa */}
          <div>
            <label className="block font-semibold mb-2 text-gray-800 dark:text-gray-200">
              Pilih Siswa
            </label>
            <select
              value={selectedSiswaId}
              onChange={(e) => setSelectedSiswaId(e.target.value)}
              disabled={loading || !classId}
              className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-medium focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed">
              <option value="">-- Pilih Siswa --</option>
              {siswaList.map((siswa) => (
                <option key={siswa.id} value={siswa.id}>
                  {siswa.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Pilih Semester */}
          <div>
            <label className="block font-semibold mb-2 text-gray-800 dark:text-gray-200">
              Semester
            </label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-medium focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400">
              <option value="">-- Pilih Semester --</option>
              <option value="1">Semester Ganjil</option>
              <option value="2">Semester Genap</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loadingPreview && (
        <div className="text-center py-12">
          <div className="inline-flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 dark:border-blue-400 mb-3"></div>
            <p className="text-gray-700 dark:text-gray-300">
              Memuat preview raport...
            </p>
          </div>
        </div>
      )}

      {/* Preview Content */}
      {!loadingPreview && siswaData && semester && (
        <>
          {/* Action Bar */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-4 print:hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Preview Raport - {siswaData.full_name}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  NIS: {siswaData.nis} • Semester {semester} •{" "}
                  {academicYear?.year || "2025/2026"}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={loadPreviewData}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                  <RefreshCw size={18} />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Raport Preview */}
          <div
            id="preview-content"
            className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 md:p-8 print:shadow-none print:p-0">
            {/* Header Info */}
            <div className="mb-6 print:mb-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                <div className="flex">
                  <span className="font-medium w-32">Nama</span>
                  <span className="mx-2">:</span>
                  <span className="font-bold uppercase">
                    {siswaData.full_name}
                  </span>
                </div>
                <div className="flex">
                  <span className="font-medium w-32">Kelas</span>
                  <span className="mx-2">:</span>
                  <span className="font-bold">Kelas {kelasInfo?.grade}</span>
                </div>

                <div className="flex">
                  <span className="font-medium w-32">NIS</span>
                  <span className="mx-2">:</span>
                  <span>{siswaData.nis || "-"}</span>
                </div>
                <div className="flex">
                  <span className="font-medium w-32">Fase</span>
                  <span className="mx-2">:</span>
                  <span>{fase}</span>
                </div>

                <div className="flex">
                  <span className="font-medium w-32">Nama Sekolah</span>
                  <span className="mx-2">:</span>
                  <span>
                    {schoolSettings.school_name || "SMP MUSLIMIN CILILIN"}
                  </span>
                </div>
                <div className="flex">
                  <span className="font-medium w-32">Semester</span>
                  <span className="mx-2">:</span>
                  <span>{semester === "1" ? "1 (Ganjil)" : "2 (Genap)"}</span>
                </div>

                <div className="flex">
                  <span className="font-medium w-32">Alamat</span>
                  <span className="mx-2">:</span>
                  <span>
                    {schoolSettings.school_address || "Jl. Raya Warungawi"}
                  </span>
                </div>
                <div className="flex">
                  <span className="font-medium w-32">Tahun Pelajaran</span>
                  <span className="mx-2">:</span>
                  <span>{academicYear?.year || "2025/2026"}</span>
                </div>
              </div>
            </div>

            {/* Judul */}
            <div className="text-center mb-6 print:mb-4">
              <h2 className="text-xl font-bold border-b-2 border-gray-800 dark:border-gray-600 pb-2 print:pb-1">
                LAPORAN HASIL BELAJAR
              </h2>
            </div>

            {/* Tabel Nilai */}
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full border-collapse border border-gray-300 dark:border-gray-700 print:border-black">
                <thead>
                  <tr className="bg-red-700 dark:bg-red-900 text-white print:bg-gray-800">
                    <th className="border border-red-800 dark:border-red-950 p-2 w-12 text-center print:border-black print:p-1">
                      No
                    </th>
                    <th className="border border-red-800 dark:border-red-950 p-2 w-64 text-center print:border-black print:p-1">
                      Mata Pelajaran
                    </th>
                    <th className="border border-red-800 dark:border-red-950 p-2 w-24 text-center print:border-black print:p-1">
                      Nilai Akhir
                    </th>
                    <th className="border border-red-800 dark:border-red-950 p-2 text-center print:border-black print:p-1">
                      Capaian Kompetensi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {nilaiData && nilaiData.length > 0 ? (
                    nilaiData.map((nilai, idx) => (
                      <tr
                        key={nilai.id || idx}
                        className={
                          idx % 2 === 0
                            ? "bg-red-50/30 dark:bg-gray-800/50 print:bg-gray-100"
                            : "bg-white dark:bg-gray-900"
                        }>
                        <td className="border border-gray-300 dark:border-gray-700 p-2 text-center font-medium print:border-black print:p-1">
                          {idx + 1}
                        </td>
                        <td className="border border-gray-300 dark:border-gray-700 p-2 font-medium print:border-black print:p-1">
                          {nilai.mata_pelajaran}
                        </td>
                        <td className="border border-gray-300 dark:border-gray-700 p-2 text-center font-bold print:border-black print:p-1">
                          {nilai.nilai_akhir || "-"}
                        </td>
                        <td className="border border-gray-300 dark:border-gray-700 p-2 text-sm print:border-black print:p-1">
                          {nilai.deskripsi_capaian ||
                            generateCapaianKompetensi(nilai) ||
                            "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="4"
                        className="border border-gray-300 dark:border-gray-700 p-4 text-center text-gray-500 dark:text-gray-400 print:border-black print:p-2">
                        Belum ada data nilai untuk semester ini
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Info Footer */}
            {nilaiData && nilaiData.length > 0 && (
              <div className="mt-6 print:mt-4 text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg print:hidden">
                <p className="font-medium">
                  ℹ️ Ini Adalah Preview Tabel Nilai Saja. Untuk Mencetak Raport
                  Lengkap Dengan Kehadiran, Catatan, Dan Tanda Tangan, Gunakan
                  Menu <strong>Cetak Raport</strong>.
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Empty State */}
      {!loadingPreview && !siswaData && selectedSiswaId && semester && (
        <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-lg shadow">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-400 dark:text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            Data Tidak Ditemukan
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Tidak ada data raport untuk siswa dan semester yang dipilih.
          </p>
        </div>
      )}

      {/* Placeholder State */}
      {!loadingPreview && !selectedSiswaId && (
        <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-lg shadow">
          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            Preview Raport
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Pilih siswa dan semester untuk melihat preview raport
          </p>
        </div>
      )}
    </div>
  );
}

export default PreviewRaport;
