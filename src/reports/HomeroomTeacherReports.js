import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { 
  FileText, GraduationCap, Calendar, BarChart3, Download, 
  Eye, TrendingUp, CheckCircle, Filter, X, AlertTriangle, 
  ChevronDown, FileSpreadsheet, BookOpen, Users
} from 'lucide-react';
import { exportToExcel } from './ReportExcel';
import ReportModal from './ReportModal';

// ✅ IMPORT HELPERS
import {
  fetchStudentsData,
  fetchAttendanceDailyData,
  fetchAttendanceRecapData,
  fetchGradesData,
  buildFilterDescription,
  REPORT_HEADERS
} from './ReportHelpers';

// ==================== COMPONENTS ====================

const StatCard = ({ icon: Icon, label, value, color = 'indigo', alert = false }) => (
  <div className={`bg-white rounded-lg shadow-sm border ${alert ? 'border-red-300' : 'border-slate-200'} p-4 hover:shadow-md transition-shadow`}>
    <div className="flex items-center gap-3">
      <div className={`w-12 h-12 bg-${color}-100 rounded-lg flex items-center justify-center`}>
        <Icon className={`w-6 h-6 text-${color}-600`} />
      </div>
      <div className="flex-1">
        <p className="text-sm text-slate-600">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
      </div>
      {alert && <AlertTriangle className="w-5 h-5 text-red-500" />}
    </div>
  </div>
);

