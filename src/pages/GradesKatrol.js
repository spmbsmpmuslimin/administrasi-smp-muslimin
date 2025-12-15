// 📁 GradesKatrol.js - VERSI FIXED & CLEAN
import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
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
`;

// 🎨 HELPER COMPONENT
const InfoRow = ({ label, value }) => (
  <div className="flex justify-between items-center">
    <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
    <span className="text-sm font-semibold text-gray-900 dark:text-white">
      {value}
    </span>
  </div>
);

// 🎨 CUSTOM CONFIRMATION MODAL COMPONENT
const ConfirmationModal = ({
  isOpen,
  onConfirm,
  onCancel,
  type = "save",
  data = {},
}) => {
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
          }`}>
          <div className="flex items-center gap-3 text-white">
            <div className="bg-white/20 p-2 rounded-lg">
              {isSaveConfirm ? (
                <Save className="w-6 h-6" />
              ) : (
                <AlertCircle className="w-6 h-6" />
              )}
            </div>
            <h3 className="text-xl font-semibold">
              {isSaveConfirm
                ? "Konfirmasi Penyimpanan"
                : "Peringatan Data Sudah Ada!"}
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
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Total Siswa
                  </span>
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
                  Ditemukan{" "}
                  <span className="font-bold">{data.existingCount}</span> data
                  katrol yang sudah tersimpan
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
            className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium">
            Batal
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 text-white rounded-lg font-medium transition-colors ${
              isSaveConfirm
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                : "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            }`}>
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

  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [dataNilai, setDataNilai] = useState([]);
  const [hasilKatrol, setHasilKatrol] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  const [kkm, setKkm] = useState(75);
  const [nilaiMaksimal, setNilaiMaksimal] = useState(100);

  const [message, setMessage] = useState({ text: "", type: "" });
  const [academicYearId, setAcademicYearId] = useState(null);

  // State untuk modal konfirmasi
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState(null);

  // State untuk filter
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(
    academicYear || ""
  );
  const [selectedSemester, setSelectedSemester] = useState(semester || "1");
  const [selectedSubjectState, setSelectedSubjectState] = useState(
    selectedSubject || ""
  );
  const [selectedClassId, setSelectedClassId] = useState(selectedClass || "");

  const [academicYears, setAcademicYears] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Debug state changes
  useEffect(() => {
    console.log("🎯 STATE UPDATE:", {
      selectedAcademicYear,
      selectedSemester,
      selectedSubjectState,
      selectedClassId,
      academicYearsLength: academicYears.length,
      subjectsLength: subjects.length,
      classesLength: classes.length,
      loading,
      processing,
    });
  }, [
    selectedAcademicYear,
    selectedSemester,
    selectedSubjectState,
    selectedClassId,
    academicYears,
    subjects,
    classes,
    loading,
    processing,
  ]);

  // Fetch Academic Years
  useEffect(() => {
    console.log("🔄 fetchAcademicYears TRIGGERED", { teacherId });
    const fetchAcademicYears = async () => {
      if (!teacherId) {
        console.log("⚠️ teacherId not available, skipping fetch");
        setIsInitialLoad(false);
        return;
      }
      console.log("📡 Fetching academic years...");
      try {
        const { data: assignmentData, error: assignmentError } = await supabase
          .from("teacher_assignments")
          .select("academic_year")
          .eq("teacher_id", teacherId);

        console.log("✅ Academic years fetched:", assignmentData?.length || 0);

        if (assignmentError) {
          console.error("Error fetching academic years:", assignmentError);
          setMessage({
            text: "Error: Gagal mengambil tahun akademik",
            type: "error",
          });
          setIsInitialLoad(false);
          return;
        }

        if (!assignmentData || assignmentData.length === 0) {
          setAcademicYears([]);
          setMessage({
            text: "Tidak ada data tahun akademik untuk guru ini",
            type: "error",
          });
          setIsInitialLoad(false);
          return;
        }

        const uniqueYears = [
          ...new Set(assignmentData.map((item) => item.academic_year)),
        ];
        const sortedYears = uniqueYears.sort((a, b) => {
          const yearA = parseInt(a.split("/")[0]);
          const yearB = parseInt(b.split("/")[0]);
          return yearB - yearA;
        });

        console.log("📊 Sorted academic years:", sortedYears);
        setAcademicYears(sortedYears);

        if (!selectedAcademicYear && sortedYears.length > 0) {
          console.log("🎯 Auto-setting academic year to:", sortedYears[0]);
          setSelectedAcademicYear(sortedYears[0]);
        }
        setIsInitialLoad(false);
      } catch (error) {
        console.error("Error in fetchAcademicYears:", error);
        setMessage({
          text: "Error: Terjadi kesalahan sistem saat mengambil tahun akademik",
          type: "error",
        });
        setIsInitialLoad(false);
      }
    };
    fetchAcademicYears();
  }, [teacherId]);

  // Fetch Subjects
  useEffect(() => {
    console.log("🔄 fetchSubjects TRIGGERED", {
      teacherId,
      academicYear: selectedAcademicYear,
      semester: selectedSemester,
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
        const { data, error } = await supabase
          .from("teacher_assignments")
          .select("subject")
          .eq("teacher_id", teacherId)
          .eq("academic_year", selectedAcademicYear)
          .eq("semester", selectedSemester);

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
          setMessage({
            text: `Tidak ada mata pelajaran untuk tahun ${selectedAcademicYear} semester ${selectedSemester}`,
            type: "error",
          });
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
      semester: selectedSemester,
    });

    const fetchClasses = async () => {
      if (!selectedSubjectState || !teacherId || !selectedAcademicYear) {
        console.log("⚠️ Missing data for classes");
        setClasses([]);
        return;
      }

      console.log("📡 Fetching classes...");
      try {
        const { data: assignmentData, error: assignmentError } = await supabase
          .from("teacher_assignments")
          .select("class_id")
          .eq("teacher_id", teacherId)
          .eq("subject", selectedSubjectState)
          .eq("academic_year", selectedAcademicYear)
          .eq("semester", selectedSemester);

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

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 5000);
  };

  // ✅ FETCH DATA NILAI (dengan Utils.js)
  const fetchDataNilai = async () => {
    if (!selectedClassId || !selectedSubjectState || !selectedAcademicYear) {
      showMessage(
        "Pilih kelas, mata pelajaran, dan tahun ajaran terlebih dahulu",
        "error"
      );
      return;
    }

    setLoading(true);
    try {
      // Cari academic_year_id
      const { data: yearData, error: yearError } = await supabase
        .from("academic_years")
        .select("id")
        .eq("year", selectedAcademicYear)
        .single();

      if (yearError) {
        console.log(
          "Tahun ajaran tidak ada di academic_years table, menggunakan fallback"
        );
        setAcademicYearId(null);
      } else {
        setAcademicYearId(yearData.id);
      }

      // 1️⃣ CEK DULU: Ada data di grades_katrol?
      const { data: katrolData, error: katrolError } = await supabase
        .from("grades_katrol")
        .select(
          `
          *,
          students:student_id (nis, full_name)
        `
        )
        .eq("class_id", selectedClassId)
        .eq("subject", selectedSubjectState)
        .eq("academic_year", selectedAcademicYear)
        .eq("semester", selectedSemester);

      if (katrolError) throw katrolError;

      // 2️⃣ KALAU ADA DATA KATROL, LOAD ITU!
      if (katrolData && katrolData.length > 0) {
        console.log(
          `✅ Ditemukan ${katrolData.length} data KATROL (sudah diproses)`
        );

        // Format data dari database
        const formattedKatrol = katrolData.map((item) => ({
          student_id: item.student_id,
          nis: item.students?.nis || "-",
          nama_siswa: item.students?.full_name || "-",
          nh1: item.nh1,
          nh2: item.nh2,
          nh3: item.nh3,
          rata_nh: item.rata_nh,
          psts: item.psts,
          psas: item.psas,
          nilai_akhir: item.nilai_akhir,
          nh1_k: item.nh1_k,
          nh2_k: item.nh2_k,
          nh3_k: item.nh3_k,
          rata_nh_k: item.rata_nh_k,
          psts_k: item.psts_k,
          psas_k: item.psas_k,
          nilai_akhir_k: item.nilai_akhir_k,
          status: item.nilai_akhir_k >= item.kkm ? "Tuntas" : "Belum Tuntas",
        }));

        setHasilKatrol(formattedKatrol);
        setShowPreview(false);
        showMessage(
          `✅ Berhasil memuat ${formattedKatrol.length} data nilai KATROL`,
          "success"
        );
        return;
      }

      // 3️⃣ KALAU BELUM ADA DATA KATROL, LOAD GRADES untuk preview
      console.log(`ℹ️ Tidak ada data katrol, memuat nilai ASLI...`);

      // Ambil siswa aktif di kelas
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, full_name, nis")
        .eq("class_id", selectedClassId)
        .eq("academic_year", selectedAcademicYear)
        .eq("is_active", true)
        .order("full_name");

      if (studentsError) throw studentsError;

      if (!studentsData || studentsData.length === 0) {
        showMessage(`Tidak ada siswa di kelas ${selectedClassId}`, "error");
        return;
      }

      // Ambil semua nilai untuk kelas, subject, tahun ajaran, semester
      const { data: gradesData, error: gradesError } = await supabase
        .from("grades")
        .select("*")
        .eq("class_id", selectedClassId)
        .eq("subject", selectedSubjectState)
        .eq("academic_year", selectedAcademicYear)
        .eq("semester", selectedSemester)
        .in("assignment_type", ["NH1", "NH2", "NH3", "PSTS", "PSAS"]);

      if (gradesError) throw gradesError;

      // Format data preview
      const previewData = studentsData.map((student) => {
        const studentGrades =
          gradesData?.filter((g) => g.student_id === student.id) || [];

        const nh1 =
          parseFloat(
            studentGrades.find((g) => g.assignment_type === "NH1")?.score
          ) || null;
        const nh2 =
          parseFloat(
            studentGrades.find((g) => g.assignment_type === "NH2")?.score
          ) || null;
        const nh3 =
          parseFloat(
            studentGrades.find((g) => g.assignment_type === "NH3")?.score
          ) || null;
        const psts =
          parseFloat(
            studentGrades.find((g) => g.assignment_type === "PSTS")?.score
          ) || null;
        const psas =
          parseFloat(
            studentGrades.find((g) => g.assignment_type === "PSAS")?.score
          ) || null;

        const rata_nh = nh1 && nh2 && nh3 ? (nh1 + nh2 + nh3) / 3 : null;
        const nilai_akhir =
          rata_nh && psts && psas
            ? rata_nh * 0.4 + psts * 0.3 + psas * 0.3
            : null;

        return {
          student_id: student.id,
          nis: student.nis,
          nama_siswa: student.full_name,
          nh1: nh1,
          nh2: nh2,
          nh3: nh3,
          psts: psts,
          psas: psas,
          rata_nh: rata_nh,
          nilai_akhir: nilai_akhir,
        };
      });

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

  // ✅ PROSES KATROL (dengan Utils.js)
  const prosesKatrol = async () => {
    if (!selectedClassId || !selectedSubjectState || !selectedAcademicYear) {
      showMessage(
        "Pilih kelas, mata pelajaran, dan tahun ajaran terlebih dahulu",
        "error"
      );
      return;
    }

    if (kkm > nilaiMaksimal) {
      showMessage("KKM tidak boleh lebih besar dari Nilai Maksimal!", "error");
      return;
    }

    setProcessing(true);
    try {
      // Ambil data siswa
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, full_name, nis")
        .eq("class_id", selectedClassId)
        .eq("academic_year", selectedAcademicYear)
        .eq("is_active", true);

      if (studentsError) throw studentsError;

      // Ambil data grades
      const { data: gradesData, error: gradesError } = await supabase
        .from("grades")
        .select("*")
        .eq("class_id", selectedClassId)
        .eq("subject", selectedSubjectState)
        .eq("academic_year", selectedAcademicYear)
        .eq("semester", selectedSemester)
        .in("assignment_type", ["NH1", "NH2", "NH3", "PSTS", "PSAS"]);

      if (gradesError) throw gradesError;

      // ✅ PAKAI FUNGSI DARI UTILS.JS
      const organizedGrades = organizeGradesByStudent(gradesData);
      const minMax = calculateMinMaxKelas(organizedGrades);

      const additionalInfo = {
        class_id: selectedClassId,
        teacher_id: teacherId,
        subject: selectedSubjectState,
        academic_year: selectedAcademicYear,
        academic_year_id: academicYearId,
        semester: selectedSemester,
      };

      // ✅ VALIDASI SEBELUM PROSES
      const validation = validateBeforeKatrol(studentsData, organizedGrades);
      if (!validation.isValid) {
        showMessage(validation.errors[0], "error");
        return;
      }

      if (validation.warnings.length > 0) {
        console.warn("⚠️ Warnings:", validation.warnings);
      }

      // ✅ PROSES KATROL DENGAN UTILS
      const hasil = prosesKatrolUtils(
        studentsData,
        organizedGrades,
        minMax,
        kkm,
        nilaiMaksimal,
        additionalInfo
      );

      // Format untuk display
      const formattedHasil = hasil.map((item) => ({
        student_id: item.student_id,
        nis: item.student_nis,
        nama_siswa: item.student_name,
        nh1: item.nh1_mentah,
        nh2: item.nh2_mentah,
        nh3: item.nh3_mentah,
        psts: item.psts_mentah,
        psas: item.psas_mentah,
        rata_nh: item.rata_nh_mentah,
        nilai_akhir: item.nilai_akhir_mentah,
        nh1_k: item.nh1_katrol,
        nh2_k: item.nh2_katrol,
        nh3_k: item.nh3_katrol,
        psts_k: item.psts_katrol,
        psas_k: item.psas_katrol,
        rata_nh_k: item.rata_nh_katrol,
        nilai_akhir_k: item.nilai_akhir_katrol,
        status: item.nilai_akhir_katrol >= kkm ? "Tuntas" : "Belum Tuntas",
      }));

      setHasilKatrol(formattedHasil);
      setShowPreview(false);
      showMessage(
        `✅ Berhasil memproses katrol untuk ${formattedHasil.length} siswa`,
        "success"
      );
    } catch (error) {
      console.error("❌ Error processing katrol:", error);
      showMessage("Gagal memproses katrol: " + error.message, "error");
    } finally {
      setProcessing(false);
    }
  };

  // ✅ SIMPAN KE DATABASE (dengan Elegant Modal)
  const saveKatrolToDatabase = async () => {
    if (!hasilKatrol || hasilKatrol.length === 0) {
      showMessage("Tidak ada data katrol untuk disimpan", "error");
      return;
    }

    // Simpan data untuk modal
    setPendingSaveData({
      academicYear: selectedAcademicYear,
      semester: selectedSemester,
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
      // Cek data lama
      const { data: existingData, error: checkError } = await supabase
        .from("grades_katrol")
        .select("id")
        .eq("class_id", selectedClassId)
        .eq("subject", selectedSubjectState)
        .eq("academic_year", selectedAcademicYear)
        .eq("semester", selectedSemester);

      if (checkError)
        throw new Error(`Gagal mengecek data: ${checkError.message}`);

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

  const processSaveToDatabase = async () => {
    setSaving(true);

    try {
      // Hapus data lama jika ada
      const { error: deleteError } = await supabase
        .from("grades_katrol")
        .delete()
        .eq("class_id", selectedClassId)
        .eq("subject", selectedSubjectState)
        .eq("academic_year", selectedAcademicYear)
        .eq("semester", selectedSemester);

      if (deleteError)
        throw new Error(`Gagal menghapus data lama: ${deleteError.message}`);

      // Format data untuk database
      const recordsToSave = hasilKatrol.map((item) => {
        const userInfo = {
          userId: user?.id,
          teacherId: teacherId,
          userName: user?.full_name || user?.username || "Unknown",
        };

        const katrolData = {
          student_id: item.student_id,
          student_name: item.nama_siswa,
          student_nis: item.nis,
          class_id: selectedClassId,
          teacher_id: teacherId,
          subject: selectedSubjectState,
          academic_year: selectedAcademicYear,
          academic_year_id: academicYearId,
          semester: selectedSemester,
          nh1_mentah: item.nh1,
          nh2_mentah: item.nh2,
          nh3_mentah: item.nh3,
          psts_mentah: item.psts,
          psas_mentah: item.psas,
          rata_nh_mentah: item.rata_nh,
          nilai_akhir_mentah: item.nilai_akhir,
          nh1_katrol: item.nh1_k,
          nh2_katrol: item.nh2_k,
          nh3_katrol: item.nh3_k,
          psts_katrol: item.psts_k,
          psas_katrol: item.psas_k,
          rata_nh_katrol: item.rata_nh_k,
          nilai_akhir_katrol: item.nilai_akhir_k,
          kkm: kkm,
          target_max: nilaiMaksimal,
          target_min: kkm,
          nilai_min_kelas: null,
          nilai_max_kelas: null,
          jumlah_siswa_kelas: hasilKatrol.length,
        };

        return formatDataForDatabase(katrolData, userInfo);
      });

      // Insert data baru
      const { error } = await supabase
        .from("grades_katrol")
        .insert(recordsToSave);

      if (error) throw error;

      showMessage(
        `✅ Berhasil menyimpan ${recordsToSave.length} nilai katrol ke database!`,
        "success"
      );

      await fetchDataNilai();
    } catch (error) {
      console.error("❌ Error saving katrol:", error);
      showMessage(
        `Gagal menyimpan nilai katrol: ${error.message || "Unknown error"}`,
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  // ✅ EXPORT EXCEL (dengan Utils.js)
  const handleExport = async () => {
    if (!hasilKatrol || hasilKatrol.length === 0) {
      showMessage("Tidak ada data untuk di-export", "error");
      return;
    }

    setExporting(true);
    try {
      // ✅ PAKAI exportToExcel DARI UTILS.JS
      exportToExcel(
        hasilKatrol,
        {
          subject: selectedSubjectState,
          class_name: selectedClassId,
          academic_year: selectedAcademicYear,
          semester: selectedSemester,
          kkm: kkm,
          target_max: nilaiMaksimal,
          processed_by: user?.full_name || user?.username || "Unknown",
        },
        `Katrol_${selectedSubjectState}_${selectedClassId}`
      );

      showMessage("✅ Berhasil export data ke Excel", "success");
    } catch (error) {
      console.error("Error exporting:", error);
      showMessage("Gagal export data: " + error.message, "error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
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

      {/* Header dengan tombol close */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between bg-gradient-to-r from-purple-600 to-indigo-700 dark:from-purple-950 dark:to-indigo-900 rounded-xl shadow-lg p-4 sm:p-6 text-white">
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 sm:w-8 sm:h-8" />
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
                Katrol Nilai SMP
              </h1>
              <p className="text-sm text-white/80 mt-1">
                Linear Scaling Method untuk menaikkan nilai siswa
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Section */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 sm:p-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4 dark:text-gray-200 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-500" />
            Filter Data
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Tahun Ajaran */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Tahun Akademik
              </label>
              <select
                key={`academic-year-${academicYears.length}`}
                value={selectedAcademicYear}
                onChange={(e) => {
                  const value = e.target.value;
                  console.log("🔄 Academic Year onChange:", value);
                  setSelectedAcademicYear(value);
                  setSelectedSubjectState("");
                  setSelectedClassId("");
                  setSubjects([]);
                  setClasses([]);
                  setDataNilai([]);
                  setHasilKatrol([]);
                }}
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 dark:text-gray-200 transition-colors"
                disabled={isInitialLoad || loading}
                style={{
                  position: "relative",
                  zIndex: 9999,
                  pointerEvents: "auto",
                  cursor: isInitialLoad || loading ? "not-allowed" : "pointer",
                }}>
                <option value="">Pilih Tahun Akademik</option>
                {academicYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Semester */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Semester
              </label>
              <select
                key={`semester-${selectedAcademicYear}`}
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
                }}
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 dark:text-gray-200 transition-colors"
                disabled={isInitialLoad || !selectedAcademicYear}
                style={{
                  position: "relative",
                  zIndex: 9999,
                  pointerEvents: "auto",
                  cursor:
                    isInitialLoad || !selectedAcademicYear
                      ? "not-allowed"
                      : "pointer",
                }}>
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
              </select>
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
                }}
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 dark:text-gray-200 transition-colors"
                disabled={isInitialLoad || loading || !selectedAcademicYear}
                style={{
                  position: "relative",
                  zIndex: 9999,
                  pointerEvents: "auto",
                  cursor:
                    isInitialLoad || loading || !selectedAcademicYear
                      ? "not-allowed"
                      : "pointer",
                }}>
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
                }}
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 dark:text-gray-200 transition-colors"
                disabled={isInitialLoad || !selectedSubjectState || loading}
                style={{
                  position: "relative",
                  zIndex: 9999,
                  pointerEvents: "auto",
                  cursor:
                    isInitialLoad || !selectedSubjectState || loading
                      ? "not-allowed"
                      : "pointer",
                }}>
                <option value="">Pilih Kelas</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* KKM & Nilai Maksimal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
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
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 dark:text-gray-200"
                placeholder="75"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nilai Maksimal Target
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={nilaiMaksimal}
                onChange={(e) =>
                  setNilaiMaksimal(parseInt(e.target.value) || 100)
                }
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 dark:text-gray-200"
                placeholder="100"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={fetchDataNilai}
              disabled={
                !selectedClassId ||
                !selectedSubjectState ||
                !selectedAcademicYear ||
                loading
              }
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800 text-white rounded-lg disabled:bg-gray-300 dark:disabled:bg-gray-700 transition-colors">
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

            <button
              onClick={prosesKatrol}
              disabled={!selectedClassId || !selectedSubjectState || processing}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white rounded-lg disabled:bg-gray-300 dark:disabled:bg-gray-700 transition-colors">
              {processing ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <Calculator className="w-4 h-4" />
                  Proses Katrol
                </>
              )}
            </button>

            {hasilKatrol.length > 0 && (
              <button
                onClick={saveKatrolToDatabase}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800 text-white rounded-lg disabled:bg-gray-300 dark:disabled:bg-gray-700 transition-colors">
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
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 text-white rounded-lg disabled:bg-gray-300 dark:disabled:bg-gray-700 transition-colors">
                <Download className="w-4 h-4" />
                Export Excel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Message Alert */}
      {message.text && (
        <div className="max-w-7xl mx-auto mb-6">
          <div
            className={`flex items-center gap-3 p-4 rounded-lg border ${
              message.type === "success"
                ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800"
            }`}>
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
            </h3>

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
                    <tr
                      key={item.student_id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700">
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
                Menampilkan 5 dari {dataNilai.length} siswa. Klik "Proses
                Katrol" untuk melihat hasil lengkap.
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

            {/* SIMPLE SUMMARY - CUMA INI DOANG YANG TINGGAL */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {hasilKatrol.filter((h) => h.nilai_akhir_k >= kkm).length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Tuntas
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {hasilKatrol.filter((h) => h.nilai_akhir_k < kkm).length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Tidak Tuntas
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {
                      hasilKatrol.filter(
                        (h) => h.nilai_akhir < kkm && h.nilai_akhir_k >= kkm
                      ).length
                    }
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Naik Status
                  </div>
                </div>
              </div>

              {/* SIMPLE NOTE */}
              <div className="text-center mt-4 text-sm text-gray-500 dark:text-gray-400">
                * Nilai yang dikatrol ditandai dengan warna hijau
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradesKatrol;
