import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import StudentForm from "./StudentForm";
import StudentList from "./StudentList";
import Statistics from "./Statistics";
import ClassDivision from "./ClassDivision";

// Custom hook untuk toast notifications
const useToast = () => {
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "info",
  });

  const showToast = useCallback((message, type = "info") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "info" });
    }, 3000);
  }, []);

  return { toast, showToast };
};

// Custom hook untuk academic year
const useAcademicYear = () => {
  const getCurrentAcademicYear = useCallback(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (currentMonth >= 7) {
      return `${currentYear}/${currentYear + 1}`;
    } else {
      return `${currentYear - 1}/${currentYear}`;
    }
  }, []);

  return { getCurrentAcademicYear };
};

// Custom hook untuk date conversion
const useDateFormatter = () => {
  const convertDateFormat = useCallback((dateString) => {
    if (!dateString) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }

    if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(dateString)) {
      const parts = dateString.split(/[-/]/);
      const day = parts[0];
      const month = parts[1];
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
      return date.toISOString().split("T")[0];
    } catch (e) {
      console.warn("Cannot parse date:", dateString);
      return null;
    }
  }, []);

  return { convertDateFormat };
};

// Custom hook untuk students data management
const useStudentsData = (userData, showToast) => {
  const [students, setStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const { getCurrentAcademicYear } = useAcademicYear();
  const { convertDateFormat } = useDateFormatter();

  // Load students data dengan PAGINATION
  const loadStudents = useCallback(
    async (page = 1, search = "") => {
      setIsLoading(true);
      try {
        const rowsPerPage = 20;
        const from = (page - 1) * rowsPerPage;
        const to = from + rowsPerPage - 1;

        console.log("Loading students:", { page, from, to, search });

        let query = supabase
          .from("siswa_baru")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(from, to);

        if (search.trim()) {
          query = query.or(
            `nama_lengkap.ilike.%${search}%,asal_sekolah.ilike.%${search}%,nama_ayah.ilike.%${search}%,nama_ibu.ilike.%${search}%,no_pendaftaran.ilike.%${search}%`
          );
        }

        const { data, count, error } = await query;

        if (error) {
          console.error("Query error:", error);
          throw error;
        }

        const calculatedTotalPages = Math.ceil((count || 0) / rowsPerPage);

        console.log("Pagination data:", {
          dataLength: data?.length,
          count: count,
          from: from,
          to: to,
          rowsPerPage: rowsPerPage,
          calculatedTotalPages: calculatedTotalPages,
          currentPage: page,
        });

        setTotalStudents(count || 0);
        setStudents(data || []);

        // Load all students untuk statistik
        if (!search.trim() && allStudents.length === 0) {
          console.log("Loading all students for statistics...");
          const { data: allData } = await supabase
            .from("siswa_baru")
            .select("*")
            .order("created_at", { ascending: false });
          setAllStudents(allData || []);
        } else if (search.trim()) {
          setAllStudents(data || []);
        }

        return {
          data: data || [],
          totalPages: calculatedTotalPages,
          totalStudents: count || 0,
        };
      } catch (error) {
        console.error("Error loading students:", error);
        showToast("Gagal memuat data siswa", "error");
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [allStudents.length, showToast]
  );

  // Generate nomor pendaftaran
  const generateNoPendaftaran = useCallback(async () => {
    try {
      const academicYear = getCurrentAcademicYear().replace("/", "");

      const { data, error } = await supabase
        .from("siswa_baru")
        .select("no_pendaftaran")
        .like("no_pendaftaran", `PMB${academicYear}%`)
        .order("no_pendaftaran", { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextNumber = 1;
      if (data && data.length > 0) {
        const lastNo = data[0].no_pendaftaran;
        const lastNumber = parseInt(lastNo.slice(-3));
        nextNumber = lastNumber + 1;
      }

      return `PMB${academicYear}${String(nextNumber).padStart(3, "0")}`;
    } catch (error) {
      console.error("Error generating no_pendaftaran:", error);
      return `PMB${getCurrentAcademicYear().replace("/", "")}001`;
    }
  }, [getCurrentAcademicYear]);

  // Save student
  const saveStudent = useCallback(
    async ({ studentData, parentData, isEdit, editingStudent }) => {
      setIsLoading(true);
      try {
        const noPendaftaran = isEdit
          ? editingStudent.no_pendaftaran
          : await generateNoPendaftaran();

        const combinedData = {
          no_pendaftaran: noPendaftaran,
          nama_lengkap: studentData.nama,
          nisn: studentData.nisn,
          jenis_kelamin: studentData.jenis_kelamin,
          tempat_lahir: studentData.tempat_lahir,
          tanggal_lahir: convertDateFormat(studentData.tanggal_lahir),
          asal_sekolah: studentData.asal_sekolah,
          nama_ayah: parentData.nama_ayah,
          pekerjaan_ayah: parentData.pekerjaan_ayah,
          pendidikan_ayah: parentData.pendidikan_ayah,
          nama_ibu: parentData.nama_ibu,
          pekerjaan_ibu: parentData.pekerjaan_ibu,
          pendidikan_ibu: parentData.pendidikan_ibu,
          no_hp: parentData.no_hp,
          alamat: parentData.alamat,
          academic_year: getCurrentAcademicYear(),
          status: "diterima",
          is_transferred: false,
          tanggal_daftar: new Date().toISOString(),
        };

        let result;
        if (isEdit && editingStudent) {
          result = await supabase
            .from("siswa_baru")
            .update(combinedData)
            .eq("id", editingStudent.id);
        } else {
          result = await supabase.from("siswa_baru").insert([combinedData]);
        }

        if (result.error) throw result.error;

        showToast(
          `Data siswa berhasil ${
            isEdit ? "diupdate" : "didaftarkan"
          }! No. Pendaftaran: ${noPendaftaran}`,
          "success"
        );

        return true;
      } catch (error) {
        console.error("Error saving student:", error);
        showToast(
          `Gagal ${isEdit ? "mengupdate" : "menyimpan"} data: ${error.message}`,
          "error"
        );
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [
      convertDateFormat,
      getCurrentAcademicYear,
      generateNoPendaftaran,
      showToast,
    ]
  );

  // Delete student
  const deleteStudent = useCallback(
    async (id) => {
      if (!window.confirm("Apakah Anda yakin ingin menghapus data ini?")) {
        return false;
      }

      setIsLoading(true);
      try {
        const { error } = await supabase
          .from("siswa_baru")
          .delete()
          .eq("id", id);

        if (error) throw error;

        showToast("Data siswa berhasil dihapus!", "success");
        return true;
      } catch (error) {
        console.error("Error deleting student:", error);
        showToast("Gagal menghapus data: " + error.message, "error");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [showToast]
  );

  return {
    students,
    allStudents,
    totalStudents,
    isLoading,
    loadStudents,
    saveStudent,
    deleteStudent,
    setIsLoading,
  };
};

// Main SPMB Component
const SPMB = ({ user, onShowToast }) => {
  const [activeTab, setActiveTab] = useState("form");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingStudent, setEditingStudent] = useState(null);

  const { toast, showToast } = useToast();
  const { getCurrentAcademicYear } = useAcademicYear();
  const {
    students,
    allStudents,
    totalStudents,
    isLoading,
    loadStudents,
    saveStudent,
    deleteStudent,
  } = useStudentsData(user, onShowToast || showToast);

  // Initial load students
  useEffect(() => {
    const initializeData = async () => {
      const result = await loadStudents(1, "");
      if (result && result.totalPages) {
        setTotalPages(result.totalPages);
      }
    };

    initializeData();
  }, [loadStudents]);

  // Handle search dengan debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      console.log("Searching:", searchTerm);
      loadStudents(1, searchTerm).then((result) => {
        if (result && result.totalPages) {
          setTotalPages(result.totalPages);
          setCurrentPage(1);
        }
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, loadStudents]);

  // Handle page change
  const handlePageChange = useCallback(
    async (page) => {
      console.log("Changing to page:", page);
      setCurrentPage(page);
      const result = await loadStudents(page, searchTerm);
      if (result && result.totalPages) {
        setTotalPages(result.totalPages);
      }
    },
    [searchTerm, loadStudents]
  );

  // Handle edit student
  const handleEditStudent = useCallback((student) => {
    setEditingStudent(student);
    setActiveTab("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Handle form submission
  const handleSaveStudent = useCallback(
    async (formData) => {
      const success = await saveStudent({
        ...formData,
        editingStudent,
      });

      if (success) {
        setEditingStudent(null);
        const result = await loadStudents(currentPage, searchTerm);
        if (result && result.totalPages) {
          setTotalPages(result.totalPages);
        }
      }

      return success;
    },
    [saveStudent, editingStudent, loadStudents, currentPage, searchTerm]
  );

  // Handle delete student
  const handleDeleteStudent = useCallback(
    async (id) => {
      const success = await deleteStudent(id);
      if (success) {
        const result = await loadStudents(currentPage, searchTerm);
        if (result && result.totalPages) {
          setTotalPages(result.totalPages);
        }
      }
    },
    [deleteStudent, loadStudents, currentPage, searchTerm]
  );

  // Handle refresh data
  const handleRefreshData = useCallback(async () => {
    console.log("Refreshing data...");
    const result = await loadStudents(currentPage, searchTerm);
    if (result && result.totalPages) {
      setTotalPages(result.totalPages);
    }
  }, [loadStudents, currentPage, searchTerm]);

  // Calculate statistics
  const maleStudents = allStudents.filter(
    (s) => s.jenis_kelamin === "L"
  ).length;
  const femaleStudents = allStudents.filter(
    (s) => s.jenis_kelamin === "P"
  ).length;

  const navItems = [
    {
      key: "form",
      icon: "UserPlus",
      label: "Form",
      fullLabel: "Form Pendaftaran",
    },
    { key: "list", icon: "Users", label: "Data", fullLabel: "Data Siswa" },
    { key: "stats", icon: "BarChart3", label: "Stats", fullLabel: "Statistik" },
    {
      key: "division",
      icon: "Shuffle",
      label: "Kelas",
      fullLabel: "Pembagian Kelas",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white pb-20 sm:pb-6">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Toast Notification */}
        {toast.show && (
          <div
            className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border-l-4 animate-slide-down max-w-sm ${
              toast.type === "success"
                ? "bg-green-50 border-green-500 text-green-800"
                : toast.type === "error"
                ? "bg-red-50 border-red-500 text-red-800"
                : "bg-blue-50 border-blue-500 text-blue-800"
            }`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {toast.type === "success"
                  ? "✓"
                  : toast.type === "error"
                  ? "✕"
                  : "ℹ"}
              </span>
              <span className="text-sm font-medium">{toast.message}</span>
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 sm:p-8 shadow-lg">
          <div className="text-center space-y-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-wide">
              Sistem Penerimaan Murid Baru
            </h1>
            <div className="w-20 h-1 bg-white/50 mx-auto rounded-full"></div>
            <p className="text-blue-100 text-base sm:text-lg font-medium">
              SMP Muslimin Cililin
            </p>
            <p className="text-white font-semibold bg-blue-800/30 px-6 py-2 rounded-full inline-block text-sm sm:text-base">
              Tahun Ajaran {getCurrentAcademicYear()}
            </p>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <div className="hidden sm:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`flex-1 p-4 font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                  activeTab === item.key
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-blue-50"
                }`}>
                <span>{item.fullLabel}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          {activeTab === "form" && (
            <StudentForm
              editingStudent={editingStudent}
              setEditingStudent={setEditingStudent}
              students={allStudents}
              onSaveStudent={handleSaveStudent}
              isLoading={isLoading}
            />
          )}

          {activeTab === "list" && (
            <StudentList
              students={students}
              allStudents={allStudents}
              totalStudents={totalStudents}
              currentPageNum={currentPage}
              totalPages={totalPages}
              searchTerm={searchTerm}
              onSearch={setSearchTerm}
              onEditStudent={handleEditStudent}
              onDeleteStudent={handleDeleteStudent}
              onLoadStudents={handleRefreshData}
              onPageChange={handlePageChange}
              isLoading={isLoading}
              rowsPerPage={20}
              showToast={showToast}
            />
          )}

          {activeTab === "stats" && (
            <Statistics
              students={allStudents}
              totalStudents={totalStudents}
              maleStudents={maleStudents}
              femaleStudents={femaleStudents}
              getCurrentAcademicYear={getCurrentAcademicYear}
            />
          )}

          {activeTab === "division" && (
            <ClassDivision
              allStudents={allStudents}
              showToast={showToast}
              isLoading={isLoading}
              onRefreshData={handleRefreshData}
              supabase={supabase}
              getCurrentAcademicYear={getCurrentAcademicYear}
            />
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 sm:hidden z-40 shadow-lg">
        <div className="flex">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`flex-1 p-3 font-medium transition-all duration-200 flex flex-col items-center justify-center gap-1 ${
                activeTab === item.key
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-600"
              }`}>
              <span className="text-lg">
                {item.key === "form" ? "📝" : item.key === "list" ? "👥" : "📊"}
              </span>
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SPMB;