const FilterPanel = ({ filters, onFilterChange, onReset, academicYears = [] }) => {
  const [isOpen, setIsOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    ['start_date', 'end_date', 'academic_year', 'semester'].forEach(key => {
      if (filters[key] && filters[key] !== '') count++;
    });
    return count;
  }, [filters]);
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-600" />
          <h3 className="font-semibold text-slate-800">Filter Laporan</h3>
          {activeFilterCount > 0 && (
            <span className="ml-2 bg-indigo-100 text-indigo-600 text-xs font-bold px-2 py-0.5 rounded-full">
              {activeFilterCount} Filter Aktif
            </span>
          )}
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-slate-600 hover:text-slate-800"
        >
          <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>
      
      {isOpen && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-3 border-t border-slate-200">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={filters.start_date || ''}
              onChange={(e) => onFilterChange('start_date', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={filters.end_date || ''}
              onChange={(e) => onFilterChange('end_date', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tahun Ajaran
            </label>
            <select
              value={filters.academic_year || ''}
              onChange={(e) => onFilterChange('academic_year', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Semua Tahun</option>
              {academicYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Semester
            </label>
            <select
              value={filters.semester || ''}
              onChange={(e) => onFilterChange('semester', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Semua Semester</option>
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={onReset}
              className="w-full px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <X className="w-4 h-4" />
              Reset Filter
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

const HomeroomTeacherReports = ({ user }) => {
  const [activeTab, setActiveTab] = useState('homeroom');
  const [loading, setLoading] = useState(false);
  const [downloadingReportId, setDownloadingReportId] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [stats, setStats] = useState({});
  const [teacherStats, setTeacherStats] = useState({});
  const [filters, setFilters] = useState({ class_id: user.homeroom_class_id });
  const [previewModal, setPreviewModal] = useState({ isOpen: false, data: null, type: null });
  const [alertStudents, setAlertStudents] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState([]);

  useEffect(() => {
    fetchAcademicYears();
    fetchStats();
    fetchTeacherAssignments();
  }, [user]);

  const fetchTeacherAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('teacher_assignments')
        .select('*, classes!inner(id, grade)')
        .eq('teacher_id', user.teacher_id);

      if (error) throw error;
      
      setTeacherAssignments(data || []);
      
      if (data && data.length > 0) {
        const classIds = data.map(a => a.class_id);
        const subjects = [...new Set(data.map(a => a.subject))];
        
        const { data: gradesData } = await supabase
          .from('grades')
          .select('id', { count: 'exact' })
          .eq('teacher_id', user.id)
          .in('class_id', classIds);

        const { data: attendanceData } = await supabase
          .from('attendances')
          .select('id', { count: 'exact' })
          .eq('teacher_id', user.id)
          .in('class_id', classIds);

        setTeacherStats({
          totalClasses: classIds.length,
          totalSubjects: subjects.length,
          totalGrades: gradesData?.length || 0,
          totalAttendances: attendanceData?.length || 0
        });
      }
    } catch (err) {
      console.error('Error fetching teacher assignments:', err);
    }
  };

  const fetchAcademicYears = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('academic_year')
        .eq('class_id', user.homeroom_class_id)
        .order('academic_year', { ascending: false });

      if (error) throw error;

      const uniqueYears = [...new Set(data.map(item => item.academic_year))].filter(Boolean);
      setAcademicYears(uniqueYears);
    } catch (err) {
      console.error('Error fetching academic years:', err);
      setAcademicYears([]);
    }
  };

  const fetchStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const [studentsResult, attendanceResult] = await Promise.all([
        supabase
          .from('students')
          .select('id, nis, full_name', { count: 'exact' })
          .eq('class_id', user.homeroom_class_id)
          .eq('is_active', true),
        supabase
          .from('attendances')
          .select('student_id, status')
          .eq('date', today)
      ]);

      const totalStudents = studentsResult.count || 0;
      const studentIds = studentsResult.data?.map(s => s.id) || [];
      const presentToday = attendanceResult.data?.filter(a => 
        studentIds.includes(a.student_id) && a.status?.toLowerCase() === 'hadir'
      ).length || 0;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: attendanceData } = await supabase
        .from('attendances')
        .select('student_id, status, students!inner(nis, full_name, class_id)')
        .eq('students.class_id', user.homeroom_class_id)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

      const studentAttendance = {};
      attendanceData?.forEach(record => {
        if (!studentAttendance[record.student_id]) {
          studentAttendance[record.student_id] = {
            name: record.students.full_name,
            nis: record.students.nis,
            total: 0,
            present: 0
          };
        }
        studentAttendance[record.student_id].total++;
        const status = record.status?.toLowerCase() || '';
        if (status === 'hadir') {
          studentAttendance[record.student_id].present++;
        }
      });

      const alerts = Object.entries(studentAttendance)
        .filter(([_, data]) => {
          if (data.total < 10) return false;
          const rate = (data.present / data.total) * 100;
          return rate < 75;
        })
        .map(([id, data]) => ({
          ...data,
          rate: Math.round((data.present / data.total) * 100)
        }));

      setAlertStudents(alerts);

      setStats({
        totalStudents,
        presentToday,
        attendanceRate: totalStudents > 0 ? Math.round((presentToday / totalStudents) * 100) : 0,
        alerts: alerts.length,
        className: user.homeroom_class_id
      });
      
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Gagal memuat statistik');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    if (activeTab === 'homeroom') {
      setFilters({ class_id: user.homeroom_class_id });
    } else {
      setFilters({});
    }
  };

  // ✅ REFACTORED: Fetch Report Data using helpers
  const fetchReportData = async (reportType) => {
    try {
      let reportTitle = '';
      let result = null;

      // 🔥 TAB HOMEROOM REPORTS
      if (activeTab === 'homeroom') {
        const homeroomFilters = { ...filters, class_id: user.homeroom_class_id };

        switch (reportType) {
          case 'students':
            reportTitle = 'DATA SISWA WALI KELAS';
            result = await fetchStudentsData(homeroomFilters, false); // No grade column
            break;

          case 'attendance':
            reportTitle = 'PRESENSI HARIAN WALI KELAS';
            result = await fetchAttendanceDailyData(homeroomFilters);
            break;

          case 'attendance-recap':
            reportTitle = 'REKAPITULASI KEHADIRAN WALI KELAS';
            result = await fetchAttendanceRecapData(homeroomFilters);
            break;

          case 'grades':
            reportTitle = 'DATA NILAI AKADEMIK WALI KELAS';
            result = await fetchGradesData(homeroomFilters);
            break;

          default:
            throw new Error('Tipe laporan tidak valid');
        }
      } 
      // 🔥 TAB TEACHER MAPEL REPORTS
      else if (activeTab === 'teacher') {
        const classIds = teacherAssignments.map(a => a.class_id);
        
        switch (reportType) {
          case 'teacher-grades':
            reportTitle = 'NILAI MATA PELAJARAN YANG DIAMPU';
            result = await fetchGradesData(filters, user.id);
            // Override headers to exclude teacher column (it's the user itself)
            result.headers = REPORT_HEADERS.gradesSimple;
            break;

          case 'teacher-attendance':
            reportTitle = 'PRESENSI MATA PELAJARAN';
            
            const startDate = filters.start_date || (() => {
              const date = new Date();
              date.setDate(1);
              return date.toISOString().split('T')[0];
            })();
            const endDate = filters.end_date || new Date().toISOString().split('T')[0];

            let query = supabase
              .from('attendances')
              .select('date, subject, status, class_id, students!inner(nis, full_name)')
              .eq('teacher_id', user.id)
              .in('class_id', classIds)
              .gte('date', startDate)
              .lte('date', endDate)
              .order('date', { ascending: false });

            const { data: teacherAtt, error: taError } = await query;
            if (taError) throw taError;

            const formattedTA = teacherAtt.map(row => ({
              date: new Date(row.date).toLocaleDateString('id-ID'),
              nis: row.students?.nis || '-',
              full_name: row.students?.full_name || '-',
              class_id: row.class_id || '-',
              subject: row.subject || '-',
              status: {
                'hadir': 'Hadir',
                'tidak_hadir': 'Tidak Hadir',
                'alpa': 'Alpa',
                'sakit': 'Sakit',
                'izin': 'Izin'
              }[row.status?.toLowerCase()] || row.status
            }));

            const taTotal = teacherAtt.length;
            const taHadir = teacherAtt.filter(d => d.status?.toLowerCase() === 'hadir').length;
            const taPercent = taTotal > 0 ? Math.round((taHadir/taTotal)*100) : 0;
            
            result = {
              headers: ['Tanggal', 'NIS', 'Nama Siswa', 'Kelas', 'Mata Pelajaran', 'Status'],
              preview: formattedTA,
              total: formattedTA.length,
              fullData: formattedTA,
              summary: [
                { label: 'Total Records', value: taTotal },
                { label: 'Hadir', value: `${taPercent}%` },
                { label: 'Tidak Hadir', value: teacherAtt.filter(d => d.status?.toLowerCase() !== 'hadir').length }
              ]
            };
            break;

          case 'teacher-recap':
            reportTitle = 'REKAPITULASI KELAS YANG DIAMPU';
            
            const recapByClass = {};
            
            for (const assignment of teacherAssignments) {
              const { data: classGrades } = await supabase
                .from('grades')
                .select('score')
                .eq('teacher_id', user.id)
                .eq('class_id', assignment.class_id)
                .eq('subject', assignment.subject);

              const { data: classAtt } = await supabase
                .from('attendances')
                .select('status')
                .eq('teacher_id', user.id)
                .eq('class_id', assignment.class_id)
                .eq('subject', assignment.subject);

              const gradeScores = (classGrades || []).map(g => g.score).filter(s => s != null);
              const avgGrade = gradeScores.length > 0 ? Math.round(gradeScores.reduce((a,b) => a+b, 0) / gradeScores.length) : 0;
              
              const totalAtt = (classAtt || []).length;
              const hadirAtt = (classAtt || []).filter(a => a.status?.toLowerCase() === 'hadir').length;
              const attRate = totalAtt > 0 ? Math.round((hadirAtt/totalAtt)*100) : 0;

              recapByClass[assignment.class_id] = {
                class_id: assignment.class_id,
                subject: assignment.subject,
                academic_year: assignment.academic_year,
                semester: assignment.semester,
                total_grades: gradeScores.length,
                avg_grade: avgGrade,
                total_attendance: totalAtt,
                attendance_rate: `${attRate}%`
              };
            }

            const recapArray = Object.values(recapByClass);
            
            result = {
              headers: ['Kelas', 'Mata Pelajaran', 'Tahun Ajaran', 'Semester', 'Total Nilai', 'Rata-rata Nilai', 'Total Presensi', 'Tingkat Kehadiran'],
              preview: recapArray,
              total: recapArray.length,
              fullData: recapArray,
              summary: [
                { label: 'Total Kelas', value: recapArray.length },
                { label: 'Total Mata Pelajaran', value: [...new Set(recapArray.map(r => r.subject))].length }
              ]
            };
            break;

          default:
            throw new Error('Tipe laporan tidak valid');
        }
      }

      return {
        ...result,
        reportTitle
      };

    } catch (err) {
      console.error('Error in fetchReportData:', err);
      throw err;
    }
  };

  const previewReport = async (reportType) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchReportData(reportType);
      setPreviewModal({ isOpen: true, data, type: reportType });
      setSuccess('✅ Preview berhasil dimuat');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(`Gagal preview laporan: ${err.message}`);
      console.error('Preview error:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async (reportType, format) => {
    setDownloadingReportId(reportType);
    setError(null);
    
    try {
      let data;
      
      if (previewModal.isOpen && previewModal.type === reportType && previewModal.data?.fullData) {
        data = previewModal.data;
      } else {
        data = await fetchReportData(reportType);
      }
      
      const filterDescription = buildFilterDescription(filters);

      const metadata = {
        title: data.reportTitle || 'LAPORAN',
        academicYear: filters.academic_year,
        semester: filters.semester ? `Semester ${filters.semester}` : null,
        filters: filterDescription,
        summary: data.summary
      };

      await exportToExcel(data.fullData, data.headers, metadata, {
        role: activeTab === 'homeroom' ? 'homeroom' : 'teacher',
        reportType: reportType
      });
      
      setSuccess('✅ Laporan berhasil diexport!');
      setTimeout(() => setSuccess(null), 3000);
      setPreviewModal({ isOpen: false, data: null, type: null });
    } catch (err) {
      setError(`Gagal export laporan: ${err.message}`);
      console.error('Download error:', err);
    } finally {
      setDownloadingReportId(null);
    }
  };

  // Report cards config
  const homeroomReports = [
    {
      id: 'students',
      icon: GraduationCap,
      title: `Data Siswa`,
      description: 'Export data siswa kelas Anda',
      stats: `${stats.totalStudents || 0} siswa`,
      color: 'bg-green-50 border-green-200',
      iconColor: 'text-green-600',
    },
    {
      id: 'attendance',
      icon: Calendar,
      title: 'Presensi Harian',
      description: 'Data kehadiran per hari',
      stats: `Kelas ${user.homeroom_class_id}`,
      color: 'bg-yellow-50 border-yellow-200',
      iconColor: 'text-yellow-600',
    },
    {
      id: 'attendance-recap',
      icon: CheckCircle,
      title: 'Rekap Kehadiran',
      description: 'Ringkasan total kehadiran',
      stats: 'Per siswa',
      color: 'bg-orange-50 border-orange-200',
      iconColor: 'text-orange-600',
    },
    {
      id: 'grades',
      icon: BarChart3,
      title: 'Nilai Akademik',
      description: 'Data nilai semua mapel',
      stats: `Kelas ${user.homeroom_class_id}`,
      color: 'bg-purple-50 border-purple-200',
      iconColor: 'text-purple-600',
    },
  ];

  const teacherReports = [
    {
      id: 'teacher-grades',
      icon: BarChart3,
      title: 'Nilai Mata Pelajaran',
      description: 'Data nilai siswa di semua kelas yang Anda ajar',
      stats: `${teacherStats.totalGrades || 0} nilai tercatat`,
      color: 'bg-blue-50 border-blue-200',
      iconColor: 'text-blue-600',
    },
    {
      id: 'teacher-attendance',
      icon: Calendar,
      title: 'Presensi Mata Pelajaran',
      description: 'Data kehadiran siswa di mata pelajaran Anda',
      stats: `${teacherStats.totalAttendances || 0} presensi tercatat`,
      color: 'bg-indigo-50 border-indigo-200',
      iconColor: 'text-indigo-600',
    },
    {
      id: 'teacher-recap',
      icon: BookOpen,
      title: 'Rekapitulasi Per Kelas',
      description: 'Ringkasan performa per kelas yang Anda ajar',
      stats: `${teacherStats.totalClasses || 0} kelas diampu`,
      color: 'bg-teal-50 border-teal-200',
      iconColor: 'text-teal-600',
    },
  ];

  const currentReports = activeTab === 'homeroom' ? homeroomReports : teacherReports;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-800">
                Laporan - Wali Kelas & Guru Mapel
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {user.full_name} - Wali Kelas {user.homeroom_class_id}
              </p>
            </div>
          </div>
          <p className="text-slate-600">Kelola laporan sebagai wali kelas dan guru mata pelajaran</p>
        </div>

        {/* Success/Error Alerts */}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              {success}
            </span>
            <button onClick={() => setSuccess(null)} className="text-green-800 hover:text-green-900 font-bold">
              ×
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                {error}
              </span>
              <button onClick={() => setError(null)} className="text-red-800 hover:text-red-900 font-bold">
                ×
              </button>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => {
                setActiveTab('homeroom');
                resetFilters();
              }}
              className={`flex-1 px-6 py-4 font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'homeroom'
                  ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Users className="w-5 h-5" />
              Laporan Wali Kelas
              <span className="ml-2 bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full text-xs">
                Kelas {user.homeroom_class_id}
              </span>
            </button>
            <button
              onClick={() => {
                setActiveTab('teacher');
                resetFilters();
              }}
              className={`flex-1 px-6 py-4 font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'teacher'
                  ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <BookOpen className="w-5 h-5" />
              Laporan Guru Mapel
              <span className="ml-2 bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full text-xs">
                {teacherStats.totalClasses || 0} Kelas
              </span>
            </button>
          </div>
        </div>

        {/* Stats Dashboard */}
        {activeTab === 'homeroom' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard 
              icon={GraduationCap} 
              label="Siswa di Kelas" 
              value={stats.totalStudents || 0} 
              color="green" 
            />
            <StatCard 
              icon={CheckCircle} 
              label="Hadir Hari Ini" 
              value={stats.presentToday || 0} 
              color="blue" 
            />
            <StatCard 
              icon={TrendingUp} 
              label="Tingkat Kehadiran" 
              value={`${stats.attendanceRate || 0}%`} 
              color="purple" 
            />
            <StatCard 
              icon={AlertTriangle} 
              label="Perlu Perhatian" 
              value={stats.alerts || 0} 
              color="red" 
              alert={stats.alerts > 0} 
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard 
              icon={BookOpen} 
              label="Kelas Diampu" 
              value={teacherStats.totalClasses || 0} 
              color="blue" 
            />
            <StatCard 
              icon={FileText} 
              label="Mata Pelajaran" 
              value={teacherStats.totalSubjects || 0} 
              color="indigo" 
            />
            <StatCard 
              icon={BarChart3} 
              label="Total Nilai" 
              value={teacherStats.totalGrades || 0} 
              color="purple" 
            />
            <StatCard 
              icon={Calendar} 
              label="Total Presensi" 
              value={teacherStats.totalAttendances || 0} 
              color="teal" 
            />
          </div>
        )}

        {/* Filter Panel */}
        <FilterPanel
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={resetFilters}
          academicYears={academicYears}
        />

        {/* Reports Grid */}
        <div className={`grid grid-cols-1 ${activeTab === 'homeroom' ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'} gap-4 mb-8`}>
          {currentReports.map((report) => {
            const Icon = report.icon;
            const isDownloading = downloadingReportId === report.id;

            return (
              <div
                key={report.id}
                className={`bg-white rounded-lg shadow-sm border-2 ${report.color} p-4 hover:shadow-md transition-all duration-200`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-11 h-11 rounded-xl ${report.color} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${report.iconColor}`} />
                  </div>
                </div>
                
                <h3 className="text-sm font-semibold text-slate-800 mb-1.5 leading-tight">
                  {report.title}
                </h3>
                
                <p className="text-xs text-slate-600 mb-2 leading-tight">
                  {report.description}
                </p>
                
                <p className="text-xs text-slate-500 mb-3 font-medium">
                  {report.stats}
                </p>
                
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => previewReport(report.id)}
                    disabled={loading || downloadingReportId}
                    className="w-full bg-slate-100 hover:bg-slate-200 disabled:bg-gray-300 text-slate-700 px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {loading ? 'Memuat...' : 'Preview'}
                  </button>
                  
                  <button
                    onClick={() => downloadReport(report.id, 'xlsx')}
                    disabled={loading || isDownloading || (downloadingReportId && !isDownloading)}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    {isDownloading ? 'Exporting...' : 'Export Excel'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Alert Students Panel - Only show in homeroom tab */}
        {activeTab === 'homeroom' && alertStudents.length > 0 && (
          <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6 mb-8">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-orange-600 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900 mb-2">
                  Siswa Perlu Perhatian Khusus
                </h3>
                <p className="text-sm text-orange-800 mb-3">
                  Siswa dengan tingkat kehadiran di bawah 75% dalam 30 hari terakhir
                </p>
                <div className="space-y-2">
                  {alertStudents.map((student, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-orange-200">
                      <p className="text-sm font-medium text-slate-800">
                        {student.name} ({student.nis})
                      </p>
                      <p className="text-xs text-slate-600">
                        Kehadiran: {student.rate}% ({student.present} dari {student.total} hari)
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Teacher Assignments Info - Only show in teacher tab */}
        {activeTab === 'teacher' && teacherAssignments.length > 0 && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-8">
            <div className="flex items-start gap-3">
              <BookOpen className="w-6 h-6 text-blue-600 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">
                  Kelas & Mata Pelajaran yang Diampu
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                  {teacherAssignments.map((assignment, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-blue-200">
                      <p className="text-sm font-medium text-slate-800">
                        Kelas {assignment.class_id}
                      </p>
                      <p className="text-xs text-slate-600">
                        {assignment.subject}
                      </p>
                      <p className="text-xs text-slate-500">
                        {assignment.academic_year} • Semester {assignment.semester}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            📋 Informasi Laporan
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium text-slate-700 mb-2 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                Format File
              </h4>
              <p className="text-sm text-slate-600">
                Laporan tersedia dalam format Excel dengan layout yang rapi dan profesional.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Cakupan Data
              </h4>
              <p className="text-sm text-slate-600">
                {activeTab === 'homeroom' 
                  ? `Laporan wali kelas mencakup data kelas ${user.homeroom_class_id}.`
                  : `Laporan guru mapel mencakup semua kelas yang Anda ajar.`
                }
              </p>
            </div>
            <div>
              <h4 className="font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Preview Tersedia
              </h4>
              <p className="text-sm text-slate-600">
                Klik "Preview" untuk melihat semua data sebelum export.
              </p>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex gap-3">
            <div className="text-indigo-600 text-xl">💡</div>
            <div>
              <h4 className="font-medium text-indigo-900 mb-1">Tips:</h4>
              <p className="text-sm text-indigo-700">
                {activeTab === 'homeroom' 
                  ? 'Export laporan presensi dan nilai secara berkala untuk monitoring performa siswa. Gunakan data ini untuk parent meeting dan evaluasi kelas.'
                  : 'Gunakan laporan guru mapel untuk analisis performa siswa per mata pelajaran. Bandingkan hasil antar kelas untuk evaluasi metode pengajaran.'
                }
              </p>
            </div>
          </div>
        </div>

        {/* ✅ REFACTORED NOTE */}
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-green-800 mb-2">
            ✅ Refactored with ReportHelpers
          </h4>
          <ul className="text-xs text-green-700 space-y-1 list-disc list-inside">
            <li>Menggunakan centralized fetch functions dari ReportHelpers.js</li>
            <li>Konsisten dengan format data lowercase (hadir, sakit, izin, alpa)</li>
            <li>Menghapus ~300 lines duplicated code</li>
            <li>Semua formatters (date, status, gender) dari helpers</li>
            <li>Summary calculations otomatis dari helpers</li>
          </ul>
        </div>
      </div>

      {/* Preview Modal */}
      <ReportModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal({ isOpen: false, data: null, type: null })}
        reportData={previewModal.data || {}}
        reportType={previewModal.type}
        role={activeTab === 'homeroom' ? 'homeroom' : 'teacher'}
        onDownload={downloadReport}
        loading={downloadingReportId !== null}
      />
    </div>
  );
};

export default HomeroomTeacherReports;