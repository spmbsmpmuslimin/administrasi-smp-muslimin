import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { FileText, Users, GraduationCap, Calendar, BarChart3, Download, Eye, TrendingUp, BookOpen, CheckCircle, Building, DollarSign, Filter, X, AlertTriangle, ChevronDown, FileSpreadsheet, FileTextIcon } from 'lucide-react';

// --- EKSPORT UTILITY ---
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import 'jspdf-autotable'; // Wajib diimport agar autotable bisa digunakan

// Permission utilities
const getRolePermissions = (role) => {
  const permissions = {
    admin: {
      reports: ['teachers', 'students', 'attendance', 'grades', 'finance', 'analytics'],
      canExportAll: true,
      canViewFinance: true,
      canManageUsers: true,
      canViewAllClasses: true,
      dashboardTitle: 'Laporan - Admin Panel',
      description: 'Generate dan download berbagai jenis laporan sekolah'
    },
    homeroom_teacher: {
      reports: ['students', 'attendance', 'grades', 'class-analytics'],
      canExportAll: false,
      canViewFinance: false,
      canManageUsers: false,
      canViewAllClasses: false,
      scope: 'own_class',
      dashboardTitle: 'Laporan - Wali Kelas',
      description: 'Kelola laporan untuk kelas Anda'
    },
    teacher: {
      reports: ['grades', 'my-schedule'],
      canExportAll: false,
      canViewFinance: false,
      canManageUsers: false,
      canViewAllClasses: false,
      scope: 'own_subject',
      dashboardTitle: 'Laporan - Guru Mata Pelajaran',
      description: 'Kelola laporan mata pelajaran Anda'
    }
  };
  
  return permissions[role] || permissions.teacher;
};

const canAccessReport = (userRole, reportType) => {
  const permissions = getRolePermissions(userRole);
  return permissions.reports.includes(reportType);
};

// Stats Card Component
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
      {alert && (
        <AlertTriangle className="w-5 h-5 text-red-500" />
      )}
    </div>
  </div>
);

// Filter Component
const FilterPanel = ({ role, filters, onFilterChange, onReset, classOptions = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Perbaikan: Hitung filter non-otomatis yang aktif
  const activeFilterCount = useMemo(() => {
    let count = 0;
    const filterKeys = ['start_date', 'end_date', 'academic_year', 'semester'];
    if (role === 'admin') filterKeys.push('class_id'); // Admin bisa memfilter class_id secara manual

    filterKeys.forEach(key => {
      // Pastikan nilai filter ada dan bukan string kosong
      if (filters[key] && filters[key] !== '') {
        count++;
      }
    });
    return count;
  }, [filters, role]);
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-600" />
          <h3 className="font-semibold text-slate-800">Filter Laporan</h3>
          {/* Tampilkan badge filter aktif */}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-200">
          {/* Class Filter - Perbaikan: Hanya tampilkan untuk admin */}
          {role === 'admin' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Kelas
              </label>
              <select
                value={filters.class_id || ''}
                onChange={(e) => onFilterChange('class_id', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Semua Kelas</option>
                {classOptions.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
          )}
          
          {/* Hapus filter kelas disabled untuk homeroom_teacher */}
          
          {/* Date Range */}
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
          
          {/* Academic Year */}
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
              <option value="2024/2025">2024/2025</option>
              <option value="2023/2024">2023/2024</option>
              <option value="2022/2023">2022/2023</option>
            </select>
          </div>
          
          {/* Semester */}
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
          
          {/* Reset Button */}
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

// Preview Modal Component
const PreviewModal = ({ isOpen, onClose, reportData, reportType, onDownload, loading }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Preview Laporan</h3>
              <p className="text-sm text-slate-600 mt-1">
                Menampilkan {reportData.preview?.length || 0} dari {reportData.total || 0} data
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        {/* Summary Stats */}
        {reportData.summary && reportData.summary.length > 0 && (
          <div className="p-6 bg-slate-50 border-b border-slate-200">
            <h4 className="font-semibold text-slate-800 mb-3">📈 Summary:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {reportData.summary.map((stat, idx) => (
                <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-600">{stat.label}</p>
                  <p className="text-lg font-bold text-slate-800">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Data Table */}
        <div className="p-6 overflow-auto max-h-96">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-slate-600">Loading data...</p>
              </div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-100 sticky top-0">
                <tr>
                  {reportData.headers?.map((header, idx) => (
                    <th key={idx} className="px-4 py-2 text-left font-semibold text-slate-700 border-b border-slate-200 whitespace-nowrap">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportData.preview?.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    {/* Mengambil nilai dari objek row */}
                    {Object.values(row).map((cell, cellIdx) => (
                      <td key={cellIdx} className="px-4 py-2 text-slate-700 whitespace-nowrap">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Actions */}
        <div className="p-6 border-t border-slate-200 bg-slate-50 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
          >
            Tutup
          </button>
          {/* Perbaikan: Ganti CSV ke XLSX (Excel) */}
          <button
            onClick={() => onDownload('xlsx')}
            disabled={loading}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Download XLSX
          </button>
          {/* Perbaikan: PDF */}
          <button
            onClick={() => onDownload('pdf')}
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <FileTextIcon className="w-4 h-4" />
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};

// --- UTILITY EKSPOR BARU (ExcelJS & jsPDF) ---

const exportToXLSX = async (data, headers, filename) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Laporan Data');

  // 1. Tambahkan Headers
  const headerRow = worksheet.addRow(headers);
  headerRow.eachCell(cell => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E7FF' } // Light Blue/Indigo
    };
    cell.font = { bold: true, color: { argb: 'FF333333' } };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // 2. Tambahkan Data
  data.forEach(row => {
    // Pastikan data yang dimasukkan sesuai urutan headers
    const rowValues = Object.values(row); 
    worksheet.addRow(rowValues);
  });
  
  // 3. Auto Fit Columns
  worksheet.columns.forEach(column => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, cell => {
      const columnLength = cell.value ? cell.value.toString().length : 10;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    // Set column width, min 10, max 30
    column.width = Math.min(30, Math.max(10, maxLength + 2)); 
  });


  // 4. Unduh File
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

const exportToPDF = (data, headers, summary, filename, title) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  
  // 1. Header Judul
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`, 14, 28);
  
  let finalY = 32;

  // 2. Summary (jika ada)
  if (summary && summary.length > 0) {
    const summaryData = summary.map(s => [s.label, s.value]);
    doc.autoTable({
      startY: 35,
      head: [['Ringkasan', 'Nilai']],
      body: summaryData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [63, 81, 181] } // Indigo color
    });
    finalY = doc.autoTable.previous.finalY;
  }
  
  // 3. Data Table
  const bodyData = data.map(row => Object.values(row));
  
  doc.autoTable({
    startY: finalY + 5,
    head: [headers],
    body: bodyData,
    theme: 'striped',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [44, 62, 80] } // Dark blue
  });
  
  // 4. Unduh File
  doc.save(filename);
};

// Main Reports Component
const Reports = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false); // State terpisah untuk download
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({});
  const [filters, setFilters] = useState({});
  const [previewModal, setPreviewModal] = useState({ isOpen: false, data: null, type: null });
  const [success, setSuccess] = useState(null);
  const [alertStudents, setAlertStudents] = useState([]);
  const [classOptions, setClassOptions] = useState([]);

  // Get role permissions
  const permissions = useMemo(() => getRolePermissions(user.role), [user.role]);
  
  // Ambil judul untuk PDF
  const reportTitle = (reportType) => {
    const card = reportCards.find(c => c.id === reportType);
    return card ? `Laporan ${card.title}` : `Laporan Data Sekolah`;
  };

  // Initialize filters and fetch data
  useEffect(() => {
    const defaultFilters = {};
    
    // Perbaikan: Set class_id otomatis untuk homeroom_teacher
    if (user.role === 'homeroom_teacher' && user.homeroom_class_id) {
      defaultFilters.class_id = user.homeroom_class_id;
    } else if (user.role === 'teacher') {
      defaultFilters.teacher_id = user.id;
    }
    
    setFilters(defaultFilters);
    fetchStats();
    if (user.role === 'admin') {
      fetchClassOptions(); // Hanya admin yang perlu daftar semua kelas
    }
  }, [user]);

  // Fetch class options for filter
  const fetchClassOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id')
        .order('id');
      
      if (error) throw error;
      setClassOptions(data.map(c => c.id));
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  // Fetch statistics based on role (logic remains the same, it's already good)
  const fetchStats = async () => {
    // ... (fetchStats logic remains the same) ...
    try {
      if (user.role === 'admin') {
        const [teachersResult, studentsResult, classesResult] = await Promise.all([
          supabase.from('users').select('id', { count: 'exact' }).in('role', ['teacher', 'homeroom_teacher']).eq('is_active', true),
          supabase.from('students').select('id', { count: 'exact' }).eq('is_active', true),
          supabase.from('classes').select('id', { count: 'exact' })
        ]);

        setStats({
          totalTeachers: teachersResult.count || 0,
          totalStudents: studentsResult.count || 0,
          totalClasses: classesResult.count || 0,
          activeUsers: (teachersResult.count || 0) + (studentsResult.count || 0)
        });
        
      } else if (user.role === 'homeroom_teacher') {
        const today = new Date().toISOString().split('T')[0];
        
        const [studentsResult, attendanceResult] = await Promise.all([
          supabase.from('students').select('id, nis, full_name', { count: 'exact' }).eq('class_id', user.homeroom_class_id).eq('is_active', true),
          supabase.from('attendances').select('student_id, status').eq('date', today)
        ]);

        const totalStudents = studentsResult.count || 0;
        const studentIds = studentsResult.data?.map(s => s.id) || [];
        const presentToday = attendanceResult.data?.filter(a => 
          studentIds.includes(a.student_id) && a.status === 'hadir'
        ).length || 0;

        // Fetch students with low attendance
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: attendanceData } = await supabase
          .from('attendances_view')
          .select('student_id, student_name, student_nis, status')
          .eq('class_id', user.homeroom_class_id)
          .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

        // Calculate attendance rate per student
        const studentAttendance = {};
        attendanceData?.forEach(record => {
          if (!studentAttendance[record.student_id]) {
            studentAttendance[record.student_id] = {
              name: record.student_name,
              nis: record.student_nis,
              total: 0,
              present: 0
            };
          }
          studentAttendance[record.student_id].total++;
          if (record.status === 'hadir') {
            studentAttendance[record.student_id].present++;
          }
        });

        const alerts = Object.entries(studentAttendance)
          .filter(([_, data]) => {
            // Minimal 10 record untuk dihitung
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
        
      } else if (user.role === 'teacher') {
        // Get classes taught by teacher
        const { data: teacherClasses } = await supabase
          .from('teacher_classes')
          .select('class_id')
          .eq('teacher_id', user.id);

        const classIds = teacherClasses?.map(tc => tc.class_id) || [];

        // Get students in those classes
        const { count } = await supabase
          .from('students')
          .select('id', { count: 'exact' })
          .in('class_id', classIds)
          .eq('is_active', true);

        // Get average grade for teacher's subject
        const { data: grades } = await supabase
          .from('grades')
          .select('score')
          .eq('teacher_id', user.id);

        const avgGrade = grades && grades.length > 0
          ? Math.round(grades.reduce((sum, g) => sum + g.score, 0) / grades.length)
          : 0;

        setStats({
          totalClasses: classIds.length,
          totalStudents: count || 0,
          subject: user.subject || 'N/A',
          averageGrade: avgGrade
        });
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Gagal memuat statistik');
    }
  };


  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetFilters = () => {
    const defaultFilters = {};
    if (user.role === 'homeroom_teacher' && user.homeroom_class_id) {
      defaultFilters.class_id = user.homeroom_class_id;
    } else if (user.role === 'teacher') {
      defaultFilters.teacher_id = user.id;
    }
    setFilters(defaultFilters);
  };
  
  // Fetch report data from database (logic remains the same, it's already good)
  const fetchReportData = async (reportType) => {
    let query;
    let headers = [];
    let formatRow = (row) => row;

    switch (reportType) {
      case 'teachers':
        if (!canAccessReport(user.role, reportType)) {
          throw new Error('Unauthorized access');
        }
        
        query = supabase
          .from('users')
          .select('teacher_id, username, full_name, role, is_active, created_at')
          .in('role', ['teacher', 'homeroom_teacher', 'admin'])
          .order('full_name');

        headers = ['Teacher ID', 'Username', 'Nama Lengkap', 'Role', 'Status', 'Tanggal Bergabung'];
        formatRow = (row) => ({
          teacher_id: row.teacher_id || '-',
          username: row.username,
          full_name: row.full_name,
          role: row.role === 'homeroom_teacher' ? 'Wali Kelas' : row.role === 'teacher' ? 'Guru' : 'Admin',
          is_active: row.is_active ? 'Aktif' : 'Tidak Aktif',
          created_at: new Date(row.created_at).toLocaleDateString('id-ID')
        });
        break;

      case 'students':
        query = supabase
          .from('students')
          .select('nis, full_name, gender, class_id, academic_year, is_active, classes(grade)')
          .eq('is_active', true);

        if (filters.class_id) {
          query = query.eq('class_id', filters.class_id);
        }
        if (filters.academic_year) {
          query = query.eq('academic_year', filters.academic_year);
        }

        query = query.order('class_id').order('full_name');

        headers = ['NIS', 'Nama Lengkap', 'Jenis Kelamin', 'Kelas', 'Tingkat', 'Tahun Ajaran'];
        formatRow = (row) => ({
          nis: row.nis,
          full_name: row.full_name,
          gender: row.gender === 'L' ? 'Laki-laki' : 'Perempuan',
          class_id: row.class_id,
          grade: row.classes?.grade || '-',
          academic_year: row.academic_year
        });
        break;

      case 'attendance':
        const startDate = filters.start_date || (() => {
          const date = new Date();
          date.setDate(1); // First day of current month
          return date.toISOString().split('T')[0];
        })();
        
        const endDate = filters.end_date || new Date().toISOString().split('T')[0];

        query = supabase
          .from('attendances_view')
          .select('date, student_nis, student_name, class_id, status')
          .gte('date', startDate)
          .lte('date', endDate);

        if (filters.class_id) {
          query = query.eq('class_id', filters.class_id);
        }

        query = query.order('date', { ascending: false });

        headers = ['Tanggal', 'NIS', 'Nama Siswa', 'Kelas', 'Status Kehadiran'];
        formatRow = (row) => ({
          date: new Date(row.date).toLocaleDateString('id-ID'),
          student_nis: row.student_nis,
          student_name: row.student_name,
          class_id: row.class_id,
          status: {
            'hadir': 'Hadir',
            'tidak_hadir': 'Tidak Hadir',
            'sakit': 'Sakit',
            'izin': 'Izin'
          }[row.status] || row.status
        });
        break;

      case 'grades':
        query = supabase
          .from('grades')
          .select('academic_year, semester, assignment_type, score, subject, students(nis, full_name, class_id), users(full_name)')
          .order('academic_year', { ascending: false });

        if (user.role === 'teacher') {
          query = query.eq('teacher_id', user.id);
        }
        
        // Perbaikan: Pastikan filter kelas bekerja untuk Admin dan Wali Kelas
        if (filters.class_id && (user.role === 'admin' || user.role === 'homeroom_teacher')) {
          query = query.eq('students.class_id', filters.class_id);
        }
        
        if (filters.academic_year) {
          query = query.eq('academic_year', filters.academic_year);
        }
        if (filters.semester) {
          query = query.eq('semester', filters.semester);
        }

        headers = ['Tahun Ajaran', 'Semester', 'NIS', 'Nama Siswa', 'Kelas', 'Mata Pelajaran', 'Jenis', 'Nilai', 'Guru'];
        formatRow = (row) => ({
          academic_year: row.academic_year,
          semester: row.semester,
          nis: row.students?.nis || '-',
          full_name: row.students?.full_name || '-',
          class_id: row.students?.class_id || '-',
          subject: row.subject,
          assignment_type: row.assignment_type,
          score: row.score,
          teacher: row.users?.full_name || '-'
        });
        break;

      default:
        throw new Error('Invalid report type');
    }

    const { data, error } = await query;
    
    if (error) throw error;

    const formattedData = data.map(formatRow);
    
    // Calculate summary (logic remains the same, it's already good)
    const summary = [];
    if (reportType === 'teachers') {
      summary.push(
        { label: 'Total Guru', value: data.length },
        { label: 'Aktif', value: data.filter(d => d.is_active).length },
        { label: 'Wali Kelas', value: data.filter(d => d.role === 'homeroom_teacher').length }
      );
    } else if (reportType === 'students') {
      summary.push(
        { label: 'Total Siswa', value: data.length },
        { label: 'Laki-laki', value: data.filter(d => d.gender === 'L').length },
        { label: 'Perempuan', value: data.filter(d => d.gender === 'P').length }
      );
    } else if (reportType === 'attendance') {
      const totalRecords = data.length;
      const hadir = data.filter(d => d.status === 'hadir').length;
      summary.push(
        { label: 'Total Records', value: totalRecords },
        { label: 'Hadir', value: `${totalRecords > 0 ? Math.round((hadir/totalRecords)*100) : 0}%` },
        { label: 'Tidak Hadir', value: data.filter(d => d.status !== 'hadir').length }
      );
    } else if (reportType === 'grades') {
      const scores = data.map(d => d.score).filter(s => s != null);
      const avg = scores.length > 0 ? Math.round(scores.reduce((a,b) => a+b, 0) / scores.length) : 0;
      summary.push(
        { label: 'Total Nilai', value: data.length },
        { label: 'Rata-rata', value: avg },
        { label: 'Tertinggi', value: scores.length > 0 ? Math.max(...scores) : 0 },
        { label: 'Terendah', value: scores.length > 0 ? Math.min(...scores) : 0 }
      );
    }

    return {
      headers,
      preview: formattedData.slice(0, 20), // Show first 20 rows
      total: data.length,
      summary,
      fullData: formattedData
    };
  };

  // Preview report
  const previewReport = async (reportType) => {
    setLoading(true);
    setError(null);
    
    try {
      if (!canAccessReport(user.role, reportType)) {
        throw new Error('Anda tidak memiliki akses untuk laporan ini');
      }
      
      const data = await fetchReportData(reportType);
      
      setPreviewModal({
        isOpen: true,
        data,
        type: reportType
      });
    } catch (err) {
      setError(`Gagal preview laporan: ${err.message}`);
      console.error('Preview error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Download report
  const downloadReport = async (reportType, format) => {
    setDownloading(true);
    setError(null);
    
    try {
      if (!canAccessReport(user.role, reportType)) {
        throw new Error('Anda tidak memiliki akses untuk laporan ini');
      }
      
      let data;
      
      // Jika modal terbuka, gunakan data yang sudah ada
      if (previewModal.isOpen && previewModal.type === reportType && previewModal.data) {
        data = previewModal.data;
      } else {
        data = await fetchReportData(reportType);
      }
      
      const timestamp = new Date().getTime();
      const filename = `laporan-${reportType}-${timestamp}.${format}`;
      const title = reportTitle(reportType);
      
      if (format === 'xlsx') {
        await exportToXLSX(data.fullData, data.headers, filename);
        setSuccess(`✅ ${filename} berhasil didownload!`);
      } else if (format === 'pdf') {
        exportToPDF(data.fullData, data.headers, data.summary, filename, title);
        setSuccess(`✅ ${filename} berhasil didownload!`);
      } else {
        throw new Error('Format download tidak didukung.');
      }
      
      setTimeout(() => setSuccess(null), 3000);
      setPreviewModal({ isOpen: false, data: null, type: null });
    } catch (err) {
      setError(`Gagal download laporan: ${err.message}`);
      console.error('Download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  // Report cards configuration (logic remains the same, it's already good)
  const reportCards = useMemo(() => {
    const allCards = [
      {
        id: 'teachers',
        icon: Users,
        title: 'Laporan Data Guru',
        description: 'Export data lengkap semua guru',
        stats: `${stats.totalTeachers || 0} guru terdaftar`,
        color: 'bg-blue-50 border-blue-200',
        iconColor: 'text-blue-600',
        roles: ['admin']
      },
      {
        id: 'students',
        icon: GraduationCap,
        title: user.role === 'homeroom_teacher' 
          ? `Laporan Siswa Kelas ${user.homeroom_class_id}` 
          : 'Laporan Data Siswa',
        description: user.role === 'homeroom_teacher'
          ? 'Export data siswa kelas Anda'
          : 'Export data lengkap semua siswa aktif',
        stats: user.role === 'homeroom_teacher' 
          ? `${stats.totalStudents || 0} siswa di kelas`
          : `${stats.totalStudents || 0} siswa aktif`,
        color: 'bg-green-50 border-green-200',
        iconColor: 'text-green-600',
        roles: ['admin', 'homeroom_teacher']
      },
      {
        id: 'attendance',
        icon: Calendar,
        title: user.role === 'homeroom_teacher'
          ? `Presensi Kelas ${user.homeroom_class_id}`
          : 'Laporan Presensi',
        description: user.role === 'homeroom_teacher'
          ? 'Rekap kehadiran siswa kelas Anda'
          : 'Export rekap kehadiran siswa',
        stats: 'Data presensi terkini',
        color: 'bg-yellow-50 border-yellow-200',
        iconColor: 'text-yellow-600',
        roles: ['admin', 'homeroom_teacher']
      },
      {
        id: 'grades',
        icon: BarChart3,
        title: user.role === 'teacher'
          ? `Nilai ${user.subject}`
          : 'Laporan Akademik',
        description: user.role === 'teacher'
          ? 'Export nilai mata pelajaran yang Anda ajar'
          : 'Export data nilai semua mata pelajaran',
        stats: user.role === 'teacher' 
          ? `${stats.totalClasses || 0} kelas diampu`
          : 'Semua data nilai',
        color: 'bg-purple-50 border-purple-200',
        iconColor: 'text-purple-600',
        roles: ['admin', 'homeroom_teacher', 'teacher']
      },
      {
        id: 'class-analytics',
        icon: TrendingUp,
        title: `Analisis Kelas ${user.homeroom_class_id}`,
        description: 'Performa dan statistik kelas Anda',
        stats: 'Dashboard lengkap',
        color: 'bg-indigo-50 border-indigo-200',
        iconColor: 'text-indigo-600',
        roles: ['homeroom_teacher']
      }
    ];

    return allCards.filter(card => canAccessReport(user.role, card.id));
  }, [user, stats]);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-800">
                {permissions.dashboardTitle}
              </h1>
              {user.role === 'homeroom_teacher' && (
                <p className="text-sm text-slate-500 mt-1">
                  {user.full_name} - Kelas {user.homeroom_class_id}
                </p>
              )}
              {user.role === 'teacher' && (
                <p className="text-sm text-slate-500 mt-1">
                  {user.full_name} - {user.subject}
                </p>
              )}
            </div>
          </div>
          <p className="text-slate-600">{permissions.description}</p>
        </div>

        {/* Success Alert */}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              {success}
            </span>
            <button 
              onClick={() => setSuccess(null)}
              className="text-green-800 hover:text-green-900 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                {error}
              </span>
              <button 
                onClick={() => setError(null)}
                className="text-red-800 hover:text-red-900 font-bold"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Stats Dashboard - Role Based (remains the same) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {user.role === 'admin' && (
            <>
              <StatCard 
                icon={Users} 
                label="Total Guru" 
                value={stats.totalTeachers || 0}
                color="blue"
              />
              <StatCard 
                icon={GraduationCap} 
                label="Total Siswa" 
                value={stats.totalStudents || 0}
                color="green"
              />
              <StatCard 
                icon={Building} 
                label="Total Kelas" 
                value={stats.totalClasses || 0}
                color="purple"
              />
              <StatCard 
                icon={CheckCircle} 
                label="User Aktif" 
                value={stats.activeUsers || 0}
                color="indigo"
              />
            </>
          )}
          
          {user.role === 'homeroom_teacher' && (
            <>
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
            </>
          )}
          
          {user.role === 'teacher' && (
            <>
              <StatCard 
                icon={BookOpen} 
                label="Mata Pelajaran" 
                value={stats.subject || 'N/A'}
                color="indigo"
              />
              <StatCard 
                icon={Users} 
                label="Kelas Diampu" 
                value={stats.totalClasses || 0}
                color="blue"
              />
              <StatCard 
                icon={GraduationCap} 
                label="Total Siswa" 
                value={stats.totalStudents || 0}
                color="green"
              />
              <StatCard 
                icon={BarChart3} 
                label="Rata-rata Nilai" 
                value={stats.averageGrade || 0}
                color="purple"
              />
            </>
          )}
        </div>

        {/* Filter Panel */}
        <FilterPanel
          role={user.role}
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={resetFilters}
          classOptions={classOptions}
        />

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {reportCards.map((card) => {
            const Icon = card.icon;
            
            return (
              <div
                key={card.id}
                className={`bg-white rounded-lg shadow-sm border-2 ${card.color} p-6 hover:shadow-md transition-all duration-200`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-14 h-14 rounded-xl ${card.color} flex items-center justify-center`}>
                    <Icon className={`w-7 h-7 ${card.iconColor}`} />
                  </div>
                </div>
                
                <h3 className="text-lg font-semibold text-slate-800 mb-2">
                  {card.title}
                </h3>
                
                <p className="text-sm text-slate-600 mb-3">
                  {card.description}
                </p>
                
                <p className="text-xs text-slate-500 mb-4 font-medium">
                  📊 {card.stats}
                </p>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => previewReport(card.id)}
                    disabled={loading || downloading}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 disabled:bg-gray-300 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    {loading ? 'Memuat...' : 'Preview'}
                  </button>
                  {/* Perbaikan: Tombol XLSX (Excel) */}
                  <button
                    onClick={() => downloadReport(card.id, 'xlsx')}
                    disabled={loading || downloading}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    {downloading ? 'Unduh...' : 'Excel'}
                  </button>
                  {/* Perbaikan: Tombol PDF */}
                  <button
                    onClick={() => downloadReport(card.id, 'pdf')}
                    disabled={loading || downloading}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <FileTextIcon className="w-4 h-4" />
                    {downloading ? 'Unduh...' : 'PDF'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Alert Students for Homeroom Teacher (remains the same) */}
        {user.role === 'homeroom_teacher' && alertStudents.length > 0 && (
          <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6 mb-8">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-orange-600 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900 mb-2">
                  ⚠️ Siswa Perlu Perhatian Khusus
                </h3>
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
                Laporan tersedia dalam format **XLSX (Excel)** untuk data tabular dan **PDF** untuk pencetakan dokumen.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-slate-700 mb-2 flex items-center gap-2">
                {user.role === 'admin' && <Building className="w-4 h-4" />}
                {user.role === 'homeroom_teacher' && <Users className="w-4 h-4" />}
                {user.role === 'teacher' && <BookOpen className="w-4 h-4" />}
                {user.role === 'admin' && 'Data Terkini'}
                {user.role === 'homeroom_teacher' && 'Cakupan Data'}
                {user.role === 'teacher' && 'Akses Data'}
              </h4>
              <p className="text-sm text-slate-600">
                {user.role === 'admin' && 'Laporan menggunakan data real-time dari database sekolah dengan akses penuh.'}
                {user.role === 'homeroom_teacher' && `Laporan hanya mencakup data siswa dan kegiatan di kelas ${user.homeroom_class_id}.`}
                {user.role === 'teacher' && `Laporan hanya mencakup nilai ${user.subject} di kelas yang Anda ajar.`}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Preview Tersedia
              </h4>
              <p className="text-sm text-slate-600">
                Klik "Preview" untuk melihat ringkasan data sebelum download. Menampilkan 20 baris pertama.
              </p>
            </div>
          </div>
        </div>

        {/* Role-specific tips */}
        <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex gap-3">
            <div className="text-indigo-600 text-xl">💡</div>
            <div>
              <h4 className="font-medium text-indigo-900 mb-1">Tips:</h4>
              <p className="text-sm text-indigo-700">
                {user.role === 'admin' && 'Gunakan filter untuk mempersempit data yang akan di-export. Filter berdasarkan kelas, tanggal, atau tahun ajaran untuk laporan yang lebih spesifik.'}
                {user.role === 'homeroom_teacher' && 'Export laporan presensi dan nilai secara berkala untuk monitoring performa siswa. Gunakan data ini untuk parent meeting dan evaluasi kelas. Perhatikan data "Siswa Perlu Perhatian Khusus" di bawah dashboard stats!'}
                {user.role === 'teacher' && 'Export nilai secara berkala untuk backup data. Anda juga bisa membandingkan performa antar kelas yang Anda ajar.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <PreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal({ isOpen: false, data: null, type: null })}
        reportData={previewModal.data || {}}
        reportType={previewModal.type}
        onDownload={downloadReport} // Panggil fungsi downloadReport
        loading={loading || downloading}
      />
    </div>
  );
};

export default Reports;