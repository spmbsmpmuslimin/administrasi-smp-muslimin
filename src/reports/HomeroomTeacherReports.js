import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { 
  FileText, GraduationCap, Calendar, BarChart3, Download, 
  Eye, TrendingUp, CheckCircle, Filter, X, AlertTriangle, 
  ChevronDown, FileSpreadsheet, FileTextIcon 
} from 'lucide-react';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
      {alert && <AlertTriangle className="w-5 h-5 text-red-500" />}
    </div>
  </div>
);

// Filter Component
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

// Preview Modal
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
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        {reportData.summary && reportData.summary.length > 0 && (
          <div className="p-6 bg-slate-50 border-b border-slate-200">
            <h4 className="font-semibold text-slate-800 mb-3">📊 Summary:</h4>
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
        </div>
        
        <div className="p-6 border-t border-slate-200 bg-slate-50 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
          >
            Tutup
          </button>
          <button
            onClick={() => onDownload(reportType, 'xlsx')}
            disabled={loading}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {loading ? 'Mengunduh...' : 'Download XLSX'}
          </button>
          <button
            onClick={() => onDownload(reportType, 'pdf')}
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <FileTextIcon className="w-4 h-4" />
            {loading ? 'Mengunduh...' : 'Download PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Export Utilities
const exportToXLSX = async (data, headers, filename) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Laporan Data');

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
      if (columnLength > maxLength) maxLength = columnLength;
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

// Main Component
const HomeroomTeacherReports = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [downloadingReportId, setDownloadingReportId] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [stats, setStats] = useState({});
  const [filters, setFilters] = useState({ class_id: user.homeroom_class_id });
  const [previewModal, setPreviewModal] = useState({ isOpen: false, data: null, type: null });
  const [alertStudents, setAlertStudents] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  useEffect(() => {
    fetchAcademicYears();
    fetchStats();
  }, [user]);

  // Fetch academic years from database
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
      // Fallback to default years if error
      setAcademicYears(['2025/2026', '2024/2025', '2023/2024', '2022/2023']);
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
        studentIds.includes(a.student_id) && a.status === 'hadir'
      ).length || 0;

      // Fetch attendance for last 30 days
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
        if (record.status === 'hadir') {
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
    setFilters({ class_id: user.homeroom_class_id });
  };

  const fetchReportData = async (reportType) => {
    const startDate = filters.start_date || (() => {
      const date = new Date();
      date.setDate(1);
      return date.toISOString().split('T')[0];
    })();
    const endDate = filters.end_date || new Date().toISOString().split('T')[0];

    let query;
    let headers = [];
    let formatRow = (row) => row;
    let summary = [];

    try {
      switch (reportType) {
        case 'students':
          query = supabase
            .from('students')
            .select('nis, full_name, gender, class_id, academic_year, is_active')
            .eq('class_id', user.homeroom_class_id)
            .eq('is_active', true)
            .order('full_name');

          if (filters.academic_year) {
            query = query.eq('academic_year', filters.academic_year);
          }

          headers = ['NIS', 'Nama Lengkap', 'Jenis Kelamin', 'Kelas', 'Tahun Ajaran'];
          formatRow = (row) => ({
            nis: row.nis,
            full_name: row.full_name,
            gender: row.gender === 'L' ? 'Laki-laki' : 'Perempuan',
            class_id: row.class_id,
            academic_year: row.academic_year || '-'
          });
          break;

        case 'attendance':
          query = supabase
            .from('attendances')
            .select('date, student_id, status, students!inner(nis, full_name, class_id)')
            .eq('students.class_id', user.homeroom_class_id)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: false });

          headers = ['Tanggal', 'NIS', 'Nama Siswa', 'Kelas', 'Status Kehadiran'];
          formatRow = (row) => ({
            date: new Date(row.date).toLocaleDateString('id-ID'),
            student_nis: row.students?.nis || '-',
            student_name: row.students?.full_name || '-',
            class_id: row.students?.class_id || '-',
            status: {
              'hadir': 'Hadir',
              'tidak_hadir': 'Tidak Hadir',
              'sakit': 'Sakit',
              'izin': 'Izin'
            }[row.status] || row.status
          });
          break;

        case 'attendance-recap':
          const { data: rawAttendance, error: rawError } = await supabase
            .from('attendances')
            .select('student_id, status, students!inner(nis, full_name, class_id)')
            .eq('students.class_id', user.homeroom_class_id)
            .gte('date', startDate)
            .lte('date', endDate);

          if (rawError) throw rawError;
          
          const recapData = {};
          rawAttendance.forEach(record => {
            const key = record.student_id;
            if (!recapData[key]) {
              recapData[key] = {
                nis: record.students?.nis || '-',
                name: record.students?.full_name || '-',
                class_id: record.students?.class_id || '-',
                total_days: 0,
                hadir: 0,
                sakit: 0,
                izin: 0,
                tidak_hadir: 0,
              };
            }
            recapData[key].total_days++;
            if (record.status === 'hadir') recapData[key].hadir++;
            if (record.status === 'sakit') recapData[key].sakit++;
            if (record.status === 'izin') recapData[key].izin++;
            if (record.status === 'tidak_hadir') recapData[key].tidak_hadir++;
          });

          const finalRecapData = Object.values(recapData).map(r => ({
            ...r,
            persentase: r.total_days > 0 ? `${Math.round((r.hadir / r.total_days) * 100)}%` : '0%',
          }));
          
          headers = ['NIS', 'Nama Siswa', 'Kelas', 'Hadir', 'Sakit', 'Izin', 'Absen', 'Total', 'Persentase'];
          formatRow = (row) => ({
            nis: row.nis,
            full_name: row.name,
            class_id: row.class_id,
            hadir: row.hadir,
            sakit: row.sakit,
            izin: row.izin,
            tidak_hadir: row.tidak_hadir,
            total: row.total_days,
            persentase: row.persentase
          });
          
          const avgAttendance = finalRecapData.length > 0 
            ? Math.round(finalRecapData.reduce((sum, r) => sum + parseFloat(r.persentase), 0) / finalRecapData.length)
            : 0;

          summary.push(
            { label: 'Siswa Terekap', value: finalRecapData.length },
            { label: 'Rata-rata Hadir', value: `${avgAttendance}%` }
          );

          return {
            headers,
            preview: finalRecapData.slice(0, 20).map(formatRow),
            total: finalRecapData.length,
            summary,
            fullData: finalRecapData.map(formatRow)
          };

        case 'grades':
          query = supabase
            .from('grades')
            .select(`
              academic_year, 
              semester, 
              assignment_type, 
              score, 
              subject,
              teacher_id,
              students!inner(nis, full_name, class_id)
            `)
            .eq('students.class_id', user.homeroom_class_id)
            .order('academic_year', { ascending: false });

          if (filters.academic_year) {
            query = query.eq('academic_year', filters.academic_year);
          }
          if (filters.semester) {
            query = query.eq('semester', filters.semester);
          }

          const { data: gradesData, error: gradesError } = await query;
          if (gradesError) throw gradesError;

          // Get teacher names separately
          const teacherIds = [...new Set(gradesData.map(g => g.teacher_id))].filter(Boolean);
          const { data: teachersData } = await supabase
            .from('users')
            .select('id, full_name')
            .in('id', teacherIds);

          const teacherMap = {};
          teachersData?.forEach(t => {
            teacherMap[t.id] = t.full_name;
          });

          headers = ['Tahun Ajaran', 'Semester', 'NIS', 'Nama Siswa', 'Mata Pelajaran', 'Jenis', 'Nilai', 'Guru'];
          
          const formattedGrades = gradesData.map(row => ({
            academic_year: row.academic_year || '-',
            semester: row.semester || '-',
            nis: row.students?.nis || '-',
            full_name: row.students?.full_name || '-',
            subject: row.subject || '-',
            assignment_type: row.assignment_type || '-',
            score: row.score || 0,
            teacher: teacherMap[row.teacher_id] || '-'
          }));

          const scores = gradesData.map(d => d.score).filter(s => s != null && !isNaN(s));
          const avg = scores.length > 0 ? Math.round(scores.reduce((a,b) => a+b, 0) / scores.length) : 0;
          
          summary.push(
            { label: 'Total Nilai', value: gradesData.length },
            { label: 'Rata-rata', value: avg },
            { label: 'Tertinggi', value: scores.length > 0 ? Math.max(...scores) : 0 },
            { label: 'Terendah', value: scores.length > 0 ? Math.min(...scores) : 0 }
          );

          return {
            headers,
            preview: formattedGrades.slice(0, 20),
            total: formattedGrades.length,
            summary,
            fullData: formattedGrades
          };

        default:
          throw new Error('Invalid report type');
      }

      const { data, error } = await query;
      if (error) throw error;

      const formattedData = data.map(formatRow);
      
      if (reportType === 'students') {
        summary.push(
          { label: 'Total Siswa', value: data.length },
          { label: 'Laki-laki', value: data.filter(d => d.gender === 'L').length },
          { label: 'Perempuan', value: data.filter(d => d.gender === 'P').length }
        );
      } else if (reportType === 'attendance') {
        const totalRecords = data.length;
        const hadir = data.filter(d => d.status === 'hadir').length;
        const hadirPercent = totalRecords > 0 ? Math.round((hadir/totalRecords)*100) : 0;
        summary.push(
          { label: 'Total Records', value: totalRecords },
          { label: 'Hadir', value: `${hadirPercent}%` },
          { label: 'Tidak Hadir', value: data.filter(d => d.status !== 'hadir').length }
        );
      }

      return {
        headers,
        preview: formattedData.slice(0, 20),
        total: data.length,
        summary,
        fullData: formattedData
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
      
      const timestamp = new Date().getTime();
      const filename = `laporan-${reportType}-kelas-${user.homeroom_class_id}-${timestamp}.${format}`;
      const title = `Laporan ${reportType} - Kelas ${user.homeroom_class_id}`;
      
      if (format === 'xlsx') {
        await exportToXLSX(data.fullData, data.headers, filename);
      } else if (format === 'pdf') {
        exportToPDF(data.fullData, data.headers, data.summary, filename, title);
      }
      
      setSuccess(`✅ ${filename} berhasil didownload!`);
      setTimeout(() => setSuccess(null), 3000);
      setPreviewModal({ isOpen: false, data: null, type: null });
    } catch (err) {
      setError(`Gagal download laporan: ${err.message}`);
      console.error('Download error:', err);
    } finally {
      setDownloadingReportId(null);
    }
  };

  const reports = [
    {
      id: 'students',
      icon: GraduationCap,
      title: `Laporan Siswa Kelas ${user.homeroom_class_id}`,
      description: 'Export data siswa kelas Anda',
      stats: `${stats.totalStudents || 0} siswa di kelas`,
      color: 'bg-green-50 border-green-200',
      iconColor: 'text-green-600',
    },
    {
      id: 'attendance',
      icon: Calendar,
      title: 'Laporan Presensi Harian',
      description: 'Data kehadiran siswa per hari',
      stats: 'Data presensi kelas Anda',
      color: 'bg-yellow-50 border-yellow-200',
      iconColor: 'text-yellow-600',
    },
    {
      id: 'attendance-recap',
      icon: CheckCircle,
      title: 'Rekapitulasi Kehadiran Siswa',
      description: 'Ringkasan total kehadiran per siswa',
      stats: 'Rekapitulasi total dalam periode filter',
      color: 'bg-orange-50 border-orange-200',
      iconColor: 'text-orange-600',
    },
    {
      id: 'grades',
      icon: BarChart3,
      title: 'Laporan Akademik (Nilai)',
      description: 'Export data nilai semua mata pelajaran',
      stats: 'Data nilai kelas Anda',
      color: 'bg-purple-50 border-purple-200',
      iconColor: 'text-purple-600',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-800">
                Laporan - Wali Kelas
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {user.full_name} - Kelas {user.homeroom_class_id}
              </p>
            </div>
          </div>
          <p className="text-slate-600">Kelola laporan untuk kelas Anda</p>
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

        {/* Stats Dashboard */}
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

        {/* Filter Panel */}
        <FilterPanel
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={resetFilters}
          academicYears={academicYears}
        />

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {reports.map((report) => {
            const Icon = report.icon;
            const isDownloading = downloadingReportId === report.id;

            return (
              <div
                key={report.id}
                className={`bg-white rounded-lg shadow-sm border-2 ${report.color} p-6 hover:shadow-md transition-all duration-200`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-14 h-14 rounded-xl ${report.color} flex items-center justify-center`}>
                    <Icon className={`w-7 h-7 ${report.iconColor}`} />
                  </div>
                </div>
                
                <h3 className="text-lg font-semibold text-slate-800 mb-2">
                  {report.title}
                </h3>
                
                <p className="text-sm text-slate-600 mb-3">
                  {report.description}
                </p>
                
                <p className="text-xs text-slate-500 mb-4 font-medium">
                  📊 {report.stats}
                </p>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => previewReport(report.id)}
                    disabled={loading || downloadingReportId}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 disabled:bg-gray-300 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    {loading ? 'Memuat...' : 'Preview'}
                  </button>
                  
                  <button
                    onClick={() => downloadReport(report.id, 'xlsx')}
                    disabled={loading || isDownloading || (downloadingReportId && !isDownloading)}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    {isDownloading ? 'Unduh...' : 'Excel'}
                  </button>
                  <button
                    onClick={() => downloadReport(report.id, 'pdf')}
                    disabled={loading || isDownloading || (downloadingReportId && !isDownloading)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <FileTextIcon className="w-4 h-4" />
                    {isDownloading ? 'Unduh...' : 'PDF'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Alert Students Panel */}
        {alertStudents.length > 0 && (
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
                Laporan tersedia dalam format XLSX (Excel) untuk data tabular dan PDF untuk pencetakan dokumen.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-slate-700 mb-2 flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Cakupan Data
              </h4>
              <p className="text-sm text-slate-600">
                Laporan hanya mencakup data siswa dan kegiatan di kelas {user.homeroom_class_id}.
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
        <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex gap-3">
            <div className="text-indigo-600 text-xl">💡</div>
            <div>
              <h4 className="font-medium text-indigo-900 mb-1">Tips:</h4>
              <p className="text-sm text-indigo-700">
                Export laporan presensi dan nilai secara berkala untuk monitoring performa siswa. 
                Gunakan data ini untuk parent meeting dan evaluasi kelas. Perhatikan data "Siswa 
                Perlu Perhatian Khusus" untuk identifikasi siswa yang memerlukan perhatian lebih!
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
        onDownload={downloadReport}
        loading={downloadingReportId !== null}
      />
    </div>
  );
};

export default HomeroomTeacherReports;