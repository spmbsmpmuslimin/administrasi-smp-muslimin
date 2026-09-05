//[file name]: TeacherDashboard.js - WITH ACADEMIC YEAR SERVICE + ABSENT STUDENTS
import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import AnnouncementPopup from "./AnnouncementPopup";
import { getActiveAcademicInfo } from "../services/academicYearService";
import FeedbackGuru from "./FeedbackGuru";

// ✅ JAM SCHEDULE - untuk menghitung jam pelajaran yang benar
const JAM_SCHEDULE = {
  Senin: {
    1: { start: "06:30", end: "07:50" },
    2: { start: "07:50", end: "08:30" },
    3: { start: "08:30", end: "09:10" },
    4: { start: "09:10", end: "09:50" },
    5: { start: "10:30", end: "11:05" },
    6: { start: "11:05", end: "11:40" },
    7: { start: "11:40", end: "12:15" },
    8: { start: "13:00", end: "13:35" },
    9: { start: "13:35", end: "14:10" },
  },
  Selasa: {
    1: { start: "07:00", end: "07:40" },
    2: { start: "07:40", end: "08:20" },
    3: { start: "08:20", end: "09:00" },
    4: { start: "09:00", end: "09:40" },
    5: { start: "10:30", end: "11:05" },
    6: { start: "11:05", end: "11:40" },
    7: { start: "11:40", end: "12:15" },
    8: { start: "13:00", end: "13:35" },
    9: { start: "13:35", end: "14:10" },
  },
  Rabu: {
    1: { start: "07:00", end: "07:40" },
    2: { start: "07:40", end: "08:20" },
    3: { start: "08:20", end: "09:00" },
    4: { start: "09:00", end: "09:40" },
    5: { start: "10:30", end: "11:05" },
    6: { start: "11:05", end: "11:40" },
    7: { start: "11:40", end: "12:15" },
    8: { start: "13:00", end: "13:35" },
    9: { start: "13:35", end: "14:10" },
  },
  Kamis: {
    1: { start: "07:00", end: "07:40" },
    2: { start: "07:40", end: "08:20" },
    3: { start: "08:20", end: "09:00" },
    4: { start: "09:00", end: "09:40" },
    5: { start: "10:30", end: "11:05" },
    6: { start: "11:05", end: "11:40" },
    7: { start: "11:40", end: "12:15" },
    8: { start: "13:00", end: "13:35" },
    9: { start: "13:35", end: "14:10" },
  },
  Jumat: {
    1: { start: "06:30", end: "07:05" },
    2: { start: "07:05", end: "07:40" },
    3: { start: "07:40", end: "08:15" },
    4: { start: "08:15", end: "08:50" },
    5: { start: "08:50", end: "09:10" },
    6: { start: "09:40", end: "10:10" },
    7: { start: "10:10", end: "10:40" },
  },
};

