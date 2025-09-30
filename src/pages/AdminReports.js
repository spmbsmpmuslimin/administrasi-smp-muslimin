import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { 
  FileText, Users, GraduationCap, Calendar, BarChart3, 
  Eye, Building, CheckCircle, Filter, X, 
  AlertTriangle, ChevronDown, FileSpreadsheet, Download
} from 'lucide-react';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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

const FilterPanel = ({ filters, onFilterChange, onReset, classOptions = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(v => v && v !== '').length;
  }, [filters]);
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-600" />
          <h3 className="font-semibold text-slate-800">Filter Laporan</h3>
          {activeFilterCount > 0 && (
            <span className="ml-2 bg-indigo-100 text-indigo-600 text-xs font-bold px-2 py-0.5 rounded-full">
              {activeFilterCount} Filter
            </span>
          )}
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="text-slate-600 hover:text-slate-800">
          <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>
      
      {isOpen && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 pt-3 border-t border-slate-200">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Kelas</label>
            <select value={filters.class_id || ''} onChange={(e) => onFilterChange('class_id', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
              <option value="">Semua Kelas</option>
              {classOptions.map(cls => <option key={cls} value={cls}>{cls}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Dari Tanggal</label>
            <input type="date" value={filters.start_date || ''} onChange={(e) => onFilterChange('start_date', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Sampai Tanggal</label>
            <input type="date" value={filters.end_date || ''} onChange={(e) => onFilterChange('end_date', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tahun Ajaran</label>
            <select value={filters.academic_year || ''} onChange={(e) => onFilterChange('academic_year', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
              <option value="">Semua Tahun</option>
              <option value="2024/2025">2024/2025</option>
              <option value="2023/2024">2023/2024</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Semester</label>
            <select value={filters.semester || ''} onChange={(e) => onFilterChange('semester', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
              <option value="">Semua Semester</option>
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={onReset}
              className="w-full px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium flex items-center justify-center gap-2">
              <X className="w-4 h-4" />Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

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
        {reportData.summary?.length > 0 && (
          <div className="p-6 bg-slate-50 border-b border-slate-200">
            <h4 className="font-semibold text-slate-800 mb-3">Summary</h4>
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
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-100 sticky top-0">
                <tr>
                  {reportData.headers?.map((header, idx) => (
                    <th key={idx} className="px-4 py-2 text-left font-semibold text-slate-700 border-b">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportData.preview?.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    {Object.values(row).map((cell, cellIdx) => (
                      <td key={cellIdx} className="px-4 py-2 text-slate-700 whitespace-nowrap">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="p-6 border-t border-slate-200 bg-slate-50 flex gap-3 justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium">Tutup</button>
          <button onClick={() => onDownload(reportType, 'xlsx')} disabled={loading}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />XLSX
          </button>
          <button onClick={() => onDownload(reportType, 'pdf')} disabled={loading}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center gap-2">
            <Download className="w-4 h-4" />PDF
          </button>
        </div>
      </div>
    </div>
  );
};

const exportToXLSX = async (data, headers, filename) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Laporan');
  const headerRow = worksheet.addRow(headers);
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
    cell.font = { bold: true };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });
  data.forEach(row => worksheet.addRow(Object.values(row)));
  worksheet.columns.forEach(column => {
    let maxLength = 10;
    column.eachCell({ includeEmpty: true }, cell => {
      const length = cell.value ? cell.value.toString().length : 10;
      if (length > maxLength) maxLength = length;
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
  doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 28);
  let finalY = 32;
  if (summary?.length > 0) {
    doc.autoTable({
      startY: 35,
      head: [['Ringkasan', 'Nilai']],
      body: summary.map(s => [s.label, s.value]),
      theme: 'grid',
      headStyles: { fillColor: [63, 81, 181] }
    });
    finalY = doc.autoTable.previous.finalY;
  }
  doc.autoTable({
    startY: finalY + 5,
    head: [headers],
    body: data.map(row => Object.values(row)),
    theme: 'striped',
    headStyles: { fillColor: [44, 62, 80] }
  });
  doc.save(filename);
};

const AdminReports = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [stats, setStats] = useState({});
  const [filters, setFilters] = useState({});
  const [previewModal, setPreviewModal] = useState({ isOpen: false, data: null, type: null });
  const [classOptions, setClassOptions] = useState([]);

  const REPORT_CARDS = [
    { id: 'teachers', icon: Users, title: 'Data Guru', description: 'Export data lengkap semua guru', stats: `${stats.totalTeachers || 0} guru`, color: 'bg-blue-50 border-blue-200', iconColor: 'text-blue-600' },
    { id: 'students', icon: GraduationCap, title: 'Data Siswa', description: 'Export data semua siswa aktif', stats: `${stats.totalStudents || 0} siswa`, color: 'bg-green-50 border-green-200', iconColor: 'text-green-600' },
    { id: 'attendance', icon: Calendar, title: 'Presensi Harian', description: 'Data kehadiran per hari', stats: 'Data presensi', color: 'bg-yellow-50 border-yellow-200', iconColor: 'text-yellow-600' },
    { id: 'attendance-recap', icon: CheckCircle, title: 'Rekapitulasi Kehadiran', description: 'Ringkasan kehadiran per siswa', stats: 'Rekapitulasi', color: 'bg-orange-50 border-orange-200', iconColor: 'text-orange-600' },
    { id: 'grades', icon: BarChart3, title: 'Nilai Akademik', description: 'Export nilai semua mapel', stats: 'Semua nilai', color: 'bg-purple-50 border-purple-200', iconColor: 'text-purple-600' }
  ];

  useEffect(() => {
    fetchStats();
    fetchClassOptions();
  }, []);

  const fetchClassOptions = async () => {
    const { data } = await supabase.from('classes').select('id').order('id');
    setClassOptions(data?.map(c => c.id) || []);
  };

  const fetchStats = async () => {
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
  };

  const fetchReportData = async (reportType) => {
    const startDate = filters.start_date || new Date(new Date().setDate(1)).toISOString().split('T')[0];
    const endDate = filters.end_date || new Date().toISOString().split('T')[0];
    let query, headers, formatRow, summary = [];

    switch (reportType) {
      case 'teachers':
        query = supabase.from('users').select('*').in('role', ['teacher', 'homeroom_teacher', 'admin']).order('full_name');
        headers = ['Teacher ID', 'Username', 'Nama', 'Role', 'Status', 'Bergabung'];
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
        query = supabase.from('students').select('*, classes(grade)').eq('is_active', true);
        if (filters.class_id) query = query.eq('class_id', filters.class_id);
        if (filters.academic_year) query = query.eq('academic_year', filters.academic_year);
        query = query.order('class_id').order('full_name');
        headers = ['NIS', 'Nama', 'Gender', 'Kelas', 'Tingkat', 'Tahun Ajaran'];
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
        query = supabase.from('attendances_view').select('*').gte('date', startDate).lte('date', endDate);
        if (filters.class_id) query = query.eq('class_id', filters.class_id);
        query = query.order('date', { ascending: false });
        headers = ['Tanggal', 'NIS', 'Nama', 'Kelas', 'Status'];
        formatRow = (row) => ({
          date: new Date(row.date).toLocaleDateString('id-ID'),
          student_nis: row.student_nis,
          student_name: row.student_name,
          class_id: row.class_id,
          status: { 'hadir': 'Hadir', 'tidak_hadir': 'Tidak Hadir', 'sakit': 'Sakit', 'izin': 'Izin' }[row.status] || row.status
        });
        break;
      case 'attendance-recap':
        const { data: rawAttendance } = await supabase.from('attendances_view').select('*').gte('date', startDate).lte('date', endDate);
        const recapData = {};
        rawAttendance?.forEach(record => {
          const key = record.student_id;
          if (!recapData[key]) {
            recapData[key] = { nis: record.student_nis, name: record.student_name, class_id: record.class_id, hadir: 0, sakit: 0, izin: 0, tidak_hadir: 0, total: 0 };
          }
          recapData[key].total++;
          recapData[key][record.status]++;
        });
        const finalData = Object.values(recapData).map(r => ({ ...r, persentase: `${Math.round((r.hadir / r.total) * 100)}%` }));
        headers = ['NIS', 'Nama', 'Kelas', 'Hadir', 'Sakit', 'Izin', 'Absen', 'Total', 'Persentase'];
        return { headers, preview: finalData.slice(0, 20), total: finalData.length, fullData: finalData };
      case 'grades':
        query = supabase.from('grades').select('*, students!inner(nis, full_name, class_id), users!inner(full_name)');
        if (filters.class_id) query = query.eq('students.class_id', filters.class_id);
        if (filters.academic_year) query = query.eq('academic_year', filters.academic_year);
        if (filters.semester) query = query.eq('semester', filters.semester);
        query = query.order('academic_year', { ascending: false });
        headers = ['Tahun', 'Semester', 'NIS', 'Nama', 'Kelas', 'Mapel', 'Jenis', 'Nilai', 'Guru'];
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
    return { headers, preview: formattedData.slice(0, 20), total: data.length, fullData: formattedData, summary };
  };

  const previewReport = async (reportType) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchReportData(reportType);
      setPreviewModal({ isOpen: true, data, type: reportType });
    } catch (err) {
      setError(`Gagal preview: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async (reportType, format) => {
    setLoading(true);
    try {
      const data = previewModal.data || await fetchReportData(reportType);
      const filename = `laporan-${reportType}-${Date.now()}.${format}`;
      if (format === 'xlsx') {
        await exportToXLSX(data.fullData, data.headers, filename);
      } else {
        exportToPDF(data.fullData, data.headers, data.summary, filename, `Laporan ${reportType}`);
      }
      setSuccess(`File ${filename} berhasil didownload`);
      setTimeout(() => setSuccess(null), 3000);
      setPreviewModal({ isOpen: false, data: null, type: null });
    } catch (err) {
      setError(`Gagal download: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-slate-800">Laporan - Admin Panel</h1>
          </div>
          <p className="text-slate-600">Generate dan download berbagai jenis laporan sekolah</p>
        </div>

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6 flex justify-between">
            <span>{success}</span>
            <button onClick={() => setSuccess(null)} className="font-bold">×</button>
          </div>
        )}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 flex justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="font-bold">×</button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard icon={Users} label="Total Guru" value={stats.totalTeachers || 0} color="blue" />
          <StatCard icon={GraduationCap} label="Total Siswa" value={stats.totalStudents || 0} color="green" />
          <StatCard icon={Building} label="Total Kelas" value={stats.totalClasses || 0} color="purple" />
          <StatCard icon={CheckCircle} label="User Aktif" value={stats.activeUsers || 0} color="indigo" />
        </div>

        <FilterPanel
          filters={filters}
          onFilterChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
          onReset={() => setFilters({})}
          classOptions={classOptions}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {REPORT_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.id} className={`bg-white rounded-lg shadow-sm border-2 ${card.color} p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-14 h-14 rounded-xl ${card.color} flex items-center justify-center`}>
                    <Icon className={`w-7 h-7 ${card.iconColor}`} />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">{card.title}</h3>
                <p className="text-sm text-slate-600 mb-3">{card.description}</p>
                <p className="text-xs text-slate-500 mb-4 font-medium">{card.stats}</p>
                <div className="flex gap-2">
                  <button onClick={() => previewReport(card.id)} disabled={loading}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                    <Eye className="w-4 h-4" />Preview
                  </button>
                  <button onClick={() => downloadReport(card.id, 'xlsx')} disabled={loading}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                    <FileSpreadsheet className="w-4 h-4" />Excel
                  </button>
                  <button onClick={() => downloadReport(card.id, 'pdf')} disabled={loading}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" />PDF
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <PreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal({ isOpen: false, data: null, type: null })}
        reportData={previewModal.data || {}}
        reportType={previewModal.type}
        onDownload={downloadReport}
        loading={loading}
      />
    </div>
  );
};

export default AdminReports;