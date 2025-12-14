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
  Settings,
  Save,
  Zap,
  X,
  Calendar,
  GraduationCap,
  BookOpen,
  Users,
} from "lucide-react";

const KatrolTable = ({ data, showComparison = false }) => {
  return (
    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              No
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              NIS
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Nama Siswa
            </th>

            {/* Nilai Mentah */}
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              NH1 (M)
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              NH2 (M)
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              NH3 (M)
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Rata NH (M)
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              PSTS (M)
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              PSAS (M)
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Akhir (M)
            </th>

            {/* Nilai Katrol */}
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              NH1 (K)
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              NH2 (K)
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              NH3 (K)
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Rata NH (K)
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              PSTS (K)
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              PSAS (K)
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Akhir (K)
            </th>

            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {data.map((item, index) => (
            <tr
              key={item.student_id}
              className="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                {index + 1}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">
                {item.nis || "-"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                {item.nama_siswa}
              </td>

              {/* Nilai Mentah */}
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                {item.nh1_mentah || "-"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                {item.nh2_mentah || "-"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                {item.nh3_mentah || "-"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                {item.rata_nh_mentah ? item.rata_nh_mentah.toFixed(1) : "-"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                {item.psts_mentah || "-"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                {item.psas_mentah || "-"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-gray-200">
                {item.nilai_akhir_mentah
                  ? item.nilai_akhir_mentah.toFixed(1)
                  : "-"}
              </td>

              {/* Nilai Katrol */}
              <td className="px-4 py-3 whitespace-nowrap text-sm text-green-700 dark:text-green-400">
                {item.nh1_katrol || "-"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-green-700 dark:text-green-400">
                {item.nh2_katrol || "-"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-green-700 dark:text-green-400">
                {item.nh3_katrol || "-"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-green-700 dark:text-green-400 font-bold">
                {item.rata_nh_katrol ? item.rata_nh_katrol.toFixed(1) : "-"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-green-700 dark:text-green-400">
                {item.psts_katrol || "-"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-green-700 dark:text-green-400">
                {item.psas_katrol || "-"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-green-700 dark:text-green-400">
                {item.nilai_akhir_katrol
                  ? item.nilai_akhir_katrol.toFixed(1)
                  : "-"}
              </td>

              <td className="px-4 py-3 whitespace-nowrap">
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    item.status === "Tuntas"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                  }`}>
                  {item.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Helper function untuk katrol nilai
const calculateKatrolValue = (nilai, minKelas, maxKelas, kkm, targetMax) => {
  if (nilai === null || nilai === undefined || isNaN(nilai)) return null;
  if (nilai >= kkm) return nilai; // Tidak perlu katrol jika sudah di atas KKM
  if (minKelas === maxKelas) return kkm; // Edge case

  const scaledValue =
    kkm + ((nilai - minKelas) / (maxKelas - minKelas)) * (targetMax - kkm);
  return Math.min(Math.round(scaledValue * 10) / 10, targetMax); // Max 2 decimal
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
  // =============================================
  // STEP 2: Tambahkan Debug Console Logs
  // =============================================
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

  // =============================================
  // STEP 6A: Pisahkan State Management
  // =============================================
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
  const [isInitialLoad, setIsInitialLoad] = useState(true); // ← TAMBAH INI

  // =============================================
  // STEP 2A: Debug State Changes
  // =============================================
  useEffect(() => {
    console.log("🎯 STATE UPDATE:", {
      selectedAcademicYear,
      selectedSemester,
      selectedSubjectState,
      selectedClassId,
      academicYearsAvailable: academicYears.length,
      subjectsAvailable: subjects.length,
      classesAvailable: classes.length,
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

  // =============================================
  // STEP 2B: Fetch Academic Years (Dari Grades.js)
  // =============================================
  useEffect(() => {
    console.log("🔄 fetchAcademicYears TRIGGERED", { teacherId });
    const fetchAcademicYears = async () => {
      if (!teacherId) {
        console.log("⚠️ teacherId not available, skipping fetch");
        setIsInitialLoad(false); // ← TAMBAH INI
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
          setIsInitialLoad(false); // ← TAMBAH INI
          return;
        }
        if (!assignmentData || assignmentData.length === 0) {
          setAcademicYears([]);
          setMessage({
            text: "Tidak ada data tahun akademik untuk guru ini",
            type: "error",
          });
          setIsInitialLoad(false); // ← TAMBAH INI
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
        setIsInitialLoad(false); // ← TAMBAH INI
      } catch (error) {
        console.error("Error in fetchAcademicYears:", error);
        setMessage({
          text: "Error: Terjadi kesalahan sistem saat mengambil tahun akademik",
          type: "error",
        });
        setIsInitialLoad(false); // ← TAMBAH INI
      }
    };
    fetchAcademicYears();
  }, [teacherId]);

  // =============================================
  // STEP 2C: Fetch Subjects (Dari Grades.js)
  // =============================================
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

        // =============================================
        // STEP 6C: Hapus Reset Logic yang Bermasalah
        // =============================================
        // HAPUS LOGIC INI SEUTUHNYA:
        // if (selectedAcademicYear !== "" || selectedSemester !== "") {
        //   setSelectedSubjectState("");
        //   setSelectedClassId("");
        //   setDataNilai([]);
        //   setHasilKatrol([]);
        // }
      } catch (error) {
        console.error("Error in fetchSubjects:", error);
        setMessage({ text: "Error: Terjadi kesalahan sistem", type: "error" });
      }
    };

    fetchSubjects();
  }, [teacherId, selectedAcademicYear, selectedSemester]);

  // =============================================
  // STEP 2D: Fetch Classes (Dari Grades.js)
  // =============================================
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

        // =============================================
        // STEP 6C: Hapus Reset Logic yang Bermasalah
        // =============================================
        // HAPUS LOGIC INI SEUTUHNYA:
        // if (selectedSubjectState !== "") {
        //   setSelectedClassId("");
        //   setDataNilai([]);
        //   setHasilKatrol([]);
        // }
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
        .select("*")
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

        // ✅ FIX: Ambil juga data students untuk dapetin nis yang hilang (kalau grades_katrol gak ada kolom nis)
        const studentIds = katrolData.map((k) => k.student_id);
        const { data: studentsData, error: studentsError } = await supabase
          .from("students")
          .select("id, nis, full_name")
          .in("id", studentIds);

        if (studentsError) {
          console.error("Error fetching students:", studentsError);
        }

        // Format data katrol dengan join ke students
        const formattedKatrol = katrolData.map((item) => {
          // Cari student data berdasarkan student_id
          const student = studentsData?.find((s) => s.id === item.student_id);

          return {
            student_id: item.student_id,
            nis: student?.nis || "-", // ← FIX: Ambil dari students table
            nama_siswa: student?.full_name || item.nama_siswa || "-", // ← FIX: Fallback ke students
            // Nilai Mentah
            nh1_mentah: item.nh1_mentah,
            nh2_mentah: item.nh2_mentah,
            nh3_mentah: item.nh3_mentah,
            rata_nh_mentah: item.rata_nh_mentah,
            psts_mentah: item.psts_mentah,
            psas_mentah: item.psas_mentah,
            nilai_akhir_mentah: item.nilai_akhir_mentah,
            // Nilai Katrol
            nh1_katrol: item.nh1_katrol,
            nh2_katrol: item.nh2_katrol,
            nh3_katrol: item.nh3_katrol,
            rata_nh_katrol: item.rata_nh_katrol,
            psts_katrol: item.psts_katrol,
            psas_katrol: item.psas_katrol,
            nilai_akhir_katrol: item.nilai_akhir_katrol,
            status:
              item.nilai_akhir_katrol >= item.kkm ? "Tuntas" : "Belum Tuntas",
          };
        });

        setHasilKatrol(formattedKatrol);
        setShowPreview(false);
        showMessage(
          `✅ Berhasil memuat ${formattedKatrol.length} data nilai KATROL`,
          "success"
        );
        return;
      }

      // 3️⃣ KALAU BELUM ADA DATA KATROL, LOAD GRADES
      console.log(`ℹ️ Tidak ada data katrol, memuat nilai MENTAH...`);

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
          studentGrades.find((g) => g.assignment_type === "NH1")?.score || null;
        const nh2 =
          studentGrades.find((g) => g.assignment_type === "NH2")?.score || null;
        const nh3 =
          studentGrades.find((g) => g.assignment_type === "NH3")?.score || null;
        const psts =
          studentGrades.find((g) => g.assignment_type === "PSTS")?.score ||
          null;
        const psas =
          studentGrades.find((g) => g.assignment_type === "PSAS")?.score ||
          null;

        const rata_nh = nh1 && nh2 && nh3 ? (nh1 + nh2 + nh3) / 3 : null;
        const nilai_akhir =
          rata_nh && psts && psas
            ? rata_nh * 0.4 + psts * 0.3 + psas * 0.3
            : null;

        return {
          student_id: student.id,
          nis: student.nis,
          nama_siswa: student.full_name,
          // Nilai Mentah
          nh1_mentah: nh1,
          nh2_mentah: nh2,
          nh3_mentah: nh3,
          rata_nh_mentah: rata_nh,
          psts_mentah: psts,
          psas_mentah: psas,
          nilai_akhir_mentah: nilai_akhir,
        };
      });

      setDataNilai(previewData);
      setShowPreview(true);
      setHasilKatrol([]);

      showMessage(
        `✅ Berhasil memuat ${previewData.length} siswa (nilai MENTAH - belum dikatrol)`,
        "success"
      );
    } catch (error) {
      console.error("❌ Error mengambil data:", error);
      showMessage(`Gagal memuat data: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

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

      // Hitung nilai mentah per siswa
      const nilaiMentah = studentsData
        .map((student) => {
          const studentGrades =
            gradesData?.filter((g) => g.student_id === student.id) || [];

          const nh1 =
            studentGrades.find((g) => g.assignment_type === "NH1")?.score ||
            null;
          const nh2 =
            studentGrades.find((g) => g.assignment_type === "NH2")?.score ||
            null;
          const nh3 =
            studentGrades.find((g) => g.assignment_type === "NH3")?.score ||
            null;
          const psts =
            studentGrades.find((g) => g.assignment_type === "PSTS")?.score ||
            null;
          const psas =
            studentGrades.find((g) => g.assignment_type === "PSAS")?.score ||
            null;

          const rata_nh = nh1 && nh2 && nh3 ? (nh1 + nh2 + nh3) / 3 : null;
          const nilai_akhir =
            rata_nh && psts && psas
              ? rata_nh * 0.4 + psts * 0.3 + psas * 0.3
              : null;

          return {
            student_id: student.id,
            nis: student.nis,
            nama_siswa: student.full_name,
            nh1_mentah: nh1,
            nh2_mentah: nh2,
            nh3_mentah: nh3,
            rata_nh_mentah: rata_nh,
            psts_mentah: psts,
            psas_mentah: psas,
            nilai_akhir_mentah: nilai_akhir,
          };
        })
        .filter((item) => item.nilai_akhir_mentah !== null); // Hanya siswa yang punya nilai akhir

      if (nilaiMentah.length === 0) {
        showMessage("Tidak ada nilai yang bisa diproses", "error");
        return;
      }

      // Cari min dan max nilai akhir di kelas
      const nilaiAkhirArray = nilaiMentah
        .map((item) => item.nilai_akhir_mentah)
        .filter((n) => n !== null);
      const minKelas = Math.min(...nilaiAkhirArray);
      const maxKelas = Math.max(...nilaiAkhirArray);

      // Proses katrol per komponen
      const hasil = nilaiMentah.map((item) => {
        // Katrol per komponen
        const nh1_katrol = calculateKatrolValue(
          item.nh1_mentah,
          minKelas,
          maxKelas,
          kkm,
          nilaiMaksimal
        );
        const nh2_katrol = calculateKatrolValue(
          item.nh2_mentah,
          minKelas,
          maxKelas,
          kkm,
          nilaiMaksimal
        );
        const nh3_katrol = calculateKatrolValue(
          item.nh3_mentah,
          minKelas,
          maxKelas,
          kkm,
          nilaiMaksimal
        );
        const psts_katrol = calculateKatrolValue(
          item.psts_mentah,
          minKelas,
          maxKelas,
          kkm,
          nilaiMaksimal
        );
        const psas_katrol = calculateKatrolValue(
          item.psas_mentah,
          minKelas,
          maxKelas,
          kkm,
          nilaiMaksimal
        );

        // Hitung rata-rata NH katrol
        const rata_nh_katrol =
          nh1_katrol && nh2_katrol && nh3_katrol
            ? (nh1_katrol + nh2_katrol + nh3_katrol) / 3
            : null;

        // Hitung nilai akhir katrol
        const nilai_akhir_katrol =
          rata_nh_katrol && psts_katrol && psas_katrol
            ? rata_nh_katrol * 0.4 + psts_katrol * 0.3 + psas_katrol * 0.3
            : null;

        return {
          ...item,
          nh1_katrol,
          nh2_katrol,
          nh3_katrol,
          psts_katrol,
          psas_katrol,
          rata_nh_katrol,
          nilai_akhir_katrol,
          status: nilai_akhir_katrol >= kkm ? "Tuntas" : "Belum Tuntas",
        };
      });

      setHasilKatrol(hasil);
      setShowPreview(false);
      showMessage(
        `✅ Berhasil memproses katrol untuk ${hasil.length} siswa`,
        "success"
      );
    } catch (error) {
      console.error("❌ Error processing katrol:", error);
      showMessage("Gagal memproses katrol", "error");
    } finally {
      setProcessing(false);
    }
  };

  const saveKatrolToDatabase = async () => {
    if (!hasilKatrol || hasilKatrol.length === 0) {
      showMessage("Tidak ada data katrol untuk disimpan", "error");
      return;
    }

    if (!academicYearId) {
      showMessage("Tahun ajaran tidak valid", "error");
      return;
    }

    const confirmSave = window.confirm(
      `💾 SIMPAN NILAI KATROL SMP?\n\n` +
        `Tahun Ajaran: ${selectedAcademicYear}\n` +
        `Semester: ${selectedSemester}\n` +
        `Kelas: ${selectedClassId}\n` +
        `Mata Pelajaran: ${selectedSubjectState}\n` +
        `Total Siswa: ${hasilKatrol.length}\n\n` +
        `Nilai akan disimpan ke database.\n` +
        `Jika sudah ada, akan DITIMPA!\n\n` +
        `Lanjutkan?`
    );

    if (!confirmSave) return;

    setSaving(true);
    try {
      const recordsToSave = hasilKatrol.map((item) => {
        const nilaiArray = [
          item.nilai_akhir_mentah,
          item.nh1_mentah,
          item.nh2_mentah,
          item.nh3_mentah,
          item.psts_mentah,
          item.psas_mentah,
        ].filter((n) => n !== null && !isNaN(n));

        const min_nilai =
          nilaiArray.length > 0 ? Math.min(...nilaiArray) : null;
        const max_nilai =
          nilaiArray.length > 0 ? Math.max(...nilaiArray) : null;

        return {
          student_id: item.student_id,
          class_id: selectedClassId,
          teacher_id: teacherId,
          subject: selectedSubjectState,
          academic_year_id: academicYearId,
          academic_year: selectedAcademicYear,
          semester: selectedSemester,

          // Nilai Mentah
          nh1_mentah: item.nh1_mentah,
          nh2_mentah: item.nh2_mentah,
          nh3_mentah: item.nh3_mentah,
          psts_mentah: item.psts_mentah,
          psas_mentah: item.psas_mentah,
          rata_nh_mentah: item.rata_nh_mentah,
          nilai_akhir_mentah: item.nilai_akhir_mentah,

          // Nilai Katrol
          nh1_katrol: item.nh1_katrol,
          nh2_katrol: item.nh2_katrol,
          nh3_katrol: item.nh3_katrol,
          psts_katrol: item.psts_katrol,
          psas_katrol: item.psas_katrol,
          rata_nh_katrol: item.rata_nh_katrol,
          nilai_akhir_katrol: item.nilai_akhir_katrol,

          // Metadata
          kkm: kkm,
          nilai_min_kelas: min_nilai,
          nilai_max_kelas: max_nilai,
          target_min: kkm,
          target_max: nilaiMaksimal,
          jumlah_siswa_kelas: hasilKatrol.length,
          formula_used: "linear_scaling",
          status: "processed",
          processed_by: user?.id || teacherId,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });

      console.log("💾 Menyimpan data katrol:", recordsToSave.length, "records");

      const { data, error } = await supabase
        .from("grades_katrol")
        .upsert(recordsToSave, {
          onConflict: "student_id,subject,class_id,academic_year,semester",
        });

      if (error) throw error;

      showMessage(
        `✅ Berhasil menyimpan ${recordsToSave.length} nilai katrol ke database!`,
        "success"
      );
    } catch (error) {
      console.error("❌ Error saving katrol:", error);
      showMessage(`Gagal menyimpan nilai katrol: ${error.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    if (!hasilKatrol || hasilKatrol.length === 0) {
      showMessage("Tidak ada data untuk di-export", "error");
      return;
    }

    setExporting(true);
    try {
      // Simple export untuk sekarang
      const csvContent = [
        [
          "NIS",
          "Nama",
          "NH1 Mentah",
          "NH2 Mentah",
          "NH3 Mentah",
          "PSTS Mentah",
          "PSAS Mentah",
          "Akhir Mentah",
          "NH1 Katrol",
          "NH2 Katrol",
          "NH3 Katrol",
          "PSTS Katrol",
          "PSAS Katrol",
          "Akhir Katrol",
          "Status",
        ].join(","),
        ...hasilKatrol.map((item) =>
          [
            item.nis,
            item.nama_siswa,
            item.nh1_mentah || "",
            item.nh2_mentah || "",
            item.nh3_mentah || "",
            item.psts_mentah || "",
            item.psas_mentah || "",
            item.nilai_akhir_mentah || "",
            item.nh1_katrol || "",
            item.nh2_katrol || "",
            item.nh3_katrol || "",
            item.psts_katrol || "",
            item.psas_katrol || "",
            item.nilai_akhir_katrol || "",
            item.status,
          ].join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `Katrol_${selectedSubjectState}_${selectedClassId}_${new Date()
          .toISOString()
          .slice(0, 10)}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showMessage("✅ Berhasil export data ke CSV", "success");
    } catch (error) {
      console.error("Error exporting:", error);
      showMessage("Gagal export data", "error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
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

      {/* Filter Section - DENGAN PERBAIKAN */}
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
                Export CSV
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
              Preview Data Nilai Mentah ({dataNilai.length} siswa)
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
                        {item.nh1_mentah || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200">
                        {item.nh2_mentah || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200">
                        {item.nh3_mentah || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200">
                        {item.rata_nh_mentah
                          ? item.rata_nh_mentah.toFixed(1)
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200">
                        {item.psts_mentah || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200">
                        {item.psas_mentah || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-gray-200">
                        {item.nilai_akhir_mentah
                          ? item.nilai_akhir_mentah.toFixed(1)
                          : "-"}
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

      {/* Results Table */}
      {hasilKatrol.length > 0 && (
        <div className="max-w-7xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <div>
                <h3 className="text-lg font-semibold dark:text-gray-200 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-green-600 dark:text-green-500" />
                  Hasil Katrol Nilai SMP ({hasilKatrol.length} siswa)
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  KKM: {kkm} | Nilai Maksimal Target: {nilaiMaksimal} |
                  Semester: {selectedSemester}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-400">
                    Tuntas (
                    {hasilKatrol.filter((h) => h.status === "Tuntas").length})
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-400">
                    Belum Tuntas (
                    {
                      hasilKatrol.filter((h) => h.status === "Belum Tuntas")
                        .length
                    }
                    )
                  </span>
                </div>
              </div>
            </div>

            <KatrolTable data={hasilKatrol} />

            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="font-semibold mb-2 dark:text-gray-200">
                📊 Rumus Nilai Akhir SMP:
              </h4>
              <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                <p>
                  <strong>
                    Nilai Akhir = (Rata NH × 0.4) + (PSTS × 0.3) + (PSAS × 0.3)
                  </strong>
                </p>
                <p>
                  <strong>Katrol per Komponen:</strong> KKM + ((Nilai - Min
                  Kelas) / (Max Kelas - Min Kelas)) × (Nilai Maksimal - KKM)
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  💡 <strong>(M)</strong> = Nilai Mentah | <strong>(K)</strong>{" "}
                  = Nilai Katrol
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradesKatrol;