const TeacherDashboard = ({ user }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeAcademicInfo, setActiveAcademicInfo] = useState(null);
  const [currentAcademicYearId, setCurrentAcademicYearId] = useState(null);
  // ✅ NEW: Jam live, dipakai buat nentuin badge "Selesai" di Jadwal Hari Ini
  // (bandingin jam sekarang sama end_time tiap jadwal).
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [stats, setStats] = useState({
    totalStudents: 0,
    totalClasses: 0,
    subjects: [],
    classesTaught: [],
  });
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [absentStudents, setAbsentStudents] = useState([]); // ✅ TAMBAH STATE BARU
  // ✅ NEW: Referensi presensi HARIAN (diinput wali kelas kelas tsb) untuk
  // kelas-kelas yang guru ini ajar mapel-nya hari ini. Beda sama
  // absentStudents di atas -- itu hasil input guru mapel sendiri, ini
  // "contekan" dari data wali kelas, biar pas masuk kelas guru mapel udah
  // tau siapa yang gak hadir tanpa perlu nanya siswa dulu dulu.
  // Grouped per class_id: { "7F": [{full_name, status}, ...], "7A": [...] }
  const [harianReferenceByClass, setHarianReferenceByClass] = useState({});
  // ✅ NEW: Alasan kenapa harianReferenceByClass kosong, biar guru tau itu
  // normal (bukan error/data ilang). Kemungkinan nilai:
  // - "no_schedule" : gak ada jadwal ngajar hari ini (weekend/libur)
  // - "no_data_yet" : ada jadwal ngajar hari ini, tapi wali kelas dari
  //                   kelas tsb belum input presensi harian hari ini
  // - "has_data"    : ada datanya, section normal ditampilkan
  const [harianReferenceStatus, setHarianReferenceStatus] = useState("no_schedule");
  // ✅ NEW: Materi terakhir per kelas+mapel (dari jurnal_harian), buat pengingat
  // sebelum guru masuk kelas. Key: "classId||subject"
  const [lastMateriMap, setLastMateriMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load active academic info
  useEffect(() => {
    const loadActiveAcademicInfo = async () => {
      const info = await getActiveAcademicInfo();
      setActiveAcademicInfo(info);
    };
    loadActiveAcademicInfo();
  }, []);

  // Dark mode detection
  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDarkMode(darkModeMediaQuery.matches);

    const handleChange = (e) => {
      setIsDarkMode(e.matches);
    };

    darkModeMediaQuery.addEventListener("change", handleChange);
    return () => darkModeMediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Check if mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  // Fungsi untuk mendapatkan nama hari
  const getDayName = (dayIndex) => {
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    return days[dayIndex];
  };

  // Fungsi untuk format waktu
  const formatTime = (time) => {
    if (!time) return "-";
    return time.substring(0, 5);
  };

  // ✅ NEW: Cek apakah jadwal ini udah lewat (jam sekarang > end_time),
  // dipakai buat munculin badge "Selesai" di card Jadwal Hari Ini.
  const isBlockDone = (endTime) => {
    if (!endTime) return false;
    const [h, m] = endTime.substring(0, 5).split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return false;
    const endDate = new Date(currentTime);
    endDate.setHours(h, m, 0, 0);
    return currentTime > endDate;
  };

  // ✅ NEW: Format tanggal singkat "DD-MM-YYYY" buat label materi terakhir
  const formatTanggalIndoSingkat = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(`${dateStr}T00:00:00`);
    if (isNaN(d.getTime())) return "-";
    const tgl = String(d.getDate()).padStart(2, "0");
    const bln = String(d.getMonth() + 1).padStart(2, "0");
    const thn = d.getFullYear();
    return `${tgl}-${bln}-${thn}`;
  };

  // ✅ Fungsi untuk menghitung jam pelajaran berdasarkan start_time dan end_time
  const calculateSessionNumbers = (dayName, startTime, endTime) => {
    const daySchedule = JAM_SCHEDULE[dayName];
    if (!daySchedule) return [];

    const sessions = [];
    const startTimeStr = startTime.substring(0, 5);
    const endTimeStr = endTime.substring(0, 5);

    // Loop through all periods untuk hari tersebut
    for (const [period, timeSlot] of Object.entries(daySchedule)) {
      const periodStart = timeSlot.start;
      const periodEnd = timeSlot.end;

      // Check jika period ini termasuk dalam range start-end time
      if (periodStart >= startTimeStr && periodEnd <= endTimeStr) {
        sessions.push(parseInt(period));
      }
    }

    return sessions;
  };

  // Fungsi untuk styling badge berdasarkan status
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case "Sakit":
        return "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800";
      case "Izin":
        return "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800";
      case "Alpa":
        return "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800";
      default:
        return "bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800";
    }
  };

  // Fungsi untuk icon berdasarkan status
  const getStatusIcon = (status) => {
    switch (status) {
      case "Sakit":
        return "🏥";
      case "Izin":
        return "📋";
      case "Alpa":
        return "❌";
      default:
        return "❓";
    }
  };

  // Get current day name
  const currentDay = getDayName(new Date().getDay());

  useEffect(() => {
    console.log("🎯 TeacherDashboard received user:", user);
    console.log("📅 Active Academic Info:", activeAcademicInfo);

    if (user?.teacher_id && activeAcademicInfo) {
      // ✅ TAMBAH CEK activeAcademicInfo
      const teacherCode = user.teacher_id;
      const teacherUUID = user.id;
      console.log("✅ Found teacher_id:", teacherCode);
      console.log("✅ Found user.id:", teacherUUID);
      console.log("✅ Active Semester:", activeAcademicInfo.activeSemester);
      fetchTeacherData(teacherCode, teacherUUID);
    } else if (user?.teacher_id && !activeAcademicInfo) {
      // ✅ JIKA USER ADA TAPI academicInfo BELUM
      console.log("⏳ Waiting for academic info...");
      // Biarin loading aja
    } else if (!user?.teacher_id) {
      console.log("❌ Teacher ID not found in user object:", user);
      setError("Teacher ID tidak ditemukan. Pastikan data guru sudah lengkap.");
      setLoading(false);
    }
  }, [user, activeAcademicInfo]); // ✅ TAMBAH activeAcademicInfo KE DEPENDENCY

  // Fetch jadwal hari ini
  // ✅ NEW: Fetch materi terakhir per kelas+mapel dari jadwal hari ini, buat
  // pengingat pas guru mau masuk kelas. Ambil entri jurnal_harian paling baru
  // SEBELUM hari ini (riwayat murni, bukan entri yang baru diisi hari ini).
  const fetchLastMateri = async (schedule, teacherCode) => {
    if (!teacherCode || !schedule || schedule.length === 0) {
      setLastMateriMap({});
      return;
    }

    try {
      const now = new Date();
      const offset = 7 * 60 * 60 * 1000;
      const todayIndonesia = new Date(now.getTime() + offset);
      const todayString = todayIndonesia.toISOString().split("T")[0];

      // Unique kombinasi class_id + mapel dari jadwal hari ini
      const seen = new Set();
      const uniquePairs = [];
      schedule.forEach((s) => {
        if (!s.class_id || !s.mapel) return;
        const key = `${s.class_id}||${s.mapel}`;
        if (seen.has(key)) return;
        seen.add(key);
        uniquePairs.push({ class_id: s.class_id, subject: s.mapel });
      });

      if (uniquePairs.length === 0) {
        setLastMateriMap({});
        return;
      }

      const materiMap = {};

      for (const pair of uniquePairs) {
        const { data: journalRows, error: journalError } = await supabase
          .from("jurnal_harian")
          .select("tanggal, materi")
          .eq("teacher_id", teacherCode)
          .eq("class_id", pair.class_id)
          .eq("subject", pair.subject)
          .lt("tanggal", todayString)
          .order("tanggal", { ascending: false })
          .limit(1);

        if (journalError) {
          console.error("❌ Error fetching jurnal_harian (materi terakhir):", journalError);
          continue;
        }

        if (journalRows && journalRows.length > 0) {
          materiMap[`${pair.class_id}||${pair.subject}`] = journalRows[0];
        }
      }

      setLastMateriMap(materiMap);
    } catch (err) {
      console.error("❌ Error fetching last materi:", err);
      setLastMateriMap({});
    }
  };

  const fetchTodaySchedule = async (
    teacherCode,
    teacherUUID,
    academicYearId,
    assignmentsForSubjectMap
  ) => {
    try {
      const todayDay = getDayName(new Date().getDay());
      console.log("📅 Hari ini:", todayDay, "| Teacher UUID:", teacherUUID);
      console.log("📅 Academic Year ID:", academicYearId);

      // Weekend check
      if (todayDay === "Sabtu" || todayDay === "Minggu") {
        console.log("⚠️ Weekend - tidak ada jadwal");
        setTodaySchedule([]);
        return [];
      }

      // Query teacher_schedules
      const { data, error } = await supabase
        .from("teacher_schedules")
        .select("*")
        .eq("teacher_id", teacherUUID)
        .eq("day", todayDay)
        .order("start_time", { ascending: true });

      if (error) {
        console.error("❌ Error fetching schedule:", error);
        setTodaySchedule([]);
        return [];
      }

      if (!data || data.length === 0) {
        console.log("ℹ️ Tidak ada jadwal untuk hari ini");
        setTodaySchedule([]);
        return [];
      }

      console.log("📅 Schedule data:", data);

      // Get class details untuk jadwal
      const classIds = [...new Set(data.map((d) => d.class_id))];
      console.log("🎓 Class IDs from schedule:", classIds);

      const { data: classesData } = await supabase
        .from("classes")
        .select("id, grade")
        .in("id", classIds);

      console.log("🏫 Classes for schedule:", classesData);

      // Create mapping class_id -> class info
      const classMap = {};
      classesData?.forEach((c) => {
        classMap[c.id] = { id: c.id, grade: c.grade };
      });

      // ✅ FIX: JANGAN re-query teacher_assignments di sini pakai activeAcademicInfo
      // (state terpisah, bisa beda semester sama query awal di fetchTeacherData
      // yang ambil semester langsung dari DB). Dulu ini nyebabin subjectMap
      // kosong buat sebagian kelas kalau semester-nya gak "nyambung", jadi
      // mapel-nya kebaca fallback "Mata Pelajaran".
      // Sekarang pakai assignments yang udah difetch & tervalidasi di
      // fetchTeacherData (dioper lewat parameter assignmentsForSubjectMap).
      const subjectMap = {};
      (assignmentsForSubjectMap || []).forEach((a) => {
        subjectMap[a.class_id] = a.subject;
      });

      // Merge consecutive schedules
      const merged = [];
      let current = null;

      data.forEach((item) => {
        const mapel = subjectMap[item.class_id] || "Mata Pelajaran";
        const classInfo = classMap[item.class_id];
        const kelas = classInfo?.id || `Kelas ${item.class_id}`;

        if (!current) {
          // ✅ Calculate session numbers untuk block pertama
          const sessionNumbers = calculateSessionNumbers(todayDay, item.start_time, item.end_time);
          current = {
            mapel,
            kelas,
            jam_mulai: formatTime(item.start_time),
            jam_selesai: formatTime(item.end_time),
            start_time_raw: item.start_time, // ✅ Simpan raw time untuk calculate
            end_time_raw: item.end_time,
            class_id: item.class_id,
            sessionCount: sessionNumbers.length,
            sessionNumbers: sessionNumbers,
          };
        } else {
          const sameClass = current.class_id === item.class_id;
          const sameSubject = current.mapel === mapel;
          const consecutive = current.jam_selesai === formatTime(item.start_time);

          if (sameClass && sameSubject && consecutive) {
            // ✅ Merge dan recalculate session numbers
            current.jam_selesai = formatTime(item.end_time);
            current.end_time_raw = item.end_time;
            const newSessionNumbers = calculateSessionNumbers(
              todayDay,
              current.start_time_raw,
              current.end_time_raw
            );
            current.sessionCount = newSessionNumbers.length;
            current.sessionNumbers = newSessionNumbers;
          } else {
            // ✅ Push block sebelumnya
            // (class_id TETAP disimpan — dipakai buat lookup materi terakhir,
            // gak ditampilkan di UI jadi aman. end_time_raw TETAP disimpan juga
            // — dipakai buat badge "Selesai" di JSX)
            const toPush = { ...current };
            delete toPush.start_time_raw;
            merged.push(toPush);

            // ✅ Start block baru
            const sessionNumbers = calculateSessionNumbers(
              todayDay,
              item.start_time,
              item.end_time
            );
            current = {
              mapel,
              kelas,
              jam_mulai: formatTime(item.start_time),
              jam_selesai: formatTime(item.end_time),
              start_time_raw: item.start_time,
              end_time_raw: item.end_time,
              class_id: item.class_id,
              sessionCount: sessionNumbers.length,
              sessionNumbers: sessionNumbers,
            };
          }
        }
      });

      // Push last block
      if (current) {
        delete current.start_time_raw;
        merged.push(current);
      }

      console.log("✅ Jadwal merged:", merged);
      setTodaySchedule(merged);

      // ✅ FETCH MATERI TERAKHIR (pengingat sebelum masuk kelas)
      await fetchLastMateri(merged, teacherCode);

      return merged;
    } catch (error) {
      console.error("❌ FATAL ERROR in fetchTodaySchedule:", error);
      setTodaySchedule([]);
      return [];
    }
  };

  // ✅ FUNGSI BARU: Fetch daftar siswa tidak hadir hari ini
  const fetchAbsentStudents = async (classIds, teacherUUID) => {
    // ✅ TAMBAH PARAMETER
    if (!classIds || classIds.length === 0) {
      console.log("⚠️ No classes to check attendance");
      setAbsentStudents([]);
      return;
    }

    try {
      const now = new Date();
      const offset = 7 * 60 * 60 * 1000;
      const todayIndonesia = new Date(now.getTime() + offset);
      const todayString = todayIndonesia.toISOString().split("T")[0];

      console.log("🔄 Teacher - fetchAbsentStudents called");
      console.log("📅 Query date (WIB):", todayString);
      console.log("🏫 Class IDs to check:", classIds);
      console.log("👨‍🏫 Teacher UUID:", teacherUUID); // ✅ TAMBAH LOG

      const { data: absentData, error: absentError } = await supabase
        .from("attendances")
        .select(
          `
        student_id,
        status,
        students!inner(full_name),
        class_id,
        subject
      `
        )
        .eq("date", todayString)
        .in("class_id", classIds)
        .eq("type", "mapel") // ✅ GANTI DARI "harian" KE "mapel"
        .eq("teacher_id", teacherUUID) // ✅ TAMBAH FILTER GURU
        .in("status", ["Sakit", "Izin", "Alpa"])
        .order("students(full_name)", { ascending: true });

      // ✅ GROUP BY SISWA - HILANGKAN DUPLIKAT
      const studentMap = new Map();

      (absentData || []).forEach((item) => {
        const studentId = item.student_id;

        // Jika siswa belum ada di map, tambahkan
        if (!studentMap.has(studentId)) {
          studentMap.set(studentId, {
            id: studentId,
            full_name: item.students?.full_name || "Nama tidak tersedia",
            status: item.status,
            classes: [item.class_id], // Array kelas
          });
        } else {
          // Jika sudah ada, tambahkan kelas ke array (jika beda)
          const existing = studentMap.get(studentId);
          if (!existing.classes.includes(item.class_id)) {
            existing.classes.push(item.class_id);
          }
          // Prioritaskan status yang lebih "berat" (Alpa > Izin > Sakit)
          const statusPriority = { Alpa: 3, Izin: 2, Sakit: 1 };
          if (statusPriority[item.status] > statusPriority[existing.status]) {
            existing.status = item.status;
          }
        }
      });

      // Convert map ke array dan urutkan
      const formattedAbsentStudents = Array.from(studentMap.values())
        .map((student) => ({
          ...student,
          class_id: student.classes.join(", "), // Gabungkan kelas
        }))
        .sort((a, b) => {
          // ✅ SORT BY CLASS DULU, BARU NAME
          if (a.class_id !== b.class_id) {
            return a.class_id.localeCompare(b.class_id);
          }
          return a.full_name.localeCompare(b.full_name);
        });

      console.log("✅ Teacher - Formatted absent students (GROUPED):", formattedAbsentStudents);
      setAbsentStudents(formattedAbsentStudents);
    } catch (err) {
      console.error("❌ Error fetching absent students:", err);
      setAbsentStudents([]);
    }
  };

  // ✅ NEW: Fetch presensi HARIAN (punya wali kelas) untuk semua kelas yang
  // guru ini ajar mapel-nya hari ini. TIDAK difilter by teacher_id, karena
  // data ini punya WALI KELAS kelas tsb, bukan punya guru mapel yang lagi
  // login -- beda sama fetchAbsentStudents di atas.
  const fetchHarianReferenceForMapelClasses = async (todaySchedule) => {
    if (!todaySchedule || todaySchedule.length === 0) {
      setHarianReferenceByClass({});
      setHarianReferenceStatus("no_schedule");
      return;
    }

    try {
      const now = new Date();
      const offset = 7 * 60 * 60 * 1000;
      const todayIndonesia = new Date(now.getTime() + offset);
      const todayString = todayIndonesia.toISOString().split("T")[0];

      const classIdsToday = [...new Set(todaySchedule.map((s) => s.class_id).filter(Boolean))];

      if (classIdsToday.length === 0) {
        setHarianReferenceByClass({});
        setHarianReferenceStatus("no_schedule");
        return;
      }

      const { data, error } = await supabase
        .from("attendances")
        .select(
          `
        student_id,
        status,
        students!inner(full_name),
        class_id
      `
        )
        .eq("date", todayString)
        .in("class_id", classIdsToday)
        .eq("type", "harian")
        .in("status", ["Sakit", "Izin", "Alpa"])
        .order("students(full_name)", { ascending: true });

      if (error) throw error;

      // ✅ Cek juga apa wali kelas dari kelas-kelas ini SUDAH presensi hari
      // ini sama sekali (walau hasilnya semua Hadir) -- biar bisa bedain
      // "belum presensi" vs "udah presensi, semua hadir".
      const { data: anyHarianToday, error: anyError } = await supabase
        .from("attendances")
        .select("class_id")
        .eq("date", todayString)
        .in("class_id", classIdsToday)
        .eq("type", "harian")
        .limit(1);

      if (anyError) throw anyError;

      // Group by class_id, dedup per student
      const byClass = {};
      (data || []).forEach((item) => {
        const classId = item.class_id;
        if (!byClass[classId]) byClass[classId] = new Map();
        if (!byClass[classId].has(item.student_id)) {
          byClass[classId].set(item.student_id, {
            id: item.student_id,
            full_name: item.students?.full_name || "Nama tidak tersedia",
            status: item.status,
          });
        }
      });

      const result = {};
      Object.entries(byClass).forEach(([classId, studentMap]) => {
        result[classId] = Array.from(studentMap.values()).sort((a, b) =>
          a.full_name.localeCompare(b.full_name)
        );
      });

      setHarianReferenceByClass(result);

      if (Object.keys(result).length > 0) {
        setHarianReferenceStatus("has_data");
      } else if (anyHarianToday && anyHarianToday.length > 0) {
        // Wali kelas dari kelas lain udah presensi, tapi semua siswa Hadir
        setHarianReferenceStatus("has_data");
      } else {
        setHarianReferenceStatus("no_data_yet");
      }
    } catch (err) {
      console.error("❌ Error fetching harian reference:", err);
      setHarianReferenceByClass({});
      setHarianReferenceStatus("no_data_yet");
    }
  };

  const fetchTeacherData = async (teacherCode, teacherUUID) => {
    try {
      setLoading(true);
      setError(null);

      // 1. Get current academic year (dari activeAcademicInfo yang udah diambil
      // lewat service di awal komponen - gak query manual lagi. Sebelumnya di
      // sini ada query kedua `.eq("is_active", true).single()` yang jalan
      // TIAP KALI dashboard dibuka, dan bakal error total kalau ada 0 atau 2+
      // tahun ajaran ke-mark aktif - jadi dihapus, cukup pakai satu sumber.
      if (!activeAcademicInfo || !activeAcademicInfo.activeSemesterId) {
        throw new Error("Tahun ajaran aktif tidak ditemukan.");
      }

      const academicYearId = activeAcademicInfo.activeSemesterId;
      const activeSemester = activeAcademicInfo.activeSemester;
      setCurrentAcademicYearId(academicYearId);

      console.log("📅 Academic Year ID:", academicYearId, "Year:", activeAcademicInfo.year);
      console.log("📅 Active Semester (from DB):", activeSemester);
      console.log("🔍 Teacher Code:", teacherCode);

      // 2. Get teacher assignments - GUNAKAN SEMESTER DARI DB LANGSUNG
      const { data: assignments, error: assignError } = await supabase
        .from("teacher_assignments")
        .select("id, class_id, subject, academic_year_id, semester, academic_year")
        .eq("teacher_id", teacherCode)
        .eq("academic_year_id", academicYearId)
        .eq("semester", activeSemester); // ✅ PAKAI SEMESTER DARI DB!

      console.log("✅ Assignments result:", assignments);
      console.log("❌ Assignment error:", assignError);

      if (assignError) {
        console.error("❌ Teacher assignments error:", assignError);
        throw assignError;
      }

      // ✅ JANGAN THROW ERROR, SET KOSONG AJA
      if (!assignments || assignments.length === 0) {
        console.log("⚠️ Tidak ada penugasan untuk semester ini");
        setStats({
          totalStudents: 0,
          totalClasses: 0,
          subjects: [],
          classesTaught: [],
        });
        setAnnouncements([]);
        setTodaySchedule([]);
        setAbsentStudents([]);
        setHarianReferenceByClass({});
        setHarianReferenceStatus("no_schedule");
        setLoading(false);
        return;
      }

      console.log("✅ Teacher assignments:", assignments);

      // 3. Get class details terpisah
      const classIds = [...new Set(assignments.map((a) => a.class_id))];
      console.log("🎓 Class IDs to fetch:", classIds);

      const { data: classesData } = await supabase
        .from("classes")
        .select("id, grade")
        .in("id", classIds);

      console.log("🏫 Classes data:", classesData);

      // 4. Gabungkan manual
      const assignmentsWithClasses = assignments.map((assignment) => {
        const classData = classesData?.find((c) => c.id === assignment.class_id);
        return {
          ...assignment,
          classes: classData || {
            id: assignment.class_id,
            grade: assignment.class_id.charAt(0),
          },
        };
      });

      console.log("✅ Final assignments with classes:", assignmentsWithClasses);

      // Get unique subjects and classes
      const subjects = [...new Set(assignmentsWithClasses.map((a) => a.subject))];
      const classesTaught = assignmentsWithClasses.map((a) => ({
        id: a.class_id,
        className: a.classes.id,
        grade: a.classes.grade,
        subject: a.subject,
      }));

      // Count total students
      const { data: studentsData } = await supabase
        .from("students")
        .select("id, class_id")
        .in("class_id", classIds);

      const totalStudents = studentsData ? studentsData.length : 0;

      // Get announcements
      const { data: announcementsData } = await supabase
        .from("announcement")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      setStats({
        totalStudents,
        totalClasses: classIds.length,
        subjects,
        classesTaught,
      });

      setAnnouncements(announcementsData || []);

      // ✅ FETCH DAFTAR SISWA TIDAK HADIR
      await fetchAbsentStudents(classIds, teacherUUID);

      // Fetch today's schedule
      const schedule = await fetchTodaySchedule(
        teacherCode,
        teacherUUID,
        academicYearId,
        assignmentsWithClasses
      );

      // ✅ NEW: Referensi presensi harian dari wali kelas, buat kelas-kelas
      // yang guru ini ajar mapel-nya HARI INI (bukan semua kelas semester ini).
      await fetchHarianReferenceForMapelClasses(schedule);
    } catch (err) {
      console.error("❌ Error in fetchTeacherData:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (user?.teacher_id || user?.id) {
      fetchTeacherData(user.teacher_id, user.id);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? "dark" : ""}`}>
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-gray-400">Memuat dashboard...</p>
            {activeAcademicInfo?.displayText && (
              <p className="text-xs text-slate-500 dark:text-gray-500 mt-2">
                {activeAcademicInfo.displayText}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? "dark" : ""}`}>
        <div className="min-h-screen bg-slate-50 dark:bg-gray-900 p-4 sm:p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-red-50 dark:from-red-900/20 to-rose-50 dark:to-rose-900/10 rounded-xl shadow-lg border border-red-200 dark:border-red-800 p-6 sm:p-8 text-center">
              <div className="text-red-500 dark:text-red-400 text-4xl sm:text-5xl mb-4">⚠️</div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-gray-100 mb-2">
                Terjadi Kesalahan
              </h3>
              <p className="text-red-600 dark:text-red-400 mb-4 text-sm sm:text-base">{error}</p>
              {activeAcademicInfo?.displayText && (
                <p className="text-xs text-slate-600 dark:text-gray-400 mb-4">
                  Semester Aktif: {activeAcademicInfo.displayText}
                </p>
              )}
              <button
                onClick={handleRetry}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Coba Lagi
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate subject breakdown
  const subjectBreakdown = {};
  stats.classesTaught.forEach((cls) => {
    if (!subjectBreakdown[cls.subject]) {
      subjectBreakdown[cls.subject] = [];
    }
    subjectBreakdown[cls.subject].push(cls.className);
  });

  // Get primary subject
  const primarySubject = Object.keys(subjectBreakdown).reduce(
    (a, b) => (subjectBreakdown[a].length > subjectBreakdown[b].length ? a : b),
    stats.subjects[0] || ""
  );

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? "dark" : ""}`}>
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 p-4 sm:p-6 overflow-x-hidden">
        <div className="max-w-7xl mx-auto">
          {/* Pop-up Pengumuman */}
          <AnnouncementPopup userId={user?.id} userRole="teacher" />

          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="bg-gradient-to-br from-white dark:from-gray-800 via-blue-50/30 dark:via-blue-900/10 to-indigo-50/50 dark:to-indigo-900/10 rounded-xl shadow-lg border border-slate-200 dark:border-gray-700 p-4 sm:p-6 lg:p-8 backdrop-blur-sm">
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-gray-100 mb-3 sm:mb-2">
                  Selamat Datang, {user?.full_name || user?.username}
                </h1>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {stats.subjects.length > 1 ? (
                    <span className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      Guru {stats.subjects.join(", ")}
                    </span>
                  ) : (
                    primarySubject && (
                      <span className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        Guru {primarySubject}
                      </span>
                    )
                  )}
                  {/* ✅ TAMBAHAN: Info Semester Aktif */}
                  {activeAcademicInfo?.displayText && (
                    <span className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      {activeAcademicInfo.displayText}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Aksi Cepat dihapus - shortcut (Presensi Guru, Presensi Siswa,
              Jurnal Harian, Laporan) sudah dipindah ke BottomNav mobile. Lihat BottomNav.js. */}

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-6 mb-6 sm:mb-8">
            {/* Total Siswa */}
            <div className="group bg-gradient-to-br from-blue-50 dark:from-blue-900/10 via-white dark:via-gray-800 to-indigo-50 dark:to-indigo-900/10 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl border border-blue-100 dark:border-blue-800 hover:border-blue-200 dark:hover:border-blue-600 p-2 sm:p-6 transform hover:-translate-y-1 transition-all duration-300">
              <div className="flex flex-col sm:flex-row items-center sm:items-center sm:justify-between gap-1.5 sm:gap-0 text-center sm:text-left">
                <div className="w-8 h-8 sm:w-12 sm:h-12 order-1 sm:order-2 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <span className="text-white text-base sm:text-3xl">👨‍🎓</span>
                </div>
                <div className="order-2 sm:order-1">
                  <p className="text-xs leading-tight sm:text-base text-blue-600 dark:text-blue-400 mb-0.5 sm:mb-1 font-medium">
                    Total Siswa
                  </p>
                  <p className="text-lg sm:text-3xl font-bold text-slate-800 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                    {stats.totalStudents}
                  </p>
                </div>
              </div>
            </div>

            {/* Total Kelas */}
            <div className="group bg-gradient-to-br from-emerald-50 dark:from-emerald-900/10 via-white dark:via-gray-800 to-green-50 dark:to-green-900/10 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl border border-emerald-100 dark:border-emerald-800 hover:border-emerald-200 dark:hover:border-emerald-600 p-2 sm:p-6 transform hover:-translate-y-1 transition-all duration-300">
              <div className="flex flex-col sm:flex-row items-center sm:items-center sm:justify-between gap-1.5 sm:gap-0 text-center sm:text-left">
                <div className="w-8 h-8 sm:w-12 sm:h-12 order-1 sm:order-2 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <span className="text-white text-base sm:text-3xl">🏫</span>
                </div>
                <div className="order-2 sm:order-1">
                  <p className="text-xs leading-tight sm:text-base text-emerald-600 dark:text-emerald-400 mb-0.5 sm:mb-1 font-medium">
                    Total Kelas
                  </p>
                  <p className="text-lg sm:text-3xl font-bold text-slate-800 dark:text-gray-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                    {stats.totalClasses}
                  </p>
                </div>
              </div>
            </div>

            {/* Mata Pelajaran */}
            <div className="group bg-gradient-to-br from-purple-50 dark:from-purple-900/10 via-white dark:via-gray-800 to-violet-50 dark:to-violet-900/10 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl border border-purple-100 dark:border-purple-800 hover:border-purple-200 dark:hover:border-purple-600 p-2 sm:p-6 transform hover:-translate-y-1 transition-all duration-300">
              <div className="flex flex-col sm:flex-row items-center sm:items-center sm:justify-between gap-1.5 sm:gap-0 text-center sm:text-left">
                <div className="w-8 h-8 sm:w-12 sm:h-12 order-1 sm:order-2 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg sm:ml-4">
                  <span className="text-white text-base sm:text-3xl">📚</span>
                </div>
                <div className="order-2 sm:order-1 sm:flex-1">
                  <p className="text-xs leading-tight sm:text-base text-purple-600 dark:text-purple-400 mb-0.5 sm:mb-1 font-medium">
                    Mata Pelajaran
                  </p>
                  <p className="text-lg sm:text-3xl font-bold text-slate-800 dark:text-gray-100 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                    {stats.subjects.length}
                  </p>
                  <p className="hidden sm:block text-xs text-slate-600 dark:text-gray-400 mt-1 break-words">
                    {stats.subjects.join(", ")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Left Column: Mata Pelajaran & Kelas + Daftar Siswa Tidak Hadir */}
            <div className="h-full flex flex-col">
              {/* Mata Pelajaran & Kelas -- flex-1 biar card ini stretch
                  ngikutin tinggi card "Jadwal Hari Ini" di kolom kanan
                  (grid defaultnya udah stretch row-nya, tapi div wrapper
                  polos di atas ini gak nurunin stretch itu ke card di
                  dalemnya tanpa flex eksplisit). */}
              <div className="flex-1 flex flex-col bg-gradient-to-br from-white dark:from-gray-800 via-slate-50/30 dark:via-gray-700/30 to-blue-50/30 dark:to-blue-900/20 rounded-xl shadow-lg border border-slate-200 dark:border-gray-700 p-4 sm:p-6 backdrop-blur-sm">
                <h3 className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-gray-100 mb-4 flex items-center">
                  <span className="mr-2 text-blue-600 dark:text-blue-400">📖</span>
                  Mata Pelajaran & Kelas
                </h3>
                <div className="space-y-4">
                  {Object.entries(subjectBreakdown).map(([subject, classes]) => {
                    const classByGrade = {};
                    classes.forEach((className) => {
                      const grade = className.charAt(0);
                      if (!classByGrade[grade]) classByGrade[grade] = [];
                      classByGrade[grade].push(className);
                    });

                    return (
                      <div
                        key={subject}
                        className="bg-gradient-to-r from-slate-50 dark:from-gray-700 to-white dark:to-gray-800 border border-slate-200 dark:border-gray-600 rounded-xl p-4 hover:shadow-md transition-all duration-300 transform hover:scale-[1.02]"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-slate-800 dark:text-gray-100 text-lg sm:text-xl">
                            {subject}
                          </h4>
                          <span className="text-sm sm:text-base text-slate-500 dark:text-gray-400 bg-slate-100 dark:bg-gray-700 px-2.5 py-1 rounded-full">
                            {classes.length} kelas
                          </span>
                        </div>
                        <div className="space-y-2">
                          {Object.entries(classByGrade)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([grade, gradeClasses]) => (
                              <div key={grade} className="flex flex-wrap gap-2">
                                {gradeClasses.sort().map((className, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm sm:text-base font-semibold bg-gradient-to-r from-blue-100 dark:from-blue-900/30 to-indigo-100 dark:to-indigo-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:scale-105 transition-transform"
                                  >
                                    {className}
                                  </span>
                                ))}
                              </div>
                            ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ✅ DAFTAR SISWA TIDAK HADIR HARI INI */}
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-gray-700">
                  <h4 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-gray-100 mb-3 flex items-center">
                    <span className="mr-2 text-red-600 dark:text-red-400">📋</span>
                    Siswa Tidak Hadir - Mata Pelajaran {primarySubject ? `(${primarySubject})` : ""}
                  </h4>

                  {absentStudents.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm sm:text-base">
                        <thead className="text-sm text-slate-500 dark:text-gray-400 border-b border-slate-200 dark:border-gray-700">
                          <tr>
                            <th className="py-2 px-3 text-left w-12">No</th>
                            <th className="py-2 px-3 text-left">Nama Siswa</th>
                            <th className="py-2 px-3 text-left w-24">Kelas</th>
                            <th className="py-2 px-3 text-left w-32">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {absentStudents.map((student, index) => (
                            <tr
                              key={student.id}
                              className="border-b border-slate-100 dark:border-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                              <td className="py-2 px-3 text-slate-600 dark:text-gray-400">
                                {index + 1}
                              </td>
                              <td className="py-2 px-3 font-medium text-slate-800 dark:text-gray-200">
                                {student.full_name}
                              </td>
                              <td className="py-2 px-3 text-slate-600 dark:text-gray-400">
                                {student.class_id}
                              </td>
                              <td className="py-2 px-3">
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${getStatusBadgeStyle(
                                    student.status
                                  )}`}
                                >
                                  {getStatusIcon(student.status)} {student.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="mt-3 text-sm text-slate-500 dark:text-gray-400">
                        Total: {absentStudents.length} siswa tidak hadir
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 border border-slate-200 dark:border-gray-700 rounded-lg bg-slate-50 dark:bg-gray-900/30">
                      <div className="text-2xl mb-2">🎉</div>
                      <p className="text-base text-slate-600 dark:text-gray-400">
                        Semua siswa hadir hari ini
                      </p>
                      <p className="text-sm text-slate-500 dark:text-gray-500 mt-1">
                        Tidak ada siswa yang sakit, izin, atau alpa
                      </p>
                    </div>
                  )}
                </div>

                {/* ✅ NEW SECTION: REFERENSI PRESENSI HARIAN DARI WALI KELAS
                    "Contekan" sebelum guru mapel input presensi mapel-nya
                    sendiri -- diambil dari presensi harian yg sudah diinput
                    wali kelas kelas tsb (BUKAN input guru mapel ini). Pola
                    sama persis kayak di HomeroomTeacherDashboard.js, cuma
                    di sini gak ada status "only_homeroom" karena guru mapel
                    biasa gak punya kelas walian sendiri. */}
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-gray-700">
                  <h4 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-gray-100 mb-1 flex items-center">
                    <span className="mr-2 text-indigo-600 dark:text-indigo-400">📋</span>
                    Referensi Presensi Harian (dari Wali Kelas)
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-gray-400 mb-3">
                    Data ini dari presensi harian yang sudah diinput wali kelas masing-masing.
                    Gunakan sebagai gambaran awal sebelum mengisi presensi mapel Anda sendiri.
                  </p>

                  {harianReferenceStatus === "no_schedule" && (
                    <div className="text-center py-4 border border-slate-200 dark:border-gray-700 rounded-lg bg-slate-50 dark:bg-gray-900/30">
                      <div className="text-xl mb-2">📅</div>
                      <p className="text-sm text-slate-600 dark:text-gray-400">
                        Tidak ada jadwal mengajar hari ini
                      </p>
                      <p className="text-xs text-slate-500 dark:text-gray-500 mt-1">
                        Referensi presensi harian akan muncul di sini pada hari Anda memiliki jadwal
                        mengajar mapel.
                      </p>
                    </div>
                  )}

                  {harianReferenceStatus === "no_data_yet" && (
                    <div className="text-center py-4 border border-amber-200 dark:border-amber-700 rounded-lg bg-amber-50 dark:bg-amber-900/30">
                      <div className="text-xl mb-2">⏳</div>
                      <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                        Wali kelas dari kelas yang Anda ajar hari ini belum menginput presensi
                        harian
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                        Coba cek lagi beberapa saat lagi, atau hubungi wali kelas terkait.
                      </p>
                    </div>
                  )}

                  {harianReferenceStatus === "has_data" &&
                    Object.keys(harianReferenceByClass).length === 0 && (
                      <div className="text-center py-4 border border-slate-200 dark:border-gray-700 rounded-lg bg-slate-50 dark:bg-gray-900/30">
                        <div className="text-xl mb-2">🎉</div>
                        <p className="text-sm text-slate-600 dark:text-gray-400">
                          Semua siswa hadir di kelas yang Anda ajar hari ini (berdasarkan presensi
                          harian wali kelas)
                        </p>
                      </div>
                    )}

                  {harianReferenceStatus === "has_data" &&
                    Object.keys(harianReferenceByClass).length > 0 && (
                      <div className="space-y-4">
                        {Object.entries(harianReferenceByClass)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([classId, studentsInClass]) => (
                            <div
                              key={classId}
                              className="border border-indigo-100 dark:border-indigo-900/50 rounded-lg p-3 bg-indigo-50/40 dark:bg-indigo-900/10"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                                  🏫 Kelas {classId}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-gray-400">
                                  {studentsInClass.length} siswa tidak hadir
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {studentsInClass.map((student) => (
                                  <span
                                    key={student.id}
                                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeStyle(
                                      student.status
                                    )}`}
                                  >
                                    {getStatusIcon(student.status)} {student.full_name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                </div>
              </div>
            </div>

            {/* Jadwal Hari Ini */}
            <div className="bg-gradient-to-br from-white dark:from-gray-800 via-slate-50/30 dark:via-gray-700/30 to-indigo-50/30 dark:to-indigo-900/20 rounded-xl shadow-lg border border-slate-200 dark:border-gray-700 p-4 sm:p-6 backdrop-blur-sm">
              <h3 className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-gray-100 mb-4 flex items-center">
                <span className="mr-2 text-indigo-600 dark:text-indigo-400">🗓️</span>
                Jadwal Hari Ini - {currentDay}
              </h3>
              {todaySchedule.length > 0 ? (
                <div className="space-y-3">
                  {todaySchedule.map((schedule, index) => (
                    <div
                      key={index}
                      className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="text-center min-w-[76px]">
                            {/* ✅ Tampilkan Session Numbers */}
                            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                              {schedule.sessionCount}JP ({schedule.sessionNumbers.join("-")})
                            </div>
                            <div className="font-semibold text-blue-700 dark:text-blue-400 text-sm sm:text-base">
                              {schedule.jam_mulai}
                            </div>
                            <div className="text-xs text-slate-400 dark:text-gray-500">-</div>
                            <div className="font-semibold text-blue-700 dark:text-blue-400 text-sm sm:text-base">
                              {schedule.jam_selesai}
                            </div>
                          </div>
                          <div className="h-auto min-h-[60px] w-px bg-slate-200 dark:bg-gray-600"></div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="font-semibold text-slate-800 dark:text-gray-100 text-base sm:text-lg">
                                {schedule.mapel}
                              </div>
                              {/* ✅ NEW: Badge "Selesai" - di sebelah kanan Mapel biar hemat tempat */}
                              {isBlockDone(schedule.end_time_raw) && (
                                <span className="inline-flex items-center gap-0.5 shrink-0 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded-full">
                                  ✓ Selesai
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-400">
                              <span className="flex items-center gap-1">
                                <span>🏫</span>
                                <span>{schedule.kelas}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ✅ NEW: Pengingat materi terakhir sebelum masuk kelas */}
                      {(() => {
                        const lastMateri = lastMateriMap[`${schedule.class_id}||${schedule.mapel}`];
                        return lastMateri ? (
                          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-gray-700">
                            <p className="text-sm text-slate-500 dark:text-gray-400">
                              📝 Materi terakhir ({formatTanggalIndoSingkat(lastMateri.tanggal)}):
                            </p>
                            <p className="text-sm sm:text-base font-medium text-slate-700 dark:text-gray-200 mt-0.5 truncate">
                              {lastMateri.materi || "-"}
                            </p>
                          </div>
                        ) : (
                          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-gray-700">
                            <p className="text-sm text-slate-400 dark:text-gray-500 italic">
                              Belum ada riwayat materi sebelumnya
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">📅</div>
                  <h4 className="font-semibold text-slate-800 dark:text-gray-100 mb-2 text-base sm:text-lg">
                    Tidak Ada Jadwal
                  </h4>
                  <p className="text-sm sm:text-base text-slate-600 dark:text-gray-400">
                    Anda Tidak Memiliki Jadwal Mengajar Hari Ini
                  </p>
                  <p className="text-sm text-slate-500 dark:text-gray-500 mt-2">
                    Selamat Menikmati Hari Libur ! 🎉
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Pengumuman */}
          <div className="bg-gradient-to-br from-white dark:from-gray-800 via-orange-50/30 dark:via-orange-900/10 to-amber-50/50 dark:to-amber-900/10 rounded-xl shadow-lg border border-orange-100 dark:border-orange-800 p-4 sm:p-6 backdrop-blur-sm">
            <h3 className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-gray-100 mb-4 flex items-center">
              <span className="mr-2 text-orange-600 dark:text-orange-400">📢</span>
              Pengumuman Terkini
            </h3>
            {announcements.length > 0 ? (
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="group border-l-4 border-orange-500 dark:border-orange-600 bg-gradient-to-r from-orange-50/80 dark:from-orange-900/20 to-amber-50/50 dark:to-amber-900/10 hover:from-orange-100/80 dark:hover:from-orange-900/30 hover:to-amber-100/50 dark:hover:to-amber-900/20 pl-4 py-3 rounded-r-xl transition-all duration-300 transform hover:scale-[1.02] shadow-md hover:shadow-lg"
                  >
                    <h4 className="font-semibold text-slate-800 dark:text-gray-100 group-hover:text-orange-700 dark:group-hover:text-orange-400 transition-colors text-base sm:text-lg flex items-start">
                      <span className="mr-2 mt-0.5">📋</span>
                      {announcement.title}
                    </h4>
                    <p className="text-sm sm:text-base text-slate-600 dark:text-gray-400 mt-2 ml-6 group-hover:text-slate-700 dark:group-hover:text-gray-300 transition-colors">
                      {announcement.content}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-gray-500 mt-2 ml-6 flex items-center group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                      <span className="mr-1">🕐</span>
                      {new Date(announcement.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12 bg-gradient-to-br from-slate-50 dark:from-gray-700 to-orange-50/30 dark:to-orange-900/10 rounded-xl border-2 border-dashed border-orange-200 dark:border-orange-800">
                <div className="text-2xl sm:text-4xl mb-4 animate-bounce">📢</div>
                <h4 className="font-medium text-slate-800 dark:text-gray-100 mb-2 text-base sm:text-lg">
                  Belum Ada Pengumuman
                </h4>
                <p className="text-sm sm:text-base text-slate-600 dark:text-gray-400 mb-4">
                  Pengumuman terbaru akan ditampilkan di sini
                </p>
                <div className="inline-flex items-center px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-sm font-medium">
                  <span className="mr-1">💡</span>
                  Tip: Cek kembali secara berkala
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 💬 Saran & Masukan Guru */}
        <div className="mt-6">
          <FeedbackGuru guruId={user?.id} />
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
