// 📁 GradesKatrol.js - VERSI FLEXIBLE NO LOCK (REVISED) dengan Academic Service
// ✅ REVISI: Hanya katrol Nilai Akhir dengan bobot baru (40-30-30)
import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import {
  Calculator,
  Download,
  AlertCircle,
  CheckCircle,
  Loader,
  TrendingUp,
  Eye,
  Save,
  Zap,
  X,
  Calendar,
  GraduationCap,
  BookOpen,
  Users,
  Edit,
  RefreshCw,
} from "lucide-react";

// ✅ IMPORT DARI FILE LAIN
import KatrolTable from "./KatrolTable";
import {
  calculateKatrolValue,
  organizeGradesByStudent,
  calculateMinMaxKelas,
  prosesKatrol as prosesKatrolUtils,
  formatDataForDatabase,
  exportToExcel,
  validateBeforeKatrol,
  formatNilaiDisplay,
  calculateClassStatistics,
} from "./Utils";

// ✅ IMPORT ACADEMIC YEAR SERVICE
import {
  getActiveAcademicInfo,
  getActiveSemester,
  getActiveYearString,
  getActiveAcademicYearId,
  applyAcademicFilters,
} from "../../services/academicYearService";

// 🎨 CUSTOM STYLES untuk animasi loading
const customStyles = `
  @keyframes scale-in {
    0% {
      opacity: 0;
      transform: scale(0.9);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  @keyframes progress {
    0% {
      width: 0%;
    }
    100% {
      width: 100%;
    }
  }
  
  .animate-scale-in {
    animation: scale-in 0.3s ease-out;
  }
  
  .animate-progress {
    animation: progress 2s ease-in-out infinite;
  }
  
  /* ✅ FIX DROPDOWN Z-INDEX - TAMBAH INI */
  select {
    z-index: 1 !important;
    position: relative !important;
  }
`;

// 🎨 HELPER COMPONENT
const InfoRow = ({ label, value }) => (
  <div className="flex justify-between items-center">
    <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
    <span className="text-sm font-semibold text-gray-900 dark:text-white">{value}</span>
  </div>
);

