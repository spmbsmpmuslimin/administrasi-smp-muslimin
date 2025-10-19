// reports/ReportHelpers.js
// ============================================
// 🎯 CENTRALIZED REPORT HELPERS - ENHANCED
// ============================================
// Purpose: Single source of truth untuk semua report logic
// Usage: Import functions yang dibutuhkan di setiap role component
// Last Update: 2025-10-19
// ============================================

import { supabase } from '../supabaseClient';

// ==================== CONSTANTS ====================

export const TEACHER_ROLES = ['teacher', 'guru_bk'];

export const ATTENDANCE_STATUS_MAP = {
  'hadir': 'Hadir',
  'tidak_hadir': 'Tidak Hadir', 
  'alpa': 'Alpa',
  'sakit': 'Sakit',
  'izin': 'Izin'
};

// ==================== DATE FORMATTERS ====================

export const formatDate = (dateString, options = {}) => {
  if (!dateString) return '-';
  
  try {
    const defaultOptions = {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...options
    };
    
    return new Date(dateString).toLocaleDateString('id-ID', defaultOptions);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  
  try {
    return new Date(dateString).toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return '-';
  }
};

// ==================== STATUS FORMATTERS ====================

export const formatRole = (role) => {
  const roleMap = {
    'guru_bk': 'Guru BK',
    'teacher': 'Guru',
    'homeroom': 'Wali Kelas',
    'admin': 'Admin',
    'kepala_sekolah': 'Kepala Sekolah'
  };
  return roleMap[role?.toLowerCase()] || role || '-';
};

export const formatGender = (gender) => {
  if (!gender) return '-';
  return gender.toUpperCase() === 'L' ? 'Laki-laki' : 'Perempuan';
};

export const formatActiveStatus = (isActive) => {
  return isActive ? 'Aktif' : 'Tidak Aktif';
};

export const formatAttendanceStatus = (status) => {
  const lowerStatus = status?.toLowerCase() || '';
  return ATTENDANCE_STATUS_MAP[lowerStatus] || status || '-';
};

// ==================== STANDARDIZED HEADERS ====================

export const REPORT_HEADERS = {
  // Teacher reports
  teachers: [
    'Kode Guru',
    'Username', 
    'Nama Lengkap',
    'Role',
    'Wali Kelas',
    'Status',
    'Tanggal Bergabung'
  ],
  
  // Student reports
  students: [
    'NIS',
    'Nama Lengkap',
    'Jenis Kelamin',
    'Kelas',
    'Tingkat',
    'Tahun Ajaran'
  ],
  
  studentsSimple: [
    'NIS',
    'Nama Lengkap',
    'Jenis Kelamin',
    'Kelas',
    'Tahun Ajaran'
  ],
  
  // Attendance reports
  attendance: [
    'Tanggal',
    'NIS',
    'Nama Siswa',
    'Kelas',
    'Status Kehadiran'
  ],
  
  attendanceRecap: [
    'NIS',
    'Nama Siswa',
    'Kelas',
    'Hadir',
    'Sakit',
    'Izin',
    'Absen',
    'Total',
    'Persentase'
  ],
  
  // Grade reports
  grades: [
    'Tahun Ajaran',
    'Semester',
    'NIS',
    'Nama Siswa',
    'Kelas',
    'Mata Pelajaran',
    'Jenis',
    'Nilai',
    'Guru'
  ],
  
  gradesSimple: [
    'Tahun Ajaran',
    'Semester',
    'NIS',
    'Nama Siswa',
    'Kelas',
    'Mata Pelajaran',
    'Jenis',
    'Nilai'
  ]
};

// ==================== ROW FORMATTERS ====================

export const formatTeacherRow = (row) => ({
  teacher_id: row.teacher_id || '-',
  username: row.username || '-',
  full_name: row.full_name || '-',
  role: formatRole(row.role),
  homeroom_class_id: row.homeroom_class_id || '-',
  is_active: formatActiveStatus(row.is_active),
  created_at: formatDate(row.created_at)
});

export const formatStudentRow = (row, includeGrade = true) => {
  const base = {
    nis: row.nis || '-',
    full_name: row.full_name || '-',
    gender: formatGender(row.gender),
    class_id: row.class_id || '-'
  };
  
  if (includeGrade) {
    base.grade = row.classes?.grade || row.grade || '-';
  }
  
  base.academic_year = row.academic_year || '-';
  
  return base;
};

export const formatAttendanceRow = (row) => ({
  date: formatDate(row.date),
  student_nis: row.students?.nis || row.nis || '-',
  student_name: row.students?.full_name || row.full_name || '-',
  class_id: row.students?.class_id || row.class_id || '-',
  status: formatAttendanceStatus(row.status)
});

export const formatGradeRow = (row, teacherMap = {}) => ({
  academic_year: row.academic_year || '-',
  semester: row.semester || '-',
  nis: row.students?.nis || row.nis || '-',
  full_name: row.students?.full_name || row.full_name || '-',
  class_id: row.students?.class_id || row.class_id || '-',
  subject: row.subject || '-',
  assignment_type: row.assignment_type || '-',
  score: row.score || 0,
  teacher: teacherMap[row.teacher_id] || row.users?.full_name || '-'
});

// ==================== DATA FETCHERS ====================

/**
 * Fetch teachers data
 */
export const fetchTeachersData = async (filters = {}) => {
  let query = supabase
    .from('users')
    .select('*')
    .in('role', TEACHER_ROLES)
    .neq('username', 'adenurmughni')
    .eq('is_active', true)
    .order('teacher_id');

  const { data, error } = await query;
  if (error) throw error;

  const formattedData = data?.map(formatTeacherRow) || [];
  
  return {
    headers: REPORT_HEADERS.teachers,
    preview: formattedData.slice(0, 100),
    fullData: formattedData,
    total: formattedData.length,
    summary: calculateTeacherSummary(data || [])
  };
};

/**
 * Fetch students data
 */
export const fetchStudentsData = async (filters = {}, includeGrade = true) => {
  let query = supabase
    .from('students')
    .select('*, classes(grade)')
    .eq('is_active', true);

  if (filters.class_id) query = query.eq('class_id', filters.class_id);
  if (filters.academic_year) query = query.eq('academic_year', filters.academic_year);

  query = query.order('class_id').order('full_name');

  const { data, error } = await query;
  if (error) throw error;

  const formattedData = data?.map(row => formatStudentRow(row, includeGrade)) || [];
  
  return {
    headers: includeGrade ? REPORT_HEADERS.students : REPORT_HEADERS.studentsSimple,
    preview: formattedData.slice(0, 100),
    fullData: formattedData,
    total: formattedData.length,
    summary: calculateStudentSummary(data || [])
  };
};

/**
 * Fetch attendance recap data
 */
export const fetchAttendanceRecapData = async (filters = {}) => {
  const startDate = filters.start_date || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
  const endDate = filters.end_date || new Date().toISOString().split('T')[0];

  let query = supabase
    .from('attendances')
    .select('*, students!inner(nis, full_name, class_id)')
    .gte('date', startDate)
    .lte('date', endDate);

  const { data: rawAttendance, error } = await query;
  if (error) throw error;

  // Apply class filter after fetch (karena join issue)
  let filteredData = rawAttendance || [];
  if (filters.class_id) {
    filteredData = filteredData.filter(a => a.students?.class_id === filters.class_id);
  }

  // Aggregate by student
  const recapData = {};
  filteredData.forEach(record => {
    const key = record.student_id;
    if (!recapData[key]) {
      recapData[key] = {
        nis: record.students?.nis || '-',
        name: record.students?.full_name || '-',
        class_id: record.students?.class_id || '-',
        hadir: 0,
        sakit: 0,
        izin: 0,
        tidak_hadir: 0,
        total: 0
      };
    }
    
    recapData[key].total++;
    const status = record.status?.toLowerCase() || '';
    
    if (status === 'hadir') recapData[key].hadir++;
    else if (status === 'sakit') recapData[key].sakit++;
    else if (status === 'izin') recapData[key].izin++;
    else if (status === 'alpa' || status === 'tidak_hadir') recapData[key].tidak_hadir++;
  });

  const finalData = Object.values(recapData).map(r => ({
    ...r,
    persentase: r.total > 0 ? `${Math.round((r.hadir / r.total) * 100)}%` : '0%'
  })).sort((a, b) => b.hadir - a.hadir);

  return {
    headers: REPORT_HEADERS.attendanceRecap,
    preview: finalData.slice(0, 100),
    fullData: finalData,
    total: finalData.length,
    summary: calculateAttendanceSummary(finalData)
  };
};

/**
 * Fetch grades data
 */
export const fetchGradesData = async (filters = {}, teacherId = null) => {
  let query = supabase
    .from('grades')
    .select('*, students!inner(nis, full_name, class_id), users!inner(full_name)');

  if (teacherId) query = query.eq('teacher_id', teacherId);
  if (filters.class_id) query = query.eq('students.class_id', filters.class_id);
  if (filters.academic_year) query = query.eq('academic_year', filters.academic_year);
  if (filters.semester) query = query.eq('semester', filters.semester);
  if (filters.subject) query = query.eq('subject', filters.subject);

  query = query
    .order('academic_year', { ascending: false })
    .order('semester');

  const { data, error } = await query;
  if (error) throw error;

  const formattedData = data?.map(row => formatGradeRow(row)) || [];
  
  return {
    headers: REPORT_HEADERS.grades,
    preview: formattedData.slice(0, 100),
    fullData: formattedData,
    total: formattedData.length,
    summary: calculateGradeSummary(data || [])
  };
};

/**
 * Fetch attendance daily data
 */
export const fetchAttendanceDailyData = async (filters = {}) => {
  const startDate = filters.start_date || (() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split('T')[0];
  })();
  const endDate = filters.end_date || new Date().toISOString().split('T')[0];

  let query = supabase
    .from('attendances')
    .select('date, student_id, status, students!inner(nis, full_name, class_id)')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });

  // Apply class filter if provided
  if (filters.class_id) {
    query = query.eq('students.class_id', filters.class_id);
  }

  const { data, error } = await query;
  if (error) throw error;

  const formattedData = data?.map(formatAttendanceRow) || [];
  
  // Calculate summary
  const totalRecords = data?.length || 0;
  const hadirCount = data?.filter(d => d.status?.toLowerCase() === 'hadir').length || 0;
  const hadirPercent = totalRecords > 0 ? Math.round((hadirCount / totalRecords) * 100) : 0;
  
  const summary = [
    { label: 'Total Records', value: totalRecords },
    { label: 'Hadir', value: `${hadirPercent}%` },
    { label: 'Tidak Hadir', value: totalRecords - hadirCount }
  ];

  return {
    headers: REPORT_HEADERS.attendance,
    preview: formattedData.slice(0, 100),
    fullData: formattedData,
    total: formattedData.length,
    summary
  };
};

