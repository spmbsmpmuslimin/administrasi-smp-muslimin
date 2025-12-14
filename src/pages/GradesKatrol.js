import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import ExcelJS from "exceljs";
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

            {/* Nilai Asli */}
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              NH1
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              NH2
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              NH3
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Rata NH
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              PSTS
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              PSAS
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Nilai Akhir
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
              Nilai Akhir (K)
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

              {/* Nilai Asli */}
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                {item.nh1 || "-"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                {item.nh2 || "-"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                {item.nh3 || "-"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                {item.rata_nh ? item.rata_nh.toFixed(1) : "-"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                {item.psts || "-"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                {item.psas || "-"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-gray-200">
                {item.nilai_akhir ? item.nilai_akhir.toFixed(1) : "-"}
              </td>

              {/* Nilai Katrol */}
              <td className="px-4 py-3 whitespace-nowrap text-sm text-green-700 dark:text-green-400">
                {item.nh1_k || "-"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-green-700 dark:text-green-400">
                {item.nh2_k || "-"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-green-700 dark:text-green-400">
                {item.nh3_k || "-"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-green-700 dark:text-green-400 font-bold">
                {item.rata_nh_k ? item.rata_nh_k.toFixed(1) : "-"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-green-700 dark:text-green-400">
                {item.psts_k || "-"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-green-700 dark:text-green-400">
                {item.psas_k || "-"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-green-700 dark:text-green-400">
                {item.nilai_akhir_k ? item.nilai_akhir_k.toFixed(1) : "-"}
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

  // Jika minKelas atau maxKelas null, return nilai asli
  if (minKelas === null || maxKelas === null) return nilai;

  // Jika nilai sudah >= KKM, tidak perlu dikatrol
  if (nilai >= kkm) return nilai;

  // Jika semua nilai sama (min = max), return KKM
  if (minKelas === maxKelas) return kkm;

  // Pastikan nilai tidak lebih kecil dari minKelas (jaga-jaga)
  const nilaiTerpakai = Math.max(nilai, minKelas);

  // Rumus katrol
  const scaledValue =
    kkm +
    ((nilaiTerpakai - minKelas) / (maxKelas - minKelas)) * (targetMax - kkm);

  // Batasi maksimal ke targetMax, bulatkan 1 desimal
  const hasil = Math.min(Math.round(scaledValue * 10) / 10, targetMax);

  // Pastikan hasil tidak lebih kecil dari nilai asli (katrol harus naik atau tetap)
  return Math.max(hasil, nilai);
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

        // Format data dari database (CLEAN VERSION - NO MENTAH)
        const formattedKatrol = katrolData.map((item) => ({
          student_id: item.student_id,
          nis: item.students?.nis || "-",
          nama_siswa: item.students?.full_name || "-",

          // ✅ CLEAN: Nilai Asli (langsung dari database)
          nh1: item.nh1,
          nh2: item.nh2,
          nh3: item.nh3,
          rata_nh: item.rata_nh,
          psts: item.psts,
          psas: item.psas,
          nilai_akhir: item.nilai_akhir,

          // ✅ CLEAN: Nilai Katrol (langsung dari database)
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

      // Format data preview (CLEAN VERSION)
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
          // ✅ CLEAN: Langsung pakai nama field final
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

      // Hitung nilai asli per siswa (CLEAN VERSION)
      const nilaiAsli = studentsData
        .map((student) => {
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
            // ✅ CLEAN: Langsung pakai field final
            nh1: nh1,
            nh2: nh2,
            nh3: nh3,
            psts: psts,
            psas: psas,
            rata_nh: rata_nh,
            nilai_akhir: nilai_akhir,
          };
        })
        .filter((item) => item.nilai_akhir !== null); // Hanya siswa yang punya nilai akhir

      if (nilaiAsli.length === 0) {
        showMessage("Tidak ada nilai yang bisa diproses", "error");
        return;
      }

      // Hitung min dan max PER KOMPONEN
      const nh1Array = nilaiAsli
        .map((item) => item.nh1)
        .filter((n) => n !== null && !isNaN(n));
      const nh2Array = nilaiAsli
        .map((item) => item.nh2)
        .filter((n) => n !== null && !isNaN(n));
      const nh3Array = nilaiAsli
        .map((item) => item.nh3)
        .filter((n) => n !== null && !isNaN(n));
      const pstsArray = nilaiAsli
        .map((item) => item.psts)
        .filter((n) => n !== null && !isNaN(n));
      const psasArray = nilaiAsli
        .map((item) => item.psas)
        .filter((n) => n !== null && !isNaN(n));

      const minNH1 = nh1Array.length > 0 ? Math.min(...nh1Array) : null;
      const maxNH1 = nh1Array.length > 0 ? Math.max(...nh1Array) : null;
      const minNH2 = nh2Array.length > 0 ? Math.min(...nh2Array) : null;
      const maxNH2 = nh2Array.length > 0 ? Math.max(...nh2Array) : null;
      const minNH3 = nh3Array.length > 0 ? Math.min(...nh3Array) : null;
      const maxNH3 = nh3Array.length > 0 ? Math.max(...nh3Array) : null;
      const minPSTS = pstsArray.length > 0 ? Math.min(...pstsArray) : null;
      const maxPSTS = pstsArray.length > 0 ? Math.max(...pstsArray) : null;
      const minPSAS = psasArray.length > 0 ? Math.min(...psasArray) : null;
      const maxPSAS = psasArray.length > 0 ? Math.max(...psasArray) : null;

      console.log("📊 Min/Max per komponen:", {
        minNH1,
        maxNH1,
        minNH2,
        maxNH2,
        minNH3,
        maxNH3,
        minPSTS,
        maxPSTS,
        minPSAS,
        maxPSAS,
      });

      // Proses katrol per komponen
      const hasil = nilaiAsli.map((item) => {
        // Katrol per komponen dengan min/max masing-masing
        const nh1_k = calculateKatrolValue(
          item.nh1,
          minNH1,
          maxNH1,
          kkm,
          nilaiMaksimal
        );
        const nh2_k = calculateKatrolValue(
          item.nh2,
          minNH2,
          maxNH2,
          kkm,
          nilaiMaksimal
        );
        const nh3_k = calculateKatrolValue(
          item.nh3,
          minNH3,
          maxNH3,
          kkm,
          nilaiMaksimal
        );
        const psts_k = calculateKatrolValue(
          item.psts,
          minPSTS,
          maxPSTS,
          kkm,
          nilaiMaksimal
        );
        const psas_k = calculateKatrolValue(
          item.psas,
          minPSAS,
          maxPSAS,
          kkm,
          nilaiMaksimal
        );

        // Hitung rata-rata NH katrol
        const rata_nh_k =
          nh1_k && nh2_k && nh3_k ? (nh1_k + nh2_k + nh3_k) / 3 : null;

        // Hitung nilai akhir katrol
        const nilai_akhir_k =
          rata_nh_k && psts_k && psas_k
            ? rata_nh_k * 0.4 + psts_k * 0.3 + psas_k * 0.3
            : null;

        return {
          ...item,
          // ✅ CLEAN: Langsung pakai suffix _k
          nh1_k,
          nh2_k,
          nh3_k,
          psts_k,
          psas_k,
          rata_nh_k,
          nilai_akhir_k,
          status: nilai_akhir_k >= kkm ? "Tuntas" : "Belum Tuntas",
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
      // 🔥 STRATEGI 1: Hapus data lama terlebih dahulu
      console.log("🗑️ Menghapus data lama...");
      const { error: deleteError } = await supabase
        .from("grades_katrol")
        .delete()
        .eq("class_id", selectedClassId)
        .eq("subject", selectedSubjectState)
        .eq("academic_year", selectedAcademicYear)
        .eq("semester", selectedSemester);

      if (deleteError) {
        console.error("⚠️ Error deleting old data:", deleteError);
        // Lanjutkan saja, mungkin belum ada data
      }

      // 🔥 STRATEGI 2: Insert data baru dengan field CLEAN
      const recordsToSave = hasilKatrol.map((item) => {
        const nilaiArray = [
          item.nilai_akhir,
          item.nh1,
          item.nh2,
          item.nh3,
          item.psts,
          item.psas,
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
          academic_year_id: academicYearId || null,
          academic_year: selectedAcademicYear,
          semester: selectedSemester,

          // ✅ CLEAN: Nilai Asli
          nh1: item.nh1 || null,
          nh2: item.nh2 || null,
          nh3: item.nh3 || null,
          psts: item.psts || null,
          psas: item.psas || null,
          rata_nh: item.rata_nh || null,
          nilai_akhir: item.nilai_akhir || null,

          // ✅ CLEAN: Nilai Katrol (suffix _k)
          nh1_k: item.nh1_k || null,
          nh2_k: item.nh2_k || null,
          nh3_k: item.nh3_k || null,
          psts_k: item.psts_k || null,
          psas_k: item.psas_k || null,
          rata_nh_k: item.rata_nh_k || null,
          nilai_akhir_k: item.nilai_akhir_k || null,

          // Metadata
          kkm: kkm,
          nilai_min_kelas: min_nilai,
          nilai_max_kelas: max_nilai,
          target_min: kkm,
          target_max: nilaiMaksimal,
          jumlah_siswa_kelas: hasilKatrol.length,
          formula_used: "linear_scaling",
          status: "processed",
          notes: null,
          processed_by: user?.id || teacherId,
          processed_at: new Date().toISOString(),
        };
      });

      console.log("💾 Menyimpan data katrol:", recordsToSave.length, "records");
      console.log("📦 Sample data:", recordsToSave[0]);

      const { data, error } = await supabase
        .from("grades_katrol")
        .insert(recordsToSave);

      if (error) {
        console.error("❌ Supabase Error Details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }

      console.log("✅ Data berhasil disimpan:", data);

      showMessage(
        `✅ Berhasil menyimpan ${recordsToSave.length} nilai katrol ke database!`,
        "success"
      );

      // Refresh data setelah save
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

  const handleExport = async () => {
    if (!hasilKatrol || hasilKatrol.length === 0) {
      showMessage("Tidak ada data untuk di-export", "error");
      return;
    }

    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Katrol Nilai");

      // Header
      worksheet.columns = [
        { header: "No", key: "no", width: 5 },
        { header: "NIS", key: "nis", width: 15 },
        { header: "Nama", key: "nama", width: 30 },
        { header: "NH1", key: "nh1", width: 10 },
        { header: "NH2", key: "nh2", width: 10 },
        { header: "NH3", key: "nh3", width: 10 },
        { header: "Rata NH", key: "rata_nh", width: 12 },
        { header: "PSTS", key: "psts", width: 10 },
        { header: "PSAS", key: "psas", width: 10 },
        { header: "Nilai Akhir", key: "akhir", width: 12 },
        { header: "NH1 (K)", key: "nh1_k", width: 10 },
        { header: "NH2 (K)", key: "nh2_k", width: 10 },
        { header: "NH3 (K)", key: "nh3_k", width: 10 },
        { header: "Rata NH (K)", key: "rata_nh_k", width: 12 },
        { header: "PSTS (K)", key: "psts_k", width: 10 },
        { header: "PSAS (K)", key: "psas_k", width: 10 },
        { header: "Nilai Akhir (K)", key: "akhir_k", width: 14 },
        { header: "Status", key: "status", width: 15 },
      ];

      // Style header
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFF00" },
      };
      worksheet.getRow(1).alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      // Data (CLEAN VERSION)
      hasilKatrol.forEach((item, index) => {
        worksheet.addRow({
          no: index + 1,
          nis: item.nis,
          nama: item.nama_siswa,
          nh1: item.nh1 || "",
          nh2: item.nh2 || "",
          nh3: item.nh3 || "",
          rata_nh: item.rata_nh ? item.rata_nh.toFixed(1) : "",
          psts: item.psts || "",
          psas: item.psas || "",
          akhir: item.nilai_akhir ? item.nilai_akhir.toFixed(1) : "",
          nh1_k: item.nh1_k || "",
          nh2_k: item.nh2_k || "",
          nh3_k: item.nh3_k || "",
          rata_nh_k: item.rata_nh_k ? item.rata_nh_k.toFixed(1) : "",
          psts_k: item.psts_k || "",
          psas_k: item.psas_k || "",
          akhir_k: item.nilai_akhir_k ? item.nilai_akhir_k.toFixed(1) : "",
          status: item.status,
        });
      });

      // Border
      worksheet.eachRow({ includeEmpty: false }, (row) => {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
      });

      // Generate file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `Katrol_${selectedSubjectState}_${selectedClassId}_${new Date()
          .toISOString()
          .slice(0, 10)}.xlsx`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

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
                        {item.nh1 || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200">
                        {item.nh2 || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200">
                        {item.nh3 || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200">
                        {item.rata_nh ? item.rata_nh.toFixed(1) : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200">
                        {item.psts || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200">
                        {item.psas || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-gray-200">
                        {item.nilai_akhir ? item.nilai_akhir.toFixed(1) : "-"}
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
                  💡 <strong>(K)</strong> = Nilai Katrol
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