// 🎨 CUSTOM CONFIRMATION MODAL COMPONENT
const ConfirmationModal = ({ isOpen, onConfirm, onCancel, type = "save", data = {} }) => {
  if (!isOpen) return null;

  const isSaveConfirm = type === "save";
  const isOverwriteWarning = type === "overwrite";

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform animate-scale-in">
        {/* Header */}
        <div
          className={`px-6 py-5 ${
            isSaveConfirm
              ? "bg-gradient-to-r from-purple-600 to-indigo-600"
              : "bg-gradient-to-r from-orange-500 to-red-500"
          }`}
        >
          <div className="flex items-center gap-3 text-white">
            <div className="bg-white/20 p-2 rounded-lg">
              {isSaveConfirm ? <Save className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
            </div>
            <h3 className="text-xl font-semibold">
              {isSaveConfirm ? "Konfirmasi Penyimpanan" : "Peringatan Data Sudah Ada!"}
            </h3>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {isSaveConfirm ? (
            <>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Anda akan menyimpan data katrol dengan detail:
              </p>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 space-y-2.5 mb-4">
                <InfoRow label="Tahun Ajaran" value={data.academicYear} />
                <InfoRow label="Semester" value={data.semester} />
                <InfoRow label="Kelas" value={data.classId} />
                <InfoRow label="Mata Pelajaran" value={data.subject} />
                <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Siswa</span>
                  <span className="text-base font-bold text-purple-600 dark:text-purple-400">
                    {data.totalStudents}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                Data akan disimpan ke database. Jika sudah ada, akan ditimpa.
              </p>
            </>
          ) : (
            <>
              <div className="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500 p-4 mb-4">
                <p className="text-sm text-orange-800 dark:text-orange-300 font-medium">
                  Ditemukan <span className="font-bold">{data.existingCount}</span> data katrol yang
                  sudah tersimpan
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 space-y-2.5 mb-4">
                <InfoRow label="Kelas" value={data.classId} />
                <InfoRow label="Mata Pelajaran" value={data.subject} />
                <InfoRow label="Tahun Ajaran" value={data.academicYear} />
                <InfoRow label="Semester" value={data.semester} />
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                  ⚠️ Data lama akan dihapus dan diganti dengan data baru
                </p>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Apakah Anda yakin ingin melanjutkan?
              </p>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 text-white rounded-lg font-medium transition-colors ${
              isSaveConfirm
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                : "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            }`}
          >
            {isSaveConfirm ? "Ya, Simpan" : "Ya, Timpa Data"}
          </button>
        </div>
      </div>
    </div>
  );
};

const GradesKatrol = ({
  user,
  selectedClass,
  selectedSubject,
  academicYear,
  semester,
  teacherId: teacherIdProp,
  onClose,
}) => {
  const teacherId = teacherIdProp || user?.teacher_id || user?.id;

  console.log("🚀 GradesKatrol mounted with:", {
    teacherId,
    selectedClass,
    selectedSubject,
    academicYear,
    semester,
  });

  // ✅ STATE UNTUK ACADEMIC INFO
  const [academicInfo, setAcademicInfo] = useState(null);
  const [loadingAcademic, setLoadingAcademic] = useState(true);

  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [dataNilai, setDataNilai] = useState([]);
  const [hasilKatrol, setHasilKatrol] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  // ✅ REVISI 1: TAMBAH STATE minNilaiAkhir dan maxNilaiAkhir
  const [minNilaiAkhir, setMinNilaiAkhir] = useState(null);
  const [maxNilaiAkhir, setMaxNilaiAkhir] = useState(null);

  // ✅ STATE KKM FLEXIBLE (TANPA LOCK)
  const [kkm, setKkm] = useState(75);
  const [nilaiMaksimal, setNilaiMaksimal] = useState(100);
  const [kkmSettings, setKkmSettings] = useState(null); // Untuk tracking data yang sudah disimpan
  const [isSavingKkm, setIsSavingKkm] = useState(false);

  const [message, setMessage] = useState({ text: "", type: "" });

  // State untuk modal konfirmasi
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState(null);

  // State untuk filter - ✅ DIUBAH: Gunakan nilai dari academicInfo
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedSubjectState, setSelectedSubjectState] = useState(selectedSubject || "");
  const [selectedClassId, setSelectedClassId] = useState(selectedClass || "");

  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const academicYears = []; // Dummy to prevent legacy reference errors

  // ✅ FUNGSI HELPER UNTUK MENDAPATKAN ACADEMIC_YEAR_ID DENGAN FALLBACK
  const getValidAcademicYearId = () => {
    // Jika ada academicInfo dan yearId, gunakan itu
    if (academicInfo?.yearId) {
      return academicInfo.yearId;
    }

    // Jika tidak ada, coba dapatkan dari service langsung
    // atau return null untuk menggunakan fallback query
    return null;
  };

  // ✅ FUNGSI UNTUK MENDAPATKAN FALLBACK QUERY JIKA TIDAK ADA academic_year_id
  const getFallbackQuery = (baseQuery, tableName) => {
    const academicYearId = getValidAcademicYearId() || "ae60df26-f11b-412a-985f-ad12065f6d0f";

    // Jika tidak ada academic_year_id, gunakan kombinasi academic_year + semester
    if (!academicYearId && selectedAcademicYear && selectedSemester) {
      console.log(
        `⚠️ Using fallback query for ${tableName}: academic_year=${selectedAcademicYear}, semester=${selectedSemester}`
      );
      return baseQuery
        .eq("academic_year", selectedAcademicYear)
        .eq("semester", parseInt(selectedSemester)); // ✅ Parse ke integer!
    }

    // Jika ada academic_year_id, filter by academic_year_id saja
    if (academicYearId) {
      console.log(`✅ Using academic_year_id for ${tableName}: ${academicYearId}`);
      return baseQuery.eq("academic_year_id", academicYearId);
    }

    return baseQuery;
  };

  // ✅ LOAD ACADEMIC INFO SAAT COMPONENT MOUNT
  useEffect(() => {
    const loadAcademicInfo = async () => {
      try {
        setLoadingAcademic(true);
        const info = await getActiveAcademicInfo();
        console.log("✅ Academic Info loaded:", info);

        setAcademicInfo(info);

        // ✅ SET DEFAULT VALUES DARI ACADEMIC INFO
        if (info) {
          setSelectedAcademicYear(info.year || "");
          setSelectedSemester(info.activeSemester?.toString() || "1");
        }

        // Jika ada props yang dikirim, prioritaskan props
        if (academicYear) {
          setSelectedAcademicYear(academicYear);
        }
        if (semester) {
          setSelectedSemester(semester.toString());
        }
      } catch (error) {
        console.error("❌ Error loading academic info:", error);
        setMessage({
          text: "Gagal memuat informasi tahun akademik. Mohon refresh halaman.",
          type: "error",
        });

        // Fallback ke hardcode jika error
        setSelectedAcademicYear("2025/2026");
        setSelectedSemester("1");
      } finally {
        setLoadingAcademic(false);
        setIsInitialLoad(false);
      }
    };

    loadAcademicInfo();
  }, [academicYear, semester]);

  // Debug state changes
  useEffect(() => {
    console.log("🎯 STATE UPDATE:", {
      academicInfo,
      selectedAcademicYear,
      selectedSemester,
      selectedSubjectState,
      selectedClassId,
      subjectsLength: subjects.length,
      classesLength: classes.length,
      loading,
      processing,
    });
  }, [
    academicInfo,
    selectedAcademicYear,
    selectedSemester,
    selectedSubjectState,
    selectedClassId,
    subjects,
    classes,
    loading,
    processing,
  ]);

  // Fetch Subjects
  useEffect(() => {
    console.log("🔄 fetchSubjects TRIGGERED", {
      teacherId,
      academicYear: selectedAcademicYear,
      semester: parseInt(selectedSemester),
    });

    const fetchSubjects = async () => {
      if (!teacherId || !selectedAcademicYear) {
        console.log("⚠️ Missing data:", {
          teacherId,
          academicYear: selectedAcademicYear,
        });
        setSubjects([]);
        return;
      }

      console.log("📡 Fetching subjects...");
      try {
        // ✅ GUNAKAN applyAcademicFilters
        let query = supabase
          .from("teacher_assignments")
          .select("subject")
          .eq("teacher_id", teacherId)
          .eq("academic_year", selectedAcademicYear);

        // Apply semester filter
        if (selectedSemester) {
          query = query.eq("semester", selectedSemester);
        }

        const { data, error } = await query;

        console.log("✅ Subjects fetched:", data?.length || 0);

        if (error) {
          console.error("Error fetching subjects:", error);
          setMessage({
            text: "Error: Gagal mengambil mata pelajaran",
            type: "error",
          });
          return;
        }

        if (!data || data.length === 0) {
          setSubjects([]);
          // ✅ TAMPILKAN INFO YANG LEBIH INFORMATIF
          if (academicInfo) {
            setMessage({
              text: `Tidak ada mata pelajaran untuk tahun ${selectedAcademicYear} semester ${academicInfo.semesterText}`,
              type: "error",
            });
          } else {
            setMessage({
              text: `Tidak ada mata pelajaran untuk tahun ${selectedAcademicYear} semester ${selectedSemester}`,
              type: "error",
            });
          }
          return;
        }

        const uniqueSubjects = [...new Set(data.map((item) => item.subject))];
        console.log("📊 Unique subjects:", uniqueSubjects);
        setSubjects(uniqueSubjects);
      } catch (error) {
        console.error("Error in fetchSubjects:", error);
        setMessage({ text: "Error: Terjadi kesalahan sistem", type: "error" });
      }
    };

    fetchSubjects();
  }, [teacherId, selectedAcademicYear, selectedSemester]);

  // Fetch Classes
  useEffect(() => {
    console.log("🔄 fetchClasses TRIGGERED", {
      subject: selectedSubjectState,
      teacherId,
      academicYear: selectedAcademicYear,
      semester: parseInt(selectedSemester),
    });

    const fetchClasses = async () => {
      if (!selectedSubjectState || !teacherId || !selectedAcademicYear) {
        console.log("⚠️ Missing data for classes");
        setClasses([]);
        return;
      }

      console.log("📡 Fetching classes...");
      try {
        // ✅ GUNAKAN applyAcademicFilters
        let query = supabase
          .from("teacher_assignments")
          .select("class_id")
          .eq("teacher_id", teacherId)
          .ilike("subject", selectedSubjectState)
          .eq("academic_year", selectedAcademicYear);

        // Apply semester filter
        if (selectedSemester) {
          query = query.eq("semester", selectedSemester);
        }

        const { data: assignmentData, error: assignmentError } = await query;

        if (assignmentError) throw assignmentError;

        if (!assignmentData?.length) {
          console.log("📊 No classes found for this subject");
          setClasses([]);
          setMessage({
            text: "Tidak ada kelas untuk mata pelajaran ini",
            type: "error",
          });
          return;
        }

        const classIds = assignmentData.map((item) => item.class_id);
        console.log("📊 Class IDs:", classIds);

        const { data: classData, error: classError } = await supabase
          .from("classes")
          .select("id, grade")
          .in("id", classIds)
          .eq("academic_year", selectedAcademicYear);

        if (classError) throw classError;

        const formattedClasses = classData.map((cls) => ({
          id: cls.id,
          grade: cls.grade,
          displayName: `Kelas ${cls.id}`,
        }));

        console.log("📊 Formatted classes:", formattedClasses);
        setClasses(formattedClasses);
      } catch (error) {
        console.error("Error fetching classes:", error);
        setMessage({
          text: "Error: Gagal mengambil data kelas - " + error.message,
          type: "error",
        });
      }
    };

    fetchClasses();
  }, [selectedSubjectState, teacherId, selectedAcademicYear, selectedSemester]);

  // ✅ LOAD KKM SETTINGS dari database (TANPA LOCK)
  const loadKkmSettings = async () => {
    if (!selectedSubjectState || !selectedClassId) {
      setKkmSettings(null);
      return;
    }

    try {
      // ✅ GUNAKAN applyAcademicFilters
      let query = supabase
        .from("grades_katrol_settings")
        .select("*")
        .eq("mata_pelajaran_id", selectedSubjectState)
        .eq("kelas_id", selectedClassId);

      const academicYearId = getValidAcademicYearId() || "ae60df26-f11b-412a-985f-ad12065f6d0f";
      if (academicYearId) {
        // Jika ada yearId, filter juga berdasarkan itu untuk akurasi
        query = query.eq("academic_year_id", academicYearId);
      }

      const { data, error } = await query.single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading KKM settings:", error);
        return;
      }

      if (data) {
        // ✅ LOAD TANPA LOCK - selalu bisa diedit
        setKkm(data.kkm);
        setNilaiMaksimal(data.nilai_maksimal);
        setKkmSettings(data);
        showMessage(
          `✅ Setting KKM dimuat: KKM=${data.kkm}, Maks=${data.nilai_maksimal}`,
          "success"
        );
      } else {
        // ✅ BELUM ADA - GUNAKAN DEFAULT
        setKkmSettings(null);
        showMessage("ℹ️ Belum ada setting KKM. Silakan atur dan simpan.", "info");
      }
    } catch (error) {
      console.error("Error in loadKkmSettings:", error);
      showMessage("Gagal memuat setting KKM: " + error.message, "error");
    }
  };

  // ✅ TAMBAH useEffect INI (setelah useEffect yang lain)
  useEffect(() => {
    if (selectedSubjectState && selectedClassId) {
      loadKkmSettings();
    } else {
      // Reset jika belum pilih
      setKkmSettings(null);
    }
  }, [selectedSubjectState, selectedClassId, academicInfo]);

  // ✅ SAVE/UPDATE KKM SETTINGS ke database (FLEXIBLE)
  const saveKkmSettings = async () => {
    // Validasi
    if (!selectedSubjectState || !selectedClassId) {
      showMessage("Pilih kelas dan mata pelajaran terlebih dahulu!", "error");
      return;
    }

    if (kkm <= 0 || nilaiMaksimal <= 0) {
      showMessage("KKM dan Nilai Maksimal harus lebih dari 0!", "error");
      return;
    }

    if (kkm >= nilaiMaksimal) {
      showMessage("KKM harus lebih kecil dari Nilai Maksimal!", "error");
      return;
    }

    setIsSavingKkm(true);
    try {
      const settingsData = {
        mata_pelajaran_id: selectedSubjectState,
        kelas_id: selectedClassId,
        kkm: kkm,
        nilai_maksimal: nilaiMaksimal,
        updated_at: new Date().toISOString(),
        updated_by: user?.id || teacherId,
      };

      // ✅ TAMBAH ACADEMIC YEAR INFO
      if (academicInfo) {
        settingsData.academic_year = academicInfo.year;
        settingsData.semester = academicInfo.semester;
        const academicYearId = getValidAcademicYearId() || "ae60df26-f11b-412a-985f-ad12065f6d0f";
        if (academicYearId) {
          settingsData.academic_year_id = academicYearId;
        }
      }

      let result;

      // ✅ UPDATE jika sudah ada, INSERT jika baru
      if (kkmSettings) {
        const { data, error } = await supabase
          .from("grades_katrol_settings")
          .update(settingsData)
          .eq("id", kkmSettings.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
        showMessage("✅ Pengaturan KKM berhasil diperbarui!", "success");
      } else {
        const { data, error } = await supabase
          .from("grades_katrol_settings")
          .insert(settingsData)
          .select()
          .single();

        if (error) throw error;
        result = data;
        showMessage("✅ Pengaturan KKM berhasil disimpan!", "success");
      }

      // ✅ UPDATE STATE TANPA LOCK
      setKkmSettings(result);
    } catch (error) {
      console.error("Error saving KKM settings:", error);

      // Handle duplicate constraint dengan upsert
      if (error.code === "23505") {
        try {
          const upsertData = {
            mata_pelajaran_id: selectedSubjectState,
            kelas_id: selectedClassId,
            kkm: kkm,
            nilai_maksimal: nilaiMaksimal,
            updated_at: new Date().toISOString(),
            updated_by: user?.id || teacherId,
          };

          if (academicInfo) {
            upsertData.academic_year = academicInfo.year;
            upsertData.semester = academicInfo.semester;
            const academicYearId =
              getValidAcademicYearId() || "ae60df26-f11b-412a-985f-ad12065f6d0f";
            if (academicYearId) {
              upsertData.academic_year_id = academicYearId;
            }
          }

          const { data, error: upsertError } = await supabase
            .from("grades_katrol_settings")
            .upsert(upsertData)
            .select()
            .single();

          if (upsertError) throw upsertError;

          setKkmSettings(data);
          showMessage("✅ Pengaturan KKM berhasil diperbarui!", "success");
        } catch (upsertError) {
          console.error("Upsert error:", upsertError);
          showMessage("Gagal menyimpan setting KKM: " + upsertError.message, "error");
        }
      } else {
        showMessage("Gagal menyimpan setting KKM: " + error.message, "error");
      }
    } finally {
      setIsSavingKkm(false);
    }
  };

  // ✅ HAPUS KKM SETTINGS (optional)
  const resetKkmSettings = async () => {
    if (!kkmSettings) return;

    const confirm = window.confirm(
      "Yakin ingin menghapus pengaturan KKM?\n\n" +
        "Data akan dihapus dari database dan KKM akan dikembalikan ke default."
    );

    if (!confirm) return;

    try {
      const { error } = await supabase
        .from("grades_katrol_settings")
        .delete()
        .eq("id", kkmSettings.id);

      if (error) throw error;

      // Reset ke default
      setKkm(75);
      setNilaiMaksimal(100);
      setKkmSettings(null);
      showMessage("✅ Pengaturan KKM berhasil dihapus", "success");
    } catch (error) {
      console.error("Error deleting KKM settings:", error);
      showMessage("Gagal menghapus setting KKM: " + error.message, "error");
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 5000);
  };

  // ✅ FETCH DATA NILAI (dengan Utils.js) - REVISI: Update dengan bobot baru
  const fetchDataNilai = async () => {
    if (!selectedClassId || !selectedSubjectState || !selectedAcademicYear) {
      showMessage("Pilih kelas, mata pelajaran, dan tahun ajaran terlebih dahulu", "error");
      return;
    }

    setLoading(true);
    try {
      // 1️⃣ CEK DULU: Ada data di grades_katrol?
      // ✅ FIX 1: Query grades_katrol dengan fallback jika academic_year_id tidak tersedia
      const academicYearId = getValidAcademicYearId() || "ae60df26-f11b-412a-985f-ad12065f6d0f";

      let katrolQuery = supabase
        .from("grades_katrol")
        .select(`*`)
        .eq("class_id", selectedClassId)
        .ilike("subject", selectedSubjectState)
        .eq("semester", parseInt(selectedSemester)); // ✅ TAMBAH INI!

      // Gunakan academic_year_id jika tersedia, jika tidak gunakan fallback
      if (academicYearId) {
        katrolQuery = katrolQuery.eq("academic_year_id", academicYearId);
        console.log("✅ Using academic_year_id for katrol query:", academicYearId);
      } else {
        // Fallback ke academic_year + semester
        katrolQuery = getFallbackQuery(katrolQuery, "grades_katrol");
        console.log("⚠️ Using fallback query for grades_katrol");
      }

      const { data: katrolData, error: katrolError } = await katrolQuery;

      if (katrolError) throw katrolError;

      // 2️⃣ KALAU ADA DATA KATROL, LOAD ITU!
      if (katrolData && katrolData.length > 0) {
        console.log(`✅ Ditemukan ${katrolData.length} data KATROL (sudah diproses)`);

        // ✅ FIX: Langsung pakai data dari grades_katrol (sudah ada student_name & student_nis)
        const formattedKatrol = katrolData.map((item) => ({
          student_id: item.student_id,
          nis: item.student_nis || "-",
          nama_siswa: item.student_name || "-",
          // ✅ NILAI ASLI
          nh1: item.nh1,
          nh2: item.nh2,
          nh3: item.nh3,
          rata_nh: item.rata_nh,
          psts: item.psts,
          psas: item.psas,
          nilai_akhir: item.nilai_akhir,
          // ✅ HANYA NILAI AKHIR YANG DIKATROL
          nilai_akhir_k: item.nilai_akhir_k,
          status: item.nilai_akhir_k >= item.kkm ? "Tuntas" : "Belum Tuntas",
        }));

        // ✅ SORT BY NAMA
        formattedKatrol.sort((a, b) => a.nama_siswa.localeCompare(b.nama_siswa));

        // ✅ SET KE HASIL KATROL
        setHasilKatrol(formattedKatrol);
        setShowPreview(false);
        setDataNilai([]);

        showMessage(
          `✅ Berhasil memuat ${formattedKatrol.length} data nilai KATROL yang sudah tersimpan`,
          "success"
        );
        return;
      }

      // 3️⃣ KALAU BELUM ADA DATA KATROL, LOAD GRADES untuk preview
      console.log(`ℹ️ Tidak ada data katrol, memuat nilai ASLI...`);

      // ✅ FIX 2: Query students - hapus filter academic_year karena kolom itu tidak ada di tabel students
      let studentsQuery = supabase
        .from("students")
        .select("id, full_name, nis")
        .eq("class_id", selectedClassId)
        .eq("is_active", true)
        .order("full_name");

      const { data: studentsData, error: studentsError } = await studentsQuery;

      if (studentsError) throw studentsError;

      if (!studentsData || studentsData.length === 0) {
        showMessage(`Tidak ada siswa di kelas ${selectedClassId}`, "error");
        return;
      }

      let gradesQuery = supabase
        .from("grades")
        .select("*")
        .eq("class_id", selectedClassId)
        .ilike("subject", selectedSubjectState)
        .eq("semester", parseInt(selectedSemester)) // ✅ TAMBAH INI!
        .in("assignment_type", ["NH1", "NH2", "NH3", "PSTS", "PSAS"]);

      // Gunakan academic_year_id jika tersedia, jika tidak gunakan fallback
      if (academicYearId) {
        gradesQuery = gradesQuery.eq("academic_year_id", academicYearId);
        console.log("✅ Using academic_year_id for grades query:", academicYearId);
      } else {
        // Fallback ke academic_year + semester
        gradesQuery = getFallbackQuery(gradesQuery, "grades");
        console.log("⚠️ Using fallback query for grades");
      }

      const { data: gradesData, error: gradesError } = await gradesQuery;

      if (gradesError) throw gradesError;

      // ✅ REVISI: Hitung nilai_akhir dengan bobot baru (40-30-30)
      const previewData = studentsData.map((student) => {
        const studentGrades = gradesData?.filter((g) => g.student_id === student.id) || [];

        const nh1 =
          parseFloat(studentGrades.find((g) => g.assignment_type === "NH1")?.score) || null;
        const nh2 =
          parseFloat(studentGrades.find((g) => g.assignment_type === "NH2")?.score) || null;
        const nh3 =
          parseFloat(studentGrades.find((g) => g.assignment_type === "NH3")?.score) || null;
        const psts =
          parseFloat(studentGrades.find((g) => g.assignment_type === "PSTS")?.score) || null;
        const psas =
          parseFloat(studentGrades.find((g) => g.assignment_type === "PSAS")?.score) || null;

        // ✅ REVISI: Hitung dengan bobot baru (40-30-30)
        const rata_nh = nh1 && nh2 && nh3 ? (nh1 + nh2 + nh3) / 3 : null;
        const nilai_akhir =
          rata_nh && psts && psas ? rata_nh * 0.4 + psts * 0.3 + psas * 0.3 : null;

        return {
          student_id: student.id,
          nis: student.nis,
          nama_siswa: student.full_name,
          nh1,
          nh2,
          nh3,
          psts,
          psas,
          rata_nh,
          nilai_akhir,
        };
      });

      previewData.sort((a, b) => a.nama_siswa.localeCompare(b.nama_siswa));

      setDataNilai(previewData);
      setShowPreview(true);
      setHasilKatrol([]);

      showMessage(
        `✅ Berhasil memuat ${previewData.length} siswa (nilai ASLI - belum dikatrol)`,
        "success"
      );
    } catch (error) {
      console.error("❌ Error mengambil data:", error);
      showMessage(`Gagal memuat data: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // ✅ PROSES KATROL - REVISI: Hanya katrol Nilai Akhir dengan bobot baru
  const prosesKatrol = async () => {
    // ✅ VALIDASI SEDERHANA: Cek KKM sudah di-set
    if (!kkm || !nilaiMaksimal) {
      showMessage("⚠️ Silakan atur KKM dan Nilai Maksimal terlebih dahulu!", "error");
      return;
    }

    if (!selectedClassId || !selectedSubjectState || !selectedAcademicYear) {
      showMessage("Pilih kelas, mata pelajaran, dan tahun ajaran terlebih dahulu", "error");
      return;
    }

    if (kkm > nilaiMaksimal) {
      showMessage("KKM tidak boleh lebih besar dari Nilai Maksimal!", "error");
      return;
    }

    setProcessing(true);
    try {
      // ✅ Query students
      let studentsQuery = supabase
        .from("students")
        .select("id, full_name, nis")
        .eq("class_id", selectedClassId)
        .eq("is_active", true)
        .order("full_name");

      const { data: studentsData, error: studentsError } = await studentsQuery;

      if (studentsError) throw studentsError;

      // ✅ Query grades
      const academicYearId = getValidAcademicYearId() || "ae60df26-f11b-412a-985f-ad12065f6d0f";
      let gradesQuery = supabase
        .from("grades")
        .select("*")
        .eq("class_id", selectedClassId)
        .ilike("subject", selectedSubjectState)
        .eq("semester", parseInt(selectedSemester))
        .in("assignment_type", ["NH1", "NH2", "NH3", "PSTS", "PSAS"]);

      // Gunakan academic_year_id jika tersedia, jika tidak gunakan fallback
      if (academicYearId) {
        gradesQuery = gradesQuery.eq("academic_year_id", academicYearId);
      } else {
        // Fallback ke academic_year + semester
        gradesQuery = getFallbackQuery(gradesQuery, "grades");
        console.log("⚠️ Using fallback query for grades in prosesKatrol");
      }

      const { data: gradesData, error: gradesError } = await gradesQuery;

      if (gradesError) throw gradesError;

      // ✅ REVISI: Hitung Nilai Akhir untuk semua siswa dengan bobot baru
      const nilaiAkhirList = studentsData
        .map((student) => {
          const studentGrades = gradesData?.filter((g) => g.student_id === student.id) || [];

          const nh1 =
            parseFloat(studentGrades.find((g) => g.assignment_type === "NH1")?.score) || null;
          const nh2 =
            parseFloat(studentGrades.find((g) => g.assignment_type === "NH2")?.score) || null;
          const nh3 =
            parseFloat(studentGrades.find((g) => g.assignment_type === "NH3")?.score) || null;
          const psts =
            parseFloat(studentGrades.find((g) => g.assignment_type === "PSTS")?.score) || null;
          const psas =
            parseFloat(studentGrades.find((g) => g.assignment_type === "PSAS")?.score) || null;

          // ✅ Hitung dengan bobot baru (40-30-30)
          const rata_nh = nh1 && nh2 && nh3 ? (nh1 + nh2 + nh3) / 3 : null;
          const nilai_akhir =
            rata_nh && psts && psas ? rata_nh * 0.4 + psts * 0.3 + psas * 0.3 : null;

          return nilai_akhir;
        })
        .filter((n) => n !== null);

      if (nilaiAkhirList.length === 0) {
        showMessage("Tidak ada data nilai akhir yang valid untuk diproses", "error");
        return;
      }

      // ✅ Hitung min dan max Nilai Akhir
      const minNilaiAkhir = Math.min(...nilaiAkhirList);
      const maxNilaiAkhir = Math.max(...nilaiAkhirList);

      // ✅ Simpan min/max ke state
      setMinNilaiAkhir(minNilaiAkhir);
      setMaxNilaiAkhir(maxNilaiAkhir);

      console.log("📊 Min/Max Nilai Akhir:", { minNilaiAkhir, maxNilaiAkhir });

      // ✅ PROSES KATROL - HANYA NILAI AKHIR
      const hasil = studentsData.map((student) => {
        const studentGrades = gradesData?.filter((g) => g.student_id === student.id) || [];

        const nh1 =
          parseFloat(studentGrades.find((g) => g.assignment_type === "NH1")?.score) || null;
        const nh2 =
          parseFloat(studentGrades.find((g) => g.assignment_type === "NH2")?.score) || null;
        const nh3 =
          parseFloat(studentGrades.find((g) => g.assignment_type === "NH3")?.score) || null;
        const psts =
          parseFloat(studentGrades.find((g) => g.assignment_type === "PSTS")?.score) || null;
        const psas =
          parseFloat(studentGrades.find((g) => g.assignment_type === "PSAS")?.score) || null;

        // ✅ Hitung dengan bobot baru (40-30-30)
        const rata_nh = nh1 && nh2 && nh3 ? (nh1 + nh2 + nh3) / 3 : null;
        const nilai_akhir =
          rata_nh && psts && psas ? rata_nh * 0.4 + psts * 0.3 + psas * 0.3 : null;

        // ✅ KATROL HANYA NILAI AKHIR
        const nilai_akhir_k =
          nilai_akhir !== null && maxNilaiAkhir !== minNilaiAkhir
            ? kkm +
              ((nilai_akhir - minNilaiAkhir) / (maxNilaiAkhir - minNilaiAkhir)) *
                (nilaiMaksimal - kkm)
            : null;

        return {
          student_id: student.id,
          nis: student.nis,
          nama_siswa: student.full_name,
          nh1,
          nh2,
          nh3,
          rata_nh,
          psts,
          psas,
          nilai_akhir,
          nilai_akhir_k,
          status: nilai_akhir_k !== null && nilai_akhir_k >= kkm ? "Tuntas" : "Belum Tuntas",
        };
      });

      // ✅ SORT HASIL BERDASARKAN NAMA SISWA
      const sortedHasil = [...hasil].sort((a, b) => a.nama_siswa.localeCompare(b.nama_siswa));

      // Format untuk display
      const formattedHasil = sortedHasil.map((item) => ({
        student_id: item.student_id,
        nis: item.nis,
        nama_siswa: item.nama_siswa,
        nh1: item.nh1,
        nh2: item.nh2,
        nh3: item.nh3,
        psts: item.psts,
        psas: item.psas,
        rata_nh: item.rata_nh,
        nilai_akhir: item.nilai_akhir,
        nilai_akhir_k: item.nilai_akhir_k,
        status: item.status,
      }));

      setHasilKatrol(formattedHasil);
      setShowPreview(false);
      showMessage(`✅ Berhasil memproses katrol untuk ${formattedHasil.length} siswa`, "success");
    } catch (error) {
      console.error("❌ Error processing katrol:", error);
      showMessage("Gagal memproses katrol: " + error.message, "error");
    } finally {
      setProcessing(false);
    }
  };

  // ✅ SIMPAN KE DATABASE (dengan Elegant Modal) - REVISI: Hanya simpan kolom yang diperlukan
  const saveKatrolToDatabase = async () => {
    if (!hasilKatrol || hasilKatrol.length === 0) {
      showMessage("Tidak ada data katrol untuk disimpan", "error");
      return;
    }

    // ✅ GUNAKAN DATA DARI ACADEMIC INFO UNTUK DISPLAY
    const semesterDisplay = academicInfo?.activeSemesterText || `Semester ${selectedSemester}`;
    const yearDisplay = academicInfo?.year || selectedAcademicYear;

    // Simpan data untuk modal
    setPendingSaveData({
      academicYear: yearDisplay,
      semester: semesterDisplay,
      classId: selectedClassId,
      subject: selectedSubjectState,
      totalStudents: hasilKatrol.length,
    });

    // Tampilkan modal konfirmasi pertama
    setShowConfirmModal(true);
  };

  const handleFirstConfirm = async () => {
    setShowConfirmModal(false);
    setSaving(true);
    setMessage({ text: "", type: "" });

    try {
      // ✅ Query check existing data dengan fallback jika academic_year_id tidak tersedia
      const academicYearId = getValidAcademicYearId() || "ae60df26-f11b-412a-985f-ad12065f6d0f";

      let checkQuery = supabase
        .from("grades_katrol")
        .select("id")
        .eq("class_id", selectedClassId)
        .ilike("subject", selectedSubjectState)
        .eq("semester", parseInt(selectedSemester));

      // Gunakan academic_year_id jika tersedia, jika tidak gunakan fallback
      if (academicYearId) {
        checkQuery = checkQuery.eq("academic_year_id", academicYearId);
      } else {
        // Fallback ke academic_year + semester
        checkQuery = getFallbackQuery(checkQuery, "grades_katrol");
        console.log("⚠️ Using fallback query for check");
      }

      const { data: existingData, error: checkError } = await checkQuery;

      if (checkError) throw new Error(`Gagal mengecek data: ${checkError.message}`);

      setSaving(false);

      // Kalau ada data lama, tampilkan modal kedua
      if (existingData && existingData.length > 0) {
        setPendingSaveData((prev) => ({
          ...prev,
          existingCount: existingData.length,
        }));
        setShowOverwriteModal(true);
        return;
      }

      // Kalau belum ada data, langsung save
      await processSaveToDatabase();
    } catch (error) {
      setSaving(false);
      showMessage(`Gagal mengecek data: ${error.message}`, "error");
    }
  };

  const handleOverwriteConfirm = async () => {
    setShowOverwriteModal(false);
    await processSaveToDatabase();
  };

  // ✅ REVISI: processSaveToDatabase - Hanya simpan kolom yang diperlukan
  const processSaveToDatabase = async () => {
    setSaving(true);

    try {
      // ✅ Hapus data lama
      const academicYearId = getValidAcademicYearId() || "ae60df26-f11b-412a-985f-ad12065f6d0f";

      let deleteQuery = supabase
        .from("grades_katrol")
        .delete()
        .eq("class_id", selectedClassId)
        .ilike("subject", selectedSubjectState)
        .eq("semester", parseInt(selectedSemester));

      // Gunakan academic_year_id jika tersedia, jika tidak gunakan fallback
      if (academicYearId) {
        deleteQuery = deleteQuery.eq("academic_year_id", academicYearId);
      } else {
        // Fallback ke academic_year + semester
        deleteQuery = getFallbackQuery(deleteQuery, "grades_katrol");
        console.log("⚠️ Using fallback query for delete");
      }

      const { error: deleteError } = await deleteQuery;

      if (deleteError) throw new Error(`Gagal menghapus data lama: ${deleteError.message}`);

      // ✅ Format data untuk database - HANYA KOLOM YANG DIPERLUKAN
      const recordsToSave = hasilKatrol.map((item) => ({
        student_id: item.student_id,
        student_name: item.nama_siswa,
        student_nis: item.nis,
        class_id: selectedClassId,
        teacher_id: teacherId,
        subject: selectedSubjectState,
        academic_year: selectedAcademicYear,
        academic_year_id: academicYearId || null, // ✅ FIXED: tambah || null
        semester: parseInt(selectedSemester), // ✅ FIXED: tambah parseInt

        // ✅ NILAI ASLI
        nh1: item.nh1,
        nh2: item.nh2,
        nh3: item.nh3,
        rata_nh: item.rata_nh,
        psts: item.psts,
        psas: item.psas,
        nilai_akhir: item.nilai_akhir,

        // ✅ HANYA NILAI AKHIR YANG DIKATROL
        nilai_akhir_k: item.nilai_akhir_k,

        // Metadata
        kkm: kkm,
        target_min: kkm, // ✅ TAMBAH ini
        target_max: nilaiMaksimal,
        nilai_min_kelas: minNilaiAkhir,
        nilai_max_kelas: maxNilaiAkhir,
        jumlah_siswa_kelas: hasilKatrol.length,
        formula_used: "linear_scaling", // ✅ TAMBAH ini

        processed_by: user?.id || teacherId, // ✅ TAMBAH ini
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      // Insert data baru
      const { error } = await supabase.from("grades_katrol").insert(recordsToSave);

      if (error) throw error;

      // ✅ TAMPILKAN DENGAN FORMAT YANG BAIK
      const successMessage = academicInfo
        ? `✅ Berhasil menyimpan ${recordsToSave.length} nilai katrol ke database untuk ${academicInfo.displayText}!`
        : `✅ Berhasil menyimpan ${recordsToSave.length} nilai katrol ke database!`;

      showMessage(successMessage, "success");

      // ✅ AUTO-RELOAD SETELAH SAVE
      await fetchDataNilai();
    } catch (error) {
      console.error("❌ Error saving katrol:", error);
      showMessage(`Gagal menyimpan nilai katrol: ${error.message || "Unknown error"}`, "error");
    } finally {
      setSaving(false);
    }
  };

  // GANTI FUNGSI handleExport di GradesKatrol.js (baris 1211-1266)
  // DENGAN KODE INI:

  // GANTI FUNGSI handleExport di GradesKatrol.js (baris 1211-1266)
  // DENGAN KODE INI:

  // CARI fungsi handleExport di GradesKatrol.js
  // HAPUS SEMUA ISI fungsi handleExport
  // GANTI DENGAN KODE INI:

  const handleExport = async () => {
    if (!hasilKatrol || hasilKatrol.length === 0) {
      showMessage("Proses katrol dulu sebelum export!", "error");
      return;
    }

    setExporting(true);
    try {
      const exportMetadata = {
        subject: selectedSubjectState,
        class_name: selectedClassId,
        academic_year: selectedAcademicYear,
        semester: parseInt(selectedSemester),
        kkm: kkm,
        target_max: nilaiMaksimal,
      };

      await exportToExcel(hasilKatrol, exportMetadata);
      showMessage("✅ Berhasil export", "success");
    } catch (error) {
      console.error("Error:", error);
      showMessage("Gagal export: " + error.message, "error");
    } finally {
      setExporting(false);
    }
  };

  // ✅ LOADING STATE UNTUK ACADEMIC INFO
  if (loadingAcademic) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Memuat informasi tahun akademik...</p>
        </div>
      </div>
    );
  }

  // ✅ JIKA TIDAK ADA ACADEMIC INFO
  if (!academicInfo && !loadingAcademic) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-6 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <div>
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-400">
                  Informasi Tahun Akademik Tidak Tersedia
                </h3>
                <p className="text-red-700 dark:text-red-300 mt-1">
                  Tidak dapat memuat informasi tahun akademik. Silakan hubungi administrator.
                </p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Tutup
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* 🎨 INJECT CUSTOM STYLES */}
      <style>{customStyles}</style>

      {/* 🎨 LOADING OVERLAY - KEREN! */}
      {saving && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform animate-scale-in">
            <div className="flex flex-col items-center gap-6">
              {/* Animated Icon */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full p-6">
                  <Save className="w-12 h-12 text-white animate-bounce" />
                </div>
              </div>

              {/* Loading Text */}
              <div className="text-center space-y-3">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Menyimpan Data...
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Sedang menyimpan {hasilKatrol.length} nilai katrol ke database
                </p>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-600 to-indigo-600 h-full rounded-full animate-progress"></div>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                  Mohon tunggu, jangan tutup halaman ini...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🎨 CONFIRMATION MODALS */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onConfirm={handleFirstConfirm}
        onCancel={() => setShowConfirmModal(false)}
        type="save"
        data={pendingSaveData}
      />

      <ConfirmationModal
        isOpen={showOverwriteModal}
        onConfirm={handleOverwriteConfirm}
        onCancel={() => setShowOverwriteModal(false)}
        type="overwrite"
        data={pendingSaveData}
      />

      {/* Filter Section */}
      <div className="mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 sm:p-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4 dark:text-gray-200 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-500" />
            Filter Data
            {/* ✅ BADGE INFORMASI TAHUN AJARAN AKTIF */}
            {academicInfo && (
              <span className="ml-auto bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs px-3 py-1 rounded-full">
                {academicInfo.displayText}
              </span>
            )}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {/* Semester */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Semester
              </label>
              <select
                value={selectedSemester}
                onChange={(e) => {
                  const value = e.target.value;
                  console.log("🔄 Semester onChange:", value);
                  setSelectedSemester(value);
                  setSelectedSubjectState("");
                  setSelectedClassId("");
                  setSubjects([]);
                  setClasses([]);
                  setDataNilai([]);
                  setHasilKatrol([]);
                  setKkmSettings(null);
                }}
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 dark:text-gray-200 transition-colors"
                disabled={isInitialLoad}
                style={{
                  position: "relative",
                  zIndex: 9999,
                  pointerEvents: "auto",
                  cursor: isInitialLoad ? "not-allowed" : "pointer",
                }}
              >
                <option value="">Pilih Semester</option>
                <option value="1">
                  Semester Ganjil{academicInfo?.activeSemester === 1 ? " (Aktif)" : ""}
                </option>
                <option value="2">
                  Semester Genap{academicInfo?.activeSemester === 2 ? " (Aktif)" : ""}
                </option>
              </select>
              {/* ✅ INFO SEMESTER AKTIF */}
              {academicInfo && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Semester aktif: {academicInfo.semesterText}
                </p>
              )}
            </div>

            {/* Mata Pelajaran */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Mata Pelajaran
              </label>
              <select
                key={`subject-${subjects.length}-${selectedAcademicYear}-${selectedSemester}`}
                value={selectedSubjectState}
                onChange={(e) => {
                  const value = e.target.value;
                  console.log("🔄 Subject onChange:", value);
                  setSelectedSubjectState(value);
                  setSelectedClassId("");
                  setClasses([]);
                  setDataNilai([]);
                  setHasilKatrol([]);
                  setKkmSettings(null);
                }}
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 dark:text-gray-200 transition-colors"
                disabled={isInitialLoad || loading || !selectedAcademicYear}
                style={{
                  position: "relative",
                  zIndex: 9999,
                  pointerEvents: "auto",
                  cursor:
                    isInitialLoad || loading || !selectedAcademicYear ? "not-allowed" : "pointer",
                }}
              >
                <option value="">Pilih Mata Pelajaran</option>
                {subjects.map((subject, index) => (
                  <option key={index} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>

            {/* Kelas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Kelas
              </label>
              <select
                key={`class-${classes.length}-${selectedSubjectState}`}
                value={selectedClassId}
                onChange={(e) => {
                  const value = e.target.value;
                  console.log("🔄 Class onChange:", value);
                  setSelectedClassId(value);
                  setDataNilai([]);
                  setHasilKatrol([]);
                  setKkmSettings(null);
                }}
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 dark:text-gray-200 transition-colors"
                disabled={isInitialLoad || !selectedSubjectState || loading}
                style={{
                  position: "relative",
                  zIndex: 9999,
                  pointerEvents: "auto",
                  cursor:
                    isInitialLoad || !selectedSubjectState || loading ? "not-allowed" : "pointer",
                }}
              >
                <option value="">Pilih Kelas</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedSemester && selectedSubjectState && selectedClassId && (
            <>
              {/* ✅ KKM & Nilai Maksimal - FLEXIBLE VERSION */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold dark:text-gray-200 flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                    Pengaturan KKM
                    {/* ✅ INFO ACADEMIC CONTEXT */}
                    {academicInfo && (
                      <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                        untuk {academicInfo.displayText}
                      </span>
                    )}
                  </h3>

                  {kkmSettings && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Tersimpan
                      </div>
                      <button
                        onClick={resetKkmSettings}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Reset
                      </button>
                    </div>
                  )}
                </div>

                {/* REVISI: Grid 3 kolom untuk KKM + Nilai Maksimal + Tombol */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  {/* Kolom 1: KKM */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      KKM (Kriteria Ketuntasan Minimal)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={kkm}
                      onChange={(e) => setKkm(parseInt(e.target.value) || 75)}
                      className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-200 transition-colors"
                      placeholder="75"
                    />
                  </div>

                  {/* Kolom 2: Nilai Maksimal Target */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nilai Maksimal Target
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={nilaiMaksimal}
                      onChange={(e) => setNilaiMaksimal(parseInt(e.target.value) || 100)}
                      className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-200 transition-colors"
                      placeholder="100"
                    />
                  </div>

                  {/* Kolom 3: Tombol Simpan KKM */}
                  <div className="flex items-end">
                    {selectedClassId && selectedSubjectState && (
                      <button
                        onClick={saveKkmSettings}
                        disabled={isSavingKkm}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-lg disabled:bg-gray-300 dark:disabled:bg-gray-700 transition-colors text-sm"
                      >
                        {isSavingKkm ? (
                          <>
                            <Loader className="w-3 h-3 animate-spin" />
                            Menyimpan...
                          </>
                        ) : (
                          <>
                            <Save className="w-3 h-3" />
                            {kkmSettings ? "Update Pengaturan KKM" : "Simpan Pengaturan KKM"}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {selectedSemester && selectedSubjectState && selectedClassId && (
            <>
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={fetchDataNilai}
                  disabled={
                    !selectedClassId || !selectedSubjectState || !selectedAcademicYear || loading
                  }
                  className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800 text-white rounded-lg disabled:bg-gray-300 dark:disabled:bg-gray-700 transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Memuat Data...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      Muat Data Nilai
                    </>
                  )}
                </button>

                {/* ✅ REVISI: BUTTON LABEL - CONDITIONAL TEXT */}
                <button
                  onClick={prosesKatrol}
                  disabled={!selectedClassId || !selectedSubjectState || processing}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white rounded-lg disabled:bg-gray-300 dark:disabled:bg-gray-700 transition-colors"
                >
                  {processing ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <Calculator className="w-4 h-4" />
                      {hasilKatrol.length > 0 ? "Proses Katrol Ulang" : "Proses Katrol"}
                    </>
                  )}
                </button>

                {hasilKatrol.length > 0 && (
                  <button
                    onClick={saveKatrolToDatabase}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800 text-white rounded-lg disabled:bg-gray-300 dark:disabled:bg-gray-700 transition-colors"
                  >
                    {saving ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Simpan ke Database
                      </>
                    )}
                  </button>
                )}

                {hasilKatrol.length > 0 && (
                  <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 text-white rounded-lg disabled:bg-gray-300 dark:disabled:bg-gray-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export Excel
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Message Alert */}
      {message.text && (
        <div className="mb-6">
          <div
            className={`flex items-center gap-3 p-4 rounded-lg border ${
              message.type === "success"
                ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      {/* Preview Table */}
      {showPreview && dataNilai.length > 0 && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 dark:text-gray-200 flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-600 dark:text-purple-500" />
              Preview Data Nilai Asli ({dataNilai.length} siswa)
              {/* ✅ INFO ACADEMIC */}
              {academicInfo && (
                <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                  {academicInfo.displayText}
                </span>
              )}
            </h3>

            {/* ✅ REVISI: Info bobot baru */}
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
                💡 <strong>Bobot Penilaian Baru:</strong> Rata NH (40%) + PSTS (30%) + PSAS (30%)
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                      No
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                      NIS
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                      Nama
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                      NH1
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                      NH2
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                      NH3
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                      Rata NH
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                      PSTS
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                      PSAS
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                      Nilai Akhir
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {dataNilai.slice(0, 5).map((item, index) => (
                    <tr key={item.student_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200">
                        {item.nis}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200">
                        {item.nama_siswa}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200">
                        {formatNilaiDisplay(item.nh1, item.nh1)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200">
                        {formatNilaiDisplay(item.nh2, item.nh2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200">
                        {formatNilaiDisplay(item.nh3, item.nh3)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200">
                        {formatNilaiDisplay(item.rata_nh, item.rata_nh)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200">
                        {formatNilaiDisplay(item.psts, item.psts)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200">
                        {formatNilaiDisplay(item.psas, item.psas)}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-gray-200">
                        {formatNilaiDisplay(item.nilai_akhir, item.nilai_akhir)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {dataNilai.length > 5 && (
              <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                Menampilkan 5 dari {dataNilai.length} siswa. Klik "Proses Katrol" untuk melihat
                hasil lengkap.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ✅ RESULTS TABLE - SIMPLE VERSION */}
      {hasilKatrol.length > 0 && (
        <div className="max-w-7xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-100 dark:border-gray-700">
            {/* HEADER SIMPLE */}
            <div className="mb-6">
              <h3 className="text-xl font-bold dark:text-gray-200 flex items-center gap-2 mb-2">
                <Calculator className="w-6 h-6 text-green-600 dark:text-green-500" />
                Hasil Katrol Nilai
              </h3>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full">
                  Kelas: {selectedClassId}
                </div>
                <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-3 py-1 rounded-full">
                  Mapel: {selectedSubjectState}
                </div>
                <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 px-3 py-1 rounded-full">
                  KKM: {kkm}
                </div>
                <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-3 py-1 rounded-full">
                  {hasilKatrol.length} Siswa
                </div>
                {/* ✅ INFO BOBOT BARU */}
                <div className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 px-3 py-1 rounded-full">
                  Bobot: 40-30-30
                </div>
                {/* ✅ TAMPILKAN INFO ACADEMIC */}
                {academicInfo && (
                  <div className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 px-3 py-1 rounded-full">
                    {academicInfo.displayText}
                  </div>
                )}
              </div>
            </div>

            {/* ✅ PAKAI KatrolTable YANG DI-IMPORT */}
            <KatrolTable
              hasilKatrol={hasilKatrol}
              kkm={kkm}
              nilaiMaksimal={nilaiMaksimal}
              academicYear={selectedAcademicYear}
              semester={selectedSemester}
              subject={selectedSubjectState}
              className={selectedClassId}
              showComparison={true}
              isDarkMode={false}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default GradesKatrol;
