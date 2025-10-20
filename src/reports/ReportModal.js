import React, { useState, useMemo } from 'react';
import { 
  Eye, X, FileSpreadsheet, AlertTriangle, 
  CheckCircle, TrendingUp, Users, Calendar, BarChart3,
  Search, Filter, ArrowUpDown
} from 'lucide-react';

const ReportModal = ({ 
  isOpen, 
  onClose, 
  reportData, 
  reportType, 
  role = 'admin',
  onDownload,
  loading = false,
  options = {}
}) => {
  // All hooks at the top, before any conditional returns
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  const preview = reportData?.preview || [];
  const headers = reportData?.headers || [];
  const summary = reportData?.summary || [];
  const total = reportData?.total || 0;

  const { showSummary = true, showInsights = false, showActions = true } = options;

  // Extract unique subjects
  const uniqueSubjects = useMemo(() => {
    return [...new Set(preview
      .map(row => row.subject || row.mata_pelajaran || '-')
      .filter(Boolean)
    )].sort();
  }, [preview]);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = preview;

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(row => {
        const name = (row.full_name || row.name || '').toLowerCase();
        const nis = (row.nis || '').toLowerCase();
        return name.includes(term) || nis.includes(term);
      });
    }

    // Subject filter
    if (filterSubject) {
      filtered = filtered.filter(row => 
        (row.subject || row.mata_pelajaran) === filterSubject
      );
    }

    // Sorting
    const sorted = [...filtered].sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'name':
          aVal = (a.full_name || a.name || '').toLowerCase();
          bVal = (b.full_name || b.name || '').toLowerCase();
          break;
        case 'subject':
          aVal = (a.subject || a.mata_pelajaran || '').toLowerCase();
          bVal = (b.subject || b.mata_pelajaran || '').toLowerCase();
          break;
        case 'score':
          aVal = parseFloat(a.final_score || a.score || 0);
          bVal = parseFloat(b.final_score || b.score || 0);
          break;
        default:
          aVal = a;
          bVal = b;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [preview, searchTerm, filterSubject, sortBy, sortOrder]);

  // Early return after all hooks
  if (!isOpen) return null;

  // DEBUG
  console.log('=== ReportModal DEBUG ===');
  console.log('Report Type:', reportType);
  console.log('Headers:', headers);
  console.log('Preview length:', preview.length);
  if (preview.length > 0) {
    console.log('Preview[0] keys:', Object.keys(preview[0]));
    console.log('Preview[0] data:', preview[0]);
  }
  console.log('========================');

  const headerKeyMap = {
    'NIS': ['nis', 'student_nis'],
    'Nama Siswa': ['name', 'student_name', 'full_name'],
    'Nama Lengkap': ['full_name', 'name'],
    'Kelas': 'class_id',
    'Tingkat': 'grade',
    'Jenis Kelamin': 'gender',
    'Gender': 'gender',
    'Tahun Ajaran': 'academic_year',
    'Kode Guru': 'teacher_id',
    'Username': 'username',
    'Role': 'role',
    'Wali Kelas': 'homeroom_class_id',
    'Status': ['is_active', 'status'],
    'Tanggal Bergabung': 'created_at',
    'Hadir': ['hadir', 'Hadir', 'present_count'],
    'Sakit': ['sakit', 'Sakit', 'sick_count'],
    'Izin': ['izin', 'Izin', 'permission_count'],
    'Tidak Hadir': ['tidak_hadir', 'Alpa', 'absent_count'],
    'Absen': ['tidak_hadir', 'Alpa', 'absent_count'],
    'Total': 'total',
    'Persentase': ['persentase', 'percentage'],
    'Tanggal': 'date',
    'Status Kehadiran': 'status',
    'Semester': 'semester',
    'Mata Pelajaran': ['subject', 'mata_pelajaran'],
    'Nilai': 'score',
    'Nilai Akhir': 'final_score',
    'Guru': 'teacher',
    'Jenis Tugas': 'assignment_type',
    'Jenis': 'assignment_type',
    
    // Recap columns
    'Total Nilai': 'total_grades',
    'Rata-rata Nilai': 'avg_grade',
    'Total Presensi': 'total_attendance',
    'Tingkat Kehadiran': 'attendance_rate'
  };

  const translateHeader = (header) => {
    const headerMap = {
      'Teacher ID': 'Kode Guru',
      'teacher_id': 'Kode Guru',
      'Username': 'Username',
      'Full Name': 'Nama Lengkap',
      'full_name': 'Nama Lengkap',
      'Homeroom Class': 'Wali Kelas',
      'homeroom_class_id': 'Wali Kelas',
      'Status': 'Status',
      'is_active': 'Status',
      'Created At': 'Tanggal Bergabung',
      'created_at': 'Tanggal Bergabung',
      'Role': 'Role',
      'NIS': 'NIS',
      'nis': 'NIS',
      'Name': 'Nama Siswa',
      'name': 'Nama Siswa',
      'Class': 'Kelas',
      'class_id': 'Kelas',
      'student_name': 'Nama Siswa',
      'Tingkat': 'Tingkat',
      'grade': 'Tingkat',
      'Hadir': 'Hadir',
      'hadir': 'Hadir',
      'Sakit': 'Sakit',
      'sakit': 'Sakit',
      'Izin': 'Izin',
      'izin': 'Izin',
      'Tidak Hadir': 'Tidak Hadir',
      'tidak_hadir': 'Tidak Hadir',
      'Alpa': 'Alpa',
      'Total': 'Total',
      'total': 'Total',
      'Persentase': 'Persentase',
      'persentase': 'Persentase',
      'percentage': 'Persentase',
      'Tanggal': 'Tanggal',
      'date': 'Tanggal',
      'Status Kehadiran': 'Status Kehadiran',
      'Gender': 'Jenis Kelamin',
      'gender': 'Jenis Kelamin',
      'Jenis Kelamin': 'Jenis Kelamin',
      'Academic Year': 'Tahun Ajaran',
      'academic_year': 'Tahun Ajaran',
      'Semester': 'Semester',
      'semester': 'Semester',
      'Subject': 'Mata Pelajaran',
      'subject': 'Mata Pelajaran',
      'Score': 'Nilai',
      'score': 'Nilai',
      'Nilai': 'Nilai',
      'Nilai Akhir': 'Nilai Akhir',
      'Teacher': 'Guru',
      'teacher': 'Guru',
      'Assignment Type': 'Jenis Nilai',
      'assignment_type': 'Jenis Nilai'
    };
    return headerMap[header] || header;
  };

  const getReportTitle = () => {
    const titles = {
      admin: {
        'teachers': 'Data Guru',
        'students': 'Data Siswa', 
        'attendance-recap': 'Rekapitulasi Kehadiran',
        'grades': 'Data Nilai Akademik'
      },
      bk: {
        'counseling': 'Data Konseling BK'
      },
      homeroom: {
        'students': 'Data Siswa',
        'attendance': 'Presensi Harian',
        'attendance-recap': 'Rekapitulasi Kehadiran', 
        'grades': 'Data Nilai Akademik'
      },
      teacher: {
        'grades': 'Data Nilai Mata Pelajaran',
        'attendance': 'Presensi Siswa',
        'attendance-recap': 'Rekapitulasi Kehadiran',
        'class-performance': 'Performa Per Kelas'
      }
    };

    return titles[role]?.[reportType] || 'Laporan';
  };

  const renderCellContent = (cell, header, row) => {
    if ((header === 'Persentase' || header === 'Percentage') && 
        typeof cell === 'string' && cell.includes('%')) {
      const pct = parseFloat(cell);
      let badgeClass = 'bg-green-100 text-green-700';
      if (pct >= 90) badgeClass = 'bg-green-100 text-green-700';
      else if (pct >= 75) badgeClass = 'bg-yellow-100 text-yellow-700';
      else badgeClass = 'bg-red-100 text-red-700';

      return (
        <span className={`${badgeClass} px-2 py-1 rounded-full text-xs font-semibold`}>
          {cell}
        </span>
      );
    }

    if (header === 'Status' && typeof cell === 'string') {
      let badgeClass = 'bg-slate-100 text-slate-700';
      if (cell === 'Aktif') badgeClass = 'bg-green-100 text-green-700';
      else if (cell === 'Tidak Aktif') badgeClass = 'bg-red-100 text-red-700';
      else if (cell === 'Selesai') badgeClass = 'bg-green-100 text-green-700';
      else if (cell === 'Proses') badgeClass = 'bg-yellow-100 text-yellow-700';
      else if (cell === 'Menunggu') badgeClass = 'bg-blue-100 text-blue-700';

      return (
        <span className={`${badgeClass} px-2 py-1 rounded-full text-xs font-semibold`}>
          {cell}
        </span>
      );
    }

    if ((header === 'Nilai' || header === 'Nilai Akhir' || header === 'Score') && typeof cell === 'number') {
      let textClass = 'text-slate-700';
      if (cell >= 85) textClass = 'text-green-600 font-bold';
      else if (cell >= 70) textClass = 'text-yellow-600 font-bold';
      else textClass = 'text-red-600 font-bold';

      return <span className={textClass}>{cell}</span>;
    }

    return cell || '-';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-slate-800">
                Preview {getReportTitle()}
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Menampilkan {filteredAndSortedData.length} dari {total} data
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Filter, Search, Sort Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama atau NIS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Subject Filter */}
            {uniqueSubjects.length > 0 && (
              <div className="relative">
                <Filter className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <select
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Semua Mapel</option>
                  {uniqueSubjects.map(subject => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sort */}
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="name">Sort: Nama</option>
                <option value="subject">Sort: Mapel</option>
                <option value="score">Sort: Nilai</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                title={`Sort ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
              >
                <ArrowUpDown className={`w-4 h-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Summary Section */}
        {showSummary && summary.length > 0 && (
          <div className="px-4 pt-3 pb-2 bg-slate-50 border-b border-slate-200 flex-shrink-0">
            <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2 text-sm">
              <BarChart3 className="w-4 h-4" />
              Ringkasan
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {summary.map((stat, idx) => (
                <div key={idx} className="bg-white p-2 rounded border border-slate-200">
                  <p className="text-xs text-slate-600">{stat.label}</p>
                  <p className="text-sm font-bold text-slate-800">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="flex-1 overflow-auto bg-white">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : filteredAndSortedData.length > 0 ? (
            <table className="w-full text-sm border-collapse">
              <thead className="bg-slate-100 sticky top-0 z-10">
                <tr>
                  {headers.map((header, idx) => (
                    <th 
                      key={idx} 
                      className="px-3 py-2 text-left font-semibold text-slate-700 border border-slate-300 whitespace-nowrap text-xs"
                    >
                      {translateHeader(header)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedData.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                    {headers.map((header, cellIdx) => {
                      let keyOptions = headerKeyMap[header];
                      
                      if (typeof keyOptions === 'string') {
                        keyOptions = [keyOptions];
                      }
                      
                      if (!keyOptions) {
                        keyOptions = [header.toLowerCase().replace(/\s+/g, '_'), header];
                      }
                      
                      let cell = undefined;
                      for (const key of keyOptions) {
                        if (row[key] !== undefined && row[key] !== null) {
                          cell = row[key];
                          break;
                        }
                      }
                      
                      return (
                        <td key={cellIdx} className="px-3 py-2 text-slate-800 text-xs border border-slate-200">
                          {renderCellContent(cell, translateHeader(header), row)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-slate-400" />
              <p>Tidak ada data yang ditampilkan</p>
              <p className="text-sm mt-1">Coba ubah filter atau pencarian</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="p-6 border-t border-slate-200 bg-slate-50 flex-shrink-0">
            <div className="flex flex-wrap gap-3 justify-end items-center">
              <button 
                onClick={onClose}
                className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
              >
                Tutup
              </button>
              
              <button 
                onClick={() => onDownload(reportType, 'xlsx')}
                disabled={loading || filteredAndSortedData.length === 0}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Download Excel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportModal;