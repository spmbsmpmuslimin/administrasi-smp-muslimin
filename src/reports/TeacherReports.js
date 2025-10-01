// TeacherReports.jsx - Subject Teacher View
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { 
  FileText, BookOpen, BarChart3, Eye,
  Filter, X, AlertTriangle, ChevronDown, FileSpreadsheet, FileTextIcon,
  Users, GraduationCap, CheckCircle
} from 'lucide-react';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Stats Card Component
const StatCard = ({ icon: Icon, label, value, color = 'indigo' }) => (
  <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow">
    <div className="flex items-center gap-3">
      <div className={`w-12 h-12 bg-${color}-100 rounded-lg flex items-center justify-center`}>
        <Icon className={`w-6 h-6 text-${color}-600`} />
      </div>
      <div className="flex-1">
        <p className="text-sm text-slate-600">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  </div>
);

// Filter Panel Component
const FilterPanel = ({ filters, onFilterChange, onReset, subjectOptions = [], academicYears = [] }) => {
  const [isOpen, setIsOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    ['academic_year', 'semester', 'subject'].forEach(key => {
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-3 border-t border-slate-200">
          
          {/* Filter Mata Pelajaran */}
          {subjectOptions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Mata Pelajaran
              </label>
              <select
                value={filters.subject || ''}
                onChange={(e) => onFilterChange('subject', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Semua Mapel</option>
                {subjectOptions.map(subj => (
                  <option key={subj} value={subj}>{subj}</option>
                ))}
              </select>
            </div>
          )}
          
          {/* Filter Tahun Ajaran */}
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
          
          {/* Filter Semester */}
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

// Preview Modal Component
const PreviewModal = ({ isOpen, onClose, reportData, onDownload, previewLoading, isDownloading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Preview Laporan Nilai</h3>
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
        
        <div className="p-6 overflow-auto max-h-96">
          {previewLoading ? (
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
        
        <div className="p-6 border-t border-slate-200 bg-slate-50 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
          >
            Tutup
          </button>
          <button
            onClick={() => onDownload('xlsx')}
            disabled={previewLoading || isDownloading}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {isDownloading ? 'Mengunduh...' : 'Download XLSX'}
          </button>
          <button
            onClick={() => onDownload('pdf')}
            disabled={previewLoading || isDownloading}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <FileTextIcon className="w-4 h-4" />
            {isDownloading ? 'Mengunduh...' : 'Download PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Export Functions
const exportToXLSX = async (data, headers, filename) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Laporan Nilai');

  const headerRow = worksheet.addRow(headers);
  headerRow.eachCell(cell => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E7FF' }
    };
    cell.font = { bold: true, color: { argb: 'FF333333' } };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  data.forEach(row => {
    worksheet.addRow(Object.values(row));
  });
  
  worksheet.columns.forEach(column => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, cell => {
      const columnLength = cell.value ? cell.value.toString().length : 10;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    column.width = Math.min(30, Math.max(10, maxLength + 2));
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

const exportToPDF = (data, headers, summary, filename, title) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`, 14, 28);
  
  let finalY = 32;

  if (summary && summary.length > 0) {
    const summaryData = summary.map(s => [s.label, s.value]);
    doc.autoTable({
      startY: 35,
      head: [['Ringkasan', 'Nilai']],
      body: summaryData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [63, 81, 181] }
    });
    finalY = doc.autoTable.previous.finalY;
  }
  
  const bodyData = data.map(row => Object.values(row));
  
  doc.autoTable({
    startY: finalY + 5,
    head: [headers],
    body: bodyData,
    theme: 'striped',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [44, 62, 80] }
  });
  
  doc.save(filename);
};

// Main TeacherReports Component
const TeacherReports = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    subject: 'Mata Pelajaran',
    averageGrade: 0
  });
  const [filters, setFilters] = useState({});
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [previewModal, setPreviewModal] = useState({ isOpen: false, data: null });
  const [success, setSuccess] = useState(null);

  // Fetch subjects taught by teacher and academic years
  useEffect(() => {
    if (!user?.id) {
      console.error('User ID tidak tersedia:', user);
      setError('Data user tidak lengkap');
      return;
    }
    
    console.log('🔍 TeacherReports user data:', user);
    
    const fetchSubjects = async () => {
      try {
        const { data, error } = await supabase
          .from('teacher_assignment')
          .select('subject')
          .eq('teacher_id', user.id)
          .order('subject');
        
        if (error) throw error;
        
        const uniqueSubjects = [...new Set(data.map(item => item.subject))];
        setSubjectOptions(uniqueSubjects);
        
        // Set default filter to first subject
        if (uniqueSubjects.length > 0) {
          setFilters({ subject: uniqueSubjects[0] });
        }
      } catch (err) {
        console.error('Error fetching subjects:', err);
        setError('Gagal memuat mata pelajaran');
      }
    };

    const fetchAcademicYears = async () => {
      try {
        const { data, error } = await supabase
          .from('grades')
          .select('academic_year')
          .eq('teacher_id', user.id)
          .order('academic_year', { ascending: false });
        
        if (error) throw error;
        
        const uniqueYears = [...new Set(data.map(item => item.academic_year))].filter(Boolean);
        
        if (uniqueYears.length > 0) {
          setAcademicYears(uniqueYears);
        } else {
          // Fallback to default years
          setAcademicYears(['2025/2026', '2024/2025', '2023/2024', '2022/2023']);
        }
      } catch (err) {
        console.error('Error fetching academic years:', err);
        // Fallback to default years
        setAcademicYears(['2025/2026', '2024/2025', '2023/2024', '2022/2023']);
      }
    };

    fetchSubjects();
    fetchAcademicYears();
    fetchStats();
  }, [user?.id]);

  // Fetch stats for teacher
  const fetchStats = async () => {
    if (!user?.id) {
      console.error('User ID tidak ditemukan');
      return;
    }

    console.log('📊 Fetching stats for user:', user);

    try {
      // Get teacher assignments
      const { data: teacherAssignments, error: assignmentError } = await supabase
        .from('teacher_assignment')
        .select('class_id, subject')
        .eq('teacher_id', user.id);

      if (assignmentError) {
        console.error('Error fetching teacher assignments:', assignmentError);
        throw assignmentError;
      }

      console.log('📚 Teacher assignments:', teacherAssignments);

      const classIds = teacherAssignments?.map(ta => ta.class_id) || [];
      const firstAssignment = teacherAssignments?.[0];
      const subject = firstAssignment?.subject || 'Mata Pelajaran';

      // Get students count
      let totalStudents = 0;
      if (classIds.length > 0) {
        const { count, error: studentError } = await supabase
          .from('students')
          .select('id', { count: 'exact' })
          .in('class_id', classIds)
          .eq('is_active', true);
        
        if (studentError) {
          console.error('Error fetching students:', studentError);
        } else {
          totalStudents = count || 0;
        }
      }

      // Get average grade
      let avgGrade = 0;
      const { data: grades, error: gradeError } = await supabase
        .from('grades')
        .select('score')
        .eq('teacher_id', user.id);

      if (gradeError) {
        console.error('Error fetching grades:', gradeError);
      } else if (grades && grades.length > 0) {
        avgGrade = Math.round(grades.reduce((sum, g) => sum + (g.score || 0), 0) / grades.length);
      }

      console.log('📈 Stats calculated:', { classIds, totalStudents, avgGrade });

      setStats({
        totalClasses: classIds.length,
        totalStudents: totalStudents,
        subject: subject,
        averageGrade: avgGrade
      });
    } catch (err) {
      console.error('Error in teacher stats:', err);
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
    if (subjectOptions.length > 0) {
      setFilters({ subject: subjectOptions[0] });
    } else {
      setFilters({});
    }
  };

  // Fetch report data - GRADES ONLY
  const fetchReportData = async () => {
    setPreviewLoading(true);
    setError(null);
    
    if (!user?.id) {
      setError('User ID tidak tersedia');
      setPreviewLoading(false);
      return;
    }

    console.log('📥 Fetching report data for user:', user.id);
    
    try {
      let query = supabase
        .from('grades')
        .select(`
          academic_year, 
          semester, 
          assignment_type, 
          score, 
          subject,
          students!inner(nis, full_name, class_id)
        `)
        .eq('teacher_id', user.id)
        .order('academic_year', { ascending: false });

      console.log('🔍 Query filters:', filters);

      // Apply filters
      if (filters.subject) {
        query = query.eq('subject', filters.subject);
      }
      if (filters.academic_year) {
        query = query.eq('academic_year', filters.academic_year);
      }
      if (filters.semester) {
        query = query.eq('semester', filters.semester);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Query error:', error);
        throw error;
      }

      console.log('✅ Data fetched:', data?.length, 'records');

      const headers = ['Tahun Ajaran', 'Semester', 'NIS', 'Nama Siswa', 'Kelas', 'Mata Pelajaran', 'Jenis', 'Nilai'];
      
      const formattedData = data.map(row => ({
        academic_year: row.academic_year || '-',
        semester: row.semester || '-',
        nis: row.students?.nis || '-',
        full_name: row.students?.full_name || '-',
        class_id: row.students?.class_id || '-',
        subject: row.subject || '-',
        assignment_type: row.assignment_type || '-',
        score: row.score || 0
      }));

      // Calculate summary
      const scores = data.map(d => d.score).filter(s => s != null && !isNaN(s));
      const avg = scores.length > 0 ? Math.round(scores.reduce((a,b) => a+b, 0) / scores.length) : 0;
      
      const summary = [
        { label: 'Total Nilai', value: data.length },
        { label: 'Rata-rata', value: avg },
        { label: 'Tertinggi', value: scores.length > 0 ? Math.max(...scores) : 0 },
        { label: 'Terendah', value: scores.length > 0 ? Math.min(...scores) : 0 }
      ];

      setPreviewModal({
        isOpen: true,
        data: {
          headers,
          preview: formattedData.slice(0, 20),
          total: data.length,
          summary,
          fullData: formattedData
        }
      });
    } catch (err) {
      setError(`Gagal memuat data: ${err.message}`);
      console.error('Fetch error:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Download report
  const downloadReport = async (format) => {
    setIsDownloading(true);
    setError(null);
    
    try {
      const data = previewModal.data;
      const timestamp = new Date().getTime();
      const filename = `laporan-nilai-${timestamp}.${format}`;
      const title = `Laporan Nilai ${stats.subject || 'Mata Pelajaran'}`;
      
      if (format === 'xlsx') {
        await exportToXLSX(data.fullData, data.headers, filename);
        setSuccess(`✅ ${filename} berhasil didownload!`);
      } else if (format === 'pdf') {
        exportToPDF(data.fullData, data.headers, data.summary, filename, title);
        setSuccess(`✅ ${filename} berhasil didownload!`);
      }
      
      setTimeout(() => setSuccess(null), 3000);
      setPreviewModal({ isOpen: false, data: null });
    } catch (err) {
      setError(`Gagal download laporan: ${err.message}`);
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-800">
                Laporan - Guru Mata Pelajaran
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {user.full_name} - {stats.subject || 'Mata Pelajaran'}
              </p>
            </div>
          </div>
          <p className="text-slate-600">Kelola laporan nilai mata pelajaran yang Anda ajar</p>
        </div>

        {/* Success/Error Alert */}
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

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard icon={BookOpen} label="Mata Pelajaran" value={stats.subject || 'Mata Pelajaran'} color="indigo" />
          <StatCard icon={Users} label="Kelas Diampu" value={stats.totalClasses || 0} color="blue" />
          <StatCard icon={GraduationCap} label="Total Siswa" value={stats.totalStudents || 0} color="green" />
          <StatCard icon={BarChart3} label="Rata-rata Nilai" value={stats.averageGrade > 0 ? stats.averageGrade : 'N/A'} color="purple" />
        </div>

        {/* Filter Panel */}
        <FilterPanel
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={resetFilters}
          subjectOptions={subjectOptions}
          academicYears={academicYears}
        />

        {/* Report Card */}
        <div className="bg-white rounded-lg shadow-sm border-2 border-purple-50 p-6 hover:shadow-md transition-all duration-200 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 rounded-xl bg-purple-50 flex items-center justify-center">
              <BarChart3 className="w-7 h-7 text-purple-600" />
            </div>
          </div>
          
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            Laporan Nilai {stats.subject || 'Mata Pelajaran'}
          </h3>
          
          <p className="text-sm text-slate-600 mb-3">
            Export nilai mata pelajaran yang Anda ajar
          </p>
          
          <p className="text-xs text-slate-500 mb-4 font-medium">
            📊 {stats.totalClasses || 0} kelas diampu
          </p>
          
          <div className="flex gap-2">
            <button
              onClick={fetchReportData}
              disabled={previewLoading || isDownloading}
              className="flex-1 bg-slate-100 hover:bg-slate-200 disabled:bg-gray-300 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <Eye className="w-4 h-4" />
              {previewLoading ? 'Memuat...' : 'Preview'}
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
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
                Laporan tersedia dalam format XLSX (Excel) untuk data tabular dan PDF untuk pencetakan dokumen.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-slate-700 mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Akses Data
              </h4>
              <p className="text-sm text-slate-600">
                Laporan hanya mencakup nilai {stats.subject || 'mata pelajaran'} di kelas yang Anda ajar.
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

        {/* Tips */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex gap-3">
            <div className="text-indigo-600 text-xl">💡</div>
            <div>
              <h4 className="font-medium text-indigo-900 mb-1">Tips:</h4>
              <p className="text-sm text-indigo-700">
                Export nilai secara berkala untuk backup data. Gunakan filter Mata Pelajaran untuk melihat rincian performa di subjek spesifik yang Anda ajar.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <PreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal({ isOpen: false, data: null })}
        reportData={previewModal.data || {}}
        onDownload={downloadReport}
        previewLoading={previewLoading}
        isDownloading={isDownloading}
      />
    </div>
  );
};

export default TeacherReports;