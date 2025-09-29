import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
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
  Users
} from 'lucide-react';

const Setting = ({ user, onShowToast }) => {
  const [activeTab, setActiveTab] = useState('profile');
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

  // Fetch user profile data - SESUAIKAN DENGAN STRUKTUR TABEL
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
          // Fallback: gunakan data dari user prop
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
        // Jangan tampilkan error ke user
      }
    };

    fetchProfile();
  }, [user]);

  // Handle profile update - SESUAIKAN DENGAN STRUKTUR TABEL
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

  // Logout dari semua perangkat (contoh)
  const handleLogoutAllDevices = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      onShowToast('Berhasil logout dari semua perangkat', 'success');
      // Redirect ke login page akan ditangani oleh App.js
    } catch (error) {
      console.error('Error logging out:', error);
      onShowToast('Gagal logout', 'error');
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'security', label: 'Keamanan', icon: Shield },
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