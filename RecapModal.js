import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const RecapModal = ({
  showModal,
  onClose,
  attendanceMode,
  selectedClass,
  selectedSubject,
  homeroomClass,
  students,
  onShowToast,
}) => {
  const [rekapData, setRekapData] = useState([]);
  const [rekapLoading, setRekapLoading] = useState(false);
  const [rekapMonth, setRekapMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  // Generate year options (from 2025 to 2030)
  const yearOptions = [];
  const maxYear = 2030; // Batas tahun yang baru
  for (let year = 2025; year <= maxYear; year++) {
    yearOptions.push(year);
  }
  // Pastikan tahun saat ini (currentYear) ada jika lebih besar dari 2030
  const currentYear = new Date().getFullYear();
  if (currentYear > 2030 && !yearOptions.includes(currentYear)) {
      yearOptions.push(currentYear);
  }
  yearOptions.sort((a, b) => a - b); // Urutkan ulang

  // Month options
  const monthOptions = [
    { value: 1, label: "Januari" },
    { value: 2, label: "Februari" },
    { value: 3, label: "Maret" },
    { value: 4, label: "April" },
    { value: 5, label: "Mei" },
    { value: 6, label: "Juni" },
    { value: 7, label: "Juli" },
    { value: 8, label: "Agustus" },
    { value: 9, label: "September" },
    { value: 10, label: "Oktober" },
    { value: 11, label: "November" },
    { value: 12, label: "Desember" },
  ];

  // Handle month/year change
  const handleMonthYearChange = (month, year) => {
    const formattedMonth = `${year}-${String(month).padStart(2, '0')}`;
    setRekapMonth(formattedMonth);
    setSelectedMonth(month);
    setSelectedYear(year);
    fetchRekapData(formattedMonth);
  };
  const [attendanceDates, setAttendanceDates] = useState([]);

  // Fetch rekap data dari database
  const fetchRekapData = async (month = rekapMonth) => {
    if (
      (attendanceMode === "subject" && (!selectedClass || !selectedSubject)) ||
      (attendanceMode === "daily" && !homeroomClass)
    ) {
      if (onShowToast) {
        onShowToast("Pilih kelas dan mata pelajaran terlebih dahulu!", "error");
      }
      return;
    }

    if (!students || students.length === 0) {
      if (onShowToast) {
        onShowToast("Data siswa tidak tersedia!", "error");
      }
      return;
    }

    setRekapLoading(true);
    try {
      const year = parseInt(month.split("-")[0]);
      const monthNum = parseInt(month.split("-")[1]);
      const lastDay = new Date(year, monthNum, 0).getDate();

      const startDate = `${month}-01`;
      const endDate = `${month}-${lastDay.toString().padStart(2, "0")}`;

      const subjectFilter =
        attendanceMode === "subject" ? selectedSubject : "Harian";
      const classFilter =
        attendanceMode === "subject" ? selectedClass : homeroomClass;
      const typeFilter = attendanceMode === "subject" ? "mapel" : "harian";

      console.log("🔍 Fetching rekap data dengan filter:", {
        startDate,
        filter: {
          startDate,
          endDate,
          subjectFilter,
          classFilter,
          typeFilter,
          attendanceMode,
          studentsCount: students.length,
        },
      });

      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendances")
        .select("student_id, status, date")
        .eq("subject", subjectFilter)
        .eq("class_id", classFilter)
        .eq("type", typeFilter)
        .gte("date", startDate)
        .lte("date", endDate);

      if (attendanceError) {
        throw attendanceError;
      }

      console.log("📊 Raw attendance data:", attendanceData);

      // Get unique dates dan sort
      const uniqueDates = [...new Set(attendanceData.map((r) => r.date))].sort();
      setAttendanceDates(uniqueDates);

      // Prepare data dengan daily attendance
      const studentSummary = {};
      students.forEach((student, index) => {
        studentSummary[student.id] = {
          no: index + 1,
          studentId: student.id,
          name: student.full_name,
          dailyStatus: {},
          hadir: 0,
          sakit: 0,
          izin: 0,
          alpa: 0, // <--- FIX: Diubah dari "alpha" menjadi "alpa"
          total: 0,
          percentage: "0%",
        };
      });

      // Process attendance data
      attendanceData.forEach((record) => {
        if (studentSummary[record.student_id]) {
          const status = record.status.toLowerCase();
          
          // Simpan status per tanggal
          studentSummary[record.student_id].dailyStatus[record.date] = status;
          
          // Count summary
          if (status === "hadir") {
            studentSummary[record.student_id].hadir++;
          } else if (status === "sakit") {
            studentSummary[record.student_id].sakit++;
          } else if (status === "izin") {
            studentSummary[record.student_id].izin++;
          } else if (status === "alpa") { // <--- FIX: Diubah dari "alpha" menjadi "alpa"
            studentSummary[record.student_id].alpa++;
          }
        }
      });

      // Calculate totals dan percentage
      Object.keys(studentSummary).forEach((studentId) => {
        const student = studentSummary[studentId];
        student.total =
          student.hadir + student.sakit + student.izin + student.alpa;
        student.percentage =
          student.total > 0
            ? `${Math.round((student.hadir / student.total) * 100)}%`
            : "0%";
      });

      const finalData = Object.values(studentSummary);
      console.log("📈 Final rekap data:", finalData);

      setRekapData(finalData);

      if (onShowToast) {
        onShowToast(
          `✅ Data rekap berhasil dimuat untuk ${finalData.length} siswa`,
          "success"
        );
      }
    } catch (error) {
      console.error("❌ Error fetching rekap data:", error);
      const errorMsg = "❌ Gagal memuat data rekap: " + error.message;
      if (onShowToast) {
        onShowToast(errorMsg, "error");
      }
      setRekapData([]);
    } finally {
      setRekapLoading(false);
    }
  };

  // Helper function untuk format tanggal
  const formatDateHeader = (dateStr) => {
    const date = new Date(dateStr + "T00:00:00");
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return `${day}/${month}`;
  };

  // Helper untuk status badge
  const getStatusBadge = (status) => {
    if (!status) return <span className="text-gray-400">-</span>;
    
    const statusMap = {
      hadir: { text: "H", color: "bg-green-500 text-white" },
      sakit: { text: "S", color: "bg-yellow-500 text-white" },
      izin: { text: "I", color: "bg-blue-500 text-white" },
      alpa: { text: "A", color: "bg-red-500 text-white" }, // <--- FIX: Diubah dari "alpha" menjadi "alpa"
    };

    const statusInfo = statusMap[status.toLowerCase()] || { 
      text: "-", 
      color: "bg-gray-200 text-gray-500" 
    };
    
    return (
      <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    );
  };

  // Load data saat modal dibuka
  useEffect(() => {
    if (showModal) {
      fetchRekapData(rekapMonth);
    }
  }, [showModal, rekapMonth]);

  if (!showModal) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={onClose}>
      <div
        className="bg-white rounded-lg sm:rounded-xl w-full max-w-7xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        
        {/* Header - Horizontal Layout */}
        <div className="bg-gradient-to-r from-blue-400 to-blue-500 text-white p-3 sm:p-4 flex justify-between items-center flex-shrink-0 gap-3">
          <h2 className="text-sm sm:text-lg font-bold">📊 Rekap Presensi</h2>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => handleMonthYearChange(parseInt(e.target.value), selectedYear)}
                className="p-1.5 sm:p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-300 transition text-xs sm:text-sm text-gray-700 bg-white cursor-pointer">
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => handleMonthYearChange(selectedMonth, parseInt(e.target.value))}
                className="p-1.5 sm:p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-300 transition text-xs sm:text-sm text-gray-700 bg-white cursor-pointer">
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="text-white text-lg sm:text-xl hover:bg-white/20 p-1 rounded-lg transition"
              onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-3 sm:p-4 flex-1 flex flex-col overflow-hidden">
          {/* Compact Header - STICKY */}
          <div className="mb-2 text-center border border-gray-200 rounded-lg p-2 bg-white flex-shrink-0 sticky top-0 z-30 shadow-sm">
            <h3 className="text-sm sm:text-base font-bold text-gray-800">
              SMP MUSLIMIN CILILIN - REKAP PRESENSI KELAS{" "}
              {attendanceMode === "subject" ? selectedClass : homeroomClass}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600">
              {attendanceMode === "subject" && selectedSubject && (
                <>{selectedSubject.toUpperCase()}</>
              )}
              {attendanceMode === "daily" && <>PRESENSI HARIAN</>}
              {" | "}
              {new Date(rekapMonth + "-01").toLocaleDateString("id-ID", {
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          {/* Loading State */}
          {rekapLoading ? (
            <div className="flex items-center justify-center p-8 text-gray-500 flex-1">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
              Memuat data...
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm flex-1 flex flex-col">
              {/* Mobile: Swipe instruction */}
              {attendanceDates.length > 0 && (
                <div className="bg-blue-50 p-2 text-center text-xs text-blue-700 sm:hidden border-b border-blue-200 flex-shrink-0">
                  👉 Geser tabel ke kanan untuk melihat tanggal lainnya
                </div>
              )}
              
              <div className="overflow-auto flex-1">
                <table className="w-full text-xs sm:text-sm border-collapse">
                  <thead className="bg-gray-100 sticky top-0 z-20">
                    <tr className="border-b-2 border-gray-400">
                      {/* Fixed columns */}
                      <th className="p-2 text-center font-bold text-gray-800 border-r-2 border-gray-300 sticky left-0 bg-gray-100 z-30 min-w-[40px] sm:min-w-[50px]">
                        No.
                      </th>
                      <th className="p-2 text-left font-bold text-gray-800 border-r-2 border-gray-300 sticky left-[40px] sm:left-[50px] bg-gray-100 z-30 min-w-[140px] sm:min-w-[200px]">
                        Nama Siswa
                      </th>
                      
                      {/* Dynamic date columns */}
                      {attendanceDates.map((date, index) => (
                        <th
                          key={date}
                          className={`p-2 text-center font-bold text-gray-800 min-w-[45px] sm:min-w-[55px] whitespace-nowrap ${
                            index < attendanceDates.length - 1 ? 'border-r border-gray-300' : 'border-r-2 border-gray-400'
                          }`}>
                          {formatDateHeader(date)}
                        </th>
                      ))}
                      
                      {/* Summary columns */}
                      <th className="p-2 text-center font-bold text-green-700 border-r border-gray-300 min-w-[40px] sm:min-w-[50px] bg-green-50">
                        Hadir
                      </th>
                      <th className="p-2 text-center font-bold text-blue-700 border-r border-gray-300 min-w-[40px] sm:min-w-[50px] bg-blue-50">
                        Izin
                      </th>
                      <th className="p-2 text-center font-bold text-yellow-700 border-r border-gray-300 min-w-[40px] sm:min-w-[50px] bg-yellow-50">
                        Sakit
                      </th>
                      <th className="p-2 text-center font-bold text-red-700 border-r-2 border-gray-400 min-w-[40px] sm:min-w-[50px] bg-red-50">
                        Alpa
                      </th>
                      <th className="p-2 text-center font-bold text-gray-800 border-r border-gray-300 min-w-[45px] sm:min-w-[55px]">
                        Total
                      </th>
                      <th className="p-2 text-center font-bold text-gray-800 min-w-[50px] sm:min-w-[70px]">
                        Persentase
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rekapData.length > 0 ? (
                      rekapData.map((student) => (
                        <tr
                          key={student.studentId}
                          className="border-b border-gray-200 hover:bg-blue-50 transition">
                          {/* Fixed columns */}
                          <td className="p-2 text-center border-r-2 border-gray-300 sticky left-0 bg-white z-10 font-medium">
                            {student.no}
                          </td>
                          <td className="p-2 font-medium text-gray-800 border-r-2 border-gray-300 sticky left-[40px] sm:left-[50px] bg-white z-10">
                            {student.name}
                          </td>
                          
                          {/* Daily status */}
                          {attendanceDates.map((date, index) => (
                            <td
                              key={date}
                              className={`p-2 text-center ${
                                index < attendanceDates.length - 1 ? 'border-r border-gray-200' : 'border-r-2 border-gray-400'
                              }`}>
                              {getStatusBadge(student.dailyStatus[date])}
                            </td>
                          ))}
                          
                          {/* Summary */}
                          <td className="p-2 text-center text-green-700 font-bold border-r border-gray-200 bg-green-50/50">
                            {student.hadir}
                          </td>
                          <td className="p-2 text-center text-blue-700 font-bold border-r border-gray-200 bg-blue-50/50">
                            {student.izin}
                          </td>
                          <td className="p-2 text-center text-yellow-700 font-bold border-r border-gray-200 bg-yellow-50/50">
                            {student.sakit}
                          </td>
                          <td className="p-2 text-center text-red-700 font-bold border-r-2 border-gray-400 bg-red-50/50">
                            {student.alpa}
                          </td>
                          <td className="p-2 text-center font-bold text-gray-800 border-r border-gray-200">
                            {student.total}
                          </td>
                          <td className="p-2 text-center font-bold text-gray-800">
                            {student.percentage}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={attendanceDates.length + 8}
                          className="p-8 text-center text-gray-500">
                          <div className="text-3xl sm:text-4xl mb-3">📅</div>
                          <h4 className="font-semibold mb-2 text-sm sm:text-base">Belum Ada Data</h4>
                          <p className="text-xs sm:text-sm">Belum ada data presensi untuk bulan ini</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-3 sm:p-4 border-t border-gray-200 flex justify-end flex-shrink-0">
          <button
            className="w-full sm:w-auto px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm sm:text-base font-medium"
            onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecapModal;