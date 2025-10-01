import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { 
  FileText, Users, GraduationCap, BarChart3, 
  Eye, Building, CheckCircle, Filter, X, 
  ChevronDown, FileSpreadsheet, TrendingUp,
  AlertCircle, Award
} from 'lucide-react';
import ExcelJS from 'exceljs';

// ==================== COMPONENTS ====================

const StatCard = ({ icon: Icon, label, value, subtitle, colorClass }) => (
  <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow">
    <div className="flex items-center gap-3">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClass}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-slate-600">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  </div>
);

const FilterPanel = ({ filters, onFilterChange, onReset, classOptions = [], academicYears = [] }) => {
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
              {activeFilterCount} Filter Aktif
            </span>
          )}
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="text-slate-600 hover:text-slate-800 transition-colors"
        >
          <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>
      
      {isOpen && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-3 border-t border-slate-200">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Kelas</label>
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
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Dari Tanggal</label>
            <input 
              type="date" 
              value={filters.start_date || ''} 
              onChange={(e) => onFilterChange('start_date', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Sampai Tanggal</label>
            <input 
              type="date" 
              value={filters.end_date || ''} 
              onChange={(e) => onFilterChange('end_date', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tahun Ajaran</label>
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
            <label className="block text-sm font-medium text-slate-700 mb-2">Semester</label>
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

const PreviewModal = ({ isOpen, onClose, reportData, reportType, onDownload, loading }) => {
  if (!isOpen) return null;
  
  // Safe data access
  const preview = reportData?.preview || [];
  const headers = reportData?.headers || [];
  const summary = reportData?.summary || [];
  const total = reportData?.total || 0;
  
  // Helper to get status badge color
  const getAttendanceBadge = (percentage) => {
    const pct = parseFloat(percentage);
    if (pct >= 90) return { bg: 'bg-green-100', text: 'text-green-700', label: 'Sangat Baik' };
    if (pct >= 75) return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Baik' };
    return { bg: 'bg-red-100', text: 'text-red-700', label: 'Perlu Perhatian' };
  };

  // Show top performers for attendance recap
  const topPerformers = reportType === 'attendance-recap' && preview.length > 0
    ? [...preview]
        .sort((a, b) => parseFloat(b.persentase) - parseFloat(a.persentase))
        .slice(0, 5)
    : [];

  const needsAttention = reportType === 'attendance-recap' && preview.length > 0
    ? preview
        .filter(s => parseFloat(s.persentase) < 75)
        .slice(0, 5)
    : [];
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Preview Laporan</h3>
              <p className="text-sm text-slate-600 mt-1">
                Menampilkan {preview.length} dari {total} data
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-slate-600 transition-colors"
              type="button"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {summary.length > 0 && (
          <div className="p-6 bg-slate-50 border-b border-slate-200">
            <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Ringkasan Data
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {summary.map((stat, idx) => (
                <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-600">{stat.label}</p>
                  <p className="text-lg font-bold text-slate-800">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Special insights for attendance recap */}
        {reportType === 'attendance-recap' && (topPerformers.length > 0 || needsAttention.length > 0) && (
          <div className="p-6 bg-indigo-50 border-b border-indigo-100">
            <div className="grid md:grid-cols-2 gap-6">
              {topPerformers.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <span className="text-xl">🏆</span>
                    Top 5 Kehadiran Terbaik
                  </h4>
                  <div className="space-y-2">
                    {topPerformers.map((student, idx) => (
                      <div key={idx} className="bg-white p-2 rounded-lg text-sm flex items-center justify-between">
                        <span className="font-medium text-slate-700">{student.name} ({student.class_id})</span>
                        <span className="text-green-600 font-bold">{student.persentase}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {needsAttention.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <span className="text-xl">⚠️</span>
                    Perlu Perhatian (&lt;75%)
                  </h4>
                  <div className="space-y-2">
                    {needsAttention.map((student, idx) => (
                      <div key={idx} className="bg-white p-2 rounded-lg text-sm flex items-center justify-between">
                        <span className="font-medium text-slate-700">{student.name} ({student.class_id})</span>
                        <span className="text-red-600 font-bold">{student.persentase}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="p-6 overflow-auto max-h-96">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : preview.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-slate-100 sticky top-0">
                <tr>
                  {headers.map((header, idx) => (
                    <th key={idx} className="px-4 py-2 text-left font-semibold text-slate-700 border-b whitespace-nowrap">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    {Object.entries(row).map(([key, cell], cellIdx) => {
                      // Special rendering for attendance percentage
                      if (key === 'persentase' && reportType === 'attendance-recap') {
                        const badge = getAttendanceBadge(cell);
                        return (
                          <td key={cellIdx} className="px-4 py-2">
                            <span className={`${badge.bg} ${badge.text} px-2 py-1 rounded-full text-xs font-semibold`}>
                              {cell}
                            </span>
                          </td>
                        );
                      }
                      return (
                        <td key={cellIdx} className="px-4 py-2 text-slate-700 whitespace-nowrap">
                          {cell || '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>Tidak ada data yang ditampilkan</p>
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-slate-200 bg-slate-50 flex gap-3 justify-end">
          <button 
            onClick={onClose} 
            type="button"
            className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
          >
            Tutup
          </button>
          <button 
            onClick={() => onDownload(reportType, 'xlsx')} 
            disabled={loading || preview.length === 0}
            type="button"
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Excel
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== EXCEL EXPORT FUNCTION ====================

const exportToExcel = async (data, headers, metadata, filename) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan');

    // Set column widths
    worksheet.columns = headers.map(h => ({ width: 15 }));

    let currentRow = 1;

    // HEADER SECTION
    const titleRow = worksheet.getRow(currentRow++);
    titleRow.getCell(1).value = metadata.title;
    titleRow.getCell(1).font = { size: 16, bold: true, color: { argb: 'FF1E3A8A' } };
    titleRow.height = 25;

    const schoolRow = worksheet.getRow(currentRow++);
    schoolRow.getCell(1).value = 'SMP MUSLIMIN CILILIN';
    schoolRow.getCell(1).font = { size: 12, bold: true };

    if (metadata.academicYear) {
      const yearRow = worksheet.getRow(currentRow++);
      yearRow.getCell(1).value = `Tahun Ajaran: ${metadata.academicYear}`;
      yearRow.getCell(1).font = { size: 10 };
    }

    if (metadata.semester) {
      const semesterRow = worksheet.getRow(currentRow++);
      semesterRow.getCell(1).value = `Semester: ${metadata.semester}`;
      semesterRow.getCell(1).font = { size: 10 };
    }

    const dateRow = worksheet.getRow(currentRow++);
    dateRow.getCell(1).value = `Dicetak: ${new Date().toLocaleDateString('id-ID', { 
      dateStyle: 'full', 
      timeZone: 'Asia/Jakarta' 
    })}`;
    dateRow.getCell(1).font = { size: 9, italic: true };

    if (metadata.filters) {
      const filterRow = worksheet.getRow(currentRow++);
      filterRow.getCell(1).value = `Filter: ${metadata.filters}`;
      filterRow.getCell(1).font = { size: 9, italic: true, color: { argb: 'FF64748B' } };
    }

    currentRow++; // Empty row

    // SUMMARY SECTION
    if (metadata.summary && metadata.summary.length > 0) {
      const summaryTitleRow = worksheet.getRow(currentRow++);
      summaryTitleRow.getCell(1).value = '📊 RINGKASAN DATA';
      summaryTitleRow.getCell(1).font = { size: 11, bold: true };
      summaryTitleRow.height = 20;

      metadata.summary.forEach(stat => {
        const statRow = worksheet.getRow(currentRow++);
        statRow.getCell(1).value = stat.label;
        statRow.getCell(2).value = stat.value;
        statRow.getCell(1).font = { bold: true };
        statRow.getCell(2).font = { bold: true, color: { argb: 'FF4F46E5' } };
      });

      currentRow++; // Empty row
    }

    // TABLE HEADERS
    const headerRow = worksheet.getRow(currentRow++);
    headers.forEach((header, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = header;
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F46E5' }
      };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    headerRow.height = 25;

    // DATA ROWS
    data.forEach((row, rowIdx) => {
      const dataRow = worksheet.getRow(currentRow++);
      Object.values(row).forEach((value, colIdx) => {
        const cell = dataRow.getCell(colIdx + 1);
        cell.value = value || '-';
        
        // Conditional formatting for attendance percentage
        if (headers[colIdx] === 'Persentase' && typeof value === 'string' && value.includes('%')) {
          const pct = parseFloat(value);
          if (pct >= 90) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
            cell.font = { color: { argb: 'FF065F46' }, bold: true };
          } else if (pct >= 75) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
            cell.font = { color: { argb: 'FF92400E' }, bold: true };
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } };
            cell.font = { color: { argb: 'FF991B1B' }, bold: true };
          }
        }

        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        };
        cell.alignment = { vertical: 'middle' };
      });

      // Alternating row colors
      if (rowIdx % 2 === 0) {
        dataRow.eachCell(cell => {
          if (!cell.fill || !cell.fill.fgColor) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          }
        });
      }
    });

    // FOOTER
    currentRow += 2;
    const footerRow = worksheet.getRow(currentRow);
    footerRow.getCell(1).value = `Generated by SMP Muslimin Cililin - ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`;
    footerRow.getCell(1).font = { size: 8, italic: true, color: { argb: 'FF94A3B8' } };

    // Auto-fit columns
    worksheet.columns.forEach((column, idx) => {
      let maxLength = headers[idx]?.length || 10;
      column.eachCell({ includeEmpty: false }, cell => {
        const length = cell.value ? cell.value.toString().length : 0;
        if (length > maxLength) maxLength = length;
      });
      column.width = Math.min(50, Math.max(12, maxLength + 3));
    });

    // Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error('Gagal export ke Excel');
  }
};

// ==================== MAIN COMPONENT ====================

const AdminReports = ({ user, onShowToast }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [stats, setStats] = useState({});
  const [filters, setFilters] = useState({});
  const [previewModal, setPreviewModal] = useState({ isOpen: false, data: null, type: null });
  const [classOptions, setClassOptions] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  const REPORT_CARDS = [
    { 
      id: 'teachers', 
      icon: Users, 
      title: 'Data Guru', 
      description: 'Master data lengkap semua guru',
      stats: `${stats.totalTeachers || 0} guru`,
      colorCard: 'bg-blue-50 border-blue-200',
      colorIcon: 'bg-blue-100 text-blue-600'
    },
    { 
      id: 'students', 
      icon: GraduationCap, 
      title: 'Data Siswa', 
      description: 'Master data semua siswa aktif',
      stats: `${stats.totalStudents || 0} siswa`,
      colorCard: 'bg-green-50 border-green-200',
      colorIcon: 'bg-green-100 text-green-600'
    },
    { 
      id: 'attendance-recap', 
      icon: CheckCircle, 
      title: 'Rekapitulasi Kehadiran', 
      description: 'Statistik kehadiran per siswa',
      stats: `Rata-rata: ${stats.attendanceToday || 0}%`,
      colorCard: 'bg-orange-50 border-orange-200',
      colorIcon: 'bg-orange-100 text-orange-600'
    },
    { 
      id: 'grades', 
      icon: BarChart3, 
      title: 'Data Nilai', 
      description: 'Nilai akademik semua mata pelajaran',
      stats: `Rata-rata: ${stats.averageGrade || 0}`,
      colorCard: 'bg-purple-50 border-purple-200',
      colorIcon: 'bg-purple-100 text-purple-600'
    }
  ];

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStats(),
        fetchClassOptions(),
        fetchAcademicYears()
      ]);
    } catch (err) {
      setError('Gagal memuat data awal');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const [teachersResult, studentsResult, classesResult, attendanceResult, gradesResult] = 
        await Promise.all([
          supabase
            .from('users')
            .select('id', { count: 'exact' })
            .eq('role', 'teacher')
            .eq('is_active', true),
          
          supabase
            .from('students')
            .select('id', { count: 'exact' })
            .eq('is_active', true),
          
          supabase
            .from('classes')
            .select('id', { count: 'exact' }),
          
          supabase
            .from('attendances_view')
            .select('status')
            .eq('date', today),
          
          supabase
            .from('grades')
            .select('score')
            .eq('academic_year', '2025/2026')
        ]);

      const attendanceData = attendanceResult.data || [];
      const presentCount = attendanceData.filter(a => a.status === 'hadir').length;
      const attendanceRate = attendanceData.length > 0 
        ? Math.round((presentCount / attendanceData.length) * 100) 
        : 0;

      const grades = gradesResult.data || [];
      const avgGrade = grades.length > 0
        ? (grades.reduce((sum, g) => sum + (g.score || 0), 0) / grades.length).toFixed(1)
        : 0;

      setStats({
        totalTeachers: teachersResult.count || 0,
        totalStudents: studentsResult.count || 0,
        totalClasses: classesResult.count || 0,
        activeUsers: (teachersResult.count || 0) + (studentsResult.count || 0),
        attendanceToday: attendanceRate,
        averageGrade: avgGrade
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchClassOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id')
        .order('id');
      
      if (error) throw error;
      setClassOptions(data?.map(c => c.id) || []);
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const fetchAcademicYears = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('academic_year')
        .order('academic_year', { ascending: false });
      
      if (error) throw error;
      
      const uniqueYears = [...new Set(data?.map(s => s.academic_year).filter(Boolean))];
      setAcademicYears(uniqueYears);
    } catch (err) {
      console.error('Error fetching academic years:', err);
      setAcademicYears(['2025/2026', '2024/2025', '2023/2024']);
    }
  };

  const fetchReportData = async (reportType) => {
    console.log('🔍 Fetching report:', reportType);
    console.log('📅 Filters:', filters);
    
    const startDate = filters.start_date || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate = filters.end_date || new Date().toISOString().split('T')[0];
    
    console.log('📆 Date range:', startDate, 'to', endDate);
    
    let query, headers, formatRow, summary = [];
    let reportTitle = '';

    switch (reportType) {
      case 'teachers':
        reportTitle = 'DATA GURU';
        query = supabase
          .from('users')
          .select('*')
          .eq('role', 'teacher')
          .order('full_name');
        
        headers = ['Teacher ID', 'Username', 'Nama Lengkap', 'Wali Kelas', 'Status', 'Tanggal Bergabung'];
        
        formatRow = (row) => ({
          teacher_id: row.teacher_id || '-',
          username: row.username,
          full_name: row.full_name,
          homeroom: row.homeroom_class_id || '-',
          is_active: row.is_active ? 'Aktif' : 'Tidak Aktif',
          created_at: new Date(row.created_at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })
        });
        break;

      case 'students':
        reportTitle = 'DATA SISWA';
        query = supabase
          .from('students')
          .select('*, classes(grade)')
          .eq('is_active', true);
        
        if (filters.class_id) query = query.eq('class_id', filters.class_id);
        if (filters.academic_year) query = query.eq('academic_year', filters.academic_year);
        
        query = query.order('class_id').order('full_name');
        
        headers = ['NIS', 'Nama Lengkap', 'Gender', 'Kelas', 'Tingkat', 'Tahun Ajaran'];
        
        formatRow = (row) => ({
          nis: row.nis,
          full_name: row.full_name,
          gender: row.gender === 'L' ? 'Laki-laki' : 'Perempuan',
          class_id: row.class_id,
          grade: row.classes?.grade || '-',
          academic_year: row.academic_year
        });
        break;

      case 'attendance-recap':
        reportTitle = 'REKAPITULASI KEHADIRAN';
        console.log('📊 Fetching attendance data...');
        
        // Try attendances_view first, fallback to attendances table
        let attendanceQuery = supabase
          .from('attendances_view')
          .select('*')
          .gte('date', startDate)
          .lte('date', endDate);
        
        let { data: rawAttendance, error: attendanceError } = await attendanceQuery;
        
        // Fallback to attendances table if view doesn't exist
        if (attendanceError && attendanceError.message.includes('does not exist')) {
          console.log('⚠️ View not found, trying attendances table...');
          attendanceQuery = supabase
            .from('attendances')
            .select(`
              *,
              students!inner(nis, full_name, class_id)
            `)
            .gte('date', startDate)
            .lte('date', endDate);
          
          const result = await attendanceQuery;
          rawAttendance = result.data?.map(a => ({
            student_id: a.student_id,
            student_nis: a.students?.nis,
            student_name: a.students?.full_name,
            class_id: a.students?.class_id,
            status: a.status,
            date: a.date
          }));
          attendanceError = result.error;
        }
        
        if (attendanceError) {
          console.error('❌ Attendance error:', attendanceError);
          throw attendanceError;
        }

        console.log('✅ Raw attendance data:', rawAttendance?.length || 0, 'records');

        let filteredAttendance = rawAttendance || [];
        if (filters.class_id) {
          filteredAttendance = filteredAttendance.filter(a => a.class_id === filters.class_id);
          console.log('🔍 Filtered to class:', filters.class_id, '→', filteredAttendance.length, 'records');
        }
        
        if (filteredAttendance.length === 0) {
          console.warn('⚠️ No attendance data found!');
          return {
            headers: ['NIS', 'Nama', 'Kelas', 'Hadir', 'Sakit', 'Izin', 'Tidak Hadir', 'Total', 'Persentase'],
            preview: [],
            total: 0,
            fullData: [],
            summary: [
              { label: 'Total Siswa', value: 0 },
              { label: 'Total Presensi', value: 0 },
              { label: 'Rata-rata Kehadiran', value: '0%' },
              { label: 'Siswa <75%', value: 0 }
            ],
            reportTitle
          };
        }
        
        const recapData = {};
        filteredAttendance.forEach(record => {
          const key = record.student_id;
          if (!recapData[key]) {
            recapData[key] = {
              nis: record.student_nis || '-',
              name: record.student_name || '-',
              class_id: record.class_id || '-',
              hadir: 0,
              sakit: 0,
              izin: 0,
              tidak_hadir: 0,
              total: 0
            };
          }
          recapData[key].total++;
          if (record.status in recapData[key]) {
            recapData[key][record.status]++;
          }
        });
        
        const finalData = Object.values(recapData).map(r => ({
          ...r,
          persentase: `${Math.round((r.hadir / (r.total || 1)) * 100)}%`
        })).sort((a, b) => b.hadir - a.hadir);
        
        console.log('✅ Recap data:', finalData.length, 'students');
        
        const totalHadir = finalData.reduce((sum, r) => sum + r.hadir, 0);
        const totalPresensi = finalData.reduce((sum, r) => sum + r.total, 0);
        const avgAttendance = totalPresensi > 0 ? Math.round((totalHadir / totalPresensi) * 100) : 0;

        summary = [
          { label: 'Total Siswa', value: finalData.length },
          { label: 'Total Presensi', value: totalPresensi },
          { label: 'Rata-rata Kehadiran', value: `${avgAttendance}%` },
          { label: 'Siswa <75%', value: finalData.filter(s => parseFloat(s.persentase) < 75).length }
        ];
        
        headers = ['NIS', 'Nama', 'Kelas', 'Hadir', 'Sakit', 'Izin', 'Tidak Hadir', 'Total', 'Persentase'];
        
        return { 
          headers, 
          preview: finalData.slice(0, 20), 
          total: finalData.length, 
          fullData: finalData,
          summary,
          reportTitle
        };

      case 'grades':
        reportTitle = 'DATA NILAI AKADEMIK';
        query = supabase
          .from('grades')
          .select('*, students!inner(nis, full_name, class_id), users!inner(full_name)');
        
        if (filters.class_id) {
          query = query.eq('students.class_id', filters.class_id);
        }
        if (filters.academic_year) {
          query = query.eq('academic_year', filters.academic_year);
        }
        if (filters.semester) {
          query = query.eq('semester', filters.semester);
        }
        
        query = query.order('academic_year', { ascending: false }).order('semester');
        
        headers = ['Tahun Ajaran', 'Semester', 'NIS', 'Nama', 'Kelas', 'Mata Pelajaran', 'Jenis Tugas', 'Nilai', 'Guru'];
        
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
        throw new Error('Tipe laporan tidak valid');
    }

    const { data, error } = await query;
    if (error) {
      console.error('❌ Query error:', error);
      throw error;
    }

    console.log('✅ Query result:', data?.length || 0, 'records');

    const formattedData = data?.map(formatRow) || [];
    
    console.log('✅ Formatted data:', formattedData.length, 'records');
    
    // Generate summary for reports
    if (reportType === 'students' && formattedData.length > 0) {
      const maleCount = formattedData.filter(s => s.gender === 'Laki-laki').length;
      const femaleCount = formattedData.filter(s => s.gender === 'Perempuan').length;
      const classes = [...new Set(formattedData.map(s => s.class_id))];
      summary = [
        { label: 'Total Siswa', value: formattedData.length },
        { label: 'Laki-laki', value: maleCount },
        { label: 'Perempuan', value: femaleCount },
        { label: 'Jumlah Kelas', value: classes.length }
      ];
    }
    
    if (reportType === 'teachers' && formattedData.length > 0) {
      const activeCount = formattedData.filter(t => t.is_active === 'Aktif').length;
      const homeroomCount = formattedData.filter(t => t.homeroom !== '-').length;
      summary = [
        { label: 'Total Guru', value: formattedData.length },
        { label: 'Guru Aktif', value: activeCount },
        { label: 'Wali Kelas', value: homeroomCount },
        { label: 'Guru Mapel', value: formattedData.length - homeroomCount }
      ];
    }
    
    if (reportType === 'grades' && formattedData.length > 0) {
      const avgScore = (formattedData.reduce((sum, g) => sum + (parseFloat(g.score) || 0), 0) / formattedData.length).toFixed(2);
      const highestScore = Math.max(...formattedData.map(g => parseFloat(g.score) || 0));
      const lowestScore = Math.min(...formattedData.map(g => parseFloat(g.score) || 0));
      const subjects = [...new Set(formattedData.map(g => g.subject))];
      summary = [
        { label: 'Total Nilai', value: formattedData.length },
        { label: 'Rata-rata', value: avgScore },
        { label: 'Tertinggi', value: highestScore },
        { label: 'Terendah', value: lowestScore },
        { label: 'Mata Pelajaran', value: subjects.length }
      ];
    }

    return {
      headers,
      preview: formattedData.slice(0, 20),
      total: formattedData.length,
      fullData: formattedData,
      summary,
      reportTitle
    };
  };

  const previewReport = async (reportType) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchReportData(reportType);
      console.log('✅ Preview data ready:', data);
      
      // Set modal state AFTER data is ready
      setTimeout(() => {
        setPreviewModal({ isOpen: true, data, type: reportType });
        setLoading(false);
      }, 100);
      
      if (onShowToast) {
        onShowToast('Preview berhasil dimuat', 'success');
      } else {
        setSuccess('Preview berhasil dimuat');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setLoading(false);
      const errorMsg = `Gagal memuat preview: ${err.message}`;
      if (onShowToast) {
        onShowToast(errorMsg, 'error');
      } else {
        setError(errorMsg);
      }
      console.error('Preview error:', err);
    }
  };

  const downloadReport = async (reportType, format) => {
    setLoading(true);
    setError(null);
    try {
      const data = previewModal.data || await fetchReportData(reportType);
      
      if (!data.fullData || data.fullData.length === 0) {
        throw new Error('Tidak ada data untuk di-download');
      }
      
      // Build filter description
      const filterParts = [];
      if (filters.class_id) filterParts.push(`Kelas ${filters.class_id}`);
      if (filters.academic_year) filterParts.push(`TA ${filters.academic_year}`);
      if (filters.semester) filterParts.push(`Semester ${filters.semester}`);
      if (filters.start_date && filters.end_date) {
        filterParts.push(`Periode ${new Date(filters.start_date).toLocaleDateString('id-ID')} - ${new Date(filters.end_date).toLocaleDateString('id-ID')}`);
      }
      const filterDescription = filterParts.length > 0 ? filterParts.join(', ') : 'Semua Data';

      const metadata = {
        title: data.reportTitle || 'LAPORAN',
        academicYear: filters.academic_year || '2025/2026',
        semester: filters.semester ? `Semester ${filters.semester}` : null,
        filters: filterDescription,
        summary: data.summary
      };
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${data.reportTitle?.replace(/\s+/g, '_') || 'Laporan'}_${timestamp}.xlsx`;
      
      await exportToExcel(data.fullData, data.headers, metadata, filename);
      
      const successMsg = `File ${filename} berhasil didownload`;
      if (onShowToast) {
        onShowToast(successMsg, 'success');
      } else {
        setSuccess(successMsg);
        setTimeout(() => setSuccess(null), 3000);
      }
      
      setPreviewModal({ isOpen: false, data: null, type: null });
    } catch (err) {
      const errorMsg = `Gagal download: ${err.message}`;
      if (onShowToast) {
        onShowToast(errorMsg, 'error');
      } else {
        setError(errorMsg);
      }
      console.error('Download error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({});
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <FileText className="w-7 h-7 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Laporan Admin</h1>
              <p className="text-slate-600">SMP Muslimin Cililin - Kelola dan export laporan sekolah</p>
            </div>
          </div>
        </div>

        {/* Toast Notifications */}
        {!onShowToast && success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>{success}</span>
            </div>
            <button onClick={() => setSuccess(null)} className="text-green-600 hover:text-green-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        
        {!onShowToast && error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Users}
            label="Total Guru"
            value={stats.totalTeachers || 0}
            subtitle="Guru aktif"
            colorClass="bg-blue-100 text-blue-600"
          />
          <StatCard
            icon={GraduationCap}
            label="Total Siswa"
            value={stats.totalStudents || 0}
            subtitle="Siswa aktif"
            colorClass="bg-green-100 text-green-600"
          />
          <StatCard
            icon={Building}
            label="Total Kelas"
            value={stats.totalClasses || 0}
            subtitle="Semua tingkat"
            colorClass="bg-purple-100 text-purple-600"
          />
          <StatCard
            icon={TrendingUp}
            label="Kehadiran Hari Ini"
            value={`${stats.attendanceToday || 0}%`}
            subtitle={`Rata-rata nilai: ${stats.averageGrade || 0}`}
            colorClass="bg-indigo-100 text-indigo-600"
          />
        </div>

        {/* Filter Panel */}
        <FilterPanel
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
          classOptions={classOptions}
          academicYears={academicYears}
        />

        {/* Report Cards */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Export Laporan</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {REPORT_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                className={`bg-white rounded-lg shadow-sm border-2 ${card.colorCard} p-6 hover:shadow-md transition-shadow`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-14 h-14 rounded-xl ${card.colorIcon} flex items-center justify-center`}>
                    <Icon className="w-7 h-7" />
                  </div>
                </div>
                
                <h3 className="text-lg font-semibold text-slate-800 mb-2">{card.title}</h3>
                <p className="text-sm text-slate-600 mb-3">{card.description}</p>
                <p className="text-xs text-slate-500 mb-4 font-medium">{card.stats}</p>
                
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => previewReport(card.id)}
                    disabled={loading}
                    className="w-full bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:cursor-not-allowed text-slate-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </button>
                  <button
                    onClick={() => downloadReport(card.id, 'xlsx')}
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Download Excel
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-40">
            <div className="bg-white rounded-lg p-6 shadow-xl flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="text-slate-700 font-medium">Memproses laporan...</p>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
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