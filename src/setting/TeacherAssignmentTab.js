import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  downloadTemplate,
  exportAssignments,
  readExcelFile,
  validateImportData,
  importAssignments,
  generateErrorReport,
} from "./TeacherAssignmentExcel";
import {
  getActiveAcademicInfo, // ✅ TAMBAH: Untuk mendapatkan info akademik lengkap
  getActiveSemester, // ✅ TAMBAH: Hanya semester aktif
  getActiveYearString, // ✅ TAMBAH: Hanya tahun ajaran string
  getActiveAcademicYearId, // ✅ TAMBAH: Hanya UUID tahun ajaran
  applyAcademicFilters, // ✅ TAMBAH: Helper untuk filter query
} from "../services/academicYearService"; // ✅ TAMBAH: Import service
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  Copy,
  Users,
  BookOpen,
  Calendar,
  AlertCircle,
  CheckCircle,
  X,
  Loader,
  ChevronDown,
  ChevronUp,
  FileText,
  Download,
  Upload,
} from "lucide-react";

const TeacherAssignmentTab = ({ user, showToast, schoolConfig }) => {
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});

  // ✅ TAMBAH: State untuk academic info dinamis
  const [academicInfo, setAcademicInfo] = useState(null);
  const [academicLoading, setAcademicLoading] = useState(true);

  // Filter states
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // 'create' or 'edit'
  const [editingAssignment, setEditingAssignment] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    teacher_id: "",
    class_id: "",
    subject: "",
    academic_year_id: "",
    semester: "",
  });

  // Summary stats
  const [stats, setStats] = useState({
    totalAssignments: 0,
    activeAssignments: 0,
    teachersWithoutAssignment: 0,
    classesWithoutTeacher: 0,
    subjectsWithoutTeacher: 0,
  });

  // ✅ TAMBAH INI - Import Modal States
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importStep, setImportStep] = useState("upload"); // 'upload', 'validating', 'preview', 'importing'
  const [validationResult, setValidationResult] = useState(null);
  const [importMode, setImportMode] = useState("skip"); // 'skip' or 'update'

  // ✅ TAMBAH INI - State untuk Modal Delete
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAssignment, setDeletingAssignment] = useState(false);

  // ✅ TAMBAH: Load academic info saat component mount
  useEffect(() => {
    const loadAcademicInfo = async () => {
      try {
        setAcademicLoading(true);
        const info = await getActiveAcademicInfo();
        setAcademicInfo(info);

        // ✅ Set default semester dari data dinamis
        if (info) {
          setSelectedSemester(info.activeSemester.toString());
          setFormData((prev) => ({
            ...prev,
            semester: info.activeSemester.toString(),
          }));
        }
      } catch (error) {
        console.error("Error loading academic info:", error);
        showToast?.("Gagal memuat info tahun ajaran", "error");
      } finally {
        setAcademicLoading(false);
      }
    };

    loadAcademicInfo();
  }, []);

  // Load initial data
  useEffect(() => {
    if (!academicLoading) {
      loadAllData();
    }
  }, [academicLoading]);

  // Load filtered assignments when filters change
  useEffect(() => {
    if (academicYears.length > 0 && !academicLoading) {
      loadAssignments();
    }
  }, [
    selectedAcademicYear,
    selectedSemester,
    selectedClass,
    selectedTeacher,
    selectedSubject,
    academicLoading,
  ]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadTeachers(), loadClasses(), loadAcademicYears(), loadSubjects()]);
      await loadAssignments();
    } catch (error) {
      console.error("Error loading data:", error);
      showToast?.("Gagal memuat data", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadTeachers = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("id, teacher_id, full_name, username, role")
      .not("teacher_id", "is", null)
      .eq("is_active", true)
      .order("teacher_id");

    if (error) throw error;
    setTeachers(data || []);
  };

  const loadClasses = async () => {
    const { data, error } = await supabase
      .from("classes")
      .select("id, grade, academic_year")
      .eq("is_active", true)
      .order("grade");

    if (error) throw error;
    setClasses(data || []);
  };

  const loadAcademicYears = async () => {
    const { data, error } = await supabase
      .from("academic_years")
      .select("*")
      .order("year", { ascending: false });

    if (error) throw error;
    setAcademicYears(data || []);

    // Set default to active academic year
    const activeYear = data?.find((y) => y.is_active);
    if (activeYear) {
      setSelectedAcademicYear(activeYear.id);
      setFormData((prev) => ({ ...prev, academic_year_id: activeYear.id }));
    }
  };

  const loadSubjects = async () => {
    const { data, error } = await supabase
      .from("teacher_assignments")
      .select("subject")
      .order("subject");

    if (error) {
      console.error("Error loading subjects:", error);
      return;
    }

    const uniqueSubjects = [...new Set(data?.map((item) => item.subject).filter(Boolean))];
    setSubjects(uniqueSubjects.sort());
  };

  const loadAssignments = async () => {
    try {
      // ✅ UPDATED: Gunakan academic info untuk filter default
      const { activeSemester, activeSemesterId: activeYearId } = await getActiveAcademicInfo();

      let query = supabase
        .from("teacher_assignments")
        .select("*")
        .order("created_at", { ascending: false });

      // ✅ UPDATED: Gunakan applyAcademicFilters untuk konsistensi
      if (selectedAcademicYear || selectedSemester) {
        // Jika ada filter manual, gunakan yang dipilih user
        if (selectedAcademicYear) {
          query = query.eq("academic_year_id", selectedAcademicYear);
        }
        if (selectedSemester) {
          query = query.eq("semester", selectedSemester);
        }
      } else {
        // Jika tidak ada filter, gunakan akademik aktif
        query = await applyAcademicFilters(query, {
          filterSemester: true,
          filterYearId: true,
        });

        // Set filter UI ke akademik aktif
        const activeYear = academicYears.find((y) => y.is_active);
        if (activeYear) {
          setSelectedAcademicYear(activeYear.id);
          setSelectedSemester(activeSemester.toString());
        }
      }

      // Filter lainnya tetap sama
      if (selectedClass) {
        query = query.eq("class_id", selectedClass);
      }
      if (selectedTeacher) {
        query = query.eq("teacher_id", selectedTeacher);
      }
      if (selectedSubject) {
        query = query.ilike("subject", `%${selectedSubject}%`);
      }

      const { data: assignmentsData, error } = await query;

      if (error) throw error;

      // Manual join - fetch related data
      if (assignmentsData && assignmentsData.length > 0) {
        const teacherIds = [...new Set(assignmentsData.map((a) => a.teacher_id))];
        const classIds = [...new Set(assignmentsData.map((a) => a.class_id))];
        const yearIds = [...new Set(assignmentsData.map((a) => a.academic_year_id))];

        // Fetch related users
        const { data: usersData } = await supabase
          .from("users")
          .select("id, teacher_id, full_name, username, role")
          .in("teacher_id", teacherIds);

        // Fetch related classes
        const { data: classesData } = await supabase
          .from("classes")
          .select("id, grade, academic_year")
          .in("id", classIds);

        // Fetch related academic years
        const { data: yearsData } = await supabase
          .from("academic_years")
          .select("id, year, semester, is_active")
          .in("id", yearIds);

        // Create lookup maps
        const usersMap = {};
        usersData?.forEach((u) => {
          usersMap[u.teacher_id] = u;
        });

        const classesMap = {};
        classesData?.forEach((c) => {
          classesMap[c.id] = c;
        });

        const yearsMap = {};
        yearsData?.forEach((y) => {
          yearsMap[y.id] = y;
        });

        // Join data manually
        const enrichedData = assignmentsData.map((assignment) => ({
          ...assignment,
          users: usersMap[assignment.teacher_id] || null,
          classes: classesMap[assignment.class_id] || null,
          academic_years: yearsMap[assignment.academic_year_id] || null,
        }));

        // ✅ CONDITIONAL SORT
        if (selectedSubject || selectedClass || selectedTeacher) {
          // Kalau ada filter aktif → Sort by Kelas (Grade + Class ID)
          enrichedData.sort((a, b) => {
            const gradeA = parseInt(a.classes?.grade || "0");
            const gradeB = parseInt(b.classes?.grade || "0");

            if (gradeA !== gradeB) {
              return gradeA - gradeB;
            }

            const classA = a.classes?.id || "";
            const classB = b.classes?.id || "";
            return classA.localeCompare(classB);
          });
        } else {
          // Kalau LOAD SEMUA (no filter) → Sort by Kode Guru dulu, terus Kelas
          enrichedData.sort((a, b) => {
            const teacherA = a.teacher_id || "";
            const teacherB = b.teacher_id || "";

            // Sort by teacher_id first (G-01, G-02, ...)
            if (teacherA !== teacherB) {
              return teacherA.localeCompare(teacherB);
            }

            // Kalau guru sama, sort by grade
            const gradeA = parseInt(a.classes?.grade || "0");
            const gradeB = parseInt(b.classes?.grade || "0");

            if (gradeA !== gradeB) {
              return gradeA - gradeB;
            }

            // Kalau grade juga sama, sort by class ID
            const classA = a.classes?.id || "";
            const classB = b.classes?.id || "";
            return classA.localeCompare(classB);
          });
        }

        // Filter by search query
        let filteredData = enrichedData;
        if (searchQuery) {
          filteredData = filteredData.filter(
            (a) =>
              a.users?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              a.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              a.classes?.id?.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }

        setAssignments(filteredData);
        calculateStats(filteredData);
      } else {
        setAssignments([]);
        calculateStats([]);
      }
    } catch (error) {
      console.error("Error loading assignments:", error);
      showToast?.("Gagal memuat penugasan", "error");
    }
  };

  const calculateStats = async (assignmentData) => {
    try {
      // ✅ UPDATED: Gunakan academic info dinamis
      const { activeSemesterId: activeYearId } = await getActiveAcademicInfo();

      const activeAssignments = assignmentData.filter((a) => a.academic_year_id === activeYearId);

      const assignedTeacherIds = new Set(activeAssignments.map((a) => a.teacher_id));
      const teachersWithoutAssignment = teachers.filter(
        (t) => !assignedTeacherIds.has(t.teacher_id)
      ).length;

      const assignedClassIds = new Set(activeAssignments.map((a) => a.class_id));
      const classesWithoutTeacher = classes.filter((c) => !assignedClassIds.has(c.id)).length;

      // Hitung mata pelajaran tanpa guru di tahun aktif
      const allSubjects = [...new Set(activeAssignments.map((a) => a.subject))];
      const subjectsWithoutTeacher = allSubjects.filter((subject) => {
        const teachersForSubject = activeAssignments
          .filter((a) => a.subject === subject)
          .map((a) => a.teacher_id);
        return teachersForSubject.length === 0;
      }).length;

      setStats({
        totalAssignments: assignmentData.length,
        activeAssignments: activeAssignments.length,
        teachersWithoutAssignment,
        classesWithoutTeacher,
        subjectsWithoutTeacher,
      });
    } catch (error) {
      console.error("Error calculating stats:", error);
    }
  };

  const handleOpenModal = async (mode, assignment = null) => {
    setModalMode(mode);
    setEditingAssignment(assignment);

    if (mode === "edit" && assignment) {
      setFormData({
        teacher_id: assignment.teacher_id,
        class_id: assignment.class_id,
        subject: assignment.subject,
        academic_year_id: assignment.academic_year_id,
        semester: assignment.semester,
      });
    } else {
      try {
        // ✅ UPDATED: Set default semester dari data dinamis
        const { activeSemester, activeSemesterId: activeYearId } = await getActiveAcademicInfo();

        setFormData({
          teacher_id: "",
          class_id: "",
          subject: "",
          academic_year_id: selectedAcademicYear || activeYearId || "",
          semester: selectedSemester || activeSemester.toString() || "1",
        });
      } catch (error) {
        console.error("Error getting academic info:", error);
        // Fallback ke default jika error
        setFormData({
          teacher_id: "",
          class_id: "",
          subject: "",
          academic_year_id: selectedAcademicYear || "",
          semester: selectedSemester || "1",
        });
      }
    }

    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAssignment(null);
    setFormData({
      teacher_id: "",
      class_id: "",
      subject: "",
      academic_year_id: "",
      semester: "1",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (
      !formData.teacher_id ||
      !formData.subject ||
      !formData.academic_year_id ||
      !formData.semester ||
      !formData.class_id
    ) {
      showToast?.("Mohon lengkapi semua field", "error");
      return;
    }

    setSubmitting(true);

    try {
      if (modalMode === "edit") {
        // Update existing assignment
        const { error } = await supabase
          .from("teacher_assignments")
          .update({
            teacher_id: formData.teacher_id,
            class_id: formData.class_id,
            subject: formData.subject,
            academic_year_id: formData.academic_year_id,
            semester: formData.semester,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingAssignment.id);

        if (error) throw error;
        showToast?.("Penugasan berhasil diupdate", "success");
      } else {
        // Create new assignment
        // Check for duplicates
        const { data: existing } = await supabase
          .from("teacher_assignments")
          .select("id")
          .eq("teacher_id", formData.teacher_id)
          .eq("class_id", formData.class_id)
          .eq("subject", formData.subject)
          .eq("academic_year_id", formData.academic_year_id)
          .eq("semester", formData.semester)
          .single();

        if (existing) {
          const teacherName = teachers.find((t) => t.teacher_id === formData.teacher_id)?.full_name;
          const className = classes.find((c) => c.id === formData.class_id)?.name;
          showToast?.(
            `Penugasan sudah ada: ${teacherName} - ${className} - ${formData.subject}`,
            "error"
          );
          setSubmitting(false);
          return;
        }

        const { error } = await supabase.from("teacher_assignments").insert([
          {
            teacher_id: formData.teacher_id,
            class_id: formData.class_id,
            subject: formData.subject,
            academic_year_id: formData.academic_year_id,
            semester: formData.semester,
            created_at: new Date().toISOString(),
          },
        ]);

        if (error) throw error;
        showToast?.("Berhasil menambahkan penugasan", "success");
      }

      handleCloseModal();
      loadAssignments();
    } catch (error) {
      console.error("Error saving assignment:", error);
      showToast?.("Gagal menyimpan penugasan: " + error.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ Fungsi untuk buka modal hapus
  const handleOpenDeleteModal = (assignment) => {
    setDeleteTarget(assignment);
    setDeleteConfirmText("");
    setShowDeleteModal(true);
  };

  // ✅ Fungsi untuk close modal hapus
  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteTarget(null);
    setDeleteConfirmText("");
  };

  // ✅ Fungsi untuk proses hapus (setelah konfirmasi)
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    // Validasi konfirmasi text
    const expectedText = "HAPUS";
    if (deleteConfirmText.toUpperCase() !== expectedText) {
      showToast?.(`Ketik "${expectedText}" untuk konfirmasi`, "error");
      return;
    }

    setDeletingAssignment(true);

    try {
      const { error } = await supabase
        .from("teacher_assignments")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) throw error;

      showToast?.("Penugasan berhasil dihapus", "success");
      handleCloseDeleteModal();
      loadAssignments();
    } catch (error) {
      console.error("Error deleting assignment:", error);
      showToast?.("Gagal menghapus penugasan: " + error.message, "error");
    } finally {
      setDeletingAssignment(false);
    }
  };

  const handleCopyToNewYear = async () => {
    if (!selectedAcademicYear) {
      showToast?.("Pilih tahun ajaran yang akan dicopy", "error");
      return;
    }

    if (!window.confirm("Copy semua penugasan ke tahun ajaran baru?")) {
      return;
    }

    try {
      setSubmitting(true);

      // Get target academic year (next year)
      const sourceYear = academicYears.find((y) => y.id === selectedAcademicYear);
      const targetYear = academicYears.find((y) => y.year > sourceYear.year && !y.is_active);

      if (!targetYear) {
        showToast?.("Tidak ada tahun ajaran target", "error");
        return;
      }

      // Get assignments to copy
      const { data: sourceAssignments } = await supabase
        .from("teacher_assignments")
        .select("*")
        .eq("academic_year_id", selectedAcademicYear);

      if (!sourceAssignments || sourceAssignments.length === 0) {
        showToast?.("Tidak ada penugasan untuk dicopy", "error");
        return;
      }

      // Create new assignments
      const newAssignments = sourceAssignments.map((a) => ({
        teacher_id: a.teacher_id,
        class_id: a.class_id,
        subject: a.subject,
        academic_year_id: targetYear.id,
        semester: "1", // Reset to semester 1
        created_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from("teacher_assignments").insert(newAssignments);

      if (error) throw error;

      showToast?.(
        `Berhasil copy ${newAssignments.length} penugasan ke ${targetYear.year}`,
        "success"
      );
      setSelectedAcademicYear(targetYear.id);
      loadAssignments();
    } catch (error) {
      console.error("Error copying assignments:", error);
      showToast?.("Gagal copy penugasan: " + error.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetFilters = async () => {
    try {
      // ✅ UPDATED: Reset ke akademik aktif
      const { activeSemester, activeSemesterId: activeYearId } = await getActiveAcademicInfo();
      const activeYear = academicYears.find((y) => y.is_active);

      setSelectedAcademicYear(activeYear?.id || "");
      setSelectedSemester(activeSemester.toString());
      setSelectedClass("");
      setSelectedTeacher("");
      setSelectedSubject("");
      setSearchQuery("");
    } catch (error) {
      console.error("Error resetting filters:", error);
      const activeYear = academicYears.find((y) => y.is_active);
      setSelectedAcademicYear(activeYear?.id || "");
      setSelectedSemester("");
      setSelectedClass("");
      setSelectedTeacher("");
      setSelectedSubject("");
      setSearchQuery("");
    }
  };

  const toggleRowExpand = (assignmentId) => {
    setExpandedRows((prev) => ({
      ...prev,
      [assignmentId]: !prev[assignmentId],
    }));
  };

  // ✅ TAMBAH INI - Export/Import Handlers
  const handleDownloadTemplate = async () => {
    await downloadTemplate(showToast);
  };

  const handleExportData = async () => {
    try {
      // ✅ UPDATED: Gunakan academic info dinamis
      const info = await getActiveAcademicInfo();
      const { displayText, fullDisplayText: semesterText } = info;

      const filters = {
        academicYear: academicYears.find((y) => y.id === selectedAcademicYear)?.year,
        semester: selectedSemester ? `Semester ${selectedSemester}` : null,
        class: selectedClass,
        teacher: teachers.find((t) => t.teacher_id === selectedTeacher)?.full_name,
        subject: selectedSubject,
        academicInfo: displayText, // ✅ Tambahkan info akademik
      };
      await exportAssignments(assignments, showToast);
    } catch (error) {
      console.error("Error getting academic info for export:", error);
      const filters = {
        academicYear: academicYears.find((y) => y.id === selectedAcademicYear)?.year,
        semester: selectedSemester ? `Semester ${selectedSemester}` : null,
        class: selectedClass,
        teacher: teachers.find((t) => t.teacher_id === selectedTeacher)?.full_name,
        subject: selectedSubject,
      };
    }
  };

  const handleImportClick = () => {
    setShowImportModal(true);
    setImportStep("upload");
    setImportFile(null);
    setValidationResult(null);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file type
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ];
      if (!validTypes.includes(file.type)) {
        showToast?.("File harus berformat Excel (.xlsx atau .xls)", "error");
        return;
      }
      setImportFile(file);
    }
  };

  const handleValidateImport = async () => {
    if (!importFile) {
      showToast?.("Pilih file Excel terlebih dahulu", "error");
      return;
    }

    setImportStep("validating");

    try {
      // Read Excel file
      const jsonData = await readExcelFile(importFile);

      // Validate data
      const result = await validateImportData(jsonData, showToast);
      setValidationResult(result);

      if (result.success) {
        setImportStep("preview");
        showToast?.(`Validasi berhasil: ${result.summary.valid} data valid`, "success");
      } else {
        setImportStep("preview");
        showToast?.(`Ditemukan ${result.summary.invalid} error. Periksa detail error.`, "error");
      }
    } catch (error) {
      console.error("Error validating import:", error);
      showToast?.("Gagal membaca file: " + error.message, "error");
      setImportStep("upload");
    }
  };

  const handleConfirmImport = async () => {
    if (!validationResult || !validationResult.success) {
      showToast?.("Data tidak valid untuk diimport", "error");
      return;
    }

    setImportStep("importing");

    try {
      const result = await importAssignments(validationResult.validData, importMode, showToast);

      if (result.success) {
        setShowImportModal(false);
        loadAssignments(); // Reload data
        showToast?.(
          `Import selesai: ${result.inserted} baru, ${result.updated} diupdate, ${result.skipped} di-skip`,
          "success"
        );
      } else {
        setImportStep("preview");
      }
    } catch (error) {
      console.error("Error importing data:", error);
      showToast?.("Gagal import data: " + error.message, "error");
      setImportStep("preview");
    }
  };

  const handleDownloadErrorReport = () => {
    if (validationResult && validationResult.errors.length > 0) {
      const success = generateErrorReport(validationResult);
      if (success) {
        showToast?.("Error report berhasil didownload", "success");
      } else {
        showToast?.("Gagal membuat error report", "error");
      }
    }
  };

  const handleCloseImportModal = () => {
    setShowImportModal(false);
    setImportFile(null);
    setValidationResult(null);
    setImportStep("upload");
  };

  // ✅ TAMBAH: Loading state untuk academic info
  if (academicLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">Memuat info tahun ajaran...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header - DENGAN INFO AKADEMIK DINAMIS */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Users className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              Manajemen Penugasan Guru
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Kelola penugasan guru ke kelas dan mata pelajaran
            </p>
          </div>

          {/* ✅ TAMBAH: Display akademik aktif */}
          {academicInfo && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 px-4 py-3 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    {academicInfo.displayText}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    {academicInfo.semesterText}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                Total Penugasan
              </p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                {stats.totalAssignments}
              </p>
            </div>
            <BookOpen className="w-10 h-10 text-blue-600/30 dark:text-blue-400/30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-xl border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                Penugasan Aktif
              </p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">
                {stats.activeAssignments}
              </p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-600/30 dark:text-green-400/30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-4 rounded-xl border border-orange-200 dark:border-orange-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                Guru Tanpa Tugas
              </p>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-300 mt-1">
                {stats.teachersWithoutAssignment}
              </p>
            </div>
            <AlertCircle className="w-10 h-10 text-orange-600/30 dark:text-orange-400/30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">Kelas Tanpa Guru</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1">
                {stats.classesWithoutTeacher}
              </p>
            </div>
            <AlertCircle className="w-10 h-10 text-red-600/30 dark:text-red-400/30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                Mapel Tanpa Guru
              </p>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1">
                {stats.subjectsWithoutTeacher}
              </p>
            </div>
            <AlertCircle className="w-10 h-10 text-purple-600/30 dark:text-purple-400/30" />
          </div>
        </div>
      </div>

      {/* ✅ TAMBAH INI - Action Buttons Bar */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 p-4 mb-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => handleOpenModal("create")}
            className="flex-1 min-w-[140px] px-4 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Tambah Penugasan</span>
          </button>
          <button
            onClick={handleCopyToNewYear}
            disabled={submitting || !selectedAcademicYear}
            className="flex-1 min-w-[140px] px-4 py-3 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Copy size={20} />
            <span className="hidden sm:inline">Copy ke TA Baru</span>
          </button>
          <button
            onClick={handleDownloadTemplate}
            className="flex-1 min-w-[140px] px-4 py-3 bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
          >
            <FileText size={20} />
            <span className="hidden sm:inline">Template</span>
          </button>
          <button
            onClick={handleExportData}
            disabled={assignments.length === 0}
            className="flex-1 min-w-[140px] px-4 py-3 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={20} />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={handleImportClick}
            className="flex-1 min-w-[140px] px-4 py-3 bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
          >
            <Upload size={20} />
            <span className="hidden sm:inline">Import</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            <Filter size={18} />
            Filter Data
          </h3>
          <button
            onClick={handleResetFilters}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Reset Filter
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari guru, kelas, atau mata pelajaran..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Teacher */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Guru
            </label>
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua</option>
              {teachers.map((teacher) => (
                <option key={teacher.teacher_id} value={teacher.teacher_id}>
                  {teacher.teacher_id} - {teacher.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Mata Pelajaran
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua</option>
              {subjects.map((subject, index) => (
                <option key={index} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>

          {/* Class */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Kelas
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.id}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tahun Ajaran
            </label>
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.year} {year.is_active && "✓"}
                </option>
              ))}
            </select>
          </div>

          {/* Semester */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Semester
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua</option>
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 w-12">
                  No
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Nama Guru
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                  ID Guru
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Kelas
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Mata Pelajaran
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Tahun Ajaran
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Semester
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 w-32">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <BookOpen className="w-12 h-12 text-gray-400" />
                      <p className="text-gray-500 dark:text-gray-400">Belum ada data penugasan</p>
                      <button
                        onClick={() => handleOpenModal("create")}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all flex items-center gap-2"
                      >
                        <Plus size={18} />
                        Tambah Penugasan
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                assignments.map((assignment, index) => (
                  <React.Fragment key={assignment.id}>
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {assignment.users?.full_name || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 font-mono">
                        {assignment.teacher_id}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {assignment.classes?.name || assignment.class_id}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {assignment.subject}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {assignment.academic_years?.year || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        Semester {assignment.semester}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenModal("edit", assignment)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleOpenDeleteModal(assignment)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-all"
                            title="Hapus"
                          >
                            <Trash2 size={16} />
                          </button>
                          <button
                            onClick={() => toggleRowExpand(assignment.id)}
                            className="p-2 text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg transition-all"
                            title="Detail"
                          >
                            {expandedRows[assignment.id] ? (
                              <ChevronUp size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedRows[assignment.id] && (
                      <tr className="bg-blue-50/50 dark:bg-blue-900/10">
                        <td colSpan="8" className="px-4 py-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600 dark:text-gray-400">ID Penugasan:</p>
                              <p className="font-mono text-xs">{assignment.id}</p>
                            </div>
                            <div>
                              <p className="text-gray-600 dark:text-gray-400">Role Guru:</p>
                              <p>{assignment.users?.role || "-"}</p>
                            </div>
                            <div>
                              <p className="text-gray-600 dark:text-gray-400">Dibuat:</p>
                              <p>
                                {assignment.created_at
                                  ? new Date(assignment.created_at).toLocaleDateString("id-ID")
                                  : "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600 dark:text-gray-400">Status TA:</p>
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  assignment.academic_years?.is_active
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                    : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
                                }`}
                              >
                                {assignment.academic_years?.is_active ? "Aktif" : "Tidak Aktif"}
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form - CREATE & EDIT */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {modalMode === "edit" ? (
                    <Edit2 className="w-6 h-6 text-white" />
                  ) : (
                    <Plus className="w-6 h-6 text-white" />
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {modalMode === "edit" ? "Edit Penugasan" : "Tambah Penugasan Baru"}
                    </h3>
                    <p className="text-sm text-blue-100 mt-1">
                      {modalMode === "edit"
                        ? "Update data penugasan guru"
                        : "Tambahkan penugasan guru ke kelas"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-5">
                {/* Guru */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Guru <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.teacher_id}
                    onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Pilih Guru --</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.teacher_id} value={teacher.teacher_id}>
                        {teacher.teacher_id} - {teacher.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Kelas */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Kelas <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.class_id}
                    onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Pilih Kelas --</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.id}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Mata Pelajaran */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Mata Pelajaran <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Contoh: Matematika, Bahasa Indonesia"
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Tahun Ajaran & Semester */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Tahun Ajaran <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.academic_year_id}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          academic_year_id: e.target.value,
                        })
                      }
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">-- Pilih TA --</option>
                      {academicYears.map((year) => (
                        <option key={year.id} value={year.id}>
                          {year.year} {year.is_active && "✓"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Semester <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.semester}
                      onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">-- Pilih --</option>
                      <option value="1">Semester 1</option>
                      <option value="2">Semester 2</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      {modalMode === "edit" ? "Update" : "Simpan"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                  Import Data Penugasan
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {importStep === "upload" && "Upload file Excel untuk import data"}
                  {importStep === "validating" && "Memvalidasi data..."}
                  {importStep === "preview" && "Preview dan konfirmasi import"}
                  {importStep === "importing" && "Mengimport data..."}
                </p>
              </div>
              <button
                onClick={handleCloseImportModal}
                disabled={importStep === "validating" || importStep === "importing"}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* STEP 1: Upload File */}
              {importStep === "upload" && (
                <div className="space-y-6">
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center">
                    <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                      Upload File Excel
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Pilih file Excel (.xlsx atau .xls) yang berisi data penugasan
                    </p>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="import-file"
                    />
                    <label
                      htmlFor="import-file"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium cursor-pointer transition-all"
                    >
                      <FileText size={18} />
                      Pilih File
                    </label>
                    {importFile && (
                      <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <p className="text-sm text-green-800 dark:text-green-300 flex items-center justify-center gap-2">
                          <CheckCircle size={16} />
                          File terpilih: <strong>{importFile.name}</strong>
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                          Panduan Import:
                        </p>
                        <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                          <li>1. Download template Excel terlebih dahulu</li>
                          <li>2. Isi data sesuai format yang tersedia</li>
                          <li>3. Upload file yang sudah diisi</li>
                          <li>4. Sistem akan validasi otomatis</li>
                          <li>5. Preview data sebelum disimpan</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Validating */}
              {importStep === "validating" && (
                <div className="py-12 text-center">
                  <Loader className="w-12 h-12 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    Memvalidasi Data...
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Mohon tunggu, sedang memeriksa data Excel
                  </p>
                </div>
              )}

              {/* STEP 3: Preview & Validation Result */}
              {importStep === "preview" && validationResult && (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                        Total Data
                      </p>
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                        {validationResult.summary.total}
                      </p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800">
                      <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                        Data Valid
                      </p>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">
                        {validationResult.summary.valid}
                      </p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
                      <p className="text-sm text-red-600 dark:text-red-400 font-medium">Error</p>
                      <p className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1">
                        {validationResult.summary.invalid}
                      </p>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-200 dark:border-orange-800">
                      <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                        Warning
                      </p>
                      <p className="text-2xl font-bold text-orange-700 dark:text-orange-300 mt-1">
                        {validationResult.summary.warnings}
                      </p>
                    </div>
                  </div>

                  {/* Errors */}
                  {validationResult.errors.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-semibold text-red-800 dark:text-red-300 flex items-center gap-2">
                          <AlertCircle size={18} />
                          Ditemukan {validationResult.errors.length} Error
                        </h5>
                        <button
                          onClick={handleDownloadErrorReport}
                          className="text-sm text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
                        >
                          <Download size={14} />
                          Download Error Report
                        </button>
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {validationResult.errors.slice(0, 10).map((err, idx) => (
                          <div
                            key={idx}
                            className="bg-white dark:bg-gray-800 p-3 rounded border border-red-200 dark:border-red-800"
                          >
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                              Baris {err.row}:
                            </p>
                            <ul className="text-xs text-red-700 dark:text-red-400 mt-1 list-disc list-inside">
                              {err.errors.map((e, i) => (
                                <li key={i}>{e}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                        {validationResult.errors.length > 10 && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                            ... dan {validationResult.errors.length - 10} error lainnya
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {validationResult.warnings.length > 0 && (
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                      <h5 className="font-semibold text-orange-800 dark:text-orange-300 flex items-center gap-2 mb-2">
                        <AlertCircle size={18} />
                        Warning ({validationResult.warnings.length})
                      </h5>
                      <div className="max-h-40 overflow-y-auto">
                        <ul className="text-xs text-orange-700 dark:text-orange-400 space-y-1">
                          {validationResult.warnings.slice(0, 10).map((w, idx) => (
                            <li key={idx}>• {w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Import Mode Selection */}
                  {validationResult.success &&
                    validationResult.warnings.some((w) => w.includes("sudah ada")) && (
                      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <h5 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">
                          Mode Import:
                        </h5>
                        <div className="space-y-2">
                          <label className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                            <input
                              type="radio"
                              name="importMode"
                              value="skip"
                              checked={importMode === "skip"}
                              onChange={(e) => setImportMode(e.target.value)}
                              className="w-4 h-4"
                            />
                            <div>
                              <p className="font-medium text-gray-800 dark:text-gray-200">
                                Skip Duplikat
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                Data yang sudah ada di database akan di-skip
                              </p>
                            </div>
                          </label>
                          <label className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                            <input
                              type="radio"
                              name="importMode"
                              value="update"
                              checked={importMode === "update"}
                              onChange={(e) => setImportMode(e.target.value)}
                              className="w-4 h-4"
                            />
                            <div>
                              <p className="font-medium text-gray-800 dark:text-gray-200">
                                Update Duplikat
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                Data yang sudah ada akan di-update dengan data baru
                              </p>
                            </div>
                          </label>
                        </div>
                      </div>
                    )}

                  {/* Preview Data */}
                  {validationResult.success && validationResult.validData.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">
                        Preview Data ({validationResult.validData.length} rows):
                      </h5>
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <div className="max-h-80 overflow-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                                  Guru
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                                  Kelas
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                                  Mapel
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                                  TA
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                                  Sem
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                              {validationResult.validData.slice(0, 50).map((row, idx) => (
                                <tr
                                  key={idx}
                                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                >
                                  <td className="px-3 py-2 text-xs text-gray-900 dark:text-gray-100">
                                    {row.teacher_id}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-gray-900 dark:text-gray-100">
                                    {row.class_id}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-gray-900 dark:text-gray-100">
                                    {row.subject}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-gray-900 dark:text-gray-100">
                                    {row.academic_year}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-gray-900 dark:text-gray-100">
                                    {row.semester}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {validationResult.validData.length > 50 && (
                            <div className="p-3 text-center text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700">
                              ... dan {validationResult.validData.length - 50} data lainnya
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: Importing */}
              {importStep === "importing" && (
                <div className="py-12 text-center">
                  <Loader className="w-12 h-12 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    Mengimport Data...
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Mohon tunggu, sedang menyimpan data ke database
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6 flex items-center justify-end gap-3">
              {importStep === "upload" && (
                <>
                  <button
                    onClick={handleCloseImportModal}
                    className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleValidateImport}
                    disabled={!importFile}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle size={18} />
                    Validasi Data
                  </button>
                </>
              )}

              {importStep === "preview" && (
                <>
                  <button
                    onClick={() => {
                      setImportStep("upload");
                      setImportFile(null);
                      setValidationResult(null);
                    }}
                    className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Kembali
                  </button>
                  {validationResult?.success && (
                    <button
                      onClick={handleConfirmImport}
                      className="px-5 py-2.5 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white rounded-lg font-medium transition-all flex items-center gap-2"
                    >
                      <Upload size={18} />
                      Import {validationResult.validData.length} Data
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Delete Confirmation */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
            {/* Header - RED WARNING */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 dark:from-red-700 dark:to-red-800 p-6 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-full">
                  <AlertCircle className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Konfirmasi Penghapusan</h3>
                  <p className="text-sm text-red-100 mt-1">Tindakan ini tidak dapat dibatalkan!</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Info Data yang akan dihapus */}
              <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                <p className="text-sm font-semibold text-red-900 dark:text-red-300 mb-3">
                  Data yang akan dihapus:
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-red-700 dark:text-red-400">Guru:</span>
                    <span className="font-semibold text-red-900 dark:text-red-200">
                      {deleteTarget.users?.full_name || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-700 dark:text-red-400">Kelas:</span>
                    <span className="font-semibold text-red-900 dark:text-red-200">
                      {deleteTarget.classes?.name || deleteTarget.class_id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-700 dark:text-red-400">Mata Pelajaran:</span>
                    <span className="font-semibold text-red-900 dark:text-red-200">
                      {deleteTarget.subject}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-700 dark:text-red-400">Tahun Ajaran:</span>
                    <span className="font-semibold text-red-900 dark:text-red-200">
                      {deleteTarget.academic_years?.year || "-"} - Semester {deleteTarget.semester}
                    </span>
                  </div>
                </div>
              </div>

              {/* Warning Message */}
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-orange-800 dark:text-orange-300">
                    <p className="font-semibold mb-1">Peringatan:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Data yang dihapus tidak dapat dikembalikan</li>
                      <li>History penugasan akan hilang permanen</li>
                      <li>Pastikan data sudah benar sebelum menghapus</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Konfirmasi Input - User harus ketik "HAPUS" */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Ketik{" "}
                  <span className="text-red-600 font-mono bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded">
                    HAPUS
                  </span>{" "}
                  untuk konfirmasi:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Ketik HAPUS (huruf besar)"
                  className="w-full px-4 py-2.5 border-2 border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono"
                  autoFocus
                />
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  * Untuk keamanan, Anda harus mengetik kata "HAPUS" dengan huruf besar
                </p>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 rounded-b-xl flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseDeleteModal}
                disabled={deletingAssignment}
                className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-white dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingAssignment || deleteConfirmText.toUpperCase() !== "HAPUS"}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingAssignment ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    Hapus Permanen
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherAssignmentTab;
