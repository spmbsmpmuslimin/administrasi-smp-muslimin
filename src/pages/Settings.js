import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import AcademicYearTab from '../components/AcademicYearTab';
import { 
  Settings, 
  User, 
  Shield, 
  Bell, 
  Save,
  Eye,
  EyeOff,
  Key,
  Database,
  RefreshCw,
  BookOpen,
  Users,
  Zap,
  Server,
  Play,
  Plus,
  Trash2,
  Download,
  Upload,
  AlertTriangle,
  BarChart3,
  FileSpreadsheet
} from 'lucide-react';

// Import library untuk export Excel
import * as XLSX from 'xlsx';

const Setting = ({ user, onShowToast }) => {
  const [activeTab, setActiveTab] = useState('academic');
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: '',
    username: '',
    phone: '',
    teacher_id: '',
    role: '',
    homeroom_class_id: ''
  });
  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // State untuk Automation Tab
  const [automationRules, setAutomationRules] = useState([
    {
      id: 1,
      name: "Alert Alpha 3 Hari",
      description: "Otomatis buat pengumuman jika siswa alpha 3 hari berturut-turut",
      trigger: { table: 'attendance', condition: 'alpha_3_days' },
      action: { type: 'create_announcement', target: 'homeroom_teacher' },
      isActive: true,
      lastTriggered: null,
      lastResult: null
    },
    {
      id: 2,
      name: "Flag Nilai Rendah",
      description: "Tandai siswa dengan nilai di bawah 75 secara berulang",
      trigger: { table: 'grades', condition: 'low_grades' },
      action: { type: 'flag_student', note: 'Perlu bimbingan akademik' },
      isActive: true,
      lastTriggered: null,
      lastResult: null
    },
    {
      id: 3,
      name: "Auto Archive Data Lama",
      description: "Nonaktifkan data siswa dari tahun ajaran sebelumnya",
      trigger: { table: 'students', condition: 'inactive_previous_year' },
      action: { type: 'update_status', status: 'inactive' },
      isActive: false,
      lastTriggered: null,
      lastResult: null
    }
  ]);

  // State untuk Integrations Tab
  const [exportData, setExportData] = useState({
    table: 'students',
    format: 'csv',
    includeInactive: false
  });

  // State untuk Admin Database Tab
  const [dataHealth, setDataHealth] = useState({
    orphanedStudents: 0,
    missingTeacherData: 0,
    duplicateRecords: 0
  });

  // Fetch user profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('full_name, username, phone, teacher_id, role, homeroom_class_id')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          setProfileData({
            full_name: user.full_name || '',
            username: user.username || '',
            phone: '',
            teacher_id: user.teacher_id || '',
            role: user.role || '',
            homeroom_class_id: user.homeroom_class_id || ''
          });
          return;
        }
        
        if (data) {
          setProfileData({
            full_name: data.full_name || '',
            username: data.username || '',
            phone: data.phone || '',
            teacher_id: data.teacher_id || '',
            role: data.role || '',
            homeroom_class_id: data.homeroom_class_id || ''
          });
        }
      } catch (error) {
        console.error('Error in fetchProfile:', error);
      }
    };

    fetchProfile();
    checkDataHealth();
  }, [user]);

  // Handle profile update
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = {
        full_name: profileData.full_name,
        username: profileData.username,
        phone: profileData.phone
      };

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      onShowToast('Profil berhasil diperbarui', 'success');
    } catch (error) {
      console.error('Error updating profile:', error);
      onShowToast('Gagal memperbarui profil', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (securityData.newPassword !== securityData.confirmPassword) {
      onShowToast('Password baru tidak cocok', 'error');
      return;
    }

    if (securityData.newPassword.length < 6) {
      onShowToast('Password minimal 6 karakter', 'error');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: securityData.newPassword
      });

      if (error) throw error;

      onShowToast('Password berhasil diubah', 'success');
      setSecurityData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error changing password:', error);
      onShowToast('Gagal mengubah password', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // Clear cache
  const handleClearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    onShowToast('Cache berhasil dibersihkan', 'success');
  };

  // Logout dari semua perangkat
  const handleLogoutAllDevices = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      onShowToast('Berhasil logout dari semua perangkat', 'success');
    } catch (error) {
      console.error('Error logging out:', error);
      onShowToast('Gagal logout', 'error');
    }
  };

  // ==================== EXPORT EXCEL FUNCTIONS ====================
  const exportToExcel = async (tableName) => {
    setLoading(true);
    try {
      let data;
      
      // Query berbeda untuk setiap table
      if (tableName === 'classes') {
        const { data: classesData, error } = await supabase
          .from('classes')
          .select('*')
          .order('grade', { ascending: true });
        
        if (error) throw error;
        data = classesData;
      } 
      else if (tableName === 'teacher_assignments') {
        const { data: assignmentsData, error } = await supabase
          .from('teacher_assignment')
          .select(`
            *,
            teachers:teacher_id(full_name),
            classes:class_id(grade)
          `);
        
        if (error) throw error;
        
        // Format data untuk lebih readable
        data = assignmentsData.map(assignment => ({
          id: assignment.id,
          teacher_name: assignment.teachers?.full_name || 'Tidak diketahui',
          class_grade: assignment.classes?.grade || 'Tidak diketahui',
          subject: assignment.subject,
          academic_year: assignment.academic_year,
          semester: assignment.semester,
          created_at: assignment.created_at
        }));
      }
      else {
        // Untuk table lainnya
        const { data: tableData, error } = await supabase
          .from(tableName)
          .select('*');
        
        if (error) throw error;
        data = tableData;
      }

      if (!data || data.length === 0) {
        onShowToast(`Tidak ada data di tabel ${tableName}`, 'warning');
        return;
      }

      // Create workbook dan worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      
      // Add worksheet ke workbook
      XLSX.utils.book_append_sheet(wb, ws, tableName);
      
      // Export ke file Excel
      const fileName = `${tableName}_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      onShowToast(`Data ${tableName} berhasil di-export ke Excel`, 'success');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      onShowToast(`Gagal mengexport data ${tableName}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    if (exportData.format === 'excel') {
      await exportToExcel(exportData.table);
    } else {
      // Existing CSV export logic
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from(exportData.table)
          .select('*');

        if (error) throw error;

        if (!data || data.length === 0) {
          onShowToast(`Tidak ada data di tabel ${exportData.table}`, 'warning');
          return;
        }

        const headers = Object.keys(data[0]).join(',');
        const csvData = data.map(row => 
          Object.values(row).map(field => 
            typeof field === 'string' ? `"${field.replace(/"/g, '""')}"` : field
          ).join(',')
        ).join('\n');

        const csvContent = `${headers}\n${csvData}`;
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${exportData.table}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        
        onShowToast(`Data ${exportData.table} berhasil di-export`, 'success');
      } catch (error) {
        console.error('Error exporting data:', error);
        onShowToast('Gagal mengexport data', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle import data
  const handleImportData = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      const records = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const record = {};
        headers.forEach((header, index) => {
          record[header] = values[index] || '';
        });
        return record;
      }).filter(record => record.id); // Hanya records dengan ID

      // Insert ke database
      const { error } = await supabase
        .from('students')
        .upsert(records);

      if (error) throw error;

      onShowToast(`Data berhasil diimport: ${records.length} records`, 'success');
      event.target.value = ''; // Reset file input
    } catch (error) {
      console.error('Error importing data:', error);
      onShowToast('Gagal mengimport data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ==================== IMPROVED AUTOMATION FUNCTIONS ====================
  const toggleAutomationRule = async (ruleId) => {
    setAutomationRules(prev => 
      prev.map(rule => 
        rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
      )
    );
    onShowToast('Status rule diperbarui', 'success');
  };

  const runAutomationRule = async (ruleId) => {
    setLoading(true);
    try {
      const rule = automationRules.find(r => r.id === ruleId);
      let result = { affected: 0, details: '' };

      if (rule.trigger.condition === 'alpha_3_days') {
        result = await handleAlpha3DaysRule();
      } 
      else if (rule.trigger.condition === 'low_grades') {
        result = await handleLowGradesRule();
      }
      else if (rule.trigger.condition === 'inactive_previous_year') {
        result = await handleInactivePreviousYear();
      }

      // Update last triggered time dan result
      setAutomationRules(prev => 
        prev.map(r => 
          r.id === ruleId ? { 
            ...r, 
            lastTriggered: new Date(),
            lastResult: result 
          } : r
        )
      );

      onShowToast(
        `Rule "${rule.name}" berhasil dijalankan. ${result.affected} data diproses.`,
        'success'
      );
    } catch (error) {
      console.error('Error running automation rule:', error);
      onShowToast('Gagal menjalankan rule', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAlpha3DaysRule = async () => {
    // Cari siswa yang alpha 3 hari berturut-turut dalam 7 hari terakhir
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: attendanceData, error } = await supabase
      .from('attendance')
      .select('student_id, date, status, students(full_name)')
      .eq('status', 'alpha')
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) throw error;

    const consecutiveAlpha = findConsecutiveAlpha(attendanceData, 3);
    
    if (consecutiveAlpha.length > 0) {
      // Buat pengumuman untuk setiap siswa
      for (const student of consecutiveAlpha) {
        const { error: announcementError } = await supabase
          .from('announcement')
          .insert({
            title: `⚠️ Perhatian: Alpha 3 Hari Berturut-turut`,
            content: `Siswa ${student.student_name} (${student.student_id}) telah alpha selama 3 hari berturut-turut. Mohon perhatian wali kelas.`,
            created_at: new Date().toISOString(),
            priority: 'high'
          });

        if (announcementError) throw announcementError;
      }
    }

    return { 
      affected: consecutiveAlpha.length, 
      details: `${consecutiveAlpha.length} siswa terdeteksi alpha 3 hari berturut-turut` 
    };
  };

  const handleLowGradesRule = async () => {
    // Cari siswa dengan nilai di bawah 75 untuk 3 tugas berbeda
    const { data: lowGrades, error } = await supabase
      .from('grades')
      .select('student_id, score, assignment_type, students(full_name)')
      .lt('score', 75)
      .order('student_id');

    if (error) throw error;

    // Kelompokkan oleh student_id dan hitung jumlah nilai rendah
    const studentLowCount = {};
    lowGrades.forEach(grade => {
      if (!studentLowCount[grade.student_id]) {
        studentLowCount[grade.student_id] = {
          count: 0,
          name: grade.students?.full_name || 'Tidak diketahui'
        };
      }
      studentLowCount[grade.student_id].count++;
    });

    // Filter siswa dengan 3+ nilai rendah
    const studentsWithMultipleLow = Object.entries(studentLowCount)
      .filter(([_, info]) => info.count >= 3)
      .map(([studentId, info]) => ({ student_id: studentId, student_name: info.name }));

    // Buat pengumuman untuk siswa yang perlu perhatian
    if (studentsWithMultipleLow.length > 0) {
      const { error: announcementError } = await supabase
        .from('announcement')
        .insert({
          title: `📚 Siswa Perlu Bimbingan Akademik`,
          content: `${studentsWithMultipleLow.length} siswa memiliki 3+ nilai di bawah 75. Perlu perhatian khusus.`,
          created_at: new Date().toISOString(),
          priority: 'medium'
        });

      if (announcementError) throw announcementError;
    }

    return { 
      affected: studentsWithMultipleLow.length, 
      details: `${studentsWithMultipleLow.length} siswa memiliki 3+ nilai di bawah 75` 
    };
  };

  const handleInactivePreviousYear = async () => {
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;
    
    const { data, error } = await supabase
      .from('students')
      .update({ is_active: false })
      .eq('academic_year', previousYear.toString())
      .eq('is_active', true);

    if (error) throw error;

    return { 
      affected: data?.length || 0, 
      details: `Nonaktifkan siswa dari tahun ajaran ${previousYear}` 
    };
  };

  const findConsecutiveAlpha = (attendanceData, consecutiveDays) => {
    const studentDays = {};
    
    // Kelompokkan attendance oleh student_id
    attendanceData.forEach(record => {
      if (!studentDays[record.student_id]) {
        studentDays[record.student_id] = [];
      }
      studentDays[record.student_id].push(record.date);
    });

    // Cari yang consecutive
    const result = [];
    Object.entries(studentDays).forEach(([studentId, dates]) => {
      const sortedDates = [...new Set(dates)].sort().reverse();
      
      for (let i = 0; i <= sortedDates.length - consecutiveDays; i++) {
        const currentDate = new Date(sortedDates[i]);
        const isConsecutive = Array.from({ length: consecutiveDays }, (_, j) => {
          const checkDate = new Date(currentDate);
          checkDate.setDate(checkDate.getDate() - j);
          return checkDate.toISOString().split('T')[0];
        }).every(date => sortedDates.includes(date));

        if (isConsecutive) {
          result.push({
            student_id: studentId,
            student_name: attendanceData.find(a => a.student_id === studentId)?.students?.full_name || 'Tidak diketahui'
          });
          break;
        }
      }
    });

    return result;
  };

  // ==================== ADMIN DATABASE FUNCTIONS ====================
  const checkDataHealth = async () => {
    try {
      // Cek siswa tanpa kelas
      const { data: orphanedStudents, error: orphanError } = await supabase
        .from('students')
        .select('id')
        .is('class_id', null);

      // Cek grades tanpa teacher_id
      const { data: missingTeacher, error: teacherError } = await supabase
        .from('grades')
        .select('id')
        .is('teacher_id', null);

      if (!orphanError && !teacherError) {
        setDataHealth({
          orphanedStudents: orphanedStudents?.length || 0,
          missingTeacherData: missingTeacher?.length || 0,
          duplicateRecords: 0 // Bisa dikembangkan dengan query lebih complex
        });
      }
    } catch (error) {
      console.error('Error checking data health:', error);
    }
  };

  const fixOrphanedStudents = async () => {
    setLoading(true);
    try {
      // Assign kelas default ke siswa tanpa kelas
      const { error } = await supabase
        .from('students')
        .update({ class_id: 1 }) // Default class ID, bisa disesuaikan
        .is('class_id', null);

      if (error) throw error;

      onShowToast('Siswa tanpa kelas berhasil diperbaiki', 'success');
      checkDataHealth(); // Refresh data health
    } catch (error) {
      console.error('Error fixing orphaned students:', error);
      onShowToast('Gagal memperbaiki data siswa', 'error');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'academic', label: 'Tahun Ajaran', icon: BookOpen },
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'security', label: 'Keamanan', icon: Shield },
    { id: 'automation', label: 'Otomasi & Workflow', icon: Zap },
    { id: 'integrations', label: 'Integrasi', icon: RefreshCw },
    { id: 'admin', label: 'Admin Database', icon: Server },
    { id: 'system', label: 'Sistem', icon: Database }
  ];

  // Fungsi untuk mendapatkan label role
  const getRoleLabel = (role) => {
    const roleLabels = {
      'admin': 'Administrator',
      'teacher': 'Guru',
      'homeroom': 'Wali Kelas',
      'student': 'Siswa'
    };
    return roleLabels[role] || role;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-800">Pengaturan</h1>
          </div>
          <p className="text-gray-600">
            Kelola pengaturan akun dan preferensi sistem
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Academic Year Tab */}
            {activeTab === 'academic' && (
              <AcademicYearTab onShowToast={onShowToast} />
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  Informasi Profil
                </h2>
                
                {/* Informasi yang tidak bisa diubah */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      ID Guru
                    </label>
                    <p className="text-gray-800 font-medium">
                      {profileData.teacher_id || 'Tidak tersedia'}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Role
                    </label>
                    <p className="text-gray-800 font-medium">
                      {getRoleLabel(profileData.role)}
                    </p>
                  </div>
                  {profileData.homeroom_class_id && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Wali Kelas
                      </label>
                      <p className="text-gray-800 font-medium">
                        Kelas {profileData.homeroom_class_id}
                      </p>
                    </div>
                  )}
                </div>

                {/* Form untuk data yang bisa diubah */}
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nama Lengkap *
                      </label>
                      <input
                        type="text"
                        value={profileData.full_name}
                        onChange={(e) =>
                          setProfileData({ ...profileData, full_name: e.target.value })
                        }
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Masukkan nama lengkap"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Username *
                      </label>
                      <input
                        type="text"
                        value={profileData.username}
                        onChange={(e) =>
                          setProfileData({ ...profileData, username: e.target.value })
                        }
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Masukkan username"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nomor Telepon
                      </label>
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) =>
                          setProfileData({ ...profileData, phone: e.target.value })
                        }
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Masukkan nomor telepon"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </form>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  Keamanan Akun
                </h2>
                <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password Baru *
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? 'text' : 'password'}
                        value={securityData.newPassword}
                        onChange={(e) =>
                          setSecurityData({ ...securityData, newPassword: e.target.value })
                        }
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                        placeholder="Masukkan password baru (min. 6 karakter)"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('new')}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.new ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Konfirmasi Password Baru *
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={securityData.confirmPassword}
                        onChange={(e) =>
                          setSecurityData({ ...securityData, confirmPassword: e.target.value })
                        }
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                        placeholder="Konfirmasi password baru"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('confirm')}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.confirm ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2"
                  >
                    <Key className="w-4 h-4" />
                    {loading ? 'Mengubah...' : 'Ubah Password'}
                  </button>
                </form>

                {/* Logout dari semua perangkat */}
                <div className="mt-8 p-4 border border-gray-200 rounded-lg">
                  <h3 className="font-medium text-gray-800 mb-2">Sesi Aktif</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Keluar dari semua perangkat yang sedang login
                  </p>
                  <button
                    onClick={handleLogoutAllDevices}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    Logout dari Semua Perangkat
                  </button>
                </div>
              </div>
            )}

            {/* Automation & Workflow Tab */}
            {activeTab === 'automation' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  Otomasi & Workflow
                </h2>
                
                <div className="space-y-4">
                  {automationRules.map((rule) => (
                    <div key={rule.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-800">{rule.name}</h3>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => runAutomationRule(rule.id)}
                            disabled={loading}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                          >
                            <Play className="w-3 h-3" />
                            Jalankan
                          </button>
                          <button
                            onClick={() => toggleAutomationRule(rule.id)}
                            className={`px-3 py-1 rounded text-sm ${
                              rule.isActive 
                                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                            }`}
                          >
                            {rule.isActive ? 'Aktif' : 'Nonaktif'}
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
                      <div className="text-xs text-gray-500 space-y-1">
                        <div>
                          Terakhir dijalankan: {rule.lastTriggered 
                            ? new Date(rule.lastTriggered).toLocaleString('id-ID')
                            : 'Belum pernah'}
                        </div>
                        {rule.lastResult && (
                          <div className="text-green-600">
                            Hasil: {rule.lastResult.details} ({rule.lastResult.affected} data)
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tambah Rule Baru */}
                <div className="mt-6 p-4 border border-dashed border-gray-300 rounded-lg">
                  <button className="text-blue-600 hover:text-blue-700 flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Tambah Rule Automation Baru
                  </button>
                </div>
              </div>
            )}

            {/* Integrations Tab */}
            {activeTab === 'integrations' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  Integrasi & Data Exchange
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Export Data */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Export Data
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tabel
                        </label>
                        <select
                          value={exportData.table}
                          onChange={(e) => setExportData({...exportData, table: e.target.value})}
                          className="w-full p-2 border border-gray-300 rounded"
                        >
                          <option value="students">Students</option>
                          <option value="users">Users</option>
                          <option value="attendance">Attendance</option>
                          <option value="grades">Grades</option>
                          <option value="classes">Classes</option>
                          <option value="teacher_assignment">Teacher Assignments</option>
                          <option value="announcement">Announcement</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Format
                        </label>
                        <select
                          value={exportData.format}
                          onChange={(e) => setExportData({...exportData, format: e.target.value})}
                          className="w-full p-2 border border-gray-300 rounded"
                        >
                          <option value="csv">CSV</option>
                          <option value="excel">Excel</option>
                          <option value="json">JSON</option>
                        </select>
                      </div>
                      <button
                        onClick={handleExportData}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded flex items-center gap-2"
                      >
                        {exportData.format === 'excel' ? (
                          <FileSpreadsheet className="w-4 h-4" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        Export Data {exportData.format.toUpperCase()}
                      </button>

                      {/* Quick Export Buttons untuk Classes dan Teacher Assignments */}
                      <div className="border-t pt-3 mt-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">Quick Export:</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => exportToExcel('classes')}
                            disabled={loading}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                          >
                            <FileSpreadsheet className="w-3 h-3" />
                            Classes
                          </button>
                          <button
                            onClick={() => exportToExcel('teacher_assignments')}
                            disabled={loading}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                          >
                            <FileSpreadsheet className="w-3 h-3" />
                            Teacher Assignments
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Import Data */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Import Data
                    </h3>
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        Import data siswa dari file CSV. Format harus sesuai dengan struktur tabel students.
                      </p>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleImportData}
                        className="w-full p-2 border border-gray-300 rounded"
                      />
                      <div className="text-xs text-gray-500">
                        * Format: ID, Nama, NIS, Kelas, dll.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Database Tab */}
            {activeTab === 'admin' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  Admin Database
                </h2>
                
                {/* Data Health Check */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <h3 className="font-medium text-red-800">Siswa Tanpa Kelas</h3>
                    </div>
                    <p className="text-2xl font-bold text-red-600">{dataHealth.orphanedStudents}</p>
                    <button
                      onClick={fixOrphanedStudents}
                      disabled={loading || dataHealth.orphanedStudents === 0}
                      className="mt-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm"
                    >
                      Perbaiki Otomatis
                    </button>
                  </div>

                  <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      <h3 className="font-medium text-yellow-800">Nilai Tanpa Guru</h3>
                    </div>
                    <p className="text-2xl font-bold text-yellow-600">{dataHealth.missingTeacherData}</p>
                  </div>

                  <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                      <h3 className="font-medium text-blue-800">Total Duplikat</h3>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{dataHealth.duplicateRecords}</p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-800 mb-3">Aksi Cepat</h3>
                  <div className="flex flex-wrap gap-2">
                    <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm">
                      Backup Database
                    </button>
                    <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm">
                      Hapus Data Test
                    </button>
                    <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm">
                      Update Statistics
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* System Tab */}
            {activeTab === 'system' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  Pengaturan Sistem
                </h2>
                <div className="space-y-4">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h3 className="font-medium text-gray-800 mb-2">Pembersihan Cache</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Bersihkan data cache untuk meningkatkan performa aplikasi
                    </p>
                    <button
                      onClick={handleClearCache}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Bersihkan Cache
                    </button>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h3 className="font-medium text-gray-800 mb-2">Informasi Aplikasi</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Versi: 1.0.0</p>
                      <p>Environment: Production</p>
                      <p>Build Date: {new Date().toLocaleDateString('id-ID')}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Setting;