// ==================== SUMMARY CALCULATORS ====================

export const calculateStudentSummary = (data) => {
  const maleCount = data.filter(s => s.gender === 'L').length;
  const femaleCount = data.filter(s => s.gender === 'P').length;
  const classes = [...new Set(data.map(s => s.class_id))].filter(Boolean);
  
  return [
    { label: 'Total Siswa', value: data.length },
    { label: 'Laki-laki', value: maleCount },
    { label: 'Perempuan', value: femaleCount },
    { label: 'Jumlah Kelas', value: classes.length }
  ];
};

export const calculateTeacherSummary = (data) => {
  const activeCount = data.filter(t => t.is_active === true).length;
  const homeroomCount = data.filter(t => t.homeroom_class_id && t.homeroom_class_id !== '-').length;
  const bkCount = data.filter(t => t.role === 'guru_bk').length;
  
  return [
    { label: 'Total Guru', value: data.length },
    { label: 'Guru Aktif', value: activeCount },
    { label: 'Wali Kelas', value: homeroomCount },
    { label: 'Guru BK', value: bkCount }
  ];
};

export const calculateAttendanceSummary = (data) => {
  const totalHadir = data.reduce((sum, r) => sum + (r.hadir || 0), 0);
  const totalPresensi = data.reduce((sum, r) => sum + (r.total || 0), 0);
  const avgAttendance = totalPresensi > 0 
    ? Math.round((totalHadir / totalPresensi) * 100) 
    : 0;
  const lowAttendance = data.filter(s => {
    const pct = parseFloat(s.persentase);
    return pct && pct < 75;
  }).length;
  
  return [
    { label: 'Total Siswa', value: data.length },
    { label: 'Total Presensi', value: totalPresensi },
    { label: 'Rata-rata Kehadiran', value: `${avgAttendance}%` },
    { label: 'Siswa <75%', value: lowAttendance }
  ];
};

