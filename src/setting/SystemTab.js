import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Download, Upload, AlertTriangle, RefreshCw, Table, FileText, Database } from 'lucide-react';

const SystemTab = ({ user, loading, setLoading, showToast }) => {
  const [schoolSettings, setSchoolSettings] = useState({
    current_academic_year: '2024/2025',
    school_name: 'SMP Muslimin Cililin'
  });
  const [schoolStats, setSchoolStats] = useState({
    total_students: 0,
    total_teachers: 0
  });
  const [restoreFile, setRestoreFile] = useState(null);
  const [restorePreview, setRestorePreview] = useState(null);

  useEffect(() => {
    loadSchoolData();
  }, []);

  const loadSchoolData = async () => {
    try {
      setLoading(true);
      
      // Load school settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('school_settings')
        .select('setting_key, setting_value');
      
      if (settingsError) throw settingsError;
      
      if (settingsData && settingsData.length > 0) {
        const settings = {};
        settingsData.forEach(item => {
          settings[item.setting_key] = item.setting_value;
        });
        setSchoolSettings(prev => ({ ...prev, ...settings }));
      }
      
      // Load stats - SESUAI STRUCTURE SMP
      const [teachersRes, studentsRes] = await Promise.all([
        supabase.from('users').select('id').in('role', ['admin', 'guru_mapel', 'guru_walikelas']),
        supabase.from('students').select('id').eq('is_active', true)
      ]);
      
      if (teachersRes.error) throw teachersRes.error;
      if (studentsRes.error) throw studentsRes.error;
      
      setSchoolStats({
        total_students: studentsRes.data?.length || 0,
        total_teachers: teachersRes.data?.length || 0
      });
      
    } catch (error) {
      console.error('Error loading school data:', error);
      showToast('Error memuat data sekolah', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fungsi konversi JSON ke CSV - FIXED NULL HANDLING
  const convertToCSV = (data) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return '';
    }
    
    // Pastikan data tidak null dan ada properti
    const validData = data.filter(item => item !== null && typeof item === 'object');
    if (validData.length === 0) return '';
    
    const headers = Object.keys(validData[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = validData.map(row => {
      return headers.map(header => {
        // Handle nilai yang null, undefined, atau mengandung koma/quote
        let value = row[header];
        if (value === null || value === undefined) {
          value = '';
        }
        value = String(value);
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',');
    });
    
    return [csvHeaders, ...csvRows].join('\n');
  };

  // Export tabel individual ke CSV
  const exportTableToCSV = async (tableName, displayName) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*');
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        showToast(`Tidak ada data di tabel ${displayName}`, 'warning');
        return;
      }
      
      const csvContent = convertToCSV(data);
      if (!csvContent) {
        showToast(`Data ${displayName} tidak valid untuk di-export`, 'error');
        return;
      }
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${schoolSettings.school_name?.replace(/\s+/g, '_')}_${tableName}_${schoolSettings.current_academic_year.replace('/', '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showToast(`${displayName} berhasil di-export ke CSV!`, 'success');
      
    } catch (error) {
      console.error(`Error exporting ${tableName}:`, error);
      showToast(`Error exporting ${displayName}: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Export semua tabel ke CSV
  const exportAllTablesToCSV = async () => {
    try {
      setLoading(true);
      
      // SESUAI TABEL DATABASE SMP
      const tables = [
        { name: 'users', display: 'Pengguna' },
        { name: 'students', display: 'Siswa' },
        { name: 'attendances', display: 'Kehadiran' },
        { name: 'grades', display: 'Nilai' },
        { name: 'teacher_assignments', display: 'Penugasan Guru' },
        { name: 'classes', display: 'Kelas' },
        { name: 'siswa_baru', display: 'Siswa Baru' },
        { name: 'school_settings', display: 'Pengaturan Sekolah' },
        { name: 'announcement', display: 'Pengumuman' }
      ];
      
      let exportedCount = 0;
      
      for (const table of tables) {
        try {
          const { data, error } = await supabase
            .from(table.name)
            .select('*');
          
          if (error) {
            console.error(`Error fetching ${table.name}:`, error);
            continue;
          }
          
          if (data && data.length > 0) {
            const csvContent = convertToCSV(data);
            if (csvContent) {
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${schoolSettings.school_name?.replace(/\s+/g, '_')}_${table.name}_${schoolSettings.current_academic_year.replace('/', '_')}_${new Date().toISOString().split('T')[0]}.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              exportedCount++;
              
              // Tunggu sebentar antara setiap export
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          }
        } catch (tableError) {
          console.error(`Error exporting ${table.name}:`, tableError);
        }
      }
      
      if (exportedCount > 0) {
        showToast(`${exportedCount} tabel berhasil di-export ke CSV!`, 'success');
      } else {
        showToast('Tidak ada data untuk di-export', 'warning');
      }
      
    } catch (error) {
      console.error('Error exporting all tables:', error);
      showToast('Error exporting data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportDatabaseBackup = async () => {
    try {
      setLoading(true);
      
      // SESUAI STRUCTURE DATABASE SMP
      const [
        usersRes, 
        studentsRes, 
        attendancesRes, 
        gradesRes, 
        teacherAssignmentsRes,
        classesRes,
        siswaBaruRes, 
        schoolSettingsRes,
        announcementRes
      ] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('students').select('*'),
        supabase.from('attendances').select('*').limit(1000),
        supabase.from('grades').select('*').limit(1000),
        supabase.from('teacher_assignments').select('*'),
        supabase.from('classes').select('*'),
        supabase.from('siswa_baru').select('*'),
        supabase.from('school_settings').select('*'),
        supabase.from('announcement').select('*')
      ]);
      
      const backupData = {
        timestamp: new Date().toISOString(),
        academic_year: schoolSettings.current_academic_year,
        school_info: schoolSettings,
        data: {
          users: usersRes.data,
          students: studentsRes.data,
          attendances: attendancesRes.data,
          grades: gradesRes.data,
          teacher_assignments: teacherAssignmentsRes.data,
          classes: classesRes.data,
          siswa_baru: siswaBaruRes.data,
          school_settings: schoolSettingsRes.data,
          announcement: announcementRes.data
        },
        stats: {
          total_users: usersRes.data?.length,
          total_students: studentsRes.data?.length,
          total_attendance_records: attendancesRes.data?.length,
          total_grades_records: gradesRes.data?.length,
          total_teacher_assignments: teacherAssignmentsRes.data?.length,
          total_classes: classesRes.data?.length,
          total_siswa_baru: siswaBaruRes.data?.length,
          total_announcements: announcementRes.data?.length
        }
      };
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${schoolSettings.school_name?.replace(/\s+/g, '_')}_backup_${schoolSettings.current_academic_year.replace('/', '_')}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showToast('Database backup berhasil didownload!', 'success');
      
    } catch (error) {
      console.error('Error creating backup:', error);
      showToast('Error membuat database backup', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreFile = (event) => {
    const file = event.target.files[0];
    if (file) {
      setRestoreFile(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const backupData = JSON.parse(e.target.result);
          setRestorePreview({
            timestamp: backupData.timestamp,
            academic_year: backupData.academic_year,
            school_info: backupData.school_info,
            stats: backupData.stats
          });
        } catch (error) {
          showToast('Format file backup tidak valid', 'error');
          setRestoreFile(null);
        }
      };
      reader.readAsText(file);
    }
  };

  const executeRestore = async () => {
    if (!restoreFile) return;
    
    const confirmed = window.confirm(
      `PERINGATAN: Restore akan menimpa semua data yang ada!\n\n` +
      `Backup dari: ${restorePreview.timestamp}\n` +
      `Tahun Ajaran: ${restorePreview.academic_year}\n` +
      `Sekolah: ${restorePreview.school_info?.school_name}\n\n` +
      `Tindakan ini TIDAK DAPAT DIBATALKAN. Apakah Anda yakin?`
    );
    
    if (!confirmed) return;
    
    try {
      setLoading(true);
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const backupData = JSON.parse(e.target.result);
          
          // Hapus semua data yang ada - SESUAI TABEL SMP
          await supabase.from('attendances').delete().neq('id', 0);
          await supabase.from('grades').delete().neq('id', 0);
          await supabase.from('teacher_assignments').delete().neq('id', 0);
          await supabase.from('siswa_baru').delete().neq('id', 0);
          await supabase.from('students').delete().neq('id', 0);
          await supabase.from('users').delete().neq('id', 0);
          await supabase.from('classes').delete().neq('id', 0);
          await supabase.from('announcement').delete().neq('id', 0);
          await supabase.from('school_settings').delete().neq('id', 0);
          
          // Insert data dari backup - SESUAI TABEL SMP
          if (backupData.data.school_settings?.length > 0) {
            await supabase.from('school_settings').insert(backupData.data.school_settings);
          }
          
          if (backupData.data.classes?.length > 0) {
            await supabase.from('classes').insert(backupData.data.classes);
          }
          
          if (backupData.data.users?.length > 0) {
            await supabase.from('users').insert(backupData.data.users);
          }
          
          if (backupData.data.students?.length > 0) {
            await supabase.from('students').insert(backupData.data.students);
          }
          
          if (backupData.data.attendances?.length > 0) {
            await supabase.from('attendances').insert(backupData.data.attendances);
          }
          
          if (backupData.data.grades?.length > 0) {
            await supabase.from('grades').insert(backupData.data.grades);
          }
          
          if (backupData.data.teacher_assignments?.length > 0) {
            await supabase.from('teacher_assignments').insert(backupData.data.teacher_assignments);
          }
          
          if (backupData.data.siswa_baru?.length > 0) {
            await supabase.from('siswa_baru').insert(backupData.data.siswa_baru);
          }
          
          if (backupData.data.announcement?.length > 0) {
            await supabase.from('announcement').insert(backupData.data.announcement);
          }
          
          showToast('Database berhasil di-restore!', 'success');
          setRestoreFile(null);
          setRestorePreview(null);
          
          await loadSchoolData();
          
        } catch (error) {
          console.error('Error restoring backup:', error);
          showToast('Error restoring database: ' + error.message, 'error');
        } finally {
          setLoading(false);
        }
      };
      
      reader.readAsText(restoreFile);
      
    } catch (error) {
      console.error('Error reading restore file:', error);
      showToast('Error membaca file backup', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-2">
        <h2 className="text-xl font-semibold text-gray-800">System Management</h2>
        <p className="text-gray-600 text-sm">SMP Muslimin Cililin - Backup & Restore Database</p>
      </div>
      
      {/* Export Individual Tables to CSV */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Export Data ke CSV</h3>
        <p className="text-gray-600 mb-4">
          Export data per tabel ke format CSV untuk analisis atau backup selektif.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          <button
            onClick={() => exportTableToCSV('users', 'Data Pengguna')}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 font-medium"
          >
            <Table size={16} />
            Export Users
          </button>
          
          <button
            onClick={() => exportTableToCSV('students', 'Data Siswa')}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50 font-medium"
          >
            <Table size={16} />
            Export Students
          </button>
          
          <button
            onClick={() => exportTableToCSV('attendances', 'Data Kehadiran')}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50 font-medium"
          >
            <Table size={16} />
            Export Attendance
          </button>
          
          <button
            onClick={() => exportTableToCSV('grades', 'Data Nilai')}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-3 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:opacity-50 font-medium"
          >
            <Table size={16} />
            Export Nilai
          </button>
          
          <button
            onClick={() => exportTableToCSV('teacher_assignments', 'Penugasan Guru')}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 font-medium"
          >
            <Table size={16} />
            Export Guru
          </button>
          
          <button
            onClick={() => exportTableToCSV('classes', 'Data Kelas')}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-3 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 disabled:opacity-50 font-medium"
          >
            <Table size={16} />
            Export Kelas
          </button>

          <button
            onClick={() => exportTableToCSV('siswa_baru', 'Data Siswa Baru')}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-3 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 disabled:opacity-50 font-medium"
          >
            <Table size={16} />
            Export Siswa Baru
          </button>
          
          <button
            onClick={() => exportTableToCSV('school_settings', 'Pengaturan Sekolah')}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 font-medium"
          >
            <Table size={16} />
            Export Settings
          </button>

          <button
            onClick={() => exportTableToCSV('announcement', 'Pengumuman')}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-3 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 disabled:opacity-50 font-medium"
          >
            <Table size={16} />
            Export Pengumuman
          </button>
        </div>
        
        <button
          onClick={exportAllTablesToCSV}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
        >
          <FileText size={18} />
          {loading ? 'Exporting...' : 'Export Semua Tabel ke CSV'}
        </button>
      </div>
      
      {/* Database Backup */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Database Backup (JSON)</h3>
        <p className="text-gray-600 mb-4">
          Download backup lengkap database untuk keperluan keamanan dan migrasi data.
        </p>
        
        <button
          onClick={exportDatabaseBackup}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          <Download size={18} />
          {loading ? 'Membuat Backup...' : 'Download Backup Database (JSON)'}
        </button>
        
        <div className="mt-4 text-xs text-gray-500">
          <p>Backup akan berisi semua tabel database SMP Muslimin Cililin:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Data pengguna (users table)</li>
            <li>Data siswa (students table)</li>
            <li>Data kehadiran (attendances table)</li>
            <li>Data nilai (grades table)</li>
            <li>Penugasan guru (teacher_assignments table)</li>
            <li>Data kelas (classes table)</li>
            <li>Data siswa baru (siswa_baru table)</li>
            <li>Pengaturan sekolah (school_settings table)</li>
            <li>Pengumuman (announcement table)</li>
          </ul>
        </div>
      </div>
      
      {/* Database Restore */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Database Restore</h3>
        <p className="text-gray-600 mb-4">
          Upload dan restore backup database. <span className="text-red-600 font-medium">PERHATIAN: Ini akan menimpa semua data yang ada!</span>
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload Backup File</label>
            <input
              type="file"
              accept=".json"
              onChange={handleRestoreFile}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          
          {restorePreview && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3 mb-3">
                <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={16} />
                <div>
                  <h4 className="font-medium text-yellow-800">Backup File Preview</h4>
                  <div className="text-sm text-yellow-700 mt-2 space-y-1">
                    <p><strong>Tanggal Backup:</strong> {new Date(restorePreview.timestamp).toLocaleString('id-ID')}</p>
                    <p><strong>Tahun Ajaran:</strong> {restorePreview.academic_year}</p>
                    <p><strong>Sekolah:</strong> {restorePreview.school_info?.school_name}</p>
                    <p><strong>Data Records:</strong></p>
                    <ul className="list-disc list-inside ml-4">
                      <li>{restorePreview.stats?.total_users || 0} pengguna</li>
                      <li>{restorePreview.stats?.total_students || 0} siswa</li>
                      <li>{restorePreview.stats?.total_attendance_records || 0} data kehadiran</li>
                      <li>{restorePreview.stats?.total_grades_records || 0} data nilai</li>
                      <li>{restorePreview.stats?.total_teacher_assignments || 0} penugasan guru</li>
                      <li>{restorePreview.stats?.total_classes || 0} kelas</li>
                      <li>{restorePreview.stats?.total_siswa_baru || 0} siswa baru</li>
                      <li>{restorePreview.stats?.total_announcements || 0} pengumuman</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-4">
                <button
                  onClick={executeRestore}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="animate-spin inline mr-2" size={16} />
                      Restoring...
                    </>
                  ) : 'Execute Restore'}
                </button>
                
                <button
                  onClick={() => {
                    setRestoreFile(null);
                    setRestorePreview(null);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* System Information */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Database size={20} className="text-blue-600" />
          Informasi Sistem
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Database</label>
            <p className="text-sm text-gray-600">Supabase PostgreSQL</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Records</label>
            <p className="text-sm text-gray-600">
              {schoolStats.total_students + schoolStats.total_teachers} pengguna total
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tahun Ajaran</label>
            <p className="text-sm text-gray-600">{schoolSettings.current_academic_year}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Sekolah</label>
            <p className="text-sm text-gray-600">{schoolSettings.school_name}</p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Detail Records</label>
            <div className="flex gap-4 text-xs text-gray-600">
              <span>{schoolStats.total_teachers} guru</span>
              <span>{schoolStats.total_students} siswa</span>
              <span>SMP Muslimin Cililin</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemTab;