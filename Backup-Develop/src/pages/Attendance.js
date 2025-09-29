import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import RecapModal from "./RecapModal";
import * as XLSX from "xlsx";

const Attendance = ({ user, onShowToast }) => {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [students, setStudents] = useState([]);
  const [attendanceStatus, setAttendanceStatus] = useState({});
  const [attendanceNotes, setAttendanceNotes] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [teacherId, setTeacherId] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(""); // ✅ State untuk search
  const [isHomeroomTeacher, setIsHomeroomTeacher] = useState(false);
  const [homeroomClass, setHomeroomClass] = useState(null);
  const [showRekapModal, setShowRekapModal] = useState(false);
  const [realtimeChannel, setRealtimeChannel] = useState(null);

  // Filter siswa berdasarkan pencarian
  const filteredStudents = students.filter(
    (student) =>
      student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.nis.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get attendance stats for display
  const getAttendanceStats = () => {
    const stats = { Hadir: 0, Sakit: 0, Izin: 0, Alpha: 0 };
    Object.values(attendanceStatus).forEach((status) => {
      if (stats[status] !== undefined) stats[status]++;
    });
    return stats;
  };

  // Set all students to 'Hadir'
  const setAllHadir = () => {
    const newStatus = {};
    students.forEach((student) => {
      newStatus[student.id] = "Hadir";
    });
    setAttendanceStatus(newStatus);

    const message = `Berhasil set ${students.length} siswa menjadi HADIR`;
    if (onShowToast) {
      onShowToast(message, "success");
    }
  };

  // Handle notes change
  const handleNotesChange = (studentId, notes) => {
    setAttendanceNotes((prev) => ({ ...prev, [studentId]: notes }));
  };

  // Show rekap modal
  const handleShowRekap = () => {
    setShowRekapModal(true);
  };

  // Export to Excel function
  const handleExportExcel = () => {
    if (students.length === 0) {
      onShowToast?.("❌ Tidak ada data siswa untuk diexport!", "error");
      return;
    }

    try {
      // Siapin data untuk Excel
      const excelData = [
        // Header
        ["REKAP PRESENSI SISWA"],
        [`Kelas: ${selectedClass}`],
        [`Mata Pelajaran: ${selectedSubject}`],
        [`Tanggal: ${date}`],
        [], // Baris kosong
        // Header Tabel
        ["NO", "NIS", "NAMA SISWA", "STATUS", "KETERANGAN"],
        // Data
        ...students.map((student, index) => [
          index + 1,
          student.nis,
          student.full_name,
          attendanceStatus[student.id] || "Hadir",
          attendanceNotes[student.id] || "",
        ]),
      ];

      // Buat workbook
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(excelData);

      // Atur lebar kolom
      worksheet["!cols"] = [
        { wch: 5 },
        { wch: 15 },
        { wch: 30 },
        { wch: 10 },
        { wch: 25 },
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, "Presensi");

      // Download file
      const fileName = `Presensi_${selectedClass}_${date}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      onShowToast?.("✅ File Excel berhasil diunduh!", "success");
    } catch (error) {
      console.error("❌ Error exporting to Excel:", error);
      onShowToast?.("❌ Gagal mengunduh file Excel", "error");
    }
  };

  // Check if current selection is homeroom daily attendance
  const isHomeroomDaily = () => {
    return selectedSubject.includes("Presensi Harian");
  };

  // REALTIME EFFECT
  useEffect(() => {
    if (!teacherId) return;

    const channel = supabase
      .channel(`attendance-${teacherId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "attendances",
        },
        (payload) => {
          if (onShowToast) {
            onShowToast("Presensi baru ditambahkan", "info");
          }
        }
      )
      .subscribe();

    setRealtimeChannel(channel);
    return () => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [teacherId, onShowToast]);

  // CLEANUP REALTIME CHANNEL
  useEffect(() => {
    return () => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [realtimeChannel]);

  // Auth check - use props user instead of localStorage
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (user) {
          console.log("Attendance - Using props user:", user);

          const { data: teacherData, error: teacherError } = await supabase
            .from("users")
            .select("teacher_id, homeroom_class_id")
            .eq("username", user.username)
            .single();

          if (teacherError) {
            console.error("Error fetching teacher data:", teacherError);
            setMessage("Error: Data guru tidak ditemukan");
          } else if (teacherData) {
            setTeacherId(teacherData.teacher_id);
            if (teacherData.homeroom_class_id) {
              setIsHomeroomTeacher(true);
              setHomeroomClass(teacherData.homeroom_class_id);
            }
          }
        } else {
          setMessage("Silakan login terlebih dahulu");
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setMessage("Error: Terjadi kesalahan sistem");
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, [user]);

  // FETCH SUBJECTS
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!teacherId) return;
      try {
        const { data, error } = await supabase
          .from("teacher_assignments")
          .select("subject")
          .eq("teacher_id", teacherId);

        if (error) {
          console.error("Error fetching subjects:", error);
          setMessage("Error: Gagal mengambil mata pelajaran");
          return;
        }

        const uniqueSubjects = [...new Set(data.map((item) => item.subject))];

        // Add homeroom daily attendance option if user is homeroom teacher
        if (isHomeroomTeacher && homeroomClass) {
          uniqueSubjects.push(`Presensi Harian Kelas ${homeroomClass}`);
        }

        setSubjects(uniqueSubjects);
      } catch (error) {
        console.error("Error in fetchSubjects:", error);
        setMessage("Error: Terjadi kesalahan sistem");
      }
    };

    fetchSubjects();
  }, [teacherId, isHomeroomTeacher, homeroomClass]);

  // FETCH CLASSES
  useEffect(() => {
    const fetchClasses = async () => {
      if (!selectedSubject || !teacherId) {
        setClasses([]);
        return;
      }

      try {
        // If homeroom daily attendance is selected, set to homeroom class only
        if (isHomeroomDaily()) {
          const formattedClasses = [
            {
              id: homeroomClass,
              grade: homeroomClass.charAt(0),
              displayName: `Kelas ${homeroomClass}`,
            },
          ];
          setClasses(formattedClasses);
          setSelectedClass(homeroomClass); // Auto select homeroom class
          return;
        }

        const { data: assignmentData, error: assignmentError } = await supabase
          .from("teacher_assignments")
          .select("class_id")
          .eq("teacher_id", teacherId)
          .eq("subject", selectedSubject);

        if (assignmentError) throw assignmentError;
        if (!assignmentData?.length) {
          setClasses([]);
          setMessage("Tidak ada kelas untuk mata pelajaran ini");
          return;
        }

        const classIds = assignmentData.map((item) => item.class_id);
        const { data: classData, error: classError } = await supabase
          .from("classes")
          .select("id, grade")
          .in("id", classIds);

        if (classError) throw classError;

        const formattedClasses = classData.map((cls) => ({
          id: cls.id,
          grade: cls.grade,
          displayName: `Kelas ${cls.id}`,
        }));

        setClasses(formattedClasses);
      } catch (error) {
        console.error("Error fetching classes:", error);
        setMessage("Error: Gagal mengambil data kelas - " + error.message);
      }
    };

    fetchClasses();
  }, [selectedSubject, teacherId, isHomeroomTeacher, homeroomClass]);

  // FETCH STUDENTS
  const fetchStudentsForClass = async (classId) => {
    if (!classId) {
      setStudents([]);
      return;
    }

    try {
      setLoading(true);
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, full_name, nis")
        .eq("class_id", classId)
        .eq("is_active", true)
        .order("full_name");

      if (studentsError) throw studentsError;

      setStudents(studentsData || []);

      // Reset attendance status
      const newStatus = {};
      studentsData.forEach((student) => {
        newStatus[student.id] = "Hadir";
      });
      setAttendanceStatus(newStatus);
    } catch (error) {
      console.error("Error fetching students:", error);
      setMessage("Error: Gagal mengambil data siswa - " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClass) {
      fetchStudentsForClass(selectedClass);
    }
  }, [selectedClass]);

  // Handler untuk mengubah status presensi per siswa
  const handleStatusChange = (studentId, status) => {
    setAttendanceStatus((prev) => ({ ...prev, [studentId]: status }));
  };

  // Simpan presensi ke database
  const handleSubmit = async () => {
    if (!teacherId || !selectedSubject || !selectedClass) {
      setMessage("Pilih mata pelajaran dan kelas terlebih dahulu!");
      return;
    }

    if (students.length === 0) {
      setMessage("Tidak ada siswa untuk diabsen!");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // 1. DAPATIN UUID GURU DARI TABLE USERS
      const { data: teacherUser, error: teacherError } = await supabase
        .from("users")
        .select("id")
        .eq("teacher_id", teacherId)
        .single();

      if (teacherError) {
        console.error("Error fetching teacher UUID:", teacherError);
        throw new Error("Gagal mengambil data guru: " + teacherError.message);
      }

      if (!teacherUser) {
        throw new Error("Data guru tidak ditemukan di sistem");
      }

      const teacherUUID = teacherUser.id;

      // 2. TENTUKAN SUBJECT DAN TYPE BERDASARKAN PILIHAN
      const subjectValue = isHomeroomDaily() ? "Harian" : selectedSubject;
      const typeValue = isHomeroomDaily() ? "harian" : "mapel";

      // 3. CEK APAKAH SUDAH ADA PRESENSI
      const sampleStudentId = students[0]?.id;
      if (sampleStudentId) {
        const { data: existingAttendance, error: checkError } = await supabase
          .from("attendances")
          .select("id")
          .eq("teacher_id", teacherUUID)
          .eq("date", date)
          .eq("type", typeValue)
          .eq("student_id", sampleStudentId)
          .limit(1);

        if (checkError) {
          console.error("Error checking existing attendance:", checkError);
        }

        if (existingAttendance && existingAttendance.length > 0) {
          const message = `Presensi untuk tanggal ${date} sudah tersimpan sebelumnya`;
          if (onShowToast) {
            onShowToast(message, "error");
          }
          setLoading(false);
          return;
        }
      }

      // 4. PREPARE DATA UNTUK DISIMPAN
      const attendanceData = students.map((student) => ({
        student_id: student.id,
        teacher_id: teacherUUID,
        date: date,
        subject: subjectValue,
        class_id: selectedClass,
        type: typeValue,
        status: attendanceStatus[student.id] || "Hadir",
        notes: attendanceNotes[student.id] || null,
      }));

      // 5. INSERT DATA DENGAN BATCH
      const BATCH_SIZE = 5;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < attendanceData.length; i += BATCH_SIZE) {
        const batch = attendanceData.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from("attendances").insert(batch);
        if (error) console.log("Batch error detail:", error);

        if (error) {
          console.error(
            `Error inserting batch ${Math.floor(i / BATCH_SIZE) + 1}:`,
            error
          );
          errorCount += batch.length;
        } else {
          successCount += batch.length;
        }
      }

      if (errorCount > 0) {
        throw new Error(
          `Berhasil menyimpan ${successCount} data, gagal ${errorCount} data. Silakan coba lagi.`
        );
      }

      if (onShowToast) {
        onShowToast(
          `Presensi berhasil disimpan untuk ${successCount} siswa!`,
          "success"
        );
      }

      // 6. RESET FORM SETELAH BERHASIL
      setTimeout(() => {
        setSelectedClass("");
        setSelectedSubject("");
        setAttendanceStatus({});
        setAttendanceNotes({});
        setMessage("");
      }, 2000);
    } catch (error) {
      console.error("Error saving attendance:", error);
      const errorMsg = "Gagal menyimpan presensi: " + error.message;
      setMessage(errorMsg);
      if (onShowToast) {
        onShowToast(errorMsg, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-blue-500 text-lg">Memeriksa autentikasi...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 text-lg">
            Anda harus login untuk mengakses halaman ini
          </p>
        </div>
      </div>
    );
  }

  const stats = getAttendanceStats();

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header Section */}
      <div className="mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-semibold text-slate-800 mb-2">
                Input Presensi
              </h1>
              <p className="text-slate-600">
                Kelola kehadiran siswa untuk mata pelajaran dan kelas
              </p>
            </div>
            <div className="text-right">
              <div className="text-slate-800 font-medium">
                {user?.full_name || user?.username}
              </div>
              <div className="flex gap-2 mt-2">
                {isHomeroomTeacher && (
                  <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    Wali Kelas {homeroomClass}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.includes("Error") || message.includes("Gagal")
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-green-50 text-green-700 border border-green-200"
          }`}>
          {message}
        </div>
      )}

      {/* Filters Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Mata Pelajaran */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Mata Pelajaran
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setSelectedClass("");
                setStudents([]);
              }}
              disabled={loading || !teacherId}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition">
              <option value="">Pilih Mata Pelajaran</option>
              {subjects.map((subject, index) => (
                <option key={index} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>

          {/* Kelas */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Kelas
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              disabled={!selectedSubject || loading || isHomeroomDaily()}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:bg-slate-50">
              <option value="">Pilih Kelas</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Tanggal */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Tanggal
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={loading}
              max={new Date().toISOString().split("T")[0]}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
          </div>
        </div>
      </div>

      {students.length > 0 && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
              <div className="flex items-center">
                <div className="text-green-600 text-xl mr-3">✓</div>
                <div>
                  <div className="text-2xl font-bold text-slate-800">
                    {stats.Hadir}
                  </div>
                  <div className="text-sm text-slate-600">Hadir</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-yellow-500">
              <div className="flex items-center">
                <div className="text-yellow-600 text-xl mr-3">🏥</div>
                <div>
                  <div className="text-2xl font-bold text-slate-800">
                    {stats.Sakit}
                  </div>
                  <div className="text-sm text-slate-600">Sakit</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
              <div className="flex items-center">
                <div className="text-blue-600 text-xl mr-3">📋</div>
                <div>
                  <div className="text-2xl font-bold text-slate-800">
                    {stats.Izin}
                  </div>
                  <div className="text-sm text-slate-600">Izin</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-red-500">
              <div className="flex items-center">
                <div className="text-red-600 text-xl mr-3">❌</div>
                <div>
                  <div className="text-2xl font-bold text-slate-800">
                    {stats.Alpha}
                  </div>
                  <div className="text-sm text-slate-600">Alpha</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mb-6 items-center">
            {/* Search Input - Diperlebar */}
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Cari siswa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition w-full"
                style={{ minWidth: "250px" }}
              />
              <span className="absolute right-3 top-2.5 text-slate-400">
                🔍
              </span>
            </div>

            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={setAllHadir}
              disabled={loading}>
              ✅ Hadir Semua
            </button>

            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSubmit}
              disabled={
                loading ||
                !selectedSubject ||
                !selectedClass ||
                students.length === 0
              }>
              {loading ? "Menyimpan..." : "💾 Simpan Presensi"}
            </button>

            <button
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleShowRekap}
              disabled={
                !selectedClass || !selectedSubject || students.length === 0
              }>
              📊 Lihat Rekap
            </button>

            <button
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleExportExcel}
              disabled={students.length === 0}>
              📈 Export Excel
            </button>
          </div>

          {/* Student Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">
                Daftar Siswa -{" "}
                {classes.find((c) => c.id === selectedClass)?.displayName}
                {searchTerm && ` (Filtered: ${filteredStudents.length} siswa)`}
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">
                      No
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">
                      NIS
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">
                      Nama Siswa
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">
                      Status Kehadiran
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">
                      Keterangan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student, index) => (
                    <tr
                      key={student.id}
                      className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {student.nis}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        {student.full_name}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                              attendanceStatus[student.id] === "Hadir"
                                ? "bg-green-500 text-white"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                            onClick={() =>
                              handleStatusChange(student.id, "Hadir")
                            }
                            disabled={loading}>
                            ✓ Hadir
                          </button>
                          <button
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                              attendanceStatus[student.id] === "Sakit"
                                ? "bg-yellow-500 text-white"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                            onClick={() =>
                              handleStatusChange(student.id, "Sakit")
                            }
                            disabled={loading}>
                            🏥 Sakit
                          </button>
                          <button
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                              attendanceStatus[student.id] === "Izin"
                                ? "bg-blue-500 text-white"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                            onClick={() =>
                              handleStatusChange(student.id, "Izin")
                            }
                            disabled={loading}>
                            📋 Izin
                          </button>
                          <button
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                              attendanceStatus[student.id] === "Alpha"
                                ? "bg-red-500 text-white"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                            onClick={() =>
                              handleStatusChange(student.id, "Alpha")
                            }
                            disabled={loading}>
                            ❌ Alpha
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                          placeholder="Keterangan..."
                          value={attendanceNotes[student.id] || ""}
                          onChange={(e) =>
                            handleNotesChange(student.id, e.target.value)
                          }
                          disabled={loading}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Empty States */}
      {selectedClass && students.length === 0 && !loading && (
        <div className="bg-white p-8 rounded-xl shadow-sm text-center text-slate-500">
          <p>Tidak ada siswa aktif di kelas ini</p>
        </div>
      )}

      {!selectedClass && selectedSubject && classes.length === 0 && (
        <div className="bg-white p-8 rounded-xl shadow-sm text-center text-slate-500">
          <p>Tidak ada kelas untuk mata pelajaran ini</p>
        </div>
      )}

      {!selectedSubject && (
        <div className="bg-white p-8 rounded-xl shadow-sm text-center text-slate-500">
          <p>Pilih mata pelajaran untuk memulai</p>
        </div>
      )}

      {/* Rekap Modal */}
      <RecapModal
        showModal={showRekapModal}
        onClose={() => setShowRekapModal(false)}
        attendanceMode={isHomeroomDaily() ? "daily" : "subject"}
        selectedClass={selectedClass}
        selectedSubject={selectedSubject}
        homeroomClass={homeroomClass}
        students={students}
        onShowToast={onShowToast}
      />
    </div>
  );
};

export default Attendance;