export const calculateGradeSummary = (data) => {
  const scores = data.map(d => parseFloat(d.score)).filter(s => !isNaN(s));
  const avg = scores.length > 0 
    ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)
    : 0;
  const highest = scores.length > 0 ? Math.max(...scores) : 0;
  const lowest = scores.length > 0 ? Math.min(...scores) : 0;
  const subjects = [...new Set(data.map(g => g.subject))].filter(Boolean);
  
  return [
    { label: 'Total Nilai', value: data.length },
    { label: 'Rata-rata', value: avg },
    { label: 'Tertinggi', value: highest },
    { label: 'Terendah', value: lowest },
    { label: 'Mata Pelajaran', value: subjects.length }
  ];
};

// ==================== UTILITY FUNCTIONS ====================

export const getDateRange = (filters) => {
  const startDate = filters.start_date || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
  const endDate = filters.end_date || new Date().toISOString().split('T')[0];
  return { startDate, endDate };
};

export const buildFilterDescription = (filters) => {
  const parts = [];
  if (filters.class_id) parts.push(`Kelas ${filters.class_id}`);
  if (filters.academic_year) parts.push(`TA ${filters.academic_year}`);
  if (filters.semester) parts.push(`Semester ${filters.semester}`);
  if (filters.subject) parts.push(`Mapel ${filters.subject}`);
  if (filters.start_date && filters.end_date) {
    parts.push(`Periode ${formatDate(filters.start_date)} - ${formatDate(filters.end_date)}`);
  }
  return parts.length > 0 ? parts.join(', ') : 'Semua Data';
};

export const validateReportData = (data, headers) => {
  if (!data || data.length === 0) {
    return { valid: false, message: 'Tidak ada data untuk di-export' };
  }
  
  if (!headers || headers.length === 0) {
    return { valid: false, message: 'Header tidak valid' };
  }
  
  return { valid: true, message: 'Data valid' };
};

// ==================== EXPORT ALL ====================

export default {
  // Constants
  TEACHER_ROLES,
  ATTENDANCE_STATUS_MAP,
  REPORT_HEADERS,
  
  // Formatters
  formatDate,
  formatDateTime,
  formatRole,
  formatGender,
  formatActiveStatus,
  formatAttendanceStatus,
  
  // Row Formatters
  formatTeacherRow,
  formatStudentRow,
  formatAttendanceRow,
  formatGradeRow,
  
  // Data Fetchers
  fetchTeachersData,
  fetchStudentsData,
  fetchAttendanceRecapData,
  fetchGradesData,
  fetchAttendanceDailyData,
  
  // Summary Calculators
  calculateStudentSummary,
  calculateTeacherSummary,
  calculateAttendanceSummary,
  calculateGradeSummary,
  
  // Utilities
  getDateRange,
  buildFilterDescription,
  validateReportData
};