import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FileText, Users, GraduationCap, Calendar, BarChart3, Download, Eye } from 'lucide-react';

const Reports = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalTeachers: 0,
    totalStudents: 0,
    totalClasses: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [teachersResult, studentsResult, classesResult] = await Promise.all([
        supabase.from('users').select('id').in('role', ['teacher', 'homeroom_teacher']).eq('is_active', true),
        supabase.from('students').select('id').eq('is_active', true),
        supabase.from('classes').select('id')
      ]);

      setStats({
        totalTeachers: teachersResult.data?.length || 0,
        totalStudents: studentsResult.data?.length || 0,
        totalClasses: classesResult.data?.length || 0
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const generateReport = async (reportType) => {
    setLoading(true);
    setError(null);
    
    try {
      switch (reportType) {
        case 'teachers':
          await generateTeachersReport();
          break;
        case 'students':
          await generateStudentsReport();
          break;
        case 'attendance':
          await generateAttendanceReport();
          break;
        case 'grades':
          await generateGradesReport();
          break;
        default:
          throw new Error('Invalid report type');
      }
    } catch (err) {
      setError(`Gagal generate laporan: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateTeachersReport = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('username, full_name, role, teacher_id, is_active, created_at')
      .in('role', ['teacher', 'homeroom_teacher', 'admin'])
      .order('full_name');

    if (error) throw error;

    // Convert to CSV and download
    const csv = convertToCSV(data, [
      'Teacher ID', 'Username', 'Nama Lengkap', 'Role', 'Status', 'Tanggal Bergabung'
    ], [
      'teacher_id', 'username', 'full_name', 'role', 
      (row) => row.is_active ? 'Aktif' : 'Tidak Aktif',
      (row) => new Date(row.created_at).toLocaleDateString('id-ID')
    ]);
    
    downloadCSV(csv, 'laporan-data-guru.csv');
  };

  const generateStudentsReport = async () => {
    const { data, error } = await supabase
      .from('students')
      .select(`
        id, nis, full_name, gender, class_id, academic_year, is_active,
        classes!inner (id, grade)
      `)
      .eq('is_active', true)
      .order('class_id, full_name');

    if (error) throw error;

    const csv = convertToCSV(data, [
      'NIS', 'Nama Lengkap', 'Jenis Kelamin', 'Kelas', 'Tingkat', 'Tahun Ajaran'
    ], [
      'nis', 'full_name', 
      (row) => row.gender === 'L' ? 'Laki-laki' : 'Perempuan',
      'class_id',
      (row) => row.classes.grade,
      'academic_year'
    ]);
    
    downloadCSV(csv, 'laporan-data-siswa.csv');
  };

  const generateAttendanceReport = async () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const { data, error } = await supabase
      .from('attendances_view')
      .select('*')
      .gte('date', firstDayOfMonth.toISOString().split('T')[0])
      .lte('date', lastDayOfMonth.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) throw error;

    const csv = convertToCSV(data, [
      'Tanggal', 'NIS', 'Nama Siswa', 'Kelas', 'Status Kehadiran'
    ], [
      (row) => new Date(row.date).toLocaleDateString('id-ID'),
      'student_nis', 'student_name', 'class_id',
      (row) => {
        switch(row.status) {
          case 'hadir': return 'Hadir';
          case 'tidak_hadir': return 'Tidak Hadir';
          case 'sakit': return 'Sakit';
          case 'izin': return 'Izin';
          default: return row.status;
        }
      }
    ]);
    
    downloadCSV(csv, `laporan-presensi-${today.getMonth() + 1}-${today.getFullYear()}.csv`);
  };

  const generateGradesReport = async () => {
    const { data, error } = await supabase
      .from('grades')
      .select(`
        score, assignment_type, semester, academic_year, subject,
        students!inner (nis, full_name, class_id),
        users!inner (full_name)
      `)
      .order('academic_year', { ascending: false });

    if (error) throw error;

    const csv = convertToCSV(data, [
      'Tahun Ajaran', 'Semester', 'NIS', 'Nama Siswa', 'Kelas', 'Mata Pelajaran', 
      'Jenis Penilaian', 'Nilai', 'Guru'
    ], [
      'academic_year', 'semester', 
      (row) => row.students.nis,
      (row) => row.students.full_name,
      (row) => row.students.class_id,
      'subject', 'assignment_type', 'score',
      (row) => row.users.full_name
    ]);
    
    downloadCSV(csv, 'laporan-nilai-akademik.csv');
  };

  const convertToCSV = (data, headers, fields) => {
    const csvHeaders = headers.join(',');
    const csvRows = data.map(row => {
      return fields.map(field => {
        if (typeof field === 'function') {
          return `"${field(row) || ''}"`;
        }
        return `"${row[field] || ''}"`;
      }).join(',');
    });
    
    return [csvHeaders, ...csvRows].join('\n');
  };

  const downloadCSV = (csv, filename) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reportCards = [
    {
      id: 'teachers',
      icon: Users,
      title: 'Laporan Data Guru',
      description: 'Export data lengkap semua guru',
      stats: `${stats.totalTeachers} guru terdaftar`,
      color: 'bg-blue-50 border-blue-200',
      iconColor: 'text-blue-600'
    },
    {
      id: 'students',
      icon: GraduationCap,
      title: 'Laporan Data Siswa',
      description: 'Export data lengkap semua siswa aktif',
      stats: `${stats.totalStudents} siswa aktif`,
      color: 'bg-green-50 border-green-200',
      iconColor: 'text-green-600'
    },
    {
      id: 'attendance',
      icon: Calendar,
      title: 'Laporan Presensi',
      description: 'Export rekap kehadiran siswa bulan ini',
      stats: 'Data presensi terkini',
      color: 'bg-yellow-50 border-yellow-200',
      iconColor: 'text-yellow-600'
    },
    {
      id: 'grades',
      icon: BarChart3,
      title: 'Laporan Akademik',
      description: 'Export data nilai semua mata pelajaran',
      stats: 'Semua data nilai',
      color: 'bg-purple-50 border-purple-200',
      iconColor: 'text-purple-600'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-slate-800">Laporan</h1>
          </div>
          <p className="text-slate-600">Generate dan download berbagai jenis laporan sekolah</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            <div className="flex justify-between items-center">
              <span>{error}</span>
              <button 
                onClick={() => setError(null)}
                className="text-red-800 hover:text-red-900 font-bold"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {reportCards.map((card) => {
            const Icon = card.icon;
            
            return (
              <div
                key={card.id}
                className={`bg-white rounded-lg shadow-sm border-2 ${card.color} p-6 hover:shadow-md transition-shadow`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-lg ${card.color} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${card.iconColor}`} />
                  </div>
                </div>
                
                <h3 className="text-lg font-semibold text-slate-800 mb-2">
                  {card.title}
                </h3>
                
                <p className="text-sm text-slate-600 mb-3">
                  {card.description}
                </p>
                
                <p className="text-xs text-slate-500 mb-4">
                  {card.stats}
                </p>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => generateReport(card.id)}
                    disabled={loading}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    {loading ? 'Loading...' : 'Download'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">
            Informasi Laporan
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-slate-700 mb-2">Format File:</h4>
              <p className="text-sm text-slate-600">Semua laporan akan di-download dalam format CSV yang bisa dibuka di Excel atau Google Sheets.</p>
            </div>
            <div>
              <h4 className="font-medium text-slate-700 mb-2">Data Terkini:</h4>
              <p className="text-sm text-slate-600">Laporan menggunakan data real-time dari database sekolah.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;