//[file name]: Attendance.js (MERGED - Offline-first + Retry UI)
// ✅ File ini adalah hasil merge dari Attendance.js (versi lama) + Attendance-Offline.js
// Sekarang cuma ada 1 source of truth. Attendance-Offline.js sudah tidak dipakai lagi
// (boleh dihapus dari project setelah file ini menggantikannya).
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import AttendanceFilters from "./AttendanceFilters";
import AttendanceTable from "./AttendanceTable";
import AttendanceStats from "./AttendanceStats";

// ✅ IMPORT ACADEMIC YEAR SERVICE
import { getActiveAcademicInfo, filterBySemester } from "../../services/academicYearService";

// ✅ OFFLINE SUPPORT
import offlineHelper from "../../utils/offlineHelper";

// ✅ UTILITY FUNCTIONS - DATE HANDLING
const getDefaultDate = () => {
  const now = new Date();
  const wibOffset = 7 * 60;
  const localOffset = now.getTimezoneOffset();
  const wibTime = new Date(now.getTime() + (wibOffset + localOffset) * 60000);

  const year = wibTime.getFullYear();
  const month = String(wibTime.getMonth() + 1).padStart(2, "0");
  const day = String(wibTime.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getTodayWIB = () => {
  const now = new Date();
  const wibOffset = 7 * 60;
  const localOffset = now.getTimezoneOffset();
  const wibTime = new Date(now.getTime() + (wibOffset + localOffset) * 60000);
  wibTime.setHours(0, 0, 0, 0);
  return wibTime;
};

const parseDate = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

// ✅ UTILITY: Check if date is weekend (Saturday = 6, Sunday = 0)
const isWeekend = (dateString) => {
  const date = parseDate(dateString);
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // 0 = Sunday, 6 = Saturday
};

// ✅ UTILITY: Get next weekday if selected date is weekend
const getNextWeekday = (dateString) => {
  let date = parseDate(dateString);

  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

// ✅ REMINDER PRESENSI: Nama hari (Indonesia) sesuai kolom `day` di tabel teacher_schedules
const DAY_NAMES_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const getTodayDayNameWIB = () => {
  const todayWIB = getTodayWIB();
  const dayName = DAY_NAMES_ID[todayWIB.getDay()];
  // teacher_schedules cuma punya jadwal Senin-Jumat
  if (dayName === "Minggu" || dayName === "Sabtu") return null;
  return dayName;
};

// ✅ REMINDER PRESENSI: Jam operasional sekolah (WIB) per hari - reminder cuma
// boleh muncul di antara jam ini. Ubah di sini kalau jam sekolah berubah
// (misal Jumat pulang lebih awal karena sholat Jumat).
const REMINDER_HOURS_BY_DAY = {
  Senin: { start: "07:00", end: "14:00" },
  Selasa: { start: "07:00", end: "14:00" },
  Rabu: { start: "07:00", end: "14:00" },
  Kamis: { start: "07:00", end: "14:00" },
  Jumat: { start: "07:00", end: "10:40" },
};
const REMINDER_HOURS_DEFAULT = { start: "07:00", end: "14:00" };

const timeStringToMinutes = (timeStr) => {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

// ✅ Ambil jam operasional buat hari ini (fallback ke default kalau hari ga dikenali)
const getReminderHoursForToday = () => {
  const todayDayName = getTodayDayNameWIB();
  return REMINDER_HOURS_BY_DAY[todayDayName] || REMINDER_HOURS_DEFAULT;
};

const isWithinAttendanceReminderHours = () => {
  const now = new Date();
  const wibOffset = 7 * 60;
  const localOffset = now.getTimezoneOffset();
  const wibTime = new Date(now.getTime() + (wibOffset + localOffset) * 60000);
  const totalMinutes = wibTime.getHours() * 60 + wibTime.getMinutes();

  const { start, end } = getReminderHoursForToday();
  return totalMinutes >= timeStringToMinutes(start) && totalMinutes < timeStringToMinutes(end);
};

const Attendance = ({ user, onShowToast }) => {
  // ========== STATE MANAGEMENT ==========
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [date, setDate] = useState(getDefaultDate());
  const [students, setStudents] = useState([]);
  const [attendanceStatus, setAttendanceStatus] = useState({});
  const [attendanceNotes, setAttendanceNotes] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [teacherId, setTeacherId] = useState(null);
  // ✅ FIX: UUID guru (users.id) di-cache di state + IndexedDB, JANGAN di-fetch ulang
  // ke server tiap kali submit. Ini yang bikin offline-save gagal sebelumnya karena
  // selalu nyoba network call duluan walau lagi offline.
  const [teacherUUID, setTeacherUUID] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isHomeroomTeacher, setIsHomeroomTeacher] = useState(false);
  const [homeroomClass, setHomeroomClass] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [existingAttendanceData, setExistingAttendanceData] = useState(null);
  const [pendingAttendanceData, setPendingAttendanceData] = useState(null);
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // ✅ STATE UNTUK EXPORT EXCEL
  const [teacherAssignment, setTeacherAssignment] = useState(null);

  // ✅ ACADEMIC YEAR STATES
  const [activeAcademicInfo, setActiveAcademicInfo] = useState(null);
  const [selectedSemesterId, setSelectedSemesterId] = useState(null);
  const [availableSemesters, setAvailableSemesters] = useState([]);
  const [isReadOnlyMode, setIsReadOnlyMode] = useState(false);

  // ✅ OFFLINE STATES
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0); // ✅ BARU
  const [isRetrying, setIsRetrying] = useState(false); // ✅ BARU

  // ✅ REMINDER PRESENSI STATES
  const [showAttendanceReminder, setShowAttendanceReminder] = useState(false);
  const [unfinishedReminderClasses, setUnfinishedReminderClasses] = useState([]); // Array of { classId, subject }
  const [reminderChecked, setReminderChecked] = useState(false);

  // ✅ WEEKEND VALIDATION: Auto-skip to next weekday if weekend selected
  const handleDateChange = (newDate) => {
    if (isWeekend(newDate)) {
      const nextWeekday = getNextWeekday(newDate);
      console.log(`⚠️ Weekend detected (${newDate}), auto-skipping to ${nextWeekday}`);

      if (onShowToast) {
        const dateObj = parseDate(newDate);
        const dayName = dateObj.getDay() === 0 ? "Minggu" : "Sabtu";
        onShowToast(
          `Hari ${dayName} bukan hari efektif. Auto-skip ke hari kerja berikutnya.`,
          "warning"
        );
      }

      setDate(nextWeekday);
    } else {
      setDate(newDate);
    }
  };

  // ========== UTILITY FUNCTIONS ==========
  const isHomeroomDaily = useCallback(() => {
    return selectedSubject && selectedSubject.includes("PRESENSI HARIAN");
  }, [selectedSubject]);

  const filteredStudents = students.filter(
    (student) =>
      student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.nis.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ========== CORE HANDLERS ==========

  // ✅ VALIDATE DEFAULT DATE: Skip weekend on mount
  useEffect(() => {
    if (date && isWeekend(date)) {
      const nextWeekday = getNextWeekday(date);
      console.log(`⚠️ Initial date is weekend (${date}), auto-skipping to ${nextWeekday}`);
      setDate(nextWeekday);
    }
  }, []); // Only run on mount

  // ✅ OFFLINE INITIALIZATION
  useEffect(() => {
    offlineHelper.init();

    // ✅ FIX DataCloneError: daftarkan function sync-nya di sini (di memory),
    // BUKAN dikirim sebagai field ke addPending() (yang nyoba nyimpen ke IndexedDB
    // dan gagal karena function ga bisa di-structured-clone).
    offlineHelper.registerSyncHandler("save_attendance", async (data) => {
      await supabase
        .from("attendances")
        .delete()
        .eq("teacher_id", data[0].teacher_id)
        .eq("date", data[0].date)
        .eq("type", data[0].type)
        .eq("class_id", data[0].class_id);

      const BATCH_SIZE = 5;
      for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batch = data.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from("attendances").insert(batch);
        if (error) throw error; // ✅ Penting: biar retry mechanism di offlineHelper kedeteksi gagal
      }
    });

    const updateCounts = async () => {
      const count = await offlineHelper.getPendingCount();
      const failed = await offlineHelper.getFailedCount();
      setPendingCount(count);
      setFailedCount(failed);
    };

    offlineHelper.subscribe((event) => {
      if (event.type === "online") {
        setIsOnline(true);
        if (onShowToast) onShowToast("✅ Koneksi kembali! Auto-sync...", "success");
        updateCounts();
      } else if (event.type === "offline") {
        setIsOnline(false);
        if (onShowToast) onShowToast("🔴 Mode Offline", "warning");
      } else if (event.type === "sync_complete") {
        // ✅ Kasih tau hasil sync yang lebih detail (berhasil/gagal berapa)
        if (onShowToast) {
          if (event.successCount > 0) {
            onShowToast(`✅ ${event.successCount} data berhasil di-sync!`, "success");
          }
          if (event.failedCount > 0) {
            onShowToast(
              `⚠️ ${event.failedCount} data gagal disinkronkan setelah beberapa percobaan. Cek panel offline.`,
              "error"
            );
          }
        }
        updateCounts();
      } else if (event.type === "sync_item_failed_permanent") {
        // ✅ Notifikasi kalau ada 1 item yang udah nyerah nyoba sync
        updateCounts();
      }
    });

    updateCounts();
  }, [onShowToast]);

  // ✅ BARU: Handler retry manual dari UI
  const handleRetrySync = async () => {
    if (!isOnline) {
      if (onShowToast) onShowToast("Tidak bisa retry, Anda sedang offline", "error");
      return;
    }
    setIsRetrying(true);
    try {
      const retriedCount = await offlineHelper.retryAllFailed();
      if (retriedCount === 0 && onShowToast) {
        onShowToast("Tidak ada data yang perlu di-retry", "info");
      }
    } catch (error) {
      if (onShowToast) onShowToast("Gagal melakukan retry: " + error.message, "error");
    } finally {
      setIsRetrying(false);
      const count = await offlineHelper.getPendingCount();
      const failed = await offlineHelper.getFailedCount();
      setPendingCount(count);
      setFailedCount(failed);
    }
  };

  const setAllHadir = () => {
    if (students.length === 0) {
      if (onShowToast) {
        onShowToast("Tidak ada siswa untuk diset hadir", "error");
      }
      return;
    }

    const newStatus = {};
    students.forEach((student) => {
      newStatus[student.id] = "Hadir";
    });
    setAttendanceStatus(newStatus);
    setHasUserInteracted(true); // ✅ Mark as interacted

    if (onShowToast) {
      onShowToast(`Berhasil mengubah status ${students.length} siswa menjadi HADIR`, "success");
    }
  };

  // ✅ FUNCTION VALIDASI TANGGAL
  const validateDate = () => {
    if (!selectedSemesterId || !date) return { valid: true };

    const selectedSemester = availableSemesters.find((s) => s.id === selectedSemesterId);

    if (!selectedSemester) {
      return { valid: false, message: "Semester tidak valid" };
    }

    const inputDate = parseDate(date);
    const today = getTodayWIB();

    const startDate = parseDate(selectedSemester.start_date);
    const endDate = parseDate(selectedSemester.end_date);

    // ✅ VALIDASI 1: Tanggal tidak boleh masa depan
    if (inputDate > today) {
      return {
        valid: false,
        message: "❌ Tidak bisa input presensi untuk tanggal masa depan!",
      };
    }

    // ✅ VALIDASI 2: Tanggal harus dalam range semester
    if (inputDate < startDate || inputDate > endDate) {
      const semesterName =
        selectedSemester.semester === 1 ? "Ganjil (Juli-Desember)" : "Genap (Januari-Juni)";
      return {
        valid: false,
        message: `❌ Tanggal harus dalam periode ${selectedSemester.year} Semester ${semesterName}`,
      };
    }

    // ✅ VALIDASI 3: Hanya semester aktif yang bisa input
    if (!selectedSemester.is_active) {
      return {
        valid: false,
        message: "❌ Hanya semester aktif yang bisa input presensi baru!",
      };
    }

    return { valid: true };
  };

  // ========== DATA FETCHING EFFECTS ==========
  useEffect(() => {
    if (user?.role === "admin" || !teacherId) return;

    const channel = supabase
      .channel(`attendance-${teacherId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "attendances",
        },
        () => {
          if (onShowToast) {
            onShowToast("Presensi Baru Ditambahkan", "info");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teacherId, user, onShowToast]);

  // ✅ LOAD ACTIVE ACADEMIC INFO
  useEffect(() => {
    const loadActiveAcademicInfo = async () => {
      try {
        const info = await getActiveAcademicInfo();
        setActiveAcademicInfo(info);

        if (info && info.activeSemesterId) {
          setSelectedSemesterId(info.activeSemesterId);
          setAvailableSemesters(info.availableSemesters || []);
          setIsReadOnlyMode(false);

          console.log("📅 Default semester set:", {
            activeSemesterId: info.activeSemesterId,
            activeSemester: info.activeSemester,
            year: info.year,
          });
        }

        console.log("✅ Active Academic Info loaded for Attendance:", info);
      } catch (error) {
        console.error("❌ Error loading active academic info:", error);
        setMessage("Error loading academic year info");
      }
    };

    loadActiveAcademicInfo();
  }, []);

  // ✅ HANDLE SEMESTER CHANGE
  const handleSemesterChange = (semesterId) => {
    setSelectedSemesterId(semesterId);

    const selectedSemester = availableSemesters.find((s) => s.id === semesterId);
    const isActive = selectedSemester?.is_active || false;

    setIsReadOnlyMode(!isActive);

    // Reset data ketika ganti semester
    setClasses([]);
    setSelectedClass("");
    setStudents([]);
    setStudentsLoaded(false);
    setHasUserInteracted(false); // ✅ Reset interaction flag
    setTeacherAssignment(null); // ✅ Reset teacher assignment

    if (onShowToast) {
      if (selectedSemester) {
        const mode = isActive ? "Input Mode" : "View Only Mode";
        onShowToast(
          `Switched to ${selectedSemester.year} - Semester ${selectedSemester.semester} (${mode})`,
          isActive ? "info" : "warning"
        );
      }
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (user) {
          if (user.role === "admin") {
            console.log("✅ Admin access granted to Attendance page");
            setAuthLoading(false);
            return;
          }

          const { data: teacherData, error: teacherError } = await supabase
            .from("users")
            .select("teacher_id, homeroom_class_id")
            .eq("username", user.username)
            .maybeSingle();

          if (teacherError) {
            console.error("Error fetching teacher data:", teacherError);
            setMessage("Error: Data guru tidak ditemukan");
            setAuthLoading(false);
            return;
          }

          if (teacherData) {
            console.log("✅ Teacher data loaded:", teacherData);
            setTeacherId(teacherData.teacher_id);
            if (teacherData.homeroom_class_id) {
              setIsHomeroomTeacher(true);
              setHomeroomClass(teacherData.homeroom_class_id);
            }
          } else {
            console.warn("⚠️ No teacher data found for username:", user.username);
            setMessage("Data guru tidak ditemukan di sistem");
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

  // ✅ FIX: Resolve UUID guru (users.id) SEKALI di sini, lalu cache ke IndexedDB.
  // Ini yang dipakai pas offline, jadi processAttendanceSubmission ga perlu
  // nembak Supabase lagi buat dapetin data ini pas ga ada koneksi.
  useEffect(() => {
    if (!teacherId) return;

    const cacheKey = `teacherUUID_${teacherId}`;

    const resolveTeacherUUID = async () => {
      if (isOnline) {
        try {
          const { data, error } = await supabase
            .from("users")
            .select("id")
            .eq("teacher_id", teacherId)
            .maybeSingle();

          if (!error && data?.id) {
            setTeacherUUID(data.id);
            await offlineHelper.cacheData(cacheKey, data.id, "teacherUUID");
          } else if (error) {
            console.error("Gagal resolve teacherUUID:", error);
          }
        } catch (err) {
          console.error("Gagal resolve teacherUUID (network):", err);
        }
      } else {
        // Offline: ambil dari cache lokal aja, jangan sentuh network
        const cached = await offlineHelper.getCache(cacheKey);
        if (cached) setTeacherUUID(cached);
      }
    };

    resolveTeacherUUID();
  }, [teacherId, isOnline]);

  // ✅ REMINDER PRESENSI: Cek apakah guru punya jadwal hari ini dan
  // masih ada kelas+mapel yang belum di-presensi. Cuma aktif di jam operasional
  // (lihat REMINDER_HOURS_BY_DAY di atas - Jumat beda karena pulang lebih awal).
  useEffect(() => {
    const checkAttendanceReminder = async () => {
      // Cuma buat guru (bukan admin), dan kalau lagi online.
      // teacherId dibutuhkan buat query teacher_assignments (subject per kelas),
      // teacherUUID dibutuhkan buat query teacher_schedules & attendances.
      if (
        reminderChecked ||
        !teacherUUID ||
        !teacherId ||
        !selectedSemesterId ||
        user?.role === "admin" ||
        !isOnline
      ) {
        return;
      }

      // ⏰ Di luar jam operasional -> jangan cek dulu. JANGAN setReminderChecked(true)
      // di sini, biar interval di bawah bisa nyoba lagi begitu masuk jam 07:00.
      if (!isWithinAttendanceReminderHours()) return;

      const todayDate = getDefaultDate();
      const dismissedKey = `attendance_reminder_dismissed_${teacherUUID}_${todayDate}`;

      // Kalau udah pernah di-dismiss hari ini, jangan munculin lagi
      if (localStorage.getItem(dismissedKey)) {
        setReminderChecked(true);
        return;
      }

      const todayDayName = getTodayDayNameWIB();
      if (!todayDayName) {
        setReminderChecked(true); // Sabtu/Minggu -> ga ada jadwal
        return;
      }

      try {
        // 1️⃣ Ambil kelas-kelas yang dijadwalkan guru ini hari ini (dari teacher_schedules)
        const { data: schedulesData, error: schedulesError } = await supabase
          .from("teacher_schedules")
          .select("class_id")
          .eq("teacher_id", teacherUUID)
          .eq("day", todayDayName);

        if (schedulesError) {
          console.error("Error fetching teacher_schedules for reminder:", schedulesError);
          return; // ⚠️ JANGAN setReminderChecked(true) - biar dicoba lagi menit berikutnya
        }

        if (!schedulesData || schedulesData.length === 0) {
          setReminderChecked(true); // Beneran ga ada jadwal hari ini, ga perlu dicek ulang
          return;
        }

        const scheduledClassIds = [...new Set(schedulesData.map((s) => s.class_id))];

        // 2️⃣ Ambil mapel yang diampu guru ini per kelas (dari teacher_assignments,
        //    difilter semester aktif) - buat tau kelas hari ini itu mapel apa aja.
        let assignmentQuery = supabase
          .from("teacher_assignments")
          .select("class_id, subject")
          .eq("teacher_id", teacherId)
          .in("class_id", scheduledClassIds);

        assignmentQuery = filterBySemester(assignmentQuery, selectedSemesterId);

        const { data: assignmentData, error: assignmentError } = await assignmentQuery;

        if (assignmentError) {
          console.error("Error fetching teacher_assignments for reminder:", assignmentError);
          return; // ⚠️ JANGAN setReminderChecked(true) - biar dicoba lagi menit berikutnya
        }

        // 3️⃣ Susun daftar "kewajiban presensi" hari ini: tiap kombinasi kelas+mapel
        //    yang muncul di teacher_assignments untuk kelas-kelas yang dijadwalkan hari ini.
        const expected = [];
        scheduledClassIds.forEach((classId) => {
          const subjectsForClass = (assignmentData || [])
            .filter((a) => a.class_id === classId)
            .map((a) => a.subject);

          if (subjectsForClass.length > 0) {
            [...new Set(subjectsForClass)].forEach((subject) => {
              expected.push({ classId, subject });
            });
          } else {
            // Fallback: kelas ada di jadwal tapi ga ketemu assignment-nya
            // (misal data assignment belum lengkap) -> tetep cek by kelas aja.
            expected.push({ classId, subject: null });
          }
        });

        // Guru wali kelas: presensi harian juga dihitung sebagai kewajiban,
        // kalau kelas perwaliannya kebetulan ada di jadwal hari ini.
        if (isHomeroomTeacher && homeroomClass && scheduledClassIds.includes(homeroomClass)) {
          expected.push({ classId: homeroomClass, subject: "Harian" });
        }

        // 4️⃣ Ambil kelas+mapel yang sudah di-presensi hari ini
        const { data: attendanceData, error: attendanceError } = await supabase
          .from("attendances")
          .select("class_id, subject")
          .eq("teacher_id", teacherUUID)
          .eq("date", todayDate);

        if (attendanceError) {
          console.error("Error fetching attendances for reminder:", attendanceError);
          return; // ⚠️ JANGAN setReminderChecked(true) - biar dicoba lagi menit berikutnya
        }

        const doneKeys = new Set((attendanceData || []).map((a) => `${a.class_id}::${a.subject}`));
        // Set khusus buat fallback (subject: null) -> cukup cek class_id aja udah ada record atau belum
        const doneClassIds = new Set((attendanceData || []).map((a) => a.class_id));

        const missing = expected.filter((item) =>
          item.subject === null
            ? !doneClassIds.has(item.classId)
            : !doneKeys.has(`${item.classId}::${item.subject}`)
        );

        console.log("🔔 Reminder check:", { scheduledClassIds, expected, attendanceData, missing });

        setReminderChecked(true); // ✅ Berhasil sampai akhir - ga perlu dicek ulang lagi hari ini

        // 5️⃣ Tampilkan reminder kalau masih ada kelas+mapel yang belum di-presensi
        //    (dan masih dalam jam operasional pas response DB-nya balik)
        if (missing.length > 0 && isWithinAttendanceReminderHours()) {
          setUnfinishedReminderClasses(missing);
          setShowAttendanceReminder(true);
        }
      } catch (error) {
        console.error("Error checking attendance reminder:", error);
      }
    };

    checkAttendanceReminder();

    // ⏱️ Cek ulang tiap menit: buat nangkep momen masuk jam 07:00 (kalau tab
    // dibuka sebelum itu), dan buat auto-nutup reminder begitu lewat jam 14:00.
    const intervalId = setInterval(() => {
      if (!isWithinAttendanceReminderHours()) {
        setShowAttendanceReminder((prev) => (prev ? false : prev));
        return;
      }
      checkAttendanceReminder();
    }, 60000);

    return () => clearInterval(intervalId);
  }, [
    teacherUUID,
    teacherId,
    selectedSemesterId,
    isHomeroomTeacher,
    homeroomClass,
    user,
    isOnline,
    reminderChecked,
  ]);

  // ✅ Tutup reminder & simpan status "sudah di-dismiss" untuk hari ini
  const handleDismissReminder = () => {
    setShowAttendanceReminder(false);
    if (teacherUUID) {
      const todayDate = getDefaultDate();
      localStorage.setItem(`attendance_reminder_dismissed_${teacherUUID}_${todayDate}`, "1");
    }
  };

  // ✅ Klik "Presensi Sekarang" -> tutup reminder & scroll ke form filter di atas
  const handleGoToAttendanceFromReminder = () => {
    handleDismissReminder();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const fetchSubjects = async () => {
      if (user?.role === "admin") {
        console.log("ℹ️ Admin mode: Subjects not loaded");
        return;
      }

      if (!teacherId) return;

      if (!selectedSemesterId) {
        console.log("⚠️ No semester selected, clearing subjects");
        setSubjects([]);
        return;
      }

      try {
        console.log("🔍 Fetching subjects for:", {
          teacherId,
          selectedSemesterId,
          isHomeroomTeacher,
          homeroomClass,
        });

        let query = supabase
          .from("teacher_assignments")
          .select("subject")
          .eq("teacher_id", teacherId);

        query = filterBySemester(query, selectedSemesterId);

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching subjects:", error);
          setMessage("Error: Gagal mengambil mata pelajaran");
          return;
        }

        console.log("📚 Raw subjects data:", data);

        const uniqueSubjects = [...new Set(data.map((item) => item.subject))];

        if (isHomeroomTeacher && homeroomClass) {
          uniqueSubjects.push(`PRESENSI HARIAN KELAS ${homeroomClass}`);
        }

        console.log("✅ Final subjects:", uniqueSubjects);
        setSubjects(uniqueSubjects);
        setMessage(""); // Clear any error messages
      } catch (error) {
        console.error("Error in fetchSubjects:", error);
        setMessage("Error: Terjadi kesalahan sistem");
      }
    };

    fetchSubjects();
  }, [teacherId, isHomeroomTeacher, homeroomClass, user?.role, selectedSemesterId]);

  useEffect(() => {
    const fetchClasses = async () => {
      if (user?.role === "admin") {
        console.log("ℹ️ Admin mode: Classes not loaded");
        return;
      }

      if (!selectedSubject || !teacherId) {
        setClasses([]);
        setTeacherAssignment(null);
        return;
      }

      setMessage("");

      try {
        const isDailyMode = selectedSubject.includes("PRESENSI HARIAN");

        if (isDailyMode) {
          if (!homeroomClass) {
            setTeacherAssignment(null);
            return;
          }

          const formattedClasses = [
            {
              id: homeroomClass,
              grade: homeroomClass.charAt(0),
              displayName: `Kelas ${homeroomClass}`,
            },
          ];

          setClasses(formattedClasses);
          setSelectedClass(homeroomClass);
          setTeacherAssignment(null);

          setLoading(true);
          const { data: studentsData, error: studentsError } = await supabase
            .from("students")
            .select("id, full_name, nis, gender")
            .eq("class_id", homeroomClass)
            .eq("is_active", true)
            .order("full_name");

          if (studentsError) {
            setMessage("Error: Gagal mengambil data siswa - " + studentsError.message);
          } else {
            setStudents(studentsData || []);
            setStudentsLoaded(true);

            const newStatus = {};
            studentsData?.forEach((student) => {
              newStatus[student.id] = "Hadir";
            });
            setAttendanceStatus(newStatus);
          }
          setLoading(false);
          return;
        }

        if (!selectedSemesterId) {
          setClasses([]);
          setMessage("Pilih semester terlebih dahulu");
          setTeacherAssignment(null);
          return;
        }

        let query = supabase
          .from("teacher_assignments")
          .select("class_id, subject")
          .eq("teacher_id", teacherId)
          .eq("subject", selectedSubject);

        query = filterBySemester(query, selectedSemesterId);

        const { data: assignmentData, error: assignmentError } = await query;

        if (assignmentError) {
          console.error("Assignment error:", assignmentError);
          throw assignmentError;
        }

        if (assignmentData && assignmentData.length > 0) {
          setTeacherAssignment(assignmentData[0]);
        } else {
          setTeacherAssignment(null);
        }

        if (!assignmentData?.length) {
          setClasses([]);
          const currentSemester = availableSemesters.find((s) => s.id === selectedSemesterId);
          setMessage(
            `Tidak ada kelas untuk "${selectedSubject}" di ${
              currentSemester
                ? `${currentSemester.year} - Semester ${currentSemester.semester}`
                : "semester ini"
            }`
          );
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
        setSelectedClass("");
        setStudents([]);
        setStudentsLoaded(false);
      } catch (error) {
        console.error("Error fetching classes:", error);
        setMessage("Error: Gagal mengambil data kelas - " + error.message);
        setTeacherAssignment(null);
      }
    };

    fetchClasses();
  }, [
    selectedSubject,
    teacherId,
    isHomeroomTeacher,
    homeroomClass,
    user,
    selectedSemesterId,
    availableSemesters,
  ]);

  useEffect(() => {
    if (selectedClass && !isHomeroomDaily()) {
      fetchStudentsForClass(selectedClass);
    }
  }, [selectedClass]);

  useEffect(() => {
    if (
      students.length > 0 &&
      studentsLoaded &&
      selectedClass &&
      date &&
      selectedSubject &&
      selectedSemesterId
    ) {
      fetchExistingAttendance();
    }
  }, [date, selectedClass, selectedSubject, students, studentsLoaded, selectedSemesterId]);

  const fetchStudentsForClass = async (classId) => {
    if (!classId) {
      setStudents([]);
      return;
    }

    try {
      setLoading(true);

      // ✅ OFFLINE: Try cache first
      const cacheKey = `students_${classId}`;
      const cached = await offlineHelper.getCache(cacheKey);

      if (isOnline) {
        const { data: studentsData, error: studentsError } = await supabase
          .from("students")
          .select("id, full_name, nis, gender")
          .eq("class_id", classId)
          .eq("is_active", true)
          .order("full_name");

        if (studentsError) throw studentsError;

        setStudents(studentsData || []);
        setStudentsLoaded(true);
        setAttendanceStatus({});
        setAttendanceNotes({});
        setHasUserInteracted(false);

        // ✅ Cache for offline use
        await offlineHelper.cacheData(cacheKey, studentsData, "students");
      } else {
        // ✅ OFFLINE: Use cache
        if (cached) {
          setStudents(cached);
          setStudentsLoaded(true);
          setAttendanceStatus({});
          setAttendanceNotes({});
          setHasUserInteracted(false);
          if (onShowToast) onShowToast("📦 Menggunakan data cache", "info");
        } else {
          setMessage("Tidak ada cache. Hubungkan internet.");
        }
      }
    } catch (error) {
      console.error("Error fetching students:", error);

      // ✅ Fallback to cache
      const cacheKey = `students_${classId}`;
      const cached = await offlineHelper.getCache(cacheKey);
      if (cached) {
        setStudents(cached);
        setStudentsLoaded(true);
        if (onShowToast) onShowToast("⚠️ Error - menggunakan cache", "warning");
      } else {
        setMessage("Error: Gagal mengambil data siswa");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingAttendance = async () => {
    if (!selectedClass || !date || !selectedSubject || !teacherId || !selectedSemesterId) {
      return;
    }

    // ✅ Kalau offline, ga usah coba fetch existing attendance ke server
    // (biar ga stuck loading nunggu request yang bakal timeout)
    if (!isOnline) {
      console.log("ℹ️ Offline - skip fetch existing attendance, tetap pakai status kosong");
      return;
    }

    try {
      setLoading(true);

      const { data: teacherUser, error: teacherError } = await supabase
        .from("users")
        .select("id")
        .eq("teacher_id", teacherId)
        .maybeSingle();

      if (teacherError) {
        console.error("Error fetching teacher UUID:", teacherError);
        return;
      }

      if (!teacherUser) {
        console.error("Teacher UUID not found for teacher_id:", teacherId);
        return;
      }

      const teacherUUID = teacherUser.id;
      const typeValue = isHomeroomDaily() ? "harian" : "mapel";

      let query = supabase
        .from("attendances")
        .select("student_id, status, notes")
        .eq("teacher_id", teacherUUID)
        .eq("date", date)
        .eq("type", typeValue)
        .eq("class_id", selectedClass);

      query = filterBySemester(query, selectedSemesterId);

      const { data: attendanceData, error: attendanceError } = await query;

      if (attendanceError) {
        console.error("Error fetching attendance:", attendanceError);
        return;
      }

      if (attendanceData && attendanceData.length > 0) {
        const statusMap = {};
        const notesMap = {};

        attendanceData.forEach((record) => {
          statusMap[record.student_id] = record.status;
          if (record.notes) {
            notesMap[record.student_id] = record.notes;
          }
        });

        setAttendanceStatus(statusMap);
        setAttendanceNotes(notesMap);
        setHasUserInteracted(true);

        console.log("✅ Loaded existing attendance data:", attendanceData.length, "records");
      } else {
        setAttendanceStatus({});
        setAttendanceNotes({});
        setHasUserInteracted(false);
        console.log("ℹ️ No existing attendance - waiting for user input");
      }
    } catch (error) {
      console.error("Error in fetchExistingAttendance:", error);
    } finally {
      setLoading(false);
    }
  };

  // ========== ATTENDANCE PROCESSING ==========
  const handleStatusChange = (studentId, status) => {
    setAttendanceStatus((prev) => ({ ...prev, [studentId]: status }));
    setHasUserInteracted(true);
  };

  const handleNotesChange = (studentId, notes) => {
    setAttendanceNotes((prev) => ({ ...prev, [studentId]: notes }));
    setHasUserInteracted(true);
  };

  const checkExistingAttendance = async (teacherUUID, typeValue) => {
    try {
      let query = supabase
        .from("attendances")
        .select("id, student_id, status, notes")
        .eq("teacher_id", teacherUUID)
        .eq("date", date)
        .eq("type", typeValue)
        .eq("class_id", selectedClass)
        .in(
          "student_id",
          students.map((s) => s.id)
        );

      if (selectedSemesterId) {
        query = filterBySemester(query, selectedSemesterId);
      }

      const { data: existingData, error } = await query;

      if (error) {
        console.error("Error checking existing attendance:", error);
        return null;
      }

      return existingData || [];
    } catch (error) {
      console.error("Error in checkExistingAttendance:", error);
      return null;
    }
  };

  const saveAttendanceData = async (attendanceData) => {
    const BATCH_SIZE = 5;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < attendanceData.length; i += BATCH_SIZE) {
      const batch = attendanceData.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from("attendances").insert(batch);

      if (error) {
        console.error(`Error inserting batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
      }
    }

    return { successCount, errorCount };
  };

  const deleteExistingAttendance = async (teacherUUID, typeValue) => {
    try {
      let query = supabase
        .from("attendances")
        .delete()
        .eq("teacher_id", teacherUUID)
        .eq("date", date)
        .eq("type", typeValue)
        .eq("class_id", selectedClass);

      if (selectedSemesterId) {
        query = filterBySemester(query, selectedSemesterId);
      }

      const { error } = await query;

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error deleting existing attendance:", error);
      throw error;
    }
  };

  const processAttendanceSubmission = async () => {
    const dateValidation = validateDate();
    if (!dateValidation.valid) {
      if (onShowToast) {
        onShowToast(dateValidation.message, "error");
      }
      return;
    }

    if (isReadOnlyMode) {
      if (onShowToast) {
        onShowToast(
          "🔒 Semester ini dalam mode View Only. Ganti ke semester aktif untuk input data baru!",
          "error"
        );
      }
      return;
    }

    if (!teacherId || !selectedSubject || !selectedClass) {
      if (onShowToast) {
        onShowToast("Pilih mata pelajaran dan kelas terlebih dahulu!", "error");
      }
      return;
    }

    if (!selectedSemesterId) {
      if (onShowToast) {
        onShowToast("Tidak ada semester yang dipilih!", "error");
      }
      return;
    }

    if (students.length === 0) {
      if (onShowToast) {
        onShowToast("Tidak ada siswa untuk diabsen!", "error");
      }
      return;
    }

    setLoading(true);

    // ✅ FIX: Resolve teacherUUID SEBELUM masuk try/catch, dan tanpa nyentuh
    // network sama sekali kalau lagi offline. Sebelumnya kode ini selalu nembak
    // Supabase duluan (walau lagi offline) → langsung gagal dengan
    // "TypeError: Failed to fetch" sebelum sempat masuk logic offline-save.
    let resolvedTeacherUUID = teacherUUID;

    try {
      if (!isOnline) {
        // ✅ OFFLINE: JANGAN fetch ke server. Pakai cache yang udah disiapin
        // dari effect resolveTeacherUUID (atau state kalau udah ke-set).
        if (!resolvedTeacherUUID) {
          resolvedTeacherUUID = await offlineHelper.getCache(`teacherUUID_${teacherId}`);
        }

        if (!resolvedTeacherUUID) {
          // Belum pernah online sejak buka app -> ga ada cache buat dipakai
          throw new Error(
            "Data guru belum sempat ke-cache. Buka halaman ini sekali saat online, baru bisa presensi offline."
          );
        }
      } else {
        // ✅ ONLINE: fetch fresh kalau state belum ke-isi, terus cache buat jaga-jaga offline nanti
        if (!resolvedTeacherUUID) {
          const { data: teacherUser, error: teacherError } = await supabase
            .from("users")
            .select("id")
            .eq("teacher_id", teacherId)
            .maybeSingle();

          if (teacherError) throw new Error("Gagal mengambil data guru: " + teacherError.message);
          if (!teacherUser) throw new Error("Data guru tidak ditemukan di sistem");

          resolvedTeacherUUID = teacherUser.id;
          setTeacherUUID(resolvedTeacherUUID);
        }
        await offlineHelper.cacheData(
          `teacherUUID_${teacherId}`,
          resolvedTeacherUUID,
          "teacherUUID"
        );
      }

      const teacherUUIDToUse = resolvedTeacherUUID;
      const typeValue = isHomeroomDaily() ? "harian" : "mapel";
      const currentSemester = availableSemesters.find((s) => s.id === selectedSemesterId);

      const attendanceData = students.map((student) => ({
        student_id: student.id,
        teacher_id: teacherUUIDToUse,
        date: date,
        subject: isHomeroomDaily() ? "Harian" : selectedSubject,
        class_id: selectedClass,
        type: typeValue,
        status: attendanceStatus[student.id] || "Hadir",
        notes: attendanceNotes[student.id] || null,
        academic_year_id: selectedSemesterId,
        semester: currentSemester?.semester || 1,
      }));

      // ✅ OFFLINE MODE: Save to IndexedDB
      if (!isOnline) {
        await offlineHelper.addPending({
          action: "save_attendance",
          data: attendanceData,
        });

        const count = await offlineHelper.getPendingCount();
        setPendingCount(count);

        if (onShowToast) {
          onShowToast(`💾 Offline: ${students.length} data disimpan lokal`, "success");
        }

        handleSaveSuccess(students.length, true); // ✅ true = offline save
        setLoading(false);
        return;
      }

      // ✅ ONLINE MODE: Normal save
      const existingData = await checkExistingAttendance(teacherUUIDToUse, typeValue);

      if (existingData && existingData.length > 0) {
        setPendingAttendanceData(attendanceData);
        setExistingAttendanceData(existingData);
        setShowConfirmModal(true);
        setLoading(false);
        return;
      }

      const { successCount, errorCount } = await saveAttendanceData(attendanceData);

      if (errorCount > 0) {
        throw new Error(`Berhasil menyimpan ${successCount} data, gagal ${errorCount} data.`);
      }

      handleSaveSuccess(successCount);
    } catch (error) {
      console.error("Error saving attendance:", error);

      // ✅ FALLBACK: Save offline on error (misal koneksi putus di tengah request).
      // FIX: reuse `resolvedTeacherUUID` yang udah didapat di atas, JANGAN fetch
      // ke server lagi -> kalau penyebab errornya emang koneksi putus, fetch kedua
      // ini pasti gagal lagi juga dan bikin error message-nya jadi membingungkan.
      try {
        if (!resolvedTeacherUUID) {
          resolvedTeacherUUID = await offlineHelper.getCache(`teacherUUID_${teacherId}`);
        }

        if (!resolvedTeacherUUID) {
          throw new Error(
            "Data guru belum sempat ke-cache, tidak bisa disimpan offline. Buka halaman ini sekali saat online dulu."
          );
        }

        const typeValue = isHomeroomDaily() ? "harian" : "mapel";
        const currentSemester = availableSemesters.find((s) => s.id === selectedSemesterId);

        const attendanceData = students.map((student) => ({
          student_id: student.id,
          teacher_id: resolvedTeacherUUID,
          date: date,
          subject: isHomeroomDaily() ? "Harian" : selectedSubject,
          class_id: selectedClass,
          type: typeValue,
          status: attendanceStatus[student.id] || "Hadir",
          notes: attendanceNotes[student.id] || null,
          academic_year_id: selectedSemesterId,
          semester: currentSemester?.semester || 1,
        }));

        await offlineHelper.addPending({
          action: "save_attendance",
          data: attendanceData,
        });

        const count = await offlineHelper.getPendingCount();
        setPendingCount(count);

        if (onShowToast) {
          onShowToast("⚠️ Error - Data disimpan offline & akan auto-sync", "warning");
        }
      } catch (offlineError) {
        console.error("Offline save failed:", offlineError);
        if (onShowToast) {
          onShowToast("Gagal menyimpan: " + error.message, "error");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOverwriteConfirmation = async () => {
    setLoading(true);
    setShowConfirmModal(false);

    try {
      // ✅ Pake cache dulu kalau udah ada (overwrite ini cuma kejadian pas online,
      // tapi tetep hemat 1 network round-trip kalau state-nya udah ke-isi)
      let teacherUUIDToUse = teacherUUID;

      if (!teacherUUIDToUse) {
        const { data: teacherUser, error: teacherError } = await supabase
          .from("users")
          .select("id")
          .eq("teacher_id", teacherId)
          .maybeSingle();

        if (teacherError) throw new Error("Gagal mengambil data guru: " + teacherError.message);
        if (!teacherUser) throw new Error("Data guru tidak ditemukan di sistem");

        teacherUUIDToUse = teacherUser.id;
        setTeacherUUID(teacherUUIDToUse);
      }

      const typeValue = isHomeroomDaily() ? "harian" : "mapel";

      await deleteExistingAttendance(teacherUUIDToUse, typeValue);
      const { successCount, errorCount } = await saveAttendanceData(pendingAttendanceData);

      if (errorCount > 0) {
        throw new Error(`Berhasil menyimpan ${successCount} data, gagal ${errorCount} data.`);
      }

      handleSaveSuccess(successCount);
    } catch (error) {
      console.error("Error overwriting attendance:", error);
      if (onShowToast) {
        onShowToast("Gagal menimpa presensi: " + error.message, "error");
      }
    } finally {
      setLoading(false);
      setPendingAttendanceData(null);
      setExistingAttendanceData(null);
    }
  };

  const handleCancelOverwrite = () => {
    setShowConfirmModal(false);
    setPendingAttendanceData(null);
    setExistingAttendanceData(null);

    if (onShowToast) {
      onShowToast("Penyimpanan dibatalkan", "info");
    }
  };

  const handleSaveSuccess = (successCount, isOfflineSave = false) => {
    const currentSemester = availableSemesters.find((s) => s.id === selectedSemesterId);

    if (onShowToast && !isOfflineSave) {
      onShowToast(
        `Presensi berhasil disimpan untuk ${successCount} siswa pada ${
          isHomeroomDaily() ? "presensi harian" : selectedSubject
        } tanggal ${date}${
          currentSemester ? ` (${currentSemester.year} - Semester ${currentSemester.semester})` : ""
        }`,
        "success"
      );
    }

    // ✅ Reset states after successful save
    const newStatus = {};
    students.forEach((student) => {
      newStatus[student.id] = "Hadir";
    });
    setAttendanceStatus(newStatus);
    setAttendanceNotes({});
    setHasUserInteracted(true);
  };

  // ========== RENDER LOGIC ==========
  if (authLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-blue-600 dark:text-blue-400 text-lg animate-pulse">
            Memeriksa autentikasi...
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 rounded-xl p-6 text-center">
          <p className="text-red-600 dark:text-red-400 text-lg font-medium">
            Anda harus login untuk mengakses halaman ini
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors duration-200">
      {/* ✅ OFFLINE INDICATOR - dengan status failed + tombol retry */}
      {(!isOnline || pendingCount > 0 || failedCount > 0) && (
        <div className="fixed bottom-4 right-4 z-50 max-w-xs">
          <div
            className={`rounded-xl shadow-lg p-3 backdrop-blur-sm border ${
              failedCount > 0
                ? "bg-red-500/90 border-red-400 text-white"
                : isOnline
                  ? "bg-blue-500/90 border-blue-400 text-white"
                  : "bg-amber-500/90 border-amber-400 text-white"
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span>{isOnline ? "🟢" : "🔴"}</span>
              <span>{isOnline ? "Online" : "Offline"}</span>
              {pendingCount > 0 && (
                <span className="ml-1 bg-white/30 px-2 py-1 rounded-md text-xs">
                  {pendingCount} pending
                </span>
              )}
            </div>

            {/* ✅ BARU: Info + tombol retry kalau ada yang gagal permanen */}
            {failedCount > 0 && (
              <div className="mt-2 pt-2 border-t border-white/30">
                <p className="text-xs mb-2">
                  ⚠️ {failedCount} data gagal disinkronkan setelah beberapa percobaan.
                </p>
                <button
                  onClick={handleRetrySync}
                  disabled={isRetrying || !isOnline}
                  className="w-full text-xs font-semibold bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1.5 transition disabled:opacity-50"
                >
                  {isRetrying ? "Mencoba lagi..." : "🔄 Coba Sync Ulang"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* READ-ONLY MODE WARNING */}
      {isReadOnlyMode && (
        <div className="mx-4 sm:mx-6 lg:mx-8 mb-6 bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/10 border-2 border-amber-300 dark:border-amber-600 rounded-2xl p-5 shadow-sm transition-colors duration-200">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center">
              <span className="text-2xl">🔒</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-amber-800 dark:text-amber-300 mb-2">
                Mode View Only (Read-Only)
              </h3>
              <p className="text-amber-700 dark:text-amber-400 leading-relaxed">
                Semester ini tidak aktif. Anda hanya bisa <strong>melihat data</strong>. Untuk input
                presensi baru, pilih semester yang sedang aktif.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters Component */}
      <AttendanceFilters
        subjects={subjects}
        selectedSubject={selectedSubject}
        setSelectedSubject={setSelectedSubject}
        classes={classes}
        selectedClass={selectedClass}
        setSelectedClass={setSelectedClass}
        date={date}
        setDate={handleDateChange}
        loading={loading}
        teacherId={teacherId}
        isHomeroomDaily={isHomeroomDaily}
        setStudents={setStudents}
        setStudentsLoaded={setStudentsLoaded}
        activeAcademicInfo={activeAcademicInfo}
        selectedSemesterId={selectedSemesterId}
        availableSemesters={availableSemesters}
        onSemesterChange={handleSemesterChange}
        isReadOnlyMode={isReadOnlyMode}
        teacherAssignment={teacherAssignment}
      />

      {/* Conditional Rendering */}
      {students.length > 0 && (
        <>
          {/* ✅ ATTENDANCE STATS - Summary Cards */}
          <AttendanceStats attendanceStatus={attendanceStatus} students={students} />

          {/* Action Buttons & Search */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mb-6 lg:mb-8">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Cari siswa (nama/NIS)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3.5 sm:py-3 text-base border-2 border-blue-200 dark:border-blue-700 rounded-xl focus:ring-3 focus:ring-blue-500/30 dark:focus:ring-blue-500/50 focus:border-blue-500 dark:focus:border-blue-500 transition-all duration-200 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 shadow-sm"
              />
              <span className="absolute right-4 top-3.5 text-blue-500 dark:text-blue-400 text-xl">
                🔍
              </span>
            </div>

            <div className="flex flex-wrap gap-3 w-full sm:w-auto">
              <button
                className="flex-1 sm:flex-none min-h-[52px] px-5 py-3 text-base font-medium bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-2 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-xl hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-800/40 dark:hover:to-blue-700/40 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                onClick={setAllHadir}
                disabled={loading || isReadOnlyMode}
                title={isReadOnlyMode ? "Tidak bisa edit di semester non-aktif" : ""}
                style={{ minWidth: "140px" }}
              >
                ✅ Hadir Semua
              </button>

              <button
                className={`flex-1 sm:flex-none min-h-[52px] px-5 py-3 text-base font-semibold rounded-xl active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${
                  isReadOnlyMode
                    ? "bg-gradient-to-r from-gray-400 to-gray-500 dark:from-gray-600 dark:to-gray-700 border-2 border-gray-400 dark:border-gray-600 text-white"
                    : "bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 border-2 border-emerald-500 dark:border-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 dark:hover:from-emerald-700 dark:hover:to-emerald-800"
                }`}
                onClick={processAttendanceSubmission}
                disabled={
                  loading ||
                  !selectedSubject ||
                  !selectedClass ||
                  !selectedSemesterId ||
                  students.length === 0 ||
                  !hasUserInteracted ||
                  isReadOnlyMode
                }
                title={
                  isReadOnlyMode
                    ? "Tidak bisa input di semester non-aktif"
                    : !hasUserInteracted
                      ? "Silakan input status presensi siswa terlebih dahulu"
                      : ""
                }
                style={{ minWidth: "180px" }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                    Menyimpan...
                  </span>
                ) : isReadOnlyMode ? (
                  "🔒 View Only Mode"
                ) : !isOnline ? (
                  "💾 Simpan (Offline)"
                ) : (
                  "💾 Simpan Presensi"
                )}
              </button>
            </div>
          </div>

          {/* Table Component */}
          <AttendanceTable
            filteredStudents={filteredStudents}
            classes={classes}
            selectedClass={selectedClass}
            searchTerm={searchTerm}
            attendanceStatus={attendanceStatus}
            attendanceNotes={attendanceNotes}
            loading={loading}
            handleStatusChange={handleStatusChange}
            handleNotesChange={handleNotesChange}
            teacherAssignment={teacherAssignment}
          />
        </>
      )}

      {/* Empty States */}
      {selectedClass && students.length === 0 && !loading && (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 text-center transition-colors duration-200">
          <div className="text-5xl mb-4 text-slate-300 dark:text-slate-600">📚</div>
          <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">
            Tidak ada siswa aktif di kelas ini
          </p>
        </div>
      )}

      {!selectedClass && selectedSubject && classes.length === 0 && !isHomeroomDaily() && (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 text-center transition-colors duration-200">
          <div className="text-5xl mb-4 text-slate-300 dark:text-slate-600">🏫</div>
          <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">
            {selectedSemesterId
              ? `Tidak ada kelas untuk "${selectedSubject}" di semester yang dipilih`
              : "Pilih semester terlebih dahulu"}
          </p>
        </div>
      )}

      {!selectedSubject && (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 text-center transition-colors duration-200">
          <div className="text-5xl mb-4 text-slate-300 dark:text-slate-600">📚</div>
        </div>
      )}

      {/* CONFIRM OVERWRITE MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Data Presensi Sudah Ada!
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Presensi untuk tanggal <strong>{date}</strong> sudah tercatat.
                <br />
                Apakah Anda ingin menimpa data yang ada?
              </p>
            </div>

            {existingAttendanceData && existingAttendanceData.length > 0 && (
              <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-700 dark:text-slate-300 font-medium mb-2">
                  Data Presensi yang Ada:
                </p>
                <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                  <p>• Total siswa: {existingAttendanceData.length}</p>
                  <p>
                    • Hadir: {existingAttendanceData.filter((d) => d.status === "Hadir").length}
                  </p>
                  <p>
                    • Sakit: {existingAttendanceData.filter((d) => d.status === "Sakit").length}
                  </p>
                  <p>• Izin: {existingAttendanceData.filter((d) => d.status === "Izin").length}</p>
                  <p>
                    • Alpha: {existingAttendanceData.filter((d) => d.status === "Alpha").length}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleCancelOverwrite}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-all disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleOverwriteConfirmation}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-amber-700 transition-all disabled:opacity-50"
              >
                {loading ? "Menyimpan..." : "Ya, Timpa Data"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ REMINDER PRESENSI SISWA - guru punya jadwal hari ini & belum presensi */}
      {showAttendanceReminder && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-700">
            {/* Header gradient */}
            <div className="relative bg-gradient-to-r from-amber-400 to-orange-500 p-5 sm:p-6">
              <button
                onClick={handleDismissReminder}
                className="absolute top-4 right-4 text-white/90 hover:text-white transition-colors"
                aria-label="Tutup"
              >
                ✕
              </button>
              <div className="flex items-center gap-3 pr-8">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white/25 flex items-center justify-center">
                  <span className="text-2xl">🔔</span>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">Reminder Presensi</h3>
                  <p className="text-sm text-white/90">Jangan Lupa Presensi Siswa Hari Ini!</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6">
              <p className="text-slate-700 dark:text-slate-300 text-center leading-relaxed">
                Anda Memiliki Jadwal Mengajar Hari Ini. Silakan Lakukan Presensi Siswa Untuk
                Mencatat Kehadiran Mereka.
              </p>

              <div className="mt-4 flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 dark:border-amber-600 rounded-r-xl p-4">
                <span className="text-xl flex-shrink-0">📋</span>
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  <strong>Kelas Belum Presensi:</strong>{" "}
                  {unfinishedReminderClasses
                    .map((item) =>
                      item.subject
                        ? `Kelas ${item.classId} - ${item.subject}`
                        : `Kelas ${item.classId}`
                    )
                    .join(", ")}
                </p>
              </div>

              <div className="mt-3 flex items-start gap-3 bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-400 dark:border-orange-600 rounded-r-xl p-4">
                <span className="text-xl flex-shrink-0">⏰</span>
                <p className="text-sm text-orange-800 dark:text-orange-300">
                  <strong>Batas Waktu:</strong> Input presensi tersedia sampai jam{" "}
                  {getReminderHoursForToday().end} WIB. Pastikan Anda presensi sebelum batas waktu!
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleDismissReminder}
                  className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                >
                  Nanti
                </button>
                <button
                  onClick={handleGoToAttendanceFromReminder}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm"
                >
                  Presensi Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
