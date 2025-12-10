import React, { useState, useEffect } from "react";
import {
  FileDown,
  Printer,
  RefreshCw,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { supabase } from "../../supabaseClient";

const AcademicGradesView = ({ classId, className }) => {
  const [gradesData, setGradesData] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [semester, setSemester] = useState("1");
  const [academicYear, setAcademicYear] = useState("2024/2025");
  const [academicYears, setAcademicYears] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch data tahun ajaran
  useEffect(() => {
    fetchAcademicYears();
  }, []);

  // Fetch grades data
  useEffect(() => {
    if (classId) {
      fetchGradesData();
      setCurrentPage(1); // Reset ke halaman pertama saat data berubah
    }
  }, [classId, semester, academicYear]);

  const fetchAcademicYears = async () => {
    try {
      const { data, error } = await supabase
        .from("academic_years")
        .select("year")
        .order("year", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setAcademicYears(data.map((item) => item.year));
        setAcademicYear(data[0].year);
      }
    } catch (error) {
      console.error("Error fetching academic years:", error);
      setAcademicYears(["2024/2025", "2023/2024"]);
    }
  };

  const fetchGradesData = async () => {
    setLoading(true);
    try {
      // 1. Fetch semua siswa di kelas ini
      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("id, name, nis")
        .eq("class_id", classId)
        .order("name");

      if (studentsError) throw studentsError;

      // 2. Fetch semua mata pelajaran
      const { data: subjectsData, error: subjectsError } = await supabase
        .from("subjects")
        .select("id, name")
        .order("name");

      if (subjectsError) throw subjectsError;

      setSubjects(subjectsData || []);

      // 3. Fetch semua nilai untuk siswa-siswa ini
      const studentIds = students.map((s) => s.id);

      const { data: grades, error: gradesError } = await supabase
        .from("grades")
        .select(
          `
          id,
          student_id,
          subject_id,
          grade,
          semester,
          academic_year
        `
        )
        .in("student_id", studentIds)
        .eq("semester", semester)
        .eq("academic_year", academicYear);

      if (gradesError) throw gradesError;

      // 4. Format data untuk ditampilkan di tabel
      const formattedData = students.map((student, index) => {
        const studentGrades = {};
        let totalGrades = 0;
        let gradeCount = 0;

        subjectsData.forEach((subject) => {
          const gradeRecord = grades?.find(
            (g) => g.student_id === student.id && g.subject_id === subject.id
          );

          if (gradeRecord && gradeRecord.grade !== null) {
            studentGrades[subject.id] = gradeRecord.grade;
            totalGrades += parseFloat(gradeRecord.grade);
            gradeCount++;
          } else {
            studentGrades[subject.id] = "-";
          }
        });

        const average =
          gradeCount > 0 ? (totalGrades / gradeCount).toFixed(2) : "-";
        const total = gradeCount > 0 ? totalGrades.toFixed(0) : "-";

        return {
          no: index + 1,
          studentId: student.id,
          nis: student.nis,
          name: student.name,
          grades: studentGrades,
          total: total,
          average: average,
        };
      });

      setGradesData(formattedData);
    } catch (error) {
      console.error("Error fetching grades data:", error);
      alert("Gagal memuat data nilai. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = async () => {
    try {
      // Import dinamis untuk ExcelJS (kalau diperlukan)
      alert("Fitur export Excel akan segera hadir!");
      // TODO: Implementasi export ke Excel
    } catch (error) {
      console.error("Error exporting:", error);
      alert("Gagal export data");
    }
  };

  const handleRefresh = () => {
    fetchGradesData();
  };

  // Pagination logic
  const totalPages = Math.ceil(gradesData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = gradesData.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Memuat data nilai...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm">
      {/* Header Section */}
      <div className="p-4 sm:p-6 border-b dark:border-slate-700">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-slate-200">
              Nilai Akademik
            </h2>
            <p className="text-gray-600 dark:text-slate-400 mt-1 text-sm sm:text-base">
              Kelas:{" "}
              <span className="font-semibold text-gray-800 dark:text-slate-200">
                {className}
              </span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 print:hidden">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 rounded-lg transition text-sm sm:text-base min-h-[44px]">
              <RefreshCw size={18} className="flex-shrink-0" />
              <span className="hidden xs:inline">Refresh</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-800/50 text-blue-700 dark:text-blue-400 rounded-lg transition text-sm sm:text-base min-h-[44px]">
              <Printer size={18} className="flex-shrink-0" />
              <span className="hidden xs:inline">Print</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm sm:text-base min-h-[44px]">
              <FileDown size={18} className="flex-shrink-0" />
              <span className="hidden xs:inline">Export Excel</span>
            </button>
          </div>
        </div>

        {/* Filter Section */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 print:hidden">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Semester
            </label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 text-sm sm:text-base min-h-[44px]">
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Tahun Ajaran
            </label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 text-sm sm:text-base min-h-[44px]">
              {academicYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="p-3 sm:p-4 md:p-6 overflow-x-auto">
        {gradesData.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <p className="text-gray-500 dark:text-slate-400 text-base sm:text-lg">
              Tidak ada data nilai
            </p>
            <p className="text-gray-400 dark:text-slate-500 text-sm mt-2">
              Silakan input nilai terlebih dahulu
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-gray-300 dark:border-slate-700">
              <table className="w-full border-collapse min-w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-900">
                    <th className="border border-gray-300 dark:border-slate-700 px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-center font-semibold text-gray-700 dark:text-slate-300 text-xs sm:text-sm w-12 sm:w-16 whitespace-nowrap">
                      No
                    </th>
                    <th className="border border-gray-300 dark:border-slate-700 px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-left font-semibold text-gray-700 dark:text-slate-300 text-xs sm:text-sm min-w-[120px] sm:min-w-[200px] whitespace-nowrap">
                      Nama Siswa
                    </th>

                    {/* Kolom Mata Pelajaran (Dinamis) */}
                    {subjects.slice(0, 3).map((subject) => (
                      <th
                        key={subject.id}
                        className="border border-gray-300 dark:border-slate-700 px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-center font-semibold text-gray-700 dark:text-slate-300 text-xs sm:text-sm min-w-[80px] sm:min-w-[100px] whitespace-nowrap">
                        <span className="truncate block">{subject.name}</span>
                      </th>
                    ))}

                    {subjects.length > 3 && (
                      <>
                        {/* Show more subjects on larger screens */}
                        {subjects.slice(3).map((subject) => (
                          <th
                            key={subject.id}
                            className="hidden md:table-cell border border-gray-300 dark:border-slate-700 px-3 md:px-4 py-2 sm:py-3 text-center font-semibold text-gray-700 dark:text-slate-300 text-sm min-w-[100px] whitespace-nowrap">
                            <span className="truncate block">
                              {subject.name}
                            </span>
                          </th>
                        ))}
                      </>
                    )}

                    <th className="border border-gray-300 dark:border-slate-700 px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-center font-semibold text-gray-700 dark:text-slate-300 text-xs sm:text-sm w-16 sm:w-24 whitespace-nowrap">
                      Jumlah
                    </th>
                    <th className="border border-gray-300 dark:border-slate-700 px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-center font-semibold text-gray-700 dark:text-slate-300 text-xs sm:text-sm w-20 sm:w-28 whitespace-nowrap">
                      Rata-rata
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {currentData.map((student) => (
                    <tr
                      key={student.studentId}
                      className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="border border-gray-300 dark:border-slate-700 px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-center text-gray-700 dark:text-slate-400 text-xs sm:text-sm">
                        {student.no}
                      </td>
                      <td className="border border-gray-300 dark:border-slate-700 px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-gray-800 dark:text-slate-200 text-sm">
                        <div className="font-medium">{student.name}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                          {student.nis}
                        </div>
                      </td>

                      {/* Nilai per Mata Pelajaran (Mobile: hanya 3 kolom pertama) */}
                      {subjects.slice(0, 3).map((subject) => (
                        <td
                          key={subject.id}
                          className="border border-gray-300 dark:border-slate-700 px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-center text-sm">
                          {student.grades[subject.id] === "-" ? (
                            <span className="text-gray-400 dark:text-slate-500">
                              -
                            </span>
                          ) : (
                            <span
                              className={
                                student.grades[subject.id] >= 75
                                  ? "text-green-600 dark:text-green-400 font-semibold"
                                  : "text-red-600 dark:text-red-400 font-semibold"
                              }>
                              {student.grades[subject.id]}
                            </span>
                          )}
                        </td>
                      ))}

                      {/* More subjects on larger screens */}
                      {subjects.length > 3 && (
                        <>
                          {subjects.slice(3).map((subject) => (
                            <td
                              key={subject.id}
                              className="hidden md:table-cell border border-gray-300 dark:border-slate-700 px-3 md:px-4 py-2 sm:py-3 text-center text-sm">
                              {student.grades[subject.id] === "-" ? (
                                <span className="text-gray-400 dark:text-slate-500">
                                  -
                                </span>
                              ) : (
                                <span
                                  className={
                                    student.grades[subject.id] >= 75
                                      ? "text-green-600 dark:text-green-400 font-semibold"
                                      : "text-red-600 dark:text-red-400 font-semibold"
                                  }>
                                  {student.grades[subject.id]}
                                </span>
                              )}
                            </td>
                          ))}
                        </>
                      )}

                      <td className="border border-gray-300 dark:border-slate-700 px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-center font-semibold text-gray-800 dark:text-slate-200 text-sm">
                        {student.total}
                      </td>
                      <td className="border border-gray-300 dark:border-slate-700 px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-center font-bold text-blue-600 dark:text-blue-400 text-sm">
                        {student.average}
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Footer dengan Rata-rata Kelas */}
                {gradesData.length > 0 && (
                  <tfoot>
                    <tr className="bg-blue-50 dark:bg-blue-900/20">
                      <td
                        colSpan={2}
                        className="border border-gray-300 dark:border-slate-700 px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-center font-bold text-gray-800 dark:text-slate-200 text-sm">
                        Rata-rata Kelas
                      </td>

                      {subjects.slice(0, 3).map((subject) => {
                        const subjectGrades = gradesData
                          .map((s) => s.grades[subject.id])
                          .filter((g) => g !== "-")
                          .map((g) => parseFloat(g));

                        const avg =
                          subjectGrades.length > 0
                            ? (
                                subjectGrades.reduce((a, b) => a + b, 0) /
                                subjectGrades.length
                              ).toFixed(2)
                            : "-";

                        return (
                          <td
                            key={subject.id}
                            className="border border-gray-300 dark:border-slate-700 px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-center font-bold text-blue-600 dark:text-blue-400 text-sm">
                            {avg}
                          </td>
                        );
                      })}

                      {/* More subjects on larger screens */}
                      {subjects.length > 3 && (
                        <>
                          {subjects.slice(3).map((subject) => {
                            const subjectGrades = gradesData
                              .map((s) => s.grades[subject.id])
                              .filter((g) => g !== "-")
                              .map((g) => parseFloat(g));

                            const avg =
                              subjectGrades.length > 0
                                ? (
                                    subjectGrades.reduce((a, b) => a + b, 0) /
                                    subjectGrades.length
                                  ).toFixed(2)
                                : "-";

                            return (
                              <td
                                key={subject.id}
                                className="hidden md:table-cell border border-gray-300 dark:border-slate-700 px-3 md:px-4 py-2 sm:py-3 text-center font-bold text-blue-600 dark:text-blue-400 text-sm">
                                {avg}
                              </td>
                            );
                          })}
                        </>
                      )}

                      <td className="border border-gray-300 dark:border-slate-700 px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-center font-bold text-gray-800 dark:text-slate-200 text-sm">
                        -
                      </td>
                      <td className="border border-gray-300 dark:border-slate-700 px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-center font-bold text-blue-600 dark:text-blue-400 text-sm">
                        {gradesData.length > 0
                          ? (
                              gradesData
                                .map((s) => parseFloat(s.average))
                                .filter((a) => !isNaN(a))
                                .reduce((a, b) => a + b, 0) /
                              gradesData.filter((s) => s.average !== "-").length
                            ).toFixed(2)
                          : "-"}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Pagination untuk Mobile */}
            {totalPages > 1 && (
              <div className="mt-4 sm:mt-6 print:hidden">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">
                    Menampilkan {startIndex + 1} -{" "}
                    {Math.min(endIndex, gradesData.length)} dari{" "}
                    {gradesData.length} siswa
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors min-h-[36px] sm:min-h-[40px]"
                      aria-label="Halaman sebelumnya">
                      <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors min-h-[36px] sm:min-h-[40px] min-w-[36px] sm:min-w-[40px] ${
                                currentPage === pageNum
                                  ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white"
                                  : "border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700"
                              }`}
                              aria-label={`Halaman ${pageNum}`}>
                              {pageNum}
                            </button>
                          );
                        }
                      )}
                    </div>

                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors min-h-[36px] sm:min-h-[40px]"
                      aria-label="Halaman berikutnya">
                      <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Note untuk Mobile */}
            <div className="mt-3 text-xs text-gray-500 dark:text-slate-500 md:hidden print:hidden">
              <p>
                📱 Geser ke samping untuk melihat lebih banyak mata pelajaran
              </p>
            </div>
          </>
        )}
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          table,
          table * {
            visibility: visible;
          }
          table {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            size: landscape;
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
};

export default AcademicGradesView;
