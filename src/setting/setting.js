import React, { useState, useEffect } from 'react';
import { SettingsIcon, User, School, Calendar, Building2, Database, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import ProfileTab from './ProfileTab';
import SchoolManagementTab from './SchoolManagementTab';
import AcademicYearTab from './AcademicYearTab';
import SchoolSettingsTab from './SchoolSettingsTab';
import SystemTab from './SystemTab';

const Setting = ({ user, onShowToast }) => { // ✅ UBAH: userSession jadi user, tambah onShowToast
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [schoolConfig, setSchoolConfig] = useState(null);

  useEffect(() => {
    if (user) {
      loadSchoolConfig();
    }
  }, [user]);

  // ✅ Load school config dari Supabase
  const loadSchoolConfig = async () => {
    try {
      setLoading(true);
      
      // Ambil pengaturan sekolah dari tabel school_settings
      const { data: settings, error } = await supabase
        .from('school_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['school_name', 'school_level', 'grades']);

      if (error) throw error;

      // Convert array ke object untuk mudah diakses
      const config = {};
      settings?.forEach(item => {
        config[item.setting_key] = item.setting_value;
      });

      // Parse grades jika dalam format JSON string
      if (config.grades && typeof config.grades === 'string') {
        try {
          config.grades = JSON.parse(config.grades);
        } catch (e) {
          config.grades = ['VII', 'VIII', 'IX']; // Default
        }
      }

      setSchoolConfig({
        schoolName: config.school_name || 'SMP Muslimin Cililin',
        schoolLevel: config.school_level || 'SMP',
        grades: config.grades || ['VII', 'VIII', 'IX']
      });

    } catch (error) {
      console.error('Error loading school config:', error);
      if (onShowToast) {
        onShowToast('Gagal memuat konfigurasi sekolah', 'error');
      }
      
      // Set default config jika gagal
      setSchoolConfig({
        schoolName: 'SMP Muslimin Cililin',
        schoolLevel: 'SMP',
        grades: ['VII', 'VIII', 'IX']
      });
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    ...(user?.role === 'admin' ? [
      { id: 'school', label: 'Manajemen Sekolah', icon: School },
      { id: 'academic', label: 'Tahun Ajaran', icon: Calendar },
      { id: 'settings', label: 'Pengaturan Sekolah', icon: Building2 },
      { id: 'system', label: 'System', icon: Database }
    ] : [])
  ];

  const renderActiveTab = () => {
    const commonProps = {
      userId: user?.id,
      user,
      loading,
      setLoading,
      showToast: onShowToast, // ✅ Pass onShowToast sebagai showToast
      schoolConfig,
      refreshSchoolConfig: loadSchoolConfig
    };

    switch (activeTab) {
      case 'profile':
        return <ProfileTab {...commonProps} />;
      case 'school':
        return <SchoolManagementTab {...commonProps} />;
      case 'academic':
        return <AcademicYearTab {...commonProps} />;
      case 'settings':
        return <SchoolSettingsTab {...commonProps} />;
      case 'system':
        return <SystemTab {...commonProps} />;
      default:
        return <ProfileTab {...commonProps} />;
    }
  };

  // ✅ Loading state
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat pengaturan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon className="text-blue-600" size={28} />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Pengaturan Sistem</h1>
            {schoolConfig && (
              <p className="text-sm text-gray-600 mt-1">
                {schoolConfig.schoolName} - {schoolConfig.schoolLevel}
              </p>
            )}
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex overflow-x-auto border-b border-gray-200 mb-6">
          <div className="flex min-w-max space-x-1">
            {tabs.map(tab => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`flex items-center gap-2 whitespace-nowrap py-3 px-4 font-medium text-sm transition-colors ${
                    activeTab === tab.id 
                      ? 'text-blue-600 border-b-2 border-blue-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <IconComponent size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm">
          {renderActiveTab()}
        </div>
      </div>
    </div>
  );
};

export default Setting;