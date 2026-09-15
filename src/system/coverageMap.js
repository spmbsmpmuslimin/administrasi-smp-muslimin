// src/system/coverageMap.js
//
// Peta setiap tabel Supabase -> halaman/komponen React yang mengelolanya.
// Isi create/read/update/delete dengan true/false sesuai kondisi nyata di kode kamu.
// null = belum dicek.
//
// notes: catatan bebas, misal "delete belum ada tombolnya" atau "cuma auto-generate sistem".

export const tableCoverage = {
  academic_years: {
    page: "setting/academic/AcademicYearTab.js",
    create: null, read: null, update: null, delete: null,
    notes: "",
  },
  announcement: {
    page: "components/AnnouncementPopup.js",
    create: null, read: null, update: null, delete: null,
    notes: "",
  },
  announcement_reads: {
    page: null,
    create: null, read: null, update: null, delete: null,
    notes: "Kemungkinan cuma dicatat otomatis saat user baca announcement",
  },
  app_config: {
    page: "setting/MaintenanceModeTab.js",
    create: null, read: null, update: null, delete: null,
    notes: "",
  },
  attendance_eraport: {
    page: "e-raport/InputKehadiran.js",
    create: null, read: null, update: null, delete: null,
    notes: "",
  },
  attendances: {
    page: "pages/attendance/Attendance.js",
    create: null, read: null, update: null, delete: null,
    notes: "",
  },
  attendances_view: {
    page: "pages/attendance/AttendanceTable.js",
    create: false, read: null, update: false, delete: false,
    notes: "Ini nama tabelnya 'view' - kemungkinan read-only (SQL VIEW), wajar kalau C/U/D false",
  },
  catatan_eraport: {
    page: "e-raport/InputCatatan.js",
    create: null, read: null, update: null, delete: null,
    notes: "",
  },
  classes: {
    page: "pages/Classes.js",
    create: null, read: null, update: null, delete: null,
    notes: "",
  },
  cleanup_history: {
    page: "system/DatabaseCleanupMonitor.js",
    create: false, read: null, update: false, delete: false,
    notes: "Biasanya auto-generate dari sistem, cek apakah ada halaman buat lihat historinya",
  },
  ekstrakurikuler_eraport: {
    page: "e-raport/InputEkstrakurikuler.js",
    create: null, read: null, update: null, delete: null,
    notes: "",
  },
  eraport_settings: {
    page: null,
    create: null, read: null, update: null, delete: null,
    notes: "Cek apakah ada tab settings khusus e-raport",
  },
  feedback_guru: {
    page: "components/FeedbackGuru.js",
    create: null, read: null, update: null, delete: null,
    notes: "",
  },
  grades: {
    page: "pages/grade/Grades.js",
    create: null, read: null, update: null, delete: null,
    notes: "",
  },
  grades_katrol: {
    page: "pages/grade/GradesKatrol.js",
    create: null, read: null, update: null, delete: null,
    notes: "",
  },
  grades_katrol_settings: {
    page: null,
    create: null, read: null, update: null, delete: null,
    notes: "Cek apakah setting KKM/nilai maksimal ada UI-nya atau nempel di GradesKatrol.js",
  },
  jurnal_harian: {
    page: null,
    create: null, read: null, update: null, delete: null,
    notes: "Nggak ketemu file spesifik di strukturfile, cek ulang",
  },
  konseling: {
    page: "konseling/Konseling.js",
    create: null, read: null, update: null, delete: null,
    notes: "",
  },
  nilai_eraport: {
    page: "e-raport/InputNilai.js",
    create: null, read: null, update: null, delete: null,
    notes: "",
  },
  nilai_eraport_detail: {
    page: "e-raport/InputTP.js",
    create: null, read: null, update: null, delete: null,
    notes: "",
  },
  raport_config: {
    page: "e-raport/RaportConfig.js",
    create: null, read: null, update: null, delete: null,
    notes: "",
  },
  raport_metadata: {
    page: null,
    create: null, read: null, update: null, delete: null,
    notes: "Data kepala sekolah/ttd untuk cetak raport - cek apakah ada form settingnya",
  },
  school_settings: {
    page: "setting/SchoolSettingsTab.js",
    create: null, read: null, update: null, delete: null,
    notes: "",
  },
  siswa_baru: {
    page: "spmb/StudentList.js",
    create: null, read: null, update: null, delete: null,
    notes: "",
  },
  spmb_settings: {
    page: "spmb/SPMB.js",
    create: null, read: null, update: null, delete: null,
    notes: "",
  },
  student_development_notes: {
    page: "pages/CatatanSiswa.js",
    create: null, read: null, update: null, delete: null,
    notes: "",
  },
  students: {
    page: "pages/Students.js",
    create: null, read: null, update: null, delete: null,
    notes: "",
  },
  system_health_logs: {
    page: "system/MonitorHistory.js",
    create: false, read: null, update: false, delete: false,
    notes: "Auto-generate dari HealthChecker, wajar kalau C/U/D false",
  },
  teacher_assignments: {
    page: "setting/TeacherAssignmentTab.js",
    create: null, read: null, update: null, delete: null,
    notes: "",
  },
  teacher_attendance: {
    page: "attendance-teacher/TeacherAttendance.js",
    create: null, read: null, update: null, delete: null,
    notes: "",
  },
  teacher_attendance_view: {
    page: "attendance-teacher/AdminAttendanceView.js",
    create: false, read: null, update: false, delete: false,
    notes: "Ini VIEW, kemungkinan read-only - wajar C/U/D false",
  },
  teacher_schedules: {
    page: "pages/TeacherSchedule.js",
    create: null, read: null, update: null, delete: null,
    notes: "",
  },
  tujuan_pembelajaran: {
    page: "e-raport/InputTP.js",
    create: null, read: null, update: null, delete: null,
    notes: "",
  },
  users: {
    page: "setting/UserManagementTab.js",
    create: null, read: null, update: null, delete: null,
    notes: "",
  },
};
