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
  const [rekapMonth, setRekapMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  // Fetch rekap data dari database - FIXED QUERY
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
      // ✅ FIX: CARA BENER HITUNG END DATE
      const year = parseInt(month.split("-")[0]);
      const monthNum = parseInt(month.split("-")[1]);
      const lastDay = new Date(year, monthNum, 0).getDate();

      const startDate = `${month}-01`;
      const endDate = `${month}-${lastDay.toString().padStart(2, "0")}`; // Format DD dengan leading zero

      const subjectFilter =
        attendanceMode === "subject" ? selectedSubject : "Harian";
      const classFilter =
        attendanceMode === "subject" ? selectedClass : homeroomClass;
      const typeFilter = attendanceMode === "subject" ? "mapel" : "harian";

      console.log("🔍 Fetching rekap data dengan filter:", {
        startDate,
        endDate,
        subjectFilter,
        classFilter,
        typeFilter,
        attendanceMode,
        studentsCount: students.length,
      });

      // FIXED QUERY - Tidak pakai join, ambil attendance data aja
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

      // Prepare summary data untuk setiap siswa
      const studentSummary = {};
      students.forEach((student, index) => {
        studentSummary[student.id] = {
          no: index + 1,
          studentId: student.id,
          name: student.full_name, // Nama diambil dari props students
          hadir: 0,
          sakit: 0,
          izin: 0,
          alpha: 0,
          total: 0,
          percentage: "0%",
        };
      });

      // Process data attendance
      attendanceData.forEach((record) => {
        if (studentSummary[record.student_id]) {
          const status = record.status.toLowerCase();
          if (status === "hadir") {
            studentSummary[record.student_id].hadir++;
          } else if (status === "sakit") {
            studentSummary[record.student_id].sakit++;
          } else if (status === "izin") {
            studentSummary[record.student_id].izin++;
          } else if (status === "alpha") {
            studentSummary[record.student_id].alpha++;
          }
        }
      });

      // Calculate totals dan percentage
      Object.keys(studentSummary).forEach((studentId) => {
        const student = studentSummary[studentId];
        student.total =
          student.hadir + student.sakit + student.izin + student.alpha;
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

  // Export ke Excel (sementara alert dulu)
  const handleExportExcel = () => {
    if (rekapData.length === 0) {
      if (onShowToast) {
        onShowToast("❌ Tidak ada data untuk diexport!", "error");
      }
      return;
    }

    // TODO: Implement proper Excel export
    if (onShowToast) {
      onShowToast("📄 Fitur export Excel dalam pengembangan!", "info");
    }
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
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <div
        className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center">
          <h2 className="text-xl font-bold">📊 Rekap Presensi Bulanan</h2>
          <button
            className="text-white text-2xl hover:bg-white/20 p-1 rounded-lg transition"
            onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Filters */}
          <div className="mb-6">
            <div className="mb-4">
              <label className="block font-semibold text-gray-700 mb-2">
                Pilih Bulan:
              </label>
              <input
                type="month"
                value={rekapMonth}
                onChange={(e) => {
                  setRekapMonth(e.target.value);
                  fetchRekapData(e.target.value);
                }}
                className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Rekap Bulan{" "}
            {new Date(rekapMonth + "-01").toLocaleDateString("id-ID", {
              month: "long",
              year: "numeric",
            })}
            {attendanceMode === "subject" && selectedSubject && (
              <span> - {selectedSubject}</span>
            )}
            {attendanceMode === "daily" && <span> - Presensi Harian</span>}
          </h3>

          {/* Loading State */}
          {rekapLoading ? (
            <div className="flex items-center justify-center p-8 text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
              Memuat data rekap...
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">
                        No
                      </th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">
                        Nama Siswa
                      </th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">
                        Hadir
                      </th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">
                        Sakit
                      </th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">
                        Izin
                      </th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">
                        Alpha
                      </th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">
                        Total
                      </th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">
                        Persentase Kehadiran
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rekapData.length > 0 ? (
                      rekapData.map((student) => (
                        <tr
                          key={student.studentId}
                          className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-3">{student.no}</td>
                          <td className="p-3 font-medium text-gray-800">
                            {student.name}
                          </td>
                          <td className="p-3 text-green-600 font-semibold">
                            {student.hadir}
                          </td>
                          <td className="p-3 text-yellow-600 font-semibold">
                            {student.sakit}
                          </td>
                          <td className="p-3 text-blue-600 font-semibold">
                            {student.izin}
                          </td>
                          <td className="p-3 text-red-600 font-semibold">
                            {student.alpha}
                          </td>
                          <td className="p-3">{student.total}</td>
                          <td className="p-3 font-semibold">
                            {student.percentage}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="8"
                          className="p-8 text-center text-gray-500">
                          <div className="text-4xl mb-3">📅</div>
                          <h4 className="font-semibold mb-2">Belum Ada Data</h4>
                          <p>Belum ada data presensi untuk bulan ini</p>
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
        <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            onClick={handleExportExcel}>
            📄 Export Excel
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecapModal;
