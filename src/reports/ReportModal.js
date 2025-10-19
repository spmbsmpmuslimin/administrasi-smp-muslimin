import React from 'react';
import { 
  Eye, X, FileSpreadsheet, AlertTriangle, 
  CheckCircle, TrendingUp, Users, Calendar, BarChart3 
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
  if (!isOpen) return null;

  const {
    showSummary = true,
    showInsights = false, // ✅ Disabled by default untuk lebih banyak space ke table
    showActions = true
  } = options;

  // Safe data access
  let preview = reportData?.preview || [];
  const headers = reportData?.headers || [];
  const summary = reportData?.summary || [];
  const total = reportData?.total || 0;

  // ✅ SIMPLIFIED: Header to key mapping
  const headerKeyMap = {
    // Data Siswa
    'NIS': ['nis', 'student_nis'],
    'Nama Siswa': ['name', 'student_name', 'full_name'],
    'Nama Lengkap': ['full_name', 'name'],
    'Kelas': 'class_id',
    'Tingkat': 'grade',
    'Jenis Kelamin': 'gender',
    'Gender': 'gender',
    'Tahun Ajaran': 'academic_year',
    
    // Data Guru
    'Kode Guru': 'teacher_id',
    'Username': 'username',
    'Role': 'role',
    'Wali Kelas': 'homeroom_class_id',
    'Status': ['is_active', 'status'],
    'Tanggal Bergabung': 'created_at',
    
    // Attendance/Kehadiran
    'Hadir': ['hadir', 'Hadir', 'present_count'],
    'Sakit': ['sakit', 'Sakit', 'sick_count'],
    'Izin': ['izin', 'Izin', 'permission_count'],
    'Tidak Hadir': ['tidak_hadir', 'Alpa', 'absent_count'],
    'Absen': ['tidak_hadir', 'Alpa', 'absent_count'],
    'Total': 'total',
    'Persentase': ['persentase', 'percentage'],
    'Tanggal': 'date',
    'Status Kehadiran': 'status',
    
    // Grades/Nilai
    'Semester': 'semester',
    'Mata Pelajaran': ['subject', 'mata_pelajaran'],
    'Nilai': 'score',
    'Guru': 'teacher',
    'Jenis Tugas': 'assignment_type',
    'Jenis': 'assignment_type'
  };

  console.log('=== ReportModal DEBUG ===');
  console.log('Report Type:', reportType);
  console.log('Headers:', headers);
  console.log('Preview length:', preview.length);
  if (preview.length > 0) {
    console.log('Preview[0] keys:', Object.keys(preview[0]));
    console.log('Preview[0] data:', preview[0]);
  }
  console.log('========================');

  // Sort teachers by teacher_id
  if (reportType === 'teachers' && preview.length > 0) {
    preview = [...preview].sort((a, b) => {
      const idA = a.teacher_id || '';
      const idB = b.teacher_id || '';
      return idA.localeCompare(idB);
    });
  }

  // Sort students by name untuk homeroom dan admin
  if ((reportType === 'students' || reportType === 'attendance' || reportType === 'attendance-recap') && 
      preview.length > 0 && 
      (role === 'homeroom' || role === 'admin')) {
    preview = [...preview].sort((a, b) => {
      const nameA = (a.name || a.full_name || a.student_name || '').toLowerCase();
      const nameB = (b.name || b.full_name || b.student_name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }

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
    // Rendering untuk attendance percentage
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

    // Rendering untuk status (Aktif/Tidak Aktif)
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

    // Rendering untuk nilai
    if ((header === 'Nilai' || header === 'Score') && typeof cell === 'number') {
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
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-800">
                Preview {getReportTitle()}
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Menampilkan {preview.length} dari {total} data
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
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
            
            {/* Additional stats untuk attendance recap */}
            {reportType === 'attendance-recap' && preview.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-200">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {(() => {
                    const totalHadir = preview.reduce((sum, r) => sum + (r.hadir || 0), 0);
                    const totalSakit = preview.reduce((sum, r) => sum + (r.sakit || 0), 0);
                    const totalIzin = preview.reduce((sum, r) => sum + (r.izin || 0), 0);
                    const totalAlpa = preview.reduce((sum, r) => sum + (r.tidak_hadir || 0), 0);
                    const totalDays = preview.reduce((sum, r) => sum + (r.total || 0), 0);
                    
                    return [
                      { label: 'Total Hadir', value: totalHadir },
                      { label: 'Total Sakit', value: totalSakit },
                      { label: 'Total Izin', value: totalIzin },
                      { label: 'Total Alpa', value: totalAlpa },
                      { label: 'Total Hari', value: totalDays }
                    ].map((stat, idx) => (
                      <div key={idx} className="bg-blue-50 p-2 rounded border border-blue-200">
                        <p className="text-xs text-slate-600">{stat.label}</p>
                        <p className="text-sm font-bold text-blue-700">{stat.value}</p>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Data Table */}
        <div className="flex-1 overflow-auto bg-white">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : preview.length > 0 ? (
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
                {preview.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                    {headers.map((header, cellIdx) => {
                      // Try multiple possible keys
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
              <p className="text-sm mt-1">Coba ubah filter atau periode waktu</p>
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
              
              {/* ✅ ONLY EXCEL BUTTON - NO PDF */}
              <button 
                onClick={() => onDownload(reportType, 'xlsx')}
                disabled={loading || preview.length === 0}
